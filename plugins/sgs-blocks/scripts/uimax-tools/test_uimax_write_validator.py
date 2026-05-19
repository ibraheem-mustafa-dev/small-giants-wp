#!/usr/bin/env python3
"""Tests for uimax-write-validator.py — Rosetta Stone discipline (Row 213) only.

Wave 2b on 2026-05-21 mis-added licensing-keyword scanning to this validator,
based on stale SKILL.md text claiming a Hard Rule 1 the actual code had
already stripped on 2026-05-14 (decisions.md Phase 6 v2 Step 5 sub-decision
(b)). Bean clarified same session: the "no licensing" rule means don't ADD
licensing-validation infrastructure at all — not "ban the words". The
licensing-scan code + its tests were reverted; this file retains only the
Rosetta Stone tests (which are real load-bearing engineering).

Run with: pytest test_uimax_write_validator.py -v
"""

import json
import subprocess
import sys
import importlib.util
from pathlib import Path

# Import the validator functions directly for unit tests
# (Module name has dashes, so use importlib.util)
validator_path = Path(__file__).parent / "uimax-write-validator.py"
spec = importlib.util.spec_from_file_location("uimax_write_validator", validator_path)
validator_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator_module)

check_rosetta_stone = validator_module.check_rosetta_stone
validate = validator_module.validate

VALIDATOR_SCRIPT = Path(__file__).parent / "uimax-write-validator.py"


class TestRosettaStone:
    """Row 213 — every artefact-table write carries equivalent_implementations.sgs_block."""

    def test_artefact_payload_with_sgs_block_passes(self):
        """Artefact table + valid sgs_block slug → passes."""
        result = validate("patterns", {
            "slug": "test-pattern",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        })
        assert result["valid"] is True, result

    def test_artefact_payload_with_null_sgs_block_passes(self):
        """Artefact table + explicit null sgs_block + gap_candidate flag → passes."""
        result = validate("patterns", {
            "slug": "test-pattern",
            "gap_candidate": True,
            "equivalent_implementations": {"sgs_block": None},
        })
        assert result["valid"] is True, result

    def test_artefact_payload_missing_equivalent_implementations_rejected(self):
        """Artefact table + missing equivalent_implementations → rejected."""
        result = validate("patterns", {
            "slug": "test-pattern",
        })
        assert result["valid"] is False, result
        assert any("equivalent_implementations" in e for e in result["errors"])

    def test_artefact_payload_missing_sgs_block_rejected(self):
        """Artefact table + equivalent_implementations missing sgs_block key → rejected."""
        result = validate("patterns", {
            "slug": "test-pattern",
            "equivalent_implementations": {"bootstrap": "card"},
        })
        assert result["valid"] is False, result
        assert any("sgs_block" in e for e in result["errors"])

    def test_non_artefact_table_skips_rosetta(self):
        """Non-artefact tables (e.g. recognition_log) don't require equivalent_implementations."""
        result = validate("recognition_log", {
            "run_id": "test-run",
            "outcome": "ok",
        })
        assert result["valid"] is True, result

    def test_components_table_requires_rosetta(self):
        """components is an artefact table → requires equivalent_implementations."""
        result = validate("components", {
            "slug": "test-component",
        })
        assert result["valid"] is False, result

    def test_animations_table_requires_rosetta(self):
        """animations is an artefact table → requires equivalent_implementations."""
        result = validate("animations", {
            "slug": "test-animation",
        })
        assert result["valid"] is False, result

    def test_naming_conventions_requires_rosetta(self):
        """naming_conventions is an artefact table → requires equivalent_implementations."""
        result = validate("naming_conventions", {
            "convention_name": "TestConvention",
        })
        assert result["valid"] is False, result

    def test_component_libraries_requires_rosetta(self):
        """component_libraries is an artefact table → requires equivalent_implementations."""
        result = validate("component_libraries", {
            "slug": "test-lib",
        })
        assert result["valid"] is False, result

    def test_empty_string_sgs_block_rejected(self):
        """Empty string sgs_block is not a valid slug or explicit null → rejected."""
        result = validate("patterns", {
            "slug": "test-pattern",
            "equivalent_implementations": {"sgs_block": ""},
        })
        assert result["valid"] is False, result


class TestCLIInvocation:
    """CLI invocation regression tests."""

    def test_cli_accepts_valid_artefact_payload(self):
        """CLI exits 0 on a valid payload."""
        payload = json.dumps({
            "slug": "test-pattern",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        })
        result = subprocess.run(
            [sys.executable, str(VALIDATOR_SCRIPT), "patterns", payload],
            capture_output=True, text=True
        )
        assert result.returncode == 0, f"stderr={result.stderr} stdout={result.stdout}"
        out = json.loads(result.stdout)
        assert out["valid"] is True

    def test_cli_rejects_payload_missing_rosetta(self):
        """CLI exits non-zero on a payload missing equivalent_implementations."""
        payload = json.dumps({"slug": "test-pattern"})
        result = subprocess.run(
            [sys.executable, str(VALIDATOR_SCRIPT), "patterns", payload],
            capture_output=True, text=True
        )
        assert result.returncode != 0, f"stdout={result.stdout}"


class TestLicensingInfrastructureNotPresent:
    """Regression guard: licensing-keyword scanning must NOT be added back.

    Bean's rule (feedback_no_licensing_talk_in_cloning_context.md): the cloning
    domain has no licensing concept. Adding licensing-keyword scans to this
    validator is theatre, not engineering. If a future agent adds them again,
    this test fires and tells the agent to read the tombstone in the validator
    + the captured rule + decisions.md 2026-05-14 sub-decision (b).
    """

    def test_no_forbidden_keywords_constant(self):
        """FORBIDDEN_KEYWORDS must not exist on the validator module."""
        assert not hasattr(validator_module, "FORBIDDEN_KEYWORDS"), (
            "Licensing-keyword scanning was deliberately stripped on 2026-05-14 "
            "(decisions.md Phase 6 v2 Step 5 sub-decision (b)) and again on "
            "2026-05-21 (Wave 2b revert). See top-of-file tombstone in "
            "uimax-write-validator.py + feedback_no_licensing_talk_in_cloning_context.md"
        )

    def test_no_check_licensing_function(self):
        """check_licensing_keywords function must not exist."""
        assert not hasattr(validator_module, "check_licensing_keywords"), (
            "Licensing-scan infrastructure was deliberately stripped. See tombstone."
        )

    def test_payload_with_license_keyword_passes_rosetta(self):
        """A payload mentioning 'license' in description should still validate cleanly
        if Rosetta Stone is satisfied — licensing words are not forbidden."""
        result = validate("patterns", {
            "slug": "test-pattern",
            "description": "Inspired by MIT-licensed reference",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        })
        assert result["valid"] is True, (
            f"Licensing words in descriptions are NOT forbidden. result={result}"
        )
