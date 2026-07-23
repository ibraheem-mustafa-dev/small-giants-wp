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

from oracle.golden_expectations import expectation_for, _markup_expects_text
from oracle.guards import guard_empty_section, guard_height_parity


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
