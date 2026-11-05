---
doc_type: plan
title: Mama's merged round (B9 gaps 1 to 7, commerce COM-1 to COM-6, Spec 32/35 follow-ups)
status: active
---

# Mama's merged round, 2026-11-05

Status: done. Round 1 on main `0c6503f12` (framework DB sha 6c82dfc73037), round 2 on main `74ee0c69b` (sha 81e543c0d538), both gated green for sandybrown, mamas-test and indus-test and deployed to mamas-test; every value set on local-mamas from the drafts (content audit 0 HIGH, editor check clean, including `sgs_form` 157) and pushed to mamas-test 2026-11-05 16:00 UTC (earlier remote DB on the server at `~/backups/push-to-remote/lightsalmon-tarsier-683012.hostingersite.com-20261105-160024.sql`); site-check on mamas-test 0 failed without a basket and with one (woocommerce 57 pass, `sites/mamas-munches-redesign/build/qa/site-check/2026-11-05T16-08-45/result.md`). QC found the next round (Open).

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
| m-shared | Spec 32/35, COM-6, COM-4 | `scripts/check-json-duplicate-keys.py`, one shared nested-ToolsPanel title rule plus `scripts/check-nested-panel-title-rule.py`, WooCommerce buttons follow the full primary preset, `sgs/cart` on `src/shared/cart-live/` |

Round 2 (after the first content pass measured them): `commerceLook` primary-button group `sgsButton*` (typography, per-device min-height and padding; Basket 18px/62px, Pay 19px/66px; the shared preset cannot match because the draft's primary buttons all differ); the checkout's string `sgsItemThumbSize` sizes WooCommerce's image wrapper too (42px to 56px); `sgsChipMinHeight` and the All chip taking the chips' own radius and padding; the accordion search box takes the full width up to its cap when width or alignment is set.

Fixed during the merge: the extension attribute seeder collapses a union type through `_canonical_attr_type`; `tileSelectedOffset`'s classification override declares its CONTENT layer; `src/components/FlexWrapControl.js` passes `hideLabelFromVision` through (inspector-scan rule 29).

## Divergences (for Mama's ledger)
- The checkout's single "address and delivery" step: WooCommerce draws two step fieldsets, and joining them needs negative-margin CSS against its markup (Spec 35).
- Shop's "All" chip carries no total count: WooCommerce gives the chips block no total.

## Open (the next Mama's round; from the QC on mamas-test 2026-11-05, evidence `E:/sgs-tmp/qc-m/results.json`; investigate and prove each cause, then propose to Bean before building)
1. Axe, check first whether each is new: Home `link-name` (serious, `#sgs-btn-27a6db3e` and 3 more), `scrollable-region-focusable` (serious, a container content band), `landmark-unique` (trust bar); Product `aria-allowed-role` (slider dot buttons); Shop `heading-order`; Basket and Checkout `aria-prohibited-attr` on WooCommerce's totals items and payment skeleton (may be WooCommerce markup or a loading state). The QC of 2026-11-05 morning reported the commerce pages axe-clean.
2. Selected-state offset shadow and shift missing: buy box priced pills and pack tiles (Home, Product), Shop and Gifts chips, Help chips (shift only). Check whether each block has the setting (option-picker has selected shadow and offsets) before calling it a gap.
3. Buy box pick looks: pill weight 500 against 700, selected text black against cocoa, unselected pill fill transparent against #fffaf0; pack tiles 98x78 against 164x87 with no total price line, 11px/500, unselected fill #fbf3dc against #fffaf0; the badge 21px against 19px with an extra 1px shadow.
4. Review cards (Product): the draft's alternating 1 degree tilt, card fill and 2px border are absent; heights 255 to 284 against 293 to 297.
5. Commerce: line-item thumbnails lack the 2px cocoa border, pink fill and 16px (checkout 12px) radius; the quantity pill 102x46 with a faint border against 110x44 with 2px; the basket button reads "Proceed to Checkout" (draft "Checkout securely"), has no 2px border and sits below the summary card at 480px (draft inside it at 428px); the free-delivery bar spans 1240px (draft 720px inside the items column: move it into WooCommerce's items column now that it registers there); checkout "Place Order" (draft "Pay £30.45") with no border; the allergen link is not underlined; gift tiles 80px against 76px; gift fields 44.8px with 16px labels against 54px and 15px; the gift note box 94px in 16px type against 114px in 24px.
6. Sign in: the submit button "Log in" 117x57, 600, pink against "Sign in →" 140x60, 17px/700, yellow.
7. Small: Contact tile radius 20px against a full pill; Help search icon 16px from the left against 20px and chips 3 to 7px wider; Shop and Gifts chip order differs from the draft and Gifts lacks the "Any" price chip; Shop's "All" chip has no total count (divergence).
