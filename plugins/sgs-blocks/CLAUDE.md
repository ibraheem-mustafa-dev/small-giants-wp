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
    └── render/                   # Server-side render callbacks for dynamic blocks
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
- `sgs-interactive` — Accordion, Tabs, Modal, Testimonial Slider

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

# Deploy plugin files
scp -r sgs-blocks.php includes build assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/

# Purge cache
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge all"
```

## Block Build Status

| Block | Status | Commit |
|---|---|---|
| Container | Deployed | bebb83a |
| Hero | Deployed | bebb83a |
| Info Box | Deployed | bebb83a |
| Counter | Deployed | 4eb695b |
| Trust Bar | Deployed | 4eb695b |
| Icon List | Deployed | 4eb695b |
| Card Grid | Deployed | 4eb695b |
| CTA Section | Deployed | 4eb695b |
| Process Steps | Deployed | 4eb695b |
| Testimonial | Local (uncommitted) | — |
| Testimonial Slider | Local (uncommitted) | — |
| Heritage Strip | Local (uncommitted) | — |
| Brand Strip | Local (uncommitted) | — |
| Certification Bar | Local (uncommitted) | — |
| Notice Banner | Local only | — |
| WhatsApp CTA | Local only | — |
| Announcement Bar | Not started | — |
| Accordion | Not started | — |
| Tabs | Not started | — |
| SVG Background | Not started | — |
| Pricing Table | Not started | — |
| Modal | Not started | — |

Update this table as blocks are committed/deployed.

## Block Customisation Standard (MANDATORY)

Every block MUST provide per-element customisation matching Kadence/Spectra depth:

1. Native WordPress `supports` for wrapper-level controls (colour, typography, spacing, border)
2. Custom attributes + controls for each inner text element (colour, font size)
3. Custom attributes + controls for interactive elements like CTAs (text colour, background colour)
4. CSS fallback colours use `:not([style*="color"])` so custom values always win
5. Use Block Selectors API in `block.json` to target native typography to primary text element

See auto memory `block-standards.md` for the full checklist.

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

This is **Phase 1b** — built immediately after the theme. See `specs/06-BUILD-ORDER.md` for the block build order (Container first, then Hero, then the rest in sequence).

## Deployment

Build locally (`npm run build`), deploy the `build/` directory + PHP files via SCP. No Node.js on the server.
