# Live verification: sgs/container, 2026-09-25 (Scroll sideways)

verdict: PASS
intent_capture_passed: true
commit_sha: 85ddc09a1 (feat(container): Scroll sideways), 119247a82, a71fde293 (gate fixes), role rows committed separately

Design `.claude/reports/2026-09-25-container-scroll-sideways-design.md` (Bean option a1). Deployed to sandybrown
(build-deploy, all gates, motion probes green, including Lenis `allowNestedScroll`).

`plugins/sgs-blocks/tests/php/wp-eval-container-scroll-row.php` on sandybrown: 4 of 7 before the deploy (the row
checks 3 to 5 failed), 7 of 7 after.

`sgs/mega-links-with-tiles` on a temporary draft page (3946, deleted after), its tiles grid set to
`scrollSideways: {desktop: off, mobile: on}`, `scrollItemWidth: {mobile: 236px}` (away / drawer / 375: two callouts
236 x 338.8 in a 375px drawer):

| Check | Phone width (innerWidth 455, 1.1x zoom) | Desktop (innerWidth 1309) |
|---|---|---|
| Row display / direction / wrap | flex / row / nowrap | grid |
| Snap | x mandatory, tiles `start` | none |
| Tile widths | 236, 236 (away's 236) | 272, 272 (the grid's two columns) |
| Row client / scroll width | 351 / 488: scrolls | 560 / 560 |
| A sideways scroll | moved 0 to 137 and snapped | n/a |
| Page sideways overflow | none | none |

Batched for the later pass: the editor round-trip of the two new controls, axe on the row (it holds buttons, so it is
keyboard-reachable), focus-ring clipping under `overflow-y:hidden`.
