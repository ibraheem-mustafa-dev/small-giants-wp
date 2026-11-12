# SGS Theme — Claude Code Instructions

## What This Is

A lightweight, performance-first WordPress block theme. Provides global styles via `theme.json` v3, custom templates, responsive typography, and self-hosted fonts with zero bloat.

Full spec: `.claude/specs/01-SGS-THEME.md` (file structure, templates, browser support, performance, open requirements).

## Layout of the Theme

`theme.json` (tokens), `functions.php` (setup only), `inc/` (PHP modules), `templates/` and `parts/` (block markup only; the WooCommerce templates and parts are Spec 27 Part 3), `patterns/` (one PHP file per pattern), `assets/{css,js,fonts}`, and `styles/`, which stays empty because per-client tokens live in `sites/<client>/theme-snapshot.json`. Nav is owned by Spec 36 (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`, `sgs/nav-drawer`, `sgs_mega_menu` CPT).

## Design Tokens

Source of truth: `theme/sgs-theme/theme.json` `settings.color.palette` (layout sizes are in `settings.layout`). Copies of a token value elsewhere (block `style.css` fallbacks) must match it; see `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`. Clients override tokens through their theme snapshot.

Fonts: Inter variable (body + headings, weights 100-900), WOFF2, `font-display: swap`. DM Serif Display and DM Sans are kept as "Display" and "DM Sans" family options for client snapshots.

## Per-Site Customisation

Per client only: the theme snapshot (pushed with `push-theme-snapshot.py`), font files in `assets/fonts/`, logo/favicon via the WP customiser, header/footer pattern selection, and the homepage template if the layout is unique. Everything else is inherited.

## Performance Budget

- < 5KB JS for a typical page without interactive blocks
- Two font files maximum per site
- Sanctioned library exceptions are npm-bundled and conditionally loaded per Spec 38 §1: **Tier G** (GSAP) and **Tier H** (helper/utility, a CLOSED list, currently Lenis alone for site-level smooth scrolling). A page using neither ships zero bytes of either.
- Critical CSS inlined, block CSS loaded conditionally (WP 6.9 handles core blocks automatically)
- Preload critical fonts via `<link rel="preload">`

## Requirements

- WordPress 6.7+ (theme.json v3), PHP 8.0+, no page builder dependency
- `assets/css/` and `assets/js/` ship minified: the deploy strips comments and whitespace from them (`plugins/sgs-blocks/scripts/deploy_minify.py`), so comment freely; the root `style.css` ships as written.
- `assets/js/sgs-overlay-scroll.js` (Spec 32 FR-32-26) reads every scroller before it writes and repaints all of them in one frame; keep that order when changing it, because a read after a write per scroller forced a full style pass each (28 on a shop page).
- WooCommerce is **optional** (Spec 27 Part 3): the theme functions fully without it; when it is active the theme registers `add_theme_support('woocommerce')` and loads the `sgs-*` parts, `woocommerce.css` and `sgs-shop-filters.js`.

## Key Rules

- All templates use block markup only, no PHP template tags.
- `functions.php` stays minimal: enqueuing, theme support, pattern registration.
- Per-client CSS goes in the snapshot's `styles.css` or `sites/<client>/theme-overrides.css`, never in `style.css` (it would ship to every client).
- Test that the theme activates cleanly and core WP blocks render correctly before moving on.

## Gotchas

- **Bump the `style.css` Version on any pattern file added or renamed, and on any `style.css` or `assets/css/*.css` change.** WordPress caches the pattern-file list against the theme version (a new `.php` in `patterns/` will not appear in the editor on cached installs), and the Hostinger CDN caches `style.css` on the `?ver=` query string (a CSS deploy without a bump serves the stale edge copy, so computed-style probes appear to confirm a correct rule while the browser loads the old file). Verify the served `?ver` after deploy; theme CSS busts off `style.css` Version, not `block.json`.
- **No global `.btn` / `.btn-primary` exists in the theme.** Button-like styles are scoped to `.sgs-product-card`. A new component needing a button uses `sgs/button` block tokens or its own scoped selector.
