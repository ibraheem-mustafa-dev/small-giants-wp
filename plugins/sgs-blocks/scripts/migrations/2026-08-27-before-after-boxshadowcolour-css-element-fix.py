"""Migration: correct sgs/before-after.boxShadowColour's css_element mis-seed.

Why: found by a reviewer of the Task 1 converter fix (db_lookup.py
_base_domain_attrs_for_css_property — the root-domain OUTER-layer guard now
correctly requires css_element to be root-domain, not just css_layer='OUTER').
That correct guard exposed a stale/wrong seed: sgs/before-after.boxShadowColour
carries css_element='frame' (a named-child label) but its own
derived_selector is '.wp-block-sgs-before-after' — the block's WP root
selector, not a child. Every sibling attr on this SAME block that targets the
root (height, maxWidth, boxShadow) is correctly tagged css_element='wrapper'.
'frame' here is a labelling mistake, not a real child element — box-shadow-
color on this block has always painted the outer frame (the whole block),
which IS the root/wrapper, never a distinct 'frame' sub-element (before-after
declares no such DOM node).

Effect before this migration (post the db_lookup.py root-domain fix):
    attr_for_property('sgs/before-after', 'box-shadow-color') -> None
    (a false NO_DESTINATION gap — a regression introduced by the correct
    guard exposing this row's wrong label)

Effect after this migration:
    attr_for_property('sgs/before-after', 'box-shadow-color')
      -> ('wrapper_css', 'boxShadowColour', 'colour')
    (matches the pre-guard-fix behaviour, and is now correct BY CONSTRUCTION —
    same 'wrapper' label every other root attr on this block uses — not by
    the guard's old blind css_layer='OUTER' escape hatch)

Idempotent: re-running the UPDATE against an already-corrected row is a no-op
(same value written).

R-31-1 (DB-first correction — the code's routing logic was already correct;
the DATA was wrong).
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE block_attributes
           SET css_element = 'wrapper'
         WHERE block_slug = 'sgs/before-after'
           AND attr_name  = 'boxShadowColour'
           AND css_element = 'frame'
        """
    )
    affected = cur.rowcount
    conn.commit()
    conn.close()
    print(f"Updated css_element for {affected} sgs/before-after.boxShadowColour row(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
