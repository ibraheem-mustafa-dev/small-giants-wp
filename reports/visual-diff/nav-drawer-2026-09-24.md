# Live verification: how a menu closes (Wave 3C U-9 + U-11), 2026-09-24

verdict: PASS
intent_capture_passed: true
commit_sha: c36105939 (feat(nav): how a menu closes)
design: `.claude/reports/2026-09-24-u9-u11-design.md`
blocks: nav-drawer, nav-bar-menu, nav-drawer-menu (nav-bar-menu and nav-drawer-menu reports point here)

## Environment and method
- Site: sandybrown, deployed with `build-deploy.py --target sandybrown` from an isolated worktree at c36105939 (full build: 124 of 124 fast gates, postbuild, live motion probes green). Before the deploy, eight stored `sgs/nav-drawer` posts (3685 to 3691, 3695) were migrated from a flat `closeStyle` to `{desktop}` with `migrate-stored-tier-scalars.py` (survey 8 FLAT, 0 needing a decision; `--check` clean; each post re-read from the live site after writing).
- Fixture: active test header 3777 and test drawer 3778, set per case by a `wp eval-file` fixture (bodies backed up in post meta `_sgs_qa_close_backup`, restored after the pass). Page `/qa-scrim/` (3843), which has no drawer of its own, so the active drawer renders; the `qa-hdr-drawer-submenus` page carries its own drawer block and was not used.
- One headed Chrome window (chrome-devtools), 600 x 900 unless stated, pages fully loaded, real clicks on the burger, `getComputedStyle` / `getBoundingClientRect` / `document.elementFromPoint`.

## Results
| # | Family | Check | Result | Measured |
|---|---|---|---|---|
| 1 | M-27 presence | non-modal, `closeStyle {desktop: trigger}`, open by the burger | PASS | dialog not `:modal`; `data-sgs-nav-opener-live` set; drawer x `display:none`; burger `aria-expanded="true"` and topmost at its own centre |
| 2 | M-27 presence, negative control | same `trigger`, modality `modal` | PASS | `:modal`; no liveness flag; x `display:flex`, 44 x 44, `aria-label="Close menu"` |
| 3 | M-35 focus | focus on open with the x hidden | PASS | focus on the first drawer menu link, not the hidden x |
| 4 | M-27 motion | `burgerMorph x-rotate`, 600ms, quart-out | PASS | icon box `matrix(-1,0,0,-1,0,0)` (180 degrees); bars X-crossed; transition `transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)` on bars and icon box (dogstudio's curve and duration) |
| 5 | M-27 placement | modal, `same-slot`, offset (4, -0.5), radius 12px (halcyon) | PASS | x centre minus burger centre = (4, -0.28): within the 2px tolerance (the y variable is written in whole px); radius 12px; x focused on open |
| 6 | M-34 close on scroll | `closeOnScrollDistance 24`, non-modal | PASS | page not scroll-locked (`body` static); a 40px programmatic scroll: stays open; wheel-led 7px: stays open; wheel-led 37px: closes, flag cleared, focus back on the burger |
| 7 | M-40 resize (DEC-09) | open at 600, resize to 720 (no crossing), then 1100 (crosses collapse 768) | PASS | open at 720 (negative control); closed at 1100 with the burger hidden; focus on a live header control, not `<body>` |
| 8 | M-47 accordion | `accordionExclusive false` | PASS | the drawer's `<details>` carries no `name` (0 of 1 named); the test menu has one submenu, so two-open-at-once was not exercised live (unit-tested) |
| 9 | M-10 magnet | `itemMagnetStrength 0.16`, pointer 80px right of an item's centre, 1100 wide | PASS | label `translateX` 12.76px against 80 x 0.16 = 12.8 (the old 8px cap would have stopped at 8) |
| 10 | M-36 trigger | burger semantics | PASS | `<button>` with `aria-expanded` toggling and `aria-controls="sgs-nav-drawer"` resolving to the dialog |
| 11 | Screenshots | non-modal trigger case; modal case | PASS | local only (scratchpad): burger X in the header, no x in the panel, page behind dimmed by the U-2 scrim |

## Not measured / known limits
- The wheel events in #6 and the pointer move in #9 were dispatched by script (`WheelEvent` + scroll; `mousemove` with an off-centre `clientX`); the chrome-devtools tools have no wheel or off-centre hover.
- `axe-run.mjs` with the drawer open was not run (it launches its own browser; one window was kept). Owed, with the U-2 forced-colours check.
- Tablet tier values, the `line` and `none` poses, `top-row-start`, and an always-burger bar (collapse above every width) were not exercised live; all are unit-tested (`run-close-control-standalone.php` 29/29, `run-burger-morph-standalone.php` 71/71, `nav-close-store.test.mjs`).
- Editor round-trip of the new controls (set, save, reload in the real editor) was not done this pass. Owed.
- Bean's eye (R-31-13): owed on the two screenshots.

## Bean's feedback pass (commit 033b783ad, deployed to sandybrown)

Page `/qa-scrim/` (Active header 3777, Active drawer 3778: non-modal, `anchor {trigger}`, `closeStyle {desktop: trigger}`), one headed Chrome window (chrome-devtools; Playwright was held by another session), 441px layout width.

| # | Bean's item | Before (measured) | After (measured) | Result |
|---|---|---|---|---|
| F1 | Gallery lightbox dim is pink | scrim `primary-dark` #c56a7a at 0.9 | scrim `::before` `rgb(0,0,0)` at opacity 0.9; dialog itself transparent | PASS |
| F2 | Lightbox does not close on an outside click | no backdrop handler existed | real click on the image: stays open (negative control); real click on the lightbox body behind the image: closes, body scroll-lock class removed, scrim opacity 0 | PASS |
| F3 | Basket trigger has a white fill and black outline | `<button>` at UA defaults: fill rgb(240,240,240), border 1.8px outset black | fill transparent, border 0 | PASS |
| F4 | Drawer is a part-width card not touching the right edge | by design: `anchor trigger` hangs a 360px card from the burger (top = burger bottom + 8, right edge = burger's right edge) | unchanged; answered, not a defect | n/a |
| F5 | Drawer sits under the header and its buttons | drawer z 90 < header z 100; the header's second row (to 127px) painted over the drawer from 80px | drawer z 101; the point in the old overlap band (237,104) hits `.sgs-nav-drawer__body`; the burger still hit-tests to itself, `data-sgs-nav-opener-live` still set | PASS |
| F6 | Empty band where the hidden x was | body `padding-top` 64px with the x `display:none` | body `padding-top` 27.27px (the normal body padding); first link 27px below the panel top; panel 381px tall (was 417) | PASS |

Screenshot: `fb-drawer-after.png` (scratchpad): panel over the header's phone row, burger X on top, no empty band, basket icon plain. Bean's eye owed (R-31-13).

## Close without the × reappearing (commit d3c5ee548, deployed to sandybrown)

| # | Check | Result |
|---|---|---|
| F7 | Closing the trigger-mode drawer no longer brings the hidden × and its 64px top row back during the exit animation (the opener-live flag now clears in `onNativeClose`, after the dialog closes) | PASS: Bean tested it in the live window and confirmed the fix. Measured before the close: flag set, × `display:none`, body `padding-top` 27.27px. The per-frame recording of the close itself was not completed (the recorder ran out before the click); Bean's live check closes it |
