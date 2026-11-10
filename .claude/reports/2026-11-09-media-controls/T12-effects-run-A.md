# T12 group A: media and surface effects with no earlier fixture, run on local-sandybrown (2026-11-10)

Run by a Sonnet agent in real Chrome, with WebKit where stated, at 375, 768 and 1440 with reduced motion, against current `main` synced from `E:/sgs-tmp/wt-media`. Each effect had a control block, and its saved markup was read back after each build. Scripts, trees and captures are in `E:/sgs-tmp/media-qc/fx/A/`.

The main thread re-checked the following:
- **Fixed against parallax:** the counts in `out/fp/*/rows.json` (parallax at 1440: 101 of 400 frames with a gap, worst 103 rows; fixed: 0) and frame `f081.png`.
- **The media SVG wrapper class:** `src/blocks/media/render.php` `$svg_classes`.
- **The surface-treatment host lookup:** `fx-surface-treatment.js` `el.querySelector('img')`.
- **The generative-background first tag:** `includes/fx-generative-background.php`, `next_tag()`.

**Counts:** 6 work, 5 partly, 4 broken, 0 unanswered (audio in WebKit is unanswered within its row).

| Effect | Fixture page (local id) | Verdict | Evidence |
|---|---|---|---|
| Hover image zoom | `qa-fx-hover` 5871 | Works | Scale 1, then 1.15, then 1 at every width; the figure has `overflow:hidden`; suppressed under reduced motion |
| Hover filter | 5871 | Works | `grayscale(1)`, then 0, then 1 |
| Hover indent, width, ring, accent | 5871 | Works | Padding 0 to 40px; width 432 to 720px; ring 0 to 8px; accent inset 0 to -6px; the control is unchanged |
| Curtain | 5930 (drawer 5927), 5877 (drawer 5919) | Partly | With a sibling `open` entrance, the clip sweeps 14 values. Alone in the drawer, the drawer never publishes `open` (`src/blocks/nav-drawer/drawer-motion-state.js::hasOpenMotion`) |
| Image sequence | 5881 | Works | Canvas pixels change across the scrub; at 375 it ramps frames 1 to 30 |
| Surface treatment | 5938 (team member), 5885 (decorative image) | Partly | On team member: WebGL active, canvas present, pixels differ from the control. On decorative image: no canvas, because `fx-surface-treatment.js::initTreatment` calls `el.querySelector('img')` while the host is the `<img>` itself |
| Decorative image fade on scroll | 5889 | Works | Opacity 1, 0.813, 0.236, 0 with scroll; the control stays at 1 |
| `sgs/media` SVG presentation animation | 5860 | Broken | `animationName none`. Cause proven: `src/blocks/media/render.php` does not print `sgs-media-el` on the SVG wrapper, and the composed animation rule in `assets/css/media-atoms/_base.css` matches only `.sgs-media-el`. Adding the class in the live DOM made all three animations run |
| Before-after divider | 5893 | Partly | Horizontal works by drag, touch, keyboard and click. Vertical runs inverted in Chrome (a click at 25% sets 78) because of `writing-mode: vertical-lr; direction: rtl` in `src/blocks/before-after/style.css`; Playwright WebKit vertical did not respond (unproven for Safari) |
| Video player chrome | 5897 | Works | Play, seek, mute and keyboard all work, with 44px controls, in Chrome and WebKit at 375 |
| Audio visualisers | 5900, 5946 | Partly | With real music they draw 14 to 20 distinct frames. Spectrum and oscilloscope are blank at rest and under reduced motion: a `ResizeObserver` call to `fitCanvas` clears the static frame (`src/blocks/audio/view.js::runReactive`). WebKit builds no analyser, so it is unanswered for Safari |
| Particles | 5902, 5948 | Broken | On a container background image the canvas is appended inside the `<img>`, and the container grows to 2500px instead of 420. On an SVG background the canvas works, but `fx-particles.css` sets `position:relative` over the host's `absolute` |
| Grid dots | 5906, 5948 | Broken | The same two failures; on the SVG host the canvas still reacts to the pointer |
| Generative background | 5910, 5948 | Broken | "could not parse colour '' for --sgs-genbg-1": `includes/fx-generative-background.php::sgs_apply_fx_generative_background` reads only the block's first tag, so a surface host never gets its colours. Also fails on a real GPU |
| Background "Fixed (parallax)" | 5913, 5953 | Partly | The photo holds still (table below). With a container background colour the photo is invisible: it paints on `::before` at `z-index:-1`, behind the root's opaque colour |

## Does Parallax at strength 1 reproduce a fixed background?

Fixtures 5913 (fixed) and 5915 (Parallax, `speedRatio` 1, on the background). The photo carries a 20px band at 50% height. Painted frames come from `Page.startScreencast` during one 2700px `Input.synthesizeScrollGesture`. WebKit has no screencast, so it used 18 wheel-step screenshots at 375 (desktop WebKit, not iOS Safari). A gap is a section row painted in the page's background colour.

| Variant | Viewport | Frames with the section visible | Band position range | Frames with a gap | Worst gap |
|---|---|---|---|---|---|
| Fixed | Chrome 1440 | 198 | 3.0px | 0 | 0 |
| Parallax 1 | Chrome 1440 | 199 | 2.5px | 101 | 103 rows (11% of the viewport) |
| Fixed | Chrome 375 | 183 | 0.5px | 0 | 0 |
| Parallax 1 | Chrome 375 | 183 | 0px | 92 | 53 rows (7%) |
| Fixed | WebKit 375 | 9 | 0 | 0 | 0 |
| Parallax 1 | WebKit 375 | 9 | 0 | 4 | 53 rows |

Answer: no. Parallax at strength 1 holds the photo still, but the photo exists only inside its own box (the section plus about 9% overscan), so part of the section shows no photo while it enters or leaves. Spec 49 §10.3 therefore keeps Pinned (Cover's model) for a fixed background.

## Fixtures left on the mirror

- **Pages:** 5860, 5871, 5877, 5881, 5885, 5889, 5893, 5897, 5900, 5902, 5906, 5910, 5913, 5915, 5930, 5938, 5946, 5948, 5953 (all `qa-fx-`).
- **Drawer posts:** 5919, 5927.
- **Media:** 5864, 5941, 5950.
