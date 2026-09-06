#!/usr/bin/env python3
"""GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0
from registration, 1 only on divergence'), not a backlog. Written 2026-09-06
after fixing the tier-object padding/margin migration's render.php side
across 29 blocks (fix-render-tier-object-spacing.py, commits e863203d7 +
75b8dd657) and hitting a REAL production fatal while doing it:
"Call to undefined function sgs_responsive_normalise_object()" — the
normalisation call ran before the require that defines it had executed.
Deployed once, broke the sandybrown canary, rolled back within ~2 minutes.

This script guards against BOTH halves of that incident recurring, for
ANY render.php under src/blocks — not just the 29 already fixed, so a
future block reusing the same tier-object-normalise pattern (or a future
attribute migration folding a flat *Tablet/*Mobile pair into a tier
object) gets the same protection automatically:

1. LOAD-ORDER: if a file calls `sgs_responsive_normalise_object(`, some
   `require_once` naming `helpers-responsive.php` OR `render-helpers.php`
   (which itself requires helpers-responsive.php) must appear at an
   EARLIER LINE NUMBER than the first call. Calling a function before the
   file that defines it has been required is a PHP fatal, not a warning —
   `php -l` cannot catch it because the syntax is valid; only tracing
   execution order catches it, which is exactly what this check does
   structurally (by line number) rather than by executing PHP.

2. DEAD-FLAT-ATTR: `$attributes['paddingTablet']` / `['paddingMobile']`
   / `['marginTablet']` / `['marginMobile']` read as a literal string key
   in a render.php whose block.json does NOT declare that attribute name
   is a dead read — the exact bug class this migration fixed. Declared-in
   block.json is checked PER BLOCK (not assumed from a hardcoded roster),
   so a block that genuinely still has the flat shape (not yet migrated)
   is correctly exempted, and a block that already migrated but grew a
   NEW stray read of the dead name is correctly caught.

Usage:
  python scripts/check-render-tier-object-spacing.py --check       # gate: exit 1 on any finding
  python scripts/check-render-tier-object-spacing.py                # same scan, exit 0 always (report)
  python scripts/check-render-tier-object-spacing.py --self-test    # fixture-based, exit 1 on failed assertion
"""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).resolve().parent
BLOCKS_DIR = SCRIPT_DIR.parent / 'src' / 'blocks'

REQUIRE_DEFINER_RE = re.compile(
    r"require(?:_once)?[^\n]*(?:helpers-responsive\.php|render-helpers\.php)['\"]"
)
NORMALISE_CALL_RE = re.compile(r"\bsgs_responsive_normalise_object\s*\(")

DEAD_FLAT_ATTRS = ('paddingTablet', 'paddingMobile', 'marginTablet', 'marginMobile')
DEAD_FLAT_RE = {
    name: re.compile(r"\$attributes\[\s*['\"]" + re.escape(name) + r"['\"]\s*\]")
    for name in DEAD_FLAT_ATTRS
}
# The ONE sanctioned read of the dead names: none — they should never appear
# as a literal $attributes[...] key at all once a block has migrated. The
# normalise call reads 'padding'/'margin' (the tier-object attr), never the
# flat *Tablet/*Mobile siblings, so there is no exemption to carve out here.


BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
LINE_COMMENT_RE = re.compile(r"//[^\n]*")


def strip_comments(text):
    """Blank out (not delete — preserves line numbers) block and line
    comments so a docblock/prose mention of a function or attribute name
    (e.g. "sgs_responsive_normalise_object() lives in..." or
    "reads $attributes['paddingTablet'] etc.") cannot be mistaken for a
    real call or a real read. Replacing with spaces (not removing) keeps
    every line number identical to the original file, which line-based
    reporting below depends on. Earned 2026-09-06: the first version of
    this script matched exactly such a comment and reported a false
    load-order violation on all 29 already-fixed blocks."""
    def blank(m):
        # Preserve embedded newlines (line-number-critical), blank everything else.
        return ''.join('\n' if c == '\n' else ' ' for c in m.group(0))

    text = BLOCK_COMMENT_RE.sub(blank, text)
    text = LINE_COMMENT_RE.sub(blank, text)
    return text


def declared_attrs(block_json_path):
    try:
        data = json.loads(block_json_path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return set()
    return set((data.get('attributes') or {}).keys())


def check_load_order(text, relpath):
    """Returns a finding string, or None."""
    call_match = NORMALISE_CALL_RE.search(text)
    if not call_match:
        return None
    require_match = REQUIRE_DEFINER_RE.search(text)
    if not require_match:
        return (f"{relpath}: calls sgs_responsive_normalise_object() but no "
                 f"require of helpers-responsive.php/render-helpers.php found "
                 f"anywhere in the file — will fatal at runtime")
    call_line = text.count('\n', 0, call_match.start()) + 1
    require_line = text.count('\n', 0, require_match.start()) + 1
    if require_line >= call_line:
        return (f"{relpath}: sgs_responsive_normalise_object() called at line "
                 f"{call_line} but the defining require is at line "
                 f"{require_line} — call precedes (or ties) its own require, "
                 f"will fatal at runtime (the exact 2026-09-06 incident shape)")
    return None


def check_dead_flat_attrs(text, relpath, declared):
    findings = []
    for name, pat in DEAD_FLAT_RE.items():
        if name in declared:
            continue  # this block genuinely still has the flat attr — not migrated, not a bug
        if pat.search(text):
            count = len(pat.findall(text))
            findings.append(
                f"{relpath}: reads $attributes['{name}'] {count}x but block.json "
                f"does not declare '{name}' — dead flat-attribute read"
            )
    return findings


def scan():
    findings = []
    if not BLOCKS_DIR.exists():
        return findings, 0
    scanned = 0
    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        render = block_dir / 'render.php'
        block_json = block_dir / 'block.json'
        if not render.exists() or not block_json.exists():
            continue
        scanned += 1
        text = strip_comments(render.read_text(encoding='utf-8'))
        relpath = f"src/blocks/{block_dir.name}/render.php"
        order_finding = check_load_order(text, relpath)
        if order_finding:
            findings.append(order_finding)
        declared = declared_attrs(block_json)
        findings.extend(check_dead_flat_attrs(text, relpath, declared))
    return findings, scanned


def self_test():
    failures = []

    # Fixture 1 — load order violated: call before require.
    bad_order = (
        "<?php\ndefined( 'ABSPATH' ) || exit;\n"
        "$x = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );\n"
        "require_once __DIR__ . '/helpers-responsive.php';\n"
    )
    if check_load_order(bad_order, 'fixture') is None:
        failures.append('self-test: bad_order fixture should have been flagged, was not')

    # Fixture 2 — load order correct: require before call.
    good_order = (
        "<?php\ndefined( 'ABSPATH' ) || exit;\n"
        "require_once __DIR__ . '/helpers-responsive.php';\n"
        "$x = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );\n"
    )
    if check_load_order(good_order, 'fixture') is not None:
        failures.append('self-test: good_order fixture should NOT have been flagged, was')

    # Fixture 3 — no normalise call at all: N/A, must not false-positive.
    no_call = "<?php\ndefined( 'ABSPATH' ) || exit;\n$x = 1;\n"
    if check_load_order(no_call, 'fixture') is not None:
        failures.append('self-test: no_call fixture should NOT have been flagged, was')

    # Fixture 4 — dead flat attr read, NOT declared -> flagged.
    dead_read = "<?php\n$t = $attributes['paddingTablet'] ?? null;\n"
    findings = check_dead_flat_attrs(dead_read, 'fixture', declared=set())
    if not findings:
        failures.append('self-test: dead_read fixture should have been flagged, was not')

    # Fixture 5 — same read, but attr genuinely still declared (not migrated) -> exempt.
    findings = check_dead_flat_attrs(dead_read, 'fixture', declared={'paddingTablet'})
    if findings:
        failures.append('self-test: dead_read fixture with declared attr should be exempt, was flagged')

    # Fixture 6 — idempotence: running the same text through both checks twice
    # yields the same finding set (checks are read-only / pure).
    f1 = check_load_order(bad_order, 'fixture')
    f2 = check_load_order(bad_order, 'fixture')
    if f1 != f2:
        failures.append('self-test: check_load_order is not idempotent')

    # Fixture 7 — EDGE, earned 2026-09-06: a docblock/comment that MENTIONS
    # the function name with a trailing '(' (prose, not a real call) must
    # NOT be treated as a call, and a comment mentioning the dead attr name
    # must not be treated as a real read. The first version of this script
    # got this wrong on all 29 already-fixed blocks (every one carries a
    # docblock explaining the fix, which names both the function and the
    # dead attrs) before strip_comments() was added.
    comment_only = (
        "<?php\ndefined( 'ABSPATH' ) || exit;\n"
        "// Fixed: sgs_responsive_normalise_object() lives in helpers-responsive.php\n"
        "// (reads $attributes['paddingTablet'] etc. via the wrapper)\n"
        "$x = 1;\n"
    )
    stripped = strip_comments(comment_only)
    if check_load_order(stripped, 'fixture') is not None:
        failures.append('self-test: comment-only mention of the function should not be a load-order finding')
    if check_dead_flat_attrs(stripped, 'fixture', declared=set()):
        failures.append('self-test: comment-only mention of the dead attr should not be a dead-flat-attr finding')
    # And strip_comments() must preserve line count (line-number reporting
    # depends on it) -- block comments in particular can span lines.
    multiline_comment = "<?php\n/* line one\nline two\nline three */\n$x = 1;\n"
    if strip_comments(multiline_comment).count('\n') != multiline_comment.count('\n'):
        failures.append('self-test: strip_comments must preserve line count across a multi-line block comment')

    if failures:
        for f in failures:
            print(f'[self-test] FAIL: {f}')
        return 1
    print('[self-test] all assertions passed')
    return 0


def main():
    args = sys.argv[1:]
    if '--self-test' in args:
        sys.exit(self_test())

    findings, scanned = scan()
    is_check = '--check' in args

    print(f'[check-render-tier-object-spacing] scanned {scanned} block(s) with both '
          f'render.php and block.json')
    if not findings:
        print('[check-render-tier-object-spacing] OK — 0 findings')
        sys.exit(0)

    print(f'[check-render-tier-object-spacing] {len(findings)} finding(s):')
    for f in findings:
        print(f'  - {f}')

    sys.exit(1 if is_check else 0)


if __name__ == '__main__':
    main()
