"""The render cache's code hash: per block, so another block's files do not throw a block's renders away."""
import json
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import render as RN  # noqa: E402


def make_plugin(root: Path) -> Path:
    for rel, text in {
        'src/blocks/button/block.json': '{"name": "sgs/button"}', 'src/blocks/button/render.php': '<?php echo 1;',
        'src/blocks/button/style.css': '.sgs-button{}', 'src/blocks/cart/block.json': '{"name": "sgs/cart"}',
        'src/blocks/cart/style.css': '.sgs-cart{}', 'src/blocks/cart/render.php': '<?php echo 2;', 'includes/helpers.php': '<?php',
    }.items():
        f = root / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding='utf-8')
    return root


def test_must_fail_another_blocks_files_leave_the_hash_alone(tmp_path):
    # Breaks if the hash covered every block's folder: one stylesheet edit anywhere would re-render every block.
    plugin = make_plugin(tmp_path)
    before = RN.code_hash(plugin, (), {'button'})
    (plugin / 'src/blocks/cart/style.css').write_text('.sgs-cart{color:red}', encoding='utf-8')
    (plugin / 'src/blocks/cart/render.php').write_text('<?php echo 3;', encoding='utf-8')
    assert RN.code_hash(plugin, (), {'button'}) == before


def test_own_files_and_shared_php_change_the_hash(tmp_path):
    plugin = make_plugin(tmp_path)
    for rel, text in (('src/blocks/button/render.php', '<?php echo 3;'), ('src/blocks/button/block.json', '{"name": "sgs/button", "x": 1}'), ('includes/helpers.php', '<?php //')):
        before = RN.code_hash(plugin, (), {'button'})
        (plugin / rel).write_text(text, encoding='utf-8')
        assert RN.code_hash(plugin, (), {'button'}) != before, rel


def test_must_fail_another_blocks_block_json_leaves_the_hash_alone(tmp_path):
    """MUST FAIL with SGS_RENDER_MUTATE=every-block-json: one block's block.json edit no longer re-renders every block (the
    hash once covered every block's block.json, so an edit to one made every render of every block cold)."""
    plugin = make_plugin(tmp_path)
    before = RN.code_hash(plugin, (), {'button'})
    (plugin / 'src/blocks/cart/block.json').write_text('{"name": "sgs/cart", "attributes": {"x": {"default": 1}}}', encoding='utf-8')
    assert RN.code_hash(plugin, (), {'button'}) == before


def test_a_block_rendered_inside_changes_the_hash_and_so_do_new_or_gone_blocks(tmp_path):
    """The blocks a fixture renders with the block (its inner blocks, parents and paint states: Renderer's `related`) are
    covered whole; which block folders exist and which hold a render.php are covered for every block."""
    plugin = make_plugin(tmp_path)
    before = RN.code_hash(plugin, (), {'button', 'cart'})
    (plugin / 'src/blocks/cart/block.json').write_text('{"name": "sgs/cart", "x": 1}', encoding='utf-8')
    assert RN.code_hash(plugin, (), {'button', 'cart'}) != before
    for change in (lambda: (plugin / 'src/blocks/new/block.json').parent.mkdir(), lambda: (plugin / 'src/blocks/cart/render.php').unlink()):
        before = RN.code_hash(plugin, (), {'button'})
        change()
        assert RN.code_hash(plugin, (), {'button'}) != before


def fake_runner(monkeypatch, reads, calls, seen=None):
    """subprocess.run standing in for the PHP runner: it reports `reads` as the files the render read, each with the md5 it
    took at shutdown (included-files.php): the file's content then, or `seen[file]` when given (an edit made after the read)."""
    import hashlib
    import subprocess

    def run(cmd, **k):
        calls.append(cmd)
        Path(k['env']['SGS_SETTING_RECORD_INCLUDED']).write_text(json.dumps([]), encoding='utf-8')
        taken = {str(r): (seen or {}).get(r) or hashlib.md5(Path(r).read_bytes()).hexdigest() for r in reads}
        Path(k['env']['SGS_SETTING_RECORD_READS']).write_text(json.dumps(taken), encoding='utf-8')
        return SimpleNamespace(stdout=json.dumps({'ok': True, 'html': f'<p>{len(calls)}</p>'}), stderr='')
    monkeypatch.setattr(subprocess, 'run', run)


def test_must_fail_a_render_that_read_another_blocks_block_json_is_rendered_again_when_it_changes(tmp_path, monkeypatch):
    """MUST FAIL with SGS_RENDER_MUTATE=outside-check: a render whose PHP looked up another block type (the registry reads its
    block.json) keeps that file's content hash, and the cached render is used only while it is unchanged. NEGATIVE CONTROL:
    a block.json the render never read changes nothing."""
    plugin = make_plugin(tmp_path / 'p')
    (plugin / 'src/blocks/label/block.json').parent.mkdir(parents=True)
    (plugin / 'src/blocks/label/block.json').write_text('{"name": "sgs/label"}', encoding='utf-8')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path / 'cache')
    calls = []
    fake_runner(monkeypatch, [plugin / 'src/blocks/cart/block.json', plugin / 'src/blocks/button/block.json'], calls)
    rn = RN.Renderer(plugin, {}, plugin, 'button')
    first = rn.render('sgs/button', {'a': 1})
    assert first['outside'] == {'src/blocks/cart/block.json': RN.file_md5(plugin / 'src/blocks/cart/block.json')}, 'its own block.json is in the hash, not in outside'
    assert rn.render('sgs/button', {'a': 1})['html'] == first['html'] and len(calls) == 1, 'unchanged: the cached render'
    (plugin / 'src/blocks/label/block.json').write_text('{"name": "sgs/label", "x": 2}', encoding='utf-8')
    assert RN.Renderer(plugin, {}, plugin, 'button').render('sgs/button', {'a': 1})['html'] == first['html'] and len(calls) == 1
    (plugin / 'src/blocks/cart/block.json').write_text('{"name": "sgs/cart", "x": 2}', encoding='utf-8')
    again = RN.Renderer(plugin, {}, plugin, 'button').render('sgs/button', {'a': 1})
    assert len(calls) == 2 and again['html'] != first['html'], 'the block.json it read changed: rendered again'


def test_a_cached_render_with_no_outside_list_is_rendered_again(tmp_path, monkeypatch):
    plugin = make_plugin(tmp_path / 'p')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path / 'cache')
    calls = []
    fake_runner(monkeypatch, [], calls)
    rn = RN.Renderer(plugin, {}, plugin, 'button')
    rn.render('sgs/button', {'a': 1})
    cf = next(f for f in rn.cache.glob('*.json') if f.name.count('.') == 1)
    res = json.loads(cf.read_text(encoding='utf-8'))
    del res['outside']
    cf.write_text(json.dumps(res), encoding='utf-8')
    rn.render('sgs/button', {'a': 1})
    assert len(calls) == 2


def test_outside_block_names_only_files_of_blocks_the_hash_leaves_out():
    assert RN.outside_block('src/blocks/cart/block.json', {'button'})
    assert not RN.outside_block('src/blocks/button/render.php', {'button'})
    assert not RN.outside_block('src/blocks/extensions/x.php', {'button'})
    assert not RN.outside_block('includes/helpers.php', {'button'})
    assert not RN.outside_block('src/blocks/cart/block.json', None)


def test_must_fail_the_blocks_a_fixture_renders_inside_are_in_its_renderers_hash(tmp_path):
    """MUST FAIL with SGS_RENDER_MUTATE=own-folder-only: a block its fixture renders as an inner block (or a parent or a
    paint state's block) is in the renderer's hash, so its block.json edit re-keys the outer block's renders."""
    plugin = make_plugin(tmp_path)
    fixture = {'inner': [{'name': 'sgs/cart', 'attributes': {}}]}
    rn = RN.Renderer(plugin, fixture, plugin, 'button')
    assert rn.related == {'button', 'cart'}
    (plugin / 'src/blocks/cart/block.json').write_text('{"name": "sgs/cart", "x": 1}', encoding='utf-8')
    assert RN.Renderer(plugin, fixture, plugin, 'button').hash != rn.hash
    assert RN.Renderer(plugin, {}, plugin, 'button').hash == RN.Renderer(plugin, {}, plugin, 'button').hash


def nested_plugin(root: Path) -> Path:
    """A checkout's layout: the plugin at plugins/sgs-blocks with the theme beside it at theme/sgs-theme."""
    plugin = make_plugin(root / 'plugins' / 'sgs-blocks')
    (root / 'theme' / 'sgs-theme').mkdir(parents=True)
    (root / 'theme' / 'sgs-theme' / 'theme.json').write_text('{"styles": {}}', encoding='utf-8')
    return plugin


def test_must_fail_the_themes_theme_json_is_in_the_hash(tmp_path):
    """MUST FAIL with SGS_RENDER_MUTATE=theme-json: the runner's wp_get_global_styles reads the theme's theme.json styles when
    a fixture gives no globalSettings (includes/class-heading-look.php prints from them), so an edit to it re-keys renders."""
    plugin = nested_plugin(tmp_path)
    before = RN.code_hash(plugin, (), {'button'})
    (tmp_path / 'theme' / 'sgs-theme' / 'theme.json').write_text('{"styles": {"elements": {"h1": {"color": {"text": "red"}}}}}', encoding='utf-8')
    assert RN.code_hash(plugin, (), {'button'}) != before


def test_must_fail_a_render_block_filter_anywhere_is_in_the_hash(tmp_path):
    """MUST FAIL with SGS_RENDER_MUTATE=filter-scan: the runner loads every PHP file under includes/ and src/ that registers a
    render_block filter, so a file in a block folder the key leaves out that gains (or changes) one re-keys every render.
    NEGATIVE CONTROL: the same folder's PHP without a filter stays out (test_must_fail_another_blocks_files_leave_the_hash_alone)."""
    plugin = make_plugin(tmp_path)
    before = RN.code_hash(plugin, (), {'button'})
    (plugin / 'src/blocks/cart/filters.php').write_text("<?php add_filter( 'render_block_sgs/button', 'f' );", encoding='utf-8')
    with_filter = RN.code_hash(plugin, (), {'button'})
    assert with_filter != before
    (plugin / 'src/blocks/cart/filters.php').write_text("<?php add_filter( 'render_block_sgs/button', 'g' );", encoding='utf-8')
    assert RN.code_hash(plugin, (), {'button'}) != with_filter
    assert [f.name for f in RN.render_block_filter_files(plugin)] == ['filters.php']


def test_must_fail_the_hash_kept_is_the_one_php_took_before_it_exited(tmp_path, monkeypatch):
    """MUST FAIL with SGS_RENDER_MUTATE=php-md5: a file edited between the render reading it and the renderer storing the
    render keeps the hash of what the render read (included-files.php takes it at shutdown), so the next use renders again;
    hashing after PHP exits would file the old output under the new content."""
    plugin = make_plugin(tmp_path / 'p')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path / 'cache')
    calls = []
    cart = plugin / 'src/blocks/cart/block.json'
    fake_runner(monkeypatch, [cart], calls, seen={cart: 'what-the-render-read'})
    rn = RN.Renderer(plugin, {}, plugin, 'button')
    assert rn.render('sgs/button', {'a': 1})['outside'] == {'src/blocks/cart/block.json': 'what-the-render-read'}
    rn.render('sgs/button', {'a': 1})
    assert len(calls) == 2, 'the file no longer holds what the render read: rendered again'
