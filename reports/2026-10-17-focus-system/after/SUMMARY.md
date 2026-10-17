# Focus system: live verification, first deployed run

Canary sandybrown at commit 97935b6ee (blocks and theme, deployed 2026-10-17 09:42 UK). All runs serial, read-only, headless; no 403. Evidence files sit beside this summary (main.json, fixture-5389.json, fixture-forced.json, fixture-reduced.json, page-5310.json, page-5287.json, page-1592.json, home-open-drawer.json, editor.txt, step1-tokens.txt and the live-*.txt files).

## Acceptance (plan section 1)

| Criterion | Result | Measured |
|---|---|---|
| One look | FAIL | home, shop and product: looks 2 (+ inset); cart 1; fixture 2 (+ inset, signature). Token match 478/478 (main) and 278/278 (fixture) |
| Indicator forms at most 6 | PASS | `distinct indicator forms: 5 (system 5)` |
| 3:1 core on light, dark and photo | FAIL | raw minimum 1.00; dark stops 14.6 to 16.0, photo forms 4.2 to 6.7 pass; tinted light bands fail (F2) |
| Forced colours | FAIL, 93 of 94 | the before-after range input (F5); box-shadow is none on all 94 stops |
| Reduced motion | PASS | signature `sgs-focus-spin` normally, `none` under reduced motion |
| axe, no new violations | PASS | fixture 20 nodes (was 22), home 2 (2), shop 17 (17), product 1 + 8 (1 + 8), cart none (none) |
| CSS bytes not above before | PASS | home 844,132 (856,650), shop 818,466 (831,542), product 855,864 (870,147), cart 906,229 (918,067), fixture 821,702 (825,930) |
| Radius unchanged on focus | one stop | changes fell from 526 to 11, all the skip link (F7) |
| Clipped 0 | FAIL | 6 clipped stops, all on /shop/ at 1440 (F3) |

## Token delivery

`--wp--custom--focus--ring` #a68a23, `--ring-on-dark`, `--near` and `--far` #f5d050, `--inner` #fbf3dc, `--ink` #3a2e26, `--width` 2px; `--sgs-focus-ring` #a68a23. The snapshot's camelCase key `ringOnDark` became `ring-on-dark`. `focus.css` is a synchronous `<link media=all>` in the head.

## Proven defects

- F1: an `sgs-focus--inset` ancestor leaks `--sgs-focus-offset` and `--sgs-focus-halo` to focus descendants because they inherit (a swatch inside an inset product card computes offset -2px and the inset halo). Fix in `focus.css`.
- F2: the ring #a68a23 is 3.02 on the cream page ground and 3.34 on white but 2.14 on the pink hero band, 2.03 behind the product category link and 1.77 behind the Trustpilot links; `check-snapshot-focus-tokens.py --check` tests only the page surface and white.
- F3: `woocommerce.css::.sgs-shop-filters__scroll` has `overflow-x: hidden`, which cuts the price slider's minimum-thumb ring flat (4px lost); the five other clipped stops sit in the same container.
- F4: on a title-link card the ring is hidden over the photo because `a.product-card__img-link` is `position: relative; z-index: 2` and paints above the card's outline.
- F5: `input.wp-block-sgs-before-after__range.sgs-focus-source` has no proxy (proxyCount 0), its own outline is 0px none, so a keyboard user sees nothing, in forced colours too.
- F6: `a.sgs-responsive-logo__link` has `opacity: 0.85`, so the outline blends to (178,153,62) and scores 2.52 on the header.
- F7: `wc-blocks.css :: .screen-reader-text:focus { border-radius: 3px }` (third party) changes the skip link's radius on focus.

## Probe artefacts

- A1: for hidden-source stops the probe measures the 1x1 or 16x16 input box, not the proxy that paints (home 10, product 12, fixture 69 score 1.00 for this reason).
- A2: neighbour sampling and settle time: the same stop gives different values between runs (testimonial arrow 1.15 then 2.38; fixture Core-styled 2.25 then 1.00); screenshots after a 1.2 s settle show clean rings.
- A3: the fixture stacks its buttons with no gap so a neighbour overpaints the lower ring (fixture stops 12 and 16).

## Open, not diagnosed

Accordion first question (fixture 25, 47, 70) and tabs panel (fixture 28, 50, 73): ring pixel equals the outside pixel, element spans the section width, clip test false. Signature stop contrast 1.31. Inline text links 1.90 to 2.25. Drawer "Home page" link 1.00.

## Passes

Editor probe exit 0 (no stale glow on rich text; the preview checkbox present and working). Page 5310: the old glow, ring and accent stack is gone. Title-link card: the ring wraps the whole card (rect equal to the card's) with no second ring on the link. Option picker: radio 1x1 draws nothing, pill rings. Buybox add-to-cart: system outline, nothing stacks. Slider thumb: ring wraps the thumb (outer 31.75px around a 16px thumb).

## Not exercised

Gallery lightbox and dark-theme reviews widgets (published pages 5287 and 1592 expose no such focusable stop), mega menu (not present in the header), `indus-test` and `eye-care-test`.
