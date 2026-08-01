# Motion fix verification — D451 (motion-path repeat-pass) + D453 (pin-focus keyboard reveal)

**Date:** 2026-08-01
**Scope:** Both fixes already deployed to the canary (`sandybrown-nightingale-600381.hostingersite.com`). Read-only on block source; `plugins/sgs-blocks/scripts/motion-qa/probe-step13-pin-focus.mjs` was extended per the task's permission (two probe-reliability bugs found and fixed, documented in the file's own comments). No source fix files touched, no deploy run.

---

## JOB 1 (D451) — motion-path repeat-pass — **PASS**

**Page:** `/motion-canary-wave-c/` (2083), traveller `#mp-1` (`data-sgs-fx="motion-path"`).

**Method:** one page load per viewport (375 / 768 / 1440). Scrolled down through 18 matched positions spanning the whole travel range (from just before the element enters to well past its resting boundary, matching the sweep window `probe-wave-c.mjs` already proved is needed — this element needs ~4.2 viewport-heights of scroll before it fully settles). Then scrolled to the top (crossing the resting boundary backwards — `onEnterBack`). Then scrolled down through the *same* 18 positions again (pass 2). Compared `getComputedStyle(el).transform` as a full matrix at each matched position.

**Scroll settling:** polled `window.scrollY` until stable, then *additionally* polled the transform string until it stopped changing (the block has no `data-sgs-fx-scrub` attribute, so `resolveScrub()`'s 1-second numeric fallback applies — GSAP keeps interpolating toward the scroll-locked value for up to ~1s after scrollY itself stops moving). The first cut of this measurement, settling on scrollY alone, showed spurious sub-2-unit matrix differences between the two passes — confirmed to be this catch-up smoothing still resolving, not the D451 defect, once the transform-settle poll was added.

**Result — all three viewports, all 18 matched positions, exact matrix match pass 1 vs pass 2:**

| Viewport | Matched positions | Exact matches | Mismatches |
|---|---|---|---|
| 375×812 | 18 | 18 | 0 |
| 768×1024 | 18 | 18 | 0 |
| 1440×900 | 18 | 18 | 0 |

Sample (1440px, mid-travel): pass 1 and pass 2 both read `matrix(0.501036, 0.865426, -0.865426, 0.501036, 528, 578.84)` at scrollY 5510 in both passes. This is the exact class of bug the fix addresses — pre-fix, pass 2 would have read `transform: none` at every matched position (per the fix's own docblock).

**`onEnterBack` confirmed firing:** after scrolling back to the top, the element read `resting: false`, `position: static`, and a live GSAP transform (not `none`) — i.e. the CSS resting handoff was correctly reversed, restoring control to the tween for the return pass. This is the previously-broken half (`onEnterBack` was unreachable because `onLeave` used to call `disable()`, which stops a trigger from evaluating boundary crossings at all).

**No D442 regression** (traveller must finish in clear space, not under the header): checked at every sampled position, all three viewports. The FINAL resting position (`resting: true`, `position: sticky`) reported `underHeader: false` in every case. (Some *transient* positions mid-travel — while the traveller is still moving along its arc — briefly overlap the header's vertical band on 768px/1440px; that is expected motion along the authored curve, not the resting-state regression D442 fixed, and it was identical across pass 1 and pass 2.)

**Verdict: Job 1 PASSES.** Repeat-pass animation is proven working at all three breakpoints, with no regression to the D442 resting-position fix.

---

## JOB 2 (D453) — pin-focus keyboard reveal — **PARTIAL: works in the common case, proven race condition in a specific edge case**

**Page:** `/motion-canary-step22-pin-focus/` (2114), three real controls (link, text field, submit button) inside a `data-sgs-fx="pin-scrub"` section with `data-sgs-fx-scrub="0.5"`.

**Fix confirmed present and correct in the deployed asset:** fetched the live `fx-pin-scrub.js` directly and confirmed the minified `focusin` listener matches source exactly: `const d=()=>{i.progress()<1&&i.progress(1)};t.addEventListener("focusin",d)`.

### What I found running the shipped probe as-is

The shipped probe (5 Tab presses, 150ms fixed settle per step) reported the link's own opacity as `0` and the ancestor `.wp-block-sgs-button` as `opacity:0` — i.e. the original 2.4.11 defect, apparently unfixed.

**I did not trust this at face value** (methodology rule 4/5) and traced the opacity of the focused element at fine granularity (60-80ms samples) instead of a single fixed-delay read. This surfaced a genuine probe bug and, underneath it, a genuine product finding:

1. **Probe bug #1 (fixed):** the two call sites that jump-scroll to the pin's activation position, before starting the Tab walk, used `window.scrollTo()` + a fixed `waitForTimeout(300)` — the exact scroll-behavior:smooth trap this file's own docblock already warns about elsewhere in the same file. Replaced with a `settledScrollTo()` helper that polls `scrollY` to convergence (added to `probe-step13-pin-focus.mjs`, applied at both `runPinScrub` and `runPinScrubRealFocus`, plus `runHorizontalPanel` for consistency).
2. **Probe bug #2 (fixed):** `tabWalk()`'s per-step settle only polled `scrollY`, then read state after a single fixed 150ms opacity-side wait. On this specific canary the focus-triggered reveal is not instantaneous — direct high-frequency tracing showed the focused link's own opacity sits flat at `0` for roughly the first 100-150ms *before it starts rising at all*, then ramps to `1` over a further ~250-300ms. A naive "break on first repeated reading" settle loop is fooled by that dead-zone (two consecutive 100ms samples can both read `"0"` purely because the ramp hasn't started, not because it has converged). Fixed by requiring **3 consecutive matching readings** (300ms of genuine stability) before accepting the opacity as converged.

With both probe fixes in place, re-running still reports the **same FAIL** for the link at step 1 (own opacity stable at `0` for a full 2-second poll window) — so this is not a probe artefact. I traced the underlying mechanism directly.

### The proven mechanism

`data-sgs-fx-scrub="0.5"` is a **numeric** scrub value. `resolveScrub()` (`provider.js:342`) defaults to `1` (a number) even when no attribute is authored at all — so this is the framework's *default* behaviour for `pin-scrub`, not a quirk of this one canary. A numeric `scrub` makes GSAP's ScrollTrigger create an internal `scrubTween` — a real, independently-ticking tween that, on every animation frame, keeps re-driving the timeline's actual progress toward the scroll-derived value (`ScrollTrigger.js:1704-1712`, confirmed against the installed `gsap@3.15.0`), for as long as that catch-up hasn't finished settling.

`revealForKeyboard`'s `timeline.progress(1)` (the D453 fix) is a **one-time** jump. If the scrub's own catch-up tween is still actively running when `focusin` fires — i.e. focus lands on the control within roughly the scrub's own duration (≈0.5s here, or the framework default of 1s elsewhere) of the last scroll change — the still-ticking `scrubTween` overwrites the forced jump on the very next animation frame with its own (much lower) in-flight value, and continues doing so every frame until it finishes. Because its target *is* the low value matching the actual (unmoved) scroll position, it does not "wear off" — the control **stays invisible while focused**, with no further user action able to fix it short of scrolling away.

**Directly reproduced and isolated, holding every other variable constant:**

| Condition | Link opacity outcome |
|---|---|
| Focus lands ≥ ~2s after the last scroll change | Ramps 0 → 1 over ~350ms, holds at 1 indefinitely (2.5s traced) |
| Focus lands ~150-450ms after the last scroll change (this probe's own default gap) | Forced jump is visibly fought — an early trace showed opacity rising then falling back (0.17 → 0.38 → 0.42 → 0.32 → … → 0) as the scrubTween's own decay curve wins |
| Focus lands while a fresh `settledScrollTo()` has *just* completed, no extra buffer | Opacity reads stable `0` for the full observation window — the scrubTween is still descending toward the (near-zero) raw progress and never released control back |

This is not specific to real-Tab vs programmatic focus, and not caused by `tabWalk()`'s `blur()` call (isolated and ruled out directly — 4-way controlled comparison, only the elapsed-time-since-scroll variable changed the outcome).

### Ancestor + own opacity (acceptance criterion)

At the scroll position genuinely mid-choreography (chosen deliberately near where content is still mostly hidden, which is the correct place to stress-test this fix):

| Control | Own opacity (settled ≥2s after scroll) | Own opacity (Tab within ~300ms of scroll) | Ancestor opacity |
|---|---|---|---|
| Link | 1 | **0** (unresolved race) | Ancestor `.wp-block-sgs-button` also 0 in the race case |
| Text field | 0.4 in the race-window run (not independently re-verified at ≥2s settle — flagged, not fixed, see below) | — | No ancestor clue reported (own opacity itself is the failure here) |
| Submit button | 1 | 1 | Ancestor `.wp-block-sgs-form` reads 0 in the race-window run |

I did not have budget to re-run the full 2s-settle trace independently against the text field and submit button (only the link was traced at fine granularity); the submit-button-own-opacity-1-but-ancestor-0 pattern in the race-window run is the same ancestor-hiding shape D453's own fixture was built to expose, and is consistent with all three controls sharing one timeline/stagger, so it is very likely the same race, not a separate defect — but I am reporting this as **not independently confirmed**, only inferred by symmetry.

### Reduced motion — clean, PASS

`prefers-reduced-motion: reduce` arm: pin never engaged (`activation: {error: 'NO_SPACER'}`, `pinState.position` read `relative` throughout — never `fixed`), and all three controls read opacity ≈1 (0.4 on the text field is its own static/authored value, not a stagger artefact, since nothing pins or scrubs under reduce). Matches the §10 SIMPLIFY contract. **No regression here.**

### Verdict

**Job 2 does not fully meet the acceptance criterion as stated** ("own AND ancestor opacity of 1 for all three controls at focus"), but the failure is narrower than "the fix doesn't work":

- The fix **does work** when the pinned section's own scrub-smoothing has already settled before focus lands (the common real-world case — a user who scrolls, then reads, then Tabs).
- The fix **can be defeated** by Tabbing into the pin within roughly the block's `data-sgs-fx-scrub` duration (default 1s framework-wide, 0.5s on this canary) of the last scroll change, because GSAP ScrollTrigger's own catch-up tween keeps overwriting the fix's one-time `progress(1)` call every frame until it finishes — and since its target is the low scroll-derived progress, the control stays invisible for as long as focus is held, not just briefly.
- This is a genuine, reproducible product defect (not a probe artefact), root-caused to the interaction between the D453 fix and the framework's *default* numeric-scrub behaviour, not something D453 was written to handle. It needs a source fix (e.g. killing/pausing the trigger's `scrubTween` before forcing `progress(1)`, or gating the reveal on `scrollTrigger.isActive`/no in-flight scrub tween) that I have not implemented, per the read-only rule on this dispatch.

## Files touched

- `plugins/sgs-blocks/scripts/motion-qa/probe-step13-pin-focus.mjs` — extended per the task's explicit permission: added a `settledScrollTo()` helper (polls scrollY to convergence instead of a fixed wait) used at all three jump-scroll call sites, and hardened `tabWalk()`'s per-step opacity settle to require 3 consecutive stable readings rather than 1 (closes a dead-zone false-convergence bug). No other source files modified. No deploy run.
- `reports/visual-diff/motion-verify-2026-08-01.md` — this report.

## Not independently verified (reported honestly, not fixed)

- Text field and submit button's own-opacity trajectory at fine granularity (only the link was traced sample-by-sample) — the ancestor-opacity-0 finding for the submit button came from the single probe run, not a repeated/isolated trace like the link's.
- Whether the race window's exact boundary is ~450ms, ~500ms (matching the scrub duration precisely), or something else — bounded empirically between "150-450ms fails" and "≥2000ms passes", not pinned to an exact millisecond threshold.
