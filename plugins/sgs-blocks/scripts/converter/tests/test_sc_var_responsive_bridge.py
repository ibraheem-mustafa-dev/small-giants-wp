"""test_sc_var_responsive_bridge.py — wiring proof for
``converter.services.sc_var_responsive_bridge.bridge_record``.

D1061 follow-up (2026-09-15): ``sc_var_responsive_correlator.py`` joins a
classless boundary's block-identity guess to Piece 2's measured responsive
CSS values, but its own docstring named turning that joined record into a
real block attribute as separate follow-up work. This is the wiring proof —
these tests assert the LOOKUP + SHAPE behaviour (DB-driven property
resolution, tier-object vs flat-box placement, strict never-guess dropping),
not the correlator's own join logic (covered by its own self-test).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_sc_var_responsive_bridge.py -q --import-mode=importlib
"""
from __future__ import annotations

import pytest

from converter.db import db_lookup
from converter.services.sc_var_responsive_bridge import bridge_record

_CATALOGUE = {
    "sgs/card-grid": {
        "cardPadding": {
            "css_property": "padding", "css_element": "body",
            "box_family": "cardPadding", "tier_shape": "tier_object",
        },
        "cardBorderWidth": {
            "css_property": "border-width", "css_element": "item",
            "box_family": "cardBorderWidth", "tier_shape": None,
        },
    },
}


@pytest.fixture(autouse=True)
def _fake_catalogue(monkeypatch):
    monkeypatch.setattr(db_lookup, "box_css_catalogue", lambda slug: _CATALOGUE.get(slug, {}))


def test_real_d1061_shape_places_tier_object_padding():
    """The one real, live-verified correlator hit (D1061): sgs/card-grid's
    per-card padding-top measured 28px@375 / 34px@768 on the Ward End Eye
    Care draft. Must land in cardPadding's {desktop,tablet,mobile} tier-
    object shape, side-keyed, never a flat scalar."""
    record = {
        "sc_var_hint": {"block": "sgs/card-grid", "confidence": 0.37},
        "element_key": "div|01 fast turnaround same-day appointments#1",
        "changed_properties": ["padding-top"],
        "values_by_width": {"375": {"padding-top": "28px"}, "768": {"padding-top": "34px"}},
    }
    writes, gaps = bridge_record(record)
    assert writes == {"cardPadding": {"mobile": {"top": "28px"}, "tablet": {"top": "34px"}}}
    assert gaps == []


def test_no_sc_var_hint_reports_not_guesses():
    writes, gaps = bridge_record({"changed_properties": ["padding-top"], "values_by_width": {}})
    assert writes == {}
    assert gaps[0]["reason"] == "no_block_slug"


def test_unknown_block_reports_no_catalogue():
    writes, gaps = bridge_record({
        "sc_var_hint": {"block": "sgs/does-not-exist"},
        "element_key": "k",
        "changed_properties": ["padding-top"],
        "values_by_width": {"375": {"padding-top": "10px"}},
    })
    assert writes == {}
    assert gaps[0]["reason"] == "no_catalogue"


def test_unmatched_property_is_a_gap_not_a_guess():
    """NEGATIVE CONTROL: a changed property with no matching attr for this
    block must be dropped and reported, never guessed at."""
    record = {
        "sc_var_hint": {"block": "sgs/card-grid"},
        "element_key": "k",
        "changed_properties": ["font-size"],
        "values_by_width": {"375": {"font-size": "14px"}},
    }
    writes, gaps = bridge_record(record)
    assert writes == {}
    assert gaps == [{
        "reason": "no_match", "block": "sgs/card-grid", "css_property": "font-size",
        "candidate_count": 0, "element_key": "k",
    }]


def test_flat_box_attr_places_base_tier_only():
    record = {
        "sc_var_hint": {"block": "sgs/card-grid"},
        "element_key": "k",
        "changed_properties": ["border-top-width"],
        "values_by_width": {"1440": {"border-top-width": "2px"}, "375": {"border-top-width": "1px"}},
    }
    writes, gaps = bridge_record(record)
    assert writes == {"cardBorderWidth": {"top": "2px"}}
    assert gaps == []


def test_unresolved_box_side_is_a_gap_not_a_corrupting_scalar():
    """NEGATIVE CONTROL: a box-family attr matches by shorthand property name,
    but this bridge has no side mapping for it. Writing the raw value in as a
    flat scalar would corrupt the {top,right,bottom,left} shape the PHP side
    expects — must gap, never write."""
    record = {
        "sc_var_hint": {"block": "sgs/card-grid"},
        "element_key": "k",
        "changed_properties": ["border-width"],
        "values_by_width": {"1440": {"border-width": "2px"}},
    }
    writes, gaps = bridge_record(record)
    assert writes == {}
    assert gaps == [{
        "reason": "unresolved_box_side", "block": "sgs/card-grid",
        "css_property": "border-width", "attr_name": "cardBorderWidth",
        "element_key": "k",
    }]
