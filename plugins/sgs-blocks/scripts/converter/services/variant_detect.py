"""variant_detect — recognise a block's variant from its BEM modifier + the DB.

Design ref: `.claude/plans/2026-06-23-stage2-recognition-design.md` §2 (CORRECTED
2026-06-26 per Bean + DB/draft evidence).

The variant is carried in the draft as a BEM MODIFIER on the block root class
(`sgs-hero--split`) — confirmed on the real canary hero root:
    class="... sgs-hero sgs-hero--split sgs-hero--align-left ... wp-block-sgs-hero ..."
So recognition reads the root's `--<modifier>` tokens and matches them against the
block's `variant_slots.variant_value` set (queried, never guessed). `--align-left`,
`--desktop`, `--mobile` match no variant_value and are correctly ignored.

This is pure BEM (R-22-2 — the only signal) + DB (R-22-1 — variant_value comes from
`variant_slots`, FR-22-20). It runs at recognition time with NO dependency on Stage-4
extraction and NO per-slot hand-dict (the forbidden R-22-1 cheat the earlier
emit-seam/detect_variant framing risked). The `sgs-<block>` ↔ `sgs/<block>` mapping is
the Spec 00 naming convention.
"""
from __future__ import annotations

import re
from typing import Any

from orchestrator.converter_v2 import db_lookup


def _classes(node: Any) -> list[str]:
    cls = node.get("class", []) if hasattr(node, "get") else []
    return list(cls or [])


def _bem_prefix(slug: str) -> str:
    """'sgs/hero' -> 'sgs-hero' (Spec 00 naming convention)."""
    return "sgs-" + slug.split("/")[-1]


def _variant_values(slug: str) -> frozenset[str]:
    """The block's DISTINCT variant_value set from variant_slots (DB, FR-22-20)."""
    return frozenset(vv for vv, _slots in db_lookup._variant_slots_map(slug))


def detect_variant_for_node(node: Any, slug: str) -> tuple[str | None, str | None]:
    """Return (variant_attr, variant_value) for a node recognised as `slug`.

    (None, None) when the block declares no variant attr (blocks.variant_attr NULL).
    (variant_attr, value) when exactly one root BEM modifier matches a variant_value.
    (variant_attr, None) when no modifier matches (block keeps its default — logged
    upstream as a recognition note) OR >=2 modifiers match distinct variant_values
    (genuinely ambiguous — never guess; the block default is left and the ambiguity is
    surfaced by the caller).
    """
    variant_attr = db_lookup.variant_attr_for(slug)
    if variant_attr is None:
        return (None, None)

    values = _variant_values(slug)
    if not values:
        return (variant_attr, None)

    prefix = _bem_prefix(slug)
    mod_re = re.compile(rf"^{re.escape(prefix)}--([a-z0-9-]+)$")
    matched = {
        m.group(1) for c in _classes(node)
        if (m := mod_re.match(c)) and m.group(1) in values
    }
    if len(matched) == 1:
        return (variant_attr, next(iter(matched)))
    # 0 matches -> default; >=2 distinct variant matches -> ambiguous, never guess.
    return (variant_attr, None)
