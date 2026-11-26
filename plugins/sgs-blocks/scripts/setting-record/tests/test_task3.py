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


def test_a_fixture_variant_that_renders_nothing_is_named(monkeypatch):
    """nav-drawer-menu's variants 1 and 2 named a menu post no stand-in answered, so 726 of 1,088 renders were empty and the
    parts they were written to draw (the trailing icon) appeared in no render."""
    root = '<div class="sgs-demo">hi</div>'
    assert CK.variant_faults([(0, ''), (1, root)], 'demo') == []  # variant 0 is the floor's own
    assert CK.variant_faults([(0, root), (1, ''), (2, '<style>.a{}</style>  '), (3, root)], 'demo') == [
        {'variant': 1, 'why': 'renders nothing'}, {'variant': 2, 'why': 'renders nothing'}]
    assert CK.variant_faults([(0, root), (1, '<p class="notice">no menu</p>')], 'demo') == [
        {'variant': 1, 'why': 'does not print the block root'}]
    # a variant the fixture marks expectEmpty prints nothing on purpose: no fault while it does, a fault once it prints markup
    assert CK.variant_faults([(0, root), (1, '')], 'demo', {'1': 'a picture block with no picture'}) == []
    assert CK.variant_faults([(0, root), (1, '<style>.a{}</style>')], 'demo', {1: 'why'}) == []
    assert CK.variant_faults([(0, root), (1, root)], 'demo', {'1': 'why'}) == [
        {'variant': 1, 'why': 'is marked expectEmpty in its fixture but prints markup'}]
    assert CK.variant_faults([(0, root), (1, ''), (2, '')], 'demo', {'1': 'why'}) == [{'variant': 2, 'why': 'renders nothing'}]
    # through the run: a variant whose default renders nothing is in the stats
    plan = {'fixture': {}, 'unvalued': [], 'instances': [
        {'key': 'default-v0', 'attr': None, 'attrs': {}, 'isDefault': True, 'isBase': False, 'variant': 0, 'baseKey': None},
        {'key': 'default-v1', 'attr': None, 'attrs': {'ref': 9101}, 'isDefault': True, 'isBase': False, 'variant': 1, 'baseKey': None}]}

    class Missing(FakeRenderer):
        def render_many(self, slug, jobs, content, inner):
            return {k: {'ok': True, 'html': '' if a.get('ref') == 9101 else self.html} for k, a in jobs.items()}

    monkeypatch.setattr(CK, 'load_plan', lambda *a, **k: plan)
    monkeypatch.setattr(CK.RN, 'Renderer', lambda *a, **k: Missing(root))
    monkeypatch.setattr(CK.RN, 'with_defaults', lambda plugin, short, a: a)
    monkeypatch.setattr(CK.RN, 'block_json', lambda plugin, short: {'attributes': {}})
    monkeypatch.setattr(CK.D, 'static_rules', lambda *a: [])
    run = CK.run_block('demo', PLUGIN, {}, PLUGIN)
    assert run['stats']['emptyVariants'] == [{'variant': 1, 'why': 'renders nothing'}]


def test_an_empty_variant_fails_the_floor(monkeypatch, tmp_path):
    run = {'entries': {}, 'unnamed': [], 'defaultHtml': '<div class="sgs-demo"></div>', 'stats': {
        'block': 'sgs/demo', 'coverage': {'rootPrinted': True, 'defaultEmpty': False, 'defaultRendered': True},
        'renderFailedOnly': [], 'testedNoPaint': [], 'replacesBlock': [], 'unvalued': [],
        'emptyVariants': [{'variant': 1, 'why': 'renders nothing'}]}}
    monkeypatch.setattr(CK, 'run_block', lambda *a, **k: run)
    monkeypatch.setattr(CK, 'parts_check', lambda *a: {'order': [], 'declaredNotPrinted': [], 'declaredScriptBuilt': [], 'printedNotDeclared': []})
    args = SimpleNamespace(fixtures=tmp_path / 'none.json', instances=None, instances_dir=None, plugin=PLUGIN, no_proof=True,
                           record=None, record_dir=None, write=None, write_dir=None, out=tmp_path, strict_parts=False)
    assert CK.check_block(args, 'demo') == 1
    report = json.loads((tmp_path / 'demo.check.json').read_text(encoding='utf-8'))
    assert report['coverageFloor'] == ['fixture variant 1 renders nothing']
    run['stats']['emptyVariants'] = []
    assert CK.check_block(args, 'demo') == 0


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
    check = ST.check_hash(Path('E:/nowhere'))
    few = {f'sgs/b{i}': {'stamp': {'inputs': dict(inputs), 'check': check}} for i in range(3)}
    many = {f'sgs/b{i}': {'stamp': {'inputs': dict(inputs), 'check': check}} for i in range(ST.CORE_MIN)}
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
    records = {'sgs/demo': {'stamp': {'inputs': inputs, 'theme': ST.theme_reach({}, [], []), 'check': ST.check_hash(tmp_path)}}}
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


# ---------------------------------------------------------------- the build gate (check.py --changed)
import datetime as _dt  # noqa: E402
import changed as CH  # noqa: E402


def _gate(monkeypatch, tmp_path, records, pending=None, roster=('sgs/a', 'sgs/b'), sel=None):
    rd = tmp_path / 'records'
    rd.mkdir(parents=True)
    for b in records:
        (rd / f"{b.split('/', 1)[1]}.json").write_text(json.dumps({'block': b, 'stamp': {}}), encoding='utf-8')
    pf = tmp_path / 'pending.json'
    pf.write_text(json.dumps({'blocks': pending or {}}), encoding='utf-8')
    monkeypatch.setattr(CH, 'PENDING', pf)
    monkeypatch.setattr(SF, 'roster', lambda plugin=None: list(roster))
    monkeypatch.setattr(ST, 'select', lambda *a, **k: sel or {})
    import theme as TH
    monkeypatch.setattr(TH, 'theme_css', lambda root: '')
    return CH.plan(PLUGIN, rd, tmp_path / 'fixtures.json', today=_dt.date(2026, 11, 22))


def test_a_block_without_a_record_fails_the_gate_unless_pending(monkeypatch, tmp_path):
    p = _gate(monkeypatch, tmp_path, ['sgs/a'])
    assert p['problems'] == ['sgs/b has no record: ' + CH.fix_command('sgs/b')]
    p = _gate(monkeypatch, tmp_path / 'x', ['sgs/a'], pending={'sgs/b': {'owner': 'd8', 'reason': 'template rework', 'until': '2026-11-28'}})
    assert p['problems'] == []


def test_a_lapsed_pending_entry_and_an_orphan_record_fail(monkeypatch, tmp_path):
    p = _gate(monkeypatch, tmp_path, ['sgs/a', 'sgs/gone'], pending={'sgs/b': {'owner': 'd8', 'until': '2026-11-21'}})
    assert any('lapsed on 2026-11-21' in m for m in p['problems'])
    assert any(m.startswith('sgs/gone has a record but no block') for m in p['problems'])


def test_only_touched_blocks_run_and_a_core_change_runs_the_canaries(monkeypatch, tmp_path):
    roster = ('sgs/a', 'sgs/b', 'sgs/heading', 'sgs/button')
    p = _gate(monkeypatch, tmp_path, list(roster), roster=roster, sel={'sgs/a': {'own': ['x changed'], 'core': []}})
    assert p['full'] == ['sgs/a'] and p['canary'] == []
    p = _gate(monkeypatch, tmp_path / 'y', list(roster), roster=roster, sel={'sgs/b': {'own': [], 'core': ['includes/boot.php changed']}})
    assert p['full'] == [] and p['canary'] == list(CH.CANARIES)


def test_a_change_to_the_check_or_the_runner_is_a_core_change(tmp_path, monkeypatch):
    fixtures = {'sgs/demo': {}}
    inputs = ST.block_inputs(tmp_path, 'demo', {}, {}, tmp_path, [], [])
    records = {'sgs/demo': {'stamp': {'inputs': inputs, 'theme': ST.theme_reach({}, [], []), 'check': ST.check_hash(PLUGIN)}}}
    monkeypatch.setattr(ST, 'check_hash', lambda plugin: 'other')
    out = ST.select(tmp_path, records, fixtures, tmp_path, '')
    assert out['sgs/demo']['core'] == ["the check's code or the offline runner changed"] and out['sgs/demo']['own'] == []


def test_a_finding_names_the_entry_and_the_fix(capsys):
    res = {'add': [{'setting': 'colour', 'part': 'title', 'props': ['color'], 'state': 'hover', 'tiers': []}], 'remove': [], 'change': []}
    CK.print_findings('sgs/demo', res, {}, [])
    err = capsys.readouterr().err
    assert 'colour -> title color hover' in err
    assert CH.fix_command('sgs/demo') in err and '--write plugins/sgs-blocks/scripts/data/setting-records/demo.json' in err


def test_a_timed_out_render_is_tried_once_more(tmp_path, monkeypatch):
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    rn = RN.Renderer(PLUGIN, {}, PLUGIN, 'text')
    import subprocess
    calls = []

    def flaky(cmd, **k):
        calls.append(1)
        if len(calls) == 1:
            raise subprocess.TimeoutExpired(cmd, 1)
        Path(k['env']['SGS_SETTING_RECORD_INCLUDED']).write_text('[]', encoding='utf-8')
        return SimpleNamespace(stdout=json.dumps({'ok': True, 'html': '<p></p>'}), stderr='')
    monkeypatch.setattr(subprocess, 'run', flaky)
    assert rn.render('sgs/text', {'x': 1})['ok'] is True and len(calls) == 2


# ---------------------------------------------------------------- a tier written from the setting's own value
def _bp(value, tier, setting='collapsePoint', props=('display',)):
    return {'setting': setting, 'part': 'ROOT', 'props': list(props), 'state': None, 'tiers': [tier], 'values': [value]}


def test_a_breakpoint_settings_tier_is_marked_with_its_edge_and_offset():
    a, b = _bp(3, '@media(max-width:2.98px)'), _bp(768, '@media(max-width:767.98px)')
    c = _bp('3', '@media (min-width:1024px) and (max-width:2.98px),(max-width:767.98px) and (max-width:2.98px)', props=('gap',))
    d = _bp('768', '@media (min-width:1024px) and (max-width:767.98px),(max-width:767.98px) and (max-width:767.98px)', props=('gap',))
    lo, hi = _bp(3, '@media(min-width:3px)', props=('flex',)), _bp(900, '@media(min-width:900px)', props=('flex',))
    CK.symbolic_tiers([a, b, c, d, lo, hi])
    assert a['symbolic'] == b['symbolic'] == {'edge': 'max', 'setting': 'collapsePoint', 'offset': -0.02}
    assert c['symbolic'] == d['symbolic'] == {'edge': 'max', 'setting': 'collapsePoint', 'offset': -0.02}
    assert lo['symbolic'] == {'edge': 'min', 'setting': 'collapsePoint', 'offset': 0.0}


def test_a_tier_that_does_not_follow_the_value_is_not_marked():
    fixed = [_bp(3, '@media(max-width:767.98px)'), _bp(768, '@media(max-width:1023.98px)')]  # moves, but not one for one
    same = [_bp(3, '@media(max-width:767.98px)', props=('gap',)), _bp(768, '@media(max-width:767.98px)', props=('gap',))]
    words = [_bp('a', '@media(max-width:2.98px)', props=('top',)), _bp('b', '@media(max-width:767.98px)', props=('top',))]
    CK.symbolic_tiers(fixed + same + words)
    assert not any('symbolic' in e for e in fixed + same + words)



def test_a_core_change_the_canaries_carried_is_stamped_into_every_record(tmp_path, monkeypatch):
    plugin = tmp_path / 'plugin'
    (plugin / 'includes').mkdir(parents=True)
    boot = plugin / 'includes' / 'boot.php'
    boot.write_text('<?php // v1', encoding='utf-8')
    rd = tmp_path / 'records'
    rd.mkdir()
    monkeypatch.setattr(ST, 'CORE_MIN', 2)
    for b in ('a', 'b'):
        inputs = {'includes/boot.php': ST.file_hash(boot), 'src/blocks/%s/render.php' % b: 'r'}
        (rd / f'{b}.json').write_text(json.dumps({'block': f'sgs/{b}', 'stamp': {'inputs': inputs, 'check': 'old'}}), encoding='utf-8')
    boot.write_text('<?php // v2', encoding='utf-8')
    assert sorted(ST.refresh_core(plugin, rd)) == ['a.json', 'b.json']
    for b in ('a', 'b'):
        st = json.loads((rd / f'{b}.json').read_text(encoding='utf-8'))['stamp']
        assert st['inputs']['includes/boot.php'] == ST.file_hash(boot) and st['check'] == ST.check_hash(plugin)
        assert st['inputs'][f'src/blocks/{b}/render.php'] == 'r'  # an own input is never refreshed here



# ---------------------------------------------------------------- accepted: proved on another block (Bean, 2026-11-22)
import accept as AC  # noqa: E402


def _e(setting, part, props, unproved=None):
    e = {'setting': setting, 'part': part, 'props': list(props), 'state': None, 'tiers': []}
    if unproved:
        e['unproved'] = unproved
    return e


def _key(e):
    return [e['setting'], e['part'], e['props'], e['state'], e['tiers']]


def test_an_unproven_entry_proved_in_the_same_shape_elsewhere_is_accepted():
    proved = _e('sgsFocusRests', 'sgs-info-toggle', ['background-color'])
    own = _e('titleColour', 'sgs-b__title', ['color'])
    a = {'block': 'sgs/a', 'entries': [proved, _e('titleColour', 'sgs-a__title', ['color'])], 'proofKeys': []}
    a['proofKeys'] = [_key(x) for x in a['entries']]
    b = {'block': 'sgs/b', 'entries': [_e('sgsFocusRests', 'sgs-info-toggle', ['background-color'], 'part-not-rendered'),
                                       dict(own, unproved='part-not-rendered'),
                                       _e('titleColour', 'sgs-b__title', ['font-size'], 'part-not-rendered')]}
    assert AC.mark(b, *AC.library({'sgs/a': a})) == 2
    assert b['entries'][0]['accepted'] == 'proved on sgs/a'           # a shared part: the same element
    assert b['entries'][1]['accepted'] == 'proved on sgs/a'           # its own part by element name (__title)
    assert 'accepted' not in b['entries'][2]                          # another property: not the same shape


def test_a_shape_the_proof_removed_anywhere_is_not_accepted():
    a = {'block': 'sgs/a', 'entries': [_e('gap', 'ROOT', ['gap'])], 'proofKeys': []}
    a['proofKeys'] = [_key(x) for x in a['entries']]
    c = {'block': 'sgs/c', 'entries': [], 'proofKeys': [_key(_e('gap', 'ROOT', ['gap']))]}  # removed by c's proof
    b = {'block': 'sgs/b', 'entries': [_e('gap', 'ROOT', ['gap'], 'rule-needs-absent-markup')]}
    assert AC.mark(b, *AC.library({'sgs/a': a, 'sgs/c': c})) == 0 and 'accepted' not in b['entries'][0]
    b['entries'][0]['accepted'] = 'stale'
    assert AC.mark(b, *AC.library({'sgs/c': c})) == 0 and 'accepted' not in b['entries'][0]  # a stale mark is cleared



# ---------------------------------------------------------------- the value a rule comes from
def test_a_rule_only_the_plain_render_holds_takes_the_plain_value(monkeypatch):
    monkeypatch.setattr(CK.RN, 'block_json', lambda plugin, short: {'attributes': {'collapsePoint': {'type': 'number', 'default': 768}}})
    k_new = ('collapsePoint', 'ROOT', ('display',), None, ('@media(max-width:2.98px)',))
    k_old = ('collapsePoint', 'ROOT', ('display',), None, ('@media(max-width:767.98px)',))
    run = {'plugin': PLUGIN, 'slug': 'sgs/demo', 'jobs': {'base': {}, 'test': {'collapsePoint': 3}},
           'pairs': {k_new: {('base', 'test')}, k_old: {('base', 'test')}},
           'sides': {k_new: {(('base', 'test'), 'changed')}, k_old: {(('base', 'test'), 'base')}}}
    vals = CK.entry_values(run)
    assert vals[k_new] == [3] and vals[k_old] == [768]


def test_the_diff_says_which_render_holds_a_rule():
    rb = {('@media(max-width:767.98px)', '.sgs-demo', 'display'): 'none'}
    rm = {('@media(max-width:2.98px)', '.sgs-demo', 'display'): 'none'}
    pls, _info = D.diff_placements((rb, {}), (rm, {}), 'demo', [])
    sides = {p['tiers'][0]: p['side'] for p in pls if p.get('mechanism') == 'run-css'}
    assert sides == {'@media(max-width:767.98px)': 'base', '@media(max-width:2.98px)': 'changed'}



def test_the_render_cache_key_does_not_hold_the_checkouts_path(tmp_path, monkeypatch):
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path / 'cache')
    fixture = {'harness': {'postFile': 'fixtures/menu-post.json'}}
    one, two = tmp_path / 'a' / 'setting-record', tmp_path / 'b' / 'setting-record'
    keys = [RN.portable_args(RN.harness_args(fixture, d), d) for d in (one, two)]
    assert keys[0] == keys[1] and '<fixtures>/fixtures/menu-post.json' in keys[0]



def test_the_stamp_hashes_the_plans_renders_not_the_proofs(monkeypatch):
    run = fake_run(monkeypatch, '<div class="sgs-demo">hi</div>')
    plain = ST.outputs_hash(run['planResults'])
    run['results']['proof-completion'] = {'ok': True, 'html': '<div class="sgs-demo extra"></div>'}  # what the proof adds
    assert ST.outputs_hash(run['planResults']) == plain and ST.outputs_hash(run['results']) != plain



def test_a_stylesheet_edit_keeps_the_cached_renders_and_a_php_edit_does_not(tmp_path):
    plugin = tmp_path / 'plugin'
    blk = plugin / 'src' / 'blocks' / 'demo'
    blk.mkdir(parents=True)
    (blk / 'block.json').write_text('{"name": "sgs/demo"}', encoding='utf-8')
    (blk / 'render.php').write_text('<?php echo 1;', encoding='utf-8')
    (blk / 'style.css').write_text('.a{color:red}', encoding='utf-8')
    before = RN.code_hash(plugin, (), {'demo'})
    (blk / 'style.css').write_text('.a{color:blue}', encoding='utf-8')
    assert RN.code_hash(plugin, (), {'demo'}) == before
    (blk / 'render.php').write_text('<?php echo 2;', encoding='utf-8')
    assert RN.code_hash(plugin, (), {'demo'}) != before


def test_a_render_that_loads_a_stylesheet_reader_is_refused(tmp_path, monkeypatch):
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    rn = RN.Renderer(PLUGIN, {}, PLUGIN, 'text')
    import subprocess

    def fake(cmd, **k):
        Path(k['env']['SGS_SETTING_RECORD_INCLUDED']).write_text(json.dumps([str(PLUGIN / RN.STYLESHEET_READERS[0])]), encoding='utf-8')
        return SimpleNamespace(stdout=json.dumps({'ok': True, 'html': '<p></p>'}), stderr='')
    monkeypatch.setattr(subprocess, 'run', fake)
    with pytest.raises(RuntimeError, match='reads stylesheet files'):
        rn.render('sgs/text', {'y': 1})



def test_a_core_file_aimed_at_one_block_checks_that_block(tmp_path, monkeypatch):
    plugin = tmp_path / 'plugin'
    (plugin / 'includes' / 'forms').mkdir(parents=True)
    scope = plugin / 'includes' / 'forms' / 'field-name-scope.php'
    boot = plugin / 'includes' / 'boot.php'
    scope.write_text("<?php add_filter( 'render_block_sgs/form', 'f' ); // v1", encoding='utf-8')
    boot.write_text('<?php // v1', encoding='utf-8')
    monkeypatch.setattr(ST, 'CORE_MIN', 2)
    inputs = {'includes/forms/field-name-scope.php': ST.file_hash(scope), 'includes/boot.php': ST.file_hash(boot)}
    records = {b: {'stamp': {'inputs': dict(inputs), 'theme': ST.theme_reach({}, [], []), 'check': ST.check_hash(plugin)}}
               for b in ('sgs/form', 'sgs/heading', 'sgs/form-field-text')}
    scope.write_text("<?php add_filter( 'render_block_sgs/form', 'f' ); str_starts_with( $n, 'sgs/form-field-' ); // v2", encoding='utf-8')
    out = ST.select(plugin, records, {}, tmp_path, '')
    assert out['sgs/form']['own'] == ['includes/forms/field-name-scope.php changed and names this block']
    assert out['sgs/form-field-text']['own'] == ['includes/forms/field-name-scope.php changed and names this block']
    assert out['sgs/heading']['own'] == [] and out['sgs/heading']['core'] == ['includes/forms/field-name-scope.php changed']
    boot.write_text('<?php // v2', encoding='utf-8')  # a file that names no block stays with the canaries
    scope.write_text("<?php add_filter( 'render_block_sgs/form', 'f' ); // v1", encoding='utf-8')
    out = ST.select(plugin, records, {}, tmp_path, '')
    assert out['sgs/form']['own'] == [] and 'includes/boot.php changed' in out['sgs/form']['core']



def test_an_editor_script_edit_keeps_renders_and_selects_no_block(tmp_path):
    plugin = tmp_path / 'plugin'
    blk = plugin / 'src' / 'blocks' / 'demo'
    blk.mkdir(parents=True)
    (blk / 'block.json').write_text('{"name": "sgs/demo"}', encoding='utf-8')
    (blk / 'render.php').write_text('<?php echo 1;', encoding='utf-8')
    (blk / 'edit.js').write_text('export default 1;', encoding='utf-8')
    before = RN.code_hash(plugin, (), {'demo'})
    inputs = ST.block_inputs(plugin, 'demo', {}, {}, tmp_path, [], [])
    assert 'src/blocks/demo/edit.js' not in inputs and 'src/blocks/demo/render.php' in inputs
    records = {'sgs/demo': {'stamp': {'inputs': inputs, 'theme': ST.theme_reach({}, [], []), 'check': ST.check_hash(plugin)}}}
    (blk / 'edit.js').write_text('export default 2;', encoding='utf-8')
    (blk / 'index.js').write_text('import "./edit";', encoding='utf-8')  # a new script file
    assert RN.code_hash(plugin, (), {'demo'}) == before
    assert ST.select(plugin, records, {}, tmp_path, '') == {}
    records['sgs/demo']['stamp']['inputs']['src/blocks/demo/edit.js'] = 'an older stamp listed it'
    assert ST.select(plugin, records, {}, tmp_path, '') == {}



# ---------------------------------------------------------------- proof fingerprints: a rewrite re-proves only what moved
import proof as PR  # noqa: E402


def _fps(sheet: str, theme: str = ''):
    pages = SimpleNamespace(texts=[sheet], theme_text=theme, shell={'css': ''}, frame={'w': 1}, theme={'error': None})
    run = {'plugin': PLUGIN, 'results': {'b': {'html': '<p class="sgs-demo"></p>', 'css': ''},
                                         'c': {'html': '<p class="sgs-demo x"></p>', 'css': ''}}}
    return PR.Fingerprints(run, pages)


ENTRY = {'setting': 'textColour', 'part': 'ROOT', 'props': ['color'], 'state': None, 'tiers': []}


def test_a_fingerprint_moves_with_its_own_property_and_the_custom_properties_it_reads():
    base = '.sgs-demo{color:var(--c)} .x{--c:red} .sgs-demo{margin:0}'
    fp = _fps(base).of(ENTRY, ['color'], [('b', 'c')])
    assert _fps(base.replace('margin:0', 'margin:4px')).of(ENTRY, ['color'], [('b', 'c')]) == fp  # another property
    assert _fps(base.replace('--c:red', '--c:blue')).of(ENTRY, ['color'], [('b', 'c')]) != fp  # a custom property it reads
    assert _fps(base, theme='p{color:green}').of(ENTRY, ['color'], [('b', 'c')]) != fp  # the theme's rule for it


def test_a_shorthand_counts_for_its_longhands():
    entry = {**ENTRY, 'setting': 'borderWidth', 'props': ['border-top-width']}
    fp = _fps('.a{border:1px solid}').of(entry, ['border-top-width'], [('b', 'c')])
    assert _fps('.a{border:2px solid}').of(entry, ['border-top-width'], [('b', 'c')]) != fp


def test_the_writer_keeps_each_outcome_beside_its_key_and_reads_it_back():
    k = ('textColour', 'ROOT', ('color',), None, ())
    cache = {PR.cache_key({'setting': 'textColour', 'part': 'ROOT', 'props': ['color'], 'state': None, 'tiers': []}):
             {'fp': 'abc', 'v': 'proved', 'kind': 'value'}}
    lst = CK.cache_list([k], cache)
    assert lst == [{'fp': 'abc', 'v': 'proved', 'kind': 'value'}]
    keys = [list(k[:2]) + [list(k[2]), k[3], list(k[4])]]
    reuse = dict(zip((json.dumps(x) for x in keys), lst))
    assert reuse[PR.cache_key({'setting': 'textColour', 'part': 'ROOT', 'props': ('color',), 'state': None, 'tiers': ()})]['v'] == 'proved'



# ---------------------------------------------------------------- second review (2026-11-22)
def test_a_block_failing_its_coverage_floor_is_never_restamped(monkeypatch, tmp_path):
    rec = tmp_path / 'demo.json'
    doc = {'block': 'sgs/demo', 'schemaVersion': 2, 'parts': [], 'entries': [], 'proofKeys': [],
           'stamp': {'version': 2, 'inputs': {}, 'outputs': 'old', 'theme': 'old'}}
    assert CK.schema_errors(doc, need_kind=True) == []  # so only the floor can fail it
    rec.write_text(json.dumps(doc), encoding='utf-8')
    run = {'entries': {}, 'unnamed': [], 'defaultHtml': '', 'results': {}, 'sheetFiles': [], 'renderer': SimpleNamespace(included=set()),
           'plan': {'fixture': {}},
           'stats': {'block': 'sgs/demo', 'coverage': {'rootPrinted': False, 'defaultEmpty': True, 'defaultRendered': True},
                     'renderFailedOnly': [], 'testedNoPaint': [], 'replacesBlock': [], 'unvalued': []}}
    monkeypatch.setattr(CK, 'run_block', lambda *a, **k: run)
    monkeypatch.setattr(CK, 'parts_check', lambda *a: {'order': [], 'declaredNotPrinted': [], 'declaredScriptBuilt': [], 'printedNotDeclared': []})
    monkeypatch.setattr(PR, 'prove', lambda short, run: ({}, {'blind': [], 'removed': [], 'cache': {}}))
    monkeypatch.setattr(CK, 'apply_browser_verdicts', lambda *a: None)
    args = SimpleNamespace(fixtures=tmp_path / 'none.json', instances=None, instances_dir=None, plugin=PLUGIN, no_proof=False, restamp=True,
                           record=rec, record_dir=None, write=None, write_dir=None, out=tmp_path / 'r', strict_parts=False, fresh=False)
    assert CK.check_block(args, 'demo') == 1
    assert json.loads(rec.read_text(encoding='utf-8'))['stamp']['outputs'] == 'old'


def test_the_check_hash_covers_the_scanner_modules_the_check_imports(tmp_path):
    plugin = tmp_path / 'plugin'
    scan = plugin / 'scripts' / 'block-source-scan'
    scan.mkdir(parents=True)
    (scan / 'reference.py').write_text('WIDTHS = (375,)', encoding='utf-8')
    before = ST.check_hash(plugin)
    (scan / 'reference.py').write_text('WIDTHS = (375, 768)', encoding='utf-8')
    assert ST.check_hash(plugin) != before


def test_a_class_that_only_shares_the_block_prefix_is_not_the_blocks_own_part():
    assert AC.part_role('sgs/form', 'sgs-form-review__term') == 'shared:sgs-form-review__term'
    assert AC.part_role('sgs/form', 'sgs-form__step') == 'own:step'
    assert AC.part_role('sgs/form', 'sgs-form--compact') == 'own:sgs-form--compact'


def test_browser_verdicts_measured_on_older_code_are_reported(monkeypatch, tmp_path):
    folder = tmp_path / 'verdicts'
    folder.mkdir()
    (folder / 'cart.json').write_text(json.dumps({'block': 'sgs/cart', 'scriptHash': 'measured-on-old-code'}), encoding='utf-8')
    monkeypatch.setattr(CK, 'BROWSER_VERDICTS', folder)
    stale = CH.stale_verdicts(PLUGIN, {'sgs/cart': {}})
    assert [b for b, _ in stale] == ['sgs/cart'] and 'browser pass' in stale[0][1]
    (folder / 'cart.json').write_text(json.dumps({'block': 'sgs/cart', 'scriptHash': CK.script_hash(PLUGIN, 'cart')}), encoding='utf-8')
    assert CH.stale_verdicts(PLUGIN, {'sgs/cart': {}}) == []


def test_a_script_that_starts_naming_the_part_moves_its_fingerprint():
    fps = _fps('.sgs-demo__track{color:red}')
    entry = {**ENTRY, 'part': 'sgs-demo__track'}
    fps.corpus = [('src/blocks/demo/view.js', 'el.className = "sgs-demo__bar";')]
    fp = fps.of(entry, ['color'], [('b', 'c')])
    fps.corpus, fps.mentions = [('src/blocks/demo/view.js', 'el.className = "sgs-demo__track";')], {}
    assert fps.of(entry, ['color'], [('b', 'c')]) != fp



def test_a_browser_verdict_depends_on_the_front_end_only(tmp_path):
    plugin = tmp_path / 'wp' / 'plugins' / 'sgs-blocks'
    blk = plugin / 'src' / 'blocks' / 'demo'
    blk.mkdir(parents=True)
    (blk / 'block.json').write_text('{"name": "sgs/demo"}', encoding='utf-8')
    (blk / 'view.js').write_text('document.body.dataset.x = 1;', encoding='utf-8')
    (blk / 'edit.js').write_text("import { useBlockProps } from '@wordpress/block-editor';", encoding='utf-8')
    before = CK.script_hash(plugin, 'demo')
    (blk / 'edit.js').write_text("import { useBlockProps } from '@wordpress/block-editor'; // changed", encoding='utf-8')
    assert CK.script_hash(plugin, 'demo') == before  # an editor change: the browser measured nothing of it
    (blk / 'view.js').write_text('document.body.dataset.x = 2;', encoding='utf-8')
    assert CK.script_hash(plugin, 'demo') != before
