# i13: Eye Care product cards and homepage brand strip

Read-only throughout. Three page loads of the homepage (one measurement, one rule and brand-strip pass, one simulation) and wp-cli reads. Nothing saved on eye-care-test. Scripts, JSON and screenshots are in `E:\sgs-tmp\general-cloning\investigate\i13-eyecare\`.

## Answer in brief

- Neither fault shares the i9 card-grid cause. They are two separate block faults; both would hit any site that sets the same options, and `main` has both.
- Product cards: PROVEN. The "Photo to come" box has a fixed 220px height that ignores the photo's Ratio setting (1 / 1), so it is 220px tall while photo boxes are as tall as they are wide (318.5px at 1440).
- Brand strip: PROVEN for COACH, GUCCI and PRADA (and any logo whose file has resized copies). The block tells the browser each logo is at most 22px wide, because it treats the "Max height" setting (22) as a width cap, so the browser makes those logos 22px wide. PROVEN, a different cause, for BALENCIAGA and the short wide logos: the file carries blank space, or the Max height cap and the files' small natural size hold them small.
- Plugin version on the site: commit `cf6ca94e5` (deployed 22 Nov 2026, from `~/.sgs-deploy-marker-eye-care-test.json`; plugin header 0.1.1). Both causes were introduced before that commit and nothing in the files involved has changed on `main` since (`git diff cf6ca94e5 main` on `includes/media`, `brand-strip`, `product-card/style.css`, `product-card-media.php` shows only lint and editor JS churn in `brand-strip/*.js`).

## 1. Product cards: the "photo to come" box is shorter

The homepage holds 8 `sgs/product-card` blocks (page 208), 4 with no photo, 4 with a photo; the shop archive template (post 438, "Product Archive") uses the same block with the same `imageRatio: 1 / 1`, so it is the same fault there (I did not load /shop/ to keep page loads few: UNPROVEN on that page by measurement, PROVEN by identical settings and code).

Measured (photo box = `.product-card__media`; `.product-card__no-image` is the placeholder):

| Viewport | Card width | Photo card: media box | No-photo card: media box and placeholder | Card heights |
|---|---|---|---|---|
| 1440 | 320.5 | 318.5 x 318.5 | 318.5 x 220 / 318.5 x 220 | 415.5 to 419.75 |
| 768 | 323 | 321 x 321 | 321 x 220 / 321 x 220 | 321 to 422 (cards differ) |
| 375 | 162.5 | 160.5 x 160.5 | 160.5 x 220 / 160.5 x 220 | 323 to 370 |

At 375 the placeholder is taller than the photo (220 against 160.5), at 768 and 1440 it is shorter. Computed styles:
- Photo `<img>`: `aspect-ratio: 1 / 1; height: 318.5px; padding: 0; object-fit: cover` (rule `.sgs-pc-5-image { aspect-ratio: 1 / 1; width: 100% }`, printed by the media renderer from the block's Ratio setting).
- Placeholder: `height: 220px; aspect-ratio: auto; padding: 0; display: flex`.
- Photo card media box: `height: auto` from `.product-card--image-sized .product-card__media` (the class the card gets when its photo slot has a Ratio or a Height).

Cause in code. PROVEN (rule list read from the live stylesheets, then the fix simulated):
- `plugins/sgs-blocks/src/blocks/product-card/style.css`, rule `.product-card--live .product-card__no-image { height: var(--sgs-product-card-image-height, 220px); ... }`. It was written on 4 Jun 2026 (`c1f3b1c25`) when every card's photo box was the fixed 220px, so "same height as the photo" was true.
- On 11 Nov (`27fec34bb`, product card photos moved onto the shared media renderer) a Ratio or Height on the photo slot started to size the photo itself (`.product-card--image-sized`, `product-card/render.php::sgs_pcm_sized`; `includes/product-card-media.php::sgs_pcm_fill_ratio_css` handles the Fill case for the box). Every other box was changed to follow the photo (`.product-card--image-sized .product-card__media { height: auto }`), the no-photo placeholder was not. The placeholder keeps 220px, and being the only child it makes the media box 220px.
- It is not the i9 cause: the media renderer does not print on the placeholder at all (it is plain markup from `includes/product-card-no-photo.php::sgs_product_card_no_photo_markup`), and the photo cards are right. No duplicated padding or height.

Fix that leaves photo cards untouched. Simulated in the live page (never saved): `.product-card--image-sized .product-card__no-image { height: auto; aspect-ratio: 1 / 1 }`. After, at 1440, 768 and 375 all 8 media boxes equal 318.5, 321 and 160.5 square; the 4 photo cards are byte-identical (`cards-after-1440.png`, `cards-after-768.png`, `cards-after-375.png`; before in `cards-1440.png` and the others).

The production version of that fix: the ratio comes from the block's setting, not a fixed `1 / 1`. In `product-card/render.php`, next to `$sgs_pc_box_ratio_css`, print for the card's scope class `.{uid} .product-card__no-image { aspect-ratio: <image Ratio per device>; height: auto }` using `sgs_media_device_values( $attributes['imageRatio'] )` and `sgs_media_ratio()` (the same helpers `sgs_pcm_fill_ratio` uses, but for any Ratio, not only where Height is Fill). Where the slot sets only a px Height (no Ratio), print `height: <that px>` instead. A card with no Ratio or Height keeps the existing 220px rule (`:not(.product-card--image-sized)`), so no other site's output changes; this is a fix (placeholder renders wrong today) so it lands everywhere, and render-scope would list the pages that have a no-photo card with a Ratio or Height.

Block fault or site settings? Block fault. The site's settings (Ratio 1 / 1 on the photo) are valid; the block draws a placeholder that ignores them. Any site with a no-photo card and a photo Ratio or Height shows it.

Blocks sharing the cause: only `sgs/product-card`. `sgs-product-card-image-height` is read in 5 places, all in `product-card/style.css` plus `product-card-media.php` (which is the Fill case and correct). `sgs/buybox` has its own `.product-card__no-image` (fills its gallery box, `height: 100%`) and `sgs/card-grid` has its own no-image label inside a frame the card grid sizes: neither shows the fault.

## 2. Homepage brand strip: logos small, not filling the space

Block: `sgs/brand-strip` on page 208 (`source: product-brands`, 16 brands, `logoLayout: row`, `maxHeight: 22`, `logoMaxWidth: 120`, `tilePadding: 26px`, marquee). Item (slot) at every viewport: 174 x 44 (padding 0 26px, min-height 44); link 122 x 44; so each logo has a 122 x 44 area and 22px is used at most. Strip: 96px tall (26px padding top and bottom).

Measured at 1440 (identical at 768 and 375): image box, source file, ink (the non-white pixels, found by reading the file in a canvas):

| Logo | Box (w x h) | File natural | Ink in file | Why it is this size |
|---|---|---|---|---|
| Ray-Ban | 49.3 x 22 | 65 x 29 | 65 x 29 (all) | height cap 22 |
| GUCCI | 21.95 x 3.95 | 109 x 18 | 104 x 17 | `sizes` bug |
| Oakley | 60.7 x 22 | 80 x 29 | all | height cap 22 |
| PRADA | 21.95 x 4.17 | 106 x 19 | 104 x 17 | `sizes` bug |
| Versace | 80 x 19 | 80 x 19 | 78 x 17 | natural size, under the cap |
| BALENCIAGA | 49.3 x 22 | 65 x 29 | 61 x 7 (offset 2,12) | blank space in the file: the visible word is about 46 x 5 px |
| Dolce & Gabbana | 119.9 x 14.7 | 180 x 22 | 162 x 16 | width cap 120 |
| Michael Kors | 119.9 x 11.8 | 122 x 12 | all | width cap 120 (a 10:1 strip) |
| Carrera | 118 x 18 | 118 x 18 | all | natural size |
| COACH | 21.95 x 6.5 | 500 x 148 | all | `sizes` bug |

Cause of the three tiny ones. PROVEN (simulated; section below): their media files have resized copies (WordPress made `brand-logo-gucci-109x18.avif`, `-prada-100x19.avif`, `-coach-300x89.avif`), so the `<img>` carries a `srcset` with width descriptors. The block prints `sizes="(max-width:767.98px) min(22px, 50vw), (max-width:1023.98px) min(22px, 25vw), min(22px, 12.5vw)"` on every logo. With `srcset` and `sizes`, a browser treats the image's intrinsic width as the `sizes` value (22px). The row layout sets `width: auto`, so the image becomes 22px wide and its height follows the aspect ratio (Gucci 3.9px). Logos with no resized copy (Ray-Ban, Oakley, Versace, Balenciaga and the others) have no `srcset`, so they take their natural size and are only capped, which is why only some logos shrink.
- Source: `src/blocks/brand-strip/logo-media.php` passes `'item_cap' => $max_height` for every layout, and `includes/media/render-slot.php` (item_cap block) turns it into a max width for the `sizes` list. The comment there says "a brand strip's logo box is at most its Max height", true for the tile layout (a square box) but wrong for the row layout, where the box is `logoMaxWidth` wide (120) and `maxHeight` is only a height cap (`style.css`: `.sgs-brand-strip--layout-row .sgs-media-el { height:auto; width:auto; max-height: var(--sgs-logo-max-height); max-width: var(--sgs-logo-max-width) }`).
- Introduced 12 Nov by `acd4dd421` ("brand strip passes its Max height as an item cap"), after which it hid because only logos with resized copies are hit. It is in the 22 Nov deploy and in `main`.

Simulation A (page-local; nothing saved): set `sizes="120px"` on every logo (the real fix prints the 120px `logoMaxWidth` in the row layout). Result: Gucci 120 x 19.8, Prada 119.9 x 21.5, Coach 74.2 x 22; every other logo unchanged (`strip-after-A.png`). Before: 21.9 x 3.6, 22 x 4.2, 22 x 6.5.

Why the others are still small (not a bug, a design limit): the row layout uses a height cap of 22 inside a 44px slot, so the slot is never more than half filled, and wide short logos (Michael Kors 10:1, D&G 8:1, Carrera 6.5:1) are held by the 120px width cap to 12 to 18px of height. The files are also small (65 to 180px wide), so scaling them up blurs.

Fix that fills the slot evenly (UNPROVEN as a shipped feature; proven as a simulation): size each logo by a shared visual area rather than a fixed height. Simulation B (page-local): width = min(120, sqrt(3600 x aspect ratio), 44 x aspect ratio), height = width / ratio, applied on top of A. Result: Ray-Ban 89.8 x 40.1, Oakley 99.6 x 36.1, Versace 120 x 28.5, Polaroid 120 x 26.3, Coach 110.3 x 32.6, Superdry 115.5 x 31.2, D&G 120 x 14.7 (ratio-limited), Michael Kors 120 x 11.8, Gucci 120 x 19.8 (`strip-after-B.png`). Heights now run 12 to 40 instead of 4 to 22, and the box area is about 3600 px² for every logo that is not held by the 120px width cap (Ray-Ban, Oakley, Balenciaga, Coach, Superdry). In CSS this is `width: min(var(--sgs-logo-max-width), sqrt(var(--sgs-logo-area) * var(--ar)), calc(var(--sgs-logo-box-h) * var(--ar)))` with `--ar` (the file's ratio) printed per item by the media renderer's `{uid}-i{n}` rules (no inline `style`), and `--sgs-logo-area` and `--sgs-logo-box-h` new settings (off by default, so no site's logos change unless it opts in). `sqrt()` in `width` works in current Chrome, Safari and Firefox.

Remaining limits after B: BALENCIAGA stays small at 89.8 x 40 because its ink is 7px of a 29px-tall file (blank space built into the image): the word renders about 85 x 10. A CSS rule cannot remove that. Options: trim the blank margin from the file when it is added (a trim step on upload or on the logo field), or replace the file. Ray-Ban, Oakley, Balenciaga and Versace files are 65 to 80px wide, so at 90 to 120px they are upscaled 1.1 to 1.8x; replace them with 2x files for sharpness.

Block fault or site settings? Two parts. The `sizes` shrink is a block fault (any row-layout strip with a Max height smaller than the logos' natural width, and resized copies of the files, hits it on every site). The small look of the rest is partly this site's settings (`maxHeight` 22 in a 44px slot, `logoMaxWidth` 120, small source files) and the block's sizing model (a fixed cap, no shared-area option).

Blocks sharing the cause: `item_cap` is passed by `sgs/brand-strip` only (grep `item_cap` in `src` and `includes`: `brand-strip/logo-media.php` plus its readers in `includes/media/render-slot.php` and `layout-width.php`). Any block with a small `sizes` figure and `width: auto` would show the same collapse; the other users of `render-item-slot` and `SGS_Media_Element` item sets (`card-grid`, `gallery`, `timeline`, `trust-bar`) do not pass `item_cap`, so they are not hit by this route. Nine `sites/` build files contain a brand strip, so another client site with a row layout and resized copies is also affected; the render-scope tool lists which pages.

## 3. Checks that remain open

- /shop/ (post 438's template) was not loaded; the product-card finding for it rests on identical code and identical `imageRatio`.
- The editor canvas was not loaded (a second login and load would risk the host's bot challenge). The editor's no-photo box uses the same CSS but its markup differs, so the editor view is UNPROVEN.
- Simulation B is a prototype, not a shipped setting. Its constants (3600 area, 44 box height) are mine; a tuning pass with Bean's eye is needed (FP-13).

## Calls I made

- Used Playwright with `ignoreHTTPSErrors` from the repo's `scripts/computed-route` install; no login, front-end loads only.
- Judged the homepage's 8 cards representative of the shop cards, because the archive template carries the same `imageRatio`.
- Treated "very small" as COACH, GUCCI, PRADA only as the three that are tiny in the measurement (BALENCIAGA is normal sized by box but small by ink).
- Chose a 120 x 44 box for simulation B because that is the slot the block's own `logoMaxWidth` and the 44px touch-target floor give; not from a setting.
- Did not edit any file in the repo and did not write under C:.

Files: `E:\sgs-tmp\general-cloning\investigate\i13-eyecare\` (`cards.json`, `strip.json`, `sim.json`, `cards-{375,768,1440}.png`, `cards-after-{375,768,1440}.png`, `strip-{375,768,1440}.png`, `strip-after-A.png`, `strip-after-B.png`, `m1.mjs`, `m2.mjs`, `m3.mjs`).
