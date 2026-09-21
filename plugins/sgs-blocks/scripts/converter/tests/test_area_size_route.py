"""The per-area fold's excluded width/height properties, honoured by the SELECTOR route only
when an attribute explicitly declares them for a named child element (review wave on
d160fe287, 2026-09-21, item 5).

Cause, reproduced before the fix: ``route_area_css_to_block_attrs`` excludes ``width``,
``height``, ``min-/max-`` variants outright (grid-area / track sizing is not element sizing),
so the Eye Care avatar's ``width:40px;height:40px`` and the request pill's ``min-height``
were dropped although the block has attrs that declare exactly those properties for exactly
those elements (``avatarSize`` height,width for the avatar; ``writeReviewMinHeight``).

Rules under test (all DB-driven, no block or class named in the code):
  * an attr qualifies only if its css_element is a NAMED child (not the root/wrapper domain),
    its layer does not own band/grid sizing, its role is ``layout``, its type can hold a length,
    and its own derived_selector names the element it says it styles;
  * the first lookup is untouched (a size prop is routed only when it found nothing or found the
    same attr);
  * an attr that lists several properties (``height,width``) holds ONE value: equal declarations
    write it, one declaration writes it, DIFFERENT declarations are reported naming both values;
  * a tier-object attr is written ``{<tierKey>: "<value with unit>"}`` and a ``number`` attr as
    number + ``<attr>Unit`` -- the existing per-tier / max-width per-slot mechanisms.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_area_size_route.py -q -p no:cacheprovider
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
_F = db_lookup.attrs_for_element_class_property


def _route(html: str, area: str, block: str = _GR, rules: "dict | None" = None):
    from converter.services import content_gap_collector as gap

    node = BeautifulSoup(html, "html.parser").find(True)
    attrs: dict = {}
    rows: list[tuple[str, str, str]] = []
    real_rec, real_note = gap.record_declaration_skip_candidate, gap.note_declaration_routed
    gap.record_declaration_skip_candidate = lambda **kw: rows.append((kw["prop"], kw["value"], kw["reason"]))
    gap.note_declaration_routed = lambda **kw: None
    try:
        route_area_css_to_block_attrs(node, area, block, attrs, rules or {}, trace=lambda *a, **k: None)
    finally:
        gap.record_declaration_skip_candidate, gap.note_declaration_routed = real_rec, real_note
    return attrs, rows


def _avatar(style: str) -> str:
    return f'<span class="sgs-google-reviews__avatar-colour" style="{style}">x</span>'


def _clear() -> None:
    for n in ("attrs_for_element_class_property", "attr_css_properties", "selector_class_elements",
              "attr_for_area_property", "tier_object_base", "box_family_for",
              "box_family_is_tier_shaped"):
        fn = getattr(db_lookup, n, None)
        if hasattr(fn, "cache_clear"):
            fn.cache_clear()


@pytest.fixture
def db_copy(tmp_path, monkeypatch):
    copy = tmp_path / "size.db"
    shutil.copy(db_lookup.SGS_DB, copy)
    monkeypatch.setattr(db_lookup, "SGS_DB", copy)
    _clear()
    yield copy
    _clear()


# --------------------------------------------------------------------------- routes

def test_equal_width_and_height_write_one_tier_object_value_with_its_unit():
    attrs, rows = _route(_avatar("width:40px;height:40px"), "avatar-colour")
    assert attrs["avatarSize"]["desktop"] == "40px"
    assert rows == []


def test_a_single_declared_property_writes_the_value():
    attrs, _ = _route(_avatar("width:40px"), "avatar-colour")
    assert attrs["avatarSize"]["desktop"] == "40px"


def test_a_mobile_override_lands_under_the_mobile_key():
    attrs, _ = _route(
        _avatar("width:40px;height:40px"), "avatar-colour",
        rules={".sgs-google-reviews__avatar-colour": {"width": "40px", "height": "40px"},
               "max-width: 767 :: .sgs-google-reviews__avatar-colour": {"width": "32px", "height": "32px"}})
    assert attrs["avatarSize"]["desktop"] == "40px" and attrs["avatarSize"]["mobile"] == "32px"


def test_different_width_and_height_are_reported_naming_both_never_picked():
    attrs, rows = _route(_avatar("width:40px;height:44px"), "avatar-colour")
    assert "avatarSize" not in attrs
    assert sorted(p for p, _, _ in rows) == ["height", "width"]
    for _, _, reason in rows:
        assert "area_multi_property_conflict" in reason
        assert "height: 44px" in reason and "width: 40px" in reason


def test_a_min_height_on_the_element_whose_attr_is_the_area_itself_routes():
    """`writeReviewMinHeight` is single-property and its element is the area: the FIRST
    lookup finds it, so this proves the size route accepts a first-lookup hit that is the
    same attr rather than leaving it silently excluded."""
    attrs, rows = _route('<a class="sgs-google-reviews__write-review" style="min-height:44px">x</a>',
                         "write-review")
    assert attrs["writeReviewMinHeight"]["desktop"] == "44px"
    assert rows == []


def test_a_string_attr_on_another_block_routes_the_same_way():
    """`sgs/product-card.imageHeight` (string, css:height on the image element; render.php feeds
    it to `--sgs-product-card-image-height`, consumed as the image's height)."""
    attrs, _ = _route('<div class="sgs-product-card__image" style="height:220px">x</div>',
                      "image", "sgs/product-card")
    assert attrs == {"imageHeight": "220px"}


def test_a_multi_property_attr_that_is_not_a_size_also_reports_a_conflict():
    """The same one-value rule for a non-size attr: `starColour` paints fill AND color."""
    attrs, rows = _route('<span class="sgs-google-reviews__star" style="color:#111111;fill:#222222">x</span>',
                         "star")
    assert "starColour" not in attrs
    assert {p for p, _, r in rows if "area_multi_property_conflict" in r} == {"color", "fill"}
    attrs, _ = _route('<span class="sgs-google-reviews__star" style="color:#111111;fill:#111111">x</span>', "star")
    assert attrs == {"starColour": "#111111"}


def test_a_number_attr_is_written_as_a_number_the_way_the_max_width_slot_does(db_copy):
    conn = sqlite3.connect(db_copy)
    conn.execute("UPDATE block_attributes SET attr_type='number', tier_shape=NULL "
                 "WHERE block_slug=? AND attr_name='avatarSize'", (_GR,))
    conn.commit()
    conn.close()
    _clear()
    attrs, _ = _route(_avatar("width:40px;height:40px"), "avatar-colour")
    assert attrs["avatarSize"] == 40


# --------------------------------------------------------------------------- what stays excluded

def test_a_root_wrapper_attr_is_never_an_element_size():
    """`maxWidth` is the block ROOT's (css_element wrapper); a max-width on a class it lists
    stays excluded, not routed. (Whether the report also names it is the existing
    declarative-route suppression, unchanged here.)"""
    assert _F(_GR, "sgs-google-reviews__max", "max-width", True) == ()
    attrs, _ = _route('<div class="sgs-google-reviews__max" style="max-width:800px">x</div>', "max")
    assert attrs == {}


def test_a_content_band_width_attr_is_never_an_element_size():
    assert _F("sgs/container", "sgs-container__content", "width", True) == ()


def test_a_boolean_toggle_that_lists_width_is_not_a_size():
    """`sgs/product-card.tagFullWidth` is a boolean whose css_property is width."""
    assert "tagFullWidth" not in _F("sgs/product-card", "sgs-product-card__tag", "width", True)
    assert db_lookup.attr_for_area_property("sgs/product-card", "tag", "width") == "tagFullWidth"  # the premise
    attrs, _ = _route('<span class="sgs-product-card__tag" style="width:100%">x</span>', "tag", "sgs/product-card")
    assert "tagFullWidth" not in attrs


def test_a_selector_list_derived_from_a_property_suffix_is_not_an_element_class():
    """`sgs/responsive-logo.maxWidth` lists `.sgs-responsive-logo__max`, a name derived from the
    property suffix; it does not name the `image` element the attr says it styles."""
    assert _F("sgs/responsive-logo", "sgs-responsive-logo__max", "max-width", True) == ()


def test_grid_area_and_display_stay_excluded():
    _, rows = _route('<div class="sgs-google-reviews__no-such-element" style="grid-area:a;display:grid">x</div>',
                     "no-such-element")
    assert {p for p, _, _ in rows} == {"grid-area", "display"}


def test_every_qualifying_attr_across_the_catalogue_is_google_reviews_or_the_proven_product_card_one():
    """The census, as a test: query the DB for every (block, attr, property) the size route can
    reach for a class the block lists. A new block appearing here is a NEW route to prove, not a
    silent one."""
    conn = sqlite3.connect(db_lookup.SGS_DB)
    reach: set[tuple[str, str]] = set()
    sizes = {"width", "height", "max-width", "min-width", "max-height", "min-height"}
    for slug, attr, sel in conn.execute(
            "SELECT block_slug, attr_name, derived_selector FROM block_attributes "
            "WHERE css_property IS NOT NULL AND css_property != '' "
            "AND derived_selector IS NOT NULL AND derived_selector != ''").fetchall():
        for prop in set(db_lookup.attr_css_properties(slug, attr)) & sizes:
            for cls in (c.strip().lstrip(".") for c in sel.split(",")):
                if attr in _F(slug, cls, prop, True):
                    reach.add((slug, attr))
    conn.close()
    assert {s for s, _ in reach} == {_GR, "sgs/product-card"}, sorted(reach)
    assert {a for s, a in reach if s == "sgs/product-card"} == {"imageHeight"}


def _plant(db, name, prop="height"):
    conn = sqlite3.connect(db)
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, css_property, css_element, "
        "role) VALUES (?, ?, 'string', ?, 'avatar-colour', 'layout')", (_GR, name, prop))
    conn.commit()
    conn.close()
    _clear()


def test_a_different_first_lookup_attr_is_left_alone_not_overridden_by_the_size_route(db_copy):
    """The first lookup finds `planted` for (avatar-colour, height); the size route would pick
    `avatarSize`. The first lookup wins the element (unchanged): the property stays excluded, and
    the size route must not write a second attr for the same declaration."""
    _plant(db_copy, "plantedAvatarHeight")
    attrs, _ = _route(_avatar("height:40px"), "avatar-colour")
    assert "avatarSize" not in attrs


def test_a_contested_first_lookup_is_reported_never_size_routed(db_copy):
    """Two attrs contend for (avatar-colour, height): the first lookup refuses to pick, and the
    size route must not pick for it."""
    _plant(db_copy, "plantedAvatarHeightA")
    _plant(db_copy, "plantedAvatarHeightB")
    with pytest.raises(db_lookup.AmbiguousAreaAttrError):
        db_lookup.attr_for_area_property(_GR, "avatar-colour", "height")
    attrs, rows = _route(_avatar("height:40px"), "avatar-colour")
    assert attrs == {}
    assert any("area attr ambiguous" in r or "excluded" in r for _, _, r in rows)


def _plant_sizing(db, name, attr_type="string", layer=None):
    """An attr that is eligible in EVERY respect but the one under test: layout role, named
    child element, selector list naming that element."""
    conn = sqlite3.connect(db)
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, css_property, css_element, "
        "role, css_layer, derived_selector) VALUES (?, ?, ?, 'height', 'avatar-colour', 'layout', ?, "
        "'.sgs-google-reviews__avatar-colour')", (_GR, name, attr_type, layer))
    conn.commit()
    conn.close()
    _clear()


_AVATAR_CLS = "sgs-google-reviews__avatar-colour"


def test_the_fixture_attr_is_eligible_when_nothing_is_wrong_with_it(db_copy):
    """Positive control for the two tests below: without it they could pass for a fixture that
    was never eligible."""
    _plant_sizing(db_copy, "plantedOk")
    assert "plantedOk" in _F(_GR, _AVATAR_CLS, "height", True)


def test_a_boolean_attr_is_never_a_size(db_copy):
    _plant_sizing(db_copy, "plantedBool", attr_type="boolean")
    assert "plantedBool" not in _F(_GR, _AVATAR_CLS, "height", True)
    assert "plantedBool" in _F(_GR, _AVATAR_CLS, "height")  # the plain accessor still lists it


@pytest.mark.parametrize("layer", ["CONTENT", "GRID", "GRID_AREA"])
def test_a_band_or_grid_layer_attr_is_never_an_element_size(db_copy, layer):
    _plant_sizing(db_copy, "plantedLayer", layer=layer)
    assert "plantedLayer" not in _F(_GR, _AVATAR_CLS, "height", True)
    assert "plantedLayer" in _F(_GR, _AVATAR_CLS, "height")


# --------------------------------------------------------------------------- negative controls

def test_negative_control_without_the_sizing_flag_the_avatar_is_dropped_again(monkeypatch):
    real = fold_helpers._selector_route_attr
    monkeypatch.setattr(fold_helpers, "_selector_route_attr",
                        lambda c, b, p, a, element_sizing=False: real(c, b, p, a, False)
                        if not element_sizing else (None, ""))
    attrs, rows = _route(_avatar("width:40px;height:40px"), "avatar-colour")
    assert "avatarSize" not in attrs
    assert {p for p, _, _ in rows} == {"width", "height"}


def test_negative_control_without_the_conflict_check_the_first_value_wins(monkeypatch):
    real = fold_helpers._multi_property_values
    monkeypatch.setattr(fold_helpers, "_multi_property_values",
                        lambda b, a, p, base, tab, mob: ((base.get(p), tab.get(p), mob.get(p)), ""))
    attrs, _ = _route(_avatar("width:40px;height:44px"), "avatar-colour")
    assert real is not fold_helpers._multi_property_values
    assert attrs["avatarSize"]["desktop"] in ("40px", "44px")  # a silent pick: the defect


def test_negative_control_the_root_guard_alone_keeps_a_wrapper_attr_out(db_copy, monkeypatch):
    """Take the DB's root-domain guard away and a wrapper max-width would route."""
    conn = sqlite3.connect(db_copy)
    # A root attr whose selector list DOES name its element (so only the root guard can refuse it).
    conn.execute("UPDATE block_attributes SET derived_selector='.sgs-google-reviews__wrapper' "
                 "WHERE block_slug=? AND attr_name='maxWidth'", (_GR,))
    conn.commit()
    conn.close()
    _clear()
    assert _F(_GR, "sgs-google-reviews__wrapper", "max-width", True) == ()
    monkeypatch.setattr(db_lookup, "_root_domain_element_clause", lambda slug, column="css_element": ("0", []))
    _clear()
    assert _F(_GR, "sgs-google-reviews__wrapper", "max-width", True) == ("maxWidth",)


def test_negative_control_the_named_element_rule_alone_refuses_a_property_suffix_selector(db_copy, monkeypatch):
    """With the root guard removed, `.sgs-google-reviews__max` (a name derived from the property)
    is still refused, because it does not name the `wrapper` element the attr says it styles."""
    monkeypatch.setattr(db_lookup, "_root_domain_element_clause", lambda slug, column="css_element": ("0", []))
    _clear()
    assert _F(_GR, "sgs-google-reviews__max", "max-width", True) == ()
