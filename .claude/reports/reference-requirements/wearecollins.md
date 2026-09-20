---
doc_type: report
project: small-giants-wp
title: wearecollins reference requirements capture
date: 2026-09-20
plan_row: W3B-2
---

# wearecollins (https://wearecollins.com)

The header is a transparent full-bleed bar (74px, 82px at 375) holding a wordmark logo and a two-bar burger, and nothing else. There is no navigation on the bar at any width, so there is no dropdown and no mega panel. The burger opens a full-screen opaque drawer (#140700) that is revealed by a clip-path growing out of the bar. The footer is a copy of the drawer content (nav, actions, newsletter, socials) on the same dark ground, one viewport high.

## What is captured

| Surface | Presence (375 / 768 / 1440) | Cells measured | Cells not measured |
|---|---|---|---|
| header-shell | present / present / present | 39 | 3 |
| bar | present / present / present | 39 | 0 |
| dropdown | absent / absent / absent | 3 | 0 |
| mega | absent / absent / absent | 3 | 0 |
| trigger-close | present / present / present | 39 | 3 |
| drawer | present / present / present | 39 | 0 |
| footer | present / present / present | 39 | 4 |

Totals: 21 rows (7 surfaces x 3 tiers), 201 measured cells, 6 absent or not-applicable rows, 10 entries in `not_measured`.

## Surfaces in one line each

- **header-shell**: `header.app-header`, fixed, z-index 9, full-bleed, transparent. It hides after a downward scroll and returns on any upward scroll (translateY -100%, 0.45s cubic-bezier(0.215,0.61,0.355,1)). When revealed it gets a solid fill from `::before` whose colour follows the section behind it (#f8f8f7 over light, #140700 over dark).
- **bar**: `nav.header` grid, padding 24px 98px 32px (1440), 24px 16px 32px (768), 32px 24px 32px (375). Logo 93x15 SVG, burger 28x18 (below a 44px target). Hover changes nothing.
- **dropdown / mega**: absent at every tier; the bar has two focusable items (logo, burger).
- **trigger-close**: the two burger bars morph into an X in the same slot (0.45s); the drawer carries its own copy of the bar so the close button sits at the identical rect. Closes on the button, Escape and the `m` key; an empty-area click does not close it.
- **drawer**: `header > div.menu`, fixed, 100vw x 100vh, opaque, no scrim or blur. Serif primary links (Portrait Text 72 / 58 / 48px), a Work with us pill, Team / Careers / Press, three story cards, a newsletter form, three social links. Hover dims the sibling items to #4c4c4c.
- **footer**: `footer.grid`, 900px high, #140700, the drawer's nav / actions / newsletter / socials, no story cards, no legal row.

## Most surprising findings

1. The drawer is not modal. There is no dialog role, no `aria-modal`, no `inert`, and Tab walks out of the last drawer item into the page behind it (Explore Programs, Bose, Red Wing Shoes). Focus is also lost on close (activeElement becomes body). `aria-controls="menu"` points at an element that has no id.
2. The earlier drawer data says the tertiary links and the newsletter are dropped on mobile. They are not: the desktop copies are `display:none` (0x0) but a second `mobile-only` set of Team / Careers / Press is shown at 375, and the newsletter form is present and reached by scrolling the drawer itself (scrollHeight 1126 vs 900).
3. At 375 with an iPhone Safari user agent the header is `position:relative` (class `header--ios-safari`, set by a user-agent test in the bundle), so it scrolls away and never reappears; with a desktop user agent at the same width it is fixed and hides and reveals like desktop.
4. There is a keyboard hotkey: `m` toggles the menu (verified open and closed), in addition to Escape.
5. The reveal is a `clip-path: inset()` animation driven by the motion library through WAAPI (no GSAP, no Lenis on the page). Open takes about 310ms, close about 280ms, and the element is removed about 500ms after the close animation ends.

## Method notes

- Each tier is a separate browser session; 375 uses an iPhone Safari UA with touch, 768 and 1440 use a desktop Chrome UA. Scroll is the window (native), so wheel events move `scrollY`.
- Raw per-tier data is in `raw/wac-<tier>.json` (main capture), `wac-supp-<tier>.json` (timing, tab cycle, header theme, libs), `wac-key-<tier>.json` (hotkey, aria) and `wac-dim-<tier>.json` (hover mapping) in the scratchpad next to the scripts. The source quotes come from `_nuxt/3XtOWqXF.js`.
- No consent gate appeared.

## Not measured

- header-shell @ 375, motion (fill fade timing): the ::before fill fade and the logo colour change are recorded as states at scroll positions; their transition timing was not sampled
- trigger-close @ 375, ground (mark colour inside the open drawer): the fill of the X bars inside the drawer was not read; only the bar-position colours were measured
- footer @ 375, motion: footer scroll-reveal or entrance animation was not sampled (only hover states were driven)
- footer @ 375, item_states: hover is not exercised in the touch context; the colour diffs recorded are pointer-emulated in a touch-enabled context and are weak evidence
- header-shell @ 768, motion (fill fade timing): the ::before fill fade and the logo colour change are recorded as states at scroll positions; their transition timing was not sampled
- trigger-close @ 768, ground (mark colour inside the open drawer): the fill of the X bars inside the drawer was not read; only the bar-position colours were measured
- footer @ 768, motion: footer scroll-reveal or entrance animation was not sampled (only hover states were driven)
- header-shell @ 1440, motion (fill fade timing): the ::before fill fade and the logo colour change are recorded as states at scroll positions; their transition timing was not sampled
- trigger-close @ 1440, ground (mark colour inside the open drawer): the fill of the X bars inside the drawer was not read; only the bar-position colours were measured
- footer @ 1440, motion: footer scroll-reveal or entrance animation was not sampled (only hover states were driven)
