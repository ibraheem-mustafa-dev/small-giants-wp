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


def test_tested_attrs_reads_attribute_selectors():
    names = SL.tested_attrs(['.a[open] > b, .c[aria-current="page"], :not([hidden]) .x[class*=y] {color:red}',
                             '@media (min-width:1px){.d{grid-template-columns:[full-start] 1fr [full-end]}} .e[data-x]{content:"[nope]"}'])
    assert {'open', 'aria-current', 'hidden', 'data-x'} <= names
    assert not names & {'class', 'full-start', 'full-end', 'nope'}


@pytest.mark.parametrize('name', ['snapshot', 'custom-css', 'section', 'footer-move', 'wrapper-root', 'fold-depth', 'path-attrs'])
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
