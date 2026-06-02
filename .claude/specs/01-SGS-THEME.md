# SGS Theme — Custom WordPress Block Theme

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
| WooCommerce integration | Not in scope (client uses own sales software) |

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
│   │   ├── core-blocks.css      # Style overrides for WordPress core blocks
│   │   └── utilities.css        # Utility classes (.sr-only, .container, etc.)
│   ├── js/
│   │   ├── back-to-top.js          # Back-to-top floating button
│   │   ├── customiser-preview.js   # Live preview for Customiser controls
│   │   ├── dark-mode.js            # Dark mode toggle + system preference
│   │   ├── header-behaviour.js     # Header scroll behaviour (sticky, shrink, smart-reveal)
│   │   ├── header-editor-panel.js  # Editor panel for per-page header overrides
│   │   ├── nav-accessibility.js    # Keyboard nav + ARIA management for menus
│   │   ├── reading-progress.js     # Reading progress bar
│   │   └── smooth-scroll.js        # Smooth anchor scrolling
│   ├── fonts/                   # Self-hosted font files (WOFF2)
│   └── svg/                     # Reusable SVG assets (icons, decorative elements)
│
├── templates/
│   ├── index.html               # Default fallback template
│   ├── front-page.html          # Homepage template
│   ├── page.html                # Standard page template
│   ├── single.html              # Single post template
│   ├── archive.html             # Archive/blog listing template
│   ├── 404.html                 # Not found template
│   └── search.html              # Search results template
│
├── parts/
│   ├── header.html                 # Consolidated site header (logo, nav, CTA, mode controls)
│   ├── footer.html                 # Site footer (columns, copyright, socials)
│   ├── footer-minimal.html         # Minimal footer (for landing pages)
│   ├── sidebar.html                # Optional sidebar template part
│   ├── mega-menu-about.html        # Mega-menu panel: About
│   ├── mega-menu-brands.html       # Mega-menu panel: Brands
│   ├── mega-menu-contact.html      # Mega-menu panel: Contact
│   ├── mega-menu-products.html     # Mega-menu panel: Products
│   ├── mega-menu-resources.html    # Mega-menu panel: Resources
│   ├── mega-menu-sectors.html      # Mega-menu panel: Sectors
│   └── mega-menu-services.html     # Mega-menu panel: Services
│
├── patterns/                       # 29 patterns total — categorised below
│   ├── about-image-left.php
│   ├── about-mission.php
│   ├── about-stats.php
│   ├── about-story.php
│   ├── contact-form.php
│   ├── contact-minimal.php
│   ├── cta-banner.php
│   ├── cta-centred.php
│   ├── faq-section.php
│   ├── footer-centred.php
│   ├── footer-columns.php
│   ├── footer-compact.php
│   ├── footer-informational.php
│   ├── footer-minimal.php
│   ├── footer-simple.php
│   ├── header-centred.php
│   ├── header-full.php
│   ├── header-minimal.php
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
│   └── testimonials-large.php
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
- Mobile: hamburger menu with slide-out drawer
- Announcement bar slot above header (optional, toggled via customiser or block)

### Footer Template Part (`parts/footer.html`)

Standard footer with:
- 3-4 column layout (configurable via pattern)
- Company info, nav links, contact details, social icons
- Copyright line with dynamic year
- WhatsApp floating button (optional, configured per site)

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

- WordPress 6.7+ (block theme features, theme.json v3)
- PHP 8.0+
- No WooCommerce dependency
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

**Critical (caught live on sandybrown).** WordPress compiles the page's `global-styles-inline-css` by merging the `wp_global_styles` post (the Site-Editor USER layer) **on top of** `theme.json`. Wherever both define a property, **the post wins**. On sandybrown the post is ID 7. Consequence: a change written ONLY to `theme.json` on disk — including a `push-theme-snapshot.py` push — has **no live effect** for any property the post also defines. (This corrects the "conflicts are rare" framing above: it is not a conflict, it is a deterministic override.)

**To change live per-client styles, update BOTH:**
1. `sites/<client>/theme-snapshot.json` (`styles.css` field) — the version-controlled source of truth, AND
2. the live `wp_global_styles` post via REST: `POST /wp-json/wp/v2/global-styles/<id>` (app-password Basic auth).
Then bump `theme/sgs-theme/style.css` `Version:` to bust WP's compiled-styles cache.

**Known gap:** `push-theme-snapshot.py` writes the disk file ONLY — it does NOT update the `wp_global_styles` post (parking `P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES`). Until fixed, snapshot pushes silently fail to change live styles.

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
