"""recognition.py — Stage-2 block recognition (modular rebuild, step-3 stage 1).

Design ref: `.claude/plans/2026-06-23-stage2-recognition-design.md`.

The recognition CONTRACT, defined ONLY from the DRAFT + DB + Spec (never from what the
frozen `convert.py` does): per Spec 22 §FR-31-3 + the Spec 00 naming convention
(`.sgs-<block>` BEM root ↔ block `sgs/<block>`), every BEM-classed draft node resolves
to a block slug via a DB lookup. A top-level section whose BEM root maps to a registered
composite emits AS that composite (the hero IS the section), never a generic wrapper.

BEM is the ONLY recognition signal (R-31-2 / Spec 00 §3.1 / Spec 22 FR-31-3). No
structural heuristics, no frozen-engine logic. The only frozen-package import is
`db_lookup` (the permitted DB-accessor layer). Names no block (R-31-1 / R-31-9) — every
fork keys on DB facts (`block_exists`, `atomic_tag_map`, `get_container_kind`,
`standalone_block_for`, `variant_slots`), never an `if slug == "sgs/..."`.

`kind` is a CLOSED Literal — exhaustiveness is a static mypy guarantee (a new kind is a
compile error at the definition); the runtime `assert_never` in `build_ctx` guards only
an Any-typed corruption, and `unrecognised` is a normal handled case routed BEFORE it.
"""
from __future__ import annotations

import dataclasses
import sqlite3
from typing import Any, assert_never

from orchestrator.converter_v2 import db_lookup

from converter.context import Ctx, Recognition
from converter.models import GAP, GapOrigin
from converter.services import recognise_helpers, variant_detect
from converter.services.has_inner import derive_has_inner_blocks


def _classes(node: Any) -> list[str]:
    cls = node.get("class", []) if hasattr(node, "get") else []
    return list(cls or [])


def _root_classes(node: Any) -> list[str]:
    """BEM root classes: sgs-<x> with no '__' element and no '--' modifier."""
    return [c for c in _classes(node)
            if c.startswith("sgs-") and "__" not in c and "--" not in c]


def recognise(node: Any, css_rules: dict | None = None) -> Recognition:
    """Resolve one draft node to a Recognition (block identity + variant), DB-driven.

    Branch order (design §1): named/composite -> atomic-tag -> scalar element-slot ->
    unrecognised. A recognised composite (variant-bearing) also gets its variant from
    the BEM modifier matched against variant_slots.variant_value (services.variant_detect).
    """
    root_classes = _root_classes(node)

    # 1. NAMED / composite — a BEM root class mapping to a registered slug.
    candidates = [
        s for c in root_classes
        if db_lookup.block_exists(s := "sgs/" + c[4:])
    ]
    if candidates:
        picked = recognise_helpers.pick_root(candidates)  # None if ambiguous (>=2 same-rank)
        if picked is not None:
            variant_attr, variant_value = variant_detect.detect_variant_for_node(node, picked)
            return Recognition(
                kind="named",
                slug=picked,
                container_kind=recognise_helpers.get_container_kind(picked),
                has_inner_blocks=derive_has_inner_blocks(picked),
                variant_attr=variant_attr,
                variant_value=variant_value,
            )
        # >=2 registered roots at the same container-kind rank — genuinely ambiguous.
        return Recognition("unrecognised", None, None, None)

    # 2. ATOMIC-TAG — no sgs- root class, tag maps to a block (h1->sgs/heading, ...).
    tag = getattr(node, "name", None)
    atom = db_lookup.atomic_tag_map().get(tag) if tag else None
    if not root_classes and atom is not None:
        return Recognition("atomic", atom, recognise_helpers.get_container_kind(atom), 0)

    # 3. SCALAR element-slot — a BEM element class (sgs-x__y) mapping to a slot's block.
    # has_inner_blocks is DERIVED from the DB (NOT hardcoded 0): a slot can map to an
    # InnerBlocks PARENT (e.g. .sgs-hero__ctas -> sgs/multi-button, has_inner=1), which
    # MUST route to Mechanism B and recurse its children. Hardcoding 0 here mis-typed
    # every element-class-recognised composite as a leaf -> Case-4 "no content" gap ->
    # its children silently dropped (the real-hero CTA loss, found by the full-homepage
    # run 2026-06-30; a synthetic test using the NAMED root-class path masked it). The
    # named branch (above) already derives this; the scalar branch must match.
    canonical_slot = recognise_helpers.bem_element_to_canonical_slot(node)
    slot_slug = db_lookup.standalone_block_for(canonical_slot) if canonical_slot else None
    if slot_slug is not None:
        return Recognition(
            "scalar",
            slot_slug,
            recognise_helpers.get_container_kind(slot_slug),
            derive_has_inner_blocks(slot_slug),
        )

    # 4. UNRECOGNISED — a BEM-classed node resolving to no registered block. Loud RED.
    return Recognition("unrecognised", None, None, None)


def unrecognised_gap(node: Any) -> GAP:
    """The loud RED coverage row for an unrecognised node (S2-unknown: finish the rest).

    NEVER a silent empty sgs/container emit. The plain-English `detail` tells a non-coder
    QC owner what happened + what to do (design §9-fold-K).
    """
    classes = [c for c in _classes(node) if c.startswith("sgs-")]
    where = classes[0] if classes else getattr(node, "name", "<node>")
    return GAP(
        origin=GapOrigin.UNRECOGNISED,
        property="(block-recognition)",
        tier="Base",
        detail=(
            f"Could not identify the SGS block for the section with class '{where}'. "
            "This section was skipped (the rest of the page still clones). "
            "What to do: flag to the developer — the block type may not be in the DB yet."
        ),
    )


def build_ctx(rec: Recognition, node: Any, is_root: bool, conn: sqlite3.Connection) -> Ctx:
    """Recognition -> Ctx adapter (design §9-fold-M).

    Builds the per-element Ctx the orchestrator/resolvers consume. The caller MUST route
    `kind == "unrecognised"` to `unrecognised_gap` BEFORE calling this (an unrecognised
    node has slug=None and never enters resolver dispatch). A recognised composite emits
    AS the section via the slice's emit_block_markup — not the frozen walk.
    """
    kind = rec.kind
    # Explicit ==/or chain (NOT `kind in (tuple)`): mypy narrows the former to reach
    # `Never` at assert_never, but does NOT narrow tuple-membership — so this is what
    # makes the static-exhaustiveness guarantee real (review BUG-1, 2026-06-26).
    if kind == "named" or kind == "atomic" or kind == "scalar":
        assert rec.slug is not None  # guaranteed for recognised kinds
        return Ctx(
            block_slug=rec.slug,
            container_kind=rec.container_kind or "",
            has_inner_blocks=rec.has_inner_blocks or 0,
            variant_value=rec.variant_value,
            variant_attr=rec.variant_attr,
            node=node,
            is_root=is_root,
            base_layer=None,
            conn=conn,
        )
    if kind == "unrecognised":
        raise ValueError(
            "build_ctx called on an unrecognised Recognition — route it to "
            "unrecognised_gap() first (it produces a coverage row, not a Ctx)."
        )
    assert_never(kind)  # static-exhaustive; fires only on Any-typed corruption


def variant_attrs(rec: Recognition) -> dict[str, str]:
    """The native attr dict the recognised variant produces, for emit_block_markup.

    e.g. Recognition(kind='named', slug='sgs/hero', variant_attr='variant',
    variant_value='split') -> {'variant': 'split'}. Empty when the block has no variant.
    """
    if rec.variant_attr and rec.variant_value:
        return {rec.variant_attr: rec.variant_value}
    return {}


def recognition_for_slug(slug: str, node: Any) -> Recognition:
    """Build a Recognition for a child whose slug the CALLER already resolved.

    The child-resolution in ``run_mechanism_b`` is PARENT-SCOPED: a token under an
    InnerBlocks parent can resolve via ``child_block_for_parent_token`` (G1) to a
    slug the global ``recognise()`` would NOT pick (e.g. accordion ``__item`` ->
    ``sgs/accordion-item``, not the global ``card`` alias — Spec 22 §FR-31-5.3).
    The W3 child-lift collapse routes every child through ``build_block_markup``,
    which needs a full Recognition; re-recognising the node here would DROP that
    parent-scoped override. So: if global ``recognise()`` already agrees on the
    slug, return its result verbatim (it carries the variant); otherwise rebuild
    the Recognition for the caller's resolved slug, deriving the DB facts +
    variant for THAT slug. DB-driven (R-31-1); names no block.
    """
    base = recognise(node)
    if base.slug == slug:
        return base
    variant_attr, variant_value = variant_detect.detect_variant_for_node(node, slug)
    return Recognition(
        kind="named",
        slug=slug,
        container_kind=recognise_helpers.get_container_kind(slug),
        has_inner_blocks=derive_has_inner_blocks(slug),
        variant_attr=variant_attr,
        variant_value=variant_value,
    )
