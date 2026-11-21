"""Tests for block-source-scan/score.py and reference.py on small fixtures: a block.json,
a slot map and a paint file a few entries long, and a hand-written scan.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_block_source_scan_score.py -q
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'block-source-scan'))

import reference as R  # noqa: E402
import score as S  # noqa: E402

ALL = [375, 768, 1440]


def setting(slots, prop, state=None, widths=ALL, effects=()):
    return {'slot': slots[0], 'slots': slots, 'property': prop, 'state': state, 'reachedAt': widths, 'effects': list(effects)}


def build(tmp_path, attrs, settings, scan_settings, paint=None, presence=None, scan_parts=None, elements=None, tags=()):
    """Write a fixture block (sgs/demo), its reference files and a scan; return the score."""
    block_dir = tmp_path / 'blocks' / 'demo'
    block_dir.mkdir(parents=True)
    (block_dir / 'block.json').write_text(json.dumps({'name': 'sgs/demo', 'attributes': attrs, 'supports': {'sgs': {'elements': elements or {}}}}), encoding='utf-8')
    (block_dir / 'render.php').write_text('<?php echo "";\n', encoding='utf-8')
    slot = tmp_path / 'slot.json'
    slot.write_text(json.dumps({'measured': 'x', 'settings': settings, 'presence': presence or {}}), encoding='utf-8')
    pfile = tmp_path / 'paint.json'
    pfile.write_text(json.dumps({'elements': paint or {'': {'375': {'opacity': '1'}}}}), encoding='utf-8')
    ref = R.load({'slotmap': str(slot), 'paint': [str(pfile)]}, 'demo')
    scan = {'settings': scan_settings, 'parts': scan_parts or {}, 'tags': list(tags)}
    return S.score_block('demo', scan, ref, {}, blocks_dir=tmp_path / 'blocks')


def place(part, props, mech='php-css', state=None, tiers=None, **kw):
    return {'part': part, 'props': props, 'state': state, 'mechanism': mech, **({'tiers': tiers} if tiers else {}), **kw}


def verdict(sc, attr):
    return sc['detail'][attr]['verdict']


def items(sc, attr):
    return [i['verdict'] for i in sc['detail'][attr]['items']]


# ---------------------------------------------------------------- every placement counts
def test_every_placement_counts_wrong_ones(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color')},
               {'c': [place('sgs-demo__a', ['color']), place('sgs-demo__b', ['color']), place('sgs-demo', ['color'])]})
    assert sorted(items(sc, 'c')) == ['right', 'wrong-part', 'wrong-part']
    assert verdict(sc, 'c')['code'] == 'right+wrong'
    assert sc['settings']['codeClean'] == 0


def test_every_placement_negative_control(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color')}, {'c': [place('sgs-demo__a', ['color'])]})
    assert verdict(sc, 'c')['code'] == 'clean'


def test_every_measured_slot_must_be_covered(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a', '.sgs-demo__b'], 'color')}, {'c': [place('sgs-demo__a', ['color'])]})
    assert verdict(sc, 'c')['code'] == 'partial'
    assert sc['settings']['placements'] == {'measured': 2, 'coveredByCode': 1, 'coveredByAny': 1, 'codeRecall': 0.5}


def test_over_broad_contract_counts_each_property(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color')},
               {'c': [place('sgs-demo__a', ['color', 'max-width', 'margin-inline'], mech='map-helper:h')]})
    assert sorted(items(sc, 'c')) == ['right', 'wrong-prop', 'wrong-prop']


# ---------------------------------------------------------------- code against declarations
def test_declaration_backed_is_its_own_column(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}, 'd': {'type': 'string'}},
               {'c': setting(['.sgs-demo__a'], 'color'), 'd': setting(['.sgs-demo__a'], 'color')},
               {'c': [place('sgs-demo__a', ['color'], mech='declared-attrMap', declaredSelector=True)],
                'd': [place('sgs-demo__a', ['color'], mech='declared-attrMap', declaredSelector=False)]})
    assert verdict(sc, 'c')['code'] == 'none' and verdict(sc, 'c')['declarationBacked'] == 'declared'
    assert verdict(sc, 'd')['code'] == 'none' and verdict(sc, 'd')['declarationBacked'] == 'hint'
    assert sc['settings']['codeAnyRight'] == 0
    assert sc['settings']['declarationBackedOnly'] == {'declared': 1, 'hint': 1}


def test_code_read_is_not_declaration_backed(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color')},
               {'c': [place('sgs-demo__a', ['color']), place('sgs-demo__a', ['color'], mech='declared-attrMap', declaredSelector=True)]})
    assert verdict(sc, 'c')['code'] == 'clean' and verdict(sc, 'c')['declarationBacked'] is None


# ---------------------------------------------------------------- state, tier, pseudo-element, modifier, width/height
def test_state_is_compared(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color', state='hover')}, {'c': [place('sgs-demo__a', ['color'])]})
    assert items(sc, 'c') == ['wrong-state']


def test_state_negative_control(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color', state='hover')}, {'c': [place('sgs-demo__a', ['color'], state=':hover')]})
    assert items(sc, 'c') == ['right']


def test_modifier_state_is_compared(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}, 'd': {'type': 'string'}},
               {'c': setting(['.sgs-demo__step > .sgs-demo__label'], 'color', state='active'), 'd': setting(['.sgs-demo__step > .sgs-demo__label'], 'color', state='active')},
               {'c': [place('sgs-demo__label', ['color'])], 'd': [place('sgs-demo__label', ['color'], state='.sgs-demo__step--active')]})
    assert items(sc, 'c') == ['wrong-state']
    assert items(sc, 'd') == ['right']


def test_tier_is_compared(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'gap', widths=[768, 1440])},
               {'c': [place('sgs-demo__a', ['gap'], tiers=['@media (max-width: 767.98px)'])]})
    assert items(sc, 'c') == ['wrong-tier']


def test_tier_negative_control(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'gap')},
               {'c': [place('sgs-demo__a', ['gap'], tiers=['@media (max-width: 767.98px)'])]})
    assert items(sc, 'c') == ['right']


def test_pseudo_element_is_a_part_of_its_own(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}, 'd': {'type': 'string'}},
               {'c': setting(['.sgs-demo__a::before'], 'background-color'), 'd': setting(['.sgs-demo__a::before'], 'background-color')},
               {'c': [place('sgs-demo__a', ['background-color'])], 'd': [place('sgs-demo__a::before', ['background-color'])]})
    assert items(sc, 'c') == ['wrong-part']
    assert items(sc, 'd') == ['right']


def test_width_and_height_are_separate(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}, 'd': {'type': 'string'}},
               {'c': setting(['.sgs-demo__a'], 'max-height'), 'd': setting(['.sgs-demo__a'], 'max-height')},
               {'c': [place('sgs-demo__a', ['height'])], 'd': [place('sgs-demo__a', ['max-height'])]})
    assert items(sc, 'c') == ['wrong-prop']
    assert items(sc, 'd') == ['right']


def test_longhand_folds_to_measured_shorthand(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'padding')}, {'c': [place('sgs-demo__a', ['padding-top', 'padding-left'])]})
    assert items(sc, 'c') == ['right']


def test_unknown_part_is_reported_not_counted_wrong(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color')}, {'c': [place(None, ['color'])]})
    assert items(sc, 'c') == ['unknown']
    assert verdict(sc, 'c')['code'] == 'unknown-only'
    assert sc['settings']['codePrecision'] is None


def test_bare_tag_needs_its_tag(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}, 'd': {'type': 'string'}},
               {'c': setting(['.sgs-demo__icon > svg'], 'stroke'), 'd': setting(['.sgs-demo__icon > svg'], 'stroke')},
               {'c': [place('sgs-demo__icon', ['stroke'])], 'd': [place('sgs-demo__icon svg', ['stroke'])]})
    assert items(sc, 'c') == ['container']
    assert items(sc, 'd') == ['right']


# ---------------------------------------------------------------- unit companions, neither side
def test_unit_companion_folds_into_its_value(tmp_path):
    sc = build(tmp_path, {'gap': {'type': 'number'}, 'gapUnit': {'type': 'string'}, 'sizeUnit': {'type': 'string'}},
               {'gap': setting(['.sgs-demo__a'], 'gap')}, {'gapUnit': [place('sgs-demo__a', ['gap'])]})
    assert sc['settings']['unitCompanionsFolded'] == ['gapUnit']
    assert items(sc, 'gap') == ['right']
    assert 'gapUnit' not in sc['detail']
    assert sc['settings']['universe'] == 2  # gap and sizeUnit (no size beside it): a unit with no value stays a setting


def test_neither_side_is_listed(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}, 'lonely': {'type': 'string'}}, {'c': setting(['.sgs-demo__a'], 'color')}, {'c': [place('sgs-demo__a', ['color'])]})
    names = [n['setting'] for n in sc['settings']['neither']]
    assert names == ['lonely']
    assert sc['settings']['neither'][0]['frontEndNames'] is False


def test_neither_names_front_end_source(tmp_path):
    sc = build(tmp_path, {'shown': {'type': 'string'}}, {}, {})
    (tmp_path / 'blocks' / 'demo' / 'render.php').write_text("<?php $x = $attributes['shown'];\n", encoding='utf-8')
    S._FRONT_SOURCES.clear()
    assert S.front_end_names(tmp_path / 'blocks' / 'demo', 'shown') is True
    assert S.front_end_names(tmp_path / 'blocks' / 'demo', 'zzqNeverNamedSetting') is False


# ---------------------------------------------------------------- parts: zones and reference faults
def test_parts_outside_root_and_child_have_their_own_rows(tmp_path):
    sc = build(tmp_path, {'c': {'type': 'string'}},
               {'c': setting(['@companion > .sgs-demo__chip', '.sgs-demo__body > .sgs-button', '.sgs-demo__body'], 'color')}, {})
    rows = sc['parts']['rows']
    assert rows['outside']['rendered'] == 1
    assert rows['child']['rendered'] == 1
    assert rows['host']['rendered'] == 2  # ROOT (paint '') and __body


def test_parts_match_by_class_not_by_tag(tmp_path):
    sc = build(tmp_path, {}, {}, {}, paint={'': {}, '.sgs-demo__a': {}, '.sgs-demo__a > svg': {}},
               scan_parts={'sgs-demo__a': {'owner': 'host', 'origins': ['php'], 'conditions': [], 'conditionAttrs': [], 'repeats': []}}, tags=['svg'])
    parts = sc['parts']
    assert parts['matched'] == 1  # sgs-demo__a; ROOT is not printed by this scan
    assert parts['tagOnly'] == 1  # 'sgs-demo__a svg': an svg is printed somewhere, not shown under __a
    assert parts['rendered'] == 3


def test_reference_faults_are_not_scored(tmp_path):
    paint = {'': {}, '.sgs-demo__a': {'375': {'opacity': '0.5'}}, '.sgs-demo__a::first-letter': {'375': {'opacity': '1', 'float': 'none'}},
             '.sgs-demo__b::first-letter': {'375': {'color': 'red', 'float': 'left'}}, '.sgs-demo__in::placeholder': {'375': {'color': 'grey'}}}
    sc = build(tmp_path, {}, {}, {}, paint=paint)
    faults = {f['path'] for f in sc['parts']['referenceFaults']}
    assert faults == {'.sgs-demo__a::first-letter', '.sgs-demo__in::placeholder'}
    assert 'sgs-demo__b::first-letter' in {m['part'] for m in sc['parts']['rows']['host']['missed']}


def test_scan_only_parts_are_split(tmp_path):
    rec = lambda origins, cond=(): {'owner': 'host', 'origins': origins, 'conditions': list(cond), 'conditionAttrs': [], 'repeats': []}
    sc = build(tmp_path, {}, {}, {}, scan_parts={'sgs-demo__x': rec(['declared-only']), 'sgs-demo__y': rec(['php']), 'sgs-demo__z': rec(['php'], ['if ($a)']), 'sgs-demo__w': rec(['css-only'])})
    so = sc['parts']['scanOnly']
    assert so == {'conditional': ['sgs-demo__z'], 'declared-only': ['sgs-demo__x'], 'stylesheet-only': ['sgs-demo__w'], 'unconditional': ['sgs-demo__y']}
