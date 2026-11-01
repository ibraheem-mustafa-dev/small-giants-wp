# Review evidence: mamas-munches-redesign

Scope: the 639 rows still blank after Bean's restored decisions. Marks written into review.md: 600. Left blank: 39 (37 adopt-rule, 1 judgement, 1 fault). No Accept all box ticked.

## Settled by evidence

### Skeleton rows, confident / low / agent-pick (588 rows: 573 + 6 + 9; marked `accept`, except Home/149 below)
Method: grouped every row by tag and proposed block (59 shapes) and checked the shapes against the tag, the words and the draft's code. Distinct surfaces covered: header, nav drawer, basket drawer, footer, home, shop, product, gifts, basket, checkout, contact, help, sign-in, account and the 16 sub-surfaces.
- span/div/p/b/h3 holding words go to sgs/text, sgs/heading or sgs/label by the draft's tag and role: matches the live pages (about 97 sgs/text, 33 sgs/heading on the live home).
- Absorbed (div 52, span 24, label 30, input 29, button 16 and others): each cites the owning block in its reason (`drawn by sgs/container: rule commerceRegion`, `drawn by sgs/account: rule ownedPart`, `drawn by core/post-content: rule ownedPart`, `drawn by sgs/form-field-tiles`). The live my-account page has wp-block-sgs-account and the contact page draws its tiles legend.
- Removed (button 8, div 20, span 11, input/label/textarea 8): every reason is either "inside a removed element (<key>)" or a Bean ruling (slider arrows removed, Bean 2026-11-01; Bean 2026-10-31 accepted removes).
- Footer `<a> "Website by Small Giants Studio"` to sgs/business-info: `plugins/sgs-blocks/src/blocks/business-info/block.json` has the `attribution` display type (website credit); the live footer renders `sgs-business-info-wrap`.
- Footer Footer/57 span to sgs/multi-button holds the Privacy and Terms buttons (Footer/58 and 59): correct.
- Checkout header rows (7, 11, 12): site-header, responsive-logo, text with a stated reason.
- Low-confidence rows: Header Basket label and count (`Home>SiteHeader@7#0/53#0`, `/54#0`), drawer "Your basket (0)" (`/130#0`), `Checkout/50#0`, `/115#0`, `/118#0`: plain text, correct as sgs/text.

### Skeleton rule-changed, keep Bean's choice (1 row, `accept`)
- `site-footer:Home>SiteFooter@250#0/3#0` (section): Bean chose sgs/site-footer-row on 2026-10-29. The live footer builds sgs-site-footer-row and renders correctly (the contact pair image). The row's `ruleWould` is sgs/container with an empty reason, so the rule gives no cause for the change. Keep Bean's choice.

### Skeleton rule-changed, mark written (1 row, `remove`)
- `page-home-dc-html:Home/149#0`: the div holds only the two slider arrows Home/150 and Home/151. Bean ruled them removed on 2026-11-01 because the testimonial slider draws its own arrows. A multi-button or container left around nothing is an empty block, so the wrapper goes too.

### Catalogue (2 rows `accept`, 1 `accept`)
- `catalogue:zookies`, `catalogue:giftcard`: `build/catalogue.json` (slug `zookies`, slug `baby-shower-gift-card`, price 15) matches `handoff/Product.dc.html` (`isCard ? { id: 'giftcard', name: 'Baby Shower Gift Card' ...`) and `Gifts.dc.html`. The "changed" tag is the label only; the address and price are unchanged.
- `catalogue-gap:zookies:switch:1` (subscribe and save, 10% off): accept records it as not built. WooCommerce core cannot do it. Whether to buy a subscriptions plugin is a business question, noted under Judgement.

### Missing features (2 rows, `gap:shop, forms and data`)
- `missing:coverage:html:fieldset`, `html:legend`: the 4 uses are the checkout's steps, which WooCommerce's Checkout block draws (rule ownedPart). The contact page's own fieldset and legend are drawn by sgs/form-field-tiles. Same wave as the sibling `aria-*` rows already marked.

### Script effects and inventory diffs
- `effect:J-08` `accept`: `handoff/Home.dc.html` has `this.auto = setInterval(() => {... this.step(1, true)}, 6000)` and the pointer, hover and focus holds.
- Inventory diffs (4 rows, `ours`): the draft's code at `Home.dc.html` line 265 is a repeating interval of 6000 ms (delay 6000, infinite). Claude Design's J-05 says press, delay 0, one iteration: wrong. The only-ours J-08 effect is real (same line).

## Adopt rule (decision to delete)
Left blank on purpose. Where the rule's new proposal is right, Bean's October saved decision should be deleted so the rule applies (37 rows).

Live evidence is the local mirror at http://localhost:8084 as built. Note that the home page on the mirror was not rebuilt with the new rules (no testimonial slider, accordion or product collection in its HTML), so the home rows rest on the draft's code and the rule text, not the live page. The shop, help and account pages were built with the new rules and confirm theirs.

- Drawer close buttons `nav-drawer-left:.../59#0`, `basket-drawer-right:.../132#0` (2): the button writes a falsy value to the drawer's own open state, so the sgs/nav-drawer block's own close control draws it (the live home has 18 `wp-block-sgs-nav-drawer`). Rule adopts absorbed.
- Home/132#0, Product/136#0, Gifts/37#0 (3): loops of items with price and a product link are woocommerce/product-collection (FR-48-83). Gifts matches Bean's ruling (the gift finder is a filtered product listing).
- Shop/21#0 (product-filters), Shop/27#0 (count and sort absorbed), Shop/28#0 (product-collection) (3): the built shop page shows 8 `wc-block-product-filter-chips__item`, so the filter chips work.
- Home/222#0, 224 (testimonial-slider and testimonial) (2): the draft's script steps the review track with a timer, pointer drag and arrows (`Home.dc.html` `step`, `setInterval`); Bean's ruling removes the arrows because the slider draws them.
- Home/243#0, 245 and Help/26 (accordion and accordion-item) (3): the control writes the state its own panel reads. The built help page shows 12 `wp-block-sgs-accordion-item`.
- SignIn/15#0, Account/19#0 (sgs/account) (2): the built my-account page has `wp-block-sgs-account` with `sgs-account__wc` (Bean 2026-10-26).
- Basket/22#0 and Checkout/17#0 (post-content) (2): the cart and checkout page content is WooCommerce's Cart and Checkout blocks (the live `/cart/` page has `wc-block-cart`).
- Basket/23, 24, 26, 31, 41, 44, 56 and Checkout/31, 32, 42, 57, 60, 71, 72, 85, 106, 121, 125, 127 (19 rows): the descendants of those two Woo blocks. Nothing is built from them, so whichever of unwrap, remove or container is chosen draws nothing. The adopted rule leaves them unwrapped. See Faults for the wrong reason text.
- Contact/47#0 (remove): "What's it about?" is the label of the tiles field Contact/48; sgs/form-field-tiles draws it as its legend (the contact pair image shows it once).

## Judgement for Bean
1. Contact "quick answers" links (`page-contact-dc-html:Contact/77=sgs/icon-list`). The draft shows four full-width link rows, each with a circled arrow at the right. Bean chose sgs/icon-list for the first link (2026-10-29), and the other three links of the same template are keyed sgs/button, so one template is split two ways. Today's rules propose sgs/button for all four. The built page shows four centred, content-width pills with an inline arrow, which does not match the draft's rows. Recommendation: icon-list for all four (a list of link rows with an arrow icon). Mark `accept` and the other three `block:sgs/icon-list`.
2. Subscribe and save (10% off, shown in the draft's menu and on the product page). WooCommerce core cannot do it; it needs a subscriptions plugin (paid). Recorded as not built. Options: build with a plugin, or take the offer out of the design. Recommendation: decide before the build.

## Faults found
1. The rule reason for unwrap on Basket/23-56 and Checkout/31-125 says "inside a hero, its image is the hero's own split media". These rows are inside the cart and checkout bodies, not a hero (the hero is Basket/9 and Checkout/17). The reason string is wrong or the rule fires too broadly; the outcome is harmless because Woo draws them, but the wording misleads a reviewer.
2. `Checkout/72#0` legend "2 · Who's it for?" gets reason "the field's label ... the field block's own label draws it". A legend is a step heading, not a field label. Harmless because Woo draws the checkout, but the same rule would remove a real heading elsewhere.
3. `effect:J-08:autoplaySpeed` says the timer interval is not in the draft's code. It is: `Home.dc.html` line 265, `setInterval(..., 6000)`, and the inventory's own `delay_ms` is 6000. The effect row proposes `difference` when it should write autoplaySpeed 6000. Left blank (no mark fits).
4. Footer/3 `ruleWould` is sgs/container with an empty reason: no cause is given for overturning Bean's footer-row choice.
5. Contact/77: copies of one template element are keyed by two blocks (see Judgement 1).
6. The home page on the mirror was not rebuilt with the new rules, so the home rule-changed rows have no live confirmation.
