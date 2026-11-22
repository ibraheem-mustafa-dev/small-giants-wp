"""check.py::apply_browser_verdicts: the browser pass's verdicts reach the record only for the code they were measured on."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import check  # noqa: E402


def plugin_with_block(root: Path) -> Path:
    (root / 'src' / 'blocks' / 'demo').mkdir(parents=True)
    (root / 'src' / 'shared').mkdir(parents=True)
    (root / 'src' / 'blocks' / 'demo' / 'view.js').write_text('build()', encoding='utf-8')
    return root


def entry(setting, part, unproved='script-built-part', kind='switched-on'):
    return {'setting': setting, 'part': part, 'props': ['color'], 'state': None, 'tiers': [], 'kind': kind, 'unproved': unproved}


def write_verdicts(folder: Path, plugin: Path, rows):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'demo.json').write_text(json.dumps({'block': 'sgs/demo', 'scriptHash': check.script_hash(plugin, 'demo'), 'entries': rows}), encoding='utf-8')


def verdict(e, v, **more):
    return {**{k: e[k] for k in ('setting', 'part', 'props', 'state', 'tiers')}, 'verdict': v, **more}


def test_must_fail_verdicts_settle_their_entries(tmp_path):
    # Breaks if the verdicts were not applied: the entries would keep their unproved cause.
    plugin = plugin_with_block(tmp_path / 'p')
    a, b, c = entry('a', 'sgs-demo__x'), entry('b', 'sgs-demo__x'), entry('c', 'sgs-demo__x')
    entries = {check.key(e): e for e in (a, b, c)}
    write_verdicts(tmp_path / 'v', plugin, [verdict(a, 'proved', kind='value'), verdict(b, 'removed', values={}),
                                            verdict(c, 'refiled', kind='value', refiled_to=['sgs-demo__y'])])
    rep = check.apply_browser_verdicts('demo', plugin, entries, tmp_path / 'v')
    assert rep['proved'] == 1 and len(rep['removed']) == 1 and len(rep['refiled']) == 1
    assert entries[check.key(a)]['kind'] == 'value' and 'unproved' not in entries[check.key(a)]
    assert check.key(b) not in entries and check.key(c) not in entries
    moved = entries[('c', 'sgs-demo__y', ('color',), None, ())]
    assert moved['kind'] == 'value' and 'unproved' not in moved


def test_must_fail_stale_verdicts_apply_to_nothing(tmp_path):
    # Breaks if a verdict measured on older code were applied: the block's script changed since.
    plugin = plugin_with_block(tmp_path / 'p')
    a = entry('a', 'sgs-demo__x')
    entries = {check.key(a): a}
    write_verdicts(tmp_path / 'v', plugin, [verdict(a, 'proved', kind='value')])
    (plugin / 'src' / 'blocks' / 'demo' / 'view.js').write_text('build(differently)', encoding='utf-8')
    rep = check.apply_browser_verdicts('demo', plugin, entries, tmp_path / 'v')
    assert rep['stale'] and entries[check.key(a)]['unproved'] == 'script-built-part'


def test_an_entry_the_offline_proof_settled_is_left_alone(tmp_path):
    plugin = plugin_with_block(tmp_path / 'p')
    a = entry('a', 'sgs-demo__x', unproved=None, kind='value')
    a.pop('unproved')
    entries = {check.key(a): a}
    write_verdicts(tmp_path / 'v', plugin, [verdict(a, 'removed', values={})])
    rep = check.apply_browser_verdicts('demo', plugin, entries, tmp_path / 'v')
    assert check.key(a) in entries and len(rep['unmatched']) == 1
