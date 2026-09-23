# Live verification: sgs/nav-bar-menu, 2026-09-23 (U-1 commit 6, item hover paint)

verdict: PASS
intent_capture_passed: true
commit_sha: a8e537dc6

## Environment and method
- Site: eye-care-test, plugin deployed after a8e537dc6 (declared payload for another session's uncommitted google-reviews, `sgs-blocks.php` and `includes/helpers-slider-nav.php`, test site only).
- Fixture page 61 `/qa-nav-hover/`: a real header structure (`sgs/site-header` > `sgs/site-header-row` > `sgs/nav-bar-menu`) with `itemOpacity:1`, `itemOpacityHover:0.5`, `itemPaddingShiftHover:"8px"`, `submenuOpacity:0.6`, `submenuOpacityHover:1`, class `qa-hover-nav`, beside the site's own header as the control.
- One headed Chrome window at 1440x900, real pointer hover through chrome-devtools; values from `getComputedStyle`.

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | Resting item | PASS | `opacity: 1`, `padding-inline-start: 12px` |
| 2 | Hovered item | PASS | `opacity: 0.5`, `padding-inline-start: 20px` (12px + 8px) |
| 3 | Pointer moves away | PASS | back to `1` and `12px` |
| 4 | Negative control: the site header's own menu (no new attributes) hovered | PASS | `opacity: 1`, `padding-inline-start: 12px` |
| 5 | Touch guard | PASS | the rule applies with no `sgs-touch-input` class (mouse input), through `sgs_hover_state_rules` |

## Not measured
- `submenuOpacity` / `submenuOpacityHover`: this site's menu has no submenu items, so there was no sublink to measure; covered by `tests/php/run-nav-item-hover-paint-standalone.php` (59 passed) only.
- `panelCardLift` on `sgs/mega-panel` and the padding shift on mega and drawer items: no mega menu is set up on this site; PHP-tested only (the default reproduces the previous hardcoded `-3px`).
- Editor inspector round trip for the new controls was not clicked through.
