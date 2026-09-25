---
doc_type: spec
spec_id: 2
spec_version: "1.6"
project: small-giants-wp
title: SGS Blocks — Custom Gutenberg Block Library
status: shipped
last_verified: 2026-09-19
authors: Bean + Claude
---

# SGS Blocks — Custom Gutenberg Block Library

> **Header/Footer/Navigation system.** Specialised container-composite blocks (`status='built'` in the DB, `container_kind` populated): `sgs/site-header`, `sgs/site-footer` (section-KIND, delegate to `SGS_Container_Wrapper` exactly like `sgs/card-grid`/`sgs/feature-grid` — 3 optional named rows + a typed element palette; live inside the `header`/`footer` template parts), `sgs/nav-bar-menu` (layout-KIND — one menu source that collapses nav-bar→burger across 4 tiers incl. custom-px, mega-panel drill-down on mobile, off-canvas escape hatch), `sgs/nav-drawer` (the off-canvas drawer, held to the GOV.UK-grade a11y contract: focus trap, ESC-close, backdrop-dismiss, body-scroll-lock, redundant state signalling, configurable SR labels) and `sgs/nav-drawer-menu` (the drawer's link list). **Header/footer REMAIN WordPress template parts (Spec 37 owns this architecture)** — these blocks are the specialised CONTAINERS used *inside* the parts, not a monolithic header/footer block; Only `src/blocks/{site-header,site-footer,nav-bar-menu,nav-drawer-menu,nav-drawer}/` are permitted; bare `header`/`footer`/`nav` block slugs remain forbidden. Full FR set + the per-breakpoint override model + the never-overflow Cluster+clamp layout live in **Spec 37** (`37-HEADER-FOOTER-BUILDER.md`); the global-defaults/Site-Info access model is owned by **Spec 36** — this spec does not duplicate those FRs, see the "Header / Footer / Navigation System" section below for the block-roster summary + cross-references.
>
> **Block architecture notes.** Composite blocks register inserter-discoverable variations and block styles via PHP sibling files `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php`, auto-discovered by `includes/variations/class-sgs-block-variations.php`. Variations register via `add_filter('get_block_type_variations', ...)` (WP 6.5+ canonical PHP path); block styles via `register_block_style()`; each variation declares its default style via the `className` attribute. Most SGS blocks are dynamic — `save` returns `null` and `render.php` drives 100% of the frontend output; `sgs/container` supports advanced backgrounds (image / video / parallax+ken-burns / gradient-overlay). The shared `TypographyControls` component + `sgs_typography_css_rule()` helper are MANDATORY for all per-element typography (see Block Customisation Standard below). Markup examples are seeded from `block.json` defaults via `plugins/sgs-blocks/scripts/generate-markup-examples.py` plus hand-authored composite examples. `wp_set_script_module_translations()` is wired in the `class-sgs-blocks.php` registration loop for blocks using `viewScriptModule`. The device-visibility coexistence rule is documented in `includes/device-visibility.php`. The live block count and per-block attribute counts are DB-authoritative — query `/sgs-db` or see `02-SGS-BLOCKS-REFERENCE.md` (regenerated on every `/sgs-update`); never hard-code them here.

## Purpose

A WordPress plugin providing a curated library of custom Gutenberg blocks purpose-built for Small Giants Studio client sites. Replaces Spectra Pro with blocks that produce clean, semantic markup, respect the SGS Theme design tokens, and render correctly across all breakpoints.

> **Per-block attribute reference is auto-generated:** see [`02-SGS-BLOCKS-REFERENCE.md`](02-SGS-BLOCKS-REFERENCE.md). Regenerate via `python plugins/sgs-blocks/scripts/generate-block-reference.py`. **This file** (`02-SGS-BLOCKS.md`) covers architectural patterns, customisation standards, and build status — the live reference covers attribute detail.

---

## Plugin Structure

```
sgs-blocks/
├── sgs-blocks.php               # Plugin bootstrap (registration, block loading)
├── package.json                  # Node dependencies (@wordpress/scripts, etc.)
├── webpack.config.js             # Build config (extends the @wordpress/scripts default with non-block entry points)
├── assets/                       # Static plugin assets (admin, brand, css, floating-ui, font-collections, icons, js)
├── scripts/                      # Build, audit, deploy and cloning-pipeline scripts (build-deploy.py, converter/, audit-*.py, …)
├── tests/                        # Test suites and fixtures (fixtures, js, php, playwright)
│
├── src/
│   ├── blocks/                   # One directory per block: block.json + edit.js + render.php + style.css (+ view.js when interactive)
│   │   ├── button/               # ★ Canonical SGS button (atomic) — replaces all uses of core/button. See specs/11-SGS-BUTTON-ARCHITECTURE.md
│   │   ├── multi-button/         # ★ Button container (accepts 0..N sgs/button via InnerBlocks). Replaces core/buttons inside SGS composite blocks
│   │   ├── container/            # Layout container (flexbox/grid)
│   │   ├── hero/                 # Hero section (standard + split variants)
│   │   ├── info-box/             # Info/feature card
│   │   ├── feature-grid/         # Responsive grid container for info-box cards
│   │   ├── counter/              # Animated statistic counter
│   │   ├── trust-bar/            # Trust/badge strip — typed-only, icon resolver. See §5.
│   │   ├── card-grid/            # Flexible image+content grid (overlay/card variants; wc-product + cpt-collection modes)
│   │   ├── testimonial/          # Single testimonial — 7-variant typed-attr block. See §7.
│   │   ├── testimonial-slider/   # Multi-testimonial carousel
│   │   ├── cta-section/          # Call-to-action section
│   │   ├── icon-list/            # Checkmark/icon list
│   │   ├── icon/                 # Single icon (Lucide, WordPress icons, Dashicons or emoji) with optional shape and link
│   │   ├── process-steps/        # Horizontal step timeline
│   │   ├── timeline/             # Date-based vertical/horizontal timeline with scroll-reveal
│   │   ├── accordion/            # Expandable FAQ/content sections
│   │   ├── accordion-item/       # One expandable panel (parent: sgs/accordion)
│   │   ├── tabs/                 # Tabbed content panels
│   │   ├── tab/                  # One tab panel (parent: sgs/tabs)
│   │   ├── brand-strip/          # Logo/brand carousel strip
│   │   ├── notice-banner/        # Inline banner; `displayMode=announcement` gives the sticky announcement bar
│   │   ├── whatsapp-cta/         # WhatsApp floating button + contextual CTA
│   │   ├── pricing-table/        # Service/pricing comparison table
│   │   ├── modal/                # Lightbox/modal overlay
│   │   ├── google-reviews/       # Google Business Profile reviews display
│   │   ├── trustpilot-reviews/   # Trustpilot reviews in the official Trustpilot visual style
│   │   ├── star-rating/          # Star rating display with half-star support and schema.org markup
│   │   ├── team-member/          # Team member card (photo, name, role, bio, social links)
│   │   ├── quote/                # Attributed blockquote (InnerBlocks body + optional attribution)
│   │   ├── heading/              # Single-element heading (primary heading or subheading paragraph)
│   │   ├── text/                 # Single-element body text (`<p>`)
│   │   ├── label/                # Atomic eyebrow / kicker / badge text
│   │   ├── media/                # Content media block (image or video)
│   │   ├── gallery/              # Image gallery (grid / masonry / carousel) with lightbox
│   │   ├── audio/                # Audio player with seven visual styles
│   │   ├── before-after/         # Two-media comparison slider with a draggable divider
│   │   ├── image-sequence/       # Agency-only scroll-scrubbed canvas frame sequence (hidden from the inserter)
│   │   ├── physics-canvas/       # Section whose decorative children become throwable physics bodies
│   │   ├── separator/            # Styleable horizontal divider (line, gradient, optional icon or label)
│   │   ├── social-icons/         # Row of social platform icons with links
│   │   ├── responsive-logo/      # Three-slot logo (desktop / tablet / mobile) with optional SVG animation
│   │   ├── breadcrumbs/          # Auto-generated breadcrumb navigation
│   │   ├── table-of-contents/    # Auto-generated table of contents (smooth scroll, scroll spy, collapsible)
│   │   ├── business-info/        # Business details from Settings > Business Details
│   │   ├── countdown-timer/      # Countdown to a target date, or an evergreen timer
│   │   ├── post-grid/            # Posts in grid / list / masonry / carousel layouts with AJAX filtering
│   │   ├── mega-panel/           # Content container of a mega menu (lives inside an sgs_mega_menu post)
│   │   ├── mega-group/           # One column of a mega panel — heading + link list
│   │   ├── mega-aside/           # Optional side panel of a mega panel
│   │   ├── decorative-image/     # Absolute-positioned decorative floating images/video. See §24.
│   │   ├── option-picker/        # Radio-group pill chooser (sgs-interactive; atomic); group-label controls
│   │   ├── cart/                 # WooCommerce mini-cart: count badge + optional flyout/drawer panel (sgs-interactive)
│   │   ├── buybox/               # ★ WooCommerce PDP area — gallery column + configurator column in a responsive 2-column grid. sgs-content category.
│   │   ├── product-card/         # Product card (typed built-in elements, or wc-product / sgs-cpt live data)
│   │   ├── product-faq/          # Product-page FAQ section with structured FAQ data
│   │   ├── product-faq-item/     # One question/answer pair (parent: sgs/product-faq)
│   │   ├── product-search/       # ★ FR-30-5 — Accessible combobox search + REST /sgs/v1/product-search + inline-bar | icon-expand | full-screen-overlay | command-palette displayMode
│   │   ├── filter-search/        # ★ FR-30-6 — Type-to-find filter narrowing (>15 terms threshold, woocommerce/product-filter-attribute ancestor)
│   │   ├── collapsible-text/     # ★ Operator SEO copy; CSS line-clamp read-more; always SSR'd; i18n toggle labels
│   │   ├── site-header/          # ★ Specialised header container, section-KIND, delegates to SGS_Container_Wrapper. See "Header / Footer / Navigation System" section below + specs/37-HEADER-FOOTER-BUILDER.md
│   │   ├── site-header-row/      # One header row (parent: sgs/site-header) — never-overflow cluster
│   │   ├── site-footer/          # ★ Specialised footer container, section-KIND, delegates to SGS_Container_Wrapper. See same section
│   │   ├── site-footer-row/      # One footer row (parent: sgs/site-footer) — cluster or column grid (up to 6 columns)
│   │   ├── nav-bar-menu/         # One-menu-source nav (bar→burger, 4 tiers incl. custom-px), layout-KIND, mega-panel drill-down. See same section
│   │   ├── nav-drawer-menu/      # The drawer's accordion/drill-down link list (rendered inside sgs/nav-drawer)
│   │   ├── nav-drawer/           # Off-canvas drawer (dialog). See same section
│   │   ├── form/                 # Form wrapper — multi-step, validation, webhook notification
│   │   ├── form-step/            # Groups fields into a step (parent: sgs/form or sgs/choice-flow)
│   │   ├── form-review/          # Summary of entered fields shown before submission
│   │   ├── form-field-address/   # Address field with optional postcode lookup
│   │   ├── form-field-checkbox/  # Checkbox group (multiple selections)
│   │   ├── form-field-consent/   # Consent checkbox (GDPR, terms, marketing)
│   │   ├── form-field-date/      # Date picker with min/max constraints
│   │   ├── form-field-email/     # Email input with validation
│   │   ├── form-field-file/      # File upload with drag-and-drop
│   │   ├── form-field-hidden/    # Hidden value field
│   │   ├── form-field-number/    # Number input with min/max/step
│   │   ├── form-field-phone/     # Telephone input
│   │   ├── form-field-radio/     # Radio group (single selection)
│   │   ├── form-field-select/    # Dropdown select
│   │   ├── form-field-text/      # Single-line text input
│   │   ├── form-field-textarea/  # Multi-line text input
│   │   ├── form-field-tiles/     # Visual tile selection with icons
│   │   ├── choice-flow/          # Branching step-by-step quiz that ends in a result
│   │   ├── choice-flow-question/ # Multiple-choice question step (parent: sgs/form-step)
│   │   ├── choice-flow-result/   # Recommendation terminal of a choice flow (parent: sgs/form-step)
│   │   └── extensions/           # Not a block (no block.json): editor extensions applied to many blocks
│   │       ├── animation.js          # Scroll-triggered animation extension
│   │       ├── responsive-visibility.js  # Show/hide per breakpoint
│   │       ├── hover-effects.js      # Hover-effect controls
│   │       ├── image-controls.js     # Universal image controls (blocks declaring `supports.sgs.imageControls`)
│   │       ├── custom-css.js         # Per-block custom CSS field
│   │       └── fx.js                 # FX (effects) panel
│   │
│   ├── components/               # Shared React components for editor UI
│   │   ├── TypographyControls.js # ★ MANDATORY — shared per-element typography UI. See Block Customisation Standard.
│   │   ├── ResponsiveControl.js  # Breakpoint switcher (mobile/tablet/desktop)
│   │   ├── ResponsiveOverride.js # Per-tier value override wrapper for tier-object attributes
│   │   ├── DesignTokenPicker.js  # Colour picker that reads theme.json tokens
│   │   ├── SpacingControl.js     # Margin/padding control with presets
│   │   ├── AnimationControl.js   # Animation type/trigger selector
│   │   ├── MediaPicker.js        # Image/video picker
│   │   ├── media/                # Media-atom panel layouts (atoms/, controls/, canvasStyle.js)
│   │   └── primitives/           # Re-exports of the WordPress ToolsPanel / ToolsPanelItem primitives
│   │
│   ├── bindings/                 # Editor-side registration of the sgs/site-info block-bindings source
│   ├── header-behaviours/        # Frontend header behaviour module (view.js)
│   ├── shared/                   # Cross-block frontend modules (effects, nav-interactivity, nav-menu-panels, info-toggle)
│   ├── vendor-modules/           # Bundled GSAP modules (Tier G motion — see Spec 38)
│   │
│   └── utils/
│       ├── tokens.js             # Read design tokens from theme.json at runtime
│       └── responsive.js         # Responsive class generation helpers
│
├── build/                        # Compiled output (generated by wp-scripts)
│
└── includes/
    ├── class-sgs-blocks.php      # Main plugin class
    ├── block-categories.php      # Register the SGS block categories (sgs-layout, sgs-content, sgs-interactive, sgs-forms)
    ├── class-sgs-container-wrapper.php  # SGS_Container_Wrapper — the shared wrapper for section/layout-KIND composites
    ├── render-helpers.php        # Loader for the helpers-*.php files that per-block render.php files require
    ├── forms/                    # Form REST API, processor, admin, privacy, upload handling
    ├── media/                    # Media-atom PHP layer (atoms/)
    ├── migrations/               # Numbered database/content migrations
    ├── trustpilot/               # Trustpilot cron, REST, settings, sync
    ├── variations/               # Per-block variations and block styles (sgs-<block>-variations.php, auto-discovered)
    └── ...                       # Further helpers, REST controllers and generated attribute maps
```

---

## Button architecture (sgs/button + sgs/multi-button)

Full spec at [`11-SGS-BUTTON-ARCHITECTURE.md`](11-SGS-BUTTON-ARCHITECTURE.md). Summary:

- **`sgs/button`** is the canonical button block. Replaces all uses of `core/button` inside SGS blocks. 87 attributes (full surface — see spec 11 §8 comparison vs Spectra/Kadence/Stackable/core).
- **`sgs/multi-button`** is the container. Accepts 0..N `sgs/button` instances via InnerBlocks (restricted to children of type `sgs/button`). Per-breakpoint layout direction + alignment. Gap is provided by the shared `ContainerWrapperControls` gap control (raw-px free-input, `sgs_container_gap_value()`) — no separate per-block gap control.
- **Composition pattern:** every composite block that renders CTAs (`sgs/hero`, `sgs/cta-section`, `sgs/feature-grid`, etc.) exposes an InnerBlocks slot whose default template is `sgs/multi-button` containing 2 `sgs/button` instances. **NEW SGS BLOCKS WITH CTAs MUST USE THIS PATTERN** — never render CTAs internally via per-block `ctaPrimary*` attributes. **RECORDED EXCEPTION (Bean sign-off):** `sgs/product-card` is a BUILT-IN-ELEMENT card — its CTA (and every other commerce element) renders from the block's own typed attributes via the element-MIRROR pattern (the CTA mirrors `sgs/button`'s control set through shared helpers; auto-propagation: a new `sgs/button` capability is a gap candidate on the mirror), with ZERO InnerBlocks in typed mode. CTA model (approved): max 2 text buttons (1 primary + 1 secondary), behaviours add-to-basket / buy-now / learn-more, express-pay as a phase-2 gateway-rendered toggle.
- **Preset binding** via `inheritStyle: 'primary' | 'secondary' | 'outline' | 'custom'` reads from `wp_options.sgs_button_presets`, mirrored to `theme.json` `settings.custom.buttonPresets`. Three editing paths (Settings page, Site Editor block-style-variations, theme.json) write the same backing store.
- **Existing CTA-rendering blocks** (sgs/hero etc.) use InnerBlocks composition. No deprecation path (pre-production policy). See spec 11 §5.
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
> **Every new/edited block is gated by Spec 32** (no inline `style=`; skip-serialisation + scoped CLASS-level `.{uid}.{block-class}` CSS; box-object attrs via BoxControl). The per-block definition-of-done is `.claude/plans/archive/block-migration-DONE-checklist.md` (11 end conditions). **No `deprecated.js`, no version bumps pre-production.**
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
(No block carries a `deprecated.js`.)

---

## Block Details

### 1. Container (`sgs/container`)

**Replaces:** Spectra Container block

**Purpose:** Flexible layout wrapper — the fundamental building block for all page sections.

**Attributes:**
- `layout` — flex | grid | stack (default: stack)
- `columns` — 1-6 (for grid layout)
- `columnsMobile` — 1-3 (grid columns on mobile)
- `columnsTablet` — 1-4 (grid columns on tablet)
- `gap` — raw CSS length string (e.g. `"16px"`, `"1.5rem"`); rendered via `sgs_container_gap_value()`. Composite/wrapper blocks (trust-bar, card-grid, feature-grid, gallery, multi-button, post-grid) carry no gap control of their own — all use this shared one via `ContainerWrapperControls`; there is no `blockGap` native support.
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
- `contentWidth` — **tier OBJECT** `{desktop,tablet,mobile}` (Spec 35 pass 2), **default `{"desktop":"normal"}`**. When it resolves to a cap, the shared wrapper emits an inner `<div class="sgs-container__inner">` with `max-width: {contentWidth}; margin-inline: auto` — allowing the outer box to remain full-bleed (background, padding) while capping the readable content width. `full` resolves to no cap, renders no band and emits no centring at that tier: an auto inline margin with no width would shrink the container to its content wherever it is itself a grid or flex item (`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php::render`, per-tier centring). ⛔ **The band gate is NOT `layout === '' || layout === 'stack'`.** It is `$has_band_props` (in `class-sgs-container-wrapper.php`) — ANY band-level CSS, i.e. a resolved `contentWidth` **or** any `contentBandPadding` side — regardless of layout. A grid/flex layout does not suppress the band: `$grid_on_inner` deliberately moves the GRID **onto** `__inner` when a band exists, so the `.sgs-cols-*` classes, which address the wrapper, cannot drive that grid. Nothing in this block's own `render.php` emits layer markup — it delegates entirely to `SGS_Container_Wrapper::render()`. "Content width" inspector control exposed in edit.js. **The EDITOR renders the band too** — `edit.js` emits `.sgs-container__inner` (styled in `editor.css`), so band controls move the canvas without publishing. **Cloning routing:** `__inner` is a fake wrapper — when cloning a draft, the converter FOLDS it structurally (slug-None direct descendant, Spec 31 §13 FR-31-4.1) and maps its `max-width`+`margin:auto` to this `contentWidth` attr **by CSS signature, never by the `__inner` class name** (name-based inner/content aliases cause wrong collapse). `canonical_slot` is content-routing metadata (child-block-vs-scalar fork, gated by `role`; Spec 31 §13 FR-31-2.1) and is **inert for structural-CSS layout routing** — the layer is detected name-free via `{layer-prefix}+property_suffixes` (Spec 31 §13 FR-31-21).

**Supports:** align (wide, full), anchor, className, colour (background, text), spacing (margin, padding)

**Inner blocks:** Yes — accepts any blocks as children.

**containerKind:** `block_composition.container_kind` column introduces a 3-KIND model for all container-bearing blocks:

| Kind | Meaning | Editor controls exposed |
|---|---|---|
| `section` | Full-bleed outer section wrapper — full surface: background (image/video/overlay/SVG/animation), shape dividers, width/contentWidth, gap (responsive), layout (grid/flex), min-height, grid-item defaults, shadow | All `ContainerWrapperControls` panels |
| `layout` | Inner layout wrapper — grid/flex arrangement + width/contentWidth + gap. No background/overlay/SVG/shape layers. | Layout + Width panels only |
| `content` | Content-level composite — width/contentWidth + inner padding/spacing only. No grid/bg layers. | Width + Spacing panels only |

`containerKind` is declared in each composite block's `block.json` as `supports.sgs.containerKind`. It gates which `ContainerWrapperControls` panels render in the editor and which layers the shared `SGS_Container_Wrapper::render()` PHP helper emits at runtime. `sgs/modal` and `sgs/nav-drawer` carry `supports.sgs.containerMirror: false` and are excluded from the roster entirely (their outer shell is a Popover/dialog, not a container). **`sgs/site-header` and `sgs/site-footer` ARE on this roster as `containerKind: section`; `sgs/nav-bar-menu` as `containerKind: layout`** — see "Header / Footer / Navigation System" section below.

**Composite-mirror rule (R-31-9):** Every composite block in the DB container-mirror roster (query: `SELECT block_slug FROM block_composition WHERE container_kind IS NOT NULL`) mirrors `sgs/container`'s wrapper capabilities via the shared helper `includes/class-sgs-container-wrapper.php`. No per-block reimplementation — the helper handles all rendering. When `sgs/container` gains a new capability, `/sgs-update` Stage 11 propagates it to all roster blocks. Canonical procedure: Spec 31 §13 FR-31-21 + `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md`.

**Render:** **Dynamic** — `render: file:./render.php`. Server-side rendering needed for layout/columns/gap responsive logic and `useInnerBlocksProps` integration. `save.js` returns `<InnerBlocks.Content />`.

---

### 2. Hero (`sgs/hero`)

**Purpose:** Page hero section with headline, sub-headline, CTAs, and background image/video/SVG.

**Tier:** `class-section` (recognised at voter confidence 1.0 by `sgs-hero` BEM-block; declared via `supports.sgs.is_section_root: true` in `block.json`; populated into `blocks.tier` column by `/sgs-update`). See [`00-naming-conventions.md` §3.2](00-naming-conventions.md).

⛔ **PLANNED CHANGES — approved, NOT BUILT.** Do not build against the
attribute names below without reading this box first.

**1. The split media slot is TYPE-AGNOSTIC, and the `image*` styling prefix is a misnomer.**
`splitMediaType` (`enum: image|video|svg`) selects among three PARALLEL SOURCES — `splitImage`,
`splitVideo`, `splitSvg` (the first two both `type:object`). The 19 bare `image*` attributes do not
style an image; they style **whichever type is active**.

- **RENAME → `splitMedia*`:** the 19 bare `image*` attrs (`imageHeight`, `imageWidth*`,
  `imagePadding*`, `imageBorderRadius*`, `imageBorderStyle/Width/Colour*`, `imageObjectFit`,
  `imageObjectPosition*`), plus `splitImageMobileObjectPosition` → `splitMediaObjectPositionMobile`
  (a styling attr wearing a source prefix). This also clears the non-standard Tablet/Mobile
  object-position naming in `block.json`.
- ⛔ **DO NOT RENAME** `splitImage` / `splitVideo` / `splitSvg` (parallel sources) or
  `splitMediaType` (the discriminator). Renaming `splitImage` → `splitMedia` would sit it beside
  `splitMediaType` while `splitVideo`/`splitSvg` remain — the name would claim more than it holds.
- Migration risk: expected NONE (no hero `image*`/`media*` attrs appear in stored canary content).
  Re-measure before applying; do not inherit the figure.

**2. TWO elements, and they must not be merged.**
`.sgs-hero__media` is the SLOT (its `render.php` comment: *"outer padding + background on the
wrapper"*), carrying `mediaBackground*`, `mediaPadding*`, `mediaOverlay*`, `mediaParallax`,
`mediaKenBurns` — already correctly named. `.sgs-hero__split-image` is the MEDIA INSIDE IT.
**`mediaPadding` insets the slot; `imagePadding` insets the media.** Two real boxes.

**3. ⛔ FOUR DB ROWS DISAGREE WITH THE RENDER — a cloning-fidelity bug.**
`imageBorderColour`, `imageBorderStyle`, `imageBorderWidth` (check `imageObjectFit` too) carry
`css_element: media` in `block_attributes`, while the hero `render.php` emits them onto
`.sgs-hero__split-image`. The converter's Front-1 declarative routing uses `css_element` to choose
which node a draft's declaration lands on, so a cloned `border-color` is routed to the wrapper
instead of the media: **the value transfers, the appearance does not.** Nothing looks broken
locally — it only shows in clones. The RENDER is correct; the DATA ABOUT it is wrong.

**4. `splitImageBleed` is to be DELETED, not renamed.** Bean: *"a vestigial control in the
container panel that breaks the sizing of the media when switched on... made redundant by object fit
and image padding, which defaults to 0."*

**5. Box sizing — a `sizingMode` picker is proposed (Auto | Fixed height | Aspect ratio).**
`hero.imageHeight` (a TIER OBJECT) and `image-sequence.aspectRatio` solve the same job two ways and
**compete**: CSS applies `aspect-ratio` only when an axis is `auto`, so a definite height silently
wins. The controls are a CHAIN — box shape → `object-fit` → `object-position` — where each only
matters if the previous one made it relevant. ⚠ `imageHeight` is already inside the set
`orchestrator/check_flat_tier_regression.py` blocks from cloning until Spec 31's
tier-migration upgrade lands.

**Rich-text content (XS-9.1):** Inner content rich-text uses `sgs/heading` with `wp_kses_post()` sanitisation — supports inline emphasis/strong/anchor while blocking script/style tags.

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

**Attributes** (`block.json` is authoritative):
- `mediaType` — icon | emoji | image (default: icon)
- `icon` — SVG slug from icon library (default: `star-filled`)
- `mediaEmoji` — string (when `mediaType=emoji`)
- `boxMedia` — media object (when `mediaType=image`)
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

> NOTE: `sgs/info-box` has NO icon-colour mechanism — no `iconColour`/`iconBackgroundColour`/`iconSize`/`link`
> attribute. `supports.__experimentalBorder` is not declared, and `supports.color`'s sub-flags
> (background/text/link/gradients) are all `false` with `__experimentalSkipSerialization: true`, so
> neither drives the icon's colour. `render.php`/`style.css` wire no attr, CSS variable or native
> support to it: the icon inherits whatever default paint applies, with no client-facing control.
> This is a KNOWN GAP, not a routed-elsewhere control.

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

### 5. Trust Bar (`sgs/trust-bar`)

**Status: ACTIVE.** The badge/trust-signal strip. `sgs/trust-bar` is **typed-only** — it has NO `sourceMode` attribute (check: `git grep -c sourceMode -- plugins/sgs-blocks/src/blocks/trust-bar/block.json` finds nothing). It carries the certification-badge use-cases (`badgeStyle` variants: icon-circle / text-only / image-badge + auto-scroll marquee); counter use-cases belong to `sgs/counter`. The converter emits typed `items[]` via the icon-identity resolver (`converter/services/icon_resolver.py`), resolving to correct icon slugs (home/check/truck/star). The live WC configurator modes (`wc-product`/`sgs-cpt`) belong to `sgs/product-card`, not this block.

The icon circle has an overridable default border; a title placeholder never leaks (trim guard); `iconCircleSize` governs badge size for icon-circle mode. Typography uses the shared `TypographyControls` component. `src/blocks/trust-bar/` is the active directory. See Spec 27 §FR-24-10.

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
- `gap` — raw CSS length string (shared ContainerWrapperControls control)
- `aspectRatio` — auto | 1:1 | 4:3 | 16:9 | 3:2 | 16:10 (default: 16:10 for card, 4:3 for overlay)
- `hoverEffect` — none | zoom | lift | overlay-slide (default: zoom + lift for card variant)
- `overlayStyle` — none | gradient | solid (only used in overlay variant)

**Render:** Static `save()`.

**Responsive:** Columns reduce per breakpoint settings. Cards stack to full-width on mobile.

**Indus Foods usage:** The Products section uses `card` variant with 4 columns, 16:10 aspect ratio, `success` badge variant for price hints, and zoom + lift hover effect.

---

### 7. Testimonial (`sgs/testimonial`)

**Purpose:** Single testimonial card. **Typed-attr, 7-variant block.** All content rendered from typed attributes; no InnerBlocks in production.

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
- Per-element typography via shared `TypographyControls` component

**Render:** Dynamic `render.php` (`save.js` returns `null`).

**Converter routing:** `scalarContentLift` capability declared in `block.json` (`supports.sgs.scalarContentLift: true`). The universal scalar-content-lift path routes `quote`/`reviewerName`/`ratingStars` from draft BEM elements to these typed attrs via `derived_selector` DB rows — no bespoke handler. Live-verified on canary page 8 (quote/name/5★ render at 1440/768/~500px). `has_inner_blocks` is 0 for this block (TYPED leaf — the slider parent has `has_inner_blocks=1`; the leaf emits scalar attrs only).

---

### 8. Testimonial Slider (`sgs/testimonial-slider`)

**Purpose:** Carousel/slider of multiple testimonials.

**Inner blocks:** REQUIRED. Slides are `sgs/testimonial` InnerBlocks (FR-31-6). render.php iterates `$block->inner_blocks` and renders each child; render.php does NOT read the `testimonials` array attribute — this block is **InnerBlocks-ONLY** in production.

**Attributes** (`block.json` is authoritative):
- `layout` — full | split (default: full; `split` shows a `sideImage` beside the carousel)
- `sideImage` — media object (split layout only)
- `cardStyle` — string (default: `card`)
- `autoplay` — boolean / `autoplaySpeed` — ms
- `showDots` / `showArrows` — boolean
- `slidesVisible` — number (default: 3)
- `columns`/`columnsMobile`/`columnsTablet` — grid columns
- `gridTemplateColumns`/`Tablet`/`Mobile`, `gridTemplateRows`/`Tablet`/`Mobile`, `gridAutoRows` — explicit grid templates. A template-less tier takes the wider tier's template unless that tier's `columns` count was authored (then the count's `repeat(N,1fr)` applies); the defaults 2/2/1 never replace an authored template. Direct grid/flex children get a zero-specificity `min-width:0;min-height:0` backstop, so a child's own minimum size wins.
- `gap`/`gapTablet`/`gapMobile`, `justifyItems`, `alignContent`, `templateMode` (free | grid-section | card-grid)
- `nameFontSize`, hover attrs (`hoverBackgroundColour`/`hoverTextColour`/`hoverBorderColour`/`hoverEffect`), `transitionDuration`/`transitionEasing`
- Width/flex attrs: `widthMode`/`Mobile`/`Tablet`/`Desktop`, `customWidth`/`customWidthUnit`, `contentWidth`, `maxWidth`, `flexDirection`, `flexWrap`, `justifyContent`
- Scroll sideways: `scrollSideways` (tier on/off) and `scrollItemWidth` (tier length, 80% unset). At an ON tier the direct children sit in one native row on `.{uid}>.sgs-container__inner` that scrolls sideways and snaps (`plugins/sgs-blocks/includes/container-scroll-row-css.php::sgs_container_scroll_row_css`, emitted last by the wrapper in the tier's exact range; ON forces the uid and the inner element). No GSAP, no pin; hidden under the `horizontal-panel` effect. Band side padding becomes scroll padding. The row gains 8px of block padding, taken back by an equal negative block margin, so an item's focus ring is not clipped by the row's `overflow-y:hidden`; band padding and margin on those sides are added to. The inline sides get no such room (it would override the row's `margin-inline:auto` centring), so at scroll position 0 the first item's ring is trimmed on its inline start; the other three sides stay visible, which meets WCAG 2.4.7, and Bean accepted this on 2026-09-25.
- `supports.sgs.containerKind: layout` — mirrors `sgs/container` wrapper capabilities via `SGS_Container_Wrapper`.

**Render:** Dynamic `render.php` (via `SGS_Container_Wrapper::render(..., 'layout', ...)`) + `viewScriptModule` for carousel logic.

**No external carousel library** — custom implementation using CSS scroll-snap + minimal JS for autoplay/navigation. < 3KB JS.

---

### 9. CTA Section (`sgs/cta-section`)

**Purpose:** Call-to-action section with headline, supporting text, and multiple button options.

**Tier:** `class-section` (sibling of `sgs/hero` in voter recognition; declared via `supports.sgs.is_section_root: true`; populated into `blocks.tier` by `/sgs-update`). Voter emits the literal slug at confidence 1.0 when `sgs-cta-section` is the section-root class.

**Attributes:**
- `headline` — RichText
- `body` — RichText
- `buttons` — array of { text, url, style, icon } objects
- `backgroundColour` — token slug
- `backgroundImage` — media object
- `stats` — array of { text } for inline social proof
- `layout` — centred | left-aligned | split

**Render:** **Dynamic** — `render: file:./render.php`. `save.js` returns the InnerBlocks marker / `null`.

---

### 10. Process Steps (`sgs/process-steps`)

**Purpose:** Horizontal timeline showing a multi-step process.

**Attributes:**
- `steps` — array of { number, title, description, icon } objects
- `connectorStyle` — line | arrow | dots (default: line)
- `numberStyle` — circle | square | none (default: circle) — *(attr is `numberStyle`, not `numberedStyle`)*
- `numberColour` / `numberBackground` / `titleColour` / `descriptionColour` — token slugs

**Render:** **Dynamic** — `render: file:./render.php`.

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

### 16. Notice Banner (`sgs/notice-banner`)

**Purpose:** Inline informational banner for contextual messages like minimum order values, delivery terms, or promotional notices. **Also serves as the announcement bar via `displayMode=announcement`.**

**`displayMode` attribute:**
- `inline` — (default) embedded within page content at the drop point
- `announcement` — sticky top/bottom bar (full-width, `z-index: 1000`), dismissible via WP Interactivity API (`session`/`permanent` storage), pre-paint anti-flash script prevents FOUC

**Attributes:**
- `displayMode` — inline | announcement (default: inline)
- `icon` — string (emoji or SVG slug)
- `iconColour` — token slug
- `text` — RichText (supports inline bold, links)
- `variant` — info | success | warning | accent
  - `info` — light blue background
  - `success` — light green background, green border (used for MOV banners in Indus Foods)
  - `warning` — light amber background
  - `accent` — light gold background
  - Variant bg/border/colour are overridable via `:where()` (E9)
- `alignment` — left | centre (default: centre)
- `borderRadius` — preset slug (default: medium)
- `position` — top | bottom (announcement mode only, default: top)

**Render:** Dynamic `render.php` echoes `$content` (the `sgs/text` InnerBlocks child carrying the notice message). `save.js` returns `<InnerBlocks.Content />` — WordPress serialises the child block into `post_content`; render.php drives all frontend output.

**Indus Foods usage:** The MOV banner ("Minimum order just £75 — lower than most wholesalers...") uses `success` variant with truck icon and centred text.

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

**Purpose:** Lightbox/modal overlay, opened by its own trigger button or by any link to its anchor.

**Attributes:**
- `triggerText` — string (button label; also the dialog's accessible name when no `sgs_modal` post is referenced)
- `triggerStyle` — primary | secondary | text-link | none (no button: opened only by `#<anchor>` links or `data-sgs-modal-open`)
- `maxWidth` — small (480px) | medium (640px) | large (800px) | full
- `size` — default | fullscreen (the whole viewport; content starts below the close button)
- `modalRef` — an `sgs_modal` post whose content (and title, as the accessible name) the dialog shows
- `closeOnOverlay` — boolean (default: true)

**Inner blocks:** Yes — modal content accepts any blocks (used when no `modalRef` is set).

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

### 24. Decorative Image (`sgs/decorative-image`)

**Purpose:** Absolute-positioned decorative images (or short looping videos) that float across page sections, unconstrained by containers and not affecting layout flow. Used for organic, editorial-style design where images (food photography, decorative elements, brand illustrations) are scattered naturally over section backgrounds.

**Competitive edge over Elementor:** Elementor's "Motion Effects" allow floating elements but generate heavy JS and deeply nested DOM. CSS-native absolute positioning with percentage offsets is lighter, more predictable, and produces cleaner markup. Static positioning needs no JavaScript at all; parallax and fade-on-scroll are optional.

**Use case — Indus Foods homepage:** Food photography (samosas, spice bowls, rice bags, chilli peppers) scattered organically across the homepage. Each image floats over its parent section's background colour without affecting the layout of headings, text, or other blocks. Desktop shows 4-6 images at varied positions and rotations. Mobile shows fewer, smaller images, or hides them entirely.

**Parent block:** Works inside any block that establishes a containing block. `plugins/sgs-blocks/src/blocks/decorative-image/style.css::.wp-block-sgs-container` and `plugins/sgs-blocks/src/blocks/decorative-image/style.css::.wp-block-group` both set `position: relative`, so `sgs/container` and `core/group` need no extra setup. The image positions itself against that ancestor using percentage offsets.

**Block registration:** dynamic. `block.json` declares `render` (`render.php`), `viewScriptModule` (`view.js`), `supports.anchor: true` and `supports.html: false`; `index.js` registers `edit` only, so nothing is serialised into post content except the block comment and its attributes.

**Attributes** (source of truth: `plugins/sgs-blocks/src/blocks/decorative-image/block.json::attributes`):

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `decorMedia` | object | `null` | The unified image-or-video slot: `{ url, type: 'image' \| 'video', id, alt, mime }`. |
| `imageId` / `imageUrl` | number / string | unset | Image slot mirrored from `decorMedia` when it holds an image. When `imageUrl` is empty and `decorMedia` holds an image, `render.php` reads the image from `decorMedia`. |
| `imageIdTablet` / `imageUrlTablet` | number / string | unset | Art-direction image for tablet widths (image only). |
| `imageIdMobile` / `imageUrlMobile` | number / string | unset | Art-direction image for mobile widths (image only). |
| `imageAlt` | string | `""` | Alt text; only rendered when `imageDecorative` is `false`. |
| `imageDecorative` | boolean | `true` | Decorative (hidden from assistive technology) or informative (uses `imageAlt`). |
| `positionX` | tier object | `{ "desktop": 50 }` | Percentage from the left edge of the containing block; editor range 0-100. |
| `positionY` | tier object | `{ "desktop": 50 }` | Percentage from the top edge; editor range 0-100. |
| `width` | tier object | `{ "desktop": 200 }` | Width in px; editor range 50-800. |
| `maxWidthPercent` | number | `20` | Maximum width as a percentage of the containing block; editor range 0-50. |
| `rotation` | tier object | `{ "desktop": 0 }` | Degrees; editor range -180 to 180. |
| `opacity` | number | `85` | 0-100. |
| `zIndex` | number | `1` | Editor range -1 to 10. |
| `flipX` | boolean | `false` | Horizontal mirror. |
| `parallaxStrength` | number | `0` | 0 disables parallax; editor range 0-100. |
| `fadeOnScroll` | boolean | `false` | Fades the image out as it scrolls past the top of the viewport. |
| `overflow` | string | `"visible"` | Editor offers `visible` and `hidden`; `render.php` accepts `visible`, `hidden`, `clip`, `scroll`, `auto` and falls back to `visible`. |
| `hideOnTablet` / `hideOnMobile` | boolean | `false` | Hide at the tablet (max 1023px) / mobile (max 767px) device tier. |
| `pathDrawOnScroll` | boolean | `false` | Animate SVG strokes when the image scrolls into view. |
| `pathDrawDurationMs` | number | `1500` | Path-draw duration; editor range 300-4000. |
| `pathDrawTriggerOffset` | number | `20` | Percentage of the image that must be visible before drawing starts; editor range 0-80. |
| `pathDrawEasing` | string | `"ease-out"` | `ease-out`, `ease-in-out` or `linear`. |

A tier object is `{ desktop, tablet, mobile }`; `plugins/sgs-blocks/includes/helpers-responsive.php::sgs_responsive_normalise_object` also accepts a plain number as the desktop value. The shared media-atom attributes for `object-fit`, `focal-point` and `overlay` (unprefixed, e.g. `objectFit`, `objectPosition`, `overlayColour`, `overlayGradient`, `overlayOpacity`, `overlayBlendMode`) are declared through `plugins/sgs-blocks/src/blocks/decorative-image/block.json::supports.sgs.mediaElements` and injected at registration from `plugins/sgs-blocks/includes/media-element-attributes.generated.php`. The universal `fx` attributes attach through `plugins/sgs-blocks/src/blocks/decorative-image/block.json::supports.sgs.fx.motionSurface`.

**Render (`render.php`):**

- Renders nothing when neither `decorMedia.url` nor `imageUrl` is set.
- Scope token: `uid = 'sgs-di-' + first 8 hex characters of md5(JSON of the attributes)`. Because the block supports `anchor`, the token is always a CLASS, never an id.
- The block prints one scoped `<style>` element immediately before its markup; the markup carries no inline `style` attribute. The base rule uses the DESKTOP tier of `positionX`, `positionY`, `width` and `rotation`:

```css
.{uid}.sgs-decorative-image {
    position: absolute;
    left: {positionX.desktop}%;
    top: {positionY.desktop}%;
    width: {width.desktop}px;
    max-width: {maxWidthPercent}%;
    opacity: var(--sgs-di-op, {opacity / 100});
    z-index: {zIndex};
    transform: translate(-50%, -50%) [rotate({rotation.desktop}deg)] [scaleX(-1)] translateY(var(--sgs-di-py, 0px));
    overflow: {overflow};
}
```

  `rotate()` is emitted only when the rotation is non-zero and `scaleX(-1)` only when `flipX` is on. `--sgs-di-py` and `--sgs-di-op` are the two custom properties `view.js` writes at runtime, so the scoped rule is the only place `transform` and `opacity` are declared. Every numeric value is cast before it reaches the CSS, and the whole blob passes through `wp_strip_all_tags`.
- The object-fit, focal-point and overlay atom rules from `SGS_Media_Element::style` are appended to the same `<style>` element, scoped to `.{uid}`.

**Output markup, image (default):**
```html
<style>.sgs-di-3fa91c20.sgs-decorative-image{position:absolute;left:50%;top:50%;width:200px;max-width:20%;opacity:var(--sgs-di-op, 0.85);z-index:1;transform:translate(-50%, -50%) translateY(var(--sgs-di-py, 0px));overflow:visible;}</style>
<img
    class="sgs-decorative-image sgs-media-el sgs-di-3fa91c20"
    src="{url}"
    alt=""
    aria-hidden="true"
    role="presentation"
    loading="lazy"
    decoding="async"
    data-parallax="{parallaxStrength}"
/>
```

The `<img>` is the block root (no wrapper element). It is produced by `plugins/sgs-blocks/includes/helpers-media.php::sgs_responsive_image` at size `large`, so an image with an attachment id also carries `srcset`, `sizes`, `width` and `height`. Optional data attributes, each present only when its setting is on or its value is set:

- `data-parallax="{parallaxStrength}"` when `parallaxStrength > 0`; `data-fade-on-scroll="true"` when `fadeOnScroll` is on.
- `data-sgs-path-draw="true"` with `data-sgs-path-draw-duration`, `data-sgs-path-draw-offset` and `data-sgs-path-draw-easing` when `pathDrawOnScroll` is on. `plugins/sgs-blocks/assets/js/animation-observer.js` reads these and `plugins/sgs-blocks/assets/css/extensions.css` styles the stroke.
- `data-hide-tablet="true"` / `data-hide-mobile="true"` when the matching toggle is on.
- `data-position-x-tablet`, `data-position-y-tablet`, `data-width-tablet`, `data-rotation-tablet` and the four `-mobile` equivalents when the tier value is set. No stylesheet or script reads these eight attributes, so tablet and mobile values of `positionX`, `positionY`, `width` and `rotation` have no visual effect.
- With `imageDecorative` off, `alt` carries `imageAlt` and `aria-hidden` / `role` are omitted.

**Art-direction tiers (image only):** when `imageUrlTablet`/`imageIdTablet` or `imageUrlMobile`/`imageIdMobile` is set, the block prints sibling `<img>` elements after the base one. Each carries the same `uid`, base classes and data attributes, plus a tier class: the base image gets `sgs-decorative-image--desktop` and the siblings get `sgs-decorative-image--tablet` / `sgs-decorative-image--mobile`. Compound selectors in the scoped `<style>` element (never descendant selectors, because there is no ancestor) toggle them with `display: none`:

- Mobile tier set: desktop hidden at max 767px; mobile hidden at min 768px.
- Tablet tier set: desktop hidden from 768px to 1023px; tablet hidden at max 767px and at min 1024px.

A tier left empty falls back to the desktop image at that width.

**Wrapper mode (image):** when `fx` is `surface-treatment`, or when the overlay atom emits box-scope CSS for the current values, the block renders a `<span>` root instead of a naked `<img>`:
```html
<style>…</style>
<span class="sgs-decorative-image [sgs-decorative-image--treated] [sgs-media-box] sgs-di-3fa91c20"
      aria-hidden="true" role="presentation" data-…>
    <img class="sgs-decorative-image__media sgs-media-el" src="{url}" alt="" loading="lazy" decoding="async" />
</span>
```
The span takes over the root role (uid, decorative `aria-hidden`/`role`, every `data-*` attribute); the inner `<img>` fills the span, and tier images use `sgs-decorative-image__media--{desktop,tablet,mobile}` with descendant selectors. `--treated` adds `.{uid}.sgs-decorative-image--treated>.sgs-decorative-image__media{display:block;width:100%;height:auto}`. With `imageDecorative` off, the span omits `aria-hidden` and `role`. A surface treatment combined with art-direction tiers samples the desktop image at every width, because the treatment module reads the first `<img>` in the wrapper.

**Output markup, video:** when `decorMedia.type` is `video`, `plugins/sgs-blocks/includes/helpers-media.php::sgs_render_media` supplies the `<video>` and the block wraps it in a positioned span, again after the scoped `<style>`:
```html
<span class="sgs-decorative-image sgs-decorative-image--video [sgs-media-box] sgs-di-3fa91c20"
      aria-hidden="true" role="presentation" data-…>
    <video class="sgs-media sgs-media--video sgs-media--sgs-decorative-image" autoplay loop muted playsinline aria-label="…"><source src="{url}" type="video/mp4"></video>
</span>
```
The wrapper is always `aria-hidden`. The video branch has no art-direction tiers, and the object-fit and focal-point atoms do not reach the `<video>`; the overlay atom does.

**CSS (`style.css`):**
```css
.sgs-decorative-image {
    position: absolute;
    pointer-events: none;
    user-select: none;
    will-change: transform;
    transition: none;
}

.wp-block-sgs-container,
.wp-block-group {
    position: relative;
}

@media (max-width: 1023px) {
    .sgs-decorative-image[data-hide-tablet="true"] { display: none; }
}

@media (max-width: 767px) {
    .sgs-decorative-image[data-hide-mobile="true"] { display: none; }
}

@media (prefers-reduced-motion: reduce) {
    .sgs-decorative-image { will-change: auto; }
}
```

**Scroll effects (`view.js`, `viewScriptModule`):**
- WordPress loads the module on pages that contain the block; it returns immediately when no `.sgs-decorative-image` carries `data-parallax` or `data-fade-on-scroll`, and does nothing at all under `prefers-reduced-motion: reduce`.
- An `IntersectionObserver` (root margin `20% 0px`) tracks which matching elements are near the viewport; a `requestAnimationFrame`-throttled passive scroll listener updates only those.
- Scroll progress is `(viewportHeight - rect.top) / (viewportHeight + rect.height)`.
- Parallax writes `--sgs-di-py` as `(progress - 0.5) * parallaxStrength * 2` px.
- Fade writes `--sgs-di-op` as `clamp((1 - progress) / 0.3, 0, 1)`: fully opaque until progress reaches 0.7, then fading to 0 as the image leaves through the top of the viewport. While the effect is running it replaces the configured `opacity` value.
- The script only ever sets those two custom properties, never a CSS property, so the element carries zero inline declarations at any point in its lifecycle.

**Editor experience:**
- Settings tab: **Accessibility** (image media only: the "Decorative image" toggle plus an alt-text field when it is off) and **Art direction** (image media only: a device switcher; desktop shows a hint, tablet and mobile each show a media picker, and an empty tier reuses the desktop image).
- Styles tab: the media-atom panel (`DecorativeImagePanelLayout`: object-fit, focal point, overlay) when media is selected, then **Size** (width, max width), **Transform** (flip, opacity, z-index), **Effects** (parallax strength, fade on scroll, overflow), **SVG Path Draw** (toggle, plus duration, trigger offset and easing when on) and **Responsive Overrides** (hide on tablet / mobile, and per-tier position X, position Y, width and rotation through `ResponsiveOverride`).
- Placeholder: a media picker for an image or video; once media is chosen, a preview canvas (minimum height 400px) shows it at its desktop-tier position, and a "Replace Media" picker sits beneath.
- The editor canvas positions its preview with editor-only inline styles from `edit.js`; they are never saved to post content or rendered on the frontend.

**Accessibility:**
- Decorative by default: `alt=""`, `aria-hidden="true"` and `role="presentation"` on the `<img>` (or on the wrapper span). An operator can switch `imageDecorative` off and supply alt text instead.
- Video is always `aria-hidden` and `role="presentation"`.
- `pointer-events: none` and no tab stop: the element cannot be clicked or focused.
- Parallax and fade-on-scroll are disabled under `prefers-reduced-motion: reduce`.

**Performance:**
- No JavaScript is needed for static positioning; `view.js` only acts when parallax or fade-on-scroll is set.
- `loading="lazy"` and `decoding="async"` on every image.
- `will-change: transform` applies to every `.sgs-decorative-image` (`plugins/sgs-blocks/src/blocks/decorative-image/style.css::.sgs-decorative-image`), and drops to `auto` under `prefers-reduced-motion: reduce`.
- Images should be optimised WebP/AVIF, 150-300px wide, to keep file sizes small.

---

### 25. Trustpilot Reviews (`sgs/trustpilot-reviews`)

**Replaces:** Trustpilot's own WordPress plugin (free tier blocks all display widgets), Better Business Reviews, Trustindex, ReviewsOnMyWebsite.

**Purpose:** Display Trustpilot reviews + TrustScore on the WP site. Self-hosted data (no third-party widget injection, no `<iframe>`, no off-site script). Schema.org JSON-LD output for SEO rich snippets. Brand identity locked (green stars, Verified badge, clickable Trustpilot logo) while typography inherits the host theme via `var(--wp--preset--font-family--body)` and `color: inherit`. Border + scale hover effects use `var(--wp--preset--color--primary)` so each site's primary token tints the interaction.

**Competitive edge:** Trustpilot's free plan paywalls every display widget via their plugin — you only get the Review Collector. Scraper plugins introduce maintenance dependencies + TOS grey area + documented "almost ban" incidents. First-party SGS block + dedicated sync infrastructure (block #26 + Backend Integration below) keeps brand identity locked while letting the cards live in the host site visually.

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

**Backend Integration — SGS Trustpilot Sync:**
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
- Auth: `?token=<key>` query string — `Authorization: Bearer` returns HTTP 500 on this endpoint
- Request: POST `{ url: <trustpilot-url>, waitForTimeout: 3000 }`
- Returns rendered HTML (~845KB for a low-traffic page)
- Free tier: 6 hours/month, ample for one weekly scrape per site
- Direct `wp_remote_get` fallback exists but Trustpilot returns HTTP 403 on server-side fetches without a real browser

**JSON-LD parsing:**
- Trustpilot embeds review data in `<script type="application/ld+json">` blocks with an `@graph` array of mixed entity types
- `LocalBusiness.review[]` holds `{ "@id": "..." }` pointers, NOT inline review entities
- Standalone `Review` entities live as siblings in `@graph`
- Parser harvests standalone `Review` entities directly

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

Blocks recognised by the converter walker at confidence 1.0 from their literal `sgs-<block>` class on a section boundary. Identified by `supports.sgs.is_section_root: true` in `block.json`; populated into `blocks.tier='class-section'` by `/sgs-update`; consumed by the voter (`plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py::vote_block_slug`).

| Block | Notes |
|---|---|
| `sgs/hero` | Page hero (variants: standard / split / video / svg-animated). XS-9.1 rich-text via `sgs/heading` + `wp_kses_post`. |
| `sgs/cta-section` | Call-to-action section (centred / left-aligned / split layouts). |
| `sgs/trust-bar` | Trust/badge section strip — curated icon-badge items or certification logos. |

**Criteria for adding a new section-root block:**
1. The block represents an entire page section, not an element-within-a-section
2. Mockups consistently mark its boundary with a single literal `sgs-<block>` class (no ambiguity vs neighbouring sections)
3. The block has its own pattern PHP template (so Stage 2 confidence-matrix can resolve it)

To add: set `supports.sgs.is_section_root: true` in `block.json`, run `/sgs-update`, then run `/sgs-clone` on a representative mockup and verify `voter.json` emits the literal slug at confidence 1.0 with reason `class-section-block-equivalent`. Any non-section-root `sgs-` prefixed class encountered by the voter emits `gap-candidate-class-section` instead — surfacing the gap for review rather than mis-routing.

Cross-references: the voter's tier-driven recognition; the `block_composition` table (sibling routing data); the `block_composition.container_kind` 3-KIND model + composite-mirror rule (Spec 31 §13 FR-31-21 + `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md`).

**Not on this roster:** `sgs/site-header` / `sgs/site-footer` are section-KIND composites but are NOT recognised via the mockup-body literal-class voter above — they live inside the `header`/`footer` template parts, not the page-content body a mockup clones. The cloning pipeline maps a draft's header/footer rows onto these blocks' named slots by BEM role (Spec 31 R-31-2/R-31-8) as a separate mechanism (NOT BUILT). Do not add them to the table above.

---

## Header / Footer / Navigation System

**Owning spec for the FULL requirement set (FRs, per-breakpoint override data model, never-overflow Cluster+clamp layout, sticky/transparent-scroll behaviour): [`37-HEADER-FOOTER-BUILDER.md`](37-HEADER-FOOTER-BUILDER.md); global-defaults/Site-Info binding and the drawer a11y contract are owned by **Spec 36**.** This section is the block-roster summary only — do not duplicate Spec 37's (or Spec 36's) FRs here.

### `sgs/business-info` `displayType="attribution"` — the Website Credit element

**Plain English:** the "Website by Small Giants Studio" link in the footer's bottom strip, as a proper element an operator can move around that row — but cannot retarget, reword or delete.

**The rule it demonstrates.** This is the ONE `displayType` that does **not** read `Sgs_Site_Info`, deliberately. Every other type renders **client** data; this renders the **framework's own constant**. That is the binding distinction: *a hardcoded CLIENT value in a framework file is a bug; the component's OWN constant stays.* Routing the agency backlink through Site Info would be wrong twice — it would put agency data in a client-owned store, and it would let a client blank the backlink.

**Constants** (`sgs-blocks.php`, `defined() ||` guarded so a white-label/reseller build overrides them before plugin load without patching a block):
- `SGS_ATTRIBUTION_URL` = `https://smallgiantsstudio.co.uk/`
- `SGS_ATTRIBUTION_TEXT` = `Website by Small Giants Studio`

> Do not copy the LinkedIn URL from the Astra baseline sites (`lightsalmon-tarsier-683012.hostingersite.com`, `muslimsinconstruction.uk`); the credit link points at the website.

**Markup + classifier (BINDING — the pipeline matches on this):**
```html
<p class="sgs-business-info sgs-business-attribution">
  <a href="{SGS_ATTRIBUTION_URL}" class="sgs-business-info__link" rel="noopener">{SGS_ATTRIBUTION_TEXT}</a>
</p>
```
`.sgs-business-attribution` is the recognised classifier. It must stay in lockstep with the draft-side classifier `.sgs-footer__credit` (Spec 33 §Website-credit recognition) — change one, change both.

**Attribute surface — TYPOGRAPHY ONLY (deliberately narrow, Bean-locked).** No content attr, no URL attr, no layout attrs. An operator may restyle it; they may not re-point it:
- `textColour` (default: **resolved**, see below) · `linkHoverColour` (default `#d4a73c`)
- font family / size / weight / style / line-height via the shared `TypographyControls` component + `sgs_typography_css_rule()` — **never** hand-rolled controls. Default = inherit, so it matches the site's base paragraph font/size out of the box.

**Default colour is COMPUTED, not assumed.** `textColour` unset ⇒ resolve the surrounding background to hex via `sgs_resolve_palette_hex()` and pick the readable foreground via `sgs_wcag_text_colour_for_bg()` (`includes/helpers-colour-wcag.php` — the same helpers `sgs/product-card` and `sgs/option-picker` already use; do NOT build a second resolver). Never assume a token NAME implies luminance — `primary-dark` is a **pink** on mamas-munches. Where the background cannot be resolved, fall back to `currentColor` (inherit), never to a literal.

**Hover — colour fade to `#d4a73c` plus a left-to-right underline that grows from zero width.** Bean's reference behaviour is muslimsinconstruction.uk. Implement the underline as a pseudo-element, NOT `text-decoration` — only a box can be animated from zero to full width:
```css
.sgs-business-attribution .sgs-business-info__link {
  position: relative; text-decoration: none; color: inherit;
  transition: color 300ms ease; }
.sgs-business-attribution .sgs-business-info__link::after {
  content: ""; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1px; background: #d4a73c;
  transition: width 300ms ease; }
:hover, :focus-visible { color: #d4a73c; }
:hover::after, :focus-visible::after { width: 100%; }
@media (prefers-reduced-motion: reduce) { transition: none; }  /* keep both end states */
```

The resting link carries an ordinary `color`, so no `@supports` fallback is needed: an
unsupported `::after` costs the underline, never the legibility of the credit itself.

Gate: the resting state must still meet 4.5:1 (WCAG 1.4.3) and `#d4a73c` must meet it against the footer background at hover — verify per client palette, not once. `:focus-visible` must receive the identical treatment; the effect may not be mouse-only (WCAG 2.1.1).

**Defaults are intentionally thin.** The cloning pipeline sets the real styling per client (Spec 33) — these defaults only need to be sane and accessible out of the box, not final.

### Specialised container blocks are permitted inside template parts

A monolithic header/footer block that subsumes the FSE/CPT/rules system is forbidden. Header and footer **remain WordPress template parts** (Spec 37: parts + patterns + `sgs_header`/`sgs_footer` CPT + rules engine; Site Info bindings: Spec 36). A **specialised container block used INSIDE the template part** is permitted — equivalent in kind to `sgs/card-grid`/`sgs/feature-grid`. Only `src/blocks/{site-header,site-footer,nav-bar-menu,nav-drawer-menu,nav-drawer}/` are permitted; any bare `header`/`footer`/`nav` block slug remains forbidden.

### The blocks

| Block | Status | KIND | Renders via | Category |
|---|---|---|---|---|
| `sgs/site-header` | BUILT + LIVE | section | `SGS_Container_Wrapper` | `sgs-layout` |
| `sgs/site-footer` | BUILT + LIVE | section | `SGS_Container_Wrapper` | `sgs-layout` |
| `sgs/nav-bar-menu` | BUILT + LIVE | layout | block-private root (not `SGS_Container_Wrapper`); own render.php + nav logic | `sgs-content` |
| `sgs/nav-drawer-menu` (`"ancestor":["sgs/nav-drawer"]`) | BUILT + LIVE | — | block-private root (not `SGS_Container_Wrapper`); own render.php + nav logic | `sgs-content` |
| `sgs/nav-drawer` | BUILT + LIVE; see Spec 36 for the drawer contract | — (Popover/dialog, `containerMirror: false` — excluded from the container-mirror roster, same as `sgs/modal`) | own render.php | `sgs-interactive` |

- **`sgs/site-header`** — header shell: 3 optional named rows (top utility strip / middle primary row with logo+nav+CTA / bottom message row), each independently configurable; an empty row emits zero output (no wrapper, no padding-bleed). Typed element palette (logo, nav, search, cart, account, button/CTA, contact, social, HTML, widget-area) — not freeform.
- **`sgs/site-footer`** — footer shell: named rows (top CTA/newsletter, middle columns row splitting to up to N columns collapsing to 1 below mobile tier, bottom trademark/terms bar). Same typed element palette as the header.
- **`sgs/nav-bar-menu`** (Spec 36 is canonical) — ONE menu source renders a desktop nav bar and collapses to a burger at a breakpoint set across 4 tiers (Desktop/Tablet/Mobile/custom-px). Default = one-tree-restyled; escape hatch = independent mobile tree via the `sgs/nav-drawer`. Mega-panel drill-down + auto back-link on mobile with AJAX lazy-load for heavy content. Desktop overflow auto-collapses into a "more" menu.
- **`sgs/nav-drawer` / `sgs/nav-drawer-menu`** — the off-canvas drawer and its link list. The drawer must never be frozen by its own background `inert`: it must not be a DOM descendant of the element it inerts (`.wp-site-blocks`), so its links stay clickable (verify with `elementFromPoint` returning the link, not `BODY`). The full GOV.UK-grade a11y contract (focus trap, ESC-close, backdrop-dismiss, body-scroll-lock, redundant state signalling, configurable SR labels, published keyboard contract, 44px targets) is specified in Spec 36.

### Customisation-standard extensions that apply to these blocks

These blocks follow the Block Customisation Standard (below) plus:

- **Composite-mirror (R-31-9):** `sgs/site-header` and `sgs/site-footer` delegate ALL outer rendering to `SGS_Container_Wrapper::render()` — no per-block reimplementation of grid/section/background machinery, same rule as `sgs/hero`/`sgs/card-grid`. See "Composite-mirror rule" under `sgs/container` above.
- **No-inline scoped styling (Spec 32):** same no-inline-`style=""` contract as every other SGS block — values land in a scoped `<style id="{uid}-style">` block, not inline declarations.
- **Per-breakpoint override model — NEW-BLOCKS-ONLY:** the header/footer/nav blocks (and no existing block — avoids Gutenberg invalid-content errors, honours the no-deprecations rule) get a `{desktop, tablet, mobile}` (`null` = inherit from the tier above) per-property override data model, PLUS a separately-configurable custom-px 4th breakpoint tier (used by the `sgs/nav-bar-menu` collapse setting) — the custom-px tier is NOT a 4th key merged into every per-property value object. Full data model, cascade rules, and editor UX are owned by Spec 37 (FR-37-16) — not duplicated here.
- **Global defaults + Site Info access:** every element/setting in `sgs/site-header`, `sgs/site-footer`, and `sgs/nav-bar-menu` defaults from (1) the site's `theme.json`/`wp_global_styles` tokens (or, for cloned sites, the Spec 33 `theme-snapshot.json`) and (2) the shared SGS Site Info store (Spec 36 — logo/phone/email/address/hours/socials/copyright via `sgs/site-info` block-bindings). A value set once in Site Info renders identically in header AND footer with no re-entry — never a hardcoded per-block literal (R-31-1). Owning FRs: Spec 37 (FR-37-17, §3.7); Site Info store: Spec 36.
- **Never-overflow layout:** the header Cluster row is locked `flex-wrap: nowrap` and never wraps or stacks; `min-width:0` on children lets flexbox shrink them proportionally, each stopping at its own floor (44px controls, logo `min-width: min(100%, var(--sgs-header-logo-min, 7.5rem))`, capped by its authored `--logo-width`) — guarantees no overflow down to 320px by construction. ⚠ the logo carries no `flex-shrink:0` (it overflows 320px once wrapping is gone). Fluid `clamp()` spacing: the gap default is `clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)`, live-verified varying 16px→8.8px. Both CSS-length paths share one validator, `sgs_css_length_value()` (`includes/helpers-css-safety.php`), which accepts `var|calc|min|max|minmax|clamp|repeat` via WP core's recursive balanced-paren grammar and fails CLOSED. Container-query tiers remain. Owning FRs: Spec 37 (FR-37-12, §3.6).

### DB registration

`/sgs-update` registers `blocks` + `block_supports` + `block_attributes` for the header/footer/nav block.json files automatically; `block_composition.wraps_block='sgs/container'` + `container_kind` via `sync-container-wrapping-blocks.py`; `composition_role` via `seed-composition-roles.py`. Re-verify the rows via `/sgs-db`.

---

## `sgs/product-card` — Build status

`sgs/product-card` current state:

- **BUILT-IN-ELEMENT card:** all content rendered from typed attributes via the element-MIRROR pattern. ZERO InnerBlocks in typed mode. Connect+override UX: "Connected product" picker is the primary control; `overrideElements` toggles (name/description/badge/image/cta); PRICE NEVER overridable.
- **48-SKU configurator:** value-ladder, per-axis pickers, live price row via `/sgs/v1` proxy.
- **CTA model:** max 2 text buttons (1 primary + 1 secondary); behaviours learn-more / add-to-basket / buy-now; express-pay = phase-2 gateway toggle.
- **Typography controls:** shared `TypographyControls` component (number+unit+responsive; `sgs_typography_css_rule()` for PHP render).
- **Schema:** card emits NO schema itself; ONE page-level ItemList per singular page (recursive walker, shared public API). `ProductGroup` emission gated to single-product-focus pages.

### product-card `featured` variant

`sgs/product-card` has a `featured` variant + `featuredTag` attribute + render branch. When `variant: featured` is set, the render path emits a tag overlay (sourced from the `featuredTag` string) and applies the `--featured` BEM modifier for elevated card styling.

### Canonical draft BEM vocabulary

A drafted product card uses ONE block prefix — `sgs-product-card` — for the root and every descendant. Variants are ROOT MODIFIERS, state classes are ELEMENT MODIFIERS (never bare words like `active`). Mixed prefixes (`sgs-featured-product__*`, `sgs-gift-section__card--*` on card elements) are non-conforming.

| Draft class | Maps to attr |
|---|---|
| `sgs-product-card` + `--featured` \| `--trial` | `variantStyle: standard\|featured\|trial` |
| `sgs-product-card__image` | `image` / `imageAlt` |
| `sgs-product-card__body` | (structural) |
| `sgs-product-card__title` (on the `<h3>`) | `productName` (explicit class REQUIRED — an unclassed `<h3>` falls back to the atomic tag-mapping table, which emits a `core/heading` CHILD block and contradicts the zero-InnerBlocks built-in card) |
| `sgs-product-card__description` | `description` |
| `sgs-product-card__pill-group` / `__pill` / `__pill--active` | `packSizes` (labels + selected index); both typed + bound render the real `sgs/option-picker`. **Pill STYLING clones too:** the draft's resting `.__pill` + selected `.__pill--active` CSS lifts to the option-picker's pill-state colour/border-radius attrs (resting `pillBg/Text/BorderColour`; selected `pillSelectedBg/Text/BorderColour`) via the universal styling lift — NOT a fixed SGS design. See Spec 27 FR-24-15. |
| `sgs-product-card__price-row` / `__price` / `__price-note` | `priceLarge` / `priceNote` |
| `sgs-product-card__tag--trial` | `trialTag` (rendered IN-BODY above the title) |
| `sgs-product-card__tag--featured` | `featuredTag` (rendered as a media-OVERLAY badge in `sgs-product-card__media-wrap` when `variantStyle='featured'`; falls back in-body when imageless) |
| nested `sgs-button sgs-button--primary\|--secondary` | CTA (`ctaText` / `ctaUrl`); on conversion set `ctaBehaviour='learn-more'` (the only typed-mode behaviour) |

**Converter scope note:** these are DRAFT INPUT tokens (what the converter reads from a draft's HTML). They are NOT identical to the runtime SSR classes that bound-mode `render.php` emits — the live variable branch uses `price-row`/`product-card__media` (no BEM prefix), the typed built-in + non-variable branches use `sgs-product-card__price-row`/`sgs-product-card__media-wrap`. A live-DOM parity check will see this divergence; it is intentional (only the typed built-in path is converter-input-shaped). The image container class differs by branch (`product-card__media` variable vs `sgs-product-card__media-wrap` non-variable/typed) — CSS targets all forms; a future unifier should converge them but must update all three render sites together.

Converter routing of these classes to TYPED-ATTR destinations (not child InnerBlocks) is via `canonical_slot`/`role`/`attr_type` metadata from `/sgs-update`.

---

## Block Customisation Standard (MANDATORY)

Every new SGS block MUST follow this customisation standard. Violations are caught by the `check-dead-controls.js` prebuild guard.

### 0. The editor CANVAS must reflect the control, not just accept it 

A control is not customisable if the client cannot see its effect where they are working. Writing
the attribute and rendering it correctly on the published page is only half the contract — the
block editor canvas must show the change too. Enforced by
`plugins/sgs-blocks/scripts/check-editor-render-parity.js` (CHECK A, "editor-canvas desync"),
which finds attributes a control writes and `render.php` consumes correctly while the canvas shows
nothing.

**This is a client-experience requirement, not a nicety.** Per this spec's own premise, clients are
tech-illiterate and work exclusively in the block editor. A colour picker that appears to do
nothing reads to them as a broken product, whatever the front end does.

**Mirror a shared mechanism ONCE — but only one that OWNS ITS SELECTOR.** A shared *renderer*
(`SGS_Container_Wrapper`) or a shared *atom* (`includes/media/atoms/*`) owns markup, class and
rule, so one mirror serves every adopting block. A shared *control panel* (`BackgroundPanel`) or a
shared *value helper* (`sgs_colour_value`, `sgs_text_decls`) does not — the caller decides the
selector, so there is nothing single to mirror. Shared-on-the-way-in is not shared-on-the-way-out.

Reference implementation: `svgBackgroundPreview()` in `src/utils/background-preview.js` — it renders
the same element with the same class names as the frontend so the block's own
`style.css` (loaded into the canvas by `block.json`'s `style` field) does all the painting, with no
new CSS and no second vocabulary to drift.

⛔ **Never mirror a layer the frontend does not actually paint** — that is the inverse of what this
check exists for. Confirm the render path first, including helpers, atoms and `render_block`
injectors, rather than grepping the block's own files.

Full pattern and the four traps that shipped defects: `.claude/rules/block-editor-controls.md` →
"Editor-canvas mirrors".

### 1. Native `supports` for wrapper-level controls

Use WP core `supports` for spacing, colour, border, and typography controls on the block wrapper. Do NOT re-implement these with custom attributes.

### 2. Shared `TypographyControls` component (MANDATORY)

**All per-element typography UI MUST use the shared `TypographyControls` component** (`src/components/TypographyControls.js`) for editor controls, and the **`sgs_typography_css_rule()` helper** (`includes/helpers-typography.php`, auto-loaded via `render-helpers.php`) for PHP render output.

**What `TypographyControls` provides:**
- Font size: responsive `RangeControl` + unit dropdown (NOT freeform, NOT token slugs — one default per tag)
- Font weight: dropdown
- Font style: dropdown
- Line height: `RangeControl` + unit dropdown

**Why this is mandatory (Bean R-31-13):**
> "Blank-box/token font controls are the wrong UI pattern." One shared component keeps per-element typography consistent across blocks (counter, whatsapp-cta, option-picker, trust-bar, product-card and every later block).

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

Every composite block that renders CTAs uses an InnerBlocks slot defaulting to `sgs/multi-button` + `sgs/button`. Exception: `sgs/product-card` is a built-in-element card — its CTA renders from typed attributes via the element-MIRROR pattern.

### 5. CSS fallback colours sit inside `:where()`

So custom values win over the fallback (zero specificity). Never guard a fallback with `:not([style*="color"])` — no SGS block emits an inline `style` colour declaration, so that guard always matches and the fallback becomes unconditional. Variant bg/border/colour are overridable via `:where()` (E9 pattern).

### 6. Block Selectors API

`"selectors": { "typography": ".sgs-block__text-element" }` in `block.json` targets native WP typography controls to the primary text element, not the wrapper.

### 7. `imageControls: true` for any block rendering `<img>`

Declare `"supports": { "sgs": { "imageControls": true } }` in `block.json` so the universal image-controls extension applies. Document deliberate opt-out.

### 8. Dead-control audit before shipping

A block change is not done until the inspector has ONE control per setting + zero orphans. Audit: (1) duplicate/overlap controls, (2) dead control [control → no render], (3) render-without-control [attr render.php reads but no editor control — the guard is BLIND to this], (4) vestigial attrs.

**No dead controls — parent owns LAYOUT, child owns TYPOGRAPHY (HC2).** When a composite renders
its text via child InnerBlocks (`sgs/heading`/`sgs/text`/`sgs/label`), all typography/colour/
font-size (every breakpoint) belongs on the CHILD, not the parent. A parent control duplicating a
child capability is both a forbidden duplicate and usually dead by CSS specificity — a parent
scoped rule `.{uid} .sgs-x__y{color}` (0,2,0) cannot beat the child's inline style (1,0,0,0), so it
renders nothing. This scopes standard item 3 ("custom controls per inner text element") to blocks
that render their own text element — not to InnerBlocks composites, whose text is child-owned.
Verify a control renders via the live DOM (computed style on the painted element), not just "the
attr appears in render.php".

HC2 bans a parent PER-ELEMENT typography control, not a wrapper inheritable default. The
WordPress-native `supports.typography` declared on the block ROOT is permitted: WP emits it as an
inline style on the wrapper that children inherit via normal cascade, and any child's own explicit
typography still overrides it. Only the per-element-parent-control form is banned.

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

**Implementation status:**
- Entrance animations: 16 built (including `bounce-in`, `reveal-up`).
- Hover effects (universal extension): lift (via scale + shadow), scale, glow, border-accent, shadow-grow, colour-shift, tilt-3d — all universal.
- Scroll-linked: `sgsScrollProgress` (global CSS variable, exposes `--sgs-scroll-progress` 0-1 on documentElement) and `sgsParallax` (background + element variants) are built.

#### Entrance Animations (scroll-triggered via IntersectionObserver)

**Attributes (injected into all `sgs/*` blocks):**
- `sgsAnimation` — none | fade-up | fade-down | fade-in | fade-left | fade-right | slide-up | slide-down | slide-left | slide-right | scale-in | scale-out | rotate-in | flip-in | blur-in | **bounce-in** | **reveal-up** (default: none) — 16 active types
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
- `tilt-3d` — **BUILT**. Perspective-based 3D tilt following mouse position. Uses `mousemove` event + `requestAnimationFrame`. `transform: perspective(800px) rotateX({tiltY}deg) rotateY({tiltX}deg)` with MAX_TILT 6deg. Resets smoothly on `mouseleave`. Skips entirely when `prefers-reduced-motion: reduce`. ~30 lines vanilla JS at `assets/js/tilt-3d.js`. Enabled per-block via `sgsHoverTilt3D` boolean attribute.

**Universal hover attributes registered by hover-effects.js (12 total):**
- `sgsHoverBgColour`, `sgsHoverTextColour`, `sgsHoverBorderColour` — colour shifts (3)
- `sgsHoverScale`, `sgsHoverScalePreset` — scale (2, default 1.02)
- `sgsHoverShadow` — shadow elevation (default 'medium')
- `sgsHoverImageZoom` — inner image zoom on hover (default true on most blocks)
- `sgsHoverGrayscale` — grayscale filter on hover
- `sgsHoverBorderAccent` — border-accent line slides in from left on hover **(universal)**
- `sgsHoverTilt3D` — mouse-tracking 3D rotation **(BUILT)**
- `sgsHoverDuration` — transition duration ms (default 250)
- `sgsStaggerDelay` — stagger delay for child animations
- `sgsBlockLink`, `sgsBlockLinkTarget` — wrap entire block in link

**Several blocks opt out of universal scale/shadow/image-zoom defaults** (breadcrumbs, container, countdown-timer, counter, form, form-step, all form-field-* blocks, hero, tabs, tab) — these blocks shouldn't lift or scale visually. Colour hovers and block-link still work on them. (Exact roster is DB-authoritative — query `/sgs-db`.)

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
- CSS Scroll-Driven Animations (`animation-timeline: scroll()`) used where supported (Chrome/Edge 115+, Safari 26+; Firefox stable lacks it — see Spec 38 §3.1)
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

**Not built:** extend with role-based, login-state, and schedule-based visibility conditions (server-side `render_block` filter — zero frontend cost).

---

### Block Defaults System

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

Global floating UI elements (Back to Top button, Reading Progress bar) live in `Appearance → Customise → SGS Floating UI`, not as Gutenberg blocks. They render fixed-position regardless of placement, so the block model doesn't fit — clients would expect them to render at the drop point and be confused when they don't. They are not blocks.

Spec 18 (`18-SGS-FLOATING-UI.md`) owns the settings and architecture; the implementation is `plugins/sgs-blocks/includes/class-sgs-floating-ui-customiser.php`, `plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php` and `plugins/sgs-blocks/assets/floating-ui/`.

**Why not a settings admin page:** Customiser has live preview — clients see button reposition / change colour as they drag sliders. Save-and-refresh on a settings page kills the design-iteration feel.

---

## Build Toolchain

- **@wordpress/scripts** — webpack-based build (standard WordPress tooling)
- **@wordpress/create-block** — used for scaffolding new blocks
- **React** — editor UI components (WordPress block editor runs on React)
- **No external CSS framework** — all styles use design tokens from theme.json
- **No external JS libraries** — vanilla JS for frontend interactivity. Motion follows the four-tier doctrine (Spec 38 §1): Tier V (vanilla/CSS, this spec's §Animation extension) is the default; Tier G (GSAP, npm-bundled, conditionally loaded via the Spec 38 motion registry) is the bounded exception for scroll-scrubbed pinned timelines, SplitText, Flip, Draggable and SVG draw/morph; Tier H is a CLOSED list of single-purpose helpers, currently **Lenis** alone for site-level smooth scrolling, each admitted by a numbered decision per Spec 38 §1.2a; Tier W is WebGL (Spec 38 §1.2b). No CDN ever.

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

## Block Notes — Logo, Icon, Option Picker, Cart

### sgs/responsive-logo

Three logo slots (desktop / tablet / mobile) with picture element per-breakpoint swap (600px / 1024px). Optional SVG draw animation via DrawSVG (Spec 38 FR-38-15; draw-on-load / hover-redraw / scroll-trigger). When no logo is set on the block, falls back to the WP site default core/site-logo via get_theme_mod custom_logo.

Attributes: desktopLogoId, tabletLogoId, mobileLogoId, svgAnimationSource, animationStyle (enum: none / draw-on-load / hover-redraw / scroll-trigger), width, linkToHome, alt.

Supports: align, spacing.margin/padding, sgs.imageControls: true.

SGS-BEM: `.sgs-responsive-logo` root + `__picture` / `__image--desktop/tablet/mobile` / `__svg` / `__link` + `--animate-{draw,hover,scroll}` modifiers + `.is-animating` / `.is-animated` states.

Competitive moat: no WP competitor (Kadence Pro, Spectra Pro, GenerateBlocks Pro, Astra Pro, Blocksy Pro) currently has H/Square/Mark aspect-ratio variants per breakpoint in one block.

### sgs/icon

Single-icon block with FOUR icon sources: Lucide (1917 icons via existing lucide-icons.php), WordPress @wordpress/icons (45 inline SVGs via wp-icons.php), Dashicons (15 curated, auto-enqueues dashicons font when used), emoji (with WCAG aria-label fallback "icon" when blank).

Attributes: iconSource (enum), iconName, emojiChar, dashiconName, wpIconName, iconSize, iconColour, linkUrl, linkTarget, linkRel, ariaLabel.

SGS-BEM: `.sgs-icon` root + `__link` / `__svg` / `__emoji` / `__dashicon` + `--source-{lucide,wp-icon,dashicon,emoji}` + `--size-{small,medium,large,custom}`.

**Shape backgrounds, clickable mode and hover effects:** shape backgrounds (circle / square / rounded-square variants with background colour + padding attrs), clickable mode (wraps icon in `<a>` with `linkUrl` / `linkTarget` / `linkRel` attrs), and hover effects (lift / scale / colour-shift via the universal hover extension). The converter emits these for icon slots within `sgs/trust-bar` and `sgs/info-box` icon areas.

### sgs/option-picker

Atomic radio-group pill chooser. Category: `sgs-interactive`. Part of the variation-sets + option-picker system. Battle-ready as both a standalone editor block and the converter's emit target for pill-group slots.

Semantics: visually-hidden `<input type=radio>` + `<label>` + pill `<span>` per option. CSS `:checked` active state (no JS required for selection display). Bubbles a `sgs:option-selected` custom event for parent-block Interactivity API stores to consume. NOT `sgs/button` — distinct atomic block.

**Note on `data-wp-on--sgs:option-selected`:** WP Interactivity silently does NOT bind custom event names containing a colon — use a `data-wp-init` + captured-context bridge (`getContext()` + plain `addEventListener`) instead.

Attributes: `options` (array of `{ value, label, isDefault }`), `variant` (source toggle: `typed` | `bound`), `display_as` (`pills` | `static-list` | `hidden`), `pillStyle` (`filled` | `outlined`), plus standard animation/hover extension attrs.

**Group-label controls:** group-label font-size + colour (legend inline style; `sgs_colour_value()`). Typography via the shared `TypographyControls` component.

Render: Dynamic `render.php`. `viewScriptModule` bubbles `sgs:option-selected`. No-JS default state: options render as visible static labels.

SGS-BEM: `.sgs-option-picker` root + `__option` / `__input` / `__label` / `__pill` + `--style-filled/outlined` + `--display-pills/static-list` + `.is-selected` state on checked option.


---

### sgs/cart

WooCommerce cart count badge. Category: `sgs-interactive`. Displays a live item count from the WC cart; intended for use in headers/navigation alongside `sgs/nav-bar-menu` or `core/navigation`. Gracefully absent (renders nothing) when WooCommerce is not active.

Attributes: `iconSlug` (default `shopping-cart` Lucide icon), `badgeColour` (token slug, default `accent`), `showWhenEmpty` (boolean, default `false` — hides badge when count is 0).

Render: Dynamic `render.php`. `viewScriptModule` uses the WC `wc-cart-fragments` mechanism to update count without full page reload.

SGS-BEM: `.sgs-cart` root + `__icon` / `__count` + `--empty` modifier.

---

## WooCommerce Blocks Layer (Spec 27/28/30)

The blocks below form the WooCommerce commerce layer. They are production blocks — not experimental. All integrate with the SGS design-token system and WC REST API/Store API.

### sgs/buybox (FR-30-7)

WooCommerce single-product buybox: wires `sgs/option-picker` pill axes to the shipped cart proxy engine. Thin wrapper block that mounts the `sgs/product-card` Interactivity store (proxy-wire M-C2, 409 re-sync, availability greying) via `view_script_module_ids`. Designed for placement in the single-product page template alongside `woocommerce/product-gallery` and `woocommerce/add-to-cart-form`.

**Category:** `sgs-content`.

**Attributes:**
- `soldOutLabel` — string (aria-label suffix for sold-out pills; screen-reader only)
- `unavailableLabel` — string (aria-label suffix for unavailable combinations)
- `notifyMeLabel` — string (stored; notify-me capture is NOT BUILT)
- `addToCartLabel` — string (override Add to Cart label; empty = translated default)
- `perUnitDenomination` — string template using `%s` as unit placeholder
- `showLadder` — boolean (default: `true`; set `false` in narrow sidebar contexts)
- `framingMode` — savings | loss-aversion | neutral (saving-label framing; default: loss-aversion)
- `decoyEnabled` — boolean (default: `false`; targets 2nd-largest pack with "Best value" badge when true)

**Context:** `usesContext: ["postId"]` — reads the WC product from the surrounding post context.

**Render:** Dynamic `render.php`. Falls back to core WC blocks for simple products or when WooCommerce is absent.

**Live-verified:** Product 540 on sandybrown canary — 3 combos add exact variation via `/sgs/v1`, foreign id 4xx handled, dismissible error, single-variant axes suppressed.

### sgs/product-search (FR-30-5)

Accessible combobox search that fetches live product suggestions. Includes a no-JS fallback `<form method="get">` that submits to the theme's product-scoped search results page.

**Category:** `sgs-interactive`.

**Attributes:**
- `displayMode` — `inline-bar` | `icon-expand` | `full-screen-overlay` | `command-palette` (default: `inline-bar`; `inline` and `icon` are accepted as aliases of `inline-bar` and `icon-expand`). `inline-bar` = always-visible search bar. `icon-expand` = native `<details>`/`<summary>` disclosure widget (no JS required to open/close). `full-screen-overlay` = icon trigger that opens a native `<dialog>` with a dimmed backdrop. `command-palette` = the same `<dialog>` as a smaller centred modal that also opens on Ctrl/Cmd+K.
- `placeholder` — string (input placeholder text)
- `buttonLabel` — string (submit button label)
- `maxResults` — integer (default: 10; max results shown in the live list)

**REST endpoint:** `GET /wp-json/sgs/v1/product-search?q=<query>` — registered REST route, nonce-optional (public), rate-limited (>30/IP/min → 429 + `Retry-After`), returns `[{id, title, permalink, thumbnail}]` only. Draft products never leaked (live-verified). Response is `no-store` cache. XSS-inert: server uses `wp_strip_all_tags` + `html_entity_decode`; client inserts via `span.textContent`.

**Security guard:** `check-product-search-guards.js` (11 assertions) wired to the `prebuild` npm script. Passes on every build; no CI exists in this repo (same floor as the dead-control guard).

**Render:** Dynamic `render.php`. `viewScriptModule` handles live suggestion fetching + combobox ARIA (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-live`).

**Placement:** Nested in `theme/sgs-theme/parts/sgs-archive-toolbar.html` (live-verified — `aria-expanded` false→true, listbox populated, live region "N products found", ArrowDown→`aria-activedescendant`).

### sgs/filter-search (FR-30-6)

Type-to-find input that narrows a WooCommerce attribute filter's visible options. Auto-shown only when the attribute has ≥16 visible (published-only, `hide_empty=true`) terms — the Baymard Research threshold above which users need a finder.

**Category:** `sgs-interactive`.

**Parent constraint:** `ancestor: ["woocommerce/product-filter-attribute"]` — must be nested inside a WC Product Filter (Attribute) block, before its chips.

**Attributes:**
- `attributeId` — integer (WC attribute taxonomy ID; 0 = auto-detect from ancestor)
- `threshold` — integer (default: 16; minimum: 2; terms below this = block renders nothing)
- `placeholder` — string (input placeholder text)

**Visibility behaviour:** render.php counts published-only terms via `get_terms` with `hide_empty=true`. Block renders nothing when the term count is below `threshold` — no empty wrapper emitted.

**Render:** Dynamic `render.php`. `viewScriptModule` handles keystroke-narrowing of the ancestor's term chips; ARIA: `role="searchbox"`, live region "N of M options shown", "No matching options" message. Core WC URL-filtering is untouched — the block only hides/shows chips client-side.

**Live-verified:** 12 published terms → input renders at exactly 16 with a 4th added; drops at 15; draft-only term excluded from count. Typing "test" narrowed chips to 4 with correct ARIA count. Zero console errors.

### sgs/collapsible-text

Operator-editable body copy that optionally collapses behind a "Read more / Read less" toggle. Designed for shop archive SEO copy where the full text must be available to crawlers and assistive technology in every state.

**Category:** `sgs-content`.

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

### sgs/timeline

Date-based timeline (distinct from existing sgs/process-steps which is positional/numbered). Vertical or horizontal orientation. Alternating / left / centre alignment (vertical only). Scroll-reveal via IntersectionObserver with stagger delay (default 100ms) honouring prefers-reduced-motion. Connector style: line / dashed / dotted. Semantic ol/li/time markup.

Attributes: orientation (enum), alignment (enum), entries (array of date/title/description/icon/image), connectorStyle, connectorColour, dateColour, revealOnScroll, revealStagger.

SGS-BEM: `.sgs-timeline` root + `--vertical/horizontal` + `--align-{left,centre,alternating}` + `__entry` / `__date` / `__node` / `__content` / `__title` / `__description` / `__image` / `__connector` + `.is-revealed` state.

Not built: P-TIMELINE-ADVANCED-VISUAL-EFFECTS — textured/themed connector (vine, tree, MIC bricks-falling-into-place), per-entry colour-fill on scroll progression, line pulsing. The scroll-driven progress connector is Spec 38 FR-38-35.

### sgs/pricing-table features

1. `billingToggle` — 4-value enum (monthly-yearly / monthly-only / yearly-only / none)
2. `features` — array of objects with `text` and `included` keys; render emits a check/cross SVG
3. Per-plan `iconName` (Lucide picker)
4. Per-plan `ribbonText` + `ribbonColour` (absolute top-right badge)
5. Per-plan `savingsBadgeText` (auto-shown when the yearly toggle is active)

### Universal-extension gating

Universal extensions ship globally via an `addFilter` on `editor.BlockEdit` in
`src/blocks/extensions/index.js` — every block gets them in the inspector automatically.
`imageControls` is the only `supports.sgs` flag the universal extensions gate on. All other
extensions are attribute-driven (they apply universally via `render_block` filters).

---

## Block variations

PHP block variations are registered via `plugins/sgs-blocks/includes/variations/sgs-*.php` files
auto-discovered by `plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php`.
