# T10: which framework effects actually work (live run, 2026-11-09)

Canary `sandybrown-nightingale-600381.hostingersite.com`, real Chrome (`SGS_HEADED=1`, Firefox where a probe adds it), one browser job at a time, no site changes. Scratch and logs: `E:/sgs-tmp/media-t10/` (`qa-motion.log`, `byhand.log`, `morph2.log`, `step5.mjs`, `step5.json`, `wave-3037.png`, `wave-2740.png`). Rows keep T9's names (`T9-effects-built.md`).

## Canary version

The deployed commit is `e2c227b79`, from the last non-dry sandybrown line in `~/.sgs-deploy-timings.jsonl` (2026-11-09T02:22:58Z, scope both). Command: `git diff --stat e2c227b79..b64c361cf` over motion code (effects, includes/motion, assets, motion-qa, extensions, decorative-image, theme) shows 9 files changed, 21 commits. Effects changed after the canary: marquee overflow test (`src/shared/effects/fx-marquee.js`, commits `b74c498fb`, `cc6f5ca3a`, `4b3c5d95d`, `f791e433b`), Ken Burns first-frame value (`class-sgs-motion-effect-properties.php::ken_burns_first_frame`), and a real `<img>` background parallax with 9% overscan (`assets/css/motion.css`, `img[data-sgs-mc~="background-position"]`). Those three changes were not run; the verdicts below test canary code only.

## Standing run: `npm run qa:motion` (19 probes, serial, 1463 s)

Result: 17 probes pass, 2 fail on the first run (`probe-motion-model.mjs`, `probe-marquee.mjs`), and `probe-morph-geometry.mjs` crashed on a 30 s `page.goto` timeout (host slow, not a result). Rerun alone: `SGS_HEADED=1 node scripts/motion-qa/probe-morph-geometry.mjs` printed `PASS — geometry changed across 45 distinct values and ended somewhere other than it started. Morph animates live.` No "Checking your browser" page or 403 was seen. Zero UNANSWERED in the standing run.

| Probe | Seconds | Pass / fail / control-red rows | Result |
|---|---|---|---|
| probe-morph-geometry | 31.2 then rerun | rerun PASS | first run goto timeout, rerun passes |
| probe-motion-path-repeat | 26.3 | line result | `PASS — pass 1 (8) and pass 2 (8) both animate.` (375) |
| probe-good-by-default | 24.9 | line result | `all four effects are SAFE by default ... pin-scrub additionally pins` (held 900 px, control 0 px) |
| probe-motion-model (1440 chromium and firefox only) | 263.0 | 59 / 2 / 57 | FAIL: `hover-none-tap` in both engines, measured `0px -6px`, expected none after a tap under hover:none |
| probe-scroll-progress | 58.6 | 10 / 0 / 12 | pass |
| probe-ambient-float | 78.4 | 30 / 0 / 16 | pass |
| probe-motion-loop-delays (x3 pages) | 7.2, 7.0, 11 | 18, 18, 21 / 0 | pass at 1440, 768, 375 |
| probe-motion-form-states | 18.7 | 28 / 0 / 6 | pass (1440, 375) |
| probe-close-clip-edge-live | 16.3 | 16 / 0 / 5 | pass (1440) |
| probe-layer-off-per-effect | 30.0 | 16 / 0 / 4 | pass (375, 768, 1440, resize) |
| probe-vanilla-off-per-tier | 40.3 | 54 / 0 / 10 | pass (375, 768, 1440, resize) |
| probe-motion-drawer-close-together | 21.4 | 6 / 0 / 4 | pass (375 only) |
| probe-parallax | 44.8 | 57 / 0 / 13 | pass (1440) |
| probe-motion-per-device | 77.2 | 42 / 0 / 42 | pass (375, 768, 1440) |
| probe-motion-a11y | 72.2 | 21 / 0 / 18 | pass (375, 768, 1440) |
| probe-looping-media | 134.2 | 18 / 0 / 24 | pass (1440 only) |
| probe-marquee | 485.8 | 160 / 4 / 116 | FAIL: `marquee-hover` chromium measured ratio 0.80 expected held still; firefox 0.67 expected 0.15x; `marquee-title-layout` at 375 (both engines) title not above the strip (root y 120-194, lane y 70-274, title y 120-142) |

CONTROL_RED rows are the probes' negative controls reporting red as designed; they are not failures.

## By-hand probes (serial, `byhand.log`)

| Probe, page | Exit | Result |
|---|---|---|
| probe-magnet 5259 | 2 | 10 pass, 0 fail, 1 UNANSWERED: `magnet-nav-label` needs a nav-bar label magnet page (`--nav-page`), none given |
| probe-sheen 5263 | 0 | 13 pass, 0 fail |
| probe-follow-pointer 5255 | 0 | 7 pass, 0 fail |
| probe-ripple 5261 | 1 | 10 pass, 1 FAIL: `ripple-reduced:down`, `afterAnimations` 1, expected 0 (a ripple animation still exists under reduced motion) |
| probe-cursor-field 2120 (URL form) | 1 | no result: `[FAIL] no [data-sgs-cursor-field] element on the page`, fixture wrong or rotted; treated as UNANSWERED |
| probe-cursor-field-reveal 5270 | 1 | 8 pass, 3 FAIL (`reveal-radius`, `reveal-clip-follows-pointer`, `reveal-wash`, 1440), 1 UNANSWERED (`reveal-picture`, pointer moved during screenshot in headed Chrome) |
| probe-horizontal-panel-params 5267 | 0 | 16 pass, 0 fail |
| probe-motion-stacks 5272 | 0 | 9 pass, 0 fail |
| probe-motion-nav-drawer 5276 | 0 | 12 pass, 0 fail |
| probe-wave-c (default page) | 1 | crashed: `Cannot read properties of undefined (reading 'getBoundingClientRect')` at `runArm`; fixture rotted; UNANSWERED |

Not run by hand (not listed in `motion-qa.md` with a page id): `probe-carousel-loop.mjs`, `probe-tier-w-surface.mjs`, `probe-motion-nav-bar.mjs`, `probe-horizontal-panel-focus.mjs`.

## Direct checks (step 5, `step5.mjs`, real Chrome, 375/768/1440)

Page 5223 at all three widths: the one `[data-sgs-mh]` element (an `sgs/info-box`) goes `translate 0px -> 0px -6px` and `scale 1 -> 1.04` under a real mouse hover. Page 5223 has no image-zoom or filter element, so those two hover rows are not covered. Lenis: `html.lenis` is present at all three widths; a real `Input.synthesizeScrollGesture` wheel of 1200 px produced about 90 scroll frames with a step of 1 to 25 px (eased, not a jump). Wave pages: 3037 has 6 `wave-gradient` elements and 2 canvases (matches the 0/0/0/0/1/1 split), 2740 has 2 `wave-gradient` elements and 0 canvases. Captures `wave-3037.png`, `wave-2740.png` were saved but not visually judged.

## Verdict per T9 effect

| Effect | Verdict | 375 / 768 / 1440 | Evidence | Notes |
|---|---|---|---|---|
| hover-lift | works | direct: all three; probe: 1440 | step5 `translate 0px -6px` on 5223; motion-model `hover-lift-scale` PASS | `hover-none-tap` FAIL (see form of that row below) |
| hover-scale | works | all three / 1440 | step5 `scale 1.04`; motion-model `hover-lift-scale` PASS | |
| hover-image-zoom | not run: no fixture | none | no zoom element on 5223 | same code path as scale, not measured |
| hover-rotate-translate | works (tilt only) | 1440 | motion-model tilt rows PASS on 5226; probe-follow-pointer 7 pass | rotate on hover alone not isolated |
| hover-filter | not run: no fixture | none | no filter element on 5223 | |
| hover-indent-width-ring-accent | not run: no fixture | none | | |
| magnet | works | 1440 | probe-magnet 5259: 10 pass, 0 fail | nav-label part UNANSWERED (no nav page) |
| sheen | works | 375/768/1440 | probe-sheen 5263 13 pass; probe-vanilla-off-per-tier 54 pass | |
| glare | works | 1440 | probe-follow-pointer `glare-layer` pass | |
| follow-pointer (tilt) | works | 1440 | probe-follow-pointer 5255 7 pass; probe-motion-stacks 5272 9 pass | |
| ripple | partly works | 1440 | probe-ripple 5261: 10 pass, FAIL `ripple-reduced:down` (afterAnimations 1, expected 0) | plays an animation under reduced motion; vanilla-off-per-tier passes at all three widths |
| cursor-field | partly works | 1440 | image reveal (5270): 8 pass, 3 FAIL (radius, clip follows pointer, wash); glow (2120): no `[data-sgs-cursor-field]` on page, UNANSWERED | reveal values: radius 0 to 90 over 16 distinct values, settle 317 ms, so it animates; the failing judges need a look |
| entrance presets | works | 1440 (model), 375/768/1440 (per-device) | motion-model PASS rows; probe-motion-per-device 42 pass | |
| scroll-reveal (IntersectionObserver trigger) | works | 1440 | probe-motion-model PASS | |
| multi-keyframe entrance | works | 1440 | probe-motion-model 5226 PASS | |
| loop-delay stagger | works | 375/768/1440 | probe-motion-loop-delays x3, measured [0,80,160,...] and [0,140,...,700] equal expected | |
| curtain | not run: no fixture | none | | |
| nav drawer and submenu stagger | works | 1440 (375 close-together) | probe-motion-nav-drawer 5276 12 pass; probe-motion-drawer-close-together 6 pass | |
| form and choice-flow states | works | 375, 1440 | probe-motion-form-states 28 pass | |
| split-reveal | works | 1440 | probe-good-by-default `split-reveal: opacity=1 ... SAFE` | tests safe-by-default, not the reveal motion itself |
| scramble | works | 1440 | same probe, `scramble ... SAFE` | same caveat |
| draw | works | 1440 | probe-looping-media `draw-load` PASS | |
| scrub | works | 1440 | probe-good-by-default `scrub ... SAFE` | safe-by-default only |
| pin-scrub | works | 1440 | probe-good-by-default `PASS — held for 900px of scroll while the control held 0px` | |
| horizontal-panel | works | 1440 | probe-horizontal-panel-params 5267: 16 pass | |
| motion-path | works | 375 | `PASS — pass 1 (8) and pass 2 (8) both animate.` | |
| morph | works | 1440 | rerun `PASS — geometry changed across 45 distinct values` | first run timed out on page load |
| image-sequence | not run: no fixture | none | | |
| scroll-progress | works | 1440 | probe-scroll-progress 10 pass | |
| parallax | works (canary code) | 1440 | probe-parallax 57 pass, 0 fail | real-`<img>` background parallax is newer than canary: not run, newer than canary |
| ken-burns | works (canary code) | 1440 | probe-looping-media 18 pass (`kb-hold`, `kb-samples`) | first-frame change is newer than canary: not run, newer than canary |
| ambient-float | works | 1440 | probe-ambient-float 30 pass | |
| svg-loop | works | 1440 | probe-looping-media `svg-samples`, `loop-pause` PASS | |
| marquee | partly works | 375, 1440 | probe-marquee: 160 pass, 4 FAIL (hover ratio, title layout at 375) | overflow-only run is newer than canary: not run, newer than canary |
| carousel-loop | not run: no fixture | none | probe exists, no page id | |
| draggable | not run: no fixture | none | | |
| flip | not run: no fixture | none | | |
| lottie | works | 1440 | probe-looping-media `lottie-scroll` PASS | |
| particles | not run: no fixture | none | | |
| grid-dots | not run: no fixture | none | | |
| generative-background | not run: no fixture | none | | |
| wave-gradient | UNANSWERED | 1440 render only | `probe-wave-c.mjs` crashed (fixture rotted); direct: 3037 has 6 effects and 2 canvases, 2740 has 2 effects and 0 canvases | not proved to animate; captures unjudged |
| surface-treatment | not run: no fixture | none | no page id | |
| scroll-smoother (Lenis) | works | 375/768/1440 | `html.lenis` true; wheel gesture gave ~90 frames, 1-25 px steps | smoothness read from scroll positions only |
| page-transitions | not run: no fixture | none | | |
| decorative-image fade-on-scroll | not run: no fixture | none | | |
| Background panel "Fixed (parallax)" | not run: no fixture | none | | |
| media SVG presentation animation | not run: no fixture | none | | |
| counter count-up | not run: no fixture | none | | |
| countdown flip | not run: no fixture | none | | |
| timeline connector progress | not run: no fixture | none | | |
| testimonial-slider carousel | not run: no fixture | none | | |
| google and trustpilot review sliders | not run: no fixture | none | | |
| post-grid carousel and infinite load | not run: no fixture | none | | loop delays only (5442, pass) |
| before-after divider | not run: no fixture | none | | |
| audio visualisers | not run: no fixture | none | | |
| video player chrome | not run: no fixture | none | | |
| header behaviours | not run: no fixture | none | | 5395 is a baseline only |
| nav indicator and label magnet | not run: no fixture | none | | `magnet-nav-label` UNANSWERED |
| theme smooth scroll (anchor links) | not run: no fixture | none | | |

Extra finding on hover: `probe-motion-model` `hover-none-tap` FAIL in chromium and firefox (a tap under hover:none left `translate 0px -6px`). Cause unproven: headed real Chrome cannot emulate hover:none, so this may be a harness limit rather than a defect; one real touch device or an emulated-touch run would settle it.

## Counts

Works: 32 (hover-lift, hover-scale, hover-rotate-translate, magnet, sheen, glare, follow-pointer, entrance presets, scroll-reveal, multi-keyframe, loop-delay stagger, nav drawer stagger, form and choice-flow states, split-reveal, scramble, draw, scrub, pin-scrub, horizontal-panel, motion-path, morph, scroll-progress, parallax, ken-burns, ambient-float, svg-loop, lottie, scroll-smoother; of these parallax and ken-burns work on canary code only). Partly works: 3 (ripple, cursor-field, marquee). Broken: 0 proven. UNANSWERED: 1 (wave-gradient). Not run, no fixture: 30. Not run, newer than canary: 0 whole rows, 3 sub-changes (marquee overflow-only, Ken Burns first frame, real-image background parallax).

## Effects with no fixture

curtain, image-sequence, hover-image-zoom, hover-filter, hover-indent-width-ring-accent, carousel-loop (no page id), draggable, flip, particles, grid-dots, generative-background, surface-treatment (no page id), page-transitions, decorative-image fade-on-scroll, Background panel "Fixed (parallax)", media SVG presentation animation, counter count-up, countdown flip, timeline connector progress, testimonial-slider carousel, google and trustpilot review sliders, post-grid carousel and infinite load, before-after divider, audio visualisers, video player chrome, header behaviours, nav indicator and label magnet, theme smooth scroll (anchor links). Broken or rotted fixtures: cursor-field glow page 2120 (no `[data-sgs-cursor-field]` element), wave-c default page.

## Smoothness versus position

No standing or by-hand probe measures smoothness (frame-to-frame step size, dropped frames or jank). They sample values at chosen moments and judge position, travel, start and end values, timing, reduced-motion and pause state (examples: `parallax-translate`, `parallax-travel`, `kb-samples`, `float-samples`, `marquee-rate`, `scroll-progress-bar`). `parallax-frame-still` checks that a frame stays put, not that motion is smooth. The only smoothness-adjacent read in this run is the Lenis wheel check in `step5.mjs`, which records scroll position per animation frame (about 90 frames, steps of 1 to 25 px) and does not judge it against a threshold. T11 covers parallax smoothness.
