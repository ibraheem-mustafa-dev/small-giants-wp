"""The site look's mechanisms, each with a test that fails when the mechanism is switched off (SITE_LOOK_MUTATE=<name>,
site_look.py::MUTATE). Builds run through the setting record's cached renders, so a warm run takes about a minute.

    python -m pytest plugins/sgs-blocks/scripts/site-look/tests
    SITE_LOOK_MUTATE=section python -m pytest plugins/sgs-blocks/scripts/site-look/tests -k section   (must fail)
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
LOOK = HERE.parent
sys.path.insert(0, str(LOOK))
import site_look as SL  # noqa: E402

SNAPSHOT = SL.REPO / 'sites' / 'mamas-munches-redesign' / 'theme-snapshot.json'


def build(tmp: Path, short: str, snapshot: dict | None = None, woocommerce: bool = True) -> dict:
    """One block's site look under `snapshot` (Mama's when None), built in a separate process so SITE_LOOK_MUTATE applies."""
    snap = tmp / f'snap-{short}.json'
    snap.write_text(json.dumps(snapshot if snapshot is not None else json.loads(SNAPSHOT.read_text(encoding='utf-8'))), encoding='utf-8')
    cmd = [sys.executable, str(LOOK / 'site_look.py'), '--snapshot', str(snap), '--site', 't', '--out', str(tmp), '--blocks', f'sgs/{short}', '--jobs', '1']
    p = subprocess.run(cmd + (['--woocommerce'] if woocommerce else []), capture_output=True, text=True, env=os.environ.copy())
    assert p.returncode == 0, p.stdout + p.stderr
    return json.loads((tmp / 't' / f'{short}.json').read_text(encoding='utf-8'))


def mamas() -> dict:
    return json.loads(SNAPSHOT.read_text(encoding='utf-8'))


# ---------------------------------------------------------------- the site's CSS


def test_snapshot_token_value_reaches_the_part(tmp_path):
    """MUST FAIL with SITE_LOOK_MUTATE=snapshot: the button's ground is the site's mm-yellow, so changing that palette
    entry changes the default look."""
    snap = mamas()
    for c in snap['settings']['color']['palette']:
        if c['slug'] == 'mm-yellow':
            c['color'] = '#112233'
    look = build(tmp_path, 'button', snap)
    assert look['elements']['']['1440']['background-color'] == 'rgb(17, 34, 51)'


def test_snapshot_custom_css_reaches_the_part(tmp_path):
    """MUST FAIL with SITE_LOOK_MUTATE=custom-css: a snapshot's own CSS (styles.css) is part of the site's look."""
    snap = mamas()
    snap.setdefault('styles', {})['css'] = '.sgs-button__label{padding-top:7px}'
    look = build(tmp_path, 'button', snap)
    assert look['elements']['.sgs-button__label']['375']['padding-top'] == '7px'


# ---------------------------------------------------------------- the page around the block


def test_block_sits_in_a_section_not_straight_in_the_post(tmp_path):
    """MUST FAIL with SITE_LOOK_MUTATE=section: straight inside the post content the theme's constrained layout caps a
    block at the content width; inside a section (as on a page, and as calibration drew it) it does not."""
    look = build(tmp_path, 'button')
    assert look['elements']['']['1440']['max-width'] == 'none'


def test_footer_output_leaves_the_post_content(tmp_path):
    """MUST FAIL with SITE_LOOK_MUTATE=footer-move: the cart's scrim is printed at wp_footer, at the end of <body>, so a
    rule aimed at what sits inside a section never reaches it (the runner appends the footer to the block's markup)."""
    snap = mamas()
    snap.setdefault('styles', {})['css'] = '.sgs-container__inner > .sgs-scrim{outline-style:dotted}'
    look = build(tmp_path, 'cart', snap)
    assert look['elements']['@scrim']['1440']['outline-style'] == 'none'


def test_root_is_the_wrapper_element(tmp_path):
    """MUST FAIL with SITE_LOOK_MUTATE=wrapper-root: sgs/icon-list prints its own class on the inner list, not on the
    element its wrapper attributes print on; the root is the wrapper, so the heading beside the list is one of its parts."""
    look = build(tmp_path, 'icon-list', woocommerce=False)
    assert '.sgs-icon-list__heading' in look['elements']
    assert '.sgs-icon-list' in look['elements']


# ---------------------------------------------------------------- the per-setting facts


def test_button_text_link_and_presence(tmp_path):
    """Where the button's text and link settings land and what showing only the icon hides, read from its renders."""
    look = build(tmp_path, 'button')
    assert look['text']['label']['path'] == '.sgs-button__label'
    assert look['link']['url'] == {'path': '', 'attr': 'href'}
    assert look['link']['linkTarget'] == {'path': '', 'attr': 'target'}
    assert look['presence']['iconPosition=only']['hides'] == ['.sgs-button__label']


def test_reader_holds_a_few_pages_not_every_page_it_read(monkeypatch):
    """MUST FAIL with SITE_LOOK_MUTATE=keep-pages: the Reader keeps the SL.PAGE_KEEP most recently used pages and drops the
    rest from its own memo and from the Pages' memo (a page it dropped is built again if asked for), so a block that reads
    over a thousand pages holds a few."""
    class Pages:
        def __init__(self):
            self.memo, self.built = {}, 0

        def get(self, job, held=()):
            self.built += 1
            self.memo[(job, frozenset(held), frozenset(), None, ())] = page = object()
            return page

    monkeypatch.setattr(SL, 'settle', lambda page, res: None)
    pages = Pages()
    reader = SL.Reader(pages, {f'j{i}': {} for i in range(200)}, {})
    for i in range(200):
        reader.page(f'j{i}')
    assert len(reader.memo) <= SL.PAGE_KEEP
    assert len(pages.memo) == 0, 'the Pages kept no page the Reader let go'
    assert reader.page('j199') is reader.page('j199') and pages.built == 200, 'a page still held is not built again'
    reader.page('j0')
    assert pages.built == 201, 'a dropped page is built again when asked for'


def test_reader_drops_the_least_recently_used_page(monkeypatch):
    """MUST FAIL with SITE_LOOK_MUTATE=lru (and keep-pages): a page read again stays; the page unused longest goes (LRU, not first in)."""
    class Pages:
        def __init__(self):
            self.memo, self.built = {}, 0

        def get(self, job, held=()):
            self.built += 1
            self.memo[(job,)] = page = object()
            return page

    monkeypatch.setattr(SL, 'settle', lambda page, res: None)
    pages = Pages()
    n = SL.PAGE_KEEP
    reader = SL.Reader(pages, {f'j{i}': {} for i in range(n + 1)}, {})
    for i in range(n):
        reader.page(f'j{i}')
    reader.page('j0')                 # j0 is now the most recently used; j1 the least
    reader.page(f'j{n}')              # one over the limit
    built = pages.built
    reader.page('j0')
    assert pages.built == built, 'the page read again was kept'
    reader.page('j1')
    assert pages.built == built + 1, 'the page unused longest was dropped'


def test_fold_matches_the_route(tmp_path):
    """MUST FAIL with SITE_LOOK_MUTATE=fold-depth: the Python fold gives what the route's own fold
    (tools/site-look-bridge.mjs fold, calibration's functions) gives on the same readings."""
    readings = {
        'discover': [{'discover': {'attr': 'mode', 'value': 'dark', 'tier': None},
                      'def': {'375': {'': {'color': 'rgb(0, 0, 0)'}, '.a': {'color': 'rgb(0, 0, 0)', 'width': '1px'}}},
                      'read': {'375': {'': {'color': 'rgb(1, 1, 1)'}, '.a': {'color': 'rgb(1, 1, 1)', 'width': '9px'}}}}],
        'content': [{'content': {'attr': 'show', 'kind': 'presence'},
                     'contentDef': {'375': {'': {'shown': True}, '.b': {'shown': False}}},
                     'contentRead': {'375': {'': {'shown': True}, '.b': {'shown': True}}}},
                    {'content': {'attr': 'title', 'kind': 'text', 'needle': 'zz'},
                     'contentDef': {}, 'contentRead': {'375': {'': {'shown': True, 't': ['zz']}, '.t': {'shown': True, 't': ['zz']}}}}],
    }
    p = subprocess.run(['node', str(SL.BRIDGE), 'fold'], input=json.dumps(readings), capture_output=True, text=True, cwd=str(SL.ROUTE))
    assert p.returncode == 0, p.stderr
    route = json.loads(p.stdout)
    ours = SL.fold(readings['discover'], readings['content'])
    assert ours == route
    assert ours['discovered']['mode']['color']['slots'] == ['']


# ---------------------------------------------------------------- the route's element names


def test_element_path_names_as_the_route_does():
    """scripts/parity/lib/ref-trace.mjs::elementPath: an sgs- class (not a modifier or an instance id) else the tag, and
    :nth-of-type only when siblings share the step."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup('<div class="r"><span class="sgs-x__a sgs-x__a--on">1</span><span class="sgs-x__a">2</span>'
                         '<i class="sgs-x-1a2b3c4d"></i><b></b></div>', 'html.parser')
    root = soup.div
    a1, a2, i, b = [c for c in root.children]
    assert SL.element_path(a1, root) == '.sgs-x__a:nth-of-type(1)'
    assert SL.element_path(a2, root) == '.sgs-x__a:nth-of-type(2)'
    assert SL.element_path(i, root) == 'i'
    assert SL.element_path(b, root) == 'b'


def test_container_is_a_nested_section(tmp_path):
    # SITE_LOOK_MUTATE=section must fail: drawn with no section round it, the container is a top-level section and takes
    # the snapshot's section padding (FR-32-15), which no section of a cloned page shows (each sits in the page's root
    # container), so Fill took the draft's section padding as already held and wrote none.
    look = build(tmp_path, 'container')
    assert {look['elements'][''][w]['padding-top'] for w in ('375', '768', '1440')} == {'0px'}
    assert '' in look['elements'] and not any(p.startswith('.sgs-container__inner > .sgs-container') for p in look['elements'])


def test_open_item_carries_its_attribute(tmp_path):
    # SITE_LOOK_MUTATE=path-attrs must fail: the accordion fixture saves its first item open, and a rule of the site's CSS
    # tests [open], so the look records it on that item only (the route's unit pairing reads which child is open from it).
    look = build(tmp_path, 'accordion')
    attrs = look.get('pathAttrs', {})
    assert attrs.get('.sgs-container:nth-of-type(1)') == {'open': ''}
    assert 'open' not in attrs.get('.sgs-container:nth-of-type(2)', {})
    assert all('class' not in a and 'style' not in a for a in attrs.values())


def test_look_is_the_plain_block(tmp_path):
    # SITE_LOOK_MUTATE=plain-fixture must fail: the record check's fixtures switch on parts to test their settings (the
    # icon's label, the container's background image and SVG layer: setting-record/fixtures.json `checkAttributes`).
    # A look drawn with them holds parts a new node lacks, and Fill's pairing (scripts/computed-route/lib/
    # fill-part-pairing.mjs::rootIsPart) then refuses the draft's one element as the block's part.
    icon = build(tmp_path, 'icon')
    assert not any('sgs-icon__label-text' in c for c in icon['pathClasses'].values())
    assert 'sgs-icon--has-label' not in icon['pathClasses']['']
    container = build(tmp_path, 'container')
    assert not any(p.startswith('.sgs-bg-media') or p.startswith('.sgs-container__svg-bg') for p in container['elements'])


def test_look_key_follows_the_fixture_entry(tmp_path, monkeypatch):
    # SITE_LOOK_MUTATE=fixture-key must fail: the look is drawn from the block's fixture entry, so an edit to that entry
    # alone (no code, snapshot or stylesheet change) must make the stored look stale.
    data = json.loads(SL.FIXTURES.read_text(encoding='utf-8'))
    before = SL.look_key('icon', SNAPSHOT, True)
    data['sgs/icon']['attributes']['iconName'] = 'heart'
    moved = tmp_path / 'fixtures.json'
    moved.write_text(json.dumps(data), encoding='utf-8')
    monkeypatch.setattr(SL, 'FIXTURES', moved)
    assert SL.look_key('icon', SNAPSHOT, True) != before


class FakePage:
    """What path_structure reads of a page: its root element and its soup."""

    def __init__(self, html: str, root_class: str):
        from bs4 import BeautifulSoup
        self.soup = BeautifulSoup(html, 'html.parser')
        self.root = self.soup.find(class_=root_class)


def test_a_part_only_a_marker_page_draws_is_kept_with_its_place():
    """MUST FAIL with SITE_LOOK_MUTATE=conditional-parts (build_block drops the key) and before the key existed: the default
    look held one render's parts, so a part a setting switches on (a trailing icon, a badge) had no path to be paired with."""
    default = FakePage('<ul class="sgs-m"><li class="sgs-m__item"><a class="sgs-m__link"><span class="sgs-m__text">A</span></a></li></ul>', 'sgs-m')
    marked = FakePage('<ul class="sgs-m"><li class="sgs-m__item"><a class="sgs-m__link"><span class="sgs-m__text">A</span>'
                      '<i class="sgs-m__trailing"></i><b class="sgs-m__badge"></b></a></li></ul>', 'sgs-m')
    elements = {p: {} for p in SL.path_structure(default)}
    got = SL.conditional_parts({'default-v0': SL.path_structure(default), 'b:itemTrailing-on-v0': SL.path_structure(marked)}, elements,
                               {'b:itemTrailing-on-v0': 'itemTrailing'})
    assert sorted(got) == ['.sgs-m__item > .sgs-m__link > .sgs-m__badge', '.sgs-m__item > .sgs-m__link > .sgs-m__trailing']
    trailing = got['.sgs-m__item > .sgs-m__link > .sgs-m__trailing']
    assert trailing['tag'] == 'i'
    assert trailing['classes'] == ['sgs-m__trailing']
    assert trailing['parent'] == '.sgs-m__item > .sgs-m__link'
    assert trailing['siblings'] == ['.sgs-m__item > .sgs-m__link > .sgs-m__text', '.sgs-m__item > .sgs-m__link > .sgs-m__badge']
    assert trailing['firstJob'] == 'b:itemTrailing-on-v0'
    assert trailing['setting'] == 'itemTrailing'
    # a path the default look draws is never listed, and the root has no parent
    assert '' not in got
    assert SL.path_structure(default)['']['parent'] is None


def test_conditional_parts_are_in_the_look_of_a_block_with_marker_pages(tmp_path):
    """MUST FAIL with SITE_LOOK_MUTATE=conditional-parts: the pages the look reads for per-setting facts hold parts the
    default render lacks (the badge of a nav-drawer-menu row is drawn only when an item carries a description)."""
    look = build(tmp_path, 'nav-drawer-menu')
    cp = look.get('conditionalParts') or {}
    assert cp
    assert not set(cp) & set(look['elements'])
    one = next(iter(cp.values()))
    assert {'tag', 'classes', 'parent', 'siblings', 'firstJob', 'setting'} <= set(one)


def test_a_part_the_record_places_that_no_render_draws_must_be_listed():
    """MUST FAIL before the check existed: a placed part drawn by no render (nav-drawer-menu's trailing icon, while the fixture
    variants that draw it rendered nothing) was silent, so the look lacked it and pairing had nothing to pair with."""
    record = {'entries': [{'setting': 'a', 'part': 'sgs-m__link'}, {'setting': 'b', 'part': 'sgs-m__trailing svg'}, {'setting': 'c', 'part': 'sgs-m__trailing'},
                          {'setting': 'd', 'part': 'sgs-m__badge::after'}, {'setting': 'e', 'part': 'sgs-bg-media'}, {'setting': 'f', 'part': 'ROOT'}]}
    classes = {'': ['sgs-m'], '.sgs-m__link': ['sgs-m__link']}
    # the trailing icon and the badge are drawn by no render; the shared class and the root are not the block's own parts
    got = SL.undrawn_parts(record, 'm', classes, {})
    assert got == {'sgs-m__badge': ['d'], 'sgs-m__trailing': ['b', 'c']}
    # a page that sets a setting draws the badge: it is drawn somewhere
    cond = {'.sgs-m__link > .sgs-m__badge': {'tag': 'span', 'classes': ['sgs-m__badge']}}
    assert SL.undrawn_parts(record, 'm', classes, cond) == {'sgs-m__trailing': ['b', 'c']}
    faults = SL.completeness({'undrawnParts': got}, 'm', {'sgs-m__badge': 'view.js draws it after load'})
    assert len(faults) == 1
    assert 'sgs-m__trailing' in faults[0]
    assert 'does not list it' in faults[0]
    # listed and now drawn: stale entry
    stale = SL.completeness({}, 'm', {'sgs-m__badge': 'old reason'})
    assert len(stale) == 1
    assert 'remove it from the list' in stale[0]
    assert SL.completeness({'undrawnParts': got}, 'm', {'sgs-m__badge': 'x', 'sgs-m__trailing': 'y'}) == []


def test_tested_attrs_reads_attribute_selectors():
    names = SL.tested_attrs(['.a[open] > b, .c[aria-current="page"], :not([hidden]) .x[class*=y] {color:red}',
                             '@media (min-width:1px){.d{grid-template-columns:[full-start] 1fr [full-end]}} .e[data-x]{content:"[nope]"}'])
    assert {'open', 'aria-current', 'hidden', 'data-x'} <= names
    assert not names & {'class', 'full-start', 'full-end', 'nope'}


@pytest.mark.parametrize('name', ['snapshot', 'custom-css', 'section', 'footer-move', 'wrapper-root', 'fold-depth', 'path-attrs', 'plain-fixture', 'fixture-key', 'conditional-parts'])
def test_every_switch_is_named_in_the_builder(name):
    """Each switch a must-fail test names is one the builder reads."""
    assert f"'{name}'" in (LOOK / 'site_look.py').read_text(encoding='utf-8')


def test_property_lists_match_the_route():
    """props.json is the route's lib/calibrate-props.mjs lists (READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS,
    OWN_INHERITED, WIDTHS), kept beside the builder so a build needs no Node; a change on either side fails here.
    Regenerate: node -e "import('./lib/calibrate-props.mjs').then(m=>console.log(JSON.stringify({read:m.READ_PROPS,
    pseudo:m.CAL_PSEUDO_PROPS,text:m.TEXT_PSEUDO_PROPS,own:m.OWN_INHERITED,widths:m.WIDTHS})))" (in scripts/computed-route)."""
    js = ("import('./lib/calibrate-props.mjs').then(m=>console.log(JSON.stringify({read:m.READ_PROPS,pseudo:m.CAL_PSEUDO_PROPS,"
          "text:m.TEXT_PSEUDO_PROPS,own:m.OWN_INHERITED,widths:m.WIDTHS})))")
    p = subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=str(SL.ROUTE))
    assert p.returncode == 0, p.stderr
    assert json.loads(p.stdout) == SL.load_props()


def test_builder_hash_ignores_a_comment_edit_and_follows_a_code_edit(tmp_path):
    """MUST FAIL before 2026-11-23: the builder's hash was its files' raw bytes, so a comment edit rebuilt every look."""
    mod = tmp_path / 'mod.py'
    mod.write_text('def f():\n    # note\n    return 1\n', encoding='utf-8')
    base = SL.builder_hash([mod])
    mod.write_text('def f():\n    # another note\n    """Says what f does."""\n    return 1\n', encoding='utf-8')
    assert SL.builder_hash([mod]) == base
    mod.write_text('def f():\n    return 2\n', encoding='utf-8')
    assert SL.builder_hash([mod]) != base
