"""test_variant_detect.py — variant from BEM modifier matched to variant_slots (real).

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_variant_detect.py
Design ref: .claude/plans/2026-06-23-stage2-recognition-design.md §2.
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.services import variant_detect
from converter.services.variant_detect import detect_variant_for_node


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def test_split_modifier_matches():
    node = _node('<section class="sgs-hero sgs-hero--split"></section>')
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", "split")


def test_video_modifier_matches():
    node = _node('<section class="sgs-hero sgs-hero--video"></section>')
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", "video")


def test_no_modifier_leaves_default():
    node = _node('<section class="sgs-hero"></section>')
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)


def test_non_variant_modifier_ignored():
    # --align-left / --desktop are NOT variant_values -> ignored, no variant.
    node = _node('<section class="sgs-hero sgs-hero--align-left sgs-hero--desktop"></section>')
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)


def test_two_distinct_variant_modifiers_is_ambiguous_not_guessed():
    node = _node('<section class="sgs-hero sgs-hero--split sgs-hero--video"></section>')
    # >=2 distinct variant matches -> None (never guess one), variant_attr still known.
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)


def test_non_variant_block_returns_none_none():
    # sgs/heading declares no variant attr.
    node = _node('<h1 class="sgs-heading sgs-heading--split">x</h1>')
    assert detect_variant_for_node(node, "sgs/heading") == (None, None)


def test_db_coupling_value_comes_from_variant_slots(monkeypatch):
    """The matched value MUST come from variant_slots, not a literal. Point the slot map
    at a DIFFERENT variant_value set and the same draft modifier no longer matches."""
    node = _node('<section class="sgs-hero sgs-hero--split"></section>')
    # Real DB: 'split' is a variant_value -> matches.
    assert detect_variant_for_node(node, "sgs/hero")[1] == "split"
    # Mock the DB to NOT contain 'split' -> the modifier no longer matches (proves the
    # value is read from the table, not hardcoded).
    monkeypatch.setattr(variant_detect.db_lookup, "_variant_slots_map",
                        lambda slug: (("standard", "backgroundImage"),))
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)
