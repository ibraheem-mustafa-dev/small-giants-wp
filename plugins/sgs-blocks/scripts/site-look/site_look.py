"""The site look: what each SGS block looks like by default on one site, worked out offline from the block's code and the
site's theme snapshot (setting-record plan, Task 4; Bean 2026-11-23). It replaces calibration's browser-measured default
paint: no site, no browser.

Each block is rendered from the current code through the setting record's own runner (setting-record/render.py, renders
cached by code version), drawn inside its fixture's parents and the page frame as the record's proof draws it
(setting-record/proof.py::Pages), and its rules are ranked against the site's CSS by the record's cascade reader
(setting-record/computed.py::Page). The site's CSS is what WordPress prints for the site: the theme's theme.json with the
snapshot merged over it, turned into global styles (presets, element styles for buttons, links and headings, core block
styles: setting-record/theme.py::global_css), the theme's colour roles and type scale, its front-end stylesheets, and the
snapshot's own custom CSS (`styles.css`).

Output per block, in the shape the cloning route reads (scripts/computed-route/lib/cache.mjs::loadCalibration):
  elements[path][width][property] for widths 375, 768 and 1440, paths named as the route names them
  (scripts/parity/lib/ref-trace.mjs::elementPath, ported in element_path), with `_tag`, `_own:<property>`, `_fs`,
  `_parentDisplay` and `_position` on the default renders; `<path>::before` / `::after` where content is drawn; `@controls`
  for a panel the block opens that sits outside its root, `@companion` for a piece the block prints elsewhere (its instance
  class), `@scrim` for its scrim. paintStates[name] = {when, elements} for the record fixture's paint states.
  pathClasses[path] the element's classes; pathAttrs[path] the attributes a rule of the site's CSS tests that the element
  carries (tested_attrs: an item saved open is `{open: ''}`, the current link `{aria-current: 'page'}`), so a reader can
  place a setting a selector keys on such an attribute only where it holds.
A path keeps the reading of the first variant that draws it (as calibration did). Sizes the reader cannot lay out (an
`auto` width) stay as the cascade gives them; the route compares sizes as declared.

This folder is apart from setting-record/ on purpose: setting-record/stamp.py hashes every module there as the check's own
code, so a file added there would mark every record stale.

Usage:
  python site_look.py --snapshot sites/<client>/theme-snapshot.json --site <site> --out DIR [--blocks sgs/a,sgs/b | --all]
                      [--woocommerce] [--jobs N]
"""
from __future__ import annotations

import argparse
import ast
import copy
import functools
import hashlib
import json
import re
import sys
import time
import uuid
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parents[1]
REPO = PLUGIN.parents[1]
SETREC = PLUGIN / 'scripts' / 'setting-record'
sys.path.insert(0, str(SETREC))

import check as CK  # noqa: E402
import computed as CP  # noqa: E402
import proof as PF  # noqa: E402
import render as RN  # noqa: E402
import stamp as ST  # noqa: E402
import theme as TH  # noqa: E402
from bs4 import Tag  # noqa: E402

FORMAT = 1
# SITE_LOOK_MUTATE=<mechanism> switches one mechanism off, so its must-fail test can be seen failing (tests/test_site_look.py)
import os as _os  # noqa: E402
MUTATE = set(filter(None, (_os.environ.get('SITE_LOOK_MUTATE') or '').split(',')))
WIDTHS = (375, 768, 1440)
ROUTE = REPO / 'scripts' / 'computed-route'
PROPS_FILE = HERE / 'props.json'
FIXTURES = SETREC / 'fixtures.json'
FIXTURES_DIR = SETREC  # a fixture's harness files are named relative to fixtures.json's folder
BEM = re.compile(r'^sgs-[a-z0-9-]+(__[a-z0-9-]+)?$')
UID = re.compile(r'-[0-9a-f]{8}$')
UID_CLASS = re.compile(r'^sgs-[a-z0-9-]+-[0-9a-f]{8}$')
# Inherited properties the cascade reader does not compute (computed.py::INITIAL lacks them): kept here, not added there,
# because a change to setting-record/ marks every record stale.
EXTRA_INHERITED = {'font-style': 'normal', 'text-shadow': 'none'}


def builder_hash(files=None) -> str:
    """The hash of this builder and the record modules it reads (`files`, default those), so a change to the code of either
    rebuilds every site look; an edit to a comment or a docstring does not (setting-record/stamp.py::code_hash)."""
    h = hashlib.sha256()
    for f in sorted(files if files is not None else [Path(__file__), PROPS_FILE, *SETREC.glob('*.py')]):
        h.update(f.name.encode())
        h.update(ST.code_hash(f).encode())
    return h.hexdigest()[:16]


# ---------------------------------------------------------------- the site's CSS


def deep_merge(base, over):
    """A snapshot over theme.json the way the site's global styles override the theme: objects merge key by key, any other
    value (a preset list included) is replaced."""
    if isinstance(base, dict) and isinstance(over, dict):
        out = dict(base)
        for k, v in over.items():
            out[k] = deep_merge(base.get(k), v) if k in base else copy.deepcopy(v)
        return out
    return copy.deepcopy(over)


def site_theme(snapshot: dict) -> dict:
    theme = json.loads((REPO / TH.THEME_REL / 'theme.json').read_text(encoding='utf-8'))
    if 'snapshot' in MUTATE:
        return theme
    return deep_merge(theme, {k: snapshot[k] for k in ('settings', 'styles') if k in snapshot})


def site_css(snapshot: dict, woocommerce: bool = False) -> str:
    """The CSS WordPress prints for the site, in page order: global styles, colour roles, the theme's front-end sheets,
    the type scale, the snapshot's custom CSS (WordPress prints `styles.css` after the global styles)."""
    theme = site_theme(snapshot)
    parts = [TH.global_css(theme), TH.colour_roles_css(theme)]
    theme_dir = REPO / TH.THEME_REL
    parts += [f.read_text(encoding='utf-8') for f in TH.front_end_sheets(theme_dir)]
    if woocommerce:
        wc = theme_dir / 'assets' / 'css' / 'woocommerce.css'
        if wc.is_file():
            parts.append(wc.read_text(encoding='utf-8'))
    parts.append(TH.type_scale_ranges_css(theme))
    custom = (snapshot.get('styles') or {}).get('css')
    if custom and 'custom-css' not in MUTATE:
        parts.append(custom)
    return '\n'.join(p for p in parts if p)


def site_layout(snapshot: dict) -> dict:
    """theme.py::layout for the merged theme: content and wide size, and the root padding at each sampled width."""
    theme = site_theme(snapshot)
    lay = theme['settings'].get('layout', {})
    gutter = (theme['settings'].get('custom') or {}).get('gutter') or {}
    base = (theme.get('styles', {}).get('spacing', {}).get('padding') or {}).get('left', '0px')
    pad = {}
    for w in WIDTHS:
        tier = 'mobile' if w < 768 else 'tablet' if w < 1024 else 'desktop'
        pad[w] = TH.to_px(TH._resolve_vars(gutter.get(tier, base), theme), w)
    return {'contentSize': TH.to_px(TH._resolve_vars(lay['contentSize'], theme), 1440),
            'wideSize': TH.to_px(TH._resolve_vars(lay['wideSize'], theme), 1440), 'rootPadding': pad}


# ---------------------------------------------------------------- the route's names


def load_props() -> dict:
    """The properties calibration read, from the route (lib/calibrate-props.mjs), kept beside this file so a build needs no
    Node: READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, OWN_INHERITED."""
    return json.loads(PROPS_FILE.read_text(encoding='utf-8'))


def _children(el) -> list:
    return [c for c in el.children if isinstance(c, Tag)]


def element_path(el, ref) -> str:
    """scripts/parity/lib/ref-trace.mjs::elementPath: each step is the element's own sgs- class (a block or BEM class, not a
    modifier, not an instance id) or else its tag, with :nth-of-type(n) when the parent has two or more children that the
    step would also name."""
    def step(e):
        bem = next((c for c in (e.get('class') or []) if BEM.match(c) and '--' not in c and not UID.search(c)), None)
        base = f'.{bem}' if bem else e.name
        p = e.parent
        if not isinstance(p, Tag) or p.name == '[document]':
            return base
        kids = _children(p)
        same = [s for s in kids if (bem in (s.get('class') or [])) if bem] if bem else [s for s in kids if s.name == e.name]
        if len(same) < 2:
            return base
        of_type = [s for s in kids if s.name == e.name]
        return f'{base}:nth-of-type({of_type.index(e) + 1})'
    steps = []
    e = el
    while e is not None and e is not ref:
        steps.insert(0, step(e))
        e = e.parent if isinstance(e.parent, Tag) else None
    return ' > '.join(steps)


# ---------------------------------------------------------------- reading one page


MATH = re.compile(r'\s*(clamp|min|max|calc)\(.*\)\s*')


def _math(v, width):
    """A length the cascade reader left as a math function (math written straight inside clamp(), which it does not
    evaluate) computed to px the way the browser computes it (theme.py::to_px evaluates clamp, min, max and calc)."""
    if isinstance(v, str) and MATH.fullmatch(v):
        try:
            return CP.fmt_px(TH.to_px(v, width))
        except Exception:  # noqa: BLE001 - not a length after all (a colour or a time): kept as the reader gave it
            return v
    return v


def _value(page, el, pseudo, prop, width, parent_vals):
    return _math(_value_raw(page, el, pseudo, prop, width, parent_vals), width)


def _value_raw(page, el, pseudo, prop, width, parent_vals):
    if prop == 'font-size':
        # the reader computes a font size through its own length reader, which falls back to the parent's size on math
        # written inside clamp(); a declared math font size is evaluated here instead
        raw = page.raw(el, pseudo, width).get('font-size')
        if isinstance(raw, str) and MATH.fullmatch(raw):
            return raw
    if prop == 'gap':
        # the reader expands the shorthand into its longhands; the browser serialises it back (one value when both agree)
        comp = page.computed(el, pseudo, width)
        row, col = comp.get('row-gap'), comp.get('column-gap')
        return row if row == col else f'{row} {col}'
    if prop in CP.INITIAL:
        return page.computed(el, pseudo, width).get(prop)
    raw = page.raw(el, pseudo, width).get(prop)
    if prop in EXTRA_INHERITED:
        if raw in (None, 'inherit', 'unset'):
            return parent_vals.get(prop, EXTRA_INHERITED[prop]) if parent_vals is not None else EXTRA_INHERITED[prop]
        return EXTRA_INHERITED[prop] if raw == 'initial' else raw
    return raw


def read_element(page, el, width: int, props: list, own_props: list, with_own: bool, parent_vals) -> dict:
    out = {p: v for p in props if (v := _value(page, el, None, p, width, parent_vals)) is not None}
    out['_tag'] = el.name
    if with_own:
        comp = page.computed(el, None, width)
        raw = page.raw(el, None, width)
        own = {f'_own:{p}': out[p] for p in own_props if p in out and raw.get(p) not in (None, 'inherit', 'unset')}
        if own:
            own['_fs'] = comp.get('font-size')
        out.update(own)
        for p in ('min-height', 'min-width'):
            if raw.get(p) not in (None, 'auto', 'initial', 'unset'):
                out[f'_own:{p}'] = comp.get(p)
        parent = el.parent
        out['_parentDisplay'] = page.computed(parent, None, width).get('display', 'block') if isinstance(parent, Tag) and parent.name != '[document]' else 'block'
        out['_position'] = comp.get('position')
    return out


def collect(page, top, prefix: str, els: dict, props: dict, with_own: bool) -> None:
    """Every element of `top` (itself included) at every width, keyed as the route keys it, with its drawn pseudo-elements;
    a key already read (by an earlier variant) is kept."""
    nodes = [top, *top.find_all(True)]
    for el in nodes:
        p = element_path(el, top)
        key = (f'{prefix} > {p}' if p else prefix) if prefix else p
        if key in els or el.name in ('style', 'script', 'template'):
            continue
        byw = {}
        for w in WIDTHS:
            parent_vals = None
            if isinstance(el.parent, Tag) and el.parent.name != '[document]':
                parent_vals = {q: _value(page, el.parent, None, q, w, None) for q in EXTRA_INHERITED}
            byw[str(w)] = read_element(page, el, w, props['read'], props['own'], with_own, parent_vals)
        els[key] = byw
        for ps in ('before', 'after'):
            if all(page.computed(el, ps, w).get('_absent') for w in WIDTHS):
                continue
            els[f'{key}::{ps}'] = {str(w): {q: v for q in props['pseudo'] if (v := _value(page, el, ps, q, w, None)) is not None} for w in WIDTHS}
        if el.name in ('input', 'textarea'):
            els[f'{key}::placeholder'] = {str(w): {q: v for q in props['text'] if (v := _value(page, el, 'placeholder', q, w, None)) is not None} for w in WIDTHS}


def path_classes(page, out: dict) -> None:
    """{path: [classes]} for every element read_page keys (a path keeps the first variant's element)."""
    root = page.root
    if root is None:
        return

    def walk(top, prefix):
        for el in [top, *top.find_all(True)]:
            p = element_path(el, top)
            key = (f'{prefix} > {p}' if p else prefix) if prefix else p
            if key not in out and el.name not in ('style', 'script', 'template'):
                out[key] = list(el.get('class') or [])
    walk(root, '')
    for n, t in enumerate(controlled(page, root), 1):
        walk(t, '@controls' if n == 1 else f'@controls:{n}')


# An attribute a rule's selector tests: `[open]`, `[aria-current="page"]`, `[data-x~="y"]`.
ATTR_SELECTOR = re.compile(r'\[\s*([A-Za-z_][\w:-]*)\s*(?:[~|^$*]?=|\])')


DECLARATIONS = re.compile(r'\{[^{}]*\}')


def selectors_only(css: str) -> str:
    """The CSS with every declaration block emptied, innermost first (`[full-start]` in a grid template is a value, not a
    selector), so what is left is selectors and at-rule preludes."""
    text = re.sub(r'/\*.*?\*/', '', css or '', flags=re.S)
    while True:
        out = DECLARATIONS.sub('{}', text)
        if out == text:
            return out
        text = out.replace('{}', '\x00')


def tested_attrs(texts) -> set:
    """The attribute names a rule of the page's CSS tests in its selectors (`class` and `style` aside: the classes are
    pathClasses), the attributes that decide which rules an element matches, such as the open item of an accordion or
    the current link."""
    return {m.group(1).lower() for t in texts for m in ATTR_SELECTOR.finditer(selectors_only(t))} - {'class', 'style'}


def path_attrs(page, out: dict, names: set) -> None:
    """{path: {attribute: value}} for every element read_page keys that carries an attribute in `names` (a path keeps
    the first variant's element; an element with none is left out)."""
    root = page.root
    if root is None:
        return

    def walk(top, prefix):
        for el in [top, *top.find_all(True)]:
            p = element_path(el, top)
            key = (f'{prefix} > {p}' if p else prefix) if prefix else p
            if key in out or el.name in ('style', 'script', 'template'):
                continue
            got = {a: (' '.join(v) if isinstance(v, list) else str(v)) for a, v in el.attrs.items() if a.lower() in names}
            out[key] = got
    walk(root, '')
    for n, t in enumerate(controlled(page, root), 1):
        walk(t, '@controls' if n == 1 else f'@controls:{n}')


def read_page(page, els: dict, props: dict, with_own: bool) -> None:
    root = page.root
    if root is None:
        return
    collect(page, root, '', els, props, with_own)
    for n, t in enumerate(controlled(page, root), 1):
        collect(page, t, '@controls' if n == 1 else f'@controls:{n}', els, props, with_own)
    uid = next((c for c in (root.get('class') or []) if UID_CLASS.match(c)), None)
    if uid:
        k = 0
        for c in page.soup.select(f'.{uid}'):
            if c is root or _inside(c, root) or _inside(root, c):
                continue
            k += 1
            collect(page, c, '@companion' if k == 1 else f'@companion:{k}', els, props, with_own)
        scrim = page.soup.select_one(f'.{uid}-scrim')
        if scrim is not None and not _inside(scrim, root):
            collect(page, scrim, '@scrim', els, props, with_own)


SECTION_MARK = '<!--sgs-site-look-block-->'
# The section shell's root carries this attribute (no stylesheet tests it), so the reader never takes the shell for the block.
SECTION_ROOT_ATTR = 'data-sgs-site-look-section'


def section_shell(rn, short: str):
    """(before, after, css): an sgs/container rendered around a marker, the section a block sits in on a page (calibration
    drew every block inside one). The container prints its children from its inner blocks, so the block is handed to it as
    one. None when the container does not render."""
    # its own renderer: a block's fixture can hand the runner options (a render file, stand-ins) meant for that block only
    res = RN.Renderer(PLUGIN, {}, FIXTURES_DIR, 'container').render('sgs/container', RN.with_defaults(PLUGIN, 'container', {}), SECTION_MARK,
                    [{'name': 'core/html', 'attributes': {}, 'html': SECTION_MARK}])
    html = res.get('html', '') if res.get('ok') else ''
    if SECTION_MARK not in html:
        raise RuntimeError(f'sgs/container did not print the block it holds: {(res.get("error") or html)[:200]}')
    before, _, after = html.partition(SECTION_MARK)
    before = re.sub(r'<(?!style\b)([a-z][a-z0-9]*)', lambda m: f'<{m.group(1)} {SECTION_ROOT_ATTR}=""', before, count=1)
    return before, after, res.get('css', '')


def framed(res: dict, section) -> dict:
    """A render drawn inside its section (what wp_footer printed is moved to the end of the page by settle())."""
    if not res.get('ok') or not section:
        return res
    return {**res, 'html': section[0] + res.get('html', '') + section[1], 'css': (res.get('css') or '') + '\n' + section[2]}


def footer_signatures(res: dict) -> list:
    """(tag, classes, id) of each top-level element wp_footer printed. The runner appends the footer's markup to the
    block's, and the Interactivity and post steps rewrite the whole markup afterwards, so the printed pieces are found in
    the page by what they are, not by where the text ends."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(res.get('footerHtml') or '', 'html.parser')
    return [(c.name, tuple(c.get('class') or ()), c.get('id')) for c in soup.children
            if isinstance(c, Tag) and c.name not in ('style', 'script', 'link')]


def settle(page, res: dict) -> None:
    """The page as a visitor's browser holds it after load: what wp_footer printed sits at the end of <body> (the runner
    appends it to the block's markup, inside the post content), and the theme's overlay-scroll script has run."""
    import cascade as C
    # The block's root is the element its wrapper attributes print on (WordPress's wp-block-sgs-<name> class), where
    # calibration put its instance class: computed.py::Page takes the first element with the block's own class, which in a
    # block whose wrapper prints only the WordPress class (sgs/icon-list, sgs/business-info) is an inner element.
    # A block drawn in its section is never the section's own container: an sgs/container sits inside the section shell
    # (section_shell), nested as every section of a cloned page sits inside the page's root container, so its default is a
    # nested section's (FR-32-15's section padding skips a section nested in another).
    shell = page.soup.find(attrs={SECTION_ROOT_ATTR: True})
    wrapper = next((w for w in page.soup.select(f'.wp-block-sgs-{page.short}') if w is not shell), None)
    if wrapper is not None and 'wrapper-root' not in MUTATE:
        page.root = wrapper
    moved = False
    if 'footer-move' not in MUTATE:
        content = page.soup.select_one('.entry-content')
        for tag, classes, ident in footer_signatures(res):
            for el in (content.find_all(tag) if content is not None else []):
                if tuple(el.get('class') or ()) == classes and el.get('id') == ident and (page.root is None or not (el is page.root or _inside(el, page.root))):
                    page.soup.body.append(el.extract())
                    moved = True
                    break
    if moved:
        page.cascade = C.Cascade(page.soup, page.rules, page.held)
        page.memo, page.raw_memo = {}, {}
    overlay_scroll(page)


def overlay_scroll(page) -> None:
    """What the theme's assets/js/sgs-overlay-scroll.js does on load, applied to the page: every element matching its
    OVERLAY_SELECTORS gains a hidden thumb child and the class sgs-overlay-scroll, plus sgs-overlay-scroll--relative when
    its position is static (the script's mount())."""
    import soupsieve as sv
    import cascade as C
    js = (REPO / TH.THEME_REL / 'assets' / 'js' / 'sgs-overlay-scroll.js').read_text(encoding='utf-8')
    m = re.search(r'OVERLAY_SELECTORS = \[(.*?)\]\.join', js, flags=re.S)
    if not m:
        raise RuntimeError('sgs-overlay-scroll.js no longer lists OVERLAY_SELECTORS as the builder reads it')
    hits = sv.select(', '.join(re.findall(r"'([^']+)'", m.group(1))), page.soup)
    if not hits:
        return
    statics = [page.computed(el, None, 1440)['position'] == 'static' for el in hits]
    for el, static in zip(hits, statics):
        el.append(page.soup.new_tag('div', attrs={'class': 'sgs-overlay-scroll__thumb', 'aria-hidden': 'true', 'hidden': ''}))
        el['class'] = list(el.get('class', [])) + ['sgs-overlay-scroll'] + (['sgs-overlay-scroll--relative'] if static else [])
    page.cascade = C.Cascade(page.soup, page.rules, page.held)
    page.memo, page.raw_memo = {}, {}


def _inside(el, anc) -> bool:
    e = el.parent
    while isinstance(e, Tag):
        if e is anc:
            return True
        e = e.parent
    return False


# ---------------------------------------------------------------- one block


def build_block(short: str, snapshot_file: Path, woocommerce: bool, parts=None, shared=None) -> dict:
    """The block's look under the snapshot. `parts` (default ALL_PARTS) names what is read here: CLIENT_PARTS reads all but
    the value forms and the content facts, which come from `shared` (shared_facts, assembled by with_forms and
    with_content); SHARED_PARTS reads only those two and returns the shared document (shared_doc)."""
    parts = ALL_PARTS if parts is None else parts
    snapshot = json.loads(snapshot_file.read_text(encoding='utf-8'))
    props = load_props()
    fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))
    # the block as a new node renders it: the fixture's `attributes` alone, never the `checkAttributes` the record check
    # adds to test a part's settings (a shown label or a background image would be a part the draft's element lacks)
    pl = CK.load_plan(short, PLUGIN, fixtures, None, plain='plain-fixture' not in MUTATE)
    fixture = pl['fixture'] or {}
    rn = RN.Renderer(PLUGIN, fixture, FIXTURES_DIR, short)
    content, inner = rn.render_inner(fixture.get('inner'))
    if not fixture.get('inner') and fixture.get('content'):
        content = fixture['content']
    children = sorted(set(re.findall(r'"name": "sgs/([a-z0-9-]+)"', json.dumps(fixture.get('inner') or []))))
    insts = [i for i in pl['instances'] if i['isDefault'] or i.get('paintState')]
    bridge = bridge_plan(f'sgs/{short}', snapshot_file)
    marked = bridge.get('discover', []) + bridge.get('content', []) + bridge.get('forms', []) + bridge.get('states', [])
    jobs = {i['key']: RN.with_defaults(PLUGIN, short, RN.fill(i['attrs'])) for i in insts}
    jobs.update({f'b:{i["key"]}': RN.with_defaults(PLUGIN, short, RN.fill(i['attrs'])) for i in marked})
    results = rn.render_many(f'sgs/{short}', jobs, content, inner)
    section = None if fixture.get('parents') or 'section' in MUTATE else section_shell(rn, short)
    shown = {k: framed(r, section) for k, r in results.items()}
    run = {'plugin': PLUGIN, 'children': children + (['container'] if section else []), 'results': shown, 'jobs': dict(jobs),
           'plan': pl, 'renderer': rn, 'theme_css': site_css(snapshot, woocommerce), 'layout': site_layout(snapshot)}
    pages = PF.Pages(short, run)
    errors = {k: (r.get('error') or '')[:300] for k, r in results.items() if not r.get('ok')}
    reader = Reader(pages, results, props)
    elements, classes, attrs = {}, {}, {}
    names = set() if 'path-attrs' in MUTATE else tested_attrs([pages.theme_text, *pages.texts, *(r.get('css') or '' for r in results.values())])
    for i in sorted((i for i in insts if i['isDefault']), key=lambda i: i['variant']):
        if results[i['key']].get('ok'):
            read_page(reader.page(i['key']), elements, props, True)
            path_classes(reader.page(i['key']), classes)
            path_attrs(reader.page(i['key']), attrs, names)
    paint_states = {}
    for st in (fixture.get('paintStates') or []) if 'client' in parts else []:
        i = next((x for x in insts if x.get('paintState') == st['name']), None)
        if i is None or not results[i['key']].get('ok'):
            continue
        els = {}
        read_page(reader.page(i['key']), els, props, True)
        paint_states[st['name']] = {'when': st.get('when') or {}, 'elements': state_paint(resting(els, props), st.get('props'))}
    facts = setting_facts(bridge, reader, parts)
    record = record_facts(short, facts_view(bridge, parts), reader, elements, classes)
    if 'client' not in parts:
        return shared_doc(short, record, facts, reader, errors)
    if shared is not None:
        record, facts = with_forms(shared['forms'], record, bridge.get('forms', [])), with_content(facts, shared['content'])
    return {'block': f'sgs/{short}', 'format': FORMAT, 'codeHash': rn.hash, 'elements': resting(elements, props),
            'pathClasses': classes, 'pathAttrs': {k: v for k, v in attrs.items() if v}, **({'settingFacts': record} if record else {}),
            **({'paintStates': paint_states} if paint_states else {}), **facts,
            **({'renderErrors': errors} if errors else {}), 'themeLoaded': pages.theme}


# ---------------------------------------------------------------- per-setting facts


BRIDGE = ROUTE / 'tools' / 'site-look-bridge.mjs'
THEME_OVERLAY_JS = REPO / TH.THEME_REL / 'assets' / 'js' / 'sgs-overlay-scroll.js'
LINK_ATTRS = ('href', 'src', 'target', 'action', 'formaction', 'data-href', 'data-url')  # lib/calibrate-content.mjs::LINK_ATTRS


def bridge_plan(block: str, snapshot_file: Path) -> dict:
    """The route's plan of the renders a block's per-setting facts are read from (tools/site-look-bridge.mjs plan)."""
    import subprocess
    p = subprocess.run(['node', str(BRIDGE), 'plan', block, str(snapshot_file)], capture_output=True, text=True, encoding='utf-8', cwd=str(ROUTE))
    if p.returncode:
        raise RuntimeError(f'site-look-bridge plan {block}: {p.stderr[-600:]}')
    out = json.loads(p.stdout)
    if out.get('error'):
        raise RuntimeError(out['error'])
    return out


PAGE_KEEP = 8  # settled pages a Reader keeps built at once (Reader.page)


class Reader:
    """Pages built on demand, settled (footer moved, overlay scroll run) and read. A built page (its parsed HTML and every
    rule it matched) is large and a block can read over a thousand of them (sgs/nav-bar-menu), so only the readings (style,
    content) are kept for good: the PAGE_KEEP most recently used pages stay, and a page let go is dropped from this memo and
    from the Pages' own, then built again if asked for."""

    def __init__(self, pages, results, props):
        self.pages, self.results, self.props = pages, results, props
        self.memo, self.style_memo, self.content_memo = {}, {}, {}
        self.seen = set()  # every class on a page this reader built (shared_doc keeps it for custom_css_reaches)

    def page(self, job: str, held=()):
        key = (job, tuple(held))
        if key in self.memo and not (MUTATE & {'keep-pages', 'lru'}):
            self.memo[key] = self.memo.pop(key)  # most recently used last
        if key not in self.memo:
            pg = self.pages.get(job, held=held)
            settle(pg, self.results[job])
            self.seen.update(c for el in pg.soup.find_all(True) for c in (el.get('class') or []))
            self.memo[key] = pg
            if 'keep-pages' not in MUTATE:
                for k in [k for k, v in self.pages.memo.items() if v is pg]:
                    del self.pages.memo[k]
                while len(self.memo) > PAGE_KEEP:
                    del self.memo[next(iter(self.memo))]
        return self.memo[key]

    def ok(self, job: str) -> bool:
        return bool(self.results.get(job, {}).get('ok'))

    def style(self, job: str, held=()) -> dict:
        """{width: {path: {property: value}}}, as calibration's style reader returned a reading; `held` the states held."""
        key = (job, tuple(held))
        if key not in self.style_memo:
            els = {}
            read_page(self.page(job, held), els, self.props, False)
            self.style_memo[key] = transpose(els)
        return self.style_memo[key]

    def content(self, job: str, needles: tuple) -> dict:
        """{width: {path: {shown, t?, a?}}}, as lib/calibrate-content.mjs::readContentInPage returned a reading."""
        key = (job, needles)
        if key not in self.content_memo:
            self.content_memo[key] = read_content(self.page(job), needles)
        return self.content_memo[key]


def transpose(els: dict) -> dict:
    out = {str(w): {} for w in WIDTHS}
    for path, byw in els.items():
        for w, vals in byw.items():
            out[w][path] = vals
    return out


def resting(els: dict, props: dict) -> dict:
    """lib/calibrate.mjs::defaultPaint: the default paint keeps no inherited property (an inherited value the element
    paints itself is kept as `_own:<property>`)."""
    drop = set(props['own'])
    return {p: {w: {k: v for k, v in vals.items() if k not in drop} for w, vals in byw.items()} for p, byw in els.items()}


def state_paint(els: dict, props) -> dict:
    """The route's former statePaint: a paint state drawn with attributes it needs only to render keeps only the
    properties its `props` names."""
    if not isinstance(props, list):
        return els
    return {p: {w: {k: v for k, v in vals.items() if k in props} for w, vals in byw.items()} for p, byw in els.items()}


def read_content(page, needles: tuple) -> dict:
    """{width: {path: {shown, t?, a?}}}: lib/calibrate-content.mjs::readContentInPage offline. `shown`: the element has a
    box (no display:none on it or an ancestor, not display:contents) and is not visibility:hidden; `t`: the needles its
    text holds; `a`: per link attribute (LINK_ATTRS), the needles it holds."""
    lower = [n.lower() for n in needles]

    def found(value):
        if value is None:
            return []
        hay = (' '.join(value) if isinstance(value, list) else str(value)).lower()
        return [n for n, low in zip(needles, lower) if low in hay]
    els = {}

    def collect_c(top, prefix):
        for el in [top, *top.find_all(True)]:
            p = element_path(el, top)
            key = (f'{prefix} > {p}' if p else prefix) if prefix else p
            if key not in els and el.name not in ('style', 'script', 'template'):
                els[key] = el
    root = page.root
    if root is not None:
        collect_c(root, '')
        for n, t in enumerate(controlled(page, root), 1):
            collect_c(t, '@controls' if n == 1 else f'@controls:{n}')
    out = {}
    for w in WIDTHS:
        row = {}
        for key, el in els.items():
            comp = page.computed(el, None, w)
            entry = {'shown': not comp.get('_nobox') and comp.get('display') != 'contents' and comp.get('visibility') != 'hidden'}
            t = found(el.get_text())
            if t:
                entry['t'] = t
            a = {name: hit for name in LINK_ATTRS if (hit := found(el.get(name)))}
            if a:
                entry['a'] = a
            row[key] = entry
        out[str(w)] = row
    return out


def controlled(page, root) -> list:
    """The panels the block opens (aria-controls) that sit outside its root, in order."""
    ids = []
    for e in [root, *root.find_all(attrs={'aria-controls': True})]:
        ids += [i for i in (e.get('aria-controls') or '').split() if i and i not in ids]
    return [t for i in ids if (t := page.soup.find(id=i)) is not None and not _inside(t, root)]


def _same_val(a, b) -> bool:
    return re.sub(r'\s+', '', str(a)) == re.sub(r'\s+', '', str(b))


def _depth(p: str) -> int:
    return 0 if p == '' else len(p.split(' > '))


def discover_effects(def_reads: dict, mark_reads: dict) -> dict:
    """lib/calibrate.mjs::discoverEffects: per property, the shallowest elements whose value the value changes and the
    value there at each width (width and gaps are left out: they follow content)."""
    found = {}
    for w in (str(x) for x in WIDTHS):
        d = def_reads.get(w) or {}
        for p, styles in (mark_reads.get(w) or {}).items():
            for prop, v in styles.items():
                if prop in ('width', 'gap', 'row-gap', 'column-gap') or _same_val(v, (d.get(p) or {}).get(prop)):
                    continue
                f = found.setdefault(prop, {'slots': [], 'value': {}, 'depth': float('inf')})
                if 'fold-depth' in MUTATE:
                    f['depth'] = -1  # the deepest element wins instead of the shallowest
                if _depth(p) < f['depth']:
                    f.update(depth=_depth(p), slots=[p], value={})
                if _depth(p) == f['depth']:
                    if p not in f['slots']:
                        f['slots'].append(p)
                    f['value'][w] = v
    return {k: {'slots': v['slots'], 'value': v['value']} for k, v in found.items()}


def presence_from(def_read: dict, mark_read: dict) -> dict:
    """lib/calibrate-content.mjs::presenceFrom."""
    def present(read):
        return {p for w in (str(x) for x in WIDTHS) for p, e in (read.get(w) or {}).items() if e.get('shown')}
    before, after = present(def_read), present(mark_read)
    order = lambda s, other: sorted((p for p in s if p not in other), key=lambda p: (_depth(p), p))  # noqa: E731
    return {'shows': order(after, before), 'hides': order(before, after)}


def text_from(needle: str, mark_read: dict):
    """lib/calibrate-content.mjs::textFrom: the deepest element carrying the marker text, and the widths it was found at."""
    per = []
    for w in WIDTHS:
        hits = [p for p, e in (mark_read.get(str(w)) or {}).items() if needle in (e.get('t') or [])]
        if hits:
            per.append((w, max(hits, key=_depth)))
    if not per:
        return None
    path = per[0][1]
    for _, p in per[1:]:
        if _depth(p) > _depth(path):
            path = p
    return {'path': path, 'reachedAt': sorted(w for w, _ in per)}


def link_from(needle: str, mark_read: dict):
    """lib/calibrate-content.mjs::linkFrom: the shallowest element carrying the marker in the most preferred attribute."""
    hits = [{'path': p, 'attr': a} for w in WIDTHS for p, e in (mark_read.get(str(w)) or {}).items()
            for a in LINK_ATTRS if needle in ((e.get('a') or {}).get(a) or [])]
    if not hits:
        return None
    best = hits[0]
    for h in hits[1:]:
        ra, da = LINK_ATTRS.index(best['attr']), _depth(best['path'])
        rh, dh = LINK_ATTRS.index(h['attr']), _depth(h['path'])
        if rh < ra or (rh == ra and dh < da):
            best = h
    return {'path': best['path'], 'attr': best['attr']}


def fold(discover: list, content: list) -> dict:
    """The route's former `discovered` fold and lib/calibrate-content.mjs::collectContent, from readings
    in calibration's shape (tests/test_site_look.py holds this fold equal to the route's own, tools/site-look-bridge.mjs fold)."""
    discovered = {}
    for inst in discover:
        fx = discover_effects(inst.get('def') or {}, inst.get('read') or {})
        d = discovered.setdefault(inst['discover']['attr'], {})
        for prop, e in fx.items():
            tier = inst['discover'].get('tier')
            slot = d.setdefault(prop, {'slots': [], 'values': {}, **({'tier': tier} if tier else {})})
            slot['slots'] = list(dict.fromkeys(slot['slots'] + e['slots']))
            slot['values'][str(inst['discover']['value'])] = e['value']
    text, presence, link = {}, {}, {}
    for inst in content:
        c = inst.get('content') or {}
        attr = c.get('attr')
        if not attr:
            continue
        if c.get('kind') == 'presence':
            p = presence_from(inst.get('contentDef') or {}, inst.get('contentRead') or {})
            if p['shows'] or p['hides']:
                presence[attr if c.get('value') is None else f"{attr}={c['value']}"] = p
            continue
        got = (text_from if c.get('kind') == 'text' else link_from)(c.get('needle'), inst.get('contentRead') or {})
        if got:
            (text if c.get('kind') == 'text' else link)[attr] = got
    return {'discovered': discovered, **({'text': text} if text else {}), **({'presence': presence} if presence else {}), **({'link': link} if link else {})}


RECORDS = PLUGIN / 'scripts' / 'data' / 'setting-records'
# A state as the cascade reader holds it (computed.py::Page `held`); a state the reader cannot hold here gets no look.
HELD = {'hover': ('hover',), 'focus': ('focus', 'focus-visible'), 'focus-visible': ('focus-visible', 'focus'),
        'active': ('active',), 'focus-within': ('focus-within',)}


def record_of(short: str):
    f = RECORDS / f'{short}.json'
    return json.loads(f.read_text(encoding='utf-8')) if f.is_file() else None


def part_paths(part: str, elements: dict, classes: dict) -> list:
    """The site look's element paths whose element a record part names: `ROOT` the root, a class every element carrying
    it (all its classes, not only the one its path step shows), `<class> <tag>` a tag inside one, a trailing `::before` or
    `::after` that pseudo-element. Shallowest first."""
    key, _, pe = part.partition('::')
    pseudo = f'::{pe}' if pe else ''
    head, _, tag = key.strip().partition(' ')
    hosts = [p for p in classes if (p == '' if head == 'ROOT' else head in classes[p])]
    # a pseudo-element part is its host's path with the pseudo-element: the setting that draws it switches it on, so the
    # default look need not hold it
    out = []
    for base in elements:
        if '::' in base:
            continue
        if tag:
            el_tag = (elements.get(base) or {}).get('375', {}).get('_tag')
            if el_tag == tag.strip() and any(base != h and (h == '' or base.startswith(h + ' > ')) for h in hosts):
                out.append(base + pseudo)
        elif base in hosts:
            out.append(base + pseudo)
    return sorted(set(out), key=lambda p: (_depth(p), p))


def track_count(value):
    """lib/calibrate.mjs::trackCount, reading a declared template too (the offline reader keeps `repeat(3, 1fr)` where a
    browser reports three px tracks)."""
    v = str(value or '').strip()
    v = re.sub(r'repeat\(\s*(\d+)\s*,\s*([^()]+|[^()]*\([^()]*\)[^()]*)\)', lambda m: ' '.join([m.group(2).strip()] * int(m.group(1))), v)
    v = re.sub(r'\[[^\]]*\]', ' ', v)
    toks = [t for t in re.split(r'\s+(?![^(]*\))', v) if t]
    ok = re.compile(r'^(-?[\d.]+(px|fr|%|em|rem)|minmax\(.*\)|auto|min-content|max-content|fit-content\(.*\))$')
    return len(toks) if toks and all(ok.match(t) for t in toks) else None


def _px(v):
    m = re.fullmatch(r'\s*(-?[\d.]+)px\s*', str(v or ''))
    return float(m.group(1)) if m else None


def hit(prop, value, marker, w) -> bool:
    """lib/calibrate.mjs::hitOf: the reading carries the marker's value at width `w`."""
    if marker.get('tracks'):
        return prop == 'grid-template-columns' and track_count(value) == marker['tracks'].get(str(w))
    if not marker.get('expect'):
        return True
    want = marker['expect'].get(str(w))
    if marker.get('tolerance'):
        a, b = _px(value), _px(want)
        if a is not None and b is not None:
            return abs(a - b) <= marker['tolerance']
    return _same_val(value, want)


def form_accepted(marker, props, paths, def_read, read) -> bool:
    """Whether a value-form marker took on one of the setting's own elements (lib/calibrate.mjs::formAccepted, FORM_ACCEPT):
    clamp, vw and repeat carry the marker's value at all three widths on one element the marker changed; count changes
    an element's track list and every change computes the marker's count; any other form (hex, slug) changes the
    setting's property on one of its elements, holding the marker's value where it names one."""
    form = marker.get('form')
    for p in paths:
        changed = {(str(w), q) for w in WIDTHS for q in props
                   if (v := ((read.get(str(w)) or {}).get(p) or {}).get(q)) is not None
                   and not _same_val(v, ((def_read.get(str(w)) or {}).get(p) or {}).get(q))}
        if not changed:
            continue
        if form in ('clamp', 'vw', 'repeat'):
            if all(any(hit(q, ((read.get(str(w)) or {}).get(p) or {}).get(q), marker, w) for q in props) for w in WIDTHS):
                return True
        elif form == 'count':
            tracked = [(w, q) for w, q in changed if q == 'grid-template-columns']
            if tracked and all(hit(q, read[w][p][q], marker, int(w)) for w, q in tracked):
                return True
        elif form not in ('clamp', 'vw', 'repeat', 'count'):
            return True  # calibration recorded a non-strict form (hex, slug) whenever its marker changed the setting's property
    return False


def state_look(reading: dict, paths: list, props: list, look_props: list) -> dict:
    """lib/calibrate-instances.mjs::stateLook: a state setting's elements in that state, per property and width, the
    setting's own properties left out."""
    out = {}
    for w, els in reading.items():
        for p in paths:
            for q in (x for x in look_props if x not in props):
                v = (els.get(p) or {}).get(q)
                if v not in (None, ''):
                    out.setdefault(p, {}).setdefault(q, {})[w] = v
    return out


def record_paths(record, elements, classes) -> dict:
    """{setting: {state or '': [paths]}} for every placement the route may act on: a proved entry, or an unproved one
    with `accepted` (Bean, 2026-11-22)."""
    out = {}
    for e in (record or {}).get('entries', []):
        if e.get('unproved') and not e.get('accepted'):
            continue
        ps = part_paths(e['part'], elements, classes) if e.get('part') else []
        if ps:
            bucket = out.setdefault(e['setting'], {}).setdefault(e.get('state') or '', [])
            bucket.extend(x for x in ps if x not in bucket)
    return out


def record_facts(short: str, bridge: dict, reader: Reader, elements: dict, classes: dict) -> dict:
    """{setting: {forms, look}}: the facts the setting record does not describe, judged on the record's own elements only.
    forms: the value forms a marker of that form took on (a form is claimed only on this positive evidence: a claimed
    clamp() the block cannot hold would have Fill write a broken value). look: a state setting's look in its state."""
    paths = record_paths(record_of(short), elements, classes)
    plan = bridge.get('discover', []) + bridge.get('forms', []) + bridge.get('states', [])
    out = {}
    for i in bridge.get('forms', []):
        state = i.get('state')
        held = HELD.get(state, ()) if state else ()
        if state and not held:
            continue  # a state the reader cannot hold: no form is claimed without seeing it take
        by_state = paths.get(i['setting'], {})
        ps = by_state.get(state, []) if state else sorted({p for b in by_state.values() for p in b}, key=_depth)
        base, job = _baseline(i, plan), f'b:{i["key"]}'
        if not ps or not base or not (reader.ok(base) and reader.ok(job)):
            continue
        if form_accepted(i['marker'], i['props'], ps, reader.style(base, held), reader.style(job, held)):
            forms = out.setdefault(i['setting'], {}).setdefault('forms', [])
            if i['marker']['form'] not in forms:
                forms.append(i['marker']['form'])
    for i in bridge.get('states', []):
        held = HELD.get(i.get('state'))
        ps = (paths.get(i['setting']) or {}).get(i.get('state'), [])
        job = f'b:{i["key"]}'
        if not held or not ps or not reader.ok(job) or 'look' in out.get(i['setting'], {}):
            continue
        look = state_look(reader.style(job, held), ps, i['props'], bridge.get('stateLookProps') or [])
        if look:
            out.setdefault(i['setting'], {})['look'] = look
    return out


def _baseline(i, plan):
    if i.get('baseKey'):
        b = next((x for x in plan if x.get('isBase') and x.get('baseKey') == i['baseKey']), None)
    else:
        b = next((x for x in plan if x.get('isDefault') and x.get('variant', 0) == i.get('variant', 0)), None)
    return f'b:{b["key"]}' if b else None


def setting_facts(bridge: dict, reader: Reader, parts=None) -> dict:
    """The per-setting facts the route reads beside the setting record: `discovered` (what each value of a setting whose
    values are not CSS keywords paints) and `text`, `link`, `presence` (where a setting's text and link land, and which
    parts a value shows or hides), each read against the instance's own baseline (its base, else its variant's default).
    `parts` (default ALL_PARTS): `discovered` and `noMarker` are read with 'client', the content facts with 'content'."""
    parts = ALL_PARTS if parts is None else parts
    def baseline(i, plan):
        if i.get('baseKey'):
            b = next((x for x in plan if x.get('isBase') and x.get('baseKey') == i['baseKey']), None)
        else:
            b = next((x for x in plan if x.get('isDefault') and x.get('variant', 0) == i.get('variant', 0)), None)
        return f'b:{b["key"]}' if b else None
    style_plan, content_plan = bridge.get('discover', []), bridge.get('content', [])
    discover = []
    for i in style_plan if 'client' in parts else []:
        if not i.get('discover'):
            continue
        base, job = baseline(i, style_plan), f'b:{i["key"]}'
        if base and reader.ok(base) and reader.ok(job):
            discover.append({'discover': i['discover'], 'def': reader.style(base), 'read': reader.style(job)})
    needles = tuple(sorted({i['content']['needle'] for i in content_plan if i.get('content', {}).get('needle')}))
    every = style_plan + content_plan
    content = []
    for i in content_plan if 'content' in parts else []:
        if not i.get('content'):
            continue
        base, job = baseline(i, content_plan) or baseline(i, every), f'b:{i["key"]}'
        if base and reader.ok(base) and reader.ok(job):
            content.append({'content': i['content'], 'contentDef': reader.content(base, needles), 'contentRead': reader.content(job, needles)})
    out = fold(discover, content)
    if bridge.get('noMarker') and 'client' in parts:
        out['noMarker'] = sorted(set(bridge['noMarker']))
    return out


def look_key(short: str, snapshot_file: Path, woocommerce: bool) -> str:
    return _key(short, woocommerce, file_md5(snapshot_file))


def shared_key(short: str, woocommerce: bool) -> str:
    """The key of a block's shared facts (shared_facts): the look's key with the snapshot left out, since they are read
    under the theme's own theme.json, which the key holds among the theme files."""
    return _key(short, woocommerce, 'shared-facts')


def _key(short: str, woocommerce: bool, client: str) -> str:
    fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))
    fixture = (fixtures.get(f'sgs/{short}') or {})
    rn_hash = RN.code_hash(PLUGIN, RN.fixture_files(fixture, FIXTURES_DIR), None)
    theme_files = sorted((REPO / TH.THEME_REL).rglob('*.css')) + [REPO / TH.THEME_REL / 'theme.json', REPO / TH.THEME_REL / 'functions.php']
    h = hashlib.sha256()
    rec = RECORDS / f'{short}.json'
    # the fixture entry as written: a look is drawn from it, so an edit to it alone builds the look again
    entry = '' if 'fixture-key' in MUTATE else hashlib.md5(json.dumps(fixture, sort_keys=True).encode()).hexdigest()
    for part in (builder_hash(), rn_hash, entry, client, str(woocommerce), ','.join(sorted(MUTATE)),
                 file_md5(rec) if rec.is_file() else 'no-record',
                 *(file_md5(f) for f in sheet_inputs(short) + theme_files if f.is_file()),
                 reach_hash()):
        h.update(part.encode())
    return h.hexdigest()[:20]


def sheet_inputs(short: str) -> list:
    """Every stylesheet a block's page can read: the plugin's front-end CSS (the record reader picks the block's own and its
    parents' from these) and the Sass sources a block with no compiled sheet is read from (setting-record/diff.py::compiled_scss)."""
    return (sorted(f for f in (PLUGIN / 'src').rglob('*.css') if 'editor' not in f.name)
            + sorted(f for f in (PLUGIN / 'src').rglob('*.scss') if 'editor' not in f.name)
            + sorted((PLUGIN / 'assets' / 'css').glob('*.css')))


# ---------------------------------------------------------------- everything else a look is built from

SCRIPTS = PLUGIN / 'scripts'
# the folders whose modules the builder reaches by `import` (setting-record puts block-source-scan, behavioural-analyser and
# lib on sys.path); a module of another folder is not reachable
PY_DIRS = tuple(SCRIPTS / d for d in ('site-look', 'setting-record', 'block-source-scan', 'behavioural-analyser', 'lib'))
# data files those modules read beside themselves (fixtures.json is hashed per block, as the block's entry)
PY_DATA = (SETREC / 'included-files.php', SETREC / 'shipped-css.js', SETREC / 'record.schema.json',
           SCRIPTS / 'block-source-scan' / 'reference-faults.json')
# the build rewrites a shipped block stylesheet with these (setting-record/diff.py::shipped_css)
SHIPPED_DIRS = tuple(SCRIPTS / d for d in ('shadow-lift', 'hover-guard', 'shadow-fallback'))
JS_IMPORT = re.compile(r"""(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"](\.[^'"]+)['"]""")
JS_URL = re.compile(r"""new URL\(\s*['"](\.[^'"]+)['"]\s*,\s*import\.meta\.url""")


def py_modules() -> list:
    """Every module of PY_DIRS the builder can run, found as the builder's own `import` statements and the `.py` file names
    it loads by path (block-source-scan/common.py loads extract-signatures.py), transitively, lazy imports included."""
    index = {}
    for d in PY_DIRS:
        for f in d.glob('*.py'):
            index.setdefault(f.stem, []).append(f)
            index.setdefault(f.name, []).append(f)
    seen, stack = set(), [Path(__file__).resolve()]
    while stack:
        f = stack.pop()
        if f in seen or not f.is_file():
            continue
        seen.add(f)
        try:
            tree = ast.parse(f.read_text(encoding='utf-8'))
        except (OSError, SyntaxError, UnicodeDecodeError):
            continue
        for n in ast.walk(tree):
            names = ([a.name.split('.')[0] for a in n.names] if isinstance(n, ast.Import)
                     else [n.module.split('.')[0], *(a.name for a in n.names)] if isinstance(n, ast.ImportFrom) and n.module
                     else [n.value] if isinstance(n, ast.Constant) and isinstance(n.value, str) and n.value.endswith('.py') else [])
            for nm in names:
                stack += index.get(nm, [])
    return sorted(seen)


def js_modules(entry: Path) -> list:
    """The route files the bridge runs: `entry` and every relative `import`, `require` and `new URL(..., import.meta.url)` it
    reaches, transitively (the route's planners and readers, scripts/parity/lib, the data files they read)."""
    seen, stack = set(), [entry.resolve()]
    while stack:
        f = stack.pop()
        if f in seen or not f.is_file():
            continue
        seen.add(f)
        if f.suffix in ('.mjs', '.js', '.cjs'):
            text = f.read_text(encoding='utf-8', errors='replace')
            stack += [(f.parent / m).resolve() for m in [*JS_IMPORT.findall(text), *JS_URL.findall(text)]]
    return sorted(seen)


@functools.lru_cache(maxsize=1)
def reach_files() -> tuple:
    """The files, besides the block's own code, fixture, stylesheets and the snapshot, that a look is built from: the Python
    modules of the builder, the route code and data its bridge runs, the build's stylesheet rewriters, and the overlay script."""
    files = [*py_modules(), *PY_DATA, *js_modules(BRIDGE), THEME_OVERLAY_JS]
    for d in SHIPPED_DIRS:
        files += sorted(f for f in d.glob('*.js') if 'test' not in f.name)
    return tuple(sorted({f.resolve() for f in files}))


def framework_db() -> Path:
    """The database the bridge's plan reads: $SGS_FRAMEWORK_DB, else the shared one (scripts/lib/framework_db.py)."""
    sys.path.insert(0, str(SCRIPTS / 'lib'))
    try:
        from framework_db import framework_db_path
    finally:
        sys.path.remove(str(SCRIPTS / 'lib'))
    return Path(framework_db_path())


def file_md5(f, text: bool = True) -> str:
    """The md5 of a file ('missing' when it cannot be read). A text file is hashed with its line endings as LF, so two
    checkouts that differ only in CRLF or LF (git's autocrlf) share a key; the framework database is read whole, as bytes."""
    try:
        if not text:
            h = hashlib.md5()
            with open(f, 'rb') as fh:
                for chunk in iter(lambda: fh.read(1 << 20), b''):
                    h.update(chunk)
            return h.hexdigest()
        return hashlib.md5(Path(f).read_bytes().replace(bytes((13, 10)), b'\n')).hexdigest()
    except OSError:
        return 'missing'


@functools.lru_cache(maxsize=8)
def db_md5(path: str) -> str:
    return file_md5(path, text=False)


def tool_out(cmd: list) -> str:
    """What a tool prints for its version flag; 'absent' when it is not installed or does not answer."""
    import subprocess
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60)
    except (OSError, subprocess.SubprocessError):
        return 'absent'
    return (r.stdout + r.stderr).strip() if r.returncode == 0 else 'absent'


@functools.lru_cache(maxsize=1)
def tool_versions() -> str:
    """The versions of the tools a build runs (php renders, node reads and rewrites, sass compiles) and the $SGS_SASS in force."""
    import diff as DF
    try:
        sass = [*DF.sass_command(PLUGIN), '--version']
    except RuntimeError:
        sass = None
    return '|'.join([f'php:{tool_out(["php", "-v"])}', f'node:{tool_out(["node", "-v"])}',
                      f'sass:{tool_out(sass) if sass else "absent"}', f'SGS_SASS:{_os.environ.get("SGS_SASS", "")}'])


def framework_db_md5() -> str:
    """The database's content as a reader sees it: the file and, when SQLite's write-ahead log holds a reseed not yet
    checkpointed into it, that log too."""
    db = str(framework_db())
    wal = Path(db + '-wal')
    log = db_md5(str(wal)) if wal.is_file() and wal.stat().st_size > 0 else 'no-wal'
    return db_md5(db) + log


@functools.lru_cache(maxsize=1)
def reach_hash() -> str:
    """The hash of reach_files(), the framework database and the tool versions, worked out once a process."""
    h = hashlib.sha256()
    for f in reach_files():
        h.update(f.name.encode())
        h.update(file_md5(f).encode())
    h.update(framework_db_md5().encode())
    h.update(tool_versions().encode())
    return h.hexdigest()[:16]


# ---------------------------------------------------------------- the shared store

STORE_ENV = 'SGS_LOOK_STORE'
DEFAULT_STORE = 'E:/sgs-tmp/look-store'
STORE_KEEP_DAYS = 14  # a store file no checkout has used for this long is removed when the block's next look is stored


def look_store():
    """The folder every checkout shares, holding `<site>/<block>.<key>.json`: $SGS_LOOK_STORE, else DEFAULT_STORE; an empty
    value turns the store off. A look is content-keyed (look_key), so a file found there is the look this checkout would build."""
    value = _os.environ.get(STORE_ENV)
    value = DEFAULT_STORE if value is None else value.strip()
    return Path(value) if value else None


def store_file(store: Path, site: str, short: str, key: str) -> Path:
    return store / site / f'{short}.{key}.json'


def read_look(f: Path, short: str, key: str):
    """The text of a look file when it parses and is this block's look under `key`; None for a missing, partial or other file."""
    try:
        text = f.read_text(encoding='utf-8')
        doc = json.loads(text)
    except (OSError, ValueError):
        return None
    ok = isinstance(doc, dict) and doc.get('key') == key and doc.get('block') == f'sgs/{short}' and isinstance(doc.get('elements'), dict)
    return text if ok else None


def atomic_write(f: Path, text: str) -> None:
    """Write beside `f` under a name no other process uses, then rename onto `f`: a reader sees the old file or the whole new one."""
    f.parent.mkdir(parents=True, exist_ok=True)
    tmp = f.with_name(f'{f.name}.{_os.getpid()}.{uuid.uuid4().hex[:8]}.tmp')
    try:
        tmp.write_text(text, encoding='utf-8')
        for attempt in range(5):  # Windows refuses a rename onto a file another process has open for a moment
            try:
                _os.replace(tmp, f)
                return
            except PermissionError:
                if attempt == 4:
                    raise
                time.sleep(0.1 * (attempt + 1))
    finally:
        tmp.unlink(missing_ok=True)


def shareable(text: str) -> bool:
    """False for a look that names this checkout's folder (a PHP error message can): it belongs to this checkout alone."""
    root = str(REPO)
    forms = {root.lower(), root.replace('\\', '/').lower(), root.replace('\\', '\\\\').lower()}
    low = text.lower()
    return not any(x in low for x in forms)


def store_look(store: Path, site: str, short: str, key: str, text: str, check=None) -> None:
    """Keep a built look for every checkout, and drop this block's files no checkout has used for STORE_KEEP_DAYS. `check`
    (default read_look) tells a whole stored file from a partial one."""
    if not shareable(text):
        return
    f = store_file(store, site, short, key)
    if (check or read_look)(f, short, key) is None:
        atomic_write(f, text)
    for other in f.parent.glob(f'{short}.*.json'):
        if other != f and time.time() - other.stat().st_mtime > STORE_KEEP_DAYS * 86400:
            other.unlink(missing_ok=True)


# ---------------------------------------------------------------- the facts every client shares

# What build_block reads: 'client' the default paint, paint states, discovered values and state looks (the client's
# snapshot changes them); 'forms' the value forms a setting takes; 'content' where a text or link setting lands and what a
# value shows or hides. The forms and content facts come out the same for every client (measured 2026-11-26 on three
# clients: 100% of entries), so they are read once a code version under the theme's own theme.json (shared_facts) and
# each client's look is assembled from them (with_forms, with_content).
ALL_PARTS = frozenset({'client', 'forms', 'content'})
CLIENT_PARTS = frozenset({'client'})
SHARED_PARTS = frozenset({'forms', 'content'})
SHARED_SITE = '_shared'  # the folder the shared facts are kept in, beside the clients' (a client folder never starts with _)
SHARED_FORMAT = 1
CONTENT_KEYS = ('text', 'presence', 'link')
# The value forms whose marker the client's snapshot picks (lib/calibrate-markers.mjs::plainMarkers: the slug marker is the
# client's own palette colour furthest from black and white), so whether it takes depends on that client's palette and
# defaults: these are read with the client's own reading, never shared. Under the theme's palette the slug marker's colour
# equals some blocks' default colour and the form reads as not taken (Indus, 11 blocks, 2026-11-26).
CLIENT_FORMS = frozenset({'slug'})


def neutral_snapshot() -> Path:
    """The snapshot the shared facts are read under: the theme's own theme.json, which merges over itself unchanged, has
    no custom CSS, and gives the value-form plan a palette for its slug marker."""
    return REPO / TH.THEME_REL / 'theme.json'


def facts_view(bridge: dict, parts) -> dict:
    """The bridge plan as record_facts reads it for `parts`: the value-form instances with 'forms', except those of a
    CLIENT_FORMS form, which go with 'client'; the state (and any other per-client) instances only with 'client'. A
    baseline is never one of these instances (the plan keeps every baseline in `discover`), so leaving them out changes
    no other reading."""
    view = dict(bridge)
    own = lambda i: (i.get('marker') or {}).get('form') in CLIENT_FORMS  # noqa: E731
    view['forms'] = [i for i in bridge.get('forms', []) if ('client' in parts if own(i) else 'forms' in parts)]
    if 'client' not in parts:
        view.update({k: [] for k, v in bridge.items() if isinstance(v, list) and k not in ('discover', 'content', 'forms', 'noMarker', 'stateLookProps')})
    return view


def shared_doc(short: str, record: dict, facts: dict, reader, errors: dict) -> dict:
    """The facts every client shares, as shared_facts keeps them: `forms` {setting: [form]} in the order record_facts found
    them, `content` the text, presence and link facts, and `classes` every class on a page they were read from."""
    return {'block': f'sgs/{short}', 'format': SHARED_FORMAT,
            'forms': {k: v['forms'] for k, v in record.items() if v.get('forms')},
            'content': {k: facts[k] for k in CONTENT_KEYS if k in facts},
            'classes': sorted(reader.seen), **({'renderErrors': errors} if errors else {})}


def with_forms(forms: dict, record: dict, plan: list) -> dict:
    """settingFacts as one build gives it: the shared forms and the client's own (CLIENT_FORMS, in `record`) merged in the
    order the client's plan of value-form instances (`plan`, the bridge's `forms`) finds them, so every setting with a form
    comes first, each `forms` before what the client's own reading adds (a state look)."""
    own = {k: v['forms'] for k, v in record.items() if v.get('forms')}
    out = {}
    for i in plan:
        name, form = i.get('setting'), (i.get('marker') or {}).get('form')
        if form in forms.get(name, ()) or form in own.get(name, ()):
            got = out.setdefault(name, {}).setdefault('forms', [])
            if form not in got:
                got.append(form)
    for k, v in record.items():
        out.setdefault(k, {}).update({x: y for x, y in v.items() if x != 'forms'})
    return out


def with_content(facts: dict, content: dict) -> dict:
    """The per-setting facts as one build gives them: `discovered`, then text, presence and link, then `noMarker`."""
    return {'discovered': facts.get('discovered', {}), **{k: content[k] for k in CONTENT_KEYS if k in content},
            **({'noMarker': facts['noMarker']} if 'noMarker' in facts else {})}


def custom_css_reaches(snapshot: dict, classes) -> bool:
    """Whether a rule of the snapshot's own CSS (`styles.css`) could match an element of a page the shared facts were read
    from, so that client's facts are read under its own CSS instead: a rule matches only an element (or ancestors) carrying
    every class it requires (cascade.py::required_classes, the pre-filter the cascade itself applies). A rule that requires
    no class, a palette class (`has-…`, named by the client's own slugs), or CSS that does not parse counts as reaching."""
    import cascade as C
    css = (snapshot.get('styles') or {}).get('css')
    if not css or MUTATE & {'custom-css', 'shared-guard'}:
        return False
    try:
        rules = C.flatten(css, 1, 0)
    except Exception:  # noqa: BLE001 - CSS the reader cannot parse could match anything
        return True
    seen = set(classes)
    return any({c for c in C.required_classes(r.selector) if not c.startswith('has-')} <= seen for r in rules)


def read_shared(f: Path, short: str, key: str):
    """The text of a shared-facts file when it parses and holds this block's facts under `key`; None otherwise."""
    try:
        text = f.read_text(encoding='utf-8')
        doc = json.loads(text)
    except (OSError, ValueError):
        return None
    ok = (isinstance(doc, dict) and doc.get('key') == key and doc.get('block') == f'sgs/{short}' and doc.get('format') == SHARED_FORMAT
          and isinstance(doc.get('forms'), dict) and isinstance(doc.get('content'), dict) and isinstance(doc.get('classes'), list))
    return text if ok else None


def shared_facts(short: str, woocommerce: bool, out_root: Path) -> dict:
    """The block's shared facts: from `<out_root>/_shared/` when current, else from the shared store (copied there), else
    read under neutral_snapshot() and kept in both. Keyed by shared_key, so every client and checkout at the same code
    takes the same file."""
    key = shared_key(short, woocommerce)
    local = out_root / SHARED_SITE / f'{short}{".woocommerce" if woocommerce else ""}.json'
    text = read_shared(local, short, key)
    store = look_store()
    if text is None and store is not None and 'store' not in MUTATE:
        text = read_shared(store_file(store, SHARED_SITE, short, key), short, key)
        if text is not None:
            atomic_write(local, text)
    if text is not None:
        return json.loads(text)
    doc = build_block(short, neutral_snapshot(), woocommerce, parts=SHARED_PARTS)
    doc['key'] = key
    text = json.dumps(doc, indent=1)
    atomic_write(local, text)
    if store is not None:
        try:
            store_look(store, SHARED_SITE, short, key, text, check=read_shared)
        except OSError:
            pass  # the store is a convenience: a full or unwritable folder never fails a build
    return doc


def build_look(short: str, snapshot_file: Path, woocommerce: bool, out_root: Path, per_client: bool = False) -> dict:
    """The block's look for one client: its own reading plus the shared facts. Read whole for the client (build_block
    alone) with `per_client`, when a render behind the shared facts failed (a fact it would have given is missing there), or
    when the client's custom CSS could reach a page the shared facts were read from."""
    if per_client or 'shared-facts' in MUTATE:
        return build_block(short, snapshot_file, woocommerce)
    shared = shared_facts(short, woocommerce, out_root)
    if shared.get('renderErrors') and 'shared-errors' not in MUTATE:
        return build_block(short, snapshot_file, woocommerce)
    if custom_css_reaches(json.loads(snapshot_file.read_text(encoding='utf-8')), shared['classes']):
        return build_block(short, snapshot_file, woocommerce)
    return build_block(short, snapshot_file, woocommerce, parts=CLIENT_PARTS, shared=shared)


def write_block(args_tuple) -> tuple:
    short, snapshot_file, woocommerce, out_dir, site, *rest = args_tuple
    per_client = bool(rest and rest[0])
    out = Path(out_dir) / f'{short}.json'
    key = look_key(short, snapshot_file, woocommerce)
    if out.is_file():
        try:
            if json.loads(out.read_text(encoding='utf-8')).get('key') == key:
                return short, 'current'
        except (OSError, ValueError):
            pass
    store = look_store()
    if store is not None and 'store' not in MUTATE:
        kept = store_file(store, site, short, key)
        text = read_look(kept, short, key)
        if text is not None:
            try:
                _os.utime(kept)
            except OSError:
                pass
            atomic_write(out, text)
            return short, 'current (store)'
    doc = build_look(short, snapshot_file, woocommerce, Path(out_dir).parent, per_client)
    doc.update(site=site, key=key, snapshot=hashlib.md5(snapshot_file.read_bytes()).hexdigest())
    text = json.dumps(doc, indent=1)
    atomic_write(out, text)
    if store is not None:
        try:
            store_look(store, site, short, key, text)
        except OSError:
            pass  # the store is a convenience: a full or unwritable folder never fails a build
    return short, 'built'


def all_blocks() -> list:
    return sorted(json.loads(f.read_text(encoding='utf-8'))['name'].split('/', 1)[1]
                  for f in (PLUGIN / 'src' / 'blocks').glob('*/block.json')
                  if json.loads(f.read_text(encoding='utf-8')).get('name', '').startswith('sgs/') and (f.parent / 'render.php').is_file())


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--snapshot', required=True, type=Path)
    ap.add_argument('--site', required=True)
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--blocks')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--woocommerce', action='store_true')
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--per-client-facts', action='store_true',
                    help="read the value forms and content facts under this client's CSS instead of taking the shared ones")
    a = ap.parse_args(argv)
    blocks = all_blocks() if a.all else [b.split('/', 1)[-1] for b in (a.blocks or '').split(',') if b]
    if not blocks:
        ap.error('name --blocks or --all')
    snap = a.snapshot.resolve()
    jobs = [(b, snap, a.woocommerce, str(a.out / a.site), a.site, a.per_client_facts) for b in blocks]
    failed = 0
    if a.jobs > 1 and len(jobs) > 1:
        # one block's failure is reported and the rest still build, as in the one-at-a-time path below
        with ProcessPoolExecutor(a.jobs) as ex:
            futures = [(j, ex.submit(write_block, j)) for j in jobs]
            for j, fut in futures:
                try:
                    b, how = fut.result()
                    print(f'{b}: {how}', flush=True)
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    print(f'{j[0]}: FAILED {type(exc).__name__}: {exc}', flush=True)
    else:
        for j in jobs:
            try:
                b, how = write_block(j)
                print(f'{b}: {how}', flush=True)
            except Exception as exc:  # noqa: BLE001 - one block's failure is reported, the rest still build
                failed += 1
                print(f'{j[0]}: FAILED {type(exc).__name__}: {exc}', flush=True)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
