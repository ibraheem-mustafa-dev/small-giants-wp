# Live verification: where a surface sits (Wave 3C U-3 + U-8), 2026-09-25

verdict: PASS
intent_capture_passed: true
commit_sha: 9f3fc5071 (feat(nav): where a drawer and a menu panel sit); live-check fixes dd2db8a1f (panels centre on the visible width; the bridge uses the resting top)
design: `.claude/reports/2026-09-24-u3-u8-design.md`
blocks: nav-drawer, nav-bar-menu, nav-drawer-menu (nav-bar-menu and nav-drawer-menu reports point here)

## Environment and method
- Site: sandybrown, deployed with `build-deploy.py --target sandybrown` from an isolated worktree. Before the deploy, 24 stored flat `gap` values on sgs/nav-bar-menu and sgs/nav-drawer-menu were folded to `{desktop}` with `plugins/sgs-blocks/scripts/migrate-nav-gap-tier.php` (dry run 24, apply 24, `check` 0); the deploy's oldshape audit had refused the deploy until they were.
- Fixture: `plugins/sgs-blocks/scripts/nav-qa/qa-geometry-fixture.php exit-cells` on test header 3777 and test drawer 3778 (backups in `_sgs_qa_geometry_backup`; the older fixture backups' flat gaps were folded too, so a restore stays safe). Pages `/qa-scrim/` (active header and drawer) and `/qa-hdr-mega-dropdown-drawer/` (its own header with a mega item).
- One headed Chrome window (chrome-devtools), pages fully loaded, real clicks on the burger and the dropdown toggle, `getBoundingClientRect`, `getComputedStyle`, `document.elementFromPoint`. Page widths are `documentElement.clientWidth`.

## Results

| # | Family | Exit cell | Measured | Result |
|---|---|---|---|---|
| 1 | M-17 | away drawer 768: left 0, top 0, 390 x full height | modal, 817 wide page: left 0, top 0, 390 x 818 (the window's full height), `sgs-nav-drawer-slide-start-in`, a 1px primary line on the inline-end edge. Non-modal variant: top 83 = the burger row's bottom, height to the viewport bottom | PASS |
| 3 | M-17 | lusion drawer 375: edges equal the header container insets, directly under the header | 460 wide page (mobile tier): dialog left 23.99 / right 23.99 = the header row's measured content box 23.99 / 23.99; top 83 = the burger row's bottom (non-modal); 20px card corners | PASS |
| 5 | M-17 | lusion drawer 1440: trigger panel 12.8px below the burger, right edge on the burger | 1428 wide page: 13.08 below the burger (the burger's bottom is rounded to a whole pixel), right edge 0.1 from the burger's, 310 wide. Before this unit the gap was a fixed 8 | PASS |
| 7 | M-46 | lusion drawer 375: pitch 43.5 | with the gap at 0 the pitch is 43.99 (each row is the 44px touch target). The design's first mapping (gap 24) measured 68 and was corrected on the live page | PASS |
| 12 | M-16 | halcyon mega: centred, 10px below the header | mega panel on `/qa-hdr-mega-dropdown-drawer/` (no offset set): top at the header's bottom (-0.01), centred 0.01 from the page centre, 1120 wide. The dropdown on `/qa-scrim/` with a 10px offset: 9.99 below the header | PASS |
| 14 | M-16 | indus-foods More: a dropdown centred on the page | 0.99 from the page centre (200 wide) | PASS |
| 16 | M-20 | away callout tiles 273.6 x 350.8, side by side | `sgs/mega-links-with-tiles` rendered at 1428: two tiles side by side, 272 wide each (a 560px track, 16px gap); three link columns render two across in their 608px track (the container's own minimum column width, operator-tunable) | PASS |
| B | FR-41-11 | the hover bridge covers the item-to-panel gap | dropdown with U-5's fade-lift entry: bridge 37.74 against a 37.73 distance; `elementFromPoint` at 10%, 50% and 90% of the gap all hit the item. Mega panel: bridge 21.05 against 21.04 | PASS |

## Defects found and fixed during the check
- **Off-centre panels.** Centring used `window.innerWidth`, which includes a classic scrollbar: the dropdown sat 8 and the mega panel 7.01 right of the page centre (half the scrollbar, 7). Pre-existing for mega panels. Now `documentElement.clientWidth`: 0.99 and 0.01.
- **Short hover bridge.** The bridge was measured from the panel's rect mid-way through the fade-lift entry (8px up): 30.2 against a 37.7 distance, an 8px dead strip. Now sized from the panel's computed top: 37.74 against 37.73.
- **Nested grid containers set to full width lose their columns** (found while building the patterns; outside this unit): the column rule targets the content band that `contentWidth: full` removes, so the grid collapses to one track. The patterns use the default width; recorded in the plan for the container's owner.

## Negative controls
- Row 5 before this unit: the trigger panel's gap was a fixed 8 (`tRect.bottom + 8` in the pre-change store.js), now 13.08 from the 12.8 setting.
- Centring: 7.01 off before the fix, 0.01 after, same panel, same page.
- Bridge: 30.2 before the fix, 37.74 after, same dropdown.
- The standalone test `plugins/sgs-blocks/tests/php/run-u3-u8-geometry-standalone.php` (50) runs every source check against the pre-change commit b867a7fa1 as well, which must fail.

## Batched for the later pass (Bean: no heavy testing per edit)
`axe-run.mjs` with the side and container drawers open; the editor round-trip of the Panel position select, Gap above the panel, Item gap (per device) and Mega panels open from; Bean's eye on the three starter patterns once they have imagery.

## U-6 + U-7 (new item markup), 2026-09-25

verdict: PASS
commit_sha: 3aae1950c (feat(nav): new item markup); gate fixes 777ee5dd4 (Row extras labels, dead-API allowlist)
design: `.claude/reports/2026-09-25-u6-u7-design.md`
blocks: nav-drawer-menu, nav-bar-menu, mega-panel, icon-list

**Method.** Deployed with `build-deploy.py --target sandybrown --blocks-only` from an isolated worktree (checksums of `includes/helpers-item-effects.php` and `includes/nav-drawer-menu-items.php` match local). `qa-geometry-fixture.php restore`, then `plugins/sgs-blocks/scripts/nav-qa/qa-item-markup-fixture.php exit-cells` on test header 3777 and drawer 3778: the drawer menu points at menu 119 (`qa-hdr-nav`, holding the mega item "Brands", panel post 1745), plus one added page link (the homepage, page 2742, given featured image 3459 for the media cell; both tagged and undone by `restore`). Page `/qa-scrim/`, one headed Chrome window (chrome-devtools), real clicks and real pointer hover, `getComputedStyle`, `getBoundingClientRect`. Page widths from `documentElement.clientWidth`: 1439, 815 (tablet tier), 441 (mobile tier; the smallest this window reaches).

| # | Family | Exit cell | Measured | Result |
|---|---|---|---|---|
| 1 | M-30 | halcyon drawer: row separator 1px solid #16140a at 0.1 | existing bottom `itemBorderWidth` edge: border-bottom 1px (reported 0.909 at the page's 1.1 zoom), solid, `rgba(22, 20, 10, 0.1)`, top 0. A line also paints under the last row, as the design recorded | PASS |
| 2 | M-24 | wearecollins drawer: siblings drop to #4c4c4c while the hovered item keeps its colour, 0.7s on cubic-bezier(0.215,0.61,0.355,1) | hover on "Home page": the other four rows `rgb(76, 76, 76)`, the hovered row keeps its own hover colour `rgb(230, 138, 149)`; transition `0.7s cubic-bezier(0.215, 0.61, 0.355, 1)` | PASS |
| 3 | M-25 | lusion drawer: the text rolls up to a copy | hovered row: copy a `translateY(-100%)` (the two-line box, 52.8 = 2 x 26.4, wraps identically in both copies), copy b in place; each link's accessible name is read once ("Home", not "Home Home") | PASS |
| 4 | M-25 | lusion / studionamma trigger: MENU rolls to CLOSE while open | closed: button named "MENU"; open: named "CLOSE", `aria-expanded="true"`, copy a `aria-hidden="true"` and translated out, copy c `aria-hidden="false"` in place (WCAG 2.5.3) | PASS |
| 5 | M-22 | dogstudio drawer: two-digit index 01-05 at 1440 only | 1439: ornament shown, `::before` content `counter(sgs-ndm-item, decimal-leading-zero) / ""` at 12px on every row; 815 and 755: `display: none` | PASS |
| 6 | M-22 | lamalama / halcyon expander glyph turning when open | `itemExpanderRotate` 45: the open caret reads `matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)` | PASS |
| 7 | M-15, M-22 | studionamma drawer: the hovered link grows an inline thumbnail, width 0 to 160, height 112; others unchanged | at rest width 0; on hover 160 x 112, `cookies-stacked-5.jpeg` (the linked page's featured image); custom links render no media; 815 and 441: `display: none` | PASS |
| 8 | route 1 (Spec 36 FR-36-6) | away drawer: the mega item's panel inside its accordion | 441: "Brands" opens `ul.sgs-nav-drawer-menu__submenu > li.__mega-body > .wp-block-sgs-mega-panel.sgs-mega-panel--in-drawer`; its two link groups, the image aside and "View all Brands" are in the dialog; panel background transparent, no box-shadow, 0 radius, 0 border, no max-width, 0 padding, `container-type: inline-size` kept, content stacked in one column; no horizontal overflow; no duplicate `id` on the page. Screenshot `reports/visual-diff/u6-u7-drawer-mega-375.png` (local only; screenshots are gitignored) | PASS |

**Negative controls.** Each probe's pre-change value: `run-u6-u7-item-markup-standalone.php` runs the pre-change `nav-menu-markup.php` from acad7d5e0 and proves a mega item was a plain link with no ornament; live, the 815/441 tiers are the controls for rows 5 and 7 (the same page, the ornament and media absent), and the resting state is the control for rows 2, 3 and 7 (no dim, no translate, width 0).

**Not measured, named.** The icon-list number format (row 18 of the design) has no numbered list on this fixture; it is covered by the build's editor-parity gate and a render test is owed with the numbered compact-links pattern (Wave 3C plan, U-7 row). Away's 375 tile row (a two-up horizontal scroller) needs a mega post authored with `sgs/mega-links-with-tiles`; panel post 1745 is a columns preset. Batched for the later pass (Bean: no heavy testing per edit): axe with the drawer open, keyboard `:focus-visible` dim, reduced-motion emulation, the editor round-trip of the new controls.

### Follow-up fixes from Bean's review (5e8d0bb9f, 6a64c1992, 3458c9d5c)

| # | Defect (Bean) | Cause, proven | Fix | Live after |
|---|---|---|---|---|
| F1 | The drawer's scrollbar was the browser's grey default, and its arrows and bar stuck out of the rounded card | the dialog is the scroll container; `scrollbar-width`/`scrollbar-color` were `auto` (15px); Chrome on Windows keeps its arrow buttons under the standard properties and does not clip the bar to the corners | Chrome and Safari draw it through the `::-webkit-scrollbar` parts: no buttons, a transparent track inset 20px top and bottom, a rounded thumb in a 35% tint of the drawer's text colour (`--sgs-nd-scrollbar-ink` from render.php); Firefox keeps thin standard properties | 441 wide, "Brands" open: the bar is 10px and starts below the corner curve. A dark pixel on the card's top-right corner stays with the scrollbar hidden: it is the header's ✕ behind the card's rounded corner, not the scrollbar |
| F2 | A wheel over the open drawer closed it, even though the drawer could scroll | Lenis took the wheel and scrolled the PAGE, tripping close-on-scroll: six ticks over the drawer moved the page 719px and closed it; with the dialog opted out of Lenis, 0px and open | `smooth-scroll.js`: Lenis `prevent` hands any open `<dialog>` back to native scrolling | over the drawer: page 0px, drawer open; control, the same wheel over the page outside it: page 719px, drawer closed (close-on-scroll intact). Motion probes all green after the deploy (a first run hit a bad page load and read no effect markup; a rerun passed) |

## Two-bar burger (M-27 residue), 2026-09-25

Design `.claude/reports/2026-09-25-two-bar-burger-design.md`; commits a19a5c6ee, c16bcb949; deployed to sandybrown.
Fixture `plugins/sgs-blocks/scripts/nav-qa/qa-item-markup-fixture.php two-bar` (exit-cells plus `burgerBarCount: 2`,
`burgerMorph: x`, 450ms, `cubic-bezier(0.645,0.045,0.355,1)`). Checked on `/qa-scrim/` at 1440 in the chrome-devtools
window (1.1x zoom: `documentElement.clientWidth` 1295), by clicking the burger and sampling the bars with
`requestAnimationFrame`.

| Exit cell | Expected | Live |
|---|---|---|
| Bar count (wearecollins, halcyon, indus-foods) | 2 | 2 spans; icon `sgs-nav-bar-menu__burger-icon--two-bar`, box 8.49px tall |
| Bar spacing (halcyon, indus-foods: 1.5px bars, 5px gap = 6.5px centre to centre) | 6.5px | 6.51px (cy 122.44 and 128.95) |
| Morph timing (wearecollins) | 0.45s `cubic-bezier(0.645,0.045,0.355,1)` | computed `transition: transform 0.45s cubic-bezier(0.645, 0.045, 0.355, 1)`; mid-turn at 120, 225 and 350ms, settled by 600ms |
| X at open (wearecollins) | two bars crossed at ±45deg in the same slot | `matrix(0.707107, ±0.707107, …, 0, ±3.25)`; both opacity 1; centres 0.01px apart |

Screenshot (local, gitignored): `reports/visual-diff/two-bar-burger-open-1440.png`. Three-bar default: markup byte-identical to the parent
commit (`tests/php/run-burger-two-bar-standalone.php`, 23 of 23, negative control: the pre-change function given 2
still draws three bars). Recorded divergence: bar thickness 2px and width 24px against the references' 1.5px and 16
to 18px.

## U-4 (type scaling, cut to vw/vh units), 2026-09-25

Commit 61ae4cf99, deployed to sandybrown (all 120 fast gates, the 4 full gates and the 3 live motion probes green). The
fixture's `sgs/nav-bar-menu` (header 3777) was set to `itemFontSize: {desktop: 1.5}`, `itemFontSizeUnit: vw` on
`/qa-scrim/`, read in the chrome-devtools window, then the two keys were removed again (the pre-fixture backup has
neither).

| Window (`window.innerWidth`) | Expected (1.5%) | `.sgs-nav-bar-menu__link` computed font-size |
|---|---|---|
| 1309px | 19.635px | 19.6364px |
| 1636px | 24.54px | 24.5455px |

The server build carries the new unit list (`build/blocks/heading/index.js` contains `"vw","vh"`). The editor picker and
the heading preview fix join the batched editor round-trip pass.

## Link padding (`itemPadding`) and per-run deploy names, 2026-09-25

Commits 4cf0b9069 (setting), f06b7133f (generated rows), 7c61b7d16 (deploy script); deployed to sandybrown (120 fast
gates, 4 full gates, 3 live motion probes green). The deploy itself used the new per-run names
(`sgs-deploy-33728-1790309527.tar` and folder); afterwards the SSH home held no `sgs-deploy*` file and no `~/plugins`
or `~/theme` folder.

On `/qa-scrim/` at `window.innerWidth` 1636 (the bar shows; collapse is 1600), with header 3777's
`sgs/nav-bar-menu` set to `itemPadding: {desktop: 14px 24px 14px 24px}` and `itemPaddingShiftHover: 8px`:

| Check | Expected | Live |
|---|---|---|
| Resting link padding | 14px 24px 14px 24px | 14px 24px 14px 24px |
| `--sgs-nav-link-pad-start` | 24px | 24px |
| Hovered "Shop" link, padding-left (real pointer hover) | 24px + 8px = 32px (the old rule gave 12px + 8px = 20px) | 32px |
| Unhovered "FAQs" link, padding-left | 24px | 24px |

Both keys were then removed again (the fixture backup has neither). Test: `tests/php/run-nav-link-padding-standalone.php`
(7 of 7, negative control on d95f232c0). Deploy script: `--self-test` 16 of 16, plus a simulated second run whose
upload and unpacked folder survived this run's cleanup.

## U-10 + U-14 (header-row structure), 2026-09-25

Commits 0fbe085f1 (build), 96b375e53, d91764560, 5a511b9a6, 8baee8dee, 5781740e7 (DB rows and gate fixes); design
`.claude/reports/2026-09-25-u10-u14-design.md`. Deployed to sandybrown (build-deploy, motion probes green). Fixture
`plugins/sgs-blocks/scripts/nav-qa/qa-item-markup-fixture.php` cases `header-row` and `detach-chip` on `/qa-scrim/`
(header 3777, drawer 3778, menu collapse 1600), then put back to `two-bar`. Chrome window at 1440, `innerWidth` 1309
(1.1x zoom), logged in (admin bar 32px).

`header-row`: "Float over the page" at desktop, the top row's phone `sgsCollapseVisibility: hide`, its email `only`,
"Whole row opens the menu" at desktop with the burger magnet on.

| Family / check | Expected | Live |
|---|---|---|
| M-19 at 1636 (above collapse 1600) | phone shown, email hidden | phone `block`, email `none` |
| M-19 at 1309 (burger showing) | phone hidden, email shown | phone `none`, email `block` |
| M-52 header | fixed, under the admin bar, band passes clicks | `position:fixed`, `top:32px`, `pointer-events:none` |
| M-52 empty band point (top row, 5px in) | page content | a page modal trigger behind the header |
| M-52 negative control (band re-enabled) | the header | the header |
| M-52 logo centre | the logo's home link | home link |
| M-39 burger `::after` | the row's box | 1200 x 67.47 = the row, 1200 x 67.47; burger transform `none` with the magnet on |
| M-39 click at the row's empty middle | opens the drawer | hit the burger, drawer open, `aria-expanded="true"`; close: `false`, focus on the burger |

`detach-chip`: Sticky off at desktop, `triggerDetach` desktop on, after 330px, size 68.6, offset 48/32. The page was
lengthened by a test-only injected style (it is shorter than 400px of scroll).

| Check (buck's cells) | Expected | Live |
|---|---|---|
| scrollY 0 | no chip | hidden |
| scrollY 300: burger off screen (bottom -152), under 330 | no chip (buck: last non-fixed 300) | hidden |
| scrollY 360 | fixed chip 68.6 x 68.6, 48 from the side, 32 below the admin bar (buck: first fixed 360) | 68.6 x 68.6, right 47.5, top 64 (32 + 32), z-index 110, radius 9999px |
| Chip click | drawer opens, one open state | open; chip and header burger both `aria-expanded="true"` |
| Close | both closed, focus back on the chip | both `false`, focus on the chip |
| Back to scrollY 0 | no chip | hidden |

Batched for the later pass: axe with the drawer opened from the chip, keyboard order past the chip, editor round-trips
of the four new controls.

## Menu thumbnail as a short clip: closed by GIF, 2026-09-25

Bean: the menu "video" option is GIF-based. Checked on `/qa-scrim/` (`two-bar` fixture, drawer at 1440, `innerWidth`
1309): a 3-frame looping GIF (attachment 3945, 320 x 224) set as the linked page's (2742) featured image renders as the
drawer item's thumbnail from the full-size original (`qa-anim.gif`, natural 320 x 224, no srcset, no resized copy); the
served file has 3 graphic-control blocks and a NETSCAPE2.0 loop, so it plays. Restored: 2742's featured image back to
3459, the GIF deleted.

## Lane A batched QA pass, 2026-09-25

Scope: the plan's §4 U-6 + U-7 and U-10 + U-14 batched lists (everything lane A built). Fixture
`plugins/sgs-blocks/scripts/nav-qa/qa-item-markup-fixture.php` on `/qa-scrim/` (header 3777, drawer 3778, menu
collapse 1600), cases `two-bar` then `detach-chip` (after `restore`), put back to `two-bar` at the end. Headless
Playwright for axe and reduced motion; one headed Chrome (chrome-devtools, `innerWidth` 1309 at 1440, 1.1x zoom,
logged in) for keyboard and the editor. Four defects found, fixed in d954c83f8 and deployed.

### 1. Accessibility

| State | Command | Result |
|---|---|---|
| Drawer from the header burger, 1440 and 375 | `axe-run.mjs <qa-scrim> --open ".sgs-site-header .sgs-nav-bar-menu__burger" --scope ".sgs-nav-drawer" --viewport 1440` (and 375) | guard PASS (360 x 392, 19 focusable; 343 x 373 at 375), 0 violations |
| Drawer from the detaching chip | `detach-chip` fixture; `axe-run.mjs ... --height 450 --scroll 380 --open ".sgs-nav-bar-menu__detach button" --scope ".sgs-nav-drawer" --viewport 1440` | guard PASS, 0 violations |
| Negative control | same at `--scroll 300` (under the 330 threshold) | UNMEASURED: chip not visible (correct) |
| The chip itself | `--scope ".sgs-nav-bar-menu__detach" --require-open` | 69 x 69, 0 violations; axe `incomplete`: color-contrast 1:1 (defect 3) |
| Scroll sideways row at 375 | temporary page 3952 from `sgs/mega-links-with-tiles`, tiles grid `scrollSideways {mobile:on}`, `scrollItemWidth {mobile:236px}` | row `display:flex`, `overflow-x:auto`, snap `x mandatory`, items 236 + 236 in 285 visible (scrollWidth 488); 1440 grid unchanged (272px 272px). Focus ring clipped (defect 2) |

`/qa-scrim/` is 842px tall, so the chip threshold is reachable only in a window of about 480px or less; `axe-run.mjs`
gained `--height` and `--scroll`, and `openness-guard.mjs::scrollTriggerIntoView` no longer centres a trigger inside a
fixed box (centring the chip scrolled the page back above 330px).

Keyboard (headed, `detach-chip`, scrolled to 449): the chip is the last stop in the tab order (it prints on
`wp_footer`, after the footer's links); the header burger keeps its place in the header, so the order stays
operable (WCAG 2.4.3). Tab from the last footer link lands on the chip with a visible ring, 47.5px from the side and
64px from the top (32 + the 32px admin bar: the logged-in offset works). Enter opens the drawer, focus moves to its
first link, both openers read `aria-expanded="true"`, the page does not move; Escape closes it and returns focus to
the chip. Sibling dim by keyboard did NOT fire (defect 1).

A partly visible item in a Scroll sideways row is not scrolled into view when it takes focus (the focused button
showed 37px of 236). Proven browser behaviour, not SGS: a plain page with the same CSS and no scripts does the same
in every variant (snap on or off, `overflow-y` hidden or not); Chrome scrolls a row only when the focused item is
entirely out of view. It passes WCAG 2.1 AA and 2.2's 2.4.11 (focus must not be entirely hidden).

Reduced motion (Playwright `reducedMotion`, every animation that starts within 1.5s of the click recorded):

| Opener | No emulation (positive control) | `prefers-reduced-motion: reduce` |
|---|---|---|
| Header burger | 14 moving animations (bars 600ms, label roll 300ms, scrim 300ms, drawer slide 300ms) | 0 moving; drawer open, `aria-expanded="true"`, bars crossed, "Close" shown |
| Detaching chip | 20 moving animations | 0 moving; same end state |

### 2. Editor round-trips

Page 3953 (temporary), built through the editor by `scripts/wp-build-page.js` with default copies of `sgs/site-header`
(row, `sgs/business-info`, `sgs/nav-bar-menu` ref 119), `sgs/nav-drawer` (`sgs/nav-drawer-menu`), `sgs/icon-list`,
`sgs/container` and `sgs/heading`. Every new control was set through its own inspector control (the input events a
user's typing fires), the post saved, the editor reloaded, and every block's attributes compared with the snapshot
taken before the save.

| Unit | Controls set, and the stored value |
|---|---|
| U-9/U-11 | "Allow multiple sections open at once" (`accordionExclusive:false`), "Close on scroll" 120, close button "Show as" Both (`closeStyle {desktop:icon-and-text}`), "Position" Start (`closePlacement {desktop:top-row-start}`), "Nudge" 12/8 (`closeOffset {desktop:{x:12,y:8}}`), "Corner radius" 6 (`closeRadius {desktop:6px}`) |
| U-5 | drawer animation curtain (`entryAnimation {desktop:curtain}`), opening 500, closing 250, fade on, dim fade 300, item stagger 40, travel 24 (`{desktop:24}`), leave in turn on, curtain colour `primary`; menu panel opening 420, closing 260, item stagger 30 |
| U-6/U-7 | drawer menu: mega items as Link, Number ornament (`{desktop:index}`), ornament 12px and gap 10px, expander turn 45, featured image Always (`{desktop:always}`) 160 x 112 radius 8, dim opacity 0.6, dim colour `primary-dark`, roll up, effect speed 700; bar: roll up, effect speed 450, "Word on hover" Open, "Word while open" Close |
| Burger Bars | Two (`burgerBarCount 2`) |
| Link padding | preset 30 on all sides (`itemPadding {desktop:{…var(--wp--preset--spacing--30)}}`) |
| `vw`/`vh` units | the unit list offers `vw` and `vh`; 2vw on the menu, 4vw on the heading |
| Heading preview | 4vw on a 1015px canvas previews at 40.58px (4% = 40.60) |
| U-10/U-14 | phone block "When the menu collapses to a burger" Hide (`sgsCollapseVisibility:hide`); header "Float over the page" (`headerPassThrough {desktop:on}`, an optional item in the Header behaviour ⋮ menu); "Whole row opens the menu" (`triggerSurface {desktop:on}`); "Detach when the header scrolls away" with 330 / 69 / 48 / 32 (`triggerDetach*` per device; the size slider moves in whole pixels, so buck's 68.6 is 69) |
| Icon-list | Description "A short line under the link" (on item 1), Description colour `primary`, description font size 13px, Numbered with "01, 02, 03" (`numberFormat:decimal-leading-zero`), dim 0.5 with colour `border-subtle`, roll up |
| Container | Scroll sideways on at the previewed device (`{desktop:on}`), Item width 236 (`{desktop:236px}`); the canvas previews a 236px scrolling row |

After save and reload: 11 blocks, none invalid, nothing dirty, and every value above identical EXCEPT the three custom
font sizes: `itemFontSize 2 → []`, `descriptionFontSize 13 → []`, `fontSize 4 → []` (defect 4).

### Defects found and fixed (d954c83f8)

1. **Keyboard sibling dim never fired** (drawer menu and icon-list). The keyboard rule was
   `list:has(> item:has(:focus-visible))`; a `:has()` inside a `:has()` is invalid, so the browser dropped the rule
   (served once, parsed 0 times; the hover rule parses). Now `list:has(> item :focus-visible)`.
2. **Focus ring clipped in a Scroll sideways row** (ring bottom 774.5, row bottom 770.5 at 375). The row gains 8px of
   block padding with a matching negative block margin, added to any band padding or margin. The inline start is
   still clipped on the first item at rest (the same trick sideways would override the row's `margin-inline:auto`
   centring); the ring stays visible on three sides, which passes 2.4.7.
3. **See-through chip** (glyph `rgb(58,46,38)` over a footer of the same colour, 1:1). buck paints a filled round
   shape once the button detaches; Bean chose option a: an empty chip background paints the opaque surface token.
4. **Custom typography sizes lost on reload.** Every per-device default `{}` reaches the editor as `[]` (WordPress
   passes block defaults through PHP); `TypographyControls.js::isTieredValue([])` was false, so the control wrote a
   flat number into an object attribute and WordPress dropped it. An empty list now counts as an empty tier object.

### Live after the deploy

d954c83f8 deployed to sandybrown with `build-deploy.py` (all gates; motion probes 3 of 3 green). The first attempt was
stopped by the oldshape audit, which found this pass's own round-trip page 3953 still holding the three flat font sizes
the old control wrote; the page was deleted and the second run went through.

| Fix | Live check | Result |
|---|---|---|
| 1 keyboard dim | parsed rules matching `sgs-nav-drawer-menu__bar:has(> .sgs-nav-drawer-menu__item :focus-visible)`; Tab into the open drawer | 1 rule parsed (0 before); the focused item keeps its colour, siblings `rgb(76,76,76)` (#4c4c4c) |
| 2 ring room | the tiles row at 375, a tile's button focused by Tab | row padding 8px, margin -8px; ring 716.5 to 774.5 inside the row 674.2 to 778.5 (clipped 4px before); items still 236px |
| 3 chip fill | the chip at scrollY 392 over the footer, axe on the chip | background `rgb(251,243,220)` (the surface token), 0 violations and 0 needs-review (color-contrast 1:1 before) |
| 4 typography | fresh page 3960 built by `wp-build-page.js`; 4vw on `sgs/heading` and 13px on the icon-list description typed through the control; save, reload | stored `{desktop:4}` vw and `{desktop:13}` px (bare numbers before), both kept after reload, blocks valid, nothing dirty; canvas 40.58px; frontend collected CSS `.sgs-hdg-….wp-block-sgs-heading{font-size:4vw;}` and `….sgs-icon-list__description{font-size:13px;}` |

Cleaned up: pages 3952, 3953 and 3960 deleted; fixture `restore` then `two-bar`.

### U-3 + U-8 placements (added to the pass)

Fixture: item-markup `restore`, then `qa-geometry-fixture.php exit-cells` (drawer `anchor` trigger / side-start /
container by tier, menu gap 14px then 0 at mobile, dropdowns and mega panels page-centred), then `restore` and
item-markup `two-bar` again.

| State | Result |
|---|---|
| axe, 390px side panel at 768 | guard PASS (390 x 1200, 10 focusable), 0 violations |
| axe, header-content panel at 375 | guard PASS (327 x 383, 10 focusable), 0 violations |
| axe at 1440 | the burger is hidden at desktop in this fixture (UNMEASURED, correct); the page-centred dropdown opened by keyboard: 1 serious color-contrast, see below |
| Editor round-trip (page 3972, deleted) | drawer "Panel position" (`anchor {desktop:trigger}`; `side-end` and `container` also offered and stored), "Gap above the panel" 12px (`anchorOffset {desktop:12px}`, an optional item in the Drawer ⋮ menu); bar "Item gap" 20 (`gap {desktop:20px}`), "Open from" page-centred (`submenuAlign`, a string by design), "Mega panels open from" full width (`megaAlign {desktop:full-width}`), "Distance below the bar" 10 (`submenuTopOffset 10px`). After save and reload: no differences, no invalid blocks, nothing dirty |

Open finding, not changed in this pass: a bar dropdown's links default to the palette's `primary` colour
(`plugins/sgs-blocks/includes/nav-menu-submenu-css.php`, the `__sublink` base rule), so on Mama's Munches (primary
`#e68a95`) they read 2.24:1 on the cream surface `#fbf3dc` at rest (4.5:1 needed). Focus turns them `text`, which
passes. The drawer's sublinks already default to `text`. Decision for Bean (close-out).
