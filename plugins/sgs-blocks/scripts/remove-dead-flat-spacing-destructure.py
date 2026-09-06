#!/usr/bin/env python3
"""remove-dead-flat-spacing-destructure.py — one-shot cleanup for the Group 1
padding/margin migration (commit 65f7abf02 and follow-ups). That migration
folded `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile` into the
single owned `padding`/`margin` tier-object attribute, but never removed the
now-dead names from each block's `const { ... } = attributes;` destructure —
`check-undeclared-attrs.py` correctly flags all four as "destructured but not
declared in block.json" across all 32 migrated blocks.

SCOPE, DELIBERATELY NARROW
--------------------------
Removes ONLY `paddingTablet`, `paddingMobile`, `marginTablet`, `marginMobile`
as bare destructure entries. Does NOT touch:
  - `style` (also flagged by the same gate on these blocks) — needs a
    per-file check for whether it's still read for colour/border/typography
    before removing; out of scope here.
  - `borderRadiusTablet`/`borderRadiusMobile` (flagged on a different subset
    of blocks) — a DIFFERENT, concurrently in-progress border-radius
    migration owns that surface; not this script's business.

Safe because: redirect-native-spacing-reads.py --check already proved (this
session) that no live code anywhere reads these four names for the padding/
margin family; a destructure entry with zero readers is unambiguously dead.

USAGE
-----
    python remove-dead-flat-spacing-destructure.py --survey
    python remove-dead-flat-spacing-destructure.py --fix           # dry run
    python remove-dead-flat-spacing-destructure.py --fix --apply   # write
    python remove-dead-flat-spacing-destructure.py --check         # gate
    python remove-dead-flat-spacing-destructure.py --self-test
"""
import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

DEAD_NAMES = ('paddingTablet', 'paddingMobile', 'marginTablet', 'marginMobile')

ROSTER = (
    'accordion', 'audio', 'brand-strip', 'breadcrumbs', 'business-info', 'button',
    'collapsible-text', 'countdown-timer', 'counter', 'cta-section', 'form',
    'heading', 'icon', 'icon-list', 'info-box', 'nav-menu', 'notice-banner',
    'option-picker', 'process-steps', 'product-faq', 'product-search', 'quote',
    'responsive-logo', 'separator', 'social-icons', 'star-rating',
    'table-of-contents', 'team-member', 'testimonial', 'text', 'timeline',
    'whatsapp-cta',
)


def dead_lines_present(text):
    return [n for n in DEAD_NAMES if re.search(r'^\s*' + n + r',\s*$', text, re.MULTILINE)]


def cmd_survey():
    for b in ROSTER:
        f = BLOCKS_DIR / b / 'edit.js'
        if not f.exists():
            print(f'  {b:16} no edit.js')
            continue
        text = f.read_text(encoding='utf-8')
        found = dead_lines_present(text)
        print(f'  {b:16} {"dead: " + ", ".join(found) if found else "clean"}')
    return 0


def fix_block(block, apply_):
    f = BLOCKS_DIR / block / 'edit.js'
    if not f.exists():
        return False, 'no edit.js'
    text = f.read_text(encoding='utf-8')
    found = dead_lines_present(text)
    if not found:
        return False, 'already clean'
    new_text = text
    for n in found:
        # Remove the whole line (including its own newline), whatever the
        # indentation style — a bare `name,` line is the destructure entry,
        # never a comment or a different use of the identifier (verified: the
        # only occurrences of these 4 exact identifiers, standalone on their
        # own line ending in a comma, are destructure entries in this file
        # family — confirmed across the whole roster before writing this).
        new_text = re.sub(r'^\s*' + n + r',\s*\n', '', new_text, flags=re.MULTILINE)
    if not apply_:
        return True, f'would remove: {", ".join(found)}'
    f.write_text(new_text, encoding='utf-8')
    return True, f'removed: {", ".join(found)}'


def cmd_fix(apply_):
    mode = 'APPLY' if apply_ else 'DRY RUN'
    print(f'=== FIX -- {mode} ===\n')
    for b in ROSTER:
        ok, msg = fix_block(b, apply_)
        print(f'  {"OK  " if ok else "SKIP"} {b:16} {msg}')
    return 0


def cmd_check():
    failures = []
    for b in ROSTER:
        f = BLOCKS_DIR / b / 'edit.js'
        if not f.exists():
            continue
        found = dead_lines_present(f.read_text(encoding='utf-8'))
        if found:
            failures.append(f'{b}: still destructures {", ".join(found)}')
    if failures:
        print(f'FAIL -- {len(failures)} finding(s):')
        for x in failures:
            print(f'  - {x}')
        return 1
    print(f'PASS -- no dead flat-spacing destructure entries remain across {len(ROSTER)} blocks.')
    return 0


def self_test():
    ok = True

    def check(label, got, want):
        nonlocal ok
        good = got == want
        ok = ok and good
        print(f'  {label:60} {"PASS" if good else "FAIL"}')
        if not good:
            print(f'      got  {got!r}\n      want {want!r}')

    src = (
        'export default function Edit({ attributes, setAttributes }) {\n'
        '  const {\n'
        '    style,\n'
        '    paddingTablet,\n'
        '    paddingMobile,\n'
        '    marginTablet,\n'
        '    marginMobile,\n'
        '    scaleHover,\n'
        '  } = attributes;\n'
        '}\n'
    )
    found = dead_lines_present(src)
    check('finds all 4 dead names', sorted(found), sorted(list(DEAD_NAMES)))
    new_text = src
    for n in found:
        new_text = re.sub(r'^\s*' + n + r',\s*\n', '', new_text, flags=re.MULTILINE)
    check('style survives (not in scope)', 'style,' in new_text, True)
    check('scaleHover survives (unrelated attr)', 'scaleHover,' in new_text, True)
    check('all 4 dead lines gone', dead_lines_present(new_text), [])

    # Negative control: a block with none of the 4 dead names present.
    clean_src = 'export default function Edit({ attributes }) {\n  const { style, scaleHover } = attributes;\n}\n'
    check('negative: clean file reports nothing', dead_lines_present(clean_src), [])

    print(f'\n{"SELF-TEST PASS" if ok else "SELF-TEST FAIL"}')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.check:
        return cmd_check()
    if args.fix:
        return cmd_fix(args.apply)
    if args.survey:
        return cmd_survey()
    ap.error('one of --survey / --fix / --check / --self-test is required')


if __name__ == '__main__':
    sys.exit(main())
