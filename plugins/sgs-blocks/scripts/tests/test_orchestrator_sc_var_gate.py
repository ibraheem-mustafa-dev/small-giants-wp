"""
test_orchestrator_sc_var_gate.py
=================================
Pytest suite covering the sc_var Tier (2026-09-14, "connect the pieces"
follow-up to D1057/D1058/D1061/D1062/D1064) -- the opt-in
--sc-var-min-confidence gate that lets a classless Claude Design boundary
carrying a Piece 1 sc_var_hint through Stage 4's cv2-eligibility check,
mirroring the existing Tier 0 (D1034) lingua_franca pattern exactly.

Also covers the tagged-mockup element-relocation fix: a classless boundary's
`_sec_el` is looked up via `data-sgs-boundary-id` when a tagged mockup copy
exists (see per-section-convention-voter.py::write_tagged_mockup),
independent of the sc_var gate itself.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_orchestrator_sc_var_gate.py -v

UK English throughout.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import types
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPTS_DIR = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
_ORCHESTRATOR_PATH = _SCRIPTS_DIR / "sgs-clone-orchestrator.py"
_RECOGNISER_DIR = _SCRIPTS_DIR / "recogniser"

if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))


def _load_orchestrator() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(
        "sgs_clone_orchestrator_sc_var_test", str(_ORCHESTRATOR_PATH)
    )
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_orch = _load_orchestrator()


def _make_args(
    *,
    sc_var_min_confidence: float | None = None,
    dom_shape_min_confidence: float | None = None,
    section: str = "section",
    mockup: Path | None = None,
    client: str = "test-client",
) -> argparse.Namespace:
    _mockup = mockup or (_SCRIPTS_DIR / "tests" / "__init__.py")
    return argparse.Namespace(
        converter_v2=True,
        section=section,
        mockup=_mockup,
        client=client,
        no_playwright=True,
        media_map=None,
        viewport=None,
        debug_trace=False,
        mode="production",
        auto_section=False,
        sc_var_min_confidence=sc_var_min_confidence,
        dom_shape_min_confidence=dom_shape_min_confidence,
    )


def _make_match_output(
    boundary_id: str = "boundary-0",
    section_id: str = "section-0",
    block_name: str = "sgs/container",
    confidence: float = 0.9,
) -> dict:
    # confidence=0.9 (matching test_orchestrator_non_bem_halt.py's own
    # convention) so these tests exercise the REAL gate (Tier 0 / sc_var
    # tier / final hard-halt) rather than the earlier confidence==0
    # "unmatched, operator review" sentinel, which is a different code path
    # entirely and would mask what these tests are actually checking.
    return {
        "matches": [
            {
                "boundary_id": boundary_id,
                "section_id": section_id,
                "block_name": block_name,
                "confidence": confidence,
            }
        ]
    }


def _make_voter_dict(
    boundary_id: str = "boundary-0",
    selector: str = "section",
    class_signature: list[str] | None = None,
    sc_var_hint: dict | None = None,
    dom_shape_hint: dict | None = None,
) -> dict:
    boundary: dict[str, Any] = {
        "boundary_id": boundary_id,
        "selector": selector,
        "class_signature": class_signature or [],
        "section_id": "section-0",
    }
    if sc_var_hint is not None:
        boundary["sc_var_hint"] = sc_var_hint
    if dom_shape_hint is not None:
        boundary["dom_shape_hint"] = dom_shape_hint
    return {"boundaries": [boundary]}


def _write_mockup_html(tmp_path: Path, tag: str = "section") -> Path:
    mockup_path = tmp_path / "mockup.html"
    mockup_path.write_text(f"<html><body><{tag}><p>Hi</p></{tag}></body></html>", encoding="utf-8")
    return mockup_path


# ---------------------------------------------------------------------------
# 1. sc_var Tier admits a classless boundary when threshold met
# ---------------------------------------------------------------------------

class TestScVarTierGate:
    def test_classless_boundary_with_sc_var_hint_does_not_hard_halt(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "run-sc-var-admit"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path)

        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    sc_var_hint={"block": "sgs/testimonial", "confidence": 0.4, "evidence": "test"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        fake_convert = MagicMock(return_value={
            "status": "complete",
            "block_name": "sgs/testimonial",
            "block_markup": "<!-- wp:sgs/testimonial /-->",
            "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert len(per_section) == 1
        assert per_section[0]["status"] != "unmatched-non-bem-compliant", (
            f"A classless boundary with a qualifying sc_var_hint must not hard-halt. "
            f"Got status={per_section[0]['status']!r}."
        )
        fake_convert.assert_called_once()

    def test_below_threshold_still_hard_halts(self, tmp_path: Path) -> None:
        """Fail-closed: an sc_var_hint below the requested threshold must not admit."""
        run_dir = tmp_path / "run-sc-var-below-threshold"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    sc_var_hint={"block": "sgs/testimonial", "confidence": 0.2, "evidence": "test"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.5)  # threshold above the hint's own confidence
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "An sc_var_hint below --sc-var-min-confidence must still hard-halt. "
            f"Got status={per_section[0]['status']!r}."
        )

    def test_sc_var_count_source_admits_but_injects_no_class(self, tmp_path: Path) -> None:
        """Real regression found AND rolled back live (2026-09-14), in two
        steps -- both load-bearing here:

        Step 1 (the actual bug): Stage 4 used to inject "sgs-<slug>" onto a
        sc_var-admitted boundary's root element (mirroring Tier 0). For
        Tier A's count-based fallback (source='sc_var_count', names
        "card-grid" -- the REPEATED GROUP's shape, not this individual
        item's own identity), that injection forced the converter to treat
        a small/atomic leaf element (a button, a span) as a whole
        composite block, collapsing 17 real conversions to 2
        (ContentConservationError: "recursed to N results with ZERO
        content blocks").

        Step 2 (the overcorrection, ALSO reverted): excluding sc_var_count
        from eligibility ENTIRELY. Verified live this cost real
        recognition (414 -> 96 attrs extracted) for no benefit -- once the
        class-injection was removed, letting these boundaries through was
        always safe; the converter's OWN internal atomic-tag recognition
        handled them correctly with no injected identity at all.

        Net state this test proves: a sc_var_count-sourced hint DOES admit
        (eligibility is source-agnostic), but the HTML handed to the
        converter carries NO injected class -- the fix that actually
        mattered."""
        run_dir = tmp_path / "run-sc-var-count-admits-no-inject"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path, tag="button")
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    sc_var_hint={"block": "card-grid", "confidence": 0.5, "evidence": "test", "source": "sc_var_count"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)
        fake_convert = MagicMock(return_value={
            "status": "complete", "block_name": "sgs/button",
            "block_markup": "<!-- wp:sgs/button /-->", "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert):
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] != "unmatched-non-bem-compliant", (
            "sc_var_count must still ADMIT the boundary (eligibility is source-agnostic). "
            f"Got status={per_section[0]['status']!r}."
        )
        fake_convert.assert_called_once()
        _, call_kwargs = fake_convert.call_args
        html_seen = call_kwargs.get("html", "")
        assert "sgs-" not in html_seen, (
            f"No class should ever be injected for the sc_var Tier -- got html={html_seen!r}"
        )

    def test_alias_sourced_hint_still_admits_normally(self, tmp_path: Path) -> None:
        """Positive control alongside the exclusion above: a REAL per-item
        identity signal (source='sc_var_alias', a genuine slots.aliases
        hit) must still admit normally -- the exclusion is scoped to
        sc_var_count specifically, not to sc_var_hint as a whole."""
        run_dir = tmp_path / "run-sc-var-alias-still-admits"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path)
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    sc_var_hint={"block": "sgs/info-box", "confidence": 0.4, "evidence": "test", "source": "sc_var_alias"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)
        fake_convert = MagicMock(return_value={
            "status": "complete", "block_name": "sgs/info-box",
            "block_markup": "<!-- wp:sgs/info-box /-->", "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert):
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] != "unmatched-non-bem-compliant"
        fake_convert.assert_called_once()

    def test_flag_omitted_still_hard_halts_even_with_a_strong_hint(self, tmp_path: Path) -> None:
        """The load-bearing negative control: --sc-var-min-confidence is None
        (omitted, today's default) -- a boundary must hard-halt EXACTLY as
        before this feature existed, no matter how confident its sc_var_hint
        is. Proves the flag is genuinely opt-in, not silently always-on."""
        run_dir = tmp_path / "run-sc-var-flag-omitted"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    sc_var_hint={"block": "sgs/testimonial", "confidence": 0.5, "evidence": "test"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=None)  # the default -- flag not passed
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "Omitting --sc-var-min-confidence must be a true no-op -- a boundary "
            f"must still hard-halt. Got status={per_section[0]['status']!r}."
        )

    def test_no_sc_var_hint_still_hard_halts_even_with_flag_set(self, tmp_path: Path) -> None:
        """A boundary with no sc_var_hint at all (the overwhelming majority
        case, including non-Claude-Design drafts) must be unaffected by the
        flag being set for a DIFFERENT boundary/run."""
        run_dir = tmp_path / "run-sc-var-no-hint"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(_make_voter_dict(class_signature=["some-external-class"])),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.0)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant"


# ---------------------------------------------------------------------------
# 1b. dom_shape Tier (2026-09-14, "the 20 real gaps" follow-up)
# ---------------------------------------------------------------------------

class TestDomShapeTierGate:
    def test_classless_boundary_with_dom_shape_hint_does_not_hard_halt(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "run-dom-shape-admit"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path)

        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    dom_shape_hint={"block": "sgs/card-grid", "confidence": 0.45, "evidence": "3 near-identical siblings", "source": "dom_shape"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(dom_shape_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)
        fake_convert = MagicMock(return_value={
            "status": "complete", "block_name": "sgs/card-grid",
            "block_markup": "<!-- wp:sgs/card-grid /-->", "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] != "unmatched-non-bem-compliant", (
            f"A classless boundary with a qualifying dom_shape_hint must not hard-halt. "
            f"Got status={per_section[0]['status']!r}."
        )
        fake_convert.assert_called_once()

    def test_below_threshold_still_hard_halts(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "run-dom-shape-below-threshold"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    dom_shape_hint={"block": "sgs/hero", "confidence": 0.2, "evidence": "test", "source": "dom_shape"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(dom_shape_min_confidence=0.5)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "A dom_shape_hint below --dom-shape-min-confidence must still hard-halt. "
            f"Got status={per_section[0]['status']!r}."
        )

    def test_flag_omitted_still_hard_halts_even_with_a_strong_hint(self, tmp_path: Path) -> None:
        """Genuinely opt-in: --dom-shape-min-confidence is None (omitted,
        today's default) -- a boundary must hard-halt exactly as before this
        Tier existed, no matter how confident its dom_shape_hint is."""
        run_dir = tmp_path / "run-dom-shape-flag-omitted"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    dom_shape_hint={"block": "sgs/hero", "confidence": 0.5, "evidence": "test", "source": "dom_shape"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(dom_shape_min_confidence=None)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "Omitting --dom-shape-min-confidence must be a true no-op -- a boundary "
            f"must still hard-halt. Got status={per_section[0]['status']!r}."
        )

    def test_no_class_ever_injected_for_dom_shape_tier(self, tmp_path: Path) -> None:
        """dom_shape_hint's own 'card-grid' fallback names the REPEATED
        GROUP's shape, not an individual item's identity -- the exact same
        risk profile as sc_var_count (see the class-injection regression
        note above). This Tier must never inject a class, full stop."""
        run_dir = tmp_path / "run-dom-shape-no-inject"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path, tag="button")
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    dom_shape_hint={"block": "sgs/card-grid", "confidence": 0.5, "evidence": "test", "source": "dom_shape"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(dom_shape_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)
        fake_convert = MagicMock(return_value={
            "status": "complete", "block_name": "sgs/button",
            "block_markup": "<!-- wp:sgs/button /-->", "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert):
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] != "unmatched-non-bem-compliant"
        fake_convert.assert_called_once()
        _, call_kwargs = fake_convert.call_args
        html_seen = call_kwargs.get("html", "")
        assert "sgs-" not in html_seen, (
            f"No class should ever be injected for the dom_shape Tier -- got html={html_seen!r}"
        )

    def test_sc_var_tier_takes_priority_over_dom_shape_when_both_present(self, tmp_path: Path) -> None:
        """A boundary carrying BOTH hints must admit via the STRONGER sc_var
        signal -- dom_shape's gate checks `not _cv2_eligible`, so it must
        never re-fire (or override) once sc_var already admitted."""
        run_dir = tmp_path / "run-both-hints-sc-var-wins"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path)
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=[],
                    sc_var_hint={"block": "sgs/testimonial", "confidence": 0.4, "evidence": "test", "source": "sc_var_alias"},
                    dom_shape_hint={"block": "sgs/card-grid", "confidence": 0.45, "evidence": "test", "source": "dom_shape"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.0, dom_shape_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)
        fake_convert = MagicMock(return_value={
            "status": "complete", "block_name": "sgs/testimonial",
            "block_markup": "<!-- wp:sgs/testimonial /-->", "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert):
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] != "unmatched-non-bem-compliant"
        assert per_section[0].get("admitted_via_sc_var_gate") is True
        assert per_section[0].get("admitted_via_dom_shape_gate") is False, (
            "dom_shape must not also claim credit once sc_var already admitted this boundary."
        )


# ---------------------------------------------------------------------------
# 2. Tagged-mockup element relocation
# ---------------------------------------------------------------------------

class TestTaggedMockupRelocation:
    def test_second_classless_boundary_resolves_its_own_element_not_the_first(
        self, tmp_path: Path
    ) -> None:
        """The real bug this fixes: without a tagged mockup, a classless
        boundary's _sec_el lookup falls to a bare tag+class(=None) find(),
        which BS4 always resolves to the FIRST element of that tag --
        regardless of which boundary is actually being processed. This test
        asks for the SECOND `<section>`'s boundary and asserts the HTML
        handed to the converter is the second section's content, not the
        first's."""
        run_dir = tmp_path / "run-tagged-relocation"
        run_dir.mkdir()
        mockup_path = tmp_path / "mockup.html"
        mockup_path.write_text(
            "<html><body><section><p>First section</p></section>"
            "<section><p>Second section</p></section></body></html>",
            encoding="utf-8",
        )

        # Simulate Stage 1's write_tagged_mockup output directly (same shape
        # write_tagged_mockup produces -- b1=first section, b2=second).
        sys.path.insert(0, str(_RECOGNISER_DIR))
        import importlib.util as _ilu
        _voter_spec = _ilu.spec_from_file_location(
            "voter_for_tagged_test", _RECOGNISER_DIR / "per-section-convention-voter.py"
        )
        _voter = _ilu.module_from_spec(_voter_spec)
        _voter_spec.loader.exec_module(_voter)
        tagged_path = run_dir / "tagged-mockup.html"
        tagged_count = _voter.write_tagged_mockup(mockup_path, tagged_path)
        assert tagged_count == 2

        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    boundary_id="b2",
                    class_signature=[],
                    sc_var_hint={"block": "sgs/quote", "confidence": 0.4, "evidence": "test"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output(boundary_id="b2")

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        fake_convert = MagicMock(return_value={
            "status": "complete", "block_name": "sgs/quote",
            "block_markup": "<!-- wp:sgs/quote /-->", "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert):
            _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        fake_convert.assert_called_once()
        _, call_kwargs = fake_convert.call_args
        html_seen = call_kwargs.get("html", "")
        assert "Second section" in html_seen, (
            f"Expected boundary b2 to resolve to the SECOND section's content. "
            f"Got html={html_seen!r} -- if this contains 'First section' instead, "
            f"the tagged-mockup relocation fix has regressed to the old "
            f"first-match-wins bug."
        )
        assert "First section" not in html_seen

    def test_data_sgs_boundary_id_attribute_is_stripped_from_emitted_html(
        self, tmp_path: Path
    ) -> None:
        """The tagging attribute is pipeline bookkeeping, never real draft
        markup -- it must not leak into what the converter actually sees."""
        run_dir = tmp_path / "run-tagged-strip"
        run_dir.mkdir()
        mockup_path = tmp_path / "mockup.html"
        mockup_path.write_text("<html><body><section><p>Only section</p></section></body></html>", encoding="utf-8")

        sys.path.insert(0, str(_RECOGNISER_DIR))
        import importlib.util as _ilu
        _voter_spec = _ilu.spec_from_file_location(
            "voter_for_strip_test", _RECOGNISER_DIR / "per-section-convention-voter.py"
        )
        _voter = _ilu.module_from_spec(_voter_spec)
        _voter_spec.loader.exec_module(_voter)
        tagged_path = run_dir / "tagged-mockup.html"
        _voter.write_tagged_mockup(mockup_path, tagged_path)

        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    boundary_id="b1",
                    class_signature=[],
                    sc_var_hint={"block": "sgs/quote", "confidence": 0.4, "evidence": "test"},
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(sc_var_min_confidence=0.0, mockup=mockup_path)
        match_output = _make_match_output(boundary_id="b1")

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)
        fake_convert = MagicMock(return_value={
            "status": "complete", "block_name": "sgs/quote",
            "block_markup": "<!-- wp:sgs/quote /-->", "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert):
            _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, {"theme_json": {}})

        _, call_kwargs = fake_convert.call_args
        assert "data-sgs-boundary-id" not in call_kwargs.get("html", "")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
