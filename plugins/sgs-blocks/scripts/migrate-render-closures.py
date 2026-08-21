#!/usr/bin/env python3
"""Adopt the shared render helpers in place of per-file inline sanitiser closures.

WHAT THIS DOES
    `includes/helpers-box.php` has carried byte-identical shared forms of three
    closures since 2026-07-12 (`cef1fca9`), auto-loaded via `render-helpers.php`.
    Only 4 blocks ever adopted them; ~52 still declare their own copy. This
    completes that migration:

        $sgs_css_length( … )    -> sgs_css_length_sanitise( … )
        $sgs_css_keyword( … )   -> sgs_css_keyword_sanitise( … )
        $sgs_box_shorthand( … ) -> sgs_box_object_shorthand( … )

    Renamed forks are covered too ($sgs_pt_css_length, $sgs_nd_css_keyword, …) —
    every body in each family was verified byte-identical, so this is a
    zero-behaviour-change refactor.

WHAT IT DELIBERATELY DOES NOT DO
    * `$sgs_corner_shorthand` / `$sgs_radius_shorthand` are CORNER-keyed
      (topLeft/topRight/bottomRight/bottomLeft) — structurally a different
      function from sgs_box_object_shorthand()'s top/right/bottom/left. No
      shared helper exists. They are LEFT IN PLACE; only their dependency on
      the deleted length closure is rewritten to call the shared function.
      ⛔ before-after's radius closure is UNTYPED and is called with a raw
      null; routing it through a typed-array helper would fatal the page.
    * It does NOT migrate to the hardened `sgs_css_length_value()`. That has
      four real behaviour deltas (bare "10" becomes a spacing-preset var;
      "-10px" currently loses its sign; calc() currently corrupts; "16px 12px"
      currently loses its space). helpers-css-safety.php's own header calls
      that a separate task. Stacking it here would make both unfalsifiable.

WHY A SCRIPT AND NOT sed
    Several files use ALIGNED assignment ("$sgs_css_keyword  = static function")
    with more than one space. A literal-space find/replace silently skips them —
    which is exactly why the closure count read 45 before it read 52.

    python migrate-render-closures.py --survey | --fix [--apply] | --check | --self-test
"""
import argparse, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCKS = os.path.join(ROOT, 'src', 'blocks', '*', 'render.php')

FAMILIES = {
    'css_length':    ('sgs_css_length_sanitise',   r"return preg_replace\( '/\[\^A-Za-z0-9\.%\]/', '', \(string\) \$value \);"),
    'css_keyword':   ('sgs_css_keyword_sanitise',  r"return preg_replace\( '/\[\^a-zA-Z-\]/', '', \(string\) \$value \);"),
    'box_shorthand': ('sgs_box_object_shorthand',  None),
}
CARVED = re.compile(r'\$sgs[a-z_]*(?:corner_shorthand|radius_shorthand)\s*=\s*static function')
REQUIRE = "require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';"


def defs_in(text, fam):
    """Every closure definition for one family, as (varname, full_text)."""
    out = []
    for m in re.finditer(r'\$(sgs[a-z_]*' + fam + r')\s*=\s*static function', text):
        start = m.start()
        end = text.find('\n};', start)
        if end == -1:
            continue
        out.append((m.group(1), text[start:end + 3]))
    return out


def transform(text):
    """Return (new_text, notes). Pure — no file IO."""
    notes = []
    renamed = {}
    for fam, (shared, _) in FAMILIES.items():
        for var, block in defs_in(text, fam):
            text = text.replace(block + '\n\n', '', 1)
            text = text.replace(block + '\n', '', 1)
            text = text.replace(block, '', 1)
            renamed[var] = shared
            notes.append(f'-closure ${var} -> {shared}()')
    # Rewrite every call site AND any surviving closure's `use` dependency.
    for var, shared in renamed.items():
        text = re.sub(r'use\s*\(\s*\$' + var + r'\s*\)\s*', '', text)
        text = re.sub(r'\$' + var + r'\s*\(', shared + '(', text)
    if renamed and REQUIRE not in text:
        m = re.search(r"^require_once .*?;$", text, re.M)
        if m:
            text = text[:m.end()] + '\n' + REQUIRE + text[m.end():]
        else:
            m = re.search(r"^defined\( 'ABSPATH' \) \|\| exit;$", text, re.M)
            text = text[:m.end()] + '\n\n' + REQUIRE + text[m.end():]
        notes.append('+require render-helpers.php')
    return text, notes


def scan():
    rows = []
    for f in sorted(glob.glob(BLOCKS)):
        t = open(f, encoding='utf-8', errors='ignore').read()
        counts = {fam: len(defs_in(t, fam)) for fam in FAMILIES}
        if not sum(counts.values()):
            continue
        rows.append({
            'file': f, 'block': os.path.basename(os.path.dirname(f)),
            'counts': counts, 'carved': bool(CARVED.search(t)),
            'has_require': REQUIRE in t,
        })
    return rows


SELF_TEST_SRC = """<?php
defined( 'ABSPATH' ) || exit;

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_css_keyword  = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$sgs_corner_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	return $tl;
};

$w = $sgs_css_length( $attributes['w'] ?? '' );
$d = $sgs_css_keyword( $attributes['d'] ?? '' );
"""


def self_test():
    fails = []
    out, notes = transform(SELF_TEST_SRC)

    def check(label, cond):
        print(('  PASS  ' if cond else '  FAIL  ') + label)
        if not cond:
            fails.append(label)

    # ALIGNED assignment ("$sgs_css_keyword  =") must be caught — the whole reason
    # this is a script and not a sed one-liner.
    check('aligned-assignment closure removed', '$sgs_css_keyword  = static function' not in out)
    check('plain closure removed', '$sgs_css_length = static function' not in out)
    check('call sites rewritten (length)', 'sgs_css_length_sanitise( $attributes' in out)
    check('call sites rewritten (keyword)', 'sgs_css_keyword_sanitise( $attributes' in out)
    check('require injected', REQUIRE in out)
    # The carved-out corner closure SURVIVES, but loses its dead `use` clause and
    # calls the shared function instead.
    check('carved-out corner closure survives', '$sgs_corner_shorthand = static function' in out)
    check('dangling use() clause removed', 'use ( $sgs_css_length )' not in out)
    check('corner body calls shared fn', 'sgs_css_length_sanitise( $box[' in out)
    check('no dangling closure var remains', '$sgs_css_length(' not in out)

    # NEGATIVE CONTROL: a file with nothing to migrate must come back untouched,
    # otherwise a "clean" result proves nothing.
    inert = "<?php\ndefined( 'ABSPATH' ) || exit;\n$x = 1;\n"
    same, n2 = transform(inert)
    check('negative control: inert file untouched', same == inert and not n2)
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--only', help='comma-separated block slugs')
    ap.add_argument('--skip', default='', help='comma-separated block slugs to leave alone')
    a = ap.parse_args()

    if a.self_test:
        fails = self_test()
        print(f'\n{"SELF-TEST FAILED" if fails else "self-test: all assertions passed"}')
        return 1 if fails else 0

    rows = scan()
    only = set(a.only.split(',')) if a.only else None
    skip = set(s for s in a.skip.split(',') if s)
    rows = [r for r in rows if (not only or r['block'] in only) and r['block'] not in skip]

    if a.survey or (not a.fix and not a.check):
        tot = {f: 0 for f in FAMILIES}
        print(f'{"block":<22}{"len":>4}{"kwd":>4}{"box":>4}  carved  require')
        for r in rows:
            for f in FAMILIES:
                tot[f] += r['counts'][f]
            print(f'{r["block"]:<22}{r["counts"]["css_length"]:>4}{r["counts"]["css_keyword"]:>4}'
                  f'{r["counts"]["box_shorthand"]:>4}  {"YES" if r["carved"] else "-":<6}  {"ok" if r["has_require"] else "MISSING"}')
        print(f'\n{len(rows)} files | closures: ' + ' '.join(f'{k}={v}' for k, v in tot.items())
              + f' | total={sum(tot.values())}')
        print(f'carved-out entanglement: {sum(1 for r in rows if r["carved"])} files'
              f' | missing require: {sum(1 for r in rows if not r["has_require"])} files')
        return 0

    if a.check:
        if rows:
            print(f'FAIL: {len(rows)} render.php still declare an inline sanitiser closure')
            for r in rows[:10]:
                print(f'   {r["block"]}')
            return 1
        print('PASS: no inline sanitiser closures remain')
        return 0

    changed = 0
    for r in rows:
        t = open(r['file'], encoding='utf-8', errors='ignore').read()
        new, notes = transform(t)
        if new == t:
            continue
        changed += 1
        print(f'{r["block"]:<22} ' + '; '.join(notes))
        if a.apply:
            open(r['file'], 'w', encoding='utf-8', newline='').write(new)
    print(f'\n{changed} file(s) {"REWRITTEN" if a.apply else "would change (dry run; add --apply)"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
