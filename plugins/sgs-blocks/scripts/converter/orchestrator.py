"""orchestrator.py — dispatch + conservation spine (design §3 / §4).

Matches the `walk` / `convert_page` seam (drop-in target, NOT swapped live yet,
D-MODULAR). For the vertical slice it exposes:

  process_element(ctx, decls) -> ElementResult
      route each declaration through dispatch_table → REGISTRY → resolver, collect
      Write/GAP, and enforce the per-declaration-result oracle invariants:
        • TOTALITY     — every declaration produced AT LEAST ONE routed result (a
                         Write, a non-empty list[Write], or a GAP); none leaked into
                         the void (a resolver returning None or []). The old
                         ``len(writes)+len(gaps)==decl_count`` DISJOINTNESS guarantee
                         is RETIRED: a single declaration may faithfully produce a
                         list[Write] of >1 attribute (font-size → fontSize+fontSizeUnit;
                         grid-template-columns → gridTemplateColumns+columns), so write
                         count no longer equals declaration count.
        • COLLISION    — within ONE declaration's list[Write], two writes to the SAME
                         attr would silently lose one; a duplicate non-synthetic attr
                         name is a HARD failure.
        • NO-UNROUTED  — a GAP(origin=UNROUTED) is a HARD failure (design §2/§3.2)

The full draft walk (parse → per-node Ctx/Decl) is step-3 work; the slice constructs
Ctx/Decls for a known element and proves the spine on one OUTER property end-to-end.

LANDED is the headline signal, NOT conservation (§10 A1): conservation goes 100%
green while transferring almost nothing (every non-max-width decl → a stub GAP). Only
the WRITE count for `maxWidth`, confirmed by the F3 oracle, measures faithfulness.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from converter.dispatch_table import resolver_id
from converter.models import GAP, GapOrigin, Write
from converter.resolvers import REGISTRY, outer_box
from converter.services.layer_detect import layer_detect


class ConservationError(AssertionError):
    """Raised when the step-2 oracle invariants are violated (fail-closed)."""


@dataclass
class ElementResult:
    block_slug: str
    writes: list[Write] = field(default_factory=list)
    gaps: list[GAP] = field(default_factory=list)
    decl_count: int = 0
    # Per-declaration result COUNT (each decl produced ≥1 routed result of any
    # arity: a Write, a list[Write], or a GAP). The 2026-06-29 seam decision
    # (Option A, Spec 31 §3.A/§12.4) widened the conservation invariant from
    # per-write TOTALITY to per-DECLARATION-RESULT totality, because a single
    # declaration can faithfully produce MULTIPLE attribute writes (font-size →
    # fontSize + fontSizeUnit; grid-template-columns → gridTemplateColumns +
    # columns) — convert.py's lifters setdefault multiple attrs per element.
    decl_results: int = 0

    def attrs(self) -> dict[str, int | float | str]:
        """The native block attribute dict the Writes produce (for emit)."""
        return {w.attr: w.value for w in self.writes}

    def unrouted(self) -> list[GAP]:
        return [g for g in self.gaps if g.origin is GapOrigin.UNROUTED]


def _check_conservation(result: ElementResult) -> None:
    """Per-declaration-result TOTALITY + COLLISION + NO-UNROUTED.

    TOTALITY is no longer ``len(writes)+len(gaps) == decl_count`` — a declaration
    may legitimately produce a list[Write] of >1 attribute (Spec 31 §3.A.3 grid
    template+count; §3.A.5/§3.B2 value+unit companion). Instead the invariant is:
    EVERY input declaration produced AT LEAST ONE routed result (a Write, a
    non-empty list[Write], or a GAP) — none leaked into the void (returned None or
    an empty list). This still hard-fails a genuine leak: a resolver that returns
    None or [] for a declaration drops ``decl_results`` below ``decl_count`` and
    trips here.

    COLLISION: because a declaration can return MULTIPLE writes, two writes to the
    SAME attr would silently lose one (dict last-wins in ``attrs()``). A duplicate
    attr name across the element's writes is therefore a HARD failure — raised, never
    asserted (STOP-27). Synthetic writes (the align_finalise post-pass) are appended
    AFTER this check, so the writes seen here are all real per-declaration writes.

    GapOrigin.UNROUTED remains an independent hard failure.
    """
    # TOTALITY: every input declaration produced ≥1 routed result (no leak).
    if result.decl_results != result.decl_count:
        raise ConservationError(
            f"TOTALITY: {result.decl_count} declarations produced "
            f"{result.decl_results} routed results — a declaration leaked "
            f"(a resolver returned None or an empty list for some decl). "
            f"Every declaration must produce ≥1 Write or a GAP."
        )
    # COLLISION: no two writes may target the same attr (silent last-wins data loss).
    seen: set[str] = set()
    dupes: list[str] = []
    for w in result.writes:
        if w.attr in seen:
            dupes.append(w.attr)
        seen.add(w.attr)
    if dupes:
        raise ConservationError(
            f"COLLISION: duplicate attr write(s) {sorted(set(dupes))} for "
            f"{result.block_slug} — two declarations/results target the same "
            f"attribute, one would be silently lost (dict last-wins)."
        )
    # NO-UNROUTED: a suspected routing bug must fail loud, never be absorbed.
    bad = result.unrouted()
    if bad:
        raise ConservationError(
            "UNROUTED: "
            + "; ".join(f"{g.property}@{g.tier}" for g in bad)
            + " — a known-writer_path property found no resolver (design §2/§3.2)."
        )


def process_element(ctx: Any, decls: list[Any]) -> ElementResult:
    """Dispatch every declaration of one element; enforce the seam invariants.

    A resolver returns ``Write | list[Write] | GAP`` (seam decision Option A). A
    list[Write] contributes ONE decl-result (the declaration was routed, faithfully
    producing multiple attrs); a Write or GAP contributes ONE decl-result. A None
    or empty-list return is a LEAK — it does not increment ``decl_results``, so
    ``_check_conservation`` fails closed.
    """
    # Cache the layer ONCE on the base declaration set (tier-invariance §2.1).
    if ctx.base_layer is None:
        base_decls = {d.property: d.value for d in decls if d.tier == "Base"}
        ctx.base_layer = layer_detect(ctx, base_decls)

    result = ElementResult(block_slug=ctx.block_slug, decl_count=len(decls))
    for decl in decls:
        rid = resolver_id(
            ctx.base_layer, decl.property,
            has_inner_blocks=ctx.has_inner_blocks, conn=ctx.conn,
        )
        out = REGISTRY[rid](decl, ctx)
        if isinstance(out, Write):
            result.writes.append(out)
            result.decl_results += 1
        elif isinstance(out, GAP):
            result.gaps.append(out)
            result.decl_results += 1
        elif isinstance(out, list) and out and all(isinstance(w, Write) for w in out):
            # Faithful multi-attribute transfer for ONE declaration (Option A).
            result.writes.extend(out)
            result.decl_results += 1
        # else: None / [] / wrong-type → a LEAK. decl_results NOT incremented;
        # _check_conservation will raise (fail-closed, never laundered).

    # Element-level post-pass (§3.A.3): outer_box.align_finalise emits a SYNTHETIC
    # align:"full" Write on max-width ABSENCE (not tied to any single declaration),
    # appended OUTSIDE the conservation count (it has no source declaration).
    _check_conservation(result)
    synth = outer_box.align_finalise(decls, result.writes, ctx)
    if synth is not None:
        result.writes.append(synth)

    # FR-31-2.8.4 destination-parametric write: when the Ctx carries a
    # DESTINATION (the fold case — a band/grid-item whose declarations belong
    # to the OWNING block), setdefault each Write into the destination dict
    # (earlier paths win — the frozen convert.py:2888 contract; recorded
    # Step-3 semantics). destination=None (default) = SELF: the caller merges
    # ElementResult.attrs() exactly as before — behaviour-identical.
    dest = getattr(ctx, "destination", None)
    if dest is not None:
        if dest.block_slug != ctx.block_slug:
            raise ConservationError(
                f"DESTINATION MISMATCH: ctx.block_slug={ctx.block_slug!r} but "
                f"destination.block_slug={dest.block_slug!r} — the Ctx for a "
                f"folded node must be built WITH the owning block's slug so "
                f"resolver DB lookups target the owner (FR-31-2.8.4). A "
                f"mismatch means a mis-built fold Ctx; failing loud, never a "
                f"silent wrong-block write."
            )
        for w in result.writes:
            dest.attrs.setdefault(w.attr, w.value)
    return result


def emit_block_markup(
    block_slug: str, attrs: dict[str, int | float | str], inner: str = ""
) -> str:
    """Serialise a native SGS block to WP block markup (for the LANDED deploy).

    e.g. emit_block_markup('sgs/container', {'maxWidth': '1200px'})
        -> '<!-- wp:sgs/container {"maxWidth":"1200px"} --><div ...></div><!-- /wp:sgs/container -->'
    The dynamic block renders server-side from the attrs; inner is optional content.
    """
    attr_json = json.dumps(attrs, separators=(",", ":"), sort_keys=True)
    name = block_slug  # already 'sgs/<x>'
    open_comment = f"<!-- wp:{name} {attr_json} -->" if attrs else f"<!-- wp:{name} -->"
    # Newline-separate the inner content — WP's canonical block serialisation puts
    # each block on its own line, and the pipeline's line-based post-processing
    # (convert.ensure_root_section_class splits on "\n" and rewrites the FIRST block
    # line) DROPS every child when the whole block is on one line. Emitting the inner
    # on its own line(s) keeps children off line 0 so the section-className rewrite
    # touches only the opening comment. (Wired-pipeline LANDED bug, 2026-07-01.)
    if inner:
        return f"{open_comment}\n{inner}\n<!-- /wp:{name} -->"
    # No inner content → SELF-CLOSING (`/-->`), not open+close. WP block validation
    # REJECTS the open+close form for a block whose save() returns null (all dynamic
    # SGS blocks: sgs/media, sgs/icon, sgs/button, sgs/text, …) — an invalid block
    # cascades and silently drops the whole section on the rendered page. Mirrors the
    # frozen db_lookup._emit_wp_block_markup self-close contract. (Wired-pipeline
    # LANDED bug #2, 2026-07-01 — found by the canary render, not unit tests.)
    self_close = f"<!-- wp:{name} {attr_json} /-->" if attrs else f"<!-- wp:{name} /-->"
    return self_close
