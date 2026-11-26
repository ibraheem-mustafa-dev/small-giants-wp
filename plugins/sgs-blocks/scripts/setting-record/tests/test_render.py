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


def fake_runner(monkeypatch, reads, calls):
    """subprocess.run standing in for the PHP runner: it reports `reads` as the files the render read."""
    import subprocess

    def run(cmd, **k):
        calls.append(cmd)
        Path(k['env']['SGS_SETTING_RECORD_INCLUDED']).write_text(json.dumps([]), encoding='utf-8')
        Path(k['env']['SGS_SETTING_RECORD_READS']).write_text(json.dumps([str(r) for r in reads]), encoding='utf-8')
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
