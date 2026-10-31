"""role_readings.py: read the roles no alias or confirmed mark names from what the draft paints in that role's job (Spec 32 FR-32-28).

The role map is a reading of the draft, never a choice. The evidence is what the run and the intake already recorded:

  * ``usage``: the colour records of ``sites/<client>/build/intake/palette.json`` (every element's computed colour at the
    1440 rest read: ``{hex, property, tag, count, length}``);
  * ``button_presets``: the primary button's measured rest and hover declarations (``settings.custom.buttonPresets``).

Each reading returns a colour (``#RRGGBB``) with the evidence that decided it, or None when the draft never shows the role:

  * ``border``       the opaque border colour most used on form controls (input, select, textarea);
  * ``border-light`` the subtler divider: the opaque border colour on a divider element (div, hr, li, header, footer,
                     section, nav, article, ul, ol) that is lighter than ``border``, is neither pure white nor black nor
                     the colour of a role already read as primary or accent, and painted at least half on divider elements (a colour a card or
                     link mostly carries is that element's border), taking the longest line;
  * ``primary-dark`` the primary button's measured hover fill (equal to ``primary`` when the button keeps its fill);
  * ``accent-light`` the most used opaque background within 25 degrees of the accent's hue that is at least 0.1 lighter.

A role the draft never shows is given the value of the role it renders as (``FOLLOW_WHEN_ABSENT``). Nothing here names a client.
"""
from __future__ import annotations

import colorsys
import json
import pathlib
import re

CONTROL_TAGS = frozenset({"input", "select", "textarea"})
DIVIDER_TAGS = frozenset({"div", "hr", "li", "header", "footer", "section", "nav", "article", "ul", "ol"})
HUE_WINDOW = 25.0
LIGHTER_BY = 0.1
DIVIDER_SHARE = 0.5
_OPAQUE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_BORDER_PROPS = ("border-top-color", "border-right-color", "border-bottom-color", "border-left-color")
READ_ROLES = ("border", "border-light", "primary-dark", "accent-light")

# What a role renders as when the draft never shows it (the role whose value the draft's own rendering gives it).
FOLLOW_WHEN_ABSENT = {
    "border-light": "border", "primary-dark": "primary", "accent-light": "accent", "border": "text-muted",
    "primary-text": "text-inverse", "accent": "primary", "accent-text": "text", "surface-alt": "surface",
    "text-muted": "text", "text-inverse": "surface", "footer-bg": "text", "heading": "text", "link": "primary",
    "link-hover": "link", "section": "surface-alt", "section-text": "text",
}


def load_usage(draft_dir) -> list[dict]:
    """The intake's recorded colour usage for the export in ``draft_dir`` (``[]`` when no palette record exists)."""
    path = pathlib.Path(draft_dir).parent / "build" / "intake" / "palette.json"
    if not path.is_file():
        return []
    return [r for r in json.loads(path.read_text(encoding="utf-8")).get("usage", []) if isinstance(r, dict)]


def _hls(hexv: str) -> tuple[float, float, float]:
    r, g, b = (int(hexv[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360.0, l, s


def _opaque(rows: list[dict], props, tags=None) -> dict[str, dict]:
    """``{HEX: {"count", "length", "tags"}}`` over the opaque rows of the given properties (and tags)."""
    out: dict[str, dict] = {}
    for r in rows:
        hexv = str(r.get("hex", ""))
        if r.get("property") not in props or not _OPAQUE.match(hexv) or (tags is not None and r.get("tag") not in tags):
            continue
        agg = out.setdefault(hexv.upper(), {"count": 0, "length": 0, "tags": {}})
        agg["count"] += int(r.get("count", 0))
        agg["length"] += int(r.get("length", 0))
        agg["tags"][r.get("tag")] = agg["tags"].get(r.get("tag"), 0) + int(r.get("count", 0))
    return out


def read_border(usage: list[dict]) -> tuple[str, str] | None:
    found = _opaque(usage, _BORDER_PROPS, CONTROL_TAGS)
    if not found:
        return None
    hexv, agg = max(found.items(), key=lambda kv: (kv[1]["count"], kv[0]))
    return hexv, f"the border on form controls at 1440 rest: {agg['count']} uses {agg['tags']}"


def read_border_light(usage: list[dict], border_hex: str | None, taken: set[str]) -> tuple[str, str] | None:
    if not border_hex:
        return None
    border_l = _hls(border_hex)[1]
    everywhere = _opaque(usage, _BORDER_PROPS)
    found = {}
    for h, a in _opaque(usage, _BORDER_PROPS, DIVIDER_TAGS).items():
        # A divider colour is mostly painted on divider elements: one a card or link mostly carries is that element's border.
        if h in ("#FFFFFF", "#000000") or h in taken or _hls(h)[1] <= border_l or a["count"] < DIVIDER_SHARE * everywhere[h]["count"]:
            continue
        found[h] = a
    if not found:
        return None
    hexv, agg = max(found.items(), key=lambda kv: (kv[1]["length"], kv[1]["count"], kv[0]))
    return hexv, f"a lighter divider border at 1440 rest: {agg['count']} uses {agg['tags']}, {agg['length']}px of line"


def read_accent_light(usage: list[dict], accent_hex: str | None) -> tuple[str, str] | None:
    if not accent_hex:
        return None
    ah, al, _s = _hls(accent_hex)
    found = {}
    for h, a in _opaque(usage, ("background-color",)).items():
        hh, l, s = _hls(h)
        gap = min(abs(hh - ah), 360.0 - abs(hh - ah))
        if s > 0.15 and gap <= HUE_WINDOW and l >= al + LIGHTER_BY:
            found[h] = a
    if not found:
        return None
    hexv, agg = max(found.items(), key=lambda kv: (kv[1]["count"], kv[0]))
    return hexv, f"the most used pale fill in the accent's hue at 1440 rest: background on {agg['count']} elements {agg['tags']}"


def read_primary_dark(button_presets: dict, resolve) -> tuple[str, str] | None:
    """The primary button's measured hover fill as a colour; ``resolve`` turns a preset reference into a colour or None."""
    primary = (button_presets or {}).get("primary") or {}
    hover = primary.get("hover-background")
    value = resolve(hover) if isinstance(hover, str) else None
    return (value, f"the primary button's measured hover fill ({hover})") if value else None
