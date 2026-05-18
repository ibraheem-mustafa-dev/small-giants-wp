#!/usr/bin/env python3
"""Tests for uimax-write-validator.py Hard Rule 1 (licensing keywords) enforcement.

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

check_licensing_keywords = validator_module.check_licensing_keywords
check_rosetta_stone = validator_module.check_rosetta_stone
validate = validator_module.validate
FORBIDDEN_KEYWORDS = validator_module.FORBIDDEN_KEYWORDS
LICENSING_ALLOWLIST = validator_module.LICENSING_ALLOWLIST

VALIDATOR_SCRIPT = Path(__file__).parent / "uimax-write-validator.py"


class TestLicensingKeywordDetection:
    """Test Hard Rule 1: reject licensing keywords in payloads."""

    def test_license_field_rejected(self):
        """Payload with license field should be rejected."""
        payload = {
            "slug": "test-component",
            "license": "MIT",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0, "Expected licensing keyword rejection"
        assert "license" in errors[0].lower()

    def test_licensed_in_description_rejected(self):
        """Substring match: 'licensed' in description value."""
        payload = {
            "slug": "test-component",
            "description": "MIT licensed component",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0
        assert "licensed" in errors[0].lower()

    def test_licence_uk_spelling_rejected(self):
        """UK spelling 'licence' should also be rejected."""
        payload = {
            "name": "test",
            "notes": "Requires a valid licence to use",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0
        assert "licence" in errors[0].lower()

    def test_provenance_license_column_rejected(self):
        """Column name containing 'provenance_license' should be rejected."""
        payload = {
            "slug": "test",
            "provenance_license": "MIT",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0
        assert "provenance_license" in errors[0]

    def test_ip_firewall_rejected(self):
        """IP-firewall variant should be rejected."""
        payload = {
            "slug": "test",
            "notes": "behind IP-firewall due to licensing",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0

    def test_redistribution_rejected(self):
        """'redistribution' keyword should be rejected."""
        payload = {
            "name": "test",
            "terms": "redistribution not permitted",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0
        assert "redistribution" in errors[0].lower()

    def test_copyright_rejected(self):
        """'copyright' keyword should be rejected."""
        payload = {
            "source": "https://example.com",
            "attribution": "Copyright 2024 Example Corp",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0
        assert "copyright" in errors[0].lower()

    def test_intellectual_property_rejected(self):
        """'intellectual property' keyword should be rejected."""
        payload = {
            "slug": "test",
            "notes": "This component is protected intellectual property",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0

    def test_trademark_rejected(self):
        """'trademark' keyword should be rejected."""
        payload = {
            "name": "My Trademark Brand Logo",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0
        assert "trademark" in errors[0].lower()

    def test_patent_rejected(self):
        """'patent' keyword should be rejected."""
        payload = {
            "slug": "test",
            "notes": "Uses patented technology",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0
        assert "patent" in errors[0].lower()

    def test_nested_licensing_keyword_rejected(self):
        """Licensing keyword deeply nested should be rejected."""
        payload = {
            "slug": "test",
            "equivalent_implementations": {
                "sgs_block": "sgs/hero",
                "bootstrap": {"notes": "Cannot redistribute this"},
            },
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0

    def test_allowlist_license_free_passes(self):
        """'license-free' should be allowlisted and pass with a warning."""
        payload = {
            "slug": "test",
            "description": "license-free font for commercial use",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        # Should pass validation (error count = 0) but log a warning
        assert len(errors) == 0, f"Expected no errors, got: {errors}"
        assert len(warnings) > 0, "Expected a warning about allowlist match"

    def test_case_insensitive_matching(self):
        """Keywords should match case-insensitively."""
        payload = {
            "slug": "test",
            "notes": "LICENSE terms apply",  # Uppercase
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) > 0, "Case-insensitive match should work"

    def test_clean_payload_passes(self):
        """Payload with no licensing keywords should pass."""
        payload = {
            "slug": "test-pattern",
            "name": "Hero Split Layout",
            "source": "https://example.com/design",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        errors, warnings = check_licensing_keywords(payload)
        assert len(errors) == 0, f"Clean payload should pass, got errors: {errors}"


class TestRosettaStoneIntegration:
    """Test that Rosetta Stone validation still works alongside licensing checks."""

    def test_licensing_error_takes_precedence(self):
        """If payload has both licensing violation and Rosetta Stone violation,
        licensing error appears first."""
        payload = {
            "slug": "test",
            "license": "MIT",
            # Missing equivalent_implementations
        }
        result = validate("patterns", payload)
        assert not result["valid"]
        assert len(result["errors"]) > 0
        # First error should be licensing (checked first)
        assert "license" in result["errors"][0].lower()

    def test_rosetta_stone_still_enforced(self):
        """Rosetta Stone check should still work when no licensing keywords."""
        payload = {
            "slug": "test",
            "name": "Clean Component",
            # Missing equivalent_implementations
        }
        result = validate("patterns", payload)
        assert not result["valid"]
        assert any("equivalent_implementations" in err for err in result["errors"])

    def test_both_checks_pass(self):
        """Clean payload passes both licensing and Rosetta Stone checks."""
        payload = {
            "slug": "test-pattern",
            "name": "Good Component",
            "source": "idea",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        result = validate("patterns", payload)
        assert result["valid"]
        assert len(result["errors"]) == 0


class TestCLIInvocation:
    """Test the validator via subprocess (CLI interface)."""

    def test_cli_rejects_licensing_keyword(self):
        """CLI should reject payload with licensing keyword and exit 1."""
        payload = {"license": "MIT", "equivalent_implementations": {"sgs_block": "sgs/hero"}}
        proc = subprocess.run(
            [sys.executable, str(VALIDATOR_SCRIPT), "patterns", json.dumps(payload)],
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 1, "Should exit 1 on validation failure"
        result = json.loads(proc.stdout)
        assert not result["valid"]
        assert len(result["errors"]) > 0
        assert "license" in result["errors"][0].lower()

    def test_cli_accepts_clean_payload(self):
        """CLI should accept clean payload and exit 0."""
        payload = {
            "slug": "test-pattern",
            "equivalent_implementations": {"sgs_block": "sgs/hero"},
        }
        proc = subprocess.run(
            [sys.executable, str(VALIDATOR_SCRIPT), "patterns", json.dumps(payload)],
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0, "Should exit 0 on validation success"
        result = json.loads(proc.stdout)
        assert result["valid"]
        assert len(result["errors"]) == 0


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v"])
