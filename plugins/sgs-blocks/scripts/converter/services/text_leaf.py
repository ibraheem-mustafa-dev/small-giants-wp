"""text_leaf.py — text-leaf detection + text-capability gate.

Faithful port of the following from orchestrator/converter_v2/convert.py,
behaviour-IDENTICAL (Spec 31 §12.4, D246):

  - ``_BLOCK_LEVEL_CHILD_TAGS``   (convert.py:5569) -> ``_BLOCK_LEVEL_CHILD_TAGS``
  - ``_CORE_TEXT_CAPABLE``        (convert.py:5580) -> ``_CORE_TEXT_CAPABLE``
  - ``_node_is_text_leaf``        (convert.py:5583) -> ``node_is_text_leaf``
  - ``_is_text_capable_block``    (convert.py:5597) -> ``is_text_capable_block``

These support the FR-31-4.1 content-leaf step: given a slug-None sgs-classed node
whose children are all text or inline content, the ladder in
``extraction._emit_content_leaf`` decides which block it becomes
(atomic-tag -> BEM-segment -> default sgs/text).

(The earlier ``route_text_leaf`` port — the frozen ``_route_text_leaf``
(convert.py:5620) with Protocol-injected unported dependencies — was DELETED
2026-07-04: it had zero call sites; ``_emit_content_leaf`` supersedes its target
selection and ``run_mechanism_leaf`` its content lift.)

No block-slug literals. No import from convert.py.
Only ``from orchestrator.converter_v2 import db_lookup`` from the frozen tree.
"""
from __future__ import annotations

from bs4 import Tag

from orchestrator.converter_v2 import db_lookup


# ---------------------------------------------------------------------------
# Block-level child tags that make a node a CONTAINER (not a text leaf).
# Inline tags (span/strong/em/a/b/i/code/br/...) are rich-text content and do
# NOT disqualify a leaf. (convert.py:5569 — verbatim copy)
# ---------------------------------------------------------------------------

_BLOCK_LEVEL_CHILD_TAGS: frozenset[str] = frozenset({
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "img", "blockquote", "hr",
    "ul", "ol", "dl", "table", "figure", "section", "article", "aside",
    "header", "footer", "nav", "div", "form", "picture", "video",
})

# core/* blocks that natively carry rich text. (convert.py:5580 — verbatim copy)
_CORE_TEXT_CAPABLE: frozenset[str] = frozenset({
    "core/heading",
    "core/paragraph",
    "core/quote",
    "core/button",
})


# ---------------------------------------------------------------------------
# node_is_text_leaf (convert.py:5583)
# ---------------------------------------------------------------------------

def node_is_text_leaf(node: Tag) -> bool:
    """True when a node holds ONLY text / inline content (no child that would
    emit its own block).

    A child Tag makes the node a CONTAINER when it carries an sgs- BEM class
    OR is a block-level tag. Inline tags are rich-text content and do NOT
    disqualify the leaf.

    Ported from convert.py:5583 (behaviour-identical).
    """
    for child in node.children:
        if not isinstance(child, Tag):
            continue
        if any(c.startswith("sgs-") for c in (child.get("class", []) or [])):
            return False
        if child.name in _BLOCK_LEVEL_CHILD_TAGS:
            return False
    return True


# ---------------------------------------------------------------------------
# is_text_capable_block (convert.py:5597)
# ---------------------------------------------------------------------------

def is_text_capable_block(slug: str) -> bool:
    """True when ``slug``'s PRIMARY content is a line of text it can carry.

    Gates text-leaf routing so a text node never lands in a block that cannot
    hold it (star-rating / media / icon excluded).

    Discriminator: the block has a ``string``-typed attr literally named
    ``text`` or ``content``. For core/* slugs, uses ``_CORE_TEXT_CAPABLE``.

    Ported from convert.py:5597 (behaviour-identical). ``db.block_attrs`` ->
    ``db_lookup.block_attrs``.
    """
    if not slug:
        return False
    if not slug.startswith("sgs/"):
        return slug in _CORE_TEXT_CAPABLE
    attrs = db_lookup.block_attrs(slug)
    for name in ("text", "content"):
        info = attrs.get(name)
        if isinstance(info, dict) and info.get("attr_type") == "string":
            return True
    return False
