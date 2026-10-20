---
doc_type: plan
title: Mega-menu items link to their section page (Spec 36 FR-36-5, FR-36-6)
status: active
created: 2026-10-20
spec: .claude/specs/36-SGS-NAVIGATION-SYSTEM.md (FR-36-5, FR-36-6); .claude/specs/48-CLONING-SYSTEM.md (FR-48-30, FR-48-55)
---

# Mega-menu items link to their section page

## Why now
- **Problem:** a mega-menu item is a classic menu item whose object is the `sgs_mega_menu` panel post. The panel post type is nav-only (`public => false`), so the item has no page to link to: the bar renders it as a `<button>` only (`plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_render_items`, the `sgs_mega_menu` branch) and the drawer as a whole-row toggle (`plugins/sgs-blocks/includes/nav-drawer-menu-items.php::sgs_nav_drawer_menu_accordion_html`, `$row_toggle`). FR-36-5 still says the trigger "resolves to the mega post's own permalink", which the nav-only decision made a 404.
- **Effect:** on every client site the top-level items that open mega panels (Indus: About, Sectors, Brands, Trade; Eye Care: Sunglasses, Lenses, Help, register row N5.5 in `.claude/plans/2026-10-02-eye-care-fix-register.md`) cannot take a visitor to the section's own page. Eye Care's content step (setting those three panels' Section page) stays on its register row.
- **Decided (Bean, 2026-10-20), from the research below:**
  1. **Link source:** each panel post carries a "Section page" setting; every menu item that opens the panel links to that page.
  2. **Drawer:** a parent with its own page is a split row (label = link, chevron = a separate 44px toggle), and its opened section starts with a "View all <label>" row.
  3. **Bar:** the same split (label = link, chevron = toggle button); mouse hover still opens after the intent delay where the block's existing open-on setting says hover; touch taps the chevron to toggle and the label to navigate.
  4. **One menu:** the drawer and the bar use the same menu and the same mega panels; a panel keeps its stacked drawer design (the `drawer` render context, FR-36-6 "Mega items in the drawer"). No separate drawer menu is built when the drawer's sections are the header's mega items.

## Research (2026-10-20)
- WAI-ARIA APG "Disclosure Navigation Menu with top-level links": a link plus an adjacent `<button aria-expanded aria-controls>`; no `role=menu`; Escape closes and returns focus to the button (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation-hybrid/).
- Baymard: users miss a split name/arrow target on mobile; put "View all <section>" first in the opened section (https://baymard.com/blog/mobile-main-nav-view-all). Desktop hover: 300 to 500ms intent delay (https://baymard.com/blog/ecommerce-navigation-best-practice).
- NN/g mega menus: about 0.5s rest before opening, tolerate the diagonal path, each top-level item links to a section page (https://www.nngroup.com/articles/mega-menus-work-well/).
- USWDS avoids hover-opening (https://designsystem.digital.gov/components/header/); SGS keeps hover as the per-site open-on setting (decision 3).
- SGS already renders the split for ordinary dropdowns in both surfaces (`nav-menu-markup.php::sgs_nav_bar_menu_render_items` DROPDOWN branch, `has_url`; `nav-drawer-menu-items.php::sgs_nav_drawer_menu_accordion_html`). This plan gives mega items a destination so they reuse it.

## Done when
1. A mega item whose panel has a section page renders, at 1440 and 768, an `<a>` to that page plus a chevron `<button aria-expanded>` that opens the panel by click, Enter and Space; hover still opens it where open-on is hover; Escape closes and returns focus to the button.
2. In the drawer at 375 the same item is a link plus a separate toggle at least 44x44px, and the opened section's first row is "View all <label>" linking to the section page; an ordinary dropdown parent with a page gets the same first row; the panel's footer "View all" fallback does not print a second one in the drawer.
3. A panel with no section page behaves as today (bar button-only, drawer whole-row toggle).
4. On indus-test: the four panels carry their section pages (About Us, Food Service, All Brands, Apply for Trade Account), the drawer binds the header menu, the separate "drawer" menu is gone, and `node scripts/computed-route/site-build.mjs indus-foods --site indus-test` then plans 0 creates and 0 changes.
5. Gates: route tests, `node scripts/computed-route/lint.mjs`, the deploy's gate tier, `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check`.

## Units

| # | Unit | Files | Needs | Time |
|---|---|---|---|---|
| 1 | Spec (done 2026-10-20, with the plan) | `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` FR-36-5 ("Section page": the click target, the bar's split trigger with hover kept) and FR-36-6 ("A parent with its own page": the drawer split row and "View all" first row); the build session sets their Status when units 2 to 9 land | none | 0 |
| 2 | Panel setting | `plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php` (add `custom-fields` to the CPT's `supports`, or REST drops the meta; register post meta `_sgs_mega_section_page`: integer, single, `show_in_rest`, `auth_callback` = `edit_theme_options`; a `section_url( int $panel_id ): string` helper returning the page's permalink when it is published and `is_post_type_viewable()`, else ''); `plugins/sgs-blocks/src/blocks/extensions/mega-section-page-panel.js` (a `PluginDocumentSettingPanel` on `sgs_mega_menu` with a page picker, modelled on `src/blocks/extensions/cpt-default-panel.js`: published pages only, searchable, an empty choice meaning no section page), imported from `src/blocks/extensions/index.js` | none | 15 min |
| 3 | Item URL | `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::classic_items_to_blocks` (a `sgs_mega_menu` item's `url` = the panel's section URL, '' when none; this also stops today's bar footer "View all" pointing at the panel's 404 permalink); the same file's block-menu path (`blocks_from_ref` for a `wp_navigation` post): a link whose `type` is `sgs_mega_menu` gets '' unless it is the section URL, so no block menu prints a dead link; `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` `from_link` checked unchanged (`is_destination_url` on the resolved URL); `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php` `from_link` (a mega item's `has_url` = `SGS_Nav_Menu_Source::is_destination_url( $url )`, since `sgs_nav_drawer_menu_has_real_destination` judges the panel post type, which is never viewable) | 2 | 10 min |
| 4 | Bar split | `nav-menu-markup.php::sgs_nav_bar_menu_render_items` mega branch: with `has_url`, keep the existing `sgs-nav-bar-menu__mega` root and its context, and borrow only the DROPDOWN branch's link + button pair: an `<a class="sgs-nav-bar-menu__link">` with `data-sgs-nav-path` and the label-roll and magnet-target spans, then a chevron `<button>` that keeps `sgs-nav-bar-menu__mega-trigger` (so `src/blocks/nav-bar-menu/style.css` and `block.json` selectors still style it), `data-sgs-mega-trigger`, `aria-controls` and the screen-reader "Show submenu for %s"; never the dropdown root's `data-sgs-nav-disclosure`. `src/blocks/nav-bar-menu/style.css`: the split's layout and a 44x44 hit area round a ~20px chevron, checked at 768. No JS edit expected: `mega-disclosure.js::focusTrigger` and `panel-motion-state.js` find `[data-sgs-mega-trigger]`, now the chevron; the panel anchors on the root, which now includes the link, so check alignment | 3 | 20 min |
| 5 | Drawer row | `nav-drawer-menu-items.php::sgs_nav_drawer_menu_accordion_html` (a `has_url` parent's body starts with a "View all <label>" `li`, same sublink classes, the string reused from `helpers-mega-render.php::sgs_mega_render_item_panel`'s `View all %s`); the `megaDrawerFallbackIds` branch in `nav-menu-markup.php` (a mega item shown as its plain children) gets the same first row; drill-down mode (`src/blocks/nav-drawer-menu/view.js`, `data-sgs-drill-panel`) keeps its Back row above it; `helpers-mega-render.php::sgs_mega_render_item_panel` prints no footer "View all" in the `drawer` context (the bar keeps it, once); the summary toggle keeps at least 44x44px | 3 | 20 min |
| 6 | Tests | PHP standalone runners in `plugins/sgs-blocks/tests/php/` (section URL: published page, draft page, deleted page, no meta; bar markup with and without a section page, and no footer "View all" when there is none; drawer first row present once in the accordion, the fallback branch and drill-down; the bar footer "View all" still printed once), the render harness stub `plugins/sgs-blocks/scripts/qa/lib/wp-stubs.php` for any new core call; each MUST FAIL | 2 to 5 | 15 min |
| 7 | Route | `scripts/computed-route/lib/site-build-menus.mjs` (the page row on a mega row's slot is the panel's section page), `lib/site-build-plan.mjs` (a `section` action setting `_sgs_mega_section_page` by `wp post meta update` when the stored id differs, and a note when the page it names is not published), `lib/site-build-apply.mjs` (runs the `section` action), `lib/site-build-state.mjs` (read the meta and that page's status), `lib/site-build-map.mjs::placeholderTree` (the drawer binds the `drawer` menu when the map has one, else the header menu); `scripts/computed-route/lib/intake-pagemap.mjs` (a drawer menu whose top-level items are each a header mega item's label is not written to the page map: those sections are the panels; any other drawer menu is kept, so other clients' drawers are unchanged); tests in `tests/site-build.test.mjs` and `tests/intake-pagemap.test.mjs`, each mutation-checked; README rows | 2 (meta key only) | 40 min |
| 8 | Indus data | `sites/indus-foods/build/page-map.json`: remove every `menu: "drawer"` entry (Bean, 2026-10-20, decision 4), recorded in `sites/indus-foods/build/intake/approved-decisions.json`; `check-approved.mjs indus-foods` still exits 0 | 7 | 5 min |
| 9 | Live | serial queue; `mysqldump` backup and `wp menu item list drawer --format=json` saved to the scratchpad (rollback: restore the dump, revert this plan's commits by hash and redeploy); `build-deploy.py --target indus-test --blocks-only`; `site-build.mjs --apply` (sets the four section pages, rebuilds the drawer post 203 on the header menu); `wp menu delete drawer` (the old menu, term 6, made by the site build); second dry run plans 0; Playwright at 375/768/1440: keyboard (Tab, Enter, Space, Escape returns focus to the chevron), touch (`hasTouch` context: tap the chevron toggles, tap the label navigates), a mouse click on the label navigates even while hover has opened the panel, the panel's alignment is unchanged, the drawer in accordion and drill-down modes, "View all" first row once, every link 200 | 4, 5, 8 | 25 min |
| 10 | Docs | Spec 36 Status lines, Spec 48 FR-48-55 Status (section page, drawer binding), Indus plan step 20's open items (the mega item URL item closes), LEDGER | 9 | 10 min |

Critical path: 2 → 3 → 4/5 (parallel) → 6 → 9. Unit 7 runs beside 3 to 6, then 8. Total about 2 h.

## Gates
- **G1 after 6 (auto):** the new PHP runners pass and each fails with its rule removed; `php -l` clean; `python plugins/sgs-blocks/scripts/check-dead-api-calls.py` 0 findings; `python plugins/sgs-blocks/scripts/check-motion-part-render-paths.py --check` OK.
- **G2 after 9 (review):** done-when 1 to 4 read on the live page; Bean looks at the drawer at 375 on a phone.

## Risks
- **Calibration staleness.** Units 4 and 5 change `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` markup. Another session (small-giants-wp-85, 2026-10-20) is calibrating those blocks on local-indus; message it before building and deploying, and expect their default paint to be re-measured afterwards.
- **Current-page marking.** The bar marks the current page from `data-sgs-nav-path`; a mega link must carry it, or the section page never shows as current.
- **Block (`wp_navigation`) menus.** A mega item in a block menu is FR-36-5's open spike; this plan covers classic menus only and says so in Spec 36.
- **Panel used by two menus.** One section page per panel; two placements of the same panel link to the same page (accepted).

## Pre-emptive decisions (defaults, from the cold reviews)
- **Wording:** "View all <label>" reuses the existing `View all %s` string (no new translation key); Indus reads "View all Trade".
- **Picker:** published pages only; a page later drafted or deleted makes the item behave as if it had no section page, and the site build notes it.
- **Which menu is "the header menu":** the page map's `header` menu (the one the header's `sgs/nav-bar-menu` is bound to by `ref`); the drawer binds it only when the map has no `drawer` menu.
- **Drawer order:** "View all" is the first row, above the panel's own content; a panel's own call-to-action stays; only the footer fallback is suppressed in the drawer.
- **Chevron size:** a 44x44 hit area round a ~20px glyph with the visible focus ring, in both surfaces; screenshot the bar at 768 before accepting.
- **Other clients:** only Indus's page map loses its drawer entries (unit 8); the intake rule leaves any drawer menu that is not the header's mega sections.
- **Concurrent calibration:** if a session is calibrating the nav blocks on local-indus, build units 2, 3, 6 to 8 first and hold the deploy (unit 9) until it says it is done; its default paint for those blocks is re-measured after.

## Not in this plan
- The inline authoring affordance (FR-36-5, not built): editing a panel from inside the nav-bar-menu editor.
- Filling the panels' content (Indus step 20).
