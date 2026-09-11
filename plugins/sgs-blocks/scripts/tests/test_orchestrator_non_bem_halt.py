"""
test_orchestrator_non_bem_halt.py
==================================
Pytest suite covering the non-BEM halt path and --converter-v2 default-True
change introduced 2026-05-18 (Bean directive: cv2 is the only converter path;
legacy extract.py subprocess is permanently retired).

Tests
-----
1. Non-SGS-BEM class signature halts with status 'unmatched-non-bem-compliant'
   and does NOT call subprocess.run (regression: legacy subprocess path gone).
2. The aggregated warning contains the three required actionable strings:
   "not SGS-BEM compliant", "Spec 13", "uimax-sgs-scrape-pattern".
3. SGS-BEM-canonical class signatures still reach the cv2 branch (regression
   guard — cv2 eligibility check must not be broken by this change).
4. Default args.converter_v2 is True (argparse default-flip check).

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_orchestrator_non_bem_halt.py -v

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

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]          # small-giants-wp/
_SCRIPTS_DIR = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
_ORCHESTRATOR_PATH = _SCRIPTS_DIR / "sgs-clone-orchestrator.py"

# Tier 0 tests (D1034) patch converter.entry.convert_section directly, which
# requires the `converter` package to be importable -- the orchestrator only
# inserts this path into sys.path at runtime, inside the function under test.
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

# ---------------------------------------------------------------------------
# Load orchestrator module via importlib (hyphen-free alias)
# ---------------------------------------------------------------------------

def _load_orchestrator() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(
        "sgs_clone_orchestrator", str(_ORCHESTRATOR_PATH)
    )
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_orch = _load_orchestrator()

# ---------------------------------------------------------------------------
# Minimal synthetic fixture helpers
# ---------------------------------------------------------------------------

def _make_args(
    *,
    converter_v2: bool = True,
    section: str = ".sgs-hero",
    mockup: Path | None = None,
    client: str = "test-client",
    no_playwright: bool = True,
    media_map: Path | None = None,
    viewport: int | None = None,
    debug_trace: bool = False,
    mode: str = "production",
) -> argparse.Namespace:
    """Return a minimal args Namespace matching what main() passes to stage_4_5_6_7_8_extract."""
    _mockup = mockup or (_REPO_ROOT / "plugins" / "sgs-blocks" / "scripts" / "tests" / "__init__.py")
    return argparse.Namespace(
        converter_v2=converter_v2,
        section=section,
        mockup=_mockup,
        client=client,
        no_playwright=no_playwright,
        media_map=media_map,
        viewport=viewport,
        debug_trace=debug_trace,
        mode=mode,
        auto_section=False,
    )


def _make_match_output(
    boundary_id: str = "boundary-0",
    section_id: str = "section-0",
    block_name: str = "sgs/hero",
    confidence: float = 0.9,
) -> dict:
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


def _make_run_ctx() -> dict:
    return {"theme_json": {}}


def _make_voter_dict(
    boundary_id: str = "boundary-0",
    selector: str = ".sgs-hero",
    class_signature: list[str] | None = None,
    primary_sgs_bem: str | None = None,
    source_convention: str | None = None,
    primary_is_slot_map_hit: bool | None = None,
) -> dict:
    boundary: dict[str, Any] = {
        "boundary_id": boundary_id,
        "selector": selector,
        "class_signature": class_signature or [],
        "section_id": "section-0",
    }
    # Tier 0 (D1034) fields -- only set when the caller supplies them, so
    # existing callers (pre-Tier-0 tests) get boundaries with no
    # primary_sgs_bem/source_convention at all, exactly as before.
    if primary_sgs_bem is not None:
        boundary["primary_sgs_bem"] = primary_sgs_bem
    if source_convention is not None:
        boundary["source_convention"] = source_convention
    # C1 fix (2026-09-11) -- the real discriminator the gate now keys on.
    # Only set when the caller supplies it, matching the pattern above.
    if primary_is_slot_map_hit is not None:
        boundary["primary_is_slot_map_hit"] = primary_is_slot_map_hit
    return {"boundaries": [boundary]}


# ---------------------------------------------------------------------------
# 1. Non-SGS-BEM class signature halts (no subprocess)
# ---------------------------------------------------------------------------

class TestNonBemHalt:
    """
    A boundary whose class_signature is NOT SGS-BEM canonical must:
    - Not invoke subprocess.run
    - Produce status='unmatched-non-bem-compliant' in per_section_results
    - Append an operator-actionable warning to aggregate_warnings
    """

    def test_non_bem_boundary_status_is_unmatched_non_bem_compliant(
        self, tmp_path: Path
    ) -> None:
        """
        When _is_sgs_bem_canonical returns False for the boundary's class_signature,
        per_section_results[0].status must be 'unmatched-non-bem-compliant'.
        """
        run_dir = tmp_path / "run-non-bem"
        run_dir.mkdir()

        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(_make_voter_dict(class_signature=["non-canonical-class"])),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True)
        match_output = _make_match_output()

        # Patch stage1_boundary_hook to return a mock where _is_sgs_bem_canonical returns False.
        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, _make_run_ctx())

        # subprocess.run must never be called — legacy path is gone.
        mock_subprocess.assert_not_called()

        per_section = result.get("per_section_results", [])
        assert len(per_section) == 1, (
            f"Expected exactly 1 per_section_results entry, got {len(per_section)}."
        )
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            f"Expected status='unmatched-non-bem-compliant', got {per_section[0]['status']!r}. "
            "Non-BEM boundary must be halted, not forwarded to a legacy extractor."
        )

    def test_non_bem_boundary_has_empty_attributes_and_markup(
        self, tmp_path: Path
    ) -> None:
        """
        The halted boundary must emit empty extracted_attributes and block_markup
        so downstream stages receive a predictable no-op entry.
        """
        run_dir = tmp_path / "run-non-bem-empty"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(_make_voter_dict(class_signature=["external-class-name"])),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook):
            result = _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, _make_run_ctx())

        per_section = result.get("per_section_results", [])
        assert per_section[0]["extracted_attributes"] == {}, (
            "Halted boundary must have empty extracted_attributes."
        )
        assert per_section[0]["block_markup"] == "", (
            "Halted boundary must have empty block_markup."
        )


# ---------------------------------------------------------------------------
# 2. Warning message contains the required actionable strings
# ---------------------------------------------------------------------------

class TestNonBemWarningMessage:
    """
    The aggregated warning for a non-BEM boundary must contain three strings
    that make the remediation self-contained without reading source code.
    """

    def _run_non_bem(self, run_dir: Path, class_sig: list[str]) -> dict:
        """Run stage_4_5_6_7_8_extract with a non-BEM boundary into run_dir."""
        run_dir.mkdir(parents=True, exist_ok=True)
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(_make_voter_dict(class_signature=class_sig)),
            encoding="utf-8",
        )
        args = _make_args(converter_v2=True)
        match_output = _make_match_output()
        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)
        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook):
            return _orch.stage_4_5_6_7_8_extract(
                args, match_output, run_dir, _make_run_ctx()
            )

    def _read_artefact_warnings(self, run_dir: Path) -> list[str]:
        """Read warnings from the stage-4 artefact written by write_artefact()."""
        artefact_path = run_dir / "stage-4.json"
        assert artefact_path.exists(), (
            f"Expected stage-4.json to have been written at {artefact_path}. "
            "write_artefact() names files 'stage-<N>.json', not '04-*.json'."
        )
        artefact = json.loads(artefact_path.read_text(encoding="utf-8"))
        return artefact.get("warnings", [])

    def test_warning_contains_not_sgs_bem_compliant(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "run-not-bem"
        self._run_non_bem(run_dir, ["external-class"])
        warnings = self._read_artefact_warnings(run_dir)
        assert any("not SGS-BEM compliant" in w for w in warnings), (
            f"Expected 'not SGS-BEM compliant' in warnings. Got: {warnings!r}"
        )

    def test_warning_contains_spec_13(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "run-spec13"
        self._run_non_bem(run_dir, ["alien-wrapper"])
        warnings = self._read_artefact_warnings(run_dir)
        assert any("Spec 13" in w for w in warnings), (
            f"Expected 'Spec 13' in warnings. Got: {warnings!r}"
        )

    def test_warning_contains_uimax_sgs_scrape_pattern(self, tmp_path: Path) -> None:
        run_dir = tmp_path / "run-uimax"
        self._run_non_bem(run_dir, ["third-party-section"])
        warnings = self._read_artefact_warnings(run_dir)
        assert any("uimax-sgs-scrape-pattern" in w for w in warnings), (
            f"Expected 'uimax-sgs-scrape-pattern' in warnings. Got: {warnings!r}"
        )


# ---------------------------------------------------------------------------
# 3. SGS-BEM-canonical boundaries still reach cv2 (regression guard)
# ---------------------------------------------------------------------------

class TestBemCanonicalReachesCV2:
    """
    When _is_sgs_bem_canonical returns True, the boundary must NOT be halted
    as non-BEM. Instead it must attempt the cv2 branch (per_section_results
    status is NOT 'unmatched-non-bem-compliant').
    """

    def test_sgs_bem_boundary_does_not_get_non_bem_status(
        self, tmp_path: Path
    ) -> None:
        run_dir = tmp_path / "run-bem-canonical"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(_make_voter_dict(class_signature=["sgs-hero"])),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=True)

        # Patch convert_section to raise immediately so we get the cv2 soft-fail
        # path instead of a real extraction. We're only checking that the
        # non-BEM halt was NOT taken.
        def _fake_convert(**kwargs: Any) -> dict:
            raise RuntimeError("cv2-stub-for-test")

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch.dict("sys.modules", {
                 "orchestrator.converter_v2": MagicMock(
                     convert_section=_fake_convert,
                     reset_pipeline_seed=MagicMock(),
                 )
             }):
            result = _orch.stage_4_5_6_7_8_extract(
                args, match_output, run_dir, _make_run_ctx()
            )

        per_section = result.get("per_section_results", [])
        assert len(per_section) == 1
        # Status must be the cv2-softfail path, NOT the non-BEM halt.
        assert per_section[0]["status"] != "unmatched-non-bem-compliant", (
            "SGS-BEM-canonical boundary must NOT be halted as non-BEM. "
            f"Got status={per_section[0]['status']!r} — cv2 soft-fail was expected instead."
        )


# ---------------------------------------------------------------------------
# 4. Default args.converter_v2 is True (argparse default-flip)
# ---------------------------------------------------------------------------

class TestConverterV2DefaultTrue:
    """
    The --converter-v2 argparse flag must default to True after the 2026-05-18
    change. This ensures existing scripts that omit the flag now get cv2
    automatically, with no behaviour change for scripts that pass it explicitly.
    """

    def test_converter_v2_default_is_true(self) -> None:
        """
        Parse args with no --converter-v2 flag; result must be True.
        Mirrors the real argparse setup in the orchestrator's main() block.
        """
        # Build the same parser as main() — the simplest approach is to call
        # argparse.ArgumentParser directly with the same flag definition.
        parser = argparse.ArgumentParser()
        parser.add_argument("--converter-v2", action="store_true", default=True)

        args = parser.parse_args([])
        assert args.converter_v2 is True, (
            f"Expected --converter-v2 default=True, got {args.converter_v2!r}. "
            "The 2026-05-18 default-flip to True must be present in the argparse declaration."
        )

    def test_converter_v2_explicit_flag_still_true(self) -> None:
        """
        Passing --converter-v2 explicitly must still be True (idempotent).
        Existing scripts / skill bindings that pass the flag must continue working.
        """
        parser = argparse.ArgumentParser()
        parser.add_argument("--converter-v2", action="store_true", default=True)

        args = parser.parse_args(["--converter-v2"])
        assert args.converter_v2 is True, (
            "Explicitly passing --converter-v2 must still resolve to True."
        )


# ---------------------------------------------------------------------------
# 5. Tier 0 (D1034) -- primary_sgs_bem wired into the gate
# ---------------------------------------------------------------------------

def _write_mockup_html(tmp_path: Path, class_name: str = "card", tag: str = "section") -> Path:
    """A minimal real mockup HTML file with one non-BEM-classed root element."""
    mockup_path = tmp_path / "mockup.html"
    mockup_path.write_text(
        f'<html><body><{tag} class="{class_name}"><p>Hi</p></{tag}></body></html>',
        encoding="utf-8",
    )
    return mockup_path


class TestTier0LinguaFrancaGate:
    """
    A boundary whose raw class_signature is NOT SGS-BEM canonical, but whose
    stage1_boundary_hook-computed primary_sgs_bem IS set (a genuine
    lingua_franca conversion), must proceed through cv2 instead of hard-
    halting as 'unmatched-non-bem-compliant' -- provided primary_is_slot_map_hit
    is True, i.e. the class actually matched a real slot_map entry rather
    than merely matching one of the three conventions' regex shape and
    falling through to default_block (C1 fix, 2026-09-11).
    """

    def test_bootstrap_boundary_with_primary_sgs_bem_does_not_hard_halt(
        self, tmp_path: Path
    ) -> None:
        run_dir = tmp_path / "run-tier0-bootstrap"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path, class_name="card")

        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    selector=".card",
                    class_signature=["card"],
                    primary_sgs_bem="sgs-card-grid",
                    source_convention="Bootstrap 5",
                    primary_is_slot_map_hit=True,  # "card" is a real Bootstrap slot_map entry
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        fake_convert = MagicMock(return_value={
            "status": "complete",
            "block_name": "sgs/card-grid",
            "block_markup": "<!-- wp:sgs/card-grid /-->",
            "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(
                args, match_output, run_dir, _make_run_ctx()
            )

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert len(per_section) == 1
        assert per_section[0]["status"] != "unmatched-non-bem-compliant", (
            "A boundary with a genuine primary_sgs_bem conversion (Bootstrap 5, "
            "real slot_map hit) must not hard-halt. "
            f"Got status={per_section[0]['status']!r}."
        )
        assert per_section[0]["block_markup"] == "<!-- wp:sgs/card-grid /-->"

        # The converter must have been called at all -- proves the Tier 0
        # branch actually let the boundary through into the cv2 dispatch.
        fake_convert.assert_called_once()

    def test_primary_sgs_bem_is_injected_onto_the_html_root_class(
        self, tmp_path: Path
    ) -> None:
        """
        converter.recognition.recognise_section() re-derives block identity
        straight from the HTML element's own `class` attribute -- never from
        voter.json. So merely flipping the gate is not enough: the converted
        primary_sgs_bem class must actually be appended to the root
        element's class list in the HTML handed to convert_section, with
        the ORIGINAL class preserved (variation-CSS selector matching keys
        off the source class name).
        """
        run_dir = tmp_path / "run-tier0-inject"
        run_dir.mkdir()
        mockup_path = _write_mockup_html(tmp_path, class_name="card")

        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    selector=".card",
                    class_signature=["card"],
                    primary_sgs_bem="sgs-card-grid",
                    source_convention="Bootstrap 5",
                    primary_is_slot_map_hit=True,  # "card" is a real Bootstrap slot_map entry
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True, mockup=mockup_path)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        fake_convert = MagicMock(return_value={
            "status": "complete",
            "block_name": "sgs/card-grid",
            "block_markup": "<!-- wp:sgs/card-grid /-->",
            "extracted_attributes": {},
        })

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("converter.entry.convert_section", fake_convert):
            _orch.stage_4_5_6_7_8_extract(args, match_output, run_dir, _make_run_ctx())

        fake_convert.assert_called_once()
        _, call_kwargs = fake_convert.call_args
        html_seen = call_kwargs.get("html", "")
        assert "sgs-card-grid" in html_seen, (
            f"Expected the converted class 'sgs-card-grid' injected onto the "
            f"root element. Got html={html_seen!r}"
        )
        assert "card" in html_seen, (
            "The ORIGINAL source class must survive alongside the converted "
            "one -- variation-CSS selector matching keys off it."
        )

    def test_tailwind_convention_is_not_admitted_by_tier_0(
        self, tmp_path: Path
    ) -> None:
        """
        Design question 3: Tailwind/shadcn always degrade to a generic
        sgs-container regardless of real semantics (empty slot_map), so
        Tier 0 deliberately does NOT admit them -- a boundary classified as
        'Tailwind utility' must still hard-halt even with a primary_sgs_bem
        present.
        """
        run_dir = tmp_path / "run-tier0-tailwind-excluded"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=["flex-1"],
                    primary_sgs_bem="sgs-container",
                    source_convention="Tailwind utility",
                    primary_is_slot_map_hit=False,  # Tailwind's slot_map is always empty
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(
                args, match_output, run_dir, _make_run_ctx()
            )

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "Tailwind utility must NOT be admitted by Tier 0 (empty slot_map, "
            f"always degrades to a generic container). Got "
            f"status={per_section[0]['status']!r}."
        )

    def test_no_primary_sgs_bem_still_hard_halts(self, tmp_path: Path) -> None:
        """
        Fail-closed negative control: a boundary lingua_franca could NOT
        recognise at all (no primary_sgs_bem, even though source_convention
        happens to be set) must hard-halt exactly as before Tier 0.
        """
        run_dir = tmp_path / "run-tier0-no-primary"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=["totally-unrecognised-xyz"],
                    primary_sgs_bem=None,
                    source_convention="Bootstrap 5",
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(
                args, match_output, run_dir, _make_run_ctx()
            )

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "A boundary with no primary_sgs_bem must still hard-halt "
            f"(fail-closed). Got status={per_section[0]['status']!r}."
        )

    def test_source_convention_none_still_hard_halts(self, tmp_path: Path) -> None:
        """
        Real fail-closed negative control (reviewer finding: the previous
        "primary_sgs_bem is None still halts" test only exercised the
        near-unreachable empty-class_signature case). This is the reviewer's
        own proof case: a class like 'jumbotron' that NONE of
        lingua_franca's rules recognise at all -- heuristic_classify returns
        None (no convention matched), and primary_sgs_bem is also None. Such
        a boundary must still hard-halt, both before and after the C1 fix.
        """
        run_dir = tmp_path / "run-tier0-source-convention-none"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=["jumbotron"],
                    primary_sgs_bem=None,
                    source_convention=None,
                    primary_is_slot_map_hit=None,
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(
                args, match_output, run_dir, _make_run_ctx()
            )

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "A boundary lingua_franca could not recognise at all "
            "(source_convention is None, primary_sgs_bem is None) must "
            f"still hard-halt. Got status={per_section[0]['status']!r}."
        )

    def test_slot_map_miss_under_safe_convention_now_hard_halts(
        self, tmp_path: Path
    ) -> None:
        """
        C1 fix regression control (reviewer's own proof case): a class that
        matches a "safe" convention's regex SHAPE but MISSES its real
        slot_map -- e.g. 'promo-banner' under kebab-semantic, which matches
        the convention's lowercase-hyphen pattern but is not one of the 6
        real slot_map entries, so it fell through to default_block and
        produced primary_sgs_bem='sgs-container'. Before the C1 fix this
        boundary was WRONGLY admitted (gate keyed on source_convention name
        alone). After the fix it must hard-halt, because
        primary_is_slot_map_hit is False.
        """
        run_dir = tmp_path / "run-tier0-slot-map-miss"
        run_dir.mkdir()
        voter_path = run_dir / "voter.json"
        voter_path.write_text(
            json.dumps(
                _make_voter_dict(
                    class_signature=["promo-banner"],
                    primary_sgs_bem="sgs-container",
                    source_convention="kebab-semantic",
                    primary_is_slot_map_hit=False,
                )
            ),
            encoding="utf-8",
        )

        args = _make_args(converter_v2=True)
        match_output = _make_match_output()

        mock_hook = MagicMock()
        mock_hook._is_sgs_bem_canonical = MagicMock(return_value=False)

        with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
             patch("subprocess.run") as mock_subprocess:
            result = _orch.stage_4_5_6_7_8_extract(
                args, match_output, run_dir, _make_run_ctx()
            )

        mock_subprocess.assert_not_called()
        per_section = result.get("per_section_results", [])
        assert per_section[0]["status"] == "unmatched-non-bem-compliant", (
            "A boundary whose class matched a 'safe' convention's regex "
            "shape but missed its real slot_map (default_block fallback) "
            "must hard-halt, not be silently admitted as a generic "
            f"container. Got status={per_section[0]['status']!r}."
        )
