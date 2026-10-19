"""snapshot_inline_format_tokens.py: the highlight and inline-photo tokens every client snapshot carries (Spec 02 FR-2-4, FR-2-5).

One importable home for the rule, shared by the gate (`check-snapshot-inline-format-tokens.py`) and the push guard
(`push-theme-snapshot.py::roster_guard`):

  * `settings.custom.highlight` holds `HIGHLIGHT_KEYS` and `settings.custom.inlinePhoto` holds `PHOTO_KEYS`; WordPress
    prints each as `--wp--custom--highlight--<kebab-key>` and `--wp--custom--inline-photo--<kebab-key>`, which
    plugins/sgs-blocks/assets/css/inline-formats.css reads;
  * a colour key resolves to a colour through the palette (or is `currentColor`), a length key is a CSS length, the
    overhang is a length or a percentage, and a tilt is an angle.

A snapshot replaces the site's theme.json wholesale, so a snapshot missing a key would silently fall back to the
stylesheet's default for that client. No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import re

import snapshot_focus_tokens as ft
import snapshot_palette_roster as roster

HIGHLIGHT_KEYS = ("colour", "thickness", "lift", "overhang", "tilt")
PHOTO_KEYS = ("width", "height", "borderWidth", "borderColour", "radius", "tilt")
GROUPS = {"highlight": HIGHLIGHT_KEYS, "inlinePhoto": PHOTO_KEYS}

COLOUR_KEYS = {("highlight", "colour"), ("inlinePhoto", "borderColour")}
PERCENT_OK = {("highlight", "overhang")}
ANGLE_KEYS = {("highlight", "tilt"), ("inlinePhoto", "tilt")}

LENGTH = re.compile(r"^-?(\d+(\.\d+)?|\.\d+)(px|em|rem|ch|ex|vw|vh|vmin|vmax|cqi|cqb)$|^0$")
PERCENT = re.compile(r"^-?(\d+(\.\d+)?|\.\d+)%$")
ANGLE = re.compile(r"^-?(\d+(\.\d+)?|\.\d+)(deg|turn|rad|grad)$|^0$")


def group_of(snapshot: dict, group: str) -> dict:
    value = ((snapshot.get("settings") or {}).get("custom") or {}).get(group)
    return value if isinstance(value, dict) else {}


def missing_inline_format_keys(snapshot: dict) -> list[str]:
    """The `<group>.<key>` paths the snapshot lacks (absent, null or blank), in group and key order."""
    missing = []
    for group, keys in GROUPS.items():
        values = group_of(snapshot, group)
        missing += [f"{group}.{k}" for k in keys if not (isinstance(values.get(k), str) and values[k].strip())]
    return missing


def value_problem(group: str, key: str, value: str, palette: dict[str, str]) -> str | None:
    """Why one present value is unusable, or None."""
    v = value.strip()
    if (group, key) in COLOUR_KEYS:
        if v == "currentColor" or ft.resolve(v, palette) is not None:
            return None
        return f"{group}.{key} does not resolve to a colour ({value})"
    if (group, key) in ANGLE_KEYS:
        return None if ANGLE.match(v) else f"{group}.{key} is not an angle ({value})"
    if (group, key) in PERCENT_OK and PERCENT.match(v):
        return None
    return None if LENGTH.match(v) else f"{group}.{key} is not a CSS length ({value})"


def check_snapshot(snapshot: dict) -> list[str]:
    """Problems with this snapshot's inline-format tokens (empty when it passes)."""
    missing = missing_inline_format_keys(snapshot)
    problems = [f"missing key {m}" for m in missing]
    palette = roster.palette_map(snapshot)
    for group, keys in GROUPS.items():
        values = group_of(snapshot, group)
        for key in keys:
            if f"{group}.{key}" in missing:
                continue
            problem = value_problem(group, key, values[key], palette)
            if problem:
                problems.append(problem)
    return problems


def framework_defaults(theme: dict) -> dict[str, dict[str, str]]:
    """The framework theme.json's values for every group, the defaults a missing key is filled from."""
    return {group: {k: group_of(theme, group)[k] for k in keys if k in group_of(theme, group)} for group, keys in GROUPS.items()}
