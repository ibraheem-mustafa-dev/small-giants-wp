# Session Handoff — 2026-06-02 (SGS THEME thread, session 4)

> Theme/blocks/editor-UX thread. Cloning pipeline → `.claude/handoff.md`. Next steps → `.claude/next-session-prompt-theme.md`.

## Completed This Session
1. **`sgs/option-picker`** built + verified (`ee6807d3`). Battle-ready radio-group pill chooser (Spec 24 FR-24-15 / D144 Phase A); native ARIA, no-JS-safe SSR, bubbling `sgs:option-selected` event. Live-verified: default-select renders, click swaps via CSS `:checked`, event contract exact.
2. **notice-banner FR-22-6 migration** (`d8c30a74`) — `echo $content` + sgs/text child + deprecated.js v3 (mirrors shipped info-box v4). Live render clean.
3. **Mega-menu layout library** (`e70cc07a`) — 7 generic patterns + `mega-menu-layouts` category + registered orphan sectors part + "create panel" editor shortcut. Research-gated (block-patterns chosen). All 7 register live.
4. **4 /ui-ux-pro-max design fixes** (`3b85dad1`) — featured-card contrast 3.32→11.86:1, option-picker non-colour selected cue + spacing, card-grid borders. Theme version 1.3.5→1.3.6 (theme-CSS cache-bust).
5. **`sgs/icon` enhancements** (`d7a75870`) — shape backgrounds (circle/pill/square/outline) + clickable (reuses linkUrl) + hover; deprecated.js v1. 5 shapes verified.
6. **Duplicate-animation-panel fix** (`609299e1`) — root cause: `animation.js` imported by two webpack entry points → filter ran twice. Verified: exactly one `sgs/animation-controls` handler now.
7. **Product-card Phase B** (`7115a60d`) — `_sgs_variation_sets` meta + Gutenberg panel + **`custom-fields` CPT fix** (without it the CPT REST schema omitted `meta` → no product meta round-tripped). Verified: meta round-trips via REST, panel renders 0 errors.
8. **`sgs/cart`** WooCommerce count badge v1 (`b6369224`) — Store API hydrate, SSR 0, no jQuery, cart-fragments dequeued. Verified: hydration fetch fires, badge + aria correct.
9. **FR-22-6 roster classification** + null-save migration finding (`470b2149`, parking P-FR226). **4-issue triage:** 3 of 4 reported editor bugs were stale/false (verified vs ground truth); only the animation panel was real.

## Current State
- **Branch:** `feat/theme-blocks-wave1` at `0afd6ab1` — 12 commits, pushed, NOT merged to main (Bean times the merge with the cloning thread per the commit-race lesson).
- **Tests:** no unit suite; `php -l` clean on all touched PHP; `npm run build` green.
- **Build/deploy:** all blocks + theme deployed to sandybrown canary; live-verified. `/sgs-update` run 3× clean (68 blocks).
- **Uncommitted changes:** none — working tree clean.

## Outcome vs Completion (Gate 3.5)
- Waves 1–3 blocks/fixes: **OUTCOME ACHIEVED** — each live-verified (render + behaviour + measurement), committed, gated.
- Product-card Phase B: **OUTCOME ACHIEVED** — data model round-trips via REST + panel renders. (Phases C/D/E are correctly future work, not completion theatre.)
- `sgs/cart`: **CODE SHIPPED, OUTCOME PARTIALLY HIT** — core mechanism (SSR + hydrate + no-jQuery + a11y) verified live; the badge-INCREMENT-on-add-to-cart E2E is NOT yet tested (canary has 0 WC products). Next session seeds a WC product to close it.

## Known Issues / Blockers
- **Cart badge-increment E2E untested** — needs a WooCommerce product on the canary (0 exist). Same Store API fetch path as the verified hydration; low risk.
- **FR-22-6 Wave-2A migrations gated** on resolving the null-save→InnerBlocks finding (parking P-FR226) framework-wide first.
- **Merge to main pending** — Bean directs it when the cloning thread is at a clean point (concurrent-commit-race avoidance).

## Notes for Next Session
- **Theme CSS cache-bust:** theme assets (e.g. `mega-menu-panels.css`) key `?ver=` off the theme `Version:` header — bump `theme/sgs-theme/style.css` Version on any theme-CSS change. Block CSS busts via block.json version. (Caught live this session — the contrast fix didn't apply until the theme version bumped.)
- **CPT meta needs `custom-fields` support** — a CPT must declare `supports => 'custom-fields'` for `register_meta`+`show_in_rest` to expose the `meta` field in REST. Without it, zero meta round-trips.
- **Triage before fixing** — 3 of 4 reported editor bugs were already fixed/false; verifying against ground truth (REST render, edit.js read, editor repro) before dispatching saved a wasted wave.
- **Product-card Phase C = dual-source** (D149): bind to WC-native data when WooCommerce present, custom CPT meta otherwise. Brainstorm + research the WC Block-Bindings pattern BEFORE building.

## Next Session Prompt
See `.claude/next-session-prompt-theme.md` (manual WC product to close cart + enable Phase C testing; product-card Phase C dual-source binding; remaining theme tasks).

---

# Session Handoff — 2026-06-01 (SGS THEME thread, session 3)

> Theme/blocks/editor-UX thread. Cloning pipeline → `.claude/handoff.md`. Next steps → `.claude/next-session-prompt-theme.md`.

## Completed This Session

1. **Mobile-nav full-fix** (`1f985c9a`, deployed + live-verified, D143). Bean's report ("opens tiny, no menu, can't close") root-caused live (CDP, 375px, logged-out) and fixed in 4 parts: **(a) overlay sizing** — `--overlay` variant now overrides the Popover UA `fit-content` defaults (`width:100vw + height:100vh/100dvh + inset:0`) → fills viewport 375×812 (was 208×158); **(b) 16px block-gap strip** — WP flow-layout `:root :where(.is-layout-flow) > *{margin-block-start:16px}` was pushing the drawer down; doubled block class `.sgs-mobile-nav.wp-block-sgs-mobile-nav` (0,2,0) beats it → flush at y:0; **(c) empty menu [universal bug]** — `render_menu_items()` didn't handle `core/page-list` (WP's DEFAULT nav content), so default headers showed 0 menu items; added a `core/page-list` case expanding the published page hierarchy (verified 0 → 13 items + link nav to `/hero-clone-poc/`); **(d) header-only inserter** — new `mobile-nav-inserter-scope.php` (`allowed_block_types_all`, fail-open) removes the 2 chrome blocks from the post/page inserter, keeps them in the Site Editor. view.js confirmed close/ESC/accordions bind without a trigger. block.json 3.0.1→3.0.3 (cache-bust). Visual report `reports/visual-diff/mobile-nav-2026-06-01.md`. `/sgs-update` run clean (10 stages).

2. **Product-card / `sgs/option-picker` design RATIFIED** (D144). Bean answered the 6 open decisions in `.claude/reports/2026-06-01-product-card-option-picker-design.md`; all accepted, two upgrade the design: **(1)** per-type `display_as` mode (`pills` | `static-list` "Available in 3 flavours: …" | `hidden`) + card-level "price only" toggle; **(2)** SKU matrix deferred (editor warning, first type wins); **(3)** filled-in-card/outlined-global pills + 3 CSS states (resting/considering/selected); **(4)** emit `sgs/option-picker` DIRECTLY from the clone (Bean corrected 2026-06-01 — opposite of rec; build the picker ASAP + battle-ready, then wire into the pipeline); **(5)** source toggle in BOTH toolbar + inspector; **(6)** Gutenberg-panel editor UI. Encoded into Spec 24 §FR-24-11/12/15. **The product-card BUILD (Task 2) is now a near-term priority** (Bean: build the option-picker ASAP + battle-ready) — these are the recorded contract the build session inherits.

3. **`/qc-council` doc-consistency audit** (`352bd804`) — 3 cross-model raters over this session's touched docs; resolved 3 real findings (Spec 24 ↔ prompt Phase-D contradiction; stale state.md commit; prompt Task-2 ambiguity) + dismissed 1 false positive (visual-diff report path). `/sgs-update` then run clean (10 stages, 66 SGS blocks, 188 total, WP 7.0, no schema drift).

4. **Full doc-currency sweep across registry + `.claude/` + specs + plans** (Bean-directed; landed in `603cbaaf` — see the commit-race note below). 5 cross-model reader agents over the un-audited doc set. Fixes: documented the cloning thread's D145 (is-style carry + tag-authoritative leaf) + D146 (sgs/button replaces core/button) from their commits; added the missing Spec 11 to `docs-registry.yaml`; Spec 02 §5 trust-bar RETIRED→ACTIVE (slug-reuse clarified); block-count drift 67→66 / attrs 2074→2077 / core 121→122 (verified vs DB); FR-22-20 "design-pending"→"PARTIALLY SHIPPED" (D134); **struck the R-22-14-violating "add legacy fallback" instructions in the phase-2 plan** (a future implementer would have broken a P1-locked rule); parking gift-variant OPEN→CLOSED + duplicate-header OPEN→PARTIAL; duplicate-D93 → D93b; two future-dated headers corrected; pipeline-flow D145/D146 callout; strategy/step2 SUPERSEDED marker.

## Current State
- **Branch:** `main` @ `66444790` — this thread's work (theme code `1f985c9a`; doc commits `ffdbc8d2` D143/D144 + `352bd804` qc-council + the doc-sweep inside `603cbaaf`) is MERGED to main + pushed; the shared `feat/fr22-4-1-universal-wrapper` is DELETED (local + remote); GitHub clean. Bean directed the merge (2026-06-03) once both threads closed (no-ff, zero conflicts). Future theme work starts fresh from `main`.
- **Tests:** no unit suite for mobile-nav; `php -l` clean on all touched PHP; `npm run build` green.
- **Build/deploy:** mobile-nav v3.0.3 deployed to sandybrown canary; live-verified.
- **Uncommitted changes:** none — everything (both threads' code + docs + the leftover lucide/trust-badges/reports/TRUTH-SPEC) is committed + merged to main. Working tree clean.

## Outcome vs Completion (Gate 3.5)
- Mobile-nav: **OUTCOME ACHIEVED** — full-screen + populated 13-item menu + closeable (button+ESC) + links navigate, all live-verified on canary.
- Product-card 6 decisions: **OUTCOME ACHIEVED** — decisions ratified + recorded in Spec 24/D144/report. The BUILD is correctly scoped as deferred (Task 2), not completion theatre.

## Known Issues / Blockers
- **Merge done (2026-06-03)** — both threads closed, Bean directed the merge; `feat/fr22-4-1-universal-wrapper` merged to main + deleted. No longer a blocker.
- **Mobile-nav editor-inserter E2E deferred** — the `allowed_block_types_all` filter is logic-reviewed + fail-open (can't break the editor); the editor-side confirmation (open post inserter, verify the 2 blocks absent) wasn't run. Low risk.
- **Heading/text dormant-variant values (from 7b)** — Bean may want to tweak the agent-added default CSS or drop heading `hero` as redundant.
- **Concurrent-commit race (resolved by the merge)** — during the two-thread session, the theme doc sweep got swept into the cloning thread's `603cbaaf` commit (both threads `git add`/commit the same working tree). Nothing lost; history co-mingled but now all on main. Captured as memory `feedback_concurrent_commit_race_shared_tree`. **Avoid recurrence:** don't run two sessions on one shared branch/tree — use a fresh short-lived branch or separate worktree per thread, commit by explicit path (never `git add .`).

## Notes for Next Session
- **CDP top-layer quirk:** synthetic `dispatchMouseEvent` clicks on popover-internal elements don't reliably trigger anchor nav / hit-test in headless Chrome; programmatic `.click()` + real taps work. Verify popover interactions via `.click()` or visual screenshot, not a CDP click + URL check.
- **Cache-bust on block CSS/JS changes:** bump the block.json `version` field — WP keys the asset `?ver=` off it; redeploying without a bump serves stale CSS to returning visitors (caught live this session).
- **Mobile-nav menu source:** the drawer reads the header `core/navigation` → resolves `ref`/innerBlocks → falls back to the newest `wp_navigation` post; `core/page-list` is now expanded. If a site's mobile menu is empty, check the header nav has a populated `wp_navigation` or page-list.
- **Cloning thread moved under us (parallel, same branch):** since this thread's last code commit, the cloning thread shipped D145 (is-style carry + tag-authoritative leaf routing), D146 (`sgs/button` replaces `core/button` + `sgs/multi-button` grouping), D147 (button `inheritStyle` presets + `video`/`iframe`→`sgs/media`). Net effect for theme work: bare `<a>`/`<button>` now clone as `sgs/button`, and CTA groups as `sgs/multi-button`. Its current priority is CSS-transfer fidelity (D136). Read `.claude/decisions.md` D145-D147 if Task 2's Phase-D clone-emit interacts with the button/multi-button routing.

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
