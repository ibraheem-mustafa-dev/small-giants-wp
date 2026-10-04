"""Acceptance check on the real repository (Task 2 of
.claude/plans/2026-10-04-wiring-fingerprint-gate.md), run on demand, never by the
default `pytest` run: its answers move with the framework's code (a Session 0 fix
removes a known bug; a new block shifts a rater's share), so it is a measurement,
not a regression test.

    python scripts/wiring-fingerprint/tests/acceptance_check.py [--report report.json]

Measures, against the QC council's labelled rows and the calibration cache (each
skipped with a note when its oracle is not on this machine):

  Rater A  precision per link (floors: L2, L5, L7 90%; L3 95%) and recall (reported)
  Rater B  painting rows inside the population and true not-paint rows outside it
           (floors: 95% each side)
  calibration  every setting calibration proved paints has no L5 or L7 finding
  known bugs   the framework bugs the bug-class rules were built on (reported:
               found, or gone because the bug was fixed)

Exit 1 when a floor fails; 0 otherwise.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import wf_acceptance  # noqa: E402
from wf_paths import real_roots  # noqa: E402

PRECISION = {"L2": 90.0, "L5": 90.0, "L7": 90.0, "L3": 95.0}
RATER_B_FLOOR = 95.0


def failures(m: dict) -> list[str]:
    out = []
    ra = m["rater_a"]
    if ra is not None:
        for link, floor in PRECISION.items():
            got = ra.get(link, {})
            if got.get("flagged") and got["precision_pct"] < floor:
                out.append(f"Rater A {link} precision {got['precision_pct']}% < {floor}%")
    rb = m["rater_b"]
    if rb is not None:
        if rb["painting_rows_in_population_pct"] < RATER_B_FLOOR:
            out.append(f"Rater B painting rows inside {rb['painting_rows_in_population_pct']}% < {RATER_B_FLOOR}%")
        if rb["not_paint_rows_outside_pct"] < RATER_B_FLOOR:
            out.append(f"Rater B not-paint rows outside {rb['not_paint_rows_outside_pct']}% < {RATER_B_FLOOR}%")
    cal = m["calibration"]
    if cal is not None and cal["with_L5_or_L7"]:
        out.append("calibrated settings with L5/L7: " + ", ".join(cal["with_L5_or_L7"]))
    return out


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", help="a --json report from check-wiring-fingerprint.py (default: run the scan)")
    args = ap.parse_args()
    if args.report:
        report = json.loads(Path(args.report).read_text(encoding="utf-8"))
    else:
        from wf_cli import run

        report = run(real_roots())
    m = wf_acceptance.measure(report)
    for name in ("rater_a", "rater_b", "calibration"):
        if m[name] is None:
            print(f"{name}: oracle not on this machine, skipped")
    for link, v in (m["rater_a"] or {}).items():
        print(f"Rater A {link}: precision {v['precision_pct']}%, recall {v['recall_pct']}% "
              f"(flagged {v['flagged']}, true {v['true_flagged']}, true gaps not flagged {len(v['true_not_flagged'])})")
    rb = m["rater_b"]
    if rb:
        print(f"Rater B: painting rows inside {rb['painting_rows_in_population_pct']}% of {rb['painting_rows']}, "
              f"not-paint rows outside {rb['not_paint_rows_outside_pct']}% of {rb['not_paint_rows']}")
    cal = m["calibration"]
    if cal:
        print(f"Calibration: {cal['calibrated_settings']} settings, outside the population {len(cal['outside_population'])}, "
              f"with L5/L7 {len(cal['with_L5_or_L7'])}")
    for k, v in m["known_bugs"].items():
        print(f"Known bug {k}: " + ("found " + ", ".join(v[:4]) if v else "not found (fixed, or the rule lost it: check)"))
    bad = failures(m)
    for f in bad:
        print("FAIL: " + f)
    print("acceptance: " + ("FAIL" if bad else "PASS"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
