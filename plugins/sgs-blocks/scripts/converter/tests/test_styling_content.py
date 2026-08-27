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

import pytest
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


def test_line_height_lifts_as_a_number_not_a_string():
    """A `number`-typed attr must receive a NUMBER, whatever its CSS property.

    `_compute_value` branches on `attr_type` ONLY for `font-size`; every other
    numeric property falls through to `return raw`, so `line-height:1.2` lands
    as the STRING "1.2". WP's schema validation DISCARDS a string written into a
    `type:"number"` attr and substitutes the block default — silently, with no
    error anywhere (`WP_Block_Type::prepare_attributes_for_render()`).

    Five attrs reach this tail with attr_type='number', all css_property
    'line-height': sgs/counter.labelLineHeight, sgs/product-card.titleLineHeight
    + .descLineHeight, sgs/quote.attributionLineHeight, sgs/trust-bar.titleLineHeight.

    `resolvers/typography.py:167-193` (the CSS-pass sibling) already gets this
    right by branching on `_attr_is_number()`; this path never adopted it.
    """
    html = (
        '<div class="sgs-product-card">'
        '<h3 class="sgs-product-card__title">Zookies</h3>'
        "</div>"
    )
    node = _node(html)
    rec = recognise(node)
    assert rec.slug == "sgs/product-card"

    css_rules = {".sgs-product-card__title": {"line-height": "1.2"}}
    results = extract_content(rec, node, css_rules=css_rules)
    styling = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    got = styling.get("titleLineHeight")
    assert got == 1.2 and isinstance(got, (int, float)) and not isinstance(got, bool), (
        "titleLineHeight is declared type:'number' — a string here is silently "
        f"discarded by WP at render. got {got!r} (type {type(got).__name__})"
    )
    # The companion matters as much as the value. product-card's unit default is
    # already "" so this is not load-bearing HERE, but asserting it keeps both
    # halves of the write tested together rather than only on sgs/quote below.
    assert styling.get("titleLineHeightUnit") == "", (
        "the unit companion must be written alongside the number — got "
        f"{styling.get('titleLineHeightUnit')!r}"
    )


def test_unitless_line_height_writes_an_explicit_empty_unit():
    """A unitless line-height must write an explicit empty unit, not stay silent.

    `sgs/quote.attributionLineHeightUnit` declares `"default": "em"`. Emitting a
    bare `1.5` and NO unit companion therefore renders `line-height:1.5em`, not
    `line-height:1.5` — a different inheritance model (em resolves against the
    element's own font-size and passes that COMPUTED length down; unitless
    passes the RATIO down and each descendant recomputes it).

    `""` and NOT `typography.py`'s `"unitless"` sentinel: both render correctly,
    but `TypographyControls` hands the stored unit straight to a `UnitControl`
    whose vocabulary is `['', 'em', 'rem', 'px']`, so `"unitless"` matches no
    option and the client sees a wrong unit. `sgs/quote` renders that control
    (`showLineHeight` true), so this case is reachable, not theoretical.
    """
    html = (
        '<figure class="sgs-quote">'
        '<figcaption class="sgs-quote__attribution">A. Customer</figcaption>'
        "</figure>"
    )
    node = _node(html)
    rec = recognise(node)
    assert rec.slug == "sgs/quote"

    css_rules = {".sgs-quote__attribution": {"line-height": "1.5"}}
    results = extract_content(rec, node, css_rules=css_rules)
    styling = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert styling.get("attributionLineHeight") == 1.5, (
        f"expected number 1.5, got {styling.get('attributionLineHeight')!r}"
    )
    assert styling.get("attributionLineHeightUnit") == "", (
        "a unitless line-height must override the block's 'em' default with an "
        f"explicit empty unit — got {styling.get('attributionLineHeightUnit')!r}"
    )


def test_font_size_unit_behaviour_is_unchanged_by_the_line_height_fix():
    """NEGATIVE CONTROL for the shared unit-companion helper.

    font-size and line-height take DIFFERENT unit contracts, and collapsing them
    into one helper is exactly the change that could silently break font-size. A
    px font-size must still write "px", and its unit must NOT become the
    `unitless` sentinel just because the two paths now share code.
    """
    html = (
        '<div class="sgs-product-card">'
        '<span class="sgs-product-card__price">£4.99</span>'
        "</div>"
    )
    node = _node(html)
    rec = recognise(node)
    css_rules = {".sgs-product-card__price": {"font-size": "28px"}}
    results = extract_content(rec, node, css_rules=css_rules)
    styling = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert styling.get("priceFontSizeUnit") == "px", (
        f"font-size unit must stay 'px' — got {styling.get('priceFontSizeUnit')!r}"
    )


def test_numeric_attrs_reaching_this_resolver_are_the_known_five():
    """SCOPE GUARD — the numeric fix above is scoped by the capability gate.

    `lift_styling_content` runs ONLY for blocks holding `scalar-styling-lift`,
    and only for attrs with role color/typography + a `derived_selector` + a
    resolvable `css_property`. Under those gates exactly five number-typed attrs
    reach `_compute_value`, all `line-height`.

    This test re-derives that set from the DB and pins it. If a block gains the
    capability — or an attr gains a `derived_selector` — and brings a NEW
    number-typed attr into scope, this fails and forces someone to check whether
    `_compute_value` still handles it correctly (a `font-weight` attr arriving
    here, for instance, would hit the keyword branch BEFORE the numeric one).

    Written after an adversarial review offered `sgs/nav-menu.featuredFontWeight`
    as a counter-example to the fix's scope. It is not one — `sgs/nav-menu` has
    no `scalar-styling-lift` capability — but a claim defended only by a comment
    is worth pinning with an assertion instead.
    """
    import os, sqlite3

    db = os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db")
    conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True)

    blocks = {r[0] for r in conn.execute(
        "SELECT DISTINCT block_slug FROM block_capabilities "
        "WHERE capability='scalar-styling-lift'"
    )}

    sufmap = {}
    for prop, suf in conn.execute(
        "SELECT css_property, suffix FROM property_suffixes "
        "WHERE css_property IS NOT NULL AND TRIM(css_property) <> ''"
    ):
        sufmap[suf.upper()] = prop

    def resolve(attr):
        for suf in sorted(sufmap, key=len, reverse=True):
            if attr.upper().endswith(suf):
                return sufmap[suf]
        return None

    found = set()
    for slug, attr, atype in conn.execute(
        "SELECT block_slug, attr_name, attr_type FROM block_attributes "
        "WHERE role IN ('color','typography') "
        "  AND derived_selector IS NOT NULL AND TRIM(derived_selector) <> '' "
        "  AND attr_type IN ('number','integer')"
    ):
        if slug in blocks and resolve(attr):
            found.add((slug, attr, resolve(attr)))

    expected = {
        # font-size — handled correctly BEFORE this fix (the old branch was
        # gated on exactly this property). Pinned so the guard covers the whole
        # numeric surface, not just the half that was broken.
        ("sgs/media", "captionFontSize", "font-size"),
        ("sgs/product-card", "ctaFontSize", "font-size"),
        # line-height — the five this fix repairs.
        ("sgs/counter", "labelLineHeight", "line-height"),
        ("sgs/product-card", "titleLineHeight", "line-height"),
        ("sgs/product-card", "descLineHeight", "line-height"),
        ("sgs/quote", "attributionLineHeight", "line-height"),
        ("sgs/trust-bar", "titleLineHeight", "line-height"),
    }

    assert found == expected, (
        "the set of number-typed attrs reaching lift_styling_content has CHANGED. "
        f"added: {sorted(found - expected)} ; "
        f"removed: {sorted(expected - found)}. "
        "If something ARRIVED: check _compute_value still handles its css_property "
        "correctly — a font-weight attr hits the keyword branch BEFORE the numeric "
        "one, and would still be written as a string. If something LEFT: confirm it "
        "moved to a resolver that handles the type, not that it stopped lifting."
    )


@pytest.mark.parametrize(
    ("slug", "html", "attr"),
    [
        (
            "sgs/counter",
            '<div class="sgs-counter">'
            '<span class="sgs-counter__label">Happy customers</span>'
            "</div>",
            "labelLineHeight",
        ),
        (
            "sgs/product-card",
            '<div class="sgs-product-card">'
            '<p class="sgs-product-card__description">Freshly baked.</p>'
            "</div>",
            "descLineHeight",
        ),
        (
            "sgs/trust-bar",
            '<div class="sgs-trust-bar">'
            '<h2 class="sgs-trust-bar__heading">Why choose us</h2>'
            "</div>",
            "titleLineHeight",
        ),
    ],
)
def test_every_number_typed_line_height_attr_lifts_as_a_number(slug, html, attr):
    """Cover the OTHER three of the five, not just product-card + quote.

    The fix is universal by construction (it branches on the declared type, not
    on the block), but "universal by construction" is an argument, not evidence —
    and this repo's own rule is that a fix applies to every qualifying case. Each
    block has its own capability wiring and its own `derived_selector`, so each
    is exercised rather than argued.
    """
    node = _node(html)
    rec = recognise(node)
    assert rec.slug == slug, f"recognition drifted: expected {slug}, got {rec.slug}"

    selector = "." + html.split('class="')[2].split('"')[0]
    results = extract_content(rec, node, css_rules={selector: {"line-height": "1.4"}})
    styling = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    got = styling.get(attr)
    assert got == 1.4 and isinstance(got, (int, float)) and not isinstance(got, bool), (
        f"{slug}.{attr} is declared type:'number' — a string is silently discarded "
        f"by WP at render. got {got!r} (type {type(got).__name__})"
    )
