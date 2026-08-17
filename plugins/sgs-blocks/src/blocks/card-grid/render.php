<?php
/**
 * Server-side render for the SGS Card Grid block.
 *
 * In manual mode:     renders the items array stored in block attributes.
 * In query mode:      fetches posts via WP_Query and maps them to card layout.
 * In wc-product mode: fetches WooCommerce products via Card_Grid_Products and
 *                     renders each as an sgs/product-card in wc-product mode.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — block is fully dynamic).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-card-grid-products.php';
// WooCommerce-INDEPENDENT collection engine + shared pagination markup. Folded
// in from sgs/content-collection on 2026-08-01: Card_Grid_Products above returns
// an empty array without WooCommerce, so this second engine is what keeps a
// product collection working on a bare WordPress install.
require_once dirname( __DIR__, 3 ) . '/includes/class-cpt-collection-query.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-grid-pagination.php';

// CSS length/unit sanitiser — for free-text length values (border width,
// letter-spacing) concatenated into raw CSS declarations inside this block's
// own scoped <style> tag. Strips everything except letters, digits, dot, and
// % so a Contributor-authored malicious value can never break out of the
// declaration into a new CSS rule. Mirrors sgs/hero's proven sanitiser.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / text-transform / font-weight / font-style) —
// letters + hyphen only.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$source  = $attributes['source'] ?? 'manual';
$variant = $attributes['variant'] ?? 'card';
$items   = $attributes['items'] ?? array();
// `columns` is a TIER OBJECT (Spec 35 pass 4, 2026-08-11) — read each tier via
// the normaliser, never the raw attribute (absint() on an unresolved array
// throws "Array to int conversion" and would emit e.g. `columns:0`, exactly
// the D569/D570 bug class this normaliser exists to prevent).
$columns_obj    = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns        = $columns_obj['desktop'] ?? 3;
$columns_tablet = $columns_obj['tablet'] ?? 2;
$columns_mobile = $columns_obj['mobile'] ?? 1;
// `gap` is a TIER OBJECT (Spec 35 pass 1, 2026-08-10) - read the desktop tier, never
// the raw array (a string cast downstream would emit `gap:Array`).
$gap_obj      = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$gap          = ( '' !== (string) ( $gap_obj['desktop'] ?? '' ) ) ? $gap_obj['desktop'] : '30';
$aspect_ratio = $attributes['aspectRatio'] ?? '16/10';
$hover_effect = sanitize_key( $attributes['effectHover'] ?? 'zoom' );
// overlayStyle removed — no editor control, no consumer anywhere in the
// repo (D338 full-repo grep, 2026-08-06); abandoned attribute, deleted from
// block.json too.
$title_colour        = $attributes['titleColour'] ?? '';
$subtitle_colour     = $attributes['subtitleColour'] ?? '';
$hover_bg            = $attributes['backgroundColourHover'] ?? '';
$hover_bg_gradient   = $attributes['backgroundColourHoverGradient'] ?? '';
$hover_bg_gradient   = $attributes['backgroundColourHoverGradient'] ?? '';
$hover_text          = $attributes['textColourHover'] ?? '';
$hover_border        = $attributes['borderColourHover'] ?? '';
// D636 border-colour gradient siblings — resolved once here, emitted via
// sgs_border_gradient_css() masked ::before further down; border-color can
// never legally hold a gradient value, so these never feed --sgs-hover-border
// / --sgs-card-border-color above.
$hover_border_gradient = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
$transition_dur      = $attributes['transitionDuration'] ?? '300';
$transition_ease     = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale         = $attributes['scaleHover'] ?? '';
$hover_shadow        = $attributes['shadowHover'] ?? '';
$hover_shadow_colour = $attributes['shadowHoverColour'] ?? '';
$card_background          = $attributes['cardBackground'] ?? '';
$card_background_gradient = $attributes['cardBackgroundGradient'] ?? '';
$card_border_colour  = $attributes['cardBorderColour'] ?? '';
$card_border_gradient = sgs_css_gradient_value( $attributes['cardBorderColourGradient'] ?? '' );
$card_border_width   = $attributes['cardBorderWidth'] ?? array();
$card_radius         = $attributes['cardRadius'] ?? '';
$card_shadow         = $attributes['cardShadow'] ?? '';
$card_shadow_colour  = $attributes['cardShadowColour'] ?? '';
$hover_image_zoom    = ! empty( $attributes['imageZoomHover'] );
$hover_grayscale     = ! empty( $attributes['grayscaleHover'] );
$stagger_delay       = $attributes['staggerDelay'] ?? 0;
$query_post_type     = sanitize_key( $attributes['queryPostType'] ?? 'post' );
$query_per_page      = absint( $attributes['queryPostsPerPage'] ?? 6 );
$query_category      = absint( $attributes['queryCategory'] ?? 0 );

// ── Instance uid — a CLASS (matches the container/hero/quote convention) so
// this grid's WP-native supports + title/subtitle colours can be scoped to
// THIS instance only (multiple grids may sit on one page). Reused across all
// three render paths below (empty state / wc-product grid / manual-query grid)
// so every path shares the identical scoping hook.
$uid      = 'sgs-cg-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-card-grid';

// ── WP-native color / border / typography / shadow supports — no-inline
// contract. block.json declares color/typography/spacing/__experimentalBorder/
// shadow ALL with __experimentalSkipSerialization:true, so
// get_block_wrapper_attributes() (called inside SGS_Container_Wrapper::render())
// never auto-inlines them. Read the resolved values from $attributes['style']
// here and emit them into THIS block's OWN scoped <style> (composite caveat —
// do NOT pass these as wrapper `extra_styles`, that path inlines). Base
// spacing (padding/margin) is a separate mechanism the wrapper already
// handles scoped internally — not duplicated here.
$card_grid_native_css = '';
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$cg_style_engine_args = array();

	$cg_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$cg_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$cg_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$cg_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $cg_color_args ) ) {
		$cg_style_engine_args['color'] = $cg_color_args;
	}

	$cg_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$cg_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$cg_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$cg_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$cg_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $cg_radius_raw ) && '' !== $cg_radius_raw ) {
			$cg_border_args['radius'] = $sgs_css_length( $cg_radius_raw );
		} elseif ( is_array( $cg_radius_raw ) ) {
			$cg_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $cg_corner ) {
				if ( ! empty( $cg_radius_raw[ $cg_corner ] ) ) {
					$cg_radius_clean[ $cg_corner ] = $sgs_css_length( $cg_radius_raw[ $cg_corner ] );
				}
			}
			if ( ! empty( $cg_radius_clean ) ) {
				$cg_border_args['radius'] = $cg_radius_clean;
			}
		}
	}
	if ( ! empty( $cg_border_args ) ) {
		$cg_style_engine_args['border'] = $cg_border_args;
	}

	if ( isset( $attributes['style']['shadow'] ) && '' !== $attributes['style']['shadow'] ) {
		$cg_style_engine_args['shadow'] = (string) $attributes['style']['shadow'];
	}

	if ( ! empty( $cg_style_engine_args ) ) {
		$cg_scoped_styles = wp_style_engine_get_styles(
			$cg_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $cg_scoped_styles['css'] ) ) {
			$card_grid_native_css .= $cg_scoped_styles['css'];
		}
	}

	// Typography — block.json selectors.typography targets .sgs-card-grid__title,
	// so scope the native typography rule there (distinct from the per-instance
	// titleFontSize/subtitleFontSize custom-attr mechanism further below).
	$cg_typography_args = array();
	if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
		$cg_typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
	}
	if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
		$cg_typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
	}
	if ( isset( $attributes['style']['typography']['letterSpacing'] ) && '' !== $attributes['style']['typography']['letterSpacing'] ) {
		$cg_typography_args['letterSpacing'] = $sgs_css_length( $attributes['style']['typography']['letterSpacing'] );
	}
	if ( isset( $attributes['style']['typography']['textTransform'] ) && '' !== $attributes['style']['typography']['textTransform'] ) {
		$cg_typography_args['textTransform'] = $sgs_css_keyword( $attributes['style']['typography']['textTransform'] );
	}
	if ( isset( $attributes['style']['typography']['fontWeight'] ) && '' !== $attributes['style']['typography']['fontWeight'] ) {
		$cg_typography_args['fontWeight'] = $sgs_css_keyword( (string) $attributes['style']['typography']['fontWeight'] );
	}
	if ( isset( $attributes['style']['typography']['fontStyle'] ) && '' !== $attributes['style']['typography']['fontStyle'] ) {
		$cg_typography_args['fontStyle'] = $sgs_css_keyword( $attributes['style']['typography']['fontStyle'] );
	}
	if ( ! empty( $cg_typography_args ) ) {
		$cg_typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $cg_typography_args ),
			array( 'selector' => $root_sel . ' .sgs-card-grid__title' )
		);
		if ( ! empty( $cg_typography_scoped['css'] ) ) {
			$card_grid_native_css .= $cg_typography_scoped['css'];
		}
	}
	if ( isset( $attributes['style']['typography']['textAlign'] ) && in_array( $attributes['style']['typography']['textAlign'], array( 'left', 'center', 'right' ), true ) ) {
		$card_grid_native_css .= $root_sel . ' .sgs-card-grid__title{text-align:' . $attributes['style']['typography']['textAlign'] . '}';
	}
}

// ── FR-35-5 STATE_WITHOUT_BASE fix (Task 4, 2026-07-21, Bean's Option A) ────
// Resting-state fill/border/shadow for the card tile. An empty control means
// the card inherits the theme token exactly as before — these are custom-
// property FALLBACKS in style.css (`var(--sgs-card-background,
// var(--wp--preset--color--surface, #fff))` etc.), never a baked default, so
// an unmigrated instance renders byte-identical to pre-fix. Scoped to
// `.sgs-card-grid__item` under this instance's own uid; the wc-product
// delegation path (below) renders sgs/product-card markup, which has no
// `.sgs-card-grid__item` element at all, so this rule is a harmless no-op
// there and never leaks into product-card's own styling.
$card_state_vars = array();
if ( '' !== $card_background || '' !== $card_background_gradient ) {
	$card_bg_paint = sgs_background_paint_value( $card_background, $card_background_gradient );
	if ( 'background-image' === $card_bg_paint['property'] ) {
		// Higher specificity than style.css's `.sgs-card-grid__item{background:var(...)}`
		// (this rule is scoped to `{$root_sel} .sgs-card-grid__item`), so a real
		// `background-image` declaration here always wins regardless of load order.
		$card_state_vars[] = 'background-image:' . $card_bg_paint['value'] . ';';
	} elseif ( 'background-color' === $card_bg_paint['property'] ) {
		$card_state_vars[] = '--sgs-card-background:' . $card_bg_paint['value'] . ';';
	}
}
if ( '' !== $card_border_colour ) {
	$card_state_vars[] = '--sgs-card-border-color:' . sgs_colour_value( $card_border_colour ) . ';';
}
if ( is_array( $card_border_width ) && array_filter( $card_border_width, static fn( $v ) => '' !== (string) $v ) ) {
	$card_border_width_sides = array();
	foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
		$side_value                = $card_border_width[ $side ] ?? '';
		$card_border_width_sides[] = '' !== $side_value ? $sgs_css_length( $side_value ) : '0';
	}
	$card_state_vars[] = '--sgs-card-border-width:' . implode( ' ', $card_border_width_sides ) . ';';
}
if ( '' !== $card_radius ) {
	$card_state_vars[] = '--sgs-card-radius:' . $sgs_css_length( $card_radius ) . ';';
}
if ( '' !== $card_shadow ) {
	$card_state_vars[] = '--sgs-card-shadow:' . sgs_shadow_value_composed( $card_shadow, $card_shadow_colour ) . ';';
}
if ( ! empty( $card_state_vars ) ) {
	$card_grid_native_css .= $root_sel . ' .sgs-card-grid__item{' . implode( '', $card_state_vars ) . '}';
}

// --- Border gradient (D636 border builder) — masked ::before, replaces the
// flat --sgs-card-border-color / --sgs-hover-border custom-property scheme
// above when set. ---
if ( '' !== $card_border_gradient ) {
	$card_grid_native_css .= sgs_border_gradient_css(
		$root_sel . ' .sgs-card-grid__item',
		$card_border_gradient,
		'' !== $hover_border_gradient ? $hover_border_gradient : sgs_colour_value( $hover_border ),
		'1px'
	);
}

// ── Explicit media crop (Spec 35 capability-routing doctrine Part 9,
// mechanism (c)) — block.json declares BOTH `imageControls: true` (keeps the
// sgsObjectPosition/sgsObjectFit attrs + the universal editor UI) and
// `imageControlsExplicit: true` (opts OUT of includes/image-controls.php's
// guessed-root render_block injector, which can never find this block's real
// media element — it lives inside `.sgs-card-grid__image-wrap`, several
// levels under the guessed root, and only in the manual/query render path
// below). This is the SINGLE block-wide crop setting applied uniformly to
// EVERY card's media (per-card cropping is an explicit non-goal — items[] is
// an array, one sgsObjectPosition/sgsObjectFit pair cannot differ per card).
// Targets both <img> and <video> since the media slot accepts either
// (sgs_render_media()). Scoped by $root_sel so multiple grids on one page
// never collide; harmless no-op in the wc-product/cpt-collection branches
// below, which delegate to sgs/product-card and never render
// `.sgs-card-grid__image-wrap` at all.
$card_grid_native_css .= sgs_media_position_css(
	$attributes,
	'sgs',
	$root_sel . ' .sgs-card-grid__image-wrap img, ' . $root_sel . ' .sgs-card-grid__image-wrap video'
);

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero / sgs/quote) so preset palette colours still
// resolve visually.
$card_grid_preset_classes = array();
$cg_preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$cg_preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $cg_preset_text_slug ) {
	$card_grid_preset_classes[] = 'has-text-color';
	$card_grid_preset_classes[] = 'has-' . $cg_preset_text_slug . '-color';
}
if ( '' !== $cg_preset_bg_slug ) {
	$card_grid_preset_classes[] = 'has-background';
	$card_grid_preset_classes[] = 'has-' . $cg_preset_bg_slug . '-background-color';
}

// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators like `>` intact (contract §D — matches SGS_Container_Wrapper +
// sgs/hero). Every value reaching $card_grid_native_css is pre-sanitised
// ($sgs_css_length / $sgs_css_keyword / wp_style_engine_get_styles), so no
// un-sanitised value survives to here.
$card_grid_native_style_tag = $card_grid_native_css ? '<style id="' . esc_attr( $uid ) . '-native">' . wp_strip_all_tags( $card_grid_native_css ) . '</style>' : '';

// Query mode: fetch posts and map to card data.
if ( 'query' === $source ) {
	$query_args = array(
		'post_type'      => $query_post_type,
		'posts_per_page' => $query_per_page,
		'post_status'    => 'publish',
		'no_found_rows'  => true,
	);

	if ( $query_category > 0 ) {
		$query_args['cat'] = $query_category;
	}

	$grid_query  = new WP_Query( $query_args );
	$query_items = array();

	foreach ( $grid_query->posts as $grid_post ) {
		$thumb_id  = get_post_thumbnail_id( $grid_post->ID );
		$thumb_url = $thumb_id ? wp_get_attachment_image_url( $thumb_id, 'large' ) : '';
		$thumb_alt = $thumb_id ? (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) : '';

		$query_items[] = array(
			'title'    => get_the_title( $grid_post ),
			'subtitle' => wp_trim_words( get_the_excerpt( $grid_post ), 15, '…' ),
			'link'     => get_permalink( $grid_post ),
			'image'    => $thumb_url ? array(
				'url' => $thumb_url,
				'alt' => $thumb_alt,
			) : null,
			'badge'    => '',
		);
	}

	$items = $query_items;
	wp_reset_postdata();
}

/*
 * Card-delegating modes: render each result through the dual-mode
 * sgs/product-card rather than this block's own generic card markup.
 *
 *   'wc-product'     — query delegated to Card_Grid_Products (HPOS-safe,
 *                      WC-canonical). Returns nothing without WooCommerce.
 *   'cpt-collection' — query delegated to CPT_Collection_Query. Plain WP_Query
 *                      over a custom post type with the seven meta-driven
 *                      selection rules. NO WooCommerce dependency — this is the
 *                      path folded in from sgs/content-collection (2026-08-01)
 *                      so a non-WooCommerce site can still render a product
 *                      collection. Removing it would delete a working
 *                      capability from every install without WooCommerce.
 *
 * Both share this branch's wrapper classes, CSS vars and empty state, so the
 * two data sources cannot drift apart visually.
 */
if ( 'wc-product' === $source || 'cpt-collection' === $source ) {
	$is_cpt_collection = ( 'cpt-collection' === $source );

	// Posts are only populated in cpt-collection mode; wc-product works from IDs.
	$collection_posts = array();
	$pagination_html  = '';

	if ( $is_cpt_collection ) {
		// Pagination is per-instance (sgs-page-{uid}) so several grids can
		// paginate independently on one page and neither collides with
		// WordPress's own `paged` var on a static Page.
		$collection_pagination = sanitize_key( $attributes['pagination'] ?? 'none' );
		$collection_page_var   = \SGS\Blocks\Grid_Pagination::page_var( $uid );
		$collection_paged      = 'none' !== $collection_pagination
			? \SGS\Blocks\Grid_Pagination::current_page_from_request( $collection_page_var )
			: 0;

		// The query helper primes the meta cache for the whole result set in one
		// round-trip (the N+1 guard ported from content-collection/render.php:167).
		$collection_result = \SGS\Blocks\CPT_Collection_Query::get_results(
			$attributes,
			array( 'paged' => $collection_paged )
		);

		$collection_posts = $collection_result['posts'];
		$product_ids      = array_map( 'absint', wp_list_pluck( $collection_posts, 'ID' ) );

		$pagination_html = \SGS\Blocks\Grid_Pagination::render(
			array(
				'base_class'   => 'sgs-card-grid',
				'type'         => $collection_pagination,
				'total_pages'  => (int) $collection_result['max_num_pages'],
				'current_page' => (int) $collection_result['paged'],
				// No view.js on this block — real links, not inert buttons.
				'mode'         => \SGS\Blocks\Grid_Pagination::MODE_LINK,
				'page_var'     => $collection_page_var,
				'nav_label'    => __( 'Collection pagination', 'sgs-blocks' ),
			)
		);

		$empty_message = sanitize_text_field(
			$attributes['emptyMessage'] ?? __( 'No items to show yet. Check back soon.', 'sgs-blocks' )
		);
	} else {
		$product_ids   = \SGS\Blocks\Card_Grid_Products::get_product_ids( $attributes );
		$empty_message = sanitize_text_field(
			$attributes['productEmptyMessage'] ?? __( 'No products to show at the moment. Check back soon.', 'sgs-blocks' )
		);
	}

	// ── Build shared wrapper props (same CSS vars the other modes use) ───────
	$wc_class_names = array_merge(
		array(
			'sgs-card-grid',
			'sgs-card-grid--card', // Product cards always use card variant.
			'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
			$uid,
		),
		$card_grid_preset_classes
	);
	if ( $hover_scale ) {
		$wc_class_names[] = 'sgs-has-hover-scale';
	}
	if ( $hover_shadow ) {
		$wc_class_names[] = 'sgs-has-hover';
	}
	if ( $stagger_delay ) {
		$wc_class_names[] = 'sgs-has-stagger';
	}

	$gap_value_wc   = sgs_container_gap_value( $gap );
	$wc_style_parts = array(
		'--sgs-card-grid-columns: ' . absint( $columns ),
		'--sgs-card-grid-columns-mobile: ' . absint( $columns_mobile ),
		'--sgs-card-grid-columns-tablet: ' . absint( $columns_tablet ),
		'--sgs-card-grid-gap: ' . $gap_value_wc,
	);
	if ( $hover_bg ) {
		$wc_style_parts[] = '--sgs-hover-bg: var(--wp--preset--color--' . sanitize_key( $hover_bg ) . ')';
	}
	$hover_bg_gradient_value = sgs_css_gradient_value( $hover_bg_gradient );
	if ( '' !== $hover_bg_gradient_value ) {
		$wc_style_parts[] = '--sgs-hover-bg-image: ' . $hover_bg_gradient_value;
	}
	if ( $hover_text ) {
		$wc_style_parts[] = '--sgs-hover-text: var(--wp--preset--color--' . sanitize_key( $hover_text ) . ')';
	}
	if ( $hover_border ) {
		$wc_style_parts[] = '--sgs-hover-border: var(--wp--preset--color--' . sanitize_key( $hover_border ) . ')';
	}
	if ( $transition_dur ) {
		$wc_style_parts[] = '--sgs-transition-duration: ' . absint( $transition_dur ) . 'ms';
	}
	if ( $transition_ease ) {
		$wc_style_parts[] = '--sgs-transition-easing: ' . esc_attr( $transition_ease );
	}
	if ( $hover_scale ) {
		$wc_style_parts[] = '--sgs-hover-scale: ' . esc_attr( $hover_scale );
	}
	if ( $hover_shadow ) {
		$wc_style_parts[] = '--sgs-hover-shadow: ' . sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour );
	}
	if ( $stagger_delay ) {
		$wc_style_parts[] = '--sgs-stagger: ' . absint( $stagger_delay ) . 'ms';
	}

	$wc_wrapper_opts = array(
		'tag'           => 'div',
		'extra_classes' => $wc_class_names,
		'extra_styles'  => $wc_style_parts,
	);

	// ── Empty state (FR-24-6 reuse) ──────────────────────────────────────────
	if ( empty( $product_ids ) ) {
		ob_start();
		?>
		<div class="sgs-card-grid__empty">
			<p class="sgs-card-grid__empty-message">
				<?php echo esc_html( $empty_message ); ?>
			</p>
		</div>
		<?php
		// Keep the pagination visible on an empty page. Without this, a visitor
		// who lands on an out-of-range page (a stale link, or items deleted since
		// it was shared) sees only the empty message with no way back to page 1.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Grid_Pagination::render() escapes every interpolated value internally.
		echo $pagination_html;

		$empty_html = ob_get_clean();

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_native_style_tag built from pre-sanitised values only (wp_strip_all_tags applied above).
		echo $card_grid_native_style_tag;
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally.
		echo SGS_Container_Wrapper::render( $attributes, $block, $empty_html, 'layout', $wc_wrapper_opts );
		return;
	}

	// ── Render each result as an sgs/product-card ───────────────────────────
	// Mirror of the former content-collection render.php §6 — render_block()
	// returns fully-rendered, escaped markup (house pattern file:render.php:242).
	ob_start();

	if ( $is_cpt_collection ) {
		/*
		 * Source mode is resolved PER ITEM (R-22-9 — universal, no hardcoded
		 * per-type dict), exactly as content-collection did:
		 *   - a WooCommerce `product` post, on a site where WC is active → 'wc-product'
		 *   - everything else (including sgs_product)                    → 'sgs-cpt'
		 * On a site WITHOUT WooCommerce every item resolves to 'sgs-cpt', which
		 * is the whole point of this path.
		 */
		$collection_has_woocommerce = function_exists( 'WC' );

		foreach ( $collection_posts as $collection_post ) :
			$collection_post_id   = absint( $collection_post->ID );
			$collection_post_type = $collection_post->post_type;

			$item_source_mode = ( $collection_has_woocommerce && 'product' === $collection_post_type )
				? 'wc-product'
				: 'sgs-cpt';

			// Collection-level card-behaviour attrs forwarded to each card.
			// Defaults match product-card's own defaults, so omitting them stays
			// backwards-compatible (R-22-9 — no per-item logic).
			$card_attrs = array(
				'sourceMode'   => $item_source_mode,
				'productId'    => $collection_post_id,
				// showPickers: false on browsing grids suppresses axis + pill pickers.
				'showPickers'  => isset( $attributes['showPickers'] ) ? (bool) $attributes['showPickers'] : true,
				// ctaBehaviour: learn-more (link to the product page) is the browsing default.
				'ctaBehaviour' => isset( $attributes['ctaBehaviour'] ) ? sanitize_key( $attributes['ctaBehaviour'] ) : 'learn-more',
				// showLadder: false on browsing grids — price + per-unit note only.
				'showLadder'   => isset( $attributes['showLadder'] ) ? (bool) $attributes['showLadder'] : false,
			);

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
			echo render_block(
				array(
					'blockName' => 'sgs/product-card',
					'attrs'     => $card_attrs,
				)
			);
		endforeach;
	} else {
		foreach ( $product_ids as $wc_product_id ) :
			$card_attrs = array(
				'sourceMode' => 'wc-product',
				'productId'  => absint( $wc_product_id ),
				'showLadder' => (bool) ( $attributes['productShowLadder'] ?? false ),
			);
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
			echo render_block(
				array(
					'blockName' => 'sgs/product-card',
					'attrs'     => $card_attrs,
				)
			);
		endforeach;
	}

	// Pagination sits INSIDE the block wrapper but after the cards. Empty string
	// in wc-product mode and whenever there is a single page.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Grid_Pagination::render() escapes every interpolated value internally.
	echo $pagination_html;

	$wc_inner_html = ob_get_clean();

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_native_style_tag built from pre-sanitised values only (wp_strip_all_tags applied above).
	echo $card_grid_native_style_tag;
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally.
	echo SGS_Container_Wrapper::render( $attributes, $block, $wc_inner_html, 'layout', $wc_wrapper_opts );

	// ItemList JSON-LD is emitted page-level by Product_Item_List
	// (includes/class-product-item-list.php) — single source of truth; no
	// per-grid emission here (prevents double-emission with loose cards).
	return;
}

if ( empty( $items ) ) {
	return '';
}

// Build class list. Reuses the shared $uid computed above (same instance
// scoping hook as the WP-native supports re-emit, wc-product branches).
$sgs_grid_uid = $uid;
$class_names  = array_merge(
	array(
		'sgs-card-grid',
		'sgs-card-grid--' . esc_attr( $variant ),
		'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
		$sgs_grid_uid,
	),
	$card_grid_preset_classes
);

// Title/subtitle font-size (CG-9): block-wide typography via the shared
// TypographyControls attr shape, scoped to this grid instance's uid so
// multiple grids on one page can differ. Only set values are emitted.
$sgs_grid_typo_css  = sgs_typography_css_rule( $attributes, 'title', '.' . $sgs_grid_uid . ' .sgs-card-grid__title' );
$sgs_grid_typo_css .= sgs_typography_css_rule( $attributes, 'subtitle', '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle' );

// Per-item title/subtitle colour (was inline `style="color:…"` on every
// title/subtitle element — moved to a scoped rule keyed off the same uid so
// no rendered element carries an inline CSS property declaration).
if ( $title_colour ) {
	$sgs_grid_typo_css .= '.' . $sgs_grid_uid . ' .sgs-card-grid__title{color:' . sgs_colour_value( $title_colour ) . '}';
}
if ( $subtitle_colour ) {
	$sgs_grid_typo_css .= '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle{color:' . sgs_colour_value( $subtitle_colour ) . '}';
}

$sgs_grid_typo_tag = '' !== $sgs_grid_typo_css ? '<style>' . wp_strip_all_tags( $sgs_grid_typo_css ) . '</style>' : '';

if ( $hover_scale ) {
	$class_names[] = 'sgs-has-hover-scale';
}
if ( $hover_shadow ) {
	$class_names[] = 'sgs-has-hover';
}
if ( $hover_image_zoom ) {
	$class_names[] = 'sgs-has-img-zoom';
}
if ( $hover_grayscale ) {
	$class_names[] = 'sgs-has-grayscale';
}
if ( $stagger_delay ) {
	$class_names[] = 'sgs-has-stagger';
}

// Resolve gap via the shared helper — handles both preset slugs ("30" →
// var(--wp--preset--spacing--30)) and raw CSS lengths ("16px" → "16px").
// Back-compat: the old SelectControl only wrote bare numeric slugs, so
// existing posts are covered by the slug branch. New posts written via the
// shared ContainerWrapperControls SpacingControl may be raw lengths.
$gap_value = sgs_container_gap_value( $gap );

// Build grid CSS custom properties.
$grid_style_parts = array(
	'--sgs-card-grid-columns: ' . absint( $columns ),
	'--sgs-card-grid-columns-mobile: ' . absint( $columns_mobile ),
	'--sgs-card-grid-columns-tablet: ' . absint( $columns_tablet ),
	'--sgs-card-grid-gap: ' . $gap_value,
	'--sgs-card-grid-aspect: ' . esc_attr( $aspect_ratio ),
);

if ( $hover_bg ) {
	$grid_style_parts[] = '--sgs-hover-bg: var(--wp--preset--color--' . sanitize_key( $hover_bg ) . ')';
}
$hover_bg_gradient_value = sgs_css_gradient_value( $hover_bg_gradient );
if ( '' !== $hover_bg_gradient_value ) {
	$grid_style_parts[] = '--sgs-hover-bg-image: ' . $hover_bg_gradient_value;
}
if ( $hover_text ) {
	$grid_style_parts[] = '--sgs-hover-text: var(--wp--preset--color--' . sanitize_key( $hover_text ) . ')';
}
if ( $hover_border ) {
	$grid_style_parts[] = '--sgs-hover-border: var(--wp--preset--color--' . sanitize_key( $hover_border ) . ')';
}
if ( $transition_dur ) {
	$grid_style_parts[] = '--sgs-transition-duration: ' . absint( $transition_dur ) . 'ms';
}
if ( $transition_ease ) {
	$grid_style_parts[] = '--sgs-transition-easing: ' . esc_attr( $transition_ease );
}
if ( $hover_scale ) {
	$grid_style_parts[] = '--sgs-hover-scale: ' . esc_attr( $hover_scale );
}
if ( $hover_shadow ) {
	$grid_style_parts[] = '--sgs-hover-shadow: ' . sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour );
}
if ( $stagger_delay ) {
	$grid_style_parts[] = '--sgs-stagger: ' . absint( $stagger_delay ) . 'ms';
}

// Per-item stagger-index custom-property VALUE (FR-32-4, D345) — varies per
// item, so it cannot be a single scoped rule on the block root; emitted into a
// `:nth-child(N)` scoped rule instead (same mechanism as sgs/social-icons' /
// sgs/pricing-table's per-item colour), N = this item's 1-based position among
// ALL rendered card items (every item renders `.sgs-card-grid__item`
// unconditionally). Was previously an inline `style="--sgs-item-index:N"`.
$card_grid_stagger_css = '';

// Build the interior HTML (card items).
ob_start();
foreach ( $items as $index => $item ) :
	// Task 2.1) resolved via sgs_link_attributes() — link/linkTarget/linkRel
	// are the existing per-item storage keys, mapped to the shared
	// SgsLinkControl object shape { url, opensInNewTab, rel } at render time.
	$link_attr = sgs_link_attributes(
		array(
			'url'           => $item['link'] ?? '',
			'opensInNewTab' => isset( $item['linkTarget'] ) && '_blank' === $item['linkTarget'],
			'rel'           => $item['linkRel'] ?? '',
		)
	);
	$has_link  = '' !== $link_attr;
	$item_tag  = $has_link ? 'a' : 'div';
	if ( $stagger_delay ) {
		$card_grid_stagger_css .= $root_sel . ' .sgs-card-grid__item:nth-child(' . ( absint( $index ) + 1 ) . '){--sgs-item-index:' . absint( $index ) . ';}';
	}

	// Unified media slot — sgs_render_media() emits the right tag for either
	// image or video. The legacy per-item `image` field (never declared in
	// block.json's items schema) was removed 2026-08-03.
	$item_media = $item['media'] ?? null;
	// A BARE URL STRING is a first-class accepted shape (2026-07-29). block.json
	// declares `items[].media` as `{"type":"string"}` while edit.js writes the
	// object form, and `sgs_render_media()` bails on anything that is not an
	// array (helpers-media.php:168) — so a string URL rendered NOTHING, silently,
	// with an empty `.sgs-card-grid__image-wrap` left behind. That is exactly how
	// both shipped mega starter patterns (sgs/mega-brands-1, sgs/mega-media-cards-1)
	// lost all 8 of their card images through a green build. Normalising here
	// fixes every caller at once — patterns, and any converter/clone output that
	// emits the documented string shape — rather than patching the two patterns
	// and leaving the trap armed for the next author.
	// `alt` is deliberately '': these cards carry a visible title, so an alt that
	// repeated it would double-announce to a screen reader.
	if ( is_string( $item_media ) ) {
		$item_media = '' !== trim( $item_media )
			? array(
				'url'  => trim( $item_media ),
				'type' => 'image',
				'alt'  => '',
			)
			: null;
	}
	$media_html = ! empty( $item_media ) ? sgs_render_media( $item_media, 'sgs/card-grid' ) : '';
	?>
	<<?php echo esc_attr( $item_tag ); ?> class="sgs-card-grid__item"<?php echo $link_attr; ?>>
		<div class="sgs-card-grid__image-wrap">
			<?php if ( '' !== $media_html ) : ?>
				<?php echo $media_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_render_media(). ?>
			<?php endif; ?>
			<?php if ( 'overlay' === $variant || 'overlay-slide' === $hover_effect ) : ?>
				<div class="sgs-card-grid__overlay">
					<?php if ( ! empty( $item['title'] ) ) : ?>
						<span class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></span>
					<?php endif; ?>
					<?php if ( ! empty( $item['subtitle'] ) ) : ?>
						<span class="sgs-card-grid__subtitle"><?php echo esc_html( $item['subtitle'] ); ?></span>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>
		<?php if ( 'card' === $variant ) : ?>
			<div class="sgs-card-grid__body">
				<?php if ( ! empty( $item['title'] ) ) : ?>
					<h3 class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></h3>
				<?php endif; ?>
				<?php if ( ! empty( $item['subtitle'] ) ) : ?>
					<p class="sgs-card-grid__subtitle"><?php echo esc_html( $item['subtitle'] ); ?></p>
				<?php endif; ?>
				<?php if ( ! empty( $item['badge'] ) && ! empty( $item['badgeVariant'] ) ) : ?>
					<span class="sgs-card-grid__badge sgs-card-grid__badge--<?php echo esc_attr( $item['badgeVariant'] ); ?>">
						<?php echo esc_html( $item['badge'] ); ?>
					</span>
				<?php endif; ?>
			</div>
		<?php endif; ?>
	</<?php echo esc_attr( $item_tag ); ?>>
	<?php
endforeach;
$card_grid_stagger_tag = $card_grid_stagger_css ? '<style>' . wp_strip_all_tags( $card_grid_stagger_css ) . '</style>' : '';

// FR-32-4a (no-inline contract): the per-item stagger rule addresses items by
// `:nth-child(N)`, and `:nth-child` counts EVERY element sibling — including a
// `<style>` tag. Emitting these tags inside $inner_html would put them in the
// SAME parent as the card items and shift every index (by 1 to 3, depending on
// which of the three tags is non-empty), so item 0 would never be nth-child(1).
// They are therefore emitted BEFORE the wrapper — siblings of the block ROOT,
// not of the items — exactly as sgs/gallery, sgs/google-reviews and
// sgs/social-icons already do. $inner_html then holds ONLY the card items, so
// item N really is nth-child(N+1). Relative order of the three tags is
// preserved, and each is a `.{uid}`-scoped rule, so moving them earlier in the
// document cannot change which rule wins.
$card_grid_style_tags = $card_grid_native_style_tag . $sgs_grid_typo_tag . $card_grid_stagger_tag;
$inner_html           = ob_get_clean();

echo $card_grid_style_tags . SGS_Container_Wrapper::render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_style_tags is CSS passed through wp_strip_all_tags(); SGS_Container_Wrapper::render() escapes internally.
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $class_names,
		'extra_styles'  => $grid_style_parts,
	)
);
