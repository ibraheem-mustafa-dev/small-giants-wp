"""button_group.py — faithful port of the button-grouping pass.

Ported from orchestrator/converter_v2/convert.py (behaviour-IDENTICAL,
Spec 31 §12 / Spec 11 / parking P-9):

  - ``_SGS_BUTTON_OPEN_RE``   (convert.py:5713) -> ``_SGS_BUTTON_OPEN_RE``
  - ``_group_loose_buttons``  (convert.py:5716) -> ``group_loose_buttons``

No block-slug literals. No import from convert.py.
``from converter.db import db_lookup`` (moved off the frozen tree in EXECUTION
Step 9, Phase 3, 2026-07-04) is the only DB-accessor import, matching the
pattern in styling_helpers.py and lift_helpers.py.
"""
from __future__ import annotations

import re

from converter.db import db_lookup


# ---------------------------------------------------------------------------
# Button-detection regex (convert.py:5713 — verbatim copy)
#
# Matches the opening WP block comment for ANY sgs/button variant:
#   <!-- wp:sgs/button -->          (open form, no attrs)
#   <!-- wp:sgs/button {"x":1} -->  (attrs present)
#   <!-- wp:sgs/button /-->         (self-closing — no inner content)
#
# The character class (\s|/-->|-->) ensures we stop at exactly sgs/button and
# do NOT match sgs/button-group or any other sgs/button-* slug.
# ---------------------------------------------------------------------------
_SGS_BUTTON_OPEN_RE = re.compile(r"^\s*<!--\s*wp:sgs/button(?:\s|/-->|-->)")


# ---------------------------------------------------------------------------
# group_loose_buttons (convert.py:5716 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def group_loose_buttons(children: list[str]) -> list[str]:
    """Wrap each consecutive run of top-level ``sgs/button`` blocks in the
    button-group container block.

    Behaviour is identical to ``_group_loose_buttons`` (convert.py:5716):

    - Non-button children pass through unchanged.
    - A run of length 1 is still wrapped — WP wraps even a single
      ``core/button`` in ``core/buttons``; this mirrors that contract.
    - Already-grouped buttons (a ``__ctas`` / ``__buttons`` draft wrapper
      that resolved to ``sgs/multi-button``) arrive as a single opaque
      string beginning with ``<!-- wp:sgs/multi-button``; the regex does NOT
      match that prefix, so the group is never re-wrapped.  Idempotent.
    - The group slug is DB-derived via ``db_lookup.block_for_slot_token``
      (R-31-1 — no hardcoded slug). If the DB has no ``button-group`` slot-token
      row, the children pass through UNGROUPED (a DB-data gap, never a content
      drop) — the new engine carries NO fallback slug literal (the frozen
      ``or 'sgs/multi-button'`` fallback would violate the no-slug-literal gate).

    Self-suppression contract (callers):
        When the container being processed IS the button-group block itself,
        the caller MUST skip this function (``convert.py`` lines 4879 and
        6200 both gate on
        ``slug != db.block_for_slot_token("button-group")``).
        This function has no knowledge of the parent slug; the gate lives at
        the call site, NOT here.  Do NOT add parent-slug logic inside this
        function — it would break the single-responsibility boundary.

    Args:
        children: Ordered list of already-emitted child-block markup strings
                  (one WP block comment string per child).

    Returns:
        New list where every maximal consecutive run of ``sgs/button`` strings
        is replaced by a single ``sgs/multi-button`` wrapper containing those
        strings joined by newlines.  Non-button strings are unchanged and
        remain at their original positions.

    Ported from convert.py:5716.
    """
    group_slug = db_lookup.block_for_slot_token("button-group")
    if not group_slug:
        # No DB mapping for the button-group slot token -> cannot form the wrapper.
        # Pass children through ungrouped (a DB-data gap, NOT a content drop); never
        # hardcode the slug (R-31-1 / the no-slug-literal F5 gate).
        return list(children)
    open_tag: str = f"<!-- wp:{group_slug} -->\n"
    close_tag: str = f"\n<!-- /wp:{group_slug} -->"

    out: list[str] = []
    run: list[str] = []

    for child in children:
        if _SGS_BUTTON_OPEN_RE.match(child):
            run.append(child)
            continue
        if run:
            out.append(open_tag + "\n".join(run) + close_tag)
            run = []
        out.append(child)

    # Flush any trailing button run (handles the case where the last child is a
    # button — the loop ends without encountering a non-button flush trigger).
    if run:
        out.append(open_tag + "\n".join(run) + close_tag)

    return out
