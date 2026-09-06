# M3 — Background media panel evidence report (READ-ONLY)

Scope: the shared `BackgroundPanel` (`src/blocks/container/components/BackgroundPanel.js`,
616 lines) and its render-side consumer `class-sgs-container-wrapper.php`. No files edited.

## Method note

Expected population declared before counting: 8 mount sites for `<BackgroundPanel>` (matches
the file's own D717 comment, "reaches all eight blocks that mount this panel"). Found and
verified below. Positive control for "enum absent" claim: `sgs/media`'s real `mediaType` enum
(file:line below) — proves the search method finds an enum where one exists, so its absence
elsewhere is not a search failure.

---

## Verdict 1 — "No media-type enum at all" — CONFIRMED

`BackgroundPanel.js:84-112` destructures attributes directly; there is no `backgroundType` /
`bgMediaType` attribute anywhere in the panel or in any of the 8 host blocks' `block.json`
(verified: `container/block.json` declares 30 `bg*`/`background*` scalar/object attrs, zero of
them an enum switching between image/video/svg).

Instead, image / video / SVG are **three independent, simultaneously-declared attribute
families**, and the editor UI switches between them with an ordinary `<TabPanel>`
(`BackgroundPanel.js:234-239`, tabs `image`/`video`/`svg` — a purely visual/editing-time
grouping, not a stored choice). All three can hold data at once; render-time precedence is
resolved by **existence checks**, not a selector:

- Video beats image: `class-sgs-container-wrapper.php:1129` — `if ( $has_bg_image &&
  ! $has_bg_video && $sgs_bg_img_is_simple )`, and `:1601` `if ( $has_bg_image &&
  ! $has_bg_video )`. A block with both a background image AND a background video set will
  always render the video; the image is silently unused with no editor warning.
- SVG is not mutually exclusive with either — it is an independently-composable overlay/underlay
  layer, gated only by `bg_svg_position` (`background` vs `foreground`):
  `class-sgs-container-wrapper.php:2842-2843` — `$svg_bg_html = ( $has_bg_svg && 'background'
  === $bg_svg_position ) ? $svg_html : ''`. An operator can have an image AND an SVG decoration
  layered together; that is legitimate, not a bug.

**Positive control — the enum mechanism exists and the search method finds it:**
`sgs/media/block.json:85-91` declares a real `mediaType` enum (`"enum": ["image","video","svg"]`,
default `"image"`), and `src/blocks/media/edit.js:135-137,238-253` reads it (`isImage`/`isVideo`/
`isSvg`) and writes it via three `Button`/click handlers (`setAttributes({ mediaType: 'video' })`
etc.). This is the shape Bean is describing as absent from the background panel — confirmed
absent there, confirmed present here.

**Which media types the background panel supports:** all three (image, video, SVG) — just not
through a switch. This is a genuine functional gap versus `sgs/media`, not merely a stylistic
one: two media sources (image + video) can be authored at once with no editor indication of
which one will actually render, and there's no way to force "no background" other than clearing
every attribute in that family.

---

## Verdict 2 — The art-direction notice — CONFIRMED, exact text + trigger captured

**Not a toast/Notice component — inline italic text inside the tier switcher.** It does not fire
"on select/upload" as an alert; it is a static message shown whenever the device tier switcher
is on **Desktop** and a base image (or base video) already exists.

### Image tab
`BackgroundPanel.js:287-299`

```jsx
{ hasBgImage && (
<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
  { ( bp ) => {
    if ( 'desktop' === bp ) {
      return (
        <p style={ { margin: 0, fontStyle: 'italic' } }>
          { __( 'The image above is used on desktop. Switch to tablet or mobile to set a different crop.', 'sgs-blocks' ) }
        </p>
      );
```

- **Component:** a plain `<p>` with `fontStyle: 'italic'`, rendered inside `<ResponsiveControl>`'s
  render-prop, itself inside a `hasBgImage &&` gate (`hasBgImage = !! backgroundImage?.url`,
  line 114).
- **Exact wording:** "The image above is used on desktop. Switch to tablet or mobile to set a
  different crop."
- **Trigger condition:** base `backgroundImage` is set AND the global device-tier toggle
  (`src/blocks/extensions/responsive-device-toggle.js`) is on `desktop`. It disappears the moment
  no base image exists (the whole `ResponsiveControl` block is unmounted, line 287 gate), and
  is REPLACED by the actual tablet/mobile picker + "Use the main image here" reset button when the
  toggle is on tablet/mobile (lines 300-332).

### Video tab (near-identical pattern)
`BackgroundPanel.js:418-430`

```jsx
{ bgVideo?.url && (
<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
  { ( bp ) => {
    if ( 'desktop' === bp ) {
      return (
        <p style={ { margin: 0, fontStyle: 'italic' } }>
          { __( 'The video above is used on desktop. Switch to tablet or mobile to set a different one.', 'sgs-blocks' ) }
        </p>
      );
```

- **Exact wording:** "The video above is used on desktop. Switch to tablet or mobile to set a
  different one."
- **Trigger:** `bgVideo?.url` truthy AND device toggle on desktop.

**SVG tab has no equivalent** — `bgSvgContent`/`Tablet`/`Mobile` do not exist; SVG has no
per-device art-direction at all (confirmed: `grep` for `bgSvgContentTablet` returns nothing in
`block.json` or `BackgroundPanel.js`).

**Reusability note for standardising this pattern elsewhere:** the mechanism is 3 ingredients —
(1) a `hasBase && (...)` gate, (2) a `<ResponsiveControl>` whose render-prop special-cases
`bp === 'desktop'` to show the italic reminder instead of a picker, (3) the tablet/mobile branch
showing a picker + a "Use the main X here" destructive-styled `Button` that clears the tier
override. This exact shape is also used, independently, by `sgs/media`'s own art-direction
control (`BackgroundPanel.js:252` comment cross-references it) and `sgs/decorative-image` (per
CLAUDE.md's Spec 35 Part D5 reference) — so it is already a semi-standard, just not extracted
into a shared component.

---

## Verdict 3 — "Split media has much more functionality" — CONFIRMED, itemised gap list

Full side-by-side against `sgs/media`'s "Media Styling" panel
(`src/blocks/media/edit.js:400-670`), which is the fullest media-element control set in the
plugin:

| Capability | `sgs/media` (full media element) | Background panel |
|---|---|---|
| Object-fit | Explicit `SelectControl`/`FocalPointPicker` prop `objectFit`, editor-controlled (`edit.js:535`) | **No control.** Derived automatically at render from `backgroundSize` (`cover`/`contain`/`auto`) only when the image happens to render as a real `<img>` (the "first on page" LCP path) — `class-sgs-container-wrapper.php:1165` `object-fit:' . esc_attr( $bg_size )`. `auto` has no `object-fit` equivalent, so that Size option silently does nothing on the `<img>` path (line ~1106 comment: "object-fit can express" only cover/contain). |
| Object-position | Real `FocalPointPicker` free-drag control (`edit.js:537-538`, `focalPoint`/`onFocalPointChange`) | **No free positioning.** A fixed 9-value `SelectControl` (`BG_POSITION_OPTIONS`, lines 40-50: corners/edges/centre only) — cannot express any position off that 3x3 grid. |
| Focal point | Yes (see above) | **Missing entirely.** |
| Aspect ratio / box shape | Native `style.dimensions.aspectRatio` (`edit.js:509-531`) | **Missing entirely** — no aspect-ratio attribute or control anywhere in `BackgroundPanel.js` or the `bg*` attribute set. |
| Padding (of the media itself) | N/A on `sgs/media` directly, but `sgs/decorative-image` and others expose it; background media has no analogue at all | **Missing** — no `bgPadding` family; only the *container's* own padding exists, unrelated to the media element. |
| Border radius | Tiered `borderRadius`/`borderRadiusTablet`/`borderRadiusMobile` via `SgsBorderControl` (`edit.js:543-591`) | **Missing entirely** — no border-radius attribute for the background image/video layer. |
| Per-tier overrides (size/position/repeat/attachment) | N/A (comparison is structural) | **Partial.** Only the MEDIA SOURCE (`backgroundImage`/`Tablet`/`Mobile`, `bgVideo`/`Tablet`/`Mobile`) and overlay opacity (`backgroundOverlayOpacity`/`Tablet`/`Mobile`) are tiered. `backgroundSize`/`backgroundPosition`/`backgroundRepeat`/`backgroundAttachment` are declared as single flat scalars (`container/block.json`) with NO tablet/mobile siblings — a tablet art-directed crop still inherits the desktop Size/Position/Repeat, which can crop wrongly on a differently-shaped tier image. |
| Lazy-load | Explicit `ToggleControl` "Lazy Load" for video (`edit.js:1427`) | **No client control at all.** `loading` is computed automatically and silently: `class-sgs-container-wrapper.php:1140,1151` — `$sgs_bg_img_is_first = 1 === sgs_next_background_image_index(); 'loading' => $sgs_bg_img_is_first ? 'eager' : 'lazy'`. No operator override exists (correct for LCP by default, but not adjustable, and CSS-`background-image` path bypasses `loading` entirely since it isn't an `<img>`). |
| Video behaviour (autoplay/loop/muted/controls/playsinline) | 6 explicit `ToggleControl`s: Autoplay, Loop, Muted, Show Controls, Plays Inline (iOS), Lazy Load (`edit.js:1245-1445`) | **Zero controls — all hardcoded in PHP.** `class-sgs-container-wrapper.php:1703,1715` emit `<video class="sgs-container__video-bg" autoplay loop muted playsinline preload="none" aria-hidden="true">` unconditionally. No poster attribute either (`grep poster` returns nothing in either the wrapper class or `BackgroundPanel.js`) — `sgs/media` supports a poster image, background video does not. |
| Opacity (of the media itself, distinct from the overlay) | Explicit `RangeControl` "Opacity" (`edit.js:629-647`) | **Missing** — only overlay opacity exists (a scrim colour's opacity, not the media's own). |
| Box shadow | Explicit control (`edit.js:648-666`) | **Missing entirely.** |

**Summary of the gap:** the background panel is essentially a two-axis control (source + a
coarse size/position/repeat/attachment quad) plus modifiers (Ken Burns/parallax) and an overlay
scrim — it has no equivalent of `sgs/media`'s fine media-element controls (focal point, aspect
ratio, radius, opacity, shadow, video playback). Bean's characterisation is accurate and,
if anything, understates it: video behaviour isn't merely "less" — it is entirely non-adjustable
by the client.

---

## Full inventory

Representative host: `sgs/container` (all 30 `bg*`/`background*` scalar/object attrs, plus 2
more under the `overlay*` prefix consumed via `GradientOverlayControl`, for 32 total in the
background-media family). Verified via `container/block.json` (python `json.load`, exhaustive
key scan) cross-referenced against `BackgroundPanel.js` destructuring + JSX.

| Attribute | Control component | Panel/location | Order (within panel, top→bottom) | Gated on | Paints | Applies to |
|---|---|---|---|---|---|---|
| `backgroundOverlayColour` | `GradientOverlayControl` → `DesignTokenPicker` | Background panel, above tabs | 1 | always visible | overlay scrim colour | all (image/video/none) |
| `overlayGradient` | `GradientOverlayControl` (Solid/Gradient toggle) | Background panel, above tabs | 1 (same row) | always visible | overlay scrim gradient | all |
| `backgroundOverlayColourHover` | `GradientOverlayControl` (Hover tab) | Background panel, above tabs | 1 (same row, Hover tab) | always visible | hover-state scrim colour | all |
| `overlayGradientHover` | `GradientOverlayControl` (Hover tab) | Background panel, above tabs | 1 (same row) | always visible | hover-state scrim gradient | all |
| `backgroundOverlayOpacity` | `RangeControl` inside `ResponsiveControl` | Background panel, above tabs | 2 | always visible | overlay opacity, desktop | all |
| `backgroundOverlayOpacityTablet` | same, tier branch | Background panel, above tabs | 2 | always visible (tier picker) | overlay opacity, tablet | all |
| `backgroundOverlayOpacityMobile` | same, tier branch | Background panel, above tabs | 2 | always visible (tier picker) | overlay opacity, mobile | all |
| `backgroundOverlayBlendMode` | `SelectControl` | Background panel, above tabs | 3 | always visible | `mix-blend-mode` on overlay | all |
| `backgroundImage` | `MediaUpload`/`Button` | Background panel → Image tab | 4 | Image tab selected | base bg image | image |
| `backgroundImageTablet` | `MediaUpload`/`Button` in `ResponsiveControl` | Background panel → Image tab | 5 | `hasBgImage` (base set) AND tier=tablet | tablet art-direction | image |
| `backgroundImageMobile` | `MediaUpload`/`Button` in `ResponsiveControl` | Background panel → Image tab | 5 | `hasBgImage` AND tier=mobile | mobile art-direction | image |
| `backgroundSize` | `SelectControl` (cover/contain/auto) | Background panel → Image tab | 6 | `hasBgImage` | `background-size` / `object-fit` | image |
| `backgroundPosition` | `SelectControl` (9-point grid) | Background panel → Image tab | 6 | `hasBgImage` | `background-position` / `object-position` | image |
| `backgroundRepeat` | `SelectControl` | Background panel → Image tab | 6 | `hasBgImage` | `background-repeat` (CSS path only — no effect on `<img>` path) | image |
| `backgroundAttachment` | `SelectControl` (Scroll/Fixed) | Background panel → Image tab | 6 | `hasBgImage` | `background-attachment` (CSS path only) | image |
| `bgVideo` | `MediaUpload`/`Button` | Background panel → Video tab | 7 | Video tab selected | base bg video | video |
| `bgVideoTablet` | `MediaUpload`/`Button` in `ResponsiveControl` | Background panel → Video tab | 8 | `bgVideo?.url` AND tier=tablet | tablet art-direction | video |
| `bgVideoMobile` | `MediaUpload`/`Button` in `ResponsiveControl` | Background panel → Video tab | 8 | `bgVideo?.url` AND tier=mobile | mobile art-direction | video |
| `bgSvgContent` | `TextareaControl` | Background panel → SVG tab | 9 | SVG tab selected | raw SVG markup | svg |
| `bgSvgPosition` | `SelectControl` (background/foreground) | Background panel → SVG tab | 10 | `bgSvgContent` non-empty | z-order (behind/above content) | svg |
| `bgSvgOpacity` | `RangeControl` | Background panel → SVG tab | 10 | `bgSvgContent` non-empty | SVG layer opacity | svg |
| `bgSvgAnimation` | `SelectControl` (none/pulse/float/wave) | Background panel → SVG tab | 10 | `bgSvgContent` non-empty | CSS animation class | svg |
| `bgSvgAnimationSpeed` | `SelectControl` (slow/medium/fast) | Background panel → SVG tab | 10 | `bgSvgContent` non-empty AND animation≠none | animation-duration | svg |
| `bgSvgTextShadow` | `ToggleControl` | Background panel → SVG tab | 10 | `bgSvgContent` non-empty | text-shadow on inner content | svg |
| `bgSvgMinHeight` | `SgsLengthControl` | Background panel → SVG tab | 10 | `bgSvgContent` non-empty | min-height of SVG layer | svg |
| `bgKenBurns` | `ToggleControl` | Background panel, below tabs (modifiers) | 11 | always visible (help text says "requires a background image" but NOT enforced) | slow-zoom animation class | image only (see finding below) |
| `bgParallax` | `ToggleControl` | Background panel, below tabs | 11 | always visible (same caveat) | fixed-attachment parallax | image only |
| `bgAnimationDuration` | `RangeControl` | Background panel, below tabs | 12 | `bgKenBurns` true | animation-duration for Ken Burns | image only |

Not part of this panel (controlled by the separate base-colour/`SgsColourPanel` mechanism,
correctly out of scope per the panel's own help text at `BackgroundPanel.js:136-141`):
`backgroundColour`, `backgroundColourGradient`, `backgroundColourHover`,
`backgroundColourHoverGradient`.

### Declared-but-uncontrolled: 0 (on `sgs/container`)

Every one of the 30 `bg*`/`background*` attrs plus the 2 `overlay*` attrs on `sgs/container` has
a live editor control inside `BackgroundPanel.js` or `GradientOverlayControl.js`. No dead
controls found in this family for this block.

### Controls that appear when irrelevant — 1 confirmed

`bgKenBurns` and `bgParallax` (`BackgroundPanel.js:572-589`) are **always rendered**, gated on
nothing but a static help-text disclaimer ("Requires a background image" — prose only, not a
JSX condition, line 570). Both toggles remain visible and interactive when:
- no background image or video is set at all, and
- when `bgVideo` is set instead of an image (both are documented/named as image-only effects —
  Ken Burns is a zoom on a static image; parallax is a `background-attachment:fixed` CSS trick
  that has no defined behaviour against a `<video>` background).

Render-side, neither is gated on `has_bg_image` either — `class-sgs-container-wrapper.php:430-431`
reads `$bg_parallax`/`$bg_ken_burns` unconditionally from attributes; downstream consumption was
not traced exhaustively in this pass (out of scope: full CSS-class-emission trace), but the
editor-side control has no relevance gate, so an operator can toggle "Ken-burns zoom" on a
video-only or media-less container and see no immediate contradiction in the UI.

### Mounted-behind-an-impossible-condition: 1 confirmed (multi-button)

`src/blocks/multi-button/edit.js:335` mounts `<BackgroundPanel attributes={ attributes }
setAttributes={ setAttributes } />` **without passing `name`**. `BackgroundPanel.js:85` reads:

```js
if ( undefined !== name && ! isExtensionEnabled( name, 'background' ) ) {
    return null;
}
```

When `name` is `undefined`, the `undefined !== name` short-circuits to `false` and the entire
gate is skipped — the panel renders unconditionally on `sgs/multi-button`, regardless of the
`enabledExtensions` allowlist. Checked `multi-button/block.json`: it declares NO
`supports.sgs.enabledExtensions` key at all. So this is not "mounted behind an impossible
condition" in the sense of a gate that can never pass — it is the **opposite defect**: a missing
gate that makes the panel unconditionally reachable on a block that never opted in via the
allowlist mechanism every other host block uses. This is inconsistent with the other 7 mount
sites, all of which pass `name` and all of which declare `"background"` in their
`enabledExtensions` array (verified: `cta-section`, `container`, `trust-bar`, `hero`,
`site-header`, `site-footer` all list it explicitly; `physics-canvas` lists only `["background"]`).
`multi-button/block.json` DOES declare the 30 `bg*`/`background*` attributes (verified via grep
count = 8 matches for the key marker strings), so the panel is not a "control with nothing to
write" — it is a real, working, but ungated mount.

### Panel position in the inspector — representative block: `sgs/container`

`BackgroundPanel` is one `<PanelBody title="Background" initialOpen={false}>` among several
panels mounted by `container/edit.js`. This pass did not exhaustively enumerate the full ordered
inspector panel list for `sgs/container` (that would require reading the full `edit.js`, several
thousand lines, out of scope for this seat) — flagging as **cannot be determined without a live
editor snapshot or a full top-to-bottom read of `container/edit.js`'s `InspectorControls` JSX**.
What IS confirmed statically:
- The panel itself has no Visibility Conditions wrapper of its own — it is a plain `PanelBody`,
  not wrapped in a `<ToolsPanelItem>` or conditional visibility mechanism, other than the
  `isExtensionEnabled` early-return described above (which unmounts the entire panel, not
  individual rows).
- It is not under an "Advanced" panel — it is a top-level `PanelBody` inside the Styles tab
  (per the hero.js comments at lines 1283/1493 referencing "the shared Background panel").

---

## Summary for the council

1. **Enum: absent, confirmed with file:line + positive control.** Image/video/SVG are three
   parallel attribute families switched by an editor-only `TabPanel`; render-time precedence is
   existence-based (video beats image; SVG is independently layered), not a stored choice.
2. **Art-direction notice: captured verbatim.** Two near-identical instances (image + video), a
   plain italic `<p>` inside the `ResponsiveControl` render-prop, gated on
   `hasBase && bp === 'desktop'`. Exact strings quoted above, reusable 3-ingredient shape
   identified for standardising elsewhere.
3. **Functionality gap vs `sgs/media`: confirmed and itemised** — missing object-fit, real focal
   point, aspect ratio, media padding, border radius, media opacity, box shadow, and (most
   severely) all 6 video-playback controls + poster, which are hardcoded server-side.
4. **Declared-but-uncontrolled attrs: 0** on `sgs/container`. **Ungated mount: 1** — `multi-button`
   bypasses the `enabledExtensions` allowlist entirely by omitting the `name` prop.
5. **Irrelevant-but-visible controls: 1 pair** — Ken Burns/parallax show regardless of whether any
   image/video is set, or when only a video is set (both are image-only effects by their own
   help text).
