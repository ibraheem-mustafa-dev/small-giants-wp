# Session Handoff — 2026-06-10 (SGS THEME thread, session 20 — FP-H/FP-E built-in product-card + grid product mode + page-level ItemList SHIPPED TO FINAL FORM; D204)

> Theme/blocks thread. Cloning → `.claude/handoff.md`. Co-active cloning session shares `main` AND held the working checkout on `feat/stage1-converter-core` all session — every theme commit landed on `main` via a TEMP WORKTREE (`C:/tmp/sgs-specs`), path-scoped (`git commit -- <paths>`), never `git add -A`; never-commit artefacts (lucide-icons.php, sgs-framework.db, phase4 reports, 02-SGS-BLOCKS-REFERENCE.md) left uncommitted.

## Completed This Session
1. **FP-DRAFT-FIX rename** — Mama's draft product cards unified to one `sgs-product-card` BEM prefix (variants as root modifiers, pill state `__pill--active`, `__title` on the h3); zero-pixel-change proof. Specs 02+27 sign-off (`f04e5bc3`/`36279457`/`d929f26c`).
2. **FP-H SHIPPED (`eccc3fc7`+closures)** — `sgs/product-card` is BUILT-IN-ELEMENT in all modes (zero InnerBlocks in typed; page-144 transition bridge branches on the `productName` attr). Connect+override UX (overrideElements toggles, price never overridable, image override = default with live variation swaps), CTA model, per-instance `visibleAxes`, `showLadder` (default on; grid passes off).
3. **FP-E SHIPPED** — `sgs/card-grid` `wc-product` mode: `wc_get_products` only, smart collections (best-selling/price-high/low/top-rated), category+tag checklists, featured/on-sale (4× refill)/in-stock, hand-pick, FR-24-6 empty state, renders product-cards.
4. **Schema (research-check verdict, persisted)** — card emits NO schema; ONE page-level ItemList per page (`Product_Item_List` shared walker); ProductGroup gated to single-product-focus pages.
5. **Adversarial-council pass (`da2ec8ef`, D204)** — 5 personas; CONFIRMED draft/private-product → public-JSON-LD leak CLOSED (shared `is_publicly_listable()` gate at all 5 boundaries, live-proven); customer-safe deleted-product message; grid double-query memoised; M4 REST-bypass REFUTED by fact-check.
6. **2-rater visual judgement** — 9 findings closed, 3 refuted (interactive-block-in-stills artefacts), 2 → gated rounds; axe 0 violations (1069 + 540); WCAG-safe palette-agnostic contrast fixes.
7. **`/sgs-update` RAN** — 2 new blocks + 36 new attrs registered; content-routing attrs all mapped (converter-routable); the new NULL-canonical_slot attrs are operator-config (correct, NOT a gap). Stage 11 container-roster drift flagged for the cloning thread (no bad data — refused to --apply).

## Current State
- **Branch:** all theme work on `main` at `da2ec8ef` (pushed). Worktree `C:/tmp/sgs-specs` detached at that HEAD (remove after).
- **Tests:** `php -l` + WPCS clean on every touched PHP; standalone runners green; axe 0 violations live (1069 + 540).
- **Build:** `npm run build` green; product-card v1.16.3; all deployed to sandybrown canary, opcache-reset.
- **Uncommitted (worktree, never-commit):** lucide-icons.php, phase4 reports, 02-SGS-BLOCKS-REFERENCE.md.

## Known Issues / Blockers
- **None block the next session.** The shop layer is correct, secure (leak closed), legally-safe, and converter-routable.
- Stage 11 container-wrapping-roster lists `sgs/product-card` missing + the F2 thread's `product-faq` blocks extra — cross-thread, no corruption (bailed pre-apply); container-roster owner (cloning thread) reconciles.
- The real first-shop blocker remains the cloning CONVERTER — do not out-run it (Ship-PM council call).

## Next Priorities (in order)
1. **Converter Stage-2 routing** (CLONING thread) — route the canonical draft BEM vocabulary (Spec 02 §"Canonical draft BEM vocabulary") to the typed-attr destinations + live clone-verify the Mama's product section. The card is converter-ready; the converter isn't.
2. **Parked P-FP-COUNCIL residuals** (theme, low priority) — `P-FP-H-BRIDGE-RETIRE` forcing-function, namespace the 2 global helpers, dedup CTA-label/visibleAxes logic, out-of-stock button state, editor go-live checklist.
3. **2 gated design rounds** — option-picker roving tabindex (F12); widthMode wide/full vs B-rule precedence (Rule-7 shared-wrapper, needs Bean).

## Files Modified
| File path | What changed |
|-----------|--------------|
| plugins/sgs-blocks/src/blocks/product-card/{block.json,render.php,edit.js,style.css,view.js} | built-in render, connect+override, CTA model, showLadder, contrast fixes, v1.16.3 |
| plugins/sgs-blocks/includes/product-card-builtin-render.php (NEW) | typed built-in render + override-resolution helpers |
| plugins/sgs-blocks/src/blocks/card-grid/{block.json,render.php,edit.js,components/product-panels.js} | wc-product mode, smart collections, ladder pass-through |
| plugins/sgs-blocks/includes/class-card-grid-products.php (NEW) | wc_get_products builder + refill + memo + ItemList builder |
| plugins/sgs-blocks/includes/class-product-item-list.php (NEW) | page-level ItemList walker + is_publicly_listable gate |
| plugins/sgs-blocks/includes/configurator-head.php | ProductGroup focus gate + leak gate |
| .claude/specs/02 + 27, decisions.md (D204), parking.md (P-FP-COUNCIL), reports/wave2/FP-E-FP-H-DESIGN-GATE | doc-sync |

## Notes for Next Session
- A council finding is a HYPOTHESIS — fact-check before acting. M4 (discount-label REST bypass) was REFUTED: the registered `sanitize_callback` IS the full validator.
- The NULL `canonical_slot` on the 36 new attrs is CORRECT — the converter routes CONTENT, not operator-config. Do NOT "fill" them.
- New lessons (blub 335/336): `cpt-singular-meta-caps-break-the-mapped-capability-sitewide`; `bump-block-version-with-any-style-css-change`.
- The image-override bind asymmetry (variable unconditional / non-variable absent) is INTENTIONAL — do not "fix" it.
- Canary test artefacts kept for Bean's R-22-13 eye: page 1069 (FP live test) + screenshots `.claude/reports/visual-fp/`; products 897/950/1017; pages 946/999; RT templates.

> Theme/blocks thread. Cloning → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. Shared tree on `feat/stage1-converter-core` all session — ALL theme work done in a temp worktree on main (C:/tmp/sgs-r4, removed at close), every commit path-scoped. A SECOND theme session was co-active mid-session (its commits `f5f3449b`/`db89ebae` interleaved between my two pushes — R4 language pass + deeper visual pass; converged cleanly, no conflicts).

## TL;DR
The last two open Spec 27 units shipped: **R4 agency slug-templates** (`0d7badb8`, D202 — template CPT + export/import/apply REST + WC product-editor panel; live acceptance: export 540 → import → apply to a fresh product → 48 variations → PREFLIGHT publish → 16-pill configurator) and **F2 AI-citation/feeds** (`95754224`, D202 — Merchant feed + llms.txt/llms-full.txt + sgs/product-faq FAQPage block). Spec 27/28 now complete except the deliberately gated R5 + P4. The theme thread has NO mandatory build work left — the first-shop blocker is the cloning converter.

## Completed this session
1. **R4 SHIPPED (D202, `0d7badb8`)** — built via /subagent-driven-development (sonnet implementer; spec FAIL→3 fixes [export nonce, dead 256KB guard, file splits ≤300]; haiku quality CHANGES-REQUIRED→i18n 21-key strings map; sonnet red-team SHIP [16 vectors clean] + H1 swatch non-clobber + H2 single-path axis). 10 files, 56/56 standalone assertions. Live round-trip acceptance proven on canary (template 947 → import 948 → apply to product 950 → published → page 999 renders 16 pills). Co-active follow-up (`f5f3449b` language pass + `db89ebae` report) fixed 2 deeper browser-only bugs: pure-JSON data element + **CPT singular meta-caps had broken manage_woocommerce SITE-WIDE** (memory `cpt-singular-meta-caps-break-the-mapped-capability-sitewide`).
2. **F2 SHIPPED (D202, `95754224`)** — 3 parallel sonnet sub-units (all hit context limits mid-build, all resumed to completion): (a) Merchant feed `GET /sgs/v1/merchant-feed` — per-variation RSS 2.0 `g:` items, SEC-1 manifest prices (zero wc_get_price_to_display/get_children), shared `Product_Schema::product_group_id()` (promoted public — one call site), SEC-7 deep-links; (b) /llms.txt + /llms-full.txt — text/plain, noindex, navigation-map anti-cloaking, SEC-9 defer, 700KB cap; (c) sgs/product-faq + -item blocks — native details/summary, merged FAQPage JSON-LD via wp_footer collector, copy grep-gated (zero "rich result" matches). **Red-team BLOCK fixed pre-commit: the feed query had no visibility filter — "Search results only" products leaked to the public endpoint** (+ stampede locks, 2000-item cap, session-independent password guard, JSON_HEX_TAG). Live probes: exfil PASS (search-only → 0 feed items, 0 llms-full), feed↔schema price parity PASS (48/48 byte-identical), FAQ page 1008 renders + valid JSON-LD, editor pass zero console errors, 540 regression-clean.
3. **Live-caught defects fixed during rollout** — the invented `wp_get_privacy_policy_url()` fatal (real: `get_privacy_policy_url`); HTML-entity leak in text/plain + XML contexts (`get_bloginfo` display filters → html_entity_decode before write); CDN-cached feed masking fixes (cb-buster verification).
4. **Docs (D202 commit)** — Spec 27 rows flipped (R4/F2 SHIPPED; only R5 marked NOT BUILT); decisions.md D202; parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE` RESOLVED → memory/parking-archive.md; next-session-prompt-theme.md rewritten (STOP catalogue 40→45, D101 count gate passed).

## Current state
- **Branch:** theme work all on `main` (pushed through the docs commit); shared tree remains on the cloning branch — untouched.
- **Tests:** R4 standalone runner 56/56; php -l + WPCS clean on every touched file.
- **Live:** everything deployed on the sandybrown canary, opcache-reset, front 200, configurator 16 pills, all three F2 surfaces serving.
- **Canary fixtures left intentionally:** templates 947/948 (+2 rater "RT" templates), product 950 + page 999 (R4 acceptance), page 1008 (FAQ acceptance) — Bean decides keep/delete.

## Known issues / blockers
- None blocking. F2 niceties parked (feed g:shipping, llms-full pagination, CDN image allowlist — see next-session-prompt).
- Bean R-22-13 eye pending on: R4 panel screenshots (visual-r4/), F2 FAQ editor shot, P3 polish go/no-go.

## Next priorities
1. Bean R-22-13 queue (ranked in next-session-prompt-theme.md).
2. **Default: switch to the cloning CONVERTER thread — the single first-shop blocker.**
3. R5 + P4 stay GATED (R5 = /brainstorming design first if un-gated).

---

# Session Handoff — 2026-06-09 (SGS THEME thread, session 18 — #17 + Spec 27 v6 + Spec 28 P2 + P3 + P3 visual pass ALL SHIPPED; D196–D200)

> Theme/blocks thread. Cloning → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. **CO-ACTIVE HAZARD ESCALATED:** the cloning thread switched the shared tree to `feat/stage1-converter-core` MID-SESSION — one theme commit (`343d6605`) landed on their branch tip and was recovered by cherry-pick to main via a TEMP WORKTREE (now `84899c2c`); the duplicate auto-drops when they rebase. New rule: `git branch --show-current` before EVERY commit, recover via temp worktree, never touch their ref.

## TL;DR
Council backlog 100% closed (#17) + Spec 28 P2 engine + P3 preview authoring + a visual qc-council pass that caught 2 browser-only bugs — five units shipped, all live-verified on canary 540, all on main through 187c2643 (D196-D200). Next: R4 + F2, the last two Spec 27 units.

## Completed this session
1. **Wave 3 #17 SHIPPED (D196, `b273db02`)** — lean-seed stripper centralised into `includes/configurator-seed.php` (render.php + PREFLIGHT + LeanSeedSizeTest delegate; the 3-copy drift class is dead); `render-helpers.php` 1533→46-line loader + 7 cohesive `helpers-*.php`; `class-cart-proxy.php` 1029→749 + `Cart_Limits`/`Cart_Cache_Purge` extracted (net hook table identical). 3-rater adversarial /qc-council + 5/5 equivalence harness; canary 540 BYTE-IDENTICAL post-deploy (143,987 B); live PREFLIGHT ready=true; lean seed 20,326 B/48 combos. **OUTCOME ACHIEVED.** Council backlog now 100% closed.
2. **Spec 27 v6 (D197, `21108cfe`)** — Bean-requested F2 research corrections applied pre-build: `speakable` DESCOPED (dead for e-commerce); FAQ copy must claim AI-citation + Bing, never Google rich results (deprecated 2026-05-07) — enforced by a grep gate in the F2 done-when; feed/llms.txt clauses hardened. Research pack: `.claude/reports/2026-06-09-f2-gold-standard-research.md`. **OUTCOME ACHIEVED.**
3. **Spec 28 P2 SHIPPED (D198, `bf769cee`)** — pure-PHP pricing engine (`includes/class-pricing-engine.php`, zero WP calls): power-law floor-truncated + charm bands + guardrails in spec order; canonical fixture EXACT (499/899/1699/3099p); 53/53 standalone assertions, re-run independently. **OUTCOME ACHIEVED.**
4. **Spec 28 P3 SHIPPED (D199, `aa599097`)** — preview-only authoring: WC settings tab + product_cat term fields + classic product-data panel with live preview table; ONE cascade resolver (site→category→product, 42/42); `POST /sgs/v1/pack-pricing/preview` (edit_post + schema-gated). ZERO WC price writes live-proven. Implementer died at context limit (work complete but UNWIRED — grep-the-wiring caught it); LIVE FATAL on rollout (file-scope `extends \WC_Settings_Page` + alphabetical load order) rolled back <1 min + double-guarded; sonnet security review → 5 findings fixed (incl. rater's WRONG nonce action string caught against live WC source). **OUTCOME ACHIEVED.**
5. **P3 visual qc-council pass SHIPPED (D200, `84899c2c` + `187c2643`) — Bean-requested.** Orchestrator drove the live admin (chrome-devtools; Playwright held by cloning session); 3 adversarial raters on screenshots. Caught 2 browser-only FUNCTIONAL bugs (settings tab NEVER REGISTERED — `WC_Settings_Page` is admin-LAZY, the class_exists guard at woocommerce_loaded silently unregistered it; preview button never bound — head-printed JS, no DOM-ready guard) + 12 findings fixed (2 measured WCAG AA failures; pence-vs-pounds blocker → "p" suffix on inputs; jargon summary → plain English; disclosure restructured, bold no-live-prices line first; ONE canonical name "SGS Smart Bulk Pricing"; identical strength wording across 3 surfaces; flex-wrap; table headers). All re-verified live click-through (exact P2 fixture rows). Report + screenshots: `.claude/reports/visual-p3/`; 2 after-shots sent to Bean. **OUTCOME ACHIEVED (R-22-13: Bean's own eye still to confirm on the sent screenshots).**
6. **Lessons + docs** — `file-scope-wc-class-extends-must-load-lazily` captured (memory + MEMORY.md, re-capped 24,496/24,576 after archiving 8 stubs); D196–D200 recorded; parking + Spec 27/28 status rows flipped; all pushed to main.

## Current state
- **Branch:** SHARED TREE on `feat/stage1-converter-core` (cloning thread's). **Theme work is ALL on `main` at `187c2643`**, pushed. Theme commits: `b273db02`/`eef7b465` (#17+docs) · `21108cfe` (Spec27 v6) · `bf769cee`/`571d6286` (P2+docs) · `aa599097`/`63a43b57` (P3+docs) · `84899c2c`/`187c2643` (visual pass+D200, via temp worktree).
- **Tests:** pricing engine 53/53 + cascade 42/42 (standalone PHP runners; PHPUnit vendor/ not installed locally); php -l + WPCS clean on every touched file (1 false-positive warning: manage_woocommerce capability sniff).
- **Build/deploy:** all LIVE on sandybrown canary, opcache-reset, front page 200, configurator 16 pills + ladder intact, preview click-through generates exact fixture rows, zero WC writes proven.
- **Uncommitted (shared tree, NOT mine):** cloning-thread artefacts only (lucide-icons.php, style.css files, reports) — untouched.

## Known Issues / Blockers
- The duplicate commit `343d6605` sits on `feat/stage1-converter-core`'s tip (same content as main's `84899c2c`) — harmless; auto-drops on rebase; cloning thread should not be surprised (recorded in D200).
- P3 deferred polish (non-blocking, in `.claude/reports/visual-p3/VISUAL-PASS-REPORT-2026-06-09.md`): WC two-column idiom refactor, 44px touch targets, emoji-indicator fragility, pack-sizes chip input, persistent preview-only admin notice.
- PHPUnit not installed locally (no vendor/) — standalone runners are the proof mechanism until composer install is decided.

## Next priorities (in order)
1. **R4 — agency slug-templates** (Spec 27 §FR-27-R4): `sgs_product_template` CPT + export/import endpoints (`manage_woocommerce`) + apply-provisions-via-R2; acceptance = export site A → apply site B → working configurator.
2. **F2 — AI-citation + secure feed** (Spec 27 §FR-27-F2 v6): FAQ block (corrected copy!) + llms.txt/llms-full.txt + Merchant feed; build FROM the research pack; /qc-council before the SEO-emit commit; the done-when grep gate on client-facing strings.
3. **Bean R-22-13 eye** on the visual-p3 screenshots (sent) + the P3 deferred-polish go/no-go.
4. Spec 28 P4 + R5 STAY GATED (do not pull forward — converter is still the first-shop blocker).

## Files modified
| File | What changed |
|---|---|
| plugins/sgs-blocks/includes/configurator-seed.php | NEW — canonical lean-seed stripper |
| plugins/sgs-blocks/includes/render-helpers.php + helpers-*.php (7) | 1533→46 loader + cohesive split |
| plugins/sgs-blocks/includes/class-cart-proxy.php + class-cart-limits.php + class-cart-cache-purge.php | money-path split, hook table identical |
| plugins/sgs-blocks/includes/class-pricing-engine.php + tests/php/PricingEngineTest.php + run-pricing-engine-standalone.php | NEW — P2 engine + 53/53 tests |
| plugins/sgs-blocks/includes/class-pack-pricing-{cascade,preview,settings-page}.php + pack-pricing-{settings,category-fields,product-fields}.php | NEW — P3 surfaces (+ visual-pass fixes) |
| plugins/sgs-blocks/includes/class-product-preflight.php + class-configurator-meta.php + class-sgs-blocks.php | stripper delegation / P3 metas / wiring |
| plugins/sgs-blocks/src/blocks/product-card/render.php + tests/php/LeanSeedSizeTest.php | stripper delegation |
| .claude/specs/27 + 28, decisions.md (D196–D200), parking.md, reports/ | docs + research pack + visual report |

## Notes for Next Session
- The P3 admin UI's two "guard timing" traps are now lessons: a file-scope `extends WC_*` class must lazy-require at the CONSUMER hook (WC_Settings_Page doesn't exist at `woocommerce_loaded` — guard there silently unregisters), and head-printed inline JS needs a readyState guard.
- The visual pass is now proven mandatory for any admin-surface feature: two functional bugs were invisible to every REST/one-shot gate.
- `rater suggestions are hypotheses`: the security rater's nonce action string (`woocommerce_save_product`) was WRONG — live WC source says `woocommerce_save_data`. Verify against ground truth before applying any rater's literal fix.

## Round-2 fixes (post-handoff, same session)
Bean's R-22-13 re-check caught 2 more WC-panel float defects (fadce85, D201 extended): the pounds field's half-width form-row-first wrapper let the attestation row float up beside it (help-tip overlapped its label) — now form-row-full; the axis select (width:100% + WC's float) orphaned its description's first word — now 400px-bounded with clear:both on the description. Both live-measured before + after; after-shots sent to Bean.

## Next Session Prompt
The full orchestration plan lives in `.claude/next-session-prompt-theme.md` (this thread's operative opener — R4 then F2, with the carried + extended STOP catalogue).

---

> Theme/blocks thread. Cloning → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. Cloning thread co-active on `main` ALL session — every theme commit was path-scoped (`git commit -- <paths>`); never-commit artefacts (lucide-icons.php, sgs-framework.db, theme-snapshot.json, phase4 reports) left untouched.

## Completed This Session
1. **Council must-fix Wave 1 SHIPPED (9 items)** — £0 add-to-cart blocked via `woocommerce_is_purchasable` override (#3); rate-limit-by-variations (#6); `WP_Error` 403 (#7); test-hook gated behind WP_DEBUG (#8); preflight cron RAND() (#10) + WC-placeholder no_image (#11); rollback surfaces failed-delete IDs (#12); edit-safety TTL→DAY (#15) + de-dual-fired delete warning (#16); NEW lean-seed ≤24KB PHPUnit test (#18). Commits `04e62cdd` + batch. Caught 3 real subagent defects (cut-off, wrong-premise #16, an invented `WC_Product::get_image_url()` runtime fatal in #11).
2. **Council must-fix Wave 2 SHIPPED (8 items, value-ladder authoring UI + UK consumer-law)** — product-data authoring fields + edit.js controls (#1); reference-price floor+ceiling+attested-only claim (#4); "Best value"→"Most popular" on decoy (#5); operator pack-size axis (#9); sale-tail denominator (#13); price-claim deny-list + NFKC/zero-width/no-space (#14); DMCC audit record (#19); inc-VAT consumer ladder (#20). Commit `34e7e427`. Grounded in DMCC 2024/CPRs/ASA/Price Marking Order research.
3. **3-team adversarial red-team pass — 6 real gaps found + fixed + re-verified** — REST meta write bypassing the #4 floor + #19 audit (`show_in_rest:false`); rogue-string attestation via `(bool)` cast (strict `'1'===`); £0 "save 100%" (skip ≤0 rows); deny-list Unicode/CamelCase evasion (NFKC); decoy badge; + a **PREFLIGHT `manifest_over_cap` FALSE-POSITIVE** (its lean-subset hand-copy had DRIFTED from render.php's real strip → blocked publishing the valid 48-SKU fixture; aligned exactly). `/qc-council` separately caught the attestation-not-read-at-render blocker.
4. **Wave 3 #2 SHIPPED** — grounding showed WC products edit CLASSIC (not Gutenberg), so the publish-block reason is now a classic-editor `admin_notices` reader of the persisted `_sgs_preflight_issues` (commit `dbb96b6c`); + auto-set Google variesBy at provisioning via `/subagent-driven-development` (sonnet impl + sonnet-spec + haiku-quality review; mapping live-verified) (commit `0bf4f2a7`).
5. **Docs + DB prep** — D180 + D181 recorded (`b94c4b33`, `edcd0d40`); parking backlog updated (Wave 1/2/3#2 shipped, #17 + Phase 2 remain); `/sgs-update` clean (0 new blocks/attrs, DB current); 2 lessons captured; MEMORY.md trimmed back under the 24576 cap.

## Current State
- **Branch:** `main` — theme commits this session `04e62cdd` (Wave1) · `34e7e427` (Wave2) · `b94c4b33` (D180) · `dbb96b6c` (#2-part1) · `0bf4f2a7` (#2-part2) · `edcd0d40` (D181), all pushed + path-scoped. Cloning commits interleave.
- **Tests:** `php -l` + WPCS clean on every touched file; mapping + legal fixes live-verified on canary 540 (axe 15.71:1; 0 console errors).
- **Build/deploy:** all LIVE on sandybrown canary, opcache-reset. Product 540 republished (the PREFLIGHT false-positive had reverted it to draft).
- **Uncommitted (NOT mine):** cloning thread's container/social-icons/SpacingControl files + never-commit artefacts.

## Outcome vs Completion (Gate 3.5)
**OUTCOME ACHIEVED** — Wave 1, Wave 2 (+ adversarial hardening + PREFLIGHT fix), Wave 3 #2 all live-verified on canary 540 (£0 add blocked via mutate→restore; attestation gate on→savings/off→none; "Most popular" on decoy; deny-list vectors stripped; variesBy auto-mapped; publish-block now visible). R-22-13 signed off. Not completion theatre.

## Known Issues / Blockers
- **None block the next session.** The legal/security must-fixes are all live; the shop layer is correct + safe.
- The real first-shop blocker remains the CONVERTER (cloning thread) — the shop LAYER is done; don't out-run the converter.

## Next Priorities (in order)
1. **Wave 3 #17 — file-cohesion split + CENTRALISE the lean-seed stripper** (render.php / PREFLIGHT / the size-test all hand-copy it — that drift caused this session's PREFLIGHT false-positive). Plus split render-helpers.php (1500+) → colour/configurator-pricing/value-ladder/svg-kses + cart-proxy. Large, high-churn — do it deliberately, LAST.
2. **#2 optional** — a proactive pre-publish readiness check (lower value now the block reason is visible).
3. **Phase 2 — Spec 27/28 to 100%** — R4 slug-templates + F2 (FAQPage/llms.txt/Merchant feed); Spec 28 P2/P3. P4 WC-write + R5 AI-builder stay gated.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/includes/class-cart-proxy.php` | #3 £0 is_purchasable override |
| `plugins/sgs-blocks/includes/class-product-authoring-security.php` | #6 rate-limit-by-units + #7 WP_Error 403 |
| `plugins/sgs-blocks/includes/class-product-provisioning-args.php` | #8 WP_DEBUG-gated test hook |
| `plugins/sgs-blocks/includes/class-product-provisioning.php` | #12 rollback return-check + #2-part2 auto-variesBy |
| `plugins/sgs-blocks/includes/class-product-preflight.php` | #10/#11 + lean-subset-drift fix + #2-part1 edit-screen notice |
| `plugins/sgs-blocks/includes/class-configurator-edit-safety.php` | #15 TTL + #16 trash-vs-permanent |
| `plugins/sgs-blocks/includes/class-configurator-meta.php` | #1 metas + #4 validation + #14 deny-list + #19 audit + show_in_rest:false (GAP-1/2) |
| `plugins/sgs-blocks/includes/configurator-product-fields.php` (NEW) | #1 product-level authoring UI |
| `plugins/sgs-blocks/includes/render-helpers.php` | #13 sale-tail + #20 inc-VAT + BUG-1 ≤0-skip + AMB-1 sale-flag |
| `plugins/sgs-blocks/src/blocks/product-card/{render.php,edit.js}` | #1 controls + #5 badge + #9 axis + strict-attested |
| `plugins/sgs-blocks/tests/php/LeanSeedSizeTest.php` (NEW) | #18 ≤24KB size assert |
| `plugins/sgs-blocks/sgs-blocks.php` | require the new authoring-fields file |
| `.claude/{decisions.md,parking.md}` + `plans/2026-06-06-spec27-28-council-mustfix-wave-plan.md` (NEW) | D180/D181 + backlog + wave-plan |

## Notes for Next Session
- **A guard on ONE write path isn't a guard** — the REST meta API bypassed the save-hook's legal validation+audit; close unneeded `show_in_rest` doors. Meta security/legal gates use strict `'1'===`, never `(bool)`. (memory `guard-on-one-path-is-not-a-guard`)
- **A duplicated calculation drifts** — PREFLIGHT's lean-subset copy diverged from render.php → false publish-block. #17 centralises it. (memory `duplicated-calculation-drifts`)
- **WC products edit CLASSIC** (`use_block_editor_for_post_type('product')`=false) — no Gutenberg pre-publish panel; surface admin notices via persisted meta + `admin_notices`.
- **Gemini cross-rater is account-blocked** (403 "Lightning dunning decision deny") — use haiku as the second family for cross-model review.

---

# Session Handoff — 2026-06-05 (SGS THEME thread, session 16 — Spec 27 reconciled to v5 + D-wave (D176/D177/D179) + Spec 28 P1 value-ladder SHIPPED + /sgs-update + a 6-persona adversarial-council + verifier fact-check → a fact-checked must-fix backlog + doc-drift fixes)

> Theme/blocks thread. Cloning → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. **Decisions ALL committed this session: D176 + D177 (`535942f1`) + D179 Spec 28 P1 (`cd898a11`) — the session-15 "deferred D176/D177" Known Issue is RESOLVED.** Cloning thread co-active (took D178, `convert.py` lift fixes); commit by EXPLICIT PATH (`git commit -- <paths>` — a bare commit swept in co-active staged files once this session; lesson `git-commit-must-be-path-scoped-with-coactive-sessions`).

## Completed This Session (session 16)
1. **Spec 27 reconciled to v5 + Phase-2 plan marked COMPLETE** (`53532c0d`; doc-drift follow-ups this session). Verified every FR-27 "SHIPPED" marker vs real code/commits via a verification agent + fact-check; documented the COURSE-CHANGE (authoring R1/R2/R3 + PREFLIGHT pulled forward from "Phase R roadmap" into Cluster C); corrected the FALSE "mandatory image-sitemap" clause → DESCOPED; only R4/R5/F2 (Cluster D) remain unbuilt.
2. **D-wave recorded** (`535942f1` D176/D177 + state.md; `cd898a11` D179). D176 = R1 controller; D177 = Phase 2 COMPLETE (R2/R3/PREFLIGHT + QA-AUTHORING + R-22-13); D179 = Spec 28 P1 value-ladder shipped.
3. **Spec 28 P1 comparative value-ladder SHIPPED** (foundation `49d63ab8`, ship `e0dea916`, spec P1-row `b2d04c47`; product-card v1.13.0). SSR per-pack ladder on Bound `sgs/product-card`: per-unit price + Rule-of-100 saving + "Best value" badge; monotonicity guard (96-pack £0.62 suppressed vs 48-pack £0.51 → badge on the 48-pack); KJC-A anchor + KJC-B SSR-not-seeded (lean-seed held byte-identical 22408B); two pure helpers `sgs_saving_display`/`sgs_value_ladder`. Live-verified canary 540. Step-2 unit gate caught + fixed a 29%→28% float-floor bug; live QA caught + fixed a WCAG contrast fail (saving text 2.25:1 pink-on-cream → 15.71:1 near-black). Only Steps 5∥6 (CSS∥JS) parallelised; the render.php chain was a single sequential implementer.
4. **/sgs-update** ran clean: 5 new attrs registered, block-reference 191 blocks / 2744 attrs, uimax synced (191 SGS blocks), 0 orphans.
5. **6-persona adversarial-council + a verifier fact-check on the shipped Cluster C + Spec 28 P1 + docs.** Convergent headline (4 personas): the value-ladder shipped with NO authoring UI (savings silent by default; legal liability when a dev sets the anchor). Other must-fixes: PREFLIGHT publish-block invisible in the block editor; a live £0 Store-API bypass; two UK consumer-law items (fabricated reference price; "Best value" on a non-cheapest decoy pack). The fact-check REFUTED 2 council claims (unmanaged-stock cap; discount-label-as-code-bug). **Full FACT-CHECKED ~20-item backlog → parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`.** Grades: Security B+/B, Doc-accuracy B+, Maintenance C+, Strategy C+, Operability D+, Legal D.
6. **Doc-drift fixes** (Spec-Lawyer-found, fact-checked): Spec 27 `spec_version` 4→5; `sgs/trust-bar` DRAFT→SHIPPED (`d6358f32`, both feature-map row + FR-24-10 body); Phase D/E "uncommitted"→`c68b8cb6`; the next-session-prompt FIRST JOB (D176/D177 already committed) + creds path (`.claude/secrets/`, NOT repo-root) corrected; the git-commit-path-scoped + council-is-a-hypothesis STOPs added.

## Current State
- **Branch:** `main` at/after `cd898a11` (theme commits this session: `53532c0d` spec-reconcile, `535942f1` D-wave, `49d63ab8`/`e0dea916`/`b2d04c47` Spec 28 P1, `cd898a11` D179, + this session's doc-drift/parking/handoff commit). All pushed, all path-scoped.
- **Tests:** `php -l` + WPCS clean on all touched files; Spec 28 P1 helper unit gate + live canary QA PASS.
- **Uncommitted (NOT mine):** the cloning thread's `convert.py`/`next-session-prompt.md` + the never-commit artefacts.

## Outcome vs Completion (Gate 3.5)
**OUTCOME ACHIEVED** — Spec 27 is accurate to real code (v5), the D-wave is recorded, Spec 28 P1 is shipped + live-verified (with a real float bug + a real WCAG fail caught by QA, not theatre), and the council produced a FACT-CHECKED must-fix backlog (2 false positives filtered out) that is the next session's planned work. Not completion theatre.

## Known Issues / Blockers
- **None block the next session.** The council backlog is captured in parking + the NSP wave-plan; nothing is half-deployed.
- The must-fixes (value-ladder authoring UI, PREFLIGHT visibility, £0 bypass, 2 legal items) should land before a REAL paying client uses the shop — they're not emergencies (only the dev canary is live).

## Next Priorities
1. **PLAN + EXECUTE the council must-fix wave** (parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`; haiku+sonnet, file-disjoint waves — see the NSP wave-plan).
2. **Then Spec 27/28 to 100%** — R4 + F2; Spec 28 P2/P3 (P4/R5 deferred) — EXCLUDING the cloning HTML-draft product page (parallel cloning thread).
3. Strategic: the real first-shop blocker is the converter (cloning D178); don't out-run it.

## Notes for Next Session
- **A council finding is a HYPOTHESIS — fact-check before it drives a fix** (2 of this council's claims were refuted: an unmanaged-stock cap exists; the digit-strip is by-design).
- **`git commit -- <paths>`** always (a bare commit flushes the whole index; co-active sessions stage into it).
- **The value-ladder savings only show when `_sgs_base_price_pence` is set** — to QA the savings path, set it on the fixture via a token one-shot, then restore to 0 (the honest default is suppressed savings).


> Older sections (sessions 15 and earlier) moved to `memory/handoff-archive.md` (also in git history).
