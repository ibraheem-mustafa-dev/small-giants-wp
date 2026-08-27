"""Migration: correct sgs/product-card.backgroundColourGradient's css_property
from the synthetic, unreachable 'background-color-gradient' to the real CSS
longhand 'background-image' (Task 1b, D873 follow-up).

Root cause (verified live against sgs-framework.db, not inferred): the ONLY
`property_suffixes` row for the Gradient-suffix family is
(css_property='background-image', suffix='Gradient', role='colour-gradient').
'background-color-gradient' is not a real CSS property and appears nowhere in
`property_suffixes` — a `block_attributes` row carrying it as its `css_property`
value can never be reached by either the declarative column-first route
(`declared_attrs_for_css_property`) or the suffix-name-guess loop
(`attr_for_layer_property`), because no real draft CSS declaration is ever
literally named 'background-color-gradient'. The attr was therefore
UNREACHABLE for any incoming `background-image` declaration, which is exactly
why the product-card trial variant's `background: linear-gradient(...)` never
lifted onto `backgroundColourGradient`.

This is paired with a companion fix in
`converter/services/root_supports.py::expand_background_border_shorthand`,
which previously dropped a `background: <gradient>` SHORTHAND outright instead
of expanding it to the `background-image` longhand (the shorthand never even
reached this attr's row, correctly labelled or not).

⚠ WIDER FINDING, NOT FIXED HERE (scope discipline — this migration is scoped
to closing Task 1b for sgs/product-card only, per THE-MIGRATION-METHOD.md's
detector-first rule; a >3-block class of defect needs its own census/migration
project, not a same-session bundle-in):
a repo-wide audit (2026-08-27) found the SAME synthetic-and-unreachable
css_property pattern on `backgroundColourGradient`/`backgroundColourHoverGradient`/
`backgroundColourScrolledGradient` for at least 8 other blocks (sgs/buybox,
sgs/icon-list, sgs/info-box, sgs/notice-banner, sgs/site-footer, sgs/site-header
x2, sgs/team-member, sgs/testimonial) all carrying 'background-color-gradient',
plus a much larger population of `textColourGradient`/`*BorderColourGradient`
attrs carrying 'color-gradient'/'border-color-gradient' — neither of which has
a `property_suffixes` row either. These are real, reachable-fix candidates but
are OUT OF SCOPE for this migration; flagged for a dedicated census-driven pass.

The JSON source `scripts/behavioural-analyser/css-property-classifications.json`
(the file `/sgs-update` re-derives this DB row from) is corrected in the SAME
commit as this migration, so a future reseed will not revert it.

Idempotent: re-running the UPDATE against an already-corrected row is a no-op.
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
           SET css_property = 'background-image'
         WHERE block_slug = 'sgs/product-card'
           AND attr_name  = 'backgroundColourGradient'
           AND css_property = 'background-color-gradient'
        """
    )
    affected = cur.rowcount
    conn.commit()
    conn.close()
    print(f"Updated css_property for {affected} sgs/product-card.backgroundColourGradient row(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
