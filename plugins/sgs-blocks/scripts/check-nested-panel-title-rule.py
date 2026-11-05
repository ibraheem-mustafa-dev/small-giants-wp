#!/usr/bin/env python3
"""check-nested-panel-title-rule.py - the nested-ToolsPanel title rule lives once, in assets/css/inspector-controls.css.

A ToolsPanel nested in a PanelBody prints a second <h2>. The rule hiding it (`.sgs-nested-tools-panel
.components-tools-panel-header > h2`) belongs to the shared inspector stylesheet, which loads for every SGS block.
This gate fails when (a) that stylesheet lacks the rule, or (b) any other stylesheet under plugins/ or theme/ repeats
it. A block opts in with className="sgs-nested-tools-panel" and writes no CSS.

Run from plugins/sgs-blocks:  python scripts/check-nested-panel-title-rule.py --check | --self-test
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
SHARED = PLUGIN / "assets" / "css" / "inspector-controls.css"
RULE = re.compile(r"\.components-tools-panel-header\s*>\s*h2\b")


def has_rule(css: str) -> bool:
    """True when a selector (outside comments) targets the ToolsPanel header's <h2>."""
    return bool(RULE.search(re.sub(r"/\*.*?\*/", " ", css, flags=re.S)))


def stylesheets() -> list[Path]:
    out = subprocess.run(["git", "-C", str(REPO), "ls-files", "-z", "--", "*.css", "*.scss"], capture_output=True, text=True, check=True).stdout
    paths = [REPO / p for p in out.split("\0") if p.startswith(("plugins/", "theme/"))]
    return [p for p in paths if p.is_file() and "node_modules" not in p.parts and not {"build", "fixtures"}.intersection(p.relative_to(REPO).parts)]


def self_test() -> int:
    red = "/* c */\n.sgs-nested-tools-panel .components-tools-panel-header > h2 { border: 0; }"
    green = "/* .components-tools-panel-header > h2 is documented here */\n.sgs-card { color: red; }"
    ok = has_rule(red) and not has_rule(green)
    print("[check-nested-panel-title-rule] self-test", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def check() -> int:
    bad = []
    if not SHARED.is_file() or not has_rule(SHARED.read_text(encoding="utf-8")):
        bad.append("assets/css/inspector-controls.css must carry the nested-ToolsPanel title rule")
    for f in stylesheets():
        if f.resolve() != SHARED.resolve() and has_rule(f.read_text(encoding="utf-8", errors="replace")):
            bad.append(f"{f.relative_to(REPO).as_posix()}: repeats the nested-ToolsPanel title rule; use className=\"sgs-nested-tools-panel\" and let assets/css/inspector-controls.css hide the <h2>")
    print("\n".join(bad) if bad else "[check-nested-panel-title-rule] OK")
    return 1 if bad else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    sys.exit(self_test() if a.self_test else check())
