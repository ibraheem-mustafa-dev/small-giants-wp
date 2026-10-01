# Handoff: Ward End Eye Care — designer eyewear shop

Read this for intent. Read the files for everything else.

Structural facts — pages and routes, WordPress slugs and parents, section names, which repeated groups are fixed lists and which are live queries, breakpoints, asset files, and the behavioural rules the markup cannot show — live in the main HTML file, in the `<script type="application/json" data-sgs-manifest>` block at the top. **The files are authoritative.** Where this README once described something differently, the files won and this document has been corrected. Three known gaps remain open in the manifest under `openItems`.

## What this is

A storefront for Ward End Eye Care, an independent optician's clinic at 644 Washwood Heath Rd, Birmingham B8 2HQ, run by Fatima Nawaz. It sells designer sunglasses and prescription frames below RRP, with lenses glazed in-house, local collection, and WhatsApp as the primary support channel.

The commercial position drives the design. The site competes against discount marketplaces (which win on price but lose on trust) and national chains (which win on trust but lose on personality). Every trust signal — named optician, real Google reviews, RRP shown next to the price, warranty, returns — is load-bearing. Do not drop them for visual tidiness.

## How to treat the files

These are **design references built in HTML**, not production code. The target is the SGS WordPress framework in `ibraheem-mustafa-dev/small-giants-wp` (sgs-theme + sgs-blocks on WooCommerce). Recreate the design with its blocks, templates, template parts and theme.json tokens — do not port the HTML.

What not to carry across:
- Inline styles. Map the values onto the codebase's token system.
- The `page` state string standing in for routing.
- In-memory catalogue, filters, bag and checkout.

**Fidelity is high.** Colours, typography, spacing, copy and interaction detail are intended to be matched closely. All visible text is signed-off content, not lorem. Imagery is the one deliberately unfinished area.

## Judgement calls worth keeping

- **The Google reviews panel is deliberately off-brand.** Roboto, Google's colours, Google's card shape. It is borrowed credibility and looking native to Google is the point. Do not restyle it to match the site.
- **Square by default.** Radius is 0 almost everywhere. The exceptions are pills, circular controls, and the Google panel.
- **Playfair Display never below weight 500.** Lighter didone weights broke up at small sizes, which is why this family replaced Bodoni Moda.
- **Two background colours maximum**, plus the hairline grid: 2px gaps on an `#E6E1DA` ground doing the work borders usually do.
- **The zero-review product state is the normal state.** A new shop has no product reviews. Build that path first.
- **Accent colour is a theme token, not a hex.** Three palettes exist (taupe default, sage, navy); carry them across as a token set.

## Building it in SGS

`WP Build Gap Map.dc.html` grades every visible element and behaviour (110 items) against the repo at main as of 24 Sep 2026: works today, configure, theme fix, block extension, new block/module, or outside the code — each with the existing block it maps to and the chosen fix. Open it in a browser and filter by gap level or page area. Build in this order:

1. **Client style variation.** Replace `sites/eye-care-ward-end/theme-snapshot-*` (currently DM Serif Display / DM Sans, navy/gold) with Playfair Display / Outfit / Roboto (all already in `theme/sgs-theme/assets/fonts`), the ink–paper–taupe palette on the framework's existing slugs, square 52px button presets.
2. **WooCommerce data model.** Brands taxonomy (40 brands), Colour as a Colour / Image attribute (WC 10.9+; test on the installed version), shape, material, lens, frame type, hinge and nose-pad attributes, per-variation measurements, RRP as its own meta, Local Pickup, flat rate £3.95, free shipping over £75.
3. **Cross-cutting extensions.** Open an `sgs_modal` from any link (size guide ×7, lens configurator ×3); InnerBlocks slot in `sgs/buybox` (second CTA, WhatsApp card, assurances, Klarna messaging); `card` variant on `sgs/whatsapp-cta`; a "current product has reviews" visibility condition.
4. **Templates.** New eyewear PDP content part (Description / Details / Sizing — remove the food tabs and Trustpilot block), shop archive with ten collapsible filter groups and the drawer breakpoint moved from the hardcoded 782 to 1060, checkout composition.
5. **New builds.** Lens configurator module (choice-flow in a full-screen modal, live price aside, price-ladder settings, cart item data via `woocommerce_store_api_add_to_cart_data`), prescription checkout inner block (the additional-checkout-fields API has no file type), `sgs/frame-measurements`, `sgs/product-specs`, wishlist.

## Outstanding before launch

1. Real product photography and a clinic interior shot.
2. Wishlist persistence and a wishlist view.
3. Live Google reviews via API, or a managed cache of the current thirteen.
4. Confirmation that every RRP shown is accurate and defensible.
5. Returns copy under Add to bag, and the prescription-lens returns exception in plain English — drafted, not yet placed.
6. Real stock data behind the stock line.
7. Verify the WhatsApp number: `wa.me/4479605978` is a digit short of a full UK mobile.
8. Replace the one "Placeholder review" entry with the real Google review.
9. Write the ninth FAQ, on free adjustments and re-fitting for life.

## Files

- `Eye Care Birmingham.dc.html` — the full storefront, and the manifest.
- `Frame Card.dc.html` — the shared product card.
- `WP Build Gap Map.dc.html` — item-by-item mapping onto the SGS WordPress build.
- `assets/` — logo and brand mark files referenced by the prototype.
- `image-slot.js`, `support.js` — prototype scaffolding, not needed in production.

Open `Eye Care Birmingham.dc.html` in a browser to interact with it.
