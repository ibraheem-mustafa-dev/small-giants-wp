<?php
/**
 * Post Grid — interior HTML: live region, filter buttons, post cards, carousel controls and pagination, echoed between the ob_start() and ob_get_clean() in render.php.
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $attributes, $layout, $query, $show_filters, $filter_taxonomy, $card_params, $image_decorative, $carousel_show_arrows, $carousel_show_dots, $pagination, $total_pages, $current_page.
 * Writes: output only (echoed into the open output buffer); sets $card_params['_card_index'] and its own loop locals.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

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
		$card_html                  = Post_Grid_REST::render_card( get_the_ID(), $card_params );
		if ( $image_decorative ) {
			$card_html = sgs_post_grid_make_card_image_decorative( $card_html );
		}
		echo $card_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — render_card() escapes all output internally; sgs_post_grid_make_card_image_decorative() only rewrites an already-escaped alt attribute to an empty string and adds a literal aria-hidden attribute.
		++$card_index;
	}
	wp_reset_postdata();
} else {
	// No posts: the client's own message, or nothing at all (the grid wrapper still closes below).
	$empty_message = trim( (string) ( $attributes['emptyMessage'] ?? '' ) );
	if ( '' !== $empty_message ) {
		echo '<div class="sgs-post-grid__empty" role="status"><p class="sgs-post-grid__empty-text">' . esc_html( $empty_message ) . '</p></div>';
	}
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
// Delegated to the shared Grid_Pagination helper. MODE_AJAX output keeps view.js's
// selectors (.sgs-post-grid__page-btn / __load-more / __sentinel and their data-*
// attributes) working. sgs/card-grid renders from the same helper in MODE_LINK, so
// there is exactly one copy of this markup.
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
