"""test_bare_tag_lift.py — Layer A: bare content tags land, two ways (Spec 31 §3.B.0).

The SAME bare tag (a <p> with no BEM class) becomes EITHER a nested child block (in an
InnerBlocks parent) OR a block's built-in scalar element (in a typed block), by the
DB-driven content fork — never dropped.

  * Mechanism B (InnerBlocks parent): a bare <p>/<h4> child that G1 + global-BEM miss
    falls back to atomic recognition -> sgs/text / sgs/heading CHILD block (the brand
    quote body drop, diagnosed 2026-07-01).
  * Mechanism A (typed scalar block): a bare tag with no class lifts into the block's
    built-in scalar element via the DB chain (element token -> block_for_slot_token ->
    reverse atomic_tag_map -> candidate tags). Fallback-only + consume-once.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_bare_tag_lift.py -q --import-mode=importlib
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.recognition import recognise
from converter.resolvers.scalar_content import lift_scalar_content
from converter.services.extraction import extract_content


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# -- Mechanism B: bare content tags -> child blocks (not dropped) --------------

_QUOTE_HTML = """<div class="sgs-brand__quote">
  <p>Body paragraph one.</p>
  <p>Body paragraph two.</p>
  <p class="sgs-brand__attribution">— Zainab</p>
</div>"""


def test_mechanism_b_bare_paragraphs_become_text_children_not_dropped():
    """An InnerBlocks parent's bare <p> children land as sgs/text child blocks — the
    brand-quote body drop (G1 + global-BEM both miss -> was ContentGap; now atomic)."""
    q = _node(_QUOTE_HTML)
    rec = recognise(q)  # scalar sgs/quote, has_inner=1 -> Mechanism B
    results = extract_content(rec, q, media_map={}, css_rules={})
    from converter.context import ChildBlock, ContentGap
    text_children = [r for r in results if isinstance(r, ChildBlock)]
    gaps = [r for r in results if isinstance(r, ContentGap)]
    # 3 paragraphs -> 3 content children; zero body paragraphs dropped to a gap.
    assert len(text_children) >= 3
    assert not any("no resolvable slug" in g.detail for g in gaps)


# -- Mechanism A: bare tags -> built-in scalar elements (typed block) ----------

def test_mechanism_a_bare_tags_lift_into_builtin_elements():
    """A typed scalar block (testimonial) lifts bare-tag content into its built-in
    scalar attrs when the draft carries no BEM classes on the content."""
    node = _node(
        '<div class="sgs-testimonial">'
        "<blockquote>Great product, changed my life</blockquote>"
        "<p>Jane Smith</p></div>"
    )
    lifted = lift_scalar_content(node, "sgs/testimonial", {})
    assert lifted.get("quote") == "Great product, changed my life"
    assert lifted.get("reviewerName") == "Jane Smith"


def test_mechanism_a_bare_tag_is_fallback_only_classed_draft_unchanged():
    """Regression: a properly BEM-classed draft still matches by class — the bare-tag
    path never overrides an existing class match."""
    node = _node(
        '<div class="sgs-testimonial">'
        '<p class="sgs-testimonial__quote">Classed quote</p>'
        '<p class="sgs-testimonial__author">Bob</p></div>'
    )
    lifted = lift_scalar_content(node, "sgs/testimonial", {})
    assert lifted.get("quote") == "Classed quote"
    assert lifted.get("reviewerName") == "Bob"


def test_mechanism_a_consume_once_no_double_claim():
    """Two text attrs mapping to the same tag type do not both claim the same bare tag."""
    node = _node(
        '<div class="sgs-testimonial">'
        "<blockquote>The quote</blockquote>"
        "<p>Author One</p></div>"
    )
    lifted = lift_scalar_content(node, "sgs/testimonial", {})
    # quote takes the blockquote; reviewerName takes the <p> — not the same node.
    assert lifted.get("quote") == "The quote"
    assert lifted.get("reviewerName") == "Author One"


def test_mechanism_a_opt_in_gate_preserved():
    """A block WITHOUT scalar-content-lift capability stays a hard no-op (the bare-tag
    fallback never fires for non-opted-in blocks) — info-box today has 'icon-text' only."""
    node = _node('<div class="sgs-info-box"><h4>Oats</h4><p>Rich in iron</p></div>')
    assert lift_scalar_content(node, "sgs/info-box", {}) == {}
