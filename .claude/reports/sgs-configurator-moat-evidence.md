---
doc_type: report
title: SGS Variable-Product Configurator — Ownable-claims evidence sheet
spec: 27 (FR-27-J1)
project: small-giants-wp
generated: 2026-06-04
status: LIVE — all 5 claims evidenced on canary page 589 (fixture product 540, 48 SKUs) as of U10 (2026-06-04). One sub-budget (page-JS-weight) missed by WC-core jQuery, parked.
canary: https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/
---

# SGS Configurator — moat-evidence sheet (FR-27-J1)

Every claim SGS makes about the variable-product configurator carries (1) a concrete
test, (2) the evidence, and (3) a **durability rating** so we know which claims are a
defensible moat and which are copyable features we ship anyway.

**Durability legend**
- **structural** — the end-to-end closed loop (SGS builds the shop AND it renders
  accessibly + SEO-complete, no plugin-stitching). The real, hard-to-copy moat.
- **first-mover** — true today, copyable in principle; the advantage is planting the
  claim loudly first (and backing it with evidence).
- **expiring** — a real edge now that erodes as the ecosystem catches up; ride it,
  don't bank on it.
- **feature** — a genuine user benefit a competitor can replicate; ship it anyway.

---

## Claim 1 — WCAG 2.2 AA across the whole configurator card · **first-mover**

> "SGS variable-product configurators meet WCAG 2.2 AA — keyboard-operable, screen-reader-announced, 44px touch targets, zero automated violations."

**No competitor variable-product configurator claims WCAG 2.2 AA** (research grounding, Spec 27 §background; AllAccessible.org Oct 2025). This is the loud first-mover claim.

**Test — four objective gates (FR-27-B1), live on page 589, 2026-06-04:**

| Gate | Method | Result |
|------|--------|--------|
| (a) axe-core 0 violations | axe-core run scoped to `.product-card--bound`, tags wcag2a/2aa/21a/21aa/22aa | **0 violations** |
| (b) keyboard operable | Playwright key-drive | ArrowRight moves the radiogroup (12-pack→24-pack, price reactively → £18.99); Tab reaches the button and exits the card (**no focus trap**); **Space fires add-to-cart AND Enter fires add-to-cart** |
| (c) screen-reader structure | DOM/ARIA inspection | 2 `role="radiogroup"`, each `aria-labelledby` its legend (Size/Flavour); button accessible-name "Add to Cart"; 4 `aria-live="polite"` regions (price, stock, availability, cart-status) |
| (d) 44px targets | computed bounding-rect | all 16 pills + the add-to-cart button measured ≥44×44px |

Plus **0 console errors**. Evidence: `reports/visual-diff/product-card-2026-06-04.md` (U9 section) + `reports/visual-diff/product-card-u9-button-2026-06-04.png`.

**The U9 fix that earned this gate:** the add-to-cart control was an `<a role="button">`, which activates on Enter only — pressing **Space** scrolls the page instead (a WCAG 2.1.1 failure that **axe-core does not catch**, because the ARIA role is technically valid). It is now a native `<button type="submit">` inside a `<form action=permalink>`: Space **and** Enter both activate it, and the form is the no-JS fallback (submitting lands the visitor on the product page).

**Honesty caveat (Spec 27 §8c, competitor red-team):** these are automated + scripted-keyboard gates plus a manual ARIA-structure check. Before this claim goes into public marketing, EITHER commission a third-party accessibility audit OR scope the public wording to "accessibility-first, agency-delivered and tested to WCAG 2.2 AA". A live NVDA/VoiceOver pass is recommended to confirm gate (c) end-to-end (the structure is correct; the human-AT confirmation is the remaining step).

---

## Claim 2 — Cross-attribute availability past WooCommerce's 30-variation cliff · **feature**

> "Impossible and sold-out combinations grey out in both directions, even on products with more than 30 variations — where WooCommerce's own front-end stops working."

WooCommerce's `find_matching_variations` only operates at/below `woocommerce_ajax_variation_threshold` (default 30). Mama's has 48, so native WC cannot do this. SGS computes availability client-side from the seeded manifest.

**Test (U5, live page 589):** select 12-pack → "coffee" greys (variation 546 OOS); select coffee → "12-pack" greys; greyed options carry `aria-disabled="true"` + `(unavailable)` SR label + a polite announcement; **0 XHR on select**. A post-load sell-out is caught at add-to-cart (409 → one availability re-sync). Copyable by a competent developer, so a feature, not a moat — but a strong sales point on real catalogues.

---

## Claim 3 — Secure, server-authoritative add-to-cart (no client-set prices) · **feature / structural**

> "The shopper's browser never sends a price. The server re-computes the price and re-checks stock on every add — tampered, out-of-stock, foreign-ID, attribute-mismatch and flood requests are all rejected."

**Test (U6/U7, live adversarial suite, product 540):** no-nonce → 403; valid → 200 (cart holds the right variation at the server price); IDOR/parent-id/attr-mismatch/empty-variation → 400; OOS → 409; qty-cap clamp 50→30; direct Store-API over-cap bypass → 400. The single enforced add-to-cart path (`woocommerce_add_to_cart_validation` filter holds the cap on direct calls too). A feature in isolation; part of the **structural** closed loop when combined with Claims 1, 4, 5.

---

## Claim 4 — No React bundle + fast interaction (lean Interactivity API) · **expiring** · ✅ MEASURED (U10)

> "The configurator carries no WooCommerce React bundle. Picking a pill repaints in well under 200 ms with zero layout shift and zero network calls."

**Measured live on the canary, throttled to mid-tier mobile (4× CPU + ~4G), 2026-06-04:**

| Budget | Target | Measured | Pass |
|--------|--------|----------|------|
| Lab INP on a 48-SKU pill change | ≤200 ms | **152 ms** (Event Timing, slowest interaction, throttled) | ✅ |
| CLS on swap | 0 | **0** | ✅ |
| CLS on load | ≤0.1 | **0** | ✅ |
| LCP | ≤2.5 s | **1.96 s** | ✅ |
| XHR on pill change | 0 | **0** | ✅ |
| No React / wc-blocks bundle on the page | none | **none** (Interactivity API runtime ~12 KB, not React) | ✅ |
| Configurator block JS | ≤20 KB | **product-card 4.0 KB + option-picker 0.6 KB** | ✅ |
| Total product-page JS (decoded) | ≤150 KB | **207 KB** (transfer 78 KB gzip) | ❌ |

**The one miss is honest and not the configurator's:** the 207 KB decoded total is dominated by **WooCommerce core jQuery (~100 KB: jquery + migrate + blockUI) + WooCommerce frontend scripts (woocommerce.min, add-to-cart, sourcebuster, order-attribution) + 5 SGS-theme animation scripts**. The configurator's own JS is ~20 KB (block modules + the shared Interactivity runtime). Meeting the strict ≤150 KB-decoded budget requires dequeuing WC's legacy frontend scripts (the page uses the SGS proxy, not WC's native jQuery add-to-cart) + the unused theme animation scripts on configurator pages — a scoped optimisation parked as `P-CONFIGURATOR-JS-WEIGHT-DEQUEUE` (low value vs side-effect risk; transfer weight + interaction perf are already good).

Marked **expiring** deliberately: WooCommerce is migrating to the same lean Interactivity approach (Oct 2025), so the no-React edge erodes over time — ride it, don't bank on it.

---

## Claim 5 — End-to-end closed loop: SGS builds the shop AND it renders accessibly + SEO-complete · **structural** · partial

> "One agency builds the whole shop — cards, configurator, accessible UI, and (Phase 2) complete SEO/Merchant schema — with no plugin-stitching."

This is the **real moat**: not any single feature, but that the same system delivers all of them coherently. **Evidenced now:** Claims 1–3 ship together on one card from one build. **Pending:** the SEO/JSON-LD/Merchant-listing half is Phase 2 (FR-27-E/F). The closed loop is partially demonstrated; full structural claim lands when Phase 2 ships.

---

## Summary

| # | Claim | Durability | Evidence status |
|---|-------|-----------|-----------------|
| 1 | WCAG 2.2 AA whole card | first-mover | ✅ 4 gates pass (3rd-party audit advised before public marketing) |
| 2 | Cross-attribute availability past 30-var cliff | feature | ✅ live U5 |
| 3 | Server-authoritative secure add-to-cart | feature / structural | ✅ live adversarial suite U6/U7 |
| 4 | No-React lean performance | expiring | ✅ measured U10 (INP 152ms · CLS 0 · LCP 1.96s · no React; page-JS-weight miss = WC core jQuery, parked) |
| 5 | End-to-end closed loop | structural | ◑ partial (SEO half = Phase 2) |
