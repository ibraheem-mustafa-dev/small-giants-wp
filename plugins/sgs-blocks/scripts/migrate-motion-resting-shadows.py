#!/usr/bin/env python3
"""Mark every block element whose own stylesheet paints a resting box-shadow (Spec 38A FR-38A-42, the hover ring).

The hover ring is a hover `box-shadow`, so it is offered only on an element with no shadow of its own
(`Sgs_Motion_Ring_Guard`, `canvas/emit-ring.js`). A shadow set by an attribute is already declared in `block.json`
(`attrMap["css:box-shadow"]`); a shadow painted by the block's stylesheet with no attribute behind it (a card's boundary
shadow, WCAG 1.4.11) is not. This detector finds those and writes `"restingShadow": true` on the element's declaration in
`supports.sgs.elements`, the one source the server, the canvas twin and the Hover panel all read.

EVIDENCE, read from `src/blocks/<slug>/style*.css`: a rule whose selector list entry ends in one plain class and carries
no state or condition (no `:` pseudo-class or pseudo-element, no `[attribute]`, no `--modifier` class and no `is-` or `has-`
class anywhere in the selector), outside an `@media` for print, forced colours, reduced motion, contrast or colour scheme,
that declares `box-shadow` with a value other than none, inherit, initial, unset or revert. A modifier class (`--elevated`,
`is-style-testimonial`) makes the shadow a variant's: the block's attributes decide whether the variant is on, which the
detector cannot evaluate, so a variant's shadow counts too (the ring is refused on that element in every variant, never
wiping a shadow). The last compound's classes (a modifier read as its base class) are placed on:
  - the element that owns one: the last class of the element's declared `selector`, else `sgs-<slug>__<part>`;
  - else, for a block-level class (no `__`, e.g. `sgs-info-box` or the legacy `product-card`) that the block's own PHP
    prints, the block's wrapper elements (`"isWrapper": true`), which the `root` target stands for.
A class placed on nothing is listed as unplaced and marks nothing. A shadow that exists only in a state (`:hover`,
`:focus-visible`, `[aria-pressed]`) is not a resting shadow and is never counted.

FORMAT SAFETY: one member is inserted, first in the element object, in that object's layout, and the result must parse to
the original plus that key. A block.json with uncommitted changes is refused, never edited.

    python migrate-motion-resting-shadows.py --survey [--json] | --fix [--apply] | --check | --self-test
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(HERE)
BLOCKS_DIR = os.path.join(PLUGIN, 'src', 'blocks')
KEY = 'restingShadow'
SELECTOR_OK = re.compile(r'^\.[A-Za-z][A-Za-z0-9_-]*(?: \.[A-Za-z][A-Za-z0-9_-]*)*$')
PLAIN_CLASS = re.compile(r'^\.([A-Za-z_][A-Za-z0-9_-]*)$')
SKIP_AT = ('@keyframes', '@-webkit-keyframes', '@font-face', '@property', '@page', '@counter-style', '@view-transition')
SKIP_MEDIA = re.compile(r'print|forced-colors|prefers-reduced|prefers-contrast|prefers-color|inverted-colors|prefers-reduced-transparency')
NO_SHADOW = re.compile(r'^(?:none|inherit|initial|unset|revert|revert-layer)\b|^var\(\s*--[\w-]+\s*,\s*none\s*\)$', re.I)


def read_text(path):
    with open(path, 'r', encoding='utf-8', errors='replace', newline='') as fh:
        return fh.read()


def _load_layout_helpers():
    import importlib.util
    spec = importlib.util.spec_from_file_location('migrate_motion_support', os.path.join(HERE, 'migrate-motion-support.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LAYOUT = _load_layout_helpers()
skip_ws, member_value_start, insert_first_member = LAYOUT.skip_ws, LAYOUT.member_value_start, LAYOUT.insert_first_member


# ---- CSS: resting box-shadow rules -----------------------------------------------------------------------------------

def css_rules(css):
    """[(selector, body, at_preludes)] for every style rule; keyframes, font-face and the like are skipped."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, stack, i, start = [], [], 0, 0
    while i < len(css):
        ch = css[i]
        if ch == '{':
            prelude = ' '.join(css[start:i].split())
            if prelude.startswith('@'):
                stack.append(prelude)
                start = i + 1
            else:
                j = i + 1
                while j < len(css) and css[j] not in '{}':
                    j += 1
                if not any(p.lower().startswith(SKIP_AT) for p in stack):
                    out.append((prelude, css[i + 1:j], tuple(stack)))
                if j < len(css) and css[j] == '{':   # CSS nesting is not read; resume after the nested block's own close
                    depth, j = 1, j + 1
                    while j < len(css) and depth:
                        depth += {'{': 1, '}': -1}.get(css[j], 0)
                        j += 1
                    j -= 1
                i, start = j, j + 1
        elif ch == '}':
            if stack and css[start:i].strip() == '':
                stack.pop()
            start = i + 1
        elif ch == ';' and not css[start:i].strip().startswith(('{', '}')) and css[start:i].lstrip().startswith('@'):
            start = i + 1   # a statement at-rule (@import, @charset)
        i += 1
    return out


def shadow_value(body):
    m = re.search(r'(?:^|[;\s])box-shadow\s*:\s*([^;]+)', body)
    if not m:
        return None
    value = ' '.join(m.group(1).replace('!important', '').split())
    return None if (not value or NO_SHADOW.match(value)) else value


def resting_classes(selector):
    """(classes, variant) for a plain selector entry that paints at rest, else None. `classes` are the last compound's
    classes with any modifier cut off; `variant` is true when a modifier class or a WordPress style class is in play."""
    s = ' '.join(selector.replace('>', ' ').replace('+', ' ').replace('~', ' ').split())
    if not s or any(c in s for c in ':[*()&') or re.search(r'\.(?:is|has)-(?!style-)', s):
        return None
    last = s.split(' ')[-1]
    if not re.fullmatch(r'(?:\.[A-Za-z_][A-Za-z0-9_-]*)+', last):
        return None
    classes = re.findall(r'\.([A-Za-z_][A-Za-z0-9_-]*)', last)
    return [c.split('--')[0] for c in classes], ('--' in s or 'is-style-' in s)


def resting_shadow_classes(css):
    """{class: (first box-shadow value, variant)} for every resting shadow in the stylesheet; a class seen both at rest
    and in a variant counts as at rest."""
    found = {}
    for selector, body, at in css_rules(css):
        if any(SKIP_MEDIA.search(p) for p in at if p.lower().startswith('@media')):
            continue
        value = shadow_value(body)
        if value is None:
            continue
        for entry in selector.split(','):
            hit = resting_classes(entry)
            if not hit:
                continue
            for cls in hit[0]:
                if cls.startswith('is-style-'):
                    continue
                old = found.get(cls)
                found[cls] = (old[0], old[1] and hit[1]) if old else (value, hit[1])
    return found


# ---- block evidence ------------------------------------------------------------------------------------------------

def php_text(block_dir):
    out = []
    for root, _dirs, files in os.walk(block_dir):
        out += [read_text(os.path.join(root, f)) for f in sorted(files) if f.endswith('.php')]
    return '\n'.join(out)


def element_class(slug, part, spec):
    selector = spec.get('selector') if isinstance(spec, dict) else None
    if isinstance(selector, str) and SELECTOR_OK.match(selector):
        return selector.split(' ')[-1][1:]
    return f'sgs-{slug}__{part}'


def analyse(blocks_dir):
    """One row per block with a motion-declared element: {block, path, elements, marked, wanted, unplaced}."""
    rows = []
    for slug in sorted(os.listdir(blocks_dir)):
        folder = os.path.join(blocks_dir, slug)
        path = os.path.join(folder, 'block.json')
        if not os.path.isfile(path):
            continue
        try:
            data = json.loads(read_text(path))
        except ValueError:
            rows.append({'block': slug, 'path': path, 'unparsed': True})
            continue
        elements = (data.get('supports') or {}).get('sgs', {}).get('elements')
        sheets = sorted(f for f in os.listdir(folder) if f.endswith('.css') and f.startswith('style'))
        if not isinstance(elements, dict) or not sheets:
            continue
        shadows = {}
        for sheet in sheets:
            for cls, hit in resting_shadow_classes(read_text(os.path.join(folder, sheet))).items():
                shadows.setdefault(cls, hit)
        if not shadows:
            continue
        owners = {}
        for part, spec in elements.items():
            if isinstance(spec, dict):
                owners.setdefault(element_class(slug.replace('_', '-'), part, spec), []).append(part)
        wrappers = [p for p, s in elements.items() if isinstance(s, dict) and s.get('isWrapper') is True]
        php = php_text(folder)
        wanted, unplaced = {}, []
        for cls, (value, variant) in sorted(shadows.items()):
            label = f".{cls}{' (variant)' if variant else ''}: {value}"
            if cls in owners:
                for part in owners[cls]:
                    wanted.setdefault(part, []).append(label)
            elif '__' not in cls and wrappers and (cls in (f'wp-block-sgs-{slug}', f'sgs-{slug}') or re.search(r"['\" ]" + re.escape(cls) + r"['\" ]", php)):
                for part in wrappers:
                    wanted.setdefault(part, []).append(label)
            else:
                unplaced.append(label)
        marked = sorted(p for p, s in elements.items() if isinstance(s, dict) and s.get(KEY) is True)
        rows.append({'block': slug, 'path': path, 'wanted': wanted, 'marked': marked, 'unplaced': unplaced,
                     'stale': sorted(set(marked) - set(wanted))})
    # A block with a stale marker but no shadow rule at all is still a row.
    for slug in sorted(os.listdir(blocks_dir)):
        path = os.path.join(blocks_dir, slug, 'block.json')
        if os.path.isfile(path) and not any(r['block'] == slug for r in rows):
            try:
                els = (json.loads(read_text(path)).get('supports') or {}).get('sgs', {}).get('elements') or {}
            except ValueError:
                continue
            marked = sorted(p for p, s in els.items() if isinstance(s, dict) and s.get(KEY) is True)
            if marked:
                rows.append({'block': slug, 'path': path, 'wanted': {}, 'marked': marked, 'unplaced': [], 'stale': marked})
    return rows


# ---- format-safe edit ----------------------------------------------------------------------------------------------

def insert_markers(text, parts):
    """`text` with `"restingShadow": true` added to each element in `parts`, or None when unsafe."""
    eol = '\r\n' if '\r\n' in text else '\n'
    try:
        expect = json.loads(text)
    except ValueError:
        return None
    out = text
    for part in parts:
        node = skip_ws(out, 0)
        for key in ('supports', 'sgs', 'elements', part):
            node = member_value_start(out, node, key) if out[node] == '{' else None
            if node is None:
                return None
        if out[node] != '{':
            return None
        out = insert_first_member(out, node, f'"{KEY}": true', eol)
        expect['supports']['sgs']['elements'][part][KEY] = True
    try:
        return out if json.loads(out) == expect else None
    except ValueError:
        return None


def is_dirty(path):
    folder = os.path.dirname(path)
    if subprocess.run(['git', 'ls-files', '--error-unmatch', '--', path], cwd=folder, capture_output=True).returncode != 0:
        return True
    return subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--', path], cwd=folder, capture_output=True).returncode != 0


# ---- modes ---------------------------------------------------------------------------------------------------------

def survey(blocks_dir, as_json):
    rows = analyse(blocks_dir)
    if as_json:
        print(json.dumps(rows, indent=1))
        return rows
    flagged = [r for r in rows if r.get('wanted')]
    for r in rows:
        if r.get('unparsed'):
            continue
        for part, why in sorted(r['wanted'].items()):
            state = 'marked' if part in r['marked'] else 'UNMARKED'
            print(f"{r['block']}:{part}  [{state}]  {'; '.join(why)}")
        for item in r['unplaced']:
            print(f"{r['block']}:(unplaced)  {item}")
        for part in r['stale']:
            print(f"{r['block']}:{part}  [STALE marker: no resting shadow found]")
    print()
    print(f'blocks with a resting stylesheet shadow on a declared element: {len(flagged)}; elements: {sum(len(r["wanted"]) for r in flagged)}')
    print(f'unplaced classes (no declared element, marks nothing): {sum(len(r["unplaced"]) for r in rows if not r.get("unparsed"))}')
    print(f'unrecognised (block.json does not parse): {sum(1 for r in rows if r.get("unparsed"))}')
    return rows


def fix(blocks_dir, apply, git_guard):
    refused, unrecognised, changed = [], [], []
    for r in analyse(blocks_dir):
        if r.get('unparsed'):
            unrecognised.append(r['block'])
            continue
        need = sorted(set(r['wanted']) - set(r['marked']))
        if not need:
            continue
        if git_guard and is_dirty(r['path']):
            refused.append(r['block'])
            continue
        new_text = insert_markers(read_text(r['path']), need)
        if new_text is None:
            unrecognised.append(r['block'])
            continue
        changed.append(r['block'])
        print(f"{r['block']}: +{KEY} on {', '.join(need)}")
        if apply:
            tmp = r['path'] + '.tmp'
            with open(tmp, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new_text)
            os.replace(tmp, r['path'])
    print(('wrote' if apply else 'would write') + f' {len(changed)} block.json file(s)')
    if refused:
        print(f'REFUSED (uncommitted changes in the file): {", ".join(refused)}')
    if unrecognised:
        print(f'UNRECOGNISED: {", ".join(sorted(set(unrecognised)))}')
    return 1 if (refused or unrecognised) else 0


def check(blocks_dir):
    problems = []
    rows = analyse(blocks_dir)
    for r in rows:
        if r.get('unparsed'):
            problems.append(f"{r['block']}: block.json does not parse")
            continue
        for part in sorted(set(r['wanted']) - set(r['marked'])):
            problems.append(f"{r['block']}:{part} paints a resting box-shadow in its stylesheet ({'; '.join(r['wanted'][part])}) but is not marked {KEY}")
        for part in r['stale']:
            problems.append(f"{r['block']}:{part} is marked {KEY} but its stylesheet paints no resting box-shadow on it")
    for p in problems:
        print(p)
    flagged = sum(len(r.get('wanted', {})) for r in rows)
    print(f'migrate-motion-resting-shadows --check: {"FAIL, " + str(len(problems)) + " problem(s)" if problems else "OK, " + str(flagged) + " marked element(s)"}')
    return 1 if problems else 0


def write_block(root, slug, css, elements, php='', newline='\n'):
    folder = os.path.join(root, slug)
    os.makedirs(folder, exist_ok=True)
    block = '{' + newline + '\t"name": "sgs/' + slug + '",' + newline + '\t"supports": {' + newline + '\t\t"sgs": {' + newline
    block += '\t\t\t"elements": ' + json.dumps(elements) + newline + '\t\t}' + newline + '\t}' + newline + '}' + newline
    with open(os.path.join(folder, 'block.json'), 'w', encoding='utf-8', newline='') as fh:
        fh.write(block)
    with open(os.path.join(folder, 'style.css'), 'w', encoding='utf-8') as fh:
        fh.write(css)
    if php:
        with open(os.path.join(folder, 'render.php'), 'w', encoding='utf-8') as fh:
            fh.write(php)


def self_test():
    failures = []

    def expect(label, got, want):
        if got != want:
            failures.append(f'{label}: got {got!r}, wanted {want!r}')

    css = """
    /* .sgs-t__comment { box-shadow: 0 0 4px red; } */
    .sgs-t__card { box-shadow: var(--sgs-t-shadow, 0 2px 12px rgba(0,0,0,.1)); }
    .sgs-t__plain { box-shadow: none; }
    .sgs-t__hover:hover { box-shadow: 0 0 8px red; }
    .sgs-t__mod--glow { box-shadow: 0 0 8px red; }
    .sgs-t--elevated { box-shadow: 0 0 5px red; }
    .wp-block-sgs-t.is-style-fancy { box-shadow: 0 0 5px red; }
    .sgs-t__cond[data-on] { box-shadow: 0 0 8px red; }
    .is-open .sgs-t__open { box-shadow: 0 0 8px red; }
    .sgs-t__pressed[aria-pressed="true"] { box-shadow: 0 0 8px red; }
    @media (prefers-reduced-motion: reduce) { .sgs-t__reduced { box-shadow: 0 0 2px red; } }
    @media (min-width: 600px) { .sgs-t__wide { box-shadow: 0 1px 2px red; } }
    @keyframes pulse { 0% { box-shadow: 0 0 2px red; } }
    .legacy-t { box-shadow: 0 0 2px red; }
    .sgs-t__nowhere { box-shadow: 0 0 2px red; }
    .sgs-t__a, .sgs-t__b:hover, .sgs-t__c { box-shadow: 0 0 3px red; }
    """
    found = resting_shadow_classes(css)
    expect('classes found', sorted(found), ['legacy-t', 'sgs-t', 'sgs-t__a', 'sgs-t__c', 'sgs-t__card', 'sgs-t__mod', 'sgs-t__nowhere', 'sgs-t__wide', 'wp-block-sgs-t'])
    expect('var shadow kept whole', found['sgs-t__card'][0].startswith('var(--sgs-t-shadow'), True)
    expect('a modifier is a variant, a plain class is not', (found['sgs-t__mod'][1], found['sgs-t__card'][1]), (True, False))

    with tempfile.TemporaryDirectory() as tmp:
        elements = {'box': {'isWrapper': True}, 'card': {}, 'wide': {}, 'a': {}, 'other': {'selector': '.sgs-t__c'}, 'plain': {}, 'mod': {}}
        write_block(tmp, 't', css, elements, php="<div class=\"legacy-t\">")
        rows = analyse(tmp)
        want = {'box': None, 'card': None, 'wide': None, 'a': None, 'other': None, 'mod': None}
        expect('placed parts', sorted(rows[0]['wanted']), sorted(want))
        expect('wrapper takes the block-level classes, a variant too', rows[0]['wanted']['box'], ['.legacy-t: 0 0 2px red', '.sgs-t (variant): 0 0 5px red', '.wp-block-sgs-t (variant): 0 0 5px red'])
        expect('a modifier on a part is placed by its base class', rows[0]['wanted']['mod'], ['.sgs-t__mod (variant): 0 0 8px red'])
        expect('declared selector wins over the BEM name', 'other' in rows[0]['wanted'], True)
        expect('unplaced is reported, marks nothing', rows[0]['unplaced'], ['.sgs-t__nowhere: 0 0 2px red'])
        expect('check fails before the fix', check(tmp), 1)
        expect('dry run writes nothing', fix(tmp, False, False), 0)
        expect('still failing after a dry run', check(tmp), 1)
        expect('fix applies', fix(tmp, True, False), 0)
        path = os.path.join(tmp, 't', 'block.json')
        text = read_text(path)
        parsed = json.loads(text)
        expect('markers written, others untouched', sorted(p for p, s in parsed['supports']['sgs']['elements'].items() if s.get(KEY)), ['a', 'box', 'card', 'mod', 'other', 'wide'])
        expect('plain element left alone', KEY in parsed['supports']['sgs']['elements']['plain'], False)
        expect('check passes after the fix', check(tmp), 0)
        expect('a second fix writes nothing', fix(tmp, True, False), 0)
        # negative controls: the check must fail on a removed marker and on a stale one.
        with open(path, 'w', encoding='utf-8', newline='') as fh:
            fh.write(text.replace('"restingShadow": true', '"restingShadow": false', 1))
        expect('check fails when a marker is removed', check(tmp), 1)
        with open(path, 'w', encoding='utf-8', newline='') as fh:
            fh.write(text.replace('"plain": {}', '"plain": {"restingShadow": true}'))
        expect('check fails on a stale marker', check(tmp), 1)
        # CRLF block.json keeps its line endings.
        shutil_dir = os.path.join(tmp, 'crlf')
        os.makedirs(shutil_dir)
        write_block(shutil_dir, 'c', '.sgs-c__x { box-shadow: 0 0 1px red; }', {'x': {}}, newline='\r\n')
        fix(shutil_dir, True, False)
        raw = open(os.path.join(shutil_dir, 'c', 'block.json'), 'rb').read()
        expect('CRLF layout survives', (b'\r\n' in raw, b'\n' in raw.replace(b'\r\n', b'')), (True, False))
    if failures:
        print('SELF-TEST FAILED')
        for f in failures:
            print('  ' + f)
        return 1
    print('self-test: OK')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--survey', action='store_true')
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--fix', action='store_true')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.survey:
        survey(BLOCKS_DIR, args.json)
        return 0
    if args.fix:
        return fix(BLOCKS_DIR, args.apply, True)
    if args.check:
        return check(BLOCKS_DIR)
    parser.print_help()
    return 2


if __name__ == '__main__':
    sys.exit(main())
