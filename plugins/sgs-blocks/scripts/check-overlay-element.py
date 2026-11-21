#!/usr/bin/env python3
"""check-overlay-element.py: every block that prints the background overlay declares what its overlay settings paint (Spec 02 FR-2-37).

WHAT IT ENFORCES
    A block whose block.json holds the background overlay settings (backgroundOverlayGradient, backgroundOverlayColour,
    backgroundOverlayOpacity, backgroundOverlayBlend and the Hover siblings) prints them on one element, the overlay span
    the shared background renderer writes as a direct child of the block's root (includes/media/background-css.php::
    sgs_bg_overlay_css prints `.<uid> > .sgs-bg-overlay`; assets/css/media-bg.css places it). Calibration and the route
    read a setting only where block.json says what it paints, so each such block declares the element `overlay` in
    supports.sgs.elements:
        selector ".sgs-bg-overlay", prefix "" and no clusters (it claims nothing by name convention), "motion": false
        (Sgs_Motion_Targets::parts and the motion_targets seeder skip it, so no motion target moves), an attrMap of each
        resting setting the block holds (gradient background-image, colour background-color, opacity opacity, blend
        mix-blend-mode) and states.hover.attrMap of each hover setting (colour background-color, gradient
        background-image; the hover rule is `.<uid> > .sgs-bg-overlay:hover`).
    No other element of the block may name an overlay setting in its attrMap (a wrapper declaration of the overlay
    colour as the root's background-image was wrong: the overlay paints its own span, never the root).

    python check-overlay-element.py --survey [--json] | --fix [--apply] | --check | --self-test

    --fix prints the unified diff; --fix --apply writes it (atomic). The edit is textual (the file's own indentation is
    kept): the element is appended to supports.sgs.elements and a stray overlay line is removed from another element's
    attrMap; the result is verified by parsing (it must equal the original with exactly those changes).
"""
import argparse
import difflib
import json
import os
import re
import shutil
import sys
import tempfile

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        pass

PLUGIN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCKS = os.path.join(PLUGIN, 'src', 'blocks')
PART = 'overlay'
SELECTOR = '.sgs-bg-overlay'
REST = (('css:background-image', 'backgroundOverlayGradient'), ('css:background-color', 'backgroundOverlayColour'), ('css:opacity', 'backgroundOverlayOpacity'), ('css:mix-blend-mode', 'backgroundOverlayBlend'))
HOVER = (('css:background-color', 'backgroundOverlayColourHover'), ('css:background-image', 'backgroundOverlayGradientHover'))
SETTINGS = {a for _, a in REST + HOVER}
NOTE = 'The overlay span the shared background renderer prints as a direct child of the root (`.<uid> > .sgs-bg-overlay`, includes/media/background-css.php::sgs_bg_overlay_css; assets/css/media-bg.css places it). Declared so calibration reads what each overlay setting paints; not a motion target. Written by scripts/check-overlay-element.py --fix.'


def read_blocks(root):
    out = []
    for name in sorted(os.listdir(root)):
        path = os.path.join(root, name, 'block.json')
        if os.path.isfile(path):
            with open(path, encoding='utf-8') as fh:
                text = fh.read()
            out.append((name, path, text, json.loads(text)))
    return out


def elements_of(data):
    sgs = (data.get('supports') or {}).get('sgs')
    els = sgs.get('elements') if isinstance(sgs, dict) else None
    return els if isinstance(els, dict) else None


def wanted(attrs):
    """The overlay element for a block holding `attrs`, or None when it holds no overlay setting."""
    rest = {k: a for k, a in REST if a in attrs}
    hover = {k: a for k, a in HOVER if a in attrs}
    if not rest and not hover:
        return None
    el = {'selector': SELECTOR, 'prefix': '', 'label': 'Background overlay', 'clusters': [], 'motion': False}
    if rest:
        el['attrMap'] = rest
    if hover:
        el['states'] = {'hover': {'attrMap': hover}}
    el['_note'] = NOTE
    return el


def core(el):
    """The parts of an element the check compares (label, order and note are free)."""
    el = el if isinstance(el, dict) else {}
    return {k: el.get(k) for k in ('selector', 'prefix', 'clusters', 'motion', 'attrMap', 'states')}


def strays(els):
    """[(element, map path, css key, attr)] for every overlay setting another element's attrMap names."""
    out = []
    for key, el in (els or {}).items():
        if key == PART or not isinstance(el, dict):
            continue
        maps = [('attrMap', el.get('attrMap') or {})] + [(f'states.{s}.attrMap', (st or {}).get('attrMap') or {}) for s, st in (el.get('states') or {}).items() if isinstance(st, dict)]
        for where, m in maps:
            for css, attr in m.items():
                if attr in SETTINGS:
                    out.append((key, where, css, attr))
    return out


def survey(root=BLOCKS):
    rows = []
    for folder, path, text, data in read_blocks(root):
        want = wanted(data.get('attributes') or {})
        els = elements_of(data)
        stray = strays(els)
        if want is None:
            state = 'stray' if stray else ('orphan' if els and PART in els else 'none')
        elif els is None:
            state = 'unrecognised'
        elif PART not in els:
            state = 'missing'
        elif core(els[PART]) != core(want):
            state = 'differs'
        else:
            state = 'stray' if stray else 'has'
        rows.append({'block': data.get('name', folder), 'state': state, 'strays': [list(s) for s in stray], 'path': path})
    return rows


def span(text, start):
    """End index (exclusive) of the JSON object opening at text[start] == '{', strings skipped."""
    depth, i, n = 0, start, len(text)
    while i < n:
        c = text[i]
        if c == '"':
            i += 1
            while text[i] != '"':
                i += 2 if text[i] == '\\' else 1
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError('unbalanced object')


def transform(text):
    """The block.json text with the overlay element declared and stray overlay lines removed. Raises ValueError when the
    shape is not recognised or the result is not the original plus exactly those changes."""
    data = json.loads(text)
    want = wanted(data.get('attributes') or {})
    els = elements_of(data)
    if want is None or els is None:
        raise ValueError('no overlay setting or no supports.sgs.elements')
    out = text
    # Stray lines: one `"css:x": "backgroundOverlay..."` per line inside another element's map.
    for _, _, css, attr in strays(els):
        line = re.compile(r'\n[ \t]*"' + re.escape(css) + r'"\s*:\s*"' + re.escape(attr) + r'"(,?)[ \t]*(?=\n)')
        hits = list(line.finditer(out))
        if len(hits) != 1:
            raise ValueError(f'{attr} under {css} is not on one line of its own')
        m = hits[0]
        if m.group(1):
            out = out[:m.start()] + out[m.end():]
        else:
            head = out[:m.start()].rstrip()
            if not head.endswith(','):
                raise ValueError(f'{attr} is the only entry of its map')
            out = head[:-1] + out[m.end():]
    expect = json.loads(text)
    for key, where, css, attr in strays(els):
        node = expect['supports']['sgs']['elements'][key]
        for step in where.split('.'):
            node = node[step]
        del node[css]
    if PART in els:
        if core(els[PART]) != core(want):
            raise ValueError('an overlay element is already declared with other contents: fix it by hand')
        if json.loads(out) != expect:
            raise ValueError('the edit changed more than the stray overlay lines')
        return out
    em = re.compile(r'\n([ \t]*)"elements"\s*:\s*\{').search(out)
    if not em:
        raise ValueError('elements object not found')
    close = span(out, em.end() - 1) - 1
    first = re.compile(r'\n([ \t]*)"').search(out, em.end())
    indent, key_indent = em.group(1), first.group(1)
    unit = key_indent[len(indent):] if key_indent.startswith(indent) and len(key_indent) > len(indent) else '\t'
    el = dict(want)
    orders = [e.get('order') for e in els.values() if isinstance(e, dict) and isinstance(e.get('order'), (int, float))]
    el = {**{k: el[k] for k in ('selector', 'prefix', 'label')}, 'order': (max(orders) + 1) if orders else 1, **{k: v for k, v in el.items() if k not in ('selector', 'prefix', 'label')}}
    body = json.dumps(el, indent=unit, ensure_ascii=False)
    body = ('\n' + key_indent).join(body.split('\n'))
    head = out[:close].rstrip()
    out = head + ',\n' + key_indent + '"' + PART + '": ' + body + '\n' + indent + out[close:]
    expect['supports']['sgs']['elements'][PART] = el
    if json.loads(out) != expect:
        raise ValueError('the edit changed more than the overlay declaration')
    return out


def fix(rows, apply):
    diffs = []
    for r in rows:
        if r['state'] not in ('missing', 'stray'):
            continue
        text = open(r['path'], encoding='utf-8').read()
        new = transform(text)
        rel = os.path.relpath(r['path'], PLUGIN).replace(os.sep, '/')
        diffs.append(''.join(difflib.unified_diff(text.splitlines(True), new.splitlines(True), 'a/' + rel, 'b/' + rel, n=1)))
        if apply:
            tmp = r['path'] + '.tmp'
            with open(tmp, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new)
            os.replace(tmp, r['path'])
    return diffs


def problems(rows):
    say = {
        'missing': 'holds overlay settings but declares no overlay element (run --fix --apply)',
        'differs': 'its overlay element differs from the canonical declaration (selector .sgs-bg-overlay, prefix "", no clusters, motion false, the attrMap of the settings it holds)',
        'stray': 'another element names an overlay setting in its attrMap (the overlay paints its own span; run --fix --apply)',
        'orphan': 'declares an overlay element but holds no overlay setting',
        'unrecognised': 'holds overlay settings but has no supports.sgs.elements object',
    }
    return [f'{r["block"]}: {say[r["state"]]}' + (f' {r["strays"]}' if r['strays'] else '') for r in rows if r['state'] in say]


def self_test():
    fails = []

    def ok(cond, label):
        if not cond:
            fails.append(label)

    six = '"backgroundOverlayColour": {"type": "string"}, "backgroundOverlayOpacity": {"type": "object"}, "backgroundOverlayColourHover": {"type": "string"}, "backgroundOverlayGradient": {"type": "string"}, "backgroundOverlayGradientHover": {"type": "string"}, "backgroundOverlayBlend": {"type": "string"}'
    tmp = tempfile.mkdtemp(prefix='overlay-element-')
    try:
        def block(folder, text):
            os.makedirs(os.path.join(tmp, folder))
            open(os.path.join(tmp, folder, 'block.json'), 'w', encoding='utf-8', newline='').write(text)
        # positive (tabs), edge (spaces, a stray wrapper line mid-map, a stray last line), negative control (no setting).
        block('alpha', '{\n\t"name": "sgs/alpha",\n\t"attributes": {' + six + '},\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"elements": {\n\t\t\t\t"wrapper": {\n\t\t\t\t\t"isWrapper": true,\n\t\t\t\t\t"order": 1\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}\n')
        block('beta', '{\n  "name": "sgs/beta",\n  "attributes": {"backgroundOverlayColour": {"type": "string"}, "backgroundOverlayOpacity": {"type": "object"}},\n  "supports": {\n    "sgs": {\n      "elements": {\n        "wrapper": {\n          "attrMap": {\n            "css:color": "textColour",\n            "css:background-image": "backgroundOverlayColour",\n            "css:gap": "gap"\n          },\n          "order": 2\n        }\n      }\n    }\n  }\n}\n')
        block('gamma', '{\n\t"name": "sgs/gamma",\n\t"attributes": {' + six + '},\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"elements": {\n\t\t\t\t"wrapper": {\n\t\t\t\t\t"attrMap": {\n\t\t\t\t\t\t"css:color": "textColour",\n\t\t\t\t\t\t"css:background-image": "backgroundOverlayColour"\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}\n')
        neg = '{\n\t"name": "sgs/delta",\n\t"attributes": {"textColour": {"type": "string"}},\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"elements": {\n\t\t\t\t"wrapper": {\n\t\t\t\t\t"order": 1\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}\n'
        block('delta', neg)
        block('eps', '{\n\t"name": "sgs/eps",\n\t"attributes": {' + six + '},\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true\n\t\t}\n\t}\n}\n')
        rows = survey(tmp)
        st = {r['block']: r['state'] for r in rows}
        ok(st['sgs/alpha'] == 'missing', 'positive: a block holding the settings without the element is missing')
        ok(st['sgs/beta'] == 'missing' and st['sgs/gamma'] == 'missing', 'edge: missing wins over a stray line until the element exists')
        ok(st['sgs/delta'] == 'none', 'negative control: a block without overlay settings is none')
        ok(st['sgs/eps'] == 'unrecognised', 'a block with settings and no elements object is unrecognised')
        ok(len(problems(rows)) == 4, f'check reports the four blocks (got {len(problems(rows))})')
        a = json.loads(transform(open(os.path.join(tmp, 'alpha', 'block.json'), encoding='utf-8').read()))['supports']['sgs']['elements']['overlay']
        ok(a['selector'] == '.sgs-bg-overlay' and a['motion'] is False and a['attrMap'] == dict(REST) and a['states']['hover']['attrMap'] == dict(HOVER) and a['order'] == 2, 'definition: the element declares every property on .sgs-bg-overlay, motion off')
        b_text = transform(open(os.path.join(tmp, 'beta', 'block.json'), encoding='utf-8').read())
        b = json.loads(b_text)['supports']['sgs']['elements']
        ok('backgroundOverlayColour' not in b['wrapper']['attrMap'].values() and b['wrapper']['attrMap'] == {'css:color': 'textColour', 'css:gap': 'gap'}, 'edge: a stray mid-map line is removed, its neighbours kept')
        ok(b['overlay']['attrMap'] == {'css:background-color': 'backgroundOverlayColour', 'css:opacity': 'backgroundOverlayOpacity'} and 'states' not in b['overlay'], 'edge: only the settings the block holds are declared')
        ok('\n        "overlay": {\n          "selector"' in b_text, 'edge: space indentation is kept')
        g = json.loads(transform(open(os.path.join(tmp, 'gamma', 'block.json'), encoding='utf-8').read()))['supports']['sgs']['elements']
        ok(g['wrapper']['attrMap'] == {'css:color': 'textColour'}, 'edge: a stray last line is removed with the comma before it')
        for r in rows:
            if r['state'] == 'missing':
                new = transform(open(r['path'], encoding='utf-8').read())
                open(r['path'], 'w', encoding='utf-8', newline='').write(new)
        st2 = {r['block']: r['state'] for r in survey(tmp)}
        ok(st2['sgs/alpha'] == st2['sgs/beta'] == st2['sgs/gamma'] == 'has', 'idempotence: every fixed block has it')
        ok(open(os.path.join(tmp, 'delta', 'block.json'), encoding='utf-8').read() == neg, 'negative control: byte-identical')
        p = os.path.join(tmp, 'alpha', 'block.json')
        d = open(p, encoding='utf-8').read().replace('"selector": ".sgs-bg-overlay"', '"selector": "> .sgs-bg-overlay"')
        open(p, 'w', encoding='utf-8', newline='').write(d)
        ok({r['block']: r['state'] for r in survey(tmp)}['sgs/alpha'] == 'differs', 'a changed selector is reported as differs')
        try:
            transform('{"name": "sgs/x", "attributes": {"textColour": {}}, "supports": {"sgs": {"elements": {}}}}')
            ok(False, 'a block without overlay settings is refused')
        except ValueError:
            pass
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    # Real tree: a dumb enumeration of block.json files naming an overlay setting reconciles with the survey.
    rows = survey()
    dumb = sum(1 for n in os.listdir(BLOCKS) if os.path.isfile(os.path.join(BLOCKS, n, 'block.json')) and re.search(r'"backgroundOverlay(Gradient|Colour|Opacity|Blend)(Hover)?"\s*:\s*\{', open(os.path.join(BLOCKS, n, 'block.json'), encoding='utf-8').read()))
    ok(dumb == sum(1 for r in rows if r['state'] not in ('none', 'orphan')), f'corpus control: {dumb} block.json files hold an overlay setting, survey targets {sum(1 for r in rows if r["state"] not in ("none", "orphan"))}')
    for f in fails:
        print('SELF-TEST FAIL:', f)
    print('self-test: ' + ('FAIL' if fails else 'ok'))
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    rows = survey()
    if a.fix:
        for d in fix(rows, a.apply):
            sys.stdout.write(d)
        print(('applied' if a.apply else 'would change') + f' {sum(1 for r in rows if r["state"] in ("missing", "stray"))} block.json files')
        return 0
    if a.check:
        probs = problems(rows)
        for p in probs:
            print('FAIL', p)
        print(f'check-overlay-element: {"FAIL" if probs else "ok"} ({sum(1 for r in rows if r["state"] == "has")} blocks declare it)')
        return 1 if probs else 0
    targets = [r for r in rows if r['state'] != 'none']
    if a.json:
        print(json.dumps({'blocks': [{k: v for k, v in r.items() if k != 'path'} for r in targets], 'counts': {s: sum(1 for r in rows if r['state'] == s) for s in sorted({r['state'] for r in rows})}}, indent=1))
    else:
        print(f'overlay element: {len(rows)} blocks; ' + ', '.join(f'{s} {sum(1 for r in rows if r["state"] == s)}' for s in sorted({r['state'] for r in rows})))
        for r in targets:
            print(f'  {r["state"]:12} {r["block"]}' + (f'  stray: {r["strays"]}' if r['strays'] else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
