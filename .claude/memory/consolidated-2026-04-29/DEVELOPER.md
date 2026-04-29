# Developer Guide — SGS Framework

Technical reference for developers working on the SGS theme and blocks plugin.

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
│   ├── styles/
│   │   └── indus-foods.json     # Client style variation overrides
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
└── ARCHITECTURE.md              # Architectural decisions and block inventory
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

Style variations let the same theme serve different clients. They live in `theme/sgs-theme/styles/` as JSON files.

### 1. Create the variation file

```powershell
cd theme/sgs-theme/styles
# Create: my-client.json
```

The JSON structure mirrors `theme.json` but only needs to include the values you want to override:

```json
{
    "$schema": "https://schemas.wp.org/trunk/theme.json",
    "version": 3,
    "title": "My Client",
    "settings": {
        "color": {
            "palette": [
                {
                    "slug": "primary",
                    "color": "#123456",
                    "name": "Primary"
                }
            ]
        }
    },
    "styles": {
        "typography": {
            "fontFamily": "var:preset|font-family|heading"
        }
    }
}
```

WordPress merges this with `theme.json` at runtime — you only need to specify what changes.

### 2. Add variation-specific CSS (if needed)

If the variation needs CSS that cannot be expressed via tokens (e.g. decorative images, complex hover states), add it in `functions.php` gated on the active variation:

```php
function enqueue_style_variation_extras(): void {
    $variation = get_theme_mod( 'active_theme_style', '' );

    if ( 'my-client' === $variation ) {
        $css = "
            /* My Client specific overrides */
            .sgs-hero { border-radius: 0; }
        ";
        wp_add_inline_style( 'sgs-utilities', $css );
    }
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_style_variation_extras' );
```

Do not add client-specific CSS to `style.css` or any unconditional stylesheet — it would load on every site using the theme.

### 3. Font preloading

If the variation uses different fonts, add preload logic in `functions.php`:

```php
function preload_fonts(): void {
    $variation = get_theme_mod( 'active_theme_style', '' );

    if ( 'my-client' === $variation ) {
        $fonts = [ 'my-font-variable.woff2' ];
    } else {
        $fonts = [ 'inter-variable-latin.woff2' ];
    }

    foreach ( $fonts as $font ) {
        printf(
            '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
            esc_url( get_theme_file_uri( 'assets/fonts/' . $font ) )
        );
    }
}
```

Place font WOFF2 files in `theme/sgs-theme/assets/fonts/`.

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
└── index.js                  # Imports all four extensions
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

The dev site is `palestine-lives.org`. All changes are deployed here first.

**Full deployment (theme + plugin):**

```powershell
cd plugins/sgs-blocks ; npm run build

scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/ ;

scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/
```

**Plugin only:**

```powershell
cd plugins/sgs-blocks ; npm run build ;

scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/
```

**Theme only:**

```powershell
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/
```

**After every deployment — clear caches:**

```powershell
# Clear LiteSpeed page cache
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*" ;

# Reset PHP OPcache (CLI and web are separate pools)
ssh hd "echo '<?php opcache_reset(); echo ""ok"";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" ;
curl -s https://palestine-lives.org/op-reset-tmp.php ;
ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

**Run all commands from the project root:** `C:\Users\Bean\Projects\small-giants-wp`

### SSH host alias

The `hd` SSH alias points to the Hostinger shared hosting server. It is configured in `~/.ssh/config`. See `TOOLS.md` in the workspace for the connection details.

### What NOT to deploy

- `node_modules/` — not needed on the server
- `src/` — compiled output from `build/` is what WordPress uses
- `.gitignore`, `package.json`, `package-lock.json` — server does not need these

---

## Environment and tools

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v22.18.0 | Build tooling only — not on the server |
| @wordpress/scripts | 30.x | Handles webpack, eslint, format |
| WordPress | 6.7+ | Block theme, no classic editor |
| PHP | 8.0+ | |
| Shell | PowerShell | Use `;` not `&&` to chain commands |

### Linting and formatting

```powershell
cd plugins/sgs-blocks

# Lint JavaScript
npm run lint:js

# Lint CSS
npm run lint:css

# Auto-format
npm run format
```

### Git workflow

All development is on the `feature/indus-foods-homepage` branch. Commit regularly with descriptive messages. Use the repo root as the working directory for all git commands:

```powershell
cd C:\Users\Bean\Projects\small-giants-wp

git add .
git commit -m "feat: add my-block block"
git push
```

No CI/CD pipeline — deployment is manual via `scp` as described above.
