"""check_inert_composition_attr.py — Check #11: inert child-attribute discriminator.

Spec ref: variant-composition-fingerprinting plan (2026-09-05), task-5 review
finding "Important #1" (2026-09-06).

WHY THIS EXISTS
----------------------------------------------------------------------------
`variant_composition_attr_slots` (the tier-2 composition signal — a nested
CHILD block's own attribute VALUE) resolves a variant collision only if the
converter can actually OBSERVE that child attribute on a real clone. Observing
it means the draft's CSS declaration resolves to it through the Front-1
declarative routing columns on `block_attributes` (`css_property` /
`css_element`, Spec 31 §3.A/§4).

A row whose child attribute has NEITHER column populated is INERT: nothing a
draft can contain will ever set that attribute, so the row scores 0 on every
clone forever. It is worse than absent, because Check #3 (variant discriminator
collision) treats the row as part of the block's discriminating signature and
therefore STOPS reporting the collision — a green gate over a signal that can
never fire.

That is not hypothetical. The mechanism `variant_composition_attr_slots` was
built for was described as being carried by `sgs/nav-menu`'s `listColumns`
(a real, rendered responsive `grid-template-columns` rule — nav-menu/render.php).
`listColumns` has no routing row, so on a real draft clone it can never be
extracted; the mechanism worked in testing only because ONE other attribute on
the same child (`itemFontSize`) happens to be routable and carried the
discrimination instead. Nothing in the suite said so. Applying this check's rule
to the seeded rows also surfaced a second, unrelated inert value on the same
block: `itemFontSizeMobile` is not a declared `sgs/nav-menu` attribute at all
(`itemFontSize` migrated to a tier OBJECT), so three variants were being
"discriminated" by a value WordPress discards.

THE RULE
----------------------------------------------------------------------------
For every row in `variant_composition_attr_slots`, the referenced
`(child_slug, child_attr_name)` MUST have a `block_attributes` row with at
least one of `css_property` / `css_element` non-NULL.

TWO DEFENCES, ON PURPOSE
----------------------------------------------------------------------------
`sgs-update-v2.py`'s `_populate_variant_composition_attr_slots()` applies the
SAME predicate (`_child_attr_has_css_routing`) at seed time and skips — loudly,
by name — any discriminating triple that fails it, so the derived path cannot
create an inert row in the first place. This check is the backstop for every
OTHER route into the table: a hand-written row, a routing declaration removed
from a child block.json without a Stage-1 reseed, or a future writer that
forgets the predicate. Prevention and detection are not duplicates here; the
seeder cannot see a row it did not write.
"""
from __future__ import annotations

import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, inert_composition_attr_key


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #11 (inert child-attribute discriminator) against the live DB.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation]  — empty when every `variant_composition_attr_slots` row
    names a child attribute that carries CSS routing.
    """
    violations: list[Violation] = []

    try:
        rows = conn.execute(
            "SELECT block_slug, variant_value, child_slug, child_attr_name "
            "FROM variant_composition_attr_slots "
            "ORDER BY block_slug, variant_value, child_slug, child_attr_name"
        ).fetchall()
    except sqlite3.OperationalError:
        # Pre-migration DB (table not created yet) — nothing to check, and an
        # absent table is not an integrity violation. Same soft-fail shape as
        # check_variants.py's read of this table.
        return violations

    for block_slug, variant_value, child_slug, child_attr_name in rows:
        declared = conn.execute(
            "SELECT css_property, css_element FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ? LIMIT 1",
            (child_slug, child_attr_name),
        ).fetchone()

        if declared is not None and (declared[0] is not None or declared[1] is not None):
            continue  # routable — the converter can populate it from draft CSS

        undeclared = declared is None
        child_file_slug = child_slug.replace("sgs/", "")
        violations.append(Violation(
            check="inert_composition_attr",
            block=block_slug,
            detail=(
                f"{block_slug} variant '{variant_value}' is discriminated by the nested "
                f"child attribute {child_slug}.{child_attr_name}, but that attribute "
                + (
                    f"has NO block_attributes row at all"
                    if undeclared else
                    f"has NEITHER css_property NOR css_element populated on its "
                    f"block_attributes row"
                )
                + f" — so no draft CSS declaration can ever resolve to it and a clone "
                f"can never populate it. The row scores 0 on every clone forever, while "
                f"still counting as part of this block's discriminating signature in "
                f"Check #3, which therefore stops reporting the collision. An inert "
                f"discriminator is worse than an absent one."
            ),
            fix=(
                f"Either (a) give {child_slug}.{child_attr_name} real CSS routing — add "
                f"the property to the owning element's attrMap in "
                f"src/blocks/{child_file_slug}/block.json "
                f"(supports.sgs.elements.<element>.attrMap, e.g. "
                f"\"css:<property>\": \"{child_attr_name}\"), confirming the CSS value "
                f"shape the converter would write actually matches what the attribute "
                f"stores — or (b) accept that this attribute cannot carry the signal and "
                f"let the seeder drop it. Then re-run: python "
                f"plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
            ),
            key=inert_composition_attr_key(
                block_slug, variant_value, child_slug, child_attr_name
            ),
        ))

    return violations
