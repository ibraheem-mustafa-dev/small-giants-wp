---
doc_type: report
project: small-giants-wp
title: fantasy reference requirements capture
date: 2026-09-20
plan_row: W3B-2
---

# fantasy (https://fantasy.co/)

A full-width transparent header with only a logo and a pill-shaped Menu button. The button opens a full-screen opaque black menu of three very large centred links, a small row of three secondary links, and a bottom bar with a sentence CTA and a video-thumbnail promo card. There is no dropdown and no mega panel. The whole layout scales through the root font-size.

## What is captured

| Surface | Presence (375 / 768 / 1440) | Cells measured | Cells not measured |
|---|---|---|---|
| header-shell | present / present / present | 33 | 1 |
| bar | present / present / present | 39 | 0 |
| dropdown | absent / absent / absent | 3 | 0 |
| mega | absent / absent / absent | 3 | 0 |
| trigger-close | present / present / present | 36 | 1 |
| drawer | present / present / present | 39 | 2 |
| footer | present / present / present | 30 | 6 |

Totals: 21 rows (7 surfaces x 3 tiers), 183 measured cells, 12 not-applicable cells, 10 entries in `not_measured`.

## Surfaces in one line each

- **header-shell**: full-bleed fixed header (height 108 / 71 / 96px at 1440 / 768 / 375, radius 0, z-index 10). The only paint is a 50% black gradient child with a top-to-bottom mask that fades out once you scroll down past 100px and returns when you scroll up.
- **bar**: logo (left) and one pill toggle (right) at the container padding (50 / 20.6 / 14px). No links, no utility controls.
- **dropdown / mega**: absent.
- **trigger-close**: one button; "Menu" label (hamburger at 375) cross-fades to an X in place; it stays above the menu (header z 10, menu z 9).
- **drawer**: `aside.menu`, created only while open; full-screen opaque #000, role=dialog aria-modal, Escape closes it, scrolling is NOT locked, Tab is NOT trapped.
- **footer**: a white sign-off panel (heading, Contact button, copyright, legal link) sitting on a black 90% overlay; 531px tall at 1440.

## Most surprising findings

1. The menu is mounted only while open (`aside` is absent from the DOM at rest) and is a proper `role="dialog" aria-modal="true"`, yet the page behind still scrolls (0 to 940 with the menu open) and Tab walks out of the menu into the page.
2. The header gradient is not a static black band: it is a 50%-black layer with a mask-image fade that collapses to opacity 0 when scrolling down past 100px and returns on any upward scroll (source: `is-collapsed`). The earlier pill-measurements report recorded it as a plain `rgb(0,0,0)` full-bleed layer.
3. The type scale is rem-stepped and viewport-scaled together: the menu link is 10rem at 1440, 7rem at 768 and 5rem at 375, and the root font-size is 8.33px at 1440 but 10px at both 1337 and 1920. The earlier 70px figure is the 1337px reading, not a contradiction.
4. Lenis is on `window` with `lerp 0.15` and `wheelMultiplier 1.25`, driven by the GSAP ticker; `window.scrollY` works, so this is the simple Lenis case.

## Method notes

- Each tier is a separate browser session; the cookie banner was dismissed with "Accept all". 375 uses a mobile UA with touch, 768 and 1440 a desktop UA.
- The open menu was probed on the home route only.
- Raw numbers live in `raw/fan-<tier>.json` next to the scripts; the source lines are quoted from `_nuxt/DsC-Xkwh.js`.

## Not measured

- footer @ 375, item_states: footer link and button hover was not driven
- footer @ 375, motion: no footer motion sampled (reveal or hover)
- footer @ 768, item_states: footer link and button hover was not driven
- footer @ 768, motion: no footer motion sampled (reveal or hover)
- footer @ 1440, item_states: footer link and button hover was not driven
- footer @ 1440, motion: no footer motion sampled (reveal or hover)
- header-shell @ 1440, ground: is-light variant (white gradient, black text) was not observed: every sampled scroll offset (0, 400, 900, 1800, 3500, 6000, 10000, 13500) was over a dark section; the variant is known from source only
- drawer @ 1440, item_states: active-route indicator not driven: the menu was only opened on the home route
- drawer @ 1440, motion: enter animation is source-only; only the close was sampled (open animation frames were not captured with opacity of the aside)
- trigger-close @ 375, mechanics: measured in a mobile-UA emulation with a mouse wheel and keyboard; touch gestures not driven

## Drawer cross-check against 2026-07-28-drawer-code-extraction

- **primary link size**: existing data says 70px at a 1337px-wide viewport, 46.5px at 400px (fantasy-desktop.json / fantasy-mobile.json menu_link). This capture: 83.33px at 1440, 45.03px at 768, 43.60px at 375; a probe at 1337x713 reproduces 70px exactly, at 1920 gives 100px (fan-scale.mjs). Trusted: both, the difference is the viewport, because the menu link is 10rem at 1440 and 1920, 7rem at 768 and 1337, 5rem at 375, and the root font-size is viewport-scaled (10px at 1337 and 1920, 8.33px at 1440), so the size is stepped by breakpoint and scaled by viewport, not one fluid clamp
- **dialog and modal semantics**: existing data says "dialog: false", "inert_count: 0". This capture: no <dialog> element, but aside.menu carries role="dialog" aria-modal="true" aria-label="Main menu"; inert count is 0 (agrees); no focus trap. Trusted: this capture, because the earlier harvest looked for a <dialog> element; the ARIA role is in the rendered DOM and in the source
- **close control**: existing data says "separate-x": a dark rounded-square X, 62x50, replacing the Menu text. This capture: not separate: the same button.sh-toggle; the Menu label fades out and an X svg fades in, and the button narrows from 93.3 to 51.7 at 1440; its fill (rgba(255,255,255,0.15) over blur(4px)) is unchanged. 62px is the width at a 1337px viewport (fan-scale.mjs). Trusted: this capture, because measured label and svg opacities before and after the click on one element
- **scrim and ground**: existing data says no scrim; opaque black panel. This capture: agrees: aside and panel are #000000, opacity 1, no blur, no scrim. Trusted: both, because same reading
- **scroll lock**: existing data says body overflow visible with the menu open, "worth a live re-check". This capture: re-checked live: with the menu open a wheel scroll moved the page from 0 to 940 and the menu stayed open; html class stays "lenis" (no lenis-stopped). Trusted: this capture, because scrollY measured before and after the wheel
- **secondary blocks and mobile drop**: existing data says tertiary row, CTA sentence (dropped at mobile), promo card. This capture: agrees: the sentence CTA is present at 768 and 1440 and absent at 375 (source class hidden s:block); the promo card has a looping muted video thumbnail 96x62 at 1440. Trusted: both, because same DOM reading

## Re-run

```
cd C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/e8121ea1-eebb-401c-ab36-bff8fbb20661/scratchpad/w3b2-lfl
for w in 1440 768 375; do node fan-capture.mjs $w; done
node fan-scale.mjs      # optional: proves the root font-size scaling
python build_fan.py     # writes fantasy.json and fantasy.md into .claude/reports/reference-requirements/
```
