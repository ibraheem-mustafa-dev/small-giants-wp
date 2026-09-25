# Eye Care Wave C task 1: the shared product card (the draft's Frame Card)

**Status:** DONE 2026-09-25 (framework 62a13e4e6 → 193a365a8, live on eye-care-test; Home tree rebuilt to page 208).
Parent plan: `2026-09-24-eye-care-hand-build-design.md` (Wave C).

**Verified live** (`scratchpad` best-sellers probe, draft vs live, side by side looked at): card widths 321 / 323 / 163
at 1440 / 768 / 375 on both; brand Playfair 12.5px/500, title Outfit 16px/400, price Outfit 18px/500, RRP 13px struck
through, 4 colour dots in the shop's term order, heart, SAVE badge from `_sgs_rrp`, square image, Polarised tag.
Accepted divergences: stars (the test shop has no reviews, so "No reviews yet" is the live truth); at 375 the RRP sits
beside the price rather than on the dots' line. The saving badge's 400 weight / 0.1em / 12px inset (193a365a8) ships
with the next deploy.
Also found and fixed on the way: a font preset slug (`body`) in any SGS typography font-family was emitted literally
(browser fell back to serif) and now emits its preset variable; "From" shows only when variation prices differ; all 16
products had been silently drafted by the product preflight gate (seed now maps colour terms to Google `color`, gives
photo-less products the shared "Photo to come" image, publishes last).
**Deferred:** the saved-items page and account-stored wishlist stay with the wishlist build (parent plan, gap map
"Wishlist hearts with persistence"); the preflight gate reverting an already-published product on any failing re-save
is a behaviour question recorded for Bean.
**Written for:** Bean and any session picking up Wave C.

**Goal:** one product card, the existing `sgs/product-card` in live WooCommerce mode, that matches
`sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/Frame Card.dc.html`, used by Home's best sellers, the
shop grid and related products. Done = Home's best sellers match the draft at 1440, 768 and 375.

## What the comparison found (2026-09-25, draft vs live Home page 208)

| Draft | Live | Cause |
|---|---|---|
| 4 cards a row from 1280, 3 below, 2 below 1024, 18px gap (10px phone) | 3 a row, 24px gap | tree: container columns |
| Brand top-left on the image (Playfair, 0.26em, white fade) | missing | `brandName` is typed only; live mode never reads the product's brand |
| Heart button top-right | missing | no wishlist element exists |
| "Save £32" badge, RRP struck through beside the price | badge typed by hand, no RRP | the RRP is `_sgs_rrp` meta; only `sgs/buybox` reads it (`rrpMetaKey`) |
| Stars and "4.9 (41)", or "No reviews yet" | "No reviews yet" | correct: the test shop has no reviews (the draft's counts are demo data) |
| Four 17px colour dots then "+N", right of the price | full option-picker pills and a "View product" button | `showPickers` on; `colourSwatches` typed only; no way to hide the button |
| Name only ("Aviator Classic"), 16px body font | "Ray-Ban Aviator Classic" in Playfair, plus the code line | seed titles carry the brand; the code is the short description, always shown |
| Square image box, `#F3F0EB` ground | 220px box | fixed-height media box, no aspect-ratio setting |
| Square corners, 1px `#E6E1DA` border, no resting shadow, hover lift with a deep shadow | 16px radius and a resting shadow | settings (radius exists; the shadow has no setting) |

## Framework changes (all general; any shop can use them)

1. **Live values fill the Frame Card elements.** New `includes/product-card-live-fill.php` (render.php is over the
   300-line limit, so it gains one call only): when a live product resolves and the typed value is empty,
   brand comes from the `product_brand` term, the rating and review count from WooCommerce, the saving badge and a
   struck-through RRP from `rrpMetaKey` / `rrpSavingFormat` (the buybox's settings, now on the card too, sharing one
   helper moved to `includes/product-rrp.php`), and colour dots from the variation attribute named in
   `swatchAttribute` (empty = the first attribute whose terms carry `_sgs_swatch_color`).
2. **Show/hide:** `showDescription` and `showCta` (both default on, so existing cards are unchanged).
3. **Wishlist heart:** `showWishlist` (default off). A button on the image, top-right, `aria-pressed`, stored in the
   browser (`localStorage`) under one shared Interactivity store `sgs/wishlist`, so a later saved-items view can read
   it. Deferred: account storage and the saved-items page, which stay with the wishlist build in the parent plan
   (gap map "Wishlist hearts with persistence").
4. **Image box:** `imageAspectRatio` (the shared aspect list); when set, the box follows the ratio instead of the
   fixed height.
5. **Resting shadow:** `showShadow` (default on).
6. Price row: the colour dots sit at the row's end (the draft's layout).

Every new setting has an inspector control in a new panel file, not in the 3,397-line `edit.js`.

## Content

- Home tree (`sites/eye-care-ward-end/build/home.tree.json`): grid `repeat(auto-fill,minmax(280px,1fr))` at desktop,
  2 columns at tablet and phone; gaps 18px / 10px; each card: brand, heart, RRP key `_sgs_rrp`, no pickers, no
  description, no button, square image, square corners, no resting shadow, typography from the draft; the typed
  "Save £N" labels removed (they now come from the RRP).
- Product titles: the draft's names without the brand (the brand is its own field), in `woo-seed/` and on the site.

## Verify

Deploy to eye-care-test, rebuild Home through `scripts/wp-build-page.js`, then the draft-vs-live capture at 1440, 768
and 375 (`scratchpad` probe modelled on `parity/draft-vs-live/three-width-probe.cjs`), side by side, looked at.
