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

/**
 * Handles the sgs-blocks/v1/posts REST route.
 *
 * The render_card() method is public static so render.php can call it
 * directly — this keeps card HTML in one place (DRY).
 */
class Post_Grid_REST {

	const NAMESPACE = 'sgs-blocks/v1';
	const ROUTE     = '/posts';

	/**
	 * Wire up the REST route.
	 *
	 * Called once from the main plugin class constructor.
	 */
	public static function register(): void {
		add_action( 'rest_api_init', [ __CLASS__, 'register_routes' ] );
	}

	/**
	 * Register the REST route with WordPress.
	 */
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

	/**
	 * Define, sanitise, and validate every accepted parameter.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private static function get_args(): array {
		return [
			'postType'             => [
				'type'              => 'string',
				'default'           => 'post',
				'sanitize_callback' => 'sanitize_key',
			],
			'page'                 => [
				'type'              => 'integer',
				'default'           => 1,
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
			],
			'postsPerPage'         => [
				'type'              => 'integer',
				'default'           => 6,
				'minimum'           => 1,
				'maximum'           => 24,
				'sanitize_callback' => 'absint',
			],
			'orderBy'              => [
				'type'              => 'string',
				'default'           => 'date',
				'enum'              => [ 'date', 'title', 'modified', 'rand', 'comment_count' ],
				'sanitize_callback' => 'sanitize_key',
			],
			'order'                => [
				'type'              => 'string',
				'default'           => 'desc',
				'enum'              => [ 'asc', 'desc' ],
				'sanitize_callback' => 'sanitize_key',
			],
			'categories'           => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'tags'                 => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'excludeCurrent'       => [
				'type'    => 'boolean',
				'default' => false,
			],
			'excludePost'          => [
				'type'              => 'integer',
				'default'           => 0,
				'sanitize_callback' => 'absint',
			],
			'offset'               => [
				'type'              => 'integer',
				'default'           => 0,
				'sanitize_callback' => 'absint',
			],
			'layout'               => [
				'type'              => 'string',
				'default'           => 'grid',
				'enum'              => [ 'grid', 'list', 'masonry', 'carousel' ],
				'sanitize_callback' => 'sanitize_key',
			],
			'cardStyle'            => [
				'type'              => 'string',
				'default'           => 'card',
				'enum'              => [ 'card', 'flat', 'overlay', 'minimal' ],
				'sanitize_callback' => 'sanitize_key',
			],
			'imageSize'            => [
				'type'              => 'string',
				'default'           => 'medium_large',
				'sanitize_callback' => 'sanitize_key',
			],
			'showImage'            => [
				'type'    => 'boolean',
				'default' => true,
			],
			'showTitle'            => [
				'type'    => 'boolean',
				'default' => true,
			],
			'showExcerpt'          => [
				'type'    => 'boolean',
				'default' => true,
			],
			'excerptLength'        => [
				'type'              => 'integer',
				'default'           => 20,
				'sanitize_callback' => 'absint',
			],
			'showDate'             => [
				'type'    => 'boolean',
				'default' => true,
			],
			'showAuthor'           => [
				'type'    => 'boolean',
				'default' => false,
			],
			'showCategory'         => [
				'type'    => 'boolean',
				'default' => true,
			],
			'showReadMore'         => [
				'type'    => 'boolean',
				'default' => true,
			],
			'readMoreText'         => [
				'type'              => 'string',
				'default'           => 'Read more',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'aspectRatio'          => [
				'type'              => 'string',
				'default'           => '16/10',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'titleColour'          => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'excerptColour'        => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'metaColour'           => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'categoryBadgeColour'  => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'categoryBadgeBgColour' => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			'readMoreColour'       => [
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			],
			// 37-media-no-handroll: the block's own uid, round-tripped by
			// view.js so AJAX-paginated cards' featured images carry the same
			// media-atom marker class as the initial render's — see the
			// $sgs_pg_uid comment in render_card().
			'uid'                   => [
				'type'              => 'string',
				'default'           => '',
				// WP always calls a REST sanitize_callback as
				// call_user_func( $cb, $value, $request, $key ) -- three args.
				// sanitize_html_class( $classname, $fallback = '' ) only takes
				// two, so the $request object silently binds to $fallback. When
				// $value is empty (this param's own declared default), its
				// fallback branch fires and recurses as
				// sanitize_html_class( $request ), which then fatals inside
				// preg_replace() (expects array|string, gets WP_REST_Request).
				// This closure drops the extra WP-supplied args so only the
				// real value ever reaches sanitize_html_class().
				'sanitize_callback' => static function ( $value ) {
					return sanitize_html_class( (string) $value );
				},
			],
		];
	}

	/**
	 * Handle the GET request and return posts as pre-rendered HTML.
	 *
	 * @param \WP_REST_Request $request The incoming REST request.
	 * @return \WP_REST_Response
	 */
	public static function get_posts( \WP_REST_Request $request ): \WP_REST_Response {
		$params = $request->get_params();

		// Build WP_Query args — only published posts.
		$query_args = [
			'post_type'      => sanitize_key( $params['postType'] ),
			'posts_per_page' => absint( $params['postsPerPage'] ),
			'paged'          => absint( $params['page'] ),
			'orderby'        => sanitize_key( $params['orderBy'] ),
			'order'          => strtoupper( sanitize_key( $params['order'] ) ),
			'offset'         => absint( $params['offset'] ) + ( ( absint( $params['page'] ) - 1 ) * absint( $params['postsPerPage'] ) ),
			'post_status'    => 'publish',
		];

		// Category filter (comma-separated IDs from filter buttons).
		if ( ! empty( $params['categories'] ) ) {
			$query_args['category__in'] = array_map( 'absint', explode( ',', $params['categories'] ) );
		}

		// Tag filter (comma-separated IDs).
		if ( ! empty( $params['tags'] ) ) {
			$query_args['tag__in'] = array_map( 'absint', explode( ',', $params['tags'] ) );
		}

		// Exclude current post (useful on single post templates).
		if ( true === $params['excludeCurrent'] && ! empty( $params['excludePost'] ) ) {
			$query_args['post__not_in'] = [ absint( $params['excludePost'] ) ];
		}

		$query = new \WP_Query( $query_args );

		// Build card HTML using the shared render method.
		$html = '';
		if ( $query->have_posts() ) {
			$index = 0;
			while ( $query->have_posts() ) {
				$query->the_post();
				// Pass card index so render_card can set fetchpriority on first image.
				$params['_card_index'] = $index;
				$html .= self::render_card( get_the_ID(), $params );
				$index++;
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
	 * Build the per-instance card custom-property declarations.
	 *
	 * FR-32-4 as amended (D345): these VALUES used to ride inline on every card
	 * root. They are per-BLOCK-INSTANCE (every card in one grid gets identical
	 * values, all derived from block attributes), so they belong in a single
	 * scoped rule emitted by render.php, not repeated inline on each card.
	 *
	 * That rule is a DESCENDANT selector on the block root, so it also styles
	 * cards injected later by view.js AJAX pagination — those land inside
	 * `.sgs-post-grid__inner`, within the block root, and CSS applies to DOM
	 * added after the stylesheet was parsed.
	 *
	 * @param array $params Block attributes / REST parameters.
	 * @return string Declarations without braces, or '' if none apply.
	 */
	public static function card_vars_decls( array $params ): string {
		// D956 (778879732 rollout, Phase 3): titleColour/excerptColour/metaColour/
		// readMoreColour moved OFF this custom-property map to a direct
		// sgs_text_colour_decl()/sgs_resolve_text_colour_or_gradient() emission
		// in render.php (survey.js's `paints-via-colour-valued-custom-property`
		// refusal reason -- a `var(--x, ...)` fed into a fixed `color:`
		// declaration cannot switch to `background-image` for a gradient).
		// categoryBadgeColour keeps the custom-property route for resting state.
		// categoryBadgeBgColour moved to sgs_custom_property_gradient_decls() to
		// support hover variants (categoryBadgeBgColourHover +
		// categoryBadgeBgColourHoverGradient), emitted as --sgs-pg-badge-bg,
		// --sgs-pg-badge-bg-hover, --sgs-pg-badge-bg-gradient,
		// --sgs-pg-badge-bg-hover-gradient. Fallback chain in style.css allows
		// unset hover to be byte-identical to before.
		$card_vars = [];

		// Badge text colour (resting only).
		if ( ! empty( $params['categoryBadgeColour'] ) ) {
			$card_vars[] = '--sgs-pg-badge-colour:' . sgs_colour_value( $params['categoryBadgeColour'] );
		}

		// Badge background colour (with hover support).
		$badge_bg_decls = sgs_custom_property_gradient_decls(
			'sgs-pg-badge-bg',
			! empty( $params['categoryBadgeBgColour'] ) ? (string) $params['categoryBadgeBgColour'] : '',
			(string) ( $params['categoryBadgeBgColourGradient'] ?? '' ),
			(string) ( $params['categoryBadgeBgColourHover'] ?? '' ),
			(string) ( $params['categoryBadgeBgColourHoverGradient'] ?? '' )
		);
		$card_vars = array_merge( $card_vars, $badge_bg_decls );

		$aspect_ratio = isset( $params['aspectRatio'] ) ? sanitize_text_field( $params['aspectRatio'] ) : '16/10';
		$card_vars[]  = '--sgs-pg-aspect:' . $aspect_ratio;

		return implode( ';', $card_vars ) . ';';
	}

	/**
	 * Render a single post card to HTML.
	 *
	 * Shared between render.php (initial server render) and the REST
	 * endpoint (AJAX subsequent pages). Changes here affect both paths.
	 *
	 * @param int   $post_id The post ID to render.
	 * @param array $params  Block attributes / REST parameters.
	 * @return string Complete <article> HTML for one card.
	 */
	public static function render_card( int $post_id, array $params ): string {
		require_once dirname( __FILE__ ) . '/render-helpers.php';

		$card_style    = isset( $params['cardStyle'] ) ? sanitize_key( $params['cardStyle'] ) : 'card';
		$show_image    = isset( $params['showImage'] ) ? (bool) $params['showImage'] : true;
		$show_title    = isset( $params['showTitle'] ) ? (bool) $params['showTitle'] : true;
		$show_excerpt  = isset( $params['showExcerpt'] ) ? (bool) $params['showExcerpt'] : true;
		$show_date     = isset( $params['showDate'] ) ? (bool) $params['showDate'] : true;
		$show_author   = isset( $params['showAuthor'] ) ? (bool) $params['showAuthor'] : false;
		$show_category = isset( $params['showCategory'] ) ? (bool) $params['showCategory'] : true;
		$show_readmore = isset( $params['showReadMore'] ) ? (bool) $params['showReadMore'] : true;
		$readmore_text = isset( $params['readMoreText'] ) ? sanitize_text_field( $params['readMoreText'] ) : 'Read more';
		$excerpt_len   = isset( $params['excerptLength'] ) ? absint( $params['excerptLength'] ) : 20;
		$image_size    = isset( $params['imageSize'] ) ? sanitize_key( $params['imageSize'] ) : 'medium_large';
		$aspect_ratio  = isset( $params['aspectRatio'] ) ? sanitize_text_field( $params['aspectRatio'] ) : '16/10';
		$card_index    = isset( $params['_card_index'] ) ? absint( $params['_card_index'] ) : 1;

		// 37-media-no-handroll: the block's own uid, threaded through so the
		// featured-image <img> can carry the shared media-atom marker class
		// (SGS_Media_Element::scope_class()). render.php passes it via
		// $card_params for the initial render; view.js's AJAX pagination
		// round-trips it back as a REST param (see render.php's
		// $sgs_query_data 'uid' key) so cards injected later match the SAME
		// `.{uid}{--sgs-media-object-fit:…}` rule already printed in the
		// page's <head> on first load — that rule is a bare class selector,
		// so it matches DOM added after the stylesheet was parsed.
		$sgs_pg_uid = isset( $params['uid'] ) && is_string( $params['uid'] ) ? sanitize_html_class( $params['uid'] ) : '';

		// FR-32-4 as amended (D345): the per-instance colour + aspect custom
		// property VALUES are NO LONGER emitted inline on the card root. They are
		// emitted once, by render.php, as a scoped
		// `.{uid}.wp-block-sgs-post-grid .sgs-post-grid__card{…}` rule — see
		// card_vars_decls() below, which is the single source of both.
		//
		// The superseded comment here claimed the inline attribute was required
		// because "AJAX-paginated cards are injected OUTSIDE the block's scoped
		// <style>". That conflated two different things: a card injected into
		// `.sgs-post-grid__inner` (view.js) is still a DESCENDANT of the block
		// root, so the scoped descendant rule matches it. CSS rules apply to DOM
		// added after the stylesheet was parsed — the element does not have to
		// exist when the rule is read. Zero inline property declarations anywhere
		// in the card subtree (Spec 32 no-inline; R4, 2026-07-10).

		// Per-element inline style slots are now empty — colour comes from the
		// card var() cascade in style.css (R4 no-inline).
		$title_style    = '';
		$excerpt_style  = '';
		$meta_style     = '';
		$readmore_style = '';
		$badge_style    = '';

		$permalink = esc_url( get_permalink( $post_id ) );
		$title     = esc_html( get_the_title( $post_id ) );

		// Performance: first card gets priority loading hints; rest are lazy.
		$img_loading  = 0 === $card_index ? 'eager' : 'lazy';
		$img_priority = 0 === $card_index ? ' fetchpriority="high"' : '';

		// Build card HTML.
		$card = '<article class="sgs-post-grid__card sgs-post-grid__card--' . esc_attr( $card_style ) . '">';

		// --- Image section -----------------------------------------------
		if ( $show_image ) {
			$img_attrs = [
				'class'   => 'sgs-post-grid__img',
				'loading' => $img_loading,
			];

			if ( 0 === $card_index ) {
				$img_attrs['fetchpriority'] = 'high';
			}

			// 37-media-no-handroll: media-atom marker classes (see the $sgs_pg_uid
			// comment above). Appended to the same `class` attr `get_the_post_
			// thumbnail()` already receives — one <img>, one class string.
			if ( '' !== $sgs_pg_uid && class_exists( 'SGS_Media_Element' ) ) {
				$img_attrs['class'] .= ' ' . implode(
					' ',
					\SGS_Media_Element::element_classes( \SGS_Media_Element::scope_class( $sgs_pg_uid, '' ) )
				);
			}

			if ( has_post_thumbnail( $post_id ) ) {
				$card .= sprintf(
					'<a href="%s" class="sgs-post-grid__image-link" tabindex="-1" aria-hidden="true"><div class="sgs-post-grid__image">%s</div></a>',
					$permalink,
					get_the_post_thumbnail( $post_id, $image_size, $img_attrs )
				);
			} elseif ( 'minimal' !== $card_style ) {
				// Placeholder shown for card/flat/overlay when no featured image is set.
				$card .= sprintf(
					'<a href="%s" class="sgs-post-grid__image-link" tabindex="-1" aria-hidden="true"><div class="sgs-post-grid__image sgs-post-grid__image--placeholder"><div class="sgs-post-grid__image-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5"/><polyline points="21 15 16 10 5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div></a>',
					$permalink
				);
			}

			// Category badge overlaid on image for card/overlay styles.
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

		// --- Content wrapper ---------------------------------------------
		$card .= '<div class="sgs-post-grid__content">';

		// Meta row: date and/or author above title.
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
				$author_id   = (int) get_post_field( 'post_author', $post_id );
				$author_name = get_the_author_meta( 'display_name', $author_id );
				$card       .= sprintf(
					'<span class="sgs-post-grid__author">%s</span>',
					esc_html( $author_name )
				);
			}

			$card .= '</div>';
		}

		// Inline category label for flat/minimal styles (no badge on image).
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

		// Title with accessible link.
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
			$card   .= sprintf(
				'<p class="sgs-post-grid__excerpt"%s>%s</p>',
				$excerpt_style,
				esc_html( $excerpt )
			);
		}

		// Read more link.
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
