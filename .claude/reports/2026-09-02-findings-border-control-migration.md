# Detector findings — SgsBorderControl migration (Shape-B rollout)

**Script:** `survey-border-control-migration.py` (`plugins/sgs-blocks/scripts/survey-border-control-migration.py`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against `plugins/sgs-blocks/CLAUDE.md`'s "Border controls" section — the detector's classification is correct; the DOC describing one of its exceptions was stale (see note below).

**Problem:** A block still exposes border controls (width/style/colour/radius) through WordPress's native `__experimentalBorder` support, or has migrated its attributes to block-private but never swapped its `edit.js` control to the shared `SgsBorderControl` component.

**Effect:** Client on an un-migrated block gets a different, less consistent border UI than the other 44 blocks that already use the shared control (a single width+colour pair, style inside the colour popover, radius as its own control).

**Validated count:** 4 blocks need action (3 `NATIVE_FULL`, 1 `PRIVATE_NEEDS_SWAP`). Detector is correct; no false positives.

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] Swap `media` to `SgsBorderControl` first** — it's a `PRIVATE_NEEDS_SWAP` (attributes already block-private, just needs the shared control mounted in `edit.js`), the cheapest of the 4. Codemod: `scripts/migrate-border-control.js`.
2. **Then the 3 `NATIVE_FULL` blocks** (card-grid, multi-button, trust-bar) — bigger lift, each needs the full Shape-B storage migration (native → block-private attrs) before the control swap. Codemod: `scripts/migrate-border-shape-b.js`. `--survey` currently refuses all 3 as `ambiguous-anchor` (not yet migrated, not a regression per CLAUDE.md) — read that refusal reason before scripting.
3. Leave as accepted backlog (this doc's own gate, `border-shape-b-check`, already passes — these 4 are known, not gating).

**One doc correction flagged by validation, not the detector:** `plugins/sgs-blocks/CLAUDE.md`'s "Border controls" section still lists `media` alongside `sgs/whatsapp-cta` as "radius-private-only, correctly do NOT mount SgsBorderControl" — that described `media`'s PRE-Wave-5b shape (2026-09-01). Wave 5b gave `media` full private border attrs (width/style/colour/colour-gradient + radius), so it now genuinely needs the swap. The doc also says "four blocks... still carry an ACTIVE native `__experimentalBorder`" naming `media` as one of the four — today's true count is 3 (card-grid, multi-button, trust-bar), since `media` left that group at Wave 5b. Worth a quick doc fix alongside whichever block work you pick.

---

## NATIVE_FULL (3) — still on WP-native `__experimentalBorder`, full Shape-B migration needed

- `sgs/card-grid`
- `sgs/multi-button`
- `sgs/trust-bar`

## PRIVATE_NEEDS_SWAP (1) — attributes already block-private, `edit.js` control swap needed

- `sgs/media` — has `borderWidth`/`borderStyle`/`borderColour`/`borderColourGradient`/`borderRadius`(+Tablet/Mobile) as real block-private attributes (Wave 5b, 2026-09-01), currently rendered via the shared `box-shape` atom inside `MediaPanelLayout`'s "Box & Border" panel rather than `SgsBorderControl`.

## For reference — no action needed

- **PRIVATE_DONE (44)** — already migrated and using `SgsBorderControl`. Not listed here; run the survey yourself if you want the full roster.
- **NO_BORDER_SUPPORT (28)** — blocks with no border capability at all (form fields, icon, separator, etc.) — nothing to migrate.
- **ANOMALY (7)** — `filter-search`, `label`, `mega-aside`, `mega-panel`, `product-search`, `social-icons`, `whatsapp-cta` (`native=['radius']`, `private=['borderRadiusMobile','borderRadiusTablet']`) — flagged by the survey as a shape it doesn't have a clean category for (native radius support alongside block-private tablet/mobile radius overrides). **Not validated this session** — worth a quick look before assuming it's fine, but it's a shape question, not the same border-swap work as the 4 above.
