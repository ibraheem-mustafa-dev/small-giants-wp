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


@dataclass(frozen=True, eq=False)
class Destination:
    """FR-31-2.8.4 — the destination-parametric dispatch target.

    ``eq=False`` deliberately: ``attrs`` is intentionally-mutated shared state
    (the owner's live assembling dict) despite ``frozen=True`` — the freeze
    protects the two FIELD BINDINGS, not the dict's contents. Identity
    eq/hash avoids the auto-generated ``__hash__`` over an unhashable dict
    (a silent TypeError footgun at any future set/cache use).

    Carries WHERE an element's routed Writes land when they belong to a block
    other than the element itself (the fold case: a pass-through band or a
    grid item whose declarations write onto the OWNING container's attrs).

    ``block_slug`` names the OWNING block whose registered attrs the resolvers
    resolve against. It MUST equal the Ctx's ``block_slug`` — the Ctx for a
    folded node is built WITH the owner's slug (so every resolver's DB lookup
    already targets the owner); the orchestrator raises on a mismatch
    (fail-loud, never a silent wrong-block write).

    ``attrs`` is the live attr-dict being assembled for the owner. Merge
    semantics (recorded, Step-3 decision): ``setdefault`` — earlier paths win,
    matching the frozen fold contract (convert.py:2888 "earlier paths win" /
    the gridItem* setdefault) and route_interior_css_to_parent_slot's
    behaviour. The self path (destination=None) keeps the caller-side
    ``dict.update`` exactly as before — behaviour-identical.
    """
    block_slug: str
    attrs: dict


@dataclass
class Ctx:
    """Per-element context, built once per node by the orchestrator.

    `base_layer` is cached by services.layer_detect on the BASE (non-@media)
    declaration set + structural position, then reused for every tier's
    declarations (tier-invariance, design §2.1 — slice-scoped/provisional per A15).
    """
    block_slug: str
    container_kind: str          # section | layout | content (block_composition.container_kind)
    delegates_content: int        # 0 = scalar leaf; 1 = composes child InnerBlocks (FR-31-2.6:
                                   # derived fresh from source markers, NOT block_composition.has_inner_blocks)
    variant_value: str | None
    variant_attr: str | None
    node: Any                    # the parsed draft node (shape TBD per stage)
    is_root: bool
    base_layer: str | None       # cached by layer_detect (§2.1)
    conn: sqlite3.Connection
    # The named grid-area this element occupies in its PARENT's grid-template-areas
    # (Spec 31 §3.A L4 — D207 grid-per-area dissolve). Set by the Ctx-builder when
    # the element's BEM token ∈ the parent grid's area names (reuse
    # fold_helpers.grid_item_areas); read by the grid_area resolver to route the
    # element's box CSS onto the owning block's <areaName>+<suffix> attrs. None for
    # a non-grid-area element. Has a default so existing positional Ctx(...) callers
    # (tests, slice) are unaffected.
    area_name: str | None = None
    # FR-31-2.8.4 destination-parametric dispatch: where this element's routed
    # Writes land. None (the default — every existing caller/test unaffected)
    # = SELF: the caller merges ElementResult.attrs() into the element's own
    # dict exactly as before. Non-None = the fold case: the orchestrator
    # setdefault-writes each Write into destination.attrs (the OWNING block's
    # assembling dict; earlier paths win, the frozen convert.py:2888 contract).
    # destination.block_slug MUST equal this Ctx's block_slug (the Ctx for a
    # folded node is built with the owner's slug so resolver DB lookups target
    # the owner) — process_element raises on mismatch.
    destination: Destination | None = None


@dataclass(frozen=True)
class Recognition:
    """The Stage-2 recognition result for one draft node (design 2026-06-23-stage2 §1).

    Produced by `converter.recognition.recognise(node, css_rules)` and consumed by
    the Recognition->Ctx adapter. `kind` is a CLOSED Literal: exhaustiveness is a
    static mypy guarantee (a new kind is a compile error at the definition); the
    emit dispatcher routes `unrecognised` BEFORE its match and ends the match on the
    three emit-able kinds with `assert_never` guarding only Any-typed corruption.

    `slug` / `container_kind` / `delegates_content` are None ONLY when
    kind == "unrecognised" (a BEM node that resolved to no registered block -> a loud
    RED GapOrigin.UNRECOGNISED, never a silent empty sgs/container emit).

    `variant_*` are filled by the SEPARATE variant step (services.variant_detect, §2),
    not by recognise() itself (variant needs the discriminating-slot extract).
    """
    kind: Literal["named", "atomic", "scalar", "unrecognised"]
    slug: str | None
    container_kind: str | None
    delegates_content: int | None
    variant_attr: str | None = None
    variant_value: str | None = None


# NOTE: AttrInfo lives in converter.db.db_lookup (it is what
# content_attrs_with_selector returns); extraction imports it from there to
# avoid a duplicate type. (Moved from orchestrator.converter_v2.db_lookup in
# EXECUTION Step 9, Phase 3, 2026-07-04.)


@dataclass(frozen=True)
class ScalarLift:
    """A content child lifted into a parent typed scalar attribute.

    `value` is a str for text-content roles, a dict for image-object roles
    (object-typed attrs expect {"url": ..., "id": 0, "alt": ...}), or a list
    for array-content roles (array attrs expect [{field_key: value, ...}, ...]).
    """
    attr: str
    value: str | dict | list


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
