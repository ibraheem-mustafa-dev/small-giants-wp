"""The shadow-bleed sizer (includes/helpers-shadow-bleed.php::sgs_shadow_bleed_render) runs on every render through the
offline runner. The two menu blocks print their band rule in their own <style>, so the sizer reaches its scope step there:
it must load the scope helper itself, as the runner loads only the files that register a render_block filter. A block whose
root carries an effect (`data-sgs-fx`) sends the sizer to the motion registry for the effect's stylesheet, a class the
runner leaves out, so the sizer loads that too."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import render as RN  # noqa: E402

PLUGIN = RN.DEFAULT_PLUGIN
FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures.json'


@pytest.mark.parametrize('short', ['nav-bar-menu', 'nav-drawer-menu'])
def test_must_fail_a_menu_with_a_bleed_band_renders_offline(short):
    # Breaks with the scope helper not loaded: PHP stops on an undefined sgs_scope_class_for_root() and the render is empty.
    fixture = json.loads(FIXTURES.read_text(encoding='utf-8'))['sgs/' + short]
    rn = RN.Renderer(PLUGIN, fixture, FIXTURES.parent, short)
    attrs = RN.with_defaults(PLUGIN, short, RN.fill(fixture.get('attributes') or {}))
    res = rn.render('sgs/' + short, attrs)
    assert res.get('ok'), res.get('error')
    assert '--sgs-bleed-band:1' in (res.get('html') or '') + (res.get('css') or '')
    assert not [n for n in res.get('notices') or [] if 'helpers-shadow-bleed.php' in n]


@pytest.mark.parametrize('effect', ['scrub', 'pinned-journey'])
def test_must_fail_a_block_with_an_effect_renders_offline(effect):
    # Breaks with the motion registry not loaded: PHP stops on the undefined SGS_Motion_Registry and the render is empty.
    fixture = json.loads(FIXTURES.read_text(encoding='utf-8'))['sgs/timeline']
    rn = RN.Renderer(PLUGIN, fixture, FIXTURES.parent, 'timeline')
    attrs = dict(fixture.get('attributes') or {}, scrollEffect=effect, orientation='vertical')
    res = rn.render('sgs/timeline', RN.with_defaults(PLUGIN, 'timeline', RN.fill(attrs)))
    assert res.get('ok'), res.get('error')
    assert 'data-sgs-fx=' in (res.get('html') or '')
