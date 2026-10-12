#!/usr/bin/env python3
"""motion_registry_columns.py -- the `fx_effects.owned_properties` and `fx_effects.panels` values, read from the schema.

Spec 38A section 6.4: `owned_properties` lists the section 10 channels and paint slots an effect writes, `panels`
lists which of Hover, Entrance and reveal, Effects may offer it. Both come from `schemas/motion.schema.json`:

  panels            <- x-sgs-effects[effect].panels
  owned_properties  <- {"channels": [...], "properties": [...], "slots": [...], "inner": "..."}
      channels   x-sgs-writes[effect].channels, the channels its scrub-style rows map to (x-sgs-writes[effect].rows), and
                 `transform` for the Tier G effects x-sgs-writes["tier-g"].effects names, in x-sgs-channels order
      properties the registered custom properties x-sgs-channels lists under the effect as an owner
      slots      x-sgs-effects[effect].slots (the ::before / ::after / injected paint slots, with their `when`)
      inner      x-sgs-writes[effect].inner, present when the effect writes inside the element (split-reveal, draw)

An effect the schema does not list (site-level and block-owned rows) gets no panels and an empty owned_properties.
Importing this module touches nothing; `effect_columns()` reads the schema file.
"""
from __future__ import annotations

import json
from pathlib import Path

SCHEMA_FILE = Path(__file__).resolve().parents[2] / "schemas" / "motion.schema.json"


def _dump(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def effect_columns(schema_file: Path = SCHEMA_FILE) -> dict[str, tuple[str, str]]:
    """``{effect: (owned_properties_json, panels_json)}`` for every effect in `x-sgs-effects`."""
    schema = json.loads(schema_file.read_text(encoding="utf-8"))
    writes = schema["x-sgs-writes"]
    channel_order = [c["channel"] for c in schema["x-sgs-channels"]]
    tier_g = set(writes.get("tier-g", {}).get("effects", []))
    out: dict[str, tuple[str, str]] = {}
    for effect, entry in schema["x-sgs-effects"].items():
        written = writes.get(effect, {})
        channels = set(written.get("channels", [])) | set(written.get("rows", {}).values())
        if effect in tier_g:
            channels |= set(writes["tier-g"]["channels"])
        owned: dict[str, object] = {
            "channels": [c for c in channel_order if c in channels],
            "properties": [
                p["name"] for c in schema["x-sgs-channels"] for o in c["owners"] if o["owner"] == effect for p in o["properties"]
            ],
            "slots": entry.get("slots", []),
        }
        if "inner" in written:
            owned["inner"] = written["inner"]
        out[effect] = (_dump(owned), _dump(entry["panels"]))
    return out


EMPTY_OWNED = _dump({"channels": [], "properties": [], "slots": []})
EMPTY_PANELS = _dump([])
