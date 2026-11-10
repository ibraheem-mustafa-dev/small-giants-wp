---
doc_type: spec
spec_id: 49
spec_version: "0.8"
title: SGS Media System
project: small-giants-wp
status: approved
authors: Bean, Claude
session_date: 2026-11-09
last_verified: 2026-11-10
status_history:
  - 2026-11-09: v0.1, first full draft
  - 2026-11-09: v0.2, rewritten after five independent reviews and live proofs
  - 2026-11-09: v0.3, Bean's answers: sizing is independent settings with no modes, circle is a shape, duotone and Lottie left out, videos play on phones, no CSS budget target; awaiting Bean's approval
  - 2026-11-09: v0.4, CSS sizing research applied; awaiting Bean's approval
  - 2026-11-09: v0.5, block, file, control and motion research merged, scope cut to the goal, parallax driver changed after the smoothness study; awaiting Bean's approval
  - 2026-11-10: v0.6, QC sweep fact-checked and applied; Bean's decisions: a different kind per device on every slot that allows two or more kinds, the white logo filter and the logo switch width kept, the fixed background kept as Pinned (Parallax at full strength leaves gaps), the 28 untested effects run (T12), Effects filtered by the kind on each device, existing atoms and shared files edited live behind unchanged-output checks; Bean's above-the-fold loading rule; appendices A to C
  - 2026-11-10: v0.6 approved by Bean; build starts with the brief's Tasks 2 to 7
  - 2026-11-10: v0.7, the proofs' results applied (PS-1, PS-2, PS-5, PS-7, PS-10)
  - 2026-11-10: v0.8, Stage B setup's findings applied: narrowed atoms on two slots, the decorative image's context, three slot prefixes, saved content and the hand-resolved items in §13
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

This spec replaces the system's data model, renderer and controls so it never needs re-investigating. The existing media atoms and shared files are extended in place; other old parts are reused only where scrutiny passed them (§6.9).

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

Non-goals: image editing or generation; replacing the WordPress media library; hotspots; a new lightbox (the gallery's existing lightbox stays); saved style presets across slots; multi-layer stacked backgrounds; drag-and-drop upload; duotone; Lottie as a media kind (the Lottie effect in the motion system is untouched); CSS size targets (delivery follows §6.7 and no limit is set or gated here); new image formats (WordPress's generated sizes are used); a typed Sizes override or image-size dropdown (sizes are derived); a per-device border width (Bean-locked off). `core/image`, `core/cover`, and WooCommerce's own product images stay on WordPress's logic.

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
| Existing atoms and shared files are used and extended from the start, each change behind an unchanged-output check; new parts stay unadopted until one scripted release switches every block | Bean 2026-11-09, clarified 2026-11-10 | Yes |

Bean's ruling: no CSS size target for this work, and no gate or number is added for it.

Amendments this spec makes to others, in WP-1's commit: Spec 32 FR-32-4 (media slots emit real properties in the collector); Spec 35 D5 (per-device media sources use the responsive value object, each device carrying its own kind, file and, when its file differs, alt); Spec 35 §12 (the reworked `ResponsiveOverride`); Spec 35 option-count bands (visual chip grids for ratio, fit and mask); Spec 35 A5 (`PanelBody` here, because the rule table removes the need for `ToolsPanel`).

## 4. Glossary

- **Slot:** one place that shows media, declared by a block (§8.3).
- **Prefix:** the attribute name start for a slot: `media` on `sgs/media`, `background` on backgrounds.
- **Device:** desktop, tablet or mobile, from `SGS_Breakpoints`.
- **Responsive value:** an object `{desktop?, tablet?, mobile?}`. A missing key, `''` or null inherits, through `resolveTier` and `sgs_resolve_tier`, the only inheritance mechanism (Spec 35).
- **Kind:** image, video, embed, svg, featured (the post's featured image), none. **Resolved kind:** the one at a device after inheritance. **Allowed kinds:** the kinds a slot accepts (§8.3); each device's kind is one of them.
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
- **FR-49-3** Decorative MUST be one value per slot. Alt is one value per slot, and a device whose file differs MAY carry its own alt inside its Source, inheriting upward like the file. Test: AC-2.
- **FR-49-4** Focal point MUST be `{x,y}` in 0 to 1, on every element. Test: AC-2.
- **FR-49-5** Sizing MUST be independent settings that all work together (Ratio, Width, Height, and minimum and maximum width and height), resolved by §7.2, with no mode attribute or mode control. Test: AC-3.
- **FR-49-6** The universal `sgsHideOnMobile`, `sgsHideOnTablet` and `sgsHideOnDesktop` toggles apply to whole blocks only, a decorative image included. When a block is hidden on a device, the renderer MUST print no file for that device. Slots inside a block cannot use them: `{kind:"none"}` is offered on background and split slots, labelled "No background from this device down", and applies from that device down unless a narrower device has its own source. Test: AC-4.

### Rendering

- **FR-49-7** One renderer, `SGS_Media_Element` extended, MUST print all slots. Everything in §8.2 MUST be removed. Test: AC-5.
- **FR-49-8** Different images per device MUST use `<picture>` with one `<source media>` per differing device, queries from `SGS_Breakpoints` and viewport-only. Each source carries its own srcset, sizes, width and height. A device that shows no image (`none` or another kind) gets a source whose `srcset` is a 1-pixel GIF data URI: browsers skip an empty `srcset` and download the image (tested in Chrome, Firefox and WebKit, `R-per-device-kind.md`). Test: AC-4.
- **FR-49-9** Only the shown files MUST download (§7.1). Each device's Source holds its own kind, one of the slot's allowed kinds, and its file, or none. A slot that allows one kind keeps per-device files of that kind. Test: AC-4.
- **FR-49-10** The helper MUST be printed if and only if §7.3 says so, and paint MUST follow §7.4. Test: AC-6.
- **FR-49-11** Every background MUST print one real element in every state (§7.8). Root-`::before` background painting MUST be removed. Test: AC-7.
- **FR-49-12** Every stored string reaching CSS MUST pass the existing value helper for its type: `plugins/sgs-blocks/includes/helpers-css-safety.php::sgs_css_length_value` and `sgs_resolved_css_value`, `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_colour_value` and `sgs_css_gradient_value`; a type with no helper (shadow, blend, filter) gains one beside them, and URLs pass `esc_url()` inside `url()`. They refuse `"`, `'`, `;`, `{`, `}`, `<`, `>`, `\`, newlines and unbalanced brackets, allowing brackets only in `calc()`, `min()`, `max()`, `clamp()`, `var()` and, for colour, gradient and shadow, `rgb()`, `rgba()`, `hsl()`, `hsla()` and the gradient functions, because drafts use them. A gate runs the shared breakout fixture through every emitter. The shared length helpers gain the checks PS-7 found missing, so every caller gets them: quotes must pair up, a bare number is not a length, and no two adjacent terms may sit inside `min()`, `max()` or `clamp()`. Test: AC-8.
- **FR-49-13** Per-instance CSS MUST go through `sgs_collect_css`, in real properties, under a scope class hashed from the slot's sorted values. Test: AC-9.
- **FR-49-14** Inline SVG MUST be sanitised at render and in the editor with `sgs_svg_kses_allowed_tags`. Test: AC-8.
- **FR-49-15** Loading MUST use §7.7's single resolver and Bean's above-the-fold rule. The theme's `preload_hero_image` in `functions.php` and `inc/font-preloading.php` MUST be removed. Test: AC-10.
- **FR-49-16** Typed `attr()` MUST NOT be used. Real width and height MUST be printed on images, on a video's cover image, and never on an iframe (sized by CSS) or inline SVG (its viewBox). A source with no id MUST carry width and height (the picker and cloner fill them); without them nothing prints and the editor says "Image size unknown". Remote Google review avatars are exempt: their box has a fixed size. No attachment lookup at render. Test: AC-11.
- **FR-49-42** Every resized copy WordPress makes of an uploaded JPEG or PNG MUST be saved as AVIF at quality 60 where the server's image editor supports AVIF, else WebP at quality 82, through core's `image_editor_output_format` and per-format `wp_editor_set_quality` (calling `set_quality()` on an editor is reset when the output format differs); the original upload keeps its format; a converted copy larger than its source is discarded. An opt-in per-site regeneration (`wp media regenerate --skip-delete`, in batches with `MAGICK_THREAD_LIMIT=1`) rebuilds existing uploads' sizes. Measured on the Hostinger canary (ImageMagick 7.1.2): AVIF q60 is 56% smaller than JPEG q82 at SSIM 0.973, WebP q82 32% smaller at 0.977; AVIF encodes about 0.4 s per 1536px copy. Model: the Performance Team's Modern Image Formats plugin; research `~/.claude/memory/research/2026-11-10-wordpress-local-webp-avif.md`. Test: AC-10 (Bean 2026-11-10).
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
- **FR-49-25** Empty, deleted and missing-alt states MUST behave as §9.5. Test: AC-17.
- **FR-49-26** All media pickers MUST use `MediaSlotField`; a gate refuses raw `MediaUpload` elsewhere and any second focal shape. `sgs/audio` and the captions `.vtt` picker are allow-listed: neither is media this system prints. Test: AC-18.

### Effects

- **FR-49-27** `sgs/media` MUST offer effects via `supports.sgs.fx.motionSurface`, filtered per §10.1 by the kind shown on each device. Test: AC-19.
- **FR-49-28** The Effects target list MUST contain only parts available in the current state, through a declared `availableWhen` predicate on the part. Background video MUST have a part. Test: AC-19.
- **FR-49-29** Parallax MUST offer strength, direction and per-device on or off. Overscan MUST follow §10.2 and travel MUST never exceed it. `backgroundAttachment` MUST become the background slot's Pinned setting (§10.3). Test: AC-20.
- **FR-49-30** The Background panel MUST show one motion line whose button opens Effects on the Background target (§9.6). Test: AC-21.
- **FR-49-31** Hover zoom MUST clip to the media on every element offering it. Test: AC-6.
- **FR-49-40** An effect MUST run only on the devices whose resolved kind it supports, and the Effects panel MUST name those devices when they are not all. Test: AC-19.

### Shape

- **FR-49-32** The old media `shape` attribute, `photoShape` and clip-path presets MUST be removed; Circle is a shape in the Shape grid. `sgs/icon.shape` is unrelated and stays. Test: AC-22.
- **FR-49-33** Masks MUST come from one registry (§7.5), per device, keeping shadow. Test: AC-23.
- **FR-49-41** The `filter` atom MUST offer Colour: Natural, Black and white (with strength) and White, one `filter` each. `sgsColourTreatment` migrates to White. Test: AC-30.

### Cloner and migration

- **FR-49-34** A JSON schema MUST describe a slot; the cloner and `wp-build-page` MUST write through it and refuse unknown shapes. Test: AC-24.
- **FR-49-35** Every draft pattern in §11 MUST map to its target. Test: AC-24.
- **FR-49-36** All saved content, theme patterns and build trees MUST be migrated by one detector (§13), and a zero-old-attribute check MUST pass on every target before old code is removed. Test: AC-25.
- **FR-49-37** Every element in §10.4 MUST adopt the system with exactly the listed specialised controls. Test: AC-26.

## 6. Architecture and decisions

### 6.1 The atoms are the one table

The existing media atoms are extended, not replaced. Each atom is one setting group with a data-only registry entry (`src/components/media/atoms/registry.js`: id, bases, types, scope, attaches-to, requires, reads, disclosure, css), a pure JS logic module, a control, and a PHP twin (`includes/media/atoms/*.php`). Blocks adopt atoms through `supports.sgs.mediaElements`, which stays the slot declaration (§8.3). Their gates pass today (`test-media-atom-parity`, `test-media-attr-parity`, `test-media-enum-vocabulary`, `test-media-injection-parity`, `check-media-atom-purity`), and of the 51 element-and-atom rows across 20 blocks (`AT-atom-block-matrix.md`) none failed where run. Rows with no saved instance were not run live, and seven pairs lack an editor control, which §6.2 adds (object-fit on image sequence, trust bar, brand strip, card grid, gallery and team member; overlay on the hero).

What changes in the system as a whole: each registry entry gains a `settings` array, one C1 entry per base (§14.3), plus `effects` and `since`. `scripts/generate-media-attributes.mjs` writes the attributes into each adopting block's committed `block.json` (a drift gate keeps them equal), because over 200 gates and the seeder read `block.json`; the registration-time injector `includes/media-element-attrs-register.php` is then deleted, which ends the gap where the database held a different attribute set from `block.json`. Each atom's PHP twin prints real CSS properties through the shared helpers, so the resolver can route every setting, instead of custom-property values painted by a shared stylesheet. That stylesheet (`assets/css/media-element.css`, the 16 `assets/css/media-atoms/*.css` partials and their generator `scripts/generate-media-stylesheet.mjs`) is replaced by `media-base.css` and deleted in Stage B. Edits to atoms and shared files land live from the start, each with the atom parity gates and a saved-page fixture proving every existing block renders the same (§14.1).

### 6.2 What happens to each atom

| Atom | Verdict | Change |
|---|---|---|
| source | Extend | Sibling Tablet and Mobile keys become the `Source` responsive object, each device with its own kind, file and optional alt; owns `Loading`; its URL is escaped (FR-49-12) |
| media-type | Fold | Into `Source.kind`, per device, read from the chosen file and limited to the slot's allowed kinds |
| intrinsic | Fold | `Source` carries width and height |
| meaning | Extend | `Decorative` per slot; `Alt` per slot, with a device's own alt in its Source when its file differs; multi-line Alt |
| object-fit | Extend | Becomes `Fit`; `tile` added on backgrounds, owning `Repeat` and `TileSize`; the controls on image sequence, trust bar, brand strip, card grid, gallery and team member move onto the atom |
| focal-point | Extend | Stores `{x,y}`; keeps its disclosure rule; shows the inherited point on an inherited device; `Repeat` moves to Fit's tile settings and `Attachment` becomes the background slot's `Pinned` (§10.3) |
| box-shape | Extend, split | Becomes the `sizing` atom (Ratio, Width, Height, Min and Max width and height, the §7.2 resolver, every device) and the `shape` atom (Shape, Corners, Border, §7.5); its clip-path presets are deleted |
| media-padding | Extend | Becomes `surface`: Padding and Background colour |
| overlay | Extend | Hover form, `OverlayBlend` and the 40 starting strength; mounted on the hero |
| shadow | Keep | Hosts `ShadowControl`; the helper fixes clipping (§7.4) |
| opacity | Extend | Per device; Reset; gains `Blend` |
| svg-presentation | Extend | Keeps text shadow; gains Layer order and SVG parts; its animation moves to Effects' SVG loop (§10.5); its duplicate opacity goes |
| video-behaviour | Extend | Becomes `Playback`, adding the pause button; keeps its lock rules |
| caption | Keep | |
| link | Keep | |
| New: filter | New | Colour: Natural, Black and white (with strength), White, in one `filter`; replaces `sgsColourTreatment` |
| New: layout | New | Alignment and Order, on the layout box |

The emitter kinds of §8 map to the atoms' PHP twins: `plain`, `sides`, `corners`, `shadow` and `colour-states` twins call `plugins/sgs-blocks/includes/helpers-responsive.php::sgs_emit_tier_decls` and `sgs_emit_responsive_css`, `helpers-box.php`, `helpers-border-style.php`, `helpers-shadow-layers.php`, `helpers-shadow-hover.php` and `helpers-hover-state.php`; `sizing`, `focal`, `filter` and `shape` are the twins of those atoms. The editor uses each atom's JS module, plus `src/utils/border-preview.js`, `radius-preview.js` and `spacing-preview.js`; `background-preview.js` is split so `borderPaintPreview` survives. Atom modules and the utilities they import keep `.js` on every import, so the parity gate can load the real modules in Node (`src/utils/responsive.js` imports `./breakpoints` without it today, PS-7). The existing parity gates check PHP against JS; `plugins/sgs-blocks/tests/fixtures/media/sizing-cases.json` (§7.2's measured combinations with and without a helper) is the sizing atom's fixture, compared as parsed declarations per property and device. Order is by property, then device (desktop, tablet, mobile), with hover last.

A `plain` setting prints one property per device and nothing else.

### 6.3 Media-first

Without §7.3's triggers there is no wrapper: the `<img>` is the block.

### 6.4 Sizing has no modes

Bean's ruling. Ratio, Width, Height and the limits are separate settings that work together, as CSS itself does: pick a ratio and say how tall it should be, or that it must never go under or over a size. Fit and Focal then decide how the file sits in that shape, so a ratio acts like a crop. The earlier mode chips were rejected for keeping the separation that caused the old problems. It is also what the cloner needs: a draft's properties copy across one to one.

### 6.5 Backgrounds are media

A background is a slot in a real `.sgs-bg-media` element. Only a tiled or pinned image paints with CSS, on that element.

### 6.6 Motion stays in Effects

The Background panel says what the background is; Effects says how it moves. Duplicating controls in the panel was rejected: two controls for one effect can disagree, and each new effect would be built twice.

### 6.7 CSS delivery

Base rules in one small static file, `media-base.css`, loaded on pages with media. Optional parts (mask, overlay, video) load only when printed. Per-instance CSS emits only what is set, through the collector.

### 6.8 One cutover

Existing atoms and shared files are edited in place from the start, each change landing live with the atom parity gates and a saved-page fixture proving every existing block renders the same. New files land unadopted. Adopting the new controls, migrating content and removing old code happen in one release on a short integration branch, driven by scripts (§14.1). At no point do two render paths serve one block.

### 6.9 What is reused

| Part | Verdict | Use |
|---|---|---|
| Motion channels, Ken Burns, parallax runtime | Keep | Plus §10.2 |
| `plugins/sgs-blocks/includes/helpers-instance-scope-hash.php::sgs_instance_scope_hash`, `ShadowControl`, `SgsBorderControl`, `SgsBoxControl`, `SgsLengthControl`, link and caption fields | Keep | Rehosted |
| The media atoms, their registry, generator and parity gates | Extend | §6.1, §6.2 |
| `SGS_Media_Element` | Extend | The one renderer (§7) |
| `MediaElementPanel` | Rework | Its dispatch and "no rows, no panel" stay; it mounts §9.4's panels instead of one flat list |
| `plugins/sgs-blocks/includes/class-sgs-css-registry.php::sgs_collect_css`, `helpers-image-dimensions.php`, SVG sanitising (`helpers-svg-kses.php`, `helpers-svg-document.php`, `svg-upload.php`) | Keep | Renderer calls them |
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
| `plugins/sgs-blocks/includes/helpers-tier-media.php::sgs_tier_media_render`, `sgs_tier_media_toggle_css` | Rework | The per-device kind renderer (§7.1): the image branch prints one `<picture>`, the video branch `<source media>`, split by kind into its own files |
| `swapVideoSrc` in `src/blocks/container/view.js` and `src/blocks/hero/view.js` | Replace | One shared device-video module (§7.1) |
| Overlay | Rework | Layer inside the helper |
| Box-shape's clip-path vocabulary, loading trio, `sgs_render_media`, flat per-device keys | Replace | §7, §8 |
| BackgroundPanel position dropdown, art-direction attributes, Attachment (becomes Pinned), nav-drawer copy, raw `FocalPointPicker`, `sgsObjectPosition` | Replace | §9.4 |

## 7. Rendering contract

### 7.1 Markup

Nesting is always `figure > a > helper > mask > media element`, omitting levels not needed. One source: `<img class="sgs-media-el" …>`. Different images per device: `<picture class="sgs-media-picture">` around `<source>`s and the `<img>`, with `display:contents`. The `<picture>` generates no box: every setting that paints, moves or is observed (opacity, filter, transform, motion, observers) targets the `<img>`, never the picture. Header and footer row rules targeting direct children are extended to reach the image.

The layout box carries `{uid}`, block classes, the anchor, motion attributes, Order, Alignment, Width, Min width and Max width. The surface carries Height, Ratio, Min height, Max height, Border, Radius, Shadow, Padding and Background. Base CSS sets `box-sizing:border-box`.

`<a>` is `display:block`, takes no paint, and has a focus ring following the radius. Overlay and ring carry `pointer-events:none`. A link on a Decorative image is refused: the editor shows "A linked image needs alt text".

Caption width follows the media, not the space around it. When Width resolves to `auto`, the `<figure>` prints `display:table` and the `<figcaption>` prints `display:table-caption; caption-side:bottom`, Gutenberg's own pattern (`packages/block-library/src/image/style.scss`), so a long caption wraps to the media's width, with `overflow-wrap:anywhere` so one long word cannot overflow. PS-2 proves it in all three browsers, including inside a 200px parent, before WP-2 starts.

**Per-device kinds.** Each device resolves its own kind and file, and only the shown files download (tested in Chrome, Firefox and WebKit: `R-per-device-kind.md`, `QC-per-device-design.md`). Images for every device that shows one are one `<picture>`; a device that shows another kind or none gets a source with a 1-pixel GIF data URI (FR-49-8), so the `<img>` can be eager where it shows and costs nothing elsewhere. Video files for every device that shows video are one `<video>` with one `<source media>` per device and no catch-all source; when it autoplays, each query also requires `(prefers-reduced-motion: no-preference)`. A device or visitor that matches none downloads nothing, and the browser finds the file while parsing. Its cover image is not a printed `poster` attribute, which downloads on every device: it is a `<picture>` beside the video by the same blank-source rule. The shared device-video module sets the shown video's `poster` to that picture's `currentSrc` (already loaded, so nothing downloads twice), because Chrome paints an opaque panel for `<video controls>` with no frame over anything beneath it; until then, and with no script, the cover sits above the video with `pointer-events:none`. It shows before play, without script and under reduced motion (Slice gate, 2026-11-10). Every video slot needs a cover image. Embeds per device are `<iframe loading="lazy">` siblings; SVG is inline. A breakpoint rule from `SGS_Breakpoints`' fractional queries (`767.98px`, `1023.98px`) shows the right sibling at every width, browser zoom included. Adopted markup carries `sgs-media--renderer`, which the legacy `media-element.css` does not match. One shared view module replaces both `swapVideoSrc` copies: on a breakpoint change it reloads the video's source selection, pauses any video no longer shown and plays the one shown. A hidden eager `<img>`, a hidden autoplay video and a `poster` all download (tested), so none is printed for a device that does not show it. SVG element ids are prefixed per sibling so parts and animations reach the one showing.

### 7.2 Sizing

Each setting prints its own CSS property; the browser combines them. The base stylesheet sets `height:auto` on the media element first, because a printed `height` attribute otherwise acts as a fixed CSS height (proved in real Chrome, Firefox and WebKit, for img, video and inline svg (iframe: Width 100% only, per the embed rule): all 12 combinations of Ratio, Width, Height and limits, with Cover and Contain, resolve as this table says; WebKit video `object-fit` and `object-position` crop the same as img (PS-2)). Ratio, Width, Height, Min width, Max width, Min height and Max height can all be set, per device, in any combination. Three rules fill the gaps CSS leaves: this one, the helper's file ratio and Fill. The layout box and the media element are flex and grid items in many rows, where the browser's `min-width:auto` stops them shrinking below their natural size and overflows the row (proved in Chrome, Firefox and WebKit). The base stylesheet therefore sets `min-width:0` on the layout box and the media element; a Min width the user sets replaces it.

| What is set | Result |
|---|---|
| Nothing | The file's own size, `width:auto; max-width:100%`, so a 300px file draws at 300px and shrinks with its container |
| Ratio only, or Height only | Width defaults to 100% of the space; the height follows from the Ratio, or is as set |
| Ratio and Height | Width defaults to `auto`, so it follows from the two: 1:1 and 300px tall is 300 by 300. It never exceeds the space (`max-width:100%` stays), and a taller-than-wide Ratio crops |
| Ratio and Width | Height follows from the two |
| Ratio, Width and Height | Width and Height win. Ratio is kept, and its field says it is not in use |

The default width is resolved per device from the resolved values: `auto` when nothing sizing-related is set or when both Ratio and Height are, otherwise 100%. A Width the user sets always wins. A helper printed when nothing sizing-related resolves at a device also prints `width:fit-content`, so a small file keeps its own size and a large one stays within the space (PS-2: 108 of 108 browser cells). Width `auto` with a Height and no Ratio keeps the file's proportions. Width `auto` with a Max height narrows the box rather than cropping it, so any control that sets Width auto says so. Limits apply on top in every case: with Ratio 16:9 at 100% width and Max height 300px, the box stops at 300px and the picture crops into it. A narrower device cancels an inherited value with `auto` (Height, Width), `natural` (Ratio, printed as `aspect-ratio:auto`) or `none` (Max width and Max height print `none`; Min width and Min height print `0`, because `min-width:none` is not valid CSS).

Height has one extra choice, **Fill** (labelled "Match its space"), meaning the height the surrounding layout gives it. Ratio does not apply while Height is Fill.

An embed with nothing set is `width:100%; aspect-ratio:16/9`, printed as CSS on every embed. The renderer prints no `width` or `height` attribute on an iframe (an attribute acts as a CSS width). An embed never prints `width:auto` unless both Ratio and Height are set, because only Chrome transfers a ratio through an auto width on an iframe. An SVG with nothing set uses its viewBox.

A helper has no proportions of its own. When the helper is printed with a Height and no Ratio, the renderer prints the file's own ratio as `aspect-ratio` on the helper, per device, so the media keeps its proportions. Without this a helper at Height 300px draws 600 by 300 where the bare image draws 533 by 300 (measured in real Chrome in a 600px parent). Ratio with Height holds through `<figure>`, `<a>`, `<picture>` and the helper, 300 by 300 each.

Fill means the height the surrounding layout gives the media. The helper prints `height:auto; min-height:100%; flex:1 1 auto; align-self:stretch`, the media is absolutely positioned inside it, and a `::before` with `display:block; height:12rem` gives it a small height when nothing supplies one. A ratio floor cannot be used: `padding-top:66.667%` forces a row beside 200px of text to 400px (measured). When Width is set it is also printed as `max-width`, because `flex:1 1 auto` would ignore it. An explicit `height:100%` is never printed on the helper: on a flex item it switches off stretch (measured 367 against a 700 row). Fill takes the height of a definite parent, a stretched flex or grid row, an aspect-ratio parent, and a flex-column or grid parent with a min-height; with no height anywhere it is 12rem tall, and the editor says: "This layout gives the photo no height. Pick a Height instead." The floor is real: a stretched row whose other items are shorter than 12rem is raised to 12rem; a fixed-height row smaller than 12rem is not, because stretch wins. A percentage cannot see a min-height, so a content band whose height comes from a min-height, a Ratio or a stretched row MUST be `display:grid` (one column) or a flex column. A `<figure>` or `<a>` around a Fill helper gets `.sgs-fill-wrap` (`display:flex; flex-direction:column; flex:1 1 auto; align-self:stretch; min-height:100%; min-width:0`); an `<a>` inside such a figure prints `flex:1 1 auto; display:flex; flex-direction:column; min-height:0`, and the helper inside a wrapper prints `min-height:0`. Without them a caption overflows the row and a linked helper collapses (PS-2). Two static low-specificity rules in `media-base.css`, shared by the front end and editor, carry this: `:where(.sgs-container__inner:has(> .sgs-media-box--fill, > .sgs-fill-wrap)){display:grid;grid-template-columns:minmax(0,1fr)}` and the `.sgs-fill-wrap` rules. Min height on the surface is its floor. PS-2 proved it on 13 layouts and the figure and link wrappers in all three browsers. `height:stretch` and `-webkit-fill-available` are not used (Firefox and WebKit do not support them consistently).

The editor uses the same CSS.

### 7.3 When the helper is printed

The helper is printed if, at any device, on resolved values, any of these hold: Height is `fill`; `OverlayColour`, `OverlayGradient` or a hover form is set; Shape is a mask shape (not none, circle, ellipse or pill); the media part has hover scale above 1, Parallax, Ken Burns, a clip entrance or an effect that paints a layer (sheen, glare, ripple, curtain, surface treatment). A caption or link never causes it. Once printed, it is printed for all devices and takes box paint at all devices.

### 7.4 What paints where

| Setting | Without helper | With helper |
|---|---|---|
| Width, Min width, Max width, Alignment, Order | Layout box | Layout box |
| Height, Ratio, Min height, Max height | Media element | Helper |
| Border, Radius, Shadow, Padding, Background | Media element | Helper |
| Fit, Focal, Opacity, Blend, Filters | Media element | Media element |
| Overlay | n/a | Without a mask: helper `::after`. With a mask: `.sgs-media-box__mask::after` |

With the helper and no mask, it has `overflow:hidden; overflow:clip`, as core Cover does, so sticky children keep working. With a mask, the mask layer clips.

Spacing around a slot belongs to the parent's gap or Alignment. The cloner never writes a margin onto a slot.

### 7.5 Shapes

Registry: the existing `includes/data/icon-shapes.json`, read by PHP and JS already, gains `proportions`, `paint`, `ratio` and `surfaces` per entry: `{slug, label, d, proportions, paint, ratio, surfaces}`; mask entries keep today's `d` key (one closed path), and radius entries (circle, ellipse, pill) have none. `proportions` is `stretch` or `keep`. `surfaces` lists where a shape appears; `src/utils/icon-shapes.js` shows icons only those marked for icons, so new shapes do not reach the icon picker. `ratio` is the Ratio written when the shape is picked, as Circle does; an empty `ratio` writes none. `proportions` is the shape's default (`keep` for squircle, hexagon, diamond, octagon and star); Keep proportions is offered on every mask shape. `paint` is `radius` or `mask`. Media shapes: circle, ellipse, pill, squircle, arch, hexagon, diamond, octagon, star, tag, speech bubble, ticket and three blobs (today's file holds hexagon, diamond, octagon, star and blob). The `surfaces` filter and the icon readers' tests (`IconOutlineShapesTest`, `tests/js/icon-shapes-parity.test.js`) change in the same commit as the first added shape, or those tests fail. Shape dividers and the buybox sticker keep their own geometry.

A person looks in one grid and picks a shape; how it is drawn is hidden. Circle, ellipse and pill are drawn with `border-radius` on the surface, needing no helper and keeping ordinary borders and shadows. Picking Circle also sets Ratio 1:1 at that device, when no Ratio is set, as one undo step. Everything else is a mask.

Keep-proportions masks use `mask-size:contain` and an encoding without `preserveAspectRatio="none"`.

Mask structure: helper (shadow as `filter:drop-shadow`, through `helpers-shadow-filter.php`) > `.sgs-media-box__mask` (the mask, the media, overlay and zoom).

While a mask shape is on: Corners is omitted, and any stored radius kept and noted. Shadow's Spread, Inset and Raw CSS are omitted with "Shadows follow the shape". Padding sits on the helper. Border is omitted with a mask shape, with the note "Borders are not available on this shape. Choose Circle, Ellipse or Pill to keep a border." Circle, Ellipse and Pill keep ordinary borders. Shape is per device; `none` at a device clears it. Embeds cannot be shaped except by circle, ellipse and pill.

### 7.6 Sizes attribute

Derived, never typed, on every `<source>` and `<img>`, from the smaller of Width and Max width (`min()` when one is `vw` or a column width): a Width in `px` prints WordPress's own form, `(max-width: Wpx) 100vw, Wpx` (`media.php::wp_calculate_image_sizes`); `vw` as given; `rem` and `em` at 16px; anything else `100vw`. Lazy images are prefixed `auto, `, as `wp_img_tag_add_auto_sizes` does. An item in an item-set block divides by its column count when known. Cover-cropped images widen by the crop factor, through the existing `sgs_media_cover_crop_plan`. Attachment-backed images and each `<source>`'s `srcset` come from `wp_get_attachment_image` and `wp_get_attachment_image_srcset`, with the derived `sizes`, `loading`, `fetchpriority` and `decoding` passed in `$attr`; only external URLs and inline SVG are built by hand. A fixture runs `wp_filter_content_tags` over the markup to show the core filters leave it correct.

### 7.7 Loading and priority

Per slot, first match wins:

1. Inside a hidden surface (mega panel, drawer, modal, wishlist panel, cart): lazy; claims nothing.
2. A REST render, or a page the motion renderer has not armed: lazy, never high, whatever the Load priority (no page around the block).
3. Slot's Load priority is Load first: eager, lead candidate. Load later: lazy.
4. Above the fold: eager, at most `sgs_eager_image_limit` (16) images per page. Above the fold is Bean's rule (2026-11-09), shared with the motion rule: the page's first top-level content sections, template parts excluded, including every loop item in them. The count is the page's measured section count from the editor's fold scan on save (`plugins/sgs-blocks/includes/motion/class-sgs-fold-scan.php::section_count` (`Sgs_Fold_Scan`), post meta `_sgs_fold_sections`), falling back to two. The test is `plugins/sgs-blocks/includes/motion/class-sgs-motion-fold.php::is_above_fold` (`Sgs_Motion_Fold`), a pure function of the parsed block tree, called as `Sgs_Motion_Renderer::arm_first_section` calls it.
5. Otherwise lazy.

The resolver calls that function once per request. Sections are matched to the armed tree by identity, not by opening order, so blocks the theme renders outside the content tree (header, footer, drawer) never take a section (PS-5 found the header taking the first section on template pages; fixed in `e783fee50`). A slot with different images per device counts as one image, and eager and high apply only on the devices that show an image (§7.1). A block rendered with no page around it gets lazy and never high: the resolver reads `REST_REQUEST`, the renderer's armed state and `Sgs_Motion_Renderer::in_above_fold()`, and unarmed, REST or a position past the tree means lazy. SGS's own fragment caches are hidden surfaces (rule 1); another plugin's fragment cache replays what it stored, so it is outside this guarantee.

The lead is the first eager image that is not `logo`, `layer` or a brand strip. One per device takes `fetchpriority="high"`: a slot's photo and video cover both carry it, and each device resolves only the one it shows (the other is the blank source there), so a phone's visible cover is prioritised and no device fetches two; only if at least 50,000 square pixels (WordPress's `wp_min_priority_img_pixels` default). The renderer consumes a per-request claim, so two identical blocks sharing a scope hash cannot both take it. No preload links are printed; every lead is a real element the browser's preload scanner finds. Ken Burns on a lead image defaults off.

### 7.8 Backgrounds

```
<section class="…{uid}">
  <div class="sgs-bg-media">picture, video, svg or tile layer</div>
  <span class="sgs-bg-overlay"></span>
  content
</section>
```

`.sgs-bg-media` replaces today's `.sgs-container__image-bg` and root `::before` paths, keeping stacking of media, overlay, content and shape dividers. The element clips as §7.4's helper does. Spacing inside the section is padding: a first child's margin collapses through the section and lifts the background away from its top edge (PS-10). Tile: `background-image` on the element, with Repeat and TileSize. Pinned: the same CSS background with `background-attachment: fixed` (§10.3). Actual size: `object-fit:none`. Backgrounds default to Decorative, which a content photograph can switch off. A background has no alt requirement.

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
| Opacity, Colour | CSS | CSS | Not offered | CSS |
| Blend | `mix-blend-mode` | `mix-blend-mode` | Not offered | Not offered |
| Overlay | Helper layer | Helper layer, `pointer-events:none` | Helper layer, `pointer-events:none` | Helper layer |
| Mask shapes | Yes | Yes | No | Yes |
| Hover zoom, Parallax | Transform | Transform | Not offered | Transform |
| Ken Burns | Transform | Not offered | Not offered | Not offered |
| Loading | Priority, per §7.7 | The cover `<picture>` is the candidate; `<source media>` per §7.1 | `loading="lazy"` | Not applicable |
| Alt | `alt` | `aria-label` | `title`; warns when empty | `role="img"`, `aria-label` |
| Playback | n/a | Element attributes, optional pause button | URL parameters (autoplay, mute, loop, controls, start) | n/a |
| Per-device files and kinds | `<source media>`, blank source where another kind shows | `<source media>` in one `<video>`, no catch-all | Lazy sibling | Inline sibling |

## 8. Data model

Names are `{prefix}{Base}`. R = responsive value.

| Base | Type | Valid | Default | CSS | Paint node | Emitter | Hover form |
|---|---|---|---|---|---|---|---|
| `Source` | R object | `{kind,id,url,width,height,mime,alt,poster:{id,url,width,height},captions:{id,label,lang},markup}`; `kind` is one of the slot's allowed kinds; `alt` only when the file differs from the device it would inherit; `featured` uses the post's featured image | empty | none | n/a | none | |
| `Alt` | string | the slot's alt; a device's `Source.alt` overrides it | `""` | none | n/a | none | |
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
| `Colour`, `Greyscale` | R string, number | `natural`, `greyscale`, `white`; strength 0 to 100 with greyscale | `natural`, 100 | `filter` | media | filter | |
| `Repeat` | R string | `repeat`, `repeat-x`, `repeat-y`, `no-repeat` | `no-repeat` | `background-repeat` | media | plain | |
| `Pinned` | boolean | background image slots only; not with Parallax | false | `background-attachment` | media | plain | |
| `TileSize` | R string | length, `auto` | `auto` | `background-size` | media | plain | |
| `Loading` | string | `auto`, `first`, `later` | `auto` | none | n/a | none | |
| `Playback` | object | `{autoplay,muted,inline,loop,controls,lazy,start,pause}`; `pause` shows a pause button on autoplaying video, off by default; an autoplaying embed prints without autoplay and the view module starts it unless the visitor prefers reduced motion | per kind | none | n/a | none | |

Colour prints one `filter`: `grayscale(N%)` or `brightness(0) invert(1)`. Hover rules sit inside `@media (hover:hover)` with a 200ms transition, removed under reduced motion. Overlay hover is a second colour in the overlay's control, which is all a darker-to-lighter hover needs. All other hover behaviour (zoom, brighten, grey-to-colour) is the Hover panel's.

Device or global: every setting marked R is per device through `ResponsiveOverride`; every other setting applies to all devices and says so off Desktop.

Defaults: Fit is applied only where the box crops. An unset Focal displays as "Centre (default)" and writes nothing. Playback: block video controls on, autoplay off, loop off, inline on, lazy on; background video autoplay, muted, loop, inline on, controls off, on every device that shows video, with its cover image while loading and under reduced motion.

`sgs/media` also has `caption`, `captionTag`, link fields, the `caption*` typography and colour family and the player's `videoTime*`. SVG slots add `SvgLayer` ("Layer order": Behind content, In front of content) and `SvgTextShadow`; a background SVG also keeps `SvgParts` and `SvgPartsTrigger` (named-part animation).

Source: embed per FR-49-17. `svg` is pasted or uploaded markup, printed inline; an `.svg` chosen as a photo is an `<img>`. `featured` uses the post's featured image, on card, product and post slots.

### 8.1 DB and gates

The paint node is a field in each atom's registry entry, read by its twin; no new DB column. `css_element` carries the node names (`media`, `surface`, `layout`, `overlay`, `mask`) so the resolver can route. The generator writes an entry in `attr-classification-overrides.json` for every attribute it generates, merging into any existing entry for that key. An entry carries only `role` and `tier_shape` until the emitters switch over: an entry naming a property or layer contradicts what the seeder derives and fails the consistency suite (WP-1). Stage B's generator adds `css_property` and `css_element` when the emitters switch to real properties, and responsive attributes are `object` with `tier_shape: tier_object` from Stage A (the seeder already stores it for object attributes, PS-1); without them the seeder stores NULL properties and guesses shapes (PS-1). PS-1 proves this, plus the resolver, `check_value_identity`, the inline-styling gates, and `check-wiring-fingerprint`.

### 8.2 Removed

Attributes: per-block maps in §13. Code, each with a grep in AC-5:

`sgs_render_media`, `sgs_responsive_image`, `sgs_image_loading_attrs`, `sgs_next_background_image_index`, `sgs_content_image_claims_priority`, `preload_hero_image` (theme `functions.php` and `inc/font-preloading.php`), the atoms `media-type` and `intrinsic` (folded into `source`), box-shape's clip-path presets, the media atoms' Lottie code (the `lottie` entry in the registry's `types`, the Lottie branches of `source.control.js`, `video-behaviour.control.js` and `helpers-tier-media.php`, `src/components/media/controls/LottieControls.js`, and `includes/lottie-render.php::sgs_render_lottie`, whose file stays for the Lottie effect's `sgs_lottie_layer_add_source`), `includes/media-element-attrs-register.php` and `media-element-attributes.generated.php` (attributes are committed instead), `assets/css/media-element.css`, `assets/css/media-atoms/*.css`, `scripts/generate-media-stylesheet.mjs`, `helpers-media-position.php`, `includes/image-controls.php`; JS `src/components/media/canvasStyle.js`, the four `*PanelLayout.js`, `src/blocks/media/components/MediaStylingPanel.js`, `src/components/MediaSizingPanel.js`, `src/components/FocalPositionField.js`, `src/components/MediaPicker.js`, `src/blocks/extensions/image-controls.js`, `src/components/media/controls/MediaBoxShapeControls.js`, `ObjectFitField.js`, `src/utils/objectPosition.js`, both `swapVideoSrc` copies (`src/blocks/hero/view.js`, `src/blocks/container/view.js`); script `surveys/check-image-controls-support.py`; their `gates.json` and `package.json` entries; the flag `supports.sgs.imageControls`; the `img[data-sgs-mc~="background-position"]` overscan rule. The atom gates stay and are extended.

Before anything is deleted, `sgs_hidden_render_*` and `sgs_allowed_svg_tags` move to a file that stays. Other gates, inspector rules 37 to 40, `wf_media.py`, `check-dead-controls.js` and the tests naming removed code are dispositioned by WP-15a's list (`plugins/sgs-blocks/scripts/data/gate-disposition.json`, kept complete by `check-gate-disposition.py --check` in the fast tier).

### 8.3 Slot declaration

`supports.sgs.mediaElements`, which 20 blocks already declare, is the slot declaration: each entry names a prefix, its atoms and its `context` (an adopted entry omits `atoms`: the generator and the panels then use every adopted atom, `ADOPTED_ATOM_IDS`, and the Stage B adoption script deletes `atoms` from each adopted entry; a slot whose §10.4 Settings column is narrower than the adopted atoms keeps a narrowed `atoms` list, so its block's own settings that §10.4 keeps do not clash with generated ones: `measured-diagram` `drawing` and `brand-strip` `logo` today, recorded per slot in `plugins/sgs-blocks/scripts/data/media-adoption.json`) (all 25 entries declare one today), and gains `kinds` (the allowed kinds; the kind choice shows only when there are two or more). `kinds` is also the adoption marker: the generator writes attributes and override entries only for an entry that declares it, so nothing is written to a block until Stage B adopts it (WP-1). The generator refuses unknown names. A block with no entry has no media controls.

Item-set blocks declare block-level settings with the item prefix (Ratio, Fit, Radius, Shape, Loading, hover zoom) as ordinary attributes, and per-item values inside each item object under `source`, `alt`, `decorative`, `fit`, `focal`, using §8's value shapes. Items inherit the block-level Fit. `tier_shape` is `slot-array`, written by the generator's override entry (PS-1: the seeder and gates accept it with no reference-table row). The seeder makes no rows for per-item fields; WP-1 adds them if the cloner or the wiring gate needs them. Per-item CSS uses scope `{uid}-i{index}`.

## 9. Editor

### 9.1 Global

Labels print once. Each panel is a collapsible `PanelBody`; Media and Size and crop open by default. Every panel has Reset in a menu on its first row (`PanelBody` has no header slot). Multi-write actions (Circle, Replace, Reset) are one undo step.

### 9.2 Shared components (new ones in `src/components/media/`; reworked ones stay in `src/components/`)

- **`ResponsiveOverride` (reworked):** the only per-device wrapper for media. Off desktop, an inherited field shows the inherited value as a grey placeholder inside the field, with "Mobile: using Tablet" naming the true source, or "Mobile: default". Dots mark Tablet and Mobile when they hold their own value, and a closed panel shows one when anything inside does. The dot is a shape with an accessible name. Reset names the true source ("Reset to Tablet" or "Reset to Desktop") off desktop, "Reset to default" on desktop. A panel's Reset off desktop reads "Reset Mobile in this panel" and affects only that device. Settings not marked R in §8 show "Applies to all devices" when not on Desktop. The device name is part of each accessible label. `lint-responsive-controls.py` is updated in the same commit. About 120 files import the component, and `ResponsiveControl`, `ResponsiveBoxControl` and `ResponsiveLengthControl` are its siblings: the rework changes only its display and is checked on a sample of non-media blocks.
- **`MediaSlotField`:** per device through `ResponsiveOverride`: a kind choice limited to the slot's allowed kinds (hidden when it allows one), Media Library first, preview, Replace, Remove, the inherited media off Desktop ("Mobile: using Desktop's video"), and for video a required Cover image. On Replace, Focal resets to centre unless "Keep focal point" is ticked, and if Alt is non-empty the panel says "Alt text still describes the previous photo. Update it." with focus on Alt. A device with its own file shows its own Alt field, empty meaning it uses the wider device's alt, with "This file differs from Desktop's. Describe it." Empty Alt on first pick copies the library alt. Video preview has pause. Alt is a multi-line box with one help line: "Describe the photo for someone who cannot see it." Decorative is a checkbox beside it that hides it.
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
| Captions file | V | Per device inside the Source |
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
| Photo opacity, Colour (Natural, Black and white, White) | I V S | Strength with Black and white |
| Blend | I V | |
| Typography: Caption and colour | I V | Caption exists |
| Typography: Video time | V | Player showing |
| SVG panel | S | |
| Repeat, Tile size | B, I | Fit is Tile |
| Pinned ("Keep the photo still while the page scrolls") | B, I | No Parallax on the background |

Backgrounds show Media (per device, with its kind), Decorative and Alt, Fit, Focal, Tile options, Pinned, Overlay, Opacity, Loading, for video Cover image and Pause button, and the motion line, and never Size, Width, Alignment, Order, Border, Radius, Shadow, Padding, Mask, Caption or Link.

### 9.4 Panels

`sgs/media`, Settings: **Media** (kind and source, Poster, Alt or Title, Decorative, Load priority); **Caption and link**; **Video** (Playback, Captions).

Styles: **Size and crop** (Aspect ratio, Width, Height, Smallest and largest size, How it fills, Focal); **Position in the layout** (Alignment, Order in the row); **Border and shape** (Shape, Corners, Border, Padding, Background colour); **Shadow**; **Overlay and filters** (Overlay colour and gradient, Overlay strength, Overlay blend, Photo opacity, Photo blend, Colour); **Typography**; **SVG**; **Hover**; **Entrance and reveal**; **Effects**.

Caption colour sits in Typography as a declared `colourExemption`. Caption typography offers size, family, weight, style, line height, letter spacing, transform, alignment. Video time offers size, family, weight.

Background panel: Media (per device, with its kind), Decorative and Alt, How it fills, Focal, Tile options, Pinned, Overlay, Photo opacity, Load priority, for video Cover image and Pause button, motion line. Surface tone, blur, saturate and opacity stay in their own Surface panel, owned by the wrapper. On the toolbar: Replace and Alignment. Hover panel subtitle: "Overlay, border and shadow changes on hover are set in their own panels."

Each motion panel carries a one-line subtitle, and Hover says "Hover has no effect on touch screens" on Tablet and Mobile.

Catalogue of ranges: Width, Min width, Max width: `px`, `%`, `rem`, `em`, `vw`, `ch`, 0 to 5000. Heights: `px`, `%`, `rem`, `em`, `vh`, `svh`, `dvh`, `vw`. Radius: `px`, `%`, `rem`, `em`, 0 to 9999. Padding: `px`, `rem`, `em`, `%`. Opacity, strength, greyscale: percent, step 1. Parallax strength: chips Gentle (0.1), Medium (0.2), Strong (0.4), and a custom -1 to 1 in Fine-tune. All in the atom registry.

### 9.5 States

Empty: four buttons (Photo, Video file, YouTube or Vimeo link, SVG). Deleted file: red "Image missing" with Replace; the page prints nothing, no broken icon, no shift. Missing alt on a non-decorative image: an inline warning, never a block. Unsupported embed: "This address is not a supported video". Hidden via a Hide toggle or `none`: an editor-only dashed bar naming where it shows.

### 9.6 Motion line

Bottom of the Background panel: "Background motion: Parallax, gentle [Change]" or "Background motion: none [Choose motion]", first two effects then "+N". The button dispatches `open({clientId, panel:'effects', target:'background'})` with an incrementing `requestId` to the new `inspector-focus` store (WP-10a). Effects, now controlled, opens, selects the target, scrolls to itself and moves focus to its heading, announced in a live region. Choose motion creates nothing.

### 9.7 Parity

The editor uses the emitter's CSS. Video shows its cover image or a live element; an embed shows its iframe with pointer events off.

## 10. Effects

### 10.1 Targets and what each kind offers

Parts in `supports.sgs.elements`. `media` on `sgs/media` loses `isWrapper`; the manifest gate is updated with it. Backgrounds: `background` (selector `.sgs-bg-media`), `background-video` (declared), `svg-bg` (name kept). A part carries `availableWhen: {slot, kinds}`, which the target picker evaluates. `absentIn` remains QA-only.

Media uses the motion system's existing libraries, each with Fine-tune (Spec 38A), filtered only by what the element can carry:

| Panel | What media gets |
|---|---|
| Hover | The whole library (31 presets today): lift, scale, rotate, translate, image zoom, grey to colour, magnet, follow pointer, border accent, each at three intensities, plus Fine-tune values such as brightness and blur |
| Entrance and reveal | The whole library (80 presets today): fades, slides, scale, rotate, blur and bounce entrances, reveals, keyframe entrances, at three intensities, plus Fine-tune including the clip reveal. Split reveal, scramble and nav-panel items need text, so they are not listed on media; draw needs SVG |
| Effects | Every registered effect whose `fx_effects.scope` and `requires` the part satisfies, evaluated per device against the kind shown there. By today's registry that offers media parallax, Ken Burns (images), ambient float, scrub, scroll progress, follow pointer, sheen, glare, ripple, curtain, morph and motion path; SVG loop and draw on SVG; surface-treatment (WebGL) on images; backgrounds add their surface effects. Each stays marked unproven until its fixture passes (§10.5) |

The filter is the registry's own (`motion_presets.target_level`, `fx_effects.requires` and `scope`), extended so Ken Burns and parallax accept the media part and the background part; no media-only list is kept. Effects that paint a layer (sheen, glare, ripple, curtain) print the helper (§7.3). A slot whose kind differs per device runs each effect only on the devices whose kind it supports: the emitter scopes the effect's CSS in a media query and writes the device list its runtime reads, and the panel names the devices ("Desktop and tablet; the phone shows a photo"). Switching the editor's device preview updates the list. A transform that runs once on load or scroll is an entrance; Ken Burns is a continuous drift.

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

### 10.3 Pinned background

Pinned keeps today's Fixed attachment, modelled on core Cover's `.has-parallax`: the image paints as a CSS background on `.sgs-bg-media` with `background-attachment: fixed`, reset to `scroll` on iOS and under reduced motion. It works today on desktop: the photo holds within 3px of the screen across a scroll at 1440 and 375 (T12, `T12-effects-run-A.md`). Parallax at strength 1 does not replace it: the photo exists only inside its own box, so while the section enters or leaves, up to 11% of the viewport shows no photo in about half the frames (same report). Today a background colour on the container hides a fixed photo, because the photo paints on `::before` at `z-index:-1`; §7.8's real element ends that, and PS-10 proved it in Chrome and desktop WebKit at 1440 and 375: the photo holds still with no gap, a background colour no longer hides it, `overflow:clip` does not break it, and reduced motion scrolls it. The iOS reset is Cover's `@supports (-webkit-touch-callout: inherit)` rule, copied, and untested on a device. A transform on the section or an ancestor (an entrance, a hover lift) stops a fixed background holding, so Pinned is not offered with a transform-based entrance or hover on the same block. Pinned applies to image backgrounds only, and Parallax and Pinned are not offered together.

### 10.4 Elements

| Element | Prefix | Context | Kinds | Settings | Specialised |
|---|---|---|---|---|---|
| `sgs/media` | `media` | content | all | all | Caption, Link |
| Container, trust bar, site header, site footer, multi-button, physics canvas, nav drawer | `background` | background | I V S | Source, Fit, Focal, Repeat, TileSize, Pinned, Overlay, Opacity, Loading | Tile, Surface panel where declared |
| Hero background | `background` | background | I V S | same | SVG parts |
| Hero split | `split` | content | I V S | all but Caption | Column placement |
| Decorative image | `layer` | element | I S | Source, Fit, Focal, Width, Max width, Height, Ratio, Opacity, Shape, Blend, Radius, Border, Shadow | Position, rotation, anchor, flip, fade on scroll |
| Gallery | `item` | item | I V | Source, Fit, Focal, Ratio, Radius, Shape (block level), Loading | Grid, masonry, scroll and carousel layouts, caption reveal, lightbox, drag reorder, tile min height, item link |
| Card grid, post grid | `image` | item | I, featured | Source, Fit, Focal, Ratio, Height, Radius, Shape, Loading | Grid, image fallback |
| Product card, buybox | `image`, `thumb`, `logo` (product card); `main`, `thumb`, `preview` (buybox) | item | I, featured | Source, Fit, Focal, Ratio, Height, Radius, Border, Shadow, Loading; `logo` Source, Width | Colour swap, thumbnails, configurator preview |
| Team member, testimonial | `photo` | content | I | Source, Fit, Focal, Radius, Shape | Layout |
| Testimonial logo, work | `logo`, `work` | content | I | Source, Fit; `work` also Focal | |
| Before-after | `before`, `after` | content | I V S | Source, Fit, Focal, Height, Width, Radius | Divider |
| Timeline | `entry` | content | I V | Source, Fit, Focal, Ratio, Width, Height, Radius | |
| Responsive logo, nav drawer logo, choice-flow header logo | `logo`; `chromeLogo` (nav drawer); `headerLogo` (choice flow) | content | I S | Source, Width, Loading, Colour | Light and dark source, SVG parts, the logo's own switch width |
| Choice-flow option, form tiles, option picker swatch | `option`, `tile`, `swatch` | item | I | Source, Fit, Width, Shape; option also Focal | The flow's own fit setting |
| Trust-bar badge, brand strip | `badge`, `logo` | item | I | Source, Fit, Radius, Shape, Colour | Marquee |
| Image sequence | `thumbnail` | content | I | Source, Fit, Ratio | Frame sets |
| Measured diagram | `drawing` | content | I S | Source only: a crop would break the measurements | Measurement overlay |

Not media settings: `sgs/business-info`'s map, `sgs/audio`, pure icon pickers (`iconSvg`), and the fixed artwork in `sgs/google-rating-badge`, `sgs/star-rating` and `sgs/trustpilot-reviews`. Gates allow-list them. Small fixed thumbnails keep their own attributes and are not slots: cart, wishlist panel, product search, store selector flags, nav drawer menu items, mega panel cards and Google review avatars. Their `SGS_Media_Element::style` calls become `sgs_emit_responsive_css`, so §8.2 still deletes everything in the one release; `sgs/cart` and `sgs/wishlist-panel` keep their JS-built `<img>`.

### 10.5 Target against what exists

Status from running each effect in real Chrome, with WebKit where stated (`T10-effects-run.md`, and `T12-effects-run-A.md` and `-B.md` for the 28 T10 could not run). Target from product docs and the three drafts (`T7`, `T8`). Status is one of: built and good; built, needs rework; missing.

| Effect | Status | Decision |
|---|---|---|
| Hover library (31 presets) and Entrance library (80 presets), with Fine-tune | Built and good on `sgs/media` | Offer whole, filtered by what the element can carry |
| Image hover zoom, grey to colour, indent, width, ring, accent | Built and good (T12); zoom has three private copies (gallery, card grid, post grid) and grey to colour four systems | One route each; delete the copies |
| Parallax | Built and good; its lag was the header's, fixed | Native driver in Stage C (§10.2) |
| Ken Burns | Built and good; not reachable from `sgs/media` | Add to images |
| Float, SVG loop, draw | Built and good | Offer per §10.1 |
| `sgs/media` SVG presentation animation | Built, needs rework: the SVG wrapper lacks the `sgs-media-el` marker, so the composed animation never applies (T12, cause proven) | Replaced by Effects' SVG loop (§6.2); migration maps it |
| Surface treatment (WebGL) | Built, needs rework: works on wrapper hosts; on `sgs/decorative-image` the effect looks for an `<img>` inside its host, which is the `<img>` itself (`plugins/sgs-blocks/src/shared/effects/fx-surface-treatment.js::initTreatment`) | Fix the host lookup now (not replaced by this spec); then offer on images (§10.1) |
| Particles, grid dots, generative background on backgrounds | Built, needs rework: on container image and SVG backgrounds their CSS overrides the host's absolute position and the canvas lands inside the `<img>`; generative background reads only the block's first tag | Hosted on the background part (§7.8) in WP-8 and WP-10b, with fixtures |
| Pinned background | Built and good on desktop as Attachment Fixed; a background colour hides it; iOS ignores fixed attachment | Pinned, first release (§10.3) |
| Background video | Built; video player chrome works (T12); no background-video fixture | Keep; AC-4 and AC-7 cover it |
| Image sequence | Built and good (T12) | Keep on its block |
| Scrub, pin, horizontal panels, scroll transforms | Built and good | Keep on their blocks; scroll transforms reach media through scrub (§10.1) |
| Carousel loop, draggable, page transitions, counter, countdown, timeline progress, review and testimonial sliders, post grid loading, header behaviours, nav indicator, label magnet, anchor smooth scroll | Built and good (T12) | Keep on their blocks |
| Flip | Built, needs rework: no slide in 4 of 5 runs, cause unproven (T12) | Motion track (Spec 38A) |
| Curtain | Built, needs rework: does not play when it is the drawer's only motion (`plugins/sgs-blocks/src/blocks/nav-drawer/drawer-motion-state.js::hasOpenMotion`) | Motion track (Spec 38A) |
| Before-after divider | Built, needs rework: the vertical divider runs inverted (T12) | Fixed in Wave 4 with the block's adoption |
| Audio visualisers | Built, needs rework: spectrum and oscilloscope are blank at rest | Not media (§10.4); motion track |
| Marquee | Built; hover slowdown and a 375 title position fail | Motion track |
| Follow pointer, magnet, sheen, glare, ripple, cursor field | Built; ripple and cursor field partly work | Offered on media where the registry filter passes (§10.1); fix ripple and cursor field in the motion track |
| 3D tilt | Missing; no draft uses it | Not added; Hover's rotate covers flat tilts |
| Click effects | Missing; no draft uses them | Not added |
| Click-to-play cover on an embed | Missing; no draft uses it | Not added: embeds stay lazy iframes |

## 11. Cloner and agent contract

Schema: `schemas/media-slot.schema.json`, refusing unknown keys and shapes. `wp-build-page` reads it. Tiers are written only where a device differs from what it would inherit. Rows match top to bottom; first match wins; an absorbed wrapper is matched on its merged box.

| Draft pattern | Target |
|---|---|
| Image, video or iframe with `position:absolute` and `inset:0` (or full width and height) behind sibling content | The parent's Background slot |
| Frame height set by a parent, or `height:100%` of a definite parent | Height Fill |
| `height:100%` of an indefinite parent | No Height; `<image-slot>` writes Match its space |
| `aspect-ratio`, `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height` | The setting of the same name, as declared. A height on a box that keeps the file's ratio at every width writes Height with Width `auto` |
| Computed `object-fit` where the box crops, including `fill` | Fit; no crop writes neither Fit nor Focal |
| `object-position` as percentages, keywords, or keywords with offsets (`left 20% top`) | Focal, converted to `{x,y}` (a px offset uses the rendered image size); unparseable is reported |
| `border-radius` of 50% on all corners | Shape Circle if square, else Ellipse |
| Fully rounded ends | Shape Pill |
| Any other `border-radius` | Corners |
| `clip-path`: `circle(50%)`, `ellipse(50% 50%)` | Shape Circle or Ellipse |
| `clip-path`: `inset(… round R)` | Corners R |
| `clip-path`: polygon within 1% of a registry shape | That Shape; else Custom CSS, reported |
| Border, shadow, padding, opacity, order | As named |
| `filter: grayscale()`; `brightness(0) invert(1)` | Colour Black and white with its strength; Colour White; other filters Custom CSS, reported |
| `mix-blend-mode` | Blend |
| `margin-inline:auto` | Alignment centre |
| Absolutely positioned decoration with offsets, not behind sibling content, no text | `sgs/decorative-image` layer: position, rotation and anchor from its offsets |
| Other margin | Not written |
| Overlay child | Overlay |
| `:hover` scale on image or wrapper | Hover Zoom on the media part |
| A transform that runs once on load or scroll | Entrance Scale, with its from, to, duration, delay and easing |
| Google Maps `<iframe>` | `sgs/business-info` map; `grayscale()` to its map filter; other filters Custom CSS, reported |
| Cursor-following `clip-path: circle()` over a second layer | Container Effects, Cursor field, image reveal |
| A different file or kind visible at 375, 768 and 1440 (`display:none` siblings, `<picture>`, `<video>` with `<source media>`) | Per-device Source, with the kind per device |
| `<image-slot>` no shape | Corners 12px; with shape rect: none; rounded: Corners; circle, pill: that Shape |
| `<picture>` | Per-device Source |
| `<figure><figcaption>`, `<a>`, `<iframe>`, `<svg>`, `<video>` | Caption, Link, embed, svg, Playback |
| `url()` `background-image` with children | Background slot; size cover or contain to Fit, auto with repeat to Tile, position to Focal; attachment fixed to Pinned |
| `url()` `background-image`, no children | `sgs/media` |
| Gradient `background-image` | The block's own background gradient setting |
| `clip-path` on a text element | Custom CSS, reported |

WP-13 adds Fill's new image route as new files and switches over in Stage B. The route picks the slot by `supports.sgs.mediaElements` prefix and context, merges per device, reads at 375, 768 and 1440 and classifies the visible element at each (img, video, iframe, svg) to write the kind per device, writes width, height and mime (FR-49-16), and writes Decorative for `alt=""`. It replaces `fill-media.mjs::imageSlots` (which finds images only by the old `Url`, `Id`, `Alt` names), `scalar-media-roles.json` and its detector, `apply-svg-file.mjs`, `calibrate-instances.mjs`, and the `property_equivalents` row that turns an image's height into max-height.

**Absorption:** an element is merged into the media when it has exactly one image, video or picture child, plus at most one absolutely-positioned overlay with no text or one figcaption; it has no text of its own; and its overflow is hidden or clip, or it declares ratio, radius, border, shadow or background colour the image does not repeat. Controls, positive: radius only, ratio only, overflow only, overlay, figcaption, background colour. Negative: text, two images, badge.

## 12. Acceptance tests

Editor on a local mirror; front end in real Chrome at 375, 768 and 1440, Firefox and WebKit where stated.

- **AC-1** After `sgs-update`, every setting has a DB row with its property, `tier_object` and paint node in `css_element`; the drift gate fails on an edited block.json (negative control).
- **AC-2** Detector over `block.json`s: no flat media tiers, one Focal shape, Alt only at slot level or inside a device's Source.
- **AC-3** Fixture of Ratio, Width, Height and each limit in combination, per device, matches §7.2 in editor and front end, including ratio with a height, a width, or a maximum, inside `<figure>`, `<a>`, `<picture>` and the helper; a caption wraps to the media; all three browsers (Chrome, Firefox and WebKit), including WebKit video `object-fit` and `object-position`, which the research run could not test.
- **AC-4** Per-device kinds (photo and video, video and photo, photo and SVG, video and none, embed and photo) at 375, 768 and 1440 in Chrome, Firefox and WebKit: only the shown device's files download, cover images included; under reduced motion no autoplay video downloads; with JavaScript off the cover or photo shows; a resize across a breakpoint plays the newly shown video and pauses the hidden one. Three-source picture: one image request per width. `none` and a Hide toggle: none. `wp_filter_content_tags` leaves the markup correct.
- **AC-5** Each §8.2 name greps empty.
- **AC-6** Helper present for each trigger, including at one device only and hover colour only; absent for caption only, link only, both, or none. Circle with shadow and overlay is a true circle on image and embed; with hover zoom on an image. Focus rings not clipped.
- **AC-7** Every background state prints `.sgs-bg-media`; parallax moves it; with a divider and overlay, stacking holds at three widths.
- **AC-8** Shared fixture of breakouts, run through PHP and JS, neutralised; SVG script and handlers removed on the front end; a non-allowlisted embed refused; every emitter output validates.
- **AC-9** No per-block style tags; two identical blocks make one rule; scope class stable across two loads; CSS order per §6.2.
- **AC-10** On home, shop, product, post and contact at 375x667 and 1440x900: every image in the sections `is_above_fold` names (the measured count, else two) is eager, up to 16; the first eligible one is high, one per page; everything else is lazy; none eager from hidden surfaces; REST or cached fragments are never high; a per-device slot is eager only where it shows an image; shop and product pages are checked on the template-armed path. The lead image's resized copies are AVIF or WebP (FR-49-42). Page load speed is owned by the page-weight plan (`.claude/plans/2026-11-03-page-weight-budget.md`), not this spec.
- **AC-11** Firefox and WebKit reserve the same space as Chrome; no typed `attr()`.
- **AC-12** Panels, order and labels per kind match §9.4 (DOM check).
- **AC-13** Each rule-table row visible and omitted at each device; no empty panel; no duplicate labels.
- **AC-14** On Tablet a change writes only tablet; Mobile says "using Tablet"; dots and Reset work; undo restores in one step; a field another setting overrules says why; global controls say so; a sample of non-media `ResponsiveOverride` users behaves as before; dragging the editor canvas through 375, 767, 768, 1023 and 1024 shows the matching device in the panel.
- **AC-15** Inherited tier's picker shows the inherited point on the inherited image.
- **AC-16** A 12-slot matrix (Height, Ratio, Width, Fit, kind, hover, gradient, shadow) is equal within 1px across editor and front end at three widths; no `style` attribute on any media element in the editor.
- **AC-17** Each §9.5 state shows its message; the deleted file prints nothing.
- **AC-18** Gate fails on a hand-rolled picker and on a second focal shape (negative controls).
- **AC-19** Effects listed per §10.1's filter, per device by resolved kind; switching the editor's device updates the list; an effect does not run on a device whose kind it does not fit, and the panel names the devices.
- **AC-20** Parallax per §10.2, no gap, measured, including a block at 3000px and a shrunken mobile toolbar. Pinned per §10.3, with a background colour set, in Chrome and WebKit, and scrolling normally under reduced motion; the panel refuses Pinned beside a transform-based entrance on the same block.
- **AC-21** The motion line opens Effects targeted at Background, repeatedly, and moves focus.
- **AC-22** No old media shape attribute or clip-path preset; `sgs/icon` shape unaffected; Circle sits in the Shape grid.
- **AC-23** Each mask shape on a photo with shadow, under 2% pixel difference at a 4-level tolerance, all three browsers; per-device mask.
- **AC-24** Fixture per §11 row, including a draft with a video on desktop and a photo on mobile; absorption controls; schema refuses unknown shapes; `wp-build-page` accepts slots.
- **AC-25** Detector survey zero old attributes on every site, pattern and tree; computed width, height and object-fit within 1px before and after except the listed allowed changes (hero images whose Size and Position are inert today are expected to change); the Integrator checks all five sites for regressions and inconsistencies (computed styles and captures at 375, 768 and 1440, before and after); Bean checks by eye only the two sites being readied to go live, `eye-care-test` (darkcyan) and `indus-test` (lavender-dinosaur) (Bean 2026-11-10, FP-13).
- **AC-26** One full fixture per context (content, background, item, layer), a render and settings-list smoke check per block, and the Eye Care hero parallax and focal point on settings alone.
- **AC-27** Fill in a bare parent, fixed parent, stretched flex item, grid cell, min-height section (grid or flex-column content band) and ratio container; never 0, and a row beside shorter text is not forced taller; in Chrome, Firefox and WebKit.
- **AC-28** Keyboard only: the walkthroughs touching `Chips`, `FocalField`, `ShapeField` and the motion line complete; axe finds no serious issue in any panel; 44px targets; visible focus.
- **AC-29** Each walkthrough completes: replace a photo; circle; different mobile crop; arch with shadow; fill in a card; overlay lightening on hover; video with a cover image; embed with radius; phone-only image; hero parallax from Background; hover zoom; working on Mobile; Reset.
- **AC-30** Colour: Black and white and White match today's `sgsColourTreatment` output on a migrated logo; the cloner maps `grayscale()` and `brightness(0) invert(1)`.
- **AC-31** A fixture of `sizes` strings passes per §7.6's rules.
- **AC-32** A photo uploaded through the WordPress 7.1 editor renders with more than one `srcset` source and stored `width`, `height` and `mime` that match.

Stage C adds a smoothness test for the native driver: judged from painted frames with CPU slowed 4x, worst of 5 runs, at 375 and 1440, with `Input.synthesizeScrollGesture`; at ratio 0.18, p95 error at most 4 px and maximum at most 6 px; the effect switched off must read at most 1.1 px or the run is void. Frame rate and `requestAnimationFrame` sampling are not evidence.

## 13. Migration

Tool: `plugins/sgs-blocks/scripts/migrate-media-system/` (survey, fix, check, self-test with a negative control). It refuses any attribute with no mapping, and the survey output is committed. It recurses into parent blocks as well as their inner blocks, pins the old default wherever the new default differs, and is idempotent per post. Targets: saved content in all five sites, `theme/sgs-theme/patterns/`, `sites/*/build/` trees and skeletons, motion fixtures including the canary's ten QA pages, and computed-route calibration fixtures.

| Old | New |
|---|---|
| `mediaType`, `videoSource`, `imageId/Url`, `videoUrl/Id`, `svgContent`, tiers | `{prefix}Source` (`source` on `sgs/media`, whose slot has no prefix; `alt`, `decorative` and `fit` likewise) |
| Saved Lottie media (one block: the `qa-lottie` test page, 4087, on sandybrown) | Reported and resolved by hand |
| `thumbnailId` and tiers | `Source.poster` |
| `imageAlt`, per-tier alts | `mediaAlt`; a per-tier alt that differs moves into that device's Source |
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
| `backgroundAttachment: fixed` | Pinned |
| Parallax `background:true` | Layer on the background part |
| Motion layers on old parts | New part names |
| `splitMedia*` | `split*` |
| Hero `splitMediaType*`, `splitImage*`, `splitVideo*`, `splitSvg*`, their tiers and per-tier alts | `splitSource`, kind and file per device; a Lottie tier is reported |
| Base `SvgPosition` (layer order) | `SvgLayer`: `background` becomes `behind`, `foreground` becomes `front` |
| Bases `LottieId`, `LottieTrigger`, `LottieSpeed` on media slots | Reported (Lottie is not a media kind) and resolved by hand |
| Bases `VideoPlaysInline`, `VideoLazyLoad` | `Playback` inline, lazy |
| Bases `VideoAlt`, `VideoMimeType` | The device's `Source.alt`, `Source.mime` |
| Bases `BorderRadius`, `BorderWidth`, `BorderStyle`, `BorderColour`, `BorderColourGradient` | Radius, Border width, style, colour |
| Bases `BoxShadow`, `BoxShadowColour`, `BoxShadowColourHover` | Shadow family, names kept |
| Base `OverlayBlendMode` | `OverlayBlend` |
| Bases `Width`, `Height`, `MaxWidth`, `MaxHeight` | Width, Height, Max width, Max height |
| Bases `SvgAnimation`, `SvgAnimationSpeed` | Effects' SVG loop on the SVG part, same speed |
| Bases `SvgTextShadow`, `SvgLayer`, link fields | Names unchanged |
| `chromeLogoTablet/Mobile` | Responsive logo Source |
| `sgsObjectPosition`, `sgsObjectFit`, `imageZoomHover`, `sgsHoverZoom*`, `scaleHover`, `grayscaleHover` | Focal, Fit, Hover effects on the media part |
| `backgroundColour`, `mediaBackgroundColour` on media elements | Background |
| Custom CSS setting focal, size or per-device visibility | Settings, each reported |
| Caption size family | `caption*` responsive |
| Overlay family on backgrounds | Names unchanged |
| Container `boxAspectRatio` | Stays: a layout setting |
| `videoAutoplay`, `videoLoop`, `videoMuted`, `videoControls`, tiers | `Playback` |
| `videoCaptions*` | The device's `Source.captions` |
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
| Brand strip `imageEffect`, `sgsColourTreatment` | Hover filter where it is grey to colour; a static greyscale to Colour Black and white; `white` to Colour White |
| Decorative image `hideOnTablet`, `hideOnMobile` | Universal `sgsHideOn*` |
| `logoSwitchCustomPx` | Stays: the responsive logo's own switch width |

Saved content is every store holding block markup: every post of every type and status (revisions included, so a restored revision cannot bring the old shape back), post meta holding markup, and the `widget_block` option; `corpus.py::export_command` exports it read-only on a mirror or over SSH. `fix --mirror NAME --apply` backs up the database first and writes with `$wpdb`, refusing a row changed since the export; `restore --mirror NAME --backup FILE` returns it (`scripts/migrate-media-system/README.md`). Each real mirror's survey is committed under `plugins/sgs-blocks/reports/media-migration-survey/`. A full fix leaves the `reported` and `refused` items, which are resolved by hand before the check can pass: a background that combines SVG with an image or video (kinds are exclusive per device), `scaleHover`, `grayscaleHover`, `imageZoomHover`, `svgAnimation`, and Lottie.

Deploy and migrate are one step per site: back up the database, deploy, run the detector's fix and check, purge caches, or restore. Site order: mirrors, sandybrown with full motion QA, mamas-test (Mama's work resumes when it passes AC-25), then indus-test, then eye-care-clone-test, one at a time. `eye-care-test`, the presented site, runs last only with Bean's agreement; `build-deploy.py` refuses a post-cutover build on any target whose detector check is not clean (its `media-guard` step, `scripts/deploy_media_guard.py`), so it can take no framework deploy until it migrates. Rollback: restore that site's backup and redeploy the previous tag.

## 14. Build plan

### 14.0 Working rules

The main thread is the Integrator: only it reseeds, regenerates tracked files, edits baselines, and deploys. A reseed takes about six minutes; nothing commits during one. Build agents work in their own git worktrees, never link `node_modules`, commit with explicit pathspecs, never run `sgs-update` or `build-deploy.py`, keep editor checks on local mirrors and never burst Hostinger. Up to eight agents at once.

### 14.1 Stages

**Stage A, on main.** Edits to existing atoms and shared files land live from the start, each with the atom parity gates and a saved-page fixture proving every existing block renders the same (`sizing-cases.json`, AC-3's fixture); this includes the `theme.json` viewport change, the `ResponsiveOverride` display change (checked on AC-14's sample), `icon-shapes.json` additions (with §7.5's tests) and WP-0b's wrapper split. New files land unadopted; new gates carry an "active from cutover" switch. **Slice gate, after WP-1, 2, 4, 5, 5b:** `sgs/media` with a photo on desktop and a video on mobile, built by hand on one mirror with the new controls (no migration tool or new cloner), editor and front end checked, downloads per AC-4; a container background's Background panel is checked in the editor only, because nothing renders a container background through the new system before WP-8, whose done criteria carry the front-end check. WP-6, 10a, 13 and 14 start only after it passes, which reorders Bean's original step 5; the contracts stay open to correction until then. **Stage B, one cutover release.** A short integration branch, opened after Stage A, applies block adoption by script and hand, runs migration on mirrors, passes both gate tiers and PS-8, merges to main in three or more commits (FP-5), and removes old code in the same release. Every block folder Stage B edits is frozen from the moment the branch opens, enforced by a pre-commit path check. Adoption stays a re-runnable script against fresh `main`; if the branch has not merged within three sessions, delete it, re-run later, and release Mama's waiting items as ordinary work. **Stage C, after cutover, additive and needing no migration:** the native parallax driver with §12's smoothness test, and uploaded mask shapes; each gets an FR when scheduled.

Eye Care's remaining checks carry on alongside Stage A. Mama's work that touches media waits for the cutover.

### 14.2 Proofs (run first, independent)

PS-1 DB and gates accept §8, including one item-set block's `slot-array` shape, which exists nowhere yet (`SGS_FRAMEWORK_DB` on a private copy, proven by sha). PS-2 §7.2 Fill design, in standards mode, 13 layouts, in Chrome, Firefox and WebKit, plus WebKit video `object-fit` (untested in the research run, which timed out), the caption rule and the helper's file ratio. PS-5 the loading resolver on REST and cached fragments. PS-7 `sizing-cases.json` and one case of each new kind give equal CSS in PHP and JS. PS-8 is AC-25's comparison, its "before" captured in Stage A. Outcomes: PS-2 fails: Fill requires a parent height and shows "Needs a tall container". PS-5 fails: no high priority on fragments. PS-10 Pinned per §10.3 on the real background element, with a background colour, in Chrome and WebKit. PS-11 the per-device kind browser tests (`R-per-device-kind.md`, `QC-per-device-design.md`) re-run against WP-2a's real markup. PS-1 gates WP-1; PS-2 gates WP-2a; PS-7 gates WP-2b; PS-10 gates WP-8; PS-11 gates the Slice gate. PS-3, PS-4, PS-6, WP-7, WP-11 and WP-12 were retired in earlier versions; their numbers are not reused. Results, 2026-11-10 (`.claude/reports/2026-11-10-spec49-proofs/`): PS-1, PS-2 and PS-7 pass with changes, applied in this version; PS-10 passes; PS-5 failed on template pages, then passed once the motion renderer matched template sections by identity (`e783fee50`), so WP-3 is unblocked. The Slice gate passed on 2026-11-10 after fixes (`E:/sgs-tmp/media-qc/stageA/Slice/`, `SliceFix/`). PS-11 passed 135 of 135 against WP-2a's markup in Chrome, Firefox and WebKit at 1440, 768 and 375, with and without reduced motion (`E:/sgs-tmp/media-qc/stageA/PS-11/REPORT.md`, 2026-11-10); its stub files cannot show paint, so the cover image showing before play and a hidden video pausing on resize are checked with real files at the Slice gate. PS-8 runs in Stage A.

### 14.3 Contracts (frozen before WP-1)

**C1 Atom setting** (each atom gains a `settings` array of these, plus `effects` and `since`):

```json
{ "base": "Fit", "type": "string", "enum": ["cover","contain","fill","none","scale-down"],
  "enumByContext": { "background": ["tile"] }, "default": "cover", "responsive": true, "since": "1.0",
  "emitter": "plain", "css": { "property": "object-fit", "paintNode": "media" },
  "control": { "component": "FitField", "label": "How it fills", "panel": "size-and-crop", "order": 6 },
  "slots": "all" }
```

**C2 Renderer:** `SGS_Media_Element::render( array $slot, array $attrs, array $context = [] ): array` returning `{html, css, needs_helper, lead_candidate}`. `$slot`: `{prefix, kinds, context, wrapper}` (`wrapper`: a figure or link is printed around the media). `$context`: `{uid, block, area, section_index, item_set:{index,columns}, in_editor, extra_class, anchor, role, effects, entrance, hover}` (`role` feeds §7.7's lead rule; `effects`, `entrance` and `hover.scale` feed §7.3). Empty or deleted source returns empty `html`. The caller prints `html` and passes `css` to the collector. `render()` is new; the class's current methods (`style`, `scope_class`, `requires_box`, `element_classes`, `box_classes`, `fills_box`, `debug_attr`) are folded into it or removed in Stage B.

**C3 Emitters:** each atom's PHP twin, `sgs_media_atom_<id>_emit( array $slot, array $attrs, string $uid, bool $helper ): string`, collected by the renderer (`sgs_media_atom_<id>_css` already exists with the signature `( $attrs, $prefix, $block_slug )` and the atom parity gate calls it; it goes in Stage B). Attribute keys are `{prefix}{Base}`, first letter lower-cased when the prefix is empty. Selectors: layout `.{uid}`; surface `.{uid}` or the helper; media `.{uid} .sgs-media-el` with a helper or a wrapper, else `.{uid}`; overlay `::after`; mask `.sgs-media-box__mask`. Keys sorted before hashing. JS twin: each atom module's `emit( slot, attrs, uid, helper )`, collected by `src/components/media/emit/emitters.js::emitSlot` in alphabetical id order (the order PHP sorts to; the parity gate compares the strings in order), which `mediaPreview( slot, attrs, uid ) -> { css, className, needsHelper }` calls. `scripts/tests/test-media-emitter-parity.mjs` (fast tier) holds PHP and JS equal on every fixture case. Fixture: `tests/fixtures/media/matrix.json`.

**C4 Rules:** each atom's `disclosure( attrs, device, prefix )`, keeping its two legal return shapes.

**C5 Priority:** `SGS_Media_Priority::resolve( array $context, array $facts ): array` returning `{loading, fetchpriority, claims:{eager,lead}}`, calling the shared above-the-fold function (§7.7). `$context` carries the slot's `hidden`, `load` (`first`, `later` or empty), `role`, `width` and `height`; `$facts` (`rest`, `armed`, `fold`, or `tree`, `path` and `post_id`) default to the request, with armed read from `Sgs_Motion_Renderer::is_armed`.

**C6 Store (new, WP-10a):** `inspector-focus`: `open({clientId,panel,target,requestId})`, `getRequest(clientId)`, `clear(clientId)`. The Background target is the part matching the resolved kind.

**C7 Shapes:** `icon-shapes.json`, per §7.5.

**C8 Generator:** `scripts/generate-media-attributes.mjs`, extended, reads the registry and each `supports.sgs.mediaElements`, writes attributes marked `_generated: "media-atoms"` into `block.json`, `--check`, `--block <slug>`. When a block already declares an attribute it would write with a different type, it fails naming the attribute; adoption replaces such attributes (`sgs/media`'s `opacity`, `overlayOpacity` and `alignment`) and WP-14 converts stored values (opacity 0 to 1 becomes 0 to 100). Its `--check` compares the committed `block.json` files; today it compares only the PHP mirror with the registry (PS-1), so WP-1 builds that drift check.

**C9 File layout** (new files; each package owns its own and touches no other package's):

| Package | New files |
|---|---|
| WP-1 | `src/components/media/atom-settings.js`, `scripts/lib/media-block-json.mjs` (built) |
| WP-13 | `plugins/sgs-blocks/schemas/media-slot.schema.json` |
| WP-2a | `assets/css/media-base.css`, `media-overlay.css`, `media-video.css`; `includes/media/tier-image.php`, `tier-video.php`, `tier-embed.php`, `tier-svg.php` (the split of `helpers-tier-media.php`); `src/shared/media/device-video.js` |
| WP-2b | `includes/media/atoms/sizing.php`, `shape.php`, `filter.php`, `layout.php`, with JS twins of the same names beside `src/components/media/atoms/registry.js` |
| WP-3 | `includes/media/class-sgs-media-priority.php` |
| WP-4 | `src/components/media/MediaSlotField.js`, `FocalField.js`, `FitField.js`, `ShapeField.js`, `Chips.js`, `mediaPreview.js` |
| WP-0b | `includes/class-sgs-background-layer.php` |
| WP-6 | `assets/css/media-mask.css` |
| WP-8 | `assets/css/media-bg.css` |
| WP-10a | `src/components/media/inspector-focus-store.js` (the plugin's first `@wordpress/data` store) |
| WP-14 | `scripts/migrate-media-system/` (survey, fix, check, self-test) |
| WP-15a | `scripts/data/gate-disposition.json` |

Paths are under `plugins/sgs-blocks/` unless stated.

C0 ships these signatures as documentation, plus the shared fixtures in `plugins/sgs-blocks/tests/fixtures/media/` (`sizing-cases.json`, `matrix.json`, `breakouts.json`, `per-device-kinds.json`; see its README), not stub code. They stay open to correction until the Slice gate passes. One sizing case is open: a helper printed with nothing sizing-related set must keep a small file at its own size; PS-2 finds and proves the rule.

### 14.4 Packages

| Package | Owns | Needs | Stage |
|---|---|---|---|
| C0 Contracts | §14.3 signatures, fixture files, file layout (Integrator) | | Done (`0121d328c`) |
| Proofs | proof scripts, reports | C0 | PS-1, 2, 5, 7, 10, 11 done (§14.2); PS-8 in Stage A |
| WP-H Header (ahead of Stage A) | Stop the header's shrink restyling the page; every sticky and anchor consumer unchanged | | Done (`89b3531b5` to `91d955343`) |
| WP-0b Wrapper split | Background code of `class-sgs-container-wrapper.php` into `includes/class-sgs-background-layer.php`, no behaviour change | | Done (`b4c079f33` to `176d04845`; 821 captured files identical) |
| WP-1 Core | Atom registry `settings`, `effects` and `since` data; the generator writing `block.json` and override entries for adopted slots (marker `kinds`, §8.3) with its `--check` and `--self-test`; Spec 32 and 35 amendments; `theme.json` `settings.viewport` at `767px` and `1023px` | PS-1 | Done (`bebcc02ec`); the slot schema and the `role: content` spike moved to WP-13 |
| WP-15a Gates | New gates; `gate-disposition.json` classifying every gate and test naming removed code as reused, changed or deleted | WP-1 | Done (`a6be06248`): 88 entries, `check-gate-disposition.py` and `check-media-contract.py` (AC-2, AC-18, silent until a slot declares `kinds`) in the fast tier; the AC-2 attribute stems are re-checked against the adopted names in Stage B |
| WP-2a Markup | `SGS_Media_Element` extended into the renderer, §7.1, §7.3, §7.9; `sgs_tier_media_render` reworked and split by kind; the shared device-video module; `media-base.css` (replacing `media-element.css` and the atom partials, with the Fill content-band rule), `-overlay`, `-video.css` | WP-1, PS-2 | Done (`d4777b250` to `143da2386`, integration fixes `c04880e84`); 821 captured files identical on local-sandybrown; inline SVG edited with `WP_HTML_Tag_Processor`, `wp_kses` last |
| WP-2b Atoms | Each atom's PHP twin printing real properties; the new `sizing`, `shape`, `filter` and `layout` atoms; folding `media-type` and `intrinsic`; the value helpers per FR-49-12 | WP-1, PS-7 | Done (`4dac17556`, `8cc77a69e`): `_emit` twins on all 19 atoms; the new atoms sit in `MEDIA_KINDS_ATOMS`, invisible to the legacy table; a bare number is refused only by `sgs_media_length` (the shared `sgs_css_length_value` keeps `24` as `24px` for existing callers) |
| WP-3 Loading | `includes/media/class-sgs-media-priority.php`, calling `Sgs_Motion_Fold::is_above_fold` with `Sgs_Fold_Scan::section_count` (§7.7); removes `preload_hero_image` | WP-1, PS-5, the motion renderer matching sections by identity (done, `e783fee50`) | Done (`98ac0a95a`, `4ceec90ea`): the dead copy in `inc/font-preloading.php` is gone; the live `functions.php::preload_hero_image` stays until WP-9, because a hero with a tablet or mobile image paints it as a CSS background; `ProductCardImagePriorityTest`'s two failing tests stay red until Wave 3 moves the product card off `sgs_image_loading_attrs` onto the resolver (the card, not the tests, breaks §7.7) |
| WP-4 Controls | The atoms' controls per §9.2, `mediaPreview.js`, reworked `ResponsiveOverride` | WP-1 | Done (`25e384535`); AC-14 sample (container, button, accordion, post grid, timeline) unchanged apart from the §9.2 wording; the captions file picker inside `MediaSlotField` (§9.3 Video) moves to Wave 1 |
| WP-5 Disclosure and panels | The atoms' disclosure rules per §9.3, `MediaElementPanel` reworked into §9.4's panels | WP-1 | Done (`31c71803d`) |
| WP-5b Adopted vocabulary | §8-named settings for the older atoms (`emit/adopted-settings.js`), their disclosure, WP-4's fields and the remaining §9.2 fields wired into the panels, `ShadowControl`'s `hide` (Spread, Inset and Raw CSS under a mask), the generator writing §8 attributes, the purity gate reading `paints` | WP-2b, 4, 5 | Done (`b2bff467e`, `817e835ca`); `SvgParts` and `SvgPartsTrigger` get adopted rows in WP-8 |
| WP-6 Masks | `icon-shapes.json` additions with `surfaces`, `media-mask.css`, `ShapeField` | WP-1, Slice gate | Done (round 3): 15 media shapes, `media-mask.css` loaded only for a masked slot, PHP and JS mask CSS identical in 10,773 cases, captured in Chrome, Firefox and WebKit |
| WP-10a Effects UI | Motion targets and fields, the new store, `render-paths.json`, `motionSurface` on `sgs/media`, registry filters accepting the media and background parts, per-device effect scoping (FR-49-40) | WP-1, Slice gate | Done (round 3): the `inspector-focus` store, the Background motion line, Effects opened and focused by the store, the effect list filtered by each device's kind; scoping writes the layer's tablet and mobile `off` tiers; each adopting block declares its parts `{surface, availableWhen:{slot, kinds}}` and `sgs/media` gains `motionSurface` at adoption |
| WP-13 Cloner | New files for Fill's image route (§11), the kind per width, parity, skeleton rules, `wp-build-page` descending into object attributes, `schemas/media-slot.schema.json` generated from attribute `properties` (FR-49-34), the `role: content` spike on object attributes, Spec 48; the switch-over commit is in Stage B | WP-1, Slice gate | Done (round 3): `schemas/media-slot.schema.json` from `scripts/data/media-slot-properties.json` (the §8 value shapes) with `check-media-slot-schema`; `scripts/lib/object-attr-check.js` in `wp-build-page`; route modules under `scripts/computed-route/lib/media/` (unwired; Stage B replaces `imageSlots` in `lib/fill-media.mjs::mediaDecisions`); the seeder and wiring gate accept `role: content` on an object attribute |
| WP-14 Detector | Migration tool, mapping rows, run on mirrors in Stage B | WP-1, Slice gate | Done (round 3): `scripts/migrate-media-system/` (687 mapping rows, survey, fix, check active from cutover, self-test 502 of 502, fix idempotent on 13,749 blocks); hover, zoom, Lottie and SVG animation attributes are reported for WP-10b, and a hero setting both `mediaPadding` and `splitMediaPadding` is refused for a hand decision |
| WP-16 Formats | FR-49-42: AVIF q60, else WebP q82, for every resized copy through WordPress core (no outside service; LiteSpeed Cache's QUIC.cloud image optimisation stays off), a converted copy larger than its source discarded, the opt-in per-site regeneration, and a deploy check that LiteSpeed's own lazy load stays off so §7.7 decides loading | WP-1 | Done (`e822a385a`, `d87737ba1`): `includes/media/class-sgs-media-formats.php` and `class-sgs-media-modernise.php` (`wp sgs media modernise`); the attached file and the `-scaled` copy keep the upload's format, so social previews and emails still work; `scripts/deploy_litespeed_probe.py` warns when LiteSpeed's lazy load or image optimisation is on |
| Wave 1 | `sgs/media`, decorative-image, gallery | WP-2 to 6 | B |
| WP-8 Backgrounds | Background layer with per-device kinds and Pinned; a Pinned or tiled background that is the page's lead is a CSS background the preload scanner cannot see, so it prints `<link rel="preload" as="image" imagesrcset imagesizes media="..." fetchpriority="high">` per device instead of an element claim; BackgroundPanel, `media-bg.css`, wrapper adopters; surface effects hosted on the background part (§10.5); done when one container background built by hand with the new controls passes the Slice gate's editor, front-end and AC-4 checks | WP-0b, 2, 4, 5, PS-10 | B |
| WP-10b Motion runtime | Overscan, one route for image zoom and grey to colour, the effect fixes §10.5 assigns here; server-side scoping of an effect by the kind each device resolves (Desktop has no `off` tier, so a phone-only effect still runs there); `src/components/motion/effect-kinds.json` moves into `fx_effects.requires` (FP-1) | WP-2, 8 | B |
| WP-9 Hero | `src/blocks/hero/*` | WP-8 | B |
| Wave 3 | Card grid, post grid, product card, buybox, brand strip, responsive logo, nav drawer logo, choice-flow header logo | Wave 1 | B |
| Wave 4 | Team member, testimonial, before-after, timeline, choice-flow options, form tiles, option picker, image sequence, measured diagram, trust-bar badge; style-call replacement in the small fixed thumbnails; `sgs/business-info` map width and height to CSS (FR-49-17) | Wave 1 | B |
| WP-15b Docs, removal | Specs 02, 35A, 36, 48, rules, CLAUDE files; §8.2 | all | B |

Parallel after WP-1: WP-0b, 2a, 2b, 3, 4, 5. Parallel after the Slice gate: WP-6, 10a, 13, 14. Stage A closed on 2026-11-10 (main `7aa0a65d3`): every Stage A package, the Slice gate, a full second opinion (five reviewers, every finding fact-checked) and its 32-row hardening wave, recorded with what Stage B packages own in `.claude/plans/archive/2026-11-10-spec49-stage-a-hardening.md`. Waves within Stage B after their needs. Generated files and baselines change only through the Integrator.

## 15. Non-functional

Accessibility: WCAG 2.1 AA; alt and title warnings; keyboard paths; reduced motion honoured; no serious axe findings. Performance: §7.7, §7.9. Editor code: each block's editor bundle carries its own copy of shared components (the plugin's build has no shared editor chunk); the adopted panels load lazily as one chunk (`build/media-panels.js`), and a plugin-wide shared editor chunk is open, not scheduled. Security: FR-49-12, FR-49-14, FR-49-17. Browsers: Chrome, Firefox and WebKit gates. No media PHP file over 500 lines; `render.php` only calls the renderer. JS-written custom-property values are allowed at runtime; PHP and editor style attributes are not.

## 16. Traceability

Register items: H1 done (`24095ea4f`, resolved CSS values through token helpers). Q1, Q2: §6.5, §7.1, §7.8. Q3: §9.6. Q4: §6.6, FR-49-28. F1: FR-49-4, FR-49-23, §10.4. F2, F3, F4: §9.2 `FocalField`, §9.3, §9.4. B1: FR-49-29, §10.2. B2: §6.6, §9.3. M1: §9.4. M2: FR-49-27. M3: §9.4. M4: FR-49-19, §9.3. M5: §9.4. M6: §7.4, §9.4. M7: FR-49-32, Circle, §7.5. M8: §9.2. R1: FR-49-19, FR-49-20. R2: §10.4. R3: §6.1, FR-49-26, WP-15a, WP-15b. R4: §10.

FR to AC: FR-1 AC-1; FR-2 to 4 AC-2; FR-5 AC-3; FR-6, 8, 9 AC-4; FR-7 AC-5; FR-10, 17, 31 AC-6; FR-11 AC-7; FR-12, 14, 17 AC-8; FR-13 AC-9; FR-15 AC-10; FR-16 AC-11, AC-32; FR-18 AC-12, AC-28, AC-29; FR-19 AC-13; FR-20 to 22 AC-14; FR-23 AC-15; FR-24 AC-16; FR-25 AC-17; FR-26 AC-18; FR-27, 28, 40 AC-19; FR-29 AC-20; FR-30 AC-21; FR-32 AC-22; FR-33 AC-23; FR-34, 35 AC-24; FR-36 AC-25; FR-37 AC-26; FR-38 AC-27; FR-39 AC-31; FR-41 AC-30.

## 17. Open questions

None. Bean's rulings on 2026-11-09: no CSS size target for this work; duotone left out; videos play on phones. On 2026-11-10: a different kind per device wherever a slot allows two or more kinds; the white logo filter and the logo switch width stay; the image-size dropdown goes; the fixed background stays, as Pinned (Parallax at full strength leaves gaps, T12); Effects is the whole registry filtered by the kind on each device; existing atoms and shared files are used and extended from the start; under a mask shape the shadow is drawn on the box as `filter:drop-shadow` and follows the shape, with Spread, Inset and Raw CSS hidden (§7.5).

## 18. Appendices

The per-block, per-file and per-control detail the brief asks this spec to carry (Task 1a to 1c), drawn from `T1` to `T6`, `AT` and `T-merge-decisions.md` and checked against the code (every path exists) and this spec, which wins where they differ. Citations are under `plugins/sgs-blocks/` unless stated; a bare file name sits in the folder of the row above it. "Not verified" means the source says so.

### Appendix A: per block

| Block | Today | Change | End shape (settings, markup) | Specialised controls and reason |
|---|---|---|---|---|
| `sgs/media` (`media`, content, all kinds) | Flat per-device siblings (`imageIdTablet`, `videoUrlMobile`, `svgContentTablet` and more); `mediaSizing` mode chip; `mediaType` tabs; 14 atoms via `MediaPanelLayout`. `render.php` (1,379 lines, no renderer class); art direction is sibling `<img>` per tier, full-size URL, no srcset; embed iframe has no `sgs-media-el` marker so every box control is dead; Effects panel empty (no `fx.motionSurface`); `shape`, `minHeight`, `objectFit*`, `width` injected at registration so DB differs from `block.json` | Flat siblings become one `mediaSource` object plus Alt, Decorative, Fit, Focal and the §8 table; `render.php` shrinks to one renderer call; `<picture>` with `<source media>` for different files; `displayWidth` deleted; `shape` rounded becomes Corners 12px, circle becomes Shape Circle; `thumbnailId` becomes `Source.poster`; add `supports.sgs.fx.motionSurface`, drop `isWrapper`; panels become §9.4's | Attrs: `mediaSource`, `mediaAlt`, `mediaDecorative`, `mediaFit`, `mediaFocal`, `mediaRatio`, width, max and min width and height, `mediaAlignment`, `mediaOrder`, radius, border, padding, background, shadow, `mediaOpacity`, `mediaShape`, overlay, Colour, blend, `mediaLoading`, `mediaPlayback`, caption, `captionTag`, link, caption and `videoTime` typography. Panels: Media, Caption and link, Video; Size and crop, Position in the layout, Border and shape, Shadow, Overlay and filters, Typography, SVG, Hover, Entrance and reveal, Effects. Markup: `<figure> > <a> > [helper > mask >] <img class="sgs-media-el">`, levels omitted when unused; `<picture class="sgs-media-picture">` only for different per-device files; embed carries the media marker | Caption, caption tag, link (a figure and anchor only make sense here); Video playback and captions file; `videoTime` typography (player readout); SVG layer and text shadow (inline SVG; its animation is Effects' SVG loop); Load priority; kind choice per device (it chooses the printed element) |
| `sgs/container` (`background`, background, I V S) | Background family: `backgroundImage` (+Tablet, Mobile), `backgroundSize/Position/Repeat/Attachment`, `bgVideo` tiers, `bgSvg*`, overlay family; `BackgroundPanel` tabs Image, Video, SVG. Plain image prints `<img class="sgs-container__image-bg">`; any tile, `auto`, fixed attachment or tablet/mobile image falls to `.{uid}::before` CSS background (no srcset, no priority); video `preload="none"` swapped by `view.js`. Position is a 9-keyword preset. Wrapper is a 3,842-line class | Background code moves to `includes/class-sgs-background-layer.php` first (WP-0b, no behaviour change); then slot `background` prints `.sgs-bg-media` as a real element in every state; `.sgs-container__image-bg` and `::before` painting removed; fixed attachment becomes Pinned (§10.3); `background` becomes a motion target; background video gets a part | Attrs: `backgroundSource` (responsive object), `backgroundFit`, `backgroundFocal`, `backgroundRepeat`, `backgroundTileSize`, `backgroundLoading`, overlay family; `minHeight` and `boxAspectRatio` stay as layout. Panel Background: Media (per device, with its kind), How it fills, Focal, Tile options, Overlay, Photo opacity, motion line. Markup: `<section class="{uid}"><div class="sgs-bg-media">..</div><span class="sgs-bg-overlay"></span><div class="sgs-container__inner">..</div></section>` | SVG layer settings (layer order, opacity, min height, text shadow); Surface panel (tone, blur, saturate, fill opacity: read by site-header, kept apart from the media system, T1 §6); shape dividers; min height and box ratio (layout) |
| `sgs/hero` background (`background`, background, I V S) | Own `<img class="sgs-hero__bg-img">`, own `<video class="sgs-hero__video-bg">`, own overlay; wrapper background nulled. Size, Position, Attachment do nothing on a plain image (`render.php` emits fit only for video; `style.css::.sgs-hero__bg-img` hardcodes cover). Any tablet/mobile image moves the whole background to `::before`. Background alt always empty. Hero default `splitMediaObjectPosition` bakes mobile bias "center 20%" | Same background slot as container; hero's private image, video and overlay paths removed; migration drops the baked focal default and keeps it only where saved; AC-25 must expect hero images to change (inert controls today) | Same attrs as container background; panel Background; markup `<section><div class="sgs-bg-media"><picture>or<video>or<svg></div><span class="sgs-bg-overlay"></span> content </section>` | `bgSvgParts` and `bgSvgPartsTrigger` (named-part animation, `SvgParts` and `SvgPartsTrigger` in §8); `bgSvgOpacity`, `bgSvgMinHeight` (§13: Opacity; the block's min height); shape dividers; min height |
| `sgs/hero` split (`split`, content, I V S) | `splitMedia*` flat tiers incl. per-tier alts; `splitMediaObjectFit`, `splitMediaObjectPosition` object; `sgs_tier_media_render()` prints sibling elements per tier; `HeroSplitMediaPanelLayout` mounts 3 atoms only; no hero control writes `splitMediaOverlay*` though it renders | `splitMedia*` become `split*`; per-tier files and `splitMediaType*` become `splitSource`, with the kind per device; overlay control mounted; `sgs_tier_media_render` reworked (decision) | Attrs: `splitSource`, `splitAlt`, `splitDecorative`, `splitFit`, `splitFocal`, `splitRatio`, `splitWidth`, `splitHeight`, limits, `splitShape` and corners, border, shadow, padding, overlay. Panels: Split media (Media, Size and crop, Border and shape, Shadow, Overlay and filters). Markup per §7.1: one `<picture>` for the devices showing a photo, one `<video>` for those showing video, SVG and embed siblings | Column placement (`splitContentOrder`, `splitMediaAlign`), content padding, `mediaPadding`, hero variants (layout, not media) |
| `sgs/decorative-image` (`layer`, element, I S) | `decorMedia` object plus legacy `imageId/Url`, tablet/mobile files; `shape` clip-path enum; `opacity` 0 to 100 (media uses 0 to 1); layer attrs; naked `<img>` as root, or wrapper when treated; clip-path clips its own shadow; ornament printed eager; render synthesises `decorMedia` from legacy `imageUrl` (FP-14 fallback); video branch via `sgs_render_media()`; `hideOnTablet/Mobile` beside universal `sgsHideOn*`; `DecorativeImageLayerTest` red at that commit (T1 §2, not re-run) | `decorMedia`, `imageId/Url`, tiers, `imageDecorative` become `layerSource`, `layerAlt`, `layerDecorative`; `shape` becomes `layerShape`; clip-path presets deleted; delete `hideOnTablet/Mobile`, keep `sgsHideOn*`; legacy fallback removed; §10.4 kinds are I S (video branch dropped; saved video use not verified) | Attrs: `layerSource`, `layerAlt`, `layerDecorative` (default true), `layerFit`, `layerFocal`, `layerWidth`, `layerMaxWidth`, `layerHeight`, `layerRatio`, `layerOpacity`, `layerShape`, `layerBlend`, radius, border, shadow; unchanged position, rotation, anchor, `zIndex`, `flipX`, `fadeOnScroll`, `overflow`. Panels: Media, Size and crop, Border and shape, Shadow, Position, Transform, Hover, Entrance, Effects. Markup: naked `<img class="sgs-decorative-image sgs-media-el">` as root; helper only for mask, overlay or hover zoom | Anchor to parent or section, position from each edge, rotation per device, `zIndex`, flip, fade on scroll, overflow (they describe a floating layer). |
| `sgs/gallery` (`item`, item, I V) | `mediaItems[]` of `{id,url,alt,caption,decorative,objectFit,focalPoint,link*}`; block `aspectRatio`, `imageSize`, `tileFitContain`, `sgsObjectFit`, `sgsObjectPosition`, `scaleHover`, `grayscaleHover`; three fit controls, three focal shapes; two loading rules (index below 4 vs first image of first section); raw `FocalPointPicker` per item; `sgs_render_media` for non-attachment items | Item fields become `{source,alt,decorative,fit,focal,caption,link*,_key}`; block `itemRatio`, `itemFit`, `itemRadius`, `itemShape`, `itemLoading`; `imageSize` dropdown deleted (decision); `sgsObjectFit/Position`, `scaleHover`, `grayscaleHover` migrate to Fit, Focal and hover effects on the media part; `tileFitContain` removed if Fit contain covers it; per-item scope `{uid}-i{index}`, `tier_shape` `slot-array` | Panels: Layout; Images (one `MediaSlotField` per item); Item tile; Hover; Entrance. Markup per item `<a> > <img>` (core srcset); `<picture>` not needed (no per-device item files) | Layouts grid, masonry, scroll, carousel; columns per device; gap; caption reveal; existing lightbox (spec §2 must say "no new lightbox"); drag reorder; multi-select upload; tile min height; per-item caption and link |
| `sgs/card-grid`, `sgs/post-grid` (`image`, item, I featured) | card-grid: `items[].media` in three accepted shapes, per-item `focalPoint`, `aspectRatio`, `imageHeight`, `imagePadding`, `imageFallback`; `imageControls`; `sgs_render_media`, `glyph-fallback.php` hand `<img>`. post-grid: `showImage`, `imageSize`, `aspectRatio`, `imageHeight`; featured `<img>` edited by regex; `class-post-grid-rest.php` calls `SGS_Media_Element` directly | Source, Fit, Focal, Ratio, Radius, Shape, Loading at block level; per-item `source/alt/decorative/fit/focal`; `imageRatio` replaces `aspectRatio`; `imageHeight` becomes Height; `imageSize` deleted (decision); `imageControls` flag removed; `imagePadding` becomes Padding (§13) | `imageFit/Focal/Ratio/Height/Radius/Shape/Loading`; item-set slot per §8.3 | Grid layout; `imageFallback` and `noImageLabel` (empty-state for a missing photo); post-grid `showImage` toggle. Saved use: card-grid 26 blocks |
| `sgs/product-card`, `sgs/buybox` (`image`, `thumb`, `logo`; buybox `main`, `thumb`, `preview`; item, I featured) | product-card: `image`, `imageId`, `imageSize`, `imageAspectRatio`, `imageFill`, `imageHeight`, `mediaBackgroundColour`, brand logo attrs; hand `<img>` x3; `ProductCardImagePanelLayout` is dead. buybox: `previewImageId`, `mainPhoto*`, `galleryThumb*`, `galleryStickerShape`; `gallery-col.php` hand `<img>`, thumbs hard-coded lazy, main width/height from first gallery item only; `ConfiguratorPanel.js` raw `MediaUpload` | `imageSize` deleted; `imageFill` becomes Height Fill; `imageAspectRatio` becomes Ratio chips; `mediaBackgroundColour` becomes Background; `galleryStickerShape` becomes Shape or Corners; loading by §7.7 (main eager lead candidate in the first section) | `imageSource` (featured default), `imageAlt`, `imageDecorative`, `imageFit/Focal/Ratio/Height/Radius/Loading`; `thumb*` Source, Fit, Radius; buybox `mainFit/Focal/Ratio/Radius`, Border, Shadow; `preview` and `logo` slots (§10.4) | Colour swap on option pick (`data-wp-bind` swap), thumbnail strip, `thumbSelectedScale`, sticker text and position, configurator preview (`preview` slot), brand logo (`logo` slot) |
| `sgs/team-member`, `sgs/testimonial` photo (`photo`/`avatar`, content, I) | team-member: `photo` object plus `photoTablet/Mobile`, `photoShape` default circle; `imageControls`; manual `<source>` handling around `sgs_render_media`. testimonial: `avatarMedia` (+tiers) with `*Decorative` | Tier objects fold into `photoSource`; `photoShape` becomes Shape (circle becomes Shape Circle plus Ratio 1:1 as one step); `imageControls` removed | `photoSource`, `photoAlt`, `photoDecorative`, `photoFit/Focal/Shape/Radius` | Card layout controls only. Saved use: team-member 10 (sandybrown only), `photoShape` `square` x7 |
| `sgs/testimonial` logo and work (`logo`, `work`, content, I) | `orgLogo` has no `mediaElements` entry so no Fit; `workMedia` has Fit and Focal; four `sgs_render_media` calls | `logoSource`, `workSource` with Alt and Decorative each; Fit; `work` keeps Focal (§10.4 gives it Focal) | `logoSource`, `logoFit`; `workSource`, `workFit`, `workFocal` | None |
| `sgs/before-after` (`before`, `after`, content, I V S) | `before*`/`after*` flat tiers, `*MediaType`, two alts per side (image and video), `videoAutoplay` tiers; raw `MediaUpload`; `media-render.php` | `*Source` responsive objects; Alt and Decorative per side, with an alt per device where its file differs; `videoAutoplay` folds into Playback per side; flat tier attrs migrated | `beforeSource`, `afterSource`, `beforeAlt/afterAlt`, `beforeDecorative/afterDecorative`, `beforeFit/Focal`, `afterFit/Focal`, shared Height, Width, Radius; `<picture>`/`<img>` through the renderer | Divider and `startPosition` (the interaction). Saved use: 10, sandybrown only. Per-device focal not verified |
| `sgs/timeline` (`entry`, content, I V) | `milestoneMediaWidth`, `mediaHeight`, `mediaAspectRatio`, `mediaBorderRadius`; no `mediaElements`, so Ratio crops with no Fit or Focal control; `sgs_tier_media_render` | Add Fit and Focal (new controls, not a rehome); `milestoneMediaWidth` becomes Width | `entryFit/Focal/Ratio/Radius`, per-item `source` | None |
| `sgs/responsive-logo` (`logo`, content, I S) | `logoId/Url` + tiers, `logoSwitchMode` + `logoSwitchCustomPx`, `darkLogoId`, `inlineSvg`, `svgParts*`; hand `<picture>` printed five times, `loading="eager"` hard-coded; raw `MediaUpload` | Flat tiers become `logoSource`; loading from the §7.7 resolver; the switch keeps its own width (decision); `sgsColourTreatment` becomes filter "White" (decision) | `logoSource`, `logoDarkSource`, `logoWidth`, `logoLoading`, Alt, Decorative, switch mode and width; `<picture>` from the renderer | `inlineSvg` plus `svgParts*` (draw-on animation needs inline SVG); dark source; switch width. Saved use: 63 instances |
| `sgs/nav-drawer` logo (`chromeLogo`, content, I S) and background | Chrome logo: `chromeLogoId/Url/Alt/Link/Width/Show`, `chromeLogoInlineSvg`, `chromeLogoSvgParts*`, `chromeLogoBox*`; raw `MediaUpload`. Background: own `backgroundImage`, `backgroundImageDecorative` default true, copied option lists, own `::before` paint, no wrapper, no video or SVG | Logo becomes slot `chromeLogo` using responsive-logo's shape and renderer; background adopts slot `background` and the shared panel, dropping its copy | `chromeLogoSource`, `chromeLogoWidth` (responsive), box settings; background as container | Logo box settings, inline-SVG parts, link and show toggle |
| `sgs/choice-flow` header logo (`headerLogo`, content, I S) | `headerLogo` object (default `{}`), `headerLogoHeight`; raw `MediaUpload` in `ChromePanel.js`; `summary.js` builds `<img>` at runtime | `headerLogo` becomes the `headerLogo` slot | `headerLogoSource`, width or height; summary image stays JS-built with explicit width and height | Flow chrome. Saved use: `headerLogo` x1, `headerLogoHeight` x2 |
| `sgs/choice-flow-question` options (`option`, item, I) | Option images by `echo '<img'` with `sgs_image_size_attrs`, no loading rules; `optionMediaSize` | Per-option `source/alt/decorative/fit/focal`; `optionMediaSize` becomes Width or Height | Per-option object; Source, Fit, Focal | "Set by flow fit": the flow decides crop for all options (its own fit setting) |
| `sgs/form-field-tiles` (`tile`, item, I) | `tiles[].image` bare URL string, hand `<img>` lazy, `MediaPicker`, `imageControls: false`; not in the old §10.4 | Per-item `source` object (with id, or width and height) | Source, Fit | None. Saved use: 10 (indus 9) |
| `sgs/option-picker` swatch (`swatch`, item, I) | `optionItems[].image` URL string; swatch `<img>` via `sprintf` or `wp_get_attachment_image_src`; `swatchShape` enum | Per-item `source` object; `swatchShape` becomes Shape | Source, Fit, Shape | None. Saved use: 4, sandybrown only |
| `sgs/trust-bar` badge (`badge`, item, I) and background | `badgeImageSize` (60), `badgeImageObjectFit` (contain or cover only), radius, shadow; `<img loading="lazy">` hard-coded; background via `BackgroundPanel` | Item slot `badge`; `badgeImageSize` becomes Width; own fit enum replaced by the atom; background adopts slot `background` | `badgeFit`, `badgeRadius`, `badgeShape`, per-item `source`; background as container | Marquee; one square badge size; `shapeDividers`; badge shadow stays on the item |
| `sgs/brand-strip` (`logo`, item, I) | `logos[].media`, `logoLayout`, `tileShape`, `logoFit`, `logoMaxWidth`, `logoOpacity`, `imageEffect`; `sgs_render_media` then `preg_replace` on `<img`; own `objectFit` select per item; always lazy | Block `logoFit` stays as the item Fit; `tileShape` replaced by Shape; per-item `source`; regex surgery removed; Radius and Shape kept (the old §10.4 row dropped them); `imageEffect` needs a decision (grey to colour belongs to Hover) | Source, Fit, Radius, Shape | Marquee and row layout, gap, `logoOpacity`, `logoMaxWidth` (strips need a common size) |
| `sgs/image-sequence` (`thumbnail`, content, I) | `thumbnail` + tiers, `thumbnailAlt`, `aspectRatio` enum, frame-set URLs; `sgs_responsive_image` | `thumbnailSource` responsive object; `aspectRatio` becomes Ratio | `thumbnailSource`, Alt, Decorative, `thumbnailFit`, `thumbnailRatio` | Frame sets (`desktopFramesUrl`, tablet, mobile; no equivalent in the spec). Saved use: 0 |
| `sgs/measured-diagram` (`drawing`, content, I S) | `drawingImageId/Url/Alt/Decorative/Width/Height`; atoms `intrinsic`, `meaning`; `<img>` inside a frame with SVG defs | Slot `drawing`, Source only: a crop would break the measurements; width and height stay as measurement data, not display sizes | `drawingSource`, `drawingAlt`, `drawingDecorative` | Intrinsic sizing and measurement overlay. Saved use: 4 |
| `sgs/multi-button` (`background`, background, I V S) | Declares the full background set; mounts `BackgroundPanel` | Adopts slot `background` | As container background | None; no cloned draft exercises it (T1, not re-checked), costs nothing once the wrapper owns it |
| `sgs/physics-canvas` (`background`, background, I V S) | `enabledExtensions: ['background']`; mounts `BackgroundPanel` | Adopts slot `background` | As container background | None. Saved use: 4, sandybrown only |
| `sgs/site-header` (`background`, background, I V S) | Background set plus `surfaceOpacity`, `backgroundColourScrolled*`; interacts with floating header and `float-preview.js` | Adopts slot `background` | As container background | Surface family and `backgroundColourScrolled*` stay with the block |
| `sgs/site-footer` (`background`, background, I V S) | Background set plus `surfaceTone`, `surfaceBlur`, `surfaceSaturate` | Adopts slot `background` | As container background | Surface family stays with the block |
| `sgs/business-info` map (not media) | Map `<iframe>` with `width="100%" height="400"`; address from `Sgs_Site_Info`; own `mapSource`, `mapZoom`, `mapHeight`, `mapFilter` | No change to the picker; width and height move to CSS so it follows the embed rule; gates allow-list it; FR-49-17 allow-list (YouTube, Vimeo) does not apply | Unchanged | Address and zoom controls. Saved use: 124 instances, none sets an old media attribute |
| `sgs/audio` (not media) | `audioUrl`, native `<audio>`, raw `MediaUpload` | No change; FR-49-26 allow-lists it | Unchanged | Audio file |
| Pure icon pickers (`iconSvg`) (not media) | Icon attributes on icon, button, social-icons, icon-list, pricing-table, process-steps, notice-banner, wishlist-link, cart | No change; gates allow-list them | Unchanged | None |
| `sgs/google-rating-badge`, `sgs/star-rating`, `sgs/trustpilot-reviews` (not media) | Fixed artwork `<img>` from plugin assets | No change; documented as not media settings so a gate that greps `<img` does not fail | Unchanged | None |
| `sgs/cart`, `sgs/wishlist-panel`, `sgs/product-search` (small fixed thumbnails) | cart: `itemThumbSize`, `itemThumbRadius`, `itemThumbBg`; wishlist rows and search results build `<img class="sgs-media-el">` in JS; `SGS_Media_Element::style` for scoped CSS | `SGS_Media_Element::style` calls become `sgs_emit_responsive_css`; keep own attributes and JS-built `<img>` with explicit width and height; not slots; `itemThumbFit/Radius/Size` rehomed to media settings | Unchanged markup | JS rendering (data arrives at runtime). |
| `sgs/store-selector` flags (small fixed thumbnail) | `flagUrl` bare URL, `flagSize`; `<img>`; raw `MediaUpload` | Keeps own attributes; not a slot; `SGS_Media_Element::style` call becomes `sgs_emit_responsive_css` | Unchanged | Flag per store. Saved use: 1 |
| `sgs/nav-drawer-menu` items (small fixed thumbnail) | `itemMedia` (featured-image), `itemMediaReveal`, `itemMediaWidth/Height`, `itemMediaRadius`; `includes/nav-drawer-menu-items.php` | Keeps own attributes; not a slot | Unchanged | Reveal is menu behaviour. |
| `sgs/mega-panel` cards (small fixed thumbnail) | `drawerCardMediaRatio`, `drawerCardMediaHeight`, `drawerCardThumbSize`; `includes/mega-panel-drawer-extras-css.php`; `accentBackgroundImage` default is a token name, not an image (not opened further) | Keeps own attributes; not a slot | Unchanged | None |
| `sgs/google-reviews` avatars (small fixed thumbnail) | Remote Google avatar `<img>`, `avatarSize`, `avatarBorderRadius`, card logo from plugin assets; `imageControls: false` | Keeps own attributes; fixed-size exception to FR-49-16 (no attachment record for a remote URL); `avatarFit/Radius/Size` only | Unchanged | Google colours and UI stay Google's |

### Appendix B: per file

Paths checked with `ls` in `E:/sgs-tmp/wt-media` (HEAD `e8f3c9be3`); "New" means the file does not exist yet by design. Plugin paths are under `plugins/sgs-blocks/`; `scripts/computed-route/` and `scripts/wp-build-page.js` are repo-root. Counts are the reports' file counts.

| File | Verdict | What happens | Package |
|---|---|---|---|
| **PHP** | | | |
| `includes/class-sgs-media-element.php::SGS_Media_Element` | Rework | Extended into the one renderer `render( $slot, $attrs, $context )` (C2); the two `trigger_error` shims go; direct callers `class-post-grid-rest.php` and `product-card-builtin-render.php` move with Wave 3 | WP-2a |
| `includes/media/atoms/*.php` (15 twins) | Keep, extend | Each twin prints real CSS properties through the shared helpers; new `sizing`, `shape`, `filter` twins; `media-type.php` and `intrinsic.php` fold into `source.php` (decision) | WP-2b |
| `includes/helpers-media-element.php` | Rework | T3 said delete as a legacy-shape reader; atoms stay, so drop the tolerant `STORED_AS` reader and keep attribute naming and `sgs_media_hover_zoom_clips` (not in §8.2; confirm) | WP-2b |
| `includes/helpers-tier-media.php::sgs_tier_media_render` | Rework | Kept (decision), split by kind: one `<picture>` for images, `<source media>` for video; fixes three eager `fetchpriority="high"` tiers and hard-coded `loop muted playsinline` | WP-2a, WP-9 |
| `includes/helpers-tier-media.php::sgs_tier_media_toggle_css`, `sgs_tier_media_has_source` | Rework | Show the right sibling per device (embeds, SVG, and the `<picture>` and `<video>` against each other) | WP-2a |
| `includes/helpers-tier-media.php::sgs_allowed_svg_tags` | Keep, move | Into `includes/helpers-svg-kses.php` first (SVG kind's sanitiser; 6 callers) | WP-2a |
| `includes/helpers-media.php::sgs_media_cover_crop_plan` (+ `_widens`, `_sizes`, `_hint_sizes`) | Rework | Becomes §7.6 derived sizes in the renderer (width px, vw, rem, em, else `100vw`; keep crop factor and item-set column count); it returns "keep auto" silently once `sgs_media_atom_box_shape_resolve_sizing_mode` goes | WP-2a |
| `includes/helpers-media.php::sgs_media_drop_auto_sizes` | Keep, move | Into the renderer file (hooked on `wp_content_img_tag`) | WP-2a |
| `includes/helpers-media.php` (the `sgs_hidden_render_*` functions, `sgs_in_hidden_render_context`) | Keep, move | Into `includes/media/class-sgs-media-priority.php` (New) before the file goes; implements §7.7 rule 1 | WP-3 |
| `includes/helpers-media.php::sgs_render_stars` | Keep, move | To a reviews helper (7 callers); not media | WP-15b |
| `includes/helpers-media.php::sgs_responsive_image`, `sgs_render_media`, `sgs_image_loading_attrs`, `sgs_next_background_image_index`, `sgs_content_image_claims_priority` | Delete | Absorbed by renderer and `SGS_Media_Priority::resolve`; 11, 20, 8, 4 and 3 callers move; `sgs_eager_image_limit` has no other user; file deleted once the moves above are done | WP-2a, WP-3, Waves, WP-15b |
| `includes/media/class-sgs-media-priority.php` | New | `SGS_Media_Priority::resolve( $context, $facts )` (C5) | WP-3 |
| `includes/media-element-attrs-register.php` | Delete | Generator writes the attributes into `block.json`; ends the DB-versus-`block.json` gap; `sgs-blocks.php` require removed | WP-1, WP-15b |
| `includes/media-element-attributes.generated.php` | Delete | Attributes are committed instead | WP-1 |
| `includes/helpers-media-position.php` | Delete | §13 migration parses legacy keyword and string forms; 17 files use it | WP-1, Waves |
| `includes/image-controls.php` | Delete | 14 blocks declare `imageControls` (3 per T4); `sgsColourTreatment` becomes filter "White" (decision); `sgsHeight`, `sgsMaxWidth` map to Height and Max width | WP-15b |
| `includes/lottie-render.php::sgs_render_lottie` | Delete | Dead once the tier helper stops printing Lottie (not a §8 kind); file stays for `sgs_lottie_layer_add_source`, the Lottie effect's layer filter registered in `sgs-blocks.php` | WP-15b |
| `includes/render-helpers.php` | Rework | Remove requires for deleted files; atom requires stay | WP-15b |
| `includes/class-sgs-blocks.php` | Rework | Remove `image-controls.php` require; replace the two unconditional `media-element.css` enqueues with `media-base.css` loaded on pages with media | WP-2a |
| `sgs-blocks.php` | Rework | Remove the `media-element-attrs-register.php` require | WP-15b |
| `includes/class-sgs-container-wrapper.php` | Rework | Background code moves unchanged to `includes/class-sgs-background-layer.php` (New), then WP-8 swaps it to the renderer (edit once, not twice) | WP-0b, WP-8 |
| `includes/class-sgs-background-layer.php` | New | Wrapper's background code, no behaviour change | WP-0b |
| `includes/class-post-grid-rest.php`, `includes/product-card-builtin-render.php`, `includes/helpers-brand-logo.php` | Rework | Direct callers of `SGS_Media_Element` and loading helpers outside block folders; in no package today | Wave 3 |
| `includes/extension-attributes.generated.php` | Regenerate | Drops `sgsObjectFit`, `sgsObjectPosition`, `sgsHeight`, `sgsMaxWidth`, `sgsColourTreatment`; Integrator only | WP-15b |
| `theme/sgs-theme/functions.php` | Rework | Remove `preload_hero_image` (reads `backgroundImage`, `splitImage`); also flagged: inline `.wp-block-image` hover scale duplicates `core-blocks.css` (second hover-zoom path), and `add_missing_image_dimensions` can touch a renderer `<img>` | WP-2a |
| `theme/sgs-theme/inc/font-preloading.php` | Delete | Orphan (nothing requires it); `preload_hero_image` removed (decision); confirm nothing else lives in it | WP-15b |
| `includes/class-sgs-css-registry.php::sgs_collect_css` | Keep | Renderer returns `css`; caller passes it here | none |
| `includes/helpers-responsive.php`, `helpers-box.php`, `helpers-border-style.php`, `helpers-shadow-layers.php`, `helpers-shadow-hover.php`, `helpers-hover-state.php` | Keep | The atoms' emitter kinds call them (77 to 105 callers each) | none |
| `includes/helpers-css-safety.php`, `helpers-image-dimensions.php` | Keep | Length validator; width and height for id-less images | none |
| `includes/helpers-svg-kses.php`, `helpers-svg-document.php`, `helpers-svg-inline-attachment.php`, `svg-upload.php` | Keep | SVG kind's sanitising (AC-8); renderer calls them | none |
| `includes/helpers-instance-scope-hash.php::sgs_instance_scope_hash`, `helpers-scoped-instance-vars.php` | Keep | Scope-class hashing (which of the two §6.9 means is not verified) | none |
| `includes/helpers-end-shape.php::sgs_end_shape_url`, `includes/helpers-shadow-filter.php` | Keep | Mask data-URIs; masked shadows | WP-6 |
| `includes/shape-dividers.php`, `src/utils/shape-dividers.js` | Keep | Section edges, not media; untouched (§6.9) | none |
| `includes/media-top-tone.php`, `includes/lottie-upload.php` | Keep | Header ink tone; Lottie effect upload; not slot concerns | none |
| **JS** | | | |
| `src/components/ResponsiveOverride.js` | Reworked (done, WP-4 `25e384535`) | Names the true source ("Mobile: using Desktop"), dots with accessible names, Reset naming its tier, "Applies to all devices"; display only, every caller's props and stored values unchanged (AC-14 sample checked) | WP-4 |
| `src/components/ResponsiveControl.js`, `ResponsiveBoxControl.js`, `ResponsiveLengthControl.js` | Keep | Second wrapper family (68, 63, 27 importers); not touched; §9.2 wording "only per-device wrapper for media" stands for media panels | WP-4 |
| `src/components/SgsLengthControl.js` | Rework | Small: accept §9.4 unit sets and ceilings through props (no `ch`, `svh`, `dvh` today); do not fork | WP-4 |
| `src/components/SgsBorderControl.js`, `SgsBoxControl.js`, `ShadowControl.js` (+ `shadow-control/*`, `utils/shadow-*.js`) | Keep | Rehosted in Border and shape, Padding, Shadow | WP-4, WP-6 |
| `src/components/MediaPicker.js` | Rework | Becomes `MediaSlotField` (writes library alt on every pick today; spec: never on a device pick); 17 users | WP-4 |
| `src/components/FocalPositionField.js`, `src/utils/objectPosition.js` | Rework, delete | `FocalField` replaces the field; `{x,y}` is the one shape; the spec does not say 0 to 1 or 0 to 100 (decide in C1) | WP-4 |
| `src/components/MediaElementPanel.js` | Rework | Mounts §9.4's panels from the atoms' disclosure rules | WP-5 |
| `src/components/MediaElementControls.js` | Keep, extend | Base vocabulary the generator imports; atoms stay (T4 said delete; decision overrides) | WP-1 |
| `src/components/media/atoms/*.js`, `*.control.js`, `registry.js` | Keep, extend | Registry gains `responsive`, `paintNode`, `emitter`, `control`, `effects`, `since`; controls reused | WP-1, WP-4 |
| `src/components/media/MediaPanelLayout.js`, `DecorativeImagePanelLayout.js`, `HeroSplitMediaPanelLayout.js`, `ProductCardImagePanelLayout.js` | Delete | Replaced by `MediaElementPanel`'s §9.4 panels; `ProductCardImagePanelLayout` is already dead (0 importers) | WP-5, Waves |
| `src/components/media/controls/MediaBoxShapeControls.js`, `ObjectFitField.js` | Delete | Replaced by the Size fields, `FitField`, `ShapeField` | WP-4, WP-15b |
| `src/components/media/controls/MediaOverlayControls.js`, `MediaSvgPresentationControls.js`, `MediaTypeControl.js`, `VideoSourceControl.js`, `VideoCaptionsFields.js` | Replace | Kind tabs into `MediaSlotField`; Video and Captions into the Video panel; SVG into the SVG panel; overlay into Overlay and filters; in neither §8.2 nor §14.4 today | WP-4, WP-5 |
| `src/components/media/controls/LottieControls.js` | Delete | Imported only by the Lottie branch of `source.control.js`; Lottie is not a media kind | WP-15b |
| `src/components/media/canvasStyle.js` | Delete | Editor inline `style` AC-16 forbids; replaced by `mediaPreview.js` (New) | WP-4 |
| `src/utils/background-preview.js` | Rework | Split so `borderPaintPreview` survives; 14 importers, over the 400-line limit | WP-8 |
| `src/utils/border-preview.js`, `radius-preview.js`, `spacing-preview.js` | Keep | The editor twins the atoms use | WP-4 |
| `src/utils/css-length.js`, `src/utils/cssLength.js` | Rework | Near-twins for one job; merge once the emitter reads one (how they differ not verified) | WP-4 |
| `src/utils/sanitise-svg.js`, `src/utils/svg-allowlist.generated.js` | Keep | Editor SVG sanitiser (AC-8) | WP-2a |
| `src/components/MediaSizingPanel.js` | Delete | The mode design §6.4 rejects; card-grid, gallery, image-sequence, post-grid options move to Size and crop | WP-4, Waves |
| `src/components/MediaGalleryPicker.js` | Keep | Each picked item becomes `{source, alt, decorative, fit, focal}` (not in spec; add to WP-4) | WP-4 |
| `src/components/motion/AssetAtom.js` | Rework | Own `<MediaUpload>`; AC-18 will flag it | WP-10a |
| `src/blocks/extensions/image-controls.js` | Delete | Flag `supports.sgs.imageControls` goes; also edit `extension-roster.json`, `hide-extensions.js`, `index.js` | WP-15b |
| `src/blocks/extensions/media-elements.js` | Rework | Attributes now come from `block.json`, so the JS injection half goes; keep only what else it does (not verified) | WP-1 |
| `src/components/index.js` | Rework | Remove four exports, add the `media/` exports | WP-4 |
| `src/blocks/media/components/MediaStylingPanel.js` | Delete | Named in §8.2 without a path | WP-15b |
| `src/blocks/container/view.js`, `src/blocks/hero/view.js` (`swapVideoSrc`) | Rework | The two copies become one shared module (decision) | WP-8, WP-9 |
| `src/blocks/container/components/BackgroundPanel.js` | Rework | Position dropdown, art-direction attributes and Attachment replaced per §9.4; Surface panel stays separate | WP-8 |
| Raw `<MediaUpload>` in 15 files (audio, before-after, buybox `ConfiguratorPanel`, choice-flow `ChromePanel`, container `BackgroundPanel`, `extensions/inline-formats`, media `VideoPanel`, nav-drawer `ChromePanel` and `edit.js`, product-card, responsive-logo, store-selector, testimonial, timeline) | Replace or exempt | AC-18 cannot pass until each moves to `MediaSlotField` or is on an explicit exemption list; audio, store-selector, `ConfiguratorPanel`, choice-flow `ChromePanel`, nav-drawer and inline-formats are in no wave | WP-15a, Waves |
| **CSS** | | | |
| `assets/css/media-element.css` (generated, ~50 KB) | Replace | By one `assets/css/media-base.css` (New) plus optional overlay, video, mask, bg parts; deleted in Stage B (decision) | WP-2a, Stage B |
| `assets/css/media-atoms/*.css` (16 partials) | Delete | Replaced by `media-base.css`; deleted in Stage B (decision) | Stage B |
| `assets/css/media-base.css` | New | Base rules, loaded only on pages with media | WP-2a |
| `assets/css/extensions.css` | Rework | Delete only the `.sgs-has-image-controls` section | WP-15b |
| `assets/css/motion.css` | Keep | Comment fix only | WP-10a |
| About 36 block `style.css`/`.scss` with media rules (hero 21 matches, product-card 14, card-grid 12, gallery 11, option-picker 10, before-after 9); `src/blocks/hero/style.css::.sgs-hero__bg-img` | Rework | Each block deletes its own copy in its wave; no gate yet checks "no media rule left in a block stylesheet" | Waves, WP-9 |
| `theme/sgs-theme/assets/css/{utilities,core-blocks,core-blocks-critical,woocommerce}.css` | Keep | Core-block scope, not SGS slots | none |
| **Generators and gates** | | | |
| `scripts/generate-media-attributes.mjs` | Keep, extend | Reads the registry and each `supports.sgs.mediaElements`; writes `_generated: "media-atoms"` attributes into `block.json`; `--check`, `--block` (C8); today writes the PHP type map | WP-1 |
| `scripts/generate-media-stylesheet.mjs` | Delete | Goes with the partials (decision); `package.json` `prebuild`, `check:media-stylesheet` and `gates.json` ids `generate-media-stylesheet`, `check-media-stylesheet` removed | Stage B |
| `scripts/generate-extension-attributes.js`, `scripts/generate-svg-allowlist.js` | Keep | Generic; output shrinks | none |
| `scripts/tests/test-media-atom-parity.mjs`, `test-media-attr-parity.mjs`, `test-media-enum-vocabulary.mjs`, `test-media-injection-parity.mjs`, `scripts/check-media-atom-purity.js`, `scripts/check-media-disclosure-coverage.js` | Keep, extend | Spec §6.1: gates stay and are extended (T4 said delete; decision overrides); injection-parity re-pointed at generated `block.json` attributes (how not verified) | WP-15a |
| `scripts/check-media-breakpoints.js` | Rework | Re-point at `media-base.css` or drop with a reason (not in §8.2) | WP-15a |
| `scripts/surveys/check-image-controls-support.py` (+ `gates.json` id `surveys-check-image-controls-support`) | Delete | Flag removed | WP-15a |
| `scripts/inspector-scan/rules/37-media-no-handroll.js`, `38-media-attr-parity.js`, `39-media-control-coverage.js` (+ fixtures) | Delete | Replaced by a no-hand-rolled-media-emit rule, the generator `--check`, and AC-12/13 | WP-15a |
| `scripts/inspector-scan/rules/40-media-svg-sanitised.js` | Rework | Re-point at the renderer; backs AC-8 | WP-15a |
| `scripts/inspector-scan/rules/14-media-upload-check.js`, `18-decorative-image-aria.js`, `21-render-without-control.js`, `26-responsive-duplicate.js`, `core/components.js`, `core/golden.js`, `core/extensions.js`, `scripts/consistency/golden-controls.json` | Rework | Golden picker becomes `MediaSlotField`, golden focal `FocalField`; otherwise the scan treats them as unknown hand-rolls | WP-15a |
| `scripts/wiring-fingerprint/wf_media.py`, `wf_resolve.py`, `wf_tokens.py` | Rework | Read sites become `SGS_Media_Element::render` and the generated table; otherwise every media attribute reads as unread | WP-1, WP-15a |
| `scripts/check-dead-controls.js`, `check-universal-fit.js`, `check-control-helper-parity.py`, `check-shadow-clip.py` | Rework | Name removed symbols, flags or `media-element.css`; add the renderer and generated table as readers | WP-15a |
| `scripts/surveys/census-media-presentation.py` | Delete | One-off census | WP-15b |
| `scripts/gates.json` (12 media ids), `package.json` (`prebuild`, `prestart`, four `check:media-*`), `scripts/deploy_cache.py` | Rework | Remove or replace ids and scripts; add `media-base.css` to the cache list | WP-15a, WP-15b |
| `scripts/qa/lib/wp-stubs.php` | Rework | Remove the `sgs_render_media` stub (a §8.2 grep target) | WP-3 |
| `scripts/lint-responsive-controls.py` | Rework | Updated in the `ResponsiveOverride` commit | WP-4 |
| `gate-disposition.json` | New | Classifies every gate and test naming removed code as reused, changed or deleted; `check-gate-disposition.py --check` fails on an unlisted one | WP-15a |
| Tests naming removed code (`run-image-loading-attrs-standalone.php`, `run-media-atom-shadow-hover-standalone.php`, `run-media-hover-zoom-clip-standalone.php`, `MediaCoverCropSizesTest.php`, `*ImagePriorityTest.php`, `DecorativeImageLayerTest.php`, `ResponsiveLogo*Test.php`, `Hero*Test.php`, and the rest of the 22) | Port or delete | Port cases to the new renderer and `SGS_Media_Priority`; verdicts from file names, not read (T4) | WP-3, WP-15a |
| `tests/fixtures/media/matrix.json` | New | Shared PHP and JS fixture (C3); empty directory today | WP-2a |
| **Data and DB** | | | |
| `includes/data/icon-shapes.json` (+ `plugins/sgs-blocks/includes/helpers-icon.php::sgs_icon_outline_shapes`, `src/utils/icon-shapes.js`) | Rework | Becomes the one shape registry, extended per §7.5 (a second `media-shapes.json` is cut; divider paths stay out) | WP-6 |
| DB table `block_attributes` (`sgs-framework.db`) | Rework | §8.1: media rows get `css_property` and `css_element`; `sgs/media.overlay*` have NULL `css_property` today; `objectFit` has `css_element='wrapper'`, `tier_shape` NULL; `paint_node` column vs a registry field is for PS-1 to settle | WP-1 |
| `scripts/dbschema/{schema.sql,migrate.py,check_schema_drift.py,check_value_identity.py}` | Rework | Schema and drift gates follow the DB change | WP-1 |
| `scripts/attr-classification-overrides.json`, `scripts/behavioural-analyser/css-property-classifications.json`, `scripts/consistency/{setting-registry.json,attr-role-map.json}` | Regenerate | Generator supplies overrides; derived files are tracked regenerations, Integrator only | WP-1, WP-15a |
| `scripts/data/scalar-media-roles.json` + `scripts/dbschema/seed_reference_data.py` | Rework | `splitMedia*` becomes `split*`; roles for `mediaSource` and `mediaAlt` must be seeded | WP-1, WP-9 |
| `scripts/data/property-equivalents.json` | Rework | "Height on image becomes max-height" row contradicts §11; reconcile; add rows only if a draft property does not map one to one | WP-13 |
| `tests/fixtures/motion/render-paths.json` | Rework | Renamed attributes and media part names (§10.1) | WP-10a |
| **Cloner** | | | |
| `scripts/computed-route/lib/fill-media.mjs` (`imageSlots`, `schemaImageSlots`, `mediaSettings`, `idSetting`) | Rework | Goes silent at cutover (finds images by `image-alt` role or `<name>Url/Id/Alt` trios); must write `mediaSource` and `mediaAlt`, and ratio, fit, focal, shape | WP-13 |
| `scripts/computed-route/lib/fill-resolve.mjs`, `fill-equivalents.mjs`, `fill-same-box.mjs`, `fill-dimensions.mjs`, `fill-layer-box.mjs`, `skeleton-rules.mjs::mediaElement` | Rework | Resolver reads DB so new `css_property` rows route for free; `<picture>`, absorption and Height Fill rules (§11) have no code today | WP-13 |
| `scripts/computed-route/lib/apply-svg-file.mjs`, `calibrate-instances.mjs` | Rework | Read and write `backgroundImage*` by name (`IMAGE_SHAPING`) | WP-13 |
| `scripts/computed-route/calibration-fixtures.json`, `fixture-refs.mjs`, `data/clone-coverage.json`, `data/capabilities.json`, `scripts/computed-route/tests/*media*` | Rework | Name old attributes; the two data files are generated (regeneration command not verified) | WP-13, WP-14 |
| `scripts/computed-route/media-upload.mjs`, `lib/media-stock.mjs` | Keep | Independent of attribute names | WP-13 |
| `scripts/wp-build-page.js` | Rework | Validates only top-level type and enum today, so any object passes for `mediaSource`; descend into object `properties` declared on the attribute | WP-13 |
| `scripts/content-role-detect/detector5_image_alt_companion.py` (plugin path `plugins/sgs-blocks/scripts/content-role-detect/`) | Keep | Pairs alt and image attributes inside one `<img>` emission; for an adopted slot the generator writes the `Alt` companion (`{prefix}Source`) into the override entry directly, so detector5 needs no new pattern | WP-13 (decided 2026-11-10) |
| **Docs** | | | |
| `.claude/specs/02-SGS-BLOCKS.md`, `35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md`, `35-BLOCK-INSPECTOR-UX-STANDARD.md`, `32-COMPONENT-STYLING-TOKEN-CONTRACT.md`, `36-SGS-NAVIGATION-SYSTEM.md`, `48-CLONING-SYSTEM.md` | Edit | Current-truth text: atoms and slots, rules 37 to 39 and golden picker, `imageControls` routing, Spec 32 amendment, nav-drawer media copy, Fill's image part | WP-15b |
| `.claude/specs/38-SGS-MOTION-SYSTEM.md`, `38A-SGS-MOTION-MODEL.md` | Edit | Media part names; not named in WP-15b today | WP-15b |
| `.claude/rules/block-editor-controls.md`, `block-authoring.md`, `colour-emission.md`, `cloning-pipeline.md` | Edit | "Shared atom" row; media colour exemption wording; cloning-pipeline gets the §11 rules and "never write Fit or Focal when the box does not crop" | WP-15b |
| `.claude/dev-setup.md`, `CLAUDE.md`, `scripts/computed-route/README.md` | Edit | Old media names; Fill image row | WP-15b |
| `.claude/LEDGER.md` | Replace | Replaced at handoff, not hand-edited | WP-15b |
| `.claude/catalogues/helpers.md`, `catalogues/tooling.md` | Regenerate | Generated; regeneration command not verified | WP-15b |

### Appendix C: per control (§9.3)

Leaders compared: Gutenberg, Kadence, Stackable, Spectra, GenerateBlocks (T5, source code) and Elementor, Bricks, Webflow, Framer (T6, vendor docs). "SGS today" lists what exists now under `src/components/`.

| Setting | Control | Why | SGS today | Not verified |
|---|---|---|---|---|
| Alt / Title | Multi-line box, help "Describe the photo for someone who cannot see it."; labels "Alt text" (I), "Title (for screen readers)" (V, E; E warns when empty), aria-label (S); omitted when Decorative | Gutenberg and Kadence use a text area; Bricks shows the library value is overridable | `media/atoms/meaning.control.js` single-line `TextControl` "Alt text" | Stackable `ImageAltControl` body; Elementor's current field; Framer's location |
| Decorative | Checkbox beside Alt, hides it; not with a link | Gutenberg's "Mark as decorative" is the plainest; Webflow fuses it into the alt dropdown; hiding Alt avoids a contradictory state | `meaning.control.js` CheckboxControl "Decorative - hide from screen readers" | None |
| Poster | Media tile "Cover image before play" | Kadence and Stackable show a separate picker; the plain words are what clients lack | `source.control.js` "Poster image" | Gutenberg and Spectra poster labels; Webflow and Framer poster controls |
| Load priority | Three-way: Automatic, Load first, Load later (I, poster) | No product has a fetch-priority control; Bricks and Webflow use eager and lazy words, Kadence and Spectra a toggle | Nothing for images; "Lazy-load" for video only (`video-behaviour.control.js`) | Whether GenerateBlocks Pro has one; Elementor and Framer |
| Caption | None, From library, Write my own; text box only for the last | Elementor and Bricks use the same three-way pattern; every product also lets you type on the canvas | `media/atoms/caption.control.js` (text, tag) | Webflow, Framer |
| Caption tag | Select (Figure caption, Div), shown only when caption text exists | Hidden until relevant; today it shows with no caption | `caption.control.js` "Caption tag" | None |
| Link | `LinkPopoverControl`, I only | Gutenberg's popover is already familiar; Elementor and Bricks reveal sub-options per choice | `LinkPopoverControl.js` (SGS link standard), `media/atoms/link.control.js` | Spectra link UI; Webflow, Framer |
| Playback | Toggles Autoplay, Muted, Loop, Show controls, plus a pause button option off by default; Muted and Inline lock on with Autoplay; embeds add start at | Elementor's labelled toggles are clearest; Webflow keeps the pause button on for WCAG 2.2.2; Bean's standing rule | `video-behaviour.control.js` (Autoplay, Muted, Plays inline, Loop, Show controls, Lazy-load) | Spectra video controls; Framer; Bricks full page (search extract only) |
| Captions file | Video-only file field, per device inside the Source | WCAG captions; kept although no draft uses it (T-merge) | `VideoCaptionsFields.js`; `videoCaptions*` attributes | No product comparison made |
| Aspect ratio | Chips: Photo's own, 1:1, 4:3, 3:2, 16:9, 4:5, 3:4, 9:16, 21:9, Custom; embeds 16:9, 4:3, 21:9, 9:16; merges `useSettings('dimensions.aspectRatios')`; not when Height is Match its space | Every client-facing tool uses named presets with a Custom entry; only GenerateBlocks uses raw text; chips show all options | `MediaSizingPanel.js` select; `MediaBoxShapeControls.js` mode toggle (§6.4 removes) | Gutenberg's full preset list; Framer; Elementor image ratio |
| Width, Height | Lengths with Auto; Height also Match its space; help text when Height alone is set | Number plus unit with visible "auto" is the Stackable and Gutenberg pattern; Match its space is SGS-original | `SgsLengthControl.js`, `ResponsiveLengthControl.js`, `MediaSizingPanel.js` | GenerateBlocks width control type; Bricks and Framer; Kadence image height |
| Limits | Four lengths in a collapsed group "Smallest and largest size" | Only GenerateBlocks exposes all four; clients rarely need them | `SgsLengthControl.js` available; no min or max media fields | Kadence Advanced tab; Elementor min height |
| Fit | `FitField` icon chips with plain captions: Crop to fill, Show all, Stretch, Actual size, Never enlarge, Tile on image backgrounds | Gutenberg's toggle group is nearest; CSS words such as `scale-down` are what the field gets wrong | `ObjectFitField.js` select; `object-fit.control.js` with help lines | Kadence; Framer Fill and Fit labels |
| Focal | `FocalField`: drag or click, X and Y 0 to 100, quick picks, Reset; hidden when the box does not crop or Fit is `fill` | The drag picker is the field standard on images; position dropdowns are what clients get on backgrounds | `FocalPositionField.js` (wraps `FocalPointPicker`), `focal-point.control.js` | `KadenceFocalPicker` internals; Framer, Elementor (stored 0 to 1 per FR-49-4, shown as percent) |
| Alignment, Order | Alignment: three icon buttons per device; Order: number stepper | Icon buttons match Spectra, Stackable and the toolbar convention; T-merge chose a stepper for Order (T5 had suggested "Show first / Show last") | `LogicalAlignControl.js`, `TextAlignTierControl.js`; no Order control | Stackable's alignment control type; any product's Order control (none documented) |
| Corners | One slider, link for four corners, Round preset; omitted with a mask shape, circle, ellipse or pill | A single slider is Stackable's and the simplest; Webflow shapes by radius | `SgsBorderControl.js` radius; `MediaBoxShapeControls.js` (None, Rounded, Circle, Square) | Gutenberg label; Bricks, Framer |
| Border width | Width first; omitted with a mask shape | Matches WordPress's panel and Elementor's reveal | `SgsBorderControl.js`, `TierBorderControl.js`, `SgsBoxControl.js` | Gutenberg labels; Stackable border; Bricks, Framer |
| Border style, colour | Style chips (Solid, Dashed, Dotted) and colour swatch, shown once a width is set | Same reveal pattern | Same components | Same |
| Shape | `ShapeField` grid drawn on the client's own photo: None, Circle, Ellipse, Pill, mask shapes (three blobs kept); embeds circle, ellipse, pill only | Stackable's thumbnail grid beats Kadence and Spectra name dropdowns; Bricks uses a name list | `MediaBoxShapeControls.js` (None, Rounded, Circle, Square only) | Webflow, Framer; mask upload is deferred to Stage C |
| Shadow | Preset chips from `useSettings('shadow.presets')`, then Custom opening `ShadowControl` | Only Stackable ships presets; a client can use them without blur and spread | `ShadowControl.js` layered editor (Normal, Hover); `shadow.control.js` | Gutenberg panel; Stackable preset names |
| Padding | Four-side linked box per device; omitted on embeds | Linked box is familiar from core | `media-padding.control.js`, `SgsBoxControl.js` | Stackable, Framer; no image-level evidence in Elementor, Bricks |
| Background | Colour swatch, theme palette first, shown when the photo does not fill its frame | Same pattern across Kadence, Stackable, GenerateBlocks | `SgsColourPanel.js`, `GradientCapableColourControl.js`, `colour-picker/` | Spectra; Webflow has none on media elements |
| Overlay | Colour or Gradient, then "Overlay strength" slider (starting 40; hover form) once a colour is set; blend after | Every product uses a slider; "strength" reads better than "opacity"; Bricks has colour only | `GradientOverlayControl.js`, `MediaOverlayControls.js` | Elementor image overlay, Webflow, Framer |
| Photo opacity, Colour | Opacity (per device, Reset) slider "Photo opacity"; Colour chips Natural, Black and white (with a strength slider) and White (decision) | Where present they are sliders; plain words beat CSS names | `opacity.control.js` RangeControl; no greyscale or blur media control (`SurfaceGroundControls.js` is surfaces only) | Others |
| Blend | Select with plain hints (Multiply "darker", Screen "lighter") under More options, I V | All four builders use a CSS-name select; none has helper wording | `MediaOverlayControls.js` (13 names) | Elementor, Webflow, Framer, Gutenberg: none documented |
| Typography: Caption and colour | Caption typography family and colour, shown when a caption exists | Reuses SGS typography; no product comparison made | `caption*` typography attributes (T1); `media/components/TypographyPanel.js` | No product comparison made |
| Typography: Video time | Player readout typography, shown while the player shows | Spec-defined for the player readout | `videoTime*` typography (T1) | No product comparison made |
| SVG panel | Layer order, text shadow, SVG parts (its animation is Effects' SVG loop); opacity and min height not duplicated | Inline SVG needs its own settings; the atom's duplicate opacity goes | `svg-presentation.control.js`; `MediaSvgPresentationControls.js`; duplicate opacity and min-height controls (B, not re-verified) | No product comparison made |
| Repeat, Tile size | Chips Don't repeat, Repeat across, Repeat down, Repeat both; Tile size length shown only when Fit is Tile; `space` and `round` cut | Gutenberg's single toggle is simplest; `repeat-x` is unreadable to clients; Webflow, Stackable, Spectra all offer repeat and size | None found in `src/components/media/` | Whether `MediaSizingPanel.js` carries tile options; Framer detail |
