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

/* ── 1. Resolve attributes ─────────────────────────────────────────────────── */

/*
 * B2 (QC): whitelist $content_type before it reaches WP_Query['post_type'].
 * sanitize_key alone is insufficient — an attacker-controlled post_type could
 * expose private CPTs. The filter hook lets themes/plugins extend the list.
 */
$content_type_raw = sanitize_key( $attributes['contentType'] ?? 'sgs_product' );
$allowed_types    = apply_filters( 'sgs_content_collection_post_types', array( 'sgs_product', 'product' ) );
$content_type     = in_array( $content_type_raw, $allowed_types, true ) ? $content_type_raw : 'sgs_product';
$selection_rule   = sanitize_key( $attributes['selectionRule'] ?? 'newest' );
$count            = absint( $attributes['count'] ?? 12 );
$count            = min( max( 1, $count ), 24 ); // Server-side cap: 1–24.
$columns          = absint( $attributes['columns'] ?? 3 );
$columns          = min( max( 1, $columns ), 6 ); // 1–6 columns.
$empty_message    = sanitize_text_field( $attributes['emptyMessage'] ?? __( 'No items to show yet. Check back soon.', 'sgs-blocks' ) );
$handpicked_ids   = array_map( 'absint', (array) ( $attributes['handpickedIds'] ?? array() ) );
$category_term    = absint( $attributes['categoryTerm'] ?? 0 );

/* ── 2. Build WP_Query args from selection rule (R-22-1 / FR-24-5) ─────────── */

$query_args = array(
	'post_type'              => $content_type,
	'post_status'            => 'publish',
	'posts_per_page'         => $count,
	'no_found_rows'          => true,   // Perf: skip FOUND_ROWS() — no pagination.
	'ignore_sticky_posts'    => true,
	'update_post_term_cache' => false,
	'update_post_meta_cache' => true, // Meta needed for featured/price/views.
);

switch ( $selection_rule ) {
	case 'featured':
		// Filter to items where the sgs_featured boolean meta is truthy.
		// Stored as '1' (true) or '' / '0' (false) by WP's sanitise_callback.
		$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- intentional; meta-filtered preset is the entire purpose of this preset.
			array(
				'key'     => 'sgs_featured',
				'value'   => '1',
				'compare' => '=',
			),
		);
		$query_args['orderby']    = 'date';
		$query_args['order']      = 'DESC';
		break;

	case 'most-expensive':
		$query_args['meta_key'] = 'sgs_price'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- intentional; price sort is the entire purpose of this preset.
		$query_args['orderby']  = 'meta_value_num';
		$query_args['order']    = 'DESC';
		break;

	case 'cheapest':
		$query_args['meta_key'] = 'sgs_price'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- intentional; price sort is the entire purpose of this preset.
		$query_args['orderby']  = 'meta_value_num';
		$query_args['order']    = 'ASC';
		break;

	case 'most-popular':
		// Sort by view counter; fall back to date if no views meta exists.
		$query_args['meta_key']   = 'sgs_views'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- intentional; view-count sort is the entire purpose of this preset.
		$query_args['orderby']    = array(
			'meta_value_num' => 'DESC',
			'date'           => 'DESC',
		);
		$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- intentional fallback.
			array(
				'key'     => 'sgs_views',
				'compare' => 'EXISTS',
			),
		);
		break;

	case 'handpicked':
		// Respect the exact order the operator chose (post__in ordering).
		if ( ! empty( $handpicked_ids ) ) {
			$query_args['post__in']       = $handpicked_ids;
			$query_args['orderby']        = 'post__in';
			$query_args['posts_per_page'] = count( $handpicked_ids );
		} else {
			// No IDs chosen yet — show nothing (triggers empty state).
			$query_args['post__in']       = array( 0 );
			$query_args['posts_per_page'] = 0;
		}
		break;

	case 'category':
		if ( $category_term > 0 ) {
			// Taxonomy associated with this content type via convention:
			// sgs_product → sgs_product_cat. Generalises to future types via
			// the {post_type}_cat naming pattern (R-22-9).
			$tax_slug                = $content_type . '_cat';
			$query_args['tax_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- intentional; taxonomy filter is the purpose of this preset.
				array(
					'taxonomy' => $tax_slug,
					'field'    => 'term_id',
					'terms'    => $category_term,
				),
			);
		}
		$query_args['orderby'] = 'date';
		$query_args['order']   = 'DESC';
		break;

	case 'newest':
	default:
		$query_args['orderby'] = 'date';
		$query_args['order']   = 'DESC';
		break;
}

/* ── 3. Run the query ──────────────────────────────────────────────────────── */

$query        = new \WP_Query( $query_args );
$result_posts = $query->posts;

/*
 * B1 (QC): prime the meta cache for all result posts in one DB round-trip.
 * Without this, each card's get_product_data() call triggers individual
 * get_post_meta() queries — an N+1 pattern (one extra query per card).
 * update_meta_cache() batch-loads all meta for these post IDs so subsequent
 * get_post_meta() calls are served from the in-memory object cache.
 */
if ( ! empty( $result_posts ) ) {
	update_meta_cache( 'post', wp_list_pluck( $result_posts, 'ID' ) );
}

/* ── 4. Wrapper: own classes and CSS vars for SGS_Container_Wrapper ─────────── */

$cc_extra_classes = array(
	'sgs-content-collection',
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
