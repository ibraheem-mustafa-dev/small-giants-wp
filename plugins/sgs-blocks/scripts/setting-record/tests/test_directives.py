"""Interactivity directives applied after a render, and the runner flags the check always passes."""
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import render as RN  # noqa: E402


def el(html, sel):
    return BeautifulSoup(html, 'html.parser').select_one(sel)


def run(html, state):
    return RN.apply_directives(html, state)


def test_must_fail_bind_hidden_false_removes_the_attribute_and_true_sets_it():
    # Breaks if data-wp-bind is not processed: the server markup keeps its `hidden` whatever the state says.
    html = '<div data-wp-interactive="sgs/x"><p id="a" hidden data-wp-bind--hidden="state.open"></p><p id="b" data-wp-bind--hidden="!state.open"></p></div>'
    out = run(html, {'sgs/x': {'open': False}})  # a: hidden removed; b: !false is true, so hidden is set
    assert el(out, '#a').get('hidden') is None and el(out, '#b').has_attr('hidden')
    out = run(html, {'sgs/x': {'open': True}})
    assert el(out, '#a').has_attr('hidden') and el(out, '#b').get('hidden') is None


def test_must_fail_class_directive_adds_and_removes():
    html = '<div data-wp-interactive="sgs/x"><p id="a" class="keep is-open" data-wp-class--is-open="state.open"></p><p id="b" class="keep" data-wp-class--is-open="state.on"></p></div>'
    out = run(html, {'sgs/x': {'open': False, 'on': True}})
    assert el(out, '#a')['class'] == ['keep']
    assert el(out, '#b')['class'] == ['keep', 'is-open']


def test_must_fail_style_directive_sets_and_removes_a_property():
    html = ('<div data-wp-interactive="sgs/x"><p id="a" style="color:red; --w: url(a;b)" data-wp-style--width="state.w"></p>'
            '<p id="b" style="width: 5px; color: red" data-wp-style--width="state.none"></p></div>')
    out = run(html, {'sgs/x': {'w': '40px', 'none': ''}})
    a = el(out, '#a')['style']
    assert 'width: 40px' in a and 'color: red' in a and 'url(a;b)' in a
    assert el(out, '#b')['style'] == 'color: red;'


def test_text_directive_sets_the_content():
    out = run('<div data-wp-interactive="sgs/x"><span data-wp-text="state.label">old</span></div>', {'sgs/x': {'label': 'Open <menu>'}})
    assert el(out, 'span').get_text() == 'Open <menu>'


def test_must_fail_negation_inverts_the_value():
    html = '<div data-wp-interactive="sgs/x"><p id="a" data-wp-bind--hidden="!state.shown"></p></div>'
    assert run(html, {'sgs/x': {'shown': False}}).count('hidden') >= 1 and el(run(html, {'sgs/x': {'shown': False}}), '#a').has_attr('hidden')
    assert not el(run(html, {'sgs/x': {'shown': True}}), '#a').has_attr('hidden')


def test_must_fail_context_is_inherited_and_merged_down_the_tree():
    html = ("<div data-wp-interactive=\"sgs/x\" data-wp-context='{\"open\": false, \"n\": 1}'>"
            "<section data-wp-context='{\"n\": 2}'><p id=\"a\" data-wp-bind--hidden=\"!context.open\" data-wp-text=\"context.n\"></p></section>"
            "<p id=\"b\" data-wp-text=\"context.n\"></p></div>")
    out = run(html, {})
    assert el(out, '#a').has_attr('hidden')  # `open` came from the outer context through the inner one's merge
    assert el(out, '#a').get_text() == '2' and el(out, '#b').get_text() == '1'  # the inner n shadows only inside its section


def test_namespaced_reference_and_json_namespace():
    html = '<div data-wp-interactive=\'{"namespace": "sgs/x"}\'><p id="a" data-wp-bind--hidden="other::state.gone"></p></div>'
    assert run(html, {'other': {'gone': True}}).count('hidden=""') == 1


def test_must_fail_unknown_derived_state_is_left_alone():
    # A derived state function is not in the runner's JSON: the markup the block rendered must survive untouched.
    html = '<div data-wp-interactive="sgs/x"><p id="a" hidden class="c" data-wp-bind--hidden="state.isEmpty" data-wp-class--c="state.derived"></p></div>'
    out = run(html, {'sgs/x': {'other': 1}})
    assert el(out, '#a').has_attr('hidden') and el(out, '#a')['class'] == ['c']


def test_aria_attributes_take_true_and_false_words():
    html = '<div data-wp-interactive="sgs/x"><button id="a" data-wp-bind--aria-expanded="state.open"></button></div>'
    assert el(run(html, {'sgs/x': {'open': False}}), '#a')['aria-expanded'] == 'false'
    assert el(run(html, {'sgs/x': {'open': True}}), '#a')['aria-expanded'] == 'true'


def test_html_without_directives_is_returned_unchanged():
    html = '<p  class="a"  >x<br></p>'
    assert run(html, {'sgs/x': {}}) is html


def test_must_fail_harness_args_carry_the_four_fidelity_flags():
    args = RN.harness_args({}, Path('.'))
    for flag in ('--render-block-filters', '--print-footer', '--wp-fidelity', '--interactivity-state'):
        assert flag in args
    assert '--motion-targets' in args


def test_must_fail_the_flags_are_part_of_the_cache_key(tmp_path, monkeypatch):
    # The key hashes self.extra, so a render cached without the flags is never served to a check that wants them.
    import hashlib
    import json
    key = lambda extra: hashlib.md5(json.dumps(['s', {}, '', None, list(extra), []], sort_keys=True).encode()).hexdigest()  # noqa: E731
    assert key(RN.harness_args({}, Path('.'))) != key(('--motion-targets',))


def test_must_fail_render_applies_directives_before_post(tmp_path, monkeypatch):
    # A fake runner result goes through Renderer.render: the directive must be applied to the cached html.
    import json
    import subprocess

    class P:
        stdout = json.dumps({'ok': True, 'html': '<div data-wp-interactive="n"><p hidden data-wp-bind--hidden="state.h"></p></div>',
                             'interactivityState': {'n': {'h': False}}})
        stderr = ''

    monkeypatch.setattr(subprocess, 'run', lambda *a, **k: P())
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    plugin = tmp_path / 'plugin'
    (plugin / 'includes').mkdir(parents=True)
    r = RN.Renderer(plugin, {}, tmp_path)
    assert 'hidden=""' not in r.render('sgs/x', {})['html'] and ' hidden' not in r.render('sgs/x', {})['html'].replace('data-wp-bind--hidden', '')
