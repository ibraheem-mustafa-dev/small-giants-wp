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

Use the tar method from the framework CLAUDE.md — `scp -r` creates nested directories on Hostinger.

```bash
# Build first
npm run build

# Deploy via tar (from repo root — see framework CLAUDE.md for full sequence)
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 "WP=domains/palestine-lives.org/public_html/wp-content && rm -rf \$WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv plugins/sgs-blocks \$WP/plugins/ && rm -rf plugins sgs-deploy.tar"
rm sgs-deploy.tar

# Then clear caches — see framework CLAUDE.md for OPcache + LiteSpeed commands
```

## Block Build Status

### Content/Layout Blocks (24 built)

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
| Pricing Table | Built (L14, needs build + deploy) |
| Modal | Built (L14, needs build + deploy) |
| Decorative Image | Built (L14, needs build + deploy) |
| Mega Menu | Built (L3, needs build + deploy) |

### Form Blocks (12 built)

| Block | Status |
|---|---|
| Form | Deployed |
| Form Step | Deployed |
| Form Review | Deployed |
| Form Field: Text, Email, Phone, Textarea, Checkbox, Radio, Select, Tiles, File, Consent | Deployed |

### Extensions (4 built)

| Extension | Status |
|---|---|
| Animation (15 scroll animation types) | Deployed |
| Responsive Visibility (device show/hide) | Deployed |
| Hover State Controls (bg/text/border colour) | Deployed (4 blocks: Info Box, Card Grid, CTA Section, Hero) |
| Off-Canvas Mobile Nav (M17) | Built (needs build + deploy) |

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
- **Empty innerHTML → null-save deprecation** — blocks inserted via WP-CLI often have empty `innerHTML` (no serialised HTML). If `save.js` later returns actual HTML, you get "unexpected content" validation errors. Fix: add `deprecated.js` v1 with `save: () => null`. If attribute field names also changed (e.g. `heading` → `title`, `certifications[]` strings → `items[]` objects), add a `migrate()` that transforms them. See `src/blocks/process-steps/deprecated.js` for the full pattern.
- **Core block attribute mismatches** — when `core/heading`, `core/button`, etc. show "unexpected content", the cause is a JSON attribute that doesn't match stored HTML. Fix via WP-CLI: SCP a PHP script that uses `preg_match_all()` to extract the raw block comment, identify the diverging value, then `str_replace()` the attribute in `post_content` and save with `wp_update_post()`. Always extract first — never guess.
- **`style.css` vs `editor.css` are independent** — `style.css` compiles to the frontend-only `style-index.css`. `editor.css` compiles to the editor-only `index.css`. A layout fix in one does not affect the other. When fixing a visual issue in `style.css`, add matching rules to `editor.css` separately if the editor preview should match.
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
