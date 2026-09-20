---
doc_type: report
project: small-giants-wp
title: resn reference requirements capture
date: 2026-09-20
plan_row: W3B-3
---

# resn (https://resn.co.nz/)

Resn is a single-page WebGL application, not a header-and-navigation site. There is no header, nav, dropdown, mega panel or footer element. What exists is a persistent full-viewport three.js scene with a few fixed controls floating over it (a menu button top-right, a droplet home button top-left while a route is open, a sound toggle bottom-right) and a menu route that is a transparent full-viewport page holding three canvas-drawn items. Menu text is drawn in canvases; the real text sits in a hidden `<a><span>` at opacity 0 at 1440 and 768, and is absent from the DOM at 375.

## What is captured

| Surface | Presence (375 / 768 / 1440) | Cells measured | Cells not measured |
|---|---|---|---|
| header-shell | absent / absent / absent | 3 | 0 |
| bar | absent / absent / absent | 3 | 0 |
| dropdown | absent / absent / absent | 3 | 0 |
| mega | absent / absent / absent | 3 | 0 |
| trigger-close | present / present / present | 39 | 1 |
| drawer | present / present / present | 39 | 5 |
| footer | absent / absent / absent | 3 | 0 |

Totals: 21 rows (7 surfaces x 3 tiers), 93 measured cells, 15 absent or not-applicable rows, 6 entries in `not_measured`.

Every present cell is measured; absent rows carry one archetype cell with the reason.

## Surfaces in one line each

- **header-shell / bar**: absent. 0 `<header>`, 0 `<nav>`; `.js-shell` is a 0x0 wrapper of separate fixed controls.
- **dropdown / mega**: absent. The three items have no panels.
- **trigger-close**: `div.js-shell__button--menu`, 18x18, right inset 23px at 1440 and 768 (25px at 375), 200x200 hit area (60x60 at 375), Discover label fades in on hover at 1440. The same button does not close the menu. Closers differ by tier (see below).
- **drawer**: the menu route, full viewport, transparent, no scrim, route `#!/menu`. About / Work / Contact in one row (58.5px Fort-Extralight at 1440, 39px at 768) or one column at 375.
- **footer**: absent. The document is one viewport high; contact details are a route.

## Motion-tier verdict (Spec 38 tiers V, G, H, W)

| Effect | Substrate | Tier verdict |
|---|---|---|
| Persistent WebGL "gem" scene, pointer and hold driven | canvas (WebGL, three.js) | No tier. Tier W is the only GPU tier but needs one bounded surface (test iii) and must never become a 3D engine; this is page-wide 3D. Bean trim or exclude decision. |
| Menu items as per-item 2D canvases; hover holds the hovered item at a high, near-constant pixel count and dissolves the other two | canvas (2D) | Partly: expressible as a new Tier V canvas-2D effect that keeps real DOM text; no built effect matches (nearest is FR-38-11 ScrambleText, Tier G, a different look). |
| Hero title split between DOM text and canvas | DOM plus canvas | Partly: per-character DOM treatment is Tier G (FR-38-10, FR-38-11); glyphs drawn outside the DOM are not expressible. |
| Menu button label fade, VIEW ALL PROJECTS underline | DOM | Tier V. |
| Click-and-hold progress ring (80x80 canvas 2D) | canvas (2D) | Tier V (2D canvas or SVG stroke). |
| Hash-route changes rendered over the scene | canvas | No tier (FR-38-19 covers cross-document View Transitions only). Bean decision. |
| Ambient audio with a toggle (Howler) | audio | Not a Spec 38 effect. Bean decision. |

On the plan's "confirm its admission (12 vs 13)": no resn effect passes the Tier W five-part test, and I did not find a 12-versus-13 count in Spec 38 section 1 to confirm; Tier W currently lists three members (surface-treatment, flowing-gradient, generative-background).

## Most surprising findings

1. The menu button does not close the menu at 1440 or 768 (route stays `#!/menu`); the earlier drawer data said it toggles. Closers at 1440: the droplet button, Escape, a click on empty space, history back. At 768: Escape and history back only. At 375: a separate 26x26 close button that appears over the menu button, the droplet button and history back; Escape and empty taps do nothing.
2. At 768x900 with a desktop user agent a full-viewport canvas at z-index 1005 sits over the fixed controls: `elementFromPoint` at the button centre returns the canvas, real clicks and hovers do not reach the button or the items, and a dispatched click does open the menu. Whether a real tablet behaves the same was not tested.
3. The controls are unfocusable `div`s and the menu items are `<a>` elements with no `href`, no `tabindex` and opacity 0: 8 Tab presses never leave the body, so the whole menu is mouse-only.
4. The menu item canvases are 2D (ImageData readable), not WebGL. On hover the hovered canvas holds a near-constant lit-pixel count (1411 / 1259 / 1650, sd 0 to 6) while the other two lose 40 to 98 per cent of their idle lit pixels (a sibling dissolve, like wearecollins' sibling dim but in pixels).
5. The page runs at about 12 fps in this headless session (42 frames in 3.5s), so no easing or duration of the canvas transitions was recorded.

## Method notes

- Each tier is a separate browser session. The shell controls appear after about 14s; at 768 they only appeared after pointer movement, so `resn-capture.mjs` moves the mouse while it waits for the menu button to reach opacity 1. Running the three tiers at once starves the page, so run them one after another.
- 375 uses an iPhone Safari UA with touch (taps via `touchscreen.tap`); when `elementFromPoint` shows the target is covered the script records that and dispatches a click.
- Raw data: `raw/resn-<tier>.json`, `resn-closeprobe2-<tier>.json`, `resn-hover-<tier>.json` in the scratchpad next to the scripts. Libraries present as globals: TweenMax and TimelineMax (GSAP 1.x), THREE, createjs, Howler; no Lenis, no gsap 3.

## Not measured

- trigger-close @ 375, item_typography (label): the 375 label span is empty in the DOM at rest, so only its computed style was read, not rendered text
- drawer @ 375, item_typography: at 375 the menu items have no DOM text (no <a> or <span> inside .menu-item, only a canvas 108x47 / 92x47 / 146x47), so font size and weight cannot be read from styles
- drawer @ 375, motion (easing and duration of the menu-in and out): the visible open and close animation happens inside canvases and the page ran at about 12 fps in the headless session, so durations and easings were not captured; only that the menu element mounts within one sampled frame
- drawer @ 375, content: the item labels are not in the DOM at 375 (canvas only), so their text was not read
- drawer @ 768, motion (easing and duration of the menu-in and out): the visible open and close animation happens inside canvases and the page ran at about 12 fps in the headless session, so durations and easings were not captured; only that the menu element mounts within one sampled frame
- drawer @ 1440, motion (easing and duration of the menu-in and out): the visible open and close animation happens inside canvases and the page ran at about 12 fps in the headless session, so durations and easings were not captured; only that the menu element mounts within one sampled frame
