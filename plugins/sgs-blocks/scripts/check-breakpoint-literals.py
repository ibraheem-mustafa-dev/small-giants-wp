#!/usr/bin/env python3
"""check-breakpoint-literals.py — device-tier breakpoints come from the shared source, never typed.

THE RULE: a tablet/mobile query is built from `SGS_Breakpoints` (PHP: includes/class-sgs-breakpoints.php,
emitted through `sgs_emit_responsive_css`) or `SGS_BREAKPOINTS` (JS: src/utils/responsive.js). A hand-typed
`@media (max-width:1023px)` / `(max-width:767px)` / `(min-width:768px)` / `(min-width:1024px)` in PHP or JS is a
second source of the same number. Static .css/.scss are NOT scanned (no custom-media mechanism exists; see --survey-css).

KINDS: tablet-max (max 1023), mobile-max (max 767), tablet-min (min 768), desktop-min (min 1024).
BASELINE: check-breakpoint-literals-baseline.json = file -> count. Fails when a count RISES or a file is new;
fails when a count FALLS without the baseline being lowered (ratchet only tightens).

  --survey        list every literal (file::line, kind)
  --survey-css    count static stylesheet literals (report only)
  --check         exit 1 on a new literal or a stale baseline
  --write-baseline  rewrite the baseline from the tree
  --self-test     planted positive and negative fixtures

Run from plugins/sgs-blocks:  python scripts/check-breakpoint-literals.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
BASELINE = Path(__file__).resolve().with_name("check-breakpoint-literals-baseline.json")
ROOTS = [PLUGIN, REPO / "theme" / "sgs-theme", REPO / "plugins" / "sgs-booking", REPO / "plugins" / "sgs-client-notes"]
SKIP_DIRS = {"node_modules", "build", "vendor", "tests", "scripts", ".phpunit.cache", "reports", "pipeline-state", "stackable"}
ALLOW = {"includes/class-sgs-breakpoints.php", "includes/helpers-responsive.php", "src/utils/responsive.js", "src/utils/breakpoints.js"}
# Whole-repo path -> why a literal is legitimate there. Keep this list to cases with no shared source reachable.
EXCEPTIONS = {
    "theme/sgs-theme/assets/js/sgs-shop-load-more.js": "a classic, unbundled theme script (it cannot import src/utils/breakpoints.js) and the theme "
    "must not depend on the blocks plugin's SGS_Breakpoints; the query also joins the width to `(pointer: fine)`",
}
LIT = re.compile(r"\(\s*(max|min)-width\s*:\s*(767|768|1023|1024)(?:\.98)?px\s*\)")
KIND = {("max", "1023"): "tablet-max", ("max", "767"): "mobile-max", ("min", "768"): "tablet-min", ("min", "1024"): "desktop-min"}
COMMENT_LINE = re.compile(r"^\s*(//|\*|/\*|#)")


def scan_text(text: str) -> list[tuple[int, str]]:
    hits = []
    text = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    for n, line in enumerate(text.splitlines(), 1):
        if COMMENT_LINE.match(line):
            continue
        for m in LIT.finditer(line):
            hits.append((n, KIND.get((m.group(1), m.group(2)), m.group(1) + "-" + m.group(2))))
    return hits


def files(exts: tuple[str, ...]) -> list[Path]:
    out = []
    for root in ROOTS:
        if not root.is_dir():
            continue
        for f in root.rglob("*"):
            if f.suffix not in exts or not f.is_file():
                continue
            parts = f.relative_to(root).parts
            if SKIP_DIRS.intersection(parts) or f.name.endswith(".min.js") or f.name.endswith(".asset.php"):
                continue
            if ".js" in exts and root == PLUGIN and parts[0] != "src":
                continue
            out.append(f)
    return sorted(out)


def rel(f: Path) -> str:
    return f.relative_to(REPO).as_posix()


def collect() -> dict[str, list[tuple[int, str]]]:
    res = {}
    for f in files((".php", ".js")):
        r = rel(f)
        if r.removeprefix("plugins/sgs-blocks/") in ALLOW or r in EXCEPTIONS:
            continue
        h = scan_text(f.read_text(encoding="utf-8", errors="replace"))
        if h:
            res[r] = h
    return res


def self_test() -> int:
    pos = "$c = '@media (max-width:1023px){a{b:c}}';"
    pos2 = "window.matchMedia( '(max-width: 767px)' )"
    pos3 = "'@media (min-width:768px) and (max-width:1023px){'"
    neg = "// @media (max-width:767px) in a comment\n/* (min-width:1024px) */\n$x = '@media (max-width:' . $px . 'px){';\n$y='(max-width:600px)';"
    ok = len(scan_text(pos)) == 1 and len(scan_text(pos2)) == 1 and len(scan_text(pos3)) == 2 and scan_text(neg) == []
    print("[check-breakpoint-literals] self-test", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    for a in ("survey", "survey-css", "check", "write-baseline", "self-test"):
        ap.add_argument("--" + a, action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if a.survey_css:
        n = sum(len(scan_text(f.read_text(encoding="utf-8", errors="replace"))) for f in files((".css", ".scss")))
        print(f"static stylesheet literals: {n} (no custom-media / build-time constant mechanism; not gated)")
        return 0
    cur = collect()
    counts = {k: len(v) for k, v in cur.items()}
    if a.survey:
        for k, v in cur.items():
            for n, kind in v:
                print(f"{k}::{n} {kind}")
        print(f"total {sum(counts.values())} in {len(counts)} files")
        return 0
    if a.write_baseline:
        BASELINE.write_text(json.dumps({"files": dict(sorted(counts.items()))}, indent=2) + "\n", encoding="utf-8")
        print("baseline written:", sum(counts.values()), "in", len(counts), "files")
        return 0
    base = json.loads(BASELINE.read_text(encoding="utf-8"))["files"]
    bad = []
    for k, c in counts.items():
        if c > base.get(k, 0):
            bad.append(f"{k}: {c} hand-typed tier queries (baseline {base.get(k, 0)}): use sgs_emit_responsive_css / SGS_Breakpoints / SGS_BREAKPOINTS")
    for k, c in base.items():
        if counts.get(k, 0) < c:
            bad.append(f"{k}: baseline {c} but now {counts.get(k, 0)}: lower the baseline (--write-baseline)")
    print("\n".join(bad) if bad else f"[check-breakpoint-literals] OK ({sum(counts.values())} baselined)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
