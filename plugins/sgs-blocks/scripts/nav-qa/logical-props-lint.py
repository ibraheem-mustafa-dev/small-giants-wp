#!/usr/bin/env python3
"""logical-props-lint.py — RTL-readiness WARN-only lint for the SGS nav blocks
(Spec 36 §8 / FR-36-16 "RTL/logical properties").

WHY WARN, NOT FAIL
-------------------
A PHYSICAL property (margin-left, padding-right, bare `left:`/`right:`) is
not always wrong — some genuinely direction-agnostic uses exist (e.g. an
icon nudge that should stay on the same visual side regardless of writing
direction). This script is a nudge for a human reviewer at the Step-11
gate, not a hard build-blocker: it prints every hit with file:line, lets a
human decide, and always exits 0. (If a future session wants a hard gate,
that is a separate, deliberate decision — do not silently upgrade this to
--check/exit-1 without discussing it first.)

WHAT IT SCANS
-------------
Physical CSS box-model + positioning properties that have a logical
equivalent:

  margin-left    -> margin-inline-start (LTR assumption noted below)
  margin-right   -> margin-inline-end
  padding-left   -> padding-inline-start
  padding-right  -> padding-inline-end
  left:          -> inset-inline-start
  right:         -> inset-inline-end

The LTR-assumption note: the suggested logical equivalent assumes the
current document direction is LTR (SGS's default). In an LTR document,
`left` maps to `inline-start` and `right` maps to `inline-end`; this flips
in an RTL document. The suggestion is a starting point for the reviewer,
not an auto-fix.

Already-logical properties (margin-inline-start/end, padding-inline-
start/end, inset-inline-start/end, and the `-inline`/`-block` shorthands)
are never flagged.

USAGE
-----
  python logical-props-lint.py [dir ...]

  # Default target dirs (the two nav blocks + the shared utils module —
  # update these paths once the nav blocks/shared module actually land,
  # see the DEFAULT_DIRS note below):
  python logical-props-lint.py

  # Explicit dirs once you know the real paths:
  python logical-props-lint.py src/blocks/nav-menu src/blocks/nav-drawer src/utils

A missing target directory is reported as a WARN line (the block/module
hasn't been built yet) rather than a crash — this script is meant to be
runnable from Wave-0 onward, before any of the target dirs exist.

Spec 36 coverage: FR-36-16 "RTL/logical properties" in the FR-36-16 live gate list.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Resolved relative to this script's location (plugins/sgs-blocks/scripts/nav-qa/),
# so it works regardless of the caller's cwd.
SCRIPT_DIR = Path(__file__).resolve().parent
SGS_BLOCKS_ROOT = SCRIPT_DIR.parent.parent  # plugins/sgs-blocks/

# Default target dirs. `nav-menu` and `nav-drawer` are the two Spec 36 nav
# blocks (not yet built at Wave-0 — see block.json roster in the spec's
# FR-36-2). `utils` is the existing shared-JS-module convention
# (src/utils/responsive.js, tokens.js, icons.js) — the closest existing
# home for FR-36-7's "shared nav plumbing utility" until/unless that
# utility gets its own directory. Update this list the moment the real
# paths are known; do not let this drift silently.
DEFAULT_DIRS = [
    SGS_BLOCKS_ROOT / "src" / "blocks" / "nav-menu",
    SGS_BLOCKS_ROOT / "src" / "blocks" / "nav-drawer",
    SGS_BLOCKS_ROOT / "src" / "utils",
]

# CSS file extensions this lint scans. style.css / editor.css per the SGS
# block-file convention (see plugins/sgs-blocks/CLAUDE.md "Block Pattern").
CSS_EXTENSIONS = {".css", ".scss"}

# property-name -> suggested logical equivalent (LTR-document assumption).
PHYSICAL_TO_LOGICAL = {
    "margin-left": "margin-inline-start",
    "margin-right": "margin-inline-end",
    "padding-left": "padding-inline-start",
    "padding-right": "padding-inline-end",
    "left": "inset-inline-start",
    "right": "inset-inline-end",
}

# Matches a CSS property declaration: `<prop-name>` optionally preceded by
# whitespace/`{`/`;`, followed by `:`. Captures the property name only.
# Deliberately simple (line-based) — this is a WARN nudge, not a full CSS
# parser; it can over- or under-match inside multi-line values, which is
# an acceptable tradeoff for a non-gating lint.
PROPERTY_RE = re.compile(
    r"(?:^|[;{]|\s)([a-zA-Z-]+)\s*:\s*[^;{}]*;?",
)

# A property name ending in one of these is already logical — never flag
# it even if it happens to contain "left"/"right" as a substring anywhere
# (defence against a naive substring match; the PROPERTY_RE above already
# captures the exact property name, so this is a second belt-and-braces
# check on the captured name itself).
ALREADY_LOGICAL_SUFFIXES = (
    "-inline-start",
    "-inline-end",
    "-inline",
    "-block-start",
    "-block-end",
    "-block",
)


def is_already_logical(prop_name: str) -> bool:
    return any(prop_name.endswith(suffix) for suffix in ALREADY_LOGICAL_SUFFIXES)


def strip_comments(text: str) -> str:
    """Strip /* ... */ CSS comments (including multi-line) before scanning,
    so a physical-property mention inside a comment never false-positives."""
    return re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)


def scan_file(path: Path) -> list[tuple[int, str, str, str]]:
    """Returns a list of (line_no, prop_name, suggestion, line_text) hits."""
    try:
        raw = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        print(f"WARN: could not read {path} — {e}", file=sys.stderr)
        return []

    cleaned = strip_comments(raw)
    hits: list[tuple[int, str, str, str]] = []

    for line_no, line in enumerate(cleaned.splitlines(), start=1):
        for match in PROPERTY_RE.finditer(line):
            prop_name = match.group(1).strip().lower()
            if prop_name not in PHYSICAL_TO_LOGICAL:
                continue
            if is_already_logical(prop_name):
                continue
            suggestion = PHYSICAL_TO_LOGICAL[prop_name]
            hits.append((line_no, prop_name, suggestion, line.strip()))

    return hits


def scan_dir(target: Path) -> list[tuple[Path, int, str, str, str]]:
    """Returns (file, line_no, prop_name, suggestion, line_text) across every
    CSS/SCSS file under target."""
    results: list[tuple[Path, int, str, str, str]] = []
    for ext in CSS_EXTENSIONS:
        for css_file in sorted(target.rglob(f"*{ext}")):
            for line_no, prop_name, suggestion, line_text in scan_file(css_file):
                results.append((css_file, line_no, prop_name, suggestion, line_text))
    return results


def main(argv: list[str]) -> int:
    if argv:
        targets = [Path(arg) for arg in argv]
    else:
        targets = DEFAULT_DIRS

    total_hits = 0
    any_dir_scanned = False

    for target in targets:
        if not target.exists():
            print(f"WARN: target directory not found (not built yet?): {target}")
            continue
        if not target.is_dir():
            print(f"WARN: target is not a directory, skipping: {target}")
            continue

        any_dir_scanned = True
        hits = scan_dir(target)
        if not hits:
            print(f"OK: {target} — no physical left/right properties found.")
            continue

        print(f"WARN: {target} — {len(hits)} physical left/right property use(s):")
        for css_file, line_no, prop_name, suggestion, line_text in hits:
            rel = css_file.relative_to(SGS_BLOCKS_ROOT) if SGS_BLOCKS_ROOT in css_file.parents else css_file
            print(f"  {rel}:{line_no}  `{prop_name}`  ->  consider `{suggestion}`")
            print(f"    {line_text}")
        total_hits += len(hits)

    print()
    if not any_dir_scanned:
        print(
            "logical-props-lint: no target directories exist yet — nothing to scan. "
            "This is expected at Wave-0 before the nav blocks are built; re-run once "
            "src/blocks/nav-menu and src/blocks/nav-drawer exist."
        )
    elif total_hits == 0:
        print("logical-props-lint: 0 warnings across all scanned directories.")
    else:
        print(
            f"logical-props-lint: {total_hits} warning(s) total. "
            "This is a WARN-only nudge (Spec 36 §8 RTL/logical-properties coverage) — "
            "review each hit; it does not fail the build."
        )

    # Always exits 0 — see the "WHY WARN, NOT FAIL" header note.
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
