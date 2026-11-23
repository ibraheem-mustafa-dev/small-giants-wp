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
