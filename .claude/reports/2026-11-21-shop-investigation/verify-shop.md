# Shop findings: fact-check verdict (2026-11-21 night)

Checked by an independent read-only checker against main `01774ff85` and the lab; saved here by the main session (the checker could not write). Lightly shortened.

Counts: 7 confirmed, 7 corrected, 1 wrong, 0 unverifiable. The companion files the brief named do not exist; the settings table is inside `shop.md`.

| ID | Verdict | Correction or evidence |
|---|---|---|
| shop-1 | corrected, minor | The refusal is the 18 state copies (in the inventory's `revealed` list, `fgOpen.size:true`, visible only at 1440). The base copies pass through the `commerceRegion` rows' own-surface record; the state copies lose it because `lib/skeleton-paint-conservation.mjs::conservationRows` starts `listRow` with `const row = shownIn ? null : rows.get(e.key)`. `skeleton.mjs` passes only the rail's run, so the commerce region has none. The run fix is plausible (hypothesis); an alternative (a state copy inherits its base row's record) would touch every surface. |
| shop-2 | corrected | Root/24#0..6 are the count badges (22px span "5"), not the chips (Root/23). The option picker already holds chip fill, radius and padding (`pillBgColour`, `pillBorderRadius`, `pillPadding`). `woocommerce/product-filter-chips` already has a count badge (see shop-5). Root/38 confirmed: "→" in a 34px circle. |
| shop-3 | corrected | 56 settings confirmed, and only `lib/site-build-catalogue-toggle.mjs` writes theme options. But `sgs_shop_filter_drawer_breakpoint` only feeds the script (`inc/shop-filters-settings.php::localise_shop_filter_settings`, `BREAKPOINT` in `sgs-shop-filters.js`); `woocommerce.css` hard-codes 781.98px/782px in about 8 media rules (bottom sheet, toggle display, one-column layout, sticky trigger), so writing 1060 leaves 782 to 1059 broken: a theme gap. `sgs_shop_result_count_label`: the draft has a singular ("frame" when 1); one wording gives "Show 1 frames". |
| shop-4 | corrected | Fill cause confirmed (width gate step 4: 1060 within 5% of 1024 snaps; template 498 carries the hide flags and the all-device sticky edge). Widths wrong: `sgs-hide-tablet` hides 768 to 1023.98 and the theme toggle shows only below 782, so at 782 to 1023 neither rail nor toggle shows (from the code), and only 1024 to 1059 shows the sidebar. Needs the theme change of shop-3 (shared CSS, render-scope on every site), so not S. Planned as RW-27. |
| shop-5 | corrected | Cause confirmed (clicking Gifts changes nothing; nothing listens for `sgs:option-selected`). Evidence wrong: `.sgs-option-picker__pill` is 15px bold, cream, 2px #3A2A22 border, radius 999, chosen look on All; 22px tall against the draft's 46px; three rows at 375 confirmed. "Badge and active look wait on round 6 item 6" is wrong: `includes/product-filter-look.php` already gives `woocommerce/product-filter-chips` `sgsChipCountPill`/`Background`/`Colour`/`Radius`, `sgsChipSelected*`, `sgsChipAllLabel`, `sgsChipSingle`; `local-mamas` template 194 uses `product-filter-taxonomy` `product_cat` with them, which proves the fix. Planned as RW-28. |
| shop-6 | corrected, minor | Confirmed (presence readings only for 4 switches; part-look card rules and locators missing; no shop entry in `part-look.json`; the draft opens on `page:'home'`). Wrong: "values only at 1440" (part-look reads 1440, 768 and 375). Colour-named `packSizes` exist only on Eye Care. Mama's build is 2026-11-19; part-look rewrote template 6024 at 21:44, after the findings. Split into five causes (below). |
| shop-7 | confirmed | Closed dialog at display flex, 1,791px tall; `.sgs-container--stack{display:flex}`. Fix applies everywhere and says so. |
| shop-8 | confirmed | Row Root/252 is `remove`/`formControl`; the draft's select carries `aria-label="Sort"`. Planned as RW-26. |
| shop-9 | confirmed | 9 `showCounts`, no `filter-search`, only the open and swatch classes; the draft has "Search brands". The chips block's `sgsChipSingle` + `sgsChipAllLabel` is another way to the All/Women/Men switch. |
| shop-10 | corrected | The toggle, chosen-pill and thin-slider looks are fixed looks in `woocommerce.css` (confirmed). "Filter chip: border and radius have none" is wrong: `customChip*`, `sgsChipBorderWidth`, `sgsChipMinHeight`, `sgsChipFontWeight`, `style.border.radius` exist (used on `local-mamas`); they are block settings, not theme options. |
| shop-11 | WRONG | `woocommerce/catalog-sorting` has `sgsSortBackground`, `sgsSortBorderColour`, `sgsSortBorderWidth`, `sgsSortBorderRadius`, `sgsSortFontWeight` (`includes/product-filter-look.php`), set on `local-mamas` template 194. Real gaps: height, padding, shadow, font family, hover/focus, and no route reader. |
| shop-12 | confirmed, minor | Eye Care `menu_order` all 0 (Mama's 1 to 5); the fix changes product order on every client's next catalogue run, pages not listed. |
| shop-13 | confirmed, minor | No reviews on 385; the fixture has `noReviewsText`. |
| shop-14 | confirmed (known) | scrollW 604 and 1567; owned elsewhere. |
| shop-15 | confirmed | Both logs fail gate-chain on `trees\shop\shop.json`. |
| Checked and clear | corrected, minor | "581 rows rule filterRail": 291 rows; 581 is the string count. |

## Shared causes

The chips half of shop-2 and shop-5 are one cause (Root/38 separate, general route). shop-4 and shop-3's drawer breakpoint row share the theme's hard-coded 782 CSS. shop-10 (chips), shop-11 and shop-3's `sort_size`/`filter_option_size` rows are one gap: existing filter-look settings the route never writes. Split shop-6 into five: recalibration, part-look modes, card locators, Eye Care's shop route in `part-look.json`, catalogue meta. shop-8's words depend on shop-3; shop-13 on shop-6.

## New, unchecked

The route has no reader for `sgsSort*`/`sgsChip*` (not in the framework DB's `block_attributes`; only in `data/capabilities.json`). The theme's drawer CSS is fixed at 782 although the breakpoint option is configurable. Mama's template 6024 was modified at 21:44 by part-look, so Mama's readings in `shop.md` predate it.
