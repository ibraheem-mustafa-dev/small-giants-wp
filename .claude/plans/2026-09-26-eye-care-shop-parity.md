# Eye Care shop archive: parity with the draft

**Status:** PARITY RUN CLEAN 2026-09-27: `shop.mjs` reports 0 open, 239 accepted, 0 console errors at 1440, 768
and 375 (every state: opening, filters open, Women, Black, Ray-Ban), live on eye-care-test. Accepted differences are
either measured-not-painted (reason in each `accept` entry) or PROPOSED to Bean (below). Three screenshot-only items
remain (Remaining 7). Part of the parity re-review in `plans/2026-09-24-eye-care-hand-build-design.md` (Status,
"Parity re-review owed before Wave D").
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

0. **DONE 2026-09-27 (7240cb28d).** The duplicate brand search is gone: Eye Care's Brand group holds Spec 30
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
   - A framework Diffuse shadow preset (0 18px 44px, 9%) in every snapshot; Eye Care `border-hover` #CFC7BB.
   - Follow-ups: card-grid's zoom amount has no control (it keeps its own toggle, not the shared panel);
     `scripts/surveys/survey-inspector-surface.js` doesn't follow the hover panels into `panels/*.js` (census
     only, no gate). Both are parked here.
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
   Follow-up for the Mama's Munches track: its Flavour and Size groups need a site copy of the template (as Eye
   Care's `build/gen_archive_product.py`), until then the canary shop shows the generic groups.
6. **Bean's answers 2026-09-27** (recorded in `shop.mjs` as "Accepted (Bean 2026-09-27)"): accepted: no-reviews
   stars, real brand counts, 44px touch targets, the drawer slide and view-fade motion, hover easing, the draft's
   brand-page and Black-swatch bugs, pennies. The two-handle price slider is accepted as two handles, but its look
   must match the draft's slider (thin track, round ends, "up to £340" style labels) with a ball at both ends.
   Not accepted: the sort menu, whose extra 11px is a "Sort by" prefix on every option (Eye Care's configured labels
   carry none, so find where the prefix is added and remove it). Asked: can card prices hide ".00" (the existing
   `sgs_shop_hide_zero_decimals` covers saving badges only; extending it to card prices is a small change; pennies
   stay the accepted default).
7. Next, in order (Bean 2026-09-27):
   a. **Filter interaction breaks the panel:** ticking or unticking any filter re-renders WooCommerce's blocks and the
      theme's looks are lost (colour swatches fall back to text chips with the colour name). Reproduce by clicking,
      not by URL (the parity states load filters by URL, which is why the run missed it); then make the per-group looks
      survive WooCommerce's re-render and add a click-driven state to `shop.mjs`.
   b. **Filter button at 768 and 375:** the draft's is an outlined "FILTER" inline with the count and sort in the
      title row; live's is a black pill under the title, in the wrong place in the page structure. Match both.
   c. **Visual check at all three widths:** look at every screenshot at 1440, 768 and 375 for every state (this pass
      looked mainly at 1440 and the 375 drawer), and at the brand names (13px against 14.5px) and the draft's
      scroll-in card fade.
   d. The price slider restyle and the sort-menu prefix (item 6).

Found and fixed along the way (framework): the drawer's live result count re-requested the Store API every 400ms
(its observer counted the Apply button's own label change); the desktop sidebar took focus at page load and painted
a ring; the parity walker hovered before a smooth scroll finished and could not read text inside a
`display: contents` span.

Also to put to Bean: in the draft, choosing one brand turns the page into that brand's page (title "Ray-Ban", no
"Shop" eyebrow); live keeps "Sunglasses" with the filter applied. The draft's Black swatch returns "0 frames" (a
draft bug; live returns 14). The draft's filter column fades in when the page opens (its single-page-app view
change); live's is simply there.
