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

ROUTING IS ONLY HALF OF IT (2026-09-06, review of `fe387139a`). A ROUTED
attribute is still inert when the VALUE SHAPE the converter would write can
never canonically equal the stored one, because `_composition_attr_score`
compares them with a single exact string equality. The measured case is a
TIER-SHAPED object attr (Spec 35 Phase 1.4): `converter/resolvers/
styling_content.py` gates on `db_lookup.tier_object_base()` and accumulates
into `lifted[attr][tier_key]`, so a real clone writes `{"desktop": 64}` — which
can never equal the flat `64` a seeder copied out of `variations.js`. That is
this project's own `object-typed-attr-coerces-flat-to-default` lesson arriving
through the discriminator table. The first version of this check asked only the
routing question, and its own `fix` text named the missing condition in prose
("confirming the CSS value shape the converter would write actually matches
what the attribute stores") while nothing enforced it. Both halves are now
enforced.

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

THE RULE (two conditions, both required)
----------------------------------------------------------------------------
For every row in `variant_composition_attr_slots`:

  1. ROUTING — the referenced `(child_slug, child_attr_name)` MUST have a
     `block_attributes` row with at least one of `css_property` /
     `css_element` non-NULL.
  2. VALUE SHAPE — when that attribute is a TIER-OBJECT BASE (the SQL mirror
     of `converter/db/db_lookup.py::tier_object_base`), `child_attr_value`
     MUST itself be a JSON object. A flat scalar there is unwritable.

Condition 2 is deliberately NARROW: it asserts the one incompatibility
derivable from the schema alone, which is also the one with a measured victim.
It does not model the converter's value NORMALISATION (a `font-size` of `64`
may be written `"64px"` depending on the draft's own CSS text) — that is not
decidable from the DB, so a passing row is "not proven unmatchable", never
"proven matchable".

TWO DEFENCES, ON PURPOSE
----------------------------------------------------------------------------
`sgs-update-v2.py`'s `_populate_variant_composition_attr_slots()` applies the
SAME combined predicate (`_child_attr_is_observable`, built from
`_child_attr_has_css_routing` + `_child_attr_value_shape_matches`) at seed time
and skips — loudly, by name, with the reason — any discriminating triple that
fails it, so the derived path cannot create an inert row in the first place.
This check is the backstop for every OTHER route into the table: a hand-written
row, a routing declaration removed from a child block.json without a Stage-1
reseed, an attribute migrated to a tier object after its discriminator was
seeded, or a future writer that forgets the predicate. Prevention and detection
are not duplicates here; the seeder cannot see a row it did not write.
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, inert_composition_attr_key

# Mirrors `converter/db/db_lookup.py::_TIER_SIBLING_SUFFIX_RE` — a name that IS
# a tier sibling is never a tier BASE.
_TIER_SIBLING_SUFFIX_RE = re.compile(r"(Tablet|Mobile|Desktop)$")


def _is_tier_object(conn: sqlite3.Connection, child_slug: str, attr_name: str) -> bool:
    """SQL mirror of `converter/db/db_lookup.py::tier_object_base`.

    THE AUTHORITY IS that function; this is a duplicate because the
    db-consistency package shares no import with the converter package, and
    importing `converter/db/db_lookup.py` runs six schema MIGRATIONS against
    the shared live DB as an import side effect — unacceptable inside a
    read-only integrity check. Four conditions, identical and in the same
    order. `sgs-update-v2.py::_child_attr_is_tier_object` is the third copy
    (the seed-time half of this rule); change all three together.
    """
    if _TIER_SIBLING_SUFFIX_RE.search(attr_name):
        return False
    row = conn.execute(
        "SELECT attr_type, box_family FROM block_attributes "
        "WHERE block_slug = ? AND attr_name = ?",
        (child_slug, attr_name),
    ).fetchone()
    if not row or row[0] != "object" or row[1]:
        return False
    sibling = conn.execute(
        "SELECT 1 FROM block_attributes "
        "WHERE block_slug = ? AND attr_name IN (?, ?) LIMIT 1",
        (child_slug, attr_name + "Tablet", attr_name + "Mobile"),
    ).fetchone()
    return sibling is None


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #11 (inert child-attribute discriminator) against the live DB.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation]  — empty when every `variant_composition_attr_slots` row
    names a child attribute that carries CSS routing AND stores a value in a
    shape a real clone's extraction could actually write.
    """
    violations: list[Violation] = []

    try:
        rows = conn.execute(
            "SELECT block_slug, variant_value, child_slug, child_attr_name, child_attr_value "
            "FROM variant_composition_attr_slots "
            "ORDER BY block_slug, variant_value, child_slug, child_attr_name"
        ).fetchall()
    except sqlite3.OperationalError:
        # Pre-migration DB (table not created yet) — nothing to check, and an
        # absent table is not an integrity violation. Same soft-fail shape as
        # check_variants.py's read of this table.
        return violations

    for block_slug, variant_value, child_slug, child_attr_name, child_attr_value in rows:
        declared = conn.execute(
            "SELECT css_property, css_element FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ? LIMIT 1",
            (child_slug, child_attr_name),
        ).fetchone()

        routed = declared is not None and (
            declared[0] is not None or declared[1] is not None
        )

        # CONDITION 2 — value shape. Only meaningful once the attribute is
        # declared; an undeclared attr is already condition-1 inert.
        shape_broken = False
        if declared is not None and _is_tier_object(conn, child_slug, child_attr_name):
            try:
                shape_broken = not isinstance(json.loads(child_attr_value), dict)
            except (TypeError, ValueError):
                # `_canon_slot_value`'s `repr()` fallback — not JSON, so not
                # the `{desktop,tablet,mobile}` object a tier write produces.
                shape_broken = True

        if routed and not shape_broken:
            continue  # observable — routed, and the shapes can actually meet

        undeclared = declared is None
        child_file_slug = child_slug.replace("sgs/", "")

        if shape_broken:
            cause = (
                f"is a TIER-SHAPED object attr ({{desktop,tablet,mobile}}, Spec 35 "
                f"Phase 1.4) while the discriminator stores the flat value "
                f"{child_attr_value}. A real clone's extraction "
                f"(converter/resolvers/styling_content.py, gated on "
                f"db_lookup.tier_object_base) always writes a tier OBJECT, e.g. "
                f"{{\"desktop\": ...}} — and _composition_attr_score compares with a "
                f"single exact string equality, so these two can never match"
            )
        elif undeclared:
            cause = "has NO block_attributes row at all"
        else:
            cause = (
                "has NEITHER css_property NOR css_element populated on its "
                "block_attributes row, so no draft CSS declaration can ever "
                "resolve to it"
            )

        if shape_broken:
            remedy = (
                f"Re-seed from a tier-shaped authored value: {child_slug}."
                f"{child_attr_name} is an object attr, so the variation should "
                f"author it as {{ desktop: ..., mobile: ... }} in "
                f"src/blocks/{block_slug.replace('sgs/', '')}/variations.js "
                f"(a flat value is silently coerced to the default by WordPress "
                f"too — the same object-typed-attr-coerces-flat-to-default "
                f"failure). Then re-run"
            )
        else:
            remedy = (
                f"Either (a) give {child_slug}.{child_attr_name} real CSS routing — add "
                f"the property to the owning element's attrMap in "
                f"src/blocks/{child_file_slug}/block.json "
                f"(supports.sgs.elements.<element>.attrMap, e.g. "
                f"\"css:<property>\": \"{child_attr_name}\"), confirming the CSS value "
                f"shape the converter would write actually matches what the attribute "
                f"stores — or (b) accept that this attribute cannot carry the signal and "
                f"let the seeder drop it. Then re-run"
            )

        violations.append(Violation(
            check="inert_composition_attr",
            block=block_slug,
            detail=(
                f"{block_slug} variant '{variant_value}' is discriminated by the nested "
                f"child attribute {child_slug}.{child_attr_name}, but that attribute "
                f"{cause}. The row scores 0 on every clone forever, while "
                f"still counting as part of this block's discriminating signature in "
                f"Check #3, which therefore stops reporting the collision. An inert "
                f"discriminator is worse than an absent one."
            ),
            fix=(
                f"{remedy}: python "
                f"plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
            ),
            key=inert_composition_attr_key(
                block_slug, variant_value, child_slug, child_attr_name
            ),
        ))

    return violations
