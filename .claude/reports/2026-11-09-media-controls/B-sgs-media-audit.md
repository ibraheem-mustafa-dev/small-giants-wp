# sgs/media audit (read-only, 2026-11-09)

Scope: plugins/sgs-blocks/src/blocks/media/ (block.json, edit.js, render.php, style.css, components/*), src/components/media/ (MediaPanelLayout.js, atoms/*, controls/*), src/components/MediaElementPanel.js, assets/css/media-element.css, includes/media/atoms/*.php, the motion generator, .claude/rules/block-editor-controls.md, Spec 35 Part O.

## 0. How the inspector is assembled (root cause of the mess)

The inspector is not one design. It is four layers mounted by edit.js: (a) a native-support panel (duotone Filters), (b) the shared media-atom layer (`MediaPanelLayout` mounted TWICE, once per tab, with `group="settings"` and `group="styles"`), (c) three block-local panels left over from before the atoms (`MediaStylingPanel` ToolsPanel, `VideoPanel`, `TypographyPanel`) plus a `SgsColourPanel` caption row, and (d) the injected motion panels (Hover/Entrance/Effects). Each layer was added in a different wave and none was reconciled with the others. The atom layer's rule is "an atom self-gates by `types`", but gating is by media type only, never by the state of a sibling control, and PanelBody wrappers are mounted whether or not any atom returns a row.

Atom declaration (block.json `supports.sgs.mediaElements[0].atoms`): media-type, source, meaning, svg-presentation, object-fit, focal-point, box-shape, video-behaviour, overlay, opacity, shadow, media-padding, caption, link. render.php::$sgs_media_atoms also lists a `motion` atom that block.json does not declare and `ATOM_CONTROLS` does not map (stale).

Attributes `shape`, `minHeight`, `objectFitTablet/Mobile`, `objectPositionTablet/Mobile` etc. are NOT in block.json; they are injected at registration from the atoms' `MEDIA_BASES`. Only the framework DB (`block_attributes`, 145 rows for sgs/media) shows the registered set.

## 1. Panel inventory in render order

### Settings tab (default group), in order

1. Media Type (PanelBody, open). Media type (image|video|svg|lottie) [mediaType]; "Media type - tablet" and "- mobile" only when per-device type tiers exist; video source toggle when video. Conforms.
2. Source (PanelBody, open). By type:
   - image: Image picker (MediaPicker in ResponsiveControl: imageId/imageUrl plus Tablet/Mobile art direction); Decorative checkbox [imageDecorative]; Alt text [imageAlt], disabled when decorative.
   - video: Video source toggle [videoSource], Video URL or library picker [videoUrl/videoId plus Tablet/Mobile], Poster image [thumbnailId plus Tablet/Mobile]; Decorative and Alt text also show (meaning atom types include video, svg, lottie).
   - svg: SVG markup textarea in ResponsiveControl [svgContent plus Tablet/Mobile]; then the svg-presentation rows (section 3: they are styling but sit in Settings).
   - lottie: Lottie file picker, thumbnail.
3. Playback (PanelBody, closed), video and lottie only (gated in JSX in MediaPanelLayout, correct). Autoplay, Muted, Plays inline, Loop, Show controls, Lazy-load: BooleanResponsiveControl each, tiered (`videoAutoplay` plus Tablet/Mobile, null = inherit). Autoplay locks Muted and Plays-inline. Conforms.
4. Caption & Link (PanelBody, closed). Caption (SgsFreeTextField rich) [caption]; Caption tag select [captionTag] always shown even with no caption; Link popover [linkUrl, linkUrlSource, linkOpensNewTab, linkRel] (image only). For svg and lottie both atoms return nothing and the PanelBody mounts empty.
5. Media Styling (ToolsPanel, not collapsible; mounted only when image or video). Items: Order [order, ResponsiveOverride + number TextControl], Drawn width px [displayWidth, ResponsiveOverride + number TextControl; srcset hint, image only], Image blend mode [imageBlendMode, ComboboxControl; image only], Alignment [alignment, LogicalAlignControl, isShownByDefault]. edit.js's comment ("objectFit / maxWidth / alignment ... isShownByDefault") is stale: only Alignment is.
6. Video (PanelBody, open, video only). Misnamed: holds only Add/Replace captions (.vtt), Captions label, Captions language code, Remove captions. Accessibility content, gated on a video existing.

### Styles tab, in order

0. Filters (core native, `supports.filter.duotone` plus `selectors.filter.duotone: ".sgs-media__img, .sgs-media__video"`). Duotone only (M3).
1. Colour (SgsColourPanel via `textRow`). One row: Caption colour (+ hover + gradient + hover gradient) [captionColour, captionColourHover, captionColourGradient, captionColourHoverGradient]. Shows for every media type and whether or not a caption exists; separate from Typography.
2. Image Styling (PanelBody, closed). Object fit [objectFit + Tablet/Mobile, ResponsiveControl; image, video]; Focal point [objectPosition + Tablet/Mobile, FocalPositionField with image preview; image, video]. For svg and lottie both atoms are omitted and the PanelBody still mounts EMPTY.
3. Box & Border (PanelBody, closed). Atoms box-shape, media-padding, opacity, shadow (types image, video, svg; empty for lottie):
   - Box shape toggle (Auto | Fixed height | Aspect ratio | Fill the layout) [mediaSizing]
   - Height [height; tiered via ResponsiveOverride + SgsLengthControl presets=false, custom unit list], greyed with help text unless mode = Fixed height
   - Ratio select [aspectRatio], greyed unless mode = Aspect ratio
   - Shape select None|Rounded|Circle|Square [shape]
   - Border (SgsBorderControl): width box [borderWidth, untiered by Bean ruling], style [borderStyle], colour normal + hover (+ gradients) [borderColour, borderColourHover, ...], Corner radius [borderRadius + Tablet/Mobile, 4-corner, per device]
   - Width, Max width, Max height [width, maxWidth, maxHeight], tiered SgsLengthControl
   - Minimum height: a bare TextControl [minHeight, desktop key only]
   - Padding [padding, ResponsiveBoxControl, tiered]
   - Opacity RangeControl [opacity]
   - Box shadow ShadowControl (Simple/Layers/Raw, Normal + Hover, lift toggle) [boxShadow, boxShadowColour, boxShadowColourHover, shadowLiftOnHover]
4. Overlay (PanelBody, closed). Overlay colour and gradient, normal + hover [overlayColour, overlayGradient, overlayColourHover, overlayGradientHover], Overlay opacity (%) [overlayOpacity, per tier], Overlay blend mode [overlayBlendMode]. Types image, video, svg; empty for lottie. Paints on `.sgs-media-box::after` (wrapper).
5. Typography (PanelBody, closed). TypographyControls with two targets in a segmented switch: Caption (full property set including text-align, columns, writing mode, stroke) and Video time (size, family, weight, style, line height, transform, decoration, letter spacing, wrap, stroke, columns, writing mode). Always mounted for every media type; both targets always listed.
6. Injected motion panels (editor.BlockEdit filter, `supports.sgs.motion: true`): Hover (order 10), Entrance and reveal (20), Effects (30). Effects is empty (section 2).

### Advanced

Anchor and className via native supports. Nothing else.

## 2. M2: why the Effects panel is empty (a gap in the generator inputs, not a bug in the panel)

Chain, each step verified in code:

- The panel mounts because `block.json::supports.sgs.motion` is true (`extensions/motion/index.js`).
- Its options come from `effect-options.js::effectOptions( blockName, target, elements )`, which keeps an effect only if `qualifyingBlocks[ blockName ]` contains it. `qualifyingBlocks` is `src/blocks/extensions/generated-fx-qualifying-blocks.json`.
- `sgs/media` is NOT a key in that JSON (43 blocks are). `python plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py --check` reports the committed file matches its inputs, so the file is correct for the generator's rules. `offered` is `[]` and the Effect select shows "No effect fits this part of the block."
- Why the generator excludes it: a block is a host only if it meets a specific requirement (section, text, svg, track, marquee-track, item-set) or declares `supports.sgs.fx.motionSurface: true`. `image` and `surface` are in `EXTENDS_ONLY_REQUIREMENTS`: they extend a host and never create one. sgs/media meets only `image` (found by `_raster_image_blocks`), uses AuthoredText rather than RichText (no `text`) and has no `containerKind`, so it is not a host.
- sgs/decorative-image avoids this by declaring `supports.sgs.fx.motionSurface: true` (with a long comment describing exactly this case). sgs/media never declared it. The generator docstring itself calls sgs/media and sgs/decorative-image "the framework's two most obvious image blocks".
- The `elements.media` part (isWrapper true, `motionSelector: ".sgs-media-el"`) is NOT the cause. `Sgs_Motion_Targets::parts` makes a wrapper part with a `motionSelector` an ordinary non-root target; only `"motion": false` removes a part. `video-time` has `motion:false` (correct: view.js builds it); `media` and `caption` are targets.
- Fix shape (no hand-rolled list, FP-1): add `supports.sgs.fx.motionSurface: true` to sgs/media block.json, regenerate with the generator, rerun `--check`. `kindsFit` will still filter text and svg effects by part kind (caption is `text:true`). Parallax on an `<img>` already works for decorative-image. Separately, B1/Q4 (Background panel parallax) is a different surface.
- The panel mounts even when it will list nothing; arguably a panel with an empty effect list should not mount at all (Hover and Entrance lists were not traced).

## 3. Per-control table

Embed = video with external URL (YouTube/Vimeo `<iframe class="sgs-media__video">`, render.php around the iframe `sprintf` calls). The iframe has NO `.sgs-media-el` marker, so every box atom (border, radius, clip-path, shadow, padding, opacity, aspect ratio, min height, object-fit) is dead for embeds; only overlay (wrapper) and duotone (selector includes `.sgs-media__video`) can act. A direct video file has the marker (`<video class="sgs-media__video sgs-media-el">`).

| Control | Attribute | Panel (tab) | Shows when | Does something for | Emits (element) | Responsive | Conforms |
|---|---|---|---|---|---|---|---|
| Media type | mediaType | Media Type (Settings) | always | all | selects render branch | tier selects if tiers set | yes |
| Source pickers, art direction | imageId/Url, video*, svgContent*, LottieId (+Tablet/Mobile) | Source (Settings) | by type | per type | markup (picture sources, svg) | per-device | yes |
| Decorative, Alt text | imageDecorative, imageAlt | Source (Settings) | all four types | image confirmed (alt, aria-hidden); video/svg/lottie unverified | alt, aria-hidden on `<img>` | no | shown on types that may ignore it (M4) |
| SVG Position | svg z-index attr | Source (Settings) | svg | svg | `z-index` on `.sgs-media-el` | no | styling in Settings; label "Position" is really layering |
| SVG Opacity (%) | svg opacity attr | Source (Settings) | svg | svg | `--sgs-media-svg-opacity`, multiplied with general Opacity | no | DUPLICATE of Opacity; RangeControl |
| SVG Animation, speed, Text shadow | svg attrs | Source (Settings) | svg (speed only when animation is not none) | svg | keyframes, text-shadow on `.sgs-media-el` | no | appearance in Settings |
| SVG Minimum height | svg min-height attr | Source (Settings) | svg | svg | `--sgs-media-svg-min-height`, combined by `max()` | no | uses SgsLengthControl; DUPLICATE of box-shape Minimum height |
| Autoplay, Muted, Plays inline, Loop, Show controls, Lazy-load | video* (+Tablet/Mobile) | Playback (Settings) | video, lottie | video file; embed via URL query; lottie partial | element attributes, URL query | tiered booleans | yes |
| Caption | caption | Caption & Link (Settings) | image, video | image, video | `<figcaption>` | no | yes |
| Caption tag | captionTag | Caption & Link (Settings) | image/video, even with empty caption | only with a caption | tag name | no | M4 failure |
| Link | linkUrl etc. | Caption & Link (Settings) | image | image | wraps in `<a>` | no | yes |
| Order | order | Media Styling (Settings) | image, video | all in a flex/grid row; svg and lottie lose the control but still honour a stored value | `order` on wrapper | per-device | wrong tab, wrong gate |
| Drawn width | displayWidth | Media Styling (Settings) | image, video | image only | `sizes` hint, no CSS | per-device | shows for video where inert |
| Image blend mode | imageBlendMode | Media Styling (Settings) | image, video | image only | `mix-blend-mode` on img | no | appearance in Settings; video inert |
| Alignment | alignment | Media Styling (Settings) | image, video | all (svg honoured in render and canvas) | margin-inline on picture (image, svg) or wrapper | no | gate hides it for svg |
| Captions .vtt, label, language | videoCaptions* | Video (Settings) | video present | direct video file; pointless for embeds | `<track>` | no | misnamed panel |
| Caption colour (+hover, gradients) | captionColour* | Colour (Styles) | always, all types | needs a caption | `.sgs-media__caption` colour or text-gradient | no | shown without a caption; apart from Typography |
| Object fit | objectFit (+Tablet/Mobile) | Image Styling (Styles) | image, video | image, video file; not embed | `object-fit` on `.sgs-media-el` | per-device | yes |
| Focal point | objectPosition (+Tablet/Mobile) | Image Styling (Styles) | image, video | image, video file; not embed | `object-position` on `.sgs-media-el` | per-device | greyed not omitted; enabled by the DESKTOP fit only (R1 defect); inert under fill |
| Box shape (sizing mode) | mediaSizing | Box & Border (Styles) | image, video, svg | all but embed | selects height/ratio/fill; fill adds `.sgs-media-box--fill` on wrapper | no | name collides with Shape |
| Height | height | Box & Border | always; greyed unless Fixed height | all but embed | `height` on `.sgs-media-el` | per-device | SgsLengthControl presets=false inside ResponsiveOverride with a custom unit list, not the documented ResponsiveLengthControl |
| Ratio | aspectRatio | Box & Border | greyed unless Aspect ratio | all but embed | `aspect-ratio` on `.sgs-media-el` | not per-device | six-value select; no per-device art direction |
| Shape | shape | Box & Border | always | all but embed | `clip-path`: square `inset(0)`, rounded `inset(0 round 12px)` (hard-coded), circle `circle(50%)` | no | M6/M7 |
| Border width, style, colour, hover colour | borderWidth, borderStyle, borderColour* | Box & Border | always | all but embed | `border-*` on `.sgs-media-el`; hover on the element | width untiered by ruling | SgsBorderControl, conforms |
| Corner radius | borderRadius (+Tablet/Mobile) | Box & Border (in Border) | always | all but embed | `border-*-radius` on `.sgs-media-el` | per-device | conforms |
| Width | width | Box & Border | always | all but embed | `width` on `.sgs-media-el` | per-device | as Height |
| Max width, Max height | maxWidth, maxHeight | Box & Border | always | all but embed | `max-width` (fallback 100%), `max-height` | per-device | as Height |
| Minimum height | minHeight (desktop key only) | Box & Border | always | all but embed; also the fill frame | `--sgs-media-min-height[-tablet|-mobile]` | CSS has the tiers, control writes desktop only | M8 |
| Padding | padding | Box & Border | always | img, video, svg | `padding-*` on the element, inside the border | per-device | ResponsiveBoxControl; padding on `<img>` shrinks the picture inside its border |
| Opacity | opacity | Box & Border | always | all but embed | `opacity` on the element | no | plain RangeControl; only non-tiered style control |
| Box shadow | boxShadow, boxShadowColour, boxShadowColourHover, shadowLiftOnHover | Box & Border | always | all but embed | `box-shadow` on `.sgs-media-el` | no | ShadowControl correct; panel wrong (M5); hidden by clip-path |
| Overlay colour, gradient, opacity, blend | overlay* | Overlay (Styles) | image, video, svg | all including embed | `.sgs-media-box::after` on the WRAPPER | opacity per tier | conforms; ignores picture radius and clip |
| Typography Caption / Video time | caption*, videoTime* | Typography (Styles) | always, both targets | caption needs a caption; video time needs a direct video file | `.sgs-media__caption`, `.sgs-video__time` | size etc per-device | M4 |
| Duotone | style.color.duotone (core) | Filters (Styles, native) | always | img, video, iframe via selector | generated class + `<style>` filter | no | M3 |
| Hover, Entrance, Effects | sgsMotion | injected (Styles) | block declares motion | Effects empty | motion renderer | per-device | Effects broken |

## 4. M1: the two "styling" panels

- Settings: "Media Styling" (`components/MediaStylingPanel.js`, a `ToolsPanel`). Styles: "Image Styling" (a PanelBody from MediaPanelLayout). The code titles differ; if the editor shows identical names, no second injected title was found in code, so verify live.
- Why it cannot collapse: `ToolsPanel` has no collapse affordance (Spec 35 A5 states this). It came from the Spec 35 wave-B dense-panel pass and was left in Settings when the atom layer took over the rest.
- Overlaps: no attribute overlaps an atom attribute (objectFit, focal point, sizing, border, shadow, opacity and padding all belong to the atoms). The conceptual overlaps are: Image blend mode is appearance next to Overlay blend mode; Alignment (`margin-inline` on the picture) interacts with Width and Max width; Drawn width is a derived srcset hint most authors never need. The `isImage || isVideo` gate is wrong for every item (table).
- Dissolve: Alignment and Order to a Layout group in Box & Border (or a Layout panel); Image blend mode into Overlay (image only); Drawn width hidden under an advanced disclosure or derived (render.php has `sgs_media_cover_crop_plan`).

## 5. M3: duotone

Source: core `supports.filter.duotone: true` plus `selectors.filter.duotone` in block.json. Core renders the Filters panel at the top of Styles and emits a generated class plus `<style>`. No `duotone` handling exists in the media render, edit or style files. To move it into Overlay: an SGS control writing a string attribute (preset slug or colour pair) emitted as an SVG filter plus `filter:url(#id)` on `.sgs-media-el`, or reuse a shared helper (none found for media). To remove it: delete `supports.filter` and `selectors.filter` from block.json and sweep any saved `style.color.duotone` with WP-CLI (pre-production, no deprecated.js per FP-14). The motion effect `surface-treatment` (grain, halftone, duotone WebGL finishes) is a separate duotone mechanism already offered on sgs/decorative-image; enabling `motionSurface` on media (M2) would bring it here too, so decide whether media needs both.

## 6. M4: conditional-relevance failures (complete list found)

1. Typography lists Caption and Video time always. Show Caption only when a caption exists; Video time only for a direct video file (not embed, not image); hide the panel when neither applies (svg, lottie, image without caption).
2. Caption colour sits in its own Colour panel and shows with no caption on every type. Move into Typography beside the Caption target, gated on a caption.
3. Caption tag always shows; gate on caption text.
4. Panels that mount empty: Image Styling (svg, lottie), Box & Border (lottie), Overlay (lottie), Caption & Link (svg, lottie). MediaPanelLayout gates only Playback in JSX; MediaElementPanel returns null for empty rows but the PanelBody is already mounted.
5. Embed iframes: Image Styling, Box & Border (border, radius, shadow, padding, opacity, min height, ratio, height, width) are inert (no `.sgs-media-el`). Add the marker to the iframe, or hide those rows for external-URL video.
6. Drawn width and Image blend mode show for video where inert.
7. Height and Ratio are greyed rather than omitted, contradicting the rule "a row that doesn't apply is OMITTED, not disabled"; the atom vocabulary already has `shown|disabled|omitted`. Focal point likewise greyed.
8. Fill mode: Height and Ratio say "not used" but Width, Max height and Minimum height still show and partly apply.
9. Decorative and Alt text show for video, svg and lottie; alt is only confirmed wired for image.
10. Order and Alignment hidden for svg and lottie though they apply.
11. SVG-only appearance controls (Position, Opacity, Animation, Text shadow, Min height) live in Settings > Source.
12. Video captions panel for embed sources (YouTube and Vimeo supply their own).
13. Border style and colour show when no border width is set.

## 7. M5: shadow

Elsewhere: a dedicated closed PanelBody titled "Shadow" wrapping `<ShadowControl>`, with the colour exemption (`boxShadowColour*` stays with the shadow, not SgsColourPanel): sgs/button, sgs/container, sgs/hero, sgs/google-rating-badge, sgs/before-after, sgs/decorative-image (LayerBoxPanels). Media instead puts it in the atom list `[ 'box-shape', 'media-padding', 'opacity', 'shadow' ]` inside Box & Border. Fix: mount the `shadow` atom in its own PanelBody titled Shadow in `MediaPanelLayout`. Attribute names stay.

Hazard to fix in the same pass: `box-shadow` and `clip-path` are both on `.sgs-media-el`; clip-path clips everything outside the border box, so a shadow is invisible whenever Shape is not None.

## 8. M6/M7: Box and Shape in detail

Everything box-related paints on the replaced element `.sgs-media-el` (`<img>`, `<video>`, `<svg>`) except overlay, which paints on the wrapper `.sgs-media-box::after`. With no overlay, link or fill mode the figure is dropped and the `<img>` is the block root (naked mode).

Options and what they emit:
- Box shape (mode) Auto: nothing (the picture's own ratio from its width and height attributes). Fixed height: `height`. Aspect ratio: `aspect-ratio`. Fill the layout: wrapper gets `.sgs-media-box--fill`, the picture covers it, `min-height` moves to the frame; the only mode that sizes the wrapper.
- Shape None / Square / Rounded / Circle: `clip-path` none / `inset(0)` / `inset(0 round 12px)` (hard-coded 12px, ignores Corner radius) / `circle(50%)`.
- Border and Corner radius: `border-*` and `border-*-radius` on the same element.

What is broken, and why (code-proven; the exact owner repro was not run live):
- Circle: `circle(50%)` is not a true circle unless the box is square, and Shape sets no 1:1 ratio and touches no width, height or object-fit. Wider boxes give a clip that cuts the sides or leaves gaps against the figure. The clip also cuts the border at the border box edge.
- Rounded: two independent mechanisms for rounded corners exist (Shape=Rounded clip 12px, and Corner radius `border-radius`) and they disagree when both are set. The overlay sits on the square wrapper so it stays square over a rounded picture, and a link wrapper has no radius.
- Border, shadow, overlay and clip each act on a different box; no atom owns the frame as one thing.
- Replace Shape with radius and ratio: yes. Square is the default (radius 0), Rounded is Corner radius, Circle is Corner radius 50% plus Aspect ratio 1 / 1 with object-fit cover. A one-click Circle preset can still exist as a button writing those values (radius 50% on all four corners, `aspectRatio` "1 / 1", `mediaSizing` ratio), so no clip-path is needed and border, shadow and overlay follow. Then `shape`, `SHAPE_OPTIONS`, `CLIP_PATHS` and `--sgs-media-clip-path` go (the `shape` attribute is injected, so removal is in `MEDIA_BASES`, the box-shape atom JS and PHP twins, `media-element.css`; sweep stored values, no deprecated.js).
- Which controls act on which box (proposal): picture: Object fit, Focal point, Image blend mode, duotone/filter, picture Opacity, Radius (clips the picture). Frame (wrapper): Border, Padding, Shadow, Overlay (clipped by `overflow:hidden; border-radius:inherit`), Width, Max width, Height, Ratio, Min height, Alignment, Order. Today all of these except overlay are on the picture, so the frame has no radius for the overlay to follow.
- Rename the sizing mode "Box shape" (collides with "Shape"), for example "Sizing".

## 9. M8: Minimum height against the standard

Standard (block-editor-controls.md "Gaps and single lengths"; Spec 35 section 4 LENGTH/UNIT): any width, height, radius or other single length mounts `<SgsLengthControl>` (via `ResponsiveLengthControl`, `hideLabelFromVision` inside a ResponsiveControl), with real units, per device; "a TextControl standing in for UnitControl" is a banned lookalike. Actual: `MediaBoxShapeControls.js` ends with a plain `TextControl` ("Minimum height (any unit, e.g. 40vh)") reading `minHeightObj.desktop` and writing `{ ...minHeightObj, desktop: v }`. Desktop only, free text (a typo is invalid CSS), no unit select, and the label asks the author to type CSS. The stylesheet already has tablet and mobile fallbacks. Siblings Height, Width, Max width and Max height use SgsLengthControl inside ResponsiveOverride (close to, not exactly, the documented ResponsiveLengthControl), and the SVG Minimum height uses SgsLengthControl. Fix: one `LengthFieldRow` for min height, merged with the SVG Minimum height (two controls today, combined by `max()` in `media-element.css`).

## 10. R1: conditional controls and the global device switcher (current state)

- The global switcher is the editor device type; SGS reads it through `usePreviewTier()` and `resolveTier()` (src/utils). `ResponsiveControl` shows the device icons and calls `children( breakpoint )`; `ResponsiveOverride` stores `{desktop,tablet,mobile}` objects. Both follow the same global toggle.
- Conditions in the atom layer are device-blind, with one exception. Precedents: (a) `video-behaviour.control.js` reads `getDeviceType` and resolves tier-inherited values (null = inherit) before locking Muted and Plays-inline under Autoplay: the only conditional tied to the active device. (b) `focal-point.js::disclosure` and the object-fit hint read the desktop `ObjectFit` key whichever device is selected, so on Mobile the Focal row is enabled or disabled by the desktop fit. (c) `box-shape.js::disclosure` derives mode from `mediaSizing`, which is not per-device, while Height is per-device, so Height/Ratio can never be disabled per device.
- Design implication: disclosure functions take a `tier` and resolve own value, else tablet, else desktop (the cascade the CSS custom properties use). Where a condition depends on a non-tiered attribute, make that attribute tiered or define the condition as "any tier set".

## 11. Everything else wrong (beyond the owner's list)

1. Effects empty because sgs/media never declared `motionSurface`; the empty panel mounts anyway (section 2).
2. Embeds (YouTube/Vimeo iframes) lack `.sgs-media-el`: about a dozen box controls are dead for them and nothing tells the author.
3. Two Minimum height controls and two Opacity controls for SVG, combined by `max()` and multiplication in `media-element.css`; the author cannot tell which wins.
4. Shadow plus Shape: clip-path hides the shadow; padding sits inside the border; overlay, shadow, border and radius act on different boxes.
5. Sizing mode "Box shape" vs "Shape": naming collision; Height and Ratio greyed rather than omitted.
6. Panels mount empty for svg and lottie (Image Styling, Box & Border, Overlay, Caption & Link).
7. `MediaStylingPanel` and `VideoPanel`: a non-collapsible ToolsPanel in Settings, and a "Video" panel holding only caption-file controls, with Playback in a third panel.
8. Order and Alignment gated `isImage || isVideo` although render and canvas honour them for svg (`alignsPicture` includes svg).
9. SVG appearance controls in Settings > Source instead of Styles.
10. Typography offers text columns, writing mode, stroke and wrap for a one-line caption and a time read-out; Video time is real only for direct video files (a view.js-built div, `motion:false`).
11. Focal point stays editable but inert under object-fit fill; no state-aware hide for embed.
12. Ratio is not per-device (art direction wants it) and is a six-value list; Height/Width use a custom unit list (px, %, vh, vw, rem; no em, svh, dvh).
13. Hygiene: block.json `description` has mojibake; edit.js carries stale comments; render.php lists an undeclared `motion` atom; `captionFontSize` (integer) next to `videoTimeFontSize` (object) is a type mismatch between two parallel families (check which one the typography panel actually writes); render.php is 1,379 lines against the 500-line guideline and a file over 1,000 lines does not grow without a split.
14. `shadowLiftOnHover` defaults true on every media; with clip-path it is inert.
15. Three hover mechanisms live in three panels (border colour hover, overlay hover, shadow hover) plus the Hover motion panel.

## 12. Attributes that would change (proposal, subject to Bean's choices)

- Remove: `shape` (injected; replace with a preset button writing borderRadius and aspectRatio); `supports.filter` and `selectors.filter` (M3); possibly `captionFontSize` and `captionFontSizeUnit` if superseded (verify the writer first).
- Add or change: `supports.sgs.fx.motionSurface: true` (a supports flag); `minHeight` becomes a `{desktop,tablet,mobile}` string object read by the existing CSS tiers, merged with svg min height; optional per-device `aspectRatio` (object like `height`); optional duotone replacement string if M3 moves it.
- No attribute change, move only: `order`, `alignment`, `displayWidth`, `imageBlendMode` out of the Settings ToolsPanel; caption colour into the Typography panel; overlay clipped to frame radius in CSS (wrapper `border-radius: inherit; overflow: hidden`).
- Any removal needs a WP-CLI batch sweep (no `deprecated.js`, FP-14), a DB reseed (`/sgs-update`) and both gate tiers before pushing attributes.

## 13. Unverified (do not rely on without a live check)

- The exact owner repro for "rounded with square corners" (code candidates given above).
- Whether Hover and Entrance also list nothing for sgs/media (only Effects was traced).
- Whether alt and decorative act on video, svg or lottie (those render.php branches were not read line by line).
- Which attribute the Typography panel writes for the caption size.
