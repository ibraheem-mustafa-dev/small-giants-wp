---
doc_type: phase-plan
project: small-giants-wp
thread: sgs-theme
plan_id: spec27-phase1-configurator
spec: .claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md
created: 2026-06-03
status: WARM-START (build GATED on the cloning phase closing — re-baselines the Mama's pixel-diff)
gate_to_build: ".claude/next-session-prompt.md + .claude/state.md (cloning thread) must show the cloning phase CLOSED before Task C build starts"
scope_frs: [FR-27-A1, FR-27-A2, FR-27-A3, FR-27-A5, FR-27-B1, FR-27-C1, FR-27-G1, FR-27-G2, FR-27-G3, FR-27-G6, FR-27-H1, FR-27-H2, FR-27-H3, FR-27-I-MVP]
adversarial_council: CONDITIONAL-GO (6-persona brutal round run 2026-06-03; must-fixes folded into §8; build-ready after the §8 pre-build register is applied)
honest_effort: "3-4 AI-agent sessions for the true-MVP sell-loop (matches Spec 27 §540), NOT 2; full 13-unit Phase 1 ≈ 6-8 sessions"
---

# Spec 27 Phase 1 — MVP Variable-Product Configurator — Build Plan

> **Plain English.** This plan turns Mama's product cards into a working shop: tap a pack-size/flavour pill and the price, image, sale badge and stock update by reading WooCommerce live; add-to-cart is secure (the server, not the browser, decides the price and re-checks stock); the whole card meets WCAG 2.2 AA; and it works past WooCommerce's own 30-variation limit (Mama's has 48). No code ships this session — this is the warm-start plan so the build starts the moment the cloning phase closes.

## 0. Goal + done-when

**Goal:** the smallest shippable real configurator — live WC read-through swap, secure no-oversell add-to-cart, accessible, fast, cacheable, tax-correct, past the 30-variation cliff.

**Done (Spec 27 acceptance 1-6, the ship gate):**
1. Bound WC card renders real WC price/stock/image; pills swap with **no XHR on change**; no-JS shows the default literal; context ≤24 KB; card price == cart price across tax contexts.
2. 48-SKU: selecting an attribute greys unavailable combos **both directions** + announced; a post-load OOS selection is caught at add-to-cart (where native WC >30 fails).
3. axe-core 0 + keyboard + screen-reader + 44px-measured pass; price/stock announced.
4. A tampered add-to-cart (fake price / OOS / foreign ID / attr-mismatch / disabled variation) is rejected or server-priced; a cart-flood is capped+cooled; a sale-end purges the cached page.
5. Lab INP ≤200 ms on a pill change; **no React bundle**; CLS 0 on swap.
6. The cloning pipeline emits Typed pickers unchanged + schema-compat tests pass.

## 1. Resolved open questions (grounded this session)

| Q | Decision | Grounding |
|---|----------|-----------|
| **FR-24 #7** — Block Bindings cover image + repeatable pack-options, or custom callback? | **Existing `sgs-product/field` custom source covers image + scalar price/title/stock (1 key = 1 string). Repeatable pack-options are NOT a binding** — rendered by `sgs/option-picker` children fed from the SSR-seeded manifest. Derived per-variation values seeded as literals into context (never a binding/JS getter — SSR-wipe rule). No new binding mechanism. | `class-product-bindings.php` already returns `image_url` + `price` (get_price_html) via `get_value_callback`; `get_product_data()` already seeds `variation_sets`. Block Bindings are scalar-only by design. |
| **FR-24 #9** — per-site capability-flag mechanism? | **`wp_options` flag `sgs_content_types`** (autoloaded array, default `[]` → no CPT on lean sites). Registration guards `in_array('sgs_product', get_option('sgs_content_types', []), true)`. Set at provision + togglable via a minimal SGS Settings toggle (`manage_options`). Rejected: `add_theme_support()` (needs code edits) + hardcoded (not lean). WC presence stays a separate `function_exists('wc_get_product')` check. | Framework principle 1 (WC-optional, lean marketing sites) + "clients never touch code". |

## 2. Work units + dependency graph

```
U0 seed-48-SKU fixture ─┬─→ U2 WC-variation resolver ─→ U3 manifest+SSR seed ─→ U4 card store (pill swap) ─┬─→ U5 availability engine ─┐
                        │                                                                                   ├─→ U9 WCAG sprint  ───────┤
U1 capability flag (independent, early) ──→ U11 degradation/activation                                      ├─→ U10 perf budgets ──────┤
                        │                                                                                   ├─→ U12 cloning-compat ────┤
U0 ────────────────────┴─→ U6 /sgs/v1/cart/add-item PROXY (security spine) ─→ U7 wire client add-to-cart ───┘                          │
                                                          └─→ U8 cache + tax correctness ───────────────────────────────────────────────┘ → SHIP GATE
```

**Critical path (longest chain):** U0 → U2 → U3 → U4 → U5 → U9 → ship gate.
**Parallel heavy spine:** U6 (proxy) runs from U0 alongside U2/U3/U4; U7 joins them.
**Independent early:** U1 (capability flag) — start it first (smallest, zero deps).

### Unit cards

**U0 — 48-SKU dev fixture** · FR-27-I-MVP
PURPOSE: a real WC variable product (2 axes → 48 valid combos, some OOS, one on a scheduled sale) every other unit tests against.
FILES: `plugins/sgs-blocks/scripts/seed-48-sku-fixture.php` (WC PHP API: `WC_Product_Variable`/`WC_Product_Variation` `set_*()`+`save()`; NOT the authoring path).
ON-CRITICAL-PATH: yes. TEST: run script → `get_available_variations()` returns 48; ≥1 OOS; 1 scheduled-sale variation.

**U1 — Per-site capability flag** · FR-24 #9 (resolved)
PURPOSE: CPT registers only when enabled; lean marketing sites stay clean.
FILES: `includes/content-types/class-product-cpt.php` (guard registration on the option); a minimal `includes/class-sgs-settings.php` toggle page; deploy tooling sets the option at provision.
ON-CRITICAL-PATH: no. TEST: option empty → no `sgs_product` route; option set → route present; toggle flips it with no code.

**U2 — WC-variation resolver (live read-through)** · FR-27-A1
PURPOSE: read per-variation price (`wc_get_price_to_display`), regular/sale, stock, image, GTIN, attributes via `wc_get_product()` / `get_available_variations()`. No `_sgs_variation_sets` commerce read on the WC branch (static grep asserts it). Simple product → plain card.
FILES: extend `includes/class-product-bindings.php` (or a new `includes/class-variation-resolver.php`).
ON-CRITICAL-PATH: yes. TEST: 48-SKU fixture values == `get_available_variations()`; simple-product fixture → plain card; grep asserts zero `_sgs_variation_sets` commerce reads on the WC branch.

**U3 — Manifest builder + SSR seed** · FR-27-A2 · model: opus (state+SSR guard) then sonnet
PURPOSE: build the sparse valid-combos manifest (attribute-tuples + per-variation price as display-minor-int from `wc_get_price_to_display`, decimals from `wc_get_price_decimals`, currency at request time, stock flag, `pctOff` int) + default-variation literals; seed into `wp_interactivity_state` + `data-wp-context` (default == SSR literal); ≤24 KB cap; long-tail prefetch on first card interaction (`pointerenter`/`focusin`), never on `change`.
FILES: `class-product-bindings.php` `get_product_data()` extension; `product-card/render.php` seed + SSR default render.
ON-CRITICAL-PATH: yes. TEST: JS off → default variation fully rendered + survives directive processing; JS on → pill change swaps with no XHR on change; context JSON ≤24 KB.

**U4 — Card store: pill swap + derived display (SSR-safe)** · FR-27-A2 client half
PURPOSE: expand `view.js handlePillSelect` to resolve the selected combo from the manifest and swap price/sale/image/stock by mutating **seeded context keys** (no JS getters). Multi-axis selection state.
FILES: `product-card/view.js`, `render.php` (data-wp-bind/text on seeded context).
ON-CRITICAL-PATH: yes. TEST: select each axis → correct price/image/stock from the manifest; values present server-side (no wipe); no XHR on change.

**U5 — Cross-attribute availability engine** · FR-27-C1 · model: opus (store) then sonnet
PURPOSE: from valid-combos, grey (visible, `aria-disabled`, announced) options on other axes yielding no valid in-stock variation — **both directions, any count** (where native WC >30 fails). Snapshot-time; on add-to-cart 409 → one `GET /wc/store/v1/products/{id}`, refresh matrix, re-grey, announce via `aria-live`.
FILES: `view.js` (availability store), `option-picker` (consume disabled state), `render.php`.
ON-CRITICAL-PATH: yes. TEST: 48-SKU gap fixture greys both directions + announces; post-load OOS caught + re-synced.

**U6 — `/sgs/v1/cart/add-item` proxy (security spine)** · FR-27-G1/G2/G3/G6
PURPOSE: NEW REST controller. Validates BEFORE forwarding: IDOR (`get_post_type()` ∈ {product, product_variation} + variation-level `is_purchasable()`); attribute-match (every `{attribute,value}` against the claimed variation's own attributes, global=`pa_`-slug / local=raw case-sensitive name; mismatch → 400); per-object cap (`edit_post`/`manage_woocommerce`, never the general cap); nonce model + `Cart-Token` (sessionStorage header, not cookie) + rate-limit; per-SKU qty cap `min(req, floor(stock*0.3))`; per-fingerprint 30 s cooldown; then forwards to WC `/wc/store/v1/cart/add-item` (WC recomputes price + re-validates stock; any client price ignored). Purge hooks on `woocommerce_variation_set_stock_status` + `wc_scheduled_sales` + manual price edit.
FILES: NEW `includes/class-cart-proxy.php` (`register_rest_route('sgs/v1', 'cart/add-item', …)`).
ON-CRITICAL-PATH: yes (parallel spine). TEST: adversarial fixtures — fake price / OOS / foreign ID / attr-mismatch / disabled variation each rejected or server-priced; flood capped+cooled; the WC contract shape is exactly `variation:[{attribute,value}]`.

**U7 — Wire client add-to-cart to the proxy** · FR-27-G1 client half
PURPOSE: **replace** the current `view.js addToCart` direct Store-API `{id, quantity:1}` call with a POST to `/sgs/v1/cart/add-item` carrying `id + quantity + variation:[{attribute,value}]` (built from the selected combo). Keep the rotating nonce + `wc-blocks_added_to_cart` badge dispatch.
FILES: `product-card/view.js`.
ON-CRITICAL-PATH: yes. TEST: live add-to-cart adds the *selected* variation; badge increments; tampered payload rejected by U6.

**U8 — Cache + tax correctness** · FR-27-H3 / G6
PURPOSE: pages stay fully cacheable. Seed BOTH ex/inc-tax display values OR cache-exclude the price fragment + vary on tax context; price via `wc_get_price_to_display()`, decimals via `wc_get_price_decimals()` (never own division); `generated_at` in the manifest + a >1 h add-to-cart-click manifest refresh; purge hooks (shared with U6).
FILES: `render.php` (seed), `class-cart-proxy.php` (purge hooks), `view.js` (stale-manifest refresh).
ON-CRITICAL-PATH: no. TEST: B2B-exempt + standard customer each see the correct price from one cached page; card price == cart price; sale-end purges.

**U9 — WCAG 2.2 AA sprint + evidence** · FR-27-B1 · sonnet + design-reviewer
PURPOSE: the first-mover claim. Option-picker radiogroup (`<input type=radio>`+`<label>`, always-visible text label, arrow-key nav, 44px, `aria-disabled`+SR status on OOS, focus-visible, `prefers-reduced-motion`); card `aria-live="polite"` on price/stock; focus management after add-to-cart. Publish the evidence sheet (FR-27-J1).
FILES: `option-picker/*`, `product-card/*`, `.claude/reports/sgs-configurator-moat-evidence.md`.
ON-CRITICAL-PATH: yes (gates the ship claim). TEST (4 objective gates): axe-core 0; keyboard-only Tab+arrows no trap; NVDA+Chrome announces label+state+price/stock; every target ≥44×44px measured via Playwright computed bounding-rect.

**U10 — Performance budgets (INP/LCP/CLS)** · FR-27-H1/H2 · sonnet + performance-auditor
PURPOSE: Interactivity API only (`viewScriptModule` ≈12 KB), no WC React/jQuery; pill resolves from seeded/prefetched state (no XHR on change); default variation SSR'd, image `loading=eager`+`fetchpriority=high`, reserved-height price/stock; swap via `data-wp-bind` (no node insertion).
FILES: budget asserts in CI; `render.php` image attrs.
ON-CRITICAL-PATH: no (verification gate). TEST: lab INP ≤200 ms on a 48-SKU pill change (mandatory CI gate, throttled mid-tier 4G); block JS ≤20 KB; CLS 0 on swap; no React bundle.

**U11 — Degradation + activation prompt** · FR-27-A3/A5
PURPOSE: CPT no-WC fallback secured (IDOR fix already deployed this session ✓); WC <9.8 → read-only card (static default price, no configurator JS) + dismissible admin notice; WC activation on a site with `sgs-cpt` cards → admin migration prompt (never a silent break).
FILES: `render.php` (version-floor branch), `class-product-cpt.php`/an admin-notice class.
ON-CRITICAL-PATH: no. TEST: WC 9.7 → read-only card + notice; activating WC surfaces the prompt.

**U12 — Cloning-compat + schema-compat tests** · FR-27-I-MVP
PURPOSE: the converter keeps emitting Typed option-pickers unchanged; adding `sourceMode`/swatch attrs keeps the Typed shape a **deprecation-free subset** (Jest block.json schema-compat + PHPUnit deprecation tests assert this).
FILES: `tests/js/*schema-compat*`, `tests/php/BlockDeprecationsTest.php`, option-picker/product-card `block.json` (+`deprecated.js` if needed).
ON-CRITICAL-PATH: yes (acceptance 6). TEST: a clone run emits Typed pickers unchanged; schema-compat + deprecation tests pass.

## 3. Milestone gates

**GATE 1 — Data spine ready** · AFTER U0,U1,U2,U3 · PASS: 48-SKU fixture seeds; WC resolver matches `get_available_variations()`; manifest seeds ≤24 KB; no-JS default renders. TYPE: auto-gate.

**GATE 2 — Interactive swap + availability** · AFTER U4,U5 · PASS: pill swap with no XHR on change; 48-SKU grey-out both directions + announced; post-load OOS caught. TYPE: review-gate (Bean visual sign-off, R-22-13).

**GATE 3 — Secure add-to-cart** · AFTER U6,U7,U8 · PASS: every adversarial fixture rejected/server-priced; flood capped+cooled; sale-end purge; card price == cart price across tax. TYPE: go/no-go (security; /qc-council per commit).

**GATE 4 — A11y + perf ship claim** · AFTER U9,U10,U12 · PASS: axe-core 0 + keyboard + SR + 44px; lab INP ≤200 ms + CLS 0 + no React; cloning emits Typed unchanged + schema-compat pass; evidence sheet published. TYPE: go/no-go (ship gate = Spec 27 acceptance 1-6).

## 4. Effort (3-point PERT, AI-agent wall-time — non-coder, Claude builds, Bean QCs)

| Unit | PERT (min) | Complexity | Parallel with |
|------|-----------|-----------|---------------|
| U0 fixture | 11 | mechanical | U1 |
| U1 capability flag | 16 | mechanical | U0 |
| U2 WC resolver | 21 | architectural | (after U0) parallel U3-start |
| U3 manifest+seed | 37 | architectural | (after U2) |
| U4 card store | 27 | architectural | (after U3) |
| U5 availability | 36 | architectural | (after U4) parallel U9-start |
| U6 cart proxy | 42 | security | (after U0) parallel U2/U3/U4 |
| U7 wire add-to-cart | 11 | mechanical | (after U6) |
| U8 cache+tax | 22 | architectural | (after U6) parallel U9/U10 |
| U9 WCAG sprint | 28 | a11y | (after U4/U5) parallel U10/U12 |
| U10 perf budgets | 21 | perf | (after U4) parallel U9/U12 |
| U11 degradation | 16 | mechanical | (after U1) parallel U2 |
| U12 cloning-compat | 21 | mechanical | (after U4) parallel U9/U10 |

**Critical path U0→U2→U3→U4→U5→U9 ≈ 158 min sequential.** With parallelisation (U6 spine alongside U2/U3/U4; U8/U9/U10/U12 fan out after U4/U5): **≈ 2 AI-agent sessions (~90 min each)** including deploy/Playwright verification + Bean sign-offs at GATE 2/3. Smallest-plausible; not padded.

## 5. Risk pre-mortem — TOP risks (grounded in the actual code, parallel risk agent)

| # | Risk | Impact | Mitigation (verifiable) |
|---|------|--------|-------------------------|
| 1 | **Single-axis store can't identify 48-SKU variations.** `view.js` uses `ctx.selected` (one string); 2 axes need `ctx.selectedAxes` (object, one key per axis) + the manifest keyed by a canonical sorted combo string + a `variationId` per entry (U7 has nothing to POST otherwise). | High | Rebuild the store to `selectedAxes:{[typeKey]:key}`; manifest entries carry `variationId`; resolve combo→entry→variationId. Decide this BEFORE any U4 code. |
| 2 | **WC Store-API add-item contract unverified + attribute-key mismatch.** `variation:[{attribute,value}]` array shape AND global attrs stored as `attribute_pa_size` vs client `pa_size`. Mismatch → WC silently adds the parent, not the variation. | High | `OPTIONS /wc/store/v1/cart/add-item` on the canary's actual WC version BEFORE U6; proxy normalises keys (`attribute_`+lowercase) before compare; contract test asserts the cart holds the right variation ID. Global (`pa_`) + local (raw) fixtures both pass; fabricated key → 400. |
| 3 | **Price binding via `data-wp-text` strips WC sale HTML.** `get_price_html()` returns `<del>£12</del><ins>£8</ins>`; `data-wp-text` sets `textContent`; the Interactivity API has **no `innerHTML` binding**. | High | Restructure the price slot into separate seeded context keys (`regularPrice`/`salePrice` as literals, `<s>`+`<span>`), each `data-wp-text`-bound. Design the slot before writing U3. Test on a scheduled-sale variation. |
| 4 | **Existing code reads `_sgs_variation_sets` on the WC branch** (`get_product_data()` L320 returns `variation_sets` on both branches). Spec's mandated grep ("zero commerce reads on WC branch") FAILS on current code. | High | First U2 task: WC branch may read `_sgs_variation_sets` for `display_as` MODE only (pills/static-list/hidden), never for price/stock/image/availability (those = `get_available_variations()`). Comment + CI grep assertion. |
| 5 | **`wp_interactivity_state()` is shared across all card instances on a page.** Per-variation prices in global state → last card wins; the Mama's shop page (multiple cards) breaks. | High | Per-variation/tax data goes in per-instance `data-wp-context` (JSON on the element), NOT `wp_interactivity_state()`. Test two cards on one page with different default prices. |
| 6 | **U5 re-sync can't read combo availability from `GET /wc/store/v1/products/{id}`** — that endpoint doesn't return `find_matching_variations` data. | Med | Add a read-only `GET /sgs/v1/cart/availability/{id}` (or fold into U6) that rebuilds the manifest server-side; client-debounce re-sync to 1/30 s per card. |
| 7 | **U6 IDOR: `is_purchasable()` returns true for OOS** (checks enabled+exists, not stock). | Med | Proxy explicitly calls `is_in_stock()` → 409 `variation_out_of_stock` so the client triggers the U5 re-sync. Don't rely on WC's downstream guard alone. |
| 8 | **Rate-limit IP spoofing on Hostinger** (behind a proxy; `REMOTE_ADDR` may be the LB). | Med | Use the `Cart-Token` hash as the rate-limit key (harder to spoof) and/or `WC_Geolocation::get_ip_address()`. Flood-from-same-token test. |
| 9 | **U8 page-cache purge on Hostinger** — `wp_cache_delete()` clears object cache only, not LiteSpeed/edge page cache. | Med | `do_action('litespeed_purge_post', $id)` (if active) + `Cache-Control` re-validation header on the proxy. Test: edit a variation price → next load shows it with no manual clear. |
| 10 | **U9 `<a role="button">` fails the Space-key WCAG criterion** (current render.php). axe-core may not catch it. | Med | Use `<button type="button">` with `data-wp-on--click`, `<a href>` only as the no-JS fallback. Explicit Space-key Playwright test. |
| 11 | **Inter-block context scope** — `getContext()` reads the nearest `data-wp-interactive` ancestor; an intervening interactive wrapper breaks the card↔option-picker link. | Med | Use namespace-qualified `getContext('sgs/product-card')`; verify two option-pickers drive the card's state in a live card before U5. |
| 12 | **Canary styles come from `wp_global_styles` post 7, not theme.json** (MEMORY rule). U9 pill/contrast CSS must also be POSTed there. | High | After any card/option-picker CSS change, `push-theme-snapshot.py --client mamas-munches --target sandybrown` + Playwright-screenshot the canary. Add to GATE 2 checklist. |
| Plan | **Warm→cold-start decay** — U4-U8 gated on cloning closing; if cloning slips >14 days this plan's assumptions go stale. | Med | Hard gate in next-session-prompt ("do NOT start Task C until state.md shows cloning CLOSED"); archive this plan if >14 days pass. |

## 6. PRE-BUILD HARD PREREQUISITES (bake in BEFORE writing build code)

These five reshape the build; doing them first avoids a mid-build rebuild:
1. **Manifest schema decided first** — keyed by canonical sorted combo string; each entry = `{variationId, attrs[], priceMinor, regularMinor, saleMinor, pctOff, inStock, imageUrl?}`; decimals + currencySymbol seeded once. (Risk 1, 3, 5.)
2. **Store shape decided first** — `ctx.selectedAxes` object; per-instance `data-wp-context`; namespace-qualified `getContext('sgs/product-card')`. (Risk 1, 5, 11.)
3. **WC add-item contract verified live** — `OPTIONS /wc/store/v1/cart/add-item` on the canary BEFORE U6; attribute-key normalisation pinned. (Risk 2.)
4. **`_sgs_variation_sets` WC-branch read scoped to `display_as` only** + CI grep. (Risk 4.)
5. **Price slot restructured into seeded literal keys** (no `innerHTML` binding exists). (Risk 3.)

## 8. Adversarial-council synthesis (6-persona brutal round, 2026-06-03) — CONDITIONAL GO

**Grades (spread shows where it's weak):** Ship-PM B+ (will ship without stalling) · Cynic C+ (survives 2yr of WC change) · Spec-Lawyer C+ (precision) · Abuse-Red-Team C+ (resists attacker) · Competitor D+ (durable moat) · Support-Realist D+ (non-coder runs it without support). Engineering strong; operator-experience + moat + security-hardening weaker. **No persona graded below D+, and the big structural re-scope (AI-builder→roadmap) already happened — every must-fix is a paper re-cut, not a re-architecture.**

**Convergent headline (the gold — flagged independently by 3+ personas):** the ship gate bundles a security spine + availability engine + tax/cache engine + a11y-evidence-sheet + perf-CI-gate into the SAME gate as "Mama's can sell a variant" — recreating a smaller stall trap one level down. **Re-cut the gate so "Mama's sells" closes early; defer the hardening to independent fast-follows.** And the 2-session estimate is dishonest against the spec's own 3-4 (§540).

### 8a. The re-cut ship gate — CONSIDERED, DECLINED by Bean (2026-06-03)

> **Bean's decision: KEEP the single whole gate (all 13 units = Spec 27 acceptance 1-6 before "shipped").** The Ship-PM/Competitor "re-cut to GATE 1.5 + fast-follows" is the generic-ADHD move (less = relief); it does NOT fit Bean's completionist/perfectionist profile, where a partial gate reads as an unresolved thread, not closure. So the gate stays whole. **What IS kept from the council on this axis:** the honest **3-4 session** estimate (not 2) and the must-fix register (§8b) — those are valid regardless of how the gate is cut. The "true MVP subset" below is retained ONLY as the recommended BUILD ORDER within the single gate (build the sell-loop first, harden after — but nothing ships until all 13 land).

**Recommended build ORDER within the single gate (sell-loop first, then harden):**

**NEW GATE 1.5 = "Mama's sells" (the true MVP, ship + Bean sign-off + CALL IT SHIPPED):**
`U0 + U2 + U3 + U4 + U6 + U7 + the a11y CORE of U9 (radiogroup/44px/aria-live/keyboard) + the price-source discipline of U8 (wc_get_price_to_display + wc_get_price_decimals) + a manual clone-emit proof from U12.`
→ Pills swap live; add-to-cart is secure + server-priced; an invalid/OOS combo is caught AT add-to-cart (not pre-greyed). A real, sellable, accessible configurator.

**Deferred to independent fast-follows (each its own small win, none blocks the sell loop):**
`U1 (lean-site capability flag) · U5 (pre-emptive cross-attribute grey-out, C1) · U8-cache (dual-tax-seed + CDN purge machinery) · U9-evidence (the moat sheet, FR-27-J1) · U10-CI (the INP/CLS CI gate; do a manual Playwright check at 1.5) · U11 (WC<9.8 degradation + activation prompt) · U12-harness (full Jest/PHPUnit schema-compat suite).`

**Schedule win (pull forward during the cloning wait):** `U0 (fixture) + U6 (proxy) + the WC-contract verification` are SERVER-SIDE — they don't touch the card's rendered layout, so they DON'T affect the cloning pixel-diff baseline. They can be built and unit-tested DURING the cloning wait, even though the card-rendering units (U3/U4) stay gated. *(Decision for Bean — see the chat synthesis.)*

**Honest estimate:** true-MVP sell-loop = **3-4 AI-agent sessions** (U3 and U6 are each ~a full session once live-verification + the SSR-wipe trap + the WC-contract check + /qc-council bite); full 13-unit Phase 1 = 6-8 sessions.

### 8b. MUST-FIX register (convergent first; fold BEFORE dispatching the relevant unit)

**M-C1 — Freshness/purge model is the #1 real-money + UK-Consumer-Rights-Act risk (Cynic + Abuse + Support converged).** The purge-hook allowlist is incomplete AND uses a non-existent hook (`wc_scheduled_sales` is not real; the real ones are `woocommerce_scheduled_sale_action`, `woocommerce_product_set_sale_price`, `woocommerce_update_product`, `save_post_product`). A manual metabox price edit — the normal client path — is not covered → cached page shows £8, cart charges £11 → legal exposure. **Fix:** add a write-path-agnostic **server-side staleness guard at render** — compare `wc_get_product($id)->get_date_modified()` (one indexed read) against the manifest's `generated_at`; if newer, rebuild before serving (page stays cacheable below it). PLUS verify the real hook names against WooCommerce docs. PLUS reframe the spec's "WC never mirrored" → **"WC authoritative; SGS holds a seeded read-through cache reconciled server-side on every render + at add-to-cart"** (the slogan is what makes maintainers under-build freshness). Location: FR-27-G6, U8, §"Hard constraints".

**M-C2 — Canonical attribute-key + combo-key, verified live, ONE format across U3/U4/U6/U7 (Spec-Lawyer + Ship-PM + Cynic + Risk-agent converged — the single highest divergence).** If U3 seeds one shape and U6 validates another, **every legitimate add-to-cart is rejected, silently** (or WC adds the parent at the wrong price). **PARTIALLY RESOLVED 2026-06-03 (pulled-forward verification):** `OPTIONS /wc/store/v1/cart/add-item` on the canary (**WooCommerce 10.8.1**) confirms `variation` is an **array of `{attribute, value}` objects** — the SPEC's `variation:[{attribute,value}]` shape is CORRECT; the plan's earlier "attribute_pa_" object-form wording was the drift (now corrected). `id` is an integer (product OR variation ID). **STILL OPEN (needs the U0 fixture to pin empirically):** the exact `attribute` key STRING the Store API expects per variation (global taxonomy `pa_size` vs `attribute_pa_size` vs display name) + the per-local-attr raw-name encoding. **Fix (remaining):** (a) build U0, then add the fixture variation via the Store API and READ BACK the cart line to discover the exact accepted `attribute` string; (b) pin ONE canonical combo-key string spec (`{typeKey}:{value}` lowercase slug, sorted by typeKey, `|`-joined) + that verified attribute encoding, written identically into FR-27-G1, U3, U4, U6, U7; (c) a standing contract test asserting the **cart holds the right variation ID at the right price** (not just HTTP 200) — re-run on every WC major. Location: §6.3, FR-27-G1, U3/U4/U6/U7. **Note: WC 11.0 (28 Jul 2026) is the next major — the contract test is the upper-bound guard (Cynic MF-3).**

**M-C3 — Manifest lives in per-instance `data-wp-context` ONLY, never `wp_interactivity_state` (Spec-Lawyer + Risk-agent; fatal on the multi-card shop page).** U3's body still says "seed into both" — contradicts §6. Global state = last-card-wins → the Mama's shop grid shows the wrong prices. **Fix:** remove `wp_interactivity_state` from U3; per-product data → per-instance context; global store carries only the action functions. 24 KB cap measured on the context JSON blob. Location: U3, §6.2.

**M-C4 — Inventory-denial + qty-cap defects (Abuse "most likely abuse" + Spec-Lawyer + Cynic converged).** `floor(stock*0.3)=0` for stock≤3 → blocks buying the last units; Cart-Token is client-rotatable so the per-fingerprint cap is bypassable (4 tabs = free inventory denial via the 15-min hold). **Fix:** (a) `max(1, floor(stock*0.3))` + define low-stock pass-through; (b) add a **global per-variation-ID server-side rate limit** (transient keyed on variation ID, not the client token); (c) IP-sticky via `WC_Geolocation::get_ip_address()`; pin the fingerprint definition (one place). Location: FR-27-G6, U6.

**M-C5 — CSP specified + manifest output-escaping (Abuse, single-but-fatal).** "Mitigated by CSP" with no CSP defined = fiction; postmeta seeded into `data-wp-context` is an XSS vector. **Fix:** define the CSP header (`script-src 'self'` min) and require `wp_json_encode($d, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT)` + per-field sanitise (`sanitize_hex_color`/`absint`/`sanitize_text_field`) at BOTH save and render; XSS-in-swatch-meta test fixture. Location: FR-27-G3, U6, render.php seed. (Note: also block/throttle direct WC Store-API add-item so the proxy isn't bypassable — Abuse FR-MISSING-3.)

**M-C6 — Phase-1 lightweight go-live guard (Support #1 + Spec-Lawyer M3 + Cynic observability).** PREFLIGHT is Phase 2, so Phase 1 ships 48 live SKUs with no "is it set up right?" check — a £0/draft/no-image variation goes live and sells. **Fix:** a cheap `admin_notices` on the product edit screen counting variations with £0 price / no image / Draft status (≈20 min); add an `error_log` + admin "configurator health" surface for proxy rejections (observability — a non-coder can't debug "customers can't buy" otherwise). Location: new tiny unit at GATE 1.5; FR-27-PREFLIGHT (pull a slice forward).

**M-C7 — Image fallback chain (Spec-Lawyer #16 + Support #6).** A variation with no image → broken slot. **Fix:** specify variation image → parent product image → placeholder; no-op the swap if the entry has no `imageUrl`. Location: U2/U3/U4, FR-27-A2.

**M-C8 — U5 re-sync endpoint must be a real, secured unit (Spec-Lawyer D3 + Abuse Exploit-5) — only relevant once U5 is un-deferred.** `GET /wc/store/v1/products/{id}` can't return combo availability; a new `GET /sgs/v1/cart/availability/{id}` must exist AND be cached (60 s transient) + rate-limited + nonce/token-gated (else it's an unauthenticated DoS amplifier). **Fix:** assign it to U6's controller; build it WITH U5 (which is now a fast-follow). Location: U5, U6.

**M-C9 — Prefetch path: cut it from Phase 1 (Cynic + Spec-Lawyer + Support converged).** Mama's 48 SKUs never exceed the cap, so the prefetch fallback would be built, never exercised, and rot. **Fix:** inline-only for Phase 1 + a hard preflight rejection above the derived cap; derive the actual threshold (≈80 entries × ~300 B = 24 KB) instead of "200-300". Defer prefetch until a real >250-variation client lands (with a fixture that exercises it). Location: U3, FR-27-A2, §Manifest payload.

**M-C10 — Resolve the tax/cache "OR" + card==cart-by-construction (Cynic MF-4 + Spec-Lawyer #14 + Ship-PM).** For Mama's (UK B2C, tax-inclusive, no B2B in Phase 1): KEEP the price-source discipline (`wc_get_price_to_display()` for both card AND cart display, same context → card==cart by construction; `wc_get_price_decimals()`, never own division). DEFER the dual-ex/inc-tax-seed + CDN-vary machinery to U8-cache fast-follow. Location: U8, FR-27-H3, acceptance 1.

### 8c. SHOULD-FIX / MISSING (build-time, not pre-dispatch blockers)
- HPOS compatibility declaration (`custom_order_tables` in `before_woocommerce_init`) — one line, currently zero (Cynic).
- Proxy kill-switch option flag so a non-coder can revert to the shipped direct path without a redeploy (Cynic).
- Editor-side preview of the bound configurator (a non-coder QCs in the editor where live WC data + the store don't run the same way) (Cynic).
- All-OOS holistic card state ("currently sold out") + runtime error states (WC unreachable, variation deleted mid-session, proxy 500) (Support #4 + MISSING).
- `pctOff` guard `regular_price>0` (no /0), cap at 95 + preflight warn (Abuse Exploit-6); `_sgs_unit_divisor` range-validate 1-9999 (Abuse Exploit-2) — both Phase-2 (B3) but note now.
- Nonce-fail behaviour = explicit 403, never silent-success (Abuse FR-MISSING-4); variation-ID enumeration leak via distinct error codes (Abuse FR-MISSING-5).
- U12 schema-compat needs a baseline snapshot to diff against + gate on attr TYPE not presence (Spec-Lawyer M1 + the `inheritStyle` type lesson).
- Competitive (Spec 27 / roadmap, not this plan): pull **configurator analytics** ("combos tried-but-couldn't-buy") forward — the one revenue-language deal-winner, currently shelved (Competitor); make the WCAG claim credible (third-party audit OR narrow it to "agency-delivered") (Competitor).

### 8d. GO / NO-GO
**CONDITIONAL GO.** The plan is sound, code-grounded, and the prior re-scope was right — but it is NOT dispatch-ready as written. Build-ready once the §8b register (esp. M-C1, M-C2, M-C3 — the three that silently break a live shop) is folded and the gate is re-cut per §8a. The build is gated on cloning anyway, so there is time. **Fix before dispatch:** M-C1, M-C2, M-C3, M-C4, M-C5 (the five that touch real money / security / a live multi-card page). **Can wait for build-time:** §8c. **Decision for Bean:** adopt the GATE-1.5 re-cut + the honest 3-4-session estimate; choose whether to pull U0+U6+contract-test forward during the cloning wait.

## 7. Per-phase handoff (to /phase-planner at build time)
- Phase 1 is the only phase in scope. Trigger `/phase-planner` with scope = "Spec 27 Phase 1, GATE 1 units first (U0,U1,U2,U3)" once cloning closes.
- Entry context: this plan + Spec 27 §"Variable-product configurator" + `class-product-bindings.php` + `product-card/{render.php,view.js}` + `option-picker/view.js`.
- Build model hints per unit are inline above (opus for U3/U5 state+SSR/availability; sonnet elsewhere; design-reviewer U9; performance-auditor U10).
- /qc gate: `/qc-council` per configurator/converter commit; design-reviewer (a11y); performance-auditor (INP); Bean visual sign-off.
