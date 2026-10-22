#!/usr/bin/env python3
"""Gate: every setting listed in effect-settings.json carries a complete sgs.meaning.

effect-settings.json is an array of { "block": "sgs/x", "attr": "y", "effect": "<id>" }.
Each listed attribute in src/blocks/<slug>/block.json needs an `sgs.meaning` object with
`what` (string), `trigger` (string) and `parameters` (object of name -> { "unit": ... }).

Usage:
    python check-setting-meanings.py --check [--settings PATH] [--blocks-dir DIR]
    python check-setting-meanings.py --report [--settings PATH] [--blocks-dir DIR]
    python check-setting-meanings.py --self-test

Standard library only; reads no framework DB.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
DEFAULT_SETTINGS = REPO / 'scripts' / 'computed-route' / 'data' / 'effect-settings.json'
DEFAULT_BLOCKS = HERE.parent / 'src' / 'blocks'
FIXTURES = HERE / 'fixtures' / 'setting-meanings'
STRING_KEYS = ('what', 'trigger')


def load_json(path):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def judge(entry, blocks_dir):
    """Return (status, detail) for one listed setting; status 'ok' means complete."""
    block, attr = entry.get('block', ''), entry.get('attr', '')
    if not isinstance(block, str) or not block.startswith('sgs/') or not attr:
        return 'invalid entry', 'needs "block" (sgs/<slug>) and "attr"'
    block_json = blocks_dir / block.split('/', 1)[1] / 'block.json'
    if not block_json.is_file():
        return 'missing block', 'no block.json for %s' % block
    data = load_json(block_json)
    attrs = data.get('attributes', {})
    if attr not in attrs:
        return 'missing attribute', 'attribute not declared in %s' % block
    meaning = (attrs[attr].get('sgs') or {}).get('meaning')
    if not isinstance(meaning, dict):
        return 'no meaning', 'no sgs.meaning object'
    problems = [k for k in STRING_KEYS if not isinstance(meaning.get(k), str) or not meaning[k].strip()]
    params = meaning.get('parameters')
    if not isinstance(params, dict):
        problems.append('parameters')
    else:
        for name, spec in params.items():
            if not isinstance(spec, dict) or 'unit' not in spec:
                problems.append('parameters.%s.unit' % name)
    if problems:
        return 'incomplete meaning', 'missing or invalid: ' + ', '.join(problems)
    return 'ok', ''


def run(settings_path, blocks_dir, report):
    """Return (exit code, output lines)."""
    if not Path(settings_path).is_file():
        return 0, ['check-setting-meanings: no effect-settings.json yet (%s); nothing to check' % settings_path]
    entries = load_json(settings_path)
    if not isinstance(entries, list):
        return 1, ['check-setting-meanings: effect-settings.json must be an array']
    rows = [(e, *judge(e, Path(blocks_dir))) for e in entries]
    failures = [r for r in rows if r[1] != 'ok']
    lines = []
    if report:
        lines.append('%-28s %-24s %-20s %s' % ('block', 'attr', 'effect', 'status'))
        for e, status, _detail in rows:
            lines.append('%-28s %-24s %-20s %s' % (e.get('block'), e.get('attr'), e.get('effect'), status))
    for e, status, detail in failures:
        lines.append('FAIL %s.%s (%s): %s - %s' % (e.get('block'), e.get('attr'), e.get('effect'), status, detail))
    lines.append('check-setting-meanings: %d of %d listed settings lack a complete sgs.meaning' % (len(failures), len(rows)))
    return (1 if failures else 0), lines


def self_test():
    expect = {'negative': 1, 'positive': 0, 'missing-block': 1}
    fails = []
    for name, code in expect.items():
        d = FIXTURES / name
        got = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--check',
                              '--settings', str(d / 'effect-settings.json'),
                              '--blocks-dir', str(d / 'blocks')],
                             capture_output=True, text=True)
        ok = got.returncode == code
        print('%s fixture %s: exit %d (expected %d)' % ('ok  ' if ok else 'FAIL', name, got.returncode, code))
        if not ok:
            fails.append(name)
    absent = run(FIXTURES / 'absent.json', DEFAULT_BLOCKS, False)[0]
    print('%s absent settings file exits 0' % ('ok  ' if absent == 0 else 'FAIL'))
    if absent != 0:
        fails.append('absent settings file')
    print('self-test: all assertions passed' if not fails else 'SELF-TEST FAILED (%d)' % len(fails))
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--report', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--settings', default=str(DEFAULT_SETTINGS))
    ap.add_argument('--blocks-dir', default=str(DEFAULT_BLOCKS))
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not (args.check or args.report):
        ap.error('pass --check, --report or --self-test')
    code, lines = run(args.settings, args.blocks_dir, args.report)
    print('\n'.join(lines))
    return code if args.check else 0


if __name__ == '__main__':
    sys.exit(main())
