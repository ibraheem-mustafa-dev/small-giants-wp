"""The per-area fold's SECOND, selector-keyed lookup (Eye Care reviews card, 2026-09-21).

Cause, proven before the fix (``test_area_css_skip_reporting.py`` header has the
reproduction): ``fold_helpers.route_area_css_to_block_attrs`` asks
``db_lookup.attr_for_area_property(block, area, prop)`` for a destination. That keys on
the draft's BEM element TOKEN against ``block_attributes.css_element``, directly or
through the ``slots`` alias groups. For ``sgs/google-reviews`` it misses twice over:

  * the draft's star row is ``rating`` and the block's star attr is ``css_element='star'``
    -- two DIFFERENT canonical slots (``rating``: aggregate/card-stars/header-stars/score/
    stars; ``star``: starColour/emptyStar), so neither the canonical-slot retry nor the
    sibling-alias broadcast reaches it;
  * the draft's request link is ``review-request-url`` and the block's attrs are
    ``css_element='write-review'``; no ``slots`` row names either.

Both attrs DO carry ``derived_selector`` (the classes they style), so a declaration on an
element whose own class is listed there, for a property the attr declares, routes to it.
``fold_helpers._selector_route_attr`` / ``db_lookup.attrs_for_element_class_property``.

Data half: ``attr-classification-overrides.json`` names the draft classes in
``derived_selector`` (and ``fill,color`` on ``starColour``: the block paints ``fill``, a
draft states the same fact as ``color``). Each half has its own negative control below.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_area_selector_route.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import shutil
import sqlite3
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.db import db_lookup
from converter.services import fold_helpers
from converter.services.fold_helpers import route_area_css_to_block_attrs

_SLUG = "sgs/google-reviews"
_STAR = "sgs-google-reviews__rating"
_LINK = "sgs-google-reviews__review-request-url"
_OVERRIDES = Path(__file__).resolve().parents[2] / "attr-classification-overrides.json"

_LINK_HTML = (
    f'<a class="{_LINK}" style="color:#1A73E8;background:#fff;'
    'border:1px solid #DADCE0;border-radius:20px">Write a review</a>'
)


def _route(html: str, area: str, block: str = _SLUG, rules: "dict | None" = None):
    """Run the live per-area fold on one element; return (attrs written, trace events)."""
    node = BeautifulSoup(html, "html.parser").find(True)
    attrs: dict = {}
    seen: list[tuple[str, dict]] = []
    route_area_css_to_block_attrs(
        node, area, block, attrs, rules or {},
        trace=lambda stage, **kw: seen.append((stage, kw)),
    )
    return attrs, seen


def _star(colour: str = "#FBBC04") -> str:
    return f'<span class="{_STAR}" style="color:{colour}">&#9733;&#9733;</span>'


def _clear_caches() -> None:
    # `block_attrs` reads the DB on every call; only the memoised accessors need clearing.
    for fn in (
        db_lookup.attrs_for_element_class_property,
        db_lookup.attr_for_area_property,
        db_lookup.attr_is_colour_role,
    ):
        fn.cache_clear()


# ---------------------------------------------------------------------------
# The declarations that were dropped now land on the attribute that styles them
# ---------------------------------------------------------------------------

def test_the_star_rows_colour_routes_to_star_colour():
    attrs, _ = _route(_star(), "rating")
    assert attrs == {"starColour": "#FBBC04"}


def test_the_request_links_text_colour_and_background_route_to_their_attrs():
    attrs, _ = _route(_LINK_HTML, "review-request-url")
    assert attrs == {"writeReviewColourText": "#1A73E8", "writeReviewColourBackground": "#fff"}


def test_what_the_block_has_no_attr_for_is_still_a_skip():
    """Honest, not greedy: the link's border and radius have NO destination on the block,
    so they are still reported (Rule 4), not forced onto the nearest colour attr."""
    _, seen = _route(_LINK_HTML, "review-request-url")
    missed = {kw["css_property"] for stage, kw in seen
              if stage == "cross_node_gap_candidate" and kw.get("reason") == "no_area_attr"}
    assert {"border-color", "border-width", "border-style", "border-radius"} <= missed
    assert "color" not in missed and "background-color" not in missed


def test_a_colour_is_written_the_way_every_other_colour_route_writes_it():
    """A draft `var(--x)` that resolves to no token and no literal is NOT written raw: it
    is reported, exactly as outer_box / content_band do (extract_token_or_hex)."""
    attrs, seen = _route(_star("var(--not-a-real-token)"), "rating")
    assert attrs == {}
    assert any(kw.get("reason") == "area_colour_unresolvable" for _, kw in seen)


def test_the_route_reaches_the_emitted_block_and_cancels_the_skip_rows():
    """End to end through convert_section (the real entry point), on the same draft the
    skip-reporting tests use: the attrs are in the markup and their rows are gone."""
    from converter.tests.test_area_css_skip_reporting import _pairs, _run

    result = _run()
    markup = result["block_markup"].replace(" ", "")
    assert '"starColour":"#FBBC04"' in markup
    assert '"writeReviewColourText":"#1A73E8"' in markup
    assert '"writeReviewColourBackground":"#fff"' in markup
    pairs = _pairs(result)
    assert (_STAR, "color") not in pairs
    assert (_LINK, "color") not in pairs
    assert (_LINK, "background-color") not in pairs
    assert (_LINK, "border-radius") in pairs  # no attr: still reported


# ---------------------------------------------------------------------------
# Tier handling is the fold's own, unchanged
# ---------------------------------------------------------------------------

def test_base_is_desktop_and_a_tier_without_an_override_is_not_reported_as_a_skip():
    """`starColour` has no Tablet/Mobile sibling. The base value applies at every width,
    so the tiers that merely inherit it are a transfer, not a non-transfer."""
    from converter.tests.test_area_css_skip_reporting import _run, _style_rows

    reasons = [g["reason"] for g in _style_rows(_run())]
    assert not [r for r in reasons if "tier Tablet" in r or "tier Mobile" in r]


def test_a_real_tier_override_the_block_has_no_attr_for_is_still_reported(monkeypatch):
    """The complement (and the control for the rule above): a Mobile value that DIFFERS
    from base and has nowhere to go is a genuine skip and is still reported."""
    rows: list[tuple[str, str]] = []
    monkeypatch.setattr(
        fold_helpers, "_report_area_skip",
        lambda child, block, area, prop, value, reason, tier="": rows.append((prop, tier)),
    )
    rules = {
        f".{_STAR}": {"color": "#FBBC04"},
        f"max-width: 767 :: .{_STAR}": {"color": "#111111"},
    }
    attrs, _ = _route(f'<span class="{_STAR}">x</span>', "rating", rules=rules)
    assert attrs == {"starColour": "#FBBC04"}
    assert ("color", "Mobile") in rows


def test_a_second_block_routes_through_the_same_lookup():
    """Universal, not google-reviews only: `sgs/testimonial.quoteFontSize` is selector-routed (`css_element='quote-text'`,
    `derived_selector` lists `.sgs-testimonial__text`) and its colour is a colour-role attr."""
    attrs, _ = _route(
        '<p class="sgs-testimonial__text">x</p>', "text", "sgs/testimonial",
        {".sgs-testimonial__text": {"font-size": "14px", "color": "#333333"}},
    )
    assert attrs == {"quoteFontSize": "14px", "quoteColour": "#333333"}


# ---------------------------------------------------------------------------
# It never changes a declaration that already routes
# ---------------------------------------------------------------------------

def test_the_second_lookup_is_not_consulted_for_a_declaration_the_first_routes(monkeypatch):
    """`sgs/hero` media `background-color` resolves through attr_for_area_property. Spy the
    selector lookup: it must not run for that property, and the emit must equal the emit
    with the selector lookup removed altogether."""
    html = '<div class="sgs-hero__media" style="background-color:#123456">x</div>'
    assert db_lookup.attr_for_area_property("sgs/hero", "media", "background-color")
    baseline, _ = _route(html, "media", "sgs/hero")
    assert baseline

    calls: list[str] = []
    real = fold_helpers._selector_route_attr

    def spy(child, block, prop):
        calls.append(prop)
        return real(child, block, prop)

    monkeypatch.setattr(fold_helpers, "_selector_route_attr", spy)
    with_spy, _ = _route(html, "media", "sgs/hero")
    assert "background-color" not in calls
    monkeypatch.setattr(fold_helpers, "_selector_route_attr", lambda *a, **k: (None, ""))
    without, _ = _route(html, "media", "sgs/hero")
    assert baseline == with_spy == without


# ---------------------------------------------------------------------------
# The DB accessor
# ---------------------------------------------------------------------------

def test_accessor_identity_property_and_state_rules():
    f = db_lookup.attrs_for_element_class_property
    assert f(_SLUG, _STAR, "color") == ("starColour",)
    assert f(_SLUG, _STAR, "fill") == ("starColour",)
    assert f(_SLUG, "sgs-google-reviews__star", "color") == ("starColour",)
    assert f(_SLUG, _LINK, "color") == ("writeReviewColourText",)
    assert f(_SLUG, _LINK, "background-color") == ("writeReviewColourBackground",)
    # A hover attr is never the base-tier answer (css_state), nor is a gradient sibling.
    for attrs in (f(_SLUG, _STAR, "color"), f(_SLUG, _LINK, "color")):
        assert not any(a.endswith("Hover") or a.endswith("Gradient") for a in attrs)
    # Identity half: an element class the attr does not list.
    assert f(_SLUG, "sgs-google-reviews__stars", "color") == ()
    # Property half: a property the attr does not declare.
    assert f(_SLUG, _STAR, "font-size") == ()
    assert f("", _STAR, "color") == () and f(_SLUG, "", "color") == () and f(_SLUG, _STAR, "") == ()


def test_the_accessor_returns_only_the_base_tier_attr_of_a_family():
    """`sgs/testimonial.quoteFontSize` has Tablet/Mobile-suffixed siblings elsewhere in the
    catalogue; the accessor must answer with the base attr alone."""
    assert db_lookup.attrs_for_element_class_property(
        "sgs/testimonial", "sgs-testimonial__text", "font-size") == ("quoteFontSize",)


# ---------------------------------------------------------------------------
# NEGATIVE CONTROLS -- each breaks exactly one half of the fix
# ---------------------------------------------------------------------------

def test_negative_control_without_the_second_lookup_the_drop_is_back(monkeypatch):
    """Code half: stub the selector lookup out and the star colour is dropped again."""
    monkeypatch.setattr(fold_helpers, "_selector_route_attr", lambda *a, **k: (None, ""))
    attrs, seen = _route(_star(), "rating")
    assert attrs == {}
    assert any(kw.get("reason") == "no_area_attr" for _, kw in seen)


def test_negative_control_the_identity_half_a_class_the_attr_does_not_list_routes_nothing():
    attrs, _ = _route(
        '<span class="sgs-google-reviews__stars" style="color:#FBBC04">x</span>', "stars")
    assert attrs == {}


def test_negative_control_the_property_half_an_unlisted_property_routes_nothing():
    attrs, _ = _route(
        f'<span class="{_STAR}" style="font-size:15px;letter-spacing:.1em">x</span>', "rating")
    assert attrs == {}


@pytest.fixture
def pre_seed_db(tmp_path, monkeypatch):
    """The DB as it stood BEFORE the seed: the three attrs' derived_selector without the
    draft's class, starColour declaring `fill` only. A copy, never the live file."""
    copy = tmp_path / "pre-seed.db"
    shutil.copy(db_lookup.SGS_DB, copy)
    conn = sqlite3.connect(copy)
    conn.execute(
        "UPDATE block_attributes SET derived_selector='.sgs-google-reviews__star', "
        "css_property='fill' WHERE block_slug=? AND attr_name='starColour'", (_SLUG,))
    conn.execute(
        "UPDATE block_attributes SET derived_selector='' WHERE block_slug=? "
        "AND attr_name IN ('writeReviewColourText','writeReviewColourBackground')", (_SLUG,))
    conn.commit()
    landed = conn.execute(
        "SELECT derived_selector, css_property FROM block_attributes "
        "WHERE block_slug=? AND attr_name='starColour'", (_SLUG,)).fetchone()
    conn.close()
    assert landed == (".sgs-google-reviews__star", "fill"), "the pre-seed break did not land"
    monkeypatch.setattr(db_lookup, "SGS_DB", copy)
    _clear_caches()
    yield copy
    _clear_caches()


def test_negative_control_without_the_seed_the_same_code_routes_nothing(pre_seed_db):
    """Data half: identical code, pre-seed DB -> nothing routes. Proves the seed, not the
    code alone, is what carries the draft's class and the fill/color equivalence."""
    assert _route(_star(), "rating")[0] == {}
    assert _route(_LINK_HTML, "review-request-url")[0] == {}


def test_negative_control_the_property_seed_alone(pre_seed_db):
    """Restore ONLY the selector (leave css_property='fill'): the class is now listed but
    a draft `color` still has no attr declaring it, so nothing routes."""
    conn = sqlite3.connect(pre_seed_db)
    conn.execute(
        "UPDATE block_attributes SET derived_selector='.sgs-google-reviews__star, "
        ".sgs-google-reviews__rating' WHERE block_slug=? AND attr_name='starColour'", (_SLUG,))
    conn.commit()
    conn.close()
    _clear_caches()
    assert _route(_star(), "rating")[0] == {}


# ---------------------------------------------------------------------------
# The seed is durable: the override file, not just the live DB, carries it
# ---------------------------------------------------------------------------

def _override_fields(attr: str) -> dict:
    data = json.loads(_OVERRIDES.read_text(encoding="utf-8"))
    rows = [e for e in data["entries"] if e["slug"] == _SLUG and e["attr"] == attr]
    assert len(rows) == 1, f"{attr}: expected one override entry, found {len(rows)}"
    return rows[0]["fields"]


def test_the_override_file_carries_the_seed_and_matches_the_live_rows():
    star = _override_fields("starColour")
    assert _STAR in star["derived_selector"] and star["css_property"] == "fill,color"
    for attr in ("writeReviewColourText", "writeReviewColourBackground"):
        assert _LINK in _override_fields(attr)["derived_selector"]
    live = db_lookup.block_attrs(_SLUG)
    assert live["starColour"]["derived_selector"] == star["derived_selector"]
    assert live["writeReviewColourText"]["derived_selector"] == \
        _override_fields("writeReviewColourText")["derived_selector"]
