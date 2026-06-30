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


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def run_all_gates(run_dir: Path) -> None:
    """Run every armed gate in sequence.  Raises SystemExit(1) on first failure."""
    print(f"pipeline-stage-gate: running gates on {run_dir.name}")

    gate_r22_15_anti_mirror(run_dir)

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
    args = parser.parse_args(argv)

    run_dir = Path(args.run_dir)
    if not run_dir.is_dir():
        print(f"ERROR: run_dir not found: {run_dir}", file=sys.stderr)
        return 2

    try:
        run_all_gates(run_dir)
    except subprocess.CalledProcessError as exc:
        # Gate script already printed its own error; just relay the exit code.
        return exc.returncode or 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
