"""snapshot_token_roster.py: the picker-scale rule every client snapshot must satisfy (Spec 32 FR-32-29).

One importable home for the rule, shared by the completeness gate (`check-snapshot-token-roster.py`) and the push guard
(`push-theme-snapshot.py::roster_guard`):

  * the framework slots stay the picker entries: every font size `small` to `hero` and every spacing step `10` to `80` of the
    framework `theme/sgs-theme/theme.json` is an entry of the snapshot's `settings.typography.fontSizes` and
    `settings.spacing.spacingSizes`, valued from the draft's own scale (a list is never longer than the picker shows: 6 font
    sizes keep the quick buttons, 8 spacing steps keep the slider);
  * `settings.custom.presetTokens.<fontSizes|spacing>.<slot>` names the draft token a slot carries: a framework slot, an entry
    that exists, one slot per token; with a draft, the token exists and its value is the entry's value;
  * `settings.custom.defaultTokens` lists draft tokens that became job defaults; with a draft each is a token of the draft;
  * each scale ascends strictly in slot order (`large` is larger than `regular`, SGS block defaults read the slugs by meaning);
  * the hidden-pointer key `settings.custom.tokenRoles` no longer exists.

The rule binds a snapshot whose scale was valued from a draft (it carries `presetTokens`); a starter or hand-built snapshot with
no draft keeps the framework's generic entries and is not measured.

No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRAMEWORK_THEME_JSON = REPO_ROOT / "theme" / "sgs-theme" / "theme.json"
LISTS = {"fontSizes": ("typography", "fontSizes"), "spacing": ("spacing", "spacingSizes")}
MAX_ENTRIES = {"fontSizes": 6, "spacing": 8}
_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def framework_slots(theme_json: Path | None = None) -> dict[str, list[str]]:
    """``{family: [slot, ...]}`` read from the framework theme.json (file order)."""
    data = json.loads((theme_json or FRAMEWORK_THEME_JSON).read_text(encoding="utf-8"))
    out = {}
    for family, (a, b) in LISTS.items():
        rows = ((data.get("settings") or {}).get(a) or {}).get(b) or []
        out[family] = [e["slug"] for e in rows if isinstance(e, dict) and isinstance(e.get("slug"), str)]
    return out


def _entries(snapshot: dict, family: str) -> dict[str, dict]:
    a, b = LISTS[family]
    rows = ((snapshot.get("settings") or {}).get(a) or {}).get(b) or []
    return {e["slug"]: e for e in rows if isinstance(e, dict) and isinstance(e.get("slug"), str)}


def _custom(snapshot: dict) -> dict:
    return (snapshot.get("settings") or {}).get("custom") or {}


def _magnitude(size) -> float | None:
    """A comparable px number for a size: ``rem`` and ``em`` at 16px, a ``clamp()`` or ``min()`` at its largest px."""
    text = str(size or "").strip().lower()
    m = re.match(r"^(-?\d*\.?\d+)(px|rem|em)?$", text)
    if m:
        return float(m.group(1)) * (16.0 if m.group(2) in ("rem", "em") else 1.0)
    found = [float(x) * (16.0 if u in ("rem", "em") else 1.0) for x, u in re.findall(r"(-?\d*\.?\d+)(px|rem|em)", text)]
    return max(found) if found else None


def problems(snapshot: dict, slots: dict[str, list[str]] | None = None) -> list[str]:
    """One message per breach of the rule that needs no draft (the push guard's share)."""
    slots = slots or framework_slots()
    out: list[str] = []
    if "presetTokens" not in _custom(snapshot) and "tokenRoles" not in _custom(snapshot):
        return out
    for family, names in slots.items():
        a, b = LISTS[family]
        entries = _entries(snapshot, family)
        out += [f"{a}.{b}.{slot} is missing (a framework slot resolves as an entry)" for slot in names if slot not in entries]
        total = len(((snapshot.get("settings") or {}).get(a) or {}).get(b) or [])
        if total > MAX_ENTRIES[family]:
            out.append(f"{a}.{b} has {total} entries; the picker shows at most {MAX_ENTRIES[family]} as buttons or a slider")
    for family, names in slots.items():
        entries = _entries(snapshot, family)
        values = [(slot, _magnitude(entries[slot].get("size"))) for slot in names if slot in entries]
        for (a_slot, a), (b_slot, b) in zip(values, values[1:]):
            if a is None or b is None:
                out.append(f"{family}: slot {a_slot} or {b_slot} has no readable size")
            elif not b > a:
                out.append(f"{family}: slot {b_slot} ({entries[b_slot].get('size')}) is not larger than the slot before it, {a_slot} ({entries[a_slot].get('size')})")
    custom = _custom(snapshot)
    if "tokenRoles" in custom:
        out.append("custom.tokenRoles is obsolete: framework slots stay entries valued from the draft's scale (FR-32-29)")
    carried = custom.get("presetTokens")
    if carried is not None and not isinstance(carried, dict):
        return out + ["custom.presetTokens is not an object"]
    seen: dict[tuple[str, str], str] = {}
    for family, mapping in (carried or {}).items():
        if family not in slots or not isinstance(mapping, dict):
            out.append(f"custom.presetTokens.{family} is not a preset family (fontSizes, spacing)")
            continue
        entries = _entries(snapshot, family)
        for slot, token in mapping.items():
            if slot not in slots[family]:
                out.append(f"custom.presetTokens.{family}.{slot} is not a framework slot")
            elif slot not in entries:
                out.append(f"custom.presetTokens.{family}.{slot} names a slot with no entry")
            if token is None:
                continue  # a value-only slot: the draft's most used literal size, no token
            if not isinstance(token, str) or not _SLUG.match(token):
                out.append(f"custom.presetTokens.{family}.{slot} is not a token name")
            elif (family, token) in seen:
                out.append(f"custom.presetTokens.{family}: token {token} is carried by {seen[(family, token)]} and {slot} (a token is written once)")
            else:
                seen[(family, token)] = slot
    dflt = custom.get("defaultTokens")
    if dflt is not None and (not isinstance(dflt, list) or any(not isinstance(t, str) or not _SLUG.match(t) for t in dflt)
                             or len(set(dflt)) != len(dflt)):
        out.append("custom.defaultTokens is not a list of distinct token names")
    return out


def draft_problems(snapshot: dict, tokens: dict[str, str]) -> list[str]:
    """Breaches that need the draft: ``tokens`` is ``{token name: literal value}`` of its token files."""
    out: list[str] = []
    custom = _custom(snapshot)
    for family, mapping in (custom.get("presetTokens") or {}).items():
        if family not in LISTS or not isinstance(mapping, dict):
            continue
        entries = _entries(snapshot, family)
        for slot, token in mapping.items():
            if token is None:
                continue
            if token not in tokens:
                out.append(f"custom.presetTokens.{family}.{slot} names {token}, which the draft does not declare")
            elif slot in entries and re.sub(r"\s+", "", str(entries[slot].get("size", "")).lower()) != re.sub(r"\s+", "", tokens[token].lower()):
                out.append(f"{family} slot {slot} is {entries[slot].get('size')} but the draft's {token} is {tokens[token]}")
    for token in custom.get("defaultTokens") or []:
        if token not in tokens:
            out.append(f"custom.defaultTokens names {token}, which the draft does not declare")
    return out
