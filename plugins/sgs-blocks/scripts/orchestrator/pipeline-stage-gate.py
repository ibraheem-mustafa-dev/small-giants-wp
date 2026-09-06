#!/usr/bin/env python3
"""
pipeline-stage-gate.py — post-clone structural gate for the SGS cloning pipeline.

This script is called AFTER a clone run completes (i.e. after
/sgs-clone has written its artefacts to pipeline-state/<run>/).
It runs every armed gate in sequence; any gate failure raises SystemExit(1).

CURRENT GATES
=============
R-31-15  Anti-mirror gate (check_no_mirror.py)
         Detects draft-class container violations and sourceMode='bound'.
         Armed with --baseline so the 10 legacy violations are grandfathered.
         Only NEW violations (absent from the baseline) cause a hard fail.

Spec 35  Flat-to-object migration gate (check_flat_tier_regression.py)
D554-C   Fails a clone run that emits a flat tier (a <property>Tablet /
         <property>Mobile sibling key, or a scalar base value) for a
         property already migrated to the object shape on the target
         block (decisions.md D554-C, Bean-ruled 2026-08-10). NO baseline —
         D554-C explicitly rejects a converter shim, so every violation is
         a live regression, not a grandfathered legacy debt. Opt out with
         --skip-flat-tier-gate (diagnostic runs only).

Task 3   Attribute-schema conformance gate (check_attr_schema_conformance.py)
G2       Fails a clone run that emits an attribute a block does not
         declare (TYPE), or an out-of-enum value for one it does (ENUM) —
         Bean's "fail closed on an undeclared shape" ruling, the GENERAL
         backstop behind the two specific bugs Tasks 1/2 fixed inside the
         converter's own resolvers. NO baseline — every violation is a
         live regression. Opt out with --skip-attr-schema-gate
         (diagnostic runs only).

ADDING A NEW GATE
=================
Add a function named gate_<name>(run_dir: Path) -> None and call it from
run_all_gates().  Raise SystemExit(1) (or let subprocess.run check=True do it)
on failure.

WIRING THIS SCRIPT
==================
Call from the orchestrator or clone runner after the clone artefacts are written:

    python pipeline-stage-gate.py <run_dir>

Or from orchestrator_main.py just before the staged-merge step:

    import subprocess
    subprocess.run(
        [sys.executable, str(GATE_SCRIPT), str(run_dir)],
        check=True,
    )

UK English in all output.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent

# Path to the anti-mirror gate script (sibling file).
CHECK_NO_MIRROR = HERE / "check_no_mirror.py"

# Committed baseline — 10 unique (block, class) pairs covering the 13 legacy
# violations present in the converter's current (mid-rebuild) output.
# This path is relative to HERE so it works from any working directory.
BASELINE_PATH = HERE / "check-no-mirror-baseline.json"

# Path to the Spec 35 flat-to-object migration gate (sibling file).
CHECK_FLAT_TIER_REGRESSION = HERE / "check_flat_tier_regression.py"

# Path to the Task 3 / G2 attribute-schema conformance gate (sibling file).
CHECK_ATTR_SCHEMA_CONFORMANCE = HERE / "check_attr_schema_conformance.py"


# ---------------------------------------------------------------------------
# Gate implementations
# ---------------------------------------------------------------------------

def gate_r22_15_anti_mirror(run_dir: Path) -> None:
    """R-31-15 anti-mirror gate.

    Runs check_no_mirror.py in --enforce --baseline mode.
    Grandfathered (baselined) violations exit 0.
    Any NEW violation (absent from the baseline) causes exit 1, blocking the
    pipeline.

    WIRE POINT — this is the # R-31-15 WIRE POINT referenced in
    check_no_mirror.py's docstring.  The call is here, not in package.json
    prebuild, because the gate inspects clone-run output (extract.json
    block_markup) which only exists post-clone.  §12.7 says "prebuild" but
    npm prebuild precedes any clone run and has no run_dir to inspect —
    post-clone is the correct (and only viable) wire point.
    """
    # R-31-15 WIRE POINT
    subprocess.run(
        [
            sys.executable,
            str(CHECK_NO_MIRROR),
            str(run_dir),
            "--enforce",
            "--baseline",
            str(BASELINE_PATH),
        ],
        check=True,  # raises CalledProcessError → propagates as non-zero exit
    )


def gate_flat_tier_regression(run_dir: Path) -> None:
    """Spec 35 / D554-C flat-to-object migration gate.

    Runs check_flat_tier_regression.py in --enforce mode against the same
    post-Stage-9 extract.json this module's R-31-15 gate already reads.
    Unlike the anti-mirror gate, this one carries NO baseline — D554-C
    (decisions.md, Bean-ruled 2026-08-10) explicitly rejected a converter
    shim, so every flat-tier-on-a-migrated-property emission is a live
    regression to fix, not a legacy debt to grandfather. Any violation
    hard-halts the clone run.
    """
    subprocess.run(
        [
            sys.executable,
            str(CHECK_FLAT_TIER_REGRESSION),
            str(run_dir),
            "--enforce",
        ],
        check=True,  # raises CalledProcessError → propagates as non-zero exit
    )


def gate_attr_schema_conformance(run_dir: Path) -> None:
    """Task 3 / G2 attribute-schema conformance gate.

    Runs check_attr_schema_conformance.py in --enforce mode against the same
    post-Stage-9 extract.json the other two gates already read. No baseline —
    Bean's "fail closed on an undeclared shape" ruling treats every emission
    of an attribute a block does not declare (or an out-of-enum value for one
    it does) as a live regression to fix, not a legacy debt to grandfather.
    Any violation hard-halts the clone run.
    """
    subprocess.run(
        [
            sys.executable,
            str(CHECK_ATTR_SCHEMA_CONFORMANCE),
            str(run_dir),
            "--enforce",
        ],
        check=True,  # raises CalledProcessError → propagates as non-zero exit
    )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def run_all_gates(
    run_dir: Path,
    *,
    skip_flat_tier_gate: bool = False,
    skip_attr_schema_gate: bool = False,
) -> None:
    """Run every armed gate in sequence.  Raises SystemExit(1) on first failure."""
    print(f"pipeline-stage-gate: running gates on {run_dir.name}")

    gate_r22_15_anti_mirror(run_dir)

    if skip_flat_tier_gate:
        print("pipeline-stage-gate: Spec 35 flat-tier-regression gate skipped per --skip-flat-tier-gate")
    else:
        gate_flat_tier_regression(run_dir)

    if skip_attr_schema_gate:
        print("pipeline-stage-gate: Task 3 / G2 attr-schema-conformance gate skipped per --skip-attr-schema-gate")
    else:
        gate_attr_schema_conformance(run_dir)

    print("pipeline-stage-gate: all gates passed.")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Post-clone structural gates for the SGS cloning pipeline.",
    )
    parser.add_argument(
        "run_dir",
        help="Path to the pipeline-state/<run> directory produced by /sgs-clone.",
    )
    parser.add_argument(
        "--skip-flat-tier-gate",
        action="store_true",
        default=False,
        help="Skip the Spec 35 / D554-C flat-to-object migration gate "
             "(check_flat_tier_regression.py). Use only for diagnostic runs "
             "where you need to inspect flat-tier output without halting. "
             "The R-31-15 anti-mirror gate still runs. (default: False — "
             "the gate runs.)",
    )
    parser.add_argument(
        "--skip-attr-schema-gate",
        action="store_true",
        default=False,
        help="Skip the Task 3 / G2 attribute-schema conformance gate "
             "(check_attr_schema_conformance.py). Use only for diagnostic "
             "runs where you need to inspect an undeclared-attribute/enum "
             "emission without halting. The other gates still run. "
             "(default: False — the gate runs.)",
    )
    args = parser.parse_args(argv)

    run_dir = Path(args.run_dir)
    if not run_dir.is_dir():
        print(f"ERROR: run_dir not found: {run_dir}", file=sys.stderr)
        return 2

    try:
        run_all_gates(
            run_dir,
            skip_flat_tier_gate=args.skip_flat_tier_gate,
            skip_attr_schema_gate=args.skip_attr_schema_gate,
        )
    except subprocess.CalledProcessError as exc:
        # Gate script already printed its own error; just relay the exit code.
        return exc.returncode or 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
