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
