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
├── templates/                # Block templates (index, page, single, archive, 404, search, front-page)
├── parts/                    # Template parts (header, footer, sidebar, minimal variants)
├── patterns/                 # Block patterns (hero, trust-bar, cta, footer layouts)
├── styles/                   # Style variations — one JSON per client site
├── assets/
│   ├── css/
│   │   ├── core-blocks.css   # Overrides for WP core blocks
│   │   └── utilities.css     # .sr-only, .container, .text-centre, etc.
│   ├── js/                   # scroll-to-top, sticky-header, smooth-scroll
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
- No WooCommerce dependency
- No page builder dependency

## Browser Support

Chrome/Edge 90+, Firefox 90+, Safari 15+, iOS Safari 15+, Samsung Internet 18+. No IE11.

## Build Phase

Phase 1a (theme foundation) is **complete**. Theme version 1.2.1, deployed and functional on palestine-lives.org.

**Phase 2 theme priorities (from master feature audit):**
- `prefers-contrast` high-contrast support (P1, S-tier differentiator — first WP theme to support this)
- `text-wrap: balance` on headings (P1, CSS-only, zero effort)
- Dark mode toggle + `light-dark()` colour palette (P2)
- `content-visibility: auto` on below-fold sections (P2, performance)
- Block patterns library — hero, feature, testimonial, CTA, content, footer, header patterns (P2)

See `docs/plans/2026-02-21-master-feature-audit.md` for the full graded roadmap.

## Deploy

```bash
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/

# Clear LiteSpeed cache (wp litespeed-purge is broken on this host)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# Reset PHP OPcache after deploying PHP files (CLI reset is a SEPARATE pool — must use HTTP)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

Run from the repo root (`small-giants-wp/`).

## Key Rules

- All templates use block markup only — no PHP template tags
- All styles flow from theme.json tokens — no hardcoded colours/fonts
- `functions.php` stays minimal — enqueuing, theme support, pattern registration
- Style variation-specific CSS goes in `functions.php` via `wp_add_inline_style()`, gated on the active variation — never in `style.css`
- Test that theme activates cleanly and core WP blocks render correctly before moving on
