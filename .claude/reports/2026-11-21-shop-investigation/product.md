# Product page investigation (2026-11-21 night)

Summary
- Mama's (`local-mediatest-trlab`, `/product/zookies/`, template 6018 rebuilt 21:04, part-look written 21:42): far from passing. The page is one narrow column at 1440 (the right half empty), the buy box draws the plain picker instead of the draft's numbered "build your box" card (no flavours at all), and the page is a frozen copy of Zookies for every product. Part-look's writes (add button, thumbnails, dots) landed and look right; what it cannot reach is listed by `part-look.mjs --compare --site local-mamas`, which reads the same draft against the hand-finished site.
- Eye Care (`local-mediatest-trec`, `/frames/ray-ban-aviator-classic/`): not rebuilt tonight. Both rebuilds stopped at propose, and the second calibration refused because the lab worktree's plugin build is from 2026-11-20 (product-17). The page on the copy is the 18:16 template (post 479); Eye Care facts marked "18:16 build" come from it, from the 20:47 skeleton and tree, and from the fresh 21:01 inventory. It is far from passing: two galleries and two prices, a green WhatsApp circle as the hero picture, plain pills for colour and size, and every product showing the Aviator's words.
- Worst problem, both clients: the product template keeps one product's content as fixed words, so every other product shows the draft's product (product-1); next, the buy box sits in a narrow column under the title instead of owning the two columns (product-2). 19 findings.

## Findings, worst first

### product-1: Every product shows the draft product's words (only the title, and Mama's short description, change)
- Clients and widths: both, every width.
- Evidence: Mama's `/product/taster-trio/` at 1440 shows the breadcrumb "Home Shop Zookies", the eyebrow "build your own box" and "4.3 · 8 Trustpilot reviews" (`product/mm-taster-1440.json`); the built tree holds them as plain `sgs/text`/`sgs/button` words (`trees/template/single-product.json`, `cr-ref-product-5`, `-8`, `-10`). Eye Care (18:16 build) `/frames/carrera-carrera-1055-s/` shows "Ray-Ban", "RB3025 · 001/58", "4.9 · 41 reviews", "£139", "RRP £171", "You save £32", the Aviator's description and specs, "Based on 41 reviews" and "More from Ray-Ban", while that product is £109 with `_sgs_rrp` 139 and brand Carrera (`product/ec-carrera-1440.json`, `product/prod-fields.php`). The draft feeds each of these from the product record: Eye Care `{{ cur.brand }}` (Root/339, 347, 359), `{{ cur.code }}` (361), `{{ cur.ratingLabel }} · {{ cur.reviewsLabel }}` (364), `{{ cur.priceLabel }}` (366), `{{ cur.rrp }}` (369), `You save {{ cur.saveAmount }}` (370), `{{ stockLabel }}` (371), `{{ cur.blurb }}` (421), specs (423, 424), `{{ sameBrandTitle }}` (537), `See all {{ cur.brand }}` (538); Mama's `{{ p.name }}` breadcrumb (Root/14), `{{ p.badge }}` (19), `{{ eyebrow }}` (26).
- Cause: proved. `data/template-pieces.json` `single-product` has six pieces only (buy box, gift, title, price, description, gallery); nothing binds the breadcrumb, brand, code, rating, RRP, saving, stock line, specs, related heading or link. The price piece binds only an element whose own text is a single hole read straight from a record field (`lib/template-piece-product-field.mjs` header), and both drafts print a formatted label (`cur.priceLabel`, `addLabel`), so it notes "stays as the draft draws it". The description piece finds no description field on Eye Care because the draft's field is `blurb` (proposal note "the draft's product records have no description field"), and the catalogue on the copy saved no description, code or rating either (Carrera and Aviator: empty description and short description; only `_sgs_rrp`).
- Layer and owner: route piece and catalogue (this stream).
- Fix: in `data/template-pieces.json` `single-product`, add pieces for: the breadcrumb (`sgs/breadcrumbs` with `productPageCrumbs`, as both hand-built sites use); price, RRP and saving (the buy box's own price row: `showPriceRow`, `rrpMetaKey` `_sgs_rrp`, `rrpShowPrice`, `rrpSavingPrefix`, `rrpSavingFormat`, as eye-care-test uses); the stock line (`showStockStatus`, `stockInStockLabel`, `stockLinePosition`, `stockLineHairline`); the brand (a `sgs-product/field` binding to the brand term); the description (`core/post-content` inside the description tab, as eye-care-test does) with the catalogue writing `blurb` as the product description (`lib/catalogue-records.mjs::descriptionField` to accept it); the related products (product-17). A hole the product has no field for (Mama's `eyebrow`, Eye Care's `code` and rating) is a catalogue field to add or a missing-features row, never fixed words.
- Size: L (several pieces plus catalogue fields).
- Depends on: nothing.
- Verify by: open a second product on each copy (Taster Trio, Carrera 1055/S) and compare every product-fed text with that product's own record.
- Same cause elsewhere: the shop card's per-product texts are the product card's own; the order confirmation is bound by its own piece. Any future template copy built `from: whole`.

### product-2: The two columns are lost; the buy box sits in a narrow column under the title (and on Eye Care beside a second gallery and price)
- Clients and widths: both; 1440 and 768 (two columns in the draft), 375 (order).
- Evidence: Mama's at 1440: `.sgs-buybox` is 602px wide at x 100 with its own gallery and controls side by side inside it, the right 600px of the page empty (`shots/product/mm-r0-pair-1440.part0.png`; `product/mm-zookies-1440.json`). The tree: `sgs/hero` (`gridTemplateColumns.desktop: minmax(0,1.05fr) minmax(0,1fr)`) holds ONE `sgs/container` with the eyebrow, title, rating, description, buy box, gift, trust strip and accordion; the draft's gallery column (Root/16) was removed by the gallery piece, so the second track is empty. At 375 the title block comes before the gallery (draft: gallery first) (`mm-r0-pair-375.part0.png`). Eye Care (20:47 tree and 18:16 build): the hero keeps the draft's static gallery (Root/341: "RAY-BAN photography to come", "Save £32 off RRP", the four thumbnail buttons) AND the buy box draws its own empty white gallery and its own "£139.00" beside the draft's "£139" (`ec-r0-pair-1440.part0.png`).
- Cause: proved. (a) `lib/template-piece-buybox.mjs::place` replaces only the controls' run (Root/32, 63, 93, 102 on Mama's) and leaves the title block, rating and description as siblings above it in the draft's info column; the buy box's own two-column layout (gallery beside controls) then renders inside that column. The hand-finished `local-mamas` template instead puts the eyebrow, title, rating and description INSIDE `sgs/buybox` as inner blocks with `extrasBeforeCount: 4` and the gift tick with `extrasBeforeCartCount: 1`, plus `galleryColumnRatio 1.05`, `galleryColumnGap {64,36,24}`, `stackBelow mobile`, so the gallery is the left column at 1440 and comes first at 375 (`product/mamas-live-buybox.txt`); eye-care-test does the same (`sgs/buybox` with `sgs/media`, `sgs/heading`, `sgs/text`, `sgs/button`, `sgs/whatsapp-cta`, `sgs/icon-list` inner blocks and `extrasBeforeCount`/`extrasBeforeCartCount`, `galleryColumnRatio`, `galleryColumnGap`, `stackBelow`: `product/eyecare-test-single-product-names.txt`, names only). (b) Eye Care only: the gallery piece (`lib/template-piece-product-field.mjs::placeGallery`) found the product's pictures on the colour tiles grid (Root/377: `{{ colourTiles }}` buttons whose backgrounds read the record's image) and not on the main picture (Root/342's child: `background-image:url({{ curImgSrc }})`, where `curImgSrc: cur.img` is a value the logic returns, not a direct record read); the region Root/377 lies inside the buy box's run, so `nodesWithin` found no node, nothing was removed, and the piece still reported itself placed ("in place of the draft's gallery Root/377#0 (nodes )"). Had the main picture matched, `runOf` would have climbed to Root/341.
- Layer and owner: route piece (this stream).
- Fix: `lib/template-piece-buybox.mjs::place`: take the whole product information column (the draft element holding the h1 and the controls' run, the h1's column) as the buy box: the nodes before the controls become inner blocks counted by `extrasBeforeCount`, a node between the pickers and the add button (the gift tick) by `extrasBeforeCartCount`, the rest after; the hero (or whatever grid held gallery and info) is replaced by the buy box, with `galleryColumnRatio` from the draft's two track widths, `galleryColumnGap` per width and `stackBelow` from the width the columns stack at. Drop the h1 refusal for this case (the h1 becomes an inner block, bound by the title piece). `placeGallery`: follow a logic-returned alias to its record read (`holeReads` on `curImgSrc` -> `cur.img`), refuse a region inside the buy box's run, and report "not placed" when it removes no node.
- Size: M.
- Depends on: nothing; product-1's pieces then sit inside the buy box.
- Verify by: 1440 pair shows gallery left, info right on both; 375 shows gallery first; Eye Care has one gallery and one price.
- Same cause elsewhere: none outside the product page.

### product-3: Mama's buy box draws the plain picker, not the draft's numbered "build your box" card (no flavours, value ladder shown, swatch squares, wrong headings)
- Clients and widths: Mama's, every width.
- Evidence: clone at 1440 shows a price "£21.50", the value-ladder table (8 £1.19 / 20 £1.08 / 40 £0.95), labels "Pack size", "Base", "Chip" with colour squares in the pills, and no Flavours group; the draft shows a pink card with "1 · HOW MANY" tiles (badges "Most popular", "Best value"), "2 · BASE", "3 · CHIPS", "4 · FLAVOURS Up to 3, split evenly" with 11 flavour pills and "All 20 strawberry" (`mm-r0-pair-1440.part0.png`). Saved: `sgs/buybox {"className":"cr-ref-product-12"}`. Hand-finished `local-mamas` post 202: `buyboxLayout: configurator`, `groupStyles {pa_pack-size: tile, pa_base/pa_chip/pa_flavour: outlined}`, `pickGroupNumbers: true`, `pickGroupHeadings` (How many, Base, Chips, Flavours with hint "{picked} of {max} picked, split evenly"), `summaryText "Your {pack} box: {split}"`, `showLadder: false`, `showPriceRow: false`, `pickHidePreview: true`, `pickTileColumns 3`, `pickTilePriceLine`, plus the box and pill looks (product-4). The product's own data already supports it on the copy: `_sgs_attribute_flags` pa_flavour multi, most 3, share equal; `_sgs_term_badge` "Most popular" (20), "Best value" (40) (`product/terms.php`).
- Cause: proved. No route code writes any of these settings (`grep buyboxLayout|groupStyles|pickGroupHeadings|pickGroupNumbers|showLadder|showPriceRow|stickyBar|extrasBeforeCount` over `scripts/computed-route/lib`, `*.mjs` and `data/`: no writer). `data/part-look-modes.json` `sgs/buybox` has three rules only (addToCartLabel, addToCartShowPrice, addToCartShowIcon). `lib/shop-parts.mjs` gives a setting-homed part a `write` only for a text value, so `buybox-option-picker` and `buybox-sticky-bar` carry `write: null` on both clients. The record then files the draft's group headings ("1 · How many" ... "4 · Flavours"), the "Up to 3, split evenly" hint and `{{ split }}` as `unmatched:*` missing features although `pickGroupHeadings`/`pickGroupNumbers`/`summaryText` hold them.
- Layer and owner: part-look modes and shop parts vocabulary (this stream).
- Fix: add `sgs/buybox` mode rules to `data/part-look-modes.json` (and the evidence they need to `lib/part-look-modes.mjs`): `buyboxLayout: configurator` when the product being read has a multi-pick group (`_sgs_attribute_flags` `multi`) or the draft draws a numbered group list; `pickGroupNumbers` from a leading "N ·" in the group labels; `pickGroupHeadings` per attribute from the label words after the number, and the hint from the hint text with its numbers replaced by `{picked}`/`{max}`; `groupStyles` per attribute from the group's control shape (tile for a priced grid, outlined for pills); `showLadder: false` when the draft draws no ladder table; `showPriceRow: false` when the draft draws no price row above the pickers; `summaryText` from the `{{ split }}` line's template. Map the record's `unmatched:buybox:N · <words>` and hint rows to those settings in `data/shop-part-vocab.json` so they stop being missing features.
- Size: M.
- Depends on: product-2 (the extras count shares the same buy box).
- Verify by: Mama's 1440 and 375 pairs show the four numbered groups, the flavour pills with "up to 3", no ladder, no price row; adding 3 flavours to the basket gives a line with the split.
- Same cause elsewhere: Mama's home page buy box (`local-mamas` page 154 uses the same configurator settings) when the home surface is cloned.

### product-4: The buy box's own looks the draft draws are not read: the pink picker card, the tile and pill looks, the main photo frame, the selected thumbnail
- Clients and widths: both, every width.
- Evidence: `part-look.mjs --surface product --compare --site local-mamas` (`product/pl/mamas-vs-local-mamas/report.md`): 7 of 48 parts located; "no locator for the part" for picker-box (pink card: background, border, radius, padding, gap), pick-tile, pick-option, pick-pill-look, pick-badge, pick-priced-pill, pick-summary, pick-tile-number/-price/-each, pick-tile-columns, and no reading of the main photo frame (`mainRadius`, `mainBorder*`, `mainBoxShadow 8px 8px`, `mainBackground` are set on `local-mamas` and absent from the values to write); 53 settings the hand-finished buy box sets that the route cannot reach. Eye Care (`product/pl/ec-vs-trec/report.md`): the same 38 parts have no locator, including picker-option and picker-value (the colour and size tiles), price-row, rrp-pill, rrp-price, stock, stock-in-stock and savingBadge.
- Cause: proved (the report lists each part as "no locator"). `data/part-locators.json` `groups.buybox.parts` locates only gallery-thumb, thumbs, main-photo(-frame) (sameAs galleryFrame, which found no element on Mama's draft), gallery-sticker, add-to-cart(-icon), flow-opener(-note), sticky-bar, picker-label-text, pick-dot and pick-heading.
- Layer and owner: part-look (this stream).
- Fix: add locators in `data/part-locators.json` for picker-box (the element holding every located pick group), pick-tile / pick-option / picker-option (each group's buttons, selected and not), pick-badge (a short-word span inside a tile), pick-summary (the `{{ split }}` line), price-row, rrp-pill, rrp-price, stock and stock-in-stock (Eye Care's shop-part hints `buybox-saving:hint` and `buybox-stock:hint` already locate them: Root/369, 370, 371), savingBadge (the gallery's "Save £32 off RRP"); and make main-photo-frame find the gallery's picture box when `galleryFrame` resolves nothing.
- Size: M.
- Depends on: product-3 for the configurator parts to render at all.
- Verify by: `part-look.mjs --compare --site local-mamas` shows the 53 hand-set-only rows reduced to the instance conflicts and true gaps; the pair at 1440 shows the pink card and framed photo.
- Same cause elsewhere: the home page buy box (Mama's).

### product-5: The gallery sticker setting reads the wrong element ("Build your own" badge instead of "baked with love"), and the per-product badge has no home
- Clients and widths: Mama's, every width.
- Evidence: compare report "Differs": `galleryStickerFontSize` route 13 vs saved 22, `galleryStickerFontFamily` body vs caveat, `galleryStickerPadding` 5/12 vs 6/20/6/12. The route's values (Karla 13px bold, yellow, pill radius) are the "Build your own" badge (Root/19, `{{ p.badge }}`, a span); the sticker the hand-finished site holds in `galleryStickerText` is "baked with love" (Root/20, a div, Caveat 22px, pink, rotated -4deg, tag shape). Neither shows on the clone (`mm-r0-pair-1440.part0.png`).
- Cause: proved. `data/part-locators.json` `gallery-sticker`: `match.tag: ["span"]`, `pick: first`; Root/20 is a div, so the first span, the badge, is taken. Nothing writes `galleryStickerText`, rotation, offsets or shape (report: "a look the route does not read"). The per-product badge (`p.badge`, the product's `_sgs_card_badge` "Build your own") has no `sgs/buybox` setting (the hand-finished site draws it as a static `sgs/decorative-image` with `sgs/text`, the same words on every product).
- Layer and owner: part-look (this stream) for the locator and text; block setting gap (plugin round: `sgs/buybox`, gallery, a "product badge" overlay reading `_sgs_card_badge` with its own position and look) for the badge.
- Fix: locator: a gallery overlay element whose words are fixed text (no hole) is the sticker, any tag; a hole-fed overlay is the product badge. Write `galleryStickerText` from its words and `galleryStickerRotation` from its transform. Plugin: `galleryBadgeSource: card-badge` plus position and look settings.
- Size: S (locator) + M (plugin).
- Depends on: nothing.
- Verify by: compare report shows `galleryStickerFontFamily` caveat; the pair shows both overlays.
- Same cause elsewhere: Eye Care's "Save £32 off RRP" is a saving badge (`gallerySavingBadge`, format "Save {amount} off RRP" already the block's default), not a sticker; part-look reports gallery-sticker unpaired there, and nothing writes `gallerySavingBadge: true`.

### product-6: Mama's draft's "Subscribe & save 10%" and "One-off box" choice has no block anywhere
- Clients and widths: Mama's, every width.
- Evidence: draft Root/64 and Root/75 (struck price `{{ onceTxt }}` beside the subscribe price); no SGS code draws a subscription (`grep -ri subscri` over plugin PHP: only comments about third-party rows); the hand-finished `local-mamas` single-product template has no "Subscribe" either.
- Cause: proved: the commerce feature does not exist; the live shop dropped it too.
- Layer and owner: block setting gap, larger than a setting (plugin round: a subscriptions integration, `sgs/buybox` purchase-type choice). Bean decides whether it is wanted; until then the proposal's missing-features row is the correct outcome.
- Fix: Bean's call: either accept the omission (as on the live shop) and have the draft instructions stop drawing it, or scope a subscriptions plugin integration with a buy box "purchase type" group.
- Size: L.
- Depends on: Bean.
- Verify by: n/a.
- Same cause elsewhere: the header's "Subscribe & save" menu item on the draft.

### product-7: The product title is not the page's h1; no route-built template gets heading levels or any of the apply stage's rules
- Clients and widths: both, every width.
- Evidence: Mama's product page has no `<h1>`; the bound title renders `<h2 class="wp-block-sgs-heading ... cr-ref-product-9">` (draft: `<h1>` Root/27). Eye Care (18:16 build) also has no h1 (`ec-carrera-1440.json` `h1: []`). The skeleton node has no `level`.
- Cause: proved. `lib/apply-chrome-heading.mjs::headingLevel` (in `lib/apply-family-chrome.mjs`) is the only writer of `level`, and it runs in the apply stage; `site-run.mjs` skips apply for a template copy ("skip product apply 0s - a template copy has no post of its own", log). Every other apply rule (logo, hover, icons, ground, item-card hover, arrow hover, state) is skipped on templates too.
- Layer and owner: route rule (general: `site-run.mjs` stage plan) with this stream's templates as the victims.
- Fix: run the apply families on a template copy's tree before build (or write `level` from the skeleton's own tag at propose, which knows the element is an h1), so `headingLevel` and the other chrome rules reach templates.
- Size: M.
- Depends on: nothing.
- Verify by: `curl /product/zookies/ | grep -c '<h1'` is 1 on both copies; the shop, cart and checkout templates gain their h1 too.
- Same cause elsewhere: every template copy (shop, cart, checkout, account, order confirmation, 404, search) on both clients.

### product-8: The gate chain crashes on every whole-template copy (product, shop), so those surfaces are never gated and the run reports failure
- Clients and widths: both.
- Evidence: `mamas-munches-redesign-product.log`: "FAIL product gate-chain ... ENOENT ... trees\product\product.json"; the same on Eye Care's product and shop (`eye-care-ward-end-shop.log`) and Mama's shop. `surfaces.json` names `tree: trees/product/product.json` (and `trees/shop/shop.json`) for `copy.from: whole`; the copy is written at `trees/template/single-product.json` ("copy single-product: ...") and `trees/product/` does not exist.
- Cause: proved: `gate-chain.mjs::buildContext` reads `path.join(buildDir, s.tree)` with no template-copy case; template copies with `copy.from: fill` (cart, checkout) name `trees/template/<slug>.json` and pass.
- Layer and owner: route (general: `gate-chain.mjs` / `site-run.mjs`), affecting this stream's surfaces.
- Fix: `gate-chain.mjs::buildContext` reads `copyFile(buildDir, s.target.template)` when `s.copy` is set (or site-run passes the copy's path), and `surfaces.json` for whole copies names the template tree.
- Size: S.
- Depends on: nothing.
- Verify by: the product and shop rebuild logs show `ok product gate-chain` and exit 0.
- Same cause elsewhere: shop on both clients.

### product-9: The rating line is a dead button with its stars moved after the words
- Clients and widths: both (Mama's proved; Eye Care's rating is a span, so check on r2), every width.
- Evidence: draft `<a href="#reviews"><span>★★★★★</span> 4.3 · 8 Trustpilot reviews</a>` (Root/28); clone `<button type="button" class="sgs-button ... cr-ref-product-10">` labelled "4.3 · 8 Trustpilot reviews ★★★★★" with no `url` (`product/mm-zookies.html`). The reviews section carries `anchor: reviews`, so the link would work.
- Cause: proved up to the writer. Propose classed Root/28 by `rule pillButton` and absorbed the ★★★★★ span (Root/29) as "its glyph is its own icon"; the skeleton node is `{"label":"4.3 · 8 Trustpilot reviews ★★★★★"}` with no `url` and no icon, although the draft's `href` is `#reviews` and `lib/draft-link.mjs::resolveDraftLink` resolves `#reviews` to `{kind:'anchor', value:'#reviews'}`. Which line of the pillButton write appends the glyph to the label and skips the link: hypothesis, to prove by running the pillButton writer on Root/28 alone.
- Layer and owner: route rule (general: skeleton/Fill button content).
- Fix: keep a fragment `href` as the button's `url` when the target id exists on the page; keep inline children in document order.
- Size: S.
- Depends on: nothing.
- Verify by: clicking the rating scrolls to the reviews; the stars come first.
- Same cause elsewhere: any draft link to an in-page anchor.

### product-10: Related products are static imitations: no photos, dead "Add to basket" buttons, a fixed list
- Clients and widths: both (Mama's proved, Eye Care 18:16 build the same: "More from Ray-Ban", "Similar shapes" as static containers), every width.
- Evidence: Mama's 1440: three cards with an empty beige picture box (`mm-r0-pair-1440.part1.png`); the box is `sgs/container` with `sgsBlockLink` and Custom CSS for background position and size only (no picture: `sgs/container` has no image setting; the Fill report says the draft's `background-image` url "is a picture ... the media writer takes it", and nothing took it); each "Add to basket" is `<button type="button">` with no action (`mm-zookies.html`); the third card's button is 24px tall against 50px for the others. Hand-finished: `local-mamas` uses `sgs/product-card` with `productId` in a `scrollSideways` container; eye-care-test uses `woocommerce/product-collection` with `sgsSameTermAs` and `sgs/product-card` (names only).
- Cause: proved: `data/template-pieces.json` `single-product` has no related-products piece, so the draft's cards become generic containers.
- Layer and owner: route piece (this stream).
- Fix: a `related` piece: the draft's list of product cards fed from other product records becomes `woocommerce/product-collection` (same brand or category: `sgsSameTermAs` from the draft's filter, e.g. `sameBrandTitle`) with `sgs/product-card`, reusing the shop listing's card looks (part-look `shop` surface); a fixed list in the draft (Mama's three named products) becomes `sgs/product-card` with `productId` each.
- Size: M.
- Depends on: the shop listing's card look (Task 7 shop loop).
- Verify by: the cards show their photos and prices, "Add to basket" adds the product, and Carrera's page shows "More from Carrera".
- Same cause elsewhere: any draft section listing other products (home page "bestsellers").

### product-11: The trust strip loses its round icons and stacks in one column
- Clients and widths: Mama's, 1440 and 768 (three columns in the draft), every width for the icons.
- Evidence: draft: three items in a 3-column grid, each with a 36px round pink icon holding ✦, → or £ (Root/110, 111). Clone: `sgs/icon-list` `markerType: none`, items with text only, `listColumns {"tablet":"1fr","desktop":"1fr 1fr 1fr"}`; computed `grid-template-columns: 602px` at 1440 (`probe-sel` on `.cr-ref-product-14`).
- Cause: proved. `listColumns` takes a whole number per tier (block.json description; `render.php` casts it to int, so "1fr 1fr 1fr" becomes 1); the glyph spans were absorbed as "the list item's marker" (proposal rows Root/111, 113) but the items carry no `iconSource: emoji` / `iconName` and `markerType` is `none`.
- Layer and owner: route rule (general: Fill's `listColumns` write and the icon-list marker write). The icon circle's 2px border has no setting (block setting gap, plugin round: `sgs/icon-list`, icon box border width and colour).
- Fix: Fill writes `listColumns` as the track count; the absorbed glyph is written as `items[i].iconSource: emoji`, `iconName: <glyph>` with `markerType: icon`, `iconBoxSize` 36px, `iconBackgroundColour`; plugin adds `iconBoxBorderWidth`/`iconBoxBorderColour`.
- Size: S (route) + S (plugin).
- Depends on: nothing.
- Verify by: at 1440 three columns with round icons.
- Same cause elsewhere: any icon list whose draft uses glyph text markers or a grid track list.

### product-12: Accordion headers use the body font at 16px instead of the draft's serif at 18px
- Clients and widths: Mama's, every width.
- Evidence: draft Root/119: Young Serif 18px weight 400, min-height 60px, padding 14px 18px. Clone: Karla 16px, the open item's header 700 (`probe-sel` on `.sgs-accordion-item__header`). Fill report `qa/fill/product/2026-11-21T20-56-42/fill-report.md` rows for `cr-ref-product-15`: "reach-only: fontFamily is calibrated on another element of sgs/accordion and only reaches ... header"; "shape: headerPadding holds one value for every side". `local-mamas` sets `fontFamily`, `fontSize`, `headerFontWeight`, `headerFontWeightOpen` on its accordion.
- Cause: proved (Fill report).
- Layer and owner: route rule (general: Fill's reach-only rule for a block-level font that the header inherits) and block setting gap (plugin round: `sgs/accordion`, header, `headerPadding` per side).
- Fix: allow a reach-only write when the only element the setting reaches in the draft is that part (the header), or give `sgs/accordion` header font settings; `headerFontWeightOpen` written equal to `headerFontWeight` when the draft does not change weight on open.
- Size: S.
- Depends on: nothing.
- Verify by: computed header font Young Serif 18px 400 in both states.
- Same cause elsewhere: every accordion the route builds (FAQ pages).

### product-13: The sticky "Add to basket" bar at 375 is missing
- Clients and widths: Mama's, 375 (and 768 per draft).
- Evidence: draft at 375 shows the fixed bar "£21.50 / 20 Zookies / Add to basket" (`mm-r0-pair-375.part0.png`); clone none; `local-mamas` sets `stickyBar {mobile: after-button, tablet: off, desktop: off}` and `stickyBarBackground/Text/BorderColour`. The record homes `buybox-sticky-bar` on `stickyBar`, `stickyBarBackground` with `write: null`; part-look: "sticky-bar: the part has a locator and the draft has no element for it".
- Cause: proved that nothing decides `stickyBar` (product-3's cause: no mode rule; the record writes only text). Why the sticky-bar locator finds no element: hypothesis, the draft's bar (Product/143-145, a separate component file) is read with `from: page` among the page's own elements only (prove by running `lib/part-look-locate.mjs` on the 375 read and listing the candidates).
- Layer and owner: part-look modes and locators (this stream).
- Fix: a mode rule: `stickyBar.<tier> = after-button` at each width where the draft draws a fixed bar holding the add control (the buy box piece already finds it: "N located element(s) sit in a fixed bar"); fix the locator to read the bar's component elements.
- Size: S.
- Depends on: product-3 (same rules file).
- Verify by: at 375 the bar appears after scrolling past Add to basket.
- Same cause elsewhere: none.

### product-14: Selected options show white text on yellow (fails contrast)
- Clients and widths: Mama's, every width (before part-look; part-look writes no selected text colour for the standard picker).
- Evidence: selected pills "20 Most popular", "Classic oat", "Milk choc": `color rgb(255,255,255)` on `rgb(249,207,110)`, contrast about 1.6:1 (probe-sel at 375).
- Cause: proved. `src/blocks/option-picker/style.css` (outlined selected rule) fills the selected pill with `--sgs-op-sel-bg` falling back to the site's primary and sets white text, with a comment that a site with a light primary "MUST override --sgs-op-sel-text"; Mama's primary is the yellow and the copy's snapshot does not override it, and the route writes no `pickerPillSelectedTextColour` (picker-option has no locator, product-4). The configurator badge already picks a readable text colour (`configurator.php::sgs_buybox_configurator_badge_css` with `sgs_colour_hex_for_contrast`).
- Layer and owner: plugin bug (option picker selected text has no contrast pick), plus part-look (product-4).
- Fix: the option picker prints its selected text colour from a contrast pick against the resolved fill when no setting or token sets it (as the badge does); part-look writes `pickerPillSelectedTextColour` from the draft.
- Size: S.
- Depends on: nothing.
- Verify by: contrast of the selected pill at least 4.5:1.
- Same cause elsewhere: every site whose primary colour is light (shop cards' pickers).

### product-15: Mama's add button splits "Add to basket" and the price to opposite ends; the draft centres one line "Add to basket · £21.50"
- Clients and widths: Mama's, every width (after part-look).
- Evidence: `shots/product/mm-r1-pair-375.part0.png`, `mm-r1-pair-1440.part0.png`; saved `addToCartLabel "Add to basket"`, `addToCartShowPrice true`, no `addToCartContentAlign` (`product/trlab-buybox-after-pl.txt`). Part-look report "No setting: add-to-cart text-align center" (`sites/mamas-munches-redesign/build/qa/part-look/20261121T214158Z/report.md`). Eye Care's draft does space its label and price apart, and part-look wrote `addToCartContentAlign space-between` there (`pl/ec-vs-trec/report.md`).
- Cause: proved: the content-align rule reads `justify-content`, which Mama's draft button leaves at normal while it centres its single text with `text-align: center`; the block's label-plus-price layout then falls back to its spaced default, and the "·" joiner of the draft's `{{ addLabel }}` has no setting.
- Layer and owner: part-look (this stream).
- Fix: in the content-align read, a button whose words are one text run centred by `text-align` writes `addToCartContentAlign: center`; the joiner "·" is a missing feature unless the block gains a price separator setting (plugin round: `sgs/buybox`, add-to-cart, `addToCartPriceSeparator`).
- Size: S.
- Depends on: nothing.
- Verify by: the 375 pair shows the label and price centred together.
- Same cause elsewhere: the sticky bar's button.

### product-16: Breadcrumbs lose their separators and link underlines
- Clients and widths: Mama's (Eye Care's breadcrumb on the 18:16 build also lost its "/"), every width.
- Evidence: draft "Home / Shop / Zookies" with underlined links; clone "Home Shop Zookies" (`cr-ref-product-2` nav with two `sgs/button` and one `sgs/text`; the "/" spans absent). Both hand-built sites use `sgs/breadcrumbs` (separator, link colour, `productPageCrumbs`).
- Cause: proved that the route builds a generic nav (no breadcrumbs rule); folded into product-1's breadcrumb piece.
- Layer and owner: route piece (this stream) via product-1.
- Fix: product-1's breadcrumb piece writes `separator`, `itemGap`, `linkColour`, `currentColour`, underline from the draft.
- Size: S (inside product-1).
- Depends on: product-1.
- Verify by: the pair shows "Home / Shop / Taster Trio" on Taster Trio.
- Same cause elsewhere: shop page breadcrumbs.

### product-17: Eye Care's fresh product page cannot be built: calibration refuses because the lab worktree's plugin build is a day old
- Clients and widths: Eye Care.
- Evidence: `eye-care-ward-end-product.log` and `-product-r2.log`: "FAIL product propose ... 2 blocks in its tree have no default paint for local-mediatest-trec (sgs/accordion, sgs/accordion-item)"; `eye-care-ward-end-cal-accordion.log`: "[FAIL] sgs/accordion: the deployed build/blocks/accordion/ (d84de3ce...) differs from the local build (84544e4f...). Deploy or rebuild first; nothing was written. exit=3". The lab's `E:\sgs-tmp\wt-tr-lab\plugins\sgs-blocks\build\blocks\accordion\block.json` is dated 2026-11-20 06:53; the copy's is 2026-11-21 20:51 (today's main, synced at 20:54).
- Cause: proved: the lab worktree was moved to today's main without `npm run build`, so calibrate compares the copy's fresh build with a stale local one and refuses; propose then stops correctly. So the page on the copy is still the 18:16 template (post 479) and Eye Care's facts in this file come from it and from the 20:47 skeleton.
- Layer and owner: site data / lab setup (main session).
- Fix: `npm run build` in `E:\sgs-tmp\wt-tr-lab\plugins\sgs-blocks` (PowerShell), then `calibrate.mjs --site local-mediatest-trec --client eye-care-ward-end --blocks sgs/accordion,sgs/accordion-item`, then the product rebuild and part-look.
- Size: S.
- Depends on: nothing.
- Verify by: the calibration log ends `exit=0` and `-product-r2` passes propose.
- Same cause elsewhere: any calibration in the lab for a block changed since 2026-11-20 (Mama's accordion was already measured on its copy, so Mama's passed).

### product-18: Eye Care's hero puts the WhatsApp icon in a green circle as the hero's "split" picture
- Clients and widths: Eye Care (18:16 build and the 20:47 tree), every width.
- Evidence: the template tree's `sgs/hero` has `variant: split`, `splitSource.desktop` = attachment 71 `whatsapp-white.svg` (150x150), `splitBackground #25D366`, `splitRadius 50%`, `splitHeight 38px` and Custom CSS `& .sgs-hero__media > .sgs-media-el { width: 38px }`; it shows as a green circle beside the gallery at 1440 (`shots/product/ec-r0-pair-1440.part0.png`, at x 1535). The draft's only WhatsApp picture there is the 20px icon inside the "Need advice?" card. The written URL is the attachment's `guid` host `mintcream-lyrebird-224487.hostingersite.com`, another site, not the copy's `http://localhost:8125`.
- Cause: proved that the hero split rule took the advice card's icon as the hero's picture (tree attributes); which rule picks the media for a split hero with no large picture: hypothesis, the split-hero media pick in the skeleton's hero rule takes the first picture in the region when the real gallery is a CSS background (Root/342's `background-image`); prove by running the hero rule on Root/340. The foreign host: hypothesis, the media write uses the attachment's `guid` instead of `wp_get_attachment_url()`.
- Layer and owner: route rule (general: skeleton hero split); goes away for this page when product-2 makes the buy box own the region.
- Fix: the split-hero media pick must refuse a picture smaller than the column it would fill or one inside a link or card; write attachment URLs from `wp_get_attachment_url()`.
- Size: S.
- Depends on: product-2 removes the hero here.
- Verify by: no green circle; the hero (if any) has no WhatsApp media.
- Same cause elsewhere: any region holding a background-image gallery and a small icon.

### product-19: Eye Care's buy box draws plain pills where the draft draws colour tiles, the chosen colour, size measurements, "Which size am I?", the stock line, the RRP pill and the saving badge
- Clients and widths: Eye Care, every width.
- Evidence: 18:16 build at 1440: Size and Colour as small outlined pills (Gold selected filled black), no colour name at the right of "COLOUR", no "55□14 130" under S/M/L, no "Which size am I?", the price, RRP, saving and stock line drawn by the draft's own fixed words outside the buy box (product-1) (`ec-r0-pair-1440.part0.png`). eye-care-test's buy box (names only, `product/eyecare-test-single-product-names.txt`) uses `pickerSwatchStyle`, `pickerStyle`, `pickerShowSelectedValue`, `pickerSubLabelMetaKey`, `pickerAlwaysShowAxes`, `pickerBandAxis`, `pickerBandScale`, `pickerLabelLinkAxis/Text/Url` (+ colour, underline, padding), `rrpMetaKey`, `rrpShowPrice`, `rrpSavingPrefix`, `rrpPill*`, `rrpChip*`, `showStockStatus`, `stockInStockLabel`, `stockInStockColour`, `stockLinePosition`, `stockLineHairline(+Margin)`, `stock*` font, `price*` font, `priceRowGap`, `thumbsPerRow`, `thumbGap`, `thumbStripOffset`, `galleryColumnRatio/Gap`, `stackBelow`, `extrasBeforeCount`, `extrasBeforeCartCount`, `main*`/`thumb*` frame settings, `addToCart*`, `expressLoad`. None of the mode or content ones has a writer in the route (`grep` over `scripts/computed-route` for `pickerSubLabelMetaKey`, `pickerShowSelectedValue`, `pickerAlwaysShowAxes`, `pickerBandAxis`, `pickerLabelLink`, `showStockStatus`, `rrpMetaKey`, `gallerySavingBadge`: no file); the look ones have no locator (product-4: picker-option, picker-value, price-row, rrp-pill, rrp-price, stock, savingBadge). Values come from the draft: "COLOUR" label with `{{ cur.colourName }}` at its right (Root/374-376) = `pickerShowSelectedValue`; size `{{ s.mm }}` (Root/391) = `pickerSubLabelMetaKey`; "Which size am I?" (shop part `buybox-size-guide-link:hint`) = `pickerLabelLinkAxis pa_size`, `pickerLabelLinkText`; stock dot 8px with a 9px gap and `{{ stockLabel }}` (Root/371-372) = `showStockStatus`, `stockInStockLabel "In stock — dispatched next working day"`; "Save £32 off RRP" top 18px right 18px on the gallery (Root/351) = `gallerySavingBadge`, `gallerySavingBadgePosition top-right`, format "Save {amount} off RRP"; RRP strike and "You save" pill (Root/369-370) = `rrpMetaKey _sgs_rrp`, `rrpShowPrice`, `rrpSavingPrefix "You save"`.
- Cause: proved (no writer, no locator). Data gaps on the copy: the size terms carry no measurement meta and no product carries per-size measurements (`product/term-meta.php`: pa_size terms hold only `_sgs_variesby_value`), so `pickerSubLabelMetaKey` has nothing to read; every variation of Aviator uses the same photo-to-come image 676, so a photo colour tile (`pickerVariationSwatch`) would repeat one picture (the draft tints one stand-in photo per colour, and says "Colourway shots are stand-ins until the real ones land").
- Layer and owner: part-look modes and locators (this stream); catalogue (this stream) for the size measurements (`s.mm` per product per size into variation or term meta).
- Fix: mode rules in `data/part-look-modes.json` for each setting above, decided from the draft evidence listed; locators per product-4; the catalogue writes each size's measurement where `pickerSubLabelMetaKey` reads it; colour tiles use `pickerSwatchStyle: tile` with the term's `_sgs_swatch_color` until real colourway photos exist.
- Size: M.
- Depends on: product-2, product-4.
- Verify by: Eye Care pairs at 375 and 1440 show colour tiles with the chosen colour named, S/M/L with measurements, "Which size am I?", one stock line with an 8px dot and 9px gap, the RRP strike and saving pill, and the saving badge in the gallery's top right.
- Same cause elsewhere: the shop cards' badge ("SAVE £30" sits at the tile corner on the clone because `sgs/label` has no position setting, the general session's note; the card's own `sgs/product-card` badge settings are where that belongs once product-10 uses the card).

## Custom CSS on the hand-finished Mama's product page (`local-mamas` post 202), rule by rule

| Rule | Look | Setting now? |
| --- | --- | --- |
| buy box `--sgs-buybox-gap: 22px` | gap between the buy box's stacked parts | Missing: `sgs/buybox` stack gap (plugin round) |
| `.sgs-buybox__extras--before { gap: 0 }` | no gap inside the title block | Missing: extras gap (plugin round) |
| `.sgs-buybox-pick__per-unit { display:none }` | hide the per-cookie line | Missing: a show toggle for the configurator's per-unit line |
| selected thumbnail `translate(-2px,-2px)` and `3px 3px 0` shadow | selected thumb lifted | Missing: `thumbSelectedScale` only scales; needs selected offset and shadow |
| `.sgs-option-picker__swatch { display:none }` | Base pills without colour squares | Missing: a per-group "no swatch" (`pickerVariationSwatch` is about photos) |
| badge font-size 11px | pack tile badge size | Missing: `pickBadgeFontSize` (only colours exist) |
| sticky bar's button 52px, padding 0 22px, 16px, shadow | compact bar button | Missing: sticky bar button look |
| `.sgs-buybox-pick__undo-row { display:none }` | hide Undo | Missing: undo row toggle |
| sub-label opacity 1 | full-strength sub-labels | Missing: sub-label colour/opacity (true one-off candidate) |
| rating `sgs/button` hover background transparent | still rating link | Exists: `colourBackgroundHover` |
| product card `.sgs-product-card__tag` border, radius, background, padding | tag look | Partly: `tagPadding`, `tagBackgroundColour`, `tagBorderRadius` exist; border missing (`tagBorderWidth`/`tagBorderColour`) |
| product card CTA shadows | CTA shadow | Exists: `ctaShadow`, `ctaShadowColour`, `ctaShadowHover` |
| testimonial slider rules (layout, serif summary, footer) | review cards | Not reviewed here (reviews section look; general session) |

## Not judged on a fresh Eye Care build (recheck once product-17 is cleared)

- The WhatsApp advice card: the 18:16 page draws it as one plain line of text; the 20:47 skeleton now proposes `sgs/whatsapp-cta` `variant: card` with the draft's title and line, and the checklist as `sgs/icon-list` `markerType: emoji`, but the 20:47 template tree still holds `sgs/text` and containers, so which one a fresh build writes is unknown.
- The description tabs, "Good to know" accordion, reviews and related products: on the 18:16 page the reviews summary lacks the large "4.9 out of 5" and the 5-star bar, and the bars are empty (the general session's `a78c7e626` review bars landed after that build); the tabs and accordion look close to the draft.
- The stock dot gap (draft 8px dot, 9px gap, Root/371-372) and the "Save £32 off RRP" badge position (draft top 18px right 18px): product-19 moves both into the buy box's own settings.
- Klarna and express pay line ("Or 3 payments of £46.33 with Klarna · Apple Pay · Google Pay · PayPal"): a missing-features row of the record (no buy box setting); WooCommerce Payments or Stripe express buttons are the working equivalent, a Bean decision.

## Pictures and probes

- Pictures: `E:\sgs-tmp\template-rework\investigation\shots\product\mm-r0-pair-1440*.png`, `mm-r0-pair-375*.png` (Mama's fresh build, before part-look), `mm-r1-pair-1440*.png`, `mm-r1-pair-375*.png` (Mama's after part-look), `ec-r0-pair-1440*.png`, `ec-r0-pair-375*.png` (Eye Care 18:16 build).
- Calls made: `part-look.mjs` report runs (no `--write`) with `--out` in this folder: `pl\mamas-vs-local-mamas` (`--compare --site local-mamas`) and `pl\ec-vs-trec` (`--compare --site local-mediatest-trec`); `term-meta.php` read on the copy; eye-care-test read over `ssh hd` for block and setting NAMES only (`tpl-names.php`, copied to `/tmp` and removed after).
- Probes in `E:\sgs-tmp\template-rework\investigation\product\`: `buybox-attrs.php` (saved buy box attributes), `tpl-names.php` (template tree, attribute names only; `css` adds Custom CSS), `tpl-grep.php`, `tpl-info.php`, `terms.php`, `prod-fields.php`, `probe.mjs` (page texts and boxes), `probe-sel.mjs` (computed styles), `outline.mjs` (route tree outline); outputs `mamas-live-buybox.txt`, `local-mamas-single-product-tree.txt`, `local-mediatest-trlab-single-product-tree.txt`, `local-mediatest-trec-single-product-tree.txt`, `eyecare-test-single-product-names.txt` (names only), `mm-*.json`, `ec-carrera-1440.json`, `mm-zookies.html`; part-look reports `pl\mamas-vs-local-mamas\report.md`, `pl\ec-vs-trec\report.md`.
