---
doc_type: report
project: small-giants-wp
title: dogstudio.co header, nav, drawer and footer requirements capture
date: 2026-09-20
plan_row: W3B-2
data: dogstudio.json (21 rows, 138 cells, 15 not_measured)
---

# dogstudio.co — what the header, drawer and footer actually are

Captured live at 375, 768 and 1440px (height 900), headless Chromium via Playwright. Every value is in
`dogstudio.json` with method and evidence. Columns that do not apply to a surface are omitted from that row
rather than left blank. Header offsets are measured after dismissing the browser-update banner (below).

## The surfaces

- **Header shell.** `div.site-header`: full-bleed, transparent, no fill, blur or scrim, radius 0, z 1000,
  pointer-events none on the band. It holds only an SVG wordmark (left) and a burger (right). Behaviour: it
  **hides on scroll-down** (fixed, translated -100%) and **reappears on scroll-up**; when it reappears it is
  transparent at 768 and 1440 but gets a solid #0d0e12 fill at 375.
- **Bar.** There is no navigation bar. At 375 a single text link, "All our cases" (13px), sits beside the
  logo; at 768 and 1440 it is `display:none` (0x0).
- **Dropdown and mega.** Absent at every tier.
- **Trigger and close.** A native `<button title="Toggle menu">` with a visually hidden label and three white
  bars (20/16/20 x 2px). On open the same button gets `is-active`, rotates 180 degrees and the bars morph to
  an X. It stays above the menu (header z 1000 over menu z 995). No `aria-expanded`.
- **Drawer.** Full-screen fixed `.site-menu` (transparent, z 995) over an opaque #131419 image layer
  (`picture.site-menu-back`, z 990). A #131419 **curtain** (`.site-menu-panel`, z 999) sweeps across from the
  left while the layer and list fade in. Five links (The Studio, Our Cases, Careers, Our Values, Contact),
  Heebo weight 200, colour rgba(160,168,220,0.8); hover turns a link white. Bottom row: "Watch our Showreel", a
  tagline that is an **image**, and Facebook / Instagram / Dribbble / Twitter / Newsletter.
- **Footer.** `div.site-footer` (not a `<footer>`), transparent over #131419, about 292px tall at 1440: three
  city labels, four social abbreviations, "Contact us" with an email, Privacy Policy, an English / Espanol
  switch. 11px Heebo.

## Surprising findings

1. **Link size depends on viewport height.** The drawer links are 60px at 1440x900 but 45px at 1440x713, and
   the same at 1352. The 2026-07-28 record saw 45px at 1352x713, which is now explained. Nothing in the tier
   table (375/768/1440 at height 900) shows this; a width-only model will misread dogstudio.
2. **Index numbers are CSS-generated and desktop-only.** "01-05" come from a CSS counter on `a::before`
   (content `"0" counter(b)`); at 768 and 375 the pseudo-element is `none`. The earlier record's tagline
   "We Make Good Shit" as serif text is an `<img>` with that alt text.
3. **Out-of-date-browser banner** (`#buorg`, 82px) appears late (after about 8 s) on a desktop UA and pushes the
   header to top:81 until "Ignore" is clicked; it is absent on the iPhone UA. The drawer is fully scroll-locked
   (wheel and PageDown do not move the page), closes on Escape, and survives a resize while open.

## Not measured

Listed in `not_measured` (15): header hide/reveal transition timing, trigger magnet, footer hover, motion and
mechanics at all tiers. The open/close curtain timings are coarse: the page is WebGL-heavy, so each sample took
0.4 to 1 s and durations are upper bounds.

## Re-run

Scripts live in the session scratchpad `...\scratchpad\w3b2-sbd` (`cap.mjs`, `d-li.mjs`, `d-h.mjs`,
`fontscale.mjs`, `build-dogstudio.mjs`, `cfg\dogstudio.json`):

```
node cap.mjs dogstudio 1440 & node cap.mjs dogstudio 768 & node cap.mjs dogstudio 375 & wait
node d-li.mjs 1440 & node d-li.mjs 768 & node d-li.mjs 375 & wait
node d-h.mjs
node fontscale.mjs dogstudio
node build-dogstudio.mjs
```
