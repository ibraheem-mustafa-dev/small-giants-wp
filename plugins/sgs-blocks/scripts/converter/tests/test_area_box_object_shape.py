"""A routed box-family attribute is written in its declared OBJECT shape (review wave on
d160fe287, 2026-09-21).

Cause, reproduced before the fix: ``fold_helpers.route_area_css_to_block_attrs`` reshaped only
``padding-*`` into a box object. Every other box-family attribute it found (``border-radius``,
``border-width``), by the first lookup (``cardBorderRadius`` for the ``review`` element) or the
selector-keyed second (``avatarBorderRadius`` for ``avatar-colour``), received the draft's
value as a BARE STRING (``"avatarBorderRadius": "50%"``, ``"cardBorderWidth": "1px"``).
WordPress drops a string written into an object-typed attribute at render, so the radius
and border widths the draft declared vanished with no error.

The destination shape is the DB's (``block_attributes.box_family`` +
``box_family_is_tier_shaped``): a tier-of-boxes attr holds ``{desktop:{...}}``, a base-only
box holds the box itself, a radius keys its corners (``topLeft`` ...) and everything else its
sides (``top`` ...). No attribute is named in the code under test.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_area_box_object_shape.py -q -p no:cacheprovider
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.db import db_lookup
from converter.services import fold_helpers
from converter.services.fold_helpers import route_area_css_to_block_attrs

_GR = "sgs/google-reviews"


def _route(html: str, area: str, rules: "dict | None" = None):
    from converter.services import content_gap_collector as gap

    node = BeautifulSoup(html, "html.parser").find(True)
    attrs: dict = {}
    rows: list[tuple[str, str]] = []
    real_rec, real_note = gap.record_declaration_skip_candidate, gap.note_declaration_routed
    gap.record_declaration_skip_candidate = lambda **kw: rows.append((kw["prop"], kw["reason"]))
    gap.note_declaration_routed = lambda **kw: None
    try:
        route_area_css_to_block_attrs(node, area, _GR, attrs, rules or {}, trace=lambda *a, **k: None)
    finally:
        gap.record_declaration_skip_candidate, gap.note_declaration_routed = real_rec, real_note
    return attrs, rows


def _corners(a, b=None, c=None, d=None):
    b = a if b is None else b
    c = a if c is None else c
    d = b if d is None else d
    return {"topLeft": a, "topRight": b, "bottomRight": c, "bottomLeft": d}


def _sides(v):
    return {"top": v, "right": v, "bottom": v, "left": v}


_AVATAR = '<span class="sgs-google-reviews__avatar-colour" style="{s}">x</span>'
_CARD = '<article class="sgs-google-reviews__review" style="{s}">x</article>'
_LINK = '<a class="sgs-google-reviews__review-request-url" style="{s}">x</a>'


def test_the_db_classes_the_attrs_under_test_as_box_families():
    """The premise, read from the DB rather than assumed: object-typed box families, one
    tier-of-boxes and one base-only, so both destination shapes are exercised."""
    assert db_lookup.box_family_for(_GR, "avatarBorderRadius") is not None
    assert db_lookup.box_family_is_tier_shaped(_GR, "avatarBorderRadius") is True
    assert db_lookup.box_family_for(_GR, "cardBorderWidth") is not None
    assert db_lookup.box_family_is_tier_shaped(_GR, "cardBorderWidth") is False


def test_a_radius_found_by_the_selector_lookup_is_a_corner_object_in_a_tier_object():
    attrs, _ = _route(_AVATAR.format(s="border-radius:50%"), "avatar-colour")
    assert attrs == {"avatarBorderRadius": {"desktop": _corners("50%")}}


def test_a_radius_and_width_found_by_the_first_lookup_are_objects_too():
    attrs, _ = _route(_CARD.format(s="border-radius:12px;border-width:1px"), "review")
    assert attrs == {
        "cardBorderRadius": {"desktop": _corners("12px")},
        "cardBorderWidth": _sides("1px"),  # base-only box: the box itself, no tier wrapper
    }


def test_a_two_value_radius_keys_each_corner_the_css_way():
    attrs, _ = _route(_LINK.format(s="border-radius:20px 4px"), "review-request-url")
    assert attrs["writeReviewBorderRadius"] == {"desktop": _corners("20px", "4px", "20px", "4px")}


def test_a_real_tablet_or_mobile_override_lands_under_its_own_tier_key():
    attrs, _ = _route(
        _AVATAR.format(s="border-radius:50%"), "avatar-colour",
        {".sgs-google-reviews__avatar-colour": {"border-radius": "50%"},
         "max-width: 767 :: .sgs-google-reviews__avatar-colour": {"border-radius": "8px"}})
    assert attrs["avatarBorderRadius"] == {"desktop": _corners("50%"), "mobile": _corners("8px")}


def test_a_tier_that_merely_inherits_the_base_adds_no_key():
    attrs, _ = _route(_AVATAR.format(s="border-radius:50%"), "avatar-colour")
    assert set(attrs["avatarBorderRadius"]) == {"desktop"}


def test_a_base_only_box_reports_a_mobile_override_it_has_no_slot_for():
    attrs, rows = _route(
        _CARD.format(s="border-width:1px"), "review",
        {".sgs-google-reviews__review": {"border-width": "1px"},
         "max-width: 767 :: .sgs-google-reviews__review": {"border-width": "3px"}})
    assert attrs == {"cardBorderWidth": _sides("1px")}
    assert any(p == "border-width" and "area_attr_tier_missing (cardBorderWidthMobile)" in r
               for p, r in rows)


def test_an_elliptical_radius_is_reported_not_written():
    attrs, rows = _route(_AVATAR.format(s="border-radius:50% / 30%"), "avatar-colour")
    assert "avatarBorderRadius" not in attrs
    assert any(p == "border-radius" and "elliptical" in r for p, r in rows)


def test_an_unparseable_box_value_is_reported_not_written():
    attrs, rows = _route(_CARD.format(s="border-width:1px 2px 3px 4px 5px"), "review")
    assert "cardBorderWidth" not in attrs
    assert any(p == "border-width" and "area_box_value_unshapeable" in r for p, r in rows)


def test_a_scalar_attribute_is_untouched():
    """The same route for a non-box attr keeps its bare value: `starColour` is a colour."""
    attrs, _ = _route('<span class="sgs-google-reviews__star" style="color:#FBBC04">x</span>', "star")
    assert attrs == {"starColour": "#FBBC04"}


# ---------------------------------------------------------------------------
# NEGATIVE CONTROLS
# ---------------------------------------------------------------------------

def test_negative_control_without_the_reshape_the_bare_string_is_back(monkeypatch):
    monkeypatch.setattr(fold_helpers, "_box_object_from_css", lambda prop, raw: (raw, ""))
    attrs, _ = _route(_AVATAR.format(s="border-radius:50%"), "avatar-colour")
    assert attrs == {"avatarBorderRadius": {"desktop": "50%"}} or attrs["avatarBorderRadius"] == "50%"
    assert attrs["avatarBorderRadius"] != {"desktop": _corners("50%")}


def test_negative_control_the_db_gate_is_what_selects_the_object_shape(monkeypatch):
    """Take the DB's box_family away and the scalar path returns, writing a bare string."""
    monkeypatch.setattr(db_lookup, "box_family_for", lambda block, attr: None)
    attrs, _ = _route(_AVATAR.format(s="border-radius:50%"), "avatar-colour")
    assert attrs == {"avatarBorderRadius": "50%"}


def test_negative_control_the_tier_shape_gate_selects_the_desktop_wrapper(monkeypatch):
    monkeypatch.setattr(db_lookup, "box_family_is_tier_shaped", lambda block, attr: False)
    attrs, _ = _route(_AVATAR.format(s="border-radius:50%"), "avatar-colour")
    assert attrs["avatarBorderRadius"] == _corners("50%")  # no `desktop` wrapper
