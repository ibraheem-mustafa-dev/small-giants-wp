# Post Grid Block (`sgs/post-grid`) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Also invoke: `/wp-block-development`, `/wp-rest-api`, `/wp-interactivity-api`

**Goal:** Build the most complex block in the SGS framework — a dynamic post query block with 4 layouts, AJAX filtering, 3 pagination modes, and full editor customisation controls.

**Architecture:** Dynamic block (render.php + view.js) with a custom REST API endpoint for AJAX pagination/filtering. Server renders the initial state; JavaScript handles subsequent page loads via fetch(). CSS scroll-snap for carousel layout. No external libraries.

**Tech Stack:** PHP 8.1+ (render.php, REST endpoint), ES modules (view.js as viewScriptModule), CSS Grid/Flexbox, WordPress Block Editor API, WP_Query, REST API.

**Performance Budget:** < 8KB CSS, < 5KB JS (minified), < 200ms server response for REST endpoint.

---

## Architecture Overview

```
src/blocks/post-grid/
├── block.json          # Metadata, ~40 attributes, supports, viewScriptModule
├── index.js            # Block registration
├── edit.js             # Editor component with live preview via useEntityRecords
├── save.js             # Returns null (dynamic block)
├── render.php          # Server-side WP_Query rendering
├── view.js             # Frontend AJAX pagination/filtering (viewScriptModule)
├── style.css           # Frontend + editor styles (all 4 layouts)
└── editor.css          # Editor-only styles

includes/
├── class-post-grid-rest.php   # REST API endpoint for AJAX pagination
└── render-helpers.php         # Already exists — colour/font-size resolvers
```

### Data Flow

```
Editor:
  useEntityRecords('postType', postType, queryArgs)
  → Live preview in editor, no server round-trip
  → Inspector controls update attributes → preview re-renders

Frontend (initial):
  render.php → WP_Query($args) → HTML with data-* attributes
  → viewScriptModule hydrates pagination/filter controls

Frontend (AJAX):
  User clicks page/filter → view.js fetches REST endpoint
  → GET /sgs-blocks/v1/posts?page=2&category=5&layout=grid
  → Response: { html: "...", totalPages: 5, currentPage: 2 }
  → view.js replaces grid content + updates pagination UI
  → aria-live region announces "Page 2 of 5 loaded"
```

---

## Task 1: Block Scaffolding — block.json + index.js + save.js

**Files:**
- Create: `src/blocks/post-grid/block.json`
- Create: `src/blocks/post-grid/index.js`
- Create: `src/blocks/post-grid/save.js`

### block.json

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "sgs/post-grid",
  "version": "0.1.0",
  "title": "SGS Post Grid",
  "category": "sgs-content",
  "description": "Display posts in grid, list, masonry, or carousel layouts with AJAX filtering and pagination.",
  "keywords": ["posts", "grid", "blog", "query", "news", "articles", "cards", "masonry", "carousel"],
  "textdomain": "sgs-blocks",
  "icon": "grid-view",
  "supports": {
    "align": ["wide", "full"],
    "anchor": true,
    "html": false,
    "color": {
      "background": true,
      "text": true
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
  "selectors": {
    "root": ".sgs-post-grid",
    "typography": ".sgs-post-grid__title"
  },
  "attributes": {
    "postType": {
      "type": "string",
      "default": "post"
    },
    "postsPerPage": {
      "type": "number",
      "default": 6
    },
    "orderBy": {
      "type": "string",
      "default": "date"
    },
    "order": {
      "type": "string",
      "default": "desc"
    },
    "categories": {
      "type": "array",
      "default": []
    },
    "tags": {
      "type": "array",
      "default": []
    },
    "excludeCurrent": {
      "type": "boolean",
      "default": true
    },
    "offset": {
      "type": "number",
      "default": 0
    },
    "layout": {
      "type": "string",
      "default": "grid",
      "enum": ["grid", "list", "masonry", "carousel"]
    },
    "cardStyle": {
      "type": "string",
      "default": "card",
      "enum": ["card", "flat", "overlay", "minimal"]
    },
    "columns": {
      "type": "number",
      "default": 3
    },
    "columnsTablet": {
      "type": "number",
      "default": 2
    },
    "columnsMobile": {
      "type": "number",
      "default": 1
    },
    "gap": {
      "type": "string",
      "default": "30"
    },
    "aspectRatio": {
      "type": "string",
      "default": "16/10"
    },
    "imageSize": {
      "type": "string",
      "default": "medium_large"
    },
    "showImage": {
      "type": "boolean",
      "default": true
    },
    "showTitle": {
      "type": "boolean",
      "default": true
    },
    "showExcerpt": {
      "type": "boolean",
      "default": true
    },
    "excerptLength": {
      "type": "number",
      "default": 20
    },
    "showDate": {
      "type": "boolean",
      "default": true
    },
    "showAuthor": {
      "type": "boolean",
      "default": false
    },
    "showCategory": {
      "type": "boolean",
      "default": true
    },
    "showReadMore": {
      "type": "boolean",
      "default": true
    },
    "readMoreText": {
      "type": "string",
      "default": "Read more"
    },
    "pagination": {
      "type": "string",
      "default": "none",
      "enum": ["none", "standard", "load-more", "infinite"]
    },
    "showFilters": {
      "type": "boolean",
      "default": false
    },
    "filterTaxonomy": {
      "type": "string",
      "default": "category"
    },
    "titleColour": {
      "type": "string"
    },
    "titleFontSize": {
      "type": "string"
    },
    "excerptColour": {
      "type": "string"
    },
    "metaColour": {
      "type": "string"
    },
    "categoryBadgeColour": {
      "type": "string"
    },
    "categoryBadgeBgColour": {
      "type": "string"
    },
    "readMoreColour": {
      "type": "string"
    },
    "cardBgColour": {
      "type": "string"
    },
    "hoverBackgroundColour": {
      "type": "string"
    },
    "hoverTextColour": {
      "type": "string"
    },
    "hoverBorderColour": {
      "type": "string"
    },
    "hoverScale": {
      "type": "string",
      "default": ""
    },
    "hoverShadow": {
      "type": "string",
      "default": ""
    },
    "hoverImageZoom": {
      "type": "boolean",
      "default": true
    },
    "transitionDuration": {
      "type": "string",
      "default": "300"
    },
    "transitionEasing": {
      "type": "string",
      "default": "ease"
    },
    "carouselAutoplay": {
      "type": "boolean",
      "default": false
    },
    "carouselSpeed": {
      "type": "number",
      "default": 5000
    },
    "carouselShowDots": {
      "type": "boolean",
      "default": true
    },
    "carouselShowArrows": {
      "type": "boolean",
      "default": true
    }
  },
  "editorScript": "file:./index.js",
  "editorStyle": "file:./index.css",
  "style": "file:./style-index.css",
  "viewScriptModule": "file:./view.js",
  "render": "file:./render.php"
}
```

### index.js

```javascript
import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import metadata from './block.json';

registerBlockType( metadata.name, {
  edit,
  save: () => null,
} );
```

### save.js

```javascript
export default function save() {
  return null;
}
```

**Commit:** `feat(sgs-blocks): scaffold post-grid block with 42 attributes`

---

## Task 2: REST API Endpoint

**Files:**
- Create: `includes/class-post-grid-rest.php`
- Modify: `includes/class-sgs-blocks.php` (register the REST class)

### class-post-grid-rest.php

The endpoint accepts GET requests with query parameters matching the block's attributes. Returns pre-rendered HTML cards plus pagination metadata. This avoids the client needing to parse JSON posts and rebuild markup — the server owns the template.

```php
<?php
/**
 * REST API endpoint for Post Grid AJAX pagination and filtering.
 *
 * GET /sgs-blocks/v1/posts
 *
 * Returns pre-rendered HTML cards plus pagination metadata.
 * Public endpoint (no auth required) — serves front-end visitors.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

class Post_Grid_REST {

    const NAMESPACE = 'sgs-blocks/v1';
    const ROUTE     = '/posts';

    public static function register(): void {
        add_action( 'rest_api_init', [ __CLASS__, 'register_routes' ] );
    }

    public static function register_routes(): void {
        register_rest_route(
            self::NAMESPACE,
            self::ROUTE,
            [
                'methods'             => 'GET',
                'callback'            => [ __CLASS__, 'get_posts' ],
                'permission_callback' => '__return_true',
                'args'                => self::get_args(),
            ]
        );
    }

    private static function get_args(): array {
        return [
            'postType' => [
                'type'              => 'string',
                'default'           => 'post',
                'sanitize_callback' => 'sanitize_key',
            ],
            'page' => [
                'type'              => 'integer',
                'default'           => 1,
                'minimum'           => 1,
                'sanitize_callback' => 'absint',
            ],
            'postsPerPage' => [
                'type'              => 'integer',
                'default'           => 6,
                'minimum'           => 1,
                'maximum'           => 24,
                'sanitize_callback' => 'absint',
            ],
            'orderBy' => [
                'type'              => 'string',
                'default'           => 'date',
                'enum'              => [ 'date', 'title', 'modified', 'rand', 'comment_count' ],
                'sanitize_callback' => 'sanitize_key',
            ],
            'order' => [
                'type'              => 'string',
                'default'           => 'desc',
                'enum'              => [ 'asc', 'desc' ],
                'sanitize_callback' => 'sanitize_key',
            ],
            'categories' => [
                'type'    => 'string',
                'default' => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'tags' => [
                'type'    => 'string',
                'default' => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'excludeCurrent' => [
                'type'    => 'boolean',
                'default' => false,
            ],
            'excludePost' => [
                'type'              => 'integer',
                'default'           => 0,
                'sanitize_callback' => 'absint',
            ],
            'offset' => [
                'type'              => 'integer',
                'default'           => 0,
                'sanitize_callback' => 'absint',
            ],
            'layout' => [
                'type'    => 'string',
                'default' => 'grid',
                'enum'    => [ 'grid', 'list', 'masonry', 'carousel' ],
                'sanitize_callback' => 'sanitize_key',
            ],
            'cardStyle' => [
                'type'    => 'string',
                'default' => 'card',
                'enum'    => [ 'card', 'flat', 'overlay', 'minimal' ],
                'sanitize_callback' => 'sanitize_key',
            ],
            'imageSize' => [
                'type'              => 'string',
                'default'           => 'medium_large',
                'sanitize_callback' => 'sanitize_key',
            ],
            'showImage' => [
                'type'    => 'boolean',
                'default' => true,
            ],
            'showTitle' => [
                'type'    => 'boolean',
                'default' => true,
            ],
            'showExcerpt' => [
                'type'    => 'boolean',
                'default' => true,
            ],
            'excerptLength' => [
                'type'              => 'integer',
                'default'           => 20,
                'sanitize_callback' => 'absint',
            ],
            'showDate' => [
                'type'    => 'boolean',
                'default' => true,
            ],
            'showAuthor' => [
                'type'    => 'boolean',
                'default' => false,
            ],
            'showCategory' => [
                'type'    => 'boolean',
                'default' => true,
            ],
            'showReadMore' => [
                'type'    => 'boolean',
                'default' => true,
            ],
            'readMoreText' => [
                'type'              => 'string',
                'default'           => 'Read more',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'aspectRatio' => [
                'type'              => 'string',
                'default'           => '16/10',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'titleColour' => [
                'type'              => 'string',
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'excerptColour' => [
                'type'              => 'string',
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'metaColour' => [
                'type'              => 'string',
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'categoryBadgeColour' => [
                'type'              => 'string',
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'categoryBadgeBgColour' => [
                'type'              => 'string',
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'readMoreColour' => [
                'type'              => 'string',
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ];
    }

    public static function get_posts( \WP_REST_Request $request ): \WP_REST_Response {
        $params = $request->get_params();

        // Build WP_Query args.
        $query_args = [
            'post_type'      => $params['postType'],
            'posts_per_page' => $params['postsPerPage'],
            'paged'          => $params['page'],
            'orderby'        => $params['orderBy'],
            'order'          => strtoupper( $params['order'] ),
            'offset'         => $params['offset'] + ( ( $params['page'] - 1 ) * $params['postsPerPage'] ),
            'post_status'    => 'publish',
        ];

        // Category filter (comma-separated IDs).
        if ( ! empty( $params['categories'] ) ) {
            $query_args['category__in'] = array_map( 'absint', explode( ',', $params['categories'] ) );
        }

        // Tag filter (comma-separated IDs).
        if ( ! empty( $params['tags'] ) ) {
            $query_args['tag__in'] = array_map( 'absint', explode( ',', $params['tags'] ) );
        }

        // Exclude current post.
        if ( $params['excludeCurrent'] && ! empty( $params['excludePost'] ) ) {
            $query_args['post__not_in'] = [ absint( $params['excludePost'] ) ];
        }

        $query = new \WP_Query( $query_args );

        // Build HTML cards using the shared render function.
        $html = '';
        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $html .= self::render_card( get_the_ID(), $params );
            }
            wp_reset_postdata();
        }

        return new \WP_REST_Response(
            [
                'html'        => $html,
                'totalPages'  => (int) $query->max_num_pages,
                'currentPage' => (int) $params['page'],
                'totalPosts'  => (int) $query->found_posts,
            ],
            200
        );
    }

    /**
     * Render a single post card.
     *
     * Shared between render.php (initial load) and REST endpoint (AJAX).
     * This method is public static so render.php can call it directly.
     */
    public static function render_card( int $post_id, array $params ): string {
        require_once dirname( __FILE__ ) . '/render-helpers.php';

        $card_style    = $params['cardStyle'] ?? 'card';
        $show_image    = $params['showImage'] ?? true;
        $show_title    = $params['showTitle'] ?? true;
        $show_excerpt  = $params['showExcerpt'] ?? true;
        $show_date     = $params['showDate'] ?? true;
        $show_author   = $params['showAuthor'] ?? false;
        $show_category = $params['showCategory'] ?? true;
        $show_readmore = $params['showReadMore'] ?? true;
        $readmore_text = $params['readMoreText'] ?? 'Read more';
        $excerpt_len   = $params['excerptLength'] ?? 20;
        $image_size    = $params['imageSize'] ?? 'medium_large';
        $aspect_ratio  = $params['aspectRatio'] ?? '16/10';

        // Per-element colour styles.
        $title_style    = ! empty( $params['titleColour'] ) ? ' style="color:' . sgs_colour_value( $params['titleColour'] ) . '"' : '';
        $excerpt_style  = ! empty( $params['excerptColour'] ) ? ' style="color:' . sgs_colour_value( $params['excerptColour'] ) . '"' : '';
        $meta_style     = ! empty( $params['metaColour'] ) ? ' style="color:' . sgs_colour_value( $params['metaColour'] ) . '"' : '';
        $badge_style    = '';
        $badge_styles   = [];
        if ( ! empty( $params['categoryBadgeColour'] ) ) {
            $badge_styles[] = 'color:' . sgs_colour_value( $params['categoryBadgeColour'] );
        }
        if ( ! empty( $params['categoryBadgeBgColour'] ) ) {
            $badge_styles[] = 'background-color:' . sgs_colour_value( $params['categoryBadgeBgColour'] );
        }
        if ( $badge_styles ) {
            $badge_style = ' style="' . implode( ';', $badge_styles ) . '"';
        }
        $readmore_style = ! empty( $params['readMoreColour'] ) ? ' style="color:' . sgs_colour_value( $params['readMoreColour'] ) . '"' : '';

        $permalink = esc_url( get_permalink( $post_id ) );
        $title     = esc_html( get_the_title( $post_id ) );

        // Build card HTML.
        $card = '<article class="sgs-post-grid__card sgs-post-grid__card--' . esc_attr( $card_style ) . '">';

        // Image.
        if ( $show_image && has_post_thumbnail( $post_id ) ) {
            $card .= sprintf(
                '<a href="%s" class="sgs-post-grid__image-link" tabindex="-1" aria-hidden="true"><div class="sgs-post-grid__image" style="aspect-ratio:%s">%s</div></a>',
                $permalink,
                esc_attr( $aspect_ratio ),
                get_the_post_thumbnail( $post_id, $image_size, [ 'class' => 'sgs-post-grid__img', 'loading' => 'lazy' ] )
            );

            // Category badge (overlay on image for card/overlay styles).
            if ( $show_category && in_array( $card_style, [ 'card', 'overlay' ], true ) ) {
                $cats = get_the_category( $post_id );
                if ( ! empty( $cats ) ) {
                    $card .= sprintf(
                        '<span class="sgs-post-grid__badge"%s>%s</span>',
                        $badge_style,
                        esc_html( $cats[0]->name )
                    );
                }
            }
        }

        // Content wrapper.
        $card .= '<div class="sgs-post-grid__content">';

        // Meta (date, author) above title.
        if ( $show_date || $show_author ) {
            $card .= '<div class="sgs-post-grid__meta"' . $meta_style . '>';
            if ( $show_date ) {
                $card .= sprintf(
                    '<time datetime="%s">%s</time>',
                    esc_attr( get_the_date( 'c', $post_id ) ),
                    esc_html( get_the_date( '', $post_id ) )
                );
            }
            if ( $show_author ) {
                $card .= sprintf(
                    '<span class="sgs-post-grid__author">%s</span>',
                    esc_html( get_the_author_meta( 'display_name', get_post_field( 'post_author', $post_id ) ) )
                );
            }
            $card .= '</div>';
        }

        // Category inline (for flat/minimal styles).
        if ( $show_category && in_array( $card_style, [ 'flat', 'minimal' ], true ) ) {
            $cats = get_the_category( $post_id );
            if ( ! empty( $cats ) ) {
                $card .= sprintf(
                    '<span class="sgs-post-grid__category"%s>%s</span>',
                    $badge_style,
                    esc_html( $cats[0]->name )
                );
            }
        }

        // Title.
        if ( $show_title ) {
            $card .= sprintf(
                '<h3 class="sgs-post-grid__title"><a href="%s"%s>%s</a></h3>',
                $permalink,
                $title_style,
                $title
            );
        }

        // Excerpt.
        if ( $show_excerpt ) {
            $excerpt = wp_trim_words( get_the_excerpt( $post_id ), $excerpt_len, '&hellip;' );
            $card .= sprintf(
                '<p class="sgs-post-grid__excerpt"%s>%s</p>',
                $excerpt_style,
                esc_html( $excerpt )
            );
        }

        // Read more.
        if ( $show_readmore ) {
            $card .= sprintf(
                '<a href="%s" class="sgs-post-grid__readmore"%s>%s <span aria-hidden="true">&rarr;</span></a>',
                $permalink,
                $readmore_style,
                esc_html( $readmore_text )
            );
        }

        $card .= '</div>'; // .sgs-post-grid__content
        $card .= '</article>';

        return $card;
    }
}
```

**Commit:** `feat(sgs-blocks): add Post Grid REST endpoint for AJAX pagination`

---

## Task 3: Server-Side Render (render.php)

**Files:**
- Create: `src/blocks/post-grid/render.php`

The render.php builds the initial page load HTML. It uses the same `Post_Grid_REST::render_card()` method for card rendering (DRY), and outputs data-* attributes for the view.js to hydrate.

Key decisions:
- Passes query params as `data-sgs-query` JSON attribute so view.js knows what to request
- Renders filter buttons server-side (categories/tags from the query)
- Renders pagination server-side for initial state (SEO-friendly)
- Skeleton placeholders are CSS-only (no JS needed for initial load)

**Commit:** `feat(sgs-blocks): add Post Grid render.php with WP_Query`

---

## Task 4: Frontend Interactivity (view.js)

**Files:**
- Create: `src/blocks/post-grid/view.js`

The viewScriptModule handles:
1. **Standard pagination** — replaces grid content, updates URL with `?pg=N` for shareable links
2. **Load More** — appends new cards to existing grid, hides button when no more pages
3. **Infinite Scroll** — IntersectionObserver on a sentinel element, triggers load when visible
4. **Category/tag filtering** — replaces grid content, resets to page 1
5. **Carousel controls** — prev/next arrows, dots, autoplay (reuses testimonial-slider pattern)
6. **Screen reader announcements** — aria-live region announces page/filter changes
7. **Loading states** — skeleton shimmer during fetch, disabled buttons

Target: < 5KB minified. No external libraries.

**Commit:** `feat(sgs-blocks): add Post Grid frontend AJAX and carousel`

---

## Task 5: CSS — All 4 Layouts + 4 Card Styles

**Files:**
- Create: `src/blocks/post-grid/style.css`
- Create: `src/blocks/post-grid/editor.css`

### Layout CSS architecture:

```
.sgs-post-grid--grid      → CSS Grid, repeat(var(--columns), 1fr)
.sgs-post-grid--list      → CSS Grid, 1 column, card is horizontal (image left, content right)
.sgs-post-grid--masonry   → CSS columns (column-count: var(--columns)), break-inside: avoid
.sgs-post-grid--carousel  → Flexbox + scroll-snap, overflow-x: auto
```

### Card style CSS architecture:

```
.sgs-post-grid__card--card     → White bg, border-radius, shadow, image top
.sgs-post-grid__card--flat     → No shadow, no border, clean minimal
.sgs-post-grid__card--overlay  → Image fills card, content overlays bottom with gradient
.sgs-post-grid__card--minimal  → No image container, text-focused, thin separator
```

### Hover effects (from master audit):

```css
/* Configurable via CSS custom properties set from attributes */
.sgs-post-grid__card {
  --sgs-hover-scale: 1;
  --sgs-hover-shadow: none;
  --sgs-transition-duration: 300ms;
  --sgs-transition-easing: ease;
  transition: transform var(--sgs-transition-duration) var(--sgs-transition-easing),
              box-shadow var(--sgs-transition-duration) var(--sgs-transition-easing);
}

.sgs-post-grid__card:hover {
  transform: scale(var(--sgs-hover-scale));
  box-shadow: var(--sgs-hover-shadow);
}

/* Image zoom on hover (overflow:hidden + scale) */
.sgs-post-grid[data-hover-image-zoom="true"] .sgs-post-grid__card:hover .sgs-post-grid__img {
  transform: scale(1.05);
}

@media (prefers-reduced-motion: reduce) {
  .sgs-post-grid__card,
  .sgs-post-grid__img {
    transition: none !important;
    transform: none !important;
  }
}
```

### Responsive:

```css
@media (max-width: 599px) {
  .sgs-post-grid--grid,
  .sgs-post-grid--masonry {
    --sgs-columns: var(--sgs-columns-mobile, 1);
  }
  .sgs-post-grid--list .sgs-post-grid__card {
    grid-template-columns: 1fr; /* Stack on mobile */
  }
}

@media (600px <= width <= 1023px) {
  .sgs-post-grid--grid,
  .sgs-post-grid--masonry {
    --sgs-columns: var(--sgs-columns-tablet, 2);
  }
}
```

### Skeleton loading:

```css
.sgs-post-grid__card--skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: sgs-shimmer 1.5s infinite;
  border-radius: inherit;
  min-height: 300px;
}

@keyframes sgs-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sgs-post-grid__card--skeleton {
    animation: none;
    background: #f0f0f0;
  }
}
```

**Commit:** `feat(sgs-blocks): add Post Grid CSS for all layouts and card styles`

---

## Task 6: Editor Component (edit.js)

**Files:**
- Create: `src/blocks/post-grid/edit.js`

The editor component is the largest file. It uses `useEntityRecords` for live post preview (no ServerSideRender round-trips), with inspector panels for:

### Inspector Panel Structure:

1. **Query** — Post type, posts per page, order, categories, tags, offset, exclude current
2. **Layout** — Layout selector (grid/list/masonry/carousel), columns per breakpoint, gap, aspect ratio
3. **Content** — Toggle show/hide for each element (image, title, excerpt, date, author, category, read more), excerpt length, read more text, image size
4. **Card Style** — Card style selector (card/flat/overlay/minimal)
5. **Pagination** — Pagination type (none/standard/load-more/infinite), filter toggle, filter taxonomy
6. **Colours** — Per-element: title, excerpt, meta, category badge (text + bg), read more, card bg
7. **Hover Effects** — Background, text, border colour, scale, shadow, image zoom, transition duration/easing
8. **Carousel** (shown only when layout=carousel) — Autoplay, speed, dots, arrows

Uses `DesignTokenPicker` for all colour controls. Uses `ResponsiveControl` for columns. Uses `FormTokenField` for category/tag selection.

**Commit:** `feat(sgs-blocks): add Post Grid editor with live preview and inspector`

---

## Task 7: Register REST Class + Build + Test

**Files:**
- Modify: `includes/class-sgs-blocks.php` (add `Post_Grid_REST::register()`)

### Steps:

1. Add `require_once` and `Post_Grid_REST::register()` to the main plugin class
2. Run `npm run build` from `plugins/sgs-blocks/`
3. Deploy to dev site
4. Test in block editor: insert block, verify preview renders with real posts
5. Test on frontend: verify 4 layouts render correctly
6. Test AJAX: click pagination, verify content swaps
7. Test filters: click category, verify grid updates
8. Test carousel: verify arrows, dots, autoplay, keyboard nav
9. Test accessibility: Tab through all interactive elements, verify aria-live announcements
10. Test responsive: 375px, 768px, 1440px viewports

**Commit:** `feat(sgs-blocks): integrate Post Grid and verify all layouts`

---

## Task 8: Build Verification + Deploy

1. `cd plugins/sgs-blocks && npm run build`
2. Verify `build/blocks/post-grid/` contains: `block.json`, `index.js`, `render.php`, `view.js`, `style-index.css`, `index.css`
3. Deploy plugin files
4. Clear LiteSpeed cache
5. Reset OPcache
6. Visual verification at 375px, 768px, 1440px using Playwright

**Commit + Deploy**

---

## Implementation Notes

### Critical Patterns to Follow

1. **Card rendering is shared** — `Post_Grid_REST::render_card()` is called by both `render.php` and the REST endpoint. Never duplicate card HTML.

2. **CSS custom properties for editor values** — All configurable values (columns, gap, colours, hover effects) are set as `--sgs-*` custom properties on the wrapper element. CSS reads these properties. This means the same CSS works for both server-rendered and AJAX-loaded content.

3. **`fetchpriority="high"`** on the first image — The first card's image in the grid should get `fetchpriority="high"` and `loading="eager"` if it's above the fold. All subsequent images get `loading="lazy"`.

4. **URL state for pagination** — Standard pagination mode updates `?pg=N` in the URL using `history.replaceState()`. This makes paginated pages shareable and bookmarkable without a full page reload.

5. **Filter "All" button** — When filters are shown, the first button is always "All" (no filter). Active filter gets `aria-pressed="true"`.

6. **No jQuery** — Vanilla JS only. `fetch()` for REST calls. `IntersectionObserver` for infinite scroll. `scrollTo()` for carousel.

### File Size Targets

| File | Target | Rationale |
|------|--------|-----------|
| style.css | < 8KB | 4 layouts + 4 card styles + responsive + hover + skeleton |
| view.js | < 5KB | Pagination + filters + carousel + AJAX + a11y |
| editor.css | < 2KB | Editor-only preview styles |
| edit.js | < 15KB | Largest file; 8 inspector panels + live preview |

### Dependencies

- `../../utils` — colourVar, fontSizeVar, spacingVar
- `../../components/DesignTokenPicker` — colour pickers
- `../../components/ResponsiveControl` — breakpoint switcher
- `includes/render-helpers.php` — sgs_colour_value, sgs_font_size_value
