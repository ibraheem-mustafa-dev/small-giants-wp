"""extraction.py — Stage 3 content extraction: ScalarLifts / ChildBlocks / ContentGaps.

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1/§2/§6.

Given a Recognition + a parsed bs4 section node, extract the composite's content
as a list of ScalarLift / ChildBlock / ContentGap items.  Conservation is enforced
per-mechanism as a hard ContentConservationError (never a silent drop).

No block or slot string literals anywhere (scanned by gates/no_slug_literal).
"""
from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# Content-noun / styling-suffix regexes for expected_content_gaps (FIX 3).
# Used ONLY as a GAP-only completeness heuristic — never affects block/slot
# routing (no name list, no per-block carve-out, per R-22-1 "no hardcoded dicts").
# ---------------------------------------------------------------------------

_CONTENT_NAME_RE = re.compile(
    r"(media|image|img|logo|photo|avatar|video|thumb|icon|text|title|heading|headline"
    r"|quote|caption|name|role|org|company|author|summary|phrase|source|body"
    r"|description|excerpt|label|date|link|url)",
    re.I,
)
_STYLING_RE = re.compile(
    r"(colour|color|fontsize|fontweight|fontstyle|lineheight|width|height|unit"
    r"|align|gap|padding|margin|radius|shadow|opacity|duration|easing|scale"
    r"|style$|weight$)",
    re.I,
)

from converter.context import (
    ChildBlock,
    ContentConservationError,
    ContentGap,
    Recognition,
    ScalarLift,
)
from converter.services.content_select import (
    content_children,
    has_bem_element_descendant,
    select_one,
)
from converter.services.payload import extract_payload
from converter.services.recognise_helpers import bem_element_to_canonical_slot
from converter.resolvers.scalar_content import lift_scalar_content
from orchestrator.converter_v2 import db_lookup

# Emit-glue imports (stage 3 §1 walk/emit — design §1).
# Imported here so that build_block_markup lives in the same service module.
from converter.recognition import variant_attrs
from converter.orchestrator import emit_block_markup


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _label(child: Any) -> str:
    """Return a short human label for a content-child node.

    Uses the first sgs- CSS class found on the node, else falls back to the
    node's HTML tag name.  Never references a block slug or slot literal.
    """
    classes = child.get("class", []) if hasattr(child, "get") else []
    for cls in (classes or []):
        if isinstance(cls, str) and cls.startswith("sgs-"):
            return cls
    return getattr(child, "name", "unknown") or "unknown"


# ---------------------------------------------------------------------------
# Mechanism A — scalar-content-lift via derived_selector
# ---------------------------------------------------------------------------


def run_mechanism_a(rec: Recognition, section_root: Any, media_map: dict | None = None) -> list:
    """Mechanism A: scalar content lift — the MODULARISED working function (D246, W2).

    Spec 31 §1/§3.B1: this is the modularised `_lift_scalar_attrs_by_selector`
    (now `converter.resolvers.scalar_content.lift_scalar_content`), the proven
    working content-lift — NOT a from-scratch reimplementation (the D245 from-scratch
    `content_attrs_with_selector`/`extract_payload`/object-shaping path is superseded).

    `lift_scalar_content` returns a plain attr dict; an attr whose selector matches
    nothing emits NO key — Spec 31 §3.B1 mandates this strict no-op (it is the
    faithful behaviour of `_lift_scalar_attrs_by_selector`). Wrapped here as
    ScalarLifts so build_block_markup's assembly is unchanged.

    ``media_map`` is threaded through to ``lift_scalar_content`` so the image-object
    branch resolves a mockup src to its uploaded WP URL per §3.B1
    (`{url: resolve_media_url(src), ...}`). It defaults to ``{}`` — the new engine
    has no media-map LOADER/driver yet (this entry has no production caller; it is
    driven via the STOP-21 LANDED recipe), so until the engine is wired into the
    pipeline the map is empty and image srcs stay un-remapped. That is a tracked
    dependency, NOT a silent claim of completeness.

    CONTENT COMPLETENESS NOTE (council A2, 2026-06-28): scalar content drops
    (selector matched nothing / empty text / no <img>) are NOT yet caught by any
    gate — Spec 31 §12.2.1's conservation ledger (`declare_input`) currently
    captures only the CSS `(selector, property, value)` stream, not content routing
    units. `expected_content_gaps` (below) covers only attrs with NO role/selector.
    Closing this hole is a ledger/instrument change (extend `declare_input` to
    capture CONTENT routing units per Spec 31 §3 line 101) — design-gated, NOT a
    patch here (a per-attr ContentGap inside the lift would breach §3.B1's strict
    no-op). Tracked in next-session-prompt Register A / A2.
    """
    lifted = lift_scalar_content(section_root, rec.slug, media_map=media_map or {})
    return [ScalarLift(attr=name, value=value) for name, value in lifted.items()]


# ---------------------------------------------------------------------------
# Mechanism B — child-block via slot-keyed predicate
# ---------------------------------------------------------------------------


def run_mechanism_b(rec: Recognition, section_root: Any) -> list:
    """Mechanism B: walk content-leaf BEM children and emit child InnerBlocks.

    Each content-leaf child resolves to exactly one of:
      - ChildBlock   — slot is content-bearing, has a standalone_block, and
                       the child is itself a leaf (not a wrapper over deeper BEM)
      - ContentGap   — slot unmapped / not content-bearing / no standalone_block /
                       child is a wrapper shell / BEM element missing

    Conservation: content_leaves_seen == child_blocks + content_gaps (hard assertion).
    """
    results: list = []
    leaves = 0

    for child in content_children(section_root):
        leaves += 1
        slot = bem_element_to_canonical_slot(child)
        if slot is None:
            results.append(
                ContentGap(_label(child), "BEM element has no DB slot mapping (data gap)")
            )
            continue
        if not db_lookup.slot_has_equivalent_block(rec.slug, slot):
            results.append(
                ContentGap(_label(child), "slot is not a content-bearing child slot")
            )
            continue
        child_slug = db_lookup.standalone_block_for(slot)
        if child_slug is None:
            results.append(
                ContentGap(
                    _label(child),
                    "slot content-bearing but no standalone_block (DB data limit)",
                )
            )
            continue
        if has_bem_element_descendant(child):
            # chrome/wrapper filter — a wrapper is not a content leaf
            results.append(
                ContentGap(_label(child), "child slot maps to a wrapper, not body content")
            )
            continue
        role = db_lookup.content_role_for_slot(rec.slug, slot)
        if role is None:
            results.append(
                ContentGap(_label(child), "slot has no content-bearing role in the DB")
            )
            continue
        results.append(ChildBlock(slug=child_slug, content=extract_payload(child, role)))

    # Per-mechanism conservation invariant (Mechanism B iterates NODES).
    blocks = sum(1 for r in results if isinstance(r, ChildBlock))
    gaps = sum(1 for r in results if isinstance(r, ContentGap))
    if leaves != blocks + gaps:
        raise ContentConservationError(
            f"Mechanism B: {leaves} leaves != {blocks} blocks + {gaps} gaps"
        )
    return results


# ---------------------------------------------------------------------------
# Expected-content coverage — silent-drop guard (design §6)
# ---------------------------------------------------------------------------


def expected_content_gaps(slug: str) -> list:
    """Return ContentGaps for content-bearing attrs with no role/derived_selector.

    Flags two classes of attr whose role AND derived_selector are both absent
    (falsy) — these are never attempted by Mechanism A, so without this pass
    they would be invisible drops:

    1. attr_type == 'object'  — always flagged (structured content; no name test).
    2. attr_type == 'string'  — flagged when the attr NAME matches _CONTENT_NAME_RE
                                AND does NOT match _STYLING_RE.  This is a
                                GAP-ONLY completeness heuristic (never affects
                                routing), acceptable per R-22-1 (no block/slot
                                literals; keyed on a naming pattern, not a name
                                list or per-block carve-out).

    Universal: no name list, no per-block carve-out.
    """
    gaps: list = []
    attrs = db_lookup.block_attrs(slug)
    for attr_name, info in attrs.items():
        role = info.get("role")
        derived_selector = info.get("derived_selector")
        if role or derived_selector:
            # Mechanism A will handle it — not a silent drop.
            continue
        attr_type = info.get("attr_type")
        if attr_type == "object":
            gaps.append(
                ContentGap(
                    attr_name,
                    "structured-content attr has no role/derived_selector"
                    " — DB-data gap; flag to developer",
                )
            )
        elif attr_type == "string" and _CONTENT_NAME_RE.search(attr_name) and not _STYLING_RE.search(attr_name):
            gaps.append(
                ContentGap(
                    attr_name,
                    "content-semantic string attr has no role/derived_selector"
                    " — DB-data gap; flag to developer",
                )
            )
    return gaps


# ---------------------------------------------------------------------------
# 3-case dispatch — the public entry point
# ---------------------------------------------------------------------------


def extract_content(rec: Recognition, section_root: Any, media_map: dict | None = None) -> list:
    """Dispatch content extraction for a recognised composite.

    Three exhaustive cases (design §1, capability mutual exclusion):

    1. has_inner_blocks == 0 AND scalar-content-lift capability present
       → Mechanism A (selector-driven scalar lifts) + expected_content_gaps.

    2. has_inner_blocks == 1
       → Mechanism B (slot-keyed child-block walk).
       Asserts the block does NOT also carry scalar-content-lift (D212 regression guard).

    3. has_inner_blocks == 0 AND scalar-content-lift NOT present
       → loud ContentGap — DB capability gap; never a silent empty.
    """
    caps = db_lookup.capabilities_for(rec.slug)

    # "scalar-content-lift" is a CAPABILITY TAG queried against the DB capability
    # set — NOT a block or slot name.  It is the permitted exception in this file
    # (the no_slug_literal gate tracks block_slug/variant/slot idents, not
    # capability strings).
    SCALAR_LIFT = "scalar-content-lift"

    if rec.has_inner_blocks == 0 and SCALAR_LIFT in caps:
        return run_mechanism_a(rec, section_root, media_map) + expected_content_gaps(rec.slug)

    if rec.has_inner_blocks == 1:
        # Capability mutual exclusion: a scalar-content-lift block must NEVER enter
        # Mechanism B — guards against the D212 empty-block regression where the
        # quote attr would be emitted as a child InnerBlock the typed render ignores.
        # raise, NOT assert: a bare `assert` is stripped under `python -O`, which would
        # silently disable this regression guard (a Rule-4 silent-drop hole). D247.
        if SCALAR_LIFT in caps:
            raise ContentConservationError(
                "scalar-content-lift block routed to Mechanism B — D212 regression guard"
            )
        return run_mechanism_b(rec, section_root)

    # Third case: has_inner_blocks == 0 AND not scalar-content-lift.
    # Loud, never silent — a DB-capability gap to surface and track.
    return [
        ContentGap(
            rec.slug,
            "block has no content-extraction capability"
            " (not scalar-content-lift, not InnerBlocks)"
            " — DB-capability gap; flag to developer",
        )
    ]


# ---------------------------------------------------------------------------
# Emit glue — Stage 3 §1 walk/emit (design §1)
# ---------------------------------------------------------------------------


def build_block_markup(rec: Recognition, section_root: Any, media_map: dict | None = None) -> str:
    """Assemble native WP block markup from extraction results.

    Combines variant attrs (e.g. {'variant': 'split'}) with every ScalarLift
    into the parent block's attr dict, then wraps any ChildBlocks as inner
    block markup.  ContentGaps contribute nothing to the emit — they are the
    tracked-not-transferred record.

    Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1.
    No block or slot string literals (scanned by gates/no_slug_literal).
    """
    results = extract_content(rec, section_root, media_map)
    attrs: dict = dict(variant_attrs(rec))  # variant attrs first (e.g. {'variant': 'split'})
    for r in results:
        if isinstance(r, ScalarLift):
            attrs[r.attr] = r.value
    def _child_markup(cb: ChildBlock) -> str:
        attr = db_lookup.primary_content_attr(cb.slug)
        if attr:
            return emit_block_markup(cb.slug, {attr: cb.content}, "")
        return emit_block_markup(cb.slug, {}, cb.content)  # fallback for ambiguous/none

    inner = "".join(_child_markup(r) for r in results if isinstance(r, ChildBlock))
    return emit_block_markup(rec.slug, attrs, inner)
