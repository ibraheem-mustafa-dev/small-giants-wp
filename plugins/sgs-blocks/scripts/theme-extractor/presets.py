"""presets.py — button presets, layout, and font families for the Spec 33 extractor.

Button presets are the DIFF between the rest-state and ``:hover``-state COMPUTED declarations, kept
as an open property bag (FR-33-4) — a hover that changes colour AND transform is captured whole.
Layout ``contentSize`` comes from the ``.container`` max-width (scan beyond ``:root``). Font families
carry the primary + full fallback stack; the draft's font ``<link>`` hrefs are recorded so the face
can be loaded (FR-33-3).
"""
from __future__ import annotations

import re

from colour import parse_colour

# Map a draft button-variant class → the theme preset slot.
_VARIANT_SLOT = [
    ("primary", "primary"),
    ("secondary", "secondary"),
    ("ghost", "outline"),
    ("outline", "outline"),
]

def _HEXME(v):
    """Serialise a computed colour preserving ALPHA: transparent → 'transparent', partial → rgba(),
    opaque → hex. Dropping alpha turns the draft's transparent buttons into opaque black (a real
    regression caught on the live secondary/outline CTAs)."""
    c = parse_colour(v)
    if c is None:
        return None
    if c.alpha <= 0.001:
        return "transparent"
    if c.alpha < 0.999:
        r, g, b = int(c.hex[1:3], 16), int(c.hex[3:5], 16), int(c.hex[5:7], 16)
        return f"rgba({r}, {g}, {b}, {round(c.alpha, 3)})"
    return c.hex


def _slot_for(classes: list) -> str | None:
    joined = " ".join(classes).lower()
    for token, slot in _VARIANT_SLOT:
        if token in joined:
            return slot
    return None


def _slot_for_button(b: dict) -> str | None:
    """Resolve a button's variant slot from its OWN classes first, then its ancestor context.

    The element that PAINTS the button is not always the element that NAMES the variant. SGS drafts
    put both on the same node (``a.sgs-button.sgs-button--ghost``); builder markup splits them (UAGB
    renders ``div.wp-block-uagb-buttons-child.outline > a.wp-block-button__link`` — variant on the
    wrapper, paint on the ``<a>``). measure.js now always MEASURES the painting element and carries
    the nearest ancestors' classes as context, so the slot can still be resolved.

    Own classes take precedence: nearest-name-wins keeps SGS drafts byte-identical (their variant is
    always on the element) and stops a distant wrapper hijacking a correctly self-labelled button.
    """
    slot = _slot_for(b.get("classes", []) or [])
    if slot:
        return slot
    return _slot_for(b.get("ancestorClasses", []) or [])


# (rest-key, css-key) pairs whose value is passed through verbatim when present.
_REST_PASSTHROUGH = [("borderTopWidth", "border-width"), ("borderTopLeftRadius", "border-radius"),
                     ("fontSize", "font-size"), ("fontWeight", "font-weight")]


def _rest_entry(rest: dict) -> dict:
    """The resting-state preset fields (colours alpha-preserved, geometry verbatim)."""
    entry = {}
    for css_key, rest_key in (("background", "backgroundColor"), ("text", "color"),
                              ("border", "borderTopColor")):
        val = _HEXME(rest.get(rest_key, ""))
        if val:
            entry[css_key] = val
    for rest_key, css_key in _REST_PASSTHROUGH:
        if rest.get(rest_key):
            entry[css_key] = rest[rest_key]
    # min-height: BOTH "auto" and "0px" are the CSS initial (unset) value — an element with no
    # authored min-height computes to one of them. Emitting "0px" asserts a floor of zero that the
    # draft never declared, and would override the framework's 48px WCAG touch-target floor with
    # nothing. Unset is a blind spot → leave the baseline standing. Mama's buttons declare a real
    # 48px/44px and still emit normally.
    if rest.get("minHeight") and rest["minHeight"] not in ("auto", "0px"):
        entry["min-height"] = rest["minHeight"]
    # Padding is measured on the painting element, so emit it rather than leaving the framework's
    # generic 12px/24px standing over a button whose real padding we know (4-value shorthand matches
    # the baseline's format). Only when a side is actually non-zero — an all-zero box is the
    # signature of a wrapper/unpadded node, and emitting "0px 0px 0px 0px" would assert a padding
    # reset the draft never expressed.
    sides = [rest.get(k) for k in ("paddingTop", "paddingRight", "paddingBottom", "paddingLeft")]
    if all(s for s in sides) and any(s != "0px" for s in sides):
        entry["padding"] = " ".join(sides)
    return entry


def _hover_diff(entry: dict, rest: dict, hover: dict) -> None:
    """Append the hover-state DIFF (open bag) to ``entry`` (only fields that actually change)."""
    for css_key, hkey, base_key in (("hover-background", "backgroundColor", "background"),
                                    ("hover-text", "color", "text"),
                                    ("hover-border", "borderTopColor", "border")):
        val = _HEXME(hover.get(hkey, ""))
        if val and val != entry.get(base_key):
            entry[css_key] = val
    tform = hover.get("transform")
    if tform and tform not in ("none", rest.get("transform")):
        entry["hover-transform"] = tform


def build_button_presets(facts: dict, trace: list) -> dict:
    """Build ``settings.custom.buttonPresets`` from computed rest + hover button facts."""
    presets: dict = {}
    for b in facts.get("buttons", []):
        slot = _slot_for_button(b)
        if not slot or slot in presets:
            continue
        rest, hover = b.get("rest", {}) or {}, b.get("hover", {}) or {}
        entry = _rest_entry(rest)
        _hover_diff(entry, rest, hover)
        presets[slot] = entry
        trace.append({"kind": "preset", "slot": f"buttonPresets.{slot}", "_source": "declared",
                      "reason": f"computed rest+hover diff on the PAINTING element "
                                f"<{b.get('path', '?').split('>')[-1]} class="
                                f"'{' '.join(b.get('classes', []))}'>",
                      "variant_from": "own classes" if _slot_for(b.get("classes", []) or [])
                                      else "ancestor wrapper context",
                      "keys": ",".join(entry.keys())})
    return presets


def content_size(base_rules: list, trace: list) -> str | None:
    """``.container``/``.section`` max-width or a ``--content-width`` token (scan beyond :root)."""
    best = None
    for sel, prop, value, _imp, _off in base_rules:
        if prop == "max-width" and re.search(r"\.(container|section|wrap)", sel):
            m = re.match(r"^\s*(\d+)px", value)
            if m:
                best = int(m.group(1))
                break
    if best:
        trace.append({"kind": "layout", "what": "contentSize", "_source": "declared",
                      "reason": f"container max-width {best}px", "value": f"{best}px"})
        return f"{best}px"
    return None


def font_links(html: str) -> list:
    """Every ``<link rel=stylesheet href=...fonts...>`` / ``@import`` font URL in the draft head."""
    out = []
    for m in re.finditer(r'<link[^>]+href=["\']([^"\']+)["\']', html, re.I):
        href = m.group(1)
        if "font" in href.lower():
            out.append(href)
    for m in re.finditer(r"@import\s+url\(([^)]+)\)", html, re.I):
        href = m.group(1).strip("'\"")
        if "font" in href.lower():
            out.append(href)
    return out
