# Mama's Munches entrance survey (read-only)

Method: draft served on 5187 (one page at a time), `Element.prototype.animate` instrumented before load, page scrolled in 300px steps at 1440 and 375 (draft-probe.mjs, draft-probe.json). Site on localhost:8084: block content read with read-only WP-CLI (page-*.html, tpl-194.html shop, tpl-202.html product), live DOM probed for `[data-sgs-me]` (live2.mjs), draft element mapped to site block by text and length (map.mjs, map.json).

## Counts (draft entrances = `[data-reveal]` elements that fired a reveal at 1440)
| Page | Draft | Site | Missing |
|---|---|---|---|
| Home (154) | 30 | 18 | 12 |
| Shop (template 194) | 7 | 0 | 7 |
| Gifts (150) | 15 | 0 | 15 |
| Product (template 202) | 6 | 0 | 6 |
| Contact (148) | 10 | 0 | 10 |
| Help (152) | 0 | 0 | 0 |
| Sign in (628) | 0 | 0 | 0 |
| My account (103) | 0 | 0 | 0 |
| Total | 68 | 18 | 50 |

At 375 the draft fires 28 of Home's 30 and 5 of Product's 6 (the rest are not shown or not reached at that width; not investigated).

## Draft mechanism (read in source: `motion()` in each .dc.html; measured with the instrument)
One mechanism: `[data-reveal]` + IntersectionObserver, `element.animate([{opacity:0, translate:'0 Npx'},{opacity:1, translate:'0 0'}], {duration, delay, easing:'cubic-bezier(.2,.7,.2,1)', fill:'backwards'})`, observed once (unobserve after first fire). No load-time animation other than these (elements already in view at load fire immediately, about 340-390ms after navigation start). Reduced motion: `motion()` returns before observing, so nothing animates.
- Home: threshold 0.12, translate 32px, 800ms, delay = 90ms x min(index among the data-reveal siblings of the same parent, 4).
- Shop, Gifts, Product, Contact: threshold 0.1, translate 28px, 750ms, no delay or stagger (measured delay 0 everywhere).
- Help, Sign in, Account: no `data-reveal`, no animate calls (measured 0).
- Not entrances, Home only: `[data-twinkle]` (hero star, scale 1 > 1.35 > 1 with rotate 0 > 90 > 180deg, 2400ms infinite ease-in-out) and `[data-float]` (the "Baked to order" sticker, translate 0 > -10px > 0, 3200ms infinite). The site measured only the trust-bar marquee animations on Home, so these two loops are missing on the site (not checked whether the framework could do them).

## Site mechanism
`sgsMotion.elements.root.entrance.base = {trigger:"scroll", values:{from:{opacity,translateX,translateY}, to:{...}, duration, delay, easing}}`; rendered as `data-sgs-me="scroll translate opacity"` on the element (sgs-me-translate / sgs-me-opacity animations). Measured theme tokens at 1440: distance.xl 32px, duration.extra-slow 800ms, entrance.easing cubic-bezier(0.2,0.7,0.2,1), entrance.distance 28px, entrance.duration 750ms. Reduced motion respected (measured: opacity 1, no animation with reducedMotion=reduce).

## Recipes (all tokens are in motion.schema.json tokenReference enum)
Recipe H (Home): trigger scroll; from {opacity 0, translateX 0, translateY "token:distance.xl"}; to {opacity 1, translateX 0, translateY 0}; duration "token:duration.extra-slow"; easing "token:entrance.easing"; delay = 90 x min(sibling index, 4) (omit when 0). This is exactly what Home's 18 existing entrances already use. Recipe P (Shop, Gifts, Product, Contact): same, but translateY "token:entrance.distance", duration "token:entrance.duration", no delay. Written at `sgsMotion.elements.root.entrance.base` (or the named part, e.g. `split-media` for the Contact hero image).

## Defect on an existing entrance
Home "our story" text (cr-ref-home-144) carries `devices.mobile.delay: 6660`: measured animation-delay 6.66s at 375, so it stays invisible for 6.7s on mobile (live2.json). Draft delay is 0. Fix: remove that `devices.mobile` override.

## Per page, missing entrances (site block = sgs/<type> + class; "root" unless stated)
### Home (recipe H; delay in ms)
| # | Draft element | Site block | Delay |
|---|---|---|---|
| 0 | eyebrow "up for a night feed?" | sgs/container cr-ref-home-2 | 0 |
| 1 | H1 "Made for the mum..." | sgs/heading cr-ref-home-4 | 90 |
| 5 | hero sticker card "fresh batch!" | sgs/decorative-image cr-ref-home-hero-card1 (root may already carry a transform/rotation; check) | 0 |
| 9 | builder section "your cookie, your way" (840px tall, only child of the section) | sgs/container cr-ref-home-41 | 0 |
| 11-14 | four occasion tiles (Just had a baby, First 40 days, Baby shower, Thinking of you) | sgs/container cr-ref-home-50, -60, -70, -80 | 0, 90, 180, 270 |
| 15 | gift quote card "Congratulations, mama!" | sgs/container cr-ref-home-100 | 0 |
| 17 | recipe card "Zainab's Zookie recipe" | sgs/container cr-ref-home-109 | 0 |
| 21 | story image column "where it all started" | sgs/container cr-ref-home-140 | 0 |
| 29 | FAQ list (4 items) | sgs/accordion cr-ref-home-232 (root) | 90 |

Present (18): hero P home-6 (180), buttons home-7 (270), trust home-10 (360), H2 home-22, tiles home-24 and home-32 (90), gifts header home-44, home-103 (90), home-134/135/136 (0/90/180), home-144 to 148 (0/90/180/270/360; 144 has the mobile defect), home-152, home-227.

### Shop (recipe P, no delay)
| Draft element | Site block |
|---|---|
| eyebrow "fresh from Zainab's kitchen" | sgs/text cr-ref-shop-35 |
| H1 "The shop" | sgs/heading cr-ref-shop-36 |
| lead P | sgs/text cr-ref-shop-37 |
| "Sort" label | woocommerce/catalog-sorting cr-ref-shop-6 (CANNOT: not an SGS block) |
| "your cookie, your way" card | sgs/container cr-ref-shop-14 |
| "never run out" card | sgs/container cr-ref-shop-20 |
| "buying for someone?" card | sgs/container cr-ref-shop-28 |

Product cards in the grid have no entrance in the draft.

### Gifts (recipe P, no delay)
| Draft element | Site block |
|---|---|
| eyebrow | sgs/text cr-ref-gifts-3 |
| H1 | sgs/heading cr-ref-gifts-4 |
| lead P | sgs/text cr-ref-gifts-5 |
| "What's the moment?" finder panel | sgs/container cr-ref-gifts-finder |
| "wrapped with love" sticker card | sgs/container cr-ref-gifts-11 |
| "easy as that" eyebrow | sgs/text cr-ref-gifts-69 |
| H2 "How gifting works" | sgs/heading cr-ref-gifts-70 |
| three step cards | sgs/container cr-ref-gifts-72, -76, -80 |
| "go on, have a go" eyebrow | sgs/text cr-ref-gifts-86 |
| H2 "Write her a note" | sgs/heading cr-ref-gifts-87 |
| P "See how it'll look" | sgs/text cr-ref-gifts-88 |
| letter card "Dear Aisha" | sgs/container cr-ref-gifts-92 |
| "baby shower coming up?" banner | sgs/container cr-ref-gifts-97 |

### Product (template 202, recipe P, no delay)
| Draft element | Site block |
|---|---|
| "real mums, real words" | sgs/text cr-ref-product-51 |
| H2 "What people are saying" | sgs/heading cr-ref-product-52 |
| three review cards | sgs/testimonial (the three inside sgs/testimonial-slider cr-ref-product-53; each has a root motion element) |
| H2 "You might also like" | sgs/heading cr-ref-product-73 |

The Zookies buy box, gallery and hero have no entrance in the draft.

### Contact (recipe P, no delay)
| Draft element | Site block |
|---|---|
| eyebrow "pop the kettle on" | sgs/text cr-ref-contact-2 |
| H1 | sgs/heading cr-ref-contact-3 |
| lead P | sgs/text cr-ref-contact-4 |
| hero logo image | sgs/hero cr-ref-contact-1, element `split-media` (existing hover on it) |
| WhatsApp, Instagram, Email cards | sgs/container cr-ref-contact-7, -11, -15 |
| "Send a message" form card | sgs/container cr-ref-contact-20 (card around sgs/form cr-ref-contact-21) |
| "quick answers" eyebrow | sgs/text cr-ref-contact-23 |
| "Handmade in Birmingham" P | sgs/text cr-ref-contact-25 |

Note: the draft Contact reveal starts 80ms after mount (others after mm:ready); on a static site this is just "on load / in view".

### Help, Sign in, My account
Draft has no entrances; site has none. Nothing to add.

## Cannot be done with settings
1. Shop "Sort" label: `woocommerce/catalog-sorting` (cr-ref-shop-6). motion_targets in sgs-framework.db has no `core/*` or `woocommerce/*` rows (query: `select distinct block_slug from motion_targets where block_slug like 'core/%' or block_slug like 'woocommerce/%'` returns nothing), and `register_block_type_args` adds `sgsMotion` only to blocks whose block.json has `supports.sgs.motion`. Workaround is structural (wrap it in an sgs/container with the entrance), a markup change, not a setting.
2. `sgs/accordion-item` has no motion targets (the draft does not animate items individually; the list container is covered by sgs/accordion root, so no gap).
3. Home twinkle and float loops: not entrances; not checked whether effects can express them.
