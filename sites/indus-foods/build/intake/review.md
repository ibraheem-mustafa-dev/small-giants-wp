# Intake review: indus-foods

Taken on 2026-10-19T00:24:42.713Z; manifest 1.0, files hash dd9e9aec7ae9a787.

How to mark: put x in a section's `Accept all: [ ]` box to give every row the section's first mark; to mark one row differently, write its mark in that row's Mark cell (a row's own mark always beats Accept all). Flag rows left blank are accepted as flagged and not-a-defect rows left blank stay not defects; every other row needs Accept all or its own mark. Rows marked **changed** differ from the last export, lost their old mark and come first. Then run `node scripts/computed-route/intake.mjs --apply-review indus-foods`.

Rows: 1299; 672 need reading, 627 are confident proposals that Accept all covers (skeleton block choices 465, missing features 162).

Not defects counted, not listed: breakpoint 84, dead-code (constant guard) 5, dead-code (data-gated) 7, prop-variant 2, prototype-only 21, reached-when-forced 144, render-wins 552.

Marks per section (first value = Accept all):
- Page map: `accept`, `edit:<field>=<value>`, `drop`
- Palette roles: `accept`, `role:<slug>`, `one-off`
- Site Info: `accept`, `edit:<value>`, `drop`
- Flags: `accept-flagged`, `not-flagged`
- Draft defects: `accept`, `render-wins`
- Not defects: unwired code: `not-a-defect`, `defect`
- Missing features: `map:<block>`, `difference`, `build`, `gap:<wave>`
- Skeleton block choices: `accept`, `block:<slug>`, `remove`
- Inventory diffs: `ours`, `theirs`
- Notices: `noted`

## Page map (page-map)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `page:page:about` | about → About Us (page, static) | about | header #2 |  |
| `page:page:apply` | apply → Apply for Trade Account (page, static) | apply | header #5, drawer #1, footer #2 |  |
| `page:page:blog` | blog → Blog (page, live) | about/blog | drawer #6, footer #6 |  |
| `page:page:brand-green-leaf` | brand-green-leaf → Green Leaf (page, static) | brands/brand-green-leaf | drawer #3 |  |
| `page:page:brand-lemon-tree` | brand-lemon-tree → The Lemon Tree (page, static) | brands/brand-lemon-tree | drawer #4 |  |
| `page:page:brand-sanam` | brand-sanam → Sanam (page, static) | brands/brand-sanam | drawer #1 |  |
| `page:page:brand-shan` | brand-shan → Shan (page, static) | brands/brand-shan | drawer #2 |  |
| `page:page:brands` | brands → All Brands (page, static) | brands | header #4, drawer #5, footer #3 |  |
| `page:page:careers` | careers → Careers (page, static) | about/careers | drawer #5 |  |
| `page:page:catalogue` | catalogue → Request Catalogue (page, static) | catalogue | drawer #2 |  |
| `page:page:certifications` | certifications → Certifications (page, static) | about/certifications | drawer #2, footer #1 |  |
| `page:page:community` | community → Community & Charity (page, static) | about/community | drawer #3 |  |
| `page:page:contact` | contact → Contact Us (page, static) | contact | header #6 |  |
| `page:page:delivery` | delivery → Delivery & Logistics (page, static) | delivery | drawer #3, footer #4 |  |
| `page:page:faqs` | faqs → FAQs (page, static) | faqs | drawer #4 |  |
| `page:page:food-service` | food-service → Food service supply for kitchens that never stop. (page, static) | food-service | header #3, drawer #1 |  |
| `page:page:home` | home → Home (page, static) | home | header #1 |  |
| `page:page:manufacturing` | manufacturing → Bulk ingredients for food manufacturers. (page, static) | manufacturing | drawer #2 |  |
| `page:page:our-story` | our-story → Our Story (page, static) | about/our-story | drawer #1 |  |
| `page:page:retail` | retail → Retail-ready ranges your customers look for. (page, static) | retail | drawer #3 |  |
| `page:page:sustainability` | sustainability → Sustainability (page, static) | about/sustainability | drawer #4 |  |
| `page:page:terms` | terms → Terms & Conditions (page, static) | terms | drawer #5, footer #5 |  |
| `page:page:wholesale` | wholesale → Pallet volumes for wholesalers and cash & carries. (page, static) | wholesale | drawer #4 |  |
| `page:post:falak-rice-exclusive-uk-distribution` | post-post-2 → Falak rice: exclusive UK distribution (post, live) | falak-rice-exclusive-uk-distribution |  |  |
| `page:post:inside-our-birmingham-packing-line` | post-post-3 → Inside our Birmingham packing line (post, live) | inside-our-birmingham-packing-line |  |  |
| `page:post:ordering-ahead-for-eid` | post-post-5 → Ordering ahead for Eid (post, live) | ordering-ahead-for-eid |  |  |
| `page:post:sixty-years-in-the-balti-triangle` | post-post-4 → Sixty years in the Balti Triangle (post, live) | sixty-years-in-the-balti-triangle |  |  |
| `page:post:supporting-the-trade-through-ramadan` | post-post-1 → Supporting the trade through Ramadan (post, live) | supporting-the-trade-through-ramadan |  |  |
| `page:post:why-independents-still-matter` | post-post-6 → Why independents still matter (post, live) | why-independents-still-matter |  |  |
| `page:sgs_drawer:drawer-site-menu` | (no route) → Site menu (sgs_drawer, static) | drawer-site-menu |  |  |
| `page:sgs_footer:footer` | (no route) → Footer (sgs_footer, static) | footer |  |  |
| `page:sgs_form:form-careers` | (no route) → Register your interest (sgs_form, static) | form-careers |  |  |
| `page:sgs_form:form-catalogue` | (no route) → Where should we send it? (sgs_form, static) | form-catalogue |  |  |
| `page:sgs_form:form-enquiry-form` | (no route) → Enquiry Form (sgs_form, static) | form-enquiry-form |  |  |
| `page:sgs_form:form-trade-application` | (no route) → Trade Application (sgs_form, static) | form-trade-application |  |  |
| `page:sgs_header:header` | (no route) → Header (sgs_header, static) | header |  |  |
| `page:sgs_mega_menu:mega-menu-about` | (no route) → About mega menu (sgs_mega_menu, static) | mega-menu-about | header #2 |  |
| `page:sgs_mega_menu:mega-menu-brands` | (no route) → Brands mega menu (sgs_mega_menu, static) | mega-menu-brands | header #4 |  |
| `page:sgs_mega_menu:mega-menu-sectors` | (no route) → Sectors mega menu (sgs_mega_menu, static) | mega-menu-sectors | header #3 |  |
| `page:sgs_mega_menu:mega-menu-trade` | (no route) → Trade mega menu (sgs_mega_menu, static) | mega-menu-trade | header #5 |  |

## Palette roles (palette-role)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `palette:--border-accent` | --border-accent #D8CA50 | role:custom-border-accent | 0.8: a saturated border is not the divider slug (FR-33-2 border guard) |  |
| `palette:--brand-blue` | --brand-blue #0A7EA8 | role:primary | 0.9: the most used brand colour (800 uses) |  |
| `palette:--brand-blue-hover` | --brand-blue-hover #075E80 | role:primary-dark | 0.9: hover shade of the primary family |  |
| `palette:--brand-blue-light` | --brand-blue-light #2EADE2 | role:custom-brand-blue-light | 0.8: light shade of the primary family has no slug |  |
| `palette:--brand-gold` | --brand-gold #D8CA50 | role:accent | 0.9: the second most used brand colour (667 uses) |  |
| `palette:--brand-gold-light` | --brand-gold-light #E7D768 | role:accent-light | 0.9: light shade of the accent family |  |
| `palette:--brand-gold-mid` | --brand-gold-mid #E3D35F | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--brand-gold-pale` | --brand-gold-pale #EBDD78 | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--grey-body` | --grey-body #4A5563 | role:text | 0.95: name says body text; usage agrees |  |
| `palette:--grey-muted` | --grey-muted #68727C | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--ink` | --ink #1E2A3C | role:custom-ink | 0.3: used mostly as dark, low-chroma text colour; text went to --grey-body |  |
| `palette:--selection-bg` | --selection-bg #D8CA50 | role:custom-selection-bg | 0.8: header, selection and social colours have no palette slug (FR-33-13, FR-33-16) |  |
| `palette:--selection-fg` | --selection-fg #1E2A3C | role:custom-selection-fg | 0.8: header, selection and social colours have no palette slug (FR-33-13, FR-33-16) |  |
| `palette:--slate` | --slate #2C3E50 | role:heading | 0.85: same value as --text-heading |  |
| `palette:--social-facebook` | --social-facebook #1877F2 | role:custom-social-facebook | 0.8: header, selection and social colours have no palette slug (FR-33-13, FR-33-16) |  |
| `palette:--social-google` | --social-google #EA4335 | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--social-linkedin` | --social-linkedin #0A66C2 | role:custom-social-linkedin | 0.8: header, selection and social colours have no palette slug (FR-33-13, FR-33-16) |  |
| `palette:--surface-cool` | --surface-cool #F2F5F7 | role:surface-alt | 0.7: name says surface; surface went to --surface-white, so surface-alt |  |
| `palette:--surface-header` | --surface-header #FFFFFF | role:custom-surface-header | 0.8: header, selection and social colours have no palette slug (FR-33-13, FR-33-16) |  |
| `palette:--surface-section-blue` | --surface-section-blue #0A7EA8 | role:custom-surface-section-blue | 0.3: name says section ground; section went to --surface-section-gold |  |
| `palette:--surface-section-gold` | --surface-section-gold #D8CA50 | role:section | 0.9: name says section ground |  |
| `palette:--surface-topbar` | --surface-topbar #0A7EA8 | role:custom-surface-topbar | 0.8: header, selection and social colours have no palette slug (FR-33-13, FR-33-16) |  |
| `palette:--surface-warm` | --surface-warm #FAFAF8 | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--surface-white` | --surface-white #FFFFFF | role:surface | 0.9: name says surface |  |
| `palette:--text-body` | --text-body #4A5563 | role:text | 0.95: name says body text; usage agrees |  |
| `palette:--text-heading` | --text-heading #2C3E50 | role:heading | 0.9: name says heading |  |
| `palette:--text-link` | --text-link #0A7EA8 | role:link | 0.9: name says link |  |
| `palette:--text-link-hover` | --text-link-hover #075E80 | role:link-hover | 0.9: name says link hover |  |
| `palette:--text-muted` | --text-muted #68727C | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--tint-on-blue` | --tint-on-blue #E3EFF4 | role:custom-tint-on-blue | 0.3: no confident match; stays a custom colour (FR-33-2) |  |
| `palette:--whatsapp-green` | --whatsapp-green #25D366 | role:whatsapp | 0.9: name says WhatsApp |  |

## Site Info (site-info)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `siteinfo:address#1` | address: 55-58 Stratford St N, Birmingham B11 1BU, United Kingdom | 55-58 Stratford St N, Birmingham B11 1BU, United Kingdom | Indus Foods Website v2:710, Indus Foods Website v2:714 |  |
| `siteinfo:address#2` | address: 55–58 Stratford Street North, Sparkbrook, Birmingham B11 1BU | 55-58 Stratford Street North, Sparkbrook, Birmingham B11 1BU | Indus Foods Website v2.dc.html:js:2256:9 |  |
| `siteinfo:copyright` | copyright: © 2026 Indus Foods Ltd | © 2026 Indus Foods Ltd | Indus Foods Website v2.dc.html |  |
| `siteinfo:email` | email: amir@indusfoodsltd.com | amir@indusfoodsltd.com | Indus Foods Website v2:20, Indus Foods Website v2:117, Indus Foods Website v2:584, Indus Foods Website v2:664, Indus Foods Website v2:667, Indus Foods Website v2.dc.html:js:2258:9, Indus Foods Website v2.dc.html:js:2258:123, Indus Foods Website v2.dc.html |  |
| `siteinfo:hours.friday` | hours.friday: 09:30–12:00, 14:30–17:00 | 09:30–12:00, 14:30–17:00 | Indus Foods Website v2.dc.html:js:1110:49 |  |
| `siteinfo:hours.monday` | hours.monday: 09:30–17:00 | 09:30–17:00 | Indus Foods Website v2.dc.html:js:1110:49 |  |
| `siteinfo:hours.saturday` | hours.saturday: 10:00–15:00 | 10:00–15:00 | Indus Foods Website v2.dc.html:js:1110:49 |  |
| `siteinfo:hours.sunday` | hours.sunday: closed | closed | Indus Foods Website v2.dc.html:js:1110:49 |  |
| `siteinfo:hours.thursday` | hours.thursday: 09:30–17:00 | 09:30–17:00 | Indus Foods Website v2.dc.html:js:1110:49 |  |
| `siteinfo:hours.tuesday` | hours.tuesday: 09:30–17:00 | 09:30–17:00 | Indus Foods Website v2.dc.html:js:1110:49 |  |
| `siteinfo:hours.wednesday` | hours.wednesday: 09:30–17:00 | 09:30–17:00 | Indus Foods Website v2.dc.html:js:1110:49 |  |
| `siteinfo:phone` | phone: 0121 771 4330 | 01217714330 | Indus Foods Website v2:14, Indus Foods Website v2:116, Indus Foods Website v2:583, Indus Foods Website v2:658, Indus Foods Website v2:661, Indus Foods Website v2.dc.html:js:2257:9, Indus Foods Website v2.dc.html:js:1543:325, Indus Foods Website v2.dc.html:js:2257:92, Indus Foods Website v2.dc.html, TradeApplication:101, TradeApplication:105, TradeApplication.dc.html |  |
| `siteinfo:socials.google` | socials.google: https://www.google.com/maps/dir/?api=1&destination=55-58+Stratford+Street+North+Birmingham+B11+1BU | https://www.google.com/maps/dir/?api=1&destination=55-58+Stratford+Street+North+Birmingham+B11+1BU | Indus Foods Website v2:539, Indus Foods Website v2:717 |  |
| `siteinfo:socials.whatsapp` | socials.whatsapp: https://wa.me/441217714330 | https://wa.me/441217714330 | Indus Foods Website v2:728, Indus Foods Website v2.dc.html |  |

## Flags (flag)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `flag:placeholder:Indus Foods Website v2:101` | placeholder: {{ logo.name }} | accept-flagged | empty image-slot placeholder awaiting a real image; 2 rows with this text |  |
| `flag:placeholder:Indus Foods Website v2:141` | placeholder: {{ item.mobileFeature.imgLabel }} | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:217` | placeholder: Hero banner: spices in bowls on a wooden table | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:225` | placeholder: {{ l.name }} | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:23` | placeholder: socials.linkedin #/ | accept-flagged | Site Info socials.linkedin refused: placeholder link "#/"; 3 rows with this text |  |
| `flag:placeholder:Indus Foods Website v2:234` | placeholder: {{ c.imgLabel }} | accept-flagged | empty image-slot placeholder awaiting a real image; 3 rows with this text |  |
| `flag:placeholder:Indus Foods Website v2:26` | placeholder: socials.facebook #/ | accept-flagged | Site Info socials.facebook refused: placeholder link "#/"; 3 rows with this text |  |
| `flag:placeholder:Indus Foods Website v2:279` | placeholder: logo | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:289` | placeholder: Food photo | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:29` | placeholder: socials.google #/ | accept-flagged | Site Info socials.google refused: placeholder link "#/"; 3 rows with this text |  |
| `flag:placeholder:Indus Foods Website v2:342` | placeholder: {{ hero.imgLabel }} | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:35` | placeholder: socials.instagram #/ | accept-flagged | Site Info socials.instagram refused: placeholder link "#/"; 3 rows with this text |  |
| `flag:placeholder:Indus Foods Website v2:396` | placeholder: {{ b.imgLabel }} | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:452` | placeholder: {{ t.title }} | accept-flagged | empty image-slot placeholder awaiting a real image; 2 rows with this text |  |
| `flag:placeholder:Indus Foods Website v2:496` | placeholder: {{ c.peekLabel }} | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:503` | placeholder: {{ l.name }} logo | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:608` | placeholder: {{ p.title }} | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:78` | placeholder: {{ activePanel.feature.imgLabel }} | accept-flagged | empty image-slot placeholder awaiting a real image |  |
| `flag:placeholder:Indus Foods Website v2:89` | placeholder: {{ card.imgLabel }} | accept-flagged | empty image-slot placeholder awaiting a real image; 2 rows with this text |  |
| `flag:placeholder:README.md:12` | placeholder: **High-fidelity.** Final colours, typography, spacing, copy and interactions. Recreate pixel-accurately. Photos are Unsplash placeholders (see Assets) and brand logos are empty `image-slot` placeholders awaiting real artwork. | accept-flagged | the README names this as a placeholder |  |
| `flag:placeholder:README.md:35` | placeholder: - **Bottom bar**: "Copyright © 2026 Indus Foods Ltd \| Website by Ibraheem Mustafa \| Placeholder photography via Unsplash" and a "Back to top" button (smooth scroll). | accept-flagged | the README names this as a placeholder |  |
| `flag:placeholder:README.md:93` | placeholder: - Photos: Unsplash placeholders loaded by id (`https://images.unsplash.com/photo-<id>?w=<2x width>&q=70&auto=format&fit=crop`), each with a credit linking to `https://unsplash.com/photos/<id>`. Replace with owned photography; keep the credit pattern for any remaining Unsplash images. Brand, accreditation and testimonial logos are placeholders (`brand-*`, `acc-*`, `t-avatar*` ids). | accept-flagged | the README names this as a placeholder |  |
| `flag:placeholder:README.md:94` | placeholder: - `image-slot.js`: placeholder component for droppable images; replace with normal `<img>` or CMS media. | accept-flagged | the README names this as a placeholder |  |
| `flag:prototype-only:EnquiryForm.dc.html:21:7` | prototype-only: setTimeout(() => this.setState({ sending: false, sent: true }), 900) | accept-flagged | setTimeout in the submit handler submit sets sending, sent: a simulated server reply |  |
| `flag:prototype-only:Indus Foods Website v2.dc.html:797:19` | prototype-only: (e) => { e.preventDefault(); this.setState({ sent: { ...this.state.sent, [key]: true } }); } | accept-flagged | the submit handler onSubmit sets sent with no request: a client-side thank-you |  |
| `flag:prototype-only:TradeApplication.dc.html:js:176:28` | prototype-only: localStorage.setItem(this.KEY, JSON.stringify({ v, step })) | accept-flagged | browser storage write (localStorage.setItem) stands in for server state |  |
| `flag:prototype-only:TradeApplication.dc.html:js:247:48` | prototype-only: 'IND-' + Math.floor(100000 + Math.random() * 900000) | accept-flagged | Math.random makes a reference or ID the server would issue |  |
| `flag:prototype-only:TradeApplication.dc.html:js:248:13` | prototype-only: localStorage.removeItem(this.KEY) | accept-flagged | browser storage write (localStorage.removeItem) stands in for server state |  |
| `flag:stock:Indus Foods Website v2.dc.html:js:1174:16` | stock: https://images.unsplash.com/photo- | accept-flagged | image URL built on the stock host images.unsplash.com; 3 rows with this text |  |

## Draft defects (draft-defect)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `defect-group:Indus Foods Website v2:animateAcc` | Indus Foods Website v2 animateAcc: 2 defects (timer, waapi) at Indus Foods Website v2:js:1276:13, Indus Foods Website v2:js:1278:63 | build the code's intent |  |  |
| `defect-group:Indus Foods Website v2:template` | Indus Foods Website v2 template: 9 defects (style-hover, transition) at Indus Foods Website v2:87, Indus Foods Website v2:151, Indus Foods Website v2:160, Indus Foods Website v2:324 and 5 more | build the code's intent |  |  |

## Not defects: unwired code (not-a-defect)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `not-defect:observer@Indus Foods Website v2:js:1134:19` | observer@Indus Foods Website v2:js:1134:19 setScatterEl is reached only through renderVals key setScatterEl, which no template binding references | not-a-defect | unwired: nothing live reaches it (a handler, ref callback, timer or observer under a renderVals key no template binding names, or a guard field nothing live writes); a misspelled binding or field name reads the same |  |
| `not-defect:timer@Indus Foods Website v2:js:1134:83` | timer@Indus Foods Website v2:js:1134:83 setScatterEl is reached only through renderVals key setScatterEl, which no template binding references | not-a-defect | unwired: nothing live reaches it (a handler, ref callback, timer or observer under a renderVals key no template binding names, or a guard field nothing live writes); a misspelled binding or field name reads the same |  |
| `not-defect:timer@Indus Foods Website v2:js:1137:4` | timer@Indus Foods Website v2:js:1137:4 setScatterEl is reached only through renderVals key setScatterEl, which no template binding references | not-a-defect | unwired: nothing live reaches it (a handler, ref callback, timer or observer under a renderVals key no template binding names, or a guard field nothing live writes); a misspelled binding or field name reads the same |  |
| `not-defect:timer@Indus Foods Website v2:js:1458:51` | timer@Indus Foods Website v2:js:1458:51 setFoodEl is never referenced | not-a-defect | unwired: nothing live reaches it (a handler, ref callback, timer or observer under a renderVals key no template binding names, or a guard field nothing live writes); a misspelled binding or field name reads the same |  |
| `not-defect:waapi@Indus Foods Website v2:js:1250:22` | waapi@Indus Foods Website v2:js:1250:22 animatePage needs this._foodEl, which is written only in dead code (setFoodEl is never referenced) | not-a-defect | unwired: nothing live reaches it (a handler, ref callback, timer or observer under a renderVals key no template binding names, or a guard field nothing live writes); a misspelled binding or field name reads the same |  |
| `not-defect:waapi@Indus Foods Website v2:js:1344:68` | waapi@Indus Foods Website v2:js:1344:68 floatRef is reached only through renderVals key ref, which no template binding references | not-a-defect | unwired: nothing live reaches it (a handler, ref callback, timer or observer under a renderVals key no template binding names, or a guard field nothing live writes); a misspelled binding or field name reads the same |  |

## Missing features (missing-feature)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `missing:EnquiryForm:26` | **changed** <input>: no SGS block fits it | no block proposed | 8 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:EnquiryForm:31` | **changed** <textarea>: no SGS block fits it | no block proposed | 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:391` | **changed** <span>: no SGS block fits it | no block proposed | 47 copies of one template element on 12 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:441` | **changed** <div>: no SGS block fits it | no block proposed | 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:560` | **changed** <input>: no SGS block fits it | no block proposed | 14 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:562` | **changed** <select>: no SGS block fits it | no block proposed | 8 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:566` | **changed** <textarea>: no SGS block fits it | no block proposed | 4 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:568` | **changed** <input>: no SGS block fits it | no block proposed | 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:570` | **changed** <input>: no SGS block fits it | no block proposed | 4 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:581` | **changed** <span>: no SGS block fits it | no block proposed | 5 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:621` | **changed** <span>: no SGS block fits it | no block proposed | 6 copies of one template element on 6 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:623` | **changed** <span>: no SGS block fits it | no block proposed | 6 copies of one template element on 6 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:TradeApplication:13` | **changed** <span>: no SGS block fits it | no block proposed | 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:TradeApplication:14` | **changed** <div>: no SGS block fits it | no block proposed | 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:TradeApplication:39` | **changed** <input>: no SGS block fits it | no block proposed | 6 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:TradeApplication:41` | **changed** <select>: no SGS block fits it | no block proposed | 4 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:coverage:css-group:backgrounds-and-borders` | **changed** css-group:backgrounds-and-borders seen 773 times in the draft: partly supported | gap:draft reading | css-group:backgrounds-and-borders: Fill does not read background, background-clip, background-size, border-radius (it reads the group's other 8 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:basic-user-interface` | **changed** css-group:basic-user-interface seen 99 times in the draft: partly supported | gap:draft reading | css-group:basic-user-interface: Fill does not read accent-color, appearance, cursor, pointer-events, resize, user-select (it reads the group's other 2 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:box-alignment` | **changed** css-group:box-alignment seen 444 times in the draft: partly supported | gap:draft reading | css-group:box-alignment: Fill does not read justify-self (it reads the group's other 3 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:box-sizing` | **changed** css-group:box-sizing seen 374 times in the draft: partly supported | gap:draft reading | css-group:box-sizing: Fill does not read box-sizing, height, min-width (it reads the group's other 4 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:display` | **changed** css-group:display seen 375 times in the draft: partly supported | gap:draft reading | css-group:display: Fill does not read order, visibility (it reads the group's other 1 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:filter-effects` | **changed** css-group:filter-effects seen 6 times in the draft: partly supported | gap:draft reading | css-group:filter-effects: Fill does not read filter (it reads the group's other 1 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:flexible-box-layout` | **changed** css-group:flexible-box-layout seen 385 times in the draft: partly supported | gap:draft reading | css-group:flexible-box-layout: Fill does not read flex, flex-basis, flex-shrink (it reads the group's other 4 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:fonts` | **changed** css-group:fonts seen 566 times in the draft: partly supported | gap:draft reading | css-group:fonts: Fill does not read font, font-smooth, font-variant-numeric (it reads the group's other 3 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:grid-layout` | **changed** css-group:grid-layout seen 47 times in the draft: partly supported | gap:draft reading | css-group:grid-layout: Fill does not read grid-column, grid-template-rows (it reads the group's other 1 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:inline` | **changed** css-group:inline seen 80 times in the draft: partly supported | gap:draft reading | css-group:inline: Fill does not read baseline-shift (it reads the group's other 1 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:positioned-layout` | **changed** css-group:positioned-layout seen 294 times in the draft: partly supported | gap:draft reading | css-group:positioned-layout: Fill does not read bottom, inset, position, right, z-index (it reads the group's other 2 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:text` | **changed** css-group:text seen 183 times in the draft: partly supported | gap:draft reading | css-group:text: Fill does not read overflow-wrap, text-wrap, white-space (it reads the group's other 3 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:text-decoration` | **changed** css-group:text-decoration seen 9 times in the draft: partly supported | gap:draft reading | css-group:text-decoration: Fill does not read text-decoration (it reads the group's other 2 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:transforms` | **changed** css-group:transforms seen 128 times in the draft: partly supported | gap:draft reading | css-group:transforms: Fill does not read perspective, transform-box, transform-origin (it reads the group's other 4 the draft uses); wave draft reading |  |
| `missing:coverage:css-group:transitions` | **changed** css-group:transitions seen 134 times in the draft: partly supported | gap:motion writer (4.0) | css-group:transitions: Fill does not read transition (it reads the group's other 2 the draft uses); wave motion writer (4.0) |  |
| `missing:coverage:html:custom-element` | **changed** html:custom-element seen 14 times in the draft: seen but unsupported | gap:draft reading | html:custom-element has no clone path yet (has nothing; wave draft reading) | gap:draft reading |
| `missing:Indus Foods Website v2:332` | <span>: no SGS block fits it | no block proposed | 3 copies of one template element on 3 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:Indus Foods Website v2:402` | <span>: no SGS block fits it | no block proposed | no block fits this element: decide it with skeleton.mjs decide |  |
| `missing:handler@Indus Foods Website v2:571/template:onMouseEnter` | Indus Foods Website v2: an element that animates from code on hover (onMouseEnter → btnEnter) | no block proposed | hover-motion: no block capability or fx effect named for it in the framework database |  |
| `missing:handler@Indus Foods Website v2:571/template:onMouseLeave` | Indus Foods Website v2: an element that animates from code on hover (onMouseLeave → btnLeave) | no block proposed | hover-motion: no block capability or fx effect named for it in the framework database |  |
| `missing:handler@Indus Foods Website v2:js:1179:6/addEventListener:mouseenter` | Indus Foods Website v2: an element that animates from code on hover (mouseenter) | no block proposed | hover-motion: no block capability or fx effect named for it in the framework database |  |
| `missing:handler@Indus Foods Website v2:js:1180:6/addEventListener:mouseleave` | Indus Foods Website v2: an element that animates from code on hover (mouseleave) | no block proposed | hover-motion: no block capability or fx effect named for it in the framework database |  |

### Confident proposals (Accept all covers these)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `missing:coverage:aria-attr:aria-checked` | aria-attr:aria-checked seen 1 time in the draft: seen but unsupported | gap:states | aria-attr:aria-checked has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:aria-attr:aria-expanded` | aria-attr:aria-expanded seen 2 times in the draft: seen but unsupported | gap:states | aria-attr:aria-expanded has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:aria-attr:aria-hidden` | aria-attr:aria-hidden seen 30 times in the draft: seen but unsupported | gap:states | aria-attr:aria-hidden has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:aria-attr:aria-label` | aria-attr:aria-label seen 30 times in the draft: seen but unsupported | gap:content, media and icons | aria-attr:aria-label has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:aria-attr:aria-pressed` | aria-attr:aria-pressed seen 2 times in the draft: seen but unsupported | gap:states | aria-attr:aria-pressed has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:aria-role:checkbox` | aria-role:checkbox seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:checkbox has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:aria-role:dialog` | aria-role:dialog seen 1 time in the draft: seen but unsupported | gap:behaviour recognisers | aria-role:dialog has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:construct:binding` | construct:binding seen 967 times in the draft: seen but unsupported | gap:draft reading | construct:binding has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:data-hook` | construct:data-hook seen 57 times in the draft: seen but unsupported | gap:behaviour recognisers | construct:data-hook has no clone path yet (has recognise; wave behaviour recognisers) |  |
| `missing:coverage:construct:dc-import` | construct:dc-import seen 2 times in the draft: seen but unsupported | gap:draft reading | construct:dc-import has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:getter` | construct:getter seen 12 times in the draft: seen but unsupported | gap:draft reading | construct:getter has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:handler` | construct:handler seen 86 times in the draft: seen but unsupported | gap:behaviour recognisers | construct:handler has no clone path yet (has recognise; wave behaviour recognisers) |  |
| `missing:coverage:construct:helmet-font` | construct:helmet-font seen 3 times in the draft: seen but unsupported | gap:site and surfaces | construct:helmet-font has no clone path yet (has nothing; wave site and surfaces) |  |
| `missing:coverage:construct:helmet-script` | construct:helmet-script seen 2 times in the draft: seen but unsupported | gap:draft reading | construct:helmet-script has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:keyframes` | construct:keyframes seen 9 times in the draft: seen but unsupported | gap:motion writer (4.0) | construct:keyframes has no clone path yet (has recognise; wave motion writer (4.0)) |  |
| `missing:coverage:construct:link` | construct:link seen 71 times in the draft: seen but unsupported | gap:draft reading | construct:link has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:observer` | construct:observer seen 5 times in the draft: seen but unsupported | gap:behaviour recognisers | construct:observer has no clone path yet (has recognise; wave behaviour recognisers) |  |
| `missing:coverage:construct:ref` | construct:ref seen 15 times in the draft: seen but unsupported | gap:behaviour recognisers | construct:ref has no clone path yet (has recognise; wave behaviour recognisers) |  |
| `missing:coverage:construct:renderVals-key` | construct:renderVals-key seen 133 times in the draft: seen but unsupported | gap:draft reading | construct:renderVals-key has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:sc-for` | construct:sc-for seen 53 times in the draft: seen but unsupported | gap:draft reading | construct:sc-for has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:sc-if` | construct:sc-if seen 115 times in the draft: seen but unsupported | gap:draft reading | construct:sc-if has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:style-hover` | construct:style-hover seen 103 times in the draft: seen but unsupported | gap:draft reading | construct:style-hover has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:template-element` | construct:template-element seen 900 times in the draft: seen but unsupported | gap:draft reading | construct:template-element has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:construct:timer` | construct:timer seen 29 times in the draft: seen but unsupported | gap:behaviour recognisers | construct:timer has no clone path yet (has recognise; wave behaviour recognisers) |  |
| `missing:coverage:construct:transition` | construct:transition seen 135 times in the draft: seen but unsupported | gap:motion writer (4.0) | construct:transition has no clone path yet (has recognise; wave motion writer (4.0)) |  |
| `missing:coverage:construct:waapi` | construct:waapi seen 49 times in the draft: seen but unsupported | gap:motion writer (4.0) | construct:waapi has no clone path yet (has recognise; wave motion writer (4.0)) |  |
| `missing:coverage:css-at:keyframes` | css-at:keyframes seen 1 time in the draft: seen but unsupported | gap:motion writer (4.0) | css-at:keyframes has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-at:media` | css-at:media seen 5 times in the draft: seen but unsupported | gap:modes and values with no CSS property | css-at:media has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-function:blur` | css-function:blur seen 9 times in the draft: seen but unsupported | gap:draft reading | css-function:blur has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:calc` | css-function:calc seen 8 times in the draft: seen but unsupported | gap:modes and values with no CSS property | css-function:calc has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-function:circle` | css-function:circle seen 1 time in the draft: seen but unsupported | gap:draft reading | css-function:circle has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:clamp` | css-function:clamp seen 34 times in the draft: seen but unsupported | gap:modes and values with no CSS property | css-function:clamp has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-function:contrast` | css-function:contrast seen 1 time in the draft: seen but unsupported | gap:draft reading | css-function:contrast has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:cubic-bezier` | css-function:cubic-bezier seen 97 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:cubic-bezier has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:env` | css-function:env seen 1 time in the draft: seen but unsupported | gap:draft reading | css-function:env has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:grayscale` | css-function:grayscale seen 1 time in the draft: seen but unsupported | gap:draft reading | css-function:grayscale has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:inset` | css-function:inset seen 6 times in the draft: seen but unsupported | gap:draft reading | css-function:inset has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:linear-gradient` | css-function:linear-gradient seen 34 times in the draft: seen but unsupported | gap:draft reading | css-function:linear-gradient has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:max` | css-function:max seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | css-function:max has no clone path yet (has nothing; wave modes and values with no CSS property); seen only when the page ran: the file read missed it |  |
| `missing:coverage:css-function:min` | css-function:min seen 3 times in the draft: seen but unsupported | gap:modes and values with no CSS property | css-function:min has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-function:minmax` | css-function:minmax seen 89 times in the draft: seen but unsupported | gap:draft reading | css-function:minmax has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:radial-gradient` | css-function:radial-gradient seen 10 times in the draft: seen but unsupported | gap:draft reading | css-function:radial-gradient has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:repeat` | css-function:repeat seen 29 times in the draft: seen but unsupported | gap:draft reading | css-function:repeat has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-function:rotate` | css-function:rotate seen 30 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:rotate has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:scale` | css-function:scale seen 65 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:scale has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:scalex` | css-function:scalex seen 6 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:scalex has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:scaley` | css-function:scaley seen 2 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:scaley has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:skewx` | css-function:skewx seen 2 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:skewx has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:translate` | css-function:translate seen 3 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:translate has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:translate3d` | css-function:translate3d seen 3 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:translate3d has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:translatex` | css-function:translatex seen 28 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:translatex has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-function:translatey` | css-function:translatey seen 73 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-function:translatey has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-group:animations` | css-group:animations seen 9 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-group:animations: Fill does not read animation, animation-duration, animation-iteration-count; wave motion writer (4.0) |  |
| `missing:coverage:css-group:compositing-and-blending` | css-group:compositing-and-blending seen 2 times in the draft: seen but unsupported | gap:draft reading | css-group:compositing-and-blending: Fill does not read isolation, mix-blend-mode; wave draft reading |  |
| `missing:coverage:css-group:generated-content` | css-group:generated-content seen 2 times in the draft: seen but unsupported | gap:draft reading | css-group:generated-content: Fill does not read content; wave draft reading |  |
| `missing:coverage:css-group:logical-properties-and-values` | css-group:logical-properties-and-values seen 20 times in the draft: seen but unsupported | gap:draft reading | css-group:logical-properties-and-values: Fill does not read inset; wave draft reading |  |
| `missing:coverage:css-group:masking` | css-group:masking seen 20 times in the draft: seen but unsupported | gap:draft reading | css-group:masking: Fill does not read clip-path, clip-rule, mask-image; wave draft reading |  |
| `missing:coverage:css-group:overflow` | css-group:overflow seen 75 times in the draft: seen but unsupported | gap:draft reading | css-group:overflow: Fill does not read overflow, overflow-clip-margin, overflow-x, overflow-y, scroll-behavior, text-overflow; wave draft reading |  |
| `missing:coverage:css-group:overscroll-behavior` | css-group:overscroll-behavior seen 1 time in the draft: seen but unsupported | gap:draft reading | css-group:overscroll-behavior: Fill does not read overscroll-behavior; wave draft reading |  |
| `missing:coverage:css-group:pointer-events` | css-group:pointer-events seen 2 times in the draft: seen but unsupported | gap:draft reading | css-group:pointer-events: Fill does not read touch-action; wave draft reading |  |
| `missing:coverage:css-group:scalable-vector-graphics` | css-group:scalable-vector-graphics seen 315 times in the draft: seen but unsupported | gap:draft reading | css-group:scalable-vector-graphics: Fill does not read fill, fill-opacity, fill-rule, paint-order, stop-color, stop-opacity, stroke, stroke-dasharray, stroke-dashoffset, stroke-linejoin, stroke-miterlimit, stroke-opacity, stroke-width, vector-effect, visibility; wave draft reading |  |
| `missing:coverage:css-group:scroll-snap` | css-group:scroll-snap seen 3 times in the draft: seen but unsupported | gap:draft reading | css-group:scroll-snap: Fill does not read scroll-padding-inline, scroll-snap-align, scroll-snap-type; wave draft reading |  |
| `missing:coverage:css-group:scrollbars-styling` | css-group:scrollbars-styling seen 3 times in the draft: seen but unsupported | gap:draft reading | css-group:scrollbars-styling: Fill does not read scrollbar-color, scrollbar-width; wave draft reading |  |
| `missing:coverage:css-group:webkit-extensions` | css-group:webkit-extensions seen 4 times in the draft: seen but unsupported | gap:draft reading | css-group:webkit-extensions: Fill does not read -webkit-mask-image, -webkit-overflow-scrolling, -webkit-text-stroke; wave draft reading |  |
| `missing:coverage:css-group:will-change` | css-group:will-change seen 1 time in the draft: seen but unsupported | gap:draft reading | css-group:will-change: Fill does not read will-change; wave draft reading |  |
| `missing:coverage:css-group:writing-modes` | css-group:writing-modes seen 7 times in the draft: seen but unsupported | gap:draft reading | css-group:writing-modes: Fill does not read direction; wave draft reading |  |
| `missing:coverage:css-media-feature:prefers-reduced-motion` | css-media-feature:prefers-reduced-motion seen 4 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-media-feature:prefers-reduced-motion has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-property:-webkit-user-drag` | css-property:-webkit-user-drag seen 2 times in the draft: seen but unsupported | gap:draft reading | css-property:-webkit-user-drag has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-property:unlisted` | css-property:unlisted seen 2 times in the draft: seen but unsupported | difference | css-property:unlisted is excluded from cloning (Bean, 2026-10-18: a CSS property no browser applies (enable-background, an SVG 1.1 editor property, seen in an exported logo); nothing to clone) |  |
| `missing:coverage:css-pseudo-class:focus` | css-pseudo-class:focus seen 8 times in the draft: seen but unsupported | gap:states | css-pseudo-class:focus has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:css-pseudo-class:focus-visible` | css-pseudo-class:focus-visible seen 1 time in the draft: seen but unsupported | gap:states | css-pseudo-class:focus-visible has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:css-pseudo-class:host` | css-pseudo-class:host seen 14 times in the draft: seen but unsupported | gap:draft reading | css-pseudo-class:host has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-pseudo-class:host-context` | css-pseudo-class:host-context seen 2 times in the draft: seen but unsupported | gap:draft reading | css-pseudo-class:host-context has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-pseudo-class:hover` | css-pseudo-class:hover seen 101 times in the draft: seen but unsupported | gap:states | css-pseudo-class:hover has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:css-pseudo-class:popover-open` | css-pseudo-class:popover-open seen 1 time in the draft: seen but unsupported | gap:states | css-pseudo-class:popover-open has no clone path yet (has nothing; wave states) |  |
| `missing:coverage:css-pseudo-element:-webkit-scrollbar` | css-pseudo-element:-webkit-scrollbar seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | css-pseudo-element:-webkit-scrollbar has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-pseudo-element:-webkit-scrollbar-thumb` | css-pseudo-element:-webkit-scrollbar-thumb seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | css-pseudo-element:-webkit-scrollbar-thumb has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-pseudo-element:-webkit-scrollbar-track` | css-pseudo-element:-webkit-scrollbar-track seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | css-pseudo-element:-webkit-scrollbar-track has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-pseudo-element:after` | css-pseudo-element:after seen 6 times in the draft: seen but unsupported | gap:content, media and icons | css-pseudo-element:after has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:css-pseudo-element:before` | css-pseudo-element:before seen 3 times in the draft: seen but unsupported | gap:content, media and icons | css-pseudo-element:before has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:css-pseudo-element:selection` | css-pseudo-element:selection seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | css-pseudo-element:selection has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-unit:deg` | css-unit:deg seen 67 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-unit:deg has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-unit:fr` | css-unit:fr seen 93 times in the draft: seen but unsupported | gap:draft reading | css-unit:fr has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:css-unit:ms` | css-unit:ms seen 6 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-unit:ms has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-unit:s` | css-unit:s seen 295 times in the draft: seen but unsupported | gap:motion writer (4.0) | css-unit:s has no clone path yet (has nothing; wave motion writer (4.0)) |  |
| `missing:coverage:css-unit:vh` | css-unit:vh seen 3 times in the draft: seen but unsupported | gap:modes and values with no CSS property | css-unit:vh has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:css-unit:vw` | css-unit:vw seen 40 times in the draft: seen but unsupported | gap:modes and values with no CSS property | css-unit:vw has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:embed:other` | embed:other seen 2 times in the draft: seen but unsupported | gap:content, media and icons | embed:other has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:a.rel` | html-attr:a.rel seen 3 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:a.rel has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:a.target` | html-attr:a.target seen 3 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:a.target has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:button.disabled` | html-attr:button.disabled seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:button.disabled has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:button.type` | html-attr:button.type seen 15 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:button.type has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:form.novalidate` | html-attr:form.novalidate seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:form.novalidate has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:global.class` | html-attr:global.class seen 16 times in the draft: seen but unsupported | difference | html-attr:global.class is excluded from cloning (Bean, 2026-10-18: class names carry no value of their own: their styles reach the clone through the computed values Fill reads, and the behaviour they drive through the census) |  |
| `missing:coverage:html-attr:global.data` | html-attr:global.data seen 63 times in the draft: seen but unsupported | gap:behaviour recognisers | html-attr:global.data has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:html-attr:global.draggable` | html-attr:global.draggable seen 2 times in the draft: seen but unsupported | gap:behaviour recognisers | html-attr:global.draggable has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:html-attr:global.id` | html-attr:global.id seen 6 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:global.id has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:global.part` | html-attr:global.part seen 7 times in the draft: seen but unsupported | gap:draft reading | html-attr:global.part has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:global.popover` | html-attr:global.popover seen 2 times in the draft: seen but unsupported | gap:behaviour recognisers | html-attr:global.popover has no clone path yet (has nothing; wave behaviour recognisers) |  |
| `missing:coverage:html-attr:global.title` | html-attr:global.title seen 4 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:global.title has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:iframe.loading` | html-attr:iframe.loading seen 2 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:iframe.loading has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:iframe.src` | html-attr:iframe.src seen 2 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:iframe.src has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:img.alt` | html-attr:img.alt seen 4 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:img.alt has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:img.height` | html-attr:img.height seen 1 time in the draft: seen but unsupported | gap:modes and values with no CSS property | html-attr:img.height has no clone path yet (has nothing; wave modes and values with no CSS property) |  |
| `missing:coverage:html-attr:img.src` | html-attr:img.src seen 2 times in the draft: seen but unsupported | gap:content, media and icons | html-attr:img.src has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html-attr:input.accept` | html-attr:input.accept seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.accept has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.autocomplete` | html-attr:input.autocomplete seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.autocomplete has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.placeholder` | html-attr:input.placeholder seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.placeholder has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.required` | html-attr:input.required seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.required has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:input.value` | html-attr:input.value seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:input.value has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:label.for` | html-attr:label.for seen 4 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:label.for has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:link.crossorigin` | html-attr:link.crossorigin seen 1 time in the draft: seen but unsupported | gap:draft reading | html-attr:link.crossorigin has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:link.href` | html-attr:link.href seen 6 times in the draft: seen but unsupported | gap:draft reading | html-attr:link.href has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:link.rel` | html-attr:link.rel seen 6 times in the draft: seen but unsupported | gap:draft reading | html-attr:link.rel has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:meta.content` | html-attr:meta.content seen 1 time in the draft: seen but unsupported | gap:draft reading | html-attr:meta.content has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:meta.name` | html-attr:meta.name seen 1 time in the draft: seen but unsupported | gap:draft reading | html-attr:meta.name has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:option.value` | html-attr:option.value seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:option.value has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:script.src` | html-attr:script.src seen 2 times in the draft: seen but unsupported | gap:draft reading | html-attr:script.src has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html-attr:select.name` | html-attr:select.name seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:select.name has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:select.required` | html-attr:select.required seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:select.required has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:textarea.maxlength` | html-attr:textarea.maxlength seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:textarea.maxlength has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:textarea.placeholder` | html-attr:textarea.placeholder seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:textarea.placeholder has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:textarea.required` | html-attr:textarea.required seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | html-attr:textarea.required has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html-attr:textarea.rows` | html-attr:textarea.rows seen 3 times in the draft: seen but unsupported | gap:shop, forms and data | html-attr:textarea.rows has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html:button` | html:button seen 17 times in the draft: seen but unsupported | gap:shop, forms and data | html:button has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html:canvas` | html:canvas seen 1 time in the draft: seen but unsupported | gap:content, media and icons | html:canvas has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html:figcaption` | html:figcaption seen 1 time in the draft: seen but unsupported | gap:content, media and icons | html:figcaption has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html:figure` | html:figure seen 1 time in the draft: seen but unsupported | gap:content, media and icons | html:figure has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html:form` | html:form seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html:form has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html:iframe` | html:iframe seen 2 times in the draft: seen but unsupported | gap:content, media and icons | html:iframe has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html:img` | html:img seen 5 times in the draft: seen but unsupported | gap:content, media and icons | html:img has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:html:input` | html:input seen 5 times in the draft: seen but unsupported | gap:shop, forms and data | html:input has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html:label` | html:label seen 6 times in the draft: seen but unsupported | gap:shop, forms and data | html:label has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html:link` | html:link seen 6 times in the draft: seen but unsupported | gap:draft reading | html:link has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html:meta` | html:meta seen 1 time in the draft: seen but unsupported | gap:draft reading | html:meta has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html:option` | html:option seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html:option has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html:script` | html:script seen 2 times in the draft: seen but unsupported | gap:draft reading | html:script has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html:select` | html:select seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html:select has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:html:style` | html:style seen 4 times in the draft: seen but unsupported | gap:draft reading | html:style has no clone path yet (has nothing; wave draft reading) |  |
| `missing:coverage:html:textarea` | html:textarea seen 2 times in the draft: seen but unsupported | gap:shop, forms and data | html:textarea has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:input-type:checkbox` | input-type:checkbox seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | input-type:checkbox has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:input-type:email` | input-type:email seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | input-type:email has no clone path yet (has nothing; wave shop, forms and data); seen only when the page ran: the file read missed it |  |
| `missing:coverage:input-type:file` | input-type:file seen 3 times in the draft: seen but unsupported | gap:shop, forms and data | input-type:file has no clone path yet (has nothing; wave shop, forms and data) |  |
| `missing:coverage:input-type:tel` | input-type:tel seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | input-type:tel has no clone path yet (has nothing; wave shop, forms and data); seen only when the page ran: the file read missed it |  |
| `missing:coverage:input-type:text` | input-type:text seen 1 time in the draft: seen but unsupported | gap:shop, forms and data | input-type:text has no clone path yet (has nothing; wave shop, forms and data); seen only when the page ran: the file read missed it |  |
| `missing:coverage:svg:circle` | svg:circle seen 8 times in the draft: seen but unsupported | gap:content, media and icons | svg:circle has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:defs` | svg:defs seen 2 times in the draft: seen but unsupported | gap:content, media and icons | svg:defs has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:ellipse` | svg:ellipse seen 1 time in the draft: seen but unsupported | gap:content, media and icons | svg:ellipse has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:feGaussianBlur` | svg:feGaussianBlur seen 1 time in the draft: seen but unsupported | gap:content, media and icons | svg:feGaussianBlur has no clone path yet (has nothing; wave content, media and icons); seen only when the page ran: the file read missed it |  |
| `missing:coverage:svg:feMerge` | svg:feMerge seen 1 time in the draft: seen but unsupported | gap:content, media and icons | svg:feMerge has no clone path yet (has nothing; wave content, media and icons); seen only when the page ran: the file read missed it |  |
| `missing:coverage:svg:feMergeNode` | svg:feMergeNode seen 1 time in the draft: seen but unsupported | gap:content, media and icons | svg:feMergeNode has no clone path yet (has nothing; wave content, media and icons); seen only when the page ran: the file read missed it |  |
| `missing:coverage:svg:filter` | svg:filter seen 1 time in the draft: seen but unsupported | gap:content, media and icons | svg:filter has no clone path yet (has nothing; wave content, media and icons); seen only when the page ran: the file read missed it |  |
| `missing:coverage:svg:g` | svg:g seen 14 times in the draft: seen but unsupported | gap:content, media and icons | svg:g has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:line` | svg:line seen 3 times in the draft: seen but unsupported | gap:content, media and icons | svg:line has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:linearGradient` | svg:linearGradient seen 4 times in the draft: seen but unsupported | gap:content, media and icons | svg:linearGradient has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:metadata` | svg:metadata seen 3 times in the draft: seen but unsupported | gap:content, media and icons | svg:metadata has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:path` | svg:path seen 106 times in the draft: seen but unsupported | gap:content, media and icons | svg:path has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:polyline` | svg:polyline seen 4 times in the draft: seen but unsupported | gap:content, media and icons | svg:polyline has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:rect` | svg:rect seen 2 times in the draft: seen but unsupported | gap:content, media and icons | svg:rect has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:stop` | svg:stop seen 16 times in the draft: seen but unsupported | gap:content, media and icons | svg:stop has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:svg` | svg:svg seen 24 times in the draft: seen but unsupported | gap:content, media and icons | svg:svg has no clone path yet (has nothing; wave content, media and icons) |  |
| `missing:coverage:svg:unlisted` | svg:unlisted seen 10 times in the draft: seen but unsupported | difference | svg:unlisted is excluded from cloning (Bean, 2026-10-18: an SVG element no browser renders (meshgradient, meshrow and meshpatch from an SVG editor's draft spec, seen in an exported logo); the SVG file uploads whole, so the clone loses nothing) |  |

## Skeleton block choices (skeleton-block)

Accept all: [ ]

### Changed since the last export (42)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Indus Foods Website v2/362` | **changed** page-about Indus Foods Website v2/362 <div> "1962" | block:sgs/text | 0.25: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/441#0` | **changed** page-about Indus Foods Website v2/441#0 <div> | no block | 0: 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-about:Indus Foods Website v2/444#0` | **changed** page-about Indus Foods Website v2/444#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/446` | **changed** page-about Indus Foods Website v2/446 <article> | block:sgs/container | 1: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/447` | **changed** page-about Indus Foods Website v2/447 <div> | block:sgs/container | 0.75: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/448` | **changed** page-about Indus Foods Website v2/448 <div> "1962" | block:sgs/text | 0.25: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/449` | **changed** page-about Indus Foods Website v2/449 <h3> "A shop in the Balti Triangle" | block:sgs/heading | 0.75: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/450` | **changed** page-about Indus Foods Website v2/450 <p> "Our founders open one of the UK’s first halal butchers and greengrocers on Ladypool Road, Sparkbrook." | block:sgs/text | 0.75: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/451` | **changed** page-about Indus Foods Website v2/451 <div> | block:sgs/container | 0.75: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/452` | **changed** page-about Indus Foods Website v2/452 <image-slot> | block:sgs/media | 1: 10 copies of one template element on 2 surfaces; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-about:Indus Foods Website v2/490` | **changed** page-about Indus Foods Website v2/490 <div> "Our Story" | block:sgs/text | 0.25: 55 copies of one template element on 11 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/13#0` | **changed** page-apply Indus Foods Website v2>TradeApplication@466#0/13#0 <span> | no block | 0: 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/14#0` | **changed** page-apply Indus Foods Website v2>TradeApplication@466#0/14#0 <div> | no block | 0: 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/99#0` | **changed** page-apply Indus Foods Website v2>TradeApplication@466#0/99#0 <span> "Need a hand?" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/19` | **changed** page-apply Indus Foods Website v2>TradeApplication@466/19 <span> "1" | block:sgs/text | 0.25: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/33=sgs/text` | **changed** page-apply Indus Foods Website v2>TradeApplication@466/33=sgs/text <label> "Registered business name" | block:sgs/text | 0.25: 6 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/35` | **changed** page-apply Indus Foods Website v2>TradeApplication@466/35 <span> "*" | block:sgs/text | 0.25: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/39` | **changed** page-apply Indus Foods Website v2>TradeApplication@466/39 <input> | no block | 0: 6 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/41` | **changed** page-apply Indus Foods Website v2>TradeApplication@466/41 <select> | no block | 0: 4 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/47` | **changed** page-apply Indus Foods Website v2>TradeApplication@466/47 <div> | block:sgs/multi-button | 0.51: 4 copies of one template element on 2 surfaces |  |
| `skeleton:page-blog:Indus Foods Website v2/613` | **changed** page-blog Indus Foods Website v2/613 <div> "Supporting the trade through Ramadan" | block:sgs/text | 0.25: 24 copies of one template element on 7 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/556=sgs/text` | **changed** page-careers Indus Foods Website v2/556=sgs/text <span> "Phone" | block:sgs/text | 0.25: 12 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/558` | **changed** page-careers Indus Foods Website v2/558 <span> "*" | block:sgs/text | 0.25: 16 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/560` | **changed** page-careers Indus Foods Website v2/560 <input> | no block | 0: 14 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-careers:Indus Foods Website v2/562` | **changed** page-careers Indus Foods Website v2/562 <select> | no block | 0: 8 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-careers:Indus Foods Website v2/566#0` | **changed** page-careers Indus Foods Website v2/566#0 <textarea> | no block | 0: 4 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-careers:Indus Foods Website v2/568#0` | **changed** page-careers Indus Foods Website v2/568#0 <input> | no block | 0: 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-careers:Indus Foods Website v2/570#0` | **changed** page-careers Indus Foods Website v2/570#0 <input> | no block | 0: 4 copies of one template element on 4 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-careers:Indus Foods Website v2/581` | **changed** page-careers Indus Foods Website v2/581 <span> | no block | 0: 5 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-certifications:Indus Foods Website v2/414` | **changed** page-certifications Indus Foods Website v2/414 <div> "Supplier approval" | block:sgs/text | 0.25: 28 copies of one template element on 8 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/31#0` | **changed** page-contact Indus Foods Website v2>EnquiryForm@468#0/31#0 <textarea> | no block | 0: 2 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/32#0` | **changed** page-contact Indus Foods Website v2>EnquiryForm@468#0/32#0 <label> "How can we help?" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468/26` | **changed** page-contact Indus Foods Website v2>EnquiryForm@468/26 <input> | no block | 0: 8 copies of one template element on 2 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468/27` | **changed** page-contact Indus Foods Website v2>EnquiryForm@468/27 <label> "Your name" | block:sgs/text | 0.25: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-food-service:Indus Foods Website v2/375` | **changed** page-food-service Indus Foods Website v2/375 <div> "Manufacturing" | block:sgs/text | 0.25: 12 copies of one template element on 4 surfaces |  |
| `skeleton:page-home:Indus Foods Website v2/261` | **changed** page-home Indus Foods Website v2/261 <span> "1962" | block:sgs/text | 0.25: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/263` | **changed** page-home Indus Foods Website v2/263 <span> "A shop on Ladypool Road" | block:sgs/text | 0.25: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/301` | **changed** page-home Indus Foods Website v2/301 <span> "1" | block:sgs/text | 0.25: 3 copies of one template element |  |
| `skeleton:page-our-story:Indus Foods Website v2/391` | **changed** page-our-story Indus Foods Website v2/391 <span> | no block | 0: 47 copies of one template element on 12 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/621#0` | **changed** page-post-post-1 Indus Foods Website v2/621#0 <span> | no block | 0: 6 copies of one template element on 6 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/623#0` | **changed** page-post-post-1 Indus Foods Website v2/623#0 <span> | no block | 0: 6 copies of one template element on 6 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-terms:Indus Foods Website v2/641#0` | **changed** page-terms Indus Foods Website v2/641#0 <div> "Layout draft: these summaries are placeholders. Replace them with Indus Foods’ approved trade terms before launch." | block:sgs/text | 0.25 |  |

### Needs a decision (unresolved): no block (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-community:Indus Foods Website v2/332#0` | page-community Indus Foods Website v2/332#0 <span> | no block | 0: 3 copies of one template element on 3 surfaces; no block fits this element: decide it with skeleton.mjs decide |  |
| `skeleton:page-wholesale:Indus Foods Website v2/402#0` | page-wholesale Indus Foods Website v2/402#0 <span> | no block | 0: no block fits this element: decide it with skeleton.mjs decide |  |

### Needs a decision (low): block:sgs/business-info (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/723#0` | footer Indus Foods Website v2/723#0 <a> "Website by Ibraheem Mustafa" | block:sgs/business-info | 0.38 |  |

### Needs a decision (low): block:sgs/multi-button (6)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Indus Foods Website v2/336#0` | page-about Indus Foods Website v2/336#0 <div> | block:sgs/multi-button | 0.51: 9 copies of one template element on 9 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/524#0` | page-about Indus Foods Website v2/524#0 <div> | block:sgs/multi-button | 0.51: 23 copies of one template element on 23 surfaces |  |
| `skeleton:page-blog:Indus Foods Website v2/601#0` | page-blog Indus Foods Website v2/601#0 <div> | block:sgs/multi-button | 0.51 |  |
| `skeleton:page-home:Indus Foods Website v2/208#0` | page-home Indus Foods Website v2/208#0 <div> | block:sgs/multi-button | 0.51 |  |
| `skeleton:page-home:Indus Foods Website v2/284#0` | page-home Indus Foods Website v2/284#0 <div> | block:sgs/multi-button | 0.51 |  |
| `skeleton:top-bar:Indus Foods Website v2/11#0` | top-bar Indus Foods Website v2/11#0 <div> | block:sgs/multi-button | 0.51 |  |

### Needs a decision (low): block:sgs/text (39)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/663#0` | footer Indus Foods Website v2/663#0 <span> "Speak to our sales team" | block:sgs/text | 0.25 |  |
| `skeleton:footer:Indus Foods Website v2/669#0` | footer Indus Foods Website v2/669#0 <span> "We reply within one working day" | block:sgs/text | 0.25 |  |
| `skeleton:page-about:Indus Foods Website v2/328#0` | page-about Indus Foods Website v2/328#0 <span> "About Us" | block:sgs/text | 0.25: 28 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/363` | page-about Indus Foods Website v2/363 <div> "Family-run since" | block:sgs/text | 0.25: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/440#0` | page-about Indus Foods Website v2/440#0 <span> "01 / 05" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/443#0` | page-about Indus Foods Website v2/443#0 <span> "Scroll to explore" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/487` | page-about Indus Foods Website v2/487 <span> "01" | block:sgs/text | 0.25: 55 copies of one template element on 11 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/491` | page-about Indus Foods Website v2/491 <div> "Three generations and six decades of family heritage." | block:sgs/text | 0.25: 43 copies of one template element on 11 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/84#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/84#0 <span> "Takes about 5 minutes · Your progress saves automatically" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/21` | page-apply Indus Foods Website v2>TradeApplication@466/21 <span> "Business" | block:sgs/text | 0.25: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/64` | page-apply Indus Foods Website v2>TradeApplication@466/64 <span> "Leave blank if you are not VAT registered." | block:sgs/text | 0.25: 4 copies of one template element on 2 surfaces |  |
| `skeleton:page-blog:Indus Foods Website v2/614` | page-blog Indus Foods Website v2/614 <div> "How we plan stock across rice, flour, oils and spices for one of the busiest times of the trading year." | block:sgs/text | 0.25: 24 copies of one template element on 7 surfaces |  |
| `skeleton:page-brands:Indus Foods Website v2/506` | page-brands Indus Foods Website v2/506 <div> "Own brand · rice, flour & quality foods" | block:sgs/text | 0.25: 10 copies of one template element |  |
| `skeleton:page-certifications:Indus Foods Website v2/411` | page-certifications Indus Foods Website v2/411 <span> "01" | block:sgs/text | 0.25: 28 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/420` | page-certifications Indus Foods Website v2/420 <div> "We vet the producers we import from before their products join our range." | block:sgs/text | 0.25: 28 copies of one template element on 8 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2/535=sgs/text` | page-contact Indus Foods Website v2/535=sgs/text <span> "55–58 Stratford Street North" | block:sgs/text | 0.25: 1 copies of one template element |  |
| `skeleton:page-contact:Indus Foods Website v2/536=sgs/text` | page-contact Indus Foods Website v2/536=sgs/text <span> "We’ll route your message to the right team" | block:sgs/text | 0.25: 1 copies of one template element |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/10#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/10#0 <span> "Choose all that apply" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/21#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/21#0 <span> "02" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/33#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/33#0 <span> "0 / 800" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/37#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/37#0 <span> "Reply by" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/41#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/41#0 <span> "We reply within one working day. Your details are only used to answer your enquiry." | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/8#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/8#0 <span> "01" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468/14` | page-contact Indus Foods Website v2>EnquiryForm@468/14 <span> "New trade account" | block:sgs/text | 0.25: 12 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468/15` | page-contact Indus Foods Website v2>EnquiryForm@468/15 <span> "Open an account with us" | block:sgs/text | 0.25: 12 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/590#0` | page-delivery Indus Foods Website v2/590#0 <span> "01" | block:sgs/text | 0.25: 4 copies of one template element on 2 surfaces |  |
| `skeleton:page-food-service:Indus Foods Website v2/374` | page-food-service Indus Foods Website v2/374 <span> "02" | block:sgs/text | 0.25: 12 copies of one template element on 4 surfaces |  |
| `skeleton:page-food-service:Indus Foods Website v2/376` | page-food-service Indus Foods Website v2/376 <div> "Bulk spices, pulses, nuts and flours supplied consistently to specification." | block:sgs/text | 0.25: 12 copies of one template element on 4 surfaces |  |
| `skeleton:page-home:Indus Foods Website v2/264` | page-home Indus Foods Website v2/264 <span> "One of the UK’s first halal butchers and greengrocers." | block:sgs/text | 0.25: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/275#0` | page-home Indus Foods Website v2/275#0 <span> "“" | block:sgs/text | 0.25 |  |
| `skeleton:page-home:Indus Foods Website v2/281#0` | page-home Indus Foods Website v2/281#0 <span> "Purchasing manager" | block:sgs/text | 0.25 |  |
| `skeleton:page-home:Indus Foods Website v2/282#0` | page-home Indus Foods Website v2/282#0 <span> "Wholesale customer" | block:sgs/text | 0.25 |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/620#0` | page-post-post-1 Indus Foods Website v2/620#0 <span> "Feb 2026" | block:sgs/text | 0.25: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/622#0` | page-post-post-1 Indus Foods Website v2/622#0 <span> "2 min read" | block:sgs/text | 0.25: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/624#0` | page-post-post-1 Indus Foods Website v2/624#0 <span> "By the Indus Foods team" | block:sgs/text | 0.25: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/634#0` | page-post-post-1 Indus Foods Website v2/634#0 <span> "“" | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/635#0` | page-post-post-1 Indus Foods Website v2/635#0 <span> "The aim is simple: nobody should run short in the busiest weeks of their year." | block:sgs/text | 0.25: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-terms:Indus Foods Website v2/646` | page-terms Indus Foods Website v2/646 <span> "01" | block:sgs/text | 0.25: 7 copies of one template element |  |
| `skeleton:page-terms:Indus Foods Website v2/651` | page-terms Indus Foods Website v2/651 <span> "01" | block:sgs/text | 0.25: 7 copies of one template element |  |

### Settled by built post sgs_drawer 4456: the client already built this surface ([QA] Indus mobile drawer on sandybrown) (33)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/108#0` | mobile-tablet-drawer Indus Foods Website v2/108#0 <div> | block:sgs/nav-drawer | 1: a drawer surface is sgs/nav-drawer, whose own settings draw its top row, logo, close button and body |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/109#0` | mobile-tablet-drawer Indus Foods Website v2/109#0 <span> | block:sgs/decorative-image | 1: a floating shape that draws an outline (a ring) is a decorative image |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/110#0` | mobile-tablet-drawer Indus Foods Website v2/110#0 <span> | block:sgs/decorative-image | 1: a floating shape that draws an outline (a ring) is a decorative image |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/111#0` | mobile-tablet-drawer Indus Foods Website v2/111#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/112#0` | mobile-tablet-drawer Indus Foods Website v2/112#0 <div> | block:sgs/container | 1 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/113#0` | mobile-tablet-drawer Indus Foods Website v2/113#0 <a> | unwrap | 1: the link around one or more logos (a mark and a wordmark) goes: the logo block links home itself |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/114#0` | mobile-tablet-drawer Indus Foods Website v2/114#0 <indus-logo> | block:sgs/responsive-logo | 1: a custom element named as a logo (its tag matches logoImage, such as <brand-logo>) is the logo block, which reads the site logo |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/115#0` | mobile-tablet-drawer Indus Foods Website v2/115#0 <div> | block:sgs/container | 1 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/116#0` | mobile-tablet-drawer Indus Foods Website v2/116#0 <a> | block:sgs/business-info | 0.67 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/117#0` | mobile-tablet-drawer Indus Foods Website v2/117#0 <a> | block:sgs/business-info | 0.67 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/118#0` | mobile-tablet-drawer Indus Foods Website v2/118#0 <button> | block:sgs/container | 1 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/119#0` | mobile-tablet-drawer Indus Foods Website v2/119#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/120#0` | mobile-tablet-drawer Indus Foods Website v2/120#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/121#0` | mobile-tablet-drawer Indus Foods Website v2/121#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/122#0` | mobile-tablet-drawer Indus Foods Website v2/122#0 <nav> | block:sgs/nav-drawer-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/124` | mobile-tablet-drawer Indus Foods Website v2/124 <div> | absorbed | 1: 6 copies of one template element; drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/125` | mobile-tablet-drawer Indus Foods Website v2/125 <button> | absorbed | 1: 6 copies of one template element; drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/126` | mobile-tablet-drawer Indus Foods Website v2/126 <span> "01" | absorbed | 1: 6 copies of one template element; drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/127` | mobile-tablet-drawer Indus Foods Website v2/127 <span> "Home" | absorbed | 1: 6 copies of one template element; drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/128` | mobile-tablet-drawer Indus Foods Website v2/128 <span> | absorbed | 1: 6 copies of one template element; drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/130` | mobile-tablet-drawer Indus Foods Website v2/130 <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/nav-drawer-menu: rule navigation |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/178#0` | mobile-tablet-drawer Indus Foods Website v2/178#0 <div> | block:sgs/container | 1 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/179#0` | mobile-tablet-drawer Indus Foods Website v2/179#0 <span> "Follow us" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/180#0` | mobile-tablet-drawer Indus Foods Website v2/180#0 <div> | block:sgs/social-icons | 0.74 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/181#0` | mobile-tablet-drawer Indus Foods Website v2/181#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/184#0` | mobile-tablet-drawer Indus Foods Website v2/184#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/187#0` | mobile-tablet-drawer Indus Foods Website v2/187#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/193#0` | mobile-tablet-drawer Indus Foods Website v2/193#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/196#0` | mobile-tablet-drawer Indus Foods Website v2/196#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/197#0` | mobile-tablet-drawer Indus Foods Website v2/197#0 <a> | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/198#0` | mobile-tablet-drawer Indus Foods Website v2/198#0 <span> "Become A Trade Customer" | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/199#0` | mobile-tablet-drawer Indus Foods Website v2/199#0 <span> | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:mobile-tablet-drawer:Indus Foods Website v2/200#0` | mobile-tablet-drawer Indus Foods Website v2/200#0 <span> | absorbed | 1: drawn by sgs/button: rule pillButton |  |

### Settled by built post sgs_header 4461: the client already built this surface (QA copy Indus mega menu on sandybrown) (11)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:sticky-header:Indus Foods Website v2/39#0` | sticky-header Indus Foods Website v2/39#0 <header> | block:sgs/site-header | 0.58 |  |
| `skeleton:sticky-header:Indus Foods Website v2/40#0` | sticky-header Indus Foods Website v2/40#0 <div> | block:sgs/site-header-row | 1 |  |
| `skeleton:sticky-header:Indus Foods Website v2/41#0` | sticky-header Indus Foods Website v2/41#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place |  |
| `skeleton:sticky-header:Indus Foods Website v2/42#0` | sticky-header Indus Foods Website v2/42#0 <a> | unwrap | 1: the link around one or more logos (a mark and a wordmark) goes: the logo block links home itself |  |
| `skeleton:sticky-header:Indus Foods Website v2/43#0` | sticky-header Indus Foods Website v2/43#0 <indus-logo> | block:sgs/responsive-logo | 1: a custom element named as a logo (its tag matches logoImage, such as <brand-logo>) is the logo block, which reads the site logo |  |
| `skeleton:sticky-header:Indus Foods Website v2/45#0` | sticky-header Indus Foods Website v2/45#0 <nav> | block:sgs/nav-bar-menu | 1: the navigation inside a header is the menu bar block and inside a drawer the drawer menu block; both draw their items from a WordPress menu |  |
| `skeleton:sticky-header:Indus Foods Website v2/47` | sticky-header Indus Foods Website v2/47 <button> | absorbed | 1: 6 copies of one template element; drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:sticky-header:Indus Foods Website v2/48` | sticky-header Indus Foods Website v2/48 <span> "Home" | absorbed | 1: 6 copies of one template element; drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:sticky-header:Indus Foods Website v2/50` | sticky-header Indus Foods Website v2/50 <span> | absorbed | 1: 4 copies of one template element; drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:sticky-header:Indus Foods Website v2/52#0` | sticky-header Indus Foods Website v2/52#0 <span> | absorbed | 1: drawn by sgs/nav-bar-menu: rule navigation |  |
| `skeleton:sticky-header:Indus Foods Website v2/54#0` | sticky-header Indus Foods Website v2/54#0 <a> "Register For A Trade Account" | block:sgs/button | 0.75 |  |

### Settled by built post sgs_mega_menu 4426: the client already built this surface ([QA] Indus mega: About on sandybrown) (15)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:about-mega-menu:Indus Foods Website v2/67#0` | about-mega-menu Indus Foods Website v2/67#0 <div> | block:sgs/mega-panel | 1: 2 copies of one template element on 2 surfaces; a menu surface (the panel a navigation item opens) is sgs/mega-panel |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/68#0` | about-mega-menu Indus Foods Website v2/68#0 <div> | block:sgs/card-grid | 0.5: 2 copies of one template element on 2 surfaces |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/70` | about-mega-menu Indus Foods Website v2/70 <a> | absorbed | 1: 11 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/71` | about-mega-menu Indus Foods Website v2/71 <span> "01" | absorbed | 1: 11 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/72` | about-mega-menu Indus Foods Website v2/72 <span> | absorbed | 1: 11 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/73` | about-mega-menu Indus Foods Website v2/73 <span> "Our Story" | absorbed | 1: 11 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/74` | about-mega-menu Indus Foods Website v2/74 <span> "Six decades of family heritage" | absorbed | 1: 11 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/76#0` | about-mega-menu Indus Foods Website v2/76#0 <div> | block:sgs/card-grid | 0.5: 2 copies of one template element on 2 surfaces |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/77#0` | about-mega-menu Indus Foods Website v2/77#0 <div> | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/78#0` | about-mega-menu Indus Foods Website v2/78#0 <image-slot> | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/79#0` | about-mega-menu Indus Foods Website v2/79#0 <div> | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/80#0` | about-mega-menu Indus Foods Website v2/80#0 <span> "Since 1962" | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/81#0` | about-mega-menu Indus Foods Website v2/81#0 <div> "Six decades of heritage" | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/82#0` | about-mega-menu Indus Foods Website v2/82#0 <div> "From a Sparkbrook corner shop to one of the UK’s leading Indian food wholesalers." | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:about-mega-menu:Indus Foods Website v2/83#0` | about-mega-menu Indus Foods Website v2/83#0 <a> "Read our story" | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |

### Settled by built post sgs_mega_menu 4440: the client already built this surface ([QA] Indus mega: Brands on sandybrown) (10)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:brands-mega-menu:Indus Foods Website v2/100` | brands-mega-menu Indus Foods Website v2/100 <a> | absorbed | 1: 10 copies of one template element; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/101` | brands-mega-menu Indus Foods Website v2/101 <image-slot> | absorbed | 1: 10 copies of one template element; drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/102#0` | brands-mega-menu Indus Foods Website v2/102#0 <div> | block:sgs/card-grid | 0.5 |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/103#0` | brands-mega-menu Indus Foods Website v2/103#0 <span> "Own Brands" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/104#0` | brands-mega-menu Indus Foods Website v2/104#0 <div> "We develop and market our own Sanam range alongside trusted brands like Shan, Green Leaf and The Lemon Tree." | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/105#0` | brands-mega-menu Indus Foods Website v2/105#0 <a> "View All Brands" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/95#0` | brands-mega-menu Indus Foods Website v2/95#0 <div> | block:sgs/mega-panel | 1: a menu surface (the panel a navigation item opens) is sgs/mega-panel |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/96#0` | brands-mega-menu Indus Foods Website v2/96#0 <div> | block:sgs/card-grid | 0.5 |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/97#0` | brands-mega-menu Indus Foods Website v2/97#0 <div> "Our Brands" | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |
| `skeleton:brands-mega-menu:Indus Foods Website v2/98#0` | brands-mega-menu Indus Foods Website v2/98#0 <div> | absorbed | 1: drawn by sgs/card-grid: array_item_schema: sgs/card-grid holds its items in an attribute |  |

### Settled by built post sgs_mega_menu 4443: the client already built this surface ([QA] Indus mega: Sectors on sandybrown) (8)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:sectors-mega-menu:Indus Foods Website v2/85#0` | sectors-mega-menu Indus Foods Website v2/85#0 <div> | block:sgs/mega-panel | 1: a menu surface (the panel a navigation item opens) is sgs/mega-panel |  |
| `skeleton:sectors-mega-menu:Indus Foods Website v2/87` | sectors-mega-menu Indus Foods Website v2/87 <a> | block:sgs/container | 1: 4 copies of one template element; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |
| `skeleton:sectors-mega-menu:Indus Foods Website v2/88` | sectors-mega-menu Indus Foods Website v2/88 <div> | block:sgs/container | 0.75: 4 copies of one template element |  |
| `skeleton:sectors-mega-menu:Indus Foods Website v2/89` | sectors-mega-menu Indus Foods Website v2/89 <image-slot> | block:sgs/media | 1: 4 copies of one template element; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:sectors-mega-menu:Indus Foods Website v2/90` | sectors-mega-menu Indus Foods Website v2/90 <div> | block:sgs/container | 1: 4 copies of one template element |  |
| `skeleton:sectors-mega-menu:Indus Foods Website v2/91` | sectors-mega-menu Indus Foods Website v2/91 <div> "Food Service" | block:sgs/heading | 1: 4 copies of one template element; the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label |  |
| `skeleton:sectors-mega-menu:Indus Foods Website v2/92` | sectors-mega-menu Indus Foods Website v2/92 <div> "Quality ingredients for venues, caterers & events across the UK." | block:sgs/text | 0.25: 4 copies of one template element |  |
| `skeleton:sectors-mega-menu:Indus Foods Website v2/93` | sectors-mega-menu Indus Foods Website v2/93 <div> "Explore Food Service" | block:sgs/button | 1: 4 copies of one template element; a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) |  |

### Settled by rule alignWrapper: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) (6)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/22#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/22#0 <div> | unwrap | 1: 2 copies of one template element on 2 surfaces; a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/8#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/8#0 <div> | unwrap | 1: 2 copies of one template element on 2 surfaces; a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) |  |
| `skeleton:page-brands:Indus Foods Website v2/504` | page-brands Indus Foods Website v2/504 <div> | unwrap | 1: 10 copies of one template element; a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) |  |
| `skeleton:page-home:Indus Foods Website v2/219#0` | page-home Indus Foods Website v2/219#0 <div> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) |  |
| `skeleton:page-home:Indus Foods Website v2/267#0` | page-home Indus Foods Website v2/267#0 <div> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) |  |
| `skeleton:page-home:Indus Foods Website v2/292#0` | page-home Indus Foods Website v2/292#0 <div> | unwrap | 1: a wrapper whose only declared styles align or space its content (text alignment, padding, margin) goes: the blocks around and inside it align and pad themselves; anything that paints, positions or lays out stays (Bean, 2026-10-13) |  |

### Settled by rule backToTop: a back-to-top control is a link whose source is 'top' (the shared link source): a container whose whole box is the link when it holds a label and an icon, a button when it is words alone (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/726#0` | footer Indus Foods Website v2/726#0 <button> "Back to top" | block:sgs/container | 1: a back-to-top control is a link whose source is 'top' (the shared link source): a container whose whole box is the link when it holds a label and an icon, a button when it is words alone |  |

### Settled by rule cardAction: a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Indus Foods Website v2/493` | page-about Indus Foods Website v2/493 <span> "Learn more" | block:sgs/button | 1: 8 copies of one template element; a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) |  |
| `skeleton:page-blog:Indus Foods Website v2/615` | page-blog Indus Foods Website v2/615 <span> "Read article" | block:sgs/button | 1: 24 copies of one template element on 7 surfaces; a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) |  |
| `skeleton:page-brand-sanam:Indus Foods Website v2/491=sgs/button` | page-brand-sanam Indus Foods Website v2/491=sgs/button <div> "Dals, beans and chickpeas." | block:sgs/button | 1: 12 copies of one template element on 4 surfaces; a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) |  |
| `skeleton:page-contact:Indus Foods Website v2/536=sgs/button` | page-contact Indus Foods Website v2/536=sgs/button <span> "Sparkbrook, Birmingham B11 1BU" | block:sgs/button | 1: 2 copies of one template element; a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) |  |
| `skeleton:page-food-service:Indus Foods Website v2/377` | page-food-service Indus Foods Website v2/377 <span> "Explore Manufacturing" | block:sgs/button | 1: 12 copies of one template element on 4 surfaces; a card link that ends in a short call to action (a glyph beside it, or below two other pieces of text) is a plain card, and the call to action is the button that holds the link (Bean, 2026-10-13: the card is not a link; the button is the link) |  |

### Settled by rule cardTitle: the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-brands:Indus Foods Website v2/505` | page-brands Indus Foods Website v2/505 <div> "Sanam" | block:sgs/heading | 1: 10 copies of one template element; the first plain piece of text in a whole-card link titles the card (sgs/heading); text set as a kicker stays a label |  |

### Settled by rule columnHeading: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/703#0` | footer Indus Foods Website v2/703#0 <div> "Quick links" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style |  |
| `skeleton:footer:Indus Foods Website v2/710#0` | footer Indus Foods Website v2/710#0 <div> "Visit us" | block:sgs/heading | 1: the first piece of text in a column that sits directly in a header or footer row heads that column (sgs/heading), whatever its type style |  |

### Settled by rule decorationLayer: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in (11)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/654#0` | footer Indus Foods Website v2/654#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:footer:Indus Foods Website v2/655#0` | footer Indus Foods Website v2/655#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-about:Indus Foods Website v2/321#0` | page-about Indus Foods Website v2/321#0 <div> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-about:Indus Foods Website v2/361` | page-about Indus Foods Website v2/361 <span> | remove | 1: 8 copies of one template element on 2 surfaces; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-about:Indus Foods Website v2/518#0` | page-about Indus Foods Website v2/518#0 <span> | remove | 1: 23 copies of one template element on 23 surfaces; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-food-service:Indus Foods Website v2/368` | page-food-service Indus Foods Website v2/368 <span> | remove | 1: 12 copies of one template element on 4 surfaces; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-food-service:Indus Foods Website v2/369` | page-food-service Indus Foods Website v2/369 <span> | remove | 1: 12 copies of one template element on 4 surfaces; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-home:Indus Foods Website v2/232` | page-home Indus Foods Website v2/232 <span> | remove | 1: 4 copies of one template element; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-home:Indus Foods Website v2/257#0` | page-home Indus Foods Website v2/257#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-home:Indus Foods Website v2/297#0` | page-home Indus Foods Website v2/297#0 <span> | remove | 1: a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |
| `skeleton:page-our-story:Indus Foods Website v2/318#0` | page-our-story Indus Foods Website v2/318#0 <span> | remove | 1: 27 copies of one template element on 27 surfaces; a layer that holds nothing and only paints a fill, gradient or glow folds into the background of the block it sits in |  |

### Settled by rule decorativeShape: a floating shape that draws an outline (a ring) is a decorative image (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Indus Foods Website v2/516#0` | page-about Indus Foods Website v2/516#0 <span> | block:sgs/decorative-image | 1: 23 copies of one template element on 23 surfaces; a floating shape that draws an outline (a ring) is a decorative image |  |
| `skeleton:page-about:Indus Foods Website v2/517#0` | page-about Indus Foods Website v2/517#0 <span> | block:sgs/decorative-image | 1: 23 copies of one template element on 23 surfaces; a floating shape that draws an outline (a ring) is a decorative image |  |
| `skeleton:page-careers:Indus Foods Website v2/573#0` | page-careers Indus Foods Website v2/573#0 <span> | block:sgs/decorative-image | 1: 2 copies of one template element on 2 surfaces; a floating shape that draws an outline (a ring) is a decorative image |  |
| `skeleton:page-food-service:Indus Foods Website v2/370` | page-food-service Indus Foods Website v2/370 <span> | block:sgs/decorative-image | 1: 12 copies of one template element on 4 surfaces; a floating shape that draws an outline (a ring) is a decorative image |  |
| `skeleton:page-our-story:Indus Foods Website v2/319#0` | page-our-story Indus Foods Website v2/319#0 <span> | block:sgs/decorative-image | 1: 27 copies of one template element on 27 surfaces; a floating shape that draws an outline (a ring) is a decorative image |  |

### Settled by rule drawsChildren: the block each sits in draws it (each row's reason names that block) (9)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/687#0` | footer Indus Foods Website v2/687#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:footer:Indus Foods Website v2/690#0` | footer Indus Foods Website v2/690#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:footer:Indus Foods Website v2/693#0` | footer Indus Foods Website v2/693#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:footer:Indus Foods Website v2/699#0` | footer Indus Foods Website v2/699#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:footer:Indus Foods Website v2/707` | footer Indus Foods Website v2/707 <span> | absorbed | 1: 6 copies of one template element; drawn by sgs/icon-list: the list item's marker |  |
| `skeleton:top-bar:Indus Foods Website v2/23#0` | top-bar Indus Foods Website v2/23#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:top-bar:Indus Foods Website v2/26#0` | top-bar Indus Foods Website v2/26#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:top-bar:Indus Foods Website v2/29#0` | top-bar Indus Foods Website v2/29#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |
| `skeleton:top-bar:Indus Foods Website v2/35#0` | top-bar Indus Foods Website v2/35#0 <a> | block:sgs/icon | 0.75: drawn by sgs/social-icons: Fill generates its icons from the Site Info row |  |

### Settled by rule hero: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Indus Foods Website v2/316#0` | page-about Indus Foods Website v2/316#0 <section> | block:sgs/hero | 1: 28 copies of one template element on 28 surfaces; the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) |  |
| `skeleton:page-home:Indus Foods Website v2/203#0` | page-home Indus Foods Website v2/203#0 <section> | block:sgs/hero | 1: the first section of a page holding its h1 is sgs/hero (its label, heading, text and buttons are its content; an image inside makes it the split hero) |  |

### Settled by rule heroInner: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays (11)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-about:Indus Foods Website v2/322#0` | page-about Indus Foods Website v2/322#0 <div> | unwrap | 1: 28 copies of one template element on 28 surfaces; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-about:Indus Foods Website v2/329#0` | page-about Indus Foods Website v2/329#0 <div> | unwrap | 1: 28 copies of one template element on 28 surfaces; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-about:Indus Foods Website v2/330#0` | page-about Indus Foods Website v2/330#0 <div> | unwrap | 1: 28 copies of one template element on 28 surfaces; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-home:Indus Foods Website v2/204#0` | page-home Indus Foods Website v2/204#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-home:Indus Foods Website v2/205#0` | page-home Indus Foods Website v2/205#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-home:Indus Foods Website v2/215#0` | page-home Indus Foods Website v2/215#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-home:Indus Foods Website v2/216#0` | page-home Indus Foods Website v2/216#0 <div> | unwrap | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-home:Indus Foods Website v2/217#0` | page-home Indus Foods Website v2/217#0 <image-slot> | absorbed | 1: inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-our-story:Indus Foods Website v2/340#0` | page-our-story Indus Foods Website v2/340#0 <div> | unwrap | 1: 20 copies of one template element on 20 surfaces; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-our-story:Indus Foods Website v2/341#0` | page-our-story Indus Foods Website v2/341#0 <div> | unwrap | 1: 20 copies of one template element on 20 surfaces; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |
| `skeleton:page-our-story:Indus Foods Website v2/342#0` | page-our-story Indus Foods Website v2/342#0 <image-slot> | absorbed | 1: 20 copies of one template element on 20 surfaces; inside a hero, its image is the hero's own split media and its layout wrappers go (the hero lays out its content and media columns); a wrapper laying items side by side (a button group, a row of labels) stays |  |

### Settled by rule homeLink: the link around one or more logos (a mark and a wordmark) goes: the logo block links home itself (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/683#0` | footer Indus Foods Website v2/683#0 <a> | unwrap | 1: the link around one or more logos (a mark and a wordmark) goes: the logo block links home itself |  |

### Settled by rule hoursRows: a day and its opening times laid out as a row is sgs/business-info's hours display (rows layout); the day and time columns are drawn by it (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/677` | footer Indus Foods Website v2/677 <div> | block:sgs/business-info | 1: 4 copies of one template element; a day and its opening times laid out as a row is sgs/business-info's hours display (rows layout); the day and time columns are drawn by it |  |
| `skeleton:footer:Indus Foods Website v2/678` | footer Indus Foods Website v2/678 <span> "Monday – Thursday" | absorbed | 1: 4 copies of one template element; drawn by sgs/business-info: rule hoursRows |  |
| `skeleton:footer:Indus Foods Website v2/679` | footer Indus Foods Website v2/679 <span> "9:30am – 5pm" | absorbed | 1: 4 copies of one template element; drawn by sgs/business-info: rule hoursRows |  |

### Settled by rule label: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number (30)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/661#0` | footer Indus Foods Website v2/661#0 <span> "Call us" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:footer:Indus Foods Website v2/667#0` | footer Indus Foods Website v2/667#0 <span> "Email us" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:footer:Indus Foods Website v2/672#0` | footer Indus Foods Website v2/672#0 <span> "Opening hours" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-about:Indus Foods Website v2/331#0` | page-about Indus Foods Website v2/331#0 <span> "About Indus Foods" | block:sgs/label | 1: 25 copies of one template element on 25 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-about:Indus Foods Website v2/332#0` | page-about Indus Foods Website v2/332#0 <span> | absorbed | 1: 25 copies of one template element on 25 surfaces; drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) |  |
| `skeleton:page-about:Indus Foods Website v2/350` | page-about Indus Foods Website v2/350 <div> "Our heritage" | block:sgs/label | 1: 27 copies of one template element on 23 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-about:Indus Foods Website v2/351` | page-about Indus Foods Website v2/351 <span> | absorbed | 1: 27 copies of one template element on 23 surfaces; drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) |  |
| `skeleton:page-about:Indus Foods Website v2/489` | page-about Indus Foods Website v2/489 <span> "Heritage" | block:sgs/label | 1: 12 copies of one template element on 2 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-about:Indus Foods Website v2/520#0` | page-about Indus Foods Website v2/520#0 <div> "Work with us" | block:sgs/label | 1: 23 copies of one template element on 23 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-about:Indus Foods Website v2/521#0` | page-about Indus Foods Website v2/521#0 <span> | absorbed | 1: 23 copies of one template element on 23 surfaces; drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/10#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/10#0 <span> "Step 1 of 5" | block:sgs/label | 1: 2 copies of one template element on 2 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/89#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/89#0 <span> "Have these ready" | block:sgs/label | 1: 2 copies of one template element on 2 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-blog:Indus Foods Website v2/611` | page-blog Indus Foods Website v2/611 <span> "Seasonal" | block:sgs/label | 1: 24 copies of one template element on 7 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-blog:Indus Foods Website v2/612` | page-blog Indus Foods Website v2/612 <span> "Feb 2026" | block:sgs/label | 1: 24 copies of one template element on 7 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-careers:Indus Foods Website v2/427` | page-careers Indus Foods Website v2/427 <span> "Warehouse & logistics" | block:sgs/label | 1: 3 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-careers:Indus Foods Website v2/428` | page-careers Indus Foods Website v2/428 <span> "Full-time" | block:sgs/label | 1: 3 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-careers:Indus Foods Website v2/429` | page-careers Indus Foods Website v2/429 <span> "Birmingham B11" | block:sgs/label | 1: 3 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-careers:Indus Foods Website v2/575#0` | page-careers Indus Foods Website v2/575#0 <div> "Talk to us" | block:sgs/label | 1: 2 copies of one template element on 2 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-careers:Indus Foods Website v2/576#0` | page-careers Indus Foods Website v2/576#0 <span> | absorbed | 1: 2 copies of one template element on 2 surfaces; drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) |  |
| `skeleton:page-certifications:Indus Foods Website v2/401#0` | page-certifications Indus Foods Website v2/401#0 <div> "How we protect quality" | block:sgs/label | 1: 7 copies of one template element on 7 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-certifications:Indus Foods Website v2/402#0` | page-certifications Indus Foods Website v2/402#0 <span> | absorbed | 1: 7 copies of one template element on 7 surfaces; drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) |  |
| `skeleton:page-contact:Indus Foods Website v2/534` | page-contact Indus Foods Website v2/534 <span> "Visit" | block:sgs/label | 1: 3 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-home:Indus Foods Website v2/213` | page-home Indus Foods Website v2/213 <span> "BRC certified" | block:sgs/label | 1: 3 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-home:Indus Foods Website v2/214` | page-home Indus Foods Website v2/214 <span> | absorbed | 1: 3 copies of one template element; drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) |  |
| `skeleton:page-home:Indus Foods Website v2/247` | page-home Indus Foods Website v2/247 <span> "Est. 1962" | block:sgs/label | 1: 4 copies of one template element; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-home:Indus Foods Website v2/251#0` | page-home Indus Foods Website v2/251#0 <span> "Our heritage" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-home:Indus Foods Website v2/293#0` | page-home Indus Foods Website v2/293#0 <span> "Getting started" | block:sgs/label | 1: a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-our-story:Indus Foods Website v2/382` | page-our-story Indus Foods Website v2/382 <div> "Still family-run" | block:sgs/label | 1: 15 copies of one template element on 13 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |
| `skeleton:page-our-story:Indus Foods Website v2/383` | page-our-story Indus Foods Website v2/383 <span> | absorbed | 1: 15 copies of one template element on 13 surfaces; drawn by sgs/label: block_composition: sgs/label is a leaf (no inner blocks) |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/619#0` | page-post-post-1 Indus Foods Website v2/619#0 <span> "Seasonal" | block:sgs/label | 1: 6 copies of one template element on 6 surfaces; a short run of words set in capitals, wide tracking or a pill is a kicker, eyebrow or pill: sgs/label; never a control the visitor operates (a button, a click handler, a pressed or expanded state) and never a bare number |  |

### Settled by rule listWrapper: a bare wrapper whose only content is one list goes: the list block is that wrapper (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/704#0` | footer Indus Foods Website v2/704#0 <div> | unwrap | 1: a bare wrapper whose only content is one list goes: the list block is that wrapper |  |
| `skeleton:page-careers:Indus Foods Website v2/582#0` | page-careers Indus Foods Website v2/582#0 <div> | unwrap | 1: 2 copies of one template element on 2 surfaces; a bare wrapper whose only content is one list goes: the list block is that wrapper |  |
| `skeleton:page-home:Indus Foods Website v2/312#0` | page-home Indus Foods Website v2/312#0 <div> | unwrap | 1: a bare wrapper whose only content is one list goes: the list block is that wrapper |  |

### Settled by rule logoElement: a custom element named as a logo (its tag matches logoImage, such as <brand-logo>) is the logo block, which reads the site logo (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/684#0` | footer Indus Foods Website v2/684#0 <indus-logo> | block:sgs/responsive-logo | 1: a custom element named as a logo (its tag matches logoImage, such as <brand-logo>) is the logo block, which reads the site logo |  |

### Settled by rule mapEmbed: an embedded map is sgs/business-info's map display (2)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/712#0` | footer Indus Foods Website v2/712#0 <iframe> | block:sgs/business-info | 1: an embedded map is sgs/business-info's map display |  |
| `skeleton:page-contact:Indus Foods Website v2/538#0` | page-contact Indus Foods Website v2/538#0 <iframe> | block:sgs/business-info | 1: an embedded map is sgs/business-info's map display |  |

### Settled by rule marquee: a strip whose own animation loops a translate for ever (the motion inventory's record, never a name) is a marquee: logos make sgs/brand-strip, labels make sgs/trust-bar, and the repeated items are its items; the route writes no marquee motion until M7 (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home:Indus Foods Website v2/222#0` | page-home Indus Foods Website v2/222#0 <div> | block:sgs/brand-strip | 1: a strip whose own animation loops a translate for ever (the motion inventory's record, never a name) is a marquee: logos make sgs/brand-strip, labels make sgs/trust-bar, and the repeated items are its items; the route writes no marquee motion until M7 |  |
| `skeleton:page-home:Indus Foods Website v2/224` | page-home Indus Foods Website v2/224 <a> | absorbed | 1: 20 copies of one template element; drawn by sgs/brand-strip: rule marquee |  |
| `skeleton:page-home:Indus Foods Website v2/225` | page-home Indus Foods Website v2/225 <image-slot> | absorbed | 1: 20 copies of one template element; drawn by sgs/brand-strip: rule marquee |  |

### Settled by rule marqueeFrame: the frame that only clips or fades a marquee track goes: sgs/brand-strip draws its own overflow, and a masked edge fade belongs to its marquee motion (Bean, 2026-10-13) (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-home:Indus Foods Website v2/221#0` | page-home Indus Foods Website v2/221#0 <div> | unwrap | 1: the frame that only clips or fades a marquee track goes: sgs/brand-strip draws its own overflow, and a masked edge fade belongs to its marquee motion (Bean, 2026-10-13) |  |

### Settled by rule mediaElement: a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media (9)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:page-blog:Indus Foods Website v2/608` | page-blog Indus Foods Website v2/608 <image-slot> | block:sgs/media | 1: 24 copies of one template element on 7 surfaces; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-brand-sanam:Indus Foods Website v2/496` | page-brand-sanam Indus Foods Website v2/496 <image-slot> | block:sgs/media | 1: 14 copies of one template element on 4 surfaces; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-brands:Indus Foods Website v2/503` | page-brands Indus Foods Website v2/503 <image-slot> | block:sgs/media | 1: 10 copies of one template element; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-certifications:Indus Foods Website v2/484` | page-certifications Indus Foods Website v2/484 <image-slot> | block:sgs/media | 1: 8 copies of one template element on 2 surfaces; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-food-service:Indus Foods Website v2/372` | page-food-service Indus Foods Website v2/372 <image-slot> | block:sgs/media | 1: 12 copies of one template element on 4 surfaces; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-home:Indus Foods Website v2/234` | page-home Indus Foods Website v2/234 <image-slot> | block:sgs/media | 1: 4 copies of one template element; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-home:Indus Foods Website v2/279#0` | page-home Indus Foods Website v2/279#0 <image-slot> | block:sgs/media | 1: a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-home:Indus Foods Website v2/289#0` | page-home Indus Foods Website v2/289#0 <image-slot> | block:sgs/media | 1: a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |
| `skeleton:page-our-story:Indus Foods Website v2/396` | page-our-story Indus Foods Website v2/396 <image-slot> | block:sgs/media | 1: 15 copies of one template element on 13 surfaces; a custom element the draft uses as an image placeholder (<image-slot>) is sgs/media |  |

### Settled by rule openStatus: a live open or closed line is sgs/business-info's open-status display, computed in the visitor's browser from the Site Info hours (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/673#0` | footer Indus Foods Website v2/673#0 <span> "Open now" | block:sgs/business-info | 1: a live open or closed line is sgs/business-info's open-status display, computed in the visitor's browser from the Site Info hours |  |
| `skeleton:footer:Indus Foods Website v2/674#0` | footer Indus Foods Website v2/674#0 <span> | absorbed | 1: drawn by sgs/business-info: rule openStatus |  |
| `skeleton:footer:Indus Foods Website v2/680#0` | footer Indus Foods Website v2/680#0 <span> "Closes at 5pm today" | absorbed | 1: a live open or closed line is sgs/business-info's open-status display, computed in the visitor's browser from the Site Info hours |  |

### Settled by rule pillButton: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:top-bar:Indus Foods Website v2/14#0` | top-bar Indus Foods Website v2/14#0 <a> | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link |  |
| `skeleton:top-bar:Indus Foods Website v2/16#0` | top-bar Indus Foods Website v2/16#0 <span> "0121 771 4330" | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:whatsapp-button:Indus Foods Website v2/728#0` | whatsapp-button Indus Foods Website v2/728#0 <a> | block:sgs/button | 1: a link or button holding exactly one label (and a glyph) is one button whose glyph is its own icon; a toggle, a slider arrow and a link with no words are not pills; a lone link is a button too, which can be styled as a plain link |  |
| `skeleton:whatsapp-button:Indus Foods Website v2/729#0` | whatsapp-button Indus Foods Website v2/729#0 <img> | absorbed | 1: drawn by sgs/button: rule pillButton |  |
| `skeleton:whatsapp-button:Indus Foods Website v2/731#0` | whatsapp-button Indus Foods Website v2/731#0 <span> "Chat with our team" | absorbed | 1: drawn by sgs/button: rule pillButton |  |

### Settled by rule readingProgress: a full-width bar a few pixels tall, fixed to the viewport, is the Floating UI reading progress setting, not a block (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:scroll-progress-bar:Indus Foods Website v2/38#0` | scroll-progress-bar Indus Foods Website v2/38#0 <div> | remove | 1: a full-width bar a few pixels tall, fixed to the viewport, is the Floating UI reading progress setting, not a block |  |

### Settled by rule siteInfoLink: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself (5)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/717#0` | footer Indus Foods Website v2/717#0 <a> "Get Directions" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself |  |
| `skeleton:page-about:Indus Foods Website v2/526#0` | page-about Indus Foods Website v2/526#0 <a> "Call 0121 771 4330" | block:sgs/button | 1: 23 copies of one template element on 23 surfaces; a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/101#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/101#0 <a> "0121 771 4330" | block:sgs/button | 1: 2 copies of one template element on 2 surfaces; a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself |  |
| `skeleton:page-contact:Indus Foods Website v2/539#0` | page-contact Indus Foods Website v2/539#0 <a> "Get Directions" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself |  |
| `skeleton:top-bar:Indus Foods Website v2/20#0` | top-bar Indus Foods Website v2/20#0 <a> "amir@indusfoodsltd.com" | block:sgs/button | 1: a lone link to a phone number, an email address or a maps host is a button whose link reads Site Info (no typed tel: or mailto:), with its label from Site Info when the words are the value itself |  |

### Settled by rule solitaryIcon: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text (10)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/659#0` | footer Indus Foods Website v2/659#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:footer:Indus Foods Website v2/665#0` | footer Indus Foods Website v2/665#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:footer:Indus Foods Website v2/727#0` | footer Indus Foods Website v2/727#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/96` | page-apply Indus Foods Website v2>TradeApplication@466/96 <span> | block:sgs/icon | 1: 10 copies of one template element on 2 surfaces; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:page-careers:Indus Foods Website v2/419` | page-careers Indus Foods Website v2/419 <span> | block:sgs/icon | 1: 4 copies of one template element; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:page-contact:Indus Foods Website v2/532` | page-contact Indus Foods Website v2/532 <span> | block:sgs/icon | 1: 3 copies of one template element; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:page-delivery:Indus Foods Website v2/596` | page-delivery Indus Foods Website v2/596 <span> | block:sgs/icon | 1: 12 copies of one template element on 2 surfaces; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:page-home:Indus Foods Website v2/244` | page-home Indus Foods Website v2/244 <span> | block:sgs/icon | 1: 4 copies of one template element; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:page-home:Indus Foods Website v2/273#0` | page-home Indus Foods Website v2/273#0 <span> | block:sgs/icon | 1: a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/638#0` | page-post-post-1 Indus Foods Website v2/638#0 <span> | block:sgs/icon | 1: 6 copies of one template element on 6 surfaces; a glyph on its own (any icon library, an emoji alone, or a glyph the draft injects from a script value) is sgs/icon; an emoji inside running text stays typed in the text |  |

### Settled by rule surfaceRoot: a top bar above the header is the header's top row (sgs/site-header-row with its own hide-on-scroll setting), not a separate surface (1)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:top-bar:Indus Foods Website v2/9#0` | top-bar Indus Foods Website v2/9#0 <div> | block:sgs/site-header-row | 1: a top bar above the header is the header's top row (sgs/site-header-row with its own hide-on-scroll setting), not a separate surface |  |

### Settled by rule typedDivider: a typed divider between items is the row's separators setting, not a block (4)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/722#0` | footer Indus Foods Website v2/722#0 <span> "\|" | remove | 1: a typed divider between items is the row's separators setting, not a block |  |
| `skeleton:footer:Indus Foods Website v2/724#0` | footer Indus Foods Website v2/724#0 <span> "\|" | remove | 1: a typed divider between items is the row's separators setting, not a block |  |
| `skeleton:page-about:Indus Foods Website v2/325#0` | page-about Indus Foods Website v2/325#0 <span> "/" | remove | 1: 28 copies of one template element on 28 surfaces; a typed divider between items is the row's separators setting, not a block |  |
| `skeleton:page-about:Indus Foods Website v2/327#0` | page-about Indus Foods Website v2/327#0 <span> "/" | remove | 1: 28 copies of one template element on 28 surfaces; a typed divider between items is the row's separators setting, not a block |  |

### Settled by rule wholeCardLink: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) (7)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/658#0` | footer Indus Foods Website v2/658#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |
| `skeleton:footer:Indus Foods Website v2/664#0` | footer Indus Foods Website v2/664#0 <a> | block:sgs/container | 1: a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |
| `skeleton:page-about:Indus Foods Website v2/481` | page-about Indus Foods Website v2/481 <a> | block:sgs/container | 1: 55 copies of one template element on 11 surfaces; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |
| `skeleton:page-blog:Indus Foods Website v2/606` | page-blog Indus Foods Website v2/606 <a> | block:sgs/container | 1: 24 copies of one template element on 7 surfaces; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |
| `skeleton:page-brands:Indus Foods Website v2/501` | page-brands Indus Foods Website v2/501 <a> | block:sgs/container | 1: 10 copies of one template element; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |
| `skeleton:page-contact:Indus Foods Website v2/531` | page-contact Indus Foods Website v2/531 <a> | block:sgs/container | 1: 3 copies of one template element; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |
| `skeleton:page-food-service:Indus Foods Website v2/367` | page-food-service Indus Foods Website v2/367 <a> | block:sgs/container | 1: 12 copies of one template element on 4 surfaces; a link holding two or more pieces of text, or a heading, is a container; its whole box is the link unless it ends in a call to action, which then holds the link (cardAction) |  |

### Settled by rule widthWrapper: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place (3)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/656#0` | footer Indus Foods Website v2/656#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place |  |
| `skeleton:footer:Indus Foods Website v2/719#0` | footer Indus Foods Website v2/719#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place |  |
| `skeleton:top-bar:Indus Foods Website v2/10#0` | top-bar Indus Foods Website v2/10#0 <div> | unwrap | 1: a centring width wrapper (max-width with auto margins) inside a header, footer, row or section block goes: that block sets its own width; its children take its place |  |

### Confident proposals (Accept all covers these) (243)

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `skeleton:footer:Indus Foods Website v2/653#0` | footer Indus Foods Website v2/653#0 <footer> | block:sgs/site-footer | 1 |  |
| `skeleton:footer:Indus Foods Website v2/657#0` | footer Indus Foods Website v2/657#0 <div> | block:sgs/site-footer-row | 1 |  |
| `skeleton:footer:Indus Foods Website v2/660#0` | footer Indus Foods Website v2/660#0 <span> | block:sgs/container | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/662#0` | footer Indus Foods Website v2/662#0 <span> "0121 771 4330" | block:sgs/business-info | 0.8 |  |
| `skeleton:footer:Indus Foods Website v2/666#0` | footer Indus Foods Website v2/666#0 <span> | block:sgs/container | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/668#0` | footer Indus Foods Website v2/668#0 <span> "amir@indusfoodsltd.com" | block:sgs/business-info | 0.8 |  |
| `skeleton:footer:Indus Foods Website v2/670#0` | footer Indus Foods Website v2/670#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Indus Foods Website v2/671#0` | footer Indus Foods Website v2/671#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Indus Foods Website v2/675#0` | footer Indus Foods Website v2/675#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Indus Foods Website v2/681#0` | footer Indus Foods Website v2/681#0 <div> | block:sgs/site-footer-row | 1 |  |
| `skeleton:footer:Indus Foods Website v2/682#0` | footer Indus Foods Website v2/682#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/685#0` | footer Indus Foods Website v2/685#0 <p> "As an industry leading food & drink distributor, based in the heart of the UK, the company specialises in Ethnic Foods & has a strong export operation. Part of the Unitas Wholesale Group, with an annual turnover of £8bn, the company is at the forefront of driving positive growth within the Independent Wholesale sector." | block:sgs/text | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/686#0` | footer Indus Foods Website v2/686#0 <div> | block:sgs/social-icons | 0.74 |  |
| `skeleton:footer:Indus Foods Website v2/702#0` | footer Indus Foods Website v2/702#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/706` | footer Indus Foods Website v2/706 <a> "Certifications" | block:sgs/icon-list | 0.7: 6 copies of one template element |  |
| `skeleton:footer:Indus Foods Website v2/708#0` | footer Indus Foods Website v2/708#0 <a> "Apply For A Trade Account" | block:sgs/button | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/709#0` | footer Indus Foods Website v2/709#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/711#0` | footer Indus Foods Website v2/711#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:footer:Indus Foods Website v2/713#0` | footer Indus Foods Website v2/713#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Indus Foods Website v2/714#0` | footer Indus Foods Website v2/714#0 <div> "55-58 Stratford St N, Birmingham B11 1BU, United Kingdom" | block:sgs/business-info | 0.8 |  |
| `skeleton:footer:Indus Foods Website v2/718#0` | footer Indus Foods Website v2/718#0 <div> | block:sgs/site-footer-row | 1 |  |
| `skeleton:footer:Indus Foods Website v2/720#0` | footer Indus Foods Website v2/720#0 <div> | block:sgs/container | 1 |  |
| `skeleton:footer:Indus Foods Website v2/721#0` | footer Indus Foods Website v2/721#0 <span> "Copyright © 2026 Indus Foods Ltd" | block:sgs/business-info | 0.8 |  |
| `skeleton:footer:Indus Foods Website v2/725#0` | footer Indus Foods Website v2/725#0 <span> "Placeholder photography via Unsplash" | remove | 0.9: brief-only line (photo-credit-note): a note that the draft's photographs are stand-ins exists only for the design review; the live site uses the client's own photographs |  |
| `skeleton:page-about:Indus Foods Website v2/323#0` | page-about Indus Foods Website v2/323#0 <div> | block:sgs/container | 1: 28 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/324#0` | page-about Indus Foods Website v2/324#0 <a> "Home" | block:sgs/button | 0.75: 28 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/326#0` | page-about Indus Foods Website v2/326#0 <a> "About" | block:sgs/button | 0.75: 28 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/333#0` | page-about Indus Foods Website v2/333#0 <h1> "A family business feeding the UK since 1962." | block:sgs/heading | 0.75: 28 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/334#0` | page-about Indus Foods Website v2/334#0 <p> "We are a family-run Indian and South Asian food wholesaler based in Birmingham, supplying more than 5,000 foodservice, retail, manufacturing and wholesale customers across the UK and Europe." | block:sgs/text | 0.75: 28 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/338` | page-about Indus Foods Website v2/338 <a> "Read our story" | block:sgs/button | 0.75: 18 copies of one template element on 9 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/344` | page-about Indus Foods Website v2/344 <section> | block:sgs/container | 0.75: 88 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/345` | page-about Indus Foods Website v2/345 <div> | block:sgs/container | 0.75: 88 copies of one template element on 28 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/347` | page-about Indus Foods Website v2/347 <div> | block:sgs/container | 1: 27 copies of one template element on 23 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/348` | page-about Indus Foods Website v2/348 <div> | block:sgs/container | 0.75: 27 copies of one template element on 23 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/352` | page-about Indus Foods Website v2/352 <h2> "Six decades in five chapters." | block:sgs/heading | 0.75: 27 copies of one template element on 23 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/358#0` | page-about Indus Foods Website v2/358#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/360` | page-about Indus Foods Website v2/360 <div> | block:sgs/container | 0.75: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/437#0` | page-about Indus Foods Website v2/437#0 <div> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/438#0` | page-about Indus Foods Website v2/438#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/439#0` | page-about Indus Foods Website v2/439#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/479#0` | page-about Indus Foods Website v2/479#0 <div> | block:sgs/container | 1: 11 copies of one template element on 11 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/485` | page-about Indus Foods Website v2/485 <div> | block:sgs/container | 1: 55 copies of one template element on 11 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/486` | page-about Indus Foods Website v2/486 <div> | block:sgs/container | 1: 55 copies of one template element on 11 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/515#0` | page-about Indus Foods Website v2/515#0 <div> | block:sgs/container | 1: 23 copies of one template element on 23 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/519#0` | page-about Indus Foods Website v2/519#0 <div> | block:sgs/container | 0.75: 23 copies of one template element on 23 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/522#0` | page-about Indus Foods Website v2/522#0 <h2> "Ready to trade with Indus Foods?" | block:sgs/heading | 0.75: 23 copies of one template element on 23 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/523#0` | page-about Indus Foods Website v2/523#0 <p> "Open a trade account for wholesale pricing, a named account manager and UK-wide delivery." | block:sgs/text | 0.75: 23 copies of one template element on 23 surfaces |  |
| `skeleton:page-about:Indus Foods Website v2/525#0` | page-about Indus Foods Website v2/525#0 <a> "Become a Trade Customer" | block:sgs/button | 0.75: 23 copies of one template element on 23 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2/466#0` | page-apply Indus Foods Website v2/466#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/100#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/100#0 <p> "Our trade team can complete the application with you over the phone." | block:sgs/text | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/12#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/12#0 <span> "Saves as you go" | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/16#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/16#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/23#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/23#0 <h2> "Tell us about your business" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/24#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/24#0 <p> "The basics we need to set up your account and check your details." | block:sgs/text | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/26#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/26#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/4#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/4#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/6#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/6#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/7#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/7#0 <div> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/79#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/79#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/85#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/85#0 <button> "Continue" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/86#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/86#0 <aside> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/87#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/87#0 <div> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/88#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/88#0 <button> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/9#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/9#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/93#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/93#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466#0/98#0` | page-apply Indus Foods Website v2>TradeApplication@466#0/98#0 <div> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/18` | page-apply Indus Foods Website v2>TradeApplication@466/18 <button> | block:sgs/container | 1: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/28` | page-apply Indus Foods Website v2>TradeApplication@466/28 <div> | block:sgs/container | 1: 14 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/33=sgs/container` | page-apply Indus Foods Website v2>TradeApplication@466/33=sgs/container <label> "What kind of business are you?" | block:sgs/container | 1: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/49` | page-apply Indus Foods Website v2>TradeApplication@466/49 <button> "Restaurant or takeaway" | block:sgs/button | 0.75: 22 copies of one template element on 2 surfaces |  |
| `skeleton:page-apply:Indus Foods Website v2>TradeApplication@466/95` | page-apply Indus Foods Website v2>TradeApplication@466/95 <div> "Your trading and registered business name" | block:sgs/container | 1: 10 copies of one template element on 2 surfaces |  |
| `skeleton:page-blog:Indus Foods Website v2/603` | page-blog Indus Foods Website v2/603 <button> "All" | block:sgs/button | 0.75: 5 copies of one template element |  |
| `skeleton:page-blog:Indus Foods Website v2/604#0` | page-blog Indus Foods Website v2/604#0 <div> | block:sgs/container | 1: 7 copies of one template element on 7 surfaces |  |
| `skeleton:page-blog:Indus Foods Website v2/607` | page-blog Indus Foods Website v2/607 <div> | block:sgs/container | 0.75: 24 copies of one template element on 7 surfaces |  |
| `skeleton:page-blog:Indus Foods Website v2/609` | page-blog Indus Foods Website v2/609 <div> | block:sgs/container | 1: 24 copies of one template element on 7 surfaces |  |
| `skeleton:page-blog:Indus Foods Website v2/610` | page-blog Indus Foods Website v2/610 <div> | block:sgs/container | 1: 24 copies of one template element on 7 surfaces |  |
| `skeleton:page-brand-sanam:Indus Foods Website v2/495` | page-brand-sanam Indus Foods Website v2/495 <span> | block:sgs/container | 0.75: 14 copies of one template element on 4 surfaces |  |
| `skeleton:page-brands:Indus Foods Website v2/499#0` | page-brands Indus Foods Website v2/499#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-brands:Indus Foods Website v2/502` | page-brands Indus Foods Website v2/502 <div> | block:sgs/container | 0.75: 10 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/354#0` | page-careers Indus Foods Website v2/354#0 <p> "Apply for an open role below, or register your interest further down if you don’t see the right fit." | block:sgs/text | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/418` | page-careers Indus Foods Website v2/418 <button> "Register interest" | block:sgs/container | 1: 4 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/422#0` | page-careers Indus Foods Website v2/422#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-careers:Indus Foods Website v2/424` | page-careers Indus Foods Website v2/424 <article> | block:sgs/container | 1: 3 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/425` | page-careers Indus Foods Website v2/425 <div> | block:sgs/container | 0.75: 3 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/426` | page-careers Indus Foods Website v2/426 <div> | block:sgs/container | 1: 3 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/430` | page-careers Indus Foods Website v2/430 <h3> "Warehouse Operative" | block:sgs/heading | 0.75: 3 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/431` | page-careers Indus Foods Website v2/431 <p> "Picking, packing and loading ambient, chilled and frozen orders for trade customers across the UK. Forklift training is available." | block:sgs/text | 0.75: 3 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/432` | page-careers Indus Foods Website v2/432 <button> "Apply for this role" | block:sgs/button | 0.75: 3 copies of one template element |  |
| `skeleton:page-careers:Indus Foods Website v2/541#0` | page-careers Indus Foods Website v2/541#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/542#0` | page-careers Indus Foods Website v2/542#0 <div> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/550#0` | page-careers Indus Foods Website v2/550#0 <form> | block:sgs/container | 0.75: 4 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/551#0` | page-careers Indus Foods Website v2/551#0 <h3> "Register your interest" | block:sgs/heading | 0.75: 4 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/552#0` | page-careers Indus Foods Website v2/552#0 <p> "Tell us about yourself and we’ll be in touch when a suitable role opens." | block:sgs/text | 0.75: 4 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/553#0` | page-careers Indus Foods Website v2/553#0 <div> | block:sgs/container | 1: 4 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/555` | page-careers Indus Foods Website v2/555 <label> | block:sgs/container | 1: 28 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/556=sgs/container` | page-careers Indus Foods Website v2/556=sgs/container <span> "Full name" | block:sgs/container | 0.75: 16 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/569#0` | page-careers Indus Foods Website v2/569#0 <label> "I agree to Indus Foods contacting me about this enquiry." | block:sgs/container | 1: 4 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/571#0` | page-careers Indus Foods Website v2/571#0 <button> "Send application" | block:sgs/button | 0.75: 4 copies of one template element on 4 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/572#0` | page-careers Indus Foods Website v2/572#0 <aside> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/574#0` | page-careers Indus Foods Website v2/574#0 <div> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/577#0` | page-careers Indus Foods Website v2/577#0 <h3> "Prefer to talk first?" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/578#0` | page-careers Indus Foods Website v2/578#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/580` | page-careers Indus Foods Website v2/580 <div> "Call our office during working hours" | block:sgs/container | 1: 5 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/583#0` | page-careers Indus Foods Website v2/583#0 <a> "0121 771 4330" | block:sgs/icon-list | 0.7: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-careers:Indus Foods Website v2/584#0` | page-careers Indus Foods Website v2/584#0 <a> "amir@indusfoodsltd.com" | block:sgs/icon-list | 0.7: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/398#0` | page-certifications Indus Foods Website v2/398#0 <div> | block:sgs/container | 1: 8 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/399#0` | page-certifications Indus Foods Website v2/399#0 <div> | block:sgs/container | 0.75: 8 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/403#0` | page-certifications Indus Foods Website v2/403#0 <h2> "Controls at every step." | block:sgs/heading | 0.75: 8 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/405#0` | page-certifications Indus Foods Website v2/405#0 <p> "Certification is only as good as the process behind it." | block:sgs/text | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/408#0` | page-certifications Indus Foods Website v2/408#0 <div> | block:sgs/container | 0.75: 8 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/410` | page-certifications Indus Foods Website v2/410 <div> | block:sgs/container | 1: 28 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/412` | page-certifications Indus Foods Website v2/412 <div> | block:sgs/container | 0.75: 28 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/413` | page-certifications Indus Foods Website v2/413 <div> | block:sgs/container | 1: 28 copies of one template element on 8 surfaces |  |
| `skeleton:page-certifications:Indus Foods Website v2/483` | page-certifications Indus Foods Website v2/483 <div> | block:sgs/container | 0.75: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-community:Indus Foods Website v2/331#0` | page-community Indus Foods Website v2/331#0 <span> "About · Community & Charity" | block:sgs/container | 0.75: 3 copies of one template element on 3 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2/468#0` | page-contact Indus Foods Website v2/468#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-contact:Indus Foods Website v2/528#0` | page-contact Indus Foods Website v2/528#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-contact:Indus Foods Website v2/529#0` | page-contact Indus Foods Website v2/529#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-contact:Indus Foods Website v2/533` | page-contact Indus Foods Website v2/533 <span> | block:sgs/container | 0.75: 3 copies of one template element |  |
| `skeleton:page-contact:Indus Foods Website v2/535=sgs/business-info` | page-contact Indus Foods Website v2/535=sgs/business-info <span> "0121 771 4330" | block:sgs/business-info | 0.8: 2 copies of one template element |  |
| `skeleton:page-contact:Indus Foods Website v2/537#0` | page-contact Indus Foods Website v2/537#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/11#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/11#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/20#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/20#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/22#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/22#0 <h3> "Your details" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/23#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/23#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/3#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/3#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/30#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/30#0 <div> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/36#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/36#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/4#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/4#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/40#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/40#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/42#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/42#0 <button> "Send message" | block:sgs/button | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/6#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/6#0 <form> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/7#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/7#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468#0/9#0` | page-contact Indus Foods Website v2>EnquiryForm@468#0/9#0 <h3> "What can we help with?" | block:sgs/heading | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468/13` | page-contact Indus Foods Website v2>EnquiryForm@468/13 <button> | block:sgs/container | 1: 12 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468/25` | page-contact Indus Foods Website v2>EnquiryForm@468/25 <div> | block:sgs/container | 0.75: 8 copies of one template element on 2 surfaces |  |
| `skeleton:page-contact:Indus Foods Website v2>EnquiryForm@468/39` | page-contact Indus Foods Website v2>EnquiryForm@468/39 <button> "Email" | block:sgs/button | 0.75: 6 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/586#0` | page-delivery Indus Foods Website v2/586#0 <div> | block:sgs/container | 1: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/588#0` | page-delivery Indus Foods Website v2/588#0 <div> | block:sgs/container | 1: 4 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/589#0` | page-delivery Indus Foods Website v2/589#0 <div> | block:sgs/container | 0.75: 4 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/591#0` | page-delivery Indus Foods Website v2/591#0 <h3> "Delivery" | block:sgs/heading | 0.75: 4 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/592#0` | page-delivery Indus Foods Website v2/592#0 <div> | block:sgs/container | 0.75: 4 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/594` | page-delivery Indus Foods Website v2/594 <div> | block:sgs/container | 0.75: 12 copies of one template element on 2 surfaces |  |
| `skeleton:page-delivery:Indus Foods Website v2/595` | page-delivery Indus Foods Website v2/595 <button> "Is there a minimum order?" | block:sgs/container | 1: 12 copies of one template element on 2 surfaces |  |
| `skeleton:page-food-service:Indus Foods Website v2/365#0` | page-food-service Indus Foods Website v2/365#0 <div> | block:sgs/container | 1: 4 copies of one template element on 4 surfaces |  |
| `skeleton:page-food-service:Indus Foods Website v2/371` | page-food-service Indus Foods Website v2/371 <div> | block:sgs/container | 0.75: 12 copies of one template element on 4 surfaces |  |
| `skeleton:page-food-service:Indus Foods Website v2/373` | page-food-service Indus Foods Website v2/373 <div> | block:sgs/container | 1: 12 copies of one template element on 4 surfaces |  |
| `skeleton:page-home:Indus Foods Website v2/201#0` | page-home Indus Foods Website v2/201#0 <main> | block:sgs/container | 0.75: 29 copies of one template element on 29 surfaces |  |
| `skeleton:page-home:Indus Foods Website v2/206#0` | page-home Indus Foods Website v2/206#0 <h1> "Leading Indian Food & Drinks Wholesaler" | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/207#0` | page-home Indus Foods Website v2/207#0 <p> "Proud to be a family-run food wholesaler since 1962!" | block:sgs/text | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/209#0` | page-home Indus Foods Website v2/209#0 <a> "Apply For A Trade Account" | block:sgs/button | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/210#0` | page-home Indus Foods Website v2/210#0 <a> "Request Our Catalogue" | block:sgs/button | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/211#0` | page-home Indus Foods Website v2/211#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/218#0` | page-home Indus Foods Website v2/218#0 <section> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/220#0` | page-home Indus Foods Website v2/220#0 <h2> "Our Brands" | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/226#0` | page-home Indus Foods Website v2/226#0 <section> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/227#0` | page-home Indus Foods Website v2/227#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/228#0` | page-home Indus Foods Website v2/228#0 <h2> "Our UK Wide Food Services" | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/229#0` | page-home Indus Foods Website v2/229#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/231` | page-home Indus Foods Website v2/231 <div> | block:sgs/container | 1: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/233` | page-home Indus Foods Website v2/233 <div> | block:sgs/container | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/235` | page-home Indus Foods Website v2/235 <h3> "Food Service" | block:sgs/heading | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/236` | page-home Indus Foods Website v2/236 <p> "Top quality ingredients, drinks and food ready to be served at venues or events" | block:sgs/text | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/237` | page-home Indus Foods Website v2/237 <a> "Top Ethnic Food Services" | block:sgs/button | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/238#0` | page-home Indus Foods Website v2/238#0 <section> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/239#0` | page-home Indus Foods Website v2/239#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/240#0` | page-home Indus Foods Website v2/240#0 <h2> "Why Choose Indus Foods?" | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/241#0` | page-home Indus Foods Website v2/241#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/243` | page-home Indus Foods Website v2/243 <div> | block:sgs/container | 1: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/245` | page-home Indus Foods Website v2/245 <h3> "Experience" | block:sgs/heading | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/246` | page-home Indus Foods Website v2/246 <p> "Six decades supplying the UK trade, run by three generations of the same family." | block:sgs/text | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/248#0` | page-home Indus Foods Website v2/248#0 <section> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/249#0` | page-home Indus Foods Website v2/249#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/250#0` | page-home Indus Foods Website v2/250#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/252#0` | page-home Indus Foods Website v2/252#0 <h2> "Family-run since 1962." | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/253#0` | page-home Indus Foods Website v2/253#0 <p> "From a corner shop on Ladypool Road to one of the UK’s leading Indian food wholesalers, still run by the same family." | block:sgs/text | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/254#0` | page-home Indus Foods Website v2/254#0 <a> "Read our story" | block:sgs/button | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/255#0` | page-home Indus Foods Website v2/255#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/258#0` | page-home Indus Foods Website v2/258#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/260` | page-home Indus Foods Website v2/260 <div> | block:sgs/container | 1: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/262` | page-home Indus Foods Website v2/262 <span> | block:sgs/container | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/265#0` | page-home Indus Foods Website v2/265#0 <section> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/266#0` | page-home Indus Foods Website v2/266#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/268#0` | page-home Indus Foods Website v2/268#0 <h2> "Our Partners Love Us!" | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/269#0` | page-home Indus Foods Website v2/269#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/270#0` | page-home Indus Foods Website v2/270#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/271#0` | page-home Indus Foods Website v2/271#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/272#0` | page-home Indus Foods Website v2/272#0 <button> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/274#0` | page-home Indus Foods Website v2/274#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/276#0` | page-home Indus Foods Website v2/276#0 <p> "Brilliant customer service. Our account manager knows our order patterns and always keeps us informed about new products." | block:sgs/text | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/277#0` | page-home Indus Foods Website v2/277#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/278#0` | page-home Indus Foods Website v2/278#0 <span> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/280#0` | page-home Indus Foods Website v2/280#0 <span> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/283#0` | page-home Indus Foods Website v2/283#0 <button> | block:sgs/button | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/286` | page-home Indus Foods Website v2/286 <button> | block:sgs/button | 0.75: 4 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/287#0` | page-home Indus Foods Website v2/287#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/288#0` | page-home Indus Foods Website v2/288#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/290#0` | page-home Indus Foods Website v2/290#0 <section> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/291#0` | page-home Indus Foods Website v2/291#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/294#0` | page-home Indus Foods Website v2/294#0 <h2> "How to open a trade account" | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/295#0` | page-home Indus Foods Website v2/295#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/298#0` | page-home Indus Foods Website v2/298#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/300` | page-home Indus Foods Website v2/300 <div> | block:sgs/container | 1: 3 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/302` | page-home Indus Foods Website v2/302 <span> | block:sgs/container | 0.75: 3 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/303` | page-home Indus Foods Website v2/303 <h3> "Apply online" | block:sgs/heading | 0.75: 3 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/304` | page-home Indus Foods Website v2/304 <p> "Tell us about your business in a short form. It takes about five minutes." | block:sgs/text | 0.75: 3 copies of one template element |  |
| `skeleton:page-home:Indus Foods Website v2/305#0` | page-home Indus Foods Website v2/305#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/306#0` | page-home Indus Foods Website v2/306#0 <a> "Start your application" | block:sgs/button | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/307#0` | page-home Indus Foods Website v2/307#0 <section> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/308#0` | page-home Indus Foods Website v2/308#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-home:Indus Foods Website v2/309#0` | page-home Indus Foods Website v2/309#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/310#0` | page-home Indus Foods Website v2/310#0 <h2> "What Are You Waiting For?" | block:sgs/heading | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/311#0` | page-home Indus Foods Website v2/311#0 <p> "Our customers stay with us for decades because they can rely on the quality of the brands we stock, our fast delivery times and never have to look around for food and drinks again!" | block:sgs/text | 0.75 |  |
| `skeleton:page-home:Indus Foods Website v2/313#0` | page-home Indus Foods Website v2/313#0 <a> "Apply For A Trade Account" | block:sgs/icon-list | 0.7 |  |
| `skeleton:page-home:Indus Foods Website v2/314#0` | page-home Indus Foods Website v2/314#0 <a> "Request Our Catalogue" | block:sgs/icon-list | 0.7 |  |
| `skeleton:page-our-story:Indus Foods Website v2/379` | page-our-story Indus Foods Website v2/379 <div> | block:sgs/container | 1: 15 copies of one template element on 13 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/380` | page-our-story Indus Foods Website v2/380 <div> | block:sgs/container | 0.75: 15 copies of one template element on 13 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/384` | page-our-story Indus Foods Website v2/384 <h2> "The third generation at the helm." | block:sgs/heading | 0.75: 15 copies of one template element on 13 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/386` | page-our-story Indus Foods Website v2/386 <p> "The grandchildren of our founders now run the business day to day. The approach hasn’t changed: know every customer, keep the shelves full and price fairly." | block:sgs/text | 0.75: 18 copies of one template element on 13 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/388#0` | page-our-story Indus Foods Website v2/388#0 <div> | block:sgs/container | 1: 12 copies of one template element on 12 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/390` | page-our-story Indus Foods Website v2/390 <div> "Today’s Group member" | block:sgs/container | 1: 47 copies of one template element on 12 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/393#0` | page-our-story Indus Foods Website v2/393#0 <a> "See our certifications" | block:sgs/button | 0.75: 3 copies of one template element on 3 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/394` | page-our-story Indus Foods Website v2/394 <div> | block:sgs/container | 0.75: 15 copies of one template element on 13 surfaces |  |
| `skeleton:page-our-story:Indus Foods Website v2/395` | page-our-story Indus Foods Website v2/395 <div> | block:sgs/container | 0.75: 15 copies of one template element on 13 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/356#0` | page-post-post-1 Indus Foods Website v2/356#0 <a> "All articles" | block:sgs/button | 0.75: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/617#0` | page-post-post-1 Indus Foods Website v2/617#0 <article> | block:sgs/container | 0.75: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/618#0` | page-post-post-1 Indus Foods Website v2/618#0 <div> | block:sgs/container | 1: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/627#0` | page-post-post-1 Indus Foods Website v2/627#0 <p> "Ramadan is one of the busiest periods of the year for our customers. Restaurants extend their hours, caterers take on community iftars and retailers see demand for staples rise sharply." | block:sgs/text | 0.75: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/629` | page-post-post-1 Indus Foods Website v2/629 <p> "We begin building stock of rice, flour, oils, dates and spices well before the month begins, so customers can order at normal lead times when demand peaks." | block:sgs/text | 0.75: 13 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/631` | page-post-post-1 Indus Foods Website v2/631 <h2> "Planning starts months ahead" | block:sgs/heading | 0.75: 12 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/633#0` | page-post-post-1 Indus Foods Website v2/633#0 <blockquote> | block:sgs/container | 0.75: 2 copies of one template element on 2 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/636#0` | page-post-post-1 Indus Foods Website v2/636#0 <div> | block:sgs/container | 1: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/637#0` | page-post-post-1 Indus Foods Website v2/637#0 <a> "All articles" | block:sgs/container | 1: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-post-post-1:Indus Foods Website v2/639#0` | page-post-post-1 Indus Foods Website v2/639#0 <a> "Ask our team" | block:sgs/button | 0.75: 6 copies of one template element on 6 surfaces |  |
| `skeleton:page-terms:Indus Foods Website v2/642#0` | page-terms Indus Foods Website v2/642#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-terms:Indus Foods Website v2/643#0` | page-terms Indus Foods Website v2/643#0 <div> | block:sgs/container | 1 |  |
| `skeleton:page-terms:Indus Foods Website v2/645` | page-terms Indus Foods Website v2/645 <div> "Trade accounts" | block:sgs/container | 0.75: 7 copies of one template element |  |
| `skeleton:page-terms:Indus Foods Website v2/647#0` | page-terms Indus Foods Website v2/647#0 <div> | block:sgs/container | 0.75 |  |
| `skeleton:page-terms:Indus Foods Website v2/649` | page-terms Indus Foods Website v2/649 <div> | block:sgs/container | 0.75: 7 copies of one template element |  |
| `skeleton:page-terms:Indus Foods Website v2/650` | page-terms Indus Foods Website v2/650 <h3> "Trade accounts" | block:sgs/container | 0.75: 7 copies of one template element |  |
| `skeleton:page-terms:Indus Foods Website v2/652` | page-terms Indus Foods Website v2/652 <p> "Trade accounts are available to registered businesses. We may request company details or references before an account is opened." | block:sgs/text | 0.75: 7 copies of one template element |  |
| `skeleton:page-wholesale:Indus Foods Website v2/401#0` | page-wholesale Indus Foods Website v2/401#0 <div> "Why wholesalers work with us" | block:sgs/container | 1 |  |
| `skeleton:top-bar:Indus Foods Website v2/22#0` | top-bar Indus Foods Website v2/22#0 <div> | block:sgs/social-icons | 0.74 |  |

## Inventory diffs (inventory-diff)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `inventory:anim:Indus Foods Website v2.dc.html%7C1085%7Cjs:trigger.type` | **changed** J-05 (theirs J-04) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1086%7Cjs:trigger.type` | **changed** J-06 (theirs J-05) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:trigger.type` | **changed** J-07 (theirs J-06) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:trigger.type` | **changed** J-09 (theirs J-07) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1097%7Cjs:trigger.type` | **changed** J-11 (theirs J-08) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1102%7Cjs:trigger.type` | **changed** J-12 (theirs J-01) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1104%7Cjs:trigger.type` | **changed** J-13 (theirs J-02) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1107%7Cjs:trigger.type` | **changed** J-14 (theirs J-03) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1199%7Cjs:trigger.type` | **changed** J-23 (theirs J-18) trigger.type: ours mount, theirs scroll-position | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1248%7Cwaapi:trigger.type` | **changed** A-10 (theirs A-10) trigger.type: ours state, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1250%7Cwaapi:trigger.type` | **changed** A-11 (theirs A-11) trigger.type: ours state, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1333%7Cwaapi:trigger.type` | **changed** A-21 (theirs A-15) trigger.type: ours state, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1403%7Cwaapi:trigger.type` | **changed** A-26 (theirs A-21) trigger.type: ours mount, theirs load | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1407%7Cwaapi:trigger.type` | **changed** A-27 (theirs A-22) trigger.type: ours mount, theirs load | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1408%7Cwaapi:trigger.type` | **changed** A-28 (theirs A-23) trigger.type: ours mount, theirs load | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ccss-media:animation-duration.to` | RM-03 (theirs RM-03) animation-duration.to: ours 0.01ms !important, theirs .01ms !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ccss-media:properties` | RM-03 (theirs RM-03) properties: ours animation-duration,animation-iteration-count,transition-delay,transition-duration, theirs animation-duration,animation-iteration-count,scroll-behavior,transition-delay,transition-duration | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ccss-media:scroll-behavior.from` | RM-03 (theirs RM-03) scroll-behavior.from: ours null, theirs as declared | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ccss-media:scroll-behavior.to` | RM-03 (theirs RM-03) scroll-behavior.to: ours null, theirs auto !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ccss-media:transition-duration.to` | RM-03 (theirs RM-03) transition-duration.to: ours 0.01ms !important, theirs .01ms !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C13%7Ccss:border-color.from` | TR-120 (theirs TR-120) border-color.from: ours null, theirs 2px solid {{ tp.ring }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C13%7Ccss:delay_ms` | TR-120 (theirs TR-120) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C26%7Ccss:border-color.from` | TR-121 (theirs TR-121) border-color.from: ours null, theirs 1.5px solid {{ f.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C26%7Ccss:duration_ms` | TR-121 (theirs TR-121) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C27%7Ccss:duration_ms` | TR-122 (theirs TR-122) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C32%7Ccss:duration_ms` | TR-123 (theirs TR-123) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C39%7Ccss:border-color.from` | TR-124 (theirs TR-124) border-color.from: ours null, theirs 1.5px solid {{ p.ring }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C39%7Ccss:duration_ms` | TR-124 (theirs TR-124) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm%7Ctpl%7C42%7Ccss:delay_ms` | TR-125 (theirs TR-125) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:EnquiryForm.dc.html%7C99%7Cwaapi:trigger.type` | A-40 (theirs A-35) trigger.type: ours press, theirs validation-fail | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ccss-media:animation-duration.to` | RM-01 (theirs RM-01) animation-duration.to: ours 0.01ms !important, theirs .01ms !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ccss-media:properties` | RM-01 (theirs RM-01) properties: ours animation-duration,animation-iteration-count,transition-delay,transition-duration, theirs animation-duration,animation-iteration-count,scroll-behavior,transition-delay,transition-duration | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ccss-media:scroll-behavior.from` | RM-01 (theirs RM-01) scroll-behavior.from: ours null, theirs as declared | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ccss-media:scroll-behavior.to` | RM-01 (theirs RM-01) scroll-behavior.to: ours null, theirs auto !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ccss-media:transition-duration.to` | RM-01 (theirs RM-01) transition-duration.to: ours 0.01ms !important, theirs .01ms !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C127%7Ccss:transform.to` | TR-025 (theirs TR-025) transform.to: ours null, theirs translateX(5px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C127%7Ccss:trigger.type` | TR-025 (theirs TR-025) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C128%7Ccss:box-shadow.to` | TR-026 (theirs TR-026) box-shadow.to: ours null, theirs 0 0 0 6px rgba(231,215,104,.22) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C128%7Ccss:delay_ms` | TR-026 (theirs TR-026) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C128%7Ccss:duration_ms` | TR-026 (theirs TR-026) duration_ms: ours 300, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C128%7Ccss:easing` | TR-026 (theirs TR-026) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C128%7Ccss:trigger.type` | TR-026 (theirs TR-026) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C148%7Ccss:transform.to` | TR-031 (theirs TR-031) transform.to: ours null, theirs translateX(4px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C148%7Ccss:trigger.type` | TR-031 (theirs TR-031) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C153%7Ccss:transform.to` | TR-033 (theirs TR-033) transform.to: ours null, theirs translateX(4px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C153%7Ccss:trigger.type` | TR-033 (theirs TR-033) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C156%7Ccss:opacity.to` | TR-034 (theirs TR-034) opacity.to: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C156%7Ccss:trigger.type` | TR-034 (theirs TR-034) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C165%7Ccss:transform.to` | TR-036 (theirs TR-036) transform.to: ours null, theirs translateX(4px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C165%7Ccss:trigger.type` | TR-036 (theirs TR-036) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C200%7Ccss:transform.to` | TR-044 (theirs TR-044) transform.to: ours null, theirs translateX(4px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C200%7Ccss:trigger.type` | TR-044 (theirs TR-044) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C244%7Ccss:color.to` | TR-053 (theirs TR-053) color.to: ours null, theirs #D8CA50 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C244%7Ccss:trigger.type` | TR-053 (theirs TR-053) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C272%7Ccss:delay_ms` | TR-056 (theirs TR-056) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C272%7Ccss:duration_ms` | TR-056 (theirs TR-056) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C272%7Ccss:easing` | TR-056 (theirs TR-056) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C283%7Ccss:delay_ms` | TR-057 (theirs TR-057) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C283%7Ccss:duration_ms` | TR-057 (theirs TR-057) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C283%7Ccss:easing` | TR-057 (theirs TR-057) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C286%7Ccss:delay_ms` | TR-058 (theirs TR-058) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C286%7Ccss:duration_ms` | TR-058 (theirs TR-058) duration_ms: ours 300, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C286%7Ccss:easing` | TR-058 (theirs TR-058) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C324%7Ccss:status` | PS-003 (theirs PS-003) status: ours no-op, theirs active | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C326%7Ccss:status` | PS-004 (theirs PS-004) status: ours no-op, theirs active | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C356%7Ccss:delay_ms` | TR-065 (theirs TR-065) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C356%7Ccss:duration_ms` | TR-065 (theirs TR-065) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C356%7Ccss:easing` | TR-065 (theirs TR-065) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C393%7Ccss:delay_ms` | TR-067 (theirs TR-067) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C393%7Ccss:duration_ms` | TR-067 (theirs TR-067) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C393%7Ccss:easing` | TR-067 (theirs TR-067) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C407%7Ccss:delay_ms` | TR-068 (theirs TR-068) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C407%7Ccss:duration_ms` | TR-068 (theirs TR-068) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C407%7Ccss:easing` | TR-068 (theirs TR-068) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C418%7Ccss:background.to` | TR-070 (theirs TR-070) background.to: ours null, theirs #2C3E50) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C418%7Ccss:color.to` | TR-070 (theirs TR-070) color.to: ours null, theirs #E7D768) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C418%7Ccss:transform.to` | TR-070 (theirs TR-070) transform.to: ours null, theirs scale(1.05) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C418%7Ccss:trigger.type` | TR-070 (theirs TR-070) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C419%7Ccss:transform.to` | TR-071 (theirs TR-071) transform.to: ours null, theirs translateX(4px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C419%7Ccss:trigger.type` | TR-071 (theirs TR-071) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C448%7Ccss:delay_ms` | TR-075 (theirs TR-075) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C448%7Ccss:duration_ms` | TR-075 (theirs TR-075) duration_ms: ours 500, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C448%7Ccss:easing` | TR-075 (theirs TR-075) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C455%7Ccss:only-ours` | K-01 css-animation CSS animation none on <span> Indus Foods Website v2:455 is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C47%7Ccss:delay_ms` | TR-009 (theirs TR-009) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C47%7Ccss:duration_ms` | TR-009 (theirs TR-009) duration_ms: ours 220, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C47%7Ccss:easing` | TR-009 (theirs TR-009) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C473%7Ccss:status` | TR-076 (theirs TR-076) status: ours dead-code, theirs active | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C495%7Ccss:clip-path.to` | TR-078 (theirs TR-078) clip-path.to: ours null, theirs circle(90px at var(--mx,50%) var(--my,50%)) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C495%7Ccss:trigger.type` | TR-078 (theirs TR-078) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C497%7Ccss:delay_ms` | TR-079 (theirs TR-079) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C497%7Ccss:duration_ms` | TR-079 (theirs TR-079) duration_ms: ours 400, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C497%7Ccss:easing` | TR-079 (theirs TR-079) easing: ours cubic-bezier(.16,.84,.32,1), theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C497%7Ccss:transform.to` | TR-079 (theirs TR-079) transform.to: ours null, theirs scale(1) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C497%7Ccss:trigger.type` | TR-079 (theirs TR-079) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C510%7Ccss:status` | TR-081 (theirs TR-081) status: ours dead-code, theirs active | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C560%7Ccss:delay_ms` | TR-084 (theirs TR-084) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C560%7Ccss:duration_ms` | TR-084 (theirs TR-084) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C560%7Ccss:easing` | TR-084 (theirs TR-084) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C562%7Ccss:delay_ms` | TR-085 (theirs TR-085) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C562%7Ccss:duration_ms` | TR-085 (theirs TR-085) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C562%7Ccss:easing` | TR-085 (theirs TR-085) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C566%7Ccss:delay_ms` | TR-086 (theirs TR-086) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C566%7Ccss:duration_ms` | TR-086 (theirs TR-086) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C566%7Ccss:easing` | TR-086 (theirs TR-086) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C596%7Ccss:delay_ms` | TR-089 (theirs TR-089) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C596%7Ccss:duration_ms` | TR-089 (theirs TR-089) duration_ms: ours 300, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C596%7Ccss:easing` | TR-089 (theirs TR-089) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C603%7Ccss:delay_ms` | TR-090 (theirs TR-090) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C603%7Ccss:duration_ms` | TR-090 (theirs TR-090) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C603%7Ccss:easing` | TR-090 (theirs TR-090) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C61%7Ccss:trigger.type` | TR-015 (theirs TR-015) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C61%7Ccss:width.to` | TR-015 (theirs TR-015) width.to: ours null, theirs 18px | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C62%7Ccss:trigger.type` | TR-016 (theirs TR-016) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C62%7Ccss:width.to` | TR-016 (theirs TR-016) width.to: ours null, theirs 18px | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C637%7Ccss:delay_ms` | TR-092 (theirs TR-092) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C637%7Ccss:duration_ms` | TR-092 (theirs TR-092) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C637%7Ccss:easing` | TR-092 (theirs TR-092) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C723%7Ccss:delay_ms` | TR-104 (theirs TR-104) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C723%7Ccss:duration_ms` | TR-104 (theirs TR-104) duration_ms: ours 300, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C723%7Ccss:easing` | TR-104 (theirs TR-104) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C727%7Ccss:background.to` | TR-106 (theirs TR-106) background.to: ours null, theirs rgba(216,202,80,.12) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C727%7Ccss:transform.to` | TR-106 (theirs TR-106) transform.to: ours null, theirs rotate(-90deg) translateX(4px) scale(1.08)) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C727%7Ccss:trigger.type` | TR-106 (theirs TR-106) trigger.type: ours state, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C728%7Ccss:delay_ms` | TR-107 (theirs TR-107) delay_ms: ours 0, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C728%7Ccss:duration_ms` | TR-107 (theirs TR-107) duration_ms: ours 250, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2%7Ctpl%7C728%7Ccss:easing` | TR-107 (theirs TR-107) easing: ours ease, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1048%7Cjs:only-ours` | J-01 js-style-write js-style-write in componentWillUnmount on document.body is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1057%7Cjs:easing` | J-02 (theirs J-15) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1057%7Cjs:only-ours` | J-03 js-scroll js-scroll in componentDidUpdate on window is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1057%7Cjs:properties` | J-02 (theirs J-15) properties: ours scroll-position, theirs scrollY | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1057%7Cjs:scrollY.from` | J-02 (theirs J-15) scrollY.from: ours null, theirs any | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1057%7Cjs:scrollY.to` | J-02 (theirs J-15) scrollY.to: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1057%7Cjs:trigger.type` | J-02 (theirs J-15) trigger.type: ours state, theirs route | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1068%7Cjs:duration_ms` | J-04 (theirs J-13) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1068%7Cjs:easing` | J-04 (theirs J-13) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1068%7Cjs:overflow.to` | J-04 (theirs J-13) overflow.to: ours null, theirs hidden | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1085%7Cjs:duration_ms` | J-05 (theirs J-04) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1085%7Cjs:easing` | J-05 (theirs J-04) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1085%7Cjs:transform.from` | J-05 (theirs J-04) transform.from: ours null, theirs translate3d(0px,0,0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1085%7Cjs:transform.to` | J-05 (theirs J-04) transform.to: ours null, theirs translate3d(-dist px,0,0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1086%7Cjs:duration_ms` | J-06 (theirs J-05) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1086%7Cjs:easing` | J-06 (theirs J-05) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1086%7Cjs:transform.from` | J-06 (theirs J-05) transform.from: ours null, theirs scaleX(0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1086%7Cjs:transform.to` | J-06 (theirs J-05) transform.to: ours null, theirs scaleX(1) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:duration_ms` | J-07 (theirs J-06) duration_ms: ours 0, theirs 400 (opacity) / 500 (scale) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:easing` | J-07 (theirs J-06) easing: ours null, theirs cubic-bezier(.2,.8,.2,1) (scale), ease (opacity) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:opacity.from` | J-07 (theirs J-06) opacity.from: ours null, theirs 0.55 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:opacity.to` | J-07 (theirs J-06) opacity.to: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:properties` | J-07 (theirs J-06) properties: ours opacity, theirs opacity,scale | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:reduced_motion.behaviour` | J-07 (theirs J-06) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:scale.from` | J-07 (theirs J-06) scale.from: ours null, theirs 0.94 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1093%7Cjs:scale.to` | J-07 (theirs J-06) scale.to: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1094%7Cjs:only-ours` | J-08 js-style-write js-style-write in updatePins on [...track.querySelectorAll('[data-pin-card]')] is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:-webkit-text-stroke-color.from` | J-09 (theirs J-07) -webkit-text-stroke-color.from: ours null, theirs #0A7EA8 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:-webkit-text-stroke-color.to` | J-09 (theirs J-07) -webkit-text-stroke-color.to: ours null, theirs #D8CA50 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:color.from` | J-09 (theirs J-07) color.from: ours null, theirs transparent | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:color.to` | J-09 (theirs J-07) color.to: ours null, theirs #D8CA50 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:duration_ms` | J-09 (theirs J-07) duration_ms: ours 0, theirs 500 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:easing` | J-09 (theirs J-07) easing: ours null, theirs ease | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:only-ours` | J-10 js-style-write js-style-write in updatePins on [data-pin-year] is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:properties` | J-09 (theirs J-07) properties: ours color, theirs -webkit-text-stroke-color,color | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1096%7Cjs:reduced_motion.behaviour` | J-09 (theirs J-07) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1097%7Cjs:duration_ms` | J-11 (theirs J-08) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1097%7Cjs:easing` | J-11 (theirs J-08) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1097%7Cjs:textContent.from` | J-11 (theirs J-08) textContent.from: ours null, theirs 01 / NN | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1097%7Cjs:textContent.to` | J-11 (theirs J-08) textContent.to: ours null, theirs NN / NN | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1102%7Cjs:box-shadow.from` | J-12 (theirs J-01) box-shadow.from: ours null, theirs none | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1102%7Cjs:box-shadow.to` | J-12 (theirs J-01) box-shadow.to: ours null, theirs 0 10px 30px -18px rgba(20,40,60,.35) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1102%7Cjs:duration_ms` | J-12 (theirs J-01) duration_ms: ours 0, theirs 300 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1102%7Cjs:easing` | J-12 (theirs J-01) easing: ours null, theirs ease | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1102%7Cjs:reduced_motion.behaviour` | J-12 (theirs J-01) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1104%7Cjs:duration_ms` | J-13 (theirs J-02) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1104%7Cjs:easing` | J-13 (theirs J-02) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1104%7Cjs:transform.from` | J-13 (theirs J-02) transform.from: ours null, theirs scaleX(0) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1104%7Cjs:transform.to` | J-13 (theirs J-02) transform.to: ours null, theirs scaleX(1) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1107%7Cjs:duration_ms` | J-14 (theirs J-03) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1107%7Cjs:easing` | J-14 (theirs J-03) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1107%7Cjs:translate.from` | J-14 (theirs J-03) translate.from: ours null, theirs 0 0px | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1129%7Cjs:duration_ms` | J-15 (theirs J-16) duration_ms: ours 0, theirs browser smooth scroll | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1129%7Cjs:easing` | J-15 (theirs J-16) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1129%7Cjs:only-ours` | J-16 js-scroll js-scroll in toTop on window is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1129%7Cjs:properties` | J-15 (theirs J-16) properties: ours scroll-position, theirs scrollY | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1129%7Cjs:reduced_motion.behaviour` | J-15 (theirs J-16) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1129%7Cjs:scrollY.from` | J-15 (theirs J-16) scrollY.from: ours null, theirs any | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1129%7Cjs:scrollY.to` | J-15 (theirs J-16) scrollY.to: ours null, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1172%7Cjs:only-ours` | J-17 js-style-write js-style-write in buildScatter on document.createElement('span') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1177%7Cjs:only-ours` | J-18 js-style-write js-style-write in buildScatter on document.createElement('img') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:duration_ms` | J-19 (theirs J-19) duration_ms: ours 0, theirs 500 (scale) / 600 (rotate) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:easing` | J-19 (theirs J-19) easing: ours null, theirs cubic-bezier(.34,1.56,.64,1) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:only-ours` | J-20 js-style-write js-style-write in buildScatter on document.createElement('img') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:properties` | J-19 (theirs J-19) properties: ours scale, theirs rotate,scale | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:rotate.from` | J-19 (theirs J-19) rotate.from: ours null, theirs rot deg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:rotate.to` | J-19 (theirs J-19) rotate.to: ours null, theirs rot ± 25deg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:scale.from` | J-19 (theirs J-19) scale.from: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1179%7Cjs:status` | J-19 (theirs J-19) status: ours active, theirs dead-code | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1180%7Cjs:only-ours` | J-21 js-style-write js-style-write in buildScatter on document.createElement('img') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1180%7Cjs:only-ours~2` | J-22 js-style-write js-style-write in buildScatter on document.createElement('img') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1184%7Cwaapi:translate.to` | A-03 (theirs A-03) translate.to: ours (rnd() * 10 - 5).toFixed(1) + 'px -' + (6 + rnd() * 12).toFixed(1) + 'px', theirs rnd(-5..5)px -rnd(6..18)px | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1184%7Cwaapi:trigger.type` | A-03 (theirs A-03) trigger.type: ours state, theirs loop | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1185%7Cwaapi:trigger.type` | A-04 (theirs A-04) trigger.type: ours state, theirs mount | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1199%7Cjs:duration_ms` | J-23 (theirs J-18) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1199%7Cjs:easing` | J-23 (theirs J-18) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1199%7Cjs:status` | J-23 (theirs J-18) status: ours active, theirs dead-code | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1208%7Cjs:only-ours` | J-24 js-style-write js-style-write in updateFood on el.children is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1242%7Cwaapi:delay_ms` | A-09 (theirs A-09) delay_ms: ours (rv.i \|\| 0) * 80, theirs (i % 8) * 80 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1254%7Cwaapi:delay_ms` | A-12 (theirs A-12) delay_ms: ours Math.min(i * 26, 320), theirs min(i*26, 320) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1268%7Cwaapi:delay_ms` | A-16 (theirs A-14) delay_ms: ours 140 + i * 55, theirs 140 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1276%7Cjs:duration_ms` | J-25 (theirs J-20) duration_ms: ours 0, theirs browser smooth scroll | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1276%7Cjs:properties` | J-25 (theirs J-20) properties: ours scroll-position, theirs scrollTop | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1276%7Cjs:reduced_motion.behaviour` | J-25 (theirs J-20) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1276%7Cjs:scrollTop.to` | J-25 (theirs J-20) scrollTop.to: ours null, theirs row.offsetTop - 6 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1278%7Cwaapi:delay_ms` | A-17 (theirs A-39) delay_ms: ours 80 + Math.min(k * 45, 360), theirs 80 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1285%7Cwaapi:delay_ms` | A-18 (theirs A-40) delay_ms: ours -Math.random() * dur, theirs -random × duration | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1285%7Cwaapi:duration_ms` | A-18 (theirs A-40) duration_ms: ours dur, theirs 7000 + random × 6000 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1285%7Cwaapi:scale.to` | A-18 (theirs A-40) scale.to: ours sc, theirs {s} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1285%7Cwaapi:translate.to` | A-18 (theirs A-40) translate.to: ours dx + 'px ' + dy + 'px', theirs {dx}px {dy}px | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1285%7Cwaapi:trigger.type` | A-18 (theirs A-40) trigger.type: ours mount, theirs loop | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1293%7Cjs:duration_ms` | J-26 (theirs J-21) duration_ms: ours 0, theirs browser smooth scroll | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1293%7Cjs:only-ours` | J-27 js-scroll js-scroll in toForm on window is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1293%7Cjs:properties` | J-26 (theirs J-21) properties: ours scroll-position, theirs select.value,window.scrollY | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1293%7Cjs:reduced_motion.behaviour` | J-26 (theirs J-21) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1293%7Cjs:select.value.to` | J-26 (theirs J-21) select.value.to: ours null, theirs role title / team name | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1293%7Cjs:window.scrollY.to` | J-26 (theirs J-21) window.scrollY.to: ours null, theirs card top + scrollY - (header height + 24) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1333%7Cwaapi:duration_ms` | A-21 (theirs A-15) duration_ms: ours dur, theirs dist / 0.045 (45 px/s) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1333%7Cwaapi:transform.to` | A-21 (theirs A-15) transform.to: ours 'translateX(-' + dist + 'px)', theirs translateX(-{dist}px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1334%7Cjs:only-ours` | J-28 waapi-control waapi-control in startMarquee on el._anim is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1334%7Cjs:only-ours~2` | J-29 waapi-control waapi-control in startMarquee on el._anim is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1336%7Cjs:duration_ms` | J-30 (theirs J-14) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1336%7Cjs:easing` | J-30 (theirs J-14) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1336%7Cjs:playback-rate.to` | J-30 (theirs J-14) playback-rate.to: ours 0.15, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1336%7Cjs:playbackRate (of A-15).from` | J-30 (theirs J-14) playbackRate (of A-15).from: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1336%7Cjs:playbackRate (of A-15).to` | J-30 (theirs J-14) playbackRate (of A-15).to: ours null, theirs 0.15 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1336%7Cjs:properties` | J-30 (theirs J-14) properties: ours playback-rate, theirs playbackRate (of A-15) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1337%7Cjs:only-ours` | J-31 waapi-control waapi-control in playMarquee on this._mq._anim is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1338%7Cwaapi:delay_ms` | A-22 (theirs A-16) delay_ms: ours delay \|\| 0, theirs 0 (184) / 900 (256) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1338%7Cwaapi:trigger.type` | A-22 (theirs A-16) trigger.type: ours mount, theirs loop | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1344%7Cwaapi:delay_ms` | A-23 (theirs A-17) delay_ms: ours -Math.random() * 3000, theirs -random*3000 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1344%7Cwaapi:duration_ms` | A-23 (theirs A-17) duration_ms: ours 2800 + Math.random() * 2200, theirs 2800 + random*2200 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1344%7Cwaapi:trigger.type` | A-23 (theirs A-17) trigger.type: ours mount, theirs loop | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1352%7Cjs:--pr.from` | J-32 (theirs J-23) --pr.from: ours null, theirs 0px | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1352%7Cjs:duration_ms` | J-32 (theirs J-23) duration_ms: ours 0, theirs 400 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1352%7Cjs:easing` | J-32 (theirs J-23) easing: ours null, theirs cubic-bezier(.16,.84,.32,1) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1352%7Cjs:only-ours` | J-33 js-style-write js-style-write in bindMotion on e.target.closest && e.target.closest('[data-peek]') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1352%7Cjs:only-ours~2` | J-34 js-style-write js-style-write in bindMotion on e.target.closest && e.target.closest('[data-peek]') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1358%7Cjs:--mx / --my.to` | J-35 (theirs J-22) --mx / --my.to: ours null, theirs pointer position inside the card (px) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1358%7Cjs:only-ours` | J-36 js-style-write js-style-write in bindMotion on e.target.closest && e.target.closest('[data-peek]') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1358%7Cjs:properties` | J-35 (theirs J-22) properties: ours --mx, theirs --mx / --my | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1365%7Cjs:--gx.from` | J-37 (theirs J-09) --gx.from: ours null, theirs 50% | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1365%7Cjs:--gy.from` | J-37 (theirs J-09) --gy.from: ours null, theirs 0% | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1365%7Cjs:duration_ms` | J-37 (theirs J-09) duration_ms: ours 0, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1365%7Cjs:easing` | J-37 (theirs J-09) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1365%7Cjs:properties` | J-37 (theirs J-09) properties: ours rotate, theirs --gx,--gy,rotate | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1365%7Cjs:rotate.from` | J-37 (theirs J-09) rotate.from: ours null, theirs 0 0 1 0deg | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1366%7Cjs:only-ours` | J-38 js-style-write js-style-write in bindMotion on e.target.closest && e.target.closest('[data-tilt]') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1366%7Cjs:only-ours~2` | J-39 js-style-write js-style-write in bindMotion on e.target.closest && e.target.closest('[data-tilt]') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1369%7Cjs:only-ours` | J-40 js-style-write js-style-write in bindMotion on this._magEl = null is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1372%7Cjs:only-ours` | J-41 js-style-write js-style-write in bindMotion on e.target.closest && e.target.closest('[data-mag]') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1373%7Cjs:duration_ms` | J-42 (theirs J-10) duration_ms: ours 0, theirs 250 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1373%7Cjs:easing` | J-42 (theirs J-10) easing: ours null, theirs cubic-bezier(.16,.84,.32,1) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1373%7Cjs:translate.from` | J-42 (theirs J-10) translate.from: ours null, theirs 0 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1381%7Cjs:only-ours` | J-43 js-style-write js-style-write in bindMotion on document.createElement('span') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1386%7Cjs:only-ours` | J-44 js-style-write js-style-write in fx on host is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1387%7Cjs:only-ours` | J-45 js-style-write js-style-write in fx on host is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1387%7Cjs:only-ours~2` | J-46 js-style-write js-style-write in fx on host is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1389%7Cwaapi:duration_ms` | A-24 (theirs A-18) duration_ms: ours dur, theirs 750 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1389%7Cwaapi:properties` | A-24 (theirs A-18) properties: ours keyframes, theirs transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1389%7Cwaapi:reduced_motion.behaviour` | A-24 (theirs A-18) reduced_motion.behaviour: ours unchanged, theirs skip | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1389%7Cwaapi:transform.from` | A-24 (theirs A-18) transform.from: ours null, theirs translateX(-120%) skewX(-18deg) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1389%7Cwaapi:transform.to` | A-24 (theirs A-18) transform.to: ours null, theirs translateX(260%) skewX(-18deg) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1389%7Cwaapi:trigger.type` | A-24 (theirs A-18) trigger.type: ours press, theirs pointer-move | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1394%7Cjs:only-ours` | J-47 js-style-write js-style-write in shine on document.createElement('span') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1397%7Cjs:only-ours` | J-48 js-style-write js-style-write in resetTilt on t is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1397%7Cjs:only-ours~2` | J-49 js-style-write js-style-write in resetTilt on t is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1397%7Cjs:only-ours~3` | J-50 js-style-write js-style-write in resetTilt on t is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1397%7Cwaapi:reduced_motion.behaviour` | A-25 (theirs A-20) reduced_motion.behaviour: ours unchanged, theirs skip | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1397%7Cwaapi:rotate.from` | A-25 (theirs A-20) rotate.from: ours t.style.rotate \|\| 'none', theirs current inline rotate | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1397%7Cwaapi:trigger.type` | A-25 (theirs A-20) trigger.type: ours pointer-move, theirs pointer-leave | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1441%7Cjs:only-ours` | J-51 js-style-write js-style-write in setHeroSvgEl on svg is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1447%7Cjs:only-ours` | J-52 js-style-write js-style-write in setHeroSvgEl on [gold, glow, hi] is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1447%7Cjs:only-ours~2` | J-53 js-style-write js-style-write in setHeroSvgEl on q('sunrays_expand') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1447%7Cjs:only-ours~3` | J-54 js-style-write js-style-write in setHeroSvgEl on q('background') is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1449%7Cwaapi:reduced_motion.behaviour` | A-29 (theirs A-24) reduced_motion.behaviour: ours skip, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1450%7Cwaapi:reduced_motion.behaviour` | A-30 (theirs A-25) reduced_motion.behaviour: ours skip, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1451%7Cwaapi:reduced_motion.behaviour` | A-31 (theirs A-26) reduced_motion.behaviour: ours skip, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1452%7Cwaapi:reduced_motion.behaviour` | A-32 (theirs A-27) reduced_motion.behaviour: ours skip, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1453%7Cwaapi:reduced_motion.behaviour` | A-33 (theirs A-28) reduced_motion.behaviour: ours skip, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1454%7Cwaapi:reduced_motion.behaviour` | A-34 (theirs A-29) reduced_motion.behaviour: ours skip, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1455%7Cwaapi:reduced_motion.behaviour` | A-35 (theirs A-30) reduced_motion.behaviour: ours skip, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1471%7Cjs:duration_ms` | J-55 (theirs J-11) duration_ms: ours 0, theirs 200 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1471%7Cjs:easing` | J-55 (theirs J-11) easing: ours null, theirs ease-out | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1471%7Cjs:transform.from` | J-55 (theirs J-11) transform.from: ours null, theirs none | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1473%7Cjs:only-ours` | J-56 js-style-write js-style-write in resetLabel on [data-label] is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:box-shadow.from` | J-57 (theirs J-12) box-shadow.from: ours null, theirs 0 4px 14px -6px rgba(10,126,168,.5) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:box-shadow.to` | J-57 (theirs J-12) box-shadow.to: ours null, theirs 0 12px 26px -8px rgba(10,126,168,.6) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:duration_ms` | J-57 (theirs J-12) duration_ms: ours 0, theirs 200 (transform) / 300 (box-shadow) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:easing` | J-57 (theirs J-12) easing: ours null, theirs ease | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:only-ours` | J-58 js-style-write js-style-write in btnEnter on e.currentTarget of onMouseEnter is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:properties` | J-57 (theirs J-12) properties: ours transform, theirs box-shadow,transform | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:reduced_motion.behaviour` | J-57 (theirs J-12) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1480%7Cjs:transform.from` | J-57 (theirs J-12) transform.from: ours null, theirs none | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1481%7Cjs:only-ours` | J-59 js-style-write js-style-write in btnLeave on e.currentTarget of onMouseLeave is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1481%7Cjs:only-ours~2` | J-60 js-style-write js-style-write in btnLeave on e.currentTarget of onMouseLeave is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1979%7Cjs:only-ours` | J-61 js-style-write js-style-write in scatter on e.currentTarget is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:Indus Foods Website v2.dc.html%7C1980%7Cjs:only-ours` | J-62 js-style-write js-style-write in scatter on e.currentTarget is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:TradeApplication%7Ccss-media:animation-duration.to` | RM-02 (theirs RM-02) animation-duration.to: ours 0.01ms !important, theirs .01ms !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ccss-media:properties` | RM-02 (theirs RM-02) properties: ours animation-duration,animation-iteration-count,transition-delay,transition-duration, theirs animation-duration,animation-iteration-count,scroll-behavior,transition-delay,transition-duration | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ccss-media:scroll-behavior.from` | RM-02 (theirs RM-02) scroll-behavior.from: ours null, theirs as declared | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ccss-media:scroll-behavior.to` | RM-02 (theirs RM-02) scroll-behavior.to: ours null, theirs auto !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ccss-media:transition-duration.to` | RM-02 (theirs RM-02) transition-duration.to: ours 0.01ms !important, theirs .01ms !important | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C101%7Ccss:delay_ms` | TR-118 (theirs TR-118) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C105%7Ccss:delay_ms` | TR-119 (theirs TR-119) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C19%7Ccss:border-color.from` | TR-109 (theirs TR-109) border-color.from: ours null, theirs 2px solid {{ st.ring }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C19%7Ccss:delay_ms` | TR-109 (theirs TR-109) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C39%7Ccss:border-color.from` | TR-110 (theirs TR-110) border-color.from: ours null, theirs 1.5px solid {{ f.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C39%7Ccss:duration_ms` | TR-110 (theirs TR-110) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C49%7Ccss:border-color.from` | TR-111 (theirs TR-111) border-color.from: ours null, theirs 1.5px solid {{ c.ring }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C49%7Ccss:delay_ms` | TR-111 (theirs TR-111) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C53%7Ccss:border-color.from` | TR-112 (theirs TR-112) border-color.from: ours null, theirs 1.5px solid {{ f.border }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C53%7Ccss:duration_ms` | TR-112 (theirs TR-112) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C54%7Ccss:border-color.from` | TR-113 (theirs TR-113) border-color.from: ours null, theirs 2px solid {{ f.boxRing }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C54%7Ccss:duration_ms` | TR-113 (theirs TR-113) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C57%7Ccss:border-color.from` | TR-114 (theirs TR-114) border-color.from: ours null, theirs 1.5px dashed {{ f.fileRing }} | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C57%7Ccss:duration_ms` | TR-114 (theirs TR-114) duration_ms: ours 200, theirs per property | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C81%7Ccss:border-color.from` | TR-115 (theirs TR-115) border-color.from: ours null, theirs 1.5px solid #D5DEE5 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C81%7Ccss:delay_ms` | TR-115 (theirs TR-115) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C81%7Ccss:easing` | TR-115 (theirs TR-115) easing: ours per property, theirs ease | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication%7Ctpl%7C85%7Ccss:delay_ms` | TR-116 (theirs TR-116) delay_ms: ours per property, theirs 0 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C170%7Cwaapi:transform.from` | A-36 (theirs A-31) transform.from: ours 'translateX(' + 36 * dir + 'px)', theirs translateX(36px × dir) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C172%7Cjs:duration_ms` | J-101 (theirs J-17) duration_ms: ours 0, theirs browser smooth scroll | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C172%7Cjs:easing` | J-101 (theirs J-17) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C172%7Cjs:properties` | J-101 (theirs J-17) properties: ours scroll-position, theirs scrollY | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C172%7Cjs:reduced_motion.behaviour` | J-101 (theirs J-17) reduced_motion.behaviour: ours unchanged, theirs final-state | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C172%7Cjs:scrollY.from` | J-101 (theirs J-17) scrollY.from: ours null, theirs any | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C172%7Cjs:scrollY.to` | J-101 (theirs J-17) scrollY.to: ours null, theirs form top − 120px | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:TradeApplication.dc.html%7C255%7Cwaapi:trigger.type` | A-38 (theirs A-33) trigger.type: ours press, theirs validation-fail | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:image-slot.js%7C1006%7Cjs:only-ours` | J-68 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1007%7Cjs:only-ours` | J-69 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1008%7Cjs:only-ours` | J-70 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1009%7Cjs:only-ours` | J-71 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1010%7Cjs:only-ours` | J-72 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1022%7Cjs:only-ours` | J-73 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1022%7Cjs:only-ours~2` | J-74 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1023%7Cjs:only-ours` | J-75 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1023%7Cjs:only-ours~2` | J-76 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1024%7Cjs:only-ours` | J-77 js-style-write js-style-write in ImageSlot._applyView on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1035%7Cjs:only-ours` | J-78 js-style-write js-style-write in ImageSlot._applyView on this._spill is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1036%7Cjs:only-ours` | J-79 js-style-write js-style-write in ImageSlot._applyView on this._spill is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1037%7Cjs:only-ours` | J-80 js-style-write js-style-write in ImageSlot._applyView on this._spill is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1038%7Cjs:only-ours` | J-81 js-style-write js-style-write in ImageSlot._applyView on this._spill is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1065%7Cjs:only-ours` | J-82 js-style-write js-style-write in ImageSlot._render on this._frame is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1066%7Cjs:only-ours` | J-83 js-style-write js-style-write in ImageSlot._render on this._frame is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1067%7Cjs:only-ours` | J-84 js-style-write js-style-write in ImageSlot._render on this._ring is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1068%7Cjs:only-ours` | J-85 js-style-write js-style-write in ImageSlot._render on this._ring is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1073%7Cjs:only-ours` | J-86 js-style-write js-style-write in ImageSlot._render on this._sub is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1092%7Cjs:only-ours` | J-87 js-text-write js-text-write in ImageSlot._render on this._cap is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1133%7Cjs:only-ours` | J-88 js-style-write js-style-write in ImageSlot._render on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1134%7Cjs:only-ours` | J-89 js-style-write js-style-write in ImageSlot._render on this._empty is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1148%7Cjs:only-ours` | J-90 js-style-write js-style-write in ImageSlot._render on this._img is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1153%7Cjs:only-ours` | J-91 js-style-write js-style-write in ImageSlot._render on this._empty is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1160%7Cjs:only-ours` | J-92 js-text-write js-text-write in ImageSlot._render on this._credit is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1180%7Cjs:only-ours` | J-93 js-text-write js-text-write in mkLink on a is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C1198%7Cjs:only-ours` | J-94 js-text-write js-text-write in ImageSlot._render on this._credit is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C335%7Ccss:only-ours` | TR-126 css-transition Code-built transition in top-level is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C350%7Ccss:only-ours` | TR-127 css-transition Code-built transition in top-level is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C379%7Ccss:only-ours` | K-02 css-animation CSS animation om-slot-spin on code-built animation string is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C813%7Cjs:only-ours` | J-63 js-style-write js-style-write in ImageSlot._exitReframe on this._ctl is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C813%7Cjs:only-ours~2` | J-64 js-style-write js-style-write in ImageSlot._exitReframe on this._ctl is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C916%7Cjs:only-ours` | J-65 js-text-write js-text-write in ImageSlot._setError on d is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C998%7Cjs:only-ours` | J-66 js-style-write js-style-write in ImageSlot._applyView on this._ctl is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:image-slot.js%7C999%7Cjs:only-ours` | J-67 js-style-write js-style-write in ImageSlot._applyView on this._ctl is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:indus-logo.js%7C11%7Cjs:only-ours` | J-95 js-style-write js-style-write in IndusLogo.connectedCallback on this is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:indus-logo.js%7C40%7Cjs:only-ours` | J-96 js-style-write js-style-write in IndusLogo.load on svg is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:indus-logo.js%7C43%7Cjs:only-ours` | J-97 js-style-write js-style-write in IndusLogo.load on g is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:indus-logo.js%7C43%7Cjs:only-ours~2` | J-98 js-style-write js-style-write in IndusLogo.load on g is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:indus-logo.js%7C44%7Cwaapi:trigger.type` | L-01 (theirs L-01) trigger.type: ours load, theirs loop | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:duration_ms` | J-99 (theirs L-10) duration_ms: ours 0, theirs 900 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:easing` | J-99 (theirs L-10) easing: ours null, theirs linear | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:only-ours` | J-100 waapi-control waapi-control in IndusLogo.play on this._spin is not in Claude Design's animations.json | ours | only the re-derived inventory has this effect |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:playback-rate.to` | J-99 (theirs L-10) playback-rate.to: ours 14, theirs null | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:playbackRate (of L-01).from` | J-99 (theirs L-10) playbackRate (of L-01).from: ours null, theirs 1 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:playbackRate (of L-01).to` | J-99 (theirs L-10) playbackRate (of L-01).to: ours null, theirs 14 | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:properties` | J-99 (theirs L-10) properties: ours playback-rate, theirs playbackRate (of L-01) | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C52%7Cjs:trigger.type` | J-99 (theirs L-10) trigger.type: ours load, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C53%7Cwaapi:trigger.type` | L-02 (theirs L-07) trigger.type: ours load, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C54%7Cwaapi:trigger.type` | L-03 (theirs L-08) trigger.type: ours load, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C55%7Cwaapi:trigger.type` | L-04 (theirs L-09) trigger.type: ours load, theirs hover | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C58%7Cwaapi:trigger.type` | L-05 (theirs L-02) trigger.type: ours load, theirs scroll-into-view | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C59%7Cwaapi:trigger.type` | L-06 (theirs L-03) trigger.type: ours load, theirs scroll-into-view | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C60%7Cwaapi:trigger.type` | L-07 (theirs L-04) trigger.type: ours load, theirs scroll-into-view | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C61%7Cwaapi:trigger.type` | L-08 (theirs L-05) trigger.type: ours load, theirs scroll-into-view | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:indus-logo.js%7C62%7Cwaapi:trigger.type` | L-09 (theirs L-06) trigger.type: ours load, theirs scroll-into-view | ours | the re-derived record and Claude Design's disagree on this field |  |
| `inventory:anim:theirs:Indus Foods Website v2.dc.html%7C1389%7Cwaapi:only-theirs` | Claude Design's A-19 waapi Magnetic button press ripple has no re-derived record | ours | only Claude Design's inventory has this effect |  |
| `inventory:count:css_animations` | count css_animations: ours 9, theirs 0 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:count:js_style_writers` | count js_style_writers: ours 101, theirs 24 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:surface-count:routes` | surface count routes: ours 23, theirs 29 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:surface-count:toggling_sc_ifs` | surface count toggling_sc_ifs: ours 24, theirs 21 | ours | a recount replaces any count carried from an older inventory |  |
| `inventory:surface:route%7Cabout:states` | S-05 (theirs S-17) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states |  |
| `inventory:surface:route%7Chome:states` | S-04 (theirs S-16) states: ours 1, theirs 7 | ours | the re-derived surface and Claude Design's list a different number of states |  |
| `inventory:surface:route%7Cour-story:states` | S-06 (theirs S-18) states: ours 1, theirs 3 | ours | the re-derived surface and Claude Design's list a different number of states |  |
| `inventory:surface:route:post-post-1:only-theirs` | route post-post-1 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:route:post-post-2:only-theirs` | route post-post-2 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:route:post-post-3:only-theirs` | route post-post-3 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:route:post-post-4:only-theirs` | route post-post-4 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:route:post-post-5:only-theirs` | route post-post-5 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:route:post-post-6:only-theirs` | route post-post-6 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:EnquiryForm:28:only-theirs` | toggling-sc-if EnquiryForm:28 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:129:only-ours` | toggling-sc-if Indus Foods Website v2:129 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:131:only-ours` | toggling-sc-if Indus Foods Website v2:131 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:132:only-ours` | toggling-sc-if Indus Foods Website v2:132 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:136:only-ours` | toggling-sc-if Indus Foods Website v2:136 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:138:only-ours` | toggling-sc-if Indus Foods Website v2:138 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:157:only-ours` | toggling-sc-if Indus Foods Website v2:157 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:166:only-ours` | toggling-sc-if Indus Foods Website v2:166 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:478:only-ours` | toggling-sc-if Indus Foods Website v2:478 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:49:only-ours` | toggling-sc-if Indus Foods Website v2:49 is listed only in the re-derived surfaces | ours | only the re-derived inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:543:only-theirs` | toggling-sc-if Indus Foods Website v2:543 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:549:only-theirs` | toggling-sc-if Indus Foods Website v2:549 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:Indus Foods Website v2:597:only-theirs` | toggling-sc-if Indus Foods Website v2:597 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:TradeApplication:65:only-theirs` | toggling-sc-if TradeApplication:65 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |
| `inventory:surface:toggling-sc-if:TradeApplication:92:only-theirs` | toggling-sc-if TradeApplication:92 is listed only in Claude Design's surfaces.json | ours | only Claude Design's inventory lists it |  |

## Notices (notice)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `notice:host:maps.google.com` | request to maps.google.com blocked (2 URLs, first https://maps.google.com/maps?q=55-58%20Stratford%20Street%20North%2C%20Birmingham%20B11%201BU&z=14&output=embed) | noted | unlisted-host |  |
