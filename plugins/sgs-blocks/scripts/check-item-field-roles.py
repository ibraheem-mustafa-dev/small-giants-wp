#!/usr/bin/env python3
"""check-item-field-roles.py -- every repeater item field in a block.json declares a role from the role vocabulary.

THE RULE (Spec 48 FR-48-82, the item-array part): the seeder (sgs-update-v2.py, the array_item_schema section) copies each
array setting's `items.properties.<field>.role` into the framework DB table `array_item_schema`, and the cloning route reads
that role to know which draft content a field takes (a text, an href, a picture, an icon name, a switch). A field with no role,
or a role the vocabulary does not hold, leaves the route guessing from the field's name.

CORPUS (derived, never listed): every `src/blocks/*/block.json` array setting whose items are objects:
  - it declares `items.properties` (each property is a field), or
  - it declares no `items.properties` but its items are objects (`items.type` names object, or the default holds an object
    item); the seeder then takes the fields from the default and render.php (dbschema/block_source.py::item_fields), and
    none of them can carry a role.
An array of plain values (ids, slugs, strings) has no fields and is not in the corpus.

VOCABULARY: the role names the roles table is seeded from (data/roles.json, read through
dbschema/seed_reference_data.py::_load_roles_seed, the seeder's own reader). A role whose entry lists `excludes_attr_types`
is refused on a field of one of those types.

FINDINGS (one per field):
  no-role          the field declares no role
  unknown-role     the role is not in the vocabulary
  excluded-type    the role's vocabulary entry excludes the field's type
  no-item-schema   the array's items are objects but it declares no items.properties (reported once per array)
  stale-gap        a GAPS entry names a field that now declares a role, or no longer exists
  stale-exempt     an EXEMPT entry names an array that now declares items.properties, or no longer exists

GAPS lists fields whose job the vocabulary has no role for. Each carries the role it would need (a roles.json entry and its
reader); the entry is deleted the day that role is seeded and the field declares it. It only tightens.

EXEMPT lists object-item arrays that are not the block's list of items and must stay out of array_item_schema: every block
in that table is read as one that renders its list from an attribute (scripts/computed-route/origin.mjs listBlocks,
lib/skeleton-rules.mjs drawsChildren), so declaring their item schema would mis-file the block.

Usage:
    python scripts/check-item-field-roles.py --survey [--json]   every corpus field and its role
    python scripts/check-item-field-roles.py --fix               print each finding and what fixes it (nothing written)
    python scripts/check-item-field-roles.py --check             exit 1 on any finding
    python scripts/check-item-field-roles.py --self-test         exit 1 when the detector itself is wrong
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = ROOT / "src" / "blocks"
sys.path.insert(0, str(Path(__file__).resolve().parent / "dbschema"))

from seed_reference_data import _ROLES_FILE  # noqa: E402  (the seeder's own roles file)

# Fields whose job has no role in the vocabulary: (block, array, field) -> (the role it would need, why).
GAPS: dict[tuple[str, str, str], tuple[str, str]] = {
    ("sgs/pricing-table", "plans", "features"): (
        "item-list",
        "a nested list of the plan's feature lines (each a string or {text, included}), printed one <li> per line with a "
        "tick or a cross; no role names a list inside an item, so a new role and a reader that lifts the draft's nested "
        "<li> rows would be needed",
    ),
}

# Object-item arrays kept out of array_item_schema: (block, array) -> why.
EXEMPT: dict[tuple[str, str], str] = {
    ("sgs/nav-drawer-menu", "itemOrnamentFrames"): (
        "an ornament's alternate glyph frames ({source, svg}, includes/nav-drawer-menu-ornament-frames.php), not the "
        "block's items, which come from a WordPress menu; an item schema here would make the route read the block as a "
        "list drawn from an attribute"
    ),
}


def load_vocabulary(path: Path = _ROLES_FILE) -> dict[str, list[str]]:
    """{role: [excluded types]} from the roles seed file, read the way the seeder reads it (`__` keys are metadata)."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, list[str]] = {}
    for name, val in raw.items():
        if name.startswith("__") or not isinstance(val, list) or not val:
            continue
        extra = val[2] if len(val) > 2 and isinstance(val[2], dict) else {}
        out[name] = list(extra.get("excludes_attr_types") or [])
    return out


def _types(schema) -> list[str]:
    t = schema.get("type") if isinstance(schema, dict) else None
    return [x for x in ([t] if isinstance(t, str) else t or []) if isinstance(x, str)]


def object_items(definition: dict) -> bool:
    """Whether an array setting's items are objects though it declares no items.properties."""
    items = definition.get("items") or {}
    if "object" in _types(items):
        return True
    default = definition.get("default")
    return isinstance(default, list) and any(isinstance(v, dict) for v in default)


def survey_block(name: str, attributes: dict, vocab: dict[str, list[str]]) -> list[dict]:
    """One row per corpus field of one block: {block, array, field, role, finding} (finding None when sound)."""
    rows = []
    for attr, definition in (attributes or {}).items():
        if not isinstance(definition, dict) or definition.get("type") != "array":
            continue
        props = (definition.get("items") or {}).get("properties")
        if not isinstance(props, dict) or not props:
            if object_items(definition):
                rows.append({"block": name, "array": attr, "field": None, "role": None, "finding": "no-item-schema"})
            continue
        for field, schema in props.items():
            role = schema.get("role") if isinstance(schema, dict) else None
            finding = None
            if not role:
                finding = "no-role"
            elif role not in vocab:
                finding = "unknown-role"
            elif set(_types(schema)) & set(vocab[role]):
                finding = "excluded-type"
            rows.append({"block": name, "array": attr, "field": field, "role": role, "finding": finding})
    return rows


def survey(blocks_dir: Path = BLOCKS_DIR, vocab: dict | None = None, gaps: dict | None = None, exempt: dict | None = None) -> list[dict]:
    vocab = load_vocabulary() if vocab is None else vocab
    gaps = GAPS if gaps is None else gaps
    exempt = EXEMPT if exempt is None else exempt
    rows = []
    for path in sorted(blocks_dir.glob("*/block.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        rows += survey_block(data.get("name", path.parent.name), data.get("attributes"), vocab)
    seen = {(r["block"], r["array"], r["field"]): r for r in rows}
    for block, array in exempt:
        row = seen.get((block, array, None))
        if row is None:
            rows.append({"block": block, "array": array, "field": None, "role": None, "finding": "stale-exempt"})
        else:
            row["finding"] = None
            row["exempt"] = True
    for key in gaps:
        row = seen.get(key)
        if row is None or row["finding"] != "no-role":
            rows.append({"block": key[0], "array": key[1], "field": key[2], "role": row and row["role"], "finding": "stale-gap"})
        else:
            row["finding"] = None
            row["gap"] = gaps[key][0]
    return rows


def findings(rows: list[dict]) -> list[dict]:
    return [r for r in rows if r["finding"]]


FIX = {
    "no-role": "add \"role\" to the field: read how the block's render.php prints it and pick that role from data/roles.json",
    "unknown-role": "use a role data/roles.json holds, or seed the new role there with its reader first",
    "excluded-type": "the role's roles.json entry refuses this field type: pick the role for what the field really holds",
    "no-item-schema": "declare items.properties (every field render.php reads, typed as the editor writes it) with a role on each",
    "stale-gap": "delete the GAPS entry: the field now declares a role, or no longer exists",
    "stale-exempt": "delete the EXEMPT entry: the array now declares items.properties, or no longer exists",
}


def describe(r: dict) -> str:
    where = f"{r['block']} {r['array']}" + (f".{r['field']}" if r["field"] else "")
    role = f" (role {r['role']!r})" if r.get("role") else ""
    return f"{where}{role}: {r['finding']}"


def self_test() -> int:
    import tempfile

    vocab = {"text-content": [], "url-href": [], "select-from-enum": ["boolean"]}
    good = {
        "name": "sgs/good",
        "attributes": {
            "items": {"type": "array", "items": {"type": "object", "properties": {
                "text": {"type": "string", "role": "text-content"},
                "url": {"type": "string", "role": "url-href"},
            }}},
            "ids": {"type": "array", "items": {"type": "number"}, "default": []},
            "slugs": {"type": "array", "default": ["a", "b"]},
            "label": {"type": "string", "role": "content"},
        },
    }
    bad = {
        "name": "sgs/bad",
        "attributes": {
            "items": {"type": "array", "items": {"type": "object", "properties": {
                "text": {"type": "string"},
                "url": {"type": "string", "role": "link-hreff"},
                "flag": {"type": "boolean", "role": "select-from-enum"},
                "gap": {"type": "array"},
            }}},
            "entries": {"type": "array", "default": [{"date": "2020", "title": "x"}]},
            "rows": {"type": "array", "default": [], "items": {"type": "object"}},
            "frames": {"type": "array", "default": [], "items": {"type": "object"}},
        },
    }
    gaps = {("sgs/bad", "items", "gap"): ("item-list", "test"), ("sgs/good", "items", "text"): ("x", "stale")}
    exempt = {("sgs/bad", "frames"): "not the item list", ("sgs/good", "items"): "stale"}
    want = {
        ("sgs/bad", "items", "text"): "no-role",
        ("sgs/bad", "items", "url"): "unknown-role",
        ("sgs/bad", "items", "flag"): "excluded-type",
        ("sgs/bad", "entries", None): "no-item-schema",
        ("sgs/bad", "rows", None): "no-item-schema",
        ("sgs/good", "items", "text"): "stale-gap",
        ("sgs/good", "items", None): "stale-exempt",
    }
    failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        for spec in (good, bad):
            folder = Path(tmp) / spec["name"].split("/")[1]
            folder.mkdir()
            (folder / "block.json").write_text(json.dumps(spec), encoding="utf-8")
        rows = survey(Path(tmp), vocab, gaps, exempt)
    got = {(r["block"], r["array"], r["field"]): r["finding"] for r in findings(rows)}
    if got != want:
        failed += 1
        print(f"FAIL findings: got {got}\n              want {want}")
    sound = {(r["block"], r["array"], r["field"]) for r in rows if not r["finding"]}
    if sound != {("sgs/good", "items", "text"), ("sgs/good", "items", "url"), ("sgs/bad", "items", "gap"), ("sgs/bad", "frames", None)}:
        failed += 1
        print(f"FAIL sound rows: {sorted(sound, key=str)}")
    real = load_vocabulary()
    for role in ("text-content", "url-href", "image-object", "icon-slug", "state-modifier-boolean"):
        if role not in real:
            failed += 1
            print(f"FAIL the roles seed file lost {role}")
    if "boolean" not in real.get("select-from-enum", []):
        failed += 1
        print("FAIL select-from-enum no longer reads its excludes_attr_types")
    print(f"self-test: {'FAILED' if failed else 'passed'} ({failed} failure(s))")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--fix", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    rows = survey()
    bad = findings(rows)
    fields = [r for r in rows if r["field"] and not str(r["finding"]).startswith("stale-")]
    if a.survey:
        if a.json:
            print(json.dumps({"fields": len(fields), "findings": len(bad), "rows": rows}, indent=1))
            return 0
        print(f"{len(fields)} item fields in {len({(r['block'], r['array']) for r in rows})} arrays; {len(bad)} finding(s)")
        for r in rows:
            mark = r["finding"] or (f"gap -> {r['gap']}" if r.get("gap") else "exempt" if r.get("exempt") else "ok")
            print(f"  {mark:<16} {r['block']} {r['array']}.{r['field'] or '*'}  {r['role'] or ''}")
        return 0
    if a.fix:
        for r in bad:
            print(f"{describe(r)}\n    {FIX[r['finding']]}")
        return 0
    for r in bad:
        print(describe(r))
    if bad:
        print(f"check-item-field-roles: {len(bad)} finding(s) in {len(fields)} item fields (python scripts/check-item-field-roles.py --fix)")
        return 1
    print(f"check-item-field-roles: all {len(fields)} item fields declare a role ({len(GAPS)} recorded gap(s), {len(EXEMPT)} exempt array(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
