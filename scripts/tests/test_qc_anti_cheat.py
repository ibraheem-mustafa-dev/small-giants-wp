"""
test_qc_anti_cheat.py
=====================
Pytest suite for qc-anti-cheat.py.

Covers:
  - Client slug detected in a dict key
  - Section name detected in if-comparison
  - Section name in docstring / comment is NOT flagged
  - Generic variable name (hero_section = ...) is NOT flagged
  - Allowlist downgrades a matching finding to warn (exit 0)
  - Exit code 1 on fail, 0 on pass
"""

from __future__ import annotations

import sys
import textwrap
import tempfile
import subprocess
from pathlib import Path

import importlib.util
import pytest

# Path to the scripts directory.
SCRIPTS_DIR = Path(__file__).parent.parent
SCRIPT = SCRIPTS_DIR / "qc-anti-cheat.py"

# Ensure scripts/ is on sys.path so qc_anti_cheat_checks imports cleanly.
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

# Import the checks module directly for unit tests that don't need git.
from qc_anti_cheat_checks import (  # noqa: E402
    analyse_python_file,
    analyse_text_file,
    Finding,
)

# Import the CLI module (hyphen name requires importlib).
_spec = importlib.util.spec_from_file_location("qc_anti_cheat", SCRIPT)
_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
sys.modules["qc_anti_cheat"] = _mod  # register BEFORE exec so @dataclass resolves
_spec.loader.exec_module(_mod)  # type: ignore[union-attr]

apply_allowlist = _mod.apply_allowlist
load_allowlist = _mod.load_allowlist
is_scanned_path = _mod.is_scanned_path
is_exempt_path = _mod.is_exempt_path

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def findings_for(source: str) -> list:
    """Return findings from analyse_python_file for an inline source string."""
    return analyse_python_file("<test>", textwrap.dedent(source))


def run_script(*args: str) -> subprocess.CompletedProcess:
    """Run the script as a subprocess and return the result."""
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
    )


# ---------------------------------------------------------------------------
# Unit tests — client slug detection
# ---------------------------------------------------------------------------

def test_client_slug_in_dict_key_is_detected():
    src = """
    MAP = {
        "mamas-munches": "card",
        "indus-foods": "hero",
    }
    """
    hits = findings_for(src)
    patterns = {f.pattern for f in hits}
    assert "client-slug-in-code" in patterns or "client-slug-dict" in patterns, (
        f"Expected client-slug finding, got: {hits}"
    )


def test_client_slug_in_if_comparison_is_detected():
    src = """
    def f(client):
        if client == "indus-foods":
            return True
    """
    hits = findings_for(src)
    assert any(f.pattern == "client-slug-in-code" for f in hits), (
        f"Expected client-slug-in-code finding, got: {hits}"
    )


# ---------------------------------------------------------------------------
# Unit tests — section name detection
# ---------------------------------------------------------------------------

def test_section_name_in_if_comparison_is_detected():
    src = """
    def layout(section):
        if section == "brand":
            return "brand-layout"
        elif section == "hero":
            return "hero-layout"
    """
    hits = findings_for(src)
    assert any(
        f.pattern in ("section-name-in-code", "section-if-chain") for f in hits
    ), f"Expected section-name finding, got: {hits}"


def test_section_name_in_docstring_is_not_flagged():
    src = '''
    def resolve(section):
        """Resolve a section. Works for hero, brand, footer etc."""
        return section
    '''
    hits = findings_for(src)
    # Docstring strings are Constant nodes — they should NOT be flagged
    # because our visitor only fires on comparisons / dict keys / constants
    # that match the section name exactly in a comparison context.
    # The docstring is a free Constant, not in a Compare or Dict.
    section_hits = [
        f for f in hits
        if f.pattern in ("section-name-in-code", "section-if-chain", "section-name-dict")
    ]
    assert not section_hits, (
        f"Docstring section name should not be flagged, got: {section_hits}"
    )


def test_generic_variable_name_not_flagged():
    src = """
    hero_section = parse_section(dom)
    brand_section = extract(dom)
    result = hero_section.attrs
    """
    hits = findings_for(src)
    section_hits = [
        f for f in hits
        if f.pattern in ("section-name-in-code", "section-if-chain", "section-name-dict")
    ]
    assert not section_hits, (
        f"Variable name 'hero_section' should not be flagged, got: {section_hits}"
    )


# ---------------------------------------------------------------------------
# Unit tests — allowlist
# ---------------------------------------------------------------------------

def test_allowlist_downgrades_finding_to_warn():
    src = """
    MAP = {"mamas-munches": "card"}
    """
    findings = findings_for(src)
    assert findings, "Expected at least one finding"

    import re
    allowlist = [re.compile(r"mamas-munches")]
    after = apply_allowlist(findings, allowlist)
    assert all(f.severity == "warn" for f in after), (
        f"All findings should be downgraded to warn, got: {after}"
    )


# ---------------------------------------------------------------------------
# Integration tests — exit codes via subprocess + --scan-file
# ---------------------------------------------------------------------------

def test_exit_code_0_on_clean_file():
    src = textwrap.dedent("""
    def resolve(section):
        return section.lower()
    """)
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w",
                                    delete=False, encoding="utf-8") as tmp:
        tmp.write(src)
        tmp_path = tmp.name

    result = run_script("--scan-file", tmp_path)
    Path(tmp_path).unlink(missing_ok=True)
    assert result.returncode == 0, (
        f"Expected exit 0 for clean file, got {result.returncode}\n"
        f"stdout: {result.stdout}\nstderr: {result.stderr}"
    )


def test_exit_code_1_on_cheat_file():
    fixture = (
        Path(__file__).parent
        / "qc-anti-cheat-fixtures"
        / "synthetic-cheat.py.txt"
    )
    assert fixture.exists(), f"Fixture missing: {fixture}"
    result = run_script("--scan-file", str(fixture))
    assert result.returncode == 1, (
        f"Expected exit 1 for cheat fixture, got {result.returncode}\n"
        f"stdout: {result.stdout}\nstderr: {result.stderr}"
    )


def test_allowlist_file_suppresses_all_findings_to_exit_0():
    src = textwrap.dedent("""
    MAP = {"mamas-munches": "card"}
    """)
    allowlist_content = "mamas-munches\n"

    with (
        tempfile.NamedTemporaryFile(suffix=".py", mode="w",
                                    delete=False, encoding="utf-8") as src_f,
        tempfile.NamedTemporaryFile(suffix=".txt", mode="w",
                                    delete=False, encoding="utf-8") as al_f,
    ):
        src_f.write(src)
        al_f.write(allowlist_content)
        src_path, al_path = src_f.name, al_f.name

    result = run_script("--scan-file", src_path, "--allowlist", al_path)
    Path(src_path).unlink(missing_ok=True)
    Path(al_path).unlink(missing_ok=True)
    assert result.returncode == 0, (
        f"Expected exit 0 after allowlist suppression, got {result.returncode}\n"
        f"stdout: {result.stdout}\nstderr: {result.stderr}"
    )


# ---------------------------------------------------------------------------
# Unit tests — path filtering
# ---------------------------------------------------------------------------

def test_is_scanned_path_matches_recogniser():
    assert is_scanned_path("tools/recogniser/recogniser.py")
    assert is_scanned_path("plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py")


def test_is_scanned_path_rejects_other_dirs():
    assert not is_scanned_path("plugins/sgs-blocks/src/hero/edit.js")
    assert not is_scanned_path("theme/sgs-theme/style.css")


def test_is_exempt_path_covers_tests():
    assert is_exempt_path("tools/recogniser/tests/golden/sample.py")
    assert is_exempt_path("tools/recogniser/test_recogniser.py")
    assert is_exempt_path("scripts/qc-anti-cheat-fixtures/synthetic-cheat.py.txt")
