# Mama's Munches redesign → SGS framework

Source: `ibraheem-mustafa-dev/small-giants-wp@main`. The site already runs on `sgs-theme` + `sgs-blocks` with WooCommerce, Stripe and PayPal, so this is a restyle-and-extend job, not a rebuild.

Legend: **Restyle** = block exists, needs new tokens/attrs only · **Extend** = block exists, needs a new variant or attribute · **New** = no block covers it

## 1. Tokens (sites/mamas-munches/theme-snapshot.json)

| Token | Current | New |
|---|---|---|
| primary | #E68A95 | #EE8088 (logo pink) |
| surface-pink | #F5C2C8 | #F5C2C8 (unchanged, hero/footer) |
| surface-pink-soft | – | #F9D5D3 (new: cards, builder panel) |
| surface / cream | #FBF3DC | #FBF3DC (unchanged) |
| surface-alt | #FFF9F0 | #FFFAF0 |
| accent | #F5D050 | #F9CF6E (logo yellow, primary CTA fill) |
| accent-soft | – | #FCEBBE (new) |
| text | #3A2E26 | #3A2A22 (also the outline + hard-shadow colour) |
| Fonts | Fraunces + Inter | Young Serif (display) + Karla (body) + Caveat (handwritten accents) |

New shared style primitives: 2px cocoa outline, hard offset shadow (3/4/8px), lift-on-hover, press-on-active. These are best added as a snapshot-level shadow/border preset plus one `styles.css` rule set, not per block.

**Budget flag:** the theme caps at two font files per site. Caveat is a third family. Options: self-host a subset (one weight, Latin only), or drop Caveat and use Young Serif italic for the handwritten notes.

## 2. Global parts

| Design element | SGS block | Status | Notes |
|---|---|---|---|
| Yellow announcement strip | sgs/notice-banner | Restyle | |
| Header (logo, nav, basket pill) | sgs/site-header + nav-bar-menu | Restyle | Pill hover + hard shadow |
| Nav drawer with "For me / For her" tiles | sgs/nav-drawer-menu | Extend | Drawer patterns exist; needs an image-tile row pattern |
| Slide-out basket (free-delivery bar, gift toggle, upsell) | sgs/cart | Extend | Check whether cart already has drawer mode; progress bar + gift note likely new attrs |
| Footer (Instagram grid, tagline marquee, CTA, link columns, credit) | sgs/site-footer + rows, social-icons | Extend | Instagram grid needs a feed source (plugin or new block); marquee reuses trust-bar autoScroll mechanism |

## 3. Homepage

| Section | SGS block | Status | Notes |
|---|---|---|---|
| Hero with polaroid stack, sticker, time-of-day greeting | sgs/hero | Extend | Polaroid stack = decorative-image ×3 or new hero variant; greeting needs a small view script |
| Trust bar (4 items, marquee on mobile/tablet, pause on hover) | sgs/trust-bar | Restyle | Already supports `autoScroll`, `autoScrollBelow: 1024`, `autoScrollPauseOnHover` |
| "For me / For her" split cards | sgs/card-grid | Restyle | |
| Build your Zookie + live cookie preview | sgs/option-picker + buybox | **New** | See §5 |
| Gifts by moment carousel + dots/arrows | sgs/card-grid or post-grid (draggable fx) | Extend | Drag-to-scroll exists (Spec 38); needs dots/arrows on mobile |
| Recipe-card ingredients | sgs/info-box or feature-grid | Restyle | Lined-paper background as a variant |
| Story polaroid | sgs/media + text | Restyle | |
| Review slider | sgs/testimonial-slider or trustpilot-reviews | Restyle | Slider has autoplay, dots, arrows, `dragToScroll`; trustpilot-reviews syncs the real reviews |
| FAQ | sgs/accordion | Restyle | |

## 4. Shop, gifts, help, contact

| Page | SGS pieces | Status | Notes |
|---|---|---|---|
| Shop (filter pills, sort, cards, banners) | archive-product template, sgs-archive-toolbar, sgs/product-card, filter-search | Restyle | |
| Gifts finder (moment + budget → live results) | sgs/choice-flow | Extend | Choice-flow exists; needs results to be a filtered product collection |
| Gift note live preview | – | **New** | Small interactive block |
| Help (search + category chips + accordion) | sgs/accordion + filter-search | Extend | Filter-search against accordion items |
| Contact (channel cards, topic-aware form) | sgs/form + form-field-tiles, whatsapp-cta | Restyle | Conditional fields per topic may need a form rule |

## 5. Product page

| Design element | SGS piece | Status | Notes |
|---|---|---|---|
| Gallery + thumbnails | sgs/buybox gallery column | Restyle | |
| Pack size cards with tag + per-cookie price | buybox value ladder / option-picker | Restyle | |
| Base, chips pills | option-picker | Restyle | Maps to existing Dietary + Topping attributes |
| **Up to 3 flavours, split evenly** | – | **New** | WooCommerce variations can't express multi-select. Recommend a product add-on field (stored as order-item meta), not 11×3 variations |
| Subscribe & save / one-off toggle + frequency | – | **New (plugin)** | Needs WooCommerce Subscriptions or similar; buybox needs a purchase-type row |
| Send as gift + note | – | **New** | Order-item meta + packing-slip rule to hide prices |
| Assurance row | sgs/icon-list (already in sgs-pdp-buybox.html) | Restyle | Replace the placeholder copy flagged in that file |
| Fold-outs (allergens, delivery, storage) | sgs-pdp-content.html tabs → accordion | Restyle | |
| Sticky mobile add-to-basket bar | – | **New** | |
| Gift card amounts | – | **New (plugin)** | PW Gift Cards or similar |

## 6. Basket, checkout, confirmation

| Page | SGS pieces | Status | Notes |
|---|---|---|---|
| Basket | cart template + sgs-cart-content part | Restyle | Free-delivery bar, gift toggle, Taster Trio upsell = small additions |
| Checkout (express pay, "who's it for", delivery methods, allergen note) | checkout template + sgs-checkout-content part | Extend | "It's a gift" fork = conditional shipping-to-recipient fields; express pay comes from Stripe/PayPal |
| Confirmation (timeline, gift note echo) | order-confirmation part | Restyle | |

## 7. WooCommerce/admin setup (outside the theme)

- Replace the 48-SKU fixture: pack size × base × chips as variations; flavours as the add-on field
- Prices: 8 £9.50 · 20 £21.50 · 40 £38 · Taster Trio £5 · Gift Box £15 · 40-Day Bundle £42
- Subscriptions plugin (2/4-week, 10% off, free delivery on 20/40 packs)
- Gift cards plugin (£15/£25/£40)
- Royal Mail shipping rates + free-over-£35 rule
- Trustpilot sync URL in Settings › SGS Trustpilot Sync
- Instagram feed source
- Turn off WooCommerce Coming Soon before go-live

## 8. Suggested build order

1. Tokens, fonts, outline/shadow primitives (touches everything, lowest risk)
2. Header, footer, trust bar, product card (shared parts)
3. Homepage sections using existing blocks
4. PDP: flavour add-on field + subscribe row + gift note (the three genuinely new commerce features)
5. Basket/checkout gift flow
6. Gifts finder, help search, contact
