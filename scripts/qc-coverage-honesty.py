#!/usr/bin/env python3
"""QC Coverage Honesty — Assert Phase 2 fix improves metric accuracy.

Usage: python scripts/qc-coverage-honesty.py [--run-dir DIR] [--bootstrap] [--json] [--verbose]
Exit: 0=pass/first-run, 1=regression, 3=Phase 2 not shipped.
"""
from __future__ import annotations

import argparse, ast, json, sys, importlib.util
from datetime import datetime, timezone
from pathlib import Path


def find_latest_run_dir(root: Path = None) -> Path | None:
    """Find latest mamas-munches-homepage run with expected-rules-b5.jsonl."""
    root = root or Path(__file__).resolve().parent.parent / "pipeline-state"
    if not root.exists():
        return None
    candidates = [e for e in root.iterdir()
                  if e.is_dir() and "mamas-munches-homepage" in e.name
                  and (e / "expected-rules-b5.jsonl").exists()]
    return max(candidates, key=lambda p: p.stat().st_mtime) if candidates else None


def check_compute_attribute_coverage_exists() -> bool:
    """Check if compute_attribute_coverage is defined in pixel-diff.py via AST."""
    try:
        code = (Path(__file__).resolve().parent.parent / "scripts" / "pixel-diff.py").read_text()
        return any(isinstance(n, ast.FunctionDef) and n.name == "compute_attribute_coverage"
                   for n in ast.walk(ast.parse(code)))
    except Exception:  # noqa: BLE001
        return False


def load_compute_attribute_coverage():
    """Load compute_attribute_coverage from pixel-diff.py."""
    import unittest.mock as mock
    repo_root = Path(__file__).resolve().parent.parent
    pixel_diff_path = repo_root / "scripts" / "pixel-diff.py"
    try:
        with mock.patch.dict('sys.modules', {
            'playwright': mock.MagicMock(), 'playwright.sync_api': mock.MagicMock(),
            'PIL': mock.MagicMock(), 'PIL.Image': mock.MagicMock(),
            'PIL.ImageChops': mock.MagicMock(), 'PIL.ImageDraw': mock.MagicMock(),
        }):
            spec = importlib.util.spec_from_file_location("pixel_diff", pixel_diff_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return getattr(module, "compute_attribute_coverage", None)
    except Exception:  # noqa: BLE001
        return None


def run_coverage_check(run_dir: Path, verbose: bool = False) -> dict:
    """Run coverage check for brand section (b5)."""
    compute_cov = load_compute_attribute_coverage()
    if not compute_cov:
        return {"error": "compute_attribute_coverage not yet defined", "section": "brand",
                "status": "phase_2_not_shipped"}

    expected_rules_path = run_dir / "expected-rules-b5.jsonl"
    extract_path = run_dir / "extract.json"

    if not extract_path.exists():
        return {"error": f"extract.json not found", "section": "brand"}

    with open(extract_path, "r", encoding="utf-8") as f:
        per_section = json.load(f).get("per_section_results", [])

    b5_entry = next((e for e in per_section if isinstance(e, dict) and e.get("boundary_id") == "b5"), None)
    if not b5_entry:
        return {"error": "boundary_id b5 not found", "section": "brand"}

    extracted_attrs = b5_entry.get("extracted_attributes", {})
    temp_attrs_file = run_dir / ".qc-coverage-temp-attrs.json"
    temp_attrs_file.write_text(json.dumps({"extracted_attributes": extracted_attrs}), encoding="utf-8")

    try:
        result = compute_cov(expected_rules_path, temp_attrs_file)
        if verbose and result.get("uncovered_rules"):
            print("\nUncovered rules (sample):", file=sys.stderr)
            for r in result["uncovered_rules"][:10]:
                print(f"  - {r}", file=sys.stderr)
        return {
            "section": "brand", "coverage_percent": result.get("coverage_percent"),
            "total_rules": result.get("total_rules"), "covered_rules": result.get("covered_rules"),
            "uncovered_count": len(result.get("uncovered_rules", [])), "note": result.get("note"),
        }
    finally:
        temp_attrs_file.unlink(missing_ok=True)


def load_baseline(p: Path) -> dict | None:
    """Load baseline JSON if it exists."""
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def save_baseline(p: Path, result: dict) -> None:
    """Save result as baseline."""
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "section": result.get("section"), "coverage_percent": result.get("coverage_percent"),
        "total_rules": result.get("total_rules"), "covered_rules": result.get("covered_rules"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    p.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def format_table(baseline: dict | None, current: dict) -> str:
    """Format human-readable output."""
    lines = [f"Section: {current['section']}"]
    cov_pct = current.get("coverage_percent")
    if cov_pct is None:
        lines.append(f"  Current:           ERROR - {current.get('error')}")
        return "\n".join(lines)
    lines.append(f"  Current:           {cov_pct:.1f}% (denominator: {current.get('total_rules')} rules, {current.get('covered_rules')} covered)")
    if baseline is None:
        lines.append(f"  Delta:             baseline (first run)")
    else:
        base_pct = baseline.get("coverage_percent")
        if base_pct is not None:
            delta = cov_pct - base_pct
            lines.append(f"  Pre-fix baseline:  {base_pct:.1f}% (denominator: {baseline.get('total_rules')} rules)")
            lines.append(f"  Delta:             {'+' if delta > 0 else ''}{delta:.1f} ({'improvement' if delta > 0 else 'regression' if delta < 0 else 'equal'})")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run-dir", type=Path, help="Explicit pipeline-state run directory")
    ap.add_argument("--bootstrap", action="store_true", help="Set new baseline")
    ap.add_argument("--json", action="store_true", help="JSON output")
    ap.add_argument("--verbose", action="store_true", help="Per-rule decisions")
    args = ap.parse_args()

    run_dir = (args.run_dir or find_latest_run_dir())
    if not run_dir or not run_dir.resolve().exists():
        print("ERROR: Could not find mamas-munches-homepage run", file=sys.stderr)
        return 5

    run_dir = run_dir.resolve()
    print(f"[QC-COVERAGE-HONESTY] Using run: {run_dir.name}", file=sys.stderr)

    if not check_compute_attribute_coverage_exists():
        print("compute_attribute_coverage not yet defined — Phase 2 must ship first.", file=sys.stderr)
        if args.json:
            print(json.dumps({"status": "phase_2_not_shipped"}))
        return 3

    current = run_coverage_check(run_dir, verbose=args.verbose)

    if "error" in current:
        if current.get("status") == "phase_2_not_shipped":
            print("compute_attribute_coverage not yet defined — Phase 2 must ship first.", file=sys.stderr)
            if args.json:
                print(json.dumps({"status": "phase_2_not_shipped"}))
            return 3
        print(f"ERROR: {current['error']}", file=sys.stderr)
        if args.json:
            print(json.dumps(current))
        return 5

    baseline_path = Path(__file__).resolve().parent.parent / "reports" / "coverage-honesty-baseline.json"
    baseline = load_baseline(baseline_path)

    if args.bootstrap:
        save_baseline(baseline_path, current)
        print(f"[QC-COVERAGE-HONESTY] Baseline written: {baseline_path}", file=sys.stderr)
        if args.json:
            current["baseline_written"] = True
            print(json.dumps(current, indent=2))
        else:
            print(format_table(None, current))
        return 0

    if args.json:
        output = {"current": current, "baseline": baseline}
        if baseline and (cov := current.get("coverage_percent")) is not None and (base := baseline.get("coverage_percent")) is not None:
            output["delta"] = round(cov - base, 2)
        print(json.dumps(output, indent=2))
    else:
        print(format_table(baseline, current))

    if baseline is None:
        save_baseline(baseline_path, current)
        print(f"[QC-COVERAGE-HONESTY] First run — baseline written", file=sys.stderr)
        return 0

    cov_pct = current.get("coverage_percent")
    base_pct = baseline.get("coverage_percent")
    if cov_pct is None or base_pct is None:
        print("[QC-COVERAGE-HONESTY] Cannot compare (missing coverage_percent)", file=sys.stderr)
        return 5

    if cov_pct < base_pct:
        print(f"[QC-COVERAGE-HONESTY] REGRESSION: {cov_pct:.1f}% < {base_pct:.1f}%", file=sys.stderr)
        return 1

    print(f"[QC-COVERAGE-HONESTY] PASS: {cov_pct:.1f}% >= {base_pct:.1f}%", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
