# Detector findings — SgsBorderControl migration (Shape-B rollout)

**Script:** `survey-border-control-migration.py` (`plugins/sgs-blocks/scripts/survey-border-control-migration.py`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against `plugins/sgs-blocks/CLAUDE.md`'s "Border controls" section — the detector's classification is correct; the DOC describing one of its exceptions was stale (see note below).
**Corrected (same day, later pass):** the detector's own `sgs/media` classification was itself a false positive — see "Correction" below. `sgs/media` is now `PRIVATE_DONE`, not `PRIVATE_NEEDS_SWAP`, and has been moved out of the action list.

**Problem:** A block still exposes border controls (width/style/colour/radius) through WordPress's native `__experimentalBorder` support, or has migrated its attributes to block-private but never swapped its `edit.js` control to the shared `SgsBorderControl` component.

**Effect:** Client on an un-migrated block gets a different, less consistent border UI than the other blocks that already use the shared control (a single width+colour pair, style inside the colour popover, radius as its own control).

**Validated count:** 3 blocks need action (all `NATIVE_FULL`). `sgs/media` required a detector fix, not a block fix — see below.

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] The 3 `NATIVE_FULL` blocks** (card-grid, multi-button, trust-bar) — each needs the full Shape-B storage migration (native → block-private attrs) before the control swap. Codemod: `scripts/migrate-border-shape-b.js`. `--survey` currently refuses all 3 as `ambiguous-anchor` (not yet migrated, not a regression per CLAUDE.md) — read that refusal reason before scripting.
2. Leave as accepted backlog (this doc's own gate, `border-shape-b-check`, already passes — these 3 are known, not gating).

**One doc correction flagged by validation, not the detector:** `plugins/sgs-blocks/CLAUDE.md`'s "Border controls" section still lists `media` alongside `sgs/whatsapp-cta` as "radius-private-only, correctly do NOT mount SgsBorderControl" — that described `media`'s PRE-Wave-5b shape (2026-09-01). Wave 5b gave `media` full private border attrs (width/style/colour/colour-gradient + radius), so it now genuinely needs the swap. The doc also says "four blocks... still carry an ACTIVE native `__experimentalBorder`" naming `media` as one of the four — today's true count is 3 (card-grid, multi-button, trust-bar), since `media` left that group at Wave 5b. **This doc correction was applied 2026-09-02.**

**Correction — `sgs/media` was never actually `PRIVATE_NEEDS_SWAP` (2026-09-02, later pass):** the census flagged it because its `edit.js` never mounts `<SgsBorderControl>` directly. But `sgs/media` declares the `box-shape` atom in `supports.sgs.mediaElements[0].atoms`, and that atom's own control file — `src/components/media/controls/MediaBoxShapeControls.js` — already imports and mounts `<SgsBorderControl>` (confirmed by reading the file: line ~29 import, line ~278 mount, fed the atom's own `borderWidthValue`/`borderStyleValue`/`borderColourValue`/`borderColourGradientValue`/`borderRadiusValues` props with zero custom logic). The client-facing control IS `SgsBorderControl` — it's mounted three composition layers away from `media/edit.js` (`edit.js` → `MediaPanelLayout` → `box-shape.control.js` → `MediaBoxShapeControls.js` → `SgsBorderControl`), not inside `edit.js` itself. `survey-border-control-migration.py`'s `uses_sgs_border_control` check was a flat text search of the block's own `edit.js` only, so it couldn't see through the delegation chain. Fixed at the detector (`_delegated_atom_mounts_sgs_border_control()`, a small explicit lookup keyed on `BORDER_DELEGATING_ATOMS = {'box-shape': '.../MediaBoxShapeControls.js'}` — general enough that any future atom adopting this pattern gets the same correct classification by adding one lookup entry, not a per-block special case). **Do not mount a second, direct `SgsBorderControl` in `media/edit.js`** — that would create a duplicate writer on the same attributes the atom's control already writes (this project's `sgs/trust-bar` duplicate-`textColour`-writer bug class). `CEILING['PRIVATE_NEEDS_SWAP']` lowered 8→0 in the same commit.

---

## NATIVE_FULL (3) — still on WP-native `__experimentalBorder`, full Shape-B migration needed

- `sgs/card-grid`
- `sgs/multi-button`
- `sgs/trust-bar`

## For reference — no action needed

- **PRIVATE_DONE (45)** — already migrated and using `SgsBorderControl` (directly or, for `sgs/media`, via the `box-shape` atom's delegation chain — see Correction above). Not listed here; run the survey yourself if you want the full roster.
- **NO_BORDER_SUPPORT (28)** — blocks with no border capability at all (form fields, icon, separator, etc.) — nothing to migrate.
- **ANOMALY (7)** — `filter-search`, `label`, `mega-aside`, `mega-panel`, `product-search`, `social-icons`, `whatsapp-cta` (`native=['radius']`, `private=['borderRadiusMobile','borderRadiusTablet']`) — flagged by the survey as a shape it doesn't have a clean category for (native radius support alongside block-private tablet/mobile radius overrides). **Not validated this session** — worth a quick look before assuming it's fine, but it's a shape question, not the same border-swap work as the 3 above.
