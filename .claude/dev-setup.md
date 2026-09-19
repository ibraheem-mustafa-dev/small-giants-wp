---
doc_type: dev-setup
project: small-giants-wp
title: SGS WordPress Framework — Developer Setup & Operations
---

# SGS WordPress Framework — Dev Setup

⛔ **More than 3 blocks/files/call sites? The first deliverable is the
DETECTOR, not the edit — `.claude/THE-MIGRATION-METHOD.md`.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here.

## Contents

- [Project structure](#project-structure)
- [Build process](#build-process)
- [sgs-framework.db — the unversioned local dev DB](#sgs-frameworkdb--the-unversioned-local-dev-db)
- [Creating a new block](#creating-a-new-block)
- [Adding per-client theming](#adding-per-client-theming)
- [Shared components](#shared-components)
- [Render helpers](#render-helpers)
- [Extensions architecture](#extensions-architecture)
- [Deployment process](#deployment-process)
- [WP-CLI](#wp-cli)
- [Environment and tools](#environment-and-tools)
- [Tooling catalogue — every gate, audit and codemod](#tooling-catalogue--every-gate-audit-and-codemod)
- [Helper & component/atom catalogue](#helper--componentatom-catalogue)
- [DB catalogue — what every column records, and which ones lie](#db-catalogue--what-every-column-records-and-which-ones-lie)
- [Known Gotchas](#known-gotchas)

---

## Project structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json               # All design tokens: colours, fonts, spacing, shadows
│   ├── style.css                # Theme header only (no CSS rules)
│   ├── functions.php            # Enqueues, image/font preload hooks, filters
│   ├── inc/                     # PHP helpers (colour-helpers.php, font-preloading.php)
│   ├── styles/                  # EMPTY — per-client snapshots at sites/<client>/theme-snapshot.json
│   ├── templates/               # Full-page block templates (index, page, single, etc.)
│   ├── parts/                   # Template parts (header, footer, shop/PDP/cart parts)
│   ├── patterns/                # Reusable block patterns
│   └── assets/
│       ├── css/                 # core-blocks.css, dark-mode.css, utilities.css, etc.
│       ├── js/                  # dark-mode.js, smooth-scroll.js, nav-accessibility.js, etc.
│       ├── fonts/               # Self-hosted WOFF2 files
│       └── decorative-foods/    # Indus Foods decorative PNG images
│
├── plugins/sgs-blocks/
│   ├── sgs-blocks.php           # Plugin entry point
│   ├── includes/                # PHP helpers, CPTs, WP-CLI commands, REST endpoints, migrations
│   │   ├── class-sgs-blocks.php # Auto-discovery and registration of all blocks
│   │   ├── class-sgs-cli-commands.php                # `wp sgs` commands (Spec 19)
│   │   ├── class-sgs-header-footer-cli-commands.php  # `wp sgs header|footer|drawer`
│   │   ├── class-sgs-colour-audit-cli-commands.php   # `wp sgs audit-colour-tokens`
│   │   ├── forms/               # Form processor, REST API, admin, DB activation
│   │   ├── migrations/          # Framework migrations run by `wp sgs migrations`
│   │   ├── helpers-*.php        # Shared render helpers
│   │   ├── device-visibility.php
│   │   ├── hover-effects.php
│   │   └── review-schema.php
│   ├── src/
│   │   ├── blocks/              # One folder per block (see structure below)
│   │   │   └── extensions/      # Editor extensions (animation, visibility, hover, custom CSS)
│   │   ├── components/          # Reusable React components for use in edit.js files
│   │   ├── header-behaviours/   # Header behaviour frontend modules
│   │   ├── shared/              # Shared editor/frontend modules
│   │   └── utils/               # Shared JS utilities
│   ├── build/                   # Compiled output (gitignored; `npm run build` produces it, build-deploy.py ships it)
│   ├── assets/
│   │   ├── css/                 # Frontend CSS for extensions, media atoms, effects
│   │   └── js/                  # Frontend scripts (animation-observer.js, parallax.js, etc.)
│   ├── scripts/                 # Build, deploy, gate and cloning-pipeline tooling (build-deploy.py, gates.json, converter/)
│   └── package.json
│
├── sites/                       # Per-client content, mockups, research, theme-snapshot.json
└── .claude/                     # Specs, decisions, ledger, plans, reports
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

`prebuild` runs the generators (roster, icons, extension attributes, SVG allowlist, media attributes and stylesheet, motion-fx generators) as a fail-fast chain, then `python scripts/run-gates.py --tier fast`. The runner executes every fast-tier gate, collects every failure, and prints one consolidated report, so one build shows every defect. The gate roster is `plugins/sgs-blocks/scripts/gates.json` (one record per gate: `id`, `cmd`, `tier`, `budget_ms`, `order`). Heavyweight gates sit in the `full` tier, which `build-deploy.py` runs before it ships (`npm run gate:full`; `--skip-gate-full` disables that tier for a deploy). A second chain runs at commit time from `.githooks/sgs-gates.sh` (visual-diff gate, `check-markup-neutral.py`, `check-editor-only.py`).

Gate commands (from `plugins/sgs-blocks`): `npm run gate:list` (the roster), `gate:fast`, `gate:full`, `gate:all`, `gate:wired` (asserts the deploy script runs the full tier), `gate:selftest`.

Two of the gates, as examples of what the roster covers: `check-empty-inspector-containers.js` (an inspector container rendered with no children — a client-visible dead control that `check-dead-controls.js`, which checks the opposite direction, cannot see) and `check-wrapper-capability-preconditions.js` (`gridItems` requires `layout`; a `supports.sgs.gridAreas` declaration must have a live reader). Per-gate rationale and `--self-test` shapes are in each script's own header; the tooling catalogue below lists them. **Never trust a doc's claim that a gate runs — read `scripts/gates.json`, or run `npm run gate:wired`.**

**Converter conformance:**
- **Gate A (golden-fixture harness):** `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` — fixture count is DB/dir-authoritative (`scripts/tests/fixtures/conformance/`, do not hard-code a number), run manually with `pytest plugins/sgs-blocks/scripts/tests/`. This is the pre-commit gating harness.

**Dated migration pattern (mandatory):** any new `property_suffixes` row or other DB seed data MUST live in a dated `migrations/YYYY-MM-DD-<descriptor>.py` under `plugins/sgs-blocks/scripts/migrations/` beside the existing siblings — never a module-load side-effect in `db_lookup.py`. Example: `plugins/sgs-blocks/scripts/migrations/2026-06-26-testimonial-media-role-selector.py`.

**Output:** `build/blocks/{block-name}/` contains the compiled files. `build/` is gitignored: `npm run build` produces it locally and `build-deploy.py` ships it — Node.js is not available on the Hostinger host.

---

## sgs-framework.db — the unversioned local dev DB

**Path:** `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (hard-linked to `~/.claude/skills/sgs-wp-engine/sgs-framework.db` — same physical file, same inode, either path reads/writes the same data). **Deliberately NOT committed to git** — it is a local dev SQLite knowledge base (block schema, `fx_effects`, `block_attributes`, `slots`, `roles`, etc. — see project `CLAUDE.md` "DB-first, no hardcoded dicts"), not a build artefact, and it is far too large and too fast-moving to version sensibly.

**What depends on it:** the Spec 38 motion-fx generator chain —
- `plugins/sgs-blocks/scripts/seed-motion-fx-registry.py` (seeds `fx_effects` + related tables)
- `plugins/sgs-blocks/scripts/generate-fx-effects-php.py` (writes `includes/generated-fx-effects.php` + `src/blocks/extensions/generated-fx-effect-meta.json`)
- `plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py` (writes `includes/generated-fx-qualifying-blocks.php` + `src/blocks/extensions/generated-fx-qualifying-blocks.json`)

— plus a long tail of one-off DB-authoring/consistency scripts under `plugins/sgs-blocks/scripts/` (migrations, `db-consistency/`, `cheat-gate/`, `excluded-gate/`, `ledger/`, the `converter/` DB lookups, etc.). All of them read the DB; none of them ship it.

**Why a clean clone still builds:** the four files the fx generators above produce are themselves **committed as build inputs** (they are generated PHP/JSON the plugin actually loads at runtime — not throwaway output). `plugins/sgs-blocks/scripts/run-motion-fx-generators.js` (wired into `prebuild`/`prestart` in `package.json`) checks for the DB before doing anything:
- **DB absent** — skips the whole chain cleanly (exit 0) and logs why. The build proceeds using the already-committed generated files untouched.
- **DB present** — runs the chain for real (seed, then `generate-fx-effects-php.py --check` which diffs an in-memory regeneration against the committed files without writing, then `generate-fx-qualifying-blocks.py`, whose output the wrapper snapshots/diffs itself since that script has no `--check` mode of its own yet). Any drift between the DB and the committed generated files **fails the build loudly**, naming the stale file(s) — so the owner can never commit a generated artefact that doesn't match the DB.

**A missing/empty DB must never produce a silently-empty roster.** `generate-fx-effects-php.py` and `generate-fx-qualifying-blocks.py` both fail loudly (naming the DB path) if the DB exists but a query returns zero rows — an empty `fx_effects` table is treated as a fatal misconfiguration, never as "nothing to generate". Never create a `sgs-framework.db` at `scripts/sgs-framework.db` or `scripts/data/sgs-framework.db`, and never point `DB_PATH` at a copy inside the repo.

**Restoring/regenerating the DB (owner only):** the DB is not published or backed up anywhere else in this repo — if it is ever lost, it has to be rebuilt from the `/sgs-update` pipeline against the live block roster (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` confirms whether it's present and healthy). This is a last-resort, hours-not-minutes recovery path — treat the DB as irreplaceable in day-to-day work (back it up before any destructive experiment).

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

## Adding per-client theming

Per-client colour/typography snapshots live at `sites/<client>/theme-snapshot.json` and are deployed via `plugins/sgs-blocks/scripts/push-theme-snapshot.py`. Do NOT add per-client `.json` files to `theme/sgs-theme/styles/` — that directory is intentionally empty.

If the client needs CSS that cannot be expressed via tokens, add it to the client's `theme-snapshot.json` under `styles.css` OR to `sites/<client>/theme-overrides.css`. Never add client-specific CSS to `style.css`.

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

In `render.php`, resolve the stored value with `sgs_colour_value()` (`includes/helpers-tokens.php`), which turns a design-token slug into its CSS variable and passes a real CSS colour through. Never guard a CSS fallback colour with `:not([style*="color"])` — no SGS block emits an inline `style` property declaration, so that guard always matches (see `plugins/sgs-blocks/CLAUDE.md` "Colour controls").

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

Located in `includes/helpers-media.php`. Outputs a fully optimised `<img>` with:

- `srcset` and `sizes` attributes (through `wp_get_attachment_image()` when the attachment ID is known).
- `loading="lazy"` and `decoding="async"` by default.
- Explicit `width`/`height` resolved from the attachment metadata, so the browser reserves the space.
- The supplied alt text.

```php
echo sgs_responsive_image(
    $attachment_id,       // int — attachment post ID (0 when only a URL is known)
    $url,                 // string — image URL, used when there is no attachment ID
    $alt,                 // string — alt text
    'large',              // string — WordPress image size
    [
        'class'         => 'sgs-hero__image',
        'fetchpriority' => 'high',  // omit for lazy-loaded images
        'loading'       => 'eager',
    ]
);
```

For an above-the-fold hero image, the theme injects a `<link rel="preload" as="image">` tag into `<head>` (`functions.php`, `inc/font-preloading.php`) to shorten LCP.

---

## Extensions architecture

Extensions add capabilities to all blocks via the WordPress `editor.BlockEdit` filter. They live in `src/blocks/extensions/`.

```
extensions/
├── animation.js              # Scroll-triggered animation controls
├── responsive-visibility.js  # Per-device show/hide attributes + classes
├── conditional-visibility.js # "Visibility conditions" inspector panel
├── hover-effects.js          # Hover effect controls
├── custom-css.js             # Per-block scoped CSS field
└── index.js                  # Imports all extensions (the authoritative list)
```

### How extensions work

1. `index.js` is compiled to `build/extensions/index.js`.
2. `class-sgs-blocks.php` enqueues this bundle via `enqueue_block_editor_assets` so it loads once in the editor.
3. Each extension file calls `addFilter( 'editor.BlockEdit', 'sgs/...', withMyPanel )` to inject an extra InspectorControls panel into every block's settings panel.
4. For the **Responsive Visibility** and **Hover Effects** extensions, a corresponding PHP `render_block` filter in `includes/device-visibility.php` and `includes/hover-effects.php` applies the class or custom properties server-side so the output is correct on the frontend too.

### Adding a new extension

1. Create `src/blocks/extensions/my-extension.js` following the same pattern as `animation.js`.
2. Import it in `extensions/index.js`.
3. If the extension needs server-side output (e.g. injecting a CSS class), add a `render_block` filter in a new PHP file in `includes/` and require it from `sgs-blocks.php`.
4. Build: `npm run build`.

---

## Deployment process

**Deploy targets** (the `TARGETS` dict in `plugins/sgs-blocks/scripts/build-deploy.py`):

| Target | Site | Purpose |
|---|---|---|
| `sandybrown` (default) | `https://sandybrown-nightingale-600381.hostingersite.com` | The canary — pipeline canary (Mama's Munches) and framework verification. WP 7.1 |
| `indus-test` | `https://lavender-dinosaur-183533.hostingersite.com` | Dedicated Indus Foods test site. Opt-in: deploys only when named with `--target indus-test` |

**Why each client has its own site.** The active header, footer, drawer and theme-snapshot pointers are
single global options per WordPress site (`sgs_active_header_cpt_id`,
`sgs_active_footer_cpt_id`, `sgs_active_drawer_cpt_id`, and the theme snapshot). Two clients
cannot hold different active layouts on one site: activating an Indus header on the canary would
replace the Mama's Munches header sitewide. Indus Foods therefore builds on its own site. Another
client target is one `TARGETS` entry with `explicit_opt_in_required: True` (enforced in code).

**Reference site (READ ONLY):** `https://lightsalmon-tarsier-683012.hostingersite.com`

**SSH** (all targets share the one Hostinger account): `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias: `ssh hd`)

### Project credentials (discoverable — every session can use these directly, without asking Bean)

Gitignored; never committed.

| Path | What | Keys / loader |
|---|---|---|
| `.claude/secrets/sandybrown.env` | Canary (sandybrown-nightingale-600381.hostingersite.com) logins — ALWAYS available | `WP_USER_SANDYBROWN` + `WP_PWD_SANDYBROWN` (browser/admin login); `WP_APP_PWD_SANDYBROWN` (REST + WC Store-API Basic auth); `WP_URL_SANDYBROWN`. Use for Playwright editor login + REST verification: `grep KEY .claude/secrets/sandybrown.env` |
| `.claude/secrets/indus-test.env` | Indus test site (lavender-dinosaur-183533.hostingersite.com) logins | `WP_USER_INDUSTEST` + `WP_PWD_INDUSTEST` (browser/admin login); `WP_APP_PWD_INDUSTEST` (REST Basic auth); `WP_URL_INDUSTEST` |
| `.claude/secrets/credentials.yml` | General project credentials (YAML) | `import yaml; yaml.safe_load(open('.claude/secrets/credentials.yml'))` |

> **LiteSpeed:** LiteSpeed Cache is active on sandybrown (check any other target with `wp plugin list --status=active | grep -i litespeed`). `build-deploy.py` purges three cache layers after a deploy — OPcache (compiled PHP) through an HTTPS probe, because the CLI pool has its own OPcache, the LiteSpeed page cache (rendered HTML) through wp-cli, and the theme pattern cache (a pattern file added by a deploy registers only after it clears); clearing one does nothing for the others. For a manual purge after a CSS/render change run `wp litespeed-purge all`, reset OPcache (snippet below), and clear the Hostinger CDN (`hosting_clearWebsiteCacheV1`).

### Full deployment (ALL targets) — always via `build-deploy.py`

> **⛔ Use the script. Never hand-roll a tar/scp deploy.**
> A raw deploy has no dirty-file gate, no post-deploy check, and no rollback copy: an
> unfinished uncommitted edit reaches the live site and the deploy still reports success.
> `build-deploy.py` carries three defences: a scoped dirty gate, a fail-closed post-deploy
> smoke test, and a `.bak` rotation for one-command rollback.

```bash
# Canary (default — sandybrown)
python plugins/sgs-blocks/scripts/build-deploy.py

# Indus Foods test site
python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test
```

The script runs the pre-deploy `gate:full` tier, builds (from an isolated `git worktree` of
`HEAD` by default, so a concurrent session's build or uncommitted files cannot collide with the
deploy; `--no-isolate` opts out), tars, scps, extracts, rotates the previous copy to `<dir>.bak`,
cleans up, purges all three cache layers, then **GETs the site and fails the run if it is broken**.
Deploy a framework change to the canary first.

**The flags exist — know what you're giving up before using them:**

| Flag | What you lose |
|---|---|
| `--allow-dirty` | The dirty-file gate. Only use when you have READ the listed paths and know each one is safe. |
| `--skip-verify` | The only check that catches a deploy which breaks the site. |
| `--skip-gate-full` | The heavyweight pre-deploy gate tier. |
| `--skip-oldshape-audit` | The only check that catches a deploy whose schemas strand or delete stored content. |
| `--skip-purge` | Cache purge — the deploy lands, but warm caches keep serving the previous version. |

**Other flags (safe, not loss-of-safety):** `--payload <path>` (repeatable) deploys named uncommitted files without the blanket `--allow-dirty`; `--verify-url`, `--audit-scoped-page`, `--self-test`, `--theme-only`, `--blocks-only`, `--skip-build` exist for narrower workflows — read the script's `--help` for current usage.

**`--dry-run`** prints the commands each step would run and executes none of them: every deploy step passes `args.dry_run` to `run()`, which returns without executing. It also skips the dirty-tree gate, so a dry run cannot warn you about uncommitted files the next real deploy would carry.

**Ownership check (load-bearing, not optional):** a target is a shared checkout. `build-deploy.py` checks whether the deploy would overwrite live work not in your HEAD's ancestry and **refuses if so** — this is correct behaviour, not a bug. `--takeover` overrides it; only use when you've confirmed with whoever else is working on the target that it's safe to overwrite their state.

**Rollback (if a deploy breaks the site):**

```bash
# <host> is the target's host from TARGETS (e.g. sandybrown-nightingale-600381.hostingersite.com)
ssh hd 'WP=domains/<host>/public_html/wp-content && \
  mv $WP/plugins/sgs-blocks $WP/plugins/sgs-blocks.broken && \
  mv $WP/plugins/sgs-blocks.bak $WP/plugins/sgs-blocks'
# then reset OPcache (below) — the .bak is the copy from the PREVIOUS deploy
```

OPcache reset (CLI and web are separate pools):

```bash
ssh -p 65002 u945238940@141.136.39.73 "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/<host>/public_html/op-reset-tmp.php" && \
  curl -s https://<host>/op-reset-tmp.php && \
  ssh -p 65002 u945238940@141.136.39.73 "rm ~/domains/<host>/public_html/op-reset-tmp.php"
```

### Single-file patch — ⛔ don't

A bare `scp` of one file is how broken code reaches a live site with **zero**
gates and **no** rollback copy: no dirty check, no smoke test, no `.bak`. It
feels safer than a full deploy because it touches less — that is the trap.

Use `build-deploy.py` (add `--blocks-only` / `--theme-only` to narrow scope). If
you genuinely must hand-place one file — emergency rollback only — take a backup
first and verify the site afterwards:

```bash
# emergency only; back up, then verify
ssh hd 'cp $WP/path/to/file $WP/path/to/file.bak'
scp -P 65002 -i ~/.ssh/id_ed25519 path/to/file \
  u945238940@141.136.39.73:domains/<host>/public_html/wp-content/path/to/file
curl -s -o /dev/null -w '%{http_code}\n' "https://<host>/?cachebust=$RANDOM"   # expect 200
```

### Per-client theme snapshot deploy

`push-theme-snapshot.py` defaults `--target-domain` to the sandybrown canary, so **name the domain explicitly for any other site**:

```bash
# Canary (default domain)
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client mamas-munches --target u945238940@141.136.39.73

# Indus test site
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73 \
  --target-domain lavender-dinosaur-183533.hostingersite.com

# --no-push (alias --dry-run) prints the diff without pushing
```

### Fast-cycle deploys

`build-deploy.py` is also the fast-cycle path for iterative pipeline and converter work, where the
per-commit cadence is dictated by `/sgs-clone --debug-trace` measurement rather than full deploy
QA. The `/wp-sgs-deploy` skill governs *what must pass before* a production deploy (QC gates,
doc walk); it does not replace the script that performs it.

### Inheritance audit — container-wrapping blocks

`plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` detects which blocks wrap children via InnerBlocks (the "wraps children" model, a validated structural signal) and syncs `wraps_block` + `container_kind` into `block_composition`.

```bash
python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py
# --apply to write detected wraps_block + container_kind values into block_composition
```

**Roster size is DB-authoritative — query `/sgs-db`, do not cache a count.** Re-run via `/sgs-update` Stage (auto) or manually whenever block.json `supports.sgs.containerKind` changes.

### PowerShell equivalents (dev machine)

`build-deploy.py` is cross-platform; there is no PowerShell-specific deploy path.

```powershell
# The deploy IS the script — it builds, gates on a dirty tree, verifies fail-closed, rotates a .bak,
# and purges caches itself. Run from the project root.
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only   # or --theme-only

# Build alone (rarely needed separately — the script builds unless you pass --skip-build)
cd plugins/sgs-blocks ; npm run build ; cd ..\..
```

**Node/npm must run via PowerShell on this machine** (the nvm shim is broken in Git Bash).

**Run all commands from project root:** `C:\Users\Bean\Projects\small-giants-wp`

### What NOT to deploy

- `node_modules/` — not needed on the server
- `src/` — compiled output from `build/` is what WordPress uses
- `.gitignore`, `package.json`, `package-lock.json` — server does not need these
- `theme/sgs-theme/styles/*.json` — per-client snapshots live at `sites/<client>/theme-snapshot.json`

---

## WP-CLI

The `wp sgs` namespace is the developer and pipeline command surface for SGS sites: Site Info,
template-part seeding and reset, conditional header/footer rules, migrations, the CPT-backed
header / footer / drawer lifecycle (`wp sgs header|footer|drawer set-active | clear-active | list
| seed-starter`), and `wp sgs audit-colour-tokens`. It runs on the server over SSH (`ssh hd`),
and write commands need `--user=<id>`. Full reference: `.claude/specs/19-SGS-CLI-COMMANDS.md`
(Spec 19).

---

## Environment and tools

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v22.18.0 | Build tooling only — not on the server |
| @wordpress/scripts | 30.x | Handles webpack, eslint, format |
| WordPress | 7.1 | Block theme, no classic editor |
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

Commit straight to `main` and never open a pull request. Never `git stash`. Commit your own files with an explicit pathspec — never `git add -A` and never a glob, because this worktree is shared by many concurrent sessions. Integrate with `origin/main` (pull/rebase, push) after every completed task. Run `git branch --show-current` in the same command as the commit. A client-specific short-lived branch (`feat/<client>-*`) is merged back the same session. See project `CLAUDE.md` "Git workflow" for the full rules.

```powershell
cd C:\Users\Bean\Projects\small-giants-wp
git add plugins/sgs-blocks/src/blocks/my-block/block.json plugins/sgs-blocks/src/blocks/my-block/render.php   # name every path
git commit -m "feat: add my-block block"
git push
```

No CI/CD pipeline — deployment is `python plugins/sgs-blocks/scripts/build-deploy.py` (see §Deployment above). It is the only sanctioned path for every target.

### SGS DB queries (quick reference)

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats          # Framework health
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/hero  # Block details
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py match "pricing" # Find best block
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py context indus-foods # Load client
```

### DB schema notes

Row counts drift — query `/sgs-db` (or the generated DB catalogue below) rather than trusting a number in prose.

- **`blocks.tier`** — TEXT column, CHECK constraint `IN ('block', 'class-section', 'pattern')`. Populated by `/sgs-update` Stage 1 from each block's `supports.sgs.is_section_root` flag in `block.json`. Operator-set per block, not algorithmically inferred.
- **`block_composition`** — the container roster has `wraps_block` + `container_kind` populated (values `section|layout|content`).
- **`slots`** — composite PK on `(slot_name, scope)`; element-scope and section-scope rows. Role is derived from `property_suffixes`, not stored on the slot row.
- **`roles`** — base roles plus `scalar-media`. `INSERT OR REPLACE` from `_ROLE_CLASSIFICATION_MAP`.
- **`html_tag_to_core_block`** — idempotent migration at module load; the source of the atomic-tag map (no hardcoded dict).

### canonical_slot assignment

`assign-canonical.py` reads the `slots` + `roles` schema and backfills `canonical_slot`, `role` and `derived_selector`. Re-run after every slot-vocabulary addition:

```bash
python plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py
```

- **It writes the one physical `sgs-framework.db`.** uimax holds neither `block_attributes` nor `slots`; the `.claude` and `.agents` DB paths are the *same file* via an NTFS junction (not two copies) — so a single write reaches every path.
- **It is the deterministic mechanism for content-area `canonical_slot` tagging.** `assign-canonical.py` runs automatically as `/sgs-update` Stage 1; with the `content` element-slot row and the `Width`/`Padding`→`layout` `property_suffixes` rows in place, it tags the content-area attrs (`contentWidth`/`contentPadding*`/`contentMaxWidth*`) `content`/`layout` deterministically — no manual seed step.

---

## Tooling catalogue — every gate, audit and codemod

This section is **GENERATED**. Do not hand-edit it — edits are overwritten.

It exists because "I could not find a tool for that" has repeatedly meant "I looked
in one of the script directories". There is more than one, and the big one holds
hundreds of files. Before building any new checker, codemod or audit, read this
section and grep every directory listed in it.

Derived from the build chain (the `prebuild` generators plus the `plugins/sgs-blocks/scripts/gates.json`
roster run by `scripts/run-gates.py`, in execution order), the commit-time chain
`.githooks/sgs-gates.sh`, and each script's own header. These sources are the truth rather
than a copy of it, which is why this can be regenerated instead of maintained. `--check` fails
if it is stale.

<!-- TOOLING-CATALOGUE:START -->

### Where the tooling lives — **plural, and that matters**

Searching one directory and concluding a tool does not exist is a live
failure mode here — it is how something gets rebuilt that already existed.
Check every row before building anything new.

| Directory | Runnable files | Holds |
|---|---|---|
| `scripts/` | 20 | repo-wide tooling (naming lint, site utilities) |
| `plugins/sgs-blocks/scripts/` | 777 | **the bulk** — every gate, audit, codemod, DB and pipeline tool |
| `.claude/scripts/` | 2 | working-area helpers |
| `.claude/hooks/` | 13 | session + commit hooks (handoff preflight, doc gates) |
| `.claude/skills/wp-sgs-deploy/scripts/` | 0 | deploy-skill helpers |

Worktrees under `.claude/worktrees/` mirror this tree — never cite them as a source.

### The prebuild gate chain — what actually blocks a build

Derived from `package.json`'s `prebuild` PLUS `scripts/gates.json`, in execution order. ⛔ **These are TWO tiers, not one chain.** The five generators and the `fast` tier run on every build. The `full` tier — `pytest-oracle-converter`, `inspector-scan-run`, `audit-block-file-consistency` — was measured at 76.1% of the old chain's time and now runs PRE-DEPLOY only, via `build-deploy.py`'s `step_gate_full()`. Every gate that blocked before still blocks; only the timing changed. Run `npm run gate:list` for each gate's tier and measured cost, and `npm run gate:wired` to prove the `full` tier is still reachable. This chain is
what `npm run build` runs first, and what every `/handoff` and deploy relies on.
Each entry's purpose is quoted from the script's own header.

| # | Script | Purpose (from its own header) |
|---|---|---|
| 1 | `build-roster.py` | Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB. |
| 2 | `generate-icons.js` | Generates includes/lucide-icons.php from lucide-static SVG files. |
| 3 | `generate-extension-attributes.js` | Single source of truth for the cross-block `sgs*` editor-extension attributes. |
| 4 | `generate-svg-allowlist.js` | Single source of truth for the SVG sanitiser allowlist, PHP -> JS. |
| 5 | `generate-media-attributes.mjs` | Single source of truth for the media attribute TYPE map, JS -> PHP. |
| 6 | `generate-media-stylesheet.mjs` | Concatenate the media-atom CSS partials into the one enqueued stylesheet. |
| 7 | `run-motion-fx-generators.js` | motion-fx generator chain (seed-motion-fx-registry.py, generate-fx-effects-php.py, generate-fx-qualifying-blocks.py). |
| 8 | `run-consistency-gates.py` | Single orchestrator for the SGS blocks consistency-gate suite. Runs a fixed |
| 9 | `check-fx-list-drift.py` | the three-list (plus field-type triad) fx drift gate. |
| 10 | `check-dead-controls.js` | STRUCTURAL GUARD (HC2, 2026-06-08) — stops the "dead control" class of bug from regressing. A dead control is an editor control a client can change that… |
| 11 | `check-dead-pattern-attrs.py` | Find block attributes in theme patterns/parts that WordPress silently DISCARDS |
| 12 | `check-shared-panel-schema.js` | STRUCTURAL GUARD — closes the gap in the "dead control" family that check-dead-controls.js (control exists, nothing renders it) and… |
| 13 | `check-empty-inspector-containers.js` | STRUCTURAL GUARD — an inspector container rendered with NO children. |
| 14 | `check-wrapper-capability-preconditions.js` | STRUCTURAL GUARD for the shared-wrapper capability declarations in each block's `supports.sgs` — Spec 35A §F.2.1 + §F.2.2 (D637, step 7 of the… |
| 15 | `survey-background-colour-support.py` | Track A completion audit — native colour/gradient background support. |
| 16 | `check-image-controls-support.py` | Standing defence for the `imageControls` "declared-but-unverified capability" |
| 17 | `survey-control-parity.py` | do SGS inspector controls look like NATIVE WordPress? |
| 18 | `check-hardcoded-render-defaults.js` | STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of bug (F3) from regressing. An F3 violation occurs when a block declares an… |
| 19 | `check-dead-api-calls.py` | STRUCTURAL GUARD — catches a call to a PHP/WordPress/WooCommerce function |
| 20 | `check-control-ux.js` | STRUCTURAL GUARD (Step 7a, 2026-06-11) — prevents the two editor anti-patterns that produce a sub-standard inspector UX: |
| 21 | `survey-experimental-imports.js` | ONE DETECTOR, THREE MODES (D542, Bean-locked): |
| 22 | `check-product-search-guards.js` | STATIC PRE-FLIGHT GUARD for the product-search REST endpoint. |
| 23 | `check_schema_drift.py` | Detect drift between the committed ``schema.sql`` and the live database's DDL. |
| 24 | `check_value_identity.py` | Assert that named, load-bearing DB rows still hold the EXACT value they must. |
| 25 | `capture_seed_data.py` | Capture the Phase-1 Group-5 seed tables from a LIVE database into data files. |
| 26 | `run.py` | F6 DB-as-code consistency suite shared runner. |
| 27 | `lint-responsive-controls.py` | FR-36-24 structural gate (R-31-9 for responsive controls). |
| 28 | `check-tier-storage-shape.py` | Find per-device attribute families that are HALF-MIGRATED between storage shapes. |
| 29 | `check-inert-controls.py` | Find block attributes that are OVERWRITTEN in render.php before being used. |
| 30 | `check-undeclared-attrs.py` | Find block attributes destructured in edit.js that WordPress silently DISCARDS. |
| 31 | `check-undefined-refs.js` | THE GAP THIS CLOSES. On 2026-08-22 three blocks shipped broken editors: sgs/text, sgs/quote and sgs/testimonial referenced `borderColourHover` /… |
| 32 | `check-render-undefined-vars.py` | Undefined-variable gate for block render templates (PHPStan level 1). |
| 33 | `run.py` | F5 cheat-detection gate runner. |
| 34 | `run.py` | F5 excluded-literal tripwire gate for the SGS cloning pipeline. |
| 35 | `coverage_check.py` | ledger.coverage_check — F5 pipeline-close coverage-conservation gate (UNACCOUNTED leg). |
| 36 | `check-atomic-slug-literals.py` | STRUCTURAL GUARD (FR-22-3, 2026-06-13) — prevents new per-block `if slug ==` |
| 37 | `declare_input.py` | ledger.declare_input — F2 draft-derived CSS Accounting Ledger (input parser). |
| 38 | `audit-inline-styling.js` | WIRED INTO `prebuild` AS A REAL GATE — `node scripts/audit-inline-styling.js --check` runs on every `npm run build` and sets `process.exitCode = 1` on any… |
| 39 | `check-id-scoped-emits.js` | STRUCTURAL GUARD — ID-scoped CSS selector emissions. |
| 40 | `check-text-gradient-companion.js` | THE TRAP THIS GATE CATCHES. `sgs_text_decls()` (`includes/helpers-colour- variants.php`) returns `color:` DECLARATIONS ONLY. When a text GRADIENT is in… |
| 41 | `check-preset-token-naming.py` | STRUCTURAL GATE — Spec 32 FR-32-9 (Naming Convention) self-verifier. |
| 42 | `check-palette-slug-refs.py` | every referenced colour slug must actually exist. |
| 43 | `check-box-family-guard.py` | STRUCTURAL GUARD — box-object interface contract (2026-07-09 plan §6). |
| 44 | `check-jsonld-flags.py` | guard the ONE json_encode flag combination that is unsafe. |
| 45 | `remove-vacuous-style-engine-guard.py` | Delete the vacuous `function_exists( 'wp_style_engine_get_styles' )` guard. |
| 46 | `check-no-core-blocks.py` | Prebuild gate: NO banned core blocks in theme pattern/part/template FILES. |
| 47 | `check-no-inline.py` | Anti-regression GATE for the framework-wide inline-zero win (Spec 32 FR-32-1 / |
| 48 | `check-stranded-guards.py` | Anti-regression GATE for STRANDED inline-style guards (Spec 32). |
| 49 | `check-shared-css-state-rules.js` | STRUCTURAL GUARD — stops the "state-only shared-CSS size literal" class of bug from regressing. This is the class of defect that shipped LIVE on… |
| 50 | `check-element-manifest-conformance.js` | Spec 35 Task 2 — the CLUSTER-COHERENCE rule, made computable. |
| 51 | `audit-feature-parity.py` | Spec 35 UNIT A — feature-parity audit. |
| 52 | `audit-declared-vs-seeded-roles.py` | Audit: which `sgs/%` attributes LACK A MECHANISM that reaches them — the D497 gate. |
| 53 | `check-universal-fit.js` | WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension |
| 54 | `check-duplicate-controls.js` | STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug: the SAME setting exposed to the client through TWO different editor controls… |
| 55 | `check-simple-surface-cap.js` | FR-37-27 (Spec 37, .claude/specs/37-HEADER-FOOTER-BUILDER.md) — the SIMPLE SURFACE CAP, made computable. The Simple surface (`sgs/site-header` and… |
| 56 | `audit-block-uniformity.py` | SGS Block Uniformity Audit |
| 57 | `check-editor-render-parity.js` | NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate in this repo catches: "a control is set up correctly on ONE side (editor OR… |
| 58 | `check-ksort-before-hash.py` | STOP-NO-KSORT gate — never reorder $attributes before it is hashed into a uid. |
| 59 | `check-tier-object-cast.py` | Tier-object-cast gate — never coerce a whole object-typed attribute to a string. |
| 60 | `check-single-instance-invariants.py` | Single-instance invariant register — four named prohibitions, one shared mechanism. |
| 61 | `check-withdrawn-figures.py` | a figure withdrawn in one file stays withdrawn everywhere. |
| 62 | `migrate-length-sanitiser.py` | Move every LENGTH-valued call site from the crude sanitiser to the hardened one. |
| 63 | `run-gates.py` | the consolidated gate runner. |
| 64 | `check-doc-citations.py` | a `file:line` citation in a doc must land on what it names. |
| 65 | `migrate-tier-object.py` | collapse a flat per-device attribute trio into ONE tier object. |
| 66 | `lint-patterns-for-personal-data.py` | Lint SGS pattern PHP files for hardcoded personal data. |
| 67 | `font-source-audit.js` | Font source audit — static analysis for external CDN URLs in theme.json fontFace declarations. |
| 68 | `migrate-render-closures.py` | Adopt the shared render helpers in place of per-file inline sanitiser closures. |
| 69 | `migrate-theme-native-spacing.py` | Migrate hand-authored `style.spacing` to the block-OWNED padding/margin attrs. |
| 70 | `migrate-shadow-mounts.js` | WHY. ShadowControl was parameterised by VALUES AND CALLBACKS: six props hand-wired at every mount, where GradientOverlayControl's callers pass one map.… |
| 71 | `fanout-overlay-sibling-attrs.py` | D6 (hover + responsive-tier siblings) and |
| 72 | `check-child-lift.py` | check-child-lift — every child-lift rule in the tree stays at ZERO specificity. |
| 73 | `check-fx-registration.py` | every shipped fx module is registered everywhere it must be. |
| 74 | `check-colour-preview-resolver.js` | check-colour-preview-resolver — the editor canvas must resolve a colour the same way the server does. |
| 75 | `check-border-style-without-width.py` | the "no width = no border" detector. |
| 76 | `check-control-helper-parity.py` | Which shared controls ship the standard helper pair, and which still don't. |
| 77 | `survey-border-control-migration.py` | Classify every block's border UI against the SgsBorderControl target shape. |
| 78 | `migrate-border-shape-b.js` | ⛔ THIS IS NOT A BRANCH OF migrate-border-control.js. That script's header declares a hard Shape-B exclusion, on the stated grounds that "there is no… |
| 79 | `check-hover-state-classification.py` | Gate: a `*Hover` attribute that carries a real CSS property MUST be classified |
| 80 | `verify-transform.mjs` | Verify the PRODUCTION transform maths against ground truth from the rig. |
| 81 | `test-sanitise-svg.mjs` | Standing gate for the editor SVG sanitiser (src/utils/sanitise-svg.js). |
| 82 | `test-media-attr-parity.mjs` | Standing gate: the L1 media-naming helpers must agree ACROSS LANGUAGES. |
| 83 | `test-media-injection-parity.mjs` | Standing gate: the JS injection filter and the PHP registration filter must inject the SAME attribute set for the same supports.sgs.mediaElements… |
| 84 | `check-media-breakpoints.js` | Gate: the media-element stylesheet's breakpoints must match the ONE source. |
| 85 | `test-media-atom-parity.mjs` | Standing gate: for every media ATOM, the JS value-setter and the PHP value- setter must emit BYTE-IDENTICAL custom-property declarations for a fixed… |
| 86 | `check-media-atom-purity.js` | Gate: a media atom's LOGIC module must be importable by plain Node. |
| 87 | `check-media-disclosure-coverage.js` | Gate: every media atom's `disclosure()` is exercised against REAL fixtures derived from its own `requires` map in registry.js — not a static scan. |
| 88 | `check-enum-control-shape.py` | the D812 enum control-shape GATE. |
| 89 | `test-hover-state-guard.mjs` | Gate wrapper for the touch-safe hover emitter's PHP self-test. |
| 90 | `check_preset_absence_no_slug_literal.py` | scoped static gate for |
| 91 | `migrate-orchestrator-rename.py` | Rename converter/orchestrator.py -> converter/dispatch_spine.py, and every |
| 92 | `audit-bindable-attrs.py` | C15-5/C15-12 detector: which SGS block attributes are SAFE Block Bindings targets? |
| 93 | `wire-border-contrast.js` | (a WCAG 3:1 border-contrast warning, built and working on the component itself — see `src/components/SgsBorderControl.js`) into every block's `edit.js`… |
| 94 | `check-colour-attr-css-property.py` | D962-adjacent gate: no colour attribute may reach the DB with a NULL/empty |
| 95 | `check-render-tier-object-spacing.py` | GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0 |
| 96 | `logical-props-lint.py` | RTL-readiness lint for the SGS nav blocks |
| 97 | `classify-end-shape.js` | WHY THIS EXISTS (2026-09-06, colour-conformance). Adversarial-council pre-mortem (6/6 personas graded D) found survey.js's AUTOFIXABLE verdict is… |
| 98 | `check-style-blob-sanitisation.py` | Gate: every render.php `<style>` blob echo must pass through wp_strip_all_tags(). |
| 99 | `check-ungated-paint-rules.py` | STRUCTURAL GUARD (WARN-ONLY for this build) — Spec 41 FR-41-35 / gate §11 G20c. |
| 100 | `audit-serverside-render-disabled.js` | Finds every `<ServerSideRender` JSX usage across `src/blocks/*\/edit.js` and flags any that is NOT wrapped in `<Disabled>` (from `@wordpress/components`)… |
| 101 | `run.js` | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=spec evidence=this is the entry point described in… |
| 102 | `audit-block-file-consistency.py` | WHOLE-BLOCK CROSS-FILE CONSISTENCY CHECKER. |

**102 gating scripts.** Regenerate this whole section with:

```bash
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py
```

### I/O inventory — what each prebuild + commit-gate script reads/writes

Scope: every script actually executed by the **prebuild chain** (102 resolved scripts) and the **commit-gate chain** (`.githooks/sgs-gates.sh`, 14 resolved scripts) — 114 unique scripts after de-duplication (2 run in both chains). This is the set that runs automatically, so it is the set documented with inputs/outputs first; the other ~450 scripts in the full library below are NOT covered here.

Every field below is extracted from the script's own executable code (regex over `open()`/`.read_text()`/`.write_text()`/`fs.readFileSync`/`fs.writeFileSync`/`sqlite3.connect()`/SQL keywords/argparse/`sys.exit()`/`process.exitCode`) — **never from a docstring or comment**, per this generator's own stale-header finding above. A script with no recognised call shape (e.g. I/O built dynamically, or delegated to a helper module) shows **UNVERIFIED** rather than an invented mechanism. `Read-only` is stated explicitly whenever no write call site was found at all.

**`plugins/sgs-blocks/scripts/audit-bindable-attrs.py`** (build)
- Path constants: `ROOT` = pathlib.Path(__file__).resolve().parent.parent
- Reads: `BINDINGS_SUPPORT_PHP`, `block_json_path`, `php_file`, `render_php`, `sibling`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--fix`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/audit-block-file-consistency.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `PLUGIN_DIR` = SCRIPT_DIR.parent; `REPO_ROOT` = PLUGIN_DIR.parent.parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/audit-block-uniformity.py`** (build+commit)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: 2

**`plugins/sgs-blocks/scripts/audit-declared-vs-seeded-roles.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `SRC_BLOCKS` = SCRIPT_DIR.parent / "src" / "blocks"
- Reads: `OVERRIDES_PATH`, `sqlite3:f"file:{SGS_DB}?mode=ro"`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/audit-feature-parity.py`** (build)
- Path constants: `HERE` = Path(__file__).parent
- Reads: `EXCEPTIONS`, `ROSTER`, `sqlite3:str(DB_PATH`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes, block_supports
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/audit-inline-styling.js`** (build)
- Reads: `blockJsonPath`
- Writes: `OUT_JSON`, `OUT_MD`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/cheat-gate/run.py`** (build)
- Reads: `_BASELINE_PATH`, `sqlite3:str(_DB_PATH`
- Writes: `_BASELINE_PATH`
- CLI flags read: `--check`, `--report`, `--run-dir`, `--update-baseline`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-atomic-slug-literals.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).parent
- Reads: `CONVERT_PY`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: 0, 1, 2

**`plugins/sgs-blocks/scripts/check-blockjson-metadata-only.py`** (commit)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-border-style-without-width.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `PLUGIN` = REPO / "plugins" / "sgs-blocks"; `BASELINE` = Path(__file__).with_name("border-style-without-width-baseline.json")
- Reads: `BASELINE`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-box-family-guard.py`** (build)
- Reads: `_BASELINE_PATH`
- Writes: `_BASELINE_PATH`
- CLI flags read: `--check`, `--report`, `--update-baseline`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-child-lift.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-colour-attr-css-property.py`** (build)
- Path constants: `ROOT` = pathlib.Path(__file__).resolve().parent
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-colour-preview-resolver.js`** (build)
- Reads: `TOKENS`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-control-helper-parity.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parent.parent; `BASELINE` = Path(__file__).resolve().parent / "control-helper-parity-baseline.json"
- Reads: `BASELINE`, `edit`, `php`
- Writes: `BASELINE`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-control-ux.js`** (build)
- Reads: `BASELINE_FILE`, `blockJsonPath`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-dead-api-calls.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `fixture_php`
- CLI flags read: `--check`, `--json`, `--php-binary`, `--report`, `--self-test`, `--update-baseline`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-dead-controls.js`** (build)
- Reads: `BASELINE_FILE`, `blockJsonPath`, `fixturePath`
- Writes: `fixturePath`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `THEME_DIR` = REPO / 'theme' / 'sgs-theme'
- Reads: `FX_QUALIFYING_BLOCKS_PATH`, `bj`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-doc-citations.py`** (build)
- Reads: `doc`, `src`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-duplicate-controls.js`** (build)
- Reads: `BASELINE_FILE`, `editJsPath`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-editor-canvas-css.py`** (commit)
- Reads: `bj`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-editor-only.py`** (commit)
- Reads: `bj`, `full`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-editor-render-parity.js`** (build)
- Reads: `BASELINE_FILE`, `blockJsonPath`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-element-manifest-conformance.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exitCode=0, exitCode=1

**`plugins/sgs-blocks/scripts/check-empty-inspector-containers.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-enum-control-shape.py`** (build)
- Path constants: `PLUGIN` = Path(__file__).resolve().parent.parent; `BASELINE_PATH` = Path(__file__).resolve().parent / "check-enum-control-shape-baseline.json"
- Reads: `BASELINE_PATH`, `edit`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-fx-list-drift.py`** (build)
- Reads: `dest_path`
- Writes: `temp.fx_js`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-fx-registration.py`** (build)
- Reads: `blank.registry_path`, `blank.webpack_path`, `target_path`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: 1

**`plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js`** (build)
- Reads: `BASELINE_FILE`, `blockJsonPath`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/check-hover-state-classification.py`** (build)
- Reads: `sqlite3:f"file:{SGS_DB}?mode=ro"`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-id-scoped-emits.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-inert-controls.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `INCLUDES_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'includes'; `COMPONENTS_JS` = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'inspector-scan' / 'core' / 'components.js'
- Reads: `SHARED_CONTROLS_JS`, `bj`, `edit_js`, `facade_path`, `panel_file`, `render_php_path`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-interaction-only-css.py`** (commit)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-jsonld-flags.py`** (build)
- Reads: `bad`
- Writes: `bad`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-ksort-before-hash.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `fixture`
- Writes: `tmp_path`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-markup-neutral.py`** (commit)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-media-atom-purity.js`** (build)
- Reads: `loader`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-media-breakpoints.js`** (build)
- Reads: `CSS`, `JS_SRC`, `PHP_SRC`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-media-disclosure-coverage.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/check-no-core-blocks.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `MIG` = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'migrate-core-blocks'; `THEME` = REPO / 'theme' / 'sgs-theme'
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-palette-slug-refs.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-preset-token-naming.py`** (build)
- Reads: `snapshot_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`, `--survey`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-product-search-guards.js`** (build)
- Reads: `TARGET`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-render-tier-object-spacing.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `PLUGIN_DIR` = SCRIPT_DIR.parent
- Reads: `BASELINE_FILE`, `block_json_path`, `render`
- Writes: `BASELINE_FILE`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/check-render-undefined-vars.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `FIXTURE_FILE`
- Writes: `FIXTURE_FILE`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-shared-css-state-rules.js`** (build)
- Reads: `BASELINE_FILE`, `fullPath`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1), exitCode=0, exitCode=1

**`plugins/sgs-blocks/scripts/check-shared-panel-schema.js`** (build)
- Reads: `blockJsonPath`, `editPath`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-simple-surface-cap.js`** (build)
- Reads: `target.file`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-single-instance-invariants.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `MEGA_PANEL_STYLE`, `PRODUCT_CARD_RENDER`, `SITE_HEADER_RENDER`, `TESTIMONIAL_SLIDER_RENDER`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-style-blob-sanitisation.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-text-gradient-companion.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/check-tier-object-cast.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parent.parent
- Reads: `block_json_path`, `fixture`, `render_path`
- Writes: `tmp_render`
- CLI flags read: `--check`, `--self-test`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-tier-storage-shape.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
- Reads: `bj`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-token-rename-neutral.py`** (commit)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `BLOCKS` = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-undeclared-attrs.py`** (build)
- Path constants: `REPO` = pathlib.Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `COMPONENTS_JS` = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'inspector-scan' / 'core' / 'components.js'
- Reads: `bj`, `block_json`, `edit_file`, `ext_file`, `gallery_edit`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-undefined-refs.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`** (build)
- Reads: `bj`, `render_path`, `style_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--block`, `--check`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/check-universal-fit.js`** (build)
- Reads: `BASELINE_FILE`, `ROSTER_FILE`, `blockJsonPath`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/check-withdrawn-figures.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `tmp`
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Env vars read: `SGS_REPO`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/check-wrapper-capability-preconditions.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/colour-codemod/classify-end-shape.js`** (build)
- Reads: `blockJsonFile`, `childJsonPath`, `childRenderPath`, `phpPath`, `renderFile`, `viewFile`
- Writes: `OUT_PATH`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/colour-codemod/migrate-shadow-mounts.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/colour-codemod/wire-border-contrast.js`** (build)
- Reads: `editPath`, `plan.editPath`, `planned.editPath`
- Writes: `tmp`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/consistency/audit-serverside-render-disabled.js`** (build)
- Reads: `blockJsonPath`
- Writes: `OUT_JSON`, `OUT_MD`
- Non-zero exit sites found: exitCode=1

**`plugins/sgs-blocks/scripts/consistency/build-roster.py`** (build)
- Path constants: `OUT` = Path(__file__).parent / "roster.json"; `BLOCKS_DIR` = Path(__file__).parent.parent.parent / "src" / "blocks"
- Reads: `css_path`, `out_path`, `sqlite3:str(DB_PATH`
- Writes: `OUT`, `tmp_out`
- DB tables (sgs-framework.db): block_attributes, block_supports, blocks, sqlite_master
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/consistency/run-consistency-gates.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/converter/gates/check_preset_absence_no_slug_literal.py`** (build)
- Reads: `_TARGET`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/db-consistency/run.py`** (build)
- Reads: `sqlite3:str(_DB_PATH`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--report`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/dbschema/capture_seed_data.py`** (build)
- Path constants: `HERE` = Path(__file__).resolve().parent; `DATA` = HERE.parent / "data"; `DEFAULT_DB` = Path(
- Reads: `sqlite3:db`, `sqlite3:f"file:{db}?mode=ro"`, `target`
- Writes: `target`
- CLI flags read: `--check`, `--db`, `--self-test`, `--write`
- Env vars read: `SGS_FRAMEWORK_DB`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/dbschema/check_schema_drift.py`** (build)
- Path constants: `HERE` = Path(__file__).resolve().parent
- Reads: `schema_sql`, `sqlite3:f"file:{live_db}?mode=ro"`, `sqlite3:f"file:{live_path}?mode=ro"`, `sqlite3:str(mutated_both`, `sqlite3:str(mutated_col`, `sqlite3:str(mutated_tbl`, `sqlite3:str(schema_tmp`, `sqlite3:str(target`, `sqlite3:str(tmp`
- Writes: `schema_sql`
- DB tables (sgs-framework.db): sqlite_master
- CLI flags read: `--check`, `--live-db`, `--regenerate`, `--schema`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/dbschema/check_value_identity.py`** (build)
- Reads: `sqlite3:f"file:{db_path}?mode=ro"`, `sqlite3:f"file:{live_db}?mode=ro"`, `sqlite3:str(db_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--live-db`, `--self-test`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/excluded-gate/run.py`** (build)
- Reads: `_BASELINE_PATH`, `sqlite3:str(_DB_PATH`
- Writes: `_BASELINE_PATH`
- CLI flags read: `--check`, `--report`, `--update-baseline`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/fanout-overlay-sibling-attrs.py`** (build)
- Path constants: `BLOCKS_DIR` = Path(__file__).resolve().parent.parent / 'src' / 'blocks'
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/generate-extension-attributes.js`** (build)
- Reads: `OUT_FILE`
- Writes: `OUT_FILE`
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/generate-icons.js`** (build)
- Reads: `OUTPUT_FILE`, `WP_ICONS_PHP`
- Writes: `OUTPUT_FILE`
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/generate-media-attributes.mjs`** (build)
- Reads: `OUT_FILE`
- Writes: `OUT_FILE`
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/generate-media-stylesheet.mjs`** (build)
- Reads: `OUT`, `basePath`
- Writes: `OUT`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/generate-svg-allowlist.js`** (build)
- Reads: `OUT_FILE`
- Writes: `OUT_FILE`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/generative-background/verify-transform.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(1)

**`plugins/sgs-blocks/scripts/inspector-scan/run.js`** (build+commit)
- Reads: `RULES_JSON_PATH`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(0), exit(1)

**`plugins/sgs-blocks/scripts/ledger/coverage_check.py`** (build)
- Reads: `_BASELINE_PATH`, `artefact`, `fpath`, `sqlite3:str(db_path`
- Writes: `_BASELINE_PATH`
- DB tables (sgs-framework.db): excluded_properties
- CLI flags read: `--check`, `--conformance-dir`, `--db`, `--fixtures-dir`, `--no-conformance`, `--report`, `--update-baseline`, `--with-landed`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/ledger/declare_input.py`** (build)
- Reads: `agg_path`, `content_agg_path`, `content_golden_path`, `fpath`, `golden_path`
- Writes: `agg_path`, `content_agg_path`, `content_out_path`, `out_path`
- CLI flags read: `--check`, `--fixtures-dir`, `--out-dir`, `--reason`, `--regenerate`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/lint-responsive-controls.py`** (build)
- Path constants: `REPO_ROOT` = Path(__file__).resolve().parents[3]  # .../small-giants-wp
- Reads: `COMPONENTS_INDEX`, `edit_js`, `module_file`
- Writes: `fixture_file`
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--check`, `--db-context`, `--quiet`, `--self-test`
- Non-zero exit sites found: 0

**`plugins/sgs-blocks/scripts/lints/bem-lint.py`** (commit)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--json`, `--mode`, `--self-test`, `path`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/lints/token-lint.py`** (commit)
- Reads: `html_path`, `style_variation_path`, `tmp_path`
- Writes: `json.dump->fh`, `json.dump->tmp`, `style_variation_path`
- CLI flags read: `--apply-to`, `--dry-run`, `--inline-styles`, `--json`, `--mode`, `--no-new-tokens`, `--self-test`, `--theme`, `--variation`, `path`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-border-shape-b.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `bjPath`, `editPath`, `phpPath`
- Non-zero exit sites found: exit(0)

**`plugins/sgs-blocks/scripts/migrate-length-sanitiser.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-orchestrator-rename.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: `tmp`
- CLI flags read: `--apply`, `--check`, `--fix`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/migrate-render-closures.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--only`, `--self-test`, `--skip`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-theme-native-spacing.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `THEME` = REPO / "theme" / "sgs-theme"; `BLOCKS` = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"
- Reads: `bj`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/migrate-tier-object.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'; `INCLUDES_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'includes'
- Reads: `_bare_bj`, `_bj`, `bj`, `ej`, `rp`, `sqlite3:f'file:{SGS_DB}?mode=ro'`
- Writes: `bj`, `ej`
- DB tables (sgs-framework.db): block_attributes
- CLI flags read: `--all-properties`, `--apply`, `--check`, `--check-db-parity`, `--fix`, `--json`, `--property`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/nav-qa/logical-props-lint.py`** (build)
- Path constants: `SCRIPT_DIR` = Path(__file__).resolve().parent; `SGS_BLOCKS_ROOT` = SCRIPT_DIR.parent.parent  # plugins/sgs-blocks/
- Reads: `BASELINE_PATH`, `css`
- Writes: `BASELINE_PATH`, `css`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/no-inline/check-no-inline.py`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--deep`, `--live`, `--live-default`, `--no-deep`, `--selftest`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/no-inline/check-stranded-guards.py`** (build)
- Path constants: `BLOCKS_DIR` = Path(__file__).resolve().parent.parent.parent / "src" / "blocks"
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--selftest`
- Non-zero exit sites found: SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/remove-vacuous-style-engine-guard.py`** (build)
- Path constants: `ROOT` = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
- Reads: `header`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--fix`, `--only`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/run-gates.py`** (build)
- Reads: `_BUILD_DEPLOY`, `_GATES_JSON`
- Writes: `_GATES_JSON`, `tmp`, `tmp2`
- CLI flags read: `--assert-wired`, `--list`, `--no-write`, `--only`, `--self-test`, `--tier`, `--time`, `-v`
- Non-zero exit sites found: 0, 1, SystemExit(non-zero on failure)

**`plugins/sgs-blocks/scripts/run-motion-fx-generators.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/survey-border-control-migration.py`** (build)
- Path constants: `ROOT` = _find_repo_root(os.path.dirname(__file__))
- Reads: `os.path.join(synthetic_dir`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/surveys/check-image-controls-support.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[4]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
- Reads: `bj_path`, `render_path`, `save_path`, `style_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/surveys/survey-background-colour-support.py`** (build)
- Path constants: `REPO` = Path(__file__).resolve().parents[4]; `BLOCKS_DIR` = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
- Reads: `bj_path`, `render_path`
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--check`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: 0, 1

**`plugins/sgs-blocks/scripts/surveys/survey-control-parity.py`** (build)
- Path constants: `PLUGIN_ROOT` = Path(__file__).resolve().parents[2]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--apply`, `--check`, `--exclude`, `--fix`, `--json`, `--self-test`, `--survey`
- Non-zero exit sites found: 1

**`plugins/sgs-blocks/scripts/surveys/survey-experimental-imports.js`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-hover-state-guard.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: exit(2)

**`plugins/sgs-blocks/scripts/tests/test-media-atom-parity.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-media-attr-parity.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-media-injection-parity.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test-sanitise-svg.mjs`** (build)
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/tests/test_converter_conformance.py`** (commit)
- Reads: `_QUARANTINE_PATH`, `golden_path`, `html_path`, `sqlite3:_SGS_DB_PATH`
- Writes: **read-only** — no write call site found in source
- DB tables (sgs-framework.db): block_attributes, slots
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`plugins/sgs-blocks/scripts/visual-report-sha.py`** (commit)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites found: 0, 1, 2

**`plugins/sgs-blocks/scripts/wp-pre-merge-gate.py`** (commit)
- Path constants: `REPO` = Path(__file__).resolve().parents[3]; `SGS_BLOCKS_DIR` = REPO / "plugins" / "sgs-blocks"
- Reads: UNVERIFIED (no recognised read call site found)
- Writes: **read-only** — no write call site found in source
- CLI flags read: `--hooks`, `--soft`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`scripts/css-pattern-audit.js`** (commit)
- Reads: `filePath`
- Writes: `args.report`
- Non-zero exit sites found: exit(0)

**`scripts/font-source-audit.js`** (build)
- Reads: `filePath`
- Writes: `args.report`
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)

**`scripts/lint-patterns-for-personal-data.py`** (build)
- Reads: `file_path`
- Writes: **read-only** — no write call site found in source
- Non-zero exit sites: UNVERIFIED (none found by regex — may exit via an uncaught exception, or always exit 0)


### The full library — grep this BEFORE building or hand-doing anything

Every runnable script, with the purpose its own author wrote and HOW IT
RUNS - npm / commit-gate / hook / skill / manifest / script-call /
test-import / dynamic. A dash means NO execution path was found, which is
a QUESTION (superseded, or built and forgotten?) and never a verdict.
Before writing a new checker, codemod, census, probe or audit — or before
doing that work by hand — search this list. Adapting one of these is nearly
always cheaper than a fresh build plus its brainstorm, QC and tests.

⚠ The naming is not consistent — the same idea appears as `census-*`,
`survey-*`, `audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`. Grep
for the SUBJECT (colour, gradient, token, element, inline, parity), never
for the verb you happen to have in mind.

#### `plugins/sgs-blocks/scripts/` — 693 scripts

| Script | Wired | Purpose (its own words) |
|---|---|---|
| `add-control.js` | manifest+script-call | hand-kept copies of the attribute names: block.json, edit.js, render.php. |
| `assert-comment-only-diff.py` | manifest | Assert a diff changed COMMENTS ONLY — no executable code. |
| `audit-bindable-attrs.py` | manifest+npm | C15-5/C15-12 detector: which SGS block attributes are SAFE Block Bindings targets? |
| `audit-block-file-consistency.py` | manifest+script-call | WHOLE-BLOCK CROSS-FILE CONSISTENCY CHECKER. |
| `audit-block-uniformity.py` | commit-gate+manifest+script-call | SGS Block Uniformity Audit |
| `audit-declared-vs-seeded-roles.py` | manifest+script-call | Audit: which `sgs/%` attributes LACK A MECHANISM that reaches them — the D497 gate. |
| `audit-feature-parity.py` | manifest+script-call | Spec 35 UNIT A — feature-parity audit. ⚠ **header disputes this — it IS wired** |
| `audit-inline-styling.js` | manifest+npm+script-call | WIRED INTO `prebuild` AS A REAL GATE — `node scripts/audit-inline-styling.js --check` runs on every `npm run build` and sets `process.exitCode = 1`… ⚠ **header disputes this — it IS wired** |
| `audit-post-content-blocks.py` | manifest+npm+script-call | Audit stored post_content for SGS blocks that can no longer render their content. |
| `audit-scoped-selector-live.js` | manifest+npm+script-call | "scoped selector whose class the element never carries" bug class (the multi-button regression, D303 / P-SCOPED-SELECTOR-MATCH-AUDIT-AND-GATE). |
| `audit-script-cull-candidates.py` | manifest | measured signals for a script-library cull. |
| `audit-script-reachability.py` | manifest+script-call | which scripts in this library actually RUN, and how. |
| `audit-shrink-to-fit.js` | manifest+script-call | WHY LIVE (not static) |
| `audit-typography-attr-declarations.js` | manifest | bug introduced while rolling out the full TypographyControls control set |
| `behavioural-analyser/assign-canonical.py` | manifest+script-call | Backfills `canonical_slot`, `role`, and `derived_selector` for every row in |
| `behavioural-analyser/backfill-coarse-roles.py` | manifest | Spec 31 Phase 3.5 — Refine Phase 1 coarse roles to role-templates taxonomy. |
| `behavioural-analyser/backfill-from-json-catalogue.py` | manifest | Spec 31 Phase 3 step 3.1 helper — one-shot backfill of role / derived_selector |
| `behavioural-analyser/extract-signatures.py` | manifest+script-call | SGS Block Behavioural Signature Extractor |
| `build-deploy.py` | manifest+script-call | One-shot SGS build + tar + scp + remote extract + cleanup. |
| `build-font-collection.py` | manifest | Generates a WordPress Font Library collection manifest (google-fonts.json) from the |
| `build-tier-fixture-page.py` | manifest+script-call | Build (and publish) ONE canary page carrying every block that has migrated |
| `capture-tier-fixture.py` | manifest+script-call | Measure the tier-fixture page — one scoped measurement per block, three viewports. |
| `census-colour-paint-route.py` | manifest | Census: how does each block's render.php route its COLOUR PAINT? |
| `cheat-gate/__init__.py` | manifest+script-call | cheat-gate — F5 anti-cheat detection suite for the SGS cloning pipeline. |
| `cheat-gate/check_bound_emit.py` | manifest+script-call | Check #8: static sourceMode='bound' EMIT in converter source. |
| `cheat-gate/check_converter_source.py` | manifest+script-call | Check #9: static source cheats in the new converter/ tree. |
| `cheat-gate/check_d2_when_d1.py` | manifest+script-call | Check #6: D2-when-D1-exists (run_dir-dependent, best-effort). |
| `cheat-gate/check_hardcoded_dicts.py` | manifest+script-call | Check #2: hardcoded property→attr dict literals (R-31-1). |
| `cheat-gate/check_important_render.py` | manifest+script-call | Check #3: !important over a faithful CSS property. |
| `cheat-gate/check_parallel_bp.py` | manifest+script-call | Check #4: parallel breakpoint vocabulary. |
| `cheat-gate/check_sentinel.py` | manifest+script-call | Check #7: sentinel leakage ('unitless' string). |
| `cheat-gate/check_slug_literals.py` | manifest+script-call | Check #1: per-block slug literals (whole-tree + indirect forms). |
| `cheat-gate/models.py` | manifest+script-call+skill+test-import | shared data types for the F5 cheat-detection gate. |
| `cheat-gate/run.py` | commit-gate+hook+manifest+npm+script-call+settings+skill | F5 cheat-detection gate runner. |
| `check-atomic-slug-literals.py` | manifest+npm+script-call | STRUCTURAL GUARD (FR-22-3, 2026-06-13) — prevents new per-block `if slug ==` |
| `check-block-asset-targets.js` | manifest+npm+script-call | STRUCTURAL GUARD (post-D382 hardening) — stops the "block.json names a source filename that never gets compiled" class of bug from regressing. |
| `check-blockjson-metadata-only.py` | commit-gate+manifest+script-call | visual-diff-gate helper. |
| `check-border-style-without-width.py` | manifest | the "no width = no border" detector. |
| `check-box-family-guard.py` | manifest+npm+script-call | STRUCTURAL GUARD — box-object interface contract (2026-07-09 plan §6). |
| `check-child-lift.py` | manifest | check-child-lift — every child-lift rule in the tree stays at ZERO specificity. |
| `check-colour-attr-css-property.py` | manifest+npm | D962-adjacent gate: no colour attribute may reach the DB with a NULL/empty |
| `check-colour-preview-resolver.js` | manifest | check-colour-preview-resolver — the editor canvas must resolve a colour the same way the server does. |
| `check-control-helper-parity.py` | manifest+script-call | Which shared controls ship the standard helper pair, and which still don't. |
| `check-control-ux.js` | manifest+npm+script-call | STRUCTURAL GUARD (Step 7a, 2026-06-11) — prevents the two editor anti-patterns that produce a sub-standard inspector UX: |
| `check-converter-destination-shape.py` | manifest+script-call | GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0 |
| `check-css-layer-orphans.py` | manifest | DB-first orphan gate for ``block_attributes.css_layer``. |
| `check-dead-api-calls.py` | manifest+npm+script-call | STRUCTURAL GUARD — catches a call to a PHP/WordPress/WooCommerce function |
| `check-dead-controls.js` | manifest+npm+script-call | STRUCTURAL GUARD (HC2, 2026-06-08) — stops the "dead control" class of bug from regressing. A dead control is an editor control a client can change… |
| `check-dead-pattern-attrs.py` | manifest+npm+script-call | Find block attributes in theme patterns/parts that WordPress silently DISCARDS |
| `check-destructive-only-controls.js` | manifest | STRUCTURAL GUARD (D787-class, 2026-08-27) — catches a defect class that sits in a gap none of the existing ~70 gates cover: `check-dead-controls.js`… |
| `check-device-toggle.js` | manifest+npm+script-call | (src/blocks/extensions/responsive-device-toggle.js). ⚠ **header disputes this — it IS wired** |
| `check-doc-citations.py` | manifest | a `file:line` citation in a doc must land on what it names. |
| `check-duplicate-controls.js` | manifest+script-call | STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug: the SAME setting exposed to the client through TWO different editor… |
| `check-editor-canvas-css.py` | commit-gate+manifest | visual-diff-gate helper (branch 6). |
| `check-editor-only.py` | commit-gate+manifest+script-call | visual-diff-gate helper (branch 5). |
| `check-editor-render-parity.js` | manifest+npm+script-call | NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate in this repo catches: "a control is set up correctly on ONE side (editor… |
| `check-element-manifest-conformance.js` | manifest+npm+script-call | Spec 35 Task 2 — the CLUSTER-COHERENCE rule, made computable. |
| `check-empty-inspector-containers.js` | manifest+npm+script-call | STRUCTURAL GUARD — an inspector container rendered with NO children. |
| `check-enum-control-shape.py` | manifest | the D812 enum control-shape GATE. |
| `check-fx-list-drift.py` | manifest+npm+script-call | the three-list (plus field-type triad) fx drift gate. |
| `check-fx-registration.py` | manifest | every shipped fx module is registered everywhere it must be. |
| `check-hardcoded-render-defaults.js` | manifest+npm+script-call | STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of bug (F3) from regressing. An F3 violation occurs when a block declares an… |
| `check-hover-state-classification.py` | manifest+npm | Gate: a `*Hover` attribute that carries a real CSS property MUST be classified |
| `check-id-scoped-emits.js` | manifest+npm+script-call | STRUCTURAL GUARD — ID-scoped CSS selector emissions. |
| `check-inert-controls.py` | manifest+npm+script-call | Find block attributes that are OVERWRITTEN in render.php before being used. |
| `check-interaction-only-css.py` | commit-gate+manifest+script-call | visual-diff-gate helper. |
| `check-jsonld-flags.py` | manifest+npm | guard the ONE json_encode flag combination that is unsafe. |
| `check-ksort-before-hash.py` | manifest+npm+script-call | STOP-NO-KSORT gate — never reorder $attributes before it is hashed into a uid. |
| `check-markup-neutral.py` | commit-gate+manifest+script-call | visual-diff-gate helper. |
| `check-media-atom-purity.js` | manifest+npm+script-call | Gate: a media atom's LOGIC module must be importable by plain Node. |
| `check-media-breakpoints.js` | manifest+npm | Gate: the media-element stylesheet's breakpoints must match the ONE source. |
| `check-media-disclosure-coverage.js` | manifest | Gate: every media atom's `disclosure()` is exercised against REAL fixtures derived from its own `requires` map in registry.js — not a static scan. |
| `check-motion-bundle-budget.py` | manifest+npm+script-call | Spec 38 (Motion System) Tier G bundle-size budget gate. |
| `check-no-core-blocks.py` | manifest+script-call | Prebuild gate: NO banned core blocks in theme pattern/part/template FILES. |
| `check-palette-slug-refs.py` | manifest+npm | every referenced colour slug must actually exist. |
| `check-preset-token-naming.py` | manifest+npm | STRUCTURAL GATE — Spec 32 FR-32-9 (Naming Convention) self-verifier. |
| `check-product-search-guards.js` | manifest+npm+script-call | STATIC PRE-FLIGHT GUARD for the product-search REST endpoint. |
| `check-render-tier-object-spacing.py` | manifest+npm+script-call | GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0 |
| `check-render-undefined-vars.py` | manifest+npm+script-call | Undefined-variable gate for block render templates (PHPStan level 1). |
| `check-rest-route-require.py` | npm | STRUCTURAL GUARD — catches a REST route registered against a callback class |
| `check-shader-sources.py` | manifest+npm | structural gate for Tier W `*.frag.js` shader sources. |
| `check-shared-css-state-rules.js` | manifest+npm+script-call | STRUCTURAL GUARD — stops the "state-only shared-CSS size literal" class of bug from regressing. This is the class of defect that shipped LIVE on… |
| `check-shared-panel-schema.js` | manifest+npm+script-call | STRUCTURAL GUARD — closes the gap in the "dead control" family that check-dead-controls.js (control exists, nothing renders it) and… |
| `check-simple-surface-cap.js` | manifest+script-call | FR-37-27 (Spec 37, .claude/specs/37-HEADER-FOOTER-BUILDER.md) — the SIMPLE SURFACE CAP, made computable. The Simple surface (`sgs/site-header` and… |
| `check-single-instance-invariants.py` | manifest+npm | Single-instance invariant register — four named prohibitions, one shared mechanism. |
| `check-style-blob-sanitisation.py` | manifest+npm | Gate: every render.php `<style>` blob echo must pass through wp_strip_all_tags(). |
| `check-text-gradient-companion.js` | manifest+npm | THE TRAP THIS GATE CATCHES. `sgs_text_decls()` (`includes/helpers-colour- variants.php`) returns `color:` DECLARATIONS ONLY. When a text GRADIENT is… |
| `check-tier-object-cast.py` | manifest+npm+script-call | Tier-object-cast gate — never coerce a whole object-typed attribute to a string. |
| `check-tier-storage-shape.py` | manifest+script-call | Find per-device attribute families that are HALF-MIGRATED between storage shapes. |
| `check-token-rename-neutral.py` | commit-gate+manifest | Is a block's staged change ONLY a preset-token RENAME whose resolved value is unchanged? |
| `check-undeclared-attrs.py` | manifest+npm+script-call | Find block attributes destructured in edit.js that WordPress silently DISCARDS. |
| `check-undefined-refs.js` | manifest+npm+script-call | THE GAP THIS CLOSES. On 2026-08-22 three blocks shipped broken editors: sgs/text, sgs/quote and sgs/testimonial referenced `borderColourHover` /… |
| `check-undefined-refs.selftest.js` | manifest+script-call | Self-test for check-undefined-refs.js. |
| `check-ungated-paint-rules.py` | manifest+npm+script-call | STRUCTURAL GUARD (WARN-ONLY for this build) — Spec 41 FR-41-35 / gate §11 G20c. |
| `check-universal-fit.js` | manifest+script-call | WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension |
| `check-unresolvable-token-refs.py` | manifest | advisory scan for var(--name) references |
| `check-withdrawn-figures.py` | manifest | a figure withdrawn in one file stays withdrawn everywhere. |
| `check-wrapper-capability-preconditions.js` | manifest+npm+script-call | STRUCTURAL GUARD for the shared-wrapper capability declarations in each block's `supports.sgs` — Spec 35A §F.2.1 + §F.2.2 (D637, step 7 of the… |
| `colour-codemod/adopt.js` | manifest+script-call | `<SgsColourPanel rows={[...]}>`) into a call to the shared row helper it is semantically identical to: fillRow / textRow |
| `colour-codemod/classify-end-shape.js` | manifest+npm+script-call | WHY THIS EXISTS (2026-09-06, colour-conformance). Adversarial-council pre-mortem (6/6 personas graded D) found survey.js's AUTOFIXABLE verdict is… |
| `colour-codemod/classify-gradient-path-deferred.js` | manifest+script-call | Splits every `gradient-path-deferred` refusal that fix.js's dry run |
| `colour-codemod/fix.js` | manifest+script-call+skill+test-import | Scope: TIER A ONLY — rows survey.js verdicts as `AUTOFIXABLE:helper-at-existing-selector`, AND (this file's own further narrowing, documented in… |
| `colour-codemod/migrate-fill-custom-property-gradient.js` | manifest+script-call | The narrow, proven codemod the adversarial council asked for instead of a universal auto-fix classifier: ONE shape, hand-verified 5+ times tonight |
| `colour-codemod/migrate-icon-gradient-css.js` | manifest | Migrates the remaining `sgs_svg_stroke_gradient()` direct-call sites onto the shared `sgs_icon_gradient_css()` composer (built 2026-09-05 as… |
| `colour-codemod/migrate-shadow-mounts.js` | manifest+npm | WHY. ShadowControl was parameterised by VALUES AND CALLBACKS: six props hand-wired at every mount, where GradientOverlayControl's callers pass one… |
| `colour-codemod/scan-undeclared-setattributes.js` | manifest+script-call | the cross-tier-review fix (post-Task-1 critical defect: fix.js could emit a `setAttributes({ X: ... })` write for an attribute X that block.json… |
| `colour-codemod/survey.js` | manifest+script-call | WHY THIS EXISTS. rule 31 already answers "which rows are wrong?" (388 findings across 61 blocks). It does NOT answer "which of those can a codemod… |
| `colour-codemod/wire-border-contrast.js` | manifest+npm | (a WCAG 3:1 border-contrast warning, built and working on the component itself — see `src/components/SgsBorderControl.js`) into every block's… |
| `consistency/audit-serverside-render-disabled.js` | manifest+npm | Finds every `<ServerSideRender` JSX usage across `src/blocks/*\/edit.js` and flags any that is NOT wrapped in `<Disabled>` (from… |
| `consistency/build-roster.py` | manifest+npm+script-call | Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB. |
| `consistency/build-setting-types.py` | manifest | Spec 35 UNIT A+ Phase 1 — dedup every SGS attribute to its unique SEMANTIC SETTING. |
| `consistency/check-box-flat.py` | manifest+script-call | DISCOVERY GATE — flags box-object-capable controls still stored as FLAT |
| `consistency/check-cluster-coverage.py` | manifest+script-call | Spec 35 FR-35-3 — assert that every css:* and anim:* setting row belongs to exactly one cluster. |
| `consistency/check-reclassified-keys.py` | manifest+script-call | Spec 35 — REGENERATION GUARD for Bean-ruled reclassified setting keys. |
| `consistency/report-colour-alpha.py` | manifest+script-call | REPORT-ONLY (never non-zero exit) — surfaces colour controls that lack an |
| `consistency/run-consistency-gates.py` | manifest+npm+script-call | Single orchestrator for the SGS blocks consistency-gate suite. Runs a fixed |
| `content-role-detect/classify_detector1.py` | manifest+script-call | Detector 1 (step 2 of 2) — classify raw escaping-call facts extracted by |
| `content-role-detect/detector1_render_escaping.php` | manifest+script-call | Detector 1 — render.php output-escaping walk (structural, token-based). |
| `content-role-detect/detector2_editjs_controls.py` | manifest+script-call | Detector 2 — edit.js control-binding walk (structural, JSX-tag-aware). |
| `content-role-detect/detector3_i18n_default.py` | manifest+script-call | Detector 3 — i18n-wrapped default walk (structural, statement-scoped). |
| `content-role-detect/detector4_referenced_not_output.py` | manifest+script-call | Detector 4 — "referenced in code, but never escaped to output and never CSS". |
| `content-role-detect/detector5_image_alt_companion.py` | manifest+script-call | Detector 5 -- derive the image<->alt COMPANION relationship from render.php. |
| `content-role-detect/detector6_native_support_and_style_emission.py` | manifest+script-call | Detector 6 -- "WP-core native support" + "value painted inside a <style> element". |
| `content-role-detect/detector7_css_paint_flow.php` | script-call | Detector 7 — CSS PAINT FLOW (forward variable tracking to a paint site). |
| `content-role-detect/detector8_undeclared_enum.php` | — | Detector 8 — UNDECLARED ENUM (a schema gap, not a role gap). |
| `content-role-detect/fingerprint_content_roles.py` | manifest+script-call | Deterministic content-role fingerprint (Track A / Spec 35, Step 2). |
| `converter/__init__.py` | manifest+script-call | SGS clean modular converter (Spec 31 §12.4 / §12.6 step 2 — vertical slice). |
| `converter/block_serialization.py` | manifest+script-call | WP-core-faithful block-attribute serialisation. |
| `converter/context.py` | manifest+script-call+skill | typed per-element context + declaration for the modular converter. |
| `converter/coverage_report.py` | manifest+script-call | the Bean-visible sign-off grid (design §5). |
| `converter/db/__init__.py` | manifest+script-call | converter/db — the modular engine's own DB-accessor package. |
| `converter/db/db_lookup.py` | hook+manifest+script-call+skill+test-import | DB-backed canonical lookups for the converter. |
| `converter/dispatch_spine.py` | manifest+script-call | dispatch + conservation spine (design §3 / §4). |
| `converter/dispatch_table.py` | manifest+script-call | the DB-sourced routing function (design §2). |
| `converter/entry.py` | manifest+script-call+skill+test-import | Stage 4 pipeline entry point for the modular converter (`converter/`). |
| `converter/gates/__init__.py` | manifest+script-call | Anti-cheat gates the scaffold ships (design §4.1). |
| `converter/gates/check_content_attr_collisions.py` | manifest | DB gate: attrs the content resolver cannot tell apart. |
| `converter/gates/check_preset_absence_no_slug_literal.py` | manifest+npm+script-call | scoped static gate for |
| `converter/gates/check_raw_sqlite.py` | hook+manifest+script-call | AST gate: no converter/ file opens sqlite3 directly. |
| `converter/gates/import_ban.py` | hook+manifest+script-call | AST gate: no converter/ file may import the frozen engine. |
| `converter/gates/no_slug_literal.py` | hook+manifest+script-call | AST gate: no block-slug / variant / slot carve-outs in resolver bodies. |
| `converter/models.py` | manifest+script-call+skill+test-import | the Write / GAP result types every resolver returns. |
| `converter/recognition.py` | manifest+script-call | Stage-2 block recognition (modular rebuild, step-3 stage 1). |
| `converter/resolvers/__init__.py` | manifest+script-call | Resolver registry — resolver_id (from dispatch_table) → resolve callable. |
| `converter/resolvers/array_content.py` | manifest+script-call | Array / repeater content lift (Spec 31 §3.B4 / §13.3 FR-31-2.5). |
| `converter/resolvers/content_band.py` | manifest+script-call | content_band — the CONTENT-layer resolver (Spec 31 §3.A, layer L2). |
| `converter/resolvers/grid.py` | manifest+script-call | grid — the GRID-layer resolver (Spec 31 §3.A, layer L3 / D207 grid engine). |
| `converter/resolvers/load_settle_probe.py` | manifest+script-call | - Tier 4b "page-load-settle" motion probe (D1032). |
| `converter/resolvers/motion_library_signals.py` | manifest+script-call | Tier 4a DOM-runtime-signal detection for GSAP/Lenis/Three.js -- Phase R8 Step 10. |
| `converter/resolvers/motion_shape.py` | manifest+script-call | Tier 1 CSS declaration-shape classifier — Phase R8 Step 3. |
| `converter/resolvers/motion_stagger.py` | manifest+script-call | Tier 3 stagger/repetition detector — Phase R8 Step 9. |
| `converter/resolvers/motion_trigger.py` | manifest+script-call | Tier 2 trigger-mechanism classifier — Phase R8 Step 5. |
| `converter/resolvers/outer_box.py` | manifest+script-call | outer_box — the OUTER-layer resolver (Spec 31 §3.A, layer L1). |
| `converter/resolvers/preset_absence.py` | manifest+script-call | Build #3 Option B: preset-absence transfer (AUTO-DERIVE). |
| `converter/resolvers/scalar_content.py` | manifest+script-call | modularised ``_lift_scalar_attrs_by_selector`` (convert.py:3781). |
| `converter/resolvers/styling_content.py` | manifest+script-call | modularised ``_lift_styling_attrs_by_selector`` (convert.py:3903). |
| `converter/resolvers/test_find_load_settle_candidates_fixtures.py` | — | Ad-hoc verification harness for `_find_load_settle_candidates()` |
| `converter/resolvers/test_load_settle_probe_fixtures.py` | — | Ad-hoc verification harness for `load_settle_probe.py` (Tier 4b, D1032). |
| `converter/resolvers/test_motion_shape_fixtures.py` | — | Ad-hoc verification harness for `motion_shape.py` (Phase R8 Step 3). |
| `converter/resolvers/test_motion_trigger_fixtures.py` | — | Ad-hoc verification harness for motion_trigger.py (Phase R8 Step 5). |
| `converter/resolvers/typography.py` | manifest+script-call | typography — the typography resolver (Spec 31 §3.B2 / §3.A, layer-agnostic). |
| `converter/services/__init__.py` | manifest+script-call | Resolver services — the small typed steps a resolver composes. |
| `converter/services/arrangement.py` | manifest+script-call | Spec 31 §2.3/§2.4/§2.5 arrangement-layer helpers. |
| `converter/services/assembly.py` | manifest+script-call | Stage 3 §1 emit glue: build_block_markup (design §1). |
| `converter/services/attr_resolve.py` | manifest+script-call | attr_resolve — name-free (block, layer, property) → attr resolution (design §3.1). |
| `converter/services/border_side.py` | manifest+script-call | border_side — per-side border-width longhand → merged ``borderWidth`` object. |
| `converter/services/box_side.py` | manifest+script-call | box_side — per-side padding/margin longhand -> merged box-object attr. |
| `converter/services/button_group.py` | manifest | faithful port of the button-grouping pass. |
| `converter/services/content_gap_collector.py` | manifest+script-call | the content-side gap channel (observability only). |
| `converter/services/content_select.py` | manifest+script-call | content_select — bs4 selection + DOM-shape helpers for content extraction (Stage 3). |
| `converter/services/css_parse.py` | manifest+script-call | css_parse — shared CSS-text-to-rule-dict parser (ported off the frozen tree). |
| `converter/services/css_pass.py` | manifest+script-call | Stage 3 §3.A CSS pass: the CSS-declaration resolver dispatch. |
| `converter/services/dc_import_resolver.py` | script-call | resolve Claude Design `<dc-import>` cross-component |
| `converter/services/draft_oracle.py` | manifest+script-call | independent draft reader for the LANDED gate (Stage 3 §7). |
| `converter/services/extraction.py` | manifest+script-call+skill | Stage 3 content extraction: ScalarLifts / ChildBlocks / ContentGaps. |
| `converter/services/field_extractors.py` | manifest+script-call | Shared per-element role→value dispatch (Spec 31 §3.B.0). |
| `converter/services/fold_helpers.py` | manifest+script-call | ported CSS-fold helper functions for the modular rebuild. |
| `converter/services/gap_writer.py` | manifest+script-call | gap_writer — record a tracked GAP (design §3.1, FR-31-21 step 6). |
| `converter/services/has_inner.py` | manifest+script-call | has_inner — derive delegates_content at convert-time from save.js + render.php. |
| `converter/services/icon_resolver.py` | manifest+script-call | SGS Trust-Bar Icon Identity Resolver |
| `converter/services/l2_qualify.py` | manifest+script-call | the L2 (CONTENT-layer) relational qualifier. ONE function, unwired. |
| `converter/services/layer_detect.py` | manifest+script-call | layer_detect — classify a node's structural layer (design §2 / §2.2). |
| `converter/services/lift_helpers.py` | manifest+script-call | ported helper closure for the scalar-content lift. |
| `converter/services/pseudo_overlay.py` | manifest+script-call | ``::before``/``::after`` pseudo-element CSS lift (Unit B1). |
| `converter/services/recognise_helpers.py` | manifest+script-call | recognise_helpers — small DB-driven helpers for Stage-2 recognition. |
| `converter/services/render_emits.py` | manifest+script-call | render_emits — source-derived per-element nested-content signal (the render_reads gate). |
| `converter/services/repeated_sibling_detector.py` | manifest+script-call | - Q2 Tier 1 structural repeated-sibling detector. |
| `converter/services/root_supports.py` | manifest+script-call | root-CSS-to-WP-native-style lift for the modular engine. |
| `converter/services/sc_var_responsive_bridge.py` | script-call | - turns a correlated classless-draft measurement |
| `converter/services/section_passes.py` | manifest+script-call | the two universal section passes, ported from the frozen |
| `converter/services/sibling_shape_prefilter.py` | manifest+script-call | - standalone sibling shape-alike pre-filter. |
| `converter/services/state_value_lift.py` | manifest+script-call | state_value_lift — direct (block, css_property, css_state) resolution + |
| `converter/services/styling_helpers.py` | manifest+script-call | ported helper functions for the styling-attr lift. |
| `converter/services/test_tier4a_gate_hardening_fixtures.py` | — | Ad-hoc verification harness for the Tier 4a gate hardening fix |
| `converter/services/test_webgl_reference_puller_fixtures.py` | — | Ad-hoc verification harness for webgl_reference_puller.py (Phase R8 Step 13). |
| `converter/services/text_leaf.py` | manifest+script-call | text-leaf detection + text-capability gate. |
| `converter/services/tier4a_gate_verification.py` | manifest+script-call | Shared Tier 4a gate re-verification helper (QC-council hardening, |
| `converter/services/tier_object.py` | manifest+script-call | tier_object — shared TIER-OBJECT accumulation mechanics (Spec 35 tier shape). |
| `converter/services/tier_suffix.py` | manifest+script-call | tier_suffix — re-append the device-tier breakpoint suffix to a base attr. |
| `converter/services/token_resolution_check.py` | manifest+script-call | advisory detector for unresolvable name references |
| `converter/services/token_snap.py` | manifest+script-call | token_snap — snap a value to a design token when within tolerance (design §3.1). |
| `converter/services/validate.py` | manifest+script-call+skill | validate — gate a (attr, value) write before it is emitted (design §3.1). |
| `converter/services/value_serialise.py` | manifest+script-call | value_serialise — render a raw draft value into the attr's stored form (design §3.1). |
| `converter/services/variant_detect.py` | manifest | variant_detect — recognise a block's variant from its BEM modifier + the DB. |
| `converter/services/webgl_reference_puller.py` | manifest+script-call | Tier 4d -- operator-confirmed WebGL reference-file pulling. |
| `converter/services/webgl_style_classifier.py` | manifest+script-call | Tier 4c -- WebGL visual-style approximation via screenshot classification. |
| `converter/walk.py` | hook+manifest+script-call | the single walker entry + TOTAL structural-signature registry. |
| `converter/webgl_draw_call_probe.py` | manifest+script-call | - Tier 4a's ONE new execution probe (Step 10). |
| `copy-built-styles.js` | manifest+npm+script-call | Postbuild: copy style-index.css to style.css per block. |
| `coverage-matrix/classifier.py` | manifest+script-call | assigns a CellState to each (block, column) pair. |
| `coverage-matrix/db_queries.py` | manifest+script-call | all DB reads for the coverage-matrix module. |
| `coverage-matrix/generate-coverage-matrix.py` | manifest | Spec 31 §5 + MF-7 auto-generated coverage dashboard. |
| `coverage-matrix/models.py` | manifest+script-call+skill+test-import | shared data types for the coverage-matrix module. |
| `db-consistency/__init__.py` | manifest+script-call | db-consistency — F6 DB-as-code consistency suite. |
| `db-consistency/check_composition.py` | manifest+script-call | Check #2: block.json hasInnerBlocks override sanity. |
| `db-consistency/check_css_property_reseed.py` | manifest+script-call | Check #8: css_property/css_layer reseed-survival. |
| `db-consistency/check_dead_composition_signal.py` | manifest+script-call | Check #10: dead composition discriminator. |
| `db-consistency/check_fx_qualifying_blocks_stale.py` | manifest+script-call | Spec 38 fx qualifying-blocks map |
| `db-consistency/check_inert_composition_attr.py` | manifest+script-call | Check #11: inert child-attribute discriminator. |
| `db-consistency/check_motion_fx_reseed.py` | manifest+script-call | Spec 38 motion-fx registry reseed-survival guard. |
| `db-consistency/check_orphan_roles.py` | manifest+script-call | Check #6: role referential integrity. |
| `db-consistency/check_overrides_drift.py` | manifest+script-call | Check #4: override-dict drift. |
| `db-consistency/check_role_resolution_guess.py` | manifest+script-call | Check #12: order-dependent role resolution. |
| `db-consistency/check_routing.py` | manifest+script-call | Check #1: routing determinism guard. |
| `db-consistency/check_tier_composition.py` | manifest+script-call | Check #7: tier ↔ composition_role/container_kind. |
| `db-consistency/check_variant_reseed.py` | manifest+script-call | Check #5: variant_slots ↔ block.json determinism. |
| `db-consistency/check_variants.py` | manifest+script-call | Check #3: variant discriminator AMBIGUITY on the lift surface. |
| `db-consistency/models.py` | manifest+script-call+skill+test-import | shared data types for the F6 DB-consistency suite. |
| `db-consistency/resolver_bridge.py` | manifest+script-call | reuse the REAL resolver derivation for F6 checks. |
| `db-consistency/run.py` | commit-gate+hook+manifest+npm+script-call+settings+skill | F6 DB-as-code consistency suite shared runner. |
| `dbschema/capture_seed_data.py` | manifest+script-call | Capture the Phase-1 Group-5 seed tables from a LIVE database into data files. |
| `dbschema/check_schema_drift.py` | manifest+script-call | Detect drift between the committed ``schema.sql`` and the live database's DDL. |
| `dbschema/check_value_identity.py` | manifest+script-call | Assert that named, load-bearing DB rows still hold the EXACT value they must. |
| `dbschema/migrate.py` | manifest+script-call | Migration runner + tracking table for the SGS knowledge-base DB. |
| `dbschema/rebuild_compare.py` | manifest+script-call | Rebuild the knowledge base from NOTHING and report honestly what returns. |
| `dbschema/refresh_wp_reference.py` | manifest+script-call | Refresh the WordPress reference corpus (`hooks` + `docs`) — and DROP stale rows. |
| `dbschema/retire_table.py` | manifest | Retire a knowledge-base table: back up, archive it reversibly, then DROP it. |
| `dbschema/sandbox.py` | manifest+script-call | Run DB-touching scripts against a throwaway database, never the live one. |
| `dbschema/seed-library-signatures.py` | manifest+script-call | Seed ``library_runtime_signals`` -- Tier 4a DOM-runtime-signal lookup table. |
| `dbschema/seed-motion-shape-signatures.py` | manifest+script-call | Seed ``motion_shape_signatures`` — Tier V CSS-shape lookup table. |
| `dbschema/seed_history.py` | manifest+script-call | Record the last N seeding runs' row counts and REPORT what moved unexpectedly. |
| `dbschema/wp_reference_archive.py` | manifest+script-call | Preserve the ORPHANED WordPress reference corpus (`hooks` + `docs`). |
| `dead-api-checker/tokenize-calls.php` | manifest+script-call | Tokenize-calls.php |
| `detect-repeated-siblings.py` | manifest+script-call | - Q2 Tier 1 structural repeated-sibling triad CLI. |
| `diff-gap-sanitiser.php` | — | Differential test: sgs_container_gap_value() old allowlist vs the new sgs_css_length_value()-delegating implementation. |
| `drift-validator/validate.py` | manifest+script-call+skill | Spec 19 Stage 9 — Drift Validator |
| `e2e-authoring-acceptance.php` | — | SGS QA-AUTHORING Gate — FR-27 Cluster C End-to-End Authoring Acceptance Test |
| `excluded-gate/__init__.py` | manifest+script-call | excluded-gate — F5 excluded-literal tripwire gate. |
| `excluded-gate/db_check.py` | manifest+script-call | cross-reference detected signatures against excluded_properties DB table. |
| `excluded-gate/models.py` | manifest+script-call+skill+test-import | shared data types for the F5 excluded-literal gate. |
| `excluded-gate/run.py` | commit-gate+hook+manifest+npm+script-call+settings+skill | F5 excluded-literal tripwire gate for the SGS cloning pipeline. |
| `excluded-gate/scanner.py` | manifest+script-call | import-graph-wide scan for CSS-property exclusion literals. |
| `extract-button-presets.py` | manifest | Pipeline step: extract a draft mockup's `.sgs-button--{variant}` + `:hover` CSS |
| `extract-comment-narrative.py` | manifest | Find comment blocks that NARRATE CHANGES rather than describe behaviour. |
| `fanout-overlay-sibling-attrs.py` | manifest+npm | D6 (hover + responsive-tier siblings) and |
| `fix-missing-padding-margin-destructure.py` | manifest | one-shot fix for a real bug |
| `fix-render-tier-object-spacing.py` | manifest+script-call | One-off fix (2026-09-06): render.php CSS-emission side of the tier-object |
| `fix-spacing-preset-names.py` | manifest | Renames numeric spacing-preset ``name`` fields (e.g. "2".."9") in per-client |
| `generate-attr-role-map.py` | manifest+script-call | Spec 35 orphan-triage support. Dumps `block_attributes.role` for every |
| `generate-block-reference.py` | manifest+script-call | SGS Blocks Reference Generator |
| `generate-db-catalogue.py` | manifest+script-call | DERIVE the DB column catalogue in .claude/dev-setup.md. |
| `generate-extension-attributes.js` | commit-gate+manifest+npm+script-call | Single source of truth for the cross-block `sgs*` editor-extension attributes. |
| `generate-fx-effects-php.py` | manifest+script-call | writes includes/generated-fx-effects.php from fx_effects. |
| `generate-fx-qualifying-blocks.py` | manifest+script-call | derives the block -> qualifying-fx-effects |
| `generate-helper-catalogue.py` | manifest+script-call | DERIVE the helper/component/atom catalogue in |
| `generate-icons.js` | manifest+npm+script-call | Generates includes/lucide-icons.php from lucide-static SVG files. |
| `generate-markup-examples.py` | manifest+script-call | Generate markup examples for all 69 SGS blocks with block.json files. |
| `generate-media-attributes.mjs` | manifest+npm+script-call | Single source of truth for the media attribute TYPE map, JS -> PHP. |
| `generate-media-stylesheet.mjs` | manifest+npm+script-call | Concatenate the media-atom CSS partials into the one enqueued stylesheet. |
| `generate-svg-allowlist.js` | manifest+npm+script-call | Single source of truth for the SVG sanitiser allowlist, PHP -> JS. |
| `generate-tooling-catalogue.py` | manifest+script-call | DERIVE the tooling catalogue in .claude/dev-setup.md. |
| `generative-background/capture-render.mjs` | manifest+script-call | Render the SHIPPING generative-background module and capture a PNG. |
| `generative-background/extract-reference-matrices.mjs` | manifest+script-call | Extract GROUND-TRUTH transform matrices from the reference rig. |
| `generative-background/fidelity-compare.mjs` | manifest+npm+script-call | The driver. Captures BOTH sides (the shipping generative-background engine, via poc-replica.html, and the reference rig… |
| `generative-background/flip-probe.mjs` | manifest+script-call | decision baked into poc-replica.html. |
| `generative-background/harness-lib.mjs` | manifest+script-call | scripts. |
| `generative-background/silhouette-probe.mjs` | manifest+script-call | ORIGIN (systematic-debugging, 2026-09-03, D926/D927). Built to isolate the measured silhouette-coverage deficit (D925 — ours covered 7-12 points LESS… |
| `generative-background/sweep-position-ranges.mjs` | manifest | static orientation/scale/framing overrides (rotationX/Y/Z, scaleX/Y/Z, offsetX/Y) added to `createGenerativeBackground()`. |
| `generative-background/verify-field-texture.mjs` | manifest+npm | Bean's live report ("so many white splotches") after the D939-era blob- density change shipped without checking its own white-coverage stat against… |
| `generative-background/verify-transform.mjs` | manifest+npm+script-call | Verify the PRODUCTION transform maths against ground truth from the rig. |
| `golden-master-acceptance.php` | — | SGS Golden-Master Acceptance Test — Spec 27 FR-27-R2 Empirical Acceptance Gate |
| `golden-master-harness.php` | script-call | SGS Golden-Master Harness — Spec 27 FR-27-R2 Acceptance Gate |
| `hover-guard/audit.js` | manifest+script-call+skill | Pure (non-mutating) audit of `:hover` rules in a CSS source string. Used both for baseline measurement (before the transform runs) and by the checker… |
| `hover-guard/check.js` | manifest+npm+script-call+skill | Build-failing checker. Three jobs (per the brief): |
| `hover-guard/classify.js` | manifest+script-call+skill | Declaration-level classification: is a hover rule "motion-only" (safe for the transform to guard automatically), or OUT OF SCOPE for this transform… |
| `hover-guard/php-hover-scan.php` | manifest+script-call | Static PHP-side hover-guard coverage scan. |
| `hover-guard/run-transform.js` | manifest+npm | CLI: run transform.js over every `build/blocks/*​/style.css` (or an explicit directory passed as argv[2]) and write the result back in place. |
| `hover-guard/selector-split.js` | manifest+script-call | Selector-level classification for the hover guard. |
| `hover-guard/test-fixtures/anti-vacuity-dead-detector.js` | manifest | ANTI-VACUITY PROOF, not a shipped part of the tool. Simulates a "dead detector" (one that has stopped detecting `:hover` rules at all — the failure… |
| `hover-guard/transform.js` | manifest+script-call+skill | Build-time transform: wraps motion-only `:hover` rules in compiled block CSS with BOTH touch-safety layers (see includes/helpers-hover-state.php for… |
| `image-sequence-prep.py` | manifest | turns a video into frames the sgs/image-sequence block can use. |
| `inspector-scan/core/baseline.js` | manifest+script-call+skill+test-import | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.7 source=spec evidence=hybrid baseline shape (keyed… |
| `inspector-scan/core/components.js` | manifest+script-call+skill | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.5 source=file evidence=live-read… |
| `inspector-scan/core/extensions.js` | manifest+script-call | GROUND-TRUTH: spec=task brief 2026-08-08 (extensionsDir plumbing) source=file evidence=live-read plugins/sgs-blocks/src/blocks/extensions/ on… |
| `inspector-scan/core/finding.js` | manifest+script-call | GROUND-TRUTH: spec=none source=file evidence=live-read plugins/sgs-blocks/scripts/inspector-scan/core/roster.js (`BLOCKS_DIR =… |
| `inspector-scan/core/golden.js` | manifest+script-call | core/golden.js — the shared GOLDEN-CONTROL engine (C4 step 1, 2026-08-19). |
| `inspector-scan/core/report.js` | manifest+script-call+skill | Report is generated by iterating the rule REGISTRY (rules.json order), never a second hand-written order list — this is the direct mitigation for H7… |
| `inspector-scan/core/roster.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=file evidence=live-read… |
| `inspector-scan/core/selftest.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.9 source=file evidence=live-read… |
| `inspector-scan/core/sources.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=file evidence=`@babel/*` confirmed NOT a declared… |
| `inspector-scan/export-colour-css-property.py` | manifest+script-call | DB-first mechanism source for rule 31. |
| `inspector-scan/rules/01-tab-group.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 1 source=file evidence=live-read… |
| `inspector-scan/rules/03-dense-panel-candidate.js` | manifest | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 3 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/04-colour-alpha.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 4 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/07-preset-only-shadow.js` | manifest | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 7 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/08-raw-url-link.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 8 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/14-media-upload-check.js` | manifest | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 14 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/17-reduced-motion-gate.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 17 source=file evidence=PORTED WHOLE (not re-derived — the migration order… |
| `inspector-scan/rules/18-decorative-image-aria.js` | manifest | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 18 source=file evidence=row 18 verdict "ABSENT (claim… |
| `inspector-scan/rules/20-pattern-template-lock.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 20 source=file evidence=row 20 verdict "ABSENT (claim… |
| `inspector-scan/rules/21-render-without-control.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"The defect register" ("The fourth quadrant: declared + rendered + NO… |
| `inspector-scan/rules/22-placement-rule-surfaces.js` | manifest | GROUND-TRUTH: spec=.claude/decisions.md D537 (read verbatim 2026-08-09) + .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"THE PLACEMENT… |
| `inspector-scan/rules/23-content-width-needs-inner-band.js` | manifest | GROUND-TRUTH: spec=.claude/decisions.md D540 (read verbatim 2026-08-10) + .claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md… |
| `inspector-scan/rules/24-raw-canonical-component.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §1 COLOUR / §2 LINK (read live 2026-08-10). §1.1/§1.3: canonical =… |
| `inspector-scan/rules/25-no-own-device-switcher.js` | manifest | GROUND-TRUTH: spec=task brief 2026-08-10 (global device toggle regression guard) + live read of src/components/ResponsiveControl.js… |
| `inspector-scan/rules/26-responsive-duplicate.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §12 (THE RESPONSIVE WRAPPER FAMILY) source=file evidence=live-read… |
| `inspector-scan/rules/27-superseded-link-control.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §2 LINK |
| `inspector-scan/rules/28-fix-durability.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md (Part F, anti-patterns) source=file evidence=live-read… |
| `inspector-scan/rules/29-duplicate-visible-label.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 (canonical-assignment + banned-lookalike table) + Part A5 (nested ToolsPanel… |
| `inspector-scan/rules/30-raw-box-control.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 canonical-assignment line |
| `inspector-scan/rules/31-golden-colour-control.js` | manifest+script-call | GROUND-TRUTH: spec=plugins/sgs-blocks/scripts/consistency/golden-controls.json (written 2026-08-19, read live before writing this rule)… |
| `inspector-scan/rules/33-ineffective-typography-selector.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md Part F.1 source=file evidence=live-read 2026-08-18. |
| `inspector-scan/rules/34-declared-attr-unrendered.js` | manifest+script-call | GROUND-TRUTH: spec=.superpowers/sdd/task-2-brief.md ("make rule 34 consume the gate's verdicts, split by SURFACE") source=file evidence=live-read… |
| `inspector-scan/rules/35-pinned-panel-position.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART O §"THE PLACEMENT ORDER CONVENTION" (added alongside… |
| `inspector-scan/rules/36-box-control-presets-missing.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/scratch/2026-08-27-c16-spacing-presets-design.md (the C16 spacing-presets design) + src/components/SgsBoxControl.js's own… |
| `inspector-scan/rules/37-media-no-handroll.js` | manifest | GROUND-TRUTH: spec=coordinator brief 2026-08-31 ("Write ONE new inspector-scan rule module: media-no-handroll") source=file evidence=live-read… |
| `inspector-scan/rules/38-media-attr-parity.js` | manifest | GROUND-TRUTH: spec=.claude/plans/media-element-tingly-stallman.md ("Wave 6 — media-attr-parity: server-registered schema matches the JS keys")… |
| `inspector-scan/rules/39-media-control-coverage.js` | manifest | GROUND-TRUTH: spec=coordinator brief 2026-09-01 ("Write a rule that checks OTHER blocks adopt the media-atom system correctly") source=file… |
| `inspector-scan/rules/40-media-svg-sanitised.js` | manifest | GROUND-TRUTH: spec=coordinator brief 2026-09-01 ("Write ONE new inspector-scan rule module: media-svg-sanitised") source=file evidence=live-read… |
| `inspector-scan/rules/41-co2-element-grouping-order.js` | manifest+script-call | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"THE PLACEMENT RULE" (D537, 2026-08-09) + Spec 35A CO-2 ("element-first… |
| `inspector-scan/rules/42-no-op-reset-controls.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART F |
| `inspector-scan/rules/43-colour-only-state-indicator.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART F |
| `inspector-scan/rules/44-help-text-not-described.js` | manifest | GROUND-TRUTH: spec=.claude/specs/35A-BLOCK-INSPECTOR-UX-ENFORCEMENT-AND-BUILD-REFERENCE.md PART F |
| `inspector-scan/rules/45-typography-full-replacement.js` | manifest | GROUND-TRUTH: spec=plugins/sgs-blocks/CLAUDE.md "TYPOGRAPHY — use the SHARED component, never bespoke font controls" (Bean R-22-13, 2026-06-11) +… |
| `inspector-scan/run.js` | commit-gate+manifest+npm+script-call+skill | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=spec evidence=this is the entry point described in… ⚠ **header disputes this — it IS wired** |
| `ledger/__init__.py` | manifest+script-call | ledger — F2 draft-derived CSS Accounting Ledger (input parser). |
| `ledger/content_gap_check.py` | hook+manifest+script-call+test-import | ledger.content_gap_check — F5 ContentGap visibility gate (the content-dropping channel). |
| `ledger/coverage_check.py` | commit-gate+hook+manifest+npm+script-call+test-import | ledger.coverage_check — F5 pipeline-close coverage-conservation gate (UNACCOUNTED leg). |
| `ledger/declare_input.py` | manifest+npm+script-call+test-import | ledger.declare_input — F2 draft-derived CSS Accounting Ledger (input parser). |
| `ledger/models.py` | manifest+script-call+skill+test-import | ledger.models — data model for F2 CSS Accounting Ledger (input half). |
| `lib/stage8-cli.js` | manifest+script-call | to keep stage8-audit.js under the repo's 250-line limit. No browser, no network — `makeRunId` is deterministic given an explicit `now` (never calls… |
| `lib/stage8-lighthouse.js` | manifest+script-call | out purely to keep stage8-audit.js under the repo's 250-line limit. This is the ONLY module in the stage8 family that touches a real browser/network… |
| `lib/stage8-network-console-builders.js` | manifest+script-call | stage8-audit.js. CWV builder + the shared LHR helpers (`hasRuntimeError`, `auditErrored`, `auditItems`, `hostnameOf`) live in the sibling… |
| `lib/stage8-report-builders.js` | manifest+script-call | stage8-audit.js. Network/console report builders live in the sibling `stage8-network-console-builders.js` (split purely to keep both files under the… |
| `lib/stage8-self-test-console.js` | manifest+script-call | purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by `stage8-self-test.js` via `runConsoleSelfTests(check)`. |
| `lib/stage8-self-test-cwv.js` | manifest+script-call | purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by `stage8-self-test.js` via `runCwvSelfTests(check)`. |
| `lib/stage8-self-test-fixtures.js` | manifest+script-call | family, split out purely so no self-test file exceeds the repo's 250-line limit. |
| `lib/stage8-self-test-network.js` | manifest+script-call | purely so no self-test file exceeds the repo's 250-line limit. Orchestrated by `stage8-self-test.js` via `runNetworkSelfTests(check)`. |
| `lib/stage8-self-test.js` | manifest+script-call | launches a browser or touches the network — every assertion runs against fixture Lighthouse Result objects, so the SAME pure functions that a real… |
| `lint-responsive-controls.py` | manifest+script-call | FR-36-24 structural gate (R-31-9 for responsive controls). |
| `lints/__init__.py` | manifest+script-call |  |
| `lints/bem-lint.py` | commit-gate+hook+manifest+script-call+skill | BEM compliance lint — Stage 0.1 of /sgs-clone (Spec 31). |
| `lints/lint-spec-drift.py` | hook+manifest+npm+script-call | Spec-drift lint — do the specs describe things that actually EXIST? ⚠ **header disputes this — it IS wired** |
| `lints/lint-theme-css-hardcodes.py` | manifest+script-call | Theme-CSS hardcode lint — arbitrary typography/colour literals in THEME CSS. |
| `lints/token-lint.py` | commit-gate+hook+manifest+script-call | Token-discovery lint — Stage 0.5 of /sgs-clone (Spec 31, FR38). |
| `make-visual-diff-reports.py` | commit-gate+manifest+script-call | Emit visual-diff reports, each citing ITS OWN measurement. |
| `migrate-border-content.php` | — | block-private Shape-B attributes. Run with `wp eval-file`. |
| `migrate-border-control.js` | manifest+script-call | an already block-private border UI (width + style + colour) in edit.js. |
| `migrate-border-radius-render.py` | manifest | Codemod: swap the per-block hand-rolled border-radius tier read in |
| `migrate-border-shape-b.js` | manifest+npm | ⛔ THIS IS NOT A BRANCH OF migrate-border-control.js. That script's header declares a hard Shape-B exclusion, on the stated grounds that "there is no… |
| `migrate-box-control-presets.py` | manifest+script-call | - roll the C16 spacing-preset dropdown out from its |
| `migrate-box-control-wiring.py` | manifest | Codemod: swap the flat-sibling <ResponsiveBoxControl> wiring for the |
| `migrate-colour-picker-to-panel.py` | manifest | - migrate raw <DesignTokenPicker> colour mounts in a |
| `migrate-container-flexwrap-and-stack-candidates.py` | manifest | census + safe single-apply for TWO |
| `migrate-content-collection-to-card-grid.php` | — | Migrate `sgs/content-collection` blocks to `sgs/card-grid` (source = cpt-collection). |
| `migrate-core-blocks/block_parser.py` | manifest+script-call | Span-preserving WordPress block-comment parser. |
| `migrate-core-blocks/build_register.py` | manifest+script-call | Track C register builder — read-only survey of replaceable core blocks. |
| `migrate-core-blocks/capture-page.js` | manifest | Generic Track C first-paint capture: screenshots a URL at 375/768/1440 into reports/visual-diff/ and flags horizontal overflow. |
| `migrate-core-blocks/contract.py` | manifest+script-call | Shared contract between the migration driver and pairing modules. |
| `migrate-core-blocks/driver.py` | manifest+script-call | Track C migration driver — swaps core blocks for their SGS replacements. |
| `migrate-core-blocks/lint-page.py` | manifest+script-call | Lint (and optionally fix) banned core blocks in a PAGE's block markup. |
| `migrate-core-blocks/migrate-details-to-accordion.py` | manifest | core/details -> sgs/accordion + sgs/accordion-item (N sibling details -> 1 accordion). |
| `migrate-core-blocks/pairings/__init__.py` | manifest+script-call |  |
| `migrate-core-blocks/pairings/button_pairing.py` | manifest+script-call+script-call(dynamic) | core/button -> sgs/button transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/buttons_pairing.py` | manifest+script-call(dynamic) | core/buttons -> sgs/multi-button transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/column_pairing.py` | manifest+script-call(dynamic) | core/column -> sgs/container (a grid cell). Track C pairing module. |
| `migrate-core-blocks/pairings/columns_pairing.py` | manifest+script-call(dynamic) | core/columns -> sgs/container (a grid row). Track C pairing module. |
| `migrate-core-blocks/pairings/cover_pairing.py` | manifest+script-call+script-call(dynamic) | core/cover → sgs/hero transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/group_pairing.py` | manifest+script-call+script-call(dynamic) | core/group -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/heading_pairing.py` | manifest+script-call(dynamic) | core/heading → sgs/heading transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/image_pairing.py` | manifest+script-call(dynamic) | core/image → sgs/media transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/latest_posts_pairing.py` | manifest+script-call+script-call(dynamic) | core/latest-posts → sgs/post-grid transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/paragraph_pairing.py` | manifest+script-call(dynamic) | core/paragraph → sgs/text transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/post_template_pairing.py` | manifest+script-call(dynamic) | core/post-template -> sgs/post-grid — REFUSE-ALL (no standalone target exists). |
| `migrate-core-blocks/pairings/query_pairing.py` | manifest+script-call+script-call(dynamic) | core/query -> sgs/post-grid — REFUSE-ALL (design-decision gap, not a bug). |
| `migrate-core-blocks/pairings/row_pairing.py` | manifest+script-call(dynamic) | core/row -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/separator_pairing.py` | manifest+script-call(dynamic) | core/separator -> sgs/separator transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/site_logo_pairing.py` | manifest+script-call(dynamic) | core/site-logo → sgs/responsive-logo transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/stack_pairing.py` | manifest+script-call(dynamic) | core/stack -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/typography_common.py` | manifest+script-call+script-call(dynamic) | Shared helpers for the core/heading + core/paragraph pairing modules. |
| `migrate-core-blocks/probe-accordion.js` | manifest | Verify the migrated FAQ accordion works end-to-end: all 5 questions present, answers hidden until clicked, and clicking a header reveals its answer. |
| `migrate-core-blocks/probe-button-equivalence.js` | manifest | Content-keyed button equivalence probe (rule 4a): compares each button's rendered geometry + paint between a BEFORE page (core/button) and an AFTER… |
| `migrate-core-blocks/probe-columns-responsive.js` | manifest | Columns→container responsive equivalence: compares the two column cells' geometry between BEFORE (core/columns) and AFTER (sgs/container grid) at… |
| `migrate-core-blocks/probe-cw-cause.js` | manifest | Prove-the-cause probe: on the minimal contentWidth:800 repro, find the sgs-container OUTER element and enumerate EXACTLY which CSS rule caps its… |
| `migrate-core-blocks/probe-group-layout.js` | manifest | Group→container layout equivalence: compare the wrapper element's box + background + the inner content-band width between a BEFORE (core/group) and… |
| `migrate-core-blocks/probe-heading-cascade.js` | manifest | Diagnose WHY a heading's colour/letter-spacing differs between the core and SGS renders: dump the theme's preset custom properties and enumerate… |
| `migrate-core-blocks/probe-image-pairing.js` | manifest | Track C image-pairing equivalence probe — compares the rendered geometry of the three representative images on the BEFORE (core/image) and AFTER |
| `migrate-core-blocks/probe-multibutton-margin.js` | manifest | Settles one question empirically: does `style.spacing.margin` actually RENDER on sgs/multi-button (which declares no spacing support, but routes… |
| `migrate-core-blocks/probe-overflow.js` | manifest | Track C overflow probe — at 375px, finds every element wider than the viewport and reports its selector path + the computed properties that govern… |
| `migrate-core-blocks/probe-page8-media.js` | manifest | Page-8 (homepage clone) media geometry probe — regression net for the sgs/media naked-mode max-width fix. Run before and after the deploy; the two… |
| `migrate-core-blocks/probe-preset-gap.js` | manifest | Track C preset-gap probe — measures the LIVE computed font-size of the four PROBE blocks on the canary test page (id 1468, /tc-preset-gap-probe/). |
| `migrate-core-blocks/probe-text-equivalence.js` | manifest | Content-keyed typography equivalence probe (rule 4a). |
| `migrate-core-blocks/publish-pattern-pair.py` | manifest | Publish a BEFORE/AFTER canary page pair for a migrated pattern file. |
| `migrate-core-blocks/upgrade-button-presets.py` | manifest | One-shot: upgrade already-emitted sgs/button instances to use PRESETS. |
| `migrate-font-size-ladder.py` | manifest | rehome theme font-size preset slugs after a ladder change. |
| `migrate-gallery-object-model.js` | manifest | onto the Spec 37 FR-37-16 {desktop,tablet,mobile} object model. |
| `migrate-length-sanitiser.py` | manifest+script-call | Move every LENGTH-valued call site from the crude sanitiser to the hardened one. |
| `migrate-off-native-spacing.py` | manifest+script-call+settings | move base padding/margin off WP-native |
| `migrate-orchestrator-rename.py` | manifest+npm+script-call | Rename converter/orchestrator.py -> converter/dispatch_spine.py, and every |
| `migrate-overlay-tier-axis.py` | manifest | Move the overlay's responsive tier axis OFF colour and ONTO opacity (D739). |
| `migrate-pattern-template-lock.py` | manifest | add templateLock:"contentOnly" to the outermost |
| `migrate-phantom-colour-token.py` | manifest | Sweep colour-token slugs that no palette defines onto the real token they mean. |
| `migrate-product-card-image-id.py` | manifest | backfill `imageId` (a real WordPress |
| `migrate-render-closures.py` | manifest+npm+script-call | Adopt the shared render helpers in place of per-file inline sanitiser closures. |
| `migrate-stored-tier-scalars.py` | manifest+script-call | fold a flat per-device scalar into ONE tier object, |
| `migrate-theme-attr-rename.py` | manifest+script-call | rename ONE attribute key, scoped to ONE block slug, |
| `migrate-theme-native-spacing.py` | manifest+npm | Migrate hand-authored `style.spacing` to the block-OWNED padding/margin attrs. |
| `migrate-theme-tier-scalars.py` | manifest+script-call | fold a flat per-device scalar into ONE tier object, |
| `migrate-tier-object.py` | manifest+npm+script-call | collapse a flat per-device attribute trio into ONE tier object. |
| `migrate-typography-full-controls.js` | manifest | surface-taxonomy track): turn on the FULL `TypographyControls` control set on every already-adopting single-target call site, instead of the partial… |
| `migrations/2026-06-13-testimonial-selector-fingerprint-override.py` | manifest | Migration: write multi-alias derived_selector for sgs/testimonial styling attrs. |
| `migrations/2026-06-26-testimonial-media-role-selector.py` | manifest+script-call | Migration: set role + derived_selector for sgs/testimonial object media attrs. |
| `migrations/2026-08-13-register-core-role-and-seed-native-wp.py` | manifest | Migration: register the 'core' role + seed it onto every source='native_wp' row. |
| `migrations/2026-08-13-role-remediation-part2-overrides.py` | manifest | One-shot script: apply this session's confirmed one-off role classifications. |
| `migrations/2026-08-24-drop-fossil-columns.py` | manifest+script-call | retire three provably dead columns. |
| `migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py` | manifest | Migration: relabel sgs/before-after.boxShadowColour's css_element to |
| `migrations/2026-08-27-gradient-family-synthetic-css-property-census-fix.py` | manifest | Migration: correct every unreachable, synthetic `css_property` value on the |
| `migrations/2026-08-27-product-card-background-gradient-css-property-fix.py` | manifest | Migration: correct sgs/product-card.backgroundColourGradient's css_property |
| `migrations/2026-09-05-helper-function-catalogue.py` | manifest | per-FUNCTION rows for PHP helpers. |
| `migrations/2026-09-07-fix-border-radius-formats.py` | manifest | Fix borderRadius format issues: |
| `migrations/2026-09-07-migrate-dead-border-attrs.py` | manifest | Migrate style.border to typed border attributes in SGS pattern files. |
| `migrations/2026-09-10-add-tier-shape-column.py` | manifest+script-call | add block_attributes.tier_shape. |
| `migrations/2026-09-11-add-co-animates-opacity-column.py` | manifest | add |
| `migrations/2026-09-14-nav-menu-split-classify-harness.php` | script-call | Render harness for `2026-09-14-nav-menu-split-classify.py`. Runs INSIDE WordPress via `wp eval-file -` (STDIN — nothing is uploaded) and prints one… |
| `migrations/2026-09-14-nav-menu-split-classify-sentinels.php` | script-call | Test-value generator for `2026-09-14-nav-menu-split-classify-harness.php`. |
| `migrations/2026-09-14-nav-menu-split-classify.py` | manifest+script-call | deterministic bar / drawer / both verdict for every |
| `migrations/2026-09-14-nav-menu-split.py` | manifest | census + codemod for splitting `sgs/nav-menu` into |
| `motion-qa/probe-carousel-loop.mjs` | manifest | Live probe — looping carousels (Spec 38, Bean's independent-control ruling). |
| `motion-qa/probe-cursor-field.mjs` | manifest+script-call | Live probe — cursor-reactive field (Spec 38 §3.3, FR-38-25). |
| `motion-qa/probe-editor-css-warnings.mjs` | manifest | Failing-test probe for the editor iframe CSS-loading warnings. |
| `motion-qa/probe-first-paint.mjs` | manifest | gate's `first_paint_capture_passed` field is supposed to attest. |
| `motion-qa/probe-fr-38-35-connector-stack.mjs` | manifest | Verify the shipped glow + fill + head stack against the REAL compiled stylesheet and the REAL markup render.php now emits. |
| `motion-qa/probe-fr-38-35-live.mjs` | manifest | FR-38-35 LIVE verification against the canary, on the shipped mask stack. |
| `motion-qa/probe-fr-38-35-sparks.mjs` | manifest | async function run(reduced){ const p=await b.newPage({viewport:{width:1440,height:950},...(reduced?{reducedMotion:'reduce'}:{})}); await… |
| `motion-qa/probe-fr-38-35-timeline-progress.mjs` | manifest | FR-38-35 live probe — sgs/timeline scroll-driven progress connector. |
| `motion-qa/probe-good-by-default.mjs` | manifest+npm+script-call | Gap-register claim 7 — is "good by default" true for pin-scrub / scrub / scramble / split-reveal? (2026-08-21, D729) |
| `motion-qa/probe-horizontal-panel-focus.mjs` | manifest | Horizontal-panel keyboard-focus probe — Spec 38 FR-38-8 follow-up |
| `motion-qa/probe-horizontal-panel.js` | manifest+script-call | Horizontal-panel travel probe — Spec 38 FR-38-8. |
| `motion-qa/probe-morph-geometry.mjs` | manifest+npm+script-call | D452 close-out (2026-08-21) — does `fx-morph` actually morph on the live canary? |
| `motion-qa/probe-motion-path-repeat.mjs` | manifest+npm+script-call | D451 close-out (2026-08-21) — does motion-path re-animate on a SECOND downward pass? |
| `motion-qa/probe-reduced-motion.mjs` | manifest+script-call | Horizontal panel — reduced-motion arm probe. Spec 38 FR-38-8 / §10. |
| `motion-qa/probe-row-collapse-reduced-motion.mjs` | manifest | Header row-collapse under `prefers-reduced-motion` (Spec 37 FR-37-40 / Spec 38 §12). |
| `motion-qa/probe-step13-pin-focus.mjs` | manifest+script-call | Step 13 (Motion Wave D register) — pin + horizontal-panel keyboard story. |
| `motion-qa/probe-step14-scrub-focus.mjs` | manifest+script-call | Job 1/2 (2026-08-01, D453 follow-up register) — fx-scrub.js + fx-split-reveal.js keyboard-hold fix, verified IN SITU against the REAL deployed… |
| `motion-qa/probe-stepn-image-sequence-pin.mjs` | manifest | Step N (Motion Wave D register) — image-sequence PIN-ON path, first live observation. |
| `motion-qa/probe-tier-w-surface.mjs` | manifest | Live probe — Tier W surface-treatment effect (Spec 38 §1.2b, D479). |
| `motion-qa/probe-wave-c-editor.mjs` | manifest | Spec 38 Wave C — EDITOR-surface probe (D388). |
| `motion-qa/probe-wave-c.mjs` | manifest+script-call | Spec 38 Wave C — live browser probe for every shipped Wave C effect. |
| `motion-qa/run-live-probes.mjs` | manifest+npm+script-call | Live motion-QA runner — the standing post-deploy motion check. |
| `nav-qa/axe-run.mjs` | manifest+script-call | blocks (Spec 36 §8 / FR-36-16: "axe = 0 on the OPEN drawer AND an OPEN desktop mega"). |
| `nav-qa/build-poc-fixtures.py` | manifest | create the nav-drawer variant POC fixtures on the canary. |
| `nav-qa/crawl-assert.mjs` | manifest | bar+dropdown+mega link AND mega content must be present in the PRE-JS HTML (what a crawler / no-JS user gets), never injected client-side. |
| `nav-qa/elementfrompoint-sweep.mjs` | manifest+script-call | occlusion sweep, carried verbatim from Spec 34 FR-S9-5 / FR-34-7. |
| `nav-qa/lib/openness-guard.mjs` | manifest+script-call | for every nav-qa script that measures or captures an interactive surface. |
| `nav-qa/logical-props-lint.py` | manifest | RTL-readiness lint for the SGS nav blocks |
| `nav-qa/palette-contrast-sweep.mjs` | manifest | drafts (mega-menu panels and any other self-contained SGS-BEM draft). |
| `nav-qa/shoot-drawer-pairs.mjs` | manifest+script-call | WHY |
| `nav-qa/submenu-harness.php` | — | Stubbed harness for SGS_Nav_Menu_Bar_Renderer — walker AND render_items. |
| `nav-qa/sweep-drawer-variants.mjs` | manifest+script-call | WHY THIS SHAPE |
| `no-inline/check-no-inline.py` | manifest+npm+script-call | Anti-regression GATE for the framework-wide inline-zero win (Spec 32 FR-32-1 / |
| `no-inline/check-stranded-guards.py` | manifest+npm | Anti-regression GATE for STRANDED inline-style guards (Spec 32). |
| `no-inline/detect.py` | manifest+script-call+skill | No-inline detector — the worklist generator for the framework-wide inline-zero |
| `no-inline-land-verify.js` | manifest+script-call+settings | For a manifest of blocks, it: |
| `oracle/__init__.py` | manifest+script-call | oracle — F3 LANDED render-oracle (F3-core). |
| `oracle/attribution_ground_truth.py` | manifest | Generate + check the attribution GROUND TRUTH (the falsifiable control). |
| `oracle/batch_runner.py` | manifest+script-call | oracle.batch_runner — F3 render-oracle LANDED runtime, multi-fixture BATCH mode. |
| `oracle/capture.py` | manifest+script-call+skill | oracle.capture — capture-adapter INTERFACE for the F3 LANDED oracle. |
| `oracle/decompose_unattributed.py` | manifest | Diagnostic: decompose the oracle's unattributed-cell count into named buckets. |
| `oracle/element_probe.py` | manifest+script-call | oracle.element_probe — resolve a DRAFT selector to the CLONE element to measure. |
| `oracle/golden_expectations.py` | manifest+script-call | oracle.golden_expectations — does a fixture's GOLDEN expect any rendered text? |
| `oracle/guards.py` | manifest+script-call | oracle.guards — the four false-win guards for the F3 LANDED oracle. |
| `oracle/metamorphic.py` | manifest+script-call | oracle.metamorphic — MR-2 metamorphic relation for the F3 LANDED oracle. |
| `oracle/models.py` | manifest+script-call+skill+test-import | oracle.models — data model for F3 LANDED render-oracle. |
| `oracle/provision_fixture_canaries.py` | manifest+script-call | oracle.provision_fixture_canaries — deploy the fixture corpus as live canary pages. |
| `oracle/render_oracle.py` | manifest+script-call | oracle.render_oracle — F3 render-oracle: the live Playwright capture leg. |
| `oracle/run_canary_proof.py` | manifest+script-call | oracle.run_canary_proof — F3-core-B: the live-canary LANDED proof (separate named command). |
| `oracle/verdict.py` | manifest+script-call+skill+test-import | oracle.verdict — the verdict function for the F3 LANDED oracle. |
| `orchestrator/atomic-block-scaffold.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5b.8 atomic-block scaffold. |
| `orchestrator/attribute-staged-apply.py` | manifest+script-call+skill | - Spec 31 Phase 5b.6 attribute staged-application. |
| `orchestrator/autonomy_gate.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7. |
| `orchestrator/check_attr_schema_conformance.py` | manifest+script-call | Task 3 (G2): fail closed when the converter |
| `orchestrator/check_flat_tier_regression.py` | manifest+script-call | Spec 35 flat-to-object migration divergence gate. |
| `orchestrator/check_no_mirror.py` | manifest+script-call | R-31-15 anti-mirror gate for the cloning converter. |
| `orchestrator/critical-fix-verification.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5f.1 acceptance harness. |
| `orchestrator/css_router.py` | manifest+script-call+test-import | Spec 16 §FR6 four-destination CSS router. |
| `orchestrator/draft-responsive-probe.js` | manifest+script-call | THE PROBLEM (plain English): `computed-parity.js` measures draft-vs-CLONE fidelity AFTER a clone exists — it hard-requires --draft AND --clone… |
| `orchestrator/draft_server.py` | script-call | Serve an original Claude Design draft folder over HTTP for Stage 11.6. |
| `orchestrator/expected_rules.py` | manifest+script-call | - Per-section CSS rule baseline for Phase 9 walkdown. |
| `orchestrator/functionality-bulk-apply.py` | manifest+script-call+skill | - Spec 31 Phase 5b.7 bulk-application. |
| `orchestrator/js_content_resolver.py` | script-call | resolve `<sc-for>` groups whose repeated content |
| `orchestrator/lingua_franca.py` | manifest+script-call+skill | - Spec 31 Phase 5c (FR9) convention-to-SGS-BEM converter. |
| `orchestrator/media-sideload.py` | manifest+script-call+skill | - Spec 31 Phase 5b.5 media sideloader. |
| `orchestrator/mutex.py` | manifest+script-call+skill | - Spec 31 Phase 5b.4 build mutex (FR19). |
| `orchestrator/object_attr_shape.py` | manifest+script-call | shared object-attribute shape discriminator. |
| `orchestrator/orchestrator_main.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5e.8 top-level entry point. |
| `orchestrator/pipeline-stage-gate.py` | manifest+script-call+skill | post-clone structural gate for the SGS cloning pipeline. |
| `orchestrator/preflight_chain.py` | manifest+script-call+skill | - Spec 31 Phase 5e.1 + 5e.2. |
| `orchestrator/register_patterns.py` | hook+manifest+script-call | - Spec 31 Phase 6 Step 0 +REGISTER tail. |
| `orchestrator/resolve-js-content.js` | script-call | THE PROVEN APPROACH (FR-31-26 preamble): a draft whose `<sc-for>` content lives only in a `static ARRAY = [...]` class property has zero usable… |
| `orchestrator/stage1_boundary_hook.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5c.4 Stage 1 BOUNDARY hook. |
| `orchestrator/staged_merge.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5e.3 staged-merge orchestrator. |
| `orchestrator/staged_output.py` | manifest+script-call+skill | - Spec 31 Phase 5b.1 staged-output dir convention. |
| `orchestrator/surface_pipeline_logs.py` | manifest+script-call | Surface structured per-severity logs from trace.jsonl at pipeline end. |
| `orchestrator/test_atomic_block_scaffold.py` | — | Spec 31 Phase 5b.8 self-test for atomic-block-scaffold.py. |
| `orchestrator/test_attribute_staged_apply.py` | — | Spec 31 Phase 5b.6 self-test for attribute-staged-apply.py. |
| `orchestrator/test_autonomy_gate.py` | — | Spec 31 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7 self-test for autonomy_gate.py. |
| `orchestrator/test_check_no_mirror_baseline.py` | — | pytest suite for the --baseline / --update-baseline |
| `orchestrator/test_critical_fix_verification.py` | — | Spec 31 Phase 5f.1 self-test for critical-fix-verification.py. |
| `orchestrator/test_css_router.py` | — | Unit tests for css_router.py — Spec 16 §FR6 four-destination router. |
| `orchestrator/test_draft_server.py` | — | Stage 11.6 draft-server helper (D1116): a DSL draft is detected by content, served over |
| `orchestrator/test_functionality_bulk_apply.py` | — | Spec 31 Phase 5b.7 self-test for functionality-bulk-apply.py. |
| `orchestrator/test_js_content_resolver.py` | — | JS-array-sourced repeated content resolution (Spec 31 FR-31-26, D1108/D1109 |
| `orchestrator/test_lingua_franca.py` | — | Spec 31 Phase 5c.2 + 5c.3 self-test for lingua_franca.py. |
| `orchestrator/test_media_sideload.py` | — | Spec 31 Phase 5b.5 self-test for media-sideload.py. |
| `orchestrator/test_mutex.py` | — | Spec 31 Phase 5b.4 self-test for mutex.py. |
| `orchestrator/test_orchestrator_main.py` | — | Spec 31 Phase 5e.8 self-test for orchestrator_main.py. |
| `orchestrator/test_preflight_chain.py` | — | Spec 31 Phase 5e.1 + 5e.2 self-test for preflight_chain.py. |
| `orchestrator/test_register_patterns.py` | — | Spec 31 Phase 6 Step 0 -- register_patterns.py contract tests. |
| `orchestrator/test_stage1_boundary_hook.py` | — | Spec 31 Phase 5c.4 self-test for stage1_boundary_hook. |
| `orchestrator/test_staged_merge.py` | — | Spec 31 Phase 5e.3 self-test for staged_merge.py. |
| `orchestrator/test_staged_output.py` | — | Spec 31 Phase 5b.1 self-test for staged_output.py. |
| `orchestrator/test_validate_stage_artifact.py` | — | Spec 31 Phase 5b.2 self-test for validate-stage-artifact.py. |
| `orchestrator/test_wp_integration.py` | — | Spec 31 Phase 5d.7 + 5d.9 + 5d.10 self-test for wp_integration.py. |
| `orchestrator/trace.py` | manifest+script-call | - Structured trace-logger for /sgs-clone pipeline runs. |
| `orchestrator/upload_and_patch.py` | manifest+script-call+skill | One-shot: upload all mockup images to sandybrown WP Media Library + |
| `orchestrator/validate-stage-artifact.py` | manifest+script-call+skill | - Spec 31 Phase 5b.2 per-stage validator. |
| `orchestrator/visual_qa_capture.py` | hook+manifest+script-call | - Stage 8 autonomy-gate capture stub. |
| `orchestrator/wp_integration.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5d.7 + 5d.9 + 5d.10. |
| `parity/computed-parity.js` | manifest+script-call | Spec 20 v1.1.0 (Clone Fidelity Measurement). The number tracks VISIBLE fidelity and PAIRS with Bean's eye — it never closes alone (Spec 31 §7b /… |
| `parity/extract-css-diff.js` | manifest+script-call | THE STANDARD first step for matching a clone section to its reference |
| `pattern-classify.py` | manifest+script-call+skill | SGS Pattern Classifier |
| `pattern-fingerprint.py` | manifest+script-call+skill | Compute a deterministic fingerprint for an HTML pattern + CSS bundle. |
| `pattern-register.py` | manifest+script-call+skill | Pattern registration orchestrator — Step 6 of /sgs-clone pipeline. 2026-05-06. |
| `perf/measure-frame-cost.mjs` | manifest | Q6 (generative-background engine) — what does a frame of the WebGL folded-ribbon layer actually cost? |
| `placement-reach.py` | manifest+npm+script-call | how far does THE PLACEMENT RULE actually reach? |
| `playwright-fetch.js` | manifest+script-call | Usage: node playwright-fetch.js <url> Writes the fully-rendered HTML to stdout. Used by sgs-update-v2.py Stage 2 Source 4 as a fallback when urllib… |
| `preflight-acceptance.php` | — | SGS Preflight Acceptance Test — FR-27-PREFLIGHT / SEC-5 Empirical Gate |
| `probes/build-noJS-autoplay-fixture.py` | manifest+script-call | Create (or verify) the canary page for owed-debt item 3 |
| `probes/build-smil-bypass-fixture.py` | manifest+script-call | Create the canary page carrying the REAL-PATH SMIL bypass payload for |
| `probes/extend-page-3145-video-svg.py` | manifest+script-call | Extend canary page 3145 (`[GATE - DO NOT DELETE] media atom object-fit |
| `probes/probe-media-object-fit-video-svg.mjs` | manifest | (.claude/prompts/2026-09-01-media-owed-debts.md): video and SVG object-fit were reasoned from the census and the deleted style.css selector, never… |
| `probes/probe-noJS-autoplay.mjs` | manifest | (.claude/prompts/2026-09-01-media-owed-debts.md): the video-behaviour atom coupling (VideoAutoplay -> [VideoMuted, VideoPlaysInline]) was verified at… |
| `probes/probe-smil-bypass.mjs` | manifest+script-call | (.claude/prompts/2026-09-01-media-owed-debts.md): the SMIL bypass |
| `product-search-leak-check.php` | manifest+script-call | SGS Product Search — Behavioural Leak Test (FR-30-5 Named Enforcement Runner). |
| `programme-progress.py` | manifest+npm+script-call | burn-down reporter for the tier-object migration programme. |
| `prove-selftest-can-fail.py` | manifest+script-call | Prove a detector's --self-test is LOAD-BEARING, not decorative. |
| `push-theme-snapshot.py` | manifest+script-call | Deploy a per-client theme.json snapshot to a WP site. |
| `qa/assert-css-effect.js` | manifest+script-call | BACKGROUND. fix.js's own 15-assertion self-test (--self-test) is entirely edit-correctness: was the row planned fixable, does DRY RUN write nothing… |
| `qa/capture-native-colour-ui.js` | manifest | Visual verification for the native-colour-ui migration (16 blocks). |
| `qa/capture-ncui-final3.js` | manifest | The last 3 native-colour-ui blocks — the ones page-content probing could not reach. |
| `qa/capture-ncui-remainder.js` | manifest | Visual capture for the 9 native-colour-ui blocks NOT covered by reports/visual-diff/native-colour-ui-2026-08-22.md. |
| `qa/capture-ncui-templateparts.js` | manifest | The final 2 native-colour-ui blocks, verified IN THEIR REAL CONTEXT. |
| `qa/check-border-roundtrip.js` | manifest+script-call | Border round-trip probe — does the FRONTEND actually paint the border the block's `borderWidth` / `borderStyle` / `borderColour` attributes describe? |
| `qa/check-colour-editor-roundtrip.js` | manifest+script-call | QA Gate C — the EDITOR half. |
| `qa/check-colour-gradient-roundtrip.js` | manifest | Text-colour gradient round-trip probe — does the FRONTEND actually paint a `background-clip:text` gradient when a `{attr}Gradient` sibling is set… |
| `qa/lib/google-reviews-settings-stub.php` | script-call | Thin stand-in for SGS\Blocks\Google_Reviews_Settings |
| `qa/lib/render-css-harness.php` | manifest+script-call | Standalone render.php executor for CSS-effect assertions |
| `qa/lib/sgs-is-frontend-render-stub.php` | script-call | Reproduces SGS\Blocks\sgs_is_frontend_render() (class-sgs-css-registry.php) verbatim, for plugins/sgs-blocks/src/blocks/business-info/render.php. |
| `qa/lib/wp-stubs.php` | manifest+script-call | Minimal WordPress core function/class stubs for standalone render.php execution (scripts/qa/lib/render-css-harness.php). |
| `qa/probe-native-colour-ui-close.js` | manifest | intent_capture probe for the native-colour-ui class closure (2026-08-23). |
| `qa/probe-row-gradient.js` | manifest | Set an attribute on every instance of one block inside a header/footer CPT, measure the live paint, and restore. |
| `recogniser/__init__.py` | manifest+script-call | SGS clone-pipeline recogniser modules. |
| `recogniser/array_schema_eliminator.py` | script-call | Stage B recognition for a repeated, classless draft group — Spec 44 §5. |
| `recogniser/attribute-gap-writer.py` | manifest+script-call+skill | - Spec 31 Phase 5a.4 attribute-gap writes. |
| `recogniser/bucket-c-classifier.py` | hook+manifest+script-call+skill | - Spec 31 Phase 5a.2 (FR10). |
| `recogniser/classless_draft_adapter.py` | script-call | Draft-side input adapter for Spec 44's Stage A / Stage B — the missing half. |
| `recogniser/classless_field_resolver.py` | script-call | - Spec 45 field-mapping resolver, Tiers 1-3. |
| `recogniser/classless_trust_gate.py` | script-call | FR-44-1's trust gate, §7's audit log, and the end-of-run summary — Spec 44 Task 4. |
| `recogniser/confidence-matrix.py` | hook+manifest+script-call+skill | - Stage 2 of /sgs-clone pipeline. |
| `recogniser/dom_shape_classifier.py` | manifest+script-call | - Q1 Tier 2 DOM-shape heuristic classifier. |
| `recogniser/functionality-gap-detector.py` | manifest+script-call+skill | - Spec 31 Phase 5a.3 (FR8 functionality leg). |
| `recogniser/gap-review-report.py` | manifest+script-call+skill | - Spec 31 Phase 5a.5 operator-review surface. |
| `recogniser/leftover-bucket-router.py` | hook+manifest+script-call+skill | - Stage 9 leftover routing. |
| `recogniser/measure-classless-baseline.py` | script-call | Front C Task 3 — re-measure Spec 44's safety baseline against the real Eye Care |
| `recogniser/measure-classless-frame-card.py` | — | Spec 44 completion register item 3 — generalisation check: run the real Stage A -> |
| `recogniser/per-section-convention-voter.py` | hook+manifest+script-call+skill | - Stage 1 of /sgs-clone pipeline. |
| `recogniser/render_repeater_recogniser.py` | script-call | Stage A recognition for a repeated, classless draft group — Spec 44 §3.1/§4.1/§4.3/§4.4. |
| `recogniser/render_repeater_seeder.py` | script-call | Seed `block_render_repeaters` — Spec 44 §4.2/§4.3 Steps 1-2 (2026-09-17). |
| `recogniser/sc_var_classifier.py` | manifest+script-call | - Claude Design `sc-for` variable-name classifier. |
| `recogniser/sc_var_haiku_batch.py` | manifest+script-call | - Piece 1's Tier B: one Haiku call per DRAFT. |
| `recogniser/sc_var_responsive_correlator.py` | manifest+script-call | - joins Piece 1 identity to Piece 2 values. |
| `recogniser/simple_html_review_report.py` | manifest+script-call+skill | - Stage 9 operator-review HTML render. |
| `recogniser/test_array_schema_eliminator.py` | — | Self-test for array_schema_eliminator.py — Spec 44 §5, §5.2, §5.3, §10. |
| `recogniser/test_attribute_gap_writer.py` | — | Spec 31 Phase 5a.4 self-test for attribute-gap-writer.py. |
| `recogniser/test_bucket_c_classifier.py` | — | Spec 31 Phase 5a.2 self-test for bucket-c-classifier.py. |
| `recogniser/test_classless_draft_adapter.py` | — | Self-test for classless_draft_adapter.py — Spec 44's DRAFT-side input derivation. |
| `recogniser/test_classless_field_resolver.py` | — | Self-test for classless_field_resolver.py (Spec 45 Tiers 1-3). |
| `recogniser/test_classless_trust_gate.py` | — | Self-test for classless_trust_gate.py — Spec 44 FR-44-1, §7, §9, §10. |
| `recogniser/test_confidence_threshold.py` | — | - Verify Stage 2 confidence threshold enforcement. |
| `recogniser/test_dom_shape_classifier.py` | — | Self-test for dom_shape_classifier.py -- Q1 Tier 2 (BEM-recognition brainstorm doc). |
| `recogniser/test_dom_shape_hint_wiring.py` | — | Self-test for per-section-convention-voter.py's dom_shape_hint wiring |
| `recogniser/test_functionality_gap_detector.py` | — | Spec 31 Phase 5a.3 self-test for functionality-gap-detector.py. |
| `recogniser/test_gap_review_report.py` | — | Spec 31 Phase 5a.5 self-test for gap-review-report.py. |
| `recogniser/test_leftover_bucket_router.py` | — | Spec 31 Phase 5a.1 self-test for leftover-bucket-router.py. |
| `recogniser/test_per_section_convention_voter.py` | — | Self-test for per-section-convention-voter.py — covers vote_block_slug. |
| `recogniser/test_render_repeater_recogniser.py` | — | Self-test for render_repeater_recogniser.py — Spec 44 §3.1/§4.1/§4.3, §10. |
| `recogniser/test_render_repeater_seeder.py` | — | Self-test for render_repeater_seeder.py — Spec 44 §4.2/§4.3, §10. |
| `recogniser/test_sc_var_classifier.py` | — | Self-test for sc_var_classifier.py (universal-pipeline upgrade, Piece 1). |
| `recogniser/test_sc_var_hint_wiring.py` | — | Self-test for per-section-convention-voter.py's sc_var_hint wiring + |
| `recogniser/test_sc_var_responsive_correlator.py` | — | - integration coverage for the |
| `recogniser/test_source_builder_detection.py` | — | Self-test for per-section-convention-voter.py's detect_source_builder() |
| `redirect-native-spacing-reads.py` | manifest+script-call | - the edit.js/render.php half of |
| `remove-dead-flat-spacing-destructure.py` | manifest | one-shot cleanup for the Group 1 |
| `remove-vacuous-style-engine-guard.py` | manifest+npm | Delete the vacuous `function_exists( 'wp_style_engine_get_styles' )` guard. |
| `row-fit-sweep.mjs` | manifest | row-fit-sweep — reusable Playwright width-sweep verification harness. |
| `run-gates.py` | manifest+npm+script-call | the consolidated gate runner. |
| `run-motion-fx-generators.js` | manifest+npm+script-call | motion-fx generator chain (seed-motion-fx-registry.py, generate-fx-effects-php.py, generate-fx-qualifying-blocks.py). |
| `scan-component-adoption.js` | manifest+script-call | WHY THIS EXISTS |
| `seed-48-sku-fixture-v2.php` | — | SGS 48-SKU Fixture — v2 ADDITIVE presentation-meta seeder (Spec 27 Phase 2). |
| `seed-48-sku-fixture.php` | script-call | SGS 48-SKU WooCommerce Fixture — Developer Script |
| `seed-component-adoption.py` | manifest+script-call | write the unification ADOPTION LEDGER to `components`. |
| `seed-composition-roles.py` | manifest+script-call | idempotent corrections to block_composition.composition_role. |
| `seed-motion-fx-registry.py` | manifest+script-call | idempotent editorial seeder for the Spec 38 motion system. |
| `seed-render-composition.py` | script-call | write `block_render_composition` (Spec 31 §13.9). |
| `seed-render-singletons.py` | script-call | write `block_render_singletons` (Spec 31 §13.10). |
| `sgs-clone-orchestrator.py` | hook+manifest+script-call+settings+skill | sgs-clone orchestrator (Phase 7 rewire). |
| `sgs-update-v2.py` | manifest+script-call+skill | 13-stage holistic refresh of the SGS framework knowledge base. |
| `shared_utils.py` | manifest+script-call | Shared, zero-dependency utilities for the SGS clone scripts. |
| `stage8-audit.js` | manifest+npm+script-call | ONE Lighthouse run. ⚠ **header disputes this — it IS wired** |
| `strip-dead-radius-legacy-args.py` | manifest | Strip the provably-dead legacy tier args from sgs_border_radius_tiers() calls. |
| `strip-dead-radius-tier-stanzas.py` | manifest | Delete the DEAD duplicate border-radius tier stanzas from render.php. |
| `survey-border-control-migration.py` | manifest+npm+script-call | Classify every block's border UI against the SgsBorderControl target shape. |
| `survey-flex-row-shape.py` | manifest+script-call | Classify every authored sgs/container flex ROW by what it is actually doing. |
| `surveys/audit-css-element-drift.py` | manifest | Audit `block_attributes.css_element` against each block's own element manifest. |
| `surveys/census-media-control-instances.py` | manifest | Every CONTROL INSTANCE in the library, for every media-atom attribute. |
| `surveys/census-media-presentation.py` | manifest+npm | Census extension — the PRESENTATION half of the media-element manifest. |
| `surveys/census-tier-siblings.sh` | manifest | Re-runnable census of per-device tier-sibling attribute instances |
| `surveys/check-control-parity-live.js` | manifest | property, against a native control on the same page. |
| `surveys/check-image-controls-support.py` | manifest+npm+script-call | Standing defence for the `imageControls` "declared-but-unverified capability" |
| `surveys/compare-reach-depth.py` | manifest+script-call | Does resolution DEPTH change the answer? Measure, do not assume. |
| `surveys/extract-native-contracts.py` | manifest | Extract the REQUIRED props (and the __next* opt-ins) from Gutenberg's own |
| `surveys/fetch-native-control-contracts.sh` | manifest+script-call | Fetch the CANONICAL prop contract for each WordPress core control primitive straight from the Gutenberg source, so a golden describes the real… |
| `surveys/lib/control-detection.js` | manifest+script-call | Answers ONE question per (block, attribute): **can a client set this?** |
| `surveys/lib/php-kind-consumption.js` | manifest+script-call | BRANCH-AWARE CONSUMPTION ANALYSER for the shared container wrapper. |
| `surveys/lib/wrapper-capability-selftest.js` | manifest+script-call | Self-test for the wrapper-capability census. |
| `surveys/survey-background-colour-support.py` | manifest+npm+script-call | Track A completion audit — native colour/gradient background support. |
| `surveys/survey-box-controls.py` | manifest+npm | "--survey" census of the BOX (4-side) and BORDER |
| `surveys/survey-colour-controls.py` | manifest+npm+script-call | Phase 0.0 "--survey" census of the COLOUR property |
| `surveys/survey-colour-coverage.py` | manifest+npm | census of which PAINTED colours across sgs/ blocks ⚠ **header disputes this — it IS wired** |
| `surveys/survey-control-gaps.py` | manifest+npm | the SHOULD-BE census: a control weaker than its value. |
| `surveys/survey-control-mounts.py` | manifest+npm+script-call | Re-measure every control-population figure Spec 35 Part O asserts. |
| `surveys/survey-control-parity.py` | manifest+npm+script-call | do SGS inspector controls look like NATIVE WordPress? |
| `surveys/survey-dead-css.py` | manifest+npm | the DEAD-CSS census: a selector whose precondition the |
| `surveys/survey-enum-control-shape.py` | manifest+script-call | Every declared block.json enum, its option count, and the control shape rendering it. |
| `surveys/survey-experimental-imports.js` | manifest+npm+script-call | ONE DETECTOR, THREE MODES (D542, Bean-locked): |
| `surveys/survey-extension-usage.py` | manifest | Phase 2.1 usage derivation — the prerequisite before inverting a universal |
| `surveys/survey-golden-conformance.js` | manifest+npm+script-call | WHAT THIS IS FOR. `golden-controls.json` states what shape a control must have. Rule 31 enforces the colour contract and reports 409 findings.… |
| `surveys/survey-inspector-surface.js` | manifest+npm | inspector surface across all 83 sgs/ blocks, per D543/D544. |
| `surveys/survey-length-controls.py` | manifest+npm+script-call | Phase 0.0 "--survey" census of the LENGTH property |
| `surveys/survey-media-elements.py` | manifest | Wave 1 census for the unified media element. |
| `surveys/survey-native-supports.py` | manifest+npm+script-call | Phase 2.2 census — native WordPress `supports` capability routing. |
| `surveys/survey-responsive-shape.py` | manifest+npm+script-call | the responsive STORAGE-SHAPE census. |
| `surveys/survey-typography-controls.py` | manifest+npm | Phase 0.0 "--survey" census of the TYPOGRAPHY |
| `surveys/survey-wrapper-capability.js` | manifest+script-call | PHASE 0 CENSUS for the shared-wrapper decomposition. |
| `sync-business-info.py` | manifest+script-call | Tier-1 business-data extractor + pusher (D325). |
| `sync-container-wrapping-blocks.py` | manifest+script-call | Tracks every SGS block that is container-bearing (wraps children via InnerBlocks, |
| `test-hover-state-guard.php` | manifest | Gate: the touch-safe hover emitter emits the shape it claims to. |
| `test-pack-pricing-cascade.php` | — | Standalone cascade-resolver test runner for Spec 28 P3 (FR-28-6). |
| `test_render_singleton_seeder.py` | — | Self-test for seed-render-singletons.py — Spec 31 §13.10. |
| `theme-extractor/colour.py` | manifest+script-call+skill | colour parsing + CIEDE2000 dedup for the Spec 33 extractor. |
| `theme-extractor/derive.py` | manifest+script-call | Pass B: PROVISIONAL palette derivation for drafts that declare NO :root tokens (FR-33-5). |
| `theme-extractor/extract.py` | manifest+script-call+skill | the Spec 33 draft global-styles extractor (CLI orchestrator). |
| `theme-extractor/measure.js` | manifest+script-call | THE IRON LAW (Spec 33 FR-33-1/33-3): the value the extractor ships is always the COMPUTED value on a really-rendered node — never a raw source… |
| `theme-extractor/palette.py` | manifest+script-call | build the theme colour palette from draft tokens (Spec 33 FR-33-1/2/9). |
| `theme-extractor/presets.py` | manifest+script-call | button presets, layout, and font families for the Spec 33 extractor. |
| `theme-extractor/roles.py` | manifest+script-call | colour ROLE inference by usage-context (Spec 33 FR-33-2). |
| `theme-extractor/schema_validate.py` | manifest+script-call | theme.json v3 structural validation (Spec 33 FR-33-7). |
| `theme-extractor/token_map.py` | manifest+script-call | declared-CSS parsing for the Spec 33 extractor (tinycss2, not regex). |
| `theme-extractor/typography.py` | manifest+script-call | base + heading typography from COMPUTED nodes (Spec 33 FR-33-3, the drift-killer). |
| `toolindex/build_index.py` | script-call | extracts a searchable purpose index from every script in |
| `toolindex/query.py` | manifest+script-call+skill | free-text search over the tool index built by build_index.py. |
| `uimax-tools/enrich-db.py` | manifest+script-call | SGS Framework DB Enrichment — 10 targets in one idempotent pass. |
| `uimax-tools/seed-block-compositions.py` | manifest+skill | Seed `patterns.block_composition` JSON column from theme pattern files. |
| `uimax-tools/seed-slot-synonyms.py` | manifest+script-call | Seed sgs-framework.db `slots` table with BEM element → standalone_block mappings |
| `uimax-tools/sgs-update-uimax-sync.py` | manifest+script-call | sgs-update Stage 3 + Stage 4 — uimax sync extension. |
| `uimax-tools/test_uimax_write_validator.py` | — | Tests for uimax-write-validator.py — Rosetta Stone discipline (Row 213) only. |
| `uimax-tools/uimax-write-validator.py` | hook+manifest+script-call+skill | Pre-write validator for uimax tables. |
| `uimax-tools/uimax_write.py` | manifest+script-call+skill | Validate-then-write helper for uimax tables. |
| `value-matcher/inheritance.py` | manifest+script-call | Default-inheritance lookup module. |
| `value-matcher/match.py` | manifest+script-call | Token value-matcher for the SGS Deterministic Draft-to-SGS Converter pipeline. |
| `variant-value-extractor/extract-variation-values.js` | manifest+script-call | each variation's `attributes` object as PLAIN JSON to stdout. |
| `visual-report-sha.py` | commit-gate+manifest+script-call | Content hash binding a visual-diff report to the change it actually describes. |
| `wp-pre-merge-gate.py` | commit-gate+manifest | Pre-merge validation gate for SGS WordPress plugin changes. |

#### `scripts/` — 18 scripts

| Script | Wired | Purpose (its own words) |
|---|---|---|
| `apply-block-attrs-batch.js` | — | One-off companion to wp-update-block-attrs.js for the Indus homepage attribute-mirror task (2026-07-16). Handles the case wp-update-block-attrs.js… |
| `brand-palette-sampler.py` | — |  |
| `colour-parity-audit.js` | — | Colour Parity Audit — automated comparison between mockup HTML brief and SGS variation JSON. |
| `css-pattern-audit.js` | commit-gate | CSS pattern audit — static analysis for risky patterns in deployed/built CSS. |
| `font-source-audit.js` | manifest+npm | Font source audit — static analysis for external CDN URLs in theme.json fontFace declarations. |
| `global-styles-reset.js` | skill | wp_global_styles reset + reapply. |
| `lib/oldshape-mappings.js` | script-call | wp-migrate-oldshape-blocks.js (Track B content restore, 2026-07-15). |
| `lint-naming-conventions.py` | manifest | CI linter for the SGS WordPress Framework naming conventions. |
| `lint-patterns-for-personal-data.py` | manifest+npm | Lint SGS pattern PHP files for hardcoded personal data. |
| `qc-anti-cheat.py` | script-call | Static-analysis gate that fails on converter-cheating patterns. |
| `qc-correctness-regression.py` | — | Mechanical regression checker for the SGS clone pipeline. |
| `qc_anti_cheat_checks.py` | script-call | Cheat-pattern definitions, AST visitor, and file analysers. |
| `render-mobile-override-audit.js` | — | Render.php inline-vs-media audit. |
| `sgs-block-grep.py` | — | SGS block-name search utility — fixes the block-name-search-blindspot failure mode. |
| `verify-restored-page.js` | — | The Track B definition-of-done requires the restore to be proven on the REAL page via computed DOM (R-31-11), not on assertion output or the emitted… |
| `wc-pages-responsive-audit.js` | manifest+script-call | FR-30-11 — WooCommerce page-type responsive + budget verification gate. |
| `wp-migrate-oldshape-blocks.js` | manifest+script-call | block migrations (Track B, 2026-07-15), through the BLOCK EDITOR ONLY. |
| `wp-update-block-attrs.js` | script-call+skill | Reusable Playwright helper that updates a block's attributes on a live WordPress post by going through the editor — using wp.blocks.createBlock(name… |

<!-- TOOLING-CATALOGUE:END -->

---

## Helper & component/atom catalogue

This section is **GENERATED** by `plugins/sgs-blocks/scripts/generate-helper-catalogue.py`.
Do not hand-edit it — edits are overwritten.

The tooling catalogue above covers checker/migration/codemod SCRIPTS. This section covers the
other half of "what already exists": PHP helper FUNCTIONS in
`plugins/sgs-blocks/includes/helpers-*.php`, and shared JS editor components/atoms in
`plugins/sgs-blocks/src/components/`. Search it before writing a new helper or component.

Regenerate with `python plugins/sgs-blocks/scripts/generate-helper-catalogue.py`. `--check` fails
if it is stale.

<!-- HELPER-CATALOGUE:START -->

This section is **GENERATED** by `plugins/sgs-blocks/scripts/generate-helper-catalogue.py`. Do not hand-edit — edits are overwritten. It covers the other half of "what already exists" that the tooling catalogue above doesn't: PHP helper FUNCTIONS (not scripts) and JS editor components/atoms. It makes existing helpers discoverable — read this before writing a new helper or component that might already exist.

### PHP helper functions — `includes/helpers-*.php`

Every top-level `function sgs_xxx(...)` across every `helpers-*.php` file, grouped by file, with the one-line purpose from its own docblock (or the adjacent `//` comment when it has no docblock). **UNDOCUMENTED** means neither exists in source — that is a real gap in the code, not a gap in this catalogue; add a docblock rather than inferring a purpose here.

#### `includes/helpers-box.php` — 9 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_css_length_sanitise` | `function sgs_css_length_sanitise( $value ): string` | Strip a CSS length value down to the safe grammar (digits, letters for the unit, dot, percent) — the shared form of the local… |
| `sgs_css_keyword_sanitise` | `function sgs_css_keyword_sanitise( $value ): string` | Strip a CSS keyword value down to letters + hyphen only (e.g. 'inline-block', 'uppercase') — the shared form of the local… |
| `sgs_native_border_style_width_args` | `function sgs_native_border_style_width_args( $style_raw, $width_raw ): array` | Gate a WP-native `style.border.style` + `style.border.width` PAIR so a border-style set with no width never falls through to the browser's… |
| `sgs_native_border_has_width` | `function sgs_native_border_has_width( array $border ): bool` | True when a native `style.border` array carries a width in EITHER shape. |
| `sgs_gate_native_border_style` | `function sgs_gate_native_border_style( array $border ): array` | Apply the SAME "no width = no border" gate (see `sgs_native_border_style_width_args()` above) to an ALREADY-BUILT native `style.border`… |
| `sgs_box_object_shorthand` | `function sgs_box_object_shorthand( array $box ): ?string` | Build a 4-side CSS shorthand ("top right bottom left") from a box object, filling any unset side with '0'. Returns null when every side is… |
| `sgs_corner_object_shorthand` | `function sgs_corner_object_shorthand( $box ): ?string` | Build a 4-CORNER CSS shorthand ("top-left top-right bottom-right bottom-left") from a corner-keyed box object, filling any unset corner… |
| `sgs_border_radius_tiers` | `function sgs_border_radius_tiers( array $attributes ): array` | Resolve a block's `borderRadius` attribute into desktop/tablet/mobile corner objects, shape-agnostic (Phase 2 tier-object migration… |
| `sgs_label_box_css_rule` | `function sgs_label_box_css_rule( array $box, string $selector ): string` | Build the SCOPED CSS for a label-style box on ONE selector. |

#### `includes/helpers-button-style.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_button_element_style_css` | `function sgs_button_element_style_css( array $attrs, string $prefix, string $selector, bool $bg_layer =…` | Build a scoped CSS string (base rule + hover/focus rule) for a built-in button-like element, reading a prefixed attribute set. |

#### `includes/helpers-cart-panel.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_cart_trigger_html` | `function sgs_cart_trigger_html( string $mode, string $inner_html, array $args ): string` | Build the cart trigger for the given display mode. |
| `sgs_cart_panel_body_html` | `function sgs_cart_panel_body_html( array $args ): string` | Build the shared mini-cart panel body. |
| `sgs_cart_panel_wrapper_html` | `function sgs_cart_panel_wrapper_html( string $mode, string $body_html, array $args ): string` | Wrap the panel body in the element the display mode's ARIA pattern requires. |

#### `includes/helpers-colour-variants.php` — 9 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_fill_decls` | `function sgs_fill_decls( array $attributes, array $map ): array` | Build the FILL (background) DECLARATIONS for a block, per state. |
| `sgs_fill_states_css` | `function sgs_fill_states_css( string $selector, array $attributes, array $map ): string` | Convenience wrapper for a block that DOES own its own rule for this variant alone. |
| `sgs_text_decls` | `function sgs_text_decls( array $attributes, array $map ): array` | Build the TEXT DECLARATIONS for a block, per state. |
| `sgs_text_states_css` | `function sgs_text_states_css( string $selector, array $attributes, array $map ): string` | Convenience wrapper for a block that DOES own its own rule for this text-colour row alone — the sgs_fill_states_css() sibling for text.… |
| `sgs_border_states_css` | `function sgs_border_states_css( string $selector, array $attributes, array $map ): string` | Emit the BORDER-colour CSS for a block, both states, at one selector. |
| `sgs_overlay_decls_for` | `function sgs_overlay_decls_for( array $attributes, array $map ): array` | Build the OVERLAY DECLARATIONS for a block, per state. |
| `sgs_shadow_attr` | `function sgs_shadow_attr( string $base, string $part = 'base' ): string` | Derive ONE of a shadow family's attribute names from its base name. |
| `sgs_shadow_attr_map` | `function sgs_shadow_attr_map( string $base, bool $with_hover_shape = false, bool $with_hover_colour = false…` | The full attribute-name map for a shadow family, ready for sgs_shadow_decls(). |
| `sgs_shadow_decls` | `function sgs_shadow_decls( array $attributes, array $map ): array` | Build the SHADOW DECLARATIONS for a block, per state. |

#### `includes/helpers-colour-wcag.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_wcag_relative_luminance` | `function sgs_wcag_relative_luminance( string $hex ): float` | Compute the WCAG 2.1 relative luminance of an sRGB hex colour. |
| `sgs_wcag_text_colour_for_bg` | `function sgs_wcag_text_colour_for_bg( string $hex ): string` | Return `#000` or `#fff` — whichever gives the higher WCAG contrast ratio against the supplied background hex colour. |
| `sgs_wcag_preferred_text_colour_for_bg` | `function sgs_wcag_preferred_text_colour_for_bg( string $bg_hex, string $preferred_hex ): string` | Return a PREFERRED foreground colour when it meets WCAG AA (>= 4.5:1) against the given background; otherwise degrade to the binary… |
| `sgs_resolve_palette_hex` | `function sgs_resolve_palette_hex( string $slug, string $fallback = '' ): string` | Resolve a theme.json palette colour to its hex value by slug, reading the MERGED global settings (default → theme → user/wp_global_styles)… |

#### `includes/helpers-configurator-pricing.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_configurator_format_minor` | `function sgs_configurator_format_minor( int $minor, int $decimals ): string` | Format a minor-int price as a plain display string (symbol + amount), matching the SSR pattern used across the configurator (wc_price, tags… |
| `sgs_configurator_mode_price` | `function sgs_configurator_mode_price( array $combo, string $mode, int $decimals, string $suffix ): string` | The current-price display string for a combo under a tax-display mode (TAX-UI). |
| `sgs_configurator_mode_regular` | `function sgs_configurator_mode_regular( array $combo, string $mode, int $decimals ): string` | The struck-through regular-price display string for a combo under a tax mode. |
| `sgs_configurator_per_unit_display` | `function sgs_configurator_per_unit_display( array $combo, string $mode, int $decimals, string $template )…` | Per-unit price display string for a combo under a tax mode, e.g. "£1.04 per bar". |

#### `includes/helpers-container.php` — 8 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_sanitize_grid_template` | `function sgs_sanitize_grid_template( $value )` | Sanitise a CSS grid-template-columns value for safe inline-style emission. |
| `sgs_serialise_box_sides` | `function sgs_serialise_box_sides( $box ): string` | Serialise a 4-side box-object attr ({top,right,bottom,left}) to a CSS padding shorthand string ("top right bottom left"). Neutral: an empty… |
| `sgs_serialise_box_corners` | `function sgs_serialise_box_corners( $box ): string` | Serialise a 4-corner box-object attr ({topLeft,topRight,bottomLeft,bottomRight}) to a CSS border-radius shorthand string. CSS border-radius… |
| `sgs_container_gap_value` | `function sgs_container_gap_value( $gap )` | Resolve a gap attribute value to a safe CSS declaration fragment (the part after "gap:"). |
| `sgs_container_tier_gap` | `function sgs_container_tier_gap( array $attributes, string $tier ): string` | Resolve the effective gap for one device tier, under EITHER responsive model. |
| `sgs_intrinsic_columns_track` | `function sgs_intrinsic_columns_track( int $count, string $gap_value, ?string $basis = null ): string` | Build a track list where the operator's column count is a CEILING, not a fixed number — so columns fall away when content genuinely stops… |
| `sgs_container_tier_min_column_width` | `function sgs_container_tier_min_column_width( array $attributes, string $tier ): ?string` | Resolve the effective intrinsic-columns BASIS (minimum column width) for one device tier, from `sgs/container`'s client-configurable… |
| `sgs_block_wants_intrinsic_columns` | `function sgs_block_wants_intrinsic_columns( $block ): bool` | Does this block type opt in to content-aware column collapse? |

#### `includes/helpers-css-safety.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_css_length_value_preset_slugs` | `function sgs_css_length_value_preset_slugs(): array` | Return the currently-registered WP spacing-preset slugs (e.g. ['10','20', '30','40','50','60']), read live from theme.json via… |
| `sgs_css_length_value` | `function sgs_css_length_value( $value )` | Validate and normalise a CSS length-shaped value for safe inline emission. |
| `sgs_css_length_value_self_test` | `function sgs_css_length_value_self_test()` | Run every accept/reject/backward-compat case and report an honest count. |

#### `includes/helpers-hover-state.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_hover_guarded_rule` | `function sgs_hover_guarded_rule( string $hover_selector, string $decls ): string` | Wrap a hover-only rule in both guards. |
| `sgs_hover_state_rules` | `function sgs_hover_state_rules( string $selector, string $decls, string $focus = ':focus-visible', string…` | Emit a hover state as a touch-safe PAIR: a guarded hover rule plus an unguarded focus rule carrying the identical declarations. |
| `sgs_hover_media_wrap` | `function sgs_hover_media_wrap( string $rule ): string` | Wrap an ALREADY-BUILT hover rule in the layer-1 media query. |

#### `includes/helpers-info-toggle.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_render_info_toggle` | `function sgs_render_info_toggle( string $panel_text, string $aria_label = '', string $extra_class = '' )…` | Render an info-toggle button + its (initially hidden) panel. |

#### `includes/helpers-link.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_link_attributes` | `function sgs_link_attributes( ?array $link ): string` | Resolve an `SgsLinkControl` object attr into a safe HTML attribute string for an `<a>` tag (href + target + rel), ready to interpolate… |

#### `includes/helpers-list-markers.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_list_marker_types` | `function sgs_list_marker_types()` | The allowed `markerType` values (no JSON `enum` on the attribute — blockjson-enum-coerces-invalid-to-default — so callers validate here). |
| `sgs_list_marker_sanitise_type` | `function sgs_list_marker_sanitise_type( $raw, $fallback_type = 'icon' )` | Validate a stored `markerType` value, falling back to a safe default. |
| `sgs_list_marker_element_tag` | `function sgs_list_marker_element_tag( $marker_type )` | The list ROOT tag for a given marker type. `numbered` renders a real `<ol>` so order is conveyed to assistive tech and crawlers; every… |
| `sgs_list_marker_render` | `function sgs_list_marker_render( $marker_type, $icon_html )` | Build the per-item marker markup for one `<li>`. |
| `sgs_icon_list_flatten_menu_blocks` | `function sgs_icon_list_flatten_menu_blocks( array $blocks )` | Flatten resolved nav blocks (from SGS_Nav_Menu_Source::blocks_from_ref()) into `{ text, url }` pairs shaped like an `sgs/icon-list` typed… |

#### `includes/helpers-media-element.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_media_element_attr` | `function sgs_media_element_attr( $prefix, $base )` | Build a prefixed media attribute name. |
| `sgs_media_element_stored_attr` | `function sgs_media_element_stored_attr( $block_slug, $prefix, $base )` | Resolve the attribute name a SURFACE actually stores. |
| `sgs_media_element_value` | `function sgs_media_element_value( array $attributes, $name, $want = 'raw' )` | Read a media attribute's value, tolerating every storage SHAPE. |
| `sgs_media_element_scope_class` | `function sgs_media_element_scope_class( $uid, $prefix )` | The per-ELEMENT scope class for one media element on a block. |
| `sgs_media_element_style` | `function sgs_media_element_style( array $attributes, $prefix, $block_slug, $scope_class, array $atoms )` | Every declared atom's custom-property VALUES for one media element, as one scoped CSS rule. |

#### `includes/helpers-media-position.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_media_position_focal_to_css` | `function sgs_media_position_focal_to_css( $focal_point )` | FocalPointPicker {x,y} (floats 0-1) -> CSS "X% Y%" object-position value. Clamped 0-1, rounded 2dp. Returns '' when unset or at the CSS… |
| `sgs_media_position_css` | `function sgs_media_position_css( array $attributes, $prefix, $selector )` | Build a scoped object-fit/object-position CSS rule for one media element. The caller passes its OWN, already-safe selector — this function… |

#### `includes/helpers-media.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_responsive_image` | `function sgs_responsive_image( int $id, string $url, string $alt = '', string $size = 'large', array $attrs =…` | Output a responsive image tag with srcset when a valid attachment ID is available. |
| `sgs_next_background_image_index` | `function sgs_next_background_image_index(): int` | Return the next 1-based index in the PAGE-WIDE background-image render order. |
| `sgs_render_stars` | `function sgs_render_stars( float $rating, int $best_rating = 5, int $size = 20, string $colour_css =…` | Render inline SVG star icons for a given rating value. |
| `sgs_render_media` | `function sgs_render_media( $attrs, $context = '' )` | Render an image or video from a unified SGS media-slot attribute. |

#### `includes/helpers-mega-render.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_mega_render_panel_content` | `function sgs_mega_render_panel_content( int $panel_id ): ?string` | Resolve a mega panel post ID to its rendered inner HTML, guarding against self-reference recursion + runaway depth. |

#### `includes/helpers-responsive.php` — 15 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_responsive_sanitise_unit` | `function sgs_responsive_sanitise_unit( $unit )` | Strip a CSS unit down to safe letters/percent only. |
| `sgs_responsive_css_rule` | `function sgs_responsive_css_rule( array $attributes, array $prop_map, $selector )` | Build a scoped responsive CSS rule (base + tablet + mobile) for one or more independent CSS properties on the SAME selector. |
| `sgs_responsive_box_shorthand_rule` | `function sgs_responsive_box_shorthand_rule( array $attributes, $css_prop, array $sides, $unit_attr…` | Build a scoped responsive 4-side shorthand rule (e.g. margin / padding) for one selector. Mirrors the heading block's original wrapper… |
| `sgs_responsive_side_order` | `function sgs_responsive_side_order()` | Canonical side order for box properties (also the CSS shorthand order). |
| `sgs_responsive_normalise_object` | `function sgs_responsive_normalise_object( $raw, $is_box = false )` | Coerce a stored attribute value into the `{desktop,tablet,mobile}` shape. |
| `sgs_responsive_atoms_from_spec` | `function sgs_responsive_atoms_from_spec( array $spec )` | Expand one property spec into a flat list of scalar "atoms". |
| `sgs_responsive_format_atom_value` | `function sgs_responsive_format_atom_value( $raw, $unit, $cast, $transform )` | Format one raw atom value into a CSS value string, or null if unusable. |
| `sgs_responsive_sanitise_css_value` | `function sgs_responsive_sanitise_css_value( $value )` | Sanitise a free-text CSS length/expression value for a scoped <style>. |
| `sgs_emit_responsive_css` | `function sgs_emit_responsive_css( $selector, array $prop_map, array $opts = array() )` | Emit scoped responsive CSS for object-model properties on one selector. |
| `sgs_canonicalise_responsive_attrs` | `function sgs_canonicalise_responsive_attrs( array $attrs )` | Canonicalisation ORACLE for object-model responsive attributes. |
| `sgs_resolve_tier` | `function sgs_resolve_tier( $value, $tier = 'desktop', $default = null )` | Canonical tier-resolver — generalised cascade for both tri-state enums and scalar/null-marker values. Implements the contract: desktop… |
| `sgs_emit_tier_rules` | `function sgs_emit_tier_rules( $uid_selector, $value, $css_on, $css_off = '', $default = 'off' )` | Emit scoped per-tier CSS rules (base + tablet + mobile) for a tri-state ('inherit'\|'on'\|'off') responsive behaviour attribute, resolved… |
| `sgs_emit_tier_rules_map` | `function sgs_emit_tier_rules_map( $uid_selector, $value, array $css_by_value, $css_fallback = '', $default =…` | The general N-value form of {@see sgs_emit_tier_rules()}: emit scoped per-tier CSS for a responsive attribute whose resolved value is one… |
| `sgs_resolve_on_tiers` | `function sgs_resolve_on_tiers( $raw, $on_marker, $default )` | Resolve a `{desktop,tablet,mobile}` responsive object into the list of tiers where the effective value equals $on_marker, via the canonical… |
| `sgs_merge_tri_state_declarations` | `function sgs_merge_tri_state_declarations( $selector, $behaviours, $default = 'off', $on_marker = 'on' )` | Merge several tri-state ('on'/'off'/'inherit') behaviours that may write to the SAME selector into ONE set of declarations per tier, with a… |

#### `includes/helpers-row-behaviour.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_row_shrink_css` | `function sgs_row_shrink_css( $selector, $padding )` | Build the per-instance "shrunk" vertical-padding CSS for one row. |
| `sgs_block_is_header_essential` | `function sgs_block_is_header_essential( $block_name )` | Is this block type flagged as essential header furniture? |
| `sgs_resolve_row_shrink_hide_target` | `function sgs_resolve_row_shrink_hide_target( $block, $raw_target )` | Validate the stored shrink-hide target against this row's actual children. |

#### `includes/helpers-scoped-instance-vars.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_scope_class_for_root` | `function sgs_scope_class_for_root( string $root_tag_html, string $prefix ): string` | Find an existing SGS uid-pattern class (`sgs-<slug>-<8hex>`, the pattern every migrated render.php already emits as its scoping selector… |
| `sgs_append_scoped_var_style` | `function sgs_append_scoped_var_style( string $block_content, string $scope_class, array $declarations )…` | Append a scoped `<style>` rule declaring CSS custom properties on the given scope class, to a block's rendered HTML. No-op when there are… |
| `sgs_extract_root_opening_tag` | `function sgs_extract_root_opening_tag( string $root_and_beyond ): string` | Extract just the root element's OPENING tag from a block-content substring that starts at the real root (i.e. past any leading… |

#### `includes/helpers-svg-gradient.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_svg_stroke_gradient` | `function sgs_svg_stroke_gradient( string $gradient_css, string $id, string $target = 'stroke' ): array` | Convert a validated CSS gradient string into SVG gradient-def markup plus the CSS declaration that paints an icon's stroke with it. |
| `sgs_svg_inject_defs` | `function sgs_svg_inject_defs( string $svg_markup, string $defs ): string` | Inject an SVG gradient <defs> block as the first child of an SVG's opening tag. `<defs>` never paints on its own (SVG spec) so this is safe… |
| `sgs_icon_gradient_css` | `function sgs_icon_gradient_css( string $icon_source, string $gradient_css, string $unique_id, string…` | Icon gradient composer — the ONE call site every icon-source-aware block (`sgs/icon`, and eventually… |
| `sgs_icon_gradient_states_css` | `function sgs_icon_gradient_states_css( string $icon_source, string $base_gradient, string $hover_gradient…` | Resolve BOTH resting + hover icon gradient state in one call and return ready-to-append scoped-CSS rules plus each state's <defs> markup. |

#### `includes/helpers-svg-kses.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_svg_kses_allowed_tags` | `function sgs_svg_kses_allowed_tags(): array` | Returns the wp_kses allowed-tags array for sanitising inline SVG markup. |

#### `includes/helpers-tier-media.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_allowed_svg_tags` | `function sgs_allowed_svg_tags(): array` | The SGS inline-SVG allow-list for `wp_kses()`. |
| `sgs_tier_media_render` | `function sgs_tier_media_render( array $tiers, string $base_class, string $uid, $alt = '', array $extra =…` | Render up to three device tiers of media, each with its own TYPE. |
| `sgs_tier_media_has_source` | `function sgs_tier_media_has_source( array $spec ): bool` | Does a tier spec resolve to something renderable? |
| `sgs_tier_media_toggle_css` | `function sgs_tier_media_toggle_css( array $present, string $base_class, string $uid ): string` | Breakpoint rules that show exactly one tier at any width. |

#### `includes/helpers-tokens.php` — 34 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_attr_has_value` | `function sgs_attr_has_value( $val ): bool` | Determine whether an attribute value is meaningfully set. |
| `sgs_css_value_has_breakout` | `function sgs_css_value_has_breakout( string $value ): bool` | True when a CSS VALUE contains a declaration/rule-breakout or URL-fetch token and must not be emitted into a scoped `<style>` element. |
| `sgs_is_css_colour` | `function sgs_is_css_colour( string $value ): bool` | Determine whether a value is a direct CSS colour rather than a design token slug. |
| `sgs_functional_colour_to_hex` | `function sgs_functional_colour_to_hex( string $value ): string` | Normalise a functional-colour notation — rgb()/rgba()/hsl()/hsla() — to a hex string (6-digit, or 8-digit `#RRGGBBAA` when an alpha < 1 is… |
| `sgs_rgb_to_hex` | `function sgs_rgb_to_hex( array $rgb, string $alpha_tok = '' ): string` | Build a hex string from an RGB triple (each 0-255) + an optional CSS alpha token (0-1 float or a percentage). Emits 8-digit `#RRGGBBAA`… |
| `sgs_css_num_or_pct` | `function sgs_css_num_or_pct( string $tok, float $pct_base ): float` | Resolve a CSS number-or-percentage token. A percentage is taken as a fraction of `$pct_base`; a bare number is returned as-is. |
| `sgs_linear_srgb_to_255` | `function sgs_linear_srgb_to_255( float $c ): int` | Gamma-encode a linear-sRGB channel (0-1) to a clamped 0-255 byte. |
| `sgs_hwb_to_rgb` | `function sgs_hwb_to_rgb( float $h, float $w, float $b ): array` | CSS Color 4 hwb() → RGB (each 0-255). H degrees, W/B percent (0-100). |
| `sgs_oklab_to_rgb` | `function sgs_oklab_to_rgb( float $lightness, float $a, float $b ): array` | OKLab → sRGB (each 0-255). Björn Ottosson's canonical matrices. |
| `sgs_lab_to_rgb` | `function sgs_lab_to_rgb( float $lightness, float $a, float $b ): array` | CIE Lab (D50) → sRGB (each 0-255) — via XYZ(D50) → linear sRGB with the CSS Color 4 Bradford-adapted D50→D65 matrix. |
| `sgs_normalise_css_functional_colours` | `function sgs_normalise_css_functional_colours( string $value ): string` | Normalise EVERY functional-colour occurrence (rgb/rgba/hsl/hsla) EMBEDDED in a compound CSS value string to hex — e.g. a box-shadow `0 2px… |
| `sgs_css_channel_to_255` | `function sgs_css_channel_to_255( string $tok ): int` | Convert an rgb() channel token (0-255 integer or a percentage) to 0-255. |
| `sgs_css_alpha_to_255` | `function sgs_css_alpha_to_255( string $tok ): int` | Convert a CSS alpha token (0-1 float or a percentage) to a 0-255 byte. |
| `sgs_hsl_to_rgb` | `function sgs_hsl_to_rgb( float $h, float $s, float $l ): array` | Convert HSL to RGB (each 0-255). H in degrees, S/L in percent (0-100). |
| `sgs_colour_value` | `function sgs_colour_value( ?string $slug_or_value ): string` | Resolve a colour attribute value to a CSS colour string. |
| `sgs_shadow_value` | `function sgs_shadow_value( ?string $slug_or_value ): string` | Resolve a shadow attribute value to a CSS box-shadow string. |
| `sgs_shadow_value_composed` | `function sgs_shadow_value_composed( ?string $shape, ?string $colour ): string` | Compose a shadow SHAPE (offset-x/offset-y/blur/spread + optional `inset`, no embedded colour — `ShadowControl`'s stored value under the… |
| `sgs_shadow_value_to_drop_shadow` | `function sgs_shadow_value_to_drop_shadow( string $shadow_value ): string` | Convert a composed `box-shadow` value (from `sgs_shadow_value_composed()`) into the argument `filter: drop-shadow()` accepts. |
| `sgs_css_gradient_value` | `function sgs_css_gradient_value( ?string $value ): string` | Validate a CSS gradient value for safe emission into a scoped rule / custom property. |
| `sgs_background_paint_value` | `function sgs_background_paint_value( ?string $colour, ?string $gradient ): array` | Resolve a colour attribute + its sibling gradient attribute to the correct `background-*` CSS declaration — Builder 1 of the D636 universal… |
| `sgs_background_paint_decl` | `function sgs_background_paint_decl( ?string $colour, ?string $gradient ): string` | Convenience wrapper around sgs_background_paint_value() that returns the full CSS declaration string (`property:value`, no trailing… |
| `sgs_block_background_layer_css` | `function sgs_block_background_layer_css( string $selector, string $paint_decl, string $hover_paint_decl = ''…` | Move a block's own BLOCK BACKGROUND paint off the element itself onto a `::after` pseudo-element layer, so a sibling text-gradient… |
| `sgs_custom_property_gradient_decls` | `function sgs_custom_property_gradient_decls( string $var_name, string $flat, string $gradient, string…` | Gradient sibling for a colour-valued custom property that has NO stable CSS selector of its own to hang a direct scoped rule on (the shape… |
| `sgs_gradient_overlay_attr` | `function sgs_gradient_overlay_attr( string $base, string $part = 'gradient' ): string` | Derive ONE of a gradient-overlay family's attribute names from its base. |
| `sgs_gradient_overlay_attr_map` | `function sgs_gradient_overlay_attr_map( string $base, ?string $solid = null ): array` | The attribute-key map for a gradient-overlay family. |
| `sgs_overlay_decls` | `function sgs_overlay_decls( ?string $colour, ?string $gradient, $opacity = null, ?string $blend_mode = null…` | Resolve an overlay LAYER's complete CSS declaration set — colour/gradient paint plus its own opacity (D717, 2026-08-21) plus its own blend… |
| `sgs_text_colour_decl` | `function sgs_text_colour_decl( ?string $value ): string` | Resolve a text-colour attribute (flat colour OR gradient string, D636 single-attribute storage) into a bare CSS declaration fragment — no… |
| `sgs_text_colour_gradient_fallback_rule` | `function sgs_text_colour_gradient_fallback_rule( string $selector, ?string $value ): string` | The `@supports not (background-clip: text)` fallback rule that MUST accompany `sgs_text_colour_decl()` whenever its input was a gradient (a… |
| `sgs_resolve_text_colour_or_gradient` | `function sgs_resolve_text_colour_or_gradient( ?string $flat_value, ?string $gradient_value ): string` | Resolve which of a text-colour attribute's two SIBLING values should be used — the flat colour attribute, or its `{attr}Gradient` sibling. |
| `sgs_grid_border_parts` | `function sgs_grid_border_parts( string $value ): array` | Split a `gridItemBorder`-style CSS border SHORTHAND string ("1px solid #ccc") into its width/style/colour parts, order-independent. |
| `sgs_border_gradient_css` | `function sgs_border_gradient_css( string $selector, string $normal_paint, ?string $hover_paint = null, string…` | Universal masked-`::before` gradient-border emitter (D636 border builder, 2026-08-16). `border-color` cannot legally hold a CSS gradient —… |
| `sgs_emit_state_colour_css` | `function sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover, array…` | Universal per-instance hover/focus-visible colour-state emitter. |
| `sgs_font_size_value` | `function sgs_font_size_value( ?string $slug_or_value ): string` | Resolve a font-size attribute value to a CSS font-size string. |
| `sgs_transition_vars` | `function sgs_transition_vars( array $attributes ): array` | Build CSS custom properties for transition duration and easing. |

#### `includes/helpers-typography.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_typography_attr` | `function sgs_typography_attr( $prefix, $base )` | Build a prefixed attribute key. '' + 'FontSize' → 'fontSize'; 'label' + 'FontSize' → 'labelFontSize'. |
| `sgs_font_family_sanitise` | `function sgs_font_family_sanitise( $value ): string` | Sanitise a font-family value for safe CSS interpolation. |
| `sgs_typography_css_rule` | `function sgs_typography_css_rule( array $attributes, $prefix, $selector, $indent_sibling_selector = ''…` | Build a scoped typography CSS rule string (base + responsive) for one element. The caller wraps the return value in a single <style> tag. |
| `sgs_link_colour_css` | `function sgs_link_colour_css( array $attributes, $prefix, $selector )` | Two-state, flat-or-gradient LINK colour for a RichText field whose `allowedFormats` permits `core/link` — a linked selection and the… |

#### `includes/helpers-value-ladder.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_saving_display` | `function sgs_saving_display( int $anchor_per_unit_pence, int $pack_per_unit_pence, string $framing_mode, bool…` | Plain-text saving label for one row of the comparative value ladder (Spec 28 P1). |
| `sgs_value_ladder` | `function sgs_value_ladder( array $combos, ?int $base_pence, string $framing_mode, bool $decoy_enabled, string…` | Build a sorted, deduplicated comparative value ladder for a product's combos (Spec 28 P1). |

**25 files, 133 functions.** Regenerate with `python plugins/sgs-blocks/scripts/generate-helper-catalogue.py`.

### JS shared editor components — `src/components/*.js`

One row per file (top-level only, not sub-directories, except the dedicated `media/atoms/` table below). Purpose is the file's own top-of-file JSDoc/comment header — **UNDOCUMENTED** when absent.

| File | Exports | Purpose |
|---|---|---|
| `AnimationControl.js` | `AnimationControl (default)` | Animation selector for block sidebar. |
| `BooleanResponsiveControl.js` | `BooleanResponsiveControl (default)` | BooleanResponsiveControl — a single ToggleControl on Desktop, a 3-way Inherit/On/Off switch on Tablet/Mobile, driven by the… |
| `BorderStyleControl.js` | `BorderStyleControl (default)` | BorderStyleControl — thin SGS wrapper matching WP core's native `BorderControlStylePicker` exactly (Bean-directed, 2026-08-19). |
| `ColumnShapePicker.js` | `ColumnShapePicker (default)`, `weightsToTrack`, `activeShapeKey`, `ColumnShapePicker` | ColumnShapePicker — pick a column SHAPE by clicking a diagram (FR-37-42). |
| `CursorFieldRowControls.js` | `CursorFieldRowControls` | CursorFieldRowControls — shared cursor-reactive-field (FR-38-25) controls for blocks that are NOT on the shared fx ToolsPanel… |
| `DateTimePickerField.js` | `DateTimePickerField (default)` | DateTimePickerField — the SGS standard DATE control (golden-controls.json goldens/input.json `date` row, Bean-approved live… |
| `DesignTokenPicker.js` | `DesignTokenPicker (default)`, `resolveColourToken` | Colour picker that reads the active theme.json palette. |
| `FlowingGradientRowControls.js` | `isCssOnlyFlowingGradientVariant`, `FlowingGradientRowControls` | FlowingGradientRowControls — shared "flowing gradient" (`wave-gradient`) controls for blocks that reach the effect via a… |
| `FocalPositionField.js` | `FocalPositionField (default)` | FocalPositionField — the SGS wrapper around WP-native `FocalPointPicker` |
| `GradientCapableColourControl.js` | `GradientCapableColourControl (default)`, `isGradientValue` | GradientCapableColourControl — the text-colour gradient rollout's shared control (D636 Task 1b, "text" builder). |
| `GradientOverlayControl.js` | `GradientOverlayControl (default)`, `gradientOverlayAttrName`, `gradientOverlayAttrKeys` | GradientOverlayControl |
| `GridDotFieldRowControls.js` | `GridDotFieldRowControls` | GridDotFieldRowControls — shared grid-dot field (FR-38-33) controls for blocks that reach the effect via a block-private escape… |
| `index.js` | `ResponsiveControl`, `BooleanResponsiveControl`, `ResponsiveOverride`… | export { default as ResponsiveControl } from './ResponsiveControl'; export { default as BooleanResponsiveControl } from… |
| `LinkPopoverControl.js` | `LinkPopoverField (default)`, `LinkPopoverContent`, `TARGET_ENUM_OPTIONS` | LinkPopoverControl — the SGS standard LINK control (Spec 35 §2 LINK, promoted from `sgs/button`'s pilot 2026-08-13, Bean-approved… |
| `MediaElementControls.js` | `mediaAttrName`, `mediaAttrType`, `mediaAttrKeys`, `mediaStoredAttrName`, `MEDIA_BASES`… | L1 — media attribute NAMING. The contract every later wave inherits. |
| `MediaElementPanel.js` | `MediaElementPanel (default)` | L3 — the media element's DISPATCH layer. |
| `MediaGalleryPicker.js` | `MediaGalleryPicker (default)` | MediaGalleryPicker — shared bulk multi-select media component for SGS blocks. |
| `MediaPicker.js` | `MediaPicker (default)` | MediaPicker — shared media-slot component for SGS blocks. |
| `MediaSizingPanel.js` | `MediaSizingPanel (default)`, `RATIO_OPTIONS` | MediaSizingPanel — the shared "media size & crop" panel (C19, 2026-08-27). |
| `ParticleTrailRowControls.js` | `ParticleTrailRowControls` | ParticleTrailRowControls — shared particle-trail (FR-38-32) controls for blocks that reach the effect via a block-private escape… |
| `ResponsiveBoxControl.js` | `ResponsiveBoxControl (default)`, `ResponsiveBorderRadiusControl`, `BOX_UNITS`… | ResponsiveBoxControl / ResponsiveBorderRadiusControl — shared responsive box-family editor controls (Box-object interface… |
| `ResponsiveBoxControls.js` | `ResponsiveBoxControls (default)` | ResponsiveBoxControls — Spec 37 FR-37-16 per-device spacing + width panel. |
| `ResponsiveControl.js` | `ResponsiveControl (default)` | Responsive breakpoint switcher for block sidebar controls. |
| `ResponsiveOverride.js` | `ResponsiveOverride (default)` | ResponsiveOverride — SGS-owned per-device override control (Spec 37 FR-37-16). |
| `ResponsiveTriStateControl.js` | `ResponsiveTriStateControl (default)` | ResponsiveTriStateControl — the DP1 tri-state on/off control (Spec 35 T1.2). |
| `RowQuickInsertAppender.js` | `RowQuickInsertAppender (default)` | Promoted quick-insert appender for a freeform row block (site-header-row / site-footer-row). Steering, not gating: the row still… |
| `RowScrollBehaviourControls.js` | `RowScrollBehaviourControls (default)` | RowScrollBehaviourControls — per-row transparent / hide-on-scroll toggles |
| `ScaleAxisControl.js` | `ScaleAxisControl (default)` | ScaleAxisControl — 2-axis (X/Y) proportional scale control with a link/unlink toggle (Spec 35A §F.2.3, D637). |
| `SgsBooleanField.js` | `SgsBooleanField (default)` | SgsBooleanField — the SGS standard BOOLEAN control (golden-controls.json goldens/input.json `boolean` row, Bean-approved live… |
| `SgsBorderControl.js` | `SgsBorderControl (default)` | SgsBorderControl — the border control PAIR, matching WP core's native `BorderBoxControl` layout (Bean-directed 2026-08-27 Task 0… |
| `SgsBoxControl.js` | `SgsBoxControl (default)` | SgsBoxControl — compact 4-side box editor (padding / margin / border-width), built from native primitives with a hand-aligned row… |
| `SgsColourPanel.js` | `SgsColourPanel (default)` | THE grouped colour panel — D609's "missing half" (amended 2026-08-13, corrected 2026-08-14 per Bean's direct challenge — see… |
| `SgsFreeTextField.js` | `SgsFreeTextField (default)` | SgsFreeTextField — the SGS standard FREE-TEXT / BARE-NUMBER control |
| `SgsLengthControl.js` | `SgsLengthControl (default)` | SgsLengthControl — thin SGS wrapper for a length/unit value (Bean-directed new build, 2026-08-19; same construction pattern… |
| `SgsMultiSelectField.js` | `SgsMultiSelectField (default)` | SgsMultiSelectField — the SGS standard MULTI-SELECT / TOKEN control |
| `ShadowControl.js` | `ShadowControl (default)`, `shadowAttrName`, `shadowAttrKeys` | ShadowControl — shared real shadow builder (Spec 35A Part I action item 3). |
| `SpacingControl.js` | `SpacingControl (default)` | Spacing control that reads theme.json spacing presets. |
| `SsrPreviewGuard.js` | `SsrPreviewGuard (default)` | SsrPreviewGuard — replaces `<Disabled>` around `<ServerSideRender>` previews. |
| `StarterLookPresetControl.js` | `StarterLookPresetControl (default)` | SGS Starter Look preset control (FR-37-47). |
| `SurfaceTreatmentPanel.js` | `isSimpleBackgroundImage`, `SurfaceTreatmentPanel` | SurfaceTreatmentPanel — shared surface-treatment (grain/halftone/duotone) controls for blocks that reach the effect via… |
| `TypographyControls.js` | `TypographyControls (default)`, `typographyAttrName`, `typographyAttrKeys`… | TypographyControls — shared, uniform typography UI for every SGS block. |

**41 files.**

### JS media atoms — `src/components/media/atoms/*.js`

One row per file (top-level only, not sub-directories, except the dedicated `media/atoms/` table below). Purpose is the file's own top-of-file JSDoc/comment header — **UNDOCUMENTED** when absent.

| File | Exports | Purpose |
|---|---|---|
| `box-shape.control.js` | `control` | `box-shape` atom — CONTROL half (JSX). |
| `box-shape.js` | `normaliseRatio`, `resolveSizingMode`, `validateShape`, `resolveHeight`, `resolveWidth`… | `box-shape` atom — L2b control + disclosure + validator + value-setter. |
| `caption.control.js` | `control` | `caption` atom — CONTROL half (JSX). |
| `caption.js` | `attrKeys`, `validateTag`, `disclosure`, `validate`, `css` | `caption` atom — L2b control + disclosure + validator + value-setter. |
| `focal-point.control.js` | `control` | `focal-point` atom — CONTROL half (JSX). |
| `focal-point.js` | `resolvePosition`, `validate`, `disclosure`, `css` | `focal-point` atom — LOGIC half (L2b value-setter + validator + disclosure). |
| `intrinsic.control.js` | `control` | Atom: INTRINSIC (control half). |
| `intrinsic.js` | `disclosure`, `validate`, `css` | Atom: INTRINSIC (logic half) — the chosen media's own pixel dimensions. |
| `link.control.js` | `control` | `link` atom — CONTROL half (JSX). |
| `link.js` | `attrKeys`, `disclosure`, `validate`, `css` | `link` atom — L2b control + disclosure + validator + value-setter. |
| `meaning.control.js` | `control` | Atom: MEANING (control half) — the editor UI. |
| `meaning.js` | `altBaseFor`, `resolveMediaType`, `disclosure`, `validate`, `css`, `TYPE_VOCABULARY` | Atom: MEANING (logic half) — accessibility text for the media. |
| `media-padding.control.js` | `control` | `media-padding` atom — CONTROL half (JSX). |
| `media-padding.js` | `attrKey`, `sidesToShorthand`, `disclosure`, `validate`, `css` | `media-padding` atom — L2b control + disclosure + validator + value-setter. |
| `media-type.control.js` | `control` | `media-type` atom — CONTROL half (JSX-equivalent `control()`, via `createElement()`). |
| `media-type.js` | `validate`, `disclosure`, `css`, `CANONICAL_ENUM`, `TIER_ENUM` | `media-type` atom — LOGIC half (pure: css/validate/disclosure). |
| `motion.control.js` | `control` | `motion` atom — CONTROL half (JSX). |
| `motion.js` | `validateBoolean`, `validateDuration`, `attrKeys`, `validate`, `disclosure`, `css` | `motion` atom — L2b control + disclosure + validator + value-setter. |
| `object-fit.control.js` | `control` | `object-fit` atom — CONTROL half (JSX). |
| `object-fit.js` | `validate`, `disclosure`, `css` | `object-fit` atom — LOGIC half (L2b value-setter + validator + disclosure). |
| `opacity.control.js` | `control` | `opacity` atom — CONTROL half (JSX). |
| `opacity.js` | `attrKeys`, `disclosure`, `validate`, `css` | `opacity` atom — L2b control + disclosure + validator + value-setter. |
| `overlay.control.js` | `control` | `overlay` atom — CONTROL half (JSX). |
| `overlay.js` | `validateGradient`, `resolveColour`, `resolvePaint`, `attrKeys`, `disclosure`… | `overlay` atom — L2b control + disclosure + validator + value-setter. |
| `registry.js` | `basesForAtoms`, `atomsForElement`, `MEDIA_ATOMS`, `MEDIA_ATOM_IDS` | L2b — the ATOM registry. The middle level between names and panels. |
| `shadow.control.js` | `control` | `shadow` atom — CONTROL half (JSX). |
| `shadow.js` | `attrKeys`, `isRawShape`, `resolveShadow`, `disclosure`, `validate`, `css` | `shadow` atom — L2b control + disclosure + validator + value-setter. |
| `source.control.js` | `control` | Atom: SOURCE (control half) — the editor UI. |
| `source.js` | `resolveMediaType`, `disclosure`, `validate`, `css`, `TYPE_VOCABULARY` | Atom: SOURCE (logic half) — which media is showing. |
| `svg-presentation.control.js` | `control` | `svg-presentation` atom — CONTROL half (JSX). |
| `svg-presentation.js` | `validatePosition`, `validateAnimation`, `validateSpeed`, `attrKeys`, `disclosure`… | `svg-presentation` atom — L2b control + disclosure + validator + value-setter. |
| `video-behaviour.control.js` | `control` | `video-behaviour` atom — CONTROL half (JSX-equivalent `control()`, via `createElement()`). |
| `video-behaviour.js` | `validate`, `disclosure`, `css` | `video-behaviour` atom — LOGIC half (pure: css/validate/disclosure). |

**33 files.**

<!-- HELPER-CATALOGUE:END -->

---

## DB catalogue — what every column records, and which ones lie

This section is **GENERATED**. Do not hand-edit the table rows — they are overwritten.

The framework DB is already-filtered data that distinguishes blocks and their
attributes in meaningful ways. It is only useful if you know which columns carry a
real vocabulary, which are fossils, and which are actively misleading. All three
exist here.

⚠ Three **0-byte `sgs-framework.db` stubs** sit on disk (repo root,
`plugins/sgs-blocks/scripts/`, `~/.claude/`). Opening one returns zero rows, which is
indistinguishable from a clean answer — this project's signature failure mode. The
generator resolves the DB the way `sgs-db.py` does and fails closed on an implausible
table count.

<!-- DB-CATALOGUE:START -->

### Why this section exists

The DB is already-filtered data that distinguishes blocks and their attributes in
meaningful ways — but only if you know which columns carry a usable vocabulary and
which are fossils. Counts, vocabularies and NULL rates here are GENERATED and move
on every reseed. What a column MEANS is hand-curated; a column with no curated
meaning shows a blank cell rather than an invented sentence.

**39 tables.** Priority tables are expanded column-by-column below.

| Table | Rows | Expanded |
|---|---|---|
| `animation_tokens` | 8 | yes |
| `array_item_schema` | 90 | yes |
| `block_attributes` | 7773 | yes |
| `block_capabilities` | 509 | yes |
| `block_composition` | 211 | yes |
| `block_render_composition` | 6 | — |
| `block_render_repeaters` | 57 | — |
| `block_render_singletons` | 97 | — |
| `block_selectors` | 56 | yes |
| `block_supports` | 1241 | yes |
| `blocks` | 209 | yes |
| `components` | 298 | — |
| `deploy_steps` | 7 | — |
| `design_tokens` | 260 | yes |
| `docs` | 1216 | — |
| `excluded_properties` | 10 | — |
| `fx_effects` | 21 | yes |
| `gotchas` | 12 | — |
| `hooks` | 5494 | — |
| `html_tag_to_core_block` | 17 | — |
| `indexed_files` | 117 | — |
| `library_runtime_signals` | 3 | — |
| `markup_examples` | 422 | — |
| `modifier_suffixes` | 19 | — |
| `motion_shape_signatures` | 18 | — |
| `pattern_coverage` | 108 | — |
| `patterns` | 57 | — |
| `plugins` | 3 | — |
| `preset_implications` | 23 | yes |
| `property_suffixes` | 158 | yes |
| `roles` | 43 | yes |
| `schema_metadata` | 4 | yes |
| `schema_migrations` | 29 | — |
| `slots` | 108 | yes |
| `style_variations` | 8 | — |
| `theme_parts` | 28 | — |
| `variant_composition_attr_slots` | 6 | — |
| `variant_composition_slots` | 1 | — |
| `variant_slots` | 36 | yes |

#### `blocks` — 209 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `slug` | TEXT | 0% |  |
| `title` | TEXT | 0% |  |
| `category` | TEXT | 0% | `theme` 51, `sgs-content` 46, `design` 25, `sgs-forms` 20, `text` 15, `widgets` 14, `sgs-interactive` 13, `media` 10, `sgs-layout` 8, `common` 5, `reusable` 1, `embed` 1 |
| `type` | TEXT | 0% | `dynamic` 148, `static` 61 |
| `status` | TEXT | 0% | Constant — every row is `built`. Filtered on as a gate predicate, so it filters nothing today. |
| `description` | TEXT | 0% |  |
| `has_view_script` | INTEGER | 0% |  |
| `has_render_php` | INTEGER | 0% |  |
| `parent_block` | TEXT | 88% |  |
| `created_at` | TEXT | 0% |  |
| `updated_at` | TEXT | 0% |  |
| `replaces` | TEXT | 89% |  |
| `source` | TEXT | 0% | `native_wp` 122, `sgs` 87 |
| `is_stale` | INTEGER | 0% | Constant 0 — no row has ever gone stale. Dormant, not load-bearing. |
| `tier` | TEXT | 0% | `block` 205, `class-section` 4 — Recognition tier — how the walker identifies this thing in a draft. |
| `variant_attr` | TEXT | 98% | Names the attribute that selects the block's variant (FR-31-20). Pairs with the variant_slots table. |

#### `block_attributes` — 7773 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `id` | INTEGER | 0% |  |
| `block_slug` | TEXT | 0% |  |
| `attr_name` | TEXT | 0% |  |
| `attr_type` | TEXT | 0% | `string` 4672, `number` 1861, `object` 683, `boolean` 440, `array` 55, `integer` 35, `rich-text` 21, `string\|boolean` 6 |
| `default_value` | TEXT | 46% |  |
| `enum_values` | TEXT | 92% |  |
| `description` | TEXT | 46% |  |
| `is_responsive` | INTEGER | 0% |  |
| `canonical_slot` | TEXT | 75% |  |
| `role` | TEXT | 1% | `behaviour` 2770, `color` 880, `typography` 761, `layout` 613, `colour-gradient` 525, `visual` 471, `select-from-enum` 368, `core` 225, `boolean-visibility` 197, `text-content` 157, `motion` 118, `technical` 114, `content` 76, `image-object` 74, +23 more — What KIND of thing the attribute is — the single best attribute classifier here. A gate (db-consistency/check_orphan_roles.py) fails the build if a value has no `roles` row, so it cannot rot quietly. |
| `derived_selector` | TEXT | 76% | A NAMED TRAP. Reads like a CSS emit target; is a synthetic per-attribute identifier. colour-codemod/survey.js:21-27 measured 58% autofixable off it and the figure was wrong — ZERO of its values exist as classes in the tree. Never classify on it. |
| `output_signature` | TEXT | 73% |  |
| `equivalent_implementations` | TEXT | 75% | FOSSIL — holds stale synthetic Rosetta rows; no writer and no reader in current code. |
| `inspector_control_type` | TEXT | 87% | `SelectControl` 249, `ToggleControl` 185, `TextControl` 171, `DesignTokenPicker` 163, `RangeControl` 94, `UnitControl` 50, `ToggleGroupControl` 24, `ResponsiveBoxControl` 23, `ShadowControl` 20, `NumberControl` 12, `MediaUpload` 11, `IconPicker` 7, `TextareaControl` 6, `SgsLinkControl` 4, +9 more — The editor control the client actually sees. Cross-tab against `attr_type` to find controls whose shape cannot hold their setting. |
| `source` | TEXT | 0% | `sgs` 4223, `sgs-fx` 3043, `native_wp` 507 |
| `emit_shape` | TEXT | 96% | `nested` 234, `child` 63 — How the converter emits it. Fails closed at converter/walk.py:581 when unseeded on a content-role attribute, so its NULLs are tracked gaps rather than silent ones. |
| `alt_companion_attr` | TEXT | 100% |  |
| `css_layer` | TEXT | 90% | `OUTER` 546, `GRID` 140, `CONTENT` 83, `GRID_AREA` 41 — Which layer of the 3-layer wrapper model (OUTER / CONTENT / GRID / GRID_AREA) the attribute belongs to. |
| `css_property` | TEXT | 57% | The CSS longhand(s) this attribute writes. WARNING: a NULL means TWO different things — for a painting role it is a real gap; for `text-content`/`content`/`boolean-visibility` it is correct by design (100% NULL, they do not paint). Condition on `role` before reading a NULL as a defect. |
| `box_family` | TEXT | 97% | `borderRadius` 57, `borderWidth` 55, `padding` 46, `margin` 45, `contentBandPadding` 7, `splitMediaBorderRadius` 3, `submenuPadding` 2, `cardPadding` 2, `wrapperBorderWidth` 1, `tagPadding` 1, `splitMediaPadding` 1, `splitMediaBorderWidth` 1, `savingBadgePadding` 1, `pillPadding` 1, +15 more — Merged box-object family. Narrow but authoritative — the DB-first replacement for name-regex box detection. No box_family means provably not a box attribute. |
| `css_element` | TEXT | 71% | `wrapper` 1056, `inner` 112, `item` 97, `title` 66, `sublink` 54, `label` 50, `name` 31, `cta` 31, `icon` 30, `pill` 28, `overlay` 23, `featured` 22, `body` 22, `caption` 21, +106 more — Which sub-element inside the block it paints. Must be paired with `css_layer` — matching on element alone mis-routes (converter/db/db_lookup.py:1340-1353). |
| `css_state` | TEXT | 94% | `hover` 449, `current` 28, `scrolled` 3 — Pseudo-state the value applies to. Exact where present; the only state marker. |
| `css_tier` | TEXT | 100% | `tablet` 11, `mobile` 11, `desktop` 10 — Responsive tier. Deliberately SPARSE — responsive siblings intentionally carry NULL and only anomalies keep a value. Do NOT treat these NULLs as gaps; 'fixing' them breaks db_lookup's base-row query. |
| `canonical_slot_aliases` | TEXT | 100% |  |
| `tier_shape` | TEXT | 92% |  |

#### `block_composition` — 211 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `block_slug` | TEXT | 0% |  |
| `wraps_block` | TEXT | 82% | NOT A MEASUREMENT. The value sgs/container is a hardcoded string literal inside the writer SQL (sync-container-wrapping-blocks.py:1337), asserted for every roster member regardless of truth — 14 of the 38 make no real SGS_Container_Wrapper call, so the column is false for ~37% of its rows. Its only reader (db_lookup.py:1659) asks which wraps_block value is most common: a self-fulfilling question about a constant. Same trap shape as blocks.status and derived_selector. Verified 2026-08-24 (D762). |
| `composition_role` | TEXT | 0% | `content-block` 192, `leaf` 10, `section-root` 8, `wrapper-shell` 1 — The block's structural shape. See the container_kind warning — the two columns disagree. |
| `accepts_allowed_blocks` | TEXT | 91% |  |
| `created_at` | TEXT | 0% |  |
| `container_kind` | TEXT | 82% | `layout` 18, `content` 13, `section` 8 — The D294 pattern selector, and a converter recognition input (l2_qualify.py:122 tests PRESENCE; recognise_helpers.py:49-53 uses the VALUE as a priority tie-break). NULL means never-written, NOT not-container-bearing — the writer (sync-container-wrapping-blocks.py:1337) only ever SETS and has no statement clearing back to NULL, so a block that stops qualifying keeps its old value permanently. Refreshed 2026-08-24 (D762): 7 missing values added, 5 unclearable stale ones cleared; 38 rows now match the roster exactly. An earlier version of this cell claimed it disagrees with render.php in 14 of 58 blocks — that used the predicate content-kind-must-not-call-the-wrapper, but D294 says content-kind MAY render block-private. A permission read as an obligation; the figure was wrong. |

#### `block_capabilities` — 509 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `id` | INTEGER | 0% |  |
| `block_slug` | TEXT | 0% |  |
| `capability` | TEXT | 0% |  |
| `kind` | TEXT | 0% | `discovery` 456, `functional` 53 — THE LOAD-BEARING SPLIT. `functional` = real converter behaviour; `discovery` = search keywords from the block title. Without it the table looks like hundreds of behavioural facts when only a few dozen are. |

#### `block_supports` — 1241 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `id` | INTEGER | 0% |  |
| `block_slug` | TEXT | 0% |  |
| `support_name` | TEXT | 0% |  |
| `support_value` | TEXT | 0% |  |
| `source` | TEXT | 0% | `native_wp` 819, `sgs` 422 |
| `is_stale` | INTEGER | 0% |  |

#### `property_suffixes` — 158 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `suffix` | TEXT | 0% |  |
| `role` | TEXT | 0% | `layout` 48, `visual` 24, `select-from-enum` 13, `color` 13, `typography` 10, `behaviour` 9, `text-content` 8, `position` 7, `motion` 5, `enum-class-probe` 5, `image-object` 4, `number-css-px` 3, `content` 3, `spacing-token` 2, +4 more |
| `css_property` | TEXT | 28% | `color` 5, `background-color` 5, `max-width` 3, `padding-top` 2, `padding-right` 2, `padding-left` 2, `padding-bottom` 2, `margin-top` 2, `margin-right` 2, `margin-left` 2, `margin-bottom` 2, `gap` 2, `box-shadow` 2, `border-radius` 2, +76 more |
| `is_token_matched` | INTEGER | 0% |  |
| `token_source` | TEXT | 77% |  |
| `notes` | TEXT | 30% |  |
| `kind_override` | TEXT | 89% | `string` 15, `number_unitless` 1, `number_px_or_em` 1 — Parse-type escape hatch (D99). `number_unitless` doubles as a cheat-gate sentinel. |

#### `slots` — 108 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `slot_name` | TEXT | 0% |  |
| `scope` | TEXT | 0% | `element` 104, `section` 4 |
| `aliases` | TEXT | 1% |  |
| `standalone_block` | TEXT | 59% | The block a recognised BEM slot resolves to. Its NULLs are a KNOWN GAP, not a fossil — those slots exist as recognition vocabulary with no block to resolve to yet. |
| `notes` | TEXT | 2% |  |
| `created_at` | TEXT | 0% |  |
| `standalone_block_default_attrs` | TEXT | 96% |  |
| `resolves_whole_instance` | TEXT | 96% |  |

#### `roles` — 43 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `role_name` | TEXT | 0% |  |
| `classification` | TEXT | 0% | `styling-behaviour` 22, `content-bearing` 20, `unclassified` 1 — Collapses the role vocabulary into a content-vs-styling fork — the cheapest reliable predicate for 'does this carry text the client edits, or does it paint'. |
| `description` | TEXT | 0% |  |
| `created_at` | TEXT | 0% |  |

#### `variant_slots` — 36 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `block_slug` | TEXT | 0% |  |
| `variant_value` | TEXT | 0% |  |
| `unique_slot` | TEXT | 0% | The slot ONLY this variant has — the discriminator, computed by set-difference against the block's other variants. |
| `created_at` | TEXT | 0% |  |
| `slot_value` | TEXT | 72% |  |

#### `preset_implications` — 23 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `block_slug` | TEXT | 0% |  |
| `preset_attr` | TEXT | 0% |  |
| `enum_value` | TEXT | 0% |  |
| `implied_property` | TEXT | 0% |  |
| `presence` | TEXT | 0% | `present` 14, `absent` 9 |
| `is_neutral` | INTEGER | 0% | Marks preset values that genuinely imply nothing (`none`, `flat`), so the converter can tell 'no styling' from 'not set'. |
| `created_at` | TEXT | 0% |  |

#### `fx_effects` — 21 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `effect` | TEXT | 0% | Primary key and the effect's public identity — the value that appears in `data-sgs-fx`. Closed vocabulary chosen by hand to match Spec 38 §11.2; every consumer keys off it (generate-fx-effects-php.py:88, generate-fx-qualifying-blocks.py:779). |
| `tier` | TEXT | 0% | `G` 11, `V` 6, `W` 3, `H` 1 — The Spec 38 four-tier motion doctrine: V vanilla / G GSAP / H helper / W WebGL substrate. |
| `plugin_set` | TEXT | 0% | JSON array of GSAP plugin names the effect needs. LIVE — generate-fx-effects-php.py:165-169 emits it into generated-fx-effects.php, and class-sgs-motion-registry.php uses it to decide which vendor module to enqueue. This is what keeps a page that uses no GSAP effect shipping zero GSAP bytes. |
| `owns_scroll_transform` | INTEGER | 0% | Marks effects that claim the scroll transform — the mutual-exclusion axis for combining effects on one element. |
| `reduced_motion` | TEXT | 0% | FOSSIL as of 2026-08-24 — no operational reader; generate-fx-effects-php.py:26 states outright that it is not carried. Same for editor_story, tier and created_at: only a reseed self-test touches them. |
| `editor_story` | TEXT | 0% | FOSSIL as of 2026-08-24 — no operational reader. generate-fx-effects-php.py:26 states outright that editor/JS-facing concerns are not carried here; only the reseed self-test touches it. |
| `created_at` | TEXT | 0% | FOSSIL — SQL DEFAULT (datetime('now')), never written by application code and read by nothing. |
| `scope` | TEXT | 0% | `block` 15, `element` 3, `site` 2, `paired` 1 — Gates which effects are considered at all — generate-fx-qualifying-blocks.py:780 filters scope IN (block, element). A live reader, not a label. |
| `requires` | TEXT | 0% | What an effect needs from a block (text/svg/svg-subtree/section/item-set/track/surface/image/none). LIVE — generate-fx-qualifying-blocks.py:750-780 matches it against each block's provision. The value none is real, meaning any block qualifies — NOT a null-substitute. The svg vs svg-subtree split (2026-07-31) exists because under-specifying here once offered MorphSVG on blocks carrying only a background SVG. |
| `pins` | INTEGER | 0% | Whether the effect pins its element during scroll. Drives the editor's fxEnd control wording (generate-fx-effects-php.py:167,232). Hand-set but empirically grounded — each row's seeder comment cites the source file checked, e.g. 'VERIFIED: fx-pin-scrub.js sets pin:true'. |
| `triggers` | TEXT | 0% | Comma-joined string split at read time (generate-fx-effects-php.py:174), not a join table — one stray comma silently changes behaviour. |
| `creates_panel` | INTEGER | 0% | Whether the effect may create a standalone FX panel (FR-38-25). Read at generate-fx-qualifying-blocks.py:854. Both readers guard on PRAGMA table_info before selecting it and fall back to 1 — so the risk case is the column being ABSENT on a pre-migration DB, not NULL. |
| `in_picker` | INTEGER | 0% | Whether the effect appears in the generic FX picker. Two-way gated against fx.js SHIPPED_EFFECTS by check-fx-list-drift.py:486-503, so it cannot rot quietly. |

#### `array_item_schema` — 90 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `block_slug` | TEXT | 0% | Part of the composite PK. Scoped DELETE-then-INSERT per block (sgs-update-v2.py:1049) means one /sgs-update run fully replaces that block's rows — no cross-run conflict is possible by construction. |
| `array_attr` | TEXT | 0% | Which array-typed attribute on the block these field rows describe. DECLARED — the attribute name straight from block.json. |
| `field_key` | TEXT | 0% | One key of the array's item shape, copied verbatim from block.json `items.properties` (seeded by the array_item_schema seeder in sgs-update-v2.py). One row per item key per array attribute. |
| `field_order` | INTEGER | 0% | STRUCTURAL and implicit — it is the block.json key order of items.properties, captured by enumerate() at sgs-update-v2.py:1056, not anything an author declares. Consumed as a tie-break (array_content.py:282-289). Any tool that sorts or reformats block.json keys would silently change converter behaviour with no error. |
| `role` | TEXT | 72% | `text-content` 9, `url-href` 5, `image-object` 4, `icon-slug` 3, `icon` 3, `state-modifier-boolean` 1 — A SEPARATE 3-VALUE VOCABULARY — icon-slug / text-content / url-href, plus NULL. NEVER join it to block_attributes.role (34 values); they are unrelated despite the shared column name. DECLARED from block.json items.properties.<field>.role, never name-parsed (FR-31-2.1a). NULL means no role was declared, and the reader (array_content.py:112) deliberately falls back to name-derivation for those. |

#### `design_tokens` — 260 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `slug` | TEXT | 0% | Primary key. DECLARED from theme.json for framework tokens; for shadows and font sizes it is the source slug PLUS a hand-added type prefix (enrich-db.py:531,555,578). That prefix is load-bearing — outer_box.py:166 matches on `slug LIKE 'shadow-%'`, so the naming convention IS part of the read contract. |
| `token_type` | TEXT | 0% | Chosen by the WRITER code branch, never read from the source JSON. Two writers disagreed until 2026-08-24: sgs-update-v2.py wrote shadows as shadow (correct) while uimax-tools/enrich-db.py wrote size on the strength of a comment claiming the CHECK constraint had no shadow member — it always had. Fixed at e101c279 plus a DB correction; all 7 shadow-% rows are now shadow. Note shadow-sm/md/lg are dead slugs absent from theme.json, while shadow-glow is live and was merely mistyped. |
| `default_value` | TEXT | 0% | The token's literal CSS value, copied verbatim from theme.json. One of only two columns any runtime consumer actually reads (outer_box.py:166-171). |
| `css_var` | TEXT | 0% | FOSSIL as of 2026-08-24 — written by formula (NAME-DERIVED from slug via the WP preset convention), read by nothing. Same for description. |
| `description` | TEXT | 0% | FOSSIL — written as `preset.name` with the slug as fallback, read by nothing anywhere in the tree. |

#### `block_selectors` — 56 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `id` | INTEGER | 0% | Surrogate PK only. Rows are addressed by (block_slug, element) in practice; nothing reads this. |
| `block_slug` | TEXT | 0% | Which block the selector mapping belongs to. Note this table is pruned separately from the generic orphan sweep (sgs-update-v2.py:1238-1249) — the standard prune_orphans stage does NOT cover it. |
| `element` | TEXT | 0% | The WordPress Selectors-API element path this row maps (root / typography / border / color.text and so on). Nested block.json keys are flattened to `element.sub` at write time (sgs-update-v2.py:1172-1189). |
| `selector` | TEXT | 0% | A PASSIVE MIRROR of each block.json own selectors key. WordPress reads block.json directly at register_block_type and never consults this table, so editing a row changes nothing at runtime. Its single reader is generate-block-reference.py:90-93, a docs generator. Two writers exist with undocumented last-one-wins semantics (sgs-update-v2.py:1171 and an out-of-repo populate-db.py), self-flagged in the code at :1165-1170. |

#### `animation_tokens` — 8 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `id` | INTEGER | 0% | Surrogate PK. Rows are addressed by `name` (UNIQUE); nothing reads this column. |
| `name` | TEXT | 0% | FOSSIL relative to the shipped runtime. The live animation system (src/blocks/extensions/animation.js:21-38) hardcodes its own 17-entry vocabulary and shares only part of this table 8; zero of these token names appear as @keyframes in any CSS under src/ or the theme. Only the sgs-db.py lookup CLI reads it. |
| `keyframes` | TEXT | 0% | CSS @keyframes body for the token. FOSSIL — no @keyframes matching any token name exists in any CSS file under src/ or the theme (negative grep, zero hits), so nothing renders this. |
| `duration` | TEXT | 0% | Intended animation duration. FOSSIL — same as keyframes; the live extension drives timing via its own CSS transitions. |
| `easing` | TEXT | 0% | Intended easing curve. FOSSIL — no operational reader. |
| `description` | TEXT | 0% | Human-readable note. FOSSIL — read only by the sgs-db.py `animations` lookup CLI, which is an operator convenience, not build or runtime code. |
| `used_by` | TEXT | 62% | Name overstates it — means blocks whose sgsAnimation attribute DEFAULTS to this value (seed-motion-fx-registry.py:1170-1188). An operator who picks the animation by hand is invisible here. |
| `category` | TEXT | 0% | `entrance` 4, `emphasis` 2, `loading` 1, `exit` 1 — Grouping label. FOSSIL — no operational reader. |
| `created_at` | TEXT | 0% | Seed timestamp. FOSSIL — no reader. |

#### `schema_metadata` — 4 rows

| Column | Type | NULL | Vocabulary / meaning |
|---|---|---|---|
| `key` | TEXT | 0% | This table is KEY-VALUE shaped, so the meaning lives per ROW, not per column — see the 'Row keys' table below. Four keys exist. Written by INSERT OR REPLACE (upsert_metadata), so a key is never NULL once its stage has run. |
| `value` | TEXT | 0% | The value for `key`, always stored as TEXT regardless of the value's real type. Read the per-key notes below before trusting any of these — one of the four is stale by construction. |

Row keys (this table is key-value shaped):

| Key | Meaning |
|---|---|
| `indexed_blocks_count` | Count of blocks scanned at the last Stage 1 run. STRUCTURAL (a live COUNT), no reader found. UNVERIFIED: the exact writer line was located by grep context and not read in full - flagged rather than asserted. |
| `last_full_refresh_ts` | Write-only audit timestamp — no reader anywhere. Useful to a human asking when this last ran. Written None in dry-run mode (sgs-update-v2.py:3885), so NULL distinguishes dry-run-only from never-ran. |
| `last_variation_sync_ts` | Write-only audit timestamp for the variation sync (sgs-update-v2.py:4353). No reader anywhere. |
| `wp_version_indexed` | STALE BY CONSTRUCTION, not by neglect. Stage 2 writes whatever --wp-version holds, and that flag defaults to WP_VERSION_DEFAULT = 7.0, a hardcoded literal at sgs-update-v2.py:97 never bumped after the canary moved to 7.1 on 2026-08-20. Every full run therefore RE-ASSERTS the wrong value. The one mechanism that would catch it (stage_8_drift_gate) does run, does compare against the live site, and only prints — its own TODO to wire it into a deploy hook is unactioned, and grep confirms nothing outside sgs-update-v2.py calls it. Verified 2026-08-24. |

Regenerate with:

```bash
python plugins/sgs-blocks/scripts/generate-db-catalogue.py
```

<!-- DB-CATALOGUE:END -->

---

## Known Gotchas

| Gotcha | Detail |
|--------|--------|
| **SCP `-r` creates nested directories** | `scp -r theme/sgs-theme remote:path/sgs-theme` creates `sgs-theme/sgs-theme/`. One of several reasons never to hand-roll a deploy — use `build-deploy.py`. |
| **Hostinger caches CSS aggressively** | Bump version in `style.css` after CSS changes to bust cache. Theme version is the query string for all enqueued styles. |
| **`--webpack-copy-php` flag** | Build script copies `render.php` to `build/` automatically. Dynamic blocks won't render without this. |
| **`--experimental-modules` flag** | Required in build/start scripts for `viewScriptModule` in block.json. |
| **Deprecations NOT used** | The plugin carries no `deprecated.js` and block version bumps are forbidden pre-production. On a schema change, rebuild / re-clone the content, or use the Site Editor's "Attempt Block Recovery". Do NOT author a deprecation. |
| **SSH remote variable expansion** | Use single quotes for outer string when running `ssh hd '...'` so `$WP` expands on server. Double quotes expand locally. |
| **Never delete the live directory before the new copy is in place** | `rm -rf $WP/plugins/sgs-blocks` before the extract succeeds leaves the site with no plugin if anything fails in between. `build-deploy.py` rotates the previous copy to `<dir>.bak` and moves the new one in. Never hand-roll this. |
| **Tar `--exclude='src'` breaks vendor** | Too broad — strips `vendor/*/src/` subdirectories. `build-deploy.py` already carries the correct excludes. |
| **WP-CLI inline PHP escaping** | `wp eval '...'` breaks on shell special chars. Reliable fallback: write to `/tmp/script.php` with `cat << 'PHPEOF'`, scp to server, `wp eval-file ~/script.php`, then `rm`. |
| **`parse_blocks()` is shallow** | Only returns top-level blocks. Finding nested blocks requires a recursive function walking `$b['innerBlocks']`. |
| **Hostinger error logs** | Live at `~/.logs/error_log_<domain>`, not `wp-content/debug.log` (often stale). |
| **WP_DEBUG_DISPLAY contamination** | `WP_DEBUG_DISPLAY=true` injects PHP Notice banners that shift every section vertically, inflating pixel-diff 15-40pts. Set false on staging. |
