"""The offline runner's opt-in flags the setting check passes (scripts/qa/lib/render-css-harness.php): each changes the
output only when given. Each test renders the real block twice, without and with its flag, so it fails if the flag stops
working or starts acting without being asked for."""
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import render as RN  # noqa: E402

PLUGIN = HERE.parents[2]
HARNESS = PLUGIN / 'scripts' / 'qa' / 'lib' / 'render-css-harness.php'
FIXTURES = HERE.parent / 'fixtures.json'


def run(slug, attrs, *flags, extra=()):
    p = subprocess.run(['php', str(HARNESS), '--slug', slug, '--attrs', json.dumps(attrs), '--motion-targets', *extra, *flags],
                       capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=str(PLUGIN), timeout=120)
    res = RN.last_json(p.stdout)
    assert res and res.get('ok'), (p.stdout[-400:], p.stderr[-400:])
    return res


def test_wp_fidelity_adds_the_generated_block_class():
    plain = run('sgs/accordion-item', {'className': 'x-custom'})
    wp = run('sgs/accordion-item', {'className': 'x-custom'}, '--wp-fidelity')
    # The block's own rules are scoped `.uid.wp-block-sgs-accordion-item`: without the class they match nothing offline.
    assert not re.search(r'class="[^"]*wp-block-sgs-accordion-item', plain['html'])
    assert re.search(r'class="[^"]*wp-block-sgs-accordion-item x-custom"', wp['html'])


def test_wp_fidelity_writes_style_engine_margin():
    attrs = {'margin': {'top': '13px', 'bottom': '17px'}}
    plain = run('sgs/cart', attrs, extra=('--stub-woocommerce',))
    wp = run('sgs/cart', attrs, '--wp-fidelity', extra=('--stub-woocommerce',))
    assert 'margin-top:13px' not in plain['css']
    assert 'margin-top:13px' in wp['css'] and 'margin-bottom:17px' in wp['css']


def test_render_block_filters_run_the_plugins_markup_filters():
    plain = run('sgs/accordion-item', {'sgsHideOnMobile': True})
    filtered = run('sgs/accordion-item', {'sgsHideOnMobile': True}, '--render-block-filters')
    assert 'sgs-hide-mobile' not in plain['html']
    assert 'sgs-hide-mobile' in filtered['html']


def test_render_block_filters_carry_what_the_filters_attach_to_the_page():
    # device-visibility.php attaches its media queries with wp_add_inline_style() on wp_enqueue_scripts: without them the
    # sgs-hide-mobile class it adds hides nothing.
    plain = run('sgs/button', {'sgsHideOnMobile': True})
    filtered = run('sgs/button', {'sgsHideOnMobile': True}, '--render-block-filters')
    assert '.sgs-hide-mobile{display:none' not in plain['css']
    assert '.sgs-hide-mobile{display:none !important;}' in filtered['css']


def test_print_footer_appends_the_detached_menu_chip():
    fx = json.loads(FIXTURES.read_text(encoding='utf-8'))['sgs/nav-bar-menu']
    attrs = RN.fill({**fx['attributes'], 'triggerDetach': {'desktop': 'on', 'tablet': 'on', 'mobile': 'on'}})
    extra = ('--render-children', '--post-file', str(HERE.parent / fx['harness']['postFile']),
             '--attachments-file', str(HERE.parent / fx['harness']['attachmentsFile']))
    plain = run('sgs/nav-bar-menu', attrs, extra=extra)
    footer = run('sgs/nav-bar-menu', attrs, '--print-footer', extra=extra)
    assert 'footerHtml' not in plain
    assert 'sgs-nav-bar-menu__detach' in footer['footerHtml'] and footer['html'].endswith(footer['footerHtml'])


def test_interactivity_state_reports_what_the_render_collected():
    plain = run('sgs/form', {})
    state = run('sgs/form', {}, '--interactivity-state')
    assert 'interactivityState' not in plain
    assert state['interactivityState']['sgs/form']['nonce']


@pytest.mark.parametrize('slug', ['sgs/accordion-item', 'sgs/form', 'sgs/button'])
def test_no_flag_output_is_unchanged_by_the_flag_code(slug):
    # The flags' globals are absent without the flags: two plain runs agree, and none carries a flag-only key.
    a, b = run(slug, {}), run(slug, {})
    assert a['html'] == b['html'] and a['css'] == b['css']
    assert not ({'footerHtml', 'interactivityState'} & set(a))


# ---- The stand-ins a fixture's post, product and mega menu need (each opt-in: --wp-fidelity, --render-block-filters) ----

SR = HERE.parent
import instances as I  # noqa: E402

# each block's fixture as the check renders it: the plain attributes with the check's extras over them
FX = {k: I.check_fixture(v) if k.startswith('sgs/') else v for k, v in json.loads(FIXTURES.read_text(encoding='utf-8')).items()}
FIDELITY = ('--render-block-filters', '--print-footer', '--wp-fidelity', '--interactivity-state')


def raw(slug, attrs, *flags, extra=()):
    """The runner's JSON whether or not the render succeeded."""
    p = subprocess.run(['php', str(HARNESS), '--slug', slug, '--attrs', json.dumps(attrs), '--motion-targets', *extra, *flags],
                       capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=str(PLUGIN), timeout=120)
    return RN.last_json(p.stdout) or {'ok': False, 'error': p.stderr[-300:]}


def nav_args():
    fx = FX['sgs/nav-bar-menu']
    attrs = RN.fill({**fx['attributes'], 'submenuCaret': True})
    extra = ('--render-children', '--post-file', str(SR / fx['harness']['postFile']),
             '--attachments-file', str(SR / fx['harness']['attachmentsFile']))
    return attrs, extra


def test_mega_menu_panel_resolves_only_under_wp_fidelity():
    # The nav fixture's menu holds an item of type sgs_mega_menu (post 9202): its panel needs get_post() to answer that
    # post by ID as a WP_Post (class-sgs-mega-menu-cpt.php::resolve_panel_for_menu_item).
    attrs, extra = nav_args()
    plain = run('sgs/nav-bar-menu', attrs, extra=extra)
    wp = run('sgs/nav-bar-menu', attrs, '--wp-fidelity', extra=extra)
    assert 'Everything we make' not in plain['html'] and '-mega-9202' not in plain['html']
    assert '-mega-9202' in wp['html'] and 'class="sgs-nav-bar-menu__mega-panel-wrap' in wp['html'] and 'Everything we make' in wp['html']
    # the caret setting reaches the mega trigger, and the plain dropdown item (Lenses 9110 under Shop) is still there
    assert 'sgs-nav-bar-menu__mega-trigger' in wp['html'] and 'sgs-nav-bar-menu__sublink' in wp['html']
    off = run('sgs/nav-bar-menu', {**attrs, 'submenuCaret': False}, '--wp-fidelity', extra=extra)
    assert wp['html'].count('class="sgs-nav-bar-menu__caret"') > off['html'].count('class="sgs-nav-bar-menu__caret"')


def test_get_post_answers_the_post_with_that_id_under_wp_fidelity():
    # Button linkId resolves its permalink from get_permalink(id): the stand-in second page (9201) is not the current post
    # (the menu is), so only the fidelity lookup over the whole post list finds it.
    extra = ('--post-file', str(SR / FX['sgs/nav-bar-menu']['harness']['postFile']))
    attrs = {'label': 'Go', 'url': '/fallback/', 'linkId': RN.PLACEHOLDERS['{{post2}}']}
    plain = run('sgs/button', attrs, extra=extra)
    wp = run('sgs/button', attrs, '--wp-fidelity', extra=extra)
    assert 'href="/fallback/"' in plain['html']
    assert 'href="https://example.test/?p=9201"' in wp['html']
    assert FX['sgs/button']['harness']['postFile'].endswith('standin-posts.json')


def test_product_stand_in_serves_the_carts_empty_state_product():
    fx = FX['sgs/cart']
    attrs = RN.fill({**fx['attributes'], 'emptyProductId': '{{product}}'})
    extra = ('--stub-woocommerce', '--render-file', str(SR / fx['harness']['renderFile']), '--product-file', str(SR / fx['harness']['productFile']))
    plain = raw('sgs/cart', attrs, extra=extra)   # get_post_status() and the configurator groups are not there
    wp = raw('sgs/cart', attrs, '--wp-fidelity', extra=extra)
    assert not plain['ok'] and wp['ok'], (plain, wp.get('error'))
    assert 'data-sgs-cart-empty-add="9301"' in wp['html']


def test_must_fail_product_stand_in_draws_its_picture_for_the_carts_upsell_row():
    # cart/render.php's upsell row calls WC_Product::get_image(); the stand-in had none, so a render naming an upsell
    # product stopped on the missing method and the row's entries were part-not-rendered.
    fx = FX['sgs/cart']
    attrs = RN.fill(fx['attributes'])
    extra = ('--stub-woocommerce', '--render-file', str(SR / fx['harness']['renderFile']), '--product-file', str(SR / fx['harness']['productFile']))
    wp = raw('sgs/cart', attrs, '--wp-fidelity', extra=extra)
    assert wp['ok'], wp.get('error')
    assert 'class="woocommerce-placeholder wp-post-image sgs-cart__panel-upsell-image"' in wp['html']
    assert 'sgs-cart__panel-upsell-body' in wp['html']


def test_product_stand_in_serves_the_buttons_add_to_basket():
    attrs = {'label': 'Add', 'url': '/x/', 'linkSource': 'add-to-basket', 'addProductId': RN.PLACEHOLDERS['{{product}}']}
    extra = ('--product-file', str(SR / FX['sgs/button']['harness']['productFile']))
    wp = run('sgs/button', attrs, '--wp-fidelity', extra=extra)
    assert 'data-sgs-link-source="add-to-basket"' in wp['html'] and 'href="https://example.test/?p=9301"' in wp['html']


def test_get_post_status_is_a_fidelity_stub_only():
    attrs = {'label': 'Add', 'url': '/x/', 'linkSource': 'add-to-basket', 'addProductId': 9301}
    extra = ('--product-file', str(SR / FX['sgs/button']['harness']['productFile']))
    assert not raw('sgs/button', attrs, extra=extra)['ok']  # get_post_status() undefined, as before the flag
    # a product that does not exist is not published: the button keeps its typed link
    gone = run('sgs/button', {**attrs, 'addProductId': 1}, '--wp-fidelity', extra=extra)
    assert 'data-sgs-link-source' not in gone['html'] and 'href="/x/"' in gone['html']


def test_motion_document_reaches_the_buttons_icon_under_render_block_filters():
    # The icon circle's rules select `.sgs-button__icon[data-sgs-mc~="translate"]`: data-sgs-mc comes from the motion
    # renderer's render_block filter, which needs the motion model loaded (it fatalled on sgs_fx_owns_scroll_transform).
    doc = FX['sgs/button']['preconditions']['iconBackground']
    attrs = {'label': 'Go', 'url': '/x/', 'icon': 'arrow-right', 'iconBackground': 'primary', **doc}
    plain = run('sgs/button', attrs)
    filtered = run('sgs/button', attrs, *FIDELITY)
    icon = lambda h: re.search(r'<span class="sgs-button__icon"[^>]*>', h).group(0)  # noqa: E731
    assert 'data-sgs-mc' not in icon(plain['html'])
    assert 'data-sgs-mc="translate' in icon(filtered['html'])
    assert '.sgs-button__icon[data-sgs-mc~="translate"]' in filtered['css']
    assert 'data-sgs-fx' in icon(filtered['html'])


@pytest.mark.parametrize('attrs', [
    {'sgsConditionUrlParam': 'a=b'}, {'sgsConditionReferrer': 'x.test'}, {'sgsConditionLoggedIn': 'logged-in'},
    {'sgsConditionLoggedIn': 'logged-in', 'sgsConditionUserRole': ['editor']}, {'sgsConditionDays': [1, 2]},
    {'sgsConditionDateStart': '2020-01-01'}, {'sgsConditionDateEnd': '2099-01-01'},
    {'sgsConditionProductReviews': 'has'}, {'sgsConditionCollectionQueryId': 5},
    {'sgsConditionFormField': 'a', 'sgsConditionFormOperator': 'equals', 'sgsConditionFormValue': 'x'}])
def test_every_condition_renders_under_render_block_filters(attrs):
    # nocache_headers() and sgs_collection_has_results() were missing: a referrer, URL-parameter or collection condition
    # crashed the render.
    assert raw('sgs/button', attrs, '--render-block-filters')['ok']


def test_harness_args_and_placeholders_name_the_stand_ins():
    args = RN.harness_args(FX['sgs/cart'], SR)
    assert '--product-file' in args and args[args.index('--product-file') + 1].endswith('product.json')
    assert {'{{post2}}', '{{mega}}', '{{product}}'} <= set(RN.PLACEHOLDERS)
    menu = json.loads((SR / 'fixtures' / 'menu-post.json').read_text(encoding='utf-8'))
    assert {p['ID'] for p in menu} >= {RN.PLACEHOLDERS['{{menu}}'], RN.PLACEHOLDERS['{{mega}}'], RN.PLACEHOLDERS['{{post2}}']}
