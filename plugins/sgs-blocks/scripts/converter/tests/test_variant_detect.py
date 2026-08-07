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


def test_db_coupling_value_comes_from_the_declared_value_set(monkeypatch):
    """The matched value MUST come from the DB, not a literal. Point the declared-value
    set at a DIFFERENT set and the same draft modifier no longer matches.

    REPOINTED 2026-08-07: the source moved from `_variant_slots_map` to
    `declared_variant_values`. The test's INTENT is unchanged and still load-bearing —
    prove the value is read from the database rather than hardcoded — so it is aimed at
    the new source rather than deleted or loosened. (Mocking the old function would now
    prove nothing: the enum would still supply 'split', so the assertion would fail for
    a reason that has nothing to do with hardcoding.)
    """
    node = _node('<section class="sgs-hero sgs-hero--split"></section>')
    # Real DB: 'split' is a declared variant value -> matches.
    assert detect_variant_for_node(node, "sgs/hero")[1] == "split"
    # Mock the DB to NOT contain 'split' -> the modifier no longer matches.
    monkeypatch.setattr(variant_detect.db_lookup, "declared_variant_values",
                        lambda slug: frozenset({"standard"}))
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)


def test_variant_with_no_discriminating_slots_still_matches_its_modifier():
    """REGRESSION (2026-08-07). A variant defined by the ABSENCE of attrs has no
    `variant_slots` rows, and the value set used to be read from that table — so a draft
    that NAMED the variant outright fell through to the block default and cloned as
    something else, silently.

    `sgs/trust-bar.text-only` is the live case: it declares an empty discriminator set
    (its character IS the absence of the icon/image attrs), so before this fix
    `--text-only` returned None and the clone rendered as `icon-circle`. The
    discriminable sibling below is the positive control — it passed before AND after, so
    a failure here is about undiscriminable variants specifically, not about detection
    generally.
    """
    assert "text-only" not in {
        v for v, _s in variant_detect.db_lookup._variant_slots_map("sgs/trust-bar")
    }, "premise gone: text-only now HAS discriminating slots, so this no longer tests it"

    node = _node('<div class="sgs-trust-bar sgs-trust-bar--text-only"></div>')
    assert detect_variant_for_node(node, "sgs/trust-bar") == ("badgeStyle", "text-only")

    control = _node('<div class="sgs-trust-bar sgs-trust-bar--image-badge"></div>')
    assert detect_variant_for_node(control, "sgs/trust-bar") == ("badgeStyle", "image-badge")

    # Widening the value set must not make matching permissive: a modifier that names
    # no declared variant still yields None.
    bogus = _node('<div class="sgs-trust-bar sgs-trust-bar--not-a-variant"></div>')
    assert detect_variant_for_node(bogus, "sgs/trust-bar") == ("badgeStyle", None)
