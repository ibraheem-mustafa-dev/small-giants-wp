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


# ---------------------------------------------------------------- no removal without a drawn part
def test_an_entry_whose_part_no_page_draws_is_never_removed(monkeypatch):
    import proof as PR

    class Page:
        def __init__(self, els):
            self.els = els

        def elements(self, part):
            return self.els

    class Pages:
        def __init__(self, els):
            self.els = els

        def get(self, j, held=(), conds=frozenset()):
            return Page(self.els)

    assert PR.part_drawn(Pages([]), [('b', 'c')], 'ROOT', (), frozenset()) is False
    assert PR.part_drawn(Pages([('el', None)]), [('b', 'c')], 'ROOT', (), frozenset()) is True
    src = (Path(PR.__file__)).read_text(encoding='utf-8')
    # the guard sits before the verdict is recorded and spares only the dead-CSS removal
    assert "if verdict == 'removed' and str(evidence).startswith(MEASURED_REMOVALS) and not part_drawn(" in src
    for fragment in PR.MEASURED_REMOVALS:  # every measured removal's evidence starts with one of these
        assert f"'removed', '{fragment}" in src or f"'removed', (f'{fragment}" in src


# ---------------------------------------------------------------- the stylesheet as it ships
def test_a_block_stylesheet_is_read_as_the_build_ships_it(tmp_path, monkeypatch):
    try:
        D.node_env(PLUGIN)
    except RuntimeError:
        pytest.skip('no postcss here (set SGS_NODE_PATH)')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    src = tmp_path / 'style.css'
    src.write_text('.sgs-demo__card { box-shadow: 0 2px 4px rgba(0,0,0,.2); }', encoding='utf-8')
    shipped = D.shipped_css(PLUGIN, src, tmp_path / 'no-block.json').read_text(encoding='utf-8')
    assert 'forced-colors' in shipped  # scripts/shadow-fallback adds the high-contrast fallback the source lacks
    assert D.SOURCE_OF[D.shipped_css(PLUGIN, src, tmp_path / 'no-block.json')] == src


# ---------------------------------------------------------------- code-review fixes (2026-11-22)
import stamp as ST  # noqa: E402


def test_stylesheets_cascade_in_source_order_not_by_cache_name(tmp_path, monkeypatch):
    # two shipped copies whose cache names sort the other way round from their sources
    a_src, b_src = PLUGIN / 'src' / 'blocks' / 'aaa' / 'style.css', PLUGIN / 'src' / 'blocks' / 'zzz' / 'style.css'
    a_out, b_out = tmp_path / 'ffff.css', tmp_path / '0000.css'
    monkeypatch.setitem(D.SOURCE_OF, a_out, a_src)
    monkeypatch.setitem(D.SOURCE_OF, b_out, b_src)
    shared = PLUGIN / 'src' / 'shared' / 'x.css'
    assets = PLUGIN / 'assets' / 'css' / 'y.css'
    assert D.sheet_order([shared, b_out, assets, a_out]) == [assets, a_out, b_out, shared]


def test_the_core_is_php_outside_block_folders_and_needs_a_library():
    inputs = {'includes/boot.php': 'a', 'fixture-entry': 'f', 'src/shared/x.css': 's', 'src/blocks/demo/render.php': 'r'}
    few = {f'sgs/b{i}': {'stamp': {'inputs': dict(inputs)}} for i in range(3)}
    many = {f'sgs/b{i}': {'stamp': {'inputs': dict(inputs)}} for i in range(ST.CORE_MIN)}
    for records in (few, many):
        for doc in records.values():
            doc['stamp']['inputs'] = {k: 'changed' for k in inputs}
    # nothing on disk matches 'changed', so every input reads as changed; the fixture and the sheet stay own
    out = ST.select(Path('E:/nowhere'), many, {}, Path('.'), '')
    reasons = out['sgs/b0']
    assert 'includes/boot.php changed' in reasons['core']
    assert 'fixture-entry changed' in reasons['own'] and 'src/shared/x.css changed' in reasons['own']
    out = ST.select(Path('E:/nowhere'), few, {}, Path('.'), '')
    assert out['sgs/b0']['core'] == []  # too few stamps: nothing is core


def test_an_unchanged_fixture_entry_is_not_a_change(tmp_path):
    fixtures = {'sgs/demo': {'attributes': {'a': 1}}, '_shared': {'preconditions': {'x': {}}}}
    inputs = ST.block_inputs(tmp_path, 'demo', fixtures['sgs/demo'], fixtures['_shared'], tmp_path, [], [])
    records = {'sgs/demo': {'stamp': {'inputs': inputs, 'theme': ST.theme_reach({}, [], [])}}}
    assert ST.select(tmp_path, records, fixtures, tmp_path, '') == {}
    fixtures['_shared']['preconditions']['y'] = {}
    assert ST.select(tmp_path, records, fixtures, tmp_path, '')['sgs/demo']['own'] == ['fixture-shared changed']


def test_a_cached_render_without_its_files_is_rendered_again(tmp_path, monkeypatch):
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    rn = RN.Renderer(PLUGIN, {}, PLUGIN, 'text')
    calls = []
    import subprocess

    def fake_run(cmd, **k):
        calls.append(cmd)
        inc = Path(k['env']['SGS_SETTING_RECORD_INCLUDED'])
        inc.write_text(json.dumps([str(PLUGIN / 'includes' / 'helper.php')]), encoding='utf-8')
        return SimpleNamespace(stdout=json.dumps({'ok': True, 'html': '<p></p>'}), stderr='')
    monkeypatch.setattr(subprocess, 'run', fake_run)
    import hashlib
    key = hashlib.md5(json.dumps(['sgs/text', {}, '', None, list(rn.extra), rn.post], sort_keys=True).encode()).hexdigest()
    (rn.cache / f'{key}.json').write_text(json.dumps({'ok': True, 'html': '<p></p>'}), encoding='utf-8')  # an old cache entry
    res = rn.render('sgs/text', {})
    assert calls and res['included'] == ['includes/helper.php']
    assert rn.included == {'includes/helper.php'}


def test_a_record_keeping_unchecked_entries_is_not_written_where_the_seeder_reads(monkeypatch, tmp_path):
    monkeypatch.setattr(CK, 'RECORDS', tmp_path)
    rec = tmp_path / 'demo.json'
    rec.write_text(json.dumps({'entries': [{'setting': 'x', 'part': 'root', 'props': ['color'], 'state': None, 'tiers': [], 'runner': 'footer'}]}), encoding='utf-8')
    run = {'entries': {}, 'unnamed': [], 'defaultHtml': '<div class="sgs-demo"></div>', 'results': {}, 'sheetFiles': [],
           'renderer': SimpleNamespace(included=set()), 'plan': {'fixture': {}},
           'stats': {'block': 'sgs/demo', 'coverage': {'rootPrinted': True, 'defaultEmpty': False, 'defaultRendered': True},
                     'renderFailedOnly': [], 'testedNoPaint': [], 'replacesBlock': [], 'unvalued': []}}
    monkeypatch.setattr(CK, 'run_block', lambda *a, **k: run)
    monkeypatch.setattr(CK, 'parts_check', lambda *a: {'order': [], 'declaredNotPrinted': [], 'declaredScriptBuilt': [], 'printedNotDeclared': []})
    monkeypatch.setattr(CK, 'entry_values', lambda run: {})
    import proof as PR
    monkeypatch.setattr(PR, 'prove', lambda short, run: ({}, {'blind': [], 'removed': []}))
    monkeypatch.setattr(CK, 'apply_browser_verdicts', lambda *a: None)
    out = tmp_path / 'reports'
    args = SimpleNamespace(fixtures=tmp_path / 'none.json', instances=None, instances_dir=None, plugin=PLUGIN, no_proof=False,
                           record=None, record_dir=None, write=rec, write_dir=None, out=out, strict_parts=False)
    with pytest.raises(SystemExit, match='runner'):
        CK.check_block(args, 'demo')
    assert 'runner' in rec.read_text(encoding='utf-8')  # untouched


def test_a_worker_that_exits_is_that_blocks_failure(monkeypatch):
    def boom(args, block):
        raise SystemExit('refusing')
    monkeypatch.setattr(CK, 'check_block', boom)
    assert CK._check_in_worker(SimpleNamespace(), 'demo') == 2


def test_the_root_check_reads_single_quoted_classes(monkeypatch):
    run = fake_run(monkeypatch, "<div class='sgs-demo wp-block-sgs-demo'>hi</div>")
    assert run['stats']['coverage']['rootPrinted'] is True
