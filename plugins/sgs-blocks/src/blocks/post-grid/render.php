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

// Whitelist — mirrors image-sequence/render.php's seven-value ratio list (the
// shared source of truth is MediaSizingPanel.js's RATIO_OPTIONS, JS-side;
// this array is byte-identical to that list's values). Falls back to this
// block's OWN existing default ('16/10', unspaced) rather than
// image-sequence's '16 / 9', so a legacy stored value ('16/10', authored
// before this validation existed) renders exactly as it did before.
$aspect_ratio         = sanitize_text_field( $attributes['aspectRatio'] ?? '16/10' );
$aspect_ratio_allowed = array( '16 / 9', '21 / 9', '4 / 3', '1 / 1', '4 / 5', '3 / 4', '9 / 16' );
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
$hover_shadow_colour = sanitize_text_field( $attributes['shadowColourHover'] ?? '' );
$hover_img_zoom      = (bool) ( $attributes['imageZoomHover'] ?? true );

// HOVER shadow (design H4, task lift-2). An explicit shadowHover always wins outright —
// the switch never suppresses an explicit choice. With nothing explicit, the automatic
// lift fills the SAME custom property the card/flat hover rule already reads (style.css's
// fallback chain now resolves to the resting shadow, not a hardcoded literal, when this is
// ''), so the switch being off means truly no visible change on hover. Gated by
// sgs_shadow_lift_enabled(); post-grid is not an overlay block.
$hover_shadow_value = '';
if ( $hover_shadow ) {
	$hover_shadow_value = sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour );
} elseif ( $shadow && sgs_shadow_lift_enabled( $attributes, ( $block instanceof \WP_Block ) ? (string) $block->name : '' ) ) {
	$hover_shadow_value = sgs_shadow_hover_value( $shadow, $shadow_colour );
}

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
	'cardStyle'                          => $card_style,
	'showImage'                          => (bool) ( $attributes['showImage'] ?? true ),
	'showTitle'                          => (bool) ( $attributes['showTitle'] ?? true ),
	'showExcerpt'                        => (bool) ( $attributes['showExcerpt'] ?? true ),
	'showDate'                           => (bool) ( $attributes['showDate'] ?? true ),
	'showAuthor'                         => (bool) ( $attributes['showAuthor'] ?? false ),
	'showCategory'                       => (bool) ( $attributes['showCategory'] ?? true ),
	'showReadMore'                       => (bool) ( $attributes['showReadMore'] ?? true ),
	'readMoreText'                       => sanitize_text_field( $attributes['readMoreText'] ?? __( 'Read more', 'sgs-blocks' ) ),
	'excerptLength'                      => absint( $attributes['excerptLength'] ?? 20 ),
	'imageSize'                          => sanitize_key( $attributes['imageSize'] ?? 'medium_large' ),
	'aspectRatio'                        => $aspect_ratio,
	'titleColour'                        => $attributes['titleColour'] ?? '',
	'excerptColour'                      => $attributes['excerptColour'] ?? 'text',
	'metaColour'                         => $attributes['metaColour'] ?? 'text-muted',
	'categoryBadgeColour'                => $attributes['categoryBadgeColour'] ?? 'text-inverse',
	'categoryBadgeColourGradient'        => (string) ( $attributes['categoryBadgeColourGradient'] ?? '' ),
	'categoryBadgeBgColour'              => $attributes['categoryBadgeBgColour'] ?? 'primary',
	'categoryBadgeBgColourHover'         => (string) ( $attributes['categoryBadgeBgColourHover'] ?? '' ),
	'categoryBadgeBgColourHoverGradient' => (string) ( $attributes['categoryBadgeBgColourHoverGradient'] ?? '' ),
	'readMoreColour'                     => $attributes['readMoreColour'] ?? '',
	// 37-media-no-handroll: threaded through to render_card() so the
	// featured-image <img> can carry the media-atom marker class — see the
	// $sgs_pg_uid comment in class-post-grid-rest.php.
	'uid'                                => $uid,
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
			'' !== $hover_shadow_value ? '--sgs-hover-shadow:' . $hover_shadow_value : '',
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
// data-layout and data-error-message for AJAX hydration/carousel/filter init.
// -------------------------------------------------------------------------
$extra_attrs = array(
	'data-sgs-query'        => $sgs_query_data,
	'data-hover-image-zoom' => $hover_img_zoom ? 'true' : 'false',
	'data-pagination'       => $pagination,
	'data-layout'           => $layout,
);
// A failed page or filter load shows the client's message, or puts the previous posts back.
$sgs_pg_error_message = trim( sanitize_text_field( (string) ( $attributes['errorMessage'] ?? '' ) ) );
if ( '' !== $sgs_pg_error_message ) {
	$extra_attrs['data-error-message'] = $sgs_pg_error_message;
}

// -------------------------------------------------------------------------
// Build interior HTML — live region + filters + post cards + controls.
// -------------------------------------------------------------------------
ob_start();

require __DIR__ . '/render-interior.php';

$inner_html = ob_get_clean();

require __DIR__ . '/render-scoped-css.php';

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
