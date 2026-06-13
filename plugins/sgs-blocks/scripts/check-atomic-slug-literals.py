#!/usr/bin/env python3
"""
check-atomic-slug-literals.py

STRUCTURAL GUARD (FR-22-3, 2026-06-13) — prevents new per-block `if slug ==`
branches from being added to `_atomic_attrs_for` in converter_v2/convert.py.

FR-22-3 binding rule: per-block behaviour must come from DB rows, not code
branches. The current ~13 branches exist for SPECIFIC schema reasons (array
types, security hardening, media routing, or pending universal extension).
This guard FAILS if a NEW slug literal appears in that function that is not
in the documented allow-list below.

The allow-list can only SHRINK (as branches are replaced by DB-driven logic).
To extend it requires a spec amendment and an entry here with a justification.

Usage:
    python scripts/check-atomic-slug-literals.py          # report (exit 0 unless new literals)
    python scripts/check-atomic-slug-literals.py --check  # same, exits 1 on new literals
"""

import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Allow-list: EXACTLY the current set of block-slug literals in _atomic_attrs_for
# (verified 2026-06-13, lines 2936–3355 of convert.py).
# Justification codes:
#   array      — block attr is an array type; requires explicit item construction
#   security   — _safe_href / XS-9.x hardening applied here specifically
#   media      — media URL/type routing logic (img/video/iframe dispatch)
#   core       — WP core block with different schema key names than sgs/* siblings
#   pending    — universal mechanism not yet built; explicit handler is a tracked TODO
# ---------------------------------------------------------------------------
ALLOW_LIST: dict[str, str] = {
    "sgs/heading":      "core",       # level attr (string "h1"…"h6") vs int for core/heading
    "sgs/text":         "core",       # attr key "text" differs from core/paragraph "content"
    "sgs/media":        "media",      # img / video / iframe routing; maxHeight unit split
    "sgs/button":       "security",   # _safe_href XS-9.2 + wp_kses no-<a> allowlist comment
    "sgs/quote":        "array",      # body is array of rich-text strings, not a scalar
    "sgs/icon-list":    "array",      # items is array of {icon, text} dicts
    "sgs/option-picker": "array",     # optionItems is array; typeKey/defaultSelected derived from DOM
    "sgs/icon":         "pending",    # emoji vs lucide-slug detection; pending universal emoji support
    "sgs/testimonial":  "pending",    # CSS-lift for quote/rating/author; pending universal CSS-lift
    "sgs/notice-banner": "pending",   # background CSS-lift guard; pending universal single-colour lift
    "sgs/trust-bar":    "array",      # items array + icon resolver; D182 TYPED native emission
}

# ---------------------------------------------------------------------------
# Locate convert.py relative to this script
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
CONVERT_PY = SCRIPT_DIR / "orchestrator" / "converter_v2" / "convert.py"

if not CONVERT_PY.exists():
    print(f"ERROR: cannot find {CONVERT_PY}", file=sys.stderr)
    sys.exit(2)

source = CONVERT_PY.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# Extract the body of _atomic_attrs_for.
# Strategy: find the function's def line, then collect lines until the NEXT
# top-level def/class (zero-indented) to bound the search region.
# ---------------------------------------------------------------------------
lines = source.splitlines()

func_start = None
func_end = None

for i, line in enumerate(lines):
    if re.match(r'^def _atomic_attrs_for\b', line):
        func_start = i
    elif func_start is not None and i > func_start:
        # Next top-level definition ends the function
        if re.match(r'^(def |class )\S', line):
            func_end = i
            break

if func_start is None:
    print("ERROR: could not locate _atomic_attrs_for in convert.py", file=sys.stderr)
    sys.exit(2)

if func_end is None:
    func_end = len(lines)

func_body_lines = lines[func_start:func_end]
func_body = "\n".join(func_body_lines)

# ---------------------------------------------------------------------------
# Extract all block-slug literals used in if/elif/in-tuple conditions.
# Matches:
#   slug == "sgs/foo"
#   slug == "core/foo"
#   "sgs/foo" == slug
#   slug in ("sgs/foo", "core/bar")
# ---------------------------------------------------------------------------
SLUG_PATTERN = re.compile(r'"((?:sgs|core)/[a-z0-9_-]+)"')

found_slugs: set[str] = set(SLUG_PATTERN.findall(func_body))

# ---------------------------------------------------------------------------
# Compare against allow-list
# ---------------------------------------------------------------------------
new_literals = found_slugs - set(ALLOW_LIST.keys())
removed_literals = set(ALLOW_LIST.keys()) - found_slugs

is_check_mode = "--check" in sys.argv

if new_literals:
    print("FAIL — new block-slug literals found in _atomic_attrs_for that are NOT in the allow-list:")
    for slug in sorted(new_literals):
        print(f"  {slug}")
    print()
    print("FR-22-3 binding rule: per-block behaviour must come from DB rows, not code branches.")
    print("To legitimise a new branch, add it to ALLOW_LIST in this script with a justification,")
    print("and record the reason in .claude/decisions.md.")
    sys.exit(1)

# Report removed literals (shrinkage is good — the allow-list should shrink over time)
if removed_literals:
    print("INFO — the following allow-list entries are no longer present in _atomic_attrs_for")
    print("(the literal set shrank — this is the desired direction). Consider removing them")
    print("from ALLOW_LIST to keep the guard tight:")
    for slug in sorted(removed_literals):
        print(f"  {slug}  # was: {ALLOW_LIST[slug]}")
    print()

print(f"PASS — {len(found_slugs)} slug literal(s) in _atomic_attrs_for, all in allow-list.")
if removed_literals:
    print(f"       ({len(removed_literals)} allow-list entries are now stale — see INFO above)")
sys.exit(0)
