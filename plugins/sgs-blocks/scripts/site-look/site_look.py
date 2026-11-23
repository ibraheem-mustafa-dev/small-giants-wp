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
import copy
import hashlib
import json
import re
import sys
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


def builder_hash() -> str:
    """The hash of this builder and the record modules it reads, so a change to either rebuilds every site look."""
    h = hashlib.sha256()
    for f in sorted([Path(__file__), PROPS_FILE, *SETREC.glob('*.py')]):
        h.update(f.name.encode())
        h.update(f.read_bytes())
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


def _value(page, el, pseudo, prop, width, parent_vals):
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
    wrapper = page.soup.select_one(f'.wp-block-sgs-{page.short}')
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


def build_block(short: str, snapshot_file: Path, woocommerce: bool) -> dict:
    snapshot = json.loads(snapshot_file.read_text(encoding='utf-8'))
    props = load_props()
    fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))
    pl = CK.load_plan(short, PLUGIN, fixtures, None)
    fixture = pl['fixture'] or {}
    rn = RN.Renderer(PLUGIN, fixture, FIXTURES_DIR, short)
    content, inner = rn.render_inner(fixture.get('inner'))
    if not fixture.get('inner') and fixture.get('content'):
        content = fixture['content']
    children = sorted(set(re.findall(r'"name": "sgs/([a-z0-9-]+)"', json.dumps(fixture.get('inner') or []))))
    insts = [i for i in pl['instances'] if i['isDefault'] or i.get('paintState')]
    bridge = bridge_plan(f'sgs/{short}', snapshot_file)
    marked = [i for i in bridge.get('discover', []) + bridge.get('content', [])]
    jobs = {i['key']: RN.with_defaults(PLUGIN, short, RN.fill(i['attrs'])) for i in insts}
    jobs.update({f'b:{i["key"]}': RN.with_defaults(PLUGIN, short, RN.fill(i['attrs'])) for i in marked})
    results = rn.render_many(f'sgs/{short}', jobs, content, inner)
    section = None if fixture.get('parents') or short == 'container' or 'section' in MUTATE else section_shell(rn, short)
    shown = {k: framed(r, section) for k, r in results.items()}
    run = {'plugin': PLUGIN, 'children': children + (['container'] if section else []), 'results': shown, 'jobs': dict(jobs),
           'plan': pl, 'renderer': rn, 'theme_css': site_css(snapshot, woocommerce), 'layout': site_layout(snapshot)}
    pages = PF.Pages(short, run)
    errors = {k: (r.get('error') or '')[:300] for k, r in results.items() if not r.get('ok')}
    reader = Reader(pages, results, props)
    elements = {}
    for i in sorted((i for i in insts if i['isDefault']), key=lambda i: i['variant']):
        if results[i['key']].get('ok'):
            read_page(reader.page(i['key']), elements, props, True)
    paint_states = {}
    for st in fixture.get('paintStates') or []:
        i = next((x for x in insts if x.get('paintState') == st['name']), None)
        if i is None or not results[i['key']].get('ok'):
            continue
        els = {}
        read_page(reader.page(i['key']), els, props, True)
        paint_states[st['name']] = {'when': st.get('when') or {}, 'elements': state_paint(resting(els, props), st.get('props'))}
    facts = setting_facts(bridge, reader)
    return {'block': f'sgs/{short}', 'format': FORMAT, 'codeHash': rn.hash, 'elements': resting(elements, props),
            **({'paintStates': paint_states} if paint_states else {}), **facts,
            **({'renderErrors': errors} if errors else {}), 'themeLoaded': pages.theme}


# ---------------------------------------------------------------- per-setting facts


BRIDGE = ROUTE / 'tools' / 'site-look-bridge.mjs'
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


class Reader:
    """Pages built once each, settled (footer moved, overlay scroll run) and read on demand."""

    def __init__(self, pages, results, props):
        self.pages, self.results, self.props = pages, results, props
        self.memo, self.style_memo, self.content_memo = {}, {}, {}

    def page(self, job: str):
        if job not in self.memo:
            pg = self.pages.get(job)
            settle(pg, self.results[job])
            self.memo[job] = pg
        return self.memo[job]

    def ok(self, job: str) -> bool:
        return bool(self.results.get(job, {}).get('ok'))

    def style(self, job: str) -> dict:
        """{width: {path: {property: value}}}, as calibration's style reader returned a reading."""
        if job not in self.style_memo:
            els = {}
            read_page(self.page(job), els, self.props, False)
            self.style_memo[job] = transpose(els)
        return self.style_memo[job]

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
    """lib/calibrate-block.mjs::statePaint: a paint state drawn with attributes it needs only to render keeps only the
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
    """lib/calibrate-block.mjs::foldMeasured's `discovered` and lib/calibrate-content.mjs::collectContent, from readings
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


def setting_facts(bridge: dict, reader: Reader) -> dict:
    """The per-setting facts the route reads beside the setting record: `discovered` (what each value of a setting whose
    values are not CSS keywords paints) and `text`, `link`, `presence` (where a setting's text and link land, and which
    parts a value shows or hides), each read against the instance's own baseline (its base, else its variant's default)."""
    def baseline(i, plan):
        if i.get('baseKey'):
            b = next((x for x in plan if x.get('isBase') and x.get('baseKey') == i['baseKey']), None)
        else:
            b = next((x for x in plan if x.get('isDefault') and x.get('variant', 0) == i.get('variant', 0)), None)
        return f'b:{b["key"]}' if b else None
    style_plan, content_plan = bridge.get('discover', []), bridge.get('content', [])
    discover = []
    for i in style_plan:
        if not i.get('discover'):
            continue
        base, job = baseline(i, style_plan), f'b:{i["key"]}'
        if base and reader.ok(base) and reader.ok(job):
            discover.append({'discover': i['discover'], 'def': reader.style(base), 'read': reader.style(job)})
    needles = tuple(sorted({i['content']['needle'] for i in content_plan if i.get('content', {}).get('needle')}))
    every = style_plan + content_plan
    content = []
    for i in content_plan:
        if not i.get('content'):
            continue
        base, job = baseline(i, content_plan) or baseline(i, every), f'b:{i["key"]}'
        if base and reader.ok(base) and reader.ok(job):
            content.append({'content': i['content'], 'contentDef': reader.content(base, needles), 'contentRead': reader.content(job, needles)})
    out = fold(discover, content)
    if bridge.get('noMarker'):
        out['noMarker'] = sorted(set(bridge['noMarker']))
    return out


def look_key(short: str, snapshot_file: Path, woocommerce: bool) -> str:
    fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))
    fixture = (fixtures.get(f'sgs/{short}') or {})
    rn_hash = RN.code_hash(PLUGIN, RN.fixture_files(fixture, FIXTURES_DIR), None)
    theme_files = sorted((REPO / TH.THEME_REL).rglob('*.css')) + [REPO / TH.THEME_REL / 'theme.json', REPO / TH.THEME_REL / 'functions.php']
    h = hashlib.sha256()
    for part in (builder_hash(), rn_hash, hashlib.md5(snapshot_file.read_bytes()).hexdigest(), str(woocommerce), ','.join(sorted(MUTATE)),
                 *(hashlib.md5(f.read_bytes()).hexdigest() for f in sheet_inputs(short) + theme_files if f.is_file())):
        h.update(part.encode())
    return h.hexdigest()[:20]


def sheet_inputs(short: str) -> list:
    """Every stylesheet a block's page can read: the plugin's front-end CSS (the record reader picks the block's own and its
    parents' from these)."""
    return sorted(f for f in (PLUGIN / 'src').rglob('*.css') if 'editor' not in f.name) + sorted((PLUGIN / 'assets' / 'css').glob('*.css'))


def write_block(args_tuple) -> tuple:
    short, snapshot_file, woocommerce, out_dir, site = args_tuple
    out = Path(out_dir) / f'{short}.json'
    key = look_key(short, snapshot_file, woocommerce)
    if out.is_file():
        try:
            if json.loads(out.read_text(encoding='utf-8')).get('key') == key:
                return short, 'current'
        except (OSError, ValueError):
            pass
    doc = build_block(short, snapshot_file, woocommerce)
    doc.update(site=site, key=key, snapshot=hashlib.md5(snapshot_file.read_bytes()).hexdigest())
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=1), encoding='utf-8')
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
    a = ap.parse_args(argv)
    blocks = all_blocks() if a.all else [b.split('/', 1)[-1] for b in (a.blocks or '').split(',') if b]
    if not blocks:
        ap.error('name --blocks or --all')
    snap = a.snapshot.resolve()
    jobs = [(b, snap, a.woocommerce, str(a.out / a.site), a.site) for b in blocks]
    failed = 0
    if a.jobs > 1 and len(jobs) > 1:
        with ProcessPoolExecutor(a.jobs) as ex:
            for b, how in ex.map(write_block, jobs):
                print(f'{b}: {how}')
    else:
        for j in jobs:
            try:
                b, how = write_block(j)
                print(f'{b}: {how}')
            except Exception as exc:  # noqa: BLE001 - one block's failure is reported, the rest still build
                failed += 1
                print(f'{j[0]}: FAILED {type(exc).__name__}: {exc}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
