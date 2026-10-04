"""Command line for check-wiring-fingerprint.py."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import wf_baseline
from wf_inputs import load_inputs
from wf_links import ADVISORY
from wf_scan import scan
from wf_paths import BASELINE, Roots, real_roots


def run(roots: Roots, with_dump: bool = True) -> dict:
    inp = load_inputs(roots, with_dump=with_dump)
    report = scan(roots, inp)
    declared = {(name, a) for name, (_d, bj) in inp.blockjson.items() for a in (bj.get("attributes") or {})}
    report["unseeded"] = sorted(f"{b}::{a}" for b, a in declared - inp.seeded if not a.startswith("_"))
    report["unknown_blocks"] = sorted({r["block_slug"] for r in inp.rows} - set(inp.blockjson))
    return report


def print_summary(report: dict) -> None:
    s = report["summary"]
    pop = s["population"]
    print(f"[wiring-fingerprint] {s['attributes']} attributes: paint css {pop['css']}, js {pop['js']}, not-paint {pop['not-paint']}")
    print("  not-paint reasons: " + ", ".join(f"{k} {v}" for k, v in s["not_paint_reasons"].items()))
    print("  classes: " + ", ".join(f"{k} {v}" for k, v in s["classes"].items()))
    print("  findings by link: " + ", ".join(f"{k} {v}" for k, v in s["links"].items()))
    if report["unseeded"]:
        print(f"  declared in block.json but absent from the framework DB (reseed): {len(report['unseeded'])}")
        for g in report["unseeded"][:20]:
            print("    " + g)
    if report["unknown_blocks"]:
        print(f"  DB rows for blocks with no block.json: {', '.join(report['unknown_blocks'])}")


def main(argv: list[str] | None = None, roots: Roots | None = None, baseline_path: Path | None = None, with_dump: bool = True) -> int:
    if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Wiring-fingerprint gate: every painting attribute must be wired end to end.")
    ap.add_argument("--check", action="store_true", help="fail on any blocking gap not in the baseline")
    ap.add_argument("--update-baseline", action="store_true", help="rewrite the baseline from the current gaps")
    ap.add_argument("--json", metavar="FILE", help="write the full report (records, findings, summary)")
    args = ap.parse_args(argv)
    roots = roots or real_roots()
    baseline_path = baseline_path or BASELINE
    t0 = time.perf_counter()
    report = run(roots, with_dump=with_dump)
    elapsed = time.perf_counter() - t0
    print_summary(report)
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=1, sort_keys=True, default=sorted) + "\n", encoding="utf-8", newline="\n")
        print(f"  report written: {args.json}")
    if report["unseeded"] or report["unknown_blocks"]:
        print("[wiring-fingerprint] FAIL: attributes the gate could not classify (block.json and the framework DB disagree). "
              "Reseed the DB (/sgs-update) or fix the block.json.")
        return 2
    if args.update_baseline:
        wf_baseline.write(baseline_path, report["findings"], report["summary"])
        print(f"[wiring-fingerprint] baseline written: {len(report['findings'])} gaps ({elapsed:.1f}s)")
        return 0
    baseline = wf_baseline.load(baseline_path)
    new_blocking, new_advisory, fixed = wf_baseline.compare(report["findings"], baseline, ADVISORY)
    for g in new_advisory:
        print(f"  advisory (never blocks): {g}")
    if fixed:
        print(f"  {len(fixed)} baselined gap(s) are fixed; tighten with --update-baseline:")
        for g in fixed[:40]:
            print("    " + g)
    if new_blocking:
        print(f"[wiring-fingerprint] FAIL: {len(new_blocking)} new gap(s) not in the baseline:")
        for g in new_blocking:
            print("    " + g)
        return 1 if args.check else 0
    print(f"[wiring-fingerprint] PASS: no new gaps ({len(report['findings'])} baselined, {elapsed:.1f}s)")
    return 0
