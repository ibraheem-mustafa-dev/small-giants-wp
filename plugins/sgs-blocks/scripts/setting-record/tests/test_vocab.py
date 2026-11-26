"""Tests for vocab.py: the vocabulary rules."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import vocab as V  # noqa: E402
import score  # noqa: E402  (block-source-scan, put on the path by vocab)


def placement(part, props, tiers=(), state=None, mechanism='code-css'):
    return {'part': part, 'props': props, 'tiers': list(tiers), 'state': state, 'mechanism': mechanism}


def test_flex_is_its_three_longhands():
    assert V.canon_props('flex') == {'flex-grow', 'flex-shrink', 'flex-basis'}
    assert V.canon_props('css:flex') == {'flex-grow', 'flex-shrink', 'flex-basis'}
    assert V.canon_props('padding-left') == {'padding'}
    assert V.canon_props('flex-grow') == {'flex-grow'}


def test_must_fail_flex_left_whole():
    # MUST FAIL if canon_props defers `flex` to the reference: the reference keeps it as {'flex'}, so a
    # `flex-grow` written on its own would never meet a `flex` shorthand.
    assert V.canon_props('flex') != {'flex'}
    assert score.R.canon_props('flex') == {'flex'}   # the reference as it is (not patched)


def test_no_preference_tier_dropped_in_any_spacing():
    t = ['@media (prefers-reduced-motion: no-preference)', '@media(prefers-reduced-motion:no-preference)',
         '@media (prefers-reduced-motion:  no-preference)', '@media (min-width: 768px)', '@media (prefers-reduced-motion: reduce)']
    assert V.plain_tiers(t) == ['@media (min-width: 768px)', '@media (prefers-reduced-motion: reduce)']
    assert V.plain_tiers(None) == []


def test_must_fail_no_preference_kept():
    # MUST FAIL if no-preference stops being dropped: the tier would stay and the item would look conditional.
    assert V.plain_tiers(['@media (prefers-reduced-motion: no-preference)']) == []


def test_items_use_the_vocabulary_and_plain_tiers():
    ps = [placement('sgs-t__a', ['flex'], ['@media (prefers-reduced-motion: no-preference)']),
          placement('sgs-t__a', ['flex'], []),
          placement('sgs-t', ['padding-left'], ['@media (min-width: 768px)'])]
    got = V.items(ps, 'sgs-t')
    assert len(got) == 2  # the first two are one item once the no-preference tier is plain
    flex = next(i for i in got if i['part'] == 'sgs-t__a')
    assert flex['props'] == ['flex-basis', 'flex-grow', 'flex-shrink']
    assert flex['tiers'] == []
    root = next(i for i in got if i['part'] == 'ROOT')
    assert root['props'] == ['padding'] and root['tiers'] == ['@media (min-width: 768px)']
    # score.scan_items, by contrast, keeps flex whole and the tier
    ref = score.scan_items(ps, 'sgs-t')
    assert ref[0]['props'] == ['flex'] and ref[0]['tiers'] == ['@media (prefers-reduced-motion: no-preference)']


def test_fold_units_is_the_score_function():
    assert V.fold_units is score.fold_units
    out = V.fold_units({'gap': {}, 'gapUnit': {}}, {'gap': [1], 'gapUnit': [2]})
    assert out == {'gap': [1, 2]}


def item(part, props, state=None, tiers=()):
    return {'part': part, 'props': list(props), 'state': state, 'tiers': list(tiers), 'prop': '|'.join(props)}


def test_webkit_twin_folded():
    a = item('sgs-t', ['-webkit-line-clamp'])
    b = item('sgs-t', ['line-clamp'])
    kept, dropped = V.fold_prefixed([a, b])
    assert kept == [b] and dropped == [a]


def test_webkit_without_twin_or_with_other_part_state_tier_stays():
    a = item('sgs-t', ['-webkit-text-stroke-width'])
    assert V.fold_prefixed([a]) == ([a], [])
    for other in (item('sgs-u', ['line-clamp']), item('sgs-t', ['line-clamp'], state='hover'), item('sgs-t', ['line-clamp'], tiers=['@media (min-width: 1px)'])):
        w = item('sgs-t', ['-webkit-line-clamp'])
        assert V.fold_prefixed([w, other]) == ([w, other], [])


def test_must_fail_webkit_item_with_mixed_props_is_not_dropped():
    # MUST FAIL if the fold drops an item when only SOME of its props have a twin: the item below also paints
    # -webkit-text-stroke-width, which has no standard twin, so it has to stay.
    mixed = item('sgs-t', ['-webkit-line-clamp', '-webkit-text-stroke-width'])
    std = item('sgs-t', ['line-clamp'])
    kept, dropped = V.fold_prefixed([mixed, std])
    assert mixed in kept and dropped == []
    # and a plain item is never dropped
    assert V.fold_prefixed([std]) == ([std], [])


def test_burger_bar_two_classes_one_name():
    assert V.same_element(['sgs-nav-bar-menu__burger-bar-1', 'sgs-nav-bar-menu__burger-bar']) == 'sgs-nav-bar-menu__burger-bar'
    assert V.same_element(['sgs-nav-bar-menu__burger-bar', 'sgs-nav-bar-menu__burger-bar-2']) == 'sgs-nav-bar-menu__burger-bar'


def test_must_fail_same_element_takes_the_first_or_longest_class():
    # MUST FAIL if the rule is "first class" or "longest class": the counter-suffixed name would win.
    assert V.same_element(['sgs-nav-bar-menu__burger-bar-1', 'sgs-nav-bar-menu__burger-bar']) != 'sgs-nav-bar-menu__burger-bar-1'


def test_same_element_ignores_modifiers_and_non_parts():
    assert V.same_element(['sgs-button', 'sgs-button--primary', 'wp-block-sgs-button']) == 'sgs-button'
    assert V.same_element(['sgs-x', 'sgs-x__y--on', 'sgs-x__y']) == 'sgs-x__y'
    assert V.same_element([]) == ''
    assert V.same_element(['sgs-x__b', 'sgs-x__a']) == 'sgs-x__a'


def test_must_fail_the_item_selector_does_not_depend_on_render_order():
    # MUST FAIL if items() keeps the first placement's selector: two renders of one rule that return in another order would
    # name another selector, and a record rewritten from the same code would churn.
    a = {**placement('sgs-x__a', ['color']), 'selector': '.sgs-x.sgs-x .sgs-x__a:hover'}
    b = {**placement('sgs-x__a', ['color']), 'selector': '.sgs-x .sgs-x__a:hover'}
    c = {**placement('sgs-x__a', ['color']), 'selector': '.sgs-x.sgs-x.sgs-x .sgs-x__a:hover'}
    for order in ([a, b, c], [c, b, a], [b, a, c]):
        got = V.items(order, 'sgs-x')
        assert len(got) == 1 and got[0]['selector'] == b['selector'], order
