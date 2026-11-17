#!/usr/bin/env python3
"""
check-breakpoint-bounds.py: no device tier may end on a whole-pixel upper bound.

THE RULE
--------
A switch between two widths has an upper bound `N.98px` and a lower bound `(N+1)px`: 767.98 and 768 for mobile,
1023.98 and 1024 for tablet, 479.98 and 480 for the Mobile container width, 781.98 and 782 for WordPress's columns break.
A zoomed browser or a scaled display reports a fractional width such as 767.4px, which `max-width: 767px` and
`min-width: 768px` both miss: the page then falls back to desktop values. With the `.98` upper bound exactly one side
matches at every real width (a 0.02px sliver no device produces aside). One definition lives in
`includes/class-sgs-breakpoints.php::query_width` (PHP) and `src/utils/breakpoints.js::queryWidth` (script): a `max`
edge at a whole-pixel width gets `.98` there, so every query the helper builds is safe.

WHAT IS FLAGGED
---------------
  (max-width: Npx) in CSS, PHP strings, JS strings, JSON and snapshots, when N is a named width (767, 1023, 479, 781)
                   or the same file also holds min-width: (N+1)px, the other side of the switch
  max-width: 767px | 1023px  anywhere in a line, prose included (device tiers)
  width <= Npx     range-syntax queries, same rule for N
  innerWidth <= 767 | 1023, innerWidth > 767 | 1023   (a bare `< 768` / `>= 768` already agrees with `.98`)

NOT FLAGGED: a lone `max-width` with no twin; a `max-width` that is a length (no opening parenthesis); a file holding
`max-width: N` and `min-width: N` (an overlap at exactly N, a different fault, listed by --survey as OVERLAP).

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

# The one definition of what a whole-pixel upper bound looks like. The codemod imports these.
# A media or container query's `max-width: Npx` is a gap when N is a NAMED_MAXES width, or when the SAME file also holds
# `min-width: (N+1)px` (the two sides of one switch). A lone `max-width` with no twin is not a gap, and a `max-width`
# that is a length (`style="max-width:480px"`, no opening parenthesis) is never one. A file that holds `max-width: N`
# and `min-width: N` (an overlap at exactly N, a different fault) is reported by --survey, never rewritten.
NAMED_MAXES = frozenset({767, 1023, 479, 781})  # device tiers, the Mobile container width, WordPress's columns break (min 782)
MAX_WIDTH = re.compile(r"(\(\s*max-width\s*:\s*)(\d+)(px)(?![\w.])")
LOOSE_MAX_WIDTH = re.compile(r"(max-width\s*:\s*)(767|1023)(px)(?![\w.])")  # prose and strings naming a device tier
RANGE_WIDTH = re.compile(r"(width\s*<=\s*)(\d+)(px)(?![\w.])")
INNER_WIDTH = re.compile(r"(innerWidth\s*(?:<=|>)\s*)(767|1023)(?![\w.%])")
MIN_WIDTH = re.compile(r"(?:min-width\s*:\s*|width\s*>=\s*)(\d+)px(?![\w.])")


def gap_widths(text: str) -> frozenset:
    """Integer upper bounds to fix in this file: the named widths, plus N for every `min-width: (N+1)px` here."""
    mins = set()
    for line in text.splitlines():
        if not line.lstrip().startswith(("//", "*", "/*")):
            mins.update(int(m.group(1)) for m in MIN_WIDTH.finditer(line))
    return NAMED_MAXES | frozenset(m - 1 for m in mins)


def line_hits(line: str, widths: frozenset) -> bool:
    for pattern in (MAX_WIDTH, RANGE_WIDTH):
        if any(int(m.group(2)) in widths for m in pattern.finditer(line)):
            return True
    return bool(LOOSE_MAX_WIDTH.search(line) or INNER_WIDTH.search(line))


def overlaps(text: str) -> List[int]:
    """Widths N where this file holds both `(max-width: Npx)` and `(min-width: Npx)`: both apply at exactly N."""
    maxes = {int(m.group(2)) for m in MAX_WIDTH.finditer(text)}
    mins = {int(m.group(1)) for m in MIN_WIDTH.finditer(text)}
    return sorted(maxes & mins)


def files(root: Path) -> Iterator[Path]:
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in EXTS:
            continue
        if SKIP_DIRS.intersection(path.parts):
            continue
        yield path


def scan_text(text: str) -> List[Tuple[int, str]]:
    hits = []
    widths = gap_widths(text)
    for number, line in enumerate(text.splitlines(), 1):
        if line_hits(line, widths):
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


def all_files(repo: Path):
    for rel in ROOTS:
        base = repo / rel
        if base.exists():
            for path in files(base):
                yield path.relative_to(repo).as_posix()


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
    pairs = Counter()
    overlap_files = []
    for rel in sorted({r for r, _, _ in hits} | set(all_files(repo))):
        text = (repo / rel).read_text(encoding="utf-8", errors="ignore")
        for width in overlaps(text):
            overlap_files.append(f"{rel}: both (max-width: {width}px) and (min-width: {width}px)")
    for rel, number, line in hits:
        for m in MAX_WIDTH.finditer(line):
            pairs[int(m.group(2))] += 1
    print("per upper-bound width (query hits): " + ", ".join(f"{w}px x{c}" for w, c in sorted(pairs.items())))
    for entry in overlap_files:
        print("OVERLAP (not rewritten): " + entry)
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
        twin = src / "twin.css"
        twin.write_text("@media (max-width: 480px){.a{}}\n@media (min-width: 481px){.a{}}\n", encoding="utf-8")
        if check(repo) != 1:
            print("SELF-TEST FAIL: a max-width with a min-width twin one pixel up was not caught")
            return 1
        twin.write_text("@media (max-width: 480px){.a{}}\n.b{max-width:481px}\n", encoding="utf-8")
        if check(repo) != 0:
            print("SELF-TEST FAIL: a lone max-width was flagged")
            return 1
        twin.unlink()
        (src / "bad.js").write_text("matchMedia('(max-width:1023px)')\n", encoding="utf-8")
        (src / "bad.js").write_text("if (window.innerWidth <= 767) {}\n", encoding="utf-8")
        if check(repo) != 1:
            print("SELF-TEST FAIL: innerWidth <= 767 not caught")
            return 1
    print("SELF-TEST OK")
    return 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
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
