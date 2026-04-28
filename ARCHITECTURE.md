# Architecture — SGS WordPress Framework

> Last updated: 2026-04-28 | Status: Active Development (Phase 3.2 complete, hover variant gaps closed, Floating UI architecture decided)

## Overview

SGS is a standalone WordPress block theme and Gutenberg blocks plugin built by Small Giants Studio. It competes directly with Kadence, Spectra, and GenerateBlocks — every block must be fully configurable by non-technical clients through the block editor alone. The framework is client-agnostic; Indus Foods is the first client and acts as the proving ground, but every architectural decision must hold for any business type.

## Stack

| Layer | Technology | Notes |
|---|---|---|
| CMS | WordPress 6.9.1 | Block theme, no classic editor |
| Theme | `sgs-theme` (block theme) | theme.json v3, template parts, style variations per client |
| Blocks plugin | `sgs-blocks` | 57 blocks (26 content/layout + 14 form + 6 interactive + 4 utility + 7 extensions), dynamic (server-rendered). Block Defaults system (Phase 3.2) lets clients save current attribute values as defaults for new instances site-wide. |
| Block build | `@wordpress/scripts` | `--experimental-modules` flag required for `viewScriptModule` |
| Frontend JS | Interactivity API + vanilla ES modules | Interactivity API for stateful blocks; vanilla `viewScriptModule` for AJAX (Post Grid) |
| Icons | Lucide (1900+ icons) | Pre-generated to `lucide-icons.php` via `scripts/generate-icons.js` |
| Fonts | Inter variable (default) | Self-hosted WOFF2, no CDN. Montserrat + Source Sans 3 for Indus Foods |
| Hosting | Hostinger (`ssh hd`) | Shared hosting, LiteSpeed cache |
| Dev site | palestine-lives.org | All deploys go here |
| Test/client site | lightsalmon-tarsier-683012.hostingersite.com | READ ONLY — never modify |
| Notifications | N8N (72.62.212.169) | Webhooks only, no `wp_mail()` |
| Payments | Stripe | Booking + forms (Phase 2+) |

## Directory Structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json                  # Design tokens — all colour/spacing/typography vars
│   ├── style.css                   # Theme header ONLY (16 lines, no CSS rules)
│   ├── functions.php               # Enqueues, variation-specific CSS via wp_add_inline_style()
│   ├── styles/
│   │   └── indus-foods.json        # Client style variation — overrides theme.json tokens
│   ├── templates/                  # Full-page templates (index, page, single, etc.)
│   ├── inc/
│   │   └── class-business-details.php  # Settings > Business Details (phone, email, address, hours, socials)
│   ├── parts/
│   │   ├── header.html             # Single canonical header (top bar, nav, mobile drawer, CTA buttons)
│   │   └── footer.html             # Footer with sgs/business-info blocks (auto-populates from settings)
│   ├── assets/
│   │   ├── css/core-blocks.css     # Overrides for core WordPress blocks (nav, columns, etc.)
│   │   ├── fonts/                  # Self-hosted WOFF2 font files
│   │   ├── svg/                    # SVG assets
│   │   └── decorative-foods/       # Indus Foods decorative ingredient PNGs (version-controlled)
│   └── patterns/                   # Reusable block patterns
│
├── plugins/sgs-blocks/
│   ├── sgs-blocks.php              # Plugin entry, block registration, category registration
│   ├── includes/
│   │   ├── heading-anchors.php     # Auto-generates heading IDs for Table of Contents
│   │   ├── lucide-icons.php        # Auto-generated — 1963 lines, exempt from 300-line limit
│   │   └── render-helpers.php      # TODO: extract shared colour/font-size helpers here
│   ├── src/blocks/                 # Block source files (one folder per block)
│   │   ├── [block-name]/
│   │   │   ├── block.json          # Attributes, supports, selectors, file refs
│   │   │   ├── edit.js             # Block editor UI + InspectorControls
│   │   │   ├── render.php          # Server-side render (dynamic blocks)
│   │   │   ├── style.css           # Frontend + editor styles
│   │   │   ├── editor.css          # Editor-only styles
│   │   │   ├── view.js             # Frontend Interactivity API module (interactive blocks)
│   │   │   └── save.js             # Returns null (dynamic) or InnerBlocks.Content
│   │   └── extensions/             # Block editor extensions (animation, visibility, hover, spacing, CSS, defaults)
│   ├── build/                      # Compiled output — deployed to server
│   ├── scripts/
│   │   └── generate-icons.js       # Generates lucide-icons.php from lucide-react
│   └── package.json                # Build scripts: `npm run build`, `npm run start`
│
├── sites/
│   └── indus-foods/                # Client-specific content, mockups, research, notes
│       ├── CLAUDE.md               # Indus Foods-specific dev instructions
│       ├── outstanding-issues.md   # Master issue tracker (48 issues, all sections)
│       ├── vscode-session-prompt.md # Ordered fix checklist for next session
│       ├── assets/                 # Client logos, decorative images (also in theme/assets)
│       ├── mockups/                # HTML mockups, screenshots, reference designs
│       ├── notes/                  # Research docs, website analysis
│       └── content/                # Page content drafts
│
├── specs/                          # Framework spec documents (00–09)
├── CLAUDE.md                       # Root dev instructions (this file is law)
├── ARCHITECTURE.md                 # This file
└── CONVERSATION-HANDOFF.md         # Session-to-session context handoff
```

## Key Architectural Decisions

1. **Dynamic blocks only (server-rendered via render.php)** — All complex blocks use `render` in block.json pointing to render.php. `save()` returns `null` or `<InnerBlocks.Content />`. This avoids deprecation headaches and lets PHP control output. Static blocks are used only for simple wrappers.

2. **All block properties are attributes, never hard-coded CSS** — Every visual property (colour, spacing, font size, hover effect, image) is a block attribute with an editor control. CSS provides only the structural defaults. Client-specific overrides go through `indus-foods.json` style variation or `wp_add_inline_style()` gated on the active variation.

3. **Colour system: DesignTokenPicker + `:not([style*="color"])` guard** — Colours are set via `DesignTokenPicker` (returns a slug or hex). In render.php, slugs become `var(--wp--preset--color--{slug})`, raw hex values pass through. CSS fallbacks use `:not([style*="color"])` so any inline style set by the attribute always wins over the CSS rule. This pattern must be used in every block.

4. **Variation-specific CSS goes in functions.php, gated** — All Indus Foods CSS that can't be expressed via theme.json tokens lives in `functions.php` via `wp_add_inline_style()` gated on `get_theme_mod('active_theme_style') === 'indus-foods'`. Never in `style.css`. Other clients are unaffected.

5. **Client-specific images are version-controlled in theme/assets, not uploads** — Decorative images used via CSS pseudo-elements go in `theme/sgs-theme/assets/{client}/`. URLs are generated via `get_theme_file_uri()`, never hardcoded as `/wp-content/...` paths.

6. **`sgs/container` is the universal layout primitive** — Used for all multi-column and section layouts. Supports `layout` (stack/grid/flex), `columns`, `columnsTablet`, `columnsMobile`, `gap`, `backgroundImage`, `minHeight`, `htmlTag`. Nesting containers inside containers is the correct pattern for complex layouts. Do NOT add bespoke layout attributes to content blocks.

7. **Hover effects: universal extension + per-block variants** — The hover-effects extension at `src/blocks/extensions/hover-effects.js` registers 12 universal hover attributes available on every SGS block: 3 colour shifts (bg/text/border), 2 scale (preset + numeric), shadow elevation, image zoom, grayscale, **border-accent** (line slides in on hover, added 2026-04-28), **tilt-3d** (mouse-tracking 3D rotation, added 2026-04-28), transition duration, stagger delay, and 2 block-link attributes. These are universal — no per-block opt-in needed. Sensible defaults applied to all SGS blocks (scale 1.02, shadow medium, image zoom on, duration 250ms) with 26 blocks opted out (announcement-bar, breadcrumbs, all form-fields, container, mega-menu, etc). On top of universal hovers, named per-block variants exist for blocks that need bespoke behaviour: Info Box (lift/border-accent/glow), Card Grid (zoom/lift/**overlay-slide**), Gallery (zoom/lift/**overlay-slide**), SVG Background (pulse/float/wave), Brand Strip (greyscale). Total interactive options across the framework: **33/36 spec'd** (3 remaining gaps: parallax extension, scroll-progress already shipped, border-accent universal already shipped).

8. **WordPress Interactivity API for most frontend JS; Post Grid uses vanilla ES module** — No jQuery. Stateful interactive blocks (nav, slider, accordion, form steps) use `viewScriptModule` + `@wordpress/interactivity` store/state. Post Grid uses a vanilla ES module with `fetch()` for AJAX pagination — lighter weight, no state management needed. The `--experimental-modules` build flag is required for all `viewScriptModule` blocks.

9. **`sgs/container` responsive layout — three independent breakpoints** — `columns` (desktop), `columnsTablet` (768–1024px), `columnsMobile` (<768px) are independent. CSS media query classes (`.sgs-cols-tablet-{n}`) handle the breakpoint overrides. Clients set all three from the inspector panel.

10. **SGS competes with Kadence/Spectra — block editor controls are non-negotiable** — Every customisable property MUST be an inspector control. If a client needs to open code to change something, that feature is not done. WP-CLI is a developer tool only.

11. **Per-device visibility via block extension, not separate templates** — WordPress block themes have one template part per name; per-device template routing does not exist. The correct pattern (matching Kadence/GenerateBlocks) is a Visibility panel extension applied to ALL blocks via `editor.BlockEdit` + a PHP `render_block` filter to ensure classes survive on core dynamic blocks. Clients build three layout groups inside one `header.html`, hiding each non-applicable group per breakpoint. The extension lives in `plugins/sgs-blocks/src/blocks/extensions/responsive-visibility.js` — the existing `sgs/*` scope guard must be removed to cover core blocks.

12. **Animation extension uses WordPress filter API, not block styles** — Scroll animations are a block extension (`src/blocks/extensions/animation.js`) applied to all 57 SGS blocks + 4 core blocks (group, columns, cover, image) via `blocks.registerBlockType` + `editor.BlockEdit` HOC + `render_block` PHP filter. Four attributes per block: `sgsAnimation` (**16 types** as of 2026-04-28: fade-up/down/left/right/in, slide-up/down, zoom/scale-in/out, flip-left/right, rotate-in, blur-in, bounce-in, reveal-up), `sgsAnimationDelay`, `sgsAnimationDuration`, `sgsAnimationEasing` (6 curves). CSS initial states are gated behind `.sgs-js` class + `prefers-reduced-motion: no-preference`. The `render_block` PHP filter uses `WP_HTML_Tag_Processor` to inject `data-sgs-animation` on the root element. Frontend IntersectionObserver in `animation-observer.js` watches `[data-sgs-animation]` and adds `.sgs-animated`. Inner blocks (tab, accordion-item, form fields) are denylisted.

13. **Floating UI lives in the WordPress Customiser, not as blocks** — Back to Top, Reading Progress, and future floating chrome (cookie banner, chat widget) are configured at `Appearance → Customise → SGS Floating UI`. **Why Customiser, not a Settings admin page or blocks:** clients see changes (button position, colour, size, behaviour) update live in the preview as they drag sliders. A static admin page requires save-and-refresh. Blocks would render where placed in the post flow — wrong mental model for elements that float fixed-position regardless of placement. Settings stored as `theme_mod` (auto-scoped to active theme/style variation). Frontend output via `wp_footer` hook reading `get_theme_mod()`. Per-page override via post meta `_sgs_hide_floating_ui` (array of slugs to hide on a specific page). Existing `sgs/back-to-top` block is deprecated to a no-op (renders empty, editor shows deprecation notice pointing to Customiser) so legacy usage doesn't break.

14. **Block Defaults System (Phase 3.2) — Save current values as site-wide defaults** — The `Block_Defaults` class registers a REST endpoint at `/sgs-blocks/v1/defaults` (POST/DELETE) that lets users save the currently-configured attributes of any SGS block as the default for new instances. Storage: single `wp_options` row `sgs_block_defaults` (JSON keyed by block name). The `block-defaults.js` extension adds a "Save as Default" button to every SGS block's Advanced inspector panel. On editor boot, `Block_Defaults::inject_defaults_script()` outputs `window.sgsBlockDefaults` before the extensions bundle, and the JS extension's `blocks.registerBlockType` filter merges saved defaults into each block's attribute schema before any block is registered — so new insertions inherit them automatically without an extra REST roundtrip. Admin page at `Settings → SGS Block Defaults` lists all saved defaults with per-block "Reset" buttons. Permission: `edit_theme_options`. Mirrors Kadence's "Configurable Defaults" UX. Replaces the failed initial design that put block names in URL paths (WP REST routes can't contain forward slashes — block name now passes via request body).

15. **Palette tokens are mandatory for block colour defaults** — Every SGS block's default colour value must reference a palette token via either a slug (in block.json defaults) or `var(--wp--preset--color--X, #fallback)` pattern (in CSS/PHP). Bare hex defaults are forbidden because they don't switch when a client changes style variation. Brand colours (LinkedIn `#0A66C2`, Facebook, WhatsApp) are intentional exceptions documented as such. The palette includes `border-light` (`#E5E7EB`) and `error` (`#DC2626`) as canonical semantic slugs added 2026-04-28 to consolidate near-duplicate hex values previously used as bare fallbacks across form/google-reviews/whatsapp-cta CSS files.

13. **Logo switching uses `sgs/responsive-logo` block** — The core `site-logo` block only exposes one image. The correct approach is a custom `sgs/responsive-logo` block with two `MediaUpload` attributes (`desktopLogoId`, `mobileLogoId`). `render.php` uses `wp_get_attachment_image()` to output both images; CSS media queries show/hide the correct one per breakpoint. Stores attachment IDs (not URLs) so the block survives domain changes and CDN migrations.

## Block Inventory

### Layout blocks
| Block | Key capability |
|---|---|
| `sgs/container` | Universal layout wrapper — stack/grid/flex, 3-breakpoint responsive, nested containers |
| `sgs/hero` | Full-width hero with bg image, overlay, split image, badge array, two CTAs |

### Content blocks
| Block | Key capability |
|---|---|
| `sgs/info-box` | Icon + heading + description card with 3 hover effects, optional link wrapper |
| `sgs/card-grid` | Image grid with overlay/card variants, hover effects, responsive columns |
| `sgs/cta-section` | Headline + body + button array, full layout/colour control, per-button border controls |
| `sgs/testimonial-slider` | CSS scroll-snap carousel with autoplay, dots, arrows, star ratings. Split layout (60/40 grid with side image). |
| `sgs/testimonial` | Individual testimonial card (used inside testimonial-slider) |
| `sgs/brand-strip` | Infinite-scroll logo carousel, greyscale + hover reveal |
| `sgs/accordion` + `sgs/accordion-item` | FAQ accordion using native `<details>`, FAQ Schema, Interactivity API |
| `sgs/counter` | Animated number counter with IntersectionObserver |
| `sgs/heritage-strip` | Stats/heritage bar with icon + label + value |
| `sgs/trust-bar` | Trust badges strip |
| `sgs/certification-bar` | Certification logos strip |
| `sgs/icon-list` | Icon + text list items |
| `sgs/notice-banner` | Alert/notice bar |
| `sgs/process-steps` | Numbered process/steps block |
| `sgs/responsive-logo` | Two-image logo (desktop + mobile) with CSS media query switching |
| `sgs/table-of-contents` | Auto-generates ToC from headings, scroll spy (currently broken) |
| `sgs/whatsapp-cta` | Floating/inline WhatsApp CTA with Interactivity API |

### Utility blocks
| Block | Key capability |
|---|---|
| `sgs/business-info` | Dynamic block rendering business details from Settings > Business Details. 8 types: phone, email, address, hours, socials, copyright, description, map |

### Phase 2 (Complete — 2026-02-26)
| Block | Key capability |
|---|---|
| `sgs/post-grid` | Grid/list/masonry layouts, AJAX pagination + category filtering, vanilla ES module |
| `sgs/gallery` | Image gallery with grid/masonry layouts + Interactivity API lightbox |
| `sgs/tabs` | Horizontal/vertical tabs, InnerBlocks per tab, full ARIA (tablist/tab/tabpanel) |
| `sgs/countdown-timer` | Date-based + evergreen, flip/simple variants |
| `sgs/star-rating` | SVG stars, Schema.org/Rating |
| `sgs/team-member` | Photo/name/role/bio/socials, Schema.org/Person |

### Interactive blocks
| Block | Key capability |
|---|---|
| `sgs/mega-menu` | Desktop mega-menu with template part panels, Interactivity API triggers |
| `sgs/mobile-nav` | Popover API mobile drawer with accordion submenus, spring animation, swipe-to-close. Server-renders nav from header template part via `SGS_Mobile_Nav_Renderer`. 4 variants (overlay, slide-left, slide-right, bottom-sheet). |

### Form blocks (14 blocks)
| Block | Notes |
|---|---|
| `sgs/form` | Form container with multi-step support, REST API submission, DB storage |
| `sgs/form-step` | Individual form step |
| `sgs/form-field-*` | Text, email, phone, textarea, checkbox, radio, select, tiles, file, consent |
| `sgs/form-review` | Review step (show entered values before submit) |

## Data Flow

```
Client uses block editor
        │
        ▼
Block attributes saved in post content (HTML comment delimiters for dynamic blocks)
        │
        ▼
WordPress renders page → sgs-blocks render.php called per block
        │
        ▼
render.php extracts attributes → builds inline styles + BEM class names
        │
        ▼
get_block_wrapper_attributes() merges with native supports (colour, spacing, border)
        │
        ▼
HTML output served → block CSS (from style.css) applied
        │
        ▼
viewScriptModule loaded (Interactivity API) for interactive blocks
        │
        ▼
Client interacts (slider, accordion, form, nav) → Interactivity API store manages state
```

For forms specifically:
```
Form submission (Interactivity API) → REST endpoint (sgs_submit_form)
        │
        ▼
Server validates + sanitises input → stores in custom DB table
        │
        ▼
N8N webhook triggered → notification sent (email/Slack/WhatsApp)
```

## Current Development Focus

**Phase 3 — Extensions + Polish (largely complete) → Phase 4 Indus Foods build (next)**

### 2026-04-28 session deliverables

1. **Phase 3.2 Global Defaults System** — `Block_Defaults` class + REST endpoint + admin page + editor injection. Live on production.
2. **Hover variant gap closure** — added universal `border-accent` (line slides in on hover), `tilt-3d` (mouse-tracking 3D rotation), `sgsScrollProgress` CSS variable, `overlay-slide` named variant on Card Grid + Gallery. Total interactive options: 33/36 spec'd.
3. **Animation extension** — `bounce-in` and `reveal-up` added (was 14, now **16 types** — exceeds spec target of 15).
4. **Palette additions** — new `border-light` (#E5E7EB) and `error` (#DC2626) slugs in theme.json + all 7 style variations to consolidate previously-duplicated bare hex values.
5. **Floating UI architecture** decided — Back to Top + Reading Progress will be Customiser-controlled (`Appearance → Customise → SGS Floating UI`), not blocks. Live-preview controls. Reading Progress block files repurposed; Back to Top block deprecated to no-op.
6. **8 quality fixes** — form input box-sizing overflow, floating-label/placeholder overlap, Footer social icons style variation (matches lightsalmon reference), Google Reviews dummy fallback, Icon Block content-width + visible bg, Breadcrumbs contrast, populated all empty test page blocks, Pricing Table `toggleStyle` attribute (text/button).
7. **Address lookup research** — `getAddress.io` selected for future `sgs/form-field-address` block (£20/yr 7,500 lookups, 20/day free, UK PAF data).

### Lessons captured to memory

- **Parallel agents on shared files cause race conditions** — both `border-accent` and `tilt-3d` branches edited `hover-effects.js` + `hover-effects.php`; resulting orphan `}` on line 238 took the live site down. Sequentialise any branches that touch the same file.
- **Gemini Flash on Windows can't run shell commands** — `npm run build`, `git status` etc all fail with "File not found". Don't include build steps in Gemini Flash prompts — run those manually.
- **WP REST routes can't contain forward slashes in route parameters** — e.g. `/defaults/sgs/counter` won't match `/defaults/(?P<block>[a-z0-9\-\/]+)`. Pass dynamic IDs via request body instead.
- **Hostinger error logs live at `~/.logs/error_log_<domain>`**, not `wp-content/debug.log` (often stale).
- **Block colour defaults must reference palette tokens**, never bare hex — clients switch style variations and blocks need to follow.

### Next priorities

1. **Floating UI Customiser section** (in progress this session, Gemini Flash dispatched)
2. **Phase 4 Indus Foods homepage fixes** — biggest remaining track
3. **Phase 5.1 Conditional Visibility extension** — role/login/schedule conditions on Visibility extension
4. **Spec doc updates** — sync 02-SGS-BLOCKS.md with new state

The master feature audit (`docs/plans/2026-02-21-master-feature-audit.md`) tracks 354 features across the framework.

## Known Technical Debt

| Item | Severity | Notes |
|---|---|---|
| ~~Colour regex too narrow~~ | ~~High~~ | Fixed in Session 19 — colour var detection now handles `oklch`, `hsl`, and all CSS colour formats. |
| Colour/font-size helpers duplicated 4x | Medium | `info-box`, `hero`, `cta-section`, `testimonial-slider` all define the same closure. Extract to `includes/render-helpers.php`. |
| `navigation ref="4"` in header.html | High | DB post ID specific to dev site. Will render no nav on any other install. Remove `ref` attribute. |
| Table of Contents broken | Medium | Root cause unknown since session 12. Regex heading detection may miss nested blocks. |
| Accordion never browser-tested | Medium | Progressive enhancement also broken (`e.preventDefault()` at view.js:56 disables native `<details>`). |
| Forms never end-to-end tested | High | REST endpoints built, submission never verified. |
| ~~Testimonial slider ARIA incomplete~~ | ~~Medium~~ | Fixed in Session 10 — dots have `aria-controls`, slides have `role="group"` + `aria-roledescription="slide"`. |
| `lucide-react` unused devDependency | Low | Adds ~1MB to node_modules. Remove from package.json. |
| No `prestart` hook | Low | `npm start` on fresh clone won't have `lucide-icons.php`. |
| DesignTokenPicker hex vs slug | Medium | Untested — `ColorPalette` returns hex but `colourVar()` expects slug. May cause colour breakage. |
| Font preload duplication | Low | `functions.php` manually preloads Inter; WP 6.9 may also preload from theme.json `fontFace`. |
| `lucide-icons.php` no exemption comment | Low | 1,963 lines, exceeds 300-line limit. Add auto-generated exemption comment. |
| No `.gitattributes` file | Low | LF/CRLF warnings on every commit. Needs `* text=auto` and binary file rules. |

## External Dependencies

| Service | Purpose | Notes |
|---|---|---|
| Hostinger | Web hosting | Shared hosting, `ssh hd` alias configured |
| LiteSpeed Cache | Server-side caching | `rm -rf` cache directory after every deploy (WP-CLI command broken) |
| N8N (72.62.212.169) | Notifications | All form/booking notifications via webhook, not `wp_mail()` |
| Stripe | Payments | Booking + forms Phase 2+ |
| Google Calendar | Booking sync | Phase 5, not yet implemented |
| ACF Pro | Custom fields | Legacy — usage decreasing, no new usage |
| Rank Math Free | SEO | No plans to replace |
| Playwright v1.58.2 | Visual testing | Globally installed on dev machine, Chromium ready |

## Deployment

**Dev site (all changes go here):** `https://palestine-lives.org`
**Client test site (READ ONLY):** `https://lightsalmon-tarsier-683012.hostingersite.com`

```bash
# 1. Build blocks plugin
cd plugins/sgs-blocks && npm run build

# 2. Deploy via tar (scp -r creates nested dirs on Hostinger — always use tar)
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='plugins/sgs-blocks/src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'
rm sgs-deploy.tar

# 3. Reset OPcache + clear LiteSpeed (both page cache AND CSS optimiser)
ssh -p 65002 u945238940@141.136.39.73 "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh -p 65002 u945238940@141.136.39.73 "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php && rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/* ~/domains/palestine-lives.org/public_html/wp-content/litespeed/css/*.css"
```

Run all commands from `C:\Users\Bean\Projects\small-giants-wp` (repo root).

**Environment:** Windows 11, Git Bash, Node.js v22.18.0, no Node.js on server. Build locally, deploy compiled `build/` output only.

## Framework Maturity

The master feature audit at `docs/plans/2026-02-21-master-feature-audit.md` tracks 354 features across 13 domains (core blocks, extensions, theme, typography, hover/interactions, scroll animations, accessibility, performance, SEO/schema, forms, patterns, dark mode, S-tier differentiators). Current framework score: **98/294 (33%)**. Phase 2-3 target: **213/294 (72%)** — equivalent to Grade B, competitive with Kadence and GenerateBlocks. Full S-tier roadmap target: **266/294 (90%)** — Grade A, the most technically advanced WordPress block framework in existence.
