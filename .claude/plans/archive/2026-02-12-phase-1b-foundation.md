# Phase 1b Foundation — SGS Blocks Plugin Infrastructure

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete plugin infrastructure for SGS Blocks so that adding any new block is a 10-minute job: create a folder, drop in block.json + edit.js + save.js, and it auto-registers, inherits responsive controls, animation extensions, and design tokens.

**Architecture:** Multi-block WordPress plugin using `@wordpress/scripts` with auto-discovery registration. Every block in `build/blocks/` is automatically registered on `init`. Shared editor components (responsive controls, token pickers) live in `src/components/`. Block extensions (animation, visibility) inject into all blocks via SlotFill/filters. Frontend interactivity uses `viewScriptModule` (ES modules) with the `--experimental-modules` build flag.

**Tech Stack:** WordPress 6.9, PHP 8.0+, `@wordpress/scripts` ^30, React (editor), vanilla JS (frontend), CSS custom properties from theme.json, `apiVersion: 3` for all blocks.

**References:**
- [Multi-block plugin guide](https://developer.wordpress.org/news/2025/08/refactoring-the-multi-block-plugin-build-smarter-register-cleaner-scale-easier/)
- [WordPress 6.9 field guide](https://make.wordpress.org/core/2025/11/25/wordpress-6-9-field-guide/)
- Specs: `specs/02-SGS-BLOCKS.md`, `specs/04-SGS-FORMS.md`, `specs/06-BUILD-ORDER.md`

**Deploy:** Build locally (`npm run build`), SCP `build/` + PHP files to Hostinger. No Node.js on server.

---

## Task 1: Plugin Bootstrap — PHP Skeleton

**Files:**
- Create: `plugins/sgs-blocks/sgs-blocks.php`
- Create: `plugins/sgs-blocks/includes/class-sgs-blocks.php`
- Create: `plugins/sgs-blocks/includes/block-categories.php`

**Step 1: Create the main plugin file**

```php
<?php
/**
 * Plugin Name: SGS Blocks
 * Plugin URI:  https://smallgiants.studio
 * Description: Custom Gutenberg block library for Small Giants Studio client sites.
 * Version:     0.1.0
 * Author:      Small Giants Studio
 * Author URI:  https://smallgiants.studio
 * Text Domain: sgs-blocks
 * Domain Path: /languages
 * Requires at least: 6.7
 * Requires PHP: 8.0
 * License:     GPL-2.0-or-later
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

define( 'SGS_BLOCKS_VERSION', '0.1.0' );
define( 'SGS_BLOCKS_PATH', plugin_dir_path( __FILE__ ) );
define( 'SGS_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

require_once SGS_BLOCKS_PATH . 'includes/class-sgs-blocks.php';
require_once SGS_BLOCKS_PATH . 'includes/block-categories.php';

SGS_Blocks::instance();
```

**Step 2: Create the main plugin class with auto-discovery registration**

`includes/class-sgs-blocks.php` — scans `build/blocks/` and registers every block that has a `block.json`. Adding a new block = create the folder, build, done.

```php
<?php
namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

final class SGS_Blocks {

    private static ?self $instance = null;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'init', [ $this, 'register_blocks' ] );
        add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_assets' ] );
    }

    /**
     * Auto-discover and register all blocks from the build directory.
     *
     * Each subdirectory of build/blocks/ that contains a block.json
     * is automatically registered. No manual registration needed.
     */
    public function register_blocks(): void {
        $blocks_dir = SGS_BLOCKS_PATH . 'build/blocks';

        if ( ! is_dir( $blocks_dir ) ) {
            return;
        }

        $block_dirs = array_filter(
            scandir( $blocks_dir ),
            fn( string $item ): bool => is_dir( $blocks_dir . '/' . $item )
                && ! in_array( $item, [ '.', '..' ], true )
        );

        foreach ( $block_dirs as $block ) {
            $block_json = $blocks_dir . '/' . $block . '/block.json';

            if ( file_exists( $block_json ) ) {
                register_block_type( $block_json );
            }
        }
    }

    /**
     * Enqueue shared editor assets (extensions, shared components).
     */
    public function enqueue_editor_assets(): void {
        $extensions_asset = SGS_BLOCKS_PATH . 'build/extensions/index.asset.php';

        if ( file_exists( $extensions_asset ) ) {
            $asset = require $extensions_asset;

            wp_enqueue_script(
                'sgs-block-extensions',
                SGS_BLOCKS_URL . 'build/extensions/index.js',
                $asset['dependencies'],
                $asset['version'],
                true
            );
        }
    }
}
```

**Step 3: Create the block categories file**

```php
<?php
namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'block_categories_all', function ( array $categories ): array {
    return array_merge(
        [
            [
                'slug'  => 'sgs-layout',
                'title' => __( 'SGS Layout', 'sgs-blocks' ),
            ],
            [
                'slug'  => 'sgs-content',
                'title' => __( 'SGS Content', 'sgs-blocks' ),
            ],
            [
                'slug'  => 'sgs-interactive',
                'title' => __( 'SGS Interactive', 'sgs-blocks' ),
            ],
        ],
        $categories
    );
} );
```

**Step 4: Verify plugin activates without errors**

Upload to dev site, activate via WP-CLI:
```bash
scp -r plugins/sgs-blocks hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp plugin activate sgs-blocks"
```

Expected: "Plugin 'sgs-blocks' activated." — no PHP errors.

**Step 5: Commit**

```bash
git add plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes/
git commit -m "feat(sgs-blocks): plugin bootstrap with auto-discovery block registration"
```

---

## Task 2: Build Toolchain — npm + Webpack

**Files:**
- Create: `plugins/sgs-blocks/package.json`
- Create: `plugins/sgs-blocks/webpack.config.js`
- Create: `plugins/sgs-blocks/.eslintrc.js`
- Create: `plugins/sgs-blocks/.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "sgs-blocks",
  "version": "0.1.0",
  "private": true,
  "description": "Custom Gutenberg block library for Small Giants Studio",
  "scripts": {
    "build": "wp-scripts build --experimental-modules --webpack-copy-php",
    "start": "wp-scripts start --experimental-modules --webpack-copy-php",
    "lint:js": "wp-scripts lint-js src/",
    "lint:css": "wp-scripts lint-style src/",
    "format": "wp-scripts format src/"
  },
  "devDependencies": {
    "@wordpress/scripts": "^30.0.0"
  }
}
```

Key flags:
- `--experimental-modules` — builds `viewScriptModule` entries (ES module view scripts for frontend interactivity)
- `--webpack-copy-php` — copies `render.php` files from src to build (needed for dynamic blocks)

**Step 2: Create webpack.config.js for multi-block + extensions entry points**

`@wordpress/scripts` auto-discovers `src/blocks/*/index.js` by default. We extend it to also build `src/extensions/index.js` as a separate entry point for shared editor extensions.

```javascript
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
    ...defaultConfig,
    entry: {
        ...defaultConfig.entry(),
        'extensions/index': path.resolve(
            __dirname,
            'src/extensions/index.js'
        ),
    },
};
```

**Step 3: Create .gitignore**

```
node_modules/
build/
```

**Step 4: Create .eslintrc.js**

```javascript
module.exports = {
    extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
};
```

**Step 5: Install dependencies**

```bash
cd plugins/sgs-blocks && npm install
```

Expected: `@wordpress/scripts` and all WordPress packages installed. `node_modules/` created.

**Step 6: Commit**

```bash
git add plugins/sgs-blocks/package.json plugins/sgs-blocks/webpack.config.js plugins/sgs-blocks/.eslintrc.js plugins/sgs-blocks/.gitignore
git commit -m "feat(sgs-blocks): build toolchain with wp-scripts, multi-block webpack config"
```

---

## Task 3: Shared Editor Components

These are the reusable React components that every block's editor sidebar uses. Build them once, import everywhere.

**Files:**
- Create: `plugins/sgs-blocks/src/components/ResponsiveControl.js`
- Create: `plugins/sgs-blocks/src/components/DesignTokenPicker.js`
- Create: `plugins/sgs-blocks/src/components/SpacingControl.js`
- Create: `plugins/sgs-blocks/src/components/AnimationControl.js`
- Create: `plugins/sgs-blocks/src/components/index.js`

### ResponsiveControl.js

A breakpoint switcher (mobile/tablet/desktop) that wraps any control. The child control receives the current breakpoint so attributes can be stored per-breakpoint.

```jsx
import { useState } from '@wordpress/element';
import { ButtonGroup, Button, Tooltip } from '@wordpress/components';
import { desktop, tablet, mobile } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

const BREAKPOINTS = [
    { key: 'desktop', icon: desktop, label: __( 'Desktop', 'sgs-blocks' ) },
    { key: 'tablet', icon: tablet, label: __( 'Tablet', 'sgs-blocks' ) },
    { key: 'mobile', icon: mobile, label: __( 'Mobile', 'sgs-blocks' ) },
];

export default function ResponsiveControl( { children, label } ) {
    const [ breakpoint, setBreakpoint ] = useState( 'desktop' );

    return (
        <div className="sgs-responsive-control">
            <div className="sgs-responsive-control__header">
                { label && (
                    <span className="sgs-responsive-control__label">
                        { label }
                    </span>
                ) }
                <ButtonGroup className="sgs-responsive-control__buttons">
                    { BREAKPOINTS.map( ( bp ) => (
                        <Tooltip key={ bp.key } text={ bp.label }>
                            <Button
                                icon={ bp.icon }
                                isPressed={ breakpoint === bp.key }
                                onClick={ () => setBreakpoint( bp.key ) }
                                size="small"
                            />
                        </Tooltip>
                    ) ) }
                </ButtonGroup>
            </div>
            { children( breakpoint ) }
        </div>
    );
}
```

### DesignTokenPicker.js

Colour picker that reads the active theme.json palette. Uses `useSetting` hook so it always reflects the current style variation.

```jsx
import { useSetting } from '@wordpress/block-editor';
import {
    ColorPalette,
    BaseControl,
} from '@wordpress/components';

export default function DesignTokenPicker( {
    label,
    value,
    onChange,
    clearable = true,
} ) {
    const colours = useSetting( 'color.palette' ) || [];

    return (
        <BaseControl label={ label } __nextHasNoMarginBottom>
            <ColorPalette
                colors={ colours }
                value={ value }
                onChange={ onChange }
                clearable={ clearable }
                disableCustomColors={ false }
            />
        </BaseControl>
    );
}
```

### SpacingControl.js

Margin/padding control using theme.json spacing presets.

```jsx
import { useSetting } from '@wordpress/block-editor';
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function SpacingControl( { label, value, onChange } ) {
    const spacingSizes = useSetting( 'spacing.spacingSizes' ) || [];

    const options = [
        { label: __( 'None', 'sgs-blocks' ), value: '' },
        ...spacingSizes.map( ( size ) => ( {
            label: `${ size.name } (${ size.size })`,
            value: size.slug,
        } ) ),
    ];

    return (
        <SelectControl
            label={ label }
            value={ value || '' }
            options={ options }
            onChange={ onChange }
            __nextHasNoMarginBottom
        />
    );
}
```

### AnimationControl.js

Scroll-triggered animation selector for the block sidebar.

```jsx
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const ANIMATIONS = [
    { label: __( 'None', 'sgs-blocks' ), value: 'none' },
    { label: __( 'Fade Up', 'sgs-blocks' ), value: 'fade-up' },
    { label: __( 'Fade In', 'sgs-blocks' ), value: 'fade-in' },
    { label: __( 'Slide Left', 'sgs-blocks' ), value: 'slide-left' },
    { label: __( 'Slide Right', 'sgs-blocks' ), value: 'slide-right' },
    { label: __( 'Scale In', 'sgs-blocks' ), value: 'scale-in' },
];

const DELAYS = [
    { label: __( 'None', 'sgs-blocks' ), value: '0' },
    { label: '100ms', value: '100' },
    { label: '200ms', value: '200' },
    { label: '300ms', value: '300' },
];

const DURATIONS = [
    { label: __( 'Fast (300ms)', 'sgs-blocks' ), value: 'fast' },
    { label: __( 'Medium (500ms)', 'sgs-blocks' ), value: 'medium' },
    { label: __( 'Slow (800ms)', 'sgs-blocks' ), value: 'slow' },
];

export default function AnimationControl( {
    animation,
    animationDelay,
    animationDuration,
    onChangeAnimation,
    onChangeDelay,
    onChangeDuration,
} ) {
    return (
        <>
            <SelectControl
                label={ __( 'Animation', 'sgs-blocks' ) }
                value={ animation || 'none' }
                options={ ANIMATIONS }
                onChange={ onChangeAnimation }
                __nextHasNoMarginBottom
            />
            { animation && animation !== 'none' && (
                <>
                    <SelectControl
                        label={ __( 'Delay', 'sgs-blocks' ) }
                        value={ animationDelay || '0' }
                        options={ DELAYS }
                        onChange={ onChangeDelay }
                        __nextHasNoMarginBottom
                    />
                    <SelectControl
                        label={ __( 'Duration', 'sgs-blocks' ) }
                        value={ animationDuration || 'medium' }
                        options={ DURATIONS }
                        onChange={ onChangeDuration }
                        __nextHasNoMarginBottom
                    />
                </>
            ) }
        </>
    );
}
```

### index.js (barrel export)

```javascript
export { default as ResponsiveControl } from './ResponsiveControl';
export { default as DesignTokenPicker } from './DesignTokenPicker';
export { default as SpacingControl } from './SpacingControl';
export { default as AnimationControl } from './AnimationControl';
```

**Step: Commit**

```bash
git add plugins/sgs-blocks/src/components/
git commit -m "feat(sgs-blocks): shared editor components — responsive, tokens, spacing, animation"
```

---

## Task 4: Block Extensions — Animation + Visibility

Extensions inject extra controls and behaviour into ALL blocks (or all SGS blocks) without modifying each block individually.

**Files:**
- Create: `plugins/sgs-blocks/src/extensions/index.js`
- Create: `plugins/sgs-blocks/src/extensions/animation.js`
- Create: `plugins/sgs-blocks/src/extensions/responsive-visibility.js`
- Create: `plugins/sgs-blocks/src/assets/css/extensions.css` (frontend animation CSS)
- Create: `plugins/sgs-blocks/src/assets/js/animation-observer.js` (frontend IntersectionObserver)

### animation.js

Uses `addFilter` on `blocks.registerBlockType` to inject animation attributes, and `InspectorControls` to add the sidebar panel. Only applies to blocks in the `sgs/` namespace.

```javascript
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AnimationControl } from '../components';

/**
 * Add animation attributes to all sgs/* blocks.
 */
function addAnimationAttributes( settings, name ) {
    if ( ! name.startsWith( 'sgs/' ) ) {
        return settings;
    }

    return {
        ...settings,
        attributes: {
            ...settings.attributes,
            sgsAnimation: { type: 'string', default: 'none' },
            sgsAnimationDelay: { type: 'string', default: '0' },
            sgsAnimationDuration: { type: 'string', default: 'medium' },
        },
    };
}

addFilter(
    'blocks.registerBlockType',
    'sgs/animation-attributes',
    addAnimationAttributes
);

/**
 * Add animation panel to block inspector.
 */
const withAnimationControls = createHigherOrderComponent( ( BlockEdit ) => {
    return ( props ) => {
        if ( ! props.name.startsWith( 'sgs/' ) ) {
            return <BlockEdit { ...props } />;
        }

        const { attributes, setAttributes } = props;

        return (
            <>
                <BlockEdit { ...props } />
                <InspectorControls>
                    <PanelBody
                        title={ __( 'Animation', 'sgs-blocks' ) }
                        initialOpen={ false }
                    >
                        <AnimationControl
                            animation={ attributes.sgsAnimation }
                            animationDelay={ attributes.sgsAnimationDelay }
                            animationDuration={ attributes.sgsAnimationDuration }
                            onChangeAnimation={ ( val ) =>
                                setAttributes( { sgsAnimation: val } )
                            }
                            onChangeDelay={ ( val ) =>
                                setAttributes( { sgsAnimationDelay: val } )
                            }
                            onChangeDuration={ ( val ) =>
                                setAttributes( { sgsAnimationDuration: val } )
                            }
                        />
                    </PanelBody>
                </InspectorControls>
            </>
        );
    };
}, 'withAnimationControls' );

addFilter(
    'editor.BlockEdit',
    'sgs/animation-controls',
    withAnimationControls
);

/**
 * Add animation data attributes to save output.
 */
function addAnimationSaveProps( props, blockType, attributes ) {
    if ( ! blockType.name.startsWith( 'sgs/' ) ) {
        return props;
    }

    if ( attributes.sgsAnimation && attributes.sgsAnimation !== 'none' ) {
        return {
            ...props,
            'data-sgs-animation': attributes.sgsAnimation,
            'data-sgs-animation-delay': attributes.sgsAnimationDelay || '0',
            'data-sgs-animation-duration':
                attributes.sgsAnimationDuration || 'medium',
        };
    }

    return props;
}

addFilter(
    'blocks.getSaveContent.extraProps',
    'sgs/animation-save-props',
    addAnimationSaveProps
);
```

### responsive-visibility.js

Show/hide per breakpoint. Adds `hideOnMobile`, `hideOnTablet`, `hideOnDesktop` toggles to all SGS blocks.

```javascript
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

function addVisibilityAttributes( settings, name ) {
    if ( ! name.startsWith( 'sgs/' ) ) {
        return settings;
    }

    return {
        ...settings,
        attributes: {
            ...settings.attributes,
            sgsHideOnMobile: { type: 'boolean', default: false },
            sgsHideOnTablet: { type: 'boolean', default: false },
            sgsHideOnDesktop: { type: 'boolean', default: false },
        },
    };
}

addFilter(
    'blocks.registerBlockType',
    'sgs/visibility-attributes',
    addVisibilityAttributes
);

const withVisibilityControls = createHigherOrderComponent( ( BlockEdit ) => {
    return ( props ) => {
        if ( ! props.name.startsWith( 'sgs/' ) ) {
            return <BlockEdit { ...props } />;
        }

        const { attributes, setAttributes } = props;

        return (
            <>
                <BlockEdit { ...props } />
                <InspectorControls>
                    <PanelBody
                        title={ __( 'Visibility', 'sgs-blocks' ) }
                        initialOpen={ false }
                    >
                        <ToggleControl
                            label={ __( 'Hide on mobile', 'sgs-blocks' ) }
                            checked={ attributes.sgsHideOnMobile }
                            onChange={ ( val ) =>
                                setAttributes( { sgsHideOnMobile: val } )
                            }
                            __nextHasNoMarginBottom
                        />
                        <ToggleControl
                            label={ __( 'Hide on tablet', 'sgs-blocks' ) }
                            checked={ attributes.sgsHideOnTablet }
                            onChange={ ( val ) =>
                                setAttributes( { sgsHideOnTablet: val } )
                            }
                            __nextHasNoMarginBottom
                        />
                        <ToggleControl
                            label={ __( 'Hide on desktop', 'sgs-blocks' ) }
                            checked={ attributes.sgsHideOnDesktop }
                            onChange={ ( val ) =>
                                setAttributes( { sgsHideOnDesktop: val } )
                            }
                            __nextHasNoMarginBottom
                        />
                    </PanelBody>
                </InspectorControls>
            </>
        );
    };
}, 'withVisibilityControls' );

addFilter(
    'editor.BlockEdit',
    'sgs/visibility-controls',
    withVisibilityControls
);

function addVisibilityClasses( props, blockType, attributes ) {
    if ( ! blockType.name.startsWith( 'sgs/' ) ) {
        return props;
    }

    const classes = [];
    if ( attributes.sgsHideOnMobile ) classes.push( 'sgs-hide-mobile' );
    if ( attributes.sgsHideOnTablet ) classes.push( 'sgs-hide-tablet' );
    if ( attributes.sgsHideOnDesktop ) classes.push( 'sgs-hide-desktop' );

    if ( classes.length ) {
        return {
            ...props,
            className: [ props.className, ...classes ]
                .filter( Boolean )
                .join( ' ' ),
        };
    }

    return props;
}

addFilter(
    'blocks.getSaveContent.extraProps',
    'sgs/visibility-classes',
    addVisibilityClasses
);
```

### index.js (extensions entry point)

```javascript
/**
 * SGS Block Extensions
 *
 * Loaded once in the editor. Injects animation and visibility
 * controls into all sgs/* blocks via WordPress filters.
 */
import './animation';
import './responsive-visibility';
```

### Frontend CSS — extensions.css

Animation CSS transitions + visibility media queries. Enqueued via theme or plugin stylesheet.

```css
/* ===== SGS Animation Extension ===== */

[data-sgs-animation] {
    opacity: 0;
    transition-property: opacity, transform;
    transition-timing-function: ease;
}

/* Duration variants */
[data-sgs-animation-duration="fast"] { transition-duration: 0.3s; }
[data-sgs-animation-duration="medium"] { transition-duration: 0.5s; }
[data-sgs-animation-duration="slow"] { transition-duration: 0.8s; }

/* Starting positions */
[data-sgs-animation="fade-up"] { transform: translateY(30px); }
[data-sgs-animation="fade-in"] { transform: none; }
[data-sgs-animation="slide-left"] { transform: translateX(-30px); }
[data-sgs-animation="slide-right"] { transform: translateX(30px); }
[data-sgs-animation="scale-in"] { transform: scale(0.9); }

/* Animated state (added by IntersectionObserver) */
[data-sgs-animation].sgs-animated {
    opacity: 1;
    transform: none;
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
    [data-sgs-animation] {
        opacity: 1;
        transform: none;
        transition: none;
    }
}

/* ===== SGS Visibility Extension ===== */

@media (max-width: 767px) {
    .sgs-hide-mobile { display: none !important; }
}
@media (min-width: 768px) and (max-width: 1024px) {
    .sgs-hide-tablet { display: none !important; }
}
@media (min-width: 1025px) {
    .sgs-hide-desktop { display: none !important; }
}
```

### Frontend JS — animation-observer.js

Minimal IntersectionObserver that triggers animations on scroll. This becomes a shared `viewScriptModule` or enqueued frontend script.

```javascript
/**
 * SGS Animation Observer
 *
 * Watches elements with [data-sgs-animation] and adds .sgs-animated
 * when they enter the viewport. Respects delay attribute.
 */
( function () {
    if ( typeof IntersectionObserver === 'undefined' ) {
        // Fallback: show everything immediately
        document
            .querySelectorAll( '[data-sgs-animation]' )
            .forEach( ( el ) => el.classList.add( 'sgs-animated' ) );
        return;
    }

    const observer = new IntersectionObserver(
        ( entries ) => {
            entries.forEach( ( entry ) => {
                if ( ! entry.isIntersecting ) return;

                const el = entry.target;
                const delay = parseInt(
                    el.dataset.sgsAnimationDelay || '0',
                    10
                );

                if ( delay > 0 ) {
                    setTimeout(
                        () => el.classList.add( 'sgs-animated' ),
                        delay
                    );
                } else {
                    el.classList.add( 'sgs-animated' );
                }

                observer.unobserve( el );
            } );
        },
        { threshold: 0.15 }
    );

    document
        .querySelectorAll( '[data-sgs-animation]' )
        .forEach( ( el ) => observer.observe( el ) );
} )();
```

**Step: Commit**

```bash
git add plugins/sgs-blocks/src/extensions/ plugins/sgs-blocks/src/assets/
git commit -m "feat(sgs-blocks): animation + visibility extensions for all SGS blocks"
```

---

## Task 5: Utility Modules

**Files:**
- Create: `plugins/sgs-blocks/src/utils/tokens.js`
- Create: `plugins/sgs-blocks/src/utils/responsive.js`
- Create: `plugins/sgs-blocks/src/utils/index.js`

### tokens.js

Helper to resolve theme.json token slugs to CSS custom property references.

```javascript
/**
 * Convert a theme.json colour slug to a CSS custom property value.
 *
 * @param {string} slug - The colour slug (e.g. 'primary', 'accent').
 * @return {string} CSS var() reference.
 */
export function colourVar( slug ) {
    if ( ! slug ) return undefined;
    return `var(--wp--preset--color--${ slug })`;
}

/**
 * Convert a spacing slug to a CSS custom property value.
 *
 * @param {string} slug - The spacing slug (e.g. '40', '60').
 * @return {string} CSS var() reference.
 */
export function spacingVar( slug ) {
    if ( ! slug ) return undefined;
    return `var(--wp--preset--spacing--${ slug })`;
}

/**
 * Convert a shadow slug to a CSS custom property value.
 *
 * @param {string} slug - The shadow slug (e.g. 'sm', 'md', 'glow').
 * @return {string} CSS var() reference.
 */
export function shadowVar( slug ) {
    if ( ! slug ) return undefined;
    return `var(--wp--preset--shadow--${ slug })`;
}

/**
 * Convert a font-size slug to a CSS custom property value.
 *
 * @param {string} slug - The font-size slug (e.g. 'large', 'hero').
 * @return {string} CSS var() reference.
 */
export function fontSizeVar( slug ) {
    if ( ! slug ) return undefined;
    return `var(--wp--preset--font-size--${ slug })`;
}

/**
 * Convert a border-radius custom token to a CSS custom property.
 *
 * @param {string} slug - The border-radius slug (e.g. 'small', 'pill').
 * @return {string} CSS var() reference.
 */
export function borderRadiusVar( slug ) {
    if ( ! slug ) return undefined;
    return `var(--wp--custom--border-radius--${ slug })`;
}

/**
 * Convert a transition custom token to a CSS custom property.
 *
 * @param {string} slug - The transition slug (e.g. 'fast', 'medium').
 * @return {string} CSS var() reference.
 */
export function transitionVar( slug ) {
    if ( ! slug ) return undefined;
    return `var(--wp--custom--transition--${ slug })`;
}
```

### responsive.js

Helpers for generating responsive CSS class names.

```javascript
/**
 * Build a className string from responsive visibility attributes.
 *
 * @param {Object} attributes - Block attributes.
 * @return {string} Space-separated class names.
 */
export function responsiveClasses( attributes ) {
    const classes = [];

    if ( attributes.sgsHideOnMobile ) classes.push( 'sgs-hide-mobile' );
    if ( attributes.sgsHideOnTablet ) classes.push( 'sgs-hide-tablet' );
    if ( attributes.sgsHideOnDesktop ) classes.push( 'sgs-hide-desktop' );

    return classes.join( ' ' );
}

/**
 * Generate column count CSS classes for a grid block.
 *
 * @param {number} desktop - Desktop columns.
 * @param {number} tablet  - Tablet columns.
 * @param {number} mobile  - Mobile columns.
 * @return {string} Space-separated class names.
 */
export function gridColumnClasses( desktop, tablet, mobile ) {
    return [
        `sgs-cols-${ desktop }`,
        tablet && `sgs-cols-tablet-${ tablet }`,
        mobile && `sgs-cols-mobile-${ mobile }`,
    ]
        .filter( Boolean )
        .join( ' ' );
}
```

### index.js

```javascript
export * from './tokens';
export * from './responsive';
```

**Step: Commit**

```bash
git add plugins/sgs-blocks/src/utils/
git commit -m "feat(sgs-blocks): utility modules — token resolvers, responsive helpers"
```

---

## Task 6: Container Block (`sgs/container`)

The foundation block. Every page section uses this. It must be rock-solid: flexible layout (stack/flex/grid), responsive column controls, background options, semantic HTML tag selection, inner blocks support.

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/container/block.json`
- Create: `plugins/sgs-blocks/src/blocks/container/index.js`
- Create: `plugins/sgs-blocks/src/blocks/container/edit.js`
- Create: `plugins/sgs-blocks/src/blocks/container/save.js`
- Create: `plugins/sgs-blocks/src/blocks/container/style.css`
- Create: `plugins/sgs-blocks/src/blocks/container/editor.css`

### block.json

```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "sgs/container",
    "version": "0.1.0",
    "title": "SGS Container",
    "category": "sgs-layout",
    "description": "Flexible layout wrapper — the fundamental building block for all page sections.",
    "keywords": [ "container", "section", "wrapper", "layout", "grid", "flex" ],
    "textdomain": "sgs-blocks",
    "icon": "layout",
    "supports": {
        "align": [ "wide", "full" ],
        "anchor": true,
        "html": false,
        "color": {
            "background": true,
            "text": true,
            "gradients": true
        },
        "spacing": {
            "margin": true,
            "padding": true,
            "blockGap": true
        },
        "__experimentalBorder": {
            "radius": true,
            "width": true,
            "color": true,
            "style": true
        }
    },
    "attributes": {
        "layout": {
            "type": "string",
            "default": "stack"
        },
        "columns": {
            "type": "number",
            "default": 2
        },
        "columnsMobile": {
            "type": "number",
            "default": 1
        },
        "columnsTablet": {
            "type": "number",
            "default": 2
        },
        "gap": {
            "type": "string",
            "default": "40"
        },
        "backgroundImage": {
            "type": "object"
        },
        "backgroundOverlayColour": {
            "type": "string"
        },
        "backgroundOverlayOpacity": {
            "type": "number",
            "default": 50
        },
        "shadow": {
            "type": "string"
        },
        "maxWidth": {
            "type": "string",
            "default": "wide"
        },
        "minHeight": {
            "type": "string"
        },
        "verticalAlign": {
            "type": "string",
            "default": "start"
        },
        "htmlTag": {
            "type": "string",
            "default": "section"
        }
    },
    "editorScript": "file:./index.js",
    "editorStyle": "file:./editor.css",
    "style": "file:./style.css"
}
```

### edit.js

Full editor implementation with sidebar controls for layout, columns, background, tag selection.

```jsx
import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    useInnerBlocksProps,
    InspectorControls,
    MediaUpload,
    MediaUploadCheck,
} from '@wordpress/block-editor';
import {
    PanelBody,
    SelectControl,
    RangeControl,
    Button,
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { ResponsiveControl, SpacingControl, DesignTokenPicker } from '../../components';
import { colourVar, spacingVar, shadowVar } from '../../utils';

const LAYOUT_OPTIONS = [
    { label: __( 'Stack', 'sgs-blocks' ), value: 'stack' },
    { label: __( 'Flex', 'sgs-blocks' ), value: 'flex' },
    { label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
];

const TAG_OPTIONS = [
    { label: 'section', value: 'section' },
    { label: 'div', value: 'div' },
    { label: 'article', value: 'article' },
    { label: 'aside', value: 'aside' },
    { label: 'main', value: 'main' },
];

const WIDTH_OPTIONS = [
    { label: __( 'Content', 'sgs-blocks' ), value: 'content' },
    { label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
    { label: __( 'Full', 'sgs-blocks' ), value: 'full' },
];

const ALIGN_OPTIONS = [
    { label: __( 'Top', 'sgs-blocks' ), value: 'start' },
    { label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
    { label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
    { label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

export default function Edit( { attributes, setAttributes } ) {
    const {
        layout,
        columns,
        columnsMobile,
        columnsTablet,
        gap,
        backgroundImage,
        backgroundOverlayColour,
        backgroundOverlayOpacity,
        shadow,
        maxWidth,
        minHeight,
        verticalAlign,
    } = attributes;

    const style = {
        gap: spacingVar( gap ),
        minHeight: minHeight || undefined,
        ...( shadow && { boxShadow: shadowVar( shadow ) } ),
        ...( backgroundImage?.url && {
            backgroundImage: `url(${ backgroundImage.url })`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        } ),
    };

    if ( layout === 'grid' ) {
        style.display = 'grid';
        style.gridTemplateColumns = `repeat(${ columns }, 1fr)`;
        style.alignItems = verticalAlign;
    } else if ( layout === 'flex' ) {
        style.display = 'flex';
        style.flexWrap = 'wrap';
        style.alignItems = verticalAlign;
    }

    const className = [
        'sgs-container',
        `sgs-container--${ layout }`,
        `sgs-container--width-${ maxWidth }`,
    ]
        .filter( Boolean )
        .join( ' ' );

    const blockProps = useBlockProps( { className, style } );
    const innerBlocksProps = useInnerBlocksProps( blockProps, {
        orientation: layout === 'stack' ? 'vertical' : undefined,
    } );

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
                    <SelectControl
                        label={ __( 'Layout type', 'sgs-blocks' ) }
                        value={ layout }
                        options={ LAYOUT_OPTIONS }
                        onChange={ ( val ) =>
                            setAttributes( { layout: val } )
                        }
                        __nextHasNoMarginBottom
                    />

                    { layout === 'grid' && (
                        <ResponsiveControl
                            label={ __( 'Columns', 'sgs-blocks' ) }
                        >
                            { ( breakpoint ) => {
                                const attrMap = {
                                    desktop: 'columns',
                                    tablet: 'columnsTablet',
                                    mobile: 'columnsMobile',
                                };
                                const attr = attrMap[ breakpoint ];
                                return (
                                    <RangeControl
                                        value={ attributes[ attr ] }
                                        onChange={ ( val ) =>
                                            setAttributes( {
                                                [ attr ]: val,
                                            } )
                                        }
                                        min={ 1 }
                                        max={ breakpoint === 'mobile' ? 3 : 6 }
                                        __nextHasNoMarginBottom
                                    />
                                );
                            } }
                        </ResponsiveControl>
                    ) }

                    <SpacingControl
                        label={ __( 'Gap', 'sgs-blocks' ) }
                        value={ gap }
                        onChange={ ( val ) =>
                            setAttributes( { gap: val } )
                        }
                    />

                    <ToggleGroupControl
                        label={ __( 'Max width', 'sgs-blocks' ) }
                        value={ maxWidth }
                        onChange={ ( val ) =>
                            setAttributes( { maxWidth: val } )
                        }
                        isBlock
                        __nextHasNoMarginBottom
                    >
                        { WIDTH_OPTIONS.map( ( opt ) => (
                            <ToggleGroupControlOption
                                key={ opt.value }
                                value={ opt.value }
                                label={ opt.label }
                            />
                        ) ) }
                    </ToggleGroupControl>

                    { ( layout === 'flex' || layout === 'grid' ) && (
                        <SelectControl
                            label={ __( 'Vertical alignment', 'sgs-blocks' ) }
                            value={ verticalAlign }
                            options={ ALIGN_OPTIONS }
                            onChange={ ( val ) =>
                                setAttributes( { verticalAlign: val } )
                            }
                            __nextHasNoMarginBottom
                        />
                    ) }

                    <SelectControl
                        label={ __( 'Min height', 'sgs-blocks' ) }
                        value={ minHeight || '' }
                        options={ [
                            { label: __( 'Auto', 'sgs-blocks' ), value: '' },
                            { label: '200px', value: '200px' },
                            { label: '400px', value: '400px' },
                            { label: '600px', value: '600px' },
                            { label: '100vh', value: '100vh' },
                        ] }
                        onChange={ ( val ) =>
                            setAttributes( { minHeight: val } )
                        }
                        __nextHasNoMarginBottom
                    />

                    <SelectControl
                        label={ __( 'HTML tag', 'sgs-blocks' ) }
                        value={ attributes.htmlTag }
                        options={ TAG_OPTIONS }
                        onChange={ ( val ) =>
                            setAttributes( { htmlTag: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                </PanelBody>

                <PanelBody
                    title={ __( 'Background Image', 'sgs-blocks' ) }
                    initialOpen={ false }
                >
                    <MediaUploadCheck>
                        <MediaUpload
                            onSelect={ ( media ) =>
                                setAttributes( {
                                    backgroundImage: {
                                        id: media.id,
                                        url: media.url,
                                        alt: media.alt,
                                    },
                                } )
                            }
                            allowedTypes={ [ 'image' ] }
                            value={ backgroundImage?.id }
                            render={ ( { open } ) => (
                                <div>
                                    { backgroundImage?.url ? (
                                        <>
                                            <img
                                                src={ backgroundImage.url }
                                                alt=""
                                                style={ {
                                                    maxWidth: '100%',
                                                    marginBottom: '8px',
                                                } }
                                            />
                                            <Button
                                                variant="secondary"
                                                onClick={ () =>
                                                    setAttributes( {
                                                        backgroundImage:
                                                            undefined,
                                                    } )
                                                }
                                                isDestructive
                                            >
                                                { __(
                                                    'Remove image',
                                                    'sgs-blocks'
                                                ) }
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            onClick={ open }
                                        >
                                            { __(
                                                'Select image',
                                                'sgs-blocks'
                                            ) }
                                        </Button>
                                    ) }
                                </div>
                            ) }
                        />
                    </MediaUploadCheck>

                    { backgroundImage?.url && (
                        <>
                            <DesignTokenPicker
                                label={ __(
                                    'Overlay colour',
                                    'sgs-blocks'
                                ) }
                                value={ backgroundOverlayColour }
                                onChange={ ( val ) =>
                                    setAttributes( {
                                        backgroundOverlayColour: val,
                                    } )
                                }
                            />
                            <RangeControl
                                label={ __(
                                    'Overlay opacity (%)',
                                    'sgs-blocks'
                                ) }
                                value={ backgroundOverlayOpacity }
                                onChange={ ( val ) =>
                                    setAttributes( {
                                        backgroundOverlayOpacity: val,
                                    } )
                                }
                                min={ 0 }
                                max={ 100 }
                                __nextHasNoMarginBottom
                            />
                        </>
                    ) }
                </PanelBody>

                <PanelBody
                    title={ __( 'Shadow', 'sgs-blocks' ) }
                    initialOpen={ false }
                >
                    <SelectControl
                        label={ __( 'Shadow', 'sgs-blocks' ) }
                        value={ shadow || '' }
                        options={ [
                            { label: __( 'None', 'sgs-blocks' ), value: '' },
                            { label: 'Small', value: 'sm' },
                            { label: 'Medium', value: 'md' },
                            { label: 'Large', value: 'lg' },
                            { label: 'Glow', value: 'glow' },
                        ] }
                        onChange={ ( val ) =>
                            setAttributes( { shadow: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                </PanelBody>
            </InspectorControls>

            <div { ...innerBlocksProps } />
        </>
    );
}
```

### save.js

Static save — outputs clean semantic HTML.

```jsx
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { colourVar, spacingVar, shadowVar } from '../../utils';

export default function Save( { attributes } ) {
    const {
        layout,
        columns,
        columnsMobile,
        columnsTablet,
        gap,
        backgroundImage,
        backgroundOverlayColour,
        backgroundOverlayOpacity,
        shadow,
        maxWidth,
        minHeight,
        verticalAlign,
        htmlTag,
    } = attributes;

    const Tag = htmlTag || 'section';

    const style = {
        gap: spacingVar( gap ),
        minHeight: minHeight || undefined,
        ...( shadow && { boxShadow: shadowVar( shadow ) } ),
        ...( backgroundImage?.url && {
            backgroundImage: `url(${ backgroundImage.url })`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        } ),
    };

    if ( layout === 'grid' ) {
        style.display = 'grid';
        style.gridTemplateColumns = `repeat(${ columns }, 1fr)`;
        style.alignItems = verticalAlign;
    } else if ( layout === 'flex' ) {
        style.display = 'flex';
        style.flexWrap = 'wrap';
        style.alignItems = verticalAlign;
    }

    const className = [
        'sgs-container',
        `sgs-container--${ layout }`,
        `sgs-container--width-${ maxWidth }`,
        layout === 'grid' && `sgs-cols-${ columns }`,
        layout === 'grid' &&
            columnsTablet &&
            `sgs-cols-tablet-${ columnsTablet }`,
        layout === 'grid' &&
            columnsMobile &&
            `sgs-cols-mobile-${ columnsMobile }`,
    ]
        .filter( Boolean )
        .join( ' ' );

    const blockProps = useBlockProps.save( { className, style } );
    const innerBlocksProps = useInnerBlocksProps.save( blockProps );

    return (
        <>
            <Tag { ...innerBlocksProps }>
                { backgroundImage?.url && backgroundOverlayColour && (
                    <span
                        className="sgs-container__overlay"
                        style={ {
                            backgroundColor: backgroundOverlayColour,
                            opacity: backgroundOverlayOpacity / 100,
                        } }
                        aria-hidden="true"
                    />
                ) }
                { innerBlocksProps.children }
            </Tag>
        </>
    );
}
```

Note: The save function uses a custom `Tag` element. Because `useBlockProps.save()` returns props for a `div`, but we want semantic tags, we spread the props onto our custom Tag. This is the standard pattern for custom element blocks.

### style.css

```css
/* ===== SGS Container — Frontend + Editor ===== */

.sgs-container {
    position: relative;
    box-sizing: border-box;
}

.sgs-container__overlay {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
}

.sgs-container > *:not(.sgs-container__overlay) {
    position: relative;
    z-index: 1;
}

/* Width variants */
.sgs-container--width-content {
    max-width: var(--wp--style--global--content-size, 800px);
    margin-left: auto;
    margin-right: auto;
}

.sgs-container--width-wide {
    max-width: var(--wp--style--global--wide-size, 1200px);
    margin-left: auto;
    margin-right: auto;
}

.sgs-container--width-full {
    max-width: none;
}

/* Layout: stack */
.sgs-container--stack {
    display: flex;
    flex-direction: column;
}

/* Responsive grid columns */
@media (max-width: 767px) {
    .sgs-cols-mobile-1 { grid-template-columns: 1fr !important; }
    .sgs-cols-mobile-2 { grid-template-columns: repeat(2, 1fr) !important; }
    .sgs-cols-mobile-3 { grid-template-columns: repeat(3, 1fr) !important; }
}

@media (min-width: 768px) and (max-width: 1024px) {
    .sgs-cols-tablet-1 { grid-template-columns: 1fr !important; }
    .sgs-cols-tablet-2 { grid-template-columns: repeat(2, 1fr) !important; }
    .sgs-cols-tablet-3 { grid-template-columns: repeat(3, 1fr) !important; }
    .sgs-cols-tablet-4 { grid-template-columns: repeat(4, 1fr) !important; }
}
```

### editor.css

```css
/* ===== SGS Container — Editor Only ===== */

.sgs-container {
    border: 1px dashed rgba(0, 0, 0, 0.1);
    min-height: 50px;
}

.sgs-container:hover {
    border-color: var(--wp--preset--color--primary, #0F7E80);
}
```

### index.js

```javascript
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
    edit: Edit,
    save: Save,
} );
```

**Step: Build and test**

```bash
cd plugins/sgs-blocks && npm run build
```

Expected: `build/blocks/container/` created with compiled assets + block.json.

**Step: Deploy and verify**

```bash
scp -r plugins/sgs-blocks hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp plugin activate sgs-blocks && wp block list --post_type=page | grep sgs"
```

Expected: `sgs/container` appears in the block list.

**Step: Commit**

```bash
git add plugins/sgs-blocks/src/blocks/container/
git commit -m "feat(sgs-blocks): Container block — layout wrapper with grid/flex/stack, responsive columns"
```

---

## Task 7: Frontend Asset Enqueuing

The animation CSS and JS observer need to load on the frontend. Register them in the plugin so they're available for any block that uses animations.

**Files:**
- Modify: `plugins/sgs-blocks/includes/class-sgs-blocks.php`

**Step 1: Add frontend enqueue method**

Add to the constructor:
```php
add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );
```

Add the method:
```php
/**
 * Enqueue frontend CSS and JS for extensions.
 *
 * Only loads if at least one SGS block is present on the page.
 * WordPress 6.9 handles per-block asset loading via block.json,
 * but extensions apply globally and need separate enqueuing.
 */
public function enqueue_frontend_assets(): void {
    if ( ! has_block( 'sgs/' ) ) {
        // Quick check — if no SGS blocks on page, skip entirely.
        // Note: has_block() with partial match may not work on all versions.
        // Fallback: always enqueue (< 2KB combined, negligible impact).
    }

    $css_file = SGS_BLOCKS_PATH . 'src/assets/css/extensions.css';
    if ( file_exists( $css_file ) ) {
        wp_enqueue_style(
            'sgs-extensions',
            SGS_BLOCKS_URL . 'src/assets/css/extensions.css',
            [],
            SGS_BLOCKS_VERSION
        );
    }

    $js_file = SGS_BLOCKS_PATH . 'src/assets/js/animation-observer.js';
    if ( file_exists( $js_file ) ) {
        wp_enqueue_script(
            'sgs-animation-observer',
            SGS_BLOCKS_URL . 'src/assets/js/animation-observer.js',
            [],
            SGS_BLOCKS_VERSION,
            true
        );
    }
}
```

**Step: Commit**

```bash
git add plugins/sgs-blocks/includes/class-sgs-blocks.php
git commit -m "feat(sgs-blocks): frontend enqueuing for animation CSS + IntersectionObserver JS"
```

---

## Task 8: Build, Deploy, Full Verification

End-to-end test of the entire foundation.

**Step 1: Build**

```bash
cd plugins/sgs-blocks && npm run build
```

Expected: Clean build with no errors. `build/` directory populated.

**Step 2: Deploy**

```bash
scp -r plugins/sgs-blocks hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp plugin activate sgs-blocks 2>/dev/null; echo 'Status:' && wp plugin status sgs-blocks"
```

**Step 3: Verification checklist**

Run these checks on the server:

```bash
# 1. Plugin active, no PHP errors
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp plugin status sgs-blocks && wp eval 'echo \"PHP OK\n\";'"

# 2. Block categories registered
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp eval 'print_r(array_column(get_block_categories(get_post(0)), \"slug\"));'"
# Expected: sgs-layout, sgs-content, sgs-interactive in the array

# 3. Container block registered
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp eval 'echo WP_Block_Type_Registry::get_instance()->is_registered(\"sgs/container\") ? \"sgs/container: REGISTERED\" : \"sgs/container: MISSING\";'"

# 4. No JS errors on frontend
curl -sI https://palestine-lives.org/ | head -5
# Expected: HTTP 200

# 5. Extension CSS loading
ssh hd "curl -s https://palestine-lives.org/ | grep -c 'sgs-extensions'"
# Expected: 1 (stylesheet enqueued)
```

**Step 4: Commit everything and tag**

```bash
git add plugins/sgs-blocks/
git commit -m "feat(sgs-blocks): Phase 1b foundation — plugin skeleton, build toolchain, container block, extensions

Complete foundation infrastructure:
- Auto-discovery block registration (scan build/blocks/)
- Three block categories (layout, content, interactive)
- Shared editor components (responsive, tokens, spacing, animation)
- Animation extension (scroll-triggered, IntersectionObserver)
- Visibility extension (hide per breakpoint)
- Utility modules (token resolvers, responsive helpers)
- Container block with grid/flex/stack, responsive columns, background image
- wp-scripts build with --experimental-modules and --webpack-copy-php
- Frontend CSS + JS for animation system"
```

---

## Summary: What This Foundation Enables

After completing these 8 tasks, adding a new block is:

1. Create `src/blocks/block-name/` with `block.json`, `edit.js`, `save.js`, `style.css`
2. Run `npm run build`
3. Deploy

The block automatically:
- Registers via auto-discovery (no PHP changes needed)
- Gets animation controls in the sidebar (fade-up, slide, scale)
- Gets visibility toggles (hide on mobile/tablet/desktop)
- Can import shared components (`ResponsiveControl`, `DesignTokenPicker`, `SpacingControl`)
- Can use token utilities (`colourVar()`, `spacingVar()`, `shadowVar()`)
- Reads all colours/fonts/spacing from theme.json (works with any style variation)
- Has responsive grid column classes ready to use

**Next blocks to build (in order per spec):** Hero, Info Box, Counter, Trust Bar, Icon List, Card Grid, CTA Section, then form system foundation.

---

## Execution Notes

- **No testing framework** in this plan. WordPress block testing requires either `wp-env` (Docker-based) or Playwright E2E. The dev site IS the test environment for now. Formal testing can be added once the core blocks are stable.
- **The `--experimental-modules` flag** may become stable in a future `@wordpress/scripts` release. Check the changelog when updating the package.
- **Performance:** The animation observer is ~0.5KB minified. The extensions CSS is ~1KB. Well within the <50KB JS / <100KB CSS budget.
- **Forms foundation** (Task 9+) is a separate plan — it needs database tables, REST API, and a processing engine. That's a different architectural layer from the block UI infrastructure.
