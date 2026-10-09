---
doc_type: spec
spec_id: 1
spec_version: 1.6.0
project: small-giants-wp
title: SGS Theme
status: shipped
last_verified: 2026-10-09
---

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
| Mega menus | `sgs/nav-bar-menu` + mega panels (Spec 36) |
| Scroll to top | Lightweight JS module (< 1KB) |
| Custom fonts | `theme.json` font face declarations (local hosting, no Google Fonts CDN) |
| White label | Not needed (we own the theme) |
| Blog layouts | Block patterns for archive/single templates |
| WooCommerce integration | Full WC block-theme layer via `add_theme_support('woocommerce')` + custom templates/parts (Spec 30) |

---

## File Structure

Directory-level map of `theme/sgs-theme/` (the files themselves: `git ls-files theme/sgs-theme`).

| Path | Purpose |
|---|---|
| `style.css` | Theme metadata header required by WordPress (`Requires at least`, `Requires PHP`, `Version:`) |
| `theme.json` | Design tokens, settings, styles (the framework default; per-client values come from snapshots) |
| `functions.php` | Minimal: enqueue assets, register patterns, theme support |
| `inc/` | PHP includes (colour helpers, core block styles, font preloading, shop filter and toolbar settings) |
| `assets/css/` | Stylesheets: core-block overrides, critical-path subset, dark mode, `type-scale.css` (per-device font-size ladder), utilities, `woocommerce.css` (Spec 30) |
| `assets/js/` | Vanilla JS: dark-mode toggle, nav accessibility, smooth scroll, viewport width, shop filter scripts (Spec 30) |
| `assets/fonts/` | Self-hosted font files (WOFF2) |
| `templates/` | Block templates (index, front-page, home, page, single, archive, 404, search, and the WooCommerce templates of Spec 30) |
| `parts/` | Template parts: `header.html` (a one-line `wp:pattern` reference to `framework-header-default`, search-free; hosts `sgs/site-header` and `sgs/nav-bar-menu`), `footer.html` (hosts `sgs/site-footer`), and the WooCommerce parts of Spec 30 |
| `patterns/` | Block patterns by category: content, footers, headers (`sgs-headers`), drawers, mega panels. List: `git ls-files theme/sgs-theme/patterns` or the framework DB |
| `styles/` | Empty by design: per-client snapshots live at `sites/<client>/theme-snapshot.json` (see §Per-site theme.json Model) |

`templates/home.html` (the blog posts index, the page assigned as `page_for_posts`) carries a LITERAL "Blogs" `sgs/heading` as its h1, not `core/query-title`: `query-title type="archive"` returns empty on a posts index, because core gates it on `is_archive()` and a posts page is `is_home()`. Header and footer content is specified in §Header/Footer/Nav Block System below; Spec 37 owns the block FRs.

---

## theme.json Structure

### Design Tokens (Settings)

There are no WP style variations: per-client palette and typography overrides live at `sites/<client>/theme-snapshot.json` and are pushed to each live site's `theme.json` via `push-theme-snapshot.py`. The framework `theme.json` is the SGS default only. Requires **WordPress 7.0+** for native pseudo-element support in `styles.elements.button` and the AI Connectors API.

The authoritative token set is `theme/sgs-theme/theme.json` (read it; never cache a copy here). Shape rules that hold: `version` 3; `defaultPalette`, `defaultGradients` and `defaultFontSizes` false; `color.custom`, `customGradient`, `customDuotone` and `spacing.customSpacingSize` true so controls accept raw values; the numeric spacing slug ladder `10` to `80`; per-client values come from `sites/<client>/theme-snapshot.json`.

### Type scale

The preset list is not reproduced here; a copy of a generated ladder rots. Presets and per-device sizes: `theme/sgs-theme/theme.json` `settings.typography.fontSizes` and `theme/sgs-theme/assets/css/type-scale.css`. Per-client display tiers: Spec 33.

**Binding decision: no fluid typography.** Font sizes are explicit per device via the SGS tier system (`plugins/sgs-blocks/includes/helpers-responsive.php`: base rule, `@media (max-width:1023px)` tablet, `@media (max-width:767px)` mobile), never WordPress's `clamp()` interpolation. `clamp()` on `vw` units can fail WCAG 1.4.4 (resize text to 200 %) because viewport units do not respond to browser zoom.

**Ladder shape.** There is no `x-small` (12, zero uses), `medium` (18, too close to 16 to be a distinguishable choice) or `display` (120, a single use). One use is a reason to write an explicit value, not to carry a permanent row in every client's font-size picker, so `templates/404.html` carries `{"desktop":120,"tablet":80,"mobile":56}` on the block itself (the mechanism for one-off responsive values). Reading sizes never shrink across devices; only the top three presets compress, and the ratio widens with size.

A preset moved off fluid needs a media-query override in the same change, or it silently stops being responsive: a preset with `fluid: false` and no override renders flat at its desktop size at every width.

**Mechanism: `theme/sgs-theme/assets/css/type-scale.css`.** A theme.json preset holds ONE value; WordPress has no per-breakpoint preset. The three display presets' generated custom properties are redefined inside `@media`. The selector is `:root:root` (0,2,0) so it wins on specificity, not enqueue order. It is loaded via `add_editor_style()` too, or the canvas would show desktop sizes at every width while the published page shrank them.

WordPress still lists three extra entries (`normal`, `huge`, a fluid `medium`) in the editor font-size picker even though `settings.typography.defaultFontSizes` is false; nothing in the framework references them and nothing renders wrong (Bean accepted this). Our own slugs mask the same-named core defaults, which is why only three show; naming the 16px rung `regular` rather than `medium` leaves one more visible than `medium` would have, a deliberate trade against the CSS-keyword risk below.

**Rationale for the reading floor:** 16px is both the WCAG-comfortable body size and the iOS Safari form-input auto-zoom threshold, and the framework ships form blocks.

The base body size is routed through a **non-fluid preset** rather than a px literal: WordPress rewrites a px literal into `clamp(14px, …, 16px)`, which violates FR-33-4 ("never recomputed via WP's fluid formula").

**Decisions in force:**
1. **The 16px slug is `regular`** (Bean's pick). Chosen over `medium` because `medium`/`small`/`large`/`x-large` are all real CSS font-size keywords that resolve to a browser keyword if a slug leaks the length sanitiser; a live near-miss occurred in `plugins/sgs-blocks/includes/helpers-typography.php`.
2. **There is no `medium` preset.** `sgs/heading` + `medium` maps to `large` (a sub-heading stays above body size); `sgs/text` and `sgs/business-info` map to `regular`. A dangling preset reference (theme.json's own `styles.elements` h5 and button included) resolves to an undefined custom property and the declaration is dropped SILENTLY.
3. **Footer copy is body size.** `copyright` and `attribution` KEEP `small`: fine print at 14px is convention, and Bean's objection was to readable footer CONTENT being shrunk, not the legal line.

**Slugs are the permanent interface; the pixel values are per-client and already swappable** via `sites/<client>/theme-snapshot.json`. Adding a slug is safe; renaming or removing one is a migration across every pattern declaration AND every shipped client's `post_content`. The framework is pre-production, which is the only reason removal is cheap right now.

---

## Templates

### Header Template Part (`parts/header.html`)

Standard header with:
- Site logo (left)
- Navigation menu (centre or right, configurable via block settings)
- CTA button (right, accent colour)
- Sticky and scroll behaviour modes (static, sticky, transparent, transparent-sticky, smart-reveal, shrink, hidden) — see Spec 37 for the full mode reference
- Mobile: hamburger menu with slide-out drawer (`sgs/nav-drawer`)
- Announcement bar slot above header (optional, toggled via customiser or block)
- The header content is composed of `sgs/site-header` (3 named rows: top utility / middle primary / bottom message) + `sgs/nav-bar-menu` inside it — see §Header/Footer/Nav Block System.

### Footer Template Part (`parts/footer.html`)

Standard footer with:
- 3-4 column layout (configurable via pattern)
- Company info, nav links, contact details, social icons
- Copyright line with dynamic year
- WhatsApp floating button (optional, configured per site)
- The footer content is composed of `sgs/site-footer` (named rows + up-to-N columns) — see §Header/Footer/Nav Block System.

---

## Header/Footer/Nav Block System

> Block-level FRs, block roster detail, structure/row model, and per-breakpoint override mechanics are **owned by [Spec 37 — Header/Footer Builder](37-HEADER-FOOTER-BUILDER.md)**; the drawer a11y contract is owned by **Spec 36** (Navigation System). This section documents only the THEME's responsibilities: what lives in the template parts, and what the theme provides as shared defaults.

### Architecture — template parts, not a monolithic header block

The theme provides the header/footer as WordPress **template parts** (`parts/header.html` / `parts/footer.html`, the `sgs_header`/`sgs_footer` CPT + rules engine, Spec 37). Inside those parts, specialised **container blocks** (modelled on `sgs/card-grid`/`sgs/feature-grid`, not a header-replaces-FSE block) replace the plain `core/group` wrapper:

| Block | Role | Renders via |
|---|---|---|
| `sgs/site-header` | Header shell — 3 optional named rows (top utility / middle primary / bottom message) | `SGS_Container_Wrapper` (KIND: section) |
| `sgs/site-footer` | Footer shell — named rows + up-to-N columns | `SGS_Container_Wrapper` (KIND: section) |
| `sgs/nav-bar-menu` | One nav-bar↔burger menu, 4-tier breakpoint | block-private root (not `SGS_Container_Wrapper`) + nav logic |
| `sgs/nav-drawer` | Off-canvas drawer | own render.php |

A block that *subsumes* the template-part/Site-Info/rules system remains forbidden, as do bare `header`/`footer`/`nav` block slugs; only the specialised containers `src/blocks/{site-header,site-footer,nav-bar-menu,nav-drawer-menu,nav-drawer}/` are permitted.

### Theme-owned defaults — global styles + Site Info

Every element in `sgs/site-header`, `sgs/site-footer`, and `sgs/nav-bar-menu`/`sgs/nav-drawer-menu` defaults from two theme-owned sources, so branding/contact data is entered once and stays consistent across header AND footer:

1. **Global style tokens** — the framework `theme/sgs-theme/theme.json` settings and, for cloned sites, the Spec 33 draft-extracted `sites/<client>/theme-snapshot.json`. Colours, typography, and spacing flow to header/footer elements as defaults; per-instance overrides remain available in the block inspector.
2. **SGS Site Info store** (Spec 36, `sgs_site_info` `wp_options` via the `sgs/site-info` block-bindings source) — logo, phone, email, address, hours, socials, copyright, attribution link. Both header and footer bind to the same store.

### Responsive model (never-overflow) + the drawer a11y contract

The header/footer never overflow at any width down to 320px by construction — a Cluster layout (`flex-wrap` + `min-width:0` + fluid `clamp()` spacing) plus a per-breakpoint override model (768/1024 + a custom-px 4th tier, shared source per R-31-1) rather than per-element overflow hacks. The off-canvas drawer is the a11y benchmark (focus trap, ESC-to-close, backdrop dismiss, body-scroll-lock). Full mechanics: Spec 37 (never-overflow layout) + Spec 36 (drawer a11y).

## WooCommerce Layer (Spec 30)

The theme provides a full WC block-theme layer declared via `add_theme_support('woocommerce')` in `functions.php`. It is a first-class framework feature.

### WC theme support declarations (`functions.php`)

```php
add_theme_support( 'woocommerce' );
add_theme_support( 'wc-product-gallery-zoom' );
add_theme_support( 'wc-product-gallery-lightbox' );
add_theme_support( 'wc-product-gallery-slider' );
```

### WC template override priority

`archive-product.html` and `single-product.html` are registered as theme templates. WordPress's `get_block_template()` returns the theme source, so the theme overrides WC's injected defaults.

**Note:** WC 10 ships with `woocommerce_coming_soon=yes` by default, which masks all store pages behind a Coming Soon template. This must be set to `no` at go-live (tracked in FR-30-13 go-live checklist).

### WC template parts

| Part | Purpose |
|------|---------|
| `sgs-archive-toolbar.html` | Shop archive: `sgs/product-search` + `sgs/filter-search` chips toolbar |
| `sgs-pdp-buybox.html` | PDP option pickers → cart bridge (`sgs/buybox`); variation manifest; add-to-cart |
| `sgs-pdp-content.html` | PDP description, `sgs/tabs` (Description/Ingredients/Nutritional/Allergens), collapsible SEO copy (`sgs/collapsible-text`) |

### WC assets

| Asset | Purpose |
|-------|---------|
| `assets/css/woocommerce.css` | WC block theme styles: shop grid equal-height cards, `.sgs-shop-layout`-scoped baseline CTA alignment (`margin-top: auto`), mini-cart drawer width custom-prop, cart/checkout brand pass, PDP band layout |
| `assets/js/sgs-shop-filters.js` | Accessible mobile filter drawer — toggle with `aria-expanded`, focus-trap, primary-button token for the "Filter" trigger |

### `sgs/collapsible-text` block

Operator SEO copy with accessible read-more. Full text is always server-side-rendered (CSS `line-clamp`, not `display:none`) so search crawlers see the full copy. Empty content renders nothing. Labels (`data-read-more` / `data-read-less`) are i18n'd via server-emitted data attributes. Lives in `plugins/sgs-blocks` but is documented here because its primary use site is `sgs-pdp-content.html`.

### Compatibility check

There is no WooCommerce version-band runtime self-check and no dependency manifest. The framework is pre-production, so no live client site needs protecting from an unexpected WooCommerce upgrade; review happens before each deploy.

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

### Mega panel starter patterns (Post Types: `sgs_mega_menu`)

Starter patterns for the `sgs_mega_menu` CPT (Spec 36) are the `theme/sgs-theme/patterns/mega-*.php` files (`git ls-files theme/sgs-theme/patterns`).

### Typography helper (`plugins/sgs-blocks/includes/helpers-typography.php`)

The `sgs_typography_css_rule()` PHP helper (auto-loaded via `render-helpers.php`) and the shared `TypographyControls` JS component (`src/components/TypographyControls.js`) define the canonical SGS typography control pattern: responsive RangeControl + unit dropdown for font size; weight/style dropdowns; line-height. Both are block-plugin concerns, but the token contract (font-size slugs, weight values) is defined by `theme.json` tokens set in `theme/sgs-theme/theme.json`. Any new block **must** use `TypographyControls` rather than freeform controls (documented in `plugins/sgs-blocks/CLAUDE.md`).

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
- **Intersection Observer** for scroll-triggered animations (no heavy animation libraries **at Tier V — the default tier for all motion. Tier G (GSAP) is the bounded exception for effects vanilla/CSS genuinely cannot reach, Tier H is a CLOSED list of single-purpose helpers (currently Lenis alone, for site-level smooth scrolling), and Tier W is WebGL (Spec 38 §1). All npm-bundled, conditionally loaded, zero bytes when unused**)
- **< 5KB total JS** for a typical page without interactive blocks

### Images
- **WebP/AVIF** via WordPress native image handling (6.1+)
- **Lazy loading** via native `loading="lazy"` (WordPress adds this automatically)
- **Explicit width/height** on all images to prevent CLS
- **SVG support** (BUILT, in the blocks plugin: `plugins/sgs-blocks/includes/svg-upload.php`) — SVG uploads for any
  user who can upload files, sanitised on both upload and sideload (`sgs_svg_upload_sanitise`: allowlisted elements,
  no scripts or event handlers, no outside `href` or `url()`, the SVG's mixed-case attribute names kept)

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

- WordPress 6.7+ (theme.json v3) and PHP 8.0+, as declared in `theme/sgs-theme/style.css` (`Requires at least` / `Requires PHP`)
- WooCommerce 9.9+ — **required** for shop/PDP templates (Spec 30). There is no runtime version-check or admin notice (see "Compatibility check" above). Verify the WC version manually (`wp plugin get woocommerce --field=version`) before a build touches shop/PDP templates. The theme still activates cleanly on non-WC installs — WC template parts simply go unused.
- No page builder plugin dependency

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

## Per-site theme.json Model

Each site has ONE `theme.json`. The local repo holds per-client snapshots in `sites/<client>/theme-snapshot.json` that are pushed to specific sites via a CLI. There is no WP style-variation overlay system: the Browse Styles UI would show every client's variation to every site's admin (a privacy leak), so `theme/sgs-theme/styles/` is **empty** and framework deploys contain zero client-specific variation files.

**Untouched by this model:**
- `theme/sgs-theme/parts/header.html` + `footer.html` — brand-agnostic template parts
- All header/footer patterns — brand-agnostic starting templates
- Block-level variations (`register_block_variation()`) — e.g. sgs/button primary/secondary/outline
- Template part seeder, resetter, meta, header rules, footer rules, behaviours, sgs_header/sgs_footer CPTs

### Local snapshot workflow

Per-client visual snapshots live at `sites/<client>/theme-snapshot.json` (per-site dir, stays in the local repo):

- one full `theme.json` copy per client, e.g. `sites/<client>/theme-snapshot.json`

Snapshot format: **full `theme.json` copy** (not a diff). File is ~5–20 KB; simplicity of a 1:1 overwrite outweighs bandwidth savings of a diff.

### Push-theme-snapshot CLI

Spec 19 §7 documents `plugins/sgs-blocks/scripts/push-theme-snapshot.py`.

### Live-style precedence (see Spec 26 for the canonical mental model)

> **Framing note:** [Spec 26](26-SGS-GLOBAL-STYLES-AND-THEMING.md) owns the conceptual model — a data-layer merge: `wp_global_styles` is where a site's live styles live and `theme.json` is the factory-default seed, not a thing being overridden. The operational facts below (the post wins wherever both define a property) are the day-to-day guidance.

WordPress compiles the page's `global-styles-inline-css` by merging the `wp_global_styles` post (the Site-Editor USER layer) **on top of** `theme.json`. Wherever both define a property, **the post wins**. Consequence: a change written ONLY to `theme.json` on disk, including a `push-theme-snapshot.py` push, has **no live effect** for any property the post also defines. It is not a conflict, it is a deterministic override.

**To change live per-client styles, update BOTH:**
1. `sites/<client>/theme-snapshot.json` (`styles.css` field) — the version-controlled source of truth, AND
2. the live `wp_global_styles` post via REST: `POST /wp-json/wp/v2/global-styles/<id>` (app-password Basic auth).
Then bump `theme/sgs-theme/style.css` `Version:` to bust WP's compiled-styles cache.

### theme.json raw custom values + overridable defaults

`settings.color.custom` / `customGradient` / `customDuotone` and `settings.spacing.customSpacingSize` are `true`, and `settings.spacing.units` covers `px / em / rem / % / vw / vh`. This lets every block colour/spacing control accept **raw** values (hex, raw px), not only token presets — fixing the recurring "control rejected raw px" class. Framework default colour pairings are WCAG-safe; every framework default colour/spacing is an **overridable CSS custom property** (`property: var(--sgs-x, <default>)`) the editor controls can set per-instance.

### Hide Browse-styles UI

The WP Browse-styles picker is hidden unless `apply_filters( 'sgs_show_browse_styles', false )` returns true (`theme/sgs-theme/functions.php`), so the picker does not confuse operators on single-stylesheet installs.

### WP 7.0 button preset alignment

WP 7.0 adds native pseudo-element support for `core/button` at theme.json level: `styles.elements.button:hover`, `:focus`, `:focus-visible`, `:active`. The Customiser panel `sgs_button_presets` (`plugins/sgs-blocks/includes/class-button-presets-customiser.php`) edits the three `sgs/button` presets' roles and stores them in the `wp_global_styles` user layer (`settings.custom.buttonPresets`). Spec 11 owns the button architecture.
