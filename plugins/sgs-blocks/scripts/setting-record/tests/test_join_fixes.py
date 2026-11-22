"""Must-fail tests for what the Task 2 join found: Task 1's `runner` entries were still unseen once the runner could
see them, for three reasons fixed here."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import diff as D  # noqa: E402
import instances as I  # noqa: E402


def test_must_fail_a_helper_part_the_setting_writes_onto_passes_the_value_on():
    # Breaks on the old live_consumers: `.sgs-scrim` (a part outside the block's class) setting the custom property was
    # taken for another block shadowing it, so the scrim's opacity entries were never placed.
    rb = {('', '.sgs-scrim', '--sgs-scrim-opacity'): '0.55', ('', '.sgs-scrim::before', 'opacity'): 'var(--sgs-scrim-opacity,0)'}
    rm = {('', '.sgs-scrim', '--sgs-scrim-opacity'): '0.37', ('', '.sgs-scrim::before', 'opacity'): 'var(--sgs-scrim-opacity,0)'}
    els = {'div.sgs-scrim[0]': {'classes': {'sgs-scrim'}, 'attrs': {}}}
    pls, _ = D.diff_placements((rb, els), (rm, els), 'cart', [])
    assert [(p['part'], p['props']) for p in pls] == [('sgs-scrim::before', ['opacity'])]


def test_another_blocks_unchanged_default_still_shadows():
    # A child block that sets the property on itself, unchanged by the setting, still shadows the inherited value.
    rb = {('', '.sgs-cart', '--x'): '1px', ('', '.sgs-badge', '--x'): '9px', ('', '.sgs-badge', 'width'): 'var(--x)'}
    rm = {('', '.sgs-cart', '--x'): '2px', ('', '.sgs-badge', '--x'): '9px', ('', '.sgs-badge', 'width'): 'var(--x)'}
    els = {'div.sgs-cart[0]': {'classes': {'sgs-cart'}, 'attrs': {}}, 'div.sgs-badge[0]': {'classes': {'sgs-badge'}, 'attrs': {}}}
    pls, _ = D.diff_placements((rb, els), (rm, els), 'cart', [])
    assert not [p for p in pls if p['part'] == 'sgs-badge']


def test_must_fail_extension_settings_that_paint_are_valued():
    # Breaks on the old generator: every extension setting was listed unvalued ("the offline runner cannot run it yet").
    pl = I.plan('button', I.PLUGIN, I.load_fixtures())
    attrs = {i['attr'] for i in pl['instances']}
    assert {'sgsHideOnMobile', 'sgsHideOnTablet', 'sgsHideOnDesktop', 'sgsPosition'} <= attrs
    unvalued = {u['setting']: u['why'] for u in pl['unvalued']}
    assert 'sgsHideOnMobile' not in unvalued
    # A behaviour setting is tried too: whether it paints is shown by its renders, not assumed from its roster role.
    assert 'sgsConditionLoggedIn' in attrs


def test_must_fail_a_utility_class_the_setting_adds_is_placed_on_its_element():
    # Breaks on the old element matching: the class changed the element's path, so the plain and changed root were
    # never compared and sgsHideOnMobile placed nothing; and a rule on the utility class alone named no part.
    rules = {('@media (max-width:767.98px)', '.sgs-hide-mobile', 'display'): 'none !important'}
    eb = {'a.sgs-button[0]': {'classes': {'sgs-button'}, 'attrs': {}}, 'a.sgs-button[0] > span.sgs-button__label[0]': {'classes': {'sgs-button__label'}, 'attrs': {}}}
    em = {'a.sgs-button.sgs-hide-mobile[0]': {'classes': {'sgs-button', 'sgs-hide-mobile'}, 'attrs': {}},
          'a.sgs-button.sgs-hide-mobile[0] > span.sgs-button__label[0]': {'classes': {'sgs-button__label'}, 'attrs': {}}}
    pls, info = D.diff_placements((rules, eb), (rules, em), 'button', [])
    assert info['classTokens'] == ['sgs-hide-mobile']
    assert [(p['part'], p['props'], p['tiers']) for p in pls] == [('ROOT', ['display'], ['@media (max-width:767.98px)'])]


def test_must_fail_a_selector_wrapped_whole_in_where_names_its_part():
    # Breaks without the unwrap: the selector reader does not look inside :where(), so the burger icon's sizes were unnamed.
    pl = D.placement(':where(.sgs-nav-bar-menu__burger-icon:has(.sgs-nav-bar-menu__burger-bar))', 'width', '', 'nav-bar-menu', 'run-css', 'x')
    assert pl['part'] == 'sgs-nav-bar-menu__burger-icon'
    assert D._unwrap_where(':where(.a), :where(.b)') is None


def test_must_fail_a_rule_on_the_attribute_alone_is_placed_on_its_element():
    # Breaks without the element fallback: `[data-sgs-fx~="magnet"]` names no class, so its part was unnamed.
    rules = {('', '[data-sgs-fx~="magnet"]', 'translate'): 'var(--m)'}
    eb = {'button.sgs-nav-bar-menu__burger[0]': {'classes': {'sgs-nav-bar-menu__burger'}, 'attrs': {'data-sgs-fx': ''}}}
    em = {'button.sgs-nav-bar-menu__burger[0]': {'classes': {'sgs-nav-bar-menu__burger'}, 'attrs': {'data-sgs-fx': 'magnet'}}}
    pls, _ = D.diff_placements((rules, eb), (rules, em), 'nav-bar-menu', [])
    assert [(p['part'], p['props']) for p in pls] == [('sgs-nav-bar-menu__burger', ['translate'])]


def test_must_fail_two_different_elements_at_one_place_are_not_paired():
    # Breaks if pairing ignored identity: a flyout's panel and a drawer's dialog at the same place would be compared
    # class by class, and every rule naming any of their classes placed.
    eb = {'div.sgs-cart__panel[0]': {'classes': {'sgs-cart__panel', 'sgs-x'}, 'attrs': {}}}
    em = {'div.sgs-cart__drawer[0]': {'classes': {'sgs-cart__drawer', 'sgs-y'}, 'attrs': {}}}
    rules = {('', '.sgs-y', 'color'): 'red'}
    pls, info = D.diff_placements((rules, eb), (rules, em), 'cart', [])
    assert info['classTokens'] == [] and pls == []
