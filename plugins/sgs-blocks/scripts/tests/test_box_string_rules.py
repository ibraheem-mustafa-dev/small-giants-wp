"""Tests for the box-string rule: a string stored where a per-device box needs top/right/bottom/left.

Run from the repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_box_string_rules.py -v

SGS_SCRIPTS_DIR points the tests at another copy of scripts/ (used to show the tests are red on the tree before the rule).
"""
import importlib.util
import json
import os
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(os.environ.get('SGS_SCRIPTS_DIR') or Path(__file__).resolve().parents[1])
sys.path.insert(0, str(SCRIPTS / 'lib'))
import scalar_tier_rules as R  # noqa: E402

_spec = importlib.util.spec_from_file_location('find_scalar_tier_attrs', SCRIPTS / 'find-scalar-tier-attrs.py')
F = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(F)

BOX_RULES = {'sgs/container': {'padding': 'tiered', 'margin': 'tiered'}, 'sgs/text': {'borderWidth': 'box'}}
SCALAR_RULES = {'sgs/container': {'padding': {}, 'margin': {}, 'gap': {}}}
SIDES = ('top', 'right', 'bottom', 'left')


def tree(attrs, name='sgs/container'):
    return json.dumps([{'name': name, 'attributes': attrs}], indent=2) + '\n'


def scan(text, rel='t.json', fix=True, rules=BOX_RULES):
    return F.scan_box_text(rel, text, rules, SCALAR_RULES, fix)


def test_string_tier_in_a_box_is_reported():
    hits, refused, _new = scan(tree({'padding': {'desktop': '40px'}}), fix=False)
    assert len(hits) == 1 and hits[0][:2] == ('sgs/container', 'padding') and refused == []


def test_fix_one_value_gives_four_sides():
    _h, _r, new = scan(tree({'padding': {'desktop': '40px'}}))
    assert json.loads(new)[0]['attributes']['padding']['desktop'] == {s: '40px' for s in SIDES}


def test_fix_two_three_four_token_shorthand():
    cases = {'10px 20px': ('10px', '20px', '10px', '20px'), '10px 20px 30px': ('10px', '20px', '30px', '20px'),
             '1px 2px 3px 4px': ('1px', '2px', '3px', '4px')}
    for raw, want in cases.items():
        _h, _r, new = scan(tree({'padding': {'desktop': raw}}))
        assert tuple(json.loads(new)[0]['attributes']['padding']['desktop'][s] for s in SIDES) == want, raw


def test_uncertain_values_are_refused_and_left_as_stored():
    for raw in ('calc(1rem + 2px)', '1rem calc(1px + 2px)', 'auto', '10% 5px'):
        text = tree({'padding': {'desktop': raw}})
        hits, refused, new = scan(text)
        assert len(hits) == 1 and len(refused) == 1 and json.loads(new) == json.loads(text), raw


def test_whole_scalar_for_a_box_only_attribute_becomes_one_box():
    _h, _r, new = scan(tree({'borderWidth': '2px'}, 'sgs/text'))
    assert json.loads(new)[0]['attributes']['borderWidth'] == {s: '2px' for s in SIDES}


def test_markup_member_replaced_as_text_keeping_other_bytes():
    md = '<!-- wp:sgs/container {"padding":{"desktop":"40px"},  "x":1} /-->'
    hits, _r, new = scan(md, 'p.html')
    assert len(hits) == 1
    assert new == ('<!-- wp:sgs/container {"padding":{"desktop":{"top":"40px","right":"40px","bottom":"40px",'
                   '"left":"40px"}},  "x":1} /-->')
    hits2, _r2, new2 = scan(new, 'p.html')
    assert hits2 == [] and new2 == new


def test_negative_controls_stay_unchanged():
    clean = tree({'padding': {'desktop': {'top': '1px', 'left': '2px'}, 'tablet': {}}, 'gap': {'desktop': '1rem'},
                  'borderWidth': {'top': '1px'}})
    for text in (clean, tree({'borderRadius': {'desktop': '8px'}}), tree({'padding': {'desktop': '40px'}}, 'sgs/other'),
                 tree({'label': 'a string'}), tree({'gap': '1rem'})):
        hits, refused, new = scan(text)
        assert hits == [] and refused == [] and new == text


def test_bare_scalar_covered_by_the_scalar_tier_rule_is_not_double_counted():
    hits, _r, _n = scan(tree({'padding': '40px'}), fix=False)
    assert hits == []


def test_report_only_does_not_enforce(monkeypatch):
    monkeypatch.delenv('SGS_BOX_STRING_RULE', raising=False)
    assert R.box_string_enforced() is R.BOX_STRING_ENFORCED
    monkeypatch.setattr(R, 'BOX_STRING_ENFORCED', True)
    assert R.box_string_enforced() is True
    monkeypatch.setenv('SGS_BOX_STRING_RULE', 'report')
    assert R.box_string_enforced() is False


@pytest.mark.skipif(not R.DB_PATH.exists(), reason='framework DB absent')
def test_every_box_row_is_classified():
    assert R.unclassified_box_names() == []


@pytest.mark.skipif(not R.DB_PATH.exists(), reason='framework DB absent')
def test_excluded_names_never_reach_the_rule_and_container_padding_is_in():
    attrs = R.box_attrs_from_db()
    inc, exc = R.load_box_rules()
    assert attrs['sgs/container']['padding'] == 'tiered'
    assert not any(a in exc for per in attrs.values() for a in per)
    assert not any(a.lower().endswith('radius') for per in attrs.values() for a in per)


def test_a_classification_gap_is_detected(tmp_path):
    if not R.DB_PATH.exists():
        pytest.skip('framework DB absent')
    rules = tmp_path / 'r.json'
    rules.write_text(json.dumps({'include': {'padding': 'x'}, 'exclude': {}}))
    assert 'borderWidth' in R.unclassified_box_names(rules_file=rules)
