#!/usr/bin/env python3
"""Each fixtures.json entry holds the plain block in `attributes` (what a new node renders, plus the stand-ins it needs to
render offline at all: a product id, review data, a menu reference, image frames) and, in `checkAttributes`, what the
record check adds to test a part's settings (a label shown, a background image set, a content width). The check renders
both (instances.py::check_fixture); the site look draws `attributes` alone (site-look/site_look.py), so a part only the
check switches on is never taken for the block's default look.

    python split_fixtures.py --survey [--json OUT]   which attributes of each entry are plain, stand-ins or the check's extras
    python split_fixtures.py --fix [--apply]          the split as a unified diff of fixtures.json (--apply writes it)
    python split_fixtures.py --check [--against REV]  exit 1 on any fault below; --against REV also proves every plan the
                                                      check makes equals REV's (the split moves no record)
    python split_fixtures.py --self-test              plant each fault in a synthetic fixture and show --check finds it

How --survey decides, per entry (the reference is the route's scripts/computed-route/calibration-fixtures.json, the
minimal attribute sets calibration drew each block with):
  - an attribute calibration's entry holds with the same value is plain;
  - an attribute calibration's entry holds with another value: when calibration's value names a live site (an absolute URL
    off example.test) the record's offline value is the stand-in and stays plain; otherwise calibration's value is plain
    and the record's goes to checkAttributes;
  - every other attribute (all of them for a block calibration never drew) is a candidate extra. The block is rendered
    without the candidates (variant 0, as the check's coverage floor reads it). The plain render must pass the floor
    (check.py: the block root printed) and print the block's own parts (`sgs-<block>__*`) when the full render prints
    any (a block whose content comes from the site prints its root and nothing in it without that data). Candidates are
    added back one at a time until it does; those are stand-ins, the rest go to checkAttributes.
--check, for every entry: no attribute in both keys; the plain render passes the floor and prints parts whenever the
check's render does. It reads no calibration file, so it outlives calibration.
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parents[1]
REPO = PLUGIN.parents[1]
FIXTURES = HERE / 'fixtures.json'
CALIBRATION = REPO / 'scripts' / 'computed-route' / 'calibration-fixtures.json'
REL = FIXTURES.relative_to(REPO).as_posix()
LIVE_URL = re.compile(r'https?://(?!example\.test)[a-z0-9.-]+\.[a-z]{2,}', re.I)
sys.path.insert(0, str(HERE))

import instances as I  # noqa: E402


# ---------------------------------------------------------------- reading and rendering
def load(path: Path = FIXTURES) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def dump(data: dict) -> str:
    return json.dumps(data, indent='\t', ensure_ascii=False) + '\n'


def blocks_of(data: dict) -> list:
    return [k for k in data if k.startswith('sgs/')]


def render_default(short: str, fixture: dict) -> dict:
    """Variant 0's default render of `fixture`, as check.py::run_block renders it: {ok, root, parts, html}."""
    import render as RN
    rn = RN.Renderer(PLUGIN, fixture, HERE, short)
    content, inner = rn.render_inner(fixture.get('inner'))
    if not fixture.get('inner') and fixture.get('content'):
        content = fixture['content']
    attrs = I.variant_attributes(fixture.get('attributes'), (fixture.get('variants') or [{}])[0])
    r = rn.render_many(f'sgs/{short}', {'d': RN.with_defaults(PLUGIN, short, RN.fill(attrs))}, content, inner)['d']
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(re.sub(r'<(style|script|template)\b.*?</\1>', '', r.get('html') or '', flags=re.S), 'html.parser')
    own = {f'sgs-{short}', f'wp-block-sgs-{short}'}
    root = soup.find(class_=lambda c: bool(c) and bool(own & set(c.split() if isinstance(c, str) else c)))
    # the block's content: the elements and the words inside its root
    filled = bool(root and (root.find(True) or root.get_text(strip=True)))
    return {'ok': bool(r.get('ok')), 'root': root is not None, 'parts': filled, 'error': (r.get('error') or '')[:200]}


def passes(plain: dict, full: dict) -> bool:
    """The coverage floor, read on the plain render: the block root printed, and not empty when the check's render
    holds anything."""
    return plain['ok'] and plain['root'] and (plain['parts'] or not full['parts'])


def score(r: dict) -> int:
    return (2 if r['ok'] and r['root'] else 0) + (1 if r['parts'] else 0)


# ---------------------------------------------------------------- the survey
def survey_entry(block: str, entry: dict, cal: dict | None, render=render_default) -> dict:
    short = block.split('/', 1)[1]
    rec = dict(entry.get('attributes') or {})
    extra_in = dict(entry.get('checkAttributes') or {})
    if extra_in:
        return {'block': block, 'state': 'split', 'attributes': sorted(rec), 'checkAttributes': sorted(extra_in)}
    plain, check, why = {}, {}, {}
    cal_attrs = (cal or {}).get('attributes') if cal is not None else None
    candidates = []
    for k, v in rec.items():
        if cal_attrs is not None and k in cal_attrs:
            if cal_attrs[k] == v:
                plain[k] = v
            elif LIVE_URL.search(json.dumps(cal_attrs[k])):
                plain[k] = v
                why[k] = 'stand-in: calibration named a live site here; this is the offline value'
            else:
                plain[k], check[k] = cal_attrs[k], v
                why[k] = 'changed value: calibration plain, the record value tested'
        else:
            candidates.append(k)
    if not candidates and not check:
        return {'block': block, 'state': 'plain', 'attributes': sorted(plain), 'checkAttributes': [], '_plain': plain, '_check': {}}
    full = render(short, entry)
    trial = {**entry, 'attributes': dict(plain)}
    got = render(short, trial)
    added = []
    # add back, one at a time, the candidate that moves the plain render furthest toward passing (the root first, then
    # the block's parts); a step that moves nothing means the cause is not one attribute: read it by hand
    while not passes(got, full):
        best = None
        for k in (c for c in candidates if c not in added):
            t = render(short, {**entry, 'attributes': {**trial['attributes'], k: rec[k]}})
            if best is None or score(t) > score(best[1]):
                best = (k, t)
        if best is None or score(best[1]) <= score(got):
            break
        added.append(best[0])
        trial['attributes'][best[0]], got = rec[best[0]], best[1]
    for k in added:
        plain[k] = rec[k]
        why[k] = 'stand-in: without it the plain render fails the coverage floor (no block root, or an empty one)'
    for k in candidates:
        if k not in added:
            check[k] = rec[k]
            why.setdefault(k, 'extra: the plain render passes without it')
    state = 'unrecognised' if not passes(got, full) else 'split'
    return {'block': block, 'state': state, 'calibration': cal is not None, 'attributes': sorted(plain),
            'checkAttributes': sorted(check), 'why': why, 'full': full, 'plain': got,
            '_plain': plain, '_check': check}


def survey(data: dict, cal: dict, render=render_default, only=None) -> list:
    rows = []
    for b in blocks_of(data):
        if only and b not in only:
            continue
        rows.append(survey_entry(b, data[b], cal.get(b), render))
    return rows


def split(data: dict, rows: list) -> dict:
    """fixtures.json with each surveyed entry's attributes split; key order kept, checkAttributes right after attributes."""
    out = {}
    for b, entry in data.items():
        row = next((r for r in rows if r['block'] == b and r.get('_check')), None)
        if not row:
            out[b] = entry
            continue
        e = {}
        for k, v in entry.items():
            if k == 'attributes':
                e['attributes'] = {a: row['_plain'][a] for a in v if a in row['_plain']}
                e['checkAttributes'] = {a: row['_check'][a] for a in v if a in row['_check']}
            else:
                e[k] = v
        out[b] = e
    return out


# ---------------------------------------------------------------- the check
def faults(data: dict, render=render_default, old: dict | None = None, plans: bool = True) -> list:
    out = []
    for b in blocks_of(data):
        entry = data[b]
        extra = entry.get('checkAttributes') or {}
        dup = sorted(set(extra) & set(entry.get('attributes') or {}))
        if dup:
            # a changed value lives in each key once: the plain value in attributes, the tested one in checkAttributes
            # only (instances.py::check_fixture lays checkAttributes over attributes)
            plain = entry.get('attributes') or {}
            same = [k for k in dup if extra[k] == plain[k]]
            if same:
                out.append(f'{b}: {", ".join(same)} in both attributes and checkAttributes with the same value')
        if old is not None:
            want = old.get(b)
            if want is not None and I.check_fixture(entry) != want:
                out.append(f'{b}: attributes with checkAttributes laid over them differ from the earlier entry: a record would move')
        if extra:
            short = b.split('/', 1)[1]
            full = render(short, I.check_fixture(entry))
            plain = render(short, {k: v for k, v in entry.items() if k != 'checkAttributes'})
            if not passes(plain, full):
                out.append(f'{b}: the plain render ' + ('fails' if not plain['ok'] else 'does not print the block root' if not plain['root'] else 'is empty')
                           + ' without checkAttributes: a stand-in sits there (move it to attributes)')
    if old is not None:
        for b in blocks_of(old):
            if b not in data:
                out.append(f'{b}: entry removed')
        if plans and not out:
            out += plan_faults(data, old)
    return out


def plan_faults(data: dict, old: dict) -> list:
    """Every block whose entry changed: the check's plan from the new fixtures equals the plan from the old ones."""
    out = []
    for b in blocks_of(data):
        if data[b] == old.get(b):
            continue
        short = b.split('/', 1)[1]
        a = I.plan(short, PLUGIN, {**{k: v for k, v in old.items() if not k.startswith('_')}, '_shared': old.get('_shared') or {}})
        n = I.plan(short, PLUGIN, {**{k: v for k, v in data.items() if not k.startswith('_')}, '_shared': data.get('_shared') or {}})
        if json.dumps(a['instances'], sort_keys=True) != json.dumps(n['instances'], sort_keys=True):
            out.append(f'{b}: the check plans different renders from the split entry')
    return out


def at_rev(rev: str) -> dict:
    text = subprocess.run(['git', 'show', f'{rev}:{REL}'], cwd=REPO, capture_output=True, text=True, encoding='utf-8', check=True).stdout
    return json.loads(text)


# ---------------------------------------------------------------- self-test
def self_test() -> int:
    """A fake renderer: the root prints only with `need`, a part only with `data`, a label part with `label`."""
    def fake(short, fx):
        a = fx.get('attributes') or {}
        parts = (['sgs-x__body'] if a.get('data') else []) + (['sgs-x__label'] if a.get('label') else [])
        return {'ok': True, 'root': bool(a.get('need')), 'parts': parts, 'error': ''}
    ok = True

    def want(cond, msg):
        nonlocal ok
        print(('ok   ' if cond else 'FAIL ') + msg)
        ok = ok and cond
    clean = {'sgs/x': {'attributes': {'need': 1, 'data': 1}, 'checkAttributes': {'label': 1}}}
    want(not faults(clean, fake, plans=False), 'a clean split has no fault')
    want(any('root' in f for f in faults({'sgs/x': {'attributes': {'data': 1}, 'checkAttributes': {'need': 1}}}, fake, plans=False)), 'a floor stand-in left in checkAttributes is caught')
    want(any('is empty' in f for f in faults({'sgs/x': {'attributes': {'need': 1}, 'checkAttributes': {'data': 1}}}, fake, plans=False)), 'site data left in checkAttributes is caught')
    want(any('both' in f for f in faults({'sgs/x': {'attributes': {'need': 1, 'data': 1, 'label': 1}, 'checkAttributes': {'label': 1}}}, fake, plans=False)), 'an attribute in both keys with one value is caught')
    want(not faults({'sgs/x': {'attributes': {'need': 1, 'data': 1, 'label': 0}, 'checkAttributes': {'label': 1}}}, fake, plans=False), 'a changed value (plain and tested) is allowed')
    old = {'sgs/x': {'attributes': {'need': 1, 'data': 1, 'label': 1}}}
    want(not faults(clean, fake, old, plans=False), 'a split equal to the old entry when merged passes')
    want(any('would move' in f for f in faults({'sgs/x': {'attributes': {'need': 1, 'data': 1}, 'checkAttributes': {'label': 2}}}, fake, old, plans=False)), 'a split that changes a value is caught')
    row = survey_entry('sgs/x', {'attributes': {'need': 1, 'data': 1, 'label': 1}}, None, fake)
    want(row['attributes'] == ['data', 'need'] and row['checkAttributes'] == ['label'], f'the survey keeps the stand-ins and moves the extra: {row["attributes"]} / {row["checkAttributes"]}')
    row = survey_entry('sgs/x', {'attributes': {'need': 1, 'label': 1, 'url': 'b'}}, {'attributes': {'need': 1, 'url': 'a'}}, fake)
    want(row['_plain'].get('url') == 'a' and row['_check'].get('url') == 'b', 'a changed value: calibration plain, the record value tested')
    row = survey_entry('sgs/x', {'attributes': {'need': 1, 'img': 'https://example.test/a.jpg'}}, {'attributes': {'need': 1, 'img': 'https://real.site.com/a.jpg'}}, fake)
    want(row['_plain'].get('img') == 'https://example.test/a.jpg' and not row['_check'], 'a live-site value in calibration keeps the offline stand-in')
    merged = split({'_meta': {}, 'sgs/x': {'attributes': {'need': 1, 'data': 1, 'label': 1}, 'variants': [{}]}},
                   [survey_entry('sgs/x', {'attributes': {'need': 1, 'data': 1, 'label': 1}}, None, fake)])
    want(list(merged['sgs/x']) == ['attributes', 'checkAttributes', 'variants'] and I.check_fixture(merged['sgs/x'])['attributes'] == {'need': 1, 'data': 1, 'label': 1}, 'the fix keeps key order and merges back to the old attributes')
    want(FIXTURES.is_file() and CALIBRATION.parent.is_dir(), 'the paths this tool reads exist')
    print('self-test', 'passed' if ok else 'FAILED')
    return 0 if ok else 1


# ---------------------------------------------------------------- CLI
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--survey', action='store_true')
    g.add_argument('--fix', action='store_true')
    g.add_argument('--check', action='store_true')
    g.add_argument('--self-test', action='store_true')
    ap.add_argument('--json', type=Path, help='--survey: write the census here')
    ap.add_argument('--apply', action='store_true', help='--fix: write fixtures.json')
    ap.add_argument('--against', help='--check: a git revision whose fixtures.json the split must merge back to')
    ap.add_argument('--blocks', help='comma-separated block names (default: every entry)')
    a = ap.parse_args(argv)
    if a.self_test:
        return self_test()
    data = load()
    only = set(a.blocks.split(',')) if a.blocks else None
    if a.check:
        old = at_rev(a.against) if a.against else None
        sel = {k: v for k, v in data.items() if not only or k in only or not k.startswith('sgs/')}
        found = faults(sel, old=old)
        for f in found:
            print(f)
        print(f'{len(found)} fault(s) in {len(blocks_of(sel))} entries' + (f' (against {a.against})' if old else ''))
        return 1 if found else 0
    if not CALIBRATION.is_file():
        print(f'{CALIBRATION} is gone: the survey has no reference; --check still runs')
        return 1
    rows = survey(data, load(CALIBRATION), only=only)
    counts = {}
    for r in rows:
        counts[r['state']] = counts.get(r['state'], 0) + 1
    if a.survey:
        for r in rows:
            if r['state'] in ('split', 'unrecognised') and r.get('why'):
                print(f"{r['block']}: {r['state']}; plain {r['attributes']}; check {r['checkAttributes']}")
                for k, w in r['why'].items():
                    print(f'    {k}: {w}')
        print(json.dumps(counts))
        if a.json:
            a.json.parent.mkdir(parents=True, exist_ok=True)
            a.json.write_text(json.dumps({'counts': counts, 'rows': [{k: v for k, v in r.items() if not k.startswith('_')} for r in rows]}, indent=1), encoding='utf-8')
        return 1 if counts.get('unrecognised') else 0
    if counts.get('unrecognised'):
        print('refusing: the survey has unrecognised entries (read them with --survey)')
        return 1
    before = FIXTURES.read_text(encoding='utf-8')
    after = dump(split(data, rows))
    sys.stdout.writelines(difflib.unified_diff(before.splitlines(True), after.splitlines(True), REL, REL))
    if a.apply and after != before:
        tmp = FIXTURES.with_suffix('.json.tmp')
        tmp.write_text(after, encoding='utf-8', newline='\n')
        os.replace(tmp, FIXTURES)
        print(f'wrote {REL}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
