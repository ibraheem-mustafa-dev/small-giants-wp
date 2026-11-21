"""Tests for block-source-scan/selector_eval.py (the selector evaluator) and the precedence
rule in rules.py, on small PHP fixtures.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_block_source_scan_selectors.py -q
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'block-source-scan'))

import selector_eval as E  # noqa: E402
from common import function_index, psi  # noqa: E402
from scan import Scan  # noqa: E402

ATTRS = {'c', 'd'}


def rules_of(src, monkeypatch=None, functions=''):
    """{(part, state)} of every rule the fixture's last statement writes for setting c."""
    if functions:
        for fn in psi.parse_functions(functions, Path('fixture.php')):
            monkeypatch.setitem(function_index()[0], fn.name, fn)
            E._WRITES.pop(fn.name, None)
            monkeypatch.setitem(E._DEFAULTS, fn.name, _defaults(functions, fn.name))
    env = E.Env(src, 'fixture', ATTRS)
    last = src.rstrip().rstrip(';').rsplit('\n', 1)[-1]
    expr = last.split('=', 1)[1] if re.match(r'\s*\$\w+\s*=', last) else last
    value = env.eval(expr, len(src))
    out = set()
    for sel, _media, _prop, sym in E.css_emissions(value):
        if 'c' in sym.attrs:
            for one in E.split_top(sel):
                part, state, _reason = E.analyse_selector(one, 'demo')
                out.add((part, state))
    return out


def _defaults(src, name):
    m = re.search(r'function\s+' + name + r'\s*\(([^)]*)\)', src)
    out = {}
    for raw in psi.split_top_level_args(m.group(1)) if m else []:
        pm = re.search(r'\$(\w+)\s*=\s*(.+)$', raw.strip())
        if pm:
            out[pm.group(1)] = pm.group(2).strip()
    return out


UID = "$uid = 'sgs-demo-' . substr( md5( 'x' ), 0, 8 );\n"


# ---------------------------------------------------------------- concatenation, interpolation, earlier assignments
def test_concatenation_and_interpolation_resolve_the_subject():
    src = UID + "$sel = '.' . $uid . ' .sgs-demo__a';\n$css = \"{$sel}::after{color:\" . $attributes['c'] . '}';"
    assert rules_of(src) == {('sgs-demo__a::after', None)}


def test_unassigned_variable_stays_unknown():
    src = "$css = $mystery . '{color:' . $attributes['c'] . '}';"
    assert rules_of(src) == {(None, None)}


def test_unknown_value_beside_a_class_is_not_guessed():
    src = "$css = '.sgs-demo__x-' . $mystery . '{color:' . $attributes['c'] . '}';"
    assert rules_of(src) == {(None, None)}


def test_state_inside_not_is_no_state():
    assert E.analyse_selector('.sgs-demo__step:not(.is-current) .sgs-demo__dot', 'demo')[:2] == ('sgs-demo__dot', None)
    assert E.analyse_selector('.sgs-demo__step.is-current .sgs-demo__dot', 'demo')[:2] == ('sgs-demo__dot', '.is-current')


def test_long_shorthand_keeps_its_property():
    src = "$css = '.sgs-demo__a{border:' . $w . 'px solid ' . $attributes['c'] . ';}';"
    env = E.Env(src, 'fixture', ATTRS)
    value = env.eval(src.split('=', 1)[1].rstrip(';'), len(src))
    assert {prop for _s, _m, prop, sym in E.css_emissions(value) if 'c' in sym.attrs} == {'border'}


def test_instance_id_compound_is_the_root():
    src = UID + "$css = '.' . $uid . '.wp-block-sgs-demo:hover{color:' . $attributes['c'] . '}';"
    assert rules_of(src) == {('sgs-demo', ':hover')}


def test_conditional_assignment_gives_every_selector():
    src = "$sel = '.sgs-demo__a';\nif ( $x ) {\n\t$sel = '.sgs-demo__b';\n}\n$css = $sel . '{color:' . $attributes['c'] . '}';"
    assert rules_of(src) == {('sgs-demo__a', None), ('sgs-demo__b', None)}


def test_assignment_in_the_same_branch_replaces():
    src = "$sel = '.sgs-demo__a';\n$sel = '.sgs-demo__b';\n$css = $sel . '{color:' . $attributes['c'] . '}';"
    assert rules_of(src) == {('sgs-demo__b', None)}


def test_appended_rules_split_across_statements():
    src = "$css = '.sgs-demo__a{position:relative;';\n$css .= 'color:' . $attributes['c'] . ';}';\n$out = $css;"
    assert rules_of(src) == {('sgs-demo__a', None)}


# ---------------------------------------------------------------- parameters, returns, args arrays, rule writers
FUNCS = """<?php
function demo_link_sel( $root, $bem ) { return $root . ' .' . $bem . '__link'; }
function demo_item_css( $attributes, $uid_sel, $bem_root ) {
	$css = '';
	$link_sel = $uid_sel . ' .' . $bem_root . '__link';
	$css .= $link_sel . '::before{background-color:' . $attributes['c'] . ';}';
	return $css;
}
function demo_lines( $args ) { return $args['item'] . ':not(:first-child)::before{border-color:' . $args['colour'] . '}'; }
function demo_hover_rules( $selector, $decls, $suffix = '' ) {
	$parts = array_map( 'trim', explode( ',', $selector ) );
	$hover = implode( ',', array_map( static function ( $part ) use ( $suffix ) { return $part . ':hover' . $suffix; }, $parts ) );
	return $hover . '{' . $decls . '}';
}
"""


def test_parameter_bound_at_the_call_site(monkeypatch):
    src = UID + "$css = demo_item_css( $attributes, '.' . $uid, 'sgs-demo' );"
    assert rules_of(src, monkeypatch, FUNCS) == {('sgs-demo__link::before', None)}


def test_unbound_parameter_stays_unknown(monkeypatch):
    src = "$css = demo_item_css( $attributes, '.' . $uid_sel_nowhere );"
    assert rules_of(src, monkeypatch, FUNCS) == {(None, None)}


def test_value_returned_by_a_helper(monkeypatch):
    src = "$sel = demo_link_sel( '.sgs-demo', 'sgs-demo' );\n$css = $sel . '{color:' . $attributes['c'] . '}';"
    assert rules_of(src, monkeypatch, FUNCS) == {('sgs-demo__link', None)}


def test_selector_passed_in_an_args_array(monkeypatch):
    src = "$css = demo_lines( array( 'item' => '.sgs-demo__menu > .sgs-demo__subitem', 'colour' => $attributes['c'] ) );"
    assert rules_of(src, monkeypatch, FUNCS) == {('sgs-demo__subitem::before', None)}


def test_args_array_missing_key_stays_unknown(monkeypatch):
    src = "$css = demo_lines( array( 'other' => '.sgs-demo__x', 'colour' => $attributes['c'] ) );"
    assert rules_of(src, monkeypatch, FUNCS) == {(None, None)}


def test_rule_writer_with_a_pseudo_element_suffix(monkeypatch):
    src = "$css = demo_hover_rules( '.sgs-demo__a, .sgs-demo__b', 'background-color:' . $attributes['c'], '::after' );"
    assert rules_of(src, monkeypatch, FUNCS) == {('sgs-demo__a::after', ':hover'), ('sgs-demo__b::after', ':hover')}


def test_rule_writer_default_suffix(monkeypatch):
    src = "$css = demo_hover_rules( '.sgs-demo__a', 'color:' . $attributes['c'] );"
    assert rules_of(src, monkeypatch, FUNCS) == {('sgs-demo__a', ':hover')}


# ---------------------------------------------------------------- selectors
def test_bare_tag_keeps_its_classed_ancestor():
    assert E.analyse_selector('.sgs-demo-\x01 .sgs-demo__icon svg', 'demo')[0] == 'sgs-demo__icon svg'
    assert E.analyse_selector('svg', 'demo')[0] is None


def test_state_modifier_is_a_state():
    assert E.analyse_selector('.sgs-demo__step--active .sgs-demo__label', 'demo')[:2] == ('sgs-demo__label', 'active')
    assert E.analyse_selector('.sgs-demo--wide .sgs-demo__label', 'demo')[:2] == ('sgs-demo__label', None)


# ---------------------------------------------------------------- precedence
def block(tmp_path, elements, render):
    d = tmp_path / 'demo'
    d.mkdir()
    (d / 'block.json').write_text(json.dumps({'name': 'sgs/demo', 'attributes': {'c': {'type': 'string'}}, 'supports': {'sgs': {'elements': elements}}}), encoding='utf-8')
    (d / 'render.php').write_text(render, encoding='utf-8')
    return Scan('demo', blocks_dir=tmp_path).run().to_json()


HINT = {'x': {'attrMap': {'css:color': 'c'}}}
DECL = {'x': {'selector': '.sgs-demo__x', 'attrMap': {'css:color': 'c'}}}
CODE = "<?php\n$css = '.sgs-demo__y{color:' . $attributes['c'] . '}';\n"


def test_hint_alone_places_nothing(tmp_path):
    j = block(tmp_path, HINT, '<?php\n')
    assert 'c' not in j['settings'] and j['hints']['c'][0]['part'] == 'sgs-demo__x'


def test_declaration_with_selector_places_when_code_is_silent(tmp_path):
    j = block(tmp_path, DECL, '<?php\n')
    assert [p['part'] for p in j['settings']['c']] == ['sgs-demo__x']


def test_code_outranks_a_declaration(tmp_path):
    j = block(tmp_path, DECL, CODE)
    assert [p['part'] for p in j['settings']['c']] == ['sgs-demo__y']
    assert j['conflicts'] == [{'setting': 'c', 'declared': 'sgs-demo__x', 'code': ['sgs-demo__y']}]


def test_agreeing_declaration_is_recorded_not_duplicated(tmp_path):
    j = block(tmp_path, {'y': {'selector': '.sgs-demo__y', 'attrMap': {'css:color': 'c'}}}, CODE)
    assert [(p['part'], p['mechanism'], p.get('declarationAgrees')) for p in j['settings']['c']] == [('sgs-demo__y', 'rule', True)]


def test_unknown_selector_is_not_replaced_by_the_root(tmp_path):
    j = block(tmp_path, {}, "<?php\n$css = $sel_from_nowhere . '{color:' . $attributes['c'] . '}';\n")
    (p,) = j['settings']['c']
    assert p['part'] is None and 'unknown' in p
