# sgs/media — media-control audit (M1 council seat)

**Scope:** `plugins/sgs-blocks/src/blocks/media/` only (block.json, edit.js, render.php, view.js). Read-only static analysis — no live-DOM check was run (out of this seat's tool allowance).

**Expected population (declared before counting):** `block.json` declares 73 real attributes (excluding `_comment_*` keys). Of these, ~40 are media-related in the narrow sense (image/video/svg source + styling); the rest are caption/link/layout attrs shared across media types. All 73 were checked for editor-control presence.

---

## Defect verdicts

### 1. "No button to select/upload media from the gallery for the IMAGE option" — **REFUTED as stated, but a real asymmetry exists**

A picker exists in two places:
- **Canvas placeholder** (`edit.js:1470-1485`): when `isImage && !imageUrl`, the canvas renders `<MediaPlaceholder accept="image/*" allowedTypes={['image']} onSelect={onSelectImage}>` inside `<MediaUploadCheck>` — this is WP core's placeholder, which itself renders "Upload" + "Media Library" buttons. This is reachable and functional for a freshly-inserted block (`mediaType` defaults to `'image'`, `imageUrl` defaults to `''`).
- **Inspector "Replace Image" button** (`edit.js:262-277`): a `<MediaUpload>` wrapped in `<MediaUploadCheck>` — but the whole "Image" `PanelBody` is gated `{ isImage && imageUrl && ( ... ) }` (line 262). **This panel does not exist at all until an image is already set.**

The real, provable asymmetry: compare to Video and SVG, whose panels are gated only on the type (`{ isVideo && (...) }` at line 899, `{ isSvg && (...) }` at line 738) — NOT on content existing. Selecting "Video" or "SVG" in the Media Type button group immediately opens a picker/source-control panel in the inspector. Selecting "Image" opens **nothing** in the inspector — the only picker is the big canvas placeholder. If that placeholder is scrolled off, or the operator is inspector-first (as Video/SVG train them to be), it reads as "no button for image." This is a genuine inconsistency worth fixing (drop the `&& imageUrl` gate, or add an inspector-side placeholder call-to-action mirroring Video/SVG), but it is not "no control exists."

### 2. "Video/SVG panels don't show in the mediatype panel — appear in a panel BELOW Visibility Conditions" — **NOT REPRODUCIBLE FROM STATIC CODE; contradicts the coded mechanism**

Confirmed facts:
- `edit.js` has exactly **one** `<InspectorControls>` (opens line 226, closes line 1460). All of the block's own panels — Media Type (229), Image (262), Media Styling ToolsPanel (~406), Caption & Link (671), SVG/Animation (738), Video incl. nested Thumbnail + Playback Options (899-1458) — are children of this single Fill instance, in that fixed JSX order.
- "Visibility conditions" is a **separate** Fill, added by `plugins/sgs-blocks/src/blocks/extensions/conditional-visibility.js` via an `editor.BlockEdit` filter (`withConditionalVisibilityControls`, line 268). Its return shape is `<><BlockEdit {...props}/><InspectorControls><PanelBody title="Visibility conditions">...</PanelBody></InspectorControls></>` (lines 299-301) — i.e. **`BlockEdit` (which is sgs/media's whole edit.js output, already wrapped by every earlier-registered filter) renders first; Visibility Conditions is appended after.**
- Every other extension filter (`animation.js:135-137`, `hover-effects.js:288-290`, `custom-css.js:62-64`, `block-defaults.js:84-86`, `parallax.js:130-132`, `image-controls.js:164-166`, `fx.js:1806-1808`) follows the identical `<BlockEdit/>` then own-panel pattern, and `extensions/index.js` imports `conditional-visibility` **last** specifically so its panel lands last among default-group panels (its own docblock, lines 17-35, asserts this and gives the reasoning).

Given this, the coded mechanism places **all** of sgs/media's own panels — including Video and SVG — ABOVE Visibility Conditions, not below. I cannot find a static code path that would invert this. Possible explanations I could not verify without a live DOM check: (a) Slot/Fill re-registers a Fill at the back of its queue on remount, and something about switching `mediaType` (which does NOT unmount `<InspectorControls>` itself, only its children) triggers a Fill remount I haven't spotted; (b) WP's Settings/Styles inspector tabs (apiVersion 3) re-sort by attribute origin rather than DOM order in a way not visible from source; (c) the observation was made against a stale build. **This needs a live Playwright DOM check — flagging rather than guessing, per the project's evidence rule.**

### 3. "Media-type enum control differs from the split-media panel's" — **CONFIRMED**

- `sgs/media`'s own type selector (`edit.js:230-256`): a plain `<ButtonGroup>` of three `<Button variant={isX?'primary':'secondary'}>` elements, one flat non-responsive attribute (`mediaType`), toggled by `onClick`.
- `sgs/hero`'s split-media type selector (`plugins/sgs-blocks/src/blocks/hero/edit.js:679-724`): a `<SelectControl>` dropdown (options Image/Video/SVG, plus an "Inherit" option on tablet/mobile), wrapped in `<ResponsiveControl>` so it is **per-device** (`splitMediaType` / `splitMediaTypeTablet` / `splitMediaTypeMobile`), with a desktop-only option list and a tablet/mobile option list that adds "Inherit".

Different component (`ButtonGroup`+`Button` vs `SelectControl`), different interaction pattern (single global toggle vs per-device dropdown with inherit), different attribute shape (flat string vs three-tier object family). Confirmed divergence, file:line as above.

---

## Full control inventory

| Attribute | Control component | Panel | Order index (within the one InspectorControls Fill) | Gated on | Styles | Applies to |
|---|---|---|---|---|---|---|
| `mediaType` | `ButtonGroup`/`Button` ×3 (`edit.js:230-256`) | Media Type | 1 | always | — | all |
| `imageId`/`imageUrl` | `MediaUpload` "Replace Image" (`266-277`) + canvas `MediaPlaceholder` (`1472-1485`) | Image / canvas | 2 (inspector panel only when `imageUrl` set) | `isImage && imageUrl` (panel); canvas placeholder when `isImage && !imageUrl` | source | image |
| `imageIdTablet`/`imageUrlTablet`, `imageIdMobile`/`imageUrlMobile` | `MediaUpload` inside `ResponsiveControl` render-prop (`297-333`) | Image (nested "Art direction") | 2 | `isImage && imageUrl` | source per device | image |
| `imageIsDecorative` | `ToggleControl` (`358-373`) | Image | 2 | `isImage && imageUrl` | a11y | image |
| `imageAlt` | `TextControl` (`375-396`) | Image | 2 | `isImage && imageUrl`, disabled when decorative | a11y/SEO | image |
| `imageWidth`/`imageHeight` | none (set only by `onSelectImage` from the media object) | — | — | n/a | intrinsic dims | image |
| `maxWidth` (tier obj) | `ResponsiveOverride` + `SgsLengthControl` (`438-458`) | Media Styling (ToolsPanel) | 3 | `isImage \|\| isVideo` | box | image, video |
| `maxWidthUnit` | **none** | — | — | — | legacy bare-number fallback unit only (`sgs_media_css_length`) | image, video |
| `maxHeight` (tier obj) | `ResponsiveOverride` + `SgsLengthControl` (`469-490`) | Media Styling | 3 | `isImage \|\| isVideo` | box | image, video |
| `maxHeightUnit` | **none** | — | — | — | legacy fallback unit only | image, video |
| `height` (tier obj) | `MediaSizingPanel` (`512-530`, mode="height") | Media Styling | 3 | `isImage \|\| isVideo` | box | image, video |
| `heightUnit` | **none** | — | — | — | legacy fallback unit only | image, video |
| `mediaSizing` | `MediaSizingPanel` mode picker (`496-530`) | Media Styling | 3 | `isImage \|\| isVideo` | layout | image, video |
| `style.dimensions.aspectRatio` (native) | `MediaSizingPanel` (mode="ratio") | Media Styling | 3 | `isImage \|\| isVideo` | box | image, video |
| `objectFit` | `MediaSizingPanel` | Media Styling | 3 | `isImage \|\| isVideo` | fill | image, video |
| `objectPosition` | `MediaSizingPanel` (focal point) | Media Styling | 3 | `isImage \|\| isVideo` | fill | image, video |
| `style.border.radius`, `borderRadiusTablet`, `borderRadiusMobile` | `ResponsiveBorderRadiusControl` (`533-573`) | Media Styling | 3 | `isImage \|\| isVideo` | box | image, video |
| `alignment` | `SelectControl` (`576-599`) | Media Styling | 3 | `isImage \|\| isVideo` | layout | image, video |
| `opacity` | `RangeControl` (`602-616`) | Media Styling | 3 | `isImage \|\| isVideo` | fill | image, video |
| `boxShadow`/`boxShadowColour`/`boxShadowColourHover` | `ShadowControl` (`619-628`) + `SgsColourPanel` rows (top of file, `176-222`) | Media Styling + top-level colour panel | 3 (shadow shape) / pre-InspectorControls (colour) | `isImage \|\| isVideo` | box | image, video |
| `caption` | `TextControl` (`675-682`) | Caption & Link | 4 | `isImage \|\| isVideo` | content | image, video |
| `captionTag` | `SelectControl` (`684-699`) | Caption & Link | 4 | `isImage \|\| isVideo` | semantics | image, video |
| `captionColour` | `SgsColourPanel` row (`178-204`) | top-level colour panel (renders before Media Type — see note below) | 0 | always shown, only meaningful when a caption exists | text | image, video |
| `captionFontSize` | **none** | — | — | — | typography | image, video |
| `captionFontSizeUnit` | **none** | — | — | — | typography | image, video |
| `linkUrl`/`linkOpensNewTab`/`linkRel` | `LinkPopoverField` (`701-717`) | Caption & Link | 4 | `isImage` only (not video) | behaviour | image only |
| `order` | **none** | — | — | — | CSS `order` (desktop/tablet/mobile) | all |
| `svgContent`/`svgContentTablet`/`svgContentMobile` | `TextareaControl` ×3 via `ResponsiveControl` (`746-756`, `816-887`) | SVG / Animation | 5 | `isSvg` | source | svg |
| `svgAnimation` | `SelectControl` (`889-908`) | SVG / Animation | 5 | `isSvg` | motion | svg |
| `svgAnimationSpeed` | `SelectControl` (`910-928`) | SVG / Animation | 5 | `isSvg`, only when `svgAnimation !== 'none'` | motion | svg |
| `videoSource` | `SelectControl` (`903-925`) | Video | 6 | `isVideo` | source mode | video |
| `videoUrl` | `TextControl` (`927-938`) | Video | 6 | `isVideo && videoSource === 'external'` | source | video |
| `videoId` | `MediaUpload` "Select/Replace Video" (`940-963`) | Video | 6 | `isVideo && videoSource === 'internal'` | source | video |
| `videoUrlTablet`/`videoIdTablet`, `videoUrlMobile`/`videoIdMobile` | `MediaUpload`/`TextControl` via dynamic key inside `ResponsiveControl` (`~965-1029`, keys built as `` `videoUrl${tier}` ``/`` `videoId${tier}` ``) | Video | 6 | `isVideo && (videoUrl \|\| videoId)` | source per device | video |
| `thumbnail`/`thumbnailId` | `MediaUpload` "Select/Replace Thumbnail" (`1064-1117`) | Video → Thumbnail (nested) | 6 | `isVideo` | poster | video |
| `thumbnailTablet`/`thumbnailIdTablet`, `thumbnailMobile`/`thumbnailIdMobile` | `MediaUpload` via dynamic key inside `ResponsiveControl` (`~1140-1230`) | Video → Thumbnail | 6 | `isVideo && thumbnail` | poster per device | video |
| `videoAutoplay`/`Tablet`/`Mobile` | `BooleanResponsiveControl` (`1264-1277`) | Video → Playback Options (ToolsPanel) | 6 | `isVideo` | behaviour | video |
| `videoLoop`/`Tablet`/`Mobile` | `BooleanResponsiveControl` (`1291-1300`) | Video → Playback Options | 6 | `isVideo` | behaviour | video |
| `videoMuted`/`Tablet`/`Mobile` | `BooleanResponsiveControl` (`1316-1329`) | Video → Playback Options | 6 | `isVideo` | behaviour | video |
| `videoControls`/`Tablet`/`Mobile` | `BooleanResponsiveControl` (`1343-1352`) | Video → Playback Options | 6 | `isVideo` | behaviour | video |
| `videoPlaysInline`/`Tablet`/`Mobile` | `BooleanResponsiveControl` (`1368-1380`) | Video → Playback Options | 6 | `isVideo` | behaviour | video |
| `videoLazyLoad`/`Tablet`/`Mobile` | `BooleanResponsiveControl` (`1394-1406`) | Video → Playback Options | 6 | `isVideo` | perf | video |
| `videoMimeType` | none in editor (set by `onSelectVideo` from the media object only) | — | — | — | render hint | video |

Note on the colour panel: `SgsColourPanel` (caption colour + shadow colour rows) is mounted **before** `<InspectorControls>` opens (lines ~176-224 sit ahead of line 226) — it must be a component that renders its own portal/Fill internally (not read in this pass) rather than being a plain child of this file's InspectorControls. Flagging as unverified rather than guessing its actual DOM position.

## Declared-but-uncontrolled attributes (7)

Cross-checked block.json's 73 attributes against every editor-control reference in `edit.js` (including dynamic `` `attr${tier}` `` key construction, not just literal grep hits — the first pass over-reported here and was corrected by reading the file):

1. **`order`** — read in `render.php` (9 references, emits CSS `order` for desktop/tablet/mobile) but has **zero** editor control anywhere in `src/` (checked `blocks/media`, `blocks/extensions`, `components`). A client can never set this from the block editor. Genuine dead control.
2. **`captionFontSize`** — read once in `render.php:132`, zero editor control. Genuine dead control (caption font-size can never be set).
3. **`captionFontSizeUnit`** — read once in `render.php:133`, zero editor control. Same.
4. **`maxWidthUnit`** — read in `render.php:52`, but only as a **fallback unit for a legacy bare-number value** (`sgs_media_css_length()`, `render.php:240-260`); the current `SgsLengthControl` always writes a unit-embedded string, so this attr is inert for anything saved after the tier-object migration. Not a live-editing gap, but still "declared, zero control."
5. **`maxHeightUnit`** — same legacy-fallback pattern as #4.
6. **`heightUnit`** — same legacy-fallback pattern as #4.
7. **`imageWidth`/`imageHeight`** — not independently editable; only ever written by `onSelectImage` reading the chosen media object's intrinsic dimensions. Arguably by design (they mirror the file), not a gap — noting for completeness, not counting as a defect.

Confirmed image/video/svg per-device art-direction tiers (`imageUrlTablet`/`Mobile`, `videoUrlTablet`/`Mobile`, `thumbnailTablet`/`Mobile` and their `*Id` siblings) are **fully wired** end to end (control → render.php → view.js runtime swap for video/thumbnail; sibling `<img>` + `@media` CSS for image) — my first grep pass wrongly flagged these as uncontrolled because the code builds the attribute keys dynamically (`` `videoUrl${tier}` ``) rather than referencing the literal names; reading the surrounding code corrected this before it went in the table above.

## Rendered panel order (top to bottom, single InspectorControls Fill in edit.js)

1. Media Type (always)
2. Image (only when `isImage && imageUrl`) — else nothing shown here for image mode; canvas `MediaPlaceholder` is the only picker
3. Media Styling (ToolsPanel) — when `isImage || isVideo` (never for SVG)
4. Caption & Link — when `isImage || isVideo` (never for SVG; link sub-field only for image)
5. SVG / Animation — when `isSvg`
6. Video (with nested Thumbnail panel + Playback Options ToolsPanel) — when `isVideo`

Then, per `extensions/conditional-visibility.js`'s documented (and code-confirmed) `<BlockEdit/>`-then-own-panel composition, in filter-registration order: Animation → Hover Effects → Custom CSS → Block Defaults → Parallax → Image Controls (opts out for this block, no `supports.sgs.imageControls`) → Fx → **Visibility Conditions** (device toggles + conditional rules, one panel) → WP core's structurally-last **Advanced**.

By this mechanism, Visibility Conditions should render **after all six of sgs/media's own panels**, contradicting Bean's report in defect #2 — flagged above as needing a live check rather than resolved by guessing.

## SVG/Video panel styling gap

Because "Media Styling" and "Caption & Link" are both gated `isImage || isVideo`, **SVG mode gets zero styling controls** — no max-width/height, no border-radius, no alignment, no opacity, no box-shadow, no caption. Only the SVG/Animation panel (markup + animation type/speed) exists. Whether this is deliberate (SVG is inline foreground markup, sized by its own viewBox) or a gap wasn't something I could resolve statically — flagging for the design decision, not asserting a verdict.

## What surprised me

- The declared-but-uncontrolled list shrank from an apparent 15 (naive literal grep) to 7 (3 genuinely dead: `order`, `captionFontSize`, `captionFontSizeUnit`; 3 legacy-fallback-only unit attrs; 1 by-design derived pair) once dynamic template-literal attribute construction (`` `videoUrl${tier}` ``, `` `thumbnail${tier}` ``) was accounted for by reading the surrounding code rather than trusting a literal-string grep count of zero. Per the project's own rule (a grep returning 0 is a hypothesis, not a finding), this was worth re-verifying before reporting.
- The Video and SVG panels' inspector picker appears immediately on type selection; the Image panel's picker does not — the block.json/editor pattern is not symmetric across the three media types, and this asymmetry is the more precise, provable version of defect #1.
