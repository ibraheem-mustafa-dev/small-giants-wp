# The optician client shop archive: parity with the draft

**Status:** DONE 2026-09-27. `shop.mjs` exits 0 (0 open, 21 of 21 shots reviewed, 0 live console errors) after
Bean's review items (Remaining 8). States: opening, filters open, Women, Black, Ray-Ban and a Pilot chip each chosen
by clicking on both sides (the last with the drawer left open), and scrolled 1200px. Part of the parity re-review in
`plans/2026-09-24-optician-hand-build-design.md` (Status, "Parity re-review owed before Wave D").
**Verify with:** `node ../../scripts/parity/draft-live-walk.mjs ../../sites/eye-care-ward-end/build/qa/parity/shop.mjs`
from `plugins/sgs-blocks` with `NODE_EXTRA_CA_CERTS` set to certifi's bundle (exit 0 = matches).

## What the draft does (hosted draft, measured 2026-09-26)

- Title row: "SHOP" eyebrow and "Sunglasses" (h1) on the left; "16 frames" and a sort select
  (Featured, Price: low to high, Price: high to low, Biggest saving, Brand A–Z) on the right.
- Filter column 270px, groups in this order and state: Gender (open; All / Women / Men, one choice,
  Unisex frames match both), Size (closed; Small ≤52mm eye, Medium ≤57, Large), Colour (open; 12
  round 30px swatches), Price (open; "up to £340", one handle), Brand (open; heading count, a
  "Search brands" box, then the list with counts), Style (open; heading count, chips), Material,
  Frame type, Hinge, Nose pads (closed), then a "Polarised only" toggle.
- Grid: three 330px columns, 18px gap both ways. "Featured" order puts the photographed frames
  first: Aviator Classic, Oversized Cat-Eye, Holbrook, Symbole, Original Wayfarer, Round Metal, ...
- Card: 1px #E6E1DA border on white; hover lifts 4px, shadow 0 18px 44px rgba(20,20,20,.09),
  border #CFC7BB, photo zooms 1.06 over 0.9s; brand chip Playfair 12.5px 0.26em; "Save £51" tag;
  36px heart; name 16px; stars "(5.0 · 12)"; price 18px/500 with the RRP struck; 17px colour dots.
- Colours: Black #1b1b1b, Havana #7d5030, Gold #c6a469, Tortoise #8a5a2b, Gunmetal #5d6268,
  Ivory #e8e1d3, Rose gold #c98f7f, Silver #b9bcc0, Navy #2b3550, Crystal #d9dde0, Brown #4e3526,
  Red #8d2b26.

## Work, by layer

Framework (any client, each with a control):
1. Group open state: a filter group heading with the class `sgs-filter-open` starts expanded (the
   accordion opens only the first group today). Control: the heading's Additional CSS class.
2. Colour swatches: a hex per attribute term (term meta, edited on the term screen) and a
   "swatches" look for an attribute filter group, the term name as the accessible name.
3. Brand search: a "Search brands" box above the brand list: Spec 30 FR-30-6's `sgs/filter-search` block inside
   the brand (taxonomy) filter.
4. Heading counts: the number of options shown beside a group's heading (class `sgs-filter-count`).
5. One-choice groups (Gender): a segmented All / option / option look where one choice replaces
   the last (class `sgs-filter-segmented`).
6. Toolbar: result count wording ("%d frames") and the sort menu's options and labels
   (Customizer > Shop Filters), and the count and sort beside the page title.
7. The "Polarised only" toggle reading a product tag as well as an attribute.
8. The theme's `archive-product.html` hard-codes another client's filters (Flavour, Size by
   attribute ID): replace with attribute-agnostic defaults. The grid container query is fixed
   (4ca121b54).

Content (the optician client, in `build/gen_archive_product.py` and the product seed):
9. Gender and Size attributes on every product (unisex frames carry Women and Men; Size from the
   lens width), colour term hexes, product order (menu_order) matching the draft's Featured order.
10. Groups in the draft's order and open state, the toggle on, the Lenses chips removed, 270px
    column, 18px row gap, the toolbar in the title row, no "Filter" heading on desktop.

## Differences to put to Bean

All answered (recorded in `shop.mjs` as "Accepted (Bean 2026-09-27)"). Card prices without ".00": yes (Bean
2026-09-27), Remaining 8a.

## Remaining

8. **DONE 2026-09-27 (e8ecda854, 75584d7a0, 7eb65d8ea, the two after).** Bean's review:
   a. Card prices in whole pounds: `sgs_card_price_trim_zeros` (plugin `includes/product-card-price-trim.php`) turns
      WooCommerce's trim on only while a product card renders; view.js does the same on a variation swap; the
      theme's "Hide .00" Shop setting drives it with the saving badge. £59.50 keeps its pennies; the product page,
      cart and checkout keep theirs. The shop's pennies accepts are gone; the lens flow's stays (not a card).
   b. The Polarised tag keeps its width at the right of the name row, 17px in from the card edge, at every width; in
      a card body under 200px (the phone grid) it takes its own line under the name, right-aligned (Bean), so no
      name breaks mid-word. New Typography target for the tag (size, weight, letter spacing); the optician client sets weight
      400 and the `border-strong` border as in the draft. Pairs `tag-holbrook` and `tag-lewis` anchored to their
      cards; the walker's new `anchorX` measures the right-edge gap.
   c. Customizer "Show a floating Filter button" (default on), off for the optician client; `shop.mjs` has a `scrolled` state
      with the button as a pair.
   d. Thin price slider inset 4px both sides: each handle paints 2px past its input, so flush right the scroll
      area clipped it to 12px (measured in the drawer and the desktop column; 14px after).
   Found on the shots: at 375 the dots dropped a whole line because they shared the price parts' flex row; the
   price, RRP and notes now wrap in `.sgs-product-card__price-group` (never narrower than its widest part) and the
   dots sit level with its last line. Accepted (Bean 2026-09-27): Aviator and Wayfarer put their dots on their own
   line at 375 (live's "+2" pill against the draft's plain text); the price filter's two handles and no "up to
   £X" heading value.

The record of what items 0-7 did:

0. **DONE 2026-09-27 (7240cb28d).** The duplicate brand search is gone: the optician client's Brand group holds Spec 30
   FR-30-6's `sgs/filter-search` block (now able to search a core taxonomy filter, placeholder "Search brands",
   threshold 2); the theme's `sgs-filter-search` class, its CSS and the `sgs_shop_filter_search_label` setting are
   deleted (theme mod removed on eye-care-test). Live: "ray" narrows 14 brands to 1; ticking Ray-Ban loads
   `?brands=ray-ban` with 3 frames.
1. **Hover, library-wide: BUILT 2026-09-27 (4ed3c08a3, 00eb08f6d, 282debfd6, e1abe5a99, b3a131451); live check
   pending the eye-care-test deploy.** Bean asked for a library-wide feature instead of a product-card-only fix.
   - Split: `src/blocks/extensions/hover-effects/` (index, attributes, resolve, constants, panels/) and
     `includes/hover-effects/` (hover-effects, resolve, vars, classes, link-overlay), each under the size cap.
   - New shared settings: `sgsHoverLift` (px), `sgsHoverZoom` (%, 0 = the block's 110%), `sgsHoverZoomDuration`
     (ms) and `sgsHoverDurationMs` (an exact duration over the token). `hoverDefaults` takes `lift`, `zoom` and
     `zoomDuration`. Lift and scale share one transform; the transition uses the easing setting; reduced motion
     drops the transform.
   - Corrected facts: 6 blocks opt in, not 11 (cta-section, google-reviews, pricing-table, whatsapp-cta, info-box,
     team-member), and now sgs/product-card. The hard-coded `scale(1.1)` zooms were card-grid (its own
     `imageZoomHover` toggle), cta-section and team-member; all read `--sgs-hover-zoom` now. info-box got the zoom
     rule its default never had.
   - sgs/product-card: opted in (4px lift, Lifted shadow); the brown hover shadow is gone; `--flat` clears only the
     resting shadow. New controls: card border colour on hover, RRP colour, dot size, dot grow on hover (Colour dots
     panel), price line height. The Typography panel now shows in bound mode too (bound cards had no size controls).
   - A framework Diffuse shadow preset (0 18px 44px, 9%) in every snapshot; the optician client `border-hover` #CFC7BB.
   - Follow-ups: parked below.
2. **DONE 2026-09-27.** Title steps 48px to 34px (one clamp); count 13.5px `text-subtle`; the sort menu takes the
   browser's own arrow with 14px sides (Customizer "Sort menu arrow").
3. **DONE 2026-09-27.** Card text parts, chips, swatch growth, search box, segments: price 18/27, RRP `text-label`,
   dots 17px with a 125% hover, dot and heart rings, photo fill `surface-stage`, brand overlay 12/14 padding; 13px
   chips and segments with the card fill, swatches grow to 112% (Customizer "Shop Filters" filter-look settings).
4. **DONE 2026-09-27.** No "Filter" heading above the desktop column (Customizer switch, kept for screen readers);
   swatches in the draft's order (`sortOrder: menu_order-asc` + term order in `woo-seed/seed-facets.php`); brand counts
   a right-aligned number; groups touch at 52px rows (the gap belonged to WooCommerce's overlay content); the plain
   drawer is the page surface with a ruled header and the site's button presets on its footer ("Show 16 frames",
   "Clear", capitals by a Customizer switch).
5. **DONE 2026-09-27.** The theme's `archive-product.html` carries Price, Category and Brand only (no attribute IDs).
   The bakery client follow-up is parked below.
6. **DONE 2026-09-27.** Bean's answers recorded in `shop.mjs`. The sort menu's extra 11px was its 15px text against
   the draft's 13.5px, not a "Sort by" prefix (the live options carry none): Customizer "Sort menu text size".
7. **DONE 2026-09-27** (method: `scripts/parity/GAP-CHECKLIST.md`).
   a. Filter clicks keep the panel's looks: the product-filters block is an Interactivity router region, and a choice
      re-rendered it from server HTML, dropping every group, count and segmented row the theme had built (proven by a
      DOM dump before and after a click). `sgs-shop-filters-accordion.js` rebuilds the groups (keeping each group's
      open state) and fires `sgs-shop-filters:rebuilt` for the per-group looks; Gender segments press WooCommerce's
      own chips, so a choice applies in place and the drawer stays open.
   b. Filter button at 768/375: outlined "FILTER" in the toolbar before the sort menu, reading "FILTER (1)" while a
      filter is chosen (Customizer "Filter button look", "Filter button place", "counts the chosen filters").
   c. Price slider: 6px round-ended track, 14px handles at both ends, prices as small plain text (Customizer "Price
      slider look" Thin). Spanning the column clipped the right handle in the drawer: item 8d.
   d. Sort menu size (item 6).
   e. Brand names at 14.5px/500 with 7px rows (WooCommerce's wrapper set 0.875em); cards fade up 30px over 500ms as
      they reach view, a row cascading 100ms apart (the draft's 460ms/26px/70ms; the framework's nearest motion tokens,
      and `animation-observer.js` now staggers elements that reach view together).
   Found on the screenshots and fixed: chosen filters in a row under the title at every width (WooCommerce keeps its
   chips inside the closed drawer; Customizer "Chosen filters place"), as filled pills without the group name
   ("Chosen filters look", "name their group"); the drawer's "Show N frames" never counted attribute filters or
   prices (the Store API ignores `filter_*` and takes prices in pence); the title row's 24px gap and hairline; the
   classic sort form's 1em margin pushing the toolbar off-centre; Style chips in the draft's order (seed-facets
   orders any attribute); all colour swatches kept after a filter; a chosen chip's border matching its fill.

## Parked

- card-grid's zoom amount has no control (it keeps its own toggle, not the shared hover panel).
- `scripts/surveys/survey-inspector-surface.js` doesn't follow the hover panels into `panels/*.js` (census only).
- The bakery client needs a site copy of `archive-product.html` for its Flavour and Size groups (as the optician client's
  `build/gen_archive_product.py`); until then the canary shop shows the generic groups.

Found and fixed along the way (framework): the drawer's live result count re-requested the Store API every 400ms
(its observer counted the Apply button's own label change); the desktop sidebar took focus at page load and painted
a ring; the parity walker hovered before a smooth scroll finished and could not read text inside a
`display: contents` span.
