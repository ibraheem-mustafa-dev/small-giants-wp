#!/usr/bin/env python3
"""check-motion-db-rows.py - every motion field and every declared part has a row in `motion_field_rows` (Spec 38A FR-38A-3).

The framework DB describes motion through two tables and a view (section 6.4, decision 3 option B):
`motion_targets` (a block's root and each part in `supports.sgs.elements`), `motion_fields` (each `x-sgs-field` in
`schemas/motion.schema.json`) and the view `motion_field_rows` joining them per block, target, field and device tier.

The check enumerates the expected rows from the files, independently of the seeder, and compares them with the view:

  (a) FIELD     a schema field with no row in the view, or a row for fewer targets than the motion blocks declare;
  (b) TARGET    a block's root or a declared part with no row, or fewer rows than the schema's fields and tiers need;
  (c) TIER      the view's tiers are not the schema's `x-sgs-tiers` plus the single `all` tier.

The DB is opened read-only (default: $SGS_FRAMEWORK_DB or the shared framework DB; `--db` overrides). A DB without the
tables fails: run migrations/2026-10-13-motion-fields-tables.py and the reseed first.

EXCEPTIONS live in plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json (gate "motion-db-rows"; pattern is
`field:<Def>/<field>` or `target:<block>/<target>`), read through motion_gate_allowlist.py, which also fails an entry
whose delete_in_unit has landed.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-db-rows.py --check [--db PATH] | --self-test
"""
from __future__ import annotations

import argparse
import contextlib
import copy
import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(SCRIPTS / "dbschema"))
import motion_gate_allowlist as allowlist  # noqa: E402

REPO = SCRIPTS.parents[2]
PLUGIN = REPO / "plugins" / "sgs-blocks"
GATE = "motion-db-rows"
SCHEMA_FILE = PLUGIN / "schemas" / "motion.schema.json"
BLOCKS_DIR = PLUGIN / "src" / "blocks"
SCHEMA_SQL = SCRIPTS / "dbschema" / "schema.sql"
SINGLE_TIER = "all"


def default_db() -> Path:
    return Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")


def expected_fields(schema: dict) -> dict[str, bool]:
    """`Def/field` -> per-device flag, for every `x-sgs-field` annotation in the schema (a plain walk, no seeder code)."""
    found: dict[str, bool] = {}

    def walk(node: object, trail: tuple[str, ...]) -> None:
        if isinstance(node, dict):
            if "x-sgs-field" in node and len(trail) >= 3 and trail[-2] == "properties":
                found[f"{trail[-3]}/{trail[-1]}"] = bool(node["x-sgs-field"].get("perDevice"))
            for key, value in node.items():
                walk(value, trail + (key,))
        elif isinstance(node, list):
            for index, value in enumerate(node):
                walk(value, trail + (str(index),))

    walk(schema, ())
    return found


def expected_targets(blocks_dir: Path) -> set[str]:
    """`block/target` for the root and each declared part of every block whose `supports.sgs.motion` is truthy."""
    targets: set[str] = set()
    for block_json in sorted(blocks_dir.glob("*/block.json")):
        data = json.loads(block_json.read_text(encoding="utf-8"))
        sgs = (data.get("supports") or {}).get("sgs") or {}
        if not sgs.get("motion"):
            continue
        targets.add(f"{data['name']}/root")
        # A part marked `"motion": false` is not a target (Spec 38A section 6.2).
        targets.update(f"{data['name']}/{part}" for part, spec in (sgs.get("elements") or {}).items() if (spec or {}).get("motion") is not False)
    return targets


def find_gaps(conn: sqlite3.Connection, schema: dict, blocks_dir: Path) -> list[tuple[str, str]]:
    """(key, message) for every gap between the files and the view."""
    fields, targets = expected_fields(schema), expected_targets(blocks_dir)
    tiers = [t for t in schema["x-sgs-tiers"]]
    rows_per_target = sum(len(tiers) if per_device else 1 for per_device in fields.values())
    gaps: list[tuple[str, str]] = []

    have_fields = dict(conn.execute(
        "SELECT def_name || '/' || field, COUNT(DISTINCT block_slug || '/' || target) FROM motion_field_rows GROUP BY 1").fetchall())
    for key in sorted(fields):
        got = have_fields.get(key, 0)
        if got == 0:
            gaps.append((f"field:{key}", f"schema field {key} has no row in motion_field_rows"))
        elif got < len(targets):
            gaps.append((f"field:{key}", f"schema field {key} has rows for {got} of {len(targets)} targets"))

    have_targets = dict(conn.execute("SELECT block_slug || '/' || target, COUNT(*) FROM motion_field_rows GROUP BY 1").fetchall())
    for key in sorted(targets):
        got = have_targets.get(key, 0)
        if got == 0:
            gaps.append((f"target:{key}", f"declared target {key} has no row in motion_field_rows"))
        elif got < rows_per_target:
            gaps.append((f"target:{key}", f"declared target {key} has {got} of {rows_per_target} rows"))

    have_tiers = {row[0] for row in conn.execute("SELECT DISTINCT tier FROM motion_field_rows")}
    if have_tiers != set(tiers) | {SINGLE_TIER}:
        gaps.append(("tiers", f"view tiers {sorted(have_tiers)} differ from the schema's {sorted(set(tiers) | {SINGLE_TIER})}"))
    return gaps


def open_readonly(db: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)


def run_check(db: Path) -> int:
    live, errors = allowlist.load(REPO, GATE)
    allowed = {entry["pattern"] for entry in live}
    if not db.exists():
        print(f"FAIL no framework DB at {db}")
        return 1
    schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
    with contextlib.closing(open_readonly(db)) as conn:
        try:
            gaps = find_gaps(conn, schema, BLOCKS_DIR)
        except sqlite3.OperationalError as exc:
            print(f"FAIL {exc}: run migrations/2026-10-13-motion-fields-tables.py then the reseed (seed_motion_fields.py)")
            return 1
        total = conn.execute("SELECT COUNT(*) FROM motion_field_rows").fetchone()[0]
    for line in [f"allow-list: {e}" for e in errors]:
        print(f"FAIL {line}")
    open_gaps = [(key, message) for key, message in gaps if key not in allowed]
    for _, message in open_gaps[:40]:
        print(f"FAIL {message}")
    if len(open_gaps) > 40:
        print(f"FAIL ... and {len(open_gaps) - 40} more")
    bad = bool(errors or open_gaps)
    print(f"check-motion-db-rows: {'FAIL' if bad else 'OK'} ({len(expected_fields(schema))} schema fields, "
          f"{len(expected_targets(BLOCKS_DIR))} targets, {total} view rows, {len(allowed)} allow-list entries)")
    return 1 if bad else 0


def _memory_db(blocks_dir: Path) -> sqlite3.Connection:
    """An in-memory DB with the real schema.sql DDL, seeded from the real schema and `blocks_dir`."""
    import seed_motion_fields as seeder  # noqa: PLC0415
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA_SQL.read_text(encoding="utf-8"))
    seeder.seed_motion_fields(conn, SCHEMA_FILE, blocks_dir)
    return conn


def _fake_block(folder: Path, parts: list[str]) -> None:
    folder.mkdir(parents=True)
    elements = {name: {"label": name, "order": index, "clusters": ["text"]} for index, name in enumerate(parts, 1)}
    block = {"name": "sgs/selftest", "supports": {"sgs": {"motion": True, "elements": elements}}}
    (folder / "block.json").write_text(json.dumps(block), encoding="utf-8")


def self_test() -> int:
    schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
    failures = 0

    def expect(label: str, gaps: list[tuple[str, str]], want: str | None) -> None:
        nonlocal failures
        caught = [key for key, _ in gaps]
        ok = (not caught) if want is None else (want in caught)
        failures += 0 if ok else 1
        shown = ", ".join(caught[:3]) or "none"
        print(f"self-test: {label}: gaps [{shown}] ({'expected' if ok else 'WRONG'})")

    conn = _memory_db(BLOCKS_DIR)
    expect("clean copy of the real schema and blocks", find_gaps(conn, schema, BLOCKS_DIR), None)

    planted = copy.deepcopy(schema)
    planted["$defs"]["HoverStateValues"]["properties"]["plantedField"] = {
        "$ref": "#/$defs/opacity",
        "x-sgs-field": {"fieldType": "opacity", "cssProperty": "--sgs-mh-planted", "state": "hover", "perDevice": True},
    }
    expect("planted schema field", find_gaps(conn, planted, BLOCKS_DIR), "field:HoverStateValues/plantedField")

    conn.execute("DELETE FROM motion_fields WHERE field_path LIKE '%hover.state.values.scale'")
    expect("motion_fields row deleted", find_gaps(conn, schema, BLOCKS_DIR), "field:HoverStateValues/scale")
    conn.close()

    with tempfile.TemporaryDirectory() as tmp:
        seeded, declared = Path(tmp) / "seeded", Path(tmp) / "declared"
        _fake_block(seeded / "selftest", ["alpha"])
        _fake_block(declared / "selftest", ["alpha", "plantedPart"])
        fake = _memory_db(seeded)
        expect("fake block, parts match", find_gaps(fake, schema, seeded), None)
        expect("planted part on a fake block", find_gaps(fake, schema, declared), "target:sgs/selftest/plantedPart")
        fake.close()

    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="compare the files with the view; exit 1 on any gap")
    group.add_argument("--self-test", action="store_true", help="a planted field, a planted part and a deleted row must fail; the clean copy must pass")
    parser.add_argument("--db", type=Path, default=None, help="framework DB (default: $SGS_FRAMEWORK_DB or the shared DB), opened read-only")
    args = parser.parse_args()
    return self_test() if args.self_test else run_check(args.db or default_db())


if __name__ == "__main__":
    sys.exit(main())
