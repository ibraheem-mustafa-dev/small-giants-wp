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


def clear() -> None:
    """Reset the accumulator. Call once at the start of a convert_section() run."""
    _GAPS.clear()


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
    out = list(_GAPS)
    _GAPS.clear()
    return out
