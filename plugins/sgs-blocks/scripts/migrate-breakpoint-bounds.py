#!/usr/bin/env python3
"""
migrate-breakpoint-bounds.py: rewrite whole-pixel device upper bounds to the fractional-safe form.

Every integer upper bound the detector reports (a device tier maximum, the Mobile container width 479, WordPress's
columns break 781, and any N whose twin `min-width: (N+1)px` is in the same file) gains `.98`, in source, tests,
fixtures and snapshots; a file holding `max-width: N` and `min-width: N` is an overlap, not a gap, and is left alone; `innerWidth <= 767` becomes `innerWidth < 768` (and `> 767` becomes `>= 768`), which
is the same split without a gap. What counts as a device upper bound is defined once, in
`check-breakpoint-bounds.py`, which this script imports; run that with `--check` after `--apply` (it must report zero).

Usage (from plugins/sgs-blocks):
  python scripts/migrate-breakpoint-bounds.py --dry-run     # list what would change, write nothing
  python scripts/migrate-breakpoint-bounds.py --apply       # rewrite the files
  python scripts/migrate-breakpoint-bounds.py --apply --list changed.txt   # also write the changed paths
"""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("check_breakpoint_bounds", HERE / "check-breakpoint-bounds.py")
detector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(detector)


def inner_width(match) -> str:
    # `innerWidth <= 767` -> `innerWidth < 768`; `innerWidth > 767` -> `innerWidth >= 768`.
    prefix, number = match.group(1), int(match.group(2))
    operator = "<" if "<=" in prefix else ">="
    return prefix[: prefix.index("<=" if "<=" in prefix else ">")] + f"{operator} {number + 1}"


def transform(text: str) -> str:
    widths = detector.gap_widths(text)

    def widen(match):
        if int(match.group(2)) not in widths:
            return match.group(0)
        return f"{match.group(1)}{match.group(2)}.98{match.group(3)}"

    text = detector.MAX_WIDTH.sub(widen, text)
    text = detector.LOOSE_MAX_WIDTH.sub(widen, text)
    text = detector.RANGE_WIDTH.sub(widen, text)
    text = detector.INNER_WIDTH.sub(inner_width, text)
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--list", help="write the changed repo-relative paths to this file")
    args = parser.parse_args()
    if not (args.apply or args.dry_run):
        parser.print_help()
        return 2
    changed = []
    for rel in sorted({r for r, _, _ in detector.scan(detector.REPO)}):
        path = detector.REPO / rel
        original = path.read_bytes().decode("utf-8")
        updated = transform(original)
        if updated != original:
            changed.append(rel)
            if args.apply:
                path.write_bytes(updated.encode("utf-8"))
    print(f"{'rewrote' if args.apply else 'would rewrite'} {len(changed)} file(s)")
    if args.list:
        Path(args.list).write_text("\n".join(changed) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
