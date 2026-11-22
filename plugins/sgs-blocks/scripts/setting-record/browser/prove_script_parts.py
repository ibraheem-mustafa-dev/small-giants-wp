#!/usr/bin/env python3
"""Settle every `script-built-part` record entry in a real browser, on a local scratch WordPress site.

The offline check (../check.py) cannot see a part the block's front-end JavaScript builds (the cart's free-delivery bar
and item rows, the form's review rows), so it leaves those entries `unproved: script-built-part`. This script takes
each such entry from the record files, builds a plain page and a changed page (the fixture's attributes, and the same
plus the setting's test value, as ../instances.py generates them), opens both in Chromium (measure.cjs), puts the part on
screen the way a visitor does, and compares the part's computed properties at every width the entry allows.

Verdicts: proved (the part's computed property differs between the two pages), removed (the part is on screen in both, the
property is identical at every width and under a second test value, and no other part differs either), refiled (the
difference shows on another part: the class is named), unproven (the part could not be put on screen: the reason names it).

Usage (Windows Python; the scratch site is served from WSL):
  python prove_script_parts.py --site local-mediatest-setrec --url http://localhost:8165 --out DIR [--block cart|form|all]
                               [--tabs N | --tune] [--records-dir DIR] [--limit N]
  --setup     once per scratch site: the products the cart needs, the two basket sessions
  --tune      run the first 12 pairs at 2, 4, 6 and 8 tabs, print pairs per minute, run the rest at the best count

Nothing here writes to a shared mirror or a live site: the only site is the scratch copy named by --site (it must start
with local-mediatest), and the only database writes are pages and the fixture products on it.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
SETREC = HERE.parent
sys.path.insert(0, str(SETREC))

import instances as inst  # noqa: E402  (the generator the offline check uses: the same test values)
import render as RN  # noqa: E402  (the placeholders' stand-in ids)

WIDTHS = {'desktop': 1440, 'tablet': 768, 'mobile': 375}
ALL_WIDTHS = [1440, 768, 375]
DEFAULT_RECORDS = Path('E:/sgs-tmp/setting-record-task1/records-final')
SCRIPT_BUILT = 'script-built-part'
# the causes this pass settles: a part a script builds, and a value a script writes (a custom property it sets)
BROWSER_CAUSES = (SCRIPT_BUILT, 'script-set-token')
# The cart's item rows are drawn only for what the block's panel is set to show (render.php's data-* attributes read by
# panel-render.js): a stepper, the text Remove link, Save for later and Add options. Both pages of a pair get the same
# switches, so the setting under test is the only difference; a switch the pair itself sets or the plan's base sets is kept.
CART_SWITCHES = {'itemShowQty': True, 'itemQtyStyle': 'stepper', 'itemRemoveStyle': 'text', 'itemShowSaveForLater': True,
                 'itemShowAddOptions': True, 'itemAddOptionsLabel': 'Add options'}
# A form the visitor can step through: the first step holds two inputs, the second holds the review block.
FORM_FIELDS = [('form-field-text', {'fieldName': 'your_name', 'label': 'Your name', 'required': False, 'width': 'full'}),
               ('form-field-email', {'fieldName': 'email', 'label': 'Email', 'required': False, 'width': 'full'})]


# ------------------------------------------------------------------------------------------------ page markup
def blk(name: str, attrs: dict, inner: list | None = None) -> str:
    body = json.dumps(attrs, ensure_ascii=True, separators=(',', ':')).replace('--', '\\u002d\\u002d').replace('<', '\\u003c').replace('>', '\\u003e')
    if inner is None:
        return f'<!-- wp:sgs/{name} {body} /-->'
    return f'<!-- wp:sgs/{name} {body} -->\n' + '\n'.join(inner) + f'\n<!-- /wp:sgs/{name} -->'


def markup(block: str, attrs: dict) -> str:
    if block == 'cart':
        return blk('cart', attrs)
    if block == 'nav-bar-menu':
        # inside the fixture's parents (a header and its row), as the offline check draws it, with the stand-in posts the
        # placeholders name (--setup-nav puts them on the scratch site at those ids)
        fx = inst.load_fixtures().get('sgs/nav-bar-menu') or {}
        out = blk('nav-bar-menu', RN.fill(attrs))
        for p in reversed(fx.get('parents') or []):
            sibs = [blk(s['name'].split('/', 1)[1], RN.fill(s.get('attributes') or {})) for s in p.get('siblings') or []]
            out = blk(p['name'].split('/', 1)[1], RN.fill(p.get('attributes') or {}), [out] + sibs)
        return out
    steps = [blk('form-step', {'label': 'Your details'}, [blk(n, a) for n, a in FORM_FIELDS]),
             blk('form-step', {'label': 'Review'}, [blk('form-review', {'heading': 'Review your information', 'headingLevel': 'h3'})])]
    return blk('form', attrs, steps)


# ------------------------------------------------------------------------------------------------ the entries
def entry_widths(entry: dict) -> list[int] | None:
    """The widths an entry's media conditions allow; None for a condition this pass cannot hold."""
    widths = list(ALL_WIDTHS)
    for cond in entry.get('tiers') or []:
        m = re.fullmatch(r'@media\(\s*(max|min)-width:\s*([\d.]+)px\s*\)', cond.replace(' ', ''))
        if not m:
            return None
        lim = float(m.group(2))
        widths = [w for w in widths if (w <= lim if m.group(1) == 'max' else w >= lim)]
    return widths


def probe_id(e: dict) -> str:
    return f"{e['part']}|{','.join(e['props'])}|{e.get('state') or ''}"


def hex_rgb(h: str) -> str:
    h = h.lstrip('#')
    return f'rgb({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)})'


def leaves(v):
    if isinstance(v, dict):
        for x in v.values():
            yield from leaves(x)
    elif isinstance(v, list):
        for x in v:
            yield from leaves(x)
    else:
        yield v


def tokens(value, width: int) -> list[str]:
    """What the changed computed value should contain if it carries the setting's test value at this width."""
    tier = next(t for t, w in WIDTHS.items() if w == width)
    if isinstance(value, dict) and set(value) & set(WIDTHS):
        # The desktop value reaches every width a smaller tier does not set.
        order = ['desktop', 'tablet', 'mobile']
        chosen = None
        for t in order[:order.index(tier) + 1]:
            if t in value:
                chosen = value[t]
        value = chosen
    out = []
    for leaf in leaves(value):
        if isinstance(leaf, bool) or leaf is None:
            continue
        s = str(leaf).strip()
        if re.fullmatch(r'#[0-9a-fA-F]{6}', s):
            out.append(re.escape(hex_rgb(s).lower()))
        elif re.fullmatch(r'-?[\d.]+', s):
            out.append(rf'(?<![\d.]){re.escape(s)}(?:px|em|rem|%|s|ms)?(?![\d.])')
        elif re.fullmatch(r'-?[\d.]+(px|em|rem|%|s|ms)', s):
            out.append(rf'(?<![\d.]){re.escape(s)}(?![\d.])')
        else:
            out.extend(re.escape(p.strip().lower()) for p in s.split(',') if p.strip())
    return out


def carries(changed: dict, toks: list[str]) -> bool:
    text = ' | '.join(str(v) for v in changed.values()).lower()
    return any(re.search(t, text) for t in toks)


ALT_WORDS = {'Georgia, serif': 'Courier New, monospace', 'italic': 'oblique', 'uppercase': 'lowercase', 'lowercase': 'uppercase',
             'capitalize': 'uppercase', 'dashed': 'dotted', 'solid': 'double', '700': '300', 'center': 'right', 'balance': 'nowrap',
             'underline': 'line-through', 'line-through': 'underline', 'nowrap': 'wrap', 'wrap': 'nowrap', 'none': 'underline',
             'horizontal-tb': 'vertical-rl', 'vertical-rl': 'vertical-lr', 'vertical-lr': 'vertical-rl', 'left': 'right',
             'right': 'left', 'pretty': 'nowrap', 'stable': 'nowrap', 'stacked': 'inline'}
ALT_NUM = {37: 51, 23: 41, 7: 29, 3: 2, 11: 31, 13: 33, 17: 43, 19: 47, 21: 53, 25: 59, 27: 61, 5: 15, 9: 39, 2: 5}


def alt_value(v, setting: str = ''):
    """A second test value that differs from the first: another colour, another number, another keyword."""
    if isinstance(v, bool):
        return v
    if isinstance(v, dict):
        return {k: alt_value(x, setting) for k, x in v.items()}
    if isinstance(v, list):
        return [alt_value(x, setting) for x in v]
    if isinstance(v, (int, float)):
        return 2 if setting.endswith('Columns') else ALT_NUM.get(v, v + 11)
    s = str(v)
    if re.fullmatch(r'#[0-9a-fA-F]{6}', s):
        return inst.MARKER_ALT_HEX if s.lower() == inst.MARKER_HEX else inst.MARKER_HEX
    m = re.fullmatch(r'(-?[\d.]+)(px|em|rem|%)', s)
    if m:
        n = float(m.group(1))
        n = int(n) if n == int(n) else n
        return f'{ALT_NUM.get(n, n + 11)}{m.group(2)}'
    return ALT_WORDS.get(s, s)


# ------------------------------------------------------------------------------------------------ site access
def wsl_path(p: str | Path) -> str:
    p = str(p).replace('\\', '/')
    m = re.match(r'^([A-Za-z]):/(.*)$', p)
    return f'/mnt/{m.group(1).lower()}/{m.group(2)}' if m else p


class Site:
    def __init__(self, name: str, url: str, distro: str = 'Ubuntu'):
        if not name.startswith('local-mediatest'):
            raise SystemExit(f'refusing {name}: only a scratch copy (local-mediatest*) may be written')
        self.name, self.url, self.distro = name, url.rstrip('/'), distro

    def wp(self, *args: str, user: bool = True) -> str:
        cmd = f"cd /var/www/{self.name} && wp --allow-root {'--user=1 ' if user else ''}" + ' '.join(args)
        r = subprocess.run(['wsl', '-d', self.distro, '-u', 'root', '--', 'bash', '-c', cmd], capture_output=True, text=True, encoding='utf-8')
        if r.returncode:
            raise SystemExit(f'wp failed: {cmd}\n{r.stdout}\n{r.stderr}')
        return r.stdout

    def make_pages(self, pages: dict[str, str], tmp: Path) -> dict:
        f = tmp / 'pages.json'
        f.write_text(json.dumps(pages), encoding='utf-8')
        out = self.wp('eval-file', wsl_path(HERE / 'wp_pages.php'), wsl_path(f))
        return json.loads(out.strip().splitlines()[-1])


def run_measure(jobs: list[dict], tabs: int, out_dir: Path, tag: str, site: Site, session_dir: Path) -> dict:
    jf, rf = out_dir / f'jobs-{tag}.json', out_dir / f'raw-{tag}.json'
    jf.write_text(json.dumps(jobs), encoding='utf-8')
    env = dict(os.environ)
    env.setdefault('NODE_PATH', r'C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\node_modules')
    t0 = time.time()
    r = subprocess.run(['node', str(HERE / 'measure.cjs'), str(jf), str(rf), str(tabs), str(session_dir)], env=env, capture_output=True, text=True)
    wall = time.time() - t0
    if r.returncode or not rf.exists():
        raise SystemExit(f'measure.cjs failed: {r.stderr[-800:]}')
    data = json.loads(rf.read_text(encoding='utf-8'))
    data['wall'] = wall
    return data


# ------------------------------------------------------------------------------------------------ planning
class Pair:
    def __init__(self, block, setting, label, session, plain_attrs, changed_attrs, entries, value, second=False):
        self.block, self.setting, self.label, self.session = block, setting, label, session
        self.plain_attrs, self.changed_attrs, self.entries, self.value, self.second = plain_attrs, changed_attrs, entries, value, second
        self.key = f'{block}/{label}/{session}'


def load_entries(records_dir: Path, block: str) -> list[dict]:
    rec = json.loads((records_dir / f'{block}.json').read_text(encoding='utf-8'))
    return [dict(e, block=rec['block']) for e in rec['entries'] if e.get('unproved') in BROWSER_CAUSES]


def with_switches(block: str, attrs: dict, default: dict) -> dict:
    if block != 'cart':
        return dict(attrs)
    explicit = {k for k, v in attrs.items() if v != default.get(k)}
    out = dict(attrs)
    for k, v in CART_SWITCHES.items():
        if k not in explicit:
            out[k] = v
    return out


def build_pairs(block: str, entries: list[dict], plan: dict) -> list[Pair]:
    default = next(i for i in plan['instances'] if i['isDefault'] and i['variant'] == 0)['attrs']
    bases = {i['baseKey']: i['attrs'] for i in plan['instances'] if i['isBase']}
    by_setting = collections.defaultdict(list)
    for e in entries:
        by_setting[e['setting']].append(e)
    pairs = []
    for setting, ents in by_setting.items():
        ins = [i for i in plan['instances'] if i['attr'] == setting and i['variant'] == 0 and 'desktop-only' not in i['key']]
        sessions = ['progress', 'complete'] if block == 'cart' and any(e['part'].startswith('sgs-cart__free-delivery') for e in ents) else ['progress']
        for i in ins:
            plain = bases.get(i['baseKey'], default) if i['baseKey'] else default
            for s in sessions:
                pairs.append(Pair(block, setting, i['key'], s, with_switches(block, plain, default), with_switches(block, i['attrs'], default), ents,
                                  i['attrs'].get(setting)))
    return pairs


def alt_pair(p: Pair, plan: dict) -> Pair | None:
    """The same pair with the setting's value replaced by a different one."""
    v = alt_value(p.value, p.setting)
    if v == p.value:
        return None
    ch = dict(p.changed_attrs)
    ch[p.setting] = v
    return Pair(p.block, p.setting, p.label + '#second', p.session, p.plain_attrs, ch, p.entries, v, second=True)


class Pages:
    """One page per distinct markup: the plain page of a base is shared by every pair that starts from it."""

    def __init__(self):
        self.by_slug: dict[str, str] = {}

    def slug(self, block: str, attrs: dict) -> str:
        m = markup(block, attrs)
        s = f"sr-{block}-{hashlib.md5(m.encode()).hexdigest()[:10]}"
        self.by_slug[s] = m
        return s


def jobs_for(pairs: list[Pair], pages: Pages, site: Site, scan: bool = False) -> list[dict]:
    jobs = []
    for p in pairs:
        probes, widths = {}, set()
        for e in p.entries:
            w = entry_widths(e)
            if w is None:
                continue
            widths.update(w)
            if scan:
                probes[f'scan|{",".join(e["props"])}'] = {'id': f'scan|{",".join(e["props"])}', 'scan': True, 'part': '', 'props': e['props'], 'state': None, 'pseudo': None}
            else:
                part, _, pse = e['part'].partition('::')
                pseudo = '::' + pse if pse else ('::' + m.group(1) if (m := re.search(r'::?(before|after)$', e.get('selector') or '')) else None)
                probes[probe_id(e)] = {'id': probe_id(e), 'part': part, 'props': e['props'], 'state': e.get('state'), 'pseudo': pseudo}
        if not widths:
            continue
        for side, attrs in (('plain', p.plain_attrs), ('changed', p.changed_attrs)):
            jobs.append({'id': f'{p.key}|{side}', 'url': f"{site.url}/{pages.slug(p.block, attrs)}/", 'kind': p.block, 'session': p.session,
                         'widths': sorted(widths, reverse=True), 'probes': list(probes.values())})
    return jobs


# ------------------------------------------------------------------------------------------------ judging
def compare_probe(P: dict, C: dict) -> tuple[bool, dict | None]:
    """Whether the changed page's elements differ from the plain page's, and the first differing pair of value sets."""
    for pe, ce in zip(P['els'], C['els']):
        if pe != ce:
            return True, {'plain': pe, 'changed': ce}
    return False, None


def scan_diff(P: dict, C: dict) -> dict:
    """Elements of the whole block whose property differs: {class: (plain, changed)}."""
    def keyed(els):
        seen, out = collections.Counter(), {}
        for e in els:
            seen[e['c']] += 1
            out[(e['c'], seen[e['c']])] = e['v']
        return out
    a, b = keyed(P['els']), keyed(C['els'])
    return {k[0]: {'plain': a[k], 'changed': b[k]} for k in a if k in b and a[k] != b[k]}


def judge_pairs(entries: list[dict], pairs: list[Pair], results: dict[str, dict]) -> dict:
    """Per entry key: {diffs: [...], seen: {width: bool}, shown: {width: bool}, errors: [...], first: {...}}."""
    out = {}
    for e in entries:
        pid, widths = probe_id(e), entry_widths(e)
        ev = {'diffs': [], 'seen': collections.defaultdict(bool), 'shown': collections.defaultdict(bool), 'errors': [], 'first': {}, 'tested': []}
        for p in pairs:
            if p.setting != e['setting']:
                continue
            pl, ch = results.get(f'{p.key}|plain'), results.get(f'{p.key}|changed')
            if not pl or not ch:
                continue
            ev['tested'].append(p.label + ('/' + p.session if p.session != 'progress' else ''))
            if not (pl['ok'] and ch['ok']):
                ev['errors'].append(f"{p.key}: {pl['error'] or ch['error']}")
                continue
            for w in widths or []:
                P, C = pl['widths'][str(w)][pid], ch['widths'][str(w)][pid]
                ev['seen'][w] |= bool(P['n'] and C['n'])
                ev['shown'][w] |= bool(P['shown'] and C['shown'])
                differs, vals = compare_probe(P, C)
                ev['first'].setdefault(w, {'plain': (P['els'] or [{}])[0], 'changed': (C['els'] or [{}])[0]})
                if differs:
                    ev['diffs'].append({'pair': p.label, 'session': p.session, 'second': p.second, 'width': w, 'value': p.value, **vals})
        out[json.dumps([e['setting'], e['part'], e['props'], e.get('state'), e['tiers']])] = ev
    return out


def key_of(e: dict) -> str:
    return json.dumps([e['setting'], e['part'], e['props'], e.get('state'), e['tiers']])


def verdict_from(e: dict, ev: dict, widths: list[int]) -> dict | None:
    """proved when any width differs; None while undecided."""
    if not ev['diffs']:
        return None
    vals, kind = {}, 'switched-on'
    for d in sorted(ev['diffs'], key=lambda d: (d['second'], d['session'] != 'progress')):
        if d['width'] in vals:
            continue
        vals[d['width']] = {'plain': d['plain'], 'changed': d['changed']}
    for d in ev['diffs']:
        if carries(d['changed'], tokens(d['value'], d['width'])):
            kind = 'value'
            break
    return {'verdict': 'proved', 'kind': kind, 'values': {str(w): vals[w] for w in sorted(vals, reverse=True)}}


# ------------------------------------------------------------------------------------------------ driver
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--site', default='local-mediatest-setrec')
    ap.add_argument('--url', default='http://localhost:8165')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--block', default='all', choices=['cart', 'form', 'nav-bar-menu', 'all'])
    ap.add_argument('--records-dir', type=Path, default=DEFAULT_RECORDS)
    ap.add_argument('--tabs', type=int, default=6)
    ap.add_argument('--tune', action='store_true')
    ap.add_argument('--setup', action='store_true')
    ap.add_argument('--setup-nav', action='store_true', help="once per scratch site: the menu's stand-in posts at the ids its placeholders name")
    ap.add_argument('--sessions', type=Path, help='folder holding cart-progress.json and cart-complete.json (default: the folder above --out)')
    ap.add_argument('--limit', type=int, default=0, help='only the first N settings of each block (a trial run)')
    ap.add_argument('--write-verdicts', metavar='BUILD', help='also write verdicts/<block>.json for each block measured, stamped with '
                    "check.py::script_hash of this checkout's code and BUILD (the commit the scratch site's plugin was built from)")
    a = ap.parse_args(argv)
    if a.write_verdicts and a.limit:
        raise SystemExit('--write-verdicts with --limit would replace a block\'s verdicts with a trial run\'s few: run the full pass')
    out = a.out
    sess = a.sessions or out.parent
    out.mkdir(parents=True, exist_ok=True)
    site = Site(a.site, a.url)
    t_start = time.time()

    if a.setup_nav:
        print(site.wp('eval-file', wsl_path(HERE / 'wp_nav_fixtures.php'), wsl_path(SETREC / 'fixtures' / 'menu-post.json')))
        return 0

    if a.setup:
        print(site.wp('eval-file', wsl_path(HERE / 'wp_fixtures.php')))
        print('now: node measure.cjs sessions <url> <out> <simple> <variable> <variation>')
        return 0

    blocks = ['cart', 'form', 'nav-bar-menu'] if a.block == 'all' else [a.block]
    plans, entries, pairs = {}, [], []
    for b in blocks:
        plans[b] = inst.plan(b)
        es = load_entries(a.records_dir, b)
        if a.limit:
            keep = sorted({e['setting'] for e in es})[:a.limit]
            es = [e for e in es if e['setting'] in keep]
        entries += es
        pairs += build_pairs(b, es, plans[b])
    print(f'{len(entries)} entries, {len(pairs)} pairs')

    pages = Pages()
    jobs = jobs_for(pairs, pages, site)
    created = site.make_pages(pages.by_slug, out)
    bad = {k: v for k, v in created.items() if not isinstance(v, int)}
    if bad:
        raise SystemExit(f'page creation failed: {bad}')
    print(f'{len(pages.by_slug)} pages')

    # Tuning: the first 12 pairs (6 cart, 6 form, interleaved) at 2, 4, 6 and 8 tabs.
    results: dict[str, dict] = {}
    tuning = []
    tabs = a.tabs
    ordered = pairs
    if a.tune:
        cart = [p for p in pairs if p.block == 'cart']
        form = [p for p in pairs if p.block == 'form']
        sample = [x for pair in zip(cart[::max(1, len(cart) // 6)][:6], form[::max(1, len(form) // 6)][:6]) for x in pair][:12]
        keys = {p.key for p in sample}
        sample_jobs = [j for j in jobs if j['id'].rsplit('|', 1)[0] in keys]
        for n in (2, 4, 6, 8):
            data = run_measure(sample_jobs, n, out, f'tune{n}', site, sess)
            tuning.append({'tabs': n, 'pairs': len(sample), 'seconds': round(data['wall'], 1), 'pairs_per_min': round(len(sample) / data['wall'] * 60, 2),
                           'errors': sum(1 for r in data['results'] if not r['ok'])})
            print(tuning[-1])
            if n == 2:
                for r in data['results']:
                    if r['ok']:
                        results[r['id']] = r
        tabs = max(tuning, key=lambda t: t['pairs_per_min'])['tabs']
        done = {j['id'] for j in sample_jobs}
        rest = [j for j in jobs if j['id'] not in done]
        print(f'best: {tabs} tabs; {len(rest)} page visits left')
    else:
        rest = jobs
    data = run_measure(rest, tabs, out, 'main', site, sess)
    for r in data['results']:
        results[r['id']] = r
    main_stats = {'tabs': tabs, 'visits': len(rest), 'seconds': round(data['wall'], 1), 'pairs_per_min': round(len(rest) / 2 / data['wall'] * 60, 2)}
    print('main run', main_stats)

    # Failed visits are retried once, alone, before they count against an entry.
    redo = [j for j in jobs if not results.get(j['id'], {}).get('ok')]
    if redo:
        data = run_measure(redo, max(1, tabs // 2), out, 'retry', site, sess)
        for r in data['results']:
            results[r['id']] = r

    verdicts: dict[str, dict] = {}
    judged = judge_pairs(entries, pairs, results)
    undecided = []
    for e in entries:
        ev = judged[key_of(e)]
        v = verdict_from(e, ev, entry_widths(e) or [])
        if v:
            verdicts[key_of(e)] = {**v, 'tested': ev['tested']}
        else:
            undecided.append(e)
    print(f'first pass: {len(verdicts)} proved, {len(undecided)} undecided')

    # Second value for what did not differ.
    second_pairs = []
    und_settings = {e['setting'] for e in undecided}
    for p in pairs:
        if p.setting in und_settings and (ap := alt_pair(p, plans[p.block])):
            second_pairs.append(ap)
    sjobs = jobs_for(second_pairs, pages, site)
    if sjobs:
        site.make_pages(pages.by_slug, out)
        data = run_measure(sjobs, tabs, out, 'second', site, sess)
        sres = {r['id']: r for r in data['results']}
        judged2 = judge_pairs(undecided, second_pairs, sres)
        still = []
        for e in undecided:
            ev = judged2[key_of(e)]
            v = verdict_from(e, ev, entry_widths(e) or [])
            if v:
                verdicts[key_of(e)] = {**v, 'tested': judged[key_of(e)]['tested'] + ev['tested']}
            else:
                judged[key_of(e)]['second'] = ev
                still.append(e)
        undecided = still
    print(f'second value: {len(verdicts)} proved, {len(undecided)} still undecided')

    # What still did not differ: look at every other element of the block for the same properties.
    scan_pairs = []
    for p in pairs + second_pairs:
        if any(e['setting'] == p.setting for e in undecided):
            scan_pairs.append(p)
    scan_ents = [e for e in undecided if not e.get('state')]
    scan_pairs = [Pair(p.block, p.setting, p.label, p.session, p.plain_attrs, p.changed_attrs, [e for e in scan_ents if e['setting'] == p.setting], p.value, p.second)
                  for p in scan_pairs if any(e['setting'] == p.setting for e in scan_ents)]
    scan_res = {}
    if scan_pairs:
        data = run_measure(jobs_for(scan_pairs, pages, site, scan=True), tabs, out, 'scan', site, sess)
        scan_res = {r['id']: r for r in data['results']}

    final = []
    for e in entries:
        k = key_of(e)
        base = {kk: e[kk] for kk in ('setting', 'part', 'props', 'state', 'tiers')}
        base['block'] = e['block']
        widths = entry_widths(e)
        if widths is None:
            final.append({**base, 'verdict': 'unproven', 'reason': f"tier condition {e['tiers']} is not a max-width/min-width this pass can hold"})
            continue
        if k in verdicts:
            final.append({**base, **verdicts[k]})
            continue
        ev = judged[k]
        pid = probe_id(e)
        if ev['errors'] and not any(ev['seen'].values()):
            final.append({**base, 'verdict': 'unproven', 'reason': 'page visit failed: ' + '; '.join(ev['errors'])[:300]})
            continue
        if not all(ev['seen'].get(w) for w in widths):
            missing = [w for w in widths if not ev['seen'].get(w)]
            final.append({**base, 'verdict': 'unproven', 'reason': f'the part is on no element at width(s) {missing} on both pages', 'values': {str(w): ev['first'].get(w) for w in widths}})
            continue
        # Refile: another part differs on the same properties.
        refiled = {}
        for p in scan_pairs:
            if p.setting != e['setting']:
                continue
            pl, ch = scan_res.get(f'{p.key}|plain'), scan_res.get(f'{p.key}|changed')
            if not pl or not ch or not (pl['ok'] and ch['ok']):
                continue
            for w in widths:
                sp, sc = pl['widths'].get(str(w), {}).get(f'scan|{",".join(e["props"])}'), ch['widths'].get(str(w), {}).get(f'scan|{",".join(e["props"])}')
                if sp and sc:
                    for cls, vals in scan_diff(sp, sc).items():
                        refiled.setdefault(cls, {})[str(w)] = vals
        if refiled:
            final.append({**base, 'verdict': 'refiled', 'refiled_to': sorted(refiled), 'values': refiled, 'tested': ev['tested']})
            continue
        shown_all = all(ev['shown'].get(w) for w in widths)
        final.append({**base, 'verdict': 'removed', 'values': {str(w): ev['first'][w] for w in widths}, 'shown_at_every_width': shown_all,
                      'tested': ev['tested'] + (judged[k].get('second', {}).get('tested') or [])})
    (out / 'verdicts.json').write_text(json.dumps(final, indent=1), encoding='utf-8')
    if a.write_verdicts:
        import check as K  # noqa: PLC0415 - only this step needs it
        plugin = SETREC.parents[1]
        for b in blocks:
            mine = [{k: v for k, v in x.items() if k != 'block'} for x in final if x['block'] == f'sgs/{b}']
            doc = {'block': f'sgs/{b}', 'scriptHash': K.script_hash(plugin, b),
                   'measured': f'{time.strftime("%Y-%m-%d")}, on the local scratch site {a.site} running the plugin build of {a.write_verdicts}, '
                               'Chromium via Playwright, 1440/768/375 (browser/README.md)', 'entries': mine}
            (HERE / 'verdicts' / f'{b}.json').write_text(json.dumps(doc, indent=1) + chr(10), encoding='utf-8', newline=chr(10))
            print(f'wrote verdicts/{b}.json: {len(mine)} entries, scriptHash {doc["scriptHash"]}')
    counts = collections.Counter((v['block'], v['verdict']) for v in final)
    summary = {'counts': {f'{b}/{v}': n for (b, v), n in sorted(counts.items())}, 'tuning': tuning, 'main': main_stats, 'seconds_total': round(time.time() - t_start, 1)}
    (out / 'summary.json').write_text(json.dumps(summary, indent=1), encoding='utf-8')
    print(json.dumps(summary, indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
