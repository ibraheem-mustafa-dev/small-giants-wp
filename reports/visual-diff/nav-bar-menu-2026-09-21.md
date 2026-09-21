# Live verification — sgs/nav-bar-menu — 2026-09-21 (Wave 3C U-1 commit 1: mega close delay reads submenuCloseGrace)

verdict: PASS
intent_capture_passed: true
source_sha: 3dddac89f78c5278
commit_sha: 677148215 (fix(nav): mega panel close delay reads submenuCloseGrace like the dropdown)

> `source_sha` is the `visual-report-sha.py` digest recipe applied to the committed bytes of the two
> block files in 677148215 (`DropdownSettingsPanel.js`, `render.php`); the script reads the git index,
> which is empty after the commit, so it was recomputed from the commit with the same recipe.

This change alters one value in the mega panel's interactivity context (`closeGrace`, previously a
literal 170) plus help text and a comment. It emits no CSS and changes no markup structure, so there
is no first-paint difference to capture. The intent asserted is behavioural: the setting now reaches
the mega panel.

## Environment and method

| Item | Value |
|---|---|
| Site | sandybrown canary, blocks plugin deployed with `build-deploy.py --target sandybrown --blocks-only --skip-build` (exit 0, live motion probes green) |
| Fixture | page slug `qa-hdr-mega-dropdown-drawer`, a real `sgs/site-header` with one mega item (megaId 1745) and dropdown items |
| Server-side render | `wp eval-file` under `domains/sandybrown-nightingale-600381.hostingersite.com/public_html`: `do_blocks()` on the fixture's stored content with `"submenuCloseGrace":59` injected, nothing saved |
| Unit test | `plugins/sgs-blocks/scripts/nav-qa/submenu-harness.php` (mega fork section) |

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Mega context carries the setting | PASS | live render: `{"isOpen":false,"megaId":"1745","intentDelay":300,"closeGrace":59}` |
| 2 | Dropdown context still carries the setting | PASS | live render: `{"megaId":"sgs-nav-bar-menu-...-sub-963fffe8",...,"closeGrace":59}` |
| 3 | Default unchanged when the setting is unset | PASS | live page `/qa-hdr-mega-dropdown-drawer/`: mega context `closeGrace":170` |
| 4 | Negative control: previous code ignores the setting | PASS | the same harness run against `git show 677148215^:plugins/sgs-blocks/includes/nav-menu-markup.php` fails 3 assertions (`got=170 want=59`, `got=170 want=0`, negative control) and passes on the fix (4 of 4) |

## Not measured

The close timing in a headed browser was not re-timed: `mega-disclosure.js::leaveBridge` already reads
`ctx.closeGrace` and is unchanged, so the value reaching the context is the whole change. Bean's eye
is not needed for this commit; the visible effect (a mega panel that closes after the configured delay
instead of a fixed 170 ms) is exercised in U-1's later live checks.
