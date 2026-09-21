# Live verification — sgs/nav-bar-menu — 2026-09-21 (Wave 3C U-1 commit 1: mega close delay reads submenuCloseGrace)

verdict: PASS
intent_capture_passed: true
source_sha: a0a7244ad1c02e82
commit_sha: be1be25da (U-1 commit 5). The commit-1 section below was certified against the two files of 677148215 (digest 3dddac89f78c5278)

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

---

# U-1 commit 5: hover-intent delay and click-only open mode

Change: `sgs/nav-bar-menu` gains `submenuIntentDelay` (number, default 80, 0 to 400) and `submenuOpenOn`
(`hover` | `click`, JSON enum mirrored by the PHP allow-list). Both forks carry `intentDelay` and `openOn` in
their interactivity context. `mega-disclosure.js` deletes its 80 ms clamp; in `click` mode hover neither opens
nor closes a panel. Spec 36 FR-36-4 is amended in the same commit.

Fixtures (sandybrown, real `sgs/site-header`): page 3808 `qa-hdr-open-click` (`submenuOpenOn: click`) and page
3817 `qa-hdr-open-delay` (`submenuIntentDelay: 400`). Browser: real headed Chrome, one window, page fully
loaded, real pointer input (chrome-devtools `hover` / `click` / `press_key`), timings read from an in-page
`MutationObserver` on the trigger's `aria-expanded` so tool latency does not enter the numbers.

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 6 | The delay attribute reaches the live context | PASS | 3817: `data-wp-context {"intentDelay":400,"closeGrace":170,"openOn":"hover"}`; 3808: `{"intentDelay":80,...,"openOn":"click"}` |
| 7 | Hover opens after the configured delay | PASS | 3817, real hover on Brands: `mouseenter` to `aria-expanded=true` = **413 ms** (setting 400; the previous code would have opened at 80 ms) |
| 8 | Click mode: hover does not open | PASS | 3808, pointer resting on the Brands root (`:hover` true) for 900 ms: `aria-expanded` stays `false`, no mutation logged |
| 9 | Click mode: click opens | PASS | real click: `aria-expanded=true` |
| 10 | Click mode: leaving does not close | PASS | pointer moved onto the Blog link (Brands root `:hover` false, Blog `:hover` true) for 900 ms, well past the 170 ms grace: still `true` |
| 11 | Click mode: Escape closes | PASS | Escape: `aria-expanded=false` (mutation log `[true, false]`) |
| 12 | Unit tests | PASS | `scripts/nav-qa/submenu-harness.php`: 9 new assertions for both forks (values, defaults, 400 bound, unknown `openOn` falls back to hover); the same harness against the previous `nav-menu-markup.php` fails all 9 (`got=300`, `openOn NULL`) |

Not measured: touch and keyboard paths (unchanged code); the hover paint on a dropdown trigger in click mode is
ordinary hover feedback (the open state is keyed only on `aria-expanded`), not gated.
