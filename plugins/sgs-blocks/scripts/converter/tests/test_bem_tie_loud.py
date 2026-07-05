"""test_bem_tie_loud.py — FR-31-15 as AMENDED (D278, Bean-directed 2026-07-05).

The capability-rank silent tiebreaker is RETIRED. Path 1 of
`_resolve_slug_from_bem_tuple` now: (1) DEDUPES bare-root candidates — a bare
class and its own --modifier class parse to the same block, which was every
historically recorded "tie"; (2) goes LOUD (trace + no match) on a residual
tie between DISTINCT blocks, so the node falls to the container-default /
pass-through path and the ambiguity surfaces for manual review.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_bem_tie_loud.py -q --import-mode=importlib
"""

from __future__ import annotations

from converter.db import db_lookup
from converter.db.db_lookup import resolve_slug_from_bem


def test_modifier_duplicate_dedupes_to_single_slug():
    """The historical 'tie' shape: bare root + its own modifier → same block.
    Must resolve exactly as before the amendment (behaviour-preserving)."""
    assert resolve_slug_from_bem(["sgs-hero", "sgs-hero--overlay"]) == "sgs/hero"
    assert resolve_slug_from_bem(["sgs-button", "sgs-button--primary"]) == "sgs/button"


def test_distinct_block_tie_is_loud_no_match():
    """A genuine cross-block tie (never observed in recorded history) must NOT
    be silently ranked — it returns None (container-default handles the node)
    and emits the loud ambiguity trace."""
    events: list[dict] = []
    orig_trace = db_lookup._trace
    db_lookup._trace = lambda stage, **kw: events.append({"stage": stage, **kw})
    try:
        # Both are registered built slugs — a real distinct-block tie.
        result = resolve_slug_from_bem(["sgs-hero", "sgs-container"])
    finally:
        db_lookup._trace = orig_trace
    assert result is None, "a distinct-block tie must be a LOUD no-match, never a pick"
    loud = [e for e in events if e["stage"] == "bem_resolve_ambiguous_loud"]
    assert loud and loud[0].get("chosen") is None
    assert set(loud[0].get("candidates", [])) == {"sgs/hero", "sgs/container"}


def test_ranker_is_gone():
    """The in-code priority list and ranker must not return."""
    assert not hasattr(db_lookup, "_capability_rank")
    assert not hasattr(db_lookup, "_CAPABILITY_PRIORITY")
