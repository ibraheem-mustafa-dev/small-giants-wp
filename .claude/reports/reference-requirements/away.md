---
doc_type: report
project: small-giants-wp
title: away reference requirements capture
date: 2026-09-20
plan_row: W3B-3
---

# away (https://www.awaytravel.com/)

A conventional retail header with real navigation. At 1440 it is a fixed white wrapper (93px: a 36px announcement bar plus a 57px header row) with a centred six-item nav and header-wide mega panels. At 768 and 375 the nav is removed and a hamburger opens a left-sliding drawer: 390px wide over the header at 768, full width below the header at 375. The footer is a multi-section footer (newsletter, store block, three link columns, legal row).

## What is captured

| Surface | Presence (375 / 768 / 1440) | Cells measured | Cells not measured |
|---|---|---|---|
| header-shell | present / present / present | 39 | 3 |
| bar | present / present / present | 39 | 0 |
| dropdown | absent / absent / present | 15 | 0 |
| mega | absent / absent / present | 15 | 0 |
| trigger-close | present / present / present | 39 | 2 |
| drawer | present / present / absent | 27 | 2 |
| footer | present / present / present | 39 | 6 |

Totals: 21 rows (7 surfaces x 3 tiers), 213 measured cells, 5 absent or not-applicable rows, 13 entries in `not_measured`.

## Surfaces in one line each

- **header-shell**: `#main-header`, fixed, z-index 100, full-bleed, opaque white. Never hides or shrinks on scroll (top 0 and the same height at every scroll position tested). The top bar changes colour per announcement (#111111, #d85358, #39614c seen).
- **bar**: `header.header`, 3-column grid. 1440: logo left, nav centred on the viewport (column 602.6px, centre 720), wishlist / search / Log in / cart right. 768 and 375: hamburger and search left, logo centred, wishlist and cart right.
- **dropdown**: the SALE panel (one title, three links, one centred column). **mega**: NEW ARRIVALS, LUGGAGE, BAGS, ACCESSORIES (link columns on the left, two or three image callouts on the right). Both are the same `.mega-menu__dropdown` component: header-wide (1440px), top 93 (gap 0), white, no shadow, z-index 11, with a 10% black scrim below it. They are not item-centred. Absent at 768 and 375.
- **trigger-close**: at 1440 the nav items are the triggers (hover or focus opens; blur or pointer-leave closes). At 768 and 375 the hamburger swaps to a close icon by display; a full-viewport "Close" scrim button and Escape close the drawer.
- **drawer**: `#mobile-menu`, `role=dialog aria-modal`, slides in over 0.3s ease-out. Accordion rows 54px, 14px uppercase, then Log in / Refer a friend / Help / Our stores. Absent at 1440.
- **footer**: newsletter and store block, SHOP / ABOUT / GET HELP columns (3 at 1440, 2 at 768 and 375), country row, legal row; all links always visible.

## Most surprising findings

1. Away has both a dropdown and a mega panel in one component: SALE (one column, no images) and LUGGAGE (three columns, two images) share the same header-wide geometry. The panel is centred on the viewport, and a single-column panel centres its column while a multi-column one left-aligns to the 45px gutter.
2. Escape does not close a mega panel that keyboard focus opened, and Enter on a trigger follows its link instead of toggling. In the clean keyboard test Tab moved trigger to trigger without entering any panel; only blur closed it.
3. At 768 the drawer (top 0, 390px wide) sits over the header and covers the hamburger, so there is no visible close button; the closers are the scrim, Escape and the sr-only "Close" scrim button. At 375 the drawer starts at the header bottom and the toggle stays visible, but a transparent full-viewport scrim button sits above it and takes the click.
4. The drawer is a proper modal (focus moves in, Tab is trapped, Escape returns focus to the toggle), while the desktop panels are the opposite (no Escape, focus-opened).
5. The hamburger has a visually-hidden "Menu" text and no aria-label, and the text does not change to "Close" while open.

## Method notes

- Each tier is a separate browser session. 375 uses an iPhone Safari UA with touch (a Playwright `locator.click` hung at that width, so clicks use `mouse.click` at the element centre); 768 and 1440 use a desktop Chrome UA.
- At 375 the first click after the scroll and hover steps did not open the drawer (cause not established), so the open step reloads the page before clicking.
- Raw data is in `raw/away-d-1440.json`, `away-d2-1440.json`, `away-m-<tier>.json` and `away-m2-<tier>.json` in the scratchpad next to the scripts.
- Existing drawer data for Away: none, so there is no cross-check. `labels-away.json` was written in the same shape as `labels-fantasy.json`.

## Not measured

- header-shell @ 375, motion (announcement transition timing): the slide transition (fade or slide, duration, interval) was not sampled; only the bar colour change was observed
- trigger-close @ 375, ground (icon stroke colour): the SVG stroke colour of the hamburger and close icons was not read, only their rects
- drawer @ 375, item_states (hover): hover on drawer rows and links was not driven
- footer @ 375, item_states: footer link hover was not driven (the hover diff returned no rows)
- footer @ 375, motion: footer scroll-reveal and the country-selector open animation were not sampled
- header-shell @ 768, motion (announcement transition timing): the slide transition (fade or slide, duration, interval) was not sampled; only the bar colour change was observed
- trigger-close @ 768, ground (icon stroke colour): the SVG stroke colour of the hamburger and close icons was not read, only their rects
- drawer @ 768, item_states (hover): hover on drawer rows and links was not driven
- footer @ 768, item_states: footer link hover was not driven (the hover diff returned no rows)
- footer @ 768, motion: footer scroll-reveal and the country-selector open animation were not sampled
- header-shell @ 1440, motion (announcement transition timing): the slide transition (fade or slide, duration, interval) was not sampled; only the bar colour change was observed
- footer @ 1440, item_states: footer link hover was not driven (the hover diff returned no rows)
- footer @ 1440, motion: footer scroll-reveal and the country-selector open animation were not sampled
- search drawer (`#search-drawer`): open behaviour was not measured; a click on the search button timed out in the follow-up run and the drawer is recorded only as closed (fixed, top -1800).

## Headed re-check

Real headed Chrome (see `HEADED-SPOTCHECK.md`): the committed capture describes the US storefront; a headed browser is served the UK one (GBP, `/en-gb`, first two nav items swapped, no consent banner). 12 of 55 static cells differ: 7 are the 15px scrollbar (identical once labels derive from `clientWidth`) and 5 are the storefront difference.
