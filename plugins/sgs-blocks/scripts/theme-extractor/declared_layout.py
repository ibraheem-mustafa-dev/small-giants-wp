"""Spec 33 declared layout and shape: the README's content width and corner radius as theme settings.

A README states a max content width and a corner radius once, for the whole design. The width lifts
``settings.layout``; a square design (``0``) zeroes the small, medium and large radii, and an explicit
pixel radius ("14px on cards and buttons", ``border-radius: 12px``) becomes ``borderRadius.medium``.
No statement, no write, no error. Nothing here names a client.
"""
from __future__ import annotations

import re

from palette_vocab import PX_RADIUS_RE, SQUARE_RADIUS_KEYS, SQUARE_RADIUS_RE, trace_row


def _px(value) -> float | None:
    m = re.fullmatch(r"\s*(\d+(?:\.\d+)?)px\s*", value) if isinstance(value, str) else None
    return float(m.group(1)) if m else None


def apply_layout(settings: dict, layout: dict, trace: list) -> None:
    content = layout.get("max_content_width")
    if not content:
        return
    target = settings.setdefault("layout", {})
    target["contentSize"] = content
    wide, narrow = _px(target.get("wideSize")), _px(content)
    if target.get("wideSize") is None or (wide is not None and narrow is not None and wide < narrow):
        target["wideSize"] = content
    trace_row(trace, "declared", "layout.contentSize",
              f"README max content width; wideSize {target['wideSize']} (never narrower)", content)


def apply_radius(settings: dict, layout: dict, trace: list) -> None:
    """Square (``0``) zeroes small/medium/large; an explicit px radius sets ``medium``; else nothing."""
    text = str(layout.get("border_radius", "")).replace("`", "").strip()
    square = bool(SQUARE_RADIUS_RE.match(text))
    stated = None if square else PX_RADIUS_RE.search(text)
    if not square and stated is None:
        return
    radius = settings.setdefault("custom", {}).setdefault("borderRadius", {})
    if square:
        for key in SQUARE_RADIUS_KEYS:
            radius[key] = "0px"
        trace_row(trace, "declared", "custom.borderRadius",
                  "README declares a square design; pill and other keys untouched", "0px")
        return
    radius["medium"] = f"{float(stated.group(1)):g}px"
    trace_row(trace, "declared", "custom.borderRadius.medium",
              f"README states an explicit pixel radius ('{text[:60]}'); the other radii keep the base values",
              radius["medium"])
