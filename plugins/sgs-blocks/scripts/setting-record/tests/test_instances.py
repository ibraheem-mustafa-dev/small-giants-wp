"""Tests for instances.py: the setting-instance generator (pure data, nothing rendered).

Each MUST-FAIL test proves its assertion can fail: it runs the plan once with the rule under test switched off
(monkeypatched) and expects the property to be missing, then once as built and expects it present.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import instances as I  # noqa: E402

PLUGIN = HERE.parents[2]


def block(attrs: dict, sgs: dict | None = None, name: str = 'sgs/demo') -> dict:
    return {'name': name, 'attributes': attrs, 'supports': {'sgs': sgs or {}}}


def setting_instances(plan: dict, attr: str) -> list:
    return [i for i in plan['instances'] if i['attr'] == attr]


def partners(plan: dict, inst: dict) -> dict:
    default = next(i for i in plan['instances'] if i['isDefault'] and i['variant'] == inst['variant'])['attrs']
    return {k: v for k, v in inst['attrs'].items() if k != inst['attr'] and default.get(k) != v}


# ---------------------------------------------------------------- gating toggle
GATED = block({
    'showBadge': {'type': 'boolean', 'default': False},
    'badgeColour': {'type': 'string', 'default': ''},
}, {'elements': {'badge': {'attrMap': {'css:background-color': 'badgeColour'}}}})


def test_gating_toggle_turns_its_part_on():
    plan = I.plan_block(GATED, plugin=PLUGIN)
    [inst] = setting_instances(plan, 'badgeColour')
    assert partners(plan, inst) == {'showBadge': True}
    assert inst['baseKey'] and any(i['isBase'] and i['baseKey'] == inst['baseKey'] and i['attrs']['showBadge'] is True for i in plan['instances'])


def test_gating_toggle_must_fail_without_the_toggle_rule(monkeypatch):
    # Catches: gating_toggle() not applied, so badgeColour is rendered with its badge hidden and reads as dead.
    monkeypatch.setattr(I, 'gating_toggle', lambda *a, **k: {})
    plan = I.plan_block(GATED, plugin=PLUGIN)
    [inst] = setting_instances(plan, 'badgeColour')
    assert 'showBadge' not in partners(plan, inst)


def test_gating_toggle_already_on_is_not_a_partner():
    plan = I.plan_block(GATED, {'attributes': {'showBadge': True}, 'variants': [{}]}, plugin=PLUGIN)
    [inst] = setting_instances(plan, 'badgeColour')
    assert partners(plan, inst) == {}
    assert inst['baseKey'] is None


# ---------------------------------------------------------------- border partners
BORDERED = block({
    'cardBorderColour': {'type': 'string', 'default': ''},
    'cardBorderStyle': {'type': 'string', 'default': ''},
    'cardBorderWidth': {'type': 'string', 'default': ''},
    'cardBorderWidthUnit': {'type': 'string', 'default': 'px'},
}, {'elements': {'card': {'attrMap': {'css:border-color': 'cardBorderColour', 'css:border-style': 'cardBorderStyle', 'css:border-width': 'cardBorderWidth'}}}})


def test_border_colour_gets_width_and_style():
    plan = I.plan_block(BORDERED, plugin=PLUGIN)
    [inst] = setting_instances(plan, 'cardBorderColour')
    assert partners(plan, inst) == {'cardBorderStyle': 'solid', 'cardBorderWidth': '3', 'cardBorderWidthUnit': 'px'}


def test_border_colour_must_fail_without_border_partners(monkeypatch):
    # Catches: border_partners() not applied, so a border colour is rendered with no width or style and paints nothing.
    monkeypatch.setattr(I, 'border_partners', lambda *a, **k: {})
    plan = I.plan_block(BORDERED, plugin=PLUGIN)
    [inst] = setting_instances(plan, 'cardBorderColour')
    assert 'cardBorderWidth' not in partners(plan, inst) and 'cardBorderStyle' not in partners(plan, inst)


def test_border_style_carries_its_width_in_the_baseline():
    plan = I.plan_block(BORDERED, plugin=PLUGIN)
    insts = setting_instances(plan, 'cardBorderStyle')
    assert insts and all(i['attrs']['cardBorderWidth'] == '3' for i in insts)
    base = next(i for i in plan['instances'] if i['isBase'] and i['baseKey'] == insts[0]['baseKey'])
    assert base['attrs']['cardBorderWidth'] == '3' and base['attrs'].get('cardBorderStyle', '') == ''


def test_unit_companion_is_not_a_setting():
    plan = I.plan_block(BORDERED, plugin=PLUGIN)
    assert not setting_instances(plan, 'cardBorderWidthUnit')


# ---------------------------------------------------------------- tier objects and boxes
TIERED = block({'gap': {'type': 'object', 'default': {}}},
               {'elements': {'grid': {'attrMap': {'css:gap': 'gap'}}}})


def test_tier_object_gets_three_different_values():
    plan = I.plan_block(TIERED, plugin=PLUGIN)
    insts = setting_instances(plan, 'gap')
    [inst] = [i for i in insts if not i['key'].endswith('-desktop-only-v0')]  # beside the desktop-only shape
    value = inst['attrs']['gap']
    assert set(value) == {'desktop', 'tablet', 'mobile'}
    assert len(set(json.dumps(v) for v in value.values())) == 3


def test_tier_object_must_fail_when_classified_flat(monkeypatch):
    # Catches: the tier-shape classifier not consulted, so a per-device setting gets one flat value and a dead tier hides.
    monkeypatch.setattr(I, 'tier_shapes', lambda attrs, *a, **k: {n: None for n in attrs})
    plan = I.plan_block(TIERED, plugin=PLUGIN)
    values = [i['attrs']['gap'] for i in setting_instances(plan, 'gap')]
    assert not any(isinstance(v, dict) and set(v) == {'desktop', 'tablet', 'mobile'} for v in values)


def test_box_family_gets_four_sides_per_tier():
    bj = block({'cardPadding': {'type': 'object', 'default': {}}}, {'boxFamilies': {'cardPadding': ['cardPadding']},
               'elements': {'card': {'attrMap': {'css:padding': 'cardPadding'}}}})
    plan = I.plan_block(bj, plugin=PLUGIN, shapes={'cardPadding': 'tier_object'})
    [inst] = [i for i in setting_instances(plan, 'cardPadding') if '-desktop-only' not in i['key']]
    v = inst['attrs']['cardPadding']
    assert set(v) == {'desktop', 'tablet', 'mobile'} and all(set(v[t]) == {'top', 'right', 'bottom', 'left'} for t in v)
    assert len({json.dumps(v[t], sort_keys=True) for t in v}) == 3


# ---------------------------------------------------------------- enums and booleans
ENUMS = block({'layoutStyle': {'type': 'string', 'enum': ['', 'plain', 'boxed', 'pill'], 'default': 'plain'},
               'showIcon': {'type': 'boolean', 'default': True}})


def test_enum_gets_one_instance_per_non_default_value():
    plan = I.plan_block(ENUMS, plugin=PLUGIN)
    got = sorted(i['attrs']['layoutStyle'] for i in setting_instances(plan, 'layoutStyle'))
    assert got == ['boxed', 'pill']
    assert all(i['discover'] is None for i in setting_instances(plan, 'layoutStyle'))


def test_enum_must_fail_when_values_collapse_to_one(monkeypatch):
    # Catches: an enum given a single test value (or discovery only), so the other choices' effects are never seen.
    real = I.values_for

    def one_value(row, d, schema, current):
        out = real(row, d, schema, current)
        return out[:1] if isinstance(out, list) else out
    monkeypatch.setattr(I, 'values_for', one_value)
    plan = I.plan_block(ENUMS, plugin=PLUGIN)
    assert len(setting_instances(plan, 'layoutStyle')) != 2


def test_enum_skips_the_fixture_value_and_offers_the_default():
    plan = I.plan_block(ENUMS, {'attributes': {'layoutStyle': 'boxed'}, 'variants': [{}]}, plugin=PLUGIN)
    assert sorted(i['attrs']['layoutStyle'] for i in setting_instances(plan, 'layoutStyle')) == ['pill', 'plain']


def test_boolean_is_flipped():
    plan = I.plan_block(ENUMS, plugin=PLUGIN)
    assert [i['attrs']['showIcon'] for i in setting_instances(plan, 'showIcon')] == [False]


# ---------------------------------------------------------------- extensions, records, placeholders
def test_extension_attribute_is_listed_unvalued():
    bj = block({'label': {'type': 'string', 'default': ''}}, {'enabledExtensions': ['floatPosition']})
    roster = [{'id': 'floatPosition', 'rule': {'mode': 'allowlist', 'enabledSlug': 'floatPosition', 'requiresClassName': False},
               'attributes': {'sgsPosition': {'type': 'string'}}},
              {'id': 'responsiveVisibility', 'rule': {'mode': 'universal', 'requiresClassName': True, 'hideSlug': None},
               'attributes': {'sgsHideOnMobile': {'type': 'boolean'}}}]
    plan = I.plan_block(bj, plugin=PLUGIN, extensions=I.extension_attrs(bj, roster))
    unvalued = {u['setting']: u['why'] for u in plan['unvalued']}
    assert unvalued.get('sgsPosition') == I.EXTENSION_WHY and unvalued.get('sgsHideOnMobile') == I.EXTENSION_WHY
    assert not setting_instances(plan, 'sgsPosition')


def test_extension_attribute_must_fail_when_the_roster_rule_is_ignored():
    # Catches: extension_attrs() handing a block an allowlist extension it never enabled (or dropping one it did).
    bj = block({}, {'enabledExtensions': []})
    roster = [{'id': 'floatPosition', 'rule': {'mode': 'allowlist', 'enabledSlug': 'floatPosition'}, 'attributes': {'sgsPosition': {}}}]
    assert I.extension_attrs(bj, roster) == {}
    bj['supports']['sgs']['enabledExtensions'] = ['floatPosition']
    assert I.extension_attrs(bj, roster) == {'sgsPosition': 'floatPosition'}


def test_record_id_is_unvalued_not_invented():
    plan = I.plan_block(block({'ref': {'type': 'number'}}), plugin=PLUGIN)
    assert [u['setting'] for u in plan['unvalued']] == ['ref'] and not setting_instances(plan, 'ref')


def test_no_fixture_gives_one_plain_variant():
    plan = I.plan_block(ENUMS, None, plugin=PLUGIN)
    assert [i['key'] for i in plan['instances'] if i['isDefault']] == ['default-v0']


def test_layout_property_is_tried_under_each_layout_mode():
    bj = block({'layout': {'type': 'string', 'enum': ['stack', 'grid', 'row'], 'default': 'stack'},
                'itemsAlign': {'type': 'string', 'default': ''}},
               {'elements': {'list': {'attrMap': {'css:align-items': 'itemsAlign'}}}})
    plan = I.plan_block(bj, plugin=PLUGIN)
    modes = sorted(i['attrs'].get('layout', 'stack') for i in setting_instances(plan, 'itemsAlign'))
    assert modes == ['grid', 'row', 'stack']


def test_instance_shape_matches_the_trial_plans():
    plan = I.plan_block(GATED, plugin=PLUGIN)
    keys = {'key', 'attrs', 'variant', 'isDefault', 'isBase', 'baseKey', 'attr', 'state', 'prop', 'element', 'trigger', 'discover', 'paintState', 'marker'}
    assert all(keys <= set(i) for i in plan['instances'])
    assert {'fixture', 'instances', 'noMarker', 'rows', 'unvalued'} <= set(plan)


# ---------------------------------------------------------------- the seeded fixtures and the real blocks
def test_fixtures_switch_every_part_on():
    fx = I.load_fixtures()
    cart = fx['sgs/cart']['attributes']
    assert cart['panelTaxNote'] and cart['panelShowViewCart'] is True
    nav = fx['sgs/nav-bar-menu']
    post = json.loads((HERE.parent / nav['harness']['postFile']).read_text(encoding='utf-8'))
    for ident in nav['attributes']['featuredItemIds'] + nav['attributes']['disabledItemIds']:
        child = ident.split('>')[-1].replace('id:', '')
        assert child == '{{menuItem}}' or f'"id":{child}' in post['post_content']
    assert nav['post'][0]['set'] == {'aria-current': 'page'} and '/shop/cases/' in post['post_content']
    names = [c['name'] for c in fx['sgs/form']['inner']]
    assert names[-2:] == ['sgs/text', 'sgs/text']
    assert any(c['attributes'].get('floatingLabelPosition') == 'inside' for c in fx['sgs/form']['inner'])
    for b in fx.values():
        for k in ('renderFile', 'postFile', 'attachmentsFile'):
            if k in b.get('harness', {}):
                assert (HERE.parent / b['harness'][k]).is_file()
    assert 'E:/' not in (HERE.parent / 'fixtures' / 'cart-wc.php').read_text(encoding='utf-8')


@pytest.mark.parametrize('short', ['button'])
def test_real_block_plans_without_the_scanner(short):
    plan = I.plan(short, PLUGIN, scan=False)
    assert any(i['isDefault'] for i in plan['instances'])
    # Extension settings that paint are valued (the runner runs their render_block filters); behaviour ones are listed.
    assert {'sgsPosition', 'sgsHideOnMobile'} <= {i['attr'] for i in plan['instances']}
    assert 'sgsConditionLoggedIn' in {u['setting'] for u in plan['unvalued'] if u['why'] == I.EXTENSION_WHY}


def test_must_fail_per_device_value_differs_from_baseline_at_every_device():
    # Breaks if a per-device test value could equal what a device already shows: the cart fixture holds
    # panelEmptyTextAlign {desktop: center}, so a desktop test value of center changes nothing at desktop (and
    # tablet and mobile show center too, carried down).
    got = I.differ_per_tier({'desktop': 'center', 'tablet': 'right', 'mobile': 'left'}, {'desktop': 'center'}, ['left', 'center', 'right'])
    eff = I.effective_tiers({'desktop': 'center'})
    assert all(got[t] != eff[t] for t in got)
    assert got['tablet'] != got['desktop'] and got['mobile'] != got['tablet']


def test_must_fail_per_device_setting_also_tried_on_desktop_only():
    # Breaks if a per-device setting were only tried with every device set: a desktop-only value prints its rule with
    # no media query (the form's actionsTopPadding), a shape the all-devices value never shows.
    row = {'attr': 'gap', 'vprop': 'text-align', 'props': ['text-align'], 'shape': 'tier_object', 'box_family': False}
    d = {'type': 'object', 'default': {}}
    got = I.values_for(row, d, {'gap': d}, {})
    shapes = [m['attrs']['gap'] for m in got if isinstance(m.get('attrs', {}).get('gap'), dict)]
    assert any(set(v) == {'desktop'} for v in shapes) and any(len(v) == 3 for v in shapes)


def test_must_fail_one_sided_padding_gets_lengths_not_a_box():
    # Breaks if every padding setting were tried as a four-sided box: sgs/form's actionsTopPadding holds one length
    # per device, and its render prints nothing for a box value.
    bj = block({'actionsTopPadding': {'type': 'object', 'default': {}}}, {'elements': {'actions': {'attrMap': {'css:padding': 'actionsTopPadding'}}}})
    plan = I.plan_block(bj, plugin=PLUGIN, shapes={'actionsTopPadding': 'tier_object'})
    values = [i['attrs']['actionsTopPadding'] for i in setting_instances(plan, 'actionsTopPadding')]
    assert values and all(isinstance(v, dict) and all(not isinstance(x, dict) for x in v.values()) for v in values)
