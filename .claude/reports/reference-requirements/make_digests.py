"""Builds the compact per-surface digests (digests/digest-*.md) that the family clustering reads.

Run: python make_digests.py   (reads the <reference>.json files next to it; digests/ is git-ignored).
"""
import collections
import glob
import json
import os

B = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(B, 'digests')
os.makedirs(OUT, exist_ok=True)
GROUPS = {
    'A-header-bar-footer': ['header-shell', 'bar', 'footer'],
    'B-panels-trigger': ['dropdown', 'mega', 'trigger-close'],
    'C-drawer': ['drawer'],
}
refs = {}
for f in sorted(glob.glob(os.path.join(B, '*.json'))):
    if os.path.basename(f).startswith('families'):
        continue
    refs[os.path.basename(f)[:-5]] = json.load(open(f, encoding='utf-8'))


def short(v, n=420):
    s = json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    return s if len(s) <= n else s[:n] + '...'


for gname, surfaces in GROUPS.items():
    lines = [f'# Digest {gname}', '',
             'One line per reference, surface, tier and cell: `ref | tier | presence | cell [method] = value`.',
             'Multi-variant references (halcyon, indus-foods) show a cell once when every variant agrees, otherwise per variant.', '']
    for s in surfaces:
        lines += [f'## surface: {s}', '']
        for rn, d in refs.items():
            for tier in (375, 768, 1440):
                rows = [r for r in d['rows'] if r['surface'] == s and r['tier'] == tier]
                if not rows:
                    continue
                if len(rows) > 1 and any(r.get('variant') for r in rows):
                    cellmap = collections.OrderedDict()
                    pres = collections.Counter(r['presence'] for r in rows)
                    for r in rows:
                        for cn, c in r['cells'].items():
                            cellmap.setdefault(cn, collections.OrderedDict()).setdefault(short(c['value']), []).append(r.get('variant'))
                    lines.append(f'{rn} | {tier} | {dict(pres)} (variants: {len(rows)})')
                    for cn, vals in cellmap.items():
                        if len(vals) == 1:
                            lines.append(f'  {cn} (all variants) = {next(iter(vals))}')
                        else:
                            for v, vs in vals.items():
                                lines.append(f'  {cn} ({",".join(x or "-" for x in vs)}) = {v}')
                else:
                    r = rows[0]
                    if not r['cells']:
                        lines.append(f'{rn} | {tier} | {r["presence"]} | NOT CAPTURED')
                        continue
                    lines.append(f'{rn} | {tier} | {r["presence"]}')
                    for cn, c in r['cells'].items():
                        lines.append(f'  {cn} [{c["method"]}] = {short(c["value"])}')
        lines.append('')
    lines += ['## not_measured (all references)', '']
    for rn, d in refs.items():
        for nm in d.get('not_measured', []):
            if nm['surface'] in surfaces:
                lines.append(f'{rn} | {nm["surface"]} {nm["tier"]} | {nm["column"]}: {str(nm["reason"])[:160]}')
    text = '\n'.join(lines)
    with open(os.path.join(OUT, f'digest-{gname}.md'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)
    print(gname, len(text), 'chars')
