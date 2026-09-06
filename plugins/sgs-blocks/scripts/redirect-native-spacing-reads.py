#!/usr/bin/env python3
"""redirect-native-spacing-reads.py -- the edit.js/render.php half of
migrate-off-native-spacing.py, which deliberately never touches JS/PHP (see
its own docstring). Group 1 of the Phase 3 tier-object migration widened that
script's ROSTER from 5 blocks to 32, and a `--survey` across all 32 showed the
SAME three mechanical site-shapes on every one (confirmed by hand, not
assumed): a `boxShorthand( style?.spacing?.padding, ... )` preview call, a
`base: style?.spacing?.padding ?? {}` read inside a `<ResponsiveBoxControl>`
`values` object, and a `setAttributes( { style: { ...style, spacing: {
...style?.spacing, padding: next } } } )` (or `attributes.style` variant)
write -- plus the render.php-side PHP mirror of the same read.

This script redirects all of them from `style.spacing.{padding,margin}` to
the now block-owned `{padding,margin}` attribute, once `migrate-off-native-
spacing.py --fix --apply` has already relocated the block.json declaration.

WHAT IT REFUSES TO DO (refuse, never guess)
--------------------------------------------
* Any block outside the roster below.
* Any file where a substitution's REPLACEMENT text seems like it would
  collide with an ALREADY-owned literal `attributes.padding`/`attributes.margin`
  reference -- reported, never silently double-applied.
* Any `style?.` reference that is NOT immediately followed by `.spacing?.padding`
  or `.spacing?.margin` (e.g. `style?.color`) is left completely untouched --
  the regex is anchored on the full `spacing?.{padding,margin}` chain, never a
  bare `spacing` or `style` token.

USAGE
-----
    python redirect-native-spacing-reads.py --survey
    python redirect-native-spacing-reads.py --fix              # dry run
    python redirect-native-spacing-reads.py --fix --apply      # write
    python redirect-native-spacing-reads.py --check            # gate
    python redirect-native-spacing-reads.py --self-test
"""

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

ROSTER = (
    'accordion', 'audio', 'brand-strip', 'breadcrumbs', 'business-info', 'button',
    'collapsible-text', 'countdown-timer', 'counter', 'cta-section', 'form',
    'heading', 'icon', 'icon-list', 'info-box', 'nav-menu', 'notice-banner',
    'option-picker', 'process-steps', 'product-faq', 'product-search', 'quote',
    'responsive-logo', 'separator', 'social-icons', 'star-rating',
    'table-of-contents', 'team-member', 'testimonial', 'text', 'timeline',
    'whatsapp-cta',
)

PROPS = ('padding', 'margin')

# --- JS substitutions -------------------------------------------------------
# Ordered: writes BEFORE reads, so a write's own `padding: next` inner token
# is never re-matched by the read pattern below it.

def _js_subs(prop):
    p = re.escape(prop)
    return [
        # setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } )
        (re.compile(r'setAttributes\(\s*\{\s*style:\s*\{\s*\.\.\.\s*style,\s*spacing:\s*\{\s*'
                     r'\.\.\.\s*style\??\.\s*spacing,\s*' + p + r':\s*next\s*\}\s*\}\s*\}\s*\)'),
         'setAttributes( { %s: next } )' % prop),
        # setAttributes( { style: { ...attributes.style, spacing: { ...attributes.style?.spacing, padding: next } } } )
        (re.compile(r'setAttributes\(\s*\{\s*style:\s*\{\s*\.\.\.\s*attributes\.style,\s*spacing:\s*\{\s*'
                     r'\.\.\.\s*attributes\.style\??\.\s*spacing,\s*' + p + r':\s*next\s*\}\s*\}\s*\}\s*\)'),
         'setAttributes( { %s: next } )' % prop),
        # the product-search/separator/testimonial-shape multi-line variant --
        # BUG FOUND (2026-09-05, this exact class again): missed entirely by
        # the first version of this script because it only had a pattern for
        # the `attributes.style` prefix, not the destructured-`style` one.
        # `--check` initially reported PASS for these 3 blocks anyway because
        # `js_state()`'s detector regex (`spacing\??\.\s*padding\b`) requires
        # `spacing` and `padding` to be textually adjacent -- but this shape
        # writes `spacing: { padding: next }` as a nested OBJECT LITERAL, so
        # the two tokens are never adjacent and the check silently missed its
        # own gap. Fixed alongside (see js_state() below).
        (re.compile(r'style:\s*\{\s*\.\.\.\s*style,\s*spacing:\s*\{\s*'
                     r'\.\.\.\s*style\??\.\s*spacing,\s*' + p + r':\s*next\s*,?\s*\}\s*,?\s*\}\s*,?'),
         '%s: next,' % prop),
        # the accordion/cta-section/form/nav-menu-shape multi-line variant --
        # BUG FIXED (found live on these exact 4 blocks): the FIRST version of
        # this pattern required the two closing braces to be adjacent with only
        # whitespace between them, but the real formatted code has a trailing
        # comma after the inner `spacing: {...}` value before the outer brace
        # closes -- `padding: next },\n  },` not `padding: next } }`. Every
        # `\}` below now allows an optional trailing `,?` so both the compact
        # and the multi-line-with-trailing-comma shapes match.
        (re.compile(r'style:\s*\{\s*\.\.\.\s*attributes\.style,\s*spacing:\s*\{\s*'
                     r'\.\.\.\s*attributes\.style\??\.\s*spacing,\s*' + p + r':\s*next\s*,?\s*\}\s*,?\s*\}\s*,?'),
         '%s: next,' % prop),
        # reset write: style: { ...style, spacing: { ...style?.spacing, padding: {} } },
        (re.compile(r'style:\s*\{\s*\.\.\.\s*style,\s*spacing:\s*\{\s*'
                     r'\.\.\.\s*style\??\.\s*spacing,\s*' + p + r':\s*\{\s*\}\s*\}\s*\}\s*,?'),
         '%s: {},' % prop),
        # preview / plain reads: style?.spacing?.padding  or  attributes.style?.spacing?.padding
        (re.compile(r'attributes\.style\??\.\s*spacing\??\.\s*' + p + r'\b'), 'attributes.%s' % prop),
        (re.compile(r'style\??\.\s*spacing\??\.\s*' + p + r'\b'), '%s' % prop),
        # a bare `...style?.spacing,` / `...attributes.style?.spacing,` leftover inside a
        # spread that ALSO still mentions the sibling prop untouched (mixed pass) --
        # left for a human: reported by --survey, never silently dropped.
    ]


def js_state(text):
    """Classifier: PENDING if any spacing.padding/margin READ (`spacing?.padding`)
    OR WRITE (`spacing: { ...padding: next }` as a nested object literal, where
    the two tokens are NOT textually adjacent) site remains, DONE if neither
    does.

    BUG FIXED (2026-09-05): the first version only checked the READ shape's
    adjacent-token form. It reported PASS on product-search/separator/
    testimonial while their WRITE bodies still nested `padding`/`margin` a
    few lines inside a `spacing: {` object literal -- adjacent in STRUCTURE,
    not in TEXT, so the old regex never saw it. Every one of those 3 blocks
    is now a permanent self-test fixture below."""
    has_padding = bool(re.search(r'spacing\??\.\s*padding\b', text)) or bool(
        re.search(r'spacing:\s*\{[^}]*?\bpadding:\s*next\b', text, re.DOTALL))
    has_margin = bool(re.search(r'spacing\??\.\s*margin\b', text)) or bool(
        re.search(r'spacing:\s*\{[^}]*?\bmargin:\s*next\b', text, re.DOTALL))
    return has_padding, has_margin


def fix_js(block, apply_):
    f = BLOCKS_DIR / block / 'edit.js'
    if not f.exists():
        return [], None
    text = f.read_text(encoding='utf-8')
    original = text
    changes = []
    for prop in PROPS:
        for pattern, repl in _js_subs(prop):
            n = len(pattern.findall(text))
            if n:
                text = pattern.sub(repl, text)
                changes.append('%s: %d site(s) via %s' % (prop, n, pattern.pattern[:40]))
    if text == original:
        return [], None
    if apply_:
        f.write_text(text, encoding='utf-8')
    return changes, None


# --- PHP substitutions -------------------------------------------------------

def _php_subs(prop):
    p = re.escape(prop)
    return [
        (re.compile(r"\$attributes\[\s*'style'\s*\]\[\s*'spacing'\s*\]\[\s*'" + p + r"'\s*\]"),
         "$attributes['%s']" % prop),
    ]


def fix_php(block, apply_):
    f = BLOCKS_DIR / block / 'render.php'
    if not f.exists():
        return [], None
    text = f.read_text(encoding='utf-8')
    original = text
    changes = []
    for prop in PROPS:
        for pattern, repl in _php_subs(prop):
            n = len(pattern.findall(text))
            if n:
                text = pattern.sub(repl, text)
                changes.append('%s: %d site(s)' % (prop, n))
    if text == original:
        return [], None
    if apply_:
        f.write_text(text, encoding='utf-8')
    return changes, None


# --- driver ------------------------------------------------------------------

def cmd_survey():
    print('=== JS (edit.js) ===')
    for b in ROSTER:
        f = BLOCKS_DIR / b / 'edit.js'
        if not f.exists():
            print('  %-18s MISSING edit.js' % b)
            continue
        text = f.read_text(encoding='utf-8')
        has_padding, has_margin = js_state(text)
        print('  %-18s padding=%-5s margin=%-5s' % (b, has_padding, has_margin))
    print('\n=== PHP (render.php) ===')
    for b in ROSTER:
        f = BLOCKS_DIR / b / 'render.php'
        if not f.exists():
            print('  %-18s no render.php' % b)
            continue
        text = f.read_text(encoding='utf-8')
        hits = sum(len(p.findall(text)) for prop in PROPS for p, _ in _php_subs(prop))
        print('  %-18s %d site(s)' % (b, hits))
    return 0


def cmd_fix(apply_):
    mode = 'APPLY' if apply_ else 'DRY RUN (nothing written)'
    print('=== FIX -- %s ===\n' % mode)
    for b in ROSTER:
        js_changes, js_err = fix_js(b, apply_)
        php_changes, php_err = fix_php(b, apply_)
        print('  %-18s js: %s | php: %s' % (
            b,
            '; '.join(js_changes) if js_changes else (js_err or 'no change'),
            '; '.join(php_changes) if php_changes else (php_err or 'no change'),
        ))
    return 0


def cmd_check():
    failures = []
    for b in ROSTER:
        f = BLOCKS_DIR / b / 'edit.js'
        if f.exists():
            has_padding, has_margin = js_state(f.read_text(encoding='utf-8'))
            if has_padding:
                failures.append('%s/edit.js still reads/writes style.spacing.padding' % b)
            if has_margin:
                failures.append('%s/edit.js still reads/writes style.spacing.margin' % b)
        f = BLOCKS_DIR / b / 'render.php'
        if f.exists():
            text = f.read_text(encoding='utf-8')
            for prop in PROPS:
                for pattern, _ in _php_subs(prop):
                    if pattern.search(text):
                        failures.append("%s/render.php still reads $attributes['style']['spacing']['%s']" % (b, prop))
    if failures:
        print('FAIL -- %d finding(s):' % len(failures))
        for f in failures:
            print('  - %s' % f)
        return 1
    print('PASS -- no style.spacing.{padding,margin} reads/writes remain on the %d roster blocks.' % len(ROSTER))
    return 0


def self_test():
    ok = True

    def check(label, got, want):
        nonlocal ok
        good = got == want
        ok = ok and good
        print('  %-60s %s' % (label, 'PASS' if good else 'FAIL'))
        if not good:
            print('      got  %r\n      want %r' % (got, want))

    # Positive: accordion-shape (attributes.style, explicit if/else, literal keys).
    src = (
        'values={ {\n'
        '  base: attributes.style?.spacing?.padding ?? {},\n'
        '  tablet: attributes.paddingTablet ?? {},\n'
        '} }\n'
        'onChange={ ( tier, next ) => {\n'
        '  if ( tier === "base" ) {\n'
        '    setAttributes( {\n'
        '      style: { ...attributes.style, spacing: { ...attributes.style?.spacing, padding: next } },\n'
        '    } );\n'
        '  }\n'
        '} }'
    )
    text = src
    for prop in PROPS:
        for pattern, repl in _js_subs(prop):
            text = pattern.sub(repl, text)
    check('accordion-shape base read redirected', 'attributes.padding ?? {}' in text, True)
    check('accordion-shape base write redirected', 'padding: next,' in text, True)
    check('accordion-shape no spacing.padding survives', bool(re.search(r'spacing\??\.\s*padding', text)), False)

    # Positive: button-shape (destructured style, template-literal write key).
    src2 = (
        'const paddingPreview = boxShorthand( style?.spacing?.padding, [ "top" ] );\n'
        'values={ {\n'
        '  base: style?.spacing?.padding ?? {},\n'
        '} }\n'
        'onChange={ ( tier, next ) => {\n'
        '  if ( "base" === tier ) {\n'
        '    setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );\n'
        '  }\n'
        '} }'
    )
    text2 = src2
    for prop in PROPS:
        for pattern, repl in _js_subs(prop):
            text2 = pattern.sub(repl, text2)
    check('button-shape preview redirected', 'boxShorthand( padding, [ "top" ] )' in text2, True)
    check('button-shape base read redirected', 'base: padding ?? {},' in text2, True)
    check('button-shape base write redirected', 'setAttributes( { padding: next } )' in text2, True)

    # Regression fixture (2026-09-05): the product-search/separator/testimonial
    # shape, destructured `style` + nested object-literal write. Missed by the
    # first version of BOTH the substitution list AND js_state()'s detector.
    src4 = (
        'values={ { base: padding ?? {}, tablet: paddingTablet ?? {} } }\n'
        'onChange={ ( tier, next ) => {\n'
        '  if ( "base" === tier ) {\n'
        '    setAttributes( {\n'
        '      style: {\n'
        '        ...style,\n'
        '        spacing: {\n'
        '          ...style?.spacing,\n'
        '          padding: next,\n'
        '        },\n'
        '      },\n'
        '    } );\n'
        '  }\n'
        '} }'
    )
    check('regression: object-literal write shape DETECTED before fix',
          js_state(src4)[0], True)
    text4 = src4
    for prop in PROPS:
        for pattern, repl in _js_subs(prop):
            text4 = pattern.sub(repl, text4)
    check('regression: object-literal write shape redirected', 'padding: next,' in text4 and 'spacing' not in text4, True)
    check('regression: object-literal write shape CLEARED after fix', js_state(text4)[0], False)

    # Negative control: a `style?.color` reference must be completely untouched.
    src3 = 'const c = attributes.style?.color?.text; const p = style?.spacing?.padding;'
    text3 = src3
    for prop in PROPS:
        for pattern, repl in _js_subs(prop):
            text3 = pattern.sub(repl, text3)
    check('negative: style.color untouched', 'attributes.style?.color?.text' in text3, True)
    check('negative: spacing.padding still redirected in the same line', 'padding;' in text3, True)

    # PHP positive.
    php_src = (
        "if ( isset( $attributes['style']['spacing']['padding'] ) "
        "&& is_array( $attributes['style']['spacing']['padding'] ) ) {\n"
        "\tforeach ( $attributes['style']['spacing']['padding'] as $k => $v ) {}\n"
        "}"
    )
    php_text = php_src
    for prop in PROPS:
        for pattern, repl in _php_subs(prop):
            php_text = pattern.sub(repl, php_text)
    check('php: all 3 sites redirected', php_text.count("$attributes['padding']"), 3)
    check('php: no style.spacing.padding survives', "['style']['spacing']" in php_text, False)

    print('\n%s' % ('SELF-TEST PASS' if ok else 'SELF-TEST FAIL'))
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
