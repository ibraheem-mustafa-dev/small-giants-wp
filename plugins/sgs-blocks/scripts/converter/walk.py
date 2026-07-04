"""walk.py — the single walker entry + TOTAL structural-signature registry.

Spec 31 §13.3 FR-31-2.7 (container-vs-composite classifier) + FR-31-2.8 (the
registry + destination contract). EXECUTION Step 5 (D274).

WHAT THIS IS
    ONE walker entry point (``walk_content``) that computes the dispatch key
    ONCE per node (FR-31-2.8.1) and dispatches the node's content extraction
    through a TOTAL registry keyed by STRUCTURAL signature — never a block
    slug (FR-31-2.8.2; a slug-keyed entry is an R-31-9 carve-out, gated by
    ``gates/no_slug_literal.py`` which scans this file).

    Emission is ADDITIVE (FR-31-2.8.3): EVERY matching handler fires, in
    explicit priority order (CSS-cascade style, never elif source-order) and
    their results compose. This is what preserves today's composed mechanism
    arms — Case-1 = scalar + styling + array; Case-2 = child-blocks + array
    (the D248 guard) — a one-handler-per-node registry would re-introduce the
    hero.badges silent drop.

    This Step-5 registry expresses the PRE-emit_shape dispatch semantics
    (``has_inner`` + capability flags) EXACTLY — a behaviour-identical
    re-expression of the retired ``extract_content`` if-chain. EXECUTION
    Step 6 swaps the ``has_inner`` signature axis for the per-attr
    ``block_attributes.emit_shape`` walk (FR-31-2.6) inside this same
    registry; the signature dataclass carries the axis explicitly so that
    swap is a data change, not a re-architecture.

RECURSION OWNERSHIP (FR-31-2.8.1)
    Every node — section root, child, grandchild — re-enters through this ONE
    entry (children route via ``build_block_markup`` → ``extract_content`` →
    ``walk_content``); there is no second content dispatch. The Step-6
    emit_shape walk adds the unconditional descent for nested-attr children
    (a node cloned into an attribute still has its children walked).

PRE-REGISTRY GATES (loud, never signatures — FR-31-2.8.1)
    * ``unrecognised`` / corrupt recognition (MF5 ``has_inner is None``) is
      routed BEFORE the registry — a loud ContentGap, never a dispatch key.
    * The D212 mutual-exclusion (``has_inner==1`` + scalar-content-lift) is a
      VALIDITY CONSTRAINT: it raises (never a registry entry), and the
      coverage test excludes it from the producible-signature space.

Handlers late-bind into ``services.extraction`` through the module attribute
(the same mechanism as ``assembly.py``) so existing monkeypatch-based tests
keep intercepting the mechanisms.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from orchestrator.converter_v2 import db_lookup

from converter.context import Recognition


# ---------------------------------------------------------------------------
# FR-31-2.7 — the container-vs-composite classifier (recognition-stage key
# computation, NOT a walker conditional — R-31-3's three-exception contract
# holds; this runs when the dispatch key is computed).
# ---------------------------------------------------------------------------

def classify_node(rec: Recognition) -> str:
    """'holder' | 'composite' — a COMPOSED signal of DB facts, never a literal.

    An ARBITRARY HOLDER recurses its children independently (FR-31-4 container
    default); a TYPED COMPOSITE enters the per-attr content walk. The ONLY
    true arbitrary holder is the DB's container-default block (reached
    name-free via ``container_default_slug()`` — ``card-grid``/``gallery``/
    ``post-grid`` are TYPED composites, D272 premise correction). ``blocks.
    tier`` + ``block_composition`` membership already shaped the Recognition
    upstream (``recognise``/``recognise_section``), so the composed signal
    here is the recognised slug against the DB default (R-31-1; STOP-38/41 —
    no slug/slot/role literal).
    """
    if rec.slug is not None and rec.slug == db_lookup.container_default_slug():
        return "holder"
    return "composite"


# ---------------------------------------------------------------------------
# The structural signature — the ONE dispatch key (FR-31-2.8.2)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class NodeSignature:
    """Structural DB facts ONLY — never a block slug (FR-31-2.8.2).

    ``has_inner`` is the Step-5 (pre-FR-31-2.6) child-shape axis; EXECUTION
    Step 6 replaces it with the per-attr ``emit_shape`` walk. ``kind`` is the
    Recognition kind (named | atomic | scalar — ``unrecognised`` is a
    PRE-registry gate, never a signature).
    """
    kind: str
    classify: str        # holder | composite (FR-31-2.7)
    has_inner: int       # 0 | 1 — Step-6 swaps this axis for per-attr emit_shape
    scalar_lift: bool    # scalar-content-lift capability (DB)
    array_lift: bool     # array-content-lift capability (DB)
    content_leaf: bool   # primary_content_attr present OR an icon-source role attr


def signature_for(rec: Recognition) -> NodeSignature:
    """Compute the dispatch key ONCE per node (FR-31-2.8.1), from DB facts.

    Caller guarantees rec is recognised (kind != 'unrecognised') and
    ``has_inner_blocks`` is not None (the MF5 pre-registry gate runs first).
    """
    caps = db_lookup.capabilities_for(rec.slug)
    attrs = db_lookup.block_attrs(rec.slug)
    icon_bearing = any(
        isinstance(i, dict)
        and isinstance(i.get("role"), str)
        and i["role"].startswith("icon-")
        for i in attrs.values()
    )
    content_leaf = (
        db_lookup.primary_content_attr(rec.slug) is not None or icon_bearing
    )
    # Capability TAGS queried against the DB capability set — NOT block/slot
    # names (the no_slug_literal gate tracks slug/variant/slot idents).
    return NodeSignature(
        kind=rec.kind,
        classify=classify_node(rec),
        has_inner=int(rec.has_inner_blocks or 0),
        scalar_lift="scalar-content-lift" in caps,
        array_lift="array-content-lift" in caps,
        content_leaf=content_leaf,
    )


# ---------------------------------------------------------------------------
# Handlers — late-bound wrappers over the existing mechanism functions.
# Uniform call shape (rec, node, media_map, css_rules) -> list.
# ---------------------------------------------------------------------------

def _ext():
    """Late-bound extraction module (monkeypatch-transparent, same idiom as
    assembly.py — tests patching extraction.run_mechanism_* keep working)."""
    from converter.services import extraction as ext
    return ext


def _run_container_default(rec, node, media_map, css_rules) -> list:
    return _ext().run_container_default(rec, node, css_rules=css_rules, media_map=media_map)


def _run_child_blocks(rec, node, media_map, css_rules) -> list:
    return _ext().run_mechanism_b(rec, node, css_rules=css_rules, media_map=media_map)


def _run_scalar_content(rec, node, media_map, css_rules) -> list:
    ext = _ext()
    return ext.run_mechanism_a(rec, node, media_map) + ext.expected_content_gaps(rec.slug)


def _run_styling_content(rec, node, media_map, css_rules) -> list:
    return _ext().run_mechanism_styling(rec, node, css_rules)


def _run_array_content(rec, node, media_map, css_rules) -> list:
    return _ext().run_mechanism_array(rec, node, media_map)


def _run_named_leaf(rec, node, media_map, css_rules) -> list:
    return _ext().run_mechanism_leaf(rec, node, media_map)


def _run_content_gap_floor(rec, node, media_map, css_rules) -> list:
    from converter.context import ContentGap
    return [
        ContentGap(
            rec.slug,
            "block has no content-extraction capability"
            " (not scalar-content-lift, not array-content-lift, not InnerBlocks)"
            " — DB-capability gap; flag to developer",
        )
    ]


@dataclass(frozen=True)
class Handler:
    """One registry entry: an explicit priority + a signature predicate + the
    mechanism it runs. ADDITIVE — every matching handler fires (FR-31-2.8.3)."""
    name: str
    priority: int
    matches: Callable[[NodeSignature], bool]
    run: Callable[..., list]


# The TOTAL registry. Predicates key on STRUCTURAL signature fields only —
# a slug-keyed entry here is an R-31-9 carve-out the no_slug_literal gate
# (scanning this file) rejects. Priorities are EXPLICIT (CSS-cascade style):
# results concatenate in priority order, reproducing the retired if-chain's
# result order exactly (Case-1: scalar+gaps, styling, array; Case-2: child
# blocks, array).
CONTENT_HANDLERS: list[Handler] = [
    # FR-31-2.7: the arbitrary holder recurse-descends its children (FR-31-4).
    Handler("container_default", 10,
            lambda s: s.classify == "holder",
            _run_container_default),
    # Child-InnerBlocks composite (Mechanism B). The holder is excluded — its
    # descent is the container_default handler (today's early-return in
    # run_mechanism_b, expressed as a predicate).
    Handler("child_blocks", 20,
            lambda s: s.classify == "composite" and s.has_inner == 1,
            _run_child_blocks),
    # Scalar CONTENT lift (Mechanism A + the expected-gaps arm, §3.B1).
    Handler("scalar_content", 30,
            lambda s: s.has_inner == 0 and s.scalar_lift,
            _run_scalar_content),
    # CSS-on-content styling lift (§3.B2) — composes with scalar_content.
    Handler("styling_content", 31,
            lambda s: s.has_inner == 0 and s.scalar_lift,
            _run_styling_content),
    # Array/repeater lift (§3.B4) — composes with EITHER shape (D248: Case-1
    # scalar+array AND Case-2 child-blocks+array both hold).
    Handler("array_content", 40,
            lambda s: s.array_lift,
            _run_array_content),
    # Named-leaf own-element lift (§3.B.0 — button/icon/media leaves).
    Handler("named_leaf", 50,
            lambda s: (s.has_inner == 0 and not s.scalar_lift
                       and not s.array_lift and s.content_leaf),
            _run_named_leaf),
    # The loud capability-gap floor (the retired Case-4) — an EXPLICIT entry,
    # so registry totality is provable (the coverage test enumerates it).
    Handler("content_gap_floor", 90,
            lambda s: (s.has_inner == 0 and not s.scalar_lift
                       and not s.array_lift and not s.content_leaf),
            _run_content_gap_floor),
]


def handlers_for(sig: NodeSignature) -> list[Handler]:
    """Every matching handler, in explicit priority order (ADDITIVE)."""
    return sorted(
        (h for h in CONTENT_HANDLERS if h.matches(sig)),
        key=lambda h: h.priority,
    )


# ---------------------------------------------------------------------------
# The walker entry
# ---------------------------------------------------------------------------

def walk_content(
    rec: Recognition,
    node: Any,
    media_map: dict | None = None,
    css_rules: dict | None = None,
) -> list:
    """The ONE content-dispatch entry (FR-31-2.8.1).

    Pre-registry gates (loud, never signatures) → compute the signature ONCE
    → ADDITIVE handler emission in priority order. Behaviour-identical to the
    retired extract_content if-chain (proven by the untouched full suite).
    """
    from converter.context import ContentConservationError, ContentGap

    # MF5 pre-registry gate: has_inner_blocks is None ONLY for an
    # unrecognised/corrupt Recognition — loud ContentGap, never a dispatch.
    if rec.has_inner_blocks is None:
        return [ContentGap(
            rec.slug or "<unrecognised>",
            "extract_content reached with has_inner_blocks=None — recognition is"
            " unrecognised/corrupt; route via unrecognised_gap upstream",
        )]

    # D212 VALIDITY CONSTRAINT (raise, never a registry entry / bare assert —
    # STOP-27): a scalar-content-lift block must NEVER carry child InnerBlocks
    # dispatch — the child emission would be ignored by the typed render.
    caps = db_lookup.capabilities_for(rec.slug)
    if rec.has_inner_blocks == 1 and "scalar-content-lift" in caps:
        raise ContentConservationError(
            "scalar-content-lift block routed to Mechanism B — D212 regression guard"
        )

    sig = signature_for(rec)
    matched = handlers_for(sig)
    if not matched:
        # Registry totality bug — the coverage test proves this unreachable;
        # if it ever fires, fail LOUD (Rule 4), never an empty return.
        raise ContentConservationError(
            f"no CONTENT_HANDLERS entry matched signature {sig} — the registry "
            f"lost totality (coverage test should have caught this)"
        )

    results: list = []
    for h in matched:
        results.extend(h.run(rec, node, media_map, css_rules))
    return results
