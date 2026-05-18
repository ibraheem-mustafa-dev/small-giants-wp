#!/usr/bin/env python
"""Parallel runner for per-section pixel-diff across 9 sections x 3 viewports."""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path("c:/Users/Bean/Projects/small-giants-wp")
SCRIPT = REPO / "scripts" / "pixel-diff.py"
MOCKUP = "file:///C:/Users/Bean/Projects/small-giants-wp/sites/mamas-munches/mockups/homepage/index.html"
SGS = "https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/"
OUT_BASE = REPO / "reports/brand-walkdown-2026-05-19/page131-cv2-rerun"

SECTIONS = [
    "sgs-header", "sgs-hero", "sgs-trust-bar", "sgs-featured-product",
    "sgs-brand", "sgs-ingredients-section", "sgs-gift-section",
    "sgs-social-proof", "sgs-footer",
]
VIEWPORTS = ["1440x900", "768x1024", "375x812"]


def run_one(section, viewport):
    out_dir = OUT_BASE / f"{section}-{viewport}"
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable, str(SCRIPT),
        "--mockup", MOCKUP,
        "--sgs", SGS,
        "--viewport", viewport,
        "--selector", f".{section}",
        "--out", str(out_dir),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        return (section, viewport, proc.returncode, proc.stdout[-500:], proc.stderr[-500:])
    except subprocess.TimeoutExpired:
        return (section, viewport, -1, "", "TIMEOUT")


jobs = [(s, v) for s in SECTIONS for v in VIEWPORTS]
results = []
with ThreadPoolExecutor(max_workers=6) as ex:
    futures = {ex.submit(run_one, s, v): (s, v) for s, v in jobs}
    for fut in as_completed(futures):
        s, v, rc, out, err = fut.result()
        results.append((s, v, rc))
        print(f"[{rc}] {s} @ {v}", flush=True)
        if rc not in (0, 1, 2):
            print(f"   stderr: {err[-300:]}", flush=True)

print("\nALL DONE")
print(f"Total: {len(results)}")
