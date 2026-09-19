# SGS Theme — Claude Code Instructions

## What This Is

A lightweight, performance-first WordPress block theme. Provides global styles via `theme.json` v3, custom templates, responsive typography, and self-hosted fonts with zero bloat.

Full spec: `.claude/specs/01-SGS-THEME.md`

## File Structure

```
sgs-theme/
├── style.css                 # Theme metadata header (required by WP)
├── theme.json                # Design tokens, settings, styles (v3)
├── functions.php             # Theme setup, font preloading, enqueuing, pattern categories
├── inc/                      # colour-helpers.php, font-preloading.php
├── templates/                # Block templates:
│   │                         #   index, page, single, archive, home, front-page, 404, search
│   │                         #   archive-product, single-product, product-search-results,
│   │                         #   taxonomy-product_attribute, cart, checkout, order-confirmation
│   │                         #     — WooCommerce (Spec 30)
├── parts/                    # Template parts:
│   │                         #   header.html, footer.html
│   │                         #   sgs-archive-toolbar.html — shop filter/search bar
│   │                         #   sgs-pdp-buybox.html, sgs-pdp-content.html — PDP
│   │                         #   sgs-cart-content.html, sgs-checkout-content.html,
│   │                         #   sgs-order-confirmation-content.html — cart/checkout/thank-you
├── patterns/                 # Block patterns (one PHP file per pattern):
│   │                         #   header-*, footer-*, mega-*, framework-{header,footer,drawer}-default,
│   │                         #   hero, cta, testimonial, about, services, stats, team, pricing,
│   │                         #   faq, contact, and cluster patterns
├── styles/                   # Empty — per-client tokens live at sites/<client>/theme-snapshot.json
├── assets/
│   ├── css/
│   │   ├── core-blocks.css          # Overrides for WP core blocks
│   │   ├── core-blocks-critical.css # Critical subset, inlined
│   │   ├── dark-mode.css            # Dark-mode token overrides
│   │   ├── type-scale.css           # Responsive type scale
│   │   ├── utilities.css            # .sr-only, .container, .text-centre, etc.
│   │   └── woocommerce.css          # WooCommerce shop/PDP/cart styling
│   ├── js/
│   │   ├── nav-accessibility.js     # Keyboard navigation
│   │   ├── dark-mode.js             # Dark-mode toggle
│   │   ├── smooth-scroll.js
│   │   ├── viewport-width.js
│   │   └── sgs-shop-filters.js      # Mobile filter drawer
│   └── fonts/                # Self-hosted WOFF2 files
└── screenshot.png
```

Nav is owned by Spec 36 (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`, `sgs/nav-drawer`, `sgs_mega_menu` CPT).

## Design Tokens (Defaults — SGS Branding)

```
--primary: #1F7A7A (teal)          --accent: #F59E0B (amber)
--primary-dark: #0F4C4C            --accent-light: #FEF3C7
--success: #2E7D4F (green)         --whatsapp: #25D366
--surface: #FAF9F6                 --surface-alt: #F1F0EC
--text: #1A202C                    --text-muted: #606D80
--text-inverse: #F1F5F9            --border: #D4DBE5
```

Source of truth: `theme/sgs-theme/theme.json` `settings.color.palette`. Copies of a token value elsewhere (block `style.css` fallbacks) must match it; see `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`.

Clients override tokens via their theme snapshot. Indus Foods uses teal (#0a7ea8) + gold (#d8ca50).

### Layout
- `contentSize`: 1200px
- `wideSize`: 1400px

Fonts: Inter variable (body + headings, weights 100-900) — WOFF2, `font-display: swap`. DM Serif Display and DM Sans are kept as "Display" and "DM Sans" family options for client snapshots.

## Per-Site Customisation

Only these change per client deployment:
1. Theme snapshot `sites/<client>/theme-snapshot.json` (colours, fonts, spacing), pushed with `push-theme-snapshot.py`
2. Font files in `assets/fonts/`
3. Logo/favicon via WP customiser
4. Header/footer pattern selection
5. Homepage template (if layout is unique)

Everything else is inherited.

## Performance Budget

- < 100KB CSS total
- < 5KB JS for a typical page without interactive blocks
- Two font files maximum per site
- No jQuery, no external CDN. Sanctioned library exceptions are npm-bundled + conditionally loaded per Spec 38 §1: **Tier G** (GSAP) and **Tier H** (helper/utility — a CLOSED list, currently Lenis alone for site-level smooth scrolling). A page using neither ships zero bytes of either.
- Critical CSS inlined, block CSS loaded conditionally (WP 6.9 handles core blocks automatically)
- Preload critical fonts via `<link rel="preload">`

## Requirements

- WordPress 6.7+ (theme.json v3 support)
- PHP 8.0+
- WooCommerce — **optional** shop/PDP/cart layer (Spec 30). The theme activates and functions fully without WooCommerce. When WooCommerce is active, the theme registers `add_theme_support('woocommerce')` and the `sgs-*` template parts/`woocommerce.css`/`sgs-shop-filters.js` assets are loaded.
- No page builder dependency

## Browser Support

Chrome/Edge 90+, Firefox 90+, Safari 15+, iOS Safari 15+, Samsung Internet 18+. No IE11.

## Version and open priorities

Current theme version: read `style.css`; deployed to the sandybrown canary and the Indus test site.

Open theme priorities:
- `prefers-contrast` high-contrast support
- `light-dark()` colour palette (`dark-mode.css` + `dark-mode.js` are scaffolded)
- Block patterns library — hero, feature, testimonial, CTA, content, footer, header patterns

## Deploy

Deploy with `build-deploy.py --target <sandybrown|indus-test>` (see root CLAUDE.md). Run from the repo root (`small-giants-wp/`).

## Key Rules

- All templates use block markup only — no PHP template tags
- All styles flow from theme.json tokens — no hardcoded colours/fonts
- `functions.php` stays minimal — enqueuing, theme support, pattern registration
- Per-client CSS goes in the snapshot's `styles.css` or `sites/<client>/theme-overrides.css` — never in `style.css`
- Test that theme activates cleanly and core WP blocks render correctly before moving on

## Gotchas

- **Pattern registration requires a `style.css` Version bump.** WordPress caches the pattern-file list against the theme version. Adding a new `.php` file to `patterns/` without bumping the version means the pattern will not appear in the editor on cached installs. Bump `style.css` Version whenever adding or renaming pattern files.
- **Theme CSS busts off `style.css` Version, not `block.json`.** The Hostinger CDN caches `style.css` on the `?ver=` query string. A CSS deploy without a version bump serves the stale edge copy — computed-style probes then appear to confirm a correct rule when the browser is still loading the old file. Bump version with any `style.css` or `assets/css/*.css` change and verify the served `?ver` after deploy.
- **WooCommerce `woocommerce_coming_soon=yes` is the default.** WC 10+ ships with Coming Soon mode enabled — it masks ALL store pages behind a Coming Soon template on fresh installs. Must be set to `no` before any shop go-live check (FR-30-13 go-live checklist item).
- **No global `.btn` / `.btn-primary` exists in the theme.** Button-like styles are scoped to `.sgs-product-card`. Any new component needing a button must use `sgs/button` block tokens or define its own scoped selector.
