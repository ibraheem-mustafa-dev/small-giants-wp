"""Command line for check-wiring-fingerprint.py."""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path

import wf_baseline
from wf_inputs import load_inputs
from wf_links import ADVISORY, LINK_MEANING
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


NEXT_STEP = (
    "Next step: fix the wiring (the detail line says what is missing), or, when the gap is intended, accept it:\n"
    "    python scripts/check-wiring-fingerprint.py --accept <id> [<id> ...]\n"
    "  and give the reason in the commit message."
)


def print_gap(g: str, finding: dict) -> None:
    link = finding["link"]
    print("    " + g)
    print(f"        {link}: {LINK_MEANING.get(link, '')}")
    if finding.get("detail"):
        print(f"        detail: {finding['detail']}")


def main(argv: list[str] | None = None, roots: Roots | None = None, baseline_path: Path | None = None, with_dump: bool = True) -> int:
    if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Wiring-fingerprint gate: every painting attribute must be wired end to end.")
    ap.add_argument("--check", action="store_true", help="fail on any blocking gap not in the baseline")
    ap.add_argument("--update-baseline", action="store_true", help="rewrite the baseline from every current blocking gap")
    ap.add_argument("--accept", nargs="+", metavar="ID", help="add only these current gaps (<block>::<attr>::<link>) to the baseline")
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
        wf_baseline.write(baseline_path, report["findings"], ADVISORY)
        print(f"[wiring-fingerprint] baseline written: {len(wf_baseline.load(baseline_path))} blocking gaps ({elapsed:.1f}s)")
        return 0
    if args.accept:
        added, refused = wf_baseline.accept(baseline_path, args.accept, report["findings"], ADVISORY)
        if refused:
            print("[wiring-fingerprint] --accept refused (baseline unchanged):")
            for r in refused:
                print("    " + r)
            return 2
        print(f"[wiring-fingerprint] accepted into the baseline: {len(added)} gap(s); give the reason in the commit message.")
        for g in added:
            print("    " + g)
        return 0
    baseline = wf_baseline.load(baseline_path)
    new_blocking, advisory, fixed = wf_baseline.compare(report["findings"], baseline, ADVISORY)
    if advisory:
        by_link = Counter(g.rsplit("::", 1)[-1] for g in advisory)
        print("  advisory (never blocks, not baselined): " + ", ".join(f"{k} {v}" for k, v in sorted(by_link.items()))
              + " (details: --json)")
    if fixed:
        print(f"  {len(fixed)} baselined gap(s) are fixed; tighten with --update-baseline:")
        for g in fixed[:40]:
            print("    " + g)
    if new_blocking:
        by_id = {wf_baseline.gap_id(f): f for f in report["findings"]}
        print(f"[wiring-fingerprint] FAIL: {len(new_blocking)} new gap(s) not in the baseline:")
        for g in new_blocking:
            print_gap(g, by_id[g])
        print(NEXT_STEP)
        return 1 if args.check else 0
    print(f"[wiring-fingerprint] PASS: no new gaps ({len(baseline)} baselined, {elapsed:.1f}s)")
    return 0
