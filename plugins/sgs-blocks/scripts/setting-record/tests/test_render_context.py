"""Block context in the offline render: a parent's setting that reaches its children only through `providesContext`
(sgs/accordion hands its item look to sgs/accordion-item) must change what the children print, as on a page."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import render as RN  # noqa: E402

PLUGIN = RN.DEFAULT_PLUGIN
FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures.json'
MARK = '#13579b'


def accordion_runs(attrs_by_job: dict) -> dict:
    fixture = json.loads(FIXTURES.read_text(encoding='utf-8'))['sgs/accordion']
    rn = RN.Renderer(PLUGIN, fixture, FIXTURES.parent, 'accordion')
    content, inner = rn.render_inner(fixture.get('inner'))
    base = RN.with_defaults(PLUGIN, 'accordion', RN.fill(fixture.get('attributes') or {}))
    jobs = {k: {**base, **a} for k, a in attrs_by_job.items()}
    return rn.render_many('sgs/accordion', jobs, content, inner)


def printed(res: dict) -> str:
    assert res.get('ok'), res.get('error')
    return (res.get('html') or '') + (res.get('css') or '')


def test_must_fail_a_context_setting_reaches_the_children():
    # Breaks with the children rendered once for every job (no context): the open item's fill never prints.
    out = accordion_runs({'default': {}, 'marked': {'itemBackgroundOpen': MARK}})
    assert MARK not in printed(out['default'])
    assert MARK in printed(out['marked'])


def test_provided_context_takes_the_attributes_the_block_names():
    ctx = RN.provided_context(PLUGIN, 'accordion', {'itemShadow': 'md', 'unrelated': 1})
    assert ctx.get('sgs/accordionItemShadow') == 'md'
    assert 'unrelated' not in ctx.values()
    assert RN.provided_context(PLUGIN, 'button', {'label': 'x'}) == {}


def test_must_fail_a_child_blocks_root_is_named_by_its_own_class():
    # Breaks with the old fallback: an element with no part class was the parent's ROOT, so the accordion item's open
    # background was placed on the accordion's own wrapper.
    import diff as D
    item = {'sgs-container', 'sgs-accordion-item', 'sgs-accordion-item--bordered', 'UID', 'wp-block-sgs-accordion-item'}
    assert D.element_part(item, 'accordion', 'UID') == 'sgs-accordion-item'
    assert D.element_part({'sgs-accordion', 'wp-block-sgs-accordion', 'UID'}, 'accordion', 'UID') == 'ROOT'
    assert D.element_part({'sgs-accordion-item__header', 'wp-block-sgs-accordion-item'}, 'accordion', '') == 'sgs-accordion-item__header'
    # a bare element with no block class keeps the old reading
    assert D.element_part({'is-layout-flex'}, 'accordion', '') == 'ROOT'


def test_must_fail_a_child_blocks_instance_id_is_its_own_class():
    # Breaks with the old map: the child's `<style id>` came first, had no class, and mapped the child's id to the parent's
    # class, so a rule on the child's root read as the parent's ROOT.
    import diff as D
    html = ('<div class="sgs-container sgs-accordion sgs-accordion-89d368aa wp-block-sgs-accordion">'
            '<style id="sgs-accordion-item-b2602553">.sgs-accordion-item-b2602553[open]{color:red}</style>'
            '<details class="sgs-container sgs-accordion-item sgs-accordion-item-b2602553 wp-block-sgs-accordion-item" open=""></details></div>')
    m = D.uid_map(html, 'accordion')
    assert m['sgs-accordion-89d368aa'] == 'sgs-accordion'
    assert m['sgs-accordion-item-b2602553'] == 'sgs-accordion-item'


def test_must_fail_a_child_the_jobs_context_breaks_fails_the_job(monkeypatch):
    # Breaks if a child's failure is drawn into an ok parent render: the job would read as the setting removing the child.
    fixture = json.loads(FIXTURES.read_text(encoding='utf-8'))['sgs/accordion']
    rn = RN.Renderer(PLUGIN, fixture, FIXTURES.parent, 'accordion')
    content, inner = rn.render_inner(fixture.get('inner'))
    real = rn.render

    def flaky(slug, attrs, content='', inner=None, context=None, child=False):
        if slug == 'sgs/accordion-item' and (context or {}).get('sgs/accordionItemBackgroundOpen') == MARK:
            return {'ok': False, 'error': 'planted child failure'}
        return real(slug, attrs, content, inner, context, child)
    monkeypatch.setattr(rn, 'render', flaky)
    base = RN.with_defaults(PLUGIN, 'accordion', RN.fill(fixture.get('attributes') or {}))
    out = rn.render_many('sgs/accordion', {'plain': base, 'marked': {**base, 'itemBackgroundOpen': MARK}}, content, inner)
    assert out['plain'].get('ok')
    assert not out['marked'].get('ok') and 'planted child failure' in out['marked']['error']


def test_a_stand_in_file_is_written_whole(tmp_path, monkeypatch):
    monkeypatch.setattr(RN, 'CACHE_ROOT', tmp_path)
    f = RN.standin_file({'a': 1}, 'json')
    assert json.loads(f.read_text(encoding='utf-8')) == {'a': 1}
    assert not list(f.parent.glob('*.tmp'))


def test_must_fail_a_child_takes_only_the_context_it_uses(monkeypatch, tmp_path):
    # Breaks if a child keeps the fixture's page-level context file whatever its usesContext lists (the buy box's postId
    # reached every child).
    fixture = {'harness': {'context': {'postId': 52, 'sgs/accordionItemShadow': 'from-page'}},
               'inner': [{'name': 'sgs/accordion-item', 'attributes': {'title': 'Q'}}, {'name': 'sgs/button', 'attributes': {'label': 'Go'}}]}
    rn = RN.Renderer(PLUGIN, fixture, FIXTURES.parent, 'accordion')
    seen = {}

    def spy(slug, attrs, content='', inner=None, context=None, child=False):
        seen[slug] = (context, child)
        return {'ok': True, 'html': ''}
    monkeypatch.setattr(rn, 'render', spy)
    rn.render_inner(fixture['inner'], {'sgs/accordionItemShadow': 'md'})
    assert seen['sgs/accordion-item'] == ({'sgs/accordionItemShadow': 'md'}, True)
    assert seen['sgs/button'] == (None, True)
