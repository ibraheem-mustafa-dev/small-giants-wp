#!/usr/bin/env python3
"""Every PHP writer of a `box-shadow:` declaration must carry the forced-colours fallback.

Browsers remove box-shadow in forced-colours (high-contrast) mode. PHP-written shadows get the
fallback from sgs_shadow_box_decls() (includes/helpers-shadow-layers.php); CSS written inside a
PHP string (block style variations) carries its own `@media (forced-colors:active)` block.
Stylesheet shadows are covered separately by scripts/shadow-fallback/run.js.

A writer line is accepted when one of these holds within a small window:
  1. it sits beside a call to sgs_shadow_box_decls() / sgs_shadow_forced_colours_decl();
  2. a `@media (forced-colors` block follows it (CSS text inside a PHP string);
  3. it carries a marker `sgs-shadow-fallback: <reason>` on the line or one of the 3 above it,
     for a writer that is deliberately exempt (a hover or restated shadow whose resting rule
     already carries the fallback, or a decorative pseudo-element).

Modes: --survey (list), --check (exit 1 on any writer without one), --self-test.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN = [ROOT / 'includes', ROOT / 'src' / 'blocks']
SKIP_NAMES = {'helpers-shadow-layers.php'}
# The property, not `transition: box-shadow 200ms`, and not `none`.
WRITER = re.compile(r"(?<![\w-])box-shadow\s*:\s*(?!none\b)(?!inset\b)\S")
COMMENT = re.compile(r'^\s*(//|\*|/\*|#)')
FALLBACK_CALL = re.compile(r'sgs_shadow_box_decls|sgs_shadow_forced_colours_decl')
MARKER = re.compile(r'sgs-shadow-fallback:[ ]*[^\s]')


def php_files():
    for base in SCAN:
        for path in sorted(base.rglob('*.php')):
            if path.name in SKIP_NAMES or 'tests' in path.parts:
                continue
            if path.parent.name != 'blocks' and 'blocks' in path.parts and path.name != 'render.php':
                continue
            yield path


def findings(text):
    lines = text.split('\n')
    out = []
    for i, line in enumerate(lines):
        if COMMENT.match(line) or not WRITER.search(line):
            continue
        before = '\n'.join(lines[max(0, i - 3):i + 1])
        near = '\n'.join(lines[max(0, i - 6):i + 7])
        after = '\n'.join(lines[i:i + 12])
        if MARKER.search(before) or FALLBACK_CALL.search(near) or re.search(r'@media\s*\(forced-colors', after):
            continue
        out.append((i + 1, line.strip()[:110]))
    return out


def survey():
    total = 0
    for path in php_files():
        for lineno, line in findings(path.read_text(encoding='utf-8', errors='replace')):
            total += 1
            print(f'  {path.relative_to(ROOT)}:{lineno}  {line}')
    return total


def self_test():
    failures = 0

    def eq(actual, expected, label):
        nonlocal failures
        if actual != expected:
            failures += 1
            print(f'FAIL {label}: expected {expected!r}, got {actual!r}')

    bad = "$d[] = 'box-shadow:' . $v;"
    eq(len(findings(bad)), 1, 'negative control: an unprotected writer is found')
    eq(len(findings(bad.replace("'box-shadow:'", "'box-shadow:'") + '\n$x = sgs_shadow_box_decls( $a, $b );')), 0, 'a nearby sgs_shadow_box_decls() call covers it')
    eq(len(findings("// sgs-shadow-fallback: hover only\n" + bad)), 0, 'a marker with a reason exempts it')
    eq(len(findings("// sgs-shadow-fallback:\n" + bad)), 1, 'a marker with no reason does not')
    eq(len(findings("$c = 'transition:box-shadow 200ms ease';")), 0, 'a transition is not a writer')
    eq(len(findings("$d[] = 'box-shadow:none';")), 0, 'none is not a writer')
    eq(len(findings("box-shadow: var( --x );\n@media (forced-colors:active) { .a { outline: 1px solid CanvasText; } }")), 0, 'CSS text followed by its own forced-colours block')
    eq(len(findings("// box-shadow: 0 1px red;")), 0, 'a comment is not a writer')
    if failures:
        print(f'self-test: {failures} failed')
        return 1
    print('check-shadow-fallback-php self-test: all passed')
    return 0


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    if mode == '--self-test':
        return self_test()
    total = survey()
    print(f'[shadow-fallback-php] {total} shadow writers without the forced-colours fallback')
    return 1 if mode == '--check' and total else 0


if __name__ == '__main__':
    sys.exit(main())
