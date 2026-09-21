"""sgs/google-reviews header figures, the request link and the per-review avatar colour (Eye Care, 2026-09-21).

Five causes, five fixes, each pinned here with a control that fails without the fix:

  1. ROLES. averageRating was role 'behaviour', reviewCount and businessName role NULL, and reviewRequestUrl role
     'content' (so the link's TEXT 'See all reviews' was lifted instead of its href). Every content-lift path filters to
     content-bearing roles, so none of them could reach the three header figures. They now follow the
     sgs/testimonial.ratingScale precedent: 'numeric-content' / 'text-content' plus a derived_selector
     (attr-classification-overrides.json) and the block's supports.sgs.scalarContentLift opt-in; reviewRequestUrl is
     'link-href'.
  2. DECIMALS. lift_helpers.extract_star_count reads `\\b(\\d{1,2})\\b` from an aria-label, so "4.7 out of 5" read 4, and it
     clamps to an int. The 'numeric-content' role now reads numbers with lift_helpers.first_number / extract_aria_number
     (4.7 stays 4.7, '15 reviews' is the int 15).
  3. AVATAR COLOUR. reviews[].avatarColour had no extractor. Role 'colour-background' (roles.json, declared in block.json
     items.properties.avatarColour.role) reads the element's inline background.
  4. (classless_field_resolver's hex-colour-vs-URL bug is pinned in recogniser/test_classless_field_resolver.py.)
  5. EMIT SHAPE (fixed 2026-09-21). `_populate_emit_shape` had classified averageRating / reviewCount / businessName as
     emit_shape='child' because converter/services/render_emits.py::_render_source follows only ONE hop of `require`
     (render.php -> includes/render-helpers.php) and those attributes are read two hops down, in
     includes/helpers-reviews-inline.php; walk.py refuses to scalar-lift a 'child' attribute. `render_reads_attr` now uses
     `_render_reach_source` (transitive); pinned by test_render_emits_transitive.py and by
     test_the_header_figures_lift_on_the_real_db_state below, which runs against the real DB state.

Needs the framework DB seeded with these changes (`python scripts/sgs-update-v2.py --stage 1`).

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_google_reviews_header_and_colours.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re

import pytest
from bs4 import BeautifulSoup

from converter.db import db_lookup
from converter.entry import convert_section
from converter.resolvers.array_content import lift_array_content
from converter.services.field_extractors import extract_field_value
from converter.services.lift_helpers import extract_aria_number, extract_star_count, first_number

_SLUG = "sgs/google-reviews"


def _el(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# ---------------------------------------------------------------------------
# 2. Decimal-capable numbers
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("text, expected", [
    ("4.7", 4.7),
    ("15 reviews", 15),
    ("1,204 reviews", 1204),
    ("9.2 / 10", 9.2),
    ("Rated 4.5 out of 5", 4.5),
    ("-3", -3),
    ("no digits here", None),
    ("", None),
])
def test_first_number_is_typed_by_how_it_was_written(text, expected):
    got = first_number(text)
    assert got == expected
    assert type(got) is type(expected)      # 15 is an int, never 15.0; 4.7 is a float


@pytest.mark.parametrize("label, expected", [
    ("4.7 out of 5", 4.7),
    ("5 out of 5", 5),
    ("4 stars", 4),
    ("Rated 3.5 out of 5 stars", 3.5),
])
def test_an_aria_label_yields_its_number_with_the_decimal(label, expected):
    got = extract_aria_number(_el(f'<span aria-label="{label}">★★★★★</span>'))
    assert got == expected and type(got) is type(expected)


def test_an_element_with_no_aria_label_or_a_glyph_run_alone_yields_no_number():
    """A star-glyph run is decoration (a clipped 94% overlay draws 4.7 as ten glyphs): never a number."""
    assert extract_aria_number(_el("<span>★★★★★</span>")) is None
    assert extract_field_value(_el("<span>★★★★★<span>★★★★★</span></span>"), "numeric-content") is None


def test_numeric_content_reads_text_first_then_the_aria_label():
    assert extract_field_value(_el("<span>4.7</span>"), "numeric-content") == 4.7
    count = extract_field_value(_el("<span>15 reviews</span>"), "numeric-content")
    assert count == 15 and isinstance(count, int) and not isinstance(count, bool)
    glyphs = '<span aria-label="4.7 out of 5">★★★★★<span style="width:94%">★★★★★</span></span>'
    assert extract_field_value(_el(glyphs), "numeric-content") == 4.7
    # text wins over a contradicting label
    assert extract_field_value(_el('<span aria-label="3 stars">4.7</span>'), "numeric-content") == 4.7
    # the existing testimonial score is unchanged
    assert extract_field_value(_el('<span class="sgs-testimonial__score">9.2</span>'), "numeric-content") == 9.2


def test_the_per_item_rating_role_is_byte_identical_for_every_integer_case():
    """The star-COUNT role is deliberately untouched: an int 0..5 from an aria-label digit or a glyph count."""
    assert extract_star_count(_el('<div aria-label="5 stars"></div>')) == 5
    assert extract_star_count(_el("<span>★★★★</span>")) == 4
    assert extract_star_count(_el("<span></span>")) == 0
    assert extract_star_count(_el('<span aria-label="Rated 4 out of 5">★★★★☆</span>')) == 4
    assert isinstance(extract_field_value(_el("<span>★★★</span>"), "rating"), int)
    # documented, not fixed here: the per-item role is an int by design, so a decimal label truncates. The
    # aggregate score uses 'numeric-content' instead, which is why averageRating does not use role 'rating'.
    assert extract_star_count(_el('<span aria-label="4.7 out of 5"></span>')) == 4


# ---------------------------------------------------------------------------
# 3. Avatar colour (role 'colour-background')
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("style, expected", [
    ("width:40px;height:40px;border-radius:50%;background: #1A73E8;color:#fff", "#1A73E8"),
    ("background-color:#E8710A", "#E8710A"),
    ("background: rgb(0, 128, 0) no-repeat", "rgb(0, 128, 0)"),
    ("background:hsl(210,80%,50%)", "hsl(210,80%,50%)"),
    ("background: crimson", "#dc143c"),
    ("background:white", "#ffffff"),
    ("background:var(--wp--preset--color--primary)", "primary"),
    ("background:#000;background-color:#fff", "#fff"),           # the last declaration wins, as in CSS
])
def test_an_inline_background_resolves_to_a_token_or_a_concrete_colour(style, expected):
    assert extract_field_value(_el(f'<span style="{style}">A</span>'), "colour-background") == expected


@pytest.mark.parametrize("style", [
    "background:linear-gradient(#000,#fff)",
    "background:var(--not-a-palette-token)",
    "background:transparent",
    "color:red",
    "",
])
def test_a_gradient_an_unresolved_var_or_no_background_lifts_nothing(style):
    assert extract_field_value(_el(f'<span style="{style}">A</span>'), "colour-background") is None


# ---------------------------------------------------------------------------
# Live-DB facts the fixes rest on
# ---------------------------------------------------------------------------

def test_the_header_attributes_are_numeric_or_text_content_with_a_selector_and_the_block_opts_in():
    attrs = db_lookup.block_attrs(_SLUG)
    assert (attrs["averageRating"]["role"], attrs["averageRating"]["derived_selector"]) == (
        "numeric-content", ".sgs-google-reviews__average-rating")
    assert (attrs["reviewCount"]["role"], attrs["reviewCount"]["derived_selector"]) == (
        "numeric-content", ".sgs-google-reviews__review-count")
    assert (attrs["businessName"]["role"], attrs["businessName"]["derived_selector"]) == (
        "text-content", ".sgs-google-reviews__business-name")
    assert attrs["reviewRequestUrl"]["role"] == "link-href"
    assert {"scalar-content-lift", "array-content-lift"} <= set(db_lookup.capabilities_for(_SLUG))


def test_the_avatar_colour_field_declares_the_colour_background_role_and_the_role_is_content_bearing():
    roles = dict(db_lookup.array_item_field_schema(_SLUG, "reviews"))
    assert roles["avatarColour"] == "colour-background"
    assert "colour-background" in db_lookup._content_bearing_roles()


# ---------------------------------------------------------------------------
# Real converter, self-contained fixture: the block div holds the header AND the cards
# ---------------------------------------------------------------------------

_COLOURS = ["#1A73E8", "#E8710A", "#A142F4"]
_CARD = (
    '<article class="sgs-google-reviews__review">'
    '<span class="sgs-google-reviews__avatar-colour" style="width:40px;border-radius:50%%;background: %s;color:#fff">%s</span>'
    '<strong class="sgs-google-reviews__author">%s</strong><span class="sgs-google-reviews__meta">%s</span>'
    '<span class="sgs-google-reviews__rating" style="color:#FBBC04">%s</span>'
    '<time class="sgs-google-reviews__date">%s</time><p class="sgs-google-reviews__text">%s</p></article>'
)
_ROWS = [
    (_COLOURS[0], "A", "Anonymous M.", "6 reviews", "★★★★★", "2 years ago", "Lovely experience."),
    (_COLOURS[1], "N", "Neelum Mushtaq", "Local Guide", "★★★★", "a year ago", "Highly recommended."),
    (_COLOURS[2], "S", "Sam R.", "3 reviews", "★★★★★", "3 weeks ago", "Fitted properly."),
]
_HEADER = (
    '<img src="g.svg" alt="" aria-hidden="true">'
    '<span class="sgs-google-reviews__average-rating">4.7</span>'
    '<span aria-label="4.7 out of 5">★★★★★</span>'
    '<span class="sgs-google-reviews__review-count">15 reviews</span>'
    '<a class="sgs-google-reviews__review-request-url" href="https://share.google/9YZzTiRj2gvW1Xrpr">See all reviews</a>'
    '<a href="https://share.google/9YZzTiRj2gvW1Xrpr">Write a review</a>'
)


_ANNOTATION_CLASS_RE = re.compile(
    r' class="sgs-google-reviews__(average-rating|review-count|review-request-url|avatar-colour|rating)"'
)


def _block(annotated: bool = True) -> dict:
    cards = "".join(_CARD % r for r in _ROWS)
    html = (
        '<section class="sgs-social-proof"><h2>What people say</h2>'
        f'<div class="sgs-google-reviews">{_HEADER}<div class="rev-rail">{cards}</div></div></section>'
    )
    if not annotated:
        html = _ANNOTATION_CLASS_RE.sub("", html)
    markup = convert_section(html=html, css="", media_map={}, boundary_id="b1", section_id="s1")["block_markup"]
    match = re.search(r"wp:sgs/google-reviews (\{.*?\}) /?-->", markup, re.S)
    assert match, "the block was not emitted: " + markup[:300]
    return json.loads(match.group(1))


def test_the_request_link_lifts_its_href_not_its_text():
    """Cause: role 'content' extracted the anchor's text, so this attribute held 'See all reviews'."""
    assert _block()["reviewRequestUrl"] == "https://share.google/9YZzTiRj2gvW1Xrpr"


def test_every_review_gets_its_own_avatar_colour_and_star_count():
    reviews = _block()["reviews"]
    assert [r["avatarColour"] for r in reviews] == _COLOURS
    assert [r["rating"] for r in reviews] == [5, 4, 5]
    assert [r["author"] for r in reviews] == ["Anonymous M.", "Neelum Mushtaq", "Sam R."]   # nothing else moved


def test_without_the_annotation_classes_none_of_it_is_invented():
    """Negative control: the same draft minus the classes emits none of the new fields (no guessing)."""
    block = _block(annotated=False)
    assert not ({"averageRating", "reviewCount", "reviewRequestUrl"} & set(block))
    assert all(not ({"avatarColour", "rating"} & set(r)) for r in block["reviews"])


def _header_figures_with_emit_shape(monkeypatch, shape: str | None) -> dict:
    if shape is not None:
        real = db_lookup.emit_shape_for
        header_attrs = {"averageRating", "reviewCount", "businessName"}
        monkeypatch.setattr(
            db_lookup, "emit_shape_for",
            lambda slug, attr: shape if (slug == _SLUG and attr in header_attrs) else real(slug, attr),
        )
    return _block()


def test_the_header_figures_lift_typed_once_they_are_nested(monkeypatch):
    """The rest of the chain (role, derived_selector, capability, extractor, type) proven with the ONE blocked fact
    supplied: emit_shape 'nested'. averageRating is a float, reviewCount an int."""
    block = _header_figures_with_emit_shape(monkeypatch, "nested")
    assert block["averageRating"] == 4.7 and isinstance(block["averageRating"], float)
    assert block["reviewCount"] == 15 and isinstance(block["reviewCount"], int)


def test_a_child_shaped_attribute_is_never_scalar_lifted(monkeypatch):
    """Negative control for the test above: with emit_shape 'child' (what the DB holds today) the figures stay out."""
    block = _header_figures_with_emit_shape(monkeypatch, "child")
    assert "averageRating" not in block and "reviewCount" not in block


def test_the_header_figures_lift_on_the_real_db_state():
    block = _block()
    assert block["averageRating"] == 4.7 and block["reviewCount"] == 15


# ---------------------------------------------------------------------------
# A background that is not a single colour is reported, never silently dropped (Rule 4)
# ---------------------------------------------------------------------------

def test_an_unresolvable_avatar_background_lifts_nothing_and_is_reported_as_a_gap():
    def card(style: str, name: str) -> str:
        return (
            '<article class="sgs-google-reviews__review">'
            f'<span class="sgs-google-reviews__avatar-colour" style="{style}">A</span>'
            f'<strong class="sgs-google-reviews__author">{name}</strong>'
            f'<p class="sgs-google-reviews__text">{name} says hello there</p></article>'
        )
    node = _el(
        '<div class="sgs-google-reviews">'
        + card("background:#1A73E8", "One")
        + card("background:linear-gradient(#000,#fff)", "Two")
        + card("color:#fff", "Three")
        + "</div>"
    )
    attrs, gaps = lift_array_content(node, _SLUG, {})
    reviews = attrs["reviews"]
    assert [r.get("avatarColour") for r in reviews] == ["#1A73E8", None, None]
    reported = [(g.where, g.detail) for g in gaps if "avatarColour" in g.where]
    assert len(reported) == 1 and reported[0][0] == "reviews[1].avatarColour"     # only the card that DECLARED a bad background
    assert "linear-gradient" in reported[0][1]
