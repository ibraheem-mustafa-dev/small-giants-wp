"""test_styling_content.py — W3 step-2b wiring of the CSS-on-content (styling) lift.

The styling resolver ``converter.resolvers.styling_content.lift_styling_content`` was
ported + committed in b74986b0 (W3 steps 1-2) but left INERT — nothing called it.
This increment wires it into ``extract_content`` Case 1 via ``run_mechanism_styling``
and threads ``css_rules`` through the extraction layer.

These tests assert the WIRING (that extract_content now surfaces styling ScalarLifts
through the real DB-driven path), not the resolver's internal normalisation (covered
by the resolver's own port).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_styling_content.py -q --import-mode=importlib
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.context import ScalarLift
from converter.recognition import recognise
from converter.services.extraction import extract_content, run_mechanism_styling


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# ---------------------------------------------------------------------------
# test_styling_lift_wired_into_case1
# ---------------------------------------------------------------------------


def test_styling_lift_wired_into_case1():
    """extract_content on a testimonial (scalar-styling-lift) must surface the
    quote colour + font-size as ScalarLifts when css_rules carry them.

    This is the end-to-end proof the previously-inert styling resolver is now
    reached by the dispatch (Spec 31 §3 CSS-on-content leg)."""
    html = (
        '<div class="sgs-testimonial">'
        '<blockquote class="sgs-testimonial__quote">Hi</blockquote>'
        "</div>"
    )
    node = _node(html)
    rec = recognise(node)
    assert rec.slug == "sgs/testimonial"
    assert rec.delegates_content == 0  # Case 1

    css_rules = {
        ".sgs-testimonial__quote": {"color": "#ff0000", "font-size": "22px"},
    }
    results = extract_content(rec, node, css_rules=css_rules)
    styling = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert styling.get("quoteColour") == "#ff0000", (
        f"quoteColour not lifted via extract_content — styling attrs: {styling}"
    )
    assert styling.get("quoteFontSize") == "22px", (
        f"quoteFontSize not lifted via extract_content — styling attrs: {styling}"
    )


# ---------------------------------------------------------------------------
# test_styling_lift_is_universal_noop_without_capability
# ---------------------------------------------------------------------------


def test_styling_lift_is_universal_noop_without_capability():
    """A block that has NOT declared scalar-styling-lift must produce zero styling
    keys, even with matching css_rules — the resolver self-gates on the capability
    (universal, DB-driven, no per-block carve-out)."""
    # sgs/trust-bar is delegates_content=0 but has no scalar-styling-lift capability.
    node = _node('<div class="sgs-trust-bar"></div>')
    rec = recognise(node)
    css_rules = {".sgs-trust-bar": {"color": "#ff0000"}}
    results = run_mechanism_styling(rec, node, css_rules)
    assert results == [], (
        f"styling lift should be a no-op for a non-opted-in block, got: {results}"
    )


# ---------------------------------------------------------------------------
# test_styling_lift_empty_css_rules_is_safe_noop
# ---------------------------------------------------------------------------


def test_styling_lift_empty_css_rules_is_safe_noop():
    """With no css_rules (the default), the styling lift finds no declarations and
    emits no keys — proving pre-existing callers that don't thread css_rules see no
    behaviour change."""
    html = (
        '<div class="sgs-testimonial">'
        '<blockquote class="sgs-testimonial__quote">Hi</blockquote>'
        "</div>"
    )
    node = _node(html)
    rec = recognise(node)
    results = run_mechanism_styling(rec, node)  # css_rules defaults to {}
    assert results == [], (
        f"styling lift with empty css_rules should emit no keys, got: {results}"
    )


# ---------------------------------------------------------------------------
# test_tier_object_font_size_lifts_all_three_breakpoints
#
# Regression for the bug fixed alongside this test: 5 attrs
# (sgs/product-card.descFontSize/priceFontSize/titleFontSize/priceNoteFontSize,
# sgs/trust-bar.labelFontSize) are attr_type='object' (tier-shaped
# {desktop,tablet,mobile}) but were written FLAT by this resolver — so only
# the Desktop tier ever landed and Tablet/Mobile were silently dropped.
# Before the fix this asserted {"desktop": 28} only; the fix accumulates all
# three tiers into ONE object via _emit_tier_value + tier_object_key
# (Spec 35 Phase 1.4 / D802's tier_object.py mechanism).
# ---------------------------------------------------------------------------


def test_tier_object_font_size_lifts_all_three_breakpoints():
    """priceFontSize (sgs/product-card, confirmed tier_object_base=True) must
    land as {"desktop": 28, "tablet": 24, "mobile": 20} when the draft CSS
    genuinely diverges per breakpoint — not desktop-only."""
    html = (
        '<div class="sgs-product-card">'
        '<span class="sgs-product-card__price">£4.99</span>'
        "</div>"
    )
    node = _node(html)
    rec = recognise(node)
    assert rec.slug == "sgs/product-card"

    css_rules = {
        ".sgs-product-card__price": {"font-size": "28px"},
        "@media (max-width: 1023px) :: .sgs-product-card__price": {"font-size": "24px"},
        "@media (max-width: 767px) :: .sgs-product-card__price": {"font-size": "20px"},
    }
    results = extract_content(rec, node, css_rules=css_rules)
    styling = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert styling.get("priceFontSize") == {
        "desktop": 28,
        "tablet": 24,
        "mobile": 20,
    }, (
        "priceFontSize must accumulate all three tiers into one object — "
        f"got: {styling.get('priceFontSize')!r} (full styling dict: {styling})"
    )
    assert styling.get("priceFontSizeUnit") == "px", (
        f"priceFontSizeUnit companion must still emit as a flat string — got: "
        f"{styling.get('priceFontSizeUnit')!r}"
    )
