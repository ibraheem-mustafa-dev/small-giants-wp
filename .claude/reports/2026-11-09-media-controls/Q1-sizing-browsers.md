# Q1 sizing claims across browsers (Spec 49 v0.5 sections 7.1, 7.2, 7.4)

Method: self-contained scratch pages (`page.setContent`), 1600 by 900 SVG file, base CSS `box-sizing:border-box`, `img{display:block;max-width:100%;height:auto;min-width:0}`, `picture{display:contents}`. Contexts: 600px block parent, 600px flex row item (`min-width:0`), 600px grid cell (1fr). Browsers: real Chrome (`channel:'chrome'`), Firefox, WebKit (Playwright build). Scripts: `E:/sgs-tmp/media-q1/run.mjs`, raw data `E:/sgs-tmp/media-q1/out.json`, screenshots `E:/sgs-tmp/media-q1/shots/`, montage `E:/sgs-tmp/media-q1/montage.png`.

## Summary

| Claim | Chrome | Firefox | WebKit |
|---|---|---|---|
| 1 Ratio 1:1 + Height 300 = 300 by 300 | pass | pass | pass |
| 2 Caption 300 wide and wraps (std caption) | pass | pass | pass |
| 2 Caption with one long word / very narrow image | FAIL (overflow) | FAIL (overflow) | FAIL (overflow) |
| 3 Helper Height 300, no Ratio: file ratio gives 533 by 300 | pass | pass | pass |
| 4 max-width:100% holds in 200px parent | pass | pass | FAIL (figure fit-content + helper collapses to 0 wide) |
| 5 Circle true circle, no square corners | pass | pass | pass (see fault note: overlay and zoom) |
| 6 fit-content does not break Alignment or Fill | pass | pass | pass |

## Claim 1 (img 300 by 300 in every chain, all three browsers, all three contexts)

Chains tested: figure>img, figure>a>img, figure>picture>img, figure>a>helper>picture>img (helper carries ratio and height, img fills). Each with and without `figure{width:fit-content;max-width:100%}`.

Baseline (rule off): img and helper 300 by 300, figure 600 by 300 in block and grid (the figure spreads), 300 by 300 in flex. Claimed (rule on): img, helper and figure 300 by 300 everywhere. Identical in Chrome, Firefox, WebKit. Pass.

## Claim 2 (caption)

Std caption, 300px image, 600px block/flex/grid: rule off figure 600 wide, caption 600 wide, 2 lines. Rule on: figure 300, caption 300, 3 lines (Chrome and Firefox figure height 354, WebKit 357). Pass in all three browsers and contexts.

FAULT, long single word (`Supercalifragilisticexpialidocious_...`, 86 chars): rule on, caption box is 300 wide but `scrollWidth` is 644, so the word overflows the figure by 344px in all three browsers. Rule off it overflows the 600 box by 44px. The spec rule does not wrap it; it needs `overflow-wrap:anywhere` (or `break-word`) on the caption.

FAULT, 40px image with a normal sentence: figure 40 wide, caption wraps to 13 lines, 234px tall, `scrollWidth` 52 vs 40 (12px overflow from the longest word) in all three browsers. Rule off: caption 600 wide (block, grid) or 486.5 (flex), 1 line, so the rule does what is claimed but a tiny image gives a tall column of words.

## Claim 3 (helper Height 300, no Ratio, file 1600 by 900)

Bare image: 533.3 by 300 in all browsers and contexts. Helper without printed file ratio: 600 by 300 in block and grid (all browsers), confirming the baseline. Helper with `aspect-ratio:1600/900`: 533.3 by 300 in all three browsers, all contexts, with or without figure fit-content. Pass.

Note: with the ratio off, Chrome and Firefox already give 533.3 by 300 when the figure is fit-content or in a flex row (WebKit still gives 600 by 300), so the baseline is browser-dependent; the printed ratio removes the difference. The ratio is required for WebKit in those cases.

## Claim 4 (max-width:100% in a 200px parent; 1:1, 300px box)

Chrome and Firefox: img 200 wide in every chain (block, flex, grid; figure fit-content on and off), 300 tall. Pass for max-width.

FAIL in WebKit: figure with `width:fit-content;max-width:100%` containing the helper (helper carries `aspect-ratio:1/1;height:300px;max-width:100%`, img `width:100%;height:100%`) resolves to figure 0 by 300, helper 0 by 300, img 0 by 300 in a 200px block parent. With the figure rule off, WebKit gives 200 by 300. Image-only chains (no helper) give 200 by 300 in WebKit.

Side effect in all three browsers: the box becomes 200 by 300, not square, because Height stays 300 and the ratio no longer applies (the ratio is dropped once width is capped). `max-width` holds, but a 1:1 image is cropped or stretched to 2:3. Spec should say whether Height is also capped (for example `max-height` or `height:auto` under the width cap).

## Claim 5 (Circle: radius 50%, Ratio 1:1, 5px white border, shadow)

Corner pixels (6px in from each corner of the 300 by 300 box) equal the page background (221,221,221) in every variant, every browser: no square corners. Screenshots viewed (`montage.png`).

Variants: A image only (radius, border, shadow on img): white rim, shadow visible, pass at rest. B helper (radius, overflow hidden, overlay, zoom on hover) with border and shadow on the img: circle holds but the white border shows grey (the overlay covers it), the shadow is clipped by the helper's `overflow:hidden` (none visible), and on hover the zoomed img pushes its border out of view. C helper carries radius, border and shadow, img fills: white rim, shadow visible, overlay stays inside the border, zoom hover keeps the circle. D helper with radius, img border with no radius on img: circle holds, border grey/hidden as in B.

Fault: not a corner fault, but border and shadow must sit on the helper when a helper is printed (variant C); on the img inside a helper they are dimmed, clipped or zoomed away. Identical in all three browsers.

## Claim 6 (fit-content vs Alignment and Fill)

Figure `width:fit-content;max-width:100%;margin-inline:auto`, 300px image: block and grid centre it, 150 left and 150 right, width 300. In a flex row the item is a shrink-wrapped flex item so left 0, right 300 (same as the no-fit baseline, since margin auto is on the figure inside a block item, not the flex item). Fill: figure `width:100%` gives 600 by 337.5 image everywhere, unaffected. Figure fit-content with an img `width:100%` or a natural 1600 image still fills the 600px parent (600 wide, capped by `max-width:100%`). Identical in Chrome, Firefox and WebKit. Pass.

Note: baseline without fit-content (figure `margin-inline:auto`, 300px image) is 600 wide with margins 0, so Alignment only starts working with the rule on. The rule enables rather than breaks it.
