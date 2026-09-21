"""content_gap_collector.py — the content-side gap channel (observability only).

WHY THIS FILE EXISTS
---------------------
``converter/services/extraction.py`` / ``converter/walk.py`` /
``converter/resolvers/array_content.py`` construct ``converter.context.ContentGap``
objects the moment a content unit cannot be transferred — but nothing downstream
of ``build_block_markup`` ever reads them. ``converter/services/assembly.py``
consumes ``ScalarLift`` and ``ChildBlock`` out of the same ``results`` list and
throws every ``ContentGap`` away. Proven 2026-07-31 on
``tests/fixtures/conformance/sgs-tabs.html``: exactly 2 ``ContentGap`` objects are
constructed (G3 validation — an ``sgs/info-box`` child rejected by
``sgs/tabs``'s ``accepts_allowed_blocks``) and ``convert_section()``'s return dict
carries no content-gap key at all, so three text nodes vanish from the clone
with nothing anywhere recording it.

This module is the collection point that closes that gap (pun intended). It is
observability-only: nothing here changes what ``build_block_markup`` emits or
which block/attr a content unit resolves to — it only RECORDS what the existing
resolution logic already decided.

TWO KINDS OF FINDING
---------------------
1. ``dropped`` — a ``ContentGap`` the extraction/walk/array-content layer
   already constructs today (unchanged construction sites; this module just
   stops the objects being discarded).
2. ``fuzzy_fallback`` / ``fallback_declined`` — a resolution that did NOT match
   on its designated DB column and instead took an alias/heuristic/"first
   match wins" route (or explicitly declined to guess). Sourced from
   ``converter/db/db_lookup.py``'s EXISTING (but, until this module, never
   bound — ``db_lookup.set_trace()`` had zero callers anywhere in the live
   pipeline) ``_trace(stage, **kwargs)`` emitter inside
   ``_resolve_slug_from_bem_tuple`` — Path 2 (slot-alias walk,
   ``bem_resolve_slot_fallback``), Path 2b (compound-element prefix strip,
   ``bem_resolve_prefix_strip``), the ambiguous-bare-block LOUD-no-match
   (``bem_resolve_ambiguous_loud``), and the self-nest-skip
   (``bem_resolve_self_nest_skipped``). Binding is via db_lookup's own public
   ``set_trace(tr, boundary_id)`` API — no edit to db_lookup.py.

LIFECYCLE
---------
``converter/entry.py``'s ``convert_section()`` calls ``clear()`` before
extraction/build begins, binds a ``FallbackTraceSink`` into
``db_lookup.set_trace()`` for the duration of the call, and calls ``flush()``
once at the end to read the accumulated findings into the return dict's
``content_gaps`` key. ``record_content_gap()`` is called from
``assembly.build_block_markup()`` for every ``ContentGap`` in its ``results``
list — including recursive per-child calls, since each child invocation runs
the same collection line, so a single top-level ``clear()``/``flush()`` pair
naturally captures the whole recursive tree for one section.

Module-level list, not thread-local: the converter pipeline is single-threaded
per process (mirrors the existing ``db_lookup._TRACE`` / ``_fold_trace`` module
globals — same concurrency assumption, not a new one).
"""
from __future__ import annotations

from typing import Any

from converter.context import ContentGap

# ---------------------------------------------------------------------------
# Accumulator
# ---------------------------------------------------------------------------

_GAPS: list[dict[str, Any]] = []

# Stage names db_lookup._trace() emits that represent a RESOLVED fuzzy/alias
# fallback (the designated column — Path 1 direct bare-block match — missed,
# and a DB-driven alias/heuristic route resolved it instead).
_FUZZY_RESOLVED_STAGES = frozenset({
    "bem_resolve_slot_fallback",
    "bem_resolve_prefix_strip",
})

# Stage names representing a fallback that was CONSIDERED and DECLINED — the
# node falls through to pass-through/None rather than a silent guess. Still a
# content-routing finding worth surfacing (task scope: "falls back to a
# fuzzy/alias/heuristic route, OR drops content entirely").
_FUZZY_DECLINED_STAGES = frozenset({
    "bem_resolve_ambiguous_loud",
    "bem_resolve_self_nest_skipped",
})

_FUZZY_STAGES = _FUZZY_RESOLVED_STAGES | _FUZZY_DECLINED_STAGES


# Identity keys of declaration gaps already recorded this run. The same node's
# declarations are read many times per section (CSS pass, root-supports lift,
# arrangement, fold, motion), so one dropped declaration would otherwise be
# recorded once per reader.
_DECL_GAP_SEEN: set[tuple[str, str, str]] = set()

# --------------------------------------------------------------------------
# Deferred declaration-skip channel (Rule 4 NO-SKIPPING, 2026-09-21)
# --------------------------------------------------------------------------
# ``record_declaration_gap`` above is the IMMEDIATE channel: the caller already
# knows, at the moment it calls, that the declaration reached no destination
# anywhere. The per-area fold (``fold_helpers.route_area_css_to_block_attrs``)
# cannot know that at call time: ONE element's declarations are offered to
# SEVERAL owning blocks in turn (the recognised composite, then the wrapping
# ``sgs/container``), and a property that misses on the first pass may be
# routed on a later one. Recording immediately would therefore report
# declarations that WERE transferred.
#
# So the fold records a CANDIDATE and, at every site where it actually lifts a
# property, calls ``note_declaration_routed``. ``flush()`` resolves the two:
# a candidate whose (element, property) was routed by ANY pass is dropped; the
# rest become ordinary ``kind: "dropped"`` rows on the same channel the
# orchestrator already harvests into ``content-gaps.json``. Nothing here
# changes a routing decision or the emitted markup — it only records what the
# existing logic already decided.
_DECL_CANDIDATES: list[dict[str, Any]] = []
_DECL_CANDIDATE_SEEN: set[tuple[str, str, str]] = set()
_DECL_ROUTED: set[tuple[str, str]] = set()


def clear() -> None:
    """Reset the accumulator. Call once at the start of a convert_section() run."""
    _GAPS.clear()
    _DECL_GAP_SEEN.clear()
    _DECL_CANDIDATES.clear()
    _DECL_CANDIDATE_SEEN.clear()
    _DECL_ROUTED.clear()


def record_declaration_gap(
    *, element: str, prop: str, value: str, reason: str, block_slug: str = "",
) -> None:
    """Record ONE style declaration that was deliberately not lifted.

    Recorded as ``kind: "dropped"`` so the orchestrator's existing harvest
    (``_harvest_content_gaps`` -> ``content-gaps.json``) carries it with no
    change: ``where`` becomes ``attr_or_slot``; the extra keys (``property``,
    ``value``, ``element``, ``reason``) ride along for a human reader.
    Deduplicated on (element, property, raw value).

    ``block_slug`` names the block the declaration was offered to, when the
    caller knows it. Left at ``""`` (the pre-existing behaviour, kept for the
    ``template_binding`` callers) the harvest falls back to the section's own
    block name.
    """
    key = (element, prop, value)
    if key in _DECL_GAP_SEEN:
        return
    _DECL_GAP_SEEN.add(key)
    _GAPS.append({
        "kind": "dropped",
        "block_slug": block_slug,
        "where": f"{element} {{ {prop} }}",
        "detail": f"{reason}: {prop}: {value}",
        "element": element,
        "property": prop,
        "value": value,
        "reason": reason,
    })


def note_declaration_routed(*, element: str, prop: str, route_key: str = "") -> None:
    """Mark ``(element, route_key or prop)`` as having reached a real destination.

    Cancels any deferred skip candidate for the same pair (see
    ``record_declaration_skip_candidate``), in either order — a pass that lifts
    the property may run before or after a pass that misses it. ``route_key``
    lets a caller narrow the identity below the bare property name (the per-area
    fold qualifies it by DEVICE TIER, so a routed desktop value never cancels a
    genuinely dropped mobile override).
    """
    _DECL_ROUTED.add((element, route_key or prop))


def record_declaration_skip_candidate(
    *, block_slug: str, element: str, prop: str, value: str, reason: str,
    route_key: str = "",
) -> None:
    """Record a declaration this pass could not route, pending ``flush()``.

    Deduplicated on (element, route key, raw value) exactly as the immediate
    channel is, so the same declaration offered to N owning blocks yields ONE
    row, not N.
    """
    key = (element, route_key or prop, value)
    if key in _DECL_CANDIDATE_SEEN:
        return
    _DECL_CANDIDATE_SEEN.add(key)
    _DECL_CANDIDATES.append({
        "block_slug": block_slug,
        "element": element,
        "prop": prop,
        "route_key": route_key or prop,
        "value": value,
        "reason": reason,
    })


def _shorthand_route_keys(route_key: str) -> list[str]:
    """Every SHORTHAND route key that covers ``route_key``.

    ``padding-left@Base`` -> ``padding@Base``; ``border-top-width@Base`` ->
    ``border@Base``, ``border-top@Base``. One reader may see a declaration as
    the shorthand the draft wrote (``padding: 10px 18px``) and another as the
    longhands it expands to, so a route noted under either spelling cancels a
    candidate recorded under the other. Structural CSS longhand naming, not a
    per-block or per-property list.
    """
    prop, _, tier = route_key.rpartition("@")
    if not prop or "-" not in prop:
        return []
    parts = prop.split("-")
    return [f"{'-'.join(parts[:i])}@{tier}" for i in range(1, len(parts))]


def _resolve_skip_candidates() -> None:
    """Turn every still-unrouted candidate into a real gap row. Idempotent."""
    for cand in _DECL_CANDIDATES:
        element, route_key = cand["element"], cand["route_key"]
        if (element, route_key) in _DECL_ROUTED:
            continue
        if any((element, k) in _DECL_ROUTED for k in _shorthand_route_keys(route_key)):
            continue
        record_declaration_gap(
            element=cand["element"],
            prop=cand["prop"],
            value=cand["value"],
            reason=cand["reason"],
            block_slug=cand["block_slug"],
        )
    _DECL_CANDIDATES.clear()
    _DECL_CANDIDATE_SEEN.clear()


def record_content_gap(gap: ContentGap, *, block_slug: str) -> None:
    """Record a ``ContentGap`` constructed by extraction/walk/array-content.

    ``block_slug`` is the owning composite's recognised slug (``rec.slug``),
    threaded in by the caller since ``ContentGap`` itself carries no block
    identity (only ``where``, a human label already often prefixed
    ``"<slug>.<attr>"`` by the construction site).
    """
    _GAPS.append({
        "kind": "dropped",
        "block_slug": block_slug or "",
        "where": gap.where,
        "detail": gap.detail,
    })


def record_fallback_event(stage: str, **kwargs: Any) -> None:
    """Record one db_lookup fallback-resolution trace event, if it is one of
    the recognised fuzzy-fallback stages. Silently ignores every other stage
    (db_lookup._trace() fires many non-fallback events too — db_lookup_hit /
    db_lookup_miss / scalar_lift / section_wrap / etc. — those are not this
    module's concern).
    """
    if stage not in _FUZZY_STAGES:
        return

    class_ = kwargs.get("class_", "")
    resolved_to = kwargs.get("slug")

    if stage == "bem_resolve_slot_fallback":
        designated_column_missed = (
            "Path 1 direct bare-block match (class 'sgs/<block>' registered) — missed"
        )
        fallback_route = (
            f"Path 2 slot-alias walk (slot_synonyms alias table) on BEM segment "
            f"'{kwargs.get('slot', '')}'"
        )
        kind = "fuzzy_fallback"
    elif stage == "bem_resolve_prefix_strip":
        designated_column_missed = (
            "Path 1/Path 2 literal element/block alias lookup — missed"
        )
        fallback_route = (
            f"Path 2b compound-element prefix strip "
            f"(head='{kwargs.get('head', '')}' tail='{kwargs.get('tail', '')}')"
        )
        kind = "fuzzy_fallback"
    elif stage == "bem_resolve_ambiguous_loud":
        designated_column_missed = (
            "Path 1 direct bare-block match resolved to 2+ DISTINCT candidate blocks"
        )
        fallback_route = "none taken — draft-authoring ambiguity, refused rather than guessed"
        resolved_to = None
        kind = "fallback_declined"
    else:  # bem_resolve_self_nest_skipped
        designated_column_missed = (
            "Path 2/2b alias/prefix match resolved to the element's OWN parent block"
        )
        fallback_route = "none taken — self-nest guard refused the match (would emit a phantom self-copy)"
        resolved_to = None
        kind = "fallback_declined"

    _GAPS.append({
        "kind": kind,
        "stage": stage,
        "token_or_selector": class_,
        "designated_column_missed": designated_column_missed,
        "fallback_route": fallback_route,
        "resolved_to": resolved_to,
        "detail": (
            f"{stage}: class={class_!r} designated-column-missed="
            f"{designated_column_missed!r} fallback-route={fallback_route!r} "
            f"resolved-to={resolved_to!r}"
        ),
    })


class FallbackTraceSink:
    """A ``.event(stage, **kwargs)`` sink bindable via ``db_lookup.set_trace()``.

    Composes with whatever real ``Trace`` the caller passed into
    ``convert_section(trace=...)``: every event is (a) recorded here when it
    matches a recognised fuzzy-fallback stage, and (b) forwarded unchanged to
    the wrapped trace (if any) so the per-section JSONL evidence file — the
    existing ``--debug-trace`` mechanism — sees these events too. Before this
    module, ``db_lookup.set_trace()`` had no caller anywhere in the live
    pipeline, so every db_lookup fallback event was silently discarded
    regardless of ``--debug-trace``.
    """

    def __init__(self, downstream: Any = None) -> None:
        self._downstream = downstream

    def event(self, stage: str, **kwargs: Any) -> None:
        try:
            record_fallback_event(stage, **kwargs)
        except Exception:  # noqa: BLE001 — recording must never break conversion
            pass
        if self._downstream is not None:
            try:
                self._downstream.event(stage=stage, **kwargs)
            except Exception:  # noqa: BLE001 — mirrors db_lookup._trace's own soft-fail
                pass


def flush() -> list[dict[str, Any]]:
    """Return every finding recorded since the last ``clear()``, and clear.

    Called once per top-level ``convert_section()`` run so a single
    boundary's whole recursive build (root + every child ``build_block_markup``
    call) is captured as one list.
    """
    _resolve_skip_candidates()
    out = list(_GAPS)
    _GAPS.clear()
    _DECL_GAP_SEEN.clear()
    _DECL_ROUTED.clear()
    return out
