# Visual diff — sgs/product-card — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

block: sgs/product-card
change: B3 crash fix + B4 legacy-default + B5 dup-CTA gating + B6 overridable trial border
canary: https://sandybrown-nightingale-600381.hostingersite.com (page 1069 = fp-eh-live-test-3)
verified_by: live Playwright on the deployed canary (R-22-11) — editor + frontend
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off)

## What changed (plain English)
Four product-card fixes. Three are editor-only (no frontend pixels change); one (B6)
is a CSS specificity change that is render-neutral by default.

- **B3** — `NumberControl` was imported as a stable export but `@wordpress/components`
  only exports `__experimentalNumberControl`, so it was `undefined`; rendering it in the
  Advanced SEO panel threw "This block has encountered an error". Fixed the import.
- **B4** — a freshly-dragged card was dropping into the legacy InnerBlocks bridge (and
  its warning notice) because the built-in branch keyed on a non-empty `productName`.
  Now legacy is detected by the presence of stored inner blocks, so fresh cards default
  to the built-in template.
- **B5** — the Buttons panel duplicated the primary CTA text/URL that the Content
  overrides panel now owns in bound mode. Gated the Buttons-panel primary text/URL to
  typed mode (style + behaviour stay for both modes).
- **B6** — the trial variant's dashed border + gradient were hardcoded at specificity
  (0,2,0), beating the new universal container-mirror border/background controls (A1).
  Wrapped the selector in `:where()` (specificity 0) so the operator's controls override.

## first-paint / frontend capture (B6 render-neutrality)
- Full-page screenshot of page 1069 captured post-deploy: `pc-frontend-2026-06-11.png`.
- Typed card, bound cards (Size/Flavour pickers + value ladders) all render correctly;
  no layout break, no missing styles, no animation first-paint defect.
- Console: 1 error only = `favicon.ico` 404 (site-chrome, unrelated to the block). No
  product-card JS errors.
- `:where()` does not touch non-trial cards (all cards on this page are non-trial), and
  for trial cards it preserves the same default dashed border — now overridable.
- first_paint_capture_passed: true (no FOUC / no animation-on-load defect observed).

## editor verification (B3 / B4 / B5)
Live Playwright on the deployed editor (page 1069), 0 console errors throughout:

- **B3** — selected the bound card, expanded the **Advanced SEO** panel: the
  `NumberControl` ("Index a specific variation") rendered; error-boundary count = 0.
- **B4** — inserted a fresh `sgs/product-card` (sourceMode `typed`, empty `productName`,
  0 inner blocks): legacy-warning shown = **false**; error-boundary count = 0.
- **B5** — bound card Buttons panel: "Primary button text" present = **false**,
  "Primary button URL" present = **false**, "Primary button style" present = **true**.

## verdict
PASS — all four fixes confirmed on the live canary; B6 is render-neutral. Bean's
editor eyeball (R-22-13) is the remaining co-authoritative sign-off.

---

## Follow-on (same day): picker-label forwarding (answers "are the in-card pickers customisable?")

change: product-card now exposes `pickerLabelFontSize` + `pickerLabelColour` (block.json
1.16.3 -> 1.16.4) in a bound-only "Picker labels" inspector group, and forwards them into
BOTH `render_block('sgs/option-picker')` sites as the option-picker's `labelFontSize` /
`labelColour`. So the built-in Size/Flavour picker labels are now customisable.

verification (block-renderer REST, product 540 = 48-SKU fixture, sourceMode wc-product,
pickerLabelFontSize=22px, pickerLabelColour=primary):
- 2 option-picker legends emitted (Size + Flavour), BOTH carrying
  `style="font-size:22px;color:var(--wp--preset--color--primary)"`.
- has font-size:22px: true; primary var present in legends: true.

dead-control guard: 0 net-new. Gate B: the 6 product-card element font-sizes the new
`*FontSize` attr falsely implicated (`.product-card .price`/`.product-desc`/`.price-from*`)
were added to scripts/hardcoded-render-defaults-baseline.json with a reason — they are
pre-existing element typography NOT owned by the forwarding attr (Gate B's E1 doesn't
parse descendant-class selectors; modifying the shared checker is a design-gated change,
deferred). verdict: PASS.

## Cleanup pass (2026-06-11): packSizes control wired
Added a "Pack sizes" TextControl (typed/built-in Price panel, comma-separated) using the previously-dead packSizesText/onPackSizesChange helpers — closes the render-without-control gap (pills were rendered with no operator control) + removes dead code. Live editor: control present. verdict: PASS.

## Shop-archive loop-context binding (2026-06-11 PM, Spec 30 P2 FR-30-3, Gate B)
**Block src change:** `block.json` adds `usesContext: ["postId"]`; `render.php` resolves the loop's
current product when `sourceMode=wc-product` AND no explicit `productId` is set — binds to the
`woocommerce/product-template` loop product so the SGS card renders inside a core WooCommerce Product
Collection (FR-30-3 Option C). Existing explicit-productId / typed / built-in modes unchanged.

Live verification — canary `/shop/` (after build+deploy+cache-bust):

| Check | Result | Verdict |
|---|---|---|
| First paint — SGS cards in core Product Collection | 5 cards, `sgs-container product-card product-card--live` | PASS |
| Loop-context binding (wc-product, no productId) | each card resolves loop product (title/price/per-unit/CTA) | PASS |
| Equal-height cards (theme CSS, `.sgs-shop-layout`) | 598 / 598 / 598 px | PASS |
| CTA baseline alignment | 28 / 28 / 28 px from card base | PASS |
| Survives Interactivity-API filter re-render | after 12-pack filter (5→3), 3 cards still 598px + CTA 28px | PASS |
| axe WCAG 2.2 AA (shop content) | 0 violations (1 site-wide nav-block `list` is pre-existing header chrome, FR-30-13) | PASS |
| Console errors | 0 (favicon 404 only) | PASS |

verdict: PASS. first_paint_capture_passed: true.
