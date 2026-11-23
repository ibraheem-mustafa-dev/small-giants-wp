"""The fixture split: a fixture's `attributes` is the plain block, its `checkAttributes` what the record check adds to
test a part's settings. The check's plan renders both (instances.py::check_fixture, instances.py::plan); the site look's
plan (plain=True) renders `attributes` alone. Nothing here renders.

MUST FAIL on the code before the split: instances.plan has no `plain` switch and ignores `checkAttributes`, so the
check would lose the extras (its records would move) and the site look would keep them.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import check as CK  # noqa: E402
import instances as I  # noqa: E402
import split_fixtures as SF  # noqa: E402

PLUGIN = HERE.parents[2]
FIXTURE = {'attributes': {'iconName': 'star'}, 'checkAttributes': {'showLabel': True, 'labelText': 'Rated'},
           'variants': [{}, {'shape': 'circle'}],
           'paintStates': [{'name': 'ring', 'when': {'has': ['shape']}, 'attributes': {'shape': 'circle'}}]}


def fixtures() -> dict:
    return {'sgs/icon': json.loads(json.dumps(FIXTURE)), '_shared': {}}


def defaults(pl: dict) -> list:
    return [i for i in pl['instances'] if i['isDefault'] or i.get('paintState')]


def test_check_plan_renders_the_extras_MUST_FAIL():
    pl = I.plan('icon', PLUGIN, fixtures(), scan=False)
    assert defaults(pl), 'the plan has default and paint-state instances'
    for i in defaults(pl):
        assert i['attrs'].get('showLabel') is True and i['attrs'].get('labelText') == 'Rated', i['key']
        assert i['attrs'].get('iconName') == 'star'


def test_plain_plan_leaves_the_extras_out_MUST_FAIL():
    pl = I.plan('icon', PLUGIN, fixtures(), scan=False, plain=True)
    for i in defaults(pl):
        assert 'showLabel' not in i['attrs'] and 'labelText' not in i['attrs'], i['key']
        assert i['attrs'].get('iconName') == 'star'
    assert pl['fixture']['attributes'] == {'iconName': 'star'}


def test_load_plan_fixture_follows_the_switch():
    full = CK.load_plan('icon', PLUGIN, fixtures(), None)
    plain = CK.load_plan('icon', PLUGIN, fixtures(), None, plain=True)
    assert full['fixture']['attributes'] == {'iconName': 'star', 'showLabel': True, 'labelText': 'Rated'}
    assert 'checkAttributes' not in full['fixture']
    assert plain['fixture']['attributes'] == {'iconName': 'star'} and 'checkAttributes' not in plain['fixture']


def test_check_fixture_lays_the_tested_value_over_the_plain_one():
    fx = {'attributes': {'a': 1, 'b': 'plain'}, 'checkAttributes': {'b': 'tested', 'c': True}, 'variants': [{}]}
    got = I.check_fixture(fx)
    assert got['attributes'] == {'a': 1, 'b': 'tested', 'c': True} and 'checkAttributes' not in got
    assert I.check_fixture({'attributes': {'a': 1}}) == {'attributes': {'a': 1}}


def test_split_merges_back_to_the_check_plan():
    """The split moves no record: the plan from a split entry equals the plan from the merged one."""
    merged = {'sgs/icon': I.check_fixture(FIXTURE), '_shared': {}}
    a = I.plan('icon', PLUGIN, merged, scan=False)
    b = I.plan('icon', PLUGIN, fixtures(), scan=False)
    assert json.dumps(a['instances'], sort_keys=True) == json.dumps(b['instances'], sort_keys=True)


def test_detector_self_test():
    assert SF.self_test() == 0
