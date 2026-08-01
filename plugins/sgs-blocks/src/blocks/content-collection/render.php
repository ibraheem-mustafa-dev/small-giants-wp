<?php
/**
 * Server-side render for the SGS Content Collection block.
 *
 * Runs its own WP_Query based on the `selectionRule` attribute, then renders
 * each result through the dual-mode `sgs/product-card` block in Bound mode.
 * No core Query Loop dependency — self-contained, inspector-driven.
 *
 * WS-4: OUTER wrapper is now rendered by SGS_Container_Wrapper (kind='layout').
 * Own classes + styles + --columns CSS var carried via extra_classes / extra_styles.
 *
 * Selection rules (FR-24-5):
 *   newest         — date DESC
 *   featured       — meta_query: sgs_featured = true, date DESC tiebreak
 *   most-expensive — meta_key sgs_price, meta_value_num DESC
 *   cheapest       — meta_key sgs_price, meta_value_num ASC
 *   most-popular   — meta_key sgs_views, meta_value_num DESC (date DESC fallback)
 *   handpicked     — post__in array, ordered by the handpickedIds array
 *   category       — tax_query on sgs_product_cat, date DESC
 *
 * All results capped at max 24 server-side (performance budget).
 *
 * Empty state (FR-24-6): when zero items match, renders a designed placeholder
 * with the operator-editable `emptyMessage`. Never blank. No-JS safe.
 *
 * R-22-1 / R-22-9: query args derived from the selection rule and CPT meta
 * registered in class-product-cpt.php — no hardcoded per-product logic.
 *
 * @since 1.0.0
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Not used (dynamic block, no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-cpt-collection-query.php';

/* ── 1. Resolve attributes ─────────────────────────────────────────────────── */

$columns       = absint( $attributes['columns'] ?? 3 );
$columns       = min( max( 1, $columns ), 6 ); // 1–6 columns.
$empty_message = sanitize_text_field( $attributes['emptyMessage'] ?? __( 'No items to show yet. Check back soon.', 'sgs-blocks' ) );

/* ── 2–3. Run the collection query ─────────────────────────────────────────── */

/*
 * FOLD NOTE (2026-08-01): the seven selection rules, the post-type allowlist
 * (B2) and the meta-cache priming (B1, the N+1 guard) used to be written out
 * inline here. They now live in SGS\Blocks\CPT_Collection_Query, because
 * sgs/card-grid gained the same capability (source = 'cpt-collection') and a
 * second copy of the rules would have been free to drift from this one.
 *
 * Behaviour is unchanged: no `paged` option is passed, so the query keeps the
 * `no_found_rows` fast path exactly as before.
 */
$collection_result = \SGS\Blocks\CPT_Collection_Query::get_results( $attributes );
$result_posts      = $collection_result['posts'];

/* ── 4. Wrapper: own classes and CSS vars for SGS_Container_Wrapper ─────────── */

// ── No-inline contract (§A) — block.json declares color/spacing/border ALL with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes() (called
// inside SGS_Container_Wrapper::render() below) never auto-inlines them. Base
// spacing (margin) is a SEPARATE mechanism the wrapper already handles scoped
// internally (reads $attributes['style']['spacing'] directly) — not duplicated
// here. Color + border are NOT touched by the wrapper, so this block emits them
// into its OWN scoped <style> (mirrors sgs/hero L645-744).
$cc_uid      = 'sgs-cc-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$cc_root_sel = '.' . $cc_uid . '.wp-block-sgs-content-collection';

// CSS-length sanitiser — letters, digits, dot, % only (mirrors sgs/hero/sgs/button).
$sgs_cc_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — free-text keyword attrs (border-style) — letters + hyphen only.
$sgs_cc_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$cc_responsive_css = '';

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$cc_style_engine_args = array();

	$cc_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$cc_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$cc_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$cc_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $cc_color_args ) ) {
		$cc_style_engine_args['color'] = $cc_color_args;
	}

	$cc_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$cc_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$cc_border_args['style'] = $sgs_cc_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$cc_border_args['width'] = $sgs_cc_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$cc_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $cc_radius_raw ) && '' !== $cc_radius_raw ) {
			$cc_border_args['radius'] = $sgs_cc_css_length( $cc_radius_raw );
		} elseif ( is_array( $cc_radius_raw ) ) {
			$cc_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $cc_corner ) {
				if ( ! empty( $cc_radius_raw[ $cc_corner ] ) ) {
					$cc_radius_clean[ $cc_corner ] = $sgs_cc_css_length( $cc_radius_raw[ $cc_corner ] );
				}
			}
			if ( ! empty( $cc_radius_clean ) ) {
				$cc_border_args['radius'] = $cc_radius_clean;
			}
		}
	}
	if ( ! empty( $cc_border_args ) ) {
		$cc_style_engine_args['border'] = $cc_border_args;
	}

	if ( ! empty( $cc_style_engine_args ) ) {
		$cc_scoped_styles = wp_style_engine_get_styles(
			$cc_style_engine_args,
			array( 'selector' => $cc_root_sel )
		);
		if ( ! empty( $cc_scoped_styles['css'] ) ) {
			$cc_responsive_css .= $cc_scoped_styles['css'];
		}
	}
}

// Output the scoped <style> before the wrapper markup. wp_strip_all_tags (NOT
// esc_html) blocks a </style> breakout while leaving CSS combinators intact
// (contract §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote). Every
// value reaching $cc_responsive_css is pre-sanitised above.
if ( $cc_responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $cc_responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $cc_uid ), wp_strip_all_tags( $cc_responsive_css ) );
}

$cc_extra_classes = array(
	'sgs-content-collection',
	$cc_uid,
);

$cc_extra_styles = array(
	'--columns:' . $columns,
);

$cc_wrapper_opts = array(
	'tag'           => 'div',
	'extra_classes' => $cc_extra_classes,
	'extra_styles'  => $cc_extra_styles,
);

/* ── 5. Empty state (FR-24-6) ──────────────────────────────────────────────── */

if ( empty( $result_posts ) ) {
	ob_start();
	?>
	<div class="sgs-content-collection__empty">
		<p class="sgs-content-collection__empty-message">
			<?php echo esc_html( $empty_message ); ?>
		</p>
	</div>
	<?php
	$empty_html = ob_get_clean();

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo SGS_Container_Wrapper::render( $attributes, $block, $empty_html, 'layout', $cc_wrapper_opts );

	wp_reset_postdata();
	return;
}

/* ── 6. Render items via the dual-mode product card ─────────────────────────── */

/*
 * Each post is rendered as an `sgs/product-card` in Bound mode.
 * `sourceMode` is resolved per item: if WooCommerce is active and the post
 * belongs to a WC product, use 'wc-product'; otherwise use 'sgs-cpt'.
 *
 * Phase 1: `sgs_product` CPT entries always use 'sgs-cpt'. WooCommerce products
 * (post_type = 'product') always use 'wc-product'. Any other CPT falls back
 * to 'sgs-cpt' so the collection generalises to future content types (FR-24-9,
 * R-22-9) without code changes.
 */

$has_woocommerce = function_exists( 'WC' );

ob_start();
?>
<ul class="sgs-content-collection__grid">
	<?php
	foreach ( $result_posts as $collection_post ) :
		$collection_post_id   = absint( $collection_post->ID );
		$collection_post_type = $collection_post->post_type;

		// Resolve source mode per item (R-22-9 — universal, no hardcoded per-type dict).
		if ( $has_woocommerce && 'product' === $collection_post_type ) {
			$item_source_mode = 'wc-product';
		} else {
			$item_source_mode = 'sgs-cpt';
		}

		// Forward collection-level card-behaviour attrs to each card.
		// Defaults match product-card defaults so omitting them from the collection block
		// is backwards-compatible (R-22-9 — no per-item logic).
		$card_attrs = array(
			'sourceMode'   => $item_source_mode,
			'productId'    => $collection_post_id,
			// showPickers: false on browsing grids — suppresses axis + pill pickers.
			'showPickers'  => isset( $attributes['showPickers'] ) ? (bool) $attributes['showPickers'] : true,
			// ctaBehaviour: learn-more (link to PDP) is the browsing-grid default.
			'ctaBehaviour' => isset( $attributes['ctaBehaviour'] ) ? sanitize_key( $attributes['ctaBehaviour'] ) : 'learn-more',
			// showLadder: false on browsing grids — price + per-unit note only, no ladder.
			'showLadder'   => isset( $attributes['showLadder'] ) ? (bool) $attributes['showLadder'] : false,
		);

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
		$card_html = render_block(
			array(
				'blockName' => 'sgs/product-card',
				'attrs'     => $card_attrs,
			)
		);
		?>
		<li class="sgs-content-collection__item">
			<?php echo $card_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already escaped by render_block(). ?>
		</li>
	<?php endforeach; ?>
</ul>
<?php

$inner_html = ob_get_clean();

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render( $attributes, $block, $inner_html, 'layout', $cc_wrapper_opts );

// Reset post data after the manual WP_Query (defensive — render_block() sets up
// its own post context; this guard ensures the outer template is unaffected).
wp_reset_postdata();
