"""
qc-anti-cheat.py
================
Static-analysis gate that fails on converter-cheating patterns.

A "cheat" is any code path that special-cases a specific client slug,
mockup section name, hex colour, or font name in converter / recogniser
logic — bypassing the DB-driven general approach.

Pattern definitions and AST logic live in qc_anti_cheat_checks.py.

Usage:
    python scripts/qc-anti-cheat.py [--diff-range RANGE] [--allowlist FILE]
                                     [--json] [--verbose] [--scan-file FILE]

Exit codes:
    0  Pass (no violations, or all violations suppressed by allowlist)
    1  Fail (one or more violations not suppressed)
    2  Script-level error (bad args, git unavailable, parse error)
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Re-export public symbols from checks module so tests can still import them
# from this file when using importlib.
# ---------------------------------------------------------------------------
from qc_anti_cheat_checks import (  # noqa: E402
    Finding,
    analyse_python_file,
    analyse_text_file,
)

# ---------------------------------------------------------------------------
# Path filtering constants
# ---------------------------------------------------------------------------

SCANNED_DIRS = (
    "tools/recogniser",
    "tools/recogniser-v2",
    "plugins/sgs-blocks/scripts/orchestrator",
    "plugins/sgs-blocks/scripts/recogniser",
    "plugins/sgs-blocks/scripts/converter",
)

ALLOWED_PATH_PATTERNS = (
    re.compile(r"[/\\]tests[/\\]"),
    re.compile(r"[/\\]test_"),
    re.compile(r"[/\\]golden[/\\]"),
    re.compile(r"[/\\]fixtures[/\\]"),
    re.compile(r"reports[/\\]baselines[/\\]"),
    re.compile(r"qc-anti-cheat"),
    re.compile(r"qc-anti-cheat-fixtures"),
)


def is_scanned_path(path: str) -> bool:
    """Return True when the file falls under a scanned directory."""
    normalised = path.replace("\\", "/")
    return any(d in normalised for d in SCANNED_DIRS)


def is_exempt_path(path: str) -> bool:
    """Return True when the file matches an exemption pattern."""
    return any(p.search(path) for p in ALLOWED_PATH_PATTERNS)


# ---------------------------------------------------------------------------
# Allowlist helpers
# ---------------------------------------------------------------------------

def load_allowlist(path: Optional[str]) -> list[re.Pattern]:
    if path is None:
        default = Path(__file__).parent / "qc-anti-cheat-allowlist.txt"
        if not default.exists():
            return []
        path = str(default)
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
        return [
            re.compile(ln.strip())
            for ln in lines
            if ln.strip() and not ln.startswith("#")
        ]
    except OSError as exc:
        print(f"[error] Cannot read allowlist {path}: {exc}", file=sys.stderr)
        sys.exit(2)


def apply_allowlist(findings: list[Finding], allowlist: list[re.Pattern]) -> list[Finding]:
    """Downgrade findings whose evidence or file matches an allowlist pattern to 'warn'."""
    for f in findings:
        for pattern in allowlist:
            if pattern.search(f.evidence) or pattern.search(f.file):
                f.severity = "warn"
    return findings


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def changed_files(diff_range: str) -> list[str]:
    try:
        result = subprocess.run(
            ["git", "diff", diff_range, "--name-only"],
            capture_output=True, text=True, check=True,
        )
        return [f for f in result.stdout.splitlines() if f.strip()]
    except subprocess.CalledProcessError as exc:
        print(f"[error] git diff failed: {exc.stderr}", file=sys.stderr)
        sys.exit(2)
    except FileNotFoundError:
        print("[error] git not found on PATH", file=sys.stderr)
        sys.exit(2)


def file_content_at_range(diff_range: str, filepath: str) -> str:
    """Return the right-hand-side content of a file in the diff range."""
    right = diff_range.split("..")[-1] if ".." in diff_range else diff_range
    try:
        result = subprocess.run(
            ["git", "show", f"{right}:{filepath}"],
            capture_output=True, text=True,
        )
        return result.stdout if result.returncode == 0 else ""
    except FileNotFoundError:
        return ""


# ---------------------------------------------------------------------------
# Output formatters
# ---------------------------------------------------------------------------

def emit_human(findings: list[Finding], verbose: bool) -> None:
    visible = findings if verbose else [f for f in findings if f.severity == "fail"]
    if not visible:
        print("pass  No cheat violations found.")
        return
    fails = sum(1 for f in findings if f.severity == "fail")
    warns = sum(1 for f in findings if f.severity == "warn")
    print(f"{'FAIL' if fails else 'WARN'}  {fails} fail(s), {warns} warning(s)\n")
    for f in visible:
        tag = "FAIL" if f.severity == "fail" else "warn"
        print(f"  [{tag}] {f.file}:{f.line}")
        print(f"         pattern  : {f.pattern}")
        print(f"         evidence : {f.evidence}")
        print()


def emit_json(findings: list[Finding], verbose: bool) -> None:
    visible = findings if verbose else [f for f in findings if f.severity == "fail"]
    fails = sum(1 for f in findings if f.severity == "fail")
    payload = {
        "verdict": "fail" if fails else ("warn" if findings else "pass"),
        "findings": [
            {
                "file": f.file, "line": f.line, "pattern": f.pattern,
                "evidence": f.evidence, "severity": f.severity,
            }
            for f in visible
        ],
    }
    print(json.dumps(payload, indent=2))


# ---------------------------------------------------------------------------
# Core run
# ---------------------------------------------------------------------------

def run(
    diff_range: str,
    allowlist_path: Optional[str],
    as_json: bool,
    verbose: bool,
    scan_file: Optional[str],
) -> int:
    """Execute the gate. Returns the process exit code."""
    allowlist = load_allowlist(allowlist_path)
    all_findings: list[Finding] = []

    if scan_file:
        p = Path(scan_file)
        content = p.read_text(encoding="utf-8", errors="replace")
        # Strip .txt wrapper used for fixtures (e.g. synthetic-cheat.py.txt).
        effective_suffix = p.name.replace(".txt", "").rsplit(".", 1)[-1]
        if effective_suffix == "py":
            all_findings = analyse_python_file(str(p), content)
        else:
            all_findings = analyse_text_file(str(p), content)
    else:
        for rel_path in changed_files(diff_range):
            if not is_scanned_path(rel_path) or is_exempt_path(rel_path):
                continue
            content = file_content_at_range(diff_range, rel_path)
            if not content:
                continue
            if rel_path.endswith(".py"):
                all_findings.extend(analyse_python_file(rel_path, content))
            else:
                all_findings.extend(analyse_text_file(rel_path, content))

    all_findings = apply_allowlist(all_findings, allowlist)

    if as_json:
        emit_json(all_findings, verbose)
    else:
        emit_human(all_findings, verbose)

    return 1 if any(f.severity == "fail" for f in all_findings) else 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Anti-cheat gate for the SGS converter/recogniser pipeline."
    )
    parser.add_argument(
        "--diff-range", default="HEAD~1..HEAD",
        help="Git diff range to scan (default: HEAD~1..HEAD)",
    )
    parser.add_argument(
        "--allowlist", default=None,
        help="Path to allowlist file (default: scripts/qc-anti-cheat-allowlist.txt if present)",
    )
    parser.add_argument(
        "--json", action="store_true", dest="as_json",
        help="Emit JSON output",
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Show all findings including allowlist-suppressed warnings",
    )
    parser.add_argument(
        "--scan-file", default=None, dest="scan_file",
        help="Scan a single file directly (bypasses git diff; for testing/dogfood)",
    )
    args = parser.parse_args()

    try:
        sys.exit(run(
            diff_range=args.diff_range,
            allowlist_path=args.allowlist,
            as_json=args.as_json,
            verbose=args.verbose,
            scan_file=args.scan_file,
        ))
    except Exception as exc:  # noqa: BLE001
        print(f"[error] Unexpected failure: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
