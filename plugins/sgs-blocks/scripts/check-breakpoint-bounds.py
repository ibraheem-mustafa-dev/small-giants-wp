#!/usr/bin/env python3
"""
check-breakpoint-bounds.py: no device tier may end on a whole-pixel upper bound.

THE RULE
--------
A device tier's upper bound is `767.98px` (mobile) or `1023.98px` (tablet); lower bounds stay `768px` and
`1024px`. A zoomed browser or a scaled display reports a fractional viewport width such as 767.4px, which
`max-width: 767px` and `min-width: 768px` both miss: the page then falls back to desktop values. With the
`.98` upper bound exactly one tier matches at every real width (a 0.02px sliver no device produces aside).
One definition lives in `includes/class-sgs-breakpoints.php` (PHP) and `src/utils/breakpoints.js` (script).

WHAT IS FLAGGED (the "device upper bound" shapes)
-------------------------------------------------
  max-width <ws> : <ws> 767px | 1023px     CSS, PHP strings, JS strings, JSON and snapshots
  (width <= 767px) / (width <= 1023px)     range-syntax media queries
  innerWidth <= 767 | 1023, innerWidth > 767 | 1023   (a bare `< 768` / `>= 768` already agrees with the
                                           `.98` rule at fractional widths, so it is not flagged)

A `767px` that is a length (not preceded by max-width) never matches. A block's own component breakpoints
(`max-width: 600px`) never match.

MODES
-----
  --survey [--files]  Count hits per folder and per file type (and per file with --files).
  --check             Exit 1 when any hit remains; print file, line and text.
  --self-test         Plant a violation in a temp tree and prove --check fails; plant a clean one and prove it passes.

Usage (from plugins/sgs-blocks):
  python scripts/check-breakpoint-bounds.py --survey --files
  python scripts/check-breakpoint-bounds.py --check
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from collections import Counter
from pathlib import Path
from typing import Iterator, List, Tuple

PLUGIN = Path(__file__).resolve().parent.parent
REPO = PLUGIN.parent.parent

# Roots scanned, relative to the repo. Tests and fixtures are included so expectations stay in step.
ROOTS = [
    "plugins/sgs-blocks/src",
    "plugins/sgs-blocks/includes",
    "plugins/sgs-blocks/assets",
    "plugins/sgs-blocks/tests",
    "theme/sgs-theme",
]
EXTS = {".css", ".scss", ".php", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".html", ".snap", ".txt"}
SKIP_DIRS = {"node_modules", "build", "vendor", ".git", "dist"}

# The one definition of what a device upper bound looks like. The codemod imports these.
MAX_WIDTH = re.compile(r"(max-width\s*:\s*)(767|1023)(px)(?![\w.])")
RANGE_WIDTH = re.compile(r"(width\s*<=\s*)(767|1023)(px)(?![\w.])")
INNER_WIDTH = re.compile(r"(innerWidth\s*(?:<=|>)\s*)(767|1023)(?![\w.%])")
PATTERNS = (MAX_WIDTH, RANGE_WIDTH, INNER_WIDTH)


def files(root: Path) -> Iterator[Path]:
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in EXTS:
            continue
        if SKIP_DIRS.intersection(path.parts):
            continue
        yield path


def scan_text(text: str) -> List[Tuple[int, str]]:
    hits = []
    for number, line in enumerate(text.splitlines(), 1):
        if any(p.search(line) for p in PATTERNS):
            hits.append((number, line.strip()))
    return hits


def scan(repo: Path, roots=ROOTS):
    for rel in roots:
        base = repo / rel
        if not base.exists():
            continue
        for path in files(base):
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for number, line in scan_text(text):
                yield path.relative_to(repo).as_posix(), number, line


def folder_of(rel: str) -> str:
    parts = rel.split("/")
    if rel.startswith("plugins/sgs-blocks/"):
        return "/".join(parts[:4]) if len(parts) > 4 else "/".join(parts[:3])
    return "/".join(parts[:2])


def survey(repo: Path, per_file: bool) -> int:
    hits = list(scan(repo))
    by_folder = Counter(folder_of(r) for r, _, _ in hits)
    by_type = Counter(Path(r).suffix for r, _, _ in hits)
    print(f"total hits: {len(hits)} in {len({r for r, _, _ in hits})} files")
    print("per folder:")
    for key, count in sorted(by_folder.items()):
        print(f"  {count:5d}  {key}")
    print("per file type:")
    for key, count in sorted(by_type.items()):
        print(f"  {count:5d}  {key}")
    if per_file:
        print("per file:")
        for key, count in sorted(Counter(r for r, _, _ in hits).items()):
            print(f"  {count:5d}  {key}")
    return 0


def check(repo: Path) -> int:
    hits = list(scan(repo))
    for rel, number, line in hits:
        print(f"{rel}:{number}: {line[:160]}")
    if hits:
        print(f"\nFAIL: {len(hits)} whole-pixel device upper bound(s). Run scripts/migrate-breakpoint-bounds.py --apply.")
        return 1
    print("OK: every device upper bound is 767.98px or 1023.98px.")
    return 0


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        repo = Path(tmp)
        src = repo / "plugins/sgs-blocks/src"
        src.mkdir(parents=True)
        bad = src / "bad.css"
        bad.write_text("@media (max-width: 767px){.a{color:red}}\n", encoding="utf-8")
        if check(repo) != 1:
            print("SELF-TEST FAIL: planted violation not caught")
            return 1
        bad.write_text(
            "@media (max-width: 767.98px){.a{}}\n.b{width:767px}\n@media (max-width: 600px){}\n"
            "const m = window.innerWidth < 768;\n",
            encoding="utf-8",
        )
        if check(repo) != 0:
            print("SELF-TEST FAIL: clean file flagged")
            return 1
        (src / "bad.js").write_text("matchMedia('(max-width:1023px)')\n", encoding="utf-8")
        (src / "bad.js").write_text("if (window.innerWidth <= 767) {}\n", encoding="utf-8")
        if check(repo) != 1:
            print("SELF-TEST FAIL: innerWidth <= 767 not caught")
            return 1
    print("SELF-TEST OK")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--survey", action="store_true")
    parser.add_argument("--files", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.survey:
        return survey(REPO, args.files)
    if args.check:
        return check(REPO)
    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
