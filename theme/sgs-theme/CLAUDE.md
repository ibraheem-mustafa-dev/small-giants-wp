# SGS Theme — Claude Code Instructions

## What This Is

A lightweight, performance-first WordPress block theme. Replaces Astra Pro. Provides global styles via `theme.json` v3, custom templates, responsive typography, and self-hosted fonts with zero bloat.

Full spec: `specs/01-SGS-THEME.md`

## File Structure

```
sgs-theme/
├── style.css                 # Theme metadata header (required by WP)
├── theme.json                # Design tokens, settings, styles (v3)
├── functions.php             # Theme setup, font preloading, enqueuing
├── templates/                # Block templates:
│   │                         #   index, page, single, archive, 404, front-page
│   │                         #   search.html — search results page
│   │                         #   archive-product.html — WooCommerce shop archive (Spec 30, D213)
│   │                         #   single-product.html  — WooCommerce PDP (Spec 30, D210)
├── parts/                    # Template parts:
│   │                         #   header (default + shrink + sticky + transparent)
│   │                         #   footer (default + minimal)
│   │                         #   sidebar
│   │                         #   sgs-archive-toolbar.html — shop filter/search bar (Spec 30, D213/D214)
│   │                         #   sgs-pdp-buybox.html      — PDP buybox part (Spec 30, D210)
│   │                         #   sgs-pdp-content.html     — PDP description/tabs part (Spec 30, D210)
│   │                         #   sgs-pdp-gallery.html     — PDP gallery part (Spec 30, D210)
├── patterns/                 # Block patterns:
│   │                         #   header: header-centred, header-full, header-minimal,
│   │                         #     header-search-bar-above, header-search-bar-below,
│   │                         #     header-search-icon (category: sgs-headers, D214)
│   │                         #   hero, cta, testimonial, about, services, stats,
│   │                         #     footer layouts, and others
├── styles/                   # Style variations — one JSON per client site
├── assets/
│   ├── css/
│   │   ├── core-blocks.css          # Overrides for WP core blocks
│   │   ├── core-blocks-critical.css # Critical subset, inlined
│   │   ├── dark-mode.css            # Dark-mode token overrides
│   │   ├── utilities.css            # .sr-only, .container, .text-centre, etc.
│   │   └── woocommerce.css          # WooCommerce shop/PDP/cart styling (Spec 30, D213)
│   ├── js/
│   │   ├── header-behaviour.js      # Sticky/shrink/transparent logic
│   │   ├── nav-accessibility.js     # Keyboard navigation
│   │   ├── dark-mode.js             # Dark-mode toggle
│   │   ├── smooth-scroll.js
│   │   ├── viewport-width.js
│   │   ├── header-editor-panel.js   # Block-editor header-mode inspector
│   │   └── sgs-shop-filters.js      # Mobile filter drawer (Spec 30, D213)
│   ├── fonts/                # Self-hosted WOFF2 files
│   └── svg/                  # Reusable SVG assets
└── screenshot.png
```

## Design Tokens (Defaults — SGS Branding)

```
--primary: #0F7E80 (teal)          --accent: #F87A1F (orange)
--primary-dark: #0A5B5D            --accent-light: #FEE8D4
--success: #2E7D4F (green)         --whatsapp: #25D366
--surface: #FFFFFF                 --surface-alt: #F5F7F7
--text: #1E1E1E                    --text-muted: #555555
--text-inverse: #C0D5D6            --border-subtle: #0D5557
```

Clients override via style variations in `styles/`. Indus Foods uses teal (#0a7ea8) + gold (#d8ca50).

### Layout
- `contentSize`: 1200px (was 800px, fixed 2026-02-22)
- `wideSize`: 1400px (was 1200px, fixed 2026-02-22)

Fonts: Inter variable (body + headings, 48KB, weights 100-900) — WOFF2, `font-display: swap`. DM Serif Display and DM Sans kept as "Display" and "DM Sans" family options for client style variations.

## Per-Site Customisation

Only these change per client deployment:
1. Style variation JSON in `styles/` (colours, fonts, spacing)
2. Font files in `assets/fonts/`
3. Logo/favicon via WP customiser
4. Header/footer pattern selection
5. Homepage template (if layout is unique)

Everything else is inherited.

## Performance Budget

- < 100KB CSS total
- < 5KB JS for a typical page without interactive blocks
- Two font files maximum per site
- No jQuery, no external CDN
- Critical CSS inlined, block CSS loaded conditionally (WP 6.9 handles core blocks automatically)
- Preload critical fonts via `<link rel="preload">`

## Requirements

- WordPress 6.7+ (theme.json v3 support)
- PHP 8.0+
- WooCommerce 9.9+ — **optional** shop/PDP/cart layer (Spec 30). The theme activates and functions fully without WooCommerce. When WooCommerce is active, the theme registers `add_theme_support('woocommerce')` and the `sgs-*` template parts/`woocommerce.css`/`sgs-shop-filters.js` assets are loaded. A runtime compat-check (`class-wc-compat-check.php`) surfaces a dismissible admin notice if the detected WC version falls outside the tested band.
- No page builder dependency

## Browser Support

Chrome/Edge 90+, Firefox 90+, Safari 15+, iOS Safari 15+, Samsung Internet 18+. No IE11.

## Build Phase

Phase 1a (theme foundation) is **complete**. Current theme version: **1.5.2** (deployed on palestine-lives.org and sandybrown canary).

Version bump history (recent):
- 1.5.2 — Spec 30 P2 shop layer complete: FR-30-5 product search + FR-30-6 filter live-verified; search block placed in `sgs-archive-toolbar`; QA Gates B+C passed (D214, 2026-06-12)
- 1.5.1 — Spec 30 P2 Gate A+B: shop archive built on WC's canonical Product Collection + Filters structure; `sgs-shop-filters.js` + `woocommerce.css`; `sgs/collapsible-text` block (D213, 2026-06-11)
- 1.5.0 — Spec 30 P1 complete: PDP + cart loop + option-picker→cart bridge (`sgs/buybox`); mini-cart; Bean R-22-13 sign-off (D209/D210, 2026-06-11)
- Earlier bumps — mega-menu panels; block-quality programme; announcement-bar retired → notice-banner announcement mode; shared `TypographyControls` component (D209, 2026-06-11)

**Phase 2 theme priorities (from master feature audit):**
- `prefers-contrast` high-contrast support (P1, S-tier differentiator — first WP theme to support this)
- `text-wrap: balance` on headings (P1, CSS-only, zero effort)
- Dark mode toggle + `light-dark()` colour palette (P2) — `dark-mode.css` + `dark-mode.js` are scaffolded
- `content-visibility: auto` on below-fold sections (P2, performance)
- Block patterns library — hero, feature, testimonial, CTA, content, footer, header patterns (P2)
- **Mega-menu generic layout patterns SHIPPED 2026-06-02** — 7 patterns registered under `mega-menu-layouts` category; create-panel inspector shortcut added. See `patterns/` directory.
- **Header search patterns SHIPPED 2026-06-12** — `header-search-bar-above`, `header-search-bar-below`, `header-search-icon` registered under `sgs-headers` category (D214).

See `docs/plans/2026-02-21-master-feature-audit.md` for the full graded roadmap.

## Deploy

Use the tar method from the framework CLAUDE.md — `scp -r` creates nested directories on Hostinger. Run from the repo root (`small-giants-wp/`).

## Key Rules

- All templates use block markup only — no PHP template tags
- All styles flow from theme.json tokens — no hardcoded colours/fonts
- `functions.php` stays minimal — enqueuing, theme support, pattern registration
- Style variation-specific CSS goes in `functions.php` via `wp_add_inline_style()`, gated on the active variation — never in `style.css`
- Test that theme activates cleanly and core WP blocks render correctly before moving on

## Gotchas

- **Pattern registration requires a `style.css` Version bump.** WordPress caches the pattern-file list against the theme version. Adding a new `.php` file to `patterns/` without bumping the version means the pattern will not appear in the editor on cached installs. Bump `style.css` Version (e.g. `1.5.1` → `1.5.2`) whenever adding or renaming pattern files.
- **Theme CSS busts off `style.css` Version, not `block.json`.** The Hostinger CDN caches `style.css` on the `?ver=` query string. A CSS deploy without a version bump serves the stale edge copy — computed-style probes then appear to confirm a correct rule when the browser is still loading the old file. Bump version with any `style.css` or `assets/css/*.css` change and verify the served `?ver` after deploy.
- **WooCommerce `woocommerce_coming_soon=yes` is the default.** WC 10+ ships with Coming Soon mode enabled — it masks ALL store pages behind a Coming Soon template on fresh installs. Must be set to `no` before any shop go-live check (FR-30-13 go-live checklist item).
- **`class-wc-compat-check.php` uses integer arithmetic for version comparison.** A float ceiling (e.g. `10.8`) silently passes WC 10.10 due to float precision; use `version_compare()` or integer-parsed major/minor strings. Fixed D210 — do not revert to float.
- **No global `.btn` / `.btn-primary` exists in the theme.** Button-like styles are scoped to `.sgs-product-card`. Any new component needing a button must use `sgs/button` block tokens or define its own scoped selector. (Parked: `P-NO-GLOBAL-BUTTON-COMPONENT`, D213.)
