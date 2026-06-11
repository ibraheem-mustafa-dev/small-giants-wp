"""test_scalar_selector_lift.py — Unit tests for _lift_scalar_attrs_by_selector,
the universal DB-driven multi-scalar lift (FR-22-2 / FR-22-5 D1, 2026-06-11).

Covers:
  - NEGATIVE (STOP-E): grid/gallery/collection blocks (has_inner_blocks=0 but no
    content derived_selectors) lift NOTHING — no garbage attrs, no regression.
  - POSITIVE: the real page-8 testimonial draft lifts quote/reviewerName/
    ratingStars (+ showRating), and does NOT emit ratingScale (element absent).

Mirrors the path setup + import pattern of test_g1_leaf_lift.py.
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from bs4 import BeautifulSoup  # noqa: E402
from orchestrator.converter_v2 import convert  # noqa: E402


def _root(html: str):
    """Parse and return the first element child (the block root node)."""
    soup = BeautifulSoup(html, "html.parser")
    return soup.find(True)


# Real page-8 testimonial draft.
TESTIMONIAL_HTML = (
    '<article class="sgs-testimonial">'
    '<div class="sgs-testimonial__stars" aria-label="5 stars">★★★★★</div>'
    '<p class="sgs-testimonial__text">"This is genuinely the best I have tried."</p>'
    '<p class="sgs-testimonial__author">Reham, London</p>'
    '</article>'
)


# --- NEGATIVE: STOP-E no-op for grid-family blocks -------------------------

def test_negative_grid_blocks_lift_nothing():
    """Grid/gallery/collection blocks have no content derived_selectors → {}.

    Each is given a representative draft node. The lift must return an EMPTY
    dict (no garbage attrs) — proving the selector-gate makes it a strict no-op
    for blocks that carry no content selectors.
    """
    cases = {
        "sgs/card-grid": '<div class="sgs-card-grid"><div class="sgs-card-grid__item">x</div></div>',
        "sgs/post-grid": '<div class="sgs-post-grid"><article>x</article></div>',
        "sgs/gallery": '<div class="sgs-gallery"><img src="a.jpg"></div>',
        "sgs/content-collection": '<div class="sgs-content-collection"><div>x</div></div>',
    }
    for slug, html in cases.items():
        node = _root(html)
        result = convert._lift_scalar_attrs_by_selector(node, slug)
        assert result == {}, f"{slug}: expected no-op {{}}, got {result!r}"


# --- NEGATIVE: STOP-E capability-gate no-op --------------------------------

def test_negative_lift_eligible_blocks_without_capability_lift_nothing():
    """Blocks WITH lift-eligible attrs+selectors but WITHOUT the
    'scalar-content-lift' capability return {} (council opt-in gate, R-22-1).

    Critically, each draft node here INCLUDES the element that the block's
    derived_selector WOULD match (e.g. post-grid's .sgs-post-grid__button,
    star-rating's .sgs-star-rating__label). So if the lift fired, it would dump
    text into targetDate / imageUrl / label / readMoreText / title. The empty
    result therefore proves the CAPABILITY GATE — not element-absence — is what
    makes them a no-op. None of these blocks declares scalarContentLift.
    """
    cases = {
        # selector .sgs-countdown-timer__linkOpensNewTab → targetDate (date attr)
        "sgs/countdown-timer": (
            '<div class="sgs-countdown-timer">'
            '<span class="sgs-countdown-timer__linkOpensNewTab">2026-12-25</span>'
            '</div>'
        ),
        # selector .sgs-decorative-image__media → imageUrl (URL attr)
        "sgs/decorative-image": (
            '<div class="sgs-decorative-image">'
            '<div class="sgs-decorative-image__media">https://example.com/x.jpg</div>'
            '</div>'
        ),
        # selector .sgs-star-rating__label → label
        "sgs/star-rating": (
            '<div class="sgs-star-rating">'
            '<span class="sgs-star-rating__label">Excellent</span>'
            '</div>'
        ),
        # selector .sgs-post-grid__button → readMoreText
        "sgs/post-grid": (
            '<div class="sgs-post-grid">'
            '<a class="sgs-post-grid__button">Read more</a>'
            '</div>'
        ),
    }
    for slug, html in cases.items():
        assert "scalar-content-lift" not in convert.db.capabilities_for(slug), (
            f"test precondition broken: {slug} unexpectedly HAS the capability"
        )
        node = _root(html)
        result = convert._lift_scalar_attrs_by_selector(node, slug)
        assert result == {}, (
            f"{slug}: capability-gate failed — expected {{}}, got {result!r}"
        )


def test_negative_core_image_not_lifted():
    """core/image (non-sgs slug, selector 'img' → title) is a no-op.

    Guarded by the slug.startswith('sgs/') floor before the capability gate even
    runs, but asserted explicitly so a core block can never have its title/alt
    text dumped by the lift.
    """
    html = '<figure><img src="a.jpg" title="x"></figure>'
    node = _root(html)
    assert convert._lift_scalar_attrs_by_selector(node, "core/image") == {}


# --- POSITIVE: page-8 testimonial -----------------------------------------

def test_positive_testimonial_lifts_three_attrs():
    """The page-8 testimonial lifts quote, reviewerName, ratingStars + showRating.

    ratingScale must NOT appear (its element .sgs-testimonial__rating is absent
    from the draft).
    """
    node = _root(TESTIMONIAL_HTML)
    result = convert._lift_scalar_attrs_by_selector(node, "sgs/testimonial")

    assert "quote" in result and result["quote"], f"quote missing/empty: {result!r}"
    assert "best I have tried" in result["quote"], f"quote text wrong: {result['quote']!r}"
    assert result.get("reviewerName") == "Reham, London", f"got {result.get('reviewerName')!r}"
    assert result.get("ratingStars") == 5, f"ratingStars wrong: {result.get('ratingStars')!r}"
    assert isinstance(result["ratingStars"], int), "ratingStars must be an int"
    # showRating coupling (block declares the boolean attr + rating>0 lifted).
    assert result.get("showRating") is True, f"showRating not set: {result!r}"
    # ratingScale element absent → must NOT be emitted.
    assert "ratingScale" not in result, f"ratingScale leaked: {result!r}"


def test_positive_quote_lifts_from_both_naming_conventions():
    """quote's multi-selector ('.sgs-testimonial__text, .sgs-testimonial__quote')
    lifts from BOTH draft naming spaces: page-8 `__text` AND canonical BEM `__quote`.

    Proves the comma-separated first-match-wins resolution — neither convention
    is privileged; both must work.
    """
    text_html = (
        '<article class="sgs-testimonial">'
        '<p class="sgs-testimonial__text">"Lifted via __text convention."</p>'
        '<p class="sgs-testimonial__author">Sarah M., Birmingham</p>'
        '</article>'
    )
    quote_html = (
        '<article class="sgs-testimonial">'
        '<p class="sgs-testimonial__quote">"Lifted via __quote convention."</p>'
        '<p class="sgs-testimonial__author">Sarah M., Birmingham</p>'
        '</article>'
    )
    res_text = convert._lift_scalar_attrs_by_selector(_root(text_html), "sgs/testimonial")
    res_quote = convert._lift_scalar_attrs_by_selector(_root(quote_html), "sgs/testimonial")

    assert "__text convention" in res_text.get("quote", ""), (
        f"__text not lifted: {res_text!r}"
    )
    assert "__quote convention" in res_quote.get("quote", ""), (
        f"__quote not lifted: {res_quote!r}"
    )
    assert res_text.get("reviewerName") == "Sarah M., Birmingham"
    assert res_quote.get("reviewerName") == "Sarah M., Birmingham"


def test_positive_star_count_from_glyphs_when_no_aria():
    """Star count falls back to glyph counting when aria-label has no digit."""
    html = (
        '<article class="sgs-testimonial">'
        '<div class="sgs-testimonial__stars">★★★★</div>'
        '<p class="sgs-testimonial__text">Good.</p>'
        '</article>'
    )
    node = _root(html)
    result = convert._lift_scalar_attrs_by_selector(node, "sgs/testimonial")
    assert result.get("ratingStars") == 4, f"glyph count wrong: {result!r}"
