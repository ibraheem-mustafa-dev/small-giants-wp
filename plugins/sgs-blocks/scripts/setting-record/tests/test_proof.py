"""The proof's verdicts on small hand-made renders: proved, removed, blind (part absent, coincident value, theme value),
re-filed, and the kind."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import proof as PR  # noqa: E402

SHORT = 'demo'


def run_of(base_html, base_css, changed_html, changed_css, entry, setting_value, selectors=()):
    """A run with one plain and one changed render behind one entry; no plugin stylesheets."""
    key = (entry['setting'], entry['part'], tuple(entry['props']), entry['state'], tuple(entry['tiers']))
    run = {
        'entries': {key: dict(entry)},
        'pairs': {key: {('b', 'c')}},
        'selectors': {key: set(selectors)},
        'results': {'b': {'html': base_html, 'css': base_css}, 'c': {'html': changed_html, 'css': changed_css}},
        'jobs': {'b': {}, 'c': {entry['setting']: setting_value}},
        'children': [],
        'plugin': HERE,  # sheet_files finds no block folder here: the renders' own CSS is all there is
    }
    return run, key


def entry(setting='colour', part='ROOT', props=('color',), state=None, tiers=()):
    return {'setting': setting, 'part': part, 'props': list(props), 'state': state, 'tiers': list(tiers)}


HTML = '<div class="sgs-demo"><span class="sgs-demo__label">x</span></div>'


def verdicts(report):
    return {v: len(report[v]) for v in ('proved', 'refiled', 'removed', 'blind')}


def test_value_entry_is_proved_with_kind_value():
    run, key = run_of(HTML, '', HTML, '.sgs-demo{color:#123456}', entry(), '#123456', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['proved'] == 1
    assert out[key]['kind'] == 'value'  # rgb(18, 52, 86) carries the setting's #123456


def test_switched_on_entry_kind():
    e = entry(setting='gradientText', props=('background-clip',))
    run, key = run_of(HTML, '', HTML, '.sgs-demo{background-clip:text}', e, 'linear-gradient(red, blue)', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert out[key]['kind'] == 'switched-on'


def test_must_fail_entry_losing_to_a_stronger_rule_is_removed():
    # Breaks if the proof compared rules instead of the cascade: the setting's rule is printed, but a stronger rule
    # wins in both renders, so the part's colour never moves.
    strong = '.sgs-demo.sgs-demo{color:red}'
    run, key = run_of(HTML, strong, HTML, strong + '.sgs-demo{color:#123456}', entry(), '#123456', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['removed'] == 1 and key not in out


def test_must_fail_part_a_script_builds_is_blind_not_removed(tmp_path):
    # Breaks if an entry the proof cannot see were deleted: the part is not in the server render because the block's
    # front-end script builds it. (A class no source prints at all is dead CSS and goes: tests/test_lane_d.py.)
    plugin = tmp_path / 'plugins' / 'sgs-blocks'
    (plugin / 'src' / 'blocks' / SHORT).mkdir(parents=True)
    (plugin / 'src' / 'blocks' / SHORT / 'view.js').write_text("panel.className = 'sgs-demo__panel';", encoding='utf-8')
    e = entry(part='sgs-demo__panel')
    run, key = run_of(HTML, '', HTML, '.sgs-demo__panel{color:#123456}', e, '#123456', ['.sgs-demo__panel'])
    run['plugin'] = plugin
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['blind'] == 1 and key in out
    assert out[key]['unproved'] == 'script-built-part'  # its kind is a reading, and the record says so


def test_coincident_inherited_value_is_proved_over_a_sentinel_underlay():
    # border-radius: inherit from a root with no radius gives 0, as the plain render does: the first renders show nothing,
    # but over the underlay the pseudo-element inherits the root's sentinel and the plain page shows its own.
    e = entry(setting='bg', part='ROOT::after', props=('border-radius',))
    run, key = run_of(HTML, '.sgs-demo::after{content:""}', HTML, '.sgs-demo::after{content:"";border-radius:inherit}', e, '#123456', ['.sgs-demo::after'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['proved'] == 1 and out[key]['kind'] == 'switched-on'
    assert 'underlay' in rep['proved'][0]['evidence']


def test_theme_custom_property_is_blind():
    # The plain value reads a custom property only the theme defines; without the theme both sides fall back alike.
    css = '.sgs-demo{color:var(--theme-ink, red)}'
    run, key = run_of(HTML, css, HTML, css + '.sgs-demo{color:var(--theme-ink, red)}', entry(), 'red', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['blind'] == 1 and 'theme' in rep['blind'][0]['evidence']


def test_difference_on_another_part_is_refiled():
    run, key = run_of(HTML, '', HTML, '.sgs-demo__label{color:#123456}', entry(), '#123456', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['refiled'] == 1
    assert ('colour', 'sgs-demo__label', ('color',), None, ()) in out


def test_held_hover_state_is_proved():
    e = entry(state='hover')
    run, key = run_of(HTML, '', HTML, '.sgs-demo:hover{color:#123456}', e, '#123456', ['.sgs-demo:hover'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['proved'] == 1


def test_shorthand_entry_compares_longhands():
    e = entry(setting='width', props=('border-width',))
    run, key = run_of(HTML, '.sgs-demo{border-style:solid}', HTML, '.sgs-demo{border-style:solid;border-width:5px}', e, '5px', ['.sgs-demo'])  # not 3px: that is `medium`, the initial width
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['proved'] == 1 and out[key]['kind'] == 'value'


def test_bump_varies_numbers_and_colours_only():
    assert PR.bump({'desktop': '37px', 'mobile': '7px'}) == {'desktop': '152px', 'mobile': '62px'}
    assert PR.bump('#13579b') == '#2c8a4f'
    assert PR.bump(437) == 1352
    assert PR.bump(True) is None and PR.bump('center') is None


def test_must_fail_floor_coincidence_is_not_proved_without_a_second_render():
    # Breaks if a coincident value were counted as proved from the first renders alone: with no renderer to try a
    # second value, the entry must stay blind (same value here), never proved.
    e = entry(setting='size', props=('min-height',))
    run, key = run_of(HTML, '.sgs-demo{min-height:44px}', HTML, '.sgs-demo{min-height:max(44px, 37px)}', e, '37px', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['blind'] == 1 and out[key]['unproved'] == 'same-value-here'


def test_must_fail_rule_in_a_state_nothing_decides_is_blind_not_removed():
    # Breaks if an entry whose rule holds only in a state the proof cannot hold (a visitor's :user-invalid) were deleted:
    # at rest the rule never matches and nothing changes.
    html = '<div class="sgs-demo"><input class="sgs-demo__input"><span class="sgs-demo__label">x</span></div>'
    sel = '.sgs-demo:has(.sgs-demo__input:user-invalid) .sgs-demo__label'
    e = entry(setting='offset', part='sgs-demo__label', props=('top',))
    css = '.sgs-demo__label{top:1px}'
    run, key = run_of(html, css, html, css + '.sgs-demo{--x:37px}', e, '37px', [sel])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['blind'] == 1 and out[key]['unproved'] == 'state-not-holdable'


def test_must_fail_container_query_entry_is_blind_not_removed():
    # Breaks if an entry under @container (which needs laid-out widths) were judged by the proof: it never holds
    # offline, so both renders compute alike and the entry would be deleted.
    e = entry(setting='cols', props=('grid-template-columns',), tiers=('@container demo (min-width: 480px)',))
    css = '@container demo (min-width: 480px){.sgs-demo{grid-template-columns:1fr 1fr}}'
    run, key = run_of(HTML, '', HTML, css, e, '2', ['.sgs-demo'])
    out, rep = PR.prove(SHORT, run)
    assert verdicts(rep)['blind'] == 1 and out[key]['unproved'] == 'container-query'
