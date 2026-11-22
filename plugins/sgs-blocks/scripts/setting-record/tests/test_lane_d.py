"""Must-fail tests for the proof's mechanisms that settle an entry the first renders could not (setting-record plan, Task 2,
lane D): the underlay test, dead and assembled parts, completion renders, the `filled` and class-token states, container
queries and the theme sheet.

Each test breaks when its mechanism is removed. Set SETREC_MUTATE to a mechanism name to switch it off and watch its tests
fail (the autouse fixture below does the removal in memory, no source file is touched):

    SETREC_MUTATE=underlay python -m pytest tests/test_lane_d.py -q
    names: underlay, fill, container, theme, completion, deadparts, classstate, filledname, siblings
"""
import os
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import cascade as C  # noqa: E402
import computed as CP  # noqa: E402
import instances as I  # noqa: E402
import proof as PR  # noqa: E402
import vocab as V  # noqa: E402

SHORT = 'demo'
HTML = '<div class="sgs-demo"><span class="sgs-demo__label">x</span></div>'
LAYOUT = {'contentSize': 1200, 'wideSize': 1400, 'rootPadding': {375: 16, 768: 24, 1440: 32}}


@pytest.fixture(autouse=True)
def mutate(monkeypatch):
    """SETREC_MUTATE=<name> removes one mechanism, so its tests can be seen to fail."""
    which = os.environ.get('SETREC_MUTATE', '')
    if which == 'underlay':
        monkeypatch.setattr(CP.Page, '_apply_underlay', lambda self, part, names: None)
    elif which == 'fill':
        monkeypatch.setattr(CP.Page, '_fill_inputs', lambda self: None)
    elif which == 'container':
        monkeypatch.setattr(CP.Page, '_container_fn', lambda self, width: None)
    elif which == 'theme':
        monkeypatch.setattr(PR, 'load_theme', lambda run: ('', None, 'switched off'))
    elif which == 'completion':
        monkeypatch.setattr(PR, 'completion', lambda *a, **k: None)
    elif which == 'deadparts':
        monkeypatch.setattr(PR, 'part_source', lambda plugin, short, part, scan: {'kind': 'php', 'cause': 'part-not-rendered', 'evidence': 'off', 'token': part})
    elif which == 'classstate':
        monkeypatch.setattr(PR, 'holdable', lambda state: state in PR.HOLDABLE)
    elif which == 'filledname':
        monkeypatch.setattr(V, 'norm_state', lambda state, selector=None: V.R.norm_state(state))
    elif which == 'siblings':
        monkeypatch.setattr(PR, 'sibling_pairs', lambda run, setting, known: [])


def entry(setting='colour', part='ROOT', props=('color',), state=None, tiers=()):
    return {'setting': setting, 'part': part, 'props': list(props), 'state': state, 'tiers': list(tiers)}


def run_of(base_html, base_css, changed_html, changed_css, e, value, selectors=(), **extra):
    key = (e['setting'], e['part'], tuple(e['props']), e['state'], tuple(e['tiers']))
    run = {
        'entries': {key: dict(e)},
        'pairs': {key: {('b', 'c')}},
        'selectors': {key: set(selectors)},
        'results': {'b': {'html': base_html, 'css': base_css}, 'c': {'html': changed_html, 'css': changed_css}},
        'jobs': {'b': {}, 'c': {e['setting']: value}},
        'children': [],
        'plugin': HERE,
    }
    run.update(extra)
    return run, key


def tmp_plugin(tmp_path, files: dict) -> Path:
    """A plugin folder (plugins/sgs-blocks, with the theme beside it) holding the given files, keyed by path."""
    plugin = tmp_path / 'plugins' / 'sgs-blocks'
    (plugin / 'src' / 'blocks' / SHORT).mkdir(parents=True)
    for rel, text in files.items():
        f = tmp_path / rel if rel.startswith('theme/') else plugin / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding='utf-8')
    PR.corpus.cache_clear()
    return plugin


# ---------------------------------------------------------------- underlay
def test_must_fail_background_image_none_is_proved_over_the_underlay():
    # `background-image: none` computes to the plain page's `none`: without the sentinel underlay nothing differs.
    e = entry(setting='gradient', props=('background-image',))
    run, key = run_of(HTML, '', HTML, '.sgs-demo{background-image:none}', e, 'linear-gradient(red, blue)', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and out[key]['kind'] == 'switched-on'
    assert 'underlay' in rep['proved'][0]['evidence']


def test_must_fail_inherit_is_proved_through_the_ancestors_sentinel():
    # The pseudo-element inherits its ancestor's radius: the underlay gives the ancestor one the part's sentinel differs from.
    e = entry(setting='bg', part='ROOT::after', props=('border-radius',))
    run, key = run_of(HTML, '.sgs-demo::after{content:""}', HTML, '.sgs-demo::after{content:"";border-radius:inherit}', e, 'x', ['.sgs-demo::after'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and 'underlay' in rep['proved'][0]['evidence']


def test_same_declaration_text_in_both_pages_is_removed_not_proved():
    # The negative control: the winning declaration is the same text with and without the setting, so it is removed.
    e = entry()
    css = '.sgs-demo{color:#123456}'
    run, key = run_of(HTML, css, HTML, css, e, '#123456', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 1 and key not in out


def test_declaration_that_changes_text_but_not_value_stays_blind_over_the_underlay():
    # #111 and #111111 are one colour: even over the sentinel they compute alike, so the entry stays blind, never proved.
    e = entry()
    run, key = run_of(HTML, '.sgs-demo{color:#111}', HTML, '.sgs-demo{color:#111111}', e, '#111111', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['blind'] == 1 and out[key]['unproved'] == 'same-value-here'


# ---------------------------------------------------------------- states
FIELD = '<div class="sgs-demo"><input class="sgs-demo__input" placeholder=" "><span class="sgs-demo__label">x</span></div>'
FILLED_SEL = '.sgs-demo:has(.sgs-demo__input:not(:placeholder-shown)) .sgs-demo__label'


def test_must_fail_filled_state_is_held_by_giving_the_inputs_a_value():
    e = entry(setting='offset', part='sgs-demo__label', props=('top',), state='filled')
    base = '.sgs-demo__label{top:1px}'
    run, key = run_of(FIELD, base, FIELD, base + FILLED_SEL + '{top:37px}', e, '37px', [FILLED_SEL])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and out[key]['kind'] == 'value'


def test_unfilled_field_does_not_match_the_filled_rule():
    # The negative control: at rest the placeholder shows, so the rule never matches and the entry is not proved.
    e = entry(setting='offset', part='sgs-demo__label', props=('top',))
    base = '.sgs-demo__label{top:1px}'
    run, key = run_of(FIELD, base, FIELD, base + FILLED_SEL + '{top:37px}', e, '37px', [FILLED_SEL])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 0


def test_must_fail_state_name_filled_is_in_the_vocabulary():
    assert V.norm_state(None, FILLED_SEL) == 'filled'
    # a rule that names a state of its own keeps it: `:is(:focus, :not(:placeholder-shown))` is focus
    assert V.norm_state('focus', '.a:is(:focus,:not(:placeholder-shown)) .b') == 'focus'
    assert V.norm_state(None, '.a:hover .b') is None
    items = V.items([{'part': 'sgs-demo__label', 'props': ['top'], 'state': None, 'tiers': [], 'mechanism': 'rule', 'selector': FILLED_SEL}], 'sgs-demo')
    assert [i['state'] for i in items] == ['filled']


def test_must_fail_class_token_state_is_held():
    # `.is-detached` is a class a script puts on the element: held means the element carries it.
    html = '<div class="sgs-demo"><span class="sgs-demo__detach">x</span></div>'
    e = entry(setting='breakpoint', part='sgs-demo__detach', props=('display',), state='.is-detached')
    sel = '.sgs-demo .sgs-demo__detach.is-detached'
    run, key = run_of(html, '.sgs-demo__detach{display:none}', html, '.sgs-demo__detach{display:none}' + sel + '{display:flex}', e, '1', [sel])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1


def test_a_state_nothing_in_the_render_decides_is_still_blind():
    e = entry(setting='x', props=('color',), state=':target-within')
    run, key = run_of(HTML, '', HTML, '.sgs-demo{color:red}', e, 'red', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'state-not-holdable'


# ---------------------------------------------------------------- container queries
CONTAINER_HTML = '<div class="sgs-demo"><div class="sgs-demo__inner">x</div></div>'
CONTAINER_BASE = '.sgs-demo{container-name:demo;container-type:inline-size;padding-left:20px;padding-right:20px}'


def container_entry(prelude):
    return entry(setting='cols', part='sgs-demo__inner', props=('grid-template-columns',), tiers=(f'@container demo {prelude}',))


def test_must_fail_container_query_is_evaluated_at_the_frames_content_width():
    # 375 less 2 x 16 of root padding is 343, less the container's own 40px of padding is 303: it holds at 375 only.
    e = container_entry('(max-width: 400px)')
    css = CONTAINER_BASE + '@container demo (max-width: 400px){.sgs-demo__inner{grid-template-columns:1fr 1fr}}'
    run, key = run_of(CONTAINER_HTML, CONTAINER_BASE, CONTAINER_HTML, css, e, '2', ['.sgs-demo__inner'], layout=LAYOUT)
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and out[key]['kind'] in ('value', 'switched-on')
    assert rep['proved'][0]['evidence'][0][1] == '375'


def test_container_width_is_less_the_containers_own_padding():
    css = CONTAINER_BASE + '@container demo (min-width: 330px){.sgs-demo__inner{order:5}}'
    page = CP.Page(CONTAINER_HTML, [css], SHORT, container_frame=PR.frame_widths(LAYOUT))
    inner = page.soup.select_one('.sgs-demo__inner')
    assert page.value(inner, None, 'order', 375) == '0'     # 303 < 330
    assert page.value(inner, None, 'order', 768) == '5'     # 720 - 40 = 680
    assert PR.frame_widths(LAYOUT) == {375: 343.0, 768: 720.0, 1440: 1200.0}


def test_container_query_with_no_frame_is_blind():
    e = container_entry('(max-width: 400px)')
    css = CONTAINER_BASE + '@container demo (max-width: 400px){.sgs-demo__inner{grid-template-columns:1fr 1fr}}'
    run, key = run_of(CONTAINER_HTML, CONTAINER_BASE, CONTAINER_HTML, css, e, '2', ['.sgs-demo__inner'])
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'container-query' and rep['counts']['removed'] == 0


def test_container_query_on_more_than_width_is_blind():
    e = container_entry('(min-height: 400px)')
    css = CONTAINER_BASE + '@container demo (min-height: 400px){.sgs-demo__inner{grid-template-columns:1fr 1fr}}'
    run, key = run_of(CONTAINER_HTML, CONTAINER_BASE, CONTAINER_HTML, css, e, '2', ['.sgs-demo__inner'], layout=LAYOUT)
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'container-query'


def test_must_fail_container_entry_with_no_difference_at_the_sampled_widths_is_proved_between_them():
    # The form's 480px rule holds at none of 327 px and equals the default 560px rule at 720 and 1200, so the three sampled
    # widths show no difference: a container between 480 and 560 px wide does, and the probe widths reach one. Breaks
    # without probe_widths (the entry was removed, then kept blind as container-query).
    e = container_entry('(min-width: 480px)')
    base = CONTAINER_BASE + '@container demo (min-width: 560px){.sgs-demo__inner{grid-template-columns:repeat(6,1fr)}}'
    css = base + '@container demo (min-width: 480px){.sgs-demo__inner{grid-template-columns:repeat(6,1fr)}}'
    run, key = run_of(CONTAINER_HTML, base, CONTAINER_HTML, css, e, '480', ['.sgs-demo__inner'], layout=LAYOUT)
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and 'unproved' not in out[key]
    assert 'probe width' in str(rep['proved'][0]['evidence']) or 'between the sampled' in str(rep['proved'][0]['evidence'])


def test_container_preludes_read_ranges_and_inline_size():
    hold = lambda p, w: C.media_holds((f'container {p}',), 1440, container=lambda name: w)  # noqa: E731
    assert hold('demo (width >= 400px)', 500) and not hold('demo (width >= 400px)', 300)
    assert hold('(min-inline-size: 20em)', 400) and not hold('(min-inline-size: 20em)', 300)
    assert hold('demo (400px <= width <= 600px)', 500) and not hold('demo (400px <= width <= 600px)', 700)
    assert hold('demo (max-width: 300px) or (min-width: 600px)', 700) and not hold('demo (max-width: 300px) or (min-width: 600px)', 500)
    assert hold('demo not (min-width: 400px)', 300) and not hold('demo not (min-width: 400px)', 500)
    assert not C.media_holds(('container demo (min-width: 1px)',), 1440)  # no container width: it never holds


# ---------------------------------------------------------------- theme sheet
def test_must_fail_theme_custom_property_is_defined_by_the_theme_sheet():
    # `colour` switches on `color: var(--wp--preset--color--primary)`; the theme defines the property.
    e = entry()
    run_args = (HTML, '', HTML, '.sgs-demo{color:var(--wp--preset--color--primary)}', e, 'primary', ['.sgs-demo'])
    run, key = run_of(*run_args, theme_css=':root{--wp--preset--color--primary:#112233}')
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and rep['theme']['loaded'] is True
    # without the theme sheet the property is undefined: its placeholder proves the setting switches it on (G4)
    run2, key2 = run_of(*run_args)
    out2, rep2 = PR.prove(SHORT, run2)
    assert 'unproved' not in out2[key2] and 'placeholder' in str(rep2['proved'][0]['evidence'])


def test_must_fail_a_theme_rule_that_wins_in_both_pages_keeps_the_entry():
    # The theme's layout rule gives the block auto margins in this frame, so the block's own (weaker) rule changes nothing
    # here; in a flow layout it would. Without the theme sheet the entry is removed (the block's rule is the same in both).
    e = entry(setting='maxWidth', props=('margin-left',))
    theme = '.is-layout-constrained > :where(:not(.alignleft)){margin-left:auto}'
    both = ':where(.sgs-demo){margin-left:auto}'
    run, key = run_of(HTML, both, HTML, both + '.sgs-demo{--x:1}', e, '1', [':where(.sgs-demo)'], theme_css=theme)
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and out[key]['unproved'] == 'same-value-here' and 'theme' in rep['blind'][0]['evidence']
    run2, key2 = run_of(HTML, both, HTML, both + '.sgs-demo{--x:1}', e, '1', [':where(.sgs-demo)'])
    out2, rep2 = PR.prove(SHORT, run2)
    assert rep2['counts']['removed'] == 1


def test_must_fail_a_proof_the_blocks_own_sheets_give_survives_the_theme_sheet():
    # A theme rule that wins at held focus must not turn an entry the block's own sheets prove into an unproved one.
    e = entry(setting='shadow', props=('box-shadow',), state='focus')
    theme = 'html body .sgs-demo:focus-visible{box-shadow:var(--sgs-ring-halo)}'
    run, key = run_of(HTML, '', HTML, '.sgs-demo:focus{box-shadow:0 0 0 3px red}', e, 'red', ['.sgs-demo:focus'], theme_css=theme)
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1


def test_an_undefined_token_both_pages_read_alike_is_judged_on_its_declaration():
    # `var(--sgs-parent-default, 600)` in both pages: whatever a parent block or a client's token holds, both pages read
    # the same one through the same declaration, so the setting changes nothing here and the entry is removed.
    e = entry(setting='weight', props=('font-weight',))
    css = '.sgs-demo{font-weight:var(--sgs-parent-default, 600)}'
    run, key = run_of(HTML, css, HTML, css + '.sgs-demo{--x:1}', e, '600', ['.sgs-demo'], theme_css=':root{--other:1}')
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 1


def test_must_fail_a_token_a_front_end_script_sets_goes_to_the_browser(tmp_path):
    # Breaks without the guard: a script writes the token from what the setting printed, so a fixed placeholder sees no
    # change and the entry would be removed though the browser shows one.
    e = entry(setting='weight', props=('font-weight',))
    css = '.sgs-demo{font-weight:var(--sgs-bridge-h, 600)}'
    run, key = run_of(HTML, css, HTML, css + '.sgs-demo{--x:1}', e, '600', ['.sgs-demo'], theme_css=':root{--other:1}')
    run['plugin'] = tmp_plugin(tmp_path, {'src/blocks/demo/view.js': "el.style.setProperty('--sgs-bridge-h', h + 'px');"})
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'script-set-token' and rep['counts']['removed'] == 0


def test_must_fail_a_setting_that_swaps_one_site_token_for_another_is_proved_by_their_placeholders():
    # Breaks without the placeholders (G4): both tokens are a site's own, undefined here, so both pages computed alike
    # (even over the underlay) and the entry stayed unproven, though on a site the two tokens differ.
    e = entry()
    run, key = run_of(HTML, '.sgs-demo{color:var(--site-ink)}', HTML, '.sgs-demo{color:var(--site-accent)}', e, 'accent', ['.sgs-demo'],
                      theme_css=':root{--wp--preset--color--primary:#112233}')
    out, rep = PR.prove(SHORT, run)
    assert 'unproved' not in out[key] and out[key]['kind'] == 'switched-on'
    assert 'placeholder' in str(rep['proved'][0]['evidence'])


# ---------------------------------------------------------------- where a missing part comes from
def part_run(tmp_path, files, part):
    plugin = tmp_plugin(tmp_path, files)
    e = entry(part=part)
    run, key = run_of(HTML, '', HTML, f'.{part}{{color:#123456}}', e, '#123456', [f'.{part}'])
    run['plugin'] = plugin
    return run, key


def test_must_fail_class_no_source_prints_is_dead_css_and_listed(tmp_path):
    run, key = part_run(tmp_path, {'src/blocks/demo/render.php': "<?php echo '<span class=\"sgs-demo__label\">';",
                                   'src/blocks/demo/style.css': '.sgs-demo__ghost{color:red}',
                                   'includes/x.php': "<?php $css = '.sgs-demo__ghost{color:red}';"}, 'sgs-demo__ghost')
    out, rep = PR.prove(SHORT, run)
    assert key not in out and rep['counts']['removed'] == 1
    assert [d['part'] for d in rep['deadParts']] == ['sgs-demo__ghost'] and rep['deadParts'][0]['entries'] == 1
    assert 'no source prints' in rep['deadParts'][0]['evidence']


def test_part_a_script_builds_is_not_dead(tmp_path):
    run, key = part_run(tmp_path, {'src/blocks/demo/view.js': "el.className = 'sgs-demo__built';"}, 'sgs-demo__built')
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'script-built-part' and rep['deadParts'] == []


def test_part_printed_by_php_under_a_setting_is_not_dead(tmp_path):
    run, key = part_run(tmp_path, {'src/blocks/demo/render.php': "<?php if ($a['x']) { echo '<i class=\"sgs-demo__cond\"></i>'; }"}, 'sgs-demo__cond')
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'part-not-rendered'


def test_must_fail_part_a_php_helper_assembles_waits_on_content_not_a_browser(tmp_path):
    # Breaks if a class PHP builds from pieces were sent to the browser pass: the server prints it once the content it
    # waits on is there (sgs_nav_shared_badge_html prints `$bem_root . '__badge'` for a menu item with a description).
    run, key = part_run(tmp_path, {'includes/h.php': "<?php return sprintf('<span class=\"%1$s__badge\">', $root);"}, 'sgs-demo__badge')
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'part-not-rendered' and 'assembled by PHP' in rep['blind'][0]['evidence']


def test_part_a_script_assembles_goes_to_the_browser(tmp_path):
    run, key = part_run(tmp_path, {'src/blocks/demo/view.js': "el.className = root + '__chip';"}, 'sgs-demo__chip')
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'script-built-part' and rep['deadParts'] == []


def test_part_the_theme_or_another_block_prints_is_not_dead(tmp_path):
    run, key = part_run(tmp_path, {'theme/sgs-theme/parts/header.html': '<div class="sgs-demo-row"></div>'}, 'sgs-demo-row')
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'part-printed-elsewhere'


def test_a_selector_in_php_is_not_a_print(tmp_path):
    # `.sgs-demo__ghost` in a CSS string (a leading dot) styles the class; it does not print it.
    plugin = tmp_plugin(tmp_path, {'src/blocks/demo/render.php': "<?php $css = '.sgs-demo__ghost{color:red}';"})
    src = PR.part_source(plugin, SHORT, 'sgs-demo__ghost', None)
    assert src['kind'] == 'dead'


# ---------------------------------------------------------------- completion
class StubRenderer:
    """Renders the demo block: a badge is drawn when `showBadge` is on."""

    def __init__(self):
        self.calls = 0

    def render_many(self, slug, jobs, content, inner):
        out = {}
        for k, a in jobs.items():
            self.calls += 1
            badge = '<span class="sgs-demo__badge">1</span>' if a.get('showBadge') else ''
            out[k] = {'ok': True, 'html': f'<div class="sgs-demo"><span class="sgs-demo__label">x</span>{badge}</div>',
                      'css': ('.sgs-demo__badge{color:var(--b,red)}' + ('.sgs-demo{--b:#123456}' if a.get('badgeColour') else ''))}
        return out


def completion_run(monkeypatch, scan):
    e = entry(setting='badgeColour', part='sgs-demo__badge', props=('color',))
    run, key = run_of(HTML, '', HTML, '', e, '#123456', ['.sgs-demo__badge'])
    run['jobs'] = {'b': {}, 'c': {'badgeColour': '#123456'}}
    run.update(renderer=StubRenderer(), slug='sgs/demo', content='', inner=None)
    monkeypatch.setattr(PR, 'scan_of', lambda run_, short: scan)
    monkeypatch.setattr(I, 'switching_values', lambda plugin, short, attr, current: [{attr: True}])
    return run, key


def test_must_fail_missing_part_is_printed_by_the_setting_the_scanner_names(monkeypatch):
    scan = {'parts': {'sgs-demo__badge': {'conditionAttrs': ['showBadge']}}, 'switchClasses': {}, 'dataAttrs': {}, 'unread': []}
    run, key = completion_run(monkeypatch, scan)
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and rep['counts']['completions'] == 1
    assert rep['completions'][0]['with'] == {'showBadge': True}


def test_missing_part_no_setting_prints_keeps_its_cause(monkeypatch, tmp_path):
    scan = {'parts': {}, 'switchClasses': {}, 'dataAttrs': {}, 'unread': []}
    run, key = completion_run(monkeypatch, scan)
    run['plugin'] = tmp_plugin(tmp_path, {'src/blocks/demo/render.php': "<?php echo 'sgs-demo__badge';"})
    out, rep = PR.prove(SHORT, run)
    assert out[key]['unproved'] == 'part-not-rendered' and rep['counts']['completions'] == 0


def test_must_fail_class_the_rule_needs_is_printed_by_its_modifier_setting(monkeypatch):
    # The rule needs `.sgs-demo--on`, which the setting `layoutOn` prints: the plain and changed render again with it on.
    class R2(StubRenderer):
        def render_many(self, slug, jobs, content, inner):
            out = {}
            for k, a in jobs.items():
                cls = ' sgs-demo--on' if a.get('layoutOn') else ''
                out[k] = {'ok': True, 'html': f'<div class="sgs-demo{cls}"><span class="sgs-demo__label">x</span></div>',
                          'css': '.sgs-demo--on .sgs-demo__label{color:var(--c,red)}' + ('.sgs-demo{--c:#123456}' if a.get('tint') else '')}
            return out

    e = entry(setting='tint', part='sgs-demo__label', props=('color',))
    sel = '.sgs-demo--on .sgs-demo__label'
    run, key = run_of(HTML, '', HTML, '', e, '#123456', [sel])
    run['jobs'] = {'b': {}, 'c': {'tint': '#123456'}}
    run.update(renderer=R2(), slug='sgs/demo', content='', inner=None)
    monkeypatch.setattr(PR, 'scan_of', lambda run_, short: {'switchClasses': {'sgs-demo--on': ['layoutOn']}, 'parts': {}, 'dataAttrs': {}, 'unread': []})
    monkeypatch.setattr(I, 'switching_values', lambda plugin, short, attr, current: [{attr: True}])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and rep['completions'][0]['with'] == {'layoutOn': True}


def test_switching_attrs_reads_modifiers_families_conditions_and_data_attributes():
    scan = {'switchClasses': {'sgs-x--has-gap': ['gap'], 'sgs-x--field-cols-': ['fieldColumnsFrom']},
            'parts': {'sgs-x__badge': {'conditionAttrs': ['showBadge'], 'textAttrs': ['badgeText']}},
            'dataAttrs': {'sgs-mc': ['motion']}}
    assert I.switching_attrs(scan, ['sgs-x--has-gap']) == ['gap']
    assert I.switching_attrs(scan, ['sgs-x--field-cols-320']) == ['fieldColumnsFrom']
    assert I.switching_attrs(scan, ['sgs-x__badge'], ['sgs-mc']) == ['showBadge', 'badgeText', 'motion']
    assert I.switching_attrs(scan, ['sgs-x__nothing']) == []


def test_must_fail_a_class_that_needs_two_settings_together_is_printed(monkeypatch):
    # `sgs-demo--pill-bubble` is printed only when `style` is `pill` and `count` is `bubble`: neither alone prints it.
    class R3(StubRenderer):
        def render_many(self, slug, jobs, content, inner):
            out = {}
            for k, a in jobs.items():
                cls = ' sgs-demo--pill-bubble' if (a.get('style') == 'pill' and a.get('count') == 'bubble') else ''
                out[k] = {'ok': True, 'html': f'<div class="sgs-demo{cls}"><span class="sgs-demo__label">x</span></div>',
                          'css': '.sgs-demo--pill-bubble .sgs-demo__label{color:var(--c,red)}' + ('.sgs-demo{--c:#123456}' if a.get('tint') else '')}
            return out

    e = entry(setting='tint', part='sgs-demo__label', props=('color',))
    sel = '.sgs-demo--pill-bubble .sgs-demo__label'
    run, key = run_of(HTML, '', HTML, '', e, '#123456', [sel])
    run['jobs'] = {'b': {}, 'c': {'tint': '#123456'}}
    run.update(renderer=R3(), slug='sgs/demo', content='', inner=None)
    monkeypatch.setattr(PR, 'scan_of', lambda run_, short: {'switchClasses': {'sgs-demo--pill-bubble': ['count', 'style']}, 'parts': {}, 'dataAttrs': {}, 'unread': []})
    values = {'style': [{'style': 'flat'}, {'style': 'pill'}], 'count': [{'count': 'plain'}, {'count': 'bubble'}]}
    monkeypatch.setattr(I, 'switching_values', lambda plugin, short, attr, current: values[attr])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and rep['completions'][0]['with'] == {'count': 'bubble', 'style': 'pill'}


def test_must_fail_another_test_value_of_the_setting_proves_what_the_first_left_unchanged():
    # `style=pill` leaves the gap where the plain state (already a pill) holds it; `style=icon` moves it. The renders of
    # the other value exist already: the entry is proved on them.
    e = entry(setting='style', props=('gap',))
    run, key = run_of(HTML, '.sgs-demo{gap:8px}', HTML.replace('sgs-demo"', 'sgs-demo sgs-demo--pill"', 1), '.sgs-demo{gap:8px}.sgs-demo.sgs-demo--pill{gap:8px}', e, 'pill', ['.sgs-demo.sgs-demo--pill'])
    run['results']['c2'] = {'html': HTML.replace('sgs-demo"', 'sgs-demo sgs-demo--icon"', 1), 'css': '.sgs-demo{gap:8px}.sgs-demo.sgs-demo--icon{gap:0}'}
    run['jobs']['c2'] = {'style': 'icon'}
    run['plan'] = {'instances': [{'key': 'default', 'isDefault': True, 'variant': 0, '_key': 'b'},
                                 {'key': 'style-enum-pill', 'attr': 'style', 'variant': 0, 'baseKey': None, '_key': 'c'},
                                 {'key': 'style-enum-icon', 'attr': 'style', 'variant': 0, 'baseKey': None, '_key': 'c2'}]}
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and 'another test value' in str(rep['proved'][0]['evidence'])
    assert PR.sibling_pairs(run, 'style', {('b', 'c')}) == [('b', 'c2')]
