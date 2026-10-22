"""snapshot_selection_tokens.py: the optional text-selection tokens a client snapshot may carry (Spec 32 FR-32-26a).

`settings.custom.selection` holds `background` and `colour` (`SELECTION_KEYS`); WordPress prints them as
`--wp--custom--selection--background` and `--wp--custom--selection--colour`. Both are optional as a pair: neither set
leaves the browser's own selection colour. Setting only one would paint a transparent or unreadable selection, so the
push guard (`push-theme-snapshot.py::roster_guard`) refuses a half pair and `check_snapshot` also refuses a pair that
does not resolve to colours or reaches less than `MIN_CONTRAST` between text and background.

No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import snapshot_focus_tokens as ft
import snapshot_palette_roster as roster

SELECTION_KEYS = ("background", "colour")
MIN_CONTRAST = 4.5


def selection_of(snapshot: dict) -> dict:
    selection = ((snapshot.get("settings") or {}).get("custom") or {}).get("selection")
    return selection if isinstance(selection, dict) else {}


def _set(selection: dict, key: str) -> bool:
    return isinstance(selection.get(key), str) and bool(selection[key].strip())


def incomplete_selection_keys(snapshot: dict) -> list[str]:
    """The SELECTION_KEYS missing when the other is set (empty when both or neither are set)."""
    selection = selection_of(snapshot)
    present = [k for k in SELECTION_KEYS if _set(selection, k)]
    if not present or len(present) == len(SELECTION_KEYS):
        return []
    return [k for k in SELECTION_KEYS if k not in present]


def check_snapshot(snapshot: dict) -> list[str]:
    """Problems with this snapshot's selection pair (empty when it passes or neither key is set)."""
    problems = [f"missing key {k}" for k in incomplete_selection_keys(snapshot)]
    selection = selection_of(snapshot)
    if problems or not _set(selection, "background"):
        return problems
    palette = roster.palette_map(snapshot)
    values = {k: roster.resolve_colour(selection[k], palette) for k in SELECTION_KEYS}
    for key, value in values.items():
        if ft.norm_hex(value) is None:
            problems.append(f"{key} does not resolve to a colour ({selection[key]})")
    if problems:
        return problems
    low, _ = ft.min_ratio(values["colour"], [("selection background", values["background"])])
    if low is not None and low < MIN_CONTRAST:
        problems.append(f"colour {values['colour']} is {low:.2f}:1 on background {values['background']}, under {MIN_CONTRAST}:1")
    return problems
