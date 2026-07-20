#!/usr/bin/env python3
"""
SGS Block Uniformity Audit
Scans all SGS block.json files for non-uniform patterns.
Exits 1 if issues found, 0 if clean.

Usage:
    python plugins/sgs-blocks/scripts/audit-block-uniformity.py
"""
import sys, json
from pathlib import Path

# Find repo root (look for plugins/sgs-blocks/src/blocks)
script_dir = Path(__file__).resolve().parent
repo_root = script_dir.parent.parent.parent  # scripts/ -> sgs-blocks/ -> plugins/ -> repo root
blocks_dir = repo_root / "plugins" / "sgs-blocks" / "src" / "blocks"

if not blocks_dir.exists():
    print(f"ERROR: blocks dir not found at {blocks_dir}", file=sys.stderr)
    sys.exit(2)

# Static blocks where source:html is INTENTIONAL (have save.js, not render.php)
SOURCE_HTML_EXEMPT = {"sgs/certification-bar", "sgs/counter", "sgs/notice-banner"}

# Blocks intentionally without supports.color.
#
# ⚠ THIS CHECK IS NAME-KEYED AND HAS A PERMANENT FALSE-POSITIVE CLASS.
# It flags any attribute whose NAME contains "colour". But WP's supports.color
# only ever styles the BLOCK ROOT, so a PER-ELEMENT colour (a featured nav item's
# fill, a burger icon, an inner link) physically cannot be expressed as
# supports.color — those blocks fail this rule forever no matter how correct they
# are, and every such entry added below makes a real violation harder to spot.
#
# LONG-TERM FIX (parking P-AUDIT-COLOUR-ROLE-KEYED, D351): re-key this check on
# the Spec 35 element manifest (`supports.sgs.elements`), which already carries
# `isWrapper` + `attrMap`. The rule becomes "a colour attr mapped to the WRAPPER
# element must use supports.color; a colour attr mapped to a non-wrapper element
# is block-owned and never flagged" — role-keyed, not name-keyed, matching the
# project's route-by-role rule. That is STRICTER than today (it would also catch
# an American-spelled `textColor` hand-rolled on a wrapper, which this rule misses
# entirely). Blocked only on manifest coverage: 1 of 79 blocks seeded as of
# 2026-07-20, filling as the Spec 35 rollout proceeds.
#
# Until then, entries here MUST state which elements the colours target.
SUPPORTS_COLOR_EXEMPT = {
    # Per-element colours only, no wrapper-level colour:
    #   nav-menu   — itemColour / itemHoverColour / featuredColour / burgerColour
    #                / burgerHoverColour → the link, the featured item, the burger.
    #   nav-drawer — toggleCloseColour → the × close control.
    # Both emit scoped <style> per Spec 32 (never inline), so there is no
    # hand-rolled has-* injection here for supports.color to replace.
    "sgs/nav-menu",
    "sgs/nav-drawer",
}

issues = {"viewScript": [], "source_html": [], "typo_dup": [], "supports_color_missing": []}

for p in sorted(blocks_dir.glob("*/block.json")):
    try:
        b = json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        print(f"INVALID JSON: {p}: {e}", file=sys.stderr)
        sys.exit(2)

    name = b.get("name")
    attrs = b.get("attributes", {})
    sup = b.get("supports", {})

    # 1. viewScript (legacy) should be viewScriptModule
    if "viewScript" in b:
        issues["viewScript"].append(name)

    # 2. source:html on dynamic blocks (those with render field)
    if "render" in b:
        html_src = [k for k, v in attrs.items() if isinstance(v, dict) and v.get("source") == "html"]
        if html_src and name not in SOURCE_HTML_EXEMPT:
            issues["source_html"].append(f"{name}: {html_src}")

    # 3. Typography duplicated in supports + custom attrs
    typo_sup = sup.get("typography", {})
    dup = [k for k in ["letterSpacing", "textTransform"] if typo_sup.get(k) and k in attrs]
    if dup:
        issues["typo_dup"].append(f"{name}: {dup}")

    # 4. UK colour attrs without native supports.color
    uk = [k for k in attrs if "colour" in k.lower()]
    if uk and "color" not in sup and name not in SUPPORTS_COLOR_EXEMPT:
        issues["supports_color_missing"].append(f"{name}: has UK colour attrs without supports.color")

# Report
fail = False
for category, items in issues.items():
    if items:
        fail = True
        print(f"\n[{category}] FAIL:")
        for item in items:
            print(f"  - {item}")

if fail:
    print("\nSGS block uniformity audit FAILED. Fix the above before committing.", file=sys.stderr)
    sys.exit(1)
else:
    print("SGS block uniformity audit: CLEAN")
    sys.exit(0)
