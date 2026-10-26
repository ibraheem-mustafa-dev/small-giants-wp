# Intake review: eye-care-ward-end

Taken on 2026-10-26T07:08:35.388Z; manifest 1.0, files hash 262dd0304564cd78.

How to mark: put x in a section's `Accept all: [ ]` box to give every row the section's first mark; to mark one row differently, write its mark in that row's Mark cell (a row's own mark always beats Accept all). Flag rows left blank are accepted as flagged and not-a-defect rows left blank stay not defects; every other row needs Accept all or its own mark. Rows marked **changed** differ from the last export, lost their old mark and come first. Then run `node scripts/computed-route/intake.mjs --apply-review eye-care-ward-end`.

Rows: 840; 680 need reading, 160 are confident proposals that Accept all covers (skeleton block choices 123, missing features 37).

Not defects counted, not listed: breakpoint 52, prop-variant 201, reached-when-forced 206, render-wins 2141.

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
| `page:page:about` | about → About (page, static) | about | drawer-2 #1 |  |
| `page:page:cart` | (no route) → Your bag (page, static, cart) | cart |  |  |
| `page:page:checkout` | checkout → Checkout (page, static, checkout) | checkout |  |  |
| `page:page:contact` | contact → Contact (page, static) | contact | drawer-2 #3 |  |
| `page:page:help` | help → Help (page, static) | help | drawer-2 #2 |  |
| `page:page:home` | home → Home (page, static) | home |  |  |
| `page:page:my-account` | signin → Sign in / register (page, static) | my-account |  |  |
| `page:page:prescription-lenses` | lenses → Lenses (page, static) | prescription-lenses | header #3, drawer-1 #3 |  |
| `page:product:product` | product → Product (product, live, single-product) | product |  |  |
| `page:sgs_choice_flow:choice-flow-add-prescription-lenses` | (no route) → Add prescription lenses (sgs_choice_flow, static) | choice-flow-add-prescription-lenses |  |  |
| `page:sgs_drawer:drawer-eye-care-birmingham` | (no route) → Drawer (sgs_drawer, static) | drawer-eye-care-birmingham |  |  |
| `page:sgs_footer:footer` | (no route) → Footer (sgs_footer, static) | footer |  |  |
| `page:sgs_form:form-submit-contact` | (no route) → submitContact (sgs_form, static) | form-submit-contact |  |  |
| `page:sgs_header:header` | (no route) → Header (sgs_header, static) | header |  |  |
| `page:sgs_mega_menu:mega-menu-brands` | (no route) → Brands mega menu (sgs_mega_menu, static) | mega-menu-brands |  |  |
| `page:sgs_mega_menu:mega-menu-help` | (no route) → Help mega menu (sgs_mega_menu, static) | mega-menu-help |  |  |
| `page:sgs_mega_menu:mega-menu-lenses` | (no route) → Lenses mega menu (sgs_mega_menu, static) | mega-menu-lenses |  |  |
| `page:sgs_mega_menu:mega-menu-sunglasses` | (no route) → Sunglasses mega menu (sgs_mega_menu, static) | mega-menu-sunglasses |  |  |
| `page:sgs_modal:modal-size-guide` | (no route) → Size guide (sgs_modal, static) | modal-size-guide |  |  |
| `page:shop:shop` | shop → Sunglasses (shop, live, archive-product) | shop | drawer-1 #1 |  |

## Palette roles (palette-role)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `palette:--acc` | --acc #9C8B78 | role:accent | 0.98: the draft's comment on --acc says "badges" ("badges, focus ring, ticker icons, selection"); usage agrees | accept |
| `palette:--acc-ink` | --acc-ink #6F6152 | role:accent-text,link-hover | 0.85: the accent's own ink: the text colour of its hue (161 characters; the accent ground holds no text) | role:accent-text,link-hover |
| `palette:--acc-soft` | --acc-soft #EFEAE2 | role:accent-light | 0.85: the light ground of the accent's hue (34 grounds and lines, carrying the accent ink) | accept |
| `palette:--border-default` | --border-default #E6E1DA | role:border | 0.98: the draft declares --border-default: var(--hairline); usage agrees | accept |
| `palette:--border-strong` | --border-strong #D8D2C8 | role:custom-border-strong | 0.3: name says border, but border is read from usage on --hairline (#E6E1DA) | accept |
| `palette:--border-warm` | --border-warm #D5CCBD | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--button-primary-bg` | --button-primary-bg #141414 | role:heading,link,section-text,text,primary | 0.85: the most used heading colour on light grounds (5 headings) | accept |
| `palette:--button-primary-fg` | --button-primary-fg #FAF8F5 | role:footer-bg,text-inverse,surface,primary-text | 0.85: the footer's ground on 1 page(s) | accept |
| `palette:--control-off` | --control-off #C9C2B8 | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--focus-ring` | --focus-ring #9C8B78 | role:accent | 0.98: the draft's comment on --acc says "badges" ("badges, focus ring, ticker icons, selection"); usage agrees | accept |
| `palette:--hairline` | --hairline #E6E1DA | role:border | 0.98: the draft declares --border-default: var(--hairline); usage agrees | accept |
| `palette:--ink` | --ink #141414 | role:heading,link,section-text,text,primary | 0.85: the most used heading colour on light grounds (5 headings) | accept |
| `palette:--ink-hover` | --ink-hover #2A2A2A | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--paper` | --paper #FAF8F5 | role:footer-bg,text-inverse,surface,primary-text | 0.85: the footer's ground on 1 page(s) | accept |
| `palette:--success` | --success #1B7F43 | role:success | 0.98: the draft's comment on --success says "in stock" ("in stock"); usage agrees | accept |
| `palette:--surface-alt` | --surface-alt #F3F0EB | role:section | 0.85: the most used ground after the page, raised and primary grounds (12 elements) | role:custom-surface-alt |
| `palette:--surface-card` | --surface-card #FFFFFF | role:surface-alt | 0.98: the draft declares --surface-card: var(--white); usage agrees | role:surface-alt,section |
| `palette:--surface-page` | --surface-page #FAF8F5 | role:surface,footer-bg,text-inverse,primary-text | 0.98: the draft declares --surface-page: var(--paper); usage agrees | accept |
| `palette:--surface-soft` | --surface-soft #F0EBE3 | role:accent-light | 0.85: the light ground of the accent's hue (34 grounds and lines, carrying the accent ink) | accept |
| `palette:--text-2` | --text-2 #5E584F | role:text-muted | 0.85: the colour of the most text after the text, heading and accent text, at least 10 L* lighter than the text (438 characters) | accept |
| `palette:--text-3` | --text-3 #77716A | role:custom-text-3 | 0.3: name says body text, but text is read from usage on --ink (#141414) | accept |
| `palette:--text-4` | --text-4 #8B8478 | role:custom-text-4 | 0.3: name says body text, but text is read from usage on --ink (#141414) | accept |
| `palette:--text-body` | --text-body #141414 | role:text,heading,link,section-text,primary | 0.98: the draft declares --text-body: var(--ink); usage agrees | accept |
| `palette:--text-faint` | --text-faint #A39C90 | role:custom-text-faint | 0.3: name says body text, but text is read from usage on --ink (#141414) | accept |
| `palette:--text-muted` | --text-muted #6B655E | role:custom-text-muted | 0.3: name says muted text, but text-muted is read from usage on --text-2 (#5E584F) | accept |
| `palette:--text-strong` | --text-strong #4A453E | role:custom-text-strong | 0.3: name says body text, but text is read from usage on --ink (#141414) | accept |
| `palette:--wa` | --wa #25D366 | role:whatsapp | 0.85: the ground of the links that open WhatsApp (2 elements) | accept |
| `palette:--wa-border` | --wa-border #B7E5C7 | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--wa-hover` | --wa-hover #1EBE5A | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--wa-ink` | --wa-ink #0B2B17 | role:custom-wa-ink | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--wa-ink-deep` | --wa-ink-deep #12301E | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--wa-soft` | --wa-soft #E9F9EF | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--white` | --white #FFFFFF | role:surface-alt | 0.98: the draft declares --surface-card: var(--white); usage agrees | role:surface-alt,section |

## Site Info (site-info)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `siteinfo:address#1` | address: 644 Washwood Heath Rd, Birmingham B8 2HQ | 644 Washwood Heath Rd, Birmingham B8 2HQ | Eye Care Birmingham:677, Eye Care Birmingham:1153, Eye Care Birmingham.dc.html:js:3197:7, Eye Care Birmingham.dc.html |  |
| `siteinfo:address#2` | address: 644 Washwood Heath Rd, B8 2HQ | 644 Washwood Heath Rd, B8 2HQ | Eye Care Birmingham:730 |  |
| `siteinfo:copyright` | copyright: © 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners | © 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners | Eye Care Birmingham.dc.html |  |
| `siteinfo:email` | email: hello@eyecarebirmingham.co.uk | hello@eyecarebirmingham.co.uk | Eye Care Birmingham:675, Eye Care Birmingham.dc.html |  |
| `siteinfo:hours.fri` | hours.fri: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html |  |
| `siteinfo:hours.friday` | hours.friday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 |  |
| `siteinfo:hours.mon` | hours.mon: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html |  |
| `siteinfo:hours.monday` | hours.monday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 |  |
| `siteinfo:hours.sat` | hours.sat: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html |  |
| `siteinfo:hours.saturday` | hours.saturday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 |  |
| `siteinfo:hours.thu` | hours.thu: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html |  |
| `siteinfo:hours.thursday` | hours.thursday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 |  |
| `siteinfo:hours.tue` | hours.tue: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html |  |
| `siteinfo:hours.tuesday` | hours.tuesday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 |  |
| `siteinfo:hours.wed` | hours.wed: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html |  |
| `siteinfo:hours.wednesday` | hours.wednesday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 |  |
| `siteinfo:phone` | phone: 0121 729 8233 | 01217298233 | Eye Care Birmingham.dc.html:js:3196:7, Eye Care Birmingham.dc.html:js:3196:40, Eye Care Birmingham.dc.html |  |
| `siteinfo:socials.google` | socials.google: https://maps.google.com/?q=644+Washwood+Heath+Rd+Birmingham+B8+2HQ | https://maps.google.com/?q=644+Washwood+Heath+Rd+Birmingham+B8+2HQ | Eye Care Birmingham.dc.html:js:3199:15 |  |
| `siteinfo:socials.instagram` | socials.instagram: https://www.instagram.com/eyecare.birmingham/ | https://www.instagram.com/eyecare.birmingham/ | Eye Care Birmingham.dc.html:js:3198:14, Eye Care Birmingham.dc.html |  |
| `siteinfo:socials.whatsapp` | socials.whatsapp: https://wa.me/4479605978 | https://wa.me/4479605978 | Eye Care Birmingham:111, Eye Care Birmingham:244, Eye Care Birmingham:406, Eye Care Birmingham:611, Eye Care Birmingham:668, Eye Care Birmingham:999, Eye Care Birmingham:1135, Eye Care Birmingham:1161, Eye Care Birmingham:1193, Eye Care Birmingham:1272, Eye Care Birmingham:1315, Eye Care Birmingham:1432, Eye Care Birmingham.dc.html |  |

## Flags (flag)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `flag:placeholder:Eye Care Birmingham.dc.html:js:2467:57` | placeholder: aisha.khan@example.com | accept-flagged | placeholder host example.com |  |
| `flag:placeholder:README.md:159` | placeholder: - Photography: Unsplash placeholders referenced by URL, not licensed for production. | accept-flagged | the README names this as a placeholder |  |
| `flag:placeholder:README.md:166` | placeholder: 3. Replace the "Placeholder review" entries in the product reviews (all three are placeholders) with real reviews, or keep the zero-review strip until real ones exist. | accept-flagged | the README names this as a placeholder |  |
| `flag:placeholder:README.md:173` | placeholder: 10. Subscriptions: confirm what is sold on subscription. The cards use placeholders (lens care kit £12, anti-fog wipes £9.50) and the shop has no way to start one yet. | accept-flagged | the README names this as a placeholder |  |
| `flag:placeholder:README.md:23` | placeholder: **High fidelity.** Colours, type, spacing, copy and interaction detail are final and should be matched closely. All visible text is signed-off content, not lorem. Imagery is the one unfinished area (Unsplash placeholders and "Photo to come" tiles). | accept-flagged | the README names this as a placeholder |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2426:7` | stock: https://images.unsplash.com/photo-1572635196237-14b3f281503f | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2427:7` | stock: https://images.unsplash.com/photo-1473496169904-658ba7c44d8a | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2428:7` | stock: https://images.unsplash.com/photo-1508296695146-257a814070b4 | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2429:7` | stock: https://images.unsplash.com/photo-1577803645773-f96470509666 | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2430:7` | stock: https://images.unsplash.com/photo-1509695507497-903c140c43b0 | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2431:7` | stock: https://images.unsplash.com/photo-1511499767150-a48a237f0083 | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2432:7` | stock: https://images.unsplash.com/photo-1556306535-0f09a537f0a3 | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham.dc.html:js:2433:7` | stock: https://images.unsplash.com/photo-1574258495973-f010dfbb5371 | accept-flagged | image URL built on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham:116` | stock: https://images.unsplash.com/photo-1577803645773-f96470509666?w=2200&q=82&auto=format&fit=crop | accept-flagged | image on the stock host images.unsplash.com |  |
| `flag:stock:Eye Care Birmingham:219` | stock: https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1500&q=82&auto=format&fit=crop | accept-flagged | image on the stock host images.unsplash.com |  |

## Missing features (missing-feature)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `missing:Eye Care Birmingham:19` | <span>: no SGS block fits it | no block proposed | no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Eye Care Birmingham:20` | <span>: no SGS block fits it | no block proposed | no block fits this element: decide it with skeleton.mjs decide |  |

### Confident proposals (Accept all covers these)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `missing:coverage:aria-role:alert` | aria-role:alert seen 1 time in the draft: seen but unsupported | gap:content, media and icons | aria-role:alert has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:aria-role:dialog` | aria-role:dialog seen 3 times in the draft: seen but unsupported | difference | aria-role:dialog is excluded from cloning (Bean, 2026-10-21: the drawer block renders its own dialog role; the drawer itself is cloned as its surface) |  |
| `missing:coverage:aria-role:img` | aria-role:img seen 5 times in the draft: seen but unsupported | gap:content, media and icons | aria-role:img has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:aria-role:status` | aria-role:status seen 3 times in the draft: seen but unsupported | gap:content, media and icons | aria-role:status has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:aria-role:switch` | aria-role:switch seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:switch has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:aria-role:tab` | aria-role:tab seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:tab has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:aria-role:tablist` | aria-role:tablist seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:tablist has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:construct:ref` | construct:ref seen 2 times in the draft: seen but unsupported | difference | construct:ref is excluded from cloning (Bean, 2026-10-21: a DOM handle in the draft's script: wiring only, the effect each one drives is cloned through its target) |  |
| `missing:coverage:css-function:brightness` | css-function:brightness seen 13 times in the draft: seen but unsupported | gap:draft reading | css-function:brightness has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:contrast` | css-function:contrast seen 2 times in the draft: seen but unsupported | difference | css-function:contrast is excluded from cloning (Bean, 2026-10-21: one use, contrast(1.05) on the footer map, below what the eye can see) |  |
| `missing:coverage:css-function:hue-rotate` | css-function:hue-rotate seen 3 times in the draft: seen but unsupported | gap:draft reading | css-function:hue-rotate has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:saturate` | css-function:saturate seen 15 times in the draft: seen but unsupported | gap:draft reading | css-function:saturate has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:sepia` | css-function:sepia seen 5 times in the draft: seen but unsupported | gap:draft reading | css-function:sepia has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-group:basic-user-interface` | css-group:basic-user-interface seen 35 times in the draft: partly supported | gap:draft reading | css-group:basic-user-interface: Fill does not read accent-color, appearance, cursor, resize (it reads the group's other 2 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:images` | css-group:images seen 6 times in the draft: partly supported | gap:draft reading | css-group:images: Fill does not read object-position (it reads the group's other 1 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:lists-and-counters` | css-group:lists-and-counters seen 5 times in the draft: seen but unsupported | gap:draft reading | css-group:lists-and-counters: Fill does not read list-style; wave draft reading |  |
| `missing:coverage:css-group:logical-properties-and-values` | css-group:logical-properties-and-values seen 22 times in the draft: seen but unsupported | gap:draft reading | css-group:logical-properties-and-values: Fill does not read inset; wave draft reading |  |
| `missing:coverage:css-group:overflow` | css-group:overflow seen 63 times in the draft: seen but unsupported | gap:draft reading | css-group:overflow: Fill does not read overflow, overflow-clip-margin, overflow-x, text-overflow; wave draft reading |  |
| `missing:coverage:css-group:scroll-snap` | css-group:scroll-snap seen 3 times in the draft: seen but unsupported | gap:draft reading | css-group:scroll-snap: Fill does not read scroll-padding-left, scroll-snap-align, scroll-snap-type; wave draft reading |  |
| `missing:coverage:css-group:will-change` | css-group:will-change seen 1 time in the draft: seen but unsupported | difference | css-group:will-change is excluded from cloning (Bean, 2026-10-21: a rendering hint with no visible effect; the motion model sets its own) |  |
| `missing:coverage:css-group:writing-modes` | css-group:writing-modes seen 21 times in the draft: seen but unsupported | difference | css-group:writing-modes is excluded from cloning (Bean, 2026-10-21: false hits: the direction keys are animate() options, not CSS; neither draft sets a writing direction) |  |
| `missing:coverage:css-pseudo-element:selection` | css-pseudo-element:selection seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | css-pseudo-element:selection has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-unit:ch` | css-unit:ch seen 19 times in the draft: seen but unsupported | gap:draft reading | css-unit:ch has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-unit:mm` | css-unit:mm seen 1 time in the draft: seen but unsupported | gap:draft reading | css-unit:mm has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:global.class` | html-attr:global.class seen 43 times in the draft: seen but unsupported | difference | html-attr:global.class is excluded from cloning (Bean, 2026-10-18: class names carry no value of their own: their styles reach the clone through the computed values Fill reads, and the behaviour they drive through the census) |  |
| `missing:coverage:html-attr:global.inputmode` | html-attr:global.inputmode seen 9 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:global.inputmode has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:global.title` | html-attr:global.title seen 9 times in the draft: seen but unsupported | difference | html-attr:global.title is excluded from cloning (Bean, 2026-10-21: a hover tooltip, not a look; the clone matches the draft's rendered page without it) |  |
| `missing:coverage:html-attr:input.checked` | html-attr:input.checked seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.checked has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.max` | html-attr:input.max seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.max has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.min` | html-attr:input.min seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.min has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.minlength` | html-attr:input.minlength seen 6 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.minlength has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.name` | html-attr:input.name seen 21 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.name has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.step` | html-attr:input.step seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.step has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:script.type` | html-attr:script.type seen 1 time in the draft: seen but unsupported | difference | html-attr:script.type is excluded from cloning (Bean, 2026-10-19: document plumbing: a WordPress page supplies its own document (head, body, script loading, resource hints)) |  |
| `missing:coverage:input-type:password` | input-type:password seen 8 times in the draft: seen but unsupported | gap:shop, forms and data | input-type:password has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:input-type:range` | input-type:range seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | input-type:range has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:svg:metadata` | svg:metadata seen 6 times in the draft: seen but unsupported | difference | svg:metadata is excluded from cloning (Bean, 2026-10-21: editor metadata inside an SVG paints nothing, and the media upload strips it (FR-48-58)) |  |

## Skeleton block choices (skeleton-block)

Accept all: [ ]

### Needs a decision (unresolved): no block (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/19#0` | header Eye Care Birmingham/19#0 <span> | no block | 0: no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:header:Eye Care Birmingham/20#0` | header Eye Care Birmingham/20#0 <span> | no block | 0: no block fits this element: decide it with skeleton.mjs decide |  |

### Needs a decision (low): block:sgs/card-grid (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mega-menu:Eye Care Birmingham/56#0` | mega-menu Eye Care Birmingham/56#0 <div> | block:sgs/card-grid | 0.5 |  |

### Needs a decision (low): block:sgs/media (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mobile-menu:Eye Care Birmingham/1194#0` | mobile-menu Eye Care Birmingham/1194#0 <img> | block:sgs/media | 0.29 |  |

### Needs a decision (low): block:sgs/multi-button (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1158#0` | footer Eye Care Birmingham/1158#0 <span> | block:sgs/multi-button | 0.51 |  |

### Needs a decision (low): block:sgs/responsive-logo (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/29#0` | header Eye Care Birmingham/29#0 <img> | block:sgs/responsive-logo | 0.66 |  |

### Needs a decision (low): block:sgs/site-header (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/13#0` | header Eye Care Birmingham/13#0 <header> | block:sgs/site-header | 0.58 |  |

### Needs a decision (low): block:sgs/text (19)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/10` | header Eye Care Birmingham/10 <span> "100% genuine, supplied direct by the brands" | block:sgs/text | 0.25: 8 copies of one template element |  |
| `skeleton:header:Eye Care Birmingham/47#0` | header Eye Care Birmingham/47#0 <span> "Bag" | block:sgs/text | 0.25 |  |
| `skeleton:header:Eye Care Birmingham/51#0` | header Eye Care Birmingham/51#0 <span> "0" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1239#0` | size-guide Eye Care Birmingham/1239#0 <span> "Which size am I?" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1245#0` | size-guide Eye Care Birmingham/1245#0 <span> "55" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1246#0` | size-guide Eye Care Birmingham/1246#0 <span> "▫ 18" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1247#0` | size-guide Eye Care Birmingham/1247#0 <span> "137" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1249#0` | size-guide Eye Care Birmingham/1249#0 <span> "Lens width" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1250#0` | size-guide Eye Care Birmingham/1250#0 <span> "Bridge" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1251#0` | size-guide Eye Care Birmingham/1251#0 <span> "Temple" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1254#0` | size-guide Eye Care Birmingham/1254#0 <div> "Lens width — 42 to 62mm" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1257#0` | size-guide Eye Care Birmingham/1257#0 <div> "Bridge — 14 to 24mm" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1260#0` | size-guide Eye Care Birmingham/1260#0 <div> "Temple — 130 to 150mm" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1264#0` | size-guide Eye Care Birmingham/1264#0 <span> "Small" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1265#0` | size-guide Eye Care Birmingham/1265#0 <span> "lens width up to 52mm" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1267#0` | size-guide Eye Care Birmingham/1267#0 <span> "Medium" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1268#0` | size-guide Eye Care Birmingham/1268#0 <span> "53 to 57mm" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1270#0` | size-guide Eye Care Birmingham/1270#0 <span> "Large" | block:sgs/text | 0.25 |  |
| `skeleton:size-guide:Eye Care Birmingham/1271#0` | size-guide Eye Care Birmingham/1271#0 <span> "58mm and above" | block:sgs/text | 0.25 |  |

### Settled by rule alignWrapper: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:size-guide:Eye Care Birmingham/1241#0` | size-guide Eye Care Birmingham/1241#0 <div> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) |  |

### Settled by rule columnHeading: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1138#0` | footer Eye Care Birmingham/1138#0 <span> "Shop" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style |  |
| `skeleton:footer:Eye Care Birmingham/1144#0` | footer Eye Care Birmingham/1144#0 <span> "Help" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style |  |
| `skeleton:footer:Eye Care Birmingham/1150#0` | footer Eye Care Birmingham/1150#0 <span> "Visit or call" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style |  |

### Settled by rule decorationLayer: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:size-guide:Eye Care Birmingham/1236#0` | size-guide Eye Care Birmingham/1236#0 <div> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |

### Settled by rule drawsChildren: the block each sits in draws it (each row's reason names that block) (14)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mega-menu:Eye Care Birmingham/57#0` | mega-menu Eye Care Birmingham/57#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/58#0` | mega-menu Eye Care Birmingham/58#0 <div> "By style" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/59#0` | mega-menu Eye Care Birmingham/59#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/61` | mega-menu Eye Care Birmingham/61 <a> "Pilot" | absorbed | 1: 12 copies of one template element; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/62#0` | mega-menu Eye Care Birmingham/62#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/63#0` | mega-menu Eye Care Birmingham/63#0 <div> "Shop by" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/64#0` | mega-menu Eye Care Birmingham/64#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/66` | mega-menu Eye Care Birmingham/66 <a> "Best sellers" | absorbed | 1: 6 copies of one template element; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/67#0` | mega-menu Eye Care Birmingham/67#0 <a> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/68#0` | mega-menu Eye Care Birmingham/68#0 <span> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/69#0` | mega-menu Eye Care Birmingham/69#0 <span> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/70#0` | mega-menu Eye Care Birmingham/70#0 <span> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/71#0` | mega-menu Eye Care Birmingham/71#0 <span> "Prescription sunglasses" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:mega-menu:Eye Care Birmingham/72#0` | mega-menu Eye Care Birmingham/72#0 <span> "Any frame here, from £59" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |

### Settled by rule footerSlots: the columns row of the footer (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1125#0` | footer Eye Care Birmingham/1125#0 <div> | block:sgs/site-footer-row | 1: the columns row of the footer |  |
| `skeleton:footer:Eye Care Birmingham/1156#0` | footer Eye Care Birmingham/1156#0 <div> | block:sgs/site-footer-row | 1: the bottom row of the footer |  |

### Settled by rule headerSlots: a strip above the header's main bar is its top row (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/7#0` | header Eye Care Birmingham/7#0 <div> | block:sgs/site-header-row | 1: a strip above the header's main bar is its top row |  |

### Settled by rule label: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/21#0` | header Eye Care Birmingham/21#0 <span> "Menu" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1167#0` | mobile-menu Eye Care Birmingham/1167#0 <span> "EYE CARE" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |

### Settled by rule logoGrid: a group of three or more links that each hold only an image (a logo wall) is sgs/gallery with a link per image; the links are its items (7)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1130#0` | footer Eye Care Birmingham/1130#0 <div> | block:sgs/gallery | 1: a group of three or more links that each hold only an image (a logo wall) is sgs/gallery with a link per image; the links are its items |  |
| `skeleton:footer:Eye Care Birmingham/1131#0` | footer Eye Care Birmingham/1131#0 <a> | absorbed | 1: drawn by sgs/gallery: rule logoGrid |  |
| `skeleton:footer:Eye Care Birmingham/1132#0` | footer Eye Care Birmingham/1132#0 <img> | absorbed | 1: drawn by sgs/gallery: rule logoGrid |  |
| `skeleton:footer:Eye Care Birmingham/1133#0` | footer Eye Care Birmingham/1133#0 <a> | absorbed | 1: drawn by sgs/gallery: rule logoGrid |  |
| `skeleton:footer:Eye Care Birmingham/1134#0` | footer Eye Care Birmingham/1134#0 <img> | absorbed | 1: drawn by sgs/gallery: rule logoGrid |  |
| `skeleton:footer:Eye Care Birmingham/1135#0` | footer Eye Care Birmingham/1135#0 <a> | absorbed | 1: drawn by sgs/gallery: rule logoGrid |  |
| `skeleton:footer:Eye Care Birmingham/1136#0` | footer Eye Care Birmingham/1136#0 <img> | absorbed | 1: drawn by sgs/gallery: rule logoGrid |  |

### Settled by rule navigation: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu (17)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/15#0` | header Eye Care Birmingham/15#0 <nav> | block:sgs/nav-bar-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu |  |
| `skeleton:header:Eye Care Birmingham/23#0` | header Eye Care Birmingham/23#0 <a> "Sunglasses" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:header:Eye Care Birmingham/24#0` | header Eye Care Birmingham/24#0 <a> "Brands" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:header:Eye Care Birmingham/25#0` | header Eye Care Birmingham/25#0 <a> "Lenses" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:header:Eye Care Birmingham/26#0` | header Eye Care Birmingham/26#0 <span> "Glasses" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:header:Eye Care Birmingham/27#0` | header Eye Care Birmingham/27#0 <span> "SOON" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1169#0` | mobile-menu Eye Care Birmingham/1169#0 <nav> | block:sgs/nav-drawer-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1170#0` | mobile-menu Eye Care Birmingham/1170#0 <a> "Sunglasses" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1171#0` | mobile-menu Eye Care Birmingham/1171#0 <a> "Brands" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1172#0` | mobile-menu Eye Care Birmingham/1172#0 <a> "Prescription lenses" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1173#0` | mobile-menu Eye Care Birmingham/1173#0 <span> "Glasses" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1174#0` | mobile-menu Eye Care Birmingham/1174#0 <span> "SOON" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1175#0` | mobile-menu Eye Care Birmingham/1175#0 <nav> | block:sgs/nav-drawer-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1176#0` | mobile-menu Eye Care Birmingham/1176#0 <a> "About Eye Care" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1177#0` | mobile-menu Eye Care Birmingham/1177#0 <a> "Delivery, returns & FAQs" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1178#0` | mobile-menu Eye Care Birmingham/1178#0 <button> "Size guide" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1179#0` | mobile-menu Eye Care Birmingham/1179#0 <a> "Contact" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation |  |

### Settled by rule pillButton: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link (8)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1161#0` | footer Eye Care Birmingham/1161#0 <a> | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link |  |
| `skeleton:footer:Eye Care Birmingham/1162#0` | footer Eye Care Birmingham/1162#0 <img> | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:footer:Eye Care Birmingham/1163#0` | footer Eye Care Birmingham/1163#0 <span> "Ask me anything" | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:size-guide:Eye Care Birmingham/1272#0` | size-guide Eye Care Birmingham/1272#0 <a> | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link |  |
| `skeleton:size-guide:Eye Care Birmingham/1273#0` | size-guide Eye Care Birmingham/1273#0 <span> | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:size-guide:Eye Care Birmingham/1274#0` | size-guide Eye Care Birmingham/1274#0 <img> | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:size-guide:Eye Care Birmingham/1275#0` | size-guide Eye Care Birmingham/1275#0 <span> "Can't find the numbers?" | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:size-guide:Eye Care Birmingham/1276#0` | size-guide Eye Care Birmingham/1276#0 <span> "Send me a photo of the inside of the arm and I'll read it for you." | absorbed | 1: drawn by sgs/button: rule pillButton |  |

### Settled by rule siteInfoLink: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/35#0` | header Eye Care Birmingham/35#0 <a> "0121 729 8233" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1181#0` | mobile-menu Eye Care Birmingham/1181#0 <a> "0121 729 8233" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself |  |

### Settled by rule solitaryIcon: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/40#0` | header Eye Care Birmingham/40#0 <button> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |

### Settled by rule surfaceRoot: a menu surface (the panel a navigation item opens) is sgs/mega-panel (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mega-menu:Eye Care Birmingham/53#0` | mega-menu Eye Care Birmingham/53#0 <div> | block:sgs/mega-panel | 1: a menu surface (the panel a navigation item opens) is sgs/mega-panel |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1165#0` | mobile-menu Eye Care Birmingham/1165#0 <div> | block:sgs/nav-drawer | 1: a drawer surface is sgs/nav-drawer, whose own settings draw its top row, logo, close button and body |  |

### Settled by rule wholeCardLink: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/28#0` | header Eye Care Birmingham/28#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |

### Settled by rule widthWrapper: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/8#0` | header Eye Care Birmingham/8#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there |  |
| `skeleton:mega-menu:Eye Care Birmingham/54#0` | mega-menu Eye Care Birmingham/54#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there |  |

### Confident proposals (Accept all covers these) (59)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1124#0` | footer Eye Care Birmingham/1124#0 <footer> | block:sgs/site-footer | 1 |  |
| `skeleton:footer:Eye Care Birmingham/1126#0` | footer Eye Care Birmingham/1126#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:footer:Eye Care Birmingham/1127#0` | footer Eye Care Birmingham/1127#0 <div> "EYE CARE" | block:sgs/responsive-logo | 0.8 |  |
| `skeleton:footer:Eye Care Birmingham/1128#0` | footer Eye Care Birmingham/1128#0 <div> "BIRMINGHAM" | absorbed | 0.8: part of the typed brand name; the logo block carries it |  |
| `skeleton:footer:Eye Care Birmingham/1129#0` | footer Eye Care Birmingham/1129#0 <p> "Designer eyewear from an independent optician in Birmingham." | block:sgs/text | 0.75 |  |
| `skeleton:footer:Eye Care Birmingham/1137#0` | footer Eye Care Birmingham/1137#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Eye Care Birmingham/1139#0` | footer Eye Care Birmingham/1139#0 <a> "Sunglasses" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1140#0` | footer Eye Care Birmingham/1140#0 <a> "All brands" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1141#0` | footer Eye Care Birmingham/1141#0 <a> "Prescription lenses" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1142#0` | footer Eye Care Birmingham/1142#0 <span> "Glasses — arriving soon" | remove | 0.9: brief-only line (coming-soon): a coming-soon line exists only because the designer's brief said the thing is not ready; it has no place on a live page |  |
| `skeleton:footer:Eye Care Birmingham/1143#0` | footer Eye Care Birmingham/1143#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Eye Care Birmingham/1145#0` | footer Eye Care Birmingham/1145#0 <a> "Delivery & returns" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1146#0` | footer Eye Care Birmingham/1146#0 <a> "FAQs" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1147#0` | footer Eye Care Birmingham/1147#0 <a> "Size guide" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1148#0` | footer Eye Care Birmingham/1148#0 <a> "Contact" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1149#0` | footer Eye Care Birmingham/1149#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Eye Care Birmingham/1151#0` | footer Eye Care Birmingham/1151#0 <a> "About Eye Care" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1152#0` | footer Eye Care Birmingham/1152#0 <a> "0121 729 8233" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1153#0` | footer Eye Care Birmingham/1153#0 <a> "644 Washwood Heath Rd Birmingham B8 2HQ" | block:sgs/icon-list | 0.7 |  |
| `skeleton:footer:Eye Care Birmingham/1155#0` | footer Eye Care Birmingham/1155#0 <span> "Mon–Sat 9.30–17.30" | block:sgs/business-info | 0.8 |  |
| `skeleton:footer:Eye Care Birmingham/1157#0` | footer Eye Care Birmingham/1157#0 <span> "© 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners" | block:sgs/business-info | 0.8 |  |
| `skeleton:footer:Eye Care Birmingham/1159#0` | footer Eye Care Birmingham/1159#0 <a> "Privacy" | block:sgs/button | 0.75 |  |
| `skeleton:footer:Eye Care Birmingham/1160#0` | footer Eye Care Birmingham/1160#0 <a> "Terms" | block:sgs/button | 0.75 |  |
| `skeleton:header:Eye Care Birmingham/14#0` | header Eye Care Birmingham/14#0 <div> | block:sgs/site-header-row | 1 |  |
| `skeleton:header:Eye Care Birmingham/17#0` | header Eye Care Birmingham/17#0 <button> | block:sgs/container | 1 |  |
| `skeleton:header:Eye Care Birmingham/18#0` | header Eye Care Birmingham/18#0 <span> | block:sgs/container | 1 |  |
| `skeleton:header:Eye Care Birmingham/30#0` | header Eye Care Birmingham/30#0 <span> | block:sgs/container | 1 |  |
| `skeleton:header:Eye Care Birmingham/31#0` | header Eye Care Birmingham/31#0 <span> "EYE CARE" | block:sgs/responsive-logo | 0.8 |  |
| `skeleton:header:Eye Care Birmingham/32#0` | header Eye Care Birmingham/32#0 <span> "BIRMINGHAM" | absorbed | 0.8: part of the typed brand name; the logo block carries it |  |
| `skeleton:header:Eye Care Birmingham/33#0` | header Eye Care Birmingham/33#0 <div> | block:sgs/container | 1 |  |
| `skeleton:header:Eye Care Birmingham/38#0` | header Eye Care Birmingham/38#0 <a> "About Eye Care" | block:sgs/button | 0.75 |  |
| `skeleton:header:Eye Care Birmingham/39#0` | header Eye Care Birmingham/39#0 <a> "Help" | block:sgs/button | 0.75 |  |
| `skeleton:header:Eye Care Birmingham/46#0` | header Eye Care Birmingham/46#0 <button> | block:sgs/container | 1 |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1166#0` | mobile-menu Eye Care Birmingham/1166#0 <div> | block:sgs/container | 1 |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1168#0` | mobile-menu Eye Care Birmingham/1168#0 <button> "×" | block:sgs/button | 0.75 |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1180#0` | mobile-menu Eye Care Birmingham/1180#0 <div> | block:sgs/container | 1 |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1184#0` | mobile-menu Eye Care Birmingham/1184#0 <div> | block:sgs/container | 1 |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1185#0` | mobile-menu Eye Care Birmingham/1185#0 <a> | block:sgs/icon | 0.9 |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1190#0` | mobile-menu Eye Care Birmingham/1190#0 <a> | block:sgs/icon | 0.9 |  |
| `skeleton:mobile-menu:Eye Care Birmingham/1193#0` | mobile-menu Eye Care Birmingham/1193#0 <a> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1235#0` | size-guide Eye Care Birmingham/1235#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1237#0` | size-guide Eye Care Birmingham/1237#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1238#0` | size-guide Eye Care Birmingham/1238#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1240#0` | size-guide Eye Care Birmingham/1240#0 <button> "×" | block:sgs/button | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1242#0` | size-guide Eye Care Birmingham/1242#0 <p> "The quickest way: pick up a pair of glasses you already like the fit of and look at the inside of the left arm. You'll find three numbers printed there." | block:sgs/text | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1243#0` | size-guide Eye Care Birmingham/1243#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1244#0` | size-guide Eye Care Birmingham/1244#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1248#0` | size-guide Eye Care Birmingham/1248#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1252#0` | size-guide Eye Care Birmingham/1252#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1253#0` | size-guide Eye Care Birmingham/1253#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1255#0` | size-guide Eye Care Birmingham/1255#0 <p> "The width of one lens at its widest. This is the number that decides whether a frame looks too small or too big on you." | block:sgs/text | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1256#0` | size-guide Eye Care Birmingham/1256#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1258#0` | size-guide Eye Care Birmingham/1258#0 <p> "The gap between the lenses that sits over your nose. Too narrow and they pinch; too wide and they slide down." | block:sgs/text | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1259#0` | size-guide Eye Care Birmingham/1259#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1261#0` | size-guide Eye Care Birmingham/1261#0 <p> "The length of the arm, ear bend included. I can adjust this in person, so it's the least critical of the three." | block:sgs/text | 0.75 |  |
| `skeleton:size-guide:Eye Care Birmingham/1262#0` | size-guide Eye Care Birmingham/1262#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1263#0` | size-guide Eye Care Birmingham/1263#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1266#0` | size-guide Eye Care Birmingham/1266#0 <div> | block:sgs/container | 1 |  |
| `skeleton:size-guide:Eye Care Birmingham/1269#0` | size-guide Eye Care Birmingham/1269#0 <div> | block:sgs/container | 1 |  |

## Inventory diffs (inventory-diff)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `inventory:anim:Eye Care Birmingham%7Ccss-media:only-ours` | RM-01 css-media Reduced-motion override *, ::before, ::after is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1005%7Ccss:animation-name.to` | K-58 (theirs CA-83) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1005%7Ccss:properties` | K-58 (theirs CA-83) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1005%7Ccss:trigger.type` | K-58 (theirs CA-83) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1026%7Ccss:animation-name.to` | K-59 (theirs CA-84) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1026%7Ccss:properties` | K-59 (theirs CA-84) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1026%7Ccss:trigger.type` | K-59 (theirs CA-84) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1044%7Ccss:animation-name.to` | K-60 (theirs CA-85) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1044%7Ccss:properties` | K-60 (theirs CA-85) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1044%7Ccss:trigger.type` | K-60 (theirs CA-85) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1058%7Ccss:animation-name.to` | K-61 (theirs CA-86) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1058%7Ccss:properties` | K-61 (theirs CA-86) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1058%7Ccss:trigger.type` | K-61 (theirs CA-86) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1070%7Ccss:animation-name.to` | K-62 (theirs CA-87) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1070%7Ccss:properties` | K-62 (theirs CA-87) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1070%7Ccss:trigger.type` | K-62 (theirs CA-87) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1082%7Ccss:animation-name.to` | K-63 (theirs CA-88) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1082%7Ccss:properties` | K-63 (theirs CA-88) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1082%7Ccss:trigger.type` | K-63 (theirs CA-88) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1098%7Ccss:animation-name.to` | K-64 (theirs CA-89) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1098%7Ccss:properties` | K-64 (theirs CA-89) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1098%7Ccss:trigger.type` | K-64 (theirs CA-89) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1123%7Ccss:animation-name.to` | K-65 (theirs CA-90) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1123%7Ccss:properties` | K-65 (theirs CA-90) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1123%7Ccss:trigger.type` | K-65 (theirs CA-90) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1131%7Ccss:border-color.from` | TR-071 (theirs TR-49) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1131%7Ccss:easing` | TR-071 (theirs TR-49) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1133%7Ccss:border-color.from` | TR-072 (theirs TR-50) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1133%7Ccss:easing` | TR-072 (theirs TR-50) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1135%7Ccss:border-color.from` | TR-073 (theirs TR-51) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1135%7Ccss:easing` | TR-073 (theirs TR-51) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C116%7Ccss:animation-name.to` | K-04 (theirs CA-04) animation-name.to: ours kenburns, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C116%7Ccss:properties` | K-04 (theirs CA-04) properties: ours animation-name,transform, theirs transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C116%7Ccss:trigger.type` | K-04 (theirs CA-04) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:color.from` | TR-074 (theirs TR-52) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:color.to` | TR-074 (theirs TR-52) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:easing` | TR-074 (theirs TR-52) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:properties` | TR-074 (theirs TR-52) properties: ours background,transform, theirs background,color,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1165%7Ccss:animation-name.to` | K-66 (theirs CA-45) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1165%7Ccss:properties` | K-66 (theirs CA-45) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1165%7Ccss:trigger.type` | K-66 (theirs CA-45) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:animation-name.to` | K-67 (theirs CA-46) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:delay_ms` | K-67 (theirs CA-46) delay_ms: ours 0, theirs 50 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:properties` | K-67 (theirs CA-46) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:trigger.type` | K-67 (theirs CA-46) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:animation-name.to` | K-68 (theirs CA-47) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:delay_ms` | K-68 (theirs CA-47) delay_ms: ours 0, theirs 100 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:properties` | K-68 (theirs CA-47) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:trigger.type` | K-68 (theirs CA-47) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:animation-name.to` | K-69 (theirs CA-48) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:delay_ms` | K-69 (theirs CA-48) delay_ms: ours 0, theirs 150 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:properties` | K-69 (theirs CA-48) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:trigger.type` | K-69 (theirs CA-48) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:animation-name.to` | K-70 (theirs CA-49) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:delay_ms` | K-70 (theirs CA-49) delay_ms: ours 0, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:properties` | K-70 (theirs CA-49) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:trigger.type` | K-70 (theirs CA-49) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:animation-name.to` | K-71 (theirs CA-50) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:delay_ms` | K-71 (theirs CA-50) delay_ms: ours 0, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:properties` | K-71 (theirs CA-50) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:trigger.type` | K-71 (theirs CA-50) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:animation-name.to` | K-72 (theirs CA-51) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:delay_ms` | K-72 (theirs CA-51) delay_ms: ours 0, theirs 360 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:properties` | K-72 (theirs CA-51) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:trigger.type` | K-72 (theirs CA-51) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1197%7Ccss:animation-name.to` | K-73 (theirs CA-52) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1197%7Ccss:properties` | K-73 (theirs CA-52) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1197%7Ccss:trigger.type` | K-73 (theirs CA-52) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1198%7Ccss:animation-name.to` | K-74 (theirs CA-53) animation-name.to: ours slideL, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1198%7Ccss:properties` | K-74 (theirs CA-53) properties: ours animation-name,transform, theirs transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1198%7Ccss:trigger.type` | K-74 (theirs CA-53) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:animation-name.to` | K-05 (theirs CA-05) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:delay_ms` | K-05 (theirs CA-05) delay_ms: ours 0, theirs 150 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:properties` | K-05 (theirs CA-05) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:trigger.type` | K-05 (theirs CA-05) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1209%7Ccss:animation-name.to` | K-75 (theirs CA-54) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1209%7Ccss:properties` | K-75 (theirs CA-54) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1209%7Ccss:trigger.type` | K-75 (theirs CA-54) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:animation-name.to` | K-06 (theirs CA-06) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:delay_ms` | K-06 (theirs CA-06) delay_ms: ours 0, theirs 280 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:properties` | K-06 (theirs CA-06) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:trigger.type` | K-06 (theirs CA-06) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:animation-name.to` | K-07 (theirs CA-07) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:delay_ms` | K-07 (theirs CA-07) delay_ms: ours 0, theirs 420 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:properties` | K-07 (theirs CA-07) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:trigger.type` | K-07 (theirs CA-07) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:animation-name.to` | K-08 (theirs CA-08) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:delay_ms` | K-08 (theirs CA-08) delay_ms: ours 0, theirs 560 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:properties` | K-08 (theirs CA-08) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:trigger.type` | K-08 (theirs CA-08) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1231%7Ccss:width.to` | TR-075 (theirs TR-53) width.to: ours null, theirs state-bound: freeShipPct | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1236%7Ccss:animation-name.to` | K-76 (theirs CA-55) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1236%7Ccss:properties` | K-76 (theirs CA-55) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1236%7Ccss:trigger.type` | K-76 (theirs CA-55) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1237%7Ccss:animation-name.to` | K-77 (theirs CA-56) animation-name.to: ours zoomIn, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1237%7Ccss:properties` | K-77 (theirs CA-56) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1237%7Ccss:trigger.type` | K-77 (theirs CA-56) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C124%7Ccss:easing` | TR-011 (theirs TR-11) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C125%7Ccss:border-color.from` | TR-012 (theirs TR-12) border-color.from: ours null, theirs 1px solid rgba(250,248,245,.75) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C125%7Ccss:easing` | TR-012 (theirs TR-12) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:animation-name.to` | K-09 (theirs CA-09) animation-name.to: ours marquee, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:properties` | K-09 (theirs CA-09) properties: ours animation-name,transform, theirs transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:transform.from` | K-09 (theirs CA-09) transform.from: ours translateX(0px), theirs translateX(0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:trigger.type` | K-09 (theirs CA-09) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1272%7Ccss:color.to` | TR-077 (theirs TR-55) color.to: ours null, theirs #0F2E1C | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1272%7Ccss:properties` | TR-077 (theirs TR-55) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:animation-name.to` | K-78 (theirs CA-57) animation-name.to: ours toast, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:properties` | K-78 (theirs CA-57) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:transform.to` | K-78 (theirs CA-57) transform.to: ours translate(-50%, 0px), theirs translate(-50%,0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:trigger.type` | K-78 (theirs CA-57) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1283%7Ccss:animation-name.to` | K-79 (theirs CA-58) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1283%7Ccss:properties` | K-79 (theirs CA-58) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1283%7Ccss:trigger.type` | K-79 (theirs CA-58) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1288%7Ccss:border-color.from` | TR-078 (theirs TR-56) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C129%7Ccss:easing` | TR-013 (theirs TR-13) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1291%7Ccss:width.to` | TR-079 (theirs TR-57) width.to: ours null, theirs state-bound: lensProgress | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1296%7Ccss:filter.to` | TR-080 (theirs TR-58) filter.to: ours null, theirs state-bound: lensPreviewFilter | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1313%7Ccss:animation-name.to` | K-80 (theirs CA-59) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1313%7Ccss:properties` | K-80 (theirs CA-59) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1313%7Ccss:trigger.type` | K-80 (theirs CA-59) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1315%7Ccss:color.to` | TR-081 (theirs TR-59) color.to: ours null, theirs #12301E | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1315%7Ccss:properties` | TR-081 (theirs TR-59) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1322%7Ccss:animation-name.to` | K-81 (theirs CA-60) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1322%7Ccss:properties` | K-81 (theirs CA-60) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1322%7Ccss:trigger.type` | K-81 (theirs CA-60) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1329%7Ccss:border-color.from` | TR-082 (theirs TR-60) border-color.from: ours null, theirs 2px solid {{ o.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1329%7Ccss:delay_ms` | TR-082 (theirs TR-60) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1329%7Ccss:duration_ms` | TR-082 (theirs TR-60) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1341%7Ccss:color.from` | TR-083 (theirs TR-61) color.from: ours null, theirs #4A453E | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1341%7Ccss:color.to` | TR-083 (theirs TR-61) color.to: ours null, theirs #fff | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1341%7Ccss:properties` | TR-083 (theirs TR-61) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1343%7Ccss:animation-name.to` | K-82 (theirs CA-61) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1343%7Ccss:properties` | K-82 (theirs CA-61) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1343%7Ccss:trigger.type` | K-82 (theirs CA-61) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1345%7Ccss:animation-name.to` | K-83 (theirs CA-62) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1345%7Ccss:properties` | K-83 (theirs CA-62) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1345%7Ccss:trigger.type` | K-83 (theirs CA-62) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1352%7Ccss:border-color.from` | TR-084 (theirs TR-62) border-color.from: ours null, theirs 2px solid {{ o.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1352%7Ccss:delay_ms` | TR-084 (theirs TR-62) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1352%7Ccss:duration_ms` | TR-084 (theirs TR-62) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1365%7Ccss:color.from` | TR-085 (theirs TR-63) color.from: ours null, theirs #4A453E | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1365%7Ccss:color.to` | TR-085 (theirs TR-63) color.to: ours null, theirs #fff | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1365%7Ccss:properties` | TR-085 (theirs TR-63) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1367%7Ccss:animation-name.to` | K-84 (theirs CA-63) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1367%7Ccss:properties` | K-84 (theirs CA-63) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1367%7Ccss:trigger.type` | K-84 (theirs CA-63) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1369%7Ccss:animation-name.to` | K-85 (theirs CA-64) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1369%7Ccss:properties` | K-85 (theirs CA-64) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1369%7Ccss:trigger.type` | K-85 (theirs CA-64) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1376%7Ccss:border-color.from` | TR-086 (theirs TR-64) border-color.from: ours null, theirs 2px solid {{ o.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1376%7Ccss:delay_ms` | TR-086 (theirs TR-64) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1376%7Ccss:duration_ms` | TR-086 (theirs TR-64) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1385%7Ccss:color.from` | TR-087 (theirs TR-65) color.from: ours null, theirs #4A453E | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1385%7Ccss:color.to` | TR-087 (theirs TR-65) color.to: ours null, theirs #fff | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1385%7Ccss:properties` | TR-087 (theirs TR-65) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1387%7Ccss:animation-name.to` | K-86 (theirs CA-65) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1387%7Ccss:properties` | K-86 (theirs CA-65) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1387%7Ccss:trigger.type` | K-86 (theirs CA-65) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1389%7Ccss:animation-name.to` | K-87 (theirs CA-66) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1389%7Ccss:properties` | K-87 (theirs CA-66) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1389%7Ccss:trigger.type` | K-87 (theirs CA-66) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1395%7Ccss:border-color.from` | TR-088 (theirs TR-66) border-color.from: ours null, theirs 2px solid {{ m.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1395%7Ccss:easing` | TR-088 (theirs TR-66) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C14%7Ccss:padding.to` | TR-001 (theirs TR-02) padding.to: ours null, theirs state-bound: navPad | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1402%7Ccss:animation-name.to` | K-88 (theirs CA-67) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1402%7Ccss:properties` | K-88 (theirs CA-67) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1402%7Ccss:trigger.type` | K-88 (theirs CA-67) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#hover%7Cborder-color:border-color.from` | TR-089 (theirs TR-67) border-color.from: ours null, theirs 1.5px dashed #C9C2B8 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#load%7Canimation-name,opacity:animation-name.to` | K-89 (theirs CA-68) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#load%7Canimation-name,opacity:properties` | K-89 (theirs CA-68) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#load%7Canimation-name,opacity:trigger.type` | K-89 (theirs CA-68) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1412%7Ccss:animation-name.to` | K-90 (theirs CA-69) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1412%7Ccss:properties` | K-90 (theirs CA-69) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1412%7Ccss:trigger.type` | K-90 (theirs CA-69) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1432%7Ccss:color.to` | TR-090 (theirs TR-68) color.to: ours null, theirs #12301E | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1432%7Ccss:properties` | TR-090 (theirs TR-68) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1439%7Ccss:border-color.from` | TR-091 (theirs TR-69) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C161%7Ccss:border-color.from` | TR-014 (theirs TR-14) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C161%7Ccss:delay_ms` | TR-014 (theirs TR-14) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C161%7Ccss:duration_ms` | TR-014 (theirs TR-14) duration_ms: ours per property, theirs 400 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C23%7Ccss:border-color.from` | TR-002 (theirs TR-03) border-color.from: ours null, theirs 1px solid {{ ulSun }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C23%7Ccss:border-color.to` | TR-002 (theirs TR-03) border-color.to: ours null, theirs state-bound: ulSun | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C232%7Ccss:easing` | TR-021 (theirs TR-21) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C24%7Ccss:border-color.from` | TR-003 (theirs TR-04) border-color.from: ours null, theirs 1px solid {{ ulBrands }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C24%7Ccss:border-color.to` | TR-003 (theirs TR-04) border-color.to: ours null, theirs state-bound: ulBrands | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:color.from` | TR-022 (theirs TR-22) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:color.to` | TR-022 (theirs TR-22) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:easing` | TR-022 (theirs TR-22) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:properties` | TR-022 (theirs TR-22) properties: ours background,transform, theirs background,color,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C249%7Ccss:animation-name.to` | K-10 (theirs CA-10) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C249%7Ccss:properties` | K-10 (theirs CA-10) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C249%7Ccss:trigger.type` | K-10 (theirs CA-10) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C25%7Ccss:border-color.from` | TR-004 (theirs TR-05) border-color.from: ours null, theirs 1px solid {{ ulLenses }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C25%7Ccss:border-color.to` | TR-004 (theirs TR-05) border-color.to: ours null, theirs state-bound: ulLenses | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C266%7Ccss:animation-name.to` | K-11 (theirs CA-11) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C266%7Ccss:properties` | K-11 (theirs CA-11) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C266%7Ccss:trigger.type` | K-11 (theirs CA-11) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C271%7Ccss:animation-name.to` | K-12 (theirs CA-12) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C271%7Ccss:properties` | K-12 (theirs CA-12) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C271%7Ccss:trigger.type` | K-12 (theirs CA-12) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C283%7Ccss:transform.to` | TR-024 (theirs TR-24) transform.to: ours null, theirs state-bound: g.rot | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C286%7Ccss:animation-name.to` | K-13 (theirs CA-13) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C286%7Ccss:properties` | K-13 (theirs CA-13) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C286%7Ccss:trigger.type` | K-13 (theirs CA-13) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C29%7Ccss:easing` | TR-005 (theirs TR-06) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:background.from` | TR-025 (theirs TR-25) background.from: ours null, theirs {{ i.bg }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:background.to` | TR-025 (theirs TR-25) background.to: ours null, theirs state-bound: i.bg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:color.from` | TR-025 (theirs TR-25) color.from: ours null, theirs {{ i.color }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:color.to` | TR-025 (theirs TR-25) color.to: ours null, theirs state-bound: i.color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:properties` | TR-025 (theirs TR-25) properties: ours all, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:background.from` | TR-026 (theirs TR-26) background.from: ours null, theirs {{ i.bg }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:background.to` | TR-026 (theirs TR-26) background.to: ours null, theirs state-bound: i.bg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:border.from` | TR-026 (theirs TR-26) border.from: ours null, theirs 1px solid {{ i.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:border.to` | TR-026 (theirs TR-26) border.to: ours null, theirs state-bound: i.border | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:color.from` | TR-026 (theirs TR-26) color.from: ours null, theirs {{ i.color }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:color.to` | TR-026 (theirs TR-26) color.to: ours null, theirs state-bound: i.color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:properties` | TR-026 (theirs TR-26) properties: ours border-color, theirs background,border,border-color,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C31%7Ccss:font-size.to` | TR-006 (theirs TR-07) font-size.to: ours null, theirs state-bound: wordmarkSize | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C317%7Ccss:background.to` | TR-028 (theirs TR-28) background.to: ours null, theirs state-bound: polBg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C318%7Ccss:left.to` | TR-029 (theirs TR-29) left.to: ours null, theirs state-bound: polKnob | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#hover%7Cfilter,transform:delay_ms` | TR-030 (theirs TR-30) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#hover%7Cfilter,transform:duration_ms` | TR-030 (theirs TR-30) duration_ms: ours per property, theirs 900 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#hover%7Cfilter,transform:filter.to` | TR-030 (theirs TR-30) filter.to: ours null, theirs state-bound: cur.imgFilter | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#load%7Canimation-name,opacity,transform:animation-name.to` | K-14 (theirs CA-14) animation-name.to: ours zoomIn, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#load%7Canimation-name,opacity,transform:properties` | K-14 (theirs CA-14) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#load%7Canimation-name,opacity,transform:trigger.type` | K-14 (theirs CA-14) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C356%7Ccss:border-color.from` | TR-031 (theirs TR-31) border-color.from: ours null, theirs 1px solid {{ t.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C356%7Ccss:border-color.to` | TR-031 (theirs TR-31) border-color.to: ours null, theirs state-bound: t.border | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C360%7Ccss:animation-name.to` | K-15 (theirs CA-15) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C360%7Ccss:properties` | K-15 (theirs CA-15) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C360%7Ccss:trigger.type` | K-15 (theirs CA-15) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C381%7Ccss:border-color.from` | TR-032 (theirs TR-32) border-color.from: ours null, theirs 1px solid {{ c.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C381%7Ccss:easing` | TR-032 (theirs TR-32) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:background.from` | TR-033 (theirs TR-33) background.from: ours null, theirs {{ s.bg }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:background.to` | TR-033 (theirs TR-33) background.to: ours null, theirs state-bound: s.bg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:border.from` | TR-033 (theirs TR-33) border.from: ours null, theirs 1px solid {{ s.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:border.to` | TR-033 (theirs TR-33) border.to: ours null, theirs state-bound: s.border | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:color.from` | TR-033 (theirs TR-33) color.from: ours null, theirs {{ s.color }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:color.to` | TR-033 (theirs TR-33) color.to: ours null, theirs state-bound: s.color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:properties` | TR-033 (theirs TR-33) properties: ours border-color, theirs background,border,border-color,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C395%7Ccss:easing` | TR-034 (theirs TR-34) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C398%7Ccss:easing` | TR-035 (theirs TR-35) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C406%7Ccss:color.to` | TR-036 (theirs TR-36) color.to: ours null, theirs #0F2E1C | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C406%7Ccss:properties` | TR-036 (theirs TR-36) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C420%7Ccss:border-color.from` | TR-037 (theirs TR-37) border-color.from: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C420%7Ccss:color.to` | TR-037 (theirs TR-37) color.to: ours null, theirs state-bound: t.colour | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C420%7Ccss:easing` | TR-037 (theirs TR-37) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C422%7Ccss:animation-name.to` | K-16 (theirs CA-16) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C422%7Ccss:properties` | K-16 (theirs CA-16) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C422%7Ccss:trigger.type` | K-16 (theirs CA-16) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C430%7Ccss:animation-name.to` | K-17 (theirs CA-17) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C430%7Ccss:properties` | K-17 (theirs CA-17) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C430%7Ccss:trigger.type` | K-17 (theirs CA-17) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C436%7Ccss:animation-name.to` | K-18 (theirs CA-18) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C436%7Ccss:properties` | K-18 (theirs CA-18) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C436%7Ccss:trigger.type` | K-18 (theirs CA-18) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C46%7Ccss:easing` | TR-008 (theirs TR-08) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C498%7Ccss:transform.to` | TR-038 (theirs TR-38) transform.to: ours null, theirs state-bound: a.rot | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C500%7Ccss:animation-name.to` | K-19 (theirs CA-19) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C500%7Ccss:properties` | K-19 (theirs CA-19) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C500%7Ccss:trigger.type` | K-19 (theirs CA-19) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C51%7Ccss:animation-name.to` | K-02 (theirs CA-02) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C51%7Ccss:properties` | K-02 (theirs CA-02) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C51%7Ccss:trigger.type` | K-02 (theirs CA-02) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C516%7Ccss:width.to` | TR-039 (theirs TR-39) width.to: ours null, theirs state-bound: b.pct | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C53%7Ccss:animation-name.to` | K-03 (theirs CA-03) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C53%7Ccss:properties` | K-03 (theirs CA-03) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C53%7Ccss:trigger.type` | K-03 (theirs CA-03) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C553%7Ccss:animation-name.to` | K-20 (theirs CA-20) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C553%7Ccss:properties` | K-20 (theirs CA-20) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C553%7Ccss:trigger.type` | K-20 (theirs CA-20) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C554%7Ccss:animation-name.to` | K-21 (theirs CA-21) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C554%7Ccss:properties` | K-21 (theirs CA-21) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C554%7Ccss:trigger.type` | K-21 (theirs CA-21) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C555%7Ccss:animation-name.to` | K-22 (theirs CA-22) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C555%7Ccss:properties` | K-22 (theirs CA-22) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C555%7Ccss:trigger.type` | K-22 (theirs CA-22) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C604%7Ccss:animation-name.to` | K-23 (theirs CA-23) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C604%7Ccss:properties` | K-23 (theirs CA-23) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C604%7Ccss:trigger.type` | K-23 (theirs CA-23) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C605%7Ccss:animation-name.to` | K-24 (theirs CA-24) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C605%7Ccss:properties` | K-24 (theirs CA-24) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C605%7Ccss:trigger.type` | K-24 (theirs CA-24) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C606%7Ccss:animation-name.to` | K-25 (theirs CA-25) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C606%7Ccss:properties` | K-25 (theirs CA-25) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C606%7Ccss:trigger.type` | K-25 (theirs CA-25) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C607%7Ccss:animation-name.to` | K-26 (theirs CA-26) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C607%7Ccss:properties` | K-26 (theirs CA-26) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C607%7Ccss:trigger.type` | K-26 (theirs CA-26) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C608%7Ccss:animation-name.to` | K-27 (theirs CA-27) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C608%7Ccss:properties` | K-27 (theirs CA-27) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C608%7Ccss:trigger.type` | K-27 (theirs CA-27) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C609%7Ccss:animation-name.to` | K-28 (theirs CA-28) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C609%7Ccss:properties` | K-28 (theirs CA-28) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C609%7Ccss:trigger.type` | K-28 (theirs CA-28) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C610%7Ccss:animation-name.to` | K-29 (theirs CA-29) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C610%7Ccss:properties` | K-29 (theirs CA-29) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C610%7Ccss:trigger.type` | K-29 (theirs CA-29) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C611%7Ccss:color.from` | TR-041 (theirs TR-41) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C611%7Ccss:color.to` | TR-041 (theirs TR-41) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C611%7Ccss:properties` | TR-041 (theirs TR-41) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C614%7Ccss:animation-name.to` | K-30 (theirs CA-30) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C614%7Ccss:properties` | K-30 (theirs CA-30) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C614%7Ccss:trigger.type` | K-30 (theirs CA-30) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C651%7Ccss:transform.to` | TR-042 (theirs TR-42) transform.to: ours null, theirs state-bound: q.rot | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C653%7Ccss:animation-name.to` | K-31 (theirs CA-31) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C653%7Ccss:properties` | K-31 (theirs CA-31) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C653%7Ccss:trigger.type` | K-31 (theirs CA-31) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:color.from` | TR-043 (theirs TR-43) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:color.to` | TR-043 (theirs TR-43) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:easing` | TR-043 (theirs TR-43) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:properties` | TR-043 (theirs TR-43) properties: ours background,transform, theirs background,color,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C700%7Ccss:animation-name.to` | K-32 (theirs CA-32) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C700%7Ccss:properties` | K-32 (theirs CA-32) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C700%7Ccss:trigger.type` | K-32 (theirs CA-32) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C743%7Ccss:animation-name.to` | K-33 (theirs CA-33) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C743%7Ccss:properties` | K-33 (theirs CA-33) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C743%7Ccss:trigger.type` | K-33 (theirs CA-33) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C752%7Ccss:animation-name.to` | K-34 (theirs CA-34) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C752%7Ccss:properties` | K-34 (theirs CA-34) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C752%7Ccss:trigger.type` | K-34 (theirs CA-34) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C765%7Ccss:animation-name.to` | K-35 (theirs CA-70) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C765%7Ccss:properties` | K-35 (theirs CA-70) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C765%7Ccss:trigger.type` | K-35 (theirs CA-70) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C770%7Ccss:animation-name.to` | K-36 (theirs CA-35) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C770%7Ccss:properties` | K-36 (theirs CA-35) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C770%7Ccss:trigger.type` | K-36 (theirs CA-35) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:background.from` | TR-045 (theirs TR-45) background.from: ours null, theirs {{ delBg }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:background.to` | TR-045 (theirs TR-45) background.to: ours null, theirs state-bound: delBg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:border.from` | TR-045 (theirs TR-45) border.from: ours null, theirs 1px solid {{ delBorder }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:border.to` | TR-045 (theirs TR-45) border.to: ours null, theirs state-bound: delBorder | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:properties` | TR-045 (theirs TR-45) properties: ours border-color, theirs background,border,border-color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:background.from` | TR-046 (theirs TR-46) background.from: ours null, theirs {{ colBg }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:background.to` | TR-046 (theirs TR-46) background.to: ours null, theirs state-bound: colBg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:border.from` | TR-046 (theirs TR-46) border.from: ours null, theirs 1px solid {{ colBorder }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:border.to` | TR-046 (theirs TR-46) border.to: ours null, theirs state-bound: colBorder | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:properties` | TR-046 (theirs TR-46) properties: ours border-color, theirs background,border,border-color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C785%7Ccss:animation-name.to` | K-37 (theirs CA-36) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C785%7Ccss:properties` | K-37 (theirs CA-36) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C785%7Ccss:trigger.type` | K-37 (theirs CA-36) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C792%7Ccss:animation-name.to` | K-38 (theirs CA-37) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C792%7Ccss:properties` | K-38 (theirs CA-37) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C792%7Ccss:trigger.type` | K-38 (theirs CA-37) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:background.from` | TR-047 (theirs TR-47) background.from: ours null, theirs {{ m.bg }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:background.to` | TR-047 (theirs TR-47) background.to: ours null, theirs state-bound: m.bg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:border.from` | TR-047 (theirs TR-47) border.from: ours null, theirs 1px solid {{ m.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:border.to` | TR-047 (theirs TR-47) border.to: ours null, theirs state-bound: m.border | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:color.from` | TR-047 (theirs TR-47) color.from: ours null, theirs {{ m.color }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:color.to` | TR-047 (theirs TR-47) color.to: ours null, theirs state-bound: m.color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:properties` | TR-047 (theirs TR-47) properties: ours all, theirs background,border,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:animation-name.to` | K-01 (theirs CA-01) animation-name.to: ours tickerAnim, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:duration_ms` | K-01 (theirs CA-01) duration_ms: ours 0, theirs 30000 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:easing` | K-01 (theirs CA-01) easing: ours ease, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:iterations` | K-01 (theirs CA-01) iterations: ours 1, theirs infinite | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:properties` | K-01 (theirs CA-01) properties: ours animation-name, theirs transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:transform.from` | K-01 (theirs CA-01) transform.from: ours null, theirs translateX(0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:transform.to` | K-01 (theirs CA-01) transform.to: ours null, theirs translateX(-50%) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:trigger.type` | K-01 (theirs CA-01) trigger.type: ours load, theirs media-query | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C805%7Ccss:animation-name.to` | K-39 (theirs CA-38) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C805%7Ccss:properties` | K-39 (theirs CA-38) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C805%7Ccss:trigger.type` | K-39 (theirs CA-38) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C806%7Ccss:animation-name.to` | K-40 (theirs CA-39) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C806%7Ccss:properties` | K-40 (theirs CA-39) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C806%7Ccss:trigger.type` | K-40 (theirs CA-39) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C817%7Ccss:animation-name.to` | K-41 (theirs CA-40) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C817%7Ccss:properties` | K-41 (theirs CA-40) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C817%7Ccss:trigger.type` | K-41 (theirs CA-40) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C846%7Ccss:animation-name.to` | K-42 (theirs CA-41) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C846%7Ccss:properties` | K-42 (theirs CA-41) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C846%7Ccss:trigger.type` | K-42 (theirs CA-41) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C847%7Ccss:animation-name.to` | K-43 (theirs CA-42) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C847%7Ccss:properties` | K-43 (theirs CA-42) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C847%7Ccss:trigger.type` | K-43 (theirs CA-42) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C848%7Ccss:animation-name.to` | K-44 (theirs CA-43) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C848%7Ccss:properties` | K-44 (theirs CA-43) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C848%7Ccss:trigger.type` | K-44 (theirs CA-43) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C850%7Ccss:animation-name.to` | K-45 (theirs CA-71) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C850%7Ccss:properties` | K-45 (theirs CA-71) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C850%7Ccss:trigger.type` | K-45 (theirs CA-71) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C852%7Ccss:animation-name.to` | K-46 (theirs CA-44) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C852%7Ccss:properties` | K-46 (theirs CA-44) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C852%7Ccss:trigger.type` | K-46 (theirs CA-44) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C854%7Ccss#load%7Canimation-name,opacity,transform:animation-name.to` | K-47 (theirs CA-72) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C854%7Ccss#load%7Canimation-name,opacity,transform:properties` | K-47 (theirs CA-72) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C854%7Ccss#load%7Canimation-name,opacity,transform:trigger.type` | K-47 (theirs CA-72) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C858%7Ccss:animation-name.to` | K-48 (theirs CA-73) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C858%7Ccss:properties` | K-48 (theirs CA-73) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C858%7Ccss:trigger.type` | K-48 (theirs CA-73) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C863%7Ccss:animation-name.to` | K-49 (theirs CA-74) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C863%7Ccss:properties` | K-49 (theirs CA-74) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C863%7Ccss:trigger.type` | K-49 (theirs CA-74) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C864%7Ccss:animation-name.to` | K-50 (theirs CA-75) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C864%7Ccss:properties` | K-50 (theirs CA-75) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C864%7Ccss:trigger.type` | K-50 (theirs CA-75) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C887%7Ccss:animation-name.to` | K-51 (theirs CA-76) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C887%7Ccss:properties` | K-51 (theirs CA-76) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C887%7Ccss:trigger.type` | K-51 (theirs CA-76) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C897%7Ccss:animation-name.to` | K-52 (theirs CA-77) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C897%7Ccss:properties` | K-52 (theirs CA-77) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C897%7Ccss:trigger.type` | K-52 (theirs CA-77) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C906%7Ccss:animation-name.to` | K-53 (theirs CA-78) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C906%7Ccss:properties` | K-53 (theirs CA-78) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C906%7Ccss:trigger.type` | K-53 (theirs CA-78) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C916%7Ccss:animation-name.to` | K-54 (theirs CA-79) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C916%7Ccss:properties` | K-54 (theirs CA-79) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C916%7Ccss:trigger.type` | K-54 (theirs CA-79) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C920%7Ccss:animation-name.to` | K-55 (theirs CA-80) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C920%7Ccss:properties` | K-55 (theirs CA-80) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C920%7Ccss:trigger.type` | K-55 (theirs CA-80) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C934%7Ccss:animation-name.to` | K-56 (theirs CA-81) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C934%7Ccss:properties` | K-56 (theirs CA-81) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C934%7Ccss:trigger.type` | K-56 (theirs CA-81) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C955%7Ccss:animation-name.to` | K-57 (theirs CA-82) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C955%7Ccss:properties` | K-57 (theirs CA-82) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C955%7Ccss:trigger.type` | K-57 (theirs CA-82) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:delay_ms` | J-01 (theirs J-02) delay_ms: ours 0, theirs min(i, 7) * 70 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:duration_ms` | J-01 (theirs J-02) duration_ms: ours 250, theirs 460 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:easing` | J-01 (theirs J-02) easing: ours ease, theirs easeOutCubic: 1-(1-p)^3 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:only-ours` | J-02 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:only-ours~2` | J-03 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:only-ours~3` | J-04 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:opacity.from` | J-01 (theirs J-02) opacity.from: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:opacity.to` | J-01 (theirs J-02) opacity.to: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:properties` | J-01 (theirs J-02) properties: ours opacity, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:transform.from` | J-01 (theirs J-02) transform.from: ours null, theirs translateY(26px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:transform.to` | J-01 (theirs J-02) transform.to: ours null, theirs translateY(0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours` | J-05 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours~2` | J-06 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours~3` | J-07 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours~4` | J-08 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2614%7Cjs:only-ours` | J-09 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2614%7Cjs:only-ours~2` | J-10 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2614%7Cjs:only-ours~3` | J-11 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:duration_ms` | J-12 (theirs J-01) duration_ms: ours 400, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:easing` | J-12 (theirs J-01) easing: ours ease, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:only-ours` | J-13 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:only-ours~2` | J-14 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:opacity.to` | J-12 (theirs J-01) opacity.to: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:properties` | J-12 (theirs J-01) properties: ours transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2623%7Cjs:duration_ms` | J-15 (theirs J-05) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2623%7Cjs:transform.from` | J-15 (theirs J-05) transform.from: ours null, theirs translate3d(0,0,0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2628%7Cjs:only-ours` | J-16 js-style-write js-style-write in lockScroll on document.documentElement is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2665%7Cjs:only-ours` | J-17 js-style-write js-style-write in componentWillUnmount on document.documentElement is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:properties` | J-18 (theirs J-06) properties: ours scroll-position, theirs scrollTop | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:reduced_motion.behaviour` | J-18 (theirs J-06) reduced_motion.behaviour: ours final-state, theirs unchanged | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:scrollTop.from` | J-18 (theirs J-06) scrollTop.from: ours null, theirs current | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:scrollTop.to` | J-18 (theirs J-06) scrollTop.to: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2980%7Cjs:only-ours` | J-19 js-scroll js-scroll in renderVals on window is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:duration_ms` | J-20 (theirs J-07) duration_ms: ours 0, theirs browser smooth scroll | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:easing` | J-20 (theirs J-07) easing: ours null, theirs browser default | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:properties` | J-20 (theirs J-07) properties: ours scroll-position, theirs scrollLeft | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:reduced_motion.behaviour` | J-20 (theirs J-07) reduced_motion.behaviour: ours final-state, theirs skip | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:scrollLeft.from` | J-20 (theirs J-07) scrollLeft.from: ours null, theirs current | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:status` | J-20 (theirs J-07) status: ours dead-code, theirs active | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:trigger.type` | J-20 (theirs J-07) trigger.type: ours state, theirs press | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3137%7Cjs:only-ours` | J-21 js-scroll js-scroll in renderVals on .rev-rail is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:border-color.from` | TR-094 (theirs TR-72) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:delay_ms` | TR-094 (theirs TR-72) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:duration_ms` | TR-094 (theirs TR-72) duration_ms: ours per property, theirs 400 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:reduced_motion.behaviour` | TR-094 (theirs TR-72) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C10%7Ccss:easing` | TR-096 (theirs TR-74) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C10%7Ccss:reduced_motion.behaviour` | TR-096 (theirs TR-74) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:delay_ms` | TR-095 (theirs TR-73) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:duration_ms` | TR-095 (theirs TR-73) duration_ms: ours per property, theirs 900 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:filter.to` | TR-095 (theirs TR-73) filter.to: ours null, theirs state-bound: p.imgFilter | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:reduced_motion.behaviour` | TR-095 (theirs TR-73) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Frame Card%7Ctpl%7C31%7Ccss:reduced_motion.behaviour` | TR-097 (theirs TR-75) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C16%7Ccss:only-theirs` | Claude Design's PS-14 css-pseudo Global link hover colour has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C18%7Ccss:only-theirs` | Claude Design's PS-15 css-pseudo Focus outline has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2567%7Cjs:only-theirs` | Claude Design's J-03 js-style-write Scroll reveal: clean-up has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2594%7Cjs:only-theirs` | Claude Design's J-04 js-style-write Scroll reveal: show all at once (no IntersectionObserver, or reduced motion) has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2627%7Cjs:only-theirs` | Claude Design's J-08 js-style-write Page scroll lock behind overlays has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C28%7Cmedia:only-theirs` | Claude Design's RM-01 css-media Reduced-motion media rule has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2979%7Cjs:only-theirs` | Claude Design's J-09 js-scroll Scroll to top on opening an order has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C34%7Ccss:only-theirs` | Claude Design's PS-16 css-pseudo Reviews rail scrollbar thumb hover has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:count:css_animations` | count css_animations: ours 112, theirs 90 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:count:js_style_writers` | count js_style_writers: ours 11, theirs 17 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:surface-count:routes` | surface count routes: ours 9, theirs 11 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:surface-count:toggling_sc_ifs` | surface count toggling_sc_ifs: ours 0, theirs 80 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:surface:Eye Care Birmingham%7C0:states` | S-01 (theirs S-01) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states |  |
| `inventory:surface:route%7Chome:states` | S-03 (theirs S-08) states: ours 1, theirs 2 | ours | the re-derived surface and Claude Design's list a different number of states |  |
| `inventory:surface:route:account:only-theirs` | route account is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:route:done:only-theirs` | route done is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1004:only-theirs` | toggling-sc-if Eye Care Birmingham :1004 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1008:only-theirs` | toggling-sc-if Eye Care Birmingham :1008 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1025:only-theirs` | toggling-sc-if Eye Care Birmingham :1025 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1028:only-theirs` | toggling-sc-if Eye Care Birmingham :1028 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1035:only-theirs` | toggling-sc-if Eye Care Birmingham :1035 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1037:only-theirs` | toggling-sc-if Eye Care Birmingham :1037 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1040:only-theirs` | toggling-sc-if Eye Care Birmingham :1040 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1043:only-theirs` | toggling-sc-if Eye Care Birmingham :1043 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1050:only-theirs` | toggling-sc-if Eye Care Birmingham :1050 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1053:only-theirs` | toggling-sc-if Eye Care Birmingham :1053 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1057:only-theirs` | toggling-sc-if Eye Care Birmingham :1057 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1065:only-theirs` | toggling-sc-if Eye Care Birmingham :1065 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1067:only-theirs` | toggling-sc-if Eye Care Birmingham :1067 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1069:only-theirs` | toggling-sc-if Eye Care Birmingham :1069 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1081:only-theirs` | toggling-sc-if Eye Care Birmingham :1081 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1086:only-theirs` | toggling-sc-if Eye Care Birmingham :1086 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1092:only-theirs` | toggling-sc-if Eye Care Birmingham :1092 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1097:only-theirs` | toggling-sc-if Eye Care Birmingham :1097 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1122:only-theirs` | toggling-sc-if Eye Care Birmingham :1122 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1164:only-theirs` | toggling-sc-if Eye Care Birmingham :1164 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1195:only-theirs` | toggling-sc-if Eye Care Birmingham :1195 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1204:only-theirs` | toggling-sc-if Eye Care Birmingham :1204 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1221:only-theirs` | toggling-sc-if Eye Care Birmingham :1221 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1224:only-theirs` | toggling-sc-if Eye Care Birmingham :1224 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1234:only-theirs` | toggling-sc-if Eye Care Birmingham :1234 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1277:only-theirs` | toggling-sc-if Eye Care Birmingham :1277 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1282:only-theirs` | toggling-sc-if Eye Care Birmingham :1282 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1299:only-theirs` | toggling-sc-if Eye Care Birmingham :1299 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1321:only-theirs` | toggling-sc-if Eye Care Birmingham :1321 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1342:only-theirs` | toggling-sc-if Eye Care Birmingham :1342 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1344:only-theirs` | toggling-sc-if Eye Care Birmingham :1344 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1366:only-theirs` | toggling-sc-if Eye Care Birmingham :1366 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1368:only-theirs` | toggling-sc-if Eye Care Birmingham :1368 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1386:only-theirs` | toggling-sc-if Eye Care Birmingham :1386 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1388:only-theirs` | toggling-sc-if Eye Care Birmingham :1388 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1401:only-theirs` | toggling-sc-if Eye Care Birmingham :1401 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1405:only-theirs` | toggling-sc-if Eye Care Birmingham :1405 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1411:only-theirs` | toggling-sc-if Eye Care Birmingham :1411 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1438:only-theirs` | toggling-sc-if Eye Care Birmingham :1438 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1440:only-theirs` | toggling-sc-if Eye Care Birmingham :1440 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1444:only-theirs` | toggling-sc-if Eye Care Birmingham :1444 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1446:only-theirs` | toggling-sc-if Eye Care Birmingham :1446 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :263:only-theirs` | toggling-sc-if Eye Care Birmingham :263 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :270:only-theirs` | toggling-sc-if Eye Care Birmingham :270 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :272:only-theirs` | toggling-sc-if Eye Care Birmingham :272 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :285:only-theirs` | toggling-sc-if Eye Care Birmingham :285 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :319:only-theirs` | toggling-sc-if Eye Care Birmingham :319 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :328:only-theirs` | toggling-sc-if Eye Care Birmingham :328 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :421:only-theirs` | toggling-sc-if Eye Care Birmingham :421 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :429:only-theirs` | toggling-sc-if Eye Care Birmingham :429 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :435:only-theirs` | toggling-sc-if Eye Care Birmingham :435 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :44:only-theirs` | toggling-sc-if Eye Care Birmingham :44 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :499:only-theirs` | toggling-sc-if Eye Care Birmingham :499 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :52:only-theirs` | toggling-sc-if Eye Care Birmingham :52 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :55:only-theirs` | toggling-sc-if Eye Care Birmingham :55 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :652:only-theirs` | toggling-sc-if Eye Care Birmingham :652 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :699:only-theirs` | toggling-sc-if Eye Care Birmingham :699 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :73:only-theirs` | toggling-sc-if Eye Care Birmingham :73 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :758:only-theirs` | toggling-sc-if Eye Care Birmingham :758 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :764:only-theirs` | toggling-sc-if Eye Care Birmingham :764 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :768:only-theirs` | toggling-sc-if Eye Care Birmingham :768 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :784:only-theirs` | toggling-sc-if Eye Care Birmingham :784 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :791:only-theirs` | toggling-sc-if Eye Care Birmingham :791 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :799:only-theirs` | toggling-sc-if Eye Care Birmingham :799 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :804:only-theirs` | toggling-sc-if Eye Care Birmingham :804 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :849:only-theirs` | toggling-sc-if Eye Care Birmingham :849 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :853:only-theirs` | toggling-sc-if Eye Care Birmingham :853 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :857:only-theirs` | toggling-sc-if Eye Care Birmingham :857 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :85:only-theirs` | toggling-sc-if Eye Care Birmingham :85 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :862:only-theirs` | toggling-sc-if Eye Care Birmingham :862 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :886:only-theirs` | toggling-sc-if Eye Care Birmingham :886 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :896:only-theirs` | toggling-sc-if Eye Care Birmingham :896 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :905:only-theirs` | toggling-sc-if Eye Care Birmingham :905 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :915:only-theirs` | toggling-sc-if Eye Care Birmingham :915 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :92:only-theirs` | toggling-sc-if Eye Care Birmingham :92 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :933:only-theirs` | toggling-sc-if Eye Care Birmingham :933 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :936:only-theirs` | toggling-sc-if Eye Care Birmingham :936 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :949:only-theirs` | toggling-sc-if Eye Care Birmingham :949 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :954:only-theirs` | toggling-sc-if Eye Care Birmingham :954 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:WP Build Gap Map :73:only-theirs` | toggling-sc-if WP Build Gap Map :73 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |

## Notices (notice)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `notice:host:images.unsplash.com` | request to images.unsplash.com blocked (1 URL, first https://images.unsplash.com/photo-1508296695146-257a814070b4?w=900&q=80&auto=format&fit=crop) | noted | replay-miss |  |
