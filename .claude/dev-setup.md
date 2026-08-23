---
doc_type: dev-setup
project: small-giants-wp
title: SGS WordPress Framework — Developer Setup & Operations
last_updated: 2026-08-22
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
- [sgs-framework.db — the unversioned local dev DB](#sgs-frameworkdb--the-unversioned-local-dev-db)
- [Creating a new block](#creating-a-new-block)
- [Adding a style variation](#adding-a-style-variation)
- [Shared components](#shared-components)
- [Render helpers](#render-helpers)
- [Extensions architecture](#extensions-architecture)
- [Deployment process](#deployment-process)
- [Environment and tools](#environment-and-tools)
- [Tooling catalogue — every gate, audit and codemod](#tooling-catalogue--every-gate-audit-and-codemod)

---

## Project structure

```
small-giants-wp/
├── theme/sgs-theme/
│   ├── theme.json               # All design tokens: colours, fonts, spacing, shadows
│   ├── style.css                # Theme header only (no CSS rules)
│   ├── functions.php            # Enqueues, variation-specific CSS, filters
│   ├── styles/                  # EMPTY — per-client snapshots at sites/<client>/theme-snapshot.json
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

The same `prebuild` chain runs the **dead-control guard** (`scripts/check-dead-controls.js --check`, D192) and `scripts/check-hardcoded-render-defaults.js` (D193) — both wired and BLOCKING via `--check`, not planned. `prebuild` actually chains roughly 40 gates in total (consistency gates, roster build, motion-fx generators, dead-pattern-attrs, `check-shared-panel-schema.js`, `check-empty-inspector-containers.js`, `check-wrapper-capability-preconditions.js`, background-colour-support survey, control-ux, schema-drift, value-identity, db-consistency, tier-storage-shape, cheat-gate, no-inline checks, the pytest oracle/converter suites, inspector-scan, feature-parity audit, block-uniformity, and more) — read `plugins/sgs-blocks/package.json`'s `prebuild` script directly for the current, authoritative list rather than trusting a hand-maintained summary here.

**Two gates added 2026-08-16 (D639).** ⚠ **Correction (D643, same day):** this line said "both wired in the same commit that built them". Only ONE was. `check-wrapper-capability-preconditions.js` was built, documented in THREE places as wired, and referenced by nothing — `grep check-wrapper-capability plugins/sgs-blocks/package.json` returned zero, and it was absent from `run-consistency-gates.py` too. That is precisely the D338 failure this line was written to say had been learned from, repeated on the same day, in the doc claiming the lesson. It is genuinely wired now (`prebuild` + `npm run check:wrapper-capability`), verified passing standalone first (0 blocking, 0 advisory). **The lesson stands and is now twice-earned: never trust a doc's claim that a gate runs — grep `package.json`.** The two gates: `check-empty-inspector-containers.js` (an inspector container rendered with no children — a client-visible dead control that the whole ~50-gate stack had no coverage for, because `check-dead-controls.js` checks the opposite direction) and `check-wrapper-capability-preconditions.js` (`gridItems` requires `layout`; a `supports.sgs.gridAreas` declaration must have a live reader). Per-gate rationale, their `--self-test` shapes, and the "do NOT rewrite this as a regex" warning: `plugins/sgs-blocks/CLAUDE.md` §prebuild gates.

**Converter conformance (D222 lesson — the `converter_v2/` unit-test suite this section used to also name was deleted at D276, 2026-07-05; Gate A below is the only live suite now):**
- **Gate A (golden-fixture harness):** `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` — fixture count is DB/dir-authoritative (`scripts/tests/fixtures/conformance/`, drifts — do not hard-code a number), run manually with `pytest plugins/sgs-blocks/scripts/tests/`. This is the pre-commit gating harness.

**Dated migration pattern (D222, mandatory):** any new `property_suffixes` row or other DB seed data MUST live in a dated `migrations/YYYY-MM-DD-<descriptor>.py` beside the existing siblings — never a module-load side-effect in `db_lookup.py`. Example: `migrations/2026-06-13-property-suffixes-align-items.py`.

**Output:** `build/blocks/{block-name}/` contains the compiled files. All files in `build/` are version-controlled and deployed directly to the server — Node.js is not available on the Hostinger host.

---

## sgs-framework.db — the unversioned local dev DB

**Path:** `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (hard-linked to `~/.claude/skills/sgs-wp-engine/sgs-framework.db` — same physical file, same inode, either path reads/writes the same data). **~13.9MB. Deliberately NOT committed to git** — it is a local dev SQLite knowledge base (block schema, `fx_effects`, `block_attributes`, `slots`, `roles`, etc. — see project `CLAUDE.md` "DB-first, no hardcoded dicts"), not a build artefact, and it is far too large and too fast-moving to version sensibly.

**What depends on it:** the Spec 38 motion-fx generator chain —
- `plugins/sgs-blocks/scripts/seed-motion-fx-registry.py` (seeds `fx_effects` + related tables)
- `plugins/sgs-blocks/scripts/generate-fx-effects-php.py` (writes `includes/generated-fx-effects.php` + `src/blocks/extensions/generated-fx-effect-meta.json`)
- `plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py` (writes `includes/generated-fx-qualifying-blocks.php` + `src/blocks/extensions/generated-fx-qualifying-blocks.json`)

— plus a long tail of one-off DB-authoring/consistency scripts under `plugins/sgs-blocks/scripts/` (migrations, `db-consistency/`, `cheat-gate/`, `excluded-gate/`, `ledger/`, the `converter/` DB lookups, etc.). All of them read the DB; none of them ship it.

**Why a clean clone still builds:** the four files the fx generators above produce are themselves **committed as build inputs** (they are generated PHP/JSON the plugin actually loads at runtime — not throwaway output). `plugins/sgs-blocks/scripts/run-motion-fx-generators.js` (wired into `prebuild`/`prestart` in `package.json`) checks for the DB before doing anything:
- **DB absent** — skips the whole chain cleanly (exit 0) and logs why. The build proceeds using the already-committed generated files untouched.
- **DB present** — runs the chain for real (seed, then `generate-fx-effects-php.py --check` which diffs an in-memory regeneration against the committed files without writing, then `generate-fx-qualifying-blocks.py`, whose output the wrapper snapshots/diffs itself since that script has no `--check` mode of its own yet). Any drift between the DB and the committed generated files **fails the build loudly**, naming the stale file(s) — so the owner can never commit a generated artefact that doesn't match the DB.

**A missing/empty DB must never produce a silently-empty roster.** `generate-fx-effects-php.py` and `generate-fx-qualifying-blocks.py` both fail loudly (naming the DB path) if the DB exists but a query returns zero rows — an empty `fx_effects` table is treated as a fatal misconfiguration, never as "nothing to generate". (Historically, two 0-byte decoy files were briefly committed at `scripts/sgs-framework.db` and `scripts/data/sgs-framework.db` — **deleted**; never recreate either path, and never point `DB_PATH` at a committed copy.)

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

**Canary — the ONLY deploy target:** `https://sandybrown-nightingale-600381.hostingersite.com` (WP 7.1 as of 2026-08-20)
**Reference site (READ ONLY):** `https://lightsalmon-tarsier-683012.hostingersite.com`

**SSH:** `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` (alias: `ssh hd`)

### Project credentials (discoverable — every session can use these directly, without asking Bean)

Gitignored; never committed. (Rehomed verbatim from the dissolved `docs-registry.yaml`, 2026-07-28.)

| Path | What | Keys / loader |
|---|---|---|
| `.claude/secrets/sandybrown.env` | Staging/canary (sandybrown-nightingale-600381.hostingersite.com) logins — ALWAYS available | `WP_USER_SANDYBROWN` + `WP_PWD_SANDYBROWN` (browser/admin login); `WP_APP_PWD_SANDYBROWN` (REST + WC Store-API Basic auth); `WP_URL_SANDYBROWN`. Use for Playwright editor login + REST verification: `grep KEY .claude/secrets/sandybrown.env` |
| `.claude/secrets/credentials.yml` | General project credentials (YAML) | `import yaml; yaml.safe_load(open('.claude/secrets/credentials.yml'))` |
| `A:/.openclaw/.secrets/wp-app-passwords.env` | Cloning WP app passwords (legacy — the dev site they belonged to is gone) | env-file format |

> **LiteSpeed note (updated 2026-07-13, D322):** LiteSpeed Cache **IS active on sandybrown** (v7.8.1 — re-installed at D312, re-confirmed live D322; the old "deleted 2026-05-05" claim is STALE). ALWAYS `wp litespeed-purge all` on sandybrown after a CSS/render deploy, in addition to OPcache reset + the Hostinger CDN clear (`hosting_clearWebsiteCacheV1`). Check `wp plugin list --status=active | grep -i litespeed` on any target before deciding.

### Full deployment (ALL targets) — always via `build-deploy.py`

> **⛔ Use the script. Do NOT hand-roll a tar/scp deploy (2026-07-14 incident).**
> On 2026-07-14 an unfinished, uncommitted edit reached **both live client sites**
> via a raw deploy and took them down with a PHP fatal for ~2.5 hours — and the
> deploy reported success. The raw tar/scp sequence that used to live here had
> no dirty-file gate, no post-deploy check, and `rm -rf`'d the live directory
> before extracting, so there was nothing to roll back to. It has been REMOVED
> from this doc on purpose. `build-deploy.py` now carries all three defences:
> a scoped dirty gate, a fail-closed post-deploy smoke test, and a `.bak`
> rotation for one-command rollback.

```bash
# Canary (safe default — sandybrown)
python plugins/sgs-blocks/scripts/build-deploy.py

# sandybrown is the ONLY target. palestine-lives.org no longer exists and was
# removed from TARGETS 2026-08-10; adding a real client back is one dict entry.
```

The script builds, tars (same excludes as before), scps, extracts, rotates the
previous copy to `<dir>.bak`, cleans up, then **GETs the site and fails the run
if it is broken**. Deploy to the canary first; only then the client site.

**The flags exist — know what you're giving up before using them:**

| Flag | What you lose |
|---|---|
| `--allow-dirty` | The gate that would have stopped the 2026-07-14 outage. Only use when you have READ the listed paths and know each one is safe. |
| `--skip-verify` | The only check that catches a deploy which breaks the site. |

**Other flags (safe, not loss-of-safety):** `--payload <path>` (repeatable) deploys named uncommitted files without the blanket `--allow-dirty`; `--dry-run` previews without deploying; `--verify-url`, `--audit-scoped-page`, `--skip-oldshape-audit`, `--self-test` exist for narrower workflows — read the script's `--help` for current usage.

**Ownership check (load-bearing, not optional):** the canary is a shared checkout. `build-deploy.py` checks whether the deploy would overwrite live work not in your HEAD's ancestry and **refuses if so** — this is correct behaviour, not a bug. `--takeover` overrides it; only use when you've confirmed with whoever else is working on the canary that it's safe to overwrite their state.

**Rollback (if a deploy breaks the site):**

```bash
ssh hd 'WP=domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content && \
  mv $WP/plugins/sgs-blocks $WP/plugins/sgs-blocks.broken && \
  mv $WP/plugins/sgs-blocks.bak $WP/plugins/sgs-blocks'
# then reset OPcache (below) — the .bak is the copy from the PREVIOUS deploy
```

OPcache reset is handled per the snippet below (CLI and web are separate pools):

```bash
ssh -p 65002 u945238940@141.136.39.73 "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html/op-reset-tmp.php" && \
  curl -s https://sandybrown-nightingale-600381.hostingersite.com/op-reset-tmp.php && \
  ssh -p 65002 u945238940@141.136.39.73 "rm ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html/op-reset-tmp.php"
```

### Single-file patch — ⛔ don't

A bare `scp` of one file is how broken code reaches a live site with **zero**
gates and **no** rollback copy: no dirty check, no smoke test, no `.bak`. It
feels safer than a full deploy because it touches less — that is the trap. The
2026-07-14 fatal was a single unfinished file.

Use `build-deploy.py` (add `--blocks-only` / `--theme-only` to narrow scope). If
you genuinely must hand-place one file — emergency rollback only — take a backup
first and verify the site afterwards:

```bash
# emergency only; back up, then verify
ssh hd 'cp $WP/path/to/file $WP/path/to/file.bak'
scp -P 65002 -i ~/.ssh/id_ed25519 path/to/file \
  u945238940@141.136.39.73:domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content/path/to/file
curl -s -o /dev/null -w '%{http_code}\n' "https://sandybrown-nightingale-600381.hostingersite.com/?cachebust=$RANDOM"   # expect 200
```

### Per-client theme snapshot deploy

```bash
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73
# --no-push flag for preview without pushing
```

### Fast-cycle canary deploy (sandybrown) — D3

`plugins/sgs-blocks/scripts/build-deploy.py` is also the fast-cycle path for the
sandybrown staging canary. Skips full-ceremony steps (no /qc-council, no full doc
walk) — use for iterative pipeline / converter work where the per-commit cadence
is dictated by /sgs-clone --debug-trace measurement, not full deploy QA.

```bash
python plugins/sgs-blocks/scripts/build-deploy.py
```

**Corrected 2026-07-14 — this section previously routed production away from the
script** ("sandybrown canary → `build-deploy.py`; palestine-lives + production →
`/wp-sgs-deploy`"), which is how the *real client site* ended up documented for a
raw, ungated tar deploy. `build-deploy.py` is now the deploy path for **every**
target — the difference is only the flag:

- sandybrown canary → `build-deploy.py` (default and, since 2026-08-10, the only target)
- a future client target → add one `TARGETS` entry with `explicit_opt_in_required: True`
  (enforced in code), preceded by the `/wp-sgs-deploy` ceremony
  (QC gates, doc walk) where that ceremony applies. `/wp-sgs-deploy` governs
  *what must pass before* a production deploy; it does not replace the script
  that performs it.

### Inheritance audit — container-wrapping blocks (D152)

`plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` detects which blocks wrap children via InnerBlocks (the "wraps children" model) and syncs `wraps_block` + `container_kind` into `block_composition`. Rewritten D152 from a heuristic threshold model to validated structural detection.

```bash
python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py
# --apply to write detected wraps_block + container_kind values into block_composition
```

Container roster confirmed at D167 (2026-06-04 — content-collection added, modal + mobile-nav excluded). **Roster size is DB-authoritative — query `/sgs-db`, do not cache a count (architecture.md separately cited 28; both were stale).** Re-run via `/sgs-update` Stage (auto) or manually whenever block.json `supports.sgs.containerKind` changes.

### PowerShell equivalents (dev machine)

⛔ **The raw `scp -r` recipes that used to live here are RETIRED** — they contradicted the Deployment section's own warning box above, bypassed every gate, and left the tree and the server silently divergent. `build-deploy.py` is cross-platform; there is no PowerShell-specific deploy path.

```powershell
# The deploy IS the script — it builds, gates on a dirty tree, verifies fail-closed, rotates a .bak,
# and resets OPcache itself. Run from the project root.
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

No CI/CD pipeline — deployment is `python plugins/sgs-blocks/scripts/build-deploy.py` (see §Deployment above). It is the only sanctioned path for every target.

### SGS DB queries (quick reference)

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats          # Framework health
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/hero  # Block details
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py match "pricing" # Find best block
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py context indus-foods # Load client
```

### DB schema notes (post-D99 + D107-D113)

- **`blocks.tier`** (new D107) — TEXT column, CHECK constraint `IN ('block', 'class-section', 'pattern')`. Populated by `/sgs-update` Stage 1 from each block's `supports.sgs.is_section_root` flag in `block.json`. Operator-set per block, not algorithmically inferred.
- **`block_composition`** (new D108; updated D152/D167) — 189+ rows at D167 (2026-06-04), drifts since — query `/sgs-db`. Container roster has `wraps_block` + `container_kind` populated (values `section|layout|content`; modal + mobile-nav excluded). Walker consumption DEFERRED — data layer LIVE only.
- **`slots`** (D99) — composite PK on `(slot_name, scope)`. Post-D111 (2026-05-30): 92 element-scope + 4 section-scope = 96 total. Replaces retired `slot_synonyms` + `legacy_role_lookup`. XS-5 cleanup retired 12 wrong/dead section-scope rows + re-inserted testimonial/testimonial-slider at element scope; `inner` passthrough element row added.
- **`roles`** (D99/D128) — 21 rows (20 base + `scalar-media` added D128 2026-06-01). Replaces `slot_synonyms.role_classification` column. `INSERT OR REPLACE` from `_ROLE_CLASSIFICATION_MAP`.
- **`html_tag_to_core_block`** (D99) — 14 rows, idempotent migration at module load. Replaces hardcoded `_HTML_TAG_TO_CORE_SLUG` dict. `INSERT OR REPLACE`.

### canonical_slot assignment (XS-4 / D110; D194)

`assign-canonical.py` was ported to the D99 `slots` + `roles` schema. Current canonical_slot coverage = 31.8% of attrs. Re-run after every slot-vocabulary addition:

```bash
python plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py
```

- **It writes the one physical `sgs-framework.db`.** uimax holds neither `block_attributes` nor `slots`; the `.claude` and `.agents` DB paths are the *same file* via an NTFS junction (not two copies) — so a single write reaches every path.
- **It is the deterministic mechanism for content-area `canonical_slot` tagging (D194, 2026-06-09).** `assign-canonical.py` runs automatically as `/sgs-update` Stage 1; once the `content` element-slot row + the `Width`/`Padding`→`layout` `property_suffixes` rows exist, it tags the content-area attrs (`contentWidth`/`contentPadding*`/`contentMaxWidth*`) `content`/`layout` deterministically — no manual seed step. The throwaway `seed-canonical-slots.py` was **deleted as redundant** (the DB values it wrote persist; `/sgs-update` maintains + extends them).

---

## Tooling catalogue — every gate, audit and codemod

This section is **GENERATED**. Do not hand-edit it — edits are overwritten.

It exists because "I could not find a tool for that" has repeatedly meant "I looked
in one of the script directories". There is more than one, and the big one holds
hundreds of files. Before building any new checker, codemod or audit, read this
section and grep every directory listed in it.

Derived from the `prebuild` chain in `plugins/sgs-blocks/package.json` (the real gate
list, in real execution order) plus each script's own header. Both sources are the
truth rather than a copy of it, which is why this can be regenerated instead of
maintained. `--check` fails if it is stale.

<!-- TOOLING-CATALOGUE:START -->

### Where the tooling lives — **plural, and that matters**

Searching one directory and concluding a tool does not exist is a live
failure mode here — it is how something gets rebuilt that already existed.
Check every row before building anything new.

| Directory | Runnable files | Holds |
|---|---|---|
| `scripts/` | 20 | repo-wide tooling (naming lint, site utilities) |
| `plugins/sgs-blocks/scripts/` | 569 | **the bulk** — every gate, audit, codemod, DB and pipeline tool |
| `.claude/scripts/` | 2 | working-area helpers |
| `.claude/hooks/` | 9 | session + commit hooks (handoff preflight, doc gates) |
| `.claude/skills/wp-sgs-deploy/scripts/` | 0 | deploy-skill helpers |

Worktrees under `.claude/worktrees/` mirror this tree — never cite them as a source.

### The prebuild gate chain — what actually blocks a build

Derived from `package.json`'s `prebuild`, in execution order. This chain is
what `npm run build` runs first, and what every `/handoff` and deploy relies on.
Each entry's purpose is quoted from the script's own header.

| # | Script | Purpose (from its own header) |
|---|---|---|
| 1 | `run-consistency-gates.py` | Single orchestrator for the SGS blocks consistency-gate suite. Runs a fixed |
| 2 | `build-roster.py` | Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB. |
| 3 | `generate-icons.js` | Generates includes/lucide-icons.php from lucide-static SVG files. |
| 4 | `generate-extension-attributes.js` | Single source of truth for the cross-block `sgs*` editor-extension attributes. |
| 5 | `run-motion-fx-generators.js` | motion-fx generator chain (seed-motion-fx-registry.py, generate-fx-effects-php.py, generate-fx-qualifying-blocks.py). |
| 6 | `check-fx-list-drift.py` | the three-list (plus field-type triad) fx drift gate. |
| 7 | `check-dead-controls.js` | STRUCTURAL GUARD (HC2, 2026-06-08) — stops the "dead control" class of bug from regressing. A dead control is an editor control a client can change that… |
| 8 | `check-dead-pattern-attrs.py` | Find block attributes in theme patterns/parts that WordPress silently DISCARDS |
| 9 | `check-shared-panel-schema.js` | STRUCTURAL GUARD — closes the gap in the "dead control" family that check-dead-controls.js (control exists, nothing renders it) and… |
| 10 | `check-empty-inspector-containers.js` | STRUCTURAL GUARD — an inspector container rendered with NO children. |
| 11 | `check-wrapper-capability-preconditions.js` | STRUCTURAL GUARD for the shared-wrapper capability declarations in each block's `supports.sgs` — Spec 35 §F.2.1 + §F.2.2 (D637, step 7 of the… |
| 12 | `survey-background-colour-support.py` | Track A completion audit — native colour/gradient background support. |
| 13 | `check-image-controls-support.py` | Standing defence for the `imageControls` "declared-but-unverified capability" |
| 14 | `survey-control-parity.py` | do SGS inspector controls look like NATIVE WordPress? |
| 15 | `check-hardcoded-render-defaults.js` | STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of bug (F3) from regressing. An F3 violation occurs when a block declares an… |
| 16 | `check-dead-api-calls.py` | STRUCTURAL GUARD — catches a call to a PHP/WordPress/WooCommerce function |
| 17 | `check-control-ux.js` | STRUCTURAL GUARD (Step 7a, 2026-06-11) — prevents the two editor anti-patterns that produce a sub-standard inspector UX: |
| 18 | `survey-experimental-imports.js` | ONE DETECTOR, THREE MODES (D542, Bean-locked): |
| 19 | `check-product-search-guards.js` | STATIC PRE-FLIGHT GUARD for the product-search REST endpoint. |
| 20 | `check_schema_drift.py` | Detect drift between the committed ``schema.sql`` and the live database's DDL. |
| 21 | `check_value_identity.py` | Assert that named, load-bearing DB rows still hold the EXACT value they must. |
| 22 | `capture_seed_data.py` | Capture the Phase-1 Group-5 seed tables from a LIVE database into data files. |
| 23 | `run.py` | F6 DB-as-code consistency suite shared runner. |
| 24 | `lint-responsive-controls.py` | FR-36-24 structural gate (R-31-9 for responsive controls). |
| 25 | `check-tier-storage-shape.py` | Find per-device attribute families that are HALF-MIGRATED between storage shapes. |
| 26 | `check-inert-controls.py` | Find block attributes that are OVERWRITTEN in render.php before being used. |
| 27 | `check-undeclared-attrs.py` | Find block attributes destructured in edit.js that WordPress silently DISCARDS. |
| 28 | `check-undefined-refs.js` | THE GAP THIS CLOSES. On 2026-08-22 three blocks shipped broken editors: sgs/text, sgs/quote and sgs/testimonial referenced `borderColourHover` /… |
| 29 | `check-render-undefined-vars.py` | Undefined-variable gate for block render templates (PHPStan level 1). |
| 30 | `run.py` | F5 cheat-detection gate runner. |
| 31 | `run.py` | F5 excluded-literal tripwire gate for the SGS cloning pipeline. |
| 32 | `coverage_check.py` | ledger.coverage_check — F5 pipeline-close coverage-conservation gate (UNACCOUNTED leg). |
| 33 | `check-atomic-slug-literals.py` | STRUCTURAL GUARD (FR-22-3, 2026-06-13) — prevents new per-block `if slug ==` |
| 34 | `declare_input.py` | ledger.declare_input — F2 draft-derived CSS Accounting Ledger (input parser). |
| 35 | `audit-inline-styling.js` | READ-ONLY DETECTION INSTRUMENT (not a build gate) — classifies HOW every SGS block emits its styling, so a future "no-inline-styling" migration can be… |
| 36 | `check-id-scoped-emits.js` | STRUCTURAL GUARD — ID-scoped CSS selector emissions. |
| 37 | `check-text-gradient-companion.js` | THE TRAP THIS GATE CATCHES. `sgs_text_decls()` (`includes/helpers-colour- variants.php`) returns `color:` DECLARATIONS ONLY. When a text GRADIENT is in… |
| 38 | `check-preset-token-naming.py` | STRUCTURAL GATE — Spec 32 FR-32-9 (Naming Convention) self-verifier. |
| 39 | `check-palette-slug-refs.py` | every referenced colour slug must actually exist. |
| 40 | `check-box-family-guard.py` | STRUCTURAL GUARD — box-object interface contract (2026-07-09 plan §6). |
| 41 | `check-jsonld-flags.py` | guard the ONE json_encode flag combination that is unsafe. |
| 42 | `remove-vacuous-style-engine-guard.py` | Delete the vacuous `function_exists( 'wp_style_engine_get_styles' )` guard. |
| 43 | `check-no-core-blocks.py` | Prebuild gate: NO banned core blocks in theme pattern/part/template FILES. |
| 44 | `check-no-inline.py` | Anti-regression GATE for the framework-wide inline-zero win (Spec 32 FR-32-1 / |
| 45 | `check-stranded-guards.py` | Anti-regression GATE for STRANDED inline-style guards (Spec 32). |
| 46 | `check-shared-css-state-rules.js` | STRUCTURAL GUARD — stops the "state-only shared-CSS size literal" class of bug from regressing. This is the class of defect that shipped LIVE on… |
| 47 | `run.js` | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=spec evidence=this is the entry point described in… |
| 48 | `check-element-manifest-conformance.js` | Spec 35 Task 2 — the CLUSTER-COHERENCE rule, made computable. |
| 49 | `audit-feature-parity.py` | Spec 35 UNIT A — feature-parity audit. |
| 50 | `audit-declared-vs-seeded-roles.py` | Audit: which `sgs/%` attributes LACK A MECHANISM that reaches them — the D497 gate. |
| 51 | `check-universal-fit.js` | WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension |
| 52 | `check-duplicate-controls.js` | STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug: the SAME setting exposed to the client through TWO different editor controls… |
| 53 | `check-simple-surface-cap.js` | FR-37-27 (Spec 37, .claude/specs/37-HEADER-FOOTER-BUILDER.md) — the SIMPLE SURFACE CAP, made computable. The Simple surface (`sgs/site-header` and… |
| 54 | `audit-block-file-consistency.py` | WHOLE-BLOCK CROSS-FILE CONSISTENCY CHECKER. |
| 55 | `audit-block-uniformity.py` | SGS Block Uniformity Audit |
| 56 | `check-editor-render-parity.js` | NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate in this repo catches: "a control is set up correctly on ONE side (editor OR… |
| 57 | `check-ksort-before-hash.py` | STOP-NO-KSORT gate — never reorder $attributes before it is hashed into a uid. |
| 58 | `check-tier-object-cast.py` | Tier-object-cast gate — never coerce a whole object-typed attribute to a string. |
| 59 | `check-single-instance-invariants.py` | Single-instance invariant register — four named prohibitions, one shared mechanism. |

**59 gating scripts.** Regenerate this whole section with:

```bash
python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py
```


### The full library — grep this BEFORE building or hand-doing anything

Every runnable script, with the purpose its own author wrote. Most are NOT
wired into any chain, which is exactly why they get forgotten and rebuilt.
Before writing a new checker, codemod, census, probe or audit — or before
doing that work by hand — search this list. Adapting one of these is nearly
always cheaper than a fresh build plus its brainstorm, QC and tests.

⚠ The naming is not consistent — the same idea appears as `census-*`,
`survey-*`, `audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`. Grep
for the SUBJECT (colour, gradient, token, element, inline, parity), never
for the verb you happen to have in mind.

#### `plugins/sgs-blocks/scripts/` — 496 scripts

| Script | Wired | Purpose (its own words) |
|---|---|---|
| `assert-comment-only-diff.py` | — | Assert a diff changed COMMENTS ONLY — no executable code. |
| `audit-block-file-consistency.py` | build | WHOLE-BLOCK CROSS-FILE CONSISTENCY CHECKER. |
| `audit-block-uniformity.py` | build+commit | SGS Block Uniformity Audit |
| `audit-declared-vs-seeded-roles.py` | build | Audit: which `sgs/%` attributes LACK A MECHANISM that reaches them — the D497 gate. |
| `audit-feature-parity.py` | build | Spec 35 UNIT A — feature-parity audit. |
| `audit-inline-styling.js` | build | READ-ONLY DETECTION INSTRUMENT (not a build gate) — classifies HOW every SGS block emits its styling, so a future "no-inline-styling" migration can… ⚠ **header disputes this — it IS wired** |
| `audit-post-content-blocks.py` | npm | Audit stored post_content for SGS blocks that can no longer render their content. |
| `audit-scoped-selector-live.js` | npm | "scoped selector whose class the element never carries" bug class (the multi-button regression, D303 / P-SCOPED-SELECTOR-MATCH-AUDIT-AND-GATE). |
| `audit-shrink-to-fit.js` | — | WHY LIVE (not static) |
| `behavioural-analyser/assign-canonical.py` | — | Backfills `canonical_slot`, `role`, and `derived_selector` for every row in |
| `behavioural-analyser/backfill-coarse-roles.py` | — | Spec 31 Phase 3.5 — Refine Phase 1 coarse roles to role-templates taxonomy. |
| `behavioural-analyser/backfill-from-json-catalogue.py` | — | Spec 31 Phase 3 step 3.1 helper — one-shot backfill of role / derived_selector |
| `behavioural-analyser/extract-signatures.py` | — | SGS Block Behavioural Signature Extractor |
| `build-deploy.py` | — | One-shot SGS build + tar + scp + remote extract + cleanup. |
| `build-font-collection.py` | — | Generates a WordPress Font Library collection manifest (google-fonts.json) from the |
| `build-tier-fixture-page.py` | — | Build (and publish) ONE canary page carrying every block that has migrated |
| `capture-tier-fixture.py` | — | Measure the tier-fixture page — one scoped measurement per block, three viewports. |
| `census-colour-paint-route.py` | — | Census: how does each block's render.php route its COLOUR PAINT? |
| `cheat-gate/__init__.py` | — | cheat-gate — F5 anti-cheat detection suite for the SGS cloning pipeline. |
| `cheat-gate/check_bound_emit.py` | — | Check #8: static sourceMode='bound' EMIT in converter source. |
| `cheat-gate/check_converter_source.py` | — | Check #9: static source cheats in the new converter/ tree. |
| `cheat-gate/check_d2_when_d1.py` | — | Check #6: D2-when-D1-exists (run_dir-dependent, best-effort). |
| `cheat-gate/check_hardcoded_dicts.py` | — | Check #2: hardcoded property→attr dict literals (R-31-1). |
| `cheat-gate/check_important_render.py` | — | Check #3: !important over a faithful CSS property. |
| `cheat-gate/check_parallel_bp.py` | — | Check #4: parallel breakpoint vocabulary. |
| `cheat-gate/check_sentinel.py` | — | Check #7: sentinel leakage ('unitless' string). |
| `cheat-gate/check_slug_literals.py` | — | Check #1: per-block slug literals (whole-tree + indirect forms). |
| `cheat-gate/models.py` | — | shared data types for the F5 cheat-detection gate. |
| `cheat-gate/run.py` | build | F5 cheat-detection gate runner. |
| `check-atomic-slug-literals.py` | build | STRUCTURAL GUARD (FR-22-3, 2026-06-13) — prevents new per-block `if slug ==` |
| `check-block-asset-targets.js` | npm | STRUCTURAL GUARD (post-D382 hardening) — stops the "block.json names a source filename that never gets compiled" class of bug from regressing. |
| `check-blockjson-metadata-only.py` | commit | visual-diff-gate helper. |
| `check-box-family-guard.py` | build | STRUCTURAL GUARD — box-object interface contract (2026-07-09 plan §6). |
| `check-control-ux.js` | build | STRUCTURAL GUARD (Step 7a, 2026-06-11) — prevents the two editor anti-patterns that produce a sub-standard inspector UX: |
| `check-dead-api-calls.py` | build | STRUCTURAL GUARD — catches a call to a PHP/WordPress/WooCommerce function |
| `check-dead-controls.js` | build | STRUCTURAL GUARD (HC2, 2026-06-08) — stops the "dead control" class of bug from regressing. A dead control is an editor control a client can change… |
| `check-dead-pattern-attrs.py` | build | Find block attributes in theme patterns/parts that WordPress silently DISCARDS |
| `check-device-toggle.js` | npm | (src/blocks/extensions/responsive-device-toggle.js). |
| `check-duplicate-controls.js` | build | STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug: the SAME setting exposed to the client through TWO different editor… |
| `check-editor-canvas-css.py` | commit | visual-diff-gate helper (branch 6). |
| `check-editor-only.py` | commit | visual-diff-gate helper (branch 5). |
| `check-editor-render-parity.js` | build | NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate in this repo catches: "a control is set up correctly on ONE side (editor… |
| `check-element-manifest-conformance.js` | build | Spec 35 Task 2 — the CLUSTER-COHERENCE rule, made computable. |
| `check-empty-inspector-containers.js` | build | STRUCTURAL GUARD — an inspector container rendered with NO children. |
| `check-fx-list-drift.py` | build | the three-list (plus field-type triad) fx drift gate. |
| `check-hardcoded-render-defaults.js` | build | STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of bug (F3) from regressing. An F3 violation occurs when a block declares an… |
| `check-id-scoped-emits.js` | build | STRUCTURAL GUARD — ID-scoped CSS selector emissions. |
| `check-inert-controls.py` | build | Find block attributes that are OVERWRITTEN in render.php before being used. |
| `check-interaction-only-css.py` | commit | visual-diff-gate helper. |
| `check-jsonld-flags.py` | build | guard the ONE json_encode flag combination that is unsafe. |
| `check-ksort-before-hash.py` | build | STOP-NO-KSORT gate — never reorder $attributes before it is hashed into a uid. |
| `check-markup-neutral.py` | commit | visual-diff-gate helper. |
| `check-motion-bundle-budget.py` | npm | Spec 38 (Motion System) Tier G bundle-size budget gate. |
| `check-no-core-blocks.py` | build | Prebuild gate: NO banned core blocks in theme pattern/part/template FILES. |
| `check-palette-slug-refs.py` | build | every referenced colour slug must actually exist. |
| `check-preset-token-naming.py` | build | STRUCTURAL GATE — Spec 32 FR-32-9 (Naming Convention) self-verifier. |
| `check-product-search-guards.js` | build | STATIC PRE-FLIGHT GUARD for the product-search REST endpoint. |
| `check-render-undefined-vars.py` | build | Undefined-variable gate for block render templates (PHPStan level 1). |
| `check-shader-sources.py` | npm | structural gate for Tier W `*.frag.js` shader sources. |
| `check-shared-css-state-rules.js` | build | STRUCTURAL GUARD — stops the "state-only shared-CSS size literal" class of bug from regressing. This is the class of defect that shipped LIVE on… |
| `check-shared-panel-schema.js` | build | STRUCTURAL GUARD — closes the gap in the "dead control" family that check-dead-controls.js (control exists, nothing renders it) and… |
| `check-simple-surface-cap.js` | build | FR-37-27 (Spec 37, .claude/specs/37-HEADER-FOOTER-BUILDER.md) — the SIMPLE SURFACE CAP, made computable. The Simple surface (`sgs/site-header` and… |
| `check-single-instance-invariants.py` | build | Single-instance invariant register — four named prohibitions, one shared mechanism. |
| `check-text-gradient-companion.js` | build | THE TRAP THIS GATE CATCHES. `sgs_text_decls()` (`includes/helpers-colour- variants.php`) returns `color:` DECLARATIONS ONLY. When a text GRADIENT is… |
| `check-tier-object-cast.py` | build | Tier-object-cast gate — never coerce a whole object-typed attribute to a string. |
| `check-tier-storage-shape.py` | build | Find per-device attribute families that are HALF-MIGRATED between storage shapes. |
| `check-token-rename-neutral.py` | commit | Is a block's staged change ONLY a preset-token RENAME whose resolved value is unchanged? |
| `check-undeclared-attrs.py` | build | Find block attributes destructured in edit.js that WordPress silently DISCARDS. |
| `check-undefined-refs.js` | build | THE GAP THIS CLOSES. On 2026-08-22 three blocks shipped broken editors: sgs/text, sgs/quote and sgs/testimonial referenced `borderColourHover` /… |
| `check-undefined-refs.selftest.js` | — | Self-test for check-undefined-refs.js. |
| `check-universal-fit.js` | build | WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension |
| `check-unresolvable-token-refs.py` | — | advisory scan for var(--name) references |
| `check-wrapper-capability-preconditions.js` | build | STRUCTURAL GUARD for the shared-wrapper capability declarations in each block's `supports.sgs` — Spec 35 §F.2.1 + §F.2.2 (D637, step 7 of the… |
| `colour-codemod/adopt.js` | — | `<SgsColourPanel rows={[...]}>`) into a call to the shared row helper it is semantically identical to: fillRow / textRow / borderRow |
| `colour-codemod/fix.js` | — | Scope: TIER A ONLY — rows survey.js verdicts as `AUTOFIXABLE:helper-at-existing-selector`, AND (this file's own further narrowing, documented in… |
| `colour-codemod/migrate-shadow-mounts.js` | — | WHY. ShadowControl was parameterised by VALUES AND CALLBACKS: six props hand-wired at every mount, where GradientOverlayControl's callers pass one… |
| `colour-codemod/scan-undeclared-setattributes.js` | — | the cross-tier-review fix (post-Task-1 critical defect: fix.js could emit a `setAttributes({ X: ... })` write for an attribute X that block.json… |
| `colour-codemod/survey.js` | — | WHY THIS EXISTS. rule 31 already answers "which rows are wrong?" (388 findings across 61 blocks). It does NOT answer "which of those can a codemod… |
| `consistency/build-roster.py` | build | Spec 35 UNIT A0 — enumerate the block roster + per-block surface flags from the DB. |
| `consistency/build-setting-types.py` | — | Spec 35 UNIT A+ Phase 1 — dedup every SGS attribute to its unique SEMANTIC SETTING. |
| `consistency/check-box-flat.py` | — | DISCOVERY GATE — flags box-object-capable controls still stored as FLAT |
| `consistency/check-cluster-coverage.py` | — | Spec 35 FR-35-3 — assert that every css:* and anim:* setting row belongs to exactly one cluster. |
| `consistency/check-reclassified-keys.py` | — | Spec 35 — REGENERATION GUARD for Bean-ruled reclassified setting keys. |
| `consistency/reclassify.py` | — | Spec 35 UNIT A+ Phase 1c — RE-CLASSIFY the "unresolved" non-CSS-property attributes. |
| `consistency/report-colour-alpha.py` | — | REPORT-ONLY (never non-zero exit) — surfaces colour controls that lack an |
| `consistency/run-consistency-gates.py` | build | Single orchestrator for the SGS blocks consistency-gate suite. Runs a fixed |
| `content-role-detect/classify_detector1.py` | — | Detector 1 (step 2 of 2) — classify raw escaping-call facts extracted by |
| `content-role-detect/detector1_render_escaping.php` | — | Detector 1 — render.php output-escaping walk (structural, token-based). |
| `content-role-detect/detector2_editjs_controls.py` | — | Detector 2 — edit.js control-binding walk (structural, JSX-tag-aware). |
| `content-role-detect/detector3_i18n_default.py` | — | Detector 3 — i18n-wrapped default walk (structural, statement-scoped). |
| `content-role-detect/detector4_referenced_not_output.py` | — | Detector 4 — "referenced in code, but never escaped to output and never CSS". |
| `content-role-detect/detector5_image_alt_companion.py` | — | Detector 5 -- derive the image<->alt COMPANION relationship from render.php. |
| `content-role-detect/detector6_native_support_and_style_emission.py` | — | Detector 6 -- "WP-core native support" + "value painted inside a <style> element". |
| `content-role-detect/detector7_css_paint_flow.php` | — | Detector 7 — CSS PAINT FLOW (forward variable tracking to a paint site). |
| `content-role-detect/detector8_undeclared_enum.php` | — | Detector 8 — UNDECLARED ENUM (a schema gap, not a role gap). |
| `content-role-detect/fingerprint_content_roles.py` | — | Deterministic content-role fingerprint (Track A / Spec 35, Step 2). |
| `converter/__init__.py` | — | SGS clean modular converter (Spec 31 §12.4 / §12.6 step 2 — vertical slice). |
| `converter/context.py` | — | typed per-element context + declaration for the modular converter. |
| `converter/coverage_report.py` | — | the Bean-visible sign-off grid (design §5). |
| `converter/db/__init__.py` | — | converter/db — the modular engine's own DB-accessor package. |
| `converter/db/db_lookup.py` | — | DB-backed canonical lookups for the converter. |
| `converter/dispatch_table.py` | — | the DB-sourced routing function (design §2). |
| `converter/entry.py` | — | Stage 4 pipeline entry point for the modular converter (`converter/`). |
| `converter/gates/__init__.py` | — | Anti-cheat gates the scaffold ships (design §4.1). |
| `converter/gates/check_content_attr_collisions.py` | — | DB gate: attrs the content resolver cannot tell apart. |
| `converter/gates/check_preset_absence_no_slug_literal.py` | — | scoped static gate for |
| `converter/gates/check_raw_sqlite.py` | — | AST gate: no converter/ file opens sqlite3 directly. |
| `converter/gates/import_ban.py` | — | AST gate: no converter/ file may import the frozen engine. |
| `converter/gates/no_slug_literal.py` | — | AST gate: no block-slug / variant / slot carve-outs in resolver bodies. |
| `converter/models.py` | — | the Write / GAP result types every resolver returns. |
| `converter/orchestrator.py` | — | dispatch + conservation spine (design §3 / §4). |
| `converter/recognition.py` | — | Stage-2 block recognition (modular rebuild, step-3 stage 1). |
| `converter/resolvers/__init__.py` | — | Resolver registry — resolver_id (from dispatch_table) → resolve callable. |
| `converter/resolvers/array_content.py` | — | Array / repeater content lift (Spec 31 §3.B4 / §13.3 FR-31-2.5). |
| `converter/resolvers/content_band.py` | — | content_band — the CONTENT-layer resolver (Spec 31 §3.A, layer L2). |
| `converter/resolvers/grid.py` | — | grid — the GRID-layer resolver (Spec 31 §3.A, layer L3 / D207 grid engine). |
| `converter/resolvers/outer_box.py` | — | outer_box — the OUTER-layer resolver (Spec 31 §3.A, layer L1). |
| `converter/resolvers/preset_absence.py` | — | Build #3 Option B: preset-absence transfer (AUTO-DERIVE). |
| `converter/resolvers/scalar_content.py` | — | modularised ``_lift_scalar_attrs_by_selector`` (convert.py:3781). |
| `converter/resolvers/scalar_media.py` | — | scalar_media — retired CSS-dispatch stub (design §3 / §3.2; retired 2026-07-04). |
| `converter/resolvers/styling_content.py` | — | modularised ``_lift_styling_attrs_by_selector`` (convert.py:3903). |
| `converter/resolvers/typography.py` | — | typography — the typography resolver (Spec 31 §3.B2 / §3.A, layer-agnostic). |
| `converter/services/__init__.py` | — | Resolver services — the small typed steps a resolver composes. |
| `converter/services/arrangement.py` | — | Spec 31 §2.3/§2.4/§2.5 arrangement-layer helpers. |
| `converter/services/assembly.py` | — | Stage 3 §1 emit glue: build_block_markup (design §1). |
| `converter/services/attr_resolve.py` | — | attr_resolve — name-free (block, layer, property) → attr resolution (design §3.1). |
| `converter/services/border_side.py` | — | border_side — per-side border-width longhand → merged ``borderWidth`` object. |
| `converter/services/button_group.py` | — | faithful port of the button-grouping pass. |
| `converter/services/content_gap_collector.py` | build | the content-side gap channel (observability only). |
| `converter/services/content_select.py` | — | content_select — bs4 selection + DOM-shape helpers for content extraction (Stage 3). |
| `converter/services/css_parse.py` | — | css_parse — shared CSS-text-to-rule-dict parser (ported off the frozen tree). |
| `converter/services/css_pass.py` | — | Stage 3 §3.A CSS pass: the CSS-declaration resolver dispatch. |
| `converter/services/draft_oracle.py` | — | independent draft reader for the LANDED gate (Stage 3 §7). |
| `converter/services/extraction.py` | — | Stage 3 content extraction: ScalarLifts / ChildBlocks / ContentGaps. |
| `converter/services/field_extractors.py` | — | Shared per-element role→value dispatch (Spec 31 §3.B.0). |
| `converter/services/fold_helpers.py` | — | ported CSS-fold helper functions for the modular rebuild. |
| `converter/services/gap_writer.py` | — | gap_writer — record a tracked GAP (design §3.1, FR-31-21 step 6). |
| `converter/services/has_inner.py` | — | has_inner — derive delegates_content at convert-time from save.js + render.php. |
| `converter/services/icon_resolver.py` | — | SGS Trust-Bar Icon Identity Resolver |
| `converter/services/l2_qualify.py` | — | the L2 (CONTENT-layer) relational qualifier. ONE function, unwired. |
| `converter/services/layer_detect.py` | — | layer_detect — classify a node's structural layer (design §2 / §2.2). |
| `converter/services/lift_helpers.py` | — | ported helper closure for the scalar-content lift. |
| `converter/services/pseudo_overlay.py` | — | ``::before``/``::after`` pseudo-element CSS lift (Unit B1). |
| `converter/services/recognise_helpers.py` | — | recognise_helpers — small DB-driven helpers for Stage-2 recognition. |
| `converter/services/render_emits.py` | — | render_emits — source-derived per-element nested-content signal (the render_reads gate). |
| `converter/services/root_supports.py` | — | root-CSS-to-WP-native-style lift for the modular engine. |
| `converter/services/section_passes.py` | — | the two universal section passes, ported from the frozen |
| `converter/services/state_value_lift.py` | — | state_value_lift — direct (block, css_property, css_state) resolution + |
| `converter/services/styling_helpers.py` | — | ported helper functions for the styling-attr lift. |
| `converter/services/text_leaf.py` | — | text-leaf detection + text-capability gate. |
| `converter/services/tier_suffix.py` | — | tier_suffix — re-append the device-tier breakpoint suffix to a base attr. |
| `converter/services/token_resolution_check.py` | — | advisory detector for unresolvable name references |
| `converter/services/token_snap.py` | — | token_snap — snap a value to a design token when within tolerance (design §3.1). |
| `converter/services/validate.py` | — | validate — gate a (attr, value) write before it is emitted (design §3.1). |
| `converter/services/value_serialise.py` | — | value_serialise — render a raw draft value into the attr's stored form (design §3.1). |
| `converter/services/variant_detect.py` | — | variant_detect — recognise a block's variant from its BEM modifier + the DB. |
| `converter/walk.py` | — | the single walker entry + TOTAL structural-signature registry. |
| `copy-built-styles.js` | npm | Postbuild: copy style-index.css to style.css per block. |
| `coverage-matrix/classifier.py` | — | assigns a CellState to each (block, column) pair. |
| `coverage-matrix/db_queries.py` | — | all DB reads for the coverage-matrix module. |
| `coverage-matrix/generate-coverage-matrix.py` | — | Spec 31 §5 + MF-7 auto-generated coverage dashboard. |
| `coverage-matrix/models.py` | — | shared data types for the coverage-matrix module. |
| `db-consistency/__init__.py` | — | db-consistency — F6 DB-as-code consistency suite. |
| `db-consistency/check_composition.py` | — | Check #2: block.json hasInnerBlocks override sanity. |
| `db-consistency/check_css_property_reseed.py` | — | Check #8: css_property/css_layer reseed-survival. |
| `db-consistency/check_fx_qualifying_blocks_stale.py` | — | Spec 38 fx qualifying-blocks map |
| `db-consistency/check_motion_fx_reseed.py` | — | Spec 38 motion-fx registry reseed-survival guard. |
| `db-consistency/check_orphan_roles.py` | — | Check #6: role referential integrity. |
| `db-consistency/check_overrides_drift.py` | — | Check #4: override-dict drift. |
| `db-consistency/check_routing.py` | — | Check #1: routing determinism guard. |
| `db-consistency/check_tier_composition.py` | — | Check #7: tier ↔ composition_role/container_kind. |
| `db-consistency/check_variant_reseed.py` | — | Check #5: variant_slots ↔ block.json determinism. |
| `db-consistency/check_variants.py` | — | Check #3: variant discriminator AMBIGUITY on the lift surface. |
| `db-consistency/models.py` | — | shared data types for the F6 DB-consistency suite. |
| `db-consistency/resolver_bridge.py` | — | reuse the REAL resolver derivation for F6 checks. |
| `db-consistency/run.py` | build | F6 DB-as-code consistency suite shared runner. |
| `dbschema/capture_seed_data.py` | build | Capture the Phase-1 Group-5 seed tables from a LIVE database into data files. |
| `dbschema/check_schema_drift.py` | build | Detect drift between the committed ``schema.sql`` and the live database's DDL. |
| `dbschema/check_value_identity.py` | build | Assert that named, load-bearing DB rows still hold the EXACT value they must. |
| `dbschema/migrate.py` | — | Migration runner + tracking table for the SGS knowledge-base DB. |
| `dbschema/rebuild_compare.py` | — | Rebuild the knowledge base from NOTHING and report honestly what returns. |
| `dbschema/refresh_wp_reference.py` | — | Refresh the WordPress reference corpus (`hooks` + `docs`) — and DROP stale rows. |
| `dbschema/retire_table.py` | — | Retire a knowledge-base table: back up, archive it reversibly, then DROP it. |
| `dbschema/sandbox.py` | — | Run DB-touching scripts against a throwaway database, never the live one. |
| `dbschema/seed_history.py` | — | Record the last N seeding runs' row counts and REPORT what moved unexpectedly. |
| `dbschema/wp_reference_archive.py` | — | Preserve the ORPHANED WordPress reference corpus (`hooks` + `docs`). |
| `dead-api-checker/tokenize-calls.php` | — | Tokenize-calls.php |
| `diff-gap-sanitiser.php` | — | Differential test: sgs_container_gap_value() old allowlist vs the new sgs_css_length_value()-delegating implementation. |
| `drift-validator/validate.py` | — | Spec 19 Stage 9 — Drift Validator |
| `e2e-authoring-acceptance.php` | — | SGS QA-AUTHORING Gate — FR-27 Cluster C End-to-End Authoring Acceptance Test |
| `excluded-gate/__init__.py` | — | excluded-gate — F5 excluded-literal tripwire gate. |
| `excluded-gate/db_check.py` | — | cross-reference detected signatures against excluded_properties DB table. |
| `excluded-gate/models.py` | — | shared data types for the F5 excluded-literal gate. |
| `excluded-gate/run.py` | build | F5 excluded-literal tripwire gate for the SGS cloning pipeline. |
| `excluded-gate/scanner.py` | — | import-graph-wide scan for CSS-property exclusion literals. |
| `extract-button-presets.py` | — | Pipeline step: extract a draft mockup's `.sgs-button--{variant}` + `:hover` CSS |
| `extract-comment-narrative.py` | — | Find comment blocks that NARRATE CHANGES rather than describe behaviour. |
| `fanout-overlay-sibling-attrs.py` | — | D6 (hover + responsive-tier siblings) and |
| `fingerprint-builder/audit-attr-vocabulary-v2.py` | — | Audit v2 — multi-suffix decomposition. |
| `gap-detection/detect.py` | — | Spec 19 Stage 10 — Gap Detection |
| `generate-attr-role-map.py` | — | Spec 35 orphan-triage support. Dumps `block_attributes.role` for every |
| `generate-block-reference.py` | — | SGS Blocks Reference Generator |
| `generate-extension-attributes.js` | build | Single source of truth for the cross-block `sgs*` editor-extension attributes. |
| `generate-fx-effects-php.py` | — | writes includes/generated-fx-effects.php from fx_effects. |
| `generate-fx-qualifying-blocks.py` | — | derives the block -> qualifying-fx-effects |
| `generate-icons.js` | build | Generates includes/lucide-icons.php from lucide-static SVG files. |
| `generate-markup-examples.py` | — | Generate markup examples for all 69 SGS blocks with block.json files. |
| `generate-tooling-catalogue.py` | — | DERIVE the tooling catalogue in .claude/dev-setup.md. |
| `golden-master-acceptance.php` | — | SGS Golden-Master Acceptance Test — Spec 27 FR-27-R2 Empirical Acceptance Gate |
| `golden-master-harness.php` | — | SGS Golden-Master Harness — Spec 27 FR-27-R2 Acceptance Gate |
| `image-sequence-prep.py` | — | turns a video into frames the sgs/image-sequence block can use. |
| `inspector-scan/core/baseline.js` | — | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.7 source=spec evidence=hybrid baseline shape (keyed… |
| `inspector-scan/core/components.js` | — | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.5 source=file evidence=live-read… |
| `inspector-scan/core/extensions.js` | — | GROUND-TRUTH: spec=task brief 2026-08-08 (extensionsDir plumbing) source=file evidence=live-read plugins/sgs-blocks/src/blocks/extensions/ on… |
| `inspector-scan/core/finding.js` | — | GROUND-TRUTH: spec=none source=file evidence=live-read plugins/sgs-blocks/scripts/inspector-scan/core/roster.js (`BLOCKS_DIR =… |
| `inspector-scan/core/golden.js` | — | core/golden.js — the shared GOLDEN-CONTROL engine (C4 step 1, 2026-08-19). |
| `inspector-scan/core/report.js` | — | Report is generated by iterating the rule REGISTRY (rules.json order), never a second hand-written order list — this is the direct mitigation for H7… |
| `inspector-scan/core/roster.js` | — | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=file evidence=live-read… |
| `inspector-scan/core/selftest.js` | — | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.9 source=file evidence=live-read… |
| `inspector-scan/core/sources.js` | — | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=file evidence=`@babel/*` confirmed NOT a declared… |
| `inspector-scan/export-colour-css-property.py` | — | DB-first mechanism source for rule 31. |
| `inspector-scan/rules/01-tab-group.js` | — | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 1 source=file evidence=live-read… |
| `inspector-scan/rules/03-dense-panel-candidate.js` | — | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 3 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/04-colour-alpha.js` | — | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 4 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/07-preset-only-shadow.js` | — | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 7 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/08-raw-url-link.js` | — | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 8 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/14-media-upload-check.js` | — | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 14 source=file evidence=PORTED VERBATIM from… |
| `inspector-scan/rules/17-reduced-motion-gate.js` | — | GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 17 source=file evidence=PORTED WHOLE (not re-derived — the migration order… |
| `inspector-scan/rules/18-decorative-image-aria.js` | — | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 18 source=file evidence=row 18 verdict "ABSENT (claim… |
| `inspector-scan/rules/20-pattern-template-lock.js` | — | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 20 source=file evidence=row 20 verdict "ABSENT (claim… |
| `inspector-scan/rules/21-render-without-control.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"The defect register" ("The fourth quadrant: declared + rendered + NO… |
| `inspector-scan/rules/22-placement-rule-surfaces.js` | — | GROUND-TRUTH: spec=.claude/decisions.md D537 (read verbatim 2026-08-09) + .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §"THE PLACEMENT… |
| `inspector-scan/rules/23-content-width-needs-inner-band.js` | — | GROUND-TRUTH: spec=.claude/decisions.md D540 (read verbatim 2026-08-10) + .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md, the bullet beginning… |
| `inspector-scan/rules/24-raw-canonical-component.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §1 COLOUR / §2 LINK (read live 2026-08-10). §1.1/§1.3: canonical =… |
| `inspector-scan/rules/25-no-own-device-switcher.js` | — | GROUND-TRUTH: spec=task brief 2026-08-10 (global device toggle regression guard) + live read of src/components/ResponsiveControl.js… |
| `inspector-scan/rules/26-responsive-duplicate.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §12 (THE RESPONSIVE WRAPPER FAMILY) source=file evidence=live-read… |
| `inspector-scan/rules/27-superseded-link-control.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §2 LINK |
| `inspector-scan/rules/28-fix-durability.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (Part F, anti-patterns) source=file evidence=live-read 2026-08-18. |
| `inspector-scan/rules/29-duplicate-visible-label.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 (canonical-assignment + banned-lookalike table) + Part A5 (nested ToolsPanel… |
| `inspector-scan/rules/30-raw-box-control.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 canonical-assignment line |
| `inspector-scan/rules/31-golden-colour-control.js` | — | GROUND-TRUTH: spec=plugins/sgs-blocks/scripts/consistency/golden-controls.json (written 2026-08-19, read live before writing this rule)… |
| `inspector-scan/rules/33-ineffective-typography-selector.js` | — | GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md Part F.1 source=file evidence=live-read 2026-08-18. |
| `inspector-scan/rules/34-declared-attr-unrendered.js` | — | GROUND-TRUTH: spec=.claude/plans/phase-shop-container-remediation.md "R-3 BATCH ENFORCEMENT-SCRIPT FIX — the register", subsection R3-e ("block.json… |
| `inspector-scan/run.js` | build+commit | GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md source=spec evidence=this is the entry point described in… |
| `ledger/__init__.py` | — | ledger — F2 draft-derived CSS Accounting Ledger (input parser). |
| `ledger/content_gap_check.py` | — | ledger.content_gap_check — F5 ContentGap visibility gate (the content-dropping channel). |
| `ledger/coverage_check.py` | build | ledger.coverage_check — F5 pipeline-close coverage-conservation gate (UNACCOUNTED leg). |
| `ledger/declare_input.py` | build | ledger.declare_input — F2 draft-derived CSS Accounting Ledger (input parser). |
| `ledger/models.py` | — | ledger.models — data model for F2 CSS Accounting Ledger (input half). |
| `lint-responsive-controls.py` | build | FR-36-24 structural gate (R-31-9 for responsive controls). |
| `lints/__init__.py` | — |  |
| `lints/bem-lint.py` | commit | BEM compliance lint — Stage 0.1 of /sgs-clone (Spec 31). |
| `lints/draft-vocab-lint.py` | — | Draft VOCABULARY lint — names vs the live framework DB (sibling of bem-lint.py). |
| `lints/lint-spec-drift.py` | npm | Spec-drift lint — do the specs describe things that actually EXIST? |
| `lints/lint-theme-css-hardcodes.py` | — | Theme-CSS hardcode lint — arbitrary typography/colour literals in THEME CSS. |
| `lints/token-lint.py` | commit | Token-discovery lint — Stage 0.5 of /sgs-clone (Spec 31, FR38). |
| `make-visual-diff-reports.py` | commit | Emit visual-diff reports, each citing ITS OWN measurement. |
| `migrate-content-collection-to-card-grid.php` | — | Migrate `sgs/content-collection` blocks to `sgs/card-grid` (source = cpt-collection). |
| `migrate-core-blocks/block_parser.py` | — | Span-preserving WordPress block-comment parser. |
| `migrate-core-blocks/build_register.py` | — | Track C register builder — read-only survey of replaceable core blocks. |
| `migrate-core-blocks/capture-page.js` | — | Generic Track C first-paint capture: screenshots a URL at 375/768/1440 into reports/visual-diff/ and flags horizontal overflow. |
| `migrate-core-blocks/capture-preset-gap.js` | — | Track C preset-gap first-paint capture — screenshots the probe page at 375/768/1440 into reports/visual-diff/ + flags horizontal overflow. |
| `migrate-core-blocks/contract.py` | — | Shared contract between the migration driver and pairing modules. |
| `migrate-core-blocks/driver.py` | — | Track C migration driver — swaps core blocks for their SGS replacements. |
| `migrate-core-blocks/lint-page.py` | — | Lint (and optionally fix) banned core blocks in a PAGE's block markup. |
| `migrate-core-blocks/migrate-details-to-accordion.py` | — | core/details -> sgs/accordion + sgs/accordion-item (N sibling details -> 1 accordion). |
| `migrate-core-blocks/pairings/__init__.py` | — |  |
| `migrate-core-blocks/pairings/button_pairing.py` | — | core/button -> sgs/button transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/buttons_pairing.py` | — | core/buttons -> sgs/multi-button transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/column_pairing.py` | — | core/column -> sgs/container (a grid cell). Track C pairing module. |
| `migrate-core-blocks/pairings/columns_pairing.py` | — | core/columns -> sgs/container (a grid row). Track C pairing module. |
| `migrate-core-blocks/pairings/cover_pairing.py` | — | core/cover → sgs/hero transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/group_pairing.py` | — | core/group -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/heading_pairing.py` | — | core/heading → sgs/heading transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/image_pairing.py` | — | core/image → sgs/media transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/latest_posts_pairing.py` | — | core/latest-posts → sgs/post-grid transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/paragraph_pairing.py` | — | core/paragraph → sgs/text transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/post_template_pairing.py` | — | core/post-template -> sgs/post-grid — REFUSE-ALL (no standalone target exists). |
| `migrate-core-blocks/pairings/query_pairing.py` | — | core/query -> sgs/post-grid — REFUSE-ALL (design-decision gap, not a bug). |
| `migrate-core-blocks/pairings/row_pairing.py` | — | core/row -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/separator_pairing.py` | — | core/separator -> sgs/separator transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/site_logo_pairing.py` | — | core/site-logo → sgs/responsive-logo transformer (Track C pairing module). |
| `migrate-core-blocks/pairings/stack_pairing.py` | — | core/stack -> sgs/container (Track C pairing module). |
| `migrate-core-blocks/pairings/typography_common.py` | — | Shared helpers for the core/heading + core/paragraph pairing modules. |
| `migrate-core-blocks/probe-accordion.js` | — | Verify the migrated FAQ accordion works end-to-end: all 5 questions present, answers hidden until clicked, and clicking a header reveals its answer. |
| `migrate-core-blocks/probe-button-equivalence.js` | — | Content-keyed button equivalence probe (rule 4a): compares each button's rendered geometry + paint between a BEFORE page (core/button) and an AFTER… |
| `migrate-core-blocks/probe-columns-responsive.js` | — | Columns→container responsive equivalence: compares the two column cells' geometry between BEFORE (core/columns) and AFTER (sgs/container grid) at… |
| `migrate-core-blocks/probe-cw-cause.js` | — | Prove-the-cause probe: on the minimal contentWidth:800 repro, find the sgs-container OUTER element and enumerate EXACTLY which CSS rule caps its… |
| `migrate-core-blocks/probe-group-layout.js` | — | Group→container layout equivalence: compare the wrapper element's box + background + the inner content-band width between a BEFORE (core/group) and… |
| `migrate-core-blocks/probe-heading-cascade.js` | — | Diagnose WHY a heading's colour/letter-spacing differs between the core and SGS renders: dump the theme's preset custom properties and enumerate… |
| `migrate-core-blocks/probe-image-pairing.js` | — | Track C image-pairing equivalence probe — compares the rendered geometry of the three representative images on the BEFORE (core/image) and AFTER |
| `migrate-core-blocks/probe-multibutton-margin.js` | — | Settles one question empirically: does `style.spacing.margin` actually RENDER on sgs/multi-button (which declares no spacing support, but routes… |
| `migrate-core-blocks/probe-overflow.js` | — | Track C overflow probe — at 375px, finds every element wider than the viewport and reports its selector path + the computed properties that govern… |
| `migrate-core-blocks/probe-page8-media.js` | — | Page-8 (homepage clone) media geometry probe — regression net for the sgs/media naked-mode max-width fix. Run before and after the deploy; the two… |
| `migrate-core-blocks/probe-preset-gap.js` | — | Track C preset-gap probe — measures the LIVE computed font-size of the four PROBE blocks on the canary test page (id 1468, /tc-preset-gap-probe/). |
| `migrate-core-blocks/probe-text-equivalence.js` | — | Content-keyed typography equivalence probe (rule 4a). |
| `migrate-core-blocks/publish-pattern-pair.py` | — | Publish a BEFORE/AFTER canary page pair for a migrated pattern file. |
| `migrate-core-blocks/upgrade-button-presets.py` | — | One-shot: upgrade already-emitted sgs/button instances to use PRESETS. |
| `migrate-gallery-object-model.js` | — | onto the Spec 37 FR-37-16 {desktop,tablet,mobile} object model. |
| `migrate-length-sanitiser.py` | — | Move every LENGTH-valued call site from the crude sanitiser to the hardened one. |
| `migrate-overlay-tier-axis.py` | — | Move the overlay's responsive tier axis OFF colour and ONTO opacity (D739). |
| `migrate-render-closures.py` | — | Adopt the shared render helpers in place of per-file inline sanitiser closures. |
| `migrate-theme-attr-rename.py` | — | rename ONE attribute key, scoped to ONE block slug, |
| `migrate-theme-native-spacing.py` | — | Migrate hand-authored `style.spacing` to the block-OWNED padding/margin attrs. |
| `migrate-theme-tier-scalars.py` | — | fold a flat per-device scalar into ONE tier object, |
| `migrate-tier-object.py` | — | collapse a flat per-device attribute trio into ONE tier object. |
| `migrations/2026-06-13-testimonial-selector-fingerprint-override.py` | — | Migration: write multi-alias derived_selector for sgs/testimonial styling attrs. |
| `migrations/2026-06-26-testimonial-media-role-selector.py` | — | Migration: set role + derived_selector for sgs/testimonial object media attrs. |
| `migrations/2026-08-13-register-core-role-and-seed-native-wp.py` | — | Migration: register the 'core' role + seed it onto every source='native_wp' row. |
| `migrations/2026-08-13-role-remediation-part2-overrides.py` | — | One-shot script: apply this session's confirmed one-off role classifications. |
| `motion-qa/probe-carousel-loop.mjs` | — | Live probe — looping carousels (Spec 38, Bean's independent-control ruling). |
| `motion-qa/probe-cursor-field.mjs` | — | Live probe — cursor-reactive field (Spec 38 §3.3, FR-38-25). |
| `motion-qa/probe-editor-css-warnings.mjs` | — | Failing-test probe for the editor iframe CSS-loading warnings. |
| `motion-qa/probe-first-paint.mjs` | — | gate's `first_paint_capture_passed` field is supposed to attest. |
| `motion-qa/probe-good-by-default.mjs` | npm | Gap-register claim 7 — is "good by default" true for pin-scrub / scrub / scramble / split-reveal? (2026-08-21, D729) |
| `motion-qa/probe-horizontal-panel-focus.mjs` | — | Horizontal-panel keyboard-focus probe — Spec 38 FR-38-8 follow-up |
| `motion-qa/probe-horizontal-panel.js` | — | Horizontal-panel travel probe — Spec 38 FR-38-8. |
| `motion-qa/probe-morph-geometry.mjs` | npm | D452 close-out (2026-08-21) — does `fx-morph` actually morph on the live canary? |
| `motion-qa/probe-motion-path-repeat.mjs` | npm | D451 close-out (2026-08-21) — does motion-path re-animate on a SECOND downward pass? |
| `motion-qa/probe-reduced-motion.mjs` | — | Horizontal panel — reduced-motion arm probe. Spec 38 FR-38-8 / §10. |
| `motion-qa/probe-step13-pin-focus.mjs` | — | Step 13 (Motion Wave D register) — pin + horizontal-panel keyboard story. |
| `motion-qa/probe-step14-scrub-focus.mjs` | — | Job 1/2 (2026-08-01, D453 follow-up register) — fx-scrub.js + fx-split-reveal.js keyboard-hold fix, verified IN SITU against the REAL deployed… |
| `motion-qa/probe-stepn-image-sequence-pin.mjs` | — | Step N (Motion Wave D register) — image-sequence PIN-ON path, first live observation. |
| `motion-qa/probe-tier-w-surface.mjs` | — | Live probe — Tier W surface-treatment effect (Spec 38 §1.2b, D479). |
| `motion-qa/probe-wave-c-editor.mjs` | — | Spec 38 Wave C — EDITOR-surface probe (D388). |
| `motion-qa/probe-wave-c.mjs` | — | Spec 38 Wave C — live browser probe for every shipped Wave C effect. |
| `motion-qa/run-live-probes.mjs` | npm | Live motion-QA runner — the standing post-deploy motion check. |
| `nav-qa/axe-run.mjs` | — | blocks (Spec 36 §8 / FR-36-16: "axe = 0 on the OPEN drawer AND an OPEN desktop mega"). |
| `nav-qa/build-poc-fixtures.py` | — | create the nav-drawer variant POC fixtures on the canary. |
| `nav-qa/crawl-assert.mjs` | — | bar+dropdown+mega link AND mega content must be present in the PRE-JS HTML (what a crawler / no-JS user gets), never injected client-side. |
| `nav-qa/elementfrompoint-sweep.mjs` | — | occlusion sweep, carried verbatim from Spec 34 FR-S9-5 / FR-34-7 (D101). |
| `nav-qa/lib/openness-guard.mjs` | — | for every nav-qa script that measures or captures an interactive surface. |
| `nav-qa/logical-props-lint.py` | — | RTL-readiness WARN-only lint for the SGS nav blocks |
| `nav-qa/palette-contrast-sweep.mjs` | — | drafts (mega-menu panels and any other self-contained SGS-BEM draft). |
| `nav-qa/shoot-drawer-pairs.mjs` | — | WHY |
| `nav-qa/submenu-harness.php` | — | Stubbed harness for SGS_Nav_Menu_Bar_Renderer — walker AND render_items. |
| `nav-qa/sweep-drawer-variants.mjs` | — | WHY THIS SHAPE |
| `no-inline/check-no-inline.py` | build | Anti-regression GATE for the framework-wide inline-zero win (Spec 32 FR-32-1 / |
| `no-inline/check-stranded-guards.py` | build | Anti-regression GATE for STRANDED inline-style guards (Spec 32). |
| `no-inline/detect.py` | — | No-inline detector — the worklist generator for the framework-wide inline-zero |
| `no-inline-land-verify.js` | — | For a manifest of blocks, it: |
| `oracle/__init__.py` | — | oracle — F3 LANDED render-oracle (F3-core). |
| `oracle/attribution_ground_truth.py` | — | Generate + check the attribution GROUND TRUTH (the falsifiable control). |
| `oracle/batch_runner.py` | — | oracle.batch_runner — F3 render-oracle LANDED runtime, multi-fixture BATCH mode. |
| `oracle/capture.py` | — | oracle.capture — capture-adapter INTERFACE for the F3 LANDED oracle. |
| `oracle/decompose_unattributed.py` | — | Diagnostic: decompose the oracle's unattributed-cell count into named buckets. |
| `oracle/element_probe.py` | — | oracle.element_probe — resolve a DRAFT selector to the CLONE element to measure. |
| `oracle/golden_expectations.py` | — | oracle.golden_expectations — does a fixture's GOLDEN expect any rendered text? |
| `oracle/guards.py` | build | oracle.guards — the four false-win guards for the F3 LANDED oracle. |
| `oracle/metamorphic.py` | — | oracle.metamorphic — MR-2 metamorphic relation for the F3 LANDED oracle. |
| `oracle/models.py` | — | oracle.models — data model for F3 LANDED render-oracle. |
| `oracle/provision_fixture_canaries.py` | — | oracle.provision_fixture_canaries — deploy the fixture corpus as live canary pages. |
| `oracle/render_oracle.py` | — | oracle.render_oracle — F3 render-oracle: the live Playwright capture leg. |
| `oracle/run_canary_proof.py` | — | oracle.run_canary_proof — F3-core-B: the live-canary LANDED proof (separate named command). |
| `oracle/verdict.py` | — | oracle.verdict — the verdict function for the F3 LANDED oracle. |
| `orchestrator/atomic-block-scaffold.py` | — | - Spec 31 Phase 5b.8 atomic-block scaffold. |
| `orchestrator/attribute-staged-apply.py` | — | - Spec 31 Phase 5b.6 attribute staged-application. |
| `orchestrator/autonomy_gate.py` | — | - Spec 31 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7. |
| `orchestrator/check_flat_tier_regression.py` | — | Spec 35 flat-to-object migration divergence gate. |
| `orchestrator/check_no_mirror.py` | — | R-31-15 anti-mirror gate for the cloning converter. |
| `orchestrator/critical-fix-verification.py` | — | - Spec 31 Phase 5f.1 acceptance harness. |
| `orchestrator/css_router.py` | — | Spec 16 §FR6 four-destination CSS router. |
| `orchestrator/expected_rules.py` | — | - Per-section CSS rule baseline for Phase 9 walkdown. |
| `orchestrator/functionality-bulk-apply.py` | — | - Spec 31 Phase 5b.7 bulk-application. |
| `orchestrator/lingua_franca.py` | — | - Spec 31 Phase 5c (FR9) convention-to-SGS-BEM converter. |
| `orchestrator/media-sideload.py` | — | - Spec 31 Phase 5b.5 media sideloader. |
| `orchestrator/mutex.py` | — | - Spec 31 Phase 5b.4 build mutex (FR19). |
| `orchestrator/orchestrator_main.py` | — | - Spec 31 Phase 5e.8 top-level entry point. |
| `orchestrator/pipeline-stage-gate.py` | — | post-clone structural gate for the SGS cloning pipeline. |
| `orchestrator/preflight_chain.py` | — | - Spec 31 Phase 5e.1 + 5e.2. |
| `orchestrator/register_patterns.py` | — | - Spec 31 Phase 6 Step 0 +REGISTER tail. |
| `orchestrator/stage1_boundary_hook.py` | — | - Spec 31 Phase 5c.4 Stage 1 BOUNDARY hook. |
| `orchestrator/stage_attribute_promotion.py` | — | Operator-driven attribute-gap promotion stage. |
| `orchestrator/staged_merge.py` | — | - Spec 31 Phase 5e.3 staged-merge orchestrator. |
| `orchestrator/staged_output.py` | — | - Spec 31 Phase 5b.1 staged-output dir convention. |
| `orchestrator/surface_pipeline_logs.py` | — | Surface structured per-severity logs from trace.jsonl at pipeline end. |
| `orchestrator/test_atomic_block_scaffold.py` | — | Spec 31 Phase 5b.8 self-test for atomic-block-scaffold.py. |
| `orchestrator/test_attribute_staged_apply.py` | — | Spec 31 Phase 5b.6 self-test for attribute-staged-apply.py. |
| `orchestrator/test_autonomy_gate.py` | — | Spec 31 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7 self-test for autonomy_gate.py. |
| `orchestrator/test_check_no_mirror_baseline.py` | — | pytest suite for the --baseline / --update-baseline |
| `orchestrator/test_critical_fix_verification.py` | — | Spec 31 Phase 5f.1 self-test for critical-fix-verification.py. |
| `orchestrator/test_css_router.py` | — | Unit tests for css_router.py — Spec 16 §FR6 four-destination router. |
| `orchestrator/test_functionality_bulk_apply.py` | — | Spec 31 Phase 5b.7 self-test for functionality-bulk-apply.py. |
| `orchestrator/test_lingua_franca.py` | — | Spec 31 Phase 5c.2 + 5c.3 self-test for lingua_franca.py. |
| `orchestrator/test_media_sideload.py` | — | Spec 31 Phase 5b.5 self-test for media-sideload.py. |
| `orchestrator/test_mutex.py` | — | Spec 31 Phase 5b.4 self-test for mutex.py. |
| `orchestrator/test_orchestrator_main.py` | — | Spec 31 Phase 5e.8 self-test for orchestrator_main.py. |
| `orchestrator/test_preflight_chain.py` | — | Spec 31 Phase 5e.1 + 5e.2 self-test for preflight_chain.py. |
| `orchestrator/test_register_patterns.py` | — | Spec 31 Phase 6 Step 0 -- register_patterns.py contract tests. |
| `orchestrator/test_stage1_boundary_hook.py` | — | Spec 31 Phase 5c.4 self-test for stage1_boundary_hook. |
| `orchestrator/test_stage_attribute_promotion.py` | — | Tests for stage_attribute_promotion.py — P2.ii operator-driven promotion CLI. |
| `orchestrator/test_staged_merge.py` | — | Spec 31 Phase 5e.3 self-test for staged_merge.py. |
| `orchestrator/test_staged_output.py` | — | Spec 31 Phase 5b.1 self-test for staged_output.py. |
| `orchestrator/test_validate_stage_artifact.py` | — | Spec 31 Phase 5b.2 self-test for validate-stage-artifact.py. |
| `orchestrator/test_wp_integration.py` | — | Spec 31 Phase 5d.7 + 5d.9 + 5d.10 self-test for wp_integration.py. |
| `orchestrator/trace.py` | — | - Structured trace-logger for /sgs-clone pipeline runs. |
| `orchestrator/upload_and_patch.py` | — | One-shot: upload all mockup images to sandybrown WP Media Library + |
| `orchestrator/validate-stage-artifact.py` | — | - Spec 31 Phase 5b.2 per-stage validator. |
| `orchestrator/visual_qa_capture.py` | — | - Stage 8 autonomy-gate capture stub. |
| `orchestrator/wp_integration.py` | — | - Spec 31 Phase 5d.7 + 5d.9 + 5d.10. |
| `parity/computed-parity.js` | — | Spec 20 v1.1.0 (Clone Fidelity Measurement). The number tracks VISIBLE fidelity and PAIRS with Bean's eye — it never closes alone (Spec 31 §7b /… |
| `parity/extract-css-diff.js` | — | THE STANDARD first step for matching a clone section to its reference |
| `pattern-classify.py` | — | SGS Pattern Classifier |
| `pattern-fingerprint.py` | — | Compute a deterministic fingerprint for an HTML pattern + CSS bundle. |
| `pattern-register.py` | — | Pattern registration orchestrator — Step 6 of /sgs-clone pipeline. 2026-05-06. |
| `placement-reach.py` | npm | how far does THE PLACEMENT RULE actually reach? |
| `playwright-fetch.js` | — | Usage: node playwright-fetch.js <url> Writes the fully-rendered HTML to stdout. Used by sgs-update-v2.py Stage 2 Source 4 as a fallback when urllib… |
| `preflight-acceptance.php` | — | SGS Preflight Acceptance Test — FR-27-PREFLIGHT / SEC-5 Empirical Gate |
| `product-search-leak-check.php` | — | SGS Product Search — Behavioural Leak Test (FR-30-5 Named Enforcement Runner). |
| `prove-selftest-can-fail.py` | — | Prove a detector's --self-test is LOAD-BEARING, not decorative. |
| `push-theme-snapshot.py` | — | Deploy a per-client theme.json snapshot to a WP site. |
| `qa/capture-native-colour-ui.js` | — | Visual verification for the native-colour-ui migration (16 blocks). |
| `qa/capture-ncui-final3.js` | — | The last 3 native-colour-ui blocks — the ones page-content probing could not reach. |
| `qa/capture-ncui-remainder.js` | — | Visual capture for the 9 native-colour-ui blocks NOT covered by reports/visual-diff/native-colour-ui-2026-08-22.md. |
| `qa/capture-ncui-templateparts.js` | — | The final 2 native-colour-ui blocks, verified IN THEIR REAL CONTEXT. |
| `qa/check-colour-editor-roundtrip.js` | — | QA Gate C — the EDITOR half. |
| `qa/probe-native-colour-ui-close.js` | — | intent_capture probe for the native-colour-ui class closure (2026-08-23). |
| `qa/probe-row-gradient.js` | — | Set an attribute on every instance of one block inside a header/footer CPT, measure the live paint, and restore. |
| `recogniser/__init__.py` | — | SGS clone-pipeline recogniser modules. |
| `recogniser/attribute-gap-writer.py` | — | - Spec 31 Phase 5a.4 attribute-gap writes. |
| `recogniser/bucket-c-classifier.py` | — | - Spec 31 Phase 5a.2 (FR10). |
| `recogniser/confidence-matrix.py` | — | - Stage 2 of /sgs-clone pipeline. |
| `recogniser/functionality-gap-detector.py` | — | - Spec 31 Phase 5a.3 (FR8 functionality leg). |
| `recogniser/gap-review-report.py` | — | - Spec 31 Phase 5a.5 operator-review surface. |
| `recogniser/leftover-bucket-router.py` | — | - Stage 9 leftover routing. |
| `recogniser/per-section-convention-voter.py` | — | - Stage 1 of /sgs-clone pipeline. |
| `recogniser/simple_html_review_report.py` | — | - Stage 9 operator-review HTML render. |
| `recogniser/test_attribute_gap_writer.py` | — | Spec 31 Phase 5a.4 self-test for attribute-gap-writer.py. |
| `recogniser/test_bucket_c_classifier.py` | — | Spec 31 Phase 5a.2 self-test for bucket-c-classifier.py. |
| `recogniser/test_confidence_threshold.py` | — | - Verify Stage 2 confidence threshold enforcement. |
| `recogniser/test_functionality_gap_detector.py` | — | Spec 31 Phase 5a.3 self-test for functionality-gap-detector.py. |
| `recogniser/test_gap_review_report.py` | — | Spec 31 Phase 5a.5 self-test for gap-review-report.py. |
| `recogniser/test_leftover_bucket_router.py` | — | Spec 31 Phase 5a.1 self-test for leftover-bucket-router.py. |
| `recogniser/test_per_section_convention_voter.py` | — | Self-test for per-section-convention-voter.py — covers vote_block_slug. |
| `remove-vacuous-style-engine-guard.py` | build | Delete the vacuous `function_exists( 'wp_style_engine_get_styles' )` guard. |
| `row-fit-sweep.mjs` | — | row-fit-sweep — reusable Playwright width-sweep verification harness. |
| `run-motion-fx-generators.js` | build | motion-fx generator chain (seed-motion-fx-registry.py, generate-fx-effects-php.py, generate-fx-qualifying-blocks.py). |
| `seed-48-sku-fixture-v2.php` | — | SGS 48-SKU Fixture — v2 ADDITIVE presentation-meta seeder (Spec 27 Phase 2). |
| `seed-48-sku-fixture.php` | — | SGS 48-SKU WooCommerce Fixture — Developer Script |
| `seed-composition-roles.py` | — | idempotent corrections to block_composition.composition_role. |
| `seed-mamas-products.php` | — | Seed script — Mama's Munches reference products (Spec 24 Phase A). |
| `seed-motion-fx-registry.py` | — | idempotent editorial seeder for the Spec 38 motion system. |
| `sgs-clone-orchestrator.py` | — | sgs-clone orchestrator (Phase 7 rewire). |
| `sgs-update-v2.py` | — | 13-stage holistic refresh of the SGS framework knowledge base. |
| `shared_utils.py` | — | Shared, zero-dependency utilities for the SGS clone scripts. |
| `surveys/audit-css-element-drift.py` | — | Audit `block_attributes.css_element` against each block's own element manifest. |
| `surveys/census-tier-siblings.sh` | — | Re-runnable census of per-device tier-sibling attribute instances |
| `surveys/check-control-parity-live.js` | — | property, against a native control on the same page. |
| `surveys/check-image-controls-support.py` | build | Standing defence for the `imageControls` "declared-but-unverified capability" |
| `surveys/compare-reach-depth.py` | — | Does resolution DEPTH change the answer? Measure, do not assume. |
| `surveys/extract-native-contracts.py` | — | Extract the REQUIRED props (and the __next* opt-ins) from Gutenberg's own |
| `surveys/fetch-native-control-contracts.sh` | — | Fetch the CANONICAL prop contract for each WordPress core control primitive straight from the Gutenberg source, so a golden describes the real… |
| `surveys/lib/control-detection.js` | — | Answers ONE question per (block, attribute): **can a client set this?** |
| `surveys/lib/php-kind-consumption.js` | — | BRANCH-AWARE CONSUMPTION ANALYSER for the shared container wrapper. |
| `surveys/lib/wrapper-capability-selftest.js` | — | Self-test for the wrapper-capability census. |
| `surveys/survey-background-colour-support.py` | build | Track A completion audit — native colour/gradient background support. |
| `surveys/survey-box-controls.py` | npm | "--survey" census of the BOX (4-side) and BORDER |
| `surveys/survey-colour-controls.py` | npm | Phase 0.0 "--survey" census of the COLOUR property |
| `surveys/survey-colour-coverage.py` | npm | census of which PAINTED colours across sgs/ blocks |
| `surveys/survey-control-gaps.py` | npm | the SHOULD-BE census: a control weaker than its value. |
| `surveys/survey-control-mounts.py` | npm | Re-measure every control-population figure Spec 35 Part O asserts. |
| `surveys/survey-control-parity.py` | build | do SGS inspector controls look like NATIVE WordPress? |
| `surveys/survey-dead-css.py` | npm | the DEAD-CSS census: a selector whose precondition the |
| `surveys/survey-experimental-imports.js` | build | ONE DETECTOR, THREE MODES (D542, Bean-locked): |
| `surveys/survey-extension-usage.py` | — | Phase 2.1 usage derivation — the prerequisite before inverting a universal |
| `surveys/survey-golden-conformance.js` | npm | WHAT THIS IS FOR. `golden-controls.json` states what shape a control must have. Rule 31 enforces the colour contract and reports 409 findings.… |
| `surveys/survey-inspector-surface.js` | npm | inspector surface across all 83 sgs/ blocks, per D543/D544. |
| `surveys/survey-length-controls.py` | npm | Phase 0.0 "--survey" census of the LENGTH property |
| `surveys/survey-native-supports.py` | npm | Phase 2.2 census — native WordPress `supports` capability routing. |
| `surveys/survey-responsive-shape.py` | npm | the responsive STORAGE-SHAPE census. |
| `surveys/survey-typography-controls.py` | npm | Phase 0.0 "--survey" census of the TYPOGRAPHY |
| `surveys/survey-wrapper-capability.js` | — | PHASE 0 CENSUS for the shared-wrapper decomposition. |
| `sync-business-info.py` | — | Tier-1 business-data extractor + pusher (D325). |
| `sync-container-wrapping-blocks.py` | — | Tracks every SGS block that is container-bearing (wraps children via InnerBlocks, |
| `test-pack-pricing-cascade.php` | — | Standalone cascade-resolver test runner for Spec 28 P3 (FR-28-6). |
| `theme-extractor/colour.py` | — | colour parsing + CIEDE2000 dedup for the Spec 33 extractor. |
| `theme-extractor/derive.py` | — | Pass B: PROVISIONAL palette derivation for drafts that declare NO :root tokens (FR-33-5). |
| `theme-extractor/extract.py` | — | the Spec 33 draft global-styles extractor (CLI orchestrator). |
| `theme-extractor/measure.js` | — | THE IRON LAW (Spec 33 FR-33-1/33-3): the value the extractor ships is always the COMPUTED value on a really-rendered node — never a raw source… |
| `theme-extractor/palette.py` | — | build the theme colour palette from draft tokens (Spec 33 FR-33-1/2/9). |
| `theme-extractor/presets.py` | — | button presets, layout, and font families for the Spec 33 extractor. |
| `theme-extractor/roles.py` | build | colour ROLE inference by usage-context (Spec 33 FR-33-2). |
| `theme-extractor/schema_validate.py` | — | theme.json v3 structural validation (Spec 33 FR-33-7). |
| `theme-extractor/token_map.py` | — | declared-CSS parsing for the Spec 33 extractor (tinycss2, not regex). |
| `theme-extractor/typography.py` | — | base + heading typography from COMPUTED nodes (Spec 33 FR-33-3, the drift-killer). |
| `uimax-tools/enrich-db.py` | — | SGS Framework DB Enrichment — 10 targets in one idempotent pass. |
| `uimax-tools/seed-block-compositions.py` | — | Seed `patterns.block_composition` JSON column from theme pattern files. |
| `uimax-tools/seed-slot-synonyms.py` | — | Seed sgs-framework.db `slots` table with BEM element → standalone_block mappings |
| `uimax-tools/sgs-update-uimax-sync.py` | — | sgs-update Stage 3 + Stage 4 — uimax sync extension. |
| `uimax-tools/test_uimax_write_validator.py` | — | Tests for uimax-write-validator.py — Rosetta Stone discipline (Row 213) only. |
| `uimax-tools/uimax-write-validator.py` | — | Pre-write validator for uimax tables. |
| `uimax-tools/uimax_write.py` | — | Validate-then-write helper for uimax tables. |
| `value-matcher/inheritance.py` | — | Default-inheritance lookup module. |
| `value-matcher/match.py` | — | Token value-matcher for the SGS Deterministic Draft-to-SGS Converter pipeline. |
| `visual-report-sha.py` | commit | Content hash binding a visual-diff report to the change it actually describes. |
| `wp-pre-merge-gate.py` | commit | Pre-merge validation gate for SGS WordPress plugin changes. |

#### `scripts/` — 18 scripts

| Script | Wired | Purpose (its own words) |
|---|---|---|
| `apply-block-attrs-batch.js` | — | One-off companion to wp-update-block-attrs.js for the Indus homepage attribute-mirror task (2026-07-16). Handles the case wp-update-block-attrs.js… |
| `brand-palette-sampler.py` | — |  |
| `colour-parity-audit.js` | — | Colour Parity Audit — automated comparison between mockup HTML brief and SGS variation JSON. |
| `css-pattern-audit.js` | commit | CSS pattern audit — static analysis for risky patterns in deployed/built CSS. |
| `font-source-audit.js` | — | Font source audit — static analysis for external CDN URLs in theme.json fontFace declarations. |
| `global-styles-reset.js` | — | wp_global_styles reset + reapply. |
| `lib/oldshape-mappings.js` | — | wp-migrate-oldshape-blocks.js (Track B content restore, 2026-07-15). |
| `lint-naming-conventions.py` | — | CI linter for the SGS WordPress Framework naming conventions. |
| `lint-patterns-for-personal-data.py` | — | Lint SGS pattern PHP files for hardcoded personal data. |
| `qc-anti-cheat.py` | — | Static-analysis gate that fails on converter-cheating patterns. |
| `qc-correctness-regression.py` | — | Mechanical regression checker for the SGS clone pipeline. |
| `qc_anti_cheat_checks.py` | — | Cheat-pattern definitions, AST visitor, and file analysers. |
| `render-mobile-override-audit.js` | — | Render.php inline-vs-media audit. |
| `sgs-block-grep.py` | — | SGS block-name search utility — fixes the block-name-search-blindspot failure mode. |
| `verify-restored-page.js` | — | The Track B definition-of-done requires the restore to be proven on the REAL page via computed DOM (R-31-11), not on assertion output or the emitted… |
| `wc-pages-responsive-audit.js` | — | FR-30-11 — WooCommerce page-type responsive + budget verification gate. |
| `wp-migrate-oldshape-blocks.js` | — | block migrations (Track B, 2026-07-15), through the BLOCK EDITOR ONLY. |
| `wp-update-block-attrs.js` | — | Reusable Playwright helper that updates a block's attributes on a live WordPress post by going through the editor — using wp.blocks.createBlock(name… |

<!-- TOOLING-CATALOGUE:END -->

---

## Known Gotchas

| Gotcha | Detail |
|--------|--------|
| **SCP `-r` creates nested directories** | `scp -r theme/sgs-theme remote:path/sgs-theme` creates `sgs-theme/sgs-theme/`. This is one of several reasons hand-rolled deploys are retired — use `build-deploy.py`. |
| **Hostinger caches CSS aggressively** | Bump version in `style.css` after CSS changes to bust cache. Theme version is the query string for all enqueued styles. |
| **`--webpack-copy-php` flag** | Build script copies `render.php` to `build/` automatically. Dynamic blocks won't render without this. |
| **`--experimental-modules` flag** | Required in build/start scripts for `viewScriptModule` in block.json. |
| **Deprecations NOT used (D270/D271/D293)** | ~~Changing a static block's `save.js` requires a deprecation~~ — **retired policy.** `deprecated.js` is deleted plugin-wide and version bumps are forbidden pre-production. On a schema change, rebuild / re-clone the content, or use the Site Editor's "Attempt Block Recovery". Do NOT author a deprecation. |
| **SSH remote variable expansion** | Use single quotes for outer string when running `ssh hd '...'` so `$WP` expands on server. Double quotes expand locally. |
| **~~Tar deploy: delete before move~~** | **RETIRED — this "fix" IS the D336 outage.** `rm -rf $WP/plugins/sgs-blocks` before the extract succeeds leaves the site with no plugin if anything fails in between; on 2026-07-14 it took two client sites down ~2.5h. `build-deploy.py` handles ordering safely. Never hand-roll this. |
| **Tar `--exclude='src'` breaks vendor** | Too broad — strips `vendor/*/src/` subdirectories. `build-deploy.py` already carries the correct excludes; this is background, not a recipe to copy. |
| **WP-CLI inline PHP escaping** | `wp eval '...'` breaks on shell special chars. Reliable fallback: write to `/tmp/script.php` with `cat << 'PHPEOF'`, scp to server, `wp eval-file ~/script.php`, then `rm`. |
| **`parse_blocks()` is shallow** | Only returns top-level blocks. Finding nested blocks requires a recursive function walking `$b['innerBlocks']`. |
| **Hostinger error logs** | Live at `~/.logs/error_log_<domain>`, not `wp-content/debug.log` (often stale). |
| **WP_DEBUG_DISPLAY contamination** | `WP_DEBUG_DISPLAY=true` injects PHP Notice banners that shift every section vertically, inflating pixel-diff 15-40pts. Set false on staging. |

---

## 2026-05-20 — Phase 1 four-destination CSS router architectural rewrite (Spec 22 §FR-22-5)

13 commits (`8ceb8787` → `bb3de12b`) added:

**New modules:**
- `plugins/sgs-blocks/scripts/orchestrator/css_router.py` (661 LOC) — Spec 22 §FR-22-5 four-destination router (D0/D1/D2/D3)
- `plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py` — operator-driven CLI for promoting gap candidates into block.json schema
- `plugins/sgs-blocks/scripts/orchestrator/essence_match_detector.py` — cv2 walker tier for essence-match-with-differences → block-variation emit
- `plugins/sgs-blocks/includes/class-variation-rest.php` — sgs/v1/active-variation REST endpoint
- `plugins/sgs-blocks/includes/variations/class-sgs-block-variations.php` — PHP variations loader
- `.claude/hooks/no-header-footer-block.py` — PostToolUse hook for chrome-block prevention

**New per-run artefacts:** `css-d1-assignments.json` (D1 sidecar), per-section `token_resolutions` + `essence_matches` in `extract.json`, `scaffold_quality_report` in `stage-9b.json`.

**Cross-references:**
- Full pipeline changes: `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` Appendix D (stage index; the old `cloning-pipeline-flow.md` was archived 2026-07-28)
- Spec compliance + known gaps: `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §2-§3
- Architectural decisions: `.claude/decisions.md` D1-D6
- Honest-path council finding: `.claude/memory/reports-archive/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md`
