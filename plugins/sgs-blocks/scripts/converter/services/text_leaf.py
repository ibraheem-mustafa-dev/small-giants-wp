"""text_leaf.py — text-leaf detection, capability gate, and routing.

Faithful port of the following from orchestrator/converter_v2/convert.py,
behaviour-IDENTICAL (Spec 31 §12.4, D246):

  - ``_BLOCK_LEVEL_CHILD_TAGS``   (convert.py:5569) -> ``_BLOCK_LEVEL_CHILD_TAGS``
  - ``_CORE_TEXT_CAPABLE``        (convert.py:5580) -> ``_CORE_TEXT_CAPABLE``
  - ``_node_is_text_leaf``        (convert.py:5583) -> ``node_is_text_leaf``
  - ``_is_text_capable_block``    (convert.py:5597) -> ``is_text_capable_block``
  - ``_route_text_leaf``          (convert.py:5620) -> ``route_text_leaf``

These three functions form the FR-22-4.1 content-leaf step: given a slug-None
sgs-classed node whose children are all text or inline content, decide which block
it becomes (3-rung ladder: atomic-tag -> BEM-segment -> default sgs/text) and emit
the block markup with CSS/typography lifted onto it.

No block-slug literals. No import from convert.py.
Only ``from orchestrator.converter_v2 import db_lookup`` from the frozen tree.

Dependencies on functions not yet ported to the new engine
(``collect_css_for_classes``, ``route_node_css``, ``emit_wp_block``,
``atomic_attrs_for``) are declared as Protocol stubs and injected by the caller —
see ``route_text_leaf`` signature.
"""
from __future__ import annotations

from typing import Callable, Protocol

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
# Protocols for unported dependencies (injected by caller)
# ---------------------------------------------------------------------------

class _CollectCssProto(Protocol):
    """collect_css_for_classes (convert.py:414) — NOT YET ported to new engine."""
    def __call__(self, classes: list[str], css_rules: dict) -> str: ...


class _RouteNodeCssProto(Protocol):
    """route_node_css (convert.py:2015) — NOT YET ported to new engine."""
    def __call__(
        self,
        node: Tag,
        css_rules: dict,
        attrs: dict,
        effective_slug: str,
        *,
        lift_typography: bool = False,
        typo_slug: str | None = None,
        lift_root_supports: bool = True,
        lift_wrapper_css: bool = True,
        allow_max_width: bool = False,
    ) -> None: ...


class _EmitWpBlockProto(Protocol):
    """emit_wp_block (convert.py:3090) — NOT YET ported to new engine."""
    def __call__(self, slug: str, attrs: dict, inner: list[str]) -> str: ...


class _AtomicAttrsForProto(Protocol):
    """atomic_attrs_for (_atomic_attrs_for, convert.py:3227) — NOT YET ported.

    FLAGGED (R-22-1): the source function contains per-block slug literals
    (``if slug == 'sgs/heading'`` etc.). The orchestrator MUST NOT reproduce
    those literals when porting; it must use DB-driven dispatch.
    """
    def __call__(
        self,
        node: Tag,
        slug: str,
        allow_text_fallback: bool = True,
        css_rules: dict | None = None,
    ) -> dict: ...


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


# ---------------------------------------------------------------------------
# route_text_leaf (convert.py:5620)
# ---------------------------------------------------------------------------

def route_text_leaf(
    node: Tag,
    classes: list[str],
    sgs_classes: list[str],
    css_rules: dict,
    variation_buf: list[str] | None,
    *,
    collect_css_for_classes: _CollectCssProto,
    route_node_css: _RouteNodeCssProto,
    emit_wp_block: _EmitWpBlockProto,
    atomic_attrs_for: _AtomicAttrsForProto,
    trace: Callable[..., None] | None = None,
) -> str:
    """Emit a slug-None sgs-classed CONTENT LEAF as the right content block.

    Target ladder (3 rungs, in order):

    (a) Atomic-tag swap — the node's OWN HTML tag via ``db_lookup.atomic_tag_map()``.
        UNGATED (img -> sgs/media, p -> sgs/text, h* -> sgs/heading, a -> core/button,
        blockquote -> sgs/quote, hr -> core/separator).
    (b) BEM-segment lookup — only when (a) misses (span/div). Parses the first sgs-
        BEM class element segment, walks hyphen-split tokens tail-first looking for a
        ``db_lookup.block_for_slot_token()`` hit that ALSO passes
        ``is_text_capable_block()`` (the gate that stops a text span grabbing a
        media/logo block).
    (c) Default — ``sgs/text``.

    Ported from convert.py:5620 (behaviour-identical). ``db.X`` -> ``db_lookup.X``;
    module-private ``_trace`` -> optional ``trace`` parameter; ``collect_css_for_classes``
    / ``route_node_css`` / ``emit_wp_block`` / ``_atomic_attrs_for`` -> injected callables.
    """
    target: str | None = None

    # (a) the node's OWN tag is authoritative for content TYPE.
    target = db_lookup.atomic_tag_map().get(node.name)

    # (b) tag has no atomic mapping (span/div) -> resolve a BEM-element hyphen-segment
    #     to a TEXT-capable block, tail-first (most specific). Gated to text-capable.
    if target is None:
        bem = None
        for cls in sgs_classes:
            parsed = db_lookup.parse_sgs_bem(cls)
            if parsed is not None and parsed.element:
                bem = parsed
                break
        if bem is not None and bem.element:
            for seg in reversed(bem.element.split("-")):
                cand = db_lookup.block_for_slot_token(seg)
                if cand and is_text_capable_block(cand):
                    target = cand
                    break

    # (c) default — genuine text content (a bare-text leaf IS a paragraph).
    #     DB-derived (R-22-1 / no-slug-literal gate): the 'text' canonical slot
    #     resolves to the default text block (sgs/text) via the slots table.
    if target is None:
        target = db_lookup.standalone_block_for("text")

    # Collect scoped CSS for this node's classes and append to variation_buf.
    css = collect_css_for_classes(classes, css_rules)
    if css and variation_buf is not None:
        variation_buf.append(css)

    # Build base attrs from the atomic-tag handler.
    attrs = atomic_attrs_for(node, target)

    # CSS-lift: raise typography from the draft element's own CSS rules onto the
    # block's own attrs. Gated to text-capable targets.
    if is_text_capable_block(target):
        route_node_css(
            node,
            css_rules,
            attrs,
            effective_slug=target,
            lift_typography=True,
            typo_slug=target,
            lift_root_supports=False,
            lift_wrapper_css=True,
            allow_max_width=True,
        )

    # className-mirror PURGED (D249, R-22-15 / 7-rules #1 CONVERT-don't-mirror): a
    # native converted block carries its identity via its block NAME, never the draft's
    # BEM element classes. Re-emitting `sgs_classes` onto className was the mirror cheat
    # (now caught statically by the Check #9 converter-source gate). `sgs_classes` is
    # still consumed above for target detection — input use only, not an output mirror.

    if trace is not None:
        trace(
            "walker_branch_taken",
            branch="text_leaf",
            node_classes=classes,
            target=target,
            content_keys=list(attrs.keys()),
        )

    return emit_wp_block(target, attrs, [])
