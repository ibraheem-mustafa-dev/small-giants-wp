"""Must-fail tests for Task 3's library run (setting-record plan, Task 3): every block has a fixture, stand-ins carried
inline reach the runner, a block that renders nothing or whose renders all fail cannot pass, a Sass stylesheet is read,
and several blocks run in a bounded pool."""
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import check as CK  # noqa: E402
import diff as D  # noqa: E402
import render as RN  # noqa: E402
import seed_fixtures as SF  # noqa: E402

PLUGIN = RN.DEFAULT_PLUGIN


# ---------------------------------------------------------------- every block has a fixture
def test_a_block_without_a_fixture_is_named():
    fixtures = json.loads(SF.FIXTURES.read_text(encoding='utf-8'))
    names = SF.roster()
    assert not [p for p in SF.problems(fixtures, names) if 'no fixture entry' in p]
    gone = dict(fixtures)
    gone.pop('sgs/heading')
    assert 'sgs/heading: no fixture entry' in SF.problems(gone, names)


def test_a_missing_harness_file_is_named():
    fixtures = {'sgs/demo': {'harness': {'productFile': 'fixtures/no-such-product.json'}}}
    assert any('does not exist' in p for p in SF.problems(fixtures, []))


def test_seeding_takes_calibration_and_render_path_stand_ins():
    cal = {'sgs/demo': {'attributes': {'a': 1}, 'inner': [], 'basket': {'id': 1}}}
    paths = {'demo': {'base': {'a': 0, 'b': 2}, 'paths': {
        'off': {'unrendered': 'needs a site', 'product': {'id': 99}},
        'on': {'attrs': {}, 'product': {'id': 7}, 'options': {'o': 1}, 'content': '<p class="x">kid</p>'}}}}
    e = SF.entry_for('sgs/demo', cal, paths)
    assert e['attributes'] == {'a': 1, 'b': 2}  # calibration's attribute over the render path's base
    assert e['harness']['product'] == {'id': 7}  # from the rendered path, never the unrendered one
    assert e['harness']['options'] == {'o': 1}
    assert e['content'] == '<p class="x">kid</p>'
    assert 'basket' in e['notes'] and 'basket' not in e


def test_a_placeholder_gets_the_file_that_holds_it():
    e = SF.entry_for('sgs/demo', {'sgs/demo': {'attributes': {'img': '{{image}}', 'p': '{{product}}'}}}, {})
    assert e['harness'] == {'attachmentsFile': 'fixtures/attachments.json', 'productFile': 'fixtures/product.json'}
    inline = SF.entry_for('sgs/demo', {'sgs/demo': {'attributes': {'p': '{{product}}'}}},
                          {'demo': {'paths': {'on': {'attrs': {}, 'product': {'id': 9301}}}}})
    assert 'productFile' not in inline['harness']  # the inline stand-in already holds it


# ---------------------------------------------------------------- inline stand-ins reach the runner
def test_inline_stand_ins_become_runner_files(tmp_path, monkeypatch):
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    args = RN.harness_args({'harness': {'product': {'id': 7}, 'postContent': '<p>hi</p>'}}, tmp_path)
    f = Path(args[args.index('--product-file') + 1])
    assert json.loads(f.read_text(encoding='utf-8')) == {'id': 7}
    assert Path(args[args.index('--post-content-file') + 1]).read_text(encoding='utf-8') == '<p>hi</p>'
    with pytest.raises(ValueError):
        RN.harness_args({'harness': {'productFile': 'fixtures/product.json', 'product': {'id': 7}}}, tmp_path)


def test_site_options_go_to_the_runner_environment():
    assert RN.harness_env({'harness': {}}) is None
    env = RN.harness_env({'harness': {'options': {'sgs_site_info': {'phone': '1'}}}})
    assert json.loads(env['SGS_QA_OPTIONS']) == {'sgs_site_info': {'phone': '1'}}


# ---------------------------------------------------------------- the coverage floor
class FakeRenderer:
    """A demo block: the default render is `html`; a setting's render fails when its value is 'boom'."""

    def __init__(self, html):
        self.html = html

    def render_inner(self, rows):
        return '', None

    def render_many(self, slug, jobs, content, inner):
        return {k: ({'ok': False, 'error': 'boom'} if 'boom' in json.dumps(a) else {'ok': True, 'html': self.html})
                for k, a in jobs.items()}


def fake_run(monkeypatch, html, value='x'):
    plan = {'fixture': {}, 'unvalued': [], 'instances': [
        {'key': 'default', 'attr': None, 'attrs': {}, 'isDefault': True, 'isBase': False, 'variant': 0, 'baseKey': None},
        {'key': 'v', 'attr': 'colour', 'attrs': {'colour': value}, 'isDefault': False, 'isBase': False, 'variant': 0, 'baseKey': None}]}
    monkeypatch.setattr(CK, 'load_plan', lambda *a, **k: plan)
    monkeypatch.setattr(CK.RN, 'Renderer', lambda *a, **k: FakeRenderer(html))
    monkeypatch.setattr(CK.RN, 'with_defaults', lambda plugin, short, a: a)
    monkeypatch.setattr(CK.RN, 'block_json', lambda plugin, short: {'attributes': {'colour': {'type': 'string'}}})
    monkeypatch.setattr(CK.D, 'static_rules', lambda *a: [])
    return CK.run_block('demo', PLUGIN, {}, PLUGIN)


def test_an_empty_default_render_tests_nothing(monkeypatch):
    run = fake_run(monkeypatch, '')
    assert run['stats']['coverage']['rootPrinted'] is False
    ok = fake_run(monkeypatch, '<div class="sgs-demo wp-block-sgs-demo">hi</div>')
    assert ok['stats']['coverage']['rootPrinted'] is True


def test_saved_child_markup_reaches_the_render(monkeypatch):
    seen = {}

    class Spy(FakeRenderer):
        def render_many(self, slug, jobs, content, inner):
            seen['content'] = content
            return super().render_many(slug, jobs, content, inner)

    plan = {'fixture': {'content': '<details class="sgs-demo__item"></details>'}, 'unvalued': [], 'instances': [
        {'key': 'default', 'attr': None, 'attrs': {}, 'isDefault': True, 'isBase': False, 'variant': 0, 'baseKey': None}]}
    monkeypatch.setattr(CK, 'load_plan', lambda *a, **k: plan)
    monkeypatch.setattr(CK.RN, 'Renderer', lambda *a, **k: Spy('<div class="sgs-demo"></div>'))
    monkeypatch.setattr(CK.RN, 'with_defaults', lambda plugin, short, a: a)
    monkeypatch.setattr(CK.RN, 'block_json', lambda plugin, short: {'attributes': {}})
    monkeypatch.setattr(CK.D, 'static_rules', lambda *a: [])
    CK.run_block('demo', PLUGIN, {}, PLUGIN)
    assert seen['content'] == '<details class="sgs-demo__item"></details>'


def test_a_setting_whose_renders_all_failed_is_not_tested_no_paint(monkeypatch):
    run = fake_run(monkeypatch, '<div class="sgs-demo">hi</div>', value='boom')
    assert run['stats']['renderFailedOnly'] == ['colour']
    assert 'colour' not in run['stats']['testedNoPaint']


def test_the_floor_fails_the_check(monkeypatch, tmp_path):
    run = {'entries': {}, 'unnamed': [], 'defaultHtml': '', 'stats': {
        'block': 'sgs/demo', 'coverage': {'rootPrinted': False, 'defaultEmpty': True, 'defaultRendered': True},
        'renderFailedOnly': [], 'testedNoPaint': [], 'replacesBlock': [], 'unvalued': []}}
    monkeypatch.setattr(CK, 'run_block', lambda *a, **k: run)
    monkeypatch.setattr(CK, 'parts_check', lambda *a: {'order': [], 'declaredNotPrinted': [], 'declaredScriptBuilt': [], 'printedNotDeclared': []})
    args = SimpleNamespace(fixtures=tmp_path / 'none.json', instances=None, instances_dir=None, plugin=PLUGIN, no_proof=True,
                           record=None, record_dir=None, write=None, write_dir=None, out=tmp_path, strict_parts=False)
    assert CK.check_block(args, 'demo') == 1
    report = json.loads((tmp_path / 'demo.check.json').read_text(encoding='utf-8'))
    assert report['coverageFloor'] == ['the default render is empty']
    run['stats']['coverage'] = {'rootPrinted': True, 'defaultEmpty': False, 'defaultRendered': True}
    assert CK.check_block(args, 'demo') == 0


# ---------------------------------------------------------------- a Sass stylesheet is read
def test_a_block_written_in_sass_has_its_rules_read(tmp_path, monkeypatch):
    try:
        D.sass_command(PLUGIN)
    except RuntimeError:
        pytest.skip('no Sass compiler here (set SGS_SASS)')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    plugin = tmp_path / 'plugin'
    (plugin / 'src' / 'blocks' / 'demo').mkdir(parents=True)
    (plugin / 'src' / 'shared').mkdir(parents=True)
    (plugin / 'assets' / 'css').mkdir(parents=True)
    (plugin / 'src' / 'blocks' / 'demo' / 'style.scss').write_text('.sgs-demo { &__part { color: red; } }', encoding='utf-8')
    monkeypatch.setenv('SGS_SASS', D.sass_command(PLUGIN)[0])
    rules = D.static_rules(plugin, 'demo', [])
    assert ('.sgs-demo__part', 'color', 'red', '', 'src/blocks/demo/style.scss') in rules


# ---------------------------------------------------------------- several blocks in a bounded pool
def test_several_blocks_run_in_a_bounded_pool_biggest_first(monkeypatch):
    seen = {}

    class Pool:
        def __init__(self, max_workers):
            seen['workers'] = max_workers
            seen['order'] = []

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def submit(self, fn, args, block):
            seen['order'].append(block)
            class Done:  # a future: hashable, with the block's exit code
                def result(self):
                    return 1 if block == 'small' else 0
            return Done()

    import concurrent.futures as CF
    monkeypatch.setattr(CF, 'ProcessPoolExecutor', Pool)
    monkeypatch.setattr(CF, 'as_completed', lambda fs: list(fs))
    monkeypatch.setattr(CK, '_size', lambda plugin, b: {'small': 2, 'big': 900, 'mid': 50}[b])
    args = SimpleNamespace(blocks=['small', 'big', 'mid'], jobs=2, plugin=PLUGIN)
    assert CK.check_many(args) == 1  # the worst block's exit
    assert seen['workers'] == 2 and seen['order'] == ['big', 'mid', 'small']


# ---------------------------------------------------------------- a setting gated by an off-by-default mode
import instances as I  # noqa: E402

MODE_SCHEMA = {'linkUnderline': {'type': 'string', 'enum': ['', 'none', 'always', 'hover', 'sweep'], 'default': ''},
               'linkUnderlineColour': {'type': 'string', 'default': ''},
               'linkUnderlineColourHover': {'type': 'string', 'default': ''},
               'panelEasing': {'type': 'string', 'enum': ['', 'ease', 'linear', 'custom'], 'default': ''},
               'panelEasingCustom': {'type': 'string', 'default': ''},
               'itemTextDecoration': {'type': 'string', 'enum': ['', 'none', 'underline'], 'default': ''},
               'itemTextDecorationHover': {'type': 'string', 'default': ''},
               'layout': {'type': 'string', 'enum': ['', 'flex', 'grid'], 'default': ''},
               'layoutMode': {'type': 'string', 'default': 'fixed'}}


def test_a_setting_named_after_an_off_mode_is_drawn_with_the_mode_on():
    assert I.gating_mode('linkUnderlineColour', MODE_SCHEMA, {}) == {'linkUnderline': 'always'}
    assert I.gating_mode('panelEasingCustom', MODE_SCHEMA, {}) == {'panelEasing': 'custom'}  # the value its name names


def test_a_mode_already_on_a_state_variant_or_another_mode_is_no_partner():
    assert I.gating_mode('linkUnderlineColour', MODE_SCHEMA, {'linkUnderline': 'sweep'}) == {}
    assert I.gating_mode('itemTextDecorationHover', MODE_SCHEMA, {}) == {}  # a hover look of the same property
    assert I.gating_mode('layoutMode', MODE_SCHEMA, {}) == {}  # a mode of its own


def test_the_mode_partner_reaches_the_preconditions():
    row = {'attr': 'linkUnderlineColour', 'props': ['text-decoration-color'], 'vprop': 'text-decoration-color'}
    assert I.preconditions(row, MODE_SCHEMA, {}, {})['linkUnderline'] == 'always'


# ---------------------------------------------------------------- a root that prints only WordPress's class
def test_a_root_with_only_the_wordpress_class_is_the_block_root():
    import computed as CP
    page = CP.Page('<h4 class="wp-block-sgs-demo sgs-dmo-1a2b"><a href="#">x</a></h4>', [], 'demo')
    assert page.root is not None and page.root.name == 'h4'
    assert [e.name for e, _ in page.elements('ROOT a')] == ['a']
    assert CP.Page('<div class="sgs-demo">x</div>', [], 'demo').root['class'].count('wp-block-sgs-demo') == 1


# ---------------------------------------------------------------- an editor preview never sets a visitor's token
def test_only_scripts_a_front_end_entry_reaches_count_as_setting_a_token():
    import proof as PR
    reach = PR.front_end_reachable(str(PLUGIN))
    assert 'src/blocks/cart/view.js' in reach and 'src/blocks/cart/panel-render.js' in reach
    assert 'src/blocks/cart/panel-preview-style.js' not in reach  # imported only by the editor's PanelPreview.js
    assert PR.script_set_tokens(PLUGIN, {'--sgs-focus-under'}) == []  # written by the cart's editor preview only
    assert PR.script_set_tokens(PLUGIN, {'--sgs-mm-bridge-h'}) == [('--sgs-mm-bridge-h', 'src/shared/nav-interactivity/mega-disclosure.js')]
