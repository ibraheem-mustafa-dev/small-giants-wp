"""Per-section cropped pixel-diff matrix for the 2026-05-20 root-gap council.

Iterates 7 body sections x 3 viewports = 21 cells. Calls scripts/pixel-diff.py
with --selector .sgs-<section> against the live canary at page 144.

Writes summary CSV + per-cell diff.json + heatmap/composite PNGs.
"""
import csv
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT_BASE = REPO / "reports" / "2026-05-20-pipeline-root-gap-council" / "pixel-diff"
OUT_BASE.mkdir(parents=True, exist_ok=True)

MOCKUP = "file:///c:/Users/Bean/Projects/small-giants-wp/sites/mamas-munches/mockups/homepage/index.html"
SGS = "https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/"

SECTIONS = [
    "hero",
    "brand",
    "social-proof",
    "ingredients-section",
    "gift-section",
    "featured-product",
    "trust-bar",
]
VIEWPORTS = ["375x812", "768x1024", "1440x900"]

rows = []
for section in SECTIONS:
    for vp in VIEWPORTS:
        cell_dir = OUT_BASE / f"{section}-{vp}"
        cell_dir.mkdir(parents=True, exist_ok=True)
        selector = f".sgs-{section}"
        cmd = [
            sys.executable, str(REPO / "scripts" / "pixel-diff.py"),
            "--mockup", MOCKUP,
            "--sgs", SGS,
            "--viewport", vp,
            "--selector", selector,
            "--threshold", "1.0",
            "--out", str(cell_dir),
        ]
        print(f"[run] {section} {vp} -> {cell_dir}")
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        if result.returncode not in (0, 1):
            print(f"  [error] exit={result.returncode}")
            print(f"  stdout: {result.stdout[-500:]}")
            print(f"  stderr: {result.stderr[-500:]}")
            rows.append({"section": section, "viewport": vp, "pct": "ERROR",
                         "verdict": "ERROR", "selector_matched": "?"})
            continue
        diff_path = cell_dir / "diff.json"
        if not diff_path.exists():
            rows.append({"section": section, "viewport": vp, "pct": "NO_DIFF",
                         "verdict": "ERROR", "selector_matched": "?"})
            continue
        diff = json.loads(diff_path.read_text(encoding="utf-8"))
        rows.append({
            "section": section,
            "viewport": vp,
            "pct": round(diff.get("mismatch_percent", -1.0), 3),
            "verdict": diff.get("verdict", "?"),
            "selector_matched": diff.get("selector_matched", "?"),
        })

csv_path = OUT_BASE.parent / "pixel-diff-matrix.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["section", "viewport", "pct", "verdict",
                                       "selector_matched"])
    w.writeheader()
    for r in rows:
        w.writerow(r)

print(f"\n[summary] {csv_path}")
for r in rows:
    print(f"  {r['section']:<22} {r['viewport']:<10} {r['pct']:>10} {r['verdict']}")
