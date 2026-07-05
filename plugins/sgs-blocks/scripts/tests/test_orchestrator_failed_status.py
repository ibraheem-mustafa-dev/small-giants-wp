"""
test_orchestrator_failed_status.py
===================================
Regression suite for the Rule-4 loud-failure path added by the post-programme
QC session (2026-07-05): converter/entry.py returns status:'failed' +
failure_reason (its Step-16 loud contract), and the orchestrator must surface
that — never silently drop the section while reporting 'complete'.

Tests
-----
1. A planted convert_section status:'failed' produces: an aggregate_errors
   entry (stage-4 artefact status flips to 'failed'), a per_section_results
   entry with status 'failed' + failure_reason, and NO markup contribution.
2. The Stage-9 operator queue catches status 'failed'.
3. The Stage-9 operator queue catches 'unmatched-cv2-softfail' and
   'unmatched-non-bem-compliant' (their comments always intended this; the
   old exact-match filter missed them).

Run from the canonical cwd plugins/sgs-blocks/scripts:
    python -m pytest tests/test_orchestrator_failed_status.py -q --import-mode=importlib

UK English throughout.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Load orchestrator module via importlib (hyphen in filename)
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]          # small-giants-wp/
_SCRIPTS_DIR = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
_ORCHESTRATOR_PATH = _SCRIPTS_DIR / "sgs-clone-orchestrator.py"


def _load_orchestrator() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(
        "sgs_clone_orchestrator_failed_status", str(_ORCHESTRATOR_PATH)
    )
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_orch = _load_orchestrator()

# ---------------------------------------------------------------------------
# Synthetic fixture helpers (mirrors test_orchestrator_non_bem_halt.py)
# ---------------------------------------------------------------------------


def _make_args() -> argparse.Namespace:
    return argparse.Namespace(
        converter_v2=True,
        section=".sgs-hero",
        mockup=_SCRIPTS_DIR / "tests" / "__init__.py",
        client="test-client",
        no_playwright=True,
        media_map=None,
        viewport=None,
        debug_trace=False,
        mode="production",
        auto_section=False,
    )


def _make_match_output() -> dict:
    return {
        "matches": [
            {
                "boundary_id": "boundary-0",
                "section_id": "section-0",
                "block_name": "sgs/hero",
                "confidence": 0.9,
            }
        ]
    }


def _make_voter_dict() -> dict:
    return {
        "boundaries": [
            {
                "boundary_id": "boundary-0",
                "selector": ".sgs-hero",
                "class_signature": ["sgs-hero"],
                "section_id": "section-0",
            }
        ]
    }


def _run_extract_with_failed_converter(tmp_path: Path) -> dict:
    """Run stage_4_5_6_7_8_extract with convert_section planted to fail."""
    run_dir = tmp_path / "run-failed"
    run_dir.mkdir()
    (run_dir / "voter.json").write_text(
        json.dumps(_make_voter_dict()), encoding="utf-8"
    )

    mock_hook = MagicMock()
    mock_hook._is_sgs_bem_canonical = MagicMock(return_value=True)

    failed_result = {
        "status": "failed",
        "failure_reason": "planted-failure: recognise returned no emit",
        "block_markup": "",
        "block_name": "sgs/hero",
        "extracted_attributes": {},
        "token_resolutions": [],
        "variation_css": "",
        "attribute_gap_candidates": [],
    }

    fake_entry = types.ModuleType("converter.entry")
    fake_entry.convert_section = MagicMock(return_value=failed_result)

    with patch.object(_orch, "stage1_boundary_hook", return_value=mock_hook), \
         patch.dict("sys.modules", {"converter.entry": fake_entry}):
        return _orch.stage_4_5_6_7_8_extract(
            _make_args(), _make_match_output(), run_dir, {"theme_json": {}}
        )


# ---------------------------------------------------------------------------
# 1. Planted failed status is LOUD
# ---------------------------------------------------------------------------


class TestFailedStatusIsLoud:
    def test_failed_section_status_and_reason_recorded(self, tmp_path: Path) -> None:
        result = _run_extract_with_failed_converter(tmp_path)
        per_section = result.get("per_section_results", [])
        assert len(per_section) == 1
        assert per_section[0]["status"] == "failed"
        assert "planted-failure" in per_section[0].get("failure_reason", "")

    def test_failed_section_contributes_no_markup(self, tmp_path: Path) -> None:
        result = _run_extract_with_failed_converter(tmp_path)
        assert result.get("block_markup", "") == ""

    def test_failed_section_flips_stage_artefact_to_failed(self, tmp_path: Path) -> None:
        """aggregate_errors must be non-empty -> write_artefact status 'failed'."""
        result = _run_extract_with_failed_converter(tmp_path)
        run_dir = tmp_path / "run-failed"
        artefacts = sorted(run_dir.glob("**/stage-4*.json"))
        assert artefacts, "stage-4 artefact not written"
        payload = json.loads(artefacts[0].read_text(encoding="utf-8"))
        assert payload.get("status") == "failed", (
            "A converter status:'failed' section must flip the Stage-4 artefact "
            f"to 'failed' (Rule 4 loud), got {payload.get('status')!r}"
        )
        errors = payload.get("errors", [])
        assert any("converter returned status 'failed'" in e for e in errors)


# ---------------------------------------------------------------------------
# 2/3. Stage-9 operator queue catches failed + unmatched-* statuses
# ---------------------------------------------------------------------------


def _queue_for(statuses: list[str]) -> list[dict]:
    """Replicate Stage-9's unmatched_sections filter over synthetic results."""
    per_section_results = [
        {
            "boundary_id": f"b-{i}",
            "section_id": f"s-{i}",
            "selector": f".sgs-x-{i}",
            "block_name": "sgs/hero",
            "class_signature": [],
            "status": st,
        }
        for i, st in enumerate(statuses)
    ]
    # Same predicate as sgs-clone-orchestrator.py Stage 9 (kept in sync by
    # the source-line assertion in test_stage9_filter_source_matches below).
    return [
        s for s in per_section_results
        if str(s.get("status", "")).startswith("unmatched") or s.get("status") == "failed"
    ]


class TestStage9QueueFilter:
    def test_source_filter_catches_failed_and_unmatched_variants(self) -> None:
        """The live orchestrator source must use the widened predicate."""
        src = _ORCHESTRATOR_PATH.read_text(encoding="utf-8")
        assert (
            'startswith("unmatched") or s.get("status") == "failed"' in src
        ), (
            "Stage-9 unmatched_sections filter regressed to exact-match: "
            "'unmatched-cv2-softfail' / 'unmatched-non-bem-compliant' / 'failed' "
            "sections would silently miss the operator queue."
        )

    def test_filter_semantics(self) -> None:
        queued = _queue_for(
            ["complete", "unmatched", "unmatched-cv2-softfail",
             "unmatched-non-bem-compliant", "failed"]
        )
        queued_statuses = {s["status"] for s in queued}
        assert queued_statuses == {
            "unmatched", "unmatched-cv2-softfail",
            "unmatched-non-bem-compliant", "failed",
        }
