---
doc_type: report
project: small-giants-wp
title: lamalama reference requirements capture
date: 2026-09-20
plan_row: W3B-2
---

# lamalama (https://lamalama.com/)

The header is not a bar. It is a 50px floating pill (438px wide, 16px from the top, radius 4px, blur 4px over a 60% black child fill) holding an animated canvas logo, a rotating one-line message and a burger. There is no navigation on the bar at any width. Clicking anywhere on the pill grows the same pill downward into the menu card; there is no separate drawer, dropdown or mega panel.

## What is captured

| Surface | Presence (375 / 768 / 1440) | Cells measured | Cells not measured |
|---|---|---|---|
| header-shell | present / present / present | 33 | 1 |
| bar | present / present / present | 39 | 0 |
| dropdown | present / present / present | 39 | 1 |
| mega | absent / absent / absent | 3 | 0 |
| trigger-close | present / present / present | 33 | 1 |
| drawer | present / present / present | 39 | 1 |
| footer | present / present / present | 30 | 6 |

Totals: 21 rows (7 surfaces x 3 tiers), 216 measured cells, 15 not-applicable cells, 10 entries in `not_measured`.

## Surfaces in one line each

- **header-shell**: fixed floating pill, `width = min(100vw - 32px, 438px)`, centred with `left:50%` + translateX, top 16px, radius 4px, z-index 20. Unchanged on scroll. At 1440 a second, separate floating card (GET IN TOUCH, 160x50, top-right, 16px inset) sits beside it; it is collapsed to 0x0 at 768 and 375.
- **bar**: logo (canvas), message (10px Sometype mono, uppercase, centred on the pill), burger (30x36). Nothing else. Hover changes nothing.
- **dropdown**: an inline accordion inside the opened card ("What we do" opens 4 child rows, +160px). No hover panel, no aria-expanded.
- **mega**: absent at every tier.
- **trigger-close**: the burger morphs in place into a single bar. Escape does not close it; an outside click, a click on the bar, and scrolling more than 20px do.
- **drawer**: the grown pill, 438x436 (343x436 at 375): 5 rows of 50px, a CTA block, and a 16px-blur scrim at 40% black over the page.
- **footer**: a call-to-action footer; two columns at 1440 (80px heading), one stacked column at 768 and 375 (52px heading).

## Most surprising findings

1. The message in the pill is random per page load (source: `Math.round(Math.random()*(len-1))` over an array) and also changes with the scroll section; at 375 it is empty until the first scroll. It is content, not a fixed label.
2. There IS a scrim, contradicting the earlier drawer data: `div.js-menu-blur`, fixed, full-viewport, rgba(0,0,0,0.4) plus a 16px backdrop blur, `pointer-events:none`, `display:none` until the menu opens.
3. The menu has no Escape handler, no `aria-expanded`, no `inert`, no dialog role, and Tab walks into a collapsed contact form (textarea, CANCEL, NEXT) that stays focusable. It closes on scroll (more than 20px, per the source) instead of locking scroll.
4. Lenis only starts when the primary input is not touch (`setupLenis` vs `setupNativeScroll`), so the real scroll container is `div.ll-scroller.js-scroller` in both cases; Lenis mode uses default options plus `easing: 1-2^(-10t)`. `window.scrollY` is always 0 (html and body are overflow hidden).
5. The protocol note that lamalama has an "OK" consent gate did not reproduce: no consent element was found (`lama-consent.mjs`), and clicking `button:has-text("OK")` matched a page button that scrolled the page 1630px. Earlier probes that "dismissed consent" on lamalama therefore measured a scrolled page (the pill is unaffected).

## Method notes

- Each tier is a separate browser session. 375 uses a mobile UA with touch; 768 and 1440 use a desktop UA, so 768 is a non-touch tablet and runs Lenis. A touch tablet would run native scroll like 375.
- At 1440 and 768 the requestAnimationFrame sampler is starved by the page canvases, so open/close timing reads best from the 375 series; the source quotes (0.45s expo.out, 0.35s scrim) are recorded as source-only.
- Every value comes from `getBoundingClientRect` / `getComputedStyle` in `raw/lama*-<tier>.json`, kept in the scratchpad next to the scripts.

## Not measured

- footer @ 375, item_states: footer link/button hover was not driven in this capture
- footer @ 375, motion: no footer motion was sampled (hover-roll buttons and any scroll reveal)
- footer @ 768, item_states: footer link/button hover was not driven in this capture
- footer @ 768, motion: no footer motion was sampled (hover-roll buttons and any scroll reveal)
- dropdown @ 1440, motion: accordion height easing/duration not sampled separately from the pill open animation
- footer @ 1440, item_states: footer link/button hover was not driven in this capture
- footer @ 1440, motion: no footer motion was sampled (hover-roll buttons and any scroll reveal)
- header-shell @ 1440, motion: entrance/intro animation and preloader (js-loader, z-index 50) not sampled
- trigger-close @ 768, mechanics: 768 was captured with a desktop pointer (no touch), so Lenis is active; a real tablet would be primary-touch/native like 375
- drawer @ 375, mechanics: scroll-closes-the-card did not fire in the emulated touch context although the source implies it; real touch drag not driven

## Drawer cross-check against 2026-07-28-drawer-code-extraction

- **scrim**: existing data says "backdrop.exists: false, no dedicated scrim" (lamalama-desktop.json::backdrop). This capture: div.js-menu-blur exists: position fixed, inset 0, z-index 19, background rgba(0,0,0,0.4), backdrop-filter blur(16px), pointer-events none, display none while closed; rect 1440x900 when open (lama-capture.mjs open.state.scrimCandidates; the source references this.blurPanel). Trusted: this capture, because a measured full-viewport rect while open plus the source reference; the earlier pass looked for an opaque backdrop and this element is display:none until the menu opens
- **close control**: existing data says "kind: text-swap", 30x36, position static (lamalama-desktop.json::close). This capture: no text swap: it is the same button.js-menu-toggle-button; the top bar moves y +5px and the bottom bar y -5px so all three bars sit on one line (measured transforms matrix(1,0,0,1,0,5) / none / matrix(1,0,0,1,0,-5)); size 30x36 unchanged. Trusted: this capture, because read from the computed transforms of the three bars before and after the click, and from the source (tl.to(this.top,{y:0.3125rem}))
- **mechanics on mobile**: existing data says "scroll_lock_method_note: same as desktop", "identical structure". This capture: DOM and rows are identical, but at touch the page scrolls natively (no Lenis: the source runs setupLenis only when primaryInput is not touch); close-on-scroll did not fire in the touch context (height stayed 436 after scrollTop 400). Trusted: this capture for the Lenis/native split (source + html class primary-touch); the missing scroll-close at 375 is unresolved, because the source quote and the measured html class agree; the scroll-close result is a measurement I could not explain
- **secondary blocks**: existing data says 6 secondary blocks inside the open panel (tagline, 2 glyphs, 3 CTAs). This capture: agrees, and adds three outside or hidden ones: a top-right GET IN TOUCH card (1440 only), a bottom-centre THIS IS US button that becomes visible while the menu is open (all tiers), and a hidden contact form (textarea, CANCEL, NEXT) that Tab reaches. Trusted: both, they do not conflict, because the earlier harvest counted only what is visible inside the open panel, by its own rule
- **width and tagline**: existing data says panel 368px at a 400px viewport; tagline dynamic (YOU MADE IT, LET'S DO DAMAGE). This capture: 343px at 375 (= 375 - 32); 438px cap at 768 and 1440; tagline picked at random per load (source) and it also changes with the scroll section. Trusted: both, consistent, because same width rule w-[calc(100vw-2rem)] max-w-[438px]

## Re-run

```
cd C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/e8121ea1-eebb-401c-ab36-bff8fbb20661/scratchpad/w3b2-lfl
for w in 1440 768 375; do node lama-capture.mjs $w; node lama-capture2.mjs $w; node lama-capture3.mjs $w; done
python build_lama.py    # writes lamalama.json and lamalama.md into .claude/reports/reference-requirements/
```
Playwright is loaded from `plugins/sgs-blocks/package.json` by `lib.mjs`.

## Headed re-check

Real headed Chrome (see `HEADED-SPOTCHECK.md`): 4 of 42 static cells differ, all pre-intro timing or user-agent effects. The pill reaches full opacity about 7.7 s after navigation.
