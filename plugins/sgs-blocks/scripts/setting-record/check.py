"""The setting-record check: run a block's real render code offline for every setting and compare what changes with the
block's written record, both ways.

  add      the code changes this, the record does not have it
  remove   the record has this, the code no longer changes it
  change   the same setting, part and properties, but the record names other states or media conditions
  skipped  record entries marked `runner` (a paint the offline runner cannot see yet), listed, never passed silently
Parts: every part block.json (supports.sgs.elements) declares must be printed by the default render or built by the
block's front-end script; every sgs-<block>__ part the default render prints must be declared; the record's `parts`
must equal the printed parts in markup order.

Usage:
  python check.py sgs/button --record button.json                 compare (exit 1 on any finding)
  python check.py sgs/button --write button.json                  write the record from the code
  python check.py sgs/button sgs/cart --record-dir DIR            several blocks at once, one process each (--write-dir DIR to write)
  python check.py --self-test                                     prove the check fails on planted faults
  python check.py --changed [--no-proof]                          the build gate: only the blocks a change touches (changed.py)
  python check.py --changed --restamp                             the same, refreshing the stamp of every record that passes
Options: --plugin P (a plugin copy; default this repo's), --fixtures F, --instances PLAN.json | --instances-dir DIR
(replay a saved instance plan instead of generating one from block.json), --no-proof, --out DIR (reports).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import diff as D  # noqa: E402
import render as RN  # noqa: E402
import vocab as V  # noqa: E402

FIXTURES = HERE / 'fixtures.json'
RECORDS = HERE.parent / 'data' / 'setting-records'  # the committed records the framework database is seeded from
SCHEMA = HERE / 'record.schema.json'


BROWSER_VERDICTS = HERE / 'browser' / 'verdicts'
# The causes the browser pass settles (browser/README.md): a part the block's script builds, a token a script sets, or a
# part another block prints.
BROWSER_CAUSES = {'script-built-part', 'script-set-token', 'part-printed-elsewhere'}


def key(e: dict) -> tuple:
    return (e['setting'], e['part'], tuple(e['props']), e['state'], tuple(e['tiers']))


def script_hash(plugin: Path, short: str) -> str:
    """What a browser verdict depends on beyond the offline render: the front end of the block's own folder and of
    src/shared (render, stylesheets, block.json, and every script a visitor's page can run: proof.py::front_end_reachable).
    The editor's files (its entries index.js, edit.js and editor.js, its stylesheets, scripts only the editor reaches)
    are left out: an editor change does not change what the browser measured."""
    import hashlib
    import proof as PR
    plugin = Path(plugin)
    front = PR.front_end_reachable(str(plugin))
    h = hashlib.md5()
    for base in (plugin / 'src' / 'blocks' / short, plugin / 'src' / 'shared'):
        for f in sorted(p for p in base.rglob('*') if p.is_file()):
            rel = f.relative_to(plugin).as_posix()
            if f.name in PR.EDITOR_FILES or 'editor' in f.name.lower() or (f.suffix in ('.js', '.mjs', '.jsx', '.ts', '.tsx') and rel not in front):
                continue
            h.update(rel.encode())
            h.update(f.read_bytes().replace(b'\r\n', b'\n'))
    return h.hexdigest()[:16]


def apply_browser_verdicts(short: str, plugin: Path, entries: dict, folder: Path = BROWSER_VERDICTS) -> dict | None:
    """The browser pass's verdicts (browser/verdicts/<block>.json) applied to the proof's entries, when they were measured
    on this block's code (scriptHash): a proved entry loses its `unproved` cause and takes the browser's kind, a removed
    one goes, a re-filed one moves to the part the browser found. Only entries the offline proof left with a browser
    cause are touched. Stale verdicts (the code changed since) are reported and applied to nothing."""
    f = folder / f'{short}.json'
    if not f.is_file():
        return None
    doc = json.loads(f.read_text(encoding='utf-8'))
    now = script_hash(plugin, short)
    out = {'file': str(f), 'scriptHash': doc.get('scriptHash'), 'currentHash': now, 'proved': 0, 'removed': [], 'refiled': [], 'unmatched': []}
    if doc.get('scriptHash') != now:
        out['stale'] = True
        return out
    for v in doc.get('entries', []):
        k = key(v)
        e = entries.get(k)
        if e is None or e.get('unproved') not in BROWSER_CAUSES:
            out['unmatched'].append({x: v[x] for x in ('setting', 'part', 'props', 'state', 'tiers')})
            continue
        if v['verdict'] == 'proved':
            e.pop('unproved', None)
            e['kind'] = v['kind']
            out['proved'] += 1
        elif v['verdict'] == 'removed':
            entries.pop(k)
            out['removed'].append({'entry': list(k), 'values': v.get('values')})
        elif v['verdict'] == 'refiled' and v.get('refiled_to'):
            entries.pop(k)
            for part in v['refiled_to']:
                moved = {**e, 'part': part, 'kind': v.get('kind') or e.get('kind')}
                moved.pop('unproved', None)
                entries[key(moved)] = moved
            out['refiled'].append({'entry': list(k), 'to': v['refiled_to']})
    return out


def place(e: dict) -> tuple:
    return (e['setting'], e['part'], tuple(e['props']))


# ---------------------------------------------------------------- running the code
def load_plan(short: str, plugin: Path, fixtures: dict, instances: Path | None, plain: bool = False) -> dict:
    """The instance plan: a saved one (replay) or one generated from block.json. The check's plan renders the fixture's
    `checkAttributes` over its `attributes` (instances.py::check_fixture); `plain` plans the block as a new node renders
    it, `attributes` alone (the site look)."""
    import instances as I
    if instances:
        pl = json.loads(instances.read_text(encoding='utf-8'))
        fx = dict(fixtures.get(f'sgs/{short}') or {})
        fx.update(pl.get('fixture') or {})
        pl['fixture'] = fx
        return pl
    pl = I.plan(short, plugin, fixtures, plain=plain)
    raw = fixtures.get(f'sgs/{short}') or {}
    raw = {k: v for k, v in raw.items() if k != 'checkAttributes'} if plain else I.check_fixture(raw)
    pl['fixture'] = {**raw, **(pl.get('fixture') or {})}
    return pl


REPLACE_MIN_PARTS = 3


def replaces_block(base_html: str, changed_html: str, short: str) -> bool:
    """True when the changed render keeps none of the block's own parts that the plain one prints (or prints nothing), or
    drops the block's root element (its `sgs-<block>` or `wp-block-sgs-<block>` class) the plain one prints: the setting
    removed the block or swapped it for other markup. Markup the block queued for elsewhere (a detached burger printed at
    wp_footer) can outlive the block itself, so the root is what says whether the block is still on the page."""
    part = re.compile(rf'\bsgs-{re.escape(short)}__[a-z0-9-]+')
    rooted = re.compile(rf'\bclass\s*=\s*["\'](?:[^"\']*\s)?(?:wp-block-)?sgs-{re.escape(short)}(?=[\s"\'])')
    strip = lambda h: re.sub(r'<style\b.*?</style>', '', h or '', flags=re.S)  # noqa: E731
    before, after = strip(base_html), strip(changed_html)
    if not after.strip() and before.strip():
        return True
    if rooted.search(before) and not rooted.search(after):
        return True
    # the parts the plain render prints, none of them left: a notice of the block's own (`sgs-form__fallback-message`) is
    # other markup in place of the block, not the block repainted. A block of one or two parts can swap them for others
    # as a paint (an icon's svg for an image), so the rule asks for REPLACE_MIN_PARTS printed parts.
    printed, left = set(part.findall(before)), set(part.findall(after))
    if printed and not left:
        return True
    return len(printed) >= REPLACE_MIN_PARTS and not (printed & left)


def prints_root(html: str, short: str) -> bool:
    """True when the render prints the block's own root element (its `sgs-<block>` or `wp-block-sgs-<block>` class)."""
    return any(f'sgs-{short}' in m.split() or f'wp-block-sgs-{short}' in m.split()
               for m in (g for _q, g in re.findall(r'class=(["\'])(.*?)\1', html or '', re.S)))


def variant_faults(defaults: list, short: str, expected: dict | None = None) -> list:
    """The fixture variants (beyond variant 0, which the coverage floor reads) whose own default render prints nothing, or
    not the block's root: [{variant, why}]. defaults: [(variant index, the render's html)]. expected: the fixture's
    `expectEmpty` ({variant: why}), the variants that print nothing on purpose (a picture block with no picture): such a
    variant is no fault while it prints nothing, and a fault once it prints anything, so the mark cannot go stale."""
    expected = {int(k): v for k, v in (expected or {}).items()}
    out = []
    for variant, html in sorted(defaults):
        if variant == 0:
            continue
        bare = re.sub(r'<style\b.*?</style>', '', html or '', flags=re.S).strip()
        if variant in expected:
            if bare:
                out.append({'variant': variant, 'why': 'is marked expectEmpty in its fixture but prints markup'})
        elif not bare:
            out.append({'variant': variant, 'why': 'renders nothing'})
        elif not prints_root(bare, short):
            out.append({'variant': variant, 'why': 'does not print the block root'})
    return out


def run_block(short: str, plugin: Path, fixtures: dict, fixtures_dir: Path, instances: Path | None = None) -> dict:
    """Every setting's placements, with the renders behind each, the default render and timing."""
    t0 = time.time()
    pl = load_plan(short, plugin, fixtures, instances)
    fixture = pl['fixture'] or {}
    rn = RN.Renderer(plugin, fixture, fixtures_dir, short)
    slug = f'sgs/{short}'
    content, inner = rn.render_inner(fixture.get('inner'))
    if not fixture.get('inner') and fixture.get('content'):
        content = fixture['content']  # saved markup a parent block echoes as $content, when it has no rendered children
    children =sorted(set(re.findall(r'"name": "sgs/([a-z0-9-]+)"', json.dumps(fixture.get('inner') or []))))
    sheets = D.static_rules(plugin, short, children)
    sheet_files = D.sheet_files(plugin, short, children)
    insts = [i for i in pl['instances'] if not i.get('discover')]
    jobs = {}
    for i in insts:
        a = RN.with_defaults(plugin, short, RN.fill(i['attrs']))
        i['_key'] = RN.hashlib.md5(json.dumps(a, sort_keys=True).encode()).hexdigest()
        jobs[i['_key']] = a
    t1 = time.time()
    results = rn.render_many(slug, jobs, content, inner)
    t2 = time.time()
    defaults = {i['variant']: i for i in insts if i['isDefault']}
    bases = {i['baseKey']: i for i in insts if i['isBase']}
    reads = {k: D.read(r, short) if r.get('ok') else None for k, r in results.items()}
    settings, sources, log, replaced = {}, {}, [], set()
    for i in insts:
        if not i['attr'] or i['isDefault'] or i['isBase'] or i.get('paintState'):
            continue
        base = bases.get(i['baseKey']) if i['baseKey'] else defaults.get(i['variant'])
        rb, rm = reads.get(base['_key']) if base else None, reads.get(i['_key'])
        entry = {'key': i['key'], 'attr': i['attr'], 'base': base['key'] if base else None}
        if rb is None or rm is None:
            entry['error'] = ((results[i['_key']].get('error') or (results[base['_key']].get('error') if base else '')) or 'no base')[:300]
            log.append(entry)
            continue
        if replaces_block(results[base['_key']].get('html', ''), results[i['_key']].get('html', ''), short):
            # the setting removes the block from the page or swaps it for other markup (a visibility condition, a broken
            # reference notice): that is what it does, not a paint on the block's parts, so no placement comes from it
            replaced.add(i['attr'])
            entry.update(replacesBlock=True, n=0)
            log.append(entry)
            continue
        pls, info = D.diff_placements(rb, rm, short, sheets)
        entry.update(info, n=len(pls))
        log.append(entry)
        for p in pls:
            p['_pair'] = (base['_key'], i['_key'])
        settings.setdefault(i['attr'], []).extend(pls)
    d0 = results.get(defaults.get(0, {}).get('_key')) or {}
    first = re.search(r'<(?!style)[a-z][^>]*>', re.sub(r'<style.*?</style>', '', d0.get('html', ''), flags=re.S))
    rc = re.search(r'class="([^"]*)"', first.group(0)) if first else None
    aliases = sorted({c for c in (rc.group(1).split() if rc else []) if c.startswith('sgs-') and '__' not in c and '--' not in c
                      and not D.UID_RE.fullmatch(c) and c != f'sgs-{short}'})
    attrs = RN.block_json(plugin, short).get('attributes', {})
    entries, pairs, sels, unnamed, sides = {}, {}, {}, [], {}
    for a, placements in V.fold_units(attrs, settings).items():
        its, _twins = V.fold_prefixed(V.items(placements, f'sgs-{short}', tuple(aliases)))
        for it in its:
            e = {'setting': a, 'part': it['part'], 'props': it['props'], 'state': it['state'], 'tiers': it['tiers'], 'selector': it.get('selector')}
            if e['part'] is None:
                # the scanner's selector reader could not name the part (block-source-scan/selector_eval.py::analyse_selector)
                unnamed.append(e)
                continue
            entries[key(e)] = e
        # every render pair behind a (setting, part, props, state, tiers), for the proof
        for p in placements:
            for it in V.items([p], f'sgs-{short}', tuple(aliases)):
                k = (a, it['part'], tuple(it['props']), it['state'], tuple(it['tiers']))
                pairs.setdefault(k, set()).add(p['_pair'])
                sides.setdefault(k, set()).add((p['_pair'], p.get('side') or 'changed'))
                if p.get('selector'):
                    sels.setdefault(k, set()).add(p['selector'])
    errors = sorted({(results[k].get('error') or '')[:200] for k in results if not results[k].get('ok')})
    # Every setting is accounted for: in the record (an entry), tested and painting nothing (its renders changed no CSS,
    # class, attribute or style anywhere), or not tested (`unvalued`, with the reason the generator could not value it).
    tried = {i['attr'] for i in insts if i['attr'] and not i['isDefault'] and not i['isBase'] and not i.get('paintState')}
    tested = {e['attr'] for e in log if not e.get('error')}
    recorded = {e['setting'] for e in entries.values()} | {e['setting'] for e in unnamed}
    # The coverage floor: a default render that prints nothing, or not the block's own root, tests nothing, so every
    # setting would read as painting nothing; such a block fails until its fixture renders it.
    root_printed = prints_root(d0.get('html', ''), short)
    # A fixture variant beyond the plain block is a render the check and the site look draw from too: one that prints
    # nothing (a menu `ref` no stand-in post answers, a map keyed by a placeholder nothing fills) tests nothing and hides
    # the parts it was written to draw.
    empty_variants = variant_faults([(i['variant'], results[i['_key']].get('html', '')) for i in insts if i['isDefault']], short, fixture.get('expectEmpty'))
    stats = {'block': slug, 'instances': len(insts), 'renders': len(jobs), 'failed': sum(1 for r in results.values() if not r.get('ok')),
             'errors': errors[:10], 'secondsRendering': round(t2 - t1, 1), 'secondsRun': round(time.time() - t0, 1),
             'testedNoPaint': sorted(tested - recorded - replaced), 'replacesBlock': sorted(replaced - recorded),
             'unvalued': pl.get('unvalued') or [], 'renderFailedOnly': sorted(tried - tested - replaced),
             # settings that painted nothing here although the source scanner finds CSS the code writes from them: a
             # partner the fixture leaves off, content it lacks, or a fault (summarise.py buckets them)
             'noPaintButPlaced': sorted((tested - recorded - replaced) & set(pl.get('rows') or [])),
             'coverage': {'defaultRendered': bool(d0.get('ok')), 'defaultEmpty': not (d0.get('html') or '').strip(),
                          'rootPrinted': root_printed},
             'emptyVariants': empty_variants}
    # the plan's own renders, before the proof adds its own (proof.py::Pages stores completions and parent renders in
    # `results`): the stamp's output hash and rendered classes read these, as the gate's re-render does
    return {'entries': entries, 'unnamed': unnamed, 'pairs': pairs, 'sides': sides, 'selectors': sels, 'results': results,
            'planResults': dict(results), 'children': children, 'plugin': plugin, 'jobs': jobs, 'defaultHtml': d0.get('html', ''), 'stats': stats,
            'log': log, 'aliases': aliases, 'sheets': sheets, 'renderer': rn, 'plan': pl, 'slug': slug, 'content': content, 'inner': inner, 'sheetFiles': sheet_files}


def entry_values(run: dict) -> dict:
    """{entry key: the setting values whose renders produced it}, from each placement's render pair: the changed render's
    value, or for a rule only the plain render holds (diff.py::diff_placements `side` base) the plain render's value, its
    block.json default when the plain render leaves the setting unset."""
    out = {}
    jobs = run.get('jobs') or {}
    schema = {}
    if run.get('plugin') and run.get('slug'):
        schema = RN.block_json(run['plugin'], run['slug'].split('/', 1)[1]).get('attributes') or {}
    for k, pairs in (run.get('pairs') or {}).items():
        vals = []
        sided = (run.get('sides') or {}).get(k) or {(p, 'changed') for p in pairs}
        for (b, c), side in sorted(sided, key=lambda x: json.dumps(x)):
            if side == 'base':
                a = jobs.get(b) or {}
                v = a.get(k[0], (schema.get(k[0]) or {}).get('default'))
            else:
                v = (jobs.get(c) or {}).get(k[0])
            if v is not None and v not in vals:
                vals.append(v)
        if vals:
            out[k] = sorted(vals, key=lambda v: json.dumps(v, sort_keys=True))
    return out


NUMBER = re.compile(r'(-?\d+(?:\.\d+)?)px')


def _number(v):
    """A setting value as a number of pixels (768, '768', '768px'), else None."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.fullmatch(r'\s*(-?\d+(?:\.\d+)?)(?:px)?\s*', str(v))
    return float(m.group(1)) if m else None


def symbolic_tiers(entries: list) -> None:
    """Marks the entries whose media condition is written from the setting's own value (a breakpoint setting such as
    collapsePoint: includes/nav-menu-submenu-css.php writes media_width('max', value - 1), which
    class-sgs-breakpoints.php::query_width ends in .98, so the edge sits at value - 0.02). Two entries of one setting,
    part, properties and state, each produced by one numeric value, whose conditions differ only in pixel numbers that
    move one for one with the value (the same offset from it at every such place, all of one edge) both get
    `symbolic: {edge, setting, offset}`: a reader substitutes the site's value; the literal tier stays the key."""
    groups = {}
    for e in entries:
        vals = e.get('values') or []
        n = _number(vals[0]) if len(vals) == 1 else None
        if n is not None and e.get('tiers'):
            groups.setdefault((e['setting'], e['part'], tuple(e['props']), e.get('state')), []).append((n, e))
    for rows in groups.values():
        found = {}
        for i, (v1, e1) in enumerate(rows):
            for v2, e2 in rows[i + 1:]:
                if v1 == v2:
                    continue
                t1, t2 = ' '.join(e1['tiers']), ' '.join(e2['tiers'])
                if NUMBER.sub('#', t1) != NUMBER.sub('#', t2):
                    continue
                n1 = [(m.start(), float(m.group(1))) for m in NUMBER.finditer(t1)]
                n2 = [float(m.group(1)) for m in NUMBER.finditer(t2)]
                moved = [(pos, a, b) for (pos, a), b in zip(n1, n2) if a != b]
                if not moved:
                    continue
                offsets = {round(a - v1, 4) for _p, a, _b in moved} | {round(b - v2, 4) for _p, _a, b in moved}
                edges = {('max' if t1[:pos].rstrip().endswith('max-width:') else 'min' if t1[:pos].rstrip().endswith('min-width:') else None)
                         for pos, _a, _b in moved}
                if len(offsets) == 1 and len(edges) == 1 and None not in edges:
                    note = {'edge': edges.pop(), 'setting': e1['setting'], 'offset': offsets.pop()}
                    found[id(e1)], found[id(e2)] = (e1, note), (e2, note)
        for e, note in found.values():
            e['symbolic'] = note


# ---------------------------------------------------------------- comparing
def compare(record: list, run: dict) -> dict:
    checked = [e for e in record if not e.get('runner')]
    skipped = [e for e in record if e.get('runner')]
    rec = {key(e): e for e in checked}
    add = [run[k] for k in run if k not in rec]
    remove = [rec[k] for k in rec if k not in run]
    add_places, rem_places = {}, {}
    for e in add:
        add_places.setdefault(place(e), []).append(e)
    for e in remove:
        rem_places.setdefault(place(e), []).append(e)
    change = []
    for pl in sorted(set(add_places) & set(rem_places), key=str):
        change.append({'setting': pl[0], 'part': pl[1], 'props': list(pl[2]),
                       'record': [[e['state'], e['tiers']] for e in rem_places[pl]], 'code': [[e['state'], e['tiers']] for e in add_places[pl]]})
    changed = {(c['setting'], c['part'], tuple(c['props'])) for c in change}
    add = [e for e in add if place(e) not in changed]
    remove = [e for e in remove if place(e) not in changed]
    return {'add': add, 'remove': remove, 'change': change, 'skipped': skipped,
            'confirmed': len(checked) - len(remove) - sum(len(rem_places[p]) for p in changed)}


def parts_check(short: str, plugin: Path, html: str) -> dict:
    """Declared parts against the default render (and the block's scripts, for parts only a script builds)."""
    from bs4 import BeautifulSoup
    import soupsieve as sv
    bdir = plugin / 'src' / 'blocks' / short
    bj = json.loads((bdir / 'block.json').read_text(encoding='utf-8'))
    elements = ((bj.get('supports') or {}).get('sgs') or {}).get('elements') or {}
    scripts = ' '.join(f.read_text(encoding='utf-8', errors='ignore') for f in bdir.glob('*.js')
                       if f.name not in ('edit.js', 'index.js', 'save.js') and not f.name[0].isupper())
    printed = []
    for m in re.finditer(r'class="([^"]*)"', html):
        for c in m.group(1).split():
            if re.fullmatch(rf'sgs-{re.escape(short)}__[a-z0-9]+(?:-[a-z0-9]+)*', c) and c not in printed:
                printed.append(c)
    declared, not_printed, script_only = {}, [], []
    soup = BeautifulSoup(html, 'html.parser')
    for name, el in elements.items():
        sel = el.get('selector') if isinstance(el, dict) else None
        if not sel:
            continue
        for c in re.findall(r'\.(sgs-[a-z0-9_-]+)', sel):
            declared[re.sub(r'--[a-z0-9-]+$', '', c)] = name
        try:
            found = bool(sv.select(re.sub(r':(hover|focus-visible|focus|active)\b', '', sel), soup))
        except Exception:
            found = False
        if found:
            continue
        classes = [re.sub(r'--[a-z0-9-]+$', '', c) for c in re.findall(r'\.(sgs-[a-z0-9_-]+)', sel)]
        (script_only if classes and classes[-1] in scripts else not_printed).append({'part': name, 'selector': sel})
    undeclared = [c for c in printed if c not in declared]
    return {'order': printed, 'declaredNotPrinted': not_printed, 'declaredScriptBuilt': script_only, 'printedNotDeclared': undeclared}


def schema_errors(doc: dict, need_kind: bool) -> list:
    import jsonschema
    schema = json.loads(SCHEMA.read_text(encoding='utf-8'))
    if not need_kind:
        schema['properties']['entries']['items'].pop('then', None)
    return [f'{"/".join(str(p) for p in e.absolute_path)}: {e.message}' for e in jsonschema.Draft202012Validator(schema).iter_errors(doc)][:20]


def cache_list(plain_keys, cache: dict) -> list:
    """The proof's outcomes in `proofKeys` order (one object per key: fingerprint, verdict, kind, cause, re-file target)."""
    return [cache.get(json.dumps(list(k[:2]) + [list(k[2]), k[3], list(k[4])])) or {} for k in plain_keys]


def new_stamp(args, short: str, run: dict, fixtures: dict) -> dict:
    """The stamp a record written or refreshed now carries (stamp.py::make_stamp)."""
    import stamp as ST
    import theme as TH
    return ST.make_stamp(args.plugin, short, fixtures.get(f'sgs/{short}') or {}, fixtures.get('_shared') or {},
                         args.fixtures.parent, run.get('planResults') or run['results'], run['renderer'].included,
                         run.get('proofSheetFiles') or run['sheetFiles'], TH.theme_css(Path(args.plugin).resolve().parents[1]))


def print_findings(block: str, res: dict, parts: dict, errs: list, limit: int = 12) -> None:
    """What differs between the code and the record, entry by entry, and the command that rewrites the record."""
    import changed as CH

    def show(e):
        where = ' '.join(x for x in (e.get('state') or '', ' '.join(e.get('tiers') or [])) if x)
        return f"{e['setting']} -> {e['part']} {'/'.join(e['props'])}{' ' + where if where else ''}"
    lines = [f'  the code paints, the record lacks: {show(e)}' for e in res['add']]
    lines += [f'  the record has, the code no longer paints: {show(e)}' for e in res['remove']]
    lines += [f"  {c['setting']} -> {c['part']} {'/'.join(c['props'])}: record {c['record']}, code {c['code']}" for c in res['change']]
    if parts.get('orderChanged'):
        lines.append(f"  part order: record {parts['orderChanged']['record']}, code {parts['orderChanged']['code']}")
    lines += [f'  record file: {e}' for e in errs]
    print(f'{block}: its record differs from the code ({len(lines)} finding(s))', file=sys.stderr)
    for ln in lines[:limit]:
        print(ln, file=sys.stderr)
    if len(lines) > limit:
        print(f'  ... and {len(lines) - limit} more in the report ({block.split("/", 1)[1]}.check.json)', file=sys.stderr)
    print(f'  if the change is intended, rewrite the record and commit it with the change: {CH.fix_command(block)}', file=sys.stderr)


def check_changed(args) -> int:
    """The build gate: the blocks a change touches (changed.py::plan), checked against the committed records."""
    import changed as CH
    import stamp as ST
    records_dir = args.record_dir or RECORDS
    p = CH.plan(args.plugin, records_dir, args.fixtures)
    for m in p['problems']:
        print(f'FAIL {m}', file=sys.stderr)
    blocks = list(p['full'])
    for b in blocks:
        print(f"{b}: checked ({'; '.join(p['reasons'][b]['own'][:3])})")
    fixtures = json.loads(args.fixtures.read_text(encoding='utf-8')) if args.fixtures.is_file() else {}
    for b in p['canary']:
        short = b.split('/', 1)[1]
        run = run_block(short, args.plugin, fixtures, args.fixtures.parent, None)
        stamped = (json.loads((records_dir / f'{short}.json').read_text(encoding='utf-8')).get('stamp') or {}).get('outputs')
        if ST.outputs_hash(run['planResults']) != stamped:
            print(f'{b}: a file every block loads changed and its renders moved: checked')
            blocks.append(b)
        else:
            print(f'{b}: a file every block loads changed; its renders are the same')
    worst = 0
    if blocks:
        args.record_dir, args.blocks = records_dir, [b.split('/', 1)[1] for b in blocks]
        worst = check_block(args, args.blocks[0]) if len(blocks) == 1 else check_many(args)
    else:
        print(f'setting record: no block touched ({len(CH.load_records(records_dir))} records)')
    for b, why in p['staleVerdicts']:
        print(f'{"FAIL" if not args.no_proof else "WARN"} {b}: {why}', file=sys.stderr)
    stale_fails = bool(p['staleVerdicts']) and not args.no_proof  # the full tier (pre-deploy) fails on them
    if getattr(args, 'restamp', False) and p['canary'] and worst == 0 and not p['problems']:
        # the canaries carried the core change without a finding: every record's core inputs are current again (a block
        # on the pending list keeps its stamp: it was not checked under the new core)
        refreshed = ST.refresh_core(args.plugin, records_dir, skip={f"{b.split('/', 1)[1]}.json" for b in CH.load_pending()})
        print(f'core change accepted on {", ".join(p["canary"])}: {len(refreshed)} stamps refreshed')
    return max(worst, 1 if (p['problems'] or stale_fails) else 0)


# ---------------------------------------------------------------- one block
def check_block(args, block: str) -> int:
    t0 = time.time()
    short = block.split('/', 1)[-1]
    fixtures = json.loads(args.fixtures.read_text(encoding='utf-8')) if args.fixtures.is_file() else {}
    instances = args.instances or (args.instances_dir / f'plan-{short}.json' if args.instances_dir else None)
    run = run_block(short, args.plugin, fixtures, args.fixtures.parent, instances)
    entries = run['entries']
    plain_keys = sorted(run['entries'], key=json.dumps)  # what the plain comparison sees, before the proof
    proof = None
    restamp_doc = None
    if not args.no_proof:
        import proof as PR
        tp = time.time()
        # the outcomes an earlier proof of this block found, each with its fingerprint (proof.py::Fingerprints): an
        # entry whose inputs have not moved is not proved again (--fresh proves every entry)
        prior = args.write or (args.write_dir / f'{short}.json' if args.write_dir else None) or args.record \
            or (args.record_dir / f'{short}.json' if args.record_dir else None)
        if prior and prior.is_file() and not getattr(args, 'fresh', False):
            pd = json.loads(prior.read_text(encoding='utf-8'))
            run['reuse'] = dict(zip((json.dumps(k) for k in pd.get('proofKeys') or []), pd.get('proofCache') or []))
        entries, proof = PR.prove(short, run)
        proof_cache = proof.pop('cache', {})
        proof['seconds'] = round(time.time() - tp, 1)
        browser = apply_browser_verdicts(short, args.plugin, entries)
        if browser is not None:
            proof['browser'] = browser
    parts = parts_check(short, args.plugin, run['defaultHtml'])
    record_file = args.record or (args.record_dir / f'{short}.json' if args.record_dir else None)
    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    report = {'block': f'sgs/{short}', **run['stats'], 'secondsTotal': None, 'partNotNamed': run['unnamed']}
    bad = False
    write = args.write or (args.write_dir / f'{short}.json' if args.write_dir else None)
    if write:
        kept = []
        if write.is_file():
            kept = [e for e in json.loads(write.read_text(encoding='utf-8')).get('entries', []) if e.get('runner')]
        values = entry_values(run)
        doc = {'block': f'sgs/{short}', 'schemaVersion': 2, 'parts': parts['order'],
               'entries': sorted(kept + [{**{k: v for k, v in e.items() if v is not None or k == 'state'},
                                          **({'values': values[key(e)]} if values.get(key(e)) else {})} for e in entries.values()],
                                 key=lambda e: json.dumps(key(e))),
               'proofKeys': [list(k[:2]) + [list(k[2]), k[3], list(k[4])] for k in plain_keys],
               **({'proofCache': cache_list(plain_keys, proof_cache)} if proof is not None else {}),
               'accounted': {'testedNoPaint': run['stats']['testedNoPaint'], 'replacesBlock': run['stats']['replacesBlock'],
                             'unvalued': run['stats']['unvalued'], 'partNotNamed': run['unnamed']},
               'stamp': new_stamp(args, short, run, fixtures)}
        if write.resolve().parent == RECORDS.resolve():
            if args.no_proof:
                raise SystemExit(f'refusing to write {write} without the proof: a record in {RECORDS} carries proved kinds')
            if kept:
                # seed_reference_data.py::_parse_setting_records refuses an unchecked entry, so none is written here
                raise SystemExit(f'refusing to write {write}: it keeps entries marked runner (unchecked), which the '
                                 f'database seeder refuses: ' + ', '.join(sorted({e["setting"] for e in kept})))
        symbolic_tiers(doc['entries'])
        import accept as AC
        report['accepted'] = AC.mark_against_folder(doc, write.parent)
        errs = schema_errors(doc, need_kind=not args.no_proof)
        write.parent.mkdir(parents=True, exist_ok=True)
        write.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
        report.update(written=str(write), entries=len(doc['entries']), schemaErrors=errs)
        bad = bool(errs)
    if record_file:
        doc = json.loads(record_file.read_text(encoding='utf-8'))
        if args.no_proof and doc.get('proofKeys') is not None:
            # without the proof, the run's keys are the plain ones: compare them with the plain keys the record was proved from
            plain = [dict(zip(('setting', 'part', 'props', 'state', 'tiers'), k)) for k in doc['proofKeys']]
            res = compare(plain, entries)
        else:
            res = compare(doc['entries'], entries)
        if doc.get('parts') != parts['order']:
            parts['orderChanged'] = {'record': doc.get('parts'), 'code': parts['order']}
        errs = schema_errors(doc, need_kind=not args.no_proof)
        report.update(recordEntries=len(doc['entries']), confirmed=res['confirmed'], add=res['add'], remove=res['remove'], change=res['change'],
                      skippedRunnerCannotSee=[{k: e[k] for k in ('setting', 'part', 'props', 'runner')} for e in res['skipped']], schemaErrors=errs)
        bad = bad or bool(res['add'] or res['remove'] or res['change'] or parts.get('orderChanged') or errs)
        # A part block.json declares but nothing prints, or one printed but never declared, is a fault in the block, not
        # in its record: reported always, failing only with --strict-parts (until every block's declarations are whole).
        bad = bad or (args.strict_parts and bool(parts['declaredNotPrinted'] or parts['printedNotDeclared']))
        if bad:
            print_findings(f'sgs/{short}', res, parts, errs)
        elif getattr(args, 'restamp', False):
            if args.no_proof:
                raise SystemExit('--restamp needs the proof: a stamp says the record was checked in full against these files')
            restamp_doc = doc  # written below, once the coverage floor has passed too
    cov = run['stats']['coverage']
    floor = [] if cov['rootPrinted'] else ['the default render ' + ('is empty' if cov['defaultEmpty'] else 'does not print the block root')]
    for v in run['stats'].get('emptyVariants') or []:
        floor.append(f"fixture variant {v['variant']} {v['why']}")
    if run['stats']['renderFailedOnly']:
        floor.append(f"{len(run['stats']['renderFailedOnly'])} setting(s) whose every render failed")
    report['coverageFloor'] = floor
    for f in floor:
        print(f'sgs/{short}: {f}: its fixture must render the block (fixtures.json; README, Reading a report)')
    bad = bad or bool(floor)
    if restamp_doc is not None and not bad:
        restamp_doc['stamp'] = new_stamp(args, short, run, fixtures)
        restamp_doc['proofKeys'] = [list(k[:2]) + [list(k[2]), k[3], list(k[4])] for k in plain_keys]
        restamp_doc['proofCache'] = cache_list(plain_keys, proof_cache)
        record_file.write_text(json.dumps(restamp_doc, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
        report['restamped'] = str(record_file)
    report['parts'] = parts
    if proof is not None:
        report['proof'] = proof
    report['secondsTotal'] = round(time.time() - t0, 1)
    (out / f'{short}.check.json').write_text(json.dumps(report, indent=1, default=list), encoding='utf-8')
    summary = {k: (len(v) if isinstance(v, list) else v) for k, v in report.items() if k not in ('parts', 'proof', 'errors')}
    summary['parts'] = {k: (v if k in ('order', 'orderChanged') else len(v)) for k, v in parts.items()}
    if proof is not None:
        summary['proof'] = proof.get('counts')
    print(json.dumps(summary))
    return 1 if bad else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('blocks', nargs='*')
    ap.add_argument('--record', type=Path)
    ap.add_argument('--record-dir', type=Path)
    ap.add_argument('--write', type=Path)
    ap.add_argument('--write-dir', type=Path)
    ap.add_argument('--plugin', type=Path, default=RN.DEFAULT_PLUGIN)
    ap.add_argument('--fixtures', type=Path, default=FIXTURES)
    ap.add_argument('--instances', type=Path)
    ap.add_argument('--instances-dir', type=Path)
    ap.add_argument('--no-proof', action='store_true')
    ap.add_argument('--fresh', action='store_true', help="prove every entry, ignoring the record's saved proof outcomes")
    ap.add_argument('--strict-parts', action='store_true', help='also fail on parts block.json declares but nothing prints, or prints but never declares')
    ap.add_argument('--out', type=Path, default=RN.CACHE_ROOT / 'reports')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--changed', action='store_true', help='only the blocks a change touches, against the committed records (the build gate)')
    ap.add_argument('--restamp', action='store_true', help="refresh the stamp of each record whose check passes (needs the proof)")
    ap.add_argument('--all', action='store_true', help='every block in src/blocks (from its block.json)')
    ap.add_argument('--jobs', type=int, default=int(os.environ.get('SGS_SETTING_RECORD_JOBS') or 0),
                    help='blocks checked at once with several blocks (default: a quarter of the cores, at least 2)')
    args = ap.parse_args(argv)
    if args.all:
        import seed_fixtures
        args.blocks = [n.split('/', 1)[1] for n in seed_fixtures.roster(args.plugin)]
    if args.self_test:
        import selftest
        return selftest.main(args)
    if args.changed:
        return check_changed(args)
    if not args.blocks:
        ap.error('name a block, or --self-test')
    if len(args.blocks) == 1:
        return check_block(args, args.blocks[0])
    if args.record or args.write:
        ap.error('--record and --write name one block file; with several blocks use --record-dir and --write-dir')
    return check_many(args)


def _size(plugin: Path, block: str) -> int:
    """How many attributes a block has: the pool starts the biggest first, so the longest block never runs last."""
    try:
        return len(RN.block_json(plugin, block.split('/', 1)[-1]).get('attributes') or {})
    except (OSError, ValueError):
        return 0


def _check_in_worker(args, block: str) -> int:
    """One block in a pool worker; an exception is that block's failure, never the run's."""
    try:
        return check_block(args, block)
    except (Exception, SystemExit) as exc:  # noqa: BLE001 - reported per block, the pool carries on
        print(json.dumps({'block': f"sgs/{block.split('/', 1)[-1]}", 'crashed': f'{type(exc).__name__}: {exc}'[:500]}), flush=True)
        return 2


def check_many(args) -> int:
    """Several blocks in a bounded pool of long-lived worker processes: each worker builds the scanner's whole-plugin
    helper index once (block-source-scan/common.py::contracts is cached per process) and checks many blocks; the biggest
    blocks start first; each block prints its line when it finishes."""
    from concurrent.futures import ProcessPoolExecutor, as_completed
    cores = os.cpu_count() or 8
    jobs = max(1, min(len(args.blocks), args.jobs or max(2, cores // 4)))
    os.environ.setdefault('SGS_SETTING_RECORD_WORKERS', str(max(2, cores // jobs)))
    blocks = sorted(args.blocks, key=lambda b: -_size(args.plugin, b))
    worst = 0
    with ProcessPoolExecutor(max_workers=jobs) as pool:
        futures = {pool.submit(_check_in_worker, args, b): b for b in blocks}
        for f in as_completed(futures):
            worst = max(worst, f.result())
    return worst


if __name__ == '__main__':
    sys.exit(main())
