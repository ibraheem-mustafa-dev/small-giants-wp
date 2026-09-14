#!/usr/bin/env python3
"""test_sc_var_responsive_correlator.py -- integration coverage for the
Piece 1 <-> Piece 2 correlator. Self-test style (assert + PASS print),
matching this pipeline's existing convention -- no pytest.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sc_var_responsive_correlator import correlate, norm, _strip_key_suffix  # noqa: E402


def test_norm_matches_js_capture_src_shape():
    # These mirror the exact transforms `draft-responsive-probe.js`'s
    # in-page CAPTURE_SRC `norm()` performs: lowercase, strip to
    # alnum+space+£, collapse whitespace, cap at 300 chars. If this drifts
    # from the JS regex, every containment check silently stops matching.
    assert norm("  Book NOW! ") == "book now"
    assert norm("Tea & Coffee — £3.50") == "tea coffee £350"
    assert norm(None) == ""
    assert norm("") == ""
    long_text = "a" * 400
    assert len(norm(long_text)) == 300


def test_strip_key_suffix_handles_disambiguation_counter():
    assert _strip_key_suffix("div|reason one#1") == "reason one"
    assert _strip_key_suffix("div|reason one#12") == "reason one"
    assert _strip_key_suffix("span|no counter") == "no counter"


def test_end_to_end_realistic_card_grid_shape():
    """A 3-card sc-for card-grid, each card a separate boundary, one
    responsive element per card. Every element must land on its OWN card,
    never a sibling's -- this is the failure mode strict mode exists to
    prevent."""
    boundaries = [
        {
            "boundary_id": f"b{i}",
            "section_id": f"s{i}",
            "sc_var_hint": {"block": "card-grid", "confidence": 0.31, "source": "sc_var_count"},
            "sc_var_text": text,
        }
        for i, text in enumerate(
            [
                "Fast turnaround Same-day appointments available",
                "Free parking Convenient on-site parking for all patients",
                "Friendly staff Our team puts you at ease",
            ]
        )
    ]
    probe_elements = [
        {"key": "h3|same-day appointments available#1", "tag": "h3", "changed_properties": ["font-size"], "values_by_width": {"375": {"font-size": "16px"}, "1440": {"font-size": "20px"}}},
        {"key": "h3|convenient on-site parking for all patients#1", "tag": "h3", "changed_properties": ["padding-top"], "values_by_width": {"375": {"padding-top": "8px"}, "1440": {"padding-top": "16px"}}},
        {"key": "h3|our team puts you at ease#1", "tag": "h3", "changed_properties": ["margin-bottom"], "values_by_width": {"375": {"margin-bottom": "4px"}, "1440": {"margin-bottom": "12px"}}},
    ]
    result = correlate(boundaries, probe_elements)
    assert result["correlated_count"] == 3, result
    by_boundary = {c["boundary_id"]: c for c in result["correlated"]}
    assert by_boundary["b0"]["element_key"].startswith("h3|same-day")
    assert by_boundary["b1"]["element_key"].startswith("h3|convenient")
    assert by_boundary["b2"]["element_key"].startswith("h3|our team")
    assert result["unresolved_ambiguous_count"] == 0
    assert result["unresolved_no_match_count"] == 0


def test_boundary_missing_sc_var_text_is_excluded_not_crashed():
    # A boundary that has sc_var_hint but (edge case, e.g. an older cached
    # run predating this wiring) no sc_var_text must never crash the join --
    # it simply can't participate.
    boundaries = [{"boundary_id": "b1", "sc_var_hint": {"block": "card-grid"}}]
    probe_elements = [{"key": "p|anything#1", "tag": "p", "changed_properties": [], "values_by_width": {}}]
    result = correlate(boundaries, probe_elements)
    # It IS counted as hinted (that's a true fact about the boundary) but
    # qualifies for neither join strategy -- no sc_var_kind='for' +
    # structural fields, no sc_var_text -- so it never produces a match.
    assert result["boundaries_with_sc_var_hint"] == 1
    assert result["structural_boundaries"] == 0
    assert result["text_boundaries"] == 0
    assert result["correlated_count"] == 0


def test_negative_control_ambiguous_never_guesses():
    """The load-bearing test: when a Piece 2 element's text is genuinely
    contained in 2+ boundaries (near-identical repeated-card copy), strict
    mode must drop it rather than attach the value to an arbitrary sibling."""
    boundaries = [
        {"boundary_id": "b1", "sc_var_hint": {"block": "card-grid"}, "sc_var_text": "Book a table today"},
        {"boundary_id": "b2", "sc_var_hint": {"block": "card-grid"}, "sc_var_text": "Book a table now"},
    ]
    probe_elements = [{"key": "a|book a table#1", "tag": "a", "changed_properties": ["font-size"], "values_by_width": {}}]
    result = correlate(boundaries, probe_elements)
    assert result["correlated_count"] == 0
    assert result["unresolved_ambiguous_count"] == 1


if __name__ == "__main__":
    test_norm_matches_js_capture_src_shape()
    test_strip_key_suffix_handles_disambiguation_counter()
    test_end_to_end_realistic_card_grid_shape()
    test_boundary_missing_sc_var_text_is_excluded_not_crashed()
    test_negative_control_ambiguous_never_guesses()
    print("test_sc_var_responsive_correlator.py: PASS (5/5)")
