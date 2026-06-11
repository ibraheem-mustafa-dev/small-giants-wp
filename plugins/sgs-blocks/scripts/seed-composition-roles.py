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
}

# Blocks whose content-block role implies inner blocks; keep has_inner_blocks in sync.
HAS_INNER_BLOCKS = {
    "sgs/testimonial": 1,
    "sgs/testimonial-slider": 1,
    "sgs/label": 0,
    # post-grid / gallery / card-grid render from PHP (no InnerBlocks slot);
    # has_inner_blocks stays 0 — the walker must not recurse into them.
    "sgs/post-grid": 0,
    "sgs/gallery": 0,
    "sgs/card-grid": 0,
    # option-picker: G3 gate suppresses child recursion; items extracted via
    # _atomic_attrs_for in the G3-attrs path (convert.py).
    "sgs/option-picker": 0,
}

# Slug RENAMES (2026-06-02, Workstream A — D150). The block_composition table
# carries the pre-D123 slug `sgs/trust-badges`; the block was renamed to
# `sgs/trust-bar`. Rename the row (preserving its composition_role) and set
# has_inner_blocks=0 — TYPED-ONLY post-bound-purge (D182, 2026-06-06): trust-bar
# renders its badge grid from its own items[] attrs (typed loop in render.php), it
# does NOT wrap walked InnerBlocks. has_inner_blocks=0 drops it to the converter
# G3-attrs path so the typed items[] extraction handler fires (like option-picker)
# and the child-walk is suppressed — preventing the duplicate-nesting orphan
# InnerBlocks that deleting the bound stamp alone would leave.
# Idempotent: only renames when the old row exists and the new one does not.
RENAMES: dict[str, str] = {
    "sgs/trust-badges": "sgs/trust-bar",
}
RENAME_HAS_INNER_BLOCKS: dict[str, int] = {
    "sgs/trust-bar": 0,
}
# Enforce has_inner_blocks on EXISTING rows (the rename above only fires when the
# target row is absent; once renamed, re-runs must still converge these values).
ENFORCE_HAS_INNER_BLOCKS: dict[str, int] = {
    "sgs/trust-bar": 0,
    # sgs/accordion-item: edit.js uses useInnerBlocksProps for the body content;
    # render.php uses $content (InnerBlocks passthrough). The DB had has_inner_blocks=0
    # which is a data quality gap — the block DOES accept InnerBlocks.
    # Corrected Gate A 2026-06-10 alongside the accordion-item slot row fix.
    "sgs/accordion-item": 1,
}

# Fresh INSERTS (2026-06-02, Workstream A — D150). Blocks added after the
# block_composition table was seeded (D108, 188 rows) and therefore missing a
# row. Without a row, sync-container-wrapping-blocks.py --apply silently skips
# them. Values derived from each block's block.json + roster KIND (R-22-1).
# Idempotent: only inserts when the row is absent.
#   sgs/option-picker — CONTENT-kind, save.js uses InnerBlocks → has_inner_blocks=1,
#                       no allowedBlocks restriction → accepts_allowed_blocks NULL.
# NOTE: sgs/cart is also missing a row but is NOT container-bearing (not in the
# 28-block roster), so it does not block --apply — left as a catalogue gap.
INSERTS: list[dict] = [
    {
        "block_slug": "sgs/option-picker",
        "wraps_block": None,
        "composition_role": "content-block",
        "has_inner_blocks": 1,
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
        want_inner = RENAME_HAS_INNER_BLOCKS.get(new_slug)
        if want_inner is not None:
            cur.execute(
                "UPDATE block_composition SET block_slug = ?, has_inner_blocks = ? WHERE block_slug = ?",
                (new_slug, want_inner, old_slug),
            )
            print(f"  [set]  rename {old_slug} -> {new_slug} (has_inner_blocks={want_inner})")
        else:
            cur.execute(
                "UPDATE block_composition SET block_slug = ? WHERE block_slug = ?",
                (new_slug, old_slug),
            )
            print(f"  [set]  rename {old_slug} -> {new_slug}")
        changed += cur.rowcount

    # 1b. ENFORCE has_inner_blocks on existing rows (converges re-runs — the rename
    #     above is a no-op once the target row exists, so values set post-rename
    #     must be re-asserted here). Idempotent: UPDATE only when the value differs.
    for slug, want in ENFORCE_HAS_INNER_BLOCKS.items():
        row = cur.execute(
            "SELECT has_inner_blocks FROM block_composition WHERE block_slug = ?", (slug,)
        ).fetchone()
        if row is not None and row[0] != want:
            cur.execute(
                "UPDATE block_composition SET has_inner_blocks = ? WHERE block_slug = ?",
                (want, slug),
            )
            changed += cur.rowcount
            print(f"  [set]  enforce {slug} has_inner_blocks={want} (was {row[0]})")
        else:
            print(f"  [ok]   enforce {slug} has_inner_blocks={want}: already correct")

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
            "SELECT composition_role, has_inner_blocks FROM block_composition WHERE block_slug = ?",
            (slug,),
        )
        row = cur.fetchone()
        if row is None:
            print(f"  [skip] {slug}: no block_composition row")
            continue
        want_inner = HAS_INNER_BLOCKS.get(slug, row[1])
        if row[0] == role and row[1] == want_inner:
            print(f"  [ok]   {slug}: already {role} (has_inner_blocks={want_inner})")
            continue
        cur.execute(
            "UPDATE block_composition SET composition_role = ?, has_inner_blocks = ? WHERE block_slug = ?",
            (role, want_inner, slug),
        )
        changed += cur.rowcount
        print(f"  [set]  {slug}: {row[0]} -> {role} (has_inner_blocks={want_inner})")
    con.commit()
    con.close()
    print(f"[seed-composition-roles] done: {changed} row(s) corrected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
