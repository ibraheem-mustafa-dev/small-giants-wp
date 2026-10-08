<?php
/**
 * Card Grid - wc-product and cpt-collection delegation branch body (renders each result through sgs/product-card).
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $attributes, $block, $source, $uid, $columns, $columns_tablet, $columns_mobile, $gap, $hover_effect, $hover_scale, $hover_shadow, $hover_shadow_colour, $transition_dur, $transition_ease, $empty_message, $card_grid_native_style_tag, $card_grid_preset_classes.
 * Writes: the $collection_*, $wc_*, $empty_html and $pagination_html working locals; it always echoes the finished markup and ends in return, so render.php returns straight after the require.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

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

		$empty_message = (string) ( $attributes['emptyMessage'] ?? '' );
	} else {
		$product_ids   = \SGS\Blocks\Card_Grid_Products::get_product_ids( $attributes );
		$empty_message = (string) ( $attributes['productEmptyMessage'] ?? '' );
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

	$gap_value_wc   = sgs_container_gap_value( $gap );
	$wc_style_parts = array(
		'--sgs-card-grid-columns: ' . absint( $columns ),
		'--sgs-card-grid-columns-mobile: ' . absint( $columns_mobile ),
		'--sgs-card-grid-columns-tablet: ' . absint( $columns_tablet ),
		'--sgs-card-grid-gap: ' . $gap_value_wc,
	);
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

	$wc_wrapper_opts = array(
		'tag'           => 'div',
		'extra_classes' => $wc_class_names,
		'extra_styles'  => $wc_style_parts,
	);

	// ── Empty state (FR-24-6 reuse) ──────────────────────────────────────────
	if ( empty( $product_ids ) ) {
		// The client's message on the live site; with none set, nothing there and a notice on the editor canvas.
		$empty_message = trim( sanitize_text_field( $empty_message ) );
		if ( '' === $empty_message && ! \SGS\Blocks\sgs_is_frontend_render() ) {
			$empty_message = __( 'Nothing to show yet. Visitors see nothing here unless you set an empty-state message.', 'sgs-blocks' );
		}
		ob_start();
		if ( '' !== $empty_message ) {
			?>
			<div class="sgs-card-grid__empty">
				<p class="sgs-card-grid__empty-message">
					<?php echo esc_html( $empty_message ); ?>
				</p>
			</div>
			<?php
		}
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
