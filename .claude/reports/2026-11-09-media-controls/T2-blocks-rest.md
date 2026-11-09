# T2 Every media block outside T1: census, per-block change under Spec 49, saved use

Worktree `E:/sgs-tmp/wt-media`, read-only except this file. Spec 49 v0.4 read in full. Citations are `path::symbol`, paths under `plugins/sgs-blocks/` unless stated. Claims marked "not verified" were not opened.

## Part A. Census

Found by: (1) every `block.json` in the worktree (374 files; 100 are real blocks in `src/blocks/`, the rest are gate test fixtures such as `sgs/image-no-decorative-toggle`, which I excluded); (2) a name filter on attributes (url, id, alt, poster, thumb, logo, photo, image, video, background, media, avatar, svg, embed, frames); (3) a per-block grep of `render.php`, `*.js` and `save.js` for `<img`, `<video`, `<iframe`, `<audio`, `wp_get_attachment*`, `sgs_render_media`, `sgs_tier_media_render`, `sgs_responsive_image`, `SGS_Media_Element`, `MediaUpload`, `MediaPicker`, `BackgroundPanel`, `background-image`; (4) the framework DB `block_attributes` with the same name words. No other plugin or the theme registers a block: `grep -rlE "register_block_type|MediaUpload|<img|<video|<iframe|wp_get_attachment_image|background-image"` over `sgs-booking`, `sgs-accessibility`, `sgs-configurator-pro`, `sgs-client-notes` and `theme/sgs-theme` found only `theme/sgs-theme/functions.php` and `inc/font-preloading.php` (the preload emitters FR-49-15 removes) and `sgs-client-notes/assets/js/comment-panel.js` (a notes UI, not a block). Pure icon pickers excluded: `iconSvg`, `icon` and `chromeLogoInlineSvg`-style attributes on `sgs/icon`, `sgs/button`, `sgs/social-icons`, `sgs/icon-list`, `sgs/pricing-table`, `sgs/process-steps`, `sgs/notice-banner`, `sgs/wishlist-link`, `sgs/trust-bar` item icons, `sgs/cart` `iconSvg`. Blocks whose only hit was `*Background` colour attributes (accordion, form, modal, tabs and similar) are not media.

Count: 42 blocks. 11 are T1 (`sgs/media`, `sgs/decorative-image`, `sgs/gallery`, `sgs/hero`, `sgs/container` and the six more that mount the shared `BackgroundPanel`: `sgs/multi-button`, `sgs/nav-drawer`, `sgs/physics-canvas`, `sgs/site-footer`, `sgs/site-header`, `sgs/trust-bar`). 31 are mine, of which 4 only show fixed plugin or brand artwork (no user media).

BackgroundPanel mounts, by `grep -rl BackgroundPanel src --include=*.js`: container, hero, multi-button, nav-drawer, physics-canvas, site-footer, site-header, trust-bar (plus `site-header/float-preview.js`). The same eight carry `backgroundImage`/`bgVideo` in `block.json`. `SGS_Container_Wrapper` only paints a background when those attributes exist (`includes/class-sgs-container-wrapper.php` reads `$attributes['backgroundImage']`, `['bgVideo']`), so no other block gets a wrapper background.

| Block | How found | Owner |
|---|---|---|
| sgs/media, decorative-image, gallery, hero, container | attributes, controls, render | T1 |
| sgs/multi-button, physics-canvas, site-footer, site-header | BackgroundPanel mount, `backgroundImage`/`bgVideo`, DB | T1 |
| sgs/nav-drawer: background | BackgroundPanel mount (`edit.js`), `render.php` own `::before` paint | T1 (its `chromeLogo*` slot is mine, below) |
| sgs/trust-bar: background | BackgroundPanel mount (`edit.js`), `bgVideo` | T1 (its `badgeImage*` slot is mine, below) |
| sgs/before-after | attributes (`before*`/`after*` Image, Video, Svg, tiers), `MediaUpload`, `media-render.php`, `<img`/`<video` | mine |
| sgs/brand-strip | `logos[].media`, `MediaPicker`, `sgs_render_media` | mine |
| sgs/buybox | `gallery-col.php` `<img>`, `previewImageId`, `ConfiguratorPanel.js` `MediaUpload`, `configurator.php` `wp_get_attachment_image` | mine |
| sgs/card-grid | `items[].media`, `ItemEditor.js` `MediaPicker` + `FocalPointPicker`, `sgs_render_media`, `glyph-fallback.php` `<img>` | mine |
| sgs/product-card | `image*` attributes, `edit.js` `MediaUpload`, `render.php` `<img>` x several | mine |
| sgs/post-grid | `imageSize`, `showImage`, featured image `<img class=sgs-post-grid__img>` | mine |
| sgs/team-member | `photo*`, `MediaPicker`, `sgs_render_media` | mine |
| sgs/testimonial | `avatarMedia`, `orgLogo`, `workMedia`, tiers, `sgs_render_media` | mine |
| sgs/timeline | `<img>` via `sgs_tier_media_render`, `edit.js` `MediaUpload`, `milestoneMedia*` | mine |
| sgs/responsive-logo | `logoId/Url` + tiers, `darkLogoId`, `inlineSvg`, `svgParts`, hand-rolled `<img>`/`<picture>` | mine |
| sgs/nav-drawer: chrome logo | `chromeLogo*`, `ChromePanel.js` `MediaUpload`, `ChromePreview.js` `<img>` | mine |
| sgs/trust-bar: badge images | `badgeImage*`, `render.php` `<img class=sgs-trust-bar__badge-img>`, `items[].image`-style items | mine |
| sgs/choice-flow | `headerLogo`, `optionMediaSize`, `ChromePanel.js` `MediaUpload`, `summary.js` builds `<img>` | mine |
| sgs/choice-flow-question | option images `render.php` `<img>`, `edit.js` `MediaUpload`/`MediaPicker` | mine |
| sgs/option-picker | `optionItems[].image`, swatch `<img>` via `wp_get_attachment_image_src` | mine |
| sgs/form-field-tiles | `tiles[].image`, `render.php` `<img>`, `MediaPicker` | mine |
| sgs/google-reviews | avatar `<img>`, card logo, `render-interior.php` | mine (remote avatars and plugin-asset logos) |
| sgs/image-sequence | `thumbnail` + tiers, `desktopFramesUrl/tabletFramesUrl/mobileFramesUrl`, `sgs_responsive_image` | mine |
| sgs/measured-diagram | `drawingImage*`, `MediaPicker`, `<img>` | mine |
| sgs/audio | `audioUrl`, `<audio>`, `MediaUpload` | mine (audio, not a picture; see Part B) |
| sgs/business-info | map `<iframe>` at `business-info/render.php` case `'map'` | mine |
| sgs/cart | `item-row-template.js` builds `<img>`, `itemThumb*`, `SGS_Media_Element::style` | mine (JS-built thumbnails) |
| sgs/wishlist-panel | `render-rows.js` builds `<img class="... sgs-media-el">` | mine (JS-built thumbnails) |
| sgs/product-search | `view.js` creates `<img>` from `result.thumbnail` | mine (JS-built thumbnails) |
| sgs/nav-drawer-menu | `itemMedia` (`featured-image`), `RowExtrasPanel.js`, `includes/nav-drawer-menu-items.php`, `includes/nav-drawer-menu-extras-css.php` | mine |
| sgs/mega-panel | `drawerCardMediaRatio/Height`, `drawerCardThumbSize`, `includes/mega-panel-drawer-extras-css.php` | mine |
| sgs/store-selector | `flagUrl` `<img class=sgs-store-selector__flag>`, `edit.js` `MediaUpload` | mine |
| sgs/google-rating-badge | `<img class=...__logo>` from plugin asset | mine (fixed artwork) |
| sgs/star-rating | `<img class=sgs-star-rating__tp-badge>` | mine (fixed artwork) |
| sgs/trustpilot-reviews | several `<img>` from plugin assets | mine (fixed artwork) |
| sgs/account | `orderThumbsFlexWrap` only; no `<img` in its own files | mine (layout setting for Woo thumbs; not verified where the `<img>` is printed) |

Checked and not media: `sgs/info-box` (its `render.php` header says legacy media attributes were removed and real media lives in child `sgs/media`/`sgs/icon` blocks; DB shows no media attribute), `sgs/mega-aside` (no `<img`, only CSS), `sgs/mega-panel` `accentBackgroundImage` (default `"accent"`, a token name, not an image; not opened further), `sgs/form` file fields (uploads, not display).

## Part B. Blocks I own

Common facts that apply to nearly every row (opened once): every owned block with media declares `supports.sgs.mediaElements` with only `object-fit` (some add `focal-point`): before-after, product-card main, testimonial work also `focal-point`. The atoms register is one of the four control layers Spec 49 replaces. Rendering is five different paths: `sgs_render_media`/`sgs_tier_media_render` (brand-strip, team-member, testimonial, timeline, card-grid), `sgs_responsive_image` (image-sequence), hand-written `<img>` (buybox, product-card, choice-flow-question, form-field-tiles, measured-diagram, option-picker, responsive-logo, trust-bar, google-reviews, nav-drawer), JS-built (cart, wishlist-panel, product-search, choice-flow summary) and WordPress core `wp_get_attachment_image*` (buybox configurator, option-picker).

### B1. sgs/before-after

1. Today: per-side flat attributes `beforeImageId/Url/Alt/Decorative`, `afterImage*`, `*Video*`, `*SvgContent`, `*MediaType` enum default `image`, flat tiers `beforeImageIdTablet/UrlTablet/Mobile` (and after), `videoAutoplay` plus `videoAutoplayTablet/Mobile`, `startPosition` (50). Controls: `edit.js` raw `MediaUpload`; mediaElements `before`/`after` with `object-fit`, `focal-point`. Render: `media-render.php` + `render.php`, `<img>`/`<video>`.
2. Broken/inert: flat tier pairs (the shape FR-49-2 bans); two alt values per side across kinds (`beforeImageAlt`, `beforeVideoAlt`). Per-device focal: not verified.
3. Changes: slots `before` and `after` (context content, kinds I V S); `*Source` responsive objects; one Alt/Decorative per side; Fit, Focal, Height, Width, Radius per §10.4; flat tier and `*MediaType` attributes migrated by §13 rows.
4. End shape: `beforeSource`, `afterSource` (R object), `beforeAlt/afterAlt`, `beforeDecorative/afterDecorative`, `beforeFit/Focal`, `afterFit/Focal`, shared Height, Width, Radius; `startPosition` and divider settings unchanged; `<picture>`/`<img>` through the renderer on each side.
5. Specialised that stays: the divider and `startPosition` (the interaction), `videoAutoplay` folds into `Playback` on each side.
6. Over-built: duplicating per-side Width and Height (one pair, both sides share a frame, is simpler: not verified that sides ever differ in saved content; none saved, see Part C). §10.4 lists it correctly.

### B2. sgs/brand-strip

1. Today: `logos[]` items with `media` object `{url,type,id,alt,mime,...}`, `logoLayout` (tiles|row), `tileShape` (square|circle|none), `logoFit` (contain), `logoMaxWidth`, `logoOpacity`, `imageEffect` (string, default `none`), `tileShadow`, `brandMaxItems`. Controls: `MediaPicker` per item. Render: `render.php` calls `sgs_render_media( $media, 'sgs/brand-strip' )` then edits the HTML with `preg_replace` on `<img` to add a class and `aria-hidden` (`brand-strip/render.php`, near `sgs_render_media`).
2. Broken: string surgery on rendered markup (the `<img>` regex) rather than passing options; `tileShape` is a fourth shape vocabulary; `imageEffect` meaning not verified.
3. Changes: slot prefix `logo`, context item, kinds I S; block-level Fit/Ratio/Radius/Mask/Loading; item values `source/alt/decorative`.
4. End shape: block `logoFit` stays as the item Fit; `tileShape` replaced by Shape; per-item `source` inside `logos[]`; strip items never lead-image.
5. Stays: marquee/row layout and gap, `logoOpacity`, `logoMaxWidth` (brand strips need a common logo height or width).
6. Over-built: §10.4 lists "Source, Fit" which also drops Radius/Shape that the block has today (`tileShape`); say Source, Fit, Radius, Shape. `imageEffect` needs a decision (greyscale-to-colour is Hover panel work per §8 note).

### B3. sgs/buybox

1. Today: no per-item media attributes on the block; gallery comes from the WooCommerce product. Block attributes: `previewImageId` (integer 0), `mainPhotoRadius/BorderWidth/BorderStyle/Shadow/BackgroundColour`, `galleryThumbSize`, `galleryThumbBorder*`, `thumbGap`, `thumbsPerRow`, `thumbSelectedScale`, `thumbStripOffset`, `galleryStickerShape` (enum rounded...), `galleryStickerDecorative`, `galleryColumnRatio`. mediaElements `main`, `thumb` with `object-fit`. Render: `buybox/gallery-col.php` hand-writes the main `<img>` (loading from `sgs_image_loading_attrs()`, `data-wp-bind--src`) and each thumb `<img>` with `loading="lazy"` hard-coded; `configurator.php` uses `wp_get_attachment_image( $image_id, 'large' ...)` for picker previews; `ConfiguratorPanel.js` raw `MediaUpload`.
2. Broken/half-built: thumbnails always lazy, no focal; the main image's width/height come from the first gallery item only (`gallery-col.php`, "Resolve width/height from the first gallery item"), so other gallery images with other proportions reserve the wrong space.
3. Changes: slot `main` and item-set slot `thumb`, kinds I featured; Source/Fit/Focal/Ratio/Radius/Loading only (§10.4 row). `galleryStickerShape` becomes Shape or Corners (§13 row).
4. End shape: `mainFit/mainFocal/mainRatio/mainRadius`, `thumbFit/thumbRadius`, loading by §7.7 (main eager lead candidate when in the first section).
5. Stays: swatch/thumb strip layout, `thumbSelectedScale`, sticker text and position, colour swap on option pick (the `data-wp-bind` swap is why this stays specialised).
6. Over-built: a mask on thumbnails (not in §10.4's list, correctly omitted). Wrong/missing in §10.4: `previewImageId` (configurator picker preview image) is a media slot the table does not name.

### B4. sgs/card-grid

1. Today: `items[].media` has three accepted shapes (string URL, object `{url,type,id,alt,mime,width,height}`, null; `card-grid/block.json::attributes.items` note D1027), per-item `focalPoint` `{x,y}` set by a raw `FocalPointPicker` in `components/ItemEditor.js`; block `aspectRatio` (string `16 / 9`), `imageHeight`, `imagePadding` (R objects), `imageFallback`, `noImageLabel*`. Supports `imageControls: true` with `imageControlsExplicit`. Render: `render-items.php` calls `sgs_render_media`; `glyph-fallback.php` hand-writes an `<img>`; `render-card-css.php` calls `SGS_Media_Element::style`.
2. Broken: focal is a separate `{x,y}` in an item property while the atom/extension write CSS strings (C lists five focal shapes); the string-or-object media shape needs an `anyOf` workaround.
3. Changes: slot prefix `image`, context item, kinds I featured; block-level Ratio/Fit/Radius/Mask/Loading; item `source/alt/decorative/fit/focal`. `imageControls` extension flag removed.
4. End shape: item-set slot per §8.3; `imageRatio` replaces `aspectRatio`; `imageHeight` becomes Height (R); per-item Focal as `{x,y}` (already that shape).
5. Stays: `imageFallback` + `noImageLabel` (empty-state text for a missing photo: a product grid needs it), grid layout.
6. Over-built: `imagePadding` on an item image is not in §10.4's list (card padding belongs to the card); decide before migration. Saved use: 26 blocks (Part C).

### B5. sgs/product-card

1. Today: `image` (string URL), `imageId`, `imageAlt`, `imageDecorative`, `imageSize` (enum "", thumbnail, medium, medium_large, large, full), `imageAspectRatio` (enum of eight), `imageFill` (boolean), `imageHeight` (string), `mediaBackgroundColour`, `showGalleryThumbs`, brand logo sizes (`brandUseLogo`, `brandLogo*`). Controls: `edit.js` raw `MediaUpload`, `components/media/ProductCardImagePanelLayout.js` (uses `FocalPointPicker`). Render: `render.php` hand-written `<img>` x3 plus bound product image via `wp_get_attachment_image_src( $id, 'full' )`.
2. Broken/overlapping: `imageFill` plus `imageAspectRatio` plus `imageHeight` are three sizing controls with no resolved order (the spec's §7.2 is the fix); `imageSize` dropdown is a typed size selector that Spec 49 §2 rules out.
3. Changes: slot `image` and `thumb`, kinds I featured; `imageSize` removed (derived sizes), `imageFill` becomes Height Fill, `imageAspectRatio` becomes Ratio (enum becomes the chip set), `mediaBackgroundColour` becomes Background.
4. End shape: `imageSource` (R object, `featured` kind default), `imageAlt`, `imageDecorative`, `imageFit/Focal/Ratio/Height/Radius/Loading`; `thumb*` Source/Fit.
5. Stays: swatch colour-swap on the photo (WooCommerce variation images), brand logo sizing (a logo, not a content image; arguably a second slot `logo`).
6. Wrong in §10.4: listed with `thumb`, but the brand logo (`brandLogo*`) is a second image slot the table omits.

### B6. sgs/post-grid

1. Today: `showImage` (true), `imageSize` (`medium_large`), `imageDecorative`, `aspectRatio` (`16 / 9`), `imageHeight` (R). Render: featured-image `<img class="sgs-post-grid__img sgs-media-el {uid}">` with a regex in `render.php` (`sgs-post-grid__img` pattern, adds `alt=""` and `aria-hidden`); `render-scoped-css.php` calls `SGS_Media_Element::style( ..., array( 'object-fit' ) )`.
2. Broken: markup surgery by regex on `<img`; no focal; `imageSize` typed dropdown.
3. Changes: prefix `image`, kinds I featured; block-level Source=featured, Fit, Focal, Ratio, Radius, Loading.
4. End shape: `imageFit/Focal/Ratio/Height/Radius/Loading`; `showImage` kept; `imageSize` deleted.
5. Stays: `showImage` toggle, grid layout.
6. Nothing over-built. `imageDecorative` becomes the standard Decorative.

### B7. sgs/team-member

1. Today: `photo` (object), `photoTablet`, `photoMobile`, `photoDecorative`, `photoShape` (default `circle`). Supports `imageControls: true`, mediaElements `sgs` `object-fit`. Render: `sgs_render_media( $media_for_render, 'sgs/team-member' )` plus manual `<source>` handling (`team-member/render.php`).
2. Broken: hand-built `<source>` tiers around the helper's `<img>`; `photoShape` string is the old shape vocabulary.
3. Changes: slot `photo`, kinds I; Source, Fit, Focal, Radius, Mask. Tier objects folded into `photoSource` R. `photoShape` becomes Shape (`circle` default becomes Shape Circle plus Ratio 1:1 as one step).
4. End shape: `photoSource`, `photoAlt`, `photoDecorative`, `photoFit/Focal/Shape/Radius`.
5. Stays: nothing specialised except layout (card layout controls).
6. Saved use: 10 instances, all sandybrown, `photo` object (obj{id,url}) x8, `photoShape` `square` x7; `photo` has no §13 row (Part C3).

### B8. sgs/testimonial

1. Today: `avatarMedia`, `avatarMediaTablet/Mobile`, `orgLogo`, `workMedia`, each with a `*Decorative` flag. mediaElements `avatar` (`object-fit`), `work` (`object-fit`, `focal-point`). Render: four `sgs_render_media` calls (avatar, tiers, org logo, work media) with comments that `sgs_render_media` "takes no class argument" (`testimonial/render.php`).
2. Broken: only the avatar has tiers; `orgLogo` has no mediaElements entry, so it has no Fit control while §10.4 gives logo/work Source and Fit.
3. Changes: slots `avatar`/`photo`, `logo`, `work` (context content, kinds I); migrate tiers.
4. End shape: `avatarSource` (R), `logoSource`, `workSource` with Alt/Decorative each; Fit; avatar Radius or Shape.
5. Stays: nothing media-specific.
6. Over-built: `work` Focal is probably the only exception to "Source, Fit" for logo/work; §10.4 gives `work` no Focal while the block has it today. Decide to keep (cheap) or drop.

### B9. sgs/timeline

1. Today: `milestoneMediaWidth` ("180px"), `milestoneMediaDecorative`, `mediaHeight` (R), `mediaAspectRatio` (R object), `mediaBorderRadius` (R). No `mediaElements` or `imageControls` declared (supports.sgs keys only `fx`, `elements`). Items hold the media; render uses `wp_get_attachment_image_src( $id, 'large' )` then `sgs_tier_media_render` (`timeline/render.php`).
2. Broken: no Fit or Focal control at all though Ratio crops (a crop with no way to move it); width and height controls with their own shapes.
3. Changes: slot `entry`, context content, kinds I V; Source, Fit, Focal, Ratio, Radius.
4. End shape: `entryFit/Focal/Ratio/Radius` plus per-item `source`; `milestoneMediaWidth` becomes Width.
5. Stays: none.
6. §10.4 lists the right controls; it is the only row where "add Fit/Focal" is a new control rather than a rehome.

### B10. sgs/responsive-logo

1. Today: `logoId/logoUrl` plus `logoIdTablet/UrlTablet/Mobile`, `logoSwitchMode` (enum default `mobile`) plus `logoSwitchCustomPx` (1024), `darkLogoId`, `inlineSvg`, `svgParts[]`, `svgPartsTrigger`, `svgPartsHoverCooldown`, `alt`, `logoDecorative`. Render: hand-written `<picture>` with `<source media="SGS_Breakpoints::query(...)">` and `<img ... loading="eager">` repeated five times (`responsive-logo/render.php`, the `printf` blocks); inline SVG path through `sgs_svg_sanitise_document`. Controls: `edit.js` raw `MediaUpload`.
2. Broken/conflicting: `logoSwitchCustomPx` lets the author pick a breakpoint that is not in `SGS_Breakpoints`, which FR-49-8 forbids ("queries from `SGS_Breakpoints`"); `loading="eager"` is hard-coded in every copy instead of the §7.7 resolver.
3. Changes: slot `logo`, kinds I S; Source (R), Width, Loading; flat tiers migrate to `logoSource`; dark logo stays a second source.
4. End shape: `logoSource` (R), `logoDarkSource`, `logoWidth`, `logoLoading`, Alt/Decorative; `<picture>` from the renderer.
5. Stays: `inlineSvg` plus `svgParts*` (draw-on animation needs the SVG inline), dark source.
6. Missing from §10.4: `logoSwitchMode`/`logoSwitchCustomPx` (needs a decision: drop the custom pixel value, keep a device choice) and the inline-SVG draw animation. Saved use: 63 instances (sandybrown 46), `logoId` 12, `logoUrl` 9, `inlineSvg` 2, `svgParts*` 2, none of them with a §13 row (Part C3).

### B11. sgs/trust-bar: badge images (background is T1)

1. Today: `badgeImageSize` (60), `badgeImageObjectFit` (enum, default `contain`), `badgeImageBorderRadius`, `badgeImageShadow`, item images in `items[]`. mediaElements prefix `badgeImage` `object-fit`. Render: `<img src alt class="sgs-trust-bar__badge-img" loading="lazy" />` printed with `sprintf` (`trust-bar/render.php`, image-badge branch).
2. Broken: `loading="lazy"` hard-coded, no width/height printed at that line (reserved space not verified); own `badgeImageObjectFit` enum parallel to the atom.
3. Changes: item slot `badge`, kinds I; Source, Fit, Radius; shadow stays on the item.
4. End shape: `badgeFit/Radius`, `badgeSize` becomes Width, per-item `source`.
5. Stays: `badgeImageSize` as the single square size.
6. Fine against §10.4.

### B12. sgs/nav-drawer: chrome logo (background is T1)

1. Today: `chromeLogoId/Url/Alt/Link/Width/Show`, `chromeLogoInlineSvg`, `chromeLogoSvgParts*`, `chromeLogoBox*` (background, radius, padding, shadow). `ChromePanel.js` raw `MediaUpload` and `ChromePreview.js` `<img>`. The drawer also paints its own background in `render.php` (`::before` with `background-image:url(`), a copy of the container's contract.
2. Broken: the drawer's `::before` background is a copy of what §7.8 replaces with `.sgs-bg-media`; it is T1's to adopt, not mine. The chrome logo duplicates `sgs/responsive-logo`'s inline-SVG path.
3. Changes: `chromeLogo` becomes a slot `logo` (kinds I S) using the same `logoSource` shape as responsive-logo.
4. End shape: `chromeLogoSource`, `chromeLogoWidth` (R, already), box settings stay; reuse responsive-logo's renderer.
5. Stays: box settings and the inline-SVG parts.
6. Missing from §10.4 as a logo slot; the table lists nav-drawer only under backgrounds.

### B13. sgs/choice-flow and sgs/choice-flow-question

1. Today: choice-flow `headerLogo` (object default `{}`), `headerLogoHeight` (32), `summaryShowImage`, `optionMediaSize` (R object); question `optionMediaSize`; option images printed in `choice-flow-question/render.php` with `echo '<img src=...' . sgs_image_size_attrs(...)`; `summary.js` creates `<img>` elements at runtime. Controls: `ChromePanel.js` and question `edit.js` use `MediaUpload`/`MediaPicker`.
2. Broken: hand-written `echo '<img'` with no loading rules; the summary image is built in JS from `src`.
3. Changes: option slot `option` (context item, kinds I): Source, Fit, Focal. `headerLogo` becomes a `logo` slot.
4. End shape: per-option `source/alt/decorative/fit/focal` inside the option object; `optionMediaSize` becomes Width or Height R.
5. Stays: "Set by flow fit" (the flow decides crop for all options).
6. §10.4 lists the option row only; `headerLogo` and the summary image (JS) are not listed. Saved use: choice-flow 12 and choice-flow-question 26 instances; only `headerLogo` (1), `headerLogoHeight` (2) and `optionMediaSize` (2) set, all without §13 rows (Part C3).

### B14. sgs/option-picker, sgs/form-field-tiles

1. option-picker: `optionItems[].image` (URL string forwarded by a caller), swatch `<img>` printed with `sprintf` or `wp_get_attachment_image_src( $image_id, sgs_option_picker_tile_image_size(...) )` (`option-picker/render.php`); mediaElements `swatch` `object-fit`; `swatchShape` (enum). form-field-tiles: `tiles[].image` (string), `render.php` `<img class="sgs-form-tile__image" ... alt="" aria-hidden="true" loading="lazy">`, `MediaPicker`, `imageControls: false`.
2. Broken: images are bare URL strings (no id, no width/height, no alt) so the renderer cannot size them (FR-49-16 says a source with no id needs width and height).
3. Changes: item slots `swatch` and `tile`, kinds I; Source, Fit.
4. End shape: per-item `source` object; Shape for swatch (replaces `swatchShape`).
5. Stays: nothing.
6. form-field-tiles is not in §10.4 (it has `imageControls: false` and an image per tile); add it. Saved use: option-picker 4 (sandybrown only) and form-field-tiles 10 (indus 9, mamas 1) instances, none setting a media-named attribute at block level (items not opened).

### B15. sgs/google-reviews

1. Today: avatar `<img>` per review from Google's returned URL, card logo and star images from plugin `assets/` (`render-interior.php`); `avatarSize`, `avatarBorderRadius`, `showCardLogo`, `cardLogoSize`. mediaElements `''` `object-fit`; `imageControls: false`.
2. Broken: none against the goal. Remote Google avatar URLs cannot have a width/height attachment record.
3. Changes: avatar becomes an item slot `avatar` (Fit, Radius) with a remote-URL source allowed; logo is fixed artwork.
4. End shape: `avatarFit/Radius/Size` only.
5. Stays: everything Google-specific (Google colours and UI, per memory `google-reviews-follows-googles-ui`).
6. Spec gap: FR-49-16 requires width and height for an id-less source; Google avatars need a fixed-size exception. §10.4 does not list this block.

### B16. sgs/image-sequence

1. Today: `thumbnail`, `thumbnailTablet`, `thumbnailMobile` (objects, default null), `thumbnailAlt`, `thumbnailDecorative`, `desktopFramesUrl/tabletFramesUrl/mobileFramesUrl` (frame set URLs), `aspectRatio` enum (`16 / 9`). Render: `sgs_responsive_image` for the fail-open thumbnail; a canvas for the frames.
2. Broken: flat tier objects; the frames URLs are a different kind of media (a scrubbed sequence, not a picture).
3. Changes: thumbnail becomes a slot `thumbnail` (kinds I): `thumbnailSource` R, Fit, Ratio. Frame URLs stay as the block's own setting.
4. End shape: `thumbnailSource` (R), Alt/Decorative, `thumbnailFit`, `thumbnailRatio` (replaces `aspectRatio`).
5. Stays: frame sources (no equivalent in the spec).
6. §10.4 lumps it with "Source, Fit"; Ratio is needed because `aspectRatio` exists today.

### B17. sgs/measured-diagram

1. Today: `drawingImageId`, `drawingImageUrl`, `drawingImageAlt`, `drawingImageDecorative`, `drawingImageWidth`, `drawingImageHeight` (the width and height are measurement overlay data, not display sizes). mediaElements `drawing` with atoms `intrinsic`, `meaning`. Render: `<img class=... loading="lazy" decoding="async">` inside a frame with SVG gradient defs (`measured-diagram/render.php`).
2. Broken: not verified. It is a drawing with overlay dimension lines, so the image must keep its intrinsic ratio.
3. Changes: slot `drawing` (kinds I S), Source only; no Fit, Focal, Radius, Mask (a crop would break the measurement overlay).
4. End shape: `drawingSource`, `drawingAlt`, `drawingDecorative`; `drawingImageWidth/Height` stay as non-media measurement attributes.
5. Stays: intrinsic sizing, measurement overlay.
6. Missing from §10.4. It is a case where "settings: Source only" is correct and Fit must be omitted by the rule table.

### B18. sgs/audio

1. Today: `audioUrl`, a native `<audio controls>` plus JS player (`audio/render.php`, `edit.js` `MediaUpload`). No image.
2. Broken: none; it is an audio file.
3. Changes: not in Spec 49's kinds (image, video, embed, svg). Not adopted.
4. End shape: unchanged. Left on `MediaUpload`, so FR-49-26's gate ("refuses raw `MediaUpload` elsewhere") will fail on it: either allow audio in `MediaSlotField` (a kind `audio`) or allow-list it.
5. Stays: everything.
6. Missing from §10.4 and from FR-49-26.

### B19. sgs/business-info (map embed)

1. Today: `case 'map'` prints `<iframe src=... width="100%" height="400" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title=...>` built by `sgs_business_info_map_url`, zoom via `sgs_business_info_map_zoom`; address comes from `Sgs_Site_Info`. Not a user-picked embed.
2. Conflicts: FR-49-17 accepts only `youtube-nocookie.com` and `player.vimeo.com` and says the renderer prints no `width`/`height` on an iframe; this block prints both and is a Google Maps embed. If the embed sanitiser is applied to it, the map disappears.
3. Changes: either list it in §10.4 as an embed slot with a maps allow-list (host `www.google.com/maps/embed`) or leave it as a separate, documented non-slot.
4. End shape (recommended): leave as is; change `width`/`height` attributes to CSS (`width:100%; aspect-ratio` or the block's height) so it follows the embed rule; not through `MediaSlotField`.
5. Stays: the address and zoom controls.
6. Missing from §10.4; saved use is large (124 instances: sandybrown 48, indus 23, ec-clone 16, mamas 17, ec-test 20) and none sets an old media attribute (only `mapSource`, `mapZoom`, `mapHeight`, `mapFilter`, which stay).

### B20. Cart, wishlist-panel, product-search (JS-built thumbnails)

1. cart: `itemThumbSize` (R), `itemThumbRadius`, `itemThumbBg`, brand logo size via `item-row-template.js` `<img class="sgs-cart__item-thumb sgs-media-el">` and `render-scoped-css.php` calling `SGS_Media_Element::style(..., 'object-fit')`. wishlist-panel: `render-rows.js` prints the same markup with no media attributes and no `mediaElements`. product-search: `view.js` creates `<img>` from `result.thumbnail`; `render.php` `SGS_Media_Element::style`.
2. Broken: these print images client-side from store data; a PHP renderer cannot print them (FR-49-7 "SGS_Media_Renderer MUST print all slots"). The `sgs-media-el` class is the only link.
3. Changes: they keep their size/radius/fit as block settings and use the shared emitter for scoped CSS only; they do not use `MediaSlotField` (the source is the product).
4. End shape: `itemThumbFit/Radius/Size` rehomed to the media settings; markup stays JS-built with `class="sgs-media-el"` and explicit width/height.
5. Stays: JS rendering (data arrives at runtime).
6. §10.4's "cart thumbnails, product search" rows are right; wishlist-panel is missing; the spec needs a sentence that these use the emitter and a JS-built `<img>`, not the PHP renderer.

### B21. sgs/nav-drawer-menu and sgs/mega-panel

1. nav-drawer-menu: `itemMedia` (enum `""|featured-image`), `itemMediaReveal`, `itemMediaWidth/Height` (R), `itemMediaRadius`; readers in `includes/nav-drawer-menu-items.php` and `includes/nav-drawer-menu-extras-css.php`; panel `RowExtrasPanel.js`. mega-panel: `drawerCardMediaRatio`, `drawerCardMediaHeight` (R), `drawerCardThumbSize`, read in `includes/mega-panel-drawer-extras-css.php` (a fixed-height setting swaps the ratio rule).
2. Broken: not verified in a browser; `itemMediaReveal` (an image that appears on hover) conflicts with the "nothing that only appears on hover" taste rule in `working-with-bean.md`.
3. Changes: slots with `featured` kind, Source, Fit, Radius, Width/Height; Reveal stays as a menu behaviour.
4. End shape: `itemFit/Radius/Width/Height`; mega drawer card `Ratio/Height`.
5. Stays: the reveal behaviour (it is a menu, not a media effect).
6. Neither block is in §10.4 as written.

### B22. sgs/store-selector, google-rating-badge, star-rating, trustpilot-reviews, account

1. store-selector: `flagUrl` per store, `flagSize` (R), `<img class=sgs-store-selector__flag>`, `edit.js` `MediaUpload`. google-rating-badge, star-rating, trustpilot-reviews: fixed `<img>` from plugin assets (logo, badge). account: `orderThumbsFlexWrap` only.
2. Broken: store-selector flags are bare URL strings with no id.
3. Changes: store-selector is a small item slot `flag` (Source, Width). The three fixed-artwork blocks are not slots (no choice for the user).
4. End shape: unchanged for fixed artwork; document them as "not media settings".
5. Stays: all.
6. None are in §10.4. The spec should state the fixed-artwork blocks are out of scope so a gate that greps `<img` does not fail on them.

## Part C. Saved use (live content, five sites)

Method: `TARGETS` read from `plugins/sgs-blocks/scripts/deploy_common.py` (hosts: sandybrown; indus-test = lavender-dinosaur-183533; eye-care-clone-test = mintcream-lyrebird-224487; mamas-test = lightsalmon-tarsier-683012; eye-care-test = darkcyan-grouse-898606). One site at a time over SSH, read-only `wp db query "SELECT ... FROM wp_posts WHERE post_content LIKE '%wp:sgs/%' AND post_status IN (publish, draft, private, pending, future)"`. The table prefix `wp_` was confirmed on sandybrown with `wp db prefix`; the other four returned rows with the same prefix. All five sites answered. Rows (any post type, including templates, parts, drawers, headers, footers, forms and choice flows): sandybrown 289, indus-test 60, eye-care-clone-test 41, mamas-test 43, eye-care-test 39. Dumps (hex-encoded content) are in `E:/sgs-tmp/media-t2/<site>/rows.tsv`, outside the repo. Parsed locally with Python from the block-comment JSON (`<!-- wp:sgs/<name> {json} -->`); content treated as data. Revisions were excluded. The parse matches report K exactly for the 8 blocks K tabulated (media 150, container 2242, decorative-image 110, hero 58, product-card 48, card-grid 26, gallery 14, buybox 9).

Total: 3,445 instances of the 42 census blocks (T1's 11 plus my 31); 1,203 without `sgs/container` (2,242).

### C1. Instances per block per site

| Block | Total | sandybrown | indus | ec-clone | mamas | ec-test |
|---|---|---|---|---|---|---|
| T1 sgs/container | 2242 | 395 | 984 | 418 | 244 | 201 |
| T1 sgs/decorative-image | 110 | 5 | 86 | 0 | 19 | 0 |
| T1 sgs/gallery | 14 | 10 | 1 | 1 | 1 | 1 |
| T1 sgs/hero | 58 | 16 | 25 | 7 | 8 | 2 |
| T1 sgs/media | 150 | 39 | 70 | 17 | 21 | 3 |
| T1 sgs/multi-button | 140 | 73 | 34 | 26 | 6 | 1 |
| T1 sgs/nav-drawer | 72 | 29 | 11 | 11 | 11 | 10 |
| T1 sgs/physics-canvas | 4 | 4 | 0 | 0 | 0 | 0 |
| T1 sgs/site-footer | 11 | 6 | 1 | 1 | 2 | 1 |
| T1 sgs/site-header | 28 | 23 | 1 | 1 | 1 | 2 |
| T1 sgs/trust-bar | 21 | 10 | 0 | 0 | 2 | 9 |
| sgs/account | 6 | 1 | 0 | 2 | 2 | 1 |
| sgs/audio | 1 | 1 | 0 | 0 | 0 | 0 |
| sgs/before-after | 10 | 10 | 0 | 0 | 0 | 0 |
| sgs/brand-strip | 14 | 10 | 2 | 0 | 0 | 2 |
| sgs/business-info | 124 | 48 | 23 | 16 | 17 | 20 |
| sgs/buybox | 9 | 6 | 0 | 0 | 2 | 1 |
| sgs/card-grid | 26 | 20 | 0 | 4 | 0 | 2 |
| sgs/cart | 23 | 20 | 0 | 1 | 1 | 1 |
| sgs/choice-flow | 12 | 8 | 0 | 1 | 1 | 2 |
| sgs/choice-flow-question | 26 | 14 | 0 | 4 | 4 | 4 |
| sgs/form-field-tiles | 10 | 0 | 9 | 0 | 1 | 0 |
| sgs/google-rating-badge | 7 | 5 | 0 | 0 | 0 | 2 |
| sgs/google-reviews | 19 | 12 | 0 | 0 | 0 | 7 |
| sgs/measured-diagram | 4 | 2 | 0 | 0 | 0 | 2 |
| sgs/mega-panel | 30 | 15 | 5 | 5 | 1 | 4 |
| sgs/nav-drawer-menu | 69 | 29 | 10 | 11 | 10 | 9 |
| sgs/option-picker | 4 | 4 | 0 | 0 | 0 | 0 |
| sgs/post-grid | 10 | 7 | 3 | 0 | 0 | 0 |
| sgs/product-card | 48 | 27 | 0 | 3 | 7 | 11 |
| sgs/product-search | 7 | 7 | 0 | 0 | 0 | 0 |
| sgs/responsive-logo | 63 | 46 | 3 | 4 | 7 | 3 |
| sgs/star-rating | 3 | 3 | 0 | 0 | 0 | 0 |
| sgs/store-selector | 1 | 1 | 0 | 0 | 0 | 0 |
| sgs/team-member | 10 | 10 | 0 | 0 | 0 | 0 |
| sgs/testimonial | 24 | 11 | 4 | 0 | 9 | 0 |
| sgs/timeline | 25 | 23 | 2 | 0 | 0 | 0 |
| sgs/trustpilot-reviews | 6 | 6 | 0 | 0 | 0 | 0 |
| sgs/wishlist-panel | 4 | 2 | 0 | 1 | 1 | 0 |
| sgs/image-sequence | 0 | 0 | 0 | 0 | 0 | 0 |
| **All** | **3445** | |||||

Census blocks with no saved instance on any site: image-sequence. Present on sandybrown only, so unproven on the client sites: audio 1, before-after 10, option-picker 4, physics-canvas 4, product-search 7, star-rating 3, store-selector 1, team-member 10, trustpilot-reviews 6.

### C2. Old media attributes real content uses

Only attributes whose name matches a media word were tabulated (image, photo, logo, video, thumb, media, avatar, svg, poster, background size/position/repeat/attachment/overlay, bgVideo, bgSvg, lottie, objectFit, objectPosition, focal, flag, frames, swatch, aspectRatio, shape, map, audio). Colour, typography, hover-colour, motion and custom-CSS attributes were skipped. "Has a §13 row" means the name (Tablet/Mobile suffix stripped) is named in §13 or starts with one of its wildcard prefixes (`backgroundImage*`, `bgVideo*`, `bgSvg*`, `splitMedia*`, `sgsHoverZoom*`). Shape is the stored value shape (str, num, bool, arr, or obj with its keys); the number is nodes carrying it.

| Block | Old attributes with a §13 row (shape, nodes) | No §13 row (shape, nodes; [setting] = styling setting that stays, not a source) |
|---|---|---|
| T1 sgs/container | `backgroundImage` obj{alt,id,url}/obj{id,url} x7; `backgroundPosition` str x2; `backgroundRepeat` str x1; `backgroundSize` str x2; `bgSvgContent` str x1 | `backgroundOverlayBlendMode` str x1 [setting]; `backgroundOverlayOpacity` obj{desktop,mobile}/obj{desktop} x5 [setting]; `boxAspectRatio` str x60 [setting] |
| T1 sgs/decorative-image | `imageDecorative` bool x5; `imageId` num x3; `imageUrl` str x5; `shape` str x1 | - |
| T1 sgs/gallery | `aspectRatio` str x1 | `mediaItems` arr x9 |
| T1 sgs/hero | `backgroundImage` obj{alt,id,url}/obj{id,url} x3; `backgroundImageMobile` obj{alt,id,url} x1; `backgroundImageTablet` obj{alt,id,url} x1; `backgroundPosition` str x2; `backgroundSize` str x1; `splitMediaAlign` obj{mobile} x1; `splitMediaAspectRatio` str x15; `splitMediaBackground` str x4; `splitMediaBorderRadius` obj{bottomLeft,bottomRight,topLeft,topRight} x16; `splitMediaBorderWidth` obj{bottom,left,right,top} x15; `splitMediaBoxShadow` str x15; `splitMediaHeight` obj{desktop,mobile,tablet}/obj{desktop} x16; `splitMediaImageAlt` str x9; `splitMediaImageAltMobile` str x1; `splitMediaImageId` num x22; `splitMediaImageUrl` str x24; `splitMediaImageUrlMobile` str x1; `splitMediaMaxWidth` obj{desktop,mobile,tablet} x1; `splitMediaMediaSizing` str x16; `splitMediaObjectFit` str x5; `splitMediaObjectPosition` obj{desktop,mobile,tablet}/obj{desktop} x2; `splitMediaWidth` obj{mobile,tablet}/obj{tablet} x14 | `backgroundOverlayOpacity` obj{desktop} x2 [setting]; `mediaBackground` str x1 [setting]; `mediaPadding` obj{desktop,mobile,tablet}/obj{desktop,tablet} x14 [setting] |
| T1 sgs/media | `aspectRatio` str x7; `imageAlt` str x46; `imageBlendMode` str x1; `imageDecorative` bool x1; `imageId` num x110; `imageUrl` str x124; `mediaSizing` str x90; `mediaType` str x19; `objectFit` str x25; `objectPosition` str x2; `svgContent` str x6; `svgContentMobile` str x2; `svgContentTablet` str x2; `thumbnailId` num x1; `videoId` num x3; `videoSource` str x5; `videoUrl` str x5 | `imageHeight` num x1; `videoAutoplay` bool x3; `videoCaptionsLabel` str x1; `videoCaptionsSrcLang` str x1; `videoCaptionsUrl` str x1; `videoControls` bool x4; `videoLoop` bool x1; `videoMuted` bool x4 |
| T1 sgs/nav-drawer | - | `chromeLogoAlt` str x4; `chromeLogoBoxBg` str x2; `chromeLogoBoxPadding` obj{bottom,left,right,top} x2; `chromeLogoBoxRadius` str x2; `chromeLogoBoxShadow` str x2; `chromeLogoId` num x5; `chromeLogoInlineSvg` bool x1; `chromeLogoSvgParts` arr x1; `chromeLogoSvgPartsHoverCooldown` num x1; `chromeLogoSvgPartsTrigger` str x1; `chromeLogoUrl` str x3; `chromeLogoWidth` obj{desktop,mobile,tablet}/obj{desktop,mobile}/obj{desktop} x5 |
| sgs/audio | - | `audioId` num x1; `audioLoop` bool x1; `audioMimeType` str x1; `audioSource` str x1; `audioUrl` str x1 |
| sgs/before-after | - | `afterImageAlt` str x8; `afterImageId` num x8; `afterImageUrl` str x8; `afterMediaType` str x2; `beforeImageAlt` str x8; `beforeImageId` num x8; `beforeImageUrl` str x8; `beforeMediaType` str x2 |
| sgs/brand-strip | - | `logoFit` str x1 [setting]; `logoGap` str x2 [setting]; `logoLayout` str x1 [setting]; `logoMaxWidth` num x1 [setting]; `logoOpacity` num x1 [setting]; `logos` arr x10 |
| sgs/business-info | - | `mapFilter` str x1 [setting]; `mapHeight` obj{desktop,mobile}/obj{desktop} x2 [setting]; `mapSource` str x2 [setting]; `mapZoom` num x1 [setting] |
| sgs/buybox | `galleryStickerShape` str x1 | `galleryThumbBorderRadius` obj{bottomLeft,bottomRight,topLeft,topRight} x2 [setting]; `galleryThumbBorderWidth` obj{bottom,left,right,top} x2 [setting]; `galleryThumbSize` obj{desktop,mobile,tablet} x1 [setting]; `mainPhotoBorderStyle` str x2; `mainPhotoBorderWidth` obj{bottom,left,right,top} x2; `mainPhotoRadius` str x2; `mainPhotoShadow` str x1; `pickerDotShape` str x2 [setting]; `pickerSwatchStyle` str x3 [setting]; `thumbGap` str x2 [setting]; `thumbSelectedScale` num x1 [setting]; `thumbStripOffset` str x1 [setting]; `thumbsPerRow` obj{desktop,mobile,tablet} x1 [setting] |
| sgs/card-grid | `aspectRatio` str x2 | `imageFallback` bool x1 [setting]; `imageHeight` obj{desktop} x1; `imagePadding` obj{desktop} x1; `noImageLabel` str x1 [setting] |
| sgs/cart | - | `iconSvg` str x1 [setting]; `itemThumbBg` str x1; `itemThumbRadius` str x1; `itemThumbSize` obj{desktop} x1 |
| sgs/choice-flow | - | `headerLogo` obj{alt,id,url} x1; `headerLogoHeight` num x2 [setting]; `optionMediaSize` obj{desktop,mobile,tablet} x1 [setting] |
| sgs/choice-flow-question | - | `optionMediaSize` obj{desktop,mobile,tablet} x1 [setting] |
| sgs/google-reviews | - | `avatarBorderRadius` obj{desktop} x2; `avatarSize` obj{desktop,mobile,tablet} x2; `showCardLogo` bool x1 [setting] |
| sgs/measured-diagram | - | `drawingImageAlt` str x4; `drawingImageHeight` num x4; `drawingImageId` num x4; `drawingImageUrl` str x4; `drawingImageWidth` num x4 |
| sgs/mega-panel | - | `drawerCardMediaHeight` obj{mobile,tablet} x2; `drawerCardThumbSize` str x2 |
| sgs/nav-drawer-menu | - | `itemMedia` str x1; `itemMediaHeight` obj{desktop} x1; `itemMediaReveal` obj{desktop,mobile,tablet} x1; `itemMediaWidth` obj{desktop} x1; `itemOrnamentFrames` arr x1 [setting] |
| sgs/post-grid | - | `imageHeight` obj{desktop,mobile,tablet} x2 |
| sgs/product-card | `imageAlt` str x5 | `brandLogoMaxWidth` obj{desktop,mobile} x11 [setting]; `brandUseLogo` bool x2 [setting]; `image` str x5; `imageAspectRatio` str x16; `imageFill` bool x5; `imageSize` str x5; `noImageLabel` str x11 [setting]; `showGalleryThumbs` bool x1 [setting]; `showSwatches` bool x5 [setting]; `swatchAttribute` str x2 [setting]; `swatchHoverGrow` num x11 [setting]; `swatchMaxVisible` num x1 [setting]; `swatchSize` num x9 [setting] |
| sgs/responsive-logo | - | `inlineSvg` bool x2; `logoId` num x12; `logoUrl` str x9; `svgParts` arr x2; `svgPartsHoverCooldown` num x2; `svgPartsTrigger` str x2 |
| sgs/team-member | `photoShape` str x7 | `photo` obj{alt,id,url}/obj{id,url} x8 |
| sgs/timeline | - | `mediaAspectRatio` obj{desktop} x2; `mediaBorderRadius` obj{desktop,mobile,tablet} x2; `mediaHeight` obj{mobile,tablet} x2; `milestoneMediaWidth` str x2 |

Shape notes from the same data. `sgs/media`: `mediaSizing` fill 73, height 11, ratio 5, auto 1; `mediaType` image 7, svg 6, video 5, lottie 1; `objectFit` contain 13, cover 11, scale-down 1; `objectPosition` is a CSS string (`center 20%`, `50% 20%`), never `{x,y}`; `videoSource` internal 3, external 2; `aspectRatio` is a `w / h` string (4 / 3 x4, 4 / 5 x2, 3 / 4 x1). `sgs/container` and `sgs/hero`: `backgroundImage` is an object `{id,url}` or `{id,url,alt}`; `backgroundPosition` is a CSS string (`center 25%`, `top left`, `78% 45%`, `center bottom`); `backgroundSize` is contain or auto; `backgroundRepeat` is repeat. `sgs/hero` `splitMediaObjectPosition` is a responsive object of strings; split media uses `splitMediaMediaSizing` ratio 15, auto 1. Flat Tablet/Mobile tier attributes occur in saved content only on: hero `backgroundImageTablet/Mobile` (1 each), hero `splitMediaImageUrlMobile` and `splitMediaImageAltMobile` (1 each), media `svgContentTablet/Mobile` (2 each).

### C3. Old attributes with no §13 row that real content uses

Ranked by how much content is affected:

1. `sgs/product-card`: `image` (bare URL string, 5), `imageFill` (5), `imageSize` (5, all `full`), `imageAspectRatio` (16, all `1 / 1`). §13 has no product-card row; `imageAspectRatio` would become Ratio, `imageFill` Height Fill, `imageSize` is deleted, and `image` has no id or size (FR-49-16).
2. Overlay and hero split attributes: `backgroundOverlayOpacity` (container 5, hero 2) and `backgroundOverlayBlendMode` (container 1); `mediaPadding` (hero, 14, all indus-test) and `mediaBackground` (hero, 1) are not `splitMedia*`-prefixed, so the §13 wildcard does not catch them.
3. `sgs/media`: `videoAutoplay` 3, `videoControls` 4, `videoMuted` 4, `videoLoop` 1 (§8 has `Playback`, §13 has no row), `videoCaptionsUrl/Label/SrcLang` 1 each (§8 `Captions`, no §13 row), `imageHeight` 1.
4. `sgs/gallery`: `mediaItems` (items array, 9 nodes) has no row.
5. `sgs/responsive-logo`: `logoId` 12, `logoUrl` 9, `inlineSvg` 2, `svgParts*` 2; the only §13 logo row is `chromeLogoTablet/Mobile`. It is the largest non-container user here (63 instances, 46 on sandybrown).
6. `sgs/nav-drawer`: `chromeLogoId` 5, `chromeLogoUrl` 3, `chromeLogoAlt` 4, `chromeLogoWidth` 5, `chromeLogoBox*`, `chromeLogoInlineSvg`, `chromeLogoSvgParts*` (72 instances).
7. Sandybrown-only or small: `sgs/before-after` `beforeImageId/Url/Alt` and `afterImageId/Url/Alt` (8 each) and `*MediaType` (2 each); `sgs/measured-diagram` `drawingImage*` (4 each); `sgs/audio` `audio*` (1); `sgs/team-member` `photo` object (8; the `photoShape` row exists, `photo` does not; saved `photoShape` is `square` x7); `sgs/timeline` `mediaAspectRatio`, `mediaBorderRadius`, `mediaHeight`, `milestoneMediaWidth` (2 each, indus-test).
8. One-node uses: `sgs/card-grid` `imageHeight`, `imagePadding`, `imageFallback`, `noImageLabel`; `sgs/post-grid` `imageHeight` (2); `sgs/cart` `itemThumb*`; `sgs/choice-flow` `headerLogo`, `optionMediaSize`; `sgs/buybox` `mainPhoto*` and `galleryThumb*` (2 nodes each); `sgs/google-reviews` `avatarSize`, `avatarBorderRadius`; `sgs/mega-panel` `drawerCardMediaHeight`, `drawerCardThumbSize` (2 each); `sgs/nav-drawer-menu` `itemMedia`, `itemMediaReveal`, `itemMediaWidth/Height`.
9. `sgs/container` `boxAspectRatio` (60 nodes: indus-test 20, eye-care-clone-test 18, mamas-test 20, eye-care-test 2): an aspect-ratio attribute on containers that §13 does not name.

Items marked `[setting]` in the table are styling settings that stay as ordinary block attributes (map options, swatch and picker styles, label text, thumbnail layout); they are listed for completeness, not as migration gaps.

### C4. The saved Lottie media block

One block: `sgs/media` with `mediaType: "lottie"` and `thumbnailId: 3459`, on sandybrown, post 4087, post type `page`, status `publish`, slug `qa-lottie`. It is the nav-QA fixture page built from `plugins/sgs-blocks/scripts/nav-qa/lane-c/qa-lottie.json`. A search of every block's attribute names containing "ottie" across all five dumps found no other block carrying one, so this is the only saved Lottie in live content.

## Not checked

- No browser, editor or live-site work was done; every "broken" item above is from source reading, not a rendered check.
- `sgs/account` order thumbnail markup (where the `<img>` is printed) was not located.
- Whether `sgs/mega-panel` `accentBackgroundImage` is an image or a token was inferred from its default value `"accent"`, not from the renderer.
- Per-device behaviour of focal point on before-after, product-card and testimonial `work` was not run.
- Saved content is only the block-comment JSON of live `post_content` for published, draft, private, pending and future posts. Revisions, post meta, `wp_global_styles`, `wp_navigation` and option values were not read. Media nested inside item arrays (`logos`, `mediaItems`, `tiles`, `items`) was not opened, so per-item shapes are unverified.
- The migration mapping in §13 was not checked against every attribute above; attributes with no §13 row (for example `imageFill`, `imageSize`, `logoSwitchCustomPx`, `itemMediaReveal`, `tileShape`, `swatchShape`) would be refused by the tool until rows are added.
