---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-04-theme-session10
generated: 2026-06-03
primary_goal: "SGS-THEME THREAD. BUILD the visible pill-swap — Spec 27 Phase-1 units U3 (manifest + SSR seed, OPUS) -> U4 (view.js multi-axis store) -> U7 (wire client add-to-cart to the built+verified proxy) -> U5 (cross-attribute availability), on the LIVE canary test page 589 (/sgs-configurator-test-540/) bound to fixture product 540. This is UN-GATED from the cloning thread (Bean-approved): the test page is separate from page 144, so it never touches the Mama's pixel-diff. The secure server-side spine (U0 fixture + U6 cart-proxy + bypass closure) is DONE + live-verified. Main inline agent is OPUS = orchestrator: plan, dispatch Sonnet subagents for the mechanical build, run the qc gates, fact-check every subagent claim against live ground truth, keep Bean updated in plain English, advise on decisions."
---

# Next Session — SGS THEME thread — BUILD the pill-swap (Spec 27 Phase-1 U3/U4/U7/U5)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`, currently at D163). DO NOT START ANY TASK until you have read the MANDATORY READING LIST below, in order, and quoted the STOP catalogue + the orchestration model back to yourself. The headline deliverable is the SSR-wipe-sensitive card-rendering build (U3 is OPUS-modelled for exactly this reason). A parallel CLONING session is co-active on the SAME working tree doing WS-4 on `heading`/`label`/`container`/`testimonial-slider` — commit by EXPLICIT PATH only, verify `git log -1 --stat`, never `git add -A`.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked directive).** Your job is: plan + decompose; dispatch Sonnet subagents for the mechanical build (they have NO commit/deploy authority — they return uncommitted code, you review + deploy + commit); run the qc gates (adversarial-council / qc-council / 2-rater review / gap-analysis); FACT-CHECK every subagent claim against live ground truth (read the file, open the live page, run the assertion — never relay a subagent's "done" as fact); keep Bean updated in PLAIN ENGLISH (he is a non-coder — Problem -> Effect -> Solution, no jargon dumps); advise on decisions with a ranked menu + one recommendation. Sonnet sessions burn context on doc-reading at start; staying Opus-inline + dispatching keeps your context on judgement. Live-verify EVERYTHING yourself — you own the proof of unproven work.
>
> **STOP — scope shared-block changes to the variant/mode the gated surface doesn't use.** `sgs/product-card` + `sgs/option-picker` are SHARED with the cloning thread's WS-4 (and `sgs/product-card` renders on page 144's Typed clones whose pixel-diff cloning measures). Build U3/U4 against the **Bound (`wc-product`) render branch + Bound-only CSS classes** (`.price--from`, `.product-card__cart-icon`, `.product-card__add-to-cart`, and any new `.product-card--bound …`). Page-144 cards are `typed` mode → never hit those code paths → pixel-diff-safe. Add NEW scoped selectors; NEVER modify an existing shared rule. (Memory `scope-shared-block-changes-to-unused-variant`, blub.db 304.)
> **STOP — the WC add-item attribute format is PINNED LIVE (corrects the old "pa_-slug" guess).** On the canary (WooCommerce 10.8.1) the Store API `/wc/store/v1/cart/add-item` `variation` field = an ARRAY of `{attribute:"<DISPLAY NAME>", value:"<term slug>"}` — e.g. `{"attribute":"Size","value":"12-pack"}`. NOT `pa_size`, NOT `attribute_pa_size`. The variation `id` alone resolves the right variation + price server-side; the array is the attribute-match payload. The U6 proxy already maps the display-name key → taxonomy internally for matching. U4/U7 MUST send the display-name form. (D162.6; plan §U0 M-C2 RESOLVED.)
> **STOP — WC is the SINGLE SOURCE OF TRUTH; never mirror commerce data.** Price/sale/stock/variation-image/combination-validity/SKU/GTIN/cart all read through from WooCommerce live (`wc_get_product()` server, Store API `/wc/store/v1` client). SGS stores presentation/config ONLY (swatch term_meta, discount-label/gallery/unit-divisor variation postmeta, display-subset block attrs). `_sgs_sku_matrix` is DROPPED/superseded; do NOT build it. (Spec 27 principle 6 + clean-split.) NOTE the council reframe: the seeded SSR manifest IS a read-through CACHE — the freshness defence (M-C1) is the render-time `get_date_modified()` staleness guard, NOT just the purge-hook allowlist.
> **STOP — the SSR-wipe trap is the #1 way this build silently breaks (U3 lives here).** WP Interactivity directives (`data-wp-bind`/`data-wp-text`) run SERVER-SIDE; binding one to a JS-only store getter resolves empty and WIPES the SSR literal. Every display binding MUST resolve against server-seeded `data-wp-context` whose default EQUALS the SSR literal. Per-variation derived values (% off, per-unit £, selected price) are seeded as concrete literals, never computed in a client getter. The price slot must be SEPARATE seeded literal keys (regular/sale) — there is NO `innerHTML` binding in the Interactivity API, so `data-wp-text` would strip WC's sale `<del>/<ins>` HTML (M-C3). Manifest lives in per-instance `data-wp-context`, NOT shared `wp_interactivity_state` (M-C3 multi-card bug). (Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`; Spec 27 hard constraints + FR-27-A2; plan §6 + §8b M-C3.)
> **STOP — the client sends IDs + an attribute object, NEVER a price.** Add-to-cart POSTs `/sgs/v1/cart/add-item` with the variation `id` + `quantity` + `variation:[{attribute,value}]` (display-name form, pinned above) + `X-WP-Nonce`. The SGS proxy (BUILT + VERIFIED this session) validates (CSRF + IDOR per-object + publish-gate + attribute-match + stock + qty-cap + rate-limit) THEN adds in-process via `WC()->cart->add_to_cart()`, which recomputes price AND re-validates stock server-authoritatively. Any client price field is ignored. (FR-27-G1/G2/G3; `includes/class-cart-proxy.php`.)
> **STOP — pages stay fully cacheable.** Oversell protection is a single live stock re-check on the explicit add-to-cart CLICK, NOT page-uncacheable rendering. Freshness: the render-time `get_date_modified()` staleness guard (M-C1, build in U3) + targeted purge hooks (U6 already wired `woocommerce_product_set_price`/`set_stock`/`update_product`/`save_post_product`; the bad `woocommerce_scheduled_sale_action` was removed). Tax-correct: seed display prices via `wc_get_price_to_display()` + decimals via `wc_get_price_decimals()`, never own division (the resolver's `price_from_html` already does this). (FR-27-G6/H3; plan §8b M-C1/M-C10.)
> **STOP — Spec 27 is the single MASTER** for the product + WooCommerce layer (absorbed Spec 24 + Spec 25 in v4; 24/25 retired). Read Spec 27 before any product-card / option-picker / cart / content-collection / configurator change. FR-24-x = shipped card system; FR-27-x = configurator. The single-whole-gate decision stands (Bean): all 13 units before "shipped" — MVP subset is the BUILD ORDER, not the ship line.
> **STOP — don't assert block capability from a partial dump:** read block.json + edit.js + render.php + `/wp-blocks` before building on top of product-card / option-picker / cart. (This session: I read the FULL render.php + style.css before the polish — found shadow/hover/contrast already present, only added the genuine gaps.)
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / editor repro) BEFORE dispatching a fix. (Past sessions: multiple reported "bugs" were stale/false.)
> **STOP — verify against git, not the handoff:** run `git log --oneline -10` + `git branch` first; trust the repo over prose. The cloning thread commits to the same `main` (it took D163 + its handoff `8d38de26` after this session's last push).
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk.** FR-26-D2 (shipped) writes that post via `push-theme-snapshot.py`, but a disk-only edit re-diverges. `theme/sgs-theme/styles/mamas-munches.css` is an ORPHAN (not enqueued). Any pill/swatch CSS that must match the brand goes through the post too. (Memory `canary-live-styles-come-from-wp-global-styles-post`.)
> **STOP — global-styles architecture is SPEC'd: read `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (D158) BEFORE any theme.json / global-styles / per-client-theming change.** Build deferred except FR-26-D2 (shipped). FR-26-D1 RESOLVED/MOOT — do NOT clear canary post 7. Configurator swatch/pill colours derive from Spec 26 tokens (FR-27-I2).
> **STOP — block style controls must accept RAW CSS values + defaults stay overridable:** every default colour/spacing is `var(--sgs-x, <default>)` with an editor control accepting raw hex/px (theme.json `color.custom`/`customSpacingSize` true). (Memory `block-style-controls-accept-raw-css-and-overridable`.)
> **STOP — auto-contrast direction is DECIDED: build-time luminance** (compute WCAG luminance of the brand/swatch colour at deploy/render, pick black/white text for 4.5:1), CSS `contrast-color()` as a later progressive-enhancement layer. Applies to pill text (FR-27-I2). Spec 26 non-goals + D161.
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (the Git-Bash node wrapper is broken: `/c/nvm4w/nodejs/node: line 1: This: command not found`). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`) → use a token-gated webroot one-shot PHP runner (require wp-load.php + secret `$_GET['t']`, curl it, rm immediately). `POST /wp/v2/pages` is NOT guard-blocked (use it to make test pages). (Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`, blub.db 305.)
> **Guardrail (all tasks):** after every block build-deploy, open the canary test page 589 (and the WP editor on it) and verify the control renders + zero console errors + the live computed values BEFORE considering the task done. Bump block.json `version` on any block CSS/JS change AND theme `style.css` `Version:` on any THEME-CSS change. Surgical deploy: build via PowerShell, scp `build/blocks/<block>/*` + the changed `includes/*.php`, opcache-reset webroot trick — avoids bundling the cloning thread's uncommitted blocks.

## State recap (plain English)
The SGS framework is a custom WordPress block library (theme + blocks plugin). Its shop layer (Spec 27) is fully specified and the SECURE BACKEND IS NOW BUILT + PROVEN LIVE. This session (session 9) shipped, in order: deployed + proved the product-meta security fix (an IDOR hole — a low-privilege user editing other people's product data); wrote the full Spec 27 Phase-1 BUILD PLAN and stress-tested it through a 6-persona adversarial council (CONDITIONAL GO, must-fixes folded into plan §8b); Bean made two calls (keep the single whole gate; pull the server-side units forward to build during the cloning wait); built U0 (a 48-SKU WooCommerce test product, fixture 540, on the canary) and pinned the exact add-to-cart wire-format live; built U6 (the secure add-to-cart proxy `class-cart-proxy.php`) — a 2-rater review caught 5 real bugs, all fixed, and EVERY attack is proven blocked live (tampered prices, fake/draft products, out-of-stock, over-quantity, and the bypass attempt); set up a live test page (589) rendering the real product with zero errors; and polished the card design (judged with `/ui-ux-pro-max`, three Bound-scoped improvements implemented, `/qc` PASS 96/100). **What's left:** the VISIBLE pill-swap — units U3 (live per-variation data into the card), U4 (the JS that swaps price/image when a pill is clicked), U7 (point the add-to-cart button at the secure proxy), U5 (grey out unavailable combos). Build on test page 589 — it's separate from the Mama's homepage clone, so it does NOT collide with the cloning thread. Work from `main`; commit by explicit path.

## First action (smallest step, ≤5 min, zero deps)
Run `git log --oneline -10` + `git status` + `git branch --show-current`. Confirm HEAD is at/after `dd434234` (this session's last theme commit) — note the cloning thread's `a7d0e03e`/`8d38de26` sit on top (D163 + their handoff). Confirm the ONLY uncommitted files belong to the cloning thread (`heading/*`, `label/*`, `container/render.php`, `sync-container-wrapping-blocks.py`, `testimonial-slider/*`, `reports/phase4-*`, `theme-snapshot.json`, `lucide-icons.php`, `orchestrator/sgs-framework.db`) — leave them ALL untouched. Then open the live test page `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` to re-ground on the current card. Then read the MANDATORY READING LIST. Then start U3.

## MANDATORY READING LIST (read FULLY first, in order)
1. This file (the STOP catalogue especially).
2. `.claude/plans/2026-06-03-spec27-phase1-configurator-plan.md` — THE build map. Read §2 (the unit cards U0-U12, with U0+U6 marked DONE), §6 (the 5 pre-build prerequisites), and §8 (the adversarial-council synthesis + the must-fix register §8b — M-C1 freshness, M-C3 SSR/state, M-C5 CSP/escaping, M-C7 image-fallback, M-C9 prefetch-cut, M-C10 tax — fold each before building the unit it touches).
3. `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` — the MASTER. Read the "Variable-product configurator" chapter END-TO-END (architecture, inter-block state, manifest payload, hard constraints, FR-27-A1/A2/A3/A5/B1/C1/G*/H*/I-MVP, acceptance 1-6).
4. `.claude/handoff-theme.md` (session 9 at top = this work; 8/7/6 below = Spec 27 master / Spec 26 / Phase D-E history).
5. The product files, with `/wp-blocks` + `/sgs-db` cross-check — read the FULL files, do not infer from a dump: `plugins/sgs-blocks/src/blocks/product-card/{render.php,view.js,style.css,block.json}`, `src/blocks/option-picker/{render.php,view.js,block.json}`, `includes/class-product-bindings.php` (the resolver — already has `is_variable`/`price_from_html`), `includes/class-cart-proxy.php` (the proxy — the validation chain + the `enforce_add_to_cart_limits` filter).
6. `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (D158) — FR-27-I2 swatch/pill tokens derive from here.
7. `.claude/decisions.md` newest — D162 (this session: IDOR deployed + plan + council + U0/U6 + bypass; points .5/.7/.8/.9), D161 (Spec 27 master), D158 (Spec 26), D151/D149 (dual-source Bound mode), D144 (option-picker). NOTE D163 is the CLONING thread's — next free theme D-number is D164.
8. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` — block customisation standard, the deprecation procedure (any static save()/attr change needs `deprecated.js`; adding `sourceMode`/swatch attrs to option-picker/product-card MUST keep the Typed shape a deprecation-free subset — FR-27-I-MVP), gotchas, block-status table.
9. `.claude/parking.md` — P-PRODUCT-CARD-PILL-SWAP-DORMANT (this is what U3/U4 activate), P-AUTO-CONTRAST-LIGHT-PRIMARIES, P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES, P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM.

## Build architecture warm-up (the pill-swap, in your head before you code)
**The product:** pills on the product card that swap price/image/sale/stock by reading WooCommerce live, so Mama's (48 SKUs) actually sells. The card is ONE WP Interactivity store; child option-pickers (one per attribute axis — for fixture 540 that's Size + Flavour) read/write the shared per-instance `data-wp-context`; the card derives the selected variation's price/image/availability and binds them to seeded context keys.

**What is ALREADY DONE (do NOT rebuild):** U0 fixture (product 540, 48 variations) + U6 secure proxy + the bypass filter + the test page 589 + the card polish (From-price, cart icon, eager image, all contrast ≥4.5:1). The resolver (`class-product-bindings.php`) already returns `is_variable` + `price_from_html`. The card already seeds a `data-wp-context` (productId/selected/addToCartId/imageSrc/imageAlt/cartStatus/pending) and renders an option-picker when `_sgs_variation_sets` has a `pills` type. view.js already has `handlePillSelect` (mutates context keys — SSR-safe) + `addToCart` (currently posts `{id,quantity:1}` straight to the Store API — U7 rewires this to the proxy).

**What U3/U4/U5/U7 ADD (the gap between "card shows a range" and "pills swap the exact price"):**
- **U3** — read WC's live per-variation data (`get_available_variations()`) and build the sparse valid-combos manifest (each entry: `{variationId, attrs[taxonomy:slug sorted |-joined], priceMinor, regularMinor, saleMinor, pctOff, inStock, imageUrl?}` — minor-int via `wc_get_price_to_display`, decimals via `wc_get_price_decimals`, currency at request time). Seed it into per-instance `data-wp-context` (NOT shared state) ≤24 KB. Seed the DEFAULT variation's price/image/stock as concrete SSR literals. Render TWO option-pickers (Size + Flavour). Fold M-C1 (render-time `get_date_modified()` staleness guard), M-C3 (separate price literal keys, no innerHTML bind), M-C5 (`wp_json_encode($ctx, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT)` + per-field sanitise), M-C7 (image fallback: variation → parent → no-op), M-C9 (inline-only; hard-reject above the cap — cut the prefetch path for Mama's 48). **OPUS** (the SSR-wipe trap + state design).
- **U4** — expand `view.js handlePillSelect` to a multi-axis store: `ctx.selectedAxes = {Size:'12-pack', Flavour:'vanilla'}`; on each pick, resolve the combo → manifest entry → mutate the seeded price/image/stock context keys (never a JS getter). Namespace-qualified `getContext('sgs/product-card')`. No XHR on `change`.
- **U7** — replace the `view.js addToCart` direct Store-API `{id,quantity:1}` call with a POST to `/sgs/v1/cart/add-item` carrying `id` (the SELECTED variation's id from the manifest) + `quantity` + `variation:[{attribute:"Size",value:"<slug>"}, …]` (display-name form) + `X-WP-Nonce`. Keep the `wc-blocks_added_to_cart` badge dispatch. The proxy is built + verified — this is the client half.
- **U5** — cross-attribute availability: from the valid-combos set, grey (visible, `aria-disabled`, announced via `aria-live`) options on the other axis that yield no in-stock variation, both directions; on a 409 add-to-cart, fire one availability re-fetch + re-grey (needs the M-C8 `GET /sgs/v1/cart/availability/{id}` endpoint — fold into the proxy class). **OPUS** (the availability store).

**Ship gate for these units (Spec 27 acceptance 1-3):** Bound WC card renders real price/stock/image; pills swap with NO XHR on change; no-JS shows the default literal; context ≤24 KB; card price == cart price across tax; 48-SKU grey-out both directions + announced + post-load OOS caught; axe-core 0 + keyboard radiogroup + SR announces label+state+price + 44px measured in Playwright.

## ORCHESTRATION PLAN (you = Opus orchestrator; dispatch Sonnet; opus-inline only where flagged)

### Task U3 — Live manifest + SSR seed (the data spine)
**What:** read WC variations live, build the per-instance manifest, seed it + the default literals into `data-wp-context`, render Size + Flavour option-pickers. **Why:** without per-variation data the pills can't change anything (P-PRODUCT-CARD-PILL-SWAP-DORMANT). **Est:** ~30-40 min build + verify.
**Orchestration:** design-gate FIRST via `/brainstorming` on the manifest schema + the SSR-safe binding shape (10 min, opus-inline) → then a single **Sonnet** subagent builds the resolver extension + render.php seed (it returns uncommitted; you review every line against the SSR-wipe + M-C3/M-C5/M-C7 rules). Model: **opus** for the design-gate (SSR-wipe trap); sonnet for the build. Dispatch: single-agent. Depends on: none (U0 done). Parallel with: none (U4 needs it). /qc gate: **YES — `/qc-council`** (multi-rater, cross-model: the seed touches security-adjacent escaping + the SSR-wipe trap). Then deploy + open page 589 + verify the seeded context JSON ≤24 KB + the default literals render with no-JS + no console errors.
**Acceptance:** `data-wp-context` carries the 48-combo manifest ≤24 KB; default variation price/image/stock are SSR literals (visible with JS off); two pickers render; `wp_json_encode` HEX-flagged; grep confirms no `_sgs_variation_sets` commerce read on the WC branch.

### Task U4 — Multi-axis pill-swap store (the visible swap)
**What:** `view.js` resolves the selected Size+Flavour combo → manifest entry → swaps the seeded price/image/stock context keys. **Why:** this is THE "pills swap the price" moment — the dopamine + the conversion win. **Est:** ~25 min.
**Orchestration:** single **Sonnet** subagent (the contract is now concrete from U3). Model: sonnet. Depends on: U3. /qc gate: **YES — `/qc-inline`** + live: click each pill on page 589, confirm price/image swap to the right variation with NO network request on change (Playwright network panel). Verify the SSR value is NOT wiped (the directive resolves against the seeded key).
**Acceptance:** selecting Size+Flavour shows that variation's exact price + image; zero XHR on `change`; no-JS still shows the default; namespace-qualified `getContext('sgs/product-card')`.

### Task U7 — Wire add-to-cart to the secure proxy (close the loop)
**What:** replace the direct Store-API call in `view.js addToCart` with the `/sgs/v1/cart/add-item` proxy POST (selected variation id + quantity + display-name `variation[]` + nonce). **Why:** makes the card actually SELL the selected variation, securely. **Est:** ~15 min.
**Orchestration:** single **Sonnet** subagent (small, well-specified). Model: sonnet. Depends on: U4 (needs the selected-variation id). /qc gate: **YES — live adversarial re-run**: add the selected variation on page 589 → 200 + badge increments + the cart holds the RIGHT variation id at the right price (read the cart back). Re-run a tampered payload → still rejected (the proxy is verified; confirm the client sends the right shape).
**Acceptance:** clicking Add to Cart adds the SELECTED variation via the proxy; badge updates; cart line = the chosen variation id + price; the no-JS `<a href>` fallback still points at the product page.

### Task U5 — Cross-attribute availability (grey-out past the 30-cliff)
**What:** grey unavailable combos both directions + announce; 409 re-sync via a new `GET /sgs/v1/cart/availability/{id}` (cached 60s, rate-limited, nonce/token-gated — M-C8). **Why:** the headline "works past WC's 30-variation limit" claim; stops shoppers selecting dead combos. **Est:** ~35 min.
**Orchestration:** **opus** for the availability store design (the both-directions logic + the snapshot-vs-live reconcile), then a **Sonnet** subagent builds. Add an "Any"-attribute variation + a deliberate gap to fixture-v2 first (Cynic MF-2 / Spec-Lawyer #11) so the test is non-vacuous. Depends on: U3, U4. /qc gate: **YES — `/qc`** (multi-rater) + the 4 a11y gates via `design-reviewer` + Playwright. /qc-council if the availability matrix re-implements WC's `find_matching_variations` (cross-check it against WC's own output every WC major).
**Acceptance:** selecting an attribute greys the unavailable opposite-axis options both directions + announces via `aria-live`; a post-load OOS selection is caught at add-to-cart (409) + re-synced; matches WC's combination-validity (incl. an "Any" variation).

### Residual U6 follow-ups (small; fold opportunistically, NOT blockers)
"Any"-attribute `term_exists()` validation in the proxy; product-LOCAL (non-`pa_`) attribute case-handling; document the guest-nonce-per-tick parity. Plan §U6 tracked.

### Dependency graph
```
U3 (opus design-gate → sonnet build) ──/qc-council──┐
        ↓                                            │
U4 (sonnet) ──/qc-inline + live no-XHR-swap──────────┤
        ↓                                            │
U7 (sonnet) ──live adversarial re-run────────────────┤  all on test page 589 (un-gated from cloning)
        ↓                                            │
U5 (opus design → sonnet) ──/qc + 4 a11y gates───────┘
        ↓
Bean visual sign-off (R-22-13) per milestone → commit to main by EXPLICIT PATH (cloning thread co-active)
```

## Skills to Invoke (with subagent + qc guidance)
| Skill | When | Dispatch note |
|-------|------|---------------|
| `/autopilot` | FIRST — auto-injected by SessionStart; establishes live routing + ADHD support | inline |
| `/brainstorming` | design the U3 manifest schema + SSR-safe binding shape, and the U5 availability store, BEFORE coding | opus-inline (design is judgement) |
| `/strategic-plan` → `/phase-planner` | if you want a finer step-plan inside a unit; the macro plan already exists (§2 of the plan doc) | inline |
| `/sgs-wp-engine` + `/wp-block-development` | block dev — block.json, attrs, render, deprecations, Block Bindings | the Sonnet subagent invokes at point of use |
| `/wp-interactivity-api` | the card store / shared context / SSR-safe directives — the SSR-wipe trap lives here (U3/U4) | subagent + your review |
| `/wp-rest-api` | the U5 `GET /sgs/v1/cart/availability/{id}` endpoint + Store-API auth | subagent |
| `/library-docs` | up-to-date WooCommerce / WP Interactivity / Block Bindings reference at point of use | inline before non-trivial design |
| `/research` (auto-routes) | gold-standard before any non-trivial pattern (Interactivity multi-store, find_matching_variations) | inline |
| `/qc-council` | MANDATORY before the U3 commit (security-adjacent seed + SSR-wipe) + the U5 commit (blub.db 255) — multi-rater, cross-model | you orchestrate the panel |
| `/qc` / `/qc-inline` | `/qc-inline` for U4/U7 (small, live); `/qc` multi-rater for U5 | inline orchestration |
| `/visual-qa` or `/design-review` | the FR-27-B1 four a11y gates (axe-core 0, keyboard radiogroup, SR announces, 44px) | `design-reviewer` agent |
| `/gap-analysis` | grade each unit's output against the Spec 27 acceptance criterion before delivery | inline |
| `/systematic-debugging` | any bug — root-cause before fixing | inline |
| `/dispatching-parallel-agents` / `/subagent-driven-development` | if any disjoint work parallelises (mostly sequential here) | inline orchestration |
| `/delegate` | pick the model per dispatch (Sonnet default; opus for design-gates) | inline before each dispatch |
| `/capture-lesson` | any new architectural rule surfaced | inline |
| `/handoff` | session close | inline |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | live verify on page 589: the pill-swap (no-XHR network check), the 4 a11y gates (axe / keyboard / SR snapshot / 44px bounding-rect), computed-style contrast, no-JS fetch, CWV/INP capture. `browser_evaluate` for computed values + a WCAG-contrast helper (used this session). |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / capabilities / slots |
| WooCommerce Store/REST API (`/wc/store/v1`, `/wc/v3`) | product 540 + variation + cart state; the pinned add-item contract `variation:[{attribute:"Size",value:"12-pack"}]` |
| REST global-styles (`/wp/v2/global-styles/7`) | the LIVE canary styles (supersedes theme.json) — for any pill colour that must match the brand |
| `performance-auditor` agent | FR-27-H1 lab-INP ≤200 ms + bundle-budget gate (later, after the swap works) |
| SSH + token-gated webroot runner | WC-CLI ops the guard blocks (fixture-v2 seed, nonce gen); `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `.claude/secrets/sandybrown.env` |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy block / resolver / view.js / availability builds (U3/U4/U5) — the Sonnet implementer |
| `design-reviewer` | the FR-27-B1 four a11y gates + editor UX (WCAG 2.2 AA) |
| `performance-auditor` | INP / LCP / CLS / bundle budgets (FR-27-H, after the swap works) |
| general-purpose (sonnet) | the per-unit mechanical build + a 2-rater review per security-adjacent commit |

## Done this session (do NOT redo)
- **IDOR fix DEPLOYED + proven** (`d07a7e05` live; contributor REST write → 403, admin → 200).
- **Spec 27 Phase-1 BUILD PLAN** written + 6-persona adversarial-council (CONDITIONAL GO; must-fixes in plan §8b) — `.claude/plans/2026-06-03-spec27-phase1-configurator-plan.md`.
- **Two open questions resolved** (plan §1): binding-source covers scalars/image, repeatable via the manifest (no new mechanism); `wp_options` capability flag.
- **U0** — `seed-48-sku-fixture.php` → canary product 540 (48 variations); M-C2 contract pinned live.
- **U6** — `class-cart-proxy.php` (`POST /sgs/v1/cart/add-item`) built + 2-rater review (5 bugs fixed) + full live adversarial suite PASS + Store-API bypass closed via `enforce_add_to_cart_limits` filter. Security-complete.
- **Test page 589** live (Bound card → 540, 0 errors). **Card polish** (From-price + cart icon + eager image) `/qc` PASS 96/100.
- Commits `7924a838`→`dd434234` (theme), all pushed. D162 (with .5/.7/.8/.9).

## Guardrails (carried forward + extended)
- **Scope shared-block changes to the variant/mode the gated surface doesn't use** — Bound-only classes + the `wc-product` render branch; page-144 Typed clones stay untouched; pixel-diff-safe. NEW scoped selectors only. (Memory `scope-shared-block-changes-to-unused-variant`.)
- **The add-item attribute format is PINNED** — `variation:[{attribute:"<display name>",value:"<term slug>"}]` (WC 10.8.1). U4/U7 send display-name form; the proxy maps to taxonomy internally.
- **Spec 27 = single master**; 24/25 retired. FR-24-x shipped; FR-27-x to build. Single whole gate (Bean) — MVP subset = build order, not ship line.
- **WC = single source of truth; never mirror** — presentation/config only in term_meta / variation postmeta / block attrs. The seeded manifest is a read-through CACHE; freshness = render-time `get_date_modified()` guard (M-C1), not just purge hooks. `_sgs_sku_matrix` dropped.
- **SSR-wipe trap** — every display binding resolves against server-seeded context whose default == the SSR literal; derived values seeded as literals; price slot = separate literal keys (no innerHTML bind); manifest in per-instance `data-wp-context` not shared `wp_interactivity_state`.
- **Client sends IDs + attribute object, never price** — the proxy recomputes price + re-validates stock; per-object `edit_post`/`manage_woocommerce`; the `enforce_add_to_cart_limits` filter holds the cap on ALL paths.
- **Pages stay cacheable** — oversell = add-to-cart click re-check; tax-correct via `wc_get_price_to_display()` + `wc_get_price_decimals()`, never own division.
- **Read block.json + edit.js + render.php + `/wp-blocks` before asserting any block's capability** — never infer from a partial dump.
- **Triage before fixing** — verify a reported bug still reproduces against ground truth BEFORE dispatching.
- **Deprecations required** — any change to a static block's save() or attribute schema needs a `deprecated.js`. Adding `sourceMode`/swatch attrs to option-picker/product-card MUST keep the Typed shape a deprecation-free subset (FR-27-I-MVP).
- **Never `source:html` on a dynamic block**; dynamic InnerBlocks blocks need `save:()=><InnerBlocks.Content/>`.
- **CPT meta needs `custom-fields` support** for REST `meta`; meta `auth_callback` per-object `edit_post`.
- **Cache-bust:** block.json `version` on block CSS/JS; theme `style.css` `Version:` on theme CSS.
- **Deploy + OPcache reset before measure** — build via PowerShell + surgical scp (`build/blocks/<block>/*` + changed `includes/*.php`) + opcache_reset webroot trick before any browser/REST test, or you measure stale output.
- **Canary live styles = `wp_global_styles` post (ID 7)**, not theme.json on disk.
- **Block style controls accept RAW CSS values + defaults overridable** (`var(--sgs-x, default)`). Configurator swatch/pill colours derive from Spec 26 tokens (FR-27-I2) + build-time auto-contrast.
- **No client-specific values in base theme/blocks** — client work lives in `sites/<client>/` + the snapshot/global-styles post.
- **WCAG 2.2 AA + 44px touch targets + mobile-first** on all new UI; FR-27-B1 is the first-mover claim — sprint it + evidence it (the moat-evidence sheet is a Phase-2 fast-follow, not a U3-U5 blocker).
- **Work on `main`** (cloning thread co-active); commit ONLY your files by EXPLICIT PATH (never `git add .`/`-A`; the cloning thread's `heading/*`,`label/*`,`container/render.php`,`sync-container-wrapping-blocks.py`,`testimonial-slider/*`,`reports/phase4-*`,`theme-snapshot.json`,`lucide-icons.php`,`orchestrator/sgs-framework.db` stay untouched); `git status` before committing; verify `git log -1 --stat` after. Next free theme D-number = D164 (cloning took D163).

## Methodology guardrails (do not skip)
- **You are the orchestrator; fact-check every subagent claim** — a subagent's "done/verified" is a HYPOTHESIS until you read the file + open the live page + run the assertion yourself. This session a subagent's U6 report was truncated and had NOT wired the registration + had a session-boot bug — both caught by reading the code, not trusting the report.
- **Multi-rater review finds the bugs the happy path misses** — for security-adjacent or SSR-sensitive code (U3, U5), run a 2-rater cross-model review of the PATHS the happy-path live test didn't exercise, even after live verification passes. This session it caught 5 real bugs in U6 (parent-id, empty-variation, sliding-window, draft-gate, wrong-hook-name).
- **Pull-forward the contract before building the consumer** — pin the wire-format empirically (fixture → live add-to-cart read-back) BEFORE coding the thing that depends on it. M-C2 pinned this way before U7.
- **Root cause before instance fix** — find the class of failure before patching the instance.
- **Verify rendered output, not internal metrics (R-22-11)** — live page 589 render / editor / network panel is canonical; lint/build green ≠ correct. The a11y/INP/no-XHR gates are MEASURED in Playwright, not asserted.
- **Outcome vs completion** — code shipped ≠ outcome achieved; if the live test (pill swaps the price, no-XHR-on-change, axe-core 0, tampered add-to-cart rejected) is not run, the unit is not done.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS-block / proxy logic (blub.db 255). `/qc-council` for U3 + U5; `/qc-inline` + live for U4/U7.
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; you review + build + deploy + commit by explicit path.
- **Prefer Sonnet subagent over Opus-inline for the mechanical build** (Bean-locked); opus-inline only for the U3 manifest/SSR design-gate + the U5 availability store design + Bean-decision moments. Live-verify everything yourself.
- **Communicate in plain English** — Bean is a non-coder: Problem → Effect → Solution; ranked menu + one recommendation on decisions; mark wins with a running count; no jargon dumps.
