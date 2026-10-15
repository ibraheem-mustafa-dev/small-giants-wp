#!/usr/bin/env python3
"""check-motion-control-sets.py - per-effect control sets and Intensity presets agree with Spec 38A section 5.4
(FR-38A-10, FR-38A-11, FR-38A-46).

INPUTS (all read-only): plugins/sgs-blocks/schemas/motion.schema.json, plugins/sgs-blocks/scripts/data/motion-presets.json,
the framework DB tables `fx_effects` and `motion_presets` (opened `mode=ro`), and the section 5.4 table of
.claude/specs/38A-SGS-MOTION-MODEL.md. The table is parsed from its HEADER ROW: the first line matching
`| Effect | Panel | Tier | Target | Intensity ...`, then every following `|` line until the first line that is not a table row.
Rows whose Effect cell is prose map to preset families through scripts/data/motion-control-sets-aliases.json.

RULES (the module docstring of motion_control_sets.py lists them): a-table, a-schema, b-count, b-values, b-fields,
c-token, d-sibling, e-dramatic, f-target. One line is printed per failure naming the effect, the rule and the values.

EXCEPTIONS live in plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json (gate "motion-control-sets"; `pattern` is an
fnmatch over the gap key shown in square brackets). A pattern that matches no gap fails, and so does one whose
delete_in_unit has landed.

--self-test loads fixtures/motion-control-sets/ (a clean world and a copy of part of the 5.4 table), requires the clean
world to pass, then applies each file in plants/ to a copy and requires its expected gap key to appear. It also checks
that the real spec's header row still parses. Exit 0 only when every plant is caught.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-control-sets.py --check | --self-test
"""
from __future__ import annotations

import argparse
import copy
import json
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import motion_control_sets as rules  # noqa: E402
import motion_gate_allowlist as allowlist  # noqa: E402

REPO = SCRIPTS.parents[2]
SCHEMA = REPO / "plugins" / "sgs-blocks" / "schemas" / "motion.schema.json"
PRESETS = SCRIPTS / "data" / "motion-presets.json"
ALIASES = SCRIPTS / "data" / "motion-control-sets-aliases.json"
SPEC = REPO / ".claude" / "specs" / "38A-SGS-MOTION-MODEL.md"
FIXTURES = SCRIPTS / "fixtures" / "motion-control-sets"
GATE = "motion-control-sets"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def default_db() -> Path:
    return Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")


def load_db(db: Path) -> tuple[list[str], list[dict]]:
    conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
    try:
        effects = [r[0] for r in conn.execute("SELECT effect FROM fx_effects ORDER BY effect")]
        cols = "slug, panel, effect, family, kind, intensity, label, values_json, trigger, target_level"
        presets = [{"slug": r[0], "panel": r[1], "effect": r[2], "family": r[3], "kind": r[4], "intensity": r[5], "label": r[6],
                    "values": json.loads(r[7] or "{}"), "trigger": r[8], "target": r[9]}
                   for r in conn.execute(f"SELECT {cols} FROM motion_presets")]
    finally:
        conn.close()
    return effects, presets


def live_world(db: Path) -> dict:
    aliases = read_json(ALIASES)["aliases"]
    effects, db_presets = load_db(db)
    return {"table": rules.parse_table(SPEC.read_text(encoding="utf-8"), aliases), "fx_effects": effects,
            "presets": read_json(PRESETS)["presets"], "db_presets": db_presets, "schema": read_json(SCHEMA)}


def run_check(db: Path) -> int:
    if not db.is_file():
        print(f"FAIL: framework DB not found at {db}")
        return 1
    world = live_world(db)
    entries, errors = allowlist.load(REPO, GATE)
    failures, allowed, unused = rules.split_allowed(rules.find_gaps(world), {e["pattern"] for e in entries})
    for key, message in sorted(allowed.items()):
        print(f"note: allowed [{key}] {message}")
    lines = [f"allow-list: {e}" for e in errors] + [f"[{k}] {m}" for k, m in sorted(failures.items())]
    lines += [f"allow-list: pattern {p!r} matches no gap" for p in unused]
    for line in lines:
        print(f"FAIL: {line}")
    print(f"check-motion-control-sets: {'FAIL' if lines else 'OK'} ({len(world['table'])} section 5.4 rows, "
          f"{len(world['fx_effects'])} fx_effects, {len(world['presets'])} presets)")
    return 1 if lines else 0


def apply_ops(world: dict, ops: dict) -> dict:
    """A plant: a mutated copy of the clean world."""
    out = copy.deepcopy(world)
    out["fx_effects"] += ops.get("fx_effects_add", [])
    out["presets"] = [r for r in out["presets"] if r["slug"] not in ops.get("preset_drop", [])] + ops.get("preset_add", [])
    for row in out["presets"]:
        row.update(ops.get("preset_set", {}).get(row["slug"], {}))
    effects = out["schema"]["x-sgs-effects"]
    effects.update(ops.get("schema_effect_add", {}))
    for slug in ops.get("schema_effect_drop", []):
        effects.pop(slug, None)
    return out


def self_test() -> int:
    clean_world = read_json(FIXTURES / "clean-world.json")
    aliases = read_json(ALIASES)["aliases"]
    fixture_table = (FIXTURES / clean_world["table"]).read_text(encoding="utf-8")
    world = {**clean_world, "table": rules.parse_table(fixture_table, aliases), "db_presets": []}
    failures = 0
    spec_rows = rules.parse_table(SPEC.read_text(encoding="utf-8"), aliases)
    failures += 0 if spec_rows else 1
    print(f"  anchor: the spec's 5.4 header row parses to {len(spec_rows)} rows: {'ok' if spec_rows else 'MISSED'}")
    clean = rules.find_gaps(world)
    failures += 1 if clean else 0
    print(f"  clean fixture: {'passes' if not clean else 'FAIL ' + str(sorted(clean))}")
    for plant in sorted((FIXTURES / "plants").glob("*.json")):
        spec = read_json(plant)
        gaps = rules.find_gaps(apply_ops(world, spec["ops"]))
        hit = sorted(k for k in gaps if k.startswith(spec["expect"]) and k not in clean)
        failures += 0 if hit else 1
        print(f"  plant {spec['name']}: {'caught' if hit else 'MISSED'} {hit[:2]}")
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="compare schema, presets, DB and the 5.4 table; exit 1 on any gap")
    group.add_argument("--self-test", action="store_true", help="every planted negative must be caught; the clean fixture must pass")
    parser.add_argument("--db", type=Path, default=None, help="framework DB (default: $SGS_FRAMEWORK_DB or the shared DB), read-only")
    args = parser.parse_args()
    return self_test() if args.self_test else run_check(args.db or default_db())


if __name__ == "__main__":
    sys.exit(main())
