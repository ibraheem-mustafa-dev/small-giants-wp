# Basket page and basket drawer: findings (2026-11-21 night)

- Mama's: far from passing. Today's from-blank rebuild of the basket page was refused at propose (basket-2), so the copy still shows the 2026-11-19 build: close in layout, but the count beside the heading is the draft's literal "2", the summary card is narrower with a white inner panel, WooCommerce's coupon, gift card and shipping rows are tiny, and at 375 the line price is clipped and the summary has no title. The drawer on the copy is the hand-finished one (its header was never cleared); from blank the route would not reproduce its modes, words or 16 Custom CSS rules.
- Eye Care: its draft has no basket page (only the bag drawer), and `/cart/` is WooCommerce's stock page on both the copy and the hand-built site (Bean's decision, basket-8). Its drawer is far from passing: it opens near-black with unreadable words (basket-1, the worst problem found), shows WooCommerce-style defaults the draft lacks, and part-look reads the draft drawer from the wrong element.
- 15 findings. Worst: basket-1 (Eye Care drawer unreadable), basket-2 (Mama's basket cannot be rebuilt), basket-3 and basket-4 (the drawer's looks and modes cannot come from the draft).

## How to read this

- "Hand-finished" means Mama's mirror `local-mamas` (values read) or Eye Care's hand-built `eye-care-test` (setting NAMES only, never values, per Bean's rule). "From blank" means the scratch copies `local-mediatest-trlab` (Mama's, port 8121) and `local-mediatest-trec` (Eye Care, port 8125).
- Mama's drawer on the from-blank copy is not from blank: its header's `sgs/cart` block (header post 178) holds 166 settings, 165 byte-identical to the hand-finished mirror (the 166th is the empty-state picture's host name) (`basket/blocks-local-mamas.json` against `basket/blocks-local-mediatest-trlab.json`). The strip step cleared the shop pages' hand-set looks, not the header's. What the route would make of Mama's drawer is shown by `part-look.mjs --client mamas-munches-redesign --surface header --site local-mamas --compare` (draft read, hand values compared, nothing written): `basket/pl-mm-header-compare/report.md`. The same for the basket page: `basket/pl-mm-cart-compare/report.md`.
- Eye Care's drawer on the copy is the route's own (15 settings, `basket/blocks-local-mediatest-trec.json`); `eye-care-test`'s holds 128 setting names plus Custom CSS (`basket/ec-hand-names.txt`).
- Log status when this was written (21:40): `eye-care-ward-end-cart.log` exit=0 (skipped: "no draft page"); `mamas-munches-redesign-template-cart.log` exit=1 (basket-2). The part-look logs (`*-pl-cart.log`, `*-pl-header.log`) did not exist yet: each copy's part-look chain starts only after its whole rebuild chain, and the header is its last surface. Every drawer and page finding below was proved without them (the draft read, the compare reports, the live copies); each "Verify by" names the check to rerun once they land. Two predictions to confirm then: Eye Care's `pl-header` will write basket-3's wrong values (heading 12px, track colour #F3F0EB), and Mama's will write `panelCloseSize` 48px and grow the × (basket-10).

### basket-1: Eye Care's basket drawer opens near-black, with its words almost invisible
- Clients and widths: Eye Care, 375 and 1440 (filled and empty). Mama's escapes only because its panel colour is hand-set; any client with no `base` colour in its palette is hit (none of Mama's, Indus's or Eye Care's snapshots has `base` or `contrast`).
- Evidence: `shots/basket/ec-drawer-pre-375.png`, `ec-drawer-pre-1440.png`, `pair-ec-drawer-1440.png`, `pair-ec-drawer-empty-1440.png`. The dialog's own background computes white, but its `::after` layer paints rgb(20, 20, 20) over it (`basket/dark2.mjs`): the printed rule is `.sgs-cart-d9ee49c4.sgs-cart__panel::after{...background-color:var(--wp--preset--color--base, currentColor)}`, and the panel text is rgb(20, 20, 20).
- Cause: proved. `plugins/sgs-blocks/src/blocks/cart/block.json` gives `panelBg` the default `"base"` (and `panelTextColour` `"contrast"`); Eye Care's palette has neither slug, so the variable falls back to `currentColor`, which is the panel's own dark text colour. The route never writes `panelBg` for Eye Care (basket-3), so the default shows. `sgs/cart` is the only block defaulting to `base` (`grep '"default": "base"' src/blocks/*/block.json`).
- Layer and owner: plugin bug (`sgs/cart` default colour fallback, this stream's block); made visible by basket-3.
- Fix: the panel's default background must never fall back to `currentColor`: resolve the default to the site's own page background (the snapshot's `styles.color.background`, as the theme paints `body`) or to `Canvas` with `CanvasText`, where `includes/helpers-cart-panel-css.php` prints the `::after` layer. It is a fix (renders broken today), so it lands for every site; Mama's and Indus's hand-set `panelBg` keep their look (list them in the render-scope run).
- Size: S
- Depends on: nothing (basket-3 is the route half)
- Verify by: open the drawer on `local-mediatest-trec` at 375 and 1440 with no `panelBg` saved: the `::after` background differs from the text colour and the words read at 4.5:1 or more.
- Same cause elsewhere: every page (the drawer opens site-wide); any future client whose palette lacks `base`.

### basket-2: Mama's basket page cannot be rebuilt from blank today: propose refuses it
- Clients and widths: Mama's, all widths (the copy shows the 2026-11-19 build instead).
- Evidence: `logs/mamas-munches-redesign-template-cart.log` (exit=1): "paint conservation: 1 painted element host-unread (rule drawsChildren, host sgs/heading) ... Root/12#0" and "7 painted elements state-only (no rule) ... Root/12#0; Root/14#0 background/border/radius/text-centre/padding/layout; Root/15#0 width; Root/17#0 max-width; Root/18#0 layout; Root/19#0 ...". `sites/mamas-munches-redesign/build/skeleton/template-cart.proposal.json`: `templatePieces.placed` holds one piece, `layout` (`core/post-content`) with run `Root/22#0` only; its `problems` are empty. In `template-cart.inventory.json` `Root/12#0` is the count chip `<span>2</span>` inside the `<h1>`, and `Root/14#0` to `Root/19#0` are the empty-basket card (pink box, logo 140px, "Nothing in here yet", the 420px text, the "Build your box" and Taster Trio buttons), each a member of `sc-if {{ empty }}`. The 2026-11-19 lab run of the same surface passed propose ("5 nodes, 1 low", `lab/logs/01-template-cart.log`).
- Cause: proved. Two unclaimed draft parts: (1) the heading's count chip, which the heading cannot draw (see basket-5); (2) the empty-basket branch, a sibling of the filled grid `Root/22`: the cart's layout piece (`lib/template-piece-woo-layout.mjs::place`) stands for the filled grid only, so the empty branch's paint is no piece's missing feature and counts as a paint-conservation loss. WooCommerce's Cart block draws its own empty state (`woocommerce/empty-cart-block`), which is what stands for that branch on the live page.
- Layer and owner: route piece (this stream) for the empty branch; the count chip as basket-5.
- Fix: `lib/template-piece-woo-layout.mjs` claims the commerce region's other data branch (the `sc-if` sibling revealed by the empty state) as part of the cart piece's run, so its paint becomes the piece's missing features (the empty-cart block's look), and the count chip becomes a bound count (basket-5). Test: Mama's template-cart inventory proposes with 0 problems; MUST FAIL without the claim.
- Size: S (the empty branch), M with basket-5
- Depends on: basket-5 for the chip
- Verify by: `clone-surface.mjs mamas-munches-redesign --surface template-cart --site local-mediatest-trlab --jobs 1 --allow-unpicked` ends with every stage passed, then the 375 and 1440 pairs.
- Same cause elsewhere: any basket or checkout draft that draws its own empty state beside the filled one.

### basket-3: Part-look reads Eye Care's drawer from the wrong element, so it would write wrong looks and never reads the panel itself
- Clients and widths: Eye Care, all widths; Mama's is read right.
- Evidence: `basket/pl-ec-header-compare/report.json` `located`: `panel` and `panelFrame` are a 460x627 `div` whose text starts "Ray-Ban Ray-Ban£139" (the item scroll list, not the dialog); `panel-heading` is the thumbnail's placeholder word "Ray-Ban" (so `panelTitleFontSize` 12px, weight 500, where the draft's "Bag" is 22px); `panelHead` is the 96x96 thumbnail (so `panelHeadPadding` 4px); `freeDeliveryTrack` and `freeDeliveryBar` are the thumbnail box (so `freeDeliveryTrackColour` "surface-alt-shade", the thumbnail's #F3F0EB fill, and radius 0); `freeDeliveryText` is the brand eyebrow "Gucci"; `itemRemoveColour` is read from "Add my prescription" (#141414; the draft's Remove is #6B655E). 14 parts are unpaired, among them `panelFooter`, `panel-checkout`, `panelClose` and `panelBody`; `panelBg` (#FAF8F5), the 460px width and the panel shadow are never read.
- Cause: proved. `scripts/computed-route/data/part-locators.json` `groups.drawer.anchors.drawer` first tries an overlay with `linksTo: "checkout"`; `lib/fill-part-look-page.mjs` (the `linksTo` test) accepts only an `<a href>` whose file is the checkout page's file. Eye Care's draft is one file (its `pages` map is empty) and its Checkout is `<button onClick="{{ goCheckout }}">`, so that option can never match; the second option takes the `smallest` overlay holding priced lines, which is the scroll list inside the dialog. Every child anchor (`heading` = first own text, `track` = first textless div) then lands inside the first line.
- Layer and owner: part-look locators (this stream).
- Fix: in `data/part-locators.json` the drawer anchor takes the draft's dialog first (`role="dialog"` or `aria-modal`, or the largest fixed box in overlay scope that holds the lines), not the smallest; `linksTo` in `lib/fill-part-look-page.mjs` also accepts a control whose handler routes to that role's page in a one-file draft (the draft's `go('checkout')`, found the way `lib/part-look-controls.mjs` finds the flow opener). A MUST FAIL test on Eye Care's drawer shape.
- Size: M
- Depends on: nothing
- Verify by: `part-look.mjs --client eye-care-ward-end --surface header --site local-mediatest-trec --compare --out <scratch>`: `panel-heading` "Bag" at 22px, `freeDeliveryTrack` 412x2, `panelFrame` 460 wide, `panelBg` written "paper", no unpaired `panelFooter`, `panel-checkout` or `panelClose`.
- Same cause elsewhere: the `wc` group's `summary` and `checkoutLink` anchors also use `linksTo: "checkout"`, so a one-file draft's basket or checkout page misses them the same way (worth a look in the checkout stream for Eye Care).

### basket-4: Neither route sets what the drawer shows: Eye Care's shows a quantity box, "Save for later", an × icon, "View cart", "Your cart" and a tax note its draft does not have
- Clients and widths: Eye Care, 375 and 1440, on the copy. Mama's has the same gap, hidden on the copy because its header kept the hand-finished settings.
- Evidence: Eye Care's drawer (`shots/basket/pair-ec-drawer-1440.png`, `ec-drawer-pre.json`): heading "Your cart" (draft "Bag"), no "(2)" count, a 56x32 quantity box with a "Qty" label (draft none), "Save for later" (draft none), an × icon for remove (draft underlined "Remove" words), an outlined "View cart" beside a half-width "Checkout" (draft one full-width CHECKOUT), "Shipping and taxes calculated at checkout." (draft none), no "Or 3 payments of ... with Klarna" line, the free-delivery bar at the top (draft: a 2px bar under the subtotal, in the footer), the bar also in the empty drawer (draft: none). The copy's `sgs/cart` holds 15 settings, none of these (`basket/blocks-local-mediatest-trec.json`). The hand-built `eye-care-test` sets every one by name: `panelHeading`, `panelShowCount`, `panelShowViewCart`, `itemShowQty`, `itemShowSaveForLater`, `itemRemoveStyle`, `freeDeliveryPlacement`, `freeDeliveryMessage`, `freeDeliverySuccessMessage`, `freeDeliveryThresholdOverride`, `freeDeliveryHideWhenEmpty`, `panelTaxNote`, `panelInstalmentsNote`. Mama's hand-finished drawer sets the same family, each value taken from its draft: `panelHeading` "Your basket", `panelShowCount` true, `itemQtyStyle` "stepper", `itemRemoveStyle` "text", `itemRemovePlacement` "inline-end", `itemShowSaveForLater` false, `panelActionsLayout` "stacked", `panelViewStyle` "text-link", `viewCartLabel` "View full basket", `panelTaxNote` "Baked fresh for you · with you in 3–5 days", `panelGiftShow` true with its labels, `freeDeliveryMessage`, `freeDeliverySuccessMessage`, `freeDeliveryHideWhenEmpty` true, `emptyBody`, `emptyProductId`, `emptyButtonLabel`, `emptyImageSource`, `autoOpenDrawerOnAdd` true.
- Cause: proved. `scripts/computed-route/data/part-look-modes.json` has no `sgs/cart` rules, so part-look writes no mode or word for the drawer. The shop-parts record (`sites/<client>/build/shop-parts.json`) writes only the empty message and button, the add-options switch and label, the remove label (equal to its default) and, for Mama's, `checkoutLabel`; it records the heading, free-delivery message, Eye Care's checkout, the instalments note, Mama's footer note, gift tick and upsell as `:hint` gaps ("only words name this text"), and its `drawer-count`, `drawer-quantity` and `drawer-view-basket` rows name a home setting but carry `write: null` (whether the draft draws the part is never turned into the switch).
- Layer and owner: part-look modes (this stream) for the switches; the words are shop-parts rows (owner of `shop-parts.mjs` to confirm; hypothesis: the general session, as it runs inside Fill).
- Fix: `sgs/cart` rules in `data/part-look-modes.json` over the drawer group's located parts, the way `sgs/product-card` has them: `panelShowCount` true when the heading holds a live count; `itemShowQty` false, or `itemQtyStyle` "stepper" when the line draws minus, number and plus; `itemShowSaveForLater` false and `panelShowViewCart` false when absent; `itemRemoveStyle` "text" when Remove is words, and `itemRemovePlacement` from its position; `panelActionsLayout` "stacked" when the actions stack; `freeDeliveryPlacement` "footer" when the bar sits under the subtotal; `panelGiftShow` when a gift tick is drawn; `freeDeliveryHideWhenEmpty` when the empty state draws no bar. The words map by position: the text in the head row beside the close button (`panelHeading`), the text under the subtotal (`panelTaxNote`), the text under the checkout control (`panelInstalmentsNote`), the free-delivery text in both states.
- Size: M
- Depends on: basket-3 (Eye Care's parts must be located first), basket-10 (locators)
- Verify by: on `local-mediatest-trec` after part-look `header --write`: "Bag (1)", no quantity box, no Save for later, no View cart, underlined Remove, the bar under the subtotal, one full-width Checkout and the Klarna line; on a copy of Mama's header with its `sgs/cart` settings cleared, the route reproduces the hand-finished values above.
- Same cause elsewhere: every client's drawer.

### basket-5: The number beside "Your basket" is the draft's literal "2", whatever the basket holds
- Clients and widths: Mama's, all widths.
- Evidence: `shots/basket/pair-mm-cart-hand-vs-copy-1440.part0.png`: with one item, the header badge says 1, the hand-finished page's yellow chip says 1, the copy's heading says "Your basket 2" as plain heading text. The saved template on the copy (`basket/tpl-trlab-cart.html`) holds `sgs/heading` `"content":"Your basket 2"`; today's skeleton (`build/skeleton/template-cart.skeleton.json`) does the same, with the handover note "holds words the draft's code fills ({{ count }}): its rendered words are written". The hand-finished template (`basket/tpl-mamas-cart.html`) uses a flex-row `sgs/container` holding the `<h1>` "Your basket" and an `sgs/text` chip whose text is `<span class="sgs-basket-count">0</span>` (yellow fill, 2px cocoa border, 999px corners, 4px 12px padding, bold body type at 27.2, 21.6 and 17.6px).
- Cause: proved. The mechanism exists: the "Basket count" format (Spec 27 FR-30-24; `src/blocks/extensions/inline-formats/index.js`, filled live by `src/shared/cart-live/basket-count.js`). The route writes the draft's rendered words for a `{{ count }}` binding instead of that format, and keeps the chip inside the heading, where its paint has no reader (basket-2's `Root/12#0`). This corrects the lab finding that called the live count "a framework build not made yet" (FR-48-99).
- Layer and owner: route (a template piece for a bound basket count, this stream; the general session owns the heading split if done as a skeleton rule: confirm).
- Fix: where a draft text is bound to the basket count (`{{ count }}` from the store's cart count), build the chip as its own `sgs/text` holding the Basket count span, beside the heading in a row container, and Fill reads the chip's look onto it (as the hand-finished page has it).
- Size: M
- Depends on: nothing
- Verify by: the rebuilt basket page shows a yellow chip with the live count (1 with one item, 2 after adding one) at 375 and 1440, and propose reports no `Root/12#0` problem.
- Same cause elsewhere: any draft count bound to the basket (Mama's draft header pill, the drawer heading's "(2)" is already the block's own).

### basket-6: Mama's summary card and line items differ from the draft and the hand-finished page at 1440
- Clients and widths: Mama's, 1440 (and 768).
- Evidence: `shots/basket/pair-mm-cart-pre-1440.part0.png` (draft left), `pair-mm-cart-hand-vs-copy-1440.part0.png` (hand-finished left). The copy's summary column is about 250px against the draft's and hand's 40% of the row (about 330px); it shows a white inner card where the draft is flat pink; "Add coupons", "Add a gift card" and "Royal Mail Tracked 48" are about 11px where the hand-finished page shows them at 16px bold and 14px; the gift box touches the item card (draft 16px gap). Saved settings, hand against copy (`basket/blocks-*.json`, `pl-mm-cart-compare/report.md`): the copy lacks `sgsSidebarWidth` calc((100% - 40px) * 0.4), `sgsButtonMinHeight` 62px, `sgsItemStepperWidth` 110px, `sgsCouponLabel*` (colour, family, 16px, 700), `sgsCouponPadding`, `sgsCouponControlHeight` 48px, `sgsFieldLabel*` (position above, 15px, 700), `sgsItemCellPadding`, `sgsSummaryHeadingLineHeight` 1.05; and differs on `sgsItemGap` (hand 16px, copy 0px) and `sgsItemVariantColour` (hand mm-cocoa, copy mm-muted).
- Cause: proved for each by the compare's reason column:
  - `sgsSidebarWidth`, `sgsItemStepperWidth`: "the draft states no such size (the layout decides it)". The draft states the columns as `grid-template-columns: 1.5fr 1fr` (`Basket.dc.html` logic `L.cols`), a ratio part-look does not read.
  - `sgsButtonMinHeight`: the draft declares `height:62px` on Checkout; `lib/fill-part-look.mjs::statedSize` reads only a declared `min-height` (same cause as basket-10).
  - `sgsCouponLabel*`, `sgsCouponPadding`, `sgsCouponControlHeight`, `sgsFieldLabel*`: "the part has a locator and the draft has no element for it". The draft draws no coupon or gift card; WooCommerce does, and the hand-finished page dressed them like the summary's own row labels. Part-look leaves a part the draft lacks at WooCommerce's default.
  - The white inner card: `sgsSummaryWrapsButton` paints the card on the side column (plan Task 3, known).
  - `sgsItemGap` 0px: hypothesis that part-look reads the item row's own gap where the setting is the gap between cards (prove by reading `pl-mm-cart-compare/report.json` `located` for `line-item` and the draft's `gap:16px` on the list).
- Layer and owner: part-look (this stream) for the column ratio, `statedSize` and the WooCommerce-only parts; plugin (Task 3) for the inner card.
- Fix: part-look reads a grid or flex column ratio into `sgsSidebarWidth` (the side column's share of the row less the gap); `statedSize` as in basket-10; a policy row in `data/part-look-switches.json` or the modes file: a WooCommerce part the draft does not draw takes the look of its nearest drawn sibling (the coupon and gift card toggles take the summary row label's type; the coupon field and Apply the draft's nearest field and button), or Bean rules them hidden (see the open decision in the lab findings).
- Size: M
- Depends on: basket-2 (a fresh build to check on)
- Verify by: the compare against `local-mamas` shows those rows equal; the 1440 pair beside the draft.
- Same cause elsewhere: the checkout's summary (the same coupon and gift card rows).

### basket-7: At 375 Mama's line price is clipped, the summary has no "Summary" title and the stepper's minus and plus are faint
- Clients and widths: Mama's, 375.
- Evidence: `shots/basket/pair-mm-cart-hand-vs-copy-375.part0.png`: the copy's "£9.50" runs past the card's right edge, the summary starts at "Add coupons" with no title, and the stepper's − and + are pale and small; the hand-finished page shows all three right. The hand-finished page does it with Custom CSS (basket-14): per-width item grid columns (`72px minmax(0,1fr) auto` under 920px, `96px` from 768px), `.wc-block-cart__totals-title{display:block}`, and quantity buttons at `opacity:1; font-size:20px` with the number at 16px bold.
- Cause: proved. No setting holds any of the three: the commerce-look table (`includes/woocommerce/commerce-look/selectors.json`) has `summary_heading` with only a decoration column (no "show below the wide layout"), `item_stepper` with margin, padding and height only (no number or button type), and the item card's grid columns come from the plugin's own item-card rule (plan Task 3, "the price column does not shrink").
- Layer and owner: block setting gap (plugin round, `woocommerce/cart`): the summary title's visibility at narrow widths, the stepper's number type and button size, colour and strength; plugin bug (Task 3) for the item-card columns.
- Fix: the settings above; the item-card rule gives the price column `auto` and the text column `minmax(0,1fr)` at every width.
- Size: M
- Depends on: nothing
- Verify by: the 375 pair: price inside the card, the title shown, the stepper at full strength.
- Same cause elsewhere: the checkout summary's title at 375 (same WooCommerce class).

### basket-8 (decision for Bean): Eye Care's `/cart/` page is WooCommerce's stock basket, because its draft has no basket page
- Clients and widths: Eye Care, 375 and 1440.
- Evidence: `shots/basket/ec-cartpage-pre-1440.png`, `-375.png`: post title "Cart", WooCommerce's table with PRODUCT and TOTAL headings, 11 to 12px text, "Add coupons", "Estimated total", PROCEED TO CHECKOUT, a broken product picture whose alt text prints large (the fixture product has no image: site data on the copy). The page is reachable: the drawer's "View cart" button (basket-4) and WooCommerce's "View basket" notice after an add to basket both link to it. The rebuild skipped it (`eye-care-ward-end-cart.log`: "no draft page: WooCommerce's own cart page keeps its block"), and the hand-built `eye-care-test` is the same: the theme's own cart template and a `woocommerce/cart` block with no settings.
- Cause: proved. The draft draws the basket only as the bag drawer (`Eye Care Birmingham.dc.html`, `sc-if bagOpen`; no page `cart` in its logic); the manifest marks the surface `noDraft` (Spec 48 FR-48-99) and part-look reads nothing for it.
- Layer and owner: draft scope; needs Bean's ruling.
- Options: (A, recommended) keep shoppers off the page: the drawer hides "View cart" (basket-4 writes `panelShowViewCart` false from the draft) and the shop's add-to-basket stays in the drawer, so `/cart/` is only a fallback; costs nothing new and matches the draft. (B) dress `/cart/` from the drawer's looks (part-look reads the drawer when the page has no draft): more work, and every look is a guess at a page Bean never designed. (C) accept the stock page as it is.
- Size: S for A
- Depends on: basket-4 for A
- Verify by: no link to `/cart/` in the drawer at 375 and 1440, and adding to basket from a product opens the drawer.
- Same cause elsewhere: any one-page draft that draws only a drawer.

### basket-9: Mama's "This is a gift" box sits at the bottom of the drawer above the footer instead of under the basket lines
- Clients and widths: Mama's, 375 and 1440 (the hand-finished site and the copy alike).
- Evidence: `shots/basket/pair-mm-drawer-1440.png`, `pair-mm-drawer-375.png`: the draft's gift box sits 18px under the last line; the copy's sits directly above the footer (y 592 of 900 at 1440) with an empty gap above it.
- Cause: proved. `includes/helpers-cart-panel.php::sgs_cart_panel_body_html` prints the gift box after the `.sgs-cart__panel-items` list, outside it, and `src/blocks/cart/style.css` gives that list `flex: 1 1 auto; overflow-y: auto`, so the list takes all free height and the gift box is pushed down to the footer. The draft puts the gift box inside the scrolling body after the lines.
- Layer and owner: block setting gap (plugin round, Task 6 audit row 8): `sgs/cart`, gift box, a placement setting ("footer", today's look and the default; "after-items", inside the scroll after the lines); then the route writes it from the draft's order (basket-4).
- Fix: as above; the after-items option gives the gift box its own slot after the rows inside the scroll container (the view script rebuilds the rows, so the slot must survive a rebuild).
- Size: M
- Depends on: nothing
- Verify by: Mama's copy with the option set: the gift box top 18px under the last line at 375 and 1440; with a long basket it scrolls with the lines.
- Same cause elsewhere: any drawer that draws a gift tick.

### basket-10: Where part-look does read Mama's drawer, five reads are wrong or missing
- Clients and widths: Mama's (and Eye Care once basket-3 is fixed), all widths.
- Evidence: `basket/pl-mm-header-compare/report.md`, "Compared with post 178".
- Cause: proved for each:
  - `panelCloseSize` would be written 48px (route only). `block.json` declares it as the close BUTTON's width (`elements.panelClose.attrMap` `css:width`), so part-look reads the 48px button; but `includes/helpers-cart-panel-css.php` prints it as the SVG's width and height and zeroes the 44px tap minimum. Written as read, the × grows from 28px to 48px. Declaration and render disagree (plugin bug); the hand-finished drawer left it unset and used Custom CSS.
  - `itemQtyFontWeight` is read 400 where the draft's number is bold (hand 700): the setting is paired with the stepper wrapper (`item-stepper`), not the number.
  - `checkoutMinHeight` is not written ("the draft states no such size"): the draft's Checkout declares `height:56px`, and `lib/fill-part-look.mjs::statedSize` accepts only a declared `min-height` for a min-height setting.
  - `panelMaxWidth` is not written: the draft's panel declares `width:440px` (100vw on phones) and `max-width:100vw`; `statedSize` takes the declared `max-width`, which is no px length. Hand value: 440px desktop and tablet, 100% mobile.
  - 16 parts have no locator, among them the whole empty state (`emptyMessage`, `emptyCta`, `panelEmpty`), the count, the subtotal row and the item brand eyebrow (Eye Care's "RAY-BAN", 11px uppercase, which the hand-built site styles with `itemBrand*`). The header surface reads the draft only with a filled basket, so the empty state could not be read even with locators.
- Layer and owner: part-look (this stream) for reads and locators; plugin bug for `panelCloseSize` (this stream's block).
- Fix: `panelCloseSize` moves to the icon (its own element) and a new close tap-size setting sizes the button; `itemQtyFontWeight` pairs with the number (`.sgs-cart__item-qty-input`); `statedSize` takes a declared `height` for a min-height setting and a declared px `width` for a max-width setting whose own max-width is a viewport cap; drawer locators for the count, subtotal, brand and empty-state parts; and a second read of the drawer with the basket emptied (`part-look.json` init, or Mama's store cleared).
- Size: M
- Depends on: basket-3 for Eye Care
- Verify by: the compare on `local-mamas` shows `checkoutMinHeight` 56px, `panelMaxWidth` 440px with 100% on mobile, `itemQtyFontWeight` 700 and the empty-state rows equal; on the copy after `--write` the × measures 28px inside a 48px button.
- Same cause elsewhere: `statedSize` decides every part-look size on every surface (the basket page's `sgsButtonMinHeight`, basket-6; checkout and account buttons drawn with `height`).

### basket-11: The header's width-ladder padding leaks onto the open Eye Care drawer
- Clients and widths: Eye Care, 375 (11px) and 1440 (14px).
- Evidence: the open dialog carries `sgs-c-wgate21` (the cart block's Custom CSS scope) and `sgs-c-wgate10` (a header row's) (`basket/dark.mjs`), which the server HTML does not print on it; `.sgs-c-wgate21.sgs-c-wgate21.sgs-c-wgate21.sgs-c-wgate21{padding-left:14px;padding-right:14px}` matches the dialog, so the head and footer bands sit 14px in from the panel's edges (`ec-drawer-pre.json`: `panel-header` x 14, width 372 of 400).
- Cause: proved. `src/shared/nav-interactivity/custom-css-scope.js::carryCustomCssScope` copies every ancestor's `sgs-c-*` class onto the dialog before it moves to `<body>`, so a rule written for an ancestor element itself (`&{...}`) also lands on the dialog. The route's width ladder for the cart block is such a rule (`&{padding-left:...}` for the trigger's wrapper).
- Layer and owner: plugin bug in shared code (the mega panel uses the same carry); flag to the general session.
- Fix: carry ancestor scopes as a separate marker (a `data-` attribute) and compile each scope's descendant rules for that marker too, so a bare `&{...}` rule never matches the moved element.
- Size: M
- Depends on: nothing
- Verify by: open the drawer on `local-mediatest-trec`: dialog padding 0px; the trigger wrapper keeps its 11px and 14px.
- Same cause elsewhere: any mega panel whose ancestors carry a bare `&{...}` Custom CSS rule.

### basket-12: Mama's basket page has no `<h1>`
- Clients and widths: Mama's, all widths.
- Evidence: `basket/mm-cart.html` (the copy's `/cart/`): 0 `<h1>` elements; "Your basket" renders as `<h2 class="wp-block-sgs-heading ...">`. The draft's heading is `<h1>`; the hand-finished template sets `"level":"h1"`.
- Cause: proved. Today's skeleton writes `sgs/heading` with `content` only, though its `draftFingerprint.tag` is "h1" (`template-cart.skeleton.json`); `sgs/heading` defaults to h2.
- Layer and owner: route rule (general: the heading's level from the draft's tag).
- Fix: the skeleton or Fill writes `level` from the draft element's tag.
- Size: S
- Depends on: nothing
- Verify by: one `<h1>` on the rebuilt `/cart/`.
- Same cause elsewhere: hypothesis: every route-built heading drawn as `<h1>` (check the shop, checkout and account templates).

### basket-13: Mama's hand-finished drawer needed 16 Custom CSS rules; most are looks `sgs/cart` has no setting for
- Clients and widths: Mama's, all widths; the route cannot reproduce these from blank.
- Evidence: `local-mamas` header post 178, `sgs/cart` `sgsCustomCss` (`basket/blocks-local-mamas.json`; the compare report counts 16 rules, 1645 bytes).
- Cause: proved per rule against `src/blocks/cart/block.json` and `includes/helpers-cart-panel-css.php`:
  - Remove as words at 14px, line-height 17px, padding 10px 0, underlined, no bottom border: missing (`itemActionFontSize` reaches only `.sgs-cart__item-action`, the add-options and save-for-later links). Missing settings: Remove's font size, line height, padding and text decoration.
  - Stepper number 22px wide: missing (the stepper's number width; Task 6 row 8).
  - Stepper buttons 44px high: a setting exists (`itemQtyHeight`, 44px on the same block; `style.css` sizes the steps from `--sgs-cart-qty-height`), so the rule looks redundant. Hypothesis: proved by removing it on a scratch copy and measuring 44x44 steps.
  - Free-delivery text line-height normal: missing (free-delivery text line height).
  - Empty state centred in the panel (`justify-content: center; min-height: 100%`): missing (empty-state vertical placement).
  - Empty-state body text (max-width 300px, 16px, line-height 1.5, muted colour): missing (`emptyMessage*` style only the heading).
  - Empty-state "Browse the shop" link (bold, 10px padding): missing.
  - Gift box (margin 0 20px 16px, padding 10px 16px, 1.5px dashed #E3AFAF border, 18px corners, paper fill), gift label weight, gift help 14px and colour, gift name and message fields (border, corners, padding, white fill), the message's Caveat at 22px: all missing (Task 6 row 8, the gift box).
  - Close button 48px with a 28px icon: one setting cannot hold both (basket-10, `panelCloseSize`).
  - Head band `flex-shrink: 0`: hypothesis that the head band squashes when the list is long (prove with ten lines at 375); if so it is a plugin fix for every site, not a setting.
- Layer and owner: block setting gap (plugin round; Task 6 audit row 8 for the stepper and gift box; new `sgs/cart` rows for Remove's words, free-delivery line height, the empty state's body, link and placement, and the close button's tap size).
- Fix: the settings above, each declared on a part in `block.json` so part-look can pair it; then the route writes them from the draft.
- Size: L (about 20 settings with render, inspector and tests)
- Depends on: nothing
- Verify by: Mama's drawer rebuilt from blank with no Custom CSS matches `shots/basket/mm-drawer-draft-*.png` at 375 and 1440.
- Same cause elsewhere: Eye Care's hand-built drawer also carries Custom CSS (contents not read, per Bean's rule).

### basket-14: Mama's hand-finished basket page needed 33 Custom CSS rules; each sorted
- Clients and widths: Mama's, all widths.
- Evidence: `local-mamas` page 101, `woocommerce/cart` `sgsCustomCss` and its note (`basket/blocks-local-mamas.json`); the template's `sgs/hero` one more (`overflow:visible`, `basket/tpl-mamas-cart.html`).
- Cause: proved per rule against the commerce-look table (`includes/woocommerce/commerce-look/selectors.json`) and the framework database (`block_attributes` for `woocommerce/cart`):
  - Item card padding 14px and 2px bottom border restated: the settings exist (`sgsItemPadding`, `sgsItemBorderWidth`) but lose to WooCommerce's narrow-width rules (`is-medium`, `is-small`, the under-920px query): plugin bug (Task 3, settings that lose).
  - Item grid columns per width (picture 72px or 96px, text `minmax(0,1fr)`, price `auto`) under 920px: plugin bug (Task 3, the item-card columns; basket-7).
  - One column from 920 to 1023px (the draft stacks below 1024px, WooCommerce below 920px): missing setting (the layout's stacking width).
  - Quantity number 16px bold; minus and plus at full strength, 20px, cocoa: missing settings (the stepper's number and button type; no `item_stepper` column holds type).
  - Summary flat on the pink (inner card removed): plugin bug (Task 3, `sgsSummaryWrapsButton`).
  - Summary title shown at every width: missing setting (basket-7).
  - Summary title and title-text margins, totals wrapper padding and borders, the totals block's 2px dashed top rule: settings exist now (`sgsSummaryTitleTextMargin`, `sgsTotalsWrapperPadding`, `sgsSummaryRowDivider`, the `total_divider` row), the title and totals ones flagged "known not to paint" in the compare; the dashed rule above Total: hypothesis that `total_divider` holds it (check its columns).
  - `.wc-block-components-totals-wrapper:empty{display:none}`: plugin fix for every site (an empty wrapper keeps its padding).
  - Coupon and gift card toggles (16px bold, 44px), forms, field, Apply and the gift card's terms: coupon settings exist (`sgsCouponLabel*`, `sgsCouponControlHeight`, the `coupon_apply` row); the gift card panel has none (Task 3, known).
  - Shipping method line ("Royal Mail Tracked 48") at 14px cocoa and the totals item description: missing (no row for `.wc-block-components-totals-shipping__via`).
  - Empty cart block padding 0: one-off until the empty state is built (basket-2).
  - Block `overflow-x: clip` with a 12px clip margin, and the hero's `overflow: visible`: keep the summary's 8px hard shadow from being cut off: a true one-off today; a plugin fix if the hero's clipping is not wanted on any site (hypothesis).
  - Bottom margins removed so the footer's padding is the only gap: one-off.
- Layer and owner: as listed per rule (plugin round for the missing settings, Task 3 for the plugin bugs).
- Fix: as listed.
- Size: L in total
- Depends on: basket-2
- Verify by: Mama's basket rebuilt from blank with no Custom CSS matches the draft at 375, 768 and 1440.
- Same cause elsewhere: the checkout block's Custom CSS (the hand note says the summary card is kept identical on basket and checkout).

### basket-15: Smaller drawer differences, and what already works
- Clients and widths: as noted, all widths.
- Evidence and cause:
  - Mama's: no "Add a Taster Trio for a friend" upsell row when the basket lacks the trio (draft `showUpsell`); `sgs/cart` has no upsell setting (`emptyProductId` serves only the empty state). Block setting gap (plugin round): an upsell row (product, words, Add button).
  - Mama's: the line reads "Zookies" over "8 · Classic oat · Milk choc · 8 Vanilla" where the draft reads "Zookies · 20 pack" over "Oat · Milk choc · Strawberry" (the hand-finished page shows the same as the copy): the pack attribute prints its bare term and the flavour pick its count. Hypothesis: site data (attribute term names) plus the plugin's pick-line format.
  - Eye Care: "Add my prescription" shows on every line, including a product with no lens flow, because `src/blocks/cart/item-row-template.js` shows it whenever `itemShowAddOptions` is on and the line has a permalink; the draft offers it only on frames. Plugin: show it only on a product linked to a choice flow. Low.
  - Eye Care, 375: the header's "BAG" trigger is white on the cream bar (the width ladder's `& .sgs-cart__trigger{color:rgb(255,255,255)}` under 768px, `ec-cartpage-pre-375.png`): the general session's header.
  - Works on both: focus lands on Close when the drawer opens, Tab stays inside, Escape closes and returns focus to the trigger, a click on the scrim closes it, the page cannot scroll behind, the stepper's plus updates the subtotal (£9.50 to £19), and every control shows a 3px (Mama's) or 2px (Eye Care) focus ring (`basket/focus.mjs`, `drawer.mjs --interact`, `lock.mjs`). Mama's empty drawer matches the draft (`pair-mm-drawer-empty-375.png`).
- Size: S each
- Depends on: nothing
- Verify by: pairs at 375 and 1440.

## Pictures and probes

Pictures (`E:\sgs-tmp\template-rework\investigation\shots\basket\`):
- Drawer, draft against copy: `pair-mm-drawer-375.png`, `pair-mm-drawer-1440.png`, `pair-ec-drawer-375.png`, `pair-ec-drawer-1440.png`; empty: `pair-mm-drawer-empty-375.png`, `-1440.png`, `pair-ec-drawer-empty-375.png`, `-1440.png`; singles `mm-drawer-draft-*.png`, `mm-drawer-pre-*.png` (and `-after-plus`), `ec-drawer-draft-*.png`, `ec-drawer-pre-*.png`; focus crops `mm-focus-0..7.png`, `ec-focus-0..7.png`.
- Mama's basket page: `pair-mm-cart-pre-375.png`, `pair-mm-cart-pre-1440.png` (draft left, copy right; `.partN.png` strips), `pair-mm-cart-hand-vs-copy-375.png`, `-1440.png` (hand-finished `local-mamas` left, copy right).
- Eye Care `/cart/`: `ec-cartpage-pre-375.png`, `ec-cartpage-pre-1440.png`.

Probes and data (`E:\sgs-tmp\template-rework\investigation\basket\`):
- `drawer.mjs` (opens the drawer on a draft or a copy, dumps parts and looks, checks focus, Escape, scrim and the stepper; JSON beside each picture), `focus.mjs`, `lock.mjs`, `dark.mjs`, `dark2.mjs`, `ec-cart-page.mjs`, `pill.mjs`.
- `blocks.php` (read-only `sgs/cart` and `woocommerce/cart` attributes) with `blocks-local-mamas.json`, `blocks-local-mediatest-trlab.json`, `blocks-local-mediatest-trec.json`, `blocks-local-eye-care.json`; `names.php` and `ec-hand-names.txt` (eye-care-test names only); `tpl.php` with `tpl-trlab-cart.html`, `tpl-mamas-cart.html`; `mm-cart.html`, `ec-shop.html`.
- Part-look reports without writes: `pl-mm-header-compare/`, `pl-mm-cart-compare/`, `pl-ec-header-compare/` (each `report.md`, `report.json`, `.log`).
