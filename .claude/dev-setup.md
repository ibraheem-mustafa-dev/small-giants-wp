---
doc_type: dev-setup
project: small-giants-wp
title: SGS WordPress Framework — Developer Setup & Operations
last_updated: 2026-05-30
split_from: .claude/architecture.md (Part C)
split_date: 2026-05-24
---

# SGS WordPress Framework — Dev Setup

## Origin

Split from `.claude/architecture.md` on 2026-05-24 as part of Phase 10 D'-1. Contains all build / deploy / SSH / local environment content from the original file. Architecture and system design content stays in `.claude/architecture.md`.

---

## Contents

- [Project structure](#project-structure)
- [Build process](#build-process)
- [Creating a new block](#creating-a-new-block)
- [Adding a style variation](#adding-a-style-variation)
- [Shared components](#shared-components)
- [Render helpers](#render-helpers)
- [Extensions architecture](#extensions-architecture)
- [Deployment process](#deployment-process)
- [Environment and tools](#environment-and-tools)

---

## Project structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json               # All design tokens: colours, fonts, spacing, shadows
│   ├── style.css                # Theme header only (no CSS rules)
│   ├── functions.php            # Enqueues, variation-specific CSS, filters
│   ├── styles/                  # EMPTIED — Phase 5a (2026-05-21). Per-client snapshots at sites/<client>/theme-snapshot.json
│   ├── templates/               # Full-page block templates (index, page, single, etc.)
│   ├── parts/                   # Template parts (header variants, footer, mega menus)
│   ├── patterns/                # Reusable block patterns
│   └── assets/
│       ├── css/                 # core-blocks.css, dark-mode.css, utilities.css, etc.
│       ├── js/                  # sticky-header.js, dark-mode.js, mobile-nav-drawer.js, etc.
│       ├── fonts/               # Self-hosted WOFF2 files
│       └── decorative-foods/    # Indus Foods decorative PNG images
│
├── plugins/sgs-blocks/
│   ├── sgs-blocks.php           # Plugin entry point
│   ├── includes/                # PHP helpers, form processing, REST endpoints
│   │   ├── class-sgs-blocks.php # Auto-discovery and registration of all blocks
│   │   ├── forms/               # Form processor, REST API, admin, DB activation
│   │   ├── google-reviews-settings.php
│   │   ├── heading-anchors.php
│   │   ├── device-visibility.php
│   │   ├── hover-effects.php
│   │   └── review-schema.php
│   ├── src/
│   │   ├── blocks/              # One folder per block (see structure below)
│   │   │   └── extensions/      # Editor extensions (animation, visibility, hover, spacing)
│   │   ├── components/          # Reusable React components for use in edit.js files
│   │   └── utils/               # Shared JS utilities
│   ├── build/                   # Compiled output (committed, deployed to server)
│   ├── assets/
│   │   ├── css/extensions.css   # Frontend CSS for extensions (animation, visibility)
│   │   └── js/animation-observer.js
│   └── package.json
│
├── docs/                        # Documentation (QUICKSTART, DEVELOPER, plans)
├── sites/                       # Per-client content, mockups, research
├── specs/                       # Framework specification documents
└── ARCHITECTURE.md              # Root-level architecture overview
```

### Per-block structure

Each block lives in `src/blocks/{block-name}/`:

```
{block-name}/
├── block.json     # Block metadata, attributes, supports, file references
├── edit.js        # Block editor UI (InspectorControls, BlockControls, preview)
├── index.js       # Block registration (imports edit.js, save.js, block.json)
├── save.js        # Returns null for dynamic blocks, or InnerBlocks.Content for wrappers
├── render.php     # Server-side render (called by WordPress for dynamic blocks)
├── style.css      # Frontend styles (also loaded in the editor)
├── editor.css     # Editor-only styles (not loaded on the frontend)
└── view.js        # Frontend interactive script (Interactivity API or vanilla ES module)
```

Dynamic blocks (the majority) use `render.php` and return `null` from `save.js`. This avoids deprecation issues and keeps PHP in control of output.

---

## Build process

All block JavaScript and CSS is compiled using `@wordpress/scripts`. Build from the `sgs-blocks` directory.

```powershell
cd plugins/sgs-blocks

# Install dependencies (first time only)
npm install

# Production build (required before deployment)
npm run build

# Development watch (rebuilds on file change)
npm run start
```

The build uses `--experimental-modules` to support `viewScriptModule` (the Interactivity API) and `--webpack-copy-php` to copy PHP render files into the `build/` directory.

A `prebuild` / `prestart` hook runs `scripts/generate-icons.js` automatically. This generates `includes/lucide-icons.php` from the `lucide-static` package — a flat PHP array of 1,900+ SVG icons. Do not edit `lucide-icons.php` directly.

**Output:** `build/blocks/{block-name}/` contains the compiled files. All files in `build/` are version-controlled and deployed directly to the server — Node.js is not available on the Hostinger host.

---

## Creating a new block

### 1. Create the block directory

```powershell
cd plugins/sgs-blocks/src/blocks
mkdir my-block-name
```

### 2. Create block.json

Minimum required structure:

```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "sgs/my-block-name",
    "version": "0.1.0",
    "title": "SGS My Block",
    "category": "sgs-layout",
    "description": "One sentence description.",
    "keywords": ["my-block", "keyword2"],
    "textdomain": "sgs-blocks",
    "attributes": {
        "exampleAttr": {
            "type": "string",
            "default": ""
        }
    },
    "supports": {
        "anchor": true,
        "html": false,
        "spacing": { "padding": true, "margin": true }
    },
    "render": "file:./render.php",
    "editorScript": "file:./index.js",
    "editorStyle": "file:./index.css",
    "style": "file:./style-index.css"
}
```

**Categories available:**
- `sgs-layout` — structural/container blocks
- `sgs-content` — content blocks
- `sgs-forms` — form-related blocks
- `sgs-navigation` — nav/wayfinding blocks
- `sgs-commerce` — commerce-related blocks

### 3. Create index.js

```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';

const save = () => null; // Dynamic block — rendered by PHP

registerBlockType( metadata.name, {
    edit: Edit,
    save,
} );
```

### 4. Create edit.js

Use WordPress components for the editor UI:

```js
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
    const { exampleAttr } = attributes;
    const blockProps = useBlockProps();

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Settings', 'sgs-blocks' ) }>
                    <TextControl
                        label={ __( 'Example', 'sgs-blocks' ) }
                        value={ exampleAttr }
                        onChange={ ( val ) => setAttributes( { exampleAttr: val } ) }
                    />
                </PanelBody>
            </InspectorControls>
            <div { ...blockProps }>
                { /* Editor preview */ }
            </div>
        </>
    );
}
```

### 5. Create render.php

```php
<?php
/**
 * SGS My Block — server-side render.
 *
 * @var array $attributes Block attributes.
 * @var string $content   Inner blocks HTML (for blocks with InnerBlocks).
 * @var WP_Block $block   The current block instance.
 */

$example_attr = esc_html( $attributes['exampleAttr'] ?? '' );
$wrapper_attrs = get_block_wrapper_attributes( [
    'class' => 'sgs-my-block',
] );
?>
<div <?php echo $wrapper_attrs; ?>>
    <?php echo $example_attr; ?>
</div>
```

`get_block_wrapper_attributes()` merges in any colour, spacing, or typography attributes set via the block supports system. Always use it for the root element.

### 6. Create style.css and editor.css

Scope all CSS under the block class:

```css
/* style.css */
.sgs-my-block {
    /* styles here */
}
```

### 7. Build and test

```powershell
cd plugins/sgs-blocks ; npm run build
```

Auto-discovery is handled by `class-sgs-blocks.php`. Any folder in `build/blocks/` that contains a `block.json` is registered automatically — no manual registration needed.

---

## Adding a style variation

> **Note (2026-05-21, Phase 5a):** The WP style-variation overlay system was retired. `theme/sgs-theme/styles/` is now empty. Per-client colour/typography snapshots live at `sites/<client>/theme-snapshot.json` and are deployed via `plugins/sgs-blocks/scripts/push-theme-snapshot.py`. The section below documents the old mechanism for reference; do not add new per-client `.json` files to `theme/sgs-theme/styles/`.

Style variations used to let the same theme serve different clients via JSON files in `theme/sgs-theme/styles/`. The current approach is `theme-snapshot.json` per client, pushed with the push-theme-snapshot script.

If the variation needs CSS that cannot be expressed via tokens, add it to the client's `theme-snapshot.json` under `styles.css` OR to `sites/<client>/theme-overrides.css`. Never add client-specific CSS to `style.css`.

---

## Shared components

Reusable React components live in `src/components/`. Import them in any block's `edit.js`.

```js
import { DesignTokenPicker, AnimationControl, ResponsiveControl, SpacingControl } from '../../components';
```

### DesignTokenPicker

A colour picker that returns theme colour slugs rather than raw hex values. Use this instead of `ColorPalette` for colour attributes so colours track theme token changes.

```js
import { DesignTokenPicker } from '../../components';

<DesignTokenPicker
    label={ __( 'Background Colour', 'sgs-blocks' ) }
    value={ backgroundColour }
    onChange={ ( val ) => setAttributes( { backgroundColour: val } ) }
/>
```

In `render.php`, convert a slug to a CSS variable:

```php
function sgs_colour_var( string $value ): string {
    if ( str_starts_with( $value, '#' ) ) {
        return $value; // Raw hex — pass through.
    }
    return 'var(--wp--preset--color--' . sanitize_html_class( $value ) . ')';
}
```

Always add a `:not([style*="color"])` guard in CSS so inline styles set by the attributes always win.

### AnimationControl

Renders the scroll animation inspector panel. Used directly by the extensions system, but can also be embedded in a block's own inspector:

```js
import { AnimationControl } from '../../components';

<AnimationControl
    attributes={ attributes }
    setAttributes={ setAttributes }
/>
```

### ResponsiveControl

Wraps any control in a desktop/tablet/mobile tab switcher for setting per-breakpoint values:

```js
import { ResponsiveControl } from '../../components';

<ResponsiveControl>
    { ( device ) => (
        <RangeControl
            label={ `Columns (${ device })` }
            value={ attributes[ `columns${ device }` ] }
            onChange={ ( val ) => setAttributes( { [ `columns${ device }` ]: val } ) }
        />
    ) }
</ResponsiveControl>
```

### SpacingControl

Custom padding/margin control with per-side and per-breakpoint inputs:

```js
import { SpacingControl } from '../../components';

<SpacingControl
    label={ __( 'Padding', 'sgs-blocks' ) }
    value={ padding }
    onChange={ ( val ) => setAttributes( { padding: val } ) }
/>
```

---

## Render helpers

### sgs_responsive_image

Located in `includes/render-helpers.php`. Outputs a fully optimised `<img>` with:

- `srcset` and `sizes` attributes for responsive images.
- `loading="lazy"` for below-fold images.
- `fetchpriority="high"` for LCP images (hero, above-fold).
- `decoding="async"`.
- Proper `alt` text from the attachment metadata.

```php
echo sgs_responsive_image(
    $attachment_id,       // int — attachment post ID
    'large',              // string — WordPress image size
    [
        'class'           => 'sgs-hero__image',
        'fetchpriority'   => 'high',  // omit for lazy-loaded images
    ]
);
```

For the hero block's background image, a `<link rel="preload">` tag is injected into `<head>` by `functions.php` to eliminate LCP delay.

---

## Extensions architecture

Extensions add capabilities to all blocks via the WordPress `editor.BlockEdit` filter. They live in `src/blocks/extensions/`.

```
extensions/
├── animation.js              # Scroll-triggered animation controls
├── responsive-visibility.js  # Per-device show/hide controls
├── hover-effects.js          # Hover state colour controls
├── custom-spacing.js         # Enhanced per-breakpoint spacing
└── index.js                  # Imports all extensions
```

### How extensions work

1. `index.js` is compiled to `build/extensions/index.js`.
2. `class-sgs-blocks.php` enqueues this bundle via `enqueue_block_editor_assets` so it loads once in the editor.
3. Each extension file calls `addFilter( 'editor.BlockEdit', 'sgs/...', withMyPanel )` to inject an extra InspectorControls panel into every block's settings panel.
4. For the **Responsive Visibility** and **Hover Effects** extensions, a corresponding PHP `render_block` filter in `includes/device-visibility.php` and `includes/hover-effects.php` applies the class or inline style server-side so the output is correct on the frontend too.

### Adding a new extension

1. Create `src/blocks/extensions/my-extension.js` following the same pattern as `animation.js`.
2. Import it in `extensions/index.js`.
3. If the extension needs server-side output (e.g. injecting a CSS class), add a `render_block` filter in a new PHP file in `includes/` and require it from `sgs-blocks.php`.
4. Build: `npm run build`.

---

## Deployment process

**Dev site:** `https://palestine-lives.org`
**Staging/client canary:** `https://sandybrown-nightingale-600381.hostingersite.com` (WP 7.0 as of 2026-05-22)
**Reference site (READ ONLY):** `https://lightsalmon-tarsier-683012.hostingersite.com`

**SSH:** `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias: `ssh hd`)

> **LiteSpeed note (2026-05-05):** LiteSpeed Cache plugin deleted from dev sites (palestine-lives.org + sandybrown). No LiteSpeed purge needed for those sites. Check `wp plugin list | grep litespeed` on production sites before deploying.

### Full deployment (recommended — tar method)

```bash
# 1. Build blocks plugin
cd plugins/sgs-blocks && npm run build

# 2. Deploy via tar (scp -r creates nested dirs on Hostinger — always use tar)
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='plugins/sgs-blocks/src' \
  --exclude='theme/sgs-theme/styles/*.json' \
  --exclude='plugins/sgs-blocks/_retired' \
  theme/sgs-theme plugins/sgs-blocks

scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar

ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'

rm sgs-deploy.tar

# 3. Reset PHP OPcache (CLI and web are separate pools)
ssh -p 65002 u945238940@141.136.39.73 "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && \
  curl -s https://palestine-lives.org/op-reset-tmp.php && \
  ssh -p 65002 u945238940@141.136.39.73 "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

### Single-file patch

```bash
scp -P 65002 -i ~/.ssh/id_ed25519 path/to/file \
  u945238940@141.136.39.73:domains/palestine-lives.org/public_html/wp-content/path/to/file
```

### Per-client theme snapshot deploy

```bash
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73
# --no-push flag for preview without pushing
```

### Fast-cycle canary deploy (sandybrown) — D3

`plugins/sgs-blocks/scripts/build-deploy.py` is the fast-cycle deploy script for the sandybrown staging canary. Skips full-ceremony steps (no /qc-council, no full doc walk) — use for iterative pipeline / converter work where the per-commit cadence is dictated by /sgs-clone --debug-trace measurement, not full deploy QA.

```bash
python plugins/sgs-blocks/scripts/build-deploy.py
```

Companion to `/wp-sgs-deploy` (full-ceremony palestine-lives deploy). Pick by target site:
- sandybrown canary → `build-deploy.py`
- palestine-lives + production → `/wp-sgs-deploy`

### Inheritance audit — container-wrapping blocks (D152)

`plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` detects which blocks wrap children via InnerBlocks (the "wraps children" model) and syncs `wraps_block` + `container_kind` into `block_composition`. Rewritten D152 from a heuristic threshold model to validated structural detection.

```bash
python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py
# --apply to write detected wraps_block + container_kind values into block_composition
```

28-block container roster confirmed (D152, commit `0d746073`). Re-run via `/sgs-update` Stage (auto) or manually whenever block.json `supports.sgs.containerKind` changes.

### PowerShell equivalents (dev machine)

```powershell
cd plugins/sgs-blocks ; npm run build

# Plugin only
scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/

# Theme only
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/

# Clear caches (only if LiteSpeed plugin is active on target site)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# OPcache reset
ssh hd "echo '<?php opcache_reset(); echo ""ok"";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
curl -s https://palestine-lives.org/op-reset-tmp.php
ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

**Run all commands from project root:** `C:\Users\Bean\Projects\small-giants-wp`

### What NOT to deploy

- `node_modules/` — not needed on the server
- `src/` — compiled output from `build/` is what WordPress uses
- `.gitignore`, `package.json`, `package-lock.json` — server does not need these
- `theme/sgs-theme/styles/*.json` — per-client snapshots now live at `sites/<client>/theme-snapshot.json`

---

## Environment and tools

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v22.18.0 | Build tooling only — not on the server |
| @wordpress/scripts | 30.x | Handles webpack, eslint, format |
| WordPress | 7.0 | Block theme, no classic editor. Sandybrown upgraded 2026-05-22. |
| PHP | 8.0+ | |
| Shell | PowerShell (dev) / Bash (SSH) | Use `;` not `&&` to chain PowerShell commands |
| Playwright | v1.58.2 | Globally installed on dev machine, Chromium ready |

### Linting and formatting

```powershell
cd plugins/sgs-blocks

# Lint JavaScript
npm run lint:js

# Lint CSS
npm run lint:css

# Auto-format
npm run format

# PHP lint (WordPress Coding Standards)
phpcs --standard=WordPress plugins/sgs-blocks/includes/

# Naming conventions
python scripts/lint-naming-conventions.py
```

### PHP IDE stubs

Project uses `php-stubs/wordpress-stubs` v6.9.1 and `php-stubs/wp-cli-stubs` v2.12.0 for Intelephense IDE support. Installed to `vendor/` (gitignored). `composer.json` + `composer.lock` are committed.

```powershell
composer install  # installs stubs to vendor/ (dev-only, never deploy vendor/)
```

### Git workflow

Main branch for framework work. Client-specific work on feature branches (`feat/indus-foods-*`, etc.). See project CLAUDE.md for full branch discipline rules.

```powershell
cd C:\Users\Bean\Projects\small-giants-wp
git add .
git commit -m "feat: add my-block block"
git push
```

No CI/CD pipeline — deployment is manual via `scp` / tar as described above.

### SGS DB queries (quick reference)

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats          # Framework health
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/hero  # Block details
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py match "pricing" # Find best block
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py context indus-foods # Load client
```

### DB schema notes (post-D99 + D107-D113)

- **`blocks.tier`** (new D107) — TEXT column, CHECK constraint `IN ('block', 'class-section', 'pattern')`. Populated by `/sgs-update` Stage 1 from each block's `supports.sgs.is_section_root` flag in `block.json`. Operator-set per block, not algorithmically inferred.
- **`block_composition`** (new D108) — 188 rows seeded. Tracks ALL container-wrapping blocks (not just section-roots). Columns differentiate section-root wrappers from non-section container wrappers for div-class-level routing. Walker consumption DEFERRED — data layer LIVE only.
- **`slots`** (D99) — composite PK on `(slot_name, scope)`. Post-D111 (2026-05-30): 92 element-scope + 4 section-scope = 96 total. Replaces retired `slot_synonyms` + `legacy_role_lookup`. XS-5 cleanup retired 12 wrong/dead section-scope rows + re-inserted testimonial/testimonial-slider at element scope; `inner` passthrough element row added.
- **`roles`** (D99) — 20 rows. Replaces `slot_synonyms.role_classification` column. `INSERT OR REPLACE` from `_ROLE_CLASSIFICATION_MAP`.
- **`html_tag_to_core_block`** (D99) — 14 rows, idempotent migration at module load. Replaces hardcoded `_HTML_TAG_TO_CORE_SLUG` dict. `INSERT OR REPLACE`.

### canonical_slot assignment (XS-4 / D110)

`assign-canonical.py` was ported to the D99 `slots` + `roles` schema. Current canonical_slot coverage = 31.8% of attrs. Re-run after every slot-vocabulary addition:

```bash
python plugins/sgs-blocks/scripts/assign-canonical.py
```

---

## Known Gotchas

| Gotcha | Detail |
|--------|--------|
| **SCP `-r` creates nested directories** | `scp -r theme/sgs-theme remote:path/sgs-theme` creates `sgs-theme/sgs-theme/`. Always use tar method or SCP to the parent directory. |
| **Hostinger caches CSS aggressively** | Bump version in `style.css` after CSS changes to bust cache. Theme version is the query string for all enqueued styles. |
| **`--webpack-copy-php` flag** | Build script copies `render.php` to `build/` automatically. Dynamic blocks won't render without this. |
| **`--experimental-modules` flag** | Required in build/start scripts for `viewScriptModule` in block.json. |
| **Deprecations required** | Changing a static block's `save.js` output requires a deprecation to avoid "unexpected content" errors on existing posts. |
| **SSH remote variable expansion** | Use single quotes for outer string when running `ssh hd '...'` so `$WP` expands on server. Double quotes expand locally. |
| **Tar deploy: delete before move** | `mv plugins/sgs-blocks $WP/plugins/` fails with "Directory not empty" if target exists. Always `rm -rf $WP/plugins/sgs-blocks` first. |
| **Tar `--exclude='src'` breaks vendor** | Too broad — strips `vendor/*/src/` subdirectories. Always use `--exclude='plugins/sgs-blocks/src'`. |
| **WP-CLI inline PHP escaping** | `wp eval '...'` breaks on shell special chars. Reliable fallback: write to `/tmp/script.php` with `cat << 'PHPEOF'`, scp to server, `wp eval-file ~/script.php`, then `rm`. |
| **`parse_blocks()` is shallow** | Only returns top-level blocks. Finding nested blocks requires a recursive function walking `$b['innerBlocks']`. |
| **Hostinger error logs** | Live at `~/.logs/error_log_<domain>`, not `wp-content/debug.log` (often stale). |
| **WP_DEBUG_DISPLAY contamination** | `WP_DEBUG_DISPLAY=true` injects PHP Notice banners that shift every section vertically, inflating pixel-diff 15-40pts. Set false on staging. |

---

## 2026-05-20 — Phase 1 four-destination CSS router architectural rewrite (was Spec 16 §FR6; now Spec 22 §FR-22-5)

13 commits (`8ceb8787` → `bb3de12b`) added:

**New modules:**
- `plugins/sgs-blocks/scripts/orchestrator/css_router.py` (661 LOC) — Spec 22 §FR-22-5 four-destination router (D0/D1/D2/D3); was Spec 16 §FR6 — retired 2026-05-26
- `plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py` — operator-driven CLI for promoting gap candidates into block.json schema
- `plugins/sgs-blocks/scripts/orchestrator/essence_match_detector.py` — cv2 walker tier for essence-match-with-differences → block-variation emit
- `plugins/sgs-blocks/includes/class-variation-rest.php` — sgs/v1/active-variation REST endpoint
- `plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php` — PHP variations loader
- `.claude/hooks/no-header-footer-block.py` — PostToolUse hook for chrome-block prevention

**New per-run artefacts:** `css-d1-assignments.json` (D1 sidecar), per-section `token_resolutions` + `essence_matches` in `extract.json`, `scaffold_quality_report` in `stage-9b.json`.

**Cross-references:**
- Full pipeline changes: `.claude/cloning-pipeline-flow.md` 2026-05-20 section
- Spec compliance + known gaps: `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §2-§3 (Spec 16 retired 2026-05-26; archived at `.claude/specs/archive/`)
- Architectural decisions: `.claude/decisions.md` D1-D6
- Honest-path council finding: `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md`
