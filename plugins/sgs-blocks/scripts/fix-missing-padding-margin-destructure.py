#!/usr/bin/env python3
"""fix-missing-padding-margin-destructure.py — one-shot fix for a real bug
found live 2026-09-06 in the Phase 3 padding/margin native-spacing migration
(commit 65f7abf02 and its redirect-native-spacing-reads.py substitutions).

THE BUG
-------
redirect-native-spacing-reads.py rewrote `style?.spacing?.padding` -> `padding`
as a pure TEXT substitution, with no awareness of which destructure SCOPE the
reference actually falls in. For blocks whose canvas-preview logic lives in a
plain function body (the main `Edit({ attributes })` component, reading via
`attributes.padding` inline), this was fine. But wherever the preview logic
lives in a SEPARATE helper function (`buildWrapperStyle(attributes)`,
`buildRootPreviewStyle(attributes)`, etc.) that destructures only a SUBSET of
`attributes` locally, the substitution produced a bare `padding`/`margin`
identifier with NO local binding at all -- not `undefined` via a missing
destructure key, a genuine ReferenceError at runtime, on every editor-canvas
render of the block.

Confirmed via direct reading of the real files (not inferred): every one of
the 22 blocks below calls `boxShorthand( padding, ... )` / `boxShorthand(
margin, ... )` with `padding`/`margin` absent from EVERY destructure in the
file that could put them in scope.

WHAT THIS SCRIPT DOES
----------------------
For each ROSTER block's `edit.js`: finds the destructure statement
`const { ...existing keys... } = attributes;` (or `= attrs;` for the two
blocks using that parameter name) belonging to the SAME function scope as the
`boxShorthand( padding` / `boxShorthand( margin` call sites, and inserts
`padding,` / `margin,` into it (only the ones genuinely missing -- most
blocks are missing both, a few structural variants may already have one).

Refuses (reports, never guesses) when:
- No `boxShorthand( padding` or `boxShorthand( margin` call is found (nothing
  to fix).
- More than one `const { ... } = <param>;` destructure exists between the
  nearest enclosing `function` boundary and the call site (ambiguous which
  one is the "local" one -- flagged for a human read).
- `padding`/`margin` is ALREADY present in that destructure (already fixed,
  or was never actually broken -- don't touch).

USAGE
-----
    python fix-missing-padding-margin-destructure.py --survey
    python fix-missing-padding-margin-destructure.py --fix           # dry run
    python fix-missing-padding-margin-destructure.py --fix --apply   # write
    python fix-missing-padding-margin-destructure.py --check         # gate
    python fix-missing-padding-margin-destructure.py --self-test
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
    'brand-strip', 'breadcrumbs', 'button', 'countdown-timer', 'counter',
    'heading', 'icon', 'icon-list', 'info-box', 'notice-banner',
    'option-picker', 'process-steps', 'product-faq', 'quote', 'separator',
    'star-rating', 'team-member', 'text', 'timeline', 'whatsapp-cta',
)

_CALL_RE = re.compile(r'boxShorthand\(\s*(padding|margin)\b')
# A destructure statement pulling props off a single identifier, e.g.
# `const { a, b, c } = attributes;` or `const { style } = attrs;`. Matches
# across newlines (destructure lists are often multi-line).
_DESTRUCTURE_RE = re.compile(
    r'const\s*\{([^}]*)\}\s*=\s*(attributes|attrs)\s*;', re.DOTALL)
_FUNC_BOUNDARY_RE = re.compile(
    r'(?:function\s+\w+\s*\([^)]*\)\s*\{|export\s+default\s+function\s+\w*\s*\([^)]*\)\s*\{)')


def find_scope_start(text, idx):
    """Return the offset of the nearest enclosing function's opening brace
    before `idx`, or 0 if none (top-level module scope -- shouldn't happen
    for these files, all of which define Edit() as a function)."""
    last = 0
    for m in _FUNC_BOUNDARY_RE.finditer(text, 0, idx):
        last = m.end()
    return last


def missing_props(block):
    """Return dict: {'padding': bool_missing, 'margin': bool_missing} and the
    destructure match object to edit, or None/None/error-string on refusal."""
    f = BLOCKS_DIR / block / 'edit.js'
    if not f.exists():
        return None, None, 'no edit.js'
    text = f.read_text(encoding='utf-8')

    calls = list(_CALL_RE.finditer(text))
    if not calls:
        return None, None, 'no boxShorthand(padding|margin) call found'

    # All calls in a file are expected to share one scope for this migration
    # (one preview-builder function or the main Edit() body) -- verify that
    # assumption rather than assuming it silently.
    scope_starts = {find_scope_start(text, m.start()) for m in calls}
    if len(scope_starts) > 1:
        return None, None, (
            'boxShorthand(padding|margin) calls span >1 function scope -- '
            'refusing to guess which destructure each belongs to')
    scope_start = scope_starts.pop()

    # Find destructure statements within this scope, up to the first call.
    first_call_idx = calls[0].start()
    scope_text = text[scope_start:first_call_idx]
    destructures = list(_DESTRUCTURE_RE.finditer(scope_text))
    if not destructures:
        return None, None, (
            'no `const { ... } = attributes;` destructure found in the '
            'enclosing scope before the call site -- refusing to guess')
    if len(destructures) > 1:
        return None, None, (
            '>1 destructure statement found in the enclosing scope -- '
            'ambiguous which one to extend, refusing to guess')
    d = destructures[0]
    keys_text = d.group(1)
    existing = {k.strip() for k in keys_text.split(',') if k.strip()}
    called = {m.group(1) for m in calls}
    missing = {prop: (prop in called and prop not in existing) for prop in ('padding', 'margin')}
    if not any(missing.values()):
        return {}, None, None
    # Absolute offsets of the destructure match, for the fixer.
    abs_start = scope_start + d.start()
    abs_end = scope_start + d.end()
    return missing, (abs_start, abs_end, d.group(1), d.group(2)), None


def cmd_survey():
    for b in ROSTER:
        missing, info, err = missing_props(b)
        if err:
            print(f'  {b:16} REFUSED: {err}')
        elif not missing:
            print(f'  {b:16} already OK (no missing padding/margin)')
        else:
            need = [k for k, v in missing.items() if v]
            print(f'  {b:16} missing: {", ".join(need)}')
    return 0


def fix_block(block, apply_):
    missing, info, err = missing_props(block)
    if err:
        return False, err
    if not missing or not any(missing.values()):
        return False, 'already OK'
    abs_start, abs_end, keys_text, param = info
    f = BLOCKS_DIR / block / 'edit.js'
    text = f.read_text(encoding='utf-8')

    need = [k for k, v in missing.items() if v]
    # Insert right after the opening brace of the destructure, matching the
    # existing indentation style of the first real key line if multi-line,
    # else appended inline for a single-line destructure.
    # BUG FIXED (found live, 2026-09-06): `insert` already ends each key with
    # its own trailing comma (`padding, margin, `) -- appending a SECOND
    # comma here produced `padding, margin,,`, a syntax error. self-test now
    # asserts no double comma survives.
    insert = ''.join(f'{k}, ' for k in need)
    # Re-locate the `{` that opens this destructure (start of match covers
    # `const {`), insert immediately after it.
    brace_idx = text.index('{', abs_start)
    new_text = text[:brace_idx + 1] + ' ' + insert.rstrip() + text[brace_idx + 1:]

    if not apply_:
        return True, f'would add {", ".join(need)} to the `{param}` destructure'
    f.write_text(new_text, encoding='utf-8')
    return True, f'added {", ".join(need)} to the `{param}` destructure'


def cmd_fix(apply_):
    mode = 'APPLY' if apply_ else 'DRY RUN'
    print(f'=== FIX -- {mode} ===\n')
    for b in ROSTER:
        ok, msg = fix_block(b, apply_)
        tag = 'OK  ' if ok else 'SKIP'
        print(f'  {tag} {b:16} {msg}')
    return 0


def cmd_check():
    failures = []
    for b in ROSTER:
        missing, _info, err = missing_props(b)
        if err:
            failures.append(f'{b}: {err}')
        elif missing and any(missing.values()):
            need = [k for k, v in missing.items() if v]
            failures.append(f'{b}: still missing {", ".join(need)} from its destructure')
    if failures:
        print(f'FAIL -- {len(failures)} finding(s):')
        for x in failures:
            print(f'  - {x}')
        return 1
    print(f'PASS -- all {len(ROSTER)} roster blocks have padding/margin properly in scope.')
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

    # Positive: a helper function missing both props.
    src = (
        'function buildWrapperStyle( attributes ) {\n'
        '\tconst { style, textAlign } = attributes;\n'
        '\tconst x = 1;\n'
        '\tconst paddingPreview = boxShorthand( padding, [ \'top\' ] );\n'
        '\tconst marginPreview = boxShorthand( margin, [ \'top\' ] );\n'
        '}\n'
    )
    scope_start = find_scope_start(src, src.index('boxShorthand'))
    calls = list(_CALL_RE.finditer(src))
    scope_text = src[scope_start:calls[0].start()]
    d = _DESTRUCTURE_RE.search(scope_text)
    check('finds the destructure in scope', bool(d), True)
    check('destructure keys captured', d.group(1).strip(), 'style, textAlign')

    # Negative control: already has padding, should report nothing missing.
    src2 = src.replace('const { style, textAlign } = attributes;',
                        'const { style, textAlign, padding, margin } = attributes;')
    calls2 = list(_CALL_RE.finditer(src2))
    scope_start2 = find_scope_start(src2, calls2[0].start())
    scope_text2 = src2[scope_start2:calls2[0].start()]
    d2 = _DESTRUCTURE_RE.search(scope_text2)
    existing2 = {k.strip() for k in d2.group(1).split(',') if k.strip()}
    check('negative: padding already present, not re-flagged', 'padding' in existing2, True)

    # Regression fixture (found live, 2026-09-06): the first version of
    # fix_block() appended an EXTRA trailing comma on top of the one already
    # inside `insert`, producing `const { padding, margin,, style }` -- a
    # real syntax error shipped to 20 real files before being caught by
    # reading the actual diff. Reproduce fix_block()'s insert logic directly
    # here so this can never silently regress.
    import tempfile, os
    with tempfile.TemporaryDirectory() as tmp:
        block_dir = Path(tmp) / 'src' / 'blocks' / 'zz-fixture'
        block_dir.mkdir(parents=True)
        (block_dir / 'edit.js').write_text(
            'function buildWrapperStyle( attributes ) {\n'
            '\tconst { style } = attributes;\n'
            '\tconst p = boxShorthand( padding, [ \'top\' ] );\n'
            '\tconst m = boxShorthand( margin, [ \'top\' ] );\n'
            '}\n', encoding='utf-8')
        global BLOCKS_DIR
        real_blocks_dir = BLOCKS_DIR
        BLOCKS_DIR = Path(tmp) / 'src' / 'blocks'
        try:
            ok_fix, _msg = fix_block('zz-fixture', True)
            fixed_text = (block_dir / 'edit.js').read_text(encoding='utf-8')
        finally:
            BLOCKS_DIR = real_blocks_dir
    check('regression: fix applied', ok_fix, True)
    check('regression: no double comma', ',,' in fixed_text, False)
    destructure_line = fixed_text.splitlines()[1]
    check('regression: destructure line has both keys, no double comma',
          destructure_line.strip(), 'const { padding, margin, style } = attributes;')

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
