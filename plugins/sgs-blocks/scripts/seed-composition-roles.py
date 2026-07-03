#!/usr/bin/env python3
"""seed-composition-roles.py — idempotent corrections to block_composition.composition_role.

The block_composition table (D108) seeds each block's composition_role
(section-root | wrapper-shell | content-block | leaf). A few rows were seeded
before the FR-22-6 InnerBlocks migration (2026-05-31) and no longer reflect the
block's real shape. The converter_v2 walker reads composition_role to decide
leaf-text-lifting (G1) and the wrapper-to-leaf container guard (G2), so these
must be correct or content renders empty / mis-routes.

There is no derive-from-code populator for composition_role (it is seed data),
so this script is the reproducible source of truth for the corrections. It is
idempotent — safe to re-run. Run after any DB rebuild that resets block_composition.

NOTE — has_inner_blocks responsibility RETIRED (2026-06-12):
  The canonical has_inner_blocks derivation now lives in sgs-update-v2.py
  (_populate_has_inner_blocks sub-step of Stage 1). The three manual dicts that
  used to live here (HAS_INNER_BLOCKS, RENAME_HAS_INNER_BLOCKS,
  ENFORCE_HAS_INNER_BLOCKS) have been retired. They are replaced by the
  HAS_INNER_BLOCKS_OVERRIDES dict below (start EMPTY). The AND rule
  (save emits InnerBlocks.Content AND render.php consumes $content non-trivially)
  is self-correcting — no overrides are needed unless a block has a genuine
  structural reason to diverge from the derived value (document with a D-number).

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
# HAS_INNER_BLOCKS_OVERRIDES — start EMPTY.
#
# has_inner_blocks is now auto-derived by sgs-update-v2.py Stage 1 sub-step B
# (_populate_has_inner_blocks) using the AND rule:
#   1 IFF save.js/index.js emits <InnerBlocks.Content (non-comment, not
#   deprecated.js) AND render.php consumes $content/$block->inner_blocks
#   non-trivially.
#
# The AND rule is self-correcting — a typed leaf that still carries an old
# save marker but ignores $content in render.php correctly derives to 0,
# preventing the D212 testimonial-empty class of bug.
#
# ⛔ CANONICAL OVERRIDE HOME = sgs-update-v2.py `HAS_INNER_BLOCKS_OVERRIDES`
# (mirrored in check-composition-sync.py). Add real overrides THERE, not here —
# Stage 1 (_populate_has_inner_blocks) is the path /sgs-update always runs, and a
# second dict here would drift (the exact failure WS-B exists to remove). This
# dict stays EMPTY; the loop below is a harmless no-op kept only for structural
# symmetry with the rename step.
# ---------------------------------------------------------------------------
HAS_INNER_BLOCKS_OVERRIDES: dict[str, int] = {
    # Intentionally empty — canonical overrides live in sgs-update-v2.py.
}

# Slug RENAMES (2026-06-02, Workstream A — D150). The block_composition table
# carries the pre-D123 slug `sgs/trust-badges`; the block was renamed to
# `sgs/trust-bar`. Rename the row (preserving its composition_role).
# has_inner_blocks for sgs/trust-bar is now derived automatically by Stage 1
# sub-step B (save returns null → no InnerBlocks marker → derived=0). The rename
# here only fires when the old row exists and the new one does not; subsequent
# runs converge via the auto-derive, not a manual enforce dict.
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
# NOTE on has_inner_blocks in INSERTS: the value seeded here is a bootstrap
# placeholder. sgs-update-v2.py Stage 1 sub-step B (_populate_has_inner_blocks)
# will auto-correct it on the next run using the AND rule. Use 0 as the safe
# placeholder for new inserts unless the block obviously needs 1 to function
# before the next sgs-update run.
#
#   sgs/option-picker — CONTENT-kind, save.js returns null (no InnerBlocks);
#                       has_inner_blocks=0 (auto-derive will confirm this).
# NOTE: sgs/cart/collapsible-text/filter-search/product-search are also missing
# rows. They are NOT container-bearing (not in the 28-block roster), so they do
# not block --apply. Added here so the DB is complete. All derive to 0.
# NOTE: sgs/buybox — catalogue gap; save.js returns null → derives 0.
INSERTS: list[dict] = [
    {
        "block_slug": "sgs/option-picker",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 0,  # auto-derive confirms 0 (save returns null)
        "accepts_allowed_blocks": None,
    },
    {
        # Added 2026-06-04 — the 29th container-roster block (layout KIND).
        # Query-driven grid (own WP_Query renders Bound product-cards server-side,
        # NO InnerBlocks) → matches its layout-grid peers post-grid/card-grid/gallery
        # (composition_role='content-block', has_inner_blocks=0). wraps_block +
        # container_kind='layout' are set by sync-container-wrapping-blocks.py --apply.
        "block_slug": "sgs/content-collection",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 0,  # auto-derive confirms 0 (no InnerBlocks)
        "accepts_allowed_blocks": None,
    },
    # Catalogue-gap blocks (missing block_composition rows, not container-bearing).
    # has_inner_blocks=0 for all — auto-derive confirms (save returns null for each).
    {
        "block_slug": "sgs/buybox",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 0,
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/cart",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 0,
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/collapsible-text",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 0,
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/filter-search",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 0,
        "accepts_allowed_blocks": None,
    },
    {
        "block_slug": "sgs/product-search",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 0,
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
    #    has_inner_blocks for the renamed target is left to the auto-derive in
    #    sgs-update-v2.py Stage 1 sub-step B; no manual value is set here.
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

    # 1b. HAS_INNER_BLOCKS_OVERRIDES — apply after the rename so the target slug
    #     exists. Idempotent: UPDATE only when the stored value differs. Normally
    #     empty — the AND rule in sgs-update-v2.py makes manual overrides
    #     unnecessary. Only add entries with a D-number comment.
    for slug, want in HAS_INNER_BLOCKS_OVERRIDES.items():
        row = cur.execute(
            "SELECT has_inner_blocks FROM block_composition WHERE block_slug = ?", (slug,)
        ).fetchone()
        if row is None:
            print(f"  [skip] override {slug}: no block_composition row")
            continue
        if row[0] != want:
            cur.execute(
                "UPDATE block_composition SET has_inner_blocks = ? WHERE block_slug = ?",
                (want, slug),
            )
            changed += cur.rowcount
            print(f"  [set]  override {slug} has_inner_blocks={want} (was {row[0]})")
        else:
            print(f"  [ok]   override {slug} has_inner_blocks={want}: already correct")

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
            "(block_slug, wraps_block, composition_role, has_inner_blocks, accepts_allowed_blocks) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                slug,
                spec.get("wraps_block"),
                spec["composition_role"],
                spec["has_inner_blocks"],
                spec.get("accepts_allowed_blocks"),
            ),
        )
        changed += cur.rowcount
        print(f"  [set]  insert {slug}: {spec['composition_role']} (has_inner_blocks={spec['has_inner_blocks']})")

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
