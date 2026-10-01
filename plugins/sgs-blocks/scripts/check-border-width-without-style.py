#!/usr/bin/env python3
"""check-border-width-without-style.py — the "a width paints solid" detector.

THE RULE: a border the client gave a width paints SOLID unless they chose
another style; an explicit style (dashed, dotted, none ...) still wins. The
style picker writes '' when nothing is picked (or the active option is
deselected), the same as WP core's picker, and core paints that solid. SGS
renders no inline style (Spec 32), so core's `:where([style*=border-width])`
rule never reaches an SGS block; every SGS emitter resolves the style through
`sgs_border_style_keyword()` / `sgs_border_box_decls()`
(includes/helpers-border-style.php) and every editor preview through
`resolveBorderStyle()` (src/utils/border-style.js).

This is the inverse of check-border-style-without-width.py (a style with no
width paints nothing). Together they pin both halves of the border contract.

WHAT IT FLAGS (each is a way a width-only border silently painted nothing):
  php-fallback-none   in_array( $..border_style.., …, true ) ? … : 'none' | ''
  php-solid-skip      $..border_style.. && 'solid' !== $..border_style..  (solid never
                      emitted, and no stylesheet supplies it)
  php-read-none       $attributes['…BorderStyle'] ?? 'none'
  js-gate-raw         V && V !== 'none'  /  V && 'none' !== V   (V = *BorderStyle)
  js-assign-raw       x.borderStyle = V;
  js-or-undefined     borderStyle: V || undefined
  json-default-none   a *BorderStyle / borderStyle attribute defaulting to 'none'

THE TRIAD
  --survey     list every instance
  --check      exit 1 on any instance (the gate; the burn-down is complete)
  --self-test  positive and negative fixtures, proving it can still fail

Run from plugins/sgs-blocks:  python scripts/check-border-width-without-style.py --survey
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
SRC = PLUGIN / "src"
INCLUDES = PLUGIN / "includes"

_STYLE_VAR = r"\$[A-Za-z0-9_]*border_style[A-Za-z0-9_]*"
_JS_VAR = r"[A-Za-z0-9_]*[bB]orderStyle"

PHP_RULES = (
    ("php-fallback-none", re.compile(
        r"in_array\(\s*(" + _STYLE_VAR + r")\s*,[^;]*?,\s*true\s*\)\s*\?\s*\1\s*:\s*'(?:none)?'")),
    ("php-solid-skip", re.compile(r"(" + _STYLE_VAR + r")\s*&&\s*'solid'\s*!==\s*\1")),
    ("php-read-none", re.compile(r"\[\s*'[A-Za-z0-9]*[bB]orderStyle'\s*\]\s*\?\?\s*'none'")),
)
JS_RULES = (
    ("js-gate-raw", re.compile(
        r"\b(" + _JS_VAR + r")\s*&&\s*(?:\1\s*!==\s*['\"]none['\"]|['\"]none['\"]\s*!==\s*\1)")),
    ("js-assign-raw", re.compile(r"\.borderStyle\s*=\s*" + _JS_VAR + r"\s*;")),
    ("js-or-undefined", re.compile(r"\bborderStyle\s*:\s*" + _JS_VAR + r"\s*\|\|\s*undefined")),
)


def _is_comment(line: str) -> bool:
    s = line.strip()
    return s.startswith(("*", "//", "#", "/*"))


def _scan_text(text: str, rules) -> list[tuple[int, str, str]]:
    hits = []
    for n, line in enumerate(text.splitlines(), 1):
        if _is_comment(line):
            continue
        for rule_id, rx in rules:
            if rx.search(line):
                hits.append((n, rule_id, line.strip()))
    return hits


def _scan_block_json(text: str) -> list[tuple[int, str, str]]:
    try:
        attrs = json.loads(text).get("attributes", {})
    except (ValueError, AttributeError):
        return [(0, "json-unreadable", "block.json did not parse")]
    hits = []
    for name, spec in attrs.items():
        if re.fullmatch(r"(?:[A-Za-z0-9]*BorderStyle|borderStyle)", name) and isinstance(spec, dict):
            if spec.get("default") == "none":
                hits.append((0, "json-default-none", f"{name} default 'none'"))
    return hits


def scan() -> list[tuple[str, int, str, str]]:
    found = []
    for path in sorted(list(SRC.rglob("*.php")) + list(INCLUDES.rglob("*.php"))):
        for n, rule, line in _scan_text(path.read_text(encoding="utf-8"), PHP_RULES):
            found.append((path.relative_to(PLUGIN).as_posix(), n, rule, line))
    for path in sorted(SRC.rglob("*.js")):
        for n, rule, line in _scan_text(path.read_text(encoding="utf-8"), JS_RULES):
            found.append((path.relative_to(PLUGIN).as_posix(), n, rule, line))
    for path in sorted(SRC.glob("blocks/*/block.json")):
        for n, rule, line in _scan_block_json(path.read_text(encoding="utf-8")):
            found.append((path.relative_to(PLUGIN).as_posix(), n, rule, line))
    return found


def cmd_survey() -> int:
    found = scan()
    for rel, n, rule, line in found:
        print(f"{rel}:{n}  [{rule}]  {line[:140]}")
    print(f"[border-width-style] {len(found)} instance(s) of a width that may paint no border.")
    return 0


def cmd_check() -> int:
    found = scan()
    if not found:
        print("[border-width-style] PASS — 0 instances (every width resolves its style through the shared helper).")
        return 0
    for rel, n, rule, line in found:
        print(f"FAIL {rel}:{n}  [{rule}]  {line[:140]}")
    print(f"[border-width-style] FAIL — {len(found)} instance(s). Route the style through "
          "sgs_border_style_keyword()/sgs_border_box_decls() (PHP) or resolveBorderStyle() (JS).")
    return 1


def cmd_self_test() -> int:
    positives = {
        "php-fallback-none": "$s = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';",
        "php-fallback-empty": "$s = in_array( $x_border_style_raw, $list, true ) ? $x_border_style_raw : '';",
        "php-solid-skip": "if ( $border_style_raw && 'solid' !== $border_style_raw ) {",
        "php-read-none": "$r = $attributes['borderStyle'] ?? 'none';",
    }
    js_positives = {
        "js-gate-raw": "if ( borderStyle && borderStyle !== 'none' ) {",
        "js-gate-raw-yoda": "if ( wrapperBorderStyle && 'none' !== wrapperBorderStyle ) {",
        "js-assign-raw": "\tstyle.borderStyle = borderStyle;",
        "js-or-undefined": "borderStyle: ctaBorderStyle || undefined,",
    }
    negatives_php = (
        "$border_style = sgs_border_style_keyword( $border_style_raw );",
        "$decls = sgs_border_box_decls( $box, $attributes['borderStyle'] ?? '' );",
        "// in_array( $border_style_raw, $a, true ) ? $border_style_raw : 'none'",
        "$r = $attributes['borderStyle'] ?? '';",
        "if ( $has_border_width || 'solid' !== $border_style_resolved ) {",
    )
    negatives_js = (
        "if ( 'none' !== resolveBorderStyle( borderStyle ) ) {",
        "\tstyle.borderStyle = resolveBorderStyle( borderStyle );",
        "borderStyle: backBorderStyle || 'solid',",
    )
    failures = 0
    for label, line in positives.items():
        if not _scan_text(line, PHP_RULES):
            failures += 1
            print(f"FAIL positive not caught: {label}")
    for label, line in js_positives.items():
        if not _scan_text(line, JS_RULES):
            failures += 1
            print(f"FAIL positive not caught: {label}")
    for line in negatives_php:
        if _scan_text(line, PHP_RULES):
            failures += 1
            print(f"FAIL negative flagged: {line}")
    for line in negatives_js:
        if _scan_text(line, JS_RULES):
            failures += 1
            print(f"FAIL negative flagged: {line}")
    bad_json = '{"attributes":{"borderStyle":{"type":"string","default":"none"}}}'
    good_json = '{"attributes":{"borderStyle":{"type":"string","default":""}}}'
    if not _scan_block_json(bad_json):
        failures += 1
        print("FAIL positive not caught: json-default-none")
    if _scan_block_json(good_json):
        failures += 1
        print("FAIL negative flagged: json default ''")
    total = len(positives) + len(js_positives) + len(negatives_php) + len(negatives_js) + 2
    print(f"[border-width-style self-test] {total - failures}/{total} passed.")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--survey", action="store_true", help="list every instance")
    g.add_argument("--check", action="store_true", help="gate; exit 1 on any instance")
    g.add_argument("--self-test", action="store_true", help="prove the patterns still discriminate")
    args = ap.parse_args()
    if args.survey:
        return cmd_survey()
    if args.check:
        return cmd_check()
    return cmd_self_test()


if __name__ == "__main__":
    sys.exit(main())
