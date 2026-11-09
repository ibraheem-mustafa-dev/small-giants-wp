# Q2 Parallax driver test (Spec 49 §10.2): per-block range, composition, Ken Burns, browsers, reduced motion

Date 2026-11-09. Rater B. Nothing was saved to any site or committed; scripts, logs and raw results are in `E:/sgs-tmp/media-q2/`. Chrome 156.0.8078.80 (`channel:'chrome'`, headed), Firefox 146.0.1, WebKit 26.0 (Playwright build, not an iPhone).

## Verdict

| Item | Result |
|---|---|
| 1 Per-block range, ratio x max(0, scrollY - blockTop) | PASS (0.00 px error, both ratios, 3 runs). A no-measure page-basis form exists but fails under load (see 2) |
| 2 Header collapse and shortened page | PARTIAL: stale range is wrong by about 5 px; a ResizeObserver re-measure fixes it (p95 1.5 to 1.9 px) but only with replace composition |
| 3 `animation-composition:add` with another `translate` owner | FAIL: sum is right when static, but the animation is not off the main thread (p95 77 px behind under a stall) and a hover transition snaps instead of easing |
| 4 Ken Burns `scale` alongside | FAIL for `add` (same lag); PASS for the wrapper alternative; a `transform` alternative is coupled to the scale |
| 5 Firefox and WebKit | WebKit 26.0 PASS; Firefox 146.0.1 has no `animation-timeline` and routes to the fallback, but an unguarded animation snaps to its end value |
| 6 Reduced motion | PASS in all three browsers |

## 1. Per-block range

Method: a synthetic page, block top at 3000 px, height 400 px, page height 6900 px, viewport 1440x900, one moving red band and one static blue reference band in the same block. Script writes `--s` (blockTop), `--e` (scrollHeight - innerHeight) and `--tr` (ratio x (e - s)) once; CSS is `animation: plx linear both; animation-timeline: scroll(root); animation-range: var(--s) var(--e); animation-composition: add`. Eleven real-gesture scroll stops (`Input.synthesizeScrollGesture`) from 0 to 6000, reading the computed `translate` and the painted offset (`getBoundingClientRect` difference) against the formula. Every run reached 6000 of 6000.

| Variant | Ratio | Runs | Max error over 11 stops |
|---|---|---|---|
| px range from custom properties (the spec form) | 0.18 | 3 | 0.00 px, painted offset equal to computed |
| px range from custom properties | -0.06 | 3 | 0.00 px |
| Negative control: range start 0 instead of blockTop | 0.18 | 3 | 270.00 px |
| Negative control: range start 0 | -0.06 | 3 | 90.00 px |
| No-measure page basis: `view-timeline` on the block, `animation-range: exit-crossing 0% exit-crossing calc(0% + 6000px)`, keyframe travel = ratio x 6000px | 0.18 and -0.06 | 3 each | 0.00 px |
| View basis: `view-timeline`, `animation-range: cover 0% cover 100%`, keyframes from -ratio x (H+V)/2 to +ratio x (H+V)/2 | 0.18 and -0.06 | 3 each | 0.00 px (offset clamps at +-117 px for 0.18, as the overscan table requires) |

Reading: offset is 0 until scrollY reaches blockTop (rows at 0, 1500, 2100, 2600 and 3000 read 0), then 18, 54, 108, 216, 360, 540 at 3100, 3300, 3600, 4200, 5000, 6000, exactly 0.18 x (scrollY - 3000). Clean page-basis expression: yes. `exit-crossing 0%` starts at scrollY = blockTop and needs no script and no re-measure. The catch is item 2: on the real page it was not run off the main thread.

Spec text: keep "measures start, end and travel as custom properties". Add that `animation-fill-mode: both` (the `both` in the shorthand) provides the `max(0, ...)` clamp, and that travel is `ratio x (end - start)`. Do not use `exit-crossing` or `cover` as the driver until it is proven off the main thread (see 2).

Not proven: that the page-basis `exit-crossing` form or the `cover` form hold under a stalled main thread on a synthetic page (only the real-page run below measured `exit-crossing`); fractional-pixel `scrollY` on a high-DPI screen (all runs were at device scale factor 1).

## 2. Header that collapses and shortens the page

Method: T11's harness (`E:/sgs-tmp/media-t11/run.mjs`) replaying `site.har` (no site hits), 1440x900, CPU 4x, 650 px scroll gesture at 500 px/s, `fx-parallax.js` blocked, the hero photo driven by my CSS. Painted-frame photo offset tracked by template matching against two rulers as in T11; error is measured against the spec's basis recomputed from each frame's real hero position (distance = max(0, scrollY - current hero top)), negative when the photo lags. Every run reached scrollY 558 or 559 of the window (the header shortens the page, as in T11). The hero's page top moved from 126 to 105 px (-21 px) during the gesture, so a once-measured blockTop is stale by 21 px and the expected stale error is 0.18 x 21 = 3.8 px. Three runs per cell unless stated; cells are p95 of absolute error (px) per run.

| Driver | p95 per run | Max per run | Reading |
|---|---|---|---|
| replace, measured once at load (stale) | 4.85, 5.26, 5.47 | 5.14, 5.45, 5.96 | FAIL the 3 px bar; range goes stale as predicted |
| replace, ResizeObserver on html, body, hero and header re-measures | 1.75, 1.51, 1.91 | 2.89, 1.77, 2.15 | PASS; error is the harness floor (T11: 0.8 to 1.6) |
| replace, `exit-crossing` view timeline, no script | 30.1, 53.4, 39.1 | 36.0, 59.3, 44.9 | FAIL: it lags like the script driver; Chrome did not keep it in step under the header stall |
| Negative control: replace, start hard-coded 0 (wrong) | 22.7 (1 run) | 23.0 | mean signed +17.9 px; the harness detects a wrong start |
| add, stale | 63.7, 43.3, 67.8 | 69.6, 46.8, 71.9 | FAIL |
| add, ResizeObserver | 25.1, 43.8, 49.2 | 27.9, 47.8, 52.5 | FAIL: re-measuring does not rescue it |
| add, `exit-crossing`, no script | 58.6, 39.5, 65.1 | 64.4, 44.6, 69.9 | FAIL |
| add, start 0 (wrong) | 39.5 (1 run) | 45.3 | confounded by the add lag |

Reading: the range does go stale when the header collapses (the block top moves 21 px), a ResizeObserver re-measure fixes it, and the `end` value being stale is harmless because the slope is ratio and the travel is only needed up to the new, shorter maximum. The decisive result is the composition column: every `add` run lags by tens of pixels, so §10.2's claim of 0.8 px is true only with replace composition.

Spec text: "the script re-measures on `resize` and on a `ResizeObserver` over `html`, `body`, the block and any header it contains, and rewrites start, end and travel". State that the 0.8 px result holds with replace composition. Not proven: that every site header collapses by a ResizeObserver-visible change (a pure transform-based collapse would not move the block's top and would need no re-measure); the cost of the ResizeObserver callbacks themselves (not measured).

## 3. `animation-composition:add` with another `translate` owner

Method: block 1000 px tall at 3000, ratio 0.18, owner variants on `translate` (hover lift as `--sgs-mh-ty`, a registered `<length>` custom property with a 1.5 s transition, as in `motion.css`; a direct `translate` transition; a static `translate`). Checks: painted sum at scrollY 3400 (expected owner + 72 px); a 1.9 s frame series after a hover class toggle; `LayerTree.compositingReasons`; and a stall test: 1.4 s main-thread busy loop while a 600 px scroll gesture runs from 2900 to 3500, painted frames from `Page.startScreencast`, band centres tracked in the frames, error against owner + 0.18 x (scrollY - 3000). Three runs per row; every run reached its end position; clean sequential runs, nothing else of mine running.

| Variant | Static sum | Hover transition | LayerTree reason | Stall: median / p95 / max error (px), 3 runs |
|---|---|---|---|---|
| add, no other owner | 72 = 72 | n/a | `ActiveTranslateAnimation` | 27.1 to 29.3 / 76.7 to 77.6 / 82.0 to 82.7 |
| add, static owner -20 px | 52 = 52 | n/a | `ActiveTranslateAnimation` | 26.9 to 27.3 / 76.6 to 77.0 / 82.0 to 82.5 |
| add, `--mh-ty` owner (registered property transition) | 72 = 72, then 52 = 52 | SNAPS: painted 52 at 7 ms while `--mh-ty` eases 0 to -20 over 1.5 s (3 runs) | `ActiveTranslateAnimation` | 26.7 to 27.1 / 76.5 to 77.3 / 82.0 to 82.5 |
| add, owner by `translate` transition | 72 = 72, then 52 = 52 | SNAPS: painted 52 at 6 ms (3 runs) | `ActiveTranslateAnimation` | 27.3 to 28.0 / 76.6 to 77.3 / 82.0 to 82.8 |
| Control: owner only, no parallax | 0 = 0, then -20 | eases 0, -3.3, -6.7 ... -20 | none | 0 / 0.5 / 0.5 |
| Control: replace on `translate`, no other owner (2 clean-ish runs, see below) | 72 = 72 | n/a | `ActiveTranslateAnimation` | 0.16 to 0.18 / 0.53 to 0.55 / 0.69 to 0.73 |
| Alternative F: parallax on `transform: translateY` (replace), owner on `translate` | 72 = 72, then 52 = 52 | eases 72, 68.7, 65.3 ... 52 (3 runs) | not read | 0.17 to 0.18 / 0.54 to 0.57 / 0.69 |
| Alternative G: parallax on a wrapper element (replace on `translate`), owner on the inner element's `translate` | 72 = 72, then 52 = 52 | eases 72, 68.7, 65.3 ... 52 | not read | 0.17 to 0.19 / 0.50 to 0.57 / 0.69 (3 runs) |

Findings: the sum is correct once settled, but with `add` (1) the animation is not off the main thread in practice: it trails the page by up to 82 px (p95 77 px) through a main-thread stall, the same as the script driver, while replace stays within 0.7 px; (2) a transition on the owner's `translate` or on `--sgs-mh-ty` snaps to its end value instead of easing, because the animation's underlying value ignores the in-flight transition; (3) `LayerTree.compositingReasons` reports `ActiveTranslateAnimation` for `add` anyway, so that signal is not evidence of acceleration and T11's use of it for `add` cannot be relied on.

Simplest alternative: a wrapper element carrying the parallax `translate` with replace composition (G) and the lift, float, magnetic and Ken Burns channels untouched on the inner element. The other candidate is a separate property (F), but see item 4: `transform` is applied inside `scale`, so Ken Burns multiplies the parallax offset.

Spec text: replace "`animation-composition:add` keeps other `translate` owners working" with: parallax is a CSS animation of `translate` with replace composition on a wrapper that holds no other transform channel; the element inside keeps the `translate` channel, Ken Burns and Lift. If a block variant has no inner element to wrap, Lift and Parallax on one element are refused by the schema (the fallback the spec already names), because `add` was measured and fails. Also: a replace-mode run crashed the Chrome renderer ("Target crashed") repeatedly in my synthetic page: 11 of 14 attempts for F, 4 of 7 for the wrapper, more than half of the attempts for the plain replace control, 0 across every `add` run (about 20 in items 3 and 4 and 36 contexts in item 1), and 0 of 12 replace runs on the real site page in item 2. The wrapper therefore completed 3 runs only after retries, so replace-mode reliability is the open risk for the recommended alternative. Cause not proven (it was not reproduced in a minimal page 10 of 10, and was not isolated); treat as a risk to chase in PS-9 before relying on replace, not as proof against it.

Run counts: the plain replace control has two completed runs (they overlapped with a stale background script of mine, so the figure is indicative, not clean); F and the wrapper each have three completed runs after retries (F 11 failed attempts, wrapper 4).

## 4. Ken Burns `scale` on the same element

Method: same stall test with a 25 s `scale` 1 to 1.3 animation running (native `scale` keyframes, and a registered-property `--kb` animation driving `scale: var(--kb)` as `motion.css` does), centre tracking so the scale about the centre does not move the measured band.

| Variant | Static sum at 3400 | Stall: median / p95 / max (px), runs |
|---|---|---|
| add + Ken Burns native scale | 72 = 72 (3 runs); hover final 52 = 52 | 0.09 / 69.9 to 70.0 / 81.5 to 82.5 (3) |
| add + Ken Burns by registered property | 72 = 72 (3 runs); hover final 52 = 52 | 0.09 / 70.0 to 70.7 / 82.0 to 82.7 (3) |
| Negative control: Ken Burns only | 0 = 0 | 0 / 0.5 / 0.5 (3) |
| `transform` parallax + Ken Burns native scale | 73.2 and 73.3 against 72 | 7.1 and 7.4 / 10.1 and 10.6 / 10.6 (2) |
| `transform` parallax + Ken Burns registered property | 73.3 and 73.2 against 72 | 6.2 and 5.7 / 10.1 and 10.6 / 10.6 (2) |

Reading: with `add`, Ken Burns does not break the sum when settled, but the stall lag is unchanged (the median is low only because the extra Ken Burns frames dilute the stalled window; p95 and max match the no-Ken-Burns run). `transform` parallax shows 1.2 px extra at 72 px and about 10 px after some seconds of zoom, consistent with the offset being scaled by the current Ken Burns scale (`transform` is applied inside `scale`, `translate` outside it); that cause is not isolated by a separate test. The wrapper (G) puts translate on a different element from `scale` and so cannot be coupled; it was not run with Ken Burns running (not proven).

Spec text: Ken Burns stays on `scale` on the inner element and parallax stays on `translate` (never `transform`) on the wrapper.

## 5. Firefox and WebKit

Method: the item 1 page in each browser, three runs per mode, scrolled with `window.scrollTo` (no CDP outside Chrome), painted offset read against the formula, `CSS.supports` for each feature, and a probe element with `@supports not (animation-timeline: scroll()) { .probe { color: red } }`.

| Browser | Version | `animation-timeline: scroll()` | `animation-range` | `animation-composition` | `@supports not` routes | Range mapping error (px), px, `exit-crossing`, `cover`, 3 runs each |
|---|---|---|---|---|---|---|
| Chrome | 156.0.8078.80 | yes | yes | yes | no (green) | 0, 0, 0 |
| WebKit (Playwright) | 26.0 | yes, and `ViewTimeline`, `ScrollTimeline` | yes | yes | no (green) | 0, 0, 0 (rows 54, 216, 540 at 3300, 4200, 6000) |
| Firefox | 146.0.1 | no (`scroll()`, `view()`, `animation-range` all false) | no | yes | yes (red): routes to the fallback | animation snaps to full travel: 540, 1080, 234 px error |

Reading: WebKit 26.0 maps the range correctly. Firefox 146 has no scroll timelines: the guarded fallback fires, but an unguarded animation runs on the document timeline and jumps to its end value immediately (`translate` reads 540 px at scrollY 0), so the animation rule must live inside `@supports (animation-timeline: scroll())` or be disabled in the `@supports not` branch.

Spec text: "the animation declarations sit inside `@supports (animation-timeline: scroll())`; the `@supports not` branch keeps the script driver". Not proven: real Safari on an iPhone (the WebKit used is Playwright's build, run on Windows), whether WebKit keeps a scroll-timeline `translate` on its compositor under a main-thread stall (not measured; WebKit offers no CDP), and `animation-composition` behaviour under a stall in WebKit; a Firefox with the feature enabled (the flag was not tried).

## 6. Reduced motion

Method: Playwright `reducedMotion` `reduce` against `no-preference`, CSS `@media (prefers-reduced-motion: reduce) { .m { animation: none } }`, scrolled to the same stops, three runs per browser.

| Browser | reduce: offset at scrollY 4200, running animations | no-preference (negative control) |
|---|---|---|
| Chrome 156 | 0 px, 0 animations, `translate: none` | 216 px, 1 animation |
| WebKit 26.0 | 0 px, 0 animations | 216 px, 1 animation |
| Firefox 146.0.1 | 0 px, 0 animations | no animation-timeline: unguarded animation reads 540 px (as in 5) |

Spec text: "Reduced motion: `animation: none` on the parallax element inside the reduced-motion media query, and the script fallback writes nothing". The existing script driver's own reduced-motion behaviour was not tested here.

## What stays unproven

- That any form of `animation-composition:add` can be accelerated: measured failing in Chrome 156; whether an older or newer Chrome differs was not tried.
- Whether `exit-crossing` (view timeline) loses off-main-thread running by design or because of this page's header work: only the real-page run measured it, failing (p95 30 to 53 px).
- The replace-mode renderer crashes in Chrome 156: frequency and cause open.
- The wrapper with Ken Burns and Lift together on the real Eye Care hero (synthetic page only, 2 to 3 runs).
- WebKit stall behaviour, an iPhone with a shrinking toolbar (AC-20), and `100lvh` against `innerHeight` there.
- Whether the real header's ResizeObserver cost matters (the re-measure itself was not timed).
- High-DPI and fractional scroll positions.

## Files

`E:/sgs-tmp/media-q2/item1.mjs`, `item2.mjs`, `item2b.mjs`, `ana2.py`, `item3.mjs`, `loop3.sh`, `ana3.py`, `summ3.py`, `item5.mjs`, `lib.mjs`; logs `item1.log`, `item2.log`, `item2b.log`, `item3c-*.log`, `item3d.log`, `item3e.log`, `item3f.log`, `item4a.log`, `item4b.log`; browsers' JSON `item5-*.json`.
