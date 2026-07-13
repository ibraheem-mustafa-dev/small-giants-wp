#!/usr/bin/env python3
"""seed-composition-roles.py — idempotent corrections to block_composition.composition_role.

The block_composition table (D108) seeds each block's composition_role
(section-root | wrapper-shell | content-block | leaf). A few rows were seeded
before the FR-22-6 InnerBlocks migration (2026-05-31) and no longer reflect the
block's real shape. The modular converter (converter.db.db_lookup) reads
composition_role to decide leaf-text-lifting and the wrapper-to-leaf container
guard, so these must be correct or content renders empty / mis-routes.

There is no derive-from-code populator for composition_role (it is seed data),
so this script is the reproducible source of truth for the corrections. It is
idempotent — safe to re-run. Run after any DB rebuild that resets block_composition.

NOTE — has_inner_blocks responsibility RETIRED TWICE:
  (2026-06-12) The canonical has_inner_blocks derivation moved to
  sgs-update-v2.py's _populate_has_inner_blocks Stage-1 sub-step, replacing
  the three manual dicts that used to live here.
  (EXECUTION Step 16, 2026-07-05) block_composition.has_inner_blocks the
  COLUMN is dropped entirely (migration
  2026-07-05-drop-has-inner-blocks-column.py); has_inner_blocks is now
  derived FRESH at convert-time by converter.services.has_inner
  .derive_delegates_content (the AND rule: save emits InnerBlocks.Content
  AND render.php consumes $content non-trivially) — never a cached column,
  never a seed-script override dict, anywhere.

Corrections (2026-05-31):
  - sgs/testimonial         leaf -> content-block  (now echoes $content; holds star-rating + text children)
  - sgs/testimonial-slider  leaf -> content-block  (now iterates inner_blocks; holds sgs/testimonial children)
  - sgs/label               content-block -> leaf  (eyebrow text primitive; renders from scalar `text` attr,
                                                     no block children — so G1 lifts its text into the attr)

Corrections (2026-06-02, Workstream A — D150):
  - sgs/post-grid           leaf -> content-block  (genuine grid container with layout + columns attrs;
                                                     mis-tagged leaf before the container-bearing audit)
  - sgs/gallery             leaf -> content-block  (genuine grid container with images array + layout attrs)
  - sgs/card-grid           leaf -> content-block  (genuine grid container with items array + columns attrs)

  SAFETY NOTE: these 3 blocks are NOT present in the Mama's Munches canary mockup (verified by the
  council prior to D150). The walker leaf-guard at convert.py ~1989/2061/2847 reads composition_role,
  so the flip has zero canary impact. Gate any future mockup that uses these blocks.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Canonical SGS DB (hard-linked between ~/.agents and ~/.claude — same physical file).
DB_PATH = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

CORRECTIONS: dict[str, str] = {
    "sgs/testimonial": "content-block",
    "sgs/testimonial-slider": "content-block",
    "sgs/label": "leaf",
    # Workstream A (D150, 2026-06-02) — genuine grid containers mis-tagged as leaf:
    "sgs/post-grid": "content-block",
    "sgs/gallery": "content-block",
    "sgs/card-grid": "content-block",
    # FR-24-15 (Phase D, 2026-06-02) — option-picker renders from optionItems array,
    # not from InnerBlocks children.  The converter uses G3 (has_inner_blocks=0) to
    # suppress child recursion and calls _atomic_attrs_for to extract the items array.
    # composition_role stays content-block (not leaf) so the misresolution guard
    # (which fires for leaf + sgs-classed children) does NOT trigger.
    "sgs/option-picker": "content-block",
    # Workstream A completion (2026-07-03) — the remaining typed-array content
    # containers D150 missed. Each is has_inner_blocks=0 and renders from a
    # content-role ARRAY attr (plans/items/logos/steps/entries), exactly like
    # card-grid/post-grid/gallery/option-picker above. Left as 'leaf' they trip
    # convert.py's is_leaf text-fallback (line 4627 → _atomic_attrs_for
    # allow_text_fallback=True → line 3776), which dumps _rich_text_content(node)
    # of the whole container into the FIRST content/text-content STRING attr —
    # e.g. pricing-table's __inner tiers landing in `popularBadgeText`. Reclassifying
    # to content-block routes them through the G3 branch (allow_text_fallback=False),
    # a strict no-op that matches the conformance golden. tier='block' so the F6
    # tier↔composition_role gate is unaffected; none appear in the Mama's draft
    # (zero canary impact, same as the D150 trio).
    "sgs/pricing-table": "content-block",
    "sgs/icon-list": "content-block",
    "sgs/brand-strip": "content-block",
    "sgs/process-steps": "content-block",
    "sgs/timeline": "content-block",
}

# ---------------------------------------------------------------------------
# HAS_INNER_BLOCKS_OVERRIDES — REMOVED (EXECUTION Step 16, 2026-07-05).
#
# block_composition.has_inner_blocks itself is DROPPED (migration
# 2026-07-05-drop-has-inner-blocks-column.py). has_inner_blocks is now derived
# FRESH at convert-time by converter.services.has_inner.derive_delegates_content
# (the AND rule: save.js/index.js emits <InnerBlocks.Content AND render.php
# consumes $content/$block->inner_blocks non-trivially) — never a cached
# column or a manual override dict anywhere (Spec 31 §12.7). This dict + its
# apply loop are removed; there is no column left to override.
# ---------------------------------------------------------------------------

# Slug RENAMES (2026-06-02, Workstream A — D150). The block_composition table
# carries the pre-D123 slug `sgs/trust-badges`; the block was renamed to
# `sgs/trust-bar`. Rename the row (preserving its composition_role).
# has_inner_blocks is no longer a column on this table (dropped Step 16) — it
# is derived fresh at convert-time for sgs/trust-bar like every other block.
# Idempotent: only renames when the old row exists and the new one does not.
RENAMES: dict[str, str] = {
    "sgs/trust-badges": "sgs/trust-bar",
}

# Fresh INSERTS (2026-06-02, Workstream A — D150). Blocks added after the
# block_composition table was seeded (D108, 188 rows) and therefore missing a
# row. Without a row, sync-container-wrapping-blocks.py --apply silently skips
# them. Values derived from each block's block.json + roster KIND (R-22-1).
# Idempotent: only inserts when the row is absent.
#
# has_inner_blocks is NOT a column any more (dropped EXECUTION Step 16,
# 2026-07-05) — every block's delegates-content fact is derived fresh at
# convert-time; nothing to seed here.
INSERTS: list[dict] = [
    {
        "block_slug": "sgs/option-picker",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # Added 2026-06-04 — the 29th container-roster block (layout KIND).
        # Query-driven grid (own WP_Query renders Bound product-cards server-side,
        # NO InnerBlocks) → matches its layout-grid peers post-grid/card-grid/gallery.
        # wraps_block + container_kind='layout' are set by
        # sync-container-wrapping-blocks.py --apply.
        "block_slug": "sgs/content-collection",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    # Catalogue-gap blocks (missing block_composition rows, not container-bearing).
    {
        "block_slug": "sgs/buybox",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/cart",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/collapsible-text",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/filter-search",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/product-search",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/audio (2026-07-03) — standalone audio player, 7 style variants.
        # Not a container; content-block like the standalone content blocks above.
        "block_slug": "sgs/audio",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/site-header (2026-07-13, Spec 17 §S9 / FR-S9-2, D323) — section-KIND
        # header shell; mirrors cta-section/hero (section-root). wraps_block +
        # container_kind='section' are set by sync-container-wrapping-blocks.py --apply.
        "block_slug": "sgs/site-header",
        "wraps_block": None,
        "composition_role": "section-root",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/site-header-row (2026-07-13, Spec 17 §S9 / FR-S9-7) — layout-KIND
        # never-overflow cluster row; mirrors card-grid/feature-grid (content-block).
        "block_slug": "sgs/site-header-row",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/adaptive-nav (2026-07-13, Spec 17 §S9 / FR-S9-4) — layout-KIND nav
        # container; renders the desktop bar from one wp_navigation source + collapses
        # to the drawer. Replaces core/navigation in the header. Mirrors
        # site-header-row (content-block). wraps_block + container_kind='layout' set
        # by sync-container-wrapping-blocks.py --apply.
        "block_slug": "sgs/adaptive-nav",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/site-footer (2026-07-13, Spec 17 §S9 / FR-S9-3, D325) — section-KIND
        # footer shell; mirrors site-header (section-root). wraps_block +
        # container_kind='section' are set by sync-container-wrapping-blocks.py --apply.
        "block_slug": "sgs/site-footer",
        "wraps_block": None,
        "composition_role": "section-root",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/site-footer-row (2026-07-13, Spec 17 §S9 / FR-S9-3, D325) — layout-KIND
        # column-grid / cluster footer row; mirrors site-header-row (content-block).
        "block_slug": "sgs/site-footer-row",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
]


def main() -> int:
    if not DB_PATH.exists():
        print(f"[seed-composition-roles] DB not found: {DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()
    changed = 0

    # 1. Slug RENAMES (idempotent — only when old row exists and new does not).
    #    has_inner_blocks is not a block_composition column any more (dropped
    #    EXECUTION Step 16) — nothing to set here for the renamed target.
    for old_slug, new_slug in RENAMES.items():
        old = cur.execute(
            "SELECT 1 FROM block_composition WHERE block_slug = ?", (old_slug,)
        ).fetchone()
        new = cur.execute(
            "SELECT 1 FROM block_composition WHERE block_slug = ?", (new_slug,)
        ).fetchone()
        if new is not None:
            print(f"  [ok]   rename {old_slug} -> {new_slug}: target already present")
            continue
        if old is None:
            print(f"  [skip] rename {old_slug} -> {new_slug}: source row absent")
            continue
        cur.execute(
            "UPDATE block_composition SET block_slug = ? WHERE block_slug = ?",
            (new_slug, old_slug),
        )
        print(f"  [set]  rename {old_slug} -> {new_slug}")
        changed += cur.rowcount

    # 1b. HAS_INNER_BLOCKS_OVERRIDES step REMOVED (EXECUTION Step 16) — the
    #     column it wrote no longer exists.

    # 2. Fresh INSERTS (idempotent — only when the row is absent).
    for spec in INSERTS:
        slug = spec["block_slug"]
        exists = cur.execute(
            "SELECT 1 FROM block_composition WHERE block_slug = ?", (slug,)
        ).fetchone()
        if exists is not None:
            print(f"  [ok]   insert {slug}: row already present")
            continue
        cur.execute(
            "INSERT INTO block_composition "
            "(block_slug, wraps_block, composition_role, accepts_allowed_blocks) "
            "VALUES (?, ?, ?, ?)",
            (
                slug,
                spec.get("wraps_block"),
                spec["composition_role"],
                spec.get("accepts_allowed_blocks"),
            ),
        )
        changed += cur.rowcount
        print(f"  [set]  insert {slug}: {spec['composition_role']}")

    # 3. composition_role corrections.
    for slug, role in CORRECTIONS.items():
        cur.execute(
            "SELECT composition_role FROM block_composition WHERE block_slug = ?",
            (slug,),
        )
        row = cur.fetchone()
        if row is None:
            print(f"  [skip] {slug}: no block_composition row")
            continue
        if row[0] == role:
            print(f"  [ok]   {slug}: already {role}")
            continue
        cur.execute(
            "UPDATE block_composition SET composition_role = ? WHERE block_slug = ?",
            (role, slug),
        )
        changed += cur.rowcount
        print(f"  [set]  {slug}: {row[0]} -> {role}")
    con.commit()
    con.close()
    print(f"[seed-composition-roles] done: {changed} row(s) corrected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
