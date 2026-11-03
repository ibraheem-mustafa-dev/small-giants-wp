#!/usr/bin/env python3
"""check-border-tiers-printed.py -- every border caller prints the per-device widths.

THE RULE: a border width may be stored per device ({desktop, tablet, mobile} boxes). includes/helpers-border-style.php::
sgs_border_element_decls() returns the tablet and mobile width declarations in its `tablet` and `mobile` lists; a PHP
file that calls it and never reads those two lists drops the per-device width silently (it paints the desktop width on
every device).

WHAT IT FLAGS
  no-tablet-list  a PHP file calling sgs_border_element_decls() that never reads a 'tablet' key
  no-mobile-list  the same for a 'mobile' key

THE TRIAD
  --survey     list every caller and what it reads
  --check      exit 1 on any caller missing a list (the gate)
  --self-test  a red fixture and a green one, proving it can still fail

Run from plugins/sgs-blocks:  python scripts/check-border-tiers-printed.py --check
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
ROOTS = (PLUGIN / "src", PLUGIN / "includes")
DEFINER = "helpers-border-style.php"

CALL = re.compile(r"(?<![\w>:$])sgs_border_element_decls\s*\(")
TABLET = re.compile(r"""['"]tablet['"]""")
MOBILE = re.compile(r"""['"]mobile['"]""")


def _code_lines(text: str):
    for line in text.splitlines():
        s = line.strip()
        if s.startswith(("*", "//", "#", "/*")):
            continue
        yield line


def analyse(text: str) -> list[str]:
    """Rule ids a PHP source breaks; empty when it makes no call or prints both lists."""
    code = "\n".join(_code_lines(text))
    if not CALL.search(code) or re.search(r"function\s+sgs_border_element_decls\b", code):
        return []
    out = []
    if not TABLET.search(code):
        out.append("no-tablet-list")
    if not MOBILE.search(code):
        out.append("no-mobile-list")
    return out


def scan() -> list[tuple[str, list[str]]]:
    hits = []
    for root in ROOTS:
        for path in sorted(root.rglob("*.php")):
            if path.name == DEFINER:
                continue
            rules = analyse(path.read_text(encoding="utf-8", errors="replace"))
            if rules:
                hits.append((path.relative_to(PLUGIN).as_posix(), rules))
    return hits


def cmd_survey() -> int:
    for rel, rules in scan():
        print(f"{rel}: {', '.join(rules)}")
    print(f"[border-tiers] {len(scan())} caller(s) missing a list.")
    return 0


def cmd_check() -> int:
    hits = scan()
    for rel, rules in hits:
        print(f"{rel}: {', '.join(rules)}")
    if hits:
        print(
            f"[border-tiers] FAIL: {len(hits)} file(s) call sgs_border_element_decls() without printing its "
            "tablet and mobile lists (emit them in @media(max-width:1023px) / (max-width:767px))."
        )
        return 1
    print("[border-tiers] OK: every border caller reads the tablet and mobile lists.")
    return 0


def cmd_self_test() -> int:
    red = "<?php\n$b = sgs_border_element_decls( $attributes, '', $sel );\n$css .= implode( ';', $b['base'] );\n"
    green = (
        "<?php\n$b = sgs_border_element_decls( $attributes, '', $sel );\n"
        "if ( $b['tablet'] ) { $css .= '@media(max-width:1023px){}'; }\n"
        "if ( $b['mobile'] ) { $css .= '@media(max-width:767px){}'; }\n"
    )
    comment_only = "<?php\n// sgs_border_element_decls( $a ) is described here\n"
    cases = (
        ("red fixture flagged", analyse(red) == ["no-tablet-list", "no-mobile-list"]),
        ("green fixture clean", analyse(green) == []),
        ("comment-only mention ignored", analyse(comment_only) == []),
    )
    failures = 0
    for name, ok in cases:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        failures += 0 if ok else 1
    print(f"[border-tiers self-test] {len(cases) - failures}/{len(cases)} passed.")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--survey", action="store_true")
    g.add_argument("--check", action="store_true")
    g.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.survey:
        return cmd_survey()
    if a.check:
        return cmd_check()
    return cmd_self_test()


if __name__ == "__main__":
    sys.exit(main())
