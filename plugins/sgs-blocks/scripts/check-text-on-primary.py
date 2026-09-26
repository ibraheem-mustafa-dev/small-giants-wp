#!/usr/bin/env python3
"""
check-text-on-primary.py — text on a primary-coloured ground must use the palette's
text-on-primary colour.

A rule that paints `background` or `background-color` with the `primary` preset and
sets `color` from `text-inverse` pairs the wrong tokens: `text-inverse` is text on the
dark text colour, while `primary-text` is the palette's slot for text on `primary`. On a
light brand colour (Mama's Munches pink, #e68a95) text-inverse cream measures 2.4:1.
The accepted form keeps text-inverse only as a fallback:
    color: var(--wp--preset--color--primary-text, var(--wp--preset--color--text-inverse, #fff));

Scans every block stylesheet (style.css / style.scss) and assets/css. Flat rules only
(a SCSS nested rule is read as its own block, which is enough for these files).

Usage:
    python scripts/check-text-on-primary.py           # report
    python scripts/check-text-on-primary.py --check   # exit 1 on any finding
    python scripts/check-text-on-primary.py --self-test
"""
import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PRIMARY_GROUND = re.compile(r'background(?:-color)?\s*:\s*var\(\s*--wp--preset--color--primary\s*[,)]')
BARE_INVERSE = re.compile(r'(?<![\w-])color\s*:\s*var\(\s*--wp--preset--color--text-inverse\b')
RULE = re.compile(r'([^{}]+)\{([^{}]*)\}')


def findings_in(text):
    out = []
    for m in RULE.finditer(text):
        body = m.group(2)
        if PRIMARY_GROUND.search(body) and BARE_INVERSE.search(body):
            selector = m.group(1).strip().splitlines()[-1].strip()
            line = text.count('\n', 0, m.start(2)) + 1
            out.append((line, selector))
    return out


def scan():
    files = sorted(
        glob.glob(os.path.join(ROOT, 'src', 'blocks', '*', 'style.css'))
        + glob.glob(os.path.join(ROOT, 'src', 'blocks', '*', 'style.scss'))
        + glob.glob(os.path.join(ROOT, 'assets', 'css', '*.css'))
    )
    results = []
    for f in files:
        with open(f, encoding='utf-8') as fh:
            for line, sel in findings_in(fh.read()):
                results.append((os.path.relpath(f, ROOT).replace('\\', '/'), line, sel))
    return results


def self_test():
    bad = '.x{background:var(--wp--preset--color--primary);color:var(--wp--preset--color--text-inverse,#fff);}'
    good = '.x{background:var(--wp--preset--color--primary);color:var(--wp--preset--color--primary-text,var(--wp--preset--color--text-inverse,#fff));}'
    other = '.x{background:var(--wp--preset--color--surface);color:var(--wp--preset--color--text-inverse);}'
    ok = len(findings_in(bad)) == 1 and not findings_in(good) and not findings_in(other)
    print('self-test', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main():
    if '--self-test' in sys.argv:
        return self_test()
    results = scan()
    for path, line, sel in results:
        print(f'{path}:{line}  {sel}  text-inverse on a primary ground; use primary-text (text-inverse as its fallback)')
    print(f'[text-on-primary] {len(results)} finding(s).')
    return 1 if results and '--check' in sys.argv else 0


if __name__ == '__main__':
    sys.exit(main())
