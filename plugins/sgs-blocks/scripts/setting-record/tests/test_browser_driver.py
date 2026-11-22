"""browser/prove_script_parts.py and browser/apply_verdicts.py: the pieces that decide which page a block gets and how a verdict reaches a record."""
import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent / 'browser'))
import apply_verdicts as AV  # noqa: E402
import check  # noqa: E402
import prove_script_parts as PS  # noqa: E402


def test_a_block_the_driver_has_no_page_for_raises():
    # never falls through to another block's markup
    with pytest.raises(SystemExit, match='no page can be built'):
        PS.markup('accordion', {})


def test_every_listed_block_builds_a_page_from_its_fixture():
    PS.GIFT_CART_PAGE['content'] = '<!-- wp:woocommerce/cart --><!-- wp:sgs/gift-order {"basketHelp":"x"} /--><!-- /wp:woocommerce/cart -->'
    for b in PS.BLOCKS:
        m = PS.markup(b, {})
        assert f'wp:sgs/{b} ' in m, b
    assert PS.markup('gift-order', {'fieldBorderColour': '#13579b'}).count('wp:sgs/gift-order') == 1
    PS.GIFT_CART_PAGE.clear()
    with pytest.raises(SystemExit):
        PS.markup('gift-order', {})


def test_the_menu_block_sits_inside_its_fixtures_parents():
    m = PS.markup('nav-bar-menu', {})
    assert m.index('wp:sgs/header') < m.index('wp:sgs/nav-bar-menu') if 'wp:sgs/header' in m else 'wp:sgs/nav-bar-menu' in m


def test_a_partner_is_added_to_both_pages_unless_the_pair_sets_it():
    default = {'variant': 'classic-card', 'x': 1}
    out = PS.with_switches('testimonial', dict(default), default, 'workFit')
    assert out['variant'] == 'case-study-media'
    own = PS.with_switches('testimonial', {**default, 'variant': 'minimal-quote'}, default, 'workFit')
    assert own['variant'] == 'minimal-quote'
    assert PS.with_switches('testimonial', dict(default), default, 'other')['variant'] == 'classic-card'


def test_the_parent_partner_reaches_the_first_parent_only():
    m = PS.markup('nav-drawer-menu', {'@parent': {'submenuModel': 'drill-down'}})
    assert '"submenuModel":"drill-down"' in m
    assert '@parent' not in m


def test_a_part_only_the_changed_page_draws_differs_from_its_absence():
    absent = {'n': 0, 'shown': False, 'els': []}
    drawn = {'n': 1, 'shown': True, 'els': [{'clip': 'rect(0px, 0px, 0px, 0px)'}]}
    assert PS.compare_probe(absent, drawn)[0] is True
    assert PS.compare_probe(absent, absent)[0] is False
    assert PS.compare_probe(drawn, drawn)[0] is False
    assert PS.carries(None, ['x']) is False


def test_two_blocks_sharing_a_setting_name_are_judged_apart():
    mine = {'setting': 'sgsFocusRests', 'block': 'sgs/media'}
    a = PS.Pair('media', 'sgsFocusRests', 'k', 'progress', {}, {}, [mine], True)
    assert PS.of(a, mine)
    assert not PS.of(a, {'setting': 'sgsFocusRests', 'block': 'sgs/post-grid'})
    assert not PS.of(a, {'setting': 'sgsFocusRests', 'block': 'sgs/media', 'part': 'another entry of the setting'})


def test_an_accepted_entry_is_not_measured(tmp_path):
    rec = {'block': 'sgs/demo', 'entries': [
        {'setting': 'a', 'part': 'p', 'props': ['color'], 'state': None, 'tiers': [], 'unproved': 'script-built-part'},
        {'setting': 'b', 'part': 'p', 'props': ['color'], 'state': None, 'tiers': [], 'unproved': 'script-built-part', 'accepted': 'proved on sgs/form'}]}
    (tmp_path / 'demo.json').write_text(json.dumps(rec), encoding='utf-8')
    assert [e['setting'] for e in PS.load_entries(tmp_path, 'demo')] == ['a']


def test_apply_verdicts_refuses_stale_verdicts_and_keeps_the_stamp(tmp_path):
    plugin = tmp_path / 'plugin'
    (plugin / 'src' / 'blocks' / 'demo').mkdir(parents=True)
    (plugin / 'src' / 'shared').mkdir(parents=True)
    (plugin / 'src' / 'blocks' / 'demo' / 'view.js').write_text('build()', encoding='utf-8')
    base = {'props': ['color'], 'state': None, 'tiers': []}
    doc = json.loads((check.RECORDS / 'tabs.json').read_text(encoding='utf-8'))  # a real record: the schema wants its stamp and parts
    doc['block'] = 'sgs/demo'
    doc['entries'] = [
        {**base, 'setting': 'a', 'part': 'p', 'selector': '.p', 'kind': 'switched-on', 'unproved': 'script-built-part'},
        {**base, 'setting': 'b', 'part': 'p', 'selector': '.p', 'kind': 'switched-on', 'unproved': 'script-built-part'}]
    stamp = json.loads(json.dumps(doc['stamp']))
    records = tmp_path / 'records'
    records.mkdir()
    (records / 'demo.json').write_text(json.dumps(doc), encoding='utf-8')
    folder = tmp_path / 'verdicts'
    folder.mkdir()
    rows = [{**base, 'setting': 'a', 'part': 'p', 'verdict': 'proved', 'kind': 'value'}, {**base, 'setting': 'b', 'part': 'p', 'verdict': 'removed'}]
    (folder / 'demo.json').write_text(json.dumps({'block': 'sgs/demo', 'scriptHash': 'stale', 'entries': rows}), encoding='utf-8')
    with pytest.raises(SystemExit, match='changed since'):
        AV.apply_block('demo', plugin, records, True, folder)
    # the same verdicts under the current hash: a is proved, b is gone, the stamp is untouched
    (folder / 'demo.json').write_text(json.dumps({'block': 'sgs/demo', 'scriptHash': check.script_hash(plugin, 'demo'), 'entries': rows}), encoding='utf-8')
    res = AV.apply_block('demo', plugin, records, False, folder)
    out = json.loads((records / 'demo.json').read_text(encoding='utf-8'))
    assert res['proved'] == 1 and res['removed'] == 1 and res['stillUnproved'] == 0
    assert [e['setting'] for e in out['entries']] == ['a'] and 'unproved' not in out['entries'][0] and out['entries'][0]['kind'] == 'value'
    assert out['stamp'] == stamp
