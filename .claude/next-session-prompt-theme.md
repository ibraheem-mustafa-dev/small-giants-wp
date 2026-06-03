---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-03-theme-session9
generated: 2026-06-03
primary_goal: "SGS-THEME THREAD. Headline = BUILD Spec 27 Phase 1 (the read-through variable-product configurator that makes Mama's sell). The build is GATED on the cloning phase closing (it re-baselines pixel-diff). Until then: deploy the committed product-meta IDOR fix to the canary (collision-safe, do now), and pre-build the Spec 27 Phase-1 plan (/strategic-plan -> /phase-planner -> /adversarial-council) so the build starts warm the moment cloning closes. Last session's bookkeeping + S-grade are DONE. Spec 27 is the single MASTER for the product + WooCommerce layer (absorbed Spec 24 + 25)."
---

# Next Session - SGS THEME thread - BUILD Spec 27 (variable-product configurator)

> ## WARNING: READ THIS BEFORE ANYTHING ELSE - warm start
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). DO NOT START ANY TASK until you have read the MANDATORY READING LIST below, in order. The headline deliverable is BUILDING Spec 27 Phase 1, so the warm-up below front-loads the configurator architecture you need in your head before you write a line.
>
> **STOP - Spec 27 Phase 1 BUILD is GATED on the cloning phase closing.** The configurator re-baselines the Mama's pixel-diff (new live WC prices/images change the page), so building it mid-cloning corrupts the cloning thread's measurement gate. Check `.claude/next-session-prompt.md` + `.claude/state.md` (cloning thread) before starting the build. If cloning is still live: do Task A (deploy the security fix) + Task B (pre-build the plan, no code) only.
> **STOP - WC is the SINGLE SOURCE OF TRUTH; never mirror commerce data.** Price/sale/stock/variation-image/combination-validity/SKU/GTIN/cart all read through from WooCommerce live (`wc_get_product()` server, Store API `/wc/store/v1` client). SGS stores presentation/config ONLY (swatch term_meta, discount-label/gallery/unit-divisor variation postmeta, display-subset block attrs). `_sgs_sku_matrix` is DROPPED/superseded; do NOT build it. (Spec 27 principle 6 + clean-split.)
> **STOP - the SSR-wipe trap is the #1 way this build silently breaks.** WP Interactivity directives (`data-wp-bind`/`data-wp-text`) run SERVER-SIDE; binding one to a JS-only store getter resolves empty and WIPES the SSR literal. Every display binding MUST resolve against server-seeded `data-wp-context` whose default EQUALS the SSR literal. Per-variation derived values (% off, per-unit £) are seeded as concrete literals, never computed in a client getter. (Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`; Spec 27 hard constraints + FR-27-A2/B3.)
> **STOP - the client sends IDs + an attribute object, NEVER a price.** Add-to-cart POSTs `/sgs/v1/cart/add-item` with the variation `id` + `quantity` + `variation:[{attribute,value}]` (global attrs = `pa_`-slug; product-local = raw case-sensitive name). The SGS proxy validates (IDOR per-object + attribute-match + stock + caps) THEN forwards to WC Store API, which recomputes price AND re-validates stock server-authoritatively. Any client price field is ignored. (FR-27-G1/G2/G3.)
> **STOP - pages stay fully cacheable.** Oversell protection is a single live stock re-check on the explicit add-to-cart CLICK (one fragment call), NOT page-uncacheable rendering. Freshness via targeted purge on `woocommerce_variation_set_stock_status` + `wc_scheduled_sales` (sale start/end) + manual price edit, covering edge/CDN. Tax-correct: seed BOTH ex/inc-tax display values OR cache-exclude the price fragment + vary on tax context; price via `wc_get_price_to_display()` + decimals via `wc_get_price_decimals()`, never own division. (FR-27-G6/H3.)
> **STOP - Spec 27 is the single MASTER** for the product + WooCommerce layer (it absorbed Spec 24 + Spec 25 in v4; 24/25 are retired). Read Spec 27 before any product-card / option-picker / cart / content-collection / configurator change. FR-24-x = the shipped card system (inherited); FR-27-x = the configurator (to build).
> **STOP - run `/adversarial-council` on the Phase-1 plan BEFORE building it.** It is the new bottled "pain-in-the-butt council" (parallel committed adversaries + convergence -> must-fix register + GO/NO-GO). It already caught Spec 27's structural over-scope the polite round missed. Polite-then-brutal (two rounds) for this high-stakes build.
> **STOP - don't assert block capability from a partial dump:** read block.json + edit.js + render.php + `/wp-blocks` before building on top of product-card / option-picker / cart.
> **STOP - triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / editor repro) BEFORE dispatching a fix. (Past sessions: multiple reported "bugs" were stale/false; this session's hero "both buttons primary" was a STALE clone, not a converter bug.)
> **STOP - verify against git, not the handoff:** run `git log --oneline -8` + `git branch` first; trust the repo over prose.
> **STOP - canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk.** FR-26-D2 (shipped) now writes that post via `push-theme-snapshot.py`, but a disk-only edit still re-diverges. `theme/sgs-theme/styles/mamas-munches.css` is an ORPHAN (not enqueued). (Memory `canary-live-styles-come-from-wp-global-styles-post`.)
> **STOP - global-styles architecture is SPEC'd: read `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (D158) BEFORE any theme.json / global-styles / per-client-theming change.** Build deferred except FR-26-D2 (shipped). FR-26-D1 RESOLVED/MOOT - do NOT clear canary post 7. Configurator swatch/pill colours derive from Spec 26 tokens (FR-27-I2).
> **STOP - block style controls must accept RAW CSS values + defaults stay overridable:** every default colour/spacing is `var(--sgs-x, <default>)` with an editor control accepting raw hex/px (theme.json `color.custom`/`customSpacingSize` true). (Memory `block-style-controls-accept-raw-css-and-overridable`.)
> **STOP - auto-contrast direction is DECIDED: build-time luminance** (compute WCAG luminance of the brand/swatch colour at deploy/render, pick black/white text for 4.5:1), with CSS `contrast-color()` as a later progressive-enhancement layer. Applies to pill text (FR-27-I2). Already recorded in Spec 26 non-goals + D161.
> **Guardrail (all tasks):** after every block build-deploy, open the WP editor on canary 144/514 and verify the control renders + zero console errors before considering the task done. Bump block.json `version` on any block CSS/JS change AND theme `style.css` `Version:` on any THEME-CSS change.

## State recap (plain English)
The SGS framework is a custom WordPress block library (theme + blocks plugin) whose product/WooCommerce layer is now substantial and fully specified. Last session (session 8): shipped Task A (auto-contrast decision = build-time luminance) + Task B (FR-26-D2 push-theme-snapshot REST-write); re-cloned Mama's homepage page 144 to fix the hero secondary button (stale-clone root cause); wrote + consolidated the **Spec 27 SGS Product & WooCommerce Layer master** (5 research agents + 2 qc-council rounds + re-scoped MVP-first + grade-A; absorbed Spec 24 + 25); fixed a live product-meta IDOR security bug (committed, deploy pending); built the new `/adversarial-council` skill (S-grade awarded); and completed all the shared-doc bookkeeping (Spec 24/25 retired, D161 logged, registry + CLAUDE.md updated). **What is left for this session:** deploy the IDOR fix to the canary, and (once the cloning phase closes) build Spec 27 Phase 1. Work from `main`; commit by explicit path (the cloning thread may be live in the same tree).

## First action (smallest step, <=5 min, zero deps)
Run `git log --oneline -8` + `git status` + `git branch --show-current`. Confirm HEAD is at/after `7038055f` (D161 bookkeeping) and that the only uncommitted files belong to the cloning thread (`testimonial-slider/*`, `reports/phase4-*`, `theme-snapshot.json`, `lucide-icons.php`). Then read the MANDATORY READING LIST. Then start Task A (deploy the security fix; it touches only the plugin, collision-safe) while you read into the Spec 27 build.

## MANDATORY READING LIST (read FULLY first, in order)
1. This file.
2. `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` - the MASTER. Read END-TO-END before any build. The "Variable-product configurator" chapter (architecture, clean-split, inter-block state, manifest payload, hard constraints, FR-27-A/B/C/G/H, Phase-1 acceptance gate) is the build spec.
3. `.claude/handoff-theme.md` (session 8 at top = this work; sessions 7/6 below = Spec 26 + Phase D/E/WCAG history).
4. `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` - global styles + per-client theming (D158); FR-27-I2 swatch/pill tokens derive from here.
5. `.claude/decisions.md` newest - D161 (Spec 27 master + IDOR + adversarial-council + auto-contrast), D158 (global-styles -> Spec 26), D151/D149 (dual-source Bound mode), D144 (option-picker ratification).
6. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` - block customisation standard, deprecation procedure (any static save()/attr change needs `deprecated.js`), gotchas, block-status table.
7. `.claude/parking.md` - P-AUTO-CONTRAST-LIGHT-PRIMARIES, P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES, P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM, P-PRODUCT-CARD-PILL-SWAP-DORMANT.
8. The product files before extending, with `/wp-blocks` + `/sgs-db` cross-check: `plugins/sgs-blocks/src/blocks/{product-card,option-picker,content-collection,cart}/` + `includes/class-product-bindings.php` + `includes/content-types/class-product-cpt.php`.

## Spec 27 Phase 1 build warm-up (the architecture in your head before you code)
**The product:** pills on a product card that swap price/image/sale/stock by reading WooCommerce live, so Mama's (48 SKUs) actually sells. The card is one WP Interactivity store; child option-pickers (one per attribute axis) read/write the shared `data-wp-context`; the card derives price/image/availability. Option-pickers own no commerce state.

**The wiring already shipped (Phase C structural):** dual-mode card (`sourceMode: wc-product | sgs-cpt | typed`), the `sgs-product/field` Block Bindings source (routes WC vs CPT via `source_args.source`), the editor product picker, add-to-cart via Store API firing `wc-blocks_added_to_cart` to the `sgs/cart` badge, and `sgs/option-picker` (radio-group, `sgs:option-selected` event). Phase 1 POPULATES that wiring with live WC variation data + the availability engine + the security proxy.

**What Phase 1 adds (FR list, each carries a build-model + test in the spec):**
- **FR-27-A1** resolver reads WC variations live (no `_sgs_variation_sets` commerce read on the WC branch; static-grep asserts it).
- **FR-27-A2** manifest seeded into shared context at SSR (sparse valid-combos + default literals; minor-int from `wc_get_price_to_display()`; <=24 KB context JSON; no XHR on pill `change`; long-tail prefetch on `pointerenter`/`focusin` only).
- **FR-27-A3** `sgs_product` CPT = no-WC fallback, secured (per-object `edit_post`; the IDOR fix). **FR-27-A5** defined degradation below WC 9.8 + WC-activation migration prompt.
- **FR-27-B1** WCAG 2.2 AA whole card (the first-mover claim; 4 objective gates: axe-core 0, keyboard radiogroup, NVDA announces label+state+price, 44px measured in Playwright).
- **FR-27-C1** cross-attribute availability past the 30-variation cliff (grey-out both directions, snapshot + add-to-cart 409 re-check + `aria-live` announce).
- **FR-27-G1/G2/G3/G6** the `/sgs/v1/cart/add-item` proxy: IDOR + attribute-match + per-object cap; nonce rotation + Cart-Token (sessionStorage, not cookie) + rate-limit; no-oversell via cacheable click re-check + per-SKU qty cap + cooldown + purge-on-stock/sale hooks.
- **FR-27-H1/H2/H3** lab INP <=200 ms (CI gate, no React bundle), LCP <=2.5 s + CLS 0 on swap, tax-context-correct caching.
- **FR-27-I-MVP** inter-block state + clone-compat (converter keeps emitting Typed option-pickers unchanged; Jest block.json schema-compat + PHPUnit deprecation tests) + a `seed-48-sku-fixture.php` dev script (WC PHP API, not the authoring path) to build the test product.

**Phase-1 ship gate (Spec 27 acceptance 1-6):** Bound WC card renders real price/stock/image, pills swap with no XHR-on-change, no-JS shows the default literal, context <=24 KB, card price == cart price across tax contexts; 48-SKU grey-out both directions + announced + post-load OOS caught at add-to-cart; axe-core 0 + keyboard + SR + 44px; tampered add-to-cart rejected/server-priced + flood capped + sale-end purges; lab INP <=200 ms + CLS 0; cloning emits Typed pickers unchanged + schema-compat passes.

**Deferred, do NOT pull forward:** Phase 2 (SEO/JSON-LD/schema/swatches/galleries) and Phase R (authoring controller + AI-builder). The brutal council flagged AI-builder-as-headline as the OC-Protector stall trap; it is an explicit roadmap behind a 2nd shop client, not this build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | design before build (the Phase-1 plan) |
| `/strategic-plan` -> `/phase-planner` | ALWAYS - turn Spec 27 Phase 1 into an ordered 16-field step plan |
| `/adversarial-council` | NEW - brutal pre-build pre-mortem on the Phase-1 plan BEFORE building (polite-then-brutal for this high-stakes build) |
| `/research` (auto-routes) | gold-standard before non-trivial implementations (WC Store API contract, Interactivity SSR patterns) |
| `/library-docs` | up-to-date WooCommerce / WP Interactivity / Block Bindings reference at point of use |
| `/sgs-wp-engine` + `/wp-block-development` | block dev - block.json, attrs, render, deprecations, Block Bindings |
| `/wp-rest-api` | the `/sgs/v1/cart/add-item` proxy + CPT meta + Store API auth |
| `/wp-interactivity-api` | the card store / shared context / SSR-safe directives (the SSR-wipe trap lives here) |
| `/systematic-debugging` | any bug - root-cause before fixing |
| `/qc-council` | MANDATORY before every converter/SGS-block commit (blub.db 255) - multi-rater, cross-model |
| `/visual-qa` or `/design-review` | editor UX + WCAG 2.2 AA verification (FR-27-B1 gates) |
| `/gap-analysis` | grade each build against Spec 27 Phase-1 acceptance |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/handoff` | session close |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | live editor + frontend verify on canary; the 4 a11y gates (axe, keyboard, SR, 44px bounding-rect); CWV/INP capture; no-JS fetch |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / capabilities / slots |
| REST global-styles (`/wp/v2/global-styles/7`) | the LIVE canary styles (supersedes theme.json) |
| WooCommerce Store/REST API (`/wc/store/v1`, `/wc/v3`) | product + variation + cart state; the add-item contract `variation:[{attribute,value}]` |
| `performance-auditor` agent | the FR-27-H1 lab-INP + bundle-budget gate |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy block / proxy / resolver / theme builds (Phase-1 FRs) |
| `design-reviewer` | editor UX + WCAG 2.2 AA review (FR-27-B1) |
| `performance-auditor` | INP / LCP / CLS / bundle budgets (FR-27-H) |

---

## Task A - Deploy the product-meta security fix to the canary (do FIRST, collision-safe)
**What:** deploy `class-product-cpt.php` (the per-object `edit_post` auth fix, commit `d07a7e05`) to the sandybrown canary + OPcache reset.
**Why:** the live IDOR fix is committed but not live; the canary still runs the vulnerable version (any `edit_posts` user could write another author's product meta).
**Effect (plain English):** stops a logged-in low-privilege user from editing product data they do not own.
**Orchestration:** delegated, single sonnet via `/delegate`. Context: `build-deploy.py` + the opcache-reset webroot trick (write `<?php opcache_reset(); ?>` to webroot, curl it, rm; CLI reset is a separate pool); collision-safe (touches only the plugin). Depends on: none. Parallel-safe with reading into Task B. /qc gate: `/qc-inline` (confirm a non-`edit_post` user cannot write `sgs_price` via REST on the canary).
**Acceptance:** the fix is live; a REST write of product meta by a user lacking `edit_post` on that object is rejected (403/401).

## Task B - Pre-build the Spec 27 Phase-1 plan (no code; warms the build)
**What:** `/strategic-plan` -> `/phase-planner` over Spec 27 Phase 1 (FR-27-A1/A2/A3/A5, B1, C1, G1/G2/G3/G6, H1/H2/H3, I-MVP) into an ordered 16-field step plan at `.claude/plans/`, then run `/adversarial-council` on that plan (polite-then-brutal). Resolve the open questions the build needs answered up front: FR-24 #9 (per-site capability-flag mechanism) and #7 (Block Bindings cover image + repeatable pack-options, or custom `get_value_callback`).
**Why:** the build is gated on cloning closing; pre-building the plan means the build starts warm and the council's must-fixes are baked in before any code.
**Effect:** when cloning closes, Phase 1 starts from a graded, adversarially-reviewed plan, not a cold spec.
**Orchestration:** inline (Opus) for the plan + council synthesis; design via `/brainstorming` if any FR needs a design decision. Depends on: none. /qc gate: `/adversarial-council` GO before the plan is considered build-ready.
**Acceptance:** a phase-plan exists; `/adversarial-council` returns GO (or the must-fixes are folded in and it re-returns GO); the two open questions have a recorded decision.

## Task C - Spec 27 Phase 1 MVP BUILD (GATED on the cloning phase closing)
**What:** build the read-through configurator MVP per the Task-B plan: live WC price/image/sale/stock swap, secure no-oversell add-to-cart via the `/sgs/v1/cart/add-item` proxy, WCAG-2.2-AA accessible card, cross-attribute availability past the 30-variation cliff, cacheable + tax-correct, lab-INP budget.
**Why:** makes Mama's sell with real variant pricing; the smallest shippable real configurator; plants the first-mover WCAG-AA claim.
**Effect:** Mama's homepage product cards become a working shop, accessibly and fast, with no WC React bundle.
**Orchestration:** `/subagent-driven-development` (sonnet implementers; opus for FR-27-A2 state+SSR-guard and FR-27-C1 availability store per the spec's per-FR model recommendations). Build the `seed-48-sku-fixture.php` first so every FR has a fixture to test against. **DO NOT START until `.claude/next-session-prompt.md` + `.claude/state.md` (cloning thread) show the cloning phase is closed** (it re-baselines pixel-diff). /qc gate: `/qc` multi-rater per configurator/converter commit + `design-reviewer` (a11y) + `performance-auditor` (INP) + Bean visual sign-off.
**Acceptance:** Spec 27 Phase-1 ship gate (acceptance criteria 1-6): real WC values + no-XHR-on-change + no-JS default + <=24 KB + price==cart across tax; 48-SKU grey-out both directions + OOS-after-load caught; axe-core 0 + keyboard + SR + 44px; tampered add-to-cart rejected + flood capped + sale-end purge; lab INP <=200 ms + CLS 0; cloning emits Typed pickers unchanged.

## Dependency graph
```
Task A (sonnet - deploy IDOR fix; collision-safe)          ─┐
Task B (inline Opus - Phase-1 plan + /adversarial-council)  ├─ parallel-safe, do now
                                                            ─┘
        ↓ (gate: cloning phase CLOSED - re-baselines pixel-diff)
Task C (Spec 27 Phase 1 BUILD; /subagent-driven-development; seed fixture first)
        ↓ /qc multi-rater + design-reviewer + performance-auditor + Bean sign-off per commit
Commit to main (explicit path; cloning thread may be live)
```

## Done last session (do NOT redo)
- **Spec 27 master** written, researched (5 agents), 2 qc-council rounds, re-scoped MVP-first, grade A, consolidated Spec 24 + 25 (`f9b7c8cb`).
- **Bookkeeping** complete: Spec 24/25 retired (`status: superseded` + `absorbed_by`), Spec 27 registered as master in `docs-registry.yaml`, **D161** logged, `.claude/CLAUDE.md` spec manifest + parking + Spec 26 non-goals updated (`14bb3a7c`, `7038055f`).
- **IDOR fix** committed (`d07a7e05`) - DEPLOY is Task A.
- **`/adversarial-council` skill** built (skillscore 96% A), **S-grade AWARDED** by Bean + hardened with battle-tested persona briefs; recorded in the skill's correction-ledger.
- **Hero secondary button** re-cloned + fixed on page 144 (stale-clone root cause).

## Guardrails (carried forward + extended)
- **Spec 27 = single master** for the product + WC layer; 24/25 retired. FR-24-x = shipped card system; FR-27-x = configurator to build.
- **WC = single source of truth; never mirror commerce data** - presentation/config only in term_meta / variation postmeta / block attrs. `_sgs_sku_matrix` dropped.
- **SSR-wipe trap** - every display binding resolves against server-seeded context whose default == the SSR literal; derived values seeded as literals, never client getters.
- **Client sends IDs + attribute object, never price** - server recomputes price AND re-validates stock at add-to-cart; per-object `edit_post`/`manage_woocommerce`, never the general cap.
- **Pages stay cacheable** - oversell = add-to-cart click re-check (one fragment), not uncacheable render; tax-correct via `wc_get_price_to_display()` + `wc_get_price_decimals()`, never own division; purge on stock/sale/price hooks.
- **Read block.json + edit.js + render.php + `/wp-blocks` before asserting any block's capability** - never infer from a partial dump.
- **Triage before fixing** - verify a reported bug still reproduces against ground truth BEFORE dispatching (hero "both primary" was a STALE clone, not a bug).
- **Deprecations required** - any change to a static block's save() or attribute schema needs a `deprecated.js`. Adding `sourceMode`/swatch attrs to option-picker/product-card must keep the Typed shape a deprecation-free subset (FR-27-I-MVP).
- **Never `source:html` on a dynamic block**; dynamic InnerBlocks blocks need `save:()=><InnerBlocks.Content/>`.
- **CPT meta needs `custom-fields` support** for REST `meta` exposure; meta `auth_callback` must be per-object `edit_post` (IDOR - fixed this session, deploy = Task A).
- **Cache-bust:** block.json `version` on block CSS/JS; theme `style.css` `Version:` on theme CSS.
- **Deploy + OPcache reset before measure** - `build-deploy.py` (+ opcache_reset webroot trick) before any browser/REST test, or you measure stale output.
- **Canary live styles = `wp_global_styles` post (ID 7)**, not theme.json on disk - FR-26-D2 now writes it, but disk-only edits re-diverge.
- **Block style controls accept RAW CSS values + defaults overridable** (`var(--sgs-x, default)` + theme.json custom values). Configurator swatch/pill colours derive from Spec 26 tokens (FR-27-I2).
- **No client-specific values in base theme/blocks** - client work lives in `sites/<client>/` + the snapshot/global-styles post.
- **WCAG 2.2 AA + 44px touch targets + mobile-first** on all new UI; the configurator's FR-27-B1 is the first-mover claim - sprint it and evidence it.
- **Work on `main`** (cloning thread may be live); commit ONLY your files by explicit path (never `git add .`/`-A`; `lucide-icons.php` + the cloning thread's `testimonial-slider/*`/`reports/phase4-*`/`theme-snapshot.json` stay untouched); `git status` before committing; verify `git log -1 --stat` after.

## Methodology guardrails (do not skip)
- **Run `/adversarial-council` on the Phase-1 plan before building** - the bottled pain-in-the-butt council; it found Spec 27's structural over-scope the polite round missed. Polite-then-brutal (two rounds) for this high-stakes build.
- **Root cause before instance fix** - find the class of failure before patching the instance (this session: the stale-clone root cause for the button, not a per-button patch).
- **Verify rendered output, not internal metrics (R-22-11)** - live REST render / editor / frontend is canonical; lint/build green != correct. The a11y/INP gates are measured in Playwright, not asserted.
- **Outcome vs completion** - code shipped != outcome achieved; if the live test (real WC swap, axe-core, lab INP, tampered add-to-cart) is not run, the task is not done.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS-block / proxy logic (blub.db 255).
- **Dispatched agents have NO commit/deploy authority** - they return uncommitted; main thread reviews + builds + deploys + commits.
- **Prefer single Sonnet subagent over Opus-inline; parallelise disjoint work** (Bean-locked); opus only for FR-27-A2 (state+SSR) and FR-27-C1 (availability store) per the spec's per-FR model recommendations; /qc after every considerable change.
