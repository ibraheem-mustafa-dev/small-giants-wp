# SGS Blocks — Claude Code Instructions

## What This Is

A custom Gutenberg block library (WordPress plugin) that replaces Spectra Pro. Produces clean semantic markup that reads design tokens from the SGS Theme. See build status below for what's built vs. planned.

Full spec: `specs/02-SGS-BLOCKS.md` (blocks) + `specs/04-SGS-FORMS.md` (forms)

## Plugin Structure

```
sgs-blocks/
├── sgs-blocks.php               # Plugin bootstrap
├── package.json                  # @wordpress/scripts + dependencies
├── webpack.config.js             # Build config
├── src/
│   ├── blocks/                   # One folder per block (block.json, edit.js, save.js, style.css, view.js)
│   ├── components/               # Shared editor components (ResponsiveControl, DesignTokenPicker, etc.)
│   ├── extensions/               # Block extensions (animation, visibility, spacing)
│   └── utils/                    # Token reader, responsive helpers
├── build/                        # Compiled output (deploy this, not src/)
└── includes/
    ├── class-sgs-blocks.php      # Main plugin class
    ├── block-categories.php      # Register SGS block categories
    ├── device-visibility.php     # Server-side render_block filter for responsive visibility
    ├── heading-anchors.php       # Auto-generates heading IDs for Table of Contents
    ├── lucide-icons.php          # Auto-generated Lucide icon library (1963 lines, exempt from limit)
    ├── render-helpers.php        # Shared colour/font-size helper functions
    ├── review-schema.php         # Schema.org review/rating output
    └── forms/                    # Form processing engine (REST API, DB, submissions)
```

## Block Pattern (Every Block Follows This)

```
block-name/
├── block.json       # Metadata, attributes, supports, scripts, styles
├── edit.js          # Editor component
├── save.js          # Static save (or null for dynamic blocks)
├── render.php       # Server-side render (dynamic blocks only)
├── editor.css       # Editor-only styles
├── style.css        # Frontend + editor styles
├── view.js          # Frontend interactivity (viewScriptModule)
└── index.js         # Block registration
```

## Block Categories

- `sgs-layout` — Container, Hero
- `sgs-content` — Info Box, Counter, Trust Bar, Heritage Strip, Card Grid, Testimonial, etc.
- `sgs-interactive` — Accordion, Testimonial Slider, WhatsApp CTA
- `sgs-forms` — Form, Form Step, Form Fields, Form Review

## Build Commands

```bash
npm run build         # Production (includes --experimental-modules for viewScriptModule)
npm run start         # Dev with hot reload
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
```

The `--experimental-modules` flag is required for `viewScriptModule` in block.json. Check if stabilised in the installed @wordpress/scripts version.

The `--webpack-copy-php` flag copies `render.php` to `build/` automatically — dynamic blocks won't render without this.

## Deploy

```bash
# Build first
npm run build

# Deploy plugin files (run from repo root)
scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/

# Clear LiteSpeed cache (wp litespeed-purge is broken on this host)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# Reset PHP OPcache after deploying PHP files (CLI reset is a SEPARATE pool — must use HTTP)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

## Block Build Status

### Content/Layout Blocks (20 built)

| Block | Status |
|---|---|
| Container | Deployed |
| Hero | Deployed |
| Info Box | Deployed |
| Counter | Deployed |
| Trust Bar | Deployed |
| Icon List | Deployed |
| Card Grid | Deployed |
| CTA Section | Deployed |
| Process Steps | Deployed |
| Testimonial | Deployed |
| Testimonial Slider | Deployed |
| Heritage Strip | Deployed |
| Brand Strip | Deployed |
| Certification Bar | Deployed |
| Notice Banner | Deployed |
| WhatsApp CTA | Deployed |
| Accordion + Accordion Item | Deployed |
| Table of Contents | Deployed (broken — needs debugging) |

### Form Blocks (12 built)

| Block | Status |
|---|---|
| Form | Deployed |
| Form Step | Deployed |
| Form Review | Deployed |
| Form Field: Text, Email, Phone, Textarea, Checkbox, Radio, Select, Tiles, File, Consent | Deployed |

### Extensions (3 built)

| Extension | Status |
|---|---|
| Animation (15 scroll animation types) | Deployed |
| Responsive Visibility (device show/hide) | Deployed |
| Hover State Controls (bg/text/border colour) | Deployed (4 blocks: Info Box, Card Grid, CTA Section, Hero) |

### Phase 2 — Not Started (P1 priority)

| Block | Notes |
|---|---|
| Post Grid / Query Loop | Grid/list/masonry/carousel + AJAX pagination + category filtering |
| Image Gallery + Lightbox | Grid/masonry/carousel + Interactivity API lightbox |
| Tabs | Built — not yet deployed |
| Countdown Timer | Date-based + evergreen; flip/simple variants |
| Star Rating | SVG stars; Schema.org/Rating |
| Team Member | Photo/name/role/bio/socials; Schema.org/Person |

### Phase 2 — Extensions Not Started (P1 priority)

| Extension | Notes |
|---|---|
| Hover scale transform | `transform: scale()` on hover (GPU-composited) |
| Hover shadow elevation | Box-shadow transition on hover |
| Hover image zoom (inner) | `overflow:hidden` + scale on `<img>` |
| Transition duration/easing control | CSS transition shorthand per block |
| Block link (wrap entire block in link) | URL + target in inspector |

See `docs/plans/2026-02-21-master-feature-audit.md` for the full 354-feature graded roadmap.

Update this table as blocks are committed/deployed.

## Block Customisation Standard (MANDATORY)

Every block MUST provide per-element customisation matching Kadence/Spectra depth:

1. Native WordPress `supports` for wrapper-level controls (colour, typography, spacing, border)
2. Custom attributes + controls for each inner text element (colour, font size)
3. Custom attributes + controls for interactive elements like CTAs (text colour, background colour)
4. CSS fallback colours use `:not([style*="color"])` so custom values always win
5. Use Block Selectors API in `block.json` to target native typography to primary text element

### Hover Controls Spec (Phase 2)

Blocks with interactive hover states MUST expose these controls in the editor inspector:
- **Per-element colour shifts** — background, text, border colour on hover (DONE in Phase 1.3 for 4 blocks)
- **Scale transform** — `transform: scale()` on hover (GPU-composited, safe)
- **Shadow elevation** — box-shadow transition on hover
- **Image zoom (inner)** — `overflow:hidden` + scale on `<img>` on hover
- **Transition duration** — CSS transition-duration control (default 300ms)
- **Transition easing** — CSS transition-timing-function (ease, ease-in-out, etc.)

These are not just colour shifts. Kadence and Spectra offer transform and shadow controls — SGS must match or exceed.

## Utility Functions

Import from `../../utils`:

```js
import { colourVar, fontSizeVar, spacingVar, shadowVar, borderRadiusVar, transitionVar } from '../../utils';
```

| Function | Returns |
|---|---|
| `colourVar('primary')` | `var(--wp--preset--color--primary)` |
| `fontSizeVar('large')` | `var(--wp--preset--font-size--large)` |
| `spacingVar('40')` | `var(--wp--preset--spacing--40)` |
| `shadowVar('medium')` | `var(--wp--preset--shadow--medium)` |
| `borderRadiusVar('medium')` | `var(--wp--custom--border-radius--medium)` |
| `transitionVar('fast')` | `var(--wp--custom--transition--fast)` |

Use `DesignTokenPicker` component for colour selection from theme.json palette in the editor sidebar.

## Gotchas

- **Deprecations required** — when changing a static block's `save.js` output, you MUST add a deprecation. Otherwise existing posts show "This block contains unexpected content" errors.
- **`viewScriptModule` vs `viewScript`** — use `viewScriptModule` (ES modules, deferred). Don't use `viewScript` (classic scripts).
- **CSS `color` fallback pattern** — use `:not([style*="color"])` selectors so inline styles from the editor always win over CSS defaults.
- **`useInnerBlocksProps`** — always use this (not `InnerBlocks` component directly) for proper block editor integration.

## Forms (Built Into This Plugin)

Forms are NOT a separate plugin. The form blocks (`sgs/form`, `sgs/form-step`, `sgs/form-field-*`, `sgs/form-review`) and the form processing engine all live here.

- Core form blocks needed for Indus Foods: Phase 1b
- Advanced form features (conditional logic, address lookup, payment, GDPR hooks): Phase 2

Database table: `{prefix}sgs_form_submissions`
REST namespace: `sgs-forms/v1`
Notifications: N8N webhooks (not wp_mail)

## Key Rules

- Every block reads colours/fonts from theme.json tokens — never hardcode
- Frontend JS: vanilla only, no jQuery, no external libraries
- Use `viewScriptModule` (ES modules) for frontend interactivity
- CSS scroll-snap for carousels, Intersection Observer for animations
- Progressive enhancement: blocks must render meaningful content without JS
- All inner blocks use `useInnerBlocksProps` correctly
- All REST endpoints: nonces, capability checks, sanitised input, prepared statements
- Responsive: every layout block has mobile/tablet/desktop controls

## Build Phase

Phase 1 (core blocks + extensions) is **complete**. Phase 2 is now active — building the highest-impact missing blocks (Post Grid, Gallery, Tabs) and extending hover controls across all blocks. See the Block Build Status tables above for what's done and what's next.

## Deployment

Build locally (`npm run build`), deploy the `build/` directory + PHP files via SCP. No Node.js on the server.
