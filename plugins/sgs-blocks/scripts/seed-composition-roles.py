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
    # sgs/notice-banner (2026-08-07) — block.json declares `supports.sgs.is_section_root:
    # true` (committed af5f1f24), which sgs-update-v2.py:714-718 reflects onto
    # blocks.tier as 'class-section'. composition_role has no derive-from-code
    # populator (see this module's docstring), so it stayed 'leaf' and F6 Check
    # "tier='class-section' but composition_role='leaf'" FAILED on the next reseed —
    # i.e. the declaration landed on main with only half its consequences seeded.
    # 'section-root' mirrors site-header/site-footer in INSERTS below, which carry the
    # same declaration. ⚠ RECURRENCE RISK, deliberately not fixed here: any future
    # block declaring is_section_root will repeat this, because one half of the pair is
    # derived from block.json and the other is hand-seeded. Making is_section_root drive
    # composition_role too would close it, but that is a shared-mechanism change and
    # this file's docstring states the hand-seed is by design — so it needs a design
    # gate, not a drive-by.
    "sgs/notice-banner": "section-root",
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
    {
        # sgs/nav-drawer (2026-07-19, Spec 36 FR-36-6 Phase-1) — content-KIND
        # off-canvas drawer: renders a full-screen <dialog> BLOCK-PRIVATE (a
        # <dialog> cannot be hosted by SGS_Container_Wrapper, which coerces any
        # non-allowed tag to <section>). It mirrors box/background/padding/gap/
        # align via the shared scoped-CSS helpers with no divergence (the D294
        # block-private pattern). container_kind='content' is set from
        # block.json by sync-container-wrapping-blocks.py --apply.
        # composition_role stays 'section-root' (an InnerBlocks-container role,
        # needed for the F6 has_inner_blocks sync) — orthogonal to container_kind.
        "block_slug": "sgs/nav-drawer",
        "wraps_block": None,
        "composition_role": "section-root",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/mega-panel (2026-07-24, mega-menu CORE build, U1-U3) — the
        # content container of a sgs_mega_menu post. Hosts sgs/mega-group /
        # sgs/mega-aside InnerBlocks children as a genuine (bespoke flex/grid)
        # section, block-private (CF-10 "parent paints child" — no
        # SGS_Container_Wrapper). Mirrors sgs/nav-drawer's row shape
        # (section-root, no wraps_block) — container_kind is set from
        # block.json's containerKind:"section" by
        # sync-container-wrapping-blocks.py --apply.
        "block_slug": "sgs/mega-panel",
        "wraps_block": None,
        "composition_role": "section-root",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/mega-group (2026-07-24, mega-menu CORE build, U1) — one locked
        # column of a mega panel (heading + icon-list). Carries NO styling
        # attributes of its own by design (CF-10) — painted entirely by the
        # parent sgs/mega-panel. Simple InnerBlocks-holding content-block,
        # like the other catalogue-gap standalone blocks above; no container
        # wrapper of any kind.
        "block_slug": "sgs/mega-group",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/mega-aside (2026-07-24, mega-menu CORE build, U1) — the optional
        # locked side panel of a mega panel (media + heading + text + button).
        # Same profile as sgs/mega-group: no styling attributes of its own
        # (CF-10, parent-paints-child), simple InnerBlocks-holding
        # content-block, no container wrapper.
        "block_slug": "sgs/mega-aside",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/image-sequence (2026-07-31, Spec 38 FR-38-9, Wave C item C8) —
        # scroll-scrubbed canvas frame sequence. Renders a poster <img> + a
        # <canvas> entirely from scalar/object attrs (posterMedia, per-tier
        # frame-source attrs, fx params) with save:()=>null and NO InnerBlocks
        # slot — same profile as sgs/audio (standalone content block, no
        # container wrapper of any kind).
        "block_slug": "sgs/image-sequence",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/before-after (2026-07-31, Spec 38 FR-38-13, Wave C item C3) —
        # two-image comparison slider with a draggable divider. Renders both
        # <img> elements + the divider entirely from typed scalar attrs
        # (beforeImageUrl/afterImageUrl/orientation/startPosition/fx params)
        # with save:()=>null and NO InnerBlocks slot — same standalone-leaf
        # profile as sgs/audio / sgs/image-sequence (content-block, no
        # container wrapper of any kind; content-KIND / block-private per
        # D294, never used SGS_Container_Wrapper).
        "block_slug": "sgs/before-after",
        "wraps_block": None,
        "composition_role": "content-block",
        "accepts_allowed_blocks": None,
    },
    {
        # sgs/physics-canvas (2026-08-02, Spec 38 FR-38-27, D447) — a niche
        # ARTISTIC canvas whose direct children become throwable, gravity-driven
        # decorative bodies. Unlike the standalone leaves above it IS a genuine
        # section-KIND composite: render.php delegates to SGS_Container_Wrapper
        # (D152 composite-mirror), and the wrapper's .sgs-container__inner band
        # is the throw arena itself, so the row must carry wraps_block +
        # container_kind='section' or the wrapper routing never applies.
        # Bean ruled 2026-08-02 that this surface is deliberately NOT built for
        # accessibility, structure, or cloning — it is operator-discretion
        # decoration. Seeded so the F6 db-consistency gate passes; NOT seeded
        # into slots/roles, because it is intentionally unclonable.
        # Field values verified against the live table, NOT assumed: sgs/hero and
        # sgs/cta-section both read wraps_block='sgs/container' +
        # composition_role='section-root' (there is no 'section' role — the four
        # in use are content-block / leaf / section-root / wrapper-shell), and
        # accepts_allowed_blocks holds a JSON ARRAY of slugs, as cta-section does,
        # not a boolean. container_kind is deliberately absent here: it is set by
        # sync-container-wrapping-blocks.py --apply, like every other row.
        "block_slug": "sgs/physics-canvas",
        "wraps_block": "sgs/container",
        "composition_role": "section-root",
        "accepts_allowed_blocks": (
            '["core/image", "sgs/media", "sgs/icon", "sgs/decorative-image"]'
        ),
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
