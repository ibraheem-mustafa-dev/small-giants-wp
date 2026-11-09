# T1. Core media blocks audited against Spec 49 (worktree E:/sgs-tmp/wt-media, 2026-11-09)

Method limits: code, block.json and the framework DB were read; nothing was run, rendered or opened in a browser. Earlier reports B, C, K, L, M were used as leads and every claim below marked "verified" was re-checked in code. Anything else says "from B/C/M, not re-verified".

## 0. Blocks covered and how each was found

| Block | How found |
|---|---|
| `sgs/media` | Named in the brief |
| `sgs/decorative-image` | Named in the brief |
| `sgs/gallery` | Named in the brief |
| `sgs/hero` (standard background and split media) | Named in the brief; `BackgroundPanel` grep (`src/blocks/hero/edit.js`) and DB `block_attributes` (`backgroundImage`, `bgVideo`, `bgSvg*`, `splitMedia*`) |
| `sgs/container` | Named in the brief; `BackgroundPanel` grep (`src/blocks/container/edit.js`) |
| `sgs/multi-button`, `sgs/physics-canvas`, `sgs/site-footer`, `sgs/site-header`, `sgs/trust-bar` | `grep -rn BackgroundPanel plugins/sgs-blocks/src --include=*.js` (each `edit.js` mounts it) plus DB query on `attr_name LIKE 'backgroundImage%' OR 'bgVideo%' OR 'bgSvg%'` grouped by block (same five plus container and hero) |
| `sgs/nav-drawer` | Same DB query (`backgroundImage`, `backgroundImageDecorative`); it does NOT mount `BackgroundPanel` (its `edit.js` has a hand-copied scoped control) and does NOT paint through the wrapper (its `render.php` paints its own layer) |
| Not covered (found, out of this task) | `sgs/mega-panel` has `accentBackgroundImage` (DB query on `%ackground%` attrs); `sgs/card-grid`, `sgs/post-grid`, `sgs/product-card`, `sgs/buybox`, team, testimonial and the rest of Spec 49 §10.4 are other tasks. Not verified: whether mega-panel's image is a media slot Spec 49 §10.4 should list; it is absent from §10.4 |

Cross-check of the "second set": 103 render files call `SGS_Container_Wrapper` (grep `SGS_Container_Wrapper` in `src/blocks/*/render.php`), but only the seven wrapper-adopting blocks above declare background media attributes (DB). The rest use the wrapper for colour, border, shadow, layout only, so they have no media background to migrate.

Spec §10.4 matches this set for container, trust bar, site header, site footer, multi-button, physics canvas and nav drawer, and misses nothing in the background family; it does miss the Surface family and hero's SVG parts (see section 6 of Container and Hero).

## 1. Facts shared by every block below (all verified)

- Per-device data is flat siblings, not one object. `sgs/media`: `imageIdTablet`, `imageUrlTablet`, `imageIdMobile`, `imageUrlMobile`, `videoUrlTablet`, `svgContentTablet`, `videoAutoplayTablet` and so on (`src/blocks/media/block.json::attributes`). Backgrounds: `backgroundImageTablet`, `backgroundImageMobile`, `bgVideoTablet`, `bgVideoMobile` (container, hero and five more `block.json`s). Hero split: `splitMediaImageIdTablet`, `splitMediaVideoUrlMobile`, `splitMediaTypeTablet`.
- Focal and fit are strings: `objectPosition` "center center" (media), `backgroundPosition` (all backgrounds), `splitMediaObjectPosition` as a per-device object (hero only), `sgsObjectPosition` object plus per-item `focalPoint` `{x,y}` (gallery). That is four shapes (C section 1; shapes re-confirmed in `block.json`).
- Four different pickers: `MediaPicker` (decorative-image, `LayerImagePanel.js`), hand-rolled `MediaUpload` (media `components/VideoPanel.js`, gallery `edit.js`, `BackgroundPanel.js` image and video tabs), raw `FocalPointPicker` (`gallery/components/GalleryThumbnail.js`), and the atom pickers (`MediaElementPanel`).
- Per-render image loading uses `sgs_image_loading_attrs()` / `sgs_next_background_image_index()` in `includes/helpers-media.php`, with different rules per block (see each block).

## 2. sgs/media

### (1) What it has today

| Item | Today (verified unless marked) |
|---|---|
| Media attributes | `mediaType` "image" (image, video, svg, lottie); `imageId`, `imageUrl`, `imageAlt`, `imageDecorative` false, `imageWidth`, `imageHeight`; `videoSource` "external", `videoUrl`, `videoId`, `videoMimeType`, `thumbnail`, `thumbnailId`; `svgContent`; each with `Tablet`/`Mobile` siblings; `videoAutoplay`, `videoLoop`, `videoMuted`, `videoControls`, `videoPlaysInline`, `videoLazyLoad` with nullable tablet/mobile siblings; captions `videoCaptions*` |
| Sizing and look | `height`, `maxWidth`, `maxHeight` (tier objects); `mediaSizing` (no default, mode switch); `aspectRatio` string; `objectFit` "cover"; `objectPosition` "center center"; `opacity` 1; `displayWidth` object; `imageBlendMode`; border, radius, padding, shadow, overlay families (`borderRadius`, `borderRadiusTablet`, `borderRadiusMobile`, `overlayColour`, `overlayOpacity`, ...) |
| Not in block.json (injected) | `shape`, `minHeight`, `objectFitTablet/Mobile`, `objectPositionTablet/Mobile`, `width`: added at registration from `supports.sgs.mediaElements` by `includes/media-element-attrs-register.php` (B section 0; file header re-read). The DB therefore holds a different set from `block.json` |
| Panels | Settings: Media Type, Source, Playback, Caption and Link, Media Styling (ToolsPanel), Video (captions only). Styles: native duotone Filters, Colour (caption only), Image Styling (fit, focal), Box and Border, Overlay, Typography, injected Hover/Entrance/Effects (B section 1; panel titles in `edit.js`/`components/` re-seen) |
| Render | `src/blocks/media/render.php` (1,379 lines, top-level code, no renderer class). Image: `<figure>` wrapper, or a naked `<img>` as the block root when nothing needs a box. Art direction: sibling `<img>` per tier with `sgs-media__img--tablet/mobile` and a breakpoint show/hide rule from `$sgs_tier_visibility_css`, NOT `<picture>` (comment says so deliberately). Tier images use the full-size URL via `wp_get_attachment_image_src( $id, 'full' )`, no srcset. Video file: `<video class="sgs-media__video sgs-media-el">`. Embed: `<iframe class="sgs-media__video">` with no marker class |
| Per-device | Source tiers for image, video, svg; video playback booleans tiered; fit, focal, radius, padding, height, max sizes tiered; Alt, caption, border width, load priority global |
| Effects | Hover, Entrance and Effects panels mount (`supports.sgs.motion: true`), but Effects is empty |

### (2) Broken, inert or half-built

| Defect | Citation |
|---|---|
| Effects panel lists no effect: `sgs/media` is absent from the qualifying list because it never declares `supports.sgs.fx.motionSurface` (decorative-image does) | `grep motionSurface src/blocks/media/block.json` returns nothing; `python` over `src/blocks/extensions/generated-fx-qualifying-blocks.json` lists container, decorative-image, gallery, hero and no `sgs/media`; `src/blocks/decorative-image/block.json::supports.sgs.fx.motionSurface` |
| Embeds: every box control (radius, shadow, padding, border, ratio, fit, opacity) is dead because the iframe has no `sgs-media-el` marker | `src/blocks/media/render.php` iframe `sprintf` prints `class="sgs-media__video"` only (verified); marker claim from B |
| Art-directed images download the full-size file, no srcset or sizes, and the main `<img>` also calls `sgs_image_loading_attrs()` so two images may both claim priority. The second claim is not verified | `src/blocks/media/render.php` tier loop; `includes/helpers-media.php::sgs_image_loading_attrs` |
| Caption tag shown with no caption; Image Styling and Box panels mount empty for svg and lottie; Decorative and Alt shown for kinds that may ignore them | B section 1 and 3; not re-verified |
| `mediaSizing` mode chip greys Height and Ratio unless the right mode is on; Minimum height is a bare desktop-only text field | B section 1; matches Spec 49 section 0 |
| Raw `MediaUpload` in the Video panel and `edit.js` | `src/blocks/media/components/VideoPanel.js`, `src/blocks/media/edit.js` (verified by grep) |
| Duplicate SVG opacity and min-height controls | B section 3 |

### (3) What changes under Spec 49

Everything media-related is replaced: the flat siblings become one `mediaSource` responsive object plus `mediaAlt`, `mediaDecorative`, `mediaFit`, `mediaFocal` and the section 8 table (migration rows in section 13: `mediaType`, `imageId/Url`, tiers, `mediaSizing`, `aspectRatio`, `objectFit`, `objectPosition`, `minHeight`, `opacity`, `imageBlendMode`, `displayWidth` deleted, `shape` rounded to Corners 12px, `shape` circle to Shape Circle, `thumbnailId` to `Source.poster`). `render.php` shrinks to a call to `SGS_Media_Renderer` which prints `<picture>` with `<source media>` for different images, the helper only under section 7.3, real width and height, derived sizes, and an embed that carries the media marker. Panels become exactly section 9.4. `supports.sgs.fx.motionSurface` is added, `media` loses `isWrapper`. The atom registry, `MediaPicker`, `FocalPositionField` and `mediaElements` flag are deleted (section 8.2).

### (4) End shape

| Part | End shape |
|---|---|
| Attributes | `mediaSource`, `mediaAlt`, `mediaDecorative`, `mediaFit`, `mediaFocal`, `mediaRatio`, `mediaWidth`, `mediaMaxWidth`, `mediaMinWidth`, `mediaHeight`, `mediaMinHeight`, `mediaMaxHeight`, `mediaAlignment`, `mediaOrder`, radius, border, padding, background, shadow, `mediaOpacity`, `mediaShape`, overlay, greyscale, blur, blend, `mediaLoading`, `mediaPlayback`, `mediaCaptions`, plus `caption`, `captionTag`, link fields and the `caption*`/`videoTime*` typography family |
| Panels | Settings: Media, Caption and link, Video. Styles: Size and crop, Position in the layout, Border and shape, Shadow, Overlay and filters, Typography, SVG, Hover, Entrance and reveal, Scroll and ambient effects |
| Markup | `<figure> > <a> > [helper > mask >] <img class="sgs-media-el">`, levels omitted when unused; `<picture class="sgs-media-picture">` only for different per-device files |

### (5) Specialised controls that stay

Caption, caption tag and link (a `<figure>` and `<a>` only make sense here); Video playback and captions file; `videoTime*` typography for the player readout; SVG Layer, Animation, Speed and Text shadow for inline SVG; Load priority. The "kind tabs" (photo, video, embed, SVG) stay because they choose the printed element.

### (6) Over-built or wrong for this block

- Section 7.6 derived `sizes` (parse `calc`/`clamp`/`min`/`max`, `%` of the nearest max width, item-set column counts, crop factor) is the heaviest part of the renderer. For this block the simple end shape is: sizes from a set Width in px/vw, otherwise `100vw`, and WordPress's own generated sizes. Recommend cutting the parser to Width px/vw/rem/em plus a `100vw` fallback until a measured page needs more.
- Mask shapes (about a dozen registry shapes, uploaded SVG masks, SVG border stroke layer, per-device mask) are the largest new surface in the spec and none exists today; an AI draft only ever needs circle, pill and rounded. Recommend Stage B ships Circle, Ellipse, Pill and Corners only; masks follow when a real draft needs one (PS-3 is already unproven).
- Section 9.2 per-control "hidden-value note" plus dots plus "Mobile: using Tablet" plus Reset-to-Tablet is five mechanisms to show inheritance. Dots plus "using Tablet" text meet the goal.
- Spec 49 section 5 says `sgs/media` offers effects but section 10.1 lists `media` without `isWrapper`; verified consistent with B's finding that this is a generator-input gap. The fix is one line of `block.json` plus regenerate, and could ship before the redesign.

## 3. sgs/decorative-image

### (1) What it has today

| Item | Today (verified) |
|---|---|
| Media attributes | `decorMedia` object (unified image or video slot, default null); legacy `imageId`, `imageUrl`, `imageAlt`, `imageDecorative` true; `imageIdTablet/UrlTablet/IdMobile/UrlMobile`; `shape` "none" enum none, rounded, circle, square (clip-path); `width` `{"desktop":"200px"}`, `maxWidth`, `height`, `opacity` 100 (number, not the 0 to 1 of `sgs/media`) |
| Layer-only attributes | `positionX/Y` `{"desktop":50}`, `positionTop/Right/Bottom/Left`, `anchorTo` parent or section, `rotation`, `zIndex` 1, `flipX`, `fadeOnScroll`, `overflow` |
| Box attributes | `backgroundColour`, border family, `borderRadius`, `boxShadow*` |
| Injected, not in block.json or DB | `objectFit`, `objectPosition` (atoms `object-fit`, `focal-point`, `overlay` declared in `supports.sgs.mediaElements`); `grep bjectFit` in the DB for this block returns no row |
| Panels | Image, Accessibility, Art direction, Size, Position from the edges, Transform, Shape and border, Layer shadow, Effects, Responsive Overrides (panel titles in `edit.js`, `Layer*Panel.js`) |
| Render | `render.php` (737 lines). Default: the `<img class="sgs-decorative-image sgs-media-el {uid}">` is the block root (naked). Tiers: sibling `<img>`s with compound selectors. Treated mode: a wrapper takes over the root and the `<img>` becomes fill-the-host. Video: delegates to `sgs_render_media()`. Shape applied as `clip-path` on the root |
| Per-device | Source (tablet, mobile files, art direction), width, rotation, position as tier objects; visibility via both `hideOnTablet`/`hideOnMobile` AND the universal `sgsHideOnTablet`/`sgsHideOnMobile`/`sgsHideOnDesktop` (both families present in `block.json`) |
| Effects | `fx.motionSurface: true`; part `image` isWrapper; hover and entrance work |

### (2) Broken, inert or half-built

| Defect | Citation |
|---|---|
| Two hide-per-device toggles on one block (`hideOnTablet`, `hideOnMobile` and the universal `sgsHideOn*`) | `src/blocks/decorative-image/block.json::attributes`; `render.php` reads `$attributes['hideOnTablet']` |
| A shaped layer clips its own box shadow (clip-path on the root) | M section 4 and 21, not re-run |
| `DecorativeImageLayerTest` red at that commit: 5 byte-identity failures (ornament now `loading="eager"` against golden `lazy`) and a test-order dependency on `SGS_Breakpoints` | M section 21; not re-run |
| An ornament is printed eager, which spends bandwidth and priority on a decoration | `render.php` calls `sgs_image_loading_attrs( false )` (M section 9); not re-run |
| `decorMedia` legacy fallback: render synthesises a `decorMedia` from `imageUrl` when only the legacy field is set | `render.php` lines near `$decor_media = $attributes['decorMedia'] ?? null` (comment "For back-compat"); this is the legacy fallback FP-14 forbids on a migrated block |
| Opacity scale differs from `sgs/media` (0 to 100 against 0 to 1) | `block.json::attributes.opacity` on both |

### (3) What changes under Spec 49

Becomes slot `layer` with kinds image and svg and "all but Caption, Link". `decorMedia`, `imageId/Url`, tiers, `imageDecorative` become `layerSource`, `layerAlt`, `layerDecorative`; `shape` becomes `layerShape`; objectFit and objectPosition become Fit and Focal; the clip-path preset list is deleted; the hideOn pair has no row in section 13 (decision needed). Spec 49 FR-49-37 requires position and rotation to stay as the specialised controls.

### (4) End shape

| Part | End shape |
|---|---|
| Attributes | `layerSource`, `layerAlt`, `layerDecorative` (default true), `layerFit`, `layerFocal`, `layerWidth`, `layerMaxWidth`, `layerHeight`, `layerRatio`, `layerOpacity`, `layerShape`, `layerBlend`, radius, border, shadow; unchanged `positionX/Y`, `positionTop/Right/Bottom/Left`, `anchorTo`, `rotation`, `zIndex`, `flipX`, `fadeOnScroll`, `overflow` |
| Panels | Media; Size and crop; Border and shape; Shadow; Position (layer); Transform; Hover; Entrance; Effects |
| Markup | Naked `<img class="sgs-decorative-image sgs-media-el">` as the root, or the helper only for mask shapes, overlay or hover zoom; `<picture>` only for a different phone file |

### (5) Specialised controls that stay

Anchor to parent or section, position from each edge or percentage, rotation per device, z-index, flip, fade on scroll, overflow. These describe a floating layer, not media.

### (6) Over-built or wrong for this block

- Spec section 10.4 lists decorative kinds as "I S", dropping video. This block ships a video branch today (`render.php` "Video branch: when decorMedia is a video, defer to sgs_render_media()"). Not verified: whether any saved block across the five sites uses video (K lists 110 blocks and was not checked for video). Decide before cutover: keep video, or migrate by hand.
- "Settings: all but Caption, Link" gives a floating ornament Order, Alignment, Padding, Background colour, Min width, Max width, Min height, Max height, Greyscale, Blur and Alignment. None of Order, Alignment or Padding act on an absolutely positioned layer. End shape should list only what a layer uses (above).
- The helper-and-mask machinery is of little use here; a layer needs Circle, Pill and corner radius plus its own shadow, which a plain radius plus `overflow:hidden` gives without clipping the shadow.
- Spec 49 section 13 has no row for `hideOnTablet`/`hideOnMobile`. FR-49-6 says slots cannot use whole-block hide toggles, which contradicts keeping `sgsHideOn*` for a layer that is the whole block. Recommend: delete `hideOnTablet/Mobile`, keep the universal `sgsHideOn*` (a decorative image IS a whole block).

## 4. sgs/gallery

### (1) What it has today

| Item | Today (verified) |
|---|---|
| Media attributes | `mediaItems` array of `{id,url,alt,caption,decorative,objectFit (cover or contain),focalPoint {x,y} default 0.5/0.5,linkUrl,linkUrlSource,linkTarget,linkLabel,_key}`; there is no `type` in the schema although `render-tile.php` reads `$img['type']` (not verified in the editor) |
| Block-level | `aspectRatio` "1 / 1" (string), `imageSize` "large", `tileFitContain`, `tileMinHeight`, `scaleHover`, `grayscaleHover`, `shadowHover`, `overlayColourHover` "primary-dark", `sgsObjectFit`, `sgsObjectPosition` object, `sgsHeight`, `captionReveal`, `layout` per device (grid, masonry, scroll, carousel), `columns` per device |
| Panels | Layout, Content, Item tile, Images (`GalleryHoverEffectsPanel` also holds `imageSize` and the hover-zoom and grey-to-colour options) |
| Pickers | Multi-select `MediaUpload` in `edit.js`; per-image raw `FocalPointPicker` in `components/GalleryThumbnail.js`; no `MediaPicker` |
| Render | `render.php` (942 lines) plus `render-tile.php`. Item with an attachment id: `wp_get_attachment_image( $id, $image_size, ... )` (core srcset and sizes), `loading` eager for index below 4 in the lightbox branch and eager for index 0 only inside the first section in `render-tile.php`; item without id or video: `sgs_render_media()`. Lightbox via Interactivity (`actions.openLightbox`) |
| Per-device | Layout and columns only; images, fit and focal are not per device |
| Effects | `fx` draggable, `motionItems`; hover scale and grey-to-colour as block attributes, not motion parts (C) |

### (2) Broken, inert or half-built

| Defect | Citation |
|---|---|
| Three fit controls and three focal shapes: `sgsObjectFit` (extension), per-item `objectFit`, `tileFitContain`; `sgsObjectPosition` object and per-item `focalPoint` | `block.json::attributes`; `render.php` comments on the object-fit atom and `sgsObjectFit` being cleared before the focal call |
| Two different loading rules (index below 4 eager against first-section first image only) | `src/blocks/gallery/render.php` `'loading' => $index < 4 ? 'eager' : 'lazy'` against `src/blocks/gallery/render-tile.php::sgs_gallery_media_html` |
| Hover zoom and grey-to-colour have no motion-part home | `scaleHover`, `grayscaleHover` in `block.json`; C |
| `imageSize` is a typed size dropdown the spec rules out, and it has no migration row | `components/GalleryHoverEffectsPanel.js` (imageSize hasValue); Spec 49 section 2 non-goals; `grep imageSize` in Spec 49 section 13 finds nothing |
| Editor writes `--sgs-hover-scale` as an inline style | `src/blocks/gallery/edit.js` `inlineStyles['--sgs-hover-scale']` (runtime custom property, allowed by Spec 49 section 3 for JS-written values; not an `edit.js` style attribute on the media element) |

### (3) What changes under Spec 49

Slot `item` with settings Source, Fit, Focal, Ratio, Radius, Mask, Loading (section 10.4). Block-level settings use the item prefix as ordinary attributes (`itemRatio`, `itemFit`, `itemRadius`, `itemShape`, `itemLoading`), per-item `source`, `alt`, `decorative`, `fit`, `focal` inside each item object, per-item CSS scope `{uid}-i{index}`, `tier_shape` `slot-array`. `sgsObjectFit`, `sgsObjectPosition`, `scaleHover`, `grayscaleHover` migrate to Fit, Focal and hover effects on the media part (section 13). Panel Images uses `MediaSlotField` per item.

### (4) End shape

| Part | End shape |
|---|---|
| Attributes | `mediaItems[]` of `{source,alt,decorative,fit,focal,caption,link*,_key}`; block-level `itemRatio` (per device), `itemFit`, `itemRadius`, `itemShape`, `itemLoading`; unchanged `layout`, `columns`, `captionReveal`, `tileFitContain` (removed if Fit contain covers it), `tileMinHeight`, scrim and lightbox attributes |
| Panels | Layout; Images (one `MediaSlotField` per item, with Fit and Focal); Item tile; Hover (zoom, grey-to-colour via motion part); Entrance |
| Markup | Per item `<a>` > `<img>` (srcset from WordPress); `<picture>` only if an item gains a per-device file (not in the spec's gallery settings list) |

### (5) Specialised controls that stay

Layout (grid, masonry, scroll, carousel) and columns per device, gallery gap, caption reveal, lightbox, drag reorder, multi-select upload, per-item caption and link, tile min height.

### (6) Over-built or wrong for this block

- Spec section 2 lists "a lightbox" as a non-goal, yet this block ships one (`block.json` keyword "lightbox", `owner .sgs-gallery__lightbox`, `render.php` `actions.openLightbox`). Spec 49 must say "the existing gallery lightbox stays untouched" or the wording invites deletion.
- Section 10.4 lists "Grid, caption reveal" as the gallery's specialised controls and omits masonry, scroll and carousel layouts, lightbox, drag reorder, `tileMinHeight` and per-item link fields; all live attributes today.
- Per-item per-device sources: section 8.3 allows an item `source` to be a responsive value, but the gallery slot list does not ask for it. Do not build it: a gallery tile never needs a different phone file.
- Per-item Mask: a gallery needs one block-level shape for all tiles, not a per-item mask.
- Spec 49 section 7.7 rule 4 (eager up to the desktop column count, at most 8 per page) replaces two inconsistent rules with a third; the gallery would do better with "first section, first row eager" using one resolver. Simplify to one rule.

## 5. sgs/hero (standard background and split media)

### (1) What it has today

| Item | Today (verified) |
|---|---|
| Background attributes | `backgroundImage` object, `backgroundImageTablet`, `backgroundImageMobile`, `backgroundSize` "cover" (cover, contain, auto), `backgroundPosition` "center center" (string), `backgroundRepeat`, `backgroundAttachment` "scroll", `bgVideo`, `bgVideoTablet`, `bgVideoMobile`, `bgSvgContent`, `bgSvgMinHeight`, `bgSvgOpacity`, `bgSvgPosition`, `bgSvgTextShadow`, `bgSvgParts`, `bgSvgPartsTrigger`; overlay `backgroundOverlayColour`, `backgroundOverlayOpacity` `{"desktop":30}`, `overlayGradient`, hover siblings, `backgroundOverlayBlendMode` |
| Split media attributes | `splitMediaType` plus `Tablet`/`Mobile`; `splitMediaImageId/Url/Alt` plus `Tablet`/`Mobile` siblings including per-tier alts; `splitMediaVideoId/Url` tiers; `splitMediaSvgContent` tiers; `splitMediaObjectFit` "cover"; `splitMediaObjectPosition` `{"desktop":"center center","mobile":"center 20%"}`; `splitMediaWidth`, `Align`, `Height`, `AspectRatio`, `MinHeight`, `MaxWidth`, `MaxHeight`, `Shape` "none", radius, border, shadow, padding, `splitMediaBackground`, overlay, `splitMediaDecorative` |
| Panels | Hero Settings, Split image, Split image styling, Background SVG animation, Section (outer), plus the shared `BackgroundPanel` (`hero/edit.js` line mounting `<BackgroundPanel ...>`) |
| Render, standard background | `src/blocks/hero/render.php` prints its own `<img class="sgs-hero__bg-img sgs-hero__background">` via `sgs_responsive_image()` only when no tablet or mobile image is set (`$has_standard_bg_image`), nulls `backgroundImage*` before calling `SGS_Container_Wrapper::render` (`no_background_holder`), prints its own `<video class="sgs-hero__video-bg">` with `data-src-*` swapped by `view.js`, its own overlay (`no_overlay`); with any tablet or mobile image set the image falls to the wrapper's `.{uid}::before` CSS background |
| Render, split | `sgs_tier_media_render()` prints sibling elements per tier in `.sgs-hero__split-media` |
| Per-device | Image tablet and mobile files; video files; split tiers; overlay opacity; split object-position |

### (2) Broken, inert or half-built

| Defect | Citation |
|---|---|
| The Size, Position and Attachment controls do nothing on a plain hero background image: the image is the hero's own `<img>`, `render.php` emits `object-fit`/`object-position` only for `.sgs-hero__video-bg`, the wrapper's `$sgs_bg_img_style_decls` are nulled with `backgroundImage`, and `style.css::.sgs-hero__bg-img` hardcodes `object-fit: cover; object-position: center` | `grep -rn "hero__bg-img\|hero__background" includes src assets` finds `render.php` (class only), `style.css::.sgs-hero__bg-img`, `class-sgs-motion-background-lottie.php`, `class-sgs-container-wrapper.php` comment; DB says `sgs/hero` `backgroundSize`/`backgroundPosition` `css_element` is `video-bg` only |
| Setting any tablet or mobile image moves the WHOLE background, desktop image included, to a CSS background on `::before`: no srcset, no fetch priority, raw full-size URL | `src/blocks/hero/render.php::$has_standard_bg_image`; `includes/class-sgs-container-wrapper.php::$sgs_bg_img_is_simple`; M section 13 (a test enshrines it) |
| Hero duplicates the wrapper's video path by hand ("must be kept in step by hand") | comment above `$has_tablet_src` in `render.php` |
| Hero video prints `<source src=desktop>` with autoplay and no `preload="none"`; the wrapper's container video prints `preload="none"` | `render.php` hero `<video>` `sprintf` against `class-sgs-container-wrapper.php` container video; whether a phone downloads the desktop file before the swap is not verified |
| Background alt is always empty, so a content photograph cannot carry meaning | `render.php` `'alt' => ''`; M section 13 |
| Split media: per-tier alts and flat siblings; `splitMediaObjectPosition` default bakes in a mobile bias `"center 20%"` | DB rows; `block.json` default |
| Mixed loading counters: shared `sgs_next_background_image_index()` for the background image, `sgs_image_loading_attrs()` for the split media and poster | `render.php` |

### (3) What changes under Spec 49

Background becomes slot `background` (context background, kinds I V S) printing `.sgs-bg-media` as a real element in every state, replacing `.sgs-hero__bg-img`, `.sgs-hero__video-bg` and the wrapper's `::before`. Split media becomes slot `split` (context content, kinds I V S, "all but Caption") with column placement kept. Migration rows: `backgroundImage*`/`bgVideo*`/`bgSvg*` to `backgroundSource`; `backgroundSize`/`Position`/`Repeat` to Fit/Focal/Repeat/TileSize; `backgroundAttachment: fixed` to a Pinned effect; `splitMedia*` to `split*`. Hero edit and render go through WP-8 and WP-9.

### (4) End shape

| Part | End shape |
|---|---|
| Attributes | `backgroundSource`, `backgroundFit`, `backgroundFocal`, `backgroundRepeat`, `backgroundTileSize`, `backgroundLoading`, overlay family; `splitSource`, `splitAlt`, `splitDecorative`, `splitFit`, `splitFocal`, `splitRatio`, `splitWidth`, `splitHeight`, limits, `splitShape`/corners, border, shadow, padding, overlay; unchanged `splitContentOrder`, `splitMediaAlign` as column placement |
| Panels | Background (Media, How it fills, Focal, Tile options, Overlay, motion line); Split media (Media, Size and crop, Border and shape, Shadow, Overlay and filters); Effects target Background |
| Markup | `<section> <div class="sgs-bg-media"><picture>or<video>or<svg></div><span class="sgs-bg-overlay"></span> content </section>`; split `<figure><picture><img></picture></figure>` |

### (5) Specialised controls that stay

Split layout controls (column placement, content order, split media alignment, content padding, `mediaPadding`), hero variants, `bgSvgParts` with its trigger and the Background SVG animation panel, shape dividers (separate panel), min height.

### (6) Over-built, wrong or missing in the spec for this block

- Missing from the spec: `bgSvgParts` and `bgSvgPartsTrigger` (named SVG part animation; `class-sgs-container-wrapper.php` prints `data-sgs-svg-parts`; hero panel `Background SVG animation`). Section 8 SVG slot lists only SvgLayer, SvgAnimation, SvgAnimationSpeed, SvgTextShadow, and section 13 maps `bgSvg*` wholesale to `backgroundSource`, which would drop it. `grep -n "svgParts\|SvgParts" .claude/specs/49-SGS-MEDIA-SYSTEM.md` returns nothing.
- `bgSvgOpacity` and `bgSvgMinHeight` have no section 13 row for backgrounds (the min-height row covers media only).
- The hero's draft-driven mobile focal bias `"center 20%"` is a baked framework default; section 8 says an unset Focal writes nothing. Migration should drop the default and keep the value only where saved.
- Spec WP-9 gates the hero on WP-8 (whole wrapper background rewrite). The inert Size/Position fix on the hero image is a small change that could precede it. The simplest end shape removes hero's private `<img>`, video and overlay paths and lets the one background layer serve hero and container; spec does that, but it freezes hero edits "during Stage B and during the wrapper split", which blocks Eye Care finishing work (LEDGER Front F). Flag the sequencing, not the design.

## 6. sgs/container

### (1) What it has today

| Item | Today (verified) |
|---|---|
| Attributes | The same background family as hero (`backgroundImage`, `...Tablet`, `...Mobile`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`, `backgroundAttachment`, `bgVideo` tiers, `bgSvg*`, overlay family). Sizing: `minHeight` tier object, `boxAspectRatio` string, `maxWidth`, `contentWidth`. No `bgSvgParts` |
| Panel | `Background` (`BackgroundPanel.js`, closed by default): Surface tone and Surface (blur, saturate, opacity) where the block declares them; tabs Image (select, art direction, Size cover/contain/auto, Position 9 keyword presets, Repeat, Attachment scroll or fixed), Video (select, art direction, Video sizing via `MediaElementPanel`), SVG (code, position, opacity, text shadow, min height); Overlay colour, gradient, opacity per device, blend |
| Render | `render.php` (316 lines) hands to `SGS_Container_Wrapper::render` (3,842 lines). Plain image (no repeat, cover or contain, scroll, no tier images): real `<img class="sgs-container__image-bg">` through `sgs_responsive_image`, first on page eager and high. Anything else (tile, `auto`, fixed attachment, any tablet or mobile image): `.{uid}::before` CSS `background-image`. Video: `<video class="sgs-container__video-bg" preload="none">`, tiers swapped by `view.js` |
| Per-device | Image tablet and mobile (flat); video tablet and mobile; overlay opacity; min-height |
| Effects | Parts `background` (`.sgs-container__image-bg`), `svg-bg`; no part for background video (C) |

### (2) Broken, inert or half-built

| Defect | Citation |
|---|---|
| Setting any tablet or mobile image sends the whole background to `::before` with no srcset or priority (same defect as hero) | `class-sgs-container-wrapper.php::$sgs_bg_img_is_simple` and its comment promising a migration no spec stage names |
| Fixed attachment ("Fixed (parallax)") is a different, CSS-only path with no `<img>` and is iOS-unreliable | `BG_ATTACHMENT_OPTIONS` in `BackgroundPanel.js`; wrapper `$bg_attachment`; Spec 49 FR-49-29 removes it |
| The motion target is `.sgs-container__image-bg` only when the `<img>` path is taken; on the `::before` path the `background` part has no element | `block.json::elements.background` note; C section 3 |
| Position is a 9-keyword preset dropdown (a string with `preg_replace` stripping), not a focal point | `BackgroundPanel.js` `BG_POSITION_OPTIONS`; wrapper `$bg_position` |
| Wrapper background code is a single 3,842-line class | `wc -l includes/class-sgs-container-wrapper.php` |
| Size `auto` with Repeat none maps to a CSS background, so "Actual size" has no object-fit path | wrapper `$sgs_bg_img_is_simple` |

### (3) What changes under Spec 49

Slot `background`, kinds I V S, settings Source, Fit, Focal, Repeat, TileSize, Overlay, Loading, panel "Background": Media, How it fills, Focal, Tile options, Overlay, motion line. Wrapper background code moves to `includes/class-sgs-background-layer.php` first (WP-0b, no behaviour change). `.sgs-container__image-bg` and root `::before` painting are removed; tiles paint on the `.sgs-bg-media` element. `backgroundAttachment` becomes the Pinned effect; `background` becomes a motion target with `availableWhen`; background video gets a part.

### (4) End shape

Attributes as the hero background set above (`backgroundSource` responsive object, Fit, Focal `{x,y}`, Repeat, TileSize, Loading, overlay family); `minHeight` and `boxAspectRatio` stay as container layout. Panel: Background (Media, How it fills, Focal, Tile options, Overlay, motion line). Markup: `<section class="{uid}"><div class="sgs-bg-media">...</div><span class="sgs-bg-overlay"></span><div class="sgs-container__inner">...</div></section>`.

### (5) Specialised controls that stay

SVG layer settings (layer order, opacity, min height, text shadow); Surface tone, blur, saturate, opacity (see 6); shape dividers; min height and box ratio (layout, not media).

### (6) Over-built, wrong or missing in the spec for this block

- Missing from the spec: Surface tone and Surface (blur, saturate, fill opacity) live in `BackgroundPanel.js` and are read by site-header (`site-header/edit.js` comment: "Blur, saturate and fill opacity live in the shared BackgroundPanel's Surface panel"). Spec 49 section 9.4 Background panel lists only Media, How it fills, Focal, Tile options, Overlay, motion line, so these controls have no home. `grep -n "surfaceTone\|surfaceBlur\|Surface tone" .claude/specs/49-SGS-MEDIA-SYSTEM.md` returns nothing. Keep them in a separate "Surface" panel owned by the wrapper, not by the media system.
- Spec section 7.8 prints `.sgs-bg-media` always. For a container with only a colour or a tile, nothing needs printing; the spec says tile uses the element, so a plain tile costs one div, acceptable.
- Spec section 10.2 parallax overscan table (per-basis, per-side, `lvh`, shrinking toolbar) is the largest piece of arithmetic in the spec, for an effect that today has one control; keep Parallax at strength, direction and per-device on or off, with overscan equal to the travel, and drop the `basis:page` asymmetry unless a draft needs it.
- Section 14 freeze: containers are the most-saved block (2,242 saved, 614 with a background attribute across five sites per K), so cutover risk is here; the AC-25 check "within 1px before and after" is the right gate and must run on all five sites.

## 7. Background-family adopters

Same facts as container (all verified in each `block.json`: the seven wrapper-adopting blocks declare `backgroundImage`, `...Tablet`, `...Mobile`, `bgVideo` tiers, `bgSvg*`, overlay family, `backgroundSize/Position/Repeat/Attachment`; the wrapper reads them and each `edit.js` mounts `BackgroundPanel`). Nothing was run for these blocks beyond reading.

| Block | Container kind | Differences from container | Notes |
|---|---|---|---|
| `sgs/multi-button` | layout | Declares the full background set though it is a button row | `edit.js` mounts `<BackgroundPanel>`; K shows no saved background use (not re-run) |
| `sgs/physics-canvas` | section | `enabledExtensions: ['background']` | Mounts `BackgroundPanel` from `container/components/ContainerWrapperControls` |
| `sgs/site-footer` | section | Adds `surfaceTone`, `surfaceBlur`, `surfaceSaturate` | `edit.js` line mounting `<BackgroundPanel>` |
| `sgs/site-header` | section | Adds `surfaceOpacity`, `backgroundColourScrolled*`; background painting interacts with floating header, `float-preview.js` | Header rows have child rules targeting direct children (spec section 7.1 says to extend them) |
| `sgs/trust-bar` | section | Declares `shapeDividers`; also has its own badge image slot (`badgeImage*`, outside the background family) | Badge is a separate slot (`badge` in section 10.4) |
| `sgs/nav-drawer` | content | Does not use the wrapper or `BackgroundPanel`: own `backgroundImage` object, `backgroundImageDecorative` default true, own `backgroundSize/Position/Repeat/Attachment` and copied option lists (`edit.js` comments "mirrors sgs/container's BackgroundPanel"); `render.php` paints `background-image:url(...)` through its own scoped rule (`$sgs_nd_media_decls`); no tablet or mobile images, no video, no SVG | The only copy of the control; its decorative flag is already the model Spec 49 section 7.8 wants for backgrounds |

Under Spec 49 every one of these adopts slot `background` with the container's panel and markup; nav-drawer gains the shared panel and drops its copy. End shape and specialised controls are the container's, plus: header and footer keep the Surface family; trust bar keeps its badge slot; header keeps `backgroundColourScrolled*`.

Over-built or wrong: section 14.4 puts the wrapper-adopting blocks in one cutover (WP-8). Seven blocks share one panel and one renderer, so the single cutover is justified; the contradiction is only the Surface panel omission above. A background on `sgs/multi-button` is a control no cloned draft exercises (K: not re-checked); keeping it costs nothing once the wrapper owns it.

## 8. Contradictions and gaps in Spec 49 found while auditing these blocks (summary)

| # | Finding | Where |
|---|---|---|
| 1 | Surface tone, blur, saturate, fill opacity are not in the Background panel list or the migration table | Spec 49 sections 9.4, 13; `BackgroundPanel.js`; `site-header/edit.js` |
| 2 | `bgSvgParts`, `bgSvgPartsTrigger`, `bgSvgOpacity`, `bgSvgMinHeight` have no destination | Spec 49 sections 8, 13; `class-sgs-container-wrapper.php` (`data-sgs-svg-parts`) |
| 3 | A lightbox is a stated non-goal but the gallery ships one; gallery layouts, lightbox, drag reorder and tile settings are missing from section 10.4's gallery row | `gallery/block.json`, `gallery/render.php` |
| 4 | Decorative kinds "I S" drop the video branch that exists today | `decorative-image/render.php` video branch |
| 5 | `imageSize` (gallery) and `hideOnTablet`/`hideOnMobile` (decorative-image) have no migration row | Spec 49 section 13 |
| 6 | FR-49-6 forbids whole-block hide toggles for slots, but a decorative image is a whole block that keeps `sgsHideOn*` | Spec 49 FR-49-6 |
| 7 | Hero's standard Size, Position and Attachment controls are inert today, so the migration "within 1px before and after" check will pass on a value that never rendered; AC-25 should note that those hero images currently ignore focal | `hero/render.php`, `hero/style.css::.sgs-hero__bg-img` |
| 8 | Derived `sizes` parser, twelve mask shapes with uploads, SVG border stroke layer and the parallax overscan table are the three heaviest parts and none is needed for the goal of cloning any draft; recommended cuts are in each block's section 6 | Spec 49 sections 7.5, 7.6, 10.2 |

## 9. Not verified

- Whether the second `sgs_image_loading_attrs()` call in `sgs/media` gives two images a high-priority claim.
- Whether any saved `sgs/decorative-image` uses video, and whether any hero or container saved block carries a `backgroundSize: auto` with repeat that Tile must reproduce (K lists counts, not those values).
- Panel contents of `sgs/media`, gallery and decorative-image beyond panel titles and B/C/L/M (editor behaviour was not opened).
- Whether `sgs/mega-panel`'s `accentBackgroundImage` is a media slot that Spec 49 should list.
- Test status (`DecorativeImageLayerTest`, `HeroBackgroundTiersTest`): taken from M, not run.
