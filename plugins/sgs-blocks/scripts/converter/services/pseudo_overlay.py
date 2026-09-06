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
     recorded as an honest ``ContentGap`` via
     ``content_gap_collector.record_content_gap`` — never silently dropped,
     never inlined as ``style=`` (R-22-6/R-31-15).

No block-slug literal anywhere (scanned by gates/no_slug_literal) — the
overlay-attr-name check is a DB existence lookup, not a per-block branch.
"""
from __future__ import annotations

import re
from typing import Any

from bs4 import Tag

from converter.context import ContentGap
from converter.db import db_lookup
from converter.services import content_gap_collector
from converter.services.styling_helpers import collect_css_decls_for_element

# ---------------------------------------------------------------------------
# The universal overlay attr-name family (Spec 31 §13.6 composite-mirror rule).
# These are ATTRIBUTE NAMES (a shared framework naming convention across every
# container-KIND composite), not a block-slug lookup dict — R-31-1 forbids
# hardcoded SLUG dicts; checking for a block's OWN declared attr names via
# ``db_lookup.block_attrs()`` is the DB-gated existence check the composite-
# mirror rule (Spec 31 §13.6) and R-31-9 both require.
# ---------------------------------------------------------------------------
# ONE string attribute holding the complete CSS gradient value (D636 storage
# contract). The old 4-attr shape (`overlayGradient` boolean flag +
# `overlayGradientAngle`/`From`/`To` scalars) was deleted from every block.json
# by 837f7c97 but this converter kept emitting it — WP silently DISCARDS an
# attribute a block does not declare, so from that commit until D643 the cloning
# pipeline could not clone a gradient overlay at all: it wrote four attrs that
# no longer existed and produced a clone with no gradient and no error. The
# stale rows in sgs-framework.db masked it; pruning them (D643) is what
# surfaced it.
_OVERLAY_GRADIENT = "overlayGradient"
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

# The RENDERER's own gradient grammar, mirrored (D643). Kept byte-compatible
# with `sgs_css_gradient_value()` in includes/helpers-tokens.php:736-757 — the
# single PHP chokepoint every gradient passes through before emission. If the
# converter emitted a value that regex rejects, the renderer would return ''
# and the gradient would vanish with no error, which is precisely the silent
# drop this session is fixing. Keep the two in step: a change to one is a bug
# in the other.
_RENDERABLE_GRADIENT_RE = re.compile(
    r"^(repeating-)?(linear|radial|conic)-gradient\([A-Za-z0-9\s.,%()#/_-]+\)$",
    re.IGNORECASE,
)
# Defence in depth, mirroring the PHP helper's second guard.
_GRADIENT_UNSAFE_RE = re.compile(r"[;{}]|url\s*\(|<|>|@|expression", re.IGNORECASE)

_LINEAR_GRADIENT_RE = re.compile(
    r"^linear-gradient\(\s*(?P<body>.+)\)\s*$",
    re.IGNORECASE | re.DOTALL,
)
# A numeric angle: optional leading sign, at least one DIGIT (a lone "." must
# NOT match â€” float(".") crashes), optional decimals, then "deg".
_ANGLE_DEG_RE = re.compile(r"^-?(?=[\d.]*\d)[\d.]+\s*deg$", re.IGNORECASE)
# CSS keyword directions â†’ the equivalent gradient angle in degrees. When the
# first comma-part of a gradient is one of these, it is the DIRECTION (not a
# colour stop) and must be consumed as the angle, never written as a colour.
_ANGLE_KEYWORD_DEG = {
    "to top": 0, "to bottom": 180, "to right": 90, "to left": 270,
    "to top right": 45, "to right top": 45,
    "to bottom right": 135, "to right bottom": 135,
    "to bottom left": 225, "to left bottom": 225,
    "to top left": 315, "to left top": 315,
}
# A crude "is this token actually a colour" gate â€” hex / functional colour /
# CSS custom-property / a single alphabetic named colour. A directional phrase
# ("to right"), a bare percentage, or empty fails it â†’ the gradient falls to
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
    stop (e.g. ``'rgba(0,0,0,.5) 0%'`` â†’ ``'rgba(0,0,0,.5)'``). The colour
    function itself may contain commas/spaces, so only a trailing bare
    percentage/length token (no unmatched parens) is stripped.
    """
    # Strip ALL trailing stop-position tokens (a CSS colour stop may carry two:
    # `#000 25% 50%`), not just the last one.
    m = re.search(r"(?:\s+[\d.]+(?:%|px|em|rem))+$", stop)
    if m:
        return stop[: m.start()].strip()
    return stop.strip()




def _linear_gradient_renders_something(value: str) -> bool:
    """Structural validity gate for a LINEAR gradient we are about to clone
    verbatim (D643).

    The D636 collapse means we no longer DECOMPOSE a gradient — we hold the
    whole CSS string. That removed the decomposition, but it must NOT remove
    the guarantee the decomposition happened to provide: a gradient that
    cannot paint (one colour stop, a bare percentage where a colour belongs)
    used to fail the parse and fall to the honest-gap path. Passing it through
    verbatim would clone an overlay that renders NOTHING — a silent
    half-write, which Spec 31 forbids just as firmly as a wrong value.

    Scope is deliberately LINEAR-only. `radial-`/`conic-` have a different
    grammar (`circle at center`, angular stops) that this parser was never
    written for, and inventing one here would be guessing. They were gapped
    entirely before D643, so admitting them on the renderer-grammar gate alone
    is strictly more capability than before, never less — and a malformed one
    is no worse off than it was when it could not be cloned at all.
    """
    m = _LINEAR_GRADIENT_RE.match(value.strip())
    if not m:
        return True  # not a linear gradient — out of this gate's scope
    parts = _split_top_level_commas(m.group("body"))
    if not parts:
        return False
    first = parts[0].strip()
    if _ANGLE_DEG_RE.match(first) or " ".join(first.lower().split()) in _ANGLE_KEYWORD_DEG:
        parts = parts[1:]
    if len(parts) < 2:
        return False  # a one-stop "gradient" paints nothing
    colours = [_strip_stop_position(s) for s in parts]
    return bool(
        _COLOUR_LIKE_RE.match(colours[0]) and _COLOUR_LIKE_RE.match(colours[-1])
    )


def parse_overlay_background(value: str) -> dict[str, Any] | None:
    """Map a ``background``/``background-image`` value onto the overlay attr
    family. Returns a dict of attr_name→value, or None if the value cannot be
    mapped (unsupported function e.g. ``url(...)``, ``none``, empty).

    - Any CSS gradient the renderer's own validator accepts —
      ``(repeating-)?(linear|radial|conic)-gradient(...)`` → overlayGradient=<the
      complete gradient string, verbatim>. ONE attribute (D636/D643). The value
      is checked against the same shape ``sgs_css_gradient_value()``
      (includes/helpers-tokens.php) enforces, so the converter never emits a
      string the renderer will silently reject — that would reproduce, in a new
      place, exactly the drop this collapse fixed.

      Radial and conic gradients are now CLONEABLE. The old 4-scalar shape could
      only express ``linear-gradient`` (it decomposed to an angle plus two stop
      colours), so radial/conic drafts fell to the honest-gap path. Holding the
      whole string removes that limit, and multi-stop gradients now survive with
      every stop intact instead of being flattened to first-and-last.
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

    # Any gradient function the RENDERER accepts is cloneable as one string.
    # Gate on the renderer's own grammar, not on our parser's: emitting a value
    # sgs_css_gradient_value() rejects would drop it silently at render time.
    if (
        _RENDERABLE_GRADIENT_RE.match(v)
        and not _GRADIENT_UNSAFE_RE.search(v)
        and _linear_gradient_renders_something(v)
    ):
        return {_OVERLAY_GRADIENT: v}

    # The angle/from/to DECOMPOSITION that used to live here is DELETED (D643).
    # It existed only to fill the 4-scalar attr family, and every one of those
    # attrs was removed from block.json by 837f7c97 — so this branch had been
    # writing four attributes WordPress silently discards. Holding the whole
    # string needs no decomposition at all, which is why the replacement above
    # is three lines rather than thirty.

    if "gradient" in v.lower() or "url(" in v.lower():
        # Either an image (`url(...)`), or a gradient that did NOT satisfy the
        # renderer's grammar above (malformed, or carrying a character
        # sgs_css_gradient_value() rejects). Not mappable — honest gap, never a
        # value the renderer would drop on the floor.
        return None

    # Treat as a solid colour.
    #
    # ⛔ The companion `backgroundOverlayOpacity` write was REMOVED 2026-08-12.
    # That attribute was RETIRED at D581 (Background/overlay panel redesign,
    # 2026-08-11) — deleted from container/hero/cta-section/trust-bar in
    # `1ccbdbe1`, i.e. declared by ZERO blocks. `hero/render.php:130-134`
    # (mirrored at `class-sgs-container-wrapper.php:1186`) states it:
    # "backgroundOverlayOpacity no longer exists as an attribute — the
    # colour/gradient picker's own alpha is the one dimming mechanism now."
    #
    # Emitting it was pure loss: WordPress SILENTLY DISCARDS a write to an
    # attribute a block does not declare (D338), so the value never landed —
    # it only made the converter look like it had transferred the dimming.
    # NOTHING is lost by dropping it: the alpha is ALREADY carried in the
    # rgba() colour written below (rgba(10,10,10,0.6) transfers verbatim,
    # alpha included), which is exactly what the replacement mechanism reads.
    #
    # ⛔ Do NOT reinstate this as a "derived" convenience value. If a future
    # block reintroduces a separate opacity attr, route it through the DB
    # (`db_lookup`) like every other destination — never a hardcoded name.
    return {_OVERLAY_SOLID_COLOUR: v}


# ---------------------------------------------------------------------------
# Step 4 — resolve: lift when the block declares the overlay family, else gap
# ---------------------------------------------------------------------------


def _block_declares_meaningful_subset(
    overlay_attrs: dict[str, Any], declared: Any
) -> bool:
    """True only when the block declares a subset of `overlay_attrs` that
    actually RENDERS something. A gradient needs ``overlayGradient``; a solid
    needs ``backgroundOverlayColour``. Anything else falls to the honest-gap
    path (Spec 31 §3.A: no usable destination → gap, never a silent
    half-write).

    D643: the gradient arm used to require BOTH ``overlayGradientFrom`` AND
    ``overlayGradientTo`` to be declared — a half-written gradient renders an
    invisible overlay, so the guard was right for the 4-scalar shape. With ONE
    string there is no half-write to guard against: the value is either present
    and complete, or absent. The guard is now simply "is the destination
    declared", which is the same question every other attr asks."""
    if _OVERLAY_GRADIENT in overlay_attrs:
        return _OVERLAY_GRADIENT in declared
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
    has_overlay_family = _OVERLAY_GRADIENT in declared or _OVERLAY_SOLID_COLOUR in declared

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
            content_gap_collector.record_content_gap(
                ContentGap(
                    where=f"{block_slug}.{pseudo_sel}",
                    detail=f"unmapped pseudo-element css: {prop}={val!r}",
                ),
                block_slug=block_slug,
            )

    return mapped_attrs
