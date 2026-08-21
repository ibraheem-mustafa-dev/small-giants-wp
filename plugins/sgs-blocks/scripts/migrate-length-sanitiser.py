#!/usr/bin/env python3
"""Move every LENGTH-valued call site from the crude sanitiser to the hardened one.

WHAT THIS DOES
    sgs_css_length_sanitise( ... )  ->  sgs_css_length_value( ... )

    Spec 32 §6.1 (a2). The crude form is
    `preg_replace( '/[^A-Za-z0-9.%]/', '', ... )` -- it strips hyphens, spaces
    and parens unconditionally, so it silently loses the sign of "-10px",
    flattens "16px 12px" to "16px12px", and mangles "calc(100% - 20px)" to
    "calc100%20px". The hardened `sgs_css_length_value()` preserves all three
    and maps a bare integer to a WP spacing-preset var(). Measured, not
    assumed (probe run 2026-08-21):

        INPUT                    CRUDE               HARDENED
        -10px                    10px                -10px
        calc(100% - 20px)        calc100%20px        calc(100% - 20px)
        16px 12px                16px12px            16px 12px
        16                       16                  var(--wp--preset--spacing--16)
        var:preset|spacing|40    varpresetspacing40  var:preset|spacing|40   <-- note

    NOTE -- Spec 32 §6.1 (a2)'s table claims the hardened function RESOLVES
    `var:preset|spacing|40`. Measured, it does NOT: it passes the value through
    verbatim, which is still invalid CSS. That is an improvement (no longer
    corrupted into `varpresetspacing40`) but it is not a resolution. Reported,
    not silently "fixed" here.

WHAT IT DELIBERATELY DOES NOT DO
    * The DEFINITION (`function sgs_css_length_sanitise(`) stays -- helpers-box.php
      keeps providing the crude form for the one unitless-legal caller.
    * `function_exists( 'sgs_css_length_sanitise' )` guard strings are left
      alone (the name there is followed by a quote, not "(", so the pattern
      cannot match them; the classifier also refuses quoted contexts).
    * EXCLUDE (below) names every UNITLESS-LEGAL call site by hand. The hardened
      function maps a bare integer to a SPACING preset, so `line-height: 2`
      would become `line-height: var(--wp--preset--spacing--2)`. A future
      unitless site is added here deliberately, never by heuristic.

    Anything the classifier does not recognise is REPORTED as
    "SKIP: unrecognised" and left untouched, and the run exits non-zero. A
    silent skip is the failure mode that produced two wrong counts on
    2026-08-21.

    python migrate-length-sanitiser.py --survey | --fix [--apply] | --check | --self-test
"""
import argparse
import glob
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = 'sgs_css_length_sanitise'
NEW = 'sgs_css_length_value'
PAT = re.compile(re.escape(OLD) + r'\(')

# Call sites that must STAY on the CRUDE function, named by
# (repo-relative path, identifier on the line). Added by hand, deliberately --
# never by heuristic. Two reasons a site belongs here, both rooted in the same
# hardened-function behaviour: a BARE INTEGER is mapped to a spacing preset.
#
#   1. UNITLESS-LEGAL property -- `line-height: 2` would become
#      `line-height: var(--wp--preset--spacing--2)`.
#   2. BARE NUMBER THAT IS NOT A LENGTH -- the value is a plain number the
#      caller concatenates its own unit onto, so preset-wrapping it produces
#      `var(--wp--preset--spacing--42)%`, which is invalid CSS.
EXCLUDE = {
    # (1) unitless-legal: feeds `line-height`.
    ('src/blocks/testimonial/render.php', 'quote_line_height'),
    # (2) bare number + caller-supplied unit: $gr_pct is round(0..100) and the
    # caller appends '%' itself -- `--sgs-gr-pct:` . value . '%'.
    ('src/blocks/google-reviews/render.php', 'gr_pct'),
}


def targets():
    out = sorted(glob.glob(os.path.join(ROOT, 'src', 'blocks', '*', 'render.php')))
    out += sorted(glob.glob(os.path.join(ROOT, 'includes', '*.php')))
    return out


def rel(path):
    return os.path.relpath(path, ROOT).replace('\\', '/')


def classify(line, relpath):
    """Return 'definition' | 'excluded' | 'comment' | 'call' | 'unrecognised'."""
    stripped = line.lstrip()
    if re.search(r'\bfunction\s+' + re.escape(OLD) + r'\s*\(', line):
        return 'definition'
    for ex_file, ex_ident in EXCLUDE:
        if relpath == ex_file and re.search(r'\b' + re.escape(ex_ident) + r'\b', line):
            return 'excluded'
    if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
        return 'comment'
    # A real call site: the name is not part of a longer identifier / member
    # access, and is not sitting inside a quoted string literal.
    for m in PAT.finditer(line):
        before = line[:m.start()]
        if re.search(r'[A-Za-z0-9_$]$', before):
            return 'unrecognised'
        if before.rstrip().endswith('->') or before.rstrip().endswith('::'):
            return 'unrecognised'
        if before.count("'") % 2 or before.count('"') % 2:
            return 'unrecognised'
        return 'call'
    return 'unrecognised'


def transform(text, relpath):
    """Rewrite `text`; return (new_text, per-line records)."""
    lines = text.split('\n')
    kinds = [classify(l, relpath) if PAT.search(l) else None for l in lines]
    # A file that KEEPS a crude call site (an EXCLUDE entry, or the definition
    # itself) still legitimately names the crude function in its provenance
    # comments -- renaming those would make the comment lie. Leave them, and
    # report them, rather than chasing a cosmetically-clean grep.
    keeps_crude = any(k in ('excluded', 'definition') for k in kinds)
    records = []
    for i, line in enumerate(lines):
        if OLD not in line:
            continue
        if not PAT.search(line):
            records.append((i + 1, 'bare-mention', line.strip()))
            continue
        kind = kinds[i]
        if kind == 'comment' and keeps_crude:
            kind = 'comment-retained'
        records.append((i + 1, kind, line.strip()))
        if kind in ('call', 'comment'):
            lines[i] = PAT.sub(NEW + '(', line)
    return '\n'.join(lines), records


def scan(apply_changes=False, dry=False, quiet=False):
    tally = {'call': 0, 'comment': 0, 'comment-retained': 0, 'definition': 0,
             'excluded': 0, 'unrecognised': 0, 'bare-mention': 0}
    changed_files = []
    for path in targets():
        with io.open(path, encoding='utf-8', newline='') as f:
            text = f.read()
        if OLD not in text:
            continue
        r = rel(path)
        new, records = transform(text, r)
        for ln, kind, snippet in records:
            tally[kind] += 1
            if quiet:
                continue
            if kind == 'unrecognised':
                print('  SKIP: unrecognised  %s:%d  %s' % (r, ln, snippet[:100]))
            elif kind in ('definition', 'excluded', 'comment-retained'):
                print('  SKIP: %-10s  %s:%d  %s' % (kind, r, ln, snippet[:88]))
        if new != text:
            n = sum(1 for _, k, _ in records if k in ('call', 'comment'))
            changed_files.append((path, r, n))
            if apply_changes:
                with io.open(path, 'w', encoding='utf-8', newline='') as f:
                    f.write(new)
            elif dry:
                print('  WOULD REWRITE  %-52s %d site(s)' % (r, n))
    return tally, changed_files


SELF_TEST_PLAIN = """<?php
defined( 'ABSPATH' ) || exit;
$w = sgs_css_length_sanitise( $attributes['w'] ?? '' );
$args['radius']  = sgs_css_length_sanitise( $radius_raw );
// pre-sanitised (sgs_css_length_sanitise() / sgs_colour_value)
"""

SELF_TEST_DEF = """<?php
if ( ! function_exists( 'sgs_css_length_sanitise' ) ) {
\tfunction sgs_css_length_sanitise( $value ): string {
\t\treturn preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
\t}
}
"""

SELF_TEST_UNITLESS = """<?php
$quote_line_height     = sgs_css_length_sanitise( trim( (string) ( $attributes['quoteLineHeight'] ?? '' ) ) );
$mw_safe = sgs_css_length_sanitise( $max_width );
// pre-sanitised (sgs_css_length_sanitise() / sgs_colour_value)
"""

SELF_TEST_INERT = "<?php\ndefined( 'ABSPATH' ) || exit;\n$x = 1;\n"


def self_test():
    global EXCLUDE
    fails = []

    def check(label, cond):
        print(('  PASS  ' if cond else '  FAIL  ') + label)
        if not cond:
            fails.append(label)

    out, recs = transform(SELF_TEST_PLAIN, 'src/blocks/fixture/render.php')
    kinds = [k for _, k, _ in recs]
    check('plain call site renamed', 'sgs_css_length_value( $attributes' in out)
    check('array-assign call site renamed', 'sgs_css_length_value( $radius_raw )' in out)
    check('comment mention renamed (docs track code)',
          'sgs_css_length_value() / sgs_colour_value' in out)
    check('no crude call remains in fixture', 'sgs_css_length_sanitise(' not in out)
    check('classified 2 calls + 1 comment',
          kinds.count('call') == 2 and kinds.count('comment') == 1)

    out_def, recs_def = transform(SELF_TEST_DEF, 'includes/helpers-box.php')
    kinds_def = [k for _, k, _ in recs_def]
    check('DEFINITION untouched',
          'function sgs_css_length_sanitise( $value ): string {' in out_def)
    check('function_exists guard untouched',
          "function_exists( 'sgs_css_length_sanitise' )" in out_def)
    check('definition fixture byte-identical', out_def == SELF_TEST_DEF)
    check('definition classified as definition', 'definition' in kinds_def)

    out_u, recs_u = transform(SELF_TEST_UNITLESS, 'src/blocks/testimonial/render.php')
    kinds_u = [k for _, k, _ in recs_u]
    check('excluded unitless site untouched',
          '$quote_line_height     = sgs_css_length_sanitise(' in out_u)
    check('excluded site REPORTED as excluded', kinds_u.count('excluded') == 1)
    check('the sibling length site in the SAME file still migrates',
          'sgs_css_length_value( $mw_safe' in out_u or 'sgs_css_length_value( $max_width )' in out_u)

    check('provenance comment RETAINED in a file that keeps a crude call',
          'sgs_css_length_sanitise() / sgs_colour_value' in out_u)
    check('retained comment REPORTED as comment-retained',
          kinds_u.count('comment-retained') == 1)

    same, recs_i = transform(SELF_TEST_INERT, 'src/blocks/inert/render.php')
    check('negative control: inert file byte-identical',
          same == SELF_TEST_INERT and not recs_i)

    # NEGATIVE CONTROL for the exclusion list itself: emptying it MUST let the
    # unitless fixture through. A green suite whose exclusion matches nothing
    # looks identical to one where the exclusion is doing real work.
    saved = EXCLUDE
    EXCLUDE = set()
    try:
        out_nc, recs_nc = transform(SELF_TEST_UNITLESS, 'src/blocks/testimonial/render.php')
        nc_kinds = [k for _, k, _ in recs_nc]
        check('NEG-CTL: EXCLUDE emptied -> the unitless site IS renamed',
              'sgs_css_length_value( trim(' in out_nc)
        check('NEG-CTL: EXCLUDE emptied -> nothing classified excluded',
              nc_kinds.count('excluded') == 0)
        check('NEG-CTL: EXCLUDE emptied -> the provenance comment IS renamed',
              'sgs_css_length_value() / sgs_colour_value' in out_nc
              and nc_kinds.count('comment-retained') == 0)
    finally:
        EXCLUDE = saved

    # Prove the restore landed, so the controls above cannot leak into later runs.
    _, recs_r = transform(SELF_TEST_UNITLESS, 'src/blocks/testimonial/render.php')
    check('NEG-CTL restored: exclusion active again',
          [k for _, k, _ in recs_r].count('excluded') == 1)

    # Refusal path: a match that is part of a longer identifier must NOT be renamed.
    weird = "<?php\n$x = my_sgs_css_length_sanitise( $v );\n"
    out_w, recs_w = transform(weird, 'src/blocks/fixture/render.php')
    check('unrecognised match refused, file untouched',
          out_w == weird and [k for _, k, _ in recs_w] == ['unrecognised'])
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()

    if a.self_test:
        fails = self_test()
        print('\n' + ('SELF-TEST FAILED (%d)' % len(fails) if fails
                      else 'self-test: all assertions passed'))
        return 1 if fails else 0

    if a.check:
        tally, _ = scan(quiet=True)
        remaining = tally['call'] + tally['comment']
        if remaining:
            print('FAIL: %d migratable site(s) still on %s()' % (remaining, OLD))
            return 1
        print('PASS: 0 migratable sites remain '
              '(definition=%d, excluded=%d, comment-retained=%d, '
              'bare-mention=%d, unrecognised=%d)'
              % (tally['definition'], tally['excluded'],
                 tally['comment-retained'], tally['bare-mention'],
                 tally['unrecognised']))
        return 1 if tally['unrecognised'] else 0

    apply_changes = bool(a.fix and a.apply)
    tally, changed = scan(apply_changes=apply_changes,
                          dry=bool(a.fix and not a.apply))

    print('')
    for key in ('call', 'comment', 'comment-retained', 'definition',
                'excluded', 'bare-mention', 'unrecognised'):
        print('%-14s %d' % (key + ':', tally[key]))
    print('%-14s %d  (migratable = call + comment)'
          % ('MIGRATABLE:', tally['call'] + tally['comment']))
    print('%-14s %d' % ('files:', len(changed)))
    if a.fix:
        print('\n%d file(s) %s' % (
            len(changed),
            'REWRITTEN' if apply_changes else 'would change (dry run; add --apply)'))
    if tally['unrecognised']:
        print('\nREFUSING to guess on %d unrecognised site(s) above.'
              % tally['unrecognised'])
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
