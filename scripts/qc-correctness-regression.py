#!/usr/bin/env python3
"""
Mechanical regression checker for the SGS clone pipeline.

Runs the orchestrator against reference mockups and verifies the output
extract.json hasn't drifted from committed baselines.

Usage:
  python scripts/qc-correctness-regression.py
    Run all fixtures, compare to baselines, exit 1 on drift.

  python scripts/qc-correctness-regression.py --bootstrap mamas-munches-homepage
    Re-run the named fixture, overwrite its baseline with current output.

  python scripts/qc-correctness-regression.py --json
    JSON output mode.

  python scripts/qc-correctness-regression.py --verbose
    Print full diff per mockup.
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[1]
ORCHESTRATOR_SCRIPT = REPO / "plugins" / "sgs-blocks" / "scripts" / "sgs-clone-orchestrator.py"
BASELINES_DIR = REPO / "reports" / "baselines"
PIPELINE_STATE_DIR = REPO / "pipeline-state"


def load_fixtures(fixture_file: Path) -> list[dict]:
    """Load test fixtures from JSON file."""
    if not fixture_file.exists():
        print(f"ERROR: Fixture file not found: {fixture_file}", file=sys.stderr)
        sys.exit(2)

    with open(fixture_file, encoding="utf-8") as f:
        return json.load(f)


def run_orchestrator(
    mockup: str,
    client: str,
    page: str,
) -> tuple[Path, dict]:
    """
    Run the orchestrator in extract-only mode.

    Returns: (run_dir, extract_json_dict)
    """
    cmd = [
        sys.executable,
        str(ORCHESTRATOR_SCRIPT),
        "--mockup",
        mockup,
        "--client",
        client,
        "--page",
        page,
        "--auto-section",
        "--skip-autonomy-gate",
        "--skip-register",
        "--converter-v2",
        "--mode",
        "draft",
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Orchestrator timeout (120s)")
    except Exception as e:
        raise RuntimeError(f"Orchestrator execution failed: {e}")

    if result.returncode != 0:
        raise RuntimeError(
            f"Orchestrator failed with code {result.returncode}.\n"
            f"stderr: {result.stderr}\n"
            f"stdout: {result.stdout[-500:]}"  # Last 500 chars
        )

    # Parse run_id from stdout. The orchestrator prints: [orchestrator] run_id=<id>
    match = re.search(r"run_id=([a-z0-9-]+)", result.stdout)
    if not match:
        raise RuntimeError(
            f"Could not extract run_id from orchestrator output.\n"
            f"stdout: {result.stdout[-1000:]}"
        )

    run_id = match.group(1)
    run_dir = PIPELINE_STATE_DIR / run_id
    extract_path = run_dir / "extract.json"

    if not extract_path.exists():
        raise RuntimeError(f"Extract file not found: {extract_path}")

    with open(extract_path, encoding="utf-8") as f:
        extract_dict = json.load(f)

    return run_dir, extract_dict


def compare_json(baseline: dict, current: dict) -> tuple[bool, dict]:
    """
    Compare baseline and current JSON structures.

    Excludes path-dependent fields like extract_result_path which change
    on every run due to unique run_id directories.

    Returns: (matches: bool, stats: dict with added/removed/changed counts)
    """
    stats = {"added": [], "removed": [], "changed": []}

    # Fields to ignore (path-dependent, timestamp-dependent, etc.)
    ignore_keys = {"extract_result_path"}

    # Recursively compare all keys
    all_keys = (set(baseline.keys()) | set(current.keys())) - ignore_keys

    for key in sorted(all_keys):
        if key not in baseline:
            stats["added"].append(key)
        elif key not in current:
            stats["removed"].append(key)
        elif baseline[key] != current[key]:
            stats["changed"].append(key)

    matches = (
        len(stats["added"]) == 0
        and len(stats["removed"]) == 0
        and len(stats["changed"]) == 0
    )

    return matches, stats


def format_diff_summary(stats: dict, verbose: bool = False) -> str:
    """Format diff statistics for display."""
    lines = []

    if stats["added"]:
        lines.append(f"  Added keys ({len(stats['added'])}): {stats['added'][:3]}")
        if len(stats["added"]) > 3:
            lines[-1] += f" ... and {len(stats['added']) - 3} more"

    if stats["removed"]:
        lines.append(f"  Removed keys ({len(stats['removed'])}): {stats['removed'][:3]}")
        if len(stats["removed"]) > 3:
            lines[-1] += f" ... and {len(stats['removed']) - 3} more"

    if stats["changed"]:
        lines.append(f"  Changed keys ({len(stats['changed'])}): {stats['changed'][:3]}")
        if len(stats["changed"]) > 3:
            lines[-1] += f" ... and {len(stats['changed']) - 3} more"

    if not lines:
        lines.append("  No differences")

    return "\n".join(lines)


def run_regression_test(
    fixture_file: Path,
    bootstrap_name: str | None = None,
    json_output: bool = False,
    verbose: bool = False,
) -> int:
    """
    Run regression tests.

    Returns exit code: 0 = pass, 1 = drift, 2 = error.
    """
    fixtures = load_fixtures(fixture_file)
    results = []

    # Check for missing baselines first
    if not bootstrap_name:
        missing = []
        for fixture in fixtures:
            baseline_path = Path(fixture["baseline"])
            if not baseline_path.exists():
                missing.append(fixture["name"])

        if missing:
            if not json_output:
                print(f"Missing baselines: {missing}", file=sys.stderr)
                print(
                    f"To create baselines, run:",
                    file=sys.stderr,
                )
                for name in missing:
                    print(f"  python scripts/qc-correctness-regression.py --bootstrap {name}",
                          file=sys.stderr)
            return 2

    for fixture in fixtures:
        fixture_name = fixture["name"]

        # If bootstrapping, only process the named fixture
        if bootstrap_name and fixture_name != bootstrap_name:
            continue

        try:
            mockup = fixture["mockup"]
            client = fixture["client"]
            page = fixture["page"]
            baseline_path = Path(fixture["baseline"])

            # Validate mockup exists
            mockup_path = REPO / mockup
            if not mockup_path.exists():
                results.append({
                    "name": fixture_name,
                    "status": "error",
                    "message": f"Mockup not found: {mockup}",
                })
                continue

            # Run orchestrator
            run_dir, extract_dict = run_orchestrator(mockup, client, page)

            if bootstrap_name:
                # Bootstrap mode: write baseline
                baseline_path.parent.mkdir(parents=True, exist_ok=True)
                with open(baseline_path, "w", encoding="utf-8") as f:
                    json.dump(extract_dict, f, indent=2, ensure_ascii=False)

                results.append({
                    "name": fixture_name,
                    "status": "bootstrapped",
                    "baseline_path": str(baseline_path),
                    "baseline_size_bytes": baseline_path.stat().st_size,
                    "extracted_keys": len(extract_dict.get("extracted_attributes", {})),
                })
                continue

            # Compare mode
            if not baseline_path.exists():
                results.append({
                    "name": fixture_name,
                    "status": "error",
                    "message": f"Baseline not found: {baseline_path}",
                })
                continue

            with open(baseline_path, encoding="utf-8") as f:
                baseline_dict = json.load(f)

            matches, stats = compare_json(baseline_dict, extract_dict)

            results.append({
                "name": fixture_name,
                "status": "pass" if matches else "fail",
                "run_dir": str(run_dir),
                "matches": matches,
                "added_count": len(stats["added"]),
                "removed_count": len(stats["removed"]),
                "changed_count": len(stats["changed"]),
                "diff_summary": format_diff_summary(stats, verbose),
            })

        except Exception as e:
            results.append({
                "name": fixture_name,
                "status": "error",
                "message": str(e),
            })

    # Report results
    if json_output:
        print(json.dumps(results, indent=2))
    else:
        for result in results:
            print(f"\n{result['name']}:")
            if result["status"] == "bootstrapped":
                print(f"  BASELINE BOOTSTRAPPED")
                print(f"  Path: {result['baseline_path']}")
                print(f"  Size: {result['baseline_size_bytes']} bytes")
                print(f"  Extracted keys: {result['extracted_keys']}")
            elif result["status"] == "pass":
                print(f"  PASS — Zero diff")
            elif result["status"] == "fail":
                print(f"  FAIL — Drift detected")
                print(
                    f"    Added: {result['added_count']}, "
                    f"Removed: {result['removed_count']}, "
                    f"Changed: {result['changed_count']}"
                )
                if verbose:
                    print(result["diff_summary"])
            else:  # error
                print(f"  ERROR: {result['message']}")

    # Determine exit code
    if bootstrap_name:
        # Bootstrap mode exits 0 on success
        all_bootstrapped = all(r["status"] == "bootstrapped" for r in results)
        return 0 if all_bootstrapped else 2

    # Compare mode
    all_pass = all(r["status"] == "pass" for r in results)
    has_error = any(r["status"] == "error" for r in results)

    if has_error:
        return 2
    if all_pass:
        return 0
    return 1


def main():
    parser = argparse.ArgumentParser(
        description="Mechanical regression checker for SGS clone pipeline."
    )
    parser.add_argument(
        "--bootstrap",
        type=str,
        metavar="NAME",
        help="Bootstrap a fixture baseline (overwrite if exists)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="JSON output mode",
    )
    parser.add_argument(
        "--fixture-file",
        type=Path,
        default=REPO / "scripts" / "qc-correctness-regression-fixtures.json",
        help="Path to fixtures JSON file",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print full diff per mockup",
    )

    args = parser.parse_args()

    exit_code = run_regression_test(
        fixture_file=args.fixture_file,
        bootstrap_name=args.bootstrap,
        json_output=args.json,
        verbose=args.verbose,
    )

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
