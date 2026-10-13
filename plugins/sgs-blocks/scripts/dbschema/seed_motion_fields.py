#!/usr/bin/env python3
"""seed_motion_fields.py -- seeds `motion_targets` and `motion_fields` (Spec 38A FR-38A-3, section 6.4).

Two small tables replace the one-`block_attributes`-row-per-field-per-target-per-block shape (decision 3, option B):

  motion_targets  one row per block declaring `supports.sgs.motion`: the `root` target plus one row per part declared
                  in `supports.sgs.elements`. Read from `src/blocks/*/block.json`. `css_element` holds the part's declared
                  `selector`, else the part key (its element is then the class `sgs-<slug>__<part>`).
  motion_fields   one row per schema field per panel layer. Read from the `x-sgs-field` annotations of
                  `schemas/motion.schema.json`; the path each field lives at (`elements.<target>.hover.state.values.scale`)
                  is found by walking the schema from its root, so no layer or effect is named here.

The view `motion_field_rows` (dbschema/schema.sql) joins them at read time: one row per block, target, field and tier.
Nothing is written to `block_attributes`. Rows are replaced whole inside one transaction, so a re-run is idempotent and
a block or field that disappears is dropped.

Importing this module touches nothing. `seed_motion_fields(conn)` is called by `sgs-update-v2.py` (Stage 1 tail).

Usage:
    python dbschema/seed_motion_fields.py --dry-run   [--db PATH]   print projected row counts, write nothing
    python dbschema/seed_motion_fields.py             [--db PATH]   seed (default: $SGS_FRAMEWORK_DB or the shared DB)
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import sqlite3
import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
_PLUGIN_DIR = _SCRIPTS_DIR.parent
DEFAULT_SCHEMA = _PLUGIN_DIR / "schemas" / "motion.schema.json"
DEFAULT_BLOCKS_DIR = _PLUGIN_DIR / "src" / "blocks"
_PANELS = ("hover", "entrance", "effects")

TARGET_COLUMNS = ("block_slug", "target", "css_element", "kind", "is_wrapper", "label", "motion_support")
FIELD_COLUMNS = (
    "def_name", "field", "panel", "layer", "effect", "field_path", "field_type", "css_property", "state",
    "per_device", "intensity", "is_list", "unit", "range_min", "range_max", "enum_json",
)


def default_db_path() -> Path:
    return Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")


def load_schema(path: Path | None = None) -> dict:
    return json.loads((path or DEFAULT_SCHEMA).read_text(encoding="utf-8"))


def _ref_name(node: dict) -> str | None:
    ref = node.get("$ref") if isinstance(node, dict) else None
    return ref.rsplit("/", 1)[-1] if isinstance(ref, str) and ref.startswith("#/$defs/") else None


def _range(prop: dict, defs: dict) -> tuple[float | None, float | None]:
    """Min and max for a field: the property's own `x-sgs-range`, else its `minimum`/`maximum`, else its type's range."""
    base = defs.get(_ref_name(prop) or "", {})
    for source in (prop.get("x-sgs-range"), None):
        if source:
            return source.get("min"), source.get("max")
    lo, hi = prop.get("minimum"), prop.get("maximum")
    if lo is None and hi is None:
        rng = base.get("x-sgs-range") or {}
        lo, hi = rng.get("min", base.get("minimum")), rng.get("max", base.get("maximum"))
    return lo, hi


def _panel_and_layer(path: str) -> tuple[str, str]:
    """The panel and layer a field path sits in, read from the path's own segments."""
    segments = path.split(".")
    if segments[0] == "stagger":
        return "entrance", "stagger"
    layer_parts = segments[2:4] if len(segments) > 3 else segments[2:3]
    head = layer_parts[0].split("[")[0]
    if head == "effects":
        return "effects", "effects"
    return head, f"{head}.{layer_parts[1].split('[')[0]}"


def field_rows(schema: dict) -> list[tuple]:
    """One row per (field path): every `x-sgs-field` annotation reached by walking the schema from its root.

    A def reached through two layers (scramble and draw sit in both `entrance.text` and `effects`) yields a row for each,
    because each is a separate place the field is stored.
    """
    defs = schema["$defs"]
    rows: dict[str, tuple] = {}

    def effect_of(path: str) -> str | None:
        return path.split("[effect=", 1)[1].split("]", 1)[0] if "[effect=" in path else None

    def visit(def_name: str, path: str, seen: tuple[str, ...]) -> None:
        node = defs[def_name]
        if node.get("x-sgs-kind") == "devices" or def_name in seen:
            return
        seen = seen + (def_name,)
        item = _ref_name(node.get("items") or {})
        if item:
            visit(item, path, seen)
        for prop_name, prop in (node.get("properties") or {}).items():
            child_path = f"{path}.{prop_name}"
            annotation = prop.get("x-sgs-field")
            if annotation is not None:
                panel, layer = _panel_and_layer(child_path)
                lo, hi = _range(prop, defs)
                base = defs.get(_ref_name(prop) or "", {})
                unit = annotation.get("unit") or prop.get("x-sgs-unit") or (prop.get("x-sgs-range") or {}).get("unit") or base.get("x-sgs-unit")
                enum = prop.get("enum")
                rows[child_path] = (
                    def_name, prop_name, panel, layer, effect_of(child_path), child_path, annotation["fieldType"],
                    annotation.get("cssProperty"), annotation.get("state"), int(bool(annotation.get("perDevice"))),
                    int(bool(annotation.get("intensity"))), int(bool(annotation.get("list"))), unit, lo, hi,
                    json.dumps(enum) if enum is not None else None,
                )
            elif _ref_name(prop):
                visit(_ref_name(prop), child_path, seen)
        for clause in node.get("allOf") or []:
            slug = (((clause.get("if") or {}).get("properties") or {}).get("effect") or {}).get("const")
            for prop_name, prop in ((clause.get("then") or {}).get("properties") or {}).items():
                if slug and _ref_name(prop):
                    visit(_ref_name(prop), f"{path}[effect={slug}].{prop_name}", seen)

    for root_prop, root_node in schema["properties"].items():
        name = _ref_name(root_node)
        if root_prop == "elements":
            for pattern_node in defs[name]["patternProperties"].values():
                visit(_ref_name(pattern_node), "elements.<target>", ())
        elif name and defs[name].get("x-sgs-kind") == "helper":
            visit(name, root_prop, ())
    return sorted(rows.values(), key=lambda r: r[5])


def target_rows(blocks_dir: Path | None = None) -> list[tuple]:
    """`root` plus one row per declared part (a part keyed `root` is the root), for every block whose `supports.sgs.motion` is truthy."""
    rows: list[tuple] = []
    for block_json in sorted((blocks_dir or DEFAULT_BLOCKS_DIR).glob("*/block.json")):
        data = json.loads(block_json.read_text(encoding="utf-8"))
        sgs = (data.get("supports") or {}).get("sgs") or {}
        motion = sgs.get("motion")
        if not motion:
            continue
        slug = data["name"]
        support = "true" if motion is True else json.dumps(motion, sort_keys=True)
        parts = sgs.get("elements") or {}
        # A part declared as `root` is the block root itself (section 6.2: the target key `root`), not a second target.
        declared_root = parts.get("root") or {}
        rows.append((slug, "root", "root", "root", int(bool(declared_root.get("isWrapper"))), declared_root.get("label") or "Block root", support))
        for part, spec in parts.items():
            if part != "root":
                rows.append((slug, part, spec.get("selector") or part, "part", int(bool(spec.get("isWrapper"))), spec.get("label"), support))
    return rows


def projected_counts(schema: dict, targets: list[tuple], fields: list[tuple]) -> dict[str, int]:
    """Row counts the two tables and the view would hold."""
    tiers = len(schema["x-sgs-tiers"])
    per_device = sum(1 for f in fields if f[FIELD_COLUMNS.index("per_device")])
    tier_rows = per_device * tiers + (len(fields) - per_device)
    return {"motion_targets": len(targets), "motion_fields": len(fields), "motion_field_rows (view)": len(targets) * tier_rows}


def seed_motion_fields(conn: sqlite3.Connection, schema_path: Path | None = None, blocks_dir: Path | None = None) -> tuple[int, int]:
    """Replace both tables whole in one transaction. Returns (motion_targets rows, motion_fields rows)."""
    schema = load_schema(schema_path)
    fields = field_rows(schema)
    targets = target_rows(blocks_dir)
    try:
        conn.execute("DELETE FROM motion_targets")
        conn.execute("DELETE FROM motion_fields")
        conn.executemany(
            f"INSERT INTO motion_targets ({', '.join(TARGET_COLUMNS)}) VALUES ({', '.join('?' for _ in TARGET_COLUMNS)})",  # noqa: S608
            targets,
        )
        conn.executemany(
            f"INSERT INTO motion_fields ({', '.join(FIELD_COLUMNS)}) VALUES ({', '.join('?' for _ in FIELD_COLUMNS)})",  # noqa: S608
            fields,
        )
        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        raise
    return len(targets), len(fields)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", type=Path, help="Database to seed (default: $SGS_FRAMEWORK_DB or the shared DB).")
    parser.add_argument("--dry-run", action="store_true", help="Print projected row counts per table and for the view; write nothing.")
    args = parser.parse_args()
    schema = load_schema()
    fields, targets = field_rows(schema), target_rows()
    counts = projected_counts(schema, targets, fields)
    if args.dry_run:
        print("[motion-fields] dry run, nothing written. Projected rows:")
        for name, count in counts.items():
            print(f"  {name}: {count}")
        return 0
    db = args.db or default_db_path()
    if not db.exists():
        print(f"[motion-fields] FAIL-CLOSED: no DB at {db}", file=sys.stderr)
        return 1
    with contextlib.closing(sqlite3.connect(db)) as conn:
        try:
            n_targets, n_fields = seed_motion_fields(conn)
        except sqlite3.OperationalError as exc:
            print(f"[motion-fields] FAIL: {exc} (run migrations/2026-10-13-motion-fields-tables.py first)", file=sys.stderr)
            return 1
        view_rows = conn.execute("SELECT COUNT(*) FROM motion_field_rows").fetchone()[0]
    print(f"[motion-fields] seeded motion_targets={n_targets} motion_fields={n_fields} motion_field_rows(view)={view_rows} (projected {counts['motion_field_rows (view)']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
