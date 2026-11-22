"""Tests for the test values the generator reads from the block's own code (leaf_values.py and the switching functions of
instances.py): an object setting valued by its leaves, a per-device setting valued by what the render code compares it
against, a setting that names a post or product valued with a stand-in, a list valued with an item the code reads, a
part that needs two settings at once, and the precondition gate that accepts an attribute the PHP reads.

Each MUST-FAIL test runs once with the mechanism removed (monkeypatched) and expects the setting unvalued or the value
missing, then as built and expects it present.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import instances as I  # noqa: E402
import leaf_values as LV  # noqa: E402

PLUGIN = HERE.parents[2]


def block(attrs: dict, sgs: dict | None = None) -> dict:
    return {'name': 'sgs/demo', 'attributes': attrs, 'supports': {'sgs': sgs or {}}}


def inst(plan: dict, attr: str) -> list:
    return [i for i in plan['instances'] if i['attr'] == attr]


def unvalued(plan: dict) -> dict:
    return {u['setting']: u['why'] for u in plan['unvalued']}


# ---------------------------------------------------------------- an object by its leaves
SEPARATORS = {'separators': {'type': 'object', 'default': {}, 'description': 'The line between items: { row: { style, width: {desktop,tablet,mobile}, colour }, hoverTreatment: swap | sweep | none }. No thickness (the default) draws nothing.'}}


def test_object_setting_is_valued_by_every_leaf_of_its_described_shape():
    plan = I.plan_block(block(SEPARATORS), plugin=PLUGIN)
    assert 'separators' not in unvalued(plan)
    leaves = inst(plan, 'separators')[0]['attrs']['separators']
    assert leaves['row']['width'] == {'desktop': '37px', 'tablet': '23px', 'mobile': '7px'}   # the line needs a thickness to draw
    assert leaves['row']['colour'] == LV.MARKER_HEX and leaves['row']['style'] == 'dashed'
    assert leaves['hoverTreatment'] == 'swap'                                                   # an enum leaf: the first listed choice, then one instance per other
    assert {i['attrs']['separators']['hoverTreatment'] for i in inst(plan, 'separators')} == {'swap', 'sweep', 'none'}


def test_must_fail_object_setting_unvalued_without_leaf_values(monkeypatch):
    monkeypatch.setattr(LV, 'object_leaf_values', lambda *a, **k: (None, 'removed'))
    assert 'separators' in unvalued(I.plan_block(block(SEPARATORS), plugin=PLUGIN))


def test_shape_comes_from_the_default_then_the_same_setting_on_another_block():
    from_default = LV.object_shape('x', {'default': {'source': 'lucide', 'name': 'menu'}}, PLUGIN)
    assert set(from_default) == {'source', 'name'}
    from_other_block = LV.object_shape('separators', {'type': 'object', 'default': {}}, PLUGIN)
    assert 'column' in from_other_block or 'row' in from_other_block      # nav's `separators` default, found by name


def test_a_leaf_with_no_listed_choices_takes_a_sibling_settings_choices():
    schema = {'a': {'description': '{ hoverTreatment: swap | sweep | none }'}, 'b': {'type': 'object', 'default': {'hoverTreatment': 'swap', 'x': 1}}}
    shape = LV.object_shape('b', schema['b'], None, schema)
    assert shape['hoverTreatment']['choices'] == ['swap', 'sweep', 'none']


def test_an_icon_name_leaf_gets_another_icon_and_an_enum_leaf_the_code_compares():
    d = {'type': 'object', 'default': {'source': 'lucide', 'name': 'menu'}}
    got = LV.object_leaf_values('triggerIcon', d, d['default'], PLUGIN, ['lucide', 'menu', 'custom', 'emoji'])
    assert got[0]['attrs']['triggerIcon'] == {'source': 'custom', 'name': 'heart'}   # 'menu' is the name leaf's own value, never a source
    assert {g['attrs']['triggerIcon']['source'] for g in got[1:]} == {'emoji'}


# ---------------------------------------------------------------- a per-device setting by what the code compares
def test_per_device_setting_takes_the_values_the_code_compares_it_against():
    attrs = {'widthType': {'type': 'object', 'default': {'desktop': 'fit'}}}
    plan = I.plan_block(block(attrs), plugin=PLUGIN, literals={'widthType': ['custom', 'full', 'fit']})
    v = inst(plan, 'widthType')[0]['attrs']['widthType']
    assert 'widthType' not in unvalued(plan) and v['desktop'] != 'fit' and {v['desktop'], v['tablet']} <= {'custom', 'full'}


def test_must_fail_per_device_setting_unvalued_without_code_values():
    attrs = {'widthType': {'type': 'object', 'default': {'desktop': 'fit'}}}
    why = unvalued(I.plan_block(block(attrs), plugin=PLUGIN, literals={})).get('widthType', '')
    assert 'compares it against no value' in why


def test_a_ratio_setting_with_no_code_values_takes_aspect_ratios():
    plan = I.plan_block(block({'imageRatio': {'type': 'object'}}), plugin=PLUGIN, literals={})
    assert inst(plan, 'imageRatio')[0]['attrs']['imageRatio']['desktop'] in LV.RATIO_VALUES


# ---------------------------------------------------------------- stand-ins
def test_settings_naming_a_record_get_a_stand_in_of_the_right_kind():
    attrs = {'addProductId': {'type': 'integer', 'default': 0}, 'drawerRef': {'type': 'number', 'default': 0},
             'splitAfterItemId': {'type': 'string', 'default': ''}, 'queryId': {'type': 'number', 'default': 0},
             'linkId': {'type': 'string', 'default': ''}, 'formId': {'type': 'string', 'default': ''}}
    plan = I.plan_block(block(attrs), plugin=PLUGIN)
    got = {a: inst(plan, a)[0]['attrs'][a] for a in attrs}
    assert got == {'addProductId': '{{product}}', 'drawerRef': '{{drawer}}', 'splitAfterItemId': '9110', 'queryId': 7,
                   'linkId': '{{post2}}', 'formId': 'sample1234'}
    assert not plan['unvalued']


def test_an_item_id_keeps_the_prefix_the_fixture_holds():
    assert LV.standin_value('splitAfterItemId', {'type': 'string'}, 'id:9102') == 'id:9110'


def test_must_fail_record_setting_unvalued_without_stand_ins(monkeypatch):
    monkeypatch.setattr(LV, 'standin_value', lambda *a, **k: (None, 'removed'))
    assert 'addProductId' in unvalued(I.plan_block(block({'addProductId': {'type': 'integer', 'default': 0}}), plugin=PLUGIN))


# ---------------------------------------------------------------- lists
def test_a_list_setting_gets_an_item_of_the_kind_the_code_reads():
    attrs = {'sgsConditionDays': {'type': 'array', 'default': []}, 'sgsConditionUserRole': {'type': 'array', 'default': []}}
    plan = I.plan_block(block(attrs), plugin=PLUGIN)
    assert inst(plan, 'sgsConditionDays')[0]['attrs']['sgsConditionDays'] == [2]               # array_map( 'intval', ... )
    assert inst(plan, 'sgsConditionUserRole')[0]['attrs']['sgsConditionUserRole'] == ['sample1234']  # array_map( 'sanitize_key', ... )


def test_must_fail_list_unvalued_when_no_code_reads_its_items(monkeypatch):
    monkeypatch.setattr(LV, 'list_item_sample', lambda *a, **k: None)
    why = unvalued(I.plan_block(block({'sgsConditionDays': {'type': 'array', 'default': []}}), plugin=PLUGIN))
    assert 'array_map' in why['sgsConditionDays']


# ---------------------------------------------------------------- completion: the values and the pairs a token needs
SCAN = {'conditionValues': {'sgs-roll__c': {'labelRoll': ['up', 'up-scale'], 'triggerOpenLabel': []},
                            'sgs-cart--pill-count-bubble': {'pillCountStyle': ['bubble', 'plain']}},
        'settingValues': {'labelRoll': ['up']}, 'parts': {'sgs-roll__c': {'conditionAttrs': ['a', 'b', 'c', 'd', 'e', 'labelRoll']}}}


def test_the_settings_a_part_needs_come_first_and_those_with_values_before_those_without():
    got = I.switching_attrs(SCAN, ['sgs-roll__c'])
    assert got[:2] == ['labelRoll', 'triggerOpenLabel']


def test_must_fail_attribute_order_without_the_condition_values():
    plain = {k: v for k, v in SCAN.items() if k != 'conditionValues'}
    assert I.switching_attrs(plain, ['sgs-roll__c'])[:2] != ['labelRoll', 'triggerOpenLabel']


def test_the_values_the_code_compares_a_setting_against_are_tried_first_and_with_their_partner(monkeypatch):
    monkeypatch.setattr(I, '_scan_of', lambda plugin, short: SCAN)
    got = I.switching_values(PLUGIN, 'nav-bar-menu', 'labelRoll', {})
    assert got[0] == {'labelRoll': 'up'}                                                     # the compared value, before the generated ones
    assert any(g.get('labelRoll') == 'up' and g.get('triggerOpenLabel') for g in got)        # with the open label the `c` copy needs


def test_must_fail_values_and_partners_without_the_code_values(monkeypatch):
    monkeypatch.setattr(I, '_scan_of', lambda plugin, short: {})
    got = I.switching_values(PLUGIN, 'nav-bar-menu', 'labelRoll', {})
    assert not any(g.get('triggerOpenLabel') for g in got)


def test_setting_literals_put_a_tokens_own_values_before_the_blockwide_ones():
    assert I.setting_literals(SCAN)['labelRoll'] == ['up', 'up-scale']
    assert I.setting_literals(SCAN)['pillCountStyle'] == ['bubble', 'plain']


# ---------------------------------------------------------------- a precondition on an attribute only the PHP reads
def test_precondition_accepts_an_attribute_the_plugin_code_reads():
    assert I.code_reads(PLUGIN, 'sgsMotion') and not I.code_reads(PLUGIN, 'neverReadAnywhereXyz')
    bj = block({'iconBackground': {'type': 'string', 'default': ''}})
    fx = {'attributes': {}, 'variants': [{}], 'preconditions': {'iconBackground': {'sgsMotion': {'v': 1}}}}
    plan = I.plan_block(bj, fx, plugin=PLUGIN)
    assert inst(plan, 'iconBackground')[0]['attrs'].get('sgsMotion') == {'v': 1}


def test_must_fail_precondition_dropped_when_the_gate_is_schema_only(monkeypatch):
    monkeypatch.setattr(I, 'code_reads', lambda plugin, a: False)
    bj = block({'iconBackground': {'type': 'string', 'default': ''}})
    fx = {'attributes': {}, 'variants': [{}], 'preconditions': {'iconBackground': {'sgsMotion': {'v': 1}}}}
    assert 'sgsMotion' not in inst(I.plan_block(bj, fx, plugin=PLUGIN), 'iconBackground')[0]['attrs']
