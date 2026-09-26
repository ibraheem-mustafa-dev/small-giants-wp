# Eye Care shop archive: parity with the draft

**Status:** IN PROGRESS (2026-09-26). Part of the parity re-review in
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
3. Brand search: a "Search brands" box above a long checkbox list (a group heading class
   `sgs-filter-search`), filtering the list as you type.
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
