#!/usr/bin/env python3
"""
sync-container-wrapping-blocks.py
=================================

Detects every SGS block that is container-bearing (wraps children via InnerBlocks,
layout orchestration, or structural parent), prints the roster with each block's KIND,
validates it against the expected roster, and with --apply writes
`block_composition.wraps_block` + `container_kind` to the framework database.
It never edits block.json files. Container capabilities are opt-in per block at
panel level: a block mounts the sgs/container editor panels it needs and declares the
matching attributes.

Criterion (D150 validated, 5 qc-council rounds — R-22-1 DB-first, no hardcoded
block→kind dict):
  A block is container-bearing iff it WRAPS CHILDREN via ANY of:
  (a) a real InnerBlocks slot (save.js InnerBlocks.Content OR edit.js
      useInnerBlocksProps / <InnerBlocks)
  (b) a strong layout-orchestration attr (grid: columns*/gridTemplate*/
      gridItem*/justifyItems/alignContent; flex: direction/justifyContent/
      wrap/alignItems; or `layout`). `gap` ALONE does NOT qualify.
  NOTE: D150 also defines criterion (c) — array-of-OBJECTS content attr
  (e.g. a block with a `type: "array"` attr whose items are objects
  representing child content units). This criterion is NOT currently
  implemented in detection. Every block in the roster qualifies via (a)
  or (b), and no current block is container-bearing SOLELY via (c). A
  future block that is container-bearing ONLY via an array-of-objects
  attr would not be detected by this script — tracked as a latent R-22-9
  gap requiring a future detection extension.
  Excludes: sgs/container itself, chrome-only blocks (mobile-nav-toggle,
  mega-menu), pure-InnerBlocks blocks that have no layout surface (handled
  by KIND below).

KIND (role-based, stored in block_composition.container_kind):
  section  — self-contained panel owning its whole frame (full attr surface).
             Detected via: section-frame attrs (background*/overlay*/shapeDivider*/
             bgVideo) OR operator override in block.json
             supports.sgs.containerKind:"section".
             (widthMode removed from section signals 2026-06-04 — it is now a
             shared width capability present on every KIND, not a section
             discriminator.)
  layout   — arranges/parents MULTIPLE children. Detected via: layout-
             orchestration attr (grid/flex/columns) OR structural-parent
             (a non-form-field child block declares parent=[this_slug]).
  content  — holds ONE unit's content (InnerBlocks only, no layout or
             section attrs, not a structural parent).

Two operator overrides via block.json supports.sgs.containerKind. /sgs-update
Stage 1 reads this flag into block_composition.container_kind.
  - trust-bar: override IS load-bearing. Without it, trust-bar's `columns`
    attr would route it to KIND=layout. The override forces KIND=section
    (full-bleed wrapper + max-width grid).
  - modal: override IS load-bearing since 2026-09-24 (Wave 3C U-2). modal
    used to be attr-derivable to KIND=section via its `overlayColour` and
    `overlayOpacity` attrs; U-2 moved its dialog backdrop onto the shared
    scrim (`scrimColour`, `scrimOpacity`, which SECTION_ATTR_RE does not
    match), so containerKind:"section" is now what keeps it a section.

R-22-1 (DB-first / no hardcoded dicts): block roster is derived from
block.json source files. Attribute lists come from each block's block.json.

Usage:
  python sync-container-wrapping-blocks.py                           # dry-run (prints roster and validation, no DB writes)
  python sync-container-wrapping-blocks.py --apply                   # write wraps_block + container_kind to DB
  python sync-container-wrapping-blocks.py --target-block sgs/hero   # limit detection to one block
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from block_source_files import edit_source  # noqa: E402

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent              # plugins/sgs-blocks
SRC_BLOCKS = PLUGIN_ROOT / "src" / "blocks"
REPO_ROOT = PLUGIN_ROOT.parent.parent        # small-giants-wp/

DB_CANDIDATES = [
    Path(os.path.expanduser("~/.agents/skills/sgs-wp-engine/sgs-framework.db")),
    SCRIPT_DIR / "sgs-framework.db",
]


def find_db() -> Path:
    for p in DB_CANDIDATES:
        if p.exists() and p.stat().st_size > 0:
            return p
    raise SystemExit(f"No populated sgs-framework.db found. Tried: {DB_CANDIDATES}")


# ---------------------------------------------------------------------------
# Detection criterion patterns (D150 validated)
# ---------------------------------------------------------------------------

# (b) Strong layout-orchestration attrs — presence of ANY qualifies (gap alone does NOT).
LAYOUT_ATTR_RE = re.compile(
    r"^("
    r"columns|columnsMobile|columnsTablet|columnsDesktop|"
    r"gridTemplateColumns|gridTemplateColumnsTablet|gridTemplateColumnsMobile|"
    r"gridTemplateRows|gridTemplateRowsTablet|gridTemplateRowsMobile|"
    r"gridAutoRows|"
    r"gridItemPadding|gridItemBackground|gridItemBorderRadius|"
    r"gridItemBorder|gridItemShadow|gridItemTextColour|"
    r"justifyItems|alignContent|"
    r"direction|flexDirection|justifyContent|flexWrap|wrap|alignItems|"
    r"layout|layoutMode"
    r")$",
    re.IGNORECASE,
)

# Section-frame attrs — presence triggers KIND=section (if no operator override).
# `widthMode` is a shared width capability on layout- and content-KIND composites,
# so its presence does not signal a section. The genuine
# section signals are the bespoke background/overlay/shape-divider/bg-video attrs
# below, plus the explicit `supports.sgs.containerKind:"section"` override.
SECTION_ATTR_RE = re.compile(
    r"^("
    r"backgroundImage|backgroundImageTablet|backgroundImageMobile|"
    r"backgroundOverlayColour|backgroundOverlayOpacity|"
    r"backgroundMedia|backgroundVideo|"
    r"overlayGradient|overlayColour|overlayOpacity|overlayColor|"
    r"shapeDivider|shapeDividerTop|shapeDividerBottom|"
    r"bgSvgContent|bgVideo|bgVideoMobile"
    r")$",
    re.IGNORECASE,
)

# Blocks that are never container-bearing regardless of their attrs.
EXCLUDE_SLUGS: Set[str] = {
    "sgs/container",       # the reference block itself
    "sgs/mobile-nav-toggle",  # chrome-only toggle button
    "sgs/mega-menu",          # navigation chrome, not a content wrapper
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_block_json(slug: str) -> Optional[Dict[str, Any]]:
    """Load src/blocks/<name>/block.json for sgs/<name>. Soft-fail on errors."""
    if not slug.startswith("sgs/"):
        return None
    name = slug.split("/", 1)[1]
    path = SRC_BLOCKS / name / "block.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"  [warn] failed to parse {path}: {e}", file=sys.stderr)
        return None


def read_js_combined(slug: str) -> str:
    """Read save.js + edit.js for a block into one string for pattern matching."""
    if not slug.startswith("sgs/"):
        return ""
    name = slug.split("/", 1)[1]
    block_dir = SRC_BLOCKS / name
    combined = ""
    save = block_dir / "save.js"
    if save.exists():
        try:
            combined += save.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            pass
    # edit.js plus the in-block components it imports
    try:
        combined += edit_source(block_dir)
    except OSError:
        pass
    return combined


def has_innerblocks_slot(slug: str) -> bool:
    """True if save.js or edit.js contains a real InnerBlocks usage."""
    js = read_js_combined(slug)
    return bool(re.search(r"useInnerBlocksProps|InnerBlocks\.Content|<InnerBlocks", js))


def layout_attrs_for(attrs: Dict[str, Any]) -> List[str]:
    """Return attr names that qualify as layout-orchestration attrs."""
    return [k for k in attrs if LAYOUT_ATTR_RE.match(k)]


def section_attrs_for(attrs: Dict[str, Any]) -> List[str]:
    """Return attr names that qualify as section-frame attrs."""
    return [k for k in attrs if SECTION_ATTR_RE.match(k)]


def build_structural_parents(slugs: List[str]) -> Set[str]:
    """Return the set of block slugs that are structural parents.

    A structural parent is a block that is declared as `parent` by a NON-form-field,
    NON-chrome child block. This covers:
      - sgs/accordion  (accordion-item declares parent=['sgs/accordion'])
      - sgs/tabs       (tab declares parent=['sgs/tabs'])
      - sgs/form       (form-step declares parent=['sgs/form'])

    Explicitly excluded from the child scan:
      - sgs/form-field-* (config inputs, not structural items)
      - sgs/form-review  (config block)
      - sgs/mega-menu    (navigation chrome)
    These blocks declare parent relationships for constraining their editor
    placement, not because the parent is a layout container of multiple items.
    """
    structural: Set[str] = set()
    for slug in slugs:
        bj = load_block_json(slug)
        if not bj:
            continue
        parents = bj.get("parent", None)
        if not parents:
            continue
        # Skip if this child is a form-field input, chrome block, or review block
        if (slug.startswith("sgs/form-field")
                or slug in {"sgs/form-review", "sgs/mega-menu"}):
            continue
        for parent_slug in parents:
            structural.add(parent_slug)
    return structural


def derive_kind(
    slug: str,
    bj: Dict[str, Any],
    structural_parents: Set[str],
) -> str:
    """Derive the container KIND for a block.

    Priority:
    1. Operator override in block.json supports.sgs.containerKind.
    2. Section-frame attrs → section.
    3. Layout-orchestration attrs OR structural parent → layout.
    4. Default → content.
    """
    supports = bj.get("supports", {}) or {}
    sgs_supports = supports.get("sgs", {}) or {}
    override = sgs_supports.get("containerKind", None)
    if override in ("section", "layout", "content"):
        return override

    attrs = bj.get("attributes", {}) or {}
    if section_attrs_for(attrs):
        return "section"
    if layout_attrs_for(attrs) or slug in structural_parents:
        return "layout"
    return "content"


# ---------------------------------------------------------------------------
# DB migration helper (Fix 1a)
# ---------------------------------------------------------------------------

def ensure_container_kind_column(conn: sqlite3.Connection) -> None:
    """Idempotently add container_kind to block_composition if absent.

    Applies the container_kind migration itself so this
    script can be run standalone. The CHECK constraint matches exactly.
    """
    cur = conn.cursor()
    cols = {row[1] for row in cur.execute("PRAGMA table_info(block_composition)").fetchall()}
    if "container_kind" not in cols:
        try:
            cur.execute(
                "ALTER TABLE block_composition ADD COLUMN container_kind TEXT "
                "CHECK (container_kind IN ('section','layout','content'))"
            )
            conn.commit()
            print("  [migration] added container_kind column to block_composition")
        except sqlite3.OperationalError:
            pass  # column already exists (race or concurrent migration)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Detect container-bearing SGS blocks and sync block_composition."
    )
    ap.add_argument(
        "--apply", action="store_true",
        help="Write wraps_block and container_kind to the framework DB. "
             "Without it the script only reports (dry run). block.json files are never written.",
    )
    ap.add_argument(
        "--target-block", default=None,
        help="Limit to one block slug (e.g. sgs/hero).",
    )
    ap.add_argument("--db", default=None, help="Override DB path.")
    args = ap.parse_args()

    dry_run = not args.apply

    db_path = Path(args.db) if args.db else find_db()
    print(f"DB: {db_path}")
    if dry_run:
        print("MODE: DRY-RUN (no DB writes — pass --apply to write)")
    else:
        print("MODE: APPLY (will write wraps_block + container_kind to DB)")
    print()

    # 2. Collect all candidate slugs from block.json source files
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    if args.target_block:
        candidate_slugs = [args.target_block]
    else:
        # Derive from src/blocks directory (R-22-1: roster from source, not hardcoded)
        candidate_slugs = []
        for d in sorted(SRC_BLOCKS.iterdir()):
            if not d.is_dir():
                continue
            bjp = d / "block.json"
            if not bjp.exists():
                continue
            try:
                bj_data = json.load(open(bjp, "r", encoding="utf-8"))
                slug = bj_data.get("name", "sgs/" + d.name)
                if slug not in EXCLUDE_SLUGS:
                    candidate_slugs.append(slug)
            except Exception:
                continue

    print(f"Candidate blocks to scan: {len(candidate_slugs)}")

    # 3. Build structural-parent set (blocks whose non-form-field children declare parent=[slug])
    structural_parents = build_structural_parents(candidate_slugs)
    print(f"Structural parents detected: {sorted(structural_parents)}")
    print()

    # 4. Detect container-bearing blocks and derive KIND
    container_bearing: List[Tuple[str, str, List[str]]] = []  # (slug, kind, reasons)

    for slug in candidate_slugs:
        bj = load_block_json(slug)
        if not bj:
            continue

        attrs = bj.get("attributes", {}) or {}
        ib = has_innerblocks_slot(slug)
        layout = layout_attrs_for(attrs)
        has_layout = bool(layout)
        supports = bj.get("supports", {}) or {}
        has_override = (supports.get("sgs", {}) or {}).get("containerKind") in (
            "section", "layout", "content",
        )

        # Container-bearing = InnerBlocks OR layout attrs OR an explicit operator
        # override (criterion a, b, or c). The override is the strongest signal —
        # derive_kind() already treats it as priority 1 — so a block relying on it
        # alone (e.g. sgs/nav-menu: no InnerBlocks, no grid/flex attrs, just a flat
        # `gap`) must not be silently excluded from candidacy before derive_kind()
        # ever runs.
        if not (ib or has_layout or has_override):
            continue

        kind = derive_kind(slug, bj, structural_parents)

        reasons: List[str] = []
        if ib:
            reasons.append("InnerBlocks")
        if layout:
            reasons.append(f"layout:{layout}")
        if slug in structural_parents:
            reasons.append("structural-parent")
        supports = bj.get("supports", {}) or {}
        sgs_supports = supports.get("sgs", {}) or {}
        if sgs_supports.get("containerKind"):
            reasons.append(f"containerKind-override:{sgs_supports['containerKind']}")

        container_bearing.append((slug, kind, reasons))

    # Sort by KIND then slug
    KIND_ORDER = {"section": 0, "layout": 1, "content": 2}
    container_bearing.sort(key=lambda t: (KIND_ORDER.get(t[1], 9), t[0]))

    # 5. Print dry-run roster (always printed)
    print("=" * 70)
    print("CONTAINER-BEARING BLOCK ROSTER")
    print("=" * 70)
    cur_kind = None
    for slug, kind, reasons in container_bearing:
        if kind != cur_kind:
            print(f"\n--- {kind.upper()} ---")
            cur_kind = kind
        print(f"  {slug:36}  {' | '.join(reasons)}")

    counts = Counter(k for _, k, _ in container_bearing)
    print()
    print(f"TOTAL: {len(container_bearing)}  "
          f"section={counts['section']}  layout={counts['layout']}  content={counts['content']}")
    print()

    # Ground-truth validation
    EXPECTED = {
        # sgs/site-header added 2026-07-13 (Spec 17 §S9 / FR-S9-2, D323 header system):
        # section-KIND header shell (containerKind override) that stacks up to 3
        # sgs/site-header-row children; delegates its outer frame to SGS_Container_Wrapper.
        # sgs/site-footer added 2026-07-13 (Spec 17 §S9 / FR-S9-3, D325 footer system):
        # section-KIND footer shell delegating to SGS_Container_Wrapper.
        "section": {
            "sgs/hero", "sgs/modal", "sgs/trust-bar",
            "sgs/site-header", "sgs/site-footer",
            # sgs/mega-panel + sgs/physics-canvas CONFIRMED + added 2026-08-05. Both were
            # reported as "EXTRA (detected but not expected)" — the roster had not been
            # refreshed since they gained their container attrs, the same shape as
            # sgs/brand-strip below. Detection is definitionally correct for these two:
            # each DECLARES `supports.sgs.containerKind: "section"` in its own block.json,
            # so the detector is reading an explicit declaration, not inferring. Reasons
            # reported: mega-panel = InnerBlocks | structural-parent | containerKind-
            # override:section; physics-canvas = InnerBlocks | containerKind-override:section.
            "sgs/mega-panel", "sgs/physics-canvas",
        },
        "layout": {
            "sgs/card-grid", "sgs/feature-grid", "sgs/gallery",
            "sgs/multi-button", "sgs/post-grid", "sgs/pricing-table", "sgs/trustpilot-reviews",
            "sgs/google-reviews", "sgs/form-field-tiles", "sgs/testimonial-slider",
            "sgs/tabs", "sgs/accordion", "sgs/form",
            # sgs/site-header-row added 2026-07-13 (Spec 17 §S9 / FR-S9-7): the never-overflow
            # cluster row inside sgs/site-header (containerKind override: layout).
            "sgs/site-header-row",
            # sgs/site-footer-row added 2026-07-13 (Spec 17 §S9 / FR-S9-3, D325): the footer row
            # inside sgs/site-footer — a column grid (up to 6 cols → 1 on mobile) or flex cluster.
            "sgs/site-footer-row",
            # sgs/nav-menu added 2026-07-20 (Spec 36 FR-36-2 / Phase-1 close): layout-KIND nav
            # bar — the canonical nav block of the Spec 36 rebuild.
            # sgs/adaptive-nav (the block it superseded) was RETIRED 2026-07-22 (FR-37-21) —
            # deleted from the codebase and pruned from the DB by /sgs-update Stage 10.
            # SPLIT 2026-09-14 (D1059) into sgs/nav-bar-menu + sgs/nav-drawer-menu.
            # sgs/nav-bar-menu inherits this slot: it is BLOCK-PRIVATE (D539, no
            # SGS_Container_Wrapper) but still genuinely container-bearing on this
            # script's own criterion (b) — Step 6 (2026-09-15) restored `justifyContent`,
            # a real layout-orchestration attr that arranges the rendered item list.
            # sgs/nav-drawer-menu does NOT belong here: it declares no layout-family
            # attr at all (its Step 8 additions, splitAfterItemId/splitSide, are not
            # arrangement attrs) — its old `containerKind:"layout"` override was a
            # stale Step-2 scaffold copy-paste from the pre-split block, removed from
            # its block.json rather than carried forward.
            "sgs/nav-bar-menu",
            # sgs/brand-strip added 2026-07-20: detected layout-KIND since the Track-1 Spec 35
            # inspector rebuild gave it the grid/flex attr family. Detection was correct; the
            # roster simply had not been refreshed since that work landed.
            "sgs/brand-strip",
            # Refreshed 2026-10-01 against detection (each verified in block.json). Detection
            # was right for all of these; the roster had not been refreshed since they landed.
            # - sgs/card-grid declares `containerKind: "layout"` explicitly: its image
            #   overlay attrs (overlayColour/-Gradient/-Opacity) match SECTION_ATTR_RE, which
            #   made it read as a section.
            # - sgs/form-step and sgs/notice-banner are structural parents (their children
            #   declare them as `parent`), so derive_kind() reads them as layout, not content.
            # - sgs/choice-flow-question, sgs/process-steps, sgs/wishlist-panel and
            #   sgs/nav-drawer-menu carry an own-arrangement attr (`layout` / `columns` /
            #   `justifyContent`) and hand-roll their root.
            "sgs/choice-flow", "sgs/choice-flow-question", "sgs/form-step",
            "sgs/nav-drawer-menu", "sgs/notice-banner", "sgs/process-steps",
            "sgs/wishlist-panel",
            # sgs/measured-diagram added 2026-10-08: it hosts sgs/diagram-dimension children through
            # InnerBlocks (block.json `allowedBlocks`) and is their structural parent, so the detector
            # reports it for the right reasons (InnerBlocks | structural-parent); the roster had not
            # been refreshed since the block was added.
            "sgs/measured-diagram",
            # sgs/content-collection is not in this roster: `src/blocks/content-collection/`
            # does not exist and the DB has no `sgs/content-collection` row.
        },
        "content": {
            "sgs/info-box", "sgs/testimonial", "sgs/quote",
            "sgs/tab", "sgs/accordion-item",
            "sgs/option-picker",
            # sgs/buybox + sgs/notice-message added 2026-10-01: InnerBlocks-only, so content-KIND
            # by default; both hand-roll their root.
            "sgs/buybox", "sgs/notice-message",
            # sgs/nav-drawer added 2026-07-20 (Spec 36 FR-36-6 / Phase-1 close): content-KIND,
            # and deliberately BLOCK-PRIVATE — it does NOT call SGS_Container_Wrapper. Its root
            # must BE the <dialog> for showModal()/top-layer/::backdrop/native-ESC to work, and
            # putting `display` on a <dialog> base rule defeats the UA's
            # dialog:not([open]){display:none} (STOP-DIALOG-DISPLAY-GATE). That is the D294 rule
            # as written, not an exception to it: a content-KIND composite using only box+width
            # may render block-private. It is listed here because it IS container-bearing by
            # detection (InnerBlocks + containerKind override) — listing it keeps the validator
            # honest; it does not imply wrapper delegation. See Spec 36 FR-36-13.
            "sgs/nav-drawer",
            # sgs/mega-aside + sgs/mega-group CONFIRMED + added 2026-08-05, same refresh as
            # the two section-KIND entries above. Neither declares a containerKind override;
            # both were detected on `InnerBlocks` alone, which is the default content-KIND
            # signal. Listing them keeps the validator honest about what detection sees — it
            # does NOT assert wrapper delegation (same caveat as sgs/nav-drawer above).
            "sgs/mega-aside", "sgs/mega-group",
            # sgs/social-icons added 2026-10-09: it is now a wrapper of Site Info-bound sgs/icon
            # children (`allowedBlocks: ["sgs/icon"]`, InnerBlocks), so detection reads it on
            # `InnerBlocks` alone, like sgs/mega-group above. The roster had not been refreshed
            # since the rebuild; it does not assert wrapper delegation.
            "sgs/social-icons",
            # sgs/mobile-nav REMOVED 2026-07-16 (qc-council, 2 raters): the block was
            # DELETED by `7c60b8ff` ("wire the theme to adaptive-nav drawer + delete
            # mobile-nav", Wave 2) and its off-canvas drawer absorbed into
            # `sgs/adaptive-nav`. The validator was therefore CORRECT to fail (exit 1,
            # "MISSING (expected but not detected)") every run since — it was reporting a
            # genuinely stale expectation, not a detection bug. Nothing was written to
            # disk either way (the block.json writer is gated on all_match).
            # ⚠ BRANCH-COUPLED — do NOT cherry-pick this line to `main` alone.
            # `mobile-nav` STILL EXISTS on `main` (verified: git ls-tree main), so on main
            # this entry is still CORRECT. Removing it there before the deletion lands
            # would break the validator in the OPPOSITE direction ("EXTRA (detected but
            # not expected)"). This removal must merge together with `7c60b8ff`.
            # (NB: plugins/sgs-blocks/CLAUDE.md miscites the deletion as "D336" — D336 is
            # the site-takedown incident; the deletion is D337/Wave 2.)
            # product-faq + product-faq-item added 2026-06-10 (new since D160 — F2/D197).
            "sgs/product-faq", "sgs/product-faq-item",
            # product-card REMOVED 2026-06-10: the D204 built-in-element rebuild made it
            # a standalone block (no sgs/container InnerBlocks wrapper) — it is no longer
            # structurally container-bearing, so it is styled directly (own color+border
            # supports) rather than as a roster block.
            # team-member REMOVED 2026-06-16 (D228): structurally identical to product-card
            # post scalar-rebuild — it uses SGS_Container_Wrapper for its OUTER shell but has
            # built-in/scalar children (no sgs/container InnerBlocks) + its own color/border/
            # typography supports, so it styles directly rather than as a roster block. The
            # container-bearing detection correctly excludes both; the roster just wasn't
            # updated after team-member's scalar rebuild (the Stage-11 sync WARN root cause).
        },
    }
    got: Dict[str, Set[str]] = {"section": set(), "layout": set(), "content": set()}
    for slug, kind, _ in container_bearing:
        got[kind].add(slug)

    all_match = True
    for kind_name in ("section", "layout", "content"):
        expected_set = EXPECTED[kind_name]
        got_set = got[kind_name]
        missing_from_got = expected_set - got_set
        extra_in_got = got_set - expected_set
        if missing_from_got or extra_in_got:
            all_match = False
            print(f"[VALIDATION FAIL] {kind_name.upper()}:")
            if missing_from_got:
                print(f"  MISSING (expected but not detected): {sorted(missing_from_got)}")
            if extra_in_got:
                print(f"  EXTRA (detected but not expected): {sorted(extra_in_got)}")

    if all_match:
        print("[VALIDATION PASS] Roster matches ground truth (D150+D160, reconciled 2026-06-10: +product-faq/-item, -product-card; correct KINDs)")
    else:
        print()
        print("[VALIDATION FAIL] Roster does NOT match ground truth — fix detection before --apply")

    print()

    if dry_run and not all_match:
        conn.close()
        return 1

    # 7. DB writes (only if --apply AND validation passed)
    if args.apply:
        if not all_match:
            print("[APPLY BLOCKED] Roster validation failed — fix detection first", file=sys.stderr)
            conn.close()
            return 1

        # Fix 1(a): ensure container_kind column exists before writing
        ensure_container_kind_column(conn)

        # Fix 1(b): per-block rowcount tracking — fail-loud on missing rows
        missing_rows: List[str] = []
        for slug, kind, _ in container_bearing:
            cur.execute(
                "UPDATE block_composition SET wraps_block = 'sgs/container', container_kind = ? "
                "WHERE block_slug = ?",
                (kind, slug),
            )
            if cur.rowcount == 0:
                missing_rows.append(slug)

        if missing_rows:
            print(
                f"\n[APPLY ERROR] {len(missing_rows)} roster block(s) have NO row in block_composition "
                f"and were NOT written:\n  " + "\n  ".join(missing_rows),
                file=sys.stderr,
            )
            print(
                "These roster blocks have NO row in block_composition. "
                "Run the canonical /sgs-update "
                "to reconcile block_composition rows first, "
                "then re-run --apply.",
                file=sys.stderr,
            )
            conn.rollback()
            conn.close()
            return 1

        conn.commit()
        print(f"DB: wrote wraps_block + container_kind for {len(container_bearing)} rows")
    else:
        print(f"DRY-RUN: {len(container_bearing)} rows would be written (wraps_block + container_kind) — re-run with --apply to write")

    conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
