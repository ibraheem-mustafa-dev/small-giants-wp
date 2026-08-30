# M4 — `sgs/before-after` media-surface survey

Council seat M4. READ-ONLY. Repo `c:\Users\Bean\Projects\small-giants-wp`, block at
`plugins/sgs-blocks/src/blocks/before-after/`. Files read in full: `block.json` (13,809
bytes), `edit.js` (849 lines), `render.php` (622 lines), `media-render.php` (full),
`style.css` (grepped for the object-fit/position mechanism). DB queried via
`sgs-db.py sql` against `block_attributes` for `sgs/before-after`.

**Declared population (before any count):** this block has TWO independent media
elements (`before*`, `after*`), each a 3-way fork (image/video/svg), each image side
carrying 2 art-direction tiers (Tablet/Mobile) on source only, no tiers on video or svg.
Expected surface: 16 client-selectable media-family attributes as the brief states,
confirmed below attribute-by-attribute.

---

## 1. Full inventory — both media elements

### Shared-suffix attribute pairs (same shape, `before`/`after` prefix)

| Attribute (before / after) | Control component | Panel | Panel order (Settings tab, top→bottom) | Gated on | What it styles | Media type |
|---|---|---|---|---|---|---|
| `{x}MediaType` | `SelectControl` (`MediaSlotPicker`, edit.js:183-196) | Media (settings) | 1st row per side | always visible | dispatches which branch renders | all |
| `{x}ImageId` / `{x}ImageUrl` | `MediaUpload`/`MediaUploadCheck` + `Button` (`ImagePickerRow`, edit.js:96-112) | Media (settings) | shown when `mediaType==='image'` | `mediaType==='image'` | `<img>` src (ID wins, URL fallback — media-render.php:132-146) | image |
| `{x}ImageAlt` | `TextControl` (edit.js:127-139, inside `ImagePickerRow`) | Media (settings) | same row, under the thumbnail | `mediaType==='image'` AND `url` truthy | `alt=""` on the `<img>` | image |
| `{x}ImageId/UrlTablet` | `ImagePickerRow` with `showAlt={false}`, nested in `<ResponsiveControl>` (edit.js:232-272) | Media (settings) | inside the same Media panel, under the base picker | `mediaType==='image'` AND base `{x}ImageUrl` truthy AND responsive-toggle tier = tablet | emits a SIBLING `<img>` with class `__img--{side}-tablet`, shown 768–1023px | image |
| `{x}ImageId/UrlMobile` | same, tier=mobile | Media (settings) | same | same, tier = mobile | sibling `<img>` `__img--{side}-mobile`, shown <768px | image |
| `{x}VideoId` / `{x}VideoUrl` | `MediaUpload` (library) + `TextControl` (direct URL) (edit.js:283-327) | Media (settings) | shown when `mediaType==='video'` | `mediaType==='video'` | `<video><source></video>` (media-render.php:246-264) | video |
| `{x}VideoAlt` | `TextControl` (edit.js:328-340) | Media (settings) | same block | `mediaType==='video'` | `aria-label` on `<video>` | video |
| `{x}SvgContent` | `TextareaControl` (edit.js:344-358) | Media (settings) | shown when `mediaType==='svg'` | `mediaType==='svg'` | sanitised inline SVG inside a `<div aria-hidden>` (media-render.php:275-303) | svg |

### Shared (non-doubled) attributes controlling both sides at once

| Attribute | Control | Panel | Gated on |
|---|---|---|---|
| `videoAutoplay`/`Tablet`/`Mobile` | `BooleanResponsiveControl` (edit.js:517-528) | Media (settings), bottom | rendered only when EITHER side is `video` |
| `showLabels`, `beforeLabel`, `afterLabel` | `ToggleControl` + 2×`TextControl` | Labels (settings) | `showLabels` gates the two text fields |
| `labelColour`, `labelBackgroundColour` | `SgsColourPanel` rows (edit.js:419-500) | **Colour panel, styles tab** | always |
| `labelFontSize(Unit)`, `labelFontWeight`, `labelFontStyle`, `labelLineHeight(Unit)` | `TypographyControls prefix="label"` (edit.js:654-659) | Labels (settings) | `showLabels` |
| `orientation`, `reverseDirection`, `startPosition`, `fxDraggable`, `dividerWidth` | Divider panel controls | Divider (settings) | always |
| `dividerColour`, `handleColour`, `handleIconColour` | `SgsColourPanel` rows | **Colour panel (styles tab)** | always |
| `height`(+tiers), `maxWidth`(+tiers) | `ResponsiveOverride`+`SgsLengthControl` | Frame size (settings) | always |
| `borderWidth`, `borderStyle`, `borderColour`, `borderColourGradient`, `borderRadius(+tiers)` | `SgsBorderControl` | Border (settings) | always |
| `boxShadow` (shape) | `ShadowControl` inside a `ToolsPanel` | **Frame styling (styles tab)** | always |
| `boxShadowColour`, `boxShadowColourHover` | `SgsColourPanel` rows | **Colour panel (styles tab)** | always |

**Asymmetry between before/after: NONE found beyond the prefix.** Every attribute, control,
gate, and code path is byte-identical between `before*` and `after*` — `MediaSlotPicker` is
called twice with `side="before"`/`side="after"` as the only difference (edit.js:503-514),
and `sgs_before_after_resolve_media()` takes `$modifier` as its only per-side parameter
(media-render.php:339-352). This is the cleanest of the four surveyed surfaces on this
specific axis — there is no drift to report.

**16-attribute count verified.** Counting only the media-FAMILY attrs that are
client-selectable content (excluding shared chrome like labels/divider/border):
`{before,after} × {MediaType, ImageId, ImageUrl, ImageAlt, ImageIdTablet, ImageUrlTablet,
ImageIdMobile, ImageUrlMobile, VideoId, VideoUrl, VideoAlt, SvgContent}` = 12 attrs × 2 sides
= 24 raw declarations, but the brief's "16" figure lines up if counting unique SUFFIXES
(MediaType, ImageId, ImageUrl, ImageAlt, ImageIdTablet, ImageUrlTablet, ImageIdMobile,
ImageUrlMobile, VideoId, VideoUrl, VideoAlt, SvgContent = 12) — brief said "16 client-
selectable media attributes", I count 12 unique suffixes × 2 sides = 24 declared attrs, or
12 unique CONCEPTS. I cannot reconcile "16" exactly from the schema; flagging as
**undetermined** rather than forcing a match — the qualitative finding (two full elements,
each a 3-way fork, each with 2 tiers on image only) is what matters and is confirmed either
way.

---

## 2. Uncontrolled attributes / controls-when-irrelevant

Checked `block.json` attributes against `edit.js`, including dynamic template-literal keys
(`${side}ImageUrl` etc.) per the brief's warning — `MediaSlotPicker` and the tier picker both
build keys via template literals (edit.js:168-179, 247-248), so a literal grep for
`beforeImageUrl` etc. would MISS these; I traced the key construction by hand instead of
grepping.

**Zero uncontrolled media-family attributes.** Every declared attribute in the media family
(image/video/svg × before/after × base+tiers) has a live control, traced through the dynamic
key builders above — not a literal-string match.

**Two declared attributes outside the media family have NO editor control at all:**

| Attribute | block.json declares | edit.js control | Verdict |
|---|---|---|---|
| `boxShadowColour` (default, no explicit `"default"` key at all — see block.json, it has no `default` field, unlike every sibling) | yes | Controlled via `SgsColourPanel` row `boxShadow` (edit.js:482-498) | **controlled** — retracting this, false alarm on first pass, listing to show the check was actually run |
| *(none found)* | — | — | — |

I looked specifically for the class of bug the brief warns about (computed-key attrs wrongly
called dead) and re-verified: `labelLineHeightUnit` — declared, consumed by
`TypographyControls prefix="label"` internally (not visible as a literal `labelLineHeightUnit`
string in edit.js, it's built as `${prefix}LineHeightUnit` inside the shared component) — this
is controlled, not dead. Also checked `heightUnit`/`maxWidthUnit` — both consumed by the
`ResponsiveOverride`/`SgsLengthControl` unit-parsing closures (edit.js:695-710) — controlled.

**No control appears when irrelevant** in the sense the brief flags (e.g. video controls
showing while image is selected) — every media-type-specific control block is wrapped in
`{ 'video' === mediaType && (...) }` / `{ 'image' === mediaType && (...) }` /
`{ 'svg' === mediaType && (...) }` (edit.js:198, 231, 275, 344). This is the CORRECT,
narrowest gating of the four surfaces — confirmed by reading, not inferred.

One soft finding: `videoAutoplay`/`Tablet`/`Mobile` render their control when **either** side
is video (edit.js:515-516: `'video' === attributes.beforeMediaType || 'video' ===
attributes.afterMediaType`), which is correct behaviour (one shared autoplay toggle governs
both `<video>` elements per the sync contract) — not a bug, but worth naming since it's the one
place where "video controls show while [the other side] is image" is real and intentional,
not a gating miss.

---

## 3. Art-direction / per-tier status — CONFIRMED FLAT for video and svg

- **Image side: HAS tiers.** `{before,after}Image{Id,Url}{Tablet,Mobile}` — 8 attrs total,
  declared in block.json, controlled via `ImagePickerRow` nested in `<ResponsiveControl>`
  (edit.js:231-273), consumed in `media-render.php:83-172` (`sgs_before_after_resolve_image`),
  which emits sibling `<img>` elements class-suffixed `-desktop`/`-tablet`/`-mobile` and
  render.php toggles visibility via `@media` `display:none` rules keyed off which tiers were
  actually emitted (render.php:395-409). This is the sibling-markup pattern (matches sgs/media's
  and sgs/decorative-image's IMAGE tier mechanism), not a runtime swap.

- **Video side: CONFIRMED FLAT.** No `{before,after}VideoId/UrlTablet/Mobile` attributes exist
  in block.json at all — only `beforeVideoId/Url/Alt` and `afterVideoId/Url/Alt`, no tier
  siblings. `videoAutoplayTablet/Mobile` DO exist and ARE per-tier, but that's a *playback*
  attribute (whether it plays), not a *source* attribute (which file plays) — the actual video
  SOURCE is desktop-only across every breakpoint.

- **SVG side: CONFIRMED FLAT.** `beforeSvgContent`/`afterSvgContent` — no tier siblings
  declared, no tier control in edit.js, no tier branch in
  `sgs_before_after_resolve_svg()` (media-render.php:275-303, takes only `$attributes`,
  `$modifier`, `$classes` — no tier parameter at all).

**What would have to change for full per-tier + inherit-upward on video/svg**, matching Bean's
hero-shape ruling:

1. block.json: add `beforeVideoId/UrlTablet`, `beforeVideoId/UrlMobile` (×2 for after — 8 new
   attrs), and `beforeSvgContentTablet/Mobile` (×2 for after — 4 new attrs). 12 new declarations.
2. `media-render.php`: `sgs_before_after_resolve_video()` and `sgs_before_after_resolve_svg()`
   need the same tier-loop + tier-classed-sibling pattern `sgs_before_after_resolve_image()`
   already has (lines 96-140) — video is the harder case because TWO `<video>` elements per
   tier means the sync layer (`bootVideoSyncLayer` in view.js) would need to track which pair
   of `<video>` elements is currently visible, not just one pair statically — this is a real
   engineering cost beyond a copy-paste of the image pattern, not a trivial mechanical fold.
3. `edit.js`: `MediaSlotPicker`'s video and svg branches need the same
   `<ResponsiveControl>`-wrapped tier picker the image branch already has (edit.js:231-273) —
   mechanical, same shape.
4. render.php: extend the tier-toggle CSS loop (currently only walks
   `$before_media['tiers']`/`$after_media['tiers']`, which only the image resolver populates)
   to also read tier arrays from the video/svg resolvers once those exist.
5. "Inherit-upward" is ALREADY the convention used for the existing image tiers and for
   `videoAutoplayTablet/Mobile` (both explicitly documented as "null = inherit the tier above"
   — block.json `videoAutoplayTablet` comment, and media-render.php's tier-continue logic at
   lines 108-116 skips a tier with neither id nor url, which is functionally inherit-upward for
   image). The mechanism to extend to video/svg source already exists as a pattern; it is not
   being invented from scratch.

---

## 4. Panel structure vs Bean's C14 rule (group-by-ELEMENT, never split across tabs)

Cross-referencing the DB's `css_element` column (query above) against which InspectorControls
`group` each attribute's control lives in:

| Element (per DB `css_element`) | Settings-tab attrs | Styles-tab attrs | **Split?** |
|---|---|---|---|
| `wrapper` (border/box/size family — note: block.json's own `supports.sgs.elements` calls this element **`frame`**, not `wrapper` — see caveat below) | `borderWidth/Style/Colour/ColourGradient/Radius(+tiers)` (Border panel), `height(+tiers)`, `maxWidth(+tiers)` (Frame size panel) | `boxShadow` shape (Frame styling `ToolsPanel`), `boxShadowColour`, `boxShadowColourHover` (`SgsColourPanel`) | **YES — split.** Border colour lives in Settings (inside `SgsBorderControl`), but the same element's shadow colour lives in Styles. |
| `label` | `beforeLabel`, `afterLabel`, `labelFontSize/Weight/Style/LineHeight` (Labels panel) | `labelColour`, `labelBackgroundColour` (`SgsColourPanel`) | **YES — split.** Label text content + typography in Settings; label colour in Styles. |
| `divider` (per DB: `startPosition`) / `divider-line` (per DB: `dividerColour`, `dividerWidth`) | `orientation`, `reverseDirection`, `startPosition`, `fxDraggable`, `dividerWidth` (Divider panel) | `dividerColour` (`SgsColourPanel`) | **YES — split.** Note also: DB splits `startPosition` onto element `divider` but `dividerColour`/`dividerWidth` onto a DIFFERENT element `divider-line` — block.json's own comment (the `divider-line` `_note`) says this is deliberate (a real child node, not the same element as `divider`'s positioning wrapper), so this specific one is not a control-placement bug, just worth knowing before reading the table above as "one element". |
| `handle` | *(none — no non-colour handle control exists)* | `handleColour`, `handleIconColour` (`SgsColourPanel`) | **NO split** — only colour controls exist for this element, so nothing to split. |

**Verdict: 3 of 4 real elements (wrapper/frame, label, divider) split their controls across
the Settings and Styles tabs.** This is because the block routes ALL colour (including
non-colour-adjacent shadow-colour) through the single `SgsColourPanel` mount, which is
hardcoded to `group="styles"` (confirmed in `src/components/SgsColourPanel.js:116`), while
every non-colour control for those same elements sits in per-purpose `PanelBody`s under
`group="settings"`. This is a plugin-wide pattern (`SgsColourPanel` is deliberately the ONE
colour-panel mechanism per the CLAUDE.md "Colour controls" standard), not a `before-after`-
specific defect — but it does mean `before-after` is a real, concrete instance of the C14
violation the brief asks about, for 3 of its 4 elements. If C14 is to be enforced strictly
(one element = one tab), the fix is architectural (move `SgsColourPanel` rows into their
owning element's own settings-tab panel, or move ALL of that element's controls into the
styles tab) and would need to apply to all 65 blocks that mount `SgsColourPanel`, not just
this one — a scoped before-after fix would just be a new one-off divergence from the
now-standard colour-panel pattern.

---

## 5. Emitted markup — DOM shape per media type + per-tier mechanism

Root: `<div class="{uid} wp-block-sgs-before-after" ...>` → one child
`<div class="wp-block-sgs-before-after__stage" data-sgs-before-after-stage>` containing, IN
THIS ORDER (render.php:549-611):

1. `$before_media['html']` — emitted DIRECTLY as a stage child (no wrapper div for "before")
2. `<div class="wp-block-sgs-before-after__after-wrap">{$after_media['html']}</div>` — "after"
   IS wrapped, "before" is NOT. This asymmetry is real and structural, not a naming quirk: the
   CSS clip-path mechanism clips the `.after-wrap` div to reveal/hide the after side, so before
   is the full-stage base layer and after is the clipped overlay layer. Confirmed intentional
   by the divider mechanism (style.css clip-path targets `.after-wrap`).
3. `<div class="wp-block-sgs-before-after__labels" aria-hidden>` — before/after `<span>` labels
4. (conditional) a play/pause `<button data-sgs-before-after-video-toggle>` — only if either
   side is video
5. `<div class="wp-block-sgs-before-after__divider" aria-hidden>` containing
   `__divider-line` div + `__handle` div (with an inline SVG chevron pair)
6. a visually-hidden `<label>` for the range input (screen-reader instruction text)
7. `<input type="range" class="__range" data-sgs-before-after-range>` — the no-JS-safe/
   keyboard-operable control surface

**Per-media-type markup, per slot** (`sgs_before_after_resolve_media()`,
media-render.php:339-352 dispatches on `{prefix}MediaType`):

- **image**: `<img class="wp-block-sgs-before-after__img wp-block-sgs-before-after__img--{side}[--{side}-desktop]" ...>` plus, if tiers exist, sibling `<img class="...__img--{side}-tablet">` / `...__img--{side}-mobile">` — ALL present in DOM simultaneously, toggled by `display:none` `@media` rules.
- **video**: `<video class="wp-block-sgs-before-after__img wp-block-sgs-before-after__img--{side} wp-block-sgs-before-after__video" muted loop playsinline preload="metadata" data-sgs-before-after-video data-sgs-before-after-video-side="{side}"><source ...></video>` — note the class list STILL carries the base `__img`/`__img--{side}` tokens even though it's a `<video>` element; `__video` is an ADDITIONAL class, not a replacement. No tier siblings.
- **svg**: `<div class="wp-block-sgs-before-after__img wp-block-sgs-before-after__img--{side} wp-block-sgs-before-after__svg" aria-hidden="true">{sanitised SVG markup}</div>` — same base-class-plus-extra pattern. No tier siblings.

**Class convention finding:** the base class token is literally `__img`, applied to ALL THREE
media types (image/video/svg alike) — i.e. `wp-block-sgs-before-after__img` is the generic
"comparison-slot" class regardless of what's inside it, and `__video`/`__svg` are additive
modifiers layered on top for type-specific CSS (object-fit rules, `style.css:63-64` reads
`--sgs-object-fit`/`--sgs-object-position` off this shared `.__img` selector so image/video
share one object-fit mechanism; svg gets its own rule at style.css:346 because object-fit
doesn't apply to a `<div>` wrapping inline SVG markup — the SVG's own width/height must be set
instead, per the comment at style.css:333). This generic-token convention is a genuine
recognition-contract decision: a cloning-pipeline BEM reader keying off `__img` alone would
misclassify video/svg slots as images unless it also checks for the `__video`/`__svg`
co-occurring class.

**Colour/value emission mechanism — CSS custom-property VALUES, not competing declarations.**
render.php emits divider/handle/label colours as `--sgs-before-after-*` custom-property
VALUES on the root selector (render.php:229-256), which style.css then reads with a matching
CSS-literal fallback — e.g. `object-fit: var(--sgs-object-fit, cover)`. This is explicitly
called out in a render.php comment (lines 222-228) as the Spec 32 "overrides = custom-property
VALUES, never inline declarations" rule applied to a scoped `<style>` block, not just an inline
`style=""` attribute — i.e. it generalises the rule to cover a second collision class (two
selector-scoped rules for the same property) that Spec 32's original wording doesn't explicitly
name. This is worth flagging under Section 6 (does something better) below.

**Cannot be determined statically:** whether `view.js`'s `bootVideoSyncLayer` handles a page
with BOTH a tablet-tier image on one side and a video on the other side without a race — I did
not read view.js in full (out of scope: read-only survey of markup/attrs, and view.js is
frontend runtime behaviour, not a static markup/attribute question). Flagging as undetermined
rather than guessing.

---

## 6. Where before-after does better than the other three surfaces

1. **Cleanest before/after (or in general, multi-slot) symmetry of anything surveyed** — zero
   drift between the two media elements; both are driven by one parameterised
   `MediaSlotPicker`/`sgs_before_after_resolve_media()` pair rather than two hand-duplicated
   implementations that could drift. If the unified media-element design needs a reference for
   "how do you keep two structurally-identical media slots from diverging", this is it.

2. **Correctly narrow media-type gating in the editor** — every type-specific control block is
   wrapped in an exact `'video' === mediaType` / `'svg' === mediaType` conditional (Section 2),
   so there is no dead-but-visible control for the wrong type. If any of the other three
   surfaces show a video control while image is selected (or similar), this block's
   `MediaSlotPicker` is the pattern to copy.

3. **Custom-property-VALUE colour emission generalised to scoped-`<style>` collisions**
   (Section 5) — this block's render.php comment makes an argument the Spec 32 doctrine itself
   doesn't spell out: that "overrides are custom-property values, never inline declarations"
   also protects a scoped `<style>` selector rule from having two writers, not just an inline
   `style=""` attribute. Worth pulling into the standard's written rationale if the unified
   spec restates Spec 32.

4. **Sanest zero-JS fallback among the three media types** — video and svg both degrade to a
   still frame / static SVG behind the same CSS-only clip-path split every other type gets
   (media-render.php's video resolver comment, lines 210-213), so the "does it work without
   JS" question has one honest answer across all three types, not a per-type exception.

---

## Summary for the council

- **Two-element inventory:** fully symmetric, zero asymmetry beyond the `before`/`after`
  prefix — the strongest finding in this report.
- **Uncontrolled count: 0** in the media family (verified against dynamic template-literal
  keys, not a literal grep, per the brief's warning). No spurious controls-when-irrelevant.
- **Per-tier gap: image side has full Tablet/Mobile source tiers; video and SVG sides are
  CONFIRMED FLAT** — no tier attrs, no tier controls, no tier resolver branches for either.
  Extending to video specifically is non-trivial (the two-`<video>` sync layer would need to
  track tier-visible pairs, not just one static pair) — flagged as real engineering cost, not
  a copy-paste.
- **Tab-split verdict: YES, real, and structural.** 3 of 4 elements (wrapper/frame, label,
  divider) split colour into the Styles tab while their non-colour controls sit in Settings —
  caused by `SgsColourPanel` being hardcoded to `group="styles"` framework-wide, so this is a
  65-block-wide pattern, not a before-after-specific bug, but before-after is a live instance
  of the violation for the council to point at.
- **Markup shape:** generic `__img` base class shared by all three media types (video/svg add
  it as an ADDITIONAL class alongside `__video`/`__svg`, never replace it); "after" side is
  wrapped in its own `.__after-wrap` div for clip-path targeting, "before" is not — asymmetric
  by design, not a bug. Image tiers use the sibling-markup pattern (always-in-DOM, CSS
  `display:none` toggle); video/svg have no tiers to render.
- **Best-in-class finding:** the custom-property-VALUE colour emission pattern and the
  before/after structural symmetry are both worth carrying into the unified standard.
