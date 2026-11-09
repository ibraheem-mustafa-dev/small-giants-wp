# T11 Parallax smoothness: why the hero parallax lags, and what the redesign should drive it with

Date 2026-11-09. Subject: the hero photo `img.sgs-hero__bg-img` on https://darkcyan-grouse-898606.hostingersite.com/ (page `/`). Nothing was saved to any site; every experiment ran inside a private browser tab replayed from one recorded HAR. Scripts, captures and raw results are in `E:/sgs-tmp/media-t11/`.

## Summary

- The lag is proven to come from the header, not from the parallax code. `header-behaviours/view.js` toggles `is-row-*` classes on the first scroll pixels and then republishes `--sgs-header-height` on `<html>` and `<body>` twice. That causes three recalculations of about 1,100 elements each (roughly 0.5 s of main-thread time at 4x throttle, about 130 ms at 1x). The script-driven parallax cannot write its offset while the main thread is busy, so the photo falls behind the page and then catches up.
- Blocking only `header-behaviours/view.js` cut the painted photo error from 11.1 px median / 20.0 px p95 to 1.9 / 2.5 at 1x, and from 29.3 / 55.9 to 2.0 / 5.5 at 4x (five runs each, ranges do not overlap).
- A browser-native scroll-linked animation (`animation-timeline: scroll(root)`) of `translate` or of `transform`, with the script blocked, stayed in step in every run: p95 error 0.8 px at 1440 and 1.6 px at 375, equal to the harness floor of the parallax-off baseline (0.9 and 1.1 px), even with the header's three big recalculations still running.
- The layer tree shows both native variants own a compositor layer with an active accelerated animation, including while Ken Burns `scale` is animating on the same element.
- Rounding to whole pixels and `will-change` are not the cause. The 330 KB stylesheet is implicated only through three `:root:has(...)` rules (one of the three big recalculations); its size is not.
- Not proven: why the root recalculation touches about 1,100 elements when the header holds only 396; whether native scroll timelines behave the same on Safari 26.

## Method

1. One headed Chrome (`channel: 'chrome'`) at a time, from the shared Playwright install. The page was loaded once with `recordHar` (`site.har`, 105 requests) and every run replays it with `routeFromHAR` (`notFound: 'fallback'`), so the host was hit once.
2. Each run: fresh browser context, load, wait 5.2 s (Ken Burns is 3 s), inject the condition (CSS, init script or blocked request, tab only), set CPU throttle through CDP `Emulation.setCPUThrottlingRate`, then `Input.synthesizeScrollGesture` for 650 px at 500 px/s (mouse wheel at the viewport centre). `window.scrollTo` was never used.
3. End position: runs with the header script end at scrollY 630 (desktop) or 646 (375), because the header collapses and shortens the page; runs without it end at 650. A run counts as reached at 625 to 655; none was discarded for this reason (four runs were retried for analysis-script faults, none for missing the position).
4. Questions A and C: Chrome trace with `devtools.timeline`, `disabled-by-default-devtools.timeline`, `...invalidationTracking`, `...timeline.frame`, `blink.animations`, `cc`, `viz`, `benchmark`, `input`; metrics taken only inside the gesture window (`E:/sgs-tmp/media-t11/metrics.mjs`). 1440x900, CPU 4x, five runs per condition (three for question C trace runs).
5. Questions B and D: painted frames from CDP `Page.startScreencast` (JPEG, one frame per compositor present). Two test-only 40 px rulers (pseudo-random 4 px bands) are injected into the tab: one anchored to the document gives the page scroll `S` per frame, one anchored inside the hero gives the hero's position `h` per frame (this absorbs the header collapse shifting the hero). The photo is tracked by template matching (OpenCV `matchTemplate`, sub-pixel parabola, patch re-chosen on the most textured rows each frame). Photo offset relative to the hero is `D = photo shift - hero shift`; the ideal is `0.18 x (S - S0)`; the error is `e = D - 0.18 x (S - S0)`, in px, negative when the photo lags. Analysis code: `analyzeB.py`, `analyzeRun.py`.
6. At 375x812 the hero text is hidden (`.sgs-hero__content{visibility:hidden}`, tab only, every condition) because text moves with the page and fools the photo tracker; desktop is unmasked. Viewports 1440x900 and 375x812, `deviceScaleFactor` 1, CPU 1x and 4x, five runs per cell.
7. Negative controls: the parallax-off condition (error must read 0) sets the harness floor; for trace work a block of two unrelated scripts (`nav-accessibility.js`, `whatsapp-cta/view.js`) expected to change nothing.
8. The test ruler adds two small composited images to every condition equally. Frame cadence from the screencast is not used as a smoothness metric: compositor scroll presented about 79 distinct scroll positions in every condition, so frame rate is blind to the photo lagging.

## A. What is the style work (1440x900, CPU 4x, five runs per row, gesture window only)

Columns: UpdateLayoutTree total ms, number of recalculations over 60 ms ("big"), their total ms, total elements recalculated. Cells are median [min to max].

| Condition | UpdateLayoutTree ms | Big recalcs | Big ms | Elements | Reading |
|---|---|---|---|---|---|
| As built | 882 [720 to 1042] | 3 [3 to 3] | 573 [437 to 672] | 3,753 [3,680 to 3,883] | baseline |
| `header-behaviours/view.js` blocked | 230 [204 to 449] | 0 | 0 | 344 [272 to 515] | big recalcs gone: proven source |
| `is-row-*` class changes suppressed (init script on `DOMTokenList`) | 354 [339 to 396] | 0 | 0 | 554 [528 to 569] | class toggles are the trigger |
| `--sgs-header-height` writes suppressed (init script on `setProperty`) | 437 [421 to 487] | 1 | 112 [109 to 163] | 1,692 [1,630 to 1,706] | removes two of the three |
| The three `:root:has(...)` rules removed from the 330 KB sheet (tab-only rewrite) | 630 [622 to 641] | 2 | 331 [324 to 341] | 2,639 [2,618 to 2,743] | removes the third; all five runs below the as-built minimum of 720 |
| Pointer events off (`pointer-events:none`, hover cannot change) | 816 [767 to 908] | 3 [2 to 3] | 493 [454 to 604] | 3,695 [2,570 to 3,728] | no effect: inside the as-built spread |
| `motion-reveal.js` blocked | 586 [521 to 772] | 3 [2 to 3] | 481 [458 to 671] | 3,398 [2,315 to 3,493] | big recalcs stay; total partly lower but overlaps as-built at 720 to 772: small or no effect, unproven |
| All CSS animations off (`animation:none`) | 719 [495 to 809] | 3 [2 to 3] | 611 [421 to 700] | 3,628 [2,444 to 3,643] | big recalcs stay; inside the spread |
| `@property` rules stripped from `motion.css` (calc chains become plain custom properties) | 711 [670 to 767] | 3 | 422 [405 to 467] | 3,866 [3,832 to 3,879] | no effect: inside the spread |
| Negative control: `nav-accessibility.js` + `whatsapp-cta/view.js` blocked | 863 [731 to 1106] | 3 [2 to 3] | 510 [455 to 712] | 3,690 [2,651 to 3,713] | no effect, as expected |
| Whole 330 KB sheet replaced by empty | 135 [117 to 146] | 0 | 0 | 194 | confounded: the same sheet holds the header-row rules, so the header never collapses; not a test of stylesheet size |

Findings, each next to its evidence:

- Three big recalculations dominate: 3 events of 437 to 672 ms combined out of 720 to 1,042 ms total (table row 1). In the first trace, two were seen at 261 ms and 561 ms after the gesture's start (`runs/probe1/trace.json`).
- Their trigger is the header script: `StyleRecalcInvalidationTracking` shows `HTML` "Affected by :has()" and `HTML`/`BODY` "Inline CSS style declaration was mutated", with stack frames in `header-behaviours/view.js` (functions at `p()` for the row classes and the `--sgs-header-height` publisher). Source: `plugins/sgs-blocks/src/header-behaviours/view.js` adds `is-row-shrunk` past 50 px and `is-row-hidden` past 100 px; a `ResizeObserver` on the header then writes `--sgs-header-height` to `document.documentElement` and `document.body`, which is an inherited custom property, so the whole tree restyles. The header itself holds 396 of the 1,718 elements, so the 1,100 elements per event come from inheritance and `:root:has()`, not from the header subtree alone.
- Event 1 (class toggle) is a `:root:has(...)` re-match: removing the three `:root:has(` rules (`.sgs-cart-*[open]`, `.sgs-modal-*:modal`, `.sgs-nav-drawer-*[open]` scrims) drops exactly one big event and about 1,100 elements. Events 2 and 3 (the two `--sgs-header-height` publishes, one per header state) vanish when the writes are suppressed.
- The per-frame work during the scroll is small: with the header script blocked the whole gesture holds 204 to 449 ms of recalculation at 4x, made of `Animation` invalidations on `.sgs-brand-strip__set` (74 per run) and `.sgs-has-block-link` (66), the hero image's inline style (`--sgs-scroll-y` and `--sgs-scroll-progress`, 42 per run, 19 elements each) and a few reveals.
- Cost per recalculated element is not unusual (882 ms over 3,753 elements as built, 230 ms over 344 with the script blocked), so element count, not rule matching cost per element, drives it.

Proven: the stall is `header-behaviours/view.js` (class toggles on the header rows plus republishing `--sgs-header-height` on the root), amplified by three `:root:has()` rules. Not proven: why the `:has()` re-match restyles about 1,100 elements (only the trace's reason string "Affected by :has()" on `HTML` is known), and which rules in the 330 KB sheet make the inherited-property change expensive (the whole-sheet removal test is confounded). Hover, observers, reveals (partly open), CSS animations and `@property` chains are not the cause.

Earlier leads checked: blocking `fx-parallax.js` changing little is consistent (the script writes one inline style per frame, 19 elements). A running marquee animation costs a small steady amount, not the stall.

## B. Does the image stay in step? (painted frames, error e in px, negative = photo lags)

Cells are median [min to max] across five runs of the per-run statistic. Ideal driver gives 0; the parallax-off row shows the harness floor. Ratio 0.18, so 1 px of error is about 5.6 px of scroll.

### 1440x900 (text not masked)

| Condition | CPU | Median abs error | p95 abs error | Max abs error | Reading |
|---|---|---|---|---|---|
| (i) As built | 1x | 11.1 [2.2 to 15.6] | 20.0 [11.1 to 34.1] | 22.3 [13.7 to 39.4] | lags; first run was low, the other four 9.5 to 15.6 |
| (i) As built | 4x | 29.3 [19.1 to 33.2] | 55.9 [47.9 to 61.7] | 61.1 [53.2 to 66.8] | lags badly |
| (ii) Parallax off (baseline, negative control) | 1x | 0.4 [0.4 to 0.5] | 0.8 | 0.8 | harness floor |
| (ii) Parallax off | 4x | 0.4 | 0.8 [0.8 to 0.9] | 0.8 [0.8 to 0.9] | harness floor |
| (iii) Native `translate`, script blocked | 1x | 0.5 [0.3 to 0.5] | 0.8 [0.5 to 0.8] | 0.8 [0.6 to 1.6] | in step |
| (iii) Native `translate`, script blocked | 4x | 0.6 [0.4 to 0.6] | 0.8 [0.6 to 0.8] | 0.9 [0.7 to 3.2] | in step; one run's max 3.2 px |
| (iv) Native `transform`, script blocked | 1x | 0.4 [0.4 to 0.5] | 0.7 [0.7 to 0.8] | 0.8 [0.7 to 0.8] | in step |
| (iv) Native `transform`, script blocked | 4x | 0.5 [0.4 to 0.5] | 0.7 [0.6 to 0.9] | 0.7 [0.6 to 0.9] | in step |
| (v) As built, `round()` removed | 1x | 6.7 [2.3 to 15.8] | 19.9 [7.0 to 34.4] | 22.0 [8.0 to 39.5] | inside the as-built spread: no demonstrated effect |
| (v) As built, `round()` removed | 4x | 11.6 [8.1 to 31.3] | 43.6 [34.6 to 58.7] | 48.9 [39.8 to 63.9] | median lower but ranges overlap: no demonstrated effect |
| As built, `header-behaviours/view.js` blocked (cause test) | 1x | 1.9 [1.9 to 1.9] | 2.5 [2.3 to 2.5] | 2.7 [2.5 to 2.7] | lag nearly gone |
| As built, `header-behaviours/view.js` blocked | 4x | 2.0 [1.9 to 2.1] | 5.5 [5.5 to 5.6] | 6.9 [5.7 to 8.5] | lag nearly gone; the script driver still trails by about 2 px |

### 375x812 (hero text hidden for tracking)

| Condition | CPU | Median abs error | p95 abs error | Max abs error | Reading |
|---|---|---|---|---|---|
| (i) As built | 1x | 2.5 [2.4 to 2.5] | 9.7 [5.7 to 9.8] | 11.3 [8.3 to 11.5] | lags (less than desktop) |
| (i) As built | 4x | 7.3 [4.1 to 10.3] | 32.7 [27.4 to 34.1] | 37.0 [31.9 to 38.4] | lags |
| (ii) Parallax off | 1x | 0.8 | 1.1 | 1.1 | harness floor |
| (ii) Parallax off | 4x | 0.8 [0.7 to 0.8] | 1.1 [1.0 to 1.1] | 1.1 | harness floor |
| (iii) Native `translate` | 1x | 0.9 [0.9 to 1.1] | 1.5 [1.3 to 1.6] | 1.5 [1.4 to 1.7] | in step |
| (iii) Native `translate` | 4x | 0.9 [0.8 to 1.0] | 1.4 [1.3 to 1.4] | 1.4 [1.4 to 1.6] | in step |
| (iv) Native `transform` | 1x | 1.0 [0.9 to 1.1] | 1.5 [1.4 to 1.6] | 1.6 [1.5 to 1.7] | in step |
| (iv) Native `transform` | 4x | 0.9 [0.8 to 0.9] | 1.4 [1.3 to 1.4] | 1.4 [1.3 to 1.6] | in step |
| (v) As built, `round()` removed | 1x | 2.9 [2.8 to 3.1] | 5.5 [5.1 to 5.9] | 8.3 [6.6 to 8.3] | lower than as built here, but the as-built range at 1x is only 5.7 to 9.8 so it is a weak difference; not claimed |
| (v) As built, `round()` removed | 4x | 7.4 [4.2 to 9.0] | 31.3 [29.4 to 32.7] | 35.6 [33.7 to 37.0] | same as built |

How the error arises (one run each, `runs/B1-base-1440-c1-0` and `c4-0`): the error is about -1.5 px at S 24, grows to -14 px (1x) or -50 px (4x) between S 90 and 400 (where the header collapses and the three recalculations run), then recovers to -2 to -4 px for the rest of the scroll. So the photo is late during the header stall and trails by 2 to 4 px afterwards. Page scroll itself stays on the compositor thread (`SCROLL_COMPOSITOR_THREAD` on 108 to 117 of about 160 frames) and presented about 79 distinct positions per run in every condition, which is why a frame-rate test cannot see this fault.

Native drivers use `animation: ... linear both; animation-timeline: scroll(root block)` with keyframes from 0 to `0.18 x (scrollHeight - innerHeight)` px, injected into the tab. This is a stand-in for the production mapping, not the production mapping (see the recommendation).

## C. Did (iii) and (iv) run on the compositor? Does Ken Burns's `scale` break it?

Evidence is the DevTools `LayerTree.compositingReasons` of the hero photo's layer after a 120 px scroll (`clayers.mjs`, one run per row), plus the painted-frame result under main-thread load.

| Condition | Photo has its own layer | Compositing reason reported | Animations on the element |
|---|---|---|---|
| As built (script-driven) | no (0 layers) | none | Ken Burns finished only |
| Native `translate`, Ken Burns finished | yes | `ActiveTranslateAnimation` ("Has an active accelerated translate animation or transition.") | `CSSAnimation` on a `ScrollTimeline`, running |
| Native `transform`, Ken Burns finished | yes | `ActiveTransformAnimation` | same |
| Native `translate`, Ken Burns still running (scale 1.005 and falling) | yes | `ActiveTranslateAnimation` | scroll-timeline animation plus the Ken Burns document-timeline animation both running |
| Same plus `will-change: translate` | yes | `ActiveTranslateAnimation` and `WillChangeTranslate` | same |

- Both native properties run as accelerated animations; Ken Burns's `scale` (driven by `--sgs-kb-s`, a main-thread registered-property animation) on the same element did not remove the translate layer's accelerated reason. That is a layer-tree statement, not a statement that the two never contend for the same frame.
- The behavioural proof is B: with the header's three big recalculations still running at 4x, native `translate` kept p95 error at 0.8 px while the script driver reached 55.9 px.
- Trace evidence is weaker than expected: `PipelineReporter` reported `has_compositor_animation: false` on every frame in the native runs, and the `Animation` trace event for the injected animation was not captured because it was created before tracing started. The flag therefore did not confirm compositor animation; the layer tree and the painted frames did. I could not make the trace alone prove it.
- The built page's photo is not on its own layer, so every offset write repaints the layer it shares.
- Attempted and invalid: a 1.2 s main-thread busy loop started at the gesture start (`J1`) delayed the gesture itself (first moving frame about 1.6 s after the screencast start), so it did not test the compositor. Its numbers are not used.

## D. Proposed pass bar for a smoothness acceptance test

Measure the photo's offset against the page in painted frames, exactly as in B, with the parallax ratio r of the block under test: error e = (photo offset relative to its section) minus r x (scroll since start), in px, over every presented frame from scroll start until the section's lower edge nears the header (the window in which the tracker is valid; here S up to 560 at 1440 and 480 at 375).

| Quantity | Pass bar (ratio 0.18) | Equivalent scroll lag | Measured, good driver (native) | Measured, built (must fail) |
|---|---|---|---|---|
| p95 abs e at CPU 4x, worst of 5 runs | at most 4 px | 22 px, 44 ms at 500 px/s | 0.9 (1440), 1.4 (375) | 61.7 (1440), 34.1 (375) |
| max abs e at CPU 4x, worst of 5 runs | at most 6 px | 33 px, 67 ms | 3.2 (1440, one outlier run), 1.6 (375) | 66.8 (1440), 38.4 (375) |
| p95 abs e at CPU 1x, worst of 5 runs | at most 3 px | 17 px | 0.8 to 1.6 | 34.1 (1440), 9.8 (375) |

For other ratios scale the bars by r / 0.18, because error grows with r. Fifteen runs measured here: all native runs pass; all as-built runs fail at 4x and at 1x desktop; as built at 375 1x is the one cell near the bar (p95 5.7 to 9.8 against 3 px) and still fails.

How to run it automatically: a Playwright script (the one in `E:/sgs-tmp/media-t11/` is the model) that loads the page from a HAR, waits for entrance animations, sets CPU 4x, injects the two rulers, scrolls with `Input.synthesizeScrollGesture` (650 px at 500 px/s, never `scrollTo`), records `Page.startScreencast`, and discards a run unless scrollY ends within 25 px of the gesture distance. Five runs; report median and spread; fail on the worst run.

Controls the test must carry:

- Negative control (expected to read zero): the same page with the effect switched off (`--sgs-fx-plx-offset: 0px`) must give p95 at most 1.1 px, which is the harness floor measured here (0.8 to 1.1). If it reads more, the tracker is wrong and the whole run is void.
- Positive control (expected to fail): the as-built script driver with the header behaviours running at 4x must fail the bar; here it gave p95 47.9 to 61.7 px. A smoothness test that cannot fail this is not testing smoothness.
- Cause control: the same page with the header script blocked must improve markedly (here 55.9 to 5.5 px p95 at 4x), which shows the test follows main-thread stalls.

Frame rate, `requestAnimationFrame` sampling and distinct-scroll-position counts must not be the gate: compositor scroll presented about 79 positions in every condition including the laggy one.

## Recommendation: how SGS should drive scroll-linked effects

1. Drive the photo's parallax with a native scroll-linked animation of `translate` (or `transform`) wherever `animation-timeline` exists, and keep the script writer only as the fallback. Evidence: B and C. It stayed in step at 1x and 4x, at both viewports, even with the header's recalculations running, because the compositor owns it; the script driver depends on the main thread and loses it.
2. Map it with a view or section timeline and `animation-range` (`timeline-scope` or `view()` on the section) rather than the stand-in root range used here, so the offset equals `ratio x distance` per Spec 49 §10.2 without a script. This is not tested here: the root-range keyframes are a stand-in, and the section-relative mapping, overscan sizing and the `basis: page` formula `max(0, scrollY - blockTop)` still need their own run of the D test.
3. Fall back to `@sgs/scroll-driver` plus `fx-parallax.css` only inside `@supports not (animation-timeline: scroll())`, which per Spec 38 §support table means Firefox stable. Under that fallback the bar should be assessed with the main thread quiet: with the header script blocked the script driver still trails by about 2 px at 1x and 5.5 px (p95) at 4x, so it may miss the 4 px bar at 4x; that is a stated limitation of the fallback, not a reason to drop it. Safari 26 supports the property per the Spec 38 table; it was not tested here.
4. Fix the header independently of the redesign, because it also stalls every other main-thread effect: stop publishing `--sgs-header-height` on `<html>` and `<body>` as an inherited value that restyles the whole tree (scope it to the header's consumers, or write it once per breakpoint and not per state change), and scope the three `:root:has(...)` drawer, modal and cart-scrim rules to a class the scripts set on `<html>`. This study did not fix anything; the evidence is table A.
5. Do not spend effort on `round()` removal or `will-change` for this fault (B row (v) and the earlier `will-change` lead): neither shows an effect beyond the spread. Registered-property chains and CSS animations also show none (table A).
6. Keep Ken Burns on `scale` and parallax on `translate` as separate properties: C shows the translate animation stayed accelerated while `scale` ran.
7. Put the D test in the acceptance gate for Spec 49 §10.2 ("verified at speeds 0.1, 0.5 and 1, both signs, both bases, at 375 and 1440"): the bar scales with the ratio, and the negative and positive controls travel with it.

## What is proven, and what is not

Proven (with the table that proves it):
- The main-thread stall at scroll start is `header-behaviours/view.js` (A: bigN 3 to 0, elements 3,753 to 344; B: p95 20.0 to 2.5 px at 1x, 55.9 to 5.5 at 4x).
- Two sub-causes within it: the `--sgs-header-height` writes (two events) and a `:root:has(...)` re-match triggered by the row class toggles (one event); each removable independently (A rows 3 to 5).
- The built script driver lags the page by 11 to 62 px of photo offset at desktop; native `translate` and `transform` do not (B).
- Native drivers own a compositor layer with an active accelerated animation, with and without Ken Burns running (C).

Not proven or not done:
- Why the `:has()` re-match restyles about 1,100 elements (only the reason string is known); the 330 KB sheet's role beyond those three rules (the empty-sheet test was confounded).
- Hover, reveals and observers have no demonstrated effect; the reveal block-test total is partly lower (586 vs 882 ms medians) but overlaps the as-built range, so it is neither confirmed nor ruled out as a small contributor.
- `round()` removal: no demonstrated effect (ranges overlap), not shown to be harmless either.
- One machine (RTX 2060), Chrome only, Chrome's CPU throttle as the slow-device model, one site (Eye Care), one hero, ratio 0.18. Mobile runs hid the hero text for tracking. Safari and Firefox not tested.
- Production mapping of the native animation (section range, overscan, `basis: page` formula) not tested; the keyframes used were root-range stand-ins.
- Browser-trace proof of compositor execution was not obtained (the `has_compositor_animation` flag stayed false and the `Animation` event was outside the trace); the layer tree and painted frames carry it.
- The earlier lead "11 to 14 distinct photo positions at 4x" came from main-thread sampling; it is not reproduced here in the painted frames, where the photo moves continuously but late.

## Files

- `E:/sgs-tmp/media-t11/run.mjs`, `batchA.mjs`, `batchB.mjs`, `metrics.mjs`, `analyzeB.py`, `analyzeRun.py`, `aggA.py`, `aggB.py`, `clayers.mjs` (harness and analysis)
- `E:/sgs-tmp/media-t11/site.har` (replayed page), `resA-*.json` (trace metrics per run), `resB-*.json` (painted-frame results per run), `runs/*/analysis.json` (per-frame series for kept runs)
- Code read: `plugins/sgs-blocks/src/shared/effects/fx-parallax.js`, `scroll-driver.js`, `plugins/sgs-blocks/assets/css/fx-parallax.css`, `motion.css`, `plugins/sgs-blocks/src/header-behaviours/view.js`; specs 38A §9 and §10, 38 support table, 49 §10.2.
