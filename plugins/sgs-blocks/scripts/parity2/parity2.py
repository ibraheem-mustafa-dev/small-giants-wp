#!/usr/bin/env python3
"""parity2 — draft-centric cloning-fidelity verifier (integration harness).

The DRAFT is the 100% denominator: enumerate everything the mockup contains and
measure how much transferred to the cloned WordPress page. Unlike pixel-diff
(judges painted pixels) and the old clone-parity DOM-path matcher (rewards a
div-by-div mirror, penalises genuine conversion), this measures CONTENT + CSS
TRANSFER, fate-aware (it knows which draft classes FOLD into parents or LIFT to
block attributes when converted), so a real native conversion scores as success.

Pipeline:
  1. draft_denominator._reshape_node  — raw golden node -> canonical NodeRecord
  2. fate_classifier.classify         — DB-driven expected fate per draft node
                                        (emit-block / lift-attr / fold-parent / chrome)
  3. transfer_checker.check           — per-node TRANSFERRED / FOLDED / DROPPED / CHROME

Captures come from clone-parity.js --dump-captures (draft + clone in identical
golden format — same prop set + text strategy, so the compare is apples-to-apples).

Usage:
  python parity2.py [--captures parity2-captures.json] [--viewport 1440]
                    [--out .claude/reports/parity2-report] [--section trust-bar]
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import draft_denominator as dd   # noqa: E402
import fate_classifier as fc     # noqa: E402
import transfer_checker as tc    # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


def load_captures(path: str, viewport: int) -> tuple[list[dict], list[dict]]:
    """Load the dumped captures and reshape draft + clone arrays into NodeRecords."""
    data = json.load(io.open(path, encoding="utf-8"))
    key = str(viewport)
    if key not in data:
        raise SystemExit(f"viewport {viewport} not in captures (have: {list(data)})")
    vp = data[key]
    draft = [dd._reshape_node(n) for n in vp.get("draft", [])]
    clone = [dd._reshape_node(n) for n in vp.get("clone", [])]
    return draft, clone


def fate_of(node: dict) -> dict:
    """Wire module 2: classify a NodeRecord by its BEM classes + tag + section."""
    return fc.classify(node.get("classes", []), node.get("tag", ""), node.get("section", ""))


def _per_section(report: dict) -> dict:
    """Aggregate by_node verdicts into per-section scores (non-chrome denominator)."""
    sec = defaultdict(lambda: {"transferred": 0, "folded": 0, "dropped": 0, "chrome": 0,
                               "content_ok": 0, "non_chrome": 0, "css_pct_sum": 0.0})
    for n in report["by_node"]:
        s = n.get("section", "") or "?"
        v = n["verdict"].lower()
        if v in ("transferred", "folded", "dropped", "chrome"):
            sec[s][v] += 1
        if n["verdict"] != "CHROME":
            sec[s]["non_chrome"] += 1
            sec[s]["css_pct_sum"] += n.get("css_pct", 0.0)
            if n.get("content_ok"):
                sec[s]["content_ok"] += 1
    out = {}
    for s, c in sec.items():
        denom = c["transferred"] + c["folded"] + c["dropped"]
        out[s] = {
            **c,
            # CONTENT coverage: did the draft node's text reach the clone? (the primary signal)
            "content_pct": round(100 * c["content_ok"] / c["non_chrome"], 1) if c["non_chrome"] else None,
            # CSS coverage: mean authored-rule match-rate across the section's nodes
            "css_pct": round(c["css_pct_sum"] / c["non_chrome"], 1) if c["non_chrome"] else None,
            # FULL transfer (content present AND css ≥80%): the stricter node verdict
            "transfer_pct": round(100 * (c["transferred"] + c["folded"]) / denom, 1) if denom else None,
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--captures", default=os.path.join(REPO_ROOT, ".claude/reports/parity2-captures.json"))
    ap.add_argument("--viewport", type=int, default=1440)
    ap.add_argument("--out", default=os.path.join(REPO_ROOT, ".claude/reports/parity2-report"))
    ap.add_argument("--section", default=None, help="print per-node detail for one section")
    args = ap.parse_args()

    draft, clone = load_captures(args.captures, args.viewport)
    report = tc.check(draft, clone, fate_of)
    report["viewport"] = args.viewport
    sections = _per_section(report)

    # ---- console summary -----------------------------------------------------
    t = report["totals"]
    print(f"\n=== parity2 — draft-centric fidelity ({args.viewport}px) ===")
    print(f"  DRAFT denominator: {t['draft_total']} nodes ({t['chrome']} chrome excluded)")
    overall_content = round(100 * sum(s["content_ok"] for s in sections.values())
                            / max(1, sum(s["non_chrome"] for s in sections.values())), 1)
    print(f"  CONTENT transferred (text reached the clone): {overall_content:.1f}%   <- primary signal")
    print(f"  FULL transfer (content + CSS within tolerance): {report['score_pct']:.1f}%   <- stricter")
    print(f"  dropped (full): {t['dropped']}")
    print("\n  per-section  (content% / css% / full-transfer%, draft = 100%):")
    for s in sorted(sections, key=lambda k: (sections[k]["content_pct"] is None, -(sections[k]["content_pct"] or 0))):
        c = sections[s]
        if c["content_pct"] is None:
            continue
        print(f"    {s:26s} content {c['content_pct']:5.1f}%   css {c['css_pct']:5.1f}%   "
              f"full {c['transfer_pct']:5.1f}%   (T{c['transferred']} F{c['folded']} D{c['dropped']})")

    if args.section:
        print(f"\n  --- per-node detail: section '{args.section}' ---")
        for n in report["by_node"]:
            if (n.get("section") or "") != args.section:
                continue
            drop = f"  dropped: {n['css_dropped']}" if n.get("css_dropped") else ""
            print(f"    [{n['verdict']:11s}] {','.join(n['classes'])[:38]:38s} "
                  f"fate={n['fate']:11s} content={'ok' if n['content_ok'] else 'MISS'}{drop}")

    # ---- write artefacts -----------------------------------------------------
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    json_path = args.out + ".json"
    json.dump({**report, "by_section": sections}, io.open(json_path, "w", encoding="utf-8"),
              indent=2, ensure_ascii=False)
    print(f"\n  JSON report -> {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
