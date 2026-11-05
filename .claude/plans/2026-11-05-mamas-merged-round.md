---
doc_type: plan
title: Mama's merged round (B9 gaps 1 to 7, commerce COM-1 to COM-6, Spec 32/35 follow-ups)
status: active
---

# Mama's merged round, 2026-11-05

Status: framework built, on main `0c6503f12`, deployed to sandybrown and mamas-test at `735904aba`, both gate tiers green for sandybrown, mamas-test and indus-test; framework DB published sha 6c82dfc73037; local-mamas synced. Content step (values from the drafts on local-mamas, then the mirror push, site-check and QC) under way.

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

Fixed during the merge: the extension attribute seeder collapses a union type through `_canonical_attr_type`; `tileSelectedOffset`'s classification override declares its CONTENT layer; `src/components/FlexWrapControl.js` passes `hideLabelFromVision` through (inspector-scan rule 29).

## Divergences (for Mama's ledger)
- The checkout's single "address and delivery" step: WooCommerce draws two step fieldsets, and joining them needs negative-margin CSS against its markup (Spec 35).
- Shop's "All" chip carries no total count: WooCommerce gives the chips block no total.

## Open
1. Content step on local-mamas: every value above set from the drafts, COM-5 (line-item radius 22px, inputs 52px), the COM-6 preset decision for Mama's pay button (draft about 19px, 700, 66px). Then the content audit (0 HIGH), the editor check, `push-to-remote.sh local-mamas mamas-test` (dry run first), site-check on mamas-test with and without a basket, and QC on all Mama's surfaces at 375/768/1440 with axe.
