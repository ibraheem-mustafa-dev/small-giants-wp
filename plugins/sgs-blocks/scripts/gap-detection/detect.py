"""
Spec 19 Stage 10 — Gap Detection
====================================
Identifies attributes whose canonical_slot is NULL (un-decomposable by the
current vocabulary) and stages them as gap candidates so they surface for
operator review. Also drains `recognition_log` extraction_failed events
into the same gap-candidate queue.

Idempotent — re-runs add zero rows when no new gaps have appeared since
the previous run. Stage 4 (assign-canonical) handles the bulk Phase-1
backfill; Stage 10 catches anything new each scan.

Reads from sgs-framework.db tables:
  - block_attributes (canonical_slot IS NULL → candidate)
  - recognition_log (extraction_failed events, if table exists)

Writes to sgs-framework.db.attribute_gap_candidates with proposed_action
indicating the source.

Usage:
    python detect.py            # report + write new gaps; exit 0

UK English in all comments and output.
"""

from __future__ import annotations

import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)

_TRAILING_CAMEL_RE = re.compile(r'[A-Z][a-z]+$')


def _peel_longest_suffix(name: str, suffix_set: set[str]) -> str | None:
    """Return the longest suffix in *suffix_set* that *name* ends with."""
    matches = [s for s in suffix_set if name.endswith(s) and len(name) > len(s)]
    if not matches:
        return None
    return max(matches, key=len)


def load_vocab(conn: sqlite3.Connection) -> tuple[set[str], set[str]]:
    """Load modifier_suffixes and property_suffixes vocabulary sets once.

    Returns (modifier_set, property_set) for use with decompose_stem.
    Splitting load from decompose avoids O(n²) DB queries inside loops.
    """
    mods = {r[0] for r in conn.execute('SELECT suffix FROM modifier_suffixes')}
    props = {r[0] for r in conn.execute('SELECT suffix FROM property_suffixes')}
    return mods, props


def decompose_stem(attr_name: str, modifier_set: set[str], property_set: set[str]) -> str:
    """Decompose *attr_name* into its slot stem per Spec 31.

    Peels the longest known modifier_suffix, then the longest known
    property_suffix, then strips any remaining single trailing CamelCase
    token. Returns the lowercased remaining stem. Falls back to the full
    attr_name (lowercased) if no decomposition applies.
    """
    mods = modifier_set
    props = property_set
    remaining = attr_name
    # Per Spec 31 + assign-canonical.py:
    # Step 1 — repeatedly peel modifier suffixes from the right
    # Step 2 — peel ONE property suffix (longest match)
    # Step 3 — remainder is the slot stem
    while True:
        mod = _peel_longest_suffix(remaining, mods)
        if not mod:
            break
        remaining = remaining[: -len(mod)]
    prop = _peel_longest_suffix(remaining, props)
    if prop:
        remaining = remaining[: -len(prop)]
    if remaining and remaining != attr_name and remaining[0].isupper():
        remaining = remaining[0].lower() + remaining[1:]
    if not remaining:
        remaining = attr_name
    return remaining


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


def detect_unresolved_attrs(conn: sqlite3.Connection) -> int:
    """Stage candidates for attributes with NULL canonical_slot.

    Stem is decomposed via the vocab tables (Spec 31) — the operator
    review queue then groups by stem, surfacing repeated unresolved roots.
    """
    cur = conn.execute(
        """
        SELECT ba.block_slug, ba.attr_name
        FROM block_attributes ba
        LEFT JOIN attribute_gap_candidates gc
          ON gc.block_slug = ba.block_slug AND gc.attr_name = ba.attr_name
        WHERE ba.canonical_slot IS NULL
          AND gc.id IS NULL
        """
    )
    pending = cur.fetchall()
    if not pending:
        return 0
    modifier_set, property_set = load_vocab(conn)
    new_rows = [
        (slug, attr, decompose_stem(attr, modifier_set, property_set), 'new-canonical-slot-needed')
        for slug, attr in pending
    ]
    conn.executemany(
        """
        INSERT INTO attribute_gap_candidates
          (block_slug, attr_name, stem, proposed_action)
        VALUES (?, ?, ?, ?)
        """,
        new_rows,
    )
    conn.commit()
    return len(new_rows)


def detect_recognition_failures(conn: sqlite3.Connection) -> int:
    """Drain extraction_failed events from recognition_log if present."""
    if not table_exists(conn, 'recognition_log'):
        return 0
    cur = conn.execute(
        """
        SELECT DISTINCT rl.block_slug, rl.attr_name
        FROM recognition_log rl
        LEFT JOIN attribute_gap_candidates gc
          ON gc.block_slug = rl.block_slug AND gc.attr_name = rl.attr_name
        WHERE rl.event_type = 'extraction_failed'
          AND gc.id IS NULL
        """
    )
    pending = cur.fetchall()
    if not pending:
        return 0
    modifier_set, property_set = load_vocab(conn)
    new_rows = [
        (slug, attr, decompose_stem(attr, modifier_set, property_set), 'extraction-failed-in-clone')
        for slug, attr in pending
    ]
    conn.executemany(
        """
        INSERT INTO attribute_gap_candidates
          (block_slug, attr_name, stem, proposed_action)
        VALUES (?, ?, ?, ?)
        """,
        new_rows,
    )
    conn.commit()
    return len(new_rows)


def main() -> int:
    if not DB_PATH.exists():
        print(f"ERROR: DB not found at {DB_PATH}")
        return 2

    conn = sqlite3.connect(str(DB_PATH))
    try:
        existing_total = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates").fetchone()[0]
        added_attrs = detect_unresolved_attrs(conn)
        added_recog = detect_recognition_failures(conn)
        new_total = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates").fetchone()[0]
    finally:
        conn.close()

    print(f"GAP-DETECTION: existing={existing_total}  +unresolved-attrs={added_attrs}  +recognition-failures={added_recog}  total={new_total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
