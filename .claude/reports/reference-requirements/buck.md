---
doc_type: report
project: small-giants-wp
title: buck.co header, nav, drawer and footer requirements capture
date: 2026-09-20
plan_row: W3B-2
data: buck.json (21 rows, 147 cells, 14 not_measured)
---

# buck.co — what the header, drawer and footer actually are

Captured live at 375, 768 and 1440px (height 900), headless Chromium via Playwright, consent "Got it"
dismissed. Every value is in `buck.json` with method and evidence. Columns that do not apply to a surface
are omitted from that row rather than left blank.

## The surfaces

- **Header shell.** A plain `div.header` (not a `<header>`, no banner role): full-bleed, transparent, no
  fill, blur or scrim, radius 0. It is **not sticky**: absolute at 1440, in-flow at 768 and 375, and it
  scrolls away (top -600 at scroll 600). Logo top-left is an animated Lottie SVG (150px, 72px, 24px by tier)
  on an 8-column grid with 42.9 / 25 / 20px side padding.
- **Bar.** A right-aligned mini-nav: "Work", "About", a search icon (an `<a>` with no `href`), and the
  hamburger. Type is Mabry weight 100, fluid at about 1.49vw from 1280px up with a 20px floor. Hover fades a
  link to opacity 0.5. At 375 the whole mini-nav is `display:none` (0x0).
- **Dropdown and mega.** Absent at every tier: no `aria-haspopup`, no dropdown class, hover opens nothing.
- **Trigger and close.** A native `<button>` with only an SVG (three bars). No `aria-label`, no
  `aria-expanded`, so it has no accessible name. On open the same button swaps its icon to an X and stays
  above the panel (z 1400 over 1300). After scrolling past the header (between 300 and 360px at 1440,
  180-240px at 768) it becomes `position:fixed` in a round chip (68.6 / 64px) top-right. At 375 it is a
  separate, always-fixed 55px chip button outside the header.
- **Drawer.** Full-screen fixed panel (z 1300), opaque, slides up from the bottom (translateY 900 to 0 with a
  fade, about 500 ms open and 250 ms close). Six links (Work, About, Contact, Careers, Games, Goods), weight
  100, upper-case by CSS, each with a leading SVG glyph. Bottom row: "(c) 2026 BUCK" and LinkedIn, Instagram,
  Vimeo, Privacy Policy (inline at 1440, stacked below). A search icon is the first item at 375 only. Link
  size is fluid 3.5vw from 1100px up (50.4px at 1440), then stepped 52 / 39.8 / 24px.
- **Footer.** `footer[role=contentinfo]`, full-width coloured block: five office blocks (LA, NY, Sydney,
  Amsterdam, London) each with a live local-time clock, address, email, phone; a newsletter heading; a
  social and legal link row. 3 columns at 1440, 2 at 768, one right-hand column at 375.

## Surprising findings

1. **Palette colour is random per page load**: the drawer and the footer fills changed on every load (this
   run: #196efa, #f4c054, #508054 across tiers; the 2026-07-28 record saw #7f4c1e and #00513c). Neither is a
   tier value; a clone must treat it as a palette pick, not a design token.
2. **The header is not the sticky element, the burger is.** The header scrolls away; the burger detaches
   into a fixed chip. Any "sticky header" family must therefore separate header behaviour from trigger
   behaviour.
3. **Accessibility gaps**: nameless button, no `aria-expanded`, Escape does not close, no scroll lock (wheel
   and PageDown scroll the page behind the open panel), no `dialog`, `inert` or `aria-modal`. The drawer
   also survives a resize while open.

## Not measured

Listed in `not_measured` (14): the logo animation and chip transition timing, footer mechanics, motion and
hover, and trigger magnet behaviour. Hover on drawer links was captured at 768 and 1440 only.

## Re-run

Scripts live in the session scratchpad `...\scratchpad\w3b2-sbd` (`cap.mjs`, `b-thresh.mjs`, `fontscale.mjs`,
`build-buck.mjs`, `cfg\buck.json`):

```
node cap.mjs buck 1440 & node cap.mjs buck 768 & node cap.mjs buck 375 & wait
node b-thresh.mjs 1440 & node b-thresh.mjs 768 & node b-thresh.mjs 375 & wait
node fontscale.mjs buck
node build-buck.mjs
```
