"""Two per-area routes found missing on the live Eye Care reviews card (2026-09-22).

1. PILL PADDING. The draft's two header pills (`.sgs-google-reviews__review-request-url`,
   `.sgs-google-reviews__see-all-url`) declare `padding: 0 22px`. The block holds that in the
   box-family objects `writeReviewPadding` / `seeAllPadding`, whose `derived_selector` names the
   draft class. Cause: the padding-object branch of `fold_helpers.route_area_css_to_block_attrs`
   resolved its destination only through `attr_for_area_property` (css_element) and an
   `{area}Padding` name guess; the flat loop's selector route then asked for `padding-top`,
   which no box attr declares. Fix: the padding branch also asks the selector route for the
   SHORTHAND `padding`.

2. HEADER DIVIDER. The draft's header row declares `border-bottom: 1px solid #E8EAED`; the block
   holds it in `headerDividerWidth` (border-bottom-width) and `headerDividerColour`
   (border-bottom-color). Cause: `root_supports.expand_background_border_shorthand` expanded the
   four-side `border` only. Fix: an opt-in `per_side` expansion, used by the per-area fold only.
   The ROOT path keeps the old behaviour: its outer-box resolver would map one side's width into
   the all-sides `borderWidth` object with no colour home, and several blocks default
   `borderStyle` to `solid`, so the width alone would draw a text-coloured line.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_area_padding_and_side_border_route.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re

from converter.entry import convert_section
from converter.services import fold_helpers
from converter.services.root_supports import expand_background_border_shorthand

_HEADER = (
    '<div class="sgs-google-reviews__header" style="border-bottom:1px solid #E8EAED;padding-bottom:22px">'
    '<span class="sgs-google-reviews__average-rating">4.7</span>'
    '<span class="sgs-google-reviews__review-count">15 reviews</span>'
    '<a class="sgs-google-reviews__see-all-url" href="https://example.com/all" '
    'style="padding:0 22px;background:#1A73E8;color:#fff">See all reviews</a>'
    '<a class="sgs-google-reviews__review-request-url" href="https://example.com/write" '
    'style="padding:0 22px;color:#1A73E8">Write a review</a>'
    '</div>'
)
_CARD = (
    '<article class="sgs-google-reviews__review">'
    '<strong class="sgs-google-reviews__author">{n}</strong>'
    '<p class="sgs-google-reviews__text">{t}</p></article>'
)


def _draft() -> str:
    cards = "".join(_CARD.format(n=n, t=t) for n, t in (("A.", "One."), ("B.", "Two."), ("C.", "Three.")))
    return (f'<section class="sgs-social-proof"><div class="sgs-google-reviews">{_HEADER}'
            f'<div class="sgs-google-reviews__rail">{cards}</div></div></section>')


def _run() -> dict:
    return convert_section(html=_draft(), css="", media_map={}, boundary_id="b9", section_id="s9")


def _attrs(result: dict) -> dict:
    return json.loads(re.search(r"wp:sgs/google-reviews (\{.*?\}) /?-->", result["block_markup"], re.S).group(1))


_PILL = {"desktop": {"top": "0", "right": "22px", "bottom": "0", "left": "22px"}}


def test_both_pills_carry_the_drafts_padding_as_a_box_object():
    a = _attrs(_run())
    assert a.get("writeReviewPadding") == _PILL
    assert a.get("seeAllPadding") == _PILL


def test_the_pill_padding_is_no_longer_reported_as_skipped():
    rows = [(g["element"], g["property"]) for g in _run()["content_gaps"] if g.get("property")]
    for cls in ("sgs-google-reviews__review-request-url", "sgs-google-reviews__see-all-url"):
        assert not [p for e, p in rows if e == cls and p.startswith("padding")], cls


def test_the_header_divider_routes_width_and_colour():
    a = _attrs(_run())
    assert a.get("headerDividerWidth") == "1px"
    assert a.get("headerDividerColour") == "#E8EAED"


def test_negative_control_without_the_padding_selector_step_the_pills_lose_their_padding(monkeypatch):
    """Break ONLY the new step: the selector route answers nothing for the `padding`
    shorthand, as before the fix. The objects vanish and the sides are reported again."""
    real = fold_helpers._selector_route_attr

    def no_padding_shorthand(child_node, owning_block, css_prop, area, element_sizing=False):
        if css_prop == "padding":
            return None, ""
        return real(child_node, owning_block, css_prop, area, element_sizing)

    monkeypatch.setattr(fold_helpers, "_selector_route_attr", no_padding_shorthand)
    result = _run()
    a = _attrs(result)
    assert "writeReviewPadding" not in a and "seeAllPadding" not in a
    rows = [(g["element"], g["property"]) for g in result["content_gaps"] if g.get("property")]
    assert ("sgs-google-reviews__review-request-url", "padding-left") in rows


def test_negative_control_without_per_side_expansion_the_divider_is_dropped(monkeypatch):
    """Break ONLY the opt-in: the fold asks for the old four-side-only expansion."""
    import converter.services.root_supports as rs
    real = rs.expand_background_border_shorthand
    monkeypatch.setattr(rs, "expand_background_border_shorthand",
                        lambda decls, *, slug=None, per_side=False: real(decls, slug=slug, per_side=False))
    a = _attrs(_run())
    assert "headerDividerWidth" not in a and "headerDividerColour" not in a


def test_the_expander_adds_side_longhands_only_when_asked_and_never_overrides_one():
    d = {"border-bottom": "1px solid #E8EAED"}
    expand_background_border_shorthand(d)
    assert d == {"border-bottom": "1px solid #E8EAED"}          # root path: unchanged
    expand_background_border_shorthand(d, per_side=True)
    assert d["border-bottom-width"] == "1px"
    assert d["border-bottom-style"] == "solid"
    assert d["border-bottom-color"] == "#E8EAED"
    kept = {"border-top": "2px dashed #000", "border-top-color": "#abc"}
    expand_background_border_shorthand(kept, per_side=True)
    assert kept["border-top-color"] == "#abc"                    # a declared longhand wins
    assert kept["border-top-width"] == "2px"


def test_the_four_side_border_expansion_is_unchanged():
    d = {"border": "1px solid #DADCE0"}
    expand_background_border_shorthand(d)
    assert (d["border-width"], d["border-style"], d["border-color"]) == ("1px", "solid", "#DADCE0")
