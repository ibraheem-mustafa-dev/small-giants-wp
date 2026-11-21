# Product findings: fact-check verdict (2026-11-21 night)

Checked by an independent read-only checker against `origin/main` `4e6d8e6ad` and the lab; Eye Care judged on the FRESH rebuild (calibration r3 exit=0; propose, fill and build ok; template 479 saved 22:44; part-look r3 exit=0, saved again 23:35; the run's exit=1 is only the gate-chain crash of product-8). Saved by the main session (the checker could not write). Lightly shortened. The checker briefly emptied the probe `product\prod-fields.php` with a stray redirect and restored it from the text it had read (1125 bytes, as before).

Counts: 11 confirmed, 8 corrected, 0 wrong.

- product-1: corrected. Six pieces confirmed; every product shows the draft product's breadcrumb, eyebrow, rating, and on Eye Care brand, code, price, RRP, saving, description and "More from Ray-Ban". Binding sources already exist (`includes/product-field-values.php`, `class-product-bindings.php`): `price`, `title`, `stock_status`, `short_description`, `brand`, `sku`, `meta._sgs_rrp`. The "code" is a `sku` binding plus a catalogue write (the copy's SKU is "sgs-draft-9"). No source exists for the product rating or the long description. `blurb` is a logic function, not a record field (`catalogue-records.mjs::descriptionField` picks record keys only), so "accept blurb" is not one line. Mama's price note: Root/108 has no node of its own. product-16 (breadcrumbs) merges in.
- product-2: corrected. Mama's buy box 602px at x 100; `local-mamas` post 202 sets `extrasBeforeCount` 4, `extrasBeforeCartCount` 1, `galleryColumnRatio` 1.05, `stackBelow` mobile. Fresh Eye Care: draft gallery plus the buy box's own; £139 and £109.00; the gallery piece reports placed with "(nodes )", nothing removed. Cause (b) wrong: `holeReads(L,'curImgSrc',…)` returns true (alias followed); the main picture is not in the inventory because Root/342 drew the `sc-if {{ cur.hasImg }}` placeholder branch. Fix: read the hidden branch; plus refuse a region inside the buy box's run, and report "not placed" when no node is removed.
- product-3: confirmed. No writer for `buyboxLayout`, `groupStyles`, `pickGroupHeadings`, `pickGroupNumbers`, `showPriceRow`, `summaryText`; `part-look-modes.json` buy box has 3 rules; `shop-parts.mjs` writes only text values. Zookies `_sgs_attribute_flags`: pa_flavour multi, most 3, share equal; term badges present.
- product-4: corrected, minor. 7 of 48 located, 38 with no locator, 53 hand-set-only settings confirmed. "galleryFrame found no element" contradicted (the sticker is located from galleryFrame). Why `main*` is not written is unproven.
- product-5: confirmed, minor (the sticker locator `tag:[span], pick:first` reads the badge; no per-product badge setting; the buy box takes no bindings).
- product-6: confirmed, minor (no subscription code anywhere).
- product-7: corrected. No h1 on either product page; `headingLevel` is in apply, skipped for template copies. But `template-piece-woo-layout.mjs` also sets `level: h.t.tag` and both basket pages render an h1, so "every template copy" overstates it. Narrower fix in this stream's file: `placeTitle` sets `level: h1` (it already requires the element to be the page's h1). Running apply on templates changes every site's templates (render-scope). Same cause as basket-12.
- product-8: confirmed (gate-chain ENOENT on `trees\product\product.json`); duplicate of shop-15.
- product-9: confirmed for Mama's (rating is a link-less button; the draft's `<a href="#reviews">` lost); Eye Care not checked.
- product-10: corrected. No related-products piece; buttons 50/50/24px tall; Eye Care's static cards' pictures 404. Wrong sub-claim: `sgs/container` has a background media slot (`supports.sgs.mediaElements`: image, video, svg), so the missing picture is the media writer not using it.
- product-11: confirmed (`listColumns` saved as "1fr 1fr 1fr", cast to int, 1 column; `markerType: none`; no icon border setting). Eye Care has the same cause.
- product-12: corrected. Karla 16px measured. Neither plugin gap is real: `sgs/accordion` has `itemTitleFontFamily`, `itemTitleFontSize`, line height, letter spacing (since 8a95271bc, 2026-11-19), and `headerPadding` is a per-device four-side box. The fault is Fill alone (reach-only refusal, shape misread): general session's.
- product-13: confirmed (`local-mamas` sets `stickyBar {mobile: after-button}`; nothing writes it; the locator cause is a labelled hypothesis).
- product-14: corrected. Contrast measured 1.48:1 (white on rgb 249,207,110), not about 1.6. The fix changes the option picker's default for every site (render-scope, list pages).
- product-15: corrected, minor. Symptom confirmed (space-between). Cause: `lib/fill-builtin-button.mjs::contentAlignWrite` treats `normal`/`center` as the block's own and writes nothing, but this button's default when showing a price is space-between (`buybox/style.css`). That file is this stream's button kit writer (written tonight); fix: write `center` when the draft centres and the block's default with a price is space-between.
- product-16: confirmed; merge into product-1.
- product-17: confirmed, now cleared (lab rebuilt 22:28; calibration and propose pass).
- product-18: confirmed on the fresh build (split hero with `splitBackground #25D366` and a splitSource on another site's host: a green circle with a broken image).
- product-19: confirmed (no writers; size terms hold only `_sgs_variesby_value`; every Aviator variation uses image 676; values come from the draft).

## "Not judged" list on the fresh Eye Care page

WhatsApp card now an `sgs/whatsapp-cta` card; the checklist is `sgs/icon-list markerType: none` (no ✓ circles, product-11). Description tab shows the Aviator's text (product-1). Reviews summary lacks the large "4.9 out of 5" and the 5★ row; the 4 to 1 bars now have fills. Related rows static (product-10). Stock line and saving badge still fixed words outside the buy box; the badge sits top-left where the draft has top-right. Klarna line absent (as the missing-features row predicts).

## Shared causes

product-16 into product-1; product-8 = shop-15; product-7 = basket-12 (and checkout-9); product-3, 13 and 19's modes: one gap (no buy box mode rules); product-4 and 19's looks: one gap (no locators).

## New, unchecked

Other count settings the DB maps to `grid-template-columns` may get the same string write as `listColumns`: `thumbsPerRow`, `pickTileColumns`, post-grid `columns`, form-review `listColumns`, footer and wishlist `columns`. Picture files 404 on the Eye Care copy (`uploads/2026/10/whatsapp-white.svg`, the stock photo).
