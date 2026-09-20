---
doc_type: report
project: small-giants-wp
title: studionamma.com header, nav, drawer and footer requirements capture
date: 2026-09-20
plan_row: W3B-2
data: studionamma.json (21 rows, 149 cells, 12 not_measured)
---

# studionamma.com — what the header, drawer and footer actually are

Captured live at 375, 768 and 1440px (height 900), headless Chromium via Playwright. Every value is in
`studionamma.json` with its method and evidence. Columns that do not apply to a surface are omitted from
that row rather than left blank.

## The surfaces

- **Header shell.** No header box at all. Two fixed, fully transparent strips (`nav.nav-top` at top 20px,
  `nav.nav-bottom` pinned near the bottom), each full-bleed (width equals viewport), radius 0, no fill, no
  blur, no scrim. Text is `mix-blend-mode: difference`, so it inverts against the page. Always visible: at
  scroll 600 and after scrolling back up the strip is identical to rest (no hide-on-scroll).
- **Bar.** Not a navigation bar. It holds a wordmark, a dark-mode toggle, the MENU trigger and a "LET'S TALK!"
  CTA, all 14.4px mono type. Hover is a text roll (label scales to 0.8 and slides up, an alternate label such
  as "OPEN" or "CONTACT US" rolls in). The bottom strip carries a tagline and a live rotating city clock.
- **Dropdown and mega.** Absent at every tier: no `aria-haspopup`, no dropdown/mega class, and hovering each
  bar item opens nothing (the only new boxes are the hero cursor-image trail).
- **Trigger and close.** A `<div id="menuToggle">` whose text is MENU. Opening rewrites it in place to CLOSE
  (same slot, no burger, no separate close button, no top row). It has no `role`, no `tabindex`; it does set
  `aria-expanded`.
- **Drawer.** Full-screen fixed panel, opaque `#fafafa`, z-index 3 (below the header strips at 10000, so the
  strips stay on top). 1440: two 684px columns of 160px, weight 800, upper-case (CSS) links; 768: one column
  at 80px; 375: one column at 64px with "LET'S TALK!" joining the list. Opens with a clip-path polygon wipe of
  about 2 s and closes with the reverse. Links slide up in a stagger. On hover a thumbnail grows inline
  beside the label (width 0 to about 160px).
- **Footer.** Transparent, full-width, about 1086px tall, over the page background `#e4e4e4`; six looping
  muted videos on top, then a nav grid (816.7 / 466.7px at 1440) with page, social, legal and language links,
  a contact block, and the copyright line.

## Surprising findings

1. **Preloader.** The strips sit off-screen (translateY -44.8px) until about 8-9 s after load. A probe that
   settles for 5 s measures a header that is not there; all probes here wait 12 s.
2. **Accessibility gaps in a celebrated site.** Trigger is a non-focusable div; Escape does not close the
   drawer; focus stays on `<body>` after open and after close; no `dialog`, no `inert`, no `aria-modal`.
   Scroll lock is `body { overflow: hidden }`, released 2 s after close, and at 1440 it leaks: with the
   drawer open a wheel scroll still moved the page (scrollY 0 to 389, Lenis bypasses `overflow:hidden`),
   while at 768 and 375 the page did not move.
3. **Drawer survives resize.** With the drawer open, resizing +60px, and 1440 to 700px, left it open. The
   2026-07-28 extraction said the opposite; see `cross_check` in the JSON (method differs, neither fully
   trusted). Text is Title Case in the source and upper-case comes from CSS, weight 800 and letter-spacing
   -4.8px, not the "400, normal" of the earlier record.
4. **Type scale is a stepped ladder, not fluid** (`fontscale.mjs`): drawer links 160px from 1024 up, 80px at
   900-768, 64px at 640 and below; the bar text stays 14.4px at every width.

## Not measured

Listed in `not_measured` (12): preloader intro at 375 and 768, bar hover motion at 375 and 768 (roll does not
fire there), footer mechanics and motion at all tiers, the drawer link-entrance stagger at 768, and trigger
magnet behaviour. Hover on drawer links was captured at 1440 only (touch tiers have no hover).

## Re-run

Scripts live in the session scratchpad `...\scratchpad\w3b2-sbd` (`cap.mjs`, `sn-drawer.mjs`, `fontscale.mjs`,
`build-studionamma.mjs`, `cfg\studionamma.json`):

```
node cap.mjs studionamma 1440 & node cap.mjs studionamma 768 & node cap.mjs studionamma 375 & wait
node sn-drawer.mjs 1440 ; node sn-drawer.mjs 375
node fontscale.mjs studionamma
node build-studionamma.mjs
```

## Headed re-check

Real headed Chrome (see `HEADED-SPOTCHECK.md`): 0 of 36 static cells differ, and the 8 to 9 s header entrance holds.
