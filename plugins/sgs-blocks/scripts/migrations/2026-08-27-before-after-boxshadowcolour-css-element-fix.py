"""Migration: relabel sgs/before-after.boxShadowColour's css_element to
'wrapper' so it is recognised by the OUTER-layer root-element vocabulary.

`sgs/before-after`'s own `block.json` declares
`supports.sgs.elements.frame.isWrapper: true` — 'frame' is this block's own,
semantically CORRECT name for its root/wrapper element. But
`db_lookup.py`'s OUTER-layer root-element recognition
(`declared_attrs_for_css_property`'s `_outer_element_clause` /
`_base_domain_attrs_for_css_property`'s `_OUTER_ROOT_ELEMENTS`) is currently
a CLOSED literal list — `('', root, self, wrapper)` — that does not
recognise a per-block custom wrapper-element name like 'frame'. Without a
relabel, this attr's OUTER-layer resolution
(`attr_for_layer_property('sgs/before-after', 'OUTER', 'box-shadow-color')`)
silently gaps instead of resolving to `boxShadowColour`.

This migration (and the matching correction to
`plugins/sgs-blocks/scripts/attr-classification-overrides.json`'s
`sgs/before-after.boxShadowColour` entry, which is the version-controlled
source `/sgs-update` re-derives this DB row from) is a PRAGMATIC
COMPATIBILITY LABEL, not a semantic correction — this block's true root
element name remains 'frame' in `block.json`. Both the live DB and its
JSON source now agree on `css_element='wrapper'` for this one attr, so a
future `/sgs-update` reseed will not revert it.

The real fix — making the OUTER-layer vocabulary recognise each block's own
declared isWrapper element name instead of a fixed list — is NOT done here.
A 2026-08-27 roster survey found 32 blocks with the same latent gap
(info-box, product-card, card-grid, button, and others); tracked as a
follow-up, not fixed by this one-row migration.

Idempotent: re-running the UPDATE against an already-corrected row is a no-op
(the WHERE clause only matches rows still at 'frame').
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
