# Intake review: eye-care-ward-end

Taken on 2026-10-27T14:57:20.709Z; manifest 1.0, files hash 262dd0304564cd78.

How to mark: put x in a section's `Accept all: [ ]` box to give every row the section's first mark; to mark one row differently, write its mark in that row's Mark cell (a row's own mark always beats Accept all). Flag rows left blank are accepted as flagged and not-a-defect rows left blank stay not defects; every other row needs Accept all or its own mark. Rows marked **changed** differ from the last export, lost their old mark and come first. Then run `node scripts/computed-route/intake.mjs --apply-review eye-care-ward-end`.

Rows: 1503; 824 need reading, 679 are confident proposals that Accept all covers (skeleton block choices 642, missing features 37).

Not defects counted, not listed: breakpoint 46, prop-variant 91, reached-when-forced 242, render-wins 1270.

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

Accept all: [x]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `page:page:about` | about → About (page, static, page) | about | drawer-2 #1 |  |
| `page:page:cart` | (no route) → Your bag (page, static, cart) | cart |  | accept |
| `page:page:checkout` | checkout → Checkout (page, static, checkout) | checkout |  | accept |
| `page:page:contact` | contact → Contact (page, static, page) | contact | drawer-2 #3 |  |
| `page:page:help` | help → Help (page, static, page) | help | drawer-2 #2 |  |
| `page:page:home` | home → Home (page, static, front-page) | home |  |  |
| `page:page:my-account` | signin → Sign in / register (page, static, page) | my-account |  |  |
| `page:page:prescription-lenses` | lenses → Lenses (page, static, page) | prescription-lenses | header #3, drawer-1 #3 |  |
| `page:product:product` | product → Product (product, live, single-product) | product |  | accept |
| `page:sgs_choice_flow:choice-flow-add-prescription-lenses` | (no route) → Add prescription lenses (sgs_choice_flow, static) | choice-flow-add-prescription-lenses |  | accept |
| `page:sgs_drawer:drawer-eye-care-birmingham` | (no route) → Drawer (sgs_drawer, static) | drawer-eye-care-birmingham |  | accept |
| `page:sgs_footer:footer` | (no route) → Footer (sgs_footer, static) | footer |  | accept |
| `page:sgs_form:form-submit-contact` | (no route) → submitContact (sgs_form, static) | form-submit-contact |  | accept |
| `page:sgs_header:header` | (no route) → Header (sgs_header, static) | header |  | accept |
| `page:sgs_mega_menu:mega-menu-brands` | (no route) → Brands mega menu (sgs_mega_menu, static) | mega-menu-brands |  | accept |
| `page:sgs_mega_menu:mega-menu-help` | (no route) → Help mega menu (sgs_mega_menu, static) | mega-menu-help |  | accept |
| `page:sgs_mega_menu:mega-menu-lenses` | (no route) → Lenses mega menu (sgs_mega_menu, static) | mega-menu-lenses |  | accept |
| `page:sgs_mega_menu:mega-menu-sunglasses` | (no route) → Sunglasses mega menu (sgs_mega_menu, static) | mega-menu-sunglasses |  | accept |
| `page:sgs_modal:modal-size-guide` | (no route) → Size guide (sgs_modal, static) | modal-size-guide |  | accept |
| `page:shop:shop` | shop → Sunglasses (shop, live, archive-product) | shop | drawer-1 #1 | accept |
| `page:template:order-confirmation` | done → Order confirmed (template, static, order-confirmation) | order-confirmation |  |  |

## Palette roles (palette-role)

Accept all: [x]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `palette:--acc` | --acc #9C8B78 | role:accent | 0.98: the draft's comment on --acc says "badges" ("badges, focus ring, ticker icons, selection"); usage agrees | accept |
| `palette:--acc-ink` | --acc-ink #6F6152 | role:link-hover | 0.95: the draft's comment on --acc-ink says "link hover" ("kicker text, link hover") | accept |
| `palette:--acc-soft` | --acc-soft #EFEAE2 | role:custom-acc-soft | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--border-default` | --border-default #E6E1DA | role:border,accent-light | 0.98: the draft declares --border-default: var(--hairline); usage agrees | accept |
| `palette:--border-strong` | --border-strong #D8D2C8 | role:custom-border-strong | 0.3: name says border, but border is read from usage on --hairline (#E6E1DA) | accept |
| `palette:--border-warm` | --border-warm #D5CCBD | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--button-primary-bg` | --button-primary-bg #141414 | role:heading,link,text,primary | 0.85: the most used heading colour on light grounds (30 headings) | accept |
| `palette:--button-primary-fg` | --button-primary-fg #FAF8F5 | role:footer-bg,text-inverse,surface,primary-text | 0.85: the footer's ground on 11 page(s) | accept |
| `palette:--control-off` | --control-off #C9C2B8 | role:custom-control-off | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--focus-ring` | --focus-ring #9C8B78 | role:accent | 0.98: the draft's comment on --acc says "badges" ("badges, focus ring, ticker icons, selection"); usage agrees | accept |
| `palette:--hairline` | --hairline #E6E1DA | role:accent-light,border | 0.85: the light ground of the accent's hue (613 grounds and lines) | accept |
| `palette:--ink` | --ink #141414 | role:heading,link,text,primary | 0.85: the most used heading colour on light grounds (30 headings) | accept |
| `palette:--ink-hover` | --ink-hover #2A2A2A | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--paper` | --paper #FAF8F5 | role:footer-bg,text-inverse,surface,primary-text | 0.85: the footer's ground on 11 page(s) | accept |
| `palette:--success` | --success #1B7F43 | role:success | 0.98: the draft's comment on --success says "in stock" ("in stock"); usage agrees | accept |
| `palette:--surface-alt` | --surface-alt #F3F0EB | role:section | 0.85: the most used ground after the page, raised and primary grounds (44 elements) | role:custom-surface-alt |
| `palette:--surface-card` | --surface-card #FFFFFF | role:accent-text,surface-alt | 0.85: the colour of the most text on the accent ground (1 characters) | accept |
| `palette:--surface-page` | --surface-page #FAF8F5 | role:surface,footer-bg,text-inverse,primary-text | 0.98: the draft declares --surface-page: var(--paper); usage agrees | accept |
| `palette:--surface-soft` | --surface-soft #F0EBE3 | role:custom-surface-soft | 0.3: name says surface, but surface-alt is read from usage on --white (#FFFFFF) | accept |
| `palette:--text-2` | --text-2 #5E584F | role:text-muted | 0.85: the colour of the most text after the text, heading and accent text, at least 10 L* lighter than the text (3919 characters) | accept |
| `palette:--text-3` | --text-3 #77716A | role:custom-text-3 | 0.3: name says body text, but text is read from usage on --ink (#141414) | accept |
| `palette:--text-4` | --text-4 #8B8478 | role:section-text | 0.85: the colour of the most text on the section ground (55 characters) | accept |
| `palette:--text-body` | --text-body #141414 | role:text,heading,link,primary | 0.98: the draft declares --text-body: var(--ink); usage agrees | accept |
| `palette:--text-faint` | --text-faint #A39C90 | role:custom-text-faint | 0.3: name says body text, but text is read from usage on --ink (#141414) | accept |
| `palette:--text-muted` | --text-muted #6B655E | role:custom-text-muted | 0.3: name says muted text, but text-muted is read from usage on --text-2 (#5E584F) | accept |
| `palette:--text-strong` | --text-strong #4A453E | role:custom-text-strong | 0.3: name says body text, but text is read from usage on --ink (#141414) | accept |
| `palette:--wa` | --wa #25D366 | role:whatsapp | 0.85: the ground of the links that open WhatsApp (15 elements) | accept |
| `palette:--wa-border` | --wa-border #B7E5C7 | role:custom-wa-border | 0.8: a saturated border is not the divider slug (FR-33-2 border guard) | accept |
| `palette:--wa-hover` | --wa-hover #1EBE5A | no slug (one-off) | unused: no element in the draft uses this value | accept |
| `palette:--wa-ink` | --wa-ink #0B2B17 | role:custom-wa-ink | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--wa-ink-deep` | --wa-ink-deep #12301E | role:custom-wa-ink-deep | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--wa-soft` | --wa-soft #E9F9EF | role:custom-wa-soft | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) | accept |
| `palette:--white` | --white #FFFFFF | role:accent-text,surface-alt | 0.85: the colour of the most text on the accent ground (1 characters) | accept |

## Site Info (site-info)

Accept all: [x]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `siteinfo:address#1` | address: 644 Washwood Heath Rd, Birmingham B8 2HQ | 644 Washwood Heath Rd, Birmingham B8 2HQ | Eye Care Birmingham:677, Eye Care Birmingham:1153, Eye Care Birmingham.dc.html:js:3197:7, Eye Care Birmingham.dc.html | accept |
| `siteinfo:address#2` | address: 644 Washwood Heath Rd, B8 2HQ | 644 Washwood Heath Rd, B8 2HQ | Eye Care Birmingham:730 | accept |
| `siteinfo:copyright` | copyright: © 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners | © 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners | Eye Care Birmingham.dc.html | accept |
| `siteinfo:email` | email: hello@eyecarebirmingham.co.uk | hello@eyecarebirmingham.co.uk | Eye Care Birmingham:675, Eye Care Birmingham.dc.html | accept |
| `siteinfo:hours.fri` | hours.fri: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html | accept |
| `siteinfo:hours.friday` | hours.friday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 | accept |
| `siteinfo:hours.mon` | hours.mon: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html | accept |
| `siteinfo:hours.monday` | hours.monday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 | accept |
| `siteinfo:hours.sat` | hours.sat: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html | accept |
| `siteinfo:hours.saturday` | hours.saturday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 | accept |
| `siteinfo:hours.thu` | hours.thu: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html | accept |
| `siteinfo:hours.thursday` | hours.thursday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 | accept |
| `siteinfo:hours.tue` | hours.tue: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html | accept |
| `siteinfo:hours.tuesday` | hours.tuesday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 | accept |
| `siteinfo:hours.wed` | hours.wed: 9.30–17.30 | 09:30–17:30 | Eye Care Birmingham.dc.html | accept |
| `siteinfo:hours.wednesday` | hours.wednesday: 09:30–17:30 | 09:30–17:30 | Eye Care Birmingham:680 | accept |
| `siteinfo:phone` | phone: 0121 729 8233 | 01217298233 | Eye Care Birmingham.dc.html:js:3196:7, Eye Care Birmingham.dc.html:js:3196:40, Eye Care Birmingham.dc.html | accept |
| `siteinfo:socials.google` | socials.google: https://maps.google.com/?q=644+Washwood+Heath+Rd+Birmingham+B8+2HQ | https://maps.google.com/?q=644+Washwood+Heath+Rd+Birmingham+B8+2HQ | Eye Care Birmingham.dc.html:js:3199:15 | accept |
| `siteinfo:socials.instagram` | socials.instagram: https://www.instagram.com/eyecare.birmingham/ | https://www.instagram.com/eyecare.birmingham/ | Eye Care Birmingham.dc.html:js:3198:14, Eye Care Birmingham.dc.html | accept |
| `siteinfo:socials.whatsapp` | socials.whatsapp: https://wa.me/4479605978 | https://wa.me/4479605978 | Eye Care Birmingham:111, Eye Care Birmingham:244, Eye Care Birmingham:406, Eye Care Birmingham:611, Eye Care Birmingham:668, Eye Care Birmingham:999, Eye Care Birmingham:1135, Eye Care Birmingham:1161, Eye Care Birmingham:1193, Eye Care Birmingham:1272, Eye Care Birmingham:1315, Eye Care Birmingham:1432, Eye Care Birmingham.dc.html | accept |

## Flags (flag)

Accept all: [x]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `flag:placeholder:Eye Care Birmingham.dc.html:js:2467:57` | placeholder: aisha.khan@example.com | accept-flagged | placeholder host example.com | accept-flagged |
| `flag:placeholder:README.md:159` | placeholder: - Photography: Unsplash placeholders referenced by URL, not licensed for production. | accept-flagged | the README names this as a placeholder | accept-flagged |
| `flag:placeholder:README.md:166` | placeholder: 3. Replace the "Placeholder review" entries in the product reviews (all three are placeholders) with real reviews, or keep the zero-review strip until real ones exist. | accept-flagged | the README names this as a placeholder | accept-flagged |
| `flag:placeholder:README.md:173` | placeholder: 10. Subscriptions: confirm what is sold on subscription. The cards use placeholders (lens care kit £12, anti-fog wipes £9.50) and the shop has no way to start one yet. | accept-flagged | the README names this as a placeholder | accept-flagged |
| `flag:placeholder:README.md:23` | placeholder: **High fidelity.** Colours, type, spacing, copy and interaction detail are final and should be matched closely. All visible text is signed-off content, not lorem. Imagery is the one unfinished area (Unsplash placeholders and "Photo to come" tiles). | accept-flagged | the README names this as a placeholder | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2426:7` | stock: https://images.unsplash.com/photo-1572635196237-14b3f281503f | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2427:7` | stock: https://images.unsplash.com/photo-1473496169904-658ba7c44d8a | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2428:7` | stock: https://images.unsplash.com/photo-1508296695146-257a814070b4 | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2429:7` | stock: https://images.unsplash.com/photo-1577803645773-f96470509666 | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2430:7` | stock: https://images.unsplash.com/photo-1509695507497-903c140c43b0 | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2431:7` | stock: https://images.unsplash.com/photo-1511499767150-a48a237f0083 | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2432:7` | stock: https://images.unsplash.com/photo-1556306535-0f09a537f0a3 | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham.dc.html:js:2433:7` | stock: https://images.unsplash.com/photo-1574258495973-f010dfbb5371 | accept-flagged | image URL built on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham:116` | stock: https://images.unsplash.com/photo-1577803645773-f96470509666?w=2200&q=82&auto=format&fit=crop | accept-flagged | image on the stock host images.unsplash.com | accept-flagged |
| `flag:stock:Eye Care Birmingham:219` | stock: https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1500&q=82&auto=format&fit=crop | accept-flagged | image on the stock host images.unsplash.com | accept-flagged |

## Draft defects (draft-defect)

Accept all: [x]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `defect-group:Eye Care Birmingham:componentDidMount` | Eye Care Birmingham componentDidMount: 2 defects (timer, handler) at Eye Care Birmingham:js:2647:81, Eye Care Birmingham:js:2650:4 | build the code's intent |  | render-wins |

## Missing features (missing-feature)

Accept all: [x]

### Confident proposals (Accept all covers these)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `missing:coverage:aria-role:alert` | aria-role:alert seen 1 time in the draft: seen but unsupported | gap:content, media and icons | aria-role:alert has no clone path yet (has nothing; wave content, media and icons) | gap:content, media and icons |
| `missing:coverage:aria-role:dialog` | aria-role:dialog seen 3 times in the draft: seen but unsupported | difference | aria-role:dialog is excluded from cloning (Bean, 2026-10-21: the drawer block renders its own dialog role; the drawer itself is cloned as its surface) | difference |
| `missing:coverage:aria-role:img` | aria-role:img seen 5 times in the draft: seen but unsupported | gap:content, media and icons | aria-role:img has no clone path yet (has nothing; wave content, media and icons) | gap:content, media and icons |
| `missing:coverage:aria-role:status` | aria-role:status seen 3 times in the draft: seen but unsupported | gap:content, media and icons | aria-role:status has no clone path yet (has nothing; wave content, media and icons) | gap:content, media and icons |
| `missing:coverage:aria-role:switch` | aria-role:switch seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:switch has no clone path yet (has nothing; wave behaviour recognisers) | gap:behaviour recognisers |
| `missing:coverage:aria-role:tab` | aria-role:tab seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:tab has no clone path yet (has nothing; wave behaviour recognisers) | gap:behaviour recognisers |
| `missing:coverage:aria-role:tablist` | aria-role:tablist seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:tablist has no clone path yet (has nothing; wave behaviour recognisers) | gap:behaviour recognisers |
| `missing:coverage:construct:ref` | construct:ref seen 2 times in the draft: seen but unsupported | difference | construct:ref is excluded from cloning (Bean, 2026-10-21: a DOM handle in the draft's script: wiring only, the effect each one drives is cloned through its target) | difference |
| `missing:coverage:css-function:brightness` | css-function:brightness seen 13 times in the draft: seen but unsupported | gap:draft reading | css-function:brightness has no clone path yet (has nothing; wave draft reading) | gap:draft reading |
| `missing:coverage:css-function:contrast` | css-function:contrast seen 2 times in the draft: seen but unsupported | difference | css-function:contrast is excluded from cloning (Bean, 2026-10-21: one use, contrast(1.05) on the footer map, below what the eye can see) | difference |
| `missing:coverage:css-function:hue-rotate` | css-function:hue-rotate seen 3 times in the draft: seen but unsupported | gap:draft reading | css-function:hue-rotate has no clone path yet (has nothing; wave draft reading) | gap:draft reading |
| `missing:coverage:css-function:saturate` | css-function:saturate seen 15 times in the draft: seen but unsupported | gap:draft reading | css-function:saturate has no clone path yet (has nothing; wave draft reading) | gap:draft reading |
| `missing:coverage:css-function:sepia` | css-function:sepia seen 5 times in the draft: seen but unsupported | gap:draft reading | css-function:sepia has no clone path yet (has nothing; wave draft reading) | gap:draft reading |
| `missing:coverage:css-group:basic-user-interface` | css-group:basic-user-interface seen 35 times in the draft: partly supported | gap:draft reading | css-group:basic-user-interface: Fill does not read accent-color, appearance, cursor, resize (it reads the group's other 2 the draft uses); wave draft reading | gap:draft reading |
| `missing:coverage:css-group:images` | css-group:images seen 6 times in the draft: partly supported | gap:draft reading | css-group:images: Fill does not read object-position (it reads the group's other 1 the draft uses); wave draft reading | gap:draft reading |
| `missing:coverage:css-group:lists-and-counters` | css-group:lists-and-counters seen 5 times in the draft: seen but unsupported | gap:draft reading | css-group:lists-and-counters: Fill does not read list-style; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:logical-properties-and-values` | css-group:logical-properties-and-values seen 22 times in the draft: seen but unsupported | gap:draft reading | css-group:logical-properties-and-values: Fill does not read inset; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:overflow` | css-group:overflow seen 63 times in the draft: seen but unsupported | gap:draft reading | css-group:overflow: Fill does not read overflow, overflow-clip-margin, overflow-x, text-overflow; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:scroll-snap` | css-group:scroll-snap seen 3 times in the draft: seen but unsupported | gap:draft reading | css-group:scroll-snap: Fill does not read scroll-padding-left, scroll-snap-align, scroll-snap-type; wave draft reading | gap:draft reading |
| `missing:coverage:css-group:will-change` | css-group:will-change seen 1 time in the draft: seen but unsupported | difference | css-group:will-change is excluded from cloning (Bean, 2026-10-21: a rendering hint with no visible effect; the motion model sets its own) | difference |
| `missing:coverage:css-group:writing-modes` | css-group:writing-modes seen 21 times in the draft: seen but unsupported | difference | css-group:writing-modes is excluded from cloning (Bean, 2026-10-21: false hits: the direction keys are animate() options, not CSS; neither draft sets a writing direction) | difference |
| `missing:coverage:css-pseudo-element:selection` | css-pseudo-element:selection seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | css-pseudo-element:selection has no clone path yet (has nothing; wave modes and values with no CSS property) | gap:modes and values with no CSS property |
| `missing:coverage:css-unit:ch` | css-unit:ch seen 19 times in the draft: seen but unsupported | gap:draft reading | css-unit:ch has no clone path yet (has nothing; wave draft reading) | gap:draft reading |
| `missing:coverage:css-unit:mm` | css-unit:mm seen 1 time in the draft: seen but unsupported | gap:draft reading | css-unit:mm has no clone path yet (has nothing; wave draft reading) | gap:draft reading |
| `missing:coverage:html-attr:global.class` | html-attr:global.class seen 43 times in the draft: seen but unsupported | difference | html-attr:global.class is excluded from cloning (Bean, 2026-10-18: class names carry no value of their own: their styles reach the clone through the computed values Fill reads, and the behaviour they drive through the census) | difference |
| `missing:coverage:html-attr:global.inputmode` | html-attr:global.inputmode seen 9 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:global.inputmode has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:global.title` | html-attr:global.title seen 9 times in the draft: seen but unsupported | difference | html-attr:global.title is excluded from cloning (Bean, 2026-10-21: a hover tooltip, not a look; the clone matches the draft's rendered page without it) | difference |
| `missing:coverage:html-attr:input.checked` | html-attr:input.checked seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.checked has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:input.max` | html-attr:input.max seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.max has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:input.min` | html-attr:input.min seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.min has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:input.minlength` | html-attr:input.minlength seen 6 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.minlength has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:input.name` | html-attr:input.name seen 21 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.name has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:input.step` | html-attr:input.step seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.step has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:html-attr:script.type` | html-attr:script.type seen 1 time in the draft: seen but unsupported | difference | html-attr:script.type is excluded from cloning (Bean, 2026-10-19: document plumbing: a WordPress page supplies its own document (head, body, script loading, resource hints)) | difference |
| `missing:coverage:input-type:password` | input-type:password seen 8 times in the draft: seen but unsupported | gap:shop, forms and data | input-type:password has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:input-type:range` | input-type:range seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | input-type:range has no clone path yet (has nothing; wave shop, forms and data) | gap:shop, forms and data |
| `missing:coverage:svg:metadata` | svg:metadata seen 6 times in the draft: seen but unsupported | difference | svg:metadata is excluded from cloning (Bean, 2026-10-21: editor metadata inside an SVG paints nothing, and the media upload strips it (FR-48-58)) | difference |

## Skeleton block choices (skeleton-block)

Accept all: [x]

### Changed since the last export (36)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/19#0` | **changed** header Eye Care Birmingham/19#0 <span> | remove | 1: Bean marked remove in the intake review on 2026-10-26: the element is absorbed into its parent block |  |
| `skeleton:header:Eye Care Birmingham/20#0` | **changed** header Eye Care Birmingham/20#0 <span> | remove | 1: Bean marked remove in the intake review on 2026-10-26: the element is absorbed into its parent block |  |
| `skeleton:page-account:Eye Care Birmingham/923#0` | **changed** page-account Eye Care Birmingham/923#0 <h1> "Hello, Aisha" | block:sgs/heading | 0.75 |  |
| `skeleton:page-account:Eye Care Birmingham/924#0` | **changed** page-account Eye Care Birmingham/924#0 <p> "Signed in as aisha.khan@example.com" | block:sgs/text | 0.75 |  |
| `skeleton:page-contact:Eye Care Birmingham/683#0` | **changed** page-contact Eye Care Birmingham/683#0 <h2> "Or send me a message" | block:sgs/form | 1: a draft form on a page is the saved form post (Spec 42): the page holds the form block linked to it, with no fields of its own, and the form's fields are cloned once on the form's own surface (Bean, 2026-10-25) |  |
| `skeleton:page-contact:Eye Care Birmingham/685#0` | **changed** page-contact Eye Care Birmingham/685#0 <div> | remove | 1: a second element under the form's root: the form is one linked embed, so nothing else of the form stays on the page |  |
| `skeleton:page-contact:Eye Care Birmingham/686#0` | **changed** page-contact Eye Care Birmingham/686#0 <input> | remove | 1: inside a removed element (Eye Care Birmingham/685#0) |  |
| `skeleton:page-contact:Eye Care Birmingham/687#0` | **changed** page-contact Eye Care Birmingham/687#0 <input> | remove | 1: inside a removed element (Eye Care Birmingham/685#0) |  |
| `skeleton:page-contact:Eye Care Birmingham/688#0` | **changed** page-contact Eye Care Birmingham/688#0 <input> | remove | 1: inside a removed element (Eye Care Birmingham/685#0) |  |
| `skeleton:page-contact:Eye Care Birmingham/689#0` | **changed** page-contact Eye Care Birmingham/689#0 <select> | remove | 1: inside a removed element (Eye Care Birmingham/685#0) |  |
| `skeleton:page-contact:Eye Care Birmingham/696#0` | **changed** page-contact Eye Care Birmingham/696#0 <textarea> | remove | 1: a second element under the form's root: the form is one linked embed, so nothing else of the form stays on the page |  |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/3` | **changed** page-home Eye Care Birmingham>Frame Card@139/3 <div> | block:sgs/media | 1: 10 copies of one template element on 3 surfaces |  |
| `skeleton:page-product:Eye Care Birmingham/382` | **changed** page-product Eye Care Birmingham/382 <span> | remove | 1: 4 copies of one template element; Bean marked remove in the intake review on 2026-10-26: the element is absorbed into its parent block |  |
| `skeleton:page-product:Eye Care Birmingham/502#0` | **changed** page-product Eye Care Birmingham/502#0 <section> | remove | 1: Bean marked remove in the intake review on 2026-10-26: the element is absorbed into its parent block |  |
| `skeleton:page-product:Eye Care Birmingham/503#0` | **changed** page-product Eye Care Birmingham/503#0 <div> | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/504#0` | **changed** page-product Eye Care Birmingham/504#0 <div> | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/505#0` | **changed** page-product Eye Care Birmingham/505#0 <h2> "Reviews" | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/506#0` | **changed** page-product Eye Care Birmingham/506#0 <div> | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/507#0` | **changed** page-product Eye Care Birmingham/507#0 <span> "4.9" | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/508#0` | **changed** page-product Eye Care Birmingham/508#0 <span> "out of 5" | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/509#0` | **changed** page-product Eye Care Birmingham/509#0 <div> "★★★★★" | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/510#0` | **changed** page-product Eye Care Birmingham/510#0 <p> "Based on 41 reviews" | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/511#0` | **changed** page-product Eye Care Birmingham/511#0 <div> | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/513` | **changed** page-product Eye Care Birmingham/513 <div> | remove | 1: 5 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/514` | **changed** page-product Eye Care Birmingham/514 <span> "5 ★" | remove | 1: 5 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/515` | **changed** page-product Eye Care Birmingham/515 <span> | remove | 1: 5 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/516` | **changed** page-product Eye Care Birmingham/516 <span> | remove | 1: 5 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/517` | **changed** page-product Eye Care Birmingham/517 <span> "34" | remove | 1: 5 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/518#0` | **changed** page-product Eye Care Birmingham/518#0 <div> | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/520` | **changed** page-product Eye Care Birmingham/520 <figure> | remove | 1: 3 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/521` | **changed** page-product Eye Care Birmingham/521 <div> | remove | 1: 3 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/522` | **changed** page-product Eye Care Birmingham/522 <span> "★★★★★" | remove | 1: 3 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/523` | **changed** page-product Eye Care Birmingham/523 <span> "Verified · prescription lenses" | remove | 1: 3 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/524` | **changed** page-product Eye Care Birmingham/524 <blockquote> "Bought with single vision lenses and the tint matches the originals exactly. Nobody can tell they're prescription." | remove | 1: 3 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/525` | **changed** page-product Eye Care Birmingham/525 <figcaption> "Placeholder review" | remove | 1: 3 copies of one template element; inside a removed element (Eye Care Birmingham/502#0) |  |
| `skeleton:page-product:Eye Care Birmingham/526#0` | **changed** page-product Eye Care Birmingham/526#0 <p> "Placeholder reviews, clearly marked — swap in the real ones whenever you're ready." | remove | 1: inside a removed element (Eye Care Birmingham/502#0) |  |

### Needs a decision (low): block:sgs/business-info (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-help:Eye Care Birmingham/657#0` | page-help Eye Care Birmingham/657#0 <p> "Call the clinic on 0121 729 8233 , or send me a message and I'll get back to you." | block:sgs/business-info | 0.41 | accept |

### Needs a decision (low): block:sgs/card-grid (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mega-menu:Eye Care Birmingham/56#0` | mega-menu Eye Care Birmingham/56#0 <div> | block:sgs/card-grid | 0.5 | accept |

### Needs a decision (low): block:sgs/media (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mobile-menu:Eye Care Birmingham/1194#0` | mobile-menu Eye Care Birmingham/1194#0 <img> | block:sgs/media | 0.29 | accept |
| `skeleton:page-home:Eye Care Birmingham/179#0` | page-home Eye Care Birmingham/179#0 <img> | block:sgs/media | 0.29 | accept |
| `skeleton:page-home:Eye Care Birmingham/200` | page-home Eye Care Birmingham/200 <img> | block:sgs/media | 0.29: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/219#0` | page-home Eye Care Birmingham/219#0 <img> | block:sgs/media | 0.29 | accept |
| `skeleton:page-home:Eye Care Birmingham/245#0` | page-home Eye Care Birmingham/245#0 <img> | block:sgs/media | 0.29 | accept |

### Needs a decision (low): block:sgs/multi-button (14)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1158#0` | footer Eye Care Birmingham/1158#0 <span> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/744#0` | page-checkout Eye Care Birmingham/744#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-contact:Eye Care Birmingham/733#0` | page-contact Eye Care Birmingham/733#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-help:Eye Care Birmingham/643#0` | page-help Eye Care Birmingham/643#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-help:Eye Care Birmingham/658#0` | page-help Eye Care Birmingham/658#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home:Eye Care Birmingham/123#0` | page-home Eye Care Birmingham/123#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home:Eye Care Birmingham/127#0` | page-home Eye Care Birmingham/127#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home:Eye Care Birmingham/187#0` | page-home Eye Care Birmingham/187#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/29` | page-home Eye Care Birmingham>Frame Card@139/29 <div> | block:sgs/multi-button | 0.51: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-product:Eye Care Birmingham/354#0` | page-product Eye Care Birmingham/354#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-product:Eye Care Birmingham/418#0` | page-product Eye Care Birmingham/418#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-shop:Eye Care Birmingham/288#0` | page-shop Eye Care Birmingham/288#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-shop:Eye Care Birmingham/292#0` | page-shop Eye Care Birmingham/292#0 <div> | block:sgs/multi-button | 0.51 | accept |
| `skeleton:page-shop:Eye Care Birmingham/298#0` | page-shop Eye Care Birmingham/298#0 <div> | block:sgs/multi-button | 0.51 | accept |

### Needs a decision (low): block:sgs/quote (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home:Eye Care Birmingham/204` | page-home Eye Care Birmingham/204 <blockquote> "Had a lovely experience taking my daughter here. The optician Fatima is very good with children and made the experience enjoyable for my daughter. The receptionist was also very welcoming." | block:sgs/quote | 0.5: 13 copies of one template element | accept |

### Needs a decision (low): block:sgs/responsive-logo (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/29#0` | header Eye Care Birmingham/29#0 <img> | block:sgs/responsive-logo | 0.66 | accept |

### Needs a decision (low): block:sgs/site-header (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/13#0` | header Eye Care Birmingham/13#0 <header> | block:sgs/site-header | 0.58 | accept |

### Needs a decision (low): block:sgs/social-icons (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home:Eye Care Birmingham/209#0` | page-home Eye Care Birmingham/209#0 <div> | block:sgs/social-icons | 0.51 | accept |

### Needs a decision (low): block:sgs/text (110)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/10` | header Eye Care Birmingham/10 <span> "100% genuine, supplied direct by the brands" | block:sgs/text | 0.25: 8 copies of one template element | accept |
| `skeleton:header:Eye Care Birmingham/47#0` | header Eye Care Birmingham/47#0 <span> "Bag" | block:sgs/text | 0.25 | accept |
| `skeleton:header:Eye Care Birmingham/51#0` | header Eye Care Birmingham/51#0 <span> "0" | block:sgs/text | 0.25 | accept |
| `skeleton:page-about:Eye Care Birmingham/616#0` | page-about Eye Care Birmingham/616#0 <div> "BSc (Hons)" | block:sgs/text | 0.25 | accept |
| `skeleton:page-about:Eye Care Birmingham/619#0` | page-about Eye Care Birmingham/619#0 <div> "MCOptom" | block:sgs/text | 0.25 | accept |
| `skeleton:page-about:Eye Care Birmingham/622#0` | page-about Eye Care Birmingham/622#0 <div> "DipTp(IP)" | block:sgs/text | 0.25 | accept |
| `skeleton:page-about:Eye Care Birmingham/625#0` | page-about Eye Care Birmingham/625#0 <div> "Paediatric Eye Care" | block:sgs/text | 0.25 | accept |
| `skeleton:page-account:Eye Care Birmingham/929=sgs/text` | page-account Eye Care Birmingham/929=sgs/text <span> "Orders" | block:sgs/text | 0.25: 1 copies of one template element | accept |
| `skeleton:page-account:Eye Care Birmingham/930#0` | page-account Eye Care Birmingham/930#0 <span> "3" | block:sgs/text | 0.25 | accept |
| `skeleton:page-account:Eye Care Birmingham/941` | page-account Eye Care Birmingham/941 <span> "EC-10471" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-account:Eye Care Birmingham/942` | page-account Eye Care Birmingham/942 <span> "2 October 2026" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-account:Eye Care Birmingham/943` | page-account Eye Care Birmingham/943 <span> "Oakley Holbrook, with prescription lenses" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-account:Eye Care Birmingham/946` | page-account Eye Care Birmingham/946 <span> "£248" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-checkout:Eye Care Birmingham/754#0` | page-checkout Eye Care Birmingham/754#0 <span> "1" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/772#0` | page-checkout Eye Care Birmingham/772#0 <span> "2" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/776#0` | page-checkout Eye Care Birmingham/776#0 <span> "Post it to me" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/777#0` | page-checkout Eye Care Birmingham/777#0 <span> "Free" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/778#0` | page-checkout Eye Care Birmingham/778#0 <span> "Royal Mail Tracked 48. Free over £75." | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/781#0` | page-checkout Eye Care Birmingham/781#0 <span> "Collect in Birmingham" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/782#0` | page-checkout Eye Care Birmingham/782#0 <span> "Free" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/783#0` | page-checkout Eye Care Birmingham/783#0 <span> "I'll fit and adjust them to you in person." | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/808#0` | page-checkout Eye Care Birmingham/808#0 <span> "3" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/814#0` | page-checkout Eye Care Birmingham/814#0 <span> "Pay now" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/815#0` | page-checkout Eye Care Birmingham/815#0 <span> "£0" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/819#0` | page-checkout Eye Care Birmingham/819#0 <span> "Your bag" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/835#0` | page-checkout Eye Care Birmingham/835#0 <span> "Subtotal" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/836#0` | page-checkout Eye Care Birmingham/836#0 <span> "£0" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/838#0` | page-checkout Eye Care Birmingham/838#0 <span> "Delivery" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/839#0` | page-checkout Eye Care Birmingham/839#0 <span> "Free" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/841#0` | page-checkout Eye Care Birmingham/841#0 <span> "Total" | block:sgs/text | 0.25 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/842#0` | page-checkout Eye Care Birmingham/842#0 <span> "£0" | block:sgs/text | 0.25 | accept |
| `skeleton:page-done:Eye Care Birmingham/846#0` | page-done Eye Care Birmingham/846#0 <div> "✓" | block:sgs/text | 0.25 | accept |
| `skeleton:page-help:Eye Care Birmingham/650` | page-help Eye Care Birmingham/650 <span> "Are these frames genuine?" | block:sgs/text | 0.25: 8 copies of one template element | accept |
| `skeleton:page-help:Eye Care Birmingham/651` | page-help Eye Care Birmingham/651 <span> "+" | block:sgs/text | 0.25: 8 copies of one template element | accept |
| `skeleton:page-help:Eye Care Birmingham/656#0` | page-help Eye Care Birmingham/656#0 <div> "Still not answered?" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/150` | page-home Eye Care Birmingham/150 <div> "01" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/181#0` | page-home Eye Care Birmingham/181#0 <div> "Google Reviews" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/183#0` | page-home Eye Care Birmingham/183#0 <span> "4.7" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/185#0` | page-home Eye Care Birmingham/185#0 <span> "★★★★★" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/186#0` | page-home Eye Care Birmingham/186#0 <span> "15 reviews" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/195` | page-home Eye Care Birmingham/195 <span> "A" | block:sgs/text | 0.25: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/197` | page-home Eye Care Birmingham/197 <span> "Anonymous M." | block:sgs/text | 0.25: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/198` | page-home Eye Care Birmingham/198 <span> "6 reviews" | block:sgs/text | 0.25: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/203` | page-home Eye Care Birmingham/203 <span> "2 years ago" | block:sgs/text | 0.25: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/226#0` | page-home Eye Care Birmingham/226#0 <span> "1" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/228#0` | page-home Eye Care Birmingham/228#0 <span> "2" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/230#0` | page-home Eye Care Birmingham/230#0 <span> "3" | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham/237#0` | page-home Eye Care Birmingham/237#0 <span> "The reception or the consulting room — whichever you'd rather show. No portrait needed." | block:sgs/text | 0.25 | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/21` | page-home Eye Care Birmingham>Frame Card@139/21 <span> "4.9 ( 41 )" | block:sgs/text | 0.25: 27 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/26` | page-home Eye Care Birmingham>Frame Card@139/26 <span> "£139" | block:sgs/text | 0.25: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/28` | page-home Eye Care Birmingham>Frame Card@139/28 <span> "£171" | block:sgs/text | 0.25: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-lenses:Eye Care Birmingham/559#0` | page-lenses Eye Care Birmingham/559#0 <div> "from £59" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/563#0` | page-lenses Eye Care Birmingham/563#0 <div> "from £129" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/567#0` | page-lenses Eye Care Birmingham/567#0 <div> "+£40" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/571#0` | page-lenses Eye Care Birmingham/571#0 <div> "+£30–£100" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/577#0` | page-lenses Eye Care Birmingham/577#0 <li> "UV400 protection" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/578#0` | page-lenses Eye Care Birmingham/578#0 <li> "Anti-scratch hard coat" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/579#0` | page-lenses Eye Care Birmingham/579#0 <li> "Anti-reflective back surface, so you don't catch your own eye in the lens" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/580#0` | page-lenses Eye Care Birmingham/580#0 <li> "Tint matched to the frame's original lenses" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/581#0` | page-lenses Eye Care Birmingham/581#0 <li> "Checked against your prescription by me before it's posted" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/582#0` | page-lenses Eye Care Birmingham/582#0 <li> "Two-year guarantee on the lenses" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/587#0` | page-lenses Eye Care Birmingham/587#0 <span> "1" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/588#0` | page-lenses Eye Care Birmingham/588#0 <span> "Choose a frame and tap “Add my prescription”." | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/590#0` | page-lenses Eye Care Birmingham/590#0 <span> "2" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/591#0` | page-lenses Eye Care Birmingham/591#0 <span> "Pick what they're for, how thin, what finish — all with pictures." | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/593#0` | page-lenses Eye Care Birmingham/593#0 <span> "3" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/594#0` | page-lenses Eye Care Birmingham/594#0 <span> "Send the prescription now, or after you order. I'll remind you." | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/596#0` | page-lenses Eye Care Birmingham/596#0 <span> "4" | block:sgs/text | 0.25 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/597#0` | page-lenses Eye Care Birmingham/597#0 <span> "Made and checked in Birmingham, posted in 7–10 working days — or collect and I'll fit them to you in person." | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/350#0` | page-product Eye Care Birmingham/350#0 <div> "Photography to come front · three-quarter · side · worn" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/366#0` | page-product Eye Care Birmingham/366#0 <span> "4.9 · 41 reviews" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/368#0` | page-product Eye Care Birmingham/368#0 <span> "£139" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/371#0` | page-product Eye Care Birmingham/371#0 <span> "£171" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/378#0` | page-product Eye Care Birmingham/378#0 <span> "Gold" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/383` | page-product Eye Care Birmingham/383 <span> "Gold" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/392` | page-product Eye Care Birmingham/392 <span> "S" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/393` | page-product Eye Care Birmingham/393 <span> "55□14 130" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/396#0` | page-product Eye Care Birmingham/396#0 <span> "Add my prescription" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/397#0` | page-product Eye Care Birmingham/397#0 <span> "from +£59" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/399#0` | page-product Eye Care Birmingham/399#0 <span> "Add to bag as they are" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/400#0` | page-product Eye Care Birmingham/400#0 <span> "£139" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/403#0` | page-product Eye Care Birmingham/403#0 <strong> "Klarna" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/405#0` | page-product Eye Care Birmingham/405#0 <span> "Apple Pay · Google Pay · PayPal" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/410#0` | page-product Eye Care Birmingham/410#0 <span> "Message me on WhatsApp — I'm an optician, and I'm happy to help." | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/414` | page-product Eye Care Birmingham/414 <span> "✓" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/415` | page-product Eye Care Birmingham/415 <span> "Genuine and boxed with the brand's own case, cloth and two-year guarantee." | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/425#0` | page-product Eye Care Birmingham/425#0 <li> "Pilot shape in Metal , Gold" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/426#0` | page-product Eye Care Birmingham/426#0 <li> "Tinted lenses, category 3 , 100% UV400" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/427#0` | page-product Eye Care Birmingham/427#0 <li> "Boxed with the brand's own case, cloth and two-year manufacturer's warranty — claims handled by me, not a call centre" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/428#0` | page-product Eye Care Birmingham/428#0 <li> "Prescription lenses available in this frame — single vision or varifocal" | block:sgs/text | 0.25 | accept |
| `skeleton:page-product:Eye Care Birmingham/497` | page-product Eye Care Birmingham/497 <span> "Will prescription lenses work in these?" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/498` | page-product Eye Care Birmingham/498 <span> "+" | block:sgs/text | 0.25: 4 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/282` | page-shop Eye Care Birmingham/282 <span> "up to £340" | block:sgs/text | 0.25: 3 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham>Frame Card@327/23` | page-shop Eye Care Birmingham>Frame Card@327/23 <span> "No reviews yet" | block:sgs/text | 0.25: 3 copies of one template element on 2 surfaces | accept |
| `skeleton:size-guide:Eye Care Birmingham/1239#0` | size-guide Eye Care Birmingham/1239#0 <span> "Which size am I?" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1245#0` | size-guide Eye Care Birmingham/1245#0 <span> "55" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1246#0` | size-guide Eye Care Birmingham/1246#0 <span> "▫ 18" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1247#0` | size-guide Eye Care Birmingham/1247#0 <span> "137" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1249#0` | size-guide Eye Care Birmingham/1249#0 <span> "Lens width" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1250#0` | size-guide Eye Care Birmingham/1250#0 <span> "Bridge" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1251#0` | size-guide Eye Care Birmingham/1251#0 <span> "Temple" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1254#0` | size-guide Eye Care Birmingham/1254#0 <div> "Lens width — 42 to 62mm" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1257#0` | size-guide Eye Care Birmingham/1257#0 <div> "Bridge — 14 to 24mm" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1260#0` | size-guide Eye Care Birmingham/1260#0 <div> "Temple — 130 to 150mm" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1264#0` | size-guide Eye Care Birmingham/1264#0 <span> "Small" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1265#0` | size-guide Eye Care Birmingham/1265#0 <span> "lens width up to 52mm" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1267#0` | size-guide Eye Care Birmingham/1267#0 <span> "Medium" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1268#0` | size-guide Eye Care Birmingham/1268#0 <span> "53 to 57mm" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1270#0` | size-guide Eye Care Birmingham/1270#0 <span> "Large" | block:sgs/text | 0.25 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1271#0` | size-guide Eye Care Birmingham/1271#0 <span> "58mm and above" | block:sgs/text | 0.25 | accept |

### Settled by rule alignWrapper: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home:Eye Care Birmingham/173#0` | page-home Eye Care Birmingham/173#0 <div> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |
| `skeleton:size-guide:Eye Care Birmingham/1241#0` | size-guide Eye Care Birmingham/1241#0 <div> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) | accept |

### Settled by rule blockOwnedPart: the cart page's bag drawer is the cart block's own drawer (sgs/cart displayMode drawer draws its heading, lines, totals, empty message and checkout button: Spec 27, FR-48-87); the page map holds this surface as the drawer part "Your bag" of the cart row (11)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:bag-drawer:Eye Care Birmingham/1196#0` | bag-drawer Eye Care Birmingham/1196#0 <div> | block:sgs/cart | 1: the cart page's bag drawer is the cart block's own drawer (sgs/cart displayMode drawer draws its heading, lines, totals, empty message and checkout button: Spec 27, FR-48-87); the page map holds this surface as the drawer part "Your bag" of the cart row |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1197#0` | bag-drawer Eye Care Birmingham/1197#0 <div> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1198#0` | bag-drawer Eye Care Birmingham/1198#0 <div> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1199#0` | bag-drawer Eye Care Birmingham/1199#0 <div> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1200#0` | bag-drawer Eye Care Birmingham/1200#0 <span> "Bag" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1201#0` | bag-drawer Eye Care Birmingham/1201#0 <span> "( 0 )" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1202#0` | bag-drawer Eye Care Birmingham/1202#0 <button> "×" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1203#0` | bag-drawer Eye Care Birmingham/1203#0 <div> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1205#0` | bag-drawer Eye Care Birmingham/1205#0 <div> | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1206#0` | bag-drawer Eye Care Birmingham/1206#0 <div> "Nothing in here yet." | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |
| `skeleton:bag-drawer:Eye Care Birmingham/1207#0` | bag-drawer Eye Care Birmingham/1207#0 <button> "Shop sunglasses" | absorbed | 1: drawn by sgs/cart: rule blockOwnedPart |  |

### Settled by rule choiceFlow: a choice flow is the sgs/choice-flow block family (Spec 43 FR-43-1, FR-43-19, FR-43-24, FR-43-26): one sgs/form-step holding an sgs/choice-flow-question per group of options (each option an entry of the question's options), a panel a question opens underneath a step holding its fields and an sgs/choice-flow-result, the add-to-bag control a result step, and the summary, close, skip and continue pieces the flow's own settings; the draft's elements are absorbed into the flow and every element with words or a control the family cannot hold is a gap row (53)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:lens-configurator:Eye Care Birmingham/1283#0` | lens-configurator Eye Care Birmingham/1283#0 <div> | block:sgs/choice-flow | 1: a choice flow is the sgs/choice-flow block family (Spec 43 FR-43-1, FR-43-19, FR-43-24, FR-43-26): one sgs/form-step holding an sgs/choice-flow-question per group of options (each option an entry of the question's options), a panel a question opens underneath a step holding its fields and an sgs/choice-flow-result, the add-to-bag control a result step, and the summary, close, skip and continue pieces the flow's own settings; the draft's elements are absorbed into the flow and every element with words or a control the family cannot hold is a gap row |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1284#0` | lens-configurator Eye Care Birmingham/1284#0 <div> | absorbed | 1: drawn by sgs/choice-flow: the flow header (sgs/choice-flow showHeader, closeLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1285#0` | lens-configurator Eye Care Birmingham/1285#0 <div> | absorbed | 1: drawn by sgs/choice-flow: the flow header (sgs/choice-flow showHeader, closeLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1286#0` | lens-configurator Eye Care Birmingham/1286#0 <img> | absorbed | 1: drawn by sgs/choice-flow: the flow header (sgs/choice-flow showHeader, closeLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1287#0` | lens-configurator Eye Care Birmingham/1287#0 <span> "What they're for" | absorbed | 1: drawn by sgs/choice-flow: the flow header (sgs/choice-flow showHeader, closeLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1288#0` | lens-configurator Eye Care Birmingham/1288#0 <button> "Close" | absorbed | 1: drawn by sgs/choice-flow: the flow header (sgs/choice-flow showHeader, closeLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1289#0` | lens-configurator Eye Care Birmingham/1289#0 <span> "×" | absorbed | 1: drawn by sgs/choice-flow: the flow header (sgs/choice-flow showHeader, closeLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1290#0` | lens-configurator Eye Care Birmingham/1290#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1291#0` | lens-configurator Eye Care Birmingham/1291#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1292#0` | lens-configurator Eye Care Birmingham/1292#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1293#0` | lens-configurator Eye Care Birmingham/1293#0 <aside> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1294#0` | lens-configurator Eye Care Birmingham/1294#0 <div> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1298#0` | lens-configurator Eye Care Birmingham/1298#0 <div> "Ray-Ban" | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1301#0` | lens-configurator Eye Care Birmingham/1301#0 <div> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1302#0` | lens-configurator Eye Care Birmingham/1302#0 <div> "Ray-Ban" | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1303#0` | lens-configurator Eye Care Birmingham/1303#0 <div> "Aviator Classic" | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1304#0` | lens-configurator Eye Care Birmingham/1304#0 <div> "Gold · Size M" | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1306#0` | lens-configurator Eye Care Birmingham/1306#0 <div> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1308` | lens-configurator Eye Care Birmingham/1308 <div> | absorbed | 1: 2 copies of one template element; drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1309` | lens-configurator Eye Care Birmingham/1309 <span> "Frame" | absorbed | 1: 2 copies of one template element; drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1310` | lens-configurator Eye Care Birmingham/1310 <span> "£139" | absorbed | 1: 2 copies of one template element; drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1311#0` | lens-configurator Eye Care Birmingham/1311#0 <div> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1312#0` | lens-configurator Eye Care Birmingham/1312#0 <span> "Total" | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1313#0` | lens-configurator Eye Care Birmingham/1313#0 <span> "£139" | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1315#0` | lens-configurator Eye Care Birmingham/1315#0 <a> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1316#0` | lens-configurator Eye Care Birmingham/1316#0 <span> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1317#0` | lens-configurator Eye Care Birmingham/1317#0 <img> | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1318#0` | lens-configurator Eye Care Birmingham/1318#0 <span> "Not sure which to pick?" | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1319#0` | lens-configurator Eye Care Birmingham/1319#0 <span> "Happy to talk it through — message me and we'll choose together." | absorbed | 1: drawn by sgs/choice-flow: the flow summary (sgs/choice-flow showPricePanel, FR-43-19) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1320#0` | lens-configurator Eye Care Birmingham/1320#0 <div> | absorbed | 1: drawn by sgs/choice-flow: rule choiceFlow |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1322#0` | lens-configurator Eye Care Birmingham/1322#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1323#0` | lens-configurator Eye Care Birmingham/1323#0 <p> "Question 1 of 3" | absorbed | 1: drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1324#0` | lens-configurator Eye Care Birmingham/1324#0 <h2> "What will you use them for?" | absorbed | 1: drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1325#0` | lens-configurator Eye Care Birmingham/1325#0 <p> "Your prescription tells you which. If there's an “ADD” column on it, varifocal is probably what you're after." | absorbed | 1: drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1326#0` | lens-configurator Eye Care Birmingham/1326#0 <div> | absorbed | 1: drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1328` | lens-configurator Eye Care Birmingham/1328 <div> | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1329` | lens-configurator Eye Care Birmingham/1329 <button> | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1330` | lens-configurator Eye Care Birmingham/1330 <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1331` | lens-configurator Eye Care Birmingham/1331 <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1336` | lens-configurator Eye Care Birmingham/1336 <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1337` | lens-configurator Eye Care Birmingham/1337 <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1338` | lens-configurator Eye Care Birmingham/1338 <span> "Distance" | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1339` | lens-configurator Eye Care Birmingham/1339 <span> "from £59" | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1340` | lens-configurator Eye Care Birmingham/1340 <span> "Driving, walking about, everyday wear." | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1341` | lens-configurator Eye Care Birmingham/1341 <button> "?" | absorbed | 1: 4 copies of one template element; drawn by sgs/choice-flow: question 1 "What will you use them for?", sgs/choice-flow-question |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1432#0` | lens-configurator Eye Care Birmingham/1432#0 <a> | absorbed | 1: drawn by sgs/choice-flow: the summary's help note, shown again where the summary collapses (sgs/choice-flow stageNote) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1433#0` | lens-configurator Eye Care Birmingham/1433#0 <span> | absorbed | 1: drawn by sgs/choice-flow: the summary's help note, shown again where the summary collapses (sgs/choice-flow stageNote) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1434#0` | lens-configurator Eye Care Birmingham/1434#0 <img> | absorbed | 1: drawn by sgs/choice-flow: the summary's help note, shown again where the summary collapses (sgs/choice-flow stageNote) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1435#0` | lens-configurator Eye Care Birmingham/1435#0 <span> "Not sure which to pick?" | absorbed | 1: drawn by sgs/choice-flow: the summary's help note, shown again where the summary collapses (sgs/choice-flow stageNote) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1436#0` | lens-configurator Eye Care Birmingham/1436#0 <span> "Happy to talk it through — message me and we'll choose together." | absorbed | 1: drawn by sgs/choice-flow: the summary's help note, shown again where the summary collapses (sgs/choice-flow stageNote) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1437#0` | lens-configurator Eye Care Birmingham/1437#0 <div> | absorbed | 1: drawn by sgs/choice-flow: the flow footer and its skip link (sgs/choice-flow skipPrompt, skipLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1441#0` | lens-configurator Eye Care Birmingham/1441#0 <span> "Frame only?" | absorbed | 1: drawn by sgs/choice-flow: the flow footer and its skip link (sgs/choice-flow skipPrompt, skipLabel) |  |
| `skeleton:lens-configurator:Eye Care Birmingham/1442#0` | lens-configurator Eye Care Birmingham/1442#0 <button> "Skip the lenses" | absorbed | 1: drawn by sgs/choice-flow: the flow footer and its skip link (sgs/choice-flow skipPrompt, skipLabel) |  |

### Settled by rule columnHeading: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1138#0` | footer Eye Care Birmingham/1138#0 <span> "Shop" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style | accept |
| `skeleton:footer:Eye Care Birmingham/1144#0` | footer Eye Care Birmingham/1144#0 <span> "Help" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style | accept |
| `skeleton:footer:Eye Care Birmingham/1150#0` | footer Eye Care Birmingham/1150#0 <span> "Visit or call" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style | accept |

### Settled by rule decorationLayer: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home:Eye Care Birmingham/117#0` | page-home Eye Care Birmingham/117#0 <div> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home:Eye Care Birmingham/118#0` | page-home Eye Care Birmingham/118#0 <div> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-home:Eye Care Birmingham/164=remove` | page-home Eye Care Birmingham/164=remove <span> | remove | 1: 2 copies of one template element; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:page-shop:Eye Care Birmingham/318#0` | page-shop Eye Care Birmingham/318#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |
| `skeleton:size-guide:Eye Care Birmingham/1236#0` | size-guide Eye Care Birmingham/1236#0 <div> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in | accept |

### Settled by rule dotMarker: a small dot or short bar that holds nothing, is no control and sits beside text is the marker of the block holding the text (a label's dot, a list item's marker, the separator between a row's items); stacked rows of a marker and one piece of text are one list (Bean, 2026-10-19) (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-product:Eye Care Birmingham/374#0` | page-product Eye Care Birmingham/374#0 <span> | remove | 1: a small dot or short bar that holds nothing, is no control and sits beside text is the marker of the block holding the text (a label's dot, a list item's marker, the separator between a row's items); stacked rows of a marker and one piece of text are one list (Bean, 2026-10-19) | accept |

### Settled by rule drawsChildren: the block each sits in draws it (each row's reason names that block) (14)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mega-menu:Eye Care Birmingham/57#0` | mega-menu Eye Care Birmingham/57#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/58#0` | mega-menu Eye Care Birmingham/58#0 <div> "By style" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/59#0` | mega-menu Eye Care Birmingham/59#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/61` | mega-menu Eye Care Birmingham/61 <a> "Pilot" | absorbed | 1: 12 copies of one template element; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/62#0` | mega-menu Eye Care Birmingham/62#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/63#0` | mega-menu Eye Care Birmingham/63#0 <div> "Shop by" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/64#0` | mega-menu Eye Care Birmingham/64#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/66` | mega-menu Eye Care Birmingham/66 <a> "Best sellers" | absorbed | 1: 6 copies of one template element; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/67#0` | mega-menu Eye Care Birmingham/67#0 <a> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/68#0` | mega-menu Eye Care Birmingham/68#0 <span> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/69#0` | mega-menu Eye Care Birmingham/69#0 <span> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/70#0` | mega-menu Eye Care Birmingham/70#0 <span> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/71#0` | mega-menu Eye Care Birmingham/71#0 <span> "Prescription sunglasses" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |
| `skeleton:mega-menu:Eye Care Birmingham/72#0` | mega-menu Eye Care Birmingham/72#0 <span> "Any frame here, from £59" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute | accept |

### Settled by rule footerSlots: the columns row of the footer (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1125#0` | footer Eye Care Birmingham/1125#0 <div> | block:sgs/site-footer-row | 1: the columns row of the footer | accept |
| `skeleton:footer:Eye Care Birmingham/1156#0` | footer Eye Care Birmingham/1156#0 <div> | block:sgs/site-footer-row | 1: the bottom row of the footer | accept |

### Settled by rule formControl: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) (38)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:contact-form:Eye Care Birmingham/686#0` | contact-form Eye Care Birmingham/686#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) |  |
| `skeleton:contact-form:Eye Care Birmingham/687#0` | contact-form Eye Care Birmingham/687#0 <input> | block:sgs/form-field-email | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) |  |
| `skeleton:contact-form:Eye Care Birmingham/688#0` | contact-form Eye Care Birmingham/688#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) |  |
| `skeleton:contact-form:Eye Care Birmingham/689#0` | contact-form Eye Care Birmingham/689#0 <select> | block:sgs/form-field-select | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) |  |
| `skeleton:contact-form:Eye Care Birmingham/696#0` | contact-form Eye Care Birmingham/696#0 <textarea> | block:sgs/form-field-textarea | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) |  |
| `skeleton:contact-form:Eye Care Birmingham/697#0` | contact-form Eye Care Birmingham/697#0 <div> | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/756#0` | page-checkout Eye Care Birmingham/756#0 <input> | block:sgs/form-field-email | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/757#0` | page-checkout Eye Care Birmingham/757#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/760#0` | page-checkout Eye Care Birmingham/760#0 <label> | unwrap | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/761#0` | page-checkout Eye Care Birmingham/761#0 <input> | block:sgs/form-field-checkbox | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/762#0` | page-checkout Eye Care Birmingham/762#0 <span> "Create an account" | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/786#0` | page-checkout Eye Care Birmingham/786#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/787#0` | page-checkout Eye Care Birmingham/787#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/788#0` | page-checkout Eye Care Birmingham/788#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/789#0` | page-checkout Eye Care Birmingham/789#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/790#0` | page-checkout Eye Care Birmingham/790#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/810#0` | page-checkout Eye Care Birmingham/810#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/811#0` | page-checkout Eye Care Birmingham/811#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/812#0` | page-checkout Eye Care Birmingham/812#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-shop:Eye Care Birmingham/254#0` | page-shop Eye Care Birmingham/254#0 <span> "16 frames" | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:page-shop:Eye Care Birmingham/257#0` | page-shop Eye Care Birmingham/257#0 <select> | block:sgs/form-field-select | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-shop:Eye Care Birmingham/302#0` | page-shop Eye Care Birmingham/302#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-shop:Eye Care Birmingham/303#0` | page-shop Eye Care Birmingham/303#0 <div> | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:page-shop:Eye Care Birmingham/307#0` | page-shop Eye Care Birmingham/307#0 <input> | block:sgs/form-field-text | 1: a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-shop:Eye Care Birmingham/308#0` | page-shop Eye Care Birmingham/308#0 <div> | remove | 1: the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/867#0` | page-signin Eye Care Birmingham/867#0 <label> "Email" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/868#0` | page-signin Eye Care Birmingham/868#0 <input> | block:sgs/form-field-email | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/869#0` | page-signin Eye Care Birmingham/869#0 <label> "Password" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/870#0` | page-signin Eye Care Birmingham/870#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/872#0` | page-signin Eye Care Birmingham/872#0 <label> "Keep me signed in" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/873#0` | page-signin Eye Care Birmingham/873#0 <input> | block:sgs/form-field-checkbox | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/878#0` | page-signin Eye Care Birmingham/878#0 <label> "First name" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/879#0` | page-signin Eye Care Birmingham/879#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/880#0` | page-signin Eye Care Birmingham/880#0 <label> "Email" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/881#0` | page-signin Eye Care Birmingham/881#0 <input> | block:sgs/form-field-email | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/882#0` | page-signin Eye Care Birmingham/882#0 <label> "Password" | unwrap | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/883#0` | page-signin Eye Care Birmingham/883#0 <input> | block:sgs/form-field-text | 1: 2 copies of one template element on 2 surfaces; a form control is the SGS field block for its rendered type (a required checkbox with no other checkbox in its group is the consent field; a type with no field of its own is a text field; submit, reset and image inputs are buttons); its label, required marker and hint become that block's label, required and help text; a <label> wrapped round it goes (Bean, 2026-10-19) | accept |
| `skeleton:page-signin:Eye Care Birmingham/884#0` | page-signin Eye Care Birmingham/884#0 <span> "8 characters or more" | remove | 1: 2 copies of one template element on 2 surfaces; the field's label, required marker, hint or character count: the field block's own label, required and help text settings draw it (Bean, 2026-10-19) | accept |

### Settled by rule formHost: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part (4)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:contact-form:Eye Care Birmingham/682#0` | contact-form Eye Care Birmingham/682#0 <form> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:page-signin:Eye Care Birmingham/865#0` | page-signin Eye Care Birmingham/865#0 <form> | block:sgs/form | 1: 2 copies of one template element on 2 surfaces; a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:page-signin:Eye Care Birmingham/876#0` | page-signin Eye Care Birmingham/876#0 <form> | block:sgs/form | 1: 2 copies of one template element on 2 surfaces; a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |
| `skeleton:sign-in-and-register-forms:Eye Care Birmingham/856#0` | sign-in-and-register-forms Eye Care Birmingham/856#0 <main> | block:sgs/form | 1: a draft <form> element is the sgs/form block, whose fields sit inside it and whose field settings (border, background, padding, font) paint every field's input part | accept |

### Settled by rule formLink: a second element under the form's root: the form is one linked embed, so nothing else of the form stays on the page (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-contact:Eye Care Birmingham/684#0` | page-contact Eye Care Birmingham/684#0 <p> "I answer these myself, usually the same day." | remove | 1: 2 copies of one template element on 2 surfaces; a second element under the form's root: the form is one linked embed, so nothing else of the form stays on the page | accept |

### Settled by rule headerSlots: a strip above the header's main bar is its top row (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/7#0` | header Eye Care Birmingham/7#0 <div> | block:sgs/site-header-row | 1: a strip above the header's main bar is its top row | accept |

### Settled by rule hero: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) (7)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Eye Care Birmingham/602#0` | page-about Eye Care Birmingham/602#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-account:Eye Care Birmingham/920#0` | page-account Eye Care Birmingham/920#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-contact:Eye Care Birmingham/663#0` | page-contact Eye Care Birmingham/663#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-home:Eye Care Birmingham/114#0` | page-home Eye Care Birmingham/114#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-product:Eye Care Birmingham/342#0` | page-product Eye Care Birmingham/342#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-shop:Eye Care Birmingham/249#0` | page-shop Eye Care Birmingham/249#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |
| `skeleton:page-signin:Eye Care Birmingham/858#0` | page-signin Eye Care Birmingham/858#0 <div> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) | accept |

### Settled by rule heroInner: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays (32)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Eye Care Birmingham/603#0` | page-about Eye Care Birmingham/603#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-about:Eye Care Birmingham/610#0` | page-about Eye Care Birmingham/610#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-about:Eye Care Birmingham/612#0` | page-about Eye Care Birmingham/612#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-about:Eye Care Birmingham/614#0` | page-about Eye Care Birmingham/614#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-about:Eye Care Birmingham/615#0` | page-about Eye Care Birmingham/615#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-about:Eye Care Birmingham/618#0` | page-about Eye Care Birmingham/618#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-about:Eye Care Birmingham/621#0` | page-about Eye Care Birmingham/621#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-about:Eye Care Birmingham/624#0` | page-about Eye Care Birmingham/624#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-account:Eye Care Birmingham/921#0` | page-account Eye Care Birmingham/921#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact:Eye Care Birmingham/664#0` | page-contact Eye Care Birmingham/664#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact:Eye Care Birmingham/669#0` | page-contact Eye Care Birmingham/669#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact:Eye Care Birmingham/671#0` | page-contact Eye Care Birmingham/671#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact:Eye Care Birmingham/682#0` | page-contact Eye Care Birmingham/682#0 <form> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact:Eye Care Birmingham/697#0` | page-contact Eye Care Birmingham/697#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact:Eye Care Birmingham/701#0` | page-contact Eye Care Birmingham/701#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-contact:Eye Care Birmingham/702#0` | page-contact Eye Care Birmingham/702#0 <a> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home:Eye Care Birmingham/115#0` | page-home Eye Care Birmingham/115#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home:Eye Care Birmingham/116#0` | page-home Eye Care Birmingham/116#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-home:Eye Care Birmingham/119#0` | page-home Eye Care Birmingham/119#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/343#0` | page-product Eye Care Birmingham/343#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/348#0` | page-product Eye Care Birmingham/348#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/360#0` | page-product Eye Care Birmingham/360#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/375#0` | page-product Eye Care Birmingham/375#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/381` | page-product Eye Care Birmingham/381 <button> | unwrap | 1: 4 copies of one template element; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/385#0` | page-product Eye Care Birmingham/385#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/391` | page-product Eye Care Birmingham/391 <button> | unwrap | 1: 3 copies of one template element; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/394#0` | page-product Eye Care Birmingham/394#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/406#0` | page-product Eye Care Birmingham/406#0 <a> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/407#0` | page-product Eye Care Birmingham/407#0 <span> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/408#0` | page-product Eye Care Birmingham/408#0 <img> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-product:Eye Care Birmingham/411#0` | page-product Eye Care Birmingham/411#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |
| `skeleton:page-shop:Eye Care Birmingham/250#0` | page-shop Eye Care Birmingham/250#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays | accept |

### Settled by rule hoursRows: a day and its opening times laid out as a row is sgs/business-info's hours display (rows layout); the day and time columns are drawn by it (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-contact:Eye Care Birmingham/679#0` | page-contact Eye Care Birmingham/679#0 <div> "Mon–Sat 9.30–17.30 Collections by arrangement" | block:sgs/business-info | 1: a day and its opening times laid out as a row is sgs/business-info's hours display (rows layout); the day and time columns are drawn by it | accept |
| `skeleton:page-contact:Eye Care Birmingham/680#0` | page-contact Eye Care Birmingham/680#0 <div> "Hours" | absorbed | 1: drawn by sgs/business-info: rule hoursRows | accept |

### Settled by rule label: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number (45)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/21#0` | header Eye Care Birmingham/21#0 <span> "Menu" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1167#0` | mobile-menu Eye Care Birmingham/1167#0 <span> "EYE CARE" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-about:Eye Care Birmingham/604#0` | page-about Eye Care Birmingham/604#0 <p> "About Eye Care" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-account:Eye Care Birmingham/922#0` | page-account Eye Care Birmingham/922#0 <p> "My account" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-account:Eye Care Birmingham/944` | page-account Eye Care Birmingham/944 <span> "Lenses being made" | block:sgs/label | 1: 3 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-checkout:Eye Care Birmingham/749#0` | page-checkout Eye Care Birmingham/749#0 <div> "or pay by card" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-checkout:Eye Care Birmingham/750#0` | page-checkout Eye Care Birmingham/750#0 <span> | absorbed | 1: drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/751#0` | page-checkout Eye Care Birmingham/751#0 <span> | absorbed | 1: drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) | accept |
| `skeleton:page-contact:Eye Care Birmingham/665#0` | page-contact Eye Care Birmingham/665#0 <p> "Contact" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-contact:Eye Care Birmingham/672#0` | page-contact Eye Care Birmingham/672#0 <div> "Phone" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-contact:Eye Care Birmingham/675#0` | page-contact Eye Care Birmingham/675#0 <div> "Email" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-contact:Eye Care Birmingham/677#0` | page-contact Eye Care Birmingham/677#0 <div> "Clinic" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-contact:Eye Care Birmingham/731#0` | page-contact Eye Care Birmingham/731#0 <span> "Directions" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help:Eye Care Birmingham/629#0` | page-help Eye Care Birmingham/629#0 <p> "Help" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help:Eye Care Birmingham/633#0` | page-help Eye Care Birmingham/633#0 <div> "UK delivery" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help:Eye Care Birmingham/636#0` | page-help Eye Care Birmingham/636#0 <div> "Collect in Birmingham" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-help:Eye Care Birmingham/639#0` | page-help Eye Care Birmingham/639#0 <div> "Returns" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/133#0` | page-home Eye Care Birmingham/133#0 <p> "Moving fastest this month" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/144#0` | page-home Eye Care Birmingham/144#0 <p> "Why buy from me" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/166` | page-home Eye Care Birmingham/166 <span> "Photo to come" | block:sgs/label | 1: 2 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/170=sgs/label` | page-home Eye Care Birmingham/170=sgs/label <span> "Pilot" | block:sgs/label | 1: 2 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/174#0` | page-home Eye Care Birmingham/174#0 <p> "From the clinic" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/202` | page-home Eye Care Birmingham/202 <span> "★★★★★" | block:sgs/label | 1: 13 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/221#0` | page-home Eye Care Birmingham/221#0 <p> "Prescription sunglasses" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham/236#0` | page-home Eye Care Birmingham/236#0 <span> "Photo of the clinic" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/17` | page-home Eye Care Birmingham>Frame Card@139/17 <span> "Polarised" | block:sgs/label | 1: 7 copies of one template element on 3 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/20` | page-home Eye Care Birmingham>Frame Card@139/20 <span> "★★★★★" | block:sgs/label | 1: 27 copies of one template element on 4 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/6` | page-home Eye Care Birmingham>Frame Card@139/6 <span> "Photo to come" | block:sgs/label | 1: 20 copies of one template element on 3 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/7` | page-home Eye Care Birmingham>Frame Card@139/7 <span> "Ray-Ban" | block:sgs/label | 1: 30 copies of one template element on 4 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/9` | page-home Eye Care Birmingham>Frame Card@139/9 <span> "Save £32" | block:sgs/label | 1: 30 copies of one template element on 4 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-lenses:Eye Care Birmingham/553#0` | page-lenses Eye Care Birmingham/553#0 <p> "Prescription lenses" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-lenses:Eye Care Birmingham/558#0` | page-lenses Eye Care Birmingham/558#0 <div> "Single vision" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-lenses:Eye Care Birmingham/562#0` | page-lenses Eye Care Birmingham/562#0 <div> "Varifocal" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-lenses:Eye Care Birmingham/566#0` | page-lenses Eye Care Birmingham/566#0 <div> "Polarised" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-lenses:Eye Care Birmingham/570#0` | page-lenses Eye Care Birmingham/570#0 <div> "Thinner lenses" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product:Eye Care Birmingham/349#0` | page-product Eye Care Birmingham/349#0 <div> "Ray-Ban" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product:Eye Care Birmingham/353#0` | page-product Eye Care Birmingham/353#0 <span> "Save £32 off RRP" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product:Eye Care Birmingham/365#0` | page-product Eye Care Birmingham/365#0 <span> "★★★★★" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product:Eye Care Birmingham/372#0` | page-product Eye Care Birmingham/372#0 <span> "You save £32" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product:Eye Care Birmingham/377#0` | page-product Eye Care Birmingham/377#0 <span> "Colour" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-product:Eye Care Birmingham/387#0` | page-product Eye Care Birmingham/387#0 <span> "Size" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-shop:Eye Care Birmingham/251#0` | page-shop Eye Care Birmingham/251#0 <p> "Shop" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-shop:Eye Care Birmingham/280` | page-shop Eye Care Birmingham/280 <span> "Gender" | block:sgs/label | 1: 10 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-shop:Eye Care Birmingham/316#0` | page-shop Eye Care Birmingham/316#0 <span> "Polarised only" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |
| `skeleton:page-signin:Eye Care Birmingham/859#0` | page-signin Eye Care Birmingham/859#0 <p> "Your account" | block:sgs/label | 1: 2 copies of one template element on 2 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number | accept |

### Settled by rule logoGrid: a group of three or more links that each hold only an image (a logo wall) is sgs/gallery with a link per image; the links are its items (7)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1130#0` | footer Eye Care Birmingham/1130#0 <div> | block:sgs/gallery | 1: a group of three or more links that each hold only an image (a logo wall) is sgs/gallery with a link per image; the links are its items | accept |
| `skeleton:footer:Eye Care Birmingham/1131#0` | footer Eye Care Birmingham/1131#0 <a> | absorbed | 1: drawn by sgs/gallery: rule logoGrid | accept |
| `skeleton:footer:Eye Care Birmingham/1132#0` | footer Eye Care Birmingham/1132#0 <img> | absorbed | 1: drawn by sgs/gallery: rule logoGrid | accept |
| `skeleton:footer:Eye Care Birmingham/1133#0` | footer Eye Care Birmingham/1133#0 <a> | absorbed | 1: drawn by sgs/gallery: rule logoGrid | accept |
| `skeleton:footer:Eye Care Birmingham/1134#0` | footer Eye Care Birmingham/1134#0 <img> | absorbed | 1: drawn by sgs/gallery: rule logoGrid | accept |
| `skeleton:footer:Eye Care Birmingham/1135#0` | footer Eye Care Birmingham/1135#0 <a> | absorbed | 1: drawn by sgs/gallery: rule logoGrid | accept |
| `skeleton:footer:Eye Care Birmingham/1136#0` | footer Eye Care Birmingham/1136#0 <img> | absorbed | 1: drawn by sgs/gallery: rule logoGrid | accept |

### Settled by rule navigation: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu (17)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/15#0` | header Eye Care Birmingham/15#0 <nav> | block:sgs/nav-bar-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu | accept |
| `skeleton:header:Eye Care Birmingham/23#0` | header Eye Care Birmingham/23#0 <a> "Sunglasses" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:header:Eye Care Birmingham/24#0` | header Eye Care Birmingham/24#0 <a> "Brands" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:header:Eye Care Birmingham/25#0` | header Eye Care Birmingham/25#0 <a> "Lenses" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:header:Eye Care Birmingham/26#0` | header Eye Care Birmingham/26#0 <span> "Glasses" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:header:Eye Care Birmingham/27#0` | header Eye Care Birmingham/27#0 <span> "SOON" | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1169#0` | mobile-menu Eye Care Birmingham/1169#0 <nav> | block:sgs/nav-drawer-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1170#0` | mobile-menu Eye Care Birmingham/1170#0 <a> "Sunglasses" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1171#0` | mobile-menu Eye Care Birmingham/1171#0 <a> "Brands" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1172#0` | mobile-menu Eye Care Birmingham/1172#0 <a> "Prescription lenses" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1173#0` | mobile-menu Eye Care Birmingham/1173#0 <span> "Glasses" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1174#0` | mobile-menu Eye Care Birmingham/1174#0 <span> "SOON" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1175#0` | mobile-menu Eye Care Birmingham/1175#0 <nav> | block:sgs/nav-drawer-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1176#0` | mobile-menu Eye Care Birmingham/1176#0 <a> "About Eye Care" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1177#0` | mobile-menu Eye Care Birmingham/1177#0 <a> "Delivery, returns & FAQs" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1178#0` | mobile-menu Eye Care Birmingham/1178#0 <button> "Size guide" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1179#0` | mobile-menu Eye Care Birmingham/1179#0 <a> "Contact" | absorbed | 1: drawn by sgs/nav-drawer-menu: rule navigation | accept |

### Settled by rule pillButton: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link (19)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Eye Care Birmingham/1161#0` | footer Eye Care Birmingham/1161#0 <a> | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:footer:Eye Care Birmingham/1162#0` | footer Eye Care Birmingham/1162#0 <img> | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:footer:Eye Care Birmingham/1163#0` | footer Eye Care Birmingham/1163#0 <span> "Ask me anything" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-account:Eye Care Birmingham/928=sgs/button` | page-account Eye Care Birmingham/928=sgs/button <button> | block:sgs/button | 1: 4 copies of one template element; a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-account:Eye Care Birmingham/929=absorbed` | page-account Eye Care Birmingham/929=absorbed <span> "Subscriptions" | absorbed | 1: 4 copies of one template element; drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-contact:Eye Care Birmingham/734#0` | page-contact Eye Care Birmingham/734#0 <a> "Reviews & hours" | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-contact:Eye Care Birmingham/735#0` | page-contact Eye Care Birmingham/735#0 <span> "Google" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-contact:Eye Care Birmingham/736#0` | page-contact Eye Care Birmingham/736#0 <a> "@eyecare.birmingham" | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-contact:Eye Care Birmingham/737#0` | page-contact Eye Care Birmingham/737#0 <span> "Instagram" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-home:Eye Care Birmingham/161=sgs/button` | page-home Eye Care Birmingham/161=sgs/button <button> | block:sgs/button | 1: 4 copies of one template element; a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:page-home:Eye Care Birmingham/163` | page-home Eye Care Birmingham/163 <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-home:Eye Care Birmingham/164=absorbed` | page-home Eye Care Birmingham/164=absorbed <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-home:Eye Care Birmingham/167=absorbed` | page-home Eye Care Birmingham/167=absorbed <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/button: rule pillButton | accept |
| `skeleton:page-home:Eye Care Birmingham/170=absorbed` | page-home Eye Care Birmingham/170=absorbed <span> "Wayfarer" | absorbed | 1: 4 copies of one template element; drawn by sgs/button: rule pillButton | accept |
| `skeleton:size-guide:Eye Care Birmingham/1272#0` | size-guide Eye Care Birmingham/1272#0 <a> | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link | accept |
| `skeleton:size-guide:Eye Care Birmingham/1273#0` | size-guide Eye Care Birmingham/1273#0 <span> | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:size-guide:Eye Care Birmingham/1274#0` | size-guide Eye Care Birmingham/1274#0 <img> | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:size-guide:Eye Care Birmingham/1275#0` | size-guide Eye Care Birmingham/1275#0 <span> "Can't find the numbers?" | absorbed | 1: drawn by sgs/button: rule pillButton | accept |
| `skeleton:size-guide:Eye Care Birmingham/1276#0` | size-guide Eye Care Birmingham/1276#0 <span> "Send me a photo of the inside of the arm and I'll read it for you." | absorbed | 1: drawn by sgs/button: rule pillButton | accept |

### Settled by rule siteInfoLink: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself (4)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/35#0` | header Eye Care Birmingham/35#0 <a> "0121 729 8233" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1181#0` | mobile-menu Eye Care Birmingham/1181#0 <a> "0121 729 8233" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself | accept |
| `skeleton:page-contact:Eye Care Birmingham/673#0` | page-contact Eye Care Birmingham/673#0 <a> "0121 729 8233" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself | accept |
| `skeleton:page-help:Eye Care Birmingham/660#0` | page-help Eye Care Birmingham/660#0 <a> "Call" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself | accept |

### Settled by rule solitaryIcon: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/40#0` | header Eye Care Birmingham/40#0 <button> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |
| `skeleton:page-home:Eye Care Birmingham/210#0` | page-home Eye Care Birmingham/210#0 <button> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |
| `skeleton:page-home:Eye Care Birmingham/213#0` | page-home Eye Care Birmingham/213#0 <button> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/10` | page-home Eye Care Birmingham>Frame Card@139/10 <button> | block:sgs/icon | 1: 30 copies of one template element on 4 surfaces; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |
| `skeleton:page-shop:Eye Care Birmingham/281=sgs/icon` | page-shop Eye Care Birmingham/281=sgs/icon <span> | block:sgs/icon | 1: 7 copies of one template element; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text | accept |

### Settled by rule surfaceRoot: a menu surface (the panel a navigation item opens) is sgs/mega-panel (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mega-menu:Eye Care Birmingham/53#0` | mega-menu Eye Care Birmingham/53#0 <div> | block:sgs/mega-panel | 1: a menu surface (the panel a navigation item opens) is sgs/mega-panel | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1165#0` | mobile-menu Eye Care Birmingham/1165#0 <div> | block:sgs/nav-drawer | 1: a drawer surface is sgs/nav-drawer, whose own settings draw its top row, logo, close button and body | accept |

### Settled by rule typedDivider: a typed divider between items is the row's separators setting, not a block (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-product:Eye Care Birmingham/338#0` | page-product Eye Care Birmingham/338#0 <span> "/" | remove | 1: a typed divider between items is the row's separators setting, not a block | accept |
| `skeleton:page-product:Eye Care Birmingham/340#0` | page-product Eye Care Birmingham/340#0 <span> "/" | remove | 1: a typed divider between items is the row's separators setting, not a block | accept |
| `skeleton:page-product:Eye Care Birmingham/404#0` | page-product Eye Care Birmingham/404#0 <span> "·" | remove | 1: a typed divider between items is the row's separators setting, not a block | accept |

### Settled by rule wholeCardLink: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/28#0` | header Eye Care Birmingham/28#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/1` | page-home Eye Care Birmingham>Frame Card@139/1 <a> | block:sgs/container | 1: 30 copies of one template element on 4 surfaces; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) | accept |

### Settled by rule widthWrapper: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:header:Eye Care Birmingham/8#0` | header Eye Care Birmingham/8#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there | accept |
| `skeleton:mega-menu:Eye Care Birmingham/54#0` | mega-menu Eye Care Birmingham/54#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place, and the wrapper is the draft element of the calibrated slot of the block's hostSetting, so its width, layout and gaps are read there | accept |

### Confident proposals (Accept all covers these) (360)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:contact-form:Eye Care Birmingham/683#0` | contact-form Eye Care Birmingham/683#0 <h2> "Or send me a message" | block:sgs/heading | 0.75 |  |
| `skeleton:contact-form:Eye Care Birmingham/685#0` | contact-form Eye Care Birmingham/685#0 <div> | block:sgs/container | 1 |  |
| `skeleton:contact-form:Eye Care Birmingham/698#0` | contact-form Eye Care Birmingham/698#0 <button> "Send message" | remove | 1: inside a removed element (Eye Care Birmingham/697#0) | accept |
| `skeleton:footer:Eye Care Birmingham/1124#0` | footer Eye Care Birmingham/1124#0 <footer> | block:sgs/site-footer | 1 | accept |
| `skeleton:footer:Eye Care Birmingham/1126#0` | footer Eye Care Birmingham/1126#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:footer:Eye Care Birmingham/1127#0` | footer Eye Care Birmingham/1127#0 <div> "EYE CARE" | block:sgs/responsive-logo | 0.8 | accept |
| `skeleton:footer:Eye Care Birmingham/1128#0` | footer Eye Care Birmingham/1128#0 <div> "BIRMINGHAM" | absorbed | 0.8: part of the typed brand name; the logo block carries it | accept |
| `skeleton:footer:Eye Care Birmingham/1129#0` | footer Eye Care Birmingham/1129#0 <p> "Designer eyewear from an independent optician in Birmingham." | block:sgs/text | 0.75 | accept |
| `skeleton:footer:Eye Care Birmingham/1137#0` | footer Eye Care Birmingham/1137#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:footer:Eye Care Birmingham/1139#0` | footer Eye Care Birmingham/1139#0 <a> "Sunglasses" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1140#0` | footer Eye Care Birmingham/1140#0 <a> "All brands" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1141#0` | footer Eye Care Birmingham/1141#0 <a> "Prescription lenses" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1142#0` | footer Eye Care Birmingham/1142#0 <span> "Glasses — arriving soon" | remove | 0.9: brief-only line (coming-soon): a coming-soon line exists only because the designer's brief said the thing is not ready; it has no place on a live page | accept |
| `skeleton:footer:Eye Care Birmingham/1143#0` | footer Eye Care Birmingham/1143#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:footer:Eye Care Birmingham/1145#0` | footer Eye Care Birmingham/1145#0 <a> "Delivery & returns" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1146#0` | footer Eye Care Birmingham/1146#0 <a> "FAQs" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1147#0` | footer Eye Care Birmingham/1147#0 <a> "Size guide" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1148#0` | footer Eye Care Birmingham/1148#0 <a> "Contact" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1149#0` | footer Eye Care Birmingham/1149#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:footer:Eye Care Birmingham/1151#0` | footer Eye Care Birmingham/1151#0 <a> "About Eye Care" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1152#0` | footer Eye Care Birmingham/1152#0 <a> "0121 729 8233" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1153#0` | footer Eye Care Birmingham/1153#0 <a> "644 Washwood Heath Rd Birmingham B8 2HQ" | block:sgs/icon-list | 0.7 | accept |
| `skeleton:footer:Eye Care Birmingham/1155#0` | footer Eye Care Birmingham/1155#0 <span> "Mon–Sat 9.30–17.30" | block:sgs/business-info | 0.8 | accept |
| `skeleton:footer:Eye Care Birmingham/1157#0` | footer Eye Care Birmingham/1157#0 <span> "© 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners" | block:sgs/business-info | 0.8 | accept |
| `skeleton:footer:Eye Care Birmingham/1159#0` | footer Eye Care Birmingham/1159#0 <a> "Privacy" | block:sgs/button | 0.75 | accept |
| `skeleton:footer:Eye Care Birmingham/1160#0` | footer Eye Care Birmingham/1160#0 <a> "Terms" | block:sgs/button | 0.75 | accept |
| `skeleton:header:Eye Care Birmingham/14#0` | header Eye Care Birmingham/14#0 <div> | block:sgs/site-header-row | 1 | accept |
| `skeleton:header:Eye Care Birmingham/17#0` | header Eye Care Birmingham/17#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:header:Eye Care Birmingham/18#0` | header Eye Care Birmingham/18#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:header:Eye Care Birmingham/30#0` | header Eye Care Birmingham/30#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:header:Eye Care Birmingham/31#0` | header Eye Care Birmingham/31#0 <span> "EYE CARE" | block:sgs/responsive-logo | 0.8 | accept |
| `skeleton:header:Eye Care Birmingham/32#0` | header Eye Care Birmingham/32#0 <span> "BIRMINGHAM" | absorbed | 0.8: part of the typed brand name; the logo block carries it | accept |
| `skeleton:header:Eye Care Birmingham/33#0` | header Eye Care Birmingham/33#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:header:Eye Care Birmingham/38#0` | header Eye Care Birmingham/38#0 <a> "About Eye Care" | block:sgs/button | 0.75 | accept |
| `skeleton:header:Eye Care Birmingham/39#0` | header Eye Care Birmingham/39#0 <a> "Help" | block:sgs/button | 0.75 | accept |
| `skeleton:header:Eye Care Birmingham/46#0` | header Eye Care Birmingham/46#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1166#0` | mobile-menu Eye Care Birmingham/1166#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1168#0` | mobile-menu Eye Care Birmingham/1168#0 <button> "×" | block:sgs/button | 0.75 | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1180#0` | mobile-menu Eye Care Birmingham/1180#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1184#0` | mobile-menu Eye Care Birmingham/1184#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1185#0` | mobile-menu Eye Care Birmingham/1185#0 <a> | block:sgs/icon | 0.9 | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1190#0` | mobile-menu Eye Care Birmingham/1190#0 <a> | block:sgs/icon | 0.9 | accept |
| `skeleton:mobile-menu:Eye Care Birmingham/1193#0` | mobile-menu Eye Care Birmingham/1193#0 <a> | block:sgs/container | 1 | accept |
| `skeleton:page-about:Eye Care Birmingham/601#0` | page-about Eye Care Birmingham/601#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/605#0` | page-about Eye Care Birmingham/605#0 <h1> "Fatima Nawaz" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/606#0` | page-about Eye Care Birmingham/606#0 <p> "BSc (Hons) Optometry · MCOptom · DipTp(IP) · Prof Cert Paediatric Eye Care" | block:sgs/text | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/607#0` | page-about Eye Care Birmingham/607#0 <p> "Eye Care Birmingham is an independent clinic in Birmingham. This shop is how it sells eyewear beyond the front door: the same frames the chains stock, priced by someone without a chain's overheads, with lenses glazed and fitted on site." | block:sgs/text | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/608#0` | page-about Eye Care Birmingham/608#0 <p> "Day to day I test eyes, treat eye conditions and dispense glasses. The letters below aren't decoration — they're why I can look at your prescription and tell you what will actually work in a given frame." | block:sgs/text | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/609#0` | page-about Eye Care Birmingham/609#0 <p> "Every prescription order is checked by me before it's made. If a frame won't suit a strong prescription, I'll say so before you pay and suggest something that will." | block:sgs/text | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/611#0` | page-about Eye Care Birmingham/611#0 <a> "Message me" | block:sgs/container | 1 | accept |
| `skeleton:page-about:Eye Care Birmingham/613#0` | page-about Eye Care Birmingham/613#0 <button> "Shop the range" | block:sgs/button | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/617#0` | page-about Eye Care Birmingham/617#0 <p> "An honours degree in optometry, a supervised pre-registration year, and registration with the General Optical Council." | block:sgs/text | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/620#0` | page-about Eye Care Birmingham/620#0 <p> "Member of the College of Optometrists, which means ongoing training and a code of clinic beyond the legal minimum." | block:sgs/text | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/623#0` | page-about Eye Care Birmingham/623#0 <p> "Independent Prescriber — a postgraduate qualification allowing me to diagnose eye conditions and prescribe medicine for them. Most opticians can't." | block:sgs/text | 0.75 | accept |
| `skeleton:page-about:Eye Care Birmingham/626#0` | page-about Eye Care Birmingham/626#0 <p> "Additional certification in children's vision, which matters when the order is for a child." | block:sgs/text | 0.75 | accept |
| `skeleton:page-account:Eye Care Birmingham/919#0` | page-account Eye Care Birmingham/919#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-account:Eye Care Birmingham/925#0` | page-account Eye Care Birmingham/925#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-account:Eye Care Birmingham/926#0` | page-account Eye Care Birmingham/926#0 <nav> | block:sgs/container | 1 | accept |
| `skeleton:page-account:Eye Care Birmingham/928=sgs/container` | page-account Eye Care Birmingham/928=sgs/container <button> | block:sgs/container | 1: 1 copies of one template element | accept |
| `skeleton:page-account:Eye Care Birmingham/931#0` | page-account Eye Care Birmingham/931#0 <button> "Sign out" | block:sgs/button | 0.75 | accept |
| `skeleton:page-account:Eye Care Birmingham/932#0` | page-account Eye Care Birmingham/932#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-account:Eye Care Birmingham/934#0` | page-account Eye Care Birmingham/934#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-account:Eye Care Birmingham/935#0` | page-account Eye Care Birmingham/935#0 <h2> "Orders" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-account:Eye Care Birmingham/937#0` | page-account Eye Care Birmingham/937#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-account:Eye Care Birmingham/939` | page-account Eye Care Birmingham/939 <button> | block:sgs/container | 1: 3 copies of one template element | accept |
| `skeleton:page-account:Eye Care Birmingham/940` | page-account Eye Care Birmingham/940 <span> | block:sgs/container | 1: 3 copies of one template element | accept |
| `skeleton:page-account:Eye Care Birmingham/945` | page-account Eye Care Birmingham/945 <span> | block:sgs/container | 1: 3 copies of one template element | accept |
| `skeleton:page-checkout:Eye Care Birmingham/739#0` | page-checkout Eye Care Birmingham/739#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/740#0` | page-checkout Eye Care Birmingham/740#0 <h1> "Checkout" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/741#0` | page-checkout Eye Care Birmingham/741#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/742#0` | page-checkout Eye Care Birmingham/742#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/743#0` | page-checkout Eye Care Birmingham/743#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/745#0` | page-checkout Eye Care Birmingham/745#0 <button> "Apple Pay" | block:sgs/button | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/746#0` | page-checkout Eye Care Birmingham/746#0 <button> "G Pay" | block:sgs/button | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/747#0` | page-checkout Eye Care Birmingham/747#0 <button> "PayPal" | block:sgs/button | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/748#0` | page-checkout Eye Care Birmingham/748#0 <button> "Klarna." | block:sgs/button | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/752#0` | page-checkout Eye Care Birmingham/752#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/753#0` | page-checkout Eye Care Birmingham/753#0 <h2> "Contact" | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/755#0` | page-checkout Eye Care Birmingham/755#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/759#0` | page-checkout Eye Care Birmingham/759#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/763#0` | page-checkout Eye Care Birmingham/763#0 <span> "Optional. Follow this order and keep your addresses and saved frames for next time." | remove | 1: inside a removed element (Eye Care Birmingham/762#0) | accept |
| `skeleton:page-checkout:Eye Care Birmingham/766#0` | page-checkout Eye Care Birmingham/766#0 <p> "Already have an account?" | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/767#0` | page-checkout Eye Care Birmingham/767#0 <button> "Sign in" | block:sgs/button | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/770#0` | page-checkout Eye Care Birmingham/770#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/771#0` | page-checkout Eye Care Birmingham/771#0 <h2> "Delivery" | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/773#0` | page-checkout Eye Care Birmingham/773#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/774#0` | page-checkout Eye Care Birmingham/774#0 <button> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/775#0` | page-checkout Eye Care Birmingham/775#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/779#0` | page-checkout Eye Care Birmingham/779#0 <button> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/780#0` | page-checkout Eye Care Birmingham/780#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/785#0` | page-checkout Eye Care Birmingham/785#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/806#0` | page-checkout Eye Care Birmingham/806#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/807#0` | page-checkout Eye Care Birmingham/807#0 <h2> "Payment" | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/809#0` | page-checkout Eye Care Birmingham/809#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/813#0` | page-checkout Eye Care Birmingham/813#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/816#0` | page-checkout Eye Care Birmingham/816#0 <p> "Secure payment. Prescription details are held under UK GDPR and seen only by me." | block:sgs/text | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/817#0` | page-checkout Eye Care Birmingham/817#0 <aside> | block:sgs/container | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/818#0` | page-checkout Eye Care Birmingham/818#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/820#0` | page-checkout Eye Care Birmingham/820#0 <a> "Edit" | block:sgs/button | 0.75 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/833#0` | page-checkout Eye Care Birmingham/833#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/834#0` | page-checkout Eye Care Birmingham/834#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/837#0` | page-checkout Eye Care Birmingham/837#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/840#0` | page-checkout Eye Care Birmingham/840#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-checkout:Eye Care Birmingham/843#0` | page-checkout Eye Care Birmingham/843#0 <p> "Klarna: 3 interest-free payments of £0 . 18+, T&Cs apply." | block:sgs/text | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/662#0` | page-contact Eye Care Birmingham/662#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/666#0` | page-contact Eye Care Birmingham/666#0 <h1> "You'll be talking to me, not a help desk." | block:sgs/heading | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/667#0` | page-contact Eye Care Birmingham/667#0 <p> "Frame advice, prescription questions, order updates — WhatsApp is quickest. Messages in opening hours are usually answered within the hour." | block:sgs/text | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/668#0` | page-contact Eye Care Birmingham/668#0 <a> "WhatsApp 07960 5978" | block:sgs/container | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/670#0` | page-contact Eye Care Birmingham/670#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-contact:Eye Care Birmingham/674#0` | page-contact Eye Care Birmingham/674#0 <div> "hello@eyecarebirmingham.co.uk" | block:sgs/container | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/676#0` | page-contact Eye Care Birmingham/676#0 <div> "644 Washwood Heath Rd Birmingham B8 2HQ" | block:sgs/container | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/698#0` | page-contact Eye Care Birmingham/698#0 <button> "Send message" | block:sgs/button | 0.75 | accept |
| `skeleton:page-contact:Eye Care Birmingham/729#0` | page-contact Eye Care Birmingham/729#0 <span> | block:sgs/container | 1 | accept |
| `skeleton:page-contact:Eye Care Birmingham/730#0` | page-contact Eye Care Birmingham/730#0 <span> "644 Washwood Heath Rd, B8 2HQ" | block:sgs/business-info | 0.8 | accept |
| `skeleton:page-contact:Eye Care Birmingham/732#0` | page-contact Eye Care Birmingham/732#0 <p> "Sketch map — swap for an embedded Google map on the live site." | block:sgs/text | 0.75 | accept |
| `skeleton:page-done:Eye Care Birmingham/845#0` | page-done Eye Care Birmingham/845#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-done:Eye Care Birmingham/847#0` | page-done Eye Care Birmingham/847#0 <h1> "Thank you — order EC-10482." | block:sgs/heading | 0.75 | accept |
| `skeleton:page-done:Eye Care Birmingham/848#0` | page-done Eye Care Birmingham/848#0 <p> "Confirmation is on its way by email and WhatsApp. Frames post within one working day; prescription lenses take 7 to 10." | block:sgs/text | 0.75 | accept |
| `skeleton:page-done:Eye Care Birmingham/851#0` | page-done Eye Care Birmingham/851#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-done:Eye Care Birmingham/852#0` | page-done Eye Care Birmingham/852#0 <button> "Back to the shop" | block:sgs/button | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/628#0` | page-help Eye Care Birmingham/628#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/630#0` | page-help Eye Care Birmingham/630#0 <h1> "Delivery, returns and the usual questions" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/631#0` | page-help Eye Care Birmingham/631#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help:Eye Care Birmingham/632#0` | page-help Eye Care Birmingham/632#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/634#0` | page-help Eye Care Birmingham/634#0 <p> "Free over £75, otherwise £3.95 tracked. Frames in stock go out within one working day; prescription orders take 7–10 working days to make." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/635#0` | page-help Eye Care Birmingham/635#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/637#0` | page-help Eye Care Birmingham/637#0 <p> "Free. Pick it at checkout and I'll message when it's ready. I'll adjust them to fit while you wait." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/638#0` | page-help Eye Care Birmingham/638#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/640#0` | page-help Eye Care Birmingham/640#0 <p> "30 days on unworn frames with case and tags, refunded in full. Lenses made to your prescription can't be resold, so they're only refundable if I got them wrong." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/641#0` | page-help Eye Care Birmingham/641#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help:Eye Care Birmingham/642#0` | page-help Eye Care Birmingham/642#0 <h2> "Questions" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/644#0` | page-help Eye Care Birmingham/644#0 <button> "Size guide" | block:sgs/button | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/645#0` | page-help Eye Care Birmingham/645#0 <a> "Contact me" | block:sgs/button | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/646#0` | page-help Eye Care Birmingham/646#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/648` | page-help Eye Care Birmingham/648 <div> | block:sgs/container | 0.75: 8 copies of one template element | accept |
| `skeleton:page-help:Eye Care Birmingham/649` | page-help Eye Care Birmingham/649 <button> | block:sgs/container | 1: 8 copies of one template element | accept |
| `skeleton:page-help:Eye Care Birmingham/653#0` | page-help Eye Care Birmingham/653#0 <p> "Yes. Everything comes through the brands' authorised UK suppliers to a GOC-registered clinic, boxed with its own case, cloth and warranty card. If a seller can't tell you where their stock comes from, be careful." | block:sgs/text | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/654#0` | page-help Eye Care Birmingham/654#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-help:Eye Care Birmingham/655#0` | page-help Eye Care Birmingham/655#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-help:Eye Care Birmingham/659#0` | page-help Eye Care Birmingham/659#0 <button> "Contact me" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/113#0` | page-home Eye Care Birmingham/113#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/120#0` | page-home Eye Care Birmingham/120#0 <p> "40 designer brands · Birmingham" | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/121#0` | page-home Eye Care Birmingham/121#0 <h1> "The same designer shades. A good deal less." | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/122#0` | page-home Eye Care Birmingham/122#0 <p> "I'm an optician in Birmingham, buying from the same suppliers as the high street and pricing it more sensibly. If you need your prescription in them, I glaze and fit the lenses myself." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/124#0` | page-home Eye Care Birmingham/124#0 <button> "Shop sunglasses" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/125#0` | page-home Eye Care Birmingham/125#0 <button> "Add your prescription" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/126#0` | page-home Eye Care Birmingham/126#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/129` | page-home Eye Care Birmingham/129 <a> "Ray-Ban" | block:sgs/button | 0.75: 32 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/130#0` | page-home Eye Care Birmingham/130#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/131#0` | page-home Eye Care Birmingham/131#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/132#0` | page-home Eye Care Birmingham/132#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/134#0` | page-home Eye Care Birmingham/134#0 <h2> "Best sellers" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/135#0` | page-home Eye Care Birmingham/135#0 <a> "See everything" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/136#0` | page-home Eye Care Birmingham/136#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/138` | page-home Eye Care Birmingham/138 <div> | block:sgs/container | 1: 8 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/139` | page-home Eye Care Birmingham/139 <div> | block:sgs/container | 0.75: 8 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/140#0` | page-home Eye Care Birmingham/140#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/141#0` | page-home Eye Care Birmingham/141#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/142#0` | page-home Eye Care Birmingham/142#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/143#0` | page-home Eye Care Birmingham/143#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/145#0` | page-home Eye Care Birmingham/145#0 <h2> "Four reasons, and not one of them is a discount code." | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/146#0` | page-home Eye Care Birmingham/146#0 <p> "I'm an optician who genuinely enjoys this part of the job — finding people frames that suit them. This shop exists so I can show you the whole range properly instead of scrolling a supplier's catalogue at the counter, and because I'd rather price frames fairly than squeeze the most out of every sale." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/147#0` | page-home Eye Care Birmingham/147#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/149` | page-home Eye Care Birmingham/149 <div> | block:sgs/container | 0.75: 4 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/151` | page-home Eye Care Birmingham/151 <h3> "Below RRP, and I show you by how much" | block:sgs/heading | 0.75: 4 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/152` | page-home Eye Care Birmingham/152 <p> "The recommended retail price sits next to my price on every single frame. No codes to hunt for, no countdown timers, no permanent fake sale." | block:sgs/text | 0.75: 4 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/153#0` | page-home Eye Care Birmingham/153#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/154#0` | page-home Eye Care Birmingham/154#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/155#0` | page-home Eye Care Birmingham/155#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/156#0` | page-home Eye Care Birmingham/156#0 <p> "Not sure what suits you?" | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/157#0` | page-home Eye Care Birmingham/157#0 <h2> "Start with a shape" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/158#0` | page-home Eye Care Birmingham/158#0 <a> "All 12 styles" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/159#0` | page-home Eye Care Birmingham/159#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/161=sgs/container` | page-home Eye Care Birmingham/161=sgs/container <button> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/167=sgs/container` | page-home Eye Care Birmingham/167=sgs/container <span> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/171#0` | page-home Eye Care Birmingham/171#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/172#0` | page-home Eye Care Birmingham/172#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/175#0` | page-home Eye Care Birmingham/175#0 <h2> "What people say" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/176#0` | page-home Eye Care Birmingham/176#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/177#0` | page-home Eye Care Birmingham/177#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/178#0` | page-home Eye Care Birmingham/178#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/180#0` | page-home Eye Care Birmingham/180#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/182#0` | page-home Eye Care Birmingham/182#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/184#0` | page-home Eye Care Birmingham/184#0 <span> "★★★★★" | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/188#0` | page-home Eye Care Birmingham/188#0 <a> "See all reviews" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/189#0` | page-home Eye Care Birmingham/189#0 <a> "Write a review" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/190#0` | page-home Eye Care Birmingham/190#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/191#0` | page-home Eye Care Birmingham/191#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/193` | page-home Eye Care Birmingham/193 <figure> | block:sgs/container | 1: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/194` | page-home Eye Care Birmingham/194 <div> | block:sgs/container | 1: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/196` | page-home Eye Care Birmingham/196 <span> | block:sgs/container | 1: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/199` | page-home Eye Care Birmingham/199 <span> | block:sgs/container | 1: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/201` | page-home Eye Care Birmingham/201 <div> | block:sgs/container | 1: 13 copies of one template element | accept |
| `skeleton:page-home:Eye Care Birmingham/206#0` | page-home Eye Care Birmingham/206#0 <a> "Read the full review" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/207#0` | page-home Eye Care Birmingham/207#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/208#0` | page-home Eye Care Birmingham/208#0 <p> "Scroll for more — 13 of the 15 reviews left a comment." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/216#0` | page-home Eye Care Birmingham/216#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/217#0` | page-home Eye Care Birmingham/217#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/218#0` | page-home Eye Care Birmingham/218#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/220#0` | page-home Eye Care Birmingham/220#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/222#0` | page-home Eye Care Birmingham/222#0 <h2> "Any pair here, made to your prescription." | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/223#0` | page-home Eye Care Birmingham/223#0 <p> "Three questions with pictures, a price that updates as you go, and you can send your prescription whenever suits — including after you've ordered. Single vision from £59." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/224#0` | page-home Eye Care Birmingham/224#0 <ol> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/225#0` | page-home Eye Care Birmingham/225#0 <li> "Pick a frame, then “Add my prescription”" | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/227#0` | page-home Eye Care Birmingham/227#0 <li> "Tell me what they're for, how thin, what finish" | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/229#0` | page-home Eye Care Birmingham/229#0 <li> "Send your prescription now, or later — no rush" | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/231#0` | page-home Eye Care Birmingham/231#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/232#0` | page-home Eye Care Birmingham/232#0 <button> "How lenses work here" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/233#0` | page-home Eye Care Birmingham/233#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/234#0` | page-home Eye Care Birmingham/234#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/235#0` | page-home Eye Care Birmingham/235#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/238#0` | page-home Eye Care Birmingham/238#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/239#0` | page-home Eye Care Birmingham/239#0 <p> "You're buying from a person" | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/240#0` | page-home Eye Care Birmingham/240#0 <h2> "I'm Fatima Nawaz, and I run the clinic in Birmingham." | block:sgs/heading | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/241#0` | page-home Eye Care Birmingham/241#0 <p> "Everything on this site I chose myself, and every prescription order comes across my bench before it's made. If a frame isn't going to work with your lenses, I'd rather tell you before you pay than after." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/242#0` | page-home Eye Care Birmingham/242#0 <p> "If you're unsure about anything, just ask. Talking people through frames and lenses is what I do all day at the clinic, and I'm glad to do it here too." | block:sgs/text | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham/243#0` | page-home Eye Care Birmingham/243#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/244#0` | page-home Eye Care Birmingham/244#0 <a> "Message me on WhatsApp" | block:sgs/container | 1 | accept |
| `skeleton:page-home:Eye Care Birmingham/246#0` | page-home Eye Care Birmingham/246#0 <button> "My qualifications" | block:sgs/button | 0.75 | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139#4/33#0` | page-home Eye Care Birmingham>Frame Card@139#4/33#0 <a> "+2" | block:sgs/button | 0.75: 3 copies of one template element on 3 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/0` | page-home Eye Care Birmingham>Frame Card@139/0 <div> | block:sgs/container | 1: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/13` | page-home Eye Care Birmingham>Frame Card@139/13 <div> | block:sgs/container | 1: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/14` | page-home Eye Care Birmingham>Frame Card@139/14 <div> | block:sgs/container | 1: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/15` | page-home Eye Care Birmingham>Frame Card@139/15 <a> "Aviator Classic" | block:sgs/button | 0.75: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/18` | page-home Eye Care Birmingham>Frame Card@139/18 <div> | block:sgs/container | 1: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/24` | page-home Eye Care Birmingham>Frame Card@139/24 <div> | block:sgs/container | 1: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/25` | page-home Eye Care Birmingham>Frame Card@139/25 <div> | block:sgs/container | 1: 30 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/31` | page-home Eye Care Birmingham>Frame Card@139/31 <button> | block:sgs/button | 0.75: 90 copies of one template element on 4 surfaces | accept |
| `skeleton:page-home:Eye Care Birmingham>Frame Card@139/5` | page-home Eye Care Birmingham>Frame Card@139/5 <div> | block:sgs/container | 1: 20 copies of one template element on 3 surfaces | accept |
| `skeleton:page-lenses:Eye Care Birmingham/552#0` | page-lenses Eye Care Birmingham/552#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/554#0` | page-lenses Eye Care Birmingham/554#0 <h1> "Three questions, then leave the rest to me." | block:sgs/heading | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/555#0` | page-lenses Eye Care Birmingham/555#0 <p> "Any frame on this site can be glazed to your prescription. You tell me what they're for, how thin you want the lenses and what finish; I check the order, cut the lenses and fit them myself. Send your prescription whenever suits — before or after you order." | block:sgs/text | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/556#0` | page-lenses Eye Care Birmingham/556#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/557#0` | page-lenses Eye Care Birmingham/557#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/560#0` | page-lenses Eye Care Birmingham/560#0 <p> "Distance or reading, tinted to match the frame." | block:sgs/text | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/561#0` | page-lenses Eye Care Birmingham/561#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/564#0` | page-lenses Eye Care Birmingham/564#0 <p> "Near and far in one lens, no visible line." | block:sgs/text | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/565#0` | page-lenses Eye Care Birmingham/565#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/568#0` | page-lenses Eye Care Birmingham/568#0 <p> "Kills glare off water, roads and windscreens." | block:sgs/text | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/569#0` | page-lenses Eye Care Birmingham/569#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/572#0` | page-lenses Eye Care Birmingham/572#0 <p> "I recommend one from your prescription strength." | block:sgs/text | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/573#0` | page-lenses Eye Care Birmingham/573#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/574#0` | page-lenses Eye Care Birmingham/574#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/575#0` | page-lenses Eye Care Birmingham/575#0 <h2> "In every lens, no extra charge" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/576#0` | page-lenses Eye Care Birmingham/576#0 <ul> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/583#0` | page-lenses Eye Care Birmingham/583#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/584#0` | page-lenses Eye Care Birmingham/584#0 <h2> "How it goes" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/585#0` | page-lenses Eye Care Birmingham/585#0 <ol> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/586#0` | page-lenses Eye Care Birmingham/586#0 <li> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/589#0` | page-lenses Eye Care Birmingham/589#0 <li> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/592#0` | page-lenses Eye Care Birmingham/592#0 <li> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/595#0` | page-lenses Eye Care Birmingham/595#0 <li> | block:sgs/container | 1 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/598#0` | page-lenses Eye Care Birmingham/598#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-lenses:Eye Care Birmingham/599#0` | page-lenses Eye Care Birmingham/599#0 <button> "Choose a frame" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/335#0` | page-product Eye Care Birmingham/335#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/336#0` | page-product Eye Care Birmingham/336#0 <nav> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/337#0` | page-product Eye Care Birmingham/337#0 <a> "Home" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/339#0` | page-product Eye Care Birmingham/339#0 <a> "Sunglasses" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/341#0` | page-product Eye Care Birmingham/341#0 <a> "Ray-Ban" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/344#0` | page-product Eye Care Birmingham/344#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/356` | page-product Eye Care Birmingham/356 <button> "Front" | block:sgs/button | 0.75: 4 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/361#0` | page-product Eye Care Birmingham/361#0 <a> "Ray-Ban" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/362#0` | page-product Eye Care Birmingham/362#0 <h1> "Aviator Classic" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/363#0` | page-product Eye Care Birmingham/363#0 <p> "RB3025 · 001/58" | block:sgs/text | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/364#0` | page-product Eye Care Birmingham/364#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/367#0` | page-product Eye Care Birmingham/367#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/370#0` | page-product Eye Care Birmingham/370#0 <span> "RRP" | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/373#0` | page-product Eye Care Birmingham/373#0 <div> "In stock — dispatched next working day" | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/376#0` | page-product Eye Care Birmingham/376#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/379#0` | page-product Eye Care Birmingham/379#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/384#0` | page-product Eye Care Birmingham/384#0 <p> "Colourway shots are stand-ins until the real ones land." | block:sgs/text | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/386#0` | page-product Eye Care Birmingham/386#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/388#0` | page-product Eye Care Birmingham/388#0 <button> "Which size am I?" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/389#0` | page-product Eye Care Birmingham/389#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/395#0` | page-product Eye Care Birmingham/395#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/398#0` | page-product Eye Care Birmingham/398#0 <button> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/401#0` | page-product Eye Care Birmingham/401#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/402#0` | page-product Eye Care Birmingham/402#0 <span> "Or 3 payments of £46.33 with" | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/409#0` | page-product Eye Care Birmingham/409#0 <span> "Need advice?" | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/413` | page-product Eye Care Birmingham/413 <div> | block:sgs/container | 1: 3 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/416#0` | page-product Eye Care Birmingham/416#0 <section> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/417#0` | page-product Eye Care Birmingham/417#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/420` | page-product Eye Care Birmingham/420 <button> "Description" | block:sgs/button | 0.75: 3 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/422#0` | page-product Eye Care Birmingham/422#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/423#0` | page-product Eye Care Birmingham/423#0 <p> "The Ray-Ban Aviator Classic, in Gold / Green G-15. The pilot shape is about as universally flattering as eyewear gets — the teardrop softens a square jaw and adds length to a rounder face. This size measures 58mm across each lens, which is on the wider side. The lenses block 100% of UV as the brand supplies them, and I can swap in polarised if you would rather. Prescription lenses go in this frame without any trouble — single vision or varifocal — and I cut and fit them here." | block:sgs/text | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/424#0` | page-product Eye Care Birmingham/424#0 <ul> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/492#0` | page-product Eye Care Birmingham/492#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/493#0` | page-product Eye Care Birmingham/493#0 <h2> "Good to know" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/495` | page-product Eye Care Birmingham/495 <div> | block:sgs/container | 0.75: 4 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/496` | page-product Eye Care Birmingham/496 <button> | block:sgs/container | 1: 4 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/537#0` | page-product Eye Care Birmingham/537#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/538#0` | page-product Eye Care Birmingham/538#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/539#0` | page-product Eye Care Birmingham/539#0 <h2> "More from Ray-Ban" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/540#0` | page-product Eye Care Birmingham/540#0 <a> "See all Ray-Ban" | block:sgs/button | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/541#0` | page-product Eye Care Birmingham/541#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/543` | page-product Eye Care Birmingham/543 <div> | block:sgs/container | 1: 2 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/544` | page-product Eye Care Birmingham/544 <div> | block:sgs/container | 0.75: 2 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/545#0` | page-product Eye Care Birmingham/545#0 <section> | block:sgs/container | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/546#0` | page-product Eye Care Birmingham/546#0 <h2> "Similar shapes" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-product:Eye Care Birmingham/547#0` | page-product Eye Care Birmingham/547#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-product:Eye Care Birmingham/549` | page-product Eye Care Birmingham/549 <div> | block:sgs/container | 1: 4 copies of one template element | accept |
| `skeleton:page-product:Eye Care Birmingham/550` | page-product Eye Care Birmingham/550 <div> | block:sgs/container | 0.75: 4 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/248#0` | page-shop Eye Care Birmingham/248#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-shop:Eye Care Birmingham/252#0` | page-shop Eye Care Birmingham/252#0 <h1> "Sunglasses" | block:sgs/heading | 0.75 | accept |
| `skeleton:page-shop:Eye Care Birmingham/253#0` | page-shop Eye Care Birmingham/253#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop:Eye Care Birmingham/256#0` | page-shop Eye Care Birmingham/256#0 <button> "Filter" | block:sgs/button | 0.75 | accept |
| `skeleton:page-shop:Eye Care Birmingham/269#0` | page-shop Eye Care Birmingham/269#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop:Eye Care Birmingham/271#0` | page-shop Eye Care Birmingham/271#0 <aside> | block:sgs/container | 1 | accept |
| `skeleton:page-shop:Eye Care Birmingham/276#0` | page-shop Eye Care Birmingham/276#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop:Eye Care Birmingham/278` | page-shop Eye Care Birmingham/278 <div> | block:sgs/container | 0.75: 10 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/279` | page-shop Eye Care Birmingham/279 <button> | block:sgs/container | 1: 10 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/281=sgs/container` | page-shop Eye Care Birmingham/281=sgs/container <span> | block:sgs/container | 1: 3 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/286` | page-shop Eye Care Birmingham/286 <div> | block:sgs/container | 0.75: 5 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/290` | page-shop Eye Care Birmingham/290 <button> "All" | block:sgs/button | 0.75: 3 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/294` | page-shop Eye Care Birmingham/294 <button> "Pilot" | block:sgs/button | 0.75: 12 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/300` | page-shop Eye Care Birmingham/300 <button> | block:sgs/button | 0.75: 12 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/304#0` | page-shop Eye Care Birmingham/304#0 <span> "£59" | remove | 1: inside a removed element (Eye Care Birmingham/303#0) | accept |
| `skeleton:page-shop:Eye Care Birmingham/305#0` | page-shop Eye Care Birmingham/305#0 <span> "£339" | remove | 1: inside a removed element (Eye Care Birmingham/303#0) | accept |
| `skeleton:page-shop:Eye Care Birmingham/310` | page-shop Eye Care Birmingham/310 <label> | remove | 1: 40 copies of one template element; inside a removed element (Eye Care Birmingham/308#0) | accept |
| `skeleton:page-shop:Eye Care Birmingham/311` | page-shop Eye Care Birmingham/311 <span> | remove | 1: 40 copies of one template element; inside a removed element (Eye Care Birmingham/308#0) | accept |
| `skeleton:page-shop:Eye Care Birmingham/312` | page-shop Eye Care Birmingham/312 <input> | remove | 1: 40 copies of one template element; inside a removed element (Eye Care Birmingham/308#0) | accept |
| `skeleton:page-shop:Eye Care Birmingham/313` | page-shop Eye Care Birmingham/313 <span> "Ray-Ban" | remove | 1: 40 copies of one template element; inside a removed element (Eye Care Birmingham/308#0) | accept |
| `skeleton:page-shop:Eye Care Birmingham/314` | page-shop Eye Care Birmingham/314 <span> "48" | remove | 1: 40 copies of one template element; inside a removed element (Eye Care Birmingham/308#0) | accept |
| `skeleton:page-shop:Eye Care Birmingham/315#0` | page-shop Eye Care Birmingham/315#0 <label> | block:sgs/container | 1 | accept |
| `skeleton:page-shop:Eye Care Birmingham/317#0` | page-shop Eye Care Birmingham/317#0 <span> | block:sgs/container | 0.75 | accept |
| `skeleton:page-shop:Eye Care Birmingham/323#0` | page-shop Eye Care Birmingham/323#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:page-shop:Eye Care Birmingham/324#0` | page-shop Eye Care Birmingham/324#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:page-shop:Eye Care Birmingham/326` | page-shop Eye Care Birmingham/326 <div> | block:sgs/container | 1: 16 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/327` | page-shop Eye Care Birmingham/327 <div> | block:sgs/container | 0.75: 16 copies of one template element | accept |
| `skeleton:page-shop:Eye Care Birmingham/333#0` | page-shop Eye Care Birmingham/333#0 <p> "Every pair is genuine, bought through the brands' authorised UK suppliers, and comes boxed with its own case and cloth. Prescription lenses can go in any of them." | block:sgs/text | 0.75 | accept |
| `skeleton:page-signin:Eye Care Birmingham/856#0` | page-signin Eye Care Birmingham/856#0 <main> | block:sgs/container | 0.75 | accept |
| `skeleton:page-signin:Eye Care Birmingham/860#0` | page-signin Eye Care Birmingham/860#0 <h1> "Sign in or create an account" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/861#0` | page-signin Eye Care Birmingham/861#0 <p> "You don't need an account to order; checkout works as a guest. An account keeps your orders, subscriptions, addresses and saved frames in one place." | block:sgs/text | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/864#0` | page-signin Eye Care Birmingham/864#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/866#0` | page-signin Eye Care Birmingham/866#0 <h2> "Sign in" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/871#0` | page-signin Eye Care Birmingham/871#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/874#0` | page-signin Eye Care Birmingham/874#0 <button> "Forgotten your password?" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/875#0` | page-signin Eye Care Birmingham/875#0 <button> "Sign in" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/877#0` | page-signin Eye Care Birmingham/877#0 <h2> "New here?" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:page-signin:Eye Care Birmingham/885#0` | page-signin Eye Care Birmingham/885#0 <button> "Create account" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces | accept |
| `skeleton:sign-in-and-register-forms:Eye Care Birmingham/858#0` | sign-in-and-register-forms Eye Care Birmingham/858#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1235#0` | size-guide Eye Care Birmingham/1235#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1237#0` | size-guide Eye Care Birmingham/1237#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1238#0` | size-guide Eye Care Birmingham/1238#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1240#0` | size-guide Eye Care Birmingham/1240#0 <button> "×" | block:sgs/button | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1242#0` | size-guide Eye Care Birmingham/1242#0 <p> "The quickest way: pick up a pair of glasses you already like the fit of and look at the inside of the left arm. You'll find three numbers printed there." | block:sgs/text | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1243#0` | size-guide Eye Care Birmingham/1243#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1244#0` | size-guide Eye Care Birmingham/1244#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1248#0` | size-guide Eye Care Birmingham/1248#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1252#0` | size-guide Eye Care Birmingham/1252#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1253#0` | size-guide Eye Care Birmingham/1253#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1255#0` | size-guide Eye Care Birmingham/1255#0 <p> "The width of one lens at its widest. This is the number that decides whether a frame looks too small or too big on you." | block:sgs/text | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1256#0` | size-guide Eye Care Birmingham/1256#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1258#0` | size-guide Eye Care Birmingham/1258#0 <p> "The gap between the lenses that sits over your nose. Too narrow and they pinch; too wide and they slide down." | block:sgs/text | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1259#0` | size-guide Eye Care Birmingham/1259#0 <div> | block:sgs/container | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1261#0` | size-guide Eye Care Birmingham/1261#0 <p> "The length of the arm, ear bend included. I can adjust this in person, so it's the least critical of the three." | block:sgs/text | 0.75 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1262#0` | size-guide Eye Care Birmingham/1262#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1263#0` | size-guide Eye Care Birmingham/1263#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1266#0` | size-guide Eye Care Birmingham/1266#0 <div> | block:sgs/container | 1 | accept |
| `skeleton:size-guide:Eye Care Birmingham/1269#0` | size-guide Eye Care Birmingham/1269#0 <div> | block:sgs/container | 1 | accept |

## Inventory diffs (inventory-diff)

Accept all: [x]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `inventory:surface-count:routes` | **changed** surface count routes: ours 10, theirs 11 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:anim:Eye Care Birmingham%7Ccss-media:only-ours` | RM-01 css-media Reduced-motion override *, ::before, ::after is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1005%7Ccss:animation-name.to` | K-58 (theirs CA-83) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1005%7Ccss:properties` | K-58 (theirs CA-83) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1005%7Ccss:trigger.type` | K-58 (theirs CA-83) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1026%7Ccss:animation-name.to` | K-59 (theirs CA-84) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1026%7Ccss:properties` | K-59 (theirs CA-84) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1026%7Ccss:trigger.type` | K-59 (theirs CA-84) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1044%7Ccss:animation-name.to` | K-60 (theirs CA-85) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1044%7Ccss:properties` | K-60 (theirs CA-85) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1044%7Ccss:trigger.type` | K-60 (theirs CA-85) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1058%7Ccss:animation-name.to` | K-61 (theirs CA-86) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1058%7Ccss:properties` | K-61 (theirs CA-86) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1058%7Ccss:trigger.type` | K-61 (theirs CA-86) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1070%7Ccss:animation-name.to` | K-62 (theirs CA-87) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1070%7Ccss:properties` | K-62 (theirs CA-87) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1070%7Ccss:trigger.type` | K-62 (theirs CA-87) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1082%7Ccss:animation-name.to` | K-63 (theirs CA-88) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1082%7Ccss:properties` | K-63 (theirs CA-88) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1082%7Ccss:trigger.type` | K-63 (theirs CA-88) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1098%7Ccss:animation-name.to` | K-64 (theirs CA-89) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1098%7Ccss:properties` | K-64 (theirs CA-89) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1098%7Ccss:trigger.type` | K-64 (theirs CA-89) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1123%7Ccss:animation-name.to` | K-65 (theirs CA-90) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1123%7Ccss:properties` | K-65 (theirs CA-90) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1123%7Ccss:trigger.type` | K-65 (theirs CA-90) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1131%7Ccss:border-color.from` | TR-071 (theirs TR-49) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1131%7Ccss:easing` | TR-071 (theirs TR-49) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1133%7Ccss:border-color.from` | TR-072 (theirs TR-50) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1133%7Ccss:easing` | TR-072 (theirs TR-50) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1135%7Ccss:border-color.from` | TR-073 (theirs TR-51) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1135%7Ccss:easing` | TR-073 (theirs TR-51) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C116%7Ccss:animation-name.to` | K-04 (theirs CA-04) animation-name.to: ours kenburns, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C116%7Ccss:properties` | K-04 (theirs CA-04) properties: ours animation-name,transform, theirs transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C116%7Ccss:trigger.type` | K-04 (theirs CA-04) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:color.from` | TR-074 (theirs TR-52) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:color.to` | TR-074 (theirs TR-52) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:easing` | TR-074 (theirs TR-52) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1161%7Ccss:properties` | TR-074 (theirs TR-52) properties: ours background,transform, theirs background,color,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1165%7Ccss:animation-name.to` | K-66 (theirs CA-45) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1165%7Ccss:properties` | K-66 (theirs CA-45) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1165%7Ccss:trigger.type` | K-66 (theirs CA-45) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:animation-name.to` | K-67 (theirs CA-46) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:delay_ms` | K-67 (theirs CA-46) delay_ms: ours 0, theirs 50 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:properties` | K-67 (theirs CA-46) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1170%7Ccss:trigger.type` | K-67 (theirs CA-46) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:animation-name.to` | K-68 (theirs CA-47) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:delay_ms` | K-68 (theirs CA-47) delay_ms: ours 0, theirs 100 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:properties` | K-68 (theirs CA-47) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1171%7Ccss:trigger.type` | K-68 (theirs CA-47) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:animation-name.to` | K-69 (theirs CA-48) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:delay_ms` | K-69 (theirs CA-48) delay_ms: ours 0, theirs 150 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:properties` | K-69 (theirs CA-48) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1172%7Ccss:trigger.type` | K-69 (theirs CA-48) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:animation-name.to` | K-70 (theirs CA-49) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:delay_ms` | K-70 (theirs CA-49) delay_ms: ours 0, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:properties` | K-70 (theirs CA-49) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1173%7Ccss:trigger.type` | K-70 (theirs CA-49) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:animation-name.to` | K-71 (theirs CA-50) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:delay_ms` | K-71 (theirs CA-50) delay_ms: ours 0, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:properties` | K-71 (theirs CA-50) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1175%7Ccss:trigger.type` | K-71 (theirs CA-50) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:animation-name.to` | K-72 (theirs CA-51) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:delay_ms` | K-72 (theirs CA-51) delay_ms: ours 0, theirs 360 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:properties` | K-72 (theirs CA-51) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1180%7Ccss:trigger.type` | K-72 (theirs CA-51) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1197%7Ccss:animation-name.to` | K-73 (theirs CA-52) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1197%7Ccss:properties` | K-73 (theirs CA-52) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1197%7Ccss:trigger.type` | K-73 (theirs CA-52) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1198%7Ccss:animation-name.to` | K-74 (theirs CA-53) animation-name.to: ours slideL, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1198%7Ccss:properties` | K-74 (theirs CA-53) properties: ours animation-name,transform, theirs transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1198%7Ccss:trigger.type` | K-74 (theirs CA-53) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:animation-name.to` | K-05 (theirs CA-05) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:delay_ms` | K-05 (theirs CA-05) delay_ms: ours 0, theirs 150 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:properties` | K-05 (theirs CA-05) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C120%7Ccss:trigger.type` | K-05 (theirs CA-05) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1209%7Ccss:animation-name.to` | K-75 (theirs CA-54) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1209%7Ccss:properties` | K-75 (theirs CA-54) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1209%7Ccss:trigger.type` | K-75 (theirs CA-54) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:animation-name.to` | K-06 (theirs CA-06) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:delay_ms` | K-06 (theirs CA-06) delay_ms: ours 0, theirs 280 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:properties` | K-06 (theirs CA-06) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C121%7Ccss:trigger.type` | K-06 (theirs CA-06) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:animation-name.to` | K-07 (theirs CA-07) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:delay_ms` | K-07 (theirs CA-07) delay_ms: ours 0, theirs 420 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:properties` | K-07 (theirs CA-07) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C122%7Ccss:trigger.type` | K-07 (theirs CA-07) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:animation-name.to` | K-08 (theirs CA-08) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:delay_ms` | K-08 (theirs CA-08) delay_ms: ours 0, theirs 560 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:properties` | K-08 (theirs CA-08) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C123%7Ccss:trigger.type` | K-08 (theirs CA-08) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1231%7Ccss:width.to` | TR-075 (theirs TR-53) width.to: ours null, theirs state-bound: freeShipPct | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1236%7Ccss:animation-name.to` | K-76 (theirs CA-55) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1236%7Ccss:properties` | K-76 (theirs CA-55) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1236%7Ccss:trigger.type` | K-76 (theirs CA-55) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1237%7Ccss:animation-name.to` | K-77 (theirs CA-56) animation-name.to: ours zoomIn, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1237%7Ccss:properties` | K-77 (theirs CA-56) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1237%7Ccss:trigger.type` | K-77 (theirs CA-56) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C124%7Ccss:easing` | TR-011 (theirs TR-11) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C125%7Ccss:border-color.from` | TR-012 (theirs TR-12) border-color.from: ours null, theirs 1px solid rgba(250,248,245,.75) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C125%7Ccss:easing` | TR-012 (theirs TR-12) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:animation-name.to` | K-09 (theirs CA-09) animation-name.to: ours marquee, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:properties` | K-09 (theirs CA-09) properties: ours animation-name,transform, theirs transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:transform.from` | K-09 (theirs CA-09) transform.from: ours translateX(0px), theirs translateX(0) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C127%7Ccss#load%7Canimation-name,transform:trigger.type` | K-09 (theirs CA-09) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1272%7Ccss:color.to` | TR-077 (theirs TR-55) color.to: ours null, theirs #0F2E1C | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1272%7Ccss:properties` | TR-077 (theirs TR-55) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:animation-name.to` | K-78 (theirs CA-57) animation-name.to: ours toast, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:properties` | K-78 (theirs CA-57) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:transform.to` | K-78 (theirs CA-57) transform.to: ours translate(-50%, 0px), theirs translate(-50%,0) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1278%7Ccss:trigger.type` | K-78 (theirs CA-57) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1283%7Ccss:animation-name.to` | K-79 (theirs CA-58) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1283%7Ccss:properties` | K-79 (theirs CA-58) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1283%7Ccss:trigger.type` | K-79 (theirs CA-58) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1288%7Ccss:border-color.from` | TR-078 (theirs TR-56) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C129%7Ccss:easing` | TR-013 (theirs TR-13) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1291%7Ccss:width.to` | TR-079 (theirs TR-57) width.to: ours null, theirs state-bound: lensProgress | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1296%7Ccss:filter.to` | TR-080 (theirs TR-58) filter.to: ours null, theirs state-bound: lensPreviewFilter | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1313%7Ccss:animation-name.to` | K-80 (theirs CA-59) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1313%7Ccss:properties` | K-80 (theirs CA-59) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1313%7Ccss:trigger.type` | K-80 (theirs CA-59) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1315%7Ccss:color.to` | TR-081 (theirs TR-59) color.to: ours null, theirs #12301E | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1315%7Ccss:properties` | TR-081 (theirs TR-59) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1322%7Ccss:animation-name.to` | K-81 (theirs CA-60) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1322%7Ccss:properties` | K-81 (theirs CA-60) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1322%7Ccss:trigger.type` | K-81 (theirs CA-60) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1329%7Ccss:border-color.from` | TR-082 (theirs TR-60) border-color.from: ours null, theirs 2px solid {{ o.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1329%7Ccss:delay_ms` | TR-082 (theirs TR-60) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1329%7Ccss:duration_ms` | TR-082 (theirs TR-60) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1341%7Ccss:color.from` | TR-083 (theirs TR-61) color.from: ours null, theirs #4A453E | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1341%7Ccss:color.to` | TR-083 (theirs TR-61) color.to: ours null, theirs #fff | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1341%7Ccss:properties` | TR-083 (theirs TR-61) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1343%7Ccss:animation-name.to` | K-82 (theirs CA-61) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1343%7Ccss:properties` | K-82 (theirs CA-61) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1343%7Ccss:trigger.type` | K-82 (theirs CA-61) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1345%7Ccss:animation-name.to` | K-83 (theirs CA-62) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1345%7Ccss:properties` | K-83 (theirs CA-62) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1345%7Ccss:trigger.type` | K-83 (theirs CA-62) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1352%7Ccss:border-color.from` | TR-084 (theirs TR-62) border-color.from: ours null, theirs 2px solid {{ o.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1352%7Ccss:delay_ms` | TR-084 (theirs TR-62) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1352%7Ccss:duration_ms` | TR-084 (theirs TR-62) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1365%7Ccss:color.from` | TR-085 (theirs TR-63) color.from: ours null, theirs #4A453E | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1365%7Ccss:color.to` | TR-085 (theirs TR-63) color.to: ours null, theirs #fff | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1365%7Ccss:properties` | TR-085 (theirs TR-63) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1367%7Ccss:animation-name.to` | K-84 (theirs CA-63) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1367%7Ccss:properties` | K-84 (theirs CA-63) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1367%7Ccss:trigger.type` | K-84 (theirs CA-63) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1369%7Ccss:animation-name.to` | K-85 (theirs CA-64) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1369%7Ccss:properties` | K-85 (theirs CA-64) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1369%7Ccss:trigger.type` | K-85 (theirs CA-64) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1376%7Ccss:border-color.from` | TR-086 (theirs TR-64) border-color.from: ours null, theirs 2px solid {{ o.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1376%7Ccss:delay_ms` | TR-086 (theirs TR-64) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1376%7Ccss:duration_ms` | TR-086 (theirs TR-64) duration_ms: ours per property, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1385%7Ccss:color.from` | TR-087 (theirs TR-65) color.from: ours null, theirs #4A453E | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1385%7Ccss:color.to` | TR-087 (theirs TR-65) color.to: ours null, theirs #fff | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1385%7Ccss:properties` | TR-087 (theirs TR-65) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1387%7Ccss:animation-name.to` | K-86 (theirs CA-65) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1387%7Ccss:properties` | K-86 (theirs CA-65) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1387%7Ccss:trigger.type` | K-86 (theirs CA-65) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1389%7Ccss:animation-name.to` | K-87 (theirs CA-66) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1389%7Ccss:properties` | K-87 (theirs CA-66) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1389%7Ccss:trigger.type` | K-87 (theirs CA-66) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1395%7Ccss:border-color.from` | TR-088 (theirs TR-66) border-color.from: ours null, theirs 2px solid {{ m.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1395%7Ccss:easing` | TR-088 (theirs TR-66) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C14%7Ccss:padding.to` | TR-001 (theirs TR-02) padding.to: ours null, theirs state-bound: navPad | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1402%7Ccss:animation-name.to` | K-88 (theirs CA-67) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1402%7Ccss:properties` | K-88 (theirs CA-67) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1402%7Ccss:trigger.type` | K-88 (theirs CA-67) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#hover%7Cborder-color:border-color.from` | TR-089 (theirs TR-67) border-color.from: ours null, theirs 1.5px dashed #C9C2B8 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#load%7Canimation-name,opacity:animation-name.to` | K-89 (theirs CA-68) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#load%7Canimation-name,opacity:properties` | K-89 (theirs CA-68) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1406%7Ccss#load%7Canimation-name,opacity:trigger.type` | K-89 (theirs CA-68) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1412%7Ccss:animation-name.to` | K-90 (theirs CA-69) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1412%7Ccss:properties` | K-90 (theirs CA-69) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1412%7Ccss:trigger.type` | K-90 (theirs CA-69) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1432%7Ccss:color.to` | TR-090 (theirs TR-68) color.to: ours null, theirs #12301E | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1432%7Ccss:properties` | TR-090 (theirs TR-68) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C1439%7Ccss:border-color.from` | TR-091 (theirs TR-69) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C161%7Ccss:border-color.from` | TR-014 (theirs TR-14) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C161%7Ccss:delay_ms` | TR-014 (theirs TR-14) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C161%7Ccss:duration_ms` | TR-014 (theirs TR-14) duration_ms: ours per property, theirs 400 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C23%7Ccss:border-color.from` | TR-002 (theirs TR-03) border-color.from: ours null, theirs 1px solid {{ ulSun }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C23%7Ccss:border-color.to` | TR-002 (theirs TR-03) border-color.to: ours null, theirs state-bound: ulSun | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C232%7Ccss:easing` | TR-021 (theirs TR-21) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C24%7Ccss:border-color.from` | TR-003 (theirs TR-04) border-color.from: ours null, theirs 1px solid {{ ulBrands }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C24%7Ccss:border-color.to` | TR-003 (theirs TR-04) border-color.to: ours null, theirs state-bound: ulBrands | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:color.from` | TR-022 (theirs TR-22) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:color.to` | TR-022 (theirs TR-22) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:easing` | TR-022 (theirs TR-22) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C244%7Ccss:properties` | TR-022 (theirs TR-22) properties: ours background,transform, theirs background,color,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C249%7Ccss:animation-name.to` | K-10 (theirs CA-10) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C249%7Ccss:properties` | K-10 (theirs CA-10) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C249%7Ccss:trigger.type` | K-10 (theirs CA-10) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C25%7Ccss:border-color.from` | TR-004 (theirs TR-05) border-color.from: ours null, theirs 1px solid {{ ulLenses }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C25%7Ccss:border-color.to` | TR-004 (theirs TR-05) border-color.to: ours null, theirs state-bound: ulLenses | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C266%7Ccss:animation-name.to` | K-11 (theirs CA-11) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C266%7Ccss:properties` | K-11 (theirs CA-11) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C266%7Ccss:trigger.type` | K-11 (theirs CA-11) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C271%7Ccss:animation-name.to` | K-12 (theirs CA-12) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C271%7Ccss:properties` | K-12 (theirs CA-12) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C271%7Ccss:trigger.type` | K-12 (theirs CA-12) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C283%7Ccss:transform.to` | TR-024 (theirs TR-24) transform.to: ours null, theirs state-bound: g.rot | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C286%7Ccss:animation-name.to` | K-13 (theirs CA-13) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C286%7Ccss:properties` | K-13 (theirs CA-13) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C286%7Ccss:trigger.type` | K-13 (theirs CA-13) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C29%7Ccss:easing` | TR-005 (theirs TR-06) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:background.from` | TR-025 (theirs TR-25) background.from: ours null, theirs {{ i.bg }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:background.to` | TR-025 (theirs TR-25) background.to: ours null, theirs state-bound: i.bg | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:color.from` | TR-025 (theirs TR-25) color.from: ours null, theirs {{ i.color }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:color.to` | TR-025 (theirs TR-25) color.to: ours null, theirs state-bound: i.color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C290%7Ccss:properties` | TR-025 (theirs TR-25) properties: ours all, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:background.from` | TR-026 (theirs TR-26) background.from: ours null, theirs {{ i.bg }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:background.to` | TR-026 (theirs TR-26) background.to: ours null, theirs state-bound: i.bg | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:border.from` | TR-026 (theirs TR-26) border.from: ours null, theirs 1px solid {{ i.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:border.to` | TR-026 (theirs TR-26) border.to: ours null, theirs state-bound: i.border | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:color.from` | TR-026 (theirs TR-26) color.from: ours null, theirs {{ i.color }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:color.to` | TR-026 (theirs TR-26) color.to: ours null, theirs state-bound: i.color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C294%7Ccss:properties` | TR-026 (theirs TR-26) properties: ours border-color, theirs background,border,border-color,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C31%7Ccss:font-size.to` | TR-006 (theirs TR-07) font-size.to: ours null, theirs state-bound: wordmarkSize | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C317%7Ccss:background.to` | TR-028 (theirs TR-28) background.to: ours null, theirs state-bound: polBg | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C318%7Ccss:left.to` | TR-029 (theirs TR-29) left.to: ours null, theirs state-bound: polKnob | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#hover%7Cfilter,transform:delay_ms` | TR-030 (theirs TR-30) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#hover%7Cfilter,transform:duration_ms` | TR-030 (theirs TR-30) duration_ms: ours per property, theirs 900 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#hover%7Cfilter,transform:filter.to` | TR-030 (theirs TR-30) filter.to: ours null, theirs state-bound: cur.imgFilter | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#load%7Canimation-name,opacity,transform:animation-name.to` | K-14 (theirs CA-14) animation-name.to: ours zoomIn, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#load%7Canimation-name,opacity,transform:properties` | K-14 (theirs CA-14) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C346%7Ccss#load%7Canimation-name,opacity,transform:trigger.type` | K-14 (theirs CA-14) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C356%7Ccss:border-color.from` | TR-031 (theirs TR-31) border-color.from: ours null, theirs 1px solid {{ t.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C356%7Ccss:border-color.to` | TR-031 (theirs TR-31) border-color.to: ours null, theirs state-bound: t.border | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C360%7Ccss:animation-name.to` | K-15 (theirs CA-15) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C360%7Ccss:properties` | K-15 (theirs CA-15) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C360%7Ccss:trigger.type` | K-15 (theirs CA-15) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C381%7Ccss:border-color.from` | TR-032 (theirs TR-32) border-color.from: ours null, theirs 1px solid {{ c.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C381%7Ccss:easing` | TR-032 (theirs TR-32) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:background.from` | TR-033 (theirs TR-33) background.from: ours null, theirs {{ s.bg }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:background.to` | TR-033 (theirs TR-33) background.to: ours null, theirs state-bound: s.bg | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:border.from` | TR-033 (theirs TR-33) border.from: ours null, theirs 1px solid {{ s.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:border.to` | TR-033 (theirs TR-33) border.to: ours null, theirs state-bound: s.border | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:color.from` | TR-033 (theirs TR-33) color.from: ours null, theirs {{ s.color }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:color.to` | TR-033 (theirs TR-33) color.to: ours null, theirs state-bound: s.color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C391%7Ccss:properties` | TR-033 (theirs TR-33) properties: ours border-color, theirs background,border,border-color,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C395%7Ccss:easing` | TR-034 (theirs TR-34) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C398%7Ccss:easing` | TR-035 (theirs TR-35) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C406%7Ccss:color.to` | TR-036 (theirs TR-36) color.to: ours null, theirs #0F2E1C | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C406%7Ccss:properties` | TR-036 (theirs TR-36) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C420%7Ccss:border-color.from` | TR-037 (theirs TR-37) border-color.from: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C420%7Ccss:color.to` | TR-037 (theirs TR-37) color.to: ours null, theirs state-bound: t.colour | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C420%7Ccss:easing` | TR-037 (theirs TR-37) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C422%7Ccss:animation-name.to` | K-16 (theirs CA-16) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C422%7Ccss:properties` | K-16 (theirs CA-16) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C422%7Ccss:trigger.type` | K-16 (theirs CA-16) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C430%7Ccss:animation-name.to` | K-17 (theirs CA-17) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C430%7Ccss:properties` | K-17 (theirs CA-17) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C430%7Ccss:trigger.type` | K-17 (theirs CA-17) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C436%7Ccss:animation-name.to` | K-18 (theirs CA-18) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C436%7Ccss:properties` | K-18 (theirs CA-18) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C436%7Ccss:trigger.type` | K-18 (theirs CA-18) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C46%7Ccss:easing` | TR-008 (theirs TR-08) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C498%7Ccss:transform.to` | TR-038 (theirs TR-38) transform.to: ours null, theirs state-bound: a.rot | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C500%7Ccss:animation-name.to` | K-19 (theirs CA-19) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C500%7Ccss:properties` | K-19 (theirs CA-19) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C500%7Ccss:trigger.type` | K-19 (theirs CA-19) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C51%7Ccss:animation-name.to` | K-02 (theirs CA-02) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C51%7Ccss:properties` | K-02 (theirs CA-02) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C51%7Ccss:trigger.type` | K-02 (theirs CA-02) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C516%7Ccss:width.to` | TR-039 (theirs TR-39) width.to: ours null, theirs state-bound: b.pct | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C53%7Ccss:animation-name.to` | K-03 (theirs CA-03) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C53%7Ccss:properties` | K-03 (theirs CA-03) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C53%7Ccss:trigger.type` | K-03 (theirs CA-03) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C553%7Ccss:animation-name.to` | K-20 (theirs CA-20) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C553%7Ccss:properties` | K-20 (theirs CA-20) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C553%7Ccss:trigger.type` | K-20 (theirs CA-20) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C554%7Ccss:animation-name.to` | K-21 (theirs CA-21) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C554%7Ccss:properties` | K-21 (theirs CA-21) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C554%7Ccss:trigger.type` | K-21 (theirs CA-21) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C555%7Ccss:animation-name.to` | K-22 (theirs CA-22) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C555%7Ccss:properties` | K-22 (theirs CA-22) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C555%7Ccss:trigger.type` | K-22 (theirs CA-22) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C604%7Ccss:animation-name.to` | K-23 (theirs CA-23) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C604%7Ccss:properties` | K-23 (theirs CA-23) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C604%7Ccss:trigger.type` | K-23 (theirs CA-23) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C605%7Ccss:animation-name.to` | K-24 (theirs CA-24) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C605%7Ccss:properties` | K-24 (theirs CA-24) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C605%7Ccss:trigger.type` | K-24 (theirs CA-24) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C606%7Ccss:animation-name.to` | K-25 (theirs CA-25) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C606%7Ccss:properties` | K-25 (theirs CA-25) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C606%7Ccss:trigger.type` | K-25 (theirs CA-25) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C607%7Ccss:animation-name.to` | K-26 (theirs CA-26) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C607%7Ccss:properties` | K-26 (theirs CA-26) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C607%7Ccss:trigger.type` | K-26 (theirs CA-26) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C608%7Ccss:animation-name.to` | K-27 (theirs CA-27) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C608%7Ccss:properties` | K-27 (theirs CA-27) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C608%7Ccss:trigger.type` | K-27 (theirs CA-27) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C609%7Ccss:animation-name.to` | K-28 (theirs CA-28) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C609%7Ccss:properties` | K-28 (theirs CA-28) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C609%7Ccss:trigger.type` | K-28 (theirs CA-28) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C610%7Ccss:animation-name.to` | K-29 (theirs CA-29) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C610%7Ccss:properties` | K-29 (theirs CA-29) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C610%7Ccss:trigger.type` | K-29 (theirs CA-29) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C611%7Ccss:color.from` | TR-041 (theirs TR-41) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C611%7Ccss:color.to` | TR-041 (theirs TR-41) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C611%7Ccss:properties` | TR-041 (theirs TR-41) properties: ours background, theirs background,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C614%7Ccss:animation-name.to` | K-30 (theirs CA-30) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C614%7Ccss:properties` | K-30 (theirs CA-30) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C614%7Ccss:trigger.type` | K-30 (theirs CA-30) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C651%7Ccss:transform.to` | TR-042 (theirs TR-42) transform.to: ours null, theirs state-bound: q.rot | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C653%7Ccss:animation-name.to` | K-31 (theirs CA-31) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C653%7Ccss:properties` | K-31 (theirs CA-31) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C653%7Ccss:trigger.type` | K-31 (theirs CA-31) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:color.from` | TR-043 (theirs TR-43) color.from: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:color.to` | TR-043 (theirs TR-43) color.to: ours null, theirs #0B2B17 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:easing` | TR-043 (theirs TR-43) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C668%7Ccss:properties` | TR-043 (theirs TR-43) properties: ours background,transform, theirs background,color,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C700%7Ccss:animation-name.to` | K-32 (theirs CA-32) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C700%7Ccss:properties` | K-32 (theirs CA-32) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C700%7Ccss:trigger.type` | K-32 (theirs CA-32) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C743%7Ccss:animation-name.to` | K-33 (theirs CA-33) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C743%7Ccss:properties` | K-33 (theirs CA-33) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C743%7Ccss:trigger.type` | K-33 (theirs CA-33) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C752%7Ccss:animation-name.to` | K-34 (theirs CA-34) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C752%7Ccss:properties` | K-34 (theirs CA-34) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C752%7Ccss:trigger.type` | K-34 (theirs CA-34) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C765%7Ccss:animation-name.to` | K-35 (theirs CA-70) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C765%7Ccss:properties` | K-35 (theirs CA-70) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C765%7Ccss:trigger.type` | K-35 (theirs CA-70) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C770%7Ccss:animation-name.to` | K-36 (theirs CA-35) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C770%7Ccss:properties` | K-36 (theirs CA-35) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C770%7Ccss:trigger.type` | K-36 (theirs CA-35) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:background.from` | TR-045 (theirs TR-45) background.from: ours null, theirs {{ delBg }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:background.to` | TR-045 (theirs TR-45) background.to: ours null, theirs state-bound: delBg | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:border.from` | TR-045 (theirs TR-45) border.from: ours null, theirs 1px solid {{ delBorder }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:border.to` | TR-045 (theirs TR-45) border.to: ours null, theirs state-bound: delBorder | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C774%7Ccss:properties` | TR-045 (theirs TR-45) properties: ours border-color, theirs background,border,border-color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:background.from` | TR-046 (theirs TR-46) background.from: ours null, theirs {{ colBg }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:background.to` | TR-046 (theirs TR-46) background.to: ours null, theirs state-bound: colBg | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:border.from` | TR-046 (theirs TR-46) border.from: ours null, theirs 1px solid {{ colBorder }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:border.to` | TR-046 (theirs TR-46) border.to: ours null, theirs state-bound: colBorder | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C779%7Ccss:properties` | TR-046 (theirs TR-46) properties: ours border-color, theirs background,border,border-color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C785%7Ccss:animation-name.to` | K-37 (theirs CA-36) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C785%7Ccss:properties` | K-37 (theirs CA-36) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C785%7Ccss:trigger.type` | K-37 (theirs CA-36) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C792%7Ccss:animation-name.to` | K-38 (theirs CA-37) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C792%7Ccss:properties` | K-38 (theirs CA-37) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C792%7Ccss:trigger.type` | K-38 (theirs CA-37) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:background.from` | TR-047 (theirs TR-47) background.from: ours null, theirs {{ m.bg }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:background.to` | TR-047 (theirs TR-47) background.to: ours null, theirs state-bound: m.bg | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:border.from` | TR-047 (theirs TR-47) border.from: ours null, theirs 1px solid {{ m.border }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:border.to` | TR-047 (theirs TR-47) border.to: ours null, theirs state-bound: m.border | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:color.from` | TR-047 (theirs TR-47) color.from: ours null, theirs {{ m.color }} | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:color.to` | TR-047 (theirs TR-47) color.to: ours null, theirs state-bound: m.color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C798%7Ccss:properties` | TR-047 (theirs TR-47) properties: ours all, theirs background,border,color | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:animation-name.to` | K-01 (theirs CA-01) animation-name.to: ours tickerAnim, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:duration_ms` | K-01 (theirs CA-01) duration_ms: ours 0, theirs 30000 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:easing` | K-01 (theirs CA-01) easing: ours ease, theirs linear | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:iterations` | K-01 (theirs CA-01) iterations: ours 1, theirs infinite | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:properties` | K-01 (theirs CA-01) properties: ours animation-name, theirs transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:transform.from` | K-01 (theirs CA-01) transform.from: ours null, theirs translateX(0) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:transform.to` | K-01 (theirs CA-01) transform.to: ours null, theirs translateX(-50%) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C8%7Ccss#load%7Canimation-name:trigger.type` | K-01 (theirs CA-01) trigger.type: ours load, theirs media-query | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C805%7Ccss:animation-name.to` | K-39 (theirs CA-38) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C805%7Ccss:properties` | K-39 (theirs CA-38) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C805%7Ccss:trigger.type` | K-39 (theirs CA-38) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C806%7Ccss:animation-name.to` | K-40 (theirs CA-39) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C806%7Ccss:properties` | K-40 (theirs CA-39) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C806%7Ccss:trigger.type` | K-40 (theirs CA-39) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C817%7Ccss:animation-name.to` | K-41 (theirs CA-40) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C817%7Ccss:properties` | K-41 (theirs CA-40) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C817%7Ccss:trigger.type` | K-41 (theirs CA-40) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C846%7Ccss:animation-name.to` | K-42 (theirs CA-41) animation-name.to: ours pop, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C846%7Ccss:properties` | K-42 (theirs CA-41) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C846%7Ccss:trigger.type` | K-42 (theirs CA-41) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C847%7Ccss:animation-name.to` | K-43 (theirs CA-42) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C847%7Ccss:properties` | K-43 (theirs CA-42) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C847%7Ccss:trigger.type` | K-43 (theirs CA-42) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C848%7Ccss:animation-name.to` | K-44 (theirs CA-43) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C848%7Ccss:properties` | K-44 (theirs CA-43) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C848%7Ccss:trigger.type` | K-44 (theirs CA-43) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C850%7Ccss:animation-name.to` | K-45 (theirs CA-71) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C850%7Ccss:properties` | K-45 (theirs CA-71) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C850%7Ccss:trigger.type` | K-45 (theirs CA-71) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C852%7Ccss:animation-name.to` | K-46 (theirs CA-44) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C852%7Ccss:properties` | K-46 (theirs CA-44) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C852%7Ccss:trigger.type` | K-46 (theirs CA-44) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C854%7Ccss#load%7Canimation-name,opacity,transform:animation-name.to` | K-47 (theirs CA-72) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C854%7Ccss#load%7Canimation-name,opacity,transform:properties` | K-47 (theirs CA-72) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C854%7Ccss#load%7Canimation-name,opacity,transform:trigger.type` | K-47 (theirs CA-72) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C858%7Ccss:animation-name.to` | K-48 (theirs CA-73) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C858%7Ccss:properties` | K-48 (theirs CA-73) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C858%7Ccss:trigger.type` | K-48 (theirs CA-73) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C863%7Ccss:animation-name.to` | K-49 (theirs CA-74) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C863%7Ccss:properties` | K-49 (theirs CA-74) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C863%7Ccss:trigger.type` | K-49 (theirs CA-74) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C864%7Ccss:animation-name.to` | K-50 (theirs CA-75) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C864%7Ccss:properties` | K-50 (theirs CA-75) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C864%7Ccss:trigger.type` | K-50 (theirs CA-75) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C887%7Ccss:animation-name.to` | K-51 (theirs CA-76) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C887%7Ccss:properties` | K-51 (theirs CA-76) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C887%7Ccss:trigger.type` | K-51 (theirs CA-76) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C897%7Ccss:animation-name.to` | K-52 (theirs CA-77) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C897%7Ccss:properties` | K-52 (theirs CA-77) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C897%7Ccss:trigger.type` | K-52 (theirs CA-77) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C906%7Ccss:animation-name.to` | K-53 (theirs CA-78) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C906%7Ccss:properties` | K-53 (theirs CA-78) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C906%7Ccss:trigger.type` | K-53 (theirs CA-78) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C916%7Ccss:animation-name.to` | K-54 (theirs CA-79) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C916%7Ccss:properties` | K-54 (theirs CA-79) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C916%7Ccss:trigger.type` | K-54 (theirs CA-79) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C920%7Ccss:animation-name.to` | K-55 (theirs CA-80) animation-name.to: ours rise, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C920%7Ccss:properties` | K-55 (theirs CA-80) properties: ours animation-name,opacity,transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C920%7Ccss:trigger.type` | K-55 (theirs CA-80) trigger.type: ours load, theirs route | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C934%7Ccss:animation-name.to` | K-56 (theirs CA-81) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C934%7Ccss:properties` | K-56 (theirs CA-81) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C934%7Ccss:trigger.type` | K-56 (theirs CA-81) trigger.type: ours load, theirs mount | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C955%7Ccss:animation-name.to` | K-57 (theirs CA-82) animation-name.to: ours fade, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C955%7Ccss:properties` | K-57 (theirs CA-82) properties: ours animation-name,opacity, theirs opacity | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham%7Ctpl%7C955%7Ccss:trigger.type` | K-57 (theirs CA-82) trigger.type: ours load, theirs state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:delay_ms` | J-01 (theirs J-02) delay_ms: ours 0, theirs min(i, 7) * 70 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:duration_ms` | J-01 (theirs J-02) duration_ms: ours 250, theirs 460 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:easing` | J-01 (theirs J-02) easing: ours ease, theirs easeOutCubic: 1-(1-p)^3 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:only-ours` | J-02 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:only-ours~2` | J-03 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:only-ours~3` | J-04 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:opacity.from` | J-01 (theirs J-02) opacity.from: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:opacity.to` | J-01 (theirs J-02) opacity.to: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:properties` | J-01 (theirs J-02) properties: ours opacity, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:transform.from` | J-01 (theirs J-02) transform.from: ours null, theirs translateY(26px) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2582%7Cjs:transform.to` | J-01 (theirs J-02) transform.to: ours null, theirs translateY(0) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours` | J-05 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours~2` | J-06 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours~3` | J-07 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2583%7Cjs:only-ours~4` | J-08 js-style-write js-style-write in show on el is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2614%7Cjs:only-ours` | J-09 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2614%7Cjs:only-ours~2` | J-10 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2614%7Cjs:only-ours~3` | J-11 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:duration_ms` | J-12 (theirs J-01) duration_ms: ours 400, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:easing` | J-12 (theirs J-01) easing: ours ease, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:only-ours` | J-13 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:only-ours~2` | J-14 js-style-write js-style-write in reveals on [data-reveal]:not([data-rv]) is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:opacity.to` | J-12 (theirs J-01) opacity.to: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2615%7Cjs:properties` | J-12 (theirs J-01) properties: ours transform, theirs opacity,transform | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2623%7Cjs:duration_ms` | J-15 (theirs J-05) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2623%7Cjs:transform.from` | J-15 (theirs J-05) transform.from: ours null, theirs translate3d(0,0,0) | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2628%7Cjs:only-ours` | J-16 js-style-write js-style-write in lockScroll on document.documentElement is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2665%7Cjs:only-ours` | J-17 js-style-write js-style-write in componentWillUnmount on document.documentElement is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:properties` | J-18 (theirs J-06) properties: ours scroll-position, theirs scrollTop | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:reduced_motion.behaviour` | J-18 (theirs J-06) reduced_motion.behaviour: ours final-state, theirs unchanged | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:scrollTop.from` | J-18 (theirs J-06) scrollTop.from: ours null, theirs current | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2692%7Cjs:scrollTop.to` | J-18 (theirs J-06) scrollTop.to: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C2980%7Cjs:only-ours` | J-19 js-scroll js-scroll in renderVals on window is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:duration_ms` | J-20 (theirs J-07) duration_ms: ours 0, theirs browser smooth scroll | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:easing` | J-20 (theirs J-07) easing: ours null, theirs browser default | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:properties` | J-20 (theirs J-07) properties: ours scroll-position, theirs scrollLeft | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:reduced_motion.behaviour` | J-20 (theirs J-07) reduced_motion.behaviour: ours final-state, theirs skip | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:scrollLeft.from` | J-20 (theirs J-07) scrollLeft.from: ours null, theirs current | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:status` | J-20 (theirs J-07) status: ours dead-code, theirs active | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3136%7Cjs:trigger.type` | J-20 (theirs J-07) trigger.type: ours state, theirs press | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Eye Care Birmingham.dc.html%7C3137%7Cjs:only-ours` | J-21 js-scroll js-scroll in renderVals on .rev-rail is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect | ours |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:border-color.from` | TR-094 (theirs TR-72) border-color.from: ours null, theirs 1px solid #E6E1DA | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:delay_ms` | TR-094 (theirs TR-72) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:duration_ms` | TR-094 (theirs TR-72) duration_ms: ours per property, theirs 400 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C0%7Ccss:reduced_motion.behaviour` | TR-094 (theirs TR-72) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C10%7Ccss:easing` | TR-096 (theirs TR-74) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C10%7Ccss:reduced_motion.behaviour` | TR-096 (theirs TR-74) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:delay_ms` | TR-095 (theirs TR-73) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:duration_ms` | TR-095 (theirs TR-73) duration_ms: ours per property, theirs 900 | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:filter.to` | TR-095 (theirs TR-73) filter.to: ours null, theirs state-bound: p.imgFilter | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C3%7Ccss:reduced_motion.behaviour` | TR-095 (theirs TR-73) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:Frame Card%7Ctpl%7C31%7Ccss:reduced_motion.behaviour` | TR-097 (theirs TR-75) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C16%7Ccss:only-theirs` | Claude Design's PS-14 css-pseudo Global link hover colour has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C18%7Ccss:only-theirs` | Claude Design's PS-15 css-pseudo Focus outline has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2567%7Cjs:only-theirs` | Claude Design's J-03 js-style-write Scroll reveal: clean-up has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2594%7Cjs:only-theirs` | Claude Design's J-04 js-style-write Scroll reveal: show all at once (no IntersectionObserver, or reduced motion) has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2627%7Cjs:only-theirs` | Claude Design's J-08 js-style-write Page scroll lock behind overlays has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C28%7Cmedia:only-theirs` | Claude Design's RM-01 css-media Reduced-motion media rule has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C2979%7Cjs:only-theirs` | Claude Design's J-09 js-scroll Scroll to top on opening an order has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:anim:theirs:Eye Care Birmingham.dc.html%7C34%7Ccss:only-theirs` | Claude Design's PS-16 css-pseudo Reviews rail scrollbar thumb hover has no re-derived record | ours | only Claude Design's inventory has this effect | ours |
| `inventory:count:css_animations` | count css_animations: ours 112, theirs 90 | ours | a recount replaces any count carried from an older inventory | ours |
| `inventory:count:js_style_writers` | count js_style_writers: ours 11, theirs 17 | ours | a recount replaces any count carried from an older inventory | ours |
| `inventory:surface-count:toggling_sc_ifs` | surface count toggling_sc_ifs: ours 0, theirs 80 | ours | a recount replaces any count carried from an older inventory | ours |
| `inventory:surface:Eye Care Birmingham%7C0:states` | S-01 (theirs S-01) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route%7Cdone:states` | S-11 (theirs S-16) states: ours 1, theirs 2 | ours | the re-derived surface and Claude Design's list a different number of states |  |
| `inventory:surface:route%7Chome:states` | S-03 (theirs S-08) states: ours 1, theirs 2 | ours | the re-derived surface and Claude Design's list a different number of states | ours |
| `inventory:surface:route:account:only-theirs` | route account is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1004:only-theirs` | toggling-sc-if Eye Care Birmingham :1004 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1008:only-theirs` | toggling-sc-if Eye Care Birmingham :1008 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1025:only-theirs` | toggling-sc-if Eye Care Birmingham :1025 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1028:only-theirs` | toggling-sc-if Eye Care Birmingham :1028 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1035:only-theirs` | toggling-sc-if Eye Care Birmingham :1035 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1037:only-theirs` | toggling-sc-if Eye Care Birmingham :1037 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1040:only-theirs` | toggling-sc-if Eye Care Birmingham :1040 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1043:only-theirs` | toggling-sc-if Eye Care Birmingham :1043 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1050:only-theirs` | toggling-sc-if Eye Care Birmingham :1050 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1053:only-theirs` | toggling-sc-if Eye Care Birmingham :1053 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1057:only-theirs` | toggling-sc-if Eye Care Birmingham :1057 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1065:only-theirs` | toggling-sc-if Eye Care Birmingham :1065 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1067:only-theirs` | toggling-sc-if Eye Care Birmingham :1067 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1069:only-theirs` | toggling-sc-if Eye Care Birmingham :1069 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1081:only-theirs` | toggling-sc-if Eye Care Birmingham :1081 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1086:only-theirs` | toggling-sc-if Eye Care Birmingham :1086 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1092:only-theirs` | toggling-sc-if Eye Care Birmingham :1092 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1097:only-theirs` | toggling-sc-if Eye Care Birmingham :1097 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1122:only-theirs` | toggling-sc-if Eye Care Birmingham :1122 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1164:only-theirs` | toggling-sc-if Eye Care Birmingham :1164 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1195:only-theirs` | toggling-sc-if Eye Care Birmingham :1195 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1204:only-theirs` | toggling-sc-if Eye Care Birmingham :1204 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1221:only-theirs` | toggling-sc-if Eye Care Birmingham :1221 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1224:only-theirs` | toggling-sc-if Eye Care Birmingham :1224 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1234:only-theirs` | toggling-sc-if Eye Care Birmingham :1234 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1277:only-theirs` | toggling-sc-if Eye Care Birmingham :1277 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1282:only-theirs` | toggling-sc-if Eye Care Birmingham :1282 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1299:only-theirs` | toggling-sc-if Eye Care Birmingham :1299 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1321:only-theirs` | toggling-sc-if Eye Care Birmingham :1321 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1342:only-theirs` | toggling-sc-if Eye Care Birmingham :1342 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1344:only-theirs` | toggling-sc-if Eye Care Birmingham :1344 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1366:only-theirs` | toggling-sc-if Eye Care Birmingham :1366 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1368:only-theirs` | toggling-sc-if Eye Care Birmingham :1368 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1386:only-theirs` | toggling-sc-if Eye Care Birmingham :1386 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1388:only-theirs` | toggling-sc-if Eye Care Birmingham :1388 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1401:only-theirs` | toggling-sc-if Eye Care Birmingham :1401 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1405:only-theirs` | toggling-sc-if Eye Care Birmingham :1405 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1411:only-theirs` | toggling-sc-if Eye Care Birmingham :1411 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1438:only-theirs` | toggling-sc-if Eye Care Birmingham :1438 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1440:only-theirs` | toggling-sc-if Eye Care Birmingham :1440 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1444:only-theirs` | toggling-sc-if Eye Care Birmingham :1444 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :1446:only-theirs` | toggling-sc-if Eye Care Birmingham :1446 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :263:only-theirs` | toggling-sc-if Eye Care Birmingham :263 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :270:only-theirs` | toggling-sc-if Eye Care Birmingham :270 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :272:only-theirs` | toggling-sc-if Eye Care Birmingham :272 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :285:only-theirs` | toggling-sc-if Eye Care Birmingham :285 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :319:only-theirs` | toggling-sc-if Eye Care Birmingham :319 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :328:only-theirs` | toggling-sc-if Eye Care Birmingham :328 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :421:only-theirs` | toggling-sc-if Eye Care Birmingham :421 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :429:only-theirs` | toggling-sc-if Eye Care Birmingham :429 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :435:only-theirs` | toggling-sc-if Eye Care Birmingham :435 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :44:only-theirs` | toggling-sc-if Eye Care Birmingham :44 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :499:only-theirs` | toggling-sc-if Eye Care Birmingham :499 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :52:only-theirs` | toggling-sc-if Eye Care Birmingham :52 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :55:only-theirs` | toggling-sc-if Eye Care Birmingham :55 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :652:only-theirs` | toggling-sc-if Eye Care Birmingham :652 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :699:only-theirs` | toggling-sc-if Eye Care Birmingham :699 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :73:only-theirs` | toggling-sc-if Eye Care Birmingham :73 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :758:only-theirs` | toggling-sc-if Eye Care Birmingham :758 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :764:only-theirs` | toggling-sc-if Eye Care Birmingham :764 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :768:only-theirs` | toggling-sc-if Eye Care Birmingham :768 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :784:only-theirs` | toggling-sc-if Eye Care Birmingham :784 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :791:only-theirs` | toggling-sc-if Eye Care Birmingham :791 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :799:only-theirs` | toggling-sc-if Eye Care Birmingham :799 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :804:only-theirs` | toggling-sc-if Eye Care Birmingham :804 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :849:only-theirs` | toggling-sc-if Eye Care Birmingham :849 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :853:only-theirs` | toggling-sc-if Eye Care Birmingham :853 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :857:only-theirs` | toggling-sc-if Eye Care Birmingham :857 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :85:only-theirs` | toggling-sc-if Eye Care Birmingham :85 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :862:only-theirs` | toggling-sc-if Eye Care Birmingham :862 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :886:only-theirs` | toggling-sc-if Eye Care Birmingham :886 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :896:only-theirs` | toggling-sc-if Eye Care Birmingham :896 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :905:only-theirs` | toggling-sc-if Eye Care Birmingham :905 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :915:only-theirs` | toggling-sc-if Eye Care Birmingham :915 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :92:only-theirs` | toggling-sc-if Eye Care Birmingham :92 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :933:only-theirs` | toggling-sc-if Eye Care Birmingham :933 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :936:only-theirs` | toggling-sc-if Eye Care Birmingham :936 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :949:only-theirs` | toggling-sc-if Eye Care Birmingham :949 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:Eye Care Birmingham :954:only-theirs` | toggling-sc-if Eye Care Birmingham :954 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
| `inventory:surface:toggling-sc-if:WP Build Gap Map :73:only-theirs` | toggling-sc-if WP Build Gap Map :73 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it | ours |
