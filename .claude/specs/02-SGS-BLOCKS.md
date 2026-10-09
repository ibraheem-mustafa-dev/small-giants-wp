---
doc_type: spec
spec_id: 2
spec_version: "1.11"
project: small-giants-wp
title: SGS Blocks — Custom Gutenberg Block Library
status: active
last_verified: 2026-10-09
authors: Bean + Claude
---

# SGS Blocks — Custom Gutenberg Block Library

> **Header/Footer/Navigation system.** Specialised container-composite blocks (`status='built'` in the DB, `container_kind` populated): `sgs/site-header`, `sgs/site-footer` (section-KIND, delegate to `SGS_Container_Wrapper` exactly like `sgs/card-grid`/`sgs/feature-grid` — 3 optional named rows + a typed element palette; live inside the `header`/`footer` template parts), `sgs/nav-bar-menu` (layout-KIND — one menu source that collapses nav-bar→burger across 4 tiers incl. custom-px, mega-panel drill-down on mobile, off-canvas escape hatch), `sgs/nav-drawer` (the off-canvas drawer, held to the GOV.UK-grade a11y contract: focus trap, ESC-close, backdrop-dismiss, body-scroll-lock, redundant state signalling, configurable SR labels) and `sgs/nav-drawer-menu` (the drawer's link list). **Header/footer REMAIN WordPress template parts (Spec 37 owns this architecture)** — these blocks are the specialised CONTAINERS used *inside* the parts, not a monolithic header/footer block; Only `src/blocks/{site-header,site-footer,nav-bar-menu,nav-drawer-menu,nav-drawer}/` are permitted; bare `header`/`footer`/`nav` block slugs remain forbidden. Full FR set + the per-breakpoint override model + the never-overflow Cluster+clamp layout live in **Spec 37** (`37-HEADER-FOOTER-BUILDER.md`); the global-defaults/Site-Info access model is owned by **Spec 36** — this spec does not duplicate those FRs, see the "Header / Footer / Navigation System" section below for the block-roster summary + cross-references.
>
> **Block architecture notes.** Composite blocks register inserter-discoverable variations and block styles via PHP sibling files `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php`, auto-discovered by `includes/variations/class-sgs-block-variations.php`. Variations register via `add_filter('get_block_type_variations', ...)` (WP 6.5+ canonical PHP path); block styles via `register_block_style()`; each variation declares its default style via the `className` attribute. Most SGS blocks are dynamic — `save` returns `null` and `render.php` drives 100% of the frontend output; `sgs/container` supports advanced backgrounds (image / video / parallax+ken-burns / gradient-overlay). The shared `TypographyControls` component + `sgs_typography_css_rule()` helper are MANDATORY for all per-element typography (see Block Customisation Standard below). Markup examples are seeded from `block.json` defaults via `plugins/sgs-blocks/scripts/generate-markup-examples.py` plus hand-authored composite examples. `wp_set_script_module_translations()` is wired in the `class-sgs-blocks.php` registration loop for blocks using `viewScriptModule`. The device-visibility coexistence rule is documented in `includes/device-visibility.php`. The live block count and per-block attribute counts are DB-authoritative — query `/sgs-db` or query `/sgs-db` or `/wp-blocks schema <slug>` (the generated `02-SGS-BLOCKS-REFERENCE.md` is rebuilt locally by `/sgs-update`); never hard-code them here.

## Purpose

A WordPress plugin providing a curated library of custom Gutenberg blocks purpose-built for Small Giants Studio client sites. Replaces Spectra Pro with blocks that produce clean, semantic markup, respect the SGS Theme design tokens, and render correctly across all breakpoints.

> **Per-block attribute reference is generated.** `02-SGS-BLOCKS-REFERENCE.md` (gitignored; absent from a fresh clone) is written locally by `/sgs-update`, which runs `plugins/sgs-blocks/scripts/generate-block-reference.py` against the framework DB. **This file** (`02-SGS-BLOCKS.md`) covers architectural patterns, customisation standards and per-block intent; attribute detail lives in `block.json`, the DB (`/sgs-db`, `/wp-blocks schema sgs/<slug>`) and that generated reference.

---

## Plugin Structure

```
sgs-blocks/
├── sgs-blocks.php               # Plugin bootstrap (registration, block loading)
├── package.json                  # Node dependencies (@wordpress/scripts, etc.)
├── webpack.config.js             # Build config (extends the @wordpress/scripts default with non-block entry points)
├── assets/                       # Static plugin assets (admin, brand, css, floating-ui, font-collections, icons, js)
├── scripts/                      # Build, audit, deploy and cloning scripts (build-deploy.py, audit-*.py, …; the cloning route is repo-root scripts/computed-route/)
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
│   │   ├── trust-bar/            # Trust/badge strip — typed-only, icon resolver. See Trust Bar below.
│   │   ├── card-grid/            # Flexible image+content grid (overlay/card variants; wc-product + cpt-collection modes)
│   │   ├── testimonial/          # Single testimonial — 7-variant typed-attr block. See Testimonial below.
│   │   ├── testimonial-slider/   # Multi-testimonial carousel
│   │   ├── icon-list/            # Checkmark/icon list
│   │   ├── icon/                 # Single icon (Lucide, WordPress icons, Dashicons or emoji) with optional shape and link
│   │   ├── process-steps/        # Horizontal step timeline
│   │   ├── timeline/             # Date-based vertical/horizontal timeline with scroll-reveal
│   │   ├── accordion/            # Expandable FAQ/content sections
│   │   ├── accordion-item/       # One expandable panel (parent: sgs/accordion)
│   │   ├── tabs/                 # Tabbed content panels
│   │   ├── tab/                  # One tab panel (parent: sgs/tabs)
│   │   ├── brand-strip/          # Logo/brand carousel strip
│   │   ├── notice-banner/        # Inline banner; `displayMode=bar` a full-width strip, `announcement` the fixed announcement bar
│   │   ├── notice-message/       # One self-changing message with its own colour pair (parent: sgs/notice-banner)
│   │   ├── local-time/           # Live clock for one IANA time zone (label, 12/24-hour, seconds)
│   │   ├── measured-diagram/     # A drawing with labelled measurement lines (any binding source fills the values). See Measured Diagram below.
│   │   ├── diagram-dimension/    # One measurement: line geometry, caption, bindable value, label position (parent: sgs/measured-diagram)
│   │   ├── language-switch/      # Hand-set language links: inline, single link or disclosure; PHP intl names and hreflang
│   │   ├── store-selector/       # Disclosure of store/country links with optional flags; current store by URL
│   │   ├── theme-toggle/         # Dark-mode switch or light/dark/system radio group; renders only when the site has a dark palette
│   │   ├── wishlist-link/        # Heart link with the live saved-items count
│   │   ├── wishlist-panel/       # Saved items (grid, list or basket strip): price drop, stock, sort, alert opt-ins, share link; Save for later on the basket
│   │   ├── account/              # WooCommerce My Account in an SGS wrapper: side menu or tabs, order-first dashboard, log-in / register layout
│   │   ├── whatsapp-cta/         # WhatsApp floating button + contextual CTA
│   │   ├── pricing-table/        # Service/pricing comparison table
│   │   ├── modal/                # Lightbox/modal overlay
│   │   ├── google-reviews/       # Google Business Profile reviews display
│   │   ├── google-rating-badge/  # Compact Google rating badge for headers, drawers and footers
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
│   │   ├── social-icons/         # Social/contact row: sgs/icon children bound to Site Info
│   │   ├── responsive-logo/      # Three-slot logo (desktop / tablet / mobile) with optional SVG animation
│   │   ├── breadcrumbs/          # Auto-generated breadcrumb navigation
│   │   ├── table-of-contents/    # Auto-generated table of contents (smooth scroll, scroll spy, collapsible)
│   │   ├── business-info/        # Business details from Settings > Business Details
│   │   ├── countdown-timer/      # Countdown to a target date, or an evergreen timer
│   │   ├── post-grid/            # Posts in grid / list / masonry / carousel layouts with AJAX filtering
│   │   ├── mega-panel/           # Content container of a mega menu (lives inside an sgs_mega_menu post)
│   │   ├── mega-group/           # One column of a mega panel — heading + link list
│   │   ├── mega-aside/           # Optional side panel of a mega panel
│   │   ├── decorative-image/     # Absolute-positioned decorative floating images/video. See Decorative Image below.
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
│   │       ├── animation.js          # Entrance animation extension (script animations)
│   │       ├── responsive-visibility.js  # Show/hide per breakpoint
│   │       ├── hover-effects/        # Hover-effect controls (index, attributes, resolve, constants, panels/)
│   │       ├── image-controls.js     # Universal image controls (blocks declaring `supports.sgs.imageControls`)
│   │       ├── custom-css.js         # Per-block custom CSS field
│   │       └── fx.js                 # FX (effects) panel
│   │
│   ├── components/               # Shared React components for editor UI
│   │   ├── TypographyControls.js # ★ MANDATORY — shared per-element typography UI. See Block Customisation Standard.
│   │   ├── ResponsiveControl.js  # Breakpoint switcher (mobile/tablet/desktop)
│   │   ├── ResponsiveOverride.js # Per-tier value override wrapper for tier-object attributes
│   │   ├── DesignTokenPicker.js  # Colour picker that reads theme.json tokens
│   │   ├── SpacingControl.js     # Spacing control: presets, a free number-plus-unit box, or both (`custom`)
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

- **`sgs/button`** is the canonical button block. Replaces all uses of `core/button` inside SGS blocks; its attribute surface is `plugins/sgs-blocks/src/blocks/button/block.json` (`/wp-blocks schema sgs/button`).
- **`sgs/multi-button`** is the container. Accepts 0..N `sgs/button` instances via InnerBlocks (restricted to children of type `sgs/button`). Per-breakpoint layout direction + alignment. Gap is provided by the shared `ContainerWrapperControls` gap control (raw-px free-input, `sgs_container_gap_value()`) — no separate per-block gap control.
- **Composition pattern:** every composite block that renders CTAs (`sgs/hero`, `sgs/feature-grid`, etc.) exposes an InnerBlocks slot whose default template is `sgs/multi-button` containing 2 `sgs/button` instances. **NEW SGS BLOCKS WITH CTAs MUST USE THIS PATTERN** — never render CTAs internally via per-block `ctaPrimary*` attributes. **RECORDED EXCEPTION (Bean sign-off):** `sgs/product-card` is a BUILT-IN-ELEMENT card — its CTA (and every other commerce element) renders from the block's own typed attributes via the element-MIRROR pattern (the CTA mirrors `sgs/button`'s control set through shared helpers; auto-propagation: a new `sgs/button` capability is a gap candidate on the mirror), with ZERO InnerBlocks in typed mode. CTA model (approved): max 2 text buttons (1 primary + 1 secondary), behaviours add-to-basket / buy-now / learn-more, express-pay as a phase-2 gateway-rendered toggle.
- **Preset binding.** `inheritStyle` (primary | secondary | outline | link | custom) selects the BEM variant class `.sgs-button--{preset}`, which consumes the per-client `settings.custom.buttonPresets` tokens (Spec 32 FR-32-2/5); the tokens come from `sites/<client>/theme-snapshot.json` or the Customiser panel (`plugins/sgs-blocks/includes/class-button-presets-customiser.php`). There is no Settings page and no `wp_options` bridge (Bean-approved, Decision 22).
- **Button content and hover controls.** `sgs/button` owns `contentAlign` (tier: `flex-start` | `center` | `flex-end`; unset keeps the centred `justify-content`, which `textAlign` cannot move because the button is a flex row), `iconGap` (tier length: the gap between label and icon; unset adds none) and `liftHover` (px, 0 to 24, default 0: `translate: 0 -N px` on hover/focus, its own property so it never contends with `scaleHover`'s `transform`); with no explicit lift, the site's `buttonPresets.default` hover lift applies (Spec 32 Part C), and an explicit lift replaces it rather than stacking. `render.php` emits the first two on the button root and, when `scaleHoverTarget` is `face`, on `.sgs-button__face`. The universal `sgsHoverLift` extension is not used because enabling the `hover` extension would also mount its scale and shadow controls beside the button's own. The hover transition is `transitionDuration` (ms) and `transitionEasing`, a name from the shared motion list (`plugins/sgs-blocks/includes/helpers-motion-easing.php::sgs_motion_easing_css`, editor `MotionEasingControl`) or `custom` with a validated `transitionEasingCustom` curve.
- **Existing CTA-rendering blocks** (sgs/hero etc.) use InnerBlocks composition. No deprecation path (pre-production policy; `.claude/rules/block-authoring.md`).
- **Render-time sanitisation (XS-9.2):** `sgs/button` `render.php` uses a tightened `wp_kses` allowlist that **excludes `<a>`**: the wrapper anchor is emitted by the render path itself, so any nested `<a>` inside button content is a malformed input. The URL goes through `esc_url`. This prevents nested-anchor markup and javascript:/data: URI injection.

## Cloning

Cloning a draft into SGS blocks is specified by [`47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`](47-COMPUTED-ROUTE-DRAFT-TO-TREE.md). The block-side contract: attribute roles, `css_property` and `css_element` live in the framework DB, seeded from each `block.json`; never hand-written.

## Block Specifications

> **Build route (name the tool — don't hand-roll):** `/sgs-wp-engine` for SGS block work, or the **`wp-sgs-developer` agent** for a heavy build; `/wp-block-development` for core-WP block-API questions (block.json, supports, bindings); `/wp-interactivity-api` for `view.js` directives.
> **Before claiming an attribute is missing or reading a roster, query the DB, never the prose below:** `/sgs-db` or `/wp-blocks schema <slug>` (R-31-8). `02-SGS-BLOCKS-REFERENCE.md` (gitignored, generated locally by `/sgs-update` via `plugins/sgs-blocks/scripts/generate-block-reference.py`) is generated: if it is wrong, fix the generator, never the file. The per-block prose below states intent, rulings and rendering rules only; `block.json` and the framework DB hold the attributes (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name, css_property, css_element FROM block_attributes WHERE block_slug='sgs/<slug>'"`).
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

### Container (`sgs/container`)

**Replaces:** Spectra Container block

**Purpose:** Flexible layout wrapper, the fundamental building block for all page sections. Attributes: `/wp-blocks schema sgs/container`. Rulings the schema cannot state:

- `gap` is a raw CSS length string rendered via `plugins/sgs-blocks/includes/helpers-container.php::sgs_container_gap_value`. Composite/wrapper blocks (trust-bar, card-grid, feature-grid, gallery, multi-button, post-grid) carry no gap control of their own; all use this shared one via `ContainerWrapperControls`. There is no `blockGap` native support.
- `separators` draws the lines between the items of a grid, flex or stack layout (the shared Separators setting: `{ row, column }`, each a style, per-device thickness and colour). A line is centred in each gap, its thickness is independent of the gap, and it is drawn by CSS gap decorations (`column-rule` / `row-rule`) where the browser has them and by a small overlay script elsewhere. Empty by default, which draws nothing. The helpers are `plugins/sgs-blocks/includes/helpers-container-separators.php`; card-grid, feature-grid, post-grid, gallery, multi-button, site-header-row and site-footer-row declare it too.
- `contentWidth` is a **tier OBJECT** `{desktop,tablet,mobile}` (Spec 35 pass 2), **default `{"desktop":"normal"}`**. When it resolves to a cap, the shared wrapper emits an inner `<div class="sgs-container__inner">` with `max-width: {contentWidth}; margin-inline: auto`, so the outer box stays full-bleed (background, padding) while the readable content width is capped. `full` resolves to no cap, renders no band and emits no centring at that tier: an auto inline margin with no width would shrink the container to its content wherever it is itself a grid or flex item (`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php::render`, per-tier centring). ⛔ **The band gate is NOT `layout === '' || layout === 'stack'`.** It is `$has_band_props` (in `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`): ANY band-level CSS, i.e. a resolved `contentWidth` **or** any `contentBandPadding` side, regardless of layout. A grid/flex layout does not suppress the band: `$grid_on_inner` deliberately moves the GRID **onto** `__inner` when a band exists, so the `.sgs-cols-*` classes, which address the wrapper, cannot drive that grid. Nothing in this block's own `render.php` emits layer markup; it delegates entirely to `SGS_Container_Wrapper::render()`. **The EDITOR renders the band too**: `edit.js` emits `.sgs-container__inner` (styled in `editor.css`), so band controls move the canvas without publishing.

**Supports:** align (wide, full), anchor, className, colour (background, text), spacing (margin, padding)

**Inner blocks:** Yes. Accepts any blocks as children.

#### Container KINDs

`block_composition.container_kind` is a 3-KIND model for every container-bearing block. The KIND gates which `ContainerWrapperControls` panels render in the editor and which layers the shared `SGS_Container_Wrapper::render()` PHP helper emits at runtime; it is never a routing input. A block declares it as `supports.sgs.containerKind` in its `block.json`.

| Kind | Meaning | Editor controls exposed |
|---|---|---|
| `section` | Full-bleed outer page wrapper (hero, CTA strip, trust-bar): background (image/video/overlay/SVG/animation), shape dividers, width/contentWidth, gap (responsive), layout (grid/flex), min-height, grid-item defaults, shadow | All `ContainerWrapperControls` panels |
| `layout` | Inner arrangement of children inside a parent section (card-grid, feature-grid, gallery): grid/flex arrangement + width/contentWidth + gap. No background/overlay/SVG/shape layers. | Layout + Width panels only |
| `content` | Self-contained content unit inside someone else's grid (info-box, quote, team-member): width/contentWidth + inner padding/spacing only. No grid/bg layers. | Width + Spacing panels only |

The live roster is the DB, never a list here: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, container_kind FROM block_composition WHERE container_kind IS NOT NULL ORDER BY container_kind, block_slug"`. `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` reports the roster with each block's KIND, validates it against a hand-kept expected list, and with `--apply` writes `wraps_block` and `container_kind` to the framework DB; it never edits `block.json`. `sgs/modal` and `sgs/nav-drawer` have a `<dialog>`/Popover outer shell and render it block-private; both stay on the roster. **`sgs/site-header` and `sgs/site-footer` ARE on this roster as `containerKind: section`; `sgs/nav-bar-menu` as `containerKind: layout`**; see "Header / Footer / Navigation System" below.

The roster is NOT the same test as "renders via `SGS_Container_Wrapper`". A block can use the wrapper for its outer shell yet have its own colour/border/typography supports and no `sgs/container` InnerBlocks; it then styles directly and is excluded from the roster (`sgs/product-card`, `sgs/team-member`).

#### Composite wrapper rule

**Composite wrapper rule (R-31-9):** A composite block on the container roster that has a built-in outer wrapper renders it through the shared helper `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` (`SGS_Container_Wrapper::render( $attributes, $block, $inner_html, $kind, $opts )`; pass `$attributes` VERBATIM, with no merge or reorder, or the responsive-CSS uid `md5(wp_json_encode($attributes).anchor)` breaks scoped-selector targeting) and does no per-block reimplementation. Container capabilities are opt-in per block: a block mounts the `sgs/container` editor panels it needs (`plugins/sgs-blocks/src/blocks/container/components/ContainerWrapperControls.js`, whose `kind` prop matches `container_kind`) and declares the matching attributes; there is no automatic propagation. A missing capability is a design gap to add to the composite, never a per-block CSS hack that diverges from the wrapper's computed behaviour (examples: a `wrap_inner=false` opt-out, a `max-width:100%!important` containment, a `margin-inline:-24px` breakout).

**A composite need not call `SGS_Container_Wrapper::render()`.** The rule forbids per-block CSS hacks that DIVERGE from the wrapper's computed behaviour, not a clean block-private implementation that reproduces the same capability set with identical computed output. A **content-KIND composite that uses only box + width** (quote, info-box, testimonial, team-member, product-faq-item) MAY render block-private (own scoped `<style>`, no wrapper call): it never used the wrapper's grid/section/background machinery. **section/layout-KIND composites KEEP the wrapper** (genuine grid/section, for example hero), which is itself fully no-inline. Apply this pattern selector; do not re-litigate it per block.

**Render:** **Dynamic**: `render: file:./render.php`. Server-side rendering is needed for layout/columns/gap responsive logic and `useInnerBlocksProps` integration. `save.js` returns `<InnerBlocks.Content />`.

---

### Hero (`sgs/hero`)

**Purpose:** Page hero section with headline, sub-headline, CTAs, and background image/video/SVG. Attributes: `/wp-blocks schema sgs/hero`.

**Tier:** `class-section`; declares `supports.sgs.is_section_root: true` in `plugins/sgs-blocks/src/blocks/hero/block.json` (populated into the `blocks.tier` column by `/sgs-update`). See [`00-naming-conventions.md` §3.2](00-naming-conventions.md).

**Hero split media: two boxes.** `.sgs-hero__media` is the SLOT (its `render.php` comment: "outer padding + background on the wrapper"), carrying `mediaBackground*`, `mediaPadding*`, `mediaOverlay*`, `mediaParallax` and `mediaKenBurns`. `.sgs-hero__split-image` is the MEDIA INSIDE IT. `mediaPadding` insets the slot; `splitMediaPadding` insets the media. They are two real boxes and must not be merged. `splitMediaType` (`image` | `video` | `svg`) selects among three parallel sources (`splitImage`, `splitVideo`, `splitSvg`); the `splitMedia*` styling attributes style whichever type is active.

**Rich-text content (XS-9.1):** Inner content rich-text uses `sgs/heading` with `wp_kses_post()` sanitisation, which supports inline emphasis/strong/anchor while blocking script/style tags.

**Variants:**
- `standard`: full-width, text over a background image/gradient
- `split`: two columns (text left, image/media right)
- `video`: background video with text overlay
- `svg-animated`: SVG animation background

CTAs use the `sgs/multi-button` composition slot (see Button architecture above).

**Render:** Dynamic `render.php` server-renders the HTML and lazy-loads video/SVG via `viewScriptModule`.

**Responsive:**
- Desktop: full layout as designed
- Tablet: reduce headline size, stack badges vertically
- Mobile: single column, stacked, badges below headline, min-height reduced

---

### Info Box (`sgs/info-box`)

**Purpose:** Feature/benefit card with icon, heading, and description. Attributes: `/wp-blocks schema sgs/info-box`.

> NOTE: `sgs/info-box` has NO icon-colour mechanism: no `iconColour`/`iconBackgroundColour`/`iconSize`/`link` attribute. `supports.__experimentalBorder` is not declared, and `supports.color`'s sub-flags (background/text/link/gradients) are all `false` with `__experimentalSkipSerialization: true`, so neither drives the icon's colour. `render.php`/`style.css` wire no attr, CSS variable or native support to it: the icon inherits whatever default paint applies, with no client-facing control. This is a KNOWN GAP, not a routed-elsewhere control.

**Render:** **Dynamic** (`render.php`): icon SVG injection from the icon library, conditional link wrapper, per-element colour token resolution. `save.js` returns `null`.

---

### Counter (`sgs/counter`)

**Purpose:** Animated number counter (e.g., "5,000+ Businesses Served"). Attributes: `/wp-blocks schema sgs/counter`.

**Render:** **Dynamic** (`render.php`) plus `viewScriptModule` for the count-up animation.

**Animation:** Uses Intersection Observer, so it only animates when scrolled into view. Without JavaScript it shows the final number.

---

### Trust Bar (`sgs/trust-bar`)

**Status: ACTIVE.** The badge/trust-signal strip. `sgs/trust-bar` is **typed-only**: it has NO `sourceMode` attribute (check: `git grep -c sourceMode -- plugins/sgs-blocks/src/blocks/trust-bar/block.json` finds nothing). It carries the certification-badge use-cases (`badgeStyle` variants: icon-circle / text-only / image-badge + auto-scroll marquee); counter use-cases belong to `sgs/counter`. The live WC configurator modes (`wc-product`/`sgs-cpt`) belong to `sgs/product-card`, not this block.

Auto-scroll marquee behaviour: the badge row loops seamlessly with no empty space (the runtime clones the track and every copy animates in step, each carrying `--sgs-scroll-distance`); it pauses while a mouse hovers it or a finger presses it (`autoScrollPauseOnHover`, default on) and always while keyboard focus is inside it; a visible pause/play button is an opt-in (`autoScrollPauseButton`, default off, shown only while the row actually scrolls); `prefers-reduced-motion` keeps the row static. The icon circle has an overridable default border; a title placeholder never leaks (trim guard); `iconCircleSize` governs badge size for icon-circle mode. Typography uses the shared `TypographyControls` component. `plugins/sgs-blocks/src/blocks/trust-bar/` is the active directory.

---

### Card Grid (`sgs/card-grid`)

**Purpose:** Flexible grid of image+content tiles with two visual variants: `overlay` (title/subtitle over the image with a gradient or solid overlay: galleries, portfolio grids, category showcases) and `card` (image on top, content below in a card body: product listings, feature grids, category tiles with descriptions and badges). Attributes: `/wp-blocks schema sgs/card-grid`. The gap is the shared `ContainerWrapperControls` control.

**Render:** **Dynamic** (`render.php`).

**Responsive:** Columns reduce per breakpoint settings. Cards stack to full width on mobile.

---

### Testimonial (`sgs/testimonial`)

**Purpose:** Single testimonial card. **Typed-attr, 7-variant block.** All content rendered from typed attributes; no InnerBlocks in production. Variants: `classic-card` (default), `pull-quote-editorial`, `rating-led`, `avatar-spotlight`, `corporate-logo`, `case-study-media`, `minimal-quote`. Attributes: `/wp-blocks schema sgs/testimonial`. Per-element typography goes through the shared `TypographyControls` component.

**Render:** Dynamic `render.php` (`save.js` returns `null`). `has_inner_blocks` is 0 for this block (a typed leaf; the slider parent has `has_inner_blocks=1`).

---

### Testimonial Slider (`sgs/testimonial-slider`)

**Purpose:** Carousel/slider of multiple testimonials.

**Inner blocks:** REQUIRED. Slides are `sgs/testimonial` InnerBlocks. `render.php` iterates `$block->inner_blocks` and renders each child; it does NOT read the `testimonials` array attribute, so this block is **InnerBlocks-ONLY** in production.

Attributes: `/wp-blocks schema sgs/testimonial-slider`. `layout` is `full` or `split` (`split` shows a `sideImage` beside the carousel). Grid templates: a template-less tier takes the wider tier's template unless that tier's `columns` count was authored (then the count's `repeat(N,1fr)` applies); the defaults 2/2/1 never replace an authored template. Direct grid/flex children get a zero-specificity `min-width:0;min-height:0` backstop, so a child's own minimum size wins.

**Scroll sideways:** `scrollSideways` (tier on/off) and `scrollItemWidth` (tier length, 80% unset). At an ON tier the direct children sit in one native row on `.{uid}>.sgs-container__inner` that scrolls sideways and snaps (`plugins/sgs-blocks/includes/container-scroll-row-css.php::sgs_container_scroll_row_css`, emitted last by the wrapper in the tier's exact range; ON forces the uid and the inner element). No GSAP, no pin; hidden under the `horizontal-panel` effect. Band side padding becomes scroll padding. The row gains 8px of block padding, taken back by an equal negative block margin, so an item's focus ring is not clipped by the row's `overflow-y:hidden`; band padding and margin on those sides are added to. The inline sides get no such room (it would override the row's `margin-inline:auto` centring), so at scroll position 0 the first item's ring is trimmed on its inline start; the other three sides stay visible, which meets WCAG 2.4.7, and Bean accepted this on 2026-09-25.

`supports.sgs.containerKind: layout`: renders its outer wrapper through `SGS_Container_Wrapper`.

**Render:** Dynamic `render.php` (via `SGS_Container_Wrapper::render(..., 'layout', ...)`) + `viewScriptModule` for carousel logic. **No external carousel library**: CSS scroll-snap plus minimal JS for autoplay/navigation.

---

### Process Steps (`sgs/process-steps`)

**Purpose:** Horizontal timeline showing a multi-step process. Attributes: `/wp-blocks schema sgs/process-steps` (the number style attribute is `numberStyle`).

**Render:** **Dynamic** (`render.php`).

**Responsive:** Switches from horizontal to vertical stacked layout on mobile.

---

### Accordion (`sgs/accordion`)

**Purpose:** Expandable content sections (FAQ, details).

**Inner blocks:** `sgs/accordion-item` inner blocks, each with a `title` (RichText) and content (any blocks). Attributes: `/wp-blocks schema sgs/accordion`.

**Render:** Dynamic `render.php`; `save` returns `<InnerBlocks.Content />`. `viewScriptModule` enhances `<details>`/`<summary>` (no-JS fallback) with smooth animation.

---

### Tabs (`sgs/tabs`)

**Purpose:** Tabbed content panels.

**Inner blocks:** `sgs/tab` inner blocks, each with a `title` (string) and content (any blocks). Attributes: `/wp-blocks schema sgs/tabs`.

**Render:** Dynamic `render.php`; `save` returns `<InnerBlocks.Content />`. `viewScriptModule` with ARIA roles and keyboard navigation.

---

### Brand Strip (`sgs/brand-strip`)

**Purpose:** Horizontal logo carousel/strip. Attributes: `/wp-blocks schema sgs/brand-strip`.

**Render:** **Dynamic** (`render.php`) with an optional CSS scrolling animation.

---

### WhatsApp CTA (`sgs/whatsapp-cta`)

**Purpose:** WhatsApp integration: floating button and/or inline CTA. Attributes: `/wp-blocks schema sgs/whatsapp-cta`. `floatingHideNearInline` (default `true`): the floating bubble steps aside (hidden, inert) while any non-floating WhatsApp CTA is on screen, and returns once none is visible.

**Render:** **Dynamic** (`render.php`) with `viewScriptModule` for floating-button visibility (show after scroll, `floatingHideNearInline`).

---

### Notice Banner (`sgs/notice-banner`)

**Purpose:** Inline informational banner for contextual messages like minimum order values, delivery terms, or promotional notices. **Also serves as a header top strip via `displayMode=bar` (in-flow, edge to edge, square) and as the fixed announcement bar via `displayMode=announcement`.** Attributes: `/wp-blocks schema sgs/notice-banner`.

**`displayMode`:**
- `inline` (default): embedded within page content at the drop point.
- `bar`: in-flow, edge to edge, square.
- `announcement`: sticky top/bottom bar (full-width, `z-index: 1000`), dismissible via the WP Interactivity API (`session`/`permanent` storage); a pre-paint anti-flash script prevents FOUC.

Variant background, border and colour are overridable via `:where()` (E9). `iconStyle` circle adds the trust-bar-style badge.

**Tier:** `class-section`; declares `supports.sgs.is_section_root: true`.

**Render:** Dynamic `render.php` echoes `$content` (the `sgs/text` InnerBlocks child carrying the notice message). `save.js` returns `<InnerBlocks.Content />`; `render.php` drives all frontend output.

**Self-changing messages (Wave 3C U-15):** with two or more `sgs/notice-message` children, `messageMode` `rotate` advances every `rotateInterval` seconds (default 5) with a `messageTransition` (`none`, `fade`, `slide-up`, `slide-left`; instant under reduced motion), an always-visible 44px pause button (WCAG 2.2.2), optional previous/next arrows (`showMessageArrows`) and pause on hover and focus (`pauseOnHover`); the messages region is `aria-live="off"` while playing and `polite` while paused. `random` shows one message per page load, chosen in the browser so the page cache cannot freeze it. Each message's colour pair repaints the whole bar through one `:has()` rule. Without JavaScript every message shows, stacked. `static`, or fewer than two messages, renders exactly as before. A live clock is an `sgs/local-time` inside a message.

---

### Pricing Table (`sgs/pricing-table`)

**Purpose:** Service/pricing comparison table with a highlighted "recommended" column. Attributes: `/wp-blocks schema sgs/pricing-table`. **Render:** **Dynamic** (`render.php`).

---

### Modal (`sgs/modal`)

**Purpose:** Lightbox/modal overlay, opened by its own trigger button or by any link to its anchor. Attributes: `/wp-blocks schema sgs/modal`. `triggerStyle` `none` renders no button: the dialog opens only from `#<anchor>` links or `data-sgs-modal-open`. `modalRef` points at an `sgs_modal` post whose content (and title, as the accessible name) the dialog shows; `triggerText` is the dialog's accessible name when no post is referenced.

**Inner blocks:** Yes. Modal content accepts any blocks (used when no `modalRef` is set).

**Render:** Dynamic `render.php` + `viewScriptModule` for open/close logic via the Interactivity API. Uses the `<dialog>` element for native accessibility; focus trap and Escape handling are built in. The `<dialog>` outer shell is rendered block-private (not through `SGS_Container_Wrapper`).

---

### Icon List (`sgs/icon-list`)

**Purpose:** List with custom icons/checkmarks per item. Used for feature lists, benefit lists, and comparison points. Attributes: `/wp-blocks schema sgs/icon-list`.

**Render:** **Dynamic** (`render.php`).

**Block Selectors:** `"typography"` targets `.sgs-icon-list__text` for native font controls.

---

### Google Reviews (`sgs/google-reviews`)

**Replaces:** Elfsight Google Reviews ($$$), Widget for Google Reviews, Trustindex, ReviewsOnMyWebsite

**Purpose:** Display Google Business Profile reviews with aggregate ratings, individual review cards, and schema.org markup for SEO rich snippets. Server-side fetching via Google Places API (New) with WordPress transient caching — zero client-side API calls.

**Competitive edge over Elementor:** Elementor has no native Google Reviews widget — users rely on Elfsight ($5-18/month per widget) or custom HTML embeds. SGS provides this natively with self-hosted data (no 3rd-party widget injection), schema.org markup, and zero recurring cost.

**Variants:**
- `grid` — Reviews in a responsive CSS Grid (2-4 columns)
- `slider` — Horizontal carousel using CSS scroll-snap
- `list` — Vertical stacked list
- `wall` — Masonry-style layout

**Attributes:** `/wp-blocks schema sgs/google-reviews`. `placeId` is configured on the settings page and overridable per block; `starColour` defaults to none so the stars, breakdown bars and active dot use Google's yellow.
**Settings Page (sgs-blocks admin):**
- `sgs_google_api_key` — Google Places API key (encrypted in wp_options via AES-256-CBC + `wp_salt('auth')` — same pattern as sgs-booking)
- `sgs_google_place_id` — Default Place ID
- `sgs_google_reviews_cache_ttl` — Cache duration in hours (default: 6)
- Connection test button (fetches one review to verify API key + Place ID)

**Google Places API (New) Integration:**
- Endpoint: `GET https://places.googleapis.com/v1/places/{placeId}` with the field mask `reviews,rating,userRatingCount,displayName,googleMapsUri` (`Google_Reviews_Settings::FIELD_MASK`; the cache key carries the mask)
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

**Responsive:**
- Grid: columns reduce per breakpoint settings
- Slider: single slide on mobile, multi-slide on desktop

**Accessibility:**
- Review cards: `article` element with `aria-label="Review by {name}, {rating} stars"`
- Star rating: `aria-label="{rating} out of 5 stars"` — stars are `aria-hidden="true"`
- Slider: same carousel accessibility as testimonial-slider (arrow key navigation, aria-live)
- Google attribution (Places API policy): Google's plain "Google" wordmark (`assets/google-wordmark-colour.svg`, `alt="Google"`, 53x18 from its 272x92 viewBox, 18px high) with 10px clear space left, right and top and 5px below, prints on every render of every variant (the four-colour wordmark on a light ground; the all-white `assets/google-wordmark-light.svg` replaces it on a dark ground). It has no setting. For live (synced) data the policy's text form is met as well by the "View on Google Maps" link to the place (the policy: "In cases where space is limited, the text Google Maps is acceptable."); inline data has no place to link and prints the wordmark alone.
- Default colours are Google's, not the site theme's: `plugins/sgs-blocks/src/blocks/google-reviews/style.css::.sgs-google-reviews` defines `--sgs-gr-star` (#fbbc04), the Material greys, the Google blue and the surface, `.sgs-google-reviews--theme-dark` redefines them for dark mode, and every inspector colour overrides them. Only the opt-in `star-primary` and `star-success` variants read the theme palette. Buttons: See all is white text on Google blue (the darker blue on hover); Write a review is blue text on white with a grey border; the border of Write a review and of the arrows turns blue on hover and nothing else changes. The pills' text colours and the "Read the full review" link (Google blue, `reviewLinkColour` overrides) sit at two-class specificity so the theme's global link colour cannot override them. The arrows and both buttons default to Google's 40px (an accepted difference from the project's 44px target, as the colours differ from the theme's), and keyboard focus is a 2px Google-blue ring.
- Every review shows the author's avatar (initial letter when Google sends no photo) and name; the name links to the author's Google profile, each review links to its Google Maps page ("View on Google Maps"), and the block links to the place; all open in a new tab (`rel="noopener noreferrer"`, visually-hidden "(opens in a new tab)"). A link whose Google field is missing is not drawn.

**Performance:**
- Server-side rendering — no client-side API calls, no loading spinners
- Images lazy-loaded (`loading="lazy"`)
- Slider JS loaded only when slider variant is used (viewScriptModule)
- Reviews cached server-side — one API call per cache TTL period, not per page view
- < 3KB additional JS for slider variant, 0KB for static variants

---

### Decorative Image (`sgs/decorative-image`)

**Purpose:** Absolute-positioned decorative images (or short looping videos) that float across page sections, unconstrained by containers and not affecting layout flow. Used for organic, editorial-style design where images (food photography, decorative elements, brand illustrations) are scattered over section backgrounds. Static positioning needs no JavaScript at all; parallax, fade-on-scroll and SVG path draw are optional.

**Parent block:** works inside any block that establishes a containing block. `plugins/sgs-blocks/src/blocks/decorative-image/style.css::.wp-block-sgs-container` and `plugins/sgs-blocks/src/blocks/decorative-image/style.css::.wp-block-group` both set `position: relative`, so `sgs/container` and `core/group` need no extra setup. The image positions itself against that ancestor using percentage offsets.

**Registration:** dynamic. `render.php` drives the output and `index.js` registers `edit` only, so nothing is serialised into post content except the block comment and its attributes. Attributes: `/wp-blocks schema sgs/decorative-image` (the position, size and rotation attributes are tier objects; the media-element and `fx` attributes attach through `supports.sgs`).

**Rendering rules** (the source is `plugins/sgs-blocks/src/blocks/decorative-image/render.php`):
- Renders nothing when no media is set.
- The block prints one scoped `<style>` element before its markup and carries no inline `style` attribute. The scope token is always a CLASS, never an id, because the block supports `anchor`. Per-device position, size and rotation are scoped `@media` rules.
- `plugins/sgs-blocks/src/blocks/decorative-image/view.js` only ever sets the two custom properties `--sgs-di-py` and `--sgs-di-op`, never a CSS property, so the element carries zero inline declarations at any point in its lifecycle.
- Art-direction images for tablet and mobile are sibling `<img>` elements toggled by compound selectors; an empty tier falls back to the desktop image.
- A surface treatment or an overlay renders a `<span>` root around the `<img>`; a video renders inside a positioned span. The anchor and the editor's additional classes land on whichever element is the root.
- Under `prefers-reduced-motion: reduce`, parallax and fade-on-scroll are disabled.

**Accessibility contract:** decorative by default (`imageDecorative` defaults to `true`: `alt=""`, `aria-hidden="true"`, `role="presentation"`). An operator can switch `imageDecorative` off and supply `imageAlt`; the alt text then renders and the hiding attributes are omitted. A video is always `aria-hidden`. The element has `pointer-events: none` and no tab stop.
---

### Trustpilot Reviews (`sgs/trustpilot-reviews`)

**Replaces:** Trustpilot's own WordPress plugin (free tier blocks all display widgets), Better Business Reviews, Trustindex, ReviewsOnMyWebsite.

**Purpose:** Display Trustpilot reviews + TrustScore on the WP site. Self-hosted data (no third-party widget injection, no `<iframe>`, no off-site script). Schema.org JSON-LD output for SEO rich snippets. Brand identity locked (green stars, Verified badge, clickable Trustpilot logo) while typography inherits the host theme via `var(--wp--preset--font-family--body)` and `color: inherit`. Border + scale hover effects use `var(--wp--preset--color--primary)` so each site's primary token tints the interaction.

**Competitive edge:** Trustpilot's free plan paywalls every display widget in its own plugin. A first-party SGS block plus the dedicated sync infrastructure (Backend Integration below) keeps brand identity locked while the cards sit in the host site visually.

**Variants:**
- `carousel` — Looping horizontal carousel (next on last wraps to first) — DEFAULT
- `grid` — Responsive CSS Grid (3 / 2 / 1 default columns)
- `list` — Vertical stacked
- `badge` — Compact aggregate TrustScore badge
- `floating-badge` — Fixed-position TrustScore badge

**Attributes:** `/wp-blocks schema sgs/trustpilot-reviews`. `dataSource` is inline | synced | placeholder (placeholder for the editor preview; `synced` reads `wp_options[sgs_trustpilot_data]`, populated by the SGS Trustpilot Sync infrastructure below). `trustScoreLabel` is derived via `sgs_trustpilot_score_label()` and the relative date via `sgs_trustpilot_relative_date()`.

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

### Measured Diagram (`sgs/measured-diagram` + `sgs/diagram-dimension`)

**Purpose:** a drawing with labelled measurement lines: a product's dimensions, a floor plan's room sizes, a size chart, an engineering part. Plan: `.claude/plans/archive/2026-10-07-measured-diagram-block.md`.

**Shape:**
- The parent holds the drawing. It uses the media-element atoms with prefix `drawing`, and its URL, ID and alt are bindable, so a template can carry a per-product drawing.
- The parent also holds the line, guide and label styles (one `SgsColourPanel`, one `TypographyControls` with `value` and `caption` targets) and `labelMode` per tier (`onDrawing` | `numbered`). Numbered places a marker at each line's midpoint and lists the labels under the drawing.
- Each `sgs/diagram-dimension` child has:
  - a caption and a bindable `value`, so any binding source fills it (`sgs-product/field`, `sgs/site-info`, a registered post meta, or typed text);
  - line geometry in % of the drawing (`startX`/`startY`/`endX`/`endY`, role `position`, no `css_property`);
  - guide reach and overshoot, `kind` (`dimension` | `leader`) and `endStyle` (`tick` | `arrow` | `dot` | `none`);
  - `labelX`/`labelY` tier objects routed to `left`/`top`.

**Rendering:**
- Lines come from one geometry function twinned in `src/utils/diagram-geometry.js` and `includes/helpers-diagram-geometry.php` (gate `diagram-geometry-twin`, fixtures proven against a real draft's SVG). The SVG carries geometry attributes only; every stroke, width and dash is in the stylesheets.
- The labels are the accessible text (caption then value in reading order, `aria-live` for a size change).
- A product value follows the size picker through `@sgs/bound-sync` (`includes/class-product-field-variations.php`).
- Colours default through `--wp--custom--measured-diagram-presets--default--<role>` (Spec 32 FR-32-9 component roles).


### Google Rating Badge (`sgs/google-rating-badge`)

**Purpose:** a compact Google rating credential (G, score, stars, caption) for headers, drawers and footers, as one link to the listing. Plan: `.claude/plans/archive/2026-10-08-google-reviews-inline-header-badge.md`.

**Shape:**
- `badgeStyle`: `pill` (one line; the shared border control sets its border and radius, so a square or frameless look is a setting), `card` (two rows, accent stripe on the leading edge) and `stacked` (a centred column).
- Figures: the block's own `rating` and `reviewCount`, then Site Info `google_rating` and `google_review_count`, then live Google data (`dataSource` `auto` | `manual` | `synced`). Nothing renders without a rating.
- Link: `listingUrl`, then the live `googleMapsUri`, then Site Info `socials.google`; https only, otherwise the badge is a `span`.
- `compactBelow` (default 0, off): below that viewport width the count and four stars drop, leaving G, one star and the score. It is a viewport media rule, because a shrink-to-fit flex child with `container-type` collapses to 0.
- `hideBelow` (default 0, off) hides the badge below a viewport width, for a crowded header row where even the compact badge does not fit.
- `fullWidth` stretches the frame across its container; `position: floating` pins it to a viewport corner.

**Google's rules it follows (verified 2026-10-08):** the G or the "Google" wordmark only, never the Maps logo; the rating is "on Google", never "Google rating"; the score sits between the G and the stars, so no star touches the logo. Live API data always shows the text " on Google Maps" (the Places policy's text form), compact mode included.

**Rendering:** one `<a>` with one accessible name ("Rated 4.7 out of 5 on Google from 15 reviews"), its visible parts `aria-hidden`; `minHeight` (default 44px) sets the visible frame, and an invisible `::after` box keeps the tap target at least 44x44 even at `minHeight` 0; the theme's focus ring; hover brightens and the shadow system supplies the lift. All instance CSS is in one scoped `<style>`. The stars come from `plugins/sgs-blocks/src/blocks/google-reviews/google-reviews-stars.php::sgs_render_stars_svg`; the badge's star rules sit at three classes and define `--sgs-gr-star`/`--sgs-gr-line`, so google-reviews' stylesheet (loaded by a reviews block on the same page) cannot repaint them.

**Used by:** `sgs/nav-drawer`'s top-row rating item (`chromeRating*`, rendered through `render_block()`).

---

## Header / Footer / Navigation System

**Owning spec for the FULL requirement set (FRs, per-breakpoint override data model, never-overflow Cluster+clamp layout, sticky/transparent-scroll behaviour): [`37-HEADER-FOOTER-BUILDER.md`](37-HEADER-FOOTER-BUILDER.md); global-defaults/Site-Info binding and the drawer a11y contract are owned by **Spec 36**.** This section is the block-roster summary only — do not duplicate Spec 37's (or Spec 36's) FRs here.

### `sgs/business-info` `displayType="attribution"` — the Website Credit element

**Plain English:** the "Website by Small Giants Studio" link in the footer's bottom strip, as a proper element an operator can move around that row — but cannot retarget, reword or delete.

**The rule it demonstrates.** This is the ONE `displayType` that does **not** read `Sgs_Site_Info`, deliberately. Every other type renders **client** data; this renders the **framework's own constant**. That is the binding distinction: *a hardcoded CLIENT value in a framework file is a bug; the component's OWN constant stays.* Routing the agency backlink through Site Info would be wrong twice — it would put agency data in a client-owned store, and it would let a client blank the backlink.

**Constants** (`sgs-blocks.php`, `defined() ||` guarded so a white-label/reseller build overrides them before plugin load without patching a block):
- `SGS_ATTRIBUTION_URL` = `https://smallgiantsstudio.co.uk/`
- `SGS_ATTRIBUTION_TEXT` = `Website by Small Giants Studio`

**Markup and classifier (BINDING):**
```html
<p class="sgs-business-info sgs-business-attribution">
  <a href="{SGS_ATTRIBUTION_URL}" class="sgs-business-info__link" rel="noopener">{SGS_ATTRIBUTION_TEXT}</a>
</p>
```
`.sgs-business-attribution` is the recognised classifier. It must stay in lockstep with the draft-side classifier `.sgs-footer__credit` (this section): change one, change both.

**Website credit contract.** Drafts mark the credit with the classifier `.sgs-footer__credit` (SGS-BEM, Spec 00 section 3). The block takes no text or URL attributes: its text and href are framework constants (`SGS_ATTRIBUTION_TEXT`, `SGS_ATTRIBUTION_URL`), so a draft's credit text and link are never copied, and the rendered link is never a draft's stale href (existing Astra sites point it at a personal LinkedIn page). A positional rule ("the second child of the bottom bar is the credit") is forbidden: one draft's second slot is a tagline, and a positional rule would map it onto the agency backlink. A tagline in that slot maps to `displayType="description"`. A draft carrying a different agency's credit is reported as a gap, never silently rebranded. A draft with no credit at all gets none from the clone; the credit is added to the draft at source (the draft is fixed, not the clone).

**Attribute surface — TYPOGRAPHY ONLY (deliberately narrow, Bean-locked).** No content attr, no URL attr, no layout attrs. An operator may restyle it; they may not re-point it:
- `textColour` (default computed, see below) and `attributionHoverColour` (the hover sweep colour; falls back to `attributionHoverColourFallback`, default `#d4a73c`)
- font family / size / weight / style / line-height via the shared `TypographyControls` component + `sgs_typography_css_rule()` — **never** hand-rolled controls. Default = inherit, so it matches the site's base paragraph font/size out of the box.

**Default colour is COMPUTED, not assumed.** `textColour` unset resolves the surrounding background to hex via `plugins/sgs-blocks/includes/helpers-colour-parse.php::sgs_colour_hex_for_contrast` (a palette slug or any colour the client picked; `sgs_resolve_palette_hex()` alone returns '' for a custom colour, and `plugins/sgs-blocks/scripts/check-custom-colour-survives.py` rejects it on an attribute) and picks the readable foreground via `plugins/sgs-blocks/includes/helpers-colour-wcag.php::sgs_wcag_text_colour_for_bg` (do NOT build a second resolver). Never assume a token NAME implies luminance: `primary-dark` is a pink on mamas-munches. Where the background cannot be resolved, fall back to `currentColor` (inherit), never to a literal.

**Hover: colour fade to the hover colour plus a left-to-right underline that grows from zero width.** Bean's reference behaviour is muslimsinconstruction.uk. The underline is a pseudo-element, NOT `text-decoration`, because only a box can be animated from zero to full width (`plugins/sgs-blocks/src/blocks/business-info/style.css` holds the rules). The resting link carries an ordinary `color`, so an unsupported `::after` costs the underline, never the legibility of the credit. Under `prefers-reduced-motion` the transitions stop and both end states are kept.

Gate: the resting state must still meet 4.5:1 (WCAG 1.4.3) and `#d4a73c` must meet it against the footer background at hover — verify per client palette, not once. `:focus-visible` must receive the identical treatment; the effect may not be mouse-only (WCAG 2.1.1).

**Defaults are intentionally thin.** The real styling is set per client from `sites/<client>/theme-snapshot.json` (Spec 32 Part C); the block defaults only need to be sane and accessible out of the box.

### Specialised container blocks are permitted inside template parts

A monolithic header/footer block that subsumes the FSE/CPT/rules system is forbidden. Header and footer **remain WordPress template parts** (Spec 37: parts + patterns + `sgs_header`/`sgs_footer` CPT + rules engine; Site Info bindings: Spec 36). A **specialised container block used INSIDE the template part** is permitted — equivalent in kind to `sgs/card-grid`/`sgs/feature-grid`. Only `src/blocks/{site-header,site-footer,nav-bar-menu,nav-drawer-menu,nav-drawer}/` are permitted; any bare `header`/`footer`/`nav` block slug remains forbidden.

### The blocks

| Block | Status | KIND | Renders via | Category |
|---|---|---|---|---|
| `sgs/site-header` | BUILT + LIVE | section | `SGS_Container_Wrapper` | `sgs-layout` |
| `sgs/site-footer` | BUILT + LIVE | section | `SGS_Container_Wrapper` | `sgs-layout` |
| `sgs/nav-bar-menu` | BUILT + LIVE | layout | block-private root (not `SGS_Container_Wrapper`); own render.php + nav logic | `sgs-content` |
| `sgs/nav-drawer-menu` (`"ancestor":["sgs/nav-drawer"]`) | BUILT + LIVE | — | block-private root (not `SGS_Container_Wrapper`); own render.php + nav logic | `sgs-content` |
| `sgs/nav-drawer` | BUILT + LIVE; see Spec 36 for the drawer contract | — (Popover/dialog shell, rendered block-private, same as `sgs/modal`) | own render.php | `sgs-interactive` |

- **`sgs/site-header`** — header shell: 3 optional named rows (top utility strip / middle primary row with logo+nav+CTA / bottom message row), each independently configurable; an empty row emits zero output (no wrapper, no padding-bleed). Typed element palette (logo, nav, search, cart, account, button/CTA, contact, social, HTML, widget-area) — not freeform.
- **`sgs/site-footer`** — footer shell: named rows (top CTA/newsletter, middle columns row splitting to up to N columns collapsing to 1 below mobile tier, bottom trademark/terms bar). Same typed element palette as the header.
- **`sgs/nav-bar-menu`** (Spec 36 is canonical) — ONE menu source renders a desktop nav bar and collapses to a burger at a breakpoint set across 4 tiers (Desktop/Tablet/Mobile/custom-px). Default = one-tree-restyled; escape hatch = independent mobile tree via the `sgs/nav-drawer`. Mega-panel drill-down + auto back-link on mobile with AJAX lazy-load for heavy content. Desktop overflow auto-collapses into a "more" menu.
- **`sgs/nav-drawer` / `sgs/nav-drawer-menu`** — the off-canvas drawer and its link list. The drawer must never be frozen by its own background `inert`: it must not be a DOM descendant of the element it inerts (`.wp-site-blocks`), so its links stay clickable (verify with `elementFromPoint` returning the link, not `BODY`). The full GOV.UK-grade a11y contract (focus trap, ESC-close, backdrop-dismiss, body-scroll-lock, redundant state signalling, configurable SR labels, published keyboard contract, 44px targets) is specified in Spec 36.

### Customisation-standard extensions that apply to these blocks

These blocks follow the Block Customisation Standard (below) plus:

- **Composite wrapper (R-31-9):** `sgs/site-header` and `sgs/site-footer` delegate ALL outer rendering to `SGS_Container_Wrapper::render()` — no per-block reimplementation of grid/section/background machinery, same rule as `sgs/hero`/`sgs/card-grid`. See "Composite wrapper rule" under `sgs/container` above.
- **No-inline scoped styling (Spec 32):** same no-inline-`style=""` contract as every other SGS block — values land in a scoped `<style id="{uid}-style">` block, not inline declarations.
- **Per-breakpoint override model — NEW-BLOCKS-ONLY:** the header/footer/nav blocks (and no existing block — avoids Gutenberg invalid-content errors, honours the no-deprecations rule) get a `{desktop, tablet, mobile}` (`null` = inherit from the tier above) per-property override data model, PLUS a separately-configurable custom-px 4th breakpoint tier (used by the `sgs/nav-bar-menu` collapse setting) — the custom-px tier is NOT a 4th key merged into every per-property value object. Full data model, cascade rules, and editor UX are owned by Spec 37 (FR-37-16) — not duplicated here.
- **Global defaults + Site Info access:** every element/setting in `sgs/site-header`, `sgs/site-footer`, and `sgs/nav-bar-menu` defaults from (1) the site's `theme.json`/`wp_global_styles` tokens (or, for cloned sites, the Spec 32 Part C `theme-snapshot.json`) and (2) the shared SGS Site Info store (Spec 36 — logo/phone/email/address/hours/socials/copyright via `sgs/site-info` block-bindings). A value set once in Site Info renders identically in header AND footer with no re-entry — never a hardcoded per-block literal (R-31-1). Owning FRs: Spec 37 (FR-37-17, §3.7); Site Info store: Spec 36.
- **Never-overflow layout:** the header Cluster row is locked `flex-wrap: nowrap` and never wraps or stacks; `min-width:0` on children lets flexbox shrink them proportionally, each stopping at its own floor (44px controls, logo `min-width: min(100%, var(--sgs-header-logo-min, 7.5rem))`, capped by its authored `--logo-width`) — guarantees no overflow down to 320px by construction. ⚠ the logo carries no `flex-shrink:0` (it overflows 320px once wrapping is gone). Fluid `clamp()` spacing: the gap default is `clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)`, live-verified varying 16px→8.8px. Both CSS-length paths share one validator, `sgs_css_length_value()` (`plugins/sgs-blocks/includes/helpers-css-safety.php`), which accepts `var|calc|min|max|minmax|clamp|repeat` via WP core's recursive balanced-paren grammar and fails CLOSED. Container-query tiers remain. Owning FRs: Spec 37 (FR-37-12, §3.6).

### DB registration

`/sgs-update` registers `blocks` + `block_supports` + `block_attributes` for the header/footer/nav block.json files automatically; `block_composition.wraps_block='sgs/container'` + `container_kind` via `sync-container-wrapping-blocks.py`; `composition_role` via `seed-composition-roles.py`. Re-verify the rows via `/sgs-db`.

---

## `sgs/product-card` — Build status

`sgs/product-card` current state:

- **BUILT-IN-ELEMENT card:** all content rendered from typed attributes via the element-MIRROR pattern. ZERO InnerBlocks in typed mode. Connect+override UX: "Connected product" picker is the primary control; `overrideElements` toggles (name/description/badge/image/cta); PRICE NEVER overridable.
- **Configurator:** value-ladder, per-axis pickers, live price row via the `/sgs/v1` proxy.
- **CTA model:** max 2 text buttons (1 primary + 1 secondary); behaviours learn-more / add-to-basket / buy-now; express-pay = phase-2 gateway toggle.
- **Typography controls:** shared `TypographyControls` component (number+unit+responsive; `sgs_typography_css_rule()` for PHP render).
- **No photo:** a product whose image is empty, WooCommerce's placeholder or the shop's chosen placeholder image (WooCommerce > Products > Placeholder image) shows the no-photo box: the `noImageLabel` text ("Photo to come") with its own Typography target and colour, else a picture icon (`includes/product-card-no-photo.php`). With a photo background colour set the box takes it. "Space above the price" (`priceRowSpaceAbove`) pads the price row over the body's row gap.
- **Schema:** card emits NO schema itself; ONE page-level ItemList per singular page (recursive walker, shared public API). `ProductGroup` emission gated to single-product-focus pages.

### product-card `featured` variant

`sgs/product-card` has a `featured` variant + `featuredTag` attribute + render branch. When `variant: featured` is set, the render path emits a tag overlay (sourced from the `featuredTag` string) and applies the `--featured` BEM modifier for elevated card styling.

---

## Block Customisation Standard (MANDATORY)

Every new SGS block MUST follow this customisation standard. Violations are caught by the `check-dead-controls.js` prebuild guard.

### 0. The editor CANVAS must reflect the control, not just accept it 

A control is not customisable if the client cannot see its effect where they are working. Writing
the attribute and rendering it correctly on the published page is only half the contract — the
block editor canvas must show the change too. Enforced by
`plugins/sgs-blocks/scripts/check-editor-render-parity.js` (CHECK A, "editor-canvas desync"),
which finds attributes a control writes and `render.php` consumes correctly while the canvas shows
nothing. Its block-context exemption applies only when a block's `usesContext` lists the key and its code
reads it. `plugins/sgs-blocks/scripts/check-wiring-fingerprint.py` (fast tier, blocks new gaps against its baseline)
proves each painting setting is wired through control, editor canvas, front-end channel and CSS reader.

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

**Why this is mandatory (Bean R-22-13 review, D209):**
> "The blank-box/token font controls I first added were the WRONG UI pattern." One shared component keeps per-element typography consistent across blocks (counter, whatsapp-cta, option-picker, trust-bar, product-card and every later block).

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

#### Entrance Animations (script animations, Spec 38 §4.3a)

Attributes are injected into all `sgs/*` blocks by `plugins/sgs-blocks/src/blocks/extensions/animation.js`; the server mirror is `plugins/sgs-blocks/includes/extension-attributes.generated.php`. Read the attribute list with `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT DISTINCT attr_name FROM block_attributes WHERE attr_name LIKE 'sgsAnimation%'"`. The contract (start point, distance, stagger and the per-block `supports.sgs.animationItems` selector) is Spec 38 §4.3a.
**Implementation:** `assets/js/animation-observer.js` plays each entrance with `element.animate()`, so it never shares a block's own `transition`, `animation` or `transform`; `assets/js/animation-entrance-timing.js` resolves when it starts and its stagger, and `includes/animation-stagger.php` writes the timing attributes for dynamic blocks. A stagger adds position × step (position among the group's animated blocks, capped) to the block's own delay; with none set, blocks with no delay of their own that start together play 100ms apart. A render-blocking head flag (`plugins/sgs-blocks/includes/animation-attributes.php::print_entrance_pending_flag`) holds entrances until their start pose is placed. Reduced motion and no-JS show content unanimated. Full contract: Spec 38 §4.3a.

#### Hover Animations (universal hover attributes)
**Universal hover attributes** (registered by `src/blocks/extensions/hover-effects/attributes.js` only on blocks that
list `"hover"` in `supports.sgs.enabledExtensions`; rendered by `includes/hover-effects/hover-effects.php` as classes
plus scoped custom properties; per-block defaults from `supports.sgs.hoverDefaults`):
- `sgsHoverScale` (fine %, 0 = off), `sgsHoverScalePreset` (1.02 / 1.05 / 1.1) and `sgsHoverLift` (px) — one transform
- `sgsHoverShadow` — a shadow preset slug (never defaulted on a block that draws the automatic lift, `shadowLiftOnHover`)
- `sgsHoverImageZoom`, `sgsHoverZoom` (%, 0 = 110%), `sgsHoverZoomDuration` (ms), `sgsHoverZoomStyle` (`''` zooms
  inside the image's frame, `spill` = the whole visible image grows past it) — the photo zoom, eased by `sgsHoverEasing`.
  One shared rule (`assets/css/extensions.css`, "Hover Image Zoom") keys on the media markers `.sgs-media-box` /
  `.sgs-media-el`, so it works on any block whose image is a media element (`sgs/media` opts in with
  `enabledExtensions:["hover"]` and `hoverExcludeControls:["shadow"]`, its shadow atom owning the image's hover shadow);
  hovering or focusing the frame triggers it, touch-guarded, off under reduced motion. card-grid, team-member,
  info-box and product-card keep their own card-hover zoom rules on the same `--sgs-hover-zoom` value.
  `supports.sgs.hoverExcludeControls` hides `imageZoom`, `grayscale` or `shadow` where a block has nothing for them
  to act on (sgs/container: its own picture is its background, zoomed from the Background panel)
- **Background zoom on hover** (Background panel, every block rendering through `SGS_Container_Wrapper`):
  `bgHoverZoom`, `bgHoverZoomScale` (101-150 %, default 105), `bgHoverZoomDuration` (ms, default 600),
  `bgHoverZoomEasing` + `bgHoverZoomEasingCustom` (`MotionEasingControl` / `sgs_motion_easing_css()`). Hovering or
  focusing into the block scales its background image inside the block (`includes/container-bg-hover-zoom.php`);
  off while Ken Burns or parallax is on. The canvas twin is `backgroundPreview()`'s `sgs-ed-bg-hover-zoom`
- `sgsHoverDuration` (a duration token), `sgsHoverDurationMs` (exact ms, overrides the token), `sgsHoverEasing`
  (a token, or `custom` with `sgsHoverEasingCustom`, validated by `sgs_motion_easing_css()`)
- `sgsHoverOpacity` (0 to 1, 0 = off) — the hover fade, touch-guarded like the transform
- `sgsHoverIndent` (a length; the block's inline-start padding grows by it on hover and focus-within, from each
  device's own resting padding: `plugins/sgs-blocks/includes/hover-effects/vars.php::build_hover_indent_base_css`) and
  `sgsHoverShadow` `custom` + `sgsHoverShadowCustom` (a box-shadow, sanitised by `sgs_shadow_value()`)
- `sgsChildSizing` / `sgsChildWidth` (opt-in `"childSizing"`) — how a block sizes as a child of a flex row, per device:
  `fit`, `fill` (takes the space the others leave) or `fixed` (with `sgsChildWidth`); `includes/child-sizing.php`
- Block-own hover fades: `opacityHover` on `sgs/button`, `sgs/icon` (linked) and `sgs/responsive-logo` (0 = off)
- `sgsHoverGrayscale`, `sgsHoverBorderAccent`, `sgsHoverTilt3D` **(BUILT)**, `sgsStaggerDelay`, `sgsFocusRing`
- `sgsBlockLink`, `sgsBlockLinkTarget`, `sgsBlockLinkLabel` (opt-in `"blockLink"`) — a stretched link. The extension lends the surface to the block's OWN first non-inert link to that URL (marked `sgs-block-link-source`, keeping its tab stop and its name) and demotes any further link to the same place; the injected overlay is inert when such a link exists and focusable with an aria-label when none does
- `sgsBlockLinkAuto` (opt-in `"blockLinkAutoUrl"`) — for a block that knows its own destination, replaces the panel's URL field with a single toggle; render.php hands the URL over via `plugins/sgs-blocks/includes/helpers-stretched-link.php::sgs_stretched_link_handover`
- `supports.sgs.blockLinkAlways` (flag, no attribute) — the whole-block link is PERMANENT, never optional: the panel renders no toggle, and render.php calls `plugins/sgs-blocks/includes/helpers-stretched-link.php::sgs_stretched_link_apply` directly rather than `sgs_stretched_link_handover` (which gates on `sgsBlockLinkAuto`). The URL field stays, because a block that resolves no destination of its own (a typed `sgs/product-card`) needs it; on a block that does resolve one, `sgs_stretched_link_apply` overwrites whatever is typed. `sgs/product-card` declares it in place of `blockLinkAutoUrl`, so it has no `sgsBlockLinkAuto` attribute.
- `sgsClickEffect`, `sgsClickRippleColour`, `sgsClickRippleDuration` — click ripple

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

**Implementation approach:**
- CSS Scroll-Driven Animations (`animation-timeline: scroll()`) used where supported (Chrome/Edge 115+, Safari 26+; Firefox stable lacks it — see Spec 38 §3.1)
- JS fallback using `IntersectionObserver` + `requestAnimationFrame` for unsupported browsers

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

### Visibility Extension

All blocks can be conditionally shown or hidden per device tier through three independent booleans: `sgsHideOnMobile`, `sgsHideOnTablet`, `sgsHideOnDesktop` (`plugins/sgs-blocks/src/blocks/extensions/responsive-visibility.js`; the device-visibility CSS is `plugins/sgs-blocks/includes/device-visibility.php`).

**Not built:** role-based, login-state and schedule-based visibility conditions (a server-side `render_block` filter, zero frontend cost).

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

**Storage format:** `{"sgs/hero": {"textAlign": "left", "minHeight": 600, ...}}` — JSON object, single option row.

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

Blocks read design tokens from `theme.json` at both build time and runtime. In the editor, the `DesignTokenPicker` component reads the theme's colour palette and offers those as options. On the frontend, blocks output CSS custom properties that resolve to whatever the client's pushed theme snapshot defines.

This means: build blocks once, and they automatically adapt to any client site's colour scheme.


---

## Block Notes — Logo, Icon, Option Picker, Cart

### sgs/responsive-logo

Three logo slots (desktop / tablet / mobile) with picture element per-breakpoint swap (600px / 1024px). Optional SVG draw animation via DrawSVG (Spec 38 FR-38-15; draw-on-load / hover-redraw / scroll-trigger). When no logo is set on the block, falls back to the WP site default core/site-logo via get_theme_mod custom_logo.

Attributes: `/wp-blocks schema sgs/responsive-logo`.

Supports: align, spacing.margin/padding, sgs.imageControls: true.

SGS-BEM: `.sgs-responsive-logo` root + `__picture` / `__image--desktop/tablet/mobile` / `__svg` / `__link` + `--animate-{draw,hover,scroll}` modifiers + `.is-animating` / `.is-animated` states.

### sgs/icon

Single-icon block with FOUR icon sources: Lucide icons via `plugins/sgs-blocks/includes/lucide-icons.php`, WordPress `@wordpress/icons` via `plugins/sgs-blocks/includes/wp-icons.php`, a curated Dashicons set (auto-enqueues the dashicons font when used), and emoji (with a WCAG `aria-label` fallback "icon" when blank).

Attributes: `/wp-blocks schema sgs/icon`.

`iconRotate` (degrees, -360 to 360, default 0) rotates the icon element, shape background and glyph together, as a paint-time `transform: rotate()` on the root (`icon/render.php`). A transform never changes layout, so the box stays `iconSize` wide: a diamond is one plain square shape plus `iconRotate: 45`, not a rotation baked into an oversized custom-SVG viewBox.

SGS-BEM: `.sgs-icon` root + `__link` / `__svg` / `__emoji` / `__dashicon` + `--source-{lucide,wp-icon,dashicon,emoji}` + `--size-{small,medium,large,custom}`.

**Shape backgrounds, clickable mode and hover effects:** shape backgrounds (circle / square / rounded-square variants with background colour and padding attrs), clickable mode (wraps the icon in `<a>` with `linkUrl` / `linkTarget` / `linkRel`), and hover effects (lift / scale / colour-shift via the universal hover extension).

**Site Info link:** an icon whose `linkUrl` is bound to a Site Info key (`metadata.bindings.linkUrl`, source `sgs/site-info`) shows the Site Info link first and its own typed `linkUrl` as the fallback; it renders nothing for a visitor only when neither gives a link, and `linkSource: "custom"` makes the typed link win. The root carries `data-sgs-site-info-key` (`icon/render.php`, `includes/helpers-icon.php::sgs_icon_resolve_bound_link`). The clone route's rule is Spec 47 FR-47-9.

**Draft-style hover, motion, shadow and brand ground (`sgs/icon`, with row defaults on `sgs/social-icons`):** every value reads own, then the wrapping row's, then the default, as `--sgs-icon-*` / `--sgs-si-*` custom properties (`includes/helpers-icon-motion.php`; editor twin `src/blocks/icon/icon-motion.js`, parity-tested by `tests/js/icon-motion-parity.test.js`).

- Hover transform is one list, scale then translate then rotate: `scaleHover`, `offsetXHover` / `offsetYHover` (px, -40 to 40) and `iconRotateHover` (deg, added to `iconRotate`); a translate is scaled with the shape. Reduced motion drops all of it.
- Motion: `transitionDuration` (the transform, ms), `paintDuration` (shadow, colour and border, ms), `transitionEasing` (+ `transitionEasingCustom`, the shared motion easing names, `spring` included). 0 / empty = the theme's fast transition.
- Shadow: `boxShadow` + `boxShadowColour`, `boxShadowHover` + `boxShadowColourHover`, `shadowLiftOnHover`, through the shared `ShadowControl` and `sgs_shadow_decls()` (a preset slug, or layers with the site colour, a palette slug or a hex, with an optional `N%`). Box shapes only; an own resting shadow pins its own hover so a row's hover shadow cannot replace it.
- Brand colours: the registry may carry `groundGradient` (Instagram's radial gradient), painted over the flat brand colour (the fallback) in colour mode Brand colours; a row or icon background of any kind replaces it. `brandHover` (`inherit` | `swap` | `hold`; row `childIconBrandHover`) chooses whether the ground and the logo trade colours on hover or hold.
- Row defaults: `childIconScaleHover` (0 = each icon's own), `childIconOffsetXHover`, `childIconOffsetYHover`, `childIconRotateHover`, `childIconTransitionDuration`, `childIconPaintDuration`, `childIconTransitionEasing(+Custom)`, `childIconBoxShadow(+Colour, +Hover, +ColourHover)`, `childIconShadowLiftOnHover`, `childIconBrandHover`.

### sgs/option-picker

Atomic radio-group pill chooser. Category: `sgs-interactive`. Part of the variation-sets + option-picker system; usable as a standalone editor block and for any pill-group slot.

Semantics: visually-hidden `<input type=radio>` + `<label>` + pill `<span>` per option. CSS `:checked` active state (no JS required for selection display). Bubbles a `sgs:option-selected` custom event for parent-block Interactivity API stores to consume. NOT `sgs/button` — distinct atomic block.

**Note on `data-wp-on--sgs:option-selected`:** WP Interactivity silently does NOT bind custom event names containing a colon — use a `data-wp-init` + captured-context bridge (`getContext()` + plain `addEventListener`) instead.

Attributes: `/wp-blocks schema sgs/option-picker`. `variant` is the source toggle (`typed` | `bound`); `display_as` is `pills` | `static-list` | `hidden`; `pillStyle` is `filled` | `outlined`.

**Group-label controls:** group-label font-size + colour (legend inline style; `sgs_colour_value()`). Typography via the shared `TypographyControls` component.

Render: Dynamic `render.php`. `viewScriptModule` bubbles `sgs:option-selected`. No-JS default state: options render as visible static labels.

SGS-BEM: `.sgs-option-picker` root + `__option` / `__input` / `__label` / `__pill` + `--style-filled/outlined` + `--display-pills/static-list` + `.is-selected` state on checked option.


---

### sgs/cart

WooCommerce cart count badge. Category: `sgs-interactive`. Displays a live item count from the WC cart; intended for use in headers/navigation alongside `sgs/nav-bar-menu` or `core/navigation`. Gracefully absent (renders nothing) when WooCommerce is not active.

Attributes: `/wp-blocks schema sgs/cart`. The badge is hidden at a count of 0 unless `showWhenEmpty` is on.

Render: Dynamic `render.php`. `viewScriptModule` uses the WC `wc-cart-fragments` mechanism to update count without full page reload.

SGS-BEM: `.sgs-cart` root + `__icon` / `__count` + `--empty` modifier.

---

## WooCommerce Blocks Layer (Spec 27/28/30)

The blocks below form the WooCommerce commerce layer. They are production blocks — not experimental. All integrate with the SGS design-token system and WC REST API/Store API.

### sgs/buybox (FR-30-7)

WooCommerce single-product buybox: wires `sgs/option-picker` pill axes to the shipped cart proxy engine. Thin wrapper block that mounts the `sgs/product-card` Interactivity store (proxy-wire M-C2, 409 re-sync, availability greying) via `view_script_module_ids`. Designed for placement in the single-product page template alongside `woocommerce/product-gallery` and `woocommerce/add-to-cart-form`.

**Category:** `sgs-content`.

Attributes: `/wp-blocks schema sgs/buybox`. Labels for sold-out and unavailable pills are screen-reader suffixes. `notifyMeLabel` is the Notify me label on sold-out combinations; the capture posts to `/sgs/v1/notify/subscribe` and the list is sent once on restock by `plugins/sgs-blocks/includes/class-stock-notify-dispatch.php`. `showLadder` defaults to `true` (switch off in narrow sidebars); `framingMode` is savings | loss-aversion | neutral (default loss-aversion); `decoyEnabled` (default `false`) targets the second-largest pack with a "Best value" badge.

**Context:** `usesContext: ["postId"]` — reads the WC product from the surrounding post context.

**Render:** Dynamic `render.php`. Falls back to core WC blocks for simple products or when WooCommerce is absent.

### sgs/product-search (FR-30-5)

Accessible combobox search that fetches live product suggestions. Includes a no-JS fallback `<form method="get">` that submits to the theme's product-scoped search results page.

**Category:** `sgs-interactive`.

Attributes: `/wp-blocks schema sgs/product-search`. `displayMode` is `inline-bar` | `icon-expand` | `full-screen-overlay` | `command-palette` (`inline` and `icon` are accepted as aliases of `inline-bar` and `icon-expand`). `inline-bar` = always-visible search bar. `icon-expand` = native `<details>`/`<summary>` disclosure widget (no JS required to open/close). `full-screen-overlay` = icon trigger that opens a native `<dialog>` with a dimmed backdrop. `command-palette` = the same `<dialog>` as a smaller centred modal that also opens on Ctrl/Cmd+K.

**REST endpoint:** `GET /wp-json/sgs/v1/product-search?q=<query>` — registered REST route, nonce-optional (public), rate-limited (>30/IP/min → 429 + `Retry-After`), returns `[{id, title, permalink, thumbnail}]` only. Draft products never leaked (live-verified). Response is `no-store` cache. XSS-inert: server uses `wp_strip_all_tags` + `html_entity_decode`; client inserts via `span.textContent`.

**Security guard:** `check-product-search-guards.js` is wired to the `prebuild` npm script. Passes on every build; no CI exists in this repo (same floor as the dead-control guard).

**Render:** Dynamic `render.php`. `viewScriptModule` handles live suggestion fetching + combobox ARIA (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-live`).

**Placement:** Nested in `theme/sgs-theme/parts/sgs-archive-toolbar.html` (live-verified — `aria-expanded` false→true, listbox populated, live region "N products found", ArrowDown→`aria-activedescendant`).

### sgs/filter-search (FR-30-6)

Type-to-find input that narrows a WooCommerce attribute filter's visible options. Auto-shown only when the attribute has ≥16 visible (published-only, `hide_empty=true`) terms — the Baymard Research threshold above which users need a finder.

**Category:** `sgs-interactive`.

**Parent constraint:** `ancestor: ["woocommerce/product-filter-attribute"]` — must be nested inside a WC Product Filter (Attribute) block, before its chips.

Attributes: `/wp-blocks schema sgs/filter-search`. `threshold` (default 16, minimum 2) is the term count below which the block renders nothing; `attributeId` 0 auto-detects the ancestor's attribute.

**Visibility behaviour:** render.php counts published-only terms via `get_terms` with `hide_empty=true`. Block renders nothing when the term count is below `threshold` — no empty wrapper emitted.

**Render:** Dynamic `render.php`. `viewScriptModule` handles keystroke-narrowing of the ancestor's term chips; ARIA: `role="searchbox"`, live region "N of M options shown", "No matching options" message. Core WC URL-filtering is untouched — the block only hides/shows chips client-side.

### sgs/collapsible-text

Operator-editable body copy that optionally collapses behind a "Read more / Read less" toggle. Designed for shop archive SEO copy where the full text must be available to crawlers and assistive technology in every state.

**Category:** `sgs-content`.

**Key behaviour:** Full text is always SSR'd into the page HTML (CSS `line-clamp` hides the overflow visually, NOT `display:none`). Toggle labels are i18n'd via server-emitted `data-read-more` / `data-read-less` attributes — no hardcoded strings in JS.

Attributes: `/wp-blocks schema sgs/collapsible-text`. The body is collapsible only when `collapsible` is on (otherwise a plain text block); `collapsedLines` drives the `--sgs-ct-lines` custom property. Typography goes through the shared `TypographyControls` component.
**Supports:** `align` (wide/full), `anchor`, `color` (text + background), `spacing` (margin + padding), `typography.textAlign`. Block Selectors API: `".sgs-collapsible-text__body"` for native font controls.

**Render:** Dynamic `render.php`. `viewScriptModule` toggles the `--is-expanded` state + updates the toggle label.

**Empty-guard:** when `text` is empty (or whitespace only), render.php emits nothing — no wrapper element.

**SGS-BEM:** `.sgs-collapsible-text` root + `__body` + `__toggle` + `--collapsible` / `--expanded` modifiers.

---

### sgs/timeline

Date-based timeline (distinct from existing sgs/process-steps which is positional/numbered). Vertical or horizontal orientation. Alternating / left / centre alignment (vertical only). Scroll-reveal via IntersectionObserver with stagger delay (default 100ms) honouring prefers-reduced-motion. Connector style: line / dashed / dotted. Semantic ol/li/time markup.

Attributes: `/wp-blocks schema sgs/timeline`.
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
`plugins/sgs-blocks/src/blocks/extensions/index.js`, so every block gets them in the inspector.
Gating follows Spec 35 A7: most extensions are opt-OUT (`supports.sgs.hideExtensions`, read by
`plugins/sgs-blocks/src/blocks/extensions/hide-extensions.js`); `hover` and `blockLink` are opt-IN
(`supports.sgs.enabledExtensions`); `imageControls` is its own `supports.sgs` flag. The roster is
`plugins/sgs-blocks/src/blocks/extensions/extension-roster.json`.

---

## Block variations

PHP block variations are registered via `plugins/sgs-blocks/includes/variations/sgs-*.php` files
auto-discovered by `plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php`.
