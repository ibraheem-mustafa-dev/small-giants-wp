# Accordion Deploy + Review Schema + Table of Contents

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Invoke `wp-block-development` for block registration and render.php patterns. Invoke `wp-interactivity-api` if debugging view.js module issues.

**Goal:** Deploy the completed accordion blocks with FAQ Schema, add Review Schema to the testimonial block, and build a new Table of Contents block.

**Architecture:** Three independent tasks. Task 1 is pure commit/build/deploy of existing code. Task 2 adds a PHP `render_block` filter and two new block attributes to the static testimonial block (no save.js changes, no deprecation). Task 3 builds a new dynamic block that parses post content server-side to detect headings and renders a navigable list with scroll spy.

**Tech Stack:** WordPress 6.9.1, @wordpress/scripts (build), PHP 8.x, vanilla JS (view scripts), schema.org JSON-LD.

---

## Task 1: Commit + Build + Deploy Accordion & Backend UX Fixes

Everything is written but uncommitted. This task gets it live.

**Files (all existing, uncommitted):**
- `plugins/sgs-blocks/src/blocks/accordion/*` (8 files, untracked)
- `plugins/sgs-blocks/src/blocks/accordion-item/*` (4 files, untracked)
- `plugins/sgs-blocks/src/utils/icons.js` (untracked)
- `plugins/sgs-blocks/src/blocks/*/index.js` (30+ files, modified — icon imports)
- `plugins/sgs-blocks/includes/block-categories.php` (modified — category labels)

**Step 1: Build the plugin**

```bash
cd plugins/sgs-blocks && npm run build
```

Expected: Clean build, no errors. `build/blocks/accordion/` and `build/blocks/accordion-item/` directories created.

**Step 2: Verify the build output**

Check that accordion blocks compiled:
```bash
ls build/blocks/accordion/
ls build/blocks/accordion-item/
```

Expected: `index.js`, `render.php`, `block.json`, `style-index.css`, `index.css`, `view.js` in accordion. `index.js`, `render.php`, `block.json` in accordion-item.

**Step 3: Commit all changes**

```bash
git add plugins/sgs-blocks/src/blocks/accordion/ plugins/sgs-blocks/src/blocks/accordion-item/ plugins/sgs-blocks/src/utils/icons.js
git add plugins/sgs-blocks/src/blocks/*/index.js plugins/sgs-blocks/includes/block-categories.php
git commit -m "feat(sgs-blocks): add accordion blocks with FAQ Schema + custom SVG icons

- Accordion block: 3 styles (bordered/flush/card), single/multi-open mode,
  default-open item, FAQ Schema JSON-LD toggle, per-element colour controls
- Accordion Item: parent-constrained, context-inherited styling,
  progressive enhancement via <details>/<summary>
- Custom SVG icons with SGS teal (#0F7E80) for all 31 blocks
- Block categories renamed: SGS — Layout/Content/Interactive/Forms

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 4: Deploy to dev site**

```bash
scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge all"
```

**Step 5: Verify on dev site**

Open palestine-lives.org/wp-admin, create a test post:
1. Insert an SGS Accordion block — confirm it registers, has teal icon
2. Add 2-3 accordion items with questions and answers
3. Enable FAQ Schema toggle in inspector
4. Preview — confirm expand/collapse works, check page source for `<script type="application/ld+json">` with FAQPage schema
5. Check block inserter — all SGS blocks should show teal icons and proper category labels

---

## Task 2: Add Review Schema to Testimonial Block

Add `reviewSource` and `reviewDate` attributes to the existing static testimonial block. Use a `render_block` PHP filter to inject JSON-LD when `reviewSource` is set. No changes to save.js means no deprecation.

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/testimonial/block.json` — add 2 attributes
- Modify: `plugins/sgs-blocks/src/blocks/testimonial/edit.js` — add Review Source panel
- Create: `plugins/sgs-blocks/includes/review-schema.php` — render_block filter
- Modify: `plugins/sgs-blocks/sgs-blocks.php` — require the new PHP file

### Step 1: Add attributes to block.json

Add these after the existing `ratingColour` attribute in `plugins/sgs-blocks/src/blocks/testimonial/block.json`:

```json
"reviewSource": {
    "type": "string",
    "default": ""
},
"reviewDate": {
    "type": "string",
    "default": ""
}
```

These are comment-delimiter attributes (not `source: "html"`), so they won't affect save.js output. No deprecation needed.

### Step 2: Add Review Source panel to edit.js

In `plugins/sgs-blocks/src/blocks/testimonial/edit.js`, add a new `PanelBody` in the `InspectorControls` after the Text Styling panel:

```jsx
import { TextControl } from '@wordpress/components';

// In the component, destructure:
// reviewSource, reviewDate

<PanelBody
    title={ __( 'Review Source', 'sgs-blocks' ) }
    initialOpen={ false }
>
    <TextControl
        label={ __( 'Source platform', 'sgs-blocks' ) }
        help={ __( 'e.g. Google Reviews, LinkedIn, Trustpilot. Leave empty for hand-written testimonials (no schema output).', 'sgs-blocks' ) }
        value={ reviewSource }
        onChange={ ( val ) => setAttributes( { reviewSource: val } ) }
        __nextHasNoMarginBottom
    />
    { reviewSource && (
        <TextControl
            label={ __( 'Review date', 'sgs-blocks' ) }
            help={ __( 'ISO date of the original review (YYYY-MM-DD).', 'sgs-blocks' ) }
            value={ reviewDate }
            onChange={ ( val ) => setAttributes( { reviewDate: val } ) }
            type="date"
            __nextHasNoMarginBottom
        />
    ) }
</PanelBody>
```

### Step 3: Create review-schema.php

Create `plugins/sgs-blocks/includes/review-schema.php`:

```php
<?php
/**
 * Review Schema JSON-LD for SGS Testimonial blocks.
 *
 * Injects schema.org/Review structured data when a testimonial
 * has a reviewSource attribute set (externally sourced reviews only).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block_sgs/testimonial', __NAMESPACE__ . '\\add_review_schema', 10, 2 );

/**
 * Append Review Schema JSON-LD after testimonial block HTML.
 *
 * Only fires when reviewSource is set (non-empty string), ensuring
 * hand-written testimonials do not get self-serving review markup.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Full block data including attrs.
 * @return string Block HTML with optional JSON-LD appended.
 */
function add_review_schema( string $block_content, array $block ): string {
    $attrs = $block['attrs'] ?? [];

    // Only output schema for externally sourced reviews.
    $source = trim( $attrs['reviewSource'] ?? '' );
    if ( empty( $source ) ) {
        return $block_content;
    }

    // Require at minimum a quote and a name.
    $quote = trim( wp_strip_all_tags( $attrs['quote'] ?? '' ) );
    $name  = trim( wp_strip_all_tags( $attrs['name'] ?? '' ) );
    if ( empty( $quote ) || empty( $name ) ) {
        return $block_content;
    }

    $schema = [
        '@context'    => 'https://schema.org',
        '@type'       => 'Review',
        'reviewBody'  => $quote,
        'author'      => [
            '@type' => 'Person',
            'name'  => $name,
        ],
        'publisher'   => [
            '@type' => 'Organization',
            'name'  => $source,
        ],
        'itemReviewed' => [
            '@type' => 'LocalBusiness',
            'name'  => get_bloginfo( 'name' ),
        ],
    ];

    // Add star rating if present.
    $rating = (int) ( $attrs['rating'] ?? 0 );
    if ( $rating > 0 ) {
        $schema['reviewRating'] = [
            '@type'       => 'Rating',
            'ratingValue' => $rating,
            'bestRating'  => 5,
        ];
    }

    // Add role as job title.
    $role = trim( wp_strip_all_tags( $attrs['role'] ?? '' ) );
    if ( ! empty( $role ) ) {
        $schema['author']['jobTitle'] = $role;
    }

    // Add review date if set.
    $date = $attrs['reviewDate'] ?? '';
    if ( ! empty( $date ) ) {
        $schema['datePublished'] = $date;
    }

    $json_ld = wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

    return $block_content . sprintf(
        "\n" . '<script type="application/ld+json">%s</script>',
        $json_ld
    );
}
```

### Step 4: Require the new file in sgs-blocks.php

Add after the existing `require` statements:

```php
require_once __DIR__ . '/includes/review-schema.php';
```

### Step 5: Build, commit, deploy

```bash
cd plugins/sgs-blocks && npm run build
```

```bash
git add plugins/sgs-blocks/src/blocks/testimonial/block.json \
       plugins/sgs-blocks/src/blocks/testimonial/edit.js \
       plugins/sgs-blocks/includes/review-schema.php \
       plugins/sgs-blocks/sgs-blocks.php
git commit -m "feat(sgs-blocks): add Review Schema to testimonial block

Injects schema.org/Review JSON-LD via render_block filter when
reviewSource attribute is set. Only externally sourced reviews
(Google Reviews, LinkedIn, Trustpilot) get schema — hand-written
testimonials are excluded. Supports star rating, review date,
and author job title.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

Deploy and purge cache (same SCP command as Task 1).

### Step 6: Verify

1. Edit a testimonial block on the dev site
2. Set source to "Google Reviews", add a date, set rating to 5
3. Preview — check page source for `<script type="application/ld+json">` with Review schema
4. Validate at https://search.google.com/test/rich-results (paste the page URL)
5. Create a testimonial WITHOUT a source — confirm no schema in page source

---

## Task 3: Build Table of Contents Block

New dynamic block that parses post content server-side to detect headings, renders a navigable nested list, and provides scroll spy + smooth scroll via view.js.

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/table-of-contents/block.json`
- Create: `plugins/sgs-blocks/src/blocks/table-of-contents/index.js`
- Create: `plugins/sgs-blocks/src/blocks/table-of-contents/edit.js`
- Create: `plugins/sgs-blocks/src/blocks/table-of-contents/render.php`
- Create: `plugins/sgs-blocks/src/blocks/table-of-contents/view.js`
- Create: `plugins/sgs-blocks/src/blocks/table-of-contents/style.css`
- Create: `plugins/sgs-blocks/src/blocks/table-of-contents/editor.css`
- Modify: `plugins/sgs-blocks/src/utils/icons.js` — add ToC icon
- Create: `plugins/sgs-blocks/includes/heading-anchors.php` — anchor injection filter

### Step 1: Create block.json

`plugins/sgs-blocks/src/blocks/table-of-contents/block.json`:

```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "sgs/table-of-contents",
    "version": "0.1.0",
    "title": "SGS Table of Contents",
    "category": "sgs-content",
    "description": "Auto-generated table of contents from heading blocks. Smooth scroll, scroll spy, collapsible.",
    "keywords": [ "toc", "table of contents", "navigation", "headings", "index" ],
    "textdomain": "sgs-blocks",
    "icon": "list-view",
    "supports": {
        "align": [ "wide" ],
        "anchor": true,
        "html": false,
        "color": {
            "background": true,
            "text": true,
            "link": true
        },
        "typography": {
            "fontSize": true,
            "lineHeight": true
        },
        "spacing": {
            "margin": true,
            "padding": true
        },
        "__experimentalBorder": {
            "radius": true,
            "width": true,
            "color": true,
            "style": true
        }
    },
    "attributes": {
        "headingLevels": {
            "type": "array",
            "default": [ 2, 3, 4 ]
        },
        "title": {
            "type": "string",
            "default": "Table of Contents"
        },
        "collapsible": {
            "type": "boolean",
            "default": true
        },
        "defaultCollapsed": {
            "type": "boolean",
            "default": false
        },
        "smoothScroll": {
            "type": "boolean",
            "default": true
        },
        "scrollOffset": {
            "type": "number",
            "default": 0
        },
        "scrollSpy": {
            "type": "boolean",
            "default": true
        },
        "listStyle": {
            "type": "string",
            "default": "numbered"
        },
        "style": {
            "type": "string",
            "default": "card"
        },
        "titleColour": {
            "type": "string"
        },
        "linkColour": {
            "type": "string"
        },
        "activeLinkColour": {
            "type": "string",
            "default": "primary"
        }
    },
    "render": "file:./render.php",
    "editorScript": "file:./index.js",
    "editorStyle": "file:./editor.css",
    "style": "file:./style.css",
    "viewScriptModule": "file:./view.js"
}
```

### Step 2: Create index.js

`plugins/sgs-blocks/src/blocks/table-of-contents/index.js`:

```js
import { registerBlockType } from '@wordpress/blocks';
import { tableOfContentsIcon } from '../../utils/icons';
import metadata from './block.json';
import Edit from './edit';

registerBlockType( metadata.name, {
    icon: tableOfContentsIcon,
    edit: Edit,
    save: () => null,
} );
```

### Step 3: Add icon to icons.js

In `plugins/sgs-blocks/src/utils/icons.js`, add in the CONTENT BLOCKS section:

```jsx
/** Table of Contents — nested list with lines */
export const tableOfContentsIcon = icon(
    <SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <Rect x="3" y="3" width="12" height="2" rx="1" />
        <Rect x="6" y="7.5" width="10" height="1.5" rx="0.75" fillOpacity="0.6" />
        <Rect x="6" y="11" width="9" height="1.5" rx="0.75" fillOpacity="0.6" />
        <Rect x="9" y="14.5" width="8" height="1.5" rx="0.75" fillOpacity="0.4" />
        <Rect x="6" y="18" width="11" height="1.5" rx="0.75" fillOpacity="0.6" />
        <Rect x="3" y="7" width="1.5" height="14" rx="0.5" fillOpacity="0.3" />
    </SVG>
);
```

### Step 4: Create edit.js

`plugins/sgs-blocks/src/blocks/table-of-contents/edit.js`:

```jsx
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
    PanelBody,
    SelectControl,
    TextControl,
    ToggleControl,
    RangeControl,
    CheckboxControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const STYLE_OPTIONS = [
    { label: __( 'Card', 'sgs-blocks' ), value: 'card' },
    { label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
    { label: __( 'Flush', 'sgs-blocks' ), value: 'flush' },
];

const LIST_STYLE_OPTIONS = [
    { label: __( 'Numbered', 'sgs-blocks' ), value: 'numbered' },
    { label: __( 'Bulleted', 'sgs-blocks' ), value: 'bulleted' },
    { label: __( 'Plain', 'sgs-blocks' ), value: 'plain' },
];

const HEADING_LEVELS = [ 2, 3, 4, 5, 6 ];

/**
 * Generate a slug from heading text.
 *
 * @param {string} text Heading text content.
 * @return {string} URL-safe slug.
 */
function slugify( text ) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace( /&/g, '-and-' )
        .replace( /[\s\W-]+/g, '-' )
        .replace( /^-+|-+$/g, '' );
}

export default function Edit( { attributes, setAttributes } ) {
    const {
        headingLevels,
        title,
        collapsible,
        defaultCollapsed,
        smoothScroll,
        scrollOffset,
        scrollSpy,
        listStyle,
        style: tocStyle,
        titleColour,
        linkColour,
        activeLinkColour,
    } = attributes;

    // Detect headings from the current post content in the editor.
    const headings = useSelect( ( select ) => {
        const blocks = select( 'core/block-editor' ).getBlocks();
        const found = [];

        function findHeadings( blockList ) {
            for ( const block of blockList ) {
                if (
                    block.name === 'core/heading' &&
                    headingLevels.includes( block.attributes.level )
                ) {
                    const text = ( block.attributes.content || '' )
                        .replace( /<[^>]+>/g, '' )
                        .trim();
                    if ( text ) {
                        found.push( {
                            level: block.attributes.level,
                            text,
                            anchor:
                                block.attributes.anchor ||
                                slugify( text ),
                        } );
                    }
                }
                // Recurse into inner blocks.
                if ( block.innerBlocks?.length ) {
                    findHeadings( block.innerBlocks );
                }
            }
        }

        findHeadings( blocks );
        return found;
    }, [ headingLevels ] );

    const className = [
        'sgs-toc',
        `sgs-toc--${ tocStyle }`,
        `sgs-toc--${ listStyle }`,
    ].join( ' ' );

    const blockProps = useBlockProps( { className } );

    const ListTag = listStyle === 'numbered' ? 'ol' : 'ul';

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Table of Contents', 'sgs-blocks' ) }>
                    <SelectControl
                        label={ __( 'Visual style', 'sgs-blocks' ) }
                        value={ tocStyle }
                        options={ STYLE_OPTIONS }
                        onChange={ ( val ) =>
                            setAttributes( { style: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                    <SelectControl
                        label={ __( 'List style', 'sgs-blocks' ) }
                        value={ listStyle }
                        options={ LIST_STYLE_OPTIONS }
                        onChange={ ( val ) =>
                            setAttributes( { listStyle: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                    <TextControl
                        label={ __( 'Title', 'sgs-blocks' ) }
                        value={ title }
                        onChange={ ( val ) =>
                            setAttributes( { title: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                    <p className="components-base-control__label">
                        { __( 'Heading levels', 'sgs-blocks' ) }
                    </p>
                    { HEADING_LEVELS.map( ( level ) => (
                        <CheckboxControl
                            key={ level }
                            label={ `H${ level }` }
                            checked={ headingLevels.includes( level ) }
                            onChange={ ( checked ) => {
                                const next = checked
                                    ? [ ...headingLevels, level ].sort()
                                    : headingLevels.filter(
                                          ( l ) => l !== level
                                      );
                                setAttributes( {
                                    headingLevels: next,
                                } );
                            } }
                            __nextHasNoMarginBottom
                        />
                    ) ) }
                </PanelBody>

                <PanelBody
                    title={ __( 'Behaviour', 'sgs-blocks' ) }
                    initialOpen={ false }
                >
                    <ToggleControl
                        label={ __( 'Collapsible', 'sgs-blocks' ) }
                        checked={ collapsible }
                        onChange={ ( val ) =>
                            setAttributes( { collapsible: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                    { collapsible && (
                        <ToggleControl
                            label={ __(
                                'Collapsed by default',
                                'sgs-blocks'
                            ) }
                            checked={ defaultCollapsed }
                            onChange={ ( val ) =>
                                setAttributes( {
                                    defaultCollapsed: val,
                                } )
                            }
                            __nextHasNoMarginBottom
                        />
                    ) }
                    <ToggleControl
                        label={ __( 'Smooth scroll', 'sgs-blocks' ) }
                        checked={ smoothScroll }
                        onChange={ ( val ) =>
                            setAttributes( { smoothScroll: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                    { smoothScroll && (
                        <RangeControl
                            label={ __(
                                'Scroll offset (px)',
                                'sgs-blocks'
                            ) }
                            help={ __(
                                'Offset for sticky headers. 0 = no offset.',
                                'sgs-blocks'
                            ) }
                            value={ scrollOffset }
                            onChange={ ( val ) =>
                                setAttributes( { scrollOffset: val } )
                            }
                            min={ 0 }
                            max={ 200 }
                            step={ 10 }
                            __nextHasNoMarginBottom
                        />
                    ) }
                    <ToggleControl
                        label={ __( 'Scroll spy', 'sgs-blocks' ) }
                        help={ __(
                            'Highlights the heading currently in view.',
                            'sgs-blocks'
                        ) }
                        checked={ scrollSpy }
                        onChange={ ( val ) =>
                            setAttributes( { scrollSpy: val } )
                        }
                        __nextHasNoMarginBottom
                    />
                </PanelBody>

                <PanelBody
                    title={ __( 'Text Styling', 'sgs-blocks' ) }
                    initialOpen={ false }
                >
                    <DesignTokenPicker
                        label={ __( 'Title colour', 'sgs-blocks' ) }
                        value={ titleColour }
                        onChange={ ( val ) =>
                            setAttributes( { titleColour: val } )
                        }
                    />
                    <DesignTokenPicker
                        label={ __( 'Link colour', 'sgs-blocks' ) }
                        value={ linkColour }
                        onChange={ ( val ) =>
                            setAttributes( { linkColour: val } )
                        }
                    />
                    <DesignTokenPicker
                        label={ __(
                            'Active link colour',
                            'sgs-blocks'
                        ) }
                        value={ activeLinkColour }
                        onChange={ ( val ) =>
                            setAttributes( { activeLinkColour: val } )
                        }
                    />
                </PanelBody>
            </InspectorControls>

            <nav { ...blockProps } aria-label={ title }>
                { title && (
                    <p
                        className="sgs-toc__title"
                        style={ {
                            color:
                                colourVar( titleColour ) || undefined,
                        } }
                    >
                        { title }
                    </p>
                ) }
                { headings.length > 0 ? (
                    <ListTag className="sgs-toc__list">
                        { headings.map( ( heading, i ) => (
                            <li
                                key={ i }
                                className={ `sgs-toc__item sgs-toc__item--h${ heading.level }` }
                                style={ {
                                    color:
                                        colourVar( linkColour ) ||
                                        undefined,
                                } }
                            >
                                <span className="sgs-toc__link">
                                    { heading.text }
                                </span>
                            </li>
                        ) ) }
                    </ListTag>
                ) : (
                    <p className="sgs-toc__empty">
                        { __(
                            'Add heading blocks to generate a table of contents.',
                            'sgs-blocks'
                        ) }
                    </p>
                ) }
            </nav>
        </>
    );
}
```

### Step 5: Create heading-anchors.php

This filter injects `id` attributes onto heading blocks that lack them, so the ToC links have targets.

`plugins/sgs-blocks/includes/heading-anchors.php`:

```php
<?php
/**
 * Heading anchor injection for Table of Contents.
 *
 * Adds id attributes to heading blocks that lack them,
 * so the ToC has valid link targets. Respects user-set anchors.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block_core/heading', __NAMESPACE__ . '\\inject_heading_anchor', 10, 2 );

/**
 * Add an id attribute to headings that do not have one.
 *
 * Only runs when the current post/page contains an sgs/table-of-contents block.
 *
 * @param string $block_content Rendered heading HTML.
 * @param array  $block         Block data.
 * @return string Heading HTML with id attribute.
 */
function inject_heading_anchor( string $block_content, array $block ): string {
    // Skip if this heading already has an id.
    if ( preg_match( '/\bid=["\']/', $block_content ) ) {
        return $block_content;
    }

    // Skip if the heading has the ignore class.
    if ( str_contains( $block_content, 'sgs-toc-ignore' ) ) {
        return $block_content;
    }

    // Only inject anchors if this post contains a ToC block.
    static $has_toc = null;
    if ( null === $has_toc ) {
        $has_toc = has_block( 'sgs/table-of-contents' );
    }
    if ( ! $has_toc ) {
        return $block_content;
    }

    // Extract text content for slug generation.
    $text = wp_strip_all_tags( $block_content );
    $slug = sanitize_title( $text );

    if ( empty( $slug ) ) {
        return $block_content;
    }

    // Handle duplicate slugs within the same page.
    static $used_slugs = [];
    $original_slug = $slug;
    $counter = 2;
    while ( in_array( $slug, $used_slugs, true ) ) {
        $slug = $original_slug . '-' . $counter;
        $counter++;
    }
    $used_slugs[] = $slug;

    // Inject the id into the opening tag.
    return preg_replace(
        '/^(<h[1-6]\b)/',
        '$1 id="' . esc_attr( $slug ) . '"',
        $block_content,
        1
    );
}
```

### Step 6: Create render.php

`plugins/sgs-blocks/src/blocks/table-of-contents/render.php`:

```php
<?php
/**
 * Table of Contents — server-side render.
 *
 * Parses the current post content to detect headings
 * and renders a navigable nested list.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    (unused — no inner blocks).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$heading_levels   = $attributes['headingLevels'] ?? [ 2, 3, 4 ];
$toc_title        = $attributes['title'] ?? __( 'Table of Contents', 'sgs-blocks' );
$collapsible      = ! empty( $attributes['collapsible'] );
$default_collapsed = ! empty( $attributes['defaultCollapsed'] );
$smooth_scroll    = ! empty( $attributes['smoothScroll'] );
$scroll_offset    = (int) ( $attributes['scrollOffset'] ?? 0 );
$scroll_spy       = ! empty( $attributes['scrollSpy'] );
$list_style       = $attributes['listStyle'] ?? 'numbered';
$toc_style        = $attributes['style'] ?? 'card';
$title_colour     = $attributes['titleColour'] ?? '';
$link_colour      = $attributes['linkColour'] ?? '';
$active_colour    = $attributes['activeLinkColour'] ?? 'primary';

// ─── Parse headings from post content ───
$post = get_post();
if ( ! $post ) {
    return;
}

$post_content = $post->post_content;
if ( empty( $post_content ) ) {
    return;
}

// Build regex for the selected heading levels.
$levels_pattern = implode( '|', array_map( 'intval', $heading_levels ) );
$pattern = '/<h(' . $levels_pattern . ')([^>]*)>(.*?)<\/h\1>/si';

if ( ! preg_match_all( $pattern, $post_content, $matches, PREG_SET_ORDER ) ) {
    return; // No headings found — render nothing.
}

$headings = [];
$used_slugs = [];

foreach ( $matches as $match ) {
    $level = (int) $match[1];
    $attrs_str = $match[2];
    $text = wp_strip_all_tags( $match[3] );

    if ( empty( $text ) ) {
        continue;
    }

    // Skip headings with sgs-toc-ignore class.
    if ( str_contains( $attrs_str, 'sgs-toc-ignore' ) ) {
        continue;
    }

    // Extract existing id or generate one.
    if ( preg_match( '/\bid=["\']([^"\']+)["\']/', $attrs_str, $id_match ) ) {
        $slug = $id_match[1];
    } else {
        $slug = sanitize_title( $text );
    }

    if ( empty( $slug ) ) {
        continue;
    }

    // Deduplicate slugs.
    $original = $slug;
    $counter = 2;
    while ( in_array( $slug, $used_slugs, true ) ) {
        $slug = $original . '-' . $counter;
        $counter++;
    }
    $used_slugs[] = $slug;

    $headings[] = [
        'level' => $level,
        'text'  => $text,
        'id'    => $slug,
    ];
}

if ( empty( $headings ) ) {
    return;
}

// ─── Build output ───
$classes = [
    'sgs-toc',
    'sgs-toc--' . esc_attr( $toc_style ),
    'sgs-toc--' . esc_attr( $list_style ),
];

$wrapper = get_block_wrapper_attributes( [
    'class'              => implode( ' ', $classes ),
    'data-smooth-scroll' => $smooth_scroll ? 'true' : 'false',
    'data-scroll-offset' => (string) $scroll_offset,
    'data-scroll-spy'    => $scroll_spy ? 'true' : 'false',
    'aria-label'         => esc_attr( $toc_title ),
] );

// Colour helpers.
$title_style = '';
if ( $title_colour ) {
    $title_style = ' style="color:var(--wp--preset--color--' . esc_attr( $title_colour ) . ')"';
}

$link_style = '';
if ( $link_colour ) {
    $link_style = ' style="color:var(--wp--preset--color--' . esc_attr( $link_colour ) . ')"';
}

$active_data = '';
if ( $active_colour ) {
    $active_data = ' data-active-colour="var(--wp--preset--color--' . esc_attr( $active_colour ) . ')"';
}

$list_tag = 'numbered' === $list_style ? 'ol' : 'ul';

// Use <details>/<summary> for collapsible (progressive enhancement).
$open_attr = $default_collapsed ? '' : ' open';

ob_start();

if ( $collapsible ) {
    printf( '<nav %s%s>', $wrapper, $active_data );
    printf( '<details%s>', $open_attr );
    printf(
        '<summary class="sgs-toc__title"%s>%s</summary>',
        $title_style,
        esc_html( $toc_title )
    );
} else {
    printf( '<nav %s%s>', $wrapper, $active_data );
    if ( $toc_title ) {
        printf(
            '<p class="sgs-toc__title"%s>%s</p>',
            $title_style,
            esc_html( $toc_title )
        );
    }
}

printf( '<%s class="sgs-toc__list"%s>', $list_tag, $link_style );

foreach ( $headings as $heading ) {
    printf(
        '<li class="sgs-toc__item sgs-toc__item--h%d"><a class="sgs-toc__link" href="#%s">%s</a></li>',
        $heading['level'],
        esc_attr( $heading['id'] ),
        esc_html( $heading['text'] )
    );
}

printf( '</%s>', $list_tag );

if ( $collapsible ) {
    echo '</details>';
}

echo '</nav>';

echo ob_get_clean();
```

### Step 7: Create view.js

`plugins/sgs-blocks/src/blocks/table-of-contents/view.js`:

```js
/**
 * Table of Contents — frontend interactivity.
 *
 * Handles smooth scroll with offset, scroll spy (highlights active
 * heading), and collapse animation enhancement.
 *
 * @package SGS\Blocks
 */

function initTableOfContents() {
    const tocBlocks = document.querySelectorAll( '.sgs-toc' );
    const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    tocBlocks.forEach( ( toc ) => {
        const smoothScroll = toc.dataset.smoothScroll === 'true';
        const scrollOffset = parseInt( toc.dataset.scrollOffset || '0', 10 );
        const enableScrollSpy = toc.dataset.scrollSpy === 'true';
        const activeColour = toc.dataset.activeColour || '';

        const links = toc.querySelectorAll( '.sgs-toc__link' );

        // ─── Smooth scroll with offset ───
        if ( smoothScroll && ! prefersReduced ) {
            links.forEach( ( link ) => {
                link.addEventListener( 'click', ( e ) => {
                    const targetId = link.getAttribute( 'href' )?.slice( 1 );
                    if ( ! targetId ) {
                        return;
                    }
                    const target = document.getElementById( targetId );
                    if ( ! target ) {
                        return;
                    }

                    e.preventDefault();

                    const top =
                        target.getBoundingClientRect().top +
                        window.scrollY -
                        scrollOffset;

                    window.scrollTo( {
                        top,
                        behavior: 'smooth',
                    } );

                    // Update hash after scroll completes.
                    setTimeout( () => {
                        history.replaceState( null, '', '#' + targetId );
                    }, 500 );
                } );
            } );
        }

        // ─── Scroll spy ───
        if ( enableScrollSpy && links.length > 0 ) {
            const headingIds = Array.from( links )
                .map( ( link ) => link.getAttribute( 'href' )?.slice( 1 ) )
                .filter( Boolean );

            const headingElements = headingIds
                .map( ( id ) => document.getElementById( id ) )
                .filter( Boolean );

            if ( headingElements.length === 0 ) {
                return;
            }

            const setActive = ( activeId ) => {
                links.forEach( ( link ) => {
                    const linkId = link.getAttribute( 'href' )?.slice( 1 );
                    const isActive = linkId === activeId;

                    link.classList.toggle(
                        'sgs-toc__link--active',
                        isActive
                    );

                    if ( activeColour ) {
                        link.style.color = isActive
                            ? activeColour
                            : '';
                    }
                } );
            };

            // Use IntersectionObserver to detect which heading is visible.
            const observerMargin = `-${ scrollOffset + 1 }px 0px -66% 0px`;

            const observer = new IntersectionObserver(
                ( entries ) => {
                    // Find the topmost intersecting heading.
                    let topEntry = null;
                    for ( const entry of entries ) {
                        if ( entry.isIntersecting ) {
                            if (
                                ! topEntry ||
                                entry.boundingClientRect.top <
                                    topEntry.boundingClientRect.top
                            ) {
                                topEntry = entry;
                            }
                        }
                    }

                    if ( topEntry ) {
                        setActive( topEntry.target.id );
                    }
                },
                {
                    rootMargin: observerMargin,
                    threshold: 0,
                }
            );

            headingElements.forEach( ( el ) => observer.observe( el ) );
        }
    } );
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', initTableOfContents );
} else {
    initTableOfContents();
}
```

### Step 8: Create style.css

`plugins/sgs-blocks/src/blocks/table-of-contents/style.css`:

```css
/**
 * Table of Contents — shared styles (frontend + editor).
 */

/* ─── Base ─── */

.sgs-toc {
    --sgs-toc-link-indent: 1rem;
    font-size: var(--wp--preset--font-size--small, 0.875rem);
    line-height: 1.6;
}

/* ─── Card style ─── */

.sgs-toc--card {
    background: var(--wp--preset--color--surface, #fff);
    border: 1px solid var(--wp--preset--color--border-subtle, #e2e8f0);
    border-radius: var(--wp--custom--border-radius--md, 0.5rem);
    padding: var(--wp--preset--spacing--40, 1.5rem);
}

/* ─── Minimal style ─── */

.sgs-toc--minimal {
    border-left: 3px solid var(--wp--preset--color--primary, #0F7E80);
    padding-left: var(--wp--preset--spacing--30, 1rem);
}

/* ─── Flush style ─── */

.sgs-toc--flush {
    padding: 0;
}

/* ─── Title ─── */

.sgs-toc__title {
    font-weight: 600;
    font-size: var(--wp--preset--font-size--medium, 1rem);
    margin: 0 0 0.75rem;
    cursor: default;
}

/* Collapsible: title is a summary element */
.sgs-toc details > summary.sgs-toc__title {
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    user-select: none;
}

.sgs-toc details > summary.sgs-toc__title::after {
    content: "";
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.2s ease;
    flex-shrink: 0;
    margin-left: 0.5rem;
}

.sgs-toc details[open] > summary.sgs-toc__title::after {
    transform: rotate(45deg);
}

/* Remove default marker in Safari */
.sgs-toc details > summary.sgs-toc__title::-webkit-details-marker {
    display: none;
}

/* ─── List ─── */

.sgs-toc__list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.sgs-toc--numbered .sgs-toc__list {
    list-style: decimal;
    padding-left: 1.5em;
}

.sgs-toc--bulleted .sgs-toc__list {
    list-style: disc;
    padding-left: 1.5em;
}

/* ─── Items ─── */

.sgs-toc__item {
    margin: 0;
    padding: 0;
}

/* Indent based on heading level */
.sgs-toc__item--h3 {
    padding-left: var(--sgs-toc-link-indent);
}

.sgs-toc__item--h4 {
    padding-left: calc(var(--sgs-toc-link-indent) * 2);
}

.sgs-toc__item--h5 {
    padding-left: calc(var(--sgs-toc-link-indent) * 3);
}

.sgs-toc__item--h6 {
    padding-left: calc(var(--sgs-toc-link-indent) * 4);
}

/* ─── Links ─── */

.sgs-toc__link {
    display: block;
    padding: 0.25em 0;
    text-decoration: none;
    min-height: 44px;
    display: flex;
    align-items: center;
    transition: color 0.15s ease;
}

.sgs-toc__link:not([style*="color"]) {
    color: var(--wp--preset--color--text, #1e1e1e);
}

.sgs-toc__link:hover,
.sgs-toc__link:focus-visible {
    text-decoration: underline;
}

.sgs-toc__link--active {
    font-weight: 600;
}

.sgs-toc__link--active:not([style*="color"]) {
    color: var(--wp--preset--color--primary, #0F7E80);
}

/* ─── Empty state ─── */

.sgs-toc__empty {
    color: var(--wp--preset--color--text-muted, #555);
    font-style: italic;
    margin: 0;
}

/* ─── Responsive ─── */

@media (max-width: 600px) {
    .sgs-toc details:not([open]) {
        /* Collapsed by default on mobile unless open */
    }

    .sgs-toc__link {
        padding: 0.375em 0;
    }
}

/* ─── Reduced motion ─── */

@media (prefers-reduced-motion: reduce) {
    .sgs-toc details > summary.sgs-toc__title::after {
        transition: none;
    }

    .sgs-toc__link {
        transition: none;
    }
}
```

### Step 9: Create editor.css

`plugins/sgs-blocks/src/blocks/table-of-contents/editor.css`:

```css
/**
 * Table of Contents — editor-only styles.
 */

/* Prevent link clicks in editor */
.sgs-toc__link {
    pointer-events: none;
}

/* Subtle placeholder styling */
.sgs-toc__empty {
    border: 1px dashed var(--wp--preset--color--border-subtle, #ccc);
    padding: 1rem;
    text-align: center;
    border-radius: 4px;
}
```

### Step 10: Require heading-anchors.php in sgs-blocks.php

Add after the review-schema.php require:

```php
require_once __DIR__ . '/includes/heading-anchors.php';
```

### Step 11: Build, commit, deploy

```bash
cd plugins/sgs-blocks && npm run build
```

```bash
git add plugins/sgs-blocks/src/blocks/table-of-contents/ \
       plugins/sgs-blocks/includes/heading-anchors.php \
       plugins/sgs-blocks/src/utils/icons.js \
       plugins/sgs-blocks/sgs-blocks.php
git commit -m "feat(sgs-blocks): add Table of Contents block

Dynamic block with server-side heading detection. Parses post content
for H2-H6 tags, builds a navigable nested list with auto-generated
anchor IDs. Features: smooth scroll with offset, IntersectionObserver
scroll spy, collapsible via <details>/<summary>, three visual styles
(card/minimal/flush), heading level toggles, sgs-toc-ignore class
exclusion. Respects existing user-set anchor IDs.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

Deploy and purge cache (same SCP command).

### Step 12: Verify

1. Create a post with 5+ headings (H2, H3, H4) on the dev site
2. Insert an SGS Table of Contents block above the first heading
3. Confirm the editor preview shows all detected headings
4. Preview the post:
   - Confirm heading links scroll smoothly to each section
   - Confirm scroll spy highlights the active heading as you scroll
   - Confirm collapse/expand works on the ToC
   - Check page source: heading tags should have `id` attributes
5. Add `sgs-toc-ignore` class to one heading — confirm it disappears from the ToC
6. Set a heading level toggle (e.g. uncheck H4) — confirm H4 headings disappear
7. Test with `prefers-reduced-motion` enabled — confirm no animations
