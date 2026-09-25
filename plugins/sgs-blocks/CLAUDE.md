# SGS Blocks — Claude Code Instructions

## What This Is

A custom Gutenberg block library (WordPress plugin) that replaces Spectra Pro. Produces clean
semantic markup that reads design tokens from the SGS Theme. Per-block status: query
`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` / `/wp-blocks`; live status:
`.claude/LEDGER.md`.

Full spec: `.claude/specs/02-SGS-BLOCKS.md` (blocks) + `.claude/specs/04-SGS-FORMS.md` (forms, incl.
the form processing engine — DB table `{prefix}sgs_form_submissions`, REST namespace
`sgs-forms/v1`, notifications via N8N webhooks not `wp_mail`).

## Plugin Structure

```
sgs-blocks/
├── sgs-blocks.php               # Plugin bootstrap
├── package.json                  # @wordpress/scripts + dependencies
├── webpack.config.js             # Build config
├── src/
│   ├── blocks/                   # One folder per block (block.json, edit.js, save.js, style.css, view.js)
│   ├── bindings/                 # Block bindings sources
│   ├── components/                # Shared editor components (SgsColourPanel, SgsBorderControl, TypographyControls, DesignTokenPicker, etc.)
│   ├── header-behaviours/          # Header/nav interactivity modules
│   ├── plugins/                   # Editor plugin registrations
│   ├── shared/                    # Cross-block modules (nav-interactivity, nav-menu-panels)
│   ├── utils/                     # Token reader, responsive helpers
│   └── vendor-modules/            # Bundled third-party modules
├── build/                         # Compiled output (deploy this, not src/)
└── includes/
    ├── class-sgs-blocks.php      # Main plugin class
    ├── block-categories.php      # Register SGS block categories
    ├── device-visibility.php     # Server-side render_block filter for responsive visibility
    ├── heading-anchors.php       # Auto-generates heading IDs for Table of Contents
    ├── lucide-icons.php          # Auto-generated Lucide icon library (exempt from the 300-line PHP limit)
    ├── render-helpers.php        # Autoloads shared colour/font-size/box helper files
    ├── addon-price-list/         # Site-wide priced add-ons: settings page, cart pricing, CLI seed (Spec 43 FR-43-17 to 20)
    ├── flow-fields/              # Choice-flow answers and fields on the cart line, session-stamped upload (FR-43-21)
    └── forms/                    # Form processing engine (REST API, DB, submissions, private uploads)
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

`sgs-layout`, `sgs-content`, `sgs-interactive`, `sgs-forms` — see each block's `block.json`
`category` for current membership.

## Build Commands

```bash
npm run build         # Production (--experimental-modules for viewScriptModule, --webpack-copy-php copies render.php to build/ — dynamic blocks won't render without it)
npm run start         # Dev with hot reload
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
```

## A control that "doesn't work" — diff it against a block where it ALREADY works

Do not design a fix from first principles. Ask which blocks already have the attribute:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, css_property, css_element, css_tier FROM block_attributes WHERE css_property='object-fit'"
```

Then read the working block's `render.php` + `style.css` and compare — the DB query surfaces
blocks a hand-written survey misses. Never weigh "this changes what the canary currently renders":
the framework is pre-production, so whether a default is right is decided on merit alone.

## Block Customisation Standard

Every block MUST provide per-element customisation matching Kadence/Spectra depth:

1. Native `supports` for wrapper-level controls (colour, typography, spacing, border).
2. Custom attributes + controls for each inner text element: colour via `SgsColourPanel`
   (`.claude/rules/block-editor-controls.md`); font size/weight/style/line-height via the shared
   **`TypographyControls`** component (`src/components/TypographyControls.js`) in edit.js + the
   shared **`sgs_typography_css_rule( $attributes, $prefix, $selector )`** helper
   (`includes/helpers-typography.php`) in render.php — never hand-rolled font controls, never
   native `supports.typography` on an inner element (gate: `inspector-scan` rule 45). The device
   tier is chosen once, in the global `<ResponsiveControl>` toggle
   (`src/blocks/extensions/responsive-device-toggle.js`) — never add a per-control switcher (rule
   25). This scopes to blocks rendering their own text element; an InnerBlocks composite
   (`sgs/heading`/`text`/`label` children) puts typography on the child — see Spec 02's Block
   Customisation Standard, "HC2".
3. Custom attributes + controls for interactive elements like CTAs (text colour, background
   colour) — via `sgs/multi-button` + `sgs/button` InnerBlocks by default.
4. Do NOT use `:not([style*="…"])` fallback guards. Under Spec 32 no block emits an inline `style`
   declaration, so the guard always matches and becomes unconditional. Let the value inherit, or
   emit the fallback inside `:where()` so a `.{uid}` scoped rule wins.
5. Use Block Selectors API in `block.json` to target native typography to the primary text
   element.
6. Variant-bearing blocks MUST declare `supports.sgs.variants` (a map of `variant_value → [attr/
   slot names that variant uses]`) so the cloning converter can detect the correct variant, and
   register the variant-selector attr name to the `blocks.variant_attr` DB column via
   `/sgs-update` (FR-31-20, Spec 31 §13).

Border controls (`SgsBorderControl`), colour controls (`SgsColourPanel`,
`supports.sgs.colourExemptions`), hover controls, the editor-canvas mirror pattern and grid-item
qualification: `.claude/rules/block-editor-controls.md`. Colour-emission helpers, shadows, scrims
and hover-guard build step: `.claude/rules/colour-emission.md`.

## Utility Functions

```js
import { colourVar, fontSizeVar, spacingVar, shadowVar, borderRadiusVar, transitionVar } from '../../utils';
```

`colourVar('primary')` → `var(--wp--preset--color--primary)` (same pattern for fontSize/spacing/
shadow/borderRadius/transition). Use `DesignTokenPicker` for colour selection from the theme.json
palette in the editor sidebar.

## Cross-cutting gotchas

- **Core block "unexpected content"** → open the Site Editor, click "Attempt Block Recovery" on
  each invalid block, then save. Never fix via WP-CLI `str_replace` on `post_content` — this
  breaks block validation and cascades.
- **`style.css` vs `editor.css` are independent** — `style.css` compiles to the frontend-only
  `style-index.css`, `editor.css` to the editor-only `index.css`. A fix in one does not reach the
  other; mirror it by hand when the editor preview should match.
- **Dynamic blocks with an InnerBlocks slot must `save: () => <InnerBlocks.Content />`**, never
  `null` — `save: () => null` drops the InnerBlocks tree from `post_content` on save even though
  render.php drives 100% of frontend output. (`sgs/product-card` has no InnerBlocks slot, so its
  save is genuinely `null`.) Full detail: `.claude/specs/common-wp-styling-errors.md` row B4.
- **Never write `post_content` to a page open in the block editor** — a save from the editor
  writes its in-memory state (loaded before your write) over everything; only the last write
  survives.
- **Tier-object attributes have no schema protection.** Every `{desktop,tablet,mobile}`-shaped
  attribute declares `{"type":"object","default":{}}` with no nested schema, so WordPress passes a
  malformed sub-key through unchanged. Read and write them only through the PHP helper
  (`sgs_responsive_normalise_object()`, `sgs_box_object_shorthand()`/`sgs_corner_object_shorthand()`)
  and the JS write helper (`patchTier()`) — never a bare `setAttributes({attr:{tier:value}})`,
  which silently drops the other two tiers. Full migration doctrine:
  `.claude/rules/migration-scripts.md`.
- **Shared CSS atoms scope per ELEMENT, not per block** — a two-element block sharing one atom
  scope silently sets the same custom property twice. Detail: `.claude/rules/colour-emission.md`
  ("Media atom scoping").

## Key rules

- Every block reads colours/fonts from theme.json tokens, never hardcode. Apply THE
  DEFAULT-vs-HARDCODE TEST before any block literal — full test in Spec 32 §6.1: does it override a
  theme-wide default, or hinder the pipeline? A component's own constant (not a client value) may
  stay; `null` default = inherit is the canonical pattern. Enforced by `check-hardcoded-render-defaults.js`'s F3b.
- CSS scroll-snap for carousels, Intersection Observer for scroll-triggered animations.
- Progressive enhancement: every block renders meaningful content without JS.
- Responsive: every layout block has mobile/tablet/desktop controls.
- Use `useInnerBlocksProps` (not the `InnerBlocks` component directly) for inner-block editor
  integration — once per block.

## Gates

Fast tier runs in `prebuild`, full tier runs pre-deploy; `npm run gate:list` shows what's actually
wired (a standalone `check:*` alias in `package.json` proves only that the alias exists, not that a
build runs it). Every gate script documents what it catches in its own header — read that before
re-deriving the rule. Never dump a new finding into a gate's baseline file; fix the pattern or
generalise the gate.

## Where the rest of this file moved

- Border/colour editor controls, editor-canvas mirrors, grid-item qualification:
  `.claude/rules/block-editor-controls.md`
- Colour-emission helpers, precedent registry, shadows, scrims, touch-safe hover:
  `.claude/rules/colour-emission.md`
- Backend integrations (Google Reviews, Trustpilot, Font Collection): `.claude/rules/backend-integrations.md`
- Migration/survey script triad, tier-object taxonomy, S1–S5 doctrine: `.claude/rules/migration-scripts.md`
- Live motion QA + canary fixture pages: `.claude/rules/motion-qa.md`
- WooCommerce loop pinning, undeclared-attribute drop, no-deprecations reasoning:
  `.claude/rules/block-authoring.md`
- No-dead-controls (HC2): `.claude/specs/02-SGS-BLOCKS.md` § Block Customisation Standard
