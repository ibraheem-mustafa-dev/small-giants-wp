# Session Handoff — 2026-06-01 (SGS THEME thread, session 3)

> Theme/blocks/editor-UX thread. Cloning pipeline → `.claude/handoff.md`. Next steps → `.claude/next-session-prompt-theme.md`.

## Completed This Session

1. **Mobile-nav full-fix** (`1f985c9a`, deployed + live-verified, D143). Bean's report ("opens tiny, no menu, can't close") root-caused live (CDP, 375px, logged-out) and fixed in 4 parts: **(a) overlay sizing** — `--overlay` variant now overrides the Popover UA `fit-content` defaults (`width:100vw + height:100vh/100dvh + inset:0`) → fills viewport 375×812 (was 208×158); **(b) 16px block-gap strip** — WP flow-layout `:root :where(.is-layout-flow) > *{margin-block-start:16px}` was pushing the drawer down; doubled block class `.sgs-mobile-nav.wp-block-sgs-mobile-nav` (0,2,0) beats it → flush at y:0; **(c) empty menu [universal bug]** — `render_menu_items()` didn't handle `core/page-list` (WP's DEFAULT nav content), so default headers showed 0 menu items; added a `core/page-list` case expanding the published page hierarchy (verified 0 → 13 items + link nav to `/hero-clone-poc/`); **(d) header-only inserter** — new `mobile-nav-inserter-scope.php` (`allowed_block_types_all`, fail-open) removes the 2 chrome blocks from the post/page inserter, keeps them in the Site Editor. view.js confirmed close/ESC/accordions bind without a trigger. block.json 3.0.1→3.0.3 (cache-bust). Visual report `reports/visual-diff/mobile-nav-2026-06-01.md`. `/sgs-update` run clean (10 stages).

2. **Product-card / `sgs/option-picker` design RATIFIED** (D144). Bean answered the 6 open decisions in `.claude/reports/2026-06-01-product-card-option-picker-design.md`; all accepted, two upgrade the design: **(1)** per-type `display_as` mode (`pills` | `static-list` "Available in 3 flavours: …" | `hidden`) + card-level "price only" toggle; **(2)** SKU matrix deferred (editor warning, first type wins); **(3)** filled-in-card/outlined-global pills + 3 CSS states (resting/considering/selected); **(4)** emit `sgs/option-picker` DIRECTLY from the clone (Bean corrected 2026-06-01 — opposite of rec; build the picker ASAP + battle-ready, then wire into the pipeline); **(5)** source toggle in BOTH toolbar + inspector; **(6)** Gutenberg-panel editor UI. Encoded into Spec 24 §FR-24-11/12/15. **The product-card BUILD (Task 2) is now a near-term priority** (Bean: build the option-picker ASAP + battle-ready) — these are the recorded contract the build session inherits.

## Current State
- **Branch:** `feat/fr22-4-1-universal-wrapper` (shared with the parallel cloning thread) at `1f985c9a` (code) + doc commit (this handoff).
- **Tests:** no unit suite for mobile-nav; `php -l` clean on all touched PHP; `npm run build` green.
- **Build/deploy:** mobile-nav v3.0.3 deployed to sandybrown canary; live-verified.
- **Uncommitted:** the doc set (decisions/Spec24/report/registry/handoff/state/prompt/block-CLAUDE) — committed at end of this handoff.

## Outcome vs Completion (Gate 3.5)
- Mobile-nav: **OUTCOME ACHIEVED** — full-screen + populated 13-item menu + closeable (button+ESC) + links navigate, all live-verified on canary.
- Product-card 6 decisions: **OUTCOME ACHIEVED** — decisions ratified + recorded in Spec 24/D144/report. The BUILD is correctly scoped as deferred (Task 2), not completion theatre.

## Known Issues / Blockers
- **Branch not merged to main** — the shared `feat/fr22-4-1-universal-wrapper` branch is mid-work by the parallel cloning thread; merging/deleting it now would break that thread. Both threads' work merges to main together when both close. (Explicit deviation from the handoff merge-to-main gate — justified by the two-thread model.)
- **Mobile-nav editor-inserter E2E deferred** — the `allowed_block_types_all` filter is logic-reviewed + fail-open (can't break the editor); the editor-side confirmation (open post inserter, verify the 2 blocks absent) wasn't run. Low risk.
- **Heading/text dormant-variant values (from 7b)** — Bean may want to tweak the agent-added default CSS or drop heading `hero` as redundant.

## Notes for Next Session
- **CDP top-layer quirk:** synthetic `dispatchMouseEvent` clicks on popover-internal elements don't reliably trigger anchor nav / hit-test in headless Chrome; programmatic `.click()` + real taps work. Verify popover interactions via `.click()` or visual screenshot, not a CDP click + URL check.
- **Cache-bust on block CSS/JS changes:** bump the block.json `version` field — WP keys the asset `?ver=` off it; redeploying without a bump serves stale CSS to returning visitors (caught live this session).
- **Mobile-nav menu source:** the drawer reads the header `core/navigation` → resolves `ref`/innerBlocks → falls back to the newest `wp_navigation` post; `core/page-list` is now expanded. If a site's mobile menu is empty, check the header nav has a populated `wp_navigation` or page-list.

## Next Session Prompt
See `.claude/next-session-prompt-theme.md` (mobile-nav marked DONE; Task 2 product-card decisions RESOLVED → build now unblocked; Task 5 mega-menu library, Task 9 hybrid migrations, sgs/cart remain; reading list + guardrails intact).

---

# Session Handoff — 2026-06-02 (SGS THEME thread, session 2)

> Theme/blocks/editor-UX thread. Cloning pipeline → `.claude/handoff.md`. Next steps → `.claude/next-session-prompt-theme.md`.

## Completed This Session (Tasks 1, 4, 3 — all live-verified, committed, pushed)

1. **Task 1 — shared visual IconPicker** (`c40c9a49`). New reusable component `plugins/sgs-blocks/src/components/IconPicker/`. Searchable keyboard-navigable grid modal across 4 tabs: Lucide 1,917 / Emoji 1,914 / WordPress 49 / Dashicons. Wired into `sgs/icon` + `sgs/icon-list`. SVGs NOT inlined (avoids core/icon bundle-bloat); static JSON in `assets/icons/`, fetched on demand. Live-verified on canary 144.

2. **Task 4 — notice-banner 5 variants + per-type icons + picker** (`e8048a18`). Added `error` to info/success/warning/accent. Per-type default Lucide icon, overridable via IconPicker; `showIcon` toggle; fixed a frontend bug (old emoji menu rendered nothing). Corner-radius = native Border control. version 0.3.0.

3. **Task 3 — team-member Compact vs Full display modes** (`a55f5a71`). New `displayMode` attr (full default | compact). Photo picker already existed. Live-verified via CDP.

## Bugs Found (→ fixed by cloning thread D141)
- `sgs/media` editor crash (`imageId` undefined) + `sgs/container` validation — both fixed in the cloning thread.

## Current State
- **Branch:** `feat/fr22-4-1-universal-wrapper`. 3 commits pushed (c40c9a49, e8048a18, a55f5a71). Build green; canary deployed.
