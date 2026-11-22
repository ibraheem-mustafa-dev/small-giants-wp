"""Must-fail tests for the proof faults found on the four blocks (setting-record plan, Task 2 "Completion"): each test breaks
when its fix is taken out (run them against the earlier proof.py, cascade.py and computed.py to see them fail).

  alias       an element carrying an instance id plus a part class, no block class, is matched by the normalised selector
  pairing     a second element only the changed render prints is compared too
  supports    `@supports not (X)` is false for a property Chromium implements, so its fallback never applies
  demand      a rule that needs two classes together is demanded whole, whichever of them some render has alone
  subject     the property is read on the rule's own subject elements (a child of the part), not only the named part's
  orientation a rule that matches the plain render and not the changed one is the setting switching a paint off
  nesting     a rule for an `a` inside an `a` is dead
  scriptset   a class a script sets (an Interactivity directive) is held where the script puts it
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import cascade as C  # noqa: E402
import instances as I  # noqa: E402
import proof as PR  # noqa: E402
import scriptsets as SS  # noqa: E402
from test_lane_d import StubRenderer, entry, run_of, tmp_plugin  # noqa: E402

SHORT = 'demo'
ROOT_HTML = '<div class="sgs-demo sgs-demo-1a2b3c4d">{}</div>'


# ---------------------------------------------------------------- alias
def test_must_fail_an_element_with_the_instance_id_and_a_part_class_matches_the_normalised_selector():
    # The cart's panel is `<div class="sgs-cart-1a2b3c4d sgs-cart__panel">`: the entry's selector says `.sgs-cart.sgs-cart__panel`.
    html = ROOT_HTML.format('<div class="sgs-demo-1a2b3c4d sgs-demo__panel"><h2 class="sgs-demo__panel-heading">x</h2></div>')
    css = '.sgs-demo-1a2b3c4d.sgs-demo__panel .sgs-demo__panel-heading{font-weight:700}'
    e = entry(setting='weight', part='sgs-demo__panel-heading', props=('font-weight',))
    sel = '.sgs-demo.sgs-demo__panel .sgs-demo__panel-heading'
    run, key = run_of(html, css, html, css, e, '700', [sel])
    pages = PR.Pages(SHORT, run, with_theme=False)
    assert pages.subjects('c', {sel}, set()), 'the alias must let `.sgs-demo` name the element that carries the id'
    r = PR.scan_pairs(pages, run, 'weight', e['part'], ['font-weight'], [('b', 'c')], set(), frozenset(), [375], {sel})
    assert r['matched'] and r['seen_part']


# ---------------------------------------------------------------- pairing
def test_must_fail_a_second_element_only_the_changed_render_prints_is_compared():
    # Detached: a second burger is printed, 56px wide where the first is auto.
    plain = ROOT_HTML.format('<button class="sgs-demo__burger">a</button>')
    changed = ROOT_HTML.format('<button class="sgs-demo__burger">a</button><button class="sgs-demo__burger sgs-demo__burger--chip">b</button>')
    e = entry(setting='detach', part='sgs-demo__burger', props=('width',))
    run, key = run_of(plain, '', changed, '.sgs-demo__burger--chip{width:56px}', e, 'on', ['.sgs-demo__burger--chip'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and out[key]['kind'] == 'switched-on', rep
    assert '56px' in str(rep['proved'][0]['evidence'])


def test_an_extra_element_that_repeats_a_value_shows_nothing():
    plain = ROOT_HTML.format('<button class="sgs-demo__burger">a</button>')
    changed = ROOT_HTML.format('<button class="sgs-demo__burger">a</button><button class="sgs-demo__burger">b</button>')
    e = entry(setting='detach', part='sgs-demo__burger', props=('width',))
    run, key = run_of(plain, '.sgs-demo__burger{width:40px}', changed, '.sgs-demo__burger{width:40px}', e, 'on', ['.sgs-demo__burger'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 0


# ---------------------------------------------------------------- supports
def test_must_fail_the_fallback_under_supports_not_never_applies():
    css = '.sgs-demo{background-image:linear-gradient(red,blue)}@supports not (background-clip:text){.sgs-demo{background-image:none}}'
    rules = C.flatten(css, 1, 0)
    assert [r.decls[0][1] for r in rules] == ['linear-gradient(red,blue)']
    assert C.supports_holds('(background-clip:text)') and not C.supports_holds('not ((background-clip:text) or (-webkit-background-clip:text))')
    assert C.supports_holds('(display:grid) and (not (-moz-appearance:none))')
    assert not C.supports_holds('(-moz-appearance:none)')


def test_must_fail_an_entry_under_a_supports_fallback_is_removed_with_its_evidence():
    e = entry(setting='gradient', props=('background-image',), tiers=('@supports not ((background-clip:text) or (-webkit-background-clip:text))',))
    run, key = run_of(ROOT_HTML.format(''), '', ROOT_HTML.format(''), '', e, 'x', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert key not in out and rep['counts']['removed'] == 1 and '@supports' in rep['removed'][0]['evidence']


# ---------------------------------------------------------------- demand
def test_must_fail_a_rule_needing_two_classes_is_demanded_whole(monkeypatch):
    # Every render has one of `--pill`, `--bubble` alone and none has both: the old demand (required classes no render has) was empty.
    class R(StubRenderer):
        def render_many(self, slug, jobs, content, inner):
            out = {}
            for k, a in jobs.items():
                cls = (' sgs-demo--pill' if a.get('style') == 'pill' else '') + (' sgs-demo--bubble' if a.get('count') == 'bubble' else '')
                out[k] = {'ok': True, 'html': f'<div class="sgs-demo{cls}"><span class="sgs-demo__badge">x</span></div>',
                          'css': '.sgs-demo--pill.sgs-demo--bubble .sgs-demo__badge{border-radius:var(--r,0)}' + ('.sgs-demo{--r:9px}' if a.get('radius') else '')}
            return out

    e = entry(setting='radius', part='sgs-demo__badge', props=('border-radius',))
    sel = '.sgs-demo--pill.sgs-demo--bubble .sgs-demo__badge'
    plain, changed = {'style': 'pill'}, {'style': 'flat', 'count': 'bubble', 'radius': '9px'}
    run, key = run_of(R().render_many('', {'b': plain}, '', None)['b']['html'], '', R().render_many('', {'c': changed}, '', None)['c']['html'], '', e, '9px', [sel])
    run['results'] = R().render_many('', {'b': plain, 'c': changed}, '', None)
    run['jobs'] = {'b': plain, 'c': changed}
    run.update(renderer=R(), slug='sgs/demo', content='', inner=None)
    monkeypatch.setattr(PR, 'scan_of', lambda run_, short: {'switchClasses': {'sgs-demo--pill': ['style'], 'sgs-demo--bubble': ['count']}, 'parts': {}, 'dataAttrs': {}, 'unread': []})
    values = {'style': [{'style': 'flat'}, {'style': 'pill'}], 'count': [{'count': 'plain'}, {'count': 'bubble'}]}
    monkeypatch.setattr(I, 'switching_values', lambda plugin, short, attr, current: values[attr])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and rep['completions'][0]['with'] == {'style': 'pill', 'count': 'bubble'}, rep


# ---------------------------------------------------------------- subject
def test_must_fail_the_property_is_read_on_the_rules_own_subject_elements():
    # The record names the part ROOT; the rule paints the second paragraph inside it.
    html = ROOT_HTML.format('<p>a</p><p>b</p>')
    e = entry(setting='indent', part='ROOT', props=('text-indent',))
    run, key = run_of(html, '', html, '.sgs-demo p + p{text-indent:24px}', e, '24', ['.sgs-demo p + p'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and '24px' in str(rep['proved'][0]['evidence']), rep


# ---------------------------------------------------------------- orientation
def test_a_rule_matching_only_the_plain_render_is_the_setting_switching_a_paint_off():
    plain = ROOT_HTML.format('<span class="sgs-demo__button">x</span>')
    changed = plain.replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--no-stretch')
    css = '.sgs-demo-1a2b3c4d:not(.sgs-demo--no-stretch) .sgs-demo__button{text-align:center}'
    e = entry(setting='stretch', part='sgs-demo__button', props=('text-align',))
    run, key = run_of(plain, css, changed, css, e, False, [':where(.sgs-demo:not(.sgs-demo--no-stretch)) .sgs-demo__button'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and out[key]['kind'] == 'switched-on', rep


# ---------------------------------------------------------------- nesting
def test_must_fail_a_rule_for_an_anchor_inside_an_anchor_is_dead(tmp_path):
    plugin = tmp_path_plugin(tmp_path, '<a class="sgs-demo__view" href="x">%s</a>')
    e = entry(setting='hover', part='sgs-demo__view a', props=('color',), state='hover')
    run, key = run_of(ROOT_HTML.format(''), '', ROOT_HTML.format(''), '', e, 'red', ['.sgs-demo__view a:hover'])
    run['plugin'] = plugin
    out, rep = PR.prove(SHORT, run)
    assert key not in out and rep['counts']['removed'] == 1 and 'dead rule' in rep['removed'][0]['evidence'], rep


def test_an_anchor_inside_a_div_is_not_dead(tmp_path):
    plugin = tmp_path_plugin(tmp_path, '<div class="sgs-demo__view">%s</div>')
    e = entry(setting='hover', part='sgs-demo__view a', props=('color',), state='hover')
    run, key = run_of(ROOT_HTML.format(''), '', ROOT_HTML.format(''), '', e, 'red', ['.sgs-demo__view a:hover'])
    run['plugin'] = plugin
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 or 'dead rule' not in str(rep['removed'])


def tmp_path_plugin(tmp_path, template):
    return tmp_plugin(tmp_path, {'includes/panel.php': '<?php\nfunction panel() { return sprintf(\'' + template + '\', $label); }\n'})


# ---------------------------------------------------------------- script-set
FILES = (
    ('src/blocks/demo/render.php', '<button class="sgs-demo__step" data-wp-class--sgs-demo__step--done="state.isDone" data-wp-bind--aria-current="state.isNow"><span class="sgs-demo__num">1</span></button>'),
    ('src/blocks/demo/view.js', 'const { state } = store("demo", { state: { get isDone() { return true; } } });'),
    ('src/shared/chip.js', "function wire(doc) { doc.querySelectorAll( '.sgs-demo__chip' ).forEach( ( chip ) => { chip.classList.toggle( 'is-detached', true ); } ); }"),
)


def test_scriptsets_lists_each_token_where_it_lands_and_what_decides_it():
    toks = {(t['kind'], t['name']): t for t in SS.scan(FILES)}
    done = toks[('class', 'sgs-demo__step--done')]
    assert done['landing'] == '.sgs-demo__step' and done['guard'] == 'src/blocks/demo/view.js::isDone' and done['source'] == 'directive'
    assert toks[('attr', 'aria-current')]['landing'] == '.sgs-demo__step'
    chip = toks[('class', 'is-detached')]
    assert chip['landing'] == '.sgs-demo__chip' and chip['guard'] == 'src/shared/chip.js::wire'


def test_must_fail_a_class_a_script_sets_is_held_where_the_script_puts_it(tmp_path):
    plugin = tmp_plugin(tmp_path, {'src/blocks/demo/render.php': FILES[0][1], 'src/blocks/demo/view.js': FILES[1][1]})
    html = ROOT_HTML.format('<button class="sgs-demo__step"><span class="sgs-demo__num">1</span></button>')
    css = '.sgs-demo__step--done .sgs-demo__num{color:var(--c,#999999)}'
    e = entry(setting='doneColour', part='sgs-demo__num', props=('color',))
    run, key = run_of(html, css, html, css + '.sgs-demo{--c:#123456}', e, '#123456', ['.sgs-demo__step--done .sgs-demo__num'])
    run['plugin'] = plugin
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and '.sgs-demo__step--done' not in str(rep['blind']), rep
    held = PR.script_holds(run, SHORT, {'.sgs-demo__step--done .sgs-demo__num'}, set())
    assert held == {'script:class:sgs-demo__step--done:.sgs-demo__step'}


# ---------------------------------------------------------------- restated
def test_must_fail_a_rule_that_restates_the_plain_value_is_removed_with_its_evidence():
    # The pill look declares `pointer-events: none` from a new rule over the same declaration of the base rule: the winning
    # rule changes, the value never does. It stayed blind as same-value-here.
    plain = ROOT_HTML.format('<span class="sgs-demo__badge">1</span>')
    changed = plain.replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--pill')
    base = '.sgs-demo__badge{pointer-events:none}'
    e = entry(setting='style', part='sgs-demo__badge', props=('pointer-events',))
    # a true/false setting: both its values are rendered, so the restating is not a one-value coincidence
    run, key = run_of(plain, base, changed, base + '.sgs-demo--pill .sgs-demo__badge{pointer-events:none}', e, True, ['.sgs-demo--pill .sgs-demo__badge'])
    out, rep = PR.prove(SHORT, run)
    assert key not in out and rep['counts']['removed'] == 1 and rep['counts']['blind'] == 0, rep
    assert 'restates' in rep['removed'][0]['evidence'] and 'pointer-events: none' in rep['removed'][0]['evidence']


def test_a_rule_that_changes_the_value_is_proved_not_removed():
    plain = ROOT_HTML.format('<span class="sgs-demo__badge">1</span>')
    changed = plain.replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--pill')
    base = '.sgs-demo__badge{pointer-events:none}'
    e = entry(setting='style', part='sgs-demo__badge', props=('pointer-events',))
    run, key = run_of(plain, base, changed, base + '.sgs-demo--pill .sgs-demo__badge{pointer-events:auto}', e, 'pill', ['.sgs-demo--pill .sgs-demo__badge'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1


def test_must_fail_a_value_that_agrees_only_through_undefined_variables_is_not_called_restated():
    # Both rules read a variable nothing defines here and fall back to red: another site defines them differently.
    plain = ROOT_HTML.format('<span class="sgs-demo__badge">1</span>')
    changed = plain.replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--pill')
    e = entry(setting='style', part='sgs-demo__badge', props=('color',))
    run, key = run_of(plain, '.sgs-demo__badge{color:var(--a,red)}', changed, '.sgs-demo__badge{color:var(--a,red)}.sgs-demo--pill .sgs-demo__badge{color:var(--b,red)}', e, 'pill',
                      ['.sgs-demo--pill .sgs-demo__badge'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 or 'restates' not in str(rep['removed']), rep


def test_must_fail_an_undefined_variable_reached_through_another_variable_gets_a_placeholder():
    # The class defines `--lift` as `var(--wp--custom--hover-lift)`; the winning declaration reads only `--lift`. Which
    # preset variable the setting points at is the setting's work, whatever a site defines.
    plain = ROOT_HTML.format('<span class="sgs-demo__badge">1</span>')
    changed = plain.replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--x')
    base = '.sgs-demo__badge{transform:var(--lift)}.sgs-demo{--lift:var(--wp--custom--a)}'
    e = entry(setting='preset', part='sgs-demo__badge', props=('transform',))
    run, key = run_of(plain, base, changed, base + '.sgs-demo--x{--lift:var(--wp--custom--b)}', e, 'x', ['.sgs-demo__badge'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and 'placeholder' in str(rep['proved'][0]['evidence']), rep


# ---------------------------------------------------------------- a test value equal to the block's own
class WeightRenderer:
    """The block prints `.sgs-demo .sgs-demo__h{<prop>:<value>}` when the setting is set; its stylesheet already gives the
    heading the first test value (the cart panel title's 700, the pill's uppercase)."""
    calls = 0

    def __init__(self, prop='font-weight', own='700'):
        self.prop, self.own = prop, own

    def _one(self, a):
        w = a.get('weight')
        return {'ok': True, 'html': '<div class="sgs-demo"><h2 class="sgs-demo__h">x</h2></div>',
                'css': f'.sgs-demo__h{{{self.prop}:{self.own}}}' + (f'.sgs-demo .sgs-demo__h{{{self.prop}:{w}}}' if w else '')}

    def render(self, slug, attrs, content, inner=None):
        self.calls += 1
        return self._one(attrs)

    def render_many(self, slug, jobs, content, inner):
        return {k: self._one(a) for k, a in jobs.items()}


def weight_run(monkeypatch, alternatives, prop='font-weight', own='700'):
    e = entry(setting='weight', part='sgs-demo__h', props=(prop,))
    r = WeightRenderer(prop, own)
    b, c = r._one({}), r._one({'weight': own})
    run, key = run_of(b['html'], b['css'], c['html'], c['css'], e, own, ['.sgs-demo .sgs-demo__h'])
    run.update(renderer=r, slug='sgs/demo', content='', inner=None)
    monkeypatch.setattr(I, 'switching_values', lambda plugin, short, attr, current: alternatives(current.get(attr)))
    return run, key


def test_must_fail_a_test_value_equal_to_the_blocks_own_is_proved_with_the_generators_next_value(monkeypatch):
    # Breaks with second_value's old `bump` only: 700 scaled to 2141 is no font weight, so nothing moved and the
    # entry was removed as "restating" the block's own 700 (cart panelTitleFontWeight, subtotalFontWeight).
    run, key = weight_run(monkeypatch, lambda held: [{'weight': '300' if held == '700' else '700'}])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and out[key]['kind'] == 'value' and 'unproved' not in out[key], rep
    assert '300' in str(rep['proved'][0]['evidence'])


def test_must_fail_a_setting_tried_at_one_value_is_never_removed_as_restating(monkeypatch):
    # Breaks without other_value_tried: with no second value to render, a coincidence with the block's own value is
    # not evidence the setting paints nothing, so the entry stays unproven.
    # a keyword (cart pillTextTransform's uppercase over the pill's own uppercase): bump has no second keyword either
    run, key = weight_run(monkeypatch, lambda held: [], prop='text-transform', own='uppercase')
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and out[key].get('unproved') == 'same-value-here', rep


def test_the_generator_gives_another_weight_when_the_first_equals_the_current_one():
    row = {'attr': 'weight', 'props': [], 'vprop': 'font-weight', 'shape': None, 'box_family': None, 'plugin': HERE, 'literals': []}
    got = I.values_for(row, {'type': 'string', 'default': ''}, {}, {'weight': '700'})
    assert [m['attrs']['weight'] for m in got] == ['300']


# ---------------------------------------------------------------- widths between the sampled screens
PROBE_LAYOUT = {'contentSize': 1200, 'wideSize': 1400, 'rootPadding': {375: 16, 768: 24, 1440: 32}}
STEPS_HTML = '<div class="sgs-demo"><span class="sgs-demo__label">Step</span></div>'
STEPS_CSS = '.sgs-demo{container:demo/inline-size}@container demo (max-width: 480px){.sgs-demo__label{display:none}}'
STEPS_ENTRY = dict(setting='namesHidden', part='sgs-demo__label', props=('display',), tiers=('@media (max-width: 767.98px)',))


def test_must_fail_a_phone_setting_hidden_by_the_blocks_own_narrow_rule_at_375_is_proved_between_the_screens():
    # The form's stepNamesHidden on phones: the block already hides the names in a container under 480px, so at the
    # sampled 375px screen hiding them changes nothing; on a 640px phone the container is wider and only the setting hides
    # them. Breaks without probe_widths: the entry was removed after a one-combination sweep.
    changed = STEPS_CSS + '@media (max-width: 767.98px){.sgs-demo__label{display:none}}'
    run, key = run_of(STEPS_HTML, STEPS_CSS, STEPS_HTML, changed, entry(**STEPS_ENTRY), {'mobile': True}, ['.sgs-demo__label'],
                      layout=PROBE_LAYOUT, theme_css='')
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and 'unproved' not in out[key], rep
    assert 'between the sampled' in str(rep['proved'][0]['evidence']) or 'probe width' in str(rep['proved'][0]['evidence'])


def test_a_rule_that_changes_nothing_at_any_width_is_still_removed():
    run, key = run_of(STEPS_HTML, STEPS_CSS, STEPS_HTML, STEPS_CSS, entry(**STEPS_ENTRY), {'mobile': True}, ['.sgs-demo__label'],
                      layout=PROBE_LAYOUT, theme_css='')
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 1 and key not in out


def test_probe_widths_fall_between_breakpoints_inside_the_tier():
    frame = PR.frame_widths(PROBE_LAYOUT, range(320, 1601))
    breaks = PR.width_breaks([STEPS_CSS], frame)
    assert breaks == [512.0]                       # the container passes 480px on a 512px screen (16px padding each side)
    assert PR.probe_widths(('@media (max-width: 767.98px)',), breaks, [375, 768, 1440]) == [639]
    assert PR.probe_widths(('@media (min-width:1024px) and (max-width:767.98px)',), breaks, [375]) == []


# ---------------------------------------------------------------- a token the block's own other setting defines
def test_must_fail_a_setting_that_stops_reading_a_token_another_setting_defines_is_proved():
    # The menu's featured hover: the plain link's transition reads `--sgs-nav-item-motion` (set only by the motion
    # setting, so undefined here and falling back), the featured rule does not read it. With the motion setting on, the
    # two differ. Breaks while a property the block declares anywhere is never given a placeholder.
    plain_css = '.sgs-demo__link{transition:color var(--sgs-demo-motion, 150ms ease)}'
    changed_css = plain_css + '.sgs-demo .sgs-demo__link{transition:color 150ms ease}'
    other = '.sgs-demo--motion .sgs-demo__link{--sgs-demo-motion:400ms linear}'  # another setting's render defines it
    html = '<div class="sgs-demo"><a class="sgs-demo__link" href="#">x</a></div>'
    e = entry(setting='featured', part='sgs-demo__link', props=('transition-duration',))
    run, key = run_of(html, plain_css, html, changed_css, e, True, ['.sgs-demo .sgs-demo__link'])
    run['results']['m'] = {'html': html, 'css': plain_css + other}
    run['jobs']['m'] = {'motion': True}
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and 'unproved' not in out[key], rep
    assert out[key]['kind'] == 'switched-on'


# ---------------------------------------------------------------- a script-set class the server also prints
def test_must_fail_a_class_the_server_prints_for_the_setting_is_not_held_on_both_pages(tmp_path):
    # The cart's hideWhenEmpty: render.php prints `sgs-demo--hidden-empty` when it is on, and view.js also toggles the class
    # on the widget. Breaks while the script-set class is held on both pages: both hide, and the entry was removed.
    plain = '<div class="sgs-demo"><span class="sgs-demo__label">x</span></div>'
    changed = '<div class="sgs-demo sgs-demo--hidden-empty"><span class="sgs-demo__label">x</span></div>'
    css = '.sgs-demo--hidden-empty{display:none}'
    e = entry(setting='hideWhenEmpty', props=('display',))
    run, key = run_of(plain, css, changed, css, e, True, ['.sgs-demo--hidden-empty'])
    run['plugin'] = tmp_plugin(tmp_path, {'src/blocks/demo/view.js':
                                          "document.querySelectorAll('.sgs-demo').forEach( ( widget ) => { widget.classList.toggle('sgs-demo--hidden-empty', n === 0); } );"})
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and 'unproved' not in out[key], rep


def test_must_fail_a_two_choice_setting_tried_each_way_may_be_removed_as_restating(monkeypatch):
    # The cart's triggerStyle (icon or pill): one pair goes icon to pill, another pill to icon, and the badge's
    # `pointer-events: none` is restated by the pill rule in both. Breaks while only a separate second render counts as a
    # second value: the entry stayed unproven as same-value-here.
    plain = ROOT_HTML.format('<span class="sgs-demo__badge">1</span>')
    pill = plain.replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--pill')
    css = '.sgs-demo__badge{pointer-events:none}.sgs-demo--pill .sgs-demo__badge{pointer-events:none}'
    e = entry(setting='style', part='sgs-demo__badge', props=('pointer-events',))
    run, key = run_of(plain, css, pill, css, e, 'pill', ['.sgs-demo--pill .sgs-demo__badge'])
    run['results'].update({'b2': {'html': pill, 'css': css}, 'c2': {'html': plain, 'css': css}})
    run['jobs'].update({'b2': {'style': 'pill'}, 'c2': {'style': 'icon'}})
    run['pairs'][key] = {('b', 'c'), ('b2', 'c2')}
    monkeypatch.setattr(I, 'switching_values', lambda plugin, short, attr, current: [])
    out, rep = PR.prove(SHORT, run)
    assert key not in out and rep['counts']['removed'] == 1 and 'restates' in rep['removed'][0]['evidence'], rep


def test_must_fail_a_style_restated_beside_a_tokened_colour_in_a_shorthand_is_restating():
    # The form's fieldBorderWidth: the plain field draws `border: 1px solid var(--edge, #ccc)`, the setting's rule writes
    # `border-style: solid`. The style is `solid` whatever --edge holds. Breaks while the var() guard reads the whole
    # declaration: the entry stayed unproven as same-value-here.
    html = ROOT_HTML.format('<input class="sgs-demo__input">')
    base = '.sgs-demo__input{border:1px solid var(--edge, #ccc)}'
    e = entry(setting='borderWidth', part='sgs-demo__input', props=('border-style',))
    run, key = run_of(html, base, html, base + '.sgs-demo .sgs-demo__input{border-style:solid}', e, True, ['.sgs-demo .sgs-demo__input'])
    out, rep = PR.prove(SHORT, run)
    assert key not in out and rep['counts']['removed'] == 1 and 'restates' in rep['removed'][0]['evidence'], rep


def test_a_colour_read_through_different_tokens_is_still_not_restating():
    html = ROOT_HTML.format('<input class="sgs-demo__input">')
    base = '.sgs-demo__input{border:1px solid var(--edge, #ccc)}'
    e = entry(setting='borderColour', part='sgs-demo__input', props=('border-color',))
    run, key = run_of(html, base, html, base + '.sgs-demo .sgs-demo__input{border-color:var(--other, #ccc)}', e, True, ['.sgs-demo .sgs-demo__input'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0


# ---------------------------------------------------------------- a placeholder of the token's own kind
def test_must_fail_a_preset_that_switches_its_transition_tokens_is_proved():
    # The button's inheritStyle: each preset class points --sgs-btn-transition-duration at its own preset token
    # (--wp--custom--button-presets--<preset>--hover-transition), undefined here. Breaks while every placeholder is a colour
    # or a length: a length in a transition's time slot makes the declaration invalid on both pages alike.
    html_b = ROOT_HTML.format('').replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--outline')
    html_c = ROOT_HTML.format('').replace('sgs-demo sgs-demo-1a2b3c4d', 'sgs-demo sgs-demo-1a2b3c4d sgs-demo--primary')
    css = ('.sgs-demo{transition:color var(--sgs-demo-dur, 0.18s) var(--sgs-demo-ease, ease)}'
           '.sgs-demo--outline{--sgs-demo-dur:var(--wp--custom--presets--outline--hover-transition, 0.18s);--sgs-demo-ease:var(--wp--custom--presets--outline--hover-easing, ease)}'
           '.sgs-demo--primary{--sgs-demo-dur:var(--wp--custom--presets--primary--hover-transition, 0.18s);--sgs-demo-ease:var(--wp--custom--presets--primary--hover-easing, ease)}')
    e = entry(setting='inheritStyle', props=('transition-duration', 'transition-timing-function'))
    run, key = run_of(html_b, css, html_c, css, e, 'primary', ['.sgs-demo--primary'])
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['removed'] == 0 and 'unproved' not in out[key], rep
    assert out[key]['kind'] == 'switched-on'


def test_placeholders_take_the_kind_their_token_names():
    vals = dict(PR.token_values({'--x--hover-easing', '--x--hover-transition', '--x--bg-colour', '--x--gap'}, ['transition']))
    assert vals['--x--hover-easing'].startswith('cubic-bezier(') and vals['--x--hover-transition'].endswith('ms')
    assert vals['--x--bg-colour'].startswith('rgb(') and vals['--x--gap'].endswith('px')
