---
doc_type: plan
title: Mama's merged round (B9 gaps 1 to 7, commerce COM-1 to COM-6, Spec 32/35 follow-ups)
status: active
---

# Mama's merged round, 2026-11-05

Status: rounds 1 and 2 done, the QC round open (below). Round 1 on main `0c6503f12` (framework DB sha 6c82dfc73037), round 2 on main `74ee0c69b` (sha 81e543c0d538), both gated green for sandybrown, mamas-test and indus-test and deployed to mamas-test; every value set on local-mamas from the drafts (content audit 0 HIGH, editor check clean, including `sgs_form` 157) and pushed to mamas-test 2026-11-05 16:00 UTC (earlier remote DB on the server at `~/backups/push-to-remote/lightsalmon-tarsier-683012.hostingersite.com-20261105-160024.sql`); site-check on mamas-test 0 failed without a basket and with one (woocommerce 57 pass, `sites/mamas-munches-redesign/build/qa/site-check/2026-11-05T16-08-45/result.md`). QC found the next round (Open).

## In plain English
One round finished every open Mama's gap from both former tracks: the configurator, Help filter, shop chips, contact tiles and review slider (B9 gaps 1 to 7), and the basket, checkout and account (COM-1 to COM-6). Every gap became a real setting, off by default and byte-identical when unset, built by seven parallel builders, each owning a separate block family, then merged, gated and deployed once.

## Families and what was built
| Builder | Items | Built |
|---|---|---|
| m-config | A1, A7 | `sgs/buybox` `pickPricedLayout`, `pickPricedMinHeight`, `pickBadgeBackgroundColour`, `pickBadgeTextColour` (automatic 4.5:1 text) |
| m-accordion | A2 | `sgs/accordion` filter: `filterChipsWrap` / `Justify` / `Padding`, `filterChipFontSize`, `filterChipShadow*`, `filterChipSelectedShadow*`, `filterChipSelectedOffsetX` / `Y`, `filterSearchBackground` / `Height` / `Padding` / `FontSize` / `Shadow*`, `filterSearchIcon*`, `filterSearchMaxWidth`, `filterSearchAlign` |
| m-chips | A3, A4, A5 | `sgsChipStartTerm` (one redirect to the term's query, so WooCommerce renders it chosen), count pill without brackets, `sgsChipAllLabel`, `sgsChipCountSize` / `FontSize`; `sgs/form-field-tiles` `tileSelectedBorderWidth`, `tileSelectedOffset`; `includes/helpers-css-safety.php::sgs_css_single_length_value` takes an opt-in for negative lengths |
| m-slider | A6 | `sgs/testimonial-slider` `slideGap` (the cause: the space between slides was the fixed spacing-30 preset, 8px on Mama's, against the draft's 20px) |
| m-look | COM-1, COM-2 | `commerceLook` label, summary row, total, divider, variant, remove-link and per-device thumbnail settings; `sgsSidebarWidth`, `sgsColumnGap`, `sgsItemCellPadding`, `sgsItemHideUnitPrice` |
| m-commerce | COM-1, COM-2, COM-3 | `sgs/gift-order` panel, tile and field looks (`giftTileMinHeight`); `sgs/commerce-note` typography, link colour and weight; free-delivery track border and its WooCommerce inner-block registration; sign-in tab underline fixed; `sgs/hero` `contentGap` |
| m-shared | Spec 32/35, COM-6, COM-4 | `plugins/sgs-blocks/scripts/check-json-duplicate-keys.py`, one shared nested-ToolsPanel title rule plus `plugins/sgs-blocks/scripts/check-nested-panel-title-rule.py`, WooCommerce buttons follow the full primary preset, `sgs/cart` on `src/shared/cart-live/` |

Round 2 (after the first content pass measured them): `commerceLook` primary-button group `sgsButton*` (typography, per-device min-height and padding; Basket 18px/62px, Pay 19px/66px; the shared preset cannot match because the draft's primary buttons all differ); the checkout's string `sgsItemThumbSize` sizes WooCommerce's image wrapper too (42px to 56px); `sgsChipMinHeight` and the All chip taking the chips' own radius and padding; the accordion search box takes the full width up to its cap when width or alignment is set.

Fixed during the merge: the extension attribute seeder collapses a union type through `_canonical_attr_type`; `tileSelectedOffset`'s classification override declares its CONTENT layer; `src/components/FlexWrapControl.js` passes `hideLabelFromVision` through (inspector-scan rule 29).

## Divergences (for Mama's ledger)
- The checkout's single "address and delivery" step: WooCommerce draws two step fieldsets, and joining them needs negative-margin CSS against its markup (Spec 35).
- Shop's "All" chip carries no total count: WooCommerce gives the chips block no total.

## QC round (2026-11-05 evening, main `12a6b9626`, framework DB 4125b35ac524, mamas-test deployed and mirror pushed 22:39 UTC; site-check 0 failed with and without a basket; axe 0 violations on Home, Product, Shop, Basket and Checkout at 375 and 1440)
Every QC item was re-measured against the draft first (`E:/sgs-tmp/qc-inv/*/results.json`, pairs beside them); about a third were misreadings and were dropped. Built:
- **Buy box pick area:** option-picker looks passed through (`pickerPill*` fill, border, weight, selected shadow and offsets, hover shift and still), card padding and gap, numbered headings with hints, round dots with the tick inside, a tile price line and columns, the label margin leak, the badge reset, and `pickHidePreview` (Bean: no preview on Product). Scope classes are hashed from non-default values only (`includes/helpers-instance-scope-hash.php`).
- **Buy box gallery:** the gallery sticker ("baked with love" on the pinned photo), `stickyOffset` driving the gallery column, add-to-cart resting and hover shadows, thumbnails as `role="group"`, and `sgs/gift-order` allowed in the extras slot.
- **Chips and filter:** WooCommerce chips' selected shadow and offsets and the "All" count; the accordion filter font family and search icon offset.
- **Commerce looks:** commerceLook thumbnail, stepper and button border, `sgsSummaryWrapsButton` and `sgsItemHideSeparators`.
- **Gift and note:** `sgs/gift-order` on product pages (Bean), its field sizing and typography, and the commerce-note link underline and min-height.
- **Accessibility:**
  - testimonial-slider `slideBleed` and equal-height cards;
  - container scroll-row keyboard access (shared `src/shared/scroll-region/`);
  - trust-bar `ariaLabel` on every tag;
  - nameless links never lend a card its link;
  - the cart trigger name is visible text first and plural-aware.
- **Gates:** `test_allowed_blocks_scrape.py` honours `SGS_FRAMEWORK_DB`.
- **Sign in controls:** built by the Eye Care session (`loginButton*`, `strings`, `loginLink*`, `hideRememberMe`).
- **Content:** set on local-mamas and pushed; Home's reviews were rebuilt as `sgs/testimonial-slider`.

Deferred (Bean, 2026-11-05): Subscribe and One-off purchase cards (subscriptions parked; the client needs the site live first).

## Open (task: the next Mama's round; check each against the draft in every state, with pairs)
1. Home reviews slider: the card titles use Karla against the draft's Young Serif; the quote mark is missing; the footer reads name then date, where the draft has name on the left and "date · Trustpilot" on the right; the draft's arrows sit in the section header, and the slider's own arrows shrink the cards (they are off now). Copy the Product cards' settings first, then build header-placed arrows if no setting exists.
2. Product summary line: the draft has "All 20 strawberry" in lower case; ours prints "Your 20: All 20 Vanilla". The default flavour is Vanilla against the draft's Strawberry (product data).
3. Add to basket hover fill: paper on hover in the draft; there is no setting.
4. Hover and selected-state pairs for every item (the content pass captured resting crops only).
