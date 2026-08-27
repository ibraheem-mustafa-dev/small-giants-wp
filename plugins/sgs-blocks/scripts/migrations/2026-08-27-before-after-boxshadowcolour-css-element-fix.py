"""Migration: relabel sgs/before-after.boxShadowColour's css_element to
'wrapper' so it is recognised by the OUTER-layer root-element vocabulary.

CORRECTED (2026-08-27, second review pass) — the ORIGINAL version of this
docstring made two claims a reviewer found to be false, and characterised the
row as a "mis-seed". Both corrected below.

WHERE 'frame' ACTUALLY CAME FROM (identified per reviewer request): it is not
a data-entry mistake. `sgs/before-after`'s own `block.json` declares
`supports.sgs.elements.frame.isWrapper: true` — 'frame' IS this block's own
name for its root/wrapper element (the same role 'wrapper'/'box'/'card' play
on other blocks). `plugins/sgs-blocks/scripts/attr-classification-
overrides.json` (read by `sgs-update-v2.py`, the `/sgs-update` re-seed
pipeline) has an explicit override entry for
`sgs/before-after.boxShadowColour` setting `css_element: "frame"`,
`css_layer: "OUTER"`, `derived_selector: ".wp-block-sgs-before-after"` — its
own `_why` states this directly ("Element is 'frame' (block.json's own
isWrapper:true element for this content-KIND block)... no separate BEM
sub-element exists for it"). So `css_element='frame'` is semantically
CORRECT and traceable to a real, documented source — not a stray/garbage
value.

THE ACTUAL GAP is elsewhere: the OUTER-layer root-element recognition used by
both `db_lookup.declared_attrs_for_css_property`'s `_outer_element_clause`
(the PRE-EXISTING, untouched-by-this-task's-commits function that
`attr_for_layer_property` — the function `outer_box.resolve`'s
`attr_resolve` call actually reaches for this property in production — uses)
and this session's new `_OUTER_ROOT_ELEMENTS` constant in
`_base_domain_attrs_for_css_property`, is a CLOSED literal list: `('', root,
self, wrapper)`. Neither recognises a per-block custom wrapper-element name
like 'frame'. That list is pre-existing (the `_outer_element_clause` predates
both of this task's commits) and this migration does NOT fix it — it works
around it for this one row.

CORRECTED CAUSAL RECORD: this was NOT "a regression introduced by [this
task's] correct guard exposing this row's wrong label." `attr_for_layer_
property('sgs/before-after', 'OUTER', 'box-shadow-color')` — the real
production path — already returned `None` for `css_element='frame'` via the
PRE-EXISTING `_outer_element_clause`, untouched by either commit in this
task. This has been a pre-existing gap the whole time; it surfaced during
this investigation, it was not caused by it.

CORRECTED RETURN-VALUE CLAIM: the original docstring claimed
`attr_for_property('sgs/before-after', 'box-shadow-color')` resolves to
`('wrapper_css', 'boxShadowColour', 'colour')` post-migration. That is FALSE.
`box-shadow-color` has ZERO rows in `property_suffixes`, so
`attr_for_property` short-circuits to `None` for it unconditionally,
regardless of any column-first/DB state — it never reaches the column-first
check at all for this property. The correct function to observe is
`attr_for_layer_property('sgs/before-after', 'OUTER', 'box-shadow-color')`,
which is what `plugins/sgs-blocks/scripts/converter/tests/
test_root_modifier_element_guard.py::test_before_after_box_shadow_colour_
resolves_after_css_element_reseed` actually asserts against.

WHY THIS MIGRATION IS KEPT DESPITE 'frame' BEING THE "TRUE" LABEL: relabelling
the DB row to 'wrapper' is a pragmatic compatibility shim, not a semantic
correction — it makes this ONE row satisfy the closed root-element
vocabulary so `sgs/before-after`'s own root box-shadow colour resolves
instead of gapping. It is confirmed narrow, idempotent, and correct in
EFFECT (verified against the live DB), and is intentionally not reversed.

DURABILITY RISK (named, not fixed here): `attr-classification-overrides.json`
still declares `css_element: "frame"` for this attr. A future `/sgs-update`
re-seed that reads that override file will REVERT this DB row back to
'frame', silently undoing this migration's effect (the DB row would need
re-running this migration again, or the JSON override itself would need
updating, or — the actual fix — the OUTER-layer root-element vocabulary
would need to become DB/block.json-driven instead of a closed literal list).
None of those three are done by this migration; flagged for a follow-up.

Idempotent: re-running the UPDATE against an already-corrected row is a no-op
(same value written; the WHERE clause only matches rows still at 'frame').

R-31-1 (DB-first correction — the routing logic itself was not touched by
this migration; only this one row's label).
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
