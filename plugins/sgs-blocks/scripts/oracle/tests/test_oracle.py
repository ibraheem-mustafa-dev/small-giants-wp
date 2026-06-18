"""
oracle.tests.test_oracle — F3 LANDED oracle engine unit tests.

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md §7 (acceptance criteria)

Tests (all synthetic — NO network, NO browser, deterministic):
1. Guard 1 (empty-section) fails correctly:
   a. element not present → GUARD-FAIL
   b. element present, inner_text_len == 0 → GUARD-FAIL
   c. element present, inner_text_len > 0 → passes
2. Guard 2 (element-present) fails correctly:
   - element_present False → GUARD-FAIL
3. Guard 3 (non-default-value) fires at cell level → UNVERIFIED:
   - draft_value == expected_default → UNVERIFIED
   - expected_default None → treated as non-default (not UNVERIFIED)
4. Guard 4 (height-parity) fails correctly:
   - |rendered - draft| > tolerance → GUARD-FAIL
   - one height None → passes (skipped)
5. Precedence ordering:
   - NOT-RENDERED > GUARD-FAIL > UNVERIFIED > WRITTEN-not-LANDED > LANDED
   - A cell that would satisfy multiple is awarded the highest-precedence verdict.
6. LANDED: synthetic non-default, computed == draft → LANDED.
7. WRITTEN-not-LANDED: computed present but != draft → WRITTEN-not-LANDED.
8. Colour tolerance: ΔE ≤ 1 → LANDED; ΔE > 1 → WRITTEN-not-LANDED.
9. Length tolerance: ≤ 1px → LANDED; > 1px → WRITTEN-not-LANDED; non-px → UNVERIFIED (FIX-M).
10. Contract schema: LandedReport.as_dict() has the EXACT §6 keys.
11. Tier vocabulary: matches F2 exactly (Base|Mobile|Tablet|Desktop|Other:<cond>).
12. Reuse verification: _parse_px + _colour_delta imported from parity2;
    BEM-matcher symbols NOT imported.
13. MR-2 comparison logic: _normalised_markup_equal works on WP block markup (FIX-H).
14. MR-2 coverage line emitted (live DB skipped if unavailable).
15. FIX-A: colour/length classifiers do not over-match (background-image etc.).
16. FIX-B: per-section missing element with page loaded → GUARD-FAIL, not NOT-RENDERED.
17. FIX-C: zero-cell rendered section → one synthetic UNVERIFIED coverage cell.
18. FIX-D: text-align equivalence + lossy-serialisation props → UNVERIFIED.
19. FIX-E: written=False cell → UNVERIFIED even when computed == draft.
20. FIX-F: named/keyword draft colours normalised; unparseable → UNVERIFIED.
21. FIX-G: height tolerance relative-OR-absolute; None height = coverage gap.
22. FIX-I: tier-format validation at CellInput construction.
23. FIX-K: mixed-section plain summary is count-based + accurate (no "all cells").
24. FIX-L: run_canary_proof driver emits §6 artefact from a synthetic probe dict.
25. FIX-M: unparseable length (%/calc/vw/auto) → UNVERIFIED, not WRITTEN-not-LANDED.

Style mirrors ledger/tests/test_declare_input.py: pytest, type hints, no network.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional

import pytest

# ---------------------------------------------------------------------------
# Path setup — support running both as 'pytest scripts/oracle/tests/' and
# 'python -m pytest' from the package root.
# ---------------------------------------------------------------------------

_SCRIPTS_DIR = Path(__file__).parents[3]  # plugins/sgs-blocks/scripts/
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))


# ---------------------------------------------------------------------------
# Imports under test
# ---------------------------------------------------------------------------

from oracle.models import (
    Verdict,
    CellInput,
    SectionGuards,
    RenderedObservation,
    CellResult,
    SectionResult,
    LandedReport,
    GuardResult,
)
from oracle.guards import (
    guard_empty_section,
    guard_element_present,
    guard_non_default_value,
    guard_height_parity,
    HEIGHT_TOLERANCE_PX,
    HEIGHT_TOLERANCE_FRAC,
)
from oracle.verdict import (
    compute_section_result,
    compute_report,
    _values_match,
    _compare_values,
    _is_colour_prop,
    _is_length_prop,
    _Match,
)
from oracle.metamorphic import _normalised_markup_equal, mr2_coverage_summary


# ---------------------------------------------------------------------------
# Helpers for building synthetic observations
# ---------------------------------------------------------------------------

def _obs(
    section_id: str = "1",
    block_slug: str = "sgs/hero",
    element_selector: str = ".wp-block-sgs-hero",
    element_present: bool = True,
    inner_text_len: int = 50,
    rendered_height_px: Optional[float] = 400.0,
    draft_height_px: Optional[float] = 400.0,
    cells: Optional[list[CellInput]] = None,
    page_loaded: bool = True,
) -> RenderedObservation:
    return RenderedObservation(
        section_id=section_id,
        block_slug=block_slug,
        element_selector=element_selector,
        element_present=element_present,
        inner_text_len=inner_text_len,
        rendered_height_px=rendered_height_px,
        draft_height_px=draft_height_px,
        cells=cells or [],
        page_loaded=page_loaded,
    )


def _cell(
    property: str = "background-color",
    tier: str = "Base",
    draft_value: str = "#2D6A4F",
    computed_value: Optional[str] = "#2D6A4F",
    expected_default: Optional[str] = None,
    written: bool = True,
) -> CellInput:
    return CellInput(
        property=property,
        tier=tier,
        draft_value=draft_value,
        computed_value=computed_value,
        expected_default=expected_default,
        written=written,
    )


# ===========================================================================
# 1. Guard 1 (empty-section) tests
# ===========================================================================

class TestGuard1EmptySection:
    def test_element_not_present_fails(self):
        result = guard_empty_section(element_present=False, inner_text_len=0)
        assert not result.passed
        assert "Guard 1" in result.reason

    def test_element_present_but_no_text_fails(self):
        result = guard_empty_section(element_present=True, inner_text_len=0)
        assert not result.passed
        assert "empty" in result.reason.lower()

    def test_element_present_with_text_passes(self):
        result = guard_empty_section(element_present=True, inner_text_len=10)
        assert result.passed

    def test_guard1_fires_guard_fail_verdict(self):
        """An observation with inner_text_len == 0 but element present
        should yield GUARD-FAIL on all cells."""
        obs = _obs(
            element_present=True,
            inner_text_len=0,
            cells=[_cell(draft_value="#2D6A4F", expected_default=None)],
        )
        result = compute_section_result(obs)
        assert all(c.verdict == Verdict.GUARD_FAIL for c in result.cells)
        assert not result.guards.empty

    def test_element_absent_with_page_loaded_is_guard_fail(self):
        """FIX-B: element_present=False but page LOADED → GUARD-FAIL, NOT NOT-RENDERED.

        A single section's block element being absent while the page loaded is an
        element-present guard failure (guard 2), not a whole-page render failure.
        """
        obs = _obs(
            element_present=False,
            inner_text_len=0,
            page_loaded=True,
            cells=[_cell()],
        )
        result = compute_section_result(obs)
        assert all(c.verdict == Verdict.GUARD_FAIL for c in result.cells)
        assert not result.guards.element


# ===========================================================================
# 2. Guard 2 (element-present) tests
# ===========================================================================

class TestGuard2ElementPresent:
    def test_element_absent_fails(self):
        result = guard_element_present(
            element_present=False, element_selector=".wp-block-sgs-hero"
        )
        assert not result.passed
        assert ".wp-block-sgs-hero" in result.reason

    def test_element_present_passes(self):
        result = guard_element_present(
            element_present=True, element_selector=".wp-block-sgs-hero"
        )
        assert result.passed


# ===========================================================================
# 3. Guard 3 (non-default-value) — cell-level → UNVERIFIED
# ===========================================================================

class TestGuard3NonDefaultValue:
    def test_draft_equals_default_fails(self):
        """draft == default → guard fails → UNVERIFIED (not a transfer fail)."""
        result = guard_non_default_value(
            draft_value="16px", expected_default="16px"
        )
        assert not result.passed
        assert "UNVERIFIED" in result.reason

    def test_draft_equals_default_case_insensitive(self):
        """Comparison is case-insensitive + stripped."""
        result = guard_non_default_value(
            draft_value=" #FFFFFF ", expected_default="#ffffff"
        )
        assert not result.passed

    def test_draft_differs_from_default_passes(self):
        result = guard_non_default_value(
            draft_value="#2D6A4F", expected_default="#ffffff"
        )
        assert result.passed

    def test_none_default_skips_guard(self):
        """expected_default None → guard skipped → treated as non-default."""
        result = guard_non_default_value(draft_value="16px", expected_default=None)
        assert result.passed

    def test_guard3_yields_unverified_verdict(self):
        """A cell where draft_value == expected_default gets UNVERIFIED, not LANDED."""
        obs = _obs(
            element_present=True,
            inner_text_len=50,
            cells=[
                _cell(
                    property="font-size",
                    tier="Base",
                    draft_value="16px",
                    computed_value="16px",      # matches draft — but also equals default
                    expected_default="16px",    # same as draft → UNVERIFIED
                )
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED

    def test_guard3_does_not_fail_section(self):
        """Guard 3 fires only at cell level — section guards show True for the
        summary non_default field reflecting the mixed state."""
        obs = _obs(
            cells=[
                _cell(draft_value="0px", computed_value="0px", expected_default="0px"),
                _cell(property="color", draft_value="#2D6A4F", computed_value="#2D6A4F", expected_default=None),
            ]
        )
        result = compute_section_result(obs)
        # First cell: UNVERIFIED; second cell: LANDED
        assert result.cells[0].verdict == Verdict.UNVERIFIED
        assert result.cells[1].verdict == Verdict.LANDED


# ===========================================================================
# 4. Guard 4 (height-parity) tests
# ===========================================================================

class TestGuard4HeightParity:
    def test_large_delta_fails(self):
        """Rendered height differs by more than tolerance."""
        rendered = 100.0
        draft = rendered + HEIGHT_TOLERANCE_PX + 1.0
        result = guard_height_parity(
            rendered_height_px=rendered, draft_height_px=draft
        )
        assert not result.passed
        assert "GUARD-FAIL" in result.reason

    def test_within_tolerance_passes(self):
        result = guard_height_parity(
            rendered_height_px=400.0, draft_height_px=400.0 + HEIGHT_TOLERANCE_PX
        )
        assert result.passed

    def test_none_rendered_skips(self):
        result = guard_height_parity(
            rendered_height_px=None, draft_height_px=400.0
        )
        assert result.passed

    def test_none_draft_skips(self):
        result = guard_height_parity(
            rendered_height_px=400.0, draft_height_px=None
        )
        assert result.passed

    def test_both_none_skips(self):
        result = guard_height_parity(
            rendered_height_px=None, draft_height_px=None
        )
        assert result.passed

    def test_height_guard_fires_guard_fail_verdict(self):
        """A section with a large height delta yields GUARD-FAIL on all cells."""
        obs = _obs(
            element_present=True,
            inner_text_len=100,
            rendered_height_px=100.0,
            draft_height_px=500.0,   # delta = 400px >> tolerance
            cells=[_cell()],
        )
        result = compute_section_result(obs)
        assert all(c.verdict == Verdict.GUARD_FAIL for c in result.cells)
        assert not result.guards.height


# ===========================================================================
# 5. Precedence ordering tests
# ===========================================================================

class TestPrecedence:
    def test_not_rendered_beats_everything(self):
        """FIX-B: NOT-RENDERED fires ONLY when the whole PAGE failed to load.

        page_loaded=False overrides every other signal — even a present element
        with content and matching cells reports NOT-RENDERED.
        """
        obs = _obs(
            page_loaded=False,
            element_present=True,
            inner_text_len=100,
            cells=[
                # This cell would be LANDED if the page had loaded.
                _cell(draft_value="#2D6A4F", computed_value="#2D6A4F", expected_default=None),
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.NOT_RENDERED

    def test_page_loaded_false_overrides_guard_fail(self):
        """page_loaded=False short-circuits to NOT-RENDERED before section guards."""
        obs = _obs(
            page_loaded=False,
            element_present=False,   # would be GUARD-FAIL if page loaded
            inner_text_len=0,
            cells=[_cell()],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.NOT_RENDERED

    def test_guard_fail_beats_unverified(self):
        """Empty section (guard 1 fail) beats the cell-level guard 3 unverified."""
        obs = _obs(
            element_present=True,
            inner_text_len=0,      # guard 1 fires → GUARD-FAIL at section level
            cells=[
                _cell(draft_value="16px", computed_value="16px", expected_default="16px"),
                # ^ without the guard 1 fail this would be UNVERIFIED
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.GUARD_FAIL

    def test_guard_fail_beats_written_not_landed(self):
        """Height divergence (guard 4 fail) beats computed-mismatch."""
        obs = _obs(
            element_present=True,
            inner_text_len=100,
            rendered_height_px=50.0,
            draft_height_px=500.0,  # guard 4 fires
            cells=[
                _cell(draft_value="#2D6A4F", computed_value="#FFFFFF"),
                # ^ without guard 4 fail this would be WRITTEN-not-LANDED
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.GUARD_FAIL

    def test_unverified_beats_written_not_landed(self):
        """Guard 3 (draft==default) → UNVERIFIED, NOT WRITTEN-not-LANDED.

        Even though draft_value != computed_value, the non-default guard fires
        first and classifies this as UNVERIFIED (a coverage gap, not a transfer fail).
        """
        obs = _obs(
            element_present=True,
            inner_text_len=50,
            cells=[
                _cell(
                    draft_value="16px",
                    computed_value="18px",    # differs from draft
                    expected_default="16px",  # but draft == default → UNVERIFIED
                )
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED

    def test_written_not_landed_beats_nothing_else(self):
        """WRITTEN-not-LANDED: all guards passed, computed != draft."""
        obs = _obs(
            element_present=True,
            inner_text_len=100,
            rendered_height_px=400.0,
            draft_height_px=400.0,
            cells=[
                _cell(
                    draft_value="#2D6A4F",
                    computed_value="#FF0000",
                    expected_default="#ffffff",  # guard 3 passes (draft != default)
                )
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.WRITTEN_NOT_LANDED

    def test_landed_requires_all_guards_pass_and_values_match(self):
        """LANDED: all guards pass, values match within tolerance."""
        obs = _obs(
            element_present=True,
            inner_text_len=100,
            rendered_height_px=400.0,
            draft_height_px=400.0,
            cells=[
                _cell(
                    draft_value="#2D6A4F",
                    computed_value="#2D6A4F",
                    expected_default="#ffffff",
                )
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED


# ===========================================================================
# 6. LANDED synthetic pass case
# ===========================================================================

class TestLandedCase:
    def test_exact_match_is_landed(self):
        obs = _obs(
            element_present=True,
            inner_text_len=80,
            cells=[
                _cell(
                    property="padding",
                    tier="Base",
                    draft_value="32px",
                    computed_value="32px",
                    expected_default="0px",
                )
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_multiple_cells_all_landed(self):
        obs = _obs(
            cells=[
                _cell(
                    property="background-color",
                    tier="Base",
                    draft_value="#2D6A4F",
                    computed_value="#2D6A4F",
                    expected_default=None,
                ),
                _cell(
                    property="padding",
                    tier="Mobile",
                    draft_value="16px",
                    computed_value="16px",
                    expected_default="0px",
                ),
                _cell(
                    property="font-size",
                    tier="Desktop",
                    draft_value="24px",
                    computed_value="24px",
                    expected_default="16px",
                ),
            ]
        )
        result = compute_section_result(obs)
        assert all(c.verdict == Verdict.LANDED for c in result.cells)


# ===========================================================================
# 7. WRITTEN-not-LANDED case
# ===========================================================================

class TestWrittenNotLandedCase:
    def test_computed_differs_from_draft(self):
        """Both sides real px but a genuine mismatch → WRITTEN-not-LANDED.

        (Note: a non-px computed side like '100%' is now UNVERIFIED per FIX-M —
        see TestUnparseableLengthFixM — so this case uses two real px values.)
        """
        obs = _obs(
            element_present=True,
            inner_text_len=100,
            cells=[
                _cell(
                    property="max-width",
                    tier="Base",
                    draft_value="1200px",
                    computed_value="980px",
                    expected_default="none",
                )
            ],
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.WRITTEN_NOT_LANDED

    def test_computed_none_on_exercised_cell_is_unverified(self):
        """computed_value None on a non-default cell → UNVERIFIED (fail-closed,
        not LANDED — never silently passes)."""
        obs = _obs(
            element_present=True,
            inner_text_len=100,
            cells=[
                _cell(
                    draft_value="#2D6A4F",
                    computed_value=None,      # not captured
                    expected_default="#ffffff",  # different → guard 3 passes
                )
            ],
        )
        result = compute_section_result(obs)
        # None computed = cannot conclude LANDED → UNVERIFIED
        assert result.cells[0].verdict == Verdict.UNVERIFIED


# ===========================================================================
# 8. Colour tolerance
# ===========================================================================

class TestColourTolerance:
    def test_identical_colour_is_landed(self):
        """Exact hex match is LANDED (ΔE == 0)."""
        obs = _obs(
            cells=[
                _cell(
                    property="background-color",
                    draft_value="#2D6A4F",
                    computed_value="#2D6A4F",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_colour_within_delta1_is_landed(self):
        """Euclidean RGB distance ≤ 1 is LANDED."""
        # #2D6A4F = (45, 106, 79); #2D6A50 = (45, 106, 80) — delta = 1.0
        obs = _obs(
            cells=[
                _cell(
                    property="color",
                    draft_value="#2D6A4F",
                    computed_value="#2D6A50",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_colour_large_delta_is_written_not_landed(self):
        """Large colour delta → WRITTEN-not-LANDED."""
        obs = _obs(
            cells=[
                _cell(
                    property="background-color",
                    draft_value="#2D6A4F",
                    computed_value="#FF0000",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.WRITTEN_NOT_LANDED


# ===========================================================================
# 9. Length tolerance
# ===========================================================================

class TestLengthTolerance:
    def test_exact_px_is_landed(self):
        obs = _obs(
            cells=[
                _cell(
                    property="padding",
                    draft_value="32px",
                    computed_value="32px",
                    expected_default="0px",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_sub_1px_difference_is_landed(self):
        """0.5px delta ≤ 1px tolerance → LANDED."""
        obs = _obs(
            cells=[
                _cell(
                    property="font-size",
                    draft_value="24px",
                    computed_value="24.5px",   # _parse_px('24.5px') = 24.5
                    expected_default="16px",
                )
            ]
        )
        # Note: 24.5px will parse via _parse_px since it matches the regex
        result = compute_section_result(obs)
        # delta 0.5px ≤ 1.0px → LANDED
        assert result.cells[0].verdict == Verdict.LANDED

    def test_over_1px_is_written_not_landed(self):
        """2px delta > 1px tolerance → WRITTEN-not-LANDED."""
        obs = _obs(
            cells=[
                _cell(
                    property="padding",
                    draft_value="32px",
                    computed_value="34px",
                    expected_default="0px",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.WRITTEN_NOT_LANDED

    def test_unparseable_length_is_unverified(self):
        """FIX-M: a non-px length (calc/%) the engine cannot resolve offline →
        UNVERIFIED (cannot conclude), NOT a hard WRITTEN-not-LANDED (cry-wolf).

        Mirrors the colour-unparseable→UNVERIFIED path; needs container-resolved
        comparison in F3-runtime.
        """
        obs = _obs(
            cells=[
                _cell(
                    property="width",
                    draft_value="calc(100% - 32px)",
                    computed_value="800px",   # browser resolves calc — cannot compare offline
                    expected_default="auto",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED


# ===========================================================================
# 10. Contract schema (§6 exact key names)
# ===========================================================================

class TestContractSchema:
    REQUIRED_ROOT_KEYS = {"fixture", "generated_by", "sections", "plain_summary"}
    REQUIRED_SECTION_KEYS = {
        "section_id", "block_slug", "guards", "element_selector", "cells"
    }
    REQUIRED_GUARDS_KEYS = {"empty", "element", "height", "non_default"}
    REQUIRED_CELL_KEYS = {
        "property", "tier", "draft_value", "computed_value", "expected_default", "verdict"
    }
    REQUIRED_GENERATED_BY_KEYS = {"module", "version"}

    def test_root_keys_exact(self):
        report = compute_report("test-fixture", [_obs(cells=[_cell()])])
        d = report.as_dict()
        assert set(d.keys()) == self.REQUIRED_ROOT_KEYS, (
            f"Root keys wrong: got {set(d.keys())}"
        )

    def test_generated_by_keys(self):
        report = compute_report("test-fixture", [])
        d = report.as_dict()
        assert set(d["generated_by"].keys()) == self.REQUIRED_GENERATED_BY_KEYS

    def test_section_keys_exact(self):
        report = compute_report("test-fixture", [_obs(cells=[_cell()])])
        d = report.as_dict()
        section = d["sections"][0]
        assert set(section.keys()) == self.REQUIRED_SECTION_KEYS

    def test_guards_keys_exact(self):
        report = compute_report("test-fixture", [_obs(cells=[_cell()])])
        d = report.as_dict()
        guards = d["sections"][0]["guards"]
        assert set(guards.keys()) == self.REQUIRED_GUARDS_KEYS

    def test_cell_keys_exact(self):
        report = compute_report("test-fixture", [_obs(cells=[_cell()])])
        d = report.as_dict()
        cell = d["sections"][0]["cells"][0]
        assert set(cell.keys()) == self.REQUIRED_CELL_KEYS

    def test_verdict_values_are_contract_strings(self):
        """Verdict values written to JSON must be the exact F3→F5 contract strings."""
        expected_values = {
            "NOT-RENDERED", "GUARD-FAIL", "UNVERIFIED",
            "WRITTEN-not-LANDED", "LANDED",
        }
        actual_values = {v.value for v in Verdict}
        assert actual_values == expected_values

    def test_report_is_json_serialisable(self):
        report = compute_report(
            "test-fixture",
            [
                _obs(
                    section_id="hero-1",
                    block_slug="sgs/hero",
                    cells=[
                        _cell(
                            property="background-color",
                            tier="Base",
                            draft_value="#2D6A4F",
                            computed_value="#2D6A4F",
                        )
                    ],
                )
            ],
        )
        # Must not raise
        serialised = json.dumps(report.as_dict(), indent=2, ensure_ascii=False)
        # Round-trip
        parsed = json.loads(serialised)
        assert parsed["fixture"] == "test-fixture"
        assert parsed["sections"][0]["cells"][0]["verdict"] == "LANDED"


# ===========================================================================
# 11. Tier vocabulary matches F2 (Base|Mobile|Tablet|Desktop|Other:<cond>)
# ===========================================================================

class TestTierVocabulary:
    VALID_TIERS = ["Base", "Mobile", "Tablet", "Desktop", "Other:(max-width: 600px)"]

    @pytest.mark.parametrize("tier", VALID_TIERS)
    def test_valid_tier_accepted_in_cell(self, tier):
        """All F2 tier values are accepted by the oracle engine (no validation error)."""
        cell = _cell(tier=tier)
        obs = _obs(cells=[cell])
        # Should not raise
        result = compute_section_result(obs)
        assert result.cells[0].tier == tier

    def test_tier_preserved_in_output(self):
        obs = _obs(
            cells=[
                _cell(tier="Other:(min-width: 1280px)", draft_value="1400px", computed_value="1400px"),
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].tier == "Other:(min-width: 1280px)"

    # --- FIX-I: tier format validation at construction time ---

    @pytest.mark.parametrize("bad_tier", [
        "mobile",                  # lowercase device tier
        "base",                    # lowercase
        "Other (max-width)",       # no colon
        "Other:",                  # empty condition after colon
        "Phone",                   # not in vocabulary
        "Other: ",                 # only whitespace after colon (still matches .+ — see note)
    ])
    def test_invalid_tier_rejected(self, bad_tier):
        """FIX-I: CellInput rejects tiers outside the F2 vocabulary.

        Note: 'Other: ' (space) DOES match Other:<.+>; it is included here to
        document that F2's own emission (f'Other:{media}', no space) is the
        canonical form, but a non-empty post-colon string is structurally valid.
        """
        if bad_tier == "Other: ":
            # Structurally valid (Other: + non-empty) — must NOT raise.
            CellInput(
                property="gap", tier=bad_tier, draft_value="1px",
                computed_value="1px", expected_default=None,
            )
            return
        with pytest.raises(ValueError):
            CellInput(
                property="gap", tier=bad_tier, draft_value="1px",
                computed_value="1px", expected_default=None,
            )

    def test_other_tier_no_space_after_colon_is_f2_canonical(self):
        """F2 emits Other:<media> with NO space after the colon (declare_input.py:215)."""
        cell = CellInput(
            property="max-width", tier="Other:(max-width:600px)",
            draft_value="600px", computed_value="600px", expected_default=None,
        )
        assert cell.tier == "Other:(max-width:600px)"


# ===========================================================================
# 12. Reuse verification — _parse_px + _colour_delta from parity2
# ===========================================================================

class TestReuseVerification:
    def test_parse_px_imported_from_parity2(self):
        """_parse_px must be importable from parity2.transfer_checker."""
        from parity2.transfer_checker import _parse_px
        assert _parse_px("32px") == 32.0
        assert _parse_px("1rem") == 16.0
        assert _parse_px("0") == 0.0
        assert _parse_px("auto") is None

    def test_colour_delta_imported_from_parity2(self):
        """_colour_delta must be importable from parity2.transfer_checker."""
        from parity2.transfer_checker import _colour_delta
        # Same colour → delta 0
        assert _colour_delta("#ffffff", "#ffffff") == 0.0
        # Large delta
        assert _colour_delta("#000000", "#ffffff") > 1.0

    def test_verdict_module_uses_parity2_parse_px(self):
        """The verdict engine uses _parse_px from parity2 for length comparisons."""
        # 32.5px vs 32px → delta 0.5px ≤ 1px tolerance → LANDED
        obs = _obs(
            cells=[
                _cell(
                    property="margin",
                    draft_value="32px",
                    computed_value="32.5px",
                    expected_default="0px",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_verdict_module_uses_parity2_colour_delta(self):
        """The verdict engine uses _colour_delta from parity2 for colour comparisons."""
        # ΔE = 1 for a 1-unit RGB shift → LANDED
        obs = _obs(
            cells=[
                _cell(
                    property="color",
                    draft_value="rgb(45, 106, 79)",
                    computed_value="rgb(45, 106, 80)",  # delta = 1.0
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_no_bem_matcher_imported(self):
        """The oracle modules must NOT expose parity2's BEM matcher in their namespace.

        This guards against the parity-bem-class-blind-spot (blub.db 2026-06-11):
        native clone output does not carry draft BEM classes, so any pairing via
        BEM class would produce false-missing verdicts.

        We check the module NAMESPACE (dir(module)), not source text, to avoid
        false-positives from comments mentioning the symbol names.
        """
        from oracle import verdict as verdict_module
        from oracle import guards as guards_module
        from oracle import models as models_module

        # These callable/class symbols must not be reachable via the oracle module
        # namespace — if they were imported they would appear in dir(module).
        BEM_MATCHER_SYMBOLS = {
            "_StructuralMatcher",
            "_bem_classes",
            "_shared_bem",
            "_fold_match",
            "_build_path_index",
        }

        for module in (verdict_module, guards_module, models_module):
            module_names = set(dir(module))
            for sym in BEM_MATCHER_SYMBOLS:
                assert sym not in module_names, (
                    f"Oracle module {module.__name__} exposes parity2 BEM symbol "
                    f"'{sym}' in its namespace — this is FORBIDDEN "
                    "(parity-bem-class-blind-spot)."
                )


# ===========================================================================
# 13. MR-2 normalised-markup equality helper (FIX-H — convert.py emits WP
#     block-comment MARKUP, not JSON).
# ===========================================================================

class TestMR2NormalisedMarkupEquality:
    # --- WP block-comment markup (the real convert.py output format) ---

    def test_identical_markup_equal(self):
        a = '<!-- wp:sgs/hero {"align":"full"} --><div>Hi</div><!-- /wp:sgs/hero -->'
        b = '<!-- wp:sgs/hero {"align":"full"} --><div>Hi</div><!-- /wp:sgs/hero -->'
        assert _normalised_markup_equal(a, b)

    def test_block_attr_key_order_irrelevant(self):
        a = '<!-- wp:sgs/hero {"align":"full","gap":"16px"} --><div>Hi</div><!-- /wp:sgs/hero -->'
        b = '<!-- wp:sgs/hero {"gap":"16px","align":"full"} --><div>Hi</div><!-- /wp:sgs/hero -->'
        assert _normalised_markup_equal(a, b)

    def test_inter_tag_whitespace_irrelevant(self):
        a = '<!-- wp:sgs/hero --><div>Hi</div><!-- /wp:sgs/hero -->'
        b = '<!-- wp:sgs/hero -->\n  <div>Hi</div>\n<!-- /wp:sgs/hero -->'
        assert _normalised_markup_equal(a, b)

    def test_different_attr_value_not_equal(self):
        a = '<!-- wp:sgs/hero {"align":"full"} --><div>Hi</div><!-- /wp:sgs/hero -->'
        b = '<!-- wp:sgs/hero {"align":"wide"} --><div>Hi</div><!-- /wp:sgs/hero -->'
        assert not _normalised_markup_equal(a, b)

    def test_different_block_name_not_equal(self):
        a = '<!-- wp:sgs/hero --><div>Hi</div><!-- /wp:sgs/hero -->'
        b = '<!-- wp:sgs/cta-section --><div>Hi</div><!-- /wp:sgs/cta-section -->'
        assert not _normalised_markup_equal(a, b)

    def test_malformed_block_json_not_equal(self):
        """FIX-H: malformed block-comment JSON must NOT silently degrade to a
        raw-string compare that could pass."""
        a = '<!-- wp:sgs/hero {"align":"full"} --><div>Hi</div><!-- /wp:sgs/hero -->'
        b = '<!-- wp:sgs/hero {align:full} --><div>Hi</div><!-- /wp:sgs/hero -->'  # invalid JSON
        assert not _normalised_markup_equal(a, b)

    def test_nested_inner_blocks_equal(self):
        a = (
            '<!-- wp:sgs/hero --><!-- wp:sgs/heading {"level":2} -->'
            '<h2>Hi</h2><!-- /wp:sgs/heading --><!-- /wp:sgs/hero -->'
        )
        b = (
            '<!-- wp:sgs/hero -->\n  <!-- wp:sgs/heading {"level":2} -->\n'
            '  <h2>Hi</h2>\n  <!-- /wp:sgs/heading -->\n<!-- /wp:sgs/hero -->'
        )
        assert _normalised_markup_equal(a, b)

    # --- JSON-only fallback (golden fixtures expressed as JSON) ---

    def test_json_fallback_key_order(self):
        """When neither side has block markup, fall back to JSON-semantic compare."""
        a = '{"name": "sgs/hero", "attrs": {}}'
        b = '{"attrs": {}, "name": "sgs/hero"}'
        assert _normalised_markup_equal(a, b)

    def test_json_fallback_different(self):
        a = '{"name": "sgs/hero"}'
        b = '{"name": "sgs/cta-section"}'
        assert not _normalised_markup_equal(a, b)


# ===========================================================================
# 14. MR-2 coverage line
# ===========================================================================

class TestMR2Coverage:
    def test_coverage_line_emitted(self):
        """mr2_coverage_summary() must return a non-empty string."""
        summary = mr2_coverage_summary()
        assert isinstance(summary, str)
        assert len(summary) > 0

    def test_coverage_line_format(self):
        """Coverage line must contain 'MR-2'."""
        summary = mr2_coverage_summary()
        assert "MR-2" in summary

    def test_coverage_line_mentions_counts_or_unavailable(self):
        """Must contain either 'covered N of M' or 'not available'."""
        summary = mr2_coverage_summary()
        has_counts = "covered" in summary and "of" in summary
        has_unavailable = "not available" in summary or "unknown" in summary
        assert has_counts or has_unavailable, (
            f"Coverage line neither mentions counts nor DB unavailability: {summary!r}"
        )


# ===========================================================================
# 15. Plain-English summary (§6 MF-5)
# ===========================================================================

class TestPlainSummary:
    def test_ok_section_in_summary(self):
        obs = _obs(
            section_id="hero-1",
            block_slug="sgs/hero",
            cells=[_cell(draft_value="#2D6A4F", computed_value="#2D6A4F")],
        )
        report = compute_report("my-fixture", [obs])
        assert "OK" in report.plain_summary or "LANDED" in report.plain_summary

    def test_fail_section_in_summary(self):
        obs = _obs(
            section_id="hero-1",
            block_slug="sgs/hero",
            element_present=True,
            inner_text_len=100,
            cells=[
                _cell(
                    property="background-color",
                    draft_value="#2D6A4F",
                    computed_value="#FFFFFF",
                    expected_default=None,
                )
            ],
        )
        report = compute_report("my-fixture", [obs])
        assert "FAIL" in report.plain_summary

    def test_not_rendered_section_in_summary(self):
        obs = _obs(element_present=False, inner_text_len=0, cells=[_cell()])
        report = compute_report("my-fixture", [obs])
        assert "NOT-RENDERED" in report.plain_summary or "FAIL" in report.plain_summary

    def test_empty_observations_summary(self):
        report = compute_report("my-fixture", [])
        assert isinstance(report.plain_summary, str)

    # --- FIX-K: mixed section must report BOTH counts, never "all cells are X" ---

    def test_mixed_section_reports_both_counts(self):
        """The live-fixture case: 4 LANDED + 2 UNVERIFIED.  The summary MUST report
        both counts and MUST NOT claim 'all cells'."""
        landed_cells = [
            _cell(
                property=p, tier="Base", draft_value="#2D6A4F",
                computed_value="#2D6A4F", expected_default=None,
            )
            for p in ("background-color", "color", "border-color", "outline-color")
        ]
        # 2 UNVERIFIED via guard 3 (draft == default).
        unverified_cells = [
            _cell(
                property=p, tier="Base", draft_value="16px",
                computed_value="16px", expected_default="16px",
            )
            for p in ("font-size", "line-height")
        ]
        obs = _obs(
            section_id="section-1",
            block_slug="sgs/container",
            element_present=True,
            inner_text_len=120,
            cells=landed_cells + unverified_cells,
        )
        report = compute_report("my-fixture", [obs])
        summary = report.plain_summary

        # Reports BOTH counts.
        assert "4 LANDED" in summary, summary
        assert "2 UNVERIFIED" in summary, summary
        assert "0 WRITTEN-not-LANDED" in summary, summary
        assert "0 GUARD-FAIL" in summary, summary

        # Does NOT overclaim.
        assert "all cells" not in summary.lower(), summary
        assert "coverage gaps" not in summary.lower(), summary

    def test_mixed_section_with_failure_appends_detail(self):
        """A mixed section with a WRITTEN-not-LANDED cell appends the offending detail."""
        obs = _obs(
            section_id="section-2",
            block_slug="sgs/hero",
            element_present=True,
            inner_text_len=100,
            cells=[
                _cell(property="color", draft_value="#2D6A4F",
                      computed_value="#2D6A4F", expected_default=None),       # LANDED
                _cell(property="background-color", draft_value="#2D6A4F",
                      computed_value="#FF0000", expected_default=None),       # WRITTEN-not-LANDED
            ],
        )
        report = compute_report("my-fixture", [obs])
        summary = report.plain_summary
        assert "1 LANDED" in summary
        assert "1 WRITTEN-not-LANDED" in summary
        assert "FAIL: background-color" in summary
        assert "rendered '#FF0000'" in summary

    def test_all_landed_section_says_ok(self):
        obs = _obs(
            section_id="s",
            block_slug="sgs/hero",
            cells=[
                _cell(property="color", draft_value="#2D6A4F",
                      computed_value="#2D6A4F", expected_default=None),
            ],
        )
        report = compute_report("my-fixture", [obs])
        assert "1 LANDED" in report.plain_summary
        assert "OK." in report.plain_summary

    def test_page_not_loaded_section_clear_message(self):
        obs = _obs(
            section_id="s",
            block_slug="sgs/hero",
            page_loaded=False,
            cells=[_cell(), _cell(property="color")],
        )
        report = compute_report("my-fixture", [obs])
        summary = report.plain_summary
        assert "NOT-RENDERED" in summary
        assert "did not load" in summary
        assert "all cells" not in summary.lower()


# ===========================================================================
# 16. Full-report round-trip (F5 join key integrity)
# ===========================================================================

class TestReportRoundTrip:
    def test_f5_join_key_fields_present(self):
        """Each cell in the §6 output carries the F5 join key fields:
        section_id is on the parent section, plus property + tier on the cell."""
        obs = _obs(
            section_id="section-3",
            block_slug="sgs/trust-bar",
            cells=[
                _cell(property="gap", tier="Tablet", draft_value="16px", computed_value="16px"),
            ],
        )
        report = compute_report("my-fixture", [obs])
        d = report.as_dict()

        section = d["sections"][0]
        assert section["section_id"] == "section-3"
        assert section["block_slug"] == "sgs/trust-bar"

        cell = section["cells"][0]
        # F5 join key components:
        assert cell["property"] == "gap"
        assert cell["tier"] == "Tablet"
        # Plus the verdict
        assert cell["verdict"] == Verdict.LANDED.value


# ===========================================================================
# 17. FIX-A — colour/length property classifiers do not over-match
# ===========================================================================

class TestClassifiersFixA:
    # --- _is_colour_prop: exact colour-bearing only ---

    @pytest.mark.parametrize("prop", [
        "color", "background-color", "border-color", "border-top-color",
        "outline-color", "text-decoration-color", "column-rule-color",
        "caret-color", "fill", "stroke",
    ])
    def test_colour_bearing_props_classified_as_colour(self, prop):
        assert _is_colour_prop(prop)

    @pytest.mark.parametrize("prop", [
        "background-image", "background-position", "background-size",
        "background-repeat", "background", "outline-style", "outline-width",
        "outline-offset", "border-style", "border-width",
    ])
    def test_non_colour_props_not_classified_as_colour(self, prop):
        assert not _is_colour_prop(prop)

    # --- _is_length_prop: real lengths only ---

    @pytest.mark.parametrize("prop", [
        "width", "height", "max-width", "min-height", "padding", "padding-top",
        "margin", "margin-bottom", "gap", "row-gap", "column-gap", "font-size",
        "line-height", "border-radius", "border-top-left-radius", "top", "left",
        "inset", "inset-block-start", "border-top-width",
    ])
    def test_length_props_classified_as_length(self, prop):
        assert _is_length_prop(prop)

    @pytest.mark.parametrize("prop", [
        "border", "background", "font", "transition", "color", "display",
    ])
    def test_non_length_shorthands_not_classified_as_length(self, prop):
        assert not _is_length_prop(prop)

    # --- end-to-end: a correct background-size value is not false-failed ---

    def test_background_size_cover_not_false_failed(self):
        """background-size: cover == cover must be LANDED, not routed to colour delta."""
        obs = _obs(
            cells=[
                _cell(
                    property="background-size",
                    draft_value="cover",
                    computed_value="cover",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_border_color_still_routes_to_colour_delta(self):
        """border-color: a 1-unit RGB shift is within ΔE≤1 → LANDED."""
        obs = _obs(
            cells=[
                _cell(
                    property="border-color",
                    draft_value="rgb(45, 106, 79)",
                    computed_value="rgb(45, 106, 80)",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED


# ===========================================================================
# 18. FIX-C — zero-cell rendered section → synthetic UNVERIFIED cell
# ===========================================================================

class TestZeroCellSectionFixC:
    def test_rendered_section_no_cells_emits_unverified(self):
        obs = _obs(element_present=True, inner_text_len=80, cells=[])
        result = compute_section_result(obs)
        assert len(result.cells) == 1
        assert result.cells[0].verdict == Verdict.UNVERIFIED
        assert result.cells[0].property == "(no measurable cells)"

    def test_zero_cell_summary_coherent(self):
        """summary_verdict agrees with the synthetic cell (no NOT-RENDERED while
        guards pass)."""
        obs = _obs(element_present=True, inner_text_len=80, cells=[])
        result = compute_section_result(obs)
        assert result.summary_verdict() == Verdict.UNVERIFIED.value

    def test_zero_cell_guard_fail_section(self):
        """Empty section (guard 1 fail) with no cells → synthetic GUARD-FAIL cell."""
        obs = _obs(element_present=True, inner_text_len=0, cells=[])
        result = compute_section_result(obs)
        assert len(result.cells) == 1
        assert result.cells[0].verdict == Verdict.GUARD_FAIL

    def test_zero_cell_page_not_loaded(self):
        obs = _obs(page_loaded=False, element_present=True, inner_text_len=80, cells=[])
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.NOT_RENDERED

    def test_zero_cell_contributes_f5_row(self):
        """The synthetic cell carries the F5 join-key fields."""
        obs = _obs(section_id="empty-1", block_slug="sgs/spacer", cells=[])
        report = compute_report("fix", [obs])
        d = report.as_dict()
        cell = d["sections"][0]["cells"][0]
        assert set(cell.keys()) == {
            "property", "tier", "draft_value", "computed_value",
            "expected_default", "verdict",
        }
        assert cell["tier"] == "Base"


# ===========================================================================
# 19. FIX-D — computed-style serialisation differences
# ===========================================================================

class TestSerialisationFixD:
    def test_text_align_start_equals_left(self):
        obs = _obs(
            cells=[
                _cell(
                    property="text-align",
                    draft_value="start",
                    computed_value="left",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_text_align_end_equals_right(self):
        obs = _obs(
            cells=[
                _cell(
                    property="text-align",
                    draft_value="end",
                    computed_value="right",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_text_align_genuine_mismatch_is_written_not_landed(self):
        obs = _obs(
            cells=[
                _cell(
                    property="text-align",
                    draft_value="center",
                    computed_value="left",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.WRITTEN_NOT_LANDED

    def test_grid_template_columns_lossy_is_unverified(self):
        """repeat(4,1fr) vs the browser-normalised form → UNVERIFIED, not a hard fail.

        This is the live-proof-fixture case the reviewer flagged.
        """
        obs = _obs(
            cells=[
                _cell(
                    property="grid-template-columns",
                    draft_value="repeat(4, 1fr)",
                    computed_value="300px 300px 300px 300px",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED

    def test_font_family_lossy_is_unverified(self):
        obs = _obs(
            cells=[
                _cell(
                    property="font-family",
                    draft_value="Inter",
                    computed_value="Inter, sans-serif",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED

    def test_grid_template_columns_exact_still_landed(self):
        """An exact match on a lossy prop is still LANDED (exact check runs first)."""
        obs = _obs(
            cells=[
                _cell(
                    property="grid-template-columns",
                    draft_value="repeat(4, 1fr)",
                    computed_value="repeat(4, 1fr)",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED


# ===========================================================================
# 20. FIX-E — written flag (only converter-written cells can LAND)
# ===========================================================================

class TestWrittenFlagFixE:
    def test_unwritten_cell_is_unverified_even_if_computed_equals_draft(self):
        """written=False → UNVERIFIED, even when computed coincidentally == draft."""
        obs = _obs(
            cells=[
                _cell(
                    property="background-color",
                    draft_value="#2D6A4F",
                    computed_value="#2D6A4F",   # coincidental match
                    expected_default=None,
                    written=False,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED

    def test_written_cell_matching_is_landed(self):
        obs = _obs(
            cells=[
                _cell(
                    property="background-color",
                    draft_value="#2D6A4F",
                    computed_value="#2D6A4F",
                    expected_default=None,
                    written=True,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_written_defaults_true(self):
        cell = CellInput(
            property="gap", tier="Base", draft_value="8px",
            computed_value="8px", expected_default=None,
        )
        assert cell.written is True


# ===========================================================================
# 21. FIX-F — named/keyword draft colours
# ===========================================================================

class TestNamedColoursFixF:
    def test_white_keyword_matches_rgb(self):
        obs = _obs(
            cells=[
                _cell(
                    property="background-color",
                    draft_value="white",
                    computed_value="rgb(255, 255, 255)",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_transparent_keyword_matches_rgba(self):
        obs = _obs(
            cells=[
                _cell(
                    property="background-color",
                    draft_value="transparent",
                    computed_value="rgba(0, 0, 0, 0)",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED

    def test_black_keyword_mismatch_is_written_not_landed(self):
        obs = _obs(
            cells=[
                _cell(
                    property="color",
                    draft_value="black",
                    computed_value="rgb(255, 255, 255)",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.WRITTEN_NOT_LANDED

    def test_unparseable_keyword_is_unverified(self):
        """currentColor (context-dependent, unmapped) → UNVERIFIED, not a hard fail."""
        obs = _obs(
            cells=[
                _cell(
                    property="color",
                    draft_value="currentColor",
                    computed_value="rgb(45, 106, 79)",
                    expected_default=None,
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED


# ===========================================================================
# 22. FIX-G — height tolerance relative-OR-absolute + None handling
# ===========================================================================

class TestHeightToleranceFixG:
    def test_large_absolute_but_small_fraction_passes(self):
        """A 30px delta on a 2000px section (1.5%) is within the fractional
        tolerance even though it exceeds the absolute px threshold → no fail."""
        result = guard_height_parity(
            rendered_height_px=2000.0, draft_height_px=2030.0
        )
        assert result.passed
        assert result.measured

    def test_large_absolute_and_large_fraction_fails(self):
        """A 400px delta on a 500px section (80%) exceeds BOTH thresholds → fail."""
        result = guard_height_parity(
            rendered_height_px=100.0, draft_height_px=500.0
        )
        assert not result.passed
        assert result.measured

    def test_small_absolute_delta_passes(self):
        """A 5px delta is under the absolute threshold → pass regardless of fraction."""
        result = guard_height_parity(
            rendered_height_px=100.0, draft_height_px=105.0
        )
        assert result.passed

    def test_none_height_is_coverage_gap_not_silent_pass(self):
        """FIX-G: a None height marks measured=False (coverage gap), passed=True."""
        result = guard_height_parity(rendered_height_px=None, draft_height_px=400.0)
        assert result.passed
        assert result.measured is False

    def test_both_none_coverage_gap(self):
        result = guard_height_parity(rendered_height_px=None, draft_height_px=None)
        assert result.measured is False

    def test_tolerance_constants_present(self):
        assert HEIGHT_TOLERANCE_PX == 20.0
        assert HEIGHT_TOLERANCE_FRAC == 0.10


# ===========================================================================
# 23. _compare_values tri-state (FIX-D/F internal)
# ===========================================================================

class TestCompareValuesTriState:
    def test_exact_is_landed(self):
        assert _compare_values("color", "#fff", "#fff") == _Match.LANDED

    def test_colour_within_tolerance_landed(self):
        assert _compare_values("color", "rgb(45,106,79)", "rgb(45,106,80)") == _Match.LANDED

    def test_colour_over_tolerance_not_landed(self):
        assert _compare_values("color", "#000000", "#ffffff") == _Match.NOT_LANDED

    def test_unparseable_colour_unverifiable(self):
        assert _compare_values("color", "currentColor", "rgb(1,2,3)") == _Match.UNVERIFIABLE

    def test_lossy_prop_unverifiable(self):
        assert _compare_values(
            "grid-template-columns", "repeat(4,1fr)", "300px 300px 300px 300px"
        ) == _Match.UNVERIFIABLE

    def test_length_over_tolerance_not_landed(self):
        assert _compare_values("padding", "32px", "40px") == _Match.NOT_LANDED

    # --- FIX-M: unparseable length → UNVERIFIABLE (mirrors colour path) ---

    def test_percent_length_unverifiable(self):
        assert _compare_values("width", "50%", "640px") == _Match.UNVERIFIABLE

    def test_auto_length_unverifiable(self):
        assert _compare_values("margin", "auto", "752px") == _Match.UNVERIFIABLE

    def test_calc_length_unverifiable(self):
        assert _compare_values("width", "calc(100% - 32px)", "800px") == _Match.UNVERIFIABLE

    def test_vw_length_unverifiable(self):
        assert _compare_values("max-width", "80vw", "1024px") == _Match.UNVERIFIABLE

    def test_both_px_real_mismatch_still_not_landed(self):
        assert _compare_values("padding", "64px", "66px") == _Match.NOT_LANDED

    def test_both_px_exact_still_landed(self):
        assert _compare_values("padding", "64px", "64px") == _Match.LANDED


# ===========================================================================
# 24b. FIX-M — end-to-end verdicts for unparseable lengths
# ===========================================================================

class TestUnparseableLengthFixM:
    def test_width_percent_is_unverified_not_written_not_landed(self):
        """A correct width:50% (computed 640px) must be UNVERIFIED, not a false FAIL."""
        obs = _obs(
            cells=[
                _cell(
                    property="width",
                    draft_value="50%",
                    computed_value="640px",
                    expected_default="auto",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED

    def test_margin_auto_is_unverified(self):
        obs = _obs(
            cells=[
                _cell(
                    property="margin",
                    draft_value="auto",
                    computed_value="752px",
                    expected_default="0px",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.UNVERIFIED

    def test_real_px_mismatch_still_written_not_landed(self):
        """A genuine px mismatch (64px vs 66px) STILL hard-fails — FIX-M does not soften this."""
        obs = _obs(
            cells=[
                _cell(
                    property="padding",
                    draft_value="64px",
                    computed_value="66px",
                    expected_default="0px",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.WRITTEN_NOT_LANDED

    def test_exact_px_still_landed(self):
        obs = _obs(
            cells=[
                _cell(
                    property="padding",
                    draft_value="64px",
                    computed_value="64px",
                    expected_default="0px",
                )
            ]
        )
        result = compute_section_result(obs)
        assert result.cells[0].verdict == Verdict.LANDED


# ===========================================================================
# 24. FIX-H — convert.py stdout markup extraction + live MR-2 (opt-in)
# ===========================================================================

class TestConverterMarkupExtraction:
    def test_extract_markup_between_banners(self):
        from oracle.metamorphic import _extract_markup_from_convert_stdout
        stdout = (
            "============================================================\n"
            "WP BLOCK MARKUP (Spec 22 universal walker)\n"
            "============================================================\n"
            '<!-- wp:sgs/hero --><div>Hi</div><!-- /wp:sgs/hero -->\n'
            "\n"
            "============================================================\n"
            "VARIATION CSS (lift into client theme-snapshot.json styles.css)\n"
            "============================================================\n"
            ".sgs-hero { color: red; }\n"
        )
        markup = _extract_markup_from_convert_stdout(stdout)
        assert markup == '<!-- wp:sgs/hero --><div>Hi</div><!-- /wp:sgs/hero -->'

    def test_extract_markup_no_variation(self):
        from oracle.metamorphic import _extract_markup_from_convert_stdout
        stdout = (
            "============================================================\n"
            "WP BLOCK MARKUP (Spec 22 universal walker)\n"
            "============================================================\n"
            '<!-- wp:sgs/hero /-->\n'
            "\n"
        )
        markup = _extract_markup_from_convert_stdout(stdout)
        assert markup == '<!-- wp:sgs/hero /-->'

    def test_extract_markup_banner_absent_returns_none(self):
        from oracle.metamorphic import _extract_markup_from_convert_stdout
        assert _extract_markup_from_convert_stdout("no banner here") is None


class TestLiveMR2OptIn:
    """Live MR-2 invariance on a real fixture+alias pair.

    SKIPPED-with-reason when the converter/DB is unavailable (F3-core scope
    permits this — the comparison logic itself is proven by the synthetic-markup
    tests above).  When the converter IS available, this proves name-free routing
    end-to-end: renaming a BEM class to a same-slot alias yields identical markup.
    """

    def test_heading_alias_invariance(self):
        from oracle.metamorphic import _run_converter, assert_mr2_pair

        probe = _run_converter(
            '<section class="sgs-hero"><h1 class="heading">Hi</h1></section>'
        )
        if probe is None:
            pytest.skip("converter/DB unavailable — live MR-2 skipped (F3-core scope)")

        result = assert_mr2_pair(
            fixture_html='<section class="sgs-hero"><h1 class="heading">Hi</h1></section>',
            original_slot_name="heading",
            alias_name="headline",            # same slot → sgs/heading
            standalone_block_original="sgs/heading",
            standalone_block_alias="sgs/heading",
        )
        assert result["passed"], result["reason"]
        assert result["coverage_note"] == "MR-2-COVERED"

    def test_mr2_precondition_rejects_cross_slot(self):
        """assert_mr2_pair rejects an alias whose standalone_block differs (no live run needed)."""
        from oracle.metamorphic import assert_mr2_pair
        result = assert_mr2_pair(
            fixture_html='<section class="sgs-hero"><h1 class="heading">Hi</h1></section>',
            original_slot_name="heading",
            alias_name="some-other",
            standalone_block_original="sgs/heading",
            standalone_block_alias="sgs/text",   # DIFFERENT slot
        )
        assert not result["passed"]
        assert result["coverage_note"] == "MR-2-PRECONDITION-FAIL"


# ===========================================================================
# 25. FIX-L — run_canary_proof driver (synthetic probe dict, no browser)
# ===========================================================================

class TestRunCanaryProof:
    """Run the F3-core-B driver on a tiny inline probe dict (no browser, no DB).

    Asserts the emitted artefact matches the §6 schema + the expected verdicts.
    Mirrors the live-fixture shape: a mix of LANDED + UNVERIFIED cells.
    """

    PROBE = {
        "fixture": "proof-fixture",
        "page_url": "https://example.test/canary/",
        "page_loaded": True,
        "sections": [
            {
                "section_id": "section-1",
                "block_slug": "sgs/container",
                "element_selector": ".wp-block-sgs-container",
                "element_present": True,
                "inner_text_len": 120,
                "rendered_height_px": 400.0,
                "draft_height_px": 400.0,
                "cells": [
                    # LANDED — non-default, computed == draft.
                    {"property": "background-color", "tier": "Base",
                     "draft_value": "#2D6A4F", "computed_value": "#2D6A4F",
                     "expected_default": None, "written": True},
                    {"property": "padding", "tier": "Base",
                     "draft_value": "32px", "computed_value": "32px",
                     "expected_default": "0px", "written": True},
                    # UNVERIFIED — draft == default (guard 3).
                    {"property": "font-size", "tier": "Base",
                     "draft_value": "16px", "computed_value": "16px",
                     "expected_default": "16px", "written": True},
                    # UNVERIFIED — lossy serialisation (grid).
                    {"property": "grid-template-columns", "tier": "Desktop",
                     "draft_value": "repeat(4, 1fr)",
                     "computed_value": "300px 300px 300px 300px",
                     "expected_default": None, "written": True},
                ],
            },
        ],
    }

    def _run(self, tmp_path):
        import json as _json
        from oracle.run_canary_proof import main as proof_main

        probe_path = tmp_path / "probe.json"
        probe_path.write_text(_json.dumps(self.PROBE), encoding="utf-8")
        out_dir = tmp_path / "_render-oracle"
        rc = proof_main(["--probe", str(probe_path), "--out-dir", str(out_dir)])
        assert rc == 0
        artefact_path = out_dir / "proof-fixture.landed.json"
        assert artefact_path.exists()
        return _json.loads(artefact_path.read_text(encoding="utf-8"))

    def test_artefact_matches_section6_schema(self, tmp_path):
        art = self._run(tmp_path)
        # §6 root keys (+ provenance page_url the driver adds outside the join schema).
        assert {"fixture", "generated_by", "sections", "plain_summary"} <= set(art.keys())
        sec = art["sections"][0]
        assert set(sec.keys()) == {
            "section_id", "block_slug", "guards", "element_selector", "cells"
        }
        assert set(sec["guards"].keys()) == {"empty", "element", "height", "non_default"}
        for cell in sec["cells"]:
            assert set(cell.keys()) == {
                "property", "tier", "draft_value", "computed_value",
                "expected_default", "verdict",
            }

    def test_expected_verdicts(self, tmp_path):
        art = self._run(tmp_path)
        verdicts = {c["property"]: c["verdict"] for c in art["sections"][0]["cells"]}
        assert verdicts["background-color"] == "LANDED"
        assert verdicts["padding"] == "LANDED"
        assert verdicts["font-size"] == "UNVERIFIED"        # draft == default
        assert verdicts["grid-template-columns"] == "UNVERIFIED"  # lossy

    def test_summary_is_count_based_and_accurate(self, tmp_path):
        art = self._run(tmp_path)
        summary = art["plain_summary"]
        assert "2 LANDED" in summary
        assert "2 UNVERIFIED" in summary
        assert "all cells" not in summary.lower()

    def test_provenance_page_url_recorded(self, tmp_path):
        art = self._run(tmp_path)
        # page_url is provenance, NOT part of the §6 join schema — lives at root.
        assert art["page_url"] == "https://example.test/canary/"

    def test_malformed_probe_fails_closed(self, tmp_path):
        """A probe missing a required field returns rc=1, not a partial report."""
        import json as _json
        from oracle.run_canary_proof import main as proof_main

        bad = {"fixture": "x", "sections": [{"section_id": "s"}]}  # missing block_slug etc.
        probe_path = tmp_path / "bad.json"
        probe_path.write_text(_json.dumps(bad), encoding="utf-8")
        rc = proof_main(["--probe", str(probe_path), "--out-dir", str(tmp_path / "out")])
        assert rc == 1
