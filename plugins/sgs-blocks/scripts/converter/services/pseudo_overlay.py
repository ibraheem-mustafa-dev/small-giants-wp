"""pseudo_overlay.py — ``::before``/``::after`` pseudo-element CSS lift (Unit B1).

Design ref: Spec 31 §12.2.1 (M3-S7 red-team) — a draft ``::before``/``::after``
rule has no matching DOM node, so BeautifulSoup's class/tag matcher in
``styling_helpers.collect_css_decls_for_element`` never sees it (a trailing
``::before``/``::after`` in the compound selector fails that function's
``":" not in last_part`` guard, same as a ``:hover`` state selector). Left
alone, the declarations vanish before ``process_element`` ever runs — no
``attribute_gap_candidates`` row, no UNACCOUNTED signal, a silent drop.

Mechanism (mirrors D309's ``collect_state_decls_for_element`` / D309 universal
hover, but for pseudo-ELEMENTS instead of pseudo-CLASSES):

  1. ``collect_pseudo_decls_for_element`` strips the trailing ``::before`` /
     ``::after`` from each selector's final compound, then re-runs the PROVEN
     ``collect_css_decls_for_element`` matcher against the stripped selector —
     so the same class/tag/ancestor matching logic used for the resting base
     applies here, with zero duplicated matching code.
  2. ``resolve_pseudo_overlay`` decides, per matched pseudo declaration set,
     whether the OWNING block declares the universal overlay attr family
     (``overlayGradient``/``overlayGradientAngle``/``overlayGradientFrom``/
     ``overlayGradientTo``/``backgroundOverlayColour``/
     ``backgroundOverlayOpacity`` — the same attr-name convention shared by
     every container-KIND composite: sgs/container, sgs/cta-section, sgs/hero,
     sgs/trust-bar). This is a DB existence check via
     ``db_lookup.block_attrs(block_slug)`` (R-31-1/R-31-9 — gated on the
     BLOCK'S OWN declared schema, never a per-slug branch or a hardcoded
     block-name literal).
  3. A ``background``/``background-image`` declaration on a block that
     declares the overlay family is PARSED (solid colour, or
     ``linear-gradient(angle, stop1, ..., stopN)``) and mapped onto the
     matching overlay attrs.
  4. Every OTHER pseudo declaration (on any block, mapped or not — e.g.
     ``content``/``position``/``inset``/``z-index``/``pointer-events``, or
     ANY pseudo declaration on a block with no overlay family at all) is
     written as an honest ``attribute_gap_candidates`` row via
     ``db_lookup.write_attribute_gap_candidate`` — never silently dropped,
     never inlined as ``style=`` (R-22-6/R-31-15).

No block-slug literal anywhere (scanned by gates/no_slug_literal) — the
overlay-attr-name check is a DB existence lookup, not a per-block branch.
"""
from __future__ import annotations

import re
from typing import Any

from bs4 import Tag

from converter.db import db_lookup
from converter.services.styling_helpers import collect_css_decls_for_element

# ---------------------------------------------------------------------------
# The universal overlay attr-name family (Spec 31 §13.6 composite-mirror rule).
# These are ATTRIBUTE NAMES (a shared framework naming convention across every
# container-KIND composite), not a block-slug lookup dict — R-31-1 forbids
# hardcoded SLUG dicts; checking for a block's OWN declared attr names via
# ``db_lookup.block_attrs()`` is the DB-gated existence check the composite-
# mirror rule (Spec 31 §13.6) and R-31-9 both require.
# ---------------------------------------------------------------------------
_OVERLAY_GRADIENT_FLAG = "overlayGradient"
_OVERLAY_GRADIENT_ANGLE = "overlayGradientAngle"
_OVERLAY_GRADIENT_FROM = "overlayGradientFrom"
_OVERLAY_GRADIENT_TO = "overlayGradientTo"
_OVERLAY_SOLID_COLOUR = "backgroundOverlayColour"
_OVERLAY_SOLID_OPACITY = "backgroundOverlayOpacity"

_PSEUDO_NAMES = ("before", "after")

# Properties this lift is able to map onto the overlay attr family. Every
# OTHER pseudo-element property (content/position/inset/z-index/
# pointer-events/etc.) always falls to the honest-gap path below, on every
# block, mapped or not.
_OVERLAY_MAPPABLE_PROPS = frozenset({"background", "background-image"})


# ---------------------------------------------------------------------------
# Step 1 — selector-stripper + matcher (mirrors _strip_state_from_selector)
# ---------------------------------------------------------------------------


def _strip_pseudo_element_from_selector(sel: str, pseudo: str) -> str | None:
    """Return `sel` with a trailing `::{pseudo}` stripped from each comma part's
    FINAL compound, keeping ONLY the parts that actually targeted that
    pseudo-element.

    `.x::before`         → `.x`
    `.a::before, .b`     → `.a`          (the plain `.b` half is NOT a pseudo rule)
    `.x:hover`           → None          (`:` state pseudo, not a `::` element)
    `.a` (no pseudo)     → None          (not a pseudo-element rule)

    Preserves the ` :: ` @media sentinel (``css_pass``'s media-key format) so a
    pseudo-element rule nested inside an @media block still folds through the
    reused base matcher.
    """
    if " :: " in sel:
        media_part, sel_part = sel.split(" :: ", 1)
        prefix = media_part + " :: "
    else:
        prefix = ""
        sel_part = sel
    kept: list[str] = []
    for part in sel_part.split(","):
        p = part.strip()
        if not p:
            continue
        tokens = p.split()
        last = tokens[-1]
        m = re.search(r"::" + re.escape(pseudo) + r"$", last)
        if not m:
            continue
        tokens[-1] = last[: m.start()]
        if not tokens[-1]:
            continue  # a bare `::before` with no element to attach to
        kept.append(" ".join(tokens))
    if not kept:
        return None
    return prefix + ", ".join(kept)


def collect_pseudo_decls_for_element(
    node: Tag, css_rules: dict
) -> dict[str, dict[str, str]]:
    """Collect ``::before``/``::after`` declarations for `node`, keyed by
    pseudo-element name (``'before'``/``'after'``).

    Returns ``{pseudo_name: {css_property: value}}`` (e.g.
    ``{'before': {'background': 'linear-gradient(...)', 'content': '""', ...}}``).

    Mirrors ``collect_state_decls_for_element`` (D309): build a pseudo-only
    copy of the rules with the ``::before``/``::after`` stripped, then run the
    PROVEN ``collect_css_decls_for_element`` matcher on it. Fully isolated from
    the resting-base collection — a pseudo declaration can never leak into the
    base bucket (same guarantee D309 gives ``:hover``).
    """
    out: dict[str, dict[str, str]] = {}
    for pseudo in _PSEUDO_NAMES:
        stripped: dict[str, dict[str, str]] = {}
        for sel, decls in css_rules.items():
            ns = _strip_pseudo_element_from_selector(sel, pseudo)
            if ns is None:
                continue
            stripped[ns] = {**stripped.get(ns, {}), **decls}
        if not stripped:
            continue
        base, _bp = collect_css_decls_for_element(node, stripped)
        if base:
            out[pseudo] = base
    return out


# ---------------------------------------------------------------------------
# Step 2/3 — background value parsing (solid colour vs. linear-gradient)
# ---------------------------------------------------------------------------

_LINEAR_GRADIENT_RE = re.compile(
    r"^linear-gradient\(\s*(?P<body>.+)\)\s*$",
    re.IGNORECASE | re.DOTALL,
)
# A numeric angle: optional leading sign, at least one DIGIT (a lone "." must
# NOT match — float(".") crashes), optional decimals, then "deg".
_ANGLE_DEG_RE = re.compile(r"^-?(?=[\d.]*\d)[\d.]+\s*deg$", re.IGNORECASE)
# CSS keyword directions → the equivalent gradient angle in degrees. When the
# first comma-part of a gradient is one of these, it is the DIRECTION (not a
# colour stop) and must be consumed as the angle, never written as a colour.
_ANGLE_KEYWORD_DEG = {
    "to top": 0, "to bottom": 180, "to right": 90, "to left": 270,
    "to top right": 45, "to right top": 45,
    "to bottom right": 135, "to right bottom": 135,
    "to bottom left": 225, "to left bottom": 225,
    "to top left": 315, "to left top": 315,
}
# A crude "is this token actually a colour" gate — hex / functional colour /
# CSS custom-property / a single alphabetic named colour. A directional phrase
# ("to right"), a bare percentage, or empty fails it → the gradient falls to
# the honest-gap path rather than writing a non-colour as overlayGradientFrom.
_COLOUR_LIKE_RE = re.compile(
    r"^(#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla|var)\(.*\)|[a-z]+)$", re.IGNORECASE
)
_RGBA_RE = re.compile(
    r"^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*(?P<alpha>[\d.]+)\s*\)\s*$",
    re.IGNORECASE,
)


def _split_top_level_commas(text: str) -> list[str]:
    """Split on commas NOT nested inside parentheses (rgba(...) stops)."""
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for ch in text:
        if ch == "(":
            depth += 1
            current.append(ch)
        elif ch == ")":
            depth = max(0, depth - 1)
            current.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
    if current:
        parts.append("".join(current).strip())
    return [p for p in parts if p]


def _strip_stop_position(stop: str) -> str:
    """Strip a trailing length/percentage stop-position from a gradient colour
    stop (e.g. ``'rgba(0,0,0,.5) 0%'`` → ``'rgba(0,0,0,.5)'``). The colour
    function itself may contain commas/spaces, so only a trailing bare
    percentage/length token (no unmatched parens) is stripped.
    """
    # Strip ALL trailing stop-position tokens (a CSS colour stop may carry two:
    # `#000 25% 50%`), not just the last one.
    m = re.search(r"(?:\s+[\d.]+(?:%|px|em|rem))+$", stop)
    if m:
        return stop[: m.start()].strip()
    return stop.strip()


def parse_overlay_background(value: str) -> dict[str, Any] | None:
    """Map a ``background``/``background-image`` value onto the overlay attr
    family. Returns a dict of attr_name→value, or None if the value cannot be
    mapped (unsupported function e.g. ``url(...)``, ``none``, empty).

    - ``linear-gradient(ANGLEdeg, stop1, ..., stopN)`` → overlayGradient=True,
      overlayGradientAngle=<angle, default 180 matching the DB default when
      the angle is omitted>, overlayGradientFrom=<first stop colour>,
      overlayGradientTo=<last stop colour> (≥2 stops required; a single-stop
      "gradient" is not mappable — falls to the honest-gap path).
    - A solid colour (hex/rgb/rgba/hsl/hsla/named — anything NOT containing
      "gradient" or "url(") → backgroundOverlayColour=<value>. If the colour
      is ``rgba(r,g,b,a)`` the alpha channel is ALSO mapped to
      backgroundOverlayOpacity=<round(alpha*100)> (a genuine derivable value,
      not a guess); a non-rgba solid colour maps colour only (opacity keeps
      the attr's own default — never fabricated).
    """
    v = value.strip()
    if not v or v.lower() == "none":
        return None

    grad_match = _LINEAR_GRADIENT_RE.match(v)
    if grad_match:
        parts = _split_top_level_commas(grad_match.group("body"))
        if not parts:
            return None
        # The first comma-part MAY be the direction (a numeric `Ndeg` angle OR a
        # `to <side>` keyword). Consume it as the angle; it is NEVER a colour stop.
        angle_deg: int | float | None = None
        first = parts[0].strip()
        first_key = " ".join(first.lower().split())
        if _ANGLE_DEG_RE.match(first):
            num = first[:-3].strip()  # drop the trailing "deg"
            angle_deg = float(num) if "." in num else int(num)
            parts = parts[1:]
        elif first_key in _ANGLE_KEYWORD_DEG:
            angle_deg = _ANGLE_KEYWORD_DEG[first_key]
            parts = parts[1:]
        # else: no explicit direction — the CSS default is `to bottom` (180deg),
        # which also matches the DB default, so leave the angle unset.
        if len(parts) < 2:
            return None
        colours = [_strip_stop_position(s) for s in parts]
        # A "from"/"to" that is not colour-like (e.g. a stray direction keyword
        # the parser failed to consume, or a bare position) means we misread the
        # gradient — fall to the honest-gap path, never write a non-colour value.
        if not _COLOUR_LIKE_RE.match(colours[0]) or not _COLOUR_LIKE_RE.match(colours[-1]):
            return None
        result: dict[str, Any] = {
            _OVERLAY_GRADIENT_FLAG: True,
            _OVERLAY_GRADIENT_FROM: colours[0],
            _OVERLAY_GRADIENT_TO: colours[-1],
        }
        if angle_deg is not None:
            result[_OVERLAY_GRADIENT_ANGLE] = angle_deg
        return result

    if "gradient" in v.lower() or "url(" in v.lower():
        # A gradient FUNCTION we don't recognise (radial/conic) or an image —
        # not mappable to the solid/linear-gradient overlay family.
        return None

    # Treat as a solid colour.
    result = {_OVERLAY_SOLID_COLOUR: v}
    rgba_match = _RGBA_RE.match(v)
    if rgba_match:
        alpha = float(rgba_match.group("alpha"))
        result[_OVERLAY_SOLID_OPACITY] = round(alpha * 100)
    return result


# ---------------------------------------------------------------------------
# Step 4 — resolve: lift when the block declares the overlay family, else gap
# ---------------------------------------------------------------------------


def _block_declares_meaningful_subset(
    overlay_attrs: dict[str, Any], declared: Any
) -> bool:
    """True only when the block declares a subset of `overlay_attrs` that
    actually RENDERS something. A gradient needs BOTH colour ends
    (``overlayGradientFrom`` AND ``overlayGradientTo``); a solid needs
    ``backgroundOverlayColour``. A block that declares only the
    ``overlayGradient`` flag (or only the angle) without the colours would
    render an invisible/empty overlay — so that is NOT a real destination and
    the declaration must fall to the honest-gap path (Spec 31 §3.A step 8:
    no usable destination → gap, never a silent half-write)."""
    if _OVERLAY_GRADIENT_FLAG in overlay_attrs:
        return _OVERLAY_GRADIENT_FROM in declared and _OVERLAY_GRADIENT_TO in declared
    if _OVERLAY_SOLID_COLOUR in overlay_attrs:
        return _OVERLAY_SOLID_COLOUR in declared
    return False


def resolve_pseudo_overlay(
    block_slug: str,
    pseudo_decls: dict[str, dict[str, str]],
    source_class: str,
    source_run_id: str = "pseudo-element",
) -> dict[str, Any]:
    """Map/gap every ``::before``/``::after`` declaration collected for one
    element. Returns the attrs dict to merge into the block's assembling attrs
    (empty if nothing mapped). Every unmapped declaration is written to
    ``attribute_gap_candidates`` as a side effect (never silently dropped).
    """
    if not pseudo_decls:
        return {}

    declared = db_lookup.block_attrs(block_slug)
    has_overlay_family = _OVERLAY_GRADIENT_FLAG in declared or _OVERLAY_SOLID_COLOUR in declared

    mapped_attrs: dict[str, Any] = {}

    for pseudo, decls in pseudo_decls.items():
        pseudo_sel = f"{source_class}::{pseudo}"
        for prop, val in decls.items():
            if has_overlay_family and prop in _OVERLAY_MAPPABLE_PROPS:
                overlay_attrs = parse_overlay_background(val)
                if overlay_attrs is not None and _block_declares_meaningful_subset(
                    overlay_attrs, declared
                ):
                    # Only keep attrs the block ACTUALLY declares (a block may
                    # declare the solid-colour pair without the gradient pair
                    # or vice versa — never write an attr the block doesn't
                    # have).
                    for attr_name, attr_val in overlay_attrs.items():
                        if attr_name in declared:
                            mapped_attrs[attr_name] = attr_val
                    continue
                # Unparseable, OR the block declares only a USELESS subset of the
                # mapped family (e.g. the gradient FLAG but neither colour) →
                # honest gap, never a half-written overlay that renders nothing.
            db_lookup.write_attribute_gap_candidate(
                block_slug=block_slug,
                css_property=prop,
                raw_value=val,
                source_class=pseudo_sel,
                source_run_id=source_run_id,
            )

    return mapped_attrs
