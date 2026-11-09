# T4. Shared JS, gates, cloner and docs inventory for Spec 49 (read-only, 2026-11-09)

Worktree `E:/sgs-tmp/wt-media`, HEAD `b64c361cf`. Method: read the spec in full, then Read/Grep the files below. Importer counts are `grep -rlE` over `plugins/sgs-blocks/src` (`*.js`), excluding the file itself, so they are file counts and may include a substring match. "Not verified" means I did not read the code far enough to say. Package names are the §14.4 rows. Paths are relative to `plugins/sgs-blocks/` unless they start with `scripts/` (repo root), `.claude/` or `theme/`.

## 0. Headline findings

1. **The cloner's image route will go silent at cutover and the spec does not say so.** `scripts/computed-route/lib/fill-media.mjs::imageSlots` finds a block's image by the DB role `image-alt` plus `alt_companion_attr`, and falls back to `schemaImageSlots`, which only recognises a string `<name>Url` with an integer `<name>Id` and a string `<name>Alt`. A single `mediaSource` object attribute matches neither, so Fill reports "no image setting" for every migrated block. §11 and WP-13 name `media-slot.schema.json` and `wp-build-page` but not `imageSlots`, `mediaSettings`, `idSetting`, `scripts/data/scalar-media-roles.json`, the `content-role-detect/detector5_image_alt_companion.py` detector or the seeder that applies the role. Owner: WP-13 plus WP-1 (seed).
2. **At least 40 gate, lint, survey and test files name a §8.2 item and §8.2 lists only 8 of them.** The rest (inspector-scan rules 37, 38, 39 and about 35 fixture files, `check-media-breakpoints.js`, `surveys/check-image-controls-support.py`, `wiring-fingerprint/wf_media.py`, `check-dead-controls.js`, `check-control-helper-parity.py`, the golden-component registry in `inspector-scan/core/components.js` and `consistency/golden-controls.json`) will go red or vacuous at cutover. WP-15a promises `gate-disposition.json` "classifying every gate" but the spec gives no list and no rule for what a gate does that names a removed symbol. Section 5 is that list.
3. **`ResponsiveOverride` is mounted by 135 files, not only media blocks.** §9.2 reworks its labels, dots and Reset for media and says it is "the only per-device wrapper for media", but `ResponsiveControl` (68 importers), `ResponsiveBoxControl` (63) and `ResponsiveLengthControl` (27) are a second family the spec never mentions, and `SgsBoxControl`/`TypographyControls` wrap them. AC-14 tests media only, so a label change to the shared component is untested for the other ~120 consumers. Owner: WP-4.

## 1. JS components and utilities

Verdict key: K keep, R rework, X replace (new thing takes the job), D delete. Counts are files.

| Path | Does today | Used by | Works? | Verdict and what happens | Package |
|---|---|---|---|---|---|
| `src/components/ResponsiveOverride.js::ResponsiveOverride` | The tier switcher for tier-object attributes; shows "Inherited from X" and a Reset | 135 files | Works. Hint is `TIER_ABOVE[active]`, so Mobile always says "Tablet" even when it inherits Desktop (wrong tier); fallback string is a hard-coded "Desktop"; uses inline `style` objects for the hint row | R: true-source hint, dots, per-device Reset wording, "Applies to all devices". Every one of the 135 mounts changes, so run `lint-responsive-controls.py`, `ResponsiveOverrideEngineTest.php` and the JS tier tests in the same commit | WP-4 |
| `src/components/SgsLengthControl.js::SgsLengthControl` | Length box, unit select, slider; props `units`, `max`, `presets` (default false), `negative` | 135 files | Works. `sliderRange` honours `max` only for px, rem, em, and `CUSTOM_VALUE_SETTINGS` has no `ch`, `svh`, `dvh` (they fall to a 0-100 default); the unit list `SPACING_UNITS` has no `ch`, `svh`, `dvh` unless the caller passes `units` | R (small): accept the §9.4 unit sets and 0-5000 / 0-9999 ceilings through props, or declare them in `media-settings.json` and pass them in. Do not fork it | WP-4 |
| `src/components/SgsBorderControl.js` | Border width, style, colour | 98 files | Works (not exercised by me) | K, rehosted in "Border and shape" | WP-4 |
| `src/components/SgsBoxControl.js` | Four-side box (padding etc.) | 87 files | Works (not exercised) | K for Padding | WP-4 |
| `src/components/ShadowControl.js` + `src/components/shadow-control/*` (10 files) + `utils/shadow-model.js` (7), `shadow-layers.js` (16), `shadow-hover.js` (6) | Layered shadow builder and its model | ShadowControl 66 files | Works; JS/PHP twins are gated (`test-shadow-model`, `test-shadow-layers-js`) | K. No change; mask-aware parts come from §7.5 | WP-6 |
| `src/components/ShadowLiftControls.js` (5), `TierBorderControl.js` (5), `SurfaceGroundControls.js` (4), `BorderStyleControl.js` (9), `ScrimControls.js` (8), `GradientOverlayControl.js` (8) | Generic surface controls reused by media panels | counts as listed | Works (not read in full) | K. `GradientOverlayControl` hosts the overlay gradient row (§8 `OverlayGradient`), so it stays | WP-4 |
| `src/components/MediaPicker.js::MediaPicker` | Image/video picker, returns `{url,type,id,alt,mime,width,height}` | 17 files under `blocks/` and `components/` | Works. Renders `<img>` preview; writes `alt` from the library on every pick (spec wants Alt untouched on a device pick) | X by `MediaSlotField`. Delete after adopters move | WP-4 |
| `src/components/FocalPositionField.js::FocalPositionField` | Wraps core `FocalPointPicker`; `format="xy"` or `"css-string"` | 8 files | Works. Two storage shapes (0-1 floats and CSS string) | X by `FocalField` (percent inputs, quick picks, live region). Delete | WP-4 |
| `src/utils/objectPosition.js` | CSS string to `{x,y}` and back | 7 files | Works. Rounding contract matches `includes/helpers-media-position.php` | D with the PHP twin; `FocalField` owns one `{x,y}` shape. The spec does not say whether `{x,y}` is 0-1 or 0-100 (UI is 0-100, core picker is 0-1): decide in C1 | WP-4 |
| `src/components/MediaSizingPanel.js` | Auto / Fixed height / Aspect ratio as exclusive modes | 9 files incl. 4 blocks (card-grid, gallery, image-sequence, post-grid options) | Works, and is the "modes" design §6.4 rejects | D. The four block adopters move to the Size and crop panel | Wave 1/3 plus WP-4 |
| `src/components/MediaElementControls.js` | Base vocabulary, tier names, `MEDIA_BASES`, `mediaAttrName` | 27 files | Works. Imported by the generator `generate-media-attributes.mjs` (the generator runs the real module) | D with the generator and the registry | WP-15b |
| `src/components/MediaElementPanel.js` | Data-driven panel that renders atom controls | 20 files | Works | D, replaced by `MediaPanelHost` | WP-5 |
| `src/components/media/MediaPanelLayout.js` | `sgs/media` composition of `MediaElementPanel` calls | 9 files | Works | D | WP-5 |
| `src/components/media/atoms/*` (32 files: 14 atoms as `.js` + `.control.js`, `video-behaviour.control.css`, `registry.js`) | The atom registry and per-atom control, CSS, validate, disclosure | `registry.js` 4 files | Works; `registry.js` header says it injects 59 bases (109 keys) | D | WP-15b |
| `src/components/media/controls/MediaBoxShapeControls.js` (5), `ObjectFitField.js` (3) | Box-shape and fit controls | as listed | Works | D (both named in §8.2) | WP-15b |
| `src/components/media/controls/LottieControls.js` (2), `MediaOverlayControls.js` (4), `MediaSvgPresentationControls.js` (1), `MediaTypeControl.js` (5), `VideoSourceControl.js` (2), `VideoCaptionsFields.js` (2) | Lottie, overlay, SVG, kind and video fields | `MediaOverlayControls` is used by `blocks/card-grid/components/card-grid-options.js` and `GlyphOverlayPanels.js`; `VideoSourceControl` by `blocks/media/components/VideoPanel.js` | Works | NOT NAMED IN §8.2 OR §14.4. Verdict X: the kind tabs go into `MediaSlotField`, Video/Captions into the Video panel, SVG into the SVG panel, overlay into "Overlay and filters". Lottie has no §8 base and §13 says one saved Lottie block is "reported and resolved by hand", so the Lottie control has nowhere to live: decide delete or keep | WP-4/5 |
| `src/components/media/DecorativeImagePanelLayout.js` (1), `HeroSplitMediaPanelLayout.js` (1), `ProductCardImagePanelLayout.js` (0) | Per-block panel layouts | decorative-image/edit.js; hero/edit.js | `ProductCardImagePanelLayout`: grep for the name finds only its own file and a mention in `scripts/inspector-scan/rules/21-render-without-control.js`, so it is dead and also contains the raw `FocalPointPicker` and `sgsObjectPosition` | X by `MediaPanelHost` for the first two; D now for the third (dead) | WP-5, Wave 1/3 |
| `src/components/media/canvasStyle.js` | Writes the atoms' custom properties as inline `style` on the editor canvas; exports `elementScopeClass`, `elementCustomProperties`, `fillsBox`, `requiresBox` | 5 files (decorative-image, hero, media edit.js, `components/index.js`, `atoms/shadow.js`) | Works, but is exactly the editor inline style AC-16 forbids ("no `style` attribute on any media element in the editor") | NOT NAMED IN §8.2. X by `emitter/mediaPreview.js` (C3). Delete with it | WP-4 |
| `src/components/MediaGalleryPicker.js` | Multi-select library picker for item sets | 5 files (brand-strip, gallery x3, index) | Works (not read in full) | NOT IN SPEC. K, but each picked item must become a `{source, alt, decorative, fit, focal}` item (§8.3). Say so in WP-4 | WP-4 |
| `src/components/ShapeDividerPreview.js` (1), `utils/shape-dividers.js` (2), `utils/end-shape.js` (3), `utils/icon-shapes.js` (7) | Divider paths, end shapes, icon shape model | as listed | Work; JS twins held equal to PHP by `tests/js/shape-dividers.test.js`, `label-end-shape.test.js`, `icon-shapes-parity.test.js` | R: paths move to `media-shapes.json`; keep the twin tests, point them at the registry | WP-6 |
| `src/utils/background-preview.js` (14 importers, 400 lines) | Editor preview of a background (image, overlay, size, position, attachment) | 14 files | Works. Over the 400-line JS limit | X by `mediaPreview` plus the background layer. NOT NAMED IN §8.2 | WP-8 |
| `src/utils/radius-preview.js` (2), `border-preview.js` (6), `surface-preview.js` (4), `container-wrapper-preview.js` (1) | Editor previews for corners, border, surface | as listed | Work; `check-border-preview-twin` gates border | K for now; fold into `mediaPreview` only where a media slot uses them. Not verified which media blocks call them | WP-4 |
| `src/utils/hover-lift.js` (6), `resolved-css-value.js` (4), `patch-tier.js` (5), `usePreviewTier.js` (92), `css-length.js` (16), `cssLength.js` (17), `bare-length.js` (3), `breakpoints.js` (17), `responsive.js` (29) | Shared tier and length helpers | as listed | Work | K. `css-length.js` and `cssLength.js` are two near-twin files for one job (not verified how they differ): merge once the new emitter reads one | WP-4 |
| `src/utils/sanitise-svg.js` (2) + `utils/svg-allowlist.generated.js` | Editor SVG sanitiser and its generated allowlist | 2 files | Works; gated by `check-svg-allowlist-parity`, `test-sanitise-svg` | K (AC-8) | WP-2 |
| `src/components/ResponsiveControl.js` (68), `ResponsiveBoxControl.js` (63), `ResponsiveBoxControls.js`, `ResponsiveLengthControl.js` (27) | The other per-device wrappers | as listed | Work | NOT IN SPEC. Decide: media panels use `ResponsiveOverride` only, or the spec accepts both. If both, "only per-device wrapper" in §9.2 is false and `lint-responsive-controls.py` names both as sanctioned | WP-4 |
| `src/components/motion/AssetAtom.js` | Motion asset picker with its own `<MediaUpload>` | motion panels | Works | A hand-rolled picker AC-18 will flag. Not in spec | WP-10a |
| Raw `<MediaUpload>` in 15 other files: `blocks/audio/edit.js`, `before-after/edit.js`, `buybox/ConfiguratorPanel.js`, `choice-flow/ChromePanel.js`, `container/components/BackgroundPanel.js`, `extensions/inline-formats/index.js`, `media/components/VideoPanel.js`, `nav-drawer/ChromePanel.js`, `nav-drawer/edit.js`, `product-card/edit.js`, `responsive-logo/edit.js`, `store-selector/edit.js`, `testimonial/edit.js`, `timeline/edit.js` (plus `LottieControls.js`, `MediaGalleryPicker.js`, `MediaPicker.js` above) | Hand-rolled pickers | `grep -rl "<MediaUpload\b" src` | Work | AC-18 ("gate fails on a hand-rolled picker") cannot pass until each moves to `MediaSlotField` or is exempted. `audio`, `store-selector`, `buybox/ConfiguratorPanel`, `choice-flow/ChromePanel`, `nav-drawer/*` and `inline-formats` are in no §14.4 wave, so the gate needs an explicit exemption list or those blocks need a wave | WP-15a, waves |
| Raw `FocalPointPicker` in `blocks/card-grid/components/ItemEditor.js`, `blocks/gallery/components/GalleryThumbnail.js`, `blocks/extensions/image-controls.js` | Per-item focal pickers | `grep -rl FocalPointPicker src` | Work | Replaced by `FocalField` in the item editors; spec §8.3 covers it only as "per-item values" | Wave 3 |
| `src/blocks/extensions/image-controls.js` | Universal focal, fit, max-width, per-breakpoint height for blocks with `supports.sgs.imageControls` | 4 files (`index.js`, `hide-extensions.js`, `extension-roster.json`, itself) | Works only on 3 blocks: `jq` of every `block.json` finds `supports.sgs.imageControls` on card-grid, gallery, team-member. Its PHP twin is `includes/image-controls.php`. Writes `sgsObjectPosition`/`sgsObjectFit`, read by before-after, team-member, testimonial edit.js | D (named). Also edit `extensions/index.js`, `extension-roster.json`, `hide-extensions.js` and regenerate `extension-attributes.generated.php` and the fx lists | WP-15b, Wave 3/4 |
| `src/blocks/extensions/media-elements.js` | JS half of `supports.sgs.mediaElements` injection | 2 files (`index.js`, itself) | Works; 20 blocks declare `mediaElements` | D with the flag | WP-15b |
| `src/components/index.js` | Barrel; exports `MediaElementPanel`, `MediaPanelLayout`, `MediaGalleryPicker`, `FocalPositionField` | n/a | Works | Edit: remove four exports, add the `media/` exports | WP-4/15b |
| `src/blocks/extensions/custom-css.js`, `responsive-device-toggle.js` | Custom CSS panel, device toggle | 1, 6 files | Work | K. `custom-css.js` must accept the "reported" Custom CSS cases from §11 (not verified it can be written by the cloner) | WP-13 |
| `src/blocks/extensions/motion/*`, `hover-effects/*`, `generated-fx-*.json` | Motion panels | not read | not verified | R only for the part names and Background target in §10.1; the generated JSON is rebuilt by `generate-fx-qualifying-blocks.py`, which names `imageControls` (7 refs) | WP-10a |

## 2. Gates, lints, generators and surveys (plugin `scripts/`)

`gates.json` has 244 entries. 11 name the media layer directly (rows 1-11 below). Reds are caused by the old symbols disappearing; "vacuous" means the gate stays green but stops checking anything.

| Path (gates.json id) | Does today | Callers | Verdict at cutover | Spec accounts? | Package |
|---|---|---|---|---|---|
| `scripts/generate-media-attributes.mjs` (`generate-media-attributes`, `check-media-attributes-parity`) | Imports `MediaElementControls.js`, writes `includes/media-element-attributes.generated.php` | 2 gates | D | Yes, §8.2 | WP-15b |
| `scripts/generate-media-stylesheet.mjs` (`generate-media-stylesheet`, `check-media-stylesheet`) | Concatenates `assets/css/media-atoms/*` into `media-element.css` | 2 gates | D | Yes, §8.2 | WP-15b |
| `scripts/check-media-atom-purity.js` (687 lines) | Atoms importable by plain Node | 1 gate | D | Yes | WP-15b |
| `scripts/check-media-disclosure-coverage.js` (679 lines) | Calls each atom's `disclosure()` | 1 gate | D | Yes | WP-15b |
| `scripts/tests/test-media-atom-parity.mjs` (533), `test-media-attr-parity.mjs`, `test-media-enum-vocabulary.mjs`, `test-media-injection-parity.mjs` | JS/PHP parity of atoms, names, enums, injection | 4 gates | D; replaced by AC-1, AC-2 and the §6.2 fixture matrix | Yes | WP-15a |
| `scripts/check-media-breakpoints.js` (217) | Media stylesheet breakpoints equal the single source | 1 gate | D (its target `assets/css/media-element.css` goes). The new base stylesheet restates breakpoints too, so either port it to the new file or drop it with a reason | NO: not in §8.2 | WP-15a |
| `scripts/surveys/check-image-controls-support.py` (456) | Fails when `supports.sgs.imageControls` is declared but dead | 1 gate | D with the flag | NO | WP-15a |
| `scripts/check-universal-fit.js` (879 lines) | Maps each universal extension to its blocks; warns | 1 gate | R: drop `image-controls` and `media-elements` rows. File is over the 400-line JS limit | NO | WP-15a |
| `scripts/inspector-scan/rules/37-media-no-handroll.js` (667) + 11 fixtures in `fixtures/37-media-no-handroll/` | Flags media written outside the atom emitter; keyed to `sgs_media_element_style` and `mediaElements` | `inspector-scan-run` (full tier) | D, replaced by a "no hand-rolled media emit" rule against the renderer (AC-18's second half is a different thing: a second focal shape) | NO | WP-15a |
| `inspector-scan/rules/38-media-attr-parity.js` (506) + 5 fixtures | Server schema equals JS keys for `mediaElements` | same | D (the generator `--check` replaces it) | NO | WP-15a |
| `inspector-scan/rules/39-media-control-coverage.js` (640) + 6 fixtures | Adopters mount the right atom panels | same | D (AC-12/AC-13 replace) | NO | WP-15a |
| `inspector-scan/rules/40-media-svg-sanitised.js` (399) | Editor and PHP SVG paths use the one allowlist; cites `src/blocks/media/render.php` line numbers and `helpers-tier-media.php` | same | R: re-point to the renderer; keep, it backs AC-8 | NO | WP-15a |
| `inspector-scan/rules/14-media-upload-check.js`, `18-decorative-image-aria.js` (140), `21-render-without-control.js`, `26-responsive-duplicate.js`, `04-colour-alpha.js` | Reference `MediaPicker`, `MediaElementPanel`, `image-controls` | same | R: rule 18 names `MediaPicker.js` as an `<img>` host; rule 21 has 10 refs incl. `ProductCardImagePanelLayout`; rule 26 and `placement-rule-surfaces.json` name `image-controls` | NO | WP-15a |
| `inspector-scan/core/components.js`, `core/golden.js`, `core/extensions.js`, `rules.json`, `consistency/golden-controls.json` + `goldens/behaviour.json` | The registry of "golden" components names `MediaPicker` (and `FocalPositionField`, `image-controls`) | `inspector-scan-run`, `consistency-run-consistency-gates` | R: the golden picker becomes `MediaSlotField`, the golden focal becomes `FocalField`. If left, the scan treats the new components as unknown hand-rolls | NO | WP-15a |
| `scripts/inspector-scan/tests/rules-regressions*.test.mjs` | Regression tests for the rules above | scan self-test | R with the rules | NO | WP-15a |
| `scripts/wiring-fingerprint/wf_media.py` (52 lines), `wf_paint.py`, `wf_resolve.py`, `wf_tokens.py`, `tests/test_fix3.py` (`wiring-fingerprint-tests`, `-mutation-proof`, `check-wiring-fingerprint`) | `wf_media` reads read-sites from `SGS_Media_Element::style(...)` calls and `sgs_media_element_stored_attr` | 3 gates | X: the new renderer is called as `SGS_Media_Renderer::render`; without a new reader every media attribute reads as unread, so the gate goes red (or, if baselined, vacuous) | Partly: §8.1 says PS-1 proves `check-wiring-fingerprint`, but not that `wf_media.py` is rewritten | WP-1/15a |
| `scripts/check-dead-controls.js` (33 refs) | Treats a control as live when `SGS_Media_Element`/`sgs_media_element_*` reads its attribute | `check-dead-controls` | R: add the renderer and the generated table as readers | NO | WP-15a |
| `scripts/check-control-helper-parity.py` (names `MediaElementControls`, `MediaElementPanel`), `check-enum-control-shape.py` (`MediaPanelLayout`) | Name-based allow lists | 2 gates | R | NO | WP-15a |
| `scripts/audit-block-file-consistency.py` (3), `audit-feature-parity.py` (`imageControls`), `audit-post-content-blocks.py` (9, `mediaElements`), `consistency/build-roster.py`, `consistency/attr-role-map.json` (`sgsObjectFit`, `sgsObjectPosition`), `generate-extension-attributes.js`, `generate-fx-qualifying-blocks.py` (7), `seed_motion_fx_data.py` (3), `lints/lint-spec-drift.py` (`imageControls`) | Read the flags and old attribute names | 8+ gates | R each (names only; mechanical) | NO | WP-15a |
| `scripts/check-length-unit-partners.py`, `check-shadow-clip.py`, `check-motion-literals.py`, `check-motion-entrance-cascade.py`, `deploy_cache.py` (`media-element.css` in the cache list), `migrate-border-shape-b.js` (`SGS_Media_Element` x3), `survey-border-control-migration.py`, `survey-length-control-scale.py`, `survey-spacing-defaults.py`, `surveys/survey-control-mounts.py`, `survey-dead-css.py`, `survey-background-colour-support.py` | One-line mentions of old names or paths | various | R or trim; `deploy_cache.py` matters: it lists `assets/css/media-element.css` for cache busting, and the new `media-base.css` must be added | NO | WP-15a/15b |
| `scripts/surveys/census-media-presentation.py` (21 refs) | One-off census of the media layer | none | D | NO | WP-15b |
| `scripts/data/scalar-media-roles.json` + `scripts/dbschema/seed_reference_data.py` + `scripts/content-role-detect/detector5_image_alt_companion.py` | Source of the DB role `scalar-media` and the `image-alt`/`alt_companion_attr` pairing the cloner reads | `fill-media.mjs`, the resolver | R: roles for `mediaSource`/`mediaAlt` must be seeded (the spec's `paint_node` seeder layer does not cover roles) | NO | WP-1 |
| `scripts/dbschema/check_value_identity.py`, `check_schema_drift.py`, `capture_seed_data.py`, `audit-inline-styling.js`, `no-inline/check-no-inline.py`, `check-id-scoped-emits.js`, `check-ksort-before-hash.py`, `check-tier-object-cast.py`, `check-tier-storage-shape.py` | Generic gates the new emitter must satisfy | gates | K; PS-1 names the first and the inline gates. Not verified: `check-tier-storage-shape.py` and `check-render-tier-object-spacing.py` against `Source` (an R object holding a nested object) | Partly (PS-1) | WP-1/2 |
| `.claude/hooks/handoff-preflight.py`, `scripts/lint-responsive-controls.py` | Preflight; per-device switcher lint | gates | `lint-responsive-controls.py` R (§9.2 says so) | Yes for the lint | WP-4 |

### Tests that assert today's media behaviour

| Path | Asserts | Verdict | Package |
|---|---|---|---|
| `tests/php/run-media-atom-shadow-hover-standalone.php`, `run-media-hover-zoom-clip-standalone.php`, `run-media-top-tone-standalone.php`, `MediaCoverCropSizesTest.php`, `MediaLengthStringTest.php`, `ImageIntrinsicSizeTest.php`, `run-image-loading-attrs-standalone.php` | Old atom, zoom-clip, tone, cover-crop `sizes`, length string and loading helpers | D and port the cases to AC-3/4/6/9/10 fixtures; these name `sgs_media_hover_zoom_clips`, `sgs_image_loading_attrs`, atoms | WP-2/3 |
| `tests/php/BuyboxImagePriorityTest.php`, `PostGridImagePriorityTest.php`, `ProductCardImagePriorityTest.php` | Priority claims via `sgs_content_image_claims_priority` | R to `SGS_Media_Priority::resolve` | WP-3 |
| `tests/php/DecorativeImageLayerTest.php`, `run-decorative-image-surface-standalone.php`, `ResponsiveLogoTest.php`, `ResponsiveLogoChainTest.php`, `HeroBackgroundTiersTest.php`, `HeroSplitMediaAlignTest.php`, `HeroSplitMediaShadowTest.php`, `GalleryLayoutTiersTest.php` | Per-block media markup | R per wave | Waves 1/3/9 |
| `tests/js/decorative-image-box-panels.test.js`, `decorative-image-layer-preview.test.js`, `hero-split-media-shadow.test.js`, `canvas-tier-preview.test.js`, `image-sequence-aspect-enum.test.js`, `product-card-thumb-strip.test.js`, `motion-parallax-background-image.test.js` | Old panel layouts, canvas preview, aspect enum | D or R per wave | Waves |
| `tests/js/shape-dividers.test.js`, `icon-shapes-parity.test.js`, `label-end-shape.test.js`, `tests/php/IconOutlineShapesTest.php`, `LabelEndShapeTest.php` | Shape-registry twins | K, re-point at `media-shapes.json` | WP-6 |
| `tests/fixtures/motion/render-paths.json` (113 KB, hand-curated) | Render paths per motion block; includes before-after, hero, gallery media attributes | R for renamed attributes; WP-10a owns the file per §14.4 | WP-10a |
| `tests/fixtures/media/matrix.json` | Named by C3; does not exist yet (`ls tests/fixtures/media` is empty) | New | WP-2 |

I did not open each test; verdicts come from the names and the grep.

## 3. Schemas and manifests

| Path | State | Verdict | Package |
|---|---|---|---|
| `src/blocks/*/block.json::supports.sgs.imageControls` | 3 blocks: card-grid, gallery, team-member (not the 12-15 earlier reports quote) | D (flag) | WP-15b |
| `src/blocks/*/block.json::supports.sgs.mediaElements` | 20 blocks: before-after, brand-strip, buybox, card-grid, cart, decorative-image, gallery, google-reviews, hero, image-sequence, measured-diagram, media, mega-panel, option-picker, post-grid, product-card, product-search, team-member, testimonial, trust-bar | D, replaced by `supports.sgs.mediaSlots` | Waves |
| `supports.sgs.fx`, `supports.sgs.elements` | 8 and 100 blocks. `elements` is the motion part vocabulary; the part names for media change per §10.1 | R (part names only) | WP-10a |
| `includes/data/icon-shapes.json` (only file in `includes/data` besides `brand-registry.json`) | Icon shape model | R, seed of the registry | WP-6 |
| `includes/data/media-settings.json`, `media-shapes.json`, `schemas/media-slot.schema.json` | Do not exist. `plugins/sgs-blocks/schemas/` holds only `motion.schema.json`; `schemas/` at repo root: none | New | WP-1 |
| `src/blocks/extensions/extension-roster.json` + `check-extension-roster.js` | Lists `image-controls` and `media-elements` | R | WP-15b |
| `tests/fixtures/motion/render-paths.json` | See section 2 | R | WP-10a |
| `scripts/attr-classification-overrides.json` | Where the generator is meant to write `tier_object` entries (§8.1) | R (generated) | WP-1 |

## 4. Cloner and build tool

| Path | What it does for media today | Breaks at cutover? | Verdict | Package |
|---|---|---|---|---|
| `scripts/computed-route/lib/fill-media.mjs` (246 lines) `imageSlots`, `schemaImageSlots`, `mediaSettings`, `idSetting`, `mediaDecisions` | Maps a draft `<img>`/figure to the block's alt, URL, id and caption settings, through DB role `image-alt` and `<name>Url/Id/Alt` trios | YES (headline 1). Also writes only "url, id, alt, caption", never ratio, fit, focal, shape | R: write `mediaSource`/`mediaAlt`; the §11 table is Fill's new routing, which today lives in DB rows plus `fill-resolve.mjs` | WP-13 |
| `scripts/computed-route/lib/fill-resolve.mjs`, `fill-equivalents.mjs`, `fill-same-box.mjs`, `fill-dimensions.mjs`, `fill-layer-box.mjs`, `skeleton-rules.mjs::mediaElement` | Route longhands by `block_attributes.css_property`; equivalence row turns an intrinsic-ratio image's height into `max-height`; `<img>`/`<image-slot>` become `sgs/media` | Partly: resolver reads DB, so new `css_property` rows route for free; `property_equivalents` row "height on image becomes max-height" contradicts §11's "height setting of the same name" and must be reconciled. `<picture>`, absorption and Height Fill rules (§11 rows 1-2, Absorption) have no code today | R | WP-13 |
| `scripts/computed-route/lib/apply-svg-file.mjs` | Reads `backgroundImage`, `backgroundImageTablet`, `backgroundImageMobile` by name | YES (names change to `backgroundSource`) | R | WP-13 |
| `scripts/computed-route/lib/calibrate-instances.mjs` (`IMAGE_SHAPING`, `IMAGE_SHAPING_PROPS`, `out.backgroundImage = ...`) | Calibration plants a background image under overlay, size, position, repeat settings so they can paint | YES: regex matches `background(Size|Position|...)` names and writes `backgroundImage`; new names are `backgroundFit`/`backgroundFocal`-style bases under a `Source` object | R | WP-13 |
| `scripts/computed-route/fixture-refs.mjs`, `calibration-fixtures.json` (46 refs: `imageUrl`, `imageId`, `imageAlt`, `mediaType`, `objectFit`), `data/clone-coverage.json` (110 refs, 749 KB, includes `imageControls`, `mediaElements`, `splitMedia*`, `backgroundImage*`), `data/capabilities.json` (29), `tests/fixtures/frozen-db/rows.json` (11) | Fixtures and generated coverage name the old attributes | YES: `calibration-fixtures` is a migration target in §13; `clone-coverage.json` and `capabilities.json` are generated (not verified which command regenerates them) | R | WP-13/14 |
| `scripts/computed-route/tests/fill-media.test.mjs` (18), `calibrate-classes.test.mjs` (14), `resolve-media-aspect-ratio.test.mjs` (10), `content-coverage.test.mjs` (10), `apply-rules3.test.mjs` (10), `fill-media-regressions.test.mjs`, `fill-read-media.test.mjs`, `media-upload.test.mjs`, `fill-link-attrs.test.mjs` (8) | Assert today's attributes | YES | R | WP-13 |
| `scripts/computed-route/lib/apply-motion-rules.mjs` (14 refs), `apply-family-motion.mjs`, `data/effect-settings.json`, `effect-layers.json` | Motion routing names old media parts | Not verified | R if part names change (§10.1) | WP-10a/13 |
| `scripts/computed-route/media-upload.mjs`, `lib/media-stock.mjs` | Upload and media map by draft address (id, URL) | No; independent of attribute names | K | WP-13 |
| `scripts/wp-build-page.js` (645 lines) | Validates a tree: block registered, no unknown setting, top-level type and `enum` only | Not broken, but the spec's "refuses unknown keys and shapes" is NOT delivered: an object-typed `mediaSource` with any keys passes. Today's "flat setting given `{desktop..}`" check (DB flag `flat`) must treat R values correctly | R: validate nested object shape from the schema (smallest design: let the block.json attribute declare `properties` and have the validator walk it; then `media-slot.schema.json` can be generated, not hand-kept) | WP-13 |
| `.claude/rules/cloning-pipeline.md` | Zero media references | n/a | R: add the §11 rules and "never write Fit or Focal when the box does not crop" | WP-15b |

## 5. Gates and tests that fail at cutover, and what Spec 49 says

The spec's accounting is: AC-5 greps the §8.2 names, WP-15a "gate-disposition.json classifying every gate as reused, changed or deleted", PS-1 proves the DB, resolver, `check_value_identity`, inline-styling gates and `check-wiring-fingerprint`, PS-8 compares computed styles. It never lists gates.

| Fails or goes vacuous | Why | In spec? |
|---|---|---|
| The 11 `gates.json` entries in section 2 rows 1-7 | Their subject files are deleted | 10 of 11 named in §8.2; `check-media-breakpoints` not |
| `surveys-check-image-controls-support`, `check-universal-fit`, `check-dead-controls`, `check-control-helper-parity`, `check-enum-control-shape`, `audit-feature-parity`, `audit-block-file-consistency`, `lint-spec-drift` | Name removed flags, files or components | No |
| `inspector-scan-run` (rules 14, 18, 21, 26, 37, 38, 39, 40, golden registry) | See section 2 | No |
| `check-wiring-fingerprint` + `wiring-fingerprint-tests` + `-mutation-proof` | `wf_media.py` reads `SGS_Media_Element::style` call sites | Named as a PS-1 proof; rewrite not named |
| `check-no-inline` / `audit-inline-styling` | New files must stay inline-free; the old `canvasStyle.js` is an editor inline emitter that is tolerated today | Yes (FR-49 constraint and AC-16) |
| `check-border-preview-twin`, `test-shadow-*`, `check-shadow-clip`, `check-shadow-sources` | `check-shadow-clip.py` names `media-element`; others should stay green | No for `check-shadow-clip` |
| `check-editor-render-parity`, `check-id-scoped-emits`, `check-ksort-before-hash`, `check-unsanitised-length-emit` | Apply to new PHP/JS emitters | Partly (§6.2, AC-9) |
| `block-identity-facts-check`, `dbschema-capture_seed_data`, `db-consistency-run` | Reseed output changes for ~60 blocks (attributes written by the generator) | PS-6 measures reseed time and size only |
| `motion` gates: `run-motion-gates`, `check-motion-part-render-paths`, `check-fx-registration` | Part renames | WP-10a owns `render-paths.json`; gate list not given |
| `tests/php/*ImagePriority*`, `Media*`, `Decorative*`, `ResponsiveLogo*`, `Hero*Media*`, `run-media-*` (section 2) | Call removed helpers | AC-4/AC-6/AC-10 cover behaviour, not the files |
| `scripts/computed-route/tests/*media*`, `calibrate-*`, `calibration-fixtures.json` | Section 4 | §13 lists calibration fixtures as a migration target; tests not named |

## 6. §8.2 names: wrong, missing callers, or unlisted

Method: `git grep -lF` of each name across tracked files excluding `.claude/reports`, `sites`, archives, backups and the spec itself. Counts are files; "code" counts files under `plugins/sgs-blocks/{src,includes,scripts,tests}`, `theme/`, `scripts/`.

| §8.2 name | Finding |
|---|---|
| `MediaStylingPanel` | Does not exist under `src/components/`. It exists at `src/blocks/media/components/MediaStylingPanel.js` (used by `blocks/media/edit.js`). §8.2 gives no path; AC-5's grep passes only if the name is removed everywhere |
| `sgs_media_hover_zoom_clips` | Defined in `includes/helpers-media-element.php` (removed), 4 files use it |
| `sgs_tier_media_toggle_css` | Defined in `includes/helpers-tier-media.php`, 2 files. That file is not in §8.2 beyond the two function names, so the remaining functions in `helpers-tier-media.php` (for example `sgs_allowed_svg_tags`, which rule 40 cites) have no verdict |
| `sgs_next_background_image_index`, `sgs_content_image_claims_priority` | Defined in `includes/helpers-media.php` (8 files each). Same: the rest of that file has no verdict. T3 covers PHP |
| `sgs_render_media` | 42 files, 25 code, including `scripts/qa/lib/wp-stubs.php` (a stub the PHP harness defines). The stub must go too |
| `sgs_media_element_` (prefix) | 49 files, 46 code |
| `SGS_Media_Element` | 45 files, 42 code, including `scripts/migrate-border-shape-b.js` and `check-dead-controls.js` |
| `includes/media/atoms/*` | 33 files, 26 code, including `audit-block-file-consistency.py`, `migrate-border-shape-b.js` |
| `assets/css/media-atoms/*` | 69 files, 49 code. Large because of fixtures |
| `assets/css/media-element.css` | 21 files, 17 code, including `deploy_cache.py`, `check-shadow-clip.py`, `check-motion-entrance-cascade.py`, `check-media-breakpoints.js` |
| `includes/image-controls.php`, `helpers-media-position.php` | 12 and 10 files |
| `media-element-attrs-register.php`, `media-element-attributes.generated.php` | 11 and 6 files |
| `extensions/image-controls.js` | 9 files; also `generate-extension-attributes.js`, `inspector-scan/core/extensions.js` |
| `img[data-sgs-mc~="background-position"]` | `data-sgs-mc`: 48 files, 41 code |
| `MediaPicker` | 57 files, 37 code; 18 files hold a raw `<MediaUpload>` (section 1), so AC-18 is wider than the named picker |
| `MediaPanelLayout`, `MediaSizingPanel`, `MediaBoxShapeControls`, `ObjectFitField`, `FocalPositionField`, `MediaElementControls`, `MediaElementPanel` | Exist as named; callers: section 1 |
| `generate-media-attributes.mjs`, `generate-media-stylesheet.mjs`, `check-media-*`, `test-media-*` | Exist; `gates.json` entries listed in section 2 |
| Not in §8.2 but dead after cutover | `src/components/media/canvasStyle.js`, `src/components/media/controls/*` (other 6), `*PanelLayout.js` (3), `src/utils/background-preview.js`, `src/utils/objectPosition.js`, `src/blocks/media/components/*` (not read; T1 covers blocks), `scripts/check-media-breakpoints.js`, `scripts/surveys/check-image-controls-support.py`, inspector-scan rules 37-39 and fixtures, `wf_media.py`, `scripts/surveys/census-media-presentation.py` |

## 7. Docs that describe today's media controls

All need current-truth edits in WP-15b (CLAUDE.md: "docs state current truth only"). Counts are matching lines for the old names.

| Path | Count | Edit |
|---|---|---|
| `.claude/specs/02-SGS-BLOCKS.md` | 13 | Replace the media atom and `mediaElements` description with slots (named in WP-15b) |
| `.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md` | 6 | Rules 37-39 and the golden picker (named) |
| `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` | 3 | `imageControls` capability routing (Part 9) |
| `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` | 4 | Amendment named in WP-1 |
| `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` | 2 | Nav-drawer media copy (named) |
| `.claude/specs/38-SGS-MOTION-SYSTEM.md` (1), `38A-SGS-MOTION-MODEL.md` (2) | 3 | Part names. Not named in WP-15b |
| `.claude/specs/48-CLONING-SYSTEM.md` | 0 old names, but FR-48-39 ("Row 3, media and assets") and FR-48-58 describe Fill's image part | Named (Spec 48) |
| `.claude/catalogues/helpers.md` (16), `catalogues/tooling.md` (14) | 30 | Generated; regenerate, do not hand-edit. Not verified which command |
| `.claude/rules/block-editor-controls.md` (2), `block-authoring.md` (1), `colour-emission.md` (1), `cloning-pipeline.md` (0 but needs the §11 rules) | 4 | "Shared atom" row in block-editor-controls; media colour exemption wording |
| `.claude/dev-setup.md` (4), `.claude/architecture.md` (1), `.claude/LEDGER.md` (1), `CLAUDE.md` (1) | 7 | Edit; LEDGER is replaced at handoff |
| `scripts/computed-route/README.md` | 5 | Fill image row |
| `plugins/sgs-blocks/CLAUDE.md`, `theme/sgs-theme/CLAUDE.md` | 0 | No change |

## 8. Over-built against the goal ("clone anything, controls obvious")

1. **Five emitter kinds written twice (PHP and JS) with a byte-identical fixture matrix (§6.2, PS-7, C3).** The goal needs the editor to match the front end. A single CSS emitter in PHP, with the editor fetching its CSS from it (the pattern `ServerSideRender` already uses for before-after), removes the twin, the matrix and AC-16's 30-slot comparison. The spec rejects server preview only implicitly (§9.7 "the editor uses the emitter's CSS"). Not verified: editor latency of fetching CSS per keystroke; a debounce answers it.
2. **A rules DSL (C4) with eight `when` atoms and per-slot memoisation, plus a 16 ms budget (AC-13).** A plain per-control `visible(attrs, device)` function in the control's own file does the same for roughly 35 controls. Not verified, but the table in §9.3 has 30 rows with at most three conditions each.
3. **`supports.sgs.mediaSlots` with a generator that writes attributes into every `block.json` (§6.1, C8, PS-6).** About 40 blocks gain dozens of generated attributes, which grows reseed time and `block.json` size (PS-6 measures it). A shared PHP/JS `register_block_type_args` filter reading the table (the way the old `media-elements.js` plus `media-element-attrs-register.php` worked) avoids it, but the spec rejects reading the table directly because "over 200 gates read `block.json`". That reason is real; the cost is the generated-file churn the Integrator must own.
4. **`paint_node` DB column, a seeder layer and `tier_shape` overrides (§8.1).** The cloner needs `css_property`, `css_element` and `tier_object`, which already exist. `paint_node` is consumed by the emitter only (spec says so in §8 table); it can be a field in `media-settings.json` and not a DB column. Not verified whether any cloner row needs it.
5. **`media-slot.schema.json` as a separate schema (§11).** `wp-build-page.js` already validates from the registered block's attributes. Make the attribute definitions carry `properties` and have the validator descend; the cloner and the editor then share one definition and the schema file is generated.
6. **29 acceptance tests, 13 keyboard walkthroughs, three browsers on every layout test, and a 30-slot cross-browser matrix.** For Bean as QC, FP-13 asks for numbers plus his eye. Keep AC-3, AC-4, AC-10, AC-25, AC-27 and the walkthroughs he performs; the rest can run as one gate.
7. **Two nearly identical length helpers (`utils/css-length.js`, `utils/cssLength.js`) and two shadow/border preview twins** are existing duplication the new emitter should not extend. Merge them while the emitter is written.
8. **Featured-image `Source` kind, Lottie, SVG animation fields and `Captions` file** are listed in §8 but no clone draft in this repo needs them (Lottie: one saved block, resolved by hand per §13). Cut to what a draft contains unless Bean wants them.

## 9. Not verified

- Whether `{x,y}` is 0-1 or 0-100 (spec silent; UI says percent).
- Which command regenerates `.claude/catalogues/*.md`, `scripts/computed-route/data/clone-coverage.json` and `capabilities.json`.
- Editor-side behaviour of every listed component (I read headers and code paths, not a live editor); T1 and T2 cover the blocks.
- `src/blocks/extensions/motion/*`, `hover-effects/*`, `motion/` components: counted only.
- The remaining PHP helpers in `includes/helpers-tier-media.php` and `includes/helpers-media.php` (T3).
- Test assertions: verdicts from file names and greps, not from reading each test.
