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
 * R-31-14: discriminators are EXPLICIT attributes. NEVER branch on empty($content).
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

require_once dirname( __DIR__, 3 ) . '/includes/class-post-grid-rest.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
// dirname( __DIR__, 3 ) is the same directory as the dirname( __FILE__, 4 )
// calls above (__DIR__ === dirname( __FILE__ )); it matches the form used by
// the sibling grid blocks and keeps this new line phpcs-clean.
require_once dirname( __DIR__, 3 ) . '/includes/class-grid-pagination.php';

// Decorative-image helper (item 18, WCAG 1.1.1) — rewrites the alt attribute
// and adds aria-hidden on the ONE <img class="sgs-post-grid__img"> that
// Post_Grid_REST::render_card() emits per card, without touching that shared
// class (used by both this render path and the AJAX pagination REST
// endpoint). Guarded with function_exists() per the no-top-level-function
// -in-per-render-php gotcha — this file runs once per block instance on a
// page, and a bare `function` declaration here would fatal on the second
// instance.
if ( ! function_exists( 'sgs_post_grid_make_card_image_decorative' ) ) {
	/**
	 * Blank the alt text and mark aria-hidden on a rendered card's featured
	 * image, so it is skipped entirely by assistive tech.
	 *
	 * @param string $card_html Escaped card markup from Post_Grid_REST::render_card().
	 * @return string Card markup with its <img class="sgs-post-grid__img"> alt emptied + aria-hidden added.
	 */
	function sgs_post_grid_make_card_image_decorative( string $card_html ): string {
		if ( false === strpos( $card_html, 'sgs-post-grid__img' ) ) {
			return $card_html;
		}

		return preg_replace_callback(
			'/<img\b[^>]*\bclass="[^"]*\bsgs-post-grid__img\b[^"]*"[^>]*>/',
			static function ( array $matches ): string {
				$tag = $matches[0];

				$tag = preg_match( '/\salt="[^"]*"/', $tag )
					? preg_replace( '/\salt="[^"]*"/', ' alt=""', $tag, 1 )
					: preg_replace( '/<img\b/', '<img alt=""', $tag, 1 );

				if ( false === strpos( $tag, 'aria-hidden' ) ) {
					$tag = preg_replace( '/<img\b/', '<img aria-hidden="true"', $tag, 1 );
				}

				return $tag;
			},
			$card_html
		);
	}
}

// CSS length/unit sanitiser — for free-text style-engine values concatenated
// into raw CSS declarations inside this block's scoped <style> tag. Strips
// everything except letters, digits, dot, and % so a Contributor-authored
// malicious value can never break out of the declaration. Mirrors sgs/hero's
// proven sanitiser (contract §D).
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / font-weight / font-style) — letters + hyphen only.
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

$layout     = sanitize_key( $attributes['layout'] ?? 'grid' );
$card_style = sanitize_key( $attributes['cardStyle'] ?? 'card' );

// Whitelist — mirrors image-sequence/render.php's six-value ratio list (the
// shared source of truth is MediaSizingPanel.js's RATIO_OPTIONS, JS-side;
// this array is byte-identical to that list's values). Falls back to this
// block's OWN existing default ('16/10', unspaced) rather than
// image-sequence's '16 / 9', so a legacy stored value ('16/10', authored
// before this validation existed) renders exactly as it did before.
$aspect_ratio         = sanitize_text_field( $attributes['aspectRatio'] ?? '16/10' );
$aspect_ratio_allowed = array( '16 / 9', '21 / 9', '4 / 3', '1 / 1', '3 / 4', '9 / 16' );
if ( ! in_array( $aspect_ratio, $aspect_ratio_allowed, true ) ) {
	$aspect_ratio = '16/10';
}

// `columns` is a TIER OBJECT (Spec 35 pass 4, 2026-08-11) — read each tier via
// the normaliser, never the raw attribute (absint() on an unresolved array
// throws "Array to int conversion", the D569/D570 bug class this normaliser
// exists to prevent).
$columns_obj    = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns        = absint( $columns_obj['desktop'] ?? 3 );
$columns_tablet = absint( $columns_obj['tablet'] ?? 2 );
$columns_mobile = absint( $columns_obj['mobile'] ?? 1 );
// Gap: resolved via the shared helper (handles raw CSS lengths + back-compat).
// Falls back to "30px" matching the block.json default.
// Back-compat: a bare digit string (e.g. "30") is appended with "px" before the
// helper so sgs_container_gap_value() treats it as a raw CSS length, not a preset slug.
// `gap` is a TIER OBJECT — casting the array would emit "Array to string conversion"
// on every render plus literal `gap:Array`.
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

$hover_scale         = sanitize_text_field( $attributes['scaleHover'] ?? '' );
$shadow              = sanitize_text_field( $attributes['shadow'] ?? '' );
$shadow_colour       = sanitize_text_field( $attributes['shadowColour'] ?? '' );
$hover_shadow        = sanitize_text_field( $attributes['shadowHover'] ?? '' );
$hover_shadow_colour = sanitize_text_field( $attributes['shadowHoverColour'] ?? '' );
$hover_img_zoom      = (bool) ( $attributes['imageZoomHover'] ?? true );

// Decorative-image toggle (item 18, WCAG 1.1.1). Block-level, not per-post —
// the featured image is pulled per post from a dynamic WP_Query, so which
// post occupies a card changes on every save/reorder/AJAX page; a per-item
// toggle would have nothing stable to attach to. When true, every card's
// featured image is hidden from assistive tech: alt is blanked and
// aria-hidden is set on the <img> itself. This is BELT-AND-BRACES on top of
// Post_Grid_REST::render_card()'s existing unconditional
// `aria-hidden="true"` on the wrapping <a> (the image is already outside the
// accessibility tree today) — the img-level treatment is what actually makes
// the choice visible/auditable in the markup and keeps this correct if that
// wrapper ever stops being unconditionally hidden.
$image_decorative = (bool) ( $attributes['imageDecorative'] ?? false );

// Hover colour shifts — resolved from token slug or raw CSS colour. Emitted
// further down (once $root_sel exists) as real declarations via
// sgs_emit_state_colour_css() / sgs_hover_state_rules() ancestor-hover rules
// for text (see the comment at the emission site), scoped to
// `.sgs-post-grid__card`. Bean-locked: no hardcoded fallback colour — unset
// stays unset.
$hover_bg     = ! empty( $attributes['backgroundColourHover'] ) ? sgs_colour_value( $attributes['backgroundColourHover'] ) : '';
$hover_border = ! empty( $attributes['borderColourHover'] ) ? sgs_colour_value( $attributes['borderColourHover'] ) : '';
// textColourHover is NOT pre-resolved with sgs_colour_value() here — the raw
// value must reach sgs_resolve_text_colour_or_gradient() below un-mangled, so
// that helper can tell a flat slug/colour apart from a gradient function
// string. Resolution to a real CSS value happens inside sgs_text_colour_decl().
$hover_text_raw          = (string) ( $attributes['textColourHover'] ?? '' );
$hover_text_gradient_raw = (string) ( $attributes['textColourHoverGradient'] ?? '' );
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

$carousel_autoplay    = (bool) ( $attributes['carouselAutoplay'] ?? false );
$carousel_speed       = absint( $attributes['carouselSpeed'] ?? 5000 );
$carousel_show_dots   = (bool) ( $attributes['carouselShowDots'] ?? true );
$carousel_show_arrows = (bool) ( $attributes['carouselShowArrows'] ?? true );

// Card bg colour + gradient custom properties (D956 phase 3 rollout).
// sgs_custom_property_gradient_decls() returns an array of declarations
// to merge into $extra_styles; unset gradient wins via background-image
// layering over background-color in style.css (one new line there).
$card_bg_decls = sgs_custom_property_gradient_decls(
	'sgs-card-bg',
	! empty( $attributes['cardBgColour'] ) ? (string) $attributes['cardBgColour'] : '',
	(string) ( $attributes['cardBgColourGradient'] ?? '' )
);

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
// Per-instance uid — computed here (moved up from the NO-INLINE CSS section
// below) because $card_params, built next, needs it (37-media-no-handroll:
// threaded through to render_card() so the featured-image <img> can carry
// the media-atom marker class). $root_sel (uid-derived) still builds down
// in the CSS section where it is used.
// -------------------------------------------------------------------------
$uid = sanitize_html_class( 'sgs-post-grid-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 ) );

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
	'aspectRatio'           => $aspect_ratio,
	'titleColour'           => $attributes['titleColour'] ?? 'primary',
	'excerptColour'         => $attributes['excerptColour'] ?? 'text',
	'metaColour'            => $attributes['metaColour'] ?? 'text-muted',
	'categoryBadgeColour'   => $attributes['categoryBadgeColour'] ?? 'text-inverse',
	'categoryBadgeBgColour' => $attributes['categoryBadgeBgColour'] ?? 'primary',
	'readMoreColour'        => $attributes['readMoreColour'] ?? 'primary',
	// 37-media-no-handroll: threaded through to render_card() so the
	// featured-image <img> can carry the media-atom marker class — see the
	// $sgs_pg_uid comment in class-post-grid-rest.php.
	'uid'                   => $uid,
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
			// Resting shadow: --sgs-card-shadow already carries a hardcoded
			// preset default in style.css (scoped to .sgs-post-grid, the
			// same class this inline style attaches to), consumed by the
			// card/overlay cardStyle variants' box-shadow. Only emit here
			// when set, so an unset shadow leaves that preset default (and
			// therefore the cardStyle look) untouched — same gating as the
			// hover pair below.
			$shadow ? '--sgs-card-shadow:' . sgs_shadow_value_composed( $shadow, $shadow_colour ) : '',
			$hover_scale ? '--sgs-hover-scale:' . esc_attr( $hover_scale ) : '',
			$hover_shadow ? '--sgs-hover-shadow:' . sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour ) : '',
		),
		$card_bg_decls,
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
			// 37-media-no-handroll: round-tripped so AJAX-paginated cards'
			// featured images carry the same media-atom marker class as the
			// initial render's — see the $sgs_pg_uid comment in
			// class-post-grid-rest.php.
			'uid'                   => $uid,
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
		$card_html                  = Post_Grid_REST::render_card( get_the_ID(), $card_params );
		if ( $image_decorative ) {
			$card_html = sgs_post_grid_make_card_image_decorative( $card_html );
		}
		echo $card_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — render_card() escapes all output internally; sgs_post_grid_make_card_image_decorative() only rewrites an already-escaped alt attribute to an empty string and adds a literal aria-hidden attribute.
		++$card_index;
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
	echo '<p class="sgs-post-grid__empty-heading">' . esc_html__( 'No posts yet', 'sgs-blocks' ) . '</p>';
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

$inner_html = ob_get_clean();

// -------------------------------------------------------------------------
// NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from
// $attributes['style'] here and emit them into POST-GRID'S OWN scoped <style>
// (composite caveat: do NOT pass these as wrapper `extra_styles` — that path
// inlines). Base spacing (padding/margin) is a SEPARATE mechanism the wrapper
// already handles scoped internally (reads $attributes['style']['spacing']
// directly) — not duplicated here.
// -------------------------------------------------------------------------
// $uid is computed earlier (before $card_params) — see the comment there.
$root_sel = '.' . $uid . '.wp-block-sgs-post-grid';

$post_grid_classes = array(
	'sgs-post-grid',
	'sgs-post-grid--' . $layout,
	$uid,
);

$responsive_css = '';

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

// (native border_args removed by the Shape-B migration -- width/style/colour
// are block-private attrs now, emitted below)

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

// 37-media-no-handroll: the featured-image object-fit control. Emitted ONCE
// here (a `.{uid}{...}` bare-selector rule, not per-card) — every card's
// <img class="sgs-post-grid__img sgs-media-el {uid}"> shares the same
// block-level value (see the $sgs_pg_uid comment in class-post-grid-rest.php
// for how AJAX-injected cards pick up the same rule). Replaces the two
// hardcoded `object-fit: cover` declarations style.css used to carry
// (grid-mode .sgs-post-grid__img + list-mode .sgs-post-grid--list
// .sgs-post-grid__image img — both target this one element) — when unset,
// assets/css/media-atoms/object-fit.css's own var() fallback already
// resolves to 'cover', so removing them changes nothing by default.
if ( class_exists( 'SGS_Media_Element' ) ) {
	$post_grid_media_css = SGS_Media_Element::style( $attributes, '', 'sgs/post-grid', $uid, array( 'object-fit' ) );
	if ( '' !== $post_grid_media_css ) {
		$responsive_css .= $post_grid_media_css;
	}
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

// D956 (778879732 rollout, Phase 3) — titleColour/excerptColour/metaColour/
// readMoreColour gradient siblings. Emitted as DIRECT declarations at the real
// card element selectors (not the --sgs-pg-* custom-property chain above,
// which cannot carry a gradient), scoped under $root_sel so the same
// descendant-selector rule also styles cards injected later by view.js AJAX
// pagination. Mirrors sgs/counter's numberColour/labelColour pattern.
$post_grid_text_rows = array(
	'titleColour'    => $root_sel . ' .sgs-post-grid__title a',
	'excerptColour'  => $root_sel . ' .sgs-post-grid__excerpt',
	'metaColour'     => $root_sel . ' .sgs-post-grid__meta',
	'readMoreColour' => $root_sel . ' .sgs-post-grid__readmore',
);
foreach ( $post_grid_text_rows as $post_grid_attr => $post_grid_sel ) {
	$post_grid_flat      = $card_params[ $post_grid_attr ] ?? '';
	$post_grid_gradient  = $attributes[ $post_grid_attr . 'Gradient' ] ?? '';
	$post_grid_effective = sgs_resolve_text_colour_or_gradient( $post_grid_flat, $post_grid_gradient );
	if ( '' === $post_grid_effective ) {
		continue;
	}
	$post_grid_decl = sgs_text_colour_decl( $post_grid_effective );
	if ( '' !== $post_grid_decl ) {
		$responsive_css .= $post_grid_sel . '{' . $post_grid_decl . ';}';
	}
	$responsive_css .= sgs_text_colour_gradient_fallback_rule( $post_grid_sel, $post_grid_effective );
}

// Hover colour shifts (background/text/border) — per-instance scoped rules via
// sgs_emit_state_colour_css(), same as sgs/info-box and sgs/cta-section.
// Bean-locked: no hardcoded fallback colour — an unset hover colour renders NO
// hover change at all.
$post_grid_card_sel = $root_sel . ' .sgs-post-grid__card';

// Background: card/overlay/flat/minimal all use the same --sgs-hover-bg override
// value, so one rule covers every card style.
if ( $hover_bg ) {
	$responsive_css .= sgs_emit_state_colour_css( $post_grid_card_sel, array(), array( 'background-color:' . $hover_bg ) );
}

// Border: card/overlay/flat all set `border-color` on hover (their fallbacks
// differed — transparent vs the theme border colour — but the override value
// was always the same --sgs-hover-border, so those three collapse into one
// rule). The `minimal` card style is genuinely different: it has no side
// border at rest, only a 2px TOP accent border, so it must keep setting
// `border-top-color` on its own — that is a real property difference, not
// just a fallback difference, so it cannot collapse with the other three.
if ( $hover_border ) {
	$responsive_css .= sgs_emit_state_colour_css( $post_grid_card_sel . ':not(.sgs-post-grid__card--minimal)', array(), array( 'border-color:' . $hover_border ) );
	$responsive_css .= sgs_emit_state_colour_css( $post_grid_card_sel . '.sgs-post-grid__card--minimal', array(), array( 'border-top-color:' . $hover_border ) );
}

// Text: NOT routed through sgs_emit_state_colour_css() — that helper's fixed
// template only supports "this selector's own :hover" (it appends `:hover`
// directly onto $selector). This text-hover CSS is the OPPOSITE shape:
// hovering the CARD changes the colour of four DESCENDANT elements (title
// link / excerpt / meta / read-more), each of which already carries its own
// explicit resting `color` declaration — an explicit declaration on an
// element always beats an inherited value regardless of specificity, so
// setting `color` on the card itself would not reach them.
// sgs_hover_state_rules()'s `$suffix` parameter exists for exactly this
// ancestor-hover shape — it lands AFTER the pseudo-class, giving
// `{card}:hover {target}` — so this still goes through the ONE shared
// touch-safe hover mechanism (helpers-hover-state.php) rather than
// hand-rolling a `:hover` rule. `:focus-within` (not `:focus-visible`) is the
// correct pseudo-class for this ancestor-hover shape, since the element that
// receives focus (the read-more link) is a descendant, not the card itself.
//
// Flat-or-gradient (D636 "text" builder) — sgs_resolve_text_colour_or_gradient()
// picks textColourHoverGradient when set + valid, leaving the flat
// textColourHover value untouched. sgs_text_colour_decl() emits a plain
// `color:` declaration for a flat colour, or the background-clip:text trio of
// declarations for a gradient. sgs_text_colour_gradient_fallback_rule() is the
// MANDATORY companion @supports fallback for browsers without
// background-clip:text (a no-op for a flat colour) — emitted only once the
// value is known to be a gradient, real declarations only, no hardcoded
// fallback colour, emitted only when the operator has actually set a hover
// text colour or gradient.
$hover_text_effective = sgs_resolve_text_colour_or_gradient( $hover_text_raw, $hover_text_gradient_raw );
$hover_text_decl      = sgs_text_colour_decl( $hover_text_effective );
if ( $hover_text_decl ) {
	$post_grid_hover_text_targets = array(
		' .sgs-post-grid__title a',
		' .sgs-post-grid__excerpt',
		' .sgs-post-grid__meta',
		' .sgs-post-grid__readmore',
	);
	foreach ( $post_grid_hover_text_targets as $post_grid_hover_text_target ) {
		$responsive_css .= sgs_hover_state_rules( $post_grid_card_sel, $hover_text_decl, ':focus-within', $post_grid_hover_text_target );

		// Companion rule — one call per target, matching sgs_hover_state_rules()
		// above (a comma-joined selector list here is safe: unlike
		// sgs_hover_state_rules(), sgs_text_colour_gradient_fallback_rule() takes
		// $selector as an opaque string and never appends a pseudo-class to it).
		$responsive_css .= sgs_text_colour_gradient_fallback_rule(
			$post_grid_card_sel . ':hover' . $post_grid_hover_text_target . ',' . $post_grid_card_sel . ':focus-within' . $post_grid_hover_text_target,
			$hover_text_effective
		);
	}
}

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote + sgs/button).

// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt             = '' !== $border_width_top ? $border_width_top : '0';
		$bwr             = '' !== $border_width_right ? $border_width_right : '0';
		$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl             = '' !== $border_width_left ? $border_width_left : '0';
		$responsive_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// Every value reaching $responsive_css is pre-sanitised (sgs_css_length_value() /
// sgs_css_keyword_sanitise() / wp_style_engine_get_styles), so no un-sanitised value
// survives to here.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// -------------------------------------------------------------------------
// WS-4: emit via shared wrapper helper (kind='layout').
// Own block classes + CSS vars + data-* ride through opts.
//
// ⚠ ATTR-NAME COLLISION: this block's `layout` attr is its OWN vocabulary
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
