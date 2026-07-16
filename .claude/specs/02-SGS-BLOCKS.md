---
doc_type: spec
spec_id: 2
spec_version: "1.5"
project: small-giants-wp
title: SGS Blocks — Custom Gutenberg Block Library
status: shipped
last_verified: 2026-07-14
authors: Bean + Claude
session_date: 2026-02-01
status_history:
  - 2026-02-01: initial draft
  - 2026-05-22: Phase 6 markup-examples + apiVersion 3 audit shipped
  - 2026-05-24: frontmatter added per Phase 13 spec template
  - 2026-06-12: blocks-layer + TypographyControls standard + product-search/filter-search/collapsible-text sync
  - 2026-06-13: testimonial attr names corrected to match block.json; converter routing updated (D212 shipped); notice-banner save.js corrected to InnerBlocks.Content; stale WIP warning on testimonial-slider removed; 29-block hardcode replaced with DB query
  - 2026-07-13: header/footer/nav system design-gate APPROVED (Bean sign-off) — `sgs/site-header`, `sgs/site-footer`, `sgs/adaptive-nav` added as DESIGN-APPROVED/build-pending specialised container composites; `sgs/mobile-nav` P0 unclickable-drawer bug SHIPPED + live-verified; `no-header-footer-block.py` rule evolved to permit these 3 slugs
  - 2026-07-14: reconciliation pass — `sgs/site-header`, `sgs/site-footer`, `sgs/adaptive-nav` are now BUILT + LIVE (D323-D333, §S9 11/11), pending final Bean sign-off; see `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` for current status
---

# SGS Blocks — Custom Gutenberg Block Library

> **2026-07-13 update — Header/Footer/Navigation SYSTEM design-gate APPROVED (Bean sign-off, all recommended defaults).** Source of truth: `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`. Three NEW specialised container-composite blocks added to the roster — **BUILT + LIVE** (D323-D333, §S9 11/11; `status='built'` in the DB, `container_kind` populated; pending final Bean sign-off): `sgs/site-header`, `sgs/site-footer` (section-KIND, delegate to `SGS_Container_Wrapper` exactly like `sgs/card-grid`/`sgs/feature-grid` — 3 optional named rows + a typed element palette; live inside the `header`/`footer` template parts), `sgs/adaptive-nav` (layout-KIND — one menu source that collapses nav-bar→burger across 4 tiers incl. custom-px, mega-menu drill-down on mobile, off-canvas escape hatch). **`sgs/mobile-nav`** (the existing off-canvas drawer) is NOT new but its **P0 unclickable-drawer bug is FIXED and live-verified** (2026-07-13): `view.js` was setting `inert` on `.wp-site-blocks`, and the drawer was a DOM descendant of that element — so the drawer froze itself; fix re-parents the drawer to be a direct child of `<body>` before `showPopover()`. The drawer is also being hardened to the GOV.UK-grade a11y contract (focus trap, ESC-close, backdrop-dismiss, body-scroll-lock, redundant state signalling, configurable SR labels). **Header/footer REMAIN WordPress template parts (Spec 17 owns this architecture)** — these 3 blocks are the specialised CONTAINER used *inside* the parts, not a monolithic header/footer block; `no-header-footer-block.py` evolves to allow `src/blocks/{site-header,site-footer,adaptive-nav}/` while still blocking bare `header`/`footer`/`nav` block slugs. Full FR set + the per-breakpoint override model + the never-overflow Cluster+clamp layout + global-defaults/Site-Info access model live in **Spec 17** (`17-HEADER-FOOTER-ARCHITECTURE.md`) — this spec does not duplicate those FRs, see the new "Header / Footer / Navigation System" section below for the block-roster summary + cross-references. Phasing (P0 drawer fix SHIPPED → P1 site-header → P2 adaptive-nav → P3 site-footer → P4 per-device polish → P5 cloning-pipeline Part 2) is tracked in the design-gate doc + `.claude/state.md`/`next-session-prompt.md` (do not cache phase-completion status here — it drifts).
>
> **2026-06-12 update (D213/D214 — Spec 30 P2 shop layer).** Three new SGS blocks shipped: `sgs/product-search` (FR-30-5 combobox search + hardened REST endpoint + `inline`/`icon` display modes + no-JS GET fallback, v1.1.0), `sgs/filter-search` (FR-30-6 type-to-find narrowing for ≥16 attribute terms, Baymard threshold, `woocommerce/product-filter-attribute` ancestor), `sgs/collapsible-text` (D213 — operator SEO copy, accessible CSS line-clamp read-more, always SSR'd, i18n toggle labels). Two pre-existing blocks now documented below: `sgs/buybox` (FR-30-7/D210 — PDP configurator wrapper composing `sgs/option-picker` pickers + cart proxy) and `sgs/content-collection` (FR-24-4/D210 — query-driven product grid with forwarded `showPickers`/`ctaBehaviour`/`showLadder`). **Blocks registered clean via `/sgs-update` (0 new = already registered from their feature commits).** `02-SGS-BLOCKS-REFERENCE.md` unchanged.
>
> **2026-06-11 update (D209 — R-31-13 block-quality programme + TypographyControls).** Shared `TypographyControls` component + `sgs_typography_css_rule()` helper are now MANDATORY for all per-element typography (see Block Customisation Standard below). `announcement-bar` RETIRED → `notice-banner` with `displayMode=announcement`. `sgs/testimonial` rebuilt as a 7-variant typed-attr block (D206). `/sgs-update` reconciled the block roster post-retirement (live count is DB-authoritative — query `/sgs-db` or see `02-SGS-BLOCKS-REFERENCE.md`; never hard-code it here).
>
> **Session B 2026-05-22 update — Phase 6 (commit `d307c8b0`).** Markup examples seeded for 69 SGS blocks (56 auto-generated from `block.json` defaults via `plugins/sgs-blocks/scripts/generate-markup-examples.py`; 13 hand-authored composite examples for sgs/hero, sgs/card-grid, sgs/tabs, sgs/testimonial, sgs/accordion, sgs/gallery, sgs/post-grid, sgs/form, sgs/form-row, sgs/pricing-table, sgs/countdown-timer, sgs/team-member, sgs/multi-column). 4 DB rows reference blocks with no source `block.json` file (parked as P-6-MISSING-BLOCK-JSON). Block-supports audit found ZERO gaps — the original 2:1 under-documentation prediction was wrong; 360 active rows + 44 flagged `is_stale=true` (retired/planned blocks). 87 content-bearing attributes across 40 blocks now carry `"role": "content"`. All 69 source blocks already at `apiVersion: 3` — no bulk bump needed. `wp_set_script_module_translations()` wired in `class-sgs-blocks.php` registration loop for 25 blocks using `viewScriptModule`. Lucide icon delivery untouched (sibling REST file `class-sgs-lucide-icons-rest.php` shipped defensively with double guards; existing `sgs_get_lucide_icon()` shim still canonical). Device-visibility coexistence rule documented in `includes/device-visibility.php`. Sandybrown upgraded to **WP 7.0** mid-session — `wp_set_script_module_translations` + `WP_REST_Icons_Controller` + `wp_get_connector` now natively available.
>
> **Last block-architecture update: 2026-05-22.** Phase 1.5 of the architecture programme added inserter-discoverable variations + block styles + default-style declarations to 12 composite blocks (hero, card-grid, cta-section, testimonial, team-member, pricing-table, accordion, tabs, gallery, post-grid, form, info-box). 40 variations + 30 styles total. Registered via PHP sibling files under `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php` auto-discovered by `class-sgs-block-variations.php` loader. Variations register via `add_filter('get_block_type_variations', ...)` (WP 6.5+ canonical PHP path); block styles via `register_block_style()`. Each variation declares default style via `className` attribute. See "Block Variation + Style Registration" section below. Also (2026-05-22): `core/button` double-`is_default` bug fixed in `theme/sgs-theme/functions.php` — `sgs-accent` no longer claims default, leaving WP's native `fill` as the single default.
>
> **Previous architecture update (2026-05-19):** All 10 previously-static SGS blocks (certification-bar / counter / heading / label / feature-grid / multi-button / mobile-nav / notice-banner / process-steps / trust-bar) converted to dynamic — save returns null, render.php drives 100% of frontend output, each with `deprecated.js` shim for backward compat on existing posts. `_STILL_STATIC_SGS_BLOCKS = frozenset()` (cv2 A1 guard is now a no-op). Container block extended with advanced backgrounds (4 modes: image / video / parallax+ken-burns / gradient-overlay; 15 new attrs; view.js + render.php + style.css). Hero block.json defaults removed (Section H6 dual-cascade anti-pattern fix). Framework deployed to palestine-lives.org (commit `a9083ca9`). Per-block attribute counts in `02-SGS-BLOCKS-REFERENCE.md` regenerate on every `/sgs-update`.

## Purpose

A WordPress plugin providing a curated library of custom Gutenberg blocks purpose-built for Small Giants Studio client sites. Replaces Spectra Pro with blocks that produce clean, semantic markup, respect the SGS Theme design tokens, and render correctly across all breakpoints.

> **Per-block attribute reference is auto-generated:** see [`02-SGS-BLOCKS-REFERENCE.md`](02-SGS-BLOCKS-REFERENCE.md). Regenerate via `python plugins/sgs-blocks/scripts/generate-block-reference.py`. **This file** (`02-SGS-BLOCKS.md`) covers architectural patterns, customisation standards, and build status — the live reference covers attribute detail.

---

## Plugin Structure

```
sgs-blocks/
├── sgs-blocks.php               # Plugin bootstrap (registration, block loading)
├── package.json                  # Node dependencies (@wordpress/scripts, etc.)
├── webpack.config.js             # Build config (or wp-scripts default)
│
├── src/
│   ├── blocks/
│   │   ├── button/               # ★ Canonical SGS button (atomic) — replaces all uses of core/button. See specs/11-SGS-BUTTON-ARCHITECTURE.md
│   │   ├── multi-button/         # ★ Button container (accepts 0..N sgs/button via InnerBlocks). Replaces core/buttons inside SGS composite blocks
│   │   ├── container/            # Layout container (flexbox/grid)
│   │   ├── hero/                 # Hero section (multiple variants) — refactor to InnerBlocks composition queued (spec 11)
│   │   ├── info-box/             # Info/feature card
│   │   ├── counter/              # Animated statistic counter
│   │   ├── trust-bar/ — ACTIVE (rebuilt from trust-badges, renamed D123; typed mode + icon resolver D214; absorbed certification-bar D95). NB the ORIGINAL composite trust-bar was retired D72 — slug reused. See §5.
│   │   ├── card-grid/            # Flexible image+content grid (overlay/card variants; wc-product mode D204)
│   │   ├── testimonial/          # Single testimonial — 7-variant typed-attr rebuild (D206). See §7.
│   │   ├── testimonial-slider/   # Multi-testimonial carousel
│   │   ├── cta-section/          # Call-to-action section
│   │   ├── icon-list/            # Checkmark/icon list
│   │   ├── process-steps/        # Horizontal step timeline
│   │   ├── accordion/            # Expandable FAQ/content sections
│   │   ├── tabs/                 # Tabbed content panels
│   │   ├── brand-strip/          # Logo/brand carousel strip
│   │   # certification-bar/ — RETIRED 2026-05-29 D95, merged into trust-bar (badgeStyle variants)
│   │   ├── notice-banner/        # Inline banner — now supports displayMode=announcement (D209, absorbs retired announcement-bar)
│   │   # announcement-bar/ — RETIRED D209 (2026-06-11). Use notice-banner displayMode=announcement instead.
│   │   ├── whatsapp-cta/         # WhatsApp floating button + contextual CTA
│   │   ├── pricing-table/        # Service/pricing comparison table
│   │   ├── modal/                # Lightbox/modal overlay
│   │   ├── google-reviews/       # Google Business Profile reviews display
│   │   ├── mega-menu/            # Block-based mega menu for Navigation block
│   │   ├── decorative-image/     # Absolute-positioned decorative floating images
│   │   ├── option-picker/        # Radio-group pill chooser (sgs-interactive; atomic). Spec 24 FR-24-15; C7 group-label controls D206
│   │   ├── cart/                 # WooCommerce cart count badge v1 (sgs-interactive)
│   │   ├── content-collection/   # ★ Query-driven product grid. Spec 24 FR-24-4/5/6; showPickers/ctaBehaviour/showLadder attrs (D210)
│   │   ├── buybox/               # ★ PDP configurator — option-picker→cart bridge (FR-30-7/D210). sgs-content category.
│   │   ├── product-search/       # ★ NEW FR-30-5/D214 — Accessible combobox search + REST /sgs/v1/product-search + inline|icon displayMode (v1.1.0)
│   │   ├── filter-search/        # ★ NEW FR-30-6/D214 — Type-to-find filter narrowing (≥16 terms threshold, woocommerce/product-filter-attribute ancestor)
│   │   ├── collapsible-text/     # ★ NEW D213 — Operator SEO copy; CSS line-clamp read-more; always SSR'd; i18n toggle labels
│   │   ├── mobile-nav/           # Off-canvas drawer (existing). P0 unclickable-drawer bug FIXED 2026-07-13 (drawer re-parented to <body> so background `inert` no longer freezes it); GOV.UK-grade a11y contract in progress. See specs/17-HEADER-FOOTER-ARCHITECTURE.md.
│   │   ├── site-header/          # ★ BUILT + LIVE (D323-D333, §S9 11/11) — specialised header container, section-KIND, delegates to SGS_Container_Wrapper. See "Header / Footer / Navigation System" section below + specs/17-HEADER-FOOTER-ARCHITECTURE.md
│   │   ├── site-footer/          # ★ BUILT + LIVE (D323-D333, §S9 11/11) — specialised footer container, section-KIND, delegates to SGS_Container_Wrapper. Rows + up-to-N columns. See same section
│   │   ├── adaptive-nav/         # ★ BUILT + LIVE (D323-D333, §S9 11/11) — one-menu-source adaptive nav (bar→burger, 4 tiers incl. custom-px), layout-KIND, mega-menu drill-down. See same section
│   │
│   ├── components/               # Shared React components for editor UI
│   │   ├── TypographyControls.js # ★ MANDATORY — shared per-element typography UI (D209). See Block Customisation Standard.
│   │   ├── ResponsiveControl.js  # Breakpoint switcher (mobile/tablet/desktop)
│   │   ├── DesignTokenPicker.js  # Colour picker that reads theme.json tokens
│   │   ├── SpacingControl.js     # Margin/padding control with presets
│   │   └── AnimationControl.js   # Animation type/trigger selector
│   │
│   ├── extensions/               # Block extensions (applied to all/multiple blocks)
│   │   ├── animation.js          # Scroll-triggered animation extension
│   │   ├── responsive-visibility.js  # Show/hide per breakpoint
│   │   └── custom-spacing.js     # Enhanced spacing controls
│   │
│   └── utils/
│       ├── tokens.js             # Read design tokens from theme.json at runtime
│       └── responsive.js         # Responsive class generation helpers
│
├── build/                        # Compiled output (generated by wp-scripts)
│
└── includes/
    ├── class-sgs-blocks.php      # Main plugin class
    ├── block-categories.php      # Register "SGS" block category
    └── render/                   # Server-side render callbacks
        ├── counter.php
        ├── testimonial-slider.php
        └── ...
```

---

## Button architecture (sgs/button + sgs/multi-button)

Decided 2026-05-03 — full spec at [`11-SGS-BUTTON-ARCHITECTURE.md`](11-SGS-BUTTON-ARCHITECTURE.md). Summary:

- **`sgs/button`** is the canonical button block. Replaces all uses of `core/button` inside SGS blocks. 87 attributes (full surface — see spec 11 §8 comparison vs Spectra/Kadence/Stackable/core).
- **`sgs/multi-button`** is the container. Accepts 0..N `sgs/button` instances via InnerBlocks (restricted to children of type `sgs/button`). Per-breakpoint layout direction + alignment. Gap is provided by the shared `ContainerWrapperControls` gap control (raw-px free-input, `sgs_container_gap_value()`) — no separate per-block gap control.
- **Composition pattern:** every composite block that renders CTAs (`sgs/hero`, `sgs/cta-section`, `sgs/feature-grid`, etc.) exposes an InnerBlocks slot whose default template is `sgs/multi-button` containing 2 `sgs/button` instances. **NEW SGS BLOCKS WITH CTAs MUST USE THIS PATTERN** — never render CTAs internally via per-block `ctaPrimary*` attributes. **RECORDED EXCEPTION (Bean sign-off 2026-06-10, FP-H design gate):** `sgs/product-card` is a BUILT-IN-ELEMENT card — its CTA (and every other commerce element) renders from the block's own typed attributes via the element-MIRROR pattern (the CTA mirrors `sgs/button`'s control set through shared helpers; auto-propagation: a new `sgs/button` capability is a gap candidate on the mirror), with ZERO InnerBlocks in typed mode (no deprecation path needed — Bean 2026-06-10: the typed card is not yet used in any content). CTA model (approved): max 2 text buttons (1 primary + 1 secondary), behaviours add-to-basket / buy-now / learn-more, express-pay as a phase-2 gateway-rendered toggle. See `.claude/reports/wave2/FP-E-FP-H-DESIGN-GATE-2026-06-10.md`.
- **Preset binding** via `inheritStyle: 'primary' | 'secondary' | 'outline' | 'custom'` reads from `wp_options.sgs_button_presets`, mirrored to `theme.json` `settings.custom.buttonPresets`. Three editing paths (Settings page, Site Editor block-style-variations, theme.json) write the same backing store.
- **Existing CTA-rendering blocks** (sgs/hero etc.) are refactored to InnerBlocks composition with deprecation paths preserving existing post content. See spec 11 §5.
- **Render-time sanitisation (XS-9.2):** `sgs/button` `render.php` uses a tightened `wp_kses` allowlist that **excludes `<a>`** — the wrapper anchor is emitted by the render path itself, so any nested `<a>` inside button content is a malformed input. URL scheme allowlisting (`http`, `https`, `mailto`, `tel`) is enforced at the converter layer when the button is composed from a mockup. Prevents nested-anchor markup and javascript:/data: URI injection.

## Pipeline / extraction

Mockup HTML → SGS block markup pipeline at [`31-UNIVERSAL-CLONING-PIPELINE.md`](31-UNIVERSAL-CLONING-PIPELINE.md) (canonical cloning-pipeline spec). Key rules:

- Fingerprints auto-derived from `block.json` — never hand-written. Adding an attribute to a block automatically grows the recogniser's coverage.
- Pull all CSS every run, classify into block-attribute / universal-handled / one-time-custom. No silent loss.
- Forward-only emission. WP itself owns canonical serialisation (via composition + native render functions).
- Composition emitter outputs `sgs/multi-button` + `sgs/button` markup for any CTA pattern detected.

## Block Specifications

> **Build route (name the tool — don't hand-roll):** `/sgs-wp-engine` for SGS block work, or the **`wp-sgs-developer` agent** for a heavy build; `/wp-block-development` for core-WP block-API questions (block.json, supports, bindings); `/wp-interactivity-api` for `view.js` directives.
> **Before claiming an attribute is missing or reading a roster, query the DB — never the prose below:** `/sgs-db` or `/wp-blocks schema <slug>` (R-31-8). The per-block attribute tables in this spec + `02-SGS-BLOCKS-REFERENCE.md` are **generated** — if one is wrong, fix the generator (`/sgs-update`), never the file.
> **Every new/edited block is gated by Spec 32** (no inline `style=`; skip-serialisation + scoped CLASS-level `.{uid}.{block-class}` CSS; box-object attrs via BoxControl). The per-block definition-of-done is `.claude/plans/block-migration-DONE-checklist.md` (11 end conditions). **No `deprecated.js`, no version bumps pre-production (D271/D293).**
> **Verify on the live page, not the emit:** `/visual-qa` + `/a11y-audit`, or Playwright MCP for bespoke probes.

### Each block follows this pattern:

```
block-name/
├── block.json          # Block metadata, attributes, supports, scripts, styles
├── edit.js             # Editor component (what users see in Gutenberg)
├── save.js             # Static save (dynamic blocks return null; InnerBlocks wrappers return <InnerBlocks.Content />)
├── render.php          # Server-side render (for dynamic blocks) — emits the block's scoped <style>
├── editor.css          # Editor-only styles
├── style.css           # Frontend + editor styles
├── view.js             # Frontend interactivity (viewScriptModule, optional)
└── index.js            # Block registration entry point
```
(No `deprecated.js` — deleted plugin-wide, D271.)

---

## Block Details

### 1. Container (`sgs/container`)

**Replaces:** Spectra Container block

**Purpose:** Flexible layout wrapper — the fundamental building block for all page sections.

**Version:** 0.2.0 (bumped from 0.1.0 — WS-1 A1 D159 2026-06-03; added `contentWidth` + `__inner` wrapper pattern)

**Attributes:**
- `layout` — flex | grid | stack (default: stack)
- `columns` — 1-6 (for grid layout)
- `columnsMobile` — 1-3 (grid columns on mobile)
- `columnsTablet` — 1-4 (grid columns on tablet)
- `gap` — raw CSS length string (e.g. `"16px"`, `"1.5rem"`); rendered via `sgs_container_gap_value()`. **2026-06-07 (commit 668e26ad):** switched from spacing-preset slug to raw-px free-input; `blockGap` native support removed (was inert). Composite/wrapper blocks (trust-bar, card-grid, feature-grid, gallery, multi-button, post-grid) no longer carry their own gap control — all use this shared one via `ContainerWrapperControls`.
- `padding` — per-side spacing with responsive overrides
- `margin` — per-side spacing with responsive overrides
- `backgroundColour` — token slug or custom hex
- `backgroundGradient` — CSS gradient string
- `backgroundImage` — media ID + URL
- `backgroundOverlay` — colour + opacity for image overlays
- `borderRadius` — preset slug
- `shadow` — preset slug
- `maxWidth` — content | wide | full | custom px
- `minHeight` — CSS value
- `verticalAlign` — start | centre | end | stretch
- `htmlTag` — section | div | article | aside | main
- `contentWidth` — string (CSS max-width value, default `""` = full-bleed). When set, render.php emits an inner `<div class="sgs-container__inner">` with `max-width: {contentWidth}; margin-inline: auto` — allowing the outer box to remain full-bleed (background, padding) while capping the readable content width. Guard: only emits `__inner` when `layout === '' || layout === 'stack'` (i.e. not a grid/flex layout that manages its own content width). "Content width" inspector control exposed in edit.js. **WS-1 A1 / D159.** **Cloning routing (D194):** `__inner` is a fake wrapper — when cloning a draft, the converter FOLDS it structurally (slug-None direct descendant, Spec 22 §FR-31-4.1) and maps its `max-width`+`margin:auto` to this `contentWidth` attr **by CSS signature, never by the `__inner` class name** (D85 removed inner/content aliases for causing wrong collapse). `canonical_slot` is content-routing metadata (child-block-vs-scalar fork, gated by `role`; Spec 22 §FR-31-2.1) and is **inert for structural-CSS layout routing** — the layer is detected name-free via `{layer-prefix}+property_suffixes` (Spec 22 §FR-31-21).

**Supports:** align (wide, full), anchor, className, colour (background, text), spacing (margin, padding)

**Inner blocks:** Yes — accepts any blocks as children.

**containerKind (NEW 2026-06-02 — D152 / Workstream A):** `block_composition.container_kind` column introduces a 3-KIND model for all container-bearing blocks:

| Kind | Meaning | Editor controls exposed |
|---|---|---|
| `section` | Full-bleed outer section wrapper — full surface: background (image/video/overlay/SVG/animation), shape dividers, width/contentWidth, gap (responsive), layout (grid/flex), min-height, grid-item defaults, shadow | All `ContainerWrapperControls` panels |
| `layout` | Inner layout wrapper — grid/flex arrangement + width/contentWidth + gap. No background/overlay/SVG/shape layers. | Layout + Width panels only |
| `content` | Content-level composite — width/contentWidth + inner padding/spacing only. No grid/bg layers. | Width + Spacing panels only |

`containerKind` is declared in each composite block's `block.json` as `supports.sgs.containerKind`. It gates which `ContainerWrapperControls` panels render in the editor and which layers the shared `SGS_Container_Wrapper::render()` PHP helper emits at runtime. `sgs/modal` and `sgs/mobile-nav` carry `supports.sgs.containerMirror: false` and are excluded from the roster entirely (their outer shell is a Popover/dialog, not a container). **`sgs/site-header` and `sgs/site-footer` (DESIGN-APPROVED 2026-07-13, build-pending) ARE on this roster as `containerKind: section`; `sgs/adaptive-nav` as `containerKind: layout`** — see "Header / Footer / Navigation System" section below.

**Composite-mirror rule (R-31-9 / D152, BLOCK-SIDE COMPLETE D167 2026-06-04):** Every composite block in the DB container-mirror roster (query: `SELECT block_slug FROM block_composition WHERE container_kind IS NOT NULL`) mirrors `sgs/container`'s wrapper capabilities via the shared helper `includes/class-sgs-container-wrapper.php`. No per-block reimplementation — the helper handles all rendering. When `sgs/container` gains a new capability, `/sgs-update` Stage 11 propagates it to all roster blocks. Canonical procedure: Spec 22 §FR-31-21 + `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md`.

**Render:** **Dynamic** — `render: file:./render.php`. Server-side rendering needed for layout/columns/gap responsive logic and `useInnerBlocksProps` integration. `save.js` returns `<InnerBlocks.Content />`.

---

### 2. Hero (`sgs/hero`)

**Purpose:** Page hero section with headline, sub-headline, CTAs, and background image/video/SVG.

**Tier:** `class-section` (recognised at voter confidence 1.0 by `sgs-hero` BEM-block; declared via `supports.sgs.is_section_root: true` in `block.json`; populated into `blocks.tier` column by `/sgs-update`). See D107 (voter rewrite) and [`00-naming-conventions.md` §3.2](00-naming-conventions.md).

**Rich-text content (XS-9.1, D104):** Inner content rich-text uses `sgs/heading` with `wp_kses_post()` sanitisation — supports inline emphasis/strong/anchor while blocking script/style tags.

**Variants:**
- `standard` — Full-width, text over background image/gradient
- `split` — Two columns (text left, image/media right)
- `video` — Background video with text overlay
- `svg-animated` — SVG animation background (solves the Indus Foods SVG problem)

**Attributes:**
- `variant` — standard | split | video | svg-animated
- `headline` — RichText
- `subHeadline` — RichText
- `alignment` — left | centre
- `backgroundImage` — media object
- `backgroundVideo` — media object (MP4/WebM)
- `svgContent` — SVG markup string (for animated backgrounds)
- `overlay` — colour + opacity
- `badges` — array of { number, suffix, label, position, style } objects (floating badges overlaid on hero image)
  - `number` — string (e.g., "60", "From £75") — displayed large
  - `suffix` — string (e.g., "+") — appended to number
  - `label` — string (e.g., "Years Supplying UK Kitchens") — displayed small below number
  - `position` — bottom-left | bottom-right | top-left | top-right
  - `style` — light (white card) | accent (gold card) | success (green card)
- `minHeight` — CSS value (default: 520px desktop, 400px mobile)
- `ctaPrimary` — { text, url, style }
- `ctaSecondary` — { text, url, style }

**Render:** Dynamic `render.php` — server-renders the HTML, lazy-loads video/SVG via `viewScriptModule`.

**Responsive:**
- Desktop: full layout as designed
- Tablet: reduce headline size, stack badges vertically
- Mobile: single column, stacked, badges below headline, min-height reduced

---

### 3. Info Box (`sgs/info-box`)

**Purpose:** Feature/benefit card with icon, heading, and description.

**Attributes** (verified against block.json 2026-06-14):
- `mediaType` — icon | emoji | image (default: icon)
- `icon` — SVG slug from icon library (default: `star-filled`)
- `mediaEmoji` — string (when `mediaType=emoji`)
- `boxMedia` — media object (when `mediaType=image`; `image` retained for deprecation back-compat)
- `iconPosition` — top | left | right (default: top)
- `heading` — string (RichText, `role: content`)
- `subtitle` — string (RichText, `role: content`)
- `description` — string (RichText, `role: content`)
- `cardStyle` — string (default: `elevated`)
- `hoverEffect` — string (default: `lift`)
- `blockLink` — URL string (optional, makes entire card clickable)
- `blockLinkTarget` — boolean (open link in new tab)
- Hover/transition attrs: `hoverBackgroundColour`, `hoverTextColour`, `hoverBorderColour`, `hoverScale`, `hoverShadow`, `hoverGrayscale`, `transitionDuration`, `transitionEasing`
- Width attrs: `widthMode`/`widthModeMobile`/`Tablet`/`Desktop`, `customWidth`/`customWidthUnit`, `contentWidth`, `maxWidth`
- Animation attrs: `sgsAnimation`/`sgsAnimationDuration`/`sgsAnimationEasing`, `staggerDelay`

> NOTE: There is no `iconColour`/`iconBackgroundColour`/`iconSize`/`link` attribute — icon colour/size come from native `color` + `__experimentalBorder` supports and the universal image-controls extension (`supports.sgs.imageControls`).

**Render:** **Dynamic** — `render: file:./render.php`. Server-side render handles icon SVG injection from the icon library, conditional link wrapper, and per-element colour token resolution. `save.js` returns `null`.

---

### 4. Counter (`sgs/counter`)

**Purpose:** Animated number counter (e.g., "5,000+ Businesses Served").

**Attributes:**
- `number` — integer (the target number)
- `prefix` — string (e.g., "£")
- `suffix` — string (e.g., "+", "M", "%")
- `label` — RichText (description below number)
- `duration` — animation duration in ms (default: 2000)
- `separator` — boolean (thousand separator)

**Render:** **Static** — `save.js` returns serialised HTML with `RichText.Content` for label, plus `viewScriptModule` for count-up animation. `source:html` on the `label` attribute is correct here because it's a static block — RichText.Content writes innerHTML and the source reads it back.

**Animation:** Uses Intersection Observer — only animates when scrolled into view. Falls back to showing the final number if JS is disabled.

---

### 5. Trust Bar — ACTIVE (slug reused: ORIGINAL composite retired D72; CURRENT block rebuilt from `sgs/trust-badges`, renamed D123)

**Status: ACTIVE.** ⚠️ The slug `sgs/trust-bar` has had two lives — do not confuse them:

1. **ORIGINAL composite** (counter + badge) — retired: counter use-cases → `sgs/counter`; badge use-cases → universal-nesting (`sgs/container` + `sgs/label`/`sgs/icon` children).

2. **CURRENT block** — **`sgs/trust-badges` was rebuilt then renamed → `sgs/trust-bar` (D123, 2026-05-31)**; it absorbed `certification-bar` (D95, `badgeStyle` variants: icon-circle / text-only / image-badge + auto-scroll marquee). As of 2026-06-01 it is **dual-mode (FR-24-10, SHIPPED)**: `sourceMode='typed'` (curated repeater) OR `sourceMode='bound'` (echoes `$content` → renders the converter's emitted badge InnerBlocks). render.php branches on the explicit `sourceMode` (R-31-14, never `empty($content)`).

   **⚠ `sourceMode='bound'` is PURGED FROM CLONING (D182, 2026-06-06):** the bound-emit path was a test cheat (mirrored the draft DOM structure instead of converting to native `items[]` attributes). The converter now emits `sourceMode='typed'` with native `items[]` populated by the icon-identity resolver (`converter_v2/icon_resolver.py`) — badges clone to the correct icon slugs (home/check/truck/star). The live WC configurator modes (`wc-product`/`sgs-cpt`) are unaffected and remain legitimate.

   **Wave-1 bug fixes (D209):** trust-bar icon circle was invisible (white-on-white — fixed with an overridable default border); title placeholder leak fixed (trim guard); badge-size hidden for icon-circle mode now surfaced (`iconCircleSize` governs). Typography controls migrated to the shared `TypographyControls` component (D209).

   `src/blocks/trust-bar/` is the ACTIVE directory (the old `src/blocks/trust-badges/` dir was removed in the rename). See decisions.md D72 (original retire) + D95 (certification-bar merge) + D123 (rename) + D182 (bound-purge) + Spec 27 §FR-24-10.

#### Historical content (for migration reference only — block does NOT exist post-D72)

**Original Purpose:** Horizontal strip of 3-5 stats/trust signals.

**Attributes:**
- `items` — array of { value, suffix, label, animated } objects
  - `value` — string (e.g., "5,000", "Next-Day") — displayed as the main stat. Can be numeric or text.
  - `suffix` — string (e.g., "+") — appended to value
  - `label` — string (e.g., "Businesses Served") — displayed below value
  - `animated` — boolean (per-item override: if true and value is numeric, use counter animation)
- `backgroundColour` — token slug
- `textColour` — token slug
- `animated` — boolean (global: use counter animation for all numeric items)

**Inner blocks:** No — uses structured attributes.

**Render:** Dynamic `render.php` (save returns null; converted static→dynamic 2026-05-19, commit `a9083ca9`, with a `deprecated.js` shim for existing posts). `viewScriptModule` drives the count-up animation.

**Responsive:** Wraps to 2x2 grid on mobile, stays horizontal on desktop.

---

### 6. Card Grid (`sgs/card-grid`)

**Purpose:** Flexible grid of image+content tiles. Supports two visual variants: overlay (text on image) and card (text below image). Replaces a separate image gallery and product grid.

**Variants:**
- `overlay` — title/subtitle rendered over the image with gradient or solid overlay. For image galleries, portfolio grids, category showcases.
- `card` — image on top, content below in a card body. For product listings, feature grids, category tiles with descriptions and badges.

**Attributes:**
- `variant` — overlay | card (default: card)
- `items` — array of item objects:
  - `image` — media object
  - `title` — string
  - `subtitle` — string (for overlay: shown under title on image; for card: description text below title)
  - `badge` — string (for overlay: corner badge; for card: coloured tag below description, e.g., "Trade prices from £3.50/kg")
  - `badgeVariant` — success | accent | primary (controls badge colour)
  - `link` — URL (makes entire tile clickable)
- `columns` — 2-4 (desktop, default: 4)
- `columnsTablet` — 1-3 (default: 2)
- `columnsMobile` — 1-2 (default: 1)
- `gap` — raw CSS length string (shared ContainerWrapperControls control, 2026-06-07 commit 668e26ad — was per-block spacing preset)
- `aspectRatio` — auto | 1:1 | 4:3 | 16:9 | 3:2 | 16:10 (default: 16:10 for card, 4:3 for overlay)
- `hoverEffect` — none | zoom | lift | overlay-slide (default: zoom + lift for card variant)
- `overlayStyle` — none | gradient | solid (only used in overlay variant)

**Render:** Static `save()`.

**Responsive:** Columns reduce per breakpoint settings. Cards stack to full-width on mobile.

**Indus Foods usage:** The Products section uses `card` variant with 4 columns, 16:10 aspect ratio, `success` badge variant for price hints, and zoom + lift hover effect.

---

### 7. Testimonial (`sgs/testimonial`)

**Purpose:** Single testimonial card. **REBUILT D206 (2026-06-11) — typed-attr, 7-variant block.** All content rendered from typed attributes; no InnerBlocks in production (legacy InnerBlocks shapes preserved via `deprecated.js` v8).

**Variants:**
- `classic-card` — Avatar + quote + name/role (default)
- `pull-quote-editorial` — Large editorial pull-quote
- `rating-led` — Star rating prominent, quote secondary
- `avatar-spotlight` — Full-bleed avatar with quote overlay
- `corporate-logo` — Company logo + attributed quote
- `case-study-media` — Image/video alongside structured quote
- `minimal-quote` — Text-only minimal format

**Key attributes (see `02-SGS-BLOCKS-REFERENCE.md` for full schema):**
- `variant` — one of the 7 variants above
- `quote` — string (primary quote text)
- `summaryPhrase` — string (optional short pull-quote; `pull-quote-editorial` variant)
- `reviewerName` / `reviewerRole` / `orgName` — string fields
- `avatarMedia` — media object (optional; `avatar-spotlight` variant)
- `orgLogo` — media object (optional; `corporate-logo` variant)
- `workMedia` — media object (optional; `case-study-media` variant — image or video)
- `ratingStars` — 0–5 (optional; `classic-card` variant)
- `ratingScale` / `ratingScaleMax` — numeric /N rating (optional; `rating-led` variant)
- `reviewDate` — ISO date string (optional)
- `verified` — boolean
- `sourcePlatform` — string (review source platform name)
- Per-element typography via shared `TypographyControls` component (D209)

**Render:** Dynamic `render.php` (`save.js` returns `null`). `deprecated.js` v8 migrates BOTH legacy shapes (old InnerBlocks children + old scalar attrs). Live-verified migrating 3 real testimonials on page 8 (D206).

**Converter routing:** `scalarContentLift` capability declared in `block.json` (`supports.sgs.scalarContentLift: true`). The universal scalar-content-lift path (D212, 2026-06-12, main commit `3938a7b0`) routes `quote`/`reviewerName`/`ratingStars` from draft BEM elements to these typed attrs via `derived_selector` DB rows — no bespoke handler. Live-verified on canary page 8 (quote/name/5★ render at 1440/768/~500px). `has_inner_blocks` is 0 for this block (TYPED leaf — the slider parent has `has_inner_blocks=1`; the leaf emits scalar attrs only).

---

### 8. Testimonial Slider (`sgs/testimonial-slider`)

**Purpose:** Carousel/slider of multiple testimonials.

**Inner blocks:** REQUIRED. Slides are `sgs/testimonial` InnerBlocks (FR-31-6 migration 2026-05-30). render.php iterates `$block->inner_blocks` and renders each child; the `testimonials` array attribute still exists in block.json for back-compat but render.php does NOT read it — this block is **InnerBlocks-ONLY** in production.

**Attributes** (verified against block.json 2026-06-14):
- `layout` — full | split (default: full; `split` shows a `sideImage` beside the carousel)
- `sideImage` — media object (split layout only)
- `cardStyle` — string (default: `card`)
- `autoplay` — boolean / `autoplaySpeed` — ms
- `showDots` / `showArrows` — boolean
- `slidesVisible` — number (default: 3)
- `columns`/`columnsMobile`/`columnsTablet` — grid columns
- `gridTemplateColumns`/`Tablet`/`Mobile`, `gridTemplateRows`/`Tablet`/`Mobile`, `gridAutoRows` — explicit grid templates
- `gap`/`gapTablet`/`gapMobile`, `justifyItems`, `alignContent`, `templateMode` (free | grid-section | card-grid)
- `nameFontSize`, hover attrs (`hoverBackgroundColour`/`hoverTextColour`/`hoverBorderColour`/`hoverEffect`), `transitionDuration`/`transitionEasing`
- Width/flex attrs: `widthMode`/`Mobile`/`Tablet`/`Desktop`, `customWidth`/`customWidthUnit`, `contentWidth`, `maxWidth`, `flexDirection`, `flexWrap`, `justifyContent`
- `supports.sgs.containerKind: layout` — mirrors `sgs/container` wrapper capabilities via `SGS_Container_Wrapper`.

**Render:** Dynamic `render.php` (via `SGS_Container_Wrapper::render(..., 'layout', ...)`) + `viewScriptModule` for carousel logic.

**No external carousel library** — custom implementation using CSS scroll-snap + minimal JS for autoplay/navigation. < 3KB JS.

---

### 9. CTA Section (`sgs/cta-section`)

**Purpose:** Call-to-action section with headline, supporting text, and multiple button options.

**Tier:** `class-section` (sibling of `sgs/hero` in voter recognition; declared via `supports.sgs.is_section_root: true`; populated into `blocks.tier` by `/sgs-update`). Voter emits the literal slug at confidence 1.0 when `sgs-cta-section` is the section-root class. See D107.

**Attributes:**
- `headline` — RichText
- `body` — RichText
- `buttons` — array of { text, url, style, icon } objects
- `backgroundColour` — token slug
- `backgroundImage` — media object
- `stats` — array of { text } for inline social proof
- `layout` — centred | left-aligned | split

**Render:** **Dynamic** — `render: file:./render.php` (verified 2026-06-14). `save.js` returns the InnerBlocks marker / `null`.

---

### 10. Process Steps (`sgs/process-steps`)

**Purpose:** Horizontal timeline showing a multi-step process.

**Attributes:**
- `steps` — array of { number, title, description, icon } objects
- `connectorStyle` — line | arrow | dots (default: line)
- `numberStyle` — circle | square | none (default: circle) — *(attr is `numberStyle`, not `numberedStyle`)*
- `numberColour` / `numberBackground` / `titleColour` / `descriptionColour` — token slugs

**Render:** **Dynamic** — `render: file:./render.php` (verified 2026-06-14).

**Responsive:** Switches from horizontal to vertical stacked layout on mobile.

---

### 11. Accordion (`sgs/accordion`)

**Purpose:** Expandable content sections (FAQ, details).

**Inner blocks:** Uses `sgs/accordion-item` inner blocks, each with `title` (RichText) and content (any blocks).

**Attributes:**
- `allowMultiple` — boolean (allow multiple items open simultaneously)
- `defaultOpen` — index of initially open item (-1 for all closed)
- `iconPosition` — left | right
- `style` — bordered | flush | card

**Render:** Static `save()` + `viewScriptModule` using `<details>`/`<summary>` for no-JS fallback, enhanced with smooth animation via Interactivity API or vanilla JS.

---

### 12. Tabs (`sgs/tabs`)

**Purpose:** Tabbed content panels.

**Inner blocks:** Uses `sgs/tab` inner blocks, each with `title` (string) and content (any blocks).

**Attributes:**
- `tabPosition` — top | left
- `style` — underline | pill | boxed

**Render:** Static `save()` + `viewScriptModule`. Accessible with ARIA roles, keyboard navigation.

---

### 13. Brand Strip (`sgs/brand-strip`)

**Purpose:** Horizontal logo carousel/strip.

**Attributes:**
- `logos` — array of { image, alt, url } objects
- `scrolling` — boolean (infinite scroll animation)
- `scrollSpeed` — slow | medium | fast
- `greyscale` — boolean (display logos in greyscale, colour on hover)
- `maxHeight` — px (constrain logo height for consistency)

**Render:** Static `save()` + optional CSS animation for scrolling.

---

### 14. WhatsApp CTA (`sgs/whatsapp-cta`)

**Purpose:** WhatsApp integration — floating button and/or inline CTA.

**Attributes:**
- `phoneNumber` — string (international format)
- `message` — pre-filled message text
- `variant` — floating | inline | banner
- `label` — RichText (for inline/banner: "Chat on WhatsApp")
- `showOnMobile` — boolean
- `showOnDesktop` — boolean

**Render:** Static `save()` with `viewScriptModule` for floating button visibility logic (show after scroll, hide on certain pages).

---

### 15. Certification Bar (`sgs/certification-bar`) — RETIRED 2026-05-29 D95

> **RETIRED.** Block merged into `sgs/trust-bar` as `badgeStyle: 'text-only'` and `badgeStyle: 'image-badge'` variants. Existing posts auto-migrate via `trust-bar/deprecated.js` v2 `isEligible()` + `migrate()` entry. All certification-bar attributes (`title`, `titleColour`, `titleFontSize`, `labelColour`, `labelFontSize`, `badgeSize`, `items`, `badgeStyle`) are present on `sgs/trust-bar`. Source deleted: `src/blocks/certification-bar/`. DB rows deleted from both `sgs-framework.db` copies. Use `sgs/trust-bar` with `badgeStyle: 'text-only'` or `'image-badge'` for all new builds.

---

### 16. Notice Banner (`sgs/notice-banner`)

**Purpose:** Inline informational banner for contextual messages like minimum order values, delivery terms, or promotional notices. **Also serves as the replacement for the retired `announcement-bar` via `displayMode=announcement` (D209, 2026-06-11).**

**`displayMode` attribute (D209):**
- `inline` — (default) embedded within page content at the drop point
- `announcement` — sticky top/bottom bar (full-width, `z-index: 1000`), dismissible via WP Interactivity API (`session`/`permanent` storage), pre-paint anti-flash script prevents FOUC

**Attributes:**
- `displayMode` — inline | announcement (default: inline)
- `icon` — string (emoji or SVG slug)
- `iconColour` — token slug (control added D209)
- `text` — RichText (supports inline bold, links)
- `variant` — info | success | warning | accent
  - `info` — light blue background
  - `success` — light green background, green border (used for MOV banners in Indus Foods)
  - `warning` — light amber background
  - `accent` — light gold background
  - Variant bg/border/colour are overridable via `:where()` (E9, D206)
- `alignment` — left | centre (default: centre)
- `borderRadius` — preset slug (default: medium)
- `position` — top | bottom (announcement mode only, default: top)

**Render:** Dynamic `render.php` echoes `$content` (the `sgs/text` InnerBlocks child carrying the notice message). `save.js` returns `<InnerBlocks.Content />` — WordPress serialises the child block into `post_content`; render.php drives all frontend output. FR-31-6 InnerBlocks migration shipped 2026-06-02; `deprecated.js` v3 preserves existing posts (prior null-save shape). Dead `dismissible` button (no control, no JS handler) removed in D206 (v0.7.0).

**Indus Foods usage:** The MOV banner ("Minimum order just £75 — lower than most wholesalers...") uses `success` variant with truck icon and centred text.

**Migration from announcement-bar:** any existing block editor instance of `sgs/announcement-bar` shows the WordPress "block has been deleted" placeholder after D209. Replace with `sgs/notice-banner` using `displayMode=announcement`.

---

### 17. Announcement Bar (`sgs/announcement-bar`) — RETIRED D209 (2026-06-11)

> **RETIRED — TOMBSTONE.** `sgs/announcement-bar` was deleted in D209 (`/sgs-update` Stage-10 pruned it + 25 orphan attrs). Its dismissible-banner / countdown / rotating-message use-cases are now served by `sgs/notice-banner` with `displayMode=announcement` (see §16). Existing page content carrying `wp:sgs/announcement-bar` shows the WordPress "block has been deleted" placeholder (1 live homepage instance flagged for re-clone/swap). Use `sgs/notice-banner displayMode=announcement` for all new builds. The block's source, build output, and DB rows no longer exist — its former attribute/interactivity spec is intentionally not retained here.

---

### 18. ~~SVG Background (`sgs/svg-background`) — RETIRED 2026-05-28 (D93)~~

Merged into `sgs/container`. Use `bgSvgContent` + `bgSvgAnimation` + `bgSvgPosition` attrs on `sgs/container` instead. Existing posts auto-migrate via `deprecated.js` v2 entry.

---

### 19. Pricing Table (`sgs/pricing-table`)

**Purpose:** Service/pricing comparison table with highlighted "recommended" column.

**Attributes:**
- `plans` — array of { name, price, period, features[], ctaText, ctaUrl, highlighted } objects
- `columns` — 2-4
- `style` — card | flat | bordered

**Render:** Static `save()`.

---

### 20. Modal (`sgs/modal`)

**Purpose:** Lightbox/modal overlay triggered by button click.

**Attributes:**
- `triggerText` — string (button label)
- `triggerStyle` — primary | secondary | text-link
- `maxWidth` — small (480px) | medium (640px) | large (800px) | full
- `closeOnOverlay` — boolean (default: true)

**Inner blocks:** Yes — modal content accepts any blocks.

**Render:** Dynamic `render.php` + `viewScriptModule` for open/close logic via Interactivity API. Uses `<dialog>` element for native accessibility. Focus trap and Escape key handling built-in.

---

### 21. Icon List (`sgs/icon-list`)

**Purpose:** List with custom icons/checkmarks per item. Used for feature lists, benefit lists, and comparison points.

**Attributes:**
- `items` — array of { icon, text } objects
- `icon` — default SVG slug (check | star | arrow-right | circle | cross)
- `iconColour` — token slug (default: success)
- `iconSize` — small | medium | large (default: medium)
- `textColour` — token slug
- `gap` — integer px (default: 20)

**Render:** Static `save()`. Icons rendered via CSS `::before` with `data-icon` attribute.

**Block Selectors:** `"typography"` targets `.sgs-icon-list__text` for native font controls.

---

### 22. Google Reviews (`sgs/google-reviews`)

**Replaces:** Elfsight Google Reviews ($$$), Widget for Google Reviews, Trustindex, ReviewsOnMyWebsite

**Purpose:** Display Google Business Profile reviews with aggregate ratings, individual review cards, and schema.org markup for SEO rich snippets. Server-side fetching via Google Places API (New) with WordPress transient caching — zero client-side API calls.

**Competitive edge over Elementor:** Elementor has no native Google Reviews widget — users rely on Elfsight ($5-18/month per widget) or custom HTML embeds. SGS provides this natively with self-hosted data (no 3rd-party widget injection), schema.org markup, and zero recurring cost.

**Variants:**
- `grid` — Reviews in a responsive CSS Grid (2-4 columns)
- `slider` — Horizontal carousel using CSS scroll-snap
- `list` — Vertical stacked list
- `badge` — Compact aggregate rating badge (stars + count + "Google Reviews")
- `floating-badge` — Fixed-position badge in corner (bottom-left or bottom-right)
- `wall` — Masonry-style layout

**Attributes:**
- `variant` — grid | slider | list | badge | floating-badge | wall (default: grid)
- `placeId` — string (Google Place ID — configured in settings page, overridable per block)
- `columns` — 2-4 (for grid variant, default: 3)
- `columnsTablet` — 1-3 (default: 2)
- `columnsMobile` — 1-2 (default: 1)
- `maxReviews` — integer (default: 10, max: 50)
- `minRating` — 1-5 (default: 1 — show all ratings)
- `textOnly` — boolean (default: false — only show reviews that contain text)
- `excludeKeywords` — comma-separated string (hide reviews containing these words)
- `sortBy` — newest | highest | lowest (default: newest)
- `showAggregate` — boolean (default: true — show overall rating header)
- `showBreakdown` — boolean (default: false — show rating distribution bar chart in header)
- `showAvatar` — boolean (default: true)
- `showDate` — boolean (default: true)
- `showGoogleLogo` — boolean (default: true — required by Google attribution policy)
- `reviewRequestUrl` — URL (optional — "Write a review" CTA linking to Google)
- `theme` — light | dark | transparent (default: light)
- `cardStyle` — flat | bordered | elevated (default: bordered)
- `starColour` — token slug (default: accent)
- `textColour` — token slug
- `backgroundColour` — token slug
- `autoplay` — boolean (for slider variant, default: false)
- `autoplaySpeed` — integer ms (for slider variant, default: 5000)
- `showDots` — boolean (for slider variant, default: true)
- `showArrows` — boolean (for slider variant, default: true)

**Settings Page (sgs-blocks admin):**
- `sgs_google_api_key` — Google Places API key (encrypted in wp_options via AES-256-CBC + `wp_salt('auth')` — same pattern as sgs-booking)
- `sgs_google_place_id` — Default Place ID
- `sgs_google_reviews_cache_ttl` — Cache duration in hours (default: 6)
- Connection test button (fetches one review to verify API key + Place ID)

**Google Places API (New) Integration:**
- Endpoint: `POST https://places.googleapis.com/v1/places/{placeId}` with `fieldMask=reviews,rating,userRatingCount`
- Authentication: API key in `X-Goog-Api-Key` header
- Free tier: 10,000 requests/month (Essentials plan, post-March 2025)
- Server-side only — API key never exposed to frontend
- Response cached as WordPress transient (`sgs_google_reviews_{placeId}`) with configurable TTL
- Manual cache clear button on settings page
- Fallback: if API fails, show cached data with "Reviews may not be current" notice

**Schema.org Markup:**
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "156"
  }
}
```
Output as `<script type="application/ld+json">` in render.php — enables Google rich snippets.

**Render:** Dynamic `render.php` — fetches cached reviews server-side, renders HTML. No client-side API calls.
- Slider variant uses `viewScriptModule` for carousel interactivity (CSS scroll-snap + Interactivity API for autoplay/nav)
- Floating badge uses `viewScriptModule` for positioning + expand/collapse

**Responsive:**
- Grid: columns reduce per breakpoint settings
- Slider: single slide on mobile, multi-slide on desktop
- Badge: adapts width, truncates text at small sizes
- Floating badge: smaller on mobile, bottom-right default

**Accessibility:**
- Review cards: `article` element with `aria-label="Review by {name}, {rating} stars"`
- Star rating: `aria-label="{rating} out of 5 stars"` — stars are `aria-hidden="true"`
- Slider: same carousel accessibility as testimonial-slider (arrow key navigation, aria-live)
- Google logo: `alt="Google"` — required attribution

**Performance:**
- Server-side rendering — no client-side API calls, no loading spinners
- Images lazy-loaded (`loading="lazy"`)
- Slider JS loaded only when slider variant is used (viewScriptModule)
- Reviews cached server-side — one API call per cache TTL period, not per page view
- < 3KB additional JS for slider variant, 0KB for static variants

---

### 23. Mega Menu (`sgs/mega-menu`)

**Replaces:** Max Mega Menu, JetMenu (Crocoblock), Kadence Pro mega menu

**Purpose:** Block-based mega menu that integrates with the WordPress Navigation block. Each top-level menu item can open a full-width or constrained-width dropdown panel containing any Gutenberg blocks — columns, images, CTAs, icon lists, product grids. Built using the Interactivity API for hover/focus/click interactions.

**Competitive edge over Elementor:** Elementor's mega menu requires Elementor Pro ($59-399/yr) and generates heavy DOM. Max Mega Menu (most popular free alternative) has documented WCAG failures and mobile toggle issues. SGS delivers a block-native, ARIA-compliant mega menu with semantic HTML and zero external dependencies.

**Architecture (based on WordPress Developer Blog tutorial):**
- Registers a custom template part area (`mega-menu`) via `default_wp_template_part_areas` hook
- Each mega menu panel is a template part created in the Site Editor
- The `sgs/mega-menu` block is allowed inside the Navigation block as a child
- In the editor, users select which template part to display as the dropdown panel
- On the frontend, the template part content renders inside the dropdown

**Block hierarchy:**
```
sgs/mega-menu                    # Top-level menu item (replaces core/navigation-link)
├── [label] — RichText           # Menu item text
└── [panel] — Template part      # Dropdown content (any blocks)
```

**Attributes:**
- `label` — RichText (menu item text)
- `url` — string (optional — top-level item can be a link itself)
- `menuTemplatePart` — string (slug of the template part to render as dropdown)
- `panelWidth` — full | content | custom (default: full — full viewport width)
- `panelMaxWidth` — CSS value (for custom width, e.g., "800px")
- `panelAlignment` — left | centre | right (alignment of panel under menu item)
- `openOn` — hover | click (default: hover on desktop, click on mobile)
- `icon` — SVG slug (optional icon before or after label)
- `iconPosition` — before | after (default: after — dropdown indicator arrow)
- `highlight` — boolean (default: false — accent-colour label for featured items)
- `badge` — string (optional — small badge text like "New" or "Sale")
- `badgeColour` — token slug (default: accent)

**Parent block:** `core/navigation` — the mega menu block is registered as an allowed child of the Navigation block via the `allowedBlocks` API.

**Registration:**
```php
// In sgs-blocks.php or plugin bootstrap
add_filter( 'default_wp_template_part_areas', function( $areas ) {
    $areas[] = array(
        'area'        => 'mega-menu',
        'area_tag'    => 'div',
        'label'       => __( 'Mega Menu', 'sgs-blocks' ),
        'description' => __( 'Mega menu dropdown panel content.', 'sgs-blocks' ),
        'icon'        => 'layout',
    );
    return $areas;
} );
```

**Render:** Dynamic `render.php`:
- Renders the menu item `<li>` with ARIA attributes
- Fetches and renders the template part content inside the dropdown `<div>`
- Wraps with Interactivity API directives for open/close

**Interactivity (render.php output):**
```html
<li
    data-wp-interactive="sgs/mega-menu"
    data-wp-context='{ "isOpen": false, "menuId": "menu-1" }'
    data-wp-class--is-open="context.isOpen"
    data-wp-on--mouseenter="actions.openOnHover"
    data-wp-on--mouseleave="actions.closeOnHover"
    data-wp-on--keydown="actions.handleKeydown"
    role="none"
>
    <a
        role="menuitem"
        aria-haspopup="true"
        data-wp-bind--aria-expanded="context.isOpen"
        data-wp-on--click="actions.toggle"
        data-wp-on--keydown="actions.handleTriggerKeydown"
    >
        {label}
        <span class="sgs-mega-menu__indicator" aria-hidden="true"></span>
    </a>
    <div
        class="sgs-mega-menu__panel"
        role="menu"
        data-wp-bind--hidden="!context.isOpen"
    >
        <!-- Template part content rendered here -->
    </div>
</li>
```

**Interactivity Store (view.js):**
```javascript
import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'sgs/mega-menu', {
    state: {
        openMenuId: null,
    },
    actions: {
        toggle() {
            const ctx = getContext();
            ctx.isOpen = !ctx.isOpen;
            state.openMenuId = ctx.isOpen ? ctx.menuId : null;
        },
        openOnHover() {
            const ctx = getContext();
            ctx.isOpen = true;
            state.openMenuId = ctx.menuId;
        },
        closeOnHover() {
            const ctx = getContext();
            ctx.isOpen = false;
            state.openMenuId = null;
        },
        handleKeydown( event ) {
            // Escape: close panel, return focus to trigger
            // ArrowDown: move focus into panel
            // ArrowLeft/Right: move to adjacent menu item
        },
        handleTriggerKeydown( event ) {
            // Enter/Space: toggle panel
            // ArrowDown: open panel and focus first item
        },
    },
} );
```

**Mobile behaviour:**
- Breakpoint: below 782px (WordPress admin bar breakpoint, configurable)
- Dropdown replaced with accordion-style expand/collapse
- Full-width panels stack below menu item
- Hamburger toggle wraps entire menu (handled by core Navigation block responsive mode)
- Touch: tap to expand, tap again to collapse
- Panel content reflows to single column via CSS Grid `grid-template-columns: 1fr`

**Keyboard navigation (WCAG 2.2 AA compliant):**
- `Tab` / `Shift+Tab` — move between top-level menu items
- `Enter` / `Space` — toggle dropdown panel
- `ArrowDown` — open panel and focus first focusable element inside
- `ArrowUp` — focus last focusable element in panel (when panel open)
- `ArrowLeft` / `ArrowRight` — move between top-level menu items
- `Escape` — close panel, return focus to trigger
- `Home` / `End` — first/last top-level menu item

**ARIA roles:**
- Navigation landmark: `<nav role="navigation" aria-label="Primary">`
- Menu bar: `<ul role="menubar">`
- Menu items: `<li role="none">`, `<a role="menuitem">`
- Dropdown: `<div role="menu">`
- Expanded state: `aria-expanded="true|false"` on trigger
- Has popup: `aria-haspopup="true"` on trigger

**Responsive:**
- Desktop: horizontal menu bar with dropdown panels on hover/click
- Tablet: same as desktop or hamburger (configurable breakpoint)
- Mobile: hamburger menu with accordion sub-menus

**Performance:**
- Panel content rendered server-side (in `render.php`) but hidden via CSS `display: none`
- No additional HTTP requests on hover — content is in the DOM, just hidden
- Interactivity API JS: < 3KB viewScriptModule
- Panel CSS loaded only when mega-menu block is present (block-level stylesheet)
- No external menu libraries — pure CSS Grid + Interactivity API

---

### 24. Decorative Image (`sgs/decorative-image`)

**Purpose:** Absolute-positioned decorative images that float freely across page sections, unconstrained by containers and not affecting layout flow. Used for organic, editorial-style design where images (food photography, decorative elements, brand illustrations) are scattered naturally over section backgrounds.

**Competitive edge over Elementor:** Elementor's "Motion Effects" allow floating elements but generate heavy JS and deeply nested DOM. CSS-native absolute positioning with percentage offsets is lighter, more predictable, and produces cleaner markup. Zero JS required for static positioning — optional parallax is < 1KB.

**Use case — Indus Foods homepage:** Food photography (samosas, spice bowls, rice bags, chilli peppers) scattered organically across the homepage. Each image floats over its parent section's background colour without affecting the layout of headings, text, or other blocks. Desktop shows 4-6 images at varied positions and rotations. Mobile shows fewer, smaller, repositioned to edges or hidden entirely.

**Parent block:** Works inside any block that sets `position: relative` — primarily `sgs/container` and `core/group`. The decorative image positions itself relative to the parent container using percentage-based offsets.

**Attributes:**
- `image` — media object (ID + URL + alt text, though alt will always be empty — decorative)
- `positionX` — number 0-100 (percentage from left edge, default: 50)
- `positionY` — number 0-100 (percentage from top edge, default: 50)
- `width` — number px (default: 200 — image width)
- `maxWidthPercent` — number 0-50 (max width as % of parent container, default: 20)
- `rotation` — number degrees (-180 to 180, default: 0)
- `opacity` — number 0-100 (default: 85)
- `zIndex` — number (-1 to 10, default: 1 — above background, below content)
- `flipX` — boolean (horizontal mirror, default: false)
- `parallaxStrength` — number 0-100 (default: 0 — 0 means no parallax, 100 means strong parallax scroll effect)
- `overflow` — visible | hidden (default: visible — whether image can extend beyond parent boundaries)
- **Responsive overrides:**
  - `positionXTablet` — number 0-100 (override position on tablet)
  - `positionYTablet` — number 0-100
  - `widthTablet` — number px
  - `rotationTablet` — number degrees
  - `hideOnTablet` — boolean (default: false)
  - `positionXMobile` — number 0-100
  - `positionYMobile` — number 0-100
  - `widthMobile` — number px
  - `rotationMobile` — number degrees
  - `hideOnMobile` — boolean (default: false)

**Render:** Static `save()` — outputs a single `<img>` element with inline styles for positioning.

**Output markup:**
```html
<img
    class="sgs-decorative-image"
    src="{url}"
    alt=""
    role="presentation"
    aria-hidden="true"
    loading="lazy"
    decoding="async"
    style="
        position: absolute;
        left: {positionX}%;
        top: {positionY}%;
        width: {width}px;
        max-width: {maxWidthPercent}%;
        transform: translate(-50%, -50%) rotate({rotation}deg) {flipX ? 'scaleX(-1)' : ''};
        opacity: {opacity / 100};
        z-index: {zIndex};
        pointer-events: none;
    "
    data-parallax="{parallaxStrength}"
/>
```

**CSS (style.css):**
```css
.sgs-decorative-image {
    position: absolute;
    pointer-events: none;
    user-select: none;
    will-change: transform;
    transition: none; /* no layout transitions — purely positional */
}

/* Parent container must be position: relative */
.wp-block-sgs-container,
.wp-block-group {
    position: relative;
}

/* Responsive overrides via media queries using data attributes */
@media (max-width: 781px) {
    .sgs-decorative-image[data-hide-tablet="true"] {
        display: none;
    }
}

@media (max-width: 480px) {
    .sgs-decorative-image[data-hide-mobile="true"] {
        display: none;
    }
}
```

**Parallax (optional viewScriptModule):**
- Only loaded when `parallaxStrength > 0` on any decorative image on the page
- Uses `IntersectionObserver` + `requestAnimationFrame` for smooth scroll-linked transform
- Offset: `translateY` shifts by `(scrollPosition * parallaxStrength / 100)` pixels
- Respects `prefers-reduced-motion` — disables parallax, shows static position
- < 1KB minified

**Editor experience:**
- In the editor, decorative images render at their configured positions
- Drag handles for adjusting positionX/positionY visually (stretch goal)
- Sidebar: ResponsiveControl for per-breakpoint position/size/visibility
- Preview: shows desktop/tablet/mobile positions when breakpoint is switched

**Accessibility:**
- `aria-hidden="true"` — completely hidden from assistive technology
- `role="presentation"` — reinforces decorative nature
- `alt=""` — empty alt text, not omitted (WAI standard for decorative images)
- `pointer-events: none` — cannot be accidentally clicked/focused
- No tab stop — not in the focus order

**Performance:**
- Zero JS for static positioning (pure CSS)
- < 1KB JS only when parallax is used
- `loading="lazy"` + `decoding="async"` on all images
- `will-change: transform` only on parallax images (opt-in via data attribute)
- Images should be optimised WebP/AVIF, 150-300px wide — small file sizes
- `contain: layout` on parent container prevents sticker overflow from causing reflow

---

### 25. Trustpilot Reviews (`sgs/trustpilot-reviews`)

**Replaces:** Trustpilot's own WordPress plugin (free tier blocks all display widgets), Better Business Reviews, Trustindex, ReviewsOnMyWebsite.

**Purpose:** Display Trustpilot reviews + TrustScore on the WP site. Self-hosted data (no third-party widget injection, no `<iframe>`, no off-site script). Schema.org JSON-LD output for SEO rich snippets. Brand identity locked (green stars, Verified badge, clickable Trustpilot logo) while typography inherits the host theme via `var(--wp--preset--font-family--body)` and `color: inherit`. Border + scale hover effects use `var(--wp--preset--color--primary)` so each site's primary token tints the interaction.

**Competitive edge:** Trustpilot's free plan paywalls every display widget via their plugin — you only get the Review Collector. Scraper plugins introduce maintenance dependencies + TOS grey area + documented "almost ban" incidents (per the research-buddies session that informed this design). First-party SGS block + dedicated sync infrastructure (block #26 + Backend Integration below) keeps brand identity locked while letting the cards live in the host site visually.

**Variants:**
- `carousel` — Looping horizontal carousel (next on last wraps to first) — DEFAULT
- `grid` — Responsive CSS Grid (3 / 2 / 1 default columns)
- `list` — Vertical stacked
- `badge` — Compact aggregate TrustScore badge
- `floating-badge` — Fixed-position TrustScore badge

**Attributes (~50 total — see auto-generated `02-SGS-BLOCKS-REFERENCE.md` for the full schema):**
- `variant` — carousel | grid | list | badge | floating-badge (default: carousel)
- `dataSource` — inline | synced | placeholder (default: placeholder for editor preview; `synced` reads from `wp_options[sgs_trustpilot_data]` populated by the SGS Trustpilot Sync infrastructure)
- `businessUnitUrl` — string (Trustpilot business URL, e.g. `https://uk.trustpilot.com/review/example.com`)
- `reviews` — array of `{ author, rating, datePublished, reviewBody, isVerified, title? }` (used in `inline` mode only)
- `trustScore` — float 0-5 (auto-derived from synced data)
- `trustScoreLabel` — Excellent | Great | Good | Average | Poor | Bad (derived via `sgs_trustpilot_score_label()`)
- `totalReviews` — integer
- `reviewsAverage` — float (mean of visible review ratings)
- `columns` / `columnsTablet` / `columnsMobile` — defaults 3 / 2 / 1
- `showSourceHeader` — boolean (white pill tablet header with logo + score + label + count)
- `showSubtitle` — boolean (default: false — "Showing our latest reviews" suppressed by default)
- `showTrustpilotLogo` — boolean (default: true — clickable, links to source_url)
- `showVerifiedBadge` — boolean
- `showDate` — boolean (relative time via `sgs_trustpilot_relative_date()`)
- `showAuthor` — boolean
- `showSchema` — boolean (Schema.org JSON-LD emission, default: true)
- `theme` — light | dark (default: light)
- `cardStyle` — flat | bordered | elevated (default: elevated)
- `autoplay` / `autoplaySpeed` / `showDots` / `showArrows` — carousel controls

**Backend Integration — SGS Trustpilot Sync (shipped 2026-05-11 commit `06df2807`):**
- Admin page at WP Admin > Settings > SGS Trustpilot Sync — Business URL, Off / Weekly / Daily auto-sync, Browser provider (SGS shared service placeholder OR custom Browserless endpoint), Sync-now button, last_sync_status badge, activity log of last 5 sync attempts, inline setup checklist + Browserless signup link.
- 4 backend classes at `plugins/sgs-blocks/includes/trustpilot/`:
  - `Trustpilot_Sync` — Browserless POST, JSON-LD parser, AES-256-CBC token encryption (`wp_salt('auth')` keyed, same pattern as `sgs/google-reviews`)
  - `Trustpilot_REST` — `POST /wp-json/sgs/v1/trustpilot-sync`, `manage_options` gated, single entry for both Sync-now and cron
  - `Trustpilot_Cron` — `sgs_trustpilot_sync_event` weekly/daily, registered from the settings sanitiser
  - `Trustpilot_Settings` — Settings API page with options group `sgs_trustpilot_sync_group`
- Sync-now JS at `plugins/sgs-blocks/assets/admin/trustpilot-sync.js` — wp.apiFetch + X-WP-Nonce
- Schema written to `wp_options[sgs_trustpilot_data]` matches the reference at `sites/mamas-munches/research/trustpilot-reviews.json`:
  ```
  { source_url, captured_at, trust_score, trust_score_label, reviews_average,
    review_count, reviews: [{ author, rating, datePublished, reviewBody, isVerified }, ...] }
  ```

**Browserless integration:**
- Endpoint: `https://production-sfo.browserless.io/content` (REST API; the `/scrape` and BrowserQL endpoints are not used)
- Auth: `?token=<key>` query string — `Authorization: Bearer` returns HTTP 500 on this endpoint (captured as architectural lesson, blub.db row 238)
- Request: POST `{ url: <trustpilot-url>, waitForTimeout: 3000 }`
- Returns rendered HTML (~845KB for a low-traffic page)
- Free tier: 6 hours/month, ample for one weekly scrape per site
- Direct `wp_remote_get` fallback exists but Trustpilot returns HTTP 403 on server-side fetches without a real browser

**JSON-LD parsing:**
- Trustpilot embeds review data in `<script type="application/ld+json">` blocks with an `@graph` array of mixed entity types
- `LocalBusiness.review[]` holds `{ "@id": "..." }` pointers, NOT inline review entities
- Standalone `Review` entities live as siblings in `@graph`
- Parser harvests standalone `Review` entities directly (initial implementation only walked the LocalBusiness pointer array and dropped all reviews — fix landed mid-build)

**Schema.org Markup:**
Same as Google Reviews — emits `LocalBusiness` with `aggregateRating` + nested `Review` entities. Output as `<script type="application/ld+json">` in render.php — enables Google rich snippets.

**Render:** Dynamic `render.php` reads from block attributes (inline) or `wp_options` (synced) or falls back to placeholder demo content for editor preview. Carousel variant uses `viewScriptModule` for the looping scroll behaviour + prefers-reduced-motion respect.

**Operator self-serve setup:**
1. Install plugin + theme.
2. Visit Settings > SGS Trustpilot Sync.
3. Paste Trustpilot business URL.
4. Pick Weekly auto-sync.
5. Sign up at https://www.browserless.io/sign-up (free tier), pick REST APIs, copy API key.
6. Set provider to "Use my own Browserless instance", paste endpoint + key.
7. Save -> weekly cron registers automatically.
8. Click Sync now -> wp_options populates in ~3 seconds.
9. Insert the block anywhere with `dataSource: synced`.

**Visual proof:** Live on sandybrown at `/trustpilot-smoke-test-2/`. Mama's 4 reviews (TrustScore 4.0 "Great") render via the synced path. Visual diff reports: `reports/visual-diff/trustpilot-reviews-2026-05-11.md` (block) + `reports/visual-diff/trustpilot-sync-2026-05-11.md` (sync infrastructure).

---

## Section-root block roster (tier='class-section')

Blocks recognised by the converter walker at confidence 1.0 from their literal `sgs-<block>` class on a section boundary. Identified by `supports.sgs.is_section_root: true` in `block.json`; populated into `blocks.tier='class-section'` by `/sgs-update`; consumed by the voter at `per-section-convention-voter.py:295-305`.

| Block | Notes |
|---|---|
| `sgs/hero` | Page hero (variants: standard / split / video / svg-animated). XS-9.1 rich-text via `sgs/heading` + `wp_kses_post`. |
| `sgs/cta-section` | Call-to-action section (centred / left-aligned / split layouts). |
| `sgs/trust-bar` | Trust/badge section strip — curated icon-badge items or certification logos (added D123/D182). |

**Criteria for adding a new section-root block:**
1. The block represents an entire page section, not an element-within-a-section
2. Mockups consistently mark its boundary with a single literal `sgs-<block>` class (no ambiguity vs neighbouring sections)
3. The block has its own pattern PHP template (so Stage 2 confidence-matrix can resolve it)

To add: set `supports.sgs.is_section_root: true` in `block.json`, run `/sgs-update`, then run `/sgs-clone` on a representative mockup and verify `voter.json` emits the literal slug at confidence 1.0 with reason `class-section-block-equivalent`. Any non-section-root `sgs-` prefixed class encountered by the voter emits `gap-candidate-class-section` instead — surfacing the gap for review rather than mis-routing.

Cross-references: D107 (voter rewrite, tier-driven recognition), D108 (`block_composition` table — sibling routing data), D152 (`block_composition.container_kind` 3-KIND model + composite-mirror rule → Spec 22 §FR-31-21 + `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md`).

**Not (yet) on this roster:** `sgs/site-header` / `sgs/site-footer` are section-KIND composites but are NOT recognised via the mockup-body literal-class voter above — they live inside the `header`/`footer` template parts, not the page-content body a mockup clones. The cloning pipeline maps a draft's header/footer rows onto these blocks' named slots by BEM role (Spec 31 R-31-2/R-31-8) as a separate mechanism (design-gate §11, "Cloning pipeline Part 2", phased P5 — NOT started). Do not add them to the table above.

---

## Header / Footer / Navigation System (BUILT + LIVE — D323-D333, §S9 11/11; pending final Bean sign-off)

**Design-gate sign-off:** `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` (Bean, all recommended defaults). **Owning spec for the FULL requirement set (FRs, per-breakpoint override data model, never-overflow Cluster+clamp layout, global-defaults/Site-Info binding, a11y contract, sticky/transparent-scroll behaviour): [`17-HEADER-FOOTER-ARCHITECTURE.md`](17-HEADER-FOOTER-ARCHITECTURE.md).** This section is the block-roster summary only — do not duplicate Spec 17's FRs here.

### `sgs/business-info` `displayType="attribution"` — the Website Credit element (D338, 2026-07-15)

**Plain English:** the "Website by Small Giants Studio" link in the footer's bottom strip, as a proper element an operator can move around that row — but cannot retarget, reword or delete.

**The rule it demonstrates.** This is the ONE `displayType` that does **not** read `Sgs_Site_Info`, deliberately. Every other type renders **client** data; this renders the **framework's own constant**. That is the binding distinction (memory `framework-block-client-hardcode-is-a-bug-not-a-constant`): *a hardcoded CLIENT value in a framework file is a bug; the component's OWN constant stays.* Routing the agency backlink through Site Info would be wrong twice — it would put agency data in a client-owned store, and it would let a client blank the backlink.

**Constants** (`sgs-blocks.php`, `defined() ||` guarded so a white-label/reseller build overrides them before plugin load without patching a block):
- `SGS_ATTRIBUTION_URL` = `https://smallgiantsstudio.co.uk/`
- `SGS_ATTRIBUTION_TEXT` = `Website by Small Giants Studio`

> Both live Astra sites (`lightsalmon-tarsier-683012.hostingersite.com`, `muslimsinconstruction.uk`) point this link at Bean's **LinkedIn** — that predates the website and is stale. The website is correct; do not copy the LinkedIn URL from those baselines.

**Markup + classifier (BINDING — the pipeline matches on this):**
```html
<p class="sgs-business-info sgs-business-attribution">
  <a href="{SGS_ATTRIBUTION_URL}" class="sgs-business-info__link" rel="noopener">{SGS_ATTRIBUTION_TEXT}</a>
</p>
```
`.sgs-business-attribution` is the recognised classifier. It must stay in lockstep with the draft-side classifier `.sgs-footer__credit` (Spec 33 §Website-credit recognition) — change one, change both.

**Attribute surface — TYPOGRAPHY ONLY (deliberately narrow, Bean-locked).** No content attr, no URL attr, no layout attrs. An operator may restyle it; they may not re-point it:
- `textColour` (default: **resolved**, see below) · `linkHoverColour` (default `#e7d768`)
- font family / size / weight / style / line-height via the shared `TypographyControls` component + `sgs_typography_css_rule()` — **never** hand-rolled controls (R-22-13). Default = inherit, so it matches the site's base paragraph font/size out of the box.

**Default colour is COMPUTED, not assumed.** `textColour` unset ⇒ resolve the surrounding background to hex via `sgs_resolve_palette_hex()` and pick the readable foreground via `sgs_wcag_text_colour_for_bg()` (`includes/helpers-colour-wcag.php` — the same helpers `sgs/product-card` and `sgs/option-picker` already use; do NOT build a second resolver). Never assume a token NAME implies luminance — `primary-dark` is a **pink** on mamas-munches (STOP-TOKEN-NAME-IS-NOT-A-LUMINANCE, D338). Where the background cannot be resolved, fall back to `currentColor` (inherit), never to a literal.

**Hover — left-to-right colour sweep to `#e7d768`** (Bean's reference behaviour on both live Astra sites). Implement as a `background-clip:text` gradient wipe, NOT a plain `color` transition:
```css
.sgs-business-attribution__link-inner { background-image: linear-gradient(90deg, #e7d768 50%, currentColor 50%);
  background-size: 200% 100%; background-position: 100% 0;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  transition: background-position 320ms ease; }
:hover { background-position: 0 0; }
@media (prefers-reduced-motion: reduce) { transition: none; }
```
Gate: the resting state must still meet 4.5:1 (WCAG 1.4.3) and `#e7d768` must meet it against the footer background at hover — verify per client palette, not once (STOP-VERIFY-EVERY-CLIENT).

**Defaults are intentionally thin.** The cloning pipeline sets the real styling per client (Spec 33) — these defaults only need to be sane and accessible out of the box, not final.

### Rule evolution — specialised container blocks are permitted inside template parts

`no-header-footer-block.py` + the `header-footer-are-template-parts-not-blocks` memory forbid a monolithic header/footer block that subsumes the FSE/CPT/rules system. Header and footer **remain WordPress template parts** (Spec 17: parts + patterns + `sgs_header`/`sgs_footer` CPT + rules engine + Site Info bindings). The rule evolves (Bean-directed, conscious, not a regex dodge) to permit a **specialised container block used INSIDE the template part** — equivalent in kind to `sgs/card-grid`/`sgs/feature-grid`. `no-header-footer-block.py` now allows `src/blocks/{site-header,site-footer,adaptive-nav}/` specifically, while continuing to block any bare `header`/`footer`/`nav` block slug.

### The blocks

| Block | Status | KIND | Renders via | Category |
|---|---|---|---|---|
| `sgs/site-header` | BUILT + LIVE (P1) | section | `SGS_Container_Wrapper` | `sgs-layout` |
| `sgs/site-footer` | BUILT + LIVE (P3) | section | `SGS_Container_Wrapper` | `sgs-layout` |
| `sgs/adaptive-nav` | BUILT + LIVE (P2) | layout | `SGS_Container_Wrapper` + nav logic | `sgs-layout` |
| `sgs/mobile-nav` (existing, reworked) | P0 drawer bug FIX SHIPPED + live-verified 2026-07-13; a11y hardening in progress | — (Popover/dialog, `containerMirror: false` — excluded from the container-mirror roster, same as `sgs/modal`) | own render.php | (unchanged) |

- **`sgs/site-header`** — header shell: 3 optional named rows (top utility strip / middle primary row with logo+nav+CTA / bottom message row), each independently configurable; an empty row emits zero output (no wrapper, no padding-bleed). Typed element palette (logo, adaptive-nav, search, cart, account, button/CTA, contact, social, HTML, widget-area) — not freeform.
- **`sgs/site-footer`** — footer shell: named rows (top CTA/newsletter, middle columns row splitting to up to N columns collapsing to 1 below mobile tier, bottom trademark/terms bar). Same typed element palette as the header.
- **`sgs/adaptive-nav`** — ONE menu source renders a desktop nav bar and collapses to a burger at a breakpoint set across 4 tiers (Desktop/Tablet/Mobile/custom-px). Default = one-tree-restyled; escape hatch = independent mobile tree via the `sgs/mobile-nav` drawer. Mega-menu drill-down + auto back-link on mobile with AJAX lazy-load for heavy content. Desktop overflow auto-collapses into a "more" menu.
- **`sgs/mobile-nav` fix (P0, SHIPPED 2026-07-13):** root cause was `view.js` applying `inert` to `.wp-site-blocks` while the drawer (`#sgs-mobile-nav`) was a DOM **descendant** of that element, so the drawer froze itself even though the Popover top-layer painted it as open. Fix: the drawer is re-parented to be a direct child of `<body>` (sibling of `.wp-site-blocks`) before `showPopover()`. Live-verified via `elementFromPoint` returning the link (not `BODY`). The full GOV.UK-grade a11y contract (focus trap, ESC-close, backdrop-dismiss, body-scroll-lock, redundant state signalling, configurable SR labels, published keyboard contract, 44px targets) is being built out on top of this fix — see Spec 17 for the FR-level detail.

### Customisation-standard extensions that apply to these 3 new blocks

These blocks follow the Block Customisation Standard (below) plus:

- **Composite-mirror (R-31-9 / D152):** `sgs/site-header` and `sgs/site-footer` delegate ALL outer rendering to `SGS_Container_Wrapper::render()` — no per-block reimplementation of grid/section/background machinery, same rule as `sgs/hero`/`sgs/card-grid`. See "Composite-mirror rule" under `sgs/container` above.
- **No-inline scoped styling (Spec 32):** same no-inline-`style=""` contract as every other SGS block — values land in a scoped `<style id="uid">` block, not inline declarations.
- **Per-breakpoint override model — NEW-BLOCKS-ONLY:** these 3 blocks (and no existing block — avoids Gutenberg invalid-content errors, honours the no-deprecations rule) get a `{desktop, tablet, mobile}` (`null` = inherit from the tier above) per-property override data model, PLUS a separately-configurable custom-px 4th breakpoint tier (used by the `sgs/adaptive-nav` collapse setting) — the custom-px tier is NOT a 4th key merged into every per-property value object. Full data model, cascade rules, and editor UX are owned by Spec 17 (FR-S9-6) — not duplicated here.
- **Global defaults + Site Info access (Bean requirement 2026-07-13):** every element/setting in `sgs/site-header`, `sgs/site-footer`, and `sgs/adaptive-nav` defaults from (1) the site's `theme.json`/`wp_global_styles` tokens (or, for cloned sites, the Spec 33 `theme-snapshot.json`) and (2) the shared SGS Site Info store (Spec 17 §S4 — logo/phone/email/address/hours/socials/copyright via `sgs/site-info` block-bindings). A value set once in Site Info renders identically in header AND footer with no re-entry — never a hardcoded per-block literal (R-31-1). Owning FRs: Spec 17.
- **Never-overflow layout:** base layout is Cluster (`flex-wrap` + `min-width:0` on children + `flex-shrink:0` on the logo) + fluid `clamp()` spacing + container-query tiers — guarantees no overflow down to 320px by construction. Owning FRs: Spec 17.

### DB reseed + doc plumbing (on build, not yet run — P1 onward)

`/sgs-update` registers `blocks` + `block_supports` + `block_attributes` for the 3 new block.json files automatically; `block_composition.wraps_block='sgs/container'` + `container_kind` via `sync-container-wrapping-blocks.py`; `composition_role` via `seed-composition-roles.py`. DB rows now exist (built + live) — re-verify via `/sgs-db` if in doubt rather than trusting this note.

---

## `sgs/product-card` — Build status

`sgs/product-card` has evolved significantly. Current canonical state (D204/D206/D209):

- **BUILT-IN-ELEMENT card (D204, Bean sign-off 2026-06-10):** all content rendered from typed attributes via the element-MIRROR pattern. ZERO InnerBlocks in typed mode (no deprecation needed — typed card was unused in content). Connect+override UX: "Connected product" picker is the primary control; `overrideElements` toggles (name/description/badge/image/cta); PRICE NEVER overridable (grep-proven, D204).
- **48-SKU configurator:** value-ladder, per-axis pickers, live price row via `/sgs/v1` proxy.
- **CTA model:** max 2 text buttons (1 primary + 1 secondary); behaviours learn-more / add-to-basket / buy-now; express-pay = phase-2 gateway toggle.
- **B3–B6 fixes (D206):** Advanced-SEO crash fixed (`__experimentalNumberControl`); fresh-card legacy warning improved; duplicate bound-mode CTA boxes removed; trial dashed border made overridable.
- **Typography controls (D209):** migrated to shared `TypographyControls` component (string→number+unit+responsive; `sgs_typography_css_rule()` for PHP render; legacy string `fontSize` handled for back-compat).
- **Schema (D204):** card emits NO schema itself; ONE page-level ItemList per singular page (recursive walker, shared public API). `ProductGroup` emission gated to single-product-focus pages.

### product-card `featured` variant

`sgs/product-card` gained a new `featured` variant + `featuredTag` attribute + render branch (shipped commit `669115f0`). When `variant: featured` is set, the render path emits a tag overlay (sourced from `featuredTag` string) and applies the `--featured` BEM modifier for elevated card styling. Sibling architecture to D112-adjacent block-variation work; not a numbered decision.

### Canonical draft BEM vocabulary (locked 2026-06-10, FP-DRAFT-FIX)

A drafted product card uses ONE block prefix — `sgs-product-card` — for the root and every descendant. Variants are ROOT MODIFIERS, state classes are ELEMENT MODIFIERS (never bare words like `active`). Mixed prefixes (`sgs-featured-product__*`, `sgs-gift-section__card--*` on card elements) are non-conforming; the Mama's draft was renamed to this vocabulary 2026-06-10 (zero-pixel-change verified).

| Draft class | Maps to attr |
|---|---|
| `sgs-product-card` + `--featured` \| `--trial` | `variantStyle: standard\|featured\|trial` |
| `sgs-product-card__image` | `image` / `imageAlt` |
| `sgs-product-card__body` | (structural) |
| `sgs-product-card__title` (on the `<h3>`) | `productName` (explicit class REQUIRED — corrected by Bean 2026-06-10: an unclassed `<h3>` falls back to the atomic tag-mapping table, which emits a `core/heading` CHILD block and contradicts the zero-InnerBlocks built-in card; the tag-mapping fallback is for legacy drafts only, never the standard) |
| `sgs-product-card__description` | `description` |
| `sgs-product-card__pill-group` / `__pill` / `__pill--active` | `packSizes` (labels + selected index); both typed + bound render the real `sgs/option-picker`. **Pill STYLING clones too (D299):** the draft's resting `.__pill` + selected `.__pill--active` CSS lifts to the option-picker's pill-state colour/border-radius attrs (resting `pillBg/Text/BorderColour`; selected `pillSelectedBg/Text/BorderColour`) via the universal styling lift — NOT a fixed SGS design. See Spec 27 FR-24-15. |
| `sgs-product-card__price-row` / `__price` / `__price-note` | `priceLarge` / `priceNote` |
| `sgs-product-card__tag--trial` | `trialTag` (rendered IN-BODY above the title) |
| `sgs-product-card__tag--featured` | `featuredTag` (rendered as a media-OVERLAY badge in `sgs-product-card__media-wrap` when `variantStyle='featured'`; falls back in-body when imageless) |
| nested `sgs-button sgs-button--primary\|--secondary` | CTA (`ctaText` / `ctaUrl`); on conversion set `ctaBehaviour='learn-more'` (the only typed-mode behaviour) |

**Converter scope note:** these are DRAFT INPUT tokens (what the converter reads from a draft's HTML). They are NOT identical to the runtime SSR classes that bound-mode `render.php` emits — the live variable branch uses `price-row`/`product-card__media` (no BEM prefix), the typed built-in + non-variable branches use `sgs-product-card__price-row`/`sgs-product-card__media-wrap`. A live-DOM parity check will see this divergence; it is intentional (only the typed built-in path is converter-input-shaped). The image container class differs by branch (`product-card__media` variable vs `sgs-product-card__media-wrap` non-variable/typed) — CSS targets all forms; a future unifier should converge them but must update all three render sites together.

Converter routing of these classes to TYPED-ATTR destinations (not child InnerBlocks) is the FP-H direction — `canonical_slot`/`role`/`attr_type` metadata via `/sgs-update`, per the design gate above.

---

## Block Customisation Standard (MANDATORY — D209)

Every new SGS block MUST follow this customisation standard. Violations are caught by the `check-dead-controls.js` prebuild guard.

### 1. Native `supports` for wrapper-level controls

Use WP core `supports` for spacing, colour, border, and typography controls on the block wrapper. Do NOT re-implement these with custom attributes.

### 2. Shared `TypographyControls` component (MANDATORY since D209)

**All per-element typography UI MUST use the shared `TypographyControls` component** (`src/components/TypographyControls.js`) for editor controls, and the **`sgs_typography_css_rule()` helper** (`includes/helpers-typography.php`, auto-loaded via `render-helpers.php`) for PHP render output.

**What `TypographyControls` provides:**
- Font size: responsive `RangeControl` + unit dropdown (NOT freeform, NOT token slugs — one default per tag)
- Font weight: dropdown
- Font style: dropdown
- Line height: `RangeControl` + unit dropdown

**Why this is mandatory (D209 — Bean R-31-13):**
> "Blank-box/token font controls are the wrong UI pattern. The inconsistency across 6 blocks (counter, whatsapp-cta, mobile-nav, option-picker, trust-bar, product-card) was audited and all migrated. The shared component is documented here so future blocks use it and the inconsistency does not recur."

**Usage (edit.js):**
```js
import { TypographyControls } from '../../components/TypographyControls';
// In InspectorControls:
<TypographyControls
    label={ __( 'Quote typography', 'sgs-blocks' ) }
    baseProp="quoteFontSize"
    attributes={ attributes }
    setAttributes={ setAttributes }
/>
```

**Usage (render.php):**
```php
$quote_typography_css = sgs_typography_css_rule(
    '.sgs-testimonial__quote',
    $attributes,
    'quoteFontSize'  // base prop name
);
// Output inside a uid-scoped <style> block
```

**Hand-rolled font controls are BANNED** — if you find one in an existing block, file a gap candidate and migrate it.

### 3. Custom attrs + controls for inner text elements

Per-element typography (quote text, heading, label, price, etc.) uses the `TypographyControls` component per the above. Per-element colour uses `sgs_colour_value()`.

### 4. CTAs via `sgs/multi-button` + `sgs/button` InnerBlocks

Every composite block that renders CTAs uses an InnerBlocks slot defaulting to `sgs/multi-button` + `sgs/button`. Exception: `sgs/product-card` is a built-in-element card — its CTA renders from typed attributes via the element-MIRROR pattern (D204, Bean sign-off 2026-06-10).

### 5. CSS fallback colours use `:not([style*="color"])`

So custom values win over the fallback. Variant bg/border/colour made overridable via `:where()` (E9 pattern, D206).

### 6. Block Selectors API

`"selectors": { "typography": ".sgs-block__text-element" }` in `block.json` targets native WP typography controls to the primary text element, not the wrapper.

### 7. `imageControls: true` for any block rendering `<img>`

Declare `"supports": { "sgs": { "imageControls": true } }` in `block.json` so the universal image-controls extension applies. Document deliberate opt-out.

### 8. Dead-control audit before shipping

A block change is not done until the inspector has ONE control per setting + zero orphans. Audit: (1) duplicate/overlap controls, (2) dead control [control → no render], (3) render-without-control [attr render.php reads but no editor control — the guard is BLIND to this], (4) vestigial attrs.

---

## Shared Features Across All Blocks

### Responsive Controls

Every block with layout/sizing attributes gets a responsive control panel in the editor sidebar:

```
[Desktop] [Tablet] [Mobile]
```

Switching between views shows/hides the relevant attribute inputs. Generates CSS classes: `.sgs-desktop-*`, `.sgs-tablet-*`, `.sgs-mobile-*`.

### Animation & Interactivity Extension

All SGS blocks receive animation and interaction controls via the block extension system (`addFilter`). Three categories of effects: **entrance animations** (scroll-triggered), **hover animations** (user interaction), and **scroll-linked effects** (continuous).

**Competitive context:** Elementor Pro offers 40+ entrance animations, parallax scroll, mouse effects, and 3D tilt. Motion.page offers scroll-linked timeline animations. Kadence Pro offers 12 entrance animations. SGS matches or exceeds these with a CSS-first approach that produces zero layout shift and respects `prefers-reduced-motion`.

**Implementation status (as of 2026-04-28):**
- Entrance animations: **16 of 16 spec'd built** (added `bounce-in`, `reveal-up` 2026-04-28)
- Hover effects (universal extension): **7 of 8 built** — lift (via scale + shadow), scale, glow, border-accent, shadow-grow, colour-shift, tilt-3d. Missing: `border-accent` was per-block-only until 2026-04-28; now universal.
- Scroll-linked: **1 of 3 built** — `sgsScrollProgress` CSS variable (global, exposes `--sgs-scroll-progress` 0-1 on documentElement). Still missing: `sgsParallax` (background + element variants) — pending.

#### Entrance Animations (scroll-triggered via IntersectionObserver)

**Attributes (injected into all `sgs/*` blocks):**
- `sgsAnimation` — none | fade-up | fade-down | fade-in | fade-left | fade-right | slide-up | slide-down | slide-left | slide-right | scale-in | scale-out | rotate-in | flip-in | blur-in | **bounce-in** | **reveal-up** (default: none) — 16 active types as of 2026-04-28
- `sgsAnimationDelay` — 0 | 100 | 200 | 300 | 400 | 500 ms (default: 0)
- `sgsAnimationDuration` — fast (300ms) | medium (500ms) | slow (800ms) | very-slow (1200ms) (default: medium)
- `sgsAnimationStagger` — boolean (default: false — when true, direct children animate in sequence with incrementing delay)
- `sgsAnimationStaggerDelay` — integer ms (default: 100 — delay between each child animation)
- `sgsAnimationOnce` — boolean (default: true — animate only on first scroll into view, not every time)

**Implementation:**
- CSS classes: `.sgs-animate--fade-up`, `.sgs-animate--slide-left`, etc.
- Initial state: elements start with `opacity: 0` and transform offset
- Triggered state: `.sgs-animate--visible` class added by IntersectionObserver
- Stagger: JS calculates `animation-delay` per child based on index × staggerDelay
- CSS: `transition: opacity {duration} ease-out, transform {duration} ease-out`
- GPU-accelerated: only `transform` and `opacity` are animated — no layout thrashing

#### Hover Animations (CSS-first, JS for complex effects)

**Attributes (injected into all `sgs/*` blocks):**
- `sgsHoverEffect` — none | lift | scale | glow | tilt-3d | border-accent | shadow-grow | colour-shift (default: none)
- `sgsHoverScale` — number 1.0-1.2 (default: 1.05 — for scale effect)
- `sgsHoverLift` — number px (default: -4 — translateY offset for lift effect)
- `sgsHoverTransitionDuration` — fast (150ms) | medium (300ms) | slow (500ms) (default: medium)

**Pure CSS effects (no JS):**
- `lift` — `transform: translateY({hoverLift}px)` + shadow increase on `:hover`
- `scale` — `transform: scale({hoverScale})` on `:hover`
- `glow` — `box-shadow: 0 0 20px {accentColour}` on `:hover`
- `border-accent` — `::before` pseudo-element scaleX transition (accent-colour top border slides in)
- `shadow-grow` — shadow transitions from `shadow-sm` to `shadow-lg` on `:hover`
- `colour-shift` — background-colour transitions to a lighter/darker variant on `:hover`

**JS-required effects (loaded only when used):**
- `tilt-3d` — **BUILT 2026-04-28**. Perspective-based 3D tilt following mouse position. Uses `mousemove` event + `requestAnimationFrame`. `transform: perspective(800px) rotateX({tiltY}deg) rotateY({tiltX}deg)` with MAX_TILT 6deg. Resets smoothly on `mouseleave`. Skips entirely when `prefers-reduced-motion: reduce`. ~30 lines vanilla JS at `assets/js/tilt-3d.js`. Enabled per-block via `sgsHoverTilt3D` boolean attribute.

**Universal hover attributes registered by hover-effects.js (12 total as of 2026-04-28):**
- `sgsHoverBgColour`, `sgsHoverTextColour`, `sgsHoverBorderColour` — colour shifts (3)
- `sgsHoverScale`, `sgsHoverScalePreset` — scale (2, default 1.02)
- `sgsHoverShadow` — shadow elevation (default 'medium')
- `sgsHoverImageZoom` — inner image zoom on hover (default true on most blocks)
- `sgsHoverGrayscale` — grayscale filter on hover
- `sgsHoverBorderAccent` — border-accent line slides in from left on hover **(universal as of 2026-04-28)**
- `sgsHoverTilt3D` — mouse-tracking 3D rotation **(BUILT 2026-04-28)**
- `sgsHoverDuration` — transition duration ms (default 250)
- `sgsStaggerDelay` — stagger delay for child animations
- `sgsBlockLink`, `sgsBlockLinkTarget` — wrap entire block in link

**Several blocks opt out of universal scale/shadow/image-zoom defaults** (breadcrumbs, container, countdown-timer, counter, form, form-step, all form-field-* blocks, hero, mega-menu, tabs, tab — `announcement-bar` removed from this roster, RETIRED D209) — these blocks shouldn't lift or scale visually. Colour hovers and block-link still work on them. (Exact roster is DB-authoritative — query `/sgs-db`.)

**Inner element hover effects (for specific blocks):**
- Card Grid, Info Box, Card: already have per-block hover attributes
- The extension adds block-level hover to ALL blocks for wrapper-level effects
- Inner element effects (e.g., icon rotate on card hover) handled by individual block CSS

#### Scroll-Linked Effects (continuous, viewport-aware)

**Attributes (injected into all `sgs/*` blocks):**
- `sgsParallax` — none | background | element (default: none)
  - `background` — background image moves at different speed to scroll (CSS `background-attachment: fixed` with fallback)
  - `element` — entire block translates on scroll (subtle vertical shift)
- `sgsParallaxStrength` — number 0-100 (default: 30 — higher = more pronounced effect)
- `sgsScrollProgress` — boolean (default: false — when true, a CSS custom property `--sgs-scroll-progress` is set on the element, ranging 0-1 based on element's position in viewport)

**Implementation approach:**
- CSS Scroll-Driven Animations (`animation-timeline: scroll()`) used where supported (Chrome 115+, Firefox 135+)
- JS fallback using `IntersectionObserver` + `requestAnimationFrame` for unsupported browsers
- `--sgs-scroll-progress` custom property enables creative CSS-only effects:
  ```css
  /* Example: progress bar fills as section scrolls into view */
  .my-element {
      width: calc(var(--sgs-scroll-progress, 0) * 100%);
  }
  ```

#### General Page Effects

These are not block-level attributes but theme/page-level CSS utilities:

- **Floating/bobbing elements** — CSS keyframe `@keyframes sgs-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }` — applied via `.sgs-float` utility class on decorative images
- **Smooth scroll-snap** — `scroll-snap-type: y proximity` on full-page section layouts
- **Section colour transitions** — `scroll-timeline` with `@keyframes` that blend `background-color` between sections (progressive enhancement — static fallback)

#### Reduced Motion (Non-Negotiable)

All animations check `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
    .sgs-animate--fade-up,
    .sgs-animate--slide-left,
    /* ... all animation classes */ {
        transition: none !important;
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
    }
    .sgs-decorative-image {
        /* Disable parallax, show at static position */
    }
    [data-sgs-hover="tilt-3d"] {
        /* Disable 3D tilt, keep static */
    }
}
```

#### Performance Budget

- Entrance animation CSS: < 5KB (shared across all blocks)
- Hover animation CSS: < 2KB
- IntersectionObserver JS: < 2KB (already loaded for existing animations)
- Parallax JS (fallback): < 1KB, loaded only when parallax attributes are set
- 3D tilt JS: < 1KB, loaded only when tilt-3d hover is used
- Total extension overhead: < 10KB CSS + < 4KB JS worst case
- All animations use GPU-accelerated properties only (`transform`, `opacity`, `box-shadow`)

### Visibility Extension

All blocks can be conditionally shown/hidden per breakpoint:

- `hideOnMobile` — boolean
- `hideOnTablet` — boolean
- `hideOnDesktop` — boolean

**Phase 5.1 (planned):** Extend with role-based, login-state, and schedule-based visibility conditions (server-side `render_block` filter — zero frontend cost).

---

### Block Defaults System (Phase 3.2 — Built 2026-04-28)

Lets users save the currently-configured attributes of any SGS block as the default for new instances site-wide. Mirrors Kadence's "Configurable Defaults" UX.

**Components:**
- `Block_Defaults` PHP class (`includes/class-block-defaults.php`) — REST endpoints, option storage, editor injection, admin settings page
- `block-defaults.js` JS extension (`src/blocks/extensions/block-defaults.js`) — adds "Save as Default" button to every SGS block's Advanced inspector panel; reads `window.sgsBlockDefaults` and merges saved values into block attribute schemas via `blocks.registerBlockType` filter

**Flow:**
1. User configures a block, opens Advanced panel, clicks "Save as Default"
2. JS POSTs `{block, attributes}` to `/sgs-blocks/v1/defaults` (block name in body — WP REST routes can't have forward slashes in route parameters)
3. PHP sanitises (strips internal WP attrs `lock`/`className`/`style`/`metadata`, deep-sanitises rest), stores in `wp_options['sgs_block_defaults']` (single JSON keyed by block name)
4. On next editor load: `Block_Defaults::inject_defaults_script()` outputs `window.sgsBlockDefaults` before the extensions bundle via `wp_add_inline_script`
5. JS extension's `blocks.registerBlockType` filter reads `window.sgsBlockDefaults[name]` and merges into each block's attribute defaults — synchronous, no extra REST roundtrip
6. New block insertions inherit saved defaults automatically; existing instances unaffected

**Admin page:** `Settings → SGS Block Defaults` lists all saved defaults with per-block "Reset" buttons + global "Reset all".

**Permission:** `edit_theme_options` (same level as Customiser).

**Storage format:** `{"sgs/hero": {"textAlign": "left", "minHeight": 600, ...}, "sgs/cta-section": {...}}` — JSON object, single option row.

---

### Floating UI (Customiser-driven, NOT blocks)

Global floating UI elements (Back to Top button, Reading Progress bar) live in `Appearance → Customise → SGS Floating UI`, not as Gutenberg blocks. They render fixed-position regardless of placement, so the block model doesn't fit — clients would expect them to render at the drop point and be confused when they don't.

**Architecture:**
- Customiser registration: `theme/sgs-theme/inc/floating-ui-customiser.php` (16 settings across two sub-panels)
- Frontend output: `theme/sgs-theme/inc/floating-ui-output.php` (hooks `wp_footer` priority 5, reads `theme_mod`s, outputs HTML conditionally based on `_enabled` flags)
- Live preview JS: `theme/sgs-theme/assets/js/customiser-preview.js` (mutates CSS variables and toggles classes on the floating UI containers in real-time as Customiser controls change)
- Settings stored as `theme_mod` (auto-scoped to active theme, separate per client)

**Per-page override:** post meta `_sgs_hide_floating_ui` (array of slugs to hide). Editor sidebar meta box "SGS Floating UI Overrides" with checkboxes for each element.

**Back to Top settings (7):** enabled, position (4 corners), show after px scrolled, shape (circle/pill/square), colour (palette slug), size px, icon (arrow-up/chevron-up/double-chevron-up).

**Reading Progress settings (9):** enabled, mode (bar/countdown/both), position (top/bottom), target selector, words-per-minute (default 225), bar colour, bar height, post types to show on, show when finished.

**Retired blocks:** `sgs/back-to-top`, `sgs/reading-progress`, `sgs/data-display`, `sgs/icon-block` no longer exist. Existing post content carrying `wp:sgs/back-to-top` / `wp:sgs/reading-progress` markers renders WordPress's "block has been deleted" placeholder; operators reconfigure the floating UI via the Customiser at *Appearance → Customise → SGS Floating UI*.

**Why not a settings admin page:** Customiser has live preview — clients see button reposition / change colour as they drag sliders. Save-and-refresh on a settings page kills the design-iteration feel.

---

## Build Toolchain

- **@wordpress/scripts** — webpack-based build (standard WordPress tooling)
- **@wordpress/create-block** — used for scaffolding new blocks
- **React** — editor UI components (WordPress block editor runs on React)
- **No external CSS framework** — all styles use design tokens from theme.json
- **No external JS libraries** — vanilla JS for frontend interactivity

### Build Commands

```bash
npm run build         # Production build (includes --experimental-modules for viewScriptModule)
npm run start         # Development with hot reload
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
npm run format        # Prettier
```

**Note:** The `--experimental-modules` flag is required in the `build` and `start` scripts when using `viewScriptModule` in block.json (introduced WP 6.5). This flag may be stabilised in future @wordpress/scripts versions — verify with the installed version. In package.json:

```json
{
  "scripts": {
    "build": "wp-scripts build --experimental-modules",
    "start": "wp-scripts start --experimental-modules"
  }
}
```

---

## Block Categories

Blocks registered under a custom "SGS" category in the inserter:

```php
function sgs_block_categories( $categories ) {
    return array_merge(
        [
            [
                'slug'  => 'sgs-layout',
                'title' => 'SGS Layout',
            ],
            [
                'slug'  => 'sgs-content',
                'title' => 'SGS Content',
            ],
            [
                'slug'  => 'sgs-interactive',
                'title' => 'SGS Interactive',
            ],
        ],
        $categories
    );
}
add_filter( 'block_categories_all', 'sgs_block_categories' );
```

---

## Integration with SGS Theme

Blocks read design tokens from `theme.json` at both build time and runtime. In the editor, the `DesignTokenPicker` component reads the theme's colour palette and offers those as options. On the frontend, blocks output CSS custom properties that resolve to whatever the active style variation defines.

This means: build blocks once, and they automatically adapt to any client site's colour scheme.


---

## Phase 2A Additions (2026-05-20 — commits a7f85a4a / 393e3d06 / 0201c0d9)

### sgs/responsive-logo (NEW — Phase 2A Branch B)

Three logo slots (desktop / tablet / mobile) with picture element per-breakpoint swap (600px / 1024px). Optional Vivus Instant SVG animation lazy-loaded via dynamic import (~7KB, draw-on-load / hover-redraw / scroll-trigger). When no logo is set on the block, falls back to the WP site default core/site-logo via get_theme_mod custom_logo.

Attributes: desktopLogoId, tabletLogoId, mobileLogoId, svgAnimationSource, animationStyle (enum: none / draw-on-load / hover-redraw / scroll-trigger), width, linkToHome, alt.

Supports: align, spacing.margin/padding, sgs.imageControls: true.

SGS-BEM: `.sgs-responsive-logo` root + `__picture` / `__image--desktop/tablet/mobile` / `__svg` / `__link` + `--animate-{draw,hover,scroll}` modifiers + `.is-animating` / `.is-animated` states.

Competitive moat: no WP competitor (Kadence Pro, Spectra Pro, GenerateBlocks Pro, Astra Pro, Blocksy Pro) currently has H/Square/Mark aspect-ratio variants per breakpoint in one block.

### sgs/icon (NEW — Phase 2A Branches C + H)

Single-icon block with FOUR icon sources: Lucide (1917 icons via existing lucide-icons.php), WordPress @wordpress/icons (45 inline SVGs via new wp-icons.php), Dashicons (15 curated, auto-enqueues dashicons font when used), emoji (with WCAG aria-label fallback "icon" when blank).

Attributes: iconSource (enum), iconName, emojiChar, dashiconName, wpIconName, iconSize, iconColour, linkUrl, linkTarget, linkRel, ariaLabel.

SGS-BEM: `.sgs-icon` root + `__link` / `__svg` / `__emoji` / `__dashicon` + `--source-{lucide,wp-icon,dashicon,emoji}` + `--size-{small,medium,large,custom}`.

Retired: the legacy sgs/icon-block slug (was a backward-compat shim) was deleted in commit 8a587e10.

**2026-06-02 enhancements:** shape backgrounds (circle / square / rounded-square variants with background colour + padding attrs), clickable mode (wraps icon in `<a>` with `linkUrl` / `linkTarget` / `linkRel` attrs), and hover effects (lift / scale / colour-shift via the universal hover extension). These bring sgs/icon to parity with the converter's emit needs for icon slots within `sgs/trust-bar` Bound mode and `sgs/info-box` icon areas.

### sgs/option-picker (2026-06-02, theme thread; C7 group-label controls D206)

Atomic radio-group pill chooser. Category: `sgs-interactive`. Built as Phase A of Spec 24 FR-24-15 (variation-sets + option-picker system). Battle-ready as both a standalone editor block and the converter's emit target for pill-group slots.

Semantics: visually-hidden `<input type=radio>` + `<label>` + pill `<span>` per option. CSS `:checked` active state (no JS required for selection display). Bubbles a `sgs:option-selected` custom event for parent-block Interactivity API stores to consume. NOT `sgs/button` — distinct atomic block.

**Note on `data-wp-on--sgs:option-selected`:** WP Interactivity silently does NOT bind custom event names containing a colon — use a `data-wp-init` + captured-context bridge (`getContext()` + plain `addEventListener`) instead. Memory: `wp-interactivity-data-wp-on-rejects-colon-event-names`.

Attributes: `options` (array of `{ value, label, isDefault }`), `variant` (source toggle: `typed` | `bound` — mirrors FR-24-2), `display_as` (`pills` | `static-list` | `hidden`), `pillStyle` (`filled` | `outlined`), plus standard animation/hover extension attrs.

**C7 additions (D206):** group-label font-size + colour controls (legend inline style; `sgs_colour_value()`). Typography migrated to `TypographyControls` component (D209).

Render: Dynamic `render.php`. `viewScriptModule` bubbles `sgs:option-selected`. No-JS default state: options render as visible static labels (FR-24-16).

SGS-BEM: `.sgs-option-picker` root + `__option` / `__input` / `__label` / `__pill` + `--style-filled/outlined` + `--display-pills/static-list` + `.is-selected` state on checked option.

See: Spec 24 §FR-24-11..FR-24-17 + D144 + D206.

---

### sgs/cart (2026-06-02, theme thread)

WooCommerce cart count badge (v1). Category: `sgs-interactive`. Displays a live item count from the WC cart; intended for use in headers/navigation alongside `sgs/mega-menu` or `core/navigation`. Gracefully absent (renders nothing) when WooCommerce is not active.

Attributes: `iconSlug` (default `shopping-cart` Lucide icon), `badgeColour` (token slug, default `accent`), `showWhenEmpty` (boolean, default `false` — hides badge when count is 0).

Render: Dynamic `render.php`. `viewScriptModule` uses the WC `wc-cart-fragments` mechanism to update count without full page reload.

SGS-BEM: `.sgs-cart` root + `__icon` / `__count` + `--empty` modifier.

---

## WooCommerce Blocks Layer (Spec 27/28/30 — D204, D210, D213, D214)

The blocks below form the WooCommerce commerce layer shipped as part of the SGS product/shop build. They are production blocks — not experimental. All integrate with the SGS design-token system and WC REST API/Store API.

### sgs/content-collection (Spec 24 FR-24-4/5/6; showPickers attr D210)

Query-driven grid of content items. Category: `sgs-content`. Runs its own `WP_Query` (or `wc_get_products`) with a named selection rule and renders each result through the dual-mode `sgs/product-card`.

**Version:** 1.2.0

**Attributes (key; see `02-SGS-BLOCKS-REFERENCE.md` for full schema):**
- `contentType` — `sgs_product` (default)
- `selectionRule` — newest | featured | most-expensive | cheapest | most-popular | handpicked | category
- `count` — integer (default: 12)
- `columns` / `columnsTablet` / `columnsMobile` — responsive grid columns
- `gap` / `gapTablet` / `gapMobile` — raw CSS length (shared ContainerWrapperControls pattern)
- `showPickers` — boolean (default: `true`). Forwarded to each rendered `sgs/product-card`. When `false`, suppresses in-card option-picker UI — useful for browsing/shop grids. Added D210.
- `ctaBehaviour` — learn-more | add-to-basket | buy-now (forwarded to each product-card)
- `showLadder` — boolean (default: `false`). Forwarded to each product-card (browsing grids default false)
- `handpickedIds` — array of post IDs (for handpicked selectionRule)
- `emptyMessage` — string shown when query returns 0 results (FR-24-6)
- Full container-mirror attrs: `widthMode`, `contentWidth`, `maxWidth`, `gridTemplateColumns*`, etc.

**Render:** Dynamic `render.php`. Editor preview uses `ServerSideRender`.

**SGS-BEM:** `.sgs-content-collection` root.

### sgs/buybox (FR-30-7 / D210)

WooCommerce single-product buybox: wires `sgs/option-picker` pill axes to the shipped cart proxy engine. Thin wrapper block that mounts the `sgs/product-card` Interactivity store (proxy-wire M-C2, 409 re-sync, availability greying) via `view_script_module_ids`. Designed for placement in the single-product page template alongside `woocommerce/product-gallery` and `woocommerce/add-to-cart-form`.

**Version:** 1.0.4. Category: `sgs-content`.

**Attributes:**
- `soldOutLabel` — string (aria-label suffix for sold-out pills; screen-reader only)
- `unavailableLabel` — string (aria-label suffix for unavailable combinations)
- `notifyMeLabel` — string (stored now; notify-me capture deferred to future release)
- `addToCartLabel` — string (override Add to Cart label; empty = translated default)
- `perUnitDenomination` — string template using `%s` as unit placeholder
- `showLadder` — boolean (default: `true`; set `false` in narrow sidebar contexts)
- `framingMode` — savings | loss-aversion | neutral (saving-label framing; default: loss-aversion)
- `decoyEnabled` — boolean (default: `false`; targets 2nd-largest pack with "Best value" badge when true)

**Context:** `usesContext: ["postId"]` — reads the WC product from the surrounding post context.

**Render:** Dynamic `render.php`. Falls back to core WC blocks for simple products or when WooCommerce is absent.

**Live-verified:** Product 540 on sandybrown canary — 3 combos add exact variation via `/sgs/v1`, foreign id 4xx handled, dismissible error, single-variant axes suppressed (D210).

### sgs/product-search (FR-30-5 / D214)

Accessible combobox search that fetches live product suggestions. Includes a no-JS fallback `<form method="get">` that submits to the theme's product-scoped search results page.

**Version:** 1.1.0. Category: `sgs-interactive`.

**Attributes:**
- `displayMode` — `inline` | `icon` (default: `inline`). `inline` = always-visible search bar. `icon` = native `<details>`/`<summary>` disclosure widget (no JS required to open/close).
- `placeholder` — string (input placeholder text)
- `buttonLabel` — string (submit button label)
- `maxResults` — integer (default: 10; max results shown in the live list)

**REST endpoint:** `GET /wp-json/sgs/v1/product-search?q=<query>` — registered REST route, nonce-optional (public), rate-limited (>30/IP/min → 429 + `Retry-After`), returns `[{id, title, permalink, thumbnail}]` only. Draft products never leaked (live-verified D214). Response is `no-store` cache. XSS-inert: server uses `wp_strip_all_tags` + `html_entity_decode`; client inserts via `span.textContent`.

**Security guard:** `check-product-search-guards.js` (11 assertions) wired to the `prebuild` npm script. Passes on every build; no CI exists in this repo (same floor as the dead-control guard).

**Render:** Dynamic `render.php`. `viewScriptModule` handles live suggestion fetching + combobox ARIA (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-live`).

**Placement:** Nested in `theme/sgs-theme/parts/sgs-archive-toolbar.html` (live-verified D214 — `aria-expanded` false→true, listbox populated, live region "N products found", ArrowDown→`aria-activedescendant`).

### sgs/filter-search (FR-30-6 / D214)

Type-to-find input that narrows a WooCommerce attribute filter's visible options. Auto-shown only when the attribute has ≥16 visible (published-only, `hide_empty=true`) terms — the Baymard Research threshold above which users need a finder.

**Version:** 1.0.0. Category: `sgs-interactive`.

**Parent constraint:** `ancestor: ["woocommerce/product-filter-attribute"]` — must be nested inside a WC Product Filter (Attribute) block, before its chips.

**Attributes:**
- `attributeId` — integer (WC attribute taxonomy ID; 0 = auto-detect from ancestor)
- `threshold` — integer (default: 16; minimum: 2; terms below this = block renders nothing)
- `placeholder` — string (input placeholder text)

**Visibility behaviour:** render.php counts published-only terms via `get_terms` with `hide_empty=true`. Block renders nothing when the term count is below `threshold` — no empty wrapper emitted.

**Render:** Dynamic `render.php`. `viewScriptModule` handles keystroke-narrowing of the ancestor's term chips; ARIA: `role="searchbox"`, live region "N of M options shown", "No matching options" message. Core WC URL-filtering is untouched — the block only hides/shows chips client-side.

**Live-verified D214:** 12 published terms → input renders at exactly 16 with a 4th added; drops at 15; draft-only term excluded from count. Typing "test" narrowed chips to 4 with correct ARIA count. Zero console errors. Canary restored to clean 12-term state after verification.

### sgs/collapsible-text (D213 — 2026-06-11)

Operator-editable body copy that optionally collapses behind a "Read more / Read less" toggle. Designed for shop archive SEO copy where the full text must be available to crawlers and assistive technology in every state.

**Version:** 1.0.0. Category: `sgs-content`.

**Key behaviour:** Full text is always SSR'd into the page HTML (CSS `line-clamp` hides the overflow visually, NOT `display:none`). Toggle labels are i18n'd via server-emitted `data-read-more` / `data-read-less` attributes — no hardcoded strings in JS.

**Attributes:**
- `text` — string (RichText body copy; `role: "content"`)
- `collapsible` — boolean (default: `false`; when `false` renders as plain text block)
- `collapsedLines` — integer (default: 4; minimum: 1; CSS `--sgs-ct-lines` custom property)
- `fontSize` / `fontSizeTablet` / `fontSizeMobile` — responsive font size (number; via `TypographyControls`)
- `fontSizeUnit` — string (default: `px`)
- `fontWeight` / `fontStyle` / `lineHeight` / `lineHeightUnit` — typography controls

**Supports:** `align` (wide/full), `anchor`, `color` (text + background), `spacing` (margin + padding), `typography.textAlign`. Block Selectors API: `".sgs-collapsible-text__body"` for native font controls.

**Render:** Dynamic `render.php`. `viewScriptModule` toggles the `--is-expanded` state + updates the toggle label.

**Empty-guard:** when `text` is empty (or whitespace only), render.php emits nothing — no wrapper element.

**SGS-BEM:** `.sgs-collapsible-text` root + `__body` + `__toggle` + `--collapsible` / `--expanded` modifiers.

---

### sgs/timeline (NEW — Phase 2A Branch D)

Date-based timeline (distinct from existing sgs/process-steps which is positional/numbered). Vertical or horizontal orientation. Alternating / left / centre alignment (vertical only). Scroll-reveal via IntersectionObserver with stagger delay (default 100ms) honouring prefers-reduced-motion. Connector style: line / dashed / dotted. Semantic ol/li/time markup.

Attributes: orientation (enum), alignment (enum), entries (array of date/title/description/icon/image), connectorStyle, connectorColour, dateColour, revealOnScroll, revealStagger.

SGS-BEM: `.sgs-timeline` root + `--vertical/horizontal` + `--align-{left,centre,alternating}` + `__entry` / `__date` / `__node` / `__content` / `__title` / `__description` / `__image` / `__connector` + `.is-revealed` state.

Future enhancement (parked): P-TIMELINE-ADVANCED-VISUAL-EFFECTS — textured/themed connector (vine, tree, MIC bricks-falling-into-place), per-entry colour-fill on scroll progression, line pulsing. See .claude/parking.md for full implementation sketch.

### sgs/pricing-table polish (Phase 2A Branch E)

Five Kadence-Pro-parity additions:
1. billingToggle boolean to 4-value enum (monthly-yearly / monthly-only / yearly-only / none) with backward-compat
2. features array of strings to array of objects with text and included keys, render emits check/cross SVG (legacy strings treated as included=true)
3. Per-plan iconName (Lucide picker)
4. Per-plan ribbonText + ribbonColour (absolute top-right badge)
5. Per-plan savingsBadgeText (auto-shown when yearly toggle active)

### Universal-extension UI components (Phase 2A Branch F)

Six shared React components in plugins/sgs-blocks/src/components/universal-extensions/. ALSO ship globally via addFilter editor.BlockEdit HOC in src/blocks/extensions/index.js — every block already gets them in the inspector automatically. The new components are for direct-import in new blocks.

### Block attribute audit (Phase 2A Branch G)

Audit report at reports/2026-05-20-block-attribute-audit.csv. 9 block.json retrofits applied. Confirmed: imageControls is the only supports.sgs flag the universal extensions gate on. All other extensions are attribute-driven (apply universally via render_block filters).

---

## 2026-05-20 — Block-variation system (P2.iii) + attribute-gap promotion path (P2.ii)

**Block variations:** cv2 walker now has an `essence_match_variation` tier (confidence 0.70-0.90) that emits `register_block_variation()` named variants (e.g. featured-product-card, trial-product-card as variants of sgs/product-card) instead of scaffolding new blocks. PHP variations registered via `includes/variations/sgs-*.php` files auto-discovered by `class-sgs-block-variations.php`. Implementation: `essence_match_detector.py` + `convert.py` walker tier integration. Commit `36ef9552`.

**Attribute promotion:** new operator-driven CLI `stage_attribute_promotion.py` (commands: `list --top N`, `promote --id <row_id>`, `status`) mutates block.json `attributes` + emits render.php inline-style branch for promoted gap candidates. Reads from BOTH uimax DB + sgs-framework DB candidates (1128-row backlog). Manual confirmation gate + idempotent. Commit `37c92950`.

**How blocks evolve over time:** during clone runs, the universal walker routes gap candidates to D3 (per Spec 22 FR-31-5). Operator periodically runs the promotion CLI to convert high-confidence candidates into block.json schema additions. Next clone run picks up the new attrs, lifting them via D1 instead of flagging as gap. Each promoted attr permanently expands the block's typed surface for future clones.
