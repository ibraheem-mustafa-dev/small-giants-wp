# Unsupported CSS features: every occurrence in the client drafts (2026-10-31)

Each table is one CSS feature the intake listed as "seen but unsupported" (or partly supported), with every place a draft declares it. Read through the route's own readers (`scripts/computed-route/tools/unsupported-css-instances.mjs`): the census's draft sources and usage read, the fact record, the skeleton inventories and the proposed skeletons. "Lands on" is the block of the element in the proposed skeleton (or the block that absorbs it), with the surfaces it appears on; "not in any proposed skeleton" means no surface inventory rendered that element (a state no skeleton opens, an element of an SVG asset's own drawing), and "no rendered element found" means the selector or traced value matched no rendered element. A stylesheet rule lists the elements it matches (the first six). Since 2026-10-31 Fill applies any declaration no block setting holds through that block's Custom CSS (`lib/fill-custom-css.mjs`) and keeps it as a gap row for a future setting.

| Feature | eye-care-ward-end | indus-foods | mamas-munches-redesign | Total |
|---|---|---|---|---|
| brightness() filter (`css-function:brightness`) | 13 | 0 | 0 | 13 |
| saturate() filter (`css-function:saturate`) | 15 | 0 | 0 | 15 |
| sepia() filter (`css-function:sepia`) | 5 | 0 | 0 | 5 |
| hue-rotate() filter (`css-function:hue-rotate`) | 3 | 0 | 0 | 3 |
| polygon() shape (`css-function:polygon`) | 0 | 0 | 2 | 2 |
| ch unit (`css-unit:ch`) | 19 | 0 | 0 | 19 |
| mm unit (`css-unit:mm`) | 1 | 0 | 0 | 1 |
| overflow properties (`css-group:overflow`) | 63 | 69 | 73 | 205 |
| image properties (object-position and the rest) (`css-group:images`) | 9 | 1 | 12 | 22 |
| list and counter properties (`css-group:lists-and-counters`) | 5 | 0 | 0 | 5 |
| logical properties (`css-group:logical-properties-and-values`) | 22 | 11 | 2 | 35 |
| scroll snap (`css-group:scroll-snap`) | 3 | 3 | 22 | 28 |
| masking and clipping (`css-group:masking`) | 0 | 19 | 2 | 21 |
| compositing and blending (`css-group:compositing-and-blending`) | 0 | 2 | 1 | 3 |
| transforms (`css-group:transforms`) | 46 | 123 | 228 | 397 |
| user interface properties (`css-group:basic-user-interface`) | 35 | 77 | 165 | 277 |
| writing modes (`css-group:writing-modes`) | 21 | 6 | 22 | 49 |
| ::selection (`css-pseudo-element:selection`) | 1 | 1 | 0 | 2 |
| ::placeholder (`css-pseudo-element:placeholder`) | 0 | 0 | 2 | 2 |

## brightness() filter (`css-function:brightness`): 13

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:28), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | saturate(.35) brightness(.85) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:98), styling Eye Care Birmingham:344 <div>; Eye Care Birmingham:1293 <div>; Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 | sepia(.42) saturate(1.5) brightness(1.08) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:148), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.4) saturate(1.4) brightness(.95) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:195), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | grayscale(.55) brightness(.95) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:235), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | brightness(1.14) saturate(.7) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:326), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | grayscale(.7) brightness(1.1) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:405), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | brightness(1.16) saturate(.55) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:445), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.45) saturate(1.2) brightness(.9) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2831:65), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | brightness(1.05) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2897:171), styling Eye Care Birmingham:1376 <span> | saturate(.8) brightness(.82) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2898:168), styling Eye Care Birmingham:1376 <span> | saturate(1.25) contrast(1.2) brightness(.78) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2899:167), styling Eye Care Birmingham:1376 <span> | brightness(1.05) saturate(.9) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2900:117), styling Eye Care Birmingham:1376 <span> | brightness(1.12) saturate(.95) | not in any proposed skeleton |

## saturate() filter (`css-function:saturate`): 15

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:28), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | saturate(.35) brightness(.85) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:65), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.34) saturate(1.3) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:98), styling Eye Care Birmingham:344 <div>; Eye Care Birmingham:1293 <div>; Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 | sepia(.42) saturate(1.5) brightness(1.08) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:148), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.4) saturate(1.4) brightness(.95) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:235), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | brightness(1.14) saturate(.7) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:273), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.2) hue-rotate(-12deg) saturate(1.3) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:364), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | hue-rotate(190deg) saturate(1.1) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:405), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | brightness(1.16) saturate(.55) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:445), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.45) saturate(1.2) brightness(.9) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:492), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | hue-rotate(-25deg) saturate(1.5) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2831:49), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1376 <span> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | saturate(.88) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2897:171), styling Eye Care Birmingham:1376 <span> | saturate(.8) brightness(.82) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2898:168), styling Eye Care Birmingham:1376 <span> | saturate(1.25) contrast(1.2) brightness(.78) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2899:167), styling Eye Care Birmingham:1376 <span> | brightness(1.05) saturate(.9) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2900:117), styling Eye Care Birmingham:1376 <span> | brightness(1.12) saturate(.95) | not in any proposed skeleton |

## sepia() filter (`css-function:sepia`): 5

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:65), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.34) saturate(1.3) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:98), styling Eye Care Birmingham:344 <div>; Eye Care Birmingham:1293 <div>; Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 | sepia(.42) saturate(1.5) brightness(1.08) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:148), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.4) saturate(1.4) brightness(.95) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:273), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.2) hue-rotate(-12deg) saturate(1.3) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:445), styling Eye Care Birmingham:344 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:356 <div> (its bound style takes this kind of value; this one is not shown at rest); Eye Care Birmingham:1293 <div> (its bound style takes this kind of value; this one is not shown at rest); Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 (its bound style takes this kind of value; this one is not shown at rest) | sepia(.45) saturate(1.2) brightness(.9) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |

## hue-rotate() filter (`css-function:hue-rotate`): 3

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:273), styling no rendered element found | sepia(.2) hue-rotate(-12deg) saturate(1.3) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:364), styling no rendered element found | hue-rotate(190deg) saturate(1.1) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2714:492), styling no rendered element found | hue-rotate(-25deg) saturate(1.5) | not in any proposed skeleton |

## polygon() shape (`css-function:polygon`): 2

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| mamas-munches-redesign | Home.dc.html | Home:41 <div> "baked with love" | clip-path: polygon(0 0,100%0,88% 50%,100% 100%,0 100%) | sgs/label (page-home-dc-html) |
| mamas-munches-redesign | Product.dc.html | Product:20 <div> "baked with love" | clip-path: polygon(0 0,100%0,88% 50%,100% 100%,0 100%) | sgs/label (page-product-dc-html-id-zookies) |

## ch unit (`css-unit:ch`): 19

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:119 <h1> "The same designer shades. A good deal l…" | max-width: 15ch | sgs/heading (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:120 <p> "I'm an optician in Birmingham, buying f…" | max-width: 47ch | sgs/text (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:143 <h2> "Four reasons, and not one of them is a …" | max-width: 20ch | sgs/heading (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:144 <p> "I'm an optician who genuinely enjoys th…" | max-width: 47ch | sgs/text (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:235 <span> "The reception or the consulting room — …" | max-width: 26ch | removed by the skeleton (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:238 <h2> "I'm Fatima Nawaz, and I run the clinic …" | max-width: 22ch | sgs/heading (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:552 <h1> "Three questions, then leave the rest to…" | max-width: 18ch | sgs/heading (page-lenses) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:553 <p> "Any frame on this site can be glazed to…" | max-width: 62ch | sgs/text (page-lenses) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:651 <p> "{{ q.a }}" | max-width: 72ch | sgs/accordion (absorbed into it) (page-help) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:859 <p> "You don't need an account to order; che…" | max-width: 60ch | sgs/text (page-signin); sgs/account (absorbed into it) (sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:950 <p> "When you order, it shows here with its …" | max-width: 46ch | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1005 <p> "Lens care sent on a schedule. Skip, pau…" | max-width: 60ch | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1054 <p> "Regular deliveries of lens care show he…" | max-width: 46ch | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1093 <p> "Tap the heart on any frame and it waits…" | max-width: 46ch | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1126 <p> "Designer eyewear from an independent op…" | max-width: 32ch | sgs/text (footer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1322 <p> "Your prescription tells you which. If t…" | max-width: 56ch | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1345 <p> "Thinner lenses are lighter and sit neat…" | max-width: 58ch | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1369 <p> "All of them block 100% of UV and come s…" | max-width: 56ch | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1389 <p> "It needs to be under two years old and …" | max-width: 58ch | not in any proposed skeleton |

## mm unit (`css-unit:mm`): 1

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2680:16), styling no rendered element found | measures 0mm across each lens0 | not in any proposed skeleton |

## overflow properties (`css-group:overflow`): 205

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:7 <div> .sgs-trust-ticker | overflow: hidden | sgs/site-header-row (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:51 <div> .sgs-mega-menu | overflow: auto | sgs/mega-panel (mega-menu-sunglasses); no block (outside the skeleton root) (mega-menu-brands, mega-menu-lenses, mega-menu-help) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:65 <a> | overflow: hidden | sgs/mega-aside (mega-menu-sunglasses) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:112 <section> .sgs-hero | overflow: hidden | sgs/hero (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:124 <section> "Shop by brand" .sgs-brand-marquee | overflow: hidden | sgs/container (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:159 <button> .scp9 | overflow: hidden | sgs/container (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:183 <span> "★★★★★" | overflow: hidden | sgs/google-reviews (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:189 <div> .rev-rail | overflow-x: auto | sgs/google-reviews (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:195 <span> "{{ r.who }}" | overflow: hidden | sgs/google-reviews (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:195 <span> "{{ r.who }}" | text-overflow: ellipsis | sgs/google-reviews (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:202 <blockquote> "{{ r.text }}" | overflow: hidden | sgs/google-reviews (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:216 <div> | overflow: hidden | sgs/container (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:269 <aside> | overflow: {{ railOverflow }} | sgs/container (page-shop); woocommerce/product-filters (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:274 <div> | overflow: {{ railOverflow }} | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:300 <input> "Maximum price" | overflow-clip-margin:  | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:306 <div> | overflow: auto | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:310 <input> | overflow-clip-margin:  | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:342 <div> | overflow: hidden | sgs/container (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:354 <button> "Front" | overflow: hidden | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:379 <button> "Gold" .scpl | overflow: hidden | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:381 <span> "{{ c.name }}" | overflow: hidden | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:381 <span> "{{ c.name }}" | text-overflow: ellipsis | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:513 <span> | overflow: hidden | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:685 <input> "Email" | overflow-clip-margin:  | removed by the skeleton (page-contact); sgs/form-field-email (contact-form) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:700 <a> | overflow: hidden | sgs/hero (absorbed into it) (page-contact) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:754 <input> "Email" | overflow-clip-margin:  | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:759 <input> | overflow-clip-margin:  | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:763 <input> "Choose a password (8 characters or more)" | overflow-clip-margin:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:801 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:822 <div> | overflow: hidden | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:866 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:868 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:871 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:879 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:881 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:891 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:910 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:912 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:924 <nav> "Account" | overflow-x: auto | sgs/account (absorbed into it) (page-account) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:970 <div> | overflow: hidden | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1105 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1107 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1112 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1114 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1116 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1162 <div> .sgs-mobile-menu | overflow: auto | sgs/nav-drawer (mobile-menu) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1200 <div> | overflow: auto | sgs/cart (absorbed into it) (bag-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1207 <div> | overflow: hidden | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1227 <div> | overflow: hidden | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1234 <div> "Size guide" | overflow: auto | no block (outside the skeleton root) (size-guide) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1284 <span> "{{ lensStepLabel }}" | overflow: hidden | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1284 <span> "{{ lensStepLabel }}" | text-overflow: ellipsis | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1289 <div> | overflow: auto | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1291 <div> | overflow: hidden | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1327 <span> | overflow: hidden | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1350 <span> | overflow: hidden | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1374 <span> | overflow: hidden | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1407 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2624:55), styling no rendered element found | overflow:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2661:4), styling no rendered element found | overflow:  | not in any proposed skeleton |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:1 <a> | overflow: hidden | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:7 <span> "{{ p.brand }}" | overflow: hidden | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:7 <span> "{{ p.brand }}" | text-overflow: ellipsis | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| indus-foods | Indus Foods Website v2.dc.html | a stylesheet rule (Indus Foods Website v2:6), styling Indus Foods Website v2:38 <div>; Indus Foods Website v2:39 <header>; Indus Foods Website v2:40 <div>; Indus Foods Website v2:41 <div>; Indus Foods Website v2:42 <a> "Indus Foods home"; Indus Foods Website v2:43 <indus-logo> "Indus Foods Ltd"; and 640 more | `*,*::before,*::after` scroll-behavior: auto | removed by the skeleton (scroll-progress-bar); sgs/site-header (sticky-header); sgs/site-header-row (sticky-header); sgs/site-header-row (absorbed into it) (sticky-header); sgs/responsive-logo (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:8 <div> | overflow-x: clip | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:65 <div> | overflow: hidden | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:77 <div> | overflow: hidden | sgs/container (about-mega-menu); no block (outside the skeleton root) (trade-mega-menu) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:88 <div> | overflow: hidden | sgs/container (absorbed into it) (sectors-mega-menu) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:100 <a> .scp7 | overflow: hidden | sgs/gallery (absorbed into it) (brands-mega-menu) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:108 <div> "Site menu" | overflow: hidden | sgs/nav-drawer (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:121 <div> | overflow-y: auto | sgs/container (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:134 <div> | overflow: hidden | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:139 <a> .scpb | overflow: hidden | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:140 <div> | overflow: hidden | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:160 <a> .scpd | overflow: hidden | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:161 <div> | overflow: hidden | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:171 <a> "Sanam" .scpe | overflow: hidden | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:173 <div> | overflow: hidden | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:198 <span> "Become A Trade Customer" | overflow: hidden | sgs/button (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:198 <span> "Become A Trade Customer" | text-overflow: ellipsis | sgs/button (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:203 <section> | overflow: hidden | sgs/hero (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:216 <div> | overflow: hidden | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:218 <section> | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:221 <div> | overflow: hidden | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:224 <a> "Sanam" .scpj | overflow: hidden | sgs/brand-strip (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:226 <section> | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:231 <div> .scpk | overflow: hidden | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:233 <div> .scpl | overflow: hidden | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:238 <section> | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:248 <section> | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:265 <section> | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:278 <span> | overflow: hidden | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:288 <div> .scpr | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:290 <section> | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:307 <section> | overflow: hidden | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:316 <section> | overflow: hidden | sgs/hero (page-about); no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:341 <div> | overflow: hidden | no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:344 <section> | overflow: clip | no block (outside the skeleton root) (page-about, page-our-story, page-certifications, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:367 <a> .scpv | overflow: hidden | sgs/container (absorbed into it) (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:371 <div> | overflow: hidden | sgs/container (absorbed into it) (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:395 <div> | overflow: hidden | no block (outside the skeleton root) (page-our-story, page-community, page-sustainability, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:438 <div> | overflow: hidden | sgs/container (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:441 <div> | overflow: hidden | removed by the skeleton (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:451 <div> | overflow: hidden | sgs/timeline (absorbed into it) (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:456 <div> | overflow-x: auto | removed by the skeleton (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:458 <article> | overflow: hidden | inside an element the skeleton removes (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:481 <a> .scp10 | overflow: hidden | sgs/container (absorbed into it) (page-about); no block (outside the skeleton root) (page-certifications, page-community, page-careers, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:502 <div> | overflow: hidden | sgs/container (absorbed into it) (page-brands) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:515 <div> | overflow: hidden | sgs/container (page-about); no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:537 <div> | overflow: hidden | sgs/container (page-contact) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:560 <input> .scp18 | overflow-clip-margin:  | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/container (absorbed into it) (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:568 <input> | overflow-clip-margin:  | sgs/form (absorbed into it) (page-careers); sgs/form-field-file (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:570 <input> | overflow-clip-margin:  | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/form-field-consent (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:572 <aside> | overflow: hidden | sgs/container (page-careers); no block (outside the skeleton root) (page-catalogue) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:606 <a> .scp1b | overflow: hidden | sgs/post-grid (absorbed into it) (page-blog); no block (outside the skeleton root) (page-post-post-1, page-post-post-2, page-post-post-3, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:653 <footer> | overflow: hidden | sgs/site-footer (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:711 <div> | overflow: hidden | sgs/container (footer) |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1048:4), styling no rendered element found | overflow:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1068:102), styling no rendered element found | overflow:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1387:4), styling no rendered element found | overflow:  | not in any proposed skeleton |
| indus-foods | indus-logo.js | a value in the draft's code (./indus-logo.js:js:40:26), styling no rendered element found | overflow: visible | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | a stylesheet rule (TradeApplication:3), styling Indus Foods Website v2:38 <div>; Indus Foods Website v2:39 <header>; Indus Foods Website v2:40 <div>; Indus Foods Website v2:41 <div>; Indus Foods Website v2:42 <a> "Indus Foods home"; Indus Foods Website v2:43 <indus-logo> "Indus Foods Ltd"; and 640 more | `*,*::before,*::after` scroll-behavior: auto | removed by the skeleton (scroll-progress-bar); sgs/site-header (sticky-header); sgs/site-header-row (sticky-header); sgs/site-header-row (absorbed into it) (sticky-header); sgs/responsive-logo (sticky-header) |
| indus-foods | TradeApplication.dc.html | TradeApplication:7 <div> | overflow: clip | sgs/form (page-apply); no block (outside the skeleton root) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:14 <div> | overflow: hidden | sgs/form (absorbed into it) (page-apply); removed by the skeleton (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:21 <span> "{{ st.label }}" | overflow: hidden | sgs/form (absorbed into it) (page-apply); inside an element the skeleton removes (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:21 <span> "{{ st.label }}" | text-overflow: ellipsis | sgs/form (absorbed into it) (page-apply); inside an element the skeleton removes (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:39 <input> .scp1l | overflow-clip-margin:  | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:62 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| indus-foods | EnquiryForm.dc.html | a stylesheet rule (EnquiryForm:2), styling Indus Foods Website v2:38 <div>; Indus Foods Website v2:39 <header>; Indus Foods Website v2:40 <div>; Indus Foods Website v2:41 <div>; Indus Foods Website v2:42 <a> "Indus Foods home"; Indus Foods Website v2:43 <indus-logo> "Indus Foods Ltd"; and 640 more | `*,*::before,*::after` scroll-behavior: auto | removed by the skeleton (scroll-progress-bar); sgs/site-header (sticky-header); sgs/site-header-row (sticky-header); sgs/site-header-row (absorbed into it) (sticky-header); sgs/responsive-logo (sticky-header) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:26 <input> .scp1m | overflow-clip-margin:  | sgs/form (absorbed into it) (page-contact); sgs/container (absorbed into it) (contact-enquiry) |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | overflow: visible | not in any proposed skeleton |
| indus-foods | assets/logo-square-anim.svg | assets/logo-square-anim.svg (no rendered element found) | overflow: visible | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | a stylesheet rule (Home:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | Home:9 <section> | overflow: hidden | sgs/hero (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:15 <span> | overflow: hidden | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:42 <div> "Why Mama's Munches" | overflow: hidden | sgs/trust-bar (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:47 <a> .scp6 | overflow: hidden | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:55 <a> .scp7 | overflow: hidden | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:101 <div> | overflow: hidden | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:132 <div> | overflow-x: {{ L.ovx }} | woocommerce/product-collection (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:132 <div> | scroll-behavior: smooth | woocommerce/product-collection (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:134 <a> .scp9 | overflow: hidden | woocommerce/product-collection (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:135 <div> | overflow: hidden | woocommerce/product-collection (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:208 <section> | overflow: hidden | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:222 <div> | overflow-x: auto | sgs/trustpilot-reviews (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:222 <div> | scroll-behavior: smooth | sgs/trustpilot-reviews (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | a value in the draft's code (Home:js:288:193), styling no rendered element found | scroll-behavior:  | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | a value in the draft's code (Home:js:290:127), styling no rendered element found | scroll-behavior:  | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:6 <div> | overflow: hidden | sgs/site-header-row (absorbed into it) (site-header-announcement-strip-bar) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:56 <aside> "Menu" | overflow-y: auto | sgs/nav-drawer (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:63 <a> .scpf | overflow: hidden | sgs/container (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:68 <a> .scpf | overflow: hidden | sgs/container (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:136 <div> | overflow: hidden | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:138 <div> | overflow-y: auto | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:154 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | a value in the draft's code (SiteHeader:js:209:50), styling no rendered element found | overflow:  | not in any proposed skeleton |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:14 <div> | overflow-x: {{ ovx }} | sgs/gallery (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:16 <a> "View on Instagram" .scpn | overflow: hidden | sgs/gallery (absorbed into it) (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:18 <div> "{{ tagline }}" | overflow: hidden | sgs/trust-bar (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:19 <div> | overflow: hidden | sgs/site-footer-row (site-footer) |
| mamas-munches-redesign | Shop.dc.html | a stylesheet rule (Shop:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Shop.dc.html | Shop:21 <div> "Filter products" | overflow-x: auto | woocommerce/product-filters (page-shop-dc-html); removed by the skeleton (shop-filter-sort) |
| mamas-munches-redesign | Shop.dc.html | Shop:33 <a> .scp1 | overflow: hidden | sgs/container (page-shop-dc-html) |
| mamas-munches-redesign | Shop.dc.html | Shop:45 <a> .scp1 | overflow: hidden | sgs/container (page-shop-dc-html) |
| mamas-munches-redesign | ProductCard.dc.html | ProductCard:0 <div> .scpi | overflow: hidden | woocommerce/product-collection (absorbed into it) (page-shop-dc-html, page-product-dc-html-id-zookies, page-gifts-dc-html) |
| mamas-munches-redesign | Product.dc.html | a stylesheet rule (Product:4), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:17 <div> | overflow: hidden | sgs/hero (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:21 <div> | overflow-x: auto | sgs/multi-button (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:95 <input> | overflow-clip-margin:  | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-gift-note) |
| mamas-munches-redesign | Product.dc.html | Product:126 <div> | overflow-x: {{ L.ovx }} | sgs/testimonial-slider (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:144 <div> "{{ barSub }}" | overflow: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:144 <div> "{{ barSub }}" | text-overflow: ellipsis | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | a stylesheet rule (Basket:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:26 <div> | overflow: hidden | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:43 <input> | overflow-clip-margin:  | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:53 <input> "you@example.com" | overflow-clip-margin:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:55 <input> | overflow-clip-margin:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:59 <input> | overflow-clip-margin:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:70 <input> "At least 8 characters" | overflow-clip-margin:  | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | a stylesheet rule (Confirmation:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:9 <section> | overflow: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | a stylesheet rule (Account:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:27 <nav> "My account" | overflow-x: {{ L.navOv }} | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:188 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:190 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:192 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:203 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:205 <input> "At least 8 characters" | overflow-clip-margin:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | SignIn.dc.html | a stylesheet rule (SignIn:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:29 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:33 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:49 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:53 <input> "At least 8 characters" | overflow-clip-margin:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:57 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:65 <input> | overflow-clip-margin:  | sgs/account (absorbed into it) (forgotten-password-flow) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:81 <input> "At least 8 characters" | overflow-clip-margin:  | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:85 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | a stylesheet rule (Contact:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | Contact:9 <section> | overflow: hidden | sgs/hero (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:55 <input> | overflow-clip-margin:  | sgs/form (absorbed into it) (page-contact-dc-html); sgs/form-field-email (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:64 <input> | overflow-clip-margin:  | not in any proposed skeleton |
| mamas-munches-redesign | Gifts.dc.html | a stylesheet rule (Gifts:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Gifts.dc.html | Gifts:9 <section> | overflow: hidden | sgs/hero (page-gifts-dc-html) |
| mamas-munches-redesign | Help.dc.html | a stylesheet rule (Help:5), styling no rendered element found | `body` overflow-x: hidden | not in any proposed skeleton |
| mamas-munches-redesign | Help.dc.html | Help:19 <div> | overflow-x: auto | sgs/option-picker (page-help-dc-html) |

## image properties (object-position and the rest) (`css-group:images`): 22

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:29 <img> "Eye Care Birmingham" | object-fit: contain | sgs/responsive-logo (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:30 <img> | object-fit: contain | sgs/responsive-logo (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:114 <img> "Designer sunglasses resting on a rail a…" | object-position: {{ heroPos }} | sgs/hero (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:114 <img> "Designer sunglasses resting on a rail a…" | object-fit: cover | sgs/hero (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:217 <img> "Person wearing sunglasses outdoors" .scpd | object-fit: cover | sgs/media (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:217 <img> "Person wearing sunglasses outdoors" .scpd | object-position: center 20% | sgs/media (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1125 <img> "Eye Care Birmingham" | object-fit: contain | sgs/responsive-logo (footer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1164 <img> "Eye Care Birmingham" | object-fit: contain | sgs/responsive-logo (mobile-menu) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1283 <img> | object-fit: contain | sgs/choice-flow (absorbed into it) (lens-configurator) |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1975:25), styling no rendered element found | object-fit:  | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | Home:16 <img> | object-fit: cover | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:30 <img> "Zookies in paper cases" | object-fit: cover | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:33 <img> "A gift box of Zookies" | object-fit: cover | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:36 <img> "Mama's Munches cookies beside a mug of …" | object-fit: cover | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:48 <img> "Zookies in their bags" | object-fit: cover | sgs/media (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:56 <img> "A gift box of Zookies with a heart" | object-fit: cover | sgs/media (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:199 <img> "A tray of Zookies with a Baked With Lov…" | object-fit: cover | sgs/media (page-home-dc-html) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:64 <img> | object-fit: cover | sgs/media (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:69 <img> | object-fit: cover | sgs/media (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:141 <img> | object-fit: cover | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:163 <img> | object-fit: cover | not in any proposed skeleton |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:17 <img> | object-fit: cover | sgs/gallery (absorbed into it) (site-footer) |

## list and counter properties (`css-group:lists-and-counters`): 5

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:222 <ol> | list-style: none | sgs/container (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:422 <ul> | list-style: none | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:574 <ul> | list-style: none | sgs/container (absorbed into it) (page-lenses) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:583 <ol> | list-style: none | sgs/container (absorbed into it) (page-lenses) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:962 <ol> "Progress" | list-style: none | not in any proposed skeleton |

## logical properties (`css-group:logical-properties-and-values`): 35

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:66 <span> | inset: 0 | removed by the skeleton (mega-menu-sunglasses) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:67 <span> | inset: 0 | removed by the skeleton (mega-menu-sunglasses) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:113 <div> | inset: -9%0 | sgs/hero (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:115 <div> | inset: 0 | removed by the skeleton (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:116 <div> | inset: 0 | removed by the skeleton (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:161 <span> .scpa | inset: 0 | sgs/container (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:162 <span> | inset: 0 | sgs/container (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:217 <img> "Person wearing sunglasses outdoors" .scpd | inset: 0 | sgs/media (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:269 <aside> | inset: {{ railInset }} | sgs/container (page-shop); woocommerce/product-filters (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:346 <div> | inset: 0 | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:701 <svg> | inset: 0 | sgs/hero (absorbed into it) (page-contact) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1162 <div> .sgs-mobile-menu | inset: 0 | sgs/nav-drawer (mobile-menu) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1193 <div> .sgs-bag-drawer | inset: 0 | sgs/cart (bag-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1194 <div> | inset: 0 | sgs/cart (absorbed into it) (bag-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1232 <div> .sgs-size-guide | inset: 0 | no block (outside the skeleton root) (size-guide) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1233 <div> | inset: 0 | no block (outside the skeleton root) (size-guide) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1280 <div> "Add prescription lenses" .sgs-lens-configurator | inset: 0 | sgs/choice-flow (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1295 <div> "{{ cur.brand }}" | inset: 0 | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1328 <span> | inset: 0 | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1351 <span> | inset: 0 | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1376 <span> | inset: 0 | not in any proposed skeleton |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:5 <div> | inset: 0 | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:106 <div> | inset: 0 | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:111 <span> | inset: 0 | removed by the skeleton (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:232 <span> | inset: 0 | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:318 <span> | inset: 0 | removed by the skeleton (page-our-story); no block (outside the skeleton root) (page-certifications, page-community, page-sustainability, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:321 <div> | inset: 0 | removed by the skeleton (page-about) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:368 <span> | inset: 0 | sgs/container (absorbed into it) (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:495 <span> .scp11 | inset: 0 | no block (outside the skeleton root) (page-brand-sanam, page-brand-shan, page-brand-green-leaf, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:495 <span> .scp11 | inset: 0 (on after) | no block (outside the skeleton root) (page-brand-sanam, page-brand-shan, page-brand-green-leaf, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:518 <span> | inset: 0 | removed by the skeleton (page-about); no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:538 <iframe> "Indus Foods location map" | inset: 0 | sgs/business-info (page-contact) |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1441:26), styling Indus Foods Website v2:300 <div>; TradeApplication:79 <div> | inset: 0 | sgs/process-steps (absorbed into it) (page-home); sgs/form (absorbed into it) (page-apply); sgs/container (trade-account-application) |
| mamas-munches-redesign | Home.dc.html | Home:102 <div> | inset: 0 | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:55 <div> | inset: 0 | not in any proposed skeleton |

## scroll snap (`css-group:scroll-snap`): 28

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:189 <div> .rev-rail | scroll-snap-type: x mandatory | sgs/google-reviews (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:189 <div> .rev-rail | scroll-padding-left: 0 | sgs/google-reviews (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:191 <figure> | scroll-snap-align: start | sgs/google-reviews (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:456 <div> | scroll-padding-inline: {{ R.px }} | removed by the skeleton (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:456 <div> | scroll-snap-type: x mandatory | removed by the skeleton (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:458 <article> | scroll-snap-align: start | inside an element the skeleton removes (page-about); no block (outside the skeleton root) (page-our-story) |
| mamas-munches-redesign | Home.dc.html | Home:63 <section> | scroll-margin-top: 72px | sgs/container (page-home-dc-html); sgs/choice-flow (build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:124 <section> | scroll-margin-top: 72px | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:132 <div> | scroll-snap-type: x mandatory | woocommerce/product-collection (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:132 <div> | scroll-padding: 0 20px | woocommerce/product-collection (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:134 <a> .scp9 | scroll-snap-align: start | woocommerce/product-collection (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:194 <section> | scroll-margin-top: 72px | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:208 <section> | scroll-margin-top: 72px | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:222 <div> | scroll-snap-type: x mandatory | sgs/trustpilot-reviews (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:222 <div> | scroll-padding: 0 20px | sgs/trustpilot-reviews (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:224 <article> .scpd | scroll-snap-align: start | sgs/trustpilot-reviews (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | a value in the draft's code (Home:js:288:160), styling no rendered element found | scroll-snap-type:  | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | a value in the draft's code (Home:js:290:293), styling no rendered element found | scroll-snap-type:  | not in any proposed skeleton |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:14 <div> | scroll-snap-type: x mandatory | sgs/gallery (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:16 <a> "View on Instagram" .scpn | scroll-snap-align: start | sgs/gallery (absorbed into it) (site-footer) |
| mamas-munches-redesign | Product.dc.html | Product:63 <div> | scroll-margin-top: 100px | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:123 <section> | scroll-margin-top: 100px | sgs/container (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:126 <div> | scroll-snap-type: x mandatory | sgs/testimonial-slider (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:128 <article> .scp3 | scroll-snap-align: start | sgs/testimonial-slider (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:34 <section> | scroll-margin-top: 72px | sgs/container (page-gifts-dc-html) |
| mamas-munches-redesign | Help.dc.html | Help:37 <section> | scroll-margin-top: 80px | sgs/container (page-help-dc-html) |
| mamas-munches-redesign | Help.dc.html | Help:64 <section> | scroll-margin-top: 80px | sgs/container (page-help-dc-html) |
| mamas-munches-redesign | Help.dc.html | Help:76 <section> | scroll-margin-top: 80px | sgs/container (page-help-dc-html) |

## masking and clipping (`css-group:masking`): 21

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:221 <div> | mask-image: linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent) | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:495 <span> .scp11 | clip-path: circle(var(--pr,0px) at var(--mx,50%) var(--my,50%)) | no block (outside the skeleton root) (page-brand-sanam, page-brand-shan, page-brand-green-leaf, …) |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | clip-rule: evenodd | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | Home:41 <div> "baked with love" | clip-path: polygon(0 0,100%0,88% 50%,100% 100%,0 100%) | sgs/label (page-home-dc-html) |
| mamas-munches-redesign | Product.dc.html | Product:20 <div> "baked with love" | clip-path: polygon(0 0,100%0,88% 50%,100% 100%,0 100%) | sgs/label (page-product-dc-html-id-zookies) |

## compositing and blending (`css-group:compositing-and-blending`): 3

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1387:36), styling no rendered element found | isolation:  | not in any proposed skeleton |
| indus-foods | assets/logo-horizontal-anim.svg | assets/logo-horizontal-anim.svg (no rendered element found) | mix-blend-mode: normal | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | Home:14 <h1> "Made for the mum who needs it" | isolation: isolate | sgs/container (page-home-dc-html) |

## transforms (`css-group:transforms`): 397

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `from` transform: translateY(18px) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `to` transform: none | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `from` transform: translateX(100%) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `to` transform: none | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `from` transform: scale(.985) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `to` transform: none | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:13 <header> .sgs-header; Eye Care Birmingham:14 <div>; Eye Care Birmingham:15 <nav>; Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:18 <span>; Eye Care Birmingham:19 <span>; and 934 more | `0%` transform: scale(.6) | sgs/site-header (header); sgs/site-header-row (header); sgs/nav-bar-menu (header); sgs/nav-bar-menu (absorbed into it) (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:13 <header> .sgs-header; Eye Care Birmingham:14 <div>; Eye Care Birmingham:15 <nav>; Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:18 <span>; Eye Care Birmingham:19 <span>; and 934 more | `60%` transform: scale(1.15) | sgs/site-header (header); sgs/site-header-row (header); sgs/nav-bar-menu (header); sgs/nav-bar-menu (absorbed into it) (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:13 <header> .sgs-header; Eye Care Birmingham:14 <div>; Eye Care Birmingham:15 <nav>; Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:18 <span>; Eye Care Birmingham:19 <span>; and 934 more | `100%` transform: scale(1) | sgs/site-header (header); sgs/site-header-row (header); sgs/nav-bar-menu (header); sgs/nav-bar-menu (absorbed into it) (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:13 <header> .sgs-header; Eye Care Birmingham:14 <div>; Eye Care Birmingham:15 <nav>; Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:18 <span>; Eye Care Birmingham:19 <span>; and 934 more | `0%` transform: translate(-50%,16px) | sgs/site-header (header); sgs/site-header-row (header); sgs/nav-bar-menu (header); sgs/nav-bar-menu (absorbed into it) (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:13 <header> .sgs-header; Eye Care Birmingham:14 <div>; Eye Care Birmingham:15 <nav>; Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:18 <span>; Eye Care Birmingham:19 <span>; and 934 more | `12%` transform: translate(-50%,0) | sgs/site-header (header); sgs/site-header-row (header); sgs/nav-bar-menu (header); sgs/nav-bar-menu (absorbed into it) (header) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `from` transform: scale(1.08) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling no rendered element found | `to` transform: scale(1) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:122 <button> "Shop sunglasses" .scp6 | transform: translateY(-3px) (on hover) | sgs/button (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:123 <button> "Add your prescription" .scp7 | transform: translateY(-3px) (on hover) | sgs/button (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:159 <button> .scp9 | transform: translateY(-4px) (on hover) | sgs/container (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:161 <span> .scpa | transform: scale(1.07) (on hover) | sgs/container (absorbed into it) (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:217 <img> "Person wearing sunglasses outdoors" .scpd | transform: scale(1.05) (on hover) | sgs/media (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:230 <button> "How lenses work here" .scpe | transform: translateY(-3px) (on hover) | sgs/button (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:242 <a> "Message me on WhatsApp" .scpf | transform: translateY(-3px) (on hover) | sgs/whatsapp-cta (page-home) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:281 <svg> | transform: {{ g.rot }} | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:298 <button> "Black" .scpi | transform: scale(1.12) (on hover) | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:344 <div> | transform: scale(1.04) (on hover) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:379 <button> "Gold" .scpl | transform: translateY(-2px) (on hover) | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:393 <button> .scpm | transform: translateY(-2px) (on hover) | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:396 <button> .scpn | transform: translateY(-2px) (on hover) | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:459 <div> | transform: translateX(-50%) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:462 <div> | transform: translateX(-50%) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:479 <div> | transform: translateX(-50%) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:496 <span> "+" | transform: {{ a.rot }} | sgs/container (absorbed into it) (page-product) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:649 <span> "+" | transform: {{ q.rot }} | sgs/accordion (absorbed into it) (page-help) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:666 <a> "WhatsApp 07960 5978" .scpt | transform: translateY(-2px) (on hover) | sgs/whatsapp-cta (page-contact) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1158 <a> "Message Fatima on WhatsApp" .sgs-whatsapp-fab.scpf | transform: translateY(-3px) (on hover) | sgs/whatsapp-cta (footer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1326 <button> .scpz | transform: translateY(-3px) (on hover) | sgs/choice-flow (absorbed into it) (lens-configurator) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1349 <button> | transform: translateY(-3px) (on hover) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1373 <button> | transform: translateY(-3px) (on hover) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1392 <button> | transform: translateY(-2px) (on hover) | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2579:6), styling no rendered element found | transform:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2611:6), styling no rendered element found | transform:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a value in the draft's code (Eye Care Birmingham:js:2619:4), styling no rendered element found | transform:  | not in any proposed skeleton |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:0 <div> .scp11 | transform: translateY(-4px) (on hover) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:3 <div> "Cat-eye sunglasses (placeholder photogr…" .scp12 | transform: scale(1.06) (on hover) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:10 <button> "Save" .scp13 | transform: scale(1.08) (on hover) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| eye-care-ward-end | Frame Card.dc.html | Frame Card:31 <button> "Gold" .scp14 | transform: scale(1.25) (on hover) | woocommerce/product-collection (absorbed into it) (page-home, page-shop, page-product) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:13 <a> "Register For A Trade Account" .scp0 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:14 <a> "{{ phoneIcon }}" .scp0 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:20 <a> "{{ mailIcon }} amir@indusfoodsltd.com" .scp0 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:23 <a> "LinkedIn" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:26 <a> "Facebook" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:29 <a> "Google" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:35 <a> "Instagram" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:38 <div> | transform-origin: 0 50% | removed by the skeleton (scroll-progress-bar) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:38 <div> | transform: scaleX(0) | removed by the skeleton (scroll-progress-bar) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:50 <span> "{{ caretIcon }}" | transform: rotate({{ item.caret }}deg) | sgs/nav-bar-menu (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:54 <a> "Register For A Trade Account" .scp2 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:58 <a> "Register For A Trade Account" .scp2 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:59 <button> "Open menu" .scp3 | transform: scale(1.07) (on hover) | sgs/container (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:87 <a> .scp6 | transform: translateY(-6px) (on hover) | sgs/container (absorbed into it) (sectors-mega-menu) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:100 <a> .scp7 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/gallery (absorbed into it) (brands-mega-menu) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:116 <a> "Call 0121 771 4330" .scp8 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:117 <a> "Email amir@indusfoodsltd.com" .scp8 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/container (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:118 <button> "Close menu" .scp9 | transform: rotate(90deg) scale(1.08) (on hover) | sgs/container (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:119 <span> | transform: rotate(45deg) | sgs/container (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:120 <span> | transform: rotate(-45deg) | sgs/container (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:127 <span> "{{ item.label }}" | transform: translateX(var(--lx,0px)) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:130 <span> "{{ caretLg }}" | transform: rotate({{ item.accCaret }}deg) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:139 <a> .scpb | transform: translateY(-3px) (on hover) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:148 <span> "{{ arrowIcon }}" | transform: translateX(var(--ax,0px)) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:153 <span> | transform: translateX(var(--lx,0px)) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:160 <a> .scpd | transform: translateY(-4px) rotate(-1deg) (on hover) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:165 <span> "{{ arrowIcon }}" | transform: translateX(var(--ax,0px)) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:171 <a> "Sanam" .scpe | transform: scale(1.05) translateY(-2px) (on hover) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:177 <a> "{{ item.ownCta }} {{ arrowIcon }}" .scpf | transform: translateY(-2px) (on hover) | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:181 <a> "LinkedIn" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:184 <a> "Facebook" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:187 <a> "Google" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:193 <a> "Instagram" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:197 <a> .scpg | transform: translateY(-2px) (on hover) | sgs/button (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:200 <span> "{{ arrowIcon }}" | transform: translateX(var(--ax,0px)) | sgs/button (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:209 <a> "Apply For A Trade Account {{ arrowIcon …" .scph | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:210 <a> "Request Our Catalogue" .scpi | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:224 <a> "Sanam" .scpj | transform: scale(1.05) translateY(-2px) (on hover) | sgs/brand-strip (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:229 <div> | perspective: 1100px | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:231 <div> .scpk | transform: scale(1.04) translateY(-6px) (on hover) | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:233 <div> .scpl | transform: scale(1.12) rotate(-8deg) (on hover) | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:237 <a> "{{ c.btn }}" .scpm | transform: scale(1.05) translateY(-2px) (on hover) | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:243 <div> .scpn | transform: scale(1.05) translateY(-2px) (on hover) | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:244 <span> "{{ w.icon }}" | transform: var(--icT,none) | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:257 <span> | transform-origin: 0 50% | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:261 <span> "{{ ms.year }}" .scpp | transform: scale(1.12) (on hover) | sgs/timeline (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:272 <button> "Previous testimonial" .scpq | transform: scale(1.1) (on hover) | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:273 <span> "{{ arrowIcon }}" | transform: rotate(180deg) | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:283 <button> "Next testimonial" .scpq | transform: scale(1.1) (on hover) | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:288 <div> .scpr | transform: scale(1.06) rotate(-8deg) (on hover) | sgs/container (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:297 <span> | transform-origin: 0 50% | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:301 <span> "{{ st.n }}" .scpl | transform: scale(1.12) rotate(-8deg) (on hover) | sgs/process-steps (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:306 <a> "Start your application {{ arrowIcon }}" .scpi | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:313 <a> "Apply For A Trade Account {{ arrowIcon …" .scph | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:314 <a> "Request Our Catalogue" .scpi | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:338 <a> "{{ c.label }} {{ arrowIcon }}" .scpt | transform: scale(1.05) translateY(-2px) (on hover) | sgs/multi-button (absorbed into it) (page-about); no block (outside the skeleton root) (page-food-service, page-manufacturing, page-retail, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:365 <div> | perspective: 1100px | sgs/container (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:367 <a> .scpv | transform: translateY(-8px) (on hover) | sgs/container (absorbed into it) (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:391 <span> | transform: translateY(-1px) | no block (outside the skeleton root) (page-our-story, page-sustainability, page-food-service, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:418 <button> "{{ r.cta }}" | transform: scale(var(--ps,1)) | no block (outside the skeleton root) (page-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:419 <span> "{{ arrowIcon }}" | transform: translateX(var(--ax,0px)) | no block (outside the skeleton root) (page-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:424 <article> .scpx | transform: translateY(-4px) (on hover) | sgs/container (absorbed into it) (page-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:432 <button> "Apply for this role {{ arrowIcon }}" .scpy | transform: scale(1.05) translateY(-2px) (on hover) | sgs/container (absorbed into it) (page-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:442 <span> | transform-origin: 0 50% | inside an element the skeleton removes (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:442 <span> | transform: scaleX(0) | inside an element the skeleton removes (page-about); no block (outside the skeleton root) (page-our-story) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:471 <span> | transform-origin: 50%0 | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:473 <div> | transform: translateX(6px) (on hover) | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:481 <a> .scp10 | transform: translateY(-6px) (on hover) | sgs/container (absorbed into it) (page-about); no block (outside the skeleton root) (page-certifications, page-community, page-careers, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:497 <span> | transform: scale(var(--pk,0)) | no block (outside the skeleton root) (page-brand-sanam, page-brand-shan, page-brand-green-leaf, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:501 <a> .scp12 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/container (absorbed into it) (page-brands) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:510 <figure> | transform: translateY(-6px) (on hover) | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:525 <a> "{{ b.primary.label }} {{ arrowIcon }}" .scp14 | transform: translateY(-2px) (on hover) | sgs/button (page-about); no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:531 <a> .scp15 | transform: translateY(-3px) (on hover) | sgs/container (absorbed into it) (page-contact) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:539 <a> "Get Directions {{ arrowIcon }}" .scp16 | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-contact) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:581 <span> | transform: translateY(-1px) | sgs/container (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:596 <span> "{{ plusIcon }}" | transform: rotate({{ q.rot }}deg) | sgs/container (absorbed into it) (page-delivery); no block (outside the skeleton root) (page-faqs) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:606 <a> .scp1b | transform: translateY(-6px) (on hover) | sgs/post-grid (absorbed into it) (page-blog); no block (outside the skeleton root) (page-post-post-1, page-post-post-2, page-post-post-3, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:638 <span> "{{ arrowIcon }}" | transform: rotate(180deg) | sgs/icon (page-post-post-1); no block (outside the skeleton root) (page-post-post-2, page-post-post-3, page-post-post-4, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:639 <a> "Ask our team {{ arrowIcon }}" .scp1d | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-post-post-1); no block (outside the skeleton root) (page-post-post-2, page-post-post-3, page-post-post-4, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:658 <a> .scp1e | transform: translateY(-4px) (on hover) | sgs/container (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:664 <a> .scp1e | transform: translateY(-4px) (on hover) | sgs/container (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:687 <a> "LinkedIn" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:690 <a> "Facebook" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:693 <a> "Google" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:699 <a> "Instagram" .scp1 | transform: scale(1.15) translateY(-3px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:708 <a> "Apply For A Trade Account {{ arrowIcon …" .scp1g | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:717 <a> "Get Directions {{ arrowIcon }}" .scp1h | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:727 <span> "{{ arrowIcon }}" | transform: var(--tt,rotate(-90deg)) | sgs/icon (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:728 <a> "Message Indus Foods on WhatsApp" .scp1k | transform: translateY(-3px) (on hover) | sgs/whatsapp-cta (footer) |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1085:6), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1086:15), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1094:8), styling no rendered element found | scale:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1104:22), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1107:24), styling no rendered element found | translate:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1179:47), styling no rendered element found | scale:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1179:72), styling no rendered element found | rotate:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1180:47), styling no rendered element found | scale:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1180:69), styling no rendered element found | rotate:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1199:8), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1208:6), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1365:8), styling no rendered element found | rotate:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1369:46), styling no rendered element found | translate:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1373:8), styling no rendered element found | translate:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1397:153), styling no rendered element found | rotate:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1447:103), styling no rendered element found | scale:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1471:4), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1473:86), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1480:22), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1481:22), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1979:26), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1980:26), styling no rendered element found | transform:  | not in any proposed skeleton |
| indus-foods | indus-logo.js | a value in the draft's code (./indus-logo.js:js:43:95), styling no rendered element found | transform-box:  | not in any proposed skeleton |
| indus-foods | indus-logo.js | a value in the draft's code (./indus-logo.js:js:43:130), styling no rendered element found | transform-origin:  | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:19 <span> "{{ st.mark }}" | transform: scale({{ st.scale }}) | sgs/form (absorbed into it) (page-apply); inside an element the skeleton removes (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:49 <button> "{{ c.label }}" .scp1m | transform: translateY(-2px) (on hover) | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:81 <button> "Back" | transform: translateX(-3px) (on hover) | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:82 <span> "{{ arrow }}" | transform: rotate(180deg) | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:85 <button> "{{ nextLabel }} {{ arrow }}" .scp1p | transform: scale(1.04) translateY(-2px) (on hover) | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:91 <span> "{{ chev }}" | transform: rotate({{ ckRot }}deg) | sgs/icon (page-apply); removed by the skeleton (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:101 <a> "0121 771 4330" .scp1q | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-apply); removed by the skeleton (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:105 <a> "Call 0121 771 4330" .scp1q | transform: scale(1.05) translateY(-2px) (on hover) | sgs/button (page-apply); removed by the skeleton (trade-account-application) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:13 <button> .scp1l | transform: translateY(-3px) (on hover) | sgs/form (absorbed into it) (page-contact); sgs/form-field-tiles (absorbed into it) (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:42 <button> "{{ sendLabel }} {{ arrow }}" .scp1n | transform: scale(1.04) translateY(-2px) (on hover) | sgs/form (absorbed into it) (page-contact); sgs/button (contact-enquiry) |
| mamas-munches-redesign | Home.dc.html | a stylesheet rule (Home:5), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | a stylesheet rule (Home:5), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | Home:12 <div> "{{ greeting }}" | transform: rotate(-2deg) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:12 <div> "{{ greeting }}" | transform-origin: left | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:15 <span> | transform: rotate(-4deg) | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:18 <span> | transform: rotate(-1.5deg) | removed by the skeleton (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:21 <a> "Build your box" .scp0.scp1 | transform: translate(-3px,-3px) (on hover) | sgs/button (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:21 <a> "Build your box" .scp0.scp1 | transform: translate(3px,3px) (on active) | sgs/button (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:23 <a> "Send a gift" .scp2.scp1 | transform: translate(-3px,-3px) (on hover) | sgs/button (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:23 <a> "Send a gift" .scp2.scp1 | transform: translate(3px,3px) (on active) | sgs/button (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:29 <div> .scp3 | transform: rotate(-9deg) | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:29 <div> .scp3 | transform: rotate(-3deg) translateY(-12px) (on hover) | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:32 <div> .scp4 | transform: rotate(8deg) | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:32 <div> .scp4 | transform: rotate(3deg) translateY(-12px) (on hover) | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:35 <div> .scp5 | transform: rotate(-1.5deg) | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:35 <div> .scp5 | transform: rotate(1deg) translateY(-10px) (on hover) | sgs/hero (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:38 <div> | transform: rotate(12deg) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:41 <div> "baked with love" | transform: rotate(-6deg) | sgs/label (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:47 <a> .scp6 | transform: translate(-4px,-4px) rotate(-.5deg) (on hover) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:55 <a> .scp7 | transform: translate(-4px,-4px) rotate(.5deg) (on hover) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:74 <button> "{{ o.name }}" .scp8 | transform: {{ o.tf }} | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:74 <button> "{{ o.name }}" .scp8 | transform: translate(-2px,-2px) (on hover) | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:80 <button> "{{ o.name }}" .scp8 | transform: {{ o.tf }} | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:80 <button> "{{ o.name }}" .scp8 | transform: translate(-2px,-2px) (on hover) | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:87 <button> "{{ o.name }}" .scp8 | transform: {{ o.tf }} | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:87 <button> "{{ o.name }}" .scp8 | transform: translate(-2px,-2px) (on hover) | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:94 <button> .scp8 | transform: {{ o.tf }} | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:94 <button> .scp8 | transform: translate(-2px,-2px) (on hover) | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:105 <span> | transform: translate(-50%,-50%) rotate({{ d.rot }}) | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:122 <button> "{{ addLabel }}" .scp0.scp1 | transform: translate(-3px,-3px) (on hover) | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:122 <button> "{{ addLabel }}" .scp0.scp1 | transform: translate(3px,3px) (on active) | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:134 <a> .scp9 | transform: rotate({{ t.rot }}) | woocommerce/product-collection (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:134 <a> .scp9 | transform: rotate(0deg) translate(-4px,-6px) (on hover) | woocommerce/product-collection (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:153 <div> | transform: rotate(-1deg) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:154 <span> | transform: translateX(-50%) rotate(2deg) | removed by the skeleton (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:157 <a> .scpa | transform: translate(-4px,-4px) (on hover) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:158 <img> | transform: rotate(-8deg) | sgs/responsive-logo (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:164 <div> | transform: rotate(-1deg) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:165 <span> | transform: rotate(-4deg) | removed by the skeleton (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:196 <div> .scpb | transform: rotate(-2.5deg) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:196 <div> .scpb | transform: rotate(0deg) (on hover) | sgs/container (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:197 <span> | transform: rotate(-8deg) | removed by the skeleton (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:198 <span> | transform: rotate(7deg) | removed by the skeleton (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:220 <button> "Previous review" .scpc | transform: translate(-2px,-2px) (on hover) | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:221 <button> "Next review" .scpc | transform: translate(-2px,-2px) (on hover) | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:224 <article> .scpd | transform: rotate({{ r.rot }}) | sgs/trustpilot-reviews (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:224 <article> .scpd | transform: rotate(0deg) translateY(-4px) (on hover) | sgs/trustpilot-reviews (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:247 <span> "+" | transform: rotate({{ f.rot }}) | sgs/accordion (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:49 <button> .scpc | transform: translate(-2px,-2px) (on hover) | sgs/cart (site-header-announcement-strip-bar) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:56 <aside> "Menu" | transform: {{ navX }} | sgs/nav-drawer (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:63 <a> .scpf | transform: translate(-3px,-3px) (on hover) | sgs/container (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:68 <a> .scpf | transform: translate(-3px,-3px) (on hover) | sgs/container (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:92 <a> "Sign in" .scph.scpi | transform: translate(-2px,-2px) (on hover) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:92 <a> "Sign in" .scph.scpi | transform: translate(2px,2px) (on active) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:93 <a> "Create account" .scpc.scpi | transform: translate(-2px,-2px) (on hover) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:93 <a> "Create account" .scpc.scpi | transform: translate(2px,2px) (on active) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:95 <a> | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:107 <a> "WhatsApp" .scpj.scpi | transform: translate(-2px,-2px) (on hover) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:107 <a> "WhatsApp" .scpj.scpi | transform: translate(2px,2px) (on active) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:112 <a> "Email" .scpj.scpi | transform: translate(-2px,-2px) (on hover) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:112 <a> "Email" .scpj.scpi | transform: translate(2px,2px) (on active) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:117 <a> "Instagram" .scpj.scpi | transform: translate(-2px,-2px) (on hover) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:117 <a> "Instagram" .scpj.scpi | transform: translate(2px,2px) (on active) | sgs/icon-list (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:123 <a> .scpk | transform: translate(-2px,-2px) (on hover) | sgs/container (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:128 <aside> "Basket" | transform: {{ basketX }} | sgs/cart (basket-drawer-right) |
| mamas-munches-redesign | SiteFooter.dc.html | a stylesheet rule (SiteFooter:1), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | SiteFooter.dc.html | a stylesheet rule (SiteFooter:1), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:7 <div> "fresh out the oven…" | transform: rotate(-2deg) | sgs/label (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:7 <div> "fresh out the oven…" | transform-origin: left | sgs/label (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:9 <a> "Follow along" .scpm | transform: translate(-2px,-2px) (on hover) | sgs/button (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:16 <a> "View on Instagram" .scpn | transform: rotate({{ p.rot }}) | sgs/gallery (absorbed into it) (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:16 <a> "View on Instagram" .scpn | transform: rotate(0deg) translateY(-6px) (on hover) | sgs/gallery (absorbed into it) (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:24 <a> "Build your box" .scpm | transform: translate(-2px,-2px) (on hover) | sgs/button (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:26 <img> "Mama's Munches" .scpo | transform: rotate(-8deg) | sgs/responsive-logo (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:26 <img> "Mama's Munches" .scpo | transform: rotate(6deg) scale(1.05) (on hover) | sgs/responsive-logo (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:30 <a> "All Zookies" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:31 <a> "Build your box" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:32 <a> "Subscribe & save" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:33 <a> "Gifts" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:34 <a> "Taster Trio" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:37 <a> "FAQs" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:38 <a> "Delivery" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:39 <a> "Allergens" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:40 <a> "Contact" .scpp | transform: translateX(4px) (on hover) | sgs/icon-list (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:45 <a> "Instagram" .scpr | transform: translate(-2px,-2px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (site-footer) |
| mamas-munches-redesign | SiteFooter.dc.html | SiteFooter:50 <a> "WhatsApp" .scpr | transform: translate(-2px,-2px) rotate(-8deg) (on hover) | sgs/social-icons (absorbed into it) (site-footer) |
| mamas-munches-redesign | Shop.dc.html | a stylesheet rule (Shop:5), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Shop.dc.html | a stylesheet rule (Shop:5), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Shop.dc.html | Shop:12 <div> "fresh from Zainab’s kitchen" | transform: rotate(-2deg) | sgs/label (page-shop-dc-html) |
| mamas-munches-redesign | Shop.dc.html | Shop:12 <div> "fresh from Zainab’s kitchen" | transform-origin: left | sgs/label (page-shop-dc-html) |
| mamas-munches-redesign | Shop.dc.html | Shop:23 <button> "{{ c.label }}" .scp0 | transform: {{ c.tf }} | woocommerce/product-filters (absorbed into it) (page-shop-dc-html); inside an element the skeleton removes (shop-filter-sort) |
| mamas-munches-redesign | Shop.dc.html | Shop:23 <button> "{{ c.label }}" .scp0 | transform: translate(-2px,-2px) (on hover) | woocommerce/product-filters (absorbed into it) (page-shop-dc-html); inside an element the skeleton removes (shop-filter-sort) |
| mamas-munches-redesign | Shop.dc.html | Shop:33 <a> .scp1 | transform: translate(-4px,-4px) (on hover) | sgs/container (page-shop-dc-html) |
| mamas-munches-redesign | Shop.dc.html | Shop:39 <a> .scp1 | transform: translate(-4px,-4px) (on hover) | sgs/container (page-shop-dc-html) |
| mamas-munches-redesign | Shop.dc.html | Shop:45 <a> .scp1 | transform: translate(-4px,-4px) (on hover) | sgs/container (page-shop-dc-html) |
| mamas-munches-redesign | ProductCard.dc.html | ProductCard:0 <div> .scpi | transform: rotate({{ rot }}) | woocommerce/product-collection (absorbed into it) (page-shop-dc-html, page-product-dc-html-id-zookies, page-gifts-dc-html) |
| mamas-munches-redesign | ProductCard.dc.html | ProductCard:0 <div> .scpi | transform: rotate(0deg) translate(-4px,-6px) (on hover) | woocommerce/product-collection (absorbed into it) (page-shop-dc-html, page-product-dc-html-id-zookies, page-gifts-dc-html) |
| mamas-munches-redesign | ProductCard.dc.html | ProductCard:11 <button> "{{ btnLabel }}" .scp6.scp7 | transform: translate(-2px,-2px) (on hover) | woocommerce/product-collection (absorbed into it) (page-shop-dc-html, page-product-dc-html-id-zookies, page-gifts-dc-html) |
| mamas-munches-redesign | ProductCard.dc.html | ProductCard:11 <button> "{{ btnLabel }}" .scp6.scp7 | transform: translate(2px,2px) (on active) | woocommerce/product-collection (absorbed into it) (page-shop-dc-html, page-product-dc-html-id-zookies, page-gifts-dc-html) |
| mamas-munches-redesign | Product.dc.html | a stylesheet rule (Product:4), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | a stylesheet rule (Product:4), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:20 <div> "baked with love" | transform: rotate(-4deg) | sgs/label (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:23 <button> "Photo 1" .scp0 | transform: {{ g.tf }} | sgs/multi-button (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:23 <button> "Photo 1" .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/multi-button (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:37 <button> .scp0 | transform: {{ o.tf }} | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:37 <button> .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:47 <button> "{{ o.name }}" .scp0 | transform: {{ o.tf }} | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:47 <button> "{{ o.name }}" .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:53 <button> "{{ o.name }}" .scp0 | transform: {{ o.tf }} | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:53 <button> "{{ o.name }}" .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:60 <button> "{{ o.name }}" .scp0 | transform: {{ o.tf }} | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:60 <button> "{{ o.name }}" .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:83 <button> "{{ o.label }}" | transform: {{ o.tf }} | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:108 <button> "{{ addLabel }}" .scp1.scp2 | transform: translate(-3px,-3px) (on hover) | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-buy-box) |
| mamas-munches-redesign | Product.dc.html | Product:108 <button> "{{ addLabel }}" .scp1.scp2 | transform: translate(3px,3px) (on active) | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-buy-box) |
| mamas-munches-redesign | Product.dc.html | Product:120 <span> "+" | transform: rotate({{ a.rot }}) | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:128 <article> .scp3 | transform: rotate({{ r.rot }}) | sgs/testimonial-slider (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:128 <article> .scp3 | transform: rotate(0deg) translateY(-4px) (on hover) | sgs/testimonial-slider (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:141 <div> | transform: {{ barY }} | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | a stylesheet rule (Basket:5), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | a stylesheet rule (Basket:5), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:15 <img> | transform: rotate(-8deg) | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:19 <a> "Build your box" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:20 <button> "Add a Taster Trio · £5" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:29 <div> .scp1 | transform: translate(-2px,-2px) (on hover) | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:55 <button> "Add" | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:67 <a> "Checkout securely →" .scp3 | transform: translate(-3px,-3px) (on hover) | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:117 <button> "Pay {{ totalText }}" .scp0.scp1 | transform: translate(-3px,-3px) (on hover) | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:117 <button> "Pay {{ totalText }}" .scp0.scp1 | transform: translate(3px,3px) (on active) | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Confirmation.dc.html | a stylesheet rule (Confirmation:5), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | a stylesheet rule (Confirmation:5), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:11 <div> "✓" | transform: rotate(-8deg) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:42 <div> | transform: rotate(2deg) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:43 <span> | transform: translateX(-50%) rotate(-3deg) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:49 <a> | transform: translate(-4px,-4px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:55 <a> | transform: translate(-4px,-4px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:61 <a> | transform: translate(-4px,-4px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:67 <a> | transform: translate(-4px,-4px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Confirmation.dc.html | Confirmation:76 <a> | transform: translate(-4px,-4px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:11 <div> "{{ eyebrow }}" | transform: rotate(-2deg) | sgs/label (page-account-dc-html) |
| mamas-munches-redesign | Account.dc.html | Account:11 <div> "{{ eyebrow }}" | transform-origin: left | sgs/label (page-account-dc-html) |
| mamas-munches-redesign | Account.dc.html | Account:23 <a> "Sign in →" .scp0 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (page-account-dc-html) |
| mamas-munches-redesign | Account.dc.html | Account:24 <a> "Create an account" .scp1 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (page-account-dc-html) |
| mamas-munches-redesign | Account.dc.html | Account:29 <button> "{{ t.label }}" | transform: {{ t.tf }} | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:29 <button> "{{ t.label }}" | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:36 <div> | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:48 <button> "View order →" | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:59 <div> | transform: rotate(-4deg) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:89 <button> "{{ againLabel }}" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:89 <button> "{{ againLabel }}" | transform: translate(3px,3px) (on active) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:96 <div> | transform: rotate(1.5deg) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:97 <span> | transform: translateX(-50%) rotate(-3deg) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:123 <button> "{{ f.label }}" | transform: {{ f.tf }} | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:123 <button> "{{ f.label }}" | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:126 <button> "Skip next delivery" | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:127 <button> "{{ s.pauseLabel }}" | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:137 <button> "Restart subscription" | transform: translate(-2px,-2px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:139 <a> | transform: translate(-4px,-4px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:177 <button> "Save address" .scp0.scp5 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (address-form-add-edit) |
| mamas-munches-redesign | Account.dc.html | Account:177 <button> "Save address" .scp0.scp5 | transform: translate(3px,3px) (on active) | sgs/account (absorbed into it) (address-form-add-edit) |
| mamas-munches-redesign | Account.dc.html | Account:196 <button> "Save changes" .scp0.scp5 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:196 <button> "Save changes" .scp0.scp5 | transform: translate(3px,3px) (on active) | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:209 <button> "Update password" .scp1 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:11 <div> "{{ eyebrow }}" | transform: rotate(-2deg) | sgs/label (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:11 <div> "{{ eyebrow }}" | transform-origin: left | sgs/label (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:20 <a> "Go to my account →" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:21 <button> "Sign out" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:24 <button> "Sign in" .scp2 | transform: {{ tabA.tf }} | sgs/account (absorbed into it) (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:24 <button> "Sign in" .scp2 | transform: translate(-2px,-2px) (on hover) | sgs/account (absorbed into it) (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:25 <button> "Create account" .scp2 | transform: {{ tabB.tf }} | sgs/account (absorbed into it) (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:25 <button> "Create account" .scp2 | transform: translate(-2px,-2px) (on hover) | sgs/account (absorbed into it) (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:37 <button> "Sign in →" .scp0.scp3 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:37 <button> "Sign in →" .scp0.scp3 | transform: translate(3px,3px) (on active) | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:58 <button> "Create account →" .scp0.scp3 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:58 <button> "Create account →" .scp0.scp3 | transform: translate(3px,3px) (on active) | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:68 <button> "Send reset link" .scp0.scp3 | transform: translate(-3px,-3px) (on hover) | sgs/account (absorbed into it) (forgotten-password-flow) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:68 <button> "Send reset link" .scp0.scp3 | transform: translate(3px,3px) (on active) | sgs/account (absorbed into it) (forgotten-password-flow) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:71 <div> "✉" | transform: rotate(-8deg) | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:75 <button> "Open the reset link (prototype)" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:88 <button> "Save new password" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:88 <button> "Save new password" | transform: translate(3px,3px) (on active) | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:91 <div> "✓" | transform: rotate(-8deg) | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:94 <button> "Sign in →" | transform: translate(-3px,-3px) (on hover) | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | a stylesheet rule (Contact:5), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | a stylesheet rule (Contact:5), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | Contact:12 <div> "pop the kettle on ☕" | transform: rotate(-2deg) | sgs/label (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:12 <div> "pop the kettle on ☕" | transform-origin: left | sgs/label (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:15 <img> .scp0 | transform: rotate(-8deg) | sgs/hero (absorbed into it) (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:15 <img> .scp0 | transform: rotate(6deg) scale(1.05) (on hover) | sgs/hero (absorbed into it) (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:19 <a> .scp1 | transform: rotate(-1deg) | sgs/container (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:19 <a> .scp1 | transform: rotate(0deg) translate(-4px,-4px) (on hover) | sgs/container (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:26 <a> .scp1 | transform: rotate(1deg) | sgs/container (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:26 <a> .scp1 | transform: rotate(0deg) translate(-4px,-4px) (on hover) | sgs/container (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:34 <a> .scp1 | transform: rotate(-.6deg) | sgs/container (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:34 <a> .scp1 | transform: rotate(0deg) translate(-4px,-4px) (on hover) | sgs/container (page-contact-dc-html) |
| mamas-munches-redesign | Contact.dc.html | Contact:50 <button> "{{ o.name }}" .scp2 | transform: {{ o.tf }} | sgs/form (absorbed into it) (page-contact-dc-html); sgs/form-field-tiles (absorbed into it) (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:50 <button> "{{ o.name }}" .scp2 | transform: translate(-2px,-2px) (on hover) | sgs/form (absorbed into it) (page-contact-dc-html); sgs/form-field-tiles (absorbed into it) (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:67 <button> "Send message →" .scp3.scp4 | transform: translate(-3px,-3px) (on hover) | sgs/form (absorbed into it) (page-contact-dc-html); sgs/button (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:67 <button> "Send message →" .scp3.scp4 | transform: translate(3px,3px) (on active) | sgs/form (absorbed into it) (page-contact-dc-html); sgs/button (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:70 <div> "✓" | transform: rotate(-8deg) | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | Contact:77 <a> "{{ q.t }}" .scp5 | transform: translate(-3px,-3px) (on hover) | sgs/container (absorbed into it) (page-contact-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | a stylesheet rule (Gifts:5), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Gifts.dc.html | a stylesheet rule (Gifts:5), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Gifts.dc.html | Gifts:12 <div> "for the mum-to-be & the brand new mum ♥" | transform: rotate(-2deg) | sgs/label (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:12 <div> "for the mum-to-be & the brand new mum ♥" | transform-origin: left | sgs/label (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:19 <button> "{{ o.name }}" .scp0 | transform: {{ o.tf }} | sgs/option-picker (absorbed into it) (page-gifts-dc-html); inside an element the skeleton removes (gift-finder) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:19 <button> "{{ o.name }}" .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/option-picker (absorbed into it) (page-gifts-dc-html); inside an element the skeleton removes (gift-finder) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:23 <button> "{{ o.name }}" .scp0 | transform: {{ o.tf }} | sgs/option-picker (absorbed into it) (page-gifts-dc-html); inside an element the skeleton removes (gift-finder) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:23 <button> "{{ o.name }}" .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/option-picker (absorbed into it) (page-gifts-dc-html); inside an element the skeleton removes (gift-finder) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:24 <a> "{{ findLabel }}" .scp1 | transform: translate(-3px,-3px) (on hover) | sgs/button (page-gifts-dc-html); removed by the skeleton (gift-finder) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:26 <div> .scp2 | transform: rotate(-5deg) | sgs/container (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:26 <div> .scp2 | transform: rotate(-1deg) translateY(-10px) (on hover) | sgs/container (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:29 <div> | transform: rotate(4deg) | sgs/container (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:30 <span> | transform: translateX(-50%) rotate(-3deg) | removed by the skeleton (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:50 <div> .scp3 | transform: rotate({{ s.rot }}) | sgs/container (absorbed into it) (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:50 <div> .scp3 | transform: rotate(0deg) translateY(-4px) (on hover) | sgs/container (absorbed into it) (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:66 <div> | transform: rotate(-2deg) | sgs/container (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:67 <span> | transform: rotate(-6deg) | removed by the skeleton (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:68 <img> | transform: rotate(10deg) | sgs/responsive-logo (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:73 <a> .scp4 | transform: translate(-4px,-4px) (on hover) | sgs/container (page-gifts-dc-html) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:74 <img> | transform: rotate(-8deg) | sgs/responsive-logo (page-gifts-dc-html) |
| mamas-munches-redesign | Help.dc.html | a stylesheet rule (Help:5), styling no rendered element found | `from` transform: translateX(0) | not in any proposed skeleton |
| mamas-munches-redesign | Help.dc.html | a stylesheet rule (Help:5), styling no rendered element found | `to` transform: translateX(-50%) | not in any proposed skeleton |
| mamas-munches-redesign | Help.dc.html | Help:14 <span> | transform: translateY(-50%) | sgs/icon (page-help-dc-html); removed by the skeleton (help-search-category-chips) |
| mamas-munches-redesign | Help.dc.html | Help:21 <button> "{{ c.name }}" .scp0 | transform: {{ c.tf }} | sgs/option-picker (absorbed into it) (page-help-dc-html) |
| mamas-munches-redesign | Help.dc.html | Help:21 <button> "{{ c.name }}" .scp0 | transform: translate(-2px,-2px) (on hover) | sgs/option-picker (absorbed into it) (page-help-dc-html) |
| mamas-munches-redesign | Help.dc.html | Help:31 <span> "+" | transform: rotate({{ f.rot }}) | sgs/container (absorbed into it) (page-help-dc-html) |
| mamas-munches-redesign | Help.dc.html | Help:84 <a> .scp1 | transform: translate(-4px,-4px) (on hover) | sgs/container (page-help-dc-html) |

## user interface properties (`css-group:basic-user-interface`): 277

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:38 <button> "Sign in" .scp3; Eye Care Birmingham:44 <button> "Bag" .scp4; Eye Care Birmingham:1165 <button> "Close menu"; Eye Care Birmingham:1175 <button> "Size guide"; Eye Care Birmingham:122 <button> "Shop sunglasses" .scp6; and 54 more | `button` cursor: pointer | sgs/nav-bar-menu (absorbed into it) (header); sgs/icon (header); sgs/cart (header); sgs/button (mobile-menu, page-home); sgs/nav-drawer-menu (absorbed into it) (mobile-menu) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:38 <button> "Sign in" .scp3; Eye Care Birmingham:44 <button> "Bag" .scp4; Eye Care Birmingham:1165 <button> "Close menu"; Eye Care Birmingham:1175 <button> "Size guide"; Eye Care Birmingham:122 <button> "Shop sunglasses" .scp6; and 86 more | `input:focus,button:focus-visible,select:focus` outline: 2px solid var(--acc,#9C8B78) | sgs/nav-bar-menu (absorbed into it) (header); sgs/icon (header); sgs/cart (header); sgs/button (mobile-menu, page-home); sgs/nav-drawer-menu (absorbed into it) (mobile-menu) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:38 <button> "Sign in" .scp3; Eye Care Birmingham:44 <button> "Bag" .scp4; Eye Care Birmingham:1165 <button> "Close menu"; Eye Care Birmingham:1175 <button> "Size guide"; Eye Care Birmingham:122 <button> "Shop sunglasses" .scp6; and 86 more | `input:focus,button:focus-visible,select:focus` outline-offset: 2px | sgs/nav-bar-menu (absorbed into it) (header); sgs/icon (header); sgs/cart (header); sgs/button (mobile-menu, page-home); sgs/nav-drawer-menu (absorbed into it) (mobile-menu) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:300 <input> "Maximum price" | appearance:  | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:300 <input> "Maximum price" | accent-color: #141414 | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:308 <label> .scpj | cursor: pointer | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:310 <input> | appearance:  | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:310 <input> | accent-color: #141414 | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:313 <label> | cursor: pointer | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:685 <input> "Email" | appearance:  | removed by the skeleton (page-contact); sgs/form-field-email (contact-form) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:694 <textarea> "Your message" | resize: vertical | removed by the skeleton (page-contact); sgs/form-field-textarea (contact-form) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:754 <input> "Email" | appearance:  | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:758 <label> | cursor: pointer | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:759 <input> | appearance:  | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:759 <input> | accent-color: #141414 | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:763 <input> "Choose a password (8 characters or more)" | appearance:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:798 <label> | cursor: pointer | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:801 <input> | appearance:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:866 <input> | appearance:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:868 <input> | appearance:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:870 <label> "Keep me signed in" | cursor: pointer | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:871 <input> | appearance:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:871 <input> | accent-color: #141414 | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:879 <input> | appearance:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:881 <input> | appearance:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:891 <input> | appearance:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:910 <input> | appearance:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:912 <input> | appearance:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1105 <input> | appearance:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1107 <input> | appearance:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1112 <input> | appearance:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1114 <input> | appearance:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1116 <input> | appearance:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1403 <label> | cursor: pointer | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1407 <input> | appearance:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:38 <div> | pointer-events: none | removed by the skeleton (scroll-progress-bar) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:47 <button> | cursor: pointer | sgs/nav-bar-menu (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:59 <button> "Open menu" .scp3 | cursor: pointer | sgs/container (absorbed into it) (sticky-header) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:64 <div> | pointer-events: none | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:65 <div> | pointer-events: auto | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:106 <div> | pointer-events: {{ backdropPE }} | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:109 <span> | pointer-events: none | sgs/decorative-image (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:110 <span> | pointer-events: none | sgs/decorative-image (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:111 <span> | pointer-events: none | removed by the skeleton (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:118 <button> "Close menu" .scp9 | cursor: pointer | sgs/container (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:125 <button> .scpa | cursor: pointer | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:142 <span> "{{ item.mobileFeature.tag }}" | pointer-events: none | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:174 <span> | pointer-events: none | sgs/nav-drawer-menu (absorbed into it) (mobile-tablet-drawer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:232 <span> | pointer-events: none | sgs/container (absorbed into it) (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:272 <button> "Previous testimonial" .scpq | cursor: pointer | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:283 <button> "Next testimonial" .scpq | cursor: pointer | removed by the skeleton (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:286 <button> "Show testimonial" | cursor: pointer | inside an element the skeleton removes (page-home) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:318 <span> | pointer-events: none | removed by the skeleton (page-our-story); no block (outside the skeleton root) (page-certifications, page-community, page-sustainability, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:319 <span> | pointer-events: none | sgs/decorative-image (page-our-story); no block (outside the skeleton root) (page-certifications, page-community, page-sustainability, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:321 <div> | pointer-events: none | removed by the skeleton (page-about) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:368 <span> | pointer-events: none | sgs/container (absorbed into it) (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:369 <span> | pointer-events: none | sgs/container (absorbed into it) (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:370 <span> | pointer-events: none | sgs/container (absorbed into it) (page-food-service); no block (outside the skeleton root) (page-manufacturing, page-retail, page-wholesale) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:410 <div> .scpw | cursor: {{ r.cursor }} | sgs/container (absorbed into it) (page-certifications); no block (outside the skeleton root) (page-sustainability, page-careers, page-food-service, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:418 <button> "{{ r.cta }}" | cursor: pointer | no block (outside the skeleton root) (page-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:432 <button> "Apply for this role {{ arrowIcon }}" .scpy | cursor: pointer | sgs/container (absorbed into it) (page-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:485 <div> | pointer-events: var(--cpe,auto) | sgs/container (absorbed into it) (page-about); no block (outside the skeleton root) (page-certifications, page-community, page-careers, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:495 <span> .scp11 | pointer-events: none (on after) | no block (outside the skeleton root) (page-brand-sanam, page-brand-shan, page-brand-green-leaf, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:497 <span> | pointer-events: none | no block (outside the skeleton root) (page-brand-sanam, page-brand-shan, page-brand-green-leaf, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:516 <span> | pointer-events: none | sgs/decorative-image (page-about); no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:517 <span> | pointer-events: none | sgs/decorative-image (page-about); no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:518 <span> | pointer-events: none | removed by the skeleton (page-about); no block (outside the skeleton root) (page-our-story, page-certifications, page-community, …) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:548 <button> "Send another" | cursor: pointer | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:560 <input> .scp18 | appearance:  | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/container (absorbed into it) (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:560 <input> .scp18 | outline: none | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/container (absorbed into it) (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:562 <select> .scp19 | outline: none | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/container (absorbed into it) (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:566 <textarea> .scp18 | outline: none | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/form-field-textarea (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:566 <textarea> .scp18 | resize: vertical | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/form-field-textarea (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:568 <input> | appearance:  | sgs/form (absorbed into it) (page-careers); sgs/form-field-file (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:569 <label> "I agree to Indus Foods contacting me ab…" | cursor: pointer | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-careers, inline-form-catalogue) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:570 <input> | appearance:  | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/form-field-consent (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:570 <input> | accent-color: #0A7EA8 | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/form-field-consent (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:571 <button> "{{ b.submit }} {{ arrowIcon }}" | cursor: pointer | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/button (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:573 <span> | pointer-events: none | sgs/decorative-image (page-careers); no block (outside the skeleton root) (page-catalogue) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:595 <button> "{{ q.q }}" .scp17 | cursor: pointer | sgs/container (absorbed into it) (page-delivery); no block (outside the skeleton root) (page-faqs) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:603 <button> "{{ ch.label }}" .scp1a | cursor: pointer | inside an element the skeleton removes (page-blog) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:655 <span> | pointer-events: none | removed by the skeleton (footer) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:726 <button> "Back to top" .scp1j | cursor: pointer | sgs/container (footer) |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1381:25), styling Indus Foods Website v2:106 <div>; TradeApplication:79 <div>; TradeApplication:85 <button> "{{ nextLabel }} {{ arrow }}" .scp1p | pointer-events: none | sgs/form (absorbed into it) (page-apply); sgs/container (trade-account-application); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | Indus Foods Website v2.dc.html | a value in the draft's code (Indus Foods Website v2:js:1394:23), styling Indus Foods Website v2:106 <div>; TradeApplication:79 <div>; TradeApplication:85 <button> "{{ nextLabel }} {{ arrow }}" .scp1p | pointer-events: none | sgs/form (absorbed into it) (page-apply); sgs/container (trade-account-application); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:18 <button> | cursor: {{ st.cursor }} | sgs/form (absorbed into it) (page-apply); inside an element the skeleton removes (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:39 <input> .scp1l | appearance:  | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:39 <input> .scp1l | outline: none | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:41 <select> .scp1l | outline: none | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:41 <select> .scp1l | cursor: pointer | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:45 <textarea> | outline: none | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:45 <textarea> | resize: vertical | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:49 <button> "{{ c.label }}" .scp1m | cursor: pointer | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:53 <button> | cursor: pointer | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:57 <label> | cursor: pointer | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:62 <input> | appearance:  | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:62 <input> | pointer-events: none | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:73 <button> "Edit" | cursor: pointer | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:81 <button> "Back" | cursor: pointer | not in any proposed skeleton |
| indus-foods | TradeApplication.dc.html | TradeApplication:85 <button> "{{ nextLabel }} {{ arrow }}" .scp1p | cursor: pointer | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:88 <button> | cursor: {{ L.ckCursor }} | sgs/container (page-apply); removed by the skeleton (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:118 <button> "Start a new application" | cursor: pointer | not in any proposed skeleton |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:13 <button> .scp1l | cursor: pointer | sgs/form (absorbed into it) (page-contact); sgs/form-field-tiles (absorbed into it) (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:26 <input> .scp1m | appearance:  | sgs/form (absorbed into it) (page-contact); sgs/container (absorbed into it) (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:26 <input> .scp1m | outline: none | sgs/form (absorbed into it) (page-contact); sgs/container (absorbed into it) (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:27 <label> "{{ f.label }}" | pointer-events: none | sgs/form (absorbed into it) (page-contact); sgs/container (absorbed into it) (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:31 <textarea> .scp1m | outline: none | sgs/form (absorbed into it) (page-contact); sgs/form-field-textarea (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:31 <textarea> .scp1m | resize: vertical | sgs/form (absorbed into it) (page-contact); sgs/form-field-textarea (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:32 <label> "How can we help?" | pointer-events: none | sgs/form (absorbed into it) (page-contact); removed by the skeleton (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:39 <button> "{{ p.label }}" | cursor: pointer | sgs/form (absorbed into it) (page-contact); sgs/container (absorbed into it) (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:42 <button> "{{ sendLabel }} {{ arrow }}" .scp1n | cursor: pointer | sgs/form (absorbed into it) (page-contact); sgs/button (contact-enquiry) |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:48 <button> "Send another message" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Home.dc.html | a stylesheet rule (Home:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Home.dc.html | a stylesheet rule (Home:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Home.dc.html | Home:74 <button> "{{ o.name }}" .scp8 | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:80 <button> "{{ o.name }}" .scp8 | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:87 <button> "{{ o.name }}" .scp8 | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:94 <button> .scp8 | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:108 <button> | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:118 <button> "{{ f.label }}" | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:119 <button> | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:122 <button> "{{ addLabel }}" .scp0.scp1 | cursor: pointer | sgs/choice-flow (absorbed into it) (page-home-dc-html, build-your-zookie) |
| mamas-munches-redesign | Home.dc.html | Home:132 <div> | cursor: {{ L.grab }} | woocommerce/product-collection (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:148 <button> "Go to gift 1" | cursor: pointer | inside an element the skeleton removes (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:150 <button> "Previous gift" | cursor: pointer | sgs/button (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:151 <button> "Next gift" | cursor: pointer | sgs/button (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:220 <button> "Previous review" .scpc | cursor: pointer | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:221 <button> "Next review" .scpc | cursor: pointer | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:222 <div> | cursor: grab | sgs/trustpilot-reviews (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:235 <button> "Go to review 1" | cursor: pointer | sgs/container (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | Home.dc.html | Home:246 <button> "{{ f.q }}" | cursor: pointer | sgs/accordion (absorbed into it) (page-home-dc-html) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:17 <button> "Open menu" .scpe | cursor: pointer | inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:28 <button> "Open basket" .scpe | cursor: pointer | sgs/cart (site-header-announcement-strip-bar) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:49 <button> .scpc | cursor: pointer | sgs/cart (site-header-announcement-strip-bar) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:55 <div> | pointer-events: {{ scrimPe }} | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:59 <button> "Close menu" .scpe | cursor: pointer | sgs/container (absorbed into it) (nav-drawer-left) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:132 <button> "Close basket" .scpe | cursor: pointer | sgs/cart (absorbed into it) (basket-drawer-right) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:146 <button> "One fewer" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:148 <button> "One more" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:151 <button> "Remove" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:153 <label> | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:154 <input> | appearance:  | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:154 <input> | accent-color: #EE8088 | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:159 <textarea> "Congratulations, mama! Thinking of you…" | resize: vertical | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:167 <button> "Add" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:180 <button> "Add a Taster Trio · £5" .scpl | cursor: pointer | sgs/cart (absorbed into it) (basket-drawer-right) |
| mamas-munches-redesign | Shop.dc.html | a stylesheet rule (Shop:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Shop.dc.html | a stylesheet rule (Shop:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Shop.dc.html | Shop:17 <select> | cursor: pointer | sgs/container (absorbed into it) (page-shop-dc-html) |
| mamas-munches-redesign | Shop.dc.html | Shop:23 <button> "{{ c.label }}" .scp0 | cursor: pointer | woocommerce/product-filters (absorbed into it) (page-shop-dc-html); inside an element the skeleton removes (shop-filter-sort) |
| mamas-munches-redesign | ProductCard.dc.html | ProductCard:11 <button> "{{ btnLabel }}" .scp6.scp7 | cursor: pointer | woocommerce/product-collection (absorbed into it) (page-shop-dc-html, page-product-dc-html-id-zookies, page-gifts-dc-html) |
| mamas-munches-redesign | Product.dc.html | a stylesheet rule (Product:4), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Product.dc.html | a stylesheet rule (Product:4), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Product.dc.html | Product:23 <button> "Photo 1" .scp0 | cursor: pointer | sgs/multi-button (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:37 <button> .scp0 | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:47 <button> "{{ o.name }}" .scp0 | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:53 <button> "{{ o.name }}" .scp0 | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:60 <button> "{{ o.name }}" .scp0 | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:64 <button> | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:74 <button> "{{ f.label }}" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:75 <button> | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:83 <button> "{{ o.label }}" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:94 <label> | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-gift-note) |
| mamas-munches-redesign | Product.dc.html | Product:95 <input> | appearance:  | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-gift-note) |
| mamas-munches-redesign | Product.dc.html | Product:95 <input> | accent-color: #EE8088 | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-gift-note) |
| mamas-munches-redesign | Product.dc.html | Product:100 <textarea> "Congratulations, mama!" | resize: vertical | removed by the skeleton (product-gift-note) |
| mamas-munches-redesign | Product.dc.html | Product:105 <button> "One fewer" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:107 <button> "One more" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:108 <button> "{{ addLabel }}" .scp1.scp2 | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-buy-box) |
| mamas-munches-redesign | Product.dc.html | Product:119 <button> "{{ a.t }}" | cursor: pointer | sgs/container (absorbed into it) (page-product-dc-html-id-zookies) |
| mamas-munches-redesign | Product.dc.html | Product:145 <button> "{{ barLabel }}" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | a stylesheet rule (Basket:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Basket.dc.html | a stylesheet rule (Basket:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Basket.dc.html | Basket:20 <button> "Add a Taster Trio · £5" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:36 <button> "One fewer" | cursor: pointer | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:38 <button> "One more" | cursor: pointer | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:39 <button> "Remove" | cursor: pointer | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:42 <label> | cursor: pointer | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:43 <input> | appearance:  | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:43 <input> | accent-color: #EE8088 | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:48 <textarea> "Congratulations, mama!" | resize: vertical | removed by the skeleton (basket-gift-note-upsell) |
| mamas-munches-redesign | Basket.dc.html | Basket:55 <button> "Add" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Basket.dc.html | Basket:69 <button> "Apple Pay" | cursor: pointer | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Basket.dc.html | Basket:70 <button> "Google Pay" | cursor: pointer | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Checkout.dc.html | a stylesheet rule (Checkout:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Checkout.dc.html | a stylesheet rule (Checkout:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:19 <button> | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:36 <button> "Apple Pay" | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:37 <button> "Google Pay" | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:38 <button> "PayPal" | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:53 <input> "you@example.com" | appearance:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:55 <input> | appearance:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:58 <label> | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:59 <input> | appearance:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:59 <input> | accent-color: #EE8088 | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:70 <input> "At least 8 characters" | appearance:  | not in any proposed skeleton |
| mamas-munches-redesign | Checkout.dc.html | Checkout:74 <button> "Send to my address" | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:76 <button> "Send to someone else" | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:82 <textarea> "Congratulations, mama!" | resize: vertical | not in any proposed skeleton |
| mamas-munches-redesign | Checkout.dc.html | Checkout:90 <button> "Find address" | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:100 <button> | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:117 <button> "Pay {{ totalText }}" .scp0.scp1 | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:133 <button> "Apply" | cursor: pointer | core/post-content (absorbed into it) (page-checkout-dc-html) |
| mamas-munches-redesign | Confirmation.dc.html | a stylesheet rule (Confirmation:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Confirmation.dc.html | a stylesheet rule (Confirmation:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Account.dc.html | a stylesheet rule (Account:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Account.dc.html | a stylesheet rule (Account:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Account.dc.html | Account:29 <button> "{{ t.label }}" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:31 <button> "Sign out" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:48 <button> "View order →" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:53 <button> "← All orders" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:89 <button> "{{ againLabel }}" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:117 <button> "Undo" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:123 <button> "{{ f.label }}" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:126 <button> "Skip next delivery" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:127 <button> "{{ s.pauseLabel }}" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:128 <button> "Cancel subscription" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:134 <button> "Keep it" | cursor: pointer | removed by the skeleton (cancel-subscription-confirm) |
| mamas-munches-redesign | Account.dc.html | Account:135 <button> "Yes, cancel" | cursor: pointer | removed by the skeleton (cancel-subscription-confirm) |
| mamas-munches-redesign | Account.dc.html | Account:137 <button> "Restart subscription" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:154 <button> "Edit" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:156 <button> "Make default" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:157 <button> "Remove" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:158 <button> "Add an address" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:177 <button> "Save address" .scp0.scp5 | cursor: pointer | sgs/account (absorbed into it) (address-form-add-edit) |
| mamas-munches-redesign | Account.dc.html | Account:178 <button> "Cancel" | cursor: pointer | sgs/account (absorbed into it) (address-form-add-edit) |
| mamas-munches-redesign | Account.dc.html | Account:188 <input> | appearance:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:190 <input> | appearance:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:191 <label> "Email me about new flavours and bake da…" | cursor: pointer | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:192 <input> | appearance:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:192 <input> | accent-color: #EE8088 | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:196 <button> "Save changes" .scp0.scp5 | cursor: pointer | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:203 <input> | appearance:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:205 <input> "At least 8 characters" | appearance:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:209 <button> "Update password" .scp1 | cursor: pointer | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | SignIn.dc.html | a stylesheet rule (SignIn:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | SignIn.dc.html | a stylesheet rule (SignIn:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:21 <button> "Sign out" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:24 <button> "Sign in" .scp2 | cursor: pointer | sgs/account (absorbed into it) (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:25 <button> "Create account" .scp2 | cursor: pointer | sgs/account (absorbed into it) (page-signin-dc-html) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:29 <input> | appearance:  | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:33 <input> | appearance:  | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:37 <button> "Sign in →" .scp0.scp3 | cursor: pointer | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:38 <button> "Forgotten your password?" | cursor: pointer | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:49 <input> | appearance:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:53 <input> "At least 8 characters" | appearance:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:56 <label> "Email me about new flavours and bake da…" | cursor: pointer | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:57 <input> | appearance:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:57 <input> | accent-color: #EE8088 | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:58 <button> "Create account →" .scp0.scp3 | cursor: pointer | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:61 <button> "← Back to sign in" | cursor: pointer | sgs/account (absorbed into it) (forgotten-password-flow) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:65 <input> | appearance:  | sgs/account (absorbed into it) (forgotten-password-flow) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:68 <button> "Send reset link" .scp0.scp3 | cursor: pointer | sgs/account (absorbed into it) (forgotten-password-flow) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:75 <button> "Open the reset link (prototype)" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:76 <button> "Didn’t get it? Try again" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:81 <input> "At least 8 characters" | appearance:  | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:85 <input> | appearance:  | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:88 <button> "Save new password" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:94 <button> "Sign in →" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | a stylesheet rule (Contact:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Contact.dc.html | a stylesheet rule (Contact:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Contact.dc.html | Contact:50 <button> "{{ o.name }}" .scp2 | cursor: pointer | sgs/form (absorbed into it) (page-contact-dc-html); sgs/form-field-tiles (absorbed into it) (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:55 <input> | appearance:  | sgs/form (absorbed into it) (page-contact-dc-html); sgs/form-field-email (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:64 <input> | appearance:  | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | Contact:66 <textarea> | resize: vertical | sgs/form (absorbed into it) (page-contact-dc-html); sgs/form-field-textarea (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:67 <button> "Send message →" .scp3.scp4 | cursor: pointer | sgs/form (absorbed into it) (page-contact-dc-html); sgs/button (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:73 <button> "Send another" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Gifts.dc.html | a stylesheet rule (Gifts:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Gifts.dc.html | a stylesheet rule (Gifts:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:19 <button> "{{ o.name }}" .scp0 | cursor: pointer | sgs/option-picker (absorbed into it) (page-gifts-dc-html); inside an element the skeleton removes (gift-finder) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:23 <button> "{{ o.name }}" .scp0 | cursor: pointer | sgs/option-picker (absorbed into it) (page-gifts-dc-html); inside an element the skeleton removes (gift-finder) |
| mamas-munches-redesign | Gifts.dc.html | Gifts:43 <button> "Show every budget" | cursor: pointer | not in any proposed skeleton |
| mamas-munches-redesign | Gifts.dc.html | Gifts:63 <textarea> "Congratulations, mama! One for the 3am …" | resize: vertical | sgs/form-field-textarea (page-gifts-dc-html) |
| mamas-munches-redesign | Help.dc.html | a stylesheet rule (Help:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline: 3px solid #3A2A22 | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Help.dc.html | a stylesheet rule (Help:5), styling SiteHeader:13 <header>; SiteHeader:15 <div>; SiteHeader:16 <div>; SiteHeader:17 <button> "Open menu" .scpe; SiteHeader:18 <span>; SiteHeader:19 <span>; and 999 more | `:focus-visible` outline-offset: 3px | sgs/site-header (site-header-announcement-strip-bar); sgs/site-header-row (site-header-announcement-strip-bar); removed by the skeleton (site-header-announcement-strip-bar); inside an element the skeleton removes (site-header-announcement-strip-bar) |
| mamas-munches-redesign | Help.dc.html | Help:21 <button> "{{ c.name }}" .scp0 | cursor: pointer | sgs/option-picker (absorbed into it) (page-help-dc-html) |
| mamas-munches-redesign | Help.dc.html | Help:27 <button> | cursor: pointer | sgs/container (absorbed into it) (page-help-dc-html) |

## writing modes (`css-group:writing-modes`): 49

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:300 <input> "Maximum price" | direction:  | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:310 <input> | direction:  | sgs/container (absorbed into it) (page-shop); woocommerce/product-filters (absorbed into it) (shop-filter-rail-drawer) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:685 <input> "Email" | direction:  | removed by the skeleton (page-contact); sgs/form-field-email (contact-form) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:754 <input> "Email" | direction:  | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:759 <input> | direction:  | core/post-content (absorbed into it) (page-checkout) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:763 <input> "Choose a password (8 characters or more)" | direction:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:801 <input> | direction:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:866 <input> | direction:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:868 <input> | direction:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:871 <input> | direction:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:879 <input> | direction:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:881 <input> | direction:  | sgs/account (absorbed into it) (page-signin, sign-in-and-register-forms) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:891 <input> | direction:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:910 <input> | direction:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:912 <input> | direction:  | not in any proposed skeleton |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1105 <input> | direction:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1107 <input> | direction:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1112 <input> | direction:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1114 <input> | direction:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1116 <input> | direction:  | sgs/account (absorbed into it) (account-details) |
| eye-care-ward-end | Eye Care Birmingham.dc.html | Eye Care Birmingham:1407 <input> | direction:  | not in any proposed skeleton |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:560 <input> .scp18 | direction:  | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/container (absorbed into it) (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:568 <input> | direction:  | sgs/form (absorbed into it) (page-careers); sgs/form-field-file (inline-form-careers) |
| indus-foods | Indus Foods Website v2.dc.html | Indus Foods Website v2:570 <input> | direction:  | sgs/form (absorbed into it) (page-careers); no block (outside the skeleton root) (page-catalogue, inline-form-catalogue); sgs/form-field-consent (inline-form-careers) |
| indus-foods | TradeApplication.dc.html | TradeApplication:39 <input> .scp1l | direction:  | sgs/form (absorbed into it) (page-apply); sgs/container (absorbed into it) (trade-account-application) |
| indus-foods | TradeApplication.dc.html | TradeApplication:62 <input> | direction:  | not in any proposed skeleton |
| indus-foods | EnquiryForm.dc.html | EnquiryForm:26 <input> .scp1m | direction:  | sgs/form (absorbed into it) (page-contact); sgs/container (absorbed into it) (contact-enquiry) |
| mamas-munches-redesign | SiteHeader.dc.html | SiteHeader:154 <input> | direction:  | not in any proposed skeleton |
| mamas-munches-redesign | Product.dc.html | Product:95 <input> | direction:  | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-gift-note) |
| mamas-munches-redesign | Basket.dc.html | Basket:43 <input> | direction:  | core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:53 <input> "you@example.com" | direction:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:55 <input> | direction:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:59 <input> | direction:  | core/post-content (absorbed into it) (page-checkout-dc-html, checkout-form) |
| mamas-munches-redesign | Checkout.dc.html | Checkout:70 <input> "At least 8 characters" | direction:  | not in any proposed skeleton |
| mamas-munches-redesign | Account.dc.html | Account:188 <input> | direction:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:190 <input> | direction:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:192 <input> | direction:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:203 <input> | direction:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | Account.dc.html | Account:205 <input> "At least 8 characters" | direction:  | sgs/account (absorbed into it) (account-details-change-password) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:29 <input> | direction:  | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:33 <input> | direction:  | sgs/account (absorbed into it) (page-signin-dc-html, sign-in) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:49 <input> | direction:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:53 <input> "At least 8 characters" | direction:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:57 <input> | direction:  | sgs/account (absorbed into it) (create-account) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:65 <input> | direction:  | sgs/account (absorbed into it) (forgotten-password-flow) |
| mamas-munches-redesign | SignIn.dc.html | SignIn:81 <input> "At least 8 characters" | direction:  | not in any proposed skeleton |
| mamas-munches-redesign | SignIn.dc.html | SignIn:85 <input> | direction:  | not in any proposed skeleton |
| mamas-munches-redesign | Contact.dc.html | Contact:55 <input> | direction:  | sgs/form (absorbed into it) (page-contact-dc-html); sgs/form-field-email (contact-form) |
| mamas-munches-redesign | Contact.dc.html | Contact:64 <input> | direction:  | not in any proposed skeleton |

## ::selection (`css-pseudo-element:selection`): 2

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| eye-care-ward-end | Eye Care Birmingham.dc.html | a stylesheet rule (Eye Care Birmingham:3), styling Eye Care Birmingham:13 <header> .sgs-header; Eye Care Birmingham:14 <div>; Eye Care Birmingham:15 <nav>; Eye Care Birmingham:17 <button> "Menu"; Eye Care Birmingham:18 <span>; Eye Care Birmingham:19 <span>; and 934 more | `::selection` background:var(--acc,#9C8B78);color:#fff | sgs/site-header (header); sgs/site-header-row (header); sgs/nav-bar-menu (header); sgs/nav-bar-menu (absorbed into it) (header) |
| indus-foods | Indus Foods Website v2.dc.html | a stylesheet rule (Indus Foods Website v2:6), styling Indus Foods Website v2:38 <div>; Indus Foods Website v2:39 <header>; Indus Foods Website v2:40 <div>; Indus Foods Website v2:41 <div>; Indus Foods Website v2:42 <a> "Indus Foods home"; Indus Foods Website v2:43 <indus-logo> "Indus Foods Ltd"; and 640 more | `::selection` background:#D8CA50;color:#1E2A3C | removed by the skeleton (scroll-progress-bar); sgs/site-header (sticky-header); sgs/site-header-row (sticky-header); sgs/site-header-row (absorbed into it) (sticky-header); sgs/responsive-logo (sticky-header) |

## ::placeholder (`css-pseudo-element:placeholder`): 2

| Client | Draft file | Draft element (ID and what it is) | Declared as | Lands on (proposed skeleton block) |
|---|---|---|---|---|
| mamas-munches-redesign | Checkout.dc.html | a stylesheet rule (Checkout:5), styling Product:95 <input>; Product:100 <textarea> "Congratulations, mama!"; Gifts:61 <input>; Gifts:63 <textarea> "Congratulations, mama! One for the 3am …"; Gifts:65 <input>; Basket:43 <input>; and 37 more | `input::placeholder,textarea::placeholder` color:#8A7666 | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-gift-note, gift-note-preview); sgs/form-field-text (page-gifts-dc-html); sgs/form-field-textarea (page-gifts-dc-html); core/post-content (absorbed into it) (page-basket-dc-html) |
| mamas-munches-redesign | Checkout.dc.html | a stylesheet rule (Checkout:5), styling Product:95 <input>; Product:100 <textarea> "Congratulations, mama!"; Gifts:61 <input>; Gifts:63 <textarea> "Congratulations, mama! One for the 3am …"; Gifts:65 <input>; Basket:43 <input>; and 37 more | `input::placeholder,textarea::placeholder` color:#8A7666 | sgs/container (absorbed into it) (page-product-dc-html-id-zookies); removed by the skeleton (product-gift-note, gift-note-preview); sgs/form-field-text (page-gifts-dc-html); sgs/form-field-textarea (page-gifts-dc-html); core/post-content (absorbed into it) (page-basket-dc-html) |

