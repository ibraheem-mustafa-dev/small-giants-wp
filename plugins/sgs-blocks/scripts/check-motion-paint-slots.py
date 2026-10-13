#!/usr/bin/env python3
"""check-motion-paint-slots.py - every paint slot has one owner or a refusal (Spec 38A FR-38A-49, section 10).

THE SLOTS: the channels of `x-sgs-channels` in `plugins/sgs-blocks/schemas/motion.schema.json` whose composition is
`slot` (one owner: `::before`, `::after`) or `layers` (a capped list of injected `span.sgs-motion-layer` elements).
THE CLAIMS: each effect's `slots` in `x-sgs-effects`, recorded again in `fx_effects.owned_properties` (framework DB,
opened read-only). Nothing here hard-codes an effect, a slot name or a maximum.

WHAT --check ASSERTS (each gap is reported with a key, shown in square brackets)
  vocabulary  every claimed slot names a slot or layers channel; every effect named by a refusal exists
  recorded    the DB row of every effect holds exactly the slots the schema claims, and its channels list every claimed slot
  owners      each slot or layers channel lists as its owners exactly the effects that claim it
  pairs       two distinct effects that claim the same single-owner slot are refused together by a `pairs` rule
              (the rule matches one effect on each side, by `effects`, or by `slot` less `excludeEffects`)
  limit       a layers channel claimed by more effects than its `maxLayers` has a `slot-max` rule for it, equal to
              `maxLayers`; the channel is aria-hidden and names its element

EXCEPTIONS live in plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json (gate "motion-paint-slots"; pattern is
the bracketed key). An entry that matches no gap is an error, and so is one whose delete_in_unit has landed.

--self-test plants, one at a time in memory, a second `::before` owner, a second `::after` owner, a third injected layer
(rule removed, and rule widened past the channel cap), an unknown slot, a DB row that drops a claim, an unknown effect in
a refusal and an owner list that drops a claimant. It exits 0 only when every plant is caught and the positive control
(a second owner with its refusal rule) adds no gap.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-paint-slots.py --check [--schema PATH] [--db PATH]
"""
from __future__ import annotations

import argparse
import copy
import itertools
import json
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import motion_gate_allowlist as allowlist  # noqa: E402

REPO = SCRIPTS.parents[2]
SCHEMA = REPO / "plugins" / "sgs-blocks" / "schemas" / "motion.schema.json"
GATE = "motion-paint-slots"
SLOT_COMPOSITIONS = ("slot", "layers")


def default_db() -> Path:
    return Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")


def load_db_rows(db: Path) -> dict[str, dict]:
    """effect -> parsed owned_properties, from a read-only connection."""
    conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
    try:
        rows = conn.execute("SELECT effect, owned_properties FROM fx_effects").fetchall()
    finally:
        conn.close()
    return {effect: json.loads(owned or "{}") for effect, owned in rows}


def claims(effect: dict) -> set[tuple[str, str]]:
    return {(s.get("slot", ""), s.get("when", "")) for s in effect.get("slots") or []}


def side_matches(side: dict, effect: str, effect_claims: set[tuple[str, str]]) -> bool:
    """A refusal side names this effect: by `effects`, or by `slot` (a claimed slot) less `excludeEffects`."""
    if "effects" in side and effect not in side["effects"]:
        return False
    if effect in (side.get("excludeEffects") or []):
        return False
    if "slot" in side and side["slot"] not in {slot for slot, _ in effect_claims}:
        return False
    return True


def _refused(pair_rules: list[dict], effects: dict, first: str, second: str) -> bool:
    for rule in pair_rules:
        a, b = rule.get("a") or {}, rule.get("b") or {}
        for one, two in ((first, second), (second, first)):
            if side_matches(a, one, claims(effects[one])) and side_matches(b, two, claims(effects[two])):
                return True
    return False


def find_gaps(schema: dict, db_rows: dict[str, dict]) -> dict[str, str]:
    """{key: message} for every paint-slot gap between the schema, its refusals and the DB rows."""
    gaps: dict[str, str] = {}
    effects = schema.get("x-sgs-effects") or {}
    channels = {c["channel"]: c for c in schema.get("x-sgs-channels") or [] if c.get("composition") in SLOT_COMPOSITIONS}
    refusals = schema.get("x-sgs-refusals") or {}
    pair_rules = refusals.get("pairs") or []
    limit_rules = [r for r in refusals.get("limits") or [] if r.get("kind") == "slot-max"]

    claimants: dict[str, list[str]] = {name: [] for name in channels}
    for slug, effect in effects.items():
        for slot in sorted({slot for slot, _ in claims(effect)}):
            if slot not in channels:
                gaps[f"vocabulary:{slug}:{slot}"] = f"{slug} claims slot {slot!r}, which is no slot or layers channel"
            else:
                claimants[slot].append(slug)

    for rule in pair_rules:
        for side_name in ("a", "b"):
            side = rule.get(side_name) or {}
            for named in list(side.get("effects") or []) + list(side.get("excludeEffects") or []):
                if named not in effects:
                    gaps[f"vocabulary:{rule.get('id')}:{named}"] = f"refusal {rule.get('id')} names unknown effect {named!r}"
        slot = (rule.get("b") or {}).get("slot") or (rule.get("a") or {}).get("slot")
        if slot and slot not in channels:
            gaps[f"vocabulary:{rule.get('id')}:{slot}"] = f"refusal {rule.get('id')} names unknown slot {slot!r}"
    for rule in limit_rules:
        if rule.get("slot") not in channels:
            gaps[f"vocabulary:{rule.get('id')}:{rule.get('slot')}"] = (
                f"slot-max rule {rule.get('id')} names unknown slot {rule.get('slot')!r}")

    for slug, effect in effects.items():
        row = db_rows.get(slug)
        if row is None:
            if claims(effect):
                gaps[f"recorded:{slug}"] = f"{slug} claims slots but has no fx_effects row"
            continue
        recorded = {(s.get("slot", ""), s.get("when", "")) for s in row.get("slots") or []}
        if recorded != claims(effect):
            gaps[f"recorded:{slug}"] = (f"{slug}: fx_effects.owned_properties.slots {sorted(recorded)} "
                                        f"differs from the schema {sorted(claims(effect))}")
        missing = {slot for slot, _ in claims(effect) if slot in channels} - set(row.get("channels") or [])
        if missing:
            gaps[f"recorded:{slug}:channels"] = f"{slug}: fx_effects.owned_properties.channels lacks {sorted(missing)}"
    for slug, row in db_rows.items():
        if slug not in effects and row.get("slots"):
            gaps[f"recorded:{slug}"] = f"fx_effects row {slug} claims slots but is no x-sgs-effects entry"

    for name, channel in channels.items():
        owners = {o.get("owner") for o in channel.get("owners") or []}
        if owners != set(claimants[name]):
            gaps[f"owners:{name}"] = (f"channel {name} lists owners {sorted(owners)} but the effects claiming it are "
                                      f"{sorted(claimants[name])}")

    for name, channel in channels.items():
        if channel["composition"] == "slot":
            for first, second in itertools.combinations(sorted(claimants[name]), 2):
                if not _refused(pair_rules, effects, first, second):
                    gaps[f"pairs:{name}:{first}+{second}"] = (
                        f"{first} and {second} both claim {name} and no pairs rule refuses them together")
            continue
        cap = channel.get("maxLayers")
        if not isinstance(cap, int):
            gaps[f"limit:{name}"] = f"layers channel {name} has no integer maxLayers"
            continue
        rules = [r for r in limit_rules if r.get("slot") == name]
        if len(claimants[name]) > cap and not rules:
            gaps[f"limit:{name}"] = (f"{len(claimants[name])} effects ({', '.join(sorted(claimants[name]))}) claim "
                                     f"{name} but no slot-max rule caps it at {cap}")
        for rule in rules:
            if rule.get("max") != cap:
                gaps[f"limit:{name}:max"] = f"slot-max rule {rule.get('id')} allows {rule.get('max')} but channel {name} caps at {cap}"
        if channel.get("ariaHidden") is not True or not channel.get("element"):
            gaps[f"limit:{name}:element"] = f"layers channel {name} must name its element and set ariaHidden true"
    return gaps


def evaluate(schema: dict, db_rows: dict[str, dict], allow: list[dict], allow_errors: list[str]) -> tuple[list[str], list[str]]:
    gaps = find_gaps(schema, db_rows)
    allowed = {e["pattern"] for e in allow}
    errors = [f"allow-list: {e}" for e in allow_errors]
    notes: list[str] = []
    for key, message in sorted(gaps.items()):
        if key in allowed:
            notes.append(f"allowed [{key}] {message}")
        else:
            errors.append(f"[{key}] {message}")
    errors += [f"allow-list: pattern {p!r} matches no gap" for p in sorted(allowed - set(gaps))]
    return errors, notes


def run_check(schema_path: Path, db: Path) -> int:
    if not db.is_file():
        print(f"FAIL: framework DB not found at {db}")
        return 1
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    allow, allow_errors = allowlist.load(REPO, GATE)
    errors, notes = evaluate(schema, load_db_rows(db), allow, allow_errors)
    for note in notes:
        print(f"note: {note}")
    for error in errors:
        print(f"FAIL: {error}")
    slots = [c["channel"] for c in schema.get("x-sgs-channels") or [] if c.get("composition") in SLOT_COMPOSITIONS]
    print(f"check-motion-paint-slots: {'FAIL' if errors else 'OK'} "
          f"({len(slots)} paint slots, {len(schema.get('x-sgs-effects') or {})} effects)")
    return 1 if errors else 0


def _plant_second_owner(slot: str, rule_id: str):
    def plant(schema: dict, rows: dict) -> None:
        schema["x-sgs-effects"]["planted-owner"] = {
            "label": "Planted", "panels": ["effects"], "values": "#/$defs/RippleValues",
            "devices": "#/$defs/RippleDeviceSet", "slots": [{"slot": slot, "label": "Planted"}]}
        rows["planted-owner"] = {"channels": [slot], "slots": [{"slot": slot, "label": "Planted"}]}
        for channel in schema["x-sgs-channels"]:
            if channel["channel"] == slot:
                channel["owners"].append({"owner": "planted-owner", "properties": []})
        schema["x-sgs-refusals"]["pairs"] = [r for r in schema["x-sgs-refusals"]["pairs"] if r["id"] != rule_id]
    return plant


def _plant_third_layer_rule_removed(schema: dict, rows: dict) -> None:
    schema["x-sgs-refusals"]["limits"] = [r for r in schema["x-sgs-refusals"]["limits"] if r.get("kind") != "slot-max"]


def _plant_limit_widened(schema: dict, rows: dict) -> None:
    for rule in schema["x-sgs-refusals"]["limits"]:
        if rule.get("kind") == "slot-max":
            rule["max"] = rule["max"] + 1


def _plant_unknown_slot(schema: dict, rows: dict) -> None:
    first = next(iter(schema["x-sgs-effects"].values()))
    first["slots"] = [{"slot": "::marker", "label": "Planted"}]


def _plant_db_drop(schema: dict, rows: dict) -> None:
    claimed = next(slug for slug, e in schema["x-sgs-effects"].items() if e.get("slots") and slug in rows)
    rows[claimed]["slots"] = []


def _plant_unknown_effect(schema: dict, rows: dict) -> None:
    schema["x-sgs-refusals"]["pairs"][0]["a"]["effects"] = ["no-such-effect"]


def _plant_owner_dropped(schema: dict, rows: dict) -> None:
    channel = next(c for c in schema["x-sgs-channels"] if c.get("composition") == "layers")
    channel["owners"] = channel["owners"][:-1]


def self_test(schema_path: Path, db: Path) -> int:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    rows = load_db_rows(db)
    clean_gaps = find_gaps(schema, rows)
    print(f"clean tree: {len(clean_gaps)} gap(s) before the allow-list (plants are judged against these)")
    failures = 0
    plants = [
        ("second ::before owner", _plant_second_owner("::before", "slot-before"), "pairs:::before:"),
        ("second ::after owner", _plant_second_owner("::after", "slot-after"), "pairs:::after:"),
        ("third injected layer, rule removed", _plant_third_layer_rule_removed, "limit:injected"),
        ("injected cap widened past the channel", _plant_limit_widened, "limit:injected:max"),
        ("unknown slot name", _plant_unknown_slot, "vocabulary:"),
        ("DB row drops a claim", _plant_db_drop, "recorded:"),
        ("refusal names an unknown effect", _plant_unknown_effect, "vocabulary:"),
        ("owner list drops a claimant", _plant_owner_dropped, "owners:"),
    ]
    for label, plant, expected_prefix in plants:
        planted_schema, planted_rows = copy.deepcopy(schema), copy.deepcopy(rows)
        plant(planted_schema, planted_rows)
        new = {k for k in find_gaps(planted_schema, planted_rows) if k not in clean_gaps}
        hit = sorted(k for k in new if k.startswith(expected_prefix))
        failures += 0 if hit else 1
        print(f"  plant {label}: {'caught' if hit else 'MISSED'} {hit[:2]}")
    control_schema, control_rows = copy.deepcopy(schema), copy.deepcopy(rows)
    _plant_second_owner("::before", "no-such-rule")(control_schema, control_rows)
    control_schema["x-sgs-refusals"]["pairs"].append({
        "id": "control-refusal", "a": {"effects": ["planted-owner"]},
        "b": {"slot": "::before", "excludeEffects": ["planted-owner"]}})
    leaked = [k for k in find_gaps(control_schema, control_rows) if k.startswith("pairs:") and k not in clean_gaps]
    failures += 1 if leaked else 0
    print(f"  positive control (second owner with its refusal rule): {'ok, no pairs gap' if not leaked else 'FAIL ' + str(leaked)}")
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="compare the schema, its refusals and the DB; exit 1 on any gap")
    group.add_argument("--self-test", action="store_true", help="planted failures must be caught; the control must pass")
    parser.add_argument("--schema", type=Path, default=SCHEMA, help="motion.schema.json (default: the plugin's)")
    parser.add_argument("--db", type=Path, default=None, help="framework DB (default: $SGS_FRAMEWORK_DB or the shared DB), read-only")
    args = parser.parse_args()
    db = args.db or default_db()
    return self_test(args.schema, db) if args.self_test else run_check(args.schema, db)


if __name__ == "__main__":
    sys.exit(main())
