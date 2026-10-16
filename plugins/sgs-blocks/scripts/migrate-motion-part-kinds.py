#!/usr/bin/env python3
"""Mark the kind of every motion part in block.json (Spec 38A section 5.4, plan unit M3.6 part-kind markers).

The motion panels offer a surface-level effect (Ken Burns and the other surface rows) on the root, and on a part only
when its declaration in `supports.sgs.elements` carries `"surface": true` (layers/refusal-match.js::levelsForTarget);
an effect whose schema entry names `x-part-kinds` (split reveal and scramble `text`; draw, morph, motion path and the
SVG loop `svg`) only on a part that carries `"text": true` or `"svg": true` (layers/refusal-match.js::kindsFit). The
block root takes every kind: the block's registry row (`fx_effects` scope and requires) decides those effects there.

EVIDENCE, read from the markup (a motion part = a part of a block with `supports.sgs.motion`, not the root, not
`"motion": false`; its class = the last class of its `selector`, else `sgs-<slug>__<part>`). The detector finds where the
block's render source and the shared includes print that class inside a `class="..."` attribute and reads that
element's tag, or, for a class written into an array passed (directly or through a variable) to a function that prints
only <img>/<picture>/<video>, treats the element as <img>.
  surface  printed only on media tags, or a background layer (key or class element bg/background/backdrop/-bg on a
           <div> or <span>, or on those and a media tag: the background image and the holder that replaces it); plus the hand-read CONFIRMED media parts, each pinned by patterns that must still match
  svg      printed only on <svg>, or an svg-* holder
  text     printed only on h1-h6, p, blockquote, figcaption, cite, q; or the framework DB says a text attribute is
           printed into it: a `block_attributes` row of the block whose `role` is `text-content` or `content` (the
           text roles of the `roles` table), whose `attr_type` is `string` or `rich-text` and whose `derived_selector`
           names the part's class, on a part printed only on text-holding tags (TEXT_TAGS plus span, div, strong, em,
           b, i, small, time, label, a, or through a helper the detector cannot follow)
A part printed nowhere, on mixed tags, or through a helper this cannot follow has no evidence and stays unmarked.
The DB is opened read-only (`file:...?mode=ro`); a missing DB fails every mode but --self-test.

MARKERS: `"surface": true`, `"text": true` and `"svg": true`; --fix writes and --check enforces all three. FORMAT SAFETY: one member is inserted, first in the part object, in that object's
layout, and the result must parse to the original plus that key. A file with uncommitted changes (`git diff --quiet HEAD`
non-zero, or untracked) is refused, never edited.

    python migrate-motion-part-kinds.py --survey [--json] | --fix [--apply] | --check | --self-test
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import sqlite3
import tempfile

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(HERE)
BLOCKS_DIR = os.path.join(PLUGIN, 'src', 'blocks')
INCLUDES_DIR = os.path.join(PLUGIN, 'includes')
DB_PATH = os.environ.get('SGS_FRAMEWORK_DB') or os.path.join(os.path.expanduser('~'), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db')

ALL_KINDS = ('surface', 'svg', 'text')
ENFORCED = ALL_KINDS              # every kind has a reader; --fix writes and --check gates all of them
MEDIA_TAGS = {'img', 'video', 'picture'}
TEXT_TAGS = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'figcaption', 'cite', 'q'}
# Tags that hold a text attribute's printed value; 'unknown' is a class printed through a helper.
TEXT_HOLDER_TAGS = TEXT_TAGS | {'span', 'div', 'strong', 'em', 'b', 'i', 'small', 'time', 'label', 'a', 'unknown'}
TEXT_ROLES = ('text-content', 'content')
TEXT_ATTR_TYPES = ('string', 'rich-text')
LAYER_TAGS = {'div', 'span'}
BG_KEY = re.compile(r'(^|[-_])(bg|background|backdrop)($|[-_])')
SVG_KEY = re.compile(r'(^|-)svg(-|$)')
SELECTOR_OK = re.compile(r'^\.[A-Za-z][A-Za-z0-9_-]*(?: \.[A-Za-z][A-Za-z0-9_-]*)*$')
TAG_BACK = 600
HELPER_BACK = 900
# Media parts whose markup the structural rules cannot follow (the class is added by a regex over returned HTML, or
# passed through a helper that prints several media types). Each was read in the block's render source; the patterns
# must still match that source, or the part loses its evidence and --check fails: `block:part` -> (patterns, reason).
CONFIRMED = {
    'hero:split-media': ((r"sgs_tier_media_render\(\s*\$split_tiers,\s*'sgs-hero__split-media'",),
                         'base class on every element sgs_tier_media_render prints (img, video, inline SVG, Lottie)'),
    'hero:split-image': ((r"'image'\s*=>\s*\$sgs_hero_split_image_class", r"'sgs-hero__split-image'"),
                         'extra class on the <img> tier only (sgs_tier_media_render $extra[image])'),
    'card-grid:image': ((r"preg_replace\(\s*'/\(<\(\?:img\|video\)", r"array\(\s*'sgs-card-grid__media'\s*\)"),
                        'class added to the first <img>/<video> sgs_render_media returned'),
    'gallery:image': ((r"array\(\s*'sgs-gallery__img'\s*\)", r"wp_get_attachment_image\("),
                      'class on the <img> wp_get_attachment_image prints'),
    'hero:background': ((r"'sgs-hero__bg-img sgs-hero__background'", r"'bg_img_class'\s*=>\s*'sgs-hero__background'"),
                        "the background <img> (the standard variant's own, and the wrapper's on the split variant through its "
                        'bg_img_class option) and the Lottie holder that replaces it'),
}
# Text parts the DB gives no evidence for, each read by hand and pinned by patterns that must still match the block's
# render source, or --check fails: `block:part` -> (patterns, reason).
CONFIRMED_TEXT = {
    'icon:label': ((r"'<span class=\"sgs-icon__label-text\">'\s*\.\s*esc_html\(\s*\$label_text\s*\)",),
                   'labelText is printed into the visible label span (the DB row names the hidden accessible-name span)'),
}
# Text evidence the DB gives but the render source contradicts, each read by hand and pinned by patterns that must still
# match the block's render source, or --check fails: `block:part` -> (patterns, reason).
REFUTED_TEXT = {
    'button:icon': ((r"'\$1<title>'\s*\.\s*\$icon_title",),
                    'iconTitle is printed as the icon SVG <title>, not as visible text; the part holds the icon'),
}


def read_text(path):
    with open(path, 'r', encoding='utf-8', errors='replace', newline='') as fh:
        return fh.read()


def strip_comments(src):
    src = re.sub(r'(?ms)^[ \t]*/\*.*?\*/', '', src)
    src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    return re.sub(r'(?m)^[ \t]*(//|#)[^\n]*', '', src)


def php_files(folder):
    out = []
    for root, _dirs, files in os.walk(folder):
        out += [os.path.join(root, f) for f in sorted(files) if f.endswith('.php')]
    return sorted(out)


def block_source(block_dir):
    """render.php and every other .php in the block folder; a static block is read from save.js."""
    files = php_files(block_dir)
    save = os.path.join(block_dir, 'save.js')
    if not files and os.path.isfile(save):
        files = [save]
    return '\n'.join(strip_comments(read_text(f)) for f in files)


def shared_sources(includes_dir):
    return [strip_comments(read_text(f)) for f in php_files(includes_dir)] if os.path.isdir(includes_dir) else []


def class_for(slug, part, spec):
    selector = spec.get('selector')
    if isinstance(selector, str) and SELECTOR_OK.match(selector):
        return selector.split(' ')[-1][1:]
    return f'sgs-{slug}__{part}'


def media_helpers(shared):
    """Names of shared functions that print only media elements (<img>, <picture>, <video>, <source>)."""
    names = set()
    for text in shared:
        pieces = re.split(r'\bfunction\s+(\w+)\s*\(', text)
        for name, body in zip(pieces[1::2], pieces[2::2]):
            tags = set(re.findall(r'<([a-zA-Z][a-zA-Z0-9]*)\b', body)) - {'php'}
            if tags and {t.lower() for t in tags} <= MEDIA_TAGS | {'source'}:
                names.add(name)
    return names


def direct_call_tag(text, pos, helpers):
    """'img' when `pos` sits inside the arguments of a call to a media-only helper."""
    window = text[max(0, pos - HELPER_BACK):pos]
    stop = max(window.rfind(';'), window.rfind('{'), window.rfind('}'))
    calls = re.findall(r'\b(\w+)\s*\(', window[stop + 1:])
    return 'img' if calls and calls[0] in helpers else None


def helper_call_tag(text, pos, helpers):
    """'img' when the class at `pos` reaches a media-only helper: written inside its call, or inside an array
    assigned to a variable that is then passed to that helper (every later use of the variable must be such a call)."""
    direct = direct_call_tag(text, pos, helpers)
    if direct:
        return direct
    window = text[max(0, pos - HELPER_BACK):pos]
    stop = max(window.rfind(';'), window.rfind('{'), window.rfind('}'))
    assign = re.search(r'\$(\w+)\s*=\s*array\s*\(', window[stop + 1:])
    if not assign:
        return None
    uses = [m.start() for m in re.finditer(r'\$' + assign.group(1) + r'\b', text[pos:]) if not text[pos + m.end():pos + m.end() + 2].lstrip().startswith(('[', '='))]
    return 'img' if uses and all(direct_call_tag(text, pos + u, helpers) for u in uses) else None


def tags_of(texts, cls, helpers=frozenset()):
    """The tag of every element that carries `cls` in `texts`; 'unknown' where the class is not inside an opening tag."""
    tags = set()
    found = False
    for text in texts:
        for m in re.finditer(r'(?<![.\w-])' + re.escape(cls) + r'(?![\w-])', text):
            found = True
            window = text[max(0, m.start() - TAG_BACK):m.start()]
            lt = window.rfind('<')
            tag = None
            in_class_attribute = re.search(r'''\bclass\s*=\s*["'][^"'<>]*$''', window) is not None
            if lt != -1 and in_class_attribute:
                seg = window[lt:].replace('=>', '').replace('->', '')
                name = re.match(r'<([a-zA-Z][a-zA-Z0-9]*)', seg)
                if name and '>' not in seg:
                    tag = name.group(1).lower()
            tags.add(tag or helper_call_tag(text, m.start(), helpers) or 'unknown')
    return found, tags


def text_selectors(db_path):
    """{block slug: {class: attribute name}} for every text attribute the DB says is printed into one class."""
    if not os.path.isfile(db_path):
        raise SystemExit(f'migrate-motion-part-kinds: the framework DB is missing at {db_path}')
    con = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    try:
        rows = con.execute(
            'SELECT block_slug, attr_name, derived_selector FROM block_attributes WHERE role IN (%s) AND attr_type IN (%s) '
            "AND derived_selector IS NOT NULL AND derived_selector != ''" % (','.join('?' * len(TEXT_ROLES)), ','.join('?' * len(TEXT_ATTR_TYPES))),
            TEXT_ROLES + TEXT_ATTR_TYPES).fetchall()
    finally:
        con.close()
    out = {}
    for slug, attr, selector in rows:
        for one in selector.split(','):
            one = one.strip()
            if re.match(r'^\.[A-Za-z][A-Za-z0-9_-]*$', one):
                out.setdefault(slug.split('/', 1)[-1], {}).setdefault(one[1:], attr)
    return out


def kinds_for(part, cls, found, tags, text_attr=None):
    """The kinds the evidence supports, with the reason for each."""
    kinds = {}
    if not found:
        return kinds
    element = cls.split('__', 1)[-1]
    if tags <= MEDIA_TAGS:
        kinds['surface'] = f"media element <{'/'.join(sorted(tags))}>"
    elif (BG_KEY.search(part) or BG_KEY.search(element)) and tags <= LAYER_TAGS | MEDIA_TAGS:
        kinds['surface'] = f"background layer <{'/'.join(sorted(tags))}> named {element}"
    if tags == {'svg'}:
        kinds['svg'] = 'carried by an <svg>'
    elif SVG_KEY.search(part) and tags <= LAYER_TAGS:
        kinds['svg'] = f"svg holder <{'/'.join(sorted(tags))}> named {element}"
    if tags <= TEXT_TAGS:
        kinds['text'] = f"text element <{'/'.join(sorted(tags))}>"
    elif text_attr and tags <= TEXT_HOLDER_TAGS:
        kinds['text'] = f"prints the text attribute {text_attr} (DB derived_selector) in <{'/'.join(sorted(tags))}>"
    return kinds


def parts_of(data):
    sgs = ((data.get('supports') or {}).get('sgs')) if isinstance(data, dict) else None
    if not isinstance(sgs, dict) or not sgs.get('motion'):
        return None
    elements = sgs.get('elements')
    return elements if isinstance(elements, dict) else {}


def analyse(blocks_dir, includes_dir, texts):
    """One row per motion part: its class, tags, evidence kinds and the markers it carries. `texts` is
    `text_selectors()`'s map."""
    rows = []
    shared = shared_sources(includes_dir)
    helpers = media_helpers(shared)
    for entry in sorted(os.listdir(blocks_dir)):
        path = os.path.join(blocks_dir, entry, 'block.json')
        if not os.path.isfile(path):
            continue
        try:
            data = json.loads(read_text(path))
        except ValueError:
            rows.append({'block': entry, 'part': None, 'path': path, 'unparsed': True})
            continue
        elements = parts_of(data)
        if elements is None:
            continue
        slug = data['name'].split('/', 1)[-1]
        own = block_source(os.path.join(blocks_dir, entry))
        for part, spec in elements.items():
            spec = spec if isinstance(spec, dict) else {}
            if part == 'root' or spec.get('isWrapper') or spec.get('motion') is False:
                continue
            cls = class_for(slug, part, spec)
            found, tags = tags_of([own] + [s for s in shared if cls in s], cls, helpers)
            kinds = kinds_for(part, cls, found, tags, (texts.get(slug) or {}).get(cls))
            confirmed = CONFIRMED.get(f'{slug}:{part}')
            stale = bool(confirmed) and not all(re.search(pat, own) for pat in confirmed[0])
            if confirmed and not stale:
                kinds['surface'] = confirmed[1]
            confirmed_text = CONFIRMED_TEXT.get(f'{slug}:{part}')
            if confirmed_text:
                if all(re.search(pat, own) for pat in confirmed_text[0]):
                    kinds['text'] = confirmed_text[1]
                else:
                    stale = True
            refuted = REFUTED_TEXT.get(f'{slug}:{part}')
            if refuted:
                if all(re.search(pat, own) for pat in refuted[0]):
                    kinds.pop('text', None)
                else:
                    stale = True
            rows.append({'block': entry, 'part': part, 'path': path, 'class': cls, 'tags': sorted(tags),
                         'kinds': kinds, 'found': found, 'stale_confirmation': stale,
                         'marked': sorted(k for k in ALL_KINDS if spec.get(k) is True),
                         'bad_marker': sorted(k for k in ALL_KINDS if k in spec and spec[k] is not True)})
    return rows


def ambiguous(row):
    return not row.get('unparsed') and not row['kinds'] and not row['marked']


# ---- format-safe insertion (the JSON-layout helpers are migrate-motion-support.py's) --------------------------

def _load_layout_helpers():
    import importlib.util
    spec = importlib.util.spec_from_file_location('migrate_motion_support', os.path.join(HERE, 'migrate-motion-support.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LAYOUT = _load_layout_helpers()
skip_ws, member_value_start, insert_first_member = LAYOUT.skip_ws, LAYOUT.member_value_start, LAYOUT.insert_first_member


def insert_markers(text, wanted):
    """`text` with `"<kind>": true` added to each part in `wanted` ({part: [kinds]}), or None when unsafe."""
    eol = '\r\n' if '\r\n' in text else '\n'
    try:
        expect = json.loads(text)
    except ValueError:
        return None
    out = text
    for part, kinds in wanted.items():
        for kind in kinds:
            node = skip_ws(out, 0)
            for key in ('supports', 'sgs', 'elements', part):
                node = member_value_start(out, node, key) if out[node] == '{' else None
                if node is None:
                    return None
            if out[node] != '{':
                return None
            out = insert_first_member(out, node, f'"{kind}": true', eol)
            expect['supports']['sgs']['elements'][part][kind] = True
    try:
        return out if json.loads(out) == expect else None
    except ValueError:
        return None


def is_dirty(path):
    """True when the file has uncommitted changes (unstaged or staged), is untracked, or git cannot tell."""
    folder = os.path.dirname(path)
    if subprocess.run(['git', 'ls-files', '--error-unmatch', '--', path], cwd=folder, capture_output=True).returncode != 0:
        return True
    return subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--', path], cwd=folder, capture_output=True).returncode != 0


def todo_by_file(rows):
    """{path: {part: [enforced kinds with evidence and no marker]}}"""
    todo = {}
    for r in rows:
        if r.get('unparsed'):
            continue
        need = [k for k in ENFORCED if k in r['kinds'] and k not in r['marked']]
        if need:
            todo.setdefault(r['path'], {})[r['part']] = need
    return todo


def survey(blocks_dir, includes_dir, as_json, texts):
    rows = analyse(blocks_dir, includes_dir, texts)
    parts = [r for r in rows if not r.get('unparsed')]
    if as_json:
        print(json.dumps(rows, indent=1))
        return rows
    for r in parts:
        kinds = ', '.join(f'{k} ({v})' for k, v in sorted(r['kinds'].items())) or 'none'
        flag = 'ambiguous' if ambiguous(r) else ('marked ' + ','.join(r['marked']) if r['marked'] else 'unmarked')
        print(f"{r['block']}:{r['part']}  class={r['class']}  tags={','.join(r['tags']) if r['found'] else 'not printed'}  "
              f"evidence={kinds}  [{flag}]")
    print()
    print(f'motion parts surveyed: {len(parts)} in {len({r["block"] for r in parts})} blocks')
    for kind in ALL_KINDS:
        hit = [r for r in parts if kind in r['kinds']]
        enforced = 'enforced' if kind in ENFORCED else 'surveyed only'
        per_block = {}
        for r in hit:
            per_block.setdefault(r['block'], []).append(r['part'])
        print(f'  {kind}: {len(hit)} parts, {len(per_block)} blocks ({enforced})')
        for block, names in sorted(per_block.items()):
            print(f'      {block}: {", ".join(names)}')
    print(f'  marked: ' + ', '.join(f"{k}={sum(1 for r in parts if k in r['marked'])}" for k in ALL_KINDS))
    print(f'  no evidence (left unmarked): {sum(1 for r in parts if ambiguous(r))}')
    print(f'  class not printed anywhere: {sum(1 for r in parts if not r["found"])}')
    unparsed = [r['block'] for r in rows if r.get('unparsed')]
    print(f'unrecognised (block.json does not parse): {len(unparsed)}' + (' ' + ', '.join(unparsed) if unparsed else ''))
    return rows


def fix(blocks_dir, includes_dir, apply, git_guard, texts):
    rows = analyse(blocks_dir, includes_dir, texts)
    refused, unrecognised, changed = [], [r['block'] for r in rows if r.get('unparsed')], []
    for path, wanted in sorted(todo_by_file(rows).items()):
        name = os.path.basename(os.path.dirname(path))
        if git_guard and is_dirty(path):
            refused.append(name)
            continue
        new_text = insert_markers(read_text(path), wanted)
        if new_text is None:
            unrecognised.append(name)
            continue
        changed.append(name)
        print(f'{name}: ' + '; '.join(f'{p} +{",".join(k)}' for p, k in sorted(wanted.items())))
        if apply:
            tmp = path + '.tmp'
            with open(tmp, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new_text)
            os.replace(tmp, path)
    print(('wrote' if apply else 'would write') + f' {len(changed)} block.json file(s)')
    if refused:
        print(f'REFUSED (uncommitted changes in the file): {", ".join(refused)}')
    if unrecognised:
        print(f'UNRECOGNISED: {", ".join(sorted(set(unrecognised)))}')
    return 1 if (refused or unrecognised) else 0


def check(blocks_dir, includes_dir, texts):
    rows = analyse(blocks_dir, includes_dir, texts)
    problems = []
    for r in rows:
        if r.get('unparsed'):
            problems.append(f"{r['block']}: block.json does not parse")
            continue
        if r['stale_confirmation']:
            problems.append(f"{r['block']}:{r['part']} is in CONFIRMED, CONFIRMED_TEXT or REFUTED_TEXT but its patterns no longer match the render source")
        for kind in ENFORCED:
            if kind in r['kinds'] and kind not in r['marked']:
                problems.append(f"{r['block']}:{r['part']} renders as {kind} ({r['kinds'][kind]}) but has no \"{kind}\": true")
        for kind in r['marked']:
            if kind not in r['kinds']:
                problems.append(f"{r['block']}:{r['part']} carries \"{kind}\": true but its markup ({r['class']} on "
                                f"{','.join(r['tags']) if r['found'] else 'nothing printed'}) is not a {kind}")
        for kind in r['bad_marker']:
            problems.append(f"{r['block']}:{r['part']} \"{kind}\" must be true or absent")
    for line in problems:
        print('FAIL ' + line)
    parts = [r for r in rows if not r.get('unparsed')]
    if not parts:
        problems.append('no motion parts found')
        print('FAIL no motion parts found')
    if not problems:
        print(f"OK {sum(1 for r in parts if r['marked'])} marked parts match their markup across {len(parts)} motion parts.")
    return 1 if problems else 0


def write_block(blocks, name, parts_json, render, newline='\n'):
    folder = os.path.join(blocks, name)
    os.makedirs(folder, exist_ok=True)
    body = '{\n\t"name": "sgs/%s",\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"motion": true,\n\t\t\t"elements": {\n%s\n\t\t\t}\n\t\t}\n\t}\n}\n' % (name, parts_json)
    with open(os.path.join(folder, 'block.json'), 'w', encoding='utf-8', newline='') as fh:
        fh.write(body.replace('\n', newline))
    with open(os.path.join(folder, 'render.php'), 'w', encoding='utf-8', newline='') as fh:
        fh.write(render)


def git(cwd, *args):
    return subprocess.run(['git', '-c', 'user.email=t@t', '-c', 'user.name=t', *args], cwd=cwd, capture_output=True)


def self_test():
    failures = []

    def expect(label, got, want):
        if got != want:
            failures.append(f'{label}: got {got!r}, wanted {want!r}')

    root = tempfile.mkdtemp(prefix='part-kind-selftest-')
    try:
        blocks, includes = os.path.join(root, 'blocks'), os.path.join(root, 'includes')
        os.makedirs(blocks)
        os.makedirs(includes)
        parts = ',\n'.join('\t\t\t\t"%s": { "label": "%s" }' % (k, k) for k in
                           ('wrapper_x', 'bg', 'photo', 'clip', 'logo', 'title', 'plain', 'ghost', 'shared-bg', 'mixed',
                            'name', 'icon', 'figure', 'bg-held'))
        parts = parts.replace('"wrapper_x": { "label": "wrapper_x" }', '"wrapper": { "label": "w", "isWrapper": true }')
        parts += ',\n\t\t\t\t"skipped": { "motion": false, "label": "s" },\n\t\t\t\t"holder": { "selector": ".sgs-demo__held", "label": "h" }'
        render = ('<div class="sgs-demo"><span class="sgs-demo__bg"></span>\n<img class="sgs-demo__photo" src="x">'
                  '<video class="sgs-demo__clip"></video><svg class="sgs-demo__logo"></svg><h2 class="sgs-demo__title">T</h2>'
                  '<div class="sgs-demo__plain"></div><div class="sgs-demo__held"></div><img class="sgs-demo__mixed"><p class="sgs-demo__mixed">'
                  '<span class="sgs-demo__name">N</span><span class="sgs-demo__icon"></span><figure class="sgs-demo__figure"></figure>'
                  '<img class="sgs-demo__skipped"><div class="sgs-demo__bg-held"></div><img class="sgs-demo__bg-held">'
                  '\n// <div class="sgs-demo__ghost">\n</div>')
        # The DB says a text attribute is printed into name and figure; only name is a text holder.
        texts = {'demo': {'sgs-demo__name': 'name', 'sgs-demo__figure': 'caption'}}
        write_block(blocks, 'demo', parts, render, '\r\n')
        with open(os.path.join(includes, 'shared.php'), 'w', encoding='utf-8') as fh:
            fh.write('<div class="sgs-demo__shared-bg"></div>')
        rows = {r['part']: r for r in analyse(blocks, includes, texts)}
        expect('part set', sorted(rows), ['bg', 'bg-held', 'clip', 'figure', 'ghost', 'holder', 'icon', 'logo', 'mixed', 'name', 'photo',
                                          'plain', 'shared-bg', 'title'])
        expect('background layer is a surface', 'surface' in rows['bg']['kinds'], True)
        expect('img is a surface', 'surface' in rows['photo']['kinds'], True)
        expect('video is a surface', 'surface' in rows['clip']['kinds'], True)
        expect('svg is svg and not a surface', ('svg' in rows['logo']['kinds'], 'surface' in rows['logo']['kinds']), (True, False))
        expect('heading is text only', sorted(rows['title']['kinds']), ['text'])
        expect('plain div is ambiguous', ambiguous(rows['plain']), True)
        expect('a class in a comment is not printed', rows['ghost']['found'], False)
        expect('mixed tags are ambiguous', ambiguous(rows['mixed']), True)
        expect('a background part on its image and on the image holder is a surface', 'surface' in rows['bg-held']['kinds'], True)
        expect('a bg layer printed in a shared include counts', 'surface' in rows['shared-bg']['kinds'], True)
        expect('a div with a declared selector is ambiguous', ambiguous(rows['holder']), True)
        expect('a span the DB prints a text attribute into is text', sorted(rows['name']['kinds']), ['text'])
        expect('a span with no DB text attribute is ambiguous', ambiguous(rows['icon']), True)
        expect('a DB text attribute on a non-text tag is not text', ambiguous(rows['figure']), True)
        bare = {r['part']: r for r in analyse(blocks, includes, {})}
        expect('without DB evidence the span is not text', 'text' in bare['name']['kinds'], False)
        expect('planted evidence without markers fails the check', check(blocks, includes, texts), 1)
        expect('fix dry run changes nothing', (fix(blocks, includes, False, False, texts), check(blocks, includes, texts)), (0, 1))
        expect('fix apply', fix(blocks, includes, True, False, texts), 0)
        expect('clean tree passes the check', check(blocks, includes, texts), 0)
        expect('fix is idempotent', fix(blocks, includes, True, False, texts), 0)
        text = read_text(os.path.join(blocks, 'demo', 'block.json'))
        expect('CRLF kept', ('\r\n' in text, text.replace('\r\n', '').count('\n')), (True, 0))
        data = json.loads(text)['supports']['sgs']['elements']
        expect('markers written', sorted(k for k, v in data.items() if v.get('surface')), ['bg', 'bg-held', 'clip', 'photo', 'shared-bg'])
        expect('text markers written', sorted(k for k, v in data.items() if v.get('text')), ['name', 'title'])
        expect('svg markers written', sorted(k for k, v in data.items() if v.get('svg')), ['logo'])
        # Negative controls.
        data['plain']['surface'] = True
        with open(os.path.join(blocks, 'demo', 'block.json'), 'w', encoding='utf-8') as fh:
            fh.write(json.dumps({'name': 'sgs/demo', 'supports': {'sgs': {'motion': True, 'elements': data}}}))
        expect('a marker without evidence fails the check', check(blocks, includes, texts), 1)
        data['plain'].pop('surface')
        data['bg'].pop('surface')
        demo_json = os.path.join(blocks, 'demo', 'block.json')

        def write_demo(elements):
            with open(demo_json, 'w', encoding='utf-8') as fh:
                fh.write(json.dumps({'name': 'sgs/demo', 'supports': {'sgs': {'motion': True, 'elements': elements}}}))

        write_demo(data)
        expect('a removed marker fails the check', check(blocks, includes, texts), 1)
        expect('restore by fix', (fix(blocks, includes, True, False, texts), check(blocks, includes, texts)), (0, 0))
        for kind, part in (('text', 'name'), ('svg', 'logo')):
            data = json.loads(read_text(demo_json))['supports']['sgs']['elements']
            data[part].pop(kind)
            write_demo(data)
            expect(f'a removed {kind} marker fails the check', check(blocks, includes, texts), 1)
            expect(f'restore the {kind} marker by fix', (fix(blocks, includes, True, False, texts), check(blocks, includes, texts)), (0, 0))
        data = json.loads(read_text(demo_json))['supports']['sgs']['elements']
        data['icon']['text'] = True
        write_demo(data)
        expect('a text marker without evidence fails the check', check(blocks, includes, texts), 1)
        data['icon'].pop('text')
        write_demo(data)
        # A refutation pin whose pattern no longer matches the render source fails the check.
        REFUTED_TEXT['demo:name'] = ((r'no-such-pattern',), 'planted')
        try:
            expect('a stale refutation fails the check', check(blocks, includes, texts), 1)
        finally:
            REFUTED_TEXT.pop('demo:name')
        REFUTED_TEXT['demo:name'] = ((r'sgs-demo__name',), 'planted')
        try:
            refuted = {r['part']: r for r in analyse(blocks, includes, texts)}
            expect('a matching refutation removes the DB text evidence', 'text' in refuted['name']['kinds'], False)
        finally:
            REFUTED_TEXT.pop('demo:name')
        # The DB reader: a real sqlite file in the shape of block_attributes, opened read-only.
        db = os.path.join(root, 'fw.db')
        con = sqlite3.connect(db)
        con.execute('CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, derived_selector TEXT)')
        con.executemany('INSERT INTO block_attributes VALUES (?, ?, ?, ?, ?)', [
            ('sgs/demo', 'name', 'string', 'text-content', '.sgs-demo__name'),
            ('sgs/demo', 'items', 'array', 'text-content', '.sgs-demo__items'),
            ('sgs/demo', 'tone', 'string', 'behaviour', '.sgs-demo__tone'),
            ('sgs/demo', 'pair', 'rich-text', 'content', '.sgs-demo__a, .sgs-demo__b'),
        ])
        con.commit()
        con.close()
        expect('the DB reader keeps string and rich-text text roles only', text_selectors(db),
               {'demo': {'sgs-demo__name': 'name', 'sgs-demo__a': 'pair', 'sgs-demo__b': 'pair'}})
        # A block without the motion support is out of scope.
        write_block(blocks, 'quiet', '				"bg": { "label": "b" }', '<div class="sgs-quiet__bg"></div>')
        with open(os.path.join(blocks, 'quiet', 'block.json'), 'w', encoding='utf-8') as fh:
            fh.write('{ "name": "sgs/quiet", "supports": { "sgs": { "elements": { "bg": {} } } } }')
        expect('a block without motion is not surveyed', 'quiet' in {r['block'] for r in analyse(blocks, includes, texts)}, False)
        # The dirty-file guard, in a real throwaway repository.
        repo = os.path.join(root, 'repo')
        rb = os.path.join(repo, 'blocks')
        os.makedirs(rb)
        git(repo, 'init', '-q')
        write_block(rb, 'clean', '\t\t\t\t"bg": { "label": "b" }', '<div class="sgs-clean__bg"></div>')
        write_block(rb, 'dirty', '\t\t\t\t"bg": { "label": "b" }', '<div class="sgs-dirty__bg"></div>')
        git(repo, 'add', '-A')
        git(repo, 'commit', '-q', '-m', 'init')
        dirty_path = os.path.join(rb, 'dirty', 'block.json')
        with open(dirty_path, 'a', encoding='utf-8', newline='') as fh:
            fh.write('\n')
        before = read_text(dirty_path)
        expect('the guard refuses a dirty file and reports it', fix(rb, includes, True, True, {}), 1)
        expect('the dirty file is byte-identical', read_text(dirty_path), before)
        expect('the clean file got its marker', '"surface": true' in read_text(os.path.join(rb, 'clean', 'block.json')), True)
        expect('a staged change is dirty too', (git(repo, 'add', 'blocks/dirty/block.json').returncode, is_dirty(dirty_path)), (0, True))
        expect('an untracked file is dirty', is_dirty(os.path.join(root, 'blocks', 'demo', 'block.json')), True)
    finally:
        shutil.rmtree(root, ignore_errors=True)
    for line in failures:
        print('SELF-TEST FAIL ' + line)
    print('self-test ' + ('FAILED' if failures else 'passed'))
    return 1 if failures else 0


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
        survey(BLOCKS_DIR, INCLUDES_DIR, args.json, text_selectors(DB_PATH))
        return 0
    if args.fix:
        return fix(BLOCKS_DIR, INCLUDES_DIR, args.apply, True, text_selectors(DB_PATH))
    if args.check:
        return check(BLOCKS_DIR, INCLUDES_DIR, text_selectors(DB_PATH))
    parser.print_help()
    return 2


if __name__ == '__main__':
    sys.exit(main())
