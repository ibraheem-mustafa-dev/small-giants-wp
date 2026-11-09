# L. Editor-side scrutiny of the reusable parts and census items (worktree E:/sgs-tmp/wt-indus)

## Method and limits

Read end to end: ResponsiveOverride.js, ResponsiveControl.js, FocalPositionField.js, MediaElementPanel.js, MediaPicker.js, AtomFrame.js, PerDeviceAtom.js, box-shape.control.js, MediaBoxShapeControls.js, focal-point.control.js, source.control.js, object-fit.control.js, ObjectFitField.js, MediaOverlayControls.js, overlay/shadow/opacity/media-padding controls, plus Spec 35 Parts B, D (D5), O sections 3, 4, 7 and the MEDIA_TIERED_BASES list. Skimmed only (control types and labels via grep, not read in full): media-type, video-behaviour, svg-presentation, caption, link, meaning, SgsBorderControl, ShadowControl internals, GradientOverlayControl, TargetPicker, BackgroundPanel (judged from C-media-census.md). NOT RUN in a browser: no local mirror was driven, so every keyboard, undo, device-switcher, editor-preview and empty-state judgement below is static reading. What I did run (node, existing tests, all pass): test-media-atom-parity (15 atoms, JS and PHP agree), test-media-enum-vocabulary (20 blocks), test-media-attr-parity (122 keys), test-shadow-model (90 round-trips), test-shadow-layers-js (50 cases, negative control caught 21), test-shadow-hover-js (22 cases, negative control caught 14). Those prove the data and CSS layers; none of them exercises a single control, so no inspector control has an automated test. Output saved in E:/sgs-tmp/ec-r11/media/s/tests.out.

## Corrections to the two input files

I-reusable-parts says the Shape control is a ToggleGroupControl. It is a SelectControl (MediaBoxShapeControls.js, four short options, which Spec 35 section 3 says must be a ToggleGroupControl: 2 to 4 options of 12 characters or fewer).

I-reusable-parts says to "let the shadow atom host ShadowControl". It already does (shadow.control.js mounts ShadowControl with liftPrefix). That item is done, not a to-do.

I-reusable-parts says ratio is "PARTIAL, rendered as select". True, and a select is what Spec 35 allows for 7 options; the gap is that it is not visual and has no "use the picture's own ratio".

C-media-census says Position is untiered on the container family. Confirmed by code reading; the same Position, Size and Repeat vocabulary is hand-rolled in BackgroundPanel and copied in nav-drawer.

## Verdicts: shape and mask capabilities (I section 1)

1.1 box-shape named-shape vocabulary (rounded, circle, square, none; clip-path only): REPLACE. The data shape is a four-value enum with a hard-coded 12px radius, no mask-image, not per-device, no custom SVG, no blob or arch. We would never pick it from scratch. Replace with a data-driven shape registry modelled on icon-shapes.json (slug, label, one path in a 0 0 100 100 box, readable by JSON, PHP and JS), rendered as an SVG data-URI mask-image (the end-shape technique), per-device tiered, with a "custom SVG" slot and a radius value. The parity-test pattern (JS and PHP byte parity) is worth keeping for the new registry.

1.2 decorative-image layer shape: REWORK. It consumes the box-shape map correctly, which proves a block can reuse the map without the whole atom, but it is the same four-value enum and a shape alone paints nothing. Move it onto the new registry and wire the filter drop-shadow path so a clipped layer keeps its shadow.

1.3 hero split media shape: REWORK. It rides the box-shape atom so it inherits every box-shape defect. Its focal value is also a hero-only tier-object shape (`splitMediaObjectPosition`), which is the fifth focal shape and must converge.

1.4 end-shape (mask-image on a box end, label only): KEEP for the label block (editor twin returns identical strings; high quality). It is the technique source for 1.1, not a control to reuse.

1.5 shape dividers: KEEP. Section-edge decoration, not an image frame; the 15 paths are usable as mask geometry.

1.6 icon-shapes JSON registry: KEEP as the pattern (the only data-driven registry, one file read by JSON, PHP and JS). The paths feed the mask library.

1.7 team-member photoShape: REPLACE. Unconstrained string, class-driven, three values, no enum in block.json. Subsumed by the new registry.

1.8 buybox gallery sticker shape: REPLACE as a control (block-private enum). Keep its polygon (tag) as one entry in the new registry.

1.9 label marker icon mask: KEEP. Correct technique for recolourable single-colour SVG; not a photo control.

## Verdicts: the 15 media atoms (src/components/media/atoms)

source: REWORK. Works for image, video, poster and SVG, per device via ResponsiveControl, with hard type restriction and alt auto-fill. Defects: (a) it passes none of isInherited, resolvedValue or onReset, so on tablet and mobile an empty slot shows no "inherits desktop" cue and no reset, only a bare empty picker; (b) the alt auto-fill writes `ImageAlt` plus the tier suffix, so picking a tablet image writes `ImageAltTablet`, an attribute that is declared nowhere (grep: 0 declarations), so it is silently dropped, and Spec 35 D5 says alt is never tiered; (c) SVG is a raw paste textarea with no upload and no preview; (d) no image-size choice, no srcset size dropdown (Spec 35 Part B "Image" row), no "original ratio" read-out; (e) external video is a plain TextControl with no validation or preview. Data shape (sibling Tablet and Mobile keys, id plus url pairs) is the D5 standard, keep it.

media-type: KEEP (light read). Tier enum with inherit as empty; always shown.

video-behaviour: KEEP (light read). Per-device tiering via ResponsiveControl (18 mentions), disclosure map locks muted and playsinline under autoplay. Not exercised.

meaning: REWORK. Decorative checkbox disables alt (good), but alt is a one-line TextControl with no guidance, no length hint, and no "use the library alt" state; the library alt is only copied once and then diverges.

intrinsic: KEEP. Not client-editable by design; written from the chosen media.

svg-presentation: REWORK. SvgOpacity duplicates the opacity atom (the opacity atom lists svg in its types), so an SVG gets two opacity sliders; Position, Animation and Speed are selects of 4 or fewer short options in places (check against section 3 band); minimum height is correct (SgsLengthControl).

object-fit: REWORK. Per-device with inherit-down, reset button and a disclosure rule. Defects: the options are raw CSS words (cover, contain, scale-down, none) apart from fill, so a non-technical client reads CSS; it is a SelectControl with an "Inherit" option AND a separate "Reset to inherited value" button (two ways to do one thing); no icons or preview; the backdrop row (Background size) is untiered and uses a different vocabulary. Five options is the neutral band, so chips with icons are allowed and are better.

focal-point: REWORK. The core FocalPointPicker wrapper is the best picker in the repo (thumbnail, drag point, x and y inputs, keyboard from core), per-device, greyed with a reason when the fit would not crop. Defects: on an inherited tier the picker shows the tier's OWN value (blank, so centre) not the inherited point, so it shows the wrong position while the page uses the desktop one; the picker needs a preview URL and silently degrades to bare inputs when the host omits it; no keyword quick-picks (top, centre, bottom) and no reset on desktop; disabled is faked with fieldset (works, but a hack); five stored shapes elsewhere. Backdrop row is untiered.

box-shape: REWORK. Mode (Auto, Fixed height, Aspect ratio, Fill the layout) is a ToggleGroup with a 15-character label, over the 12-character band; the Ratio select has no visual and no "original" option; Shape is a SelectControl (should be chips, see 1.1); Minimum height is a desktop-only TextControl even though MinHeight is a tiered base (the control writes only `{...obj, desktop}`, so a client cannot set tablet or mobile min-height from the UI: a real defect); every length field limits units to px, %, vh, vw, rem with presets disabled (no em, ch, svh or auto); radius lives inside SgsBorderControl but there is no corner-radius preset set. Border width stays untiered by Bean's ruling.

overlay: REWORK (small). Colour and gradient via GradientOverlayControl, per-device opacity with inherit via initialPosition, blend as a 12-option select, disclosure disabled until a paint exists. Defects: the opacity RangeControl has no allowReset (Spec 35 Part B), the inherited state shows the slider at the inherited value with no reset on desktop, and the tier opacity stores null versus a number, so the inherit test uses `typeof number` rather than the shared resolver.

opacity: REWORK. One RangeControl, no allowReset, no unit shown, not per-device, no hover value; Spec 35 Part B calls this an incomplete control.

shadow: KEEP. It hosts ShadowControl (31 callers, tested by 162 shared cases with negative controls). Open item belongs to the shape work: a clipped box loses its box-shadow, and the drop-shadow filter path exists but is not wired.

media-padding: KEEP. ResponsiveBoxControl with presets, patchTier write, per-device. Not driven.

caption: KEEP (light read). Text plus tag select.

link: KEEP. Uses LinkPopoverField, the canonical link control.

## Verdicts: shared pieces (I section 3)

ResponsiveOverride (73 callers): REWORK. It reads the global device and keeps the inherit cue, reset button, 44px targets. Defects: the header comment still says role=tablist and arrow-key tabs although tabs were deleted; the cue always says "Inherited from" the tier directly above, so a mobile slot that inherits desktop says "Inherited from Tablet", which is wrong; inline styles for opacity and layout; reset exists only off desktop; the "which other tiers are set" at-a-glance cue was knowingly lost and nothing replaces it (no override dot on the field or the closed panel); an inherited field is dimmed to 0.6 opacity, which is a contrast risk for the text inside it.

ResponsiveControl (30 callers): REWORK. Same device read and optional inherit hint and reset, but the hint hard-codes "Desktop" as the source and prints the raw resolved value (a CSS string such as "center 20%"); its inherit API is optional and the media source atom does not use it; no override indicator.

FocalPositionField (4 callers): REWORK, see focal-point.

MediaPicker (13 callers, with 18 files still using raw MediaUpload instead): REWORK. Wraps MediaUpload in MediaUploadCheck; image and video previews; replace and remove. Defects: inline styles; a video preview that autoplays with no pause control (autoplay-pause rule); `normaliseMedia` collapses everything that is not video into "image" (an SVG, audio or Lottie JSON all become image) and drops the attachment `sizes`; no size dropdown, no deleted-attachment state (a missing file just shows an empty or broken thumbnail), no drag-and-drop, no keyboard path beyond the core modal, no gallery in the same component, no alt or focal read-out.

MediaElementPanel (12 callers): REWORK. Correct dispatch, type gate, and "no rows, no panel". But the output is one flat PanelBody of every atom's rows in registry order: a media block shows roughly 40 rows in one scroll, no sub-groups (Source, Fit and focus, Shape and frame, Overlay, Effects), no ToolsPanel disclosure, no per-group override dot. `initialOpen={false}` with a single title.

MediaSizingPanel RATIO_OPTIONS (7 values, a select): REWORK. Allowed by Spec 35 (6 to 10 options is a select) but not best in class; wanted: visual ratio chips plus "original" (read from the attachment) plus a custom width:height.

AtomFrame (motion): KEEP as the label, help, error and customised-tag frame for the motion panel. It is a thin wrapper and has no media meaning.

PerDeviceAtom (motion): KEEP for motion only. It stores desktop under `values` and tiers under `devices`, a different shape from the media sibling-key model, so it must not host media.

EffectsPanel and TargetPicker (motion): REWORK. The picker always lists "Background image" in every state because no editor code reads `absentIn`; a layer on a background painted through `::before` silently does nothing (C-media-census section 3). Needs the renderer fix plus the editor reading `absentIn`.

## Verdicts: census items that are editor-side (C)

BackgroundPanel image-tab Position dropdown (9 keyword pairs, string, untiered, ungated; also copied into nav-drawer): REPLACE. It ignores the atom system the same file's Video tab already uses. Replace with the focal-point and object-fit atoms in backdrop scope, tiered, with a type-aware vocabulary (no `auto` for video).

nav-drawer copy of BG_POSITION_OPTIONS and BG_SIZE_OPTIONS: REPLACE with the same atoms.

image-controls extension `sgsObjectPosition` {x,y} (gallery, card-grid, team-member): REPLACE. One of the five focal data shapes.

Raw FocalPointPicker per item (card-grid ItemEditor, gallery thumbnail): REPLACE with the shared focal field.

Raw MediaUpload in 18 files: REPLACE with the shared picker (and fix the picker first, above).

BackgroundPanel "Art direction (optional)" (separate backgroundImageTablet and backgroundImageMobile painted through `::before`, which also kills the fast `<img>` path): REPLACE with the source atom's per-device pickers.

Attachment "Fixed (parallax)" toggle (no strength, ignored on iOS, forces the CSS path): REPLACE with the motion parallax effect, after the background becomes a real element (parallax with Background on a `::before` is very likely inert).

## Cross-cutting facts that decide the design

Per-device with inherit-down exists in two shapes: ResponsiveControl (separate flat sibling attributes, hint is optional) and ResponsiveOverride (one object per attribute, hint built in). The media system uses sibling keys for source and tiered bases but one tier-object for padding, min-height, max-width and hero focal. A new design should pick one storage shape per value kind and one component that always shows the inherit cue and reset; today the cue is optional and most media callers skip it.

Disclosure is inconsistent: some atoms disable-with-reason, some omit, the backdrop scope never gates. There is no shared ConditionalControl or ToolsPanel host, so the same hide-versus-disable policy is rewritten per atom.

Nothing is undoable-tested: every control writes through setAttributes in one call, so core undo works by construction, but no test or drive proves it. Device switching is global (one toggle), which all of these read correctly via `core/editor` getDeviceType; none reacts to the site editor's own device dropdown separately (unverified).

## What no current control offers that a best-in-class design needs

1. A real mask and shape library (blob, arch, organic, custom SVG) per device, with the shadow and border following the clip.
2. A visual ratio chip picker including "original ratio from the attachment" and a custom ratio.
3. A shared override indicator: a dot on the field label and on a collapsed group when any tier overrides, plus a reset on every tier including desktop.
4. Inherited tiers that SHOW the inherited value in the control (focal point, source thumbnail), and name the true source tier.
5. Image-size and srcset-size choice, a deleted-attachment state, drag-and-drop, and a media-library "use the library alt" link.
6. Plain-English fit options (Fill the frame, Fit inside, Never enlarge) with icons instead of CSS keywords.
7. Grouped, collapsible media panel (Source, Fit and focus, Frame, Overlay, Effects) with ToolsPanel-style disclosure.
8. Hover zoom, filter and duotone, Ken Burns and parallax as media settings in the one panel, not per block.
9. A `<picture>` or art-direction preview that shows which source each device will receive.
10. Custom-value escape hatches on presets (a ratio, a focal point, a radius) alongside the tokens.

## Tally

Shape and mask (9): KEEP 4, REWORK 2, REPLACE 3. Atoms (15): KEEP 7, REWORK 8, REPLACE 0. Shared pieces (11): KEEP 4, REWORK 7, REPLACE 0. Census editor items (7): REPLACE 7. Total 42: KEEP 15, REWORK 17, REPLACE 10.
