"""Tests for the golden-aware guard reference (oracle/golden_expectations.py
+ guards 1 and 4).

The load-bearing property is that making the guards golden-aware must NOT be a
way to launder a real failure. Every "this no longer fires" case is paired with
a negative control proving the guard STILL fires when it should.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from oracle.golden_expectations import (
    expectation_for,
    expected_default_for,
    is_parent_constrained,
    _markup_expects_text,
)
from oracle.guards import guard_empty_section, guard_height_parity, guard_non_default_value


# ---------------------------------------------------------------------------
# The three "expects text" signals
# ---------------------------------------------------------------------------

class TestMarkupExpectsText:
    def test_self_closing_css_only_block_expects_no_text(self):
        """The sgs-info-box shape: one self-closing block, box CSS only."""
        markup = (
            '<!-- wp:sgs/info-box {"contentWidth":"480px",'
            '"style":{"color":{"background":"#ffffff"}}} /-->'
        )
        expects, _ = _markup_expects_text(markup, {})
        assert expects is False

    def test_child_inner_blocks_expect_text(self):
        markup = (
            '<!-- wp:sgs/info-box {"contentWidth":"480px"} -->\n'
            '<!-- wp:sgs/heading {"content":"Hi"} /-->\n'
            '<!-- /wp:sgs/info-box -->'
        )
        expects, why = _markup_expects_text(markup, {})
        assert expects is True
        assert "InnerBlocks" in why

    def test_raw_text_outside_comments_expects_text(self):
        markup = '<!-- wp:sgs/trust-bar /-->\nSome literal copy'
        expects, why = _markup_expects_text(markup, {})
        assert expects is True
        assert "raw text" in why

    def test_content_role_attr_expects_text(self):
        """A SELF-CLOSING block can still carry content via a content-role attr."""
        markup = '<!-- wp:sgs/testimonial {"quote":"It was great"} /-->'
        expects, why = _markup_expects_text(markup, {"sgs/testimonial": {"quote"}})
        assert expects is True
        assert "content-role attr" in why

    def test_content_role_attr_empty_value_does_not_count(self):
        markup = '<!-- wp:sgs/testimonial {"quote":""} /-->'
        expects, _ = _markup_expects_text(markup, {"sgs/testimonial": {"quote"}})
        assert expects is False


# ---------------------------------------------------------------------------
# Fail-strict when the expectation is unknown
# ---------------------------------------------------------------------------

class TestExpectationFailsStrict:
    def test_missing_golden_defaults_to_expects_text(self, tmp_path):
        """NEGATIVE CONTROL — an absent golden must NOT become the lenient case."""
        e = expectation_for("no-such-fixture", goldens_dir=tmp_path)
        assert e.expects_text is True
        assert e.golden_found is False

    def test_unreadable_golden_defaults_to_expects_text(self, tmp_path):
        (tmp_path / "broken.golden.json").write_text("{not json", encoding="utf-8")
        e = expectation_for("broken", goldens_dir=tmp_path)
        assert e.expects_text is True
        assert e.golden_found is False

    def test_golden_with_content_reports_expects_text(self, tmp_path):
        (tmp_path / "f.golden.json").write_text(json.dumps({
            "block_markup": (
                '<!-- wp:sgs/hero -->\n<!-- wp:sgs/heading {"content":"X"} /-->\n'
                '<!-- /wp:sgs/hero -->'
            )
        }), encoding="utf-8")
        assert expectation_for("f", goldens_dir=tmp_path).expects_text is True


# ---------------------------------------------------------------------------
# Guard 1 — golden-aware, but still fails when it should
# ---------------------------------------------------------------------------

class TestGuardEmptySectionGoldenAware:
    def test_empty_render_still_fails_when_golden_expects_text(self):
        """NEGATIVE CONTROL — the case the guard exists for MUST still fire."""
        r = guard_empty_section(element_present=True, inner_text_len=0, expects_text=True)
        assert r.passed is False

    def test_empty_render_passes_when_golden_expects_no_text(self):
        r = guard_empty_section(element_present=True, inner_text_len=0, expects_text=False)
        assert r.passed is True
        assert "expects NO text" in r.reason

    def test_absent_element_fails_regardless_of_expectation(self):
        """NEGATIVE CONTROL — expected-empty must not excuse a MISSING element."""
        r = guard_empty_section(element_present=False, inner_text_len=0, expects_text=False)
        assert r.passed is False

    def test_default_is_strict(self):
        """Omitting the flag keeps the original (strict) behaviour."""
        assert guard_empty_section(True, 0).passed is False


# ---------------------------------------------------------------------------
# Guard 4 — environment comparability
# ---------------------------------------------------------------------------

class TestParentConstrainedComposition:
    """A parent-constrained block cloned standalone is an invalid composition.

    sgs/accordion-item has NO style.css of its own; its border-bottom lives in
    accordion/style.css under a parent-scoped selector. Cloning a bare
    accordion-item deploys an orphan, so that border can never render — a
    fixture-composition fact, not a converter transfer failure.
    """

    def test_accordion_item_is_parent_constrained(self):
        is_child, parent = is_parent_constrained("sgs/accordion-item")
        assert is_child is True
        assert parent == "sgs/accordion"

    def test_tab_is_parent_constrained(self):
        """Not a one-block special case — 18 blocks carry a parent."""
        is_child, parent = is_parent_constrained("sgs/tab")
        assert is_child is True
        assert parent == "sgs/tabs"

    def test_top_level_block_is_not_constrained(self):
        """NEGATIVE CONTROL — a normal section block must NOT be flagged."""
        assert is_parent_constrained("sgs/container")[0] is False
        assert is_parent_constrained("sgs/hero")[0] is False

    def test_unknown_slug_is_not_constrained(self):
        assert is_parent_constrained("sgs/does-not-exist")[0] is False


class TestExpectedDefault:
    """Guard 3 needs the block's own default to catch coincidental matches."""

    def test_unknown_property_returns_none(self):
        """None is conservative — guard 3 skips rather than passing a cell."""
        assert expected_default_for("sgs/container", "no-such-property") is None

    def test_unknown_block_returns_none(self):
        assert expected_default_for("sgs/does-not-exist", "padding") is None

    def test_guard3_fires_when_draft_equals_default(self):
        """The coincidental-default false-win: draft == default -> UNVERIFIED.

        This is the shape that hid the Mama's product-card finding: the draft
        asked for 20px, the block's own fallback is 20px, so the clone looked
        faithful while transferring nothing.
        """
        assert guard_non_default_value("20px", "20px").passed is False

    def test_guard3_passes_when_draft_differs_from_default(self):
        assert guard_non_default_value("32px", "20px").passed is True

    def test_guard3_skips_on_unknown_default(self):
        """NEGATIVE CONTROL — unknown default must not be treated as a match."""
        assert guard_non_default_value("32px", None).passed is True


class TestDraftHiddenSections:
    """A display:none draft element's paint styles are not comparable."""

    def _row(self, selector, prop, value):
        class R:
            pass
        r = R()
        r.selector, r.property, r.value = selector, prop, value
        return r

    def test_display_none_marks_section_hidden(self):
        from oracle.batch_runner import _draft_hidden_sections
        sections = [{"section_id": "s1", "block_slug": "sgs/modal"}]
        rows = [self._row(".sgs-modal", "display", "none")]
        hidden = _draft_hidden_sections(sections, rows, {"s1": {"sgs-modal"}})
        assert hidden == {"s1"}

    def test_visible_section_is_not_hidden(self):
        """NEGATIVE CONTROL — a normal section must stay comparable."""
        from oracle.batch_runner import _draft_hidden_sections
        sections = [{"section_id": "s1", "block_slug": "sgs/hero"}]
        rows = [self._row(".sgs-hero", "display", "grid")]
        assert _draft_hidden_sections(sections, rows, {"s1": {"sgs-hero"}}) == set()

    def test_display_none_on_a_DIFFERENT_element_does_not_hide_the_section(self):
        """NEGATIVE CONTROL — must not over-fire from an unrelated selector."""
        from oracle.batch_runner import _draft_hidden_sections
        sections = [{"section_id": "s1", "block_slug": "sgs/hero"}]
        rows = [self._row(".sgs-other-thing", "display", "none")]
        assert _draft_hidden_sections(sections, rows, {"s1": {"sgs-hero"}}) == set()


class TestGuardHeightComparability:
    def test_non_comparable_reports_unmeasured_not_failed(self):
        r = guard_height_parity(244.0, 327.0, comparable=False)
        assert r.passed is True
        assert r.measured is False          # honestly NOT confirmed, never a pass
        assert "NON-COMPARABLE" in r.reason

    def test_comparable_divergence_still_fails(self):
        """NEGATIVE CONTROL — same-environment divergence MUST still fire."""
        r = guard_height_parity(244.0, 327.0, comparable=True)
        assert r.passed is False
        assert r.measured is True

    def test_default_is_comparable(self):
        """Existing same-environment callers are unchanged."""
        assert guard_height_parity(244.0, 327.0).passed is False
