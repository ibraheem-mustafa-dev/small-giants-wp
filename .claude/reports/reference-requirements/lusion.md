---
doc_type: report
project: small-giants-wp
title: lusion reference requirements capture
date: 2026-09-20
plan_row: W3B-2
---

# lusion (https://lusion.co/)

A transparent full-width header with a logo and a right-hand cluster of pills. Its menu is not a drawer but a stack of separate rounded cards hanging under the trigger (right-aligned to it at 1440, container-wide at 768 and 375). The whole page, header excluded, scrolls by translating one container with a custom spring scroller. Lenis is NOT used, which resolves last run's unmeasured item.

## What is captured

| Surface | Presence (375 / 768 / 1440) | Cells measured | Cells not measured |
|---|---|---|---|
| header-shell | present / present / present | 33 | 1 |
| bar | present / present / present | 39 | 2 |
| dropdown | absent / absent / absent | 3 | 0 |
| mega | absent / absent / absent | 3 | 0 |
| trigger-close | present / present / present | 36 | 1 |
| drawer | present / present / present | 39 | 1 |
| footer | present / present / present | 30 | 10 |

Totals: 21 rows (7 surfaces x 3 tiers), 183 measured cells, 9 not-applicable cells, 15 entries in `not_measured`.

## Scroll mechanism (the open item from the last run)

- **Real scroll container**: `div#page-container` inside the fixed `div#ui`. It is moved with `transform: translate3d(0, -Ypx, 0)`; `window.scrollY` is always 0, html and body are `overflow:hidden`, and there is no element with `overflow:auto|scroll`. That is why the earlier probe found `SCROLLERS []` and `scrollY 0`.
- **Not Lenis**: the bundle has no "lenis" string (`grep -c -i lenis src/lus-hoisted.js` gives 0) and `window.lenis` / `window.Lenis` are undefined. The scroller is the site's own `ScrollManager extends ScrollPane` with spring smoothing (`SecondOrderDynamics`) and `normalizeWheel`.
- **Measured**: a 600px wheel moved the page about -577px (1440) after settling; PageDown moves about 900px; End and Home did not move it. The header did not change across nine 900px steps (top 0, same height); only the ink colour class changed (`is-white-bg` to `is-black-bg`, seen at 375 after nine steps).
- **Locked while the menu is open**: wheel and PageDown moved nothing (translate 0 to 0), matching the source `isMoveable` condition `!header.menu.opened`.

## Surfaces in one line each

- **header-shell**: full-bleed fixed header, height 146 / 96 / 65px at 1440 / 768 / 375, z-index 52, transparent, pointer-events none (controls opt back in). Controls sit at 72 / 25 / 15px from the edges.
- **bar**: logo left; at 1440 a sound button, a LET'S TALK pill (#2b2e3a) and a MENU pill (#e4e6ef); at 768 and 375 only a circular icon-only menu button (sound and talk are 0x0).
- **dropdown / mega**: absent.
- **trigger-close**: the pill swaps its label MENU to CLOSE in place, fill goes white, two dots rotate.
- **drawer**: four cards (white links, white newsletter, white Let's talk, black Labs), radius 10px, one column; scrim behind: a 20% right-half gradient at 1440, a full-viewport #0016ec at 768 and 375.
- **footer**: white panel with address, socials, emails, newsletter heading, a credit row and a round up button; 12-column grid at 1440, 6-column at 375.

## Most surprising findings

1. The header controls are not usable at load in a real sense: they start 4em below the bar and slide up on a timer (source `header.ratio`), and until they arrive the hero is what a pointer hits. Under software rendering this took 40s at 1440, so the earlier "top 99" readings were mid-slide.
2. Focus is invisible and unmanaged: every focused menu control reports `outline: none 0px`, Tab walks out of the open menu into the page, Escape does nothing and there is no dialog role, no aria-expanded and no inert.
3. The scrim differs by width (source: opacity 0.2 at 1000px and above, 1 below): a subtle right-half shade on desktop, an opaque brand-blue cover on tablet and phone.
4. The menu is an interaction-free stack until opened: closed cards sit rotated and translated (`translate3d(0,5.5em,0) rotate(3.5deg)`) and fade in with a 0.02s stagger; the four card visibility rules change per tier (newsletter 0 high at 768, Let's talk 0x0 at 1440).

## Method notes

- Software WebGL runs at roughly one frame per second here, so animation timing could not be sampled with requestAnimationFrame or short wall-clock reads; transitions are recorded from computed styles and the CSS source, and open/close end poses were not observed live.
- Every run waits for `#preloader` to clear and for the header intro to settle before measuring the rest state.
- 768 uses a desktop pointer (no touch) but the site already runs its mobile layout there (sound and talk hidden).

## Not measured

- footer @ 375, item_states: link hover in the footer (socials and email lines roll like the menu links) was not driven
- footer @ 375, motion: footer text reveal and line animations not sampled
- footer @ 375, trigger_close: the footer has no trigger; the round up button and the newsletter submit were not clicked
- footer @ 768, item_states: link hover in the footer (socials and email lines roll like the menu links) was not driven
- footer @ 768, motion: footer text reveal and line animations not sampled
- footer @ 768, trigger_close: the footer has no trigger; the round up button and the newsletter submit were not clicked
- footer @ 1440, item_states: link hover in the footer (socials and email lines roll like the menu links) was not driven
- footer @ 1440, motion: footer text reveal and line animations not sampled
- footer @ 1440, trigger_close: the footer has no trigger; the round up button and the newsletter submit were not clicked
- drawer @ 1440, motion: open/close durations and the end pose were not observed: the headless run renders the WebGL page at about one frame per second, so wall-clock reads never reached the end state; the declared transitions and closed poses are recorded instead
- header-shell @ 1440, motion: intro slide timing in a real browser: measured 40s to settle in this software-rendered run, source says about 2s of header time
- footer @ 1440, mechanics: the header ink theme while the footer is on screen was not observed (the paced PageDown run stopped about 4500px short at 1440, 2900px at 375, 2150px at 768)
- bar @ 768, item_states: hover on the menu pill is read from the CSS rule; the computed hover diff was empty within 900ms because frames are starved
- trigger-close @ 375, mechanics: touch gestures were not driven; 375 uses a mobile UA with a mouse wheel and keyboard, and touch scroll of the virtual scroller was not tested
- bar @ 1440, trigger_close: the sound and talk pills were not clicked (sound toggles audio; talk is a mailto link)

## Drawer cross-check against 2026-07-28-drawer-code-extraction

- **scrim / backdrop**: existing data says desktop "no scrim"; mobile "full-bleed solid blue rgb(0,22,236), unclear if the drawer's own scrim" (lusion-desktop.json / lusion-mobile.json ::backdrop). This capture: there is a scrim on every tier: div#header-background, absolute, pointer-events auto when open. 1440: a 720x900 right-half gradient rgba(11,11,18,.5) to 0 at opacity 0.2. 768 and 375: full-viewport #0016ec at opacity 1 (CSS: width:100vw; background:var(--header-color); JS sets opacity 1 when viewport < 1000, 0.2 otherwise). Trusted: this capture, because read from the element, its computed paint and the source (`this.domBackground.style.opacity=properties.viewportWidth>=1e3?.2:1`); the blue is the drawer's own scrim, not a page section
- **scroll lock**: existing data says "body overflow hidden while open". This capture: body and html are overflow:hidden at ALL times (closed too), so that is not the lock; the lock is the page scroller refusing to move: wheel and PageDown moved nothing while open (translate 0 -> 0) while the same wheel moved it -577px when closed. Source: ScrollPane.isMoveable includes !header.menu.opened. Trusted: this capture, because closed-versus-open control measured on the same page, plus the source line
- **mobile secondary cards**: existing data says at 400px the newsletter card collapses to 0x0 and the Let's talk card becomes visible. This capture: at 375 both are visible (newsletter 345x188.5, Let's talk 345x67.4); at 768 the newsletter is 0 high and Let's talk is 718x89.9; at 1440 the newsletter is 310x251 and Let's talk is 0x0. Trusted: this capture for 375 and 768, existing for 400 is not re-tested, because three measured widths disagree with a single 400px reading; the cause of the 375 difference (viewport height or aspect) was not isolated
- **panel geometry**: existing data says 1440-class desktop: width 310, right inset 67.6, top 107.6; mobile: 370 wide at top 78. This capture: 1440: 310.1 wide, right inset 72, top 107.6; 768: 718 wide, insets 25, top 98; 375: 345 wide, insets 15, top 66. Trusted: both, they differ by viewport, because panel width follows the header container: 72px insets at 1440 (existing capture had a narrower viewport), 25px at 768, 15px at 375
- **close control**: existing data says text-swap MENU -> CLOSE. This capture: agrees: MENU slides out and CLOSE slides in (two spans), the button fill goes #e4e6ef -> #ffffff and the two dots rotate 270deg; the button does not move. Trusted: both, because same reading, now with computed states
- **mobile trigger**: existing data says header collapses to a single circular 3-dot button (icon only). This capture: a circle with two dots (33.6px at 375, 44.8px at 768); sound and talk pills are 0x0 at both. Trusted: this capture for the count of dots (2), because the DOM has two .header-right-menu-btn-dot spans

## Re-run

```
cd C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/e8121ea1-eebb-401c-ab36-bff8fbb20661/scratchpad/w3b2-lfl
./run-lus.sh 1440 768      # and, in a second shell, ./run-lus.sh 375  (runs lus-capture.mjs, lus-capture2.mjs, lus-footer2.mjs per tier; two at a time, three at once crashes the browser)
node lus-scroll.mjs 1440   # the scroll-container probe
python build_lus.py        # writes lusion.json and lusion.md into .claude/reports/reference-requirements/
```
Source checks: `grep -c -i lenis src/lus-hoisted.js` (0); the ScrollManager and `_enableMenu` quotes are in `src/lus-hoisted.js`, the hover and transition rules in `src/lus.css`.
