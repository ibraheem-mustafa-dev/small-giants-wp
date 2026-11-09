---
doc_type: spec
spec_id: 49
spec_version: "0.5"
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
  - 2026-11-09: v0.4, CSS sizing research applied; awaiting Bean's approval
  - 2026-11-09: v0.5, block, file, control and motion research merged, scope cut to the goal, parallax driver changed after the smoothness study; awaiting Bean's approval
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

> **One-liner:** one data model, one renderer, one set of controls and one effects route for every image, video, embed, SVG and background in SGS, so anyone can make media look right quickly and any draft maps to exactly one set of settings.

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

The goal limits the scope: unlock what SGS should already do, so it can clone anything Claude Design produces and clients find the controls obvious, easy and impressive. Prefer the simplest design that meets that.

Goals: G1 one model for all media. G2 no setting is visible while inert. G3 editor and front end match. G4 every draft CSS pattern has one target. G5 a real element and a working motion target in every state. G6 best-in-class controls: per-device focal point, art direction, masks, visible inheritance. G7 migration leaves no legacy reader.

Non-goals: image editing or generation; replacing the WordPress media library; hotspots; a new lightbox (the gallery's existing lightbox stays); uploaded mask shapes; a different kind of media per device; saved style presets across slots; multi-layer stacked backgrounds; drag-and-drop upload; duotone; Lottie as a media kind (the Lottie effect in the motion system is untouched); CSS size targets (delivery follows §6.7 and no limit is set or gated here); new image formats (WordPress's generated sizes are used); a typed Sizes override or image-size dropdown (sizes are derived); a per-device border width (Bean-locked off). `core/image`, `core/cover`, and WooCommerce's own product images stay on WordPress's logic.

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
- **Media element:** the `<img>`, `<video>`, `<iframe>` or `<svg>`.
- **Surface:** the helper if printed, otherwise the media element.
- **Helper:** `.sgs-media-box`, printed only under §7.3. Never named in the editor.
- **Layout box:** the outermost printed element: `<figure>`, else `<a>`, else the surface.
- **Crops:** the box shape differs from the file's shape at a device, which can be from Ratio, Height, Width, or any minimum or maximum. It is what Fit and Focal act on.
- **Lead image:** the single image taking high fetch priority (§7.7).

## 5. Functional requirements

Tests are in §12; FR-to-test mapping is in §16.

### Data

- **FR-49-1** All slots MUST use §8's attributes with the slot's prefix, committed in `block.json` by `generate-media-attributes.mjs` from the atom registry. Gates and the seeder keep reading `block.json`; a drift gate fails when generated output differs. Test: AC-1.
- **FR-49-2** All media per-device values MUST use the responsive value object. Flat `xTablet`/`xMobile` media attributes MUST NOT exist. This is media-only; other blocks keep their current shapes. Test: AC-2.
- **FR-49-3** Alt and Decorative MUST be one value per slot. Test: AC-2.
- **FR-49-4** Focal point MUST be `{x,y}` in 0 to 1, on every element. Test: AC-2.
- **FR-49-5** Sizing MUST be independent settings that all work together (Ratio, Width, Height, and minimum and maximum width and height), resolved by §7.2, with no mode attribute or mode control. Test: AC-3.
- **FR-49-6** The universal `sgsHideOnMobile`, `sgsHideOnTablet` and `sgsHideOnDesktop` toggles apply to whole blocks only, a decorative image included. When a block is hidden on a device, the renderer MUST print no file for that device. Slots inside a block cannot use them: `{kind:"none"}` is offered on background and split slots, labelled "No background from this device down", and applies from that device down unless a narrower device has its own source. Test: AC-4.

### Rendering

- **FR-49-7** One renderer, `SGS_Media_Element` extended, MUST print all slots. Everything in §8.2 MUST be removed. Test: AC-5.
- **FR-49-8** Different images per device MUST use `<picture>` with one `<source media>` per differing device, queries from `SGS_Breakpoints` and viewport-only. Each source carries its own srcset, sizes, width and height. A `none` device is an empty source. Test: AC-4.
- **FR-49-9** Only the matching file MUST download. A slot holds one kind; each device can have its own file of that kind (image, video, embed or SVG), or none. Test: AC-4.
- **FR-49-10** The helper MUST be printed if and only if §7.3 says so, and paint MUST follow §7.4. Test: AC-6.
- **FR-49-11** Every background MUST print one real element in every state (§7.8). Root-`::before` background painting MUST be removed. Test: AC-7.
- **FR-49-12** Every stored string reaching CSS MUST pass `sgs_css_value( $type, $value )`, whose grammar in `includes/data/css-value-grammar.json` is keyed by type, read by PHP and generated into JS. It refuses `"`, `'`, `;`, `{`, `}`, `<`, `>`, `\`, newlines and unbalanced brackets. Lengths allow brackets only in `calc()`, `min()`, `max()`, `clamp()` and `var()`; colour, gradient and shadow types also allow `rgb()`, `rgba()`, `hsl()`, `hsla()` and the gradient functions, because drafts use them. URLs go only through `sgs_css_url()`. A gate runs every emitter output through the validator. Test: AC-8.
- **FR-49-13** Per-instance CSS MUST go through `sgs_collect_css`, in real properties, under a scope class hashed from the slot's sorted values. Test: AC-9.
- **FR-49-14** Inline SVG MUST be sanitised at render and in the editor with `sgs_svg_kses_allowed_tags`. Test: AC-8.
- **FR-49-15** Loading MUST use §7.7's single resolver. The theme's own preload emitters in `functions.php` and `inc/font-preloading.php` MUST be removed. Test: AC-10.
- **FR-49-16** Typed `attr()` MUST NOT be used. Real width and height MUST be printed on images, on a video's poster dimensions, and never on an iframe (sized by CSS) or inline SVG (its viewBox). A source with no id MUST carry width and height (the picker and cloner fill them); without them nothing prints and the editor says "Image size unknown". Remote Google review avatars are exempt: their box has a fixed size. No attachment lookup at render. Test: AC-11.
- **FR-49-17** Embeds MUST carry the media element marker, and only YouTube (`youtube-nocookie.com`) and Vimeo (`player.vimeo.com`) URLs are accepted, normalised, with `loading="lazy"`, a strict referrer policy and a title from Alt. The map printed by `sgs/business-info` is not a slot and is outside this allow-list; it moves its width and height attributes to CSS. Test: AC-6, AC-8.
- **FR-49-38** Fill MUST fill a stretched flex or grid row, a definite-height parent and a container whose height comes from its own ratio or min-height (through a grid or flex-column content band), and MUST fall back to a small fixed height, never 0, in a parent with no height, without forcing a shorter row taller (§7.2). Test: AC-27.
- **FR-49-39** `sizes` MUST be derived per §7.6. Test: AC-31.

### Editor

- **FR-49-18** Controls and panels MUST be exactly those in §9, in that order, with those labels, and every §12 walkthrough MUST complete by mouse and by keyboard. Test: AC-12, AC-28, AC-29.
- **FR-49-19** Visibility MUST come from the one rule table, resolved at the active device and resolved kind. A control that does not apply is omitted. A panel with no controls MUST not mount. Test: AC-13.
- **FR-49-20** Every per-device media control MUST use the reworked `ResponsiveOverride` (§9.2). Test: AC-14.
- **FR-49-21** A hidden control MUST keep its value. Where a visible field loses to another, its help line MUST say so. Test: AC-14.
- **FR-49-22** Editing on a device MUST write only that device. Test: AC-14.
- **FR-49-23** The focal picker MUST show the resolved media and resolved point on every device. Test: AC-15.
- **FR-49-24** The editor MUST match the front end for every setting, with no editor-only inline styles; video and embeds preview for real. Test: AC-16.
- **FR-49-25** Empty, deleted, oversized and missing-alt states MUST behave as §9.5. Test: AC-17.
- **FR-49-26** All media pickers MUST use `MediaSlotField`; a gate refuses raw `MediaUpload` elsewhere and any second focal shape. `sgs/audio` and the captions `.vtt` picker are allow-listed: neither is media this system prints. Test: AC-18.

### Effects

- **FR-49-27** `sgs/media` MUST offer effects via `supports.sgs.fx.motionSurface`, limited to §10.1's list per kind. Test: AC-19.
- **FR-49-28** The Effects target list MUST contain only parts available in the current state, through a declared `availableWhen` predicate on the part. Background video MUST have a part. Test: AC-19.
- **FR-49-29** Parallax MUST offer strength, direction and per-device on or off. Overscan MUST follow §10.2 and travel MUST never exceed it. `backgroundAttachment` MUST be removed; a fixed attachment found in a draft or saved content is reported. Test: AC-20.
- **FR-49-30** The Background panel MUST show one motion line whose button opens Effects on the Background target (§9.6). Test: AC-21.
- **FR-49-31** Hover zoom MUST clip to the media on every element offering it. Test: AC-6.

### Shape

- **FR-49-32** The old media `shape` attribute, `photoShape` and clip-path presets MUST be removed; Circle is a shape in the Shape grid. `sgs/icon.shape` is unrelated and stays. Test: AC-22.
- **FR-49-33** Masks MUST come from one registry (§7.5), per device, keeping shadow. Test: AC-23.

### Cloner and migration

- **FR-49-34** A JSON schema MUST describe a slot; the cloner and `wp-build-page` MUST write through it and refuse unknown shapes. Test: AC-24.
- **FR-49-35** Every draft pattern in §11 MUST map to its target. Test: AC-24.
- **FR-49-36** All saved content, theme patterns and build trees MUST be migrated by one detector (§13), and a zero-old-attribute check MUST pass on every target before old code is removed. Test: AC-25.
- **FR-49-37** Every element in §10.4 MUST adopt the system with exactly the listed specialised controls. Test: AC-26.

## 6. Architecture and decisions

### 6.1 The atoms are the one table

The existing media atoms are extended, not replaced. Each atom is one setting group with a data-only registry entry (`src/components/media/atoms/registry.js`: id, bases, types, scope, attaches-to, requires, reads, disclosure, css), a pure JS logic module, a control, and a PHP twin (`includes/media/atoms/*.php`). Blocks adopt atoms through `supports.sgs.mediaElements`, which stays the slot declaration (§8.3). Their gates pass today (`test-media-atom-parity`, `test-media-attr-parity`, `test-media-enum-vocabulary`, `test-media-injection-parity`, `check-media-atom-purity`), and no atom fails on any block that declares it (`AT-atom-block-matrix.md`: 20 blocks, 51 element-and-atom rows, run in code and on live pages).

What changes in the system as a whole: each registry entry gains `responsive`, `paintNode`, `emitter`, `control`, `effects` and `since` fields. `scripts/generate-media-attributes.mjs` writes the attributes into each adopting block's committed `block.json` (a drift gate keeps them equal), because over 200 gates and the seeder read `block.json`; the registration-time injector `includes/media-element-attrs-register.php` is then deleted, which ends the gap where the database held a different attribute set from `block.json`. Each atom's PHP twin prints real CSS properties through the shared helpers, so the resolver can route every setting, instead of custom-property values painted by a shared stylesheet.

### 6.2 What happens to each atom

| Atom | Verdict | Change |
|---|---|---|
| source | Extend | Sibling Tablet and Mobile id and url keys become the `Source` responsive object; its URL is escaped (FR-49-12) |
| media-type | Fold | Into `Source.kind`, read from the chosen file |
| intrinsic | Fold | `Source` carries width and height |
| meaning | Extend | `Alt` and `Decorative`, never tiered; multi-line Alt |
| object-fit | Extend | Becomes `Fit`; `tile` added on backgrounds; the controls on image sequence, trust bar, brand strip, card grid, gallery and team member move onto the atom |
| focal-point | Extend | Stores `{x,y}`; keeps its disclosure rule; shows the inherited point on an inherited device |
| box-shape | Extend, split | Becomes the `sizing` atom (Ratio, Width, Height, Limits, the §7.2 resolver, every device) and the `shape` atom (§7.5); its clip-path presets are deleted |
| media-padding | Keep | Renamed `Padding` |
| overlay | Extend | Hover form and the 40 starting strength; mounted on the hero |
| shadow | Keep | Hosts `ShadowControl`; the helper fixes clipping (§7.4) |
| opacity | Extend | Per device; Reset |
| svg-presentation | Extend | Keeps animation, speed and text shadow; gains Layer order and SVG parts; its duplicate opacity goes |
| video-behaviour | Extend | Becomes `Playback`, adding the pause button; keeps its lock rules |
| caption | Keep | |
| link | Keep | |
| New: filter | New | Greyscale and blur in one `filter` |

The emitter kinds of §8 map to the atoms' PHP twins: `plain`, `sides`, `corners`, `shadow` and `colour-states` twins call `helpers-responsive.php::sgs_emit_tier_decls` and `sgs_emit_responsive_css`, `helpers-box.php`, `helpers-border-style.php`, `helpers-shadow-layers.php`, `helpers-shadow-hover.php` and `helpers-hover-state.php`; `sizing`, `focal`, `filter` and `shape` are the twins of those atoms. The editor uses each atom's JS module, plus `src/utils/border-preview.js`, `radius-preview.js` and `spacing-preview.js`; `background-preview.js` is split so `borderPaintPreview` survives. The existing parity gates check PHP against JS; `sizing-cases.json` (§7.2's 12 combinations with and without a helper) is the sizing atom's fixture, compared as parsed declarations per property and device. Order is by property, then device (desktop, tablet, mobile), with hover last.

A `plain` setting prints one property per device and nothing else.

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

Core code lands on main in two parts: A1 is new files adopted by nothing; A2 is the few live shared changes, each with its own check (§14.1). Adoption, content migration and old-code removal happen in one release on a short integration branch, driven by scripts. Shared controls make block-by-block cutover impractical, and at no point do two render paths serve one block.

### 6.9 What is reused

| Part | Verdict | Use |
|---|---|---|
| Motion channels, Ken Burns, parallax runtime | Keep | Plus §10.2 |
| `helpers-instance-scope-hash.php::sgs_instance_scope_hash`, `ShadowControl`, `SgsBorderControl`, `SgsBoxControl`, `SgsLengthControl`, link and caption fields | Keep | Rehosted |
| The media atoms, their registry, generator and parity gates | Extend | §6.1, §6.2 |
| `SGS_Media_Element` | Extend | The one renderer (§7) |
| `MediaElementPanel` | Rework | Its dispatch and "no rows, no panel" stay; it mounts §9.4's panels instead of one flat list |
| `class-sgs-css-registry.php::sgs_collect_css`, `helpers-image-dimensions.php`, SVG sanitising (`helpers-svg-kses.php`, `helpers-svg-document.php`, `svg-upload.php`) | Keep | Renderer calls them |
| `sgs_hidden_render_*`, `sgs_allowed_svg_tags` | Keep | Move out of the files §8.2 deletes first |
| `sgs_end_shape_url` encoder | Keep | Mask data-URIs |
| `helpers-shadow-filter.php` | Keep | Masked shadows |
| `ResponsiveOverride` | Rework | §9.2; hard-coded "Desktop" and wrong-tier hint fixed in the shared component |
| `FocalPositionField` | Rework | `FocalField` |
| `MediaPicker` | Rework | `MediaSlotField` |
| `sgs_media_cover_crop_plan` and its helpers in `helpers-media.php` | Rework | §7.6; it silently stops working if the sizing atom goes first |
| `icon-shapes.json` | Rework | The one shape registry, extended per §7.5 |
| Shape dividers | Keep | Unrelated to media; untouched |
| `sgs_responsive_image` | Rework | Absorbed into the renderer |
| Overlay | Rework | Layer inside the helper |
| Box-shape's clip-path vocabulary, loading trio, `sgs_tier_media_render`, `sgs_render_media`, flat per-device keys | Replace | §7, §8 |
| BackgroundPanel position dropdown, art-direction attributes, Attachment, nav-drawer copy, raw `FocalPointPicker`, `sgsObjectPosition` | Replace | §9.4 |

## 7. Rendering contract

### 7.1 Markup

Nesting is always `figure > a > helper > mask > media element`, omitting levels not needed. One source: `<img class="sgs-media-el" …>`. Different images per device: `<picture class="sgs-media-picture">` around `<source>`s and the `<img>`, with `display:contents`. The `<picture>` generates no box: every setting that paints, moves or is observed (opacity, filter, transform, motion, observers) targets the `<img>`, never the picture. Header and footer row rules targeting direct children are extended to reach the image.

The layout box carries `{uid}`, block classes, the anchor, motion attributes, Order, Alignment, Width and Max width. The surface carries Height, Ratio, Min height, Max height, Border, Radius, Shadow, Padding and Background. Base CSS sets `box-sizing:border-box`.

`<a>` is `display:block`, takes no paint, and has a focus ring following the radius. Overlay and ring carry `pointer-events:none`. A link on a Decorative image is refused: the editor shows "A linked image needs alt text".

Caption width follows the media, not the space around it. When Width resolves to `auto`, the `<figure>` prints `display:table` and the `<figcaption>` prints `display:table-caption; caption-side:bottom`, Gutenberg's own pattern (`packages/block-library/src/image/style.scss`), so a long caption wraps to the media's width, with `overflow-wrap:anywhere` so one long word cannot overflow. PS-2 proves it in all three browsers, including inside a 200px parent, before WP-2 starts.

Per-device video, embed and SVG files are siblings of one kind, switched by breakpoint. Each is lazy with no fetch priority and video `preload="none"`, so nothing downloads for a device that does not show it. SVG element ids are prefixed per sibling so parts and animations reach the one showing.

### 7.2 Sizing

Each setting prints its own CSS property; the browser combines them. The base stylesheet sets `height:auto` on the media element first, because a printed `height` attribute otherwise acts as a fixed CSS height (proved in real Chrome, Firefox and WebKit, for img, video and inline svg (iframe: Width 100% only, per the embed rule): all 12 combinations of Ratio, Width, Height and limits, with Cover and Contain, resolve as this table says; WebKit video `object-fit` was not tested because the run timed out, so PS-2 and AC-3 prove it). Ratio, Width, Height, Min width, Max width, Min height and Max height can all be set, per device, in any combination. Three rules fill the gaps CSS leaves: this one, the helper's file ratio and Fill. The layout box and the media element are flex and grid items in many rows, where the browser's `min-width:auto` stops them shrinking below their natural size and overflows the row (proved in Chrome, Firefox and WebKit). The base stylesheet therefore sets `min-width:0` on the layout box and the media element; a Min width the user sets replaces it.

| What is set | Result |
|---|---|
| Nothing | The file's own size, `width:auto; max-width:100%`, so a 300px file draws at 300px and shrinks with its container |
| Ratio only, or Height only | Width defaults to 100% of the space; the height follows from the Ratio, or is as set |
| Ratio and Height | Width defaults to `auto`, so it follows from the two: 1:1 and 300px tall is 300 by 300. It never exceeds the space (`max-width:100%` stays), and a taller-than-wide Ratio crops |
| Ratio and Width | Height follows from the two |
| Ratio, Width and Height | Width and Height win. Ratio is kept, and its field says it is not in use |

The default width is resolved per device from the resolved values: `auto` when nothing sizing-related is set or when both Ratio and Height are, otherwise 100%. A Width the user sets always wins. Width `auto` with a Height and no Ratio keeps the file's proportions. Width `auto` with a Max height narrows the box rather than cropping it, so any control that sets Width auto says so. Limits apply on top in every case: with Ratio 16:9 at 100% width and Max height 300px, the box stops at 300px and the picture crops into it. `auto`, `natural` or `none` cancels an inherited value; the four limits accept `none`.

Height has one extra choice, **Fill** (labelled "Match its space"), meaning the height the surrounding layout gives it. Ratio does not apply while Height is Fill.

An embed with nothing set is `width:100%; aspect-ratio:16/9`, printed as CSS on every embed. The renderer prints no `width` or `height` attribute on an iframe (an attribute acts as a CSS width). An embed never prints `width:auto` unless both Ratio and Height are set, because only Chrome transfers a ratio through an auto width on an iframe. An SVG with nothing set uses its viewBox.

A helper has no proportions of its own. When the helper is printed with a Height and no Ratio, the renderer prints the file's own ratio as `aspect-ratio` on the helper, per device, so the media keeps its proportions. Without this a helper at Height 300px draws 600 by 300 where the bare image draws 533 by 300 (measured in real Chrome in a 600px parent). Ratio with Height holds through `<figure>`, `<a>`, `<picture>` and the helper, 300 by 300 each.

Fill means the height the surrounding layout gives the media. The helper prints `height:auto; min-height:100%; flex:1 1 auto; align-self:stretch`, the media is absolutely positioned inside it, and a `::before` with `display:block; height:12rem` gives it a small height when nothing supplies one. A ratio floor cannot be used: `padding-top:66.667%` forces a row beside 200px of text to 400px (measured). When Width is set it is also printed as `max-width`, because `flex:1 1 auto` would ignore it. An explicit `height:100%` is never printed on the helper: on a flex item it switches off stretch (measured 367 against a 700 row). Fill takes the height of a definite parent, a stretched flex or grid row, an aspect-ratio parent, and a flex-column or grid parent with a min-height; with no height anywhere it is 12rem tall, and the editor says: "This layout gives the photo no height. Pick a Height instead." A percentage cannot see a min-height, so a content band whose height comes from a min-height, a Ratio or a stretched row MUST be `display:grid` (one column) or a flex column. One static rule in `media-base.css` does this at low specificity: `.sgs-container__inner:has(> .sgs-media-fill)`, shared by the front end and editor. Min height on the surface is its floor. PS-2 proves it on the 13 layouts in all three browsers. `height:stretch` and `-webkit-fill-available` are not used (Firefox and WebKit do not support them consistently).

The editor uses the same CSS.

### 7.3 When the helper is printed

The helper is printed if, at any device, on resolved values, any of these hold: Height is `fill`; `OverlayColour`, `OverlayGradient` or a hover form is set; Shape is a mask shape (not none, circle, ellipse or pill); the media part has hover scale above 1, Parallax, Ken Burns or a clip entrance. A caption or link never causes it. Once printed, it is printed for all devices and takes box paint at all devices.

### 7.4 What paints where

| Setting | Without helper | With helper |
|---|---|---|
| Width, Max width, Alignment, Order | Layout box | Layout box |
| Height, Ratio, Min height, Max height | Media element | Helper |
| Border, Radius, Shadow, Padding, Background | Media element | Helper |
| Fit, Focal, Opacity, Blend, Filters | Media element | Media element |
| Overlay | n/a | Without a mask: helper `::after`. With a mask: `.sgs-media-box__mask::after` |

With the helper and no mask, it has `overflow:hidden; overflow:clip`, as core Cover does, so sticky children keep working. With a mask, the mask layer clips.

Spacing around a slot belongs to the parent's gap or Alignment. The cloner never writes a margin onto a slot.

### 7.5 Shapes

Registry: the existing `includes/data/icon-shapes.json`, read by PHP and JS already, gains `proportions`, `paint`, `ratio` and `surfaces` per entry: `{slug, label, d, proportions, paint, ratio, surfaces}`, one closed path each, keeping today's `d` key. `proportions` is `stretch` or `keep`. `surfaces` lists where a shape appears; `src/utils/icon-shapes.js` shows icons only those marked for icons, so new shapes do not reach the icon picker. `ratio` is the Ratio written when the shape is picked, as Circle does. `paint` is `radius` or `mask`. Media shapes: circle, ellipse, pill, squircle, arch, hexagon, diamond, octagon, star, tag, speech bubble, ticket and three blobs. Shape dividers and the buybox sticker keep their own geometry.

A person looks in one grid and picks a shape; how it is drawn is hidden. Circle, ellipse and pill are drawn with `border-radius` on the surface, needing no helper and keeping ordinary borders and shadows. Picking Circle also sets Ratio 1:1 at that device, when no Ratio is set, as one undo step. Everything else is a mask.

Keep-proportions masks use `mask-size:contain` and an encoding without `preserveAspectRatio="none"`.

Mask structure: helper (shadow as `filter:drop-shadow`, through `helpers-shadow-filter.php`) > `.sgs-media-box__mask` (the mask, the media, overlay and zoom).

While a mask shape is on: Corners is omitted, and any stored radius kept and noted. Shadow's Spread, Inset and Raw CSS are omitted with "Shadows follow the shape". Padding sits on the helper. Border is omitted with a mask shape, with the note "Borders are not available on this shape. Choose Circle, Ellipse or Pill to keep a border." Circle, Ellipse and Pill keep ordinary borders. Shape is per device; `none` at a device clears it. Embeds cannot be shaped except by circle, ellipse and pill.

### 7.6 Sizes attribute

Derived, never typed, on every `<source>` and `<img>`: a Width in `px` prints WordPress's own form, `(max-width: Wpx) 100vw, Wpx` (`media.php::wp_calculate_image_sizes`); `vw` as given; `rem` and `em` at 16px; anything else `100vw`. Lazy images are prefixed `auto, `, as `wp_img_tag_add_auto_sizes` does. An item in an item-set block divides by its column count when known. Cover-cropped images widen by the crop factor, through the existing `sgs_media_cover_crop_plan`. Attachment-backed images and each `<source>`'s `srcset` come from `wp_get_attachment_image` and `wp_get_attachment_image_srcset`, with the derived `sizes`, `loading`, `fetchpriority` and `decoding` passed in `$attr`; only external URLs and inline SVG are built by hand. A fixture runs `wp_filter_content_tags` over the markup to show the core filters leave it correct.

### 7.7 Loading and priority

Per slot, first match wins:

1. Inside a hidden surface (mega panel, drawer, modal, wishlist panel, cart): lazy; claims nothing.
2. Slot's Load priority is Load first: eager, lead candidate. Load later: lazy.
3. In the site header or the first top-level section, and not an item of an item-set block: eager.
4. An item of an item-set block in the header or first two top-level sections: eager up to its desktop column count, at most 8 per page.
5. Otherwise lazy.

Position comes from one pre-pass over the parsed block tree of the template, its parts and the content, run once per request on first media render. It records the lead slot by its scope hash. A block rendered with no page around it (REST, a cached fragment) gets lazy and never high. Unknown position means lazy.

The lead is the first eager candidate that is not `logo`, `layer` or a brand strip. One per page takes `fetchpriority="high"`, only if at least 50,000 square pixels (WordPress's `wp_min_priority_img_pixels` default); a slot hidden at some device takes `fetchpriority="auto"`. The renderer consumes a per-request claim, so two identical blocks sharing a scope hash cannot both take it. No preload links are printed; every lead is now a real element the browser's preload scanner finds. Ken Burns on a lead image defaults off.

### 7.8 Backgrounds

```
<section class="…{uid}">
  <div class="sgs-bg-media">picture, video, svg or tile layer</div>
  <span class="sgs-bg-overlay"></span>
  content
</section>
```

`.sgs-bg-media` replaces today's `.sgs-container__image-bg` and root `::before` paths, keeping stacking of media, overlay, content and shape dividers. The element clips as §7.4's helper does. Tile: `background-image` on the element, with Repeat and TileSize. Actual size: `object-fit:none`. Backgrounds default to Decorative, which a content photograph can switch off. A background has no alt requirement.

### 7.9 What each kind needs

The same setting needs different code per kind. The emitter and renderer follow this table.

| Setting | Image | Video file | Embed | SVG |
|---|---|---|---|---|
| Printed as | `<img>`, `<picture>` | `<video>` | `<iframe>` | inline `<svg>`, viewBox kept |
| Ratio, Width, Height, limits | CSS | CSS | CSS | CSS |
| Fit | `object-fit`, all five | `object-fit`, all five | Not offered; the player scales itself | `preserveAspectRatio`: Cover is `xMidYMid slice`, Contain is `xMidYMid meet`; only those two offered |
| Focal | `object-position` | `object-position` | Not offered | Not offered |
| Border, Corners, Shadow | CSS | CSS | CSS | CSS |
| Background | CSS | CSS | Not offered | CSS |
| Opacity, Greyscale, Blur | CSS | CSS | Not offered | CSS |
| Blend | `mix-blend-mode` | `mix-blend-mode` | Not offered | Not offered |
| Overlay | Helper layer | Helper layer, `pointer-events:none` | Helper layer, `pointer-events:none` | Helper layer |
| Mask shapes | Yes | Yes | No | Yes |
| Hover zoom, Parallax | Transform | Transform | Not offered | Transform |
| Ken Burns | Transform | Not offered | Not offered | Not offered |
| Loading | Priority, per §7.7 | Poster is the candidate; `preload` | `loading="lazy"` | Not applicable |
| Alt | `alt` | `aria-label` | `title`, required | `role="img"`, `aria-label` |
| Playback | n/a | Element attributes, optional pause button | URL parameters (autoplay, mute, loop, controls, start) | n/a |
| Per-device sources | `<source media>` | Sibling, `preload="none"` until shown | Sibling | Sibling |

## 8. Data model

Names are `{prefix}{Base}`. R = responsive value.

| Base | Type | Valid | Default | CSS | Paint node | Emitter | Hover form |
|---|---|---|---|---|---|---|---|
| `Source` | R object | `{kind,id,url,width,height,mime,poster:{id,url,width,height},markup}`; plus `featured` kind | empty | none | n/a | none | |
| `Alt` | string | | `""` | none | n/a | none | |
| `Decorative` | boolean | | false; backgrounds true | none | n/a | none | |
| `Fit` | R string | `cover`, `contain`, `fill`, `none`, `scale-down`; image backgrounds add `tile`; SVG `cover`, `contain` only | `cover` | `object-fit` | media | plain | |
| `Focal` | R object | `{x,y}` | centre | `object-position` | media | focal | |
| `Height` | R string | length, `fill` (labelled Match its space), `auto` | empty | `height` | surface | sizing | |
| `Ratio` | R string | `w / h`, `natural` (labelled Photo's own) | empty | `aspect-ratio` | surface | sizing | |
| `Width`, `MaxWidth` | R string | length; Width `auto` | empty | matching | layout | sizing | |
| `MinWidth` | R string | length, `none` | empty | `min-width` | layout | plain | |
| `MaxHeight`, `MinHeight` | R string | length, `none` | empty | matching | surface | plain | |
| `Alignment` | R string | `start`, `center`, `end` | empty | `margin-inline-*` | layout | plain | |
| `Order` | R number | -20 to 20 | empty | `order` | layout | plain | |
| `Radius` | R corners | corners | empty | `border-*-radius` | surface | corners | |
| `BorderWidth` | sides | 0 to 40px (not per device) | 0 | `border-*-width` | surface | sides | |
| `BorderStyle` | string | core styles | `solid` | `border-style` | surface | plain | |
| `BorderColour`, gradient forms | string | token, hex, `rgb()`, gradient | empty | `border-color` | surface | colour-states | yes |
| `Padding` | R sides | 0 to 500px | empty | `padding-*` | surface | sides | |
| `Background` | string | token, hex, `rgb()` | empty | `background-color` | surface | plain | |
| `BoxShadow`, `BoxShadowColour` | per `ShadowControl`; the Hover panel owns lift, so the generator writes lift off | | | `box-shadow` | surface | shadow | yes |
| `Opacity` | R number | 0 to 100 | 100 | `opacity` | media | plain | |
| `Shape` | R object | `{shape,proportions}` | none | `mask-image` or radius | mask | shape | |
| `OverlayColour`, `OverlayGradient` | string | token, hex, `rgb()`, gradient | empty | colour | overlay | colour-states | yes |
| `OverlayOpacity` | R number | 0 to 100; 0 at a device clears it; the first colour picked writes 40 in the same undo step | 100 | `opacity` | overlay | plain | |
| `OverlayBlend`, `Blend` | string | CSS blends | empty | `mix-blend-mode` | overlay, media | plain | |
| `Greyscale`, `Blur` | number | 0 to 100; 0 to 100px | 0 | `filter` | media | filter | |
| `Repeat` | R string | `repeat`, `repeat-x`, `repeat-y`, `no-repeat` | `no-repeat` | `background-repeat` | media | plain | |
| `TileSize` | R string | length, `auto` | `auto` | `background-size` | media | plain | |
| `Loading` | string | `auto`, `first`, `later` | `auto` | none | n/a | none | |
| `Playback` | object | `{autoplay,muted,inline,loop,controls,lazy,start,pause}`; `pause` shows a pause button on autoplaying video, off by default | per kind | none | n/a | none | |
| `Captions` | object | `.vtt` id, label, language | empty | none | n/a | none | |

Filters combine in fixed order (greyscale, blur). Hover rules sit inside `@media (hover:hover)` with a 200ms transition, removed under reduced motion. Overlay hover is a second colour in the overlay's control, which is all a darker-to-lighter hover needs. All other hover behaviour (zoom, brighten, grey-to-colour) is the Hover panel's.

Device or global: every setting marked R is per device through `ResponsiveOverride`; every other setting applies to all devices and says so off Desktop.

Defaults: Fit is applied only where the box crops. An unset Focal displays as "Centre (default)" and writes nothing. Playback: block video controls on, autoplay off, loop off, inline on, lazy on; background video autoplay, muted, loop, inline on, controls off, on every device, with its poster while loading and under reduced motion.

`sgs/media` also has `caption`, `captionTag`, link fields, the `caption*` typography and colour family and the player's `videoTime*`. SVG slots add `SvgLayer` ("Layer order": Behind content, In front of content), `SvgAnimation`, `SvgAnimationSpeed`, `SvgTextShadow`; a background SVG also keeps `SvgParts` and `SvgPartsTrigger` (named-part animation).

Source: embed per FR-49-17. `svg` is pasted or uploaded markup, printed inline; an `.svg` chosen as a photo is an `<img>`. `featured` uses the post's featured image, on card, product and post slots.

### 8.1 DB and gates

The paint node is a field in each atom's registry entry, read by its twin; no new DB column. `css_element` carries the node names (`media`, `surface`, `layout`, `overlay`, `mask`) so the resolver can route. The generator supplies classification entries (`attr-classification-overrides.json`), so `tier_shape` is declared `tier_object` for every R value rather than guessed from render code. PS-1 proves this, plus the resolver, `check_value_identity`, the inline-styling gates, and `check-wiring-fingerprint`.

### 8.2 Removed

Attributes: per-block maps in §13. Code, each with a grep in AC-5:

`sgs_tier_media_render`, `sgs_tier_media_toggle_css`, `sgs_render_media`, `sgs_responsive_image`, `sgs_image_loading_attrs`, `sgs_next_background_image_index`, `sgs_content_image_claims_priority`, the atoms `media-type` and `intrinsic` (folded into `source`), box-shape's clip-path presets, `includes/media-element-attrs-register.php` and `media-element-attributes.generated.php` (attributes are committed instead), `helpers-media-position.php`, `includes/image-controls.php`, the stub in `scripts/qa/lib/wp-stubs.php`; JS `src/components/media/canvasStyle.js`, the four `*PanelLayout.js`, `src/blocks/media/components/MediaStylingPanel.js`, `MediaSizingPanel`, `FocalPositionField`, `MediaPicker`, `src/blocks/extensions/image-controls.js`, `src/utils/objectPosition.js`; script `surveys/check-image-controls-support.py`; their `gates.json` and `package.json` entries; the flag `supports.sgs.imageControls`; the `img[data-sgs-mc~="background-position"]` overscan rule. The atom gates stay and are extended.

Before anything is deleted, `sgs_hidden_render_*` and `sgs_allowed_svg_tags` move to a file that stays. Other gates, inspector rules 37 to 40, `wf_media.py`, `check-dead-controls.js` and the 22 tests naming removed code are dispositioned by WP-15a's list.

### 8.3 Slot declaration

`supports.sgs.mediaElements`, which 20 blocks already declare, is the slot declaration: each entry names a prefix and its atoms, and gains `context` and `kinds`. The generator refuses unknown names. A block with no entry has no media controls.

Item-set blocks declare block-level settings with the item prefix (Ratio, Fit, Radius, Shape, Loading, hover zoom) as ordinary attributes, and per-item values inside each item object under `source`, `alt`, `decorative`, `fit`, `focal`, using §8's value shapes. Items inherit the block-level Fit. `tier_shape` is `slot-array`. Per-item CSS uses scope `{uid}-i{index}`.

## 9. Editor

### 9.1 Global

Labels print once. Each panel is a collapsible `PanelBody`; Media and Size and crop open by default. Every panel has Reset in its header menu. Multi-write actions (Circle, Replace, Reset) are one undo step.

### 9.2 Shared components (`src/components/media/`, plus `ResponsiveOverride`)

- **`ResponsiveOverride` (reworked):** the only per-device wrapper for media. Off desktop, an inherited field shows the inherited value as a grey placeholder inside the field, with "Mobile: using Tablet" naming the true source, or "Mobile: default". Dots mark Tablet and Mobile when they hold their own value, and a closed panel shows one when anything inside does. The dot is a shape with an accessible name. Reset names the true source ("Reset to Tablet" or "Reset to Desktop") off desktop, "Reset to default" on desktop. A panel's Reset off desktop reads "Reset Mobile in this panel" and affects only that device. Settings not marked R in §8 show "Applies to all devices" when not on Desktop. The device name is part of each accessible label. `lint-responsive-controls.py` is updated in the same commit. The component has 135 importers beyond media, and `ResponsiveControl`, `ResponsiveBoxControl` and `ResponsiveLengthControl` are its siblings: the rework changes only its display and is checked on a sample of non-media blocks.
- **`MediaSlotField`:** kind tabs for the slot's kinds, Media Library first, preview, Replace, Remove, and an inherited-media display per device. On Replace, Focal resets to centre unless "Keep focal point" is ticked, and if Alt is non-empty the panel says "Alt text still describes the previous photo. Update it." with focus on Alt. Picking a device-specific file never writes Alt. Empty Alt on first pick copies the library alt. Video preview has pause. Alt is a multi-line box with one help line: "Describe the photo for someone who cannot see it." Decorative is a checkbox beside it that hides it.
- **`FocalField`:** shows the resolved media and point. Drag or click; X and Y percent 0 to 100; quick picks Top, Centre, Bottom, Left, Right; Reset. On a device with its own image inheriting Focal: "Using Desktop's focal point on this image." Help: "Choose the part of the photo that must stay in view when it is cropped." Keyboard: the percent inputs and arrow keys, announced in a live region.
- **Sizing fields:** separate, always-available controls. **Aspect ratio** chips: Photo's own, 1:1, 4:3, 3:2, 16:9, 4:5, 3:4, 9:16, 21:9, Custom; embeds offer 16:9, 4:3, 21:9 and 9:16 only. The list merges `useSettings('dimensions.aspectRatios')`, so a client's snapshot can add a ratio. **Width** and **Height** as lengths, with Auto, and Match its space on Height (help: "Makes the photo as tall as the space around it, such as a card stretched by the text beside it."). With Height set and Width and Ratio empty, Height says "The photo is full width and cropped to this height." with a Keep the photo's shape button that sets Width to Auto. **Min width, Max width, Min height, Max height** as lengths or None, in a collapsed group, Smallest and largest size. One line at the top of Size and crop states the result at the active device, for example "Mobile: full width, square (1:1), cropped to fill". Nothing clears anything else. A value §7.2 does not use stays, and the field says why: "Not used while Width and Height are both set."
- **Shadow:** preset chips from `useSettings('shadow.presets')`, then Custom opening `ShadowControl`.
- **Corners:** one slider with a link for four corners and a Round preset.
- **Fit and Focal hint:** where Fit and Focal do not apply because the box does not crop, one line in their place: "To choose which part of the photo shows, first give it a shape: pick an Aspect ratio or a Height."
- **Circle:** when the box resolves non-square at a device: "This is an oval because the photo area is not square." with Make it square (1:1).
- **`FitField`:** icon chips, each with a plain caption and each kind's options from §7.9: Crop to fill, Show all, Stretch, Actual size, Never enlarge, and on image backgrounds Tile.
- **`ShapeField`:** one grid, labelled Shape, drawing the client's own photo in each shape: None, Circle, Ellipse, Pill, the mask shapes; Keep proportions where a shape allows it.
- **`Chips`:** the shared contract for ratio, fit and mask grids: `role="radiogroup"`, arrow-key roving focus, 44px targets, selected not by colour alone, visible focus, hover brightens.
- **`MediaElementPanel` (reworked):** mounts §9.4's panels from the atoms' disclosure rules.

Lengths use `SgsLengthControl` with `presets={false}` in `ResponsiveOverride`.

### 9.3 Rule table

Each atom's existing `disclosure` rule, run at the active device against resolved values. Kinds: I image, V video file, E embed, S SVG. Context B background.

| Control | Kinds | Condition |
|---|---|---|
| Alt / Title | I V E S | Omitted when Decorative. Label "Alt text" on I; "Title (for screen readers)" on V, E (E warns when empty); S aria-label |
| Decorative | I V S | Not with a link |
| Poster ("Cover image before play") | V | |
| Load priority (Automatic, Load first, Load later) | I, poster | |
| Caption (None, From library, Write my own) | I V | Text box with Write my own |
| Caption tag | I V | Caption text exists |
| Link | I | |
| Playback | V E | Muted and Inline lock with Autoplay. Embed has autoplay, mute, loop, controls, start at |
| Captions file | V | |
| Aspect ratio | I V E S | Not when Height is Match its space |
| Width, Height | I V E S | |
| Limits (Min width, Max width, Min height, Max height) | I V E S | |
| Fit | I V S | The box crops |
| Focal | I V | The box crops and Fit is not `fill` |
| Alignment, Order | I V E S | |
| Corners | I V E S | Omitted with a mask shape, circle, ellipse or pill |
| Border width | I V E S | Omitted with a mask shape |
| Border style, colour | same | A width is set; omitted with a mask shape |
| Shape | I V E S | Embed: circle, ellipse, pill only |
| Shadow | I V E S | With a mask, per §7.5 |
| Padding | I V S | Omitted on embeds: a player fills its own frame |
| Background | I V S | |
| Overlay | I V E S | Strength and blend after a colour is set |
| Photo opacity, Greyscale, Blur | I V S | |
| Blend | I V | |
| Typography: Caption and colour | I V | Caption exists |
| Typography: Video time | V | Player showing |
| SVG panel | S | |
| Repeat, Tile size | B, I | Fit is Tile |

Backgrounds show Media, Decorative and Alt, Fit, Focal, Tile options, Overlay, Loading, for video Cover image and Pause button, and the motion line, and never Size, Width, Alignment, Order, Border, Radius, Shadow, Padding, Mask, Caption or Link.

### 9.4 Panels

`sgs/media`, Settings: **Media** (kind and source, Poster, Alt or Title, Decorative, Load priority); **Caption and link**; **Video** (Playback, Captions).

Styles: **Size and crop** (Aspect ratio, Width, Height, Smallest and largest size, How it fills, Focal); **Position in the layout** (Alignment, Order in the row); **Border and shape** (Shape, Corners, Border, Padding, Background colour); **Shadow**; **Overlay and filters** (Overlay colour and gradient, Overlay strength, Blend, Photo opacity, Greyscale, Blur); **Typography**; **SVG**; **Hover**; **Entrance and reveal**; **Effects**.

Caption colour sits in Typography as a declared `colourExemption`. Caption typography offers size, family, weight, style, line height, letter spacing, transform, alignment. Video time offers size, family, weight.

Background panel: Media, Decorative and Alt, How it fills, Focal, Tile options, Overlay, Load priority, for video Cover image and Pause button, motion line. Surface tone, blur, saturate and opacity stay in their own Surface panel, owned by the wrapper. On the toolbar: Replace and Alignment. Hover panel subtitle: "Overlay, border and shadow changes on hover are set in their own panels."

Each motion panel carries a one-line subtitle, and Hover says "Hover has no effect on touch screens" on Tablet and Mobile.

Catalogue of ranges: Width, Min width, Max width: `px`, `%`, `rem`, `em`, `vw`, `ch`, 0 to 5000. Heights: `px`, `%`, `rem`, `em`, `vh`, `svh`, `dvh`, `vw`. Radius: `px`, `%`, `rem`, `em`, 0 to 9999. Padding: `px`, `rem`, `em`, `%`. Opacity, strength, greyscale: percent, step 1. Blur: `px`, 0 to 100. Parallax strength: chips Gentle (0.1), Medium (0.2), Strong (0.4), and a custom 0 to 1 in Fine-tune. All in the atom registry.

### 9.5 States

Empty: four buttons (Photo, Video file, YouTube or Vimeo link, SVG). Deleted file: red "Image missing" with Replace; the page prints nothing, no broken icon, no shift. Missing alt on a non-decorative image: an inline warning, never a block. Unsupported embed: "This address is not a supported video". Hidden via a Hide toggle or `none`: an editor-only dashed bar naming where it shows.

### 9.6 Motion line

Bottom of the Background panel: "Background motion: Parallax, gentle [Change]" or "Background motion: none [Choose motion]", first two effects then "+N". The button dispatches `open({clientId, panel:'effects', target:'background'})` with an incrementing `requestId` to the `inspector-focus` store. Effects, now controlled, opens, selects the target, scrolls to itself and moves focus to its heading, announced in a live region. Choose motion creates nothing.

### 9.7 Parity

The editor uses the emitter's CSS. Video shows its poster or a live element; an embed shows its iframe with pointer events off.

## 10. Effects

### 10.1 Targets and what each kind offers

Parts in `supports.sgs.elements`. `media` on `sgs/media` loses `isWrapper`; the manifest gate is updated with it. Backgrounds: `background` (selector `.sgs-bg-media`), `background-video` (declared), `svg-bg` (name kept). A part carries `availableWhen: {slot, kinds}`, which the target picker evaluates. `absentIn` remains QA-only.

Media uses the motion system's existing libraries, each with Fine-tune (Spec 38A), filtered only by what the element can carry:

| Panel | What media gets |
|---|---|
| Hover | The whole library (31 presets today): lift, scale, rotate, translate, image zoom, grey to colour, magnet, follow pointer, border accent, each at three intensities, plus Fine-tune values such as brightness and blur |
| Entrance and reveal | The whole library (80 presets today): fades, slides, scale, rotate, blur and bounce entrances, reveals, keyframe entrances, at three intensities, plus Fine-tune including the clip reveal. Split reveal, scramble and nav-panel items need text, so they are not listed on media; draw needs SVG |
| Effects, image | Parallax, Ken Burns, float, scrub |
| Effects, video file | Parallax, float, scrub |
| Effects, embed | Float |
| Effects, SVG | Parallax, float, scrub, SVG loop, draw, morph, motion path |
| Effects, backgrounds | Parallax; Ken Burns on images; SVG loop and named parts on SVG |

The filter is the registry's own (`motion_presets.target_level`, `fx_effects.requires` and `scope`), extended so Ken Burns and parallax accept the media part and the background part; no media-only list is kept. Sheen, ripple and glare paint on a pseudo-element or injected layer that a bare `<img>` or `<video>` cannot hold, so they stay on blocks with a box, as do cursor effects. A transform that runs once on load or scroll is an entrance; Ken Burns is a continuous drift.

How the panels fit: **Hover** answers the pointer. **Entrance and reveal** plays once, on load or on scroll. **Effects** runs continuously or with the scroll. The Background panel holds no motion controls: its motion line shows what is set and opens Effects on the Background target (§9.6). Overlay hover is a second colour in the overlay's control. Per-device behaviour follows Spec 38A.

### 10.2 Parallax

Stored as today: `speedRatio` (-1 to 1, with direction as the sign), `clamp` (px) and `basis`. Axis y only. Default 0.2. A layer targets the part; the `background` boolean is removed.

**Driver.** Parallax keeps `@sgs/scroll-driver` and `fx-parallax.css`. Measured on the Eye Care hero (`T11-parallax-smoothness.md`), the visible lag came from the header restyling the page at scroll start, fixed separately; a browser-native animation stays in step even when the main thread is busy, but its per-block range is unproven, so it is Stage C (§14.1). Stage C models Motion's `scroll()` (`attachToAnimation`): native when `window.ViewTimeline` and `CSS.supports('animation-timeline: view()')` exist, named `rangeStart` and `rangeEnd` on a ViewTimeline, `scroll-driver.js` as the fallback, parallax on its own wrapper. `animation-composition:add` is not used: no library does, and it trailed by p95 77 px under a stall (`Q2-driver.md`). Two items must be proven first: a named-range form lagged in Q2 while the header shrank, and Chrome renderer crashes seen in that run have no known cause, so the native path ships off by default until reproduced. `T11`'s harness moves to Playwright's `page.screencast` (1.59 or later).

`basis:page` is measured from the block's own top: `distance = max(0, scrollY − blockTop)`.

Overscan, per side, printed in the moving element's scoped rule, as inset and height:

| Basis | Top | Bottom |
|---|---|---|
| view | `|r| × (H + V) / 2` | same |
| page, r > 0 | `|r| × H / 2` | same |
| page, r < 0 | `|r| × H / 2` | `|r| × H` |

H is the block height, V is `100lvh` to match the driver's `window.innerHeight`. Travel clamps to overscan. Reduced motion: no movement. Verified at speeds 0.1, 0.5 and 1, both signs, both bases, at 375 and 1440.

`speedRatio` 0.18 on the Eye Care hero gives the draft's ±9% at the page's top.

### 10.3 Pinned

Stage C (§14.1), modelled on core Cover's `.has-parallax`: `background-attachment: fixed`, reset to `scroll` on iOS and under reduced motion. No draft or saved content uses a fixed background today. Until then a fixed attachment found in a draft or saved content is reported and goes to Custom CSS.

### 10.4 Elements

| Element | Prefix | Context | Kinds | Settings | Specialised |
|---|---|---|---|---|---|
| `sgs/media` | `media` | content | all | all | Caption, Link |
| Container, trust bar, site header, site footer, multi-button, physics canvas, nav drawer | `background` | background | I V S | Source, Fit, Focal, Repeat, TileSize, Overlay, Loading | Tile, Surface panel where declared |
| Hero background | `background` | background | I V S | same | SVG parts |
| Hero split | `split` | content | I V S | all but Caption | Column placement |
| Decorative image | `layer` | layer | I S | Source, Fit, Focal, Width, Max width, Height, Ratio, Opacity, Shape, Blend, Radius, Border, Shadow | Position, rotation, anchor, flip, fade on scroll |
| Gallery | `item` | item | I V | Source, Fit, Focal, Ratio, Radius, Shape (block level), Loading | Grid, masonry, scroll and carousel layouts, caption reveal, lightbox, drag reorder, tile min height, item link |
| Card grid, post grid | `image` | item | I, featured | Source, Fit, Focal, Ratio, Radius, Shape, Loading | Grid, image fallback |
| Product card, buybox | `image`, `thumb` | item | I, featured | Source, Fit, Focal, Ratio, Radius, Loading | Colour swap, thumbnails, brand logo, configurator preview |
| Team member, testimonial | `photo` | content | I | Source, Fit, Focal, Radius, Shape | Layout |
| Testimonial logo, work | `logo`, `work` | content | I | Source, Fit; `work` also Focal | |
| Before-after | `before`, `after` | content | I V S | Source, Fit, Focal, Height, Width, Radius | Divider |
| Timeline | `entry` | content | I V | Source, Fit, Focal, Ratio, Radius | |
| Responsive logo, nav drawer logo, choice-flow header logo | `logo` | content | I S | Source, Width, Loading | Light and dark source, SVG parts |
| Choice-flow option, form tiles, option picker swatch | `option`, `tile`, `swatch` | item | I | Source, Fit; option also Focal | The flow's own fit setting |
| Trust-bar badge, brand strip | `badge`, `logo` | item | I | Source, Fit, Radius, Shape | Marquee |
| Image sequence | `thumbnail` | content | I | Source, Fit, Ratio | Frame sets |
| Measured diagram | `drawing` | content | I S | Source only: a crop would break the measurements | Measurement overlay |

Not media settings: `sgs/business-info`'s map, `sgs/audio`, pure icon pickers (`iconSvg`), and the fixed artwork in `sgs/google-rating-badge`, `sgs/star-rating` and `sgs/trustpilot-reviews`. Gates allow-list them. Small fixed thumbnails keep their own attributes and are not slots: cart, wishlist panel, product search, store selector flags, nav drawer menu items, mega panel cards and Google review avatars. Their `SGS_Media_Element::style` calls become `sgs_emit_responsive_css`, so §8.2 still deletes everything in the one release; `sgs/cart` and `sgs/wishlist-panel` keep their JS-built `<img>`. `responsive-logo`'s custom pixel switch point is removed: a logo switches at a device.

### 10.5 Target against what exists

Built status from running each effect in real Chrome (`T10-effects-run.md`); target from product docs and the three drafts (`T7`, `T8`).

| Effect | Status | Decision |
|---|---|---|
| Hover library (31 presets) and Entrance library (80 presets), with Fine-tune | Built, works on `sgs/media` today | Offer whole, filtered by what the element can carry |
| Image hover zoom | Built, works; three private copies in gallery, card grid, post grid | One route; delete the copies; add a fixture |
| Grey to colour | Four systems; untested | One route through Hover's filter; add a fixture |
| Parallax | Built; position correct; lag caused by the header | Fix the header; native driver in Stage C (§10.2) |
| Ken Burns | Built, works; not reachable from `sgs/media` | Add to images |
| Float, SVG loop, draw | Built, work | Offer per §10.1; retire the SVG presentation atom's copy |
| Pinned | Missing; no draft or saved use | Stage C |
| Background video | Built; no fixture, not run | Keep; add a fixture |
| Click-to-play cover on an embed | Missing; no draft uses it | Drop: embeds stay lazy iframes |
| Scrub, pin, horizontal panels | Built, work | Keep on their blocks; not on media |
| Marquee | Built; hover slowdown and a 375 title position fail | Fix in the motion track, not here |
| Follow pointer, magnet, sheen, glare, ripple, cursor field | Built; ripple and cursor field partly | Keep on their blocks; not on media |

## 11. Cloner and agent contract

Schema: `schemas/media-slot.schema.json`, refusing unknown keys and shapes. `wp-build-page` reads it. Tiers are written only where a device differs from what it would inherit. Rows match top to bottom; first match wins; an absorbed wrapper is matched on its merged box.

| Draft pattern | Target |
|---|---|
| Image, video or iframe with `position:absolute` and `inset:0` (or full width and height) behind sibling content | The parent's Background slot |
| Frame height set by a parent, or `height:100%` of a definite parent | Height Fill |
| `height:100%` of an indefinite parent | No Height; `<image-slot>` writes Match its space |
| `aspect-ratio`, `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height` | The setting of the same name, as declared. A height on a box that keeps the file's ratio at every width writes Height with Width `auto` |
| Computed `object-fit` where the box crops, including `fill` | Fit; no crop writes neither Fit nor Focal |
| `object-position` in `{x,y}` terms | Focal; otherwise Custom CSS, reported |
| `border-radius` of 50% on all corners | Shape Circle if square, else Ellipse |
| Fully rounded ends | Shape Pill |
| Any other `border-radius` | Corners |
| `clip-path`: `circle(50%)`, `ellipse(50% 50%)` | Shape Circle or Ellipse |
| `clip-path`: `inset(… round R)` | Corners R |
| `clip-path`: polygon within 1% of a registry shape | That Shape; else Custom CSS, reported |
| Border, shadow, padding, opacity, order | As named |
| `filter` blur or grayscale | Blur, Greyscale; other filters Custom CSS, reported |
| `mix-blend-mode` | Blend |
| `margin-inline:auto` | Alignment centre |
| Other margin or offsets | Not written |
| Overlay child | Overlay |
| `:hover` scale on image or wrapper | Hover Zoom on the media part |
| A transform that runs once on load or scroll | Entrance Scale, with its from, to, duration, delay and easing |
| Google Maps `<iframe>` | `sgs/business-info` map; `grayscale()` to its map filter; other filters Custom CSS, reported |
| Cursor-following `clip-path: circle()` over a second layer | Container Effects, Cursor field, image reveal |
| A different file at 375, 768 and 1440 | Per-device Source of the same kind |
| `<image-slot>` no shape | Corners 12px; with shape rect: none; rounded: Corners; circle, pill: that Shape |
| `<picture>` | Per-device Source |
| `<figure><figcaption>`, `<a>`, `<iframe>`, `<svg>`, `<video>` | Caption, Link, embed, svg, Playback |
| `url()` `background-image` with children | Background slot; size cover or contain to Fit, auto with repeat to Tile, position to Focal; attachment fixed reported, Custom CSS |
| `url()` `background-image`, no children | `sgs/media` |
| Gradient `background-image` | The block's own background gradient setting |
| `clip-path` on a text element | Custom CSS, reported |

WP-13 adds Fill's new image route as new files and switches over in Stage B. The route picks the slot by `supports.sgs.mediaElements` prefix and context, merges per device, reads at 375, 768 and 1440, writes width, height and mime (FR-49-16), and writes Decorative for `alt=""`. It replaces `fill-media.mjs::imageSlots` (which finds images only by the old `Url`, `Id`, `Alt` names), `scalar-media-roles.json` and its detector, `apply-svg-file.mjs`, `calibrate-instances.mjs`, and the `property_equivalents` row that turns an image's height into max-height.

**Absorption:** an element is merged into the media when it has exactly one image, video or picture child, plus at most one absolutely-positioned overlay with no text or one figcaption; it has no text of its own; and its overflow is hidden or clip, or it declares ratio, radius, border, shadow or background colour the image does not repeat. Controls, positive: radius only, ratio only, overflow only, overlay, figcaption, background colour. Negative: text, two images, badge.

## 12. Acceptance tests

Editor on a local mirror; front end in real Chrome at 375, 768 and 1440, Firefox and WebKit where stated.

- **AC-1** After `sgs-update`, every setting has a DB row with its property, `tier_object` and paint node in `css_element`; the drift gate fails on an edited block.json (negative control).
- **AC-2** Detector over `block.json`s: no flat media tiers, one Focal shape, no tiered Alt.
- **AC-3** Fixture of Ratio, Width, Height and each limit in combination, per device, matches §7.2 in editor and front end, including ratio with a height, a width, or a maximum, inside `<figure>`, `<a>`, `<picture>` and the helper; a caption wraps to the media; all three browsers (Chrome, Firefox and WebKit), including WebKit video `object-fit` and `object-position`, which the research run could not test.
- **AC-4** Three-source picture: one image request per width. `none` and a Hide toggle: none. `wp_filter_content_tags` leaves the markup correct.
- **AC-5** Each §8.2 name greps empty.
- **AC-6** Helper present for each trigger, including at one device only and hover colour only; absent for caption only, link only, both, or none. Circle with shadow and overlay is a true circle on image and embed; with hover zoom on an image. Focus rings not clipped.
- **AC-7** Every background state prints `.sgs-bg-media`; parallax moves it; with a divider and overlay, stacking holds at three widths.
- **AC-8** Shared fixture of breakouts, run through PHP and JS, neutralised; SVG script and handlers removed on the front end; a non-allowlisted embed refused; every emitter output validates.
- **AC-9** No per-block style tags; two identical blocks make one rule; scope class stable across two loads; CSS order per §6.2.
- **AC-10** On home, shop, product, post and contact at 375x667 and 1440x900: no image lazy that is in view inside the header or first top-level section; at most one high, exactly one when an eligible candidate exists; none from hidden surfaces; REST or cached fragments are never high.
- **AC-11** Firefox and WebKit reserve the same space as Chrome; no typed `attr()`.
- **AC-12** Panels, order and labels per kind match §9.4 (DOM check).
- **AC-13** Each rule-table row visible and omitted at each device; no empty panel; no duplicate labels.
- **AC-14** On Tablet a change writes only tablet; Mobile says "using Tablet"; dots and Reset work; undo restores in one step; a field another setting overrules says why; global controls say so; a sample of non-media `ResponsiveOverride` users behaves as before; dragging the editor canvas through 375, 767, 768, 1023 and 1024 shows the matching device in the panel.
- **AC-15** Inherited tier's picker shows the inherited point on the inherited image.
- **AC-16** A 12-slot matrix (Height, Ratio, Width, Fit, kind, hover, gradient, shadow) is equal within 1px across editor and front end at three widths; no `style` attribute on any media element in the editor.
- **AC-17** Each §9.5 state shows its message; the deleted file prints nothing.
- **AC-18** Gate fails on a hand-rolled picker and on a second focal shape (negative controls).
- **AC-19** Effects listed as §10.1; targets match availability.
- **AC-20** Parallax per §10.2, no gap, measured, including a block at 3000px and a shrunken mobile toolbar. No Attachment.
- **AC-21** The motion line opens Effects targeted at Background, repeatedly, and moves focus.
- **AC-22** No old media shape attribute or clip-path preset; `sgs/icon` shape unaffected; Circle sits in the Shape grid.
- **AC-23** Each mask shape on a photo with shadow, under 2% pixel difference at a 4-level tolerance, all three browsers; per-device mask.
- **AC-24** Fixture per §11 row; absorption controls; schema refuses unknown shapes; `wp-build-page` accepts slots.
- **AC-25** Detector survey zero old attributes on every site, pattern and tree; computed width, height and object-fit within 1px before and after except the listed allowed changes (hero images whose Size and Position are inert today are expected to change); Bean checks the five sites by eye (FP-13).
- **AC-26** One full fixture per context (content, background, item, layer), a render and settings-list smoke check per block, and the Eye Care hero parallax and focal point on settings alone.
- **AC-27** Fill in a bare parent, fixed parent, stretched flex item, grid cell, min-height section (grid or flex-column content band) and ratio container; never 0, and a row beside shorter text is not forced taller; in Chrome, Firefox and WebKit.
- **AC-28** Keyboard only: the walkthroughs touching `Chips`, `FocalField`, `ShapeField` and the motion line complete; axe finds no serious issue in any panel; 44px targets; visible focus.
- **AC-29** Each walkthrough completes: replace a photo; circle; different mobile crop; arch with shadow; fill in a card; overlay lightening on hover; video with poster; embed with radius; phone-only image; hero parallax from Background; hover zoom; working on Mobile; Reset.
- **AC-31** A fixture of `sizes` strings passes per §7.6's rules.
- **AC-32** A photo uploaded through the WordPress 7.1 editor renders with more than one `srcset` source and stored `width`, `height` and `mime` that match.

Stage C adds a smoothness test for the native driver: judged from painted frames with CPU slowed 4x, worst of 5 runs, at 375 and 1440, with `Input.synthesizeScrollGesture`; at ratio 0.18, p95 error at most 4 px and maximum at most 6 px; the effect switched off must read at most 1.1 px or the run is void. Frame rate and `requestAnimationFrame` sampling are not evidence.

## 13. Migration

Tool: `plugins/sgs-blocks/scripts/migrate-media-system/` (survey, fix, check, self-test with a negative control). It refuses any attribute with no mapping, and the survey output is committed. It recurses into parent blocks as well as their inner blocks, pins the old default wherever the new default differs, and is idempotent per post. Targets: saved content in all five sites, `theme/sgs-theme/patterns/`, `sites/*/build/` trees and skeletons, motion fixtures including the canary's ten QA pages, and computed-route calibration fixtures.

| Old | New |
|---|---|
| `mediaType`, `videoSource`, `imageId/Url`, `videoUrl/Id`, `svgContent`, tiers | `mediaSource` |
| Saved Lottie media (one block: the `qa-lottie` test page, 4087, on sandybrown) | Reported and resolved by hand |
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
| `backgroundAttachment: fixed` | Reported, Custom CSS (none saved) |
| Parallax `background:true` | Layer on the background part |
| Motion layers on old parts | New part names |
| `splitMedia*` | `split*` |
| `chromeLogoTablet/Mobile` | Responsive logo Source |
| `sgsObjectPosition`, `sgsObjectFit`, `imageZoomHover`, `sgsHoverZoom*`, `scaleHover`, `grayscaleHover` | Focal, Fit, Hover effects on the media part |
| `backgroundColour`, `mediaBackgroundColour` on media elements | Background |
| Custom CSS setting focal, size or per-device visibility | Settings, each reported |
| Caption size family | `caption*` responsive |
| Overlay family on backgrounds | Names unchanged |
| Container `boxAspectRatio` | Stays: a layout setting |
| `videoAutoplay`, `videoLoop`, `videoMuted`, `videoControls`, tiers | `Playback` |
| `videoCaptions*` | `Captions` |
| `sgs/media` `imageHeight`, `imageWidth` | Source width and height |
| Product card `image`, `imageId` | `imageSource`; a bare URL has its size read during migration |
| Product card `imageFill` | Height Fill |
| Product card `imageAspectRatio` | Ratio |
| `imageSize` on product card, gallery, post grid | Deleted; sizes are derived |
| Gallery `mediaItems` | Item `source`, `alt`, `decorative`, `fit`, `focal` |
| Card and post grid `imageHeight`, timeline `mediaHeight`, `sgsHeight` | Height |
| Timeline `mediaAspectRatio`, `mediaBorderRadius`, `milestoneMediaWidth` | Ratio, Radius, Width |
| `imagePadding`, hero `mediaPadding`, `mediaBackground` | Padding, Background |
| `sgsMaxWidth` | Max width |
| `logoId`, `logoUrl`, tiers, `darkLogoId`, `chromeLogo*`, `headerLogo` | `logoSource` and its dark source; width and box settings by name |
| `inlineSvg`, `svgParts*`, `chromeLogoSvgParts*`, `bgSvgParts*` | Inline SVG Source; `SvgParts`, `SvgPartsTrigger` |
| `bgSvgOpacity`, `bgSvgMinHeight` | Opacity; the block's min height |
| Before-after `beforeImage*`, `afterImage*`, `*MediaType`, tiers | `beforeSource`, `afterSource`, Alt, Decorative |
| Measured diagram `drawingImageId`, `Url`, `Alt`, `Decorative` | `drawingSource`, Alt, Decorative; its width and height stay as measurements |
| Team `photo`, tiers; testimonial `avatarMedia`, `orgLogo`, `workMedia` | Each slot's Source |
| Buybox `mainPhoto*`, `galleryThumb*`, `previewImageId` | Radius, Border, Shadow, Source by slot |
| `optionMediaSize`, brand strip `logos[].media`, `tileShape` | The slot's Width, Source, Shape |
| `itemThumb*`, `avatarSize`, `avatarBorderRadius`, `itemMedia*`, `drawerCardMedia*`, `drawerCardThumbSize`, `flagUrl` | Stay: not slots (§10.4) |
| Old loading and priority attributes | `Loading` |
| `swatchShape` | Shape |
| Brand strip `imageEffect`, `sgsColourTreatment` | Hover filter where it is grey to colour; otherwise Custom CSS, reported |
| Decorative image `hideOnTablet`, `hideOnMobile` | Universal `sgsHideOn*` |
| `logoSwitchCustomPx` | Deleted; nearest device, reported |

Deploy and migrate are one step per site: back up the database, deploy, run the detector's fix and check, purge caches, or restore. Site order: mirrors, sandybrown with full motion QA, mamas-test (Mama's work resumes when it passes AC-25), then indus-test, then eye-care-clone-test, one at a time. `eye-care-test`, the presented site, runs last only with Bean's agreement; `build-deploy.py` refuses a post-cutover build on any target whose detector check is not clean, so it can take no framework deploy until it migrates. Rollback: restore that site's backup and redeploy the previous tag.

## 14. Build plan

### 14.0 Working rules

The main thread is the Integrator: only it reseeds, regenerates tracked files, edits baselines, and deploys. A reseed takes about six minutes; nothing commits during one. Build agents work in their own git worktrees, never link `node_modules`, commit with explicit pathspecs, never run `sgs-update` or `build-deploy.py`, keep editor checks on local mirrors and never burst Hostinger. Up to eight agents at once.

### 14.1 Stages

**Stage A1, dormant on main.** New files only, adopted by nothing. **Stage A2, live shared changes, each with its own check:** the display change in `ResponsiveOverride` (AC-14's sample), `icon-shapes.json` additions (icon picker unchanged), WP-0b's wrapper split. New gates carry an "active from cutover" switch. **Slice gate, after WP-1, 2, 4, 5:** `sgs/media` image kind plus one container background, migrated on one mirror, one real clone built, editor and front end checked; WP-6, 10a, 13 and 14 start only after it passes and contracts unfreeze until then. **Stage B, one cutover release.** A short integration branch, opened after Stage A, applies block adoption by script and hand, runs migration on mirrors, passes both gate tiers and PS-8, merges to main in three or more commits (FP-5), and removes old code in the same release. Every block folder Stage B edits is frozen from the moment the branch opens, enforced by a pre-commit path check. Adoption stays a re-runnable script against fresh `main`; if the branch has not merged within three sessions, delete it, re-run later, and release Mama's waiting items as ordinary work. **Stage C, after cutover, additive and needing no migration:** the native parallax driver with §12's smoothness test, Pinned, and uploaded masks.

Eye Care's remaining checks carry on alongside Stage A. Mama's work that touches media waits for the cutover.

### 14.2 Proofs (run first, independent)

PS-1 DB and gates accept §8, including one item-set block's `slot-array` shape, which exists nowhere yet (`SGS_FRAMEWORK_DB` on a private copy, proven by sha). PS-2 §7.2 Fill design, in standards mode, 13 layouts, in Chrome, Firefox and WebKit, plus WebKit video `object-fit` (untested in the research run, which timed out), the caption rule and the helper's file ratio. PS-5 lead pre-pass on REST and cached fragments. PS-7 `sizing-cases.json` and one case of each new kind give equal CSS in PHP and JS. PS-8 is AC-25's comparison, its "before" captured in Stage A. Outcomes: PS-2 fails: Fill requires a parent height and shows "Needs a tall container". PS-5 fails: no high priority on fragments. PS-1 gates WP-1; PS-2 and PS-7 gate WP-2 and WP-4.

### 14.3 Contracts (frozen before WP-1)

**C1 Atom registry entry** (the fields an atom gains):

```json
{ "base": "Fit", "type": "string", "enum": ["cover","contain","fill","none","scale-down"],
  "enumByContext": { "background": ["tile"] }, "default": "cover", "responsive": true, "since": "1.0",
  "emitter": "plain", "css": { "property": "object-fit", "paint_node": "media" },
  "control": { "component": "FitField", "label": "How it fills", "panel": "size-and-crop", "order": 6 },
  "slots": "all" }
```

**C2 Renderer:** `SGS_Media_Element::render( array $slot, array $attrs, array $context = [] ): array` returning `{html, css, needs_helper, lead_candidate}`. `$slot`: `{prefix, kinds, context}`. `$context`: `{uid, block, area, section_index, item_set:{index,columns}, in_editor, extra_class, anchor}`. Empty or deleted source returns empty `html`. The caller prints `html` and passes `css` to the collector.

**C3 Emitters:** each atom's PHP twin, `sgs_media_atom_<id>_css( array $slot, array $attrs, string $uid, bool $helper ): string`, collected by the renderer. Selectors: layout `.{uid}`; surface `.{uid}` or the helper; media `.{uid} .sgs-media-el` with a helper or a wrapper, else `.{uid}`; overlay `::after`; mask `.sgs-media-box__mask`. Keys sorted before hashing. JS twin: each atom's logic module, collected by `mediaPreview( slot, attrs, uid ) -> { css, className }`. Fixture: `tests/fixtures/media/matrix.json`.

**C4 Rules:** each atom's `disclosure( attrs, device, prefix )`, keeping its two legal return shapes.

**C5 Priority:** `SGS_Media_Priority::resolve( array $context, array $facts ): array` returning `{loading, fetchpriority, claims}`.

**C6 Store:** `inspector-focus`: `open({clientId,panel,target,requestId})`, `getRequest(clientId)`, `clear(clientId)`. The Background target is the part matching the resolved kind.

**C7 Shapes:** `icon-shapes.json`, per §7.5.

**C8 Generator:** `scripts/generate-media-attributes.mjs`, extended, reads the registry and each `supports.sgs.mediaElements`, writes attributes marked `_generated: "media-atoms"` into `block.json`, `--check`, `--block <slug>`.

C0 ships these signatures as documentation and the shared fixture files, not stub code. They stay open to correction until the Slice gate passes.

### 14.4 Packages

| Package | Owns | Needs | Stage |
|---|---|---|---|
| C0 Contracts | §14.3 signatures, fixture files, file layout (Integrator) | | A |
| Proofs | proof scripts, reports | C0 | A |
| WP-H Header (ahead of Stage A) | Stop the header's shrink restyling the page; every sticky and anchor consumer unchanged | | Done first |
| WP-0b Wrapper split | Background code of `class-sgs-container-wrapper.php` into `includes/class-sgs-background-layer.php`, no behaviour change | | A |
| WP-1 Core | Atom registry fields (units, ranges, hover forms, effects by kind), the extended generator writing `block.json`, schema generated from attribute `properties`, Spec 32 and 35 amendments; `theme.json` `settings.viewport` at `767px` and `1023px` so WordPress's editor device switching and core blocks match SGS's tiers; attribute `role: content` on Source, Alt, Decorative and Caption after a spike on object attributes | PS-1 | A |
| WP-15a Gates | New gates; `gate-disposition.json` classifying every gate and test naming removed code as reused, changed or deleted (starting list: `T3` §2.5, `T4` §5) | WP-1 | A |
| WP-2a Markup | `SGS_Media_Element` extended into the renderer, §7.1, §7.3, §7.9; `media-base`, `-overlay`, `-video.css` | WP-1, PS-2 | A |
| WP-2b Atoms | Each atom's PHP twin printing real properties; the new `sizing`, `shape` and `filter` atoms; folding `media-type` and `intrinsic`; the typed validator | WP-1, PS-7 | A |
| WP-3 Loading | `includes/media/class-sgs-media-priority.php` | WP-1, PS-5 | A |
| WP-4 Controls | The atoms' controls per §9.2, `mediaPreview.js`, reworked `ResponsiveOverride` | WP-1 | A |
| WP-5 Disclosure and panels | The atoms' disclosure rules per §9.3, `MediaElementPanel` reworked into §9.4's panels | WP-1 | A |
| WP-6 Masks | `icon-shapes.json` additions with `surfaces`, `media-mask.css`, `ShapeField` | WP-1, Slice gate | A |
| WP-10a Effects UI | Motion targets and fields, store, `render-paths.json`, `motionSurface` on `sgs/media`, registry filters accepting the media and background parts | WP-1, Slice gate | A |
| WP-13 Cloner | New files for Fill's image route (§11), parity, skeleton rules, `wp-build-page` descending into object attributes, Spec 48; the switch-over commit is in Stage B | WP-1, Slice gate | A |
| WP-14 Detector | Migration tool, mapping rows, run on mirrors in Stage B | WP-1, Slice gate | A |
| Wave 1 | `sgs/media`, decorative-image, gallery | WP-2 to 6 | B |
| WP-8 Backgrounds | Background layer, BackgroundPanel, the Fill content-band rule, `media-bg.css`, wrapper adopters | WP-0b, 2, 4, 5 | B |
| WP-10b Motion runtime | Overscan, one route for image zoom and grey to colour | WP-2, 8 | B |
| WP-9 Hero | `src/blocks/hero/*` | WP-8 | B |
| Wave 3 | Card grid, post grid, product card, buybox, brand strip, responsive logo, nav drawer logo, choice-flow header logo | Wave 1 | B |
| Wave 4 | Team member, testimonial, before-after, timeline, choice-flow options, form tiles, option picker, image sequence, measured diagram, trust-bar badge; style-call replacement in the small fixed thumbnails | Wave 1 | B |
| WP-15b Docs, removal | Specs 02, 35A, 36, 48, rules, CLAUDE files; §8.2 | all | B |

Parallel after WP-1: WP-0b, 2a, 2b, 3, 4, 5. Parallel after the Slice gate: WP-6, 10a, 13, 14. Waves within Stage B after their needs. Generated files and baselines change only through the Integrator.

## 15. Non-functional

Accessibility: WCAG 2.1 AA; alt and title warnings; keyboard paths; reduced motion honoured; no serious axe findings. Performance: §7.7, §7.9. Security: FR-49-12, FR-49-14, FR-49-17. Browsers: Chrome, Firefox and WebKit gates. No media PHP file over 500 lines; `render.php` only calls the renderer. JS-written custom-property values are allowed at runtime; PHP and editor style attributes are not.

## 16. Traceability

Register items: H1 done (`24095ea4f`, resolved CSS values through token helpers). Q1, Q2: §6.5, §7.1, §7.8. Q3: §9.6. Q4: §6.6, FR-49-28. F1: FR-49-4, FR-49-23, §10.4. F2, F3, F4: §9.2 `FocalField`, §9.3, §9.4. B1: FR-49-29, §10.2. B2: §6.6, §9.3. M1: §9.4. M2: FR-49-27. M3: §9.4. M4: FR-49-19, §9.3. M5: §9.4. M6: §7.4, §9.4. M7: FR-49-32, Circle, §7.5. M8: §9.2. R1: FR-49-19, FR-49-20. R2: §10.4. R3: §6.1, FR-49-26, WP-15a, WP-15b. R4: §10.

FR to AC: FR-1 AC-1; FR-2 to 4 AC-2; FR-5 AC-3; FR-6, 8, 9 AC-4; FR-7 AC-5; FR-10, 17, 31 AC-6; FR-11 AC-7; FR-12, 14, 17 AC-8; FR-13 AC-9; FR-15 AC-10; FR-16 AC-11, AC-32; FR-18 AC-12; FR-19 AC-13; FR-20 to 22 AC-14; FR-23 AC-15; FR-24 AC-16; FR-25 AC-17; FR-26 AC-18; FR-27, 28 AC-19; FR-29 AC-20; FR-30 AC-21; FR-32 AC-22; FR-33 AC-23; FR-34, 35 AC-24; FR-36 AC-25; FR-37 AC-26; FR-38 AC-27; FR-39 AC-31.

## 17. Open questions

None. Bean's rulings on 2026-11-09: no CSS size target for this work; duotone left out; videos play on phones.
