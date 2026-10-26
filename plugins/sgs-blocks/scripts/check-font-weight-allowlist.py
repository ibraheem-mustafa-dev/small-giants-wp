#!/usr/bin/env python3
"""Gate: every font-weight a PHP file prints is allowlisted, never stripped or only escaped.

WHAT THIS CLOSES
    A font-weight attribute is free text the cloning route and the editor can both write. Stripping it to
    letters and digits (`preg_replace( '/[^a-z0-9]/i', '', $w )`) turns junk into a different, still-printed
    value ("7;0 0" becomes "700", "heavy" prints `font-weight:heavy`, which the browser drops), and
    `esc_attr()` escapes HTML, not CSS, so "700;color:red" reaches the rule whole. The allowlist is
    `includes/helpers-css-safety.php::sgs_font_weight_value` (a whole number from 1 to 1000, or normal,
    bold, lighter, bolder; anything else is '' and prints nothing).

WHAT COUNTS AS ALLOWLISTED (classify())
    helper       the value goes through sgs_font_weight_value()
    int          the value is an (int) cast, absint(), max() or min() of numbers
    allowlisted  a literal in_array( $var, … ) or preg_match( '…', $var ) guard sits on the emission or
                 within the six lines above it
    strip        a preg_replace() strip (a target)
    escaped      esc_attr() and nothing else (a target)
    unrecognised none of the above: read it and classify it here, never guess

    The value is the emission line's own expression, or, for a bare variable, its last assignment above the
    emission in the same file.

    python check-font-weight-allowlist.py --survey [--json] | --fix | --check | --self-test

--fix prints each target and the shape it takes; the five sites this gate found (2026-10-26) are fixed by
hand in the commit that adds it, as check-style-blob-sanitisation.py did for its one site, because each
site's guard differs (an array push, a returned string, a hover rule).
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCAN = [ROOT / 'includes', ROOT / 'src' / 'blocks']
TARGETS = ('strip', 'escaped', 'unrecognised')

# A weight declaration or custom property anywhere in a string, followed by a concatenated value.
EMIT = re.compile(r"""weight[a-z-]*:['"]\s*\.\s*(?P<expr>[^;]+)""")
BARE_VAR = re.compile(r'^\s*(?:esc_attr\(\s*)?(?:\(\s*string\s*\)\s*)?(\$[A-Za-z_][A-Za-z0-9_]*)')


def strip_comments(text):
    """Blank PHP comments, keeping line numbers (strings are left alone: a weight never sits in one)."""
    text = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S)
    return re.sub(r'(^|\s)(//|#)[^\n]*', lambda m: m.group(1), text)


def judge(expr):
    """The class an expression alone shows, or None."""
    if 'sgs_font_weight_value(' in expr:
        return 'helper'
    if re.search(r'\(\s*int\s*\)|\babsint\(|\bmax\(|\bmin\(', expr):
        return 'int'
    if 'preg_replace(' in expr:
        return 'strip'
    return None


def classify(lines, index):
    """The class of the font-weight emission on lines[index]."""
    expr = EMIT.search(lines[index]).group('expr')
    own = judge(expr)
    if own:
        return own
    var = BARE_VAR.match(expr)
    if var:
        name = re.escape(var.group(1))
        cast = r'(?:\(\s*string\s*\)\s*)?'
        guard = re.compile(r'in_array\(\s*' + cast + name + r'\b|preg_match\(\s*[\'"][^\'"]+[\'"]\s*,\s*' + cast + name + r'\b')
        if any(guard.search(line) for line in lines[max(0, index - 6):index + 1]):
            return 'allowlisted'
        assign = re.compile(name + r'\s*=(?!=)')
        for at in range(index - 1, -1, -1):
            hit = assign.search(lines[at])
            if hit:
                # The whole assignment statement, to its semicolon (a ternary spans lines).
                statement = lines[at][hit.end():]
                for more in lines[at + 1:index]:
                    if ';' in statement:
                        break
                    statement += ' ' + more
                found = judge(statement.split(';')[0])
                if found:
                    return found
                break
    return 'escaped' if 'esc_attr(' in expr else 'unrecognised'


def survey_text(text):
    """[(line number, class, line)] for every font-weight emission in one file's text."""
    lines = strip_comments(text).split('\n')
    return [(i + 1, classify(lines, i), text.split('\n')[i].strip()) for i, line in enumerate(lines) if EMIT.search(line)]


def survey():
    out = []
    for base in SCAN:
        for path in sorted(base.rglob('*.php')):
            for line, cls, src in survey_text(path.read_text(encoding='utf-8', newline='')):
                out.append({'file': path.relative_to(ROOT).as_posix(), 'line': line, 'class': cls, 'source': src})
    return out


def self_test():
    cases = {
        "$d[] = 'font-weight:' . sgs_font_weight_value( $a['w'] );": 'helper',
        "$w = sgs_font_weight_value( $a['w'] );\nif ( '' !== $w ) {\n$d[] = 'font-weight:' . $w;\n}": 'helper',
        "$w = (int) ( $a['w'] ?? 0 );\n$css .= 'font-weight:' . $w;": 'int',
        "$w = max( 700, (int) $x + 200 );\n$css .= 'font-weight:' . $w;": 'int',
        "$w = isset( $a['w'] )\n\t? (int) $a['w']\n\t: $base;\n$css .= 'font-weight:' . esc_attr( (string) $w );": 'int',
        "$w = (string) $a['w'];\nif ( in_array( $w, array( '400', '700' ), true ) ) {\n$d[] = 'font-weight:' . $w;\n}": 'allowlisted',
        "$w = (string) $a['w'];\nif ( preg_match( '/^[1-9]00$/', $w ) ) {\n$d[] = 'font-weight:' . $w;\n}": 'allowlisted',
        "$d[] = 'font-weight:' . preg_replace( '/[^a-z0-9]/i', '', $a['w'] ) . ';';": 'strip',
        "$w = preg_replace( '/[^a-z0-9]/i', '', (string) $a['w'] );\nif ( '' !== (string) $w ) {\n$d[] = 'font-weight:' . $w;\n}": 'strip',
        "$w = $a['w'] ?? '';\nif ( $w ) {\n$d[] = 'font-weight:' . esc_attr( $w );\n}": 'escaped',
        "$w = $a['w'] ?? '';\n$d[] = 'font-weight:' . $w;": 'unrecognised',
        "// $d[] = 'font-weight:' . $w;\n$x = 1;": None,
        "$css .= $sel . '{color:red;font-weight:' . $w . ';}';": 'unrecognised',
        "if ( preg_match( '/^[1-9]00$/', (string) $w ) ) {\n$css .= $sel . '{font-weight:' . $w . '}';\n}": 'allowlisted',
        "$v[] = '--sgs-x-font-weight:' . absint( $a['w'] );": 'int',
    }
    failed = 0
    for text, want in cases.items():
        got = [c for _, c, _ in survey_text(text)]
        expect = [want] if want else []
        if got != expect:
            failed += 1
            print(f'FAIL {text!r}: got {got}, want {expect}')
    print(f'self-test: {len(cases) - failed} of {len(cases)} passed')
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--survey', action='store_true')
    mode.add_argument('--fix', action='store_true')
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--self-test', action='store_true')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    rows = survey()
    targets = [r for r in rows if r['class'] in TARGETS]
    if a.survey:
        if a.json:
            print(json.dumps({'total': len(rows), 'rows': rows}, indent=1))
            return 0
        counts = {}
        for r in rows:
            counts[r['class']] = counts.get(r['class'], 0) + 1
        print(f'{len(rows)} font-weight emissions: ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())))
        for r in rows:
            print(f"  {r['class']:<12} {r['file']}:{r['line']}  {r['source']}")
        return 0
    if a.fix:
        for r in targets:
            print(f"{r['file']}:{r['line']} ({r['class']}): route the value through sgs_font_weight_value() and print nothing when it returns ''\n    {r['source']}")
        return 0
    for r in targets:
        print(f"{r['file']}:{r['line']}: font-weight is {r['class']}, not allowlisted (sgs_font_weight_value)")
    if targets:
        print(f'check-font-weight-allowlist: {len(targets)} emission(s) not allowlisted')
        return 1
    print(f'check-font-weight-allowlist: all {len(rows)} font-weight emissions allowlisted')
    return 0


if __name__ == '__main__':
    sys.exit(main())
