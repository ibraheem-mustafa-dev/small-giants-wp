# Session Handoff — 2026-06-12 (theme thread) — Spec 30 P2 SHOP LAYER COMPLETE + merged to main (D214)

## Completed This Session
1. **QA Gate C — FR-30-5 product search, 7/7 live-verified on canary** (security-critical). Hammered `GET /sgs/v1/product-search`: draft 1017 never leaks (`q=pricing/P4/test` → only published 540); >30/IP/min → 429 + `Retry-After`; response `{id,title,permalink,thumbnail}` only + `no-store` + `q=1char`→400; XSS-inert (server `wp_strip_all_tags` + client `textContent`); no-JS `<form method=get name=s>`+hidden `post_type=product`; `check-product-search-guards.js` (11 guards) wired to prebuild. Report `plugins/sgs-blocks/reports/spec30-p2/QA-Gate-C-FR-30-5-search-2026-06-12.md`.
2. **Placed the search block** in `parts/sgs-archive-toolbar.html` (it was registered but UNPLACED — the lone homepage `sgs-product-search` string was the editor-script handle) → re-ran C-6 live on `/shop/`: axe 0, `aria-expanded` flip, listbox populated, "2 products found" live region, ArrowDown→`aria-activedescendant`. Commit `30b6ed71`.
3. **QA Gate B filter half — FR-30-6 live-verified.** Seeded the real `pa_flavour` block across the 16/15 boundary (+4 published terms → input at 16; −1 → absent at 15; a draft-only term stayed at 15), narrowing announced "4 of 16 options shown", then **restored the canary to its 12-term clean state**. Report `QA-Gate-B-FR-30-6-filter-2026-06-12.md`. Commit `ef7d7bbb`.
4. **`/sgs-update`** confirmed both blocks registered; **D214** recorded; shop layer (FR-30-3/5/6) marked complete. Commit `28cb542f`.
5. **`sgs/product-search` `displayMode` variants** (Bean request) — `inline` (always-visible bar) + `icon` (native `<details>` disclosure, expand-on-click, no-JS-safe; JS only focuses the field on open + Escape/outside-click closes). Sonnet-built, QC'd (inline output byte-identical), live-verified both on `/shop/` (axe 0, keyboard combobox, no-JS forms). v1.0.0→1.1.0. Commit `2ed98a1e`.
6. **Search is opt-in via patterns, not a forced default** (Bean architectural call). Reverted search from `parts/header.html`; created 3 header patterns `sgs/header-search-bar-above`/`-below`/`-icon` (Block Types `core/template-part/header`, category `sgs-headers`) → Site Editor "Replace" picker. Theme `style.css` 1.5.1→1.5.2 (required for the new pattern files to register — WP caches the pattern-file list against the theme version). Commit `53ccf6f9`.
7. **Doc sync (5 docs)** to D191–D214 via 5 parallel sonnet agents, each grounded in decisions.md + the auto-gen reference + real block dirs, QC'd against ground truth (fixed one hard-coded count): specs 01/02/17 + plugin/theme CLAUDE.md. The auto-gen `02-SGS-BLOCKS-REFERENCE.md` untouched. Commit `b3dbc5c1`.
8. **Merged to main** (`141ddd71`) via the co-active-safe temp-worktree cherry-pick — 9 theme commits onto `origin/main`, resolving one Testimonial-row conflict (kept main's newer v0.3.1 + D212 gotcha + my D206/D209 attribution); cloning thread's WIP on the feat branch left untouched; local main fast-forwarded.

## Current State
- **Branch:** `feat/spec30-p2-shop-schema` at `b3dbc5c1` (primary worktree, undisturbed); **`origin/main` at `141ddd71`** (carries all this session's theme work).
- **Tests:** no unit suite run; live QA gates B+C passed on canary; prebuild guards pass.
- **Build:** plugin builds clean (v1.1.0); theme deployed v1.5.2.
- **Uncommitted:** only never-stage drift (`lucide-icons.php`, `reports/phase4-*.txt`, `theme-snapshot.json`) + the cloning thread's unmerged WIP commits on the feat branch.

## Known Issues / Blockers
- None blocking. The header `list` axe violation is the pre-existing core nav block (`.wp-block-navigation__container`), tracked for FR-30-13 — not the search blocks (both axe-0).

## Next Priorities (in order)
1. **Step 9 — FR-30-9 schema** (net-new Organization+WebSite JSON-LD + cart/checkout/account noindex + returnPolicyCountry + drop FAQPage). `/adversarial-council` draft-leak red-team FIRST.
2. **Step 10** — parked P1 follow-ups (gallery-swap decision + notify-me build-or-defer).
3. **Step 11/12** — go-live checklist + phase close + R-22-13 + merge → Spec 30 COMPLETE.

## Files Modified
| File | What changed |
|------|--------------|
| `plugins/sgs-blocks/src/blocks/product-search/{block.json,edit.js,render.php,view.js,style.css}` | `displayMode` inline+icon variants (v1.1.0) |
| `theme/sgs-theme/parts/sgs-archive-toolbar.html` | placed `sgs/product-search` (FR-30-5) |
| `theme/sgs-theme/parts/header.html` | reverted search (kept default search-free) |
| `theme/sgs-theme/patterns/header-search-bar-above.php`, `-below.php`, `-icon.php` | new opt-in header search patterns |
| `theme/sgs-theme/style.css` | Version 1.5.1→1.5.2 (pattern-cache bust) |
| `.claude/specs/{01,02,17}*.md`, `plugins/sgs-blocks/CLAUDE.md`, `theme/sgs-theme/CLAUDE.md` | doc sync to D191–D214 |
| `.claude/decisions.md`, `.claude/state.md`, `.claude/plans/2026-06-11-spec30-p2-*.md` | D214 + state + plan progress |
| `plugins/sgs-blocks/reports/spec30-p2/QA-Gate-{B,C}-*.md` | QA evidence |

## Notes for Next Session
- New lesson captured: **theme-pattern-cache-busts-off-theme-version** (new `patterns/*.php` won't register until `style.css` Version bumps — feedback file + dashboard id 346 + theme CLAUDE.md Gotchas).
- The `<details>`/`<summary>` native-disclosure pattern is the no-JS-safe way to build expand-on-click in a WP block (see `product-search` icon mode) — STOP entry added.
- Merge to a co-active-held main: temp-worktree cherry-pick of THIS thread's commits only; expect a conflict on shared append-files (`decisions.md`, `CLAUDE.md`) — keep both sides.

---

# Session Handoff — 2026-06-11 NIGHT (theme thread) — Spec 30 P2 Gate A + Gate B COMPLETE + merged to main (D213)

## Completed This Session
1. **FR-30-3 shop archive SHIPPED + live-verified + merged (Gate B, D213).** The WC filter sidebar renders AND filters the grid instantly on canary `/shop/` (click 12-pack → 5→3 products in 253ms, no reload). Two hand-authored-markup bugs root-caused against WC 10.8's canonical `templates/blockified/archive-product.html`. Commit `7b953761` (16 files).
2. **Root cause #1 — empty filter panels:** the `woocommerce/product-filter-*` blocks were authored SELF-CLOSING; WC parent filters server-render their inner control block (the view modules only wire existing markup). Fixed by nesting `product-filter-price-slider` / `product-filter-chips` / `product-filter-checkbox-list` per WC `ancestor` decls + correcting `displayStyle` `"chips"` → `"woocommerce/product-filter-chips"`.
3. **Root cause #2 — no instant filtering:** the `product-collection` lacked `tagName:"div"` + its wrapper `<div class="wp-block-woocommerce-product-collection">` + `queryId:0`/`isProductCollectionBlock:true`; WC injects `data-wp-router-region` into the collection's first `<div>` only when `forcePageReload` false → no wrapper = no router region = URL changed but grid never re-queried. Fixed to match WC's canonical structure.
4. **Equal-height cards + baseline-aligned CTAs** (theme CSS, `.sgs-shop-layout`; `.price-row margin-top:auto`); redundant core "Filter products" overlay button hidden on desktop; mobile "Filter" toggle reuses primary-button tokens (FINDING: no global `.btn` in theme — parked).
5. **Accessible mobile filter drawer** (`assets/js/sgs-shop-filters.js`): off-canvas, focus-trap, scroll-lock, Escape-close, return-focus — all live-verified at 375px.
6. **NEW `sgs/collapsible-text` block** verified: operator SEO read-more, full text always SSR'd (CSS line-clamp not display:none), empty renders nothing, labels i18n'd via server `data-read-more`/`data-read-less` (commit `8fb94df1` + plugin rebuild/deploy).
7. **axe-clean shop content** (1 pre-existing core nav-block `list` issue = header chrome, FR-30-13); cross-family qc-council MERGE-OK — 2 rater HIGHs (resize-listener accumulation, price-slider target-size) REFUTED against code + axe + the alternative price text-inputs.
8. **Merged Gate A (`93ce8706`) + Gate B + i18n to main (D213)** via isolated temp-worktree cherry-pick (co-active cloning thread holds the shared tree + has staged testimonial work — left untouched).

## Current State
- **Branch:** work done on `feat/spec30-p2-shop-schema`; theme commits cherry-picked to `main` (D213). HEAD of feature branch `8fb94df1`.
- **Tests:** no unit suite for this work; live Playwright verification + axe-core 4.10 (0 shop violations) + pre-commit visual-diff gate + SGS pre-merge gate all green.
- **Build:** sgs-blocks `npm run build` passes (dead-control guard green); theme v1.5.1 deployed to canary.
- **Uncommitted changes:** co-active cloning thread's STAGED testimonial/converter work in the shared tree (NOT mine — do not sweep).

## Known Issues / Blockers
- The PDP `aggregateRating` source is unresolved for FR-30-9: `build_aggregate_rating()` reads WC-native review count but the displayed reviews are Trustpilot (won't emit despite 5 live reviews) — decide a DMCC-honest source in Step 9.
- One pre-existing core WP nav-block `list` axe issue (header chrome) — tracked for FR-30-13, not introduced by this work.

## Next Priorities (in order)
1. Step 6 — FR-30-6 searchable attribute filter (seed 16-term + 15-term fixtures first).
2. Step 7a/7b — FR-30-5 product search: design-gate (`/brainstorming` + `/adversarial-council`) then hardened-REST build; security-critical (draft-leak/429/XSS zero-tolerance).
3. Step 9 — FR-30-9 schema (audit shipped PDP + build Organization/WebSite/noindex/returnPolicyCountry; drop FAQPage; decide aggregateRating source).
4. Steps 11/12 — go-live checklist + phase close + merge.

## Files Modified
| File path | What changed |
|-----------|--------------|
| theme/sgs-theme/templates/archive-product.html | filter inner control blocks + product-collection wrapper/tagName/queryId + query-pagination + collapsible slots |
| theme/sgs-theme/assets/css/woocommerce.css | filter UI styling, equal-height cards + CTA baseline, overlay-button hide, toggle primary-button tokens |
| theme/sgs-theme/assets/js/sgs-shop-filters.js | NEW accessible mobile filter drawer |
| theme/sgs-theme/functions.php | enqueue sgs-shop-filters.js on shop/archive |
| theme/sgs-theme/style.css | Version 1.4.8 → 1.5.1 (theme-CSS cache-bust) |
| plugins/sgs-blocks/src/blocks/product-card/{block.json,render.php} | loop-context binding (usesContext postId) |
| plugins/sgs-blocks/src/blocks/collapsible-text/* | NEW block + i18n'd read-more labels |
| reports/visual-diff/{product-card,collapsible-text}-2026-06-11.md | visual-diff PASS reports |
| .claude/{state.md,decisions.md,parking.md,plans/2026-06-11-spec30-p2-...md} | D213 + progress + parked follow-ons |

## Notes for Next Session
- WC block markup is the trap: when a WC block renders empty/half, read its block.json `ancestor` chain + WC's own canonical template (`woocommerce/templates/templates/blockified/`) BEFORE theorising CSS/hydration.
- There is no global `.btn`/`.btn-primary` in the theme (product-card-scoped) — reuse tokens or extract a utility.
- Merge to the shared main via temp-worktree cherry-pick only; the cloning thread holds the tree with staged work.
- The plugin build output is `plugins/sgs-blocks/build/blocks/<block>/`, not repo-root `build/`.

# Session Handoff — 2026-06-11 EVENING (theme thread) — Spec 30 P1 COMPLETE

## Completed This Session
1. **Spec 30 P1 COMPLETE — working PDP + cart loop shipped, Bean R-22-13 signed off, merged to main.** Executed Steps 5–7 of `.claude/plans/2026-06-11-spec30-p1-wc-chassis.md` + a `/ui-ux-pro-max` design wave + a 9-point Bean fix wave. FR-30-12 (product-page cloning) is now UNGATED.
2. **FR-30-7 — new block `sgs/buybox`** (commit `17ee951a`): a thin PDP wrapper that mounts the SHIPPED `sgs/product-card` Interactivity store (proxy cart-write M-C2, 409 re-sync, availability greying). Composes N option-pickers + ONE manifest + price row + add-to-cart. Live on product 540: ≥3 combos add exact variation, foreign id 4xx, dismissible error, single-variant axes suppressed. Design rationale: `.claude/reports/spec30-p1/STEP5-BRIDGE-DESIGN.md`.
3. **FR-30-4 — Mini-Cart/cart/checkout styling + COD** (commit `17ee951a`): core `woocommerce/mini-cart` in header (token-matched icon), branded drawer, COD enabled, test order completed.
4. **`/ui-ux-pro-max` design wave** (commit `91364a2b`): Bean flagged the missed mandatory design pass; uimax surfaced 4 gate-invisible defects — empty Beta gallery → classic `woocommerce/product-image-gallery` fallback; unstyled CTA → token accent button; price moved above pickers; empty related band → composed `product-collection` + categorised fixtures.
5. **`sgs/tabs` first-ever deploy** (commit `1ac49442`): PDP "Product details" tabs (Description/Ingredients/Nutritional/Allergens — allergens = FR-30-13f statutory slot). Flushed TWO latent tabs bugs root-caused live: context-stripped child render (post-content rendered empty) + duplicate nested `role=tabpanel` (8 panels for 4 tabs). Both fixed at source.
6. **Bean R-22-13 9-point fix wave** (commit `1ac49442`): alternating full-width section bands; branded sale badge; buybox 3-pill grid + larger gallery; trust-bar band; full-width related band + equal-height cards (CTAs pinned); cart-icon colour match; shop archive = `sgs/content-collection` of Bound product-cards with pickers off (new additive `showPickers` attr). Multi-image gallery verified live (thumbnails + swap + zoom on product 540).
7. **Merged to main + reconciled the co-active thread.** FF-pushed P1 (`1ac49442`→`b18fadb0`) to origin/main; then reconciled origin/main with the cloning thread's 25 unpushed local-main commits via merge `9f357129` (zero conflicts; both lines verified present; their local main now FF-clean on next pull). Bean authorised the divergence.
8. **`/sgs-update` run:** DB reconciled (71 blocks, +4 attrs, 0 orphans).
9. **P1 archived + Spec 30 P2 planned + qc-council-revised.** Archived the P1 plan → `plans/archive/...-COMPLETE.md`; `/phase-planner` produced ONE consolidated P2 plan (`plans/2026-06-11-spec30-p2-differentiators-shop-schema.md`, docscore A) covering FR-30-8/10/3/6/5/9/13 + the 2 parked follow-ups, with a binding ORCHESTRATION MODEL (Opus orchestrates / subagents implement). `/qc-council` on the plan (sonnet ground-truth + haiku spec-fidelity raters) found + fixed 8 ground-truth defects pre-execution (wrong file targets, a non-existent meta key, FR-30-9 mis-scoped as audit-not-build). All on `origin/main` via temp-worktree cherry-pick.

## Current State
- **Branch:** `feat/spec30-wc-chassis` (HEAD moved to a cloning-thread commit `23d58249` — their territory); **`origin/main` at `b02f2e21`** (theme P1 + P2 plan + qc-council revision; P1 reconcile-merge `9f357129` underneath).
- **Tests:** no suite run; builds green via `npx wp-scripts build` (the co-active container `control-ux` gate fails `npm run build` — not theme-thread scope).
- **Build:** passes. Deployed to sandybrown canary throughout; live-verified product 540 + /shop/.
- **Uncommitted:** the cloning thread's staged converter/orchestrator/conformance files in this worktree's index — LEFT UNTOUCHED (not theme work; path-scoped commits only). Also `lucide-icons.php` + a cloning plan file (working-tree, never-stage / not mine).

## Known Issues / Blockers
- None block the next theme session. Two parked P1 follow-ups: per-variation gallery image-swap (`P-WC-GALLERY-VARIATION-SWAP`) and notify-me capture (`P-WC-NOTIFY-ME-CAPTURE`).
- Pre-existing parking dup slug `P-BATCH-GA-14-SKILLS` (not from this session) — flagged for merge/rename.

## Next Priorities (in order)
1. **P2 Differentiators (recommended):** FR-30-8 live per-unit/value-ladder price coupling on the PDP (the conversion moat) + FR-30-10 DMCC-compliant reviews (Trustpilot/verified-buyer).
2. **P4 Schema** (parallelisable): FR-30-9 schema audit per page type + FR-30-13 go-live checklist.
3. **P3 Shop:** FR-30-3 archive UX + FR-30-6 searchable filter + FR-30-5 custom SGS search (effort tentpole, own design gate).

## Files Modified
| File path | What changed |
|-----------|-------------|
| plugins/sgs-blocks/src/blocks/buybox/* | NEW block (render/edit/style/block.json/index/save) — option-picker→cart bridge |
| plugins/sgs-blocks/src/blocks/product-card/{block.json,render.php,view.js} | `showPickers` attr; engine `dismissCartStatus` + operator labels |
| plugins/sgs-blocks/src/blocks/content-collection/{block.json,render.php} | forward `showPickers`/`ctaBehaviour`/`showLadder` to cards |
| plugins/sgs-blocks/src/blocks/{tabs,tab}/render.php | context-preserving child render; removed duplicate tabpanel ARIA |
| theme/sgs-theme/templates/{single-product,archive-product}.html | section bands; shop = content-collection; related collection |
| theme/sgs-theme/parts/{sgs-pdp-content,sgs-pdp-gallery,sgs-pdp-buybox,sgs-archive-toolbar,header}.html | tabs section; classic gallery; buybox; query-title prefix; mini-cart |
| theme/sgs-theme/assets/css/woocommerce.css | sale badge, gallery fill, trust band, equal-height cards (theme 1.4.6) |
| .claude/{decisions,state,parking,next-session-prompt-theme,handoff-theme}.md | P1-close records |
| reports/visual-diff/{tabs,tab,content-collection}-2026-06-11.md | visual-diff gate reports |

## Notes for Next Session
- **Full orchestration plan + STOP catalogue + pre-flight ritual:** `.claude/next-session-prompt-theme.md` (P2/P4 menu).
- **Gallery does NOT swap per variation at P1** — the classic-gallery fallback severed the Beta block's add-to-cart-form coupling. P2 decision (parked).
- **Notify-me DEFERRED** — `notifyMeLabel` control ships but renders nothing until a PECR-guarded capture path is built (parked; baselined in dead-controls).
- **Co-active main reconcile:** their local main (`9c0321e6`) is now an ancestor of origin/main → their next pull FFs cleanly. Their staged converter work in this index was left untouched.
- **Mini-cart self-hides on cart/checkout = WC-core hardcoded** (`visibility:hidden` when `is_cart()`/`is_checkout()`); intentional, no workaround shipped.

## Next Session Prompt
The operative theme-thread opener is **`.claude/next-session-prompt-theme.md`** (full orchestration plan, STOP catalogue, pre-flight ritual, P2/P4 menu). Not duplicated here to avoid drift. The root `.claude/next-session-prompt.md` belongs to the co-active cloning thread — do not overwrite it.

---

# Session Handoff — 2026-06-11 AM (theme/blocks thread)

## Completed This Session
1. **R-22-13 block-quality remediation — all 12 of Bean's review points shipped + merged to main** (D209). Three waves on `feat/block-quality-mirror`, fast-forwarded to `main` (`26374b51..bd850804`).
2. **Shared `TypographyControls` component built** (`src/components/TypographyControls.js`) + **`sgs_typography_css_rule()`** PHP helper (`includes/helpers-typography.php`, auto-loaded via render-helpers). Canonical sgs/text UI: responsive size slider + unit dropdown, weight/style dropdowns, line-height. Replaces the blank-box/token controls.
3. **6 blocks migrated to the component** (string fontSize → number+unit+responsive, blank-box controls removed, helper-driven uid-scoped `<style>`, legacy-string back-compat): counter, whatsapp-cta, mobile-nav, option-picker, trust-bar, product-card. Found via a `/wp-blocks` audit.
4. **Wave-1 bug fixes:** trust-bar icon circle invisible→overridable default border (live-DOM root-caused); trust-bar title placeholder leak; badge-size hidden for icon-circle; testimonial quote stuck-italic; notice-banner iconColour control; sgs/icon left/centre/right alignment toolbar.
5. **announcement-bar RETIRED → notice-banner announcement mode** (#11): `displayMode=announcement` (sticky top/bottom, full-width, z-1000) + accessible close button + WP-Interactivity dismiss (session/permanent storage) + pre-paint anti-flash script. Live interaction-tested (pages 1080 + 1096). announcement-bar block deleted.
6. **qc-council finishing gate** (2 cross-model raters + inline): security MERGE-OK; 1 false-positive blocker (verified), 1 real blocker (dismiss key was per-request `wp_unique_id()` → fixed with content-hash fallback, live-verified).
7. **Typography component documented MANDATORY** in `plugins/sgs-blocks/CLAUDE.md` Block Customisation Standard.
8. **`/sgs-update` run:** DB reconciled — 70 SGS blocks, +72 attrs, announcement-bar + 25 orphan attrs pruned, `02-SGS-BLOCKS-REFERENCE.md` regenerated.

## Current State
- **Branch:** `main` at `bd850804` (block-quality work merged; `feat/block-quality-mirror` still exists — co-active cloning thread also commits to it).
- **Tests:** no test suite run this session; build green (dead-control + F3 guards pass) on every wave.
- **Build:** passes. Deployed to sandybrown canary throughout; live-verified.
- **Uncommitted:** phase4 reports + `02-SGS-BLOCKS-REFERENCE.md` (sgs-update regen) + lucide-icons.php (never-stage) — doc artifacts committed with this handoff.

## Known Issues / Blockers
- 1 live `sgs/announcement-bar` instance on the canary homepage now shows the deleted-block placeholder (clone fixture — needs re-clone or manual swap to notice-banner announcement mode).
- Co-active hazard persists: `feat/block-quality-mirror` shared with the cloning thread; `main` checked out in their worktree `C:/tmp/sgs-p4`. `git branch --show-current` before every commit; merge via FF-push or temp worktree.

## Next Priorities (in order)
1. **WooCommerce page-type build (Spec 30 / D208)** — the theme thread's delegated work: `add_theme_support('woocommerce')` + single-product/archive templates + custom SGS search+filter blocks + option-picker→WC variation binding + Mini-Cart drawer styling + schema audit.
2. **Parked polish** (Bean's choice): announcement-bar homepage fixture swap; trust-bar `gridItemPadding` dead-on-split note (cosmetic); option-picker `labelFontWeight` block.json position NIT.
3. **Optionally refactor the 5 canonical blocks** (text/heading/button/label/quote) to use the shared `TypographyControls` (they duplicate the pattern inline) — pure consistency, low priority.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/src/components/TypographyControls.js` | NEW shared typography component |
| `plugins/sgs-blocks/includes/helpers-typography.php` | NEW `sgs_typography_css_rule()` helper |
| `plugins/sgs-blocks/src/blocks/{counter,whatsapp-cta,mobile-nav,option-picker,trust-bar,product-card}/*` | typography migration |
| `plugins/sgs-blocks/src/blocks/{trust-bar,testimonial,notice-banner,icon}/*` | Wave-1 bug fixes |
| `plugins/sgs-blocks/src/blocks/notice-banner/{block.json,edit.js,render.php,style.css,view.js}` | announcement mode |
| `plugins/sgs-blocks/src/blocks/announcement-bar/` | DELETED |
| `plugins/sgs-blocks/CLAUDE.md` · `.claude/decisions.md` · `.claude/CLAUDE.md` | typography MANDATORY note + D209 + pointer |
| `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` · `reports/phase4-*.txt` | sgs-update regen |

## Notes for Next Session
- The hero "padding triple-routed" defect is the **converter's** `_process_container_children` fold logic (D207, convert.py:4435), NOT a hero-block fault — the WS-4 hero remodel (section IS an sgs/container) is correct; hero needs zero block changes. That fix belongs to the cloning thread.
- The typography component honours a **legacy string fontSize** verbatim (helper back-compat) — existing content never breaks despite the string→number type change. All 6 migrated blocks are dynamic (no deprecated.js needed).
- F3 guard requires font-weight/line-height literals in `var(--x, default)` form once a `*FontWeight`/`*LineHeight` attr exists — do NOT clean them to plain literals (re-triggers the guard).

## Next Session Prompt

~~~
You are continuing the SGS theme/blocks thread. The R-22-13 block-quality remediation is COMPLETE + merged to main (D209). The next major work is the WooCommerce page-type build (Spec 30, delegated from the cloning thread's D208).

Invoke /autopilot first. This is the THEME/BLOCKS thread (NOT the cloning pipeline — sibling `.claude/next-session-prompt.md`). Read `.claude/handoff-theme.md` + `.claude/decisions.md` (D209/D208) + `.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md`.

## READ BEFORE ANYTHING ELSE — warm-start + STOP catalogue (carried forward, do NOT subtract)
- **STOP — verify the branch before EVERY commit.** `git branch --show-current` + `git log origin/main --oneline -5`. `main` is checked out in the cloning thread's worktree `C:/tmp/sgs-p4`; `feat/block-quality-mirror` is shared. Commit path-scoped (`git commit -m "..." -- <paths>`, never `git add -A`); merge to main via FF-push or temp worktree, never disrupt the co-active tree. Leave never-stage artefacts untouched: `lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, `.parity-golden.json`, phase4 reports, build/.
- **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change; scp the WHOLE block set; opcache-reset; verify the served `?ver`.** WP reads each block's `style.css`, not `style-index.css`.
- **STOP — bump block.json version with ANY style.css change** (Hostinger CDN caches block CSS 7 days on the ?ver URL).
- **STOP — typography controls use the shared `TypographyControls` + `sgs_typography_css_rule()` (D209), NEVER bespoke blank-box font controls** (plugins/sgs-blocks/CLAUDE.md Block Customisation Standard).
- **STOP — a guard on ONE write path is not a guard; enumerate every path. show_in_rest:false on PHP-authored metas; strict '1'===(string)$v casts.**
- **STOP — REST/one-shot gates CANNOT see admin/editor defects; a visual pass (Playwright 375/768/1440) is MANDATORY for any new admin/editor/shop UI.**
- **STOP — clean up superseded controls when changing a block** (one control per setting; no dead/duplicate/render-without-control/vestigial attrs).
- **STOP — WC products edit in the CLASSIC screen, not Gutenberg** (`use_block_editor_for_post_type('product')` FALSE).
- **STOP — a file-scope `extends \WC_*` class fatals the whole site if required before WC loads; require inside woocommerce_loaded + parse-time class_exists guard.**
- **STOP — CPT capability maps use PLURAL primitives; singular meta-caps break the mapped cap site-wide.**
- **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), not theme.json on disk.**
- **STOP — public product/text/XML endpoints: enumerate WC visibility states (visibility=>catalog), raw post_password, entity-decode display strings, ?cb= CDN-bust when verifying.**
- **STOP — schema/OG/feed price ALWAYS inc-VAT + from the MANIFEST; FAQPage is dead (drop it); ONE Product node per PDP.**
- **STOP — passing automated gates ≠ DONE; expect Bean's R-22-13 eye to catch more.**
- **STOP — fact-check every subagent claim against live ground truth; rater findings are HYPOTHESES.**
- **STOP — build via PowerShell (`npm run build`), NOT Bash; WP guard-blocked ops via token-gated webroot one-shot (native PHP, quoted literals).**

## Pre-flight self-attestation (answer before first action)
1. Which thread am I? (theme/blocks — NOT cloning.) 2. What branch is the tree on? (`git branch --show-current`.) 3. Has main moved? (`git log origin/main --oneline -5`.) 4. Is Spec 30 read end-to-end before proposing a build sequence? 5. What's the measurable acceptance for the task I'm about to start?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — live routing + ADHD support |
| `/brainstorming` | architectural/feature decisions (Spec 30 build sequencing) |
| `/gap-analysis` | grade any unit vs its FR acceptance |
| `/strategic-plan` + `/phase-planner` | plan the Spec 30 build before code |
| `/research` (+ `/library-docs`) | WC block APIs (Store API, @woocommerce/block-data variation selectors), 2026 WC block ecosystem |
| `/sgs-wp-engine` + `/wp-block-development` + `/wp-rest-api` + `/wp-plugin-development` | the WP build |
| `/qc-council` | MANDATORY before any WC-write / converter / SGS-block commit (blub.db 255) |
| `/verify-loop` | 2-attestation on load-bearing claims |
| `/ui-ux-pro-max` + chrome-devtools/Playwright | MANDATORY visual pass on any new editor/admin/shop UI |
| `/dispatching-parallel-agents` + `/subagent-driven-development` | disjoint build pieces / implementer→review loops |
| `/sgs-update` | after any block add/change |
| `/delegate` | model per dispatch (sonnet default; haiku = 2nd council family; Gemini account-blocked) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools / Playwright (often HELD by the co-active session) | live editor/shop verification + screenshots + 3-breakpoint |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` (app-password Basic auth) | products + variations |
| SSH + token-gated webroot one-shot | guard-blocked WC ops; `ssh -p 65002 u945238940@141.136.39.73`; creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | disjoint WP build pieces (templates, blocks, bindings) — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku) | security / 2nd-council-family review |

## Task 1 — WooCommerce page-type build (Spec 30 / D208)
**What:** build the WC page-type chassis the cloned product page needs. **Why:** the product-page clone is GATED on D-1 (deploy to the single-product block template, not a WP Page) — outcome = a working product template + the differentiated SGS UX on it. **Estimated:** multi-session; first session = /strategic-plan + /phase-planner the build, then start the theme-support + template chassis.
**Orchestration:** plan inline (Opus); delegate disjoint build pieces to sonnet subagents (no commit authority) via /subagent-driven-development; /qc-council before any WC-write commit.
**Brief:** read Spec 30 (FR-30-1..12) + D208 end-to-end. Build: `add_theme_support('woocommerce')` + single-product/archive block templates + custom SGS search+filter blocks (framework asset, no per-client licence) + option-picker→WC variation binding via Store API add-item (confirm `@woocommerce/block-data` variation-read selector first) + Mini-Cart drawer styling (core block, style only) + price-display + schema per the D-8 table (Product+Offer+returnPolicyCountry, aggregateRating/genuine reviews, ONE Product node; shop = BreadcrumbList + URL-only ItemList; drop FAQPage). All responsive 375/768/1440. NO static fake reviews (DMCC illegal — Trustpilot/verified-buyer only).
**Acceptance:** FR-30 acceptance criteria met + Bean R-22-13 visual sign-off at 3 breakpoints.

## Guardrails
- Build via PowerShell (`npm run build`), not Bash. Deploy whole block set + opcache-reset + verify served ?ver. Live-verify on the canary before declaring done (R-22-11).
- /qc-council (cross-model: sonnet + haiku + inline; Gemini account-blocked) before every converter/WC-write/SGS-block commit.
- WCAG 2.2 AA, mobile-first, 44px targets, 4.5:1 contrast. UK English everywhere.
- Outcome vs completion: code shipped ≠ outcome achieved. Don't mark a task done until its FR acceptance + Bean's eye pass.
~~~
