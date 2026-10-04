"""One fixture block per link and per bug-class rule (fixtures/plugin/src/blocks):
each `*-gap` block must raise exactly its rule's finding (the test turns red if
the rule is removed) and its `*-ok` twin, wired correctly, must not (the
negative control)."""
from __future__ import annotations

from wf_testkit import links_of, record


def test_fully_wired_block_has_no_finding(report):
    assert links_of(report, "sgs/ok") == set()
    assert record(report, "sgs/ok", "textColour")["class"] == "full"


def test_l2_control_missing(report):
    assert links_of(report, "sgs/l2-gap", "textColour") == {"L2"}


def test_l3_canvas_missing(report):
    assert links_of(report, "sgs/l3-gap", "textColour") == {"L3"}


def test_l3_tier_canvas_reads_one_device_tier(report):
    assert "L3-tier" in links_of(report, "sgs/l3tier-gap", "padding")
    assert "L3-tier" not in links_of(report, "sgs/l3tier-ok", "padding")


def test_l3_state_is_advisory_never_blocking(report):
    assert links_of(report, "sgs/l3state-gap", "textColourHover") == {"L3-state"}
    rec = record(report, "sgs/l3state-gap", "textColourHover")
    assert rec["class"] == "advisory"


def test_l4_frontend_never_reads(report):
    assert links_of(report, "sgs/l4-gap", "textColour") == {"L4"}


def test_l5_read_without_css_channel(report):
    assert links_of(report, "sgs/l5-gap", "textColour") == {"L5"}


def test_l6_custom_property_without_reader(report):
    assert links_of(report, "sgs/l6-gap", "textColour") == {"L6"}
    assert record(report, "sgs/l6-gap", "textColour")["unconsumed"] == ["--sgs-l6-unread"]
    assert links_of(report, "sgs/l6-ok", "textColour") == set()


def test_l7_editor_sets_a_different_custom_property(report):
    assert links_of(report, "sgs/l7-gap", "textColour") == {"L7"}
    assert links_of(report, "sgs/l7-ok", "textColour") == set()


def test_c1_child_conditional_reader(report):
    assert "C1" in links_of(report, "sgs/c1-gap", "gridItemBackground")
    assert "C1" not in links_of(report, "sgs/c1-ok", "gridItemBackground")


def test_s1_editor_css_shadows_zero_specificity_reader(report):
    assert "S1" in links_of(report, "sgs/s1-gap", "borderColour")
    assert "S1" not in links_of(report, "sgs/s1-ok", "borderColour")


def test_b1_scope_hash_omits_context(report):
    gap = [f for f in report["findings"] if f["block"] == "sgs/b1-gap" and f["link"] == "B1"]
    assert gap and "sgs/parentColour" in gap[0]["detail"]
    assert "B1" not in links_of(report, "sgs/b1-ok")


def test_b2_root_prefix_orphaned(report):
    assert links_of(report, "sgs/b2-gap", "fontSize") >= {"B2"}
    assert links_of(report, "sgs/b2-gap", "fontWeight") >= {"B2"}
    assert "B2" not in links_of(report, "sgs/b2-gap", "titleFontSize")
    assert "B2" not in links_of(report, "sgs/b2-ok")


def test_b3_missing_inner_depth(report):
    assert "B3" in links_of(report, "sgs/b3-gap", "cellBackground")
    assert "B3" not in links_of(report, "sgs/b3-ok", "cellBackground")


def test_findings_are_sorted_and_identified(report):
    keys = [(f["block"], f["attr"], f["link"]) for f in report["findings"]]
    assert keys == sorted(keys)
