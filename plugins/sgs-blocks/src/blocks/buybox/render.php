<?php
/**
 * Server-side render for sgs/buybox.
 *
 * Wires the standalone sgs/option-picker pills to the shipped product-card
 * Interactivity store (sgs/product-card), providing a full PDP buybox:
 * per-axis pickers, live price row, stock status, add-to-cart proxy form,
 * dismissible error region, and availability live region.
 *
 * Requires:  WooCommerce active + a variable product in context.
 * Fallback:  do_blocks() of core woocommerce/product-price +
 *            woocommerce/add-to-cart-with-options for simple products,
 *            manifest-null, cap-exceeded, and WC-absent cases.
 *
 * Engine:    mounts data-wp-interactive="sgs/product-card" — INTENTIONAL.
 *            That store IS the shipped configurator (proxy wire, 409 re-sync,
 *            availability). No duplication — see STEP5-BRIDGE-DESIGN.md.
 *
 * Module loading: we resolve the product-card view-script-module IDs from the
 * block type registry and enqueue them so the engine loads on PDPs that have no
 * sgs/product-card block present.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 * @since   1.17.0 (FR-30-7)
 */

defined( 'ABSPATH' ) || exit;

// NOTE: WC class checks are ALL lazy (inside class_exists gates) — never at
// file scope. File-scope WC class references fatal the whole site when this
// file is required before WooCommerce loads (memory: file-scope-wc-class-extends-must-load-lazily).

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-product-manifest.php';
require_once dirname( __DIR__, 3 ) . '/includes/configurator-seed.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-configurator-pricing.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-value-ladder.php';

/* ── 1. Resolve product ──────────────────────────────────────────────────── */

// Core-blocks fallback markup (FR-30-2): simple products, WC absent, manifest
// null, and cap-exceeded all fall back to the standard WC price + add-to-cart.
$buybox_core_fallback = '<!-- wp:woocommerce/product-price {"isDescendentOfSingleProductBlock":true} /--><!-- wp:woocommerce/add-to-cart-with-options {"isDescendentOfSingleProductBlock":true} /-->';

// usesContext['postId'] resolves to the current queried post on a PDP template.
$buybox_post_id = isset( $block->context['postId'] ) ? absint( $block->context['postId'] ) : 0;
if ( 0 === $buybox_post_id ) {
	$buybox_post_id = absint( get_queried_object_id() );
}

/* ── 2. Guard: WooCommerce absent or no product ──────────────────────────── */

if ( ! class_exists( 'WooCommerce' ) || $buybox_post_id <= 0 ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks output is pre-sanitised.
	echo do_blocks( $buybox_core_fallback );
	return;
}

$product = wc_get_product( $buybox_post_id );

if ( ! $product instanceof \WC_Product ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo do_blocks( $buybox_core_fallback );
	return;
}

/* ── 3. Simple product / non-variable: core fallback ────────────────────── */

if ( ! $product->is_type( 'variable' ) ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo do_blocks( $buybox_core_fallback );
	return;
}

/* ── 4. Build manifest ───────────────────────────────────────────────────── */

$manifest = \SGS\Blocks\Product_Manifest::build( $buybox_post_id );

if ( null === $manifest ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo do_blocks( $buybox_core_fallback );
	return;
}

/* ── 5. Build seeded context (mirrors product-card L444-504 exactly) ─────── */

$decimals = $manifest['decimals'];
$def      = $manifest['combos'][ $manifest['defaultKey'] ];

// Tax-display mode (same logic as product-card — 'auto' default on this block).
$tax_mode     = 'auto';
$price_suffix = wp_strip_all_tags( (string) get_option( 'woocommerce_price_display_suffix', '' ) );
$price_suffix = sanitize_text_field( trim( str_replace( array( '{price_including_tax}', '{price_excluding_tax}' ), '', $price_suffix ) ) );

$price_display   = sgs_configurator_mode_price( $def, $tax_mode, $decimals, $price_suffix );
$show_sale       = ( null !== $def['saleMinor'] );
$regular_display = $show_sale
	? sgs_configurator_mode_regular( $def, $tax_mode, $decimals )
	: '';
$pct_display     = '';
if ( $def['pctOff'] > 0 ) {
	/* translators: %d is the discount percentage, e.g. "30% off". */
	$pct_display = sprintf( __( '%d%% off', 'sgs-blocks' ), $def['pctOff'] );
}

$stock_text = $def['inStock'] ? '' : __( 'Out of stock', 'sgs-blocks' );

// Per-unit and discount (mirrors product-card B3 pattern).
// FR-30-8: operator-configurable denomination — sanitised attr wins when non-empty.
$per_unit_denomination_raw = sanitize_text_field( $attributes['perUnitDenomination'] ?? '' );
if ( '' !== $per_unit_denomination_raw ) {
	$per_unit_template = $per_unit_denomination_raw;
} else {
	/* translators: %s is the unit label, e.g. "per bar" or "per 100g". */
	$per_unit_template = __( 'per %s', 'sgs-blocks' );
}
$per_unit_display = sgs_configurator_per_unit_display( $def, $tax_mode, $decimals, $per_unit_template );
$discount_label   = ( null !== $def['saleMinor'] )
	? __( 'Sale', 'sgs-blocks' )
	: ( isset( $def['discountLabel'] ) ? (string) $def['discountLabel'] : '' );

// FR-30-8: Comparative value-ladder (mirrors product-card render.php §Step 3).
// Built here — after $manifest is confirmed non-null and $tax_mode / $decimals
// are resolved — and stored in $buybox_ladder / $buybox_ladder_hidden for use
// inside the ob_start() render region below.

// 3a. Reference price with strict attestation guard (legal: FR-28-16).
$buybox_base_pence = (int) absint( get_post_meta( $buybox_post_id, '_sgs_base_price_pence', true ) );
$buybox_attested   = ( '1' === (string) get_post_meta( $buybox_post_id, '_sgs_base_price_attested', true ) );
$buybox_base_pence = ( $buybox_base_pence > 0 && $buybox_attested ) ? $buybox_base_pence : null;

// 3b. Framing mode from block attribute.
$buybox_framing_mode = sanitize_key( $attributes['framingMode'] ?? 'loss-aversion' );
if ( ! in_array( $buybox_framing_mode, array( 'savings', 'loss-aversion', 'neutral' ), true ) ) {
	$buybox_framing_mode = 'loss-aversion';
}

// 3c. Decoy flag from block attribute (no per-product meta override needed for buybox).
$buybox_decoy_enabled = (bool) ( $attributes['decoyEnabled'] ?? false );

// 3d. Enrich a copy of the FULL manifest combos with termLabel (mirrors product-card §3d).
$buybox_size_term_map = array();
$buybox_size_axis_key = '';

if ( ! empty( $manifest['axes'] ) ) {
	$buybox_operator_axis_key = sanitize_key( (string) get_post_meta( $buybox_post_id, '_sgs_pack_size_axis', true ) );
	$buybox_by_operator       = null;
	$buybox_by_label          = null;
	$buybox_by_first          = null;

	foreach ( $manifest['axes'] as $buybox_axis_def ) {
		$buybox_axis_tax = $buybox_axis_def['taxonomy'] ?? '';
		if ( '' === $buybox_axis_tax ) {
			continue;
		}
		if ( '' !== $buybox_operator_axis_key && $buybox_axis_tax === $buybox_operator_axis_key ) {
			$buybox_by_operator = $buybox_axis_def;
		}
		if ( null === $buybox_by_label && preg_match( '/size/i', (string) ( $buybox_axis_def['label'] ?? '' ) ) ) {
			$buybox_by_label = $buybox_axis_def;
		}
		if ( null === $buybox_by_first ) {
			$buybox_by_first = $buybox_axis_def;
		}
	}

	$buybox_size_axis = $buybox_by_operator ?? $buybox_by_label ?? $buybox_by_first;
	if ( null !== $buybox_size_axis ) {
		$buybox_size_axis_key = (string) ( $buybox_size_axis['taxonomy'] ?? '' );
		foreach ( (array) ( $buybox_size_axis['terms'] ?? array() ) as $buybox_term_row ) {
			$buybox_t_slug  = (string) ( $buybox_term_row['slug'] ?? '' );
			$buybox_t_label = (string) ( $buybox_term_row['label'] ?? '' );
			if ( '' !== $buybox_t_slug ) {
				$buybox_size_term_map[ $buybox_t_slug ] = $buybox_t_label;
			}
		}
	}
}

$buybox_ladder_combos = $manifest['combos']; // Full combos, not $seed_combos.
if ( '' !== $buybox_size_axis_key && ! empty( $buybox_size_term_map ) ) {
	foreach ( $buybox_ladder_combos as $buybox_c_key => &$buybox_c_val ) {
		foreach ( explode( '|', $buybox_c_key ) as $buybox_part ) {
			$buybox_colon = strpos( $buybox_part, ':' );
			if ( false === $buybox_colon ) {
				continue;
			}
			$buybox_part_tax  = substr( $buybox_part, 0, $buybox_colon );
			$buybox_part_slug = substr( $buybox_part, $buybox_colon + 1 );
			if ( $buybox_part_tax === $buybox_size_axis_key && isset( $buybox_size_term_map[ $buybox_part_slug ] ) ) {
				$buybox_c_val['termLabel'] = $buybox_size_term_map[ $buybox_part_slug ];
				break;
			}
		}
	}
	unset( $buybox_c_val );
}

// 3e. Build ladder rows.
$buybox_ladder = function_exists( 'sgs_value_ladder' )
	? sgs_value_ladder( $buybox_ladder_combos, $buybox_base_pence, $buybox_framing_mode, $buybox_decoy_enabled, $tax_mode, $decimals )
	: array();

$buybox_ladder_hidden = ( count( $buybox_ladder ) < 2 );

// Operator-configurable labels (from block attributes).
$sold_out_label    = sanitize_text_field( $attributes['soldOutLabel'] ?? __( '(sold out)', 'sgs-blocks' ) );
$unavailable_label = sanitize_text_field( $attributes['unavailableLabel'] ?? __( '(unavailable)', 'sgs-blocks' ) );

// Lean seed — 24 KB cap guard (mirrors product-card M-C9).
$seed_combos = sgs_lean_seed_combos( $manifest['combos'] );

// Context array — key shape is IDENTICAL to product-card (L445-504).
// Gallery keys seeded neutral: gallery=[], thumbsHidden=true (no gallery on buybox).
// ctaBehaviour fixed to 'add-to-cart' (buybox always adds, no learn-more mode).
$context = array(
	'productId'           => (string) $buybox_post_id,
	'addToCartId'         => absint( $product->get_id() ),
	'decimals'            => $decimals,
	'currencySymbol'      => $manifest['currencySymbol'],
	'combos'              => $seed_combos,
	'axes'                => $manifest['axes'],
	'selectedAxes'        => $manifest['defaultAxes'],
	'selectedKey'         => $manifest['defaultKey'],
	'selectedVariationId' => (int) $def['variationId'],
	'priceDisplay'        => $price_display,
	'regularDisplay'      => $regular_display,
	'pctDisplay'          => $pct_display,
	'taxDisplayMode'      => $tax_mode,
	'priceSuffix'         => ( 'inc-suffix' === $tax_mode ) ? $price_suffix : '',
	'vatLabel'            => __( 'VAT', 'sgs-blocks' ),
	'showSale'            => $show_sale,
	'hideSale'            => ! $show_sale,
	'stockText'           => $stock_text,
	'inStock'             => (bool) $def['inStock'],
	'imageSrc'            => '' !== $def['imageUrl'] ? $def['imageUrl'] : '',
	'imageAlt'            => '',
	'cartStatus'          => '',
	'pending'             => false,
	'restNonce'           => wp_create_nonce( 'wp_rest' ),
	'availabilityNote'    => '',
	'perUnitDisplay'      => $per_unit_display,
	'perUnitHidden'       => ( '' === $per_unit_display ),
	'perUnitTemplate'     => $per_unit_template,
	'discountLabel'       => $discount_label,
	'discountHidden'      => ( '' === $discount_label ),
	'saleLabel'           => __( 'Sale', 'sgs-blocks' ),
	// Gallery-neutral values (no gallery on buybox — engine null-guards on cardRef).
	'gallery'             => array(),
	'thumbsHidden'        => true,
	'selectedThumb'       => 0,
	// buybox always add-to-cart (no buy-now / learn-more modes at P1).
	'ctaBehaviour'        => 'add-to-cart',
	'checkoutUrl'         => '',
	// Operator-configurable unavailability labels (FR-30-7).
	// Seeded into context so applyAvailability() reads them with current literals as defaults.
	'soldOutLabel'        => $sold_out_label,
	'unavailableLabel'    => $unavailable_label,
);

/* ── 6. Hard cap: 24 KB max serialised context ───────────────────────────── */

if ( strlen( wp_json_encode( $context ) ) > 24576 ) {
	// Cap exceeded — fall back to core WC blocks.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo do_blocks( $buybox_core_fallback );
	return;
}

/*
 * ── 7. Enqueue the product-card view-script module ──────────────────────────
 * The buybox mounts sgs/product-card's store — we must enqueue it even when
 * no sgs/product-card block is present on this page. Resolve the registered
 * module ID from the block type registry (authoritative, no guessing).
 */
// NOTE: if sgs/product-card is ever deregistered, $card_type is null and the
// module is never enqueued — the buybox renders its SSR HTML with no
// interactivity (the no-JS form fallback still navigates). Silent progressive
// degradation by design; check this first if the configurator "stops working".
$card_type = WP_Block_Type_Registry::get_instance()->get_registered( 'sgs/product-card' );
if ( $card_type ) {
	$module_ids = isset( $card_type->view_script_module_ids ) ? (array) $card_type->view_script_module_ids : array();
	foreach ( $module_ids as $module_id ) {
		if ( function_exists( 'wp_enqueue_script_module' ) ) {
			wp_enqueue_script_module( $module_id );
		}
	}
}

/* ── 8. Render ───────────────────────────────────────────────────────────── */

$product_permalink = esc_url( get_permalink( $buybox_post_id ) );

// CTA label.
$add_to_cart_label_raw = $attributes['addToCartLabel'] ?? '';
$add_to_cart_label     = '' !== sanitize_text_field( $add_to_cart_label_raw )
	? sanitize_text_field( $add_to_cart_label_raw )
	: __( 'Add to Cart', 'sgs-blocks' );

// Wrapper attributes — includes Interactivity API bindings.
$wrapper_attrs = get_block_wrapper_attributes(
	array( 'class' => 'sgs-buybox' )
);

ob_start();
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	data-wp-interactive="sgs/product-card"
	data-wp-init="callbacks.initPillBridge"
	<?php echo wp_interactivity_data_wp_context( $context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
>

	<?php // ── 8a. Price row FIRST (CRO: price anchor visible before the pickers — uimax e-commerce hierarchy rule). ?>
	<div class="buybox__price-row" aria-live="polite">
		<span
			class="buybox__price buybox__price--current"
			data-wp-text="context.priceDisplay"
		><?php echo esc_html( $price_display ); ?></span>
		<s
			class="buybox__price--regular"
			data-wp-bind--hidden="context.hideSale"
			data-wp-text="context.regularDisplay"
		><?php echo esc_html( $regular_display ); ?></s>
		<span
			class="buybox__price--pct-off"
			data-wp-bind--hidden="context.hideSale"
			data-wp-text="context.pctDisplay"
		><?php echo esc_html( $pct_display ); ?></span>
	</div>
	<p
		class="buybox__price-note buybox__price-note--per-unit"
		data-wp-bind--hidden="context.perUnitHidden"
		data-wp-text="context.perUnitDisplay"
	><?php echo esc_html( $per_unit_display ); ?></p>

	<?php // ── 8a-ii. Comparative value-ladder (FR-30-8, SSR-only — no data-wp-* on ladder nodes). ?>
	<?php if ( false !== ( $attributes['showLadder'] ?? true ) && ! $buybox_ladder_hidden ) : ?>
	<ul
		class="buybox__value-ladder"
		aria-label="<?php esc_attr_e( 'Price per unit by pack size', 'sgs-blocks' ); ?>"
	>
		<?php foreach ( $buybox_ladder as $buybox_ladder_row ) : ?>
			<?php
			// PD-12: aria-current on the row matching the default-selected combo's unitDivisor.
			// (int)round() on both sides mirrors the data-pack write + view.js comparison.
			$buybox_row_pack     = (int) round( $buybox_ladder_row['pack'] );
			$buybox_default_pack = isset( $def['unitDivisor'] ) ? (int) round( (float) $def['unitDivisor'] ) : 0;
			$buybox_is_default   = ( $buybox_row_pack === $buybox_default_pack );
			?>
		<li
			class="value-ladder__row"
			data-pack="<?php echo esc_attr( (string) $buybox_row_pack ); ?>"
			<?php echo $buybox_is_default ? 'aria-current="true"' : ''; ?>
		>
			<span class="value-ladder__pack"><?php echo esc_html( $buybox_ladder_row['row_label'] ); ?></span>
			<span class="value-ladder__per-unit"><?php echo esc_html( $buybox_ladder_row['per_unit_display'] ); ?></span>
			<?php if ( '' !== $buybox_ladder_row['saving_display'] && ! $buybox_ladder_row['suppressed'] ) : ?>
			<span class="value-ladder__saving"><?php echo esc_html( $buybox_ladder_row['saving_display'] ); ?></span>
			<?php endif; ?>
			<?php if ( $buybox_ladder_row['is_target'] ) : ?>
				<?php
				// PD-10: no data-wp-* on this span — directives wipe SSR text on hydration.
				// Legal: 'Best value' only on the non-decoy target (genuinely cheapest per-unit);
				// 'Most popular' on the decoy target (not cheapest, so not a superlative claim).
				$buybox_badge_text = $buybox_decoy_enabled
					? __( 'Most popular', 'sgs-blocks' )
					: __( 'Best value', 'sgs-blocks' );
				?>
			<span class="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge"><?php echo esc_html( $buybox_badge_text ); ?></span>
			<?php endif; ?>
		</li>
		<?php endforeach; ?>
	</ul>
	<?php endif; ?>

	<?php
	// ── 8b. Per-axis option-picker blocks (single-variant suppression: skip axes with <2 terms) ──
	foreach ( $manifest['axes'] as $axis ) {
		$terms = $axis['terms'] ?? array();

		// Single-variant suppression (QA Gate B from design doc): skip axes where
		// there is only one selectable term — no meaningful choice to present.
		if ( count( $terms ) < 2 ) {
			continue;
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
		echo render_block(
			array(
				'blockName' => 'sgs/option-picker',
				'attrs'     => array(
					'label'           => $axis['label'],
					'showLabel'       => true,
					'optionItems'     => array_map(
						static function ( $t ) {
							return array(
								'key'   => $t['slug'],
								'label' => $t['label'],
							);
						},
						$terms
					),
					'defaultSelected' => $manifest['defaultAxes'][ $axis['taxonomy'] ] ?? '',
					'typeKey'         => $axis['taxonomy'],
				),
			)
		);
	}
	?>

	<?php // ── 8c. Stock status — hidden when in stock. ?>
	<p
		class="buybox__stock"
		role="status"
		aria-live="polite"
		data-wp-bind--hidden="context.inStock"
		data-wp-text="context.stockText"
	><?php echo esc_html( $stock_text ); ?></p>

	<?php
	// ── 8c-ii. Back-in-stock notify-me form (FR-30-10, Step 10).
	// Gated on notifyEnabled attribute (default true). Shown ONLY when the
	// selected variation is out of stock via data-wp-bind--hidden="context.inStock"
	// on the outer wrapper (pure read of existing context — no new store state).
	$notify_enabled = (bool) ( $attributes['notifyEnabled'] ?? true );
	if ( $notify_enabled ) {
		$notify_me_label = sanitize_text_field( $attributes['notifyMeLabel'] ?? __( 'Notify me', 'sgs-blocks' ) );
		if ( '' === $notify_me_label ) {
			$notify_me_label = __( 'Notify me', 'sgs-blocks' );
		}
		// Enqueue Turnstile script when configured.
		if ( \SGS\Blocks\Turnstile::is_configured() ) {
			\SGS\Blocks\Turnstile::enqueue_script();
		}
		require __DIR__ . '/notify-form.php';
	}
	?>

	<?php // ── 8d. Add-to-cart form (mirrors product-card L948-963 proxy form pattern). ?>
	<form
		class="buybox__cart-form"
		method="post"
		action="<?php echo $product_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd above. ?>"
		data-wp-on--submit="actions.addToCart"
	>
		<button
			type="submit"
			class="wp-element-button buybox__add-to-cart"
			data-wp-bind--disabled="context.pending"
			data-wp-bind--aria-busy="context.pending"
		>
			<svg class="buybox__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
			<span class="buybox__cart-label"><?php echo esc_html( $add_to_cart_label ); ?></span>
		</button>
	</form>

	<?php // ── 8e. Cart-status error region — ARIA-live with dismiss button. ?>
	<?php
	// Mirror the product-card cartStatus pattern (L991-996).
	// The dismiss button is inside the region; it is visually hidden when
	// cartStatus is empty via the CSS :empty-adjacent rule (see style.css).
	// data-wp-text writes the error message; an empty string empties the span,
	// collapsing the region visually (CSS) and announcing nothing to screen readers.
	?>
	<div
		class="buybox__cart-status-region"
		role="alert"
		aria-live="assertive"
		aria-atomic="true"
		data-wp-class--buybox__cart-status-region--visible="context.cartStatus"
	>
		<p
			class="buybox__cart-status"
			data-wp-text="context.cartStatus"
		></p>
		<button
			type="button"
			class="buybox__dismiss-status"
			aria-label="<?php esc_attr_e( 'Dismiss message', 'sgs-blocks' ); ?>"
			data-wp-on--click="actions.dismissCartStatus"
		>
			<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
		</button>
	</div>

	<?php // ── 8f. Availability live region — polite, visually hidden (mirrors card L900-906). ?>
	<p
		class="buybox__availability sgs-sr-only"
		role="status"
		aria-live="polite"
		data-wp-text="context.availabilityNote"
	></p>

</div>
<?php
echo ob_get_clean(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- ob_get_clean() returns the buffered HTML built above with esc_* on all dynamic values.
