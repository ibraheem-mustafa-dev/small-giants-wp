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
}

# Blocks whose content-block role implies inner blocks; keep has_inner_blocks in sync.
HAS_INNER_BLOCKS = {
    "sgs/testimonial": 1,
    "sgs/testimonial-slider": 1,
    "sgs/label": 0,
}


def main() -> int:
    if not DB_PATH.exists():
        print(f"[seed-composition-roles] DB not found: {DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()
    changed = 0
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
