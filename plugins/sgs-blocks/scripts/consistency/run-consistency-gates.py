#!/usr/bin/env python3
"""
run-consistency-gates.py

Single orchestrator for the SGS blocks consistency-gate suite. Runs a fixed
set of BLOCKING gates (propagate non-zero exit) followed by a fixed set of
INFORMATIONAL gates (output printed, exit code never propagated).

BLOCKING (in order):
    1. check-cluster-coverage.py     (this directory)
    2. check-box-family-guard.py     (../check-box-family-guard.py)
    3. check-reclassified-keys.py    (this directory) — Spec 35 regeneration
       tripwire for Bean-ruled setting keys. PROMOTED from informational to
       blocking (2026-08-06): as an informational gate it printed the same
       eight-line failure into every green build for weeks with its exit code
       explicitly discarded — a tripwire whose alarm was disconnected. It is
       blocking now that it diffs against `reclassified-keys-baseline.json`,
       so it fails only on a DIFFERENCE from the accepted upstream drift
       (new/increased references, or an obsolete baseline line), not on the
       known-good state.

INFORMATIONAL (in order — printed but never affects the final exit code):
    4. check-box-flat.py             (this directory) — Track 2 is mid-flight
       on several blocks, so this discovery gate is informational for now.
    5. node ../check-element-manifest-conformance.js — summary lines only
       ("Members checked:" + "States (FR-35-5" lines from stdout).
    6. report-colour-alpha.py        (this directory) — always exits 0 anyway.

Final exit code is non-zero iff any BLOCKING gate failed. A clear PASS/FAIL
banner is printed at the end naming which blocking gate(s) failed, if any.

Usage
-----
    python scripts/consistency/run-consistency-gates.py

Paths are resolved relative to this script's own location (`__file__`), so
it runs correctly regardless of the caller's current working directory.

UK English throughout.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths — all resolved relative to this file, so cwd never matters.
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent          # plugins/sgs-blocks/scripts/consistency/
_SCRIPTS_DIR = _HERE.parent                        # plugins/sgs-blocks/scripts/

_CLUSTER_COVERAGE = _HERE / "check-cluster-coverage.py"
_BOX_FAMILY_GUARD = _SCRIPTS_DIR / "check-box-family-guard.py"
_BOX_FLAT = _HERE / "check-box-flat.py"
_MANIFEST_CONFORMANCE = _SCRIPTS_DIR / "check-element-manifest-conformance.js"
_COLOUR_ALPHA = _HERE / "report-colour-alpha.py"
_RECLASSIFIED_KEYS = _HERE / "check-reclassified-keys.py"


def _print_header(label: str) -> None:
    print()
    print("=" * 78)
    print(label)
    print("=" * 78)


def _run_python(script_path: Path) -> tuple[int, str]:
    """Run a Python child script with the SAME interpreter, capture combined
    output, return (exit_code, output)."""
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(script_path.parent),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    output = result.stdout
    if result.stderr:
        output += ("\n" if output and not output.endswith("\n") else "") + result.stderr
    return result.returncode, output


def _run_node(script_path: Path) -> tuple[int, str]:
    result = subprocess.run(
        ["node", str(script_path)],
        cwd=str(script_path.parent),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    output = result.stdout
    if result.stderr:
        output += ("\n" if output and not output.endswith("\n") else "") + result.stderr
    return result.returncode, output


def _extract_manifest_summary(output: str) -> str:
    """Pull just the 'Members checked:' + 'States (FR-35-5' summary lines
    out of the full conformance-checker output."""
    lines = output.splitlines()
    summary_lines = [
        line for line in lines
        if "Members checked:" in line or "States (FR-35-5" in line
    ]
    if summary_lines:
        return "\n".join(summary_lines)
    return "(no 'Members checked:' / 'States (FR-35-5' summary line found in output)"


def main() -> int:
    blocking_failures: list[str] = []

    # =====================================================================
    # BLOCKING GATES
    # =====================================================================
    _print_header("BLOCKING GATE 1/3 — check-cluster-coverage.py")
    exit_code, output = _run_python(_CLUSTER_COVERAGE)
    print(output.rstrip())
    print(f"[run-consistency-gates] exit code: {exit_code}")
    if exit_code != 0:
        blocking_failures.append("check-cluster-coverage.py")

    _print_header("BLOCKING GATE 2/3 — check-box-family-guard.py")
    exit_code, output = _run_python(_BOX_FAMILY_GUARD)
    print(output.rstrip())
    print(f"[run-consistency-gates] exit code: {exit_code}")
    if exit_code != 0:
        blocking_failures.append("check-box-family-guard.py")

    _print_header("BLOCKING GATE 3/3 — check-reclassified-keys.py (Spec 35 regeneration tripwire)")
    exit_code, output = _run_python(_RECLASSIFIED_KEYS)
    print(output.rstrip())
    print(f"[run-consistency-gates] exit code: {exit_code}")
    if exit_code != 0:
        blocking_failures.append("check-reclassified-keys.py")

    # =====================================================================
    # INFORMATIONAL GATES — printed, never propagate exit code
    # =====================================================================
    _print_header("INFORMATIONAL 1/3 — check-box-flat.py (Track 2 mid-flight; not blocking)")
    exit_code, output = _run_python(_BOX_FLAT)
    print(output.rstrip())
    print(f"[run-consistency-gates] exit code: {exit_code} (informational — not propagated)")

    _print_header("INFORMATIONAL 2/3 — node check-element-manifest-conformance.js (summary only)")
    exit_code, output = _run_node(_MANIFEST_CONFORMANCE)
    print(_extract_manifest_summary(output))
    print(f"[run-consistency-gates] exit code: {exit_code} (informational — not propagated)")

    _print_header("INFORMATIONAL 3/3 — report-colour-alpha.py")
    exit_code, output = _run_python(_COLOUR_ALPHA)
    print(output.rstrip())
    print(f"[run-consistency-gates] exit code: {exit_code} (informational — not propagated)")

    # =====================================================================
    # Final banner
    # =====================================================================
    print()
    print("=" * 78)
    if blocking_failures:
        print(f"FAIL — {len(blocking_failures)} blocking gate(s) failed:")
        for name in blocking_failures:
            print(f"  - {name}")
    else:
        print("PASS — all blocking gates passed (informational gates printed above)")
    print("=" * 78)

    return 1 if blocking_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
