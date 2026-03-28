<?php
/**
 * Server-side render for sgs/post-grid.
 *
 * Builds the initial HTML with WP_Query. Card markup is produced by
 * Post_Grid_REST::render_card() — the same method the REST endpoint uses —
 * so there is exactly one place where card HTML is defined.
 *
 * @package SGS\Blocks
 *
 * @var array  $attributes Block attributes (sanitised by block.json defaults).
 * @var string $content    Inner block content (unused — dynamic block).
 * @var WP_Block $block    The WP_Block instance.
 */

defined( 'ABSPATH' ) || exit;

use SGS\Blocks\Post_Grid_REST;

require_once dirname( __FILE__, 4 ) . '/includes/class-post-grid-rest.php';
require_once dirname( __FILE__, 4 ) . '/includes/render-helpers.php';

// -------------------------------------------------------------------------
// Normalise attributes with safe defaults.
// -------------------------------------------------------------------------
$post_type      = sanitize_key( $attributes['postType'] ?? 'post' );
$posts_per_page = absint( $attributes['postsPerPage'] ?? 6 );
$order_by       = sanitize_key( $attributes['orderBy'] ?? 'date' );
$order          = strtoupper( sanitize_key( $attributes['order'] ?? 'desc' ) );
$offset         = absint( $attributes['offset'] ?? 0 );
$exclude        = (bool) ( $attributes['excludeCurrent'] ?? true );

$categories = array_map( 'absint', (array) ( $attributes['categories'] ?? [] ) );
$tags       = array_map( 'absint', (array) ( $attributes['tags'] ?? [] ) );

$layout         = sanitize_key( $attributes['layout'] ?? 'grid' );
$card_style     = sanitize_key( $attributes['cardStyle'] ?? 'card' );
$columns        = absint( $attributes['columns'] ?? 3 );
$columns_tablet = absint( $attributes['columnsTablet'] ?? 2 );
$columns_mobile = absint( $attributes['columnsMobile'] ?? 1 );
$gap            = absint( $attributes['gap'] ?? 30 );

$pagination      = sanitize_key( $attributes['pagination'] ?? 'none' );
$show_filters    = (bool) ( $attributes['showFilters'] ?? false );
$filter_taxonomy = sanitize_key( $attributes['filterTaxonomy'] ?? 'category' );

$hover_scale    = sanitize_text_field( $attributes['hoverScale'] ?? '' );
$hover_shadow   = sanitize_text_field( $attributes['hoverShadow'] ?? '' );
$hover_img_zoom = (bool) ( $attributes['hoverImageZoom'] ?? true );
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

$query_args = [
	'post_type'      => $post_type,
	'posts_per_page' => $posts_per_page,
	'paged'          => $current_page,
	'orderby'        => $order_by,
	'order'          => $order,
	'offset'         => $offset + ( ( $current_page - 1 ) * $posts_per_page ),
	'post_status'    => 'publish',
];

if ( ! empty( $categories ) ) {
	$query_args['category__in'] = $categories;
}

if ( ! empty( $tags ) ) {
	$query_args['tag__in'] = $tags;
}

if ( $exclude ) {
	$current_post_id = get_the_ID();
	if ( $current_post_id ) {
		$query_args['post__not_in'] = [ $current_post_id ];
	}
}

$query       = new WP_Query( $query_args );
$total_pages = (int) $query->max_num_pages;

// -------------------------------------------------------------------------
// Params array passed to render_card() — mirrors REST endpoint params.
// -------------------------------------------------------------------------
$card_params = [
	'cardStyle'            => $card_style,
	'showImage'            => (bool) ( $attributes['showImage'] ?? true ),
	'showTitle'            => (bool) ( $attributes['showTitle'] ?? true ),
	'showExcerpt'          => (bool) ( $attributes['showExcerpt'] ?? true ),
	'showDate'             => (bool) ( $attributes['showDate'] ?? true ),
	'showAuthor'           => (bool) ( $attributes['showAuthor'] ?? false ),
	'showCategory'         => (bool) ( $attributes['showCategory'] ?? true ),
	'showReadMore'         => (bool) ( $attributes['showReadMore'] ?? true ),
	'readMoreText'         => sanitize_text_field( $attributes['readMoreText'] ?? __( 'Read more', 'sgs-blocks' ) ),
	'excerptLength'        => absint( $attributes['excerptLength'] ?? 20 ),
	'imageSize'            => sanitize_key( $attributes['imageSize'] ?? 'medium_large' ),
	'aspectRatio'          => sanitize_text_field( $attributes['aspectRatio'] ?? '16/10' ),
	'titleColour'          => $attributes['titleColour'] ?? '',
	'excerptColour'        => $attributes['excerptColour'] ?? '',
	'metaColour'           => $attributes['metaColour'] ?? '',
	'categoryBadgeColour'  => $attributes['categoryBadgeColour'] ?? '',
	'categoryBadgeBgColour' => $attributes['categoryBadgeBgColour'] ?? '',
	'readMoreColour'       => $attributes['readMoreColour'] ?? '',
];

// -------------------------------------------------------------------------
// Inline CSS custom properties on the wrapper.
// -------------------------------------------------------------------------
$inline_styles = implode( ';', array_filter( array_merge(
	array(
		'--sgs-columns-desktop:' . $columns,
		'--sgs-columns-tablet:' . $columns_tablet,
		'--sgs-columns-mobile:' . $columns_mobile,
		'--sgs-gap:' . $gap . 'px',
		$card_bg ? '--sgs-card-bg:' . $card_bg : '',
		$hover_scale ? '--sgs-hover-scale:' . esc_attr( $hover_scale ) : '',
		$hover_shadow ? '--sgs-hover-shadow:' . esc_attr( $hover_shadow ) : '',
	),
	sgs_transition_vars( $attributes )
) ) );

// -------------------------------------------------------------------------
// Build query data for view.js hydration (AJAX pagination/filtering).
// -------------------------------------------------------------------------
$sgs_query_data = wp_json_encode( array_filter( [
	'postType'             => $post_type,
	'postsPerPage'         => $posts_per_page,
	'orderBy'              => $order_by,
	'order'                => strtolower( $order ),
	'categories'           => implode( ',', $categories ),
	'tags'                 => implode( ',', $tags ),
	'offset'               => $offset,
	'excludeCurrent'       => $exclude,
	'excludePost'          => $exclude ? (int) get_the_ID() : 0,
	'layout'               => $layout,
	'cardStyle'            => $card_style,
	'imageSize'            => $card_params['imageSize'],
	'showImage'            => $card_params['showImage'],
	'showTitle'            => $card_params['showTitle'],
	'showExcerpt'          => $card_params['showExcerpt'],
	'excerptLength'        => $card_params['excerptLength'],
	'showDate'             => $card_params['showDate'],
	'showAuthor'           => $card_params['showAuthor'],
	'showCategory'         => $card_params['showCategory'],
	'showReadMore'         => $card_params['showReadMore'],
	'readMoreText'         => $card_params['readMoreText'],
	'aspectRatio'          => $card_params['aspectRatio'],
	'titleColour'          => $card_params['titleColour'],
	'excerptColour'        => $card_params['excerptColour'],
	'metaColour'           => $card_params['metaColour'],
	'categoryBadgeColour'  => $card_params['categoryBadgeColour'],
	'categoryBadgeBgColour' => $card_params['categoryBadgeBgColour'],
	'readMoreColour'       => $card_params['readMoreColour'],
	'pagination'           => $pagination,
	'totalPages'           => $total_pages,
	'currentPage'          => (int) $current_page,
	'filterTaxonomy'       => $filter_taxonomy,
	'carouselAutoplay'     => $carousel_autoplay,
	'carouselSpeed'        => $carousel_speed,
	'carouselShowDots'     => $carousel_show_dots,
	'carouselShowArrows'   => $carousel_show_arrows,
], fn ( $v ) => '' !== $v && null !== $v ) );

// -------------------------------------------------------------------------
// Wrapper attributes (integrates with WP native supports: colour, spacing).
// -------------------------------------------------------------------------
$wrapper_classes = implode( ' ', array_filter( [
	'sgs-post-grid',
	'sgs-post-grid--' . $layout,
] ) );

$wrapper_attrs = get_block_wrapper_attributes( [
	'class'             => $wrapper_classes,
	'style'             => $inline_styles,
	'data-sgs-query'    => $sgs_query_data,
	'data-hover-image-zoom' => $hover_img_zoom ? 'true' : 'false',
	'data-pagination'   => $pagination,
	'data-layout'       => $layout,
] );

// -------------------------------------------------------------------------
// Output starts here.
// -------------------------------------------------------------------------
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — get_block_wrapper_attributes() is safe. ?>>

	<?php
	// --- Accessible live region for screen reader announcements ----------
	?>
	<div
		class="sgs-post-grid__live-region screen-reader-text"
		aria-live="polite"
		aria-atomic="true"
	></div>

	<?php
	// --- Category/tag filter buttons -------------------------------------
	if ( $show_filters ) :
		$filter_terms = get_terms( [
			'taxonomy'   => $filter_taxonomy,
			'hide_empty' => true,
		] );

		if ( ! is_wp_error( $filter_terms ) && ! empty( $filter_terms ) ) :
			?>
			<div class="sgs-post-grid__filters" role="group" aria-label="<?php esc_attr_e( 'Filter posts', 'sgs-blocks' ); ?>">
				<button
					type="button"
					class="sgs-post-grid__filter sgs-post-grid__filter--active"
					data-filter-id=""
					aria-pressed="true"
				><?php esc_html_e( 'All', 'sgs-blocks' ); ?></button>

				<?php foreach ( $filter_terms as $term ) : ?>
					<button
						type="button"
						class="sgs-post-grid__filter"
						data-filter-id="<?php echo esc_attr( $term->term_id ); ?>"
						data-filter-taxonomy="<?php echo esc_attr( $filter_taxonomy ); ?>"
						aria-pressed="false"
					><?php echo esc_html( $term->name ); ?></button>
				<?php endforeach; ?>
			</div>
		<?php endif;
	endif; ?>

	<?php
	// --- Post cards grid --------------------------------------------------
	?>
	<div class="sgs-post-grid__inner">
		<?php
		if ( $query->have_posts() ) :
			$card_index = 0;
			while ( $query->have_posts() ) :
				$query->the_post();
				$card_params['_card_index'] = $card_index;
				echo Post_Grid_REST::render_card( get_the_ID(), $card_params ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — render_card() escapes all output internally.
				$card_index++;
			endwhile;
			wp_reset_postdata();
		else :
			?>
			<p class="sgs-post-grid__empty"><?php esc_html_e( 'No posts found.', 'sgs-blocks' ); ?></p>
		<?php endif; ?>
	</div>

	<?php
	// --- Carousel controls -----------------------------------------------
	if ( 'carousel' === $layout ) :
		?>
		<?php if ( $carousel_show_arrows ) : ?>
			<button
				type="button"
				class="sgs-post-grid__carousel-prev"
				aria-label="<?php esc_attr_e( 'Previous', 'sgs-blocks' ); ?>"
			>&#8249;</button>
			<button
				type="button"
				class="sgs-post-grid__carousel-next"
				aria-label="<?php esc_attr_e( 'Next', 'sgs-blocks' ); ?>"
			>&#8250;</button>
		<?php endif; ?>

		<?php if ( $carousel_show_dots ) : ?>
			<div class="sgs-post-grid__carousel-dots" role="tablist" aria-label="<?php esc_attr_e( 'Carousel navigation', 'sgs-blocks' ); ?>">
			</div>
		<?php endif; ?>
	<?php endif; ?>

	<?php
	// --- Pagination ------------------------------------------------------
	if ( 'none' !== $pagination && $total_pages > 1 ) :
		if ( 'standard' === $pagination ) :
			?>
			<nav class="sgs-post-grid__pagination" aria-label="<?php esc_attr_e( 'Posts pagination', 'sgs-blocks' ); ?>">
				<?php for ( $p = 1; $p <= $total_pages; $p++ ) : ?>
					<button
						type="button"
						class="sgs-post-grid__page-btn<?php echo $p === (int) $current_page ? ' sgs-post-grid__page-btn--current' : ''; ?>"
						data-page="<?php echo esc_attr( $p ); ?>"
						<?php echo $p === (int) $current_page ? 'aria-current="page"' : ''; ?>
					><?php echo esc_html( $p ); ?></button>
				<?php endfor; ?>
			</nav>
		<?php elseif ( 'load-more' === $pagination ) : ?>
			<div class="sgs-post-grid__load-more-wrap">
				<button
					type="button"
					class="sgs-post-grid__load-more"
					data-current-page="1"
					data-total-pages="<?php echo esc_attr( $total_pages ); ?>"
				><?php esc_html_e( 'Load more', 'sgs-blocks' ); ?></button>
			</div>
		<?php elseif ( 'infinite' === $pagination ) : ?>
			<div
				class="sgs-post-grid__sentinel"
				aria-hidden="true"
				data-current-page="1"
				data-total-pages="<?php echo esc_attr( $total_pages ); ?>"
			></div>
		<?php endif; ?>
	<?php endif; ?>

</div>
