---
paths:
  - "plugins/sgs-blocks/scripts/motion-qa/**"
  - "plugins/sgs-blocks/src/blocks/accordion/view.js"
  - "plugins/sgs-blocks/src/blocks/before-after/view.js"
  - "plugins/sgs-blocks/src/blocks/choice-flow/view.js"
  - "plugins/sgs-blocks/src/blocks/counter/view.js"
  - "plugins/sgs-blocks/src/blocks/decorative-image/view.js"
  - "plugins/sgs-blocks/src/blocks/form/view.js"
  - "plugins/sgs-blocks/src/blocks/gallery/view.js"
  - "plugins/sgs-blocks/src/blocks/google-reviews/view.js"
  - "plugins/sgs-blocks/src/blocks/mega-panel/view.js"
  - "plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js"
  - "plugins/sgs-blocks/src/blocks/nav-drawer/view.js"
  - "plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js"
  - "plugins/sgs-blocks/src/blocks/notice-banner/view.js"
  - "plugins/sgs-blocks/src/blocks/physics-canvas/view.js"
  - "plugins/sgs-blocks/src/blocks/testimonial-slider/view.js"
  - "plugins/sgs-blocks/src/blocks/timeline/view.js"
  - "plugins/sgs-blocks/src/blocks/trustpilot-reviews/view.js"
  - "plugins/sgs-blocks/src/blocks/extensions/motion/**"
  - "plugins/sgs-blocks/src/components/motion/**"
  - "plugins/sgs-blocks/src/shared/effects/**"
  - "plugins/sgs-blocks/src/shared/motion-pause/**"
  - "plugins/sgs-blocks/src/shared/motion-state-publish.js"
  - "plugins/sgs-blocks/includes/**/*motion*"
---

# Motion QA

```bash
npm run qa:motion                    # all standing live probes; --list prints the selection (and the counts) without running anything
npm run qa:motion -- --tier smoke    # the set the deploy runs by default when it runs motion QA
npm run qa:motion:morph              # fx-morph changes SVG geometry (page 2113)
npm run qa:motion:motion-path        # motion-path re-animates on pass 2 (page 2109)
npm run qa:motion:good-by-default    # scrub/scramble/split-reveal/pin-scrub (pages 2103, 2603)
node scripts/motion-qa/probe-motion-model.mjs --page 5223 --page 5226 --page 5229 --page 5395 --engine chromium --engine firefox --engine webkit --width 375   # Spec 38A motion model (the trees: tests/fixtures/motion/pages/)
```

Live motion QA is opt-in in `build-deploy.py::step_motion_qa()` (`--motion-qa-tier none|smoke|full|auto`, default `none`). Tier selection, how to add a probe or a full-tier path, and the full-only probe list: `.claude/deploy-architecture.md` "Live motion QA tiers". It is not in `prebuild` because it needs the live canary.

Never run probes in parallel (`--parallel` above 1) against the canary: the CDN answers 403 to everything for minutes. When another session is on the canary, take turns by message.

The runner registers only standing checks with negative controls and stable fixtures (`PROBES` in `scripts/motion-qa/run-live-probes.mjs`). Other probes in the directory are one-shot artefacts, not claimed as covered; promoting one needs a fixture and a negative control first.

## Load-bearing canary fixtures: the deploy gate depends on these pages

Each is titled `[GATE — DO NOT DELETE] …` on the canary. Deleting or emptying one breaks every motion-QA run until the fixture is rebuilt; probes find pages by ID (`?p=`), so a title can change but a page re-created under a new ID cannot. Per-tree detail for the rows that name a tree: `plugins/sgs-blocks/tests/fixtures/motion/pages/README.md`.

| Page | What it feeds (probe) |
|---|---|
| 2103 | scrub / scramble / split-reveal (good-by-default) |
| 2109 | motion-path repeat-trigger |
| 2113 | fx-morph geometry |
| 2603 | pin-scrub pin + good-by-default |
| 2740 | FR-38-31 flowing gradient, single `pastel` instance |
| 3037 | wave-gradient SIX-variant canvas split, the 0/0/0/0/1/1 proof |
| 5223, 5226, 5229 | Spec 38A motion model (`probe-motion-model.mjs`): 5223 hover lift and scale, part Fade up, load entrances, reveal, scroll-driver host; 5226 three-keyframe entrance and tilt; 5229 a page with no motion, the asset-guard reference |
| 5395 | Spec 38A header baseline, one text block (`.m29-baseline`) under the site's own header and footer; `no-motion-assets` allows 5229 only the assets this page loads (`probe-motion-model.mjs`, tree `header-baseline.json`) |
| 5244 | M3.9 per-device entrance distances, custom easings, part isolation, tilted cards, polaroid frame (`probe-motion-per-device.mjs`, tree `motion-per-device.json`) |
| 5252 | Gate 4b (M5.1): a layer-based copy of 2103 made by `Sgs_Motion_Migrate_Runner::migrate_content`; its nine `data-sgs-fx` elements must match 2103's (`probe-good-by-default.mjs` with 2103 swapped for 5252) |
| 5253 | M5.7 parallax: split hero media part at ratio -0.06 on the page basis, a 0.18 root, an image inside a still frame, a clamp and a control (`probe-parallax.mjs --page 5253`, tree `parallax.json`) |
| 5255 | M5.6 Follow pointer and glare: an info-box card with hover scale, Follow pointer at 8deg and glare, and a control card (`probe-follow-pointer.mjs --page 5255`, tree `follow-pointer.json`) |
| 5259 | M5.4 magnet (`probe-magnet.mjs --page 5259`, tree `magnet.json`) |
| 5261 | M5.9 ripple (`probe-ripple.mjs --page 5261`, tree `ripple.json`) |
| 5263 | M5.10 sheen: a card and a keyboard-focusable link card with sheen, and a control (`probe-sheen.mjs --page 5263`, tree `sheen.json`) |
| 5267 | M5.5 horizontal panel: an `sgs/timeline` horizontal with five panels (`probe-horizontal-panel-params.mjs --page 5267`, tree `horizontal-panel.json`) |
| 5270 | M5.11 cursor-field image reveal (`probe-cursor-field-reveal.mjs --page 5270`, tree `cursor-field.json`); `reveal-exit-glides` needs a stored `--sgs-cursor-field-ring-lag` on the card and reports UNANSWERED without one |
| 5272 | M5.Z stacked effects (`probe-motion-stacks.mjs --page 5272`, tree `motion-stacks.json`; image attachment 3457, a box at least 220px tall); held to a 200 KB CSS and 100 KB JS stress ceiling (Bean's ruling) |
| 5250 | FR-38A-36 scroll progress (`probe-scroll-progress.mjs`, tree `scroll-progress.json`) |
| 5276 | M4.5 nav drawer stagger, by-hand fixture, its probe is not in `PROBES`: a burger whose `drawerRef` is 5279 (`nav-drawer-stagger-page.json`; `probe-motion-nav-drawer.mjs --page 5276`) |
| 5279 | M4.5 `sgs_drawer` for page 5276, by-hand fixture (`nav-drawer-stagger-drawer.json`) |
| 5316 | FR-38A-51 close order `together`, by-hand fixture, probe not in `PROBES`: a burger whose `drawerRef` is 5314; on close every item closes with no delay and no hold, with 5276 (reversed) as the red control (`probe-motion-drawer-close-together.mjs --page 5316`, tree `nav-drawer-close-together-page.json`) |
| 5314 | `sgs_drawer` for page 5316, built from the old-shape tree `nav-drawer-close-together-drawer.json` and migrated by `wp sgs motion-migrate --apply --post=5314`, so it carries the mapper's `closeOrder: together`; rebuild the same way, never by hand |
| 5287 | M3.10 motion accessibility: an entrance, captions revealed on hover, a hover card with a button, a looping float with a pause control and its twin without one (`probe-motion-a11y.mjs --page 5287 --axe-scope fixture`, tree `motion-a11y.json`) |
| 5297 | FR-38A-37 ambient float (`probe-ambient-float.mjs`, tree `ambient-float.json`) |
| 5303 | FR-38A-52 looping media; media IDs 3457, 2072 and 4079 (`probe-looping-media.mjs`, tree `looping-media.json`) |
| 5305 | FR-38A-44 marquee, including the pause-button section (no other fixture shows a pause button), tile judging for the brand strips, pause-button corner placement and real touch tap through a `hasTouch` Chromium context (`marquee-touch-real`) (`probe-marquee.mjs`, tree `marquee.json`) |
| 5344 | FR-38A-8 one-edge close (`probe-close-clip-edge-live.mjs --page 5344`, tree `close-clip-edge.json`) |
| 5346 | FR-38A-23 per-effect off (`probe-layer-off-per-effect.mjs --page 5346`, tree `layer-off-per-effect.json`) |
| 5358 | FR-38A-23 vanilla off per tier: three pointerdown-ripple buttons (`.vro-a` off on mobile, `.vro-b` control, `.vro-c` off on tablet) and three hover-sheen cards (`.vso-a`, `.vso-b`, `.vso-c`), read at 375/768/1440 and across a resize (`probe-vanilla-off-per-tier.mjs --page 5358`, tree `vanilla-off-per-tier.json`) |
| 5436 | FR-38A-26 loop delays for core `query` and `woocommerce/product-collection`, stagger 80ms; the stagger is injected into the stored block comments after every build because core blocks register no `sgsMotion` (`probe-motion-loop-delays.mjs --page 5436 --item-selector ".m43-query [data-sgs-loop-i]"` and again with `.m43-products`; tree `loop-delays.json`, injector `loop-delays-inject.php`) |
| 5442 | FR-38A-26 loop delays for `sgs/post-grid`, its own page so the post-grid writer is judged apart from the core loops (`probe-motion-loop-delays.mjs --page 5442 --item-selector ".m43-grid [data-sgs-loop-i]"`, tree `loop-delays-post-grid.json`); a standing probe in `PROBES` |
| 5451 | FR-38A-53 form and choice-flow states: links the saved `sgs_form` 5447 and `sgs_choice_flow` 5449 (`probe-motion-form-states.mjs --form-url "/?p=5451" --flow-url "/?p=5451"`, trees `form-states-*.json`) |
| 5465 | FR-38A-41 parent perspective (tree `follow-pointer-parent.json`; the offline reading is `tests/fixtures/motion/rotate-council/run-parent.mjs`) |
| 2120 | FR-38-25 cursor-field glow: a glow container with an opaque child (`probe-cursor-field.mjs`, tree `cursor-field-glow.json`, rebuilt in place with `--post-id 2120`) |

**Focus fixture (not a deploy-gate page).** Page 5389, "Focus system fixture" (slug `focus-system-fixture`, published), is the unified keyboard focus system's fixture: light, dark and photo `sgs/container` sections with SGS buttons, a multi-button, a core-styled button, text links, a form, an option picker, an accordion, tabs and a testimonial slider (tree `plugins/sgs-blocks/tests/fixtures/focus/focus-system.tree.json`, read by `plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs --site sandybrown --pages 5389`). Do not repurpose or delete it (other probes read it); rebuild only from that tree with `scripts/wp-build-page.js --post-id 5389`. URL: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=5389&preview=true

Page 5196 (a draft, "Editor typing baseline (200 blocks)") is not a deploy-gate fixture: it is FR-38A-29's editor typing-latency page (`plugins/sgs-blocks/scripts/perf/editor-typing-baseline.json`, tree `scripts/perf/fixtures/editor-200-blocks.json`). Do not edit or delete it: M3.11 re-measures it.

## Running live probes

Every canary page runs Lenis smooth scroll (`html.lenis`), and the host's edge answers a burst of headless runs with its "Checking your browser" page. So a probe waits for the page to stop moving (`settleInView` in `probe-motion-model-lib.mjs`), reads after the effect's own transition, opens the page through `gotoThroughCheck` (loop probes: `probe-loop-lib.mjs::passChallenge`), and runs with `SGS_HEADED=1` (real Chrome, through `launchOptions()`) when challenged. A check that reads painted pixels (`probe-cursor-field-reveal.mjs::samplePaint`) reports UNANSWERED in headed Chrome when a physical mouse sits over the window, because the real cursor overrides the synthetic pointer; run it with the mouse still or headless.

Every probe reports UNANSWERED separately from a real failure, so read its output before assuming a regression. A fixture authored before a schema change carries the old shape (a flat `"minHeight":"90vh"` string where `minHeight` is now a tier object) and is silently coerced to `{}`; author a fresh fixture, never restore a trashed one.
