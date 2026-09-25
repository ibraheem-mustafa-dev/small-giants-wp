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
