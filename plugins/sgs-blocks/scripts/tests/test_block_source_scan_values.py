"""Tests for the block source scanner's reading of what a setting must be for a part to print: the call's arguments
bound to the helper's parameters (parts.py::follow_calls, values.py::call_seed), the data attribute literals read
from their conditions (parts.py::harvest_php), and the values each condition compares a setting against
(values.py::condition_literals, the scan's `conditionValues` and `settingValues`).

Every MUST-FAIL test runs once with the mechanism removed (monkeypatched) and expects the property missing, then as
built and expects it present.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_block_source_scan_values.py -q
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'block-source-scan'))

import parts as P  # noqa: E402
import values as V  # noqa: E402
from common import function_index, psi  # noqa: E402
from scan import Scan  # noqa: E402

NAMES = {'emptyBody', 'heading', 'labelRoll', 'openLabel', 'magnetOn', 'suffix', 'counterOn', 'pillStyle', 'style'}


def scan_block(tmp_path, render: str, functions: str = '', attrs=NAMES, monkeypatch=None):
    """Scan a throwaway block `demo`; `functions` are PHP helpers added to the scanner's function index."""
    folder = tmp_path / 'demo'
    folder.mkdir(exist_ok=True)
    (folder / 'block.json').write_text(json.dumps({'name': 'sgs/demo', 'attributes': {a: {'type': 'string'} for a in sorted(attrs)}}), encoding='utf-8')
    (folder / 'render.php').write_text('<?php\n' + render, encoding='utf-8')
    for fn in psi.parse_functions('<?php\n' + functions, Path('helpers.php')):
        monkeypatch.setitem(function_index()[0], fn.name, fn)
    return Scan('demo', tmp_path).run()


# ---------------------------------------------------------------- argument binding
HELPER = """
function demo_empty( array $args ) {
	$body = trim( (string) ( $args['body'] ?? '' ) );
	$html = '<div class="sgs-demo__panel">';
	$html .= '<p class="sgs-demo__title">' . esc_html( $args['heading'] ) . '</p>';
	if ( '' !== $body ) {
		$html .= '<p class="sgs-demo__body">' . esc_html( $body ) . '</p>';
	}
	return $html . '</div>';
}
"""
CALLER = """
$out = demo_empty( array( 'body' => (string) ( $attributes['emptyBody'] ?? '' ), 'heading' => $attributes['heading'] ) );
echo $out;
"""


def test_array_argument_binds_each_key_to_its_setting(tmp_path, monkeypatch):
    sc = scan_block(tmp_path, CALLER, HELPER, monkeypatch=monkeypatch)
    # the body part waits on the body key only, not on the heading passed beside it
    assert sc.parts['sgs-demo__body']['conditionAttrs'] == {'emptyBody'}
    assert sc.cond_values['sgs-demo__body'] == {'emptyBody': []}


def test_must_fail_without_argument_binding(tmp_path, monkeypatch):
    monkeypatch.setattr(P, 'call_seed', lambda *a, **k: {})
    sc = scan_block(tmp_path, CALLER, HELPER, monkeypatch=monkeypatch)
    assert sc.parts['sgs-demo__body']['conditionAttrs'] != {'emptyBody'}


def test_scalar_argument_binds_to_its_parameter(tmp_path, monkeypatch):
    helper = """
function demo_roll( string $text, string $roll, string $alt_open = '' ) {
	if ( '' === $roll ) {
		return $text;
	}
	$html = '<span class="sgs-roll__a">' . $text . '</span>';
	if ( '' !== $alt_open ) {
		$html .= '<span class="sgs-roll__c">' . $alt_open . '</span>';
	}
	return $html;
}
"""
    caller = "echo demo_roll( 'x', (string) ( $attributes['labelRoll'] ?? '' ), (string) ( $attributes['openLabel'] ?? '' ) );"
    sc = scan_block(tmp_path, caller, helper, monkeypatch=monkeypatch)
    assert sc.parts['sgs-roll__c']['conditionAttrs'] == {'labelRoll', 'openLabel'}
    assert set(sc.cond_values['sgs-roll__c']) == {'labelRoll', 'openLabel'}


def test_a_helper_called_twice_is_read_with_each_callers_arguments(tmp_path, monkeypatch):
    helper = """
function demo_one( $v ) {
	if ( '' !== $v ) {
		echo '<i class="sgs-demo__one"></i>';
	}
}
"""
    caller = "demo_one( $attributes['heading'] );\ndemo_one( $attributes['emptyBody'] );"
    sc = scan_block(tmp_path, caller, helper, monkeypatch=monkeypatch)
    assert sc.parts['sgs-demo__one']['conditionAttrs'] == {'heading', 'emptyBody'}


def test_must_fail_second_caller_not_read_again(tmp_path, monkeypatch):
    helper = """
function demo_one( $v ) {
	if ( '' !== $v ) {
		echo '<i class="sgs-demo__one"></i>';
	}
}
"""
    monkeypatch.setattr(P, 'MAX_WALKS_PER_FUNCTION', 1)
    sc = scan_block(tmp_path, "demo_one( $attributes['heading'] );\ndemo_one( $attributes['emptyBody'] );", helper, monkeypatch=monkeypatch)
    assert sc.parts['sgs-demo__one']['conditionAttrs'] == {'heading'}


def test_a_literal_string_argument_reads_no_setting():
    got = V.call_seed(["'sgs-x'", '$a'], ['prefix', 'v'], V.var_attr_map("$a = $attributes['heading'];", {'heading'}), {'heading'})
    assert 'prefix' not in got and got['v']['attrs'] == {'heading'}


# ---------------------------------------------------------------- data attribute literals
DATA = """
$bar = '';
$on = ! empty( $attributes['magnetOn'] );
$bar .= $on ? ' data-magnet' : '';
if ( ! empty( $attributes['style'] ) ) {
	$bar = ' data-sgs-fx="x"' . ' data-sgs-fx-radius="' . esc_attr( $attributes['heading'] ) . '"';
}
echo '<nav class="sgs-demo"' . $bar . ' data-wp-on--click="a"></nav>';
"""


def test_data_attribute_literal_is_switched_by_its_condition(tmp_path, monkeypatch):
    sc = scan_block(tmp_path, DATA, monkeypatch=monkeypatch)
    assert sc.data_attrs['magnet'] == {'magnetOn'}
    assert sc.data_attrs['sgs-fx'] == {'style'}
    assert 'style' in sc.data_attrs['sgs-fx-radius']        # switched by the enclosing condition, as well as the value's own setting
    assert 'wp-on--click' not in sc.data_attrs                # an Interactivity directive
    assert sc.cond_values['data-magnet'] == {'magnetOn': []}


def test_must_fail_without_the_data_literal_reader(tmp_path, monkeypatch):
    import re
    monkeypatch.setattr(P, 'DATA_LITERAL_RE', re.compile(r'(?!x)x'))
    sc = scan_block(tmp_path, DATA, monkeypatch=monkeypatch)
    assert 'magnet' not in sc.data_attrs


# ---------------------------------------------------------------- the values a condition compares against
CHAIN = """
$suffix = (string) ( $attributes['suffix'] ?? '' );
$on = ! empty( $attributes['counterOn'] );
$names = false !== strpos( $suffix, '%3$s' ) && $on;
$roll = in_array( $attributes['labelRoll'], array( 'up', 'up-scale' ), true ) ? (string) $attributes['labelRoll'] : '';
$bubble = $trigger && 'bubble' === ( $attributes['pillStyle'] ?? 'plain' );
$kind = $attributes['style'] === 'wide' || 'tall' == $attributes['style'];
"""


def literals_of(expr):
    return V.condition_literals(expr, V.var_attr_map(CHAIN, NAMES))


def test_condition_literals_follow_the_variable_chain():
    assert literals_of('if ( $names )')['suffix'] == ['Sample %3$s']        # a sample holding the needle
    assert 'counterOn' not in literals_of('if ( $names )')                  # tested for being set: no value
    assert literals_of('if ( $roll )')['labelRoll'] == ['up', 'up-scale']
    assert literals_of('if ( $bubble )')['pillStyle'] == ['bubble', 'plain']  # the compared value, then the `??` default
    assert literals_of('if ( $kind )')['style'] == ['wide', 'tall']          # both operand orders


def test_a_composite_carrying_many_settings_gives_no_value():
    many = {f'a{i}' for i in range(6)}
    src = '$panel = array( ' + ', '.join(f"'k{i}' => $attributes['a{i}']" for i in range(6)) + " );\n"
    got = V.condition_literals("$panel === 'x'", V.var_attr_map(src, many))
    assert got == {}


def test_scan_records_every_value_a_token_needs(tmp_path, monkeypatch):
    render = CHAIN + """
if ( $roll ) {
	echo '<span class="sgs-demo__roll sgs-demo__roll--on"></span>';
}
if ( $names ) {
	echo '<span class="sgs-demo__names"></span>';
}
"""
    sc = scan_block(tmp_path, render, monkeypatch=monkeypatch).to_json()
    assert sc['conditionValues']['sgs-demo__names'] == {'counterOn': [], 'suffix': ['Sample %3$s']}
    assert sc['conditionValues']['sgs-demo__roll']['labelRoll'] == ['up', 'up-scale']
    assert sc['settingValues']['pillStyle'] == ['bubble', 'plain']


def test_must_fail_without_condition_literals(tmp_path, monkeypatch):
    monkeypatch.setattr(P, 'condition_literals', lambda *a, **k: {})
    monkeypatch.setattr(P, '_literals_in', lambda *a, **k: None)
    sc = scan_block(tmp_path, CHAIN + "if ( $names ) {\n\techo '<span class=\"sgs-demo__names\"></span>';\n}\n", monkeypatch=monkeypatch).to_json()
    assert sc['conditionValues']['sgs-demo__names'].get('suffix') != ['Sample %3$s'] and not sc['settingValues']


def test_a_validator_helper_without_markup_gives_its_values(tmp_path, monkeypatch):
    helper = """
function demo_valid( $raw ) {
	return in_array( $raw, array( 'up', 'up-scale' ), true ) ? (string) $raw : '';
}
"""
    render = "$r = demo_valid( $attributes['labelRoll'] ?? '' );\nif ( $r ) {\n\techo '<i class=\"sgs-demo__r\"></i>';\n}\n"
    sc = scan_block(tmp_path, render, helper, monkeypatch=monkeypatch).to_json()
    assert sc['conditionValues']['sgs-demo__r']['labelRoll'] == ['up', 'up-scale']


def test_numbers_and_needles():
    vm = V.var_attr_map("$n = $attributes['style'];\n", {'style'})
    assert V.condition_literals('$n === 3', vm) == {'style': [3]}
    assert V.condition_literals("str_starts_with( $n, 'ab' )", vm) == {'style': ['ab sample']}
