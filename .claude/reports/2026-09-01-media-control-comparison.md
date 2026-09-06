# Media control comparison — six blocks × ten atoms

**Purpose:** ground truth for Bean to pick a reference implementation per control. No
recommendation is made here except where flagged ⭐ — those are direct calls, not options to
weigh.

**Scope:** `sgs/media` · `sgs/before-after` · `sgs/hero` (split-media only) · `sgs/container`
(background — it owns the mechanism) · `sgs/decorative-image` · `sgs/product-card`, plus the
**`imageControls` extension** (`src/blocks/extensions/image-controls.js`) as its own row — it
is being fully superseded by the atom system, not just compared, so its shape matters as a
retirement target, not a candidate to keep. It only touches 3 of the 10 atoms (object-fit,
focal-point, box-shape) — it has no opinion on the other seven.

**Legend:** own = block-private control · ext = via the `imageControls` extension · shared =
via the shared `BackgroundPanel`/atom panel · hard = hardcoded server-side, no control · — =
nothing exists.

---

## ⭐ Before/after: one shared control, not two (answered, not a menu)

Before/after shows the SAME subject at two points in time — the slider only reads correctly if
both images share the same crop/fit/framing. **Object-fit, focal-point and box-shape should
stay ONE control governing both slots** — that's correct by design, not the scoping bug
CLAUDE.md describes for other multi-element blocks. Alt text and source correctly stay
per-slot (different files, different content to describe). Formalise this as a deliberate
"paired" scope in the atom system rather than leaving it as an accident of selector overlap —
otherwise a later pass "fixes" it into two independent controls and breaks every before/after
instance on the site.

---

## At a glance

| Atom | sgs/media | before-after | hero (split) | container (bg) | decorative-image | product-card | imageControls ext |
|---|---|---|---|---|---|---|---|
| source | own | own (per-slot) | own | shared (BackgroundPanel) | own | own | — |
| media-type | own (button group) | own (per-slot select) | own (per device) | inferred, no control | inferred, no control | image-only, no control | — |
| video-behaviour | own (6 toggles) | own, **1 toggle for both slots** | hard | hard | hard | no video surface | — |
| meaning (alt/decorative) | own (alt+decorative) | own (per-slot alt, no decorative) | none | none (always aria-hidden) | dead attr (no control) | dead (no control, renders ok) | — |
| intrinsic (w/h) | own (auto-written) | — | — | — | — | — | — |
| svg-presentation | own (4 of 6 controls) | — | — | shared (BackgroundPanel, all 6) | — | — | — |
| object-fit | own, atom panel | **ext, shared var (both slots)** | own (split only) | own (`backgroundSize`, dual-path) | — | ext (injected but unused) + own read path | own control |
| focal-point | own, atom panel | **ext, shared var (both slots)** | own (split only) | own (9-preset) | own (whole-element position, not crop) | ext (injected, own read path) | own control |
| box-shape | own (sizing-mode + radius) | own (border-radius only, frame-level) | own (split width/height) | none for bg media | own (width % + max-width%) | dead ext attrs + own `imageHeight` string | own control (unused downstream) |
| overlay | — | — | own (split, **bypasses shared emitter**) | own (shared, full: colour/gradient/hover/opacity/blend) | — | — | — |

Two findings worth flagging before the detail tables:

- ⚠ **`sgs/product-card` box-shape is a dead-control class.** The extension injects
  `sgsMaxWidth`/`sgsHeight*` and renders their controls, but product-card's own `render.php`
  never reads them (`imageControlsExplicit: true` opts it out of the auto-render path) — a
  client can set them and nothing happens.
- ⚠ **`sgs/hero`'s split-media overlay bypasses the shared CSS emitter** (`sgs_overlay_decls()`)
  entirely — hand-built inline, so it has no opacity/blend-mode/hover, unlike every other
  overlay instance.

---

## source

| Block | Storage | Control | Tiers | file:line |
|---|---|---|---|---|
| sgs/media | `imageId`+`imageUrl` (id/url pair) | `ButtonGroup` type toggle + `MediaUpload` | yes (tablet/mobile art direction) | `media/edit.js:230-352` |
| before-after | `{side}ImageId` per slot (int\|string union) | per-slot `SelectControl` type + `ImagePickerRow`/`MediaUpload`/`TextareaControl` | image only | `before-after/edit.js:183-358` |
| hero (split) | `splitImage` (WP media object) | `MediaPicker` + separate type `SelectControl` | yes | `hero/edit.js:602-780` |
| container (bg) | `backgroundImage`/`bgVideo`/`bgSvgContent` | shared `BackgroundPanel` tabs, no type attribute (inferred at render) | image/video only | `BackgroundPanel.js:234-562` |
| decorative-image | `decorMedia` (legacy composite) | one unrestricted `MediaPicker`, no type control | image only | `decorative-image/edit.js:70-175` |
| product-card | `image` (bare URL string, **no ID stored**) | `MediaUpload`, image-only | none | `product-card/edit.js:472-558,2306-2392` |

## media-type

Only `sgs/media`, `before-after` and `hero` have a real type-selector control — none use the
shared `MediaTypeControl.js` component (all three hand-roll their own). `container` infers
type from which source attr is populated (video silently wins if more than one is set, no
warning). `decorative-image`/`product-card` have no type concept at all.

## video-behaviour

⛔ **The atom's own `video-behaviour.control.js` has zero real callers among these six blocks.**
`sgs/media` hand-rolls all 6 toggles + captions itself, predating and diverging from the atom
(no per-toggle disabled-lock in the editor UI, unlike the atom). Every other block hardcodes
playback server-side with no editor control at all.

| Toggle | sgs/media | before-after | hero/container/decorative-image | product-card |
|---|---|---|---|---|
| Autoplay | own, tiered, help explains mute coupling | own, **1 toggle for both slots**, no real `autoplay` HTML attr (JS-driven) | hardcoded `true`, no control | no video |
| Muted | own, tiered — ⚠ editor doesn't show the autoplay-lock the atom itself defines | hardcoded `muted`, no control | hardcoded `true` | — |
| Loop | own, tiered | hardcoded | hardcoded | — |
| Show controls | own, tiered | never emitted (JS playback only) | never used (autoplay/controls are mutually exclusive, server-picked) | — |
| Plays inline | own, tiered — same editor-lock gap as Muted | hardcoded | hardcoded | — |
| Lazy load | own, tiered | — | — | — |
| Captions (id/url/label/lang) | own, hand-duplicated from the atom's shared `VideoCaptionsFields` (not wired to it) | — | — | — |

## meaning (alt text / decorative)

| Block | Alt control | Decorative toggle | Notes |
|---|---|---|---|
| sgs/media | own `TextControl`, disabled when decorative | own `ToggleControl` | frontend correctly enforces `ImageAlt requires !ImageIsDecorative` |
| before-after | per-slot `TextControl`, required, **not tiered** | — none — | has `ImageAlt`/`VideoAlt` but no `ImageIsDecorative` base |
| hero | — none — | — | split-image alt reads only from the WP media object, never editable |
| container | — none — | — | bg image/video always `aria-hidden`, no control needed |
| decorative-image | attr exists, auto-filled, **no `TextControl` anywhere** | — | render.php never reads it — dead, always renders `alt=""` |
| product-card | attr exists, auto-filled, **no `TextControl` anywhere** | — | renders correctly (falls back to WC image alt), just uneditable |

## intrinsic (width/height)

No control anywhere, by design (`clientEditable: false`). Only `sgs/media` even stores it
(`imageWidth`/`imageHeight`, auto-written from the picked media). The other five blocks have no
such attribute at all — width/height there means something else (box-shape sizing), not the
file's natural dimensions.

## svg-presentation

Only `sgs/media` (own, block-private) and `sgs/container` (shared `BackgroundPanel`) have any
SVG surface at all — the other four blocks have no SVG media type.

| Control | sgs/media | container |
|---|---|---|
| Position (bg/fg) | — none — | own, `SelectControl`, 2 options |
| Opacity | — none — | own, `RangeControl` 0–100 |
| Animation | own, `SelectControl` 4 options | own, same 4 options |
| Animation speed | own, `SelectControl` 3 options | own, same 3 options |
| Text shadow | — none — | own, `ToggleControl` |
| Minimum height | — none — | own, `SgsLengthControl` |

## object-fit

| Block | Attr | Control | Scope | Notes |
|---|---|---|---|---|
| sgs/media | `objectFit` | shared atom panel (`MediaSizingPanel`'s own row explicitly suppressed) | element | render.php: "owned by the atom layer" |
| before-after | `sgsObjectFit` (extension) | `SelectControl`, shared var | **both slots share ONE value** ⭐ correct by design | style.css keys off one class both slots match |
| hero (split) | `splitMediaObjectFit` | `SelectControl` | element, image+video only | correctly excludes the SVG `<span>` tier — cite as the reference pattern |
| container (bg) | `backgroundSize` | `SelectControl` "Size", 3 options | backdrop | drives object-fit only via the `<img>` fast path; `::before` path uses `background-size` |
| decorative-image | — none — | | | raw `<img>`, no control at all |
| product-card | `sgsObjectFit` (extension, injected) | extension `SelectControl` | element | its OWN render.php reads it via `sgs_media_position_css()`, bypassing the extension's auto-render filter; style.css hardcodes `cover` as fallback |
| **extension** | `sgsObjectFit` | `SelectControl`, options Inherit/Cover/Contain/Fill/None/Scale-down, help "How the image/video fills its box. Inherit leaves the block/CSS default untouched." | — | `image-controls.js:203-216` |

## focal-point

| Block | Attr | Control | Scope | Notes |
|---|---|---|---|---|
| sgs/media | `objectPosition` | shared atom panel (`MediaSizingPanel`'s row suppressed) | element | same "owned by atom layer" pattern |
| before-after | `sgsObjectPosition` (extension) | `FocalPositionField`, shared var | **both slots share ONE value** ⭐ correct by design | preview thumbnail heuristic misses this block's attr names entirely (no preview shown) |
| hero (split) | `splitMediaObjectPosition`+tiers | `FocalPointPicker`-style, tiered | element, image only | tablet override wrapped in media query |
| container (bg) | `backgroundPosition` | `SelectControl`, 9 fixed presets | backdrop | not a free-drag picker, unlike the others |
| decorative-image | `positionX`/`positionY` (tier objects) | `RangeControl` 0–100 per axis | — | ⚠ **not the same concept** — positions the WHOLE element, not a crop point within a box |
| product-card | `sgsObjectPosition` (extension) | extension `FocalPositionField` | element | same preview-thumbnail miss as before-after |
| **extension** | `sgsObjectPosition` `{x,y}` 0-1 | `FocalPositionField`, help "Drag the crosshair to control which part of the image stays visible when it is cropped." | — | `image-controls.js:92,193-202` |

## box-shape

| Block | What exists | Tiers | Notes |
|---|---|---|---|
| sgs/media | sizing-MODE picker (auto/fixed-height/ratio) + separate native border-radius | radius tiered, sizing mode not | **no rounded/circle/square clip vocabulary anywhere on this block** |
| before-after | `borderRadius` (frame-level, box-family object), NOT per-slot | yes | applies to the whole outer frame, not either media slot |
| hero (split) | `splitMediaWidth`(number+unit) + `splitMediaHeight`(true tier object) | width tiered, gated on `objectFit==='custom'`; height always emitted | two different shapes for width vs height — inconsistent |
| container (bg) | — none for the bg media itself — only `bgSvgMinHeight` (SVG-only floor) | — | bg paints whatever box the layout defines |
| decorative-image | `width`(tier object, px) + `maxWidthPercent`(bare number, desktop-only) | width only | no shape/ratio vocabulary either |
| product-card | ⚠ extension's `sgsMaxWidth`/`sgsHeight*` injected+rendered but **never read** (dead) — real mechanism is own `imageHeight` (flat string, e.g. `"180px"`, no tiers) | none | dead-control class, flag for cleanup regardless of what's chosen |
| **extension** | `sgsMaxWidth` (`TextControl`) + `sgsHeightDesktop`/`Tablet`/`Mobile` (`RangeControl` via `ResponsiveControl`) + `sgsHeightUnit` (`SelectControl`) | yes (height only) | `image-controls.js:217-271` — no shape/ratio vocabulary either |

None of the six blocks nor the extension implement the atom's full vocabulary
(`shape: none/rounded/circle/square`, `sizing: auto/height/ratio`, `ratio` presets) — every
existing implementation is a subset.

## overlay

Only `sgs/hero` (split-media, in-scope) and `sgs/container` (background, in-scope because it
owns the mechanism) have this atom at all.

| Control | hero (split) | container (bg) |
|---|---|---|
| Colour/gradient | own, `GradientOverlayControl`, **no hover state** | shared `BackgroundPanel`, `GradientOverlayControl`, **Normal/Hover tabs** |
| Opacity | — none — (gap) | own, tiered `RangeControl`, ⚠ not gated on colour/gradient presence (dead-control risk) |
| Blend mode | — none — (gap) | own, `SelectControl`, 12 options, ⚠ same ungated-disclosure issue |
| Mechanism | ⚠ **bypasses `sgs_overlay_decls()`** — hand-built inline CSS | routes through the shared emitter correctly |

---

## Next step

Bean picks, per control, which of these (own/ext/shared) becomes the reference shape — or says
none are right and it gets designed fresh. Once picked: check whether the seven existing files
in `src/components/media/controls/` already match that shape exactly (rebuild if not), and
extract the three atoms that currently have no helper file at all (`meaning`, `source`'s SVG
field, `video-behaviour`'s six toggles) into their own files regardless of which shape wins.
