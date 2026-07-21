"""check_routing.py — Check #1: routing determinism guard.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §1 (check #1)

Rule: for every sgs/* block, no css_property may have ≥2 of the block's own
declared attrs derivable from it in the SAME writer_path.  The live resolver
(attr_for_property) returns the first matching attr by rowid order — a silent
arbitrary pick if two compete.

This is a MEASURE-FIRST forward-looking guard: likely returns nothing today.
That is expected and correct.  If it surfaces cases, enumerate + baseline them
rather than false-arming the gate.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, routing_key
from .resolver_bridge import enumerate_candidates


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #1 against the live DB connection.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation]  — empty list when routing is unambiguous (expected today).
    """
    violations: list[Violation] = []

    # Iterate all sgs/* blocks.
    slugs = [
        row[0]
        for row in conn.execute(
            "SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' ORDER BY slug"
        ).fetchall()
    ]

    for block_slug in slugs:
        candidates = enumerate_candidates(block_slug, conn)

        for (css_property, writer_path, css_element, css_state, css_tier), attrs in candidates.items():
            if len(attrs) < 2:
                continue  # unambiguous — fine

            # Two or more competing attrs for the SAME (css_property, writer_path,
            # css_element, css_state, css_tier) — a genuine collision on every axis, not
            # just the same literal property string (2026-07-21 widening; see
            # resolver_bridge.enumerate_candidates docstring). CRITICAL CAVEAT: the
            # live resolver `attr_for_property(block_slug, css_property)` (db_lookup.py
            # :1600) is called with ONLY block_slug + css_property — it has NO
            # element/state/tier parameter at all. Widening THIS check's grouping key
            # stops it flagging attrs that legitimately differ by element/state/tier,
            # but does NOT by itself teach the real resolver to disambiguate them —
            # that is a separate, load-bearing architectural gap (flagged, not silently
            # fixed here; see the F6 report / handoff for the open follow-up).
            competing = ", ".join(f"'{a}'" for a in sorted(attrs))
            key_desc = (
                f"element={css_element or 'NULL'}, state={css_state or 'NULL'}, tier={css_tier or 'NULL'}"
            )
            violation = Violation(
                check="routing",
                block=block_slug,
                detail=(
                    f"css_property '{css_property}' resolves to {len(attrs)} competing "
                    f"attrs ({competing}) in writer_path '{writer_path}' ({key_desc}) — the live "
                    f"resolver silently picks the first by rowid order. These attrs are identical "
                    f"on EVERY routing axis (property/writer_path/element/state/tier), so they "
                    f"genuinely contend for the same slot."
                ),
                fix=(
                    f"Two attributes on {block_slug} both receive CSS '{css_property}' "
                    f"via the '{writer_path}' writer with the SAME element/state/tier — rename or "
                    f"remove one so routing is unambiguous, or add a distinguishing "
                    f"css_element/css_state/css_tier if they legitimately differ.  Then run: "
                    f"python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=routing_key(block_slug, css_property, f"{writer_path}:{css_element}:{css_state}:{css_tier}"),
            )
            violations.append(violation)

    return violations
