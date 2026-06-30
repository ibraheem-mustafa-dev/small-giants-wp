"""recognise_helpers — small DB-driven helpers for Stage-2 recognition.

Design ref: `.claude/plans/2026-06-23-stage2-recognition-design.md` §1.

All three helpers key on DB facts only (R-31-1, names no block). None of them reads
the frozen `convert.py`; the only frozen-package import is `db_lookup` (the permitted
DB-accessor layer — same as the slice's dispatch_table).
"""
from __future__ import annotations

import re
from typing import Any

from orchestrator.converter_v2 import db_lookup

# container_kind tie-break priority for a node carrying >=2 registered BEM root
# classes (design §1 fold-L): a section outranks a layout outranks a content block.
# Names no block — keyed on block_composition.container_kind, never source order.
_KIND_PRIORITY = {"section": 3, "layout": 2, "content": 1}

# A BEM element class: sgs-<block>__<element>[--<modifier>]. We want <element>.
_BEM_ELEMENT_RE = re.compile(r"^sgs-[a-z0-9-]+__([a-z0-9-]+?)(?:--[a-z0-9-]+)*$")


def _classes(node: Any) -> list[str]:
    """The node's class list (bs4.Tag.get('class') returns a list or None)."""
    cls = node.get("class", []) if hasattr(node, "get") else []
    return list(cls or [])


def get_container_kind(slug: str) -> str | None:
    """section | layout | content | None — block_composition.container_kind (DB)."""
    return db_lookup.get_container_kind(slug)


def pick_root(candidates: list[str]) -> str | None:
    """Pick ONE registered slug from multiple BEM root classes, or None if ambiguous.

    Rank by container_kind priority (section > layout > content > unknown). Return the
    sole highest-ranked candidate. A TIE at the top rank is genuinely ambiguous -> None
    (the caller emits UNRECOGNISED + WARN; never a source-order pick — design §1 fold-L).
    """
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]
    ranked = sorted(
        candidates,
        key=lambda s: _KIND_PRIORITY.get(get_container_kind(s) or "", 0),
        reverse=True,
    )
    top = _KIND_PRIORITY.get(get_container_kind(ranked[0]) or "", 0)
    top_slugs = [s for s in ranked if _KIND_PRIORITY.get(get_container_kind(s) or "", 0) == top]
    return ranked[0] if len(top_slugs) == 1 else None


def bem_element_to_canonical_slot(node: Any) -> str | None:
    """Resolve this node's BEM element token (sgs-x__<element>) to a canonical slot.

    Returns the canonical slot name (e.g. 'heading', 'text', 'label') via
    db_lookup.canonical_slot_for (DB synonym table, hyphen/case-insensitive), or None
    when the node carries no BEM element class or the token resolves to no known slot.
    The caller then asks db_lookup.standalone_block_for(canonical_slot) for the block;
    an unresolved token -> None -> UNRECOGNISED (honest loud-fail, never a guess).
    """
    for c in _classes(node):
        m = _BEM_ELEMENT_RE.match(c)
        if not m:
            continue
        token = m.group(1)
        canonical = db_lookup.canonical_slot_for(token)
        if canonical:
            return canonical
    return None
