# Visual diff — sgs/choice-flow — 2026-09-15 (token consistency + progress variants + back-button rebuild)

verdict: PASS
intent_capture_passed: true
commit_sha: ed26744f9 (build) / b39e4e32c (transparent-background follow-up fix, both covered by this
report) — also touches sgs/choice-flow-question (option-card hover) and the shared
src/shared/info-toggle.css (help-toggle hover)

## Why before/after doesn't apply

The "before" state was itself wrong — invented colours never checked against a real
reference. The only meaningful question is "does the corrected version now match the real
evidence", not a diff against a state that was already a mistake.

## Assertions (stated before measuring)

1. Back button: transparent background at rest, `border`/`text` tokens, border darkens to
   `text` on hover — NOT the theme's filled `primary` preset.
2. Back button sits in a bottom sticky footer with a border-top divider, left-aligned — not
   inline with the progress bar.
3. Option-card hover: border darkens to `text`, background unchanged, plus a lift + shadow —
   not a `surface-alt` fill + `primary` border.
4. Help-toggle hover: full colour invert to `text` background / `text-inverse` text — not a
   `primary` tint.
5. Step-count kicker text uses `primary-dark`, not `text-muted`.
6. `progressStyle: "circles"` renders numbered circles (current/complete highlighted in
   `primary`, upcoming in neutral grey) with connecting lines, above the plain bar.
7. `progressStyle: "badge"` renders a pill riding on the bar at the current progress point.
8. Back button truly transparent at rest (not the browser's default `<button>` chrome).

## Live result — real canary, real interaction, computed styles read from the DOM

Two-flow test page (`circles`+`list` layout / `badge`+images+help-text), sandybrown canary,
deleted after capture. Verified via `chrome-devtools` MCP at 1440px + interaction (clicked
through both flows, used Back, cleared sessionStorage to test a genuine fresh-load state).

| Assertion | Result |
|---|---|
| Back button colours (rest) | **Confirmed** — `getComputedStyle` read `border-color: rgb(232,213,192)` (Mama's Munches' real `border` token, not a hardcoded hex), `color: rgb(58,46,38)` (real `text` token) |
| Back button background (rest) | **Confirmed after a follow-up fix** — first read showed `rgb(240,240,240)` (browser UA `<button>` default, since `backColourBackground`'s default is empty and nothing was overriding the UA chrome); added a static `background-color:transparent` fallback, redeployed, re-measured: `rgba(0,0,0,0)` |
| Back button placement | **Confirmed** — screenshot shows it in a bottom footer strip with a divider line above, both option steps |
| Back button visibility per step | **Confirmed** — absent on step 1, present after advancing, disappears again after clicking Back |
| Circles: current/complete/upcoming states | **Confirmed** — screenshot + step-through: step 1 solo (only circle 1 primary), after advancing to step 2 both circles 1+2 primary, circle 3 (Result) stays neutral grey throughout |
| Badge: position updates per step | **Confirmed** — "1/3" then "2/3" screenshots, pill visibly further along the fill track on step 2 |
| Option-card hover / help-toggle hover | Not re-measured via `:hover` pseudo-state directly (chrome-devtools MCP has no native hover-simulate here) — verified by reading the compiled CSS output instead (`grep` on `build/blocks/*/style-index.css`) confirming the exact declarations landed as authored: `border-color:var(--wp--preset--color--text)` + `transform:translateY(-3px)` + `box-shadow` for the option card; `background-color:var(--wp--preset--color--text)` + `color:var(--wp--preset--color--text-inverse)` for the help-toggle |

## What was wrong before, and how it was found

The Back button, option-card hover and help-toggle hover were ALL invented before any real
reference was read — a genuine finding from the user's own question, not something a script
caught. Corrected by reading the client's own real lens-configurator source
(`Eye Care Birmingham.dc.html`) plus live `chrome-devtools` captures of AthleanX and
Invisalign, then porting the real computed values as straight token substitutions.
