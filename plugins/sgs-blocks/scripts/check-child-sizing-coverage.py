#!/usr/bin/env python3
"""check-child-sizing-coverage.py: every block that can sit in a grid or a row takes the child-sizing extension (Spec 02 FR-2-36).

WHAT IT ENFORCES
    A block sitting in a grid or a row sizes itself against its parent through ONE mechanism, the child-sizing extension
    (src/blocks/extensions/child-sizing.js, includes/child-sizing.php): sgsChildSizing (fit, fill, fixed or span per
    device) with sgsChildWidth, switched on by listing "childSizing" in block.json supports.sgs.enabledExtensions.
    Every block under src/blocks either lists it or is named in EXEMPT with the reason it can never be laid out by a
    grid or row parent (or its root is not the element that parent lays out). A new block that does neither fails
    --check, so it cannot ship without the setting or a stated exemption.

    Each exemption carries a kind whose fact is read from the block's own files, so an exemption cannot go stale silently:
        parent      block.json `parent` is set and lists only the parents the exemption names (each one stacks its
                    children in a column, shows one at a time or places them absolutely);
        woo-parent  block.json `parent` lists only WooCommerce blocks (woocommerce/*);
        out-of-flow the block's style.css positions its root absolute or fixed;
        chrome      page chrome (a site header or footer, a mega menu's own panel) that is never a grid or row child;
        no-box      the block renders no visible box to size.
    An exempt block that lists childSizing, or an exemption naming no block, also fails.

WHAT IT LISTS BUT NEVER FAILS ON
    "own sizing": the block's own attributes that also size its root (width, customWidth, maxWidth, fullWidth,
    layerWidth): when both are set, child sizing (two classes, `.sgs-child-sizing.<scope>`) wins over the block's own
    single-class rule at the devices it is set (Spec 02 FR-2-36 lists each case).

    python check-child-sizing-coverage.py --survey [--json] | --fix [--apply] | --check | --self-test

    --fix prints the unified diff that lists childSizing in each missing block's supports.sgs.enabledExtensions;
    --fix --apply writes it (atomic). The edit is textual (the file's own formatting is kept) and is verified by parsing
    the result: it must equal the original with only "childSizing" appended to that list.
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
SLUG = 'childSizing'

# block name -> (kind, reason[, parents]). Every entry must name a block (the self-test and --check assert it); a `parent`
# entry names the only parents the block may have.
EXEMPT = {
    'sgs/accordion-item': ('parent', 'only inside sgs/accordion, which stacks its items in a column', ['sgs/accordion']),
    'sgs/product-faq-item': ('parent', 'only inside sgs/product-faq, which stacks its items in a column', ['sgs/product-faq']),
    'sgs/tab': ('parent', 'only inside sgs/tabs, which shows one panel at a time', ['sgs/tabs']),
    'sgs/form-step': ('parent', 'only inside sgs/form or sgs/choice-flow, which show one step at a time', ['sgs/form', 'sgs/choice-flow']),
    'sgs/site-header-row': ('parent', 'only inside sgs/site-header, which stacks its rows in a column', ['sgs/site-header']),
    'sgs/site-footer-row': ('parent', 'only inside sgs/site-footer, which stacks its rows in a column', ['sgs/site-footer']),
    'sgs/diagram-dimension': ('parent', 'only inside sgs/measured-diagram, which places each measurement absolutely over its picture', ['sgs/measured-diagram']),
    'sgs/commerce-note': ('woo-parent', 'only inside WooCommerce\'s cart and checkout blocks, which are not SGS grid or row parents'),
    'sgs/pay-later-message': ('woo-parent', 'only inside WooCommerce\'s cart and checkout blocks, which are not SGS grid or row parents'),
    'sgs/decorative-image': ('out-of-flow', 'an absolutely placed layer that floats over its section; it is never laid out in a row or grid'),
    'sgs/nav-drawer': ('out-of-flow', 'a fixed dialog over the page; it is never laid out in a row or grid'),
    'sgs/site-header': ('chrome', 'the page\'s header, never a grid or row child'),
    'sgs/site-footer': ('chrome', 'the page\'s footer, never a grid or row child'),
    'sgs/mega-panel': ('chrome', 'a mega menu\'s content container: it lives in a sgs_mega_menu post and shows in the menu\'s dropdown or drawer'),
    'sgs/form-field-hidden': ('no-box', 'a hidden input: it renders no box to size'),
}
OWN_SIZING = ('width', 'customWidth', 'maxWidth', 'fullWidth', 'layerWidth')
POSITION_RE = re.compile(r'(?<![\w-])position\s*:\s*(absolute|fixed)\b')


def read_blocks(root):
    """[(dir, path, text, data)] for every block.json under root (a folder per block)."""
    out = []
    for name in sorted(os.listdir(root)):
        path = os.path.join(root, name, 'block.json')
        if os.path.isfile(path):
            with open(path, encoding='utf-8') as fh:
                text = fh.read()
            out.append((name, path, text, json.loads(text)))
    return out


def ext_list(data):
    sgs = (data.get('supports') or {}).get('sgs')
    return (sgs or {}).get('enabledExtensions') if isinstance(sgs, dict) else None


def has_it(data):
    lst = ext_list(data)
    return isinstance(lst, list) and SLUG in lst


def exempt_problem(kind, folder, allowed):
    """'' when the exemption's fact holds in the block's own files, else what is wrong."""
    path = os.path.join(folder, 'block.json')
    data = json.load(open(path, encoding='utf-8'))
    parents = data.get('parent') or []
    if kind == 'parent':
        if not parents:
            return 'exempt as parent-only but block.json sets no parent'
        extra = [p for p in parents if p not in allowed]
        return f'exempt as parent-only but it may also sit in {", ".join(extra)}' if extra else ''
    if kind == 'woo-parent':
        if not parents or any(not p.startswith('woocommerce/') for p in parents):
            return 'exempt as WooCommerce-only but block.json parent is ' + (', '.join(parents) or 'unset')
        return ''
    if kind == 'out-of-flow':
        css = os.path.join(folder, 'style.css')
        text = open(css, encoding='utf-8').read() if os.path.isfile(css) else ''
        return '' if POSITION_RE.search(text) else 'exempt as out of flow but its style.css positions nothing absolute or fixed'
    if kind in ('chrome', 'no-box'):
        return ''
    return f'unknown exemption kind {kind}'


def survey(root=BLOCKS, exempt=None):
    exempt = EXEMPT if exempt is None else exempt
    rows = []
    seen = set()
    for folder, path, text, data in read_blocks(root):
        name = data.get('name', '')
        seen.add(name)
        own = [a for a in OWN_SIZING if a in (data.get('attributes') or {})]
        if name in exempt:
            kind, reason = exempt[name][0], exempt[name][1]
            problem = exempt_problem(kind, os.path.join(root, folder), exempt[name][2] if len(exempt[name]) > 2 else [])
            if has_it(data):
                problem = 'exempt but lists childSizing'
            rows.append({'block': name, 'state': 'exempt', 'kind': kind, 'reason': reason, 'problem': problem, 'own': own})
        else:
            rows.append({'block': name, 'state': 'has' if has_it(data) else 'missing', 'own': own, 'path': path})
    stale = sorted(set(exempt) - seen)
    return rows, stale


def add_slug(text):
    """The block.json text with childSizing listed in supports.sgs.enabledExtensions, formatting kept. Raises ValueError
    when the shape is not recognised or the result is not the original plus that one entry."""
    data = json.loads(text)
    sup = re.search(r'"supports"\s*:\s*\{', text)
    if not sup:
        raise ValueError('no supports object')
    sgs = re.compile(r'"sgs"\s*:\s*\{').search(text, sup.end())
    if not sgs:
        raise ValueError('no supports.sgs object')
    lst = re.compile(r'"enabledExtensions"\s*:\s*\[([^\]]*)\]').search(text, sgs.end())
    if ext_list(data) is not None:
        if not lst:
            raise ValueError('enabledExtensions not found as a literal list')
        body = lst.group(1)
        if '\n' in body:
            last = body.rstrip()
            indent = re.search(r'\n([ \t]*)\S[^\n]*$', last).group(1)
            new_body = last + ',\n' + indent + '"' + SLUG + '"' + body[len(last):]
        else:
            items = body.strip()
            new_body = ' ' + (items + ', ' if items else '') + '"' + SLUG + '" '
        out = text[:lst.start(1)] + new_body + text[lst.end(1):]
    else:
        nl = text.find('\n', sgs.end())
        line_end = sgs.end() if nl < 0 else nl
        nxt = re.compile(r'\n([ \t]*)\S').search(text, sgs.end())
        if not nxt or text[sgs.end():line_end].strip():
            raise ValueError('supports.sgs is not one key per line')
        indent = nxt.group(1)
        empty = text[nxt.end() - 1] == '}'
        entry = '\n' + indent + ('\t' if empty else '') + '"enabledExtensions": [ "' + SLUG + '" ]' + ('' if empty else ',')
        out = text[:line_end] + entry + text[line_end:]
    want = json.loads(text)
    want['supports']['sgs'].setdefault('enabledExtensions', [])
    want['supports']['sgs']['enabledExtensions'] = list(want['supports']['sgs']['enabledExtensions']) + [SLUG]
    if json.loads(out) != want:
        raise ValueError('the edit changed more than the extension list')
    return out


def fix(rows, apply):
    diffs = []
    for r in rows:
        if r['state'] != 'missing':
            continue
        text = open(r['path'], encoding='utf-8').read()
        new = add_slug(text)
        rel = os.path.relpath(r['path'], PLUGIN).replace(os.sep, '/')
        diffs.append(''.join(difflib.unified_diff(text.splitlines(True), new.splitlines(True), 'a/' + rel, 'b/' + rel, n=1)))
        if apply:
            tmp = r['path'] + '.tmp'
            with open(tmp, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new)
            os.replace(tmp, r['path'])
    return diffs


def problems(rows, stale):
    out = [f'{r["block"]}: can sit in a grid or row but lacks the child-sizing extension (list "childSizing" in supports.sgs.enabledExtensions, or add an EXEMPT entry with its reason)' for r in rows if r['state'] == 'missing']
    out += [f'{r["block"]}: {r["problem"]}' for r in rows if r['state'] == 'exempt' and r['problem']]
    out += [f'EXEMPT names {n}, which is no block' for n in stale]
    return out


def print_survey(rows, stale):
    counts = {}
    for r in rows:
        counts[r['state']] = counts.get(r['state'], 0) + 1
    print(f'child sizing: {len(rows)} blocks; ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())))
    for state in ('missing', 'exempt', 'has'):
        for r in rows:
            if r['state'] != state:
                continue
            own = f'  own sizing: {", ".join(r["own"])}' if r['own'] else ''
            if state == 'exempt':
                print(f'  exempt   {r["block"]}  [{r["kind"]}] {r["reason"]}' + (f'  PROBLEM: {r["problem"]}' if r['problem'] else '') + own)
            else:
                print(f'  {state:8} {r["block"]}{own}')
    for n in stale:
        print(f'  STALE EXEMPTION {n}')


def self_test():
    fails = []

    def ok(cond, label):
        if not cond:
            fails.append(label)

    tmp = tempfile.mkdtemp(prefix='cs-coverage-')
    try:
        def block(folder, text, css=None):
            os.makedirs(os.path.join(tmp, folder))
            open(os.path.join(tmp, folder, 'block.json'), 'w', encoding='utf-8', newline='').write(text)
            if css is not None:
                open(os.path.join(tmp, folder, 'style.css'), 'w', encoding='utf-8').write(css)
        # positive: no list yet (tabs); edge: one-line list, multi-line list, empty sgs object; negative control: has it.
        block('alpha', '{\n\t"name": "sgs/alpha",\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true\n\t\t}\n\t}\n}\n')
        block('beta', '{\n  "name": "sgs/beta",\n  "supports": {\n    "sgs": {\n      "enabledExtensions": [ "blockLink" ],\n      "motion": true\n    }\n  }\n}\n')
        block('gamma', '{\n\t"name": "sgs/gamma",\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"enabledExtensions": [\n\t\t\t\t"width",\n\t\t\t\t"layout"\n\t\t\t]\n\t\t}\n\t}\n}\n')
        block('delta', '{\n\t"name": "sgs/delta",\n\t"supports": {\n\t\t"sgs": {\n\t\t}\n\t}\n}\n')
        has_text = '{\n\t"name": "sgs/eps",\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"enabledExtensions": [ "childSizing" ]\n\t\t}\n\t}\n}\n'
        block('eps', has_text)
        # exemptions: a parent-only block whose fact holds, one whose fact is false, an out-of-flow block, a stale name.
        block('zeta', '{\n\t"name": "sgs/zeta",\n\t"parent": [ "sgs/accordion" ],\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true\n\t\t}\n\t}\n}\n')
        block('eta', '{\n\t"name": "sgs/eta",\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true\n\t\t}\n\t}\n}\n')
        block('kappa', '{\n\t"name": "sgs/kappa",\n\t"parent": [ "sgs/tabs", "sgs/container" ],\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true\n\t\t}\n\t}\n}\n')
        block('theta', '{\n\t"name": "sgs/theta",\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true\n\t\t}\n\t}\n}\n', css='.sgs-theta { position: absolute; }')
        block('iota', '{\n\t"name": "sgs/iota",\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true\n\t\t}\n\t}\n}\n', css='.sgs-iota { position: relative; }')
        ex = {'sgs/zeta': ('parent', 'r', ['sgs/accordion']), 'sgs/eta': ('parent', 'r', ['sgs/accordion']), 'sgs/kappa': ('parent', 'r', ['sgs/tabs']), 'sgs/theta': ('out-of-flow', 'r'), 'sgs/iota': ('out-of-flow', 'r'), 'sgs/gone': ('chrome', 'r')}
        rows, stale = survey(tmp, ex)
        state = {r['block']: r for r in rows}
        ok(state['sgs/alpha']['state'] == 'missing', 'positive: a block without the extension is missing')
        ok(state['sgs/eps']['state'] == 'has', 'negative control: a block that lists it is has')
        ok(not state['sgs/zeta']['problem'], 'exemption whose parent fact holds passes')
        ok('sets no parent' in state['sgs/eta']['problem'], 'exemption whose parent fact is false fails')
        ok('may also sit in sgs/container' in state['sgs/kappa']['problem'], 'parent exemption fails when the block may also sit elsewhere')
        ok(not state['sgs/theta']['problem'], 'out-of-flow exemption with position absolute passes')
        ok('positions nothing' in state['sgs/iota']['problem'], 'out-of-flow exemption with no absolute position fails')
        ok(stale == ['sgs/gone'], 'an exemption naming no block is stale')
        probs = problems(rows, stale)
        ok(len(probs) == 4 + 4, f'check reports the four missing blocks and four bad exemptions (got {len(probs)})')
        # definition and edges: the fix lists childSizing and changes nothing else (add_slug verifies by parsing).
        for folder in ('alpha', 'beta', 'gamma', 'delta'):
            p = os.path.join(tmp, folder, 'block.json')
            new = add_slug(open(p, encoding='utf-8').read())
            ok(json.loads(new)['supports']['sgs']['enabledExtensions'][-1] == SLUG, f'fix lists childSizing in {folder}')
            ok(new != open(p, encoding='utf-8').read(), f'definition: fix changes {folder}')
        ok('"enabledExtensions": [ "blockLink", "childSizing" ]' in add_slug(open(os.path.join(tmp, 'beta', 'block.json'), encoding='utf-8').read()), 'edge: one-line list keeps its form')
        ok('\t\t\t\t"layout",\n\t\t\t\t"childSizing"\n' in add_slug(open(os.path.join(tmp, 'gamma', 'block.json'), encoding='utf-8').read()), 'edge: multi-line list keeps its indent')
        # apply in the temp tree, then idempotence and the negative control's bytes.
        missing = [r for r in rows if r['state'] == 'missing']
        for r in missing:
            new = add_slug(open(r['path'], encoding='utf-8').read())
            open(r['path'], 'w', encoding='utf-8', newline='').write(new)
        rows2, _ = survey(tmp, ex)
        ok(not [r for r in rows2 if r['state'] == 'missing'], 'idempotence: nothing missing after the fix')
        ok(open(os.path.join(tmp, 'eps', 'block.json'), encoding='utf-8').read() == has_text, 'negative control: a block that has it is byte-identical')
        try:
            add_slug('{\n\t"name": "sgs/x",\n\t"supports": { "sgs": { "motion": true } }\n}\n')
            ok(False, 'unrecognised shape (supports.sgs on one line) is refused')
        except ValueError:
            pass
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    # Real tree: every exemption names a block, and a dumb enumeration of block folders reconciles with the survey.
    rows, stale = survey()
    ok(not stale, 'every EXEMPT entry names a block in src/blocks: ' + ', '.join(stale))
    dumb = sum(1 for n in os.listdir(BLOCKS) if os.path.isfile(os.path.join(BLOCKS, n, 'block.json')))
    ok(dumb == len(rows), f'corpus control: {dumb} block folders, survey read {len(rows)}')
    ok(sum(1 for r in rows if r['state'] == 'exempt') == len(EXEMPT), 'corpus control: every exemption is read once')
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
    rows, stale = survey()
    if a.fix:
        for d in fix(rows, a.apply):
            sys.stdout.write(d)
        print(('applied' if a.apply else 'would change') + f' {sum(1 for r in rows if r["state"] == "missing")} block.json files')
        return 0
    if a.check:
        probs = problems(rows, stale)
        for p in probs:
            print('FAIL', p)
        print(f'check-child-sizing-coverage: {"FAIL" if probs else "ok"} ({sum(1 for r in rows if r["state"] == "has")} have it, {len(EXEMPT)} exempt)')
        return 1 if probs else 0
    if a.json:
        print(json.dumps({'blocks': [{k: v for k, v in r.items() if k != 'path'} for r in rows], 'stale_exemptions': stale}, indent=1))
    else:
        print_survey(rows, stale)
    return 0


if __name__ == '__main__':
    sys.exit(main())
