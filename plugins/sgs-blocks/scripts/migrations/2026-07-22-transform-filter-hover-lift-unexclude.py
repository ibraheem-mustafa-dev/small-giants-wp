"""Migration: coupled UN-EXCLUDE + HOVER-LIFT for transform / filter / top / left
(Spec 31 §3.A steps 2, 4a, 8; R-31-1; R-31-9) — 2026-07-22.

## Context (audit findings this session)

`transform` and `filter` were recorded in `excluded_properties` as "no block
declares a consuming attr" (2026-07-04 + 2026-07-22 migrations). That was WRONG:
an audit found real consumers whose ATTR NAMES don't contain the CSS property
name, so a name-guessing check missed them:

  - `transform`  -> `scaleHover` on 10 blocks (button/card-grid/gallery/heading/
    icon/info-box/quote/team-member/testimonial/text) + `imageZoomHover` on
    card-grid/gallery/team-member/post-grid. Renders as `:hover{transform:
    scale(N)}` (verified render.php: button/card-grid/team-member all read
    scaleHover as a bare numeric scale factor / imageZoomHover as a bool).
  - `filter`     -> `grayscaleHover` on card-grid/gallery/info-box/team-member.
    Renders as `:hover{filter:grayscale(N)}`.
  - `top`/`left` -> `sgs/decorative-image.positionY`/`positionX` (already
    fully declared: css_property set, property_suffixes rows present, no
    seeding needed — the exclusion alone was blocking them).

Un-excluding `transform`/`filter` alone is NOT enough: their consumer attrs
(scaleHover et al.) are hover-ONLY destinations with NO un-suffixed base
sibling (there is no bare `scale`/`grayscale`/`imageZoom` attr — the effect
only ever exists as a `:hover` interaction), so the existing D309
`tier_state_suffix` base+Hover-suffix-append convention cannot resolve them.
This migration is the DB-seeding half of a COUPLED fix; the resolution-
mechanism half (`db_lookup.attr_for_state_property` + the `state_value_lift`
service + wiring into all 4 resolvers) landed in the same commit as this file
— un-excluding without the mechanism would turn every draft hover scale/zoom/
grayscale declaration into an UNACCOUNTED/routing-bug rather than a real
transfer or an honest gap, which would FAIL the coverage gate.

## What this migration does

1. UPDATE block_attributes: set css_property (+css_state='hover' where the
   attr already has NO un-suffixed base) on the 18 (block, attr) pairs listed
   in `_STATE_ATTR_UPDATES` below. This is the DB-immediate-effect twin of the
   reseed-durable `attr-classification-overrides.json` entries added in the
   SAME commit (18 entries, same slugs/attrs/fields) — mirrors the pattern the
   2026-06-26 testimonial-media-role-selector migration established ("the
   durable, reseed-surviving fix is the ATTR_CLASSIFICATION_OVERRIDES entry...
   This migration is the immediate-effect twin").
   sgs/post-grid.scaleHover is DELIBERATELY EXCLUDED from this list: its row
   carries css_element='card' (a per-item derived-selector attr, served by
   styling_content.py, not this base-domain resolver channel) AND a
   multi-property css_property ('background-color,transform') the exact-match
   base-domain query does not split — out of scope for this migration (a
   pre-existing, unrelated limitation of the comma-separated css_property
   convention, not something to paper over here).
2. DELETE FROM excluded_properties WHERE css_property IN
   ('transform','filter','top','left') — un-excludes all 4. `transition`,
   `position`, `overflow-x`, `overflow-y`, `right`, `bottom`, `inset`,
   `flex-grow`, `flex-shrink`, `flex-basis` remain excluded (genuinely zero
   consumers, unaffected by this migration).

## Idempotency

Every UPDATE is a plain column-set (safe to re-run — same values written
again); every DELETE is existence-gated implicitly (DELETE ... WHERE IN (...)
is a no-op once the rows are gone). Applies to BOTH DB copies (.claude and
.agents). R-31-1 (DB-first, no hardcoded dicts in pipeline scripts — the
routing DESTINATION is fully DB-resolved at runtime via
`attr_for_state_property`; only this one-time SEED list is a code constant,
same class as every prior dated migration in this directory).
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

# (block_slug, attr_name, {column: value, ...}) — mirrors the 18 entries added
# to attr-classification-overrides.json in this same commit. Only sets columns
# that were NULL before (css_property already 'transform' on 6 of the
# scaleHover rows via the derived classifier layer — css_state is the only
# NEW field for those; the other 12 rows need both fields).
_STATE_ATTR_UPDATES: list[tuple[str, str, dict]] = [
    ("sgs/button", "scaleHover", {"css_property": "transform", "css_state": "hover"}),
    ("sgs/card-grid", "scaleHover", {"css_state": "hover"}),
    ("sgs/gallery", "scaleHover", {"css_state": "hover"}),
    ("sgs/heading", "scaleHover", {"css_property": "transform", "css_state": "hover"}),
    ("sgs/icon", "scaleHover", {"css_state": "hover"}),
    ("sgs/info-box", "scaleHover", {"css_state": "hover"}),
    ("sgs/quote", "scaleHover", {"css_property": "transform", "css_state": "hover"}),
    ("sgs/team-member", "scaleHover", {"css_state": "hover"}),
    ("sgs/testimonial", "scaleHover", {"css_state": "hover"}),
    ("sgs/text", "scaleHover", {"css_property": "transform", "css_state": "hover"}),
    ("sgs/card-grid", "grayscaleHover", {"css_property": "filter", "css_state": "hover"}),
    ("sgs/gallery", "grayscaleHover", {"css_property": "filter", "css_state": "hover"}),
    ("sgs/info-box", "grayscaleHover", {"css_property": "filter", "css_state": "hover"}),
    ("sgs/team-member", "grayscaleHover", {"css_property": "filter", "css_state": "hover"}),
    # imageZoomHover applies to the INNER image (a per-item zoom on hover,
    # e.g. `.__item:hover .__image{transform:scale(1.1)}`), a DIFFERENT
    # element from scaleHover's card/root scale — css_element='image'
    # disambiguates the two (both share css_property=transform + css_state=
    # hover; without this they collide, F6 Check #1/#8 caught it live
    # 2026-07-22). This puts imageZoomHover OUTSIDE the root/self domain
    # `attr_for_state_property` resolves for, so it is an honest gap today
    # (no per-child-element routing built for it yet) rather than a wrong
    # value or an ambiguous pick.
    ("sgs/card-grid", "imageZoomHover", {"css_property": "transform", "css_state": "hover", "css_element": "image"}),
    ("sgs/gallery", "imageZoomHover", {"css_property": "transform", "css_state": "hover", "css_element": "image"}),
    ("sgs/team-member", "imageZoomHover", {"css_property": "transform", "css_state": "hover", "css_element": "image"}),
    ("sgs/post-grid", "imageZoomHover", {"css_property": "transform", "css_state": "hover", "css_element": "image"}),
]

_UNEXCLUDE_PROPERTIES = ("transform", "filter", "top", "left")


def migrate_db(db_path: Path) -> tuple[int, int]:
    """Run migration against one DB. Returns (attrs_updated, properties_unexcluded)."""
    if not db_path.exists():
        print(f"SKIP (not found): {db_path}")
        return 0, 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Idempotent column-add guard (css_state may not exist on an older DB copy —
    # mirrors sgs-update-v2.py's own idempotent-column-add pattern).
    existing_cols = {r[1] for r in cur.execute("PRAGMA table_info(block_attributes)").fetchall()}
    for col in ("css_property", "css_state"):
        if col not in existing_cols:
            cur.execute(f"ALTER TABLE block_attributes ADD COLUMN {col} TEXT")

    attrs_updated = 0
    for slug, attr, fields in _STATE_ATTR_UPDATES:
        set_clause = ", ".join(f"{col} = ?" for col in fields)
        params = list(fields.values()) + [slug, attr]
        cur.execute(
            f"UPDATE block_attributes SET {set_clause} "
            "WHERE block_slug = ? AND attr_name = ?",
            params,
        )
        if cur.rowcount:
            attrs_updated += cur.rowcount
        else:
            print(f"  WARNING: no row matched {slug}.{attr} — row missing from block_attributes")

    unexcluded = 0
    for prop in _UNEXCLUDE_PROPERTIES:
        cur.execute("DELETE FROM excluded_properties WHERE css_property = ?", (prop,))
        unexcluded += cur.rowcount

    conn.commit()
    conn.close()
    return attrs_updated, unexcluded


def main() -> int:
    for db_path in DBS:
        attrs_updated, unexcluded = migrate_db(db_path)
        print(
            f"{db_path.name} ({db_path.parent.parent.name}/{db_path.parent.name}): "
            f"{attrs_updated} attr rows updated, {unexcluded} excluded_properties rows removed"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
