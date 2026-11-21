"""Tests for selftest.py: the fault pickers and the judge (no render; the full self-test is `check.py --self-test`)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import selftest as S  # noqa: E402

CSS = """/* head { color: red; } */
.sgs-button {
	border-color: var(--sgs-btn-border, transparent); /* x */
	color: var(--sgs-btn-color, red);
}
.sgs-button:hover,
.sgs-button:focus-visible:where(:not(.a, .b)) {
	color: var(--sgs-btn-color-hover, blue);
}
@media (max-width: 600px) {
	.sgs-button { color: green; }
}
"""


def entry(setting, part, props, state=None, tiers=(), selector='.sgs-button', kind='value'):
    return {'setting': setting, 'part': part, 'props': props, 'state': state, 'tiers': list(tiers), 'selector': selector, 'kind': kind}


RECORD = {'block': 'sgs/button', 'schemaVersion': 1, 'parts': ['sgs-button__label'], 'entries': [
    entry('borderColour', 'ROOT', ['border-color']),
    entry('colourHover', 'ROOT', ['color'], 'hover', selector='.sgs-button:hover'),
]}


def make_plugin(tmp_path, render):
    tmp_path.mkdir(exist_ok=True)
    (tmp_path / 'includes').mkdir()
    (tmp_path / 'includes' / 'h.php').write_text("<?php $x = '--sgs-btn-border:';", encoding='utf-8')
    b = tmp_path / 'src' / 'blocks' / 'button'
    b.mkdir(parents=True)
    (b / 'render.php').write_text(render, encoding='utf-8')
    return tmp_path


def test_top_rules_skip_at_rules_and_comments():
    rules = S.top_rules(CSS)
    assert [r['selectors'] for r in rules] == [['.sgs-button'], ['.sgs-button:hover', '.sgs-button:focus-visible:where(:not(.a, .b))']]
    assert [d['prop'] for d in rules[0]['decls']] == ['border-color', 'color']


def test_delete_rule_cuts_exactly_one_declaration(tmp_path):
    plugin = make_plugin(tmp_path, '<?php')
    f = S.pick_delete_rule(CSS, RECORD, plugin)
    assert f['expect'] == {'kind': 'remove', 'setting': 'borderColour', 'part': 'ROOT', 'props': ['border-color']}
    p = tmp_path / 'x.css'
    p.write_text(CSS, encoding='utf-8')
    S.apply_edit(p, f['edit'])
    new = p.read_text(encoding='utf-8')
    assert 'border-color' not in new and new.count('color:') == CSS.count('color:') - 1


def test_rename_selector_changes_only_the_hover_of_the_entry(tmp_path):
    f = S.pick_rename_selector(CSS, RECORD)
    assert f['expect'] == {'kind': 'state', 'setting': 'colourHover', 'part': 'ROOT', 'state': 'active'}
    p = tmp_path / 'x.css'
    p.write_text(CSS, encoding='utf-8')
    S.apply_edit(p, f['edit'])
    assert p.read_text(encoding='utf-8') == CSS.replace('.sgs-button:hover,', '.sgs-button:active,')


def test_rename_selector_fails_without_a_candidate():
    with pytest.raises(S.NoCandidate):
        S.pick_rename_selector(CSS, {**RECORD, 'entries': [RECORD['entries'][0]]})


def test_add_declaration_reads_a_written_property(tmp_path):
    plugin = make_plugin(tmp_path, '<?php')
    f = S.pick_add_declaration(CSS, RECORD, plugin)
    assert f['expect'] == {'kind': 'add', 'part': 'sgs-button__label', 'prop': 'outline-color'}
    assert f['edit'][1].strip() == '.sgs-button .sgs-button__label { outline-color: var(--sgs-btn-border); }'


def test_drop_part_class_needs_exactly_one_literal(tmp_path):
    plugin = make_plugin(tmp_path, "<?php echo '<span class=\"sgs-button__label\">x</span>'; $c = ' .sgs-button__label';")
    f = S.pick_drop_part_class(plugin, RECORD)
    p = plugin / f['file']
    S.apply_edit(p, f['edit'])
    assert p.read_text(encoding='utf-8') == "<?php echo '<span>x</span>'; $c = ' .sgs-button__label';"
    twice = make_plugin(tmp_path / 'b', "<?php 'class=\"sgs-button__label\"'; 'class=\"a sgs-button__label\"';")
    with pytest.raises(S.NoCandidate):
        S.pick_drop_part_class(twice, RECORD)


def test_drop_part_class_keeps_the_other_classes(tmp_path):
    plugin = make_plugin(tmp_path, "<?php echo '<span class=\"a sgs-button__label b\">';")
    f = S.pick_drop_part_class(plugin, RECORD)
    p = plugin / f['file']
    S.apply_edit(p, f['edit'])
    assert p.read_text(encoding='utf-8') == "<?php echo '<span class=\"a b\">';"


def test_judge_needs_the_named_finding():
    fault = {'expect': {'kind': 'remove', 'setting': 'borderColour', 'part': 'ROOT', 'props': ['border-color']}}
    gone = {'setting': 'borderColour', 'part': 'ROOT', 'props': ['border-color'], 'state': None, 'tiers': []}
    assert S.judge(fault, {'remove': [gone]})[0]
    assert not S.judge(fault, {'remove': [{**gone, 'setting': 'other'}]})[0]
    assert not S.judge(fault, {})[0]
    part = {'expect': {'kind': 'part', 'part': 'sgs-button__label'}}
    assert S.judge(part, {'parts': {'orderChanged': {'record': ['sgs-button__label'], 'code': []}}})[0]
    assert not S.judge(part, {'parts': {'orderChanged': {'record': ['sgs-button__label'], 'code': ['sgs-button__label']}}})[0]
    state = {'expect': {'kind': 'state', 'setting': 'colourHover', 'part': 'ROOT', 'state': 'active'}}
    assert S.judge(state, {'change': [{'setting': 'colourHover', 'part': 'ROOT', 'props': ['color'], 'record': [['hover', []]], 'code': [['active', []]]}]})[0]
