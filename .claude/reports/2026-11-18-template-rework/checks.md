# Tick box look and shop-filter checkbox list: before and after on Indus and Eye Care (2026-11-18)

Measured on scratch copies of `local-indus` and `local-eye-care` (dropped afterwards), old build against new. Old is the build both mirrors hold, whose theme and plugin PHP are byte-identical to `419b4cb6a` (what `indus-test` and `eye-care-test` run). New is `main` at `b14b92d67` with the gated build of `ac99e4529`. The tick box commit is `be2ebc588`. Scripts, per-element JSON and crop pairs: `E:\sgs-tmp\template-rework\checks\` (`capture.mjs`, `compare.py`, `check2.mjs`, `indus-compare.md`, `eye-compare.md`, `eye-compare2.md`, `evidence\`). The main session looked at the two pairs marked "seen".

## Limits

- `local-eye-care` copies `eye-care-clone-test`, not the signed-off `eye-care-test`; no local copy of `eye-care-test` exists. The Eye Care results show how the two builds treat the same markup and palette; the live site's public pages were read and serve the same tick-box markup and Customizer values, but its own content was not rendered under the new build.
- Old and new are 226 commits apart, so a difference that is not about tick boxes may come from any of them.

## Indus (no shop; ticks on catalogue and careers only)

- Intended: the box goes from 18px to 22px, gap 12px to 10px.
- Collateral: the ticked fill changes from the form's own blue `rgb(10,126,168)` to the palette's gold `accent` `rgb(216,202,80)`, and its contrast on the white field falls from 4.6:1 to 1.68:1 (the floor for a control is 3:1). The careers page grows 2px at 768 and 1440; the catalogue's consent text moves 9px left.
- Not about tick boxes: the About hero's road illustration turns from navy to gold at 1440 (seen: `evidence\indus-about-1440-150-old-left-new-right.png`). Cause not traced.

## Eye Care (the clone site's content)

- Account sign-in, "Remember me": the label becomes an inline flex row 136px wide instead of 430px, so the "Log in" button jumps up beside it and the page is 52 to 55px shorter at every width (seen: `evidence\eye-my-account-1440-old-left-new-right.png`).
- Checkout, "create an account": the box grows from 13px to 22px and touches its text, because that label is not a flex row and the gap does not apply; the row is 4 to 6px taller.
- Shop filter checkbox list: the drawn 18px box becomes the native 22px box (intended). Ticked, the tan accent on the grey filter panel is 2.33:1.
- Comment form cookie tick: 13 by 15px to 22 by 22px. Acceptable.
- Not about tick boxes: the product cards' "View product" buttons sit up to 182px lower at 1440. Cause not traced.
- Identical: home at 375 and 1440, contact, basket, search, product at 375 and 1440, the four signed-in account views.

## The shop-filter checkbox-list rules, proved in a browser

| Rule | Result |
|---|---|
| `theme/sgs-theme/assets/css/woocommerce.css`: `.sgs-shop-filters.sgs-shop-filters .wc-block-product-filter-checkbox-list input[type=checkbox]` | Works: matches the 16 inputs and makes them the native box |
| The same rule's second selector, `.wc-block-components-checkbox input` | Matches nothing on a shop page (it is the block checkout's markup) |
| `.sgs-shop-filters .wc-block-product-filter-checkbox-list__mark { display: none }` | Fails when ticked: WooCommerce's `input:checked + __mark { display: block }` wins, so a ticked box shows the native tick and WooCommerce's drawn tick together |
| `theme/sgs-theme/assets/css/choice-controls.css`: the 22px `min-height` on the list input | Fights the Customizer: with Eye Care's saved `sgs_shop_filter_box_size` of 16 the box renders 16px wide and 22px tall |
| The list label row (`gap: 0.625rem`, `min-height: 44px`) | Works |
| The block-checkout gap, mark and input rules in `choice-controls.css` | Match nothing on Eye Care; unproven there |

Also: `be2ebc588` removed the theme mod `sgs_shop_filter_box_border`, so Eye Care's saved 1px box border now does nothing.

## What a check like this costs

Scratch copy 27 to 56 s; build sync 16 to 25 s; capture 4.6 to 5.8 s per page and width (42 page-widths in 195 to 245 s); compare 15 s. A page with animation needs a settle wait, and the same build captured twice differs by 0.1 to 3% of pixels on animated sections.
