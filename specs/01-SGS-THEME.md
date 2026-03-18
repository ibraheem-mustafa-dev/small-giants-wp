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
│   │   ├── scroll-to-top.js     # Scroll-to-top module
│   │   ├── sticky-header.js     # Sticky header behaviour
│   │   └── smooth-scroll.js     # Smooth anchor scrolling
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
│   ├── header.html              # Site header (logo, nav, CTA button)
│   ├── header-minimal.html      # Minimal header (logo only, for landing pages)
│   ├── footer.html              # Site footer (columns, copyright, socials)
│   ├── footer-minimal.html      # Minimal footer (for landing pages)
│   └── sidebar.html             # Optional sidebar template part
│
├── patterns/
│   ├── hero-standard.php        # Standard hero with headline, sub, CTA
│   ├── hero-split.php           # Split hero (text left, image right)
│   ├── hero-video.php           # Hero with background video/SVG animation
│   ├── trust-bar.php            # Horizontal stats bar
│   ├── cta-section.php          # Call-to-action section
│   ├── footer-4-col.php         # 4-column footer layout
│   └── ...                      # More patterns added per project need
│
└── styles/
    ├── indus-foods.json         # Indus Foods colour/font overrides
    ├── dream-wedding.json       # Dream Wedding Pianist overrides
    ├── workwear-now.json        # Workwear Now overrides
    └── ...                      # One style variation per client site
```

---

## theme.json Structure

### Design Tokens (Settings)

> **Note:** Defaults are SGS branding. Clients override via style variations (e.g., Indus Foods uses teal #0a7ea8 + gold #d8ca50).

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

### Style Variations

Each client site gets a JSON file in `styles/` that overrides just the tokens:

```jsonc
// styles/indus-foods.json
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
- Sticky behaviour via `sticky-header.js` (adds `.is-scrolled` class for shrink/shadow effect)
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

1. **Style variation JSON** — colours, fonts, spacing overrides
2. **Font files** — add client-specific WOFF2 files to `assets/fonts/`
3. **Logo/favicon** — uploaded via WordPress customiser
4. **Header/footer patterns** — choose from available patterns or create site-specific ones
5. **Homepage template** — may use a site-specific template if the layout is unique

Everything else (block styles, responsive behaviour, performance optimisations, accessibility) is inherited from the framework.
