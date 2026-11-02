# Clone vision review, 2026-11-02

Three cold Sonnet design reviewers compared each clone's live test site with its draft at 375, 768 and 1440, from paired full-page captures (`E:\sgs-tmp\vision\<client>\<surface>-<width>-{draft,live}.png`; drafts served locally through each surface's walker state step, `scripts/computed-route/.eyeball-tmp/vision-capture.mjs`). Classes: route fault (the clone built the wrong block or settings), framework gap (no SGS block or setting can do it), accepted difference (a ruling or the divergence ledger). Captures were taken after the fixes `39d3ea2c1` to `c00f466ea`; Eye Care's hidden-content item was fixed afterwards (`55e7ab092`, rebuilt and pushed, `940c743f5`).

## Mama's Munches (home, shop, product, gifts, help, contact)

1. All surfaces, every width: the page overflows sideways (home 375 renders 395px, shop 375 434px, 768 781 to 871px, home 1440 1929px in a 1425px viewport). Route fault, high.
2. All: the announcement bar is a tall yellow block with its messages printed over each other and the logo; the header stacks, the basket pill clipped, the nav wraps. Route fault, high.
3. All, 768 and 1440: the Instagram strip stacks six photos full width in pink frames (pages 2 to 3 times taller). Route fault, high.
4. All: the marquee wraps as a multi-line heading at 375, missing at 1440; the trust strip shows empty circles instead of icons. Route fault, medium.
5. All: footer links underlined, flush to the edge at 375, the WhatsApp pill empty or missing. Route fault, medium.
6. Home: hero headline on one line without the cookie pill or underline; one large photo instead of the polaroid stack; text cut off at 375. Route fault, high.
7. Home: audience cards, notes, recipe notebook and "our story" collapse into thin columns with text over hollow boxes. Route fault, high.
8. Home: Build your Zookie builds as a stepped wizard ("Step 1 of 6") where the draft shows every choice inline (Bean 2026-11-01). Route fault, high.
9. Home, shop, product, gifts: product cards empty or "This product is currently unavailable." Route fault, high (cause proven: Fill switches `sgs/product-card` `sourceMode` from `wc-product` to `sgs-cpt` to reproduce a display read).
10. Home, product: review cards render as thin slivers, one word per line. Route fault, high (lead: `sgs/testimonial` `variant` switched from a display read).
11. Home 1440: FAQ missing. Route fault, medium.
12. Shop: title right-aligned, category chips tiny with other names (Uncategorized); promo cards tall and narrow; six "unavailable" cells. Route fault, high.
13. Product: the buy box shows four empty boxes, a WooCommerce pack-size table and "Add to Cart"; no flavours, base, chips or accordions; no sticky bar at 375. Route fault, high.
14. Gifts: the finder is a small box with two labels and no chips or button; step badges squashed; the baby-shower banner a tall empty block. Route fault, high (part may be framework-limited: the finder is a filtered listing).
15. Help: no category chips; FAQ rows show only category labels; delivery and policy cards clip. Route fault, high.
16. Contact: icon discs are empty grey circles; labels overlap the form fields; quick answers show category labels. Route fault, high.
17. Home: no h1. Route fault, medium.
18. Cart, checkout, account: WooCommerce's own forms. Accepted difference.

## Eye Care (home, shop, product, help, lenses, about, contact)

1. All surfaces, every width: hero text, product grids, headings, reviews and FAQ answers stayed at opacity 0. Route fault, high. Fixed: the draft's script-driven scroll reveal was read at its start pose (`55e7ab092`); 70 rules gone, rebuilt and pushed.
2. All: header 475 to 490px tall; trust bar icons with no text; a stray logo glyph over "LENSES"; phone, account and bag in a separate row below; the logo wraps at 375. Route fault, high.
3. Home 375: page 634px wide (sideways scroll). Route fault, high.
4. Home hero: the draft's full-bleed dark photo with the headline over it builds as a split layout. Route fault, high.
5. Home and shop: product cards read "This product is currently unavailable." Route fault, high (same proven cause as Mama's item 9).
6. About, contact, shop headings and columns, home "Four reasons" and "Start with a shape", the product buy box and ground: layout collapses. Route fault, high.
7. Frame product page: one button opening the lens flow where the draft shows "Add my prescription from +£59" and "Add to bag as they are". Framework gap, medium (Spec 43 FR-43-25 short of the draft).

## Indus Foods (home, about, our-story, careers, contact, faqs, brands, food-service, sanam; apply and 768 not read)

1. Every page: the yellow draft hero builds as a dark teal slab with dark text on it, a white gap above; on home 1440 the photo drops below the text. Route fault, high (lead: the hero section paints a 135° teal gradient no route-written rule supplies, a block default the draft never states, group j).
2. About: the "Explore Indus Foods" cards are about 3x too tall (page 19,402px against the draft's 6,523px at 375); the "Six decades" slider shows five narrow photo-only cards. Route fault, high.
3. Home 1440: services and "Why Choose" cards collapse into thin overlapping stripes. Route fault, high.
4. Footer, every page: logo enlarged to the column width; contact cards one word per line; hours repeated about four times as per-day tables; quick links one underlined column; the Apply button shows only an arrow; "Back to top" stacked. Route fault, high.
5. Our Story and Careers dot-marker lists squeezed into a narrow column (cause proven: the list root is paired with its first item's element and takes its flex-row box styles). Route fault, high.
6. Home: "Request Our Catalogue" draws a doubled outline; the pair sits in a row where the draft stacks it; outline boxes around the header Register and trade-account buttons. Route fault, medium.
7. Header email pill icon only; nav on a hard yellow strip; the menu button on a square tile; photo credits missing; FAQs and Contact breadcrumbs wrong. Route fault, low to medium.
8. Blank bands where the draft has content (stats, FAQs, contact cards and map, brand tiles): unconfirmed, possibly scroll entrances not yet revealed in the capture.
