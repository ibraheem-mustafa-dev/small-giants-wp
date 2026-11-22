"""Must-fail tests for Task 2's completion (setting-record plan, Task 2 "Completion", G1 to G4): every entry proved or
removed with evidence, none left unproven for a reason the code can settle."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import instances as I  # noqa: E402
import proof as PR  # noqa: E402

HERE = Path(__file__).resolve().parent
SHORT = 'demo'
MOBILE = '@media (max-width:767.98px)'


def run_for(entry, results, jobs, renderer=None):
    key = (entry['setting'], entry['part'], tuple(entry['props']), entry['state'], tuple(entry['tiers']))
    run = {'entries': {key: dict(entry)}, 'pairs': {key: {('b', 'c')}}, 'selectors': {key: set()}, 'results': results,
           'jobs': jobs, 'children': [], 'plugin': HERE, 'renderer': renderer, 'slug': 'sgs/demo', 'content': '', 'inner': None}
    return run, key


# ---------------------------------------------------------------- G1: per-device overrides
class OverrideRenderer:
    """The demo trigger: `style` is the desktop look, `styleMobile` overrides it at 767px and below (empty inherits)."""

    def render_many(self, slug, jobs, content, inner):
        return {k: self.one(a) for k, a in jobs.items()}

    @staticmethod
    def one(a):
        mobile = a.get('styleMobile') or a.get('style', 'icon')
        return {'ok': True, 'html': f'<div class="sgs-demo sgs-demo--m-{mobile}"><span class="sgs-demo__label">x</span></div>',
                'css': MOBILE + '{.sgs-demo--m-pill .sgs-demo__label{color:#111111}.sgs-demo--m-icon .sgs-demo__label{color:#222222}}'}


def override_run(monkeypatch):
    schema = {'style': {'type': 'string', 'enum': ['icon', 'pill'], 'default': 'icon'},
              'styleMobile': {'type': 'string', 'enum': ['', 'icon', 'pill'], 'default': ''}}
    monkeypatch.setattr(I, 'block_json', lambda plugin, short: {'attributes': schema})
    values = {'style': ['icon', 'pill'], 'styleMobile': ['icon', 'pill']}
    monkeypatch.setattr(I, 'switching_values', lambda plugin, short, attr, current: [{attr: v} for v in values[attr] if v != current.get(attr)])
    monkeypatch.setattr(PR, 'scan_of', lambda run_, short: None)
    e = {'setting': 'styleMobile', 'part': 'sgs-demo__label', 'props': ['color'], 'state': None, 'tiers': [MOBILE]}
    # the check's own pair: the mobile override set to the look the desktop value already gives, so nothing moves
    plain, changed = {'style': 'icon', 'styleMobile': ''}, {'style': 'icon', 'styleMobile': 'icon'}
    results = {'b': OverrideRenderer.one(plain), 'c': OverrideRenderer.one(changed)}
    run, key = run_for(e, results, {'b': plain, 'c': changed}, OverrideRenderer())
    run['selectors'] = {key: {'.sgs-demo--m-icon .sgs-demo__label', '.sgs-demo--m-pill .sgs-demo__label'}}
    return run, key


def test_must_fail_an_override_is_tried_against_a_desktop_value_it_changes(monkeypatch):
    # Breaks without the sweep: the test value equals the desktop look, so the entry was same-value-here or removed.
    run, key = override_run(monkeypatch)
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1, rep
    assert 'unproved' not in out[key] and rep['overrideSweeps']['styleMobile'] >= 1


def test_override_of_reads_the_name():
    schema = {'triggerStyle': {}, 'triggerStyleMobile': {}, 'triggerStyleTablet': {}, 'mobileMenu': {}}
    assert PR.override_of(schema, 'triggerStyleMobile') == 'triggerStyle'
    assert PR.override_of(schema, 'triggerStyleTablet') == 'triggerStyle'
    assert PR.override_of(schema, 'mobileMenu') is None
    assert PR.override_of(schema, 'paddingMobile') is None  # no `padding` beside it


def test_an_override_that_changes_nothing_in_any_combination_is_removed(monkeypatch):
    run, key = override_run(monkeypatch)

    class Flat(OverrideRenderer):
        @staticmethod
        def one(a):
            return {'ok': True, 'html': '<div class="sgs-demo"><span class="sgs-demo__label">x</span></div>',
                    'css': MOBILE + '{.sgs-demo .sgs-demo__label{color:#111111}}'}

    run['renderer'] = Flat()
    run['results'] = {'b': Flat.one({}), 'c': Flat.one({})}
    run['selectors'] = {key: {'.sgs-demo .sgs-demo__label'}}
    out, rep = PR.prove(SHORT, run)
    assert key not in out and rep['counts']['removed'] == 1


# ---------------------------------------------------------------- G3: the block inside its fixture's parents
class ParentRenderer:
    def render(self, slug, attrs, content='', inner=None):
        return {'ok': True, 'html': f'<div class="sgs-row">{content}</div>', 'css': ''}


def test_must_fail_a_rule_scoped_by_the_parent_is_proved_inside_it(monkeypatch):
    # Breaks without the parent shell: the header row is another block's markup, so the rule's part was never drawn.
    import render as RN
    monkeypatch.setattr(RN, 'with_defaults', lambda plugin, short, attrs: attrs)
    monkeypatch.setattr(PR, 'scan_of', lambda run_, short: None)
    html = '<div class="sgs-demo"><span class="sgs-demo__label">x</span></div>'
    e = {'setting': 'surface', 'part': 'sgs-row', 'props': ['position'], 'state': None, 'tiers': []}
    results = {'b': {'ok': True, 'html': html, 'css': ''}, 'c': {'ok': True, 'html': html, 'css': '.sgs-row:has(.sgs-demo){position:relative}'}}
    run, key = run_for(e, results, {'b': {}, 'c': {'surface': 'on'}}, ParentRenderer())
    run['selectors'] = {key: {'.sgs-row:has(.sgs-demo)'}}
    run['plan'] = {'fixture': {'parents': [{'name': 'sgs/row', 'attributes': {}}]}}
    out, rep = PR.prove(SHORT, run)
    assert rep['counts']['proved'] == 1 and rep['parents']['names'] == ['sgs/row']
