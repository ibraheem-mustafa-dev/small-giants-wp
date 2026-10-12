#!/usr/bin/env python3
"""check-motion-schema.py — the sgsMotion schema is well formed and complete (Spec 38A FR-38A-2, FR-38A-55).

THE FILE: `plugins/sgs-blocks/schemas/motion.schema.json`, the one contract the cloning tool's validator, the
inspector, the PHP renderer and the framework DB seeder read.

WHAT --check ASSERTS
  parse            the file is JSON
  meta-schema      it is a valid JSON Schema 2020-12 (jsonschema's Draft202012Validator.check_schema)
  refs             every `#/$defs/...` reference resolves
  field-types      `$defs` holds exactly the 15 FR-38A-55 field types (x-sgs-kind "fieldType")
  no-inline-type   every property entry is a `$ref` plus narrowing keywords only (enum, const, minimum, maximum,
                   multipleOf, description and x-sgs-* annotations); an inline `type` or shape fails
  field-annotation every field in a values node carries x-sgs-field (fieldType, cssProperty, state, perDevice) that
                   matches its `$ref`; a choice field lists its enum; every duration, distance and angle field is
                   per device (FR-38A-46), the stagger helper excepted
  device-twins     each Tablet / Mobile override node lists exactly its source node's per-device fields
  refusals         every pair, limit and notice has its text, every <placeholder> in a text is mapped, and every
                   effect a matcher names exists
  channels         every §10 channel owner property has a --sgs- name, an @property syntax and an initial
                   (identity) value, and the owner's x-sgs-writes entry lists that channel
  tokens           every token in the Spec 38A §7 table has a band, and the tokenReference enum equals the token list
  effects          every x-sgs-effects entry names real panels, values and device nodes, and labels its slots
  field-range      a field that narrows duration, distance or angle carries x-sgs-range {min, max, unit} equal to
                   its minimum/maximum in the base unit (ms, px, deg), so unit strings are held to the same range
  spec-*           refusal texts, §7 bands, §10 owner properties and identities, the injected-layer cap and the
                   §6.2 trigger lists equal what Spec 38A states (lib/motion_spec_pins.py)
Exemptions (the stagger helper's durations without device overrides, schema-worded refusal texts) print as notes.

--self-test copies the schema to a temp folder and plants, one at a time, a malformed file, a field with an inline
type, a refusal without text, a channel owner property without syntax, a reworded refusal text, an off-spec band, a
non-identity owner initial, an injected-layer cap of 3, a widened hover trigger enum and a widened x-sgs-range; it
exits 0 only when the clean copy passes and every plant is caught by its own rule.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-schema.py --check
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
SCHEMA = PLUGIN / "schemas" / "motion.schema.json"
SPEC = REPO / ".claude" / "specs" / "38A-SGS-MOTION-MODEL.md"
DEFS = "#/$defs/"

# FR-38A-55: the field types, by the names the schema gives them.
FIELD_TYPES = {
    "duration", "easing", "distance", "angle", "ratio", "scale", "percentage", "opacity", "colourReference",
    "partReference", "assetReference", "choice", "boolean", "propertyRow", "tokenReference",
}
PER_DEVICE_REQUIRED = {"duration", "distance", "angle"}
ENTRY_KEYS = {"$ref", "description", "title", "default", "examples", "$comment", "enum", "const",
              "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"}
FIELD_META_KEYS = {"fieldType", "cssProperty", "state", "perDevice"}
SYNTAXES = {"<length>", "<number>", "<angle>", "<percentage>", "<length-percentage>"}
PLACEHOLDER = re.compile(r"<[A-Za-z]+>")
# The unit-bearing field types: a field narrowing one carries x-sgs-range {min, max, unit} in this base unit.
RANGE_BASE = {"duration": "ms", "distance": "px", "angle": "deg"}

sys.path.insert(0, str(PLUGIN / "scripts" / "lib"))
from motion_spec_pins import spec_pin_errors, spec_tokens  # noqa: E402


def ref_name(ref: str) -> str | None:
    return ref[len(DEFS):] if isinstance(ref, str) and ref.startswith(DEFS) else None


def walk(node, path: str, skip_if: bool, out: list):
    """Yield (path, properties-owner dict) for every schema object with `properties`, outside `if` conditions."""
    if isinstance(node, dict):
        if not skip_if and isinstance(node.get("properties"), dict):
            out.append((path, node))
        for k, v in node.items():
            walk(v, f"{path}/{k}", skip_if or k == "if", out)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, f"{path}/{i}", skip_if, out)


def check_refs(schema: dict, defs: dict) -> list[str]:
    errors = []

    def go(node, path):
        if isinstance(node, dict):
            ref = node.get("$ref")
            if ref is not None and ref_name(ref) not in defs:
                errors.append(f"refs: {path} points at {ref}, which is not in $defs")
            for k, v in node.items():
                go(v, f"{path}/{k}")
        elif isinstance(node, list):
            for i, v in enumerate(node):
                go(v, f"{path}/{i}")

    go(schema, "#")
    return errors


def check_entries(schema: dict, defs: dict) -> list[str]:
    """No inline type: every property entry outside the field-type definitions is a $ref plus narrowing keywords."""
    errors = []
    owners: list = []
    for name, d in defs.items():
        if d.get("x-sgs-kind") != "fieldType":
            walk(d, f"#/$defs/{name}", False, owners)
    walk({k: v for k, v in schema.items() if k != "$defs"}, "#", False, owners)
    for path, owner in owners:
        maps = [owner["properties"]] + ([owner["patternProperties"]] if isinstance(owner.get("patternProperties"), dict) else [])
        for props in maps:
            for key, entry in props.items():
                where = f"{path}/properties/{key}"
                if not isinstance(entry, dict) or "$ref" not in entry:
                    kind = "an inline type" if isinstance(entry, dict) and "type" in entry else "no $ref"
                    errors.append(f"no-inline-type: {where} has {kind}; type it with a $defs field type")
                    continue
                extra = sorted(k for k in entry if k not in ENTRY_KEYS and not k.startswith("x-sgs"))
                if extra:
                    errors.append(f"no-inline-type: {where} carries {extra}; only a $ref and narrowing keywords are allowed")
    for name, d in defs.items():
        if d.get("x-sgs-kind") == "list" and not ref_name((d.get("items") or {}).get("$ref")):
            errors.append(f"no-inline-type: #/$defs/{name}/items is not a $ref")
    return errors


def number_bounds(defs: dict, ft: str) -> tuple:
    """The (minimum, maximum) of a field type's number branch."""
    d = defs.get(ft) or {}
    for branch in [d] + list(d.get("anyOf") or []):
        if branch.get("type") == "number":
            return branch.get("minimum"), branch.get("maximum")
    return None, None


def check_range(defs: dict, where: str, ft: str, entry: dict) -> list[str]:
    """A field narrowing a unit-bearing type carries a matching x-sgs-range; no other field carries one."""
    rng = entry.get("x-sgs-range")
    narrows = "minimum" in entry or "maximum" in entry
    if ft not in RANGE_BASE:
        return [f"field-range: {where} is a {ft} field, which has no unit forms, but carries x-sgs-range"] if rng else []
    if not narrows and not rng:
        return []
    lo, hi = number_bounds(defs, ft)
    want = {"min": entry.get("minimum", lo), "max": entry.get("maximum", hi), "unit": RANGE_BASE[ft]}
    if rng != want:
        return [f"field-range: {where} x-sgs-range {rng} should be {want} so its unit strings are held to the same range"]
    return []


def check_fields(schema: dict, defs: dict, notes: list) -> list[str]:
    errors = []
    for ft, base in RANGE_BASE.items():
        rng = (defs.get(ft) or {}).get("x-sgs-range")
        lo, hi = number_bounds(defs, ft)
        if rng is not None and rng != {"min": lo, "max": hi, "unit": base}:
            errors.append(f"field-range: #/$defs/{ft} x-sgs-range {rng} differs from its number branch ({lo} to {hi}{base})")
    declared = {n for n, d in defs.items() if d.get("x-sgs-kind") == "fieldType"}
    if declared != FIELD_TYPES:
        errors.append(f"field-types: $defs field types differ from FR-38A-55: missing {sorted(FIELD_TYPES - declared)}, extra {sorted(declared - FIELD_TYPES)}")
    states = set(schema.get("x-sgs-states") or [])
    for name, d in defs.items():
        kind = d.get("x-sgs-kind")
        if kind not in ("values", "helper"):
            continue
        for key, entry in (d.get("properties") or {}).items():
            where = f"#/$defs/{name}/properties/{key}"
            if not isinstance(entry, dict):
                continue
            target = ref_name(entry.get("$ref"))
            meta = entry.get("x-sgs-field")
            if meta is None:
                if target in defs and defs[target].get("x-sgs-kind") in ("values", "list"):
                    continue
                errors.append(f"field-annotation: {where} has no x-sgs-field")
                continue
            missing = FIELD_META_KEYS - set(meta)
            if missing:
                errors.append(f"field-annotation: {where} x-sgs-field lacks {sorted(missing)}")
                continue
            ft = meta["fieldType"]
            if ft not in FIELD_TYPES:
                errors.append(f"field-annotation: {where} names unknown field type {ft!r}")
                continue
            if meta.get("list"):
                items = ref_name(((defs.get(target) or {}).get("items") or {}).get("$ref"))
                if items != ft:
                    errors.append(f"field-annotation: {where} is a {ft} list but $ref {entry.get('$ref')} does not hold {ft} items")
            elif target != ft:
                errors.append(f"field-annotation: {where} says {ft} but references {entry.get('$ref')}")
            errors += check_range(defs, where, ft, entry)
            if ft == "choice" and not entry.get("enum"):
                errors.append(f"field-annotation: {where} is a choice with no enum")
            if meta["state"] is None and kind != "helper":
                errors.append(f"field-annotation: {where} has no state")
            elif meta["state"] is not None and meta["state"] not in states:
                errors.append(f"field-annotation: {where} state {meta['state']!r} is not in x-sgs-states")
            if ft in PER_DEVICE_REQUIRED and meta["perDevice"] is not True:
                if kind == "helper":
                    notes.append(f"exempt: {where} is a {ft} field with no device overrides because #/$defs/{name} is x-sgs-kind "
                                 "helper (§6.2: read only by the editor helper, which writes per-device delays onto the children)")
                else:
                    errors.append(f"field-annotation: {where} is a {ft} field without per-device overrides (FR-38A-46)")
    return errors


def check_twins(defs: dict) -> list[str]:
    errors = []
    for name, d in defs.items():
        if d.get("x-sgs-kind") != "devices":
            continue
        src = defs.get(d.get("x-sgs-overrides"))
        if not src:
            errors.append(f"device-twins: #/$defs/{name} overrides an unknown node")
            continue
        want = {k for k, e in src["properties"].items() if (e.get("x-sgs-field") or {}).get("perDevice")}
        have = {k for k in d["properties"] if "x-sgs-field" in (src["properties"].get(k) or {})}
        if want != have:
            errors.append(f"device-twins: #/$defs/{name} lists {sorted(have)}, its source's per-device fields are {sorted(want)}")
    return errors


def check_refusals(schema: dict) -> list[str]:
    errors = []
    table = schema.get("x-sgs-refusals") or {}
    effects = set(schema.get("x-sgs-effects") or {})
    rules = [("pairs", r) for r in table.get("pairs") or []] + [("limits", r) for r in table.get("limits") or []] + \
            [("notices", r) for r in table.get("notices") or []]
    if not table.get("pairs") or not table.get("limits"):
        errors.append("refusals: x-sgs-refusals needs pairs and limits")
    for group, rule in rules:
        rid = rule.get("id") or "(no id)"
        text = rule.get("text")
        if not isinstance(text, str) or not text.strip():
            errors.append(f"refusals: {group} {rid} has no text")
            continue
        unmapped = set(PLACEHOLDER.findall(text)) - set(rule.get("placeholders") or {})
        if unmapped:
            errors.append(f"refusals: {group} {rid} text has unmapped placeholders {sorted(unmapped)}")
        if group == "pairs":
            for side in ("a", "b"):
                m = rule.get(side)
                if not isinstance(m, dict) or not m:
                    errors.append(f"refusals: pair {rid} side {side} is empty")
                    continue
                for slug in (m.get("effects") or []) + (m.get("excludeEffects") or []):
                    if slug not in effects:
                        errors.append(f"refusals: pair {rid} side {side} names unknown effect {slug!r}")
    return errors


def check_channels(schema: dict) -> list[str]:
    errors = []
    writes = schema.get("x-sgs-writes") or {}
    seen: dict[str, str] = {}
    for ch in schema.get("x-sgs-channels") or []:
        name = ch.get("channel") or "(no channel)"
        if not ch.get("composition"):
            errors.append(f"channels: {name} has no composition")
        for owner in ch.get("owners") or []:
            oid = owner.get("owner") or "(no owner)"
            props = owner.get("properties")
            if not isinstance(props, list):
                errors.append(f"channels: {name} owner {oid} has no properties list")
                continue
            if not props and not (owner.get("runtime") or owner.get("reads")):
                errors.append(f"channels: {name} owner {oid} writes no custom property and names no runtime")
            for p in props:
                pname = p.get("name") or ""
                if not pname.startswith("--sgs-"):
                    errors.append(f"channels: {name} owner {oid} property {pname!r} is not an --sgs- custom property")
                if p.get("syntax") not in SYNTAXES:
                    errors.append(f"channels: {name} owner {oid} property {pname} has no valid @property syntax")
                if not isinstance(p.get("initial"), str) or not p["initial"].strip():
                    errors.append(f"channels: {name} owner {oid} property {pname} has no initial (identity) value")
                if pname in seen:
                    errors.append(f"channels: {pname} is registered by both {seen[pname]} and {name}/{oid}")
                seen[pname] = f"{name}/{oid}"
            if name not in (writes.get(oid) or {}).get("channels", []):
                errors.append(f"channels: x-sgs-writes[{oid!r}] does not list the {name} channel it owns")
    return errors


def check_tokens(schema: dict, defs: dict) -> list[str]:
    errors = []
    tokens = schema.get("x-sgs-tokens") or {}
    listed = list(spec_tokens(SPEC.read_text(encoding="utf-8"))) if SPEC.exists() else []
    if not listed:
        errors.append(f"tokens: the §7 token table was not found in {SPEC.relative_to(REPO).as_posix()}")
    for t in listed or []:
        if t not in tokens:
            errors.append(f"tokens: §7 token {t} is missing from x-sgs-tokens")
        elif not tokens[t].get("band"):
            errors.append(f"tokens: §7 token {t} has no band")
    for t, entry in tokens.items():
        band = entry.get("band")
        if band and band.get("kind") in ("time", "length") and not band.get("min", 0) <= band.get("max", -1):
            errors.append(f"tokens: {t} band min is above max")
    enum = set((defs.get("tokenReference") or {}).get("enum") or [])
    if enum != {f"token:{t}" for t in tokens}:
        errors.append("tokens: the tokenReference enum differs from the x-sgs-tokens keys")
    return errors


def check_effects(schema: dict, defs: dict) -> list[str]:
    errors = []
    panels = set(schema.get("x-sgs-panels") or {})
    for slug, e in (schema.get("x-sgs-effects") or {}).items():
        if not e.get("label"):
            errors.append(f"effects: {slug} has no label")
        if not set(e.get("panels") or []) or not set(e["panels"]) <= panels:
            errors.append(f"effects: {slug} panels {e.get('panels')} are not x-sgs-panels keys")
        for key in ("values", "devices"):
            if ref_name(e.get(key)) not in defs:
                errors.append(f"effects: {slug} {key} does not resolve")
        for s in e.get("slots") or []:
            if not s.get("slot") or not s.get("label"):
                errors.append(f"effects: {slug} has a slot without its name or label")
    return errors


def check(path: Path) -> tuple[list[str], list[str]]:
    """(errors, notes) for one schema file; notes are exemptions the check reports but does not fail."""
    try:
        schema = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"parse: {path.name} is not JSON ({exc})"], []
    errors: list[str] = []
    notes: list[str] = []
    try:
        from jsonschema import Draft202012Validator
        from jsonschema.exceptions import SchemaError
        try:
            Draft202012Validator.check_schema(schema)
        except SchemaError as exc:
            errors.append(f"meta-schema: not a valid JSON Schema 2020-12: {exc.message}")
    except ImportError:
        errors.append("meta-schema: the jsonschema package is not installed (pip install jsonschema), so the 2020-12 check cannot run")
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        errors.append("meta-schema: $schema is not the 2020-12 dialect")
    defs = schema.get("$defs") or {}
    for fn in (check_refs, check_entries, check_tokens, check_effects):
        errors += fn(schema, defs)
    errors += check_fields(schema, defs, notes)
    errors += check_twins(defs)
    errors += check_refusals(schema)
    errors += check_channels(schema)
    if SPEC.exists():
        pin_errors, pin_notes = spec_pin_errors(schema, SPEC.read_text(encoding="utf-8"))
        errors += pin_errors
        notes += pin_notes
    else:
        errors.append(f"spec-refusals: {SPEC.relative_to(REPO).as_posix()} is missing, so no spec value can be pinned")
    return errors, notes


def cmd_check(path: Path) -> int:
    errors, notes = check(path)
    for n in notes:
        print(f"  {n}")
    for e in errors:
        print(f"  {e}")
    rel = path.relative_to(REPO).as_posix() if path.is_relative_to(REPO) else str(path)
    if errors:
        print(f"[motion-schema] FAIL: {len(errors)} problem(s) in {rel}")
        return 1
    print(f"[motion-schema] OK: {rel} is a complete JSON Schema 2020-12 motion contract")
    return 0


def _plant_inline_type(s: dict) -> None:
    s["$defs"]["HoverStateValues"]["properties"]["planted"] = {"type": "number", "minimum": 0}


def _plant_refusal_without_text(s: dict) -> None:
    s["x-sgs-refusals"]["pairs"][0]["text"] = ""


def _plant_owner_without_syntax(s: dict) -> None:
    del s["x-sgs-channels"][0]["owners"][0]["properties"][0]["syntax"]


def _plant_reworded_refusal(s: dict) -> None:
    s["x-sgs-refusals"]["pairs"][0]["text"] = "Tilt and <effect> fight over this element's transform."


def _plant_band(s: dict) -> None:
    s["x-sgs-tokens"]["duration.fast"]["band"].update({"min": 10, "max": 20})


def _plant_owner_initial(s: dict) -> None:
    s["x-sgs-channels"][0]["owners"][0]["properties"][0]["initial"] = "1px"


def _plant_injected_max(s: dict) -> None:
    next(lim for lim in s["x-sgs-refusals"]["limits"] if lim["kind"] == "slot-max")["max"] = 3


def _plant_hover_trigger(s: dict) -> None:
    s["$defs"]["HoverState"]["properties"]["trigger"]["enum"].append("click")


def _plant_string_range(s: dict) -> None:
    s["$defs"]["TiltValues"]["properties"]["maxAngle"]["x-sgs-range"]["max"] = 90


def cmd_self_test() -> int:
    original = json.loads(SCHEMA.read_text(encoding="utf-8"))
    # Each plant must be caught by its own rule, named by the error's prefix.
    plants = [
        ("malformed JSON", None, "parse:"),
        ("a field with an inline type", _plant_inline_type, "no-inline-type:"),
        ("a refusal without text", _plant_refusal_without_text, "refusals:"),
        ("a channel owner without syntax", _plant_owner_without_syntax, "channels:"),
        ("a reworded refusal text", _plant_reworded_refusal, "spec-refusals:"),
        ("a duration.fast band of 10 to 20ms", _plant_band, "spec-bands:"),
        ("an owner initial that is not the identity", _plant_owner_initial, "spec-channels:"),
        ("an injected-layer cap of 3", _plant_injected_max, "spec-limits:"),
        ("a hover state trigger enum widened with click", _plant_hover_trigger, "spec-triggers:"),
        ("an x-sgs-range wider than its field's maximum", _plant_string_range, "field-range:"),
    ]
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / "motion.schema.json"
        target.write_text(json.dumps(original), encoding="utf-8")
        clean = check(target)[0]
        print(f"  {'PASS' if not clean else 'FAIL'}  positive control: the unmodified copy {'passes' if not clean else 'fails: ' + clean[0]}")
        ok = ok and not clean
        for label, plant, rule in plants:
            if plant is None:
                target.write_text(json.dumps(original)[:-40], encoding="utf-8")
            else:
                planted = copy.deepcopy(original)
                plant(planted)
                target.write_text(json.dumps(planted), encoding="utf-8")
            found = [e for e in check(target)[0] if e.startswith(rule)]
            caught = bool(found)
            ok = ok and caught
            print(f"  {'PASS' if caught else 'FAIL'}  planted {label}: {'caught (' + found[0] + ')' if caught else 'NOT caught'}")
    print(f"[motion-schema] self-test {'passed' if ok else 'FAILED'}")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--check", action="store_true")
    g.add_argument("--self-test", action="store_true")
    ap.add_argument("--schema", type=Path, default=SCHEMA, help="schema file to check (default: the plugin's)")
    args = ap.parse_args()
    return cmd_self_test() if args.self_test else cmd_check(args.schema.resolve())


if __name__ == "__main__":
    sys.exit(main())
