"""Scope + ambiguity rules for the per-area fold's selector-keyed second lookup
(review wave on d160fe287, 2026-09-21).

Four defects two cold reviewers found in ``fold_helpers._selector_route_attr``, each with a
reproduction that FAILED before the fix (the failing output is in the wave report):

1. The lookup looped EVERY class on the node although the declarations were collected for
   ``area`` only (``assembly._walk_area_nodes`` takes the FIRST BEM class's element as the
   area). A second, unrelated class on the same node therefore acted as a route key:
   ``<span class="sgs-google-reviews__author-name sgs-google-reviews__rating">`` with an
   author-name colour rule wrote ``starColour``. Only a class whose own BEM element token
   IS the area may be a route key.
2. It ignored each attr's ``css_element``: in ``sgs/hero`` the class ``.sgs-hero__image``
   is the ``derived_selector`` of the media column's attrs (``css_element='media'``) AND of
   every ``splitMedia*`` attr (``'split-media'``, the <img> itself), so a declaration on the
   wrapper landed on the image. A class routes only when every property-carrying attr that
   lists it names ONE css_element; otherwise it is REPORTED as a skip, never guessed.
3. (seed, no code) ``splitMediaMinHeight`` claims ``css_property='max-width,min-height'``.
4. An AMBIGUOUS first lookup (``AmbiguousAreaAttrError``) escaped the fold and crashed the
   section. It is now reported as a skip row (Rule 4) and the second lookup is NOT consulted.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_area_selector_route_scope.py -q -p no:cacheprovider
"""
from __future__ import annotations

import shutil
import sqlite3

import pytest
from bs4 import BeautifulSoup

from converter.db import db_lookup
from converter.services import fold_helpers
from converter.services.fold_helpers import route_area_css_to_block_attrs

_GR = "sgs/google-reviews"


def _route(html: str, area: str, block: str, rules: "dict | None" = None):
    """Live per-area fold on one element -> (attrs written, skip rows, trace events).

    Skip rows are captured at ``content_gap_collector.record_declaration_skip_candidate``,
    the channel that reaches the report, i.e. AFTER ``_report_area_skip``'s own suppression
    (a declaration a declarative selector route or a content role already carries is
    cancelled there). A row here is a row the report would carry: ``(prop, reason)``."""
    from converter.services import content_gap_collector as gap

    node = BeautifulSoup(html, "html.parser").find(True)
    attrs: dict = {}
    seen: list[tuple[str, dict]] = []
    rows: list[tuple[str, str]] = []
    real_record, real_note = gap.record_declaration_skip_candidate, gap.note_declaration_routed
    gap.record_declaration_skip_candidate = lambda **kw: rows.append((kw["prop"], kw["reason"]))
    gap.note_declaration_routed = lambda **kw: None  # keep the global routed-set clean
    try:
        route_area_css_to_block_attrs(
            node, area, block, attrs, rules or {},
            trace=lambda stage, **kw: seen.append((stage, kw)),
        )
    finally:
        gap.record_declaration_skip_candidate, gap.note_declaration_routed = real_record, real_note
    return attrs, rows, seen


def _clear_caches() -> None:
    for name in ("attrs_for_element_class_property", "selector_class_elements",
                 "attr_for_area_property", "attr_is_colour_role"):
        fn = getattr(db_lookup, name, None)
        if fn is not None:
            fn.cache_clear()


@pytest.fixture
def db_copy(tmp_path, monkeypatch):
    """A throwaway copy of the live DB the test may mutate; never the live file."""
    copy = tmp_path / "scope.db"
    shutil.copy(db_lookup.SGS_DB, copy)
    monkeypatch.setattr(db_lookup, "SGS_DB", copy)
    _clear_caches()
    yield copy
    _clear_caches()


# ---------------------------------------------------------------------------
# DEFECT 1: only the class that IS the area may be a route key
# ---------------------------------------------------------------------------

def test_a_second_class_on_the_node_is_not_a_route_key_google_reviews():
    attrs, rows, _ = _route(
        '<span class="sgs-google-reviews__author-name sgs-google-reviews__rating">x</span>',
        "author-name", _GR, {".sgs-google-reviews__author-name": {"color": "#FF0000"}},
    )
    assert "starColour" not in attrs
    assert attrs == {}
    assert any(p == "color" and "(no_area_attr)" in r for p, r in rows)  # the honest skip is still reported


def test_a_second_class_on_the_node_is_not_a_route_key_testimonial():
    attrs, rows, _ = _route(
        '<p class="sgs-testimonial__role sgs-testimonial__text">x</p>',
        "role", "sgs/testimonial", {".sgs-testimonial__role": {"font-size": "11px"}},
    )
    assert "quoteFontSize" not in attrs
    assert attrs == {}
    assert any(p == "font-size" and "(no_area_attr)" in r for p, r in rows)


def test_the_area_class_still_routes_when_another_class_shares_the_node():
    """The legitimate route is untouched: here the AREA is `star` (first BEM class), the
    other class is a non-area sibling, and starColour is still written."""
    attrs, _, _ = _route(
        '<span class="sgs-google-reviews__star sgs-google-reviews__author-name">x</span>',
        "star", _GR, {".sgs-google-reviews__star": {"color": "#FBBC04"}},
    )
    assert attrs == {"starColour": "#FBBC04"}


def test_negative_control_the_old_loop_over_every_class_reproduces_the_misroute(monkeypatch):
    """Undo the fix (route on ANY class of the node): the defect input misroutes again.
    Proves the area-class filter, not something incidental, is what stops it."""
    def any_class(child_node, owning_block, css_prop, area=None):
        found = []
        for cls in child_node.get("class", []) or []:
            for a in db_lookup.attrs_for_element_class_property(owning_block, cls, css_prop):
                if a not in found:
                    found.append(a)
        return (found[0], "") if len(found) == 1 else (None, "")

    monkeypatch.setattr(fold_helpers, "_selector_route_attr", any_class)
    attrs, _, _ = _route(
        '<span class="sgs-google-reviews__author-name sgs-google-reviews__rating">x</span>',
        "author-name", _GR, {".sgs-google-reviews__author-name": {"color": "#FF0000"}},
    )
    assert attrs == {"starColour": "#FF0000"}


# ---------------------------------------------------------------------------
# DEFECT 2: a class that names two block elements is reported, never guessed
# ---------------------------------------------------------------------------

def test_the_elements_a_class_is_claimed_by_are_read_from_the_db():
    f = db_lookup.selector_class_elements
    assert f("sgs/hero", "sgs-hero__image") == ("media", "split-media")
    assert f(_GR, "sgs-google-reviews__star") == ("star",)
    assert f(_GR, "sgs-google-reviews__write-review") == ("write-review",)
    assert f(_GR, "sgs-google-reviews__review-request-url") == ("write-review",)
    assert f(_GR, "sgs-google-reviews__not-a-class") == ()
    assert f("", "x") == () and f(_GR, "") == ()


def test_a_wrapper_declaration_does_not_land_on_the_image_attrs():
    attrs, rows, _ = _route(
        '<div class="sgs-hero__image" style="border-radius:24px;object-fit:cover">x</div>',
        "image", "sgs/hero",
    )
    assert not [k for k in attrs if k.startswith("splitMedia")], attrs
    reasons = {p: r for p, r in rows}
    assert "selector route ambiguous" in reasons["border-radius"]
    assert "selector route ambiguous" in reasons["object-fit"]
    assert "media" in reasons["object-fit"] and "split-media" in reasons["object-fit"]


def test_the_google_reviews_routes_survive_the_element_rule():
    attrs, _, _ = _route(
        '<span class="sgs-google-reviews__star" style="color:#FBBC04">x</span>',
        "star", _GR)
    assert attrs == {"starColour": "#FBBC04"}
    attrs, _, _ = _route(
        '<a class="sgs-google-reviews__review-request-url" style="color:#1A73E8;'
        'background:#fff">x</a>', "review-request-url", _GR)
    assert attrs == {"writeReviewColourText": "#1A73E8", "writeReviewColourBackground": "#fff"}


def test_negative_control_without_the_element_rule_the_image_misroute_is_back(monkeypatch):
    monkeypatch.setattr(db_lookup, "selector_class_elements", lambda b, c: ())
    attrs, _, _ = _route(
        '<div class="sgs-hero__image" style="object-fit:cover">x</div>', "image", "sgs/hero")
    assert attrs.get("splitMediaObjectFit") == "cover"


def test_a_null_element_attr_that_shares_a_class_with_a_named_element_is_a_distinct_element(db_copy):
    """NULL-element rule (a): a property-carrying attr with NO css_element makes no claim we
    can compare, so it counts as its OWN element -> the class is contested -> reported."""
    conn = sqlite3.connect(db_copy)
    conn.execute("UPDATE block_attributes SET css_element=NULL WHERE block_slug=? "
                 "AND attr_name='writeReviewColourText'", (_GR,))
    conn.commit()
    conn.close()
    _clear_caches()
    assert len(db_lookup.selector_class_elements(_GR, "sgs-google-reviews__write-review")) == 2
    attrs, rows, _ = _route(
        '<a class="sgs-google-reviews__write-review" style="color:#111111">x</a>',
        "write-review", _GR)
    assert "writeReviewColourText" not in attrs
    assert "selector route ambiguous" in dict(rows)["color"]


def test_a_class_whose_every_attr_has_no_element_still_routes(db_copy):
    """NULL-element rule (b): when NO attr names an element there is nothing to disagree
    about, so the class routes as before (one shared 'no element' claim, not a conflict)."""
    conn = sqlite3.connect(db_copy)
    # Every property-carrying attr that lists the class, not two named ones: the block has
    # since gained more attrs on this element (2026-09-21 reseed), and all of them must be
    # unnamed for "no attr names an element" to hold.
    for rowid, sel in conn.execute(
            "SELECT id, derived_selector FROM block_attributes WHERE block_slug=? "
            "AND css_property IS NOT NULL AND css_property != '' "
            "AND derived_selector IS NOT NULL", (_GR,)).fetchall():
        if "sgs-google-reviews__write-review" in {x.strip().lstrip(".") for x in sel.split(",")}:
            conn.execute("UPDATE block_attributes SET css_element=NULL WHERE id=?", (rowid,))
    conn.commit()
    conn.close()
    _clear_caches()
    assert db_lookup.selector_class_elements(_GR, "sgs-google-reviews__write-review") == (None,)
    attrs, _, _ = _route(
        '<a class="sgs-google-reviews__write-review" style="color:#111111">x</a>',
        "write-review", _GR)
    assert attrs == {"writeReviewColourText": "#111111"}


def test_companion_attrs_with_no_property_do_not_count_as_an_element():
    """`splitMediaType`, the *Unit attrs etc. carry no css_property: they style nothing, so
    they neither add an element nor block a route."""
    assert None not in db_lookup.selector_class_elements("sgs/hero", "sgs-hero__image")


# ---------------------------------------------------------------------------
# Accessor guards, each falsifiable ON ITS OWN (council C, test-vacuity findings)
#
# `attrs_for_element_class_property` has three independent guards: the state/tier SQL
# filter, the sibling-suffix name filter, and the property match. Probing a class whose
# only colliding row is caught by two of them at once (the live `starColourHover`, which is
# both `css_state='hover'` AND named `<stem>Hover`) proves neither. Each test below plants a
# row that ONLY its own guard can exclude, in a throwaway copy of the DB.
# ---------------------------------------------------------------------------

_STAR = "sgs-google-reviews__star"


def _plant(db, attr, *, prop="fill,color", state=None, tier=None, element="star",
           selector=".sgs-google-reviews__star"):
    conn = sqlite3.connect(db)
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, derived_selector, "
        "css_property, css_element, css_state, css_tier) VALUES (?,?,?,?,?,?,?,?)",
        (_GR, attr, "string", selector, prop, element, state, tier))
    conn.commit()
    conn.close()
    _clear_caches()


def test_the_live_star_fill_probe_returns_the_resting_attr_only():
    """The probe the mutation review said was missing: `__star` + `fill` is the class the
    live `starColourHover` row (fill, css_state='hover') collides on."""
    assert db_lookup.attrs_for_element_class_property(_GR, _STAR, "fill") == ("starColour",)


def test_the_state_sql_filter_alone_excludes_a_hover_attr_with_no_suffix(db_copy):
    _plant(db_copy, "starTintA", state="hover")  # name carries NO state suffix
    assert db_lookup.attrs_for_element_class_property(_GR, _STAR, "fill") == ("starColour",)


def test_the_tier_sql_filter_alone_excludes_a_tablet_attr_with_no_suffix(db_copy):
    _plant(db_copy, "starTintB", tier="tablet")  # name carries NO breakpoint suffix
    assert db_lookup.attrs_for_element_class_property(_GR, _STAR, "fill") == ("starColour",)


def test_the_sibling_suffix_filter_alone_excludes_an_unclassified_tier_sibling(db_copy):
    """The backstop: a `<stem>Tablet` attr whose css_tier/css_state were never classified
    passes the SQL filter, and only the name filter stops it winning the base slot."""
    _plant(db_copy, "starColourTablet")  # state NULL, tier NULL: the SQL filter cannot see it
    assert db_lookup.attrs_for_element_class_property(_GR, _STAR, "fill") == ("starColour",)


def test_the_sibling_suffix_filter_does_not_swallow_a_real_attr_with_a_suffix_like_name(db_copy):
    """Control for the filter above: a name that merely ENDS like a suffix but whose stem is
    not an attr of the block is a real attr and is kept."""
    _plant(db_copy, "starWholeTablet")  # stem `starWhole` is not an attr of the block
    got = db_lookup.attrs_for_element_class_property(_GR, _STAR, "fill")
    assert set(got) == {"starColour", "starWholeTablet"}


def test_the_property_match_excludes_a_property_the_attr_does_not_declare():
    """Accessor level: the star colour attr declares fill,color; it must not answer for
    others, including a colour-valued one a draft could really write. `font-size` left the
    undeclared list on 2026-09-21 (`starSize` declares height,width,font-size) and is asserted
    as that attr's own property."""
    f = db_lookup.attrs_for_element_class_property
    for prop in ("background-color", "border-color", "letter-spacing", "opacity"):
        assert f(_GR, _STAR, prop) == (), prop
    assert f(_GR, _STAR, "font-size") == ("starSize",)


def test_a_colour_valued_undeclared_property_does_not_route_at_fold_level():
    """Fold level, with a value that WOULD pass colour normalisation, so the assertion fails
    when only the property match is removed (a `15px` value fails normalisation and would
    hide the missing filter)."""
    attrs, rows, _ = _route(
        '<span class="sgs-google-reviews__star" style="background-color:#FBBC04">x</span>',
        "star", _GR)
    assert attrs == {}
    assert any(p == "background-color" and "(no_area_attr)" in r for p, r in rows)


# ---------------------------------------------------------------------------
# DEFECT 4: an ambiguous FIRST lookup is a reported skip, never a crash
# ---------------------------------------------------------------------------

_LABEL = '<span class="sgs-product-card__label" style="font-weight:700">x</span>'


def test_an_ambiguous_first_lookup_is_reported_not_raised():
    attrs, rows, seen = _route(_LABEL, "label", "sgs/product-card")
    assert attrs == {}
    reason = dict(rows)["font-weight"]
    assert "(no_area_attr; area attr ambiguous:" in reason
    assert "pillFontWeight" in reason and "tagFontWeight" in reason
    assert any(kw.get("reason", "").startswith("no_area_attr; area attr ambiguous")
               for st, kw in seen if st == "cross_node_gap_candidate")


def test_the_raise_outside_the_fold_is_unchanged():
    with pytest.raises(db_lookup.AmbiguousAreaAttrError):
        db_lookup.attr_for_area_property("sgs/product-card", "label", "font-weight")


def test_the_second_lookup_is_not_consulted_after_an_ambiguous_first(monkeypatch):
    """Consistent with the first lookup's own policy (never guess between contenders): a
    selector route that happened to name one of the contenders must not pick it."""
    called: list = []
    monkeypatch.setattr(fold_helpers, "_selector_route_attr",
                        lambda *a, **k: called.append(a) or (None, ""))
    _route(_LABEL, "label", "sgs/product-card")
    assert called == []


# ---------------------------------------------------------------------------
# Trace consistency: an inheriting tier is not a gap candidate in the trace either
# ---------------------------------------------------------------------------

def test_an_inheriting_tier_is_neither_reported_nor_traced_as_missing():
    _, rows, seen = _route(
        '<span class="sgs-google-reviews__star" style="color:#FBBC04">x</span>',
        "star", _GR)
    assert not [r for _, r in rows if "area_attr_tier_missing" in r]  # no tier row at all
    assert not [1 for st, kw in seen
                if st == "cross_node_gap_candidate" and kw.get("reason") == "area_attr_tier_missing"]


def test_a_real_tier_override_is_still_reported_and_traced():
    _, rows, seen = _route(
        '<span class="sgs-google-reviews__star">x</span>', "star", _GR,
        {".sgs-google-reviews__star": {"color": "#FBBC04"},
         "max-width: 767 :: .sgs-google-reviews__star": {"color": "#111111"}})
    assert any(p == "color" and "area_attr_tier_missing (starColourMobile)" in r for p, r in rows)
    assert any(kw.get("reason") == "area_attr_tier_missing"
               for st, kw in seen if st == "cross_node_gap_candidate")
