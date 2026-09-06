#!/usr/bin/env python3
"""Delete the vacuous `function_exists( 'wp_style_engine_get_styles' )` guard.

WHY IT IS VACUOUS
    wp_style_engine_get_styles() shipped in WordPress 6.1. Both this plugin
    (sgs-blocks.php: "Requires at least: 6.7") and the theme (style.css, same)
    declare a floor SIX minor versions later. The guard therefore tests for a
    function its own declared minimum guarantees is present — its false branch
    has never been reachable on any supported install.

    That makes removal a no-behaviour-change edit BY CONSTRUCTION, not by
    measurement: there is no input on which the deleted branch could have run.

WHAT IT REWRITES — TWO DISTINCT SHAPES, DO NOT CONFLATE THEM

    A. STANDALONE guard (the common case). The whole `if` wrapper goes and its
       body de-indents one tab:

           if ( function_exists( 'wp_style_engine_get_styles' ) ) {
               $args = array();
               …
           }
       becomes
           $args = array();
           …

    B. COMPOUND guard, where the vacuous call is ANDed with a REAL condition.
       Deleting the wrapper here would change behaviour — the real condition
       must survive. Only the dead conjunct is removed:

           if ( function_exists( … ) && ! empty( $base_margin_obj ) ) {
       becomes
           if ( ! empty( $base_margin_obj ) ) {

       …and for a multi-line condition, the `&& function_exists( … )` line is
       dropped on its own.

    Both shapes were enumerated before this script was written: 64 standalone
    (every one at indent 0, every one closing on a bare `}`, ZERO carrying an
    `else`) and 9 compound, across 63 files. A guard with an `else` would make
    the false branch load-bearing; the script REFUSES to touch one if it ever
    appears, rather than assuming the survey still holds.

WHAT IT DELIBERATELY DOES NOT DO
    * It does not touch `function_exists( 'wp_interactivity_data_wp_context' )`
      or `function_exists( 'wp_enqueue_script_module' )`. Both are also below
      the 6.7 floor and therefore also vacuous, but they are a separate family
      and a separate commit — two overlapping changes in one commit are
      unfalsifiable.
    * It does not reformat, re-align or otherwise tidy anything it did not
      un-indent. phpcbf rewrites whole files and turns a scoped change into an
      unreviewable diff.

    python remove-vacuous-style-engine-guard.py --survey | --fix [--apply] | --check | --self-test
"""
import argparse, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCKS = os.path.join(ROOT, 'src', 'blocks', '*', 'render.php')

FN = "function_exists( 'wp_style_engine_get_styles' )"

def _plugin_floor():
    """Read "Requires at least" from the plugin header.

    Deliberately PARSED, never hardcoded. This whole gate's claim is "the floor
    guarantees these functions exist" - so if the floor is ever LOWERED (a client
    stuck on 6.5, say), a hardcoded constant would keep asserting three guards are
    vacuous when they had become load-bearing, AND would fail the build for
    reintroducing a correct guard. Reading it makes the gate self-correcting.
    """
    header = os.path.join(ROOT, 'sgs-blocks.php')
    try:
        with open(header, encoding='utf-8', errors='ignore') as fh:
            m = re.search(r'Requires at least:\s*([0-9.]+)', fh.read(8192))
        if m:
            return m.group(1)
    except OSError:
        pass
    return None


def _below_floor(since, floor):
    """True when `since` is strictly older than `floor` (so the guard is vacuous)."""
    def parts(v):
        return [int(x) for x in v.split('.')]
    return parts(since) < parts(floor)

# Core functions guarded somewhere in this tree, with the @since read from the
# WordPress core source (NOT from memory - each was confirmed against
# WordPress/wordpress-develop, tracing the @since block to its owning function
# rather than trusting document order).
#
# --fix only ever rewrites wp_style_engine_get_styles: the other two appeared in
# five DIFFERENT shapes across ten sites (ternary-with-fallback, leading /
# middle conjunct, standalone if, and a NEGATED early-return using a namespaced
# `\function_exists`). A codemod for four one-off shapes would be more code than
# the edit and needs paren-matching a regex gets wrong, so those were migrated by
# hand. --check still gates all three, which is the half that prevents a
# regression.
VACUOUS_GUARDS = {
    'wp_style_engine_get_styles':      '6.1',
    'wp_interactivity_data_wp_context': '6.5',
    'wp_enqueue_script_module':         '6.5',
}
# Namespaced files write `\function_exists`; match both spellings.
GUARD_ANY = re.compile(
    r'\\?function_exists\(\s*.(' + '|'.join(VACUOUS_GUARDS) + r').\s*\)'
)
STANDALONE = re.compile(r"^(\t*)if \( " + re.escape(FN) + r" \) \{\s*$")
# Compound forms: the dead conjunct sits before or after a real condition.
LEADING = re.compile(r"\( " + re.escape(FN) + r" && ")
TRAILING = re.compile(r" && " + re.escape(FN) + r" \)")
OWN_LINE = re.compile(r"^\t*&& " + re.escape(FN) + r"\s*$")


def close_of(lines, i):
    """Index of the line closing the block opened on line i, or None."""
    depth = 0
    for j in range(i, len(lines)):
        depth += lines[j].count('{') - lines[j].count('}')
        if depth == 0 and j > i:
            return j
    return None


def transform(text):
    """Return (new_text, notes). Pure — no file IO."""
    notes, lines = [], text.split('\n')
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        if FN not in ln:
            out.append(ln); i += 1; continue

        m = STANDALONE.match(ln)
        if m:
            close = close_of(lines, i)
            if close is None:
                notes.append('SKIP: unmatched brace'); out.append(ln); i += 1; continue
            indent = m.group(1)
            # An `else` makes the dead branch load-bearing — refuse, do not guess.
            # NOTE: `} else {` is brace-NEUTRAL, so depth never returns to 0 on it
            # and close_of() sails past to the final `}`. Detect the early close
            # structurally instead: any line inside the body sitting at the guard's
            # OWN indent and starting with `}` means the if-block ended there
            # (else / elseif), and the body we are about to lift is not the whole
            # story. Checking lines[close] for the word "else" does NOT work.
            if any(b.startswith(indent + '}') for b in lines[i + 1:close]):
                notes.append('SKIP: guard has an else branch'); out.append(ln); i += 1; continue
            # Leave a BLANK LINE where the `if` line stood, when it followed a
            # statement. That line was acting as a visual separator: delete it
            # outright and the statement above becomes adjacent to the de-indented
            # first body line, so phpcs's MultipleStatementAlignment sniff merges
            # them into ONE alignment group and reports a warning HEAD did not have
            # (caught on accordion, where `$responsive_css` and `$style_engine_args`
            # collided). A blank line keeps the groups apart and the structure
            # readable. The fix for a merged group is a blank line, NEVER phpcbf —
            # that realigns whole files and turns a scoped change into a huge diff.
            if out and out[-1].strip():
                out.append('')
            for body in lines[i + 1:close]:
                # De-indent exactly one level; leave blank lines untouched.
                out.append(body[1:] if body.startswith(indent + '\t') else body)
            notes.append('-standalone guard')
            i = close + 1
            continue

        if OWN_LINE.match(ln):
            notes.append('-dead conjunct (own line)'); i += 1; continue

        new = LEADING.sub('( ', ln)
        new = TRAILING.sub(' )', new)
        if new != ln:
            notes.append('-dead conjunct (inline)'); out.append(new); i += 1; continue

        notes.append('SKIP: unrecognised guard form')
        out.append(ln); i += 1
    return '\n'.join(out), notes


def scan():
    rows = []
    for f in sorted(glob.glob(BLOCKS)):
        t = open(f, encoding='utf-8', errors='ignore').read()
        n = t.count(FN)
        if n:
            rows.append({'file': f, 'block': os.path.basename(os.path.dirname(f)), 'n': n})
    return rows


SELF_TEST_SRC = """<?php
defined( 'ABSPATH' ) || exit;

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$args = array();
	if ( isset( $attributes['x'] ) ) {
		$args['x'] = 1;
	}
	$out = wp_style_engine_get_styles( $args );
}

if ( function_exists( 'wp_style_engine_get_styles' ) && ! empty( $base_margin_obj ) ) {
	$m = 1;
}

if ( ! $inherit_style && function_exists( 'wp_style_engine_get_styles' ) ) {
	$q = 2;
}

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$keep = 1;
} else {
	$keep = 2;
}

if ( function_exists( 'wp_enqueue_script_module' ) ) {
	$untouched = 1;
}

$responsive_css = '';
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$style_engine_args = array();
}
"""


def self_test():
    fails = []
    out, notes = transform(SELF_TEST_SRC)

    def check(label, cond):
        print(('  PASS  ' if cond else '  FAIL  ') + label)
        if not cond:
            fails.append(label)

    check('standalone guard removed', 'if ( ' + FN + ' ) {\n\t$args' not in out)
    check('body de-indented one level', '\n$args = array();' in out)
    # The whole body shifts left by exactly one tab, so RELATIVE nesting is
    # preserved: the nested `if` lands at 0 and its own body at 1.
    check('nested block de-indented to 0', "\nif ( isset( $attributes['x'] ) ) {" in out)
    check('nested inner line de-indented to 1 (relative nesting kept)',
          "\n\t$args['x'] = 1;" in out)
    check('compound: leading conjunct dropped, real cond kept',
          'if ( ! empty( $base_margin_obj ) ) {' in out)
    check('compound: trailing conjunct dropped, real cond kept',
          'if ( ! $inherit_style ) {' in out)
    # An else makes the false branch load-bearing — it MUST survive untouched.
    check('guard WITH else refused', 'if ( ' + FN + ' ) {\n\t$keep = 1;\n} else {' in out)
    check('refusal was reported', any('else branch' in n for n in notes))
    check('unrelated function_exists untouched',
          "if ( function_exists( 'wp_enqueue_script_module' ) ) {\n\t$untouched = 1;\n}" in out)
    check('no guard text left except the refused one', out.count(FN) == 1)
    check('brace balance preserved', out.count('{') == out.count('}'))
    # Guard directly after a statement -> blank line kept, so phpcs does not merge
    # the two into one alignment group (the accordion regression).
    check('blank line inserted where guard followed a statement',
          "$responsive_css = '';\n\n$style_engine_args = array();" in out)
    # ...but no DOUBLE blank when the guard already had one above it.
    check('no double blank line when one already existed', '\n\n\n' not in out)

    # NEGATIVE CONTROL: a file with nothing to change must come back byte-identical,
    # otherwise a "clean" result on a real file proves nothing.
    inert = "<?php\ndefined( 'ABSPATH' ) || exit;\n$x = 1;\n"
    same, n2 = transform(inert)
    check('negative control: inert file untouched', same == inert and not n2)

    # ---- The --check gate's own logic (added after a QC review, 2026-08-21) ----
    # The floor must be READ, not assumed, or a lowered floor silently turns this
    # gate into a false claim. Version comparison is numeric, not lexicographic:
    # '6.10' > '6.9' is FALSE as strings, which would misjudge a future floor.
    check('floor: 6.1 is below 6.7 (vacuous)', _below_floor('6.1', '6.7'))
    check('floor: 6.5 is below 6.7 (vacuous)', _below_floor('6.5', '6.7'))
    check('floor: 7.0 is NOT below 6.7 (load-bearing)', not _below_floor('7.0', '6.7'))
    check('floor: equal version is NOT below (load-bearing)', not _below_floor('6.7', '6.7'))
    check('floor: 6.9 is below 6.10 numerically, not lexicographically',
          _below_floor('6.9', '6.10'))
    check('floor: parsed from the real plugin header', _plugin_floor() is not None)

    # The exemption for polyfill DEFINITIONS must not swallow a real call guard -
    # especially the negated `if ( ! function_exists(…) ) { return; }` shape, which
    # is the one that most resembles a polyfill.
    poly = re.compile(r'\s*\)\s*\{\s*(?://[^\n]*\n\s*)*function\s')
    check('polyfill definition is exempt', bool(poly.match(" ) {\n\tfunction wp_x( $a ) {")))
    check('negated early-return is NOT exempt (no overmatch)',
          not poly.match(" ) ) { return; }"))
    check('plain call guard is NOT exempt (no overmatch)',
          not poly.match(" ) ) {\n\t$args = array();"))
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--only', help='comma-separated block slugs')
    a = ap.parse_args()

    if a.self_test:
        fails = self_test()
        print(f'\n{"SELF-TEST FAILED" if fails else "self-test: all assertions passed"}')
        return 1 if fails else 0

    rows = scan()
    if a.only:
        only = set(a.only.split(','))
        rows = [r for r in rows if r['block'] in only]

    if a.survey or (not a.fix and not a.check):
        for r in rows:
            print(f'{r["block"]:<26}{r["n"]:>3}')
        print(f'\n{len(rows)} files | {sum(r["n"] for r in rows)} vacuous guard(s)')
        return 0

    if a.check:
        # Gate ALL THREE vacuous families, across src/ AND includes/. Scoping this
        # to src/blocks/*/render.php is exactly how the first count of the two
        # sibling families came in at 4 and 3 when the real figures were 5 and 5 -
        # every missed site lived in includes/.
        floor = _plugin_floor()
        if not floor:
            print('FAIL: could not read "Requires at least" from sgs-blocks.php - '
                  'the floor is what makes a guard vacuous, so this gate cannot judge without it.')
            return 1

        # Only the families genuinely BELOW the current floor are vacuous. If the
        # floor is ever lowered, the affected family drops out of the gate on its
        # own rather than the gate asserting a stale claim.
        live = {fn: since for fn, since in VACUOUS_GUARDS.items() if _below_floor(since, floor)}
        skipped = {fn: s for fn, s in VACUOUS_GUARDS.items() if fn not in live}
        for fn, since in skipped.items():
            print(f'NOTE: {fn}() is @since {since}, NOT below the {floor} floor - '
                  f'its guard is load-bearing and is NOT gated.')
        if not live:
            print(f'PASS: no family is below the {floor} floor; nothing to gate.')
            return 0
        guard_re = re.compile(r'\\?function_exists\(\s*.(' + '|'.join(live) + r').\s*\)')

        # Scan the plugin AND the theme. The theme declares the same floor and is a
        # legitimate style-engine consumer, so a guard introduced there would
        # otherwise pass this gate silently.
        theme = os.path.join(os.path.dirname(os.path.dirname(ROOT)), 'theme', 'sgs-theme')
        roots = [os.path.join(ROOT, 'src'), os.path.join(ROOT, 'includes'), theme]
        found = []
        for base in roots:
            for path in sorted(glob.glob(os.path.join(base, '**', '*.php'), recursive=True)):
                text = open(path, encoding='utf-8', errors='ignore').read()
                for m in guard_re.finditer(text):
                    line_no = text[:m.start()].count('\n') + 1
                    # A POLYFILL definition (`if ( ! function_exists(…) ) { function …`)
                    # is correct code, not a vacuous call guard - never flag one.
                    tail = text[m.end():m.end() + 200]
                    if re.match(r'\s*\)\s*\{\s*(?://[^\n]*\n\s*)*function\s', tail):
                        continue
                    found.append((os.path.relpath(path, ROOT).replace('\\', '/'), line_no, m.group(1)))
        if found:
            print(f'FAIL: {len(found)} vacuous core-function guard(s) - the plugin declares '
                  f'"Requires at least: {floor}", so each tests for a function already guaranteed:')
            for path, line, fn in found[:15]:
                print(f'   {path}:{line}  {fn}()  @since {VACUOUS_GUARDS[fn]}')
            if len(found) > 15:
                print(f'   ... and {len(found) - 15} more')
            return 1
        print(f'PASS: no vacuous core-function guards remain '
              f'({len(live)} famil{"y" if len(live) == 1 else "ies"} checked against the {floor} floor, '
              f'plugin src/ + includes/ + theme)')
        return 0

    changed = 0
    for r in rows:
        t = open(r['file'], encoding='utf-8', errors='ignore').read()
        new, notes = transform(t)
        if new == t:
            continue
        changed += 1
        print(f'{r["block"]:<26} ' + '; '.join(notes))
        if a.apply:
            open(r['file'], 'w', encoding='utf-8', newline='').write(new)
    print(f'\n{changed} file(s) {"REWRITTEN" if a.apply else "would change (dry run; add --apply)"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
