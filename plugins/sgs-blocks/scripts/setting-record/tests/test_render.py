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


def fake_runner(monkeypatch, reads, calls, seen=None, loads=True, html=None):
    """subprocess.run standing in for the PHP runner: it reports `reads` as the files the render read, each with the md5 it
    took at shutdown (included-files.php): the file's content then, or `seen[file]` when given (an edit made after the read)."""
    import hashlib
    import subprocess

    def run(cmd, **k):
        calls.append(cmd)
        # a render always loads its own render.php (an empty list is never cached)
        Path(k['env']['SGS_SETTING_RECORD_INCLUDED']).write_text(json.dumps([str(Path(k['cwd']) / 'src/blocks/button/render.php')] if loads else []), encoding='utf-8')
        taken = {str(r): (seen or {}).get(r) or hashlib.md5(Path(r).read_bytes()).hexdigest() for r in reads}
        Path(k['env']['SGS_SETTING_RECORD_READS']).write_text(json.dumps(taken), encoding='utf-8')
        return SimpleNamespace(stdout=json.dumps({'ok': True, 'html': html or f'<p>{len(calls)}</p>'}), stderr='')
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


def test_must_fail_an_edit_to_the_offline_steps_reaches_every_cached_render(tmp_path, monkeypatch):
    """MUST FAIL with SGS_RENDER_MUTATE=processed-html: the cache holds the html PHP printed, and the directives and post steps
    (render.py is in no key) run on every use, so an edit to either reaches a cached render; the cached copy is PHP's own."""
    plugin = make_plugin(tmp_path / 'p')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path / 'cache')
    calls = []
    fake_runner(monkeypatch, [], calls, html='<p>php</p>')
    monkeypatch.setattr(RN, 'apply_directives', lambda html, state: html + '<i>v1</i>')
    rn = RN.Renderer(plugin, {}, plugin, 'button')
    assert rn.render('sgs/button', {'a': 1})['html'] == '<p>php</p><i>v1</i>'
    cached = next(f for f in rn.cache.glob('*.json') if f.name.count('.') == 1)
    assert json.loads(cached.read_text(encoding='utf-8'))['html'] == '<p>php</p>', 'the cache keeps what PHP printed'
    monkeypatch.setattr(RN, 'apply_directives', lambda html, state: html + '<i>v2</i>')
    assert rn.render('sgs/button', {'a': 1})['html'] == '<p>php</p><i>v2</i>' and len(calls) == 1, 'cached, and processed again'


def test_must_fail_a_render_that_names_no_file_it_loaded_is_not_cached(tmp_path, monkeypatch):
    """MUST FAIL with SGS_RENDER_MUTATE=cache-empty-included: a render always loads its own render.php, so an empty list
    means the plugin's path did not match PHP's (a substituted drive): `outside` and the stylesheet-reader guard saw
    nothing, and the render is not cached. NEGATIVE CONTROL: one that names its render.php is cached."""
    plugin = make_plugin(tmp_path / 'p')
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path / 'cache')
    calls = []
    fake_runner(monkeypatch, [], calls, loads=False)
    rn = RN.Renderer(plugin, {}, plugin, 'button')
    rn.render('sgs/button', {'a': 1})
    rn.render('sgs/button', {'a': 1})
    assert len(calls) == 2
    fake_runner(monkeypatch, [], calls)
    rn.render('sgs/button', {'b': 1})
    rn.render('sgs/button', {'b': 1})
    assert len(calls) == 3


def run_hook(tmp_path, php, mutate=''):
    """What included-files.php writes to SGS_SETTING_RECORD_READS after `php` runs with the runner's registry stand-in loaded
    (SGS_RENDER_MUTATE from the environment reaches it, so the hook's switches fail these tests)."""
    import os
    import subprocess
    reads = tmp_path / 'reads.json'
    stubs = (RN.DEFAULT_PLUGIN / 'scripts' / 'qa' / 'lib' / 'motion-targets-stubs.php').as_posix()
    env = {**os.environ, 'SGS_SETTING_RECORD_READS': str(reads)}
    env.pop('SGS_SETTING_RECORD_INCLUDED', None)
    script = tmp_path / 'run.php'  # a script file: PHP applies auto_prepend_file to a file it runs, never to -r code
    script.write_text(f"<?php require '{stubs}'; {php}", encoding='utf-8')
    p = subprocess.run(['php', '-d', f'auto_prepend_file={RN.INCLUDED_HOOK}', str(script)], capture_output=True, text=True, env=env)
    assert p.returncode == 0, p.stdout + p.stderr
    return {RN.included_paths([k], RN.DEFAULT_PLUGIN)[0]: v for k, v in json.loads(reads.read_text(encoding='utf-8')).items()}


LOOKUP = "$r = WP_Block_Type_Registry::get_instance(); $r->get_registered('sgs/button'); $r->get_registered('sgs/no-such-block'); "


def test_must_fail_a_block_json_is_hashed_as_the_render_read_it(tmp_path):
    """MUST FAIL with SGS_RENDER_MUTATE=read-md5: the registry stand-in keeps the md5 of the bytes it read, and the hook
    writes that, not the file's md5 at shutdown (an edit during the render would pass for what it read). Here the read
    hash is set apart from the file's to stand in for that edit."""
    import hashlib
    button = RN.DEFAULT_PLUGIN / 'src/blocks/button/block.json'
    plain = run_hook(tmp_path, LOOKUP)
    assert plain['src/blocks/button/block.json'] == hashlib.md5(button.read_bytes()).hexdigest()
    edited = run_hook(tmp_path, LOOKUP + "foreach (array_keys($GLOBALS['sgs_qa_read_md5']) as $f) { $GLOBALS['sgs_qa_read_md5'][$f] = 'as-read'; }")
    assert edited['src/blocks/button/block.json'] == 'as-read'


def test_must_fail_a_block_json_looked_for_and_missing_is_tracked(tmp_path):
    """MUST FAIL with SGS_RENDER_MUTATE=missing-read: a block type looked up whose block.json does not exist is recorded as
    'missing', so adding that block later renders again (outside_block names it; file_md5 reads 'missing' until it exists)."""
    got = run_hook(tmp_path, LOOKUP)
    assert got.get('src/blocks/no-such-block/block.json') == 'missing'
    assert RN.outside_block('src/blocks/no-such-block/block.json', {'button'})
    assert RN.file_md5(RN.DEFAULT_PLUGIN / 'src/blocks/no-such-block/block.json') == 'missing'


def test_a_block_json_missing_when_read_stays_missing_if_made_before_exit(tmp_path):
    """A block type looked up while its block.json does not exist is recorded as 'missing' at the lookup, so a file made
    before PHP exits (an edit during the render) does not pass for what the render saw (it rendered with no type)."""
    made = RN.DEFAULT_PLUGIN / 'src/blocks/zz-made-during-render'
    target = (made / 'block.json').as_posix()
    try:
        got = run_hook(tmp_path, "$r = WP_Block_Type_Registry::get_instance(); $r->get_registered('sgs/zz-made-during-render'); "
                                 f"@mkdir('{made.as_posix()}'); file_put_contents('{target}', '{{}}'); ")
        assert got.get('src/blocks/zz-made-during-render/block.json') == 'missing'
    finally:
        (made / 'block.json').unlink(missing_ok=True)
        if made.exists():
            made.rmdir()
