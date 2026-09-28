# Eye Care product page parity (page wave 1)

**Status:** IN PROGRESS 2026-09-28. Parent plan: `2026-09-24-eye-care-hand-build-design.md` (Status: page waves).
Walker config `sites/eye-care-ward-end/build/qa/parity/product.mjs` (product 76, Gucci Oversized Cat-Eye; states:
opening, auto-scrolled, gallery-thumbnail, three tabs, size-guide). First run 2026-09-28: 4152 open rows, a few
causes repeated over states and widths. Includes the Wave C product page's owed polish
(`2026-09-25-eye-care-product-page.md`: picker labels, add-to-cart typography, gallery saving badge).
**Written for:** Bean and the session running the page waves.

## Bean's decisions (2026-09-28)

- **Size row by universal band.** Every frame is already sorted by lens width into Small (up to 52mm), Medium (up to
  57mm) and Large (`woo-seed/seed-facets.php`, the shop's Size filter). The product page shows only the bands this
  frame comes in: each real size a tile labelled S, M or L with its measurement under it ("55□17 140"); a one-size
  frame shows its one tile, chosen. "Which size am I?" sits at the right of the Size label and opens the size guide.
  Never show bands the frame does not come in.
- **Colour swatches: each variation's own photo.** A variation with its own image shows it as its swatch; without one,
  today's colour tile. The draft's swatches are the product photo under a CSS filter per colour (measured
  2026-09-28), not real colourway photos, so they are not copied. Gather real colourway photos for at least one of
  the four photographed frames (Gucci 76, Holbrook 81, Wayfarer 90, Round Metal 98) so the client sees it working.

- **Entrance animations: exact, as real controls (2026-09-28).** The draft fades each block up on arrival (18px,
  0.5s to 0.9s, `ease`, staggered) on About, Lenses and Home. The framework's entrance settings gain a custom
  duration (ms), a custom rise distance (px) and the `ease` curve; every page sets the draft's exact values
  (reduced motion: none).
- **Mega panels keep the draft's 40 brands and 12 shapes (2026-09-28).** Their links now reach the shop's filters
  (they returned 404); a brand or style with no frames shows the shop's empty state.

## Framework (plugins/sgs-blocks, one reseed and deploy at the end)

Measured on the draft at 1440 (walker `report.json`, `out/product/`). Each new setting gets an inspector control
and its CSS emitted in the block's `render.php` (logic in helpers: `buybox/render.php` is 1151 lines, over the
300-line limit, and is flagged, not grown).

| # | Item | Draft (measured) | Live now |
|---|---|---|---|
| F1 (built) | Size row by band, only this frame's bands, one-size shown | S/M/L tiles, measure sub-line | axis hidden with one term |
| F2 (built) | "Which size am I?" link at the right of a picker label | text link, opens `#size-guide` | only in the Sizing tab |
| F3 (built) | Picker label: small capitals, chosen value on the right | "COLOUR ... Ivory" | "Colour" bold |
| F4 (built) | Add to bag: capitals and tracking, no icon, 56px, solid 1px border, hover lift | as measured | cart icon, 51px, 75% border |
| F5 (built) | Stock line above the pickers, under a hairline | price row, rule, stock, pickers | pickers, then stock |
| F6 (built) | Saving badge on the main photo ("Save £51 off RRP", top right) | dark tag | none |
| F7 (built) | Gallery size: 732px square photo at 1440 | 732 | 687 (column split) |
| F8 (built) | Price line height | 38px | 57px |
| F9 (built) | Variation photo as swatch, tile fallback (a variation's image counts only when it differs from the product's main image: every Eye Care variation today carries the main placeholder photo) | (decision above) | tiles |
| F10 (built) | Tab headings: 12.5px capitals, 1.75px tracking, 2px indicator, 18px sides, 52px tall | as measured | 16px, none |
| F11 (built) | A related-products section with no products hides, heading included | n/a | "More from Gucci" empty |
| F12 (built) | Size guide pop-up: 720px wide, 1px border, soft shadow, "×" close, zoom-in entrance | as measured | 800px, icon close, none |

All twelve built 2026-09-28 (not yet deployed). Also fixed in passing: `sgs/button`'s "fit" width never fitted (a
flex-column parent stretched it; now `width: fit-content`, render.php and the editor preview); `sgs/modal`'s trigger
hover colours never reached the page (an undefined accumulator); `sgs/breadcrumbs` gained "Space around the
separator"; an empty form error line kept 4px. Parked: `buybox/render.php` is ~1480 lines (limit 300), grown by this
wave's settings; its split is owed.

## Content (sites/eye-care-ward-end)

- C1 Details tab: DONE in the tree (not yet applied): the draft's 18 rows and values (measured 2026-09-28). Model
  code binds the short description ("GG1566S · 001", as the buybox); "Lenses as supplied" binds the new
  `_sgs_lens_supplied` meta, seeded by `woo-seed/seed-facets.php` from the draft's catalogue (`pol`, `lensCat`:
  "Tinted, category 2"); UV protection, prescription, warranty, dispatch ("1 working day") and with-lenses are the
  draft's fixed copy, true of every frame.
- C2 Sizing tab Lens height: no data exists (neither the draft's catalogue nor the jpopticians sizes carry a
  lens height); parked with the frame-measurements build in the parent plan.
- C3 Description list: DONE in the tree: the theme's new "Plain lists" style on Post Content
  (`theme/sgs-theme/inc/core-block-styles.php`; no markers or indent, 0.7em between lines, the draft's 11px at 15.5px).
- C4 Breadcrumb: DONE in the tree: new `sgs/breadcrumbs` "Space around the separator" (`itemGap`, 10px) and weight 400.
- C5 Real colourway photos for one photographed frame: the brand's own product shots, for the test site only (Bean
  2026-09-28). **Before launch:** replace them with brand-supplied (licensed) or the shop's own photos; this is
  a launch gate for Phase 6.

## Found on the way (site-wide, fix with this wave)

- **Size guide links:** the footer's "Size guide" went to /help/, and Help's and the mobile menu's to
  `#modal-size-guide`, which exists nowhere; the size guide now lives once in the footer (anchor `size-guide`, every
  page) and every link opens it (trees updated; apply footer 182, drawer 203, Help 171, single-product).
- **Shop links to `/sunglasses...` return 404:** every Sunglasses and Brands mega-panel link (`/sunglasses?shape=…`,
  `?sort=…`, `?brand=…`), the footer's two links and About's "Shop the range" carry the draft's in-app routes. Point
  them at `/shop/` with WooCommerce's own filter parameters (read the format from the live shop's filter clicks).

## Motion batch (next, from the page diagnoses, Bean's exact-entrance decision)

The draft's scroll reveal engine (read from its bundle by the Home agent): fade + 26px rise, 460ms, cubic ease-out
`cubic-bezier(0.33, 1, 0.68, 1)`, stagger `min(index, 7) × 70ms` by sibling within a reveal group, IntersectionObserver
threshold 0.01 with rootMargin `0px 0px -6% 0px`. Framework differences to close: (1) `animation-observer.js`
reveals at threshold 0.15 with no margin (later than the draft); (2) it adds its own `index × 100ms` batch stagger on
top of an explicit `sgsAnimationDelay`; (3) `sgs/card-grid` tiles animate by a hard-coded scroll-linked CSS rule
that reads none of the entrance settings. Then the shop's cards (gen_archive_product.py `CARD`: preset 500ms / 30px /
ease-out today) take the exact values, and the shop walk reruns.

## Accepted with the decision they follow

Pennies (2026-09-25); "No reviews yet" and the zero-reviews card for the draft's made-up stars and placeholder
reviews (2026-09-27); one real photo where the draft repeats one photo as four thumbnails (real catalogue,
2026-09-27; thumbnails appear with the second real photo); the Klarna and wallets line (parent plan Phase 6,
payments); the draft's fade-in of a view it swaps in as a single-page app (as the shop's filter column, 2026-09-27);
the description's 55mm (the frame's real size) for the draft's 56mm; More from and Similar shapes on live (Wave C
product plan) where the hosted draft stops.

## Parked

- Sizing tab frame diagrams: the parent plan's frame-measurements build.

## Verify

Walker exit 0 on `product.mjs` (every shot reviewed), the lens purchase checks at £268, 0 draft products, the
editor round-trip of the single-product template.
