

> ⛔ **SUPERSEDED IN PART — READ THIS FIRST (2026-08-03, after this plan was written).**
> Bean corrected the product data AFTER this plan was drafted. The plan's variant assumptions are
> now WRONG and its sizing follows from them:
>
> | This plan assumed | Actual |
> |---|---|
> | 2 axes (colour × size) = **24 SKUs** | **3 axes** — colour × size × **headrest** (Low Profile / Standard / Deep Contour) = **72 SKUs** |
> | 10 accessories, all simple on/off toggles | **8 accessories, 2 of which are NOT booleans**: Medial Thigh Support has its own 2 variants (standard / short pommel); Leg Rest has 4 sizes **constrained to match the chosen chair size** |
> | WooCommerce's 30-variation cliff "not load-bearing" | **FALSE at 72 combinations** — re-assess before building |
>
> ⚠ **The dependent-option case (Leg Rest size follows chair size) is the hardest single item** and is
> not modelled anywhere in this plan or in the existing engine. Re-scope §6 before starting.
> Canonical product data: `sites/snooza-chair/CLAUDE.md`.

---
doc_type: strategic-plan
project: small-giants-wp
plan_name: 2026-08-03-snooza-configurator-build-plan
generated: 2026-08-03
timebox: "6 weeks (quoted) — pitch-demo track is 2-3 days, separate from this timebox"
status: draft
authors: Bean + Claude (wp-sgs-developer)
primary_goal: "Ship the Snooza Chair 3D/AR configurator on a reusable SGS plugin architecture, without a false demo promise or an unbuilt accessories model surfacing mid-build"
motivation: "This is the first paid client build to lean on a genuinely new capability (WebGL/3D) instead of pattern-matching an existing block — and the pitch meeting date is fixed. Getting the model spec and the accessory-model gap right BEFORE either track starts is what keeps the 6-week quote honest."
parent_plan: null
---

# Snooza Chair 3D Configurator — Build Plan

**PLANNING ONLY.** No code touched, no DB writes, no build run. This document is the plan; execution is a separate session.

## 1. Problem

Bean has promised two different things in one proposal: (a) a working 3D/AR demo at a sales meeting "soon", and (b) a 6-week WordPress build with a £299/year configurator plugin as the product. These are not the same deliverable and the current plan conflates them — if Claude Code starts building the WordPress configurator first, there is no phone-AR demo ready for the meeting; if it builds only the demo, the 6-week quote has no head start. Separately, the existing SGS product engine (`Product_Manifest`, `sgs/option-picker`, `sgs/buybox`) only models WooCommerce **variations** (colour × size, one SKU, one price) — verified in code there is zero concept of a separately-priced, independently-toggleable add-on product bundled into the same order, which is exactly what Snooza's 10 accessories are. If this gap surfaces mid-build instead of now, it is the largest unplanned item in the project.

## 2. Plain-English summary

**Problem:** Bean needs a phone-AR demo before the pitch meeting, and a 6-week WordPress build after it's won — and the engine that already exists doesn't know how to sell "chair + optional tray + optional headrest" as one order.

**Effect:** Without separating the two tracks, the demo slips past the meeting date. Without flagging the accessory gap now, week 3-4 ("ecommerce integration") discovers it needs an add-on cart mechanism that was never scoped or estimated.

**Solution:** Two tracks. Track 1 (days, not weeks): one 3D file + one static HTML page, no WordPress, de-risks the meeting. Track 2 (the 6-week build): reuses the existing variation engine for colour×size, and adds a genuinely new "add-on products" mechanism for the 10 accessories — the single largest real new-build item, sized honestly below.

## 3. Solution shape

- **Track 1 — Pitch demo (parallel, ships first, independent of Track 2).** One AI-generated `.glb`/`.usdz` pair of ONE chair colour, a static `<model-viewer>` HTML page (no WordPress), hosted anywhere reachable from a phone browser. Goal: Bean opens a link, taps AR, sees the chair on the meeting-room floor.
- **Track 2 — The 6-week build.** New `sgs/product-viewer` block (OGL/model-viewer-based) wired to the EXISTING variation engine for colour + size (verified reusable, see §5), PLUS a new "add-on products" mechanism for the 10 accessories (verified NOT to exist, see §5), PLUS a11y-by-design defaults (no autoplay spin, keyboard parity, non-3D fallback), PLUS the reusable-plugin packaging decision the £299/year licence implies.

## 4. Out of scope

- Rebuilding WC cart/checkout/payments/shipping — the existing `/sgs/v1/cart/add-item` proxy and WC's own checkout are reused as-is.
- A general-purpose 3D product configurator "engine" for arbitrary future clients beyond what Snooza needs — build for Snooza, generalise later if a 2nd 3D client lands (mirrors the Spec 27 MVP-first precedent).
- WebGL cursor/fluid effects (separate Spec 38 research track, unrelated).
- Multi-colour SIMULTANEOUS 3D models (one model, material-swapped — see §7).
- AI-builder / brief-to-shop automation (FR-27-R5) — irrelevant here, already decision-gated elsewhere.
- Wholesale/B2B role pricing, subscriptions, multi-currency — not in the Snooza brief.
- A finished visual design pass on the accessory-toggle UI beyond "accessible, on-brand, matches SGS pill/card idiom" — detailed design happens inside the build, not this plan.

## 5. Verified have/need table

Verified by reading the actual files below — not assumed from the spec's prose, which the CLAUDE.md docs themselves warn drifts.

| Capability | Status | Evidence (file:what it proves) |
|---|---|---|
| Variation-axis engine (colour × size → SKU/price/stock, live WC read-through) | **HAVE — reusable as-is** | `plugins/sgs-blocks/includes/class-product-manifest.php` — `Product_Manifest::build()` reads WC variable-product variations live via `wc_get_product()`, returns axes+combos+defaultKey. Snooza is 6 colours × 4 sizes = 24 combos, well under the 30-variation WC cliff this engine was built to survive past. |
| Accessible pill/swatch picker, one per axis | **HAVE — reusable as-is** | `plugins/sgs-blocks/src/blocks/option-picker/` — radio-group semantics, WCAG-gated (FR-27-B1: axe-core 0, keyboard nav, 44px targets, `aria-disabled` on unavailable). Directly fits colour + size axes. |
| Secure add-to-cart (single product, server-authoritative price/stock) | **HAVE — reusable as-is** | `includes/class-cart-proxy.php` (per Spec 27 FR-27-G1/G2) — `/sgs/v1/cart/add-item`, IDOR + attribute-match + rate-limit; live-verified against adversarial fixtures per the spec's Phase 1 acceptance record. |
| Cross-attribute availability past 30-variation cliff | **HAVE — not load-bearing for Snooza** (24 combos, under WC's native 30-variation ceiling) but a bonus: still correct, no extra work needed. | `Product_Manifest` FR-27-C1 in spec §454-544. |
| PDP composition (gallery column + configurator column, thumbnail strip, price row, add-to-cart) | **HAVE — reusable as-is** | `plugins/sgs-blocks/src/blocks/buybox/block.json` — 2-col grid, variation-aware gallery, notify-me-when-back-in-stock form. |
| WCAG 2.2 AA card-level gates (axe-core 0, keyboard, SR announcements, 44px targets) | **HAVE — proven, not just declared** | Spec 27 §"Phase 1 SHIPPED", FR-27-B1 done-when criteria; this is the exact bar the new 3D viewer must also clear, not a lower one because it's "just visual". |
| ProductGroup + hasVariant JSON-LD (SEO schema for the variant matrix) | **HAVE — reusable as-is** | `includes/class-product-schema.php` per FR-27-E1, Rich Results 0 errors, live-verified on canary. Colour/size axes will emit correctly; accessories will NOT (see gap below) unless separately modelled. |
| 3D/AR model viewer (any kind) | **NEED — zero existing code.** `grep` across `plugins/sgs-blocks` for `model-viewer`, `three`, `ogl`, `webgl`, `glb`, `usdz` returns nothing block-related. | No file. This is 100% new. |
| Model↔variant-selection wiring (colour pill selects → model changes material) | **NEED — zero existing code.** The Interactivity store in `product-card`/`view.js` fires `sgs:option-selected` events (verified, FR-24-15) that a NEW listener can subscribe to — the WIRING POINT exists, the wiring itself does not. | `src/blocks/option-picker/` emits the event; nothing currently listens for it to drive a 3D scene. |
| **Accessories as separately-priced, independently-toggleable add-ons** | **NEED — confirmed absent, not partially built.** Grep across the whole `sgs-blocks` plugin for `addon`/`add-on`/`accessory`/`accessories`/`bundle`/`upsell`/`cross-sell` returns 56 files, but every real hit is unrelated noise (webpack "bundle", CSS "draggable" scroller, `related` in code comments) — zero hits are a commerce add-on mechanism. `buybox/block.json`'s full attribute list (soldOutLabel, notifyEnabled, framingMode, decoyEnabled, drag/loop toggles) has no accessory-adjacent attribute at all. | See §6 for the sizing. |
| Reusable, WC-decoupled plugin packaging (the £299/year licence implies a product, not a client-shaped block) | **NEED — architectural decision + partial refactor.** `Product_Manifest`, `class-cart-proxy.php`, and the schema emitter all live inside `sgs-blocks` (the whole framework plugin) and assume WooCommerce is present (`function_exists('wc_get_product')` guards, not a hard dependency — that part is fine per Spec 27 design principle 1). But there is no extraction boundary between "generic SGS configurator" and "Snooza-specific glue" — see §9. | `sgs-blocks.php` bootstraps everything as one plugin; no `sgs-configurator-pro` sub-plugin or feature-flag boundary exists. |

**Bottom line:** the variant/commerce/a11y/SEO plumbing for colour+size is a genuine head start — don't rebuild it. The 3D layer and the accessories layer are both real, unstarted work, and accessories is the larger of the two because it requires a NEW cart-line-item model, not just a new block.

## 6. The accessory-model gap, assessed properly

**What exists today (variations):** one WC variable product, N attribute axes, each combination resolves to exactly ONE variation = ONE SKU = ONE price = ONE line item in the cart. This is what colour × size needs and it is fully built.

**What accessories need (add-ons):** the customer buys ONE Snooza Chair (itself a variation-selected SKU) PLUS zero-or-more of 10 separate WC **simple products** (Rocker Base, Snooza Lite, Mobile Base, Pommel, Leg Rest, Profile Headrest, Padded Tray, Side Infill Pads, Base Wedge, Back Rest Adjustment), each independently priced, each toggled on/off, all landing in the SAME order as separate cart line items (or, alternatively, as a WC "composite"/"bundle" product — see options below).

**This is not a UI problem, it's a data-model + cart problem:**
1. The PDP needs a new repeatable block section — "Add accessories" — a checkbox/card grid of 10 products, each showing its own image/price/toggle. This is new UI but a shallow build (reuses `sgs/card-grid` idiom + a togglable state, not a new interaction paradigm).
2. `/sgs/v1/cart/add-item` (the existing proxy) adds ONE product/variation per call. Adding N accessories alongside the main chair means either (a) N sequential proxy calls from the client after the main add-to-cart succeeds, or (b) extending the proxy to accept an array of `{id, quantity}` pairs and add them as a single atomic multi-item cart mutation. **(b) is the correct shape** — it matches the existing "server-authoritative, one guarded path" principle (FR-27-G1) instead of multiplying the attack surface across N unguarded sequential calls.
3. The running total shown on the PDP (chair price + selected accessories) needs live client-side summation — a new piece of Interactivity-API state, not reusing the existing manifest (which prices ONE variation, not a variation-plus-selection-set).
4. SEO schema: `hasVariant` in `ProductGroup` JSON-LD is variation-specific and must NOT try to represent accessories as variants (that would be schema misuse — Google's `variesBy` enum has no "accessory" semantic). Accessories are correctly modelled as separate `Product` entities, optionally cross-referenced. This is a small but real scoping decision the build must make explicitly, not backfill.
5. Two implementation options exist and the build should pick one deliberately, not accidentally:
   - **Option A (recommended): "accessories as separate cart line items via an extended add-item proxy."** Lower WC-plugin risk, no new WC product type, works with vanilla WooCommerce. Matches Spec 27's existing "WC is the single source of truth, SGS adds UI" principle.
   - **Option B: WooCommerce Product Bundles / Composite Products (paid WC extensions).** Would remove build effort but adds a THIRD-PARTY PAID DEPENDENCY to a product SGS is licensing at £299/year — contradicts "you own the site, no monthly platform fees" in the proposal's own value prop. Rejected unless Bean explicitly wants it.

**Sizing (smallest plausible, not padded):** the accessory toggle UI + running-total state is a 1-day build for an AI-assisted session (it reuses existing card-grid/toggle patterns). Extending the cart proxy to accept a multi-item array with the SAME security guarantees (IDOR + stock + rate-limit checks per line) is the harder part — realistically a half-day to one-day of careful work, because every existing adversarial-fixture test (FR-27-G1/G2) needs a multi-item equivalent, not just a happy-path add. **Total: 1.5-2 days**, not the "included in build" hand-wave the proposal currently implies. This is the single largest hidden item flagged by this plan.

## 7. The 3D model specification (hand this to whoever makes the model)

**Format requirement (verified from research, not assumed):** the `@google/model-viewer` library needs a `.glb` for Android Scene Viewer AR and a `.usdz` for iOS Quick Look AR — these are two different files, not one file with two extensions. `model-viewer` can auto-generate a `.usdz` from a `.glb`, but Google's own documentation is explicit that the auto-conversion "might not produce desired results." **For a live sales-pitch demo on an iPhone, do not rely on the auto-converted `.usdz` — generate/verify it explicitly before the meeting.**

**One model, swappable materials — not six models.** AI photo-to-3D generation is weakest on soft foam/fabric (exactly what the Snooza Chair is made of), so the fewer times it has to generate geometry from scratch, the better the odds of a usable result. The build needs:
- ONE base geometry (the chair shell/foam form), generated once, approved once.
- SIX material variants (Mandarin Orange, Royal Blue, Apple green, Grey, Hot Pink, Black) applied to that ONE geometry via material/texture swap at render time — `model-viewer` supports runtime material variants natively (this is a standard glTF feature, not a custom build).
- Accessories as SEPARATELY TOGGLEABLE MESHES within the same `.glb`/scene graph (headrest, tray, pommel, leg rest, etc. as independently visible/hidden nodes) — NOT six separate accessory models, and NOT baked permanently into the base geometry. This must be specified to the model-maker BEFORE generation starts, because retrofitting toggleable sub-meshes onto an already-baked single-mesh model is materially harder than generating it with named, separable nodes from the start.
- **Reference image gap flagged:** the client CLAUDE.md names specific files (`fortuna-blue.jpg`, `video-still-001.jpg`, `video-still-020.jpg`, `video-still-100.jpg`) as the best AI-generation source images, but a `Glob` for `sites/snooza-chair/assets/product-images/*` in this session returned **zero files** — the assets directory referenced in the client CLAUDE.md does not exist yet at that path, or was not created. **This must be verified/populated before Week 1 (the model-generation week) starts, or Week 1 has no source images to work from.**

**Week-1 critical path, stated plainly:** the proposal's own timeline names "3D model generated + approved" as Week 1. Given the foam/fabric weakness and the toggleable-mesh requirement above, this is the single highest-risk week in the whole 6-week quote — not a formality.

## 8. Accessibility-by-design decisions (not bolted on after)

Two client-specific facts drive different defaults than a generic 3D product viewer would use:

1. **Photosensitivity (WCAG 2.3.1) — the product is sold to families managing epilepsy.** Default behaviour MUST be: **no auto-rotation on load, no auto-play spin, no flashing/rapid material-swap transitions.** The model loads static, front-on, in its default colour. Rotation and material swaps happen ONLY on explicit user action (drag, tap, or a labelled "rotate" control), never automatically. This is a hard default, not a togglable "nice to have" — flip the doctrine's usual "add motion for delight" instinct for this one client.
2. **Buyers are carers/clinicians/OTs, often on older NHS hardware, often keyboard-driven — a mouse-drag-only viewer excludes real purchasers.** Required, not optional:
   - Full keyboard operability: Tab to the model, arrow keys to rotate, Enter/Space to toggle AR where supported, Escape to exit an expanded/fullscreen view. `model-viewer` supports keyboard interaction natively but it must be explicitly tested, not assumed.
   - A **non-3D fallback path** for every capability the 3D viewer offers: a static image gallery (the existing `sgs/buybox` gallery-column mechanism, already built, already accessible) must remain fully functional and be the DEFAULT shown to any browser/device that fails the WebGL capability check (old NHS Trust-managed laptops are a realistic worst case) — via a `detect-gpu` (MIT-licensed) capability gate, per the byte-budget note below.
   - Colour/size selection state must stay screen-reader announced exactly as the existing `option-picker` already does (FR-27-B1) — the 3D model updating is a visual bonus on TOP of the existing accessible picker, never a replacement for it.
   - Reduced-motion respect (`prefers-reduced-motion`) gates any camera animation/auto-framing transition, same pattern already used elsewhere in the framework (Spec 38 doctrine).

## 9. Reusable plugin architecture (the £299/year line)

The proposal prices this as a plugin licence, meaning Bean is committing to sell it again. That has one direct architectural consequence this plan flags rather than defers:

- **Build the 3D-viewer block and the accessory-toggle mechanism as generically as the variation engine already is** — i.e. no hardcoded Snooza colour names, no hardcoded accessory list length, no hardcoded "6 colours × 4 sizes" assumption anywhere in the block/PHP logic (matches the framework's own R-31-9 "no per-block/client hardcoding" rule, which already governs everything else in this plugin).
- **What does NOT need to happen for Snooza's build:** carving the configurator out into a physically separate `sgs-configurator-pro` plugin directory. That is a packaging/licensing exercise (build once, ship once, gate by licence key) that has zero bearing on whether Snooza's own site works — it can happen later, once there is a second paying customer, exactly the precedent already set by Spec 27's own MVP-first phasing ("friendly authoring... build when a 2nd shop client lands", later revised only because Bean explicitly chose to). Flagging this now so it is a deliberate deferral, not a silent one.
- **What DOES need to happen now:** keep the 3D-viewer and accessory-toggle code inside `sgs-blocks` in their own clearly-bounded block folders (`src/blocks/product-viewer/`, and accessory logic inside `buybox`/a new `sgs/product-addons` block) so that a future extraction is a `git mv`, not a rewrite.
- **WC-coupling check:** `Product_Manifest` and `class-cart-proxy.php` already guard every WC call behind `function_exists('wc_get_product')` (Spec 27 design principle 1 — "WC is optional at the framework level"). The new accessory-cart-proxy extension must follow the same guard. No new WC-hard-dependency risk introduced by this plan.

## 10. Byte budget

Per the WebGL research already on file (`.claude/reports/2026-08-02-webgl-adoption-research.md`), `three.js` alone is 182KB gzipped — 3.6× the framework's whole 50KB/page JS budget — and `@google/model-viewer` bundles three.js internally, so it is unavoidably over budget by the letter of the existing rule.

- **Recommendation:** add an explicit **configurator-page byte budget exception** (documented, not silent) — product/PDP pages carrying the 3D viewer get a separate budget line (a realistic ceiling to research/confirm in the build session — `model-viewer`'s own gzipped size plus the existing buybox/product-card JS, likely 150-220KB total for that page class), while every other page on the site keeps the standard 50KB/page rule untouched. This mirrors how the framework already treats GSAP/Lenis as Tier G/H bounded exceptions rather than blanket budget changes.
- **Gate it with `detect-gpu` (MIT, small, purpose-built)** — checked before `model-viewer`'s script even loads. Devices that fail the capability check get the static image gallery (already built, zero extra bytes) instead of ever downloading the 3D bundle. This keeps the byte cost opt-in per capable device, not a tax on every visitor.

## 11. Ranked risks

| Risk | Phase | Likelihood | Impact | Status | Mitigation / Owner |
|------|-------|-----------|--------|--------|---------------------|
| Week-1 3D model (foam/fabric AI generation) doesn't converge in one pass | Track 2, Week 1 | H | H | Owned | Owner: Claude Code + Bean review gate at end of Week 1. Spec toggleable-mesh + single-geometry requirement BEFORE generation starts (§7); budget a 2nd generation pass into Week 1, not Week 2. |
| Reference image directory (`sites/snooza-chair/assets/product-images/`) doesn't exist yet | Track 1 + Track 2 Week 1 | H (confirmed absent this session) | M | Owned | Owner: Bean — populate or confirm the real source before either track starts model work. |
| iOS `.usdz` auto-conversion looks wrong on the actual demo phone | Track 1 (pitch demo) | M | H (demo-day failure is the worst possible outcome — it's the whole pitch) | Owned | Owner: Claude Code — generate/verify the `.usdz` explicitly, test on an actual iPhone, days before the meeting, not same-day. |
| Accessory cart-proxy extension reopens security surface the existing adversarial-fixture suite doesn't cover | Track 2, Weeks 3-4 | M | H (payment-adjacent) | Owned | Owner: Claude Code — write multi-item equivalents of the existing IDOR/OOS/attribute-mismatch/rate-limit fixtures (FR-27-G1/G2 pattern) BEFORE shipping the extended proxy, per this project's root-cause/prove-the-cause discipline. |
| Byte-budget exception becomes precedent-creep (other blocks start claiming "it's a bounded exception too") | Track 2 | L | M | Accepted | Document the exception explicitly in Spec 38/CLAUDE.md as configurator-page-scoped only, same discipline already used for GSAP/Lenis. |
| Photosensitivity default gets silently overridden by a later "add some delight" pass (common motion-doctrine drift pattern already seen elsewhere in this framework) | Track 2, any later session | M | H (safety-relevant, not cosmetic) | Owned | Owner: whoever builds it — hardcode the no-autoplay default at the block-attribute level (not just a documentation note) so a future session can't silently flip it without deliberately changing an attribute default. |
| 6-week timeline assumes accessory cart-proxy work is "included" | Track 2, Weeks 3-4 | H (already true today — the proposal doesn't itemise it) | M | Owned | Owner: Bean — decide whether to absorb the 1.5-2 day accessory-proxy cost inside the existing quote or flag it to the client now, before Week 3. |
| `model-viewer`'s bundled three.js triggers the byte-budget prebuild gate and fails CI | Track 2, build phase | M | L (annoying, not blocking) | Mitigated | The gate needs the configurator-page exception (§10) registered BEFORE the block ships its first build, not discovered as a failing gate mid-session. |

## 12. Phase overview

| Phase | Name | Timebox | Deliverable | Depends on | Gate |
|-------|------|---------|-------------|------------|------|
| 0 | Pitch-demo track (parallel, independent) | 2-3 days | One `.glb`+`.usdz` pair, one static AR-enabled HTML page, tested on the actual demo phone | Reference images confirmed to exist | Bean opens the link on his phone, taps AR, sees the chair on the floor |
| 1 | 3D model spec + generation (Track 2, Week 1 of the quote) | ~1 week (as quoted) | Approved single-geometry, material-variant, toggleable-mesh `.glb` model | Reference images confirmed; §7 spec handed to model-maker | Bean visual sign-off on the approved model, all 6 material variants + accessory meshes toggle correctly in a viewer |
| 2 | `sgs/product-viewer` block + variant wiring | Weeks 2-3 | New block renders the model, colour/size pill selection swaps material/geometry live, a11y defaults in place (§8) | Phase 1 model | axe-core 0 on the new block; keyboard-only walkthrough passes; no-autoplay verified live |
| 3 | Accessory add-on mechanism | Weeks 3-4 (the largest real new item, §6) | Accessory toggle UI + extended multi-item cart proxy with full adversarial-fixture parity | Existing `class-cart-proxy.php` (reused, extended) | Multi-item add-to-cart security fixtures pass; running-total UI correct |
| 4 | Ecommerce integration + checkout flow | Week 3-4 (as quoted, overlaps Phase 3) | Chair + accessories flow through the existing WC checkout unchanged | Phase 3 | A real test order with 2 accessories completes checkout correctly |
| 5 | Polish, mobile QA, byte-budget verification, content | Week 5 | Configurator-page byte budget confirmed against the new exception; mobile/keyboard/reduced-motion re-verified | Phases 2-4 | Design-reviewer + performance-auditor pass; WCAG 2.2 AA re-confirmed on the finished PDP |
| 6 | Launch | Week 6 | Live site | Phase 5 | Bean sign-off |

## 13. Open Questions

1. Does Bean want Option A (extended cart proxy, no paid WC extension) or Option B (WC Bundles/Composite Products, paid dependency) for accessories? This plan recommends A (§6) but it is Bean's call given the "no monthly fees" promise already made to the client.
2. Where do the reference product images actually live? The client CLAUDE.md names files that were not found in this session's `Glob` — confirm the real path before Week 1 starts.
3. Configurator-page byte budget ceiling — needs a build-session measurement of the real `model-viewer` + existing buybox JS total, not the estimate in §10.
4. Does the £299/year licence extraction (packaging into a standalone plugin, §9) happen before or after Snooza's own launch? Recommended: after, but Bean may want it sequenced differently for a second prospect already in the pipeline.
