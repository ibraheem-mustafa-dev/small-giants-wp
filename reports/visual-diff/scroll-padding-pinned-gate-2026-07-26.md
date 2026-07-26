# Verification — `--sgs-header-height` gated on the header actually being pinned

**Date:** 2026-07-26
**Commit:** `5716f7b7` (branch `main`)
**FR:** Spec 37 FR-37-40, Task 1 of the approved sticky build (D389)
**File changed:** `plugins/sgs-blocks/src/header-behaviours/view.js` (only)
**Canary:** sandybrown-nightingale-600381.hostingersite.com, active header CPT 1570

## Why this is not a visual-diff case

No block `render.php`, `block.json`, `edit.js`, `save.js` or `style.css` was touched. The
change is confined to the frontend behaviour script's F1 height publisher. The pre-commit
visual-diff gate did not fire and no `--no-verify` bypass was used — the commit landed
through the normal hooks (cheat-gate, F5, F6 all green).

The *rendered* change is deliberately invisible in a screenshot: it removes dead space from
the top of programmatic scrolls. It is verified by computed values and landing positions
below, not by pixels.

## The defect

`assets/css/header-behaviours.css:26-28` applies
`:root { scroll-padding-top: var( --sgs-header-height, 0px ) }` unconditionally, and
`view.js` published `--sgs-header-height` unconditionally ("F1 — always publish"). Nothing
gated either on whether the header is pinned.

So on a page whose header is NOT pinned, the full header height was reserved at the top of
every programmatic scroll: in-page anchor links, fragment navigation on load, find-in-page,
every `element.scrollIntoView()`, keyboard focus scrolling, and scroll-snap.

The CSS fallback cannot fix it: `var( --x, 0px )` fires only while the property is
UNDEFINED, never when it is defined-but-should-be-zero. The zero has to be published.

## The fix

JS only. `assets/css/header-behaviours.css` is unchanged — the CSS line is correct and
cause-agnostic, and W3C technique **C43** is a listed *sufficient* technique for WCAG
2.4.11/2.4.12 including keyboard Tab focus.

- **`isHeaderPinned()`** reads the **computed** `position` and treats `sticky`/`fixed` as
  pinned. Measured, never inferred from the `sgs-header-behaviour-sticky` body class —
  see the collision result in state 5 below.
- **`initHeightPublisher()`** keeps the last measured border-box height separate from the
  gate, so a pinned↔unpinned flip republishes immediately, and routes height-or-explicit-`0px`
  through one path (including the no-`ResizeObserver` degradation path).
- An **rAF-coalesced `resize` listener** was added: crossing a breakpoint can change the
  header's `position` without changing its border-box height, so the `ResizeObserver` alone
  is not sufficient.

## Deploy verification (checksum, not the HTTP-200 leg)

`build/header-behaviours/view.js`
local `291d29a40769a9686858f02f699a5f80` == server `291d29a40769a9686858f02f699a5f80`. **MATCH.**

(STOP-VERIFY-DEPLOY-BY-CHECKSUM — the deploy script's "HTTP 200, markers present" leg passes
on any working SGS page, including one running last week's code.)

## Live evidence — state machine (desktop, 1309px viewport, header 93px)

| # | State | computed `position` | published | computed `scroll-padding-top` |
|---|---|---|---|---|
| 1 | resting | `relative` | `0px` | **`0px`** |
| 2 | **negative control** — pre-fix publish emulated by hand | `relative` | `93px` | **`93px`** |
| 3 | gate republishes over the stale value | `relative` | `0px` | **`0px`** |
| 4 | `sgs-header-behaviour-sticky` applied | `sticky` | `93px` | **`93px`** |
| 5 | sticky **AND** transparent applied | `absolute` | `0px` | **`0px`** |
| 6 | restored | `relative` | `0px` | **`0px`** |

**State 2 is the negative control** (STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS): setting
the property by hand moves `scroll-padding-top` to 93px, which proves the CSS chain is live
and the `0px` in state 1 is the gate acting — not a broken selector reading as a pass.

**State 5 is why the gate measures rather than reads the class.** `header-behaviours.css`
sets `position: sticky !important` for sticky (`:39`) and `position: absolute !important`
for transparent (`:52`) — equal specificity, both `!important`, transparent later in source
order. A header carrying BOTH classes therefore computes `absolute` and scrolls away. A
class-based gate would publish 93px for a header that is not pinned; the computed-position
gate correctly publishes `0px`.

## Live evidence — anchor landing (the acceptance criterion)

Real in-page target `#sgs-text-ca1ccd5d` at document top 1784px, `scroll-behavior: auto`,
350ms settle each way.

| State | `scroll-padding-top` | target's viewport top after the hash jump |
|---|---|---|
| not pinned | `0px` | **0** — flush |
| pinned (93px header) | `93px` | **93** — directly below the pinned header, not under it |

Before the fix the not-pinned case landed 93px too low (252px on the narrower tiers).

## Live evidence — device tiers

| Requested | Actual viewport | Tier | header height | not pinned | pinned |
|---|---|---|---|---|---|
| 1440 | 1309 | desktop | 93px | `0px` | `93px` |
| 1076 | 978 | tablet | 92px | `0px` | `92px` |
| 838 | 762 | mobile | 252px | `0px` | `252px` |
| 445 | 405 | mobile | 252px | `0px` | `252px` |

Viewports are narrower than requested because the tool sizes the window, not the viewport;
actual `innerWidth` and the `matchMedia`-resolved tier are reported rather than assumed. The
252px figure at the mobile tier matches the design gate's measurement of the defect exactly.

## Live evidence — WCAG 2.4.11 (keyboard focus not obscured)

Focus moved to "Read the full story →", a link below 2000px, outside the header.

| State | pinned header bottom | focused rect | entirely obscured | partially obscured |
|---|---|---|---|---|
| not pinned | 0 | 388–432 | no | no |
| pinned | 92 | 433–477 | no | no |

The fix does **not** regress focus protection: while the header is pinned the reservation is
still made and the focused element sits clear of it. While it is not pinned there is nothing
to be obscured by.

## Console

1 error on the page: `favicon.ico` 404. Pre-existing and unrelated. Zero JS errors from
`view.js`.

## Lint

`npx wp-scripts lint-js src/header-behaviours/view.js` → 11 errors, **all pre-existing**
(lines 41–84 and 229–331, none inside the added region 88–180). One error introduced by this
change (a prettier line-break) was fixed before commit. Lint is not wired into `prebuild` on
this project.

## Found but NOT fixed here — raised separately

`theme/sgs-theme/assets/css/utilities.css:21-27` declares its own
`:root { --sgs-header-height: 80px }` plus `html { scroll-padding-top: var(--sgs-header-height) }`.

Two consequences:

1. Because `:root` (0,1,0) beats `html` (0,0,1), the **plugin's** rule wins — but the theme's
   declaration means the plugin rule's `, 0px` fallback can never fire. With JavaScript
   disabled, every page reserves 80px regardless of whether the header is pinned. That is the
   same defect class this task fixed, in a different file.
2. `body.admin-bar html` (`:29`) can never match — `html` is not a descendant of `body`. The
   admin-bar-aware calc has never applied.

Neither is touched here: this task's brief scoped the work to `view.js` and explicitly said
not to change the behaviour CSS. With JS running (the normal case) the inline value published
by `view.js` outranks both stylesheets, so Task 1's acceptance criteria hold as measured
above.

## Canary state

No server-side state was changed. Body classes were toggled in-page only, for measurement,
and restored in the same script. No CPT was edited, no post saved, no autosave created.
