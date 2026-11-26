"""The shared look store (site_look.py::write_block, look_store) and the completeness of the look key: a look one checkout
built is reused by another only when everything the look is built from is the same. No test here builds a real look.

    python -m pytest plugins/sgs-blocks/scripts/site-look/tests/test_look_store.py
"""
import json
import sys
import threading
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
LOOK = HERE.parent
sys.path.insert(0, str(LOOK))
import site_look as SL  # noqa: E402

SNAP = SL.REPO / 'sites' / 'mamas-munches-redesign' / 'theme-snapshot.json'


def doc_for(short: str, **extra) -> dict:
    return {'block': f'sgs/{short}', 'format': SL.FORMAT, 'elements': {'': {'375': {'color': 'red'}}}, **extra}


def look_text(short: str, key: str, **extra) -> str:
    return json.dumps(doc_for(short, key=key, **extra))


class Fake:
    """Stands in for look_key and build_block: counts builds, so a store hit is seen to skip one."""

    def __init__(self, monkeypatch, key='k1'):
        self.key, self.builds, self.body = key, 0, {}
        monkeypatch.setattr(SL, 'look_key', lambda short, snap, wc: self.key)
        monkeypatch.setattr(SL, 'build_block', self.build)

    def build(self, short, snap, wc):
        self.builds += 1
        return doc_for(short, **self.body)


def run(out: Path, short='icon', site='t'):
    return SL.write_block((short, SNAP, False, str(out / site), site))


@pytest.fixture
def store(tmp_path, monkeypatch):
    d = tmp_path / 'store'
    monkeypatch.setenv('SGS_LOOK_STORE', str(d))
    return d


def test_a_hit_skips_the_build_and_fills_the_out_file(tmp_path, monkeypatch, store):
    fake = Fake(monkeypatch)
    assert run(tmp_path / 'a') == ('icon', 'built')
    assert (store / 't' / 'icon.k1.json').is_file()
    assert run(tmp_path / 'b') == ('icon', 'current (store)')
    assert fake.builds == 1
    first = json.loads((tmp_path / 'a' / 't' / 'icon.json').read_text(encoding='utf-8'))
    second = json.loads((tmp_path / 'b' / 't' / 'icon.json').read_text(encoding='utf-8'))
    assert first == second and second['key'] == 'k1'
    assert run(tmp_path / 'b') == ('icon', 'current')  # now the checkout's own file answers


def test_a_different_key_misses(tmp_path, monkeypatch, store):
    fake = Fake(monkeypatch)
    run(tmp_path / 'a')
    fake.key = 'k2'
    assert run(tmp_path / 'b') == ('icon', 'built')
    assert fake.builds == 2
    assert {f.name for f in (store / 't').glob('icon.*.json')} == {'icon.k1.json', 'icon.k2.json'}


def test_a_look_of_another_site_or_block_is_not_a_hit(tmp_path, monkeypatch, store):
    fake = Fake(monkeypatch)
    run(tmp_path / 'a')
    assert run(tmp_path / 'b', site='u') == ('icon', 'built')
    assert run(tmp_path / 'b', short='cart') == ('cart', 'built')
    assert fake.builds == 3


@pytest.mark.parametrize('bad', ['', '{"block": "sgs/icon", "key": "k1", "elem', 'not json', '[]', '{}',
                                 '{"block": "sgs/icon", "key": "other", "elements": {}}',
                                 '{"block": "sgs/cart", "key": "k1", "elements": {}}',
                                 '{"block": "sgs/icon", "key": "k1"}'])
def test_a_corrupt_or_foreign_store_file_is_rebuilt_and_repaired(tmp_path, monkeypatch, store, bad):
    fake = Fake(monkeypatch)
    f = store / 't' / 'icon.k1.json'
    f.parent.mkdir(parents=True)
    f.write_text(bad, encoding='utf-8')
    assert run(tmp_path / 'a') == ('icon', 'built')
    assert fake.builds == 1
    assert json.loads(f.read_text(encoding='utf-8'))['key'] == 'k1'  # the bad file is replaced by the good one
    assert run(tmp_path / 'b') == ('icon', 'current (store)')


def test_the_store_write_goes_through_a_temp_name_and_a_rename(tmp_path, monkeypatch, store):
    Fake(monkeypatch)
    renames = []
    real = SL._os.replace
    monkeypatch.setattr(SL._os, 'replace', lambda a, b: (renames.append((Path(a), Path(b))), real(a, b))[1])
    run(tmp_path / 'a')
    onto = [(a, b) for a, b in renames if b.parent == store / 't']
    assert len(onto) == 1
    a, b = onto[0]
    assert b.name == 'icon.k1.json' and a.name != b.name and a.name.endswith('.tmp') and a.parent == b.parent


def test_a_write_cut_short_leaves_no_store_file(tmp_path, monkeypatch, store):
    Fake(monkeypatch)
    real = Path.write_text

    def cut(self, text, *a, **k):
        if self.name.endswith('.tmp') and self.parent == store / 't':
            real(self, text[:10], *a, **k)
            raise OSError('disk full')
        return real(self, text, *a, **k)

    monkeypatch.setattr(Path, 'write_text', cut)
    assert run(tmp_path / 'a') == ('icon', 'built')  # the build still succeeds; the store only loses its copy
    assert not (store / 't').exists() or not list((store / 't').glob('icon.*'))


def test_two_writers_of_one_key_leave_one_whole_file(tmp_path, store):
    text = look_text('icon', 'k1', pad='x' * 200000)
    errors = []

    def go():
        try:
            for _ in range(20):
                SL.store_look(store, 't', 'icon', 'k1', text)
        except Exception as e:  # noqa: BLE001
            errors.append(e)

    threads = [threading.Thread(target=go) for _ in range(4)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert not errors
    assert SL.read_look(store / 't' / 'icon.k1.json', 'icon', 'k1') == text
    assert [f.name for f in (store / 't').iterdir()] == ['icon.k1.json']


def test_an_empty_store_variable_turns_the_store_off(tmp_path, monkeypatch):
    fake = Fake(monkeypatch)
    monkeypatch.setenv('SGS_LOOK_STORE', '')
    assert SL.look_store() is None
    run(tmp_path / 'a')
    assert run(tmp_path / 'b') == ('icon', 'built')
    assert fake.builds == 2


def test_the_default_store_is_the_shared_folder(monkeypatch):
    monkeypatch.delenv('SGS_LOOK_STORE', raising=False)
    assert SL.look_store() == Path('E:/sgs-tmp/look-store')
    monkeypatch.setenv('SGS_LOOK_STORE', '  ')
    assert SL.look_store() is None


def test_an_unwritable_store_does_not_fail_a_build(tmp_path, monkeypatch):
    fake = Fake(monkeypatch)
    blocker = tmp_path / 'file'
    blocker.write_text('x', encoding='utf-8')
    monkeypatch.setenv('SGS_LOOK_STORE', str(blocker / 'inside'))  # a folder cannot be made under a file
    assert run(tmp_path / 'a') == ('icon', 'built')
    assert fake.builds == 1


def test_a_look_naming_this_checkout_stays_out_of_the_store(tmp_path, monkeypatch, store):
    fake = Fake(monkeypatch)
    fake.body = {'renderErrors': {'k': f'PHP Warning in {SL.REPO}\\plugins\\x.php'}}
    assert run(tmp_path / 'a') == ('icon', 'built')
    assert not list(store.rglob('*.json'))
    fake.body = {'renderErrors': {'k': 'PHP Warning in ' + SL.REPO.as_posix() + '/x.php'}}
    run(tmp_path / 'b')
    assert not list(store.rglob('*.json'))
    fake.body = {'renderErrors': {'k': 'no path here'}}
    run(tmp_path / 'c')
    assert list(store.rglob('*.json'))


def test_an_old_file_of_the_block_is_dropped_when_a_new_one_is_stored(tmp_path, store):
    old = store / 't' / 'icon.old.json'
    old.parent.mkdir(parents=True)
    old.write_text('{}', encoding='utf-8')
    young = store / 't' / 'icon.young.json'
    young.write_text('{}', encoding='utf-8')
    other = store / 't' / 'cart.old.json'
    other.write_text('{}', encoding='utf-8')
    long_ago = old.stat().st_mtime - (SL.STORE_KEEP_DAYS + 1) * 86400
    for f in (old, other):
        SL._os.utime(f, (long_ago, long_ago))
    SL.store_look(store, 't', 'icon', 'k1', look_text('icon', 'k1'))
    assert not old.exists() and young.exists() and other.exists()


# ---------------------------------------------------------------- the key holds everything a look is built from


SENTINELS = {
    'the cascade reader the look ranks rules with': 'plugins/sgs-blocks/scripts/block-source-scan/reference.py',
    'the CSS reader': 'plugins/sgs-blocks/scripts/block-source-scan/css_read.py',
    'the selector evaluator': 'plugins/sgs-blocks/scripts/block-source-scan/selector_eval.py',
    'the framework database reader': 'plugins/sgs-blocks/scripts/lib/framework_db.py',
    'a module loaded by path': 'plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py',
    'the record modules': 'plugins/sgs-blocks/scripts/setting-record/computed.py',
    'the stylesheet rewriter': 'plugins/sgs-blocks/scripts/setting-record/shipped-css.js',
    'the shadow rewriter': 'plugins/sgs-blocks/scripts/shadow-lift/transform.js',
    'the hover rewriter': 'plugins/sgs-blocks/scripts/hover-guard/transform.js',
    'the overlay script': 'theme/sgs-theme/assets/js/sgs-overlay-scroll.js',
    'the route bridge': 'scripts/computed-route/tools/site-look-bridge.mjs',
    'a planner the bridge imports': 'scripts/computed-route/lib/calibrate-instances.mjs',
    'a resolver two imports down': 'scripts/computed-route/lib/resolve.mjs',
    'a parity reader the planners import': 'scripts/parity/lib/ref-trace.mjs',
    'a data file the route reads': 'scripts/computed-route/data/shared-state-elements.json',
    'a data file the route reads beside the plugin': 'plugins/sgs-blocks/scripts/data/gradient-paint-keys.json',
}


@pytest.mark.parametrize('what,rel', sorted(SENTINELS.items()))
def test_the_key_covers(what, rel):
    """Dropping one of these from reach_files() fails here: a store hit would then return a look built from other code."""
    assert (SL.REPO / rel).resolve() in SL.reach_files(), what


@pytest.mark.parametrize('what,rel', sorted(SENTINELS.items()))
def test_a_change_to_it_moves_the_key(what, rel, monkeypatch):
    target = (SL.REPO / rel).resolve()
    real = SL.file_md5
    base = SL.look_key('icon', SNAP, False)
    monkeypatch.setattr(SL, 'file_md5', lambda f: 'changed' if Path(f).resolve() == target else real(f))
    SL.reach_hash.cache_clear()
    try:
        assert SL.look_key('icon', SNAP, False) != base, what
    finally:
        monkeypatch.undo()
        SL.reach_hash.cache_clear()
    assert SL.look_key('icon', SNAP, False) == base


def test_the_framework_database_is_in_the_key(tmp_path, monkeypatch):
    a, b = tmp_path / 'a.db', tmp_path / 'b.db'
    a.write_bytes(b'one')
    b.write_bytes(b'two')
    keys = []
    for f in (a, b):
        monkeypatch.setenv('SGS_FRAMEWORK_DB', str(f))
        SL.reach_hash.cache_clear()
        keys.append(SL.look_key('icon', SNAP, False))
    monkeypatch.undo()
    SL.reach_hash.cache_clear()
    assert keys[0] != keys[1]


def test_look_key_follows_reach_hash(monkeypatch):
    """A mutation that drops reach_hash() from look_key fails here."""
    monkeypatch.setattr(SL, 'reach_hash', lambda: 'one')
    one = SL.look_key('icon', SNAP, False)
    monkeypatch.setattr(SL, 'reach_hash', lambda: 'two')
    assert SL.look_key('icon', SNAP, False) != one


def test_a_sass_source_is_a_stylesheet_input():
    scss = [f for f in SL.sheet_inputs('icon') if f.suffix == '.scss']
    assert scss and all(f.is_file() for f in scss)


def test_every_repo_module_the_builder_loads_is_hashed():
    """Imports the builder runs (and the lazy ones the record check makes) are all in the key, whichever folder they sit in."""
    import importlib
    for name in ('instances', 'object_attr_shape'):
        importlib.import_module(name)
    root = str(SL.REPO).lower()
    loaded = {Path(m.__file__).resolve() for m in list(sys.modules.values())
              if getattr(m, '__file__', None) and str(m.__file__).lower().startswith(root) and m.__file__.endswith('.py')
              and 'tests' not in Path(m.__file__).parts}
    missing = sorted(str(f.relative_to(SL.REPO)) for f in loaded if f not in set(SL.reach_files()) and f != Path(__file__).resolve())
    assert not missing, missing


BS = chr(92)


def test_a_checkout_path_is_recognised_in_every_written_form():
    root = str(SL.REPO)
    assert SL.shareable('{}')
    for form in (root, root.replace(BS, '/'), root.replace(BS, BS * 2), root.lower()):
        assert not SL.shareable(f'x {form} y'), form


def test_two_checkouts_differing_only_in_line_endings_share_a_key(tmp_path):
    a, b = tmp_path / 'a.css', tmp_path / 'b.css'
    a.write_bytes(b'.x {\r\n  color: red;\r\n}\r\n')
    b.write_bytes(b'.x {\n  color: red;\n}\n')
    assert SL.file_md5(a) == SL.file_md5(b)
    assert SL.file_md5(a, text=False) != SL.file_md5(b, text=False)
    b.write_bytes(b'.x {\n  color: blue;\n}\n')
    assert SL.file_md5(a) != SL.file_md5(b)


def fresh(monkeypatch):
    SL.reach_hash.cache_clear()
    SL.tool_versions.cache_clear()
    SL.db_md5.cache_clear()
    return SL.look_key('icon', SNAP, False)


def test_a_reseed_still_in_the_write_ahead_log_moves_the_key(tmp_path, monkeypatch):
    db = tmp_path / 'f.db'
    db.write_bytes(b'db')
    monkeypatch.setenv('SGS_FRAMEWORK_DB', str(db))
    try:
        base = fresh(monkeypatch)
        (tmp_path / 'f.db-wal').write_bytes(b'')
        assert fresh(monkeypatch) == base, 'an empty log is no change'
        (tmp_path / 'f.db-wal').write_bytes(b'reseed')
        with_wal = fresh(monkeypatch)
        assert with_wal != base
        (tmp_path / 'f.db-wal').write_bytes(b'reseed two')
        assert fresh(monkeypatch) != with_wal
    finally:
        monkeypatch.undo()
        fresh(monkeypatch)


@pytest.mark.parametrize('tool', ['php', 'node', 'sass'])
def test_a_tool_version_moves_the_key_and_a_missing_tool_is_absent(tool, monkeypatch):
    real = SL.tool_out
    first = {'php': ['php', '-v'], 'node': ['node', '-v']}

    def fake(cmd):
        hit = cmd == first.get(tool) or (tool == 'sass' and cmd[-1] == '--version')
        return 'other version' if hit else real(cmd)

    monkeypatch.setenv('SGS_SASS', 'fake-sass')  # a resolvable compiler even where none is installed
    try:
        base = fresh(monkeypatch)
        monkeypatch.setattr(SL, 'tool_out', fake)
        changed = fresh(monkeypatch)
        assert changed != base
        monkeypatch.setattr(SL, 'tool_out', lambda cmd: 'absent' if (cmd == first.get(tool) or (tool == 'sass' and cmd[-1] == '--version')) else real(cmd))
        assert fresh(monkeypatch) != changed  # a tool that went missing is a change of its own
    finally:
        monkeypatch.undo()
        fresh(monkeypatch)


def test_tool_out_says_absent_for_a_tool_that_is_not_there():
    assert SL.tool_out(['no-such-tool-sgs', '-v']) == 'absent'


def test_the_sass_override_is_in_the_key(monkeypatch):
    try:
        base = fresh(monkeypatch)
        monkeypatch.setenv('SGS_SASS', 'no-such-sass-sgs')
        assert fresh(monkeypatch) != base
    finally:
        monkeypatch.undo()
        fresh(monkeypatch)
