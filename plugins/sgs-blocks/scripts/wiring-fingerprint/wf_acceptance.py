"""Acceptance measurements for the wiring-fingerprint gate (Task 2 of
.claude/plans/2026-10-04-wiring-fingerprint-gate.md), measured against the QC
council's labelled evidence and the calibration cache. The oracles live outside
the shipped tree (`.claude/reports/2026-10-04-route-data-audit/council/`, the
gitignored `scripts/computed-route/cache/`); each measurement reports `None`
when its oracle is absent. Never imported by the gate itself.

    python scripts/wiring-fingerprint/wf_acceptance.py [--report report.json]
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from wf_paint import EXTRA_SUFFIXES, PaintClassifier  # noqa: E402
from wf_paths import REPO, real_roots  # noqa: E402

BRIEF_SUFFIX = PaintClassifier([])
BRIEF_EXTRA = {s for s, _css in EXTRA_SUFFIXES}

COUNCIL = REPO / ".claude" / "reports" / "2026-10-04-route-data-audit" / "council"
CACHE = REPO / "scripts" / "computed-route" / "cache"
LINK_ALIASES = {"L3": ("L3", "L3-tier", "L3-state"), "L2": ("L2",), "L4": ("L4",), "L5": ("L5",), "L6": ("L6",), "L7": ("L7",), "C1": ("C1",)}
KNOWN_BUGS = (
    ("sgs/accordion-item", None, "B1"),
    ("sgs/team-member", None, "B2"),
    ("sgs/container", None, "B3"),
    ("sgs/container", "gridItemBackground", "C1"),
)


def rater_a(report: dict) -> dict | None:
    path = COUNCIL / "rater-a-verdicts.csv"
    if not path.exists():
        return None
    flagged = defaultdict(set)
    for f in report["findings"]:
        flagged[(f["block"], f["attr"])].add(f["link"])
    out = {}
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    for link in sorted({r["class"] for r in rows}):
        tp = fp = fn = 0
        fps, fns = [], []
        for r in rows:
            if r["class"] != link or r["verdict"].startswith("UNCLEAR"):
                continue
            true = r["verdict"].startswith("TRUE")
            # The rater relabelled some L7 rows as missing canvas mirrors: measure them as L3.
            as_link = "L3" if "L3 mislabelled" in r["verdict"] else link
            hit = bool(flagged[(r["block"], r["attr"])] & set(LINK_ALIASES.get(as_link, (as_link,))))
            if hit and true:
                tp += 1
            elif hit:
                fp += 1
                fps.append(f"{r['block']}::{r['attr']}")
            elif true:
                fn += 1
                fns.append(f"{r['block']}::{r['attr']} ({r['verdict']})")
        prec = round(100 * tp / (tp + fp), 1) if (tp + fp) else None
        rec = round(100 * tp / (tp + fn), 1) if (tp + fn) else None
        out[link] = {"flagged": tp + fp, "true_flagged": tp, "precision_pct": prec, "recall_pct": rec,
                     "false_flags": fps, "true_not_flagged": fns}
    return out


def rater_b(report: dict) -> dict | None:
    path = COUNCIL / "rater-b-notpaint-reclassified.csv"
    if not path.exists():
        return None
    cat = {(r["block"], r["attr"]): r["category"] for r in report["records"]}
    paint_in = paint_out = not_in = not_out = 0
    dis_paint, dis_not, overrides = [], [], []
    units = 0
    for row in csv.reader(path.open(encoding="utf-8")):
        label, _sub, block, attr = row[0], row[1], row[2], row[3]
        mine = cat.get((block, attr))
        if mine is None:
            continue
        if label != "NOT":
            if attr.endswith("Unit"):
                units += 1
                continue
            if mine != "not":
                paint_in += 1
            else:
                paint_out += 1
                dis_paint.append(f"{block}::{attr} ({label})")
        else:
            if mine == "not":
                not_out += 1
            elif BRIEF_SUFFIX.suffix_hit(attr) in BRIEF_EXTRA:
                overrides.append(f"{block}::{attr}")  # the brief names this suffix as CSS-bearing
            else:
                not_in += 1
                dis_not.append(f"{block}::{attr}")
    return {
        "painting_rows_in_population_pct": round(100 * paint_in / max(1, paint_in + paint_out), 1),
        "not_paint_rows_outside_pct": round(100 * not_out / max(1, not_out + not_in), 1),
        "painting_rows": paint_in + paint_out, "not_paint_rows": not_out + not_in,
        "unit_companions_excluded": units,
        "brief_suffix_overrides_excluded": sorted(overrides),
        "painting_rows_left_out": sorted(dis_paint), "not_paint_rows_taken_in": sorted(dis_not),
    }


def calibration(report: dict) -> dict | None:
    if not CACHE.exists():
        return None
    rec = {(r["block"], r["attr"]): r for r in report["records"]}
    # An extension attribute (every block carries it) is one record per extension.
    ext = {r["attr"]: r for r in report["records"] if r["block"].startswith("ext/")}
    total = 0
    outside, flagged = [], []
    for f in sorted(CACHE.glob("*.json")):
        if f.name.endswith(".tree.json"):
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        for attr in sorted(d.get("settings", {})):
            total += 1
            r = rec.get((d["block"], attr)) or ext.get(attr)
            if not r or r["category"] == "not":
                outside.append(f"{d['block']}::{attr}")
                continue
            bad = [m for m in r.get("missing", []) if m in ("L5", "L7")]
            if bad:
                flagged.append(f"{d['block']}::{attr}::{'+'.join(bad)}")
    return {"calibrated_settings": total, "outside_population": outside, "with_L5_or_L7": flagged}


def known_bugs(report: dict) -> dict:
    out = {}
    for block, attr, link in KNOWN_BUGS:
        hits = [f for f in report["findings"] if f["block"] == block and f["link"] == link and (attr is None or f["attr"] == attr)]
        out[f"{block}::{attr or '*'}::{link}"] = sorted(f["attr"] for f in hits)
    return out


def measure(report: dict) -> dict:
    return {"rater_a": rater_a(report), "rater_b": rater_b(report), "calibration": calibration(report), "known_bugs": known_bugs(report),
            "summary": report["summary"]}


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", help="a --json report from check-wiring-fingerprint.py (default: run the scan)")
    ap.add_argument("--out", help="write the measurements as JSON")
    args = ap.parse_args()
    if args.report:
        report = json.loads(Path(args.report).read_text(encoding="utf-8"))
    else:
        from wf_cli import run

        report = run(real_roots())
    m = measure(report)
    if args.out:
        Path(args.out).write_text(json.dumps(m, indent=1, sort_keys=True), encoding="utf-8")
    ra = m["rater_a"] or {}
    for link, v in ra.items():
        print(f"Rater A {link}: flagged {v['flagged']}, true {v['true_flagged']}, precision {v['precision_pct']}%, "
              f"recall {v['recall_pct']}% (true gaps not flagged {len(v['true_not_flagged'])})")
    rb = m["rater_b"]
    if rb:
        print(f"Rater B: painting rows inside {rb['painting_rows_in_population_pct']}% of {rb['painting_rows']} "
              f"(+{rb['unit_companions_excluded']} unit companions excluded), not-paint rows outside {rb['not_paint_rows_outside_pct']}% of {rb['not_paint_rows']} "
              f"(+{len(rb['brief_suffix_overrides_excluded'])} rows the brief's suffix list classes as paint)")
    cal = m["calibration"]
    if cal:
        print(f"Calibration: {cal['calibrated_settings']} settings, outside population {len(cal['outside_population'])}, with L5/L7 {len(cal['with_L5_or_L7'])}")
    for k, v in m["known_bugs"].items():
        print(f"Known bug {k}: {'FOUND ' + ','.join(v[:4]) if v else 'MISSING'}")
    print("Counts:", Counter({k: v for k, v in m["summary"]["links"].items()}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
