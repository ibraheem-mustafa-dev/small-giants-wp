# Visual diff — sgs/choice-flow-question — 2026-09-15 (list layout + shared info-toggle + fatal fix)

verdict: PASS
intent_capture_passed: true
commit_sha: 60352480a (attribute rename to `layout`, list-layout CSS), 37f1ce89a (the fatal-error fix
this report exists to prove is actually fixed)

## Why before/after doesn't apply

`layout: "list"` is a net-new attribute value with no prior rendered state. The
`sgs_render_info_toggle()` extraction is a refactor with an EXPLICIT regression risk (a real
500 fatal shipped in the first deploy attempt of this exact commit — see below) — the only
meaningful check is "does the live page render correctly now", not a pixel diff against a
prior state that was itself already correct.

## ⛔ What actually happened first (disclosed, not smoothed over)

The first deploy of the `layout`/shared-info-toggle commit produced a live 500 error on any
option carrying `helpText`: `choice-flow-question/render.php` had never itself required
`render-helpers.php` (it never needed a shared helper before this change), so
`sgs_render_info_toggle()` was an undefined-function fatal. Confirmed via the server's
`error_log`/`wc-logs` and a direct `php -l` lint pass (both files syntax-clean — this was a
runtime autoload gap, not a syntax error). Fixed in `37f1ce89a` (added the missing
`require_once`), rebuilt, redeployed, and re-verified below. **This report is that
re-verification** — the earlier deploy attempt is why a first-attempt capture couldn't have
been trusted even if one had been taken.

## Assertions (stated before measuring)

1. `layout: "list"` renders every option as a full-width row with a small side-by-side image
   thumbnail (not the full-width 16:9 banner the grid layout uses).
2. `layout: "grid"` (default) is visually unchanged from before this commit.
3. An option with `helpText` set renders its `?` toggle and reveal panel correctly (via the
   new shared `sgs_render_info_toggle()` path) with NO fatal error.
4. An option with no `helpText` renders no toggle at all (unchanged contract).

## Live result — real canary, real interaction

Same test page as the choice-flow report above (one step `layout:"list"` with one imaged +
one help-texted option, one step `layout:"grid"`).

| Assertion | Result |
|---|---|
| List layout: side-by-side thumbnail rows | **Confirmed** — screenshot at 1440/768/375px, both options full-width, ~72px square thumbnail beside the label |
| Grid layout unchanged | **Confirmed** — step 2 (grid) renders as the pre-existing 2-column card treatment |
| Help toggle works, no fatal | **Confirmed** — page loaded (HTTP 200, no 500), clicked the `?` on "A gift box", panel revealed with the correct text, `aria-expanded` flipped to `true` |
| No-helpText option has no toggle | **Confirmed** — "Everyday cookies" (no `helpText`) renders no `?` button, only the image + label |

Page deleted after capture, per this session's convention.
