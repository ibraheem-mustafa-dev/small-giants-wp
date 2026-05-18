#!/usr/bin/env python
"""Parse 27 diff.json files and emit summary.md."""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

BASE = Path("c:/Users/Bean/Projects/small-giants-wp/reports/brand-walkdown-2026-05-19/page131-cv2-rerun")
SECTIONS = [
    "sgs-header", "sgs-hero", "sgs-trust-bar", "sgs-featured-product",
    "sgs-brand", "sgs-ingredients-section", "sgs-gift-section",
    "sgs-social-proof", "sgs-footer",
]
VIEWPORTS = ["1440x900", "768x1024", "375x812"]


def load(section, viewport):
    p = BASE / f"{section}-{viewport}" / "diff.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        return {"error": str(e)}


rows = []
for s in SECTIONS:
    row = {"section": s}
    worst = -1.0
    worst_vp = None
    for v in VIEWPORTS:
        d = load(s, v)
        if d is None:
            row[v] = None
            continue
        # Common diff.json shapes — try several keys
        pct = None
        for k in ("diff_percent", "diffPercent", "percent_diff", "diff_pct", "percent", "mismatch_percent"):
            if k in d:
                pct = d[k]
                break
        if pct is None and "result" in d and isinstance(d["result"], dict):
            for k in ("diff_percent", "percent"):
                if k in d["result"]:
                    pct = d["result"][k]
                    break
        row[v] = pct
        if isinstance(pct, (int, float)) and pct > worst:
            worst = pct
            worst_vp = v
        # store status / no-element hints
        if d.get("status") == "no-element" or d.get("selector_matched") == 0:
            row[v] = "[no-element]"
    row["worst"] = worst if worst >= 0 else None
    row["worst_vp"] = worst_vp
    rows.append(row)

# sort by worst desc
rows.sort(key=lambda r: (r["worst"] if isinstance(r["worst"], (int, float)) else -1), reverse=True)


def fmt(v):
    if v is None:
        return "n/a"
    if isinstance(v, str):
        return v
    return f"{v:.2f}%"


lines = []
lines.append("# Per-section pixel-diff summary — page 131 CV2 rerun (2026-05-19)")
lines.append("")
lines.append(f"- Mockup: file:///C:/.../mockups/homepage/index.html")
lines.append(f"- SGS: https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/")
lines.append("")
lines.append("| section | 1440x900 | 768x1024 | 375x812 | worst |")
lines.append("|---|---|---|---|---|")
for r in rows:
    lines.append(f"| {r['section']} | {fmt(r['1440x900'])} | {fmt(r['768x1024'])} | {fmt(r['375x812'])} | {fmt(r['worst'])} ({r['worst_vp'] or '-'}) |")

# Dump first diff.json for shape inspection
sample = load("sgs-hero", "1440x900")
lines.append("")
lines.append("## Sample diff.json (sgs-hero @ 1440x900) keys")
lines.append("")
lines.append("```")
lines.append(json.dumps(sample, indent=2)[:2000] if sample else "missing")
lines.append("```")

out = BASE / "summary.md"
out.write_text("\n".join(lines), encoding="utf-8")
print(out)
print()
for r in rows:
    print(f"{r['section']:32s} 1440={fmt(r['1440x900']):>10s}  768={fmt(r['768x1024']):>10s}  375={fmt(r['375x812']):>10s}  worst={fmt(r['worst'])}")
