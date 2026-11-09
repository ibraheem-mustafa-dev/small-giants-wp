---
doc_type: spec
spec_id: 49
spec_version: "0.3"
title: SGS Media System
project: small-giants-wp
status: draft
authors: Bean, Claude
session_date: 2026-11-09
last_verified: 2026-11-09
status_history:
  - 2026-11-09: v0.1, first full draft
  - 2026-11-09: v0.2, rewritten after five independent reviews and live proofs
  - 2026-11-09: v0.3, Bean's answers: sizing is independent settings with no modes, circle is a shape, duotone and Lottie left out, videos play on phones, no CSS budget target; awaiting Bean's approval
references:
  - .claude/plans/2026-11-09-media-controls-redesign.md
  - .claude/reports/2026-11-09-media-controls/
  - .claude/specs/02-SGS-BLOCKS.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
  - .claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md
  - .claude/specs/36-SGS-NAVIGATION-SYSTEM.md
  - .claude/specs/38A-SGS-MOTION-MODEL.md
  - .claude/specs/48-CLONING-SYSTEM.md
absorbs: null
absorbed_by: null
lock_reason: null
---

# Spec 49: SGS Media System

> **One-liner:** one data model, one renderer, one set of controls and one effects route for every image, video, embed, SVG, animation and background in SGS, so anyone can make media look right quickly and any draft maps to exactly one set of settings.

## 0. Problem statement

Parallax and focal point did not behave. Checking the editor showed why: the media system is several generations of partial work. `sgs/media` has four unreconciled control layers. A per-device background silently stops being an element. Focal point has several data shapes. Height, ratio and rounded shape have repeatedly defeated the cloner and the agents styling pages by hand. Controls appear when they do nothing, and one corrupts another value: typing a tablet minimum height overwrites desktop.

Nothing here is patched. This spec replaces the system so it never needs re-investigating. Old parts are reused only where scrutiny passed them (§6.9).

## 1. Who this is for

| Reader | What they get |
|---|---|
| Client or Bean in the editor | Plain-English controls that appear only when they do something and show which device owns each value |
| Claude Code agent styling by hand | One obvious setting per visual result |
| The cloner | One machine-readable contract; every draft pattern has one target |
| Build agents | Exact contracts and ownership, so packages run in parallel |
| Visitors | One file downloaded per device, correct priority, no layout shift |

## 2. Goals and non-goals

Goals: G1 one model for all media. G2 no setting is visible while inert. G3 editor and front end match. G4 every draft CSS pattern has one target. G5 a real element and a working motion target in every state. G6 best-in-class controls: per-device focal point, art direction, masks, visible inheritance. G7 migration leaves no legacy reader.

Non-goals: image editing or generation; replacing the WordPress media library; hotspots; a lightbox; saved style presets across slots; multi-layer stacked backgrounds; drag-and-drop upload; duotone; Lottie as a media kind (the Lottie effect in the motion system is untouched); CSS size targets (delivery follows §6.7 and no limit is set or gated here); new image formats (WordPress's generated sizes are used); a typed Sizes override or image-size dropdown (sizes are derived); a per-device border width (Bean-locked off). `core/image`, `core/cover`, and WooCommerce's own product images stay on WordPress's logic.

## 3. Hard constraints

| Constraint | Source | Fixed |
|---|---|---|
| Media-first: settings belong to the media; no box or frame concept in the editor | Bean 2026-11-09 | Yes |
| No PHP or editor inline `style`; per-instance CSS through the shared collector into the one cached external stylesheet. JS-written custom-property values at runtime are allowed | Spec 32 FR-32-11; §15 | Yes |
| No legacy render fallbacks or `deprecated.js`; one batch migration | FP-14 | Yes |
| Every customisable property has an inspector control | CLAUDE.md | Yes |
| DB-first; a setting prints a real CSS property and is claimed | FP-1, FP-8 | Yes |
| Per-device border width stays off | Bean | Yes |
| No client names in code | CLAUDE.md | Yes |
| A draft's values and font sizes are copied exactly | Bean 2026-11-09 | Yes |
| Shared code cuts over in one release, by scripts | Bean 2026-11-09 | Yes |

CLAUDE.md's page budget still applies to the framework. Bean's ruling for this work: it is not a target, and no gate or number is added for it.

Amendments this spec makes to others, in WP-1's commit: Spec 32 FR-32-4 (media slots emit real properties in the collector); Spec 35 D5 (per-device media sources use the responsive value object, and alt stays untiered); Spec 35 §12 (the reworked `ResponsiveOverride`); Spec 35 option-count bands (visual chip grids for ratio, fit and mask); Spec 35 A5 (`PanelBody` here, because the rule table removes the need for `ToolsPanel`).

## 4. Glossary

- **Slot:** one place that shows media, declared by a block (§8.3).
- **Prefix:** the attribute name start for a slot: `media` on `sgs/media`, `background` on backgrounds.
- **Device:** desktop, tablet or mobile, from `SGS_Breakpoints`.
- **Responsive value:** an object `{desktop?, tablet?, mobile?}`. A missing key, `''` or null inherits, through `resolveTier` and `sgs_resolve_tier`, the only inheritance mechanism (Spec 35).
- **Kind:** image, video, embed, svg, none. **Resolved kind:** the one at a device after inheritance.
- **Context:** content, background, item or layer.
- **Media element:** the `<img>`, `<video>`, `<iframe>`, `<svg>` or animation host.
- **Surface:** the helper if printed, otherwise the media element.
- **Helper:** `.sgs-media-box`, printed only under §7.3. Never named in the editor.
- **Layout box:** the outermost printed element: `<figure>`, else `<a>`, else the surface.
- **Crops:** the box shape differs from the file's shape at a device, which can be from Ratio, Height, Width, or any minimum or maximum. It is what Fit and Focal act on.
- **Lead image:** the single image taking high fetch priority (§7.7).

## 5. Functional requirements

Tests are in §12; FR-to-test mapping is in §16.

### Data

- **FR-49-1** All slots MUST use §8's attributes with the slot's prefix, committed in `block.json` by a generator that reads `media-settings.json`. Gates and the seeder keep reading `block.json`; a drift gate fails when generated output differs. Test: AC-1.
- **FR-49-2** All media per-device values MUST use the responsive value object. Flat `xTablet`/`xMobile` media attributes MUST NOT exist. This is media-only; other blocks keep their current shapes. Test: AC-2.
- **FR-49-3** Alt and Decorative MUST be one value per slot. Test: AC-2.
- **FR-49-4** Focal point MUST be `{x,y}` in 0 to 1, on every element. Test: AC-2.
- **FR-49-5** Sizing MUST be independent settings that all work together (Ratio, Width, Height, and minimum and maximum width and height), resolved by §7.2, with no mode attribute or mode control. Test: AC-3.
- **FR-49-6** The universal `sgsHideOnMobile`, `sgsHideOnTablet` and `sgsHideOnDesktop` toggles apply to whole blocks only. When a block is hidden on a device, the renderer MUST print no file for that device. Slots inside a block cannot use them: `{kind:"none"}` is offered on background and split slots, labelled "No background from this device down", and applies from that device down unless a narrower device has its own source. Test: AC-4.

### Rendering

- **FR-49-7** `SGS_Media_Renderer` MUST print all slots. Everything in §8.2 MUST be removed. Test: AC-5.
- **FR-49-8** Different images per device MUST use `<picture>` with one `<source media>` per differing device, queries from `SGS_Breakpoints` and viewport-only. Each source carries its own srcset, sizes, width and height. A `none` device is an empty source. Test: AC-4.
- **FR-49-9** Only the matching file MUST download, including with mixed kinds. Test: AC-4.
- **FR-49-10** The helper MUST be printed if and only if §7.3 says so, and paint MUST follow §7.4. Test: AC-6.
- **FR-49-11** Every background MUST print one real element in every state (§7.8). Root-`::before` background painting MUST be removed. Test: AC-7.
- **FR-49-12** Every stored string reaching CSS MUST pass `sgs_css_value( $type, $value )`, whose grammar in `includes/data/css-value-grammar.json` is read by PHP and generated into JS. It refuses `"`, `'`, `;`, `{`, `}`, `<`, `>`, `\`, newlines and unbalanced brackets, and allows brackets only in `calc()`, `min()`, `max()`, `clamp()` and `var()`. URLs go only through `sgs_css_url()`. A gate runs every emitter output through the validator. Test: AC-8.
- **FR-49-13** Per-instance CSS MUST go through `sgs_collect_css`, in real properties, under a scope class hashed from the slot's sorted values. Test: AC-9.
- **FR-49-14** Inline SVG and uploaded mask SVGs MUST be sanitised at render and in the editor with `sgs_svg_kses_allowed_tags`. Test: AC-8.
- **FR-49-15** Loading MUST use §7.7's single resolver. The theme's own preload emitters in `functions.php` and `inc/font-preloading.php` MUST be removed. Test: AC-10.
- **FR-49-16** Typed `attr()` MUST NOT be used. Real width and height MUST always be printed. A source with no id MUST carry width and height (the picker and cloner fill them); without them nothing prints and the editor says "Image size unknown". No attachment lookup at render. Test: AC-11.
- **FR-49-17** Embeds MUST carry the media element marker, and only YouTube (`youtube-nocookie.com`) and Vimeo (`player.vimeo.com`) URLs are accepted, normalised, with `loading="lazy"`, a strict referrer policy and a title from Alt. Test: AC-6, AC-8.
- **FR-49-38** Fill MUST fill a stretched flex or grid row, a definite-height parent and a container whose height comes from its own ratio or min-height, and MUST fall back to 3:2, never 0, in a parent with no height (§7.2). Test: AC-27.

### Editor

- **FR-49-18** Controls and panels MUST be exactly those in §9, in that order, with those labels, and every §12 walkthrough MUST complete by mouse and by keyboard. Test: AC-12, AC-28, AC-29.
- **FR-49-19** Visibility MUST come from the one rule table, resolved at the active device and resolved kind. A control that does not apply is omitted. A panel with no controls MUST not mount. Test: AC-13.
- **FR-49-20** Every per-device media control MUST use the reworked `ResponsiveOverride` (§9.2). Test: AC-14.
- **FR-49-21** A hidden control holding a value MUST keep it and be named in the panel with Reset. Test: AC-14.
- **FR-49-22** Editing on a device MUST write only that device. Test: AC-14.
- **FR-49-23** The focal picker MUST show the resolved media and resolved point on every device. Test: AC-15.
- **FR-49-24** The editor MUST match the front end for every setting, with no editor-only inline styles; video and embeds preview for real. Test: AC-16.
- **FR-49-25** Empty, deleted, oversized and missing-alt states MUST behave as §9.5. Test: AC-17.
- **FR-49-26** All media pickers MUST use `MediaSlotField`; a gate refuses raw `MediaUpload` elsewhere and any second focal shape. Test: AC-18.

### Effects

- **FR-49-27** `sgs/media` MUST offer effects via `supports.sgs.fx.motionSurface`. Media-irrelevant presets MUST NOT be listed. Test: AC-19.
- **FR-49-28** The Effects target list MUST contain only parts available in the current state, through a declared `availableWhen` predicate on the part. Background video MUST have a part. Test: AC-19.
- **FR-49-29** Parallax MUST offer strength, direction and per-device on or off. Overscan MUST follow §10.2 and travel MUST never exceed it. Pinned MUST be a separate effect. `backgroundAttachment` MUST be removed. Test: AC-20.
- **FR-49-30** The Background panel MUST show one motion line whose button opens Effects on the Background target (§9.6). Test: AC-21.
- **FR-49-31** Hover zoom MUST clip to the media on every element offering it. Test: AC-6.

### Shape

- **FR-49-32** The old media `shape` attribute, `photoShape`, sticker shape and clip-path presets MUST be removed; Circle is a shape in the Shape grid. `sgs/icon.shape` is unrelated and stays. Test: AC-22.
- **FR-49-33** Masks MUST come from one registry (§7.5), per device, with uploads, keeping shadow and border. Test: AC-23.

### Cloner and migration

- **FR-49-34** A JSON schema MUST describe a slot; the cloner and `wp-build-page` MUST write through it and refuse unknown shapes. Test: AC-24.
- **FR-49-35** Every draft pattern in §11 MUST map to its target. Test: AC-24.
- **FR-49-36** All saved content, theme patterns and build trees MUST be migrated by one detector (§13), and a zero-old-attribute check MUST pass on every target before old code is removed. Test: AC-25.
- **FR-49-37** Every element in §10.4 MUST adopt the system with exactly the listed specialised controls. Test: AC-26.

## 6. Architecture and decisions

### 6.1 Generated from one table

`includes/data/media-settings.json` declares each setting once. A generator writes the committed attributes into each block's `block.json`, plus PHP and JS tables and classification entries. Everything else reads those. A drift gate keeps them equal.

Rejected: gates reading the table directly (over 200 gates read `block.json`). Rejected: one object attribute per slot (it breaks the one-attribute, one-property rule the resolver depends on).

### 6.2 Five emitter kinds

Rows name an emitter kind: `plain`, `sides`, `corners`, `shadow`, `colour-states`. Each kind is written once in PHP and once in JS. A fixture matrix asserts byte-identical CSS, including hover, gradient and shadow. Order is by property, then device (desktop, tablet, mobile), with hover last.

### 6.3 Media-first

Without §7.3's triggers there is no wrapper: the `<img>` is the block.

### 6.4 Sizing has no modes

Bean's ruling. Ratio, Width, Height and the limits are separate settings that work together, as CSS itself does: pick a ratio and say how tall it should be, or that it must never go under or over a size. Fit and Focal then decide how the file sits in that shape, so a ratio acts like a crop. The earlier mode chips were rejected for keeping the separation that caused the old problems. It is also what the cloner needs: a draft's properties copy across one to one.

### 6.5 Backgrounds are media

A background is a slot in a real `.sgs-bg-media` element. Only a tiled image paints with CSS, on that element.

### 6.6 Motion stays in Effects

The Background panel says what the background is; Effects says how it moves. Duplicating controls in the panel was rejected: two controls for one effect can disagree, and each new effect would be built twice.

### 6.7 CSS delivery

Base rules in one small static file, loaded on pages with media. Optional parts (mask, overlay, video) load only when printed. Per-instance CSS emits only what is set, through the collector.

### 6.8 One cutover

Core code lands dormant on main: new files, adopted by nothing. Adoption, content migration and old-code removal happen in one release on a short integration branch, driven by scripts. Shared controls make block-by-block cutover impractical, and at no point do two render paths serve one block.

### 6.9 What is reused

| Part | Verdict | Use |
|---|---|---|
| Motion channels, Ken Burns, parallax runtime | Keep | Plus §10.2 |
| Scope-class hashing, `ShadowControl`, `SgsBorderControl`, `SgsBoxControl`, `SgsLengthControl`, link and caption fields | Keep | Rehosted |
| `sgs_end_shape_url` encoder | Keep | Mask data-URIs |
| `helpers-shadow-filter.php` | Keep | Masked shadows |
| `ResponsiveOverride` | Rework | §9.2; hard-coded "Desktop" and wrong-tier hint fixed in the shared component |
| `FocalPositionField` | Rework | `FocalField` |
| `MediaPicker` | Rework | `MediaSlotField` |
| Cover-crop sizes | Rework | §7.6 |
| `icon-shapes.json` | Rework | Model and seed of the registry |
| Shape dividers | Rework | Paths move to the registry; renderers read it |
| `sgs_responsive_image` | Rework | Absorbed into the renderer |
| Overlay | Rework | Layer inside the helper |
| Atom registry and twin atoms | Replace | §6.1, §6.2 |
| `helpers-media-element.php`, box-shape vocabulary, loading trio, `sgs_tier_media_render`, `sgs_render_media`, flat shapes | Replace | §7, §8 |
| BackgroundPanel position dropdown, art-direction attributes, Attachment, nav-drawer copy, raw `FocalPointPicker`, `sgsObjectPosition` | Replace | §9.4 |

## 7. Rendering contract

### 7.1 Markup

Nesting is always `figure > a > helper > mask > media element`, omitting levels not needed. One source: `<img class="sgs-media-el" …>`. Different images per device: `<picture class="sgs-media-picture">` around `<source>`s and the `<img>`, with `display:contents`. Header and footer row rules targeting direct children are extended to reach the image.

The layout box carries `{uid}`, block classes, the anchor, motion attributes, Order, Alignment, Width and Max width. The surface carries Height, Ratio, Min height, Max height, Border, Radius, Shadow, Padding and Background. Base CSS sets `box-sizing:border-box`.

`<a>` is `display:block`, takes no paint, and has a focus ring following the radius. Overlay and ring carry `pointer-events:none`. A link on a Decorative image is refused: the editor shows "A linked image needs alt text".

Caption width follows the layout box.

Mixed kinds across devices: one sibling per kind, switched by breakpoint. Every sibling is lazy with no fetch priority, video `preload="none"`, so nothing downloads for a device that does not show it.

### 7.2 Sizing

Each setting prints its own CSS property; the browser combines them. The base stylesheet sets `height:auto` on the media element first, because a printed `height` attribute otherwise acts as a fixed CSS height (proved in real Chrome: all 12 combinations of Ratio, Width, Height and limits, with Cover and Contain, resolve as this table says). Ratio, Width, Height, Min width, Max width, Min height and Max height can all be set, per device, in any combination. Three rules fill the gaps CSS leaves:

| What is set | Result |
|---|---|
| Nothing | The file's own size, `width:auto; max-width:100%`, so a 300px file draws at 300px and shrinks with its container |
| Ratio only, or Height only | Width defaults to 100% of the space, and the height follows from the ratio, or is as set |
| Ratio and Height | Width follows from the two, so 1:1 and 300px tall is 300 by 300 |
| Ratio and Width | Height follows from the two |
| Ratio, Width and Height | Width and Height win. Ratio is kept and named in the hidden-value note |

`Width: auto` keeps the file's proportions with a Height. Limits apply on top in every case: with Ratio 16:9 at 100% width and Max height 300px, the box stops at 300px and the picture crops into it. A value of `auto` or `natural` cancels an inherited one.

Height has one extra choice, **Fill**, meaning the height the surrounding layout gives it. Ratio does not apply while Height is Fill.

An embed with nothing set is 16:9 at 100% width. An SVG with nothing set uses its viewBox.

Fill uses `height:100%` on the helper, the media absolutely positioned, and a `::before` carrying a 3:2 `padding-top`. It stretches in a flex or grid row, takes a definite parent's height, and in an indefinite parent is 3:2. Min height is its floor. Containers' content bands MUST pass height to children when the container's height comes from a min-height, a ratio or a stretched row. PS-2 proves this across the 13 tested layouts.

The editor uses the same CSS.

### 7.3 When the helper is printed

The helper is printed if, at any device, on resolved values, any of these hold: Height is `fill`; `OverlayColour`, `OverlayGradient` or a hover form is set; Shape is a mask shape (not none, circle, ellipse or pill); the media part has hover scale above 1, Parallax, Ken Burns, Pinned or a clip entrance. A caption or link never causes it. Once printed, it is printed for all devices and takes box paint at all devices.

### 7.4 What paints where

| Setting | Without helper | With helper |
|---|---|---|
| Width, Max width, Alignment, Order | Layout box | Layout box |
| Height, Ratio, Min height, Max height | Media element | Helper |
| Border, Radius, Shadow, Padding, Background | Media element | Helper |
| Fit, Focal, Opacity, Blend, Filters | Media element | Media element |
| Overlay | n/a | Without a mask: helper `::after`. With a mask: `.sgs-media-box__mask::after` |

With the helper and no mask, it has `overflow:hidden`. With a mask, the mask layer clips.

Spacing around a slot belongs to the parent's gap or Alignment. The cloner never writes a margin onto a slot.

### 7.5 Shapes

Registry: `includes/data/media-shapes.json`, entries `{slug, label, viewBox, path, fit, paint, ratio}`, one closed path each. `fit` is `stretch` or `keep-proportions`. `paint` is `radius` or `mask`. Seeded with circle, ellipse, pill, squircle, arch, hexagon, diamond, octagon, star, tag, speech bubble, ticket and several blobs. The shape-divider, `icon-shapes.json` and buybox sticker geometries live here and their renderers read it, so the repo has one library.

A person looks in one grid and picks a shape; how it is drawn is hidden. Circle, ellipse and pill are drawn with `border-radius` on the surface, needing no helper and keeping ordinary borders and shadows. Picking Circle also sets Ratio 1:1 at that device, when no Ratio is set, as one undo step. Everything else is a mask.

Uploads: one `.svg` of at most 20 KB with a viewBox, sanitised, printed as a data URI, alpha only. Failure shows "This shape could not be used" and the reason. Keep-proportions masks use `mask-size:contain` and an encoding without `preserveAspectRatio="none"`.

Mask structure: helper (shadow as `filter:drop-shadow`, through `helpers-shadow-filter.php`) > `.sgs-media-box__mask` (the mask, the media, overlay and zoom), with an SVG stroke layer beside the mask layer, outside its clip.

While a mask shape is on: Corners is omitted, and any stored radius kept and noted. Shadow's Spread, Inset and Raw CSS are omitted with "Shadows follow the shape". Padding sits on the helper. Border follows through one renderer-authored inline SVG `<path>` with non-scaling stroke (proved on stretch and keep-proportions at 1x and 2x): uniform width only, dashed and dotted through `stroke-dasharray`, per-side widths omitted. Shape is per device; `none` at a device clears it. Embeds cannot be shaped except by circle, ellipse and pill.

### 7.6 Sizes attribute

Derived, never typed, on every `<source>` and `<img>`: `px`, `vw` as given; `rem` and `em` at 16px; `%` of the nearest declared parent max width, else of `100vw`; `calc`/`clamp`/`min`/`max` when every term is `px`, `rem` or `vw`, else `100vw`; Fill: `100vw` divided by the item-set column count when known, else `100vw`. Cover-cropped images widen by the crop factor. The renderer sets loading, decoding, sizes, width and height itself on the markup, and a fixture runs `wp_filter_content_tags` over it to show the core filters leave it correct.

### 7.7 Loading and priority

Per slot, first match wins:

1. Inside a hidden surface (mega panel, drawer, modal, wishlist panel, cart): lazy; claims nothing.
2. Slot's Load priority is Load first: eager, lead candidate. Load later: lazy.
3. In the site header or the first top-level section, and not an item of an item-set block: eager.
4. An item of an item-set block in the header or first two top-level sections: eager up to its desktop column count, at most 8 per page.
5. Otherwise lazy.

Position comes from one pre-pass over the parsed block tree of the template, its parts and the content, run once per request on first media render. It records the lead slot by its scope hash. A block rendered with no page around it (REST, a cached fragment) gets lazy and never high. Unknown position means lazy.

The lead is the first eager candidate that is not `logo`, `layer` or a brand strip. One per page takes `fetchpriority="high"`. An art-directed lead prints preload links per resolved file: mobile (`max-width:M`), tablet-only (`min-width:M+1` and `max-width:T`), default (`min-width:T+1`), merged where files match, each with its own `imagesrcset` and `imagesizes`. A video lead uses its poster. Ken Burns on a lead image defaults off.

### 7.8 Backgrounds

```
<section class="…{uid}">
  <div class="sgs-bg-media">picture, video, svg or tile layer</div>
  <span class="sgs-bg-overlay"></span>
  content
</section>
```

`.sgs-bg-media` replaces today's `.sgs-container__image-bg` and root `::before` paths, keeping stacking of media, overlay, content and shape dividers. Tile: `background-image` on the element, with Repeat and TileSize. Actual size: `object-fit:none`. Backgrounds default to Decorative, which a content photograph can switch off. A background has no alt requirement.

### 7.9 What each kind needs

The same setting needs different code per kind. The emitter and renderer follow this table.

| Setting | Image | Video file | Embed | SVG |
|---|---|---|---|---|
| Printed as | `<img>`, `<picture>` | `<video>` | `<iframe>` | inline `<svg>`, viewBox kept |
| Ratio, Width, Height, limits | CSS | CSS | CSS | CSS |
| Fit | `object-fit`, all five | `object-fit`, all five | Not offered; the player scales itself | `preserveAspectRatio`: Cover is `xMidYMid slice`, Contain is `xMidYMid meet`; only those two offered |
| Focal | `object-position` | `object-position` | Not offered | Not offered |
| Border, Corners, Shadow, Background | CSS | CSS | CSS | CSS |
| Opacity, Greyscale, Blur | CSS | CSS | Not offered | CSS |
| Blend | `mix-blend-mode` | `mix-blend-mode` | Not offered | Not offered |
| Overlay | Helper layer | Helper layer, `pointer-events:none` | Helper layer, `pointer-events:none` | Helper layer |
| Mask shapes | Yes | Yes | No | Yes |
| Hover zoom, Parallax, Ken Burns | Transform | Transform | Not offered | Transform |
| Loading | Priority, per §7.7 | Poster is the candidate; `preload` | `loading="lazy"` | Not applicable |
| Alt | `alt` | `aria-label` | `title`, required | `role="img"`, `aria-label` |
| Playback | n/a | Element attributes | URL parameters (autoplay, mute, loop, controls, start) | n/a |
| Per-device sources | `<source media>` | Sibling, `preload="none"` until shown | Sibling | Sibling |

## 8. Data model

Names are `{prefix}{Base}`. R = responsive value.

| Base | Type | Valid | Default | CSS | Paint node | Emitter | Hover form |
|---|---|---|---|---|---|---|---|
| `Source` | R object | `{kind,id,url,width,height,mime,poster:{id,url,width,height},markup}`; plus `featured` kind | empty | none | n/a | none | |
| `Alt` | string | | `""` | none | n/a | none | |
| `Decorative` | boolean | | false; backgrounds true | none | n/a | none | |
| `Fit` | R string | `cover`, `contain`, `fill`, `none`, `scale-down`; image backgrounds add `tile`, `actual`; SVG `cover`, `contain` only | `cover` | `object-fit` | media | plain | |
| `Focal` | R object | `{x,y}` | centre | `object-position` | media | plain | |
| `Height` | R string | length, `fill` (labelled Fill), `auto` | empty | `height` | surface | plain | |
| `Ratio` | R string | `w / h`, `natural` (labelled Photo's own) | empty | `aspect-ratio` | surface | plain | |
| `Width`, `MaxWidth` | R string | length; Width `auto` | empty | matching | layout | plain | |
| `MinWidth` | R string | length | empty | `min-width` | layout | plain | |
| `MaxHeight`, `MinHeight` | R string | length | empty | matching | surface | plain | |
| `Alignment` | R string | `start`, `center`, `end` | empty | `margin-inline-*` | layout | plain | |
| `Order` | R number | -20 to 20 | empty | `order` | layout | plain | |
| `Radius` | R corners | corners | empty | `border-*-radius` | surface | corners | |
| `BorderWidth` | sides | 0 to 40px (not per device) | 0 | `border-*-width` | surface | sides | |
| `BorderStyle` | string | core styles | `solid` | `border-style` | surface | plain | |
| `BorderColour`, gradient forms | string | token, hex | empty | `border-color` | surface | colour-states | yes |
| `Padding` | R sides | 0 to 500px | empty | `padding-*` | surface | sides | |
| `Background` | string | token, hex | empty | `background-color` | surface | plain | |
| `BoxShadow`, `BoxShadowColour`, `ShadowLiftOnHover` | per `ShadowControl`; lift off by default | | | `box-shadow` | surface | shadow | yes |
| `Opacity` | R number | 0 to 100 | 100 | `opacity` | media | plain | |
| `Shape` | R object | `{shape,customId,fit}` | none | `mask-image` | mask | plain | |
| `OverlayColour`, `OverlayGradient` | string | token, hex | empty | colour | overlay | colour-states | yes |
| `OverlayOpacity` | R number | 0 to 100; 0 at a device clears it | 100 | `opacity` | overlay | plain | |
| `OverlayBlend`, `Blend` | string | CSS blends | empty | `mix-blend-mode` | overlay, media | plain | |
| `Greyscale`, `Blur` | R number | 0 to 100; 0 to 100px | 0 | `filter` | media | plain | |
| `Repeat` | R string | `repeat`, `repeat-x`, `repeat-y`, `no-repeat`, `space`, `round` | `no-repeat` | `background-repeat` | media | plain | |
| `TileSize` | R string | length, `auto` | `auto` | `background-size` | media | plain | |
| `Loading` | string | `auto`, `first`, `later` | `auto` | none | n/a | none | |
| `Playback` | object | `{autoplay,muted,inline,loop,controls,lazy,start}` | per kind | none | n/a | none | |
| `Captions` | object | `.vtt` id, label, language | empty | none | n/a | none | |

Filters combine in fixed order (greyscale, blur). Hover rules sit inside `@media (hover:hover)` with a 200ms transition, removed under reduced motion. Overlay hover is a second colour in the overlay's control, which is all a darker-to-lighter hover needs. All other hover behaviour (zoom, brighten, grey-to-colour) is the Hover panel's.

Defaults: Fit is applied only where the box crops. An unset Focal displays as "Centre (default)" and writes nothing. Playback: block video controls on, autoplay off, loop off, inline on, lazy on; background video autoplay, muted, loop, inline on, controls off, on every device, with its poster while loading and under reduced motion.

`sgs/media` also has `caption`, `captionTag`, link fields, the `caption*` typography and colour family and the player's `videoTime*`. SVG slots add `SvgLayer` ("Layer order": Behind content, In front of content), `SvgAnimation`, `SvgAnimationSpeed`, `SvgTextShadow`.

Source: embed per FR-49-17. `svg` is pasted or uploaded markup, printed inline; an `.svg` chosen as a photo is an `<img>`. `featured` uses the post's featured image, on card, product and post slots.

### 8.1 DB and gates

Add a nullable `paint_node` column to `block_attributes` (`media`, `surface`, `layout`, `overlay`, `mask`, `ring`); `css_element` keeps its meaning. It has its own seeder layer reading the generated tables, so a reseed does not null it. The generator supplies classification entries (`attr-classification-overrides.json`), so `tier_shape` is declared `tier_object` for every R value rather than guessed from render code. PS-1 proves this, plus the resolver, `check_value_identity`, the inline-styling gates, and `check-wiring-fingerprint`.

### 8.2 Removed

Attributes: per-block maps in §13. Code, each with a grep in AC-5:

`sgs_tier_media_render`, `sgs_tier_media_toggle_css`, `sgs_render_media`, `sgs_responsive_image`, `sgs_image_loading_attrs`, `sgs_next_background_image_index`, `sgs_content_image_claims_priority`, `sgs_media_hover_zoom_clips`, all `sgs_media_element_*`, `SGS_Media_Element`, `includes/media/atoms/*`, `includes/media-element-attrs-register.php`, `media-element-attributes.generated.php`, `helpers-media-position.php`, `includes/image-controls.php`, `assets/css/media-atoms/*`, `assets/css/media-element.css`; JS `src/components/media/atoms/*`, `MediaElementControls`, `MediaElementPanel`, `MediaPanelLayout`, `MediaStylingPanel`, `MediaSizingPanel`, `MediaBoxShapeControls`, `ObjectFitField`, `FocalPositionField`, `MediaPicker`, `extensions/image-controls.js`; scripts `generate-media-attributes.mjs`, `generate-media-stylesheet.mjs`, `check-media-atom-purity.js`, `check-media-disclosure-coverage.js`, `test-media-atom-parity.mjs`, `test-media-attr-parity.mjs`, `test-media-enum-vocabulary.mjs`, `test-media-injection-parity.mjs`; flags `supports.sgs.imageControls`, `supports.sgs.mediaElements`; the `img[data-sgs-mc~="background-position"]` overscan rule.

### 8.3 Slot declaration

`supports.sgs.mediaSlots` is an array of `{prefix, context, kinds, settings, panel}`. `settings` is `"all"` or a list of §8 bases. The generator refuses unknown names. A block with no slots has no media controls.

Item-set blocks declare block-level settings with the item prefix (Ratio, Fit, Radius, Mask, Loading, hover zoom) as ordinary attributes, and per-item values inside each item object under `source`, `alt`, `decorative`, `fit`, `focal`, using §8's value shapes. Items inherit the block-level Fit. `tier_shape` is `slot-array`. Per-item CSS uses scope `{uid}-i{index}`.

## 9. Editor

### 9.1 Global

Labels print once. Each panel is a collapsible `PanelBody`; Media and Size and crop open by default. Every panel has Reset in its header menu. Multi-write actions (Circle, Replace, Reset) are one undo step.

### 9.2 Shared components (`src/components/media/`, plus `ResponsiveOverride`)

- **`ResponsiveOverride` (reworked):** the only per-device wrapper for media. Off desktop, an inherited field shows the inherited value in normal text, with "Mobile: using Tablet" naming the true source, or "Mobile: default". Dots mark Tablet and Mobile when they hold their own value, and a closed panel shows one when anything inside does. The dot is a shape with an accessible name. Reset reads "Reset to Tablet" off desktop, "Reset to default" on desktop. Global controls (Alt, Caption, Border width, Load priority, Playback) show "Applies to all devices" when not on Desktop. The device name is part of each accessible label. `lint-responsive-controls.py` is updated in the same commit.
- **`MediaSlotField`:** kind tabs for the slot's kinds, Media Library first, preview, Replace, Remove, and an inherited-media display per device. On Replace, Focal resets to centre unless "Keep focal point" is ticked, and if Alt is non-empty the panel says "Alt text still describes the previous photo. Update it." with focus on Alt. Picking a device-specific file never writes Alt. Empty Alt on first pick copies the library alt. Video preview has pause.
- **`FocalField`:** shows the resolved media and point. Drag or click; X and Y percent 0 to 100; quick picks Top, Centre, Bottom, Left, Right; Reset. On a device with its own image inheriting Focal: "Using Desktop's focal point on this image." Help: "Choose the part of the photo that must stay in view when it is cropped." Keyboard: the percent inputs and arrow keys, announced in a live region.
- **Sizing fields:** separate, always-available controls. **Aspect ratio** chips: Photo's own, 1:1, 4:3, 3:2, 16:9, 3:4, 9:16, 21:9, Custom. **Width** and **Height** as lengths, with Auto, and Fill on Height (help: "Uses the height the surrounding layout gives it"). **Min width, Max width, Min height, Max height** as lengths. Nothing clears anything else. A value §7.2 does not use stays and appears in the hidden-value note.
- **`FitField`:** icon chips with each kind's options from §7.9: Cover (crop to fill), Contain (show all), Stretch, Actual size, Never enlarge, and on image backgrounds Tile.
- **`ShapeField`:** one grid, labelled Shape, drawing the client's own photo in each shape: None, Circle, Ellipse, Pill, the mask shapes, Upload shape; Keep proportions where a shape allows it.
- **`Chips`:** the shared contract for ratio, fit and mask grids: `role="radiogroup"`, arrow-key roving focus, 44px targets, selected not by colour alone, visible focus, hover brightens.
- **`MediaPanelHost`:** mounts §9.4 from the rule table.

Lengths use `SgsLengthControl` with `presets={false}` in `ResponsiveOverride`. Rule evaluation is memoised per slot and device, using each rule's declared dependencies.

### 9.3 Rule table

In `media-settings.json`, evaluated at the active device against resolved values. Kinds: I image, V video file, E embed, S SVG. Context B background.

| Control | Kinds | Condition |
|---|---|---|
| Alt / Title | I V E S | Omitted when Decorative. Label "Alt text" on I; "Title (for screen readers)" on V, E (E warns when empty); S aria-label |
| Decorative | I V S | Not with a link |
| Poster | V, E | |
| Load priority | I, poster | |
| Caption | I V | |
| Caption tag | I V | Caption text exists |
| Link | I | |
| Playback | V E | Muted and Inline lock with Autoplay. Embed has autoplay, mute, loop, controls, start at |
| Captions file | V | |
| Aspect ratio | I V E S | Not when Height is Fill |
| Width, Height | I V E S | |
| Min width | I V E S | |
| Max width, Max height, Min height | I V E S | |
| Fit | I V S | The box crops |
| Focal | I V | The box crops and Fit is not `fill` |
| Alignment, Order | I V E S | |
| Corners | I V E S | Omitted with a mask shape, circle, ellipse or pill |
| Border width | I V E S | |
| Border style, colour | same | A width is set |
| Shape | I V E S | Embed: circle, ellipse, pill only |
| Shadow | I V E S | With a mask, per §7.5 |
| Padding | I V S | |
| Background | I S | Fit is `contain`, or S |
| Overlay | I V E S | Strength and blend after a colour is set |
| Photo opacity, Greyscale, Blur | I V S | |
| Blend | I V | |
| Typography: Caption and colour | I V | Caption exists |
| Typography: Video time | V | Player showing |
| SVG panel | S | |
| Repeat, Tile size | B, I | Fit is Tile |

Backgrounds show Media, Fit, Focal, Tile options, Overlay, Loading and the motion line, and never Size, Width, Alignment, Order, Border, Radius, Shadow, Padding, Mask, Caption or Link. Mixed kinds use the resolved kind at the active device, and Alt shows if any device resolves to a kind that uses it.

Hidden-value note, panel foot, for example: "Aspect ratio (Mobile) is saved but unused: Width and Height are both set." or "Focal point (Mobile) is saved but unused: Fit is Stretch.", with Reset.

### 9.4 Panels

`sgs/media`, Settings: **Media** (kind and source, Poster, Alt or Title, Decorative, Load priority); **Caption and link**; **Video** (Playback, Captions).

Styles: **Size and crop** (Aspect ratio, Width, Height, Min width, Max width, Min height, Max height, Fit, Focal); **Position in the layout** (Alignment, Order in the row); **Border and shape** (Shape, Corners, Border, Padding, Background colour); **Shadow**; **Overlay and filters** (Overlay colour and gradient, Overlay strength, Blend, Photo opacity, Greyscale, Blur); **Typography**; **SVG**; **Hover**; **Entrance and reveal**; **Scroll and ambient effects**.

Caption colour sits in Typography as a declared `colourExemption`. Caption typography offers size, family, weight, style, line height, letter spacing, transform, alignment. Video time offers size, family, weight.

Background panel: Media, How it fills, Focal, Tile options, Overlay, motion line. On the toolbar: Replace and Alignment. Hover panel subtitle: "Overlay, border and shadow changes on hover are set in their own panels."

Each motion panel carries a one-line subtitle, and Hover says "Hover has no effect on touch screens" on Tablet and Mobile.

Catalogue of ranges: Width, Min width, Max width: `px`, `%`, `rem`, `em`, `vw`, `ch`, 0 to 5000. Heights: `px`, `%`, `rem`, `em`, `vh`, `svh`, `dvh`, `vw`. Radius: `px`, `%`, `rem`, `em`, 0 to 9999. Padding: `px`, `rem`, `em`, `%`. Opacity, strength, greyscale: percent, step 1. Blur: `px`, 0 to 100. Parallax strength: chips Gentle (0.1), Medium (0.2), Strong (0.4), and a custom 0 to 1 in Fine-tune. All in `media-settings.json`.

### 9.5 States

Empty: four buttons (Photo, Video file, YouTube or Vimeo link, SVG). Deleted file: red "Image missing" with Replace; the page prints nothing, no broken icon, no shift. Missing alt on a non-decorative image: an inline warning, never a block. Unsupported embed: "This address is not a supported video". Hidden via a Hide toggle or `none`: an editor-only dashed bar naming where it shows. Advisory on the original upload over a slot threshold (2 MB backgrounds and heroes, 500 KB otherwise; video 20 MB) with "Choose a smaller size in the library".

### 9.6 Motion line

Bottom of the Background panel: "Background motion: Parallax, gentle [Change]" or "Background motion: none [Add]", first two effects then "+N". The button dispatches `open({clientId, panel:'effects', target:'background'})` with an incrementing `requestId` to the `inspector-focus` store. Effects, now controlled, opens, selects the target, scrolls to itself and moves focus to its heading, announced in a live region. Add creates nothing.

### 9.7 Parity

The editor uses the emitter's CSS. Video shows its poster or a live element; an embed shows its iframe with pointer events off.

## 10. Effects

### 10.1 Targets

Parts in `supports.sgs.elements`. `media` on `sgs/media` loses `isWrapper`; the manifest gate is updated with it. Backgrounds: `background` (selector `.sgs-bg-media`), `background-video` (declared), `svg-bg` (name kept). A part carries `availableWhen: {slot, kinds}`, which the target picker evaluates. `absentIn` remains QA-only.

Effects are generated (`generated-fx-qualifying-blocks.json`) with `motionSurface` on `sgs/media`. AC-19 asserts the media part's list equals `sgs/decorative-image`'s minus text, burger, icon and step presets. Hover, Entrance and Effects are not per device, except Parallax's per-device switch.

### 10.2 Parallax

Stored as today: `speedRatio` (-1 to 1, with direction as the sign), `clamp` (px) and `basis`. Axis y only. Default 0.2. A layer targets the part; the `background` boolean is removed.

`basis:page` is measured from the block's own top: `distance = max(0, scrollY − blockTop)`.

Overscan, per side, printed in the moving element's scoped rule, as inset and height:

| Basis | Top | Bottom |
|---|---|---|
| view | `|r| × (H + V) / 2` | same |
| page, r > 0 | `|r| × H / 2` | same |
| page, r < 0 | `|r| × H / 2` | `|r| × H` |

H is the block height, V is `100lvh` to match the driver's `window.innerHeight`. Runtime clamps travel to overscan. Reduced motion: no movement. Verified at speeds 0.1, 0.5 and 1, both signs, both bases, at 375 and 1440.

`speedRatio` 0.18 on the Eye Care hero gives the draft's ±9% at the page's top.

### 10.3 Pinned

A separate effect: the media holds still in its block while the page moves, by transform on the real element. PS-4 proves it on WebKit. If it fails there: "Pinned (not on iPhone)" and static on WebKit.

### 10.4 Elements

| Element | Prefix | Context | Kinds | Settings | Specialised |
|---|---|---|---|---|---|
| `sgs/media` | `media` | content | all | all | Caption, Link |
| Container, trust bar, site header, site footer, multi-button, physics canvas, nav drawer | `background` | background | I V S | Source, Fit, Focal, Repeat, TileSize, Overlay, Loading | Tile |
| Hero background | `background` | background | I V S | same | |
| Hero split | `split` | content | I V S | all but Caption | Column placement |
| Decorative image | `layer` | layer | I S | all but Caption, Link | Position, rotation |
| Gallery | `item` | item | I V | Source, Fit, Focal, Ratio, Radius, Mask, Loading | Grid, caption reveal |
| Card grid, post grid | `image` | item | I, featured | same | Grid |
| Product card, buybox | `image`, `thumb` | item | I, featured | Source, Fit, Focal, Ratio, Radius, Loading | Colour swap, thumbnails |
| Team member, testimonial | `photo` | content | I | Source, Fit, Focal, Radius, Mask | Layout |
| Testimonial logo, work | `logo`, `work` | content | I | Source, Fit | |
| Before-after | `before`, `after` | content | I V S | Source, Fit, Focal, Height, Width, Radius | Divider |
| Timeline | `entry` | content | I V | Source, Fit, Focal, Ratio, Radius | |
| Responsive logo | `logo` | content | I S | Source, Width, Loading | Light and dark source |
| Choice-flow option | `option` | item | I | Source, Fit, Focal | Set by flow fit |
| Trust-bar badge | `badge` | item | I | Source, Fit, Radius | |
| Brand strip, image sequence, cart thumbnails, product search, swatches, info box | as declared | item or content | I | Source, Fit | Context |

## 11. Cloner and agent contract

Schema: `schemas/media-slot.schema.json`, refusing unknown keys and shapes. `wp-build-page` reads it. Tiers are written only where a device differs from what it would inherit. Rows match top to bottom; first match wins; an absorbed wrapper is matched on its merged box.

| Draft pattern | Target |
|---|---|
| Frame height set by a parent, or `height:100%` of a definite parent | Height Fill |
| `height:100%` of an indefinite parent | No Height |
| `aspect-ratio`, `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height` | The setting of the same name, as declared |

| Computed `object-fit` where the box crops, including `fill` | Fit; no crop writes neither Fit nor Focal | | `object-position` in `{x,y}` terms | Focal; otherwise Custom CSS, reported | | `border-radius` of 50% on all corners | Shape Circle if square, else Ellipse | | Fully rounded ends | Shape Pill | | Any other `border-radius` | Corners | | `clip-path`: `circle(50%)`, `ellipse(50% 50%)` | Shape Circle or Ellipse; `inset(… round R)`: Corners R; polygon within 1% of a registry shape: that Shape; else Custom CSS, reported | | Border, shadow, padding, opacity, order, min and max sizes | As named | | `filter` blur or grayscale | Blur, Greyscale; other filters Custom CSS, reported | | `mix-blend-mode` | Blend | | Margin or offsets | Not written | | Overlay child | Overlay | | `:hover` scale on image or wrapper | Hover Zoom on the media part | | `<image-slot>` no shape | Corners 12px; with shape rect: none; rounded: Corners; circle, pill: that Shape | | `<picture>` | Per-device Source | | `<figure><figcaption>`, `<a>`, `<iframe>`, `<svg>`, `<video>` | Caption, Link, embed, svg, Playback | | `background-image` with children | Background slot; size cover or contain to Fit, auto with repeat to Tile, position to Focal, attachment fixed to Pinned | | `background-image`, no children | `sgs/media` |

**Absorption:** an element is merged into the media when it has exactly one image, video or picture child, plus at most one absolutely-positioned overlay with no text or one figcaption; it has no text of its own; and its overflow is hidden or clip, or it declares ratio, radius, border, shadow or background colour the image does not repeat. Controls, positive: radius only, ratio only, overflow only, overlay, figcaption, background colour. Negative: text, two images, badge.

## 12. Acceptance tests

Editor on a local mirror; front end in real Chrome at 375, 768 and 1440, Firefox and WebKit where stated.

- **AC-1** After `sgs-update`, every setting has a DB row with its property, `tier_object`, and `paint_node`; the drift gate fails on an edited block.json (negative control).
- **AC-2** Detector over `block.json`s: no flat media tiers, one Focal shape, no tiered Alt.
- **AC-3** Fixture of Ratio, Width, Height and each limit in combination, per device, matches §7.2 in editor and front end, including ratio with a height, a width, or a maximum; all three browsers.
- **AC-4** Three-source picture: one image request per width. `none` and a Hide toggle: none. Image on desktop with video on mobile: zero image requests at 375. `wp_filter_content_tags` leaves the markup correct.
- **AC-5** Each §8.2 name greps empty.
- **AC-6** Helper present for each trigger, including at one device only and hover colour only; absent for caption only, link only, both, or none. The Circle shape with shadow, overlay and hover zoom is a true circle on image and embed. Focus rings not clipped.
- **AC-7** Every background state prints `.sgs-bg-media`; parallax moves it; with a divider and overlay, stacking holds at three widths.
- **AC-8** Shared fixture of breakouts, run through PHP and JS, neutralised; SVG script and handlers removed on the front end; a non-allowlisted embed refused; every emitter output validates.
- **AC-9** No per-block style tags; two identical blocks make one rule; scope class stable across two loads; CSS order per §6.2.
- **AC-10** On home, shop, product, post and contact at 375x667 and 1440x900: no in-view image lazy; exactly one high; none from hidden surfaces; REST or cached fragments are never high.
- **AC-11** Firefox and WebKit reserve the same space as Chrome; no typed `attr()`.
- **AC-12** Panels, order and labels per kind match §9.4 (DOM check).
- **AC-13** Each rule-table row visible and omitted at each device; no empty panel; no duplicate labels; rule evaluation under 16ms for a container with three slots.
- **AC-14** On Tablet a change writes only tablet; Mobile says "using Tablet"; dots and Reset work; undo restores in one step; hidden note and its Reset work; global controls say so.
- **AC-15** Inherited tier's picker shows the inherited point on the inherited image.
- **AC-16** A 30-slot matrix (Height, Ratio, Width, Fit, kind, hover, gradient, shadow) is equal within 1px across editor and front end at three widths; no `style` attribute on any media element in the editor.
- **AC-17** Each §9.5 state shows its message; the deleted file prints nothing.
- **AC-18** Gate fails on a hand-rolled picker and on a second focal shape (negative controls).
- **AC-19** Effects listed as §10.1; targets match availability.
- **AC-20** Parallax per §10.2, no gap, measured, including a block at 3000px and a shrunken mobile toolbar. Pinned on WebKit. No Attachment.
- **AC-21** The motion line opens Effects targeted at Background, repeatedly, and moves focus.
- **AC-22** No old media shape attribute or clip-path preset; `sgs/icon` shape unaffected; Circle sits in the Shape grid.
- **AC-23** Each mask shape on a photo with shadow, under 2% pixel difference at a 4-level tolerance, all three browsers; border follows; per-device mask.
- **AC-24** Fixture per §11 row; absorption controls; schema refuses unknown shapes; `wp-build-page` accepts slots.
- **AC-25** Detector survey zero old attributes on every site, pattern and tree; computed width, height and object-fit within 1px before and after except the listed allowed changes; Bean checks the five sites by eye (FP-13).
- **AC-26** Each §10.4 row passes; the Eye Care hero parallax and focal point on settings alone.
- **AC-27** Fill in a bare parent, fixed parent, stretched flex item, grid cell, min-height section and ratio container; never 0.
- **AC-28** Keyboard only: walkthroughs 1 to 13 below complete; axe finds no serious issue in any panel; 44px targets; visible focus.
- **AC-29** Each walkthrough completes: replace a photo; circle; different mobile crop; arch with shadow and border; fill in a card; overlay lightening on hover; video with poster; embed with radius; phone-only image; hero parallax from Background; hover zoom; working on Mobile; Reset.

## 13. Migration

Tool: `plugins/sgs-blocks/scripts/migrate-media-system/` (survey, fix, check, self-test with a negative control). It refuses any attribute with no mapping, and the survey output is committed. Targets: saved content in all five sites, `theme/sgs-theme/patterns/`, `sites/*/build/` trees and skeletons, motion fixtures including the canary's ten QA pages, and computed-route calibration fixtures.

| Old | New |
|---|---|
| `mediaType`, `videoSource`, `imageId/Url`, `videoUrl/Id`, `svgContent`, tiers | `mediaSource` |
| Saved Lottie media (one block across all sites) | Reported and resolved by hand |
| `thumbnailId` and tiers | `Source.poster` |
| `imageAlt`, per-tier alts | `mediaAlt` (desktop, else first non-empty) |
| `imageDecorative` | `mediaDecorative` |
| `mediaSizing: fill` | Height `fill` |
| `mediaSizing: height` | Height; `Width: auto` when no width was stored, so the page does not change |
| `mediaSizing: ratio` | Ratio, Height `auto` |
| `mediaSizing: auto` | nothing |
| `aspectRatio` | Ratio |
| `objectFit`, tiers | Fit |
| `objectPosition`, focal strings, `{x,y}`, keywords (left, top 0; centre 0.5; right, bottom 1) | Focal; unparseable is reported, refused |
| `minHeight`, SVG min height | Min height (the larger) |
| `opacity` × SVG opacity | Opacity |
| `imageBlendMode` | Blend |
| `displayWidth` | deleted |
| `style.color.duotone`, `supports.filter` | deleted |
| `shape` rounded | Corners 12px |
| `shape` circle | Shape Circle |
| `photoShape`, `galleryStickerShape`, `splitMediaShape`, decorative `shape` | Shape or Corners |
| `backgroundImage*`, `bgVideo*`, `bgSvg*` | `backgroundSource` |
| `backgroundSize`, `backgroundPosition`, `backgroundRepeat` | Fit, Focal, Repeat, TileSize |
| `backgroundAttachment: fixed` | Pinned effect |
| Parallax `background:true` | Layer on the background part |
| Motion layers on old parts | New part names |
| `splitMedia*` | `split*` |
| `chromeLogoTablet/Mobile` | Responsive logo Source |
| `sgsObjectPosition`, `sgsObjectFit`, `imageZoomHover`, `sgsHoverZoom*`, `scaleHover`, `grayscaleHover` | Focal, Fit, Hover effects on the media part |
| `backgroundColour`, `mediaBackgroundColour` on media elements | Background |
| Custom CSS setting focal, size or per-device visibility | Settings, each reported |
| Caption size family | `caption*` responsive |

Blocks with a `save.js` printing media are listed in the survey and re-rendered as dynamic, since FP-14 bars `deprecated.js`.

Site order: mirrors, then sandybrown with full motion QA, then indus-test, then eye-care-clone-test, then mamas-test, one at a time with database backups. `eye-care-test`, the presented site, runs last only with Bean's agreement. Rollback: restore that site's backup and redeploy the previous tag.

## 14. Build plan

### 14.0 Working rules

The main thread is the Integrator: only it reseeds, regenerates tracked files, edits baselines, and deploys. A reseed takes about six minutes; nothing commits during one. Build agents work in their own git worktrees, never link `node_modules`, commit with explicit pathspecs, never run `sgs-update` or `build-deploy.py`, keep editor checks on local mirrors and never burst Hostinger. Up to eight agents at once.

### 14.1 Stages

**Stage A, dormant on main.** New files only, adopted by nothing, so old gates and pages are unaffected. **Stage B, one cutover release.** A short integration branch, opened after Stage A, applies block adoption by script and hand, runs migration on mirrors, passes both gate tiers and PS-8, merges to main in three or more commits (FP-5), and removes old code in the same release. Hero and wrapper edits by other streams freeze during Stage B and during the wrapper split.

Eye Care's remaining checks carry on alongside Stage A. Mama's work that touches media waits for the cutover.

### 14.2 Proofs (run first, independent)

PS-1 DB and gates accept §8 (`SGS_FRAMEWORK_DB` on a private copy, proven by sha). PS-2 §7.2 Fill design, in standards mode, 13 layouts. PS-3 SVG stroke with the layer outside the clip. PS-4 Pinned on WebKit. PS-5 lead pre-pass on REST and cached fragments. PS-6 reseed time and block.json size with every slot added. PS-7 five sample rows produce byte-identical CSS in PHP and JS. PS-8, at cutover, compares old and new computed styles on real pages. Outcomes: PS-2 fails: Fill requires a parent height and shows "Needs a tall container". PS-3 fails: Border is omitted with a mask. PS-4 fails: §10.3. PS-5 fails: no high priority on fragments. Only PS-1 and PS-7 gate WP-1.

### 14.3 Contracts (frozen before WP-1)

**C1 Table entry:**

```json
{ "base": "Fit", "type": "string", "enum": ["cover","contain","fill","none","scale-down"],
  "enumByContext": { "background": ["tile","actual"] }, "default": "cover", "responsive": true,
  "emitter": "plain", "css": { "property": "object-fit", "paint_node": "media" },
  "control": { "component": "FitField", "label": "How it fills", "panel": "size-and-crop", "order": 6 },
  "visible": { "kinds": ["image","video"], "when": [ { "crops": true } ], "deps": ["Height","Ratio","Width"] },
  "slots": "all" }
```

**C2 Renderer:** `SGS_Media_Renderer::render( array $slot, array $attrs, array $context = [] ): array` returning `{html, css, needs_helper, lead_candidate, preload}`. `$slot`: `{prefix, kinds, context}`. `$context`: `{uid, block, area, section_index, item_set:{index,columns}, in_editor, extra_class, anchor}`. Empty or deleted source returns empty `html`. The caller prints `html` and passes `css` to the collector.

**C3 Emitter:** `SGS_Media_Emitter::css( array $slot, array $attrs, string $uid, bool $helper ): string`. Selectors: layout `.{uid}`; surface `.{uid}` or the helper; media `.{uid} .sgs-media-el` with a helper or a wrapper, else `.{uid}`; overlay `::after`; mask `.sgs-media-box__mask`. Keys sorted before hashing. JS twin: `mediaPreview( slot, attrs, uid ) -> { css, className }`. Fixture: `tests/fixtures/media/matrix.json`.

**C4 Rules:** `evaluateRules( settings, attrs, device, prefix ) -> { visible[], hiddenWithValue[{base,device,reason}] }`. `when` atoms, closed set: `attr/in`, `attr/notEmpty`, `kindIs`, `crops`, `maskOn`, `not`, `any`, `all`.

**C5 Priority:** `SGS_Media_Priority::resolve( array $context, array $facts ): array` returning `{loading, fetchpriority, claims, preload}`.

**C6 Store:** `inspector-focus`: `open({clientId,panel,target})`, `getRequest(clientId)`, `clear(clientId)`.

**C7 Shapes:** per §7.5.

**C8 Generator:** `scripts/generate-media-slots.mjs` reads the table and each `supports.sgs.mediaSlots`, writes attributes marked `_generated: "media-slots"`, `--check`, `--block <slug>`.

Stubs with these signatures ship in C0, so dependants build before the real code lands.

### 14.4 Packages

| Package | Owns | Needs | Stage |
|---|---|---|---|
| C0 Contracts | §14.3 stubs, schemas, file layout (Integrator) | | A |
| Proofs | proof scripts, reports | C0 | A |
| WP-0b Wrapper split | Background code of `class-sgs-container-wrapper.php` into `includes/class-sgs-background-layer.php`, no behaviour change | | A |
| WP-1 Core | Table, shapes file, schemas, generator, `paint_node`, Spec 32 and 35 amendments | PS-1, PS-7 | A |
| WP-15a Gates | New gates, `gate-disposition.json` classifying every gate as reused, changed or deleted | WP-1 | A |
| WP-2 Renderer | `includes/media/*` renderer, emitter, validator, settings; `media-base`, `-overlay`, `-video.css` | WP-1 | A |
| WP-3 Loading | `includes/media/class-sgs-media-priority.php` | WP-1, PS-5 | A |
| WP-4 Fields | `src/components/media/fields/*`, `emitter/mediaPreview.js`, reworked `ResponsiveOverride` | WP-1 | A |
| WP-5 Rules and host | `src/components/media/rules/*`, `MediaPanelHost.js` | WP-1 | A |
| WP-6 Masks | `media-shapes.json`, `media-mask.css`, `ShapeField`, divider and icon renderers reading it | WP-1, PS-3 | A |
| WP-10a Effects UI | Motion targets and fields, store, `render-paths.json` | WP-1 | A |
| WP-13 Cloner | `scripts/computed-route/*`, parity, skeleton rules, `wp-build-page`, Spec 48 | WP-1 | A |
| WP-14 Detector | Migration tool, mapping rows | WP-1 | A |
| Wave 1 | `sgs/media`, decorative-image, gallery | WP-2 to 6 | B |
| WP-8 Backgrounds | Background layer, BackgroundPanel, `media-bg.css`, wrapper adopters | WP-0b, 2, 4, 5 | B |
| WP-10b Motion runtime | Overscan, pinned | WP-2, 8 | B |
| WP-9 Hero | `src/blocks/hero/*` | WP-8 | B |
| Wave 3 | Card grid, post grid, product card, buybox, brand strip, logo | Wave 1 | B |
| Wave 4 | Team member, testimonial, before-after, timeline, choice flow, image sequence, cart, product search, swatches, info box, trust-bar badge | Wave 1 | B |
| WP-15b Docs, removal | Specs 02, 35A, 36, 48, rules, CLAUDE files; §8.2 | all | B |

Parallel: WP-0b, WP-2, 3, 4, 5, 6, 10a, 13, 14 after WP-1. Waves within Stage B after their needs. Generated files and baselines change only through the Integrator.

## 15. Non-functional

Accessibility: WCAG 2.1 AA; alt and title warnings; keyboard paths; reduced motion honoured; no serious axe findings. Performance: §7.7, §7.9. Security: FR-49-12, FR-49-14, FR-49-17. Browsers: Chrome, Firefox and WebKit gates. No media PHP file over 500 lines; `render.php` only calls the renderer. JS-written custom-property values are allowed at runtime; PHP and editor style attributes are not.

## 16. Traceability

Register items: H1 done (`24095ea4f`, resolved CSS values through token helpers). Q1, Q2: §6.5, §7.1, §7.8. Q3: §9.6. Q4: §6.6, FR-49-28. F1: FR-49-4, FR-49-23, §10.4. F2, F3, F4: §9.2 `FocalField`, §9.3, §9.4. B1: FR-49-29, §10.2. B2: §6.6, §9.3. M1: §9.4. M2: FR-49-27. M3: §9.4. M4: FR-49-19, §9.3. M5: §9.4. M6: §7.4, §9.4. M7: FR-49-32, Circle, §7.5. M8: §9.2. R1: FR-49-19, FR-49-20. R2: §10.4. R3: §6.1, FR-49-26, WP-15. R4: §10.

FR to AC: FR-1 AC-1; FR-2 to 4 AC-2; FR-5 AC-3; FR-6, 8, 9 AC-4; FR-7 AC-5; FR-10, 17, 31 AC-6; FR-11 AC-7; FR-12, 14, 17 AC-8; FR-13 AC-9; FR-15 AC-10; FR-16 AC-11; FR-18 AC-12; FR-19 AC-13; FR-20 to 22 AC-14; FR-23 AC-15; FR-24 AC-16; FR-25 AC-17; FR-26 AC-18; FR-27, 28 AC-19; FR-29 AC-20; FR-30 AC-21; FR-32 AC-22; FR-33 AC-23; FR-34, 35 AC-24; FR-36 AC-25; FR-37 AC-26; FR-38 AC-27.

## 17. Open questions

None. Bean's rulings on 2026-11-09: no CSS size target for this work; duotone left out; videos play on phones.
