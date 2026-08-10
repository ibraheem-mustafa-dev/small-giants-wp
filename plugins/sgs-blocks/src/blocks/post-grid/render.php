<?php
/**
 * Server-side render for sgs/post-grid.
 *
 * WS-4: outer wrapper now delegates to SGS_Container_Wrapper (kind='layout')
 * so the block mirrors sgs/container's grid/flex + align/maxWidth + gap controls.
 *
 * Card markup is produced by Post_Grid_REST::render_card() — the same method
 * the REST endpoint uses — so there is exactly one place where card HTML is defined.
 *
 * R-22-14: discriminators are EXPLICIT attributes. NEVER branch on empty($content).
 *
 * NOTE: class-post-grid-rest.php (REST controller) is NOT touched — wrapper only.
 *
 * @package SGS\Blocks
 *
 * @var array    $attributes Block attributes (sanitised by block.json defaults).
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block     The WP_Block instance.
 */

defined( 'ABSPATH' ) || exit;

use SGS\Blocks\Post_Grid_REST;
use SGS\Blocks\Grid_Pagination;

require_once dirname( __FILE__, 4 ) . '/includes/class-post-grid-rest.php';
require_once dirname( __FILE__, 4 ) . '/includes/render-helpers.php';
require_once dirname( __FILE__, 4 ) . '/includes/class-sgs-container-wrapper.php';
// dirname( __DIR__, 3 ) is the same directory as the dirname( __FILE__, 4 )
// calls above (__DIR__ === dirname( __FILE__ )); it matches the form used by
// the sibling grid blocks and keeps this new line phpcs-clean.
require_once dirname( __DIR__, 3 ) . '/includes/class-grid-pagination.php';

// CSS length/unit sanitiser — for free-text style-engine values concatenated
// into raw CSS declarations inside this block's scoped <style> tag. Strips
// everything except letters, digits, dot, and % so a Contributor-authored
// malicious value can never break out of the declaration. Mirrors sgs/hero's
// proven sanitiser (contract §D).
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / font-weight / font-style) — letters + hyphen only.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// -------------------------------------------------------------------------
// Normalise attributes with safe defaults.
// -------------------------------------------------------------------------
$post_type      = sanitize_key( $attributes['postType'] ?? 'post' );
$posts_per_page = absint( $attributes['postsPerPage'] ?? 6 );
$order_by       = sanitize_key( $attributes['orderBy'] ?? 'date' );
$order          = strtoupper( sanitize_key( $attributes['order'] ?? 'desc' ) );
$offset         = absint( $attributes['offset'] ?? 0 );
$exclude        = (bool) ( $attributes['excludeCurrent'] ?? true );

$categories = array_map( 'absint', (array) ( $attributes['categories'] ?? array() ) );
$tags       = array_map( 'absint', (array) ( $attributes['tags'] ?? array() ) );

$layout         = sanitize_key( $attributes['layout'] ?? 'grid' );
$card_style     = sanitize_key( $attributes['cardStyle'] ?? 'card' );
$columns        = absint( $attributes['columns'] ?? 3 );
$columns_tablet = absint( $attributes['columnsTablet'] ?? 2 );
$columns_mobile = absint( $attributes['columnsMobile'] ?? 1 );
// Gap: resolved via the shared helper (handles raw CSS lengths + back-compat).
// Falls back to "30px" matching the block.json default.
// Back-compat: pre-consolidation posts stored a bare digit string (e.g. "30")
// that render.php rendered as absint().'px'. Append "px" before the helper so
// sgs_container_gap_value() treats it as a raw CSS length, not a preset slug.
// `gap` is a TIER OBJECT (Spec 35 pass 1, 2026-08-10) - casting the array would emit
// "Array to string conversion" on every render plus literal `gap:Array`.
$gap_obj = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$gap_raw = (string) ( $gap_obj['desktop'] ?? '' );
if ( '' === $gap_raw ) {
	$gap_raw = '30px';
}
if ( preg_match( '/^\d+$/', $gap_raw ) ) {
	$gap_raw = $gap_raw . 'px';
}
$gap_css = sgs_container_gap_value( $gap_raw );
if ( '' === $gap_css ) {
	$gap_css = '30px';
}

$pagination      = sanitize_key( $attributes['pagination'] ?? 'none' );
$show_filters    = (bool) ( $attributes['showFilters'] ?? false );
$filter_taxonomy = sanitize_key( $attributes['filterTaxonomy'] ?? 'category' );

$hover_scale    = sanitize_text_field( $attributes['scaleHover'] ?? '' );
$hover_shadow   = sanitize_text_field( $attributes['shadowHover'] ?? '' );
$hover_img_zoom = (bool) ( $attributes['imageZoomHover'] ?? true );

// Hover colour shifts — resolved from token slug or raw CSS colour. Emitted as
// CSS custom properties on the wrapper (inherited by the card) and consumed by
// the `.sgs-post-grid__card:hover` rules in style.css. Mirrors the info-box
// `--sgs-hover-bg/text/border` pattern.
$hover_bg       = ! empty( $attributes['backgroundColourHover'] ) ? sgs_colour_value( $attributes['backgroundColourHover'] ) : '';
$hover_text     = ! empty( $attributes['textColourHover'] ) ? sgs_colour_value( $attributes['textColourHover'] ) : '';
$hover_border   = ! empty( $attributes['borderColourHover'] ) ? sgs_colour_value( $attributes['borderColourHover'] ) : '';
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

$carousel_autoplay    = (bool) ( $attributes['carouselAutoplay'] ?? false );
$carousel_speed       = absint( $attributes['carouselSpeed'] ?? 5000 );
$carousel_show_dots   = (bool) ( $attributes['carouselShowDots'] ?? true );
$carousel_show_arrows = (bool) ( $attributes['carouselShowArrows'] ?? true );

// Card bg colour CSS custom property.
$card_bg = '';
if ( ! empty( $attributes['cardBgColour'] ) ) {
	$card_bg = sgs_colour_value( $attributes['cardBgColour'] );
}

// -------------------------------------------------------------------------
// Build WP_Query — published posts only.
// -------------------------------------------------------------------------
$current_page = get_query_var( 'paged', 1 );
if ( ! $current_page ) {
	$current_page = 1;
}

$query_args = array(
	'post_type'      => $post_type,
	'posts_per_page' => $posts_per_page,
	'paged'          => $current_page,
	'orderby'        => $order_by,
	'order'          => $order,
	'offset'         => $offset + ( ( $current_page - 1 ) * $posts_per_page ),
	'post_status'    => 'publish',
);

if ( ! empty( $categories ) ) {
	$query_args['category__in'] = $categories;
}

if ( ! empty( $tags ) ) {
	$query_args['tag__in'] = $tags;
}

if ( $exclude ) {
	$current_post_id = get_the_ID();
	if ( $current_post_id ) {
		$query_args['post__not_in'] = array( $current_post_id );
	}
}

$query       = new WP_Query( $query_args );
$total_pages = (int) $query->max_num_pages;

// -------------------------------------------------------------------------
// Params array passed to render_card() — mirrors REST endpoint params.
// -------------------------------------------------------------------------
$card_params = array(
	'cardStyle'             => $card_style,
	'showImage'             => (bool) ( $attributes['showImage'] ?? true ),
	'showTitle'             => (bool) ( $attributes['showTitle'] ?? true ),
	'showExcerpt'           => (bool) ( $attributes['showExcerpt'] ?? true ),
	'showDate'              => (bool) ( $attributes['showDate'] ?? true ),
	'showAuthor'            => (bool) ( $attributes['showAuthor'] ?? false ),
	'showCategory'          => (bool) ( $attributes['showCategory'] ?? true ),
	'showReadMore'          => (bool) ( $attributes['showReadMore'] ?? true ),
	'readMoreText'          => sanitize_text_field( $attributes['readMoreText'] ?? __( 'Read more', 'sgs-blocks' ) ),
	'excerptLength'         => absint( $attributes['excerptLength'] ?? 20 ),
	'imageSize'             => sanitize_key( $attributes['imageSize'] ?? 'medium_large' ),
	'aspectRatio'           => sanitize_text_field( $attributes['aspectRatio'] ?? '16/10' ),
	'titleColour'           => $attributes['titleColour'] ?? 'primary',
	'excerptColour'         => $attributes['excerptColour'] ?? 'text',
	'metaColour'            => $attributes['metaColour'] ?? 'text-muted',
	'categoryBadgeColour'   => $attributes['categoryBadgeColour'] ?? 'text-inverse',
	'categoryBadgeBgColour' => $attributes['categoryBadgeBgColour'] ?? 'primary',
	'readMoreColour'        => $attributes['readMoreColour'] ?? 'primary',
);

// -------------------------------------------------------------------------
// Inline CSS custom properties — block-own grid vars (NOT overridden by helper).
// The helper owns gap/align/maxWidth; we keep the card-specific vars here.
// -------------------------------------------------------------------------
$extra_styles = array_filter(
	array_merge(
		array(
			'--sgs-columns-desktop:' . $columns,
			'--sgs-columns-tablet:' . $columns_tablet,
			'--sgs-columns-mobile:' . $columns_mobile,
			'--sgs-gap:' . $gap_css,
			$card_bg ? '--sgs-card-bg:' . $card_bg : '',
			$hover_scale ? '--sgs-hover-scale:' . esc_attr( $hover_scale ) : '',
			$hover_shadow ? '--sgs-hover-shadow:' . esc_attr( $hover_shadow ) : '',
			$hover_bg ? '--sgs-hover-bg:' . $hover_bg : '',
			$hover_text ? '--sgs-hover-text:' . $hover_text : '',
			$hover_border ? '--sgs-hover-border:' . $hover_border : '',
		),
		sgs_transition_vars( $attributes )
	)
);

// -------------------------------------------------------------------------
// Build query data for view.js hydration (AJAX pagination/filtering).
// -------------------------------------------------------------------------
$sgs_query_data = wp_json_encode(
	array_filter(
		array(
			'postType'              => $post_type,
			'postsPerPage'          => $posts_per_page,
			'orderBy'               => $order_by,
			'order'                 => strtolower( $order ),
			'categories'            => implode( ',', $categories ),
			'tags'                  => implode( ',', $tags ),
			'offset'                => $offset,
			'excludeCurrent'        => $exclude,
			'excludePost'           => $exclude ? (int) get_the_ID() : 0,
			'layout'                => $layout,
			'cardStyle'             => $card_style,
			'imageSize'             => $card_params['imageSize'],
			'showImage'             => $card_params['showImage'],
			'showTitle'             => $card_params['showTitle'],
			'showExcerpt'           => $card_params['showExcerpt'],
			'excerptLength'         => $card_params['excerptLength'],
			'showDate'              => $card_params['showDate'],
			'showAuthor'            => $card_params['showAuthor'],
			'showCategory'          => $card_params['showCategory'],
			'showReadMore'          => $card_params['showReadMore'],
			'readMoreText'          => $card_params['readMoreText'],
			'aspectRatio'           => $card_params['aspectRatio'],
			'titleColour'           => $card_params['titleColour'],
			'excerptColour'         => $card_params['excerptColour'],
			'metaColour'            => $card_params['metaColour'],
			'categoryBadgeColour'   => $card_params['categoryBadgeColour'],
			'categoryBadgeBgColour' => $card_params['categoryBadgeBgColour'],
			'readMoreColour'        => $card_params['readMoreColour'],
			'pagination'            => $pagination,
			'totalPages'            => $total_pages,
			'currentPage'           => (int) $current_page,
			'filterTaxonomy'        => $filter_taxonomy,
			'carouselAutoplay'      => $carousel_autoplay,
			'carouselSpeed'         => $carousel_speed,
			'carouselShowDots'      => $carousel_show_dots,
			'carouselShowArrows'    => $carousel_show_arrows,
		),
		static function ( $v ) {
			return '' !== $v && null !== $v;
		}
	)
);

// -------------------------------------------------------------------------
// WS-4: data-* attrs carried verbatim into the helper's extra_attrs.
// view.js reads data-sgs-query, data-hover-image-zoom, data-pagination,
// data-layout for AJAX hydration/carousel/filter init.
// -------------------------------------------------------------------------
$extra_attrs = array(
	'data-sgs-query'        => $sgs_query_data,
	'data-hover-image-zoom' => $hover_img_zoom ? 'true' : 'false',
	'data-pagination'       => $pagination,
	'data-layout'           => $layout,
);

// -------------------------------------------------------------------------
// Build interior HTML — live region + filters + post cards + controls.
// -------------------------------------------------------------------------
ob_start();

// --- Accessible live region for screen reader announcements.
echo '<div class="sgs-post-grid__live-region screen-reader-text" aria-live="polite" aria-atomic="true"></div>';

// --- Category/tag filter buttons.
if ( $show_filters ) :
	$filter_terms = get_terms(
		array(
			'taxonomy'   => $filter_taxonomy,
			'hide_empty' => true,
		)
	);

	if ( ! is_wp_error( $filter_terms ) && ! empty( $filter_terms ) ) :
		echo '<div class="sgs-post-grid__filters" role="group" aria-label="' . esc_attr__( 'Filter posts', 'sgs-blocks' ) . '">';
		echo '<button type="button" class="sgs-post-grid__filter sgs-post-grid__filter--active" data-filter-id="" aria-pressed="true">' . esc_html__( 'All', 'sgs-blocks' ) . '</button>';

		foreach ( $filter_terms as $term ) {
			echo '<button type="button" class="sgs-post-grid__filter" data-filter-id="' . esc_attr( $term->term_id ) . '" data-filter-taxonomy="' . esc_attr( $filter_taxonomy ) . '" aria-pressed="false">' . esc_html( $term->name ) . '</button>';
		}

		echo '</div>';
	endif;
endif;

/*
 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13), mirroring sgs/gallery.
 *
 * Emitted on `.sgs-post-grid__inner` — the element that actually scrolls
 * (style.css: `.sgs-post-grid--carousel .sgs-post-grid__inner` is the
 * `overflow-x: auto` + `scroll-snap-type: x mandatory` flex row), NOT the block
 * root, which never scrolls. Carousel-only: the grid/list/masonry layouts have
 * nothing to drag-scroll. The shared runtime
 * (shared/effects/gsap/fx-draggable.js) structurally re-verifies the element is
 * a genuine native horizontal scroller before touching it, so this stays safe
 * if a future layout change made the carousel non-scrolling.
 */
$sgs_pg_drag_to_scroll = (bool) ( $attributes['dragToScroll'] ?? false );
$sgs_pg_drag_momentum  = (bool) ( $attributes['dragMomentum'] ?? true );

// Infinite loop (Spec 38 §11 loop FR), mirroring sgs/gallery. A SEPARATE
// marker from `data-sgs-fx="draggable"` above — Bean's ruling that looping
// is an independent control, not a value of the shared `fx` grammar, and
// both can be present on the SAME element at once (a single `data-sgs-fx`
// attribute could never express that). `shared/effects/fx-carousel-loop.js`
// self-boots on `[data-sgs-loop]` and reads this; it never touches
// `gsap/fx-draggable.js`.
$sgs_pg_loop_carousel = (bool) ( $attributes['loopCarousel'] ?? false );

$sgs_pg_inner_fx_attr = '';
if ( 'carousel' === $layout && $sgs_pg_drag_to_scroll ) {
	$sgs_pg_inner_fx_attr = ' data-sgs-fx="draggable"';
	if ( ! $sgs_pg_drag_momentum ) {
		$sgs_pg_inner_fx_attr .= ' data-sgs-fx-momentum="false"';
	}
}
if ( 'carousel' === $layout && $sgs_pg_loop_carousel ) {
	$sgs_pg_inner_fx_attr .= ' data-sgs-loop="1"';
}

// --- Post cards grid.
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_pg_inner_fx_attr is built entirely from literal strings above, no dynamic value.
echo '<div class="sgs-post-grid__inner"' . $sgs_pg_inner_fx_attr . '>';
if ( $query->have_posts() ) {
	$card_index = 0;
	while ( $query->have_posts() ) {
		$query->the_post();
		$card_params['_card_index'] = $card_index;
		echo Post_Grid_REST::render_card( get_the_ID(), $card_params ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — render_card() escapes all output internally.
		$card_index++;
	}
	wp_reset_postdata();
} else {
	echo '<div class="sgs-post-grid__empty" role="status">';
	echo '<svg class="sgs-post-grid__empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
	echo '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
	echo '<polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
	echo '<line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
	echo '<line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
	echo '<polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
	echo '</svg>';
	echo '<h3 class="sgs-post-grid__empty-heading">' . esc_html__( 'No posts yet', 'sgs-blocks' ) . '</h3>';
	echo '<p class="sgs-post-grid__empty-text">' . esc_html__( 'The selected category or filter has no published posts. Check back soon or try a different selection.', 'sgs-blocks' ) . '</p>';
	echo '</div>';
}
echo '</div>';

// --- Carousel controls.
if ( 'carousel' === $layout ) {
	if ( $carousel_show_arrows ) {
		echo '<button type="button" class="sgs-post-grid__carousel-prev" aria-label="' . esc_attr__( 'Previous', 'sgs-blocks' ) . '">&#8249;</button>';
		echo '<button type="button" class="sgs-post-grid__carousel-next" aria-label="' . esc_attr__( 'Next', 'sgs-blocks' ) . '">&#8250;</button>';
	}
	if ( $carousel_show_dots ) {
		echo '<div class="sgs-post-grid__carousel-dots" role="tablist" aria-label="' . esc_attr__( 'Carousel navigation', 'sgs-blocks' ) . '"></div>';
	}
}

// --- Pagination.
// Delegated to the shared Grid_Pagination helper (2026-08-01). The markup this
// block emitted inline was the proven implementation, so it BECAME the helper:
// MODE_AJAX output is byte-identical to what stood here before, which keeps
// view.js's selectors (.sgs-post-grid__page-btn / __load-more / __sentinel and
// their data-* attributes) working untouched. sgs/card-grid now renders from
// the same helper in MODE_LINK, so there is exactly one copy of this markup.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- Grid_Pagination::render() escapes every interpolated value internally.
echo Grid_Pagination::render(
	array(
		'base_class'     => 'sgs-post-grid',
		'type'           => $pagination,
		'total_pages'    => $total_pages,
		'current_page'   => (int) $current_page,
		'mode'           => Grid_Pagination::MODE_AJAX,
		'nav_label'      => __( 'Posts pagination', 'sgs-blocks' ),
		'load_more_text' => __( 'Load more', 'sgs-blocks' ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

$inner_html = ob_get_clean();

// -------------------------------------------------------------------------
// No-inline contract (Spec 32): block.json declares color/typography/spacing/
// __experimentalBorder ALL with __experimentalSkipSerialization:true, so
// get_block_wrapper_attributes() (called inside SGS_Container_Wrapper::render()
// below) never auto-inlines them. Read the resolved values from
// $attributes['style'] here and emit them into POST-GRID'S OWN scoped <style>
// (composite caveat: do NOT pass these as wrapper `extra_styles` — that path
// inlines). Base spacing (padding/margin) is a SEPARATE mechanism the wrapper
// already handles scoped internally (reads $attributes['style']['spacing']
// directly) — not duplicated here.
// -------------------------------------------------------------------------
$uid      = 'sgs-post-grid-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-post-grid';

$post_grid_classes = array(
	'sgs-post-grid',
	'sgs-post-grid--' . $layout,
	$uid,
);

$responsive_css = '';

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$post_grid_style_engine_args = array();

	$color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $color_args ) ) {
		$post_grid_style_engine_args['color'] = $color_args;
	}

	$border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
			$border_args['radius'] = $sgs_css_length( $radius_raw );
		} elseif ( is_array( $radius_raw ) ) {
			$radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				if ( ! empty( $radius_raw[ $corner ] ) ) {
					$radius_clean[ $corner ] = $sgs_css_length( $radius_raw[ $corner ] );
				}
			}
			if ( ! empty( $radius_clean ) ) {
				$border_args['radius'] = $radius_clean;
			}
		}
	}
	if ( ! empty( $border_args ) ) {
		$post_grid_style_engine_args['border'] = $border_args;
	}

	if ( ! empty( $post_grid_style_engine_args ) ) {
		$post_grid_scoped_styles = wp_style_engine_get_styles(
			$post_grid_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $post_grid_scoped_styles['css'] ) ) {
			$responsive_css .= $post_grid_scoped_styles['css'];
		}
	}

	// Typography — declared selector (block.json selectors.typography) targets
	// .sgs-post-grid__title, so scope the rule there rather than $root_sel.
	$typography_args = array();
	if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
		$typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
	}
	if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
		$typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
	}
	if ( ! empty( $typography_args ) ) {
		$typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $typography_args ),
			array( 'selector' => $root_sel . ' .sgs-post-grid__title' )
		);
		if ( ! empty( $typography_scoped['css'] ) ) {
			$responsive_css .= $typography_scoped['css'];
		}
	}
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero, sgs/quote) so preset palette colours still
// resolve visually.
$post_grid_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$post_grid_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $post_grid_preset_text_slug ) {
	$post_grid_classes[] = 'has-text-color';
	$post_grid_classes[] = 'has-' . $post_grid_preset_text_slug . '-color';
}
if ( '' !== $post_grid_preset_bg_slug ) {
	$post_grid_classes[] = 'has-background';
	$post_grid_classes[] = 'has-' . $post_grid_preset_bg_slug . '-background-color';
}

// FR-32-4 as amended (D345): the per-instance card custom-property VALUES used
// to ride inline on EVERY card root (class-post-grid-rest.php). They are
// per-block-instance, not per-card, so they emit once here as a scoped
// descendant rule. Being a descendant selector on the block root, it also
// styles cards injected later by view.js AJAX pagination — those land inside
// `.sgs-post-grid__inner`, still within the root, and CSS applies to DOM added
// after the stylesheet was parsed. Built by the same helper the card renderer
// documents, so the two cannot drift apart.
$responsive_css .= $root_sel . ' .sgs-post-grid__card{' . Post_Grid_REST::card_vars_decls( $card_params ) . '}';

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote + sgs/button).
// Every value reaching $responsive_css is pre-sanitised ($sgs_css_length /
// $sgs_css_keyword / wp_style_engine_get_styles), so no un-sanitised value
// survives to here.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// -------------------------------------------------------------------------
// WS-4: emit via shared wrapper helper (kind='layout').
// Own block classes + CSS vars + data-* ride through opts.
//
// ⚠ ATTR-NAME COLLISION (root-caused live 2026-07-28, the "squished single
// post"): this block's `layout` attr is its OWN vocabulary
// (grid/list/masonry/carousel) — but the wrapper generically reads
// $attributes['layout'] as a container-layout instruction and was activating
// ITS grid engine on the root (3 columns via the same --sgs-columns vars),
// making .sgs-post-grid__inner a 380px grid ITEM whose own inner grid then
// laid out inside one wrapper track (double grid). The wrapper must see NO
// `layout` key: post-grid's grid belongs to __inner alone.
// -------------------------------------------------------------------------
$sgs_wrapper_attributes = $attributes;
unset( $sgs_wrapper_attributes['layout'] );
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$sgs_wrapper_attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $post_grid_classes,
		'extra_styles'  => array_values( $extra_styles ),
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
