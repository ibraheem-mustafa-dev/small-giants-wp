#!/usr/bin/env python3
"""
Smoke tests for lint-patterns-for-personal-data.py

Tests:
  - PASS case: pattern file with no hardcoded data (uses block bindings)
  - FAIL case: pattern file with hardcoded email, phone, location, social URLs
"""

import subprocess
import sys
import tempfile
from pathlib import Path


PASS_CASE_CONTENT = '''<?php
/**
 * Title: Contact — Minimal
 * Slug: sgs/contact-minimal
 * Categories: sgs
 *
 * @package SGS\\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80"}}}} -->
<div class="wp-block-group alignfull">

	<!-- wp:heading {"textAlign":"center","fontSize":"xx-large"} -->
	<h2 class="wp-block-heading">Let's Start a Conversation</h2>
	<!-- /wp:heading -->

	<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
	<div class="wp-block-buttons">
		<!-- wp:button {"metadata":{"bindings":{"url":{"source":"sgs/site-info","args":{"key":"email"}}}}} -->
		<div class="wp-block-button"><a class="wp-block-button__link" href="mailto:[email]">Email Us</a></div>
		<!-- /wp:button -->
	</div>
	<!-- /wp:buttons -->

</div>
<!-- /wp:group -->
'''

FAIL_CASE_CONTENT = '''<?php
/**
 * Title: Contact — Bad Example
 * Slug: sgs/contact-bad
 * Categories: sgs
 *
 * @package SGS\\Theme
 */
?>

<!-- wp:group {"align":"full"} -->
<div class="wp-block-group alignfull">

	<!-- wp:heading -->
	<h2 class="wp-block-heading">Contact Us</h2>
	<!-- /wp:heading -->

	<!-- Hardcoded email below - should be flagged -->
	<p>Email: support@mycompany.com</p>

	<!-- Hardcoded phone below - should be flagged -->
	<p>Call us: +44 (0) 123 456 7890</p>

	<!-- Hardcoded location below - should be flagged -->
	<p>We are based in Birmingham, London area</p>

	<!-- Hardcoded social URL below - should be flagged -->
	<p><a href="https://www.facebook.com/mycompanypage/">Like us</a></p>

	<!-- Hardcoded operator name below - should be flagged -->
	<p>Contact Zainab or Amir for trade enquiries</p>

</div>
<!-- /wp:group -->
'''


def run_linter(patterns_dir: Path) -> int:
    """
    Run the linter on a patterns directory.

    Returns:
        Exit code from linter (0 = pass, 1 = fail)
    """
    linter_script = (
        Path(__file__).parent.parent / "lint-patterns-for-personal-data.py"
    )

    # Temporarily replace the hardcoded patterns_dir path in the linter
    # by running it as a subprocess with modified environment
    result = subprocess.run(
        [sys.executable, str(linter_script)],
        cwd=patterns_dir.parent.parent,
        capture_output=True,
        text=True,
    )

    return result.returncode, result.stdout, result.stderr


def test_pass_case():
    """Test that clean patterns pass (exit 0)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        patterns_dir = Path(tmpdir) / "theme" / "sgs-theme" / "patterns"
        patterns_dir.mkdir(parents=True)

        # Write clean pattern
        (patterns_dir / "contact-minimal.php").write_text(PASS_CASE_CONTENT)

        # The linter script hardcodes the path, so we need to temporarily
        # create the expected structure
        scripts_dir = Path(tmpdir) / "scripts"
        scripts_dir.mkdir()

        # Copy linter to temp location
        linter_source = Path(__file__).parent.parent / "lint-patterns-for-personal-data.py"
        linter_dest = scripts_dir / "lint-patterns-for-personal-data.py"
        linter_dest.write_text(linter_source.read_text())

        # Run from scripts dir so relative path resolves
        result = subprocess.run(
            [sys.executable, str(linter_dest)],
            cwd=Path(tmpdir),
            capture_output=True,
            text=True,
        )

        assert (
            result.returncode == 0
        ), f"Expected exit 0 for clean pattern, got {result.returncode}\nstdout: {result.stdout}\nstderr: {result.stderr}"
        print("[PASS] PASS case: clean pattern passes (exit 0)")


def test_fail_case():
    """Test that patterns with hardcoded data fail (exit 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        patterns_dir = Path(tmpdir) / "theme" / "sgs-theme" / "patterns"
        patterns_dir.mkdir(parents=True)

        # Write pattern with violations
        (patterns_dir / "contact-bad.php").write_text(FAIL_CASE_CONTENT)

        # Copy linter to temp location
        scripts_dir = Path(tmpdir) / "scripts"
        scripts_dir.mkdir()

        linter_source = Path(__file__).parent.parent / "lint-patterns-for-personal-data.py"
        linter_dest = scripts_dir / "lint-patterns-for-personal-data.py"
        linter_dest.write_text(linter_source.read_text())

        # Run from scripts dir so relative path resolves
        result = subprocess.run(
            [sys.executable, str(linter_dest)],
            cwd=Path(tmpdir),
            capture_output=True,
            text=True,
        )

        assert (
            result.returncode == 1
        ), f"Expected exit 1 for pattern with violations, got {result.returncode}\nstdout: {result.stdout}\nstderr: {result.stderr}"

        # Verify that violations were reported
        assert (
            "contact-bad.php" in result.stdout or "contact-bad.php" in result.stderr
        ), f"Expected file path in output\nstdout: {result.stdout}\nstderr: {result.stderr}"

        # Check for at least one violation type detected
        violation_found = any(
            marker in result.stdout or marker in result.stderr
            for marker in [
                "Email address",
                "phone",
                "Birmingham",
                "facebook",
                "Zainab",
                "Amir",
            ]
        )

        assert (
            violation_found
        ), f"Expected at least one violation marker in output\nstdout: {result.stdout}\nstderr: {result.stderr}"

        print("[PASS] FAIL case: pattern with hardcoded data fails (exit 1)")
        print(f"  Violations reported:\n{result.stdout}")


if __name__ == "__main__":
    try:
        test_pass_case()
        test_fail_case()
        print("\n[PASS] All smoke tests passed")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {e}", file=sys.stderr)
        sys.exit(1)
