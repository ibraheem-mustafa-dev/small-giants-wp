"""Migration: fix the `Rating` / `Speed` property_suffixes roles.

## The defect (measured 2026-08-01/02, read-only queries against the live DB)

`property_suffixes` held:

    ('Rating', 'number-css-px', css_property=None, notes='Rating sub-attribute (maxRating)')
    ('Speed',  'number-css-px', css_property=None, notes='Speed sub-attribute (animationSpeed, scrollSpeed)')

`number-css-px` is classified `styling-behaviour` in the `roles` table, so any
attribute whose name ends in `Rating` or `Speed` is EXCLUDED from the
converter's content-bearing allowlist (`converter/db/db_lookup.py:5012-5013`)
and mis-typed as a CSS pixel length that none of them actually are.

## `Speed` -> `behaviour`

Every `sgs/*` attribute ending in `Speed` (12 total, measured against the
live DB: `scrollSpeed`, `carouselSpeed` x2, `bgSvgAnimationSpeed` x4,
`svgAnimationSpeed`, `autoScrollSpeed`, `autoplaySpeed` x3) is a millisecond
TIMING value — never a CSS length, never content. `behaviour` is the
existing role used elsewhere in this table for non-CSS, non-content
configuration scalars (see the `Required`/`Placeholder`/`HelpText`/
`ErrorMessage` rows, all `role='behaviour'`, `css_property=NULL`). One
suffix rule correctly serves the whole population — no exceptions needed.

## `Rating` -> `behaviour` (REVISED from an earlier draft of this migration
## that mapped it to `rating` — see "Design history" below)

The full population reached by the `Rating` suffix is 4 attrs, not 3:

    sgs/star-rating.rating        <- the star/numeric rating VALUE ITSELF
                                      (the ONLY genuine content case)
    sgs/star-rating.maxRating     <- configuration: how many star SLOTS to render
    sgs/google-reviews.minRating  <- configuration: a numeric filter threshold
    sgs/testimonial.showRating    <- configuration: a boolean show/hide toggle

`behaviour` is correct for 3 of these 4 (`maxRating`, `minRating`,
`showRating` are all configuration, never their own displayed text). Only
`rating` is a genuine content-bearing display value — matching the existing
`rating` role's own exemplar, `sgs/testimonial.ratingStars` (registered by
`migrations/2026-06-21-register-rating-role.py`). Rather than bending the
suffix rule to fit the 1-in-4 minority case, the single exception is
declared in the hand-authored override layer
(`attr-classification-overrides.json`, entry `sgs/star-rating.rating` ->
`{"role": "rating"}`, added alongside this migration), which is applied
LAST by `_apply_attr_classification_overrides` (`sgs-update-v2.py:1789`)
and therefore wins over whatever the suffix table says. See that file's
`_doc` for the entry's own rationale note.

## Design history (why this migration changed shape)

An earlier draft of this migration mapped `Rating` -> `rating`
(content-bearing) as the common case and added two extra suffix rows
(`MaxRating`, `MinRating`) as longest-match exceptions to claw back the two
attrs that draft got wrong. That measured only 3 of the 4 attrs the suffix
actually reaches (missing `sgs/testimonial.showRating`) and needed
exceptions for the MAJORITY of its matches — the wrong shape for a rule
that is supposed to describe the common case. This revision inverts it:
`behaviour` is the correct default for 3 of 4, and the ONE true exception
(`rating` itself) is declared through the override layer instead of adding
more suffix rows.

## Verified but NOT changed by this migration: `sgs/testimonial.showRating`

`showRating` is a pre-existing GAP CANDIDATE, independent of the Rating/
Speed role question, and stays that way after this migration lands.
Verified directly against `assign-canonical.py`'s live behaviour (imported
read-only, no DB write, no `main()`/`run()` call): `resolve_canonical_slot`
finds no slot alias for the stem `show` (peeling the `Rating` suffix off
`showRating` leaves stem `show`; `'show' not in slot_map`), so
`canonical_slot` stays `NULL` for that row. The main backfill loop
(`assign-canonical.py:719-748`) only WRITES a role when `canonical_slot` is
resolved — when it isn't, the row is filed as a gap candidate and `role`
stays untouched (currently `NULL`). This is true BEFORE and AFTER this
migration: changing what `Rating` maps to cannot change whether `show`
matches a slot alias. `showRating`'s role will stay `NULL` (a legitimate gap
candidate, not a mis-classification either way) until a `show`/`showRating`
slot alias is added — a separate, unrelated fix, out of scope here.

## Verified: which of the other 3 non-`rating` attrs THIS migration actually
## changes in `block_attributes.role`

`minRating`, `maxRating`, and all 3 `autoplaySpeed` rows already have a
populated `canonical_slot` (`min`, `max`, `autoplaySpeed` respectively —
confirmed live), so they are in scope for
`refresh_stale_suffix_roles`/`resolve_role_with_healing`
(`assign-canonical.py:513,550`), which re-derives `role` from the CURRENT
`property_suffixes` table for exactly this class of row. The other 9
`Speed`-suffixed attrs (`scrollSpeed`, `carouselSpeed` x2,
`bgSvgAnimationSpeed` x4, `svgAnimationSpeed`, `autoScrollSpeed`) currently
have `canonical_slot IS NULL` — verified none of their post-peel stems
(`scroll`, `carousel`, `bgSvgAnimation`, `svgAnimation`, `autoScroll`) match
a `slots` alias, so — like `showRating` above — they are gap candidates
whose `role` is never written by either the main loop or the healing pass
(the healing pass's own guard is `WHERE canonical_slot IS NOT NULL`). This
migration does NOT heal those 9 rows; they remain gap candidates pending a
separate slot-alias fix.

## Idempotency

Every UPDATE is value-gated: re-running against a DB where the fix already
landed is a no-op. Applies to BOTH DB copies (.claude and .agents), per the
`2026-07-04-property-suffixes-flex-item-props.py` precedent.

Run manually (`/sgs-update` does NOT auto-run migrations):

    python plugins/sgs-blocks/scripts/migrations/2026-08-01-rating-speed-suffix-role.py

Do NOT run from an agent session sharing this DB with a co-active track —
the orchestrator runs this during a single controlled reseed.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

# ---------------------------------------------------------------------------
# UPDATE_ROWS — reclassify existing suffix rows.
# Each tuple: (suffix, from_role, to_role)
# ---------------------------------------------------------------------------

UPDATE_ROWS: list[tuple[str, str, str]] = [
    ("Rating", "number-css-px", "behaviour"),
    ("Speed", "number-css-px", "behaviour"),
]


def migrate_db(db_path: Path) -> tuple[int, int]:
    """Run migration against one DB. Returns (updated, skipped)."""
    if not db_path.exists():
        print(f"SKIP (not found): {db_path}")
        return 0, 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    updated = 0
    skipped = 0

    for suffix, from_role, to_role in UPDATE_ROWS:
        cur.execute(
            "UPDATE property_suffixes SET role = ? WHERE suffix = ? AND role = ?",
            (to_role, suffix, from_role),
        )
        if cur.rowcount:
            updated += cur.rowcount
        else:
            skipped += 1

    conn.commit()
    rows = cur.execute(
        "SELECT suffix, role FROM property_suffixes WHERE suffix IN ('Rating', 'Speed')"
    ).fetchall()
    conn.close()
    print(f"  post-migration state: {rows}")
    return updated, skipped


def main() -> int:
    for db_path in DBS:
        updated, skipped = migrate_db(db_path)
        print(
            f"{db_path.name} ({db_path.parent.parent.name}/{db_path.parent.name}): "
            f"updated {updated} (skipped {skipped}, already-correct-or-absent) "
            f"(idempotent: re-runs are no-ops)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
