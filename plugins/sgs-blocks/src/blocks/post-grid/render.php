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

require_once dirname( __FILE__, 4 ) . '/includes/class-post-grid-rest.php';
require_once dirname( __FILE__, 4 ) . '/includes/render-helpers.php';
require_once dirname( __FILE__, 4 ) . '/includes/class-sgs-container-wrapper.php';

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
$gap_raw = (string) ( $attributes['gap'] ?? '30px' );
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

$hover_scale    = sanitize_text_field( $attributes['hoverScale'] ?? '' );
$hover_shadow   = sanitize_text_field( $attributes['hoverShadow'] ?? '' );
$hover_img_zoom = (bool) ( $attributes['hoverImageZoom'] ?? true );

// Hover colour shifts — resolved from token slug or raw CSS colour. Emitted as
// CSS custom properties on the wrapper (inherited by the card) and consumed by
// the `.sgs-post-grid__card:hover` rules in style.css. Mirrors the info-box
// `--sgs-hover-bg/text/border` pattern.
$hover_bg       = ! empty( $attributes['hoverBackgroundColour'] ) ? sgs_colour_value( $attributes['hoverBackgroundColour'] ) : '';
$hover_text     = ! empty( $attributes['hoverTextColour'] ) ? sgs_colour_value( $attributes['hoverTextColour'] ) : '';
$hover_border   = ! empty( $attributes['hoverBorderColour'] ) ? sgs_colour_value( $attributes['hoverBorderColour'] ) : '';
$trans_duration = absint( $attributes['transitionDuration'] ?? 300 );
$trans_easing   = sanitize_text_field( $attributes['transitionEasing'] ?? 'ease' );

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

// --- Post cards grid.
echo '<div class="sgs-post-grid__inner">';
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
if ( 'none' !== $pagination && $total_pages > 1 ) {
	if ( 'standard' === $pagination ) {
		echo '<nav class="sgs-post-grid__pagination" aria-label="' . esc_attr__( 'Posts pagination', 'sgs-blocks' ) . '">';
		for ( $p = 1; $p <= $total_pages; $p++ ) {
			$current_class = $p === (int) $current_page ? ' sgs-post-grid__page-btn--current' : '';
			$aria_current  = $p === (int) $current_page ? ' aria-current="page"' : '';
			echo '<button type="button" class="sgs-post-grid__page-btn' . esc_attr( $current_class ) . '" data-page="' . esc_attr( $p ) . '"' . $aria_current . '>' . esc_html( $p ) . '</button>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — $aria_current is a hardcoded safe string.
		}
		echo '</nav>';
	} elseif ( 'load-more' === $pagination ) {
		echo '<div class="sgs-post-grid__load-more-wrap">';
		echo '<button type="button" class="sgs-post-grid__load-more" data-current-page="1" data-total-pages="' . esc_attr( $total_pages ) . '">' . esc_html__( 'Load more', 'sgs-blocks' ) . '</button>';
		echo '</div>';
	} elseif ( 'infinite' === $pagination ) {
		echo '<div class="sgs-post-grid__sentinel" aria-hidden="true" data-current-page="1" data-total-pages="' . esc_attr( $total_pages ) . '"></div>';
	}
}

$inner_html = ob_get_clean();

// -------------------------------------------------------------------------
// WS-4: emit via shared wrapper helper (kind='layout').
// Own block classes + CSS vars + data-* ride through opts.
// -------------------------------------------------------------------------
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => array(
			'sgs-post-grid',
			'sgs-post-grid--' . $layout,
		),
		'extra_styles'  => array_values( $extra_styles ),
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
