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
