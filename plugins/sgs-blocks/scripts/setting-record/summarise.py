"""The library report: every block's check report (<block>.check.json, written by check.py --out DIR) read into one
table and sorted into buckets by cause, so each cause is settled once for every block it touches.

Usage: python summarise.py REPORTS_DIR [--json OUT.json]

Buckets, each with the blocks it touches and how many entries or settings it holds:
  coverage        the default render is empty or lacks the block root, or a setting's every render failed (the
                  coverage floor: such a block tests nothing, check.py::check_block fails it)
  renderErrors    failed renders, grouped by the first line of the runner's error
  noPaintButPlaced  settings that painted nothing although the scanner finds CSS written from them (a partner the
                  fixture leaves off, content it lacks, or a fault)
  unvalued        settings the generator could not value, grouped by reason
  declaredNotPrinted   parts block.json declares that the default render does not print (a stand-in the fixture lacks,
                  or a block fault for Task 5)
  printedNotDeclared   parts the render prints that block.json never declares (a block fault for Task 5)
  blind           proof entries left unproven, by cause and by the evidence's leading words
  removed         proof removals, by the evidence's leading words (each kind is sampled against the code)
  deadParts       classes no source prints (block faults for Task 5)
  partNotNamed    placements whose part the selector reader cannot name
  crashed         blocks whose check raised (the line check.py printed)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path


def lead(text, words: int = 9) -> str:
    """The first words of an evidence text, numbers and quoted names blanked, so like causes group together."""
    t = text if isinstance(text, str) else json.dumps(text)[:200]
    t = re.sub(r'`[^`]*`|"[^"]*"|\d+(\.\d+)?(px|s|ms|%)?', '_', t)
    return ' '.join(t.split()[:words])


def summarise(reports: Path) -> dict:
    blocks, buckets = {}, defaultdict(lambda: defaultdict(lambda: {'blocks': set(), 'n': 0}))

    def add(bucket, key, block, n=1):
        b = buckets[bucket][key]
        b['blocks'].add(block)
        b['n'] += n

    for f in sorted(reports.glob('*.check.json')):
        r = json.loads(f.read_text(encoding='utf-8'))
        name = r.get('block') or f.name.split('.')[0]
        proof = r.get('proof') or {}
        counts = proof.get('counts') or {}
        parts = r.get('parts') or {}
        row = {'entries': r.get('entries'), 'instances': r.get('instances'), 'failed': r.get('failed'),
               'testedNoPaint': len(r.get('testedNoPaint') or []), 'replacesBlock': len(r.get('replacesBlock') or []),
               'unvalued': len(r.get('unvalued') or []), 'coverageFloor': r.get('coverageFloor') or [],
               'proved': counts.get('proved'), 'removed': counts.get('removed'), 'refiled': counts.get('refiled'),
               'blind': counts.get('blind'), 'byCause': counts.get('byCause') or {}, 'seconds': r.get('secondsTotal')}
        blocks[name] = row
        for c in row['coverageFloor']:
            add('coverage', lead(c, 6), name)
        for e in r.get('errors') or []:
            add('renderErrors', lead(e.splitlines()[0] if e else '', 12), name)
        for a in r.get('noPaintButPlaced') or []:
            add('noPaintButPlaced', 'paints nothing here, though the scanner finds CSS written from it', name)
        for u in r.get('unvalued') or []:
            add('unvalued', lead(u.get('why', ''), 10), name)
        for p in parts.get('declaredNotPrinted') or []:
            add('declaredNotPrinted', 'declared, not printed', name)
        for p in parts.get('printedNotDeclared') or []:
            add('printedNotDeclared', 'printed, not declared', name)
        for e in r.get('partNotNamed') or []:
            add('partNotNamed', 'part not named', name)
        for e in proof.get('blind') or []:
            add('blind', f"{e.get('cause') or e.get('unproved') or '?'}: {lead(e.get('evidence', ''))}", name)
        for e in proof.get('removed') or []:
            add('removed', lead(e.get('evidence', '')), name)
        for d in proof.get('deadParts') or []:
            add('deadParts', d.get('part', '?') if isinstance(d, dict) else str(d), name, (d.get('entries') or 1) if isinstance(d, dict) else 1)
    crashed = {}
    log = reports.parent / (reports.name.replace('reports', 'pass') + '.log')
    if log.is_file():
        for line in log.read_text(encoding='utf-8', errors='replace').splitlines():
            if line.startswith('{') and '"crashed"' in line:
                d = json.loads(line)
                crashed[d['block']] = d['crashed']
    out = {'blocks': blocks, 'crashed': crashed,
           'buckets': {b: sorted(({'key': k, 'n': v['n'], 'blocks': sorted(v['blocks'])} for k, v in keys.items()), key=lambda x: -x['n'])
                       for b, keys in buckets.items()},
           'totals': dict(Counter({k: sum((r.get(k) or 0) for r in blocks.values() if isinstance(r.get(k), int))
                                   for k in ('entries', 'proved', 'removed', 'refiled', 'blind', 'testedNoPaint', 'replacesBlock', 'unvalued', 'failed')}))}
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('reports', type=Path)
    ap.add_argument('--json', type=Path)
    args = ap.parse_args(argv)
    s = summarise(args.reports)
    print(f"{len(s['blocks'])} blocks; totals {s['totals']}; crashed {len(s['crashed'])}")
    for name, why in s['crashed'].items():
        print(f'  crashed {name}: {why[:160]}')
    for bucket, rows in s['buckets'].items():
        print(f'\n{bucket} ({sum(r["n"] for r in rows)} across {len({b for r in rows for b in r["blocks"]})} blocks)')
        for r in rows[:15]:
            shown = ', '.join(x.split('/')[-1] for x in r['blocks'][:8]) + (' ...' if len(r['blocks']) > 8 else '')
            print(f'  {r["n"]:5}  {r["key"][:90]}  [{shown}]')
    if args.json:
        args.json.write_text(json.dumps(s, indent=1), encoding='utf-8')
    return 0


if __name__ == '__main__':
    sys.exit(main())
