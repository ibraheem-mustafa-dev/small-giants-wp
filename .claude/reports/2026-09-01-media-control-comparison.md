# Media control comparison — six blocks × ten atoms

**Purpose:** ground truth for Bean to pick a reference implementation per control. No
recommendation is made in this document — read it, then say per control which
implementation (or none) the shared helper should be modelled on.

**Scope:** `sgs/media` · `sgs/before-after` · `sgs/hero` · `sgs/container` ·
`sgs/decorative-image` · `sgs/product-card`. A plain BACKGROUND (image/video/SVG/overlay via
the shared `BackgroundPanel`) is out of scope everywhere except `sgs/container`, which owns
that mechanism. `sgs/hero`'s SECTION background is likewise out of scope; its SPLIT-MEDIA
element is in scope.

**Row shape:** one row per distinct CONTROL (a control writing several attributes in one UI
element is one row, not several). Every cell carries a `file:line` citation. "— none —" means
no equivalent exists; it is a data point, not an omission.

**Built from:** `plugins/sgs-blocks/src/components/media/atoms/registry.js` (the ten atoms +
their `bases`) and direct reads of each block's `block.json`/`edit.js`/`render.php` (+
`container/components/*.js`), the shared helpers in
`plugins/sgs-blocks/src/components/media/controls/`, and the atoms' own
`*.control.js` files.

---

## Atom: source

Bases: `Image, ImageId, ImageUrl, Video, VideoId, VideoUrl, Svg, SvgContent, Thumbnail, ThumbnailId`

**Control: Media type selector + upload/URL pickers**

- **sgs/media** — hand-rolled `ButtonGroup` of 3 `Button`s ("Image" / "Video" / "SVG /
  Animation") driving `mediaType`, inside `PanelBody` "Media Type" — **not** the shared
  `MediaTypeControl`. Per-type source pickers: Image tab = `MediaUploadCheck`+`MediaUpload`
  ("Replace Image" / "Remove Image"), `allowedTypes=['image']`, writes
  `imageId`/`imageUrl`/`imageAlt` (+ `imageWidth`/`imageHeight`, see `intrinsic`). Tiers: yes —
  `ResponsiveControl` "Art direction (optional)" wraps tablet/mobile `MediaUpload` overrides,
  gated on the desktop image existing. States: none. Disclosure: type toggle always shown;
  image/video/svg picker panels conditional on `isImage`/`isVideo`/`isSvg`. Storage:
  `imageId`+`imageUrl` pair. — `plugins/sgs-blocks/src/blocks/media/edit.js:230-260` (type
  toggle), `:262-352` (image source + tiers)
- **sgs/before-after** — per-slot `SelectControl` (label = slot name, e.g. "Before"/"After"),
  options `[Image, Video, SVG]`, writes `{side}MediaType` — bespoke, not the shared control.
  Source rows per type: Image = `ImagePickerRow`; Video = info `Notice` (WP-library/direct-URL
  only, no YouTube/Vimeo) + `MediaUpload` ("Select video from library"/"Replace video") +
  `TextControl` "Or paste a direct video URL"; SVG = `TextareaControl` "SVG markup". Tiers:
  image only — `ResponsiveControl` "Image for this screen size", gated on the base image
  existing; video/SVG have no tiers. States: none. Disclosure: type select always shown per
  slot; matching source block conditional on `mediaType`. Storage: `{side}ImageId` is a
  `[integer,string]` union. — `plugins/sgs-blocks/src/blocks/before-after/edit.js:183-196`
  (type select), `:198-358` (per-type source)
- **sgs/hero** — TWO mechanisms. (1) Section background (out of scope) uses the shared
  `BackgroundPanel` tabs. (2) Split-media: `splitImage` via `MediaPicker` inside
  `ResponsiveControl` "Split image"; a SEPARATE per-device `SelectControl` "Media type"
  (`splitMediaType`/Tablet/Mobile, desktop options `[Image,Video,SVG]`, tablet/mobile add an
  `Inherit` `''` 4th option) gates video (`MediaUpload`) or SVG (`TextareaControl`) pickers for
  the split column. Tiers: yes via `ResponsiveControl`. States: none. Disclosure: split
  media-type row gated on `splitImage?.url` existing (avoids a dead control for an unset
  slot). — `plugins/sgs-blocks/src/blocks/hero/edit.js:602-670` (split image), `:671-780`
  (split media type + video/svg)
- **sgs/container** — uses the SAME shared `BackgroundPanel` as hero — `TabPanel` tabs
  "Image"/"Video"/"SVG", base pickers always visible, tiers via `ResponsiveControl` "Art
  direction (optional)" (image/video only, gated on base source existing; SVG has no tiers).
  **No `mediaType` attribute exists** — type is inferred at render from which of
  `backgroundImage`/`bgVideo`/`bgSvgContent` is non-empty (video silently wins, no editor
  warning) — confirmed `registry.js:113-115`. —
  `plugins/sgs-blocks/src/blocks/container/components/BackgroundPanel.js:234-562`, mounted
  `container/edit.js:513`
- **sgs/decorative-image** — ONE unrestricted `MediaPicker` (no `allowedTypes` — accepts
  image or video), label "Select Decorative Media" / "Replace Media"; writes `decorMedia` (a
  composite object) AND mirrors to legacy `imageId`/`imageUrl`/`imageAlt` when the type is
  image. No SVG option, no explicit type-selector control — type read off
  `decorMedia.type`/what the picker returns. Tiers: image-only art-direction tiers
  (`imageIdTablet`/`Mobile`), gated on base image; video branch returns before tiers are
  built. States: none. Disclosure: main picker always shown (placeholder vs replace state). —
  `plugins/sgs-blocks/src/blocks/decorative-image/edit.js:519-528` (main picker), `:70-87`
  (onSelectMedia), `:125-175` (tier picker, image-only)
- **sgs/product-card** — image-only `MediaUpload`/`MediaUploadCheck`,
  `allowedTypes=['image']`, no video/SVG option, no `mediaType` attribute. Two mount points:
  content-overrides panel (`ToggleControl` "Override image" gates a gallery-image picker grid
  + `MediaUpload`) and the built-in-card canvas (`MediaUpload`/`MediaUploadCheck` "Replace
  image"/"Remove image"/"Product image"). Writes `image` (bare URL STRING only — no `.id` ever
  stored) + `imageAlt`. No tiers, no art direction. States: none. Disclosure: override toggle
  default off; canvas picker always shown in typed mode. —
  `plugins/sgs-blocks/src/blocks/product-card/edit.js:472-558` (override panel), `:2306-2392`
  (canvas picker)

---

## Atom: media-type

Bases: `MediaType, VideoSource, VideoMimeType`. Shared component:
`plugins/sgs-blocks/src/components/media/controls/MediaTypeControl.js` — options
`[Image, Video, SVG / animation]` as a plain `SelectControl`.

**Control: media-type selector**

- **sgs/media** — NOT the shared `MediaTypeControl`. Hand-rolled `ButtonGroup` of 3 `Button`s,
  same 3 options, different primitive (button toggle, not select), no tier siblings, no
  "inherit" option. — `plugins/sgs-blocks/src/blocks/media/edit.js:230-260`
- **sgs/before-after** — NOT the shared control. Hand-rolled `SelectControl` per slot
  (`{side}MediaType`), one instance per side, no tier siblings, no inherit option. —
  `plugins/sgs-blocks/src/blocks/before-after/edit.js:183-196`
- **sgs/hero** — NOT the shared control (split variant only). Hand-rolled `SelectControl`
  "Media type" per device (`splitMediaType`/`Tablet`/`Mobile`) — desktop `[Image,Video,SVG]`;
  tablet/mobile add a 4th `Inherit` (`''`) option matching the atom's documented tier-inherit
  sentinel, but as its own literal array, not `MediaTypeControl`'s `allowInherit` prop. Tiers:
  yes, three device rows via `ResponsiveControl`. Disclosure: only shown once `splitImage?.url`
  exists. Standard (section-background) variant has NO media-type control at all — type chosen
  implicitly via `BackgroundPanel` tabs. — `plugins/sgs-blocks/src/blocks/hero/edit.js:681-736`
- **sgs/container** — **— none —**. No `mediaType`-shaped attribute or control anywhere; type
  inferred at render from which source attribute is populated, with no editor warning when more
  than one is set. The `BackgroundPanel` `TabPanel` tabs are navigation only, not
  attribute-backed. — `container/components/BackgroundPanel.js:234-240`, `registry.js:109-116`
- **sgs/decorative-image** — **— none —**. No `mediaType`/`decorMediaType` attribute; the
  editor reads `decorMedia.type` purely to choose the live preview element (`<video>` vs
  `<img>`), never exposed as a client-facing choice. — `decorative-image/edit.js:536-556`
- **sgs/product-card** — **— none —**. No `mediaType` attribute; block is permanently
  image-only in typed mode (`allowedTypes={['image']}` hardcoded on every `MediaUpload`), so
  there is no type concept to select. — `product-card/block.json` (no such attribute present)

---

## Atom: intrinsic

Bases: `ImageWidth, ImageHeight`. `clientEditable: false` in the atom registry — **no control
on any of the six blocks, by design.** These are written from the chosen media so the renderer
can emit width/height and avoid layout shift.

- **sgs/media** — HAS the storage (`imageWidth`/`imageHeight`, both `integer`, no default) but
  NO inspector control. Values auto-written as a side effect of the image-source picker's
  `onSelectImage` handler (`imageWidth: media.width || null, imageHeight: media.height ||
  null`). — `media/block.json:340-345` (attrs), `media/edit.js:154-162` (auto-write)
- **sgs/before-after** — **— none —**. No such attributes exist in block.json at all — no
  intrinsic-dimension storage of any kind. — `before-after/block.json` (absent)
- **sgs/hero** — **— none —**. No `splitImageWidth`/`splitImageHeight` intrinsic-pixel
  attributes. (`splitMediaWidth`/`splitMediaHeight` are a DIFFERENT, client-facing
  box-shape/sizing pair the client sets deliberately — belongs to `box-shape`, not
  `intrinsic`.) — `hero/block.json:494-514` (box-shape family, distinct from intrinsic)
- **sgs/container** — **— none —**. Background-image surface, not an `<img>` element with
  natural pixel dimensions to reserve layout space for.
- **sgs/decorative-image** — **— none —**. (`width` is a client-facing tier object controlling
  rendered size — a `box-shape`-family control, not natural pixel dimensions.) —
  `decorative-image/block.json:90-93` (box-shape family, distinct from intrinsic)
- **sgs/product-card** — **— none —**. (`imageHeight` is a client-set CSS length STRING, e.g.
  `"180px"`, no tiers — a `box-shape` atom variant per registry.js, not the media's natural
  size.) — `product-card/block.json:391-395`, `registry.js:244-246`

---

## Atom: video-behaviour

Bases: `VideoAutoplay, VideoLoop, VideoMuted, VideoControls, VideoPlaysInline, VideoLazyLoad,
VideoCaptionsId, VideoCaptionsUrl, VideoCaptionsLabel, VideoCaptionsSrcLang`.
Cross-attribute rule: `VideoAutoplay requires [VideoMuted, VideoPlaysInline]`.

⛔ **Registry-claim check (verified against real code, not assumed):** the registry's note
"Currently declared only by sgs/media" is TRUE for the attribute declarations (only
`media/block.json` declares any `video…` behaviour base). But the deeper implied claim — that
the shared atom's `control()`/`disclosure()` functions drive that surface — is FALSE:
`sgs/media/edit.js` mounts `MediaElementPanel` with `atoms={['object-fit','focal-point']}`
only (`edit.js:569-577`) — `video-behaviour` is never passed. All six of media's playback
toggles are a separate, hand-rolled `BooleanResponsiveControl`-per-tier implementation that
predates and diverges from the atom (no tiering in the atom's own `ToggleControl`s; different
disclosure wiring for Muted/PlaysInline). **The atom's `video-behaviour.control.js` has zero
real callers among these six blocks.**

**Control: Autoplay**

- **sgs/media** — custom `BooleanResponsiveControl` (not the atom's `ToggleControl`), label
  "Autoplay", help "Autoplay requires Muted to be enabled on most browsers — turning Autoplay
  on for a tier automatically mutes that tier too.", inside `ToolsPanel` "Playback Options"
  nested in `PanelBody` "Video". Tiers: yes, desktop/tablet/mobile. States: `isShownByDefault`.
  Server-side, the autoplay→muted+playsinline coupling is enforced by
  `sgs_media_atom_video_behaviour_requires()` at render.php:792. —
  `media/edit.js:1386-1417`; attrs `block.json:197,201,209`; `media/render.php:784-798`
- **sgs/before-after** — `BooleanResponsiveControl`, label "Autoplay videos", help "Both
  videos start playing together on load. Always suppressed when the visitor has reduced motion
  enabled — the play/pause control stays available either way.", gated on
  `'video' === beforeMediaType || 'video' === afterMediaType`. Attrs `videoAutoplay`/`Tablet`/
  `Mobile` — **BLOCK-LEVEL, one toggle governs both slots** (confirms registry's known
  variance). **No HTML `autoplay` attribute is ever emitted** — playback is entirely
  view.js-driven; the `<video>` markup hardcodes `muted loop playsinline
  preload="metadata"`. The editor toggle only writes `data-video-autoplay`/`-tablet`/`-mobile`
  attrs consumed by JS. — `before-after/edit.js:515-529`, `block.json:255-273`,
  `media-render.php:202,266`, `render.php:362-371`
- **sgs/hero** — **— none — (client control)**. Server-hardcoded only, for the
  background-video layer: `autoplay loop muted playsinline` unconditional. The split-media
  video has **no autoplay/muted/loop/playsinline/controls attributes of its own** — rendered
  via the shared `sgs_tier_media_render()` helper, which hardcodes `loop muted playsinline` and
  picks `autoplay` OR `controls` from a **PHP option default (`true`), never a block
  attribute**. — `hero/render.php:927,940`; `includes/helpers-tier-media.php:129,181-183`
- **sgs/container** — **— none — (client control)**. Background video rendered by the shared
  `SGS_Container_Wrapper` class, hardcoding `autoplay loop muted playsinline preload="none"
  aria-hidden="true"`. No attribute, no editor control. —
  `includes/class-sgs-container-wrapper.php:1703,1715`
- **sgs/decorative-image** — **— none — (client control)**. Video branch defers to shared
  `sgs_render_media()` called with no `$opts` override, so it uses that function's hardcoded
  defaults `autoplay:true, loop:true, muted:true, controls:false, playsinline:true`. —
  `includes/helpers-media.php:218-241`
- **sgs/product-card** — **— none —**. No video attribute, no `<video>` element anywhere —
  this block has no video surface at all (image-only media model).

**Control: Muted**

- **sgs/media** — `BooleanResponsiveControl`, label "Muted", help "It's easy to unmute on a
  PC — but on mobile, visitors often expect audio off by default, like social-media video. Set
  it per device here.", `isShownByDefault`. ⚠ **Disclosure divergence from the atom**: the
  atom's `video-behaviour.control.js:67-76` disables Muted's `ToggleControl` (with a lock
  reason) whenever Autoplay is on. Media's real `BooleanResponsiveControl` row has **no
  `disabled`/lock wiring at all** in the editor — the lock is enforced only server-side
  (render.php:792) and (per the atom's docblock) in `media/view.js` client-side; the editor row
  does not visibly grey out. — `media/edit.js:1445-1474`; attrs `block.json:234,238,245`
- **sgs/before-after** — **— none —** (no separate control). Hardcoded `muted` unconditional. —
  `media-render.php:266`
- **sgs/hero** — **— none —**. Hardcoded `muted` on both the bg-video layer and split-media
  video, unconditional regardless of the autoplay/controls branch. —
  `hero/render.php:927,940`; `helpers-tier-media.php:181`
- **sgs/container** — **— none —**. Hardcoded `muted`. — `class-sgs-container-wrapper.php:1703,1715`
- **sgs/decorative-image** — **— none —**. Server default `muted:true`, no override passed. —
  `helpers-media.php:220`
- **sgs/product-card** — **— none —**. No video surface.

**Control: Loop**

- **sgs/media** — `BooleanResponsiveControl`, label "Loop", no help text, standard row (not
  `isShownByDefault`). — `media/edit.js:1419-1443`; attrs `block.json:216,220,227`
- **sgs/before-after** — **— none —**. Hardcoded `loop`. — `media-render.php:266`
- **sgs/hero** — **— none —**. Hardcoded `loop` on both surfaces. —
  `hero/render.php:927,940`; `helpers-tier-media.php:181`
- **sgs/container** — **— none —**. Hardcoded `loop`. — `class-sgs-container-wrapper.php:1703,1715`
- **sgs/decorative-image** — **— none —**. Server default `loop:true`. — `helpers-media.php:219`
- **sgs/product-card** — **— none —**.

**Control: Show Controls**

- **sgs/media** — `BooleanResponsiveControl`, label "Show Controls", no help,
  `isShownByDefault`. — `media/edit.js:1476-1503`; attrs `block.json:252,256,263`
- **sgs/before-after** — **— none —**. No `controls` attribute ever emitted (JS-driven playback
  only). — `media-render.php:202,266`
- **sgs/hero** — **— none —**. `controls` is emitted only as the server-chosen ALTERNATIVE to
  `autoplay` (never both) — not client-settable; bg-video layer never gets `controls` at all
  (autoplay hardcoded unconditionally). — `helpers-tier-media.php:183`; `hero/render.php:927,940`
- **sgs/container** — **— none —**. Bg-video never gets `controls` (autoplay hardcoded
  unconditionally).
- **sgs/decorative-image** — **— none —**. Server default `controls:false`, no override. —
  `helpers-media.php:221`
- **sgs/product-card** — **— none —**.

**Control: Plays Inline (iOS)**

- **sgs/media** — `BooleanResponsiveControl`, label "Plays Inline (iOS)", help "Prevents iOS
  from opening the video in full screen automatically.", not `isShownByDefault`. Same
  disclosure divergence as Muted: the atom's control.js locks this row when Autoplay is on;
  media's real row does not show that lock in the UI. — `media/edit.js:1505-1539`; attrs
  `block.json:270,274,281`
- **sgs/before-after** — **— none —**. Hardcoded `playsinline`. — `media-render.php:266`
- **sgs/hero** — **— none —**. Hardcoded `playsinline` on both surfaces. —
  `hero/render.php:927,940`; `helpers-tier-media.php:181`
- **sgs/container** — **— none —**. Hardcoded `playsinline`. — `class-sgs-container-wrapper.php:1703,1715`
- **sgs/decorative-image** — **— none —**. Server default `playsinline:true`. — `helpers-media.php:222`
- **sgs/product-card** — **— none —**.

**Control: Lazy Load**

- **sgs/media** — `BooleanResponsiveControl`, label "Lazy Load", help "Load video only when
  scrolled into view.", not `isShownByDefault`. — `media/edit.js:1541-1571`; attrs
  `block.json:288,292,299`
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —**. Non-base video tiers unconditionally render `preload="none"` —
  a structural default, not a client toggle. — `helpers-tier-media.php:19` (docblock), `:177-183`
- **sgs/container** — **— none —**.
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

**Control: Captions (Id/Url/Label/SrcLang)**

- **sgs/media** — hand-rolled workflow: `MediaUpload` restricted to `text/vtt` ("Add captions
  (.vtt)" / "Replace captions (.vtt)"), then `TextControl` "Captions label" (help "Shown in the
  player's subtitle menu, e.g. \"English\"."), `TextControl` "Captions language code" (help "A
  two- or three-letter code such as en, cy or fr."), and a destructive "Remove captions"
  `Button` — gated on a video existing. ⚠ **This is the ORIGINAL implementation, not wired to
  the shared `VideoCaptionsFields.js`** — that shared component's own docblock says it was
  "Modelled byte-for-byte on the existing captions UI in `src/blocks/media/edit.js`", i.e.
  media's UI predates and is a hand-duplicate of the atom, not a consumer of it. —
  `media/edit.js:1007-1082`; attrs `block.json:467,470,474,478`
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —**.
- **sgs/container** — **— none —**.
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

---

## Atom: meaning

Bases: `ImageAlt, VideoAlt, ImageIsDecorative`. Cross-attribute rule: `ImageAlt requires
[!ImageIsDecorative]`.

**Control: Decorative toggle + Alt text (image)**

- **sgs/media** — hand-rolled: `ToggleControl` label "Decorative image (hide from screen
  readers)", help "Turn on for purely decorative images that add no information — e.g.
  background flourishes. Screen readers will skip it entirely.", then `TextControl` label "Alt
  text (alternative text)", help switches between "Disabled — this image is marked decorative
  and is hidden from screen readers." and "Describe the image for screen readers and search
  engines. Leave empty only if the image is purely decorative.", `disabled={imageIsDecorative}`.
  ⚠ **Divergent from the shared `meaning.control.js`**: that atom uses `CheckboxControl` (not
  `ToggleControl`) with different help copy — media's version is hand-rolled, same pattern as
  video-behaviour. Frontend: `alt={imageIsDecorative ? '' : imageAlt}` +
  `aria-hidden={imageIsDecorative ? 'true' : undefined}`. Video type: **— none —** (no
  `videoAlt`/decorative for the video branch — captions substitute). —
  `media/edit.js:359-397` (controls), `:1610-1611` (canvas render); attrs `imageAlt`
  `block.json:330`, `imageIsDecorative` `block.json:335`
- **sgs/before-after** — per-slot `TextControl` inside `ImagePickerRow`, label "Alt text", help
  "Required — describes this image for screen-reader and no-JS visitors, who see both images
  without any comparison interaction.", shown only when `showAlt` (true for the base image;
  **suppressed for the Tablet/Mobile art-direction tier pickers** — "Alt text is deliberately
  NOT tiered"). Video slot: separate `TextControl` "Alt / description", help "Read by screen
  readers in place of visual playback." **No `ImageIsDecorative`/decorative toggle at all** —
  has the `ImageAlt`/`VideoAlt` bases but not `ImageIsDecorative`. —
  `before-after/edit.js:83-152,256` (image), `:328-340` (video); attrs
  `beforeImageAlt`/`afterImageAlt` `block.json:140,157`, `beforeVideoAlt`/`afterVideoAlt`
  `block.json:223,240`
- **sgs/hero** — **— none —**. No `Alt`/`Decorative` attribute of any name anywhere. Both the
  background media (`aria-hidden="true"` unconditional) and the split-media image are
  presentational by construction: split-image alt reads purely from the WP media object
  (`$split_image['alt']`) with **no editor `TextControl` for it** — never a settable field —
  and no decorative toggle to hide it either. — `hero/render.php:976,1198`;
  `hero/edit.js:1717`
- **sgs/container** — **— none —**. No `Alt`/`Decorative` attribute for
  `backgroundImage`/`bgVideo`. Both background image and video are rendered
  `aria-hidden="true"` unconditionally — always-decorative by design, no client control
  offered. — `class-sgs-container-wrapper.php:1149` (image), `:1703,1715` (video)
- **sgs/decorative-image** — `imageAlt` exists and is silently auto-populated from the picked
  media's own `.alt` metadata — **there is no `TextControl` anywhere to type or edit it**, and
  render.php **never reads `imageAlt` into the `<img>` at all**: the tag always hardcodes
  `'alt' => ''` and `'aria-hidden' => 'true'`, same for the video wrapper. Unconditionally
  decorative by name/purpose; `imageAlt` is a dead, write-only legacy attribute ("legacy
  imageId/imageUrl/imageAlt retained for deprecation"). — `decorative-image/edit.js:76,65`;
  `render.php:175-179,245-249`; `block.json:50,77-81`
- **sgs/product-card** — `imageAlt` auto-populated from the media library's `.alt` on select —
  **no `TextControl` labelled "Alt text" exists anywhere** (confirmed by exhaustive
  `TextControl` grep — every other field on this block has one, alt does not). Frontend DOES
  render it correctly, falling back to the WooCommerce product's own image alt in Bound mode.
  **No `ImageIsDecorative`/decorative toggle at all.** —
  `product-card/edit.js:503,542,2337,2386`; `render.php:694,655,872`; `block.json:244-248`

**Cross-attribute rule verification (`ImageAlt requires [!ImageIsDecorative]`):** only
`sgs/media` declares BOTH `ImageAlt` and `ImageIsDecorative` together, so only it can actually
enforce this rule — and it does, hand-rolled (`disabled` bound directly to
`imageIsDecorative`), not via the atom. Every other block either lacks `ImageIsDecorative`
entirely (before-after), is hardcoded decorative instead (hero, container), or has `ImageAlt`
that is inert/unreachable at render (decorative-image, product-card) — the requires-rule is
structurally inapplicable to five of the six blocks.

---

## Atom: svg-presentation

Bases: `SvgAnimation, SvgAnimationSpeed, SvgOpacity, SvgPosition, SvgMinHeight, SvgTextShadow`.
Shared helper: `plugins/sgs-blocks/src/components/media/controls/MediaSvgPresentationControls.js`.

**Control: Position (background/foreground)**

- **sgs/media** — **— none —** (SVG is the block's own primary element, not a
  layered background/foreground pass; no `svgPosition` attr). —
  `media/block.json` (absent)
- **sgs/before-after** — **— none —** (`beforeSvgContent`/`afterSvgContent` are raw markup
  fields only). — `before-after/block.json:245-254`
- **sgs/hero** — **— none —** on the split-media SVG tier (`splitSvg`/`Tablet`/`Mobile`,
  content-only). The SECTION background gets this control only via the shared
  `BackgroundPanel` (out of scope as a plain background). — `hero/block.json:366-377`
- **sgs/container** — `SelectControl`, options `[Background (behind content) | Foreground
  (above content)]`, bound to `bgSvgPosition` (default `"background"`, enum
  `["background","foreground"]`). Disclosure: only rendered when `bgSvgContent` is truthy.
  Arrives via the **shared extension `BackgroundPanel.js`** (also mounted by `sgs/hero`), not a
  block-private control. — `container/block.json:435-442`; `BackgroundPanel.js:488-498`
  (condition at `:486`)
- **sgs/decorative-image** — **— none —**. No `bgSvgContent`/SVG media type at all. —
  `decorative-image/block.json:24` (comment)
- **sgs/product-card** — **— none —**. No SVG `mediaType` exists.

**Control: Opacity**

- **sgs/media** — **— none —**. SVG panel offers only Animation + Animation speed. —
  `media/block.json:120-134`, `media/edit.js:872-923`
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —** on the split-media SVG tier. Section background gets it only via
  the shared `BackgroundPanel`.
- **sgs/container** — `RangeControl`, label "Opacity (%)", 0–100 step 5, bound to
  `bgSvgOpacity` (`number`, default `100`, no Tablet/Mobile siblings), disclosure: only when
  `bgSvgContent` truthy. Shared extension. — `container/block.json:462-465`;
  `BackgroundPanel.js:499-508`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

**Control: Animation**

- **sgs/media** — `SelectControl`, label "Animation", options `[None|Pulse|Float|Wave]`
  (values `none/pulse/float/wave`), bound to `svgAnimation` (default `"none"`). Block-private,
  shown only when `mediaType==='svg'`. No tiers, no hover. — `media/edit.js:872-898`;
  `block.json:120-129`
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —** on split-media SVG tier. Section background only via shared
  extension.
- **sgs/container** — `SelectControl`, identical `[None|Pulse|Float|Wave]` option set, bound to
  `bgSvgAnimation` (default `"none"`), disclosure: only when `bgSvgContent` truthy. Shared
  extension. — `container/block.json:443-452`; `BackgroundPanel.js:509-521`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

**Control: Animation speed**

- **sgs/media** — `SelectControl`, label "Animation speed", options `[Slow|Medium|Fast]`, bound
  to `svgAnimationSpeed` (default `"medium"`); disclosure: rendered only when `svgAnimation &&
  'none' !== svgAnimation`. — `media/edit.js:899-923`; `block.json:130-138`
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —** on split-media SVG tier.
- **sgs/container** — `SelectControl`, identical `[Slow|Medium|Fast]` options, bound to
  `bgSvgAnimationSpeed` (default `"medium"`); disclosure: only when `bgSvgAnimation !== 'none'`
  (nested inside the `bgSvgContent` gate). Shared extension. — `container/block.json:453-461`;
  `BackgroundPanel.js:522-535`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

**Control: Text shadow**

- **sgs/media** — **— none —**. No `svgTextShadow` attribute or toggle.
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —** (no equivalent on split-media SVG tier or elsewhere).
- **sgs/container** — `ToggleControl`, label "Text shadow", help "Adds a subtle shadow to inner
  text for readability over busy SVG layers.", bound to `bgSvgTextShadow` (boolean, default
  `false`); disclosure: inside the `bgSvgContent` gate. Shared extension. —
  `container/block.json:474-477`; `BackgroundPanel.js:536-542`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

**Control: Minimum height**

- **sgs/media** — **— none —**.
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —**.
- **sgs/container** — `SgsLengthControl` (`presets={false}`), label "Minimum height", help
  "Minimum height applied to the SVG background layer, e.g. 400px or 50vh. Leave blank for no
  minimum.", bound to `bgSvgMinHeight` (`string`, default `""`); disclosure: inside the
  `bgSvgContent` gate. Shared extension. — `container/block.json:466-469`;
  `BackgroundPanel.js:543-553`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

**Reference only — the SVG source field this atom sits on top of (not itself the atom):**

- sgs/media: `svgContent`/`Tablet`/`Mobile`, per-device art direction, `TextareaControl` gated
  per `ResponsiveControl` — `block.json:107-119`, `edit.js:774-871`
- sgs/before-after: `beforeSvgContent`/`afterSvgContent`, one `TextareaControl` per slot, no
  tiers, no presentation controls — `block.json:245-254`, `edit.js:344-358`
- sgs/hero: `splitSvg`/`Tablet`/`Mobile`, one `ResponsiveControl`-wrapped field, no presentation
  controls — `block.json:366-377`, `edit.js:672-710`
- sgs/container: `bgSvgContent`, single `TextareaControl`, no tiers —
  `block.json:431-434`, `BackgroundPanel.js:479-485`
- sgs/decorative-image / sgs/product-card: **— none —** (no SVG media type at all)

---

## Atom: object-fit

Bases: `ObjectFit, Size`. Types: image/video (explicitly NOT svg — object-fit does nothing to
inline svg). Scope: both — `element` vocabulary `[cover, contain, fill, none, scale-down]` vs
`backdrop` vocabulary `[cover, contain, auto]` (narrower). Shared helper:
`plugins/sgs-blocks/src/components/media/controls/ObjectFitField.js`.

- **sgs/media** — attribute `objectFit` (string, enum `["cover","contain","fill","none",
  "scale-down"]`, default `"cover"`). Editor control: rendered by the shared
  `<MediaElementPanel atoms={["object-fit","focal-point"]} .../>` (`edit.js:569-578`).
  `MediaSizingPanel`'s own "Fill style" row exists (label "Fill style", help "How the picture
  fills the box." / inert help "The box is the same shape as the picture, so there is nothing to
  fit or crop.") but is explicitly SUPPRESSED via `showFitControl={false}` (`edit.js:549`) in
  favour of the atom-layer panel — its value is still fed through purely to drive focal-point
  disclosure math. CSS: custom-property write via `SGS_Media_Element::style(...)`
  (`render.php:447-450`); render.php states object-fit is "OWNED BY THE ATOM LAYER" (a prior
  direct rule was removed for out-specificity'ing the atom rule, `render.php:294-300`). Tiers:
  none — single scalar. States: none. — `block.json:370-380`; `MediaSizingPanel.js:91-95,272,282-283,184`
- **sgs/before-after** — no per-slot attribute. Uses the universal `imageControls` extension's
  single BLOCK-LEVEL `sgsObjectFit` (string, default `''`) — one value shared by BOTH slots, no
  `beforeObjectFit`/`afterObjectFit`. Control: `SelectControl` "Object fit", help "How the
  image/video fills its box. Inherit leaves the block/CSS default untouched." — one shared
  control, not two. Mechanism: render.php emits ONE root-scoped custom property
  `--sgs-object-fit` on the block wrapper; style.css consumes it on the shared
  `.wp-block-sgs-before-after__img` class (matches BOTH `--before` and `--after` modifier
  elements identically). ⚠ **Because both slots share one selector and one CSS var, before and
  after CANNOT have different object-fit values** — the exact two-element-scoping failure mode
  named in `plugins/sgs-blocks/CLAUDE.md`'s 2026-08-31 note; no
  `sgs_media_element_scope_class()`/`sgs_media_element_style()` call exists anywhere in this
  block (confirmed by grep, zero matches) — the per-element scoping fix is NOT present here.
  Tiers: none. States: none. Disclosure: always visible. —
  `extensions/image-controls.js:203-216`; `before-after/render.php:267-273,279`;
  `style.css:63,346`
- **sgs/hero** — section background (out of scope): NO editor-controllable object-fit;
  `object-fit:cover;object-position:center` HARDCODED in style.css. `backgroundSize`
  (block.json enum `cover|contain|auto`, default `cover`) is declared but NEVER READ in
  render.php (0 grep matches) and has no editor control — a dead/orphan attribute. Split-media
  (in scope): `splitMediaObjectFit` (string, default `"cover"`, no enum in schema though
  render.php allowlists `fill|contain|cover|none`); editor control a `SelectControl` "Object
  fit" bound to `IMAGE_FIT_OPTIONS`. Render mechanism scoped to `.{uid}
  .sgs-hero__split-media--image,.sgs-hero__split-media--video` — **explicitly excludes the SVG
  tier's `<span>`** ("replaced-element properties do nothing on the SVG tier's `<span>`
  wrapper, so emitting them there would be a lie about what the property actually affects") —
  cited in `registry.js` as the correct scoping pattern to adopt. Emitted only if
  `'custom'!==$image_object_fit` (`'custom'` = sizing mode = explicit, handled by box-shape
  instead). Tiers: none on the fit value itself. States: none. — `style.css:100-101,139`;
  `block.json:702-710` (dead), `:486-489`; `edit.js:1307`; `render.php:619-629`
- **sgs/container** — attribute `backgroundSize` (string, enum `cover|contain|auto`, default
  `"cover"`) governs both the CSS-layer `background-size` AND, on the fast path, `object-fit` —
  no dedicated `objectFit` attribute. Editor control: `SelectControl` "Size", options
  Cover/Contain/Auto, shown only in the Image tab when `hasBgImage`. No separate Video/SVG size
  control at all. **Two render paths**, decided by `$sgs_bg_img_is_simple`: (a) `<img>` fast
  path (LCP optimisation) — only when `backgroundSize` is `cover`/`contain` (`auto`
  disqualifies it), no repeat/parallax/fixed-attachment/tier overrides — emits
  `object-fit:<backgroundSize>` scoped to `.sgs-container__image-bg`; (b) CSS `::before`
  media-layer path — used whenever the fast path is disqualified — emits
  `background-size:<backgroundSize>` on `.{uid}::before`. Video/SVG backgrounds have no
  object-fit-equivalent at all. Tiers: tablet/mobile image overrides swap the SOURCE but reuse
  the desktop `backgroundSize` value — no per-tier size attribute exists. States: none. —
  `container/block.json:260-268`; `BackgroundPanel.js:34-38,339-346`;
  `class-sgs-container-wrapper.php:1102-1119,1163-1166,1209,2523-2527`
- **sgs/decorative-image** — **— none —**. No `objectFit`/`object-fit` attribute anywhere.
  Raw `<img>`/`<video>` via `sgs_responsive_image()`/`sgs_render_media()` with no object-fit
  control at all. (In treated `fx-surface-treatment` mode the media gets a hardcoded
  `width:100%;height:auto` — unrelated to object-fit, not client-controllable.) —
  `decorative-image/render.php:378-460,388`
- **sgs/product-card** — TWO mechanisms coexist but only one is reachable. (1) The universal
  extension attribute `sgsObjectFit` IS injected (`extensions/image-controls.js:94`) — a
  `SelectControl` "Object fit" (Inherit/Cover/Contain/Fill/None/Scale down). Because
  product-card declares `imageControlsExplicit: true`, the AUTO-INJECTING `render_block`
  filter (`includes/image-controls.php`) is skipped for it — no class/CSS-var injection from
  that path. (2) Instead product-card's OWN render.php explicitly calls
  `sgs_media_position_css($attributes,'sgs',...)`, which reads `sgsObjectFit` and, if valid,
  emits `object-fit:<value>` scoped to
  `.{uid} .sgs-product-card__image, .{uid} .product-card-img, .{uid}
  .product-card__media .product-card-img`. **Separately, style.css HARDCODES `object-fit:
  cover` unconditionally** on `.product-card .product-card-img` and 3 other selectors — the
  scoped rule from `sgs_media_position_css()` overrides it only when a non-empty value is set;
  "Inherit" leaves the hardcoded `cover`. No tiers, no hover. Same behaviour in Typed vs Bound
  mode. — `product-card/render.php:246-250`; `helpers-media-position.php:58-81`; `image-controls.php:67-69`;
  `style.css:72,795,847,1021`

---

## Atom: focal-point

Bases: `ObjectPosition, Position, Repeat, Attachment`. Cross-attribute rule: `ObjectPosition
requires [ObjectFit: cover|contain|none|scale-down]`.

- **sgs/media** — attribute `objectPosition` (string, default `"center center"`). Editor
  control: same shared `<MediaElementPanel>` mount. `MediaSizingPanel`'s own "Focal point" row
  exists (label "Focal point", help "Which part stays visible when the picture is cropped." /
  inert variants) but is SUPPRESSED via `showFocalControl={false}` — the atom "owns Focal point
  on this block now" to avoid a duplicate writer (comment at `edit.js:550-555`). CSS: same
  atom-layer call as object-fit; render.php states object-position is "OWNED BY THE ATOM LAYER
  (focal-point atom)" and deliberately not emitted directly. Tiers: none — single scalar. —
  `block.json:381-384`; `MediaSizingPanel.js:296,307-308,179-183,98`; `render.php:302-303`
- **sgs/before-after** — no per-slot attribute. Same universal-extension mechanism as
  object-fit — single BLOCK-LEVEL `sgsObjectPosition` (object `{x,y}` floats 0-1, default
  `{}`). Control: `FocalPositionField` "Object position", help "Drag the crosshair to control
  which part of the image stays visible when it is cropped." — one shared control. The
  extension's preview-thumbnail heuristic looks for `imageUrl`/`mediaUrl`/`url`/
  `backgroundImage`/`src` — none of these attribute names exist on `sgs/before-after` (which
  uses `beforeImageUrl`/`afterImageUrl`), so the picker's preview renders with no background
  image. Mechanism: render.php emits ONE root-scoped `--sgs-object-position` custom property,
  consumed by the same shared `.wp-block-sgs-before-after__img{object-position:
  var(--sgs-object-position,center)}` selector — again both slots share one value. Tiers: none.
  — `extensions/image-controls.js:92,128-134,193-202`; `render.php:270,275-276`; `style.css:64`
- **sgs/hero** — section background (out of scope): `backgroundPosition` declared but NEVER
  READ in render.php — dead attribute, no editor control; the rendered `<img>` is hardcoded
  `object-position:center`. Split-media (in scope): `splitMediaObjectPosition` (desktop,
  default `"center center"`) + `Tablet` (default `""`) + `Mobile` (default `"center 20%"`) —
  image tier only (no video/svg-specific position attrs). Editor: a
  `FocalPointPicker`-style control converting object-position via
  `objectPositionToFocalPoint`/`focalPointToObjectPosition`
  (`src/utils/objectPosition.js`), wired to desktop/tablet/mobile keys. Render: emitted on the
  same `--image,--video` selector as object-fit (unconditional on fit mode), sanitised
  (letters/digits/%/./-/whitespace only). Tablet override wrapped in `@media(max-width:1023px)`.
  — `block.json:688-691,490-493,382-385,378-381`; `style.css:101`; `edit.js:1310-1350`;
  `render.php:630-640,140`
- **sgs/container** — attribute `backgroundPosition` (string, default `"center center"`) — a
  9-point PRESET vocabulary, not an XY coordinate. Editor control: `SelectControl` "Position",
  options `[Centre centre / Top centre / Bottom centre / Centre left / Centre right / Top left /
  Top right / Bottom left / Bottom right]` — 9 fixed presets, no free-drag focal-point picker.
  Shown only in Image tab, gated on `hasBgImage`. Render: same dual-path split as object-fit —
  `<img>` fast path emits `object-position:<value>`; `::before` path emits
  `background-position:<value>`. Video/SVG have no position control. Tiers: tablet/mobile image
  overrides reuse the base position value — no per-tier position attribute. States: none. —
  `container/block.json:269-272`; `BackgroundPanel.js:40-50,347-354`;
  `class-sgs-container-wrapper.php:1166,1210,2524,2527`
- **sgs/decorative-image** — **— none —** as a focal-point-within-a-box control. Instead the
  block positions the WHOLE element (not image content within a box) via `positionX`/`positionY`
  tier-object attrs (default `{"desktop":50}`), rendered as absolute `left`/`top` percentages
  combined with `transform:translate(-50%,-50%)` to centre-anchor. Editor control:
  `ResponsiveOverride`-wrapped `RangeControl` 0-100 step 1, labels "Position X (%)" / "Position
  Y (%)", under "Responsive Overrides". Tiers: desktop/tablet/mobile via the tier object;
  tablet/mobile values are read into `data-position-x-tablet` etc. attrs but — per the block's
  own style.css comment and render.php comment — **these data attrs are NOT wired to any
  CSS/JS consumer**, a documented pre-existing gap. — `block.json:82-89`; `edit.js:382-447`;
  `render.php:107-108,113-114,156-157,145,204-221,71-74`; `style.css:31-33`
- **sgs/product-card** — attribute `sgsObjectPosition` (object `{x,y}` floats 0-1, default
  `{}`, injected by the universal extension). Editor control: `FocalPositionField` "Object
  position", same help copy as before-after; defaults to `{x:0.5,y:0.5}` when unset; preview
  thumbnail heuristic checks `imageUrl`/`mediaUrl`/`url`/`backgroundImage`/`src` — none of which
  product-card uses (it uses `image`, a bare URL string) — so the picker likely shows **no
  preview thumbnail**. Same explicit-mechanism opt-out as object-fit: product-card's own
  render.php calls `sgs_media_position_css()`, which converts via
  `sgs_media_position_focal_to_css()` to a `"X% Y%"` string, returns `''` at the CSS default
  centre/centre (nothing emitted for unset/default), otherwise emits `object-position:X% Y%` on
  the same selector list as object-fit. No tiers, no hover, identical Typed/Bound behaviour. —
  `extensions/image-controls.js:92,128-134,153-162,193-202`; `render.php:246-250`;
  `helpers-media-position.php:31-41`

---

## Atom: box-shape

Bases: `MediaSizing, AspectRatio, Shape, Height, HeightUnit, MaxHeight, MaxHeightUnit, MaxWidth,
MaxWidthUnit, MaxWidthPercent, MinHeight, Width, WidthUnit`. Cross-attribute rules: `Height
requires [MediaSizing:height]`, `AspectRatio requires [MediaSizing:ratio]` — three sizing modes
(auto/height/ratio) are mutually exclusive. Vocabularies: ratio = `['1 / 1','4 / 3','3 / 2',
'16 / 9','21 / 9','3 / 4','2 / 3','9 / 16']`; shape = `['none','rounded','circle','square']`;
sizing = `['auto','height','ratio']`. Shared helpers:
`plugins/sgs-blocks/src/components/media/controls/MediaBoxShapeControls.js`,
`plugins/sgs-blocks/src/components/MediaSizingPanel.js`.

- **sgs/media** — **NO rounded/circle/square/none shape-clip vocabulary exists for this
  block.** What exists instead is a SIZING-MODE picker (a different concept —
  `MediaSizingPanel` labels it "Box shape" but it means auto/fixed-height/aspect-ratio, not a
  clip shape) plus a separate border-radius control:
  - **Sizing mode** — attribute `mediaSizing` (string, enum `["auto","height","ratio"]`, no
    `default` key — deliberate, derived server/client-side identically when absent). Control:
    `ToggleGroupControl` "Box shape", options Auto/"Fixed height"/"Aspect ratio", help "Auto
    follows the picture. Fixed height and Aspect ratio each set the box, then the picture fills
    it." Mounted via `<MediaSizingPanel mode={resolvedMediaSizing} .../>`.
  - **Border-radius** (a DIFFERENT property from box-shape) — native
    `__experimentalBorder.radius` (base, `__experimentalSkipSerialization:true`) plus SGS
    tier-object attrs `borderRadiusTablet`/`Mobile` (default `{}`). Control: one `ToolsPanelItem`
    "Border radius" wrapping `ResponsiveBorderRadiusControl`, all three tiers.
  - **Ratio row** — label "Ratio", help "The box always keeps this shape, at every width." /
    inert variants when not in ratio mode; options 16/9 widescreen, 21/9 cinematic, 4/3 classic,
    1/1 square, 3/4 portrait, 9/16 vertical; writes native `style.dimensions.aspectRatio`;
    rendered only when `mediaSizing==='ratio'`.
  - Tiers: sizing mode itself has none (one scalar); Height sub-control is tiered via the
    height/tier-object mechanism; Ratio has none; Border-radius tiered as a native base + 2
    custom attrs (not a unified tier object). Disclosure: Height and Ratio rows always RENDER
    but go visually inert/disabled-styled when the other mode is active — they do not hide.
    Border-radius `ToolsPanelItem` shows/hides per the standard optional-item pattern. — 
    `block.json:77-83,385-401`; `edit.js:523-557,580-629`;
    `MediaSizingPanel.js:104-106,195-210,202,82-87,247,259-262,179-183,181-183,232-238`;
    `render.php:88-91,339-348,358-369,537-549`
- **sgs/before-after** — block-private FRAME-level attribute, not per-slot and not part of the
  `imageControls` extension. `borderRadius`/`Tablet`/`Mobile` (box-family object type, defaults
  `{}`). Control: `SgsBorderControl`'s `radiusValues`/`onRadiusChange` inside the "Border"
  `PanelBody` — one shared control covering all three tiers (a prior duplicate WP-native
  `style.border.radius` control was removed because it wrote an undeclared attribute WordPress
  silently discarded). Mechanism: base radius applies via `wp_style_engine_get_styles()`
  (currently guarded by an always-empty args array, so NO CSS is emitted for the desktop tier
  through that path); tablet/mobile emitted directly via `sgs_corner_object_shorthand()` inside
  `@media`. This radius applies to the WHOLE outer FRAME, not to either media slot individually
  — no per-slot clip/mask/corner-radius shape exists. (Unrelated hardcoded `border-radius:50%`
  on circular UI chrome and a fixed pill radius elsewhere in style.css, not client-controllable
  box-shape.) Tiers: yes, desktop/tablet/mobile. States: none. — `block.json:25-30`;
  `edit.js:739-761,765-773`; `render.php:177-185,198-205`; `style.css:239,367,184`
- **sgs/hero** — section background (out of scope): no width/height control — `<img>` is
  forced `width:100%;height:100%;position:absolute;inset:0`, always fills the section. Split-media
  (in scope): `splitMediaWidth`/`Tablet`/`Mobile` (type `number`, no default) +
  `splitMediaWidthUnit` (default `"%"`) — a NUMBER+unit pair, not a tier object.
  `splitMediaHeight` (type `object`, default `{}` — a genuine tier object `{desktop,tablet,
  mobile}`) + `splitMediaHeightUnit` (default `"px"`). Editor: width shown only when
  `splitMediaObjectFit==='custom'` — a `RangeControl` for width (tiers, min 0 max 1200) plus a
  unit toggle; height has its own `ResponsiveBoxControl`/unit control, NOT gated on the
  object-fit mode. Render: width emitted ONLY `if('custom'===$image_object_fit)` — this IS the
  disclosure gate: `'custom'` turns object-fit off and hands sizing to explicit width/height.
  Height is emitted UNCONDITIONALLY, deliberately outside the custom gate (de-duplicated from a
  removed `splitImageHeight` family — must stay ungated or existing non-custom instances would
  silently lose their height). — `style.css:95-99`; `block.json:494-514`; `edit.js:1361-1374`;
  `render.php:645-674`
- **sgs/container** — **— none — for the background layer itself.** No sizing-mode/
  ratio/shape/height control exists for the background media as an independently shaped box —
  it paints whatever box the container's own layout (padding/width/minHeight) defines. The only
  adjacent box-like control is `bgSvgMinHeight` (string, default `""`), SVG-specific: control
  `SgsLengthControl`, label "Minimum height", help "Minimum height applied to the SVG background
  layer, e.g. 400px or 50vh.", gated on `bgSvgContent` non-empty — a minimum-height FLOOR for
  the SVG layer, not an object-fit/shape control. The block-level `minHeight` attribute (object,
  tier-based) sets the CONTAINER's own overall min-height via the OUTER layer, not a
  media-box-shape atom. — `block.json:466-469,369-372`; `BackgroundPanel.js:543-553,486`
- **sgs/decorative-image** — two attributes govern the box's size: `width` (tier object,
  default `{"desktop":200}`) in pixels, and `maxWidthPercent` (type `number`, default `20`) as
  a BARE PERCENTAGE (confirmed — plain `"type":"number"`, no unit pair). Editor controls: `width`
  via `RangeControl` "Width (px)" min 50 max 800 step 10 in the "Size" panel, ALSO
  independently overridable per-tier via `ResponsiveOverride` "Width (px)" in "Responsive
  Overrides" (same range); `maxWidthPercent` via `RangeControl` "Max Width (% of parent)" min 0
  max 50 step 1, desktop-only, no tier object. Render: both emitted into the single root
  compound-selector rule `.{uid}.sgs-decorative-image{...}`. **Naked mode confirmed** — this
  block has NO wrapper element; each tier is a sibling `<img>` needing its own uid, toggle
  selectors are COMPOUND (`.{uid}.sgs-decorative-image--mobile`), never descendant. Tier
  support for `width` only (desktop/tablet/mobile via tier object + `ResponsiveOverride`);
  `maxWidthPercent` has no tier variant. No hover/other state. Gating: none — always rendered
  when media exists. — `block.json:90-97`; `edit.js:199-218,449-479`;
  `render.php:130,154-164,275-280,355-360`
- **sgs/product-card** — **No box-shape mechanism from the universal extension is used**, even
  though it's injected. `sgsMaxWidth`/`sgsHeightDesktop`/`Tablet`/`Mobile`/`sgsHeightUnit` ARE
  injected as attributes and the editor panel renders their controls (Max width `TextControl`,
  Height unit `SelectControl`, per-breakpoint `RangeControl` via `ResponsiveControl`) — **but
  because product-card opts out of the auto-injecting `render_block` filter
  (`imageControlsExplicit: true`), none of these five attributes is ever read by product-card's
  own render.php or style.css** (confirmed: zero matches for all five names). ⚠ **They are dead
  controls for this block specifically** — editable in the inspector, stored on save, never
  rendered; exactly the class `check-dead-controls.js` is meant to gate, invisible here because
  the panel is shared code shown on every `imageControls`-supporting block. Instead
  product-card's ACTUAL mechanism is block-private, non-tiered: `imageHeight` (type `string`,
  default `''`, description "Override the product image box height (e.g. 180px, 16rem). Empty =
  use theme default (220px)."). Control: plain `TextControl` "Image height", help "Height of the
  product image box (e.g. 180px, 16rem). Leave empty to use the theme default (220px)."
  Render: sanitised via `sanitize_text_field()`, emitted as an inline CSS custom property
  `--sgs-product-card-image-height` in the block's per-instance inline style; consumed by
  style.css at 3 locations via `height: var(--sgs-product-card-image-height, 220px)`. **No unit
  control, no tier/responsive object shape — a single flat string**, unlike the extension's
  tier-object trio. No hover. `cardMaxWidth` is the width-side analogue, block-private in the
  same way. Same mechanism in Typed and Bound mode. — `image-controls.js:217-271`;
  `product-card/block.json:391-395,386-390`; `edit.js:2134-2147`;
  `render.php:74,143`; `style.css:71,747,1020`

---

## Atom: overlay

Bases: `OverlayColour, OverlayColourHover, OverlayGradient, OverlayGradientHover,
OverlayOpacity, OverlayBlendMode`. Cross-attribute rules: `OverlayOpacity requires
[OverlayColour|OverlayGradient]`, `OverlayBlendMode requires [OverlayColour|OverlayGradient]`.
Shared helper: `plugins/sgs-blocks/src/components/media/controls/MediaOverlayControls.js`.

⛔ **Scope note.** A plain background overlay is out of scope everywhere except `sgs/container`
(which owns the shared `BackgroundPanel` mechanism). `sgs/hero`'s in-scope instance is its
SPLIT-MEDIA overlay (a media-attached tint), not its section-background overlay.

**Control: Overlay colour / gradient (paired swatch+gradient row, normal state)**

- **sgs/media** — **— none —**. No overlay attribute or control of any kind exists (grep of
  block.json/edit.js/render.php for "overlay" returns nothing).
- **sgs/before-after** — **— none —**.
- **sgs/hero** — split-media element (in scope): `GradientOverlayControl` with
  `solidLabel="Media overlay colour"`, reading/writing `mediaOverlayColour` (no default) /
  `mediaOverlayGradient` (default `""`). **No hover siblings supplied**, so the control renders
  exactly ONE state row (hover only appears when the caller supplies a hover attr name). ⛔
  **Bypasses the shared CSS emitter `sgs_overlay_decls()`** — confirmed: the section-level
  overlay explicitly calls `sgs_overlay_decls(...)`, but the media overlay is hand-built inline
  via direct string concatenation with **no opacity or blend-mode term at all**. — `edit.js:824-830`;
  `block.json:564-570`; `render.php:712,715,1098,1297-1305`
- **sgs/container** — `GradientOverlayControl`, `solidLabel="Overlay colour"`, reading/writing
  `backgroundOverlayColour` (no default) / `overlayGradient` (default `""`), **with hover
  siblings** `backgroundOverlayColourHover`/`overlayGradientHover` — renders as Normal/Hover
  TABS inside one popover. `enableAlpha={false}` on the solid swatch (alpha deliberately
  disabled — transparency delegated to the separate Overlay-opacity control),
  `gradientEnableAlpha` on. Colour always resolves through `sgs_overlay_decls()`. Shared
  extension (`BackgroundPanel.js`), also mounted identically by `sgs/hero`'s SECTION background
  (out of scope). — `BackgroundPanel.js:150-154,161-171`; `block.json:291-293,305-314`;
  `class-sgs-container-wrapper.php:1746`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**. The only "overlay" hits are an unrelated
  FEATURED-BADGE overlay (a text badge absolutely positioned over the media box) — not a
  colour/gradient tint atom instance, ruled out. — `render.php:664-705`

**Control: Overlay opacity**

- **sgs/media** — **— none —**.
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —** on the media overlay — no `mediaOverlayOpacity` sibling
  anywhere (confirmed by grep). This is the registry-flagged gap: the SECTION-level overlay
  does get opacity (out of scope here); the split-media overlay has no opacity control at all —
  a dead spot the cross-attribute rule can never enforce because the control doesn't exist to be
  gated.
- **sgs/container** — `RangeControl`, label "Overlay opacity (%)", wrapped in
  `ResponsiveControl` — genuinely tiered per device: desktop writes `backgroundOverlayOpacity`
  (default `30`), tablet/mobile write `Tablet`/`Mobile` siblings (no default, fall back to
  desktop when unset). Help text differs per tier (desktop explains dimming; tablet/mobile
  explain the inherit-when-unset behaviour). Range 0–100 step 1, `allowReset`. ⚠ **NOT gated
  behind `OverlayColour`/`OverlayGradient` presence** — no `disabled`/`aria-disabled` wrapper
  exists around this control (contrast with the shared atom's OWN `MediaOverlayControls.js`,
  which DOES wrap it in `aria-disabled={paintDisabled}`) — so on `sgs/container` this control
  stays live and paintable even with no colour/gradient set, exactly the "dead control" shape
  the registry's cross-attribute rule exists to prevent, unenforced here. Shared extension. —
  `block.json:294-304`; `BackgroundPanel.js:161-213,184-203`; `MediaOverlayControls.js:63-75`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

**Control: Overlay blend mode**

- **sgs/media** — **— none —**.
- **sgs/before-after** — **— none —**.
- **sgs/hero** — **— none —** on the media overlay (no `mediaOverlayBlendMode` attribute).
  Same registry-flagged gap as opacity; section-level `backgroundOverlayBlendMode` exists but is
  out of scope.
- **sgs/container** — `SelectControl`, label "Overlay blend mode", help "How the overlay colour
  mixes with the image or video behind it.", 12-value option set verbatim — `Normal(normal) /
  Multiply(multiply) / Screen(screen) / Overlay(overlay) / Darken(darken) / Lighten(lighten) /
  Colour dodge(color-dodge) / Colour burn(color-burn) / Soft light(soft-light) / Hard
  light(hard-light) / Difference(difference) / Exclusion(exclusion)`, bound to
  `backgroundOverlayBlendMode` (default `"normal"`). ⚠ **Also NOT gated** behind colour/gradient
  presence — same finding as opacity, no `disabled`/`aria-disabled` wrapper. Shared extension. —
  `BackgroundPanel.js:69-82,220-233`; `block.json:316-330`
- **sgs/decorative-image** — **— none —**.
- **sgs/product-card** — **— none —**.

---

## What this document does NOT do

No recommendation, no "best of breed" column, no code changes. Per the brief: once Bean has
picked a reference implementation per control, the follow-up work is (1) checking whether the
existing helper files in `src/components/media/controls/` already match the chosen shape
exactly, or need rebuilding, and (2) extracting the three controls that are currently inline
with no helper file at all — `meaning` (CheckboxControl + TextControl), `source`
(TextareaControl for SVG), and `video-behaviour`'s six playback toggles.
