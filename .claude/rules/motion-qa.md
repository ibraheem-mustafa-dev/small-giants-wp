---
paths:
  - "plugins/sgs-blocks/scripts/motion-qa/**"
  - "plugins/sgs-blocks/src/blocks/**/view.js"
  - "plugins/sgs-blocks/includes/**/*motion*"
---

# Motion QA

```bash
npm run qa:motion                    # all standing live probes, the full set (19 probes, about 950s serial)
npm run qa:motion -- --tier smoke    # the 15 probes the deploy runs by default (about 350s); --list prints the selection without running anything
npm run qa:motion:morph              # fx-morph changes SVG geometry (page 2113)
npm run qa:motion:motion-path        # motion-path re-animates on pass 2 (page 2109)
npm run qa:motion:good-by-default    # scrub/scramble/split-reveal/pin-scrub (pages 2103, 2603)
node scripts/motion-qa/probe-motion-model.mjs --page 5223 --page 5226 --page 5229 --page 5395 --engine chromium --engine firefox --engine webkit --width 375   # Spec 38A motion model (the trees: tests/fixtures/motion/pages/)
```

Wired into `build-deploy.py` as `step_motion_qa()` — ON by default for blocks deploys to the canary, after `step_verify_payload()`, opt out with `--skip-motion-qa`. The deploy picks the tier itself (`--motion-qa-tier auto`): smoke unless the full set is due (no recorded full pass, a record over 24 hours old, or a file matching `scripts/motion-qa/full-tier-paths.json` changed since it, uncommitted payload files included); the log line `[motion-qa] tier ...` says which and why. How the choice works and how to add a probe or a path: `.claude/deploy-architecture.md`.

Each probe in `PROBES` lists its `tiers`. `probe-marquee.mjs` (367s), `probe-looping-media.mjs` (127s), `probe-motion-per-device.mjs` (56s) and `probe-motion-a11y.mjs` (50s) are full-only; a new probe over about a minute should be too, and its source paths belong in `full-tier-paths.json`. Never run probes in parallel (`--parallel` above 1) against the canary: four at a time on 2026-10-17 made probes fail on non-200 pages and the CDN answered 403 to everything for about seven minutes. When another session is on the canary, take turns by message.

Not in `prebuild`, on purpose — these need a live canary. Post-deploy is the honest home: the canary is up by definition, and the payload gate has just proven the live plugin is this run's payload.

The runner registers only the probes that are standing checks with negative controls and stable fixtures (`PROBES` in `scripts/motion-qa/run-live-probes.mjs`). Other probes in the directory are one-shot artefacts, runnable by hand, not claimed as covered. Promoting one means giving it a fixture and a negative control first.

## Load-bearing canary fixtures — the deploy gate depends on these pages

| Page | What it feeds |
|---|---|
| 2103 | scrub / scramble / split-reveal (good-by-default) |
| 2109 | motion-path repeat-trigger |
| 2113 | fx-morph geometry |
| 2603 | pin-scrub pin + good-by-default |
| 2740 | FR-38-31 flowing gradient, single `pastel` instance |
| 3037 | wave-gradient SIX-variant canvas split — the 0/0/0/0/1/1 proof |
| 5223 | Spec 38A motion model: hover lift and scale, part Fade up, load entrances, reveal, the scroll-driver host element (`probe-motion-model.mjs`) |
| 5226 | Spec 38A motion model: three-keyframe entrance and tilt (`probe-motion-model.mjs`) |
| 5229 | Spec 38A motion model: a page with no motion, the asset-guard reference (`probe-motion-model.mjs`) |
| 5395 | Spec 38A motion model: the header baseline, one text block (`.m29-baseline`) under the site's own header and footer; `no-motion-assets` allows page 5229 only the motion assets this page loads, so a header carrying motion does not fail it (`probe-motion-model.mjs`, tree `tests/fixtures/motion/pages/header-baseline.json`) |
| 5244 | Spec 38A M3.9: per-device entrance distances, custom easings, part isolation, tilted cards and the polaroid frame (`probe-motion-per-device.mjs`, tree `tests/fixtures/motion/pages/motion-per-device.json`) |
| 5252 | Spec 38A Gate 4b (M5.1): a layer-based copy of page 2103, made by `Sgs_Motion_Migrate_Runner::migrate_content`; its nine `data-sgs-fx` elements must match 2103's (`probe-good-by-default.mjs` with 2103 swapped for 5252) |
| 5253 | Spec 38A M5.7 parallax: split hero media part at ratio -0.06 on the page basis, a 0.18 root, an image inside a still frame, a clamp and a control (`probe-parallax.mjs --page 5253`, tree `tests/fixtures/motion/pages/parallax.json`) |
| 5255 | Spec 38A M5.6 Follow pointer and glare: an info-box card with hover scale, Follow pointer at 8deg and glare, and a control card (`probe-follow-pointer.mjs --page 5255`, tree `tests/fixtures/motion/pages/follow-pointer.json`) |
| 5259 | Spec 38A M5.4 magnet: an over-element normalised-pull button, a proximity button that pulls from outside its box, and a control (`probe-magnet.mjs --page 5259`, tree `tests/fixtures/motion/pages/magnet.json`) |
| 5261 | Spec 38A M5.9 ripple: a pointerdown button with the reference-draft values, a click-trigger button and a control (`probe-ripple.mjs --page 5261`, tree `tests/fixtures/motion/pages/ripple.json`) |
| 5263 | Spec 38A M5.10 sheen: a card and a keyboard-focusable link card with sheen, and a control (`probe-sheen.mjs --page 5263`, tree `tests/fixtures/motion/pages/sheen.json`) |
| 5267 | Spec 38A M5.5 horizontal panel: an `sgs/timeline` horizontal with five panels (`probe-horizontal-panel-params.mjs --page 5267`, tree `tests/fixtures/motion/pages/horizontal-panel.json`) |
| 5270 | Spec 38A M5.11 cursor-field image reveal: two reveal cards and a control (`probe-cursor-field-reveal.mjs --page 5270`, tree `tests/fixtures/motion/pages/cursor-field.json`) |
| 5272 | Spec 38A M5.Z stacked effects: magnet (engage proximity, so it pulls toward a pointer still inside its 120px catch area) + sheen + ripple, Follow pointer + scale + lift, lift + view-basis parallax (ratio 0.08, clamp 40px, so it rests centred in the viewport and never leaves a 40px band, with a 56px gap between the boxes so the band never overlaps a neighbour) + Follow pointer, an image-reveal cursor-field (attachment 3457, box at least 220px tall) with ring + ripple + sheen, and a control (`probe-motion-stacks.mjs --page 5272`, tree `tests/fixtures/motion/pages/motion-stacks.json`) |
| 5250 | Spec 38A FR-38A-36 scroll progress: page bar, counter and section bar (`probe-scroll-progress.mjs`, fixture `tests/fixtures/motion/pages/scroll-progress.json`) |
| 5276 | Spec 38A M4.5 nav drawer stagger, a by-hand fixture (its probe is not in `PROBES`): a burger whose `drawerRef` is 5279 (`plugins/sgs-blocks/tests/fixtures/motion/pages/nav-drawer-stagger-page.json`; `probe-motion-nav-drawer.mjs --page 5276`) |
| 5279 | Spec 38A M4.5 `sgs_drawer` for page 5276, a by-hand fixture (`plugins/sgs-blocks/tests/fixtures/motion/pages/nav-drawer-stagger-drawer.json`) |
| 5316 | Spec 38A FR-38A-51 close order `together`, a by-hand fixture (its probe is not in `PROBES`): a burger whose `drawerRef` is 5314; on close every item closes with no delay and no hold, with 5276 (reversed) as the red control (`probe-motion-drawer-close-together.mjs --page 5316`, tree `nav-drawer-close-together-page.json`) |
| 5314 | Spec 38A `sgs_drawer` for page 5316: built from the old-shape tree `nav-drawer-close-together-drawer.json` (close in order off, the Primary Menu 1467 and a button) and migrated by `wp sgs motion-migrate --apply --post=5314`, so it carries the mapper's `closeOrder: together`; rebuild the same way, never by hand |
| 5287 | Spec 38A M3.10 motion accessibility: an entrance, captions revealed on hover, a hover card with a button, a looping float with a pause control and its twin without one (`probe-motion-a11y.mjs --page 5287 --axe-scope fixture`, tree `tests/fixtures/motion/pages/motion-a11y.json`) |
| 5297 | Spec 38A FR-38A-37 ambient float: three y floats with stored periods 2.8, 4.2 and 5s and phases 0, 900 and 2100ms (one with the pause button), a two-axis ring float, a focusable button float and a control (`probe-ambient-float.mjs`, tree `tests/fixtures/motion/pages/ambient-float.json`) |
| 5303 | Spec 38A FR-38A-52 looping media: a Ken Burns zoom-out-once from 108% over 20s, a 6s SVG pulse, a logo draw on load and a Lottie on scroll (`probe-looping-media.mjs`, tree `tests/fixtures/motion/pages/looping-media.json`; media IDs 3457, 2072 and 4079) |
| 5305 | Spec 38A FR-38A-44 marquee: a 45px/s brand strip with a 0.15x hover and 5% fade, a 60px/s trust bar below 1024px with tap to pause, a 40px/s brand strip, a 70px/s ticker below 768px, a titled trust bar, a trust bar with a scroll entrance, a control trust bar with no marquee, and the pause-button section (a trust bar with hold to pause and a brand strip, both with a faded lane); no other fixture shows a pause button; the brand strips are also judged on their tile: no padding, no border, no fill, the logo box is the tile and `contain` fills the longer side (`probe-marquee.mjs`, tree `tests/fixtures/motion/pages/marquee.json`) |
| 5344 | Spec 38A FR-38A-8 one-edge close: a bottom wipe and an all-edges control, both with a stored close value (`probe-close-clip-edge-live.mjs --page 5344`, tree `tests/fixtures/motion/pages/close-clip-edge.json`) |
| 5346 | Spec 38A FR-38A-23 per-effect off: three horizontal timelines with split-reveal alone on the root; `.mlo-a` off on mobile, `.mlo-c` off on tablet, `.mlo-b` control (`probe-layer-off-per-effect.mjs --page 5346`, tree `tests/fixtures/motion/pages/layer-off-per-effect.json`) |
| 5358 | Spec 38A FR-38A-23 vanilla off per tier: three pointerdown-ripple buttons (`.vro-a` off on mobile, `.vro-b` control, `.vro-c` off on tablet) and three hover-sheen cards (`.vso-a`, `.vso-b`, `.vso-c`), read at 375/768/1440 and across a resize (`probe-vanilla-off-per-tier.mjs --page 5358`, tree `tests/fixtures/motion/pages/vanilla-off-per-tier.json`) |
| 5436 | Spec 38A FR-38A-26 loop delays: a core `query` with a grid `post-template` and a `woocommerce/product-collection`, each with a stored stagger of 80ms; the stagger is injected into the stored block comments after every build, because core blocks register no `sgsMotion` (`probe-motion-loop-delays.mjs --page 5436 --item-selector ".m43-query [data-sgs-loop-i]"` and again with `.m43-products`, tree `tests/fixtures/motion/pages/loop-delays.json`, injector `loop-delays-inject.php`) |
| 5442 | Spec 38A FR-38A-26 loop delays for `sgs/post-grid`: six cards on 3, 2 and 1 columns at step 80ms with the default `entrance-fade-up` scroll entrance and stagger `apply` on, so the row-by-row arrival is visible, behind a short intro section so the grid is not the page's first section (the first section keeps its fade at full opacity, Spec 38A §9), and every card waiting for its entrance paints invisible (`probe-motion-loop-delays.mjs --page 5442 --item-selector ".m43-grid [data-sgs-loop-i]"`, tree `tests/fixtures/motion/pages/loop-delays-post-grid.json`); its own page so the `sgs/post-grid` loop-delay writer is judged apart from the core loops; it passes live (sandybrown 3a694a39b: 18 checks, 6 controls red, no `nth-child` delay rule) and is a standing probe in `PROBES` |
| 5451 | Spec 38A FR-38A-53 form and choice-flow states: links the saved `sgs_form` 5447 (invalid shake, step-changed slide, success fade) and the saved `sgs_choice_flow` 5449 (step-changed slide) (`probe-motion-form-states.mjs --form-url "/?p=5451" --flow-url "/?p=5451"`, trees `form-states-form.json`, `form-states-flow.json` and `form-states-page.json` in `tests/fixtures/motion/pages/`) |
| 5465 | Spec 38A FR-38A-41 parent perspective: an Indus-style grid of three Follow pointer cards with perspective 1100px on the parent grid (`.m41p-grid-parent`, cards `.m41p-parent-card`) beside a control grid whose cards keep the perspective on themselves (`.m41p-grid-self`, cards `.m41p-self-card`); every engine computes `perspective: 1100px` on the first grid's inner band only (tree `tests/fixtures/motion/pages/follow-pointer-parent.json`; the offline reading is `tests/fixtures/motion/rotate-council/run-parent.mjs` in Chromium, Firefox and WebKit) |
| 2120 | Spec 38 FR-38-25 cursor-field glow: a glow container with an opaque child (`probe-cursor-field.mjs`, tree `tests/fixtures/motion/pages/cursor-field-glow.json`, rebuilt in place with `--post-id 2120`) |

**Focus fixture (not a deploy-gate page).** Page 5389, "Focus system fixture" (slug `focus-system-fixture`, published), is the unified keyboard focus system's fixture: light, dark and photo `sgs/container` sections, each with SGS buttons, a multi-button, a core-styled button (`wp-block-button__link`), text links, a form (text, select, checkbox, radio), an option picker, an accordion, tabs and a testimonial slider (`plugins/sgs-blocks/tests/fixtures/focus/focus-system.tree.json`, read by `plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs --site sandybrown --pages 5389`). Never repurpose or delete it, and rebuild it only from that tree with `scripts/wp-build-page.js --post-id 5389`. URL: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=5389&preview=true

The one-shot probes for 5255, 5259, 5261, 5267, 5270 and 5272 pass live (2026-10-16, sandybrown 221929133; recalibrated in `9777277f6`, `e11be9ad6` and `0f5ce4a00`). Every canary page runs Lenis smooth scroll (`html.lenis`), and the host challenges Playwright's bundled headless Chromium after a burst of runs, so a live probe waits for the page to stop moving (`settleInView` in `probe-motion-model-lib.mjs`), reads after the effect's own transition, opens the page through `gotoThroughCheck`, and runs with `SGS_HEADED=1` (real Chrome for Chromium, through `launchOptions()`) when challenged. 5272 is held to a 200 KB CSS and 100 KB JS stress ceiling (Bean's ruling 2026-10-15).

Page 5196 (a draft, "Editor typing baseline (200 blocks)") is not a deploy-gate fixture: it is Spec 38A FR-38A-29's editor typing-latency page (`plugins/sgs-blocks/scripts/perf/editor-typing-baseline.json`), re-measured by M3.11. Never edit or delete it; its tree is `plugins/sgs-blocks/scripts/perf/fixtures/editor-200-blocks.json`.

Run the probes headed with `SGS_HEADED=1` when the host's edge answers a headless browser with its "Checking your browser" page (it does under burst load); the loop probes also wait for that page to hand over (`probe-loop-lib.mjs::passChallenge`). A check that reads painted pixels (a screenshot decoded on a canvas, `probe-cursor-field-reveal.mjs::samplePaint`) reports UNANSWERED in headed Chrome when a physical mouse sits over the window: the capture lets the real cursor override the synthetic pointer and collapses any pointer-driven state, so run it with the mouse still or headless.

All are titled `[GATE — DO NOT DELETE] …` on the canary so they survive a tidy-up. Deleting or emptying any of them breaks every blocks deploy until the fixture is rebuilt. Probes reference pages by ID (`?p=`), so renaming a title is safe but re-creating a page under a new ID is not.

Canary fixtures rot, and a probe cannot tell you which failure you have — every probe reports UNANSWERED separately from a real failure, so read its output rather than assuming a regression. A fixture authored before a schema change carries the old shape (e.g. a flat `"minHeight":"90vh"` string where `minHeight` is now a tier object), which is silently coerced to `{}` — never restore a trashed fixture, author fresh.
