"""Tests for computed.py: inheritance, var(), shorthand expansion, pseudo-elements, currentcolor."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import computed as K  # noqa: E402


def page(html, css, short='t', **kw):
    return K.Page(html, [css], short, **kw)


def el(p, selector):
    return p.soup.select_one(selector)


def test_colour_inherits_and_a_child_can_override():
    p = page('<div class="sgs-t"><p class="x"><span class="y"></span></p><p class="z"></p></div>',
             '.sgs-t{color:#ff0000} .z{color:#0000ff}')
    assert p.computed(el(p, '.y'), None, 1440)['color'] == 'rgb(255, 0, 0)'
    assert p.computed(el(p, '.z'), None, 1440)['color'] == 'rgb(0, 0, 255)'


def test_must_fail_inheritance_removed():
    # MUST FAIL if INHERITED lost `color` (or the inherit branch broke): the span would read the initial black.
    p = page('<div class="sgs-t"><span class="y"></span></div>', '.sgs-t{color:#ff0000}')
    assert p.computed(el(p, '.y'), None, 1440)['color'] != 'rgb(0, 0, 0)'
    assert 'color' in K.INHERITED


def test_non_inherited_property_stays_initial():
    p = page('<div class="sgs-t"><span class="y"></span></div>', '.sgs-t{background-color:#ff0000;padding:4px}')
    c = p.computed(el(p, '.y'), None, 1440)
    assert c['background-color'] == 'rgba(0, 0, 0, 0)'
    assert c['padding-top'] == '0px'


def test_var_through_custom_properties_with_fallback():
    css = '.sgs-t{--a:var(--b, 12px);--b:7px} .y{padding-top:var(--a);margin-top:var(--missing, 3px);padding-left:var(--nope)}'
    p = page('<div class="sgs-t"><i class="y"></i></div>', css)
    c = p.computed(el(p, '.y'), None, 1440)
    assert c['padding-top'] == '7px'          # --a is var(--b), --b is defined on the same element
    assert c['margin-top'] == '3px'           # fallback used
    assert c['padding-left'] == '0px'         # no value, no fallback: invalid, so the initial value


def test_must_fail_var_not_substituted():
    # MUST FAIL if var() is left unresolved: padding-top would read 'var(--a)'.
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.sgs-t{--a:9px} .y{padding-top:var(--a)}')
    assert p.computed(el(p, '.y'), None, 1440)['padding-top'] == '9px'


def test_custom_property_inherits_down_the_tree():
    p = page('<div class="sgs-t"><div><i class="y"></i></div></div>', '.sgs-t{--gap:5px} .y{column-gap:var(--gap)}')
    assert p.computed(el(p, '.y'), None, 1440)['column-gap'] == '5px'


def test_flex_one_expands():
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.y{flex:1}')
    c = p.computed(el(p, '.y'), None, 1440)
    assert (c['flex-grow'], c['flex-shrink'], c['flex-basis']) == ('1', '1', '0%')
    assert K.expand('flex', 'none') == {'flex-grow': '0', 'flex-shrink': '0', 'flex-basis': 'auto'}
    assert K.expand('flex', '2 3 10px') == {'flex-grow': '2', 'flex-shrink': '3', 'flex-basis': '10px'}


def test_must_fail_flex_shorthand_not_expanded():
    # MUST FAIL if `flex` is no longer expanded: flex-grow would read the initial 0 instead of 1.
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.y{flex:1}')
    assert p.computed(el(p, '.y'), None, 1440)['flex-grow'] == '1'


def test_other_shorthands():
    assert K.expand('padding', '1px 2px') == {'padding-top': '1px', 'padding-right': '2px', 'padding-bottom': '1px', 'padding-left': '2px'}
    assert K.expand('border', '2px solid red')['border-left-style'] == 'solid'
    assert K.expand('gap', '4px 8px') == {'row-gap': '4px', 'column-gap': '8px'}
    assert K.expand('margin-inline', '1px') == {'margin-left': '1px', 'margin-right': '1px'}
    assert K.expand('overflow', 'hidden auto') == {'overflow-x': 'hidden', 'overflow-y': 'auto'}


def test_pseudo_element_with_content_none_is_absent():
    p = page('<div class="sgs-t"></div>', '.sgs-t::before{content:none;color:red} .sgs-t::after{content:"x"}')
    root = p.root
    assert p.computed(root, 'before', 1440)['_absent'] is True
    assert '_absent' not in p.computed(root, 'after', 1440)
    # no rule at all: content stays normal, so the pseudo-element is absent too
    q = page('<div class="sgs-t"></div>', '.sgs-t{color:red}')
    assert q.computed(q.root, 'before', 1440)['_absent'] is True


def test_must_fail_pseudo_with_content_is_not_absent():
    # MUST FAIL if _absent is set whatever the content: the ::after with content "x" would read as absent.
    p = page('<div class="sgs-t"></div>', '.sgs-t::after{content:"x"}')
    assert not p.computed(p.root, 'after', 1440).get('_absent')


def test_currentcolor_resolves_against_own_colour():
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.y{color:#00ff00;border:2px solid currentcolor;background-color:currentColor;outline-color:currentcolor}')
    c = p.computed(el(p, '.y'), None, 1440)
    assert c['border-top-color'] == 'rgb(0, 255, 0)'
    assert c['background-color'] == 'rgb(0, 255, 0)'
    assert c['outline-color'] == 'rgb(0, 255, 0)'


def test_currentcolor_inherited_resolves_against_the_child_colour():
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.sgs-t{color:#ff0000;border-color:currentcolor;border-style:solid} .y{color:#0000ff;border-style:solid;border-color:inherit}')
    c = p.computed(el(p, '.y'), None, 1440)
    assert c['border-top-color'] == 'rgb(0, 0, 255)'


def test_units_resolve():
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.sgs-t{font-size:20px} .y{padding-top:1.5em;margin-top:2rem;width:calc(10px + 1rem);min-height:clamp(1px, 50vw, 90px)}')
    c = p.computed(el(p, '.y'), None, 375)
    assert c['padding-top'] == '30px'
    assert c['margin-top'] == '32px'
    assert c['width'] == '26px'
    assert c['min-height'] == '90px'
    assert p.computed(el(p, '.y'), None, 100)['min-height'] == '50px'


def test_width_tier_applies():
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.y{padding-top:1px} @media (min-width:768px){.y{padding-top:9px}}')
    assert p.computed(el(p, '.y'), None, 375)['padding-top'] == '1px'
    assert p.computed(el(p, '.y'), None, 768)['padding-top'] == '9px'


def test_wordpress_block_class_is_added_to_the_root():
    p = page('<div class="sgs-t"></div>', '.wp-block-sgs-t{color:#123456}')
    assert p.computed(p.root, None, 1440)['color'] == 'rgb(18, 52, 86)'


def test_held_and_conditions_reach_the_cascade():
    html = '<div class="sgs-t"><a class="y"></a></div>'
    css = '.y{color:#ff0000} .y:hover{color:#0000ff} @media (forced-colors:active){.y{color:#00ff00}}'
    plain = page(html, css)
    assert plain.computed(el(plain, '.y'), None, 1440)['color'] == 'rgb(255, 0, 0)'
    p = page(html, css, held={'hover'})
    assert p.computed(el(p, '.y'), None, 1440)['color'] == 'rgb(0, 0, 255)'
    q = page(html, css, conditions={'forced-colors'})
    assert q.computed(el(q, '.y'), None, 1440)['color'] == 'rgb(0, 255, 0)'


def test_must_fail_conditions_not_passed_to_cascade():
    # MUST FAIL if Page does not hand `conditions` to Cascade.declared: the forced-colors colour would never apply.
    html = '<div class="sgs-t"><a class="y"></a></div>'
    css = '.y{color:#ff0000} @media (forced-colors:active){.y{color:#00ff00}}'
    q = page(html, css, conditions={'forced-colors'})
    assert q.computed(el(q, '.y'), None, 1440)['color'] == 'rgb(0, 255, 0)'
    plain = page(html, css)
    assert plain.computed(el(plain, '.y'), None, 1440)['color'] == 'rgb(255, 0, 0)'


# ---------------------------------------------------------------- raw, value, elements
def test_raw_includes_properties_absent_from_initial():
    css = '.sgs-t{--c:4s} .y{animation-name:spin;touch-action:none;transition:opacity var(--c) ease;padding:2px 3px}'
    p = page('<div class="sgs-t"><i class="y"></i></div>', css)
    raw = p.raw(el(p, '.y'), None, 1440)
    assert raw['touch-action'] == 'none'
    assert raw['animation-name'] == 'spin'
    assert raw['transition-duration'] == '4s'
    assert raw['padding-left'] == '3px'
    assert 'touch-action' not in p.computed(el(p, '.y'), None, 1440)
    assert not any(k.startswith('--') for k in raw)


def test_must_fail_value_falls_back_to_raw_only_outside_initial():
    # MUST FAIL if value() returns raw for a property INITIAL lists: `color` would read '#f00' instead of rgb(...).
    p = page('<div class="sgs-t"><i class="y"></i></div>', '.y{color:#f00;touch-action:none}')
    y = el(p, '.y')
    assert p.value(y, None, 'color', 1440) == 'rgb(255, 0, 0)'
    assert p.value(y, None, 'touch-action', 1440) == 'none'
    assert p.value(y, None, 'scroll-snap-stop', 1440) is None


def test_elements_part_keys():
    html = ('<div class="sgs-t"><span class="sgs-t__a"><svg><path/></svg></span><span class="sgs-t__a sgs-t__a--on"></span>'
            '<button class="sgs-t__b"><svg></svg></button></div>')
    p = page(html, '')
    assert p.elements('ROOT') == [(p.root, None)]
    assert p.elements('ROOT::after') == [(p.root, 'after')]
    assert len(p.elements('sgs-t__a')) == 2
    assert [e.name for e, _ in p.elements('sgs-t__a svg')] == ['svg']
    assert [(e.name, ps) for e, ps in p.elements('sgs-t__b::before')] == [('button', 'before')]
    assert p.elements('sgs-t__missing') == []
    assert [e.name for e, _ in p.elements('svg')] == ['svg', 'svg']
