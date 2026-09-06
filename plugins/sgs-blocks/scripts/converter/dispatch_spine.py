"""dispatch_spine.py — dispatch + conservation spine (design §3 / §4).

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

from converter.block_serialization import serialize_block_attributes
from converter.db import db_lookup
from converter.dispatch_table import resolver_id
from converter.models import GAP, GapOrigin, Write
from converter.resolvers import REGISTRY, outer_box
from converter.services.layer_detect import layer_detect
from converter.services.tier_object import tier_object_key


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

    def attrs(self) -> dict[str, int | float | str | dict]:
        """The native block attribute dict the Writes produce (for emit).

        Box-object interface contract (2026-07-09, qc-council finding #4
        2026-07-09): a dict-valued Write is a per-key MERGE candidate ONLY
        when the attr is a genuine box family — gated on
        ``db_lookup.box_family_for(self.block_slug, w.attr)``, NEVER bare
        ``isinstance(dict)``. A future resolver emitting a legitimately
        dict-valued NON-box attr (e.g. a media/background ``{url,id,alt}``
        object) must not be silently per-key-merged if written twice — that
        would launder a real collision. For a NON-box dict-valued attr: a
        single write stores the dict verbatim; a SECOND write to the same
        attr is a genuine collision (raise, never a silent per-key merge).
        A non-dict Write for an attr already seen behaves exactly as before
        (last-write-wins dict-comprehension semantics).
        """
        out: dict[str, int | float | str | dict] = {}
        for w in self.writes:
            existing = out.get(w.attr)

            # TIER-of-BOXES box-family attr (Phase 2, 2026-09-06): padding/margin/
            # borderRadius once migrated off the flat 3-sibling shape, and
            # contentBandPadding/contentBandMargin/gridItemPadding/
            # gridItemBorderRadius which already were. `box_family_for()` alone
            # cannot tell this apart from a genuine flat box (both carry the same
            # self-referential value) — `box_family_is_tier_shaped()` adds the
            # missing bit (no Tablet/Mobile SIBLING ROWS declared). Every tier's
            # write already targets the SAME bare attr name (tier_state_suffix
            # stopped suffixing it, same Phase 2 change), so this branch nests each
            # write's box value under its OWN tier key instead of merging box
            # SIDES together — the axis this attr varies on is TIER, not SIDE.
            if isinstance(w.value, dict) and db_lookup.box_family_is_tier_shaped(
                self.block_slug, w.attr
            ):
                # DB-driven key derivation (R-31-1) — never a hardcoded
                # {"Base": "desktop", ...} dict; see tier_object_key()'s own
                # docstring for the earlier revision the anti-cheat gate
                # correctly refused for exactly that.
                tier_key = tier_object_key(w.tier) or "desktop"
                if isinstance(existing, dict):
                    tier_box = existing.setdefault(tier_key, {})
                    for k, v in w.value.items():
                        tier_box.setdefault(k, v)
                else:
                    out[w.attr] = {tier_key: dict(w.value)}
                continue

            is_box = isinstance(w.value, dict) and (
                db_lookup.box_family_for(self.block_slug, w.attr) is not None
            )
            if is_box and isinstance(existing, dict):
                for k, v in w.value.items():
                    existing.setdefault(k, v)
            elif is_box:
                # FIRST dict write for this box-family attr: store a COPY,
                # never the Write's own dict object. A later dict Write for
                # the same attr `setdefault`s INTO this merge target (branch
                # above) — if it aliased the first Write's `.value`, that
                # setdefault would mutate a frozen Write record's dict in
                # place (STOP: aliasing corrupts `result.writes` history even
                # though `Write` is a frozen dataclass — freezing blocks
                # reassigning `.value`, not mutating the dict it points to).
                out[w.attr] = dict(w.value)
            elif isinstance(w.value, dict) and db_lookup.tier_object_base(
                self.block_slug, w.attr
            ):
                # TIER-OBJECT partial write ({desktop|tablet|mobile: value}).
                # Structurally the same accumulation as the box branch above and
                # merged the same way — three declarations at three device tiers
                # are three PARTIAL writes to ONE object attr, not a collision.
                # Distinct from box only in which keys it merges (tiers vs sides),
                # which is why the predicate is `tier_object_base` and not a name
                # test: BOX and TIER are independent axes and a single attr is one
                # or the other, never both (Spec 35 Phase 1.4).
                #
                # First-write-per-key wins, matching the box branch and the fold
                # `setdefault` contract. Tier resolution order runs Desktop first,
                # so a narrower tier never overwrites a wider one that already
                # claimed the key.
                if isinstance(existing, dict):
                    for k, v in w.value.items():
                        existing.setdefault(k, v)
                else:
                    # COPY, never the Write's own dict — a later partial write
                    # `setdefault`s INTO this target, and aliasing would mutate a
                    # frozen Write's history in place (same hazard the box branch
                    # documents).
                    out[w.attr] = dict(w.value)
            elif isinstance(w.value, dict):
                # NON-box, NON-tier dict-valued attr. A single write is fine (stored
                # verbatim, copied). A SECOND write to the same attr is an
                # unresolvable ambiguity — two declarations both claiming the
                # whole attr — and must raise rather than silently per-key
                # merge (the exact collision this gate exists to catch).
                if w.attr in out:
                    raise ConservationError(
                        f"COLLISION: non-box-family attr {w.attr!r} for "
                        f"{self.block_slug!r} received ≥2 dict-valued writes "
                        f"— box_family_for() returned None, so this is NOT a "
                        f"box-object merge candidate; a second write to the "
                        f"same attr would silently lose the first."
                    )
                out[w.attr] = dict(w.value)
            else:
                out[w.attr] = w.value
        return out

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
    # COLLISION: no two writes may target the same attr (silent last-wins data
    # loss) — UNLESS every write sharing that attr carries a dict value (a
    # PARTIAL write into a merged object — either a box-object SIDE
    # (box-object interface contract §3/§4, 2026-07-09) or a TIER-object
    # DEVICE key (Spec 35 tier shape): those are a deliberate merge, not a
    # collision, PROVIDED no two dict writes for the same attr also share a
    # KEY (that IS a real collision — two declarations both claiming e.g.
    # 'top', or both claiming 'mobile') and no dict write is mixed with a
    # non-dict write for the same attr (an ambiguous shape).
    by_attr: dict[str, list] = {}
    for w in result.writes:
        by_attr.setdefault(w.attr, []).append(w)
    dupes: list[str] = []
    for attr, ws in by_attr.items():
        if len(ws) < 2:
            continue
        if all(isinstance(w.value, dict) for w in ws):
            seen_keys: set[str] = set()
            key_dupes: set[str] = set()
            for w in ws:
                for k in w.value:
                    if k in seen_keys:
                        key_dupes.add(k)
                    seen_keys.add(k)
            if key_dupes:
                raise ConservationError(
                    f"COLLISION: merged-object attr {attr!r} for {result.block_slug} "
                    f"received ≥2 writes for the same key(s) "
                    f"{sorted(key_dupes)} — one would be silently lost."
                )
            continue  # merge-safe: distinct keys across dict writes
        dupes.append(attr)
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
            delegates_content=ctx.delegates_content, conn=ctx.conn,
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
            write_is_dict = isinstance(w.value, dict)
            # qc-council finding #4 (2026-07-09): the per-key box-object merge
            # path is gated on ``db_lookup.box_family_for(dest.block_slug,
            # w.attr)`` — the sole legitimate signal (box-object interface
            # contract §3) — never bare ``isinstance(dict)``. dest.block_slug
            # == ctx.block_slug is already enforced above (DESTINATION
            # MISMATCH guard), so it is the correct owning slug to look up.
            #
            # TIER-OBJECT widening (Spec 35 tier shape, D802-class fix extended
            # to the fold/DESTINATION path, this fix): a migrated tier-object
            # attr (gap/gridTemplateColumns/contentWidth/…) accumulates the
            # SAME way a box-object attr does — per-key setdefault, collision
            # only on a genuinely conflicting key — just merging tier keys
            # (desktop/tablet/mobile) instead of side keys. Without this,
            # a composite whose band folds e.g. `display:grid` (→ `layout`,
            # scalar) alongside `grid-template-columns` (→ the tier-object
            # `gridTemplateColumns`, a SECOND dict-valued write reaching this
            # SAME destination-fold path once grid.py started emitting the
            # tier-object shape) raised a false DESTINATION COLLISION and the
            # whole section's markup was discarded — measured live on
            # sgs/trust-bar (test_metamorphic_section_order_permutation_
            # real_draft). BOX and TIER are independent, mutually exclusive
            # axes (Spec 35 Phase 1.4), so this is a straight widening of the
            # SAME merge/collision logic below, not a new mechanism.
            is_mergeable_dict = write_is_dict and (
                db_lookup.box_family_for(dest.block_slug, w.attr) is not None
                or db_lookup.tier_object_base(dest.block_slug, w.attr)
            )
            if write_is_dict and not is_mergeable_dict:
                # NON-box, NON-tier dict-valued attr: a single write across the
                # fold is fine (stored verbatim). A SECOND write to the same
                # attr — from this or an earlier folded call — is an
                # unresolvable ambiguity (two nodes both claiming the whole
                # attr), not a legitimate per-key accumulation; raise rather
                # than silently per-key merge.
                if w.attr in dest.attrs:
                    raise ConservationError(
                        f"DESTINATION COLLISION: non-box-family, non-tier-object "
                        f"attr {w.attr!r} for {dest.block_slug!r} received ≥2 "
                        f"dict-valued writes across the fold — neither "
                        f"box_family_for() nor tier_object_base() claims it, so "
                        f"this is NOT a merge candidate; a second write would "
                        f"silently lose the first."
                    )
                dest.attrs[w.attr] = dict(w.value)
                continue

            existing = dest.attrs.get(w.attr)
            existing_is_dict = isinstance(existing, dict)
            if w.attr in dest.attrs and existing_is_dict != write_is_dict:
                # Cross-node SHAPE mismatch: one folded call already wrote a
                # box-object partial (dict) for this attr, another writes a
                # plain scalar (or vice versa) — ambiguous, ONE would be
                # silently dropped by a naive setdefault. _check_conservation
                # only ever sees a SINGLE call's writes, so this cross-call
                # collision must be caught here.
                raise ConservationError(
                    f"DESTINATION SHAPE MISMATCH: attr {w.attr!r} for "
                    f"{dest.block_slug!r} received both a box-object/tier-object "
                    f"partial (dict) and a scalar value from different folded "
                    f"nodes — ambiguous shape, one would be silently lost."
                )
            if write_is_dict:  # is_mergeable_dict True here (non-mergeable handled + continued above)
                if existing_is_dict:
                    target = existing
                else:
                    # FIRST dict write for this attr across the fold: store a
                    # COPY (never alias this Write's own `.value` dict — a
                    # later fold call's setdefault below would otherwise
                    # mutate a frozen Write's dict in place, box-object
                    # interface contract §3/§4 + FIX 3).
                    target = dict(w.value)
                    dest.attrs[w.attr] = target
                for k, v in w.value.items():
                    if k in target and target[k] != v:
                        # Cross-node per-side/per-tier COLLISION: two folded
                        # calls both claim the SAME key with DIFFERENT values —
                        # a real collision `_check_conservation` cannot see
                        # (each call only sees its own writes).
                        raise ConservationError(
                            f"DESTINATION COLLISION: box-object/tier-object attr "
                            f"{w.attr!r} for {dest.block_slug!r} received two "
                            f"DIFFERENT values for key {k!r} ({target[k]!r} vs "
                            f"{v!r}) from different folded nodes — one would be "
                            f"silently lost."
                        )
                    target.setdefault(k, v)
            else:
                # Scalar/scalar destination semantics UNCHANGED — earlier-wins
                # setdefault is the frozen convert.py:2888 contract; do not
                # alter it.
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
    # SECURITY: never plain json.dumps here. json.dumps escapes only JSON-structural
    # characters, so an attribute VALUE containing "-->" terminates this HTML comment
    # early and everything after it lands in post_content as raw, unparsed HTML
    # (stored-XSS class). serialize_block_attributes() ports WP core's own
    # serialize_block_attributes() escaping so no value can breach the comment
    # boundary, while staying decodable by WP_Block_Parser.
    # ensure_ascii=True preserves this emitter's long-standing \uXXXX form for
    # non-ASCII (goldens pin it); it is orthogonal to the escaping above and
    # carries no security weight either way.
    attr_json = serialize_block_attributes(attrs, sort_keys=True, ensure_ascii=True)
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
