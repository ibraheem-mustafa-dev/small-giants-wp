# SGS Theme — Custom WordPress Block Theme

<!--
spec_id: 1
spec_version: 1.4.0
last_verified: 2026-07-13
status_history:
  - 2026-07-13: v1.4.0 — Header/footer/nav block system approved (design-gate `plans/2026-07-13-header-footer-nav-system-design-gate.md`, Bean sign-off): `parts/header.html`/`parts/footer.html` now host the specialised container blocks `sgs/site-header`, `sgs/site-footer`, `sgs/adaptive-nav` (replacing the plain `core/group` wrapper) — header/footer REMAIN template parts (this spec's architecture is unchanged; the blocks live *inside* it). Blocks default from `theme.json`/`wp_global_styles` tokens + the Spec 33 draft-extracted `theme-snapshot.json`, and bind to the `sgs/site-info` store (Spec 36) so brand/contact data is entered once. New §Header/Footer/Nav Block System documents the theme-level responsibilities (global-style defaults, never-overflow responsive model, off-canvas drawer a11y fix); block-level FRs owned by Spec 37.
  - 2026-06-12: v1.3.0 — Added WooCommerce layer (Spec 30: templates, parts, woocommerce.css, sgs-shop-filters.js); search header patterns (3 patterns, sgs-headers category); collapsible-text SEO block note; updated theme version to 1.5.2; corrected WordPress requirements (WooCommerce dependency now present); updated File Structure to match real filesystem (parts, patterns, assets).
-->

## Purpose

A lightweight, performance-first WordPress block theme that replaces Astra Pro. Provides the foundation for all Small Giants Studio client sites: global styles via `theme.json`, custom templates, responsive typography, and zero bloat.

---

## What It Replaces

| Astra Pro feature | SGS Theme equivalent |
|---|---|
| Header/footer builder | Block template parts (`parts/header.html`, `parts/footer.html`) with block patterns |
| Custom layouts | Block templates (`templates/*.html`) |
| Colour/typography settings | `theme.json` design tokens |
| Sticky header | CSS `position: sticky` + optional Interactivity API for scroll behaviour |
| Mega menus | Custom navigation block variation with dropdown patterns |
| Scroll to top | Lightweight JS module (< 1KB) |
| Custom fonts | `theme.json` font face declarations (local hosting, no Google Fonts CDN) |
| White label | Not needed (we own the theme) |
| Blog layouts | Block patterns for archive/single templates |
| WooCommerce integration | Full WC block-theme layer via `add_theme_support('woocommerce')` + custom templates/parts (Spec 30, 2026-06-11) |

---

## File Structure

```
sgs-theme/
├── style.css                    # Theme metadata header (required by WP)
├── theme.json                   # Design tokens, settings, styles, template registration
├── functions.php                # Minimal — enqueue scripts, register patterns, theme support
├── screenshot.png               # Theme thumbnail
│
├── assets/
│   ├── css/
│   │   ├── core-blocks.css          # Style overrides for WordPress core blocks
│   │   ├── core-blocks-critical.css # Critical-path subset inlined above the fold
│   │   ├── dark-mode.css            # Dark mode colour overrides
│   │   ├── header-modes.css         # Header mode variants (sticky, transparent, shrink)
│   │   ├── mega-menu-panels.css     # Mega-menu panel layout styles
│   │   ├── utilities.css            # Utility classes (.sr-only, .container, etc.)
│   │   └── woocommerce.css          # WooCommerce block theme styles — shop, PDP, cart, mini-cart (Spec 30, D213)
│   ├── js/
│   │   ├── dark-mode.js             # Dark mode toggle + system preference
│   │   ├── header-behaviour.js      # Header scroll behaviour (sticky, shrink, smart-reveal)
│   │   ├── header-editor-panel.js   # Editor panel for per-page header overrides
│   │   ├── nav-accessibility.js     # Keyboard nav + ARIA management for menus
│   │   ├── sgs-shop-filters.js      # Accessible mobile filter drawer for shop archive (Spec 30, D213)
│   │   ├── smooth-scroll.js         # Smooth anchor scrolling
│   │   └── viewport-width.js        # Viewport-width helper for responsive JS
│   ├── fonts/                       # Self-hosted font files (WOFF2)
│   └── decorative-foods/            # Decorative food PNG assets (client-specific, Indus Foods)
│
├── templates/
│   ├── index.html               # Default fallback template
│   ├── front-page.html          # Homepage template
│   ├── page.html                # Standard page template
│   ├── single.html              # Single post template
│   ├── archive.html             # Archive/blog listing template
│   ├── 404.html                 # Not found template
│   ├── search.html              # Search results template (general + WooCommerce product search)
│   ├── archive-product.html     # WooCommerce shop archive — product grid + filter/search toolbar (Spec 30, D213)
│   └── single-product.html      # WooCommerce PDP — composes sgs-pdp-* template parts (Spec 30, D210)
│
├── parts/
│   ├── header.html                 # Consolidated site header — search-free default. Already hosts sgs/site-header (+ sgs/adaptive-nav), BUILT + LIVE (D323-D333, §S9 11/11; see §Header/Footer/Nav Block System below; Spec 37 owns the block FRs)
│   ├── header-shrink.html          # Header variant: shrink-on-scroll
│   ├── header-sticky.html          # Header variant: always sticky
│   ├── header-transparent.html     # Header variant: transparent with scroll reveal
│   ├── footer.html                 # Site footer (columns, copyright, socials). Already hosts sgs/site-footer, BUILT + LIVE (D323-D333, §S9 11/11)
│   ├── footer-minimal.html         # Minimal footer (for landing pages)
│   ├── sidebar.html                # Optional sidebar template part
│   ├── mega-menu-about.html        # Mega-menu panel: About
│   ├── mega-menu-brands.html       # Mega-menu panel: Brands
│   ├── mega-menu-contact.html      # Mega-menu panel: Contact
│   ├── mega-menu-products.html     # Mega-menu panel: Products
│   ├── mega-menu-resources.html    # Mega-menu panel: Resources
│   ├── mega-menu-sectors.html      # Mega-menu panel: Sectors
│   ├── mega-menu-services.html     # Mega-menu panel: Services
│   ├── sgs-archive-toolbar.html    # Shop archive: product-search bar + filter-search chips (Spec 30, D214)
│   ├── sgs-pdp-buybox.html         # PDP: option pickers + add-to-cart (sgs/buybox, Spec 30, D210)
│   ├── sgs-pdp-content.html        # PDP: description, tabs (ingredients/allergens/nutritional), collapsible SEO copy
│   └── sgs-pdp-gallery.html        # PDP: product gallery — core gallery fallback + variation-image swap (Spec 30, D210)
│
├── patterns/                       # See §Patterns for category breakdown — count is DB/fs authoritative
│   │
│   │   # Content patterns
│   ├── about-image-left.php
│   ├── about-mission.php
│   ├── about-stats.php
│   ├── about-story.php
│   ├── contact-form.php
│   ├── contact-minimal.php
│   ├── cta-banner.php
│   ├── cta-centred.php
│   ├── faq-section.php
│   ├── heading-subheading-cluster.php
│   ├── label-heading-subheading-cluster.php
│   ├── hero-centred.php
│   ├── hero-split.php
│   ├── hero-video-background.php
│   ├── pricing-columns.php
│   ├── services-alternating.php
│   ├── services-features.php
│   ├── services-grid.php
│   ├── stats-counter.php
│   ├── team-section.php
│   ├── testimonials-cards.php
│   ├── testimonials-highlight.php
│   ├── testimonials-large.php
│   │
│   │   # Footer patterns
│   ├── footer-centred.php
│   ├── footer-columns.php
│   ├── footer-compact.php
│   ├── footer-indus-foods.php     # Client-specific footer (Indus Foods)
│   ├── footer-informational.php
│   ├── footer-minimal.php
│   ├── footer-simple.php
│   ├── framework-footer-default.php
│   │
│   │   # Header patterns (sgs-headers category)
│   ├── header-centred.php
│   ├── header-full.php
│   ├── header-minimal.php
│   ├── header-search-bar-above.php    # Search bar row ABOVE logo/nav; Block Types: core/template-part/header (Spec 30, D214)
│   ├── header-search-bar-below.php    # Search bar row BELOW logo/nav; Block Types: core/template-part/header (Spec 30, D214)
│   ├── header-search-icon.php         # Compact icon-only search trigger in nav; Block Types: core/template-part/header (Spec 30, D214)
│   ├── framework-header-default.php
│   ├── framework-header-shrink.php
│   ├── framework-header-sticky.php
│   ├── framework-header-transparent.php
│   │
│   │   # Mega-menu layout patterns (mega-menu-layouts category — shipped 2026-06-02)
│   ├── mega-menu-card-grid.php
│   ├── mega-menu-featured-promo.php
│   ├── mega-menu-logo-wall.php
│   ├── mega-menu-simple-links.php
│   ├── mega-menu-split-info-cta.php
│   ├── mega-menu-split-story-links.php
│   └── mega-menu-two-column.php
│
└── styles/                         # EMPTIED (RETIRED 2026-05-21 — see §Per-site theme.json model)
    #                               # Per-client variation files deleted by Decision 18.
    #                               # Per-client snapshots now live at sites/<client>/theme-snapshot.json
    #                               # and are pushed to specific sites via push-theme-snapshot.py.
```

---

## theme.json Structure

### Design Tokens (Settings)

> **Note:** Defaults are SGS branding. WP style variations are retired (Phase 5a, 2026-05-21). Per-client palette/typography overrides now live at `sites/<client>/theme-snapshot.json` and are pushed to each live site's `theme.json` via `push-theme-snapshot.py`. The framework `theme.json` below is the SGS default only. Requires **WordPress 7.0+** (sandybrown upgraded 2026-05-22; native pseudo-element support in `styles.elements.button` + AI Connectors API now available).

```jsonc
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary",       "color": "#0F7E80", "name": "Primary" },
        { "slug": "primary-dark",  "color": "#0A5B5D", "name": "Primary Dark" },
        { "slug": "accent",        "color": "#F87A1F", "name": "Accent" },
        { "slug": "accent-light",  "color": "#FEE8D4", "name": "Accent Light" },
        { "slug": "success",       "color": "#2E7D4F", "name": "Success" },
        { "slug": "whatsapp",      "color": "#25D366", "name": "WhatsApp" },
        { "slug": "surface",       "color": "#FFFFFF", "name": "Surface" },
        { "slug": "surface-alt",   "color": "#F5F7F7", "name": "Surface Alt" },
        { "slug": "text",          "color": "#1E1E1E", "name": "Text" },
        { "slug": "text-muted",    "color": "#555555", "name": "Text Muted" },
        { "slug": "text-inverse",  "color": "#C0D5D6", "name": "Text Inverse" },
        { "slug": "border-subtle", "color": "#0D5557", "name": "Border Subtle" },
        { "slug": "footer-bg",    "color": "#0A5B5D", "name": "Footer Background" }
      ],
      "gradients": [],
      "defaultPalette": false,
      "defaultGradients": false,
      "custom": false
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "Inter, system-ui, sans-serif",
          "slug": "heading",
          "name": "Heading",
          "fontFace": [
            {
              "fontFamily": "Inter",
              "fontWeight": "100 900",
              "fontStyle": "normal",
              "fontDisplay": "swap",
              "src": ["file:./assets/fonts/inter-variable-latin.woff2"]
            }
          ]
        },
        {
          "fontFamily": "Inter, system-ui, sans-serif",
          "slug": "body",
          "name": "Body",
          "fontFace": [
            {
              "fontFamily": "Inter",
              "fontWeight": "100 900",
              "fontStyle": "normal",
              "fontDisplay": "swap",
              "src": ["file:./assets/fonts/inter-variable-latin.woff2"]
            }
          ]
        },
        {
          "fontFamily": "'DM Serif Display', Georgia, serif",
          "slug": "display",
          "name": "Display",
          "fontFace": [
            {
              "fontFamily": "DM Serif Display",
              "fontWeight": "400",
              "fontStyle": "normal",
              "fontDisplay": "swap",
              "src": ["file:./assets/fonts/dm-serif-display-v15-latin-regular.woff2"]
            }
          ]
        },
        {
          "fontFamily": "'DM Sans', sans-serif",
          "slug": "dm-sans",
          "name": "DM Sans",
          "fontFace": [
            {
              "fontFamily": "DM Sans",
              "fontWeight": "400 700",
              "fontStyle": "normal",
              "fontDisplay": "swap",
              "src": ["file:./assets/fonts/dm-sans-v15-latin-regular.woff2"]
            }
          ]
        }
      ],
      "fontSizes": [
        { "slug": "x-small", "size": "0.75rem",    "name": "XSmall" },
        { "slug": "small",   "size": "0.875rem",   "name": "Small" },
        { "slug": "medium",  "size": "1rem",       "name": "Medium" },
        { "slug": "large",   "size": "1.25rem",    "name": "Large" },
        { "slug": "x-large", "size": "1.5rem",     "name": "XL" },
        { "slug": "xx-large","size": "2.25rem",     "name": "XXL" },
        { "slug": "hero",    "size": "3.125rem",    "name": "Hero" }
      ],
      "defaultFontSizes": false,
      "fluid": { "minViewportWidth": "375px", "maxViewportWidth": "1200px" }
    },
    "spacing": {
      "units": ["px", "rem", "%", "vw"],
      "spacingSizes": [
        { "slug": "10", "size": "0.25rem", "name": "XXS" },
        { "slug": "20", "size": "0.5rem",  "name": "XS" },
        { "slug": "30", "size": "1rem",    "name": "S" },
        { "slug": "40", "size": "1.5rem",  "name": "M" },
        { "slug": "50", "size": "2rem",    "name": "L" },
        { "slug": "60", "size": "3rem",    "name": "XL" },
        { "slug": "70", "size": "5rem",    "name": "XXL" },
        { "slug": "80", "size": "8rem",    "name": "XXXL" }
      ]
    },
    "layout": {
      "contentSize": "1200px",
      "wideSize": "1400px"
    },
    "shadow": {
      "defaultPresets": false,
      "presets": [
        { "name": "Small",  "slug": "sm",   "shadow": "0 1px 3px rgba(0,0,0,0.08)" },
        { "name": "Medium", "slug": "md",   "shadow": "0 4px 12px rgba(0,0,0,0.1)" },
        { "name": "Large",  "slug": "lg",   "shadow": "0 8px 30px rgba(0,0,0,0.12)" },
        { "name": "Glow",   "slug": "glow", "shadow": "0 0 20px rgba(248,122,31,0.3)" }
      ]
    },
    "custom": {
      "borderRadius": {
        "small": "4px",
        "medium": "8px",
        "large": "16px",
        "pill": "9999px"
      },
      "shadow": {
        "small": "0 1px 3px rgba(0,0,0,0.08)",
        "medium": "0 4px 12px rgba(0,0,0,0.1)",
        "large": "0 8px 30px rgba(0,0,0,0.12)",
        "glow": "0 0 20px rgba(212,168,67,0.3)"
      },
      "transition": {
        "fast": "0.15s ease",
        "medium": "0.3s ease",
        "slow": "0.5s ease"
      }
    },
    "appearanceTools": true,
    "useRootPaddingAwareAlignments": true
  }
}
```

### Style Variations (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.2)

The `styles/*.json` per-client overlay system is deleted by Decision 18. Each client now has `sites/<client>/theme-snapshot.json` as a full theme.json copy pushed to the specific site via `push-theme-snapshot.py`. See §Per-site theme.json model below.

**Historical reference only** — the old pattern was a JSON file in `styles/` overriding tokens per-client. This shipped ALL client variations to every install, creating a privacy leak. The example below is now `sites/indus-foods/theme-snapshot.json`:

```jsonc
// RETIRED — previously styles/indus-foods.json
// Now: sites/indus-foods/theme-snapshot.json (full theme.json, not just a diff)
{
  "version": 3,
  "title": "Indus Foods",
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary",      "color": "#0a7ea8" },
        { "slug": "primary-dark", "color": "#076a8e" },
        { "slug": "accent",       "color": "#d8ca50" },
        { "slug": "accent-light", "color": "#e7d768" }
      ]
    },
    "typography": {
      "fontFamilies": [
        { "slug": "heading", "fontFamily": "Montserrat, system-ui, sans-serif" },
        { "slug": "body",    "fontFamily": "'Source Sans 3', system-ui, sans-serif" }
      ]
    }
  }
}
```

---

## Templates

### Header Template Part (`parts/header.html`)

Standard header with:
- Site logo (left)
- Navigation menu (centre or right, configurable via block settings)
- CTA button (right, accent colour)
- Sticky behaviour via `header-behaviour.js` (adds `.is-scrolled` class for shrink/shadow effect; supports modes: static, sticky, transparent, transparent-sticky, smart-reveal, shrink, hidden — see legacy header-system-design spec for full mode reference)
- Mobile: hamburger menu with slide-out drawer (`sgs/mobile-nav`, off-canvas drawer)
- Announcement bar slot above header (optional, toggled via customiser or block)
- **Once P1/P2 land** (design-approved 2026-07-13, build-pending), the header content will be composed of `sgs/site-header` (3 named rows: top utility / middle primary / bottom message) + `sgs/adaptive-nav` inside it — see §Header/Footer/Nav Block System.

### Footer Template Part (`parts/footer.html`)

Standard footer with:
- 3-4 column layout (configurable via pattern)
- Company info, nav links, contact details, social icons
- Copyright line with dynamic year
- WhatsApp floating button (optional, configured per site)
- **Once P3 lands** (design-approved 2026-07-13, build-pending), the footer content will be composed of `sgs/site-footer` (named rows + up-to-N columns) — see §Header/Footer/Nav Block System.

---

## Header/Footer/Nav Block System (2026-07-13)

> Block-level FRs, block roster detail, structure/row model, and per-breakpoint override mechanics are **owned by [Spec 37 — Header/Footer Builder](37-HEADER-FOOTER-BUILDER.md)**; the drawer a11y contract is owned by **Spec 36** (Navigation System). This section documents only the THEME's responsibilities: what lives in the template parts, and what the theme provides as shared defaults. Design-gate: `.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` (Bean-approved 2026-07-13).

### Architecture — still template parts, not a monolithic header block

The theme continues to provide the header/footer as WordPress **template parts** (`parts/header.html` / `parts/footer.html`, the `sgs_header`/`sgs_footer` CPT + rules engine, Spec 37). What changed: the plain `core/group` wrapper inside those parts is replaced by three new **specialised container blocks** (modelled on `sgs/card-grid`/`sgs/feature-grid`, not a header-replaces-FSE block):

| Block | Role | Renders via |
|---|---|---|
| `sgs/site-header` | Header shell — 3 optional named rows (top utility / middle primary / bottom message) | `SGS_Container_Wrapper` (KIND: section) |
| `sgs/site-footer` | Footer shell — named rows + up-to-N columns | `SGS_Container_Wrapper` (KIND: section) |
| `sgs/adaptive-nav` | One nav-bar↔burger menu, 4-tier breakpoint | `SGS_Container_Wrapper` (KIND: layout) + nav logic |
| `sgs/mobile-nav` (reused) | Off-canvas drawer — P0 unclickable-drawer bug fixed 2026-07-13 | existing block, hardened |

A block that *subsumes* the template-part/Site-Info/rules system remains forbidden (the `no-header-footer-block.py` hook still blocks bare `header`/`footer`/`nav` block slugs); it now allow-lists `src/blocks/{site-header,site-footer,adaptive-nav}/` for these three specialised containers only.

### Theme-owned defaults — global styles + Site Info

Every element in `sgs/site-header`, `sgs/site-footer`, and `sgs/adaptive-nav` defaults from two theme-owned sources, so branding/contact data is entered once and stays consistent across header AND footer:

1. **Global style tokens** — this file's `theme.json` settings (§Design Tokens above) and, for cloned sites, the Spec 33 draft-extracted `sites/<client>/theme-snapshot.json`. Colours, typography, and spacing flow to header/footer elements as defaults; per-instance overrides remain available in the block inspector.
2. **SGS Site Info store** (Spec 36, `sgs_site_info` `wp_options` via the `sgs/site-info` block-bindings source) — logo, phone, email, address, hours, socials, copyright, attribution link. Both header and footer bind to the same store.

### Responsive model (never-overflow) + the drawer a11y fix

The header/footer never overflow at any width down to 320px by construction — a Cluster layout (`flex-wrap` + `min-width:0` + fluid `clamp()` spacing) plus a per-breakpoint override model (768/1024 + a custom-px 4th tier, shared source per R-31-1) rather than per-element overflow hacks. This closed a live WCAG 2.2 Reflow bug. The `sgs/mobile-nav` off-canvas drawer's P0 bug (drawer inherited `inert` from `.wp-site-blocks` because it was a DOM descendant, freezing its own links) was root-caused and fixed 2026-07-13; the drawer is now the a11y benchmark (focus trap, ESC-to-close, backdrop dismiss, body-scroll-lock). Full mechanics: Spec 37 (never-overflow layout) + Spec 36 (drawer a11y).

## WooCommerce Layer (Spec 30 — shipped 2026-06-11/12)

The theme now provides a full WC block-theme layer declared via `add_theme_support('woocommerce')` in `functions.php`. This was originally listed as "not in scope" and is now a first-class framework feature.

### WC theme support declarations (`functions.php`)

```php
add_theme_support( 'woocommerce' );
add_theme_support( 'wc-product-gallery-zoom' );
add_theme_support( 'wc-product-gallery-lightbox' );
add_theme_support( 'wc-product-gallery-slider' );
```

### WC template override priority

`archive-product.html` and `single-product.html` are registered as theme templates. WordPress's `get_block_template()` returns the theme source, so the theme overrides WC's injected defaults (verified live — D210).

**Note:** WC 10 ships with `woocommerce_coming_soon=yes` by default, which masks all store pages behind a Coming Soon template. This must be set to `no` at go-live (tracked in FR-30-13 go-live checklist).

### WC template parts

| Part | Purpose |
|------|---------|
| `sgs-archive-toolbar.html` | Shop archive: `sgs/product-search` + `sgs/filter-search` chips toolbar |
| `sgs-pdp-buybox.html` | PDP option pickers → cart bridge (`sgs/buybox`); variation manifest; add-to-cart |
| `sgs-pdp-content.html` | PDP description, `sgs/tabs` (Description/Ingredients/Nutritional/Allergens), collapsible SEO copy (`sgs/collapsible-text`) |
| `sgs-pdp-gallery.html` | PDP product gallery — core `woocommerce/product-image-gallery` fallback; per-variation image swap at Phase 2 |

### WC assets

| Asset | Purpose |
|-------|---------|
| `assets/css/woocommerce.css` | WC block theme styles: shop grid equal-height cards, `.sgs-shop-layout`-scoped baseline CTA alignment (`margin-top: auto`), mini-cart drawer width custom-prop, cart/checkout brand pass, PDP band layout |
| `assets/js/sgs-shop-filters.js` | Accessible mobile filter drawer — toggle with `aria-expanded`, focus-trap, primary-button token for the "Filter" trigger |

### `sgs/collapsible-text` block (D213)

Operator SEO copy with accessible read-more. Full text is always server-side-rendered (CSS `line-clamp`, not `display:none`) so search crawlers see the full copy. Empty content renders nothing. Labels (`data-read-more` / `data-read-less`) are i18n'd via server-emitted data attributes. Lives in `plugins/sgs-blocks` but is documented here because its primary use site is `sgs-pdp-content.html`.

### Compatibility check

`class-wc-compat-check.php` performs a lazy, version-keyed runtime self-check on `woocommerce_loaded`. On a version mismatch it shows a dismissible admin notice. The ceiling uses integer arithmetic to avoid float-comparison errors (e.g. WC 10.10 was previously mis-passed under a 10.8 ceiling — fixed D210). The `WC-DEPENDENCY-MANIFEST.md` records the relied-upon core WC blocks and the gateway record per site.

---

## Patterns

### Header patterns (category: `sgs-headers`)

Three operator-selectable header alternatives that embed the `sgs/product-search` block. All are registered with `Block Types: core/template-part/header` so they appear in the Site Editor header-part selector.

| Pattern | Search placement | Mini-cart |
|---------|-----------------|-----------|
| `header-search-bar-above.php` | Full search bar in its own row **above** the logo/nav row | Yes |
| `header-search-bar-below.php` | Full search bar in its own row **below** the logo/nav row | Yes |
| `header-search-icon.php` | Compact icon-only trigger in the nav bar | No (icon only) |

The default `parts/header.html` remains **search-free**. Search patterns are opt-in at go-live.

### Mega-menu layout patterns (category: `mega-menu-layouts` — shipped 2026-06-02)

Seven generic mega-menu panel layout patterns registered under the `mega-menu-layouts` category. A create-panel inspector shortcut was added at the same time. The seven patterns are:

- `mega-menu-card-grid.php`
- `mega-menu-featured-promo.php`
- `mega-menu-logo-wall.php`
- `mega-menu-simple-links.php`
- `mega-menu-split-info-cta.php`
- `mega-menu-split-story-links.php`
- `mega-menu-two-column.php`

### Typography helper (`plugins/sgs-blocks/includes/helpers-typography.php`)

The `sgs_typography_css_rule()` PHP helper (auto-loaded via `render-helpers.php`) and the shared `TypographyControls` JS component (`src/components/TypographyControls.js`) define the canonical SGS typography control pattern: responsive RangeControl + unit dropdown for font size; weight/style dropdowns; line-height. Both are block-plugin concerns, but the token contract (font-size slugs, weight values) is defined by `theme.json` tokens documented in §Design Tokens above. Any new block **must** use `TypographyControls` rather than freeform controls (documented in `plugins/sgs-blocks/CLAUDE.md`, D209).

---

## Performance Strategy

### CSS
- **Critical CSS inlined** in `<head>` via `wp_add_inline_style()` for above-the-fold content
- **Block CSS loaded conditionally** — only load CSS for blocks actually on the page (WordPress 6.9 does this automatically for core blocks; our custom blocks use `wp_enqueue_block_style()`)
- **No external font CDN** — fonts self-hosted as WOFF2 with `font-display: swap`
- **Utility-first where sensible** — `.sr-only`, `.container`, `.text-centre` in `utilities.css`, not a full utility framework

### JavaScript
- **No jQuery dependency** — vanilla JS only
- **Script modules** via `viewScriptModule` in block.json (native ES modules, deferred by default)
- **Intersection Observer** for scroll-triggered animations (no heavy animation libraries)
- **< 5KB total JS** for a typical page without interactive blocks

### Images
- **WebP/AVIF** via WordPress native image handling (6.1+)
- **Lazy loading** via native `loading="lazy"` (WordPress adds this automatically)
- **Explicit width/height** on all images to prevent CLS
- **SVG support** — register SVG upload capability with sanitisation

### Fonts
- **Two font files maximum** per site (heading + body)
- **Variable fonts** where available (single file for all weights)
- **Preload critical fonts** via `<link rel="preload">` in `functions.php`
- **font-display: swap** to prevent FOIT

---

## Browser/Device Support

- Chrome/Edge 90+ (last 2 years)
- Firefox 90+
- Safari 15+
- iOS Safari 15+
- Samsung Internet 18+
- No IE11 support

---

## WordPress Requirements

- WordPress 7.0+ recommended (canary/sandybrown runs WP 7.0); 6.7+ minimum (block theme features, theme.json v3)
- PHP 8.0+
- WooCommerce 9.9+ — **required** for shop/PDP templates (Spec 30, D210). The theme detects the WC version via `class-wc-compat-check.php` and shows a dismissible admin notice if the requirement is unmet. The theme still activates cleanly on non-WC installs — WC template parts simply go unused.
- No page builder plugin dependency

**theme.json v3 note:** Version 3 was introduced in WordPress 6.6 (August 2024) and should be supported on WP 6.9.1. Verify on the development site before committing. If the dev site runs an older WP version, use v2 instead (the schema is largely compatible, but v3 adds `defaultFontSizes` control and other refinements).

---

## Per-Site Customisation Points

When deploying to a new client site, only these elements change:

1. **Per-site theme.json snapshot** — colours, fonts, spacing overrides (see §Per-site theme.json model below)
2. **Font files** — add client-specific WOFF2 files to `assets/fonts/`
3. **Logo/favicon** — uploaded via WordPress Site Editor
4. **Header/footer patterns** — choose from available patterns or create site-specific ones
5. **Homepage template** — may use a site-specific template if the layout is unique

Everything else (block styles, responsive behaviour, performance optimisations, accessibility) is inherited from the framework.

---

## Per-site theme.json Model (2026-05-21)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.2 — Decisions 18, 19.

### Architecture change

The WP style-variation overlay system (Browse Styles UI showing all client variations to every site's admin) is **DELETED** (Decision 18). Reason: privacy leak — Indus Foods admin could see HelpingDoctors variation; every client's branding visible to every other client's operator.

**Replacement:** each site has ONE `theme.json`. Our local repo holds per-client snapshots in `sites/<client>/theme-snapshot.json` that are pushed to specific sites via a CLI.

**Deleted files (Decision 18 — Phase 5a):**
- `class-sgs-variation-picker.php`
- `class-variation-rest.php`
- `class-sgs-legacy-theme-mod-migrator.php`
- `active_theme_style` theme_mod logic removed from `theme/sgs-theme/functions.php`
- Variation-CSS-enqueue-by-active-variation logic removed

**Preserved (NOT affected by Decision 18):**
- `theme/sgs-theme/parts/header.html` + `footer.html` — brand-agnostic template parts
- All header/footer patterns — brand-agnostic starting templates
- Block-level variations (`register_block_variation()`) — e.g. sgs/button primary/secondary/outline
- Template part seeder, resetter, meta, header rules, footer rules, behaviours, sgs_header/sgs_footer CPTs

### Local snapshot workflow (Decision 19)

Per-client visual snapshots move from `theme/sgs-theme/styles/<client>.json` (framework dir, ships to every install) to `sites/<client>/theme-snapshot.json` (per-site dir, stays in our local repo).

- `sites/mamas-munches/theme-snapshot.json` — full `theme.json` copy for Mama's Munches
- `sites/indus-foods/theme-snapshot.json` — full `theme.json` copy for Indus Foods
- etc.

Snapshot format: **full `theme.json` copy** (not a diff). File is ~5–20 KB; simplicity of a 1:1 overwrite outweighs bandwidth savings of a diff.

`theme/sgs-theme/styles/` is **emptied** — framework deploys contain zero client-specific variation files.

### Push-theme-snapshot CLI (Decision 14′)

New Python script (Phase 5a):

```bash
python plugins/sgs-blocks/scripts/push-theme-snapshot.py \
  --client mamas-munches \
  --target u945238940@141.136.39.73
```

Behaviour:
1. Fetch server's current `wp-content/themes/sgs-theme/theme.json` via SSH
2. Diff local snapshot against server file — display diff to operator
3. Require `--yes` flag (or interactive y/N) to proceed
4. Overwrite server `theme.json` with local snapshot

**Safety note:** operator edits via Site Editor write to `wp_global_styles` (separate post type), not `theme.json` directly — file-level conflicts are rare. When they DO occur, the pre-push diff surfaces them before any overwrite.

`/sgs-clone` Stage 10 invokes `push-theme-snapshot` automatically via the auto-derived `--client` flag (Decision 16′).

### Live-style precedence: `wp_global_styles` SUPERSEDES `theme.json` (2026-06-03, D156)

> **SUPERSEDED + corrected by [Spec 26 — SGS Global Styles & Per-Client Theming](26-SGS-GLOBAL-STYLES-AND-THEMING.md) (2026-06-03).** The "override precedence" framing below is imprecise: the `wp_global_styles` user layer is simply **where a site's global styles live**; `theme.json` is the factory-default seed. It is a data-layer merge, not a CSS override. Spec 26 is the canonical target architecture (variation-delta per client + `wp_global_styles` REST sync + the corrected mental model). Read Spec 26 for the current design; the note below is retained for continuity.

**Critical (caught live on sandybrown).** WordPress compiles the page's `global-styles-inline-css` by merging the `wp_global_styles` post (the Site-Editor USER layer) **on top of** `theme.json`. Wherever both define a property, **the post wins**. On sandybrown the post is ID 7. Consequence: a change written ONLY to `theme.json` on disk — including a `push-theme-snapshot.py` push — has **no live effect** for any property the post also defines. (This corrects the "conflicts are rare" framing above: it is not a conflict, it is a deterministic override.)

**To change live per-client styles, update BOTH:**
1. `sites/<client>/theme-snapshot.json` (`styles.css` field) — the version-controlled source of truth, AND
2. the live `wp_global_styles` post via REST: `POST /wp-json/wp/v2/global-styles/<id>` (app-password Basic auth).
Then bump `theme/sgs-theme/style.css` `Version:` to bust WP's compiled-styles cache.

**Known gap (PARTIAL — push-write half shipped D161):** `push-theme-snapshot.py` now also POSTs to the live `wp_global_styles` REST endpoint, so a push updates both the disk file and the live post. What remains open (tracked at parking `P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES`, status PARTIAL): the pull round-trip (reading the live post back into the snapshot) and a pre-deploy guard to confirm the push landed. Snapshot pushes no longer silently fail to change live styles.

**Orphan:** `theme/sgs-theme/styles/mamas-munches.css` is NOT enqueued (retired Spec-16 style-variation system) — never put overrides there. Memory: `canary-live-styles-come-from-wp-global-styles-post`.

### theme.json raw custom values + overridable defaults (2026-06-03, D156)

`settings.color.custom` / `customGradient` / `customDuotone` and `settings.spacing.customSpacingSize` are `true`, and `settings.spacing.units` covers `px / em / rem / % / vw / vh`. This lets every block colour/spacing control accept **raw** values (hex, raw px), not only token presets — fixing the recurring "control rejected raw px" class. Framework default colour pairings are WCAG-safe; every framework default colour/spacing is an **overridable CSS custom property** (`property: var(--sgs-x, <default>)`) the editor controls can set per-instance. Memory: `block-style-controls-accept-raw-css-and-overridable`. Light-pastel client primaries still need a per-client dark-text override (framework default is white-on-primary, WCAG-safe for saturated primaries; universal auto-contrast for any primary is parked — `P-AUTO-CONTRAST-LIGHT-PRIMARIES`).

### Hide Browse-styles UI (Decision 17′)

On single-stylesheet installs, the WP Browse-styles picker is hidden via PHP filter on `wp_theme_json_data_styles` so the now-useless picker doesn't confuse operators.

### WP 7.0 button preset alignment (Decision 22)

WP 7.0 (released 2026-05-14) adds native pseudo-element support for `core/button` at theme.json level: `styles.elements.button:hover`, `:focus`, `:focus-visible`, `:active`. Our `wp_options.sgs_button_presets` + CSS custom property bridge is redundant. See `specs/11-SGS-BUTTON-ARCHITECTURE.md` §Decision-22 for the full migration.

### Style variation sections RETIRED

The following sections describing the `active_theme_style` theme_mod and style variation activation flow are retired by Decision 18:

**§ Style Variations (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.2):** The `styles/*.json` per-client overlay system that shipped all client variations to every install is deleted. Replaced by per-site `theme-snapshot.json` + push CLI. The example `styles/indus-foods.json` shown above is now `sites/indus-foods/theme-snapshot.json` and is never shipped in a framework deploy.
