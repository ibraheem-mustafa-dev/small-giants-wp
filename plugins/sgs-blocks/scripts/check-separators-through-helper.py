#!/usr/bin/env python3
"""check-separators-through-helper.py — lines between items go through the helper.

THE RULE: a line drawn BETWEEN the items of a list is the shared Separators
setting (`includes/helpers-separators*.php`, editor control `SgsSeparatorControl`,
runtime `src/shared/separators/`). A block that draws its own between-item line
(an item border with the last one removed, an adjacent-sibling border, a
pseudo-element on every item but the first, CSS gap decorations) is a second
mechanism for the same job, with its own attributes and its own gaps.

WHAT IT FLAGS (outside the helper files):
  gap-decoration     column-rule / row-rule (and their -style/-color/-width) or
                     rule-visibility-items
  sibling-border     `A + B { border-top|left|inline-start|block-start … }`
  not-first-line     `X:not(:first-child)::before|::after { … border|background … }`
  last-child-reset   `X:last-child { border-bottom|right|inline-end: none|0 }`
  php-not-first      a PHP string selecting `:not(:first-child)` (selecting every item but
                     the first is how a between-item line is drawn when the selector is
                     built from variables)

THE BASELINE: blocks that have not adopted the helper yet are listed in
`check-separators-through-helper-baseline.json` as `file -> rule -> count`. The gate
fails when a count RISES (a new between-item line) and when a count FALLS without the
baseline being lowered (so the ratchet only tightens). Adopting a block means
deleting its entry. A new block never starts in the baseline.

THE TRIAD
  --survey          list every instance
  --check           exit 1 on a new instance or a stale baseline
  --write-baseline  rewrite the baseline from the current tree (after adopting a block)
  --self-test       positive and negative fixtures, proving it can still fail

Run from plugins/sgs-blocks:  python scripts/check-separators-through-helper.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
BASELINE = Path(__file__).resolve().with_name("check-separators-through-helper-baseline.json")
HELPER_FILES = re.compile(r"(?:^|/)(?:helpers-separators[^/]*\.php|separators(?:/[^/]+)?\.js|SgsSeparatorControl\.js|SeparatorAxisRow\.js)$")
SKIP_DIRS = ("node_modules", "build", "vendor", "tests", "scripts", "stackable", "pipeline-state", "reports", "components")

_SIDE = r"(?:top|left|inline-start|block-start)"
RULES = (
    ("gap-decoration", re.compile(r"(?:\b(?:column|row)-rule(?:-style|-color|-width)?\s*:|rule-visibility-items)")),
    ("sibling-border", re.compile(r"\+[^{};]*\{[^{}]*\bborder-" + _SIDE + r"\s*:")),
    ("not-first-line", re.compile(r":not\(:first-child\)\s*::(?:before|after)\s*\{[^{}]*(?:\bborder|\bbackground)")),
    ("last-child-reset", re.compile(r":last-child\s*\{[^{}]*\bborder-(?:bottom|right|inline-end)\s*:\s*(?:none|0)")),
)
# Only for PHP files: the selector is usually concatenated from variables, which the CSS rules above cannot see.
PHP_RULES = (
    ("php-not-first", re.compile(r"__(?:sub)?item:not\(:first-child\)|__row:not\(:first-child\)|\$item[A-Za-z_]*\s*\.\s*':not\(:first-child\)")),
)


def _strip_comments(text: str) -> str:
    """Drop /* … */ blocks and full-line // # comments, keeping line count for nothing but matching."""
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.S)
    return "\n".join(l for l in text.splitlines() if not l.strip().startswith(("//", "#", "*")))


def scan_text(text: str, php: bool = False) -> dict[str, int]:
    """Count rule hits in one file's text. The whole text is matched so a rule split across lines still counts."""
    body = _strip_comments(text)
    counts: dict[str, int] = {}
    for rule_id, rx in RULES + (PHP_RULES if php else ()):
        n = len(rx.findall(body))
        if n:
            counts[rule_id] = n
    return counts


def candidates() -> list[Path]:
    out = []
    for pattern in ("src/**/*.css", "src/**/*.php", "includes/**/*.php"):
        for path in PLUGIN.glob(pattern):
            rel = path.relative_to(PLUGIN).as_posix()
            if any(f"/{d}/" in f"/{rel}" for d in SKIP_DIRS) or HELPER_FILES.search(rel):
                continue
            out.append(path)
    return sorted(out)


def scan() -> dict[str, dict[str, int]]:
    found: dict[str, dict[str, int]] = {}
    for path in candidates():
        counts = scan_text(path.read_text(encoding="utf-8", errors="replace"), php=path.suffix == ".php")
        if counts:
            found[path.relative_to(PLUGIN).as_posix()] = counts
    return found


def load_baseline() -> dict[str, dict[str, int]]:
    if not BASELINE.exists():
        return {}
    return json.loads(BASELINE.read_text(encoding="utf-8")).get("files", {})


def compare(found: dict, baseline: dict) -> tuple[list[str], list[str]]:
    """Return (new instances, stale baseline entries)."""
    new, stale = [], []
    for rel in sorted(set(found) | set(baseline)):
        for rule in sorted(set(found.get(rel, {})) | set(baseline.get(rel, {}))):
            have, allowed = found.get(rel, {}).get(rule, 0), baseline.get(rel, {}).get(rule, 0)
            if have > allowed:
                new.append(f"{rel}  [{rule}]  {have} found, {allowed} allowed")
            elif have < allowed:
                stale.append(f"{rel}  [{rule}]  {have} found, baseline says {allowed}; lower or delete the baseline entry")
    return new, stale


def cmd_survey() -> int:
    found = scan()
    for rel, counts in found.items():
        print(f"{rel}  {counts}")
    print(f"[separators] {sum(sum(c.values()) for c in found.values())} between-item line(s) in {len(found)} file(s) outside the helper.")
    return 0


def cmd_check() -> int:
    new, stale = compare(scan(), load_baseline())
    for line in new:
        print(f"FAIL new between-item line outside the helper: {line}")
    for line in stale:
        print(f"FAIL stale baseline: {line}")
    if new or stale:
        print("[separators] FAIL — route a between-item line through includes/helpers-separators*.php "
              "(or, after adopting a block, lower its baseline entry: --write-baseline).")
        return 1
    print("[separators] PASS — no between-item line outside the helper beyond the ratcheted baseline.")
    return 0


def cmd_write_baseline() -> int:
    found = scan()
    BASELINE.write_text(json.dumps({"files": found}, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"[separators] baseline written: {len(found)} file(s).")
    return 0


def cmd_self_test() -> int:
    positives = {
        "gap-decoration": ".grid{column-rule:1px solid red;}",
        "gap-decoration-visibility": ".grid{rule-visibility-items:between;}",
        "sibling-border": ".list__item + .list__item { border-top: 1px solid #ccc; }",
        "not-first-line": ".bar__item:not(:first-child)::before{content:\"\";border-left:1px solid red;}",
        "last-child-reset": ".row:last-child { border-bottom: none; }",
    }
    php_positive = "$sel = $uid . ' .' . $bem . '__item:not(:first-child)';"
    negatives = {
        "plain item border": ".card { border-bottom: 1px solid #ccc; }",
        "margin between siblings": ".a + .b { margin-top: 8px; }",
        "first-child pseudo without a line": ".x:not(:first-child)::before{content:\"/\";}",
        "commented-out rule": "/* .grid{column-rule:1px solid red;} */",
        "last-child keeps its border": ".row:last-child { border-bottom: 1px solid red; }",
    }
    failures = 0
    for name, css in positives.items():
        if not scan_text(css):
            print(f"SELF-TEST FAIL: {name} was not flagged: {css}")
            failures += 1
    if not scan_text(php_positive, php=True):
        print("SELF-TEST FAIL: a PHP :not(:first-child) item selector was not flagged")
        failures += 1
    for name, css in negatives.items():
        if scan_text(css):
            print(f"SELF-TEST FAIL: {name} was wrongly flagged: {css}")
            failures += 1
    new, stale = compare({"a.css": {"gap-decoration": 2}}, {"a.css": {"gap-decoration": 1}})
    if not new or stale:
        print("SELF-TEST FAIL: a count above the baseline was not reported as new")
        failures += 1
    new, stale = compare({"a.css": {"gap-decoration": 1}}, {"a.css": {"gap-decoration": 2}})
    if new or not stale:
        print("SELF-TEST FAIL: a count below the baseline was not reported as stale")
        failures += 1
    if HELPER_FILES.search("includes/helpers-separators-css.php") is None:
        print("SELF-TEST FAIL: the helper file is not exempt")
        failures += 1
    if HELPER_FILES.search("includes/helpers-gap-rule.php") is not None:
        print("SELF-TEST FAIL: the old gap-rule helper must not be exempt")
        failures += 1
    print(f"[separators] self-test {'FAIL' if failures else 'PASS'} ({len(positives)} positives, {len(negatives)} negatives).")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--survey", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--write-baseline", action="store_true")
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.survey:
        return cmd_survey()
    if args.check:
        return cmd_check()
    if args.write_baseline:
        return cmd_write_baseline()
    return cmd_self_test()


if __name__ == "__main__":
    sys.exit(main())
