# Shop listing investigation (2026-11-21 night)

Eye Care is far from passing: the route refused tonight's rebuild (shop-1), so the page is the 2026-11-20 build, whose cards, filter panel, toolbar and drawer all differ from the draft, and whose phone filter drawer never opens. Mama's is closer (cards three a row, right colours, sorting and count work) but its rebuild was refused too (shop-2), its category buttons do nothing, and its cards, count words and sort labels differ. Worst problem: the route writes none of the theme's 56 shop options (shop-3), so every toolbar, filter and drawer look and word on both sites is the theme default; second, neither shop page rebuilds tonight. 15 findings (13 to fix, 2 known and owned elsewhere), plus the checks that passed.

## How to read this

- "The rebuild" is tonight's `clone-surface.mjs --surface shop` on each copy (`logs/<client>-shop.log`). Both refused at skeleton propose, so `/shop/` still serves the saved template of the earlier run: Eye Care `wp_template` 498 (2026-11-20 09:21), Mama's 6024 (2026-11-19 21:04). Live readings below are of those, and each finding says what tonight's code does instead where that differs. Part-look's shop step (`logs/<client>-pl-shop.log`) runs only after each copy's whole chain, so it had not run when this was written; its draft-side reports were run here instead (`shop/pl-ec-report/`, `shop/pl-mm-report/`).
- "The shop options" are the theme's Customizer settings under Shop Filters: 56 `sgs_shop_*` settings in seven files under `theme/sgs-theme/inc/` (`shop-controls-look-settings.php`, `shop-filter-look-settings.php`, `shop-filters-layout-settings.php`, `shop-filters-settings.php`, `shop-load-more-settings.php`, `shop-toolbar-settings.php`, `shop-chosen-filters.php`). They are site options (theme mods), not block settings: neither Fill nor part-look can reach them. shop-3 holds the setting-by-setting table.
- eye-care-test (the hand-built Eye Care site) was read for setting NAMES only, never values (Bean's held-out rule). Every value in this file comes from the draft.

### shop-1: Eye Care's shop was not rebuilt tonight: the route refused it, so the page is still the 2026-11-20 build
- Clients and widths: Eye Care, all widths.
- Evidence: `logs/eye-care-ward-end-shop.log`: "FAIL shop propose - paint conservation: 18 painted elements state-only (no rule) … Root/322#0 layout; Root>Frame Card@325#15/0#0 background/border/layout; …", exit=1. The 18 are the listing grid Root/322 (the element the product collection replaces) and 17 elements of the 16th card, Frame Card@325#15, all from the inventory's `revealed` list, shown by the state `fgOpen: { size: true, … }` (opening the rail's Size group re-reads the grid and the last card at 1440). Their base copies pass, read through the product card's loop copy. The rest of the proposal is sound: the rail with ten groups, the sorting placed, the draft's Filter button left out (`sites/eye-care-ward-end/build/skeleton/shop.proposal.json` `filterRail`, `templatePieces`; lab worktree).
- Cause: proved that the refusal is these 18 state copies (`paintUnread`, each `kind: own-surface`, with the state above). Why state copies are not covered when the base copies are: hypothesis. The shop's commerce region (Root/322, `lib/skeleton-commerce-region.mjs`) reports no run, unlike the rail (`lib/skeleton-filter-rail.mjs::railRun`) and the other pieces, so `lib/template-pieces-context.mjs::piecesPaint` owns none of its elements, and `lib/skeleton-paint-conservation.mjs::conservationRows` sends a `revealed` element no node reads to `state-only` before any host lookup. Proof: `skeleton.mjs propose` on a copy of the shop data with the region given a run; the 18 should leave the problems.
- Layer and owner: route piece (this stream: the run mechanism); the commerce region rule is the general session's.
- Fix: the commerce region reports `{ id: 'commerce-region', block: 'woocommerce/product-collection', at: <region key>, run: [ <region key> ] }` as `railRun` does, handed to `piecesPass` as `paint.runs`, so the listing's draft elements and their state copies become the collection's missing features.
- Size: S
- Depends on: nothing
- Verify by: `clone-surface.mjs eye-care-ward-end --surface shop` passes propose, with the 18 under `templatePieces.missingFeatures`.
- Same cause elsewhere: any shop draft with a state that moves the listing (a filter group opening).

### shop-2: Mama's shop was not rebuilt tonight either: the category buttons and an arrow refuse it
- Clients and widths: Mama's, all widths.
- Evidence: `logs/mamas-munches-redesign-shop.log`: 3 problems: 7 chips Root/24 `host-unread (rule optionSetFilter, host sgs/option-picker)` background/radius/padding; Root/38 `host-unread (rule drawsChildren, host sgs/text)` background/radius/width (the arrow in a circle); 44 elements `state-only` (the same chips in their other states). The sorting and the results count were placed (`templatePieces.placed`: sorting at Root/10, results-count at Root/26; `sites/mamas-munches-redesign/build/skeleton/shop.proposal.json`).
- Cause: proved, and known (the brief's remaining propose rows): the option picker has no part reading a chip's fill, radius and padding and no count badge (plugin round 6 item 6); Root/38 is a typed arrow in a circle (general route work). shop-5 shows the chips should not be an option picker on a shop at all.
- Layer and owner: block setting gap (plugin round 6 item 6) and route rule (general), unless shop-5's fix replaces the picker, which removes the first and third problems.
- Fix: shop-5 first (the chips become WooCommerce's category filter, whose run covers their paint); Root/38 as planned.
- Size: M (with shop-5)
- Depends on: shop-5
- Verify by: Mama's shop propose passes.
- Same cause elsewhere: Mama's Gifts and Help pages (the rule was taught on them).

### shop-3: the route writes none of the theme's shop options, so every toolbar, filter and drawer look and word on both sites is the theme default (MAIN FINDING)
- Clients and widths: both, all widths. Eye Care is hit hardest (rail, drawer, toolbar); Mama's through the count words, sort labels, prices and grid.
- Evidence: the 56 settings with type, choices, default and value per site: `shop/mods-local-mediatest-trec.json`, `mods-local-mediatest-trlab.json`, `mods-local-mamas.json`, `mods-sandybrown.json` (read with `shop/mods-schema.php`, which runs `customize_register` and saves nothing). The route writes only the five boolean-toggle options (`lib/site-build-catalogue-toggle.mjs`); grep finds no other `sgs_shop_` write in `scripts/computed-route`. On the pages: Eye Care's count missing (shop-8) and Mama's worded "Showing all 5 results" against "5 treats to choose from"; sort labels "Default sorting", "Sort by popularity", … (six) against the draft's five, without "Biggest saving" and "Brand A–Z"; prices "£139.00" against "£139"; a grey filter panel with a "Filter" heading; the Polarised switch at the top, not the bottom; at phone width a black "Filter" pill on its own row against an outlined "FILTER" between the count and the sort; the drawer from 782px against 1060px; drawer buttons "Show results" and "Clear all" against "SHOW 16 FRAMES" and "CLEAR"; a floating Filter button the draft lacks; chosen filters as outlined chips inside the panel named "Shape: Pilot" against filled chips in a bar above the products named "Pilot" (draft read by `shop/draft-measure.mjs`, which also chose Ray-Ban and Pilot in the draft: `shop/ec-draft-measure.json`, `shop/ec-draft-measure-chosen-1440.png`).
- Cause: proved: no writer exists. `local-mediatest-trec` holds only the catalogue's toggle options; `local-mediatest-trlab`'s three (`sgs_shop_hide_zero_decimals`, `sgs_shop_sort_menu`, `sgs_shop_sort_arrow`) are the hand-set values of `local-mamas` copied with the mirror (the strip step removed templates and block looks, never theme mods), so they prove nothing about the route and should be cleared before the next from-blank proof; the canary holds none.
- Layer and owner: route piece (this stream): a new site-build step. The template pieces already read most of the evidence (each sort option's WooCommerce order, the count element and its loop: `lib/template-piece-shop-sort.mjs`) and the rail rule reads the rail; neither turns it into options.
- Fix: `lib/site-build-shop-options.mjs` with `data/shop-options.json` (option, draft evidence, how the value is read), run by `site-build.mjs` after the shop surface's propose like the catalogue toggle, writing each option the draft decides and reporting each it cannot (a value per option for both drafts is in the table). Also correct the sorting piece's notes: "Biggest saving" and "Brand A–Z" are offered through the theme's `sgs_biggest_saving` and `sgs_brand_az` orders, and `sgs_shop_sort_menu` limits and relabels WooCommerce's options.
- Size: M
- Depends on: nothing (the option sets that cannot carry a look are shop-10)
- Verify by: on each rebuilt copy, `get_theme_mods()` holds the table's values, and at 375 and 1440 the toolbar, count words, sort labels, prices, panel, drawer and chosen filters match the draft.
- Same cause elsewhere: every client shop.

#### shop-3 table: the shop options, one by one

Columns: the setting; its choices or type and default; whether eye-care-test uses it (name only); the draft evidence that decides it (Eye Care, then Mama's where it draws the control); whether the option set can carry what a draft draws; and how the route should write it. "Site build" means a new site-build step on the shop surface (the pattern of `lib/site-build-catalogue-toggle.mjs`, which already writes the five `sgs_shop_filter_boolean_*` options), reading the draft and writing theme mods with `set_theme_mod`; part-look only patches block attributes (`lib/part-look-run.mjs::patchBlock`), so it cannot write these. Values on the copies: `local-mediatest-trec` holds only the four boolean-toggle options (written by the catalogue step); `local-mediatest-trlab` holds `sgs_shop_hide_zero_decimals`, `sgs_shop_sort_menu` and `sgs_shop_sort_arrow`=joined, which are the hand-set values of `local-mamas` copied with the mirror (the strip step removed templates and block looks, never theme mods), so they prove nothing about the route; the canary (sandybrown) holds none (`shop/mods-*.json`).

**shop-filters-settings.php**

| Setting | Type, default | ECT | Draft evidence and the value it decides | Option set complete? | Route writes it by |
| --- | --- | --- | --- | --- | --- |
| sgs_shop_filter_boolean_enabled, _attribute, _term, _label, _source | checkbox off; text; select attribute/tag | yes (not _attribute) | EC: the rail's "Polarised only" switch row (Root/313); written on trec by the catalogue step | yes | already written (`lib/site-build-catalogue-toggle.mjs`) |
| sgs_shop_filter_boolean_position | top/bottom, top | yes | EC: the switch is the rail's last group, under Nose pads (y 1599 of a rail ending 1634): bottom. Live it sits at the top | yes | site build, with the toggle (the catalogue step already knows the group) |
| sgs_shop_filter_drawer_breakpoint | number, 782 | no | EC: the draft's own logic `drawerFilters = effW < 1060` (draft line 2752; measured: rail at 1080, drawer at 1024): 1060. Mama's: no rail | yes | site build (and Fill must stop hiding the rail, shop-4) |
| sgs_shop_result_count_enabled | checkbox off | yes | EC: the drawer's apply button says "Show 16 frames" (a live count) | yes | site build |
| sgs_shop_result_count_label | text, "Show %d results" | yes | EC: "Show %d frames" (one wording; the draft's code has no singular for it) | yes | site build, words from the button's own text with the number swapped for %d |
| sgs_shop_clear_label | text, "Clear all" | yes | EC: the drawer's "Clear" (the chosen-filter bar says "Clear all", which is the clear button block's own label, already written by the rail rule) | yes | site build |
| sgs_shop_columns_wide | number, 4 | no | EC: the draft's grid is `repeat(auto-fill,minmax(min(100%,250px),1fr))` (Root/322), never a fixed count; its listing is 1026px wide at 1440, under the 1280px container tier, so the option never applies there. A draft whose listing passes 1280px would get 4 forced columns the draft does not draw | partial: a draft with intrinsic columns has no "off" value | leave unset for an intrinsic grid; site build writes the draft's count only when the draft fixes one |
| sgs_shop_sort_biggest_saving_enabled, sgs_shop_sort_rrp_meta_key | checkbox off; text | yes | EC: the sort option "Biggest saving" (value save, orders by saveRaw); the catalogue already stores RRP in `_sgs_rrp` | yes | site build (from the sorting piece's option read, `lib/template-piece-shop-sort.mjs`, which today reports it as "WooCommerce's sorting does not offer") |
| sgs_shop_sort_brand_az_enabled | checkbox off | yes | EC: the sort option "Brand A–Z" | yes | site build, same |
| sgs_shop_hide_zero_decimals | checkbox off | yes | EC: "£139", "Save £32"; Mama's: "£5", "£15", "from £9.50" | yes | site build (from the listing's price words: a whole amount printed with no pence) |
| sgs_shop_sticky_trigger | checkbox on | yes | EC: no floating Filter button after scrolling at 375 (only the header and WhatsApp button are fixed or sticky): off | yes | site build |

**shop-toolbar-settings.php**

| Setting | Type, default | ECT | Draft evidence and value | Complete? | Route writes it by |
| --- | --- | --- | --- | --- | --- |
| sgs_shop_count_label | text, blank (WooCommerce's "Showing all 16 results") | yes | EC: `resultCount: results.length + (… ' frame' : ' frames')` → "%d frames"; Mama's: `countText` → "%d treats to choose from" | yes | site build, from the count piece's own read of the hole (`template-piece-shop-sort.mjs` already finds the count element and its loop) |
| sgs_shop_count_label_single | text, blank | yes | EC "%d frame"; Mama's "%d treat to choose from" | yes | site build, same read (the singular branch) |
| sgs_shop_sort_menu | textarea, blank (WooCommerce's six options) | yes | EC: Featured / Price: low to high / Price: high to low / Biggest saving / Brand A–Z → `menu_order|Featured`, `price|Price: low to high`, `price-desc|Price: high to low`, `sgs_biggest_saving|Biggest saving`, `sgs_brand_az|Brand A–Z`. Mama's: the first three | yes | site build, from the sorting piece's option read (it already maps each draft option to menu_order, price, price-desc) |
| sgs_shop_filters_width | number, 260 | yes | EC: `shopCols: '270px minmax(0,1fr)'`; rail measured 270px: 270 | yes | site build (or a grid read of the rail's parent) |
| sgs_shop_layout_gap | number, theme spacing | yes | EC: rail right edge 322, cards from 362: 40 | yes | site build |

**shop-filters-layout-settings.php**

| Setting | Type, default | ECT | Draft evidence and value | Complete? | Route writes it by |
| --- | --- | --- | --- | --- | --- |
| sgs_shop_card_min_width | number, blank | yes | EC: `cardMin: mobile ? '150px' : '250px'`: 250 (150 on phones). Mama's: fixed columns (`cols` 2/3/3), no minimum | partial: one value, no phone value; no way to say "fixed 3 columns" inside the shop layout | site build; a phone value is a gap (theme setting) |
| sgs_shop_col_gap, sgs_shop_row_gap | number, blank | yes | EC: `gridGap: mobile ? '10px' : '18px'`: 18 and 18 (measured cards 330 wide at 362/710/1058, rows 18 apart). Mama's: `gap: 14px/22px/28px` | yes for one desktop value; tablet value is a gap | site build |
| sgs_shop_narrow_layout | rows/grid, rows | yes | EC: two cards a row at 375 (163px each); Mama's: two a row (`cols` mobile repeat(2)) → grid for both | yes | site build |
| sgs_shop_filter_desktop_heading | checkbox on | yes | EC: no "Filter" heading above the desktop rail (it starts with GENDER): off. Live shows "Filter" | yes | site build |
| sgs_shop_filter_panel_style | panel/plain, panel | yes | EC: the rail has no background or border (`railBg: transparent` beside the drawer): plain. Live shows a grey panel | yes | site build |

**shop-filter-look-settings.php**

| Setting | Type, default | ECT | Draft evidence and value | Complete? | Route writes it by |
| --- | --- | --- | --- | --- | --- |
| sgs_shop_drawer_caps | checkbox off | yes | EC: drawer buttons "CLEAR" and "SHOW 16 FRAMES" are uppercase (text-transform) | partial: capitals only; the two buttons' look (CLEAR outlined 1px #E6E1DA, 84x50; SHOW black filled) has no setting | site build; the button looks are a gap |
| sgs_shop_filter_option_size | number, theme small | yes | EC: chip and segment text 13px ("Pilot", "Women") | partial: size only; chip border, radius, padding and colours have none | site build; the rest a gap |
| sgs_shop_filter_sticky_gap | number, 24 | yes | EC: the rail sticks at `railTop: 110px` from the viewport top (measured: the GENDER heading at 129 after scrolling, 18px inside the rail); the setting is the space below the stuck header, so 110 minus the stuck header's height on the clone | yes | site build, after reading the clone's stuck header height |
| sgs_shop_filter_swatch_hover | number %, 108 | yes | EC: a rail swatch hovered is `matrix(1.12…)`: 112 | partial: grow only; swatch size (30px) and its ring have none | site build |
| sgs_shop_gap_phone | number, 16 | yes | EC: `gridGap` mobile 10px: 10; Mama's 14 | yes | site build |
| sgs_shop_sort_arrow | theme/browser/joined, theme | yes | EC: the select draws the browser's own arrow (no background image, appearance auto): browser. Mama's: a drawn arrow inside a pill (the mirror uses joined) | yes | site build |

**shop-controls-look-settings.php and shop-chosen-filters.php**

| Setting | Type, default | ECT | Draft evidence and value | Complete? | Route writes it by |
| --- | --- | --- | --- | --- | --- |
| sgs_shop_toggle_look | filled/outlined, filled | yes | EC: the draft's FILTER button (Root/254): white, 1px #141414 border, 12.5px uppercase 0.1em, min-height 44px, padding 0 16px, square: outlined | NO: "outlined" hard-codes those exact numbers in `woocommerce.css` (`body.sgs-shop-toggle-outlined .sgs-shop-filters__toggle`), "filled" hard-codes a black pill; any other draft's button has no way in | gap (shop-10); the value site build |
| sgs_shop_toggle_place | row/toolbar, row | yes | EC: count, FILTER and sort share one row at 375: toolbar | yes | site build |
| sgs_shop_toggle_count | checkbox on | yes | EC: the button says `Filter {{ activeCountLabel }}` → "FILTER (1)": on | yes | site build |
| sgs_shop_active_look | theme/pills, theme | yes | EC: chosen filters drawn as dark filled chips with light 12.5px text and a text "CLEAR ALL" (chose Ray-Ban and Pilot in the draft): pills | NO: "pills" hard-codes 34px height, 12.5px, radius 999, text-colour fill | gap (shop-10); the value site build |
| sgs_shop_active_place | panel/bar, panel | yes | EC: the chips sit in a row under the title above the cards (y 298 at 1440), not in the rail: bar | yes | site build |
| sgs_shop_active_prefix | checkbox on | yes | EC: chips say "Ray-Ban", "Pilot" with no group name: off | yes | site build |
| sgs_shop_price_look | theme/thin, theme | yes | EC: a thin track with a small round handle: thin | NO: "thin" hard-codes a 6px track and a 14px handle | gap (shop-10); the value site build |
| sgs_shop_sort_size | number, 15 | yes | EC: select text 13.5px; Mama's 15px | partial: size only. EC's select also has 1px #E6E1DA border, 44px height, 0 14px padding, white fill; Mama's 2px brown border, radius 999, 3px offset shadow, bold, cream fill: none has a setting (shop-11) | site build; the rest a gap |
| sgs_shop_filter_list_size | number, theme small | yes | EC: brand name 14.5px | yes | site build |
| sgs_shop_filter_list_row | number, 2 | yes | EC: each brand row's label has padding 7px 0: 7 | yes | site build |
| sgs_shop_filter_list_weight | number, 400 | yes | EC: brand name weight 500 | yes | site build |
| sgs_shop_filter_list_hover | colour, text colour | yes | EC: hovered brand name rgb(111,97,82) = #6F6152 | yes | site build |
| sgs_shop_filter_count_size | number, theme small | yes | EC: count beside each brand 12px | yes | site build |
| sgs_shop_filter_count_colour | colour, muted | yes | EC: count colour rgb(119,113,106) = #77716A | yes | site build |
| sgs_shop_filter_box_size | number, 18 | yes | EC: the brand checkbox is a 16px native box | yes | site build |
| sgs_shop_filter_box_border | number, 2 | yes | EC: a native checkbox (the UA's own border, about 1px) | partial: a native box's look is the browser's | site build writes 1 for a native box |
| sgs_shop_filter_heading_size | number, theme large | yes | EC: the drawer's "Filter" title 22px | partial: size only; it is Playfair Display 500 in the draft, the theme heading font otherwise | site build; family and weight a gap |

**shop-load-more-settings.php**

| Setting | Type, default | ECT | Draft evidence and value | Complete? | Route writes it by |
| --- | --- | --- | --- | --- | --- |
| sgs_shop_pagination_mode, sgs_shop_batch_size, sgs_shop_desktop_first_load, sgs_shop_load_more_label, sgs_shop_load_more_count_label, sgs_shop_load_more_loading_label | load_more, 24, 120, words | no | Neither draft draws a pager or a Load more button; EC lists 16 and Mama's 5, under one batch, so the defaults show everything | yes | nothing to write until a draft draws one |

eye-care-test uses 47 of the 56 `sgs_shop_*` settings by name (`shop/ect-mod-names.txt`); it has no Additional CSS (`custom_css_post_id` is -1), its Global Styles CSS (97 bytes) targets only the header's phone number, and its saved `archive-product` template carries no block Custom CSS (`shop/ect-css-selectors.txt`). So every shop look the hand-built site has comes from these options and from block settings: there is no one-off CSS to classify. Its product card uses 59 setting names (`shop/ect-card-attr-names.txt`), among them showRating, showBrandOverlay, showSavingBadge, showAttributeTag, showWishlist, showCta, showDescription, rrpMetaKey, priceGroupLayout, imageRatio and noImageLabel; its rail headings use sgs/heading with size, weight, spacing and case; its brand group holds `sgs/filter-search`.

### shop-4: Eye Care's filter drawer at phone width never opens, and from 782px to 1060px the sidebar shows where the draft shows the drawer
- Clients and widths: Eye Care, 375 and 768 (and every width from 782 to 1059).
- Evidence: at 375 on `local-mediatest-trec`, clicking the theme's Filter button turns the panel into a modal dialog (`open`, `:modal`) whose display stays `none`: CDP's matched rules show `.sgs-hide-mobile { display:none !important }` (max-width 767.98px) beating `dialog#sgs-shop-filters:modal { display:flex }` (`shop/drawer-trace.mjs`; `shots/shop/pre/ec-drawer-trace.png`, the page unchanged after the click; beside the draft's open drawer in `shots/shop/drawer-375-draft-trec-ecct.png`). The saved rail container holds `"sgsHideOnMobile":true,"sgsHideOnTablet":true` and `"pinEdge":{"desktop":"sticky","tablet":"sticky","mobile":"sticky"}` (`shop/tpl-trec-full.txt`). The draft hides its rail below 1060px and opens it as a full-screen panel from its Filter button (`drawerFilters = effW < 1060`, `showRail: !drawerFilters || S.filtersOpen`; measured: rail at 1080, drawer at 1024 and below, `shop/ec-draft-measure.json` `breakpoint`); the theme's drawer breakpoint is its default 782.
- Cause: proved. Fill's width gate (`lib/fill-width-gate.mjs`, step 4) reads the rail's sc-if on `drawerFilters`, snaps 1060 to the 1024 tier and writes the hide flags on the rail node, which keeps the rail's draftRef. Its step 3 (a block that draws its own alternative below a threshold writes the threshold instead) does not apply, because the rail's alternative, the theme's drawer, takes its threshold from a theme option. Tonight's code has no exception for the rail (no mention of it in `lib/fill*.mjs`), so a rebuild writes the same flags.
- Layer and owner: route rule (Fill's width gate: the general session's) with this stream's rail rule and site build.
- Fix: the rail node is never width-hidden: the rail rule marks it (a `decided` drawer threshold) and the width gate treats it as step 3, the threshold going to `sgs_shop_filter_drawer_breakpoint` (1060) through shop-3's step; `pinEdge` on the rail is written for desktop only.
- Size: S
- Depends on: shop-3
- Verify by: at 375 and 900 on the rebuilt copy the Filter button opens a full-screen panel with the groups; at 1080 the sidebar shows.
- Same cause elsewhere: any draft whose filter rail becomes a drawer below some width.

### shop-5: Mama's category buttons (All, Zookies, Gifts, …) do nothing: the route built them as a product option picker, not a filter, and they lose the draft's look, counts and single sideways row
- Clients and widths: Mama's, 375 and 1440.
- Evidence: the row is `sgs/option-picker` (a radio group named "Choose an option", `optionItems` All to Vegan; `shop/tpl-trlab-full.txt`). Clicking "Gifts" changes neither the address nor the five cards (`shop/pills.mjs`). The draft's chips filter its listing loop (`chips: defs.map( … pick: () => this.setState( { filter: id } ) )`, `Shop.dc.html`), each with a count badge, the active one yellow with a 3px shadow, 46px tall, 15px bold, 2px border, radius 999, one row scrolling sideways at 375. Live: 16px text, no fill, no badge, no active look, three wrapped rows at 375 (`pair-mm-shop-375.part0.png`, `pair-mm-shop-1440.part0.png`). The categories exist on the copy (`product_cat` Zookies, Gifts, Subscribe, Taster, Bundles, Vegan). A screen reader hears "Choose an option" for a category filter.
- Cause: proved. The general rule `optionSetFilter` (`data/skeleton-decisions.json`: "a group of pressable chips whose choice narrows a list on the same surface stays the option picker and hands the filter wiring to the site build") places the picker with a hand-over, and nothing carries the hand-over out on the shop template, where the list is WooCommerce's product collection.
- Layer and owner: route piece (this stream: the shop template's pieces) with the general rule; the badge and active look are plugin round 6 item 6.
- Fix: on the shop template, a narrowing chip row whose options match the catalogue's categories and whose list is the commerce region's loop becomes `woocommerce/product-filter-taxonomy` (`product_cat`, chips, the theme's `sgs-filter-segmented` "All" first) placed as a piece with a run over the chips (which also clears shop-2's first and third problems); if WooCommerce's filter cannot work outside the collection's router region, links to each category archive instead.
- Size: M
- Depends on: nothing (the badge look waits on plugin round 6 item 6)
- Verify by: choosing "Gifts" on the rebuilt shop lists the three gift products and marks Gifts; at 375 the row scrolls sideways in one line; the row's accessible name is the category filter.
- Same cause elsewhere: any shop draft with category chips above its listing.

### shop-6: the product cards look nothing like the draft's on either site
- Clients and widths: both, 375 and 1440.
- Evidence: Eye Care's first card (2026-11-20 build): title, "£139.00" in a large serif, colour dots, a Size and a Colour picker and a black "VIEW PRODUCT" button; no brand, heart, saving badge, stars, struck RRP or "Polarised" tag (`shots/shop/pre/ec-live.json`, `pair-ec-shop-1440.part0.png`, `pair-ec-shop-375.part0.png`); the saved card holds `"variantStyle":"trial","packSizes":[{"label":"Gold"},{"label":"Black"},…]` (`shop/tpl-trec-full.txt`). Mama's: "View product" under every card against "Build your box", "Add to basket", "Choose amount"; two colour dots the draft lacks; Zookies "£21.50" against "from £9.50" (the product is variable, £9.50 to £38, `shop/price.php`); no badge ("Build your own"), no price note ("£1.19 a cookie"); descriptions shown at 375 where the draft hides them (`pre/mm-live.json`, `pair-mm-shop-375.part0.png`). Both at 375: the photo box is 220px tall around a square photo, leaving a blank band (Mama's image 154px in a 220px box): `.product-card--live:not(.product-card--image-sized, .product-card--image-ratio) .product-card__media { height: var(--sgs-product-card-image-height, 220px) }` (`shop/media-rules.mjs`).
- Cause: proved, in five parts:
  1. Fill cannot decide the card's show/hide switches. The card's calibration (`scripts/computed-route/cache/product-card.json`, measured 2026-11-15 on `local-mediatest-cal2`) holds presence readings for only showGalleryThumbs, brandUseLogo, showSwatches and sourceMode; its fixture holds showRating, showSavingBadge, showBrandOverlay, showWishlist and showAttributeTag on and showPickers, showDescription and showCta off at base, the case `4459ecb81` (2026-11-21) fixed by reading such a flip against a default baseline, after this cache was measured. So every one of those switches keeps the block default (pickers, button and description on; rating, brand, badge, heart and tag off).
  2. Part-look's card rules (`data/part-look-modes.json`) decide only showPickers, showLadder, showDescription, showShadow, showCta true and ctaText; nothing writes showCta false, showSwatches false, showRating, showBrandOverlay, showSavingBadge, showWishlist, showAttributeTag, rrpMetaKey, priceFromLowest, imageRatio or the per-width showDescriptionTier.
  3. Part-look's card locators (`data/part-locators.json` group `productcard`) have no part for brand, rating, ratingStars, rrp, savingBadge, wishlist, swatch, swatchMore, attributeTag or noImageLabel ("No locator" in `shop/pl-ec-report/report.md`), and Eye Care's brand overlay is read as the `tag` part, so its Playfair capitals would land on the tag settings.
  4. Eye Care's part-look reads the home page: `sites/eye-care-ward-end/build/part-look.json` has no `shop` entry and `part-look.mjs::pagesOf` gives no shop role, so the one-file draft opens on its default page, `home` (`shop/card-probe.mjs`: "default page home"; `shop/pl-ec-report.log`: "shop: reading Eye Care Birmingham.dc.html", values only at 1440).
  5. Per-product words: Mama's badge and price note differ by product; the block reads them from product meta (`badgeMetaKey`, `priceNoteMetaKey`) that the catalogue never writes; the button's words and action per product is the known plan gap. The 2026-11-20 build's `variantStyle: trial` and colour-named `packSizes` on both sites (Mama's saved card also has `variantStyle: trial`) look like Fill reading the colour dots as pack-size pills: hypothesis, since tonight's code did not run on either shop; prove on the rebuilt card's saved attributes.
- Layer and owner: calibration run and part-look (this stream), catalogue (this stream), block setting gap for per-product button words (known).
- Fix: (a) `calibrate.mjs --blocks sgs/product-card` on each copy; (b) modes: `showCta false whenAbsent cta`, `showSwatches false whenAbsent swatch`, showRating, showBrandOverlay, showSavingBadge, showWishlist, showAttributeTag true when their parts are found, `priceFromLowest` when the price reads "from" the lowest amount, `imageRatio` from the photo's aspect, `showDescriptionTier` when the description shows at some widths only; (c) locators for brand, wishlist, savingBadge, rating, ratingStars, rrp, swatch, attributeTag, by structure (the words over the photo naming the brand, the wordless button over the photo, the amount over the photo, the struck amount in the price row, the round buttons in the price row); (d) `part-look.json` `"shop": { "route": "shop" }` for Eye Care, and `part-look.mjs` refuses a template surface of a one-file draft with no route; (e) the catalogue writes each product's badge and price note as meta and part-look sets the two meta keys.
- Size: M
- Depends on: shop-1 and shop-2 to see tonight's cards
- Verify by: the rebuilt cards show Eye Care's brand, heart, badge, stars, struck RRP and dots with no pickers or button, Mama's badges, "from £9.50", notes and no dots; no blank band at 375; part-look's shop verify compares the new parts at 375 and 1440.
- Same cause elsewhere: every product card (home best sellers, related products, Mama's gifts page).

### shop-7: on eye-care-clone-test (the hosted Eye Care clone) the closed filter panel still takes about 1,790px at 375, a tall blank gap above the products; this is the QC review's "11 pairs inside .sgs-shop-filters hidden in the draft but visible live"
- Clients and widths: any site whose rail container the route builds with a flex layout and no hide flags; seen on eye-care-clone-test at 375. On `local-mediatest-trec` the hide flags of shop-4 mask it (the closed panel is hidden, and so is the open one).
- Evidence: the closed `dialog#sgs-shop-filters` computes `display:flex`, `position:sticky`, `translate: 0 100%`, 1,791px tall at y 2,569; the first card starts at y 2,665 after a blank band (`shots/shop/ecct/crop-375.png`; `shots/shop/ecct/live.json`: 13 elements inside the closed panel have boxes, which a walker counts as visible). CDP: the browser's `dialog:not([open]) { display:none }` loses to the container's `.sgs-container--stack { display:flex }` (author CSS beats the browser's), and the theme's `dialog.sgs-shop-filters { translate: 0 100% }` only moves it out of sight (`shop/drawer-trace2.mjs`).
- Cause: proved (the matched rules). The theme's own template builds the aside with no layout, so this never showed there; the route builds it as `sgs/container` with `layout: stack` and sticky `pinEdge` from the draft's rail.
- Layer and owner: theme (`theme/sgs-theme/assets/css/woocommerce.css`), plus the route's sticky write (shop-4).
- Fix: `dialog.sgs-shop-filters:not([open]) { display: none; }` below the drawer breakpoint in `woocommerce.css`. A fix, so it lands everywhere: list the shop pages whose render changes (render-scope) before each site's deploy.
- Size: S
- Depends on: nothing
- Verify by: at 375 on a site whose rail container has `layout: stack`, the first card sits under the toolbar and the panel has no box until opened.
- Same cause elsewhere: every clone with a draft rail.

### shop-8: Eye Care has no results count ("16 frames")
- Clients and widths: Eye Care, all widths (Mama's count is placed; only its words differ, shop-3).
- Evidence: tonight's proposal note: "piece results-count: the listing's count Root/252#0 ("16 frames") has no node of its own in the skeleton, so it stays as built"; its row is `action: remove, rule: formControl` with the reason "the field's label, required marker, hint or character count…". Root/252 is the `<span>{{ resultCount }}</span>` beside the Filter button and the sort select in one row (Root/251).
- Cause: proved. The general formControl rule takes the count, a sibling of the select, as the select's label and removes it, so the count piece finds no node.
- Layer and owner: route rule (formControl: general) and route piece (this stream).
- Fix: formControl takes as a field's label only an element the select is labelled by (a `label` holding or naming it, or its `aria-labelledby` target), never a sibling whose hole is a loop's length; and `lib/template-piece-shop-sort.mjs` places `woocommerce/product-results-count` where the count element stood when another rule removed its node. Words: shop-3's `sgs_shop_count_label`.
- Size: S
- Depends on: shop-3 for the words
- Verify by: "16 frames" left of the sort at 1440 and in the toolbar at 375.
- Same cause elsewhere: any draft whose count sits beside its sort select.

### shop-9: Eye Care's filter groups do not look or behave like the draft's: Gender is pale chips with counts instead of an All / Women / Men switch, chips show "(3)" counts the draft does not, Brand has no "Search brands" box, and Brand and Style lack their heading counts
- Clients and widths: Eye Care, 1440 and in the drawer.
- Evidence: the 2026-11-20 rail: Gender chips "Women (5)", "Men (11)", Style chips with counts, Brand list "Ray-Ban (3)", no search (`pair-ec-shop-1440.part0.png`). Tonight's skeleton gives every attribute group `"showCounts": true` chips and headings with only `sgs-filter-open` / `sgs-filter-swatches`; the brand group has no `sgs/filter-search` (`shop.skeleton.json`; `data/skeleton-decisions.json` `rules.filterRail`). The draft: a three-segment Gender switch with "All" first; chips without counts; a "Search brands" box; "40" beside BRAND and "12" beside STYLE.
- Cause: proved. The theme draws a segmented switch for a heading classed `sgs-filter-segmented` and a group count for `sgs-filter-count` (`assets/js/sgs-shop-filters-groups.js`), and the search box is `sgs/filter-search`; `lib/skeleton-filter-rail.mjs::filterRail` writes none and sets `showCounts` for every group from the rule's fixed attributes.
- Layer and owner: route piece (this stream: `skeleton-filter-rail.mjs`, `rules.filterRail`).
- Fix: per group, by structure: `sgs-filter-segmented` for one-choice segments with an "all" option first; `sgs-filter-count` when the heading row shows a number; `showCounts` only when options show numbers; `sgs/filter-search` before a brand or category list when the group shows a text input.
- Size: S
- Depends on: nothing
- Verify by: the rebuilt rail at 1440 and in the drawer shows the switch, plain chips, the search box and the heading counts.
- Same cause elsewhere: any shop draft with a filter rail.

### shop-10: four theme options hard-code one draft's look, so another client's Filter button, chosen-filter chips, price slider and drawer buttons cannot be drawn (block setting gaps)
- Clients and widths: every client but the one each option was measured on.
- Evidence: `woocommerce.css`: `body.sgs-shop-toggle-outlined .sgs-shop-filters__toggle` fixes 44px height, 0 16px padding, a 1px text-colour border, 12.5px, weight 400, 0.1em, capitals ("filled" fixes a black pill); `.sgs-shop-active-pills …__item` fixes 34px, 0 8px 0 14px, radius 999, 12.5px, text-colour fill; `.sgs-shop-price-thin …` fixes a 6px track and 14px handle; the drawer's Clear and Show buttons have only `sgs_shop_drawer_caps`. Single-value options lack a phone value (`sgs_shop_card_min_width`: the draft's 150px on phones) and size-only options lack the rest (`sgs_shop_filter_heading_size`: the draft's Playfair 500; `sgs_shop_filter_option_size`: chip border and radius; swatch size 30px).
- Cause: proved (the rules; the option sets in shop-3's table).
- Layer and owner: block setting gap (plugin round: the shop filter drawer's parts: toggle, chosen chip, price track and handle, drawer clear and apply buttons, filter chip, swatch, panel title), each needing per-property values, not named looks.
- Fix: the Filter button becomes the draft's own `sgs/button` (the button kit carries any look) classed `sgs-shop-filters__toggle`, which `assets/js/sgs-shop-filters.js::ensureParts` adopts instead of building its own (hypothesis that the kit's markup works as the trigger: prove on a copy); the chips, slider, swatch and drawer buttons become custom properties written by shop-3's step from the draft.
- Size: L
- Depends on: shop-3
- Verify by: Eye Care's and Mama's values both render through the same settings on two copies.
- Same cause elsewhere: every client shop with a rail.

### shop-11: the sort menu's look cannot be carried: neither Eye Care's square bordered select nor Mama's bold brown pill with its offset shadow has a setting
- Clients and widths: both, all widths.
- Evidence: the drafts' selects: Eye Care 13.5px, 1px #E6E1DA border, white, 44px high, 0 14px padding, square; Mama's 15px bold, 2px #3A2A22 border, radius 999, cream fill, 3px 3px 0 #3A2A22 shadow, 50px high (`shop/ec-draft-measure.json`, `shop/mm-draft-measure.json`). Live: WooCommerce's grey square select with "▼" (`pair-mm-shop-1440.part0.png`). `woocommerce/catalog-sorting` supports only text colour and font size; the commerce-look attributes registered on it paint nothing, because `plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json` has no row for the sorting, the results count or any filter block (grep: 0); the theme offers only `sgs_shop_sort_size` and `sgs_shop_sort_arrow`.
- Cause: proved (no setting exists).
- Layer and owner: block setting gap (plugin round: `woocommerce/catalog-sorting`, part the select: border width, style and colour, radius, fill, height, padding, font family and weight, shadow, hover and focus), best as commerce-look rows so part-look writes them like the basket's.
- Fix: commerce-look rows for the select and a sort-select locator in part-look's shop group.
- Size: M
- Depends on: nothing
- Verify by: part-look's shop verify compares the select's border, radius, fill, height and shadow at 375 and 1440 on both copies.
- Same cause elsewhere: the results count's look (Eye Care 13.5px #6B655E, Mama's 15px bold) also has only colour and size.

### shop-12: Eye Care's products come in alphabetical order instead of the draft's "Featured" order
- Clients and widths: Eye Care, all widths (first cards Aviator Classic, Carrera 1055/S, Chelsea against Aviator Classic, Oversized Cat-Eye, Holbrook).
- Evidence: every product's `menu_order` is 0 on `local-mediatest-trec`, so WooCommerce's default order falls back to the title. The draft's Featured order is its product list's own order (the "featured" option applies no `.sort`). Mama's copy has `menu_order` 1 to 5, set by hand on the mirror it was copied from (`shop/price.php`), so it proves nothing about the route.
- Cause: proved.
- Layer and owner: catalogue (this stream: `lib/site-build-catalogue-php.mjs`).
- Fix: the catalogue step writes each product's `menu_order` as its index in the draft's product list.
- Size: S
- Depends on: nothing
- Verify by: `/shop/` lists the draft's order; `?orderby=price` still sorts by price.
- Same cause elsewhere: every client catalogue.

### shop-13: the stars cannot show the draft's ratings: the copy has no reviews
- Clients and widths: Eye Care.
- Evidence: `_wc_average_rating` and `_wc_review_count` are 0 (product 385); the draft's "4.9 (41)" are sample figures in its product list.
- Cause: proved.
- Layer and owner: site data; a decision for Bean (real stars come from real reviews).
- Fix: none in the route; choose the empty-stars wording (`noReviewsText`, for example "No reviews yet") or hide stars until reviews exist.
- Size: S
- Depends on: shop-6
- Verify by: n/a
- Same cause elsewhere: the product page's review summary.

### shop-14: known, owned by the general session: Eye Care's page is wider than the screen and its header is broken, and Mama's pink band is broken at 1440
- Clients and widths: Eye Care 375 (604px wide) and 1440 (1,567px); Mama's 1440 (title thrown right, band about 600px tall).
- Evidence: `shots/shop/pre/ec-live.json` `scrollW`; `pair-ec-shop-1440.part0.png`; `pair-mm-shop-1440.part0.png`.
- Cause: known: the header's top strip (plan item d) and the `sgs/hero` Fill (lab findings).
- Fix: as planned there.
- Same cause elsewhere: every page.

### shop-15: known: `gate-chain` fails both shop runs in a worktree
- Evidence: "FAIL shop gate-chain … path: '…\build\trees\shop\shop.json'" (both logs).
- Cause: known: it reads a tree a worktree run never writes (the general session's).

### Checked and clear
- Sorting works on both: "low to high" loads `?orderby=price&paged=1` and reorders the cards (Eye Care £59, £59, £99, £109; Mama's Taster Trio £5 first) (`shots/shop/pre/*-live.json` `sort`). Only the labels differ (shop-3).
- Cards per row at 1440: Eye Care 3 (329px; draft 330), Mama's 3 (400px; draft about 390); at 375 both 2 (draft 2).
- The filter groups are not proposed as accordions on the shop: the rail rule absorbs the rail's subtree (581 rows `rule: filterRail`, no `sgs/accordion` in Eye Care's `shop.skeleton.json`); the theme turns each heading and its filter into a `<details>` group in the browser, which is how the draft's collapsible groups are drawn. (The product page does propose `sgs/accordion`, refused for missing calibration: the product investigation's.)
- The draft's own Filter button is left out tonight (`filterRail.toggle: Root/254#0`, its row removed), so the two Filter buttons at 375 on the 2026-11-20 build go with the rebuild. The theme's trigger left in its place has its look and place only through shop-3's options and shop-10's gap.
- Mama's results count is placed tonight (results-count at Root/26); only its words differ.
- The catalogue apply re-uploaded the four missing photos and the photo-to-come image (`logs/eye-care-ward-end-catalogue.log`: "image fetched …", "a fresh read plans 0").
- eye-care-test has no Additional CSS (`custom_css_post_id` -1), Global Styles CSS of 97 bytes aimed at the header's phone number only, and no block Custom CSS in its `archive-product` template (`shop/ect-css-selectors.txt`), so it holds no one-off shop CSS to classify: every shop look it has comes from the options and block settings.

## Pictures and probes

Pictures (`E:\sgs-tmp\template-rework\investigation\shots\shop\`):
- Pairs, draft left, clone right: `pair-ec-shop-1440.png`, `pair-ec-shop-375.png`, `pair-mm-shop-1440.png`, `pair-mm-shop-375.png` (and their `.partN.png` strips).
- Drafts: `ec-draft-1440.png`, `ec-draft-375.png`, `ec-draft-375-drawer.png` (the draft's drawer opened by its own button), `mm-draft-1440.png`, `mm-draft-375.png`, crops `crop-*.png`.
- Clones: `pre/ec-live-1440.png`, `pre/ec-live-375.png`, `pre/ec-live-375-drawer.png` and `pre/ec-drawer-trace.png` (after clicking Filter: nothing opens), `pre/mm-live-1440.png`, `pre/mm-live-375.png`; eye-care-clone-test `ecct/live-375.png`, `ecct/crop-375.png` (the blank gap), `ecct/live-375-drawer.png`; `drawer-375-draft-trec-ecct.png` (draft drawer, trec after the click, eye-care-clone-test closed).

Probes and reads (`E:\sgs-tmp\template-rework\investigation\shop\`), all read-only:
- `draft-probe.mjs`, `card-probe.mjs`, `draft-measure.mjs` (`ec-draft-measure.json`), `mm-measure.mjs` (`mm-draft-measure.json`): the drafts' cards, toolbar, rail, drawer, chosen filters and breakpoint.
- `live-probe.mjs` (`../shots/shop/pre/*-live.json`, `../shots/shop/ecct/live.json`): cards per row, card parts, count, sort and sorting, toggles, the rail and the drawer.
- `drawer-trace.mjs`, `drawer-trace2.mjs`, `media-rules.mjs`, `img.mjs`: CDP matched rules for the drawer and the card photo box.
- `pills.mjs`: Mama's category row clicked.
- `mods-schema.php` (`mods-*.json`), `tpl-read.php` (`tpl-*.txt`), `price.php`, `wc-supports.php`: options, saved templates, prices, WooCommerce block supports.
- eye-care-test, names only: `ect-mod-names.txt`, `ect-archive-names.txt`, `ect-card-attr-names.txt`, `ect-css-selectors.txt` (`names.php`, `gs-css.php`, `css-selectors.php`).
- Part-look draft-side reports (no site written): `pl-ec-report/report.md`, `pl-mm-report/report.md`.
