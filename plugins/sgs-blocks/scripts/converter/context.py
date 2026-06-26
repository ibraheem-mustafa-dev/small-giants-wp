"""context.py — typed per-element context + declaration for the modular converter.

Design ref: `.claude/plans/2026-06-23-modular-scaffold-design.md` §3.1.

These are the two seam types every resolver and service speaks. Frozen as a typed
contract (spec-lawyer MF-D/MF-E — no prose-only interfaces).
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any, Literal

# Device-tier vocabulary. MUST match F2 (ledger.declare_input) / F3 (oracle) EXACTLY:
#   Base | Mobile | Tablet | Desktop | Other:<verbatim-condition>
# A non-device-tier breakpoint (e.g. a rule at @media 600px) carries an
# "Other:<cond>" tier. Per design §10 A4 such a value must be routed to
# UNACCOUNTED / gap(origin=NO_DESTINATION) at the tier-resolution seam
# (services/tier_suffix) — NEVER coerced into a device tier.
DEVICE_TIERS = frozenset({"Base", "Mobile", "Tablet", "Desktop"})


@dataclass(frozen=True)
class Decl:
    """One draft CSS declaration resolved for an element at a tier."""
    property: str
    value: str
    tier: str  # Base|Mobile|Tablet|Desktop|Other:<cond> — see DEVICE_TIERS + A4

    @property
    def is_device_tier(self) -> bool:
        return self.tier in DEVICE_TIERS


@dataclass
class Ctx:
    """Per-element context, built once per node by the orchestrator.

    `base_layer` is cached by services.layer_detect on the BASE (non-@media)
    declaration set + structural position, then reused for every tier's
    declarations (tier-invariance, design §2.1 — slice-scoped/provisional per A15).
    """
    block_slug: str
    container_kind: str          # section | layout | content (block_composition.container_kind)
    has_inner_blocks: int        # 0 = scalar leaf; 1 = composes child InnerBlocks
    variant_value: str | None
    variant_attr: str | None
    node: Any                    # the parsed draft node (shape TBD per stage)
    is_root: bool
    base_layer: str | None       # cached by layer_detect (§2.1)
    conn: sqlite3.Connection


@dataclass(frozen=True)
class Recognition:
    """The Stage-2 recognition result for one draft node (design 2026-06-23-stage2 §1).

    Produced by `converter.recognition.recognise(node, css_rules)` and consumed by
    the Recognition->Ctx adapter. `kind` is a CLOSED Literal: exhaustiveness is a
    static mypy guarantee (a new kind is a compile error at the definition); the
    emit dispatcher routes `unrecognised` BEFORE its match and ends the match on the
    three emit-able kinds with `assert_never` guarding only Any-typed corruption.

    `slug` / `container_kind` / `has_inner_blocks` are None ONLY when
    kind == "unrecognised" (a BEM node that resolved to no registered block -> a loud
    RED GapOrigin.UNRECOGNISED, never a silent empty sgs/container emit).

    `variant_*` are filled by the SEPARATE variant step (services.variant_detect, §2),
    not by recognise() itself (variant needs the discriminating-slot extract).
    """
    kind: Literal["named", "atomic", "scalar", "unrecognised"]
    slug: str | None
    container_kind: str | None
    has_inner_blocks: int | None
    variant_attr: str | None = None
    variant_value: str | None = None


# NOTE: AttrInfo lives in orchestrator.converter_v2.db_lookup (it is what
# content_attrs_with_selector returns); extraction imports it from there to
# avoid a duplicate type + a reverse converter->frozen-tree import.


@dataclass(frozen=True)
class ScalarLift:
    """A content child lifted into a parent typed scalar attribute.

    `value` is a str for text-content roles and a dict for image-object roles
    (object-typed attrs expect {"url": ..., "id": 0, "alt": ...}).
    """
    attr: str
    value: str | dict


@dataclass(frozen=True)
class ChildBlock:
    """A content child emitted as a child InnerBlock."""
    slug: str
    content: str


@dataclass(frozen=True)
class ContentGap:
    """A content unit that did NOT transfer — tracked, never silent."""
    where: str    # a human label — a BEM class or attr_name
    detail: str


class ContentConservationError(AssertionError):
    """Raised when a content-stream conservation invariant is violated.

    Per-mechanism: Mechanism A `attrs_attempted == lifts + content_gaps`;
    Mechanism B `content_leaves_seen == child_blocks + content_gaps`.
    """
