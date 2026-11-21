"""Tests for cascade.py: media conditions, selector specificity, layer order, held states."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402

import cascade as C  # noqa: E402


def winner(soup, css, selector, prop, width=1440, held=(), conditions=frozenset(), layered=False, pseudo=None):
    rules = C.flatten(css, 1, 0, layered)
    casc = C.Cascade(soup, rules, held)
    el = soup.select_one(selector)
    won = None
    for _, p, v, _ in casc.declared(el, pseudo, width, conditions):
        if p == prop:
            won = v
    return won


def soup_of(html):
    return BeautifulSoup(html, 'html.parser')


# ---------------------------------------------------------------- nested @media and conditions
NESTED = '.a{color:red; @media (forced-colors: active){color:blue}}'


def test_nested_media_keeps_its_condition_in_the_rule():
    rules = C.flatten(NESTED, 1, 0)
    medias = sorted(r.media for r in rules)
    assert medias == [(), ('(forced-colors: active)',)]


def test_nested_forced_colors_is_false_by_default_and_true_with_the_condition():
    s = soup_of('<div class="a"></div>')
    assert winner(s, NESTED, '.a', 'color') == 'red'
    assert winner(s, NESTED, '.a', 'color', conditions={'forced-colors'}) == 'blue'


def test_must_fail_condition_set_is_ignored():
    # MUST FAIL if media_holds ignores `conditions` (the forced-colors rule then never wins with the condition set),
    # or if the default stops treating a condition query as false (blue would win on a plain screen).
    s = soup_of('<div class="a"></div>')
    assert winner(s, NESTED, '.a', 'color', conditions=frozenset()) != 'blue'
    assert winner(s, NESTED, '.a', 'color', conditions={'forced-colors'}) == 'blue'


def test_not_of_a_held_condition_fails():
    assert C.media_holds(('not (forced-colors: active)',), 1440, {'forced-colors'}) is False
    assert C.media_holds(('(forced-colors: active)',), 1440, {'forced-colors'}) is True
    assert C.media_holds(('(forced-colors: active)',), 1440) is False


@pytest.mark.parametrize('cond,name', [
    ('(prefers-reduced-motion: reduce)', 'prefers-reduced-motion-reduce'),
    ('(hover: none)', 'hover-none'),
    ('(pointer: coarse)', 'pointer-coarse'),
    ('print', 'print'),
    ('(prefers-color-scheme: dark)', 'prefers-color-scheme-dark'),
    ('(prefers-contrast: more)', 'prefers-contrast'),
])
def test_each_named_condition_holds_only_when_named(cond, name):
    assert C.media_holds((cond,), 800) is False
    assert C.media_holds((cond,), 800, {name}) is True
    assert C.media_holds((cond,), 800, {'forced-colors'} - {name}) is False


def test_condition_combines_with_width():
    q = ('(forced-colors: active) and (min-width: 768px)',)
    assert C.media_holds(q, 375, {'forced-colors'}) is False
    assert C.media_holds(q, 768, {'forced-colors'}) is True


def test_width_queries_unchanged():
    assert C.media_holds(('(min-width: 768px)',), 768) is True
    assert C.media_holds(('(min-width: 768px)',), 375) is False
    assert C.media_holds(('(max-width: 767px)',), 768) is False
    assert C.media_holds(('(prefers-reduced-motion: no-preference)',), 1440) is True
    assert C.media_holds(('container (min-width: 100px)',), 1440, {'print'}) is False


def test_print_condition_fails_screen_only_queries():
    assert C.media_holds(('screen and (min-width: 100px)',), 1440, {'print'}) is False
    assert C.media_holds(('screen and (min-width: 100px)',), 1440) is True


# ---------------------------------------------------------------- specificity
@pytest.mark.parametrize('sel,expected', [
    ('.a', (0, 1, 0)),
    ('#x .a div', (1, 1, 1)),
    (':where(.a, #b) .c', (0, 1, 0)),
    (':is(.a, #b) .c', (1, 1, 0)),
    (':not(.a)', (0, 1, 0)),
    (':not(#a, .b)', (1, 0, 0)),
    (':has(> .a.b)', (0, 2, 0)),
    ('a:hover::before', (0, 1, 2)),
    ('[type="x"]', (0, 1, 0)),
])
def test_specificity(sel, expected):
    assert C.specificity(sel) == expected


def test_must_fail_where_counts_as_specific():
    # MUST FAIL if :where() starts adding its argument's specificity: the :where() rule would then beat the
    # later, plain-class rule it must lose to.
    css = ':where(#x) .a{color:red} .a{color:blue}'
    s = soup_of('<div id="x"><p class="a"></p></div>')
    assert winner(s, css, '.a', 'color') == 'blue'


def test_higher_specificity_beats_later_order():
    css = '#x .a{color:red} .a{color:blue}'
    s = soup_of('<div id="x"><p class="a"></p></div>')
    assert winner(s, css, '.a', 'color') == 'red'


# ---------------------------------------------------------------- layers and importance
def test_unlayered_beats_layered_whatever_the_order():
    css = '@layer base{.a{color:red}} .a{color:blue}'
    s = soup_of('<div class="a"></div>')
    assert winner(s, css, '.a', 'color') == 'blue'
    css2 = '.a{color:blue} @layer base{.a{color:red}}'
    assert winner(s, css2, '.a', 'color') == 'blue'


def test_must_fail_layer_order_flattened():
    # MUST FAIL if @layer rules were treated as unlayered: the later layered rule would then win over the earlier
    # unlayered one (red instead of blue).
    css = '.a{color:blue} @layer base{.a{color:red}}'
    s = soup_of('<div class="a"></div>')
    assert winner(s, css, '.a', 'color') == 'blue'


def test_important_in_a_layer_beats_important_unlayered():
    css = '@layer base{.a{color:red !important}} .a{color:blue !important}'
    s = soup_of('<div class="a"></div>')
    assert winner(s, css, '.a', 'color') == 'red'


def test_layered_start_argument_marks_every_rule_layered():
    rules = C.flatten('.a{color:red}', 1, 0, layered=True)
    assert rules[0].layered is True


# ---------------------------------------------------------------- held states
HOVER_CSS = '.a{color:red} .a:hover{color:blue} .a:not(:hover){background:green}'


def test_hover_not_held_never_matches():
    s = soup_of('<a class="a"></a>')
    assert winner(s, HOVER_CSS, '.a', 'color') == 'red'
    assert winner(s, HOVER_CSS, '.a', 'background') == 'green'


def test_held_hover_matches_hover_and_fails_not_hover():
    s = soup_of('<a class="a"></a>')
    assert winner(s, HOVER_CSS, '.a', 'color', held={'hover'}) == 'blue'
    assert winner(s, HOVER_CSS, '.a', 'background', held={'hover'}) is None


def test_must_fail_held_ignored():
    # MUST FAIL if `held` is not applied: hover would stay NEVER and blue could not win with hover held.
    s = soup_of('<a class="a"></a>')
    assert winner(s, '.a:hover{color:blue}', '.a', 'color', held=()) is None
    assert winner(s, '.a:hover{color:blue}', '.a', 'color', held={'hover'}) == 'blue'


def test_held_focus_family_and_other_states():
    s = soup_of('<button class="a"></button>')
    css = '.a:focus-visible{color:red} .a:active{color:green} .a:checked{color:pink} .a:disabled{color:grey}'
    assert winner(s, css, '.a', 'color', held={'focus'}) == 'red'
    assert winner(s, css, '.a', 'color', held={'active'}) == 'green'
    assert winner(s, css, '.a', 'color', held={'checked'}) == 'pink'
    assert winner(s, css, '.a', 'color', held={'disabled'}) == 'grey'
    assert winner(s, css, '.a', 'color') is None
    assert winner(s, css, '.a', 'color', held={'hover'}) is None   # a state that is not held never matches
    # :disabled that is not held still matches the markup as rendered
    d = soup_of('<button class="a" disabled></button>')
    assert winner(d, css, '.a', 'color', held={'hover'}) == 'grey'


def test_aria_tokens():
    s = soup_of('<button class="b" aria-expanded="false"></button>')
    css = '.b[aria-expanded="true"]{color:red} .b[aria-expanded="false"]{background:green} .b[aria-expanded]{border:1px}'
    assert winner(s, css, '.b', 'color') is None
    assert winner(s, css, '.b', 'color', held={'open'}) == 'red'
    # aria-expanded="false" is the markup as rendered: holding "open" does not replace it
    assert C.resting('.b[aria-expanded="false"]', {'open'}) == '.b[aria-expanded="false"]'
    assert C.resting("[aria-expanded='false']", {'open'}) == "[aria-expanded='false']"
    assert C.resting('.b[aria-expanded]', {'open'}) == '.b' + C.ALWAYS
    assert C.resting('[aria-current="page"]', {'current'}) == C.ALWAYS
    assert C.resting('[aria-selected=true]', {'checked'}) == C.ALWAYS
    assert C.resting('[aria-current="page"]', {'hover'}) == '[aria-current="page"]'


def test_must_fail_aria_false_replaced():
    # MUST FAIL if an aria-*="false" token is replaced when its state is held: [aria-expanded="false"] would then
    # match every element, including the open one.
    assert C.resting('.b[aria-expanded="false"]', {'open'}) != '.b' + C.ALWAYS


def test_is_class_open_attribute_and_bem_modifier_tokens():
    held = {'open', 'current', 'active'}
    assert C.resting('.x.is-open', held) == '.x' + C.ALWAYS
    assert C.resting('.x.is-style-outline', held) == '.x.is-style-outline'
    assert C.resting('.x[open]', held) == '.x' + C.ALWAYS
    assert C.resting('.x[open]', {'hover'}) == '.x[open]'
    assert C.resting('.sgs-nav-bar-menu__link--current', held) == C.ALWAYS
    assert C.resting('.sgs-nav-bar-menu__link--active', {'hover'}) == '.sgs-nav-bar-menu__link--active'
    assert C.resting('.sgs-nav-bar-menu--open', {'open'}) == C.ALWAYS
    assert C.resting('.x:is(.is-active)', {'active'}) == '.x:is(' + C.ALWAYS + ')'


def test_markup_tokens_not_held_match_the_markup():
    s = soup_of('<li class="i is-open"></li>')
    assert winner(s, '.i.is-open{color:red}', '.i', 'color') == 'red'
    s2 = soup_of('<li class="i"></li>')
    assert winner(s2, '.i.is-open{color:red}', '.i', 'color') is None
    assert winner(s2, '.i.is-open{color:red}', '.i', 'color', held={'open'}) == 'red'


def test_default_resting_is_unchanged():
    assert C.resting('a:hover') == 'a' + C.NEVER
    assert C.resting('a:link') == 'a[href]'
    assert C.resting('a:dir(ltr)') == 'a'
    assert C.resting('a:-webkit-any-link') == 'a' + C.NEVER
    assert C.resting('a:visited') == 'a' + C.NEVER
    assert C.resting('a:visited', {'hover'}) == 'a' + C.NEVER


# ---------------------------------------------------------------- flatten shapes
def test_nesting_supports_and_pseudo_elements():
    css = '.a{color:red; &:hover{color:blue} .b{color:green}} @supports (display:grid){.c{display:grid}} .d::before{content:"x"}'
    rules = C.flatten(css, 1, 0)
    sels = {(r.selector, r.pseudo) for r in rules}
    assert (':is(.a):hover', None) in sels or ('.a:hover', None) in sels or any('hover' in s for s, _ in sels)
    assert ('.c', None) in sels
    assert ('.d', 'before') in sels


def test_important_beats_later_normal():
    s = soup_of('<div class="a"></div>')
    assert winner(s, '.a{color:red !important} .a{color:blue}', '.a', 'color') == 'red'


def test_required_classes_ignore_functional_pseudo_classes():
    assert C.required_classes('.a .b:not(.c)') == frozenset({'a', 'b'})
    assert C.required_classes(':is(.a, .x) .b:where(.y) :has(.z)') == frozenset({'b'})
    assert C.required_classes('.a[data-x="y.z"]') == frozenset({'a'})


def test_prefilter_must_fail_rule_with_optional_class_still_matches():
    # Breaks if required_classes counted classes inside :not()/:is(): the rule below needs no `.c` and must still
    # match an element without it, so a prefilter that read `.c` as required would drop a live rule.
    from bs4 import BeautifulSoup
    soup = BeautifulSoup('<div class="a"><span class="b">x</span></div>', 'html.parser')
    rules = C.flatten('.a .b:not(.c){color:red} .a :is(.c, .b){color:blue} .q .b{color:green}', 1, 0)
    cas = C.Cascade(soup, rules)
    got = [v for _, p, v, _ in cas.declared(soup.select_one('.b'), None, 1440) if p == 'color']
    assert sorted(got) == ['blue', 'red']  # both rules apply; .q .b (no .q on the page) does not
