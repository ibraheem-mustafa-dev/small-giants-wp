# Mama's Munches product cards: what the draft card contains against the live card (2026-11-03)

Method: draft read with headless Playwright through `serveDraft` (`ProductCard.dc.html` is the card component; Home's gift tiles are bespoke markup in `Home.dc.html`); live read from the rendered DOM on `http://localhost:8084` at 1440 and 375. Pair crops (draft left, live right): `E:/sgs-tmp/cards/pair-<set>-<width>-<n>.png` (sets shop, gifts, home, product). Block attributes from `export-block-tree.php` (posts 194, 150, 154, 202) and `wc product get` (257, 282, 283, 284, 285). D = draft, L = live.

## What a draft card can contain (`ProductCard.dc.html`)

- Square image (1:1) as a background photo (cover, or 66% contain on a cream ground for the gift card), pill badge top-left on the image (yellow `#F9CF6E`, 2px brown border, 12px bold), name (Young Serif 22px), short description (15px), price (Young Serif 21px) with a small unit or price note beside it, full-width pill button. Image and name link to `Product.dc.html?id=<id>`.
- Resting tilt per product: Zookies -1deg, Taster Trio 1deg, Gift Box -0.6deg, 40-Day 1.2deg, Gift Card -1.2deg. Hover straightens and lifts with a hard brown shadow (no shadow at rest).
- Button: simple products add to basket and open the basket (yellow, "Add to basket"); Zookies "Build your box"; the gift card "Choose amount"; both go to the product page (cream button).
- Size `sm` (used at 375 on Shop, Gifts and Product): no description, smaller type, 44px button, label "Build yours" on non-simple products.
- No rating, no swatches, no pickers, no sale price in the draft card.

## Live card, common facts

- Live Shop and Gifts cards are one `sgs/product-card` inside `woocommerce/product-template` with `sourceMode: wc-product` and no `productId` (it follows the loop product). Title, short description, price, image and the Zookies swatches come from the WooCommerce product.
- Live "You might also like" is three separate `sgs/product-card` blocks with `productId` 282, 283, 284 and typed overrides `featuredTag`, `priceNote`, `ctaText`, `variantStyle: featured`.
- Live Home gift row is not product cards: four `sgs/container` tiles with typed `sgs/text`, `sgs/media`, `sgs/label` and an `sgs/button` (empty label, arrow icon) pointing at the product URL. Nothing is read from WooCommerce.
- Live cards carry a whole-card link overlay to the product page, so the whole card is clickable; the draft links only the image and name (and the button acts separately).

## Set 1: Shop grid (`/shop/`, post 194), 5 cards at 1440 (live 380x605, draft 405x616)

| Part | Zookies (257) | Taster Trio (282) | New Baby Gift Box (283) | 40-Day Care Bundle (284) | Baby Shower Gift Card (285) |
|---|---|---|---|---|---|
| Image | D `photo-pair-love.jpg` square cover. L same file, 376x376. SAME | D `photo-bun-case.jpg` square cover. L same photo but 376x215 landscape. DIFFERENT (crop) | D `photo-gift-heart.jpg` square. L `photo-gift-heart-300x300.jpg` square. SAME (300px thumbnail, soft) | D `photo-hero-mug.jpg` square. L `photo-hero-mug-300x300.jpg` square. SAME (soft) | D `logo-round.png` contain 66% on cream. L `logo-round-300x300.png` filling the square. DIFFERENT (fit) |
| Badge on image | D "Build your own" yellow pill. L none. MISSING on live | D "New? Start here". L none. MISSING | D "Gift favourite". L none. MISSING | D "Most thoughtful". L none. MISSING | D "For baby showers". L none. MISSING |
| Other pill | D none. L "Most popular" pill beside the price (value-ladder label). EXTRA on live | none / none. SAME | SAME | SAME | SAME |
| Name | Zookies. SAME | Taster Trio. SAME | New Baby Gift Box. SAME | 40-Day Care Bundle. SAME | Baby Shower Gift Card. SAME |
| Description | D "Our giant lactation cookie, baked to order in the flavour you pick." L identical, 1 line. SAME | "3 Classic Zookies to try. Postage included, fits through the letterbox." SAME | "A mix of Zookies in a gift box, sent with your message." SAME | "Six weekly deliveries for the 40-day postnatal window." SAME | "Give it at the shower. She redeems it once baby arrives, so every cookie is fresh." SAME |
| Price | D "from £9.50". L "£21.50" (default 20-pack variation, no "from"). DIFFERENT | D "£5". L "£5.00". DIFFERENT (decimals) | D "£15". L "£15.00". DIFFERENT | D "£42". L "£42.00". DIFFERENT | D "from £15". L "£15.00 – £40.00". DIFFERENT |
| Price note | D "£1.19 a cookie". L none visible (a per-unit note exists but is hidden). MISSING | D "postage included". L none. MISSING | D "gift-boxed". L none. MISSING | D "6 deliveries". L none. MISSING | D "£15 · £25 · £40". L none (screen-reader line "Price range: £15.00 through £40.00" only). MISSING |
| Swatches | D none. L two dots "Classic oat" and "Vegan oat". EXTRA on live | none / none. SAME | SAME | SAME | SAME |
| Rating, pickers | none / none. SAME | SAME | SAME | SAME | SAME |
| Button | D "Build your box" cream, goes to product page. L "Add to basket" yellow with cart icon, adds to basket. DIFFERENT | D and L "Add to basket" yellow (L adds a cart icon). SAME | SAME | SAME | D "Choose amount" cream, goes to product page. L "Add to basket" yellow. DIFFERENT |
| Link target | `Product.dc.html?id=zookies` / `/product/zookies/`. SAME | `/product/taster-trio/`. SAME | `/product/new-baby-gift-box/`. SAME | `/product/40-day-care-bundle/`. SAME | `/product/baby-shower-gift-card/`. SAME |
| Tilt | D -1deg. L none. MISSING | D 1deg. L none. MISSING | D -0.6deg. L none. MISSING | D 1.2deg. L none. MISSING | D -1.2deg. L none. MISSING |
| Resting shadow | none / none. SAME | SAME | SAME | SAME | SAME |

At 375 the draft uses `sm` (name, price, note, button only, no description; Zookies and Gift Card say "Build yours"; cards 166x329). Live at 375 keeps the description and the same extras (cards 159 wide, 508 to 587 tall); Gift Card says "Add to basket".

Where live content comes from: name, description, image, price, swatches and "Most popular" all come from the WooCommerce product; the only typed overrides on the block are `ctaText: "Add to basket"` and `overrideElements: ["cta"]`. One block serves all five products, so it cannot say "Choose amount" for one product.

## Set 2: Gifts results (`/gifts/`, post 150), 4 draft cards against 5 live

The draft's default filter (occasion "just had a baby", any budget) returns Zookies, Taster Trio, Gift Box and 40-Day Bundle. Live shows all five, including the Gift Card, which is tagged only "Baby shower" in WooCommerce (EXTRA on live). Live cards 295x497 (Gift Card 520), draft 299x510.

| Part | Zookies | Taster Trio | New Baby Gift Box | 40-Day Care Bundle | Gift Card |
|---|---|---|---|---|---|
| Image, badge, name, description, price, price note, link, tilt | As Set 1: same photos, badges and price notes missing, price formats differ, no tilt on live | same | same | same | not in the draft's default result |
| Button | D "Build your box". L "Add to Cart" (no override on this block, so the plugin default). DIFFERENT | D "Add to basket". L "Add to Cart". DIFFERENT | DIFFERENT | DIFFERENT | L "Add to Cart" |
| Swatches and "Most popular" | L two dots and the pill. EXTRA | none | none | none | none |

Live image heights: Taster Trio 291x167 (landscape), the others 291x291. At 375 the draft drops the description; live keeps it.

Content source: all from the WooCommerce product (`sourceMode: wc-product`), no typed overrides. `swatchAttribute: pa_gift-budget` is set but no budget pills draw on the card. The button label is the default "Add to Cart", not "Add to basket".

## Set 3: Home gifts row (`/`, post 154), 4 tiles (303x386 on both sides at 1440)

Draft tiles are bespoke, not `ProductCard`. Image box 4:3 on both.

| Part | New Baby Gift Box | 40-Day Care Bundle | Baby shower tile | Taster Trio tile |
|---|---|---|---|---|
| Image | D `photo-gift-heart.jpg` cover. L same. SAME | D `photo-hero-mug.jpg`. L `photo-hero-mug-300x298.jpg`. SAME | D `logo-round.png` contain, 10% padding, pink `#F9D5D3`. L same file, contain, rgb(249,213,211). SAME | D `photo-bun-case.jpg`. L same. SAME |
| Badge text | "Just had a baby". SAME | "First 40 days". SAME | "Baby shower". SAME | "Thinking of you". SAME |
| Badge fill | D yellow `#F9CF6E` pill. L the label element computes transparent; check the crop for the pill (VERIFY) | VERIFY | VERIFY | VERIFY |
| Name | "New Baby Gift Box". SAME | "40-Day Care Bundle". SAME | "Gift card". SAME (the product is named "Baby Shower Gift Card") | "Taster Trio". SAME |
| Line | "A mix of Zookies, gift-boxed with your note." SAME (product text differs) | "Six weekly deliveries through the postnatal weeks." SAME (product text differs) | "She redeems it once baby arrives." SAME (shorter than product text) | "3 Zookies through the letterbox. No one needs to be in." SAME (product text differs) |
| Price | "£15". SAME (typed) | "£42". SAME | "from £15". SAME | "£5". SAME |
| Arrow | D 36px ring "→". L 37px button with arrow icon and an empty label (accessible name to check). SAME visually | same | same | same |
| Price note, rating, button | none / none. SAME | SAME | SAME | SAME |
| Link | `Product.dc.html?id=giftbox` / `/product/new-baby-gift-box/` on button and card overlay. SAME | `/product/40-day-care-bundle/`. SAME | `/product/baby-shower-gift-card/`. SAME | `/product/taster-trio/`. SAME |
| Tilt | D -1deg, L -1deg. SAME | D 1deg, L 1deg. SAME | D -0.6deg, L -0.6deg. SAME | D 1.2deg, L 1.2deg. SAME |

At 375: draft tiles 261x376, live 267x359; text identical. All content is typed in the Home page; changing a product in WooCommerce does not change these tiles.

## Set 4: Product "You might also like" (`/product/zookies/`, template 202), 3 cards at 1440 (405, 401, 407 wide on both sides)

| Part | Taster Trio (282) | New Baby Gift Box (283) | 40-Day Care Bundle (284) |
|---|---|---|---|
| Image | D `photo-bun-case.jpg` square. L same photo, 394x230 landscape. DIFFERENT (crop) | D `photo-gift-heart.jpg` square. L 300px thumbnail, 395 square. SAME (soft) | D `photo-hero-mug.jpg`. L 300px thumbnail, 399 square. SAME (soft) |
| Badge | D "New? Start here" yellow `#F9CF6E`. L "NEW? START HERE" uppercase, cream fill, top-left on the image. DIFFERENT (colour, case) | D "Gift favourite". L "GIFT FAVOURITE", cream. DIFFERENT | D "Most thoughtful". L "MOST THOUGHTFUL", cream. DIFFERENT |
| Name, description | SAME | SAME | SAME |
| Price | D "£5". L "£5.00". DIFFERENT | D "£15". L "£15.00". DIFFERENT | D "£42". L "£42.00". DIFFERENT |
| Price note | D "postage included". L typed `priceNote` is set but nothing renders. MISSING | D "gift-boxed". Same fault. MISSING | D "6 deliveries". Same fault. MISSING |
| Button | "Add to basket" yellow; L adds a cart icon. SAME | SAME | SAME |
| Link | `/product/taster-trio/`. SAME | `/product/new-baby-gift-box/`. SAME | `/product/40-day-care-bundle/`. SAME |
| Tilt | D 1deg, L 1deg. SAME | D -0.6deg, L -0.6deg. SAME | D 1.2deg, L 1.2deg. SAME |
| Resting shadow | D none. L soft `0 2px 12px` at 10%. EXTRA | EXTRA | EXTRA |

At 375 the draft shows 2 cards (`slice(0, m ? 2 : 3)`); live also shows 2 (card 3 carries `sgsHideOnMobile`). SAME. Content source: title, description, price, image from WooCommerce; the badge is the typed `featuredTag`, the note the typed `priceNote`, the button the typed `ctaText`.

## Fix list

### A. WooCommerce product data (shared by Shop, Gifts, the product page and the related-products cards)

1. The four short descriptions already match the draft word for word; no change.
2. Zookies (257): lowest variation is £9.50, default variation £21.50. The draft's "from £9.50" is a card display choice (C1), not a data change.
3. Baby Shower Gift Card (285): price range £15 to £40 is correct data; the draft's "from £15" and "£15 · £25 · £40" are card display (C1, C3). Its only tag is "Baby shower", which is why the draft's "just had a baby" Gifts filter would leave it out; live Gifts does not filter.
4. Home tiles carry shorter gifting copy than the products ("Gift card", "She redeems it once baby arrives.", and so on). Leave the product data alone; either keep the typed Home text or bind the tiles to the products.
5. Images: the cards use 300px thumbnails (`photo-gift-heart-300x300.jpg`, `photo-hero-mug-300x300.jpg`, `logo-round-300x300.png`); a 376 to 400px card needs a larger registered size, or the full file.

### B. Card settings that exist (`plugins/sgs-blocks/src/blocks/product-card/block.json`)

- Badge text on the related-products cards: `featuredTag` (set; reads "New? Start here" and so on). Colour and case: `tagBackgroundColour`, `tagTextColour`, `tagTextTransform` (set to yellow `#F9CF6E` and none).
- Badge on Shop and Gifts cards: `variantStyle: featured` plus `featuredTag` gives one text for the whole loop; per-product text needs `showAttributeTag`, `attributeTagSource`, `attributeTagTaxonomy`, `attributeTagTerm`, `attributeTagText`.
- Gifts button label: `ctaText` is unset (shows "Add to Cart"); set "Add to basket". Per-card behaviour: `ctaBehaviour`, `ctaUrl`, `ctaUrlSource`.
- Tilt on Shop and Gifts: `sgsMotion` `restRotate` (already used on the related cards).
- Swatches on Zookies: `colourSwatches`, `swatchAttribute`, `swatchMaxVisible`. "Most popular" pill: `showLadder`, `decoyEnabled`.
- Resting shadow on related cards: `showShadow` (false on Shop and Gifts, on for the related cards).
- Image crop: `imageAspectRatio` is "1 / 1" on every card, yet Taster Trio renders landscape (its wrapper class is `sgs-product-card__media-wrap`, not `product-card__media` as on the other cards); check `imageHeight`, `framingMode`, `mediaBackgroundColour`. Gift card contain-on-cream: `framingMode`, `mediaBackgroundColour`.
- `priceNote` is set on the related cards but renders nothing; this is a render fault to investigate, not a missing setting.
- Home tiles: typed text in the page; to follow the products, swap for `sgs/product-card` with `sourceMode` and `productId`, then `overrideElements` for the copy.

### C. Missing settings (not in `block.json`)

1. A "from" price mode for variable products (lowest variation price, not the default variation) and a per-unit note such as "£1.19 a cookie" shown on the card.
2. A per-product badge readable inside a product loop (text and colour); the attribute-tag route is the nearest.
3. A per-product price note inside a loop ("postage included", "gift-boxed", "6 deliveries", "£15 · £25 · £40").
4. Button behaviour decided by product type in a loop ("go to product page, label Build your box or Choose amount" for configurable products, add to basket for simple ones), instead of one `ctaBehaviour` for every product.
5. Per-product resting tilt in a loop, and a "drop the description at mobile" option (the draft `sm` card drops it at 375).
6. Currency display without the trailing ".00" (the context carries `trimZeros: false`; no block setting found in `block.json`).
