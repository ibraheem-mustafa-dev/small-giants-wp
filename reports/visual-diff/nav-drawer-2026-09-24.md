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
