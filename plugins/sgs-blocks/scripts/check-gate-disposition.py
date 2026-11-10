#!/usr/bin/env python3
"""Spec 49 gate-disposition completeness check.

`scripts/data/gate-disposition.json` classifies every gate, lint, test, fixture and
derived data file that names code Spec 49 section 8.2 removes or section 6.2 reworks
as reused, changed or deleted. This check fails when a tracked file under the scanned
roots names one of those symbols but has no entry, or names a symbol its entry does not
list, so the list stays complete while Stage A lands.

    python scripts/check-gate-disposition.py --check       # exit 1 on a gap
    python scripts/check-gate-disposition.py --self-test   # proves the check fires on a gap
    python scripts/check-gate-disposition.py --list        # every file that names a symbol

Run from plugins/sgs-blocks. Reads files only; writes nothing.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(HERE)
DATA = os.environ.get('GATE_DISPOSITION_FILE') or os.path.join(HERE, 'data', 'gate-disposition.json')

SCAN_ROOTS = ('scripts', 'tests', '../../scripts', '../../theme/sgs-theme/tests', 'package.json')
SCAN_EXT = {'.py', '.js', '.mjs', '.cjs', '.php', '.sh', '.json', '.yml'}
SKIP_PARTS = {'node_modules', 'vendor', 'data', '__pycache__', 'baselines', 'reports', 'output'}
SKIP_FILES = ('gate-disposition', 'check-gate-disposition', 'tests/fixtures/media/')
DISPOSITIONS = {'reused', 'changed', 'deleted'}
KINDS = {'gate', 'lint', 'test', 'fixture', 'data', 'roster'}
ENTRY_KEYS = {'path', 'kind', 'disposition', 'names', 'package', 'lands', 'reason'}


def norm(path: str) -> str:
    return os.path.normpath(path).replace('\\', '/')


def tracked_files(symbols: list[dict]) -> list[str]:
    """Tracked files under the scan roots that match any symbol pattern (one git grep)."""
    combined = '|'.join('(?:' + s['pattern'] + ')' for s in symbols)
    run = subprocess.run(
        ['git', 'grep', '-l', '-I', '-z', '-P', combined, '--', *SCAN_ROOTS],
        cwd=PLUGIN, capture_output=True,
    )
    if run.returncode not in (0, 1):
        raise SystemExit('git grep failed: ' + run.stderr.decode('utf-8', 'replace'))
    files = []
    for rel in filter(None, run.stdout.decode('utf-8', 'replace').split(chr(0))):
        p = norm(rel)
        if set(p.split('/')) & SKIP_PARTS and p != 'package.json':
            continue
        if os.path.splitext(p)[1] not in SCAN_EXT or any(s in p for s in SKIP_FILES):
            continue
        files.append(p)
    return sorted(set(files))


def load() -> dict:
    with open(DATA, encoding='utf-8') as fh:
        return json.load(fh)


def hits_in(text: str, symbols: list[dict]) -> set[str]:
    return {s['symbol'] for s in symbols if re.search(s['pattern'], text)}


def validate(data: dict) -> list[str]:
    problems = []
    seen = set()
    known = {s['symbol'] for s in data['symbols']}
    for e in data['entries']:
        p = e.get('path', '?')
        if set(e) != ENTRY_KEYS:
            problems.append(f'{p}: entry keys {sorted(e)} are not {sorted(ENTRY_KEYS)}')
            continue
        if p in seen:
            problems.append(f'{p}: two entries')
        seen.add(p)
        if e['disposition'] not in DISPOSITIONS:
            problems.append(f'{p}: disposition {e["disposition"]!r} is not one of {sorted(DISPOSITIONS)}')
        if e['kind'] not in KINDS:
            problems.append(f'{p}: kind {e["kind"]!r} is not one of {sorted(KINDS)}')
        if e['lands'] not in ('A', 'B'):
            problems.append(f'{p}: lands must be A or B')
        if not e['package'] or not e['reason'].strip():
            problems.append(f'{p}: package and reason are required')
        for n in e['names']:
            if n not in known:
                problems.append(f'{p}: names {n!r}, which is not a listed symbol')
    return problems


def gaps(files: dict[str, str], data: dict) -> list[str]:
    """files: path -> text. Returns one message per missing entry or unlisted symbol."""
    by_path = {e['path']: e for e in data['entries']}
    out = []
    for path, text in sorted(files.items()):
        found = hits_in(text, data['symbols'])
        if not found:
            continue
        entry = by_path.get(path)
        if entry is None:
            out.append(f'{path}: names {sorted(found)} but has no entry in gate-disposition.json')
        elif found - set(entry['names']):
            out.append(f'{path}: names {sorted(found - set(entry["names"]))} that its entry does not list')
    return out


def read_all(paths: list[str]) -> dict[str, str]:
    texts = {}
    for p in paths:
        try:
            with open(os.path.join(PLUGIN, p), encoding='utf-8', errors='replace') as fh:
                texts[p] = fh.read()
        except OSError:
            continue
    return texts


def check() -> int:
    data = load()
    problems = validate(data)
    files = read_all(tracked_files(data['symbols']))
    problems += gaps(files, data)
    stale = [e['path'] for e in data['entries'] if e['path'] not in files and not os.path.exists(os.path.join(PLUGIN, e['path']))]
    if problems:
        print(f'gate-disposition: FAIL ({len(problems)})')
        for m in problems:
            print('  ' + m)
        return 1
    note = f'; {len(stale)} entries name files already gone (fine after a Stage B delete)' if stale else ''
    print(f'gate-disposition: OK ({len(data["entries"])} entries, {len(files)} files scanned{note})')
    return 0


def self_test() -> int:
    data = load()
    clean = {'scripts/ok.py': 'print("nothing removed here")'}
    dirty = {'scripts/new-gate.py': 'subprocess.run(["php", "-r", "sgs_render_media();"])'}
    listed = next(e for e in data['entries'] if e['names'])
    ok = True
    if gaps(clean, data):
        print('self-test FAIL: a clean file was flagged'); ok = False
    if not gaps(dirty, data):
        print('self-test FAIL: a file naming sgs_render_media with no entry was not flagged'); ok = False
    # a listed file that gains a symbol its entry lacks
    missing = next((s for s in data['symbols'] if s['symbol'] not in listed['names']), None)
    if missing is not None:
        probe = {listed['path']: _sample(missing)}
        if not gaps(probe, data):
            print('self-test FAIL: a listed file naming an unlisted symbol was not flagged'); ok = False
    broken = json.loads(json.dumps(data))
    broken['entries'][0]['disposition'] = 'maybe'
    if not validate(broken):
        print('self-test FAIL: an invalid disposition was accepted'); ok = False
    if validate(data):
        print('self-test FAIL: the real list does not validate'); ok = False
    print('gate-disposition self-test: ' + ('OK' if ok else 'FAIL'))
    return 0 if ok else 1


def _sample(symbol: dict) -> str:
    """A string the symbol's pattern matches: its first alternative with regex syntax removed."""
    first = symbol['pattern'].split('|')[0]
    return re.sub(r'\\b|\\|\(.*?\)\??|\[.*?\]', '', first).replace('\\.', '.').replace('\\', '')


def main(argv: list[str]) -> int:
    if '--self-test' in argv:
        return self_test()
    if '--list' in argv:
        data = load()
        for p, t in read_all(tracked_files(data['symbols'])).items():
            h = hits_in(t, data['symbols'])
            if h:
                print(p, sorted(h))
        return 0
    if '--check' in argv:
        return check()
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
