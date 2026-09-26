#!/usr/bin/env python3
"""
check-raw-box-control.py — every 4-side box editor in the inspector is SgsBoxControl.

WordPress core's `<BoxControl>` lays its slider and unlink icon out against the
bottom of the input rather than centred (the defect SgsBoxControl was built to
replace), and it has no spacing-preset dropdown. SgsBoxControl
(`src/components/SgsBoxControl.js`) is the one sanctioned box editor, mounted
directly or inside `ResponsiveOverride` for a tier object; `ResponsiveBoxControl`
forwards to it for the flat-sibling convention. This gate fails on any JSX
`<BoxControl` mount in `src/`.

Usage:
    python scripts/check-raw-box-control.py           # report
    python scripts/check-raw-box-control.py --check   # exit 1 on any finding
    python scripts/check-raw-box-control.py --self-test
"""
import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = re.compile(r'<BoxControl\b')


def findings_in(text):
    return [text.count('\n', 0, m.start()) + 1 for m in RAW.finditer(text)]


def scan():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'src', '**', '*.js'), recursive=True)):
        with open(f, encoding='utf-8') as fh:
            for line in findings_in(fh.read()):
                out.append((os.path.relpath(f, ROOT).replace('\\', '/'), line))
    return out


def self_test():
    ok = (
        findings_in('<BoxControl label="x" />') == [1]
        and not findings_in('<SgsBoxControl label="x" />')
        and not findings_in('<ResponsiveBoxControl values={ v } />')
        and not findings_in('<BoxControlSomething />')
    )
    print('self-test', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main():
    if '--self-test' in sys.argv:
        return self_test()
    results = scan()
    for path, line in results:
        print(f'{path}:{line}  raw <BoxControl>; use SgsBoxControl (inside ResponsiveOverride for a tier object)')
    print(f'[raw-box-control] {len(results)} finding(s).')
    return 1 if results and '--check' in sys.argv else 0


if __name__ == '__main__':
    sys.exit(main())
