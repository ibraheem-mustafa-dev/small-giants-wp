---
paths:
  - "plugins/sgs-blocks/scripts/motion-qa/**"
  - "plugins/sgs-blocks/src/blocks/**/view.js"
  - "plugins/sgs-blocks/includes/**/*motion*"
---

# Motion QA

```bash
npm run qa:motion                    # all standing live probes (what the deploy runs)
npm run qa:motion:morph              # fx-morph changes SVG geometry (page 2113)
npm run qa:motion:motion-path        # motion-path re-animates on pass 2 (page 2109)
npm run qa:motion:good-by-default    # scrub/scramble/split-reveal/pin-scrub (pages 2103, 2603)
node scripts/motion-qa/probe-motion-model.mjs --page 5223 --page 5226 --page 5229 --engine chromium --engine firefox --engine webkit --width 375   # Spec 38A motion model (the trees: tests/fixtures/motion/pages/)
```

Wired into `build-deploy.py` as `step_motion_qa()` — ON by default for blocks deploys, after `step_verify_payload()`, opt out with `--skip-motion-qa`.

Not in `prebuild`, on purpose — these need a live canary. Post-deploy is the honest home: the canary is up by definition, and the payload gate has just proven the live plugin is this run's payload.

The runner registers only the FOUR probes that are standing checks with negative controls and stable fixtures (`PROBES` in `scripts/motion-qa/run-live-probes.mjs`). Other probes in the directory are one-shot artefacts, runnable by hand, not claimed as covered. Promoting one means giving it a fixture and a negative control first.

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
| 5244 | Spec 38A M3.9: per-device entrance distances, custom easings, part isolation, tilted cards and the polaroid frame (`probe-motion-per-device.mjs`, tree `tests/fixtures/motion/pages/motion-per-device.json`) |
| 5252 | Spec 38A Gate 4b (M5.1): a layer-based copy of page 2103, made by `Sgs_Motion_Migrate_Runner::migrate_content`; its nine `data-sgs-fx` elements must match 2103's (`probe-good-by-default.mjs` with 2103 swapped for 5252) |
| 5253 | Spec 38A M5.7 parallax: split hero media part at ratio -0.06 on the page basis, a 0.18 root, an image inside a still frame, a clamp and a control (`probe-parallax.mjs --page 5253`, tree `tests/fixtures/motion/pages/parallax.json`) |
| 5255 | Spec 38A M5.6 Follow pointer and glare: an info-box card with hover scale, Follow pointer at 8deg and glare, and a control card (`probe-follow-pointer.mjs --page 5255`, tree `tests/fixtures/motion/pages/follow-pointer.json`) |
| 5259 | Spec 38A M5.4 magnet: an over-element normalised-pull button, a proximity button that pulls from outside its box, and a control (`probe-magnet.mjs --page 5259`, tree `tests/fixtures/motion/pages/magnet.json`) |
| 5261 | Spec 38A M5.9 ripple: a pointerdown button with the reference-draft values, a click-trigger button and a control (`probe-ripple.mjs --page 5261`, tree `tests/fixtures/motion/pages/ripple.json`) |
| 5263 | Spec 38A M5.10 sheen: a card and a keyboard-focusable link card with sheen, and a control (`probe-sheen.mjs --page 5263`, tree `tests/fixtures/motion/pages/sheen.json`) |
| 5267 | Spec 38A M5.5 horizontal panel: an `sgs/timeline` horizontal with five panels (`probe-horizontal-panel-params.mjs --page 5267`, tree `tests/fixtures/motion/pages/horizontal-panel.json`) |
| 5270 | Spec 38A M5.11 cursor-field image reveal: two reveal cards and a control (`probe-cursor-field-reveal.mjs --page 5270`, tree `tests/fixtures/motion/pages/cursor-field.json`) |
| 5272 | Spec 38A M5.Z stacked effects: magnet + sheen + ripple, Follow pointer + scale + lift, lift + parallax + Follow pointer, cursor-field ring + ripple + sheen, and a control (`probe-motion-stacks.mjs --page 5272`, tree `tests/fixtures/motion/pages/motion-stacks.json`) |
| 5250 | Spec 38A FR-38A-36 scroll progress: page bar, counter and section bar (`probe-scroll-progress.mjs`, fixture `tests/fixtures/motion/pages/scroll-progress.json`) |

Page 5196 (a draft, "Editor typing baseline (200 blocks)") is not a deploy-gate fixture: it is Spec 38A FR-38A-29's editor typing-latency page (`plugins/sgs-blocks/scripts/perf/editor-typing-baseline.json`), re-measured by M3.11. Never edit or delete it; its tree is `plugins/sgs-blocks/scripts/perf/fixtures/editor-200-blocks.json`.

All are titled `[GATE — DO NOT DELETE] …` on the canary so they survive a tidy-up. Deleting or emptying any of them breaks every blocks deploy until the fixture is rebuilt. Probes reference pages by ID (`?p=`), so renaming a title is safe but re-creating a page under a new ID is not.

Canary fixtures rot, and a probe cannot tell you which failure you have — every probe reports UNANSWERED separately from a real failure, so read its output rather than assuming a regression. A fixture authored before a schema change carries the old shape (e.g. a flat `"minHeight":"90vh"` string where `minHeight` is now a tier object), which is silently coerced to `{}` — never restore a trashed fixture, author fresh.
