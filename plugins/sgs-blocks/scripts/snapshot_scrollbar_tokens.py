"""snapshot_scrollbar_tokens.py: the scrollbar tokens every client snapshot carries (Spec 32 FR-32-26).

One importable home for the rule, shared by the gate (`check-snapshot-scrollbar-tokens.py`) and the push guard
(`push-theme-snapshot.py::roster_guard`):

  * `settings.custom.scrollbar` holds three keys (`SCROLLBAR_KEYS`); WordPress prints each as
    `--wp--custom--scrollbar--<kebab-key>` (`thumbOnDark` becomes `--thumb-on-dark`);
  * `thumb` is drawn on light grounds and `thumbOnDark` on dark grounds; each must reach `MIN_THUMB` (2:1) against every
    ground of its tone, measured as the focus tokens are (`snapshot_focus_tokens.grounds` and `.min_ratio`);
  * `track` is a presence check only (it is normally `transparent`).

The floor is 2:1 by Bean's ruling (2026-10-19): a restyled scrollbar loses WCAG 1.4.11's user-agent exemption, which would ask 3:1,
but the leading browsers' own default bars sit below that, so their level is the benchmark. Never raise it to 3:1.

No client is named or excluded anywhere in this file.
"""
from __future__ import annotations

import snapshot_focus_tokens as ft
import snapshot_palette_roster as roster

SCROLLBAR_KEYS = ("thumb", "thumbOnDark", "track")
MIN_THUMB = 2.0
# The ground tone each thumb key is drawn against.
THUMB_TONES = {"thumb": "light", "thumbOnDark": "dark"}


def scrollbar_of(snapshot: dict) -> dict:
    scrollbar = ((snapshot.get("settings") or {}).get("custom") or {}).get("scrollbar")
    return scrollbar if isinstance(scrollbar, dict) else {}


def missing_scrollbar_keys(snapshot: dict) -> list[str]:
    """The SCROLLBAR_KEYS the snapshot lacks (absent, null or blank), in key order."""
    scrollbar = scrollbar_of(snapshot)
    return [k for k in SCROLLBAR_KEYS if not (isinstance(scrollbar.get(k), str) and scrollbar[k].strip())]


def check_snapshot(snapshot: dict) -> list[str]:
    """Problems with this snapshot's scrollbar tokens (empty when it passes)."""
    problems = [f"missing key {k}" for k in missing_scrollbar_keys(snapshot)]
    absent = set(missing_scrollbar_keys(snapshot))
    palette = roster.palette_map(snapshot)
    scrollbar = scrollbar_of(snapshot)
    grounds = ft.grounds(snapshot)
    for key, tone in THUMB_TONES.items():
        if key in absent:
            continue
        # The ratio is measured on the colour as written: an alpha thumb is composited over each ground.
        value = roster.resolve_colour(scrollbar[key], palette)
        if ft.norm_hex(value) is None:
            problems.append(f"{key} does not resolve to a colour ({scrollbar[key]})")
            continue
        low, slug = ft.min_ratio(value, [(s, h) for s, h, t in grounds if t == tone])
        if low is not None and low < MIN_THUMB:
            problems.append(f"{key} {value} is {low:.2f}:1 on {slug}, under {MIN_THUMB}:1")
    return problems
