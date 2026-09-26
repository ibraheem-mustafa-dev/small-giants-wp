# Eye Care shop archive: parity with the draft

**Status:** IN PROGRESS. Built and live on eye-care-test 2026-09-26 (theme to the latest deploy): items 1-7 and 9-10
below, the row-gap / filter-column / gap settings, the plain panel's rows, and the grid container query. First
parity run (1440) found the differences listed under "Remaining", in order. Part of the parity re-review in
`plans/2026-09-24-eye-care-hand-build-design.md` (Status, "Parity re-review owed before Wave D").
**Verify with:** `node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/shop.mjs`
(1440, 768, 375; states: opening, filters open, a brand applied, a colour applied, Women, a card hovered).

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
3. Brand search: a "Search brands" box above the brand list. Built as a heading class (`sgs-filter-search`),
   which duplicates Spec 30 FR-30-6's `sgs/filter-search` block: see Remaining item 0.
4. Heading counts: the number of options shown beside a group's heading (class `sgs-filter-count`).
5. One-choice groups (Gender): a segmented All / option / option look where one choice replaces
   the last (class `sgs-filter-segmented`).
6. Toolbar: result count wording ("%d frames") and the sort menu's options and labels
   (Customizer > Shop Filters), and the count and sort beside the page title.
7. The "Polarised only" toggle reading a product tag as well as an attribute.
8. The theme's `archive-product.html` hard-codes another client's filters (Flavour, Size by
   attribute ID): replace with attribute-agnostic defaults. The grid container query is fixed
   (4ca121b54).

Content (Eye Care, in `build/gen_archive_product.py` and the product seed):
9. Gender and Size attributes on every product (unisex frames carry Women and Men; Size from the
   lens width), colour term hexes, product order (menu_order) matching the draft's Featured order.
10. Groups in the draft's order and open state, the toggle on, the Lenses chips removed, 270px
    column, 18px row gap, the toolbar in the title row, no "Filter" heading on desktop.

## Differences to put to Bean (proposed as accepted)

- Stars: live shows "No reviews yet" until real reviews exist (the product page's zero-reviews
  state, 2026-09-25); the draft shows made-up ratings.
- Brand counts: the draft's list counts a made-up catalogue (Ray-Ban 48); live counts real stock.
- Price: WooCommerce's two-handle slider (a floor and a ceiling) where the draft has one ceiling.
- Pennies on every price (Bean 2026-09-25).

## Remaining (next session, in order)

0. **Remove a duplicate built this session.** Spec 30 FR-30-6 already ships a searchable filter, the
   `sgs/filter-search` block (`plugins/sgs-blocks/src/blocks/filter-search/`: `threshold` default 16, `placeholder`,
   colours, and a standalone mode that lists any taxonomy's terms, brand included). The `sgs-filter-search` heading
   class in `theme/sgs-theme/assets/js/sgs-shop-filters-groups.js` (addSearch), its CSS in
   `theme/sgs-theme/assets/css/woocommerce.css` (8h) and the `sgs_shop_filter_search_label` setting in
   `theme/sgs-theme/inc/shop-toolbar-settings.php` duplicate it: put `sgs/filter-search` in the Eye Care Brand group
   instead (`build/gen_archive_product.py`; placeholder "Search brands", threshold below 14 so it shows), prove a
   ticked brand still filters by `?brands=`, then delete the duplicate and its setting (and its line in
   `build/apply_shop_settings.py`).
1. **Hover, library-wide (Bean 2026-09-26: "a library wide feature improvement instead of only doing it for
   product cards").** Extend the shared hover extension (`src/blocks/extensions/hover-effects.js`,
   `includes/hover-effects.php`, `assets/css/extensions.css`; 11 blocks opt in) with lift in px (`sgsHoverLift`,
   combinable with scale), photo zoom amount (`sgsHoverZoom`, %) and zoom duration (`sgsHoverZoomDuration`); the
   five blocks that hard-code `scale(1.1)` for `sgs-has-img-zoom` (card-grid, gallery, info-box, team-member,
   testimonial) read `--sgs-hover-zoom`. Both files are over the size cap: split each first. Then `sgs/product-card`
   opts in (`enabledExtensions: ["hover"]`, `hoverDefaults` = today's 4px lift), its own hard-coded hover (a brown
   `rgba(58,46,38,.16)` shadow from another client) goes, and `product-card--flat` stops removing the hover
   shadow (it is later in the file at equal specificity). The hover border colour is a card colour row (the
   extension's hover colours were removed 2026-08-20). Eye Care: a `card-hover` shadow preset
   (`0 18px 44px 0 color-mix(... shadow-colour 9%)`), lift 4px over 400ms, zoom 106% over 900ms, border
   `border-strong`-ish #CFC7BB on hover (the draft's).
2. Title 48px / line-height 1; count 13.5px in `text-subtle`; sort control (draft: 14px side padding, native
   chevron) - check the theme's `select.orderby` rule.
3. Re-run `shop.mjs` at 1440/768/375, look at the screenshots, then the card text parts (price 18px/27px line,
   RRP colour `text-label`, dots 17px with a hover scale 1.25), the Style chips (draft: 13px, white fill,
   `border` colour, no count in the chip; live shows "Pilot (5)"), the swatch hover (draft scale 1.12), the brand
   search box (40px tall, 10px padding), and the Gender segments (13px).
4. Seen in the 1440 screenshot after the plain-panel deploy (84f04635e): the drawer's "Filter" heading and its
   heavy rule show on desktop (the draft has none); swatch order follows the colour terms' order (the draft:
   Black, Havana, Gold, Tortoise, Gunmetal, Ivory, Rose gold, Silver, Navy, Crystal, Brown, Red: set the term
   order); the brand list is alphabetical with "(3)" counts where the draft orders by count with a right-aligned
   number; heading rows sit taller than 52px (check the summary's padding and the heading's line height).
5. Theme `archive-product.html` hard-codes another client's filters (Flavour, Size by attribute ID): replace with
   attribute-agnostic defaults.
6. Put to Bean with the list below, then record the shop result in the main plan's Status block.

Also to put to Bean: in the draft, choosing one brand turns the page into that brand's page (title "Ray-Ban", no
"Shop" eyebrow); live keeps "Sunglasses" with the filter applied. The draft's Black swatch returns "0 frames" (a
draft bug; live returns 14). The draft's filter column fades in when the page opens (its single-page-app view
change); live's is simply there.
