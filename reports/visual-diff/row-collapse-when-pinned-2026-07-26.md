# Verification — collapse-when-pinned + the sticky silent-failure guard

**Date:** 2026-07-26
**Commit:** `494e5d50` (branch `main`)
**FR:** Spec 37 FR-37-40, Tasks 2 + 3 of the approved sticky build (D389)
**Files changed:** `src/header-behaviours/view.js`, `assets/css/header-behaviours.css`
**Canary:** sandybrown-nightingale-600381.hostingersite.com, active header CPT **1570**

## Why this is not a visual-diff case

No block `render.php`, `block.json`, `edit.js` or `save.js` was touched — the change is the
frontend behaviour script plus the shared behaviour stylesheet. The pre-commit gate did not
fire and no `--no-verify` bypass was used.

## Deploy verification (checksum)

| File | local | server |
|---|---|---|
| `build/header-behaviours/view.js` | `7a84931e48fd777aeee61edbb299390c` | `7a84931e48fd777aeee61edbb299390c` |
| `assets/css/header-behaviours.css` | `4ff25ff2e802b50f6f8682651e5d44ad` | `4ff25ff2e802b50f6f8682651e5d44ad` |

Both **MATCH**.

## Test configuration

The canary header was clean (0 behaviour rows), so it was configured through the block
editor's own data store — `updateBlockAttributes` + `savePost()`, never WP-CLI on
`post_content` — with the top row set to hide on scroll and the header set sticky. It was
reverted to clean afterwards and the revert was confirmed on the frontend (see the end).

## Task 2 — collapse-when-pinned

### The mechanism

While the header is measured as pinned, a hidden header row collapses to height 0 instead of
translating. `transform` never reclaims an element's space, so translating in the pinned case
leaves a gap exactly the size of the hidden row and the header does not visibly shrink at all.

A browser cannot animate from `height: auto`, so (Bean's decision, 2026-07-26) the script
measures the row's real height, writes it as the animation's start value, and drives it to 0.
The inline height is **transient** — cleared once the transition completes so the row returns
to `auto` and keeps reflowing with its content. The clear-out delay reads the *computed*
transition duration rather than a hardcoded number, so `prefers-reduced-motion` (which strips
the transition) clears on the next tick instead of waiting for a `transitionend` that would
never fire.

### Live state machine (tablet tier, 978px)

| Scroll state | header height | row height | `transform` | inline height | classes | published height |
|---|---|---|---|---|---|---|
| at rest | 92px | 25px | `none` | *(none)* | `is-row-collapse-mode` | `92px` |
| scrolled down | **68px** | **0** | `none` | `0px` | `+ is-row-hidden` | **`68px`** |
| scrolled up | 92px | 25px | `none` | *(none)* | `is-row-collapse-mode` | `92px` |
| settled | 92px | 25px | `none` | *(none)* | `is-row-collapse-mode` | `92px` |

Two things worth calling out:

- `transform: none` throughout confirms the **collapse** rule won over the translate rule, by
  specificity (0,4,0 vs 0,3,0) rather than source order.
- The published header height fell to **68px on its own**. The existing ResizeObserver saw the
  header shrink and re-published, which feeds the Task 1 scroll-padding gate with no extra
  plumbing. The design predicted this composition; it is now measured.

### "No gap" — measured unrounded

| Tier | viewport | resting header | resting row | collapsed header | collapsed row | **gap** |
|---|---|---|---|---|---|---|
| desktop | 1382 | 93.17 | 25.58 | 67.59 | 0 | **0.00** |
| tablet | 978 | 92.34 | 24.72 | 67.63 | 0 | **0.00** |
| mobile | 405 | 251.52 | 22.51 | 229.01 | 0 | **0.00** |

`gap = (header drop) − (row height removed)`. Zero at every tier means the header shrank by
*exactly* the hidden row's height — the `transform` failure mode the design gate named. A
second, independent check at the tablet tier: the sum of the header's rows when collapsed
(67.63) equals the header's own height (67.63).

Every tier also restored to its exact resting height with **no inline height left behind**.

### The binding regression test — non-pinned must be byte-identical

With the sticky class removed and everything else identical:

| Scroll state | header `position` | row `transform` | inline height | row height | classes |
|---|---|---|---|---|---|
| scrolled down | `relative` | `matrix(1, 0, 0, 1, 0, -24.7159)` | *(none)* | 24.72 | `is-row-hidden` |
| scrolled up | `relative` | `none` | *(none)* | 24.72 | — |

`matrix(1, 0, 0, 1, 0, -24.7159)` is `translateY(-100%)` of the row's own 24.72px height —
the shipped behaviour, unchanged. Critically **no inline height is ever written** on this
path, and the row keeps its full height (it slides, it does not collapse). This is the
FR-37-40 regression constraint, met.

`clearCollapse()` strips the inline height whenever a row leaves collapse mode, so a header
unpinned mid-session cannot leave a row frozen at a pixel size. Exercised above: the
transition from pinned to non-pinned left `inline height: (none)`.

## Task 3 — sticky silent-failure guard

`findStickyBreakingAncestor()` walks the header's ancestors for `overflow` other than
`visible`, or `transform`/`perspective`/`filter` — any of which silently stops sticky pinning
to the viewport.

This also **bounds what Task 1's `isHeaderPinned()` can honestly claim**: a header broken this
way still *computes* `position: sticky`, so the measurement is accurate but misleading. The
guard warns rather than changing the published height, because an `overflow` ancestor may
still be the page's own scroll container — zeroing on an inferred cause would be a fix for an
unproven diagnosis.

### Live test, with a negative control

The **shipped** script was re-executed on the live page (classic IIFE, re-injected by `src`),
not a re-implementation of its logic.

| Condition | `[SGS]` warnings |
|---|---|
| healthy page, sticky requested — **negative control** | **none** |
| `div.wp-site-blocks` given `transform: translateZ(0)` | **1** |

The warning names the culprit precisely:

> `[SGS] This header is set to stick, but an ancestor element prevents it: <div class="wp-site-blocks"> has transform: matrix(1, 0, 0, 1, 0, 0). Remove that property from the ancestor, or the header will not pin.`

Advisory only — a `console.warn`, never a gate, and silent unless sticky was actually
requested (consistent with the project rule that operator-facing feedback is informational).

### Deliberately NOT built, with reasons

- **The D4 multi-sticky warning.** It was specified against the per-row sticky model that D389
  rejected. Under a single header-level sticky element there is no "second sticky row" to warn
  about. Building it would mean inventing a condition that cannot occur.
- **The sticky ↔ hide-on-scroll mutual exclusion.** Same cause: it guarded a per-row conflict
  that no longer exists. Under the approved model the combination *is* the feature — the
  header pins and the row collapses.

Both are recorded here rather than silently dropped.

## Gates

- `check-shared-css-state-rules.js`: **0 findings, clean.** The collapse rule writes no height
  into the shared stylesheet, and its `0` values are exempt by construction — a collapse to
  nothing cannot grow a row, whatever its resting size.
- `npx wp-scripts build --experimental-modules --webpack-copy-php`: compiled successfully.
- `lint-js`: 11 errors, all pre-existing (lines 47–90 and 319–543, none in the added regions).
  The two introduced by this change were fixed before commit.
- The `prefers-reduced-motion` reset repeats the new `.is-row-collapse-mode` selector at
  matching specificity (0,2,0), so it cannot lose to the collapse transition rule.

## Not verified live — stated plainly

**`prefers-reduced-motion` behaviour was not exercised in the browser.** The harness cannot
emulate the media query through the tools available this session. The path is correct by
construction — `transitionMs()` reads the computed duration, the CSS sets `transition: none`
under reduced motion, so the duration reads 0 and the inline height clears on the next tick
rather than waiting on a `transitionend` that never fires — but that is reasoning, not a
measurement. Worth a real check on a machine with the OS setting enabled.

**A collapsed row's contents remain focusable.** At height 0 with `overflow: hidden`, a
keyboard user can still Tab into the hidden row. This is *not* a regression — the shipped
`translateY(-100%)` path has the same property (the row is off-screen but still in the tab
order) — so it is parity, not a new defect, and fixing it belongs to a decision about the
existing behaviour rather than to this change. Flagged rather than silently widened into.

## Canary state after testing

Reverted and confirmed on the frontend: `behaviourRows: 0`, no sticky body class, header
`position: relative`, published height `0px`, `scroll-padding-top: 0px`. Revision list shows
only ordinary `1570-revision-v1` entries — **no `-autosave-v1`**, so the next session will not
meet a false "newer autosave" banner.
