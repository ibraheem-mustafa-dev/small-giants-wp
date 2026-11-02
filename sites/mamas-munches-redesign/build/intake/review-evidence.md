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

## Re-settled 2026-11-02

140 blank skeleton rows after the re-proposal; 136 marked `accept` (the proposal stands), 4 left blank (see Judgement). Sources: the draft's code in `handoff/*.dc.html`, the built mirror at http://localhost:8084 (home, contact; built before this re-proposal), the blocks' own `block.json` / `panel-extras.js` / `panel-render.js`.

### Groups

- **Cart drawer parts, absorbed (7 rows, review.md `basket-drawer-right:Home>SiteHeader@7#0/129, 130, 176, 178, 181` and `site-header-announcement-strip-bar:.../53, 54`)**: accept. `sgs/cart` draws the panel heading with its live "(N)" (`panel-extras.js::updatePanelExtras`), the empty message ("Your basket is empty") and the empty-state CTA ("Browse the shop") from `emptyCartMessage` / `emptyCartCtaLabel`; the mirror's header carries `data-empty-message="Your basket is empty" data-empty-cta-label="Browse the shop"`. The opener's label and count are the pill trigger (Bean S5, 2026-10-23).
- **Cart empty-state logo image, upsell sentence and "Add a Taster Trio" button (3 rows: `.../177, 179, 180`)**: left blank, see Faults.
- **Build-your-Zookie flow parts, absorbed (about 62 rows: `build-your-zookie:Home/64` and `page-home-dc-html:Home/65` to `123`)**: accept (Bean 2026-11-01: inline flow). The mirror's flow renders Base / Chips / Flavours (with the "Pick up to 3 and we'll split your box between them" hint) / How many (8, 20, 40 with prices and badges), "Subscribe & save 10%", "Skip, swap or cancel any time", "One-off box", "Every 2 weeks / Every 4 weeks", the trust line and the summary. Prices (£19.35, £21.50), the "Your 20: ..." and "20 x ..." summary lines and the "Subscribe · £x" button label are computed in the draft (`{{ ... }}` state) and drawn by the flow's pricing, summary and result step. The eyebrow, h2 and intro (Home/67, 68, 69) are separate blocks in the linked flow's post (mirror: `sgs/label`, `sgs/heading`, `sgs/text` before the flow), which `choiceFlow` allows (FR-43-6).
- **Contact form parts, absorbed (16 rows: `page-contact-dc-html:Contact/45` to `67`)**: accept. The mirror's contact form holds "Send a message", "What's it about?" with its five tile options, Your name *, Email *, Order number, Message * and "Send message →". On the form's own surface the same elements are `sgs/heading`, container, `sgs/form-field-tiles`, text/email/textarea fields and `sgs/button` (formControl, optionSetForm and the 0.75 to 1 confidence rows): accept (9 + 1 + 4 rows).
- **Announcement strip bar (5 rows `.../16` to `20`)**: remove. Bean chose remove on 2026-11-01; the rule change only re-proposed a container, and the four children sit inside that removed element.
- **`block:sgs/heading` (18 rows)**: accept. Sampled in the draft: Help/79 Privacy policy (`<b>`, Young Serif 20px above a paragraph), Home/172 Oats (Young Serif 22px above its description), Shop/35 Build your own box (Young Serif at the h2 size), footer and drawer "say hello" (Caveat 24px column title; sibling column titles are `sgs/heading` by columnHeading, no other heading in the column). The same shape (a title above its description or card) applies to the other rows of the group.
- **`block:sgs/icon` (5 rows)**: accept. A tick in a 32px yellow circle with a 2px border (Home line 166). `sgs/icon` takes an emoji or text glyph and draws its own circle and border (`block.json`: `emojiChar`, `shape`, `borderWidth`).
- **`block:sgs/label` (26 rows)**: accept. Caveat script eyebrows above a heading (Bean 2026-10-31), the "Who are you shopping for?" 13px uppercase kicker, the pink "baked with love" ribbon (draft: 2px border, clip-path point; `sgs/label` has `borderWidth` and `endShapeRight`), the step-number badge and the "Free delivery on 20 and 40 packs" chip (sibling chip is already `sgs/label`). Contact/75 "quick answers" is the eyebrow above the now-FAQ accordion (draft edited 2026-11-01).
- **Remove (2 rows)**: Help/63 "Prices and timings to be confirmed by Zainab." is a note to the client (13px line under the table), not design. Home/146 is the gift carousel's dot buttons (draft line 138, `scrollTo` handlers); no block draws controls for a product collection and copied buttons would be dead; the track still swipes, so nothing is lost (degrade to more content). The old mirror shows four "Click Here" dead buttons from them.

### Judgement for Bean

1. **Basket page item-count pill (`page-basket-dc-html:Basket/12#0`, "2" beside "Your basket")**: draft shows a yellow pill inside the h1, filled from live state (`{{ count }}`). Options: (a) `sgs/label` as proposed: a static "2" that never changes, and a block-level label cannot sit inline inside the h1; (b) remove it: the page title reads "Your basket" and the count lives only in the header pill. Recommend (b), because (a) is a dead number on a live page.
2. **Cart drawer empty state (3 rows)**: draft shows the round logo, "New to Zookies? The Taster Trio is 3 cookies for £5, postage included." and a pink "Add a Taster Trio · £5" button above "Browse the shop". `sgs/cart` draws only the message and the Browse link. Options: (a) accept the loss, the empty drawer shows message plus Browse the shop; (b) build an upsell slot (logo image, sentence, add-to-bag button for a chosen product) into `sgs/cart`'s empty state. Recommend (b) if the Taster Trio nudge matters to Zainab's conversion, otherwise (a); either way mark the three rows `remove`.

### Faults found

- **`cardTitle` marks card kickers as headings** (rows already marked accept, not blank): `nav-drawer-left:.../66, 71`, `page-home-dc-html:Home/50, 58, 160`, `page-gifts-dc-html:Gifts/76`, `page-help-dc-html:Help/86`, `page-shop-dc-html:Shop/40, 47`. Their own reason says "text set as a kicker stays a label", and Bean's 2026-10-31 ruling makes a kicker above a title `sgs/label`; the same cards' titles are the heading rows settled above, so each card now holds two headings. Not edited here (outside the blank rows); these nine should be `block:sgs/label`.
- **`sgs/cart` empty state has no image, upsell text or add button** (Judgement 2); the mirror's header cart is also an older build (icon and "0" badge, panel heading "Your cart", not the pill "Basket" and "Your basket").
- **The built home flow is a stepped wizard** ("Step 1 of 6", Back, Continue) while the draft shows all four choices at once with the numbered labels "1 · Base" to "4 · How many"; the numbers become the progress count. Confirm FR-43-24's compact layout shows all choices together before sign-off (mirror predates this re-proposal).
- **Row 435 `Help/63` and 436 `Home/146` carry a `was` prior proposal** (`sgs/text`, `sgs/multi-button`): the new remove is by evidence above.
