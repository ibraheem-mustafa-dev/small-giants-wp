---
doc_type: report
project: small-giants-wp
title: Headed spot-check of the headless reference captures
date: 2026-09-20
---

# Headed spot-check of the headless captures

Question: how much did capturing eleven references in a headless browser distort the results? This file holds two
things: Task A (re-capture the static cells of three references headed and diff them against the committed JSON) and
Task B (the cells headless could not measure). No reference JSON was edited; the owner decides any merge.

## Setup (what "headed" means here)

- One real Chrome 152.0.7977.84 (`C:\Program Files\Google\Chrome\Application\chrome.exe`), started once with
  `--remote-debugging-port`, a fresh profile, no automation flags, real user agent (`Chrome/152.0.0.0`, no
  "HeadlessChrome"), GPU on (`ANGLE (NVIDIA GeForce RTX 2060, Direct3D11)`), classic scrollbars, `requestAnimationFrame`
  at about 100 fps (12 fps on resn and 1 fps on lusion in the headless runs). Every script attaches to that one browser
  over CDP, reuses one tab per site, loads a site once and resizes the same tab between tiers. Chrome is closed only at
  the end of the job.
- `<SP>` below means the scratchpad folder
  `C:\Users\Bean\AppData\Local\Temp\claude\c--Users-Bean-Projects-small-giants-wp\e8121ea1-eebb-401c-ab36-bff8fbb20661\scratchpad\w3b-headed`.
  Every script named is in `<SP>`; raw output is in `<SP>\raw`.
- The Task A scripts are the earlier headless capture scripts cut down to their static step by `<SP>\build.py`
  (mechanical text slicing, the in-page expressions are not retyped), so old and new values come from the same code.
  Diffs: `python <SP>\deepdiff.py <old raw> <new raw> <section>` (every changed leaf, tolerance 0.05).
- Caveat 1: at 375 the old captures used an iPhone user agent with touch emulation. The shared Chrome is a real desktop
  window narrowed to 375, so at 375 the new values include a user-agent difference on top of headed versus headless.
  Where it matters a second, like-for-like run (own Playwright-launched headed Chrome, same iPhone context options) is
  quoted: `<SP>\raw\own-*-static-375.json`.
- Caveat 2: Chrome 152 differs from the bundled Chromium the old runs used (its exact version was not recorded), so a
  browser-version effect cannot be separated from a headless effect.
- Two resn runs were started in parallel by mistake and their output (`<SP>\raw\contaminated\`) was discarded; every resn
  value below comes from a single-driver re-run (`<SP>\session.mjs` now refuses a second driver).

## Task A. Do the static cells change? (lamalama, away, studionamma)

Cells compared = every static cell of header-shell, bar and trigger-close at 1440 and 375, excluding cells that are
structural "not applicable" (no measurement) and away's two shell `trigger_close` cells (no re-run source):
lamalama 21 + 21, away 29 + 26, studionamma 18 + 18 = 133. A cell "differs" when a value it states changed in the
diff; cells whose evidence holds a clock or ticker reading are listed separately.

| Reference | Compared | Match | Differ | Differ because of the scrollbar | Differ because of content/timing | Differ because of user agent |
|---|---|---|---|---|---|---|
| lamalama | 42 | 38 | 4 | 0 | 3 | 1 |
| away | 55 | 43 | 12 | 7 | 5 | 0 |
| studionamma | 36 | 36 | 0 (3 cells embed a moving clock strip) | 0 | 0 | 0 |
| all | 133 | 117 | 16 | 7 | 8 | 1 |

Commands: lamalama `HEADED_MODE=desk node lama-static.mjs 1440 | 375`, `lama2-static.mjs`, `lama3-static.mjs`
(diff sections `rest`, `libs,restScrim`, `fixedAtRest` against `w3b2-lfl\raw\lama-*.json`, `lama2-*`, `lama3-*`);
away `node away-static-d.mjs` and `node away-static-m.mjs 375` (section `rest` against `w3b3-away\raw\away-d-1440.json`,
`away-m-375.json`); studionamma `node sn-preloader.mjs` then `node sbd-static.mjs studionamma 1440 | 375` (sections
`shell,bar,zones,trigger.before` against `w3b2-sbd\raw\studionamma-*.json`). Outputs: `raw\lama-static-desk-*.json`,
`raw\away-static-desk-*.json`, `raw\studionamma-static-desk-*.json`.

### lamalama (https://lamalama.com)

| Cell | Tier | Old (headless) | New (headed) | Likely cause |
|---|---|---|---|---|
| header-shell ground, `paint.opacity` | 1440, 375 | "0" | "1" | Entrance fade. The pill is still at opacity 0 at 6.67 s after navigation and is at 1 by 7.7 to 8.2 s (`node lama-fade.mjs`, samples in `raw\lama-fade.json`: 0 at 6.67 s, 0.7337 at 7.19 s, 0.9993 at 7.70 s, 1 at 8.22 s). The old run measured after a 6 s settle, so it caught the pre-fade state. Not shown to be headless-specific: a headed run with the same 6 s settle read 0.9412 and 0.9227. |
| bar geometry, `message` rect | 375 | top 41, bottom 41, height 0 | top 33.5, bottom 48.5, height 15 | The rotating message was empty at the old capture instant (the 1440 row has height 15). Timing, not a layout difference; the committed 375 value is the wrong one. |
| header-shell tier_delta ("scroller: native, no Lenis, html class primary-touch") | 375 | native | Lenis (`ll-scroller js-scroller lenis`, `primary-mouse`) | User agent: the iPhone UA gets native scroll, a desktop UA at 375 gets Lenis. The like-for-like run (`raw\own-lama-static-375.json`, iPhone UA) matches the old value. |

Other evidence that moved without changing a stated cell value (`fixedAtRest`, `lama3-static-desk-*.json`): at 1440 the old
capture still had `div.js-loader` ("100%") in the DOM and the top-right contact card at opacity 0 with `pointer-events:
none`; the headed capture has no loader and the card at opacity 1, `pointer-events: auto`. At 375 the old capture had no
`canvas.js-upper-canvas`; the headed one does. Same cause: measured before the intro finished.

Scrollbar: none. The page scrolls in `div.ll-scroller`, so `clientWidth == innerWidth` (1440 and 375). Derived labels are unchanged.

### away (https://www.awaytravel.com/)

Scrollbar: 15px classic scrollbar, `innerWidth 1440 / clientWidth 1425` and `375 / 360` (the old headless runs had 1440 / 1440
and 375 / 375). A like-for-like iPhone-context run at 375 (`raw\own-away-static-375.json`) has no scrollbar (mobile
emulation uses overlay scrollbars), so the old 375 was only affected by the user agent, not the scrollbar; at 1440 (a desktop
window) the old value was affected.

| Cell | Tier | Old | New | Likely cause |
|---|---|---|---|---|
| header-shell geometry (width, insetRight) | 1440 | 1440 / 0 | 1425 / 15 | Scrollbar (header is 100% of `clientWidth`). |
| header-shell geometry | 375 | 375 / 0 | 360 / 15 | Scrollbar. |
| header-shell tier_delta (grid 125.5 / 90 / 125.5) | 375 | 125.5 | 118 / 90 / 118 | Scrollbar. |
| bar geometry (gridColumns, logo left, nav rect) | 1440 | 371.688px 602.609px 371.703px; nav left 418.7 | 364.188px 602.609px 364.203px; nav left 411.2 | Scrollbar (each side column loses 7.5px). |
| bar tier_delta ("grid 371.7 / 602.6 / 371.7") | 1440 | 371.7 | 364.2 | Scrollbar. |
| trigger-close geometry (`triggerItems` left, width) | 1440 | NEW ARRIVALS left 418.7 width 133.2 | BEST SELLERS left 411.2 width 126.3 | Scrollbar shift plus the order change below. |
| bar geometry (grid 125.5 / 90 / 125.5, logo left 142.5) | 375 | 125.5, 142.5 | 118, 135 | Scrollbar. |
| bar zone_model and content, trigger-close content (nav order) | 1440 | NEW ARRIVALS, BEST SELLERS, LUGGAGE, BAGS, ACCESSORIES, SALE | BEST SELLERS, NEW ARRIVALS, LUGGAGE, BAGS, ACCESSORIES, SALE | Different storefront served (below). |
| header-shell content (announcement text) | 1440, 375 | "Save up to $100 ..." / "4,000-person waitlist ..." | "Save up to £100 ..." / " 5-star office bag ..." | Different storefront (currency) at 1440; rotating announcement at 375. |

Different storefront: the headed sessions were served the UK site (`a.header__logo-link` href `/en-gb`, £, nav order swapped;
the old headless runs got `/`, $). Both headed runs (own Playwright Chrome and the shared real Chrome) were UK; the headless
runs also clicked an "Accept" consent button that the headed runs never saw (`consent` field in the raw files). The cause
(headless treated differently, or Chrome version, or consent state) is not proven. Consequence: the committed away.json nav
order and top-bar copy describe a US storefront a UK owner will not see.

### studionamma (https://studionamma.com)

No stated value changed (0 of 36). Scrollbar: none (`innerWidth == clientWidth` at 1440 and 375; the page scrolls in a smooth
wrapper). The diff shows only clock text (Paris, Los Angeles, Barcelona times) and the vertical position of the bottom-strip city
ticker (`cities_list` top 845 old, 825.6 new). Three cells embed those readings in their evidence (header-shell zone_model,
bar zone_model, bar secondary_blocks at 1440); they will differ in any two runs. At 375 the only differences are the same clocks
and `w-mod-touch` versus `w-mod-ix` in selector strings (iPhone versus desktop UA). `trigger.before.*` keys show as absent only
because the re-run reads fewer keys.

### Does the scrollbar (innerWidth versus clientWidth) change a derived label?

Yes, but only if the label is computed from `innerWidth`. Computed with `python <SP>\labels.py`:

| Ref | Tier | Element | Old headless | New headed, versus innerWidth (old rule) | New headed, versus clientWidth (new rule) | inner / client |
|---|---|---|---|---|---|---|
| lamalama | 1440 | pill | floating, 501px each side, centred | same | same | 1440 / 1440 |
| lamalama | 375 | pill | floating, 16px each side, centred | same | same | 375 / 375 |
| away | 1440 | #main-header | full-bleed, centred | no label (insets 0 / 15), not centred (-7.5px) | full-bleed, centred | 1440 / 1425 |
| away | 1440 | nav | 418.7px each side, centred | 411.2 / 426.2 unequal, not centred (-7.5) | 411.2px each side, centred | 1440 / 1425 |
| away | 375 | #main-header | full-bleed, centred | no label (insets 0 / 15), not centred (-7.5) | full-bleed, centred | 375 / 360 |
| away | 375 | logo | 142.5px each side, centred | 135 / 150 unequal, not centred (-7.5) | 135px each side, centred | 375 / 360 |
| studionamma | 1440, 375 | nav.nav-top strip | full-bleed, centred | same | same | equal |

So the rule already written into CAPTURE-PROTOCOL.md (derive from `clientWidth`) is the right one, and it recovers the same
labels the headless run produced. Sites that scroll the document (away, resn) are the ones affected. Raw pixel values
(inset 15px, header width) do change by the scrollbar width and should be recorded with both widths.

### Task A verdict

Headless did not distort the static cells much: 117 of 133 compared cells (88%) match. The 16 that differ are not
mainly a rendering effect. 7 are the missing scrollbar (away only, a 15px shift, harmless once labels use `clientWidth`);
8 are content or timing (a US storefront where a UK one is served, a rotating message caught empty, an entrance fade caught at
opacity 0); 1 is the user agent. The colour, typography, radius, z-index and structure cells matched everywhere. The two
findings worth acting on: away.json describes the US storefront, and lamalama's `ground.opacity: "0"` and 375 message height
0 are pre-intro readings.

## Task B. Cells headless could not measure

### B1. resn (https://resn.co.nz)

Environment: rAF 100 fps (headless 12). Classic scrollbar of 6px: `innerWidth / clientWidth` = 1440 / 1434, 768 / 762, 375 / 369.
Controls are ready about 10.5 to 10.9 s after navigation on a fresh load (`raw\resn-fresh.json`, `controlsReadyAfterNavMs`);
the site needs pointer movement before the controls appear (the scripts move the mouse while waiting).

| Question | Old (headless, software WebGL) | New (headed, real GPU) | Script / command |
|---|---|---|---|
| Does the menu button close the menu, 1440? | No; route stays `#!/menu` | No. Real click at the button centre (`elementFromPoint` returns the button), 1.5 s later hash still `#!/menu`, menu shown. | `bash run-resn.sh` -> `raw\resn-1440.json` `closers[0]` |
| Does the menu button close the menu, 768? | No (by dispatched click) | Cannot be tested with a real click: the canvas blocks it (below). | `raw\resn-768.json` |
| What does close the menu, 1440? | Droplet button, Escape, empty click, history back | Same four, all confirmed with real input. Menu element gone +482 ms (droplet), +484 ms (Escape), +508 ms (empty click); hash changes +8 to +12 ms. | `raw\resn-1440.json` `closers[*].timing` |
| What closes it, 768 desktop UA? | Escape and history back | Escape (menu gone +503 ms, hash +10 ms) and history back. Menu button, droplet and empty-area clicks do nothing (blocked). | `raw\resn-768.json` |
| What closes it, 375 desktop UA? | (old used iPhone UA) | Escape (menu gone +505 ms) and history back only. No `.js-shell__button--close` exists on a desktop UA. | `raw\resn-375.json` |
| 375 with the iPhone UA and real touch (CDP taps)? | Separate 26x26 close button; Escape and empty taps do nothing | Reproduced: tap on the menu button opens `#!/menu`; a 26x26 close button appears at (330, 25); tapping it returns to the home route. | `node resn-fresh.mjs` -> `raw\resn-fresh.json` run C |
| The 768 canvas that blocked real pointer input | Canvas at z-index 1005 over the controls; real clicks and hovers did not reach the button; "whether a real tablet behaves the same was not tested" | Reproduced headed, on a fresh load as well as after resizing: at 768 and 375 with a desktop UA, `elementsFromPoint` at the button centre returns `CANVAS z1005 pointer-events:auto` (762x900 at 768, 369x900 at 375). A real mouse click and a CDP touch tap both fail to open the menu; hovers reach nothing. NOT a headless artefact. With an iPad UA at 768 (mobile metrics + touch, set before load) no canvas covers the button and a tap opens `#!/menu` (`raw\resn-fresh-D.json`); an empty-area tap then closes it. So the block affects a desktop pointer at tablet and phone widths, not touch devices. | `node resn-fresh.mjs` (runs A, B, C), `node resn-fresh.mjs D` |
| Open animation, 1440 | Not captured (12 fps; only that the menu mounts in one frame) | Menu route mounted +11 ms after the click (hash `#!/menu`). The three item canvases are blank until +519 ms (About), +820 ms (Work, Contact), then build up: 50% of their settled pixel count at +1.0 to +1.1 s, 90% at +1.3 to +1.4 s, about 98% by +1.5 s, with a slow shimmer afterwards. Timing curve is a per-item pixel build (canvas 2D), stagger 300 ms. | `raw\resn-1440.json` `open.series` (per-frame lit-pixel counts) |
| Close animation, 1440 | Not captured | Canvas pixels start falling +43 ms after the click, are at 10% or less by +144 to +198 ms and at zero by +193 to +299 ms; the menu element is removed +482 to +508 ms after the click. | `raw\resn-1440.json` `closers[1,3,4].series` |

### resn header, measured headed

There is no `<header>`; the header is `div.js-shell` (0x0) holding separate fixed controls plus one link. Measured with
`node resn-headed.mjs 1440 | 768 | 375` (`raw\resn-<w>.json`, `home`, `hover`, `routes`, `sound`), `node resn-fresh.mjs`,
`node resn-click-list.mjs`, `node resn-project-btn.mjs`. Positions are viewport coordinates from `getBoundingClientRect`;
"inset" is the distance from the viewport edge (from the client edge it is 6px less on the right).

| Part | Size | 1440 position | 768 position | 375 position | Colour | Hover | Click | Visible |
|---|---|---|---|---|---|---|---|---|
| Menu button `div.js-shell__button--menu` | icon 18x18 (SVG), hit area 200x200 (60x60 on the iPhone UA), z 1000 | left 1393, top 20 (right inset 29, 23 from client edge) | left 721, top 20 (inset 29); iPad UA left 727 (inset 23) | desktop UA left 328, top 20; iPhone UA left 332, top 31, hit 60x60 | #ffffff (iPhone UA #000000) | A text label span fades in, opacity 0 to 0.935 within 0.8 s (label 65.4px wide, ending 12px left of the icon); cursor pointer | Opens the menu (`#!/menu`, +11 ms) at 1440. Blocked by the z1005 canvas at 768 and 375 with a desktop UA; works by tap with a touch UA. Does not close an open menu. | Always: home, menu open, every route |
| Droplet / home button `div.js-shell__button--drop` | 18x24 element with an 18x72 sprite canvas (25px tall on the iPhone UA), hit 200x200 | left 23, top 15 | left 23, top 15 | left 23, top 15; iPhone UA left 25, top 21, hit 60x60 | canvas painted #ffffff (iPhone UA #000000) | No computed change measured while hidden | Closes the menu or leaves the route and returns to home (menu gone +482 ms) | Menu open and inside routes (About, Work, Contact). On a fresh home it is `display:none` (0x0); after visiting a route it stays `display:block` with an empty canvas, i.e. nothing painted |
| Sound toggle `div.js-shell__button--sound` | 24x16 (72x16 sprite canvas), hit 200x200 | left 1387, top 863 (right inset 29, bottom inset 21) | left 715, top 863 | left 322, top 863 (absent on the iPhone UA) | #ffffff | The label "Audio" fades in, opacity 0 to 0.934, slides 2px left | Toggles audio; no DOM or canvas colour change measured | Always at desktop UA, in every state; not present with the iPhone UA |
| VIEW ALL PROJECTS `a.js-work__menu-list-btn` | 118.1x19.8 at 1440, 78.8x13.2 at 768 and 375; 9.9px Fort-Medium, uppercase, 0.99px tracking | left 660.9, top 82.1 (centred on the 1440 viewport) | left 344.6, top 61.4 | left 148.1, top 61.4 | #ffffff | A 1px underline slides in (`span.underline.animate` opacity 0 to 1) and the `.fade` underline drops 0.24 to 0.1; cursor pointer | Real click goes to `#!/work/all` (work page) | Home page and the Work route; not on About, Contact or the open menu |
| Close project / close all projects `div.js-shell__button--project` | 180x102 box; label 124x21, Fort-Medium 15px | left 1189, top 0, right 65px | not visited | not visited | label #e3e3e3 | none measured | Real click returns to home (`#!/`) | Only on `#!/work/all` (labels "Close Project", "Close Showreel", "Close All Projects" stack in the box) |
| Showreel `div.js-shell__button--reel` | 0x0 | display none in every state visited | same | same | n/a | n/a | not clicked | Not seen (a showreel route was not opened) |
| Close button `div.js-shell__button--close` | 26x26, hit 60x60 | not present | not present (iPad UA too) | iPhone UA only: left 330, top 25 while the menu is open | #000000 | n/a | Tap closes the menu | Menu open, iPhone UA only |

Old versus new for the same parts: menu button right inset was 23 in the headless run (no scrollbar) and is 23 from the client
edge (29 from `innerWidth`) headed; size 18x18, hit 200x200 (60x60 on the iPhone UA), the sound toggle at 24x16 and the
VIEW ALL PROJECTS box all match. New: the droplet's exact box (18x24 at 23,15) and the project button box, which the earlier
capture did not record.

Limits: the showreel and a single project route were not opened; the About, Work and Contact items are reachable only by real
click at 1440 (the 768 and 375 desktop-UA item clicks were blocked, so no route values exist there).

### B2. lusion (https://lusion.co)

`node lus-headed.mjs` -> `raw\lus-headed.json` (intro: per-frame log from navigation start via `addInitScript`; menu: real mouse
click on `#header-right-menu-btn`, per-frame sampling of `#header-menu` cards, `#header-background`, button fill and labels,
click time taken from a capturing `pointerdown` listener). Same tab, resized 1440, 768, 375. rAF at 94 to 100 fps.

| Value | Old (headless, about 1 fps) | New (headed) |
|---|---|---|
| Header controls intro, 1440 | "Took 40 s to settle"; source says about 2 s | Load event +0.51 s; controls exist from +0.37 s but sit 4em (56px) below the bar; `#preloader` gone at +5.19 s; the three controls slide up after it: sound starts +5.09 s and is level at +5.88 s, talk starts +5.19 s and is level at about +6.0 s, menu starts +5.29 s and is level at +6.08 s. So the header is usable about 6.1 s after navigation, about 0.9 s after the preloader clears (the 4em slide and the 0.1 s stagger match the source). The 40 s was software rendering, not the site. |
| Menu open, 1440 | Not observed; declared 0.5 s transitions only | `--opened` class +33 ms after the click. Cards (links, newsletter, labs; the Let's talk card is 0x0 at this width) start +87 / +106 / +147 ms (20 ms stagger), are settled +438 / +458 / +497 ms: each moves translateY 88 to 124 px to 0, rotates 3.5 or -3.5 degrees to 0, opacity 0 to 1. Scrim opacity 0 to 0.2, starts +59 ms, settled +377 ms. Button fill #e4e6ef to #ffffff settled +78 ms. MENU label slides out and CLOSE slides in (translateY -16.8 px) +68 to +277 ms. Everything settled by +497 ms. |
| Menu close, 1440 | Not observed | Class removed +8 ms. Cards start +88 / +128 / +148 ms (reverse order), settled +439 / +478 / +498 ms. The scrim waits: starts +439 ms and is settled +748 ms (the declared 0.4 s delay plus 0.4 s fade). Label swap back +48 to +261 ms. Everything settled by +748 ms. |
| Menu open / close, 768 | Not observed | Open: class +6 ms, links/talk/labs start +66 / +106 / +126, settled +416 / +456 / +477 ms; scrim 0 to 1 (full viewport) +37 to +346 ms; everything settled +477 ms. Close: class +9 ms, settled +749 ms (scrim delay as above). Newsletter card 0 high at this width, not animated. |
| Menu open / close, 375 | Not observed | Open: class +11 ms, links/newsletter/talk/labs start +69 / +89 / +109 / +129, settled +420 / +440 / +460 / +480 ms; scrim 0 to 1 +39 to +352 ms; everything settled +480 ms. Close: class +9 ms, everything settled +748 ms. |

A real click reached the menu button at every tier (`elementFromPoint` returned the button's own span or dots). The controls
do take about 6 s from navigation, not 40 s.

### B3. studionamma (https://studionamma.com): header while the preloader runs

`node sn-preloader.mjs` -> `raw\sn-preloader-1440.json` (nav strips sampled every 250 ms from the navigation start, 1440).

| Value | Old (headless) | New (headed) |
|---|---|---|
| Header state during the preloader | Strips at translateY -44.8 px (off-screen) at 0.5 s; -37.1 px at 8.3 s | First in the DOM +0.55 s (DOMContentLoaded +0.61 s), translateY -44.8 px (top at -24.8, off-screen) from then to +7.7 s; starts moving +7.9 s (-44.4 at +7.98 s, -38.6 at +8.23 s) |
| On screen | "About 8 to 9 s after load" | First on screen +8.49 s (-4.8 px); identity transform at +9.0 s. Load event at +9.5 s. |

Verdict: the preloader is a fixed-length timer, not frame-rate bound, so the headless figure (off-screen for about 8 s, in
place at 9 s) holds: the header is off-screen for about 8.0 to 8.5 s, then slides in over about 1 s.

## Anything only a headed run revealed

1. Scrollbars exist in a real desktop window: away 15px, resn 6px, lusion / lamalama / studionamma none (the old 1440 and 768
   headless runs had none anywhere). Widths, insets and centring must be read from `clientWidth`.
2. away serves a different storefront to the real Chrome (UK: £, `/en-gb`, nav order swapped, no consent banner in the headed
   runs) than the headless runs saw (US: $, `/`, banner clicked). The committed away.json describes the US one.
3. lamalama's committed pill `opacity: "0"`, the pending loader and the hidden contact card are pre-intro readings (the intro
   finishes about 8 s after navigation); the 375 message box height 0 was an empty rotating message.
4. lusion's 40 s header arrival was a software-rendering artefact: about 6.1 s headed, matching the source.
5. resn's 768 block is real, not a headless artefact, and it is specific to a desktop pointer: touch UAs (iPad, iPhone) are fine.
   A desktop user at 768 or 375 cannot open the menu with the mouse (the width at which the canvas starts covering the controls was not searched for).
6. resn's menu open takes about 1.3 s (per-item canvas build, staggered) and its close about 0.5 s; the earlier "12 fps" run
   could record neither.
7. A Playwright-launched headed Chrome at 375 rendered layouts 0.2px wider (`header` 375.2 px, cause not isolated); the
   shared real Chrome did not. Do not capture through a Playwright-launched window if sub-pixel widths matter.
8. resn's droplet button stays `display:block` after a route visit with nothing painted; "visible" has to be judged from the
   canvas pixels, not the display value.

## Re-run

1. `node <SP>\start-chrome.mjs` (starts the one Chrome), then, one script at a time: `sn-preloader.mjs`, `lama-static.mjs 1440`,
   `lama-static.mjs 375`, `lama2-static.mjs`, `lama3-static.mjs` (set `HEADED_MODE=desk`), `away-static-d.mjs`, `away-static-m.mjs 375`,
   `sbd-static.mjs studionamma 1440`, `sbd-static.mjs studionamma 375`, `lus-headed.mjs`, `bash run-resn.sh`, `node resn-fresh.mjs`,
   `node resn-fresh.mjs D`, `node resn-click-list.mjs`, `node resn-project-btn.mjs`.
2. Diffs: `python deepdiff.py`, labels: `python labels.py`. Rebuild the static scripts with `python build.py`.
3. `node <SP>\stop-chrome.mjs` closes the browser when the job is finished.
