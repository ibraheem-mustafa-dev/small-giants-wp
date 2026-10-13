"""motion_gate_allowlist.py - the one motion-gate allow-list and the "has this unit landed" rule (Spec 38A).

ALLOW-LIST  plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json, a JSON array of
            {gate, pattern, reason, delete_in_unit}. Every check-motion-*.py reads it through `load()`, which keeps
            only the entries whose `gate` equals the caller's gate id.

LANDED      plugins/sgs-blocks/scripts/data/motion-units-landed.json, a JSON array of build-unit ids ("M1.5"). The
            main thread appends a unit's id in the commit that lands the unit. An allow-list entry whose
            `delete_in_unit` is in that array is an error: the fix it waited for has shipped, so the entry must be
            deleted and the gate must pass on its own. A missing landed file means no unit has landed.

An entry also fails when a field is missing or `delete_in_unit` is not a unit id (a build-plan id: "M2.2",
"M1.8a", "M6.6C", the wave units "M3.W" and "M5.Z", or a removal group "M6.6-G0"), so an exception cannot be open-ended.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ALLOW_REL = Path("plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json")
LANDED_REL = Path("plugins/sgs-blocks/scripts/data/motion-units-landed.json")
UNIT_ID = re.compile(r"^M\d+\.(?:\d+[a-zA-Z]?|[A-Z])(?:-G\d+)?$")
REQUIRED = ("gate", "pattern", "reason", "delete_in_unit")


def _read_array(path: Path, label: str) -> tuple[list, list[str]]:
    if not path.is_file():
        return [], []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        return [], [f"{label} is not JSON: {err}"]
    if not isinstance(data, list):
        return [], [f"{label} must be a JSON array"]
    return data, []


def landed_units(root: Path) -> tuple[set[str], list[str]]:
    """The unit ids recorded as landed, and any problem reading them."""
    data, errors = _read_array(root / LANDED_REL, str(LANDED_REL))
    units: set[str] = set()
    for item in data:
        if isinstance(item, str) and UNIT_ID.match(item):
            units.add(item)
        else:
            errors.append(f"{LANDED_REL}: {item!r} is not a unit id such as 'M1.5'")
    return units, errors


def load(root: Path, gate: str) -> tuple[list[dict], list[str]]:
    """(live entries for `gate`, errors). Errors cover malformed entries and entries whose unit has landed."""
    entries, errors = _read_array(root / ALLOW_REL, str(ALLOW_REL))
    landed, landed_errors = landed_units(root)
    errors += landed_errors
    live: list[dict] = []
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("gate") != gate:
            continue
        missing = [key for key in REQUIRED if not entry.get(key)]
        if missing:
            errors.append(f"entry for {entry.get('pattern')!r} lacks {', '.join(missing)}")
            continue
        unit = entry["delete_in_unit"]
        if not isinstance(unit, str) or not UNIT_ID.match(unit):
            errors.append(f"entry for {entry['pattern']!r}: delete_in_unit {unit!r} is not a unit id such as 'M2.2'")
            continue
        if unit in landed:
            errors.append(f"entry for {entry['pattern']!r}: unit {unit} has landed "
                          f"({LANDED_REL.name}), so this exception must be deleted")
            continue
        live.append(entry)
    return live, errors
