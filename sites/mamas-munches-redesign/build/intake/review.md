# Intake review: mamas-munches-redesign

Taken on 2026-10-27T15:34:36.289Z; manifest 1.0, files hash d5ed630059b071ef.

How to mark: put x in a section's `Accept all: [ ]` box to give every row the section's first mark; to mark one row differently, write its mark in that row's Mark cell (a row's own mark always beats Accept all). Flag rows left blank are accepted as flagged and not-a-defect rows left blank stay not defects; every other row needs Accept all or its own mark. Rows marked **changed** differ from the last export, lost their old mark and come first. Then run `node scripts/computed-route/intake.mjs --apply-review mamas-munches-redesign`.

Rows: 1589; 798 need reading, 791 are confident proposals that Accept all covers (skeleton block choices 764, missing features 27).

Not defects counted, not listed: breakpoint 6, reached-when-forced 204, render-wins 713.

Marks per section (first value = Accept all):
- Page map: `accept`, `edit:<field>=<value>`, `drop`
- Palette roles: `accept`, `role:<slug>[,<slug>...]`, `one-off`
- Site Info: `accept`, `edit:<value>`, `drop`
- Flags: `accept-flagged`, `not-flagged`
- Draft defects: `accept`, `render-wins`
- Not defects: unwired code: `not-a-defect`, `defect`
- Missing features: `map:<block>`, `difference`, `build`, `gap:<wave>`
- Script effects: `accept`, `block:<slug>`, `difference`
- Skeleton block choices: `accept`, `block:<slug>`, `remove`
- Inventory diffs: `ours`, `theirs`
- Notices: `noted`

## Page map (page-map)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `page:page:cart` | Basket.dc.html → Your basket (page, static, cart) | cart |  | accept |
| `page:page:checkout` | Checkout.dc.html → Checkout (page, static, checkout) | checkout |  | accept |
| `page:page:contact` | Contact.dc.html → Contact (page, static, page) | contact | footer-help #4, header #5, drawer-menu-links #7 | accept |
| `page:page:gifts` | Gifts.dc.html → Gifts for new mums (page, static, page) | gifts | footer-shop #4, header #2, drawer-menu-links #4 | accept |
| `page:page:help` | Help.dc.html → Help & FAQs (page, static, page) | help | footer-help #1, header #4, drawer-menu-links #6 | accept |
| `page:page:home` | Home.dc.html → Handmade lactation cookies (page, static, front-page) | home | footer-shop #2 | accept |
| `page:page:my-account` | Account.dc.html → My account (page, static, page) | my-account |  | accept |
| `page:product:product` | Product.dc.html → Product (product, live, single-product) | product | footer-shop #3, header #3, drawer-menu-links #2 | accept |
| `page:sgs_choice_flow:choice-flow-build-your-zookie` | (no route) → Build your Zookie (sgs_choice_flow, static) | choice-flow-build-your-zookie |  | accept |
| `page:sgs_choice_flow:choice-flow-gifts-she-ll-actually-eat` | (no route) → Gifts she’ll actually eat (sgs_choice_flow, static) | choice-flow-gifts-she-ll-actually-eat |  | accept |
| `page:sgs_drawer:drawer-menu` | (no route) → Menu (sgs_drawer, static) | drawer-menu |  | accept |
| `page:sgs_footer:footer` | (no route) → Footer (sgs_footer, static) | footer |  | accept |
| `page:sgs_form:form-send` | (no route) → send (sgs_form, static) | form-send |  | accept |
| `page:sgs_header:header` | (no route) → Header (sgs_header, static) | header |  | accept |
| `page:shop:shop` | Shop.dc.html → All Zookies (shop, live, archive-product) | shop | footer-shop #1, header #1, drawer-menu-links #1 | accept |
| `page:template:order-confirmation` | Confirmation.dc.html → Order confirmed (template, static, order-confirmation) | order-confirmation |  | accept |

## Palette roles (palette-role)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `palette:--mm-badge` | --mm-badge #EE8088 | role:accent | 0.98: the draft declares --mm-badge: var(--mm-pink); usage agrees | accept |
| `palette:--mm-body` | --mm-body #4E3C31 | role:custom-mm-body | 0.3: name says body text, but text is read from usage on --mm-cocoa (#3A2A22) | accept |
| `palette:--mm-cocoa` | --mm-cocoa #3A2A22 | role:heading,primary-text,accent-text,section-text,border,text,link-hover | 0.85: the most used heading colour on light grounds (55 headings) | accept |
| `palette:--mm-cream` | --mm-cream #FBF3DC | role:footer-bg,surface | 0.85: the footer's ground on 10 page(s) | accept |
| `palette:--mm-cta` | --mm-cta #F9CF6E | role:primary | 0.98: the draft declares --mm-cta: var(--mm-yellow); usage agrees | accept |
| `palette:--mm-focus` | --mm-focus #3A2A22 | role:heading,primary-text,accent-text,section-text,border,text,link-hover | 0.85: the most used heading colour on light grounds (55 headings) | accept |
| `palette:--mm-image-bg` | --mm-image-bg #F3E6CC | role:custom-mm-image-bg | 0.3: name says surface, but surface-alt is read from usage on --mm-paper (#FFFAF0) | accept |
| `palette:--mm-line` | --mm-line #EADBC0 | role:border-light | 0.85: the next divider line colour by length, lighter than the border (24040 px) | accept |
| `palette:--mm-line-dashed` | --mm-line-dashed #E6D4B4 | role:custom-mm-line-dashed | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--mm-link` | --mm-link #A8404F | role:link | 0.98: the draft declares --mm-link: var(--mm-pink-dark) (the slug's own name); usage agrees | accept |
| `palette:--mm-link-hover` | --mm-link-hover #3A2A22 | role:link-hover,heading,primary-text,accent-text,section-text,border,text | 0.95: the draft declares --mm-link-hover: var(--mm-cocoa) (the slug's own name) | accept |
| `palette:--mm-muted` | --mm-muted #5E4A3D | role:text-muted | 0.98: the draft declares --mm-text-muted: var(--mm-muted) (the slug's own name); usage agrees | accept |
| `palette:--mm-muted-2` | --mm-muted-2 #6B5646 | role:custom-mm-muted-2 | 0.3: name says muted text, but text-muted is read from usage on --mm-muted (#5E4A3D) | accept |
| `palette:--mm-outline` | --mm-outline #3A2A22 | role:border,heading,primary-text,accent-text,section-text,text,link-hover | 0.98: the draft declares --mm-outline: var(--mm-cocoa); usage agrees | accept |
| `palette:--mm-paper` | --mm-paper #FFFAF0 | role:text-inverse,surface-alt | 0.85: the most used text colour on the dark ground #3A2A22 (weight 9) | accept |
| `palette:--mm-pink` | --mm-pink #EE8088 | role:accent | 0.98: the draft declares --mm-badge: var(--mm-pink); usage agrees | accept |
| `palette:--mm-pink-band` | --mm-pink-band #F5C2C8 | role:custom-mm-pink-band | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--mm-pink-dark` | --mm-pink-dark #A8404F | role:link | 0.98: the draft declares --mm-link: var(--mm-pink-dark) (the slug's own name); usage agrees | accept |
| `palette:--mm-pink-soft` | --mm-pink-soft #F9D5D3 | role:section | 0.85: the most used ground after the page, raised and primary grounds (111 elements) | accept |
| `palette:--mm-rule` | --mm-rule #3A2A224D | role:custom-mm-rule | 0.3: name says border, but border is read from usage on --mm-cocoa (#3A2A22) | accept |
| `palette:--mm-rule-soft` | --mm-rule-soft #3A2A2247 | role:custom-mm-rule-soft | 0.3: name says border, but border is read from usage on --mm-cocoa (#3A2A22) | accept |
| `palette:--mm-script` | --mm-script #8E3444 | role:custom-mm-script | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--mm-script-gold` | --mm-script-gold #7A5A12 | role:custom-mm-script-gold | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--mm-selected` | --mm-selected #F9CF6E | role:primary | 0.98: the draft declares --mm-cta: var(--mm-yellow); usage agrees | accept |
| `palette:--mm-sparkle` | --mm-sparkle #E86A75 | role:custom-mm-sparkle | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--mm-surface-band` | --mm-surface-band #F5C2C8 | role:custom-mm-surface-band | 0.3: name says surface, but surface-alt is read from usage on --mm-paper (#FFFAF0) | accept |
| `palette:--mm-surface-card` | --mm-surface-card #FFFAF0 | role:text-inverse,surface-alt | 0.85: the most used text colour on the dark ground #3A2A22 (weight 9) | accept |
| `palette:--mm-surface-page` | --mm-surface-page #FBF3DC | role:surface,footer-bg | 0.98: the draft declares --mm-surface-page: var(--mm-cream); usage agrees | accept |
| `palette:--mm-surface-panel` | --mm-surface-panel #F9D5D3 | role:section | 0.85: the most used ground after the page, raised and primary grounds (111 elements) | accept |
| `palette:--mm-surface-panel-alt` | --mm-surface-panel-alt #FCEBBE | role:custom-mm-surface-panel-alt | 0.3: name says surface, but surface-alt is read from usage on --mm-paper (#FFFAF0) | accept |
| `palette:--mm-tape` | --mm-tape #F9CF6ED9 | role:custom-mm-tape | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--mm-text` | --mm-text #3A2A22 | role:text,heading,primary-text,accent-text,section-text,border,link-hover | 0.98: the draft declares --mm-text: var(--mm-cocoa) (the slug's own name); usage agrees | accept |
| `palette:--mm-text-body` | --mm-text-body #4E3C31 | role:custom-mm-text-body | 0.3: name says body text, but text is read from usage on --mm-cocoa (#3A2A22) | accept |
| `palette:--mm-text-muted` | --mm-text-muted #5E4A3D | role:text-muted | 0.98: the draft declares --mm-text-muted: var(--mm-muted) (the slug's own name); usage agrees | accept |
| `palette:--mm-white` | --mm-white #FFFFFF | role:custom-mm-white | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--mm-yellow` | --mm-yellow #F9CF6E | role:primary | 0.98: the draft declares --mm-cta: var(--mm-yellow); usage agrees | accept |
| `palette:--mm-yellow-soft` | --mm-yellow-soft #FCEBBE | role:custom-mm-yellow-soft | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |

## Site Info (site-info)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `siteinfo:copyright` | copyright: © 2026 Mama’s Munches · Registered food business | © 2026 Mama’s Munches · Registered food business | SiteFooter.dc.html | accept |
| `siteinfo:email` | email: Zainab@mamasmunches.com | Zainab@mamasmunches.com | Contact:34, Contact:39, Contact.dc.html, SiteFooter:43, SiteFooter.dc.html, SiteHeader:112, SiteHeader.dc.html | accept |
| `siteinfo:site_title` | site_title: Mama's Munches | Mama's Munches | Home:1, Account:1, Basket:1, Checkout:1, Confirmation:1, Contact:1, Gifts:1, Help:1, Shop:1, SignIn:1 | accept |
| `siteinfo:socials.instagram` | socials.instagram: https://www.instagram.com/mamasmunches/ | https://www.instagram.com/mamasmunches/ | Confirmation:67, Confirmation.dc.html, Contact:26, Contact.dc.html, SiteFooter:9, SiteFooter:16, SiteFooter:45, SiteFooter.dc.html, SiteHeader:117, SiteHeader.dc.html | accept |
| `siteinfo:tagline` | tagline: Handmade lactation cookies | Handmade lactation cookies | Home:1 | accept |

## Flags (flag)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `flag:placeholder:Checkout:53` | placeholder: you@example.com | accept-flagged | placeholder host example.com | accept-flagged |
| `flag:placeholder:README.md:77` | placeholder: **Help.** Pink hero with search (filters questions and answers) and category chips (All, Ordering & delivery, Ingredients & allergens, Breastfeeding, Gifting, Subscriptions). 12 FAQs as an accordion with a category label; "No answers for that yet. Ask Zainab" when empty. `#delivery` table (Tracked 48 £3.95, free over £35; Tracked 24 £5.45; Taster Trio & gift cards included), `#allergens` panel, `#legal` placeholders, "still stuck? Message Zainab". | accept-flagged | the README names this as a placeholder | accept-flagged |
| `flag:placeholder:SignIn.dc.html:js:154:101` | placeholder: Enter an email address like name@example.com | accept-flagged | placeholder host example.com | accept-flagged |
| `flag:prototype-only:Contact.dc.html:54:11` | prototype-only: e => { e.preventDefault(); this.setState({ sent: true }); } | accept-flagged | the submit handler send sets sent with no request: a client-side thank-you | accept-flagged |

## Missing features (missing-feature)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `missing:handler@Home:132/template:onPointerMove` | Home: an element that reacts to the pointer position (onPointerMove) | no block proposed | pointer-tracking: no block capability or fx effect named for it in the framework database | difference |
| `missing:handler@Home:222/template:onPointerMove` | Home: an element that reacts to the pointer position (onPointerMove) | no block proposed | pointer-tracking: no block capability or fx effect named for it in the framework database | gap:behaviour |

### Confident proposals (Accept all covers these)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `missing:coverage:aria-attr:aria-invalid` | aria-attr:aria-invalid seen 8 times in the draft: seen but unsupported | gap:shop, forms and data | aria-attr:aria-invalid has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:aria-role:alert` | aria-role:alert seen 11 times in the draft: seen but unsupported | gap:content, media and icons | aria-role:alert has no clone path yet (has nothing; wave content, media and icons) | gap:content, media and icons |
| `missing:coverage:aria-role:alertdialog` | aria-role:alertdialog seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:alertdialog has no clone path yet (has nothing; wave behaviour recognisers) | gap:behaviour recognisers |
| `missing:coverage:aria-role:group` | aria-role:group seen 1 time in the draft: seen but unsupported | difference | aria-role:group is excluded from cloning (Bean, 2026-10-21: SGS blocks render their own structural semantics; a draft group role has no look) | difference |
| `missing:coverage:aria-role:img` | aria-role:img seen 1 time in the draft: seen but unsupported | gap:content, media and icons | aria-role:img has no clone path yet (has nothing; wave content, media and icons) | gap:content, media and icons |
| `missing:coverage:aria-role:status` | aria-role:status seen 2 times in the draft: seen but unsupported | gap:content, media and icons | aria-role:status has no clone path yet (has nothing; wave content, media and icons) | gap:content, media and icons |
| `missing:coverage:aria-role:tab` | aria-role:tab seen 2 times in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:tab has no clone path yet (has nothing; wave behaviour recognisers) | gap:behaviour recognisers |
| `missing:coverage:aria-role:tablist` | aria-role:tablist seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:tablist has no clone path yet (has nothing; wave behaviour recognisers) | gap:behaviour recognisers |
| `missing:coverage:construct:ref` | construct:ref seen 11 times in the draft: seen but unsupported | difference | construct:ref is excluded from cloning (Bean, 2026-10-21: a DOM handle in the draft's script: wiring only, the effect each one drives is cloned through its target) | difference |
| `missing:coverage:css-function:polygon` | css-function:polygon seen 2 times in the draft: seen but unsupported | gap:content, media and icons | css-function:polygon has no clone path yet (has nothing; wave content, media and icons) | gap:content, media and icons |
| `missing:coverage:css-group:basic-user-interface` | css-group:basic-user-interface seen 165 times in the draft: partly supported | gap:draft reading | css-group:basic-user-interface: Fill does not read accent-color, appearance, cursor, pointer-events, resize (it reads the group's other 2 the draft uses); wave draft reading | gap:draft reading |
| `missing:coverage:css-group:compositing-and-blending` | css-group:compositing-and-blending seen 1 time in the draft: seen but unsupported | difference | css-group:compositing-and-blending is excluded from cloning (Bean, 2026-10-21: the drafts use only isolation, the internal plumbing of the highlight stripe, which is built (Spec 02 FR-2-4); no mix-blend-mode in either draft) | difference |
| `missing:coverage:css-group:logical-properties-and-values` | css-group:logical-properties-and-values seen 2 times in the draft: seen but unsupported | gap:draft reading | css-group:logical-properties-and-values: Fill does not read inset; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:masking` | css-group:masking seen 2 times in the draft: seen but unsupported | gap:draft reading | css-group:masking: Fill does not read clip-path; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:overflow` | css-group:overflow seen 73 times in the draft: seen but unsupported | gap:draft reading | css-group:overflow: Fill does not read overflow, overflow-clip-margin, overflow-x, overflow-y, scroll-behavior, text-overflow; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:scroll-snap` | css-group:scroll-snap seen 22 times in the draft: seen but unsupported | gap:draft reading | css-group:scroll-snap: Fill does not read scroll-margin-top, scroll-padding, scroll-snap-align, scroll-snap-type; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:transforms` | css-group:transforms seen 228 times in the draft: partly supported | gap:draft reading | css-group:transforms: Fill does not read transform-origin (it reads the group's other 1 the draft uses); wave draft reading | gap:draft reading |
| `missing:coverage:css-group:writing-modes` | css-group:writing-modes seen 22 times in the draft: seen but unsupported | difference | css-group:writing-modes is excluded from cloning (Bean, 2026-10-21: false hits: the direction keys are animate() options, not CSS; neither draft sets a writing direction) | difference |
| `missing:coverage:css-pseudo-element:placeholder` | css-pseudo-element:placeholder seen 2 times in the draft: seen but unsupported | gap:modes and values with no CSS property | css-pseudo-element:placeholder has no clone path yet (has nothing; wave modes and values with no CSS property) | gap:modes and values with no CSS property |
| `missing:coverage:html-attr:form.novalidate` | html-attr:form.novalidate seen 7 times in the draft: seen but unsupported | difference | html-attr:form.novalidate is excluded from cloning (Bean, 2026-10-21: sgs/form always renders novalidate and validates in its own script, so there is nothing to write) | difference |
| `missing:coverage:html-attr:global.inputmode` | html-attr:global.inputmode seen 3 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:global.inputmode has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:input.checked` | html-attr:input.checked seen 6 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.checked has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:input.minlength` | html-attr:input.minlength seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.minlength has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html:fieldset` | html:fieldset seen 8 times in the draft: seen but unsupported | gap:shop, forms and data | html:fieldset has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html:legend` | html:legend seen 4 times in the draft: seen but unsupported | gap:shop, forms and data | html:legend has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:input-type:date` | input-type:date seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | input-type:date has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:input-type:password` | input-type:password seen 7 times in the draft: seen but unsupported | gap:shop, forms and data | input-type:password has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |

## Skeleton block choices (skeleton-block)

Accept all: [ ]

### Needs a decision (unresolved): no block (6)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:build-your-zookie:Home/106#0` | build-your-zookie Home/106#0 <div> "20 × Classic oat, milk choc chips, strawberry & mango" | no block | 1: the choice flow (Spec 43) holds no setting for this element: build it, map it to a flow setting or record it as a deliberate difference | accept |
| `skeleton:build-your-zookie:Home/108#0` | build-your-zookie Home/108#0 <button> | no block | 1: the choice flow (Spec 43) holds no setting for this element: build it, map it to a flow setting or record it as a deliberate difference | accept |
| `skeleton:build-your-zookie:Home/119#0` | build-your-zookie Home/119#0 <button> | no block | 1: the choice flow (Spec 43) holds no setting for this element: build it, map it to a flow setting or record it as a deliberate difference | accept |
| `skeleton:build-your-zookie:Home/123#0` | build-your-zookie Home/123#0 <div> "Baked fresh for you · with you in 3–5 days · free UK delivery over £35" | no block | 1: the choice flow (Spec 43) holds no setting for this element: build it, map it to a flow setting or record it as a deliberate difference | accept |
| `skeleton:build-your-zookie:Home/67#0` | build-your-zookie Home/67#0 <div> "your cookie, your way" | no block | 1: the choice flow (Spec 43) holds no setting for this element: build it, map it to a flow setting or record it as a deliberate difference | accept |
| `skeleton:build-your-zookie:Home/69#0` | build-your-zookie Home/69#0 <p> "Nothing sits on a shelf. Pick a base, your chips and a fruit, and Zainab bakes your box fresh." | no block | 1: the choice flow (Spec 43) holds no setting for this element: build it, map it to a flow setting or record it as a deliberate difference | accept |

### Needs a decision (low): block:sgs/business-info (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-footer:Home>SiteFooter@250#0/60#0` | site-footer Home>SiteFooter@250#0/60#0 <a> "Website by Small Giants Studio" | block:sgs/business-info | 0.38 | accept |

### Needs a decision (low): block:sgs/icon (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/24#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/24#0 <a> | block:sgs/icon | 0.5 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/45#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/45#0 <a> | block:sgs/icon | 0.5 | accept |

### Needs a decision (low): block:sgs/media (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/64#0` | nav-drawer-left Home>SiteHeader@7#0/64#0 <img> | block:sgs/media | 0.29 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/69#0` | nav-drawer-left Home>SiteHeader@7#0/69#0 <img> | block:sgs/media | 0.29 | accept |
| `skeleton:page-home-dc-html:Home/199#0` | page-home-dc-html Home/199#0 <img> | block:sgs/media | 0.29 | accept |
| `skeleton:page-home-dc-html:Home/48#0` | page-home-dc-html Home/48#0 <img> | block:sgs/media | 0.29 | accept |
| `skeleton:page-home-dc-html:Home/56#0` | page-home-dc-html Home/56#0 <img> | block:sgs/media | 0.29 | accept |

### Needs a decision (low): block:sgs/multi-button (14)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-account-dc-html:Account/22#0` | page-account-dc-html Account/22#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-basket-dc-html:Basket/68#0` | page-basket-dc-html Basket/68#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-checkout-dc-html:Checkout/35#0` | page-checkout-dc-html Checkout/35#0 <div> | block:sgs/multi-button | 0.51: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-home-dc-html:Home/116#0` | page-home-dc-html Home/116#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home-dc-html:Home/146#0` | page-home-dc-html Home/146#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home-dc-html:Home/149#0` | page-home-dc-html Home/149#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home-dc-html:Home/20#0` | page-home-dc-html Home/20#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home-dc-html:Home/219#0` | page-home-dc-html Home/219#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home-dc-html:Home/233#0` | page-home-dc-html Home/233#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home-dc-html:Home/24#0` | page-home-dc-html Home/24#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/21#0` | page-product-dc-html-id-zookies Product/21#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-signin-dc-html:SignIn/23#0` | page-signin-dc-html SignIn/23#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-signin-dc-html:SignIn/36#0` | page-signin-dc-html SignIn/36#0 <div> | block:sgs/multi-button | 0.51: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/57#0` | site-footer Home>SiteFooter@250#0/57#0 <span> | block:sgs/multi-button | 0.51 | accept |

### Needs a decision (low): block:sgs/responsive-logo (7)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/58#0` | nav-drawer-left Home>SiteHeader@7#0/58#0 <img> | block:sgs/responsive-logo | 0.66 | accept |
| `skeleton:page-gifts-dc-html:Gifts/68#0` | page-gifts-dc-html Gifts/68#0 <img> | block:sgs/responsive-logo | 0.66 | accept |
| `skeleton:page-gifts-dc-html:Gifts/74#0` | page-gifts-dc-html Gifts/74#0 <img> | block:sgs/responsive-logo | 0.66 | accept |
| `skeleton:page-home-dc-html:Home/158#0` | page-home-dc-html Home/158#0 <img> | block:sgs/responsive-logo | 0.66 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/26#0` | site-footer Home>SiteFooter@250#0/26#0 <img> | block:sgs/responsive-logo | 0.66 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/22#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/22#0 <img> | block:sgs/responsive-logo | 0.66 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/37#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/37#0 <img> | block:sgs/responsive-logo | 0.66 | accept |

### Needs a decision (low): block:sgs/site-header (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/13#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/13#0 <header> | block:sgs/site-header | 0.58 | accept |

### Needs a decision (low): block:sgs/text (171)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:contact-form:Contact/47#0` | contact-form Contact/47#0 <div> "What’s it about?" | block:sgs/text | 0.25 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/105#0` | nav-drawer-left Home>SiteHeader@7#0/105#0 <div> "say hello" | block:sgs/text | 0.25 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/127#0` | nav-drawer-left Home>SiteHeader@7#0/127#0 <span> "8 reviews on Trustpilot ↗" | block:sgs/text | 0.25 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/61#0` | nav-drawer-left Home>SiteHeader@7#0/61#0 <div> "Who are you shopping for?" | block:sgs/text | 0.25 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/67#0` | nav-drawer-left Home>SiteHeader@7#0/67#0 <span> "Zookies & trial packs" | block:sgs/text | 0.25 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/72#0` | nav-drawer-left Home>SiteHeader@7#0/72#0 <span> "Gift boxes & cards" | block:sgs/text | 0.25 | accept |
| `skeleton:page-account-dc-html:Account/11#0` | page-account-dc-html Account/11#0 <div> "my account" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/10#0` | page-basket-dc-html Basket/10#0 <div> "nearly there" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/12#0` | page-basket-dc-html Basket/12#0 <span> "2" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/25#0` | page-basket-dc-html Basket/25#0 <div> "Add £8.50 more for free UK delivery" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/32` | page-basket-dc-html Basket/32 <div> "Zookies · 20 pack" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/33` | page-basket-dc-html Basket/33 <div> "Oat · Milk choc · Strawberry" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/37` | page-basket-dc-html Basket/37 <span> "1" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/40` | page-basket-dc-html Basket/40 <div> "£21.50" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/45#0` | page-basket-dc-html Basket/45#0 <span> "This is a gift" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/46#0` | page-basket-dc-html Basket/46#0 <span> "Add a note. The prices stay off the packing slip." | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/59#0` | page-basket-dc-html Basket/59#0 <span> "Subtotal" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/60#0` | page-basket-dc-html Basket/60#0 <b> "£26.50" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/62#0` | page-basket-dc-html Basket/62#0 <span> "Delivery" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/63#0` | page-basket-dc-html Basket/63#0 <b> "£3.95" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/65#0` | page-basket-dc-html Basket/65#0 <span> "Total" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/66#0` | page-basket-dc-html Basket/66#0 <span> "£30.45" | block:sgs/text | 0.25 | accept |
| `skeleton:page-basket-dc-html:Basket/71#0` | page-basket-dc-html Basket/71#0 <div> "Baked fresh for you · with you in 3–5 days" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/107#0` | page-checkout-dc-html Checkout/107#0 <legend> "4 · Payment" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/122#0` | page-checkout-dc-html Checkout/122#0 <div> "Your order" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/126` | page-checkout-dc-html Checkout/126 <span> "1" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-checkout-dc-html:Checkout/128` | page-checkout-dc-html Checkout/128 <div> "Zookies · 20 pack" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-checkout-dc-html:Checkout/129` | page-checkout-dc-html Checkout/129 <div> "Oat · Milk choc · Strawberry" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-checkout-dc-html:Checkout/130` | page-checkout-dc-html Checkout/130 <b> "£21.50" | block:sgs/text | 0.25: 2 copies of one template element | accept |
| `skeleton:page-checkout-dc-html:Checkout/135#0` | page-checkout-dc-html Checkout/135#0 <span> "Subtotal" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/136#0` | page-checkout-dc-html Checkout/136#0 <b> "£26.50" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/138#0` | page-checkout-dc-html Checkout/138#0 <span> "Delivery" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/139#0` | page-checkout-dc-html Checkout/139#0 <b> "£3.95" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/141#0` | page-checkout-dc-html Checkout/141#0 <b> "Total" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/142#0` | page-checkout-dc-html Checkout/142#0 <span> "£30.45" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/143#0` | page-checkout-dc-html Checkout/143#0 <div> "Baked fresh for you · with you in 3–5 days" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/20#0` | page-checkout-dc-html Checkout/20#0 <span> "Show order summary ▾" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/21#0` | page-checkout-dc-html Checkout/21#0 <span> "£30.45" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/33#0` | page-checkout-dc-html Checkout/33#0 <div> "last bit, promise" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/43#0` | page-checkout-dc-html Checkout/43#0 <legend> "1 · Your details" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/61#0` | page-checkout-dc-html Checkout/61#0 <span> "Create an account (optional)" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/62#0` | page-checkout-dc-html Checkout/62#0 <span> "See your bake dates and manage subscriptions online." | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout-dc-html:Checkout/72#0` | page-checkout-dc-html Checkout/72#0 <legend> "2 · Who’s it for?" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/86#0` | page-checkout-dc-html Checkout/86#0 <legend> "3 · Delivery" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-contact-dc-html:Contact/12#0` | page-contact-dc-html Contact/12#0 <div> "pop the kettle on ☕" | block:sgs/text | 0.25 | accept |
| `skeleton:page-contact-dc-html:Contact/25#0` | page-contact-dc-html Contact/25#0 <span> "The quickest way to reach Zainab. Number to be added." | block:sgs/text | 0.25 | accept |
| `skeleton:page-contact-dc-html:Contact/33#0` | page-contact-dc-html Contact/33#0 <span> "DM @mamasmunches and see what’s baking." | block:sgs/text | 0.25 | accept |
| `skeleton:page-contact-dc-html:Contact/75#0` | page-contact-dc-html Contact/75#0 <div> "quick answers" | block:sgs/text | 0.25 | accept |
| `skeleton:page-contact-dc-html:Contact/79#0` | page-contact-dc-html Contact/79#0 <div> "Handmade in Birmingham by a registered food business. No shop to visit, but you’ll sometimes find Zainab at local markets and events." | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/12#0` | page-gifts-dc-html Gifts/12#0 <div> "for the mum-to-be & the brand new mum ♥" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/16#0` | page-gifts-dc-html Gifts/16#0 <div> "What’s the moment?" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/20#0` | page-gifts-dc-html Gifts/20#0 <div> "Budget" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/28#0` | page-gifts-dc-html Gifts/28#0 <div> "wrapped with love" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/31#0` | page-gifts-dc-html Gifts/31#0 <div> "Dear Aisha," | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/32#0` | page-gifts-dc-html Gifts/32#0 <div> "For the 3am feeds. You’re doing brilliantly." | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/33#0` | page-gifts-dc-html Gifts/33#0 <div> "Sara x" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/46#0` | page-gifts-dc-html Gifts/46#0 <div> "easy as that" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/51` | page-gifts-dc-html Gifts/51 <div> "1" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-gifts-dc-html:Gifts/52` | page-gifts-dc-html Gifts/52 <div> "Pick a gift" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-gifts-dc-html:Gifts/53` | page-gifts-dc-html Gifts/53 <div> "A gift box, the 40-day bundle, a Taster Trio or a gift card." | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-gifts-dc-html:Gifts/57#0` | page-gifts-dc-html Gifts/57#0 <div> "go on, have a go" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/69#0` | page-gifts-dc-html Gifts/69#0 <div> "Dear Aisha," | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/70#0` | page-gifts-dc-html Gifts/70#0 <div> "Congratulations, mama! One for the 3am feed. So proud of you." | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/71#0` | page-gifts-dc-html Gifts/71#0 <div> "Sara x" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/77#0` | page-gifts-dc-html Gifts/77#0 <div> "Give it now, she bakes it later" | block:sgs/text | 0.25 | accept |
| `skeleton:page-gifts-dc-html:Gifts/78#0` | page-gifts-dc-html Gifts/78#0 <div> "Cookies are best fresh and babies keep their own schedule. A gift card in a printed envelope lets her order once baby arrives." | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/11#0` | page-help-dc-html Help/11#0 <div> "ask us anything" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/24#0` | page-help-dc-html Help/24#0 <div> "12 answers" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/30` | page-help-dc-html Help/30 <span> "When will my order arrive?" | block:sgs/text | 0.25: 12 copies of one template element | accept |
| `skeleton:page-help-dc-html:Help/31` | page-help-dc-html Help/31 <span> "+" | block:sgs/text | 0.25: 12 copies of one template element | accept |
| `skeleton:page-help-dc-html:Help/39#0` | page-help-dc-html Help/39#0 <div> "getting it to you" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/45#0` | page-help-dc-html Help/45#0 <b> "Royal Mail Tracked 48" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/47#0` | page-help-dc-html Help/47#0 <span> "2–3 days after baking" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/50#0` | page-help-dc-html Help/50#0 <span> "Free over £35" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/53#0` | page-help-dc-html Help/53#0 <b> "Royal Mail Tracked 24" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/55#0` | page-help-dc-html Help/55#0 <span> "The day after baking" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/56#0` | page-help-dc-html Help/56#0 <b> "£5.45" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/59#0` | page-help-dc-html Help/59#0 <b> "Taster Trio & gift cards" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/61#0` | page-help-dc-html Help/61#0 <span> "Letterbox-sized" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/62#0` | page-help-dc-html Help/62#0 <b> "Included" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/63#0` | page-help-dc-html Help/63#0 <div> "Prices and timings to be confirmed by Zainab." | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/66#0` | page-help-dc-html Help/66#0 <div> "please read carefully" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/75#0` | page-help-dc-html Help/75#0 <b> "Vegan base:" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/79#0` | page-help-dc-html Help/79#0 <b> "Privacy policy" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/82#0` | page-help-dc-html Help/82#0 <b> "Terms & conditions" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help-dc-html:Help/87#0` | page-help-dc-html Help/87#0 <span> "Message Zainab" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/106#0` | page-home-dc-html Home/106#0 <div> "20 × Classic oat, milk choc chips, strawberry & mango" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/110#0` | page-home-dc-html Home/110#0 <span> "Subscribe & save 10%" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/111#0` | page-home-dc-html Home/111#0 <span> "Skip, swap or cancel any time" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/113#0` | page-home-dc-html Home/113#0 <span> "£19.35" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/114#0` | page-home-dc-html Home/114#0 <span> "£21.50" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/120#0` | page-home-dc-html Home/120#0 <span> "One-off box" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/121#0` | page-home-dc-html Home/121#0 <span> "£21.50" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/123#0` | page-home-dc-html Home/123#0 <div> "Baked fresh for you · with you in 3–5 days · free UK delivery over £35" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/128#0` | page-home-dc-html Home/128#0 <div> "gifts for new mums" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/13#0` | page-home-dc-html Home/13#0 <span> "✦" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/139` | page-home-dc-html Home/139 <span> "New Baby Gift Box" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/140` | page-home-dc-html Home/140 <span> "A mix of Zookies, gift-boxed with your note." | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/142` | page-home-dc-html Home/142 <span> "£15" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/155#0` | page-home-dc-html Home/155#0 <div> "“Congratulations, mama! One for the 3am feed. So proud of you. Sara x”" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/156#0` | page-home-dc-html Home/156#0 <div> "Your words go in the box. The prices stay out." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/161#0` | page-home-dc-html Home/161#0 <div> "Give a gift card now. She redeems it once baby arrives, so every cookie is fresh." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/166#0` | page-home-dc-html Home/166#0 <div> "Zainab’s Zookie recipe" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/167#0` | page-home-dc-html Home/167#0 <div> "The four that go in every single one" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/170#0` | page-home-dc-html Home/170#0 <span> "✓" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/172#0` | page-home-dc-html Home/172#0 <div> "Oats" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/173#0` | page-home-dc-html Home/173#0 <div> "Rich in iron. Used in postpartum foods across cultures for centuries." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/175#0` | page-home-dc-html Home/175#0 <span> "✓" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/177#0` | page-home-dc-html Home/177#0 <div> "Brewer’s yeast" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/178#0` | page-home-dc-html Home/178#0 <div> "B-vitamins and chromium. A traditional galactagogue used worldwide." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/180#0` | page-home-dc-html Home/180#0 <span> "✓" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/182#0` | page-home-dc-html Home/182#0 <div> "Flaxseed" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/183#0` | page-home-dc-html Home/183#0 <div> "Omega-3 fatty acids. Good for mum and baby." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/185#0` | page-home-dc-html Home/185#0 <span> "✓" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/187#0` | page-home-dc-html Home/187#0 <div> "Fenugreek" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/188#0` | page-home-dc-html Home/188#0 <div> "A traditional postpartum herb. If your baby has a sensitive tummy, ask your midwife first." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/200#0` | page-home-dc-html Home/200#0 <div> "where it all started" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/202#0` | page-home-dc-html Home/202#0 <div> "our story" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/207#0` | page-home-dc-html Home/207#0 <div> "Zainab x" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/212#0` | page-home-dc-html Home/212#0 <div> "real mums, real words" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/227` | page-home-dc-html Home/227 <span> "“" | block:sgs/text | 0.25: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/231` | page-home-dc-html Home/231 <b> "KA" | block:sgs/text | 0.25: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/232` | page-home-dc-html Home/232 <span> "June 2026 · Trustpilot" | block:sgs/text | 0.25: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/239#0` | page-home-dc-html Home/239#0 <div> "ask away" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/247` | page-home-dc-html Home/247 <span> "+" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/31#0` | page-home-dc-html Home/31#0 <div> "fresh batch!" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/34#0` | page-home-dc-html Home/34#0 <div> "for a new mum" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/37#0` | page-home-dc-html Home/37#0 <div> "3am snack sorted ♥" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/40#0` | page-home-dc-html Home/40#0 <span> "to order" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/41#0` | page-home-dc-html Home/41#0 <div> "baked with love" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/51#0` | page-home-dc-html Home/51#0 <span> "I’m feeding a little one" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/52#0` | page-home-dc-html Home/52#0 <span> "Build your own box, or subscribe and save 10% on every one." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/59#0` | page-home-dc-html Home/59#0 <span> "I’m spoiling a new mum" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/60#0` | page-home-dc-html Home/60#0 <span> "Gift boxes, gift cards and a note from you, with the prices left off." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/67#0` | page-home-dc-html Home/67#0 <div> "your cookie, your way" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/84#0` | page-home-dc-html Home/84#0 <span> "Pick up to 3 and we’ll split your box between them" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home-dc-html:Home/89#0` | page-home-dc-html Home/89#0 <div> "Your 20: 10 strawberry · 10 mango" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/111#0` | page-product-dc-html-id-zookies Product/111#0 <span> "✦" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/113#0` | page-product-dc-html-id-zookies Product/113#0 <span> "→" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/115#0` | page-product-dc-html-id-zookies Product/115#0 <span> "£" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/120` | page-product-dc-html-id-zookies Product/120 <span> "+" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/124#0` | page-product-dc-html-id-zookies Product/124#0 <div> "real mums, real words" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/133` | page-product-dc-html-id-zookies Product/133 <b> "KA" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/14#0` | page-product-dc-html-id-zookies Product/14#0 <span> "Zookies" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/20#0` | page-product-dc-html-id-zookies Product/20#0 <div> "baked with love" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/26#0` | page-product-dc-html-id-zookies Product/26#0 <div> "build your own box" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/57#0` | page-product-dc-html-id-zookies Product/57#0 <span> "Up to 3, split evenly" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/62#0` | page-product-dc-html-id-zookies Product/62#0 <div> "All 20 strawberry" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/97#0` | page-product-dc-html-id-zookies Product/97#0 <span> "Send it as a gift" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/98#0` | page-product-dc-html-id-zookies Product/98#0 <span> "Add a note. We’ll leave the prices off." | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/12#0` | page-shop-dc-html Shop/12#0 <div> "fresh from Zainab’s kitchen" | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/27#0` | page-shop-dc-html Shop/27#0 <div> "5 treats to choose from" | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/34#0` | page-shop-dc-html Shop/34#0 <span> "your cookie, your way ✦" | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/35#0` | page-shop-dc-html Shop/35#0 <span> "Build your own box" | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/36#0` | page-shop-dc-html Shop/36#0 <span> "Pick a base, chips and up to three of Zainab’s 11 flavours." | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/41#0` | page-shop-dc-html Shop/41#0 <span> "Subscribe & save 10%" | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/44=sgs/text` | page-shop-dc-html Shop/44=sgs/text <span> "Free delivery on 20 and 40 packs" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-shop-dc-html:Shop/48#0` | page-shop-dc-html Shop/48#0 <span> "Find a gift by moment or budget" | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop/49#0` | page-shop-dc-html Shop/49#0 <span> "Baby showers, new arrivals and the first 40 days." | block:sgs/text | 0.25 | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/10` | page-shop-dc-html Shop>ProductCard@31/10 <span> "£1.19 a cookie" | block:sgs/text | 0.25: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/9` | page-shop-dc-html Shop>ProductCard@31/9 <span> "from £9.50" | block:sgs/text | 0.25: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-signin-dc-html:SignIn/100` | page-signin-dc-html SignIn/100 <span> "✓" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-signin-dc-html:SignIn/102` | page-signin-dc-html SignIn/102 <div> "Every order and bake date" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-signin-dc-html:SignIn/103` | page-signin-dc-html SignIn/103 <div> "See when Zainab bakes your box and when it’s posted." | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-signin-dc-html:SignIn/11#0` | page-signin-dc-html SignIn/11#0 <div> "welcome back, mama" | block:sgs/text | 0.25 | accept |
| `skeleton:page-signin-dc-html:SignIn/96#0` | page-signin-dc-html SignIn/96#0 <div> "why have an account?" | block:sgs/text | 0.25 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/42#0` | site-footer Home>SiteFooter@250#0/42#0 <div> "say hello" | block:sgs/text | 0.25 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/7#0` | site-footer Home>SiteFooter@250#0/7#0 <div> "fresh out the oven…" | block:sgs/text | 0.25 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/10#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/10#0 <span> "With you in 3–5 days" | block:sgs/text | 0.25 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/12#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/12#0 <span> "Free UK delivery over £35" | block:sgs/text | 0.25 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/7#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/7#0 <span> "✦ Baked fresh when you order" | block:sgs/text | 0.25 | accept |

### Settled by rule alignWrapper: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) (11)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/60#0` | nav-drawer-left Home>SiteHeader@7#0/60#0 <div> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-account-dc-html:Account/16#0` | page-account-dc-html Account/16#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-contact-dc-html:Contact/16#0` | page-contact-dc-html Contact/16#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-gifts-dc-html:Gifts/54#0` | page-gifts-dc-html Gifts/54#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-gifts-dc-html:Gifts/72#0` | page-gifts-dc-html Gifts/72#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-help-dc-html:Help/22#0` | page-help-dc-html Help/22#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-home-dc-html:Home/162#0` | page-home-dc-html Home/162#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-home-dc-html:Home/236#0` | page-home-dc-html Home/236#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-home-dc-html:Home/43#0` | page-home-dc-html Home/43#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-shop-dc-html:Shop/25#0` | page-shop-dc-html Shop/25#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:page-signin-dc-html:SignIn/13#0` | page-signin-dc-html SignIn/13#0 <section> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |

### Settled by rule blockOwnedPart: the cart page's bag drawer is the cart block's own drawer (sgs/cart displayMode drawer draws its heading, lines, totals, empty message and checkout button: Spec 27, FR-48-87); the page map holds this surface as the drawer part "Basket" of the cart row (11)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/128#0` | basket-drawer-right Home>SiteHeader@7#0/128#0 <aside> | block:sgs/cart | 1: the cart page's bag drawer is the cart block's own drawer (sgs/cart displayMode drawer draws its heading, lines, totals, empty message and checkout button: Spec 27, FR-48-87); the page map holds this surface as the drawer part "Basket" of the cart row | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/129#0` | basket-drawer-right Home>SiteHeader@7#0/129#0 <div> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/130#0` | basket-drawer-right Home>SiteHeader@7#0/130#0 <div> "Your basket" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/131#0` | basket-drawer-right Home>SiteHeader@7#0/131#0 <span> "( 0 )" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/132#0` | basket-drawer-right Home>SiteHeader@7#0/132#0 <button> "×" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/176#0` | basket-drawer-right Home>SiteHeader@7#0/176#0 <div> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/177#0` | basket-drawer-right Home>SiteHeader@7#0/177#0 <img> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/178#0` | basket-drawer-right Home>SiteHeader@7#0/178#0 <div> "Your basket is empty" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/179#0` | basket-drawer-right Home>SiteHeader@7#0/179#0 <p> "New to Zookies? The Taster Trio is 3 cookies for £5, postage included." | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/180#0` | basket-drawer-right Home>SiteHeader@7#0/180#0 <button> "Add a Taster Trio · £5" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |
| `skeleton:basket-drawer-right:Home>SiteHeader@7#0/181#0` | basket-drawer-right Home>SiteHeader@7#0/181#0 <a> "Browse the shop" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart | accept |

### Settled by rule cardAction: a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) (6)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-gifts-dc-html:Gifts/82#0` | page-gifts-dc-html Gifts/82#0 <span> "£40" | block:sgs/button | 1: a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) | accept |
| `skeleton:page-help-dc-html:Help/88#0` | page-help-dc-html Help/88#0 <span> "→" | block:sgs/button | 1: a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) | accept |
| `skeleton:page-home-dc-html:Home/143` | page-home-dc-html Home/143 <span> "→" | block:sgs/button | 1: 4 copies of one template element; a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) | accept |
| `skeleton:page-home-dc-html:Home/54#0` | page-home-dc-html Home/54#0 <span> "→" | block:sgs/button | 1: a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) | accept |
| `skeleton:page-home-dc-html:Home/62#0` | page-home-dc-html Home/62#0 <span> "→" | block:sgs/button | 1: a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) | accept |
| `skeleton:page-shop-dc-html:Shop/38#0` | page-shop-dc-html Shop/38#0 <span> "→" | block:sgs/button | 1: a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) | accept |

### Settled by rule cardTitle: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label (14)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/124#0` | nav-drawer-left Home>SiteHeader@7#0/124#0 <span> "4.3" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/66#0` | nav-drawer-left Home>SiteHeader@7#0/66#0 <span> "For me" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/71#0` | nav-drawer-left Home>SiteHeader@7#0/71#0 <span> "For a new mum" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-contact-dc-html:Contact/24#0` | page-contact-dc-html Contact/24#0 <b> "WhatsApp" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-contact-dc-html:Contact/32#0` | page-contact-dc-html Contact/32#0 <b> "Instagram" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-contact-dc-html:Contact/39#0` | page-contact-dc-html Contact/39#0 <b> "Email" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-gifts-dc-html:Gifts/76#0` | page-gifts-dc-html Gifts/76#0 <div> "baby shower coming up?" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-help-dc-html:Help/86#0` | page-help-dc-html Help/86#0 <span> "still stuck?" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-home-dc-html:Home/160#0` | page-home-dc-html Home/160#0 <div> "Baby shower coming up?" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-home-dc-html:Home/216#0` | page-home-dc-html Home/216#0 <span> "4.3" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-home-dc-html:Home/50#0` | page-home-dc-html Home/50#0 <span> "for me ✦" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-home-dc-html:Home/58#0` | page-home-dc-html Home/58#0 <span> "for her ♥" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-shop-dc-html:Shop/40#0` | page-shop-dc-html Shop/40#0 <span> "never run out" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |
| `skeleton:page-shop-dc-html:Shop/47#0` | page-shop-dc-html Shop/47#0 <span> "buying for someone?" | block:sgs/heading | 1: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label | accept |

### Settled by rule choiceFlow: a choice flow is the sgs/choice-flow block family (Spec 43 FR-43-1, FR-43-19, FR-43-24, FR-43-26): one sgs/form-step holding an sgs/choice-flow-question per group of options (each option an entry of the question's options), a panel a question opens underneath a step holding its fields and an sgs/choice-flow-result, the add-to-bag control a result step, and the summary, close, skip and continue pieces the flow's own settings; the draft's elements are absorbed into the flow and every element with words or a control the family cannot hold is a gap row (38)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:build-your-zookie:Home/100#0` | build-your-zookie Home/100#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/101#0` | build-your-zookie Home/101#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/102#0` | build-your-zookie Home/102#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/103#0` | build-your-zookie Home/103#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/105` | build-your-zookie Home/105 <span> | absorbed | 1: 19 copies of one template element; drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/107#0` | build-your-zookie Home/107#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/109#0` | build-your-zookie Home/109#0 <span> | absorbed | 1: inside the gap row Home/108#0 | accept |
| `skeleton:build-your-zookie:Home/110#0` | build-your-zookie Home/110#0 <span> "Subscribe & save 10%" | absorbed | 1: inside the gap row Home/108#0 | accept |
| `skeleton:build-your-zookie:Home/111#0` | build-your-zookie Home/111#0 <span> "Skip, swap or cancel any time" | absorbed | 1: inside the gap row Home/108#0 | accept |
| `skeleton:build-your-zookie:Home/112#0` | build-your-zookie Home/112#0 <span> | absorbed | 1: inside the gap row Home/108#0 | accept |
| `skeleton:build-your-zookie:Home/113#0` | build-your-zookie Home/113#0 <span> "£19.35" | absorbed | 1: inside the gap row Home/108#0 | accept |
| `skeleton:build-your-zookie:Home/114#0` | build-your-zookie Home/114#0 <span> "£21.50" | absorbed | 1: inside the gap row Home/108#0 | accept |
| `skeleton:build-your-zookie:Home/116#0` | build-your-zookie Home/116#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 5 "Home/116", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/118` | build-your-zookie Home/118 <button> "Every 2 weeks" | absorbed | 1: 2 copies of one template element; drawn by sgs/choice-flow: question 5 "Home/116", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/120#0` | build-your-zookie Home/120#0 <span> "One-off box" | absorbed | 1: inside the gap row Home/119#0 | accept |
| `skeleton:build-your-zookie:Home/121#0` | build-your-zookie Home/121#0 <span> "£21.50" | absorbed | 1: inside the gap row Home/119#0 | accept |
| `skeleton:build-your-zookie:Home/122#0` | build-your-zookie Home/122#0 <button> "Subscribe · £19.35" | absorbed | 1: drawn by sgs/choice-flow: the add-to-bag result (sgs/choice-flow-result action add-to-bag) | accept |
| `skeleton:build-your-zookie:Home/63#0` | build-your-zookie Home/63#0 <section> | block:sgs/choice-flow | 1: a choice flow is the sgs/choice-flow block family (Spec 43 FR-43-1, FR-43-19, FR-43-24, FR-43-26): one sgs/form-step holding an sgs/choice-flow-question per group of options (each option an entry of the question's options), a panel a question opens underneath a step holding its fields and an sgs/choice-flow-result, the add-to-bag control a result step, and the summary, close, skip and continue pieces the flow's own settings; the draft's elements are absorbed into the flow and every element with words or a control the family cannot hold is a gap row | accept |
| `skeleton:build-your-zookie:Home/64#0` | build-your-zookie Home/64#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/65#0` | build-your-zookie Home/65#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/66#0` | build-your-zookie Home/66#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow | accept |
| `skeleton:build-your-zookie:Home/68#0` | build-your-zookie Home/68#0 <h2> "Build your Zookie" | absorbed | 1: drawn by sgs/choice-flow: the flow title (sgs/choice-flow title) | accept |
| `skeleton:build-your-zookie:Home/70#0` | build-your-zookie Home/70#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 1 "Base", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/71#0` | build-your-zookie Home/71#0 <div> "1 · Base" | absorbed | 1: drawn by sgs/choice-flow: question 1 "Base", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/72#0` | build-your-zookie Home/72#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 1 "Base", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/76#0` | build-your-zookie Home/76#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 2 "Chips", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/77#0` | build-your-zookie Home/77#0 <div> "2 · Chips" | absorbed | 1: drawn by sgs/choice-flow: question 2 "Chips", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/78#0` | build-your-zookie Home/78#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 2 "Chips", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/81#0` | build-your-zookie Home/81#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 3 "Flavours", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/82#0` | build-your-zookie Home/82#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 3 "Flavours", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/83#0` | build-your-zookie Home/83#0 <span> "3 · Flavours" | absorbed | 1: drawn by sgs/choice-flow: question 3 "Flavours", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/84#0` | build-your-zookie Home/84#0 <span> "Pick up to 3 and we’ll split your box between them" | absorbed | 1: drawn by sgs/choice-flow: question 3 "Flavours", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/85#0` | build-your-zookie Home/85#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 3 "Flavours", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/89#0` | build-your-zookie Home/89#0 <div> "Your 20: 10 strawberry · 10 mango" | absorbed | 1: drawn by sgs/choice-flow: question 3 "Flavours", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/90#0` | build-your-zookie Home/90#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 4 "How many", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/91#0` | build-your-zookie Home/91#0 <div> "4 · How many" | absorbed | 1: drawn by sgs/choice-flow: question 4 "How many", sgs/choice-flow-question | accept |
| `skeleton:build-your-zookie:Home/92#0` | build-your-zookie Home/92#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 4 "How many", sgs/choice-flow-question | accept |
| `skeleton:gift-finder:Gifts/24#0` | gift-finder Gifts/24#0 <a> "Show 4 gifts ↓" | block:sgs/choice-flow | 1: a choice flow is the sgs/choice-flow block family (Spec 43 FR-43-1, FR-43-19, FR-43-24, FR-43-26): one sgs/form-step holding an sgs/choice-flow-question per group of options (each option an entry of the question's options), a panel a question opens underneath a step holding its fields and an sgs/choice-flow-result, the add-to-bag control a result step, and the summary, close, skip and continue pieces the flow's own settings; the draft's elements are absorbed into the flow and every element with words or a control the family cannot hold is a gap row | accept |

### Settled by rule decorationLayer: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in (9)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-gifts-dc-html:Gifts/30#0` | page-gifts-dc-html Gifts/30#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-gifts-dc-html:Gifts/67#0` | page-gifts-dc-html Gifts/67#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home-dc-html:Home/102#0` | page-home-dc-html Home/102#0 <div> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home-dc-html:Home/105` | page-home-dc-html Home/105 <span> | remove | 1: 19 copies of one template element; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home-dc-html:Home/154#0` | page-home-dc-html Home/154#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home-dc-html:Home/165#0` | page-home-dc-html Home/165#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home-dc-html:Home/18#0` | page-home-dc-html Home/18#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home-dc-html:Home/197#0` | page-home-dc-html Home/197#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home-dc-html:Home/198#0` | page-home-dc-html Home/198#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |

### Settled by rule drawerOpener: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it (8)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/17#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/17#0 <button> | absorbed | 1: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/18#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/18#0 <span> | absorbed | 1: drawn by the element before it: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/19#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/19#0 <span> | absorbed | 1: drawn by the element before it: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/20#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/20#0 <span> | absorbed | 1: drawn by the element before it: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/28#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/28#0 <button> | absorbed | 1: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/49#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/49#0 <button> | absorbed | 1: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/53#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/53#0 <span> "Basket" | absorbed | 1: drawn by the element before it: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/54#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/54#0 <span> "0" | absorbed | 1: drawn by the element before it: a button whose click handler opens the surface of kind drawer (the handoff surfaces.json names it in the drawer's opened_by words) is the burger the header's navigation block draws itself below its collapse point, so the navigation block takes it | accept |

### Settled by rule drawsChildren: the block each sits in draws it (each row's reason names that block) (13)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/108#0` | nav-drawer-left Home>SiteHeader@7#0/108#0 <span> | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/113#0` | nav-drawer-left Home>SiteHeader@7#0/113#0 <span> | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/118#0` | nav-drawer-left Home>SiteHeader@7#0/118#0 <span> | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/75#0` | nav-drawer-left Home>SiteHeader@7#0/75#0 <span> "→" | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/77#0` | nav-drawer-left Home>SiteHeader@7#0/77#0 <span> "→" | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/79#0` | nav-drawer-left Home>SiteHeader@7#0/79#0 <span> "3 for £5" | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/81#0` | nav-drawer-left Home>SiteHeader@7#0/81#0 <span> "→" | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/83#0` | nav-drawer-left Home>SiteHeader@7#0/83#0 <span> "10% off" | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/85#0` | nav-drawer-left Home>SiteHeader@7#0/85#0 <span> "→" | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/87#0` | nav-drawer-left Home>SiteHeader@7#0/87#0 <span> "→" | absorbed | 1: drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:page-contact-dc-html:Contact/78` | page-contact-dc-html Contact/78 <span> "→" | absorbed | 1: 4 copies of one template element; drawn by sgs/icon-list: the list item's marker | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/45#0` | site-footer Home>SiteFooter@250#0/45#0 <a> | block:sgs/icon | 0.9: drawn by sgs/social-icons: Fill generates its icons from the Site Info row | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/50#0` | site-footer Home>SiteFooter@250#0/50#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row | accept |

### Settled by rule formControl: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) (64)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:checkout-form:Checkout/60#0` | checkout-form Checkout/60#0 <span> | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/52#0` | contact-form Contact/52#0 <label> "Your name" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/53#0` | contact-form Contact/53#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/54#0` | contact-form Contact/54#0 <label> "Email" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/55#0` | contact-form Contact/55#0 <input> | block:sgs/form-field-email | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/57#0` | contact-form Contact/57#0 <label> "Order number (if you have it)" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/58#0` | contact-form Contact/58#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/65#0` | contact-form Contact/65#0 <label> "Message" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:contact-form:Contact/66#0` | contact-form Contact/66#0 <textarea> | block:sgs/form-field-textarea | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/42#0` | create-account SignIn/42#0 <label> "First name" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/43#0` | create-account SignIn/43#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/44#0` | create-account SignIn/44#0 <label> "Last name" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/45#0` | create-account SignIn/45#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/48#0` | create-account SignIn/48#0 <label> "Email" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/49#0` | create-account SignIn/49#0 <input> | block:sgs/form-field-email | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/52#0` | create-account SignIn/52#0 <label> "Choose a password" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/53#0` | create-account SignIn/53#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/56#0` | create-account SignIn/56#0 <label> "Email me about new flavours and bake days (optional)" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:create-account:SignIn/57#0` | create-account SignIn/57#0 <input> | block:sgs/form-field-checkbox | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:forgotten-password-flow:SignIn/64#0` | forgotten-password-flow SignIn/64#0 <label> "Email" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:forgotten-password-flow:SignIn/65#0` | forgotten-password-flow SignIn/65#0 <input> | block:sgs/form-field-email | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-basket-dc-html:Basket/42#0` | page-basket-dc-html Basket/42#0 <label> | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-basket-dc-html:Basket/43#0` | page-basket-dc-html Basket/43#0 <input> | block:sgs/form-field-checkbox | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/108#0` | page-checkout-dc-html Checkout/108#0 <label> "Card number" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/109#0` | page-checkout-dc-html Checkout/109#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/111#0` | page-checkout-dc-html Checkout/111#0 <label> "Expiry" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/112#0` | page-checkout-dc-html Checkout/112#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/113#0` | page-checkout-dc-html Checkout/113#0 <label> "Security code" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/114#0` | page-checkout-dc-html Checkout/114#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/132#0` | page-checkout-dc-html Checkout/132#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/52#0` | page-checkout-dc-html Checkout/52#0 <label> "Email" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/53#0` | page-checkout-dc-html Checkout/53#0 <input> | block:sgs/form-field-email | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/54#0` | page-checkout-dc-html Checkout/54#0 <label> "Mobile, for delivery updates (optional)" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/55#0` | page-checkout-dc-html Checkout/55#0 <input> | block:sgs/form-field-phone | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/58#0` | page-checkout-dc-html Checkout/58#0 <label> | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/59#0` | page-checkout-dc-html Checkout/59#0 <input> | block:sgs/form-field-checkbox | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/88#0` | page-checkout-dc-html Checkout/88#0 <label> "Postcode" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/89#0` | page-checkout-dc-html Checkout/89#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/91#0` | page-checkout-dc-html Checkout/91#0 <label> "Address line 1" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/92#0` | page-checkout-dc-html Checkout/92#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/94#0` | page-checkout-dc-html Checkout/94#0 <label> "Address line 2 (optional)" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/95#0` | page-checkout-dc-html Checkout/95#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/96#0` | page-checkout-dc-html Checkout/96#0 <label> "Town or city" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout-dc-html:Checkout/97#0` | page-checkout-dc-html Checkout/97#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-gifts-dc-html:Gifts/60#0` | page-gifts-dc-html Gifts/60#0 <label> "To" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-gifts-dc-html:Gifts/61#0` | page-gifts-dc-html Gifts/61#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-gifts-dc-html:Gifts/62#0` | page-gifts-dc-html Gifts/62#0 <label> "Your message" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-gifts-dc-html:Gifts/63#0` | page-gifts-dc-html Gifts/63#0 <textarea> "Congratulations, mama! One for the 3am feed. So proud of you." | block:sgs/form-field-textarea | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-gifts-dc-html:Gifts/64#0` | page-gifts-dc-html Gifts/64#0 <label> "From" | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-gifts-dc-html:Gifts/65#0` | page-gifts-dc-html Gifts/65#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-help-dc-html:Help/13#0` | page-help-dc-html Help/13#0 <label> | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-help-dc-html:Help/18#0` | page-help-dc-html Help/18#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/94#0` | page-product-dc-html-id-zookies Product/94#0 <label> | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/95#0` | page-product-dc-html-id-zookies Product/95#0 <input> | block:sgs/form-field-checkbox | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-shop-dc-html:Shop/15#0` | page-shop-dc-html Shop/15#0 <label> | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-shop-dc-html:Shop/16#0` | page-shop-dc-html Shop/16#0 <span> "Sort" | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:page-shop-dc-html:Shop/17#0` | page-shop-dc-html Shop/17#0 <select> | block:sgs/form-field-select | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin-dc-html:SignIn/28#0` | page-signin-dc-html SignIn/28#0 <label> "Email" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin-dc-html:SignIn/29#0` | page-signin-dc-html SignIn/29#0 <input> | block:sgs/form-field-email | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin-dc-html:SignIn/32#0` | page-signin-dc-html SignIn/32#0 <label> "Password" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin-dc-html:SignIn/33#0` | page-signin-dc-html SignIn/33#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:product-gift-note:Product/100#0` | product-gift-note Product/100#0 <textarea> | block:sgs/form-field-textarea | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:product-gift-note:Product/101#0` | product-gift-note Product/101#0 <div> "200 characters left" | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:product-gift-note:Product/96#0` | product-gift-note Product/96#0 <span> | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |

### Settled by rule formHost: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part (8)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:checkout-form:Checkout/31#0` | checkout-form Checkout/31#0 <form> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:create-account:SignIn/40#0` | create-account SignIn/40#0 <form> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:forgotten-password-flow:SignIn/60#0` | forgotten-password-flow SignIn/60#0 <form> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:gift-note-preview:Gifts/61#0` | gift-note-preview Gifts/61#0 <input> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:help-search-category-chips:Help/18#0` | help-search-category-chips Help/18#0 <input> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:page-signin-dc-html:SignIn/27#0` | page-signin-dc-html SignIn/27#0 <form> | block:sgs/form | 1: 2 copies of one template element on 2 surfaces; a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:product-buy-box:Product/108#0` | product-buy-box Product/108#0 <button> "Add to basket · £21.50" | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:product-gift-note:Product/93#0` | product-gift-note Product/93#0 <div> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |

### Settled by rule formLink: a draft form on a page is the saved form post (Spec 42): the page holds the form block linked to it, with no fields of its own, and the form's fields are cloned once on the form's own surface (Bean, 2026-10-25) (16)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-contact-dc-html:Contact/44#0` | page-contact-dc-html Contact/44#0 <form> | block:sgs/form | 1: 2 copies of one template element on 2 surfaces; a draft form on a page is the saved form post (Spec 42): the page holds the form block linked to it, with no fields of its own, and the form's fields are cloned once on the form's own surface (Bean, 2026-10-25) | accept |
| `skeleton:page-contact-dc-html:Contact/45#0` | page-contact-dc-html Contact/45#0 <h2> "Send a message" | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/46#0` | page-contact-dc-html Contact/46#0 <div> | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/47#0` | page-contact-dc-html Contact/47#0 <div> "What’s it about?" | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/48#0` | page-contact-dc-html Contact/48#0 <div> | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/50` | page-contact-dc-html Contact/50 <button> "My order" | absorbed | 1: 10 copies of one template element on 2 surfaces; drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/51#0` | page-contact-dc-html Contact/51#0 <div> | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/52#0` | page-contact-dc-html Contact/52#0 <label> "Your name" | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/53#0` | page-contact-dc-html Contact/53#0 <input> | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/54#0` | page-contact-dc-html Contact/54#0 <label> "Email" | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/55#0` | page-contact-dc-html Contact/55#0 <input> | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/57#0` | page-contact-dc-html Contact/57#0 <label> "Order number (if you have it)" | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/58#0` | page-contact-dc-html Contact/58#0 <input> | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/65#0` | page-contact-dc-html Contact/65#0 <label> "Message" | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/66#0` | page-contact-dc-html Contact/66#0 <textarea> | absorbed | 1: drawn by sgs/form: rule formLink | accept |
| `skeleton:page-contact-dc-html:Contact/67#0` | page-contact-dc-html Contact/67#0 <button> "Send message →" | absorbed | 1: drawn by sgs/form: rule formLink | accept |

### Settled by rule headerSlots: a strip above the header's main bar is its top row (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/5#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/5#0 <div> | block:sgs/site-header-row | 1: a strip above the header's main bar is its top row | accept |

### Settled by rule hero: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) (10)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-account-dc-html:Account/9#0` | page-account-dc-html Account/9#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-basket-dc-html:Basket/9#0` | page-basket-dc-html Basket/9#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-checkout-dc-html:Checkout/17#0` | page-checkout-dc-html Checkout/17#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-contact-dc-html:Contact/9#0` | page-contact-dc-html Contact/9#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-gifts-dc-html:Gifts/9#0` | page-gifts-dc-html Gifts/9#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-help-dc-html:Help/9#0` | page-help-dc-html Help/9#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-home-dc-html:Home/9#0` | page-home-dc-html Home/9#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/15#0` | page-product-dc-html-id-zookies Product/15#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-shop-dc-html:Shop/9#0` | page-shop-dc-html Shop/9#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-signin-dc-html:SignIn/9#0` | page-signin-dc-html SignIn/9#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |

### Settled by rule heroInner: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays (52)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-account-dc-html:Account/10#0` | page-account-dc-html Account/10#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-basket-dc-html:Basket/23#0` | page-basket-dc-html Basket/23#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-basket-dc-html:Basket/24#0` | page-basket-dc-html Basket/24#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-basket-dc-html:Basket/26#0` | page-basket-dc-html Basket/26#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-basket-dc-html:Basket/31` | page-basket-dc-html Basket/31 <div> | unwrap | 1: 2 copies of one template element; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-basket-dc-html:Basket/41#0` | page-basket-dc-html Basket/41#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-basket-dc-html:Basket/44#0` | page-basket-dc-html Basket/44#0 <span> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-basket-dc-html:Basket/56#0` | page-basket-dc-html Basket/56#0 <aside> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/106#0` | page-checkout-dc-html Checkout/106#0 <fieldset> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/121#0` | page-checkout-dc-html Checkout/121#0 <aside> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/125` | page-checkout-dc-html Checkout/125 <div> | unwrap | 1: 2 copies of one template element; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/127` | page-checkout-dc-html Checkout/127 <div> | unwrap | 1: 2 copies of one template element; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/31#0` | page-checkout-dc-html Checkout/31#0 <form> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/32#0` | page-checkout-dc-html Checkout/32#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/42#0` | page-checkout-dc-html Checkout/42#0 <fieldset> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/57#0` | page-checkout-dc-html Checkout/57#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/60#0` | page-checkout-dc-html Checkout/60#0 <span> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/71#0` | page-checkout-dc-html Checkout/71#0 <fieldset> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-checkout-dc-html:Checkout/85#0` | page-checkout-dc-html Checkout/85#0 <fieldset> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact-dc-html:Contact/10#0` | page-contact-dc-html Contact/10#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact-dc-html:Contact/11#0` | page-contact-dc-html Contact/11#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact-dc-html:Contact/15#0` | page-contact-dc-html Contact/15#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-gifts-dc-html:Gifts/11#0` | page-gifts-dc-html Gifts/11#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-gifts-dc-html:Gifts/15#0` | page-gifts-dc-html Gifts/15#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-help-dc-html:Help/10#0` | page-help-dc-html Help/10#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/10#0` | page-home-dc-html Home/10#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/11#0` | page-home-dc-html Home/11#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/15#0` | page-home-dc-html Home/15#0 <span> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/16#0` | page-home-dc-html Home/16#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/28#0` | page-home-dc-html Home/28#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/29#0` | page-home-dc-html Home/29#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/30#0` | page-home-dc-html Home/30#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/32#0` | page-home-dc-html Home/32#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/33#0` | page-home-dc-html Home/33#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/35#0` | page-home-dc-html Home/35#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home-dc-html:Home/36#0` | page-home-dc-html Home/36#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/102#0` | page-product-dc-html-id-zookies Product/102#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/116#0` | page-product-dc-html-id-zookies Product/116#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/118` | page-product-dc-html-id-zookies Product/118 <div> | unwrap | 1: 4 copies of one template element; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/16#0` | page-product-dc-html-id-zookies Product/16#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/17#0` | page-product-dc-html-id-zookies Product/17#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/24#0` | page-product-dc-html-id-zookies Product/24#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/25#0` | page-product-dc-html-id-zookies Product/25#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/32#0` | page-product-dc-html-id-zookies Product/32#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/33#0` | page-product-dc-html-id-zookies Product/33#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/43#0` | page-product-dc-html-id-zookies Product/43#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/49#0` | page-product-dc-html-id-zookies Product/49#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/54#0` | page-product-dc-html-id-zookies Product/54#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/93#0` | page-product-dc-html-id-zookies Product/93#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/96#0` | page-product-dc-html-id-zookies Product/96#0 <span> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-shop-dc-html:Shop/11#0` | page-shop-dc-html Shop/11#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-signin-dc-html:SignIn/10#0` | page-signin-dc-html SignIn/10#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |

### Settled by rule label: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number (23)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/126#0` | nav-drawer-left Home>SiteHeader@7#0/126#0 <span> "★★★★★" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-gifts-dc-html:Gifts/80#0` | page-gifts-dc-html Gifts/80#0 <span> "£15" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-gifts-dc-html:Gifts/81#0` | page-gifts-dc-html Gifts/81#0 <span> "£25" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help-dc-html:Help/29` | page-help-dc-html Help/29 <span> "Ordering & delivery" | block:sgs/label | 1: 12 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help-dc-html:Help/69#0` | page-help-dc-html Help/69#0 <span> "Oats (gluten)" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help-dc-html:Help/70#0` | page-help-dc-html Help/70#0 <span> "Eggs" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help-dc-html:Help/71#0` | page-help-dc-html Help/71#0 <span> "Milk" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help-dc-html:Help/72#0` | page-help-dc-html Help/72#0 <span> "Fenugreek (legume)" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/137` | page-home-dc-html Home/137 <span> "Just had a baby" | block:sgs/label | 1: 4 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/218#0` | page-home-dc-html Home/218#0 <span> "★★★★★" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/226` | page-home-dc-html Home/226 <span> "★★★★★" | block:sgs/label | 1: 6 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/39#0` | page-home-dc-html Home/39#0 <span> "Baked" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/71#0` | page-home-dc-html Home/71#0 <div> "1 · Base" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/77#0` | page-home-dc-html Home/77#0 <div> "2 · Chips" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/83#0` | page-home-dc-html Home/83#0 <span> "3 · Flavours" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home-dc-html:Home/91#0` | page-home-dc-html Home/91#0 <div> "4 · How many" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/129` | page-product-dc-html-id-zookies Product/129 <span> "★★★★★" | block:sgs/label | 1: 3 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/19#0` | page-product-dc-html-id-zookies Product/19#0 <span> "Build your own" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/34#0` | page-product-dc-html-id-zookies Product/34#0 <div> "1 · How many" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/44#0` | page-product-dc-html-id-zookies Product/44#0 <div> "2 · Base" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/50#0` | page-product-dc-html-id-zookies Product/50#0 <div> "3 · Chips" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/56#0` | page-product-dc-html-id-zookies Product/56#0 <span> "4 · Flavours" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-shop-dc-html:Shop/44=sgs/label` | page-shop-dc-html Shop/44=sgs/label <span> "10% off every box" | block:sgs/label | 1: 1 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |

### Settled by rule listWrapper: a bare wrapper whose only content is one list goes: the list block is that wrapper (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/106#0` | nav-drawer-left Home>SiteHeader@7#0/106#0 <div> | unwrap | 1: a bare wrapper whose only content is one list goes: the list block is that wrapper | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/73#0` | nav-drawer-left Home>SiteHeader@7#0/73#0 <nav> | unwrap | 1: a bare wrapper whose only content is one list goes: the list block is that wrapper | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/91#0` | nav-drawer-left Home>SiteHeader@7#0/91#0 <div> | unwrap | 1: a bare wrapper whose only content is one list goes: the list block is that wrapper | accept |

### Settled by rule logoGrid: a group of three or more links that each hold only an image (a logo wall) is sgs/gallery with a link per image; the links are its items (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-footer:Home>SiteFooter@250#0/14#0` | site-footer Home>SiteFooter@250#0/14#0 <div> | block:sgs/gallery | 1: a group of three or more links that each hold only an image (a logo wall) is sgs/gallery with a link per image; the links are its items | accept |
| `skeleton:site-footer:Home>SiteFooter@250/16` | site-footer Home>SiteFooter@250/16 <a> | absorbed | 1: 6 copies of one template element; drawn by sgs/gallery: rule logoGrid | accept |
| `skeleton:site-footer:Home>SiteFooter@250/17` | site-footer Home>SiteFooter@250/17 <img> | absorbed | 1: 6 copies of one template element; drawn by sgs/gallery: rule logoGrid | accept |

### Settled by rule marqueeCodeItems: a strip whose items are created in code and whose own animation loops a translate for ever is a marquee like one with template items: a scrolling sgs/trust-bar (Bean, 2026-10-21) (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home-dc-html:Home/42#0` | page-home-dc-html Home/42#0 <div> "Baked fresh when you orderHandmade in BirminghamRegistered food businessFree UK delivery over £35" | block:sgs/trust-bar | 1: a strip whose items are created in code and whose own animation loops a translate for ever is a marquee like one with template items: a scrolling sgs/trust-bar (Bean, 2026-10-21) | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/18#0` | site-footer Home>SiteFooter@250#0/18#0 <div> "boost your milk, bite by bite✦baked when you order✦handmade in Birmingham✦one-handed snacking✦boost your milk, bite by bite✦baked when you order✦handmade in Birmingham✦one-handed snacking✦" | block:sgs/trust-bar | 1: a strip whose items are created in code and whose own animation loops a translate for ever is a marquee like one with template items: a scrolling sgs/trust-bar (Bean, 2026-10-21) | accept |

### Settled by rule navigation: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu (6)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/38#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/38#0 <nav> | block:sgs/nav-bar-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/39#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/39#0 <a> "Shop" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/40#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/40#0 <a> "Gifts" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/41#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/41#0 <a> "Subscribe & save" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/42#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/42#0 <a> "Help" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/43#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/43#0 <a> "Contact" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |

### Settled by rule optionSet: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it (39)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home-dc-html:Home/72#0` | page-home-dc-html Home/72#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-home-dc-html:Home/74` | page-home-dc-html Home/74 <button> "Classic oat" | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/75` | page-home-dc-html Home/75 <span> | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/78#0` | page-home-dc-html Home/78#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-home-dc-html:Home/80` | page-home-dc-html Home/80 <button> "Milk choc" | absorbed | 1: 8 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/85#0` | page-home-dc-html Home/85#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-home-dc-html:Home/87` | page-home-dc-html Home/87 <button> "Vanilla" | absorbed | 1: 22 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/88` | page-home-dc-html Home/88 <span> "✓" | absorbed | 1: 22 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/92#0` | page-home-dc-html Home/92#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-home-dc-html:Home/94` | page-home-dc-html Home/94 <button> | absorbed | 1: 6 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/95` | page-home-dc-html Home/95 <span> "8" | absorbed | 1: 6 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/96` | page-home-dc-html Home/96 <span> "£9.50" | absorbed | 1: 6 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/97` | page-home-dc-html Home/97 <span> "£1.19 each" | absorbed | 1: 6 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-home-dc-html:Home/99` | page-home-dc-html Home/99 <span> "Most popular" | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/35#0` | page-product-dc-html-id-zookies Product/35#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/37` | page-product-dc-html-id-zookies Product/37 <button> | absorbed | 1: 3 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/38` | page-product-dc-html-id-zookies Product/38 <span> "8" | absorbed | 1: 3 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/39` | page-product-dc-html-id-zookies Product/39 <span> "£9.50" | absorbed | 1: 3 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/40` | page-product-dc-html-id-zookies Product/40 <span> "£1.19 each" | absorbed | 1: 3 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/42` | page-product-dc-html-id-zookies Product/42 <span> "Most popular" | absorbed | 1: 2 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/45#0` | page-product-dc-html-id-zookies Product/45#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/47` | page-product-dc-html-id-zookies Product/47 <button> "Classic oat" | absorbed | 1: 2 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/48` | page-product-dc-html-id-zookies Product/48 <span> | absorbed | 1: 2 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/51#0` | page-product-dc-html-id-zookies Product/51#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/53` | page-product-dc-html-id-zookies Product/53 <button> "Milk choc" | absorbed | 1: 4 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/58#0` | page-product-dc-html-id-zookies Product/58#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/60` | page-product-dc-html-id-zookies Product/60 <button> "Vanilla" | absorbed | 1: 11 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/61` | page-product-dc-html-id-zookies Product/61 <span> "✓" | absorbed | 1: 11 copies of one template element; drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/63#0` | page-product-dc-html-id-zookies Product/63#0 <div> | block:sgs/option-picker | 1: a group of pressable chips (sizes, flavours, any option set) is the exclusive single-select option picker, which draws its own options: the chips and their label and tick spans are absorbed into it | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/64#0` | page-product-dc-html-id-zookies Product/64#0 <button> | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/65#0` | page-product-dc-html-id-zookies Product/65#0 <span> | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/66#0` | page-product-dc-html-id-zookies Product/66#0 <span> "Subscribe & save 10%" | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/67#0` | page-product-dc-html-id-zookies Product/67#0 <span> "Skip, swap flavours or cancel any time" | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/68#0` | page-product-dc-html-id-zookies Product/68#0 <span> | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/69#0` | page-product-dc-html-id-zookies Product/69#0 <span> "£19.35" | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/70#0` | page-product-dc-html-id-zookies Product/70#0 <span> "£21.50" | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/75#0` | page-product-dc-html-id-zookies Product/75#0 <button> | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/76#0` | page-product-dc-html-id-zookies Product/76#0 <span> "One-off box" | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/77#0` | page-product-dc-html-id-zookies Product/77#0 <span> "£21.50" | absorbed | 1: drawn by sgs/option-picker: rule optionSet | accept |

### Settled by rule optionSetFilter: a group of pressable chips whose choice narrows a list on the same surface stays the option picker and hands the filter wiring to the site build (Bean, 2026-10-21) (9)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-gifts-dc-html:Gifts/17#0` | page-gifts-dc-html Gifts/17#0 <div> | block:sgs/option-picker | 1: a group of pressable chips whose choice narrows a list on the same surface stays the option picker and hands the filter wiring to the site build (Bean, 2026-10-21) | accept |
| `skeleton:page-gifts-dc-html:Gifts/19` | page-gifts-dc-html Gifts/19 <button> "Baby shower" | absorbed | 1: 4 copies of one template element; drawn by sgs/option-picker: rule optionSetFilter | accept |
| `skeleton:page-gifts-dc-html:Gifts/21#0` | page-gifts-dc-html Gifts/21#0 <div> | block:sgs/option-picker | 1: a group of pressable chips whose choice narrows a list on the same surface stays the option picker and hands the filter wiring to the site build (Bean, 2026-10-21) | accept |
| `skeleton:page-gifts-dc-html:Gifts/23` | page-gifts-dc-html Gifts/23 <button> "Any" | absorbed | 1: 3 copies of one template element; drawn by sgs/option-picker: rule optionSetFilter | accept |
| `skeleton:page-help-dc-html:Help/19#0` | page-help-dc-html Help/19#0 <div> | block:sgs/option-picker | 1: a group of pressable chips whose choice narrows a list on the same surface stays the option picker and hands the filter wiring to the site build (Bean, 2026-10-21) | accept |
| `skeleton:page-help-dc-html:Help/21` | page-help-dc-html Help/21 <button> "All" | absorbed | 1: 6 copies of one template element; drawn by sgs/option-picker: rule optionSetFilter | accept |
| `skeleton:page-shop-dc-html:Shop/21#0` | page-shop-dc-html Shop/21#0 <div> | block:sgs/option-picker | 1: 2 copies of one template element on 2 surfaces; a group of pressable chips whose choice narrows a list on the same surface stays the option picker and hands the filter wiring to the site build (Bean, 2026-10-21) | accept |
| `skeleton:page-shop-dc-html:Shop/23` | page-shop-dc-html Shop/23 <button> "All" | absorbed | 1: 14 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSetFilter | accept |
| `skeleton:page-shop-dc-html:Shop/24` | page-shop-dc-html Shop/24 <span> "5" | absorbed | 1: 14 copies of one template element on 2 surfaces; drawn by sgs/option-picker: rule optionSetFilter | accept |

### Settled by rule optionSetForm: a group of pressable chips inside a form is a choice the form submits: the tiles field, which takes its options from the chips' text (Bean, 2026-10-21) (13)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:contact-form:Contact/48#0` | contact-form Contact/48#0 <div> | block:sgs/form-field-tiles | 1: a group of pressable chips inside a form is a choice the form submits: the tiles field, which takes its options from the chips' text (Bean, 2026-10-21) | accept |
| `skeleton:page-checkout-dc-html:Checkout/100` | page-checkout-dc-html Checkout/100 <button> | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/101` | page-checkout-dc-html Checkout/101 <span> | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/102` | page-checkout-dc-html Checkout/102 <span> | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/103` | page-checkout-dc-html Checkout/103 <b> "Royal Mail Tracked 48" | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/104` | page-checkout-dc-html Checkout/104 <span> "Arrives 2–3 days after the bake" | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/105` | page-checkout-dc-html Checkout/105 <b> "£3.95" | absorbed | 1: 4 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/73#0` | page-checkout-dc-html Checkout/73#0 <div> | block:sgs/form-field-tiles | 1: 2 copies of one template element on 2 surfaces; a group of pressable chips inside a form is a choice the form submits: the tiles field, which takes its options from the chips' text (Bean, 2026-10-21) | accept |
| `skeleton:page-checkout-dc-html:Checkout/74#0` | page-checkout-dc-html Checkout/74#0 <button> "Send to my address" | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/75#0` | page-checkout-dc-html Checkout/75#0 <span> "for me" | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/76#0` | page-checkout-dc-html Checkout/76#0 <button> "Send to someone else" | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/77#0` | page-checkout-dc-html Checkout/77#0 <span> "it’s a gift ♥" | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/form-field-tiles: rule optionSetForm | accept |
| `skeleton:page-checkout-dc-html:Checkout/98#0` | page-checkout-dc-html Checkout/98#0 <div> | block:sgs/form-field-tiles | 1: 2 copies of one template element on 2 surfaces; a group of pressable chips inside a form is a choice the form submits: the tiles field, which takes its options from the chips' text (Bean, 2026-10-21) | accept |

### Settled by rule pillButton: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link (12)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home-dc-html:Home/130#0` | page-home-dc-html Home/130#0 <a> "All gifts" | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-home-dc-html:Home/131#0` | page-home-dc-html Home/131#0 <span> "→" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-home-dc-html:Home/21#0` | page-home-dc-html Home/21#0 <a> "Build your box" | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-home-dc-html:Home/22#0` | page-home-dc-html Home/22#0 <span> "→" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-home-dc-html:Home/25#0` | page-home-dc-html Home/25#0 <a> "4.3 on Trustpilot" | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-home-dc-html:Home/26#0` | page-home-dc-html Home/26#0 <span> "★★★★★" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/28#0` | page-product-dc-html-id-zookies Product/28#0 <a> "4.3 · 8 Trustpilot reviews" | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/29#0` | page-product-dc-html-id-zookies Product/29#0 <span> "★★★★★" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/1` | page-shop-dc-html Shop>ProductCard@31/1 <a> | block:sgs/button | 1: 12 copies of one template element on 3 surfaces; a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/3` | page-shop-dc-html Shop>ProductCard@31/3 <span> "Build your own" | absorbed | 1: 12 copies of one template element on 3 surfaces; drawn by sgs/button: rule pillButton | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/24#0` | site-footer Home>SiteFooter@250#0/24#0 <a> "Build your box" | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/25#0` | site-footer Home>SiteFooter@250#0/25#0 <span> "→" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |

### Settled by rule siteInfoLink: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-footer:Home>SiteFooter@250#0/43#0` | site-footer Home>SiteFooter@250#0/43#0 <a> "Zainab@mamasmunches.com" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself | accept |

### Settled by rule solitaryIcon: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text (4)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-contact-dc-html:Contact/20#0` | page-contact-dc-html Contact/20#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |
| `skeleton:page-contact-dc-html:Contact/27#0` | page-contact-dc-html Contact/27#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |
| `skeleton:page-contact-dc-html:Contact/35#0` | page-contact-dc-html Contact/35#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |
| `skeleton:page-help-dc-html:Help/14#0` | page-help-dc-html Help/14#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |

### Settled by rule surfaceRoot: a drawer surface is sgs/nav-drawer, whose own settings draw its top row, logo, close button and body (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/56#0` | nav-drawer-left Home>SiteHeader@7#0/56#0 <aside> | block:sgs/nav-drawer | 1: a drawer surface is sgs/nav-drawer, whose own settings draw its top row, logo, close button and body | accept |

### Settled by rule typedDivider: a typed divider between items is the row's separators setting, not a block (4)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-product-dc-html-id-zookies:Product/11#0` | page-product-dc-html-id-zookies Product/11#0 <span> "/" | remove | 1: a typed divider between items is the row's separators setting, not a block | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/13#0` | page-product-dc-html-id-zookies Product/13#0 <span> "/" | remove | 1: a typed divider between items is the row's separators setting, not a block | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/11#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/11#0 <span> "·" | remove | 1: a typed divider between items is the row's separators setting, not a block | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/9#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/9#0 <span> "·" | remove | 1: a typed divider between items is the row's separators setting, not a block | accept |

### Settled by rule wholeCardLink: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) (16)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/123#0` | nav-drawer-left Home>SiteHeader@7#0/123#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/63#0` | nav-drawer-left Home>SiteHeader@7#0/63#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/68#0` | nav-drawer-left Home>SiteHeader@7#0/68#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-contact-dc-html:Contact/19#0` | page-contact-dc-html Contact/19#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-contact-dc-html:Contact/26#0` | page-contact-dc-html Contact/26#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-contact-dc-html:Contact/34#0` | page-contact-dc-html Contact/34#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-gifts-dc-html:Gifts/73#0` | page-gifts-dc-html Gifts/73#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-help-dc-html:Help/84#0` | page-help-dc-html Help/84#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-home-dc-html:Home/134` | page-home-dc-html Home/134 <a> | block:sgs/container | 1: 4 copies of one template element; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-home-dc-html:Home/157#0` | page-home-dc-html Home/157#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-home-dc-html:Home/215#0` | page-home-dc-html Home/215#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-home-dc-html:Home/47#0` | page-home-dc-html Home/47#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-home-dc-html:Home/55#0` | page-home-dc-html Home/55#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-shop-dc-html:Shop/33#0` | page-shop-dc-html Shop/33#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-shop-dc-html:Shop/39#0` | page-shop-dc-html Shop/39#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-shop-dc-html:Shop/45#0` | page-shop-dc-html Shop/45#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |

### Settled by rule widthWrapper: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:site-footer:Home>SiteFooter@250#0/20#0` | site-footer Home>SiteFooter@250#0/20#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/4#0` | site-footer Home>SiteFooter@250#0/4#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/6#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/6#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there | accept |

### Confident proposals (Accept all covers these) (364)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:checkout-form:Checkout/106#0` | checkout-form Checkout/106#0 <fieldset> | block:sgs/container | 1 | accept |
| `skeleton:checkout-form:Checkout/32#0` | checkout-form Checkout/32#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:checkout-form:Checkout/42#0` | checkout-form Checkout/42#0 <fieldset> | block:sgs/container | 1 | accept |
| `skeleton:checkout-form:Checkout/57#0` | checkout-form Checkout/57#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:checkout-form:Checkout/61#0` | checkout-form Checkout/61#0 <span> "Create an account (optional)" | remove | 1: inside a removed element (Checkout/60#0) | accept |
| `skeleton:checkout-form:Checkout/62#0` | checkout-form Checkout/62#0 <span> "See your bake dates and manage subscriptions online." | remove | 1: inside a removed element (Checkout/60#0) | accept |
| `skeleton:checkout-form:Checkout/71#0` | checkout-form Checkout/71#0 <fieldset> | block:sgs/container | 1 | accept |
| `skeleton:checkout-form:Checkout/85#0` | checkout-form Checkout/85#0 <fieldset> | block:sgs/container | 1 | accept |
| `skeleton:contact-form:Contact/45#0` | contact-form Contact/45#0 <h2> "Send a message" | block:sgs/heading | 0.75 | accept |
| `skeleton:contact-form:Contact/46#0` | contact-form Contact/46#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:contact-form:Contact/51#0` | contact-form Contact/51#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:contact-form:Contact/67#0` | contact-form Contact/67#0 <button> "Send message →" | block:sgs/button | 0.75 | accept |
| `skeleton:create-account:SignIn/41#0` | create-account SignIn/41#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:create-account:SignIn/58#0` | create-account SignIn/58#0 <button> "Create account →" | block:sgs/button | 0.75 | accept |
| `skeleton:forgotten-password-flow:SignIn/61#0` | forgotten-password-flow SignIn/61#0 <button> "← Back to sign in" | block:sgs/button | 0.75 | accept |
| `skeleton:forgotten-password-flow:SignIn/62#0` | forgotten-password-flow SignIn/62#0 <h2> "Forgotten your password?" | block:sgs/heading | 0.75 | accept |
| `skeleton:forgotten-password-flow:SignIn/63#0` | forgotten-password-flow SignIn/63#0 <p> "Pop in the email you signed up with and we’ll send you a link to choose a new one." | block:sgs/text | 0.75 | accept |
| `skeleton:forgotten-password-flow:SignIn/68#0` | forgotten-password-flow SignIn/68#0 <button> "Send reset link" | block:sgs/button | 0.75 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/104#0` | nav-drawer-left Home>SiteHeader@7#0/104#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/107#0` | nav-drawer-left Home>SiteHeader@7#0/107#0 <a> "WhatsApp" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/112#0` | nav-drawer-left Home>SiteHeader@7#0/112#0 <a> "Email" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/117#0` | nav-drawer-left Home>SiteHeader@7#0/117#0 <a> "Instagram" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/125#0` | nav-drawer-left Home>SiteHeader@7#0/125#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/57#0` | nav-drawer-left Home>SiteHeader@7#0/57#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/59#0` | nav-drawer-left Home>SiteHeader@7#0/59#0 <button> "×" | block:sgs/button | 0.75 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/62#0` | nav-drawer-left Home>SiteHeader@7#0/62#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/65#0` | nav-drawer-left Home>SiteHeader@7#0/65#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/70#0` | nav-drawer-left Home>SiteHeader@7#0/70#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/74#0` | nav-drawer-left Home>SiteHeader@7#0/74#0 <a> "Shop all" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/76#0` | nav-drawer-left Home>SiteHeader@7#0/76#0 <a> "Zookies" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/78#0` | nav-drawer-left Home>SiteHeader@7#0/78#0 <a> "Taster Trio" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/80#0` | nav-drawer-left Home>SiteHeader@7#0/80#0 <a> "Gifts" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/82#0` | nav-drawer-left Home>SiteHeader@7#0/82#0 <a> "Subscribe & save" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/84#0` | nav-drawer-left Home>SiteHeader@7#0/84#0 <a> "Help & FAQs" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/86#0` | nav-drawer-left Home>SiteHeader@7#0/86#0 <a> "Contact" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/88#0` | nav-drawer-left Home>SiteHeader@7#0/88#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/89#0` | nav-drawer-left Home>SiteHeader@7#0/89#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/92#0` | nav-drawer-left Home>SiteHeader@7#0/92#0 <a> "Sign in" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:nav-drawer-left:Home>SiteHeader@7#0/93#0` | nav-drawer-left Home>SiteHeader@7#0/93#0 <a> "Create account" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:page-account-dc-html:Account/12#0` | page-account-dc-html Account/12#0 <h1> "My account" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-account-dc-html:Account/17#0` | page-account-dc-html Account/17#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-account-dc-html:Account/19#0` | page-account-dc-html Account/19#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-account-dc-html:Account/20#0` | page-account-dc-html Account/20#0 <h2> "Sign in to see your orders" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-account-dc-html:Account/21#0` | page-account-dc-html Account/21#0 <p> "Your orders, bake dates, subscriptions and saved addresses live here." | block:sgs/text | 0.75 | accept |
| `skeleton:page-account-dc-html:Account/23#0` | page-account-dc-html Account/23#0 <a> "Sign in →" | block:sgs/button | 0.75 | accept |
| `skeleton:page-account-dc-html:Account/24#0` | page-account-dc-html Account/24#0 <a> "Create an account" | block:sgs/button | 0.75 | accept |
| `skeleton:page-account-dc-html:Account/8#0` | page-account-dc-html Account/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-basket-dc-html:Basket/11#0` | page-basket-dc-html Basket/11#0 <h1> "Your basket" | block:sgs/container | 0.75 | accept |
| `skeleton:page-basket-dc-html:Basket/22#0` | page-basket-dc-html Basket/22#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-basket-dc-html:Basket/27#0` | page-basket-dc-html Basket/27#0 <div> | remove | 1: Bean marked remove in the intake review on 2026-10-26: the element is absorbed into its parent block | accept |
| `skeleton:page-basket-dc-html:Basket/29` | page-basket-dc-html Basket/29 <div> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/30` | page-basket-dc-html Basket/30 <div> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/34` | page-basket-dc-html Basket/34 <div> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/35` | page-basket-dc-html Basket/35 <div> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/36` | page-basket-dc-html Basket/36 <button> "−" | block:sgs/button | 0.75: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/38` | page-basket-dc-html Basket/38 <button> "+" | block:sgs/button | 0.75: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/39` | page-basket-dc-html Basket/39 <button> "Remove" | block:sgs/button | 0.75: 2 copies of one template element | accept |
| `skeleton:page-basket-dc-html:Basket/57#0` | page-basket-dc-html Basket/57#0 <div> "Summary" | block:sgs/heading | 0.8 | accept |
| `skeleton:page-basket-dc-html:Basket/58#0` | page-basket-dc-html Basket/58#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-basket-dc-html:Basket/61#0` | page-basket-dc-html Basket/61#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-basket-dc-html:Basket/64#0` | page-basket-dc-html Basket/64#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-basket-dc-html:Basket/67#0` | page-basket-dc-html Basket/67#0 <a> "Checkout securely →" | block:sgs/button | 0.75 | accept |
| `skeleton:page-basket-dc-html:Basket/69#0` | page-basket-dc-html Basket/69#0 <button> "Apple Pay" | block:sgs/button | 0.75 | accept |
| `skeleton:page-basket-dc-html:Basket/70#0` | page-basket-dc-html Basket/70#0 <button> "Google Pay" | block:sgs/button | 0.75 | accept |
| `skeleton:page-basket-dc-html:Basket/72#0` | page-basket-dc-html Basket/72#0 <a> "Keep shopping" | block:sgs/button | 0.75 | accept |
| `skeleton:page-basket-dc-html:Basket/8#0` | page-basket-dc-html Basket/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout-dc-html:Checkout/110#0` | page-checkout-dc-html Checkout/110#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/115#0` | page-checkout-dc-html Checkout/115#0 <div> "Contains oats (gluten), eggs, milk and fenugreek unless you chose the vegan base. Made in a kitchen that handles tree nuts." | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/116#0` | page-checkout-dc-html Checkout/116#0 <a> "Full allergen info" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/117#0` | page-checkout-dc-html Checkout/117#0 <button> "Pay £30.45" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/118#0` | page-checkout-dc-html Checkout/118#0 <div> "By placing your order you agree to our ." | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/119#0` | page-checkout-dc-html Checkout/119#0 <a> "terms" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/124` | page-checkout-dc-html Checkout/124 <div> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-checkout-dc-html:Checkout/131#0` | page-checkout-dc-html Checkout/131#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout-dc-html:Checkout/133#0` | page-checkout-dc-html Checkout/133#0 <button> "Apply" | block:sgs/button | 0.75 | accept |
| `skeleton:page-checkout-dc-html:Checkout/134#0` | page-checkout-dc-html Checkout/134#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout-dc-html:Checkout/137#0` | page-checkout-dc-html Checkout/137#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout-dc-html:Checkout/140#0` | page-checkout-dc-html Checkout/140#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout-dc-html:Checkout/16#0` | page-checkout-dc-html Checkout/16#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout-dc-html:Checkout/19#0` | page-checkout-dc-html Checkout/19#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout-dc-html:Checkout/34#0` | page-checkout-dc-html Checkout/34#0 <h1> "Checkout" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/36#0` | page-checkout-dc-html Checkout/36#0 <button> "Apple Pay" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/37#0` | page-checkout-dc-html Checkout/37#0 <button> "Google Pay" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/38#0` | page-checkout-dc-html Checkout/38#0 <button> "PayPal" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/39#0` | page-checkout-dc-html Checkout/39#0 <div> "or pay by card" | block:sgs/container | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/40#0` | page-checkout-dc-html Checkout/40#0 <span> | block:sgs/separator | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/41#0` | page-checkout-dc-html Checkout/41#0 <span> | block:sgs/separator | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/50#0` | page-checkout-dc-html Checkout/50#0 <div> "Checking out as a guest." | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/51#0` | page-checkout-dc-html Checkout/51#0 <a> "Have an account? Sign in" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/87#0` | page-checkout-dc-html Checkout/87#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/90#0` | page-checkout-dc-html Checkout/90#0 <button> "Find address" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-checkout-dc-html:Checkout/93#0` | page-checkout-dc-html Checkout/93#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-contact-dc-html:Contact/13#0` | page-contact-dc-html Contact/13#0 <h1> "Say hello to Zainab" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-contact-dc-html:Contact/14#0` | page-contact-dc-html Contact/14#0 <p> "Questions about an order, a gift, allergens or a bulk order for a baby shower or event? Get in touch however suits you." | block:sgs/text | 0.75 | accept |
| `skeleton:page-contact-dc-html:Contact/17#0` | page-contact-dc-html Contact/17#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-contact-dc-html:Contact/18#0` | page-contact-dc-html Contact/18#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-contact-dc-html:Contact/40#0` | page-contact-dc-html Contact/40#0 <span> "Zainab@mamasmunches.com" | block:sgs/business-info | 0.8 | accept |
| `skeleton:page-contact-dc-html:Contact/41#0` | page-contact-dc-html Contact/41#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-contact-dc-html:Contact/42#0` | page-contact-dc-html Contact/42#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-contact-dc-html:Contact/74#0` | page-contact-dc-html Contact/74#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-contact-dc-html:Contact/77` | page-contact-dc-html Contact/77 <a> "When will my order arrive?" | block:sgs/icon-list | 0.7: 4 copies of one template element | accept |
| `skeleton:page-contact-dc-html:Contact/8#0` | page-contact-dc-html Contact/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/10#0` | page-gifts-dc-html Gifts/10#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/13#0` | page-gifts-dc-html Gifts/13#0 <h1> "Gifts she’ll actually eat" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/14#0` | page-gifts-dc-html Gifts/14#0 <p> "Baked fresh when you order and sent with your note. We always leave the prices off." | block:sgs/text | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/24#0` | page-gifts-dc-html Gifts/24#0 <a> "Show 4 gifts ↓" | block:sgs/button | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/25#0` | page-gifts-dc-html Gifts/25#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/26#0` | page-gifts-dc-html Gifts/26#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/27#0` | page-gifts-dc-html Gifts/27#0 <div> | block:sgs/media | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/29#0` | page-gifts-dc-html Gifts/29#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/34#0` | page-gifts-dc-html Gifts/34#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/35#0` | page-gifts-dc-html Gifts/35#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/36#0` | page-gifts-dc-html Gifts/36#0 <h2> "Gifts for “just had a baby”" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/37#0` | page-gifts-dc-html Gifts/37#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/39` | page-gifts-dc-html Gifts/39 <div> | block:sgs/container | 0.75: 4 copies of one template element | accept |
| `skeleton:page-gifts-dc-html:Gifts/40` | page-gifts-dc-html Gifts/40 <div> | block:sgs/container | 0.75: 4 copies of one template element | accept |
| `skeleton:page-gifts-dc-html:Gifts/44#0` | page-gifts-dc-html Gifts/44#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/45#0` | page-gifts-dc-html Gifts/45#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/47#0` | page-gifts-dc-html Gifts/47#0 <h2> "How gifting works" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/48#0` | page-gifts-dc-html Gifts/48#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/50` | page-gifts-dc-html Gifts/50 <div> | block:sgs/container | 0.75: 3 copies of one template element | accept |
| `skeleton:page-gifts-dc-html:Gifts/55#0` | page-gifts-dc-html Gifts/55#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/56#0` | page-gifts-dc-html Gifts/56#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/58#0` | page-gifts-dc-html Gifts/58#0 <h2> "Write her a note" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/59#0` | page-gifts-dc-html Gifts/59#0 <p> "See how it’ll look in the box. You can finish it at checkout." | block:sgs/text | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/66#0` | page-gifts-dc-html Gifts/66#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-gifts-dc-html:Gifts/75#0` | page-gifts-dc-html Gifts/75#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/79#0` | page-gifts-dc-html Gifts/79#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-gifts-dc-html:Gifts/8#0` | page-gifts-dc-html Gifts/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/12#0` | page-help-dc-html Help/12#0 <h1> "Help & FAQs" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/23#0` | page-help-dc-html Help/23#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help-dc-html:Help/26` | page-help-dc-html Help/26 <div> | block:sgs/container | 0.75: 12 copies of one template element | accept |
| `skeleton:page-help-dc-html:Help/27` | page-help-dc-html Help/27 <button> | block:sgs/container | 1: 12 copies of one template element | accept |
| `skeleton:page-help-dc-html:Help/28` | page-help-dc-html Help/28 <span> | block:sgs/container | 1: 12 copies of one template element | accept |
| `skeleton:page-help-dc-html:Help/33#0` | page-help-dc-html Help/33#0 <p> "Zainab bakes every order fresh when it comes in, then posts it with Royal Mail Tracked. Most orders are with you in 3–5 days." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/37#0` | page-help-dc-html Help/37#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/38#0` | page-help-dc-html Help/38#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/40#0` | page-help-dc-html Help/40#0 <h2> "Delivery" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/41#0` | page-help-dc-html Help/41#0 <p> "Every order is baked fresh when it comes in, then posted with Royal Mail Tracked. Most orders are with you in 3–5 days." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/42#0` | page-help-dc-html Help/42#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help-dc-html:Help/43#0` | page-help-dc-html Help/43#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help-dc-html:Help/44#0` | page-help-dc-html Help/44#0 <span> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/48#0` | page-help-dc-html Help/48#0 <b> "£3.95" | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/51#0` | page-help-dc-html Help/51#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help-dc-html:Help/52#0` | page-help-dc-html Help/52#0 <span> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/57#0` | page-help-dc-html Help/57#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help-dc-html:Help/58#0` | page-help-dc-html Help/58#0 <span> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/64#0` | page-help-dc-html Help/64#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/65#0` | page-help-dc-html Help/65#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/67#0` | page-help-dc-html Help/67#0 <h2> "Ingredients & allergens" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/68#0` | page-help-dc-html Help/68#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help-dc-html:Help/73#0` | page-help-dc-html Help/73#0 <p> "Fenugreek may cross-react with peanut and soy allergies in sensitive people. Made in a kitchen that also handles tree nuts, so not suitable for anyone with a tree nut allergy." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/74#0` | page-help-dc-html Help/74#0 <p> "no eggs or dairy. Still contains oats, flaxseed and fenugreek, and the same tree nut advice applies. Some flavours and chips may add allergens; each is listed on the product page." | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/76#0` | page-help-dc-html Help/76#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/77#0` | page-help-dc-html Help/77#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help-dc-html:Help/78#0` | page-help-dc-html Help/78#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/8#0` | page-help-dc-html Help/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/80#0` | page-help-dc-html Help/80#0 <p> "Policy text to be supplied." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/81#0` | page-help-dc-html Help/81#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/83#0` | page-help-dc-html Help/83#0 <p> "Terms text to be supplied." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help-dc-html:Help/85#0` | page-help-dc-html Help/85#0 <span> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/100#0` | page-home-dc-html Home/100#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/101#0` | page-home-dc-html Home/101#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/103#0` | page-home-dc-html Home/103#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/107#0` | page-home-dc-html Home/107#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/108#0` | page-home-dc-html Home/108#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/109#0` | page-home-dc-html Home/109#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/112#0` | page-home-dc-html Home/112#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/118` | page-home-dc-html Home/118 <button> "Every 2 weeks" | block:sgs/button | 0.75: 2 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/119#0` | page-home-dc-html Home/119#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/12#0` | page-home-dc-html Home/12#0 <div> "good morning, mama" | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/122#0` | page-home-dc-html Home/122#0 <button> "Subscribe · £19.35" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/124#0` | page-home-dc-html Home/124#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/125#0` | page-home-dc-html Home/125#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/126#0` | page-home-dc-html Home/126#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/127#0` | page-home-dc-html Home/127#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/129#0` | page-home-dc-html Home/129#0 <h2> "A gift she’ll actually eat" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/132#0` | page-home-dc-html Home/132#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/135` | page-home-dc-html Home/135 <div> | block:sgs/container | 0.75: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/136` | page-home-dc-html Home/136 <div> | block:sgs/media | 1: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/138` | page-home-dc-html Home/138 <div> | block:sgs/container | 1: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/14#0` | page-home-dc-html Home/14#0 <h1> "Made for the mum who needs it" | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/141` | page-home-dc-html Home/141 <span> | block:sgs/container | 1: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/145#0` | page-home-dc-html Home/145#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/148` | page-home-dc-html Home/148 <button> | block:sgs/button | 0.75: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/150#0` | page-home-dc-html Home/150#0 <button> "←" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/151#0` | page-home-dc-html Home/151#0 <button> "→" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/152#0` | page-home-dc-html Home/152#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/153#0` | page-home-dc-html Home/153#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/159#0` | page-home-dc-html Home/159#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/163#0` | page-home-dc-html Home/163#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/164#0` | page-home-dc-html Home/164#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/168#0` | page-home-dc-html Home/168#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/169#0` | page-home-dc-html Home/169#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/17#0` | page-home-dc-html Home/17#0 <span> "most" | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/171#0` | page-home-dc-html Home/171#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/174#0` | page-home-dc-html Home/174#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/176#0` | page-home-dc-html Home/176#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/179#0` | page-home-dc-html Home/179#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/181#0` | page-home-dc-html Home/181#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/184#0` | page-home-dc-html Home/184#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/186#0` | page-home-dc-html Home/186#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/189#0` | page-home-dc-html Home/189#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/19#0` | page-home-dc-html Home/19#0 <p> "Giant, filling lactation cookies with oats, brewer’s yeast, flaxseed and fenugreek. Built the way you like them and baked fresh in Birmingham the moment you order." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/190#0` | page-home-dc-html Home/190#0 <h2> "Proper ingredients, from generations of mums" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/191#0` | page-home-dc-html Home/191#0 <p> "The same four have gone into postpartum food for generations, from Pakistan to West Africa. No shortcuts, no preservatives." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/192#0` | page-home-dc-html Home/192#0 <div> "We make nourishing food, not medicine. If you’re worried about your supply, your midwife, health visitor or a lactation consultant (IBCLC) is the right person to talk to." | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/193#0` | page-home-dc-html Home/193#0 <a> "Allergens →" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/194#0` | page-home-dc-html Home/194#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/195#0` | page-home-dc-html Home/195#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/196#0` | page-home-dc-html Home/196#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/201#0` | page-home-dc-html Home/201#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/203#0` | page-home-dc-html Home/203#0 <p> "“My story with lactation cookies started when my friend started struggling with breastfeeding her newborn.”" | block:sgs/text | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/204#0` | page-home-dc-html Home/204#0 <p> "At the time, we had no choice but to start making lactation cookies ourselves, praying that it would work for the sake of her baby and amazingly, it did! These cookies helped her milk supply almost immediately and I was so grateful to have been able to make her early motherhood days just a bit easier." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/205#0` | page-home-dc-html Home/205#0 <p> "Now I hope that I can do the same thing for you. Using natural, wholesome ingredients, everything is made with care and intention for breastfeeding mums and their new beautiful babies." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/206#0` | page-home-dc-html Home/206#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/208#0` | page-home-dc-html Home/208#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/209#0` | page-home-dc-html Home/209#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/210#0` | page-home-dc-html Home/210#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/211#0` | page-home-dc-html Home/211#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/213#0` | page-home-dc-html Home/213#0 <h2> "Loved by mums, and the people who love them" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/214#0` | page-home-dc-html Home/214#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/217#0` | page-home-dc-html Home/217#0 <span> "8 on Trustpilot ↗" | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/220#0` | page-home-dc-html Home/220#0 <button> "←" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/221#0` | page-home-dc-html Home/221#0 <button> "→" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/222#0` | page-home-dc-html Home/222#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/224` | page-home-dc-html Home/224 <article> | block:sgs/container | 1: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/225` | page-home-dc-html Home/225 <div> | block:sgs/container | 1: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/228` | page-home-dc-html Home/228 <h3> "Healthy and filling snack" | block:sgs/heading | 0.75: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/229` | page-home-dc-html Home/229 <p> "I received the strawberry and milk chocolate chip cookies. I gave half of them to my SIL, who is also postpartum. They were fresh, soft and delicious! … I think these would be lovely to gift a new Mum." | block:sgs/text | 0.75: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/23#0` | page-home-dc-html Home/23#0 <a> "Send a gift" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/230` | page-home-dc-html Home/230 <div> | block:sgs/container | 1: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/235` | page-home-dc-html Home/235 <button> | block:sgs/button | 0.75: 6 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/237#0` | page-home-dc-html Home/237#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/238#0` | page-home-dc-html Home/238#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/240#0` | page-home-dc-html Home/240#0 <h2> "Questions mums ask" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/241#0` | page-home-dc-html Home/241#0 <p> "Can’t see yours? Message Zainab on WhatsApp, or read the full ." | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/242#0` | page-home-dc-html Home/242#0 <a> "Help & FAQs" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/243#0` | page-home-dc-html Home/243#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/245` | page-home-dc-html Home/245 <div> | block:sgs/container | 0.75: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/246` | page-home-dc-html Home/246 <button> "When will my order arrive?" | block:sgs/container | 1: 4 copies of one template element | accept |
| `skeleton:page-home-dc-html:Home/249#0` | page-home-dc-html Home/249#0 <p> "Zainab bakes every order fresh when it comes in, then posts it with Royal Mail Tracked. Most orders are with you in 3–5 days." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/27#0` | page-home-dc-html Home/27#0 <a> "New? Taster Trio, 3 for £5 →" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/38#0` | page-home-dc-html Home/38#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/44#0` | page-home-dc-html Home/44#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/45#0` | page-home-dc-html Home/45#0 <h2> "Who are we baking for today?" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/46#0` | page-home-dc-html Home/46#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/49#0` | page-home-dc-html Home/49#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/53#0` | page-home-dc-html Home/53#0 <span> "Build your box" | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/57#0` | page-home-dc-html Home/57#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/61#0` | page-home-dc-html Home/61#0 <span> "Shop gifts" | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/63#0` | page-home-dc-html Home/63#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/64#0` | page-home-dc-html Home/64#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/65#0` | page-home-dc-html Home/65#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/66#0` | page-home-dc-html Home/66#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/68#0` | page-home-dc-html Home/68#0 <h2> "Build your Zookie" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/69#0` | page-home-dc-html Home/69#0 <p> "Nothing sits on a shelf. Pick a base, your chips and a fruit, and Zainab bakes your box fresh." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/70#0` | page-home-dc-html Home/70#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/76#0` | page-home-dc-html Home/76#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/8#0` | page-home-dc-html Home/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/81#0` | page-home-dc-html Home/81#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home-dc-html:Home/82#0` | page-home-dc-html Home/82#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home-dc-html:Home/90#0` | page-home-dc-html Home/90#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/10#0` | page-product-dc-html-id-zookies Product/10#0 <a> "Home" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/108#0` | page-product-dc-html-id-zookies Product/108#0 <button> "Add to basket · £21.50" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/109#0` | page-product-dc-html-id-zookies Product/109#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/110#0` | page-product-dc-html-id-zookies Product/110#0 <div> "Baked fresh when you order" | block:sgs/container | 1 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/112#0` | page-product-dc-html-id-zookies Product/112#0 <div> "With you in 3–5 days" | block:sgs/container | 1 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/114#0` | page-product-dc-html-id-zookies Product/114#0 <div> "Free UK delivery over £35" | block:sgs/container | 1 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/119` | page-product-dc-html-id-zookies Product/119 <button> "Ingredients & allergens" | block:sgs/container | 1: 4 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/12#0` | page-product-dc-html-id-zookies Product/12#0 <a> "Shop" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/122#0` | page-product-dc-html-id-zookies Product/122#0 <p> "Every Zookie contains oats (gluten), brewer’s yeast, flaxseed and fenugreek, plus eggs and milk unless you choose the vegan base. Fenugreek is a legume and may cross-react with peanut or soy allergies. Made in a kitchen that also handles tree nuts." | block:sgs/text | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/123#0` | page-product-dc-html-id-zookies Product/123#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/125#0` | page-product-dc-html-id-zookies Product/125#0 <h2> "What people are saying" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/126#0` | page-product-dc-html-id-zookies Product/126#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/128` | page-product-dc-html-id-zookies Product/128 <article> | block:sgs/container | 1: 3 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/130` | page-product-dc-html-id-zookies Product/130 <h3> "Healthy and filling snack" | block:sgs/heading | 0.75: 3 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/131` | page-product-dc-html-id-zookies Product/131 <p> "I received the strawberry and milk chocolate chip cookies. I gave half of them to my SIL, who is also postpartum. They were fresh, soft and delicious! … I think these would be lovely to gift a new Mum." | block:sgs/text | 0.75: 3 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/132` | page-product-dc-html-id-zookies Product/132 <div> "· June 2026" | block:sgs/container | 0.75: 3 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/134#0` | page-product-dc-html-id-zookies Product/134#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/135#0` | page-product-dc-html-id-zookies Product/135#0 <h2> "You might also like" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/136#0` | page-product-dc-html-id-zookies Product/136#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/138` | page-product-dc-html-id-zookies Product/138 <div> | block:sgs/container | 0.75: 3 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/139` | page-product-dc-html-id-zookies Product/139 <div> | block:sgs/container | 0.75: 3 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/23` | page-product-dc-html-id-zookies Product/23 <button> | block:sgs/button | 0.75: 4 copies of one template element | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/27#0` | page-product-dc-html-id-zookies Product/27#0 <h1> "Zookies" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/30#0` | page-product-dc-html-id-zookies Product/30#0 <p> "Our giant lactation cookie, baked to order in the flavour you pick." | block:sgs/text | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/55#0` | page-product-dc-html-id-zookies Product/55#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/7#0` | page-product-dc-html-id-zookies Product/7#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/8#0` | page-product-dc-html-id-zookies Product/8#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product-dc-html-id-zookies:Product/9#0` | page-product-dc-html-id-zookies Product/9#0 <nav> | block:sgs/container | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/10#0` | page-shop-dc-html Shop/10#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/13#0` | page-shop-dc-html Shop/13#0 <h1> "The shop" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-shop-dc-html:Shop/14#0` | page-shop-dc-html Shop/14#0 <p> "Every Zookie is baked fresh when you order and with you in 3–5 days. Free UK delivery over £35." | block:sgs/text | 0.75 | accept |
| `skeleton:page-shop-dc-html:Shop/26#0` | page-shop-dc-html Shop/26#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-shop-dc-html:Shop/28#0` | page-shop-dc-html Shop/28#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/30` | page-shop-dc-html Shop/30 <div> | block:sgs/container | 0.75: 5 copies of one template element | accept |
| `skeleton:page-shop-dc-html:Shop/31` | page-shop-dc-html Shop/31 <div> | block:sgs/container | 0.75: 5 copies of one template element | accept |
| `skeleton:page-shop-dc-html:Shop/32#0` | page-shop-dc-html Shop/32#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/37#0` | page-shop-dc-html Shop/37#0 <span> "Start building" | block:sgs/container | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/42#0` | page-shop-dc-html Shop/42#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/46#0` | page-shop-dc-html Shop/46#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/50#0` | page-shop-dc-html Shop/50#0 <div> | block:sgs/media | 1 | accept |
| `skeleton:page-shop-dc-html:Shop/8#0` | page-shop-dc-html Shop/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/0` | page-shop-dc-html Shop>ProductCard@31/0 <div> | block:sgs/container | 1: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/11` | page-shop-dc-html Shop>ProductCard@31/11 <button> "Build your box" | block:sgs/button | 0.75: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/4` | page-shop-dc-html Shop>ProductCard@31/4 <div> | block:sgs/container | 1: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/5` | page-shop-dc-html Shop>ProductCard@31/5 <a> "Zookies" | block:sgs/button | 0.75: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/7` | page-shop-dc-html Shop>ProductCard@31/7 <p> "Our giant lactation cookie, baked to order in the flavour you pick." | block:sgs/text | 0.75: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-shop-dc-html:Shop>ProductCard@31/8` | page-shop-dc-html Shop>ProductCard@31/8 <div> | block:sgs/container | 1: 12 copies of one template element on 3 surfaces | accept |
| `skeleton:page-signin-dc-html:SignIn/101` | page-signin-dc-html SignIn/101 <div> | block:sgs/container | 0.75: 3 copies of one template element | accept |
| `skeleton:page-signin-dc-html:SignIn/104#0` | page-signin-dc-html SignIn/104#0 <div> "You don’t need an account to order. Checkout works fine as a guest, and you can create one at the end." | block:sgs/container | 0.75 | accept |
| `skeleton:page-signin-dc-html:SignIn/105#0` | page-signin-dc-html SignIn/105#0 <a> "Go to the shop →" | block:sgs/button | 0.75 | accept |
| `skeleton:page-signin-dc-html:SignIn/12#0` | page-signin-dc-html SignIn/12#0 <h1> "Sign in" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-signin-dc-html:SignIn/14#0` | page-signin-dc-html SignIn/14#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-signin-dc-html:SignIn/15#0` | page-signin-dc-html SignIn/15#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-signin-dc-html:SignIn/24#0` | page-signin-dc-html SignIn/24#0 <button> "Sign in" | block:sgs/button | 0.75 | accept |
| `skeleton:page-signin-dc-html:SignIn/25#0` | page-signin-dc-html SignIn/25#0 <button> "Create account" | block:sgs/button | 0.75 | accept |
| `skeleton:page-signin-dc-html:SignIn/37#0` | page-signin-dc-html SignIn/37#0 <button> "Sign in →" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin-dc-html:SignIn/38#0` | page-signin-dc-html SignIn/38#0 <button> "Forgotten your password?" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin-dc-html:SignIn/8#0` | page-signin-dc-html SignIn/8#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-signin-dc-html:SignIn/95#0` | page-signin-dc-html SignIn/95#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-signin-dc-html:SignIn/97#0` | page-signin-dc-html SignIn/97#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-signin-dc-html:SignIn/99` | page-signin-dc-html SignIn/99 <div> | block:sgs/container | 1: 3 copies of one template element | accept |
| `skeleton:product-gift-note:Product/97#0` | product-gift-note Product/97#0 <span> "Send it as a gift" | remove | 1: inside a removed element (Product/96#0) | accept |
| `skeleton:product-gift-note:Product/98#0` | product-gift-note Product/98#0 <span> "Add a note. We’ll leave the prices off." | remove | 1: inside a removed element (Product/96#0) | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/19#0` | site-footer Home>SiteFooter@250#0/19#0 <div> | block:sgs/site-footer-row | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/2#0` | site-footer Home>SiteFooter@250#0/2#0 <footer> | block:sgs/site-footer | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/21#0` | site-footer Home>SiteFooter@250#0/21#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/22#0` | site-footer Home>SiteFooter@250#0/22#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/23#0` | site-footer Home>SiteFooter@250#0/23#0 <h2> "Hungry? Of course you are." | block:sgs/heading | 0.75 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/27#0` | site-footer Home>SiteFooter@250#0/27#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/28#0` | site-footer Home>SiteFooter@250#0/28#0 <nav> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/29#0` | site-footer Home>SiteFooter@250#0/29#0 <div> "shop" | block:sgs/heading | 0.8 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/3#0` | site-footer Home>SiteFooter@250#0/3#0 <section> | block:sgs/site-footer-row | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/30#0` | site-footer Home>SiteFooter@250#0/30#0 <a> "All Zookies" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/31#0` | site-footer Home>SiteFooter@250#0/31#0 <a> "Build your box" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/32#0` | site-footer Home>SiteFooter@250#0/32#0 <a> "Subscribe & save" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/33#0` | site-footer Home>SiteFooter@250#0/33#0 <a> "Gifts" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/34#0` | site-footer Home>SiteFooter@250#0/34#0 <a> "Taster Trio" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/35#0` | site-footer Home>SiteFooter@250#0/35#0 <nav> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/36#0` | site-footer Home>SiteFooter@250#0/36#0 <div> "help" | block:sgs/heading | 0.8 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/37#0` | site-footer Home>SiteFooter@250#0/37#0 <a> "FAQs" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/38#0` | site-footer Home>SiteFooter@250#0/38#0 <a> "Delivery" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/39#0` | site-footer Home>SiteFooter@250#0/39#0 <a> "Allergens" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/40#0` | site-footer Home>SiteFooter@250#0/40#0 <a> "Contact" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/41#0` | site-footer Home>SiteFooter@250#0/41#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/44#0` | site-footer Home>SiteFooter@250#0/44#0 <div> | block:sgs/social-icons | 0.74 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/5#0` | site-footer Home>SiteFooter@250#0/5#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/54#0` | site-footer Home>SiteFooter@250#0/54#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/55#0` | site-footer Home>SiteFooter@250#0/55#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/56#0` | site-footer Home>SiteFooter@250#0/56#0 <span> "© 2026 Mama’s Munches · Registered food business" | block:sgs/business-info | 0.8 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/58#0` | site-footer Home>SiteFooter@250#0/58#0 <a> "Privacy" | block:sgs/button | 0.75 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/59#0` | site-footer Home>SiteFooter@250#0/59#0 <a> "Terms" | block:sgs/button | 0.75 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/6#0` | site-footer Home>SiteFooter@250#0/6#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/8#0` | site-footer Home>SiteFooter@250#0/8#0 <h2> "@mamasmunches" | block:sgs/heading | 0.75 | accept |
| `skeleton:site-footer:Home>SiteFooter@250#0/9#0` | site-footer Home>SiteFooter@250#0/9#0 <a> "Follow along" | block:sgs/button | 0.75 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/15#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/15#0 <div> | block:sgs/site-header-row | 1 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/16#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/16#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/21#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/21#0 <a> | block:sgs/container | 0.75 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/23#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/23#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/35#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/35#0 <div> | block:sgs/site-header-row | 1 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/36#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/36#0 <a> | block:sgs/container | 0.75 | accept |
| `skeleton:site-header-announcement-strip-bar:Home>SiteHeader@7#0/44#0` | site-header-announcement-strip-bar Home>SiteHeader@7#0/44#0 <div> | block:sgs/container | 1 | accept |

## Inventory diffs (inventory-diff)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `inventory:anim:Account%7Ctpl%7C123%7Ccss:background.from` | TR-069 (theirs TR-091) background.from: ours {{ f.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C123%7Ccss:box-shadow.from` | TR-069 (theirs TR-091) box-shadow.from: ours {{ f.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C123%7Ccss:delay_ms` | TR-069 (theirs TR-091) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C123%7Ccss:duration_ms` | TR-069 (theirs TR-091) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C123%7Ccss:easing` | TR-069 (theirs TR-091) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C126%7Ccss:delay_ms` | TR-070 (theirs TR-092) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C126%7Ccss:duration_ms` | TR-070 (theirs TR-092) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C126%7Ccss:easing` | TR-070 (theirs TR-092) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C127%7Ccss:delay_ms` | TR-071 (theirs TR-093) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C127%7Ccss:duration_ms` | TR-071 (theirs TR-093) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C127%7Ccss:easing` | TR-071 (theirs TR-093) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C137%7Ccss:delay_ms` | TR-072 (theirs TR-094) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C137%7Ccss:duration_ms` | TR-072 (theirs TR-094) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C137%7Ccss:easing` | TR-072 (theirs TR-094) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C139%7Ccss:delay_ms` | TR-073 (theirs TR-095) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C139%7Ccss:duration_ms` | TR-073 (theirs TR-095) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C139%7Ccss:easing` | TR-073 (theirs TR-095) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C177%7Ccss:box-shadow :active.from` | TR-075 (theirs TR-097) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C177%7Ccss:box-shadow :active.to` | TR-075 (theirs TR-097) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C177%7Ccss:delay_ms` | TR-075 (theirs TR-097) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C177%7Ccss:duration_ms` | TR-075 (theirs TR-097) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C177%7Ccss:easing` | TR-075 (theirs TR-097) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C177%7Ccss:properties` | TR-075 (theirs TR-097) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C177%7Ccss:transform :active.to` | TR-075 (theirs TR-097) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C196%7Ccss:box-shadow :active.from` | TR-076 (theirs TR-098) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C196%7Ccss:box-shadow :active.to` | TR-076 (theirs TR-098) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C196%7Ccss:delay_ms` | TR-076 (theirs TR-098) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C196%7Ccss:duration_ms` | TR-076 (theirs TR-098) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C196%7Ccss:easing` | TR-076 (theirs TR-098) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C196%7Ccss:properties` | TR-076 (theirs TR-098) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C196%7Ccss:transform :active.to` | TR-076 (theirs TR-098) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C209%7Ccss:delay_ms` | TR-077 (theirs TR-099) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C209%7Ccss:duration_ms` | TR-077 (theirs TR-099) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C209%7Ccss:easing` | TR-077 (theirs TR-099) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C23%7Ccss:delay_ms` | TR-063 (theirs TR-085) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C23%7Ccss:duration_ms` | TR-063 (theirs TR-085) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C23%7Ccss:easing` | TR-063 (theirs TR-085) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C24%7Ccss:delay_ms` | TR-064 (theirs TR-086) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C24%7Ccss:duration_ms` | TR-064 (theirs TR-086) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C24%7Ccss:easing` | TR-064 (theirs TR-086) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C29%7Ccss:background.from` | TR-065 (theirs TR-087) background.from: ours {{ t.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C29%7Ccss:box-shadow.from` | TR-065 (theirs TR-087) box-shadow.from: ours {{ t.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C29%7Ccss:delay_ms` | TR-065 (theirs TR-087) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C29%7Ccss:duration_ms` | TR-065 (theirs TR-087) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C29%7Ccss:easing` | TR-065 (theirs TR-087) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C48%7Ccss:delay_ms` | TR-067 (theirs TR-089) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C48%7Ccss:duration_ms` | TR-067 (theirs TR-089) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C48%7Ccss:easing` | TR-067 (theirs TR-089) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C89%7Ccss:box-shadow :active.from` | TR-068 (theirs TR-090) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C89%7Ccss:box-shadow :active.to` | TR-068 (theirs TR-090) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C89%7Ccss:delay_ms` | TR-068 (theirs TR-090) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C89%7Ccss:duration_ms` | TR-068 (theirs TR-090) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C89%7Ccss:easing` | TR-068 (theirs TR-090) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C89%7Ccss:properties` | TR-068 (theirs TR-090) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account%7Ctpl%7C89%7Ccss:transform :active.to` | TR-068 (theirs TR-090) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account.dc.html%7C292%7Cjs:duration_ms` | J-13 (theirs J-12) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account.dc.html%7C292%7Cjs:properties` | J-13 (theirs J-12) properties: ours scroll-position, theirs scrollY | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account.dc.html%7C292%7Cjs:scrollY.to` | J-13 (theirs J-12) scrollY.to: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account.dc.html%7C292%7Cjs:status` | J-13 (theirs J-12) status: ours dead-code, theirs active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Account.dc.html%7C292%7Cjs:trigger.type` | J-13 (theirs J-12) trigger.type: ours state, theirs press | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Basket%7Ctpl%7C27%7Ccss:width.from` | TR-080 (theirs TR-051) width.from: ours {{ freePct }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Basket%7Ctpl%7C67%7Ccss:delay_ms` | TR-083 (theirs TR-054) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Basket%7Ctpl%7C67%7Ccss:duration_ms` | TR-083 (theirs TR-054) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Basket%7Ctpl%7C67%7Ccss:easing` | TR-083 (theirs TR-054) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C100%7Ccss:background.from` | TR-086 (theirs TR-057) background.from: ours {{ d.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C100%7Ccss:box-shadow.from` | TR-086 (theirs TR-057) box-shadow.from: ours {{ d.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C117%7Ccss:box-shadow :active.from` | TR-087 (theirs TR-058) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C117%7Ccss:box-shadow :active.to` | TR-087 (theirs TR-058) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C117%7Ccss:delay_ms` | TR-087 (theirs TR-058) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C117%7Ccss:duration_ms` | TR-087 (theirs TR-058) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C117%7Ccss:easing` | TR-087 (theirs TR-058) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C117%7Ccss:properties` | TR-087 (theirs TR-058) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C117%7Ccss:transform :active.to` | TR-087 (theirs TR-058) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C74%7Ccss:background.from` | TR-084 (theirs TR-055) background.from: ours {{ me.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C74%7Ccss:box-shadow.from` | TR-084 (theirs TR-055) box-shadow.from: ours {{ me.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C76%7Ccss:background.from` | TR-085 (theirs TR-056) background.from: ours {{ her.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Checkout%7Ctpl%7C76%7Ccss:box-shadow.from` | TR-085 (theirs TR-056) box-shadow.from: ours {{ her.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C49%7Ccss:delay_ms` | TR-088 (theirs TR-059) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C49%7Ccss:duration_ms` | TR-088 (theirs TR-059) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C49%7Ccss:easing` | TR-088 (theirs TR-059) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C55%7Ccss:delay_ms` | TR-089 (theirs TR-060) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C55%7Ccss:duration_ms` | TR-089 (theirs TR-060) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C55%7Ccss:easing` | TR-089 (theirs TR-060) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C61%7Ccss:delay_ms` | TR-090 (theirs TR-061) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C61%7Ccss:duration_ms` | TR-090 (theirs TR-061) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C61%7Ccss:easing` | TR-090 (theirs TR-061) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C67%7Ccss:delay_ms` | TR-091 (theirs TR-062) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C67%7Ccss:duration_ms` | TR-091 (theirs TR-062) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C67%7Ccss:easing` | TR-091 (theirs TR-062) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C76%7Ccss:delay_ms` | TR-092 (theirs TR-063) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C76%7Ccss:duration_ms` | TR-092 (theirs TR-063) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Confirmation%7Ctpl%7C76%7Ccss:easing` | TR-092 (theirs TR-063) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C19%7Ccss:delay_ms` | TR-094 (theirs TR-065) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C19%7Ccss:duration_ms` | TR-094 (theirs TR-065) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C19%7Ccss:easing` | TR-094 (theirs TR-065) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C26%7Ccss:delay_ms` | TR-095 (theirs TR-066) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C26%7Ccss:duration_ms` | TR-095 (theirs TR-066) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C26%7Ccss:easing` | TR-095 (theirs TR-066) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C34%7Ccss:delay_ms` | TR-096 (theirs TR-067) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C34%7Ccss:duration_ms` | TR-096 (theirs TR-067) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C34%7Ccss:easing` | TR-096 (theirs TR-067) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C50%7Ccss:background.from` | TR-097 (theirs TR-068) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C50%7Ccss:box-shadow.from` | TR-097 (theirs TR-068) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C50%7Ccss:delay_ms` | TR-097 (theirs TR-068) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C50%7Ccss:duration_ms` | TR-097 (theirs TR-068) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C50%7Ccss:easing` | TR-097 (theirs TR-068) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C67%7Ccss:box-shadow :active.from` | TR-098 (theirs TR-069) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C67%7Ccss:box-shadow :active.to` | TR-098 (theirs TR-069) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C67%7Ccss:delay_ms` | TR-098 (theirs TR-069) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C67%7Ccss:duration_ms` | TR-098 (theirs TR-069) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C67%7Ccss:easing` | TR-098 (theirs TR-069) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C67%7Ccss:properties` | TR-098 (theirs TR-069) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C67%7Ccss:transform :active.to` | TR-098 (theirs TR-069) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C77%7Ccss:delay_ms` | TR-099 (theirs TR-070) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C77%7Ccss:duration_ms` | TR-099 (theirs TR-070) duration_ms: ours per property, theirs 250 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Contact%7Ctpl%7C77%7Ccss:easing` | TR-099 (theirs TR-070) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C19%7Ccss:background.from` | TR-100 (theirs TR-043) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C19%7Ccss:box-shadow.from` | TR-100 (theirs TR-043) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C19%7Ccss:delay_ms` | TR-100 (theirs TR-043) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C19%7Ccss:duration_ms` | TR-100 (theirs TR-043) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C19%7Ccss:easing` | TR-100 (theirs TR-043) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C23%7Ccss:background.from` | TR-101 (theirs TR-044) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C23%7Ccss:box-shadow.from` | TR-101 (theirs TR-044) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C23%7Ccss:delay_ms` | TR-101 (theirs TR-044) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C23%7Ccss:duration_ms` | TR-101 (theirs TR-044) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C23%7Ccss:easing` | TR-101 (theirs TR-044) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C24%7Ccss:delay_ms` | TR-102 (theirs TR-045) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C24%7Ccss:duration_ms` | TR-102 (theirs TR-045) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C24%7Ccss:easing` | TR-102 (theirs TR-045) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C50%7Ccss:delay_ms` | TR-104 (theirs TR-047) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C50%7Ccss:duration_ms` | TR-104 (theirs TR-047) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C50%7Ccss:easing` | TR-104 (theirs TR-047) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C73%7Ccss:delay_ms` | TR-105 (theirs TR-048) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C73%7Ccss:duration_ms` | TR-105 (theirs TR-048) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Gifts%7Ctpl%7C73%7Ccss:easing` | TR-105 (theirs TR-048) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C21%7Ccss:background.from` | TR-108 (theirs TR-071) background.from: ours {{ c.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C21%7Ccss:box-shadow.from` | TR-108 (theirs TR-071) box-shadow.from: ours {{ c.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C21%7Ccss:delay_ms` | TR-108 (theirs TR-071) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C21%7Ccss:duration_ms` | TR-108 (theirs TR-071) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C21%7Ccss:easing` | TR-108 (theirs TR-071) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C26%7Ccss:background.from` | TR-109 (theirs TR-072) background.from: ours {{ f.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C26%7Ccss:box-shadow.from` | TR-109 (theirs TR-072) box-shadow.from: ours {{ f.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C31%7Ccss:transform.from` | TR-110 (theirs TR-073) transform.from: ours rotate({{ f.rot }}), theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C84%7Ccss:delay_ms` | TR-111 (theirs TR-074) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C84%7Ccss:duration_ms` | TR-111 (theirs TR-074) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help%7Ctpl%7C84%7Ccss:easing` | TR-111 (theirs TR-074) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help.dc.html%7C92%7Cjs:delay_ms` | J-14 (theirs J-09) delay_ms: ours 400, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help.dc.html%7C92%7Cjs:duration_ms` | J-14 (theirs J-09) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help.dc.html%7C92%7Cjs:properties` | J-14 (theirs J-09) properties: ours scroll-position, theirs scrollY | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Help.dc.html%7C92%7Cjs:trigger.type` | J-14 (theirs J-09) trigger.type: ours mount, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ccss-media:animation.from` | RM-01 (theirs RM-01) animation.from: ours as declared, theirs mmMarquee … | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ccss-media:animation.to` | RM-01 (theirs RM-01) animation.to: ours auto ease 0s 1 normal none running none !important, theirs none | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ccss-media:delay_ms` | RM-01 (theirs RM-01) delay_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C108%7Ccss:background.from` | TR-012 (theirs TR-012) background.from: ours {{ subOpt.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C108%7Ccss:box-shadow.from` | TR-012 (theirs TR-012) box-shadow.from: ours {{ subOpt.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C118%7Ccss:background.from` | TR-013 (theirs TR-013) background.from: ours {{ f.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C119%7Ccss:background.from` | TR-014 (theirs TR-014) background.from: ours {{ once.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C119%7Ccss:box-shadow.from` | TR-014 (theirs TR-014) box-shadow.from: ours {{ once.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C122%7Ccss:box-shadow :active.from` | TR-015 (theirs TR-015) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C122%7Ccss:box-shadow :active.to` | TR-015 (theirs TR-015) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C122%7Ccss:delay_ms` | TR-015 (theirs TR-015) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C122%7Ccss:duration_ms` | TR-015 (theirs TR-015) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C122%7Ccss:easing` | TR-015 (theirs TR-015) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C122%7Ccss:properties` | TR-015 (theirs TR-015) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C122%7Ccss:transform :active.to` | TR-015 (theirs TR-015) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C134%7Ccss:delay_ms` | TR-016 (theirs TR-016) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C134%7Ccss:duration_ms` | TR-016 (theirs TR-016) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C134%7Ccss:easing` | TR-016 (theirs TR-016) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C148%7Ccss:background.from` | TR-017 (theirs TR-017) background.from: ours {{ d.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C148%7Ccss:width.from` | TR-017 (theirs TR-017) width.from: ours {{ d.w }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C157%7Ccss:delay_ms` | TR-018 (theirs TR-018) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C157%7Ccss:duration_ms` | TR-018 (theirs TR-018) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C157%7Ccss:easing` | TR-018 (theirs TR-018) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C21%7Ccss:box-shadow :active.from` | TR-001 (theirs TR-001) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C21%7Ccss:box-shadow :active.to` | TR-001 (theirs TR-001) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C21%7Ccss:delay_ms` | TR-001 (theirs TR-001) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C21%7Ccss:duration_ms` | TR-001 (theirs TR-001) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C21%7Ccss:easing` | TR-001 (theirs TR-001) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C21%7Ccss:properties` | TR-001 (theirs TR-001) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C21%7Ccss:transform :active.to` | TR-001 (theirs TR-001) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C224%7Ccss:delay_ms` | TR-022 (theirs TR-022) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C224%7Ccss:duration_ms` | TR-022 (theirs TR-022) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C224%7Ccss:easing` | TR-022 (theirs TR-022) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C23%7Ccss:box-shadow :active.from` | TR-002 (theirs TR-002) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C23%7Ccss:box-shadow :active.to` | TR-002 (theirs TR-002) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C23%7Ccss:delay_ms` | TR-002 (theirs TR-002) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C23%7Ccss:duration_ms` | TR-002 (theirs TR-002) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C23%7Ccss:easing` | TR-002 (theirs TR-002) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C23%7Ccss:properties` | TR-002 (theirs TR-002) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C23%7Ccss:transform :active.to` | TR-002 (theirs TR-002) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C235%7Ccss:background.from` | TR-023 (theirs TR-023) background.from: ours {{ d.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C235%7Ccss:width.from` | TR-023 (theirs TR-023) width.from: ours {{ d.w }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C245%7Ccss:background.from` | TR-024 (theirs TR-024) background.from: ours {{ f.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C245%7Ccss:box-shadow.from` | TR-024 (theirs TR-024) box-shadow.from: ours {{ f.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C247%7Ccss:transform.from` | TR-025 (theirs TR-025) transform.from: ours rotate({{ f.rot }}), theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C47%7Ccss:delay_ms` | TR-006 (theirs TR-006) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C47%7Ccss:duration_ms` | TR-006 (theirs TR-006) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C47%7Ccss:easing` | TR-006 (theirs TR-006) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C55%7Ccss:delay_ms` | TR-007 (theirs TR-007) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C55%7Ccss:duration_ms` | TR-007 (theirs TR-007) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C55%7Ccss:easing` | TR-007 (theirs TR-007) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C74%7Ccss:background.from` | TR-008 (theirs TR-008) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C74%7Ccss:box-shadow.from` | TR-008 (theirs TR-008) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C74%7Ccss:delay_ms` | TR-008 (theirs TR-008) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C74%7Ccss:duration_ms` | TR-008 (theirs TR-008) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C74%7Ccss:easing` | TR-008 (theirs TR-008) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C80%7Ccss:background.from` | TR-009 (theirs TR-009) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C80%7Ccss:box-shadow.from` | TR-009 (theirs TR-009) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C80%7Ccss:delay_ms` | TR-009 (theirs TR-009) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C80%7Ccss:duration_ms` | TR-009 (theirs TR-009) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C80%7Ccss:easing` | TR-009 (theirs TR-009) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C87%7Ccss:background.from` | TR-010 (theirs TR-010) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C87%7Ccss:box-shadow.from` | TR-010 (theirs TR-010) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C87%7Ccss:delay_ms` | TR-010 (theirs TR-010) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C87%7Ccss:duration_ms` | TR-010 (theirs TR-010) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C87%7Ccss:easing` | TR-010 (theirs TR-010) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C94%7Ccss:background.from` | TR-011 (theirs TR-011) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C94%7Ccss:box-shadow.from` | TR-011 (theirs TR-011) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C94%7Ccss:delay_ms` | TR-011 (theirs TR-011) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C94%7Ccss:duration_ms` | TR-011 (theirs TR-011) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home%7Ctpl%7C94%7Ccss:easing` | TR-011 (theirs TR-011) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C276%7Cwaapi:trigger.type` | A-02 (theirs A-02) trigger.type: ours mount, theirs loop | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C277%7Cwaapi:trigger.type` | A-03 (theirs A-03) trigger.type: ours mount, theirs loop | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C282%7Cwaapi:delay_ms` | A-04 (theirs A-04) delay_ms: ours Math.min(sib.indexOf(e.target), 4) * 90, theirs Math.min(index among [data-reveal] siblings, 4) * 90 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C288%7Cjs:duration_ms` | J-01 (theirs J-02) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C288%7Cjs:only-ours` | J-02 js-style-write js-style-write in drag on ref.current is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Home.dc.html%7C288%7Cjs:properties` | J-01 (theirs J-02) properties: ours scroll-snap-type, theirs scroll-behavior,scroll-snap-type | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C288%7Cjs:scroll-behavior.from` | J-01 (theirs J-02) scroll-behavior.from: ours null, theirs smooth | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C288%7Cjs:scroll-behavior.to` | J-01 (theirs J-02) scroll-behavior.to: ours null, theirs auto | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C288%7Cjs:scroll-snap-type.from` | J-01 (theirs J-02) scroll-snap-type.from: ours null, theirs x mandatory | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C288%7Cjs:trigger.type` | J-01 (theirs J-02) trigger.type: ours state, theirs press | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C289%7Cjs:duration_ms` | J-03 (theirs J-03) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C289%7Cjs:properties` | J-03 (theirs J-03) properties: ours scroll-left, theirs scrollLeft | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C289%7Cjs:trigger.type` | J-03 (theirs J-03) trigger.type: ours state, theirs pointer-move | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:duration_ms` | J-04 (theirs J-04) duration_ms: ours 0, theirs browser smooth-scroll (scroll-behavior:smooth on the track) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:only-ours` | J-05 js-scroll js-scroll in drag on d.t is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:only-ours~2` | J-06 js-style-write js-style-write in drag on d.t is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:properties` | J-04 (theirs J-04) properties: ours scroll-behavior, theirs scroll-behavior,scroll-snap-type,scrollLeft | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:scroll-behavior.from` | J-04 (theirs J-04) scroll-behavior.from: ours null, theirs auto | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:scroll-snap-type.from` | J-04 (theirs J-04) scroll-snap-type.from: ours null, theirs none | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:scroll-snap-type.to` | J-04 (theirs J-04) scroll-snap-type.to: ours null, theirs x mandatory | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C290%7Cjs:trigger.type` | J-04 (theirs J-04) trigger.type: ours state, theirs press | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C298%7Cjs:only-ours` | J-07 js-scroll js-scroll in step on (ref \|\| this.trackRef).current is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Home.dc.html%7C300%7Cjs:duration_ms` | J-08 (theirs J-05) duration_ms: ours 0, theirs browser smooth-scroll (scroll-behavior:smooth on the track) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C300%7Cjs:properties` | J-08 (theirs J-05) properties: ours scroll-position, theirs scrollLeft | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C365%7Cjs:duration_ms` | J-09 (theirs J-06) duration_ms: ours 0, theirs browser smooth-scroll (scroll-behavior:smooth on the track) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C365%7Cjs:properties` | J-09 (theirs J-06) properties: ours scroll-position, theirs scrollLeft | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C365%7Cjs:status` | J-09 (theirs J-06) status: ours dead-code, theirs active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C365%7Cjs:trigger.type` | J-09 (theirs J-06) trigger.type: ours state, theirs press | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C388%7Cjs:duration_ms` | J-10 (theirs J-07) duration_ms: ours 0, theirs browser smooth-scroll (scroll-behavior:smooth on the track) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C388%7Cjs:properties` | J-10 (theirs J-07) properties: ours scroll-position, theirs scrollLeft | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C388%7Cjs:status` | J-10 (theirs J-07) status: ours dead-code, theirs active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C388%7Cjs:trigger.type` | J-10 (theirs J-07) trigger.type: ours state, theirs press | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C408%7Cjs:animation-play-state.from` | J-11 (theirs J-08) animation-play-state.from: ours null, theirs running | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C408%7Cjs:animation-play-state.to` | J-11 (theirs J-08) animation-play-state.to: ours null, theirs paused | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C408%7Cjs:duration_ms` | J-11 (theirs J-08) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C408%7Cjs:trigger.type` | J-11 (theirs J-08) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C409%7Ccss:animation-name.to` | K-01 (theirs CA-01) animation-name.to: ours mmMarquee, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C409%7Ccss:properties` | K-01 (theirs CA-01) properties: ours animation-name,transform, theirs transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C409%7Ccss:reduced_motion.behaviour` | K-01 (theirs CA-01) reduced_motion.behaviour: ours unchanged, theirs skip | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C409%7Ccss:transform.from` | K-01 (theirs CA-01) transform.from: ours translateX(0px), theirs translateX(0) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Home.dc.html%7C409%7Ccss:trigger.type` | K-01 (theirs CA-01) trigger.type: ours state, theirs load | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C108%7Ccss:box-shadow :active.from` | TR-120 (theirs TR-038) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C108%7Ccss:box-shadow :active.to` | TR-120 (theirs TR-038) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C108%7Ccss:delay_ms` | TR-120 (theirs TR-038) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C108%7Ccss:duration_ms` | TR-120 (theirs TR-038) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C108%7Ccss:easing` | TR-120 (theirs TR-038) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C108%7Ccss:properties` | TR-120 (theirs TR-038) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C108%7Ccss:transform :active.to` | TR-120 (theirs TR-038) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C118%7Ccss:background.from` | TR-121 (theirs TR-039) background.from: ours {{ a.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C120%7Ccss:transform.from` | TR-122 (theirs TR-040) transform.from: ours rotate({{ a.rot }}), theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C128%7Ccss:delay_ms` | TR-123 (theirs TR-041) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C128%7Ccss:duration_ms` | TR-123 (theirs TR-041) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C128%7Ccss:easing` | TR-123 (theirs TR-041) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C141%7Ccss:transform.from` | TR-124 (theirs TR-042) transform.from: ours {{ barY }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C23%7Ccss:box-shadow.from` | TR-112 (theirs TR-030) box-shadow.from: ours {{ g.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C37%7Ccss:background.from` | TR-113 (theirs TR-031) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C37%7Ccss:box-shadow.from` | TR-113 (theirs TR-031) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C37%7Ccss:delay_ms` | TR-113 (theirs TR-031) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C37%7Ccss:duration_ms` | TR-113 (theirs TR-031) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C37%7Ccss:easing` | TR-113 (theirs TR-031) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C47%7Ccss:background.from` | TR-114 (theirs TR-032) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C47%7Ccss:box-shadow.from` | TR-114 (theirs TR-032) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C47%7Ccss:delay_ms` | TR-114 (theirs TR-032) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C47%7Ccss:duration_ms` | TR-114 (theirs TR-032) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C47%7Ccss:easing` | TR-114 (theirs TR-032) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C53%7Ccss:background.from` | TR-115 (theirs TR-033) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C53%7Ccss:box-shadow.from` | TR-115 (theirs TR-033) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C53%7Ccss:delay_ms` | TR-115 (theirs TR-033) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C53%7Ccss:duration_ms` | TR-115 (theirs TR-033) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C53%7Ccss:easing` | TR-115 (theirs TR-033) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C60%7Ccss:background.from` | TR-116 (theirs TR-034) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C60%7Ccss:box-shadow.from` | TR-116 (theirs TR-034) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C60%7Ccss:delay_ms` | TR-116 (theirs TR-034) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C60%7Ccss:duration_ms` | TR-116 (theirs TR-034) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C60%7Ccss:easing` | TR-116 (theirs TR-034) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C64%7Ccss:background.from` | TR-117 (theirs TR-035) background.from: ours {{ subOpt.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C64%7Ccss:box-shadow.from` | TR-117 (theirs TR-035) box-shadow.from: ours {{ subOpt.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C75%7Ccss:background.from` | TR-118 (theirs TR-036) background.from: ours {{ once.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C75%7Ccss:box-shadow.from` | TR-118 (theirs TR-036) box-shadow.from: ours {{ once.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C83%7Ccss:background.from` | TR-119 (theirs TR-037) background.from: ours {{ o.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C83%7Ccss:box-shadow.from` | TR-119 (theirs TR-037) box-shadow.from: ours {{ o.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Product%7Ctpl%7C83%7Ccss:transform.from` | TR-119 (theirs TR-037) transform.from: ours {{ o.tf }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C0%7Ccss:delay_ms` | TR-106 (theirs TR-137) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C0%7Ccss:duration_ms` | TR-106 (theirs TR-137) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C0%7Ccss:easing` | TR-106 (theirs TR-137) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C11%7Ccss:box-shadow :active.from` | TR-107 (theirs TR-138) box-shadow :active.from: ours null, theirs 3px 3px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C11%7Ccss:box-shadow :active.to` | TR-107 (theirs TR-138) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C11%7Ccss:delay_ms` | TR-107 (theirs TR-138) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C11%7Ccss:duration_ms` | TR-107 (theirs TR-138) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C11%7Ccss:easing` | TR-107 (theirs TR-138) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C11%7Ccss:properties` | TR-107 (theirs TR-138) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:ProductCard%7Ctpl%7C11%7Ccss:transform :active.to` | TR-107 (theirs TR-138) transform :active.to: ours null, theirs translate(2px,2px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C23%7Ccss:background.from` | TR-125 (theirs TR-026) background.from: ours {{ c.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C23%7Ccss:box-shadow.from` | TR-125 (theirs TR-026) box-shadow.from: ours {{ c.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C23%7Ccss:delay_ms` | TR-125 (theirs TR-026) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C23%7Ccss:duration_ms` | TR-125 (theirs TR-026) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C23%7Ccss:easing` | TR-125 (theirs TR-026) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C33%7Ccss:delay_ms` | TR-126 (theirs TR-027) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C33%7Ccss:duration_ms` | TR-126 (theirs TR-027) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C33%7Ccss:easing` | TR-126 (theirs TR-027) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C39%7Ccss:delay_ms` | TR-127 (theirs TR-028) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C39%7Ccss:duration_ms` | TR-127 (theirs TR-028) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C39%7Ccss:easing` | TR-127 (theirs TR-028) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C45%7Ccss:delay_ms` | TR-128 (theirs TR-029) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C45%7Ccss:duration_ms` | TR-128 (theirs TR-029) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Shop%7Ctpl%7C45%7Ccss:easing` | TR-128 (theirs TR-029) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C20%7Ccss:delay_ms` | TR-129 (theirs TR-075) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C20%7Ccss:duration_ms` | TR-129 (theirs TR-075) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C20%7Ccss:easing` | TR-129 (theirs TR-075) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C21%7Ccss:delay_ms` | TR-130 (theirs TR-076) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C21%7Ccss:duration_ms` | TR-130 (theirs TR-076) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C21%7Ccss:easing` | TR-130 (theirs TR-076) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C24%7Ccss:background.from` | TR-131 (theirs TR-077) background.from: ours {{ tabA.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C24%7Ccss:box-shadow.from` | TR-131 (theirs TR-077) box-shadow.from: ours {{ tabA.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C24%7Ccss:delay_ms` | TR-131 (theirs TR-077) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C24%7Ccss:duration_ms` | TR-131 (theirs TR-077) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C24%7Ccss:easing` | TR-131 (theirs TR-077) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C25%7Ccss:background.from` | TR-132 (theirs TR-078) background.from: ours {{ tabB.bg }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C25%7Ccss:box-shadow.from` | TR-132 (theirs TR-078) box-shadow.from: ours {{ tabB.shadow }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C25%7Ccss:delay_ms` | TR-132 (theirs TR-078) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C25%7Ccss:duration_ms` | TR-132 (theirs TR-078) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C25%7Ccss:easing` | TR-132 (theirs TR-078) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C37%7Ccss:box-shadow :active.from` | TR-133 (theirs TR-079) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C37%7Ccss:box-shadow :active.to` | TR-133 (theirs TR-079) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C37%7Ccss:delay_ms` | TR-133 (theirs TR-079) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C37%7Ccss:duration_ms` | TR-133 (theirs TR-079) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C37%7Ccss:easing` | TR-133 (theirs TR-079) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C37%7Ccss:properties` | TR-133 (theirs TR-079) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C37%7Ccss:transform :active.to` | TR-133 (theirs TR-079) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C58%7Ccss:box-shadow :active.from` | TR-134 (theirs TR-080) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C58%7Ccss:box-shadow :active.to` | TR-134 (theirs TR-080) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C58%7Ccss:delay_ms` | TR-134 (theirs TR-080) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C58%7Ccss:duration_ms` | TR-134 (theirs TR-080) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C58%7Ccss:easing` | TR-134 (theirs TR-080) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C58%7Ccss:properties` | TR-134 (theirs TR-080) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C58%7Ccss:transform :active.to` | TR-134 (theirs TR-080) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C68%7Ccss:box-shadow :active.from` | TR-135 (theirs TR-081) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C68%7Ccss:box-shadow :active.to` | TR-135 (theirs TR-081) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C68%7Ccss:delay_ms` | TR-135 (theirs TR-081) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C68%7Ccss:duration_ms` | TR-135 (theirs TR-081) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C68%7Ccss:easing` | TR-135 (theirs TR-081) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C68%7Ccss:properties` | TR-135 (theirs TR-081) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C68%7Ccss:transform :active.to` | TR-135 (theirs TR-081) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C75%7Ccss:delay_ms` | TR-136 (theirs TR-082) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C75%7Ccss:duration_ms` | TR-136 (theirs TR-082) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C75%7Ccss:easing` | TR-136 (theirs TR-082) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C88%7Ccss:box-shadow :active.from` | TR-137 (theirs TR-083) box-shadow :active.from: ours null, theirs 4px 4px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C88%7Ccss:box-shadow :active.to` | TR-137 (theirs TR-083) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C88%7Ccss:delay_ms` | TR-137 (theirs TR-083) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C88%7Ccss:duration_ms` | TR-137 (theirs TR-083) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C88%7Ccss:easing` | TR-137 (theirs TR-083) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C88%7Ccss:properties` | TR-137 (theirs TR-083) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C88%7Ccss:transform :active.to` | TR-137 (theirs TR-083) transform :active.to: ours null, theirs translate(3px,3px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C94%7Ccss:delay_ms` | TR-138 (theirs TR-084) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C94%7Ccss:duration_ms` | TR-138 (theirs TR-084) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SignIn%7Ctpl%7C94%7Ccss:easing` | TR-138 (theirs TR-084) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ccss-media:animation.from` | RM-02 (theirs RM-02) animation.from: ours as declared, theirs mmMarquee … | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ccss-media:animation.to` | RM-02 (theirs RM-02) animation.to: ours auto ease 0s 1 normal none running none !important, theirs none | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ccss-media:delay_ms` | RM-02 (theirs RM-02) delay_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ctpl%7C16%7Ccss:delay_ms` | TR-048 (theirs TR-122) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ctpl%7C16%7Ccss:duration_ms` | TR-048 (theirs TR-122) duration_ms: ours per property, theirs 350 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ctpl%7C16%7Ccss:easing` | TR-048 (theirs TR-122) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ctpl%7C45%7Ccss:background.to` | TR-061 (theirs TR-135) background.to: ours null, theirs radial-gradient(circle at 30% 107%, #FDF497 0%, #FD5949 45%, #D6249F 60%, #285AEB 90%) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter%7Ctpl%7C50%7Ccss:background.to` | TR-062 (theirs TR-136) background.to: ours null, theirs #25D366 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:animation-name.to` | K-02 (theirs CA-02) animation-name.to: ours mmMarquee, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:animation-play-state.from` | K-02 (theirs CA-02) animation-play-state.from: ours null, theirs running | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:animation-play-state.to` | K-02 (theirs CA-02) animation-play-state.to: ours null, theirs paused | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:only-ours` | K-03 css-animation CSS animation this.state.tagHover \|\| this.state.tagFocus ? 'paused' : 'running' on code-built animation-play-state string is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:properties` | K-02 (theirs CA-02) properties: ours animation-name,transform, theirs animation-play-state,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:reduced_motion.behaviour` | K-02 (theirs CA-02) reduced_motion.behaviour: ours unchanged, theirs skip | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:transform.from` | K-02 (theirs CA-02) transform.from: ours translateX(0px), theirs translateX(0) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteFooter.dc.html%7C95%7Ccss:trigger.type` | K-02 (theirs CA-02) trigger.type: ours state, theirs load | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C107%7Ccss:box-shadow :active.from` | TR-041 (theirs TR-115) box-shadow :active.from: ours null, theirs 3px 3px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C107%7Ccss:box-shadow :active.to` | TR-041 (theirs TR-115) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C107%7Ccss:delay_ms` | TR-041 (theirs TR-115) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C107%7Ccss:duration_ms` | TR-041 (theirs TR-115) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C107%7Ccss:easing` | TR-041 (theirs TR-115) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C107%7Ccss:properties` | TR-041 (theirs TR-115) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C107%7Ccss:transform :active.to` | TR-041 (theirs TR-115) transform :active.to: ours null, theirs translate(2px,2px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C112%7Ccss:box-shadow :active.from` | TR-042 (theirs TR-116) box-shadow :active.from: ours null, theirs 3px 3px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C112%7Ccss:box-shadow :active.to` | TR-042 (theirs TR-116) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C112%7Ccss:delay_ms` | TR-042 (theirs TR-116) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C112%7Ccss:duration_ms` | TR-042 (theirs TR-116) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C112%7Ccss:easing` | TR-042 (theirs TR-116) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C112%7Ccss:properties` | TR-042 (theirs TR-116) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C112%7Ccss:transform :active.to` | TR-042 (theirs TR-116) transform :active.to: ours null, theirs translate(2px,2px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C117%7Ccss:box-shadow :active.from` | TR-043 (theirs TR-117) box-shadow :active.from: ours null, theirs 3px 3px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C117%7Ccss:box-shadow :active.to` | TR-043 (theirs TR-117) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C117%7Ccss:delay_ms` | TR-043 (theirs TR-117) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C117%7Ccss:duration_ms` | TR-043 (theirs TR-117) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C117%7Ccss:easing` | TR-043 (theirs TR-117) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C117%7Ccss:properties` | TR-043 (theirs TR-117) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C117%7Ccss:transform :active.to` | TR-043 (theirs TR-117) transform :active.to: ours null, theirs translate(2px,2px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C123%7Ccss:delay_ms` | TR-044 (theirs TR-118) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C123%7Ccss:duration_ms` | TR-044 (theirs TR-118) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C123%7Ccss:easing` | TR-044 (theirs TR-118) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C128%7Ccss:transform.from` | TR-045 (theirs TR-119) transform.from: ours {{ basketX }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C137%7Ccss:width.from` | TR-046 (theirs TR-120) width.from: ours {{ freePct }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C55%7Ccss:opacity.from` | TR-027 (theirs TR-101) opacity.from: ours {{ scrimOp }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C56%7Ccss:transform.from` | TR-028 (theirs TR-102) transform.from: ours {{ navX }}, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C63%7Ccss:delay_ms` | TR-029 (theirs TR-103) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C63%7Ccss:duration_ms` | TR-029 (theirs TR-103) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C63%7Ccss:easing` | TR-029 (theirs TR-103) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C68%7Ccss:delay_ms` | TR-030 (theirs TR-104) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C68%7Ccss:duration_ms` | TR-030 (theirs TR-104) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C68%7Ccss:easing` | TR-030 (theirs TR-104) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C74%7Ccss:delay_ms` | TR-031 (theirs TR-105) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C74%7Ccss:duration_ms` | TR-031 (theirs TR-105) duration_ms: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C74%7Ccss:easing` | TR-031 (theirs TR-105) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C76%7Ccss:delay_ms` | TR-032 (theirs TR-106) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C76%7Ccss:duration_ms` | TR-032 (theirs TR-106) duration_ms: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C76%7Ccss:easing` | TR-032 (theirs TR-106) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C78%7Ccss:delay_ms` | TR-033 (theirs TR-107) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C78%7Ccss:duration_ms` | TR-033 (theirs TR-107) duration_ms: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C78%7Ccss:easing` | TR-033 (theirs TR-107) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C80%7Ccss:delay_ms` | TR-034 (theirs TR-108) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C80%7Ccss:duration_ms` | TR-034 (theirs TR-108) duration_ms: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C80%7Ccss:easing` | TR-034 (theirs TR-108) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C82%7Ccss:delay_ms` | TR-035 (theirs TR-109) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C82%7Ccss:duration_ms` | TR-035 (theirs TR-109) duration_ms: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C82%7Ccss:easing` | TR-035 (theirs TR-109) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C84%7Ccss:delay_ms` | TR-036 (theirs TR-110) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C84%7Ccss:duration_ms` | TR-036 (theirs TR-110) duration_ms: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C84%7Ccss:easing` | TR-036 (theirs TR-110) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C86%7Ccss:delay_ms` | TR-037 (theirs TR-111) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C86%7Ccss:duration_ms` | TR-037 (theirs TR-111) duration_ms: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C86%7Ccss:easing` | TR-037 (theirs TR-111) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C92%7Ccss:box-shadow :active.from` | TR-038 (theirs TR-112) box-shadow :active.from: ours null, theirs 3px 3px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C92%7Ccss:box-shadow :active.to` | TR-038 (theirs TR-112) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C92%7Ccss:delay_ms` | TR-038 (theirs TR-112) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C92%7Ccss:duration_ms` | TR-038 (theirs TR-112) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C92%7Ccss:easing` | TR-038 (theirs TR-112) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C92%7Ccss:properties` | TR-038 (theirs TR-112) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C92%7Ccss:transform :active.to` | TR-038 (theirs TR-112) transform :active.to: ours null, theirs translate(2px,2px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C93%7Ccss:box-shadow :active.from` | TR-039 (theirs TR-113) box-shadow :active.from: ours null, theirs 3px 3px 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C93%7Ccss:box-shadow :active.to` | TR-039 (theirs TR-113) box-shadow :active.to: ours null, theirs 0 0 0 #3A2A22 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C93%7Ccss:delay_ms` | TR-039 (theirs TR-113) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C93%7Ccss:duration_ms` | TR-039 (theirs TR-113) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C93%7Ccss:easing` | TR-039 (theirs TR-113) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C93%7Ccss:properties` | TR-039 (theirs TR-113) properties: ours background,box-shadow,transform, theirs background,box-shadow,box-shadow :active,transform,transform :active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C93%7Ccss:transform :active.to` | TR-039 (theirs TR-113) transform :active.to: ours null, theirs translate(2px,2px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C95%7Ccss:delay_ms` | TR-040 (theirs TR-114) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C95%7Ccss:duration_ms` | TR-040 (theirs TR-114) duration_ms: ours per property, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader%7Ctpl%7C95%7Ccss:easing` | TR-040 (theirs TR-114) easing: ours per property, theirs per-property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader.dc.html%7C188%7Cwaapi:delay_ms` | A-05 (theirs A-10) delay_ms: ours 80 + Math.min(i, 10) * 35, theirs 80 + Math.min(index, 10) * 35 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader.dc.html%7C209%7Cjs:duration_ms` | J-12 (theirs J-01) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:SiteHeader.dc.html%7C209%7Cjs:overflow.to` | J-12 (theirs J-01) overflow.to: ours null, theirs hidden | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:theirs:Home.dc.html%7C265%7Cjs:only-theirs` | Claude Design's J-10 js-scroll Review slider autoplay has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Product.dc.html%7C166%7Cjs:only-theirs` | Claude Design's J-11 js-text-write Product page title from the product name has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C30%7Ccss:only-theirs` | Claude Design's PS-022 css-pseudo SiteFooter · a [href="Shop.dc.html"] "All Zookies" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C31%7Ccss:only-theirs` | Claude Design's PS-023 css-pseudo SiteFooter · a [href="Home.dc.html#build"] "Build your box" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C32%7Ccss:only-theirs` | Claude Design's PS-024 css-pseudo SiteFooter · a [href="Product.dc.html?id=zookies&sub=1"] "Subscribe & save" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C33%7Ccss:only-theirs` | Claude Design's PS-025 css-pseudo SiteFooter · a [href="Gifts.dc.html"] "Gifts" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C34%7Ccss:only-theirs` | Claude Design's PS-026 css-pseudo SiteFooter · a [href="Product.dc.html?id=trial"] "Taster Trio" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C37%7Ccss:only-theirs` | Claude Design's PS-027 css-pseudo SiteFooter · a [href="Help.dc.html"] "FAQs" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C38%7Ccss:only-theirs` | Claude Design's PS-028 css-pseudo SiteFooter · a [href="Help.dc.html#delivery"] "Delivery" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C39%7Ccss:only-theirs` | Claude Design's PS-029 css-pseudo SiteFooter · a [href="Help.dc.html#allergens"] "Allergens" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteFooter%7Ctpl%7C40%7Ccss:only-theirs` | Claude Design's PS-030 css-pseudo SiteFooter · a [href="Contact.dc.html"] "Contact" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteHeader%7Ctpl%7C74%7Ccss:only-theirs` | Claude Design's PS-011 css-pseudo SiteHeader · a [href="Shop.dc.html"] "Shop all→" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteHeader%7Ctpl%7C76%7Ccss:only-theirs` | Claude Design's PS-012 css-pseudo SiteHeader · a [href="Product.dc.html?id=zookies"] "Zookies→" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteHeader%7Ctpl%7C78%7Ccss:only-theirs` | Claude Design's PS-013 css-pseudo SiteHeader · a [href="Product.dc.html?id=trial"] "Taster Trio3 for £5" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteHeader%7Ctpl%7C80%7Ccss:only-theirs` | Claude Design's PS-014 css-pseudo SiteHeader · a [href="Gifts.dc.html"] "Gifts→" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteHeader%7Ctpl%7C82%7Ccss:only-theirs` | Claude Design's PS-015 css-pseudo SiteHeader · a [href="Product.dc.html?id=zookies&sub=1"] "Subscribe & save10% off" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteHeader%7Ctpl%7C84%7Ccss:only-theirs` | Claude Design's PS-016 css-pseudo SiteHeader · a [href="Help.dc.html"] "Help & FAQs→" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:SiteHeader%7Ctpl%7C86%7Ccss:only-theirs` | Claude Design's PS-017 css-pseudo SiteHeader · a [href="Contact.dc.html"] "Contact→" · style-hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:count:js_style_writers` | count js_style_writers: ours 14, theirs 16 | ours | a recount replaces any count carried from an older inventory | ours |
| `inventory:surface-count:toggling_sc_ifs` | surface count toggling_sc_ifs: ours 31, theirs 58 | ours | a recount replaces any count carried from an older inventory | ours |
| `inventory:surface:route%7Caccount:states` | S-04 (theirs S-49) states: ours 1, theirs 4 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Cbasket:states` | S-05 (theirs S-23) states: ours 1, theirs 5 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Cconfirmation:kind` | S-07 (theirs S-32) kind: ours page, theirs result | ours | the re-derived surface and Claude Design's disagree on its kind | ours |
| `inventory:surface:route%7Cconfirmation:states` | S-07 (theirs S-32) states: ours 1, theirs 6 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Ccontact:states` | S-08 (theirs S-33) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Cgifts:states` | S-09 (theirs S-19) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Chelp:states` | S-11 (theirs S-36) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Chome:states` | S-01 (theirs S-07) states: ours 2, theirs 4 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Cproduct:kind` | S-12 (theirs S-15) kind: ours page, theirs form | ours | the re-derived surface and Claude Design's disagree on its kind | ours |
| `inventory:surface:route%7Cproduct:states` | S-12 (theirs S-15) states: ours 2, theirs 4 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Cshop:states` | S-13 (theirs S-12) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Csignin:states` | S-14 (theirs S-40) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:toggling-sc-if:Account:101:only-theirs` | toggling-sc-if Account:101 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:115:only-theirs` | toggling-sc-if Account:115 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:118:only-theirs` | toggling-sc-if Account:118 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:125:only-theirs` | toggling-sc-if Account:125 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:136:only-theirs` | toggling-sc-if Account:136 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:142:only-theirs` | toggling-sc-if Account:142 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:148:only-theirs` | toggling-sc-if Account:148 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:155:only-theirs` | toggling-sc-if Account:155 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:179:only-theirs` | toggling-sc-if Account:179 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:33:only-theirs` | toggling-sc-if Account:33 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Account:52:only-theirs` | toggling-sc-if Account:52 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Basket:13:only-theirs` | toggling-sc-if Basket:13 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Basket:21:only-theirs` | toggling-sc-if Basket:21 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Basket:47:only-theirs` | toggling-sc-if Basket:47 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Basket:49:only-theirs` | toggling-sc-if Basket:49 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SignIn:22:only-theirs` | toggling-sc-if SignIn:22 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SignIn:26:only-theirs` | toggling-sc-if SignIn:26 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SignIn:39:only-theirs` | toggling-sc-if SignIn:39 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SignIn:59:only-theirs` | toggling-sc-if SignIn:59 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SignIn:69:only-theirs` | toggling-sc-if SignIn:69 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SignIn:77:only-theirs` | toggling-sc-if SignIn:77 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SignIn:89:only-theirs` | toggling-sc-if SignIn:89 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SiteHeader:133:only-theirs` | toggling-sc-if SiteHeader:133 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SiteHeader:158:only-theirs` | toggling-sc-if SiteHeader:158 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SiteHeader:161:only-theirs` | toggling-sc-if SiteHeader:161 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SiteHeader:175:only-theirs` | toggling-sc-if SiteHeader:175 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:SiteHeader:32:only-theirs` | toggling-sc-if SiteHeader:32 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
