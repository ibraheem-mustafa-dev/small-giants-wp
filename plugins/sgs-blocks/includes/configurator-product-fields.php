<?php
/**
 * Product-level value-ladder authoring fields on the WooCommerce product editor.
 *
 * Wave-2 #1 authoring UI for the Spec 28 P1 comparative value-ladder. Adds a
 * dedicated "SGS Value Ladder" panel inside the WooCommerce product data meta-box
 * (General tab section) exposing:
 *
 *   - `_sgs_base_price_pounds`    : single-unit reference price entered as pounds
 *                                   (e.g. "0.83"), stored as pence via save_product_fields().
 *   - `_sgs_base_price_attested`  : checkbox — "I confirm this single-unit price is
 *                                   genuinely available to buy" (DMCC / CPR attestation).
 *   - `_sgs_decoy_enabled`        : per-product override for the block's decoyEnabled attr.
 *   - `_sgs_pack_size_axis`       : which attribute axis represents pack size (Wave-2 #9).
 *
 * Design follows the R3 pattern established by configurator-variation-fields.php:
 *   - Uses WC's own `woocommerce_wp_text_input()` / `woocommerce_wp_checkbox()` helpers
 *     (native look, no new CSS/JS needed).
 *   - Renders inside `woocommerce_product_options_general_product_data` which fires
 *     inside the General tab — the standard location for custom product-level fields.
 *   - Saves via `woocommerce_process_product_meta` → Configurator_Meta::save_product_fields()
 *     so the validation (legal reference-price check #4, audit trail #19) lives in
 *     exactly one place.
 *
 * Security:
 *   - WooCommerce verifies its own product-save nonce before `woocommerce_process_product_meta`
 *     fires, so no separate nonce is added here (mirrors WC core's own documentation).
 *   - All output uses esc_html() / esc_attr().
 *   - Per-object `edit_post` capability check runs inside save_product_fields().
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the product-field hooks.
 *
 * Silent no-op when WooCommerce is inactive.
 *
 * @return void
 */
function sgs_configurator_product_fields_register(): void {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return;
	}

	add_action( 'woocommerce_product_options_general_product_data', __NAMESPACE__ . '\\sgs_render_product_value_ladder_fields' );
	add_action( 'woocommerce_process_product_meta', __NAMESPACE__ . '\\sgs_save_product_value_ladder_fields' );
}
add_action( 'init', __NAMESPACE__ . '\\sgs_configurator_product_fields_register', 20 );

/**
 * Render the value-ladder fields inside the General product-data panel.
 *
 * @return void
 */
function sgs_render_product_value_ladder_fields(): void {
	if ( ! function_exists( 'woocommerce_wp_text_input' ) || ! function_exists( 'woocommerce_wp_checkbox' ) ) {
		return;
	}

	global $post;
	$product_id = isset( $post->ID ) ? (int) $post->ID : 0;
	if ( $product_id <= 0 ) {
		return;
	}

	// Read stored pence and convert back to pounds for the UI.
	$base_pence    = (int) absint( get_post_meta( $product_id, '_sgs_base_price_pence', true ) );
	$pounds_value  = $base_pence > 0 ? number_format( $base_pence / 100, 2, '.', '' ) : '';
	$attested      = (bool) get_post_meta( $product_id, '_sgs_base_price_attested', true );
	$decoy_enabled = (bool) get_post_meta( $product_id, '_sgs_decoy_enabled', true );
	$pack_axis     = (string) get_post_meta( $product_id, '_sgs_pack_size_axis', true );

	// Build a list of the product's attribute axes so the operator can pick the
	// pack-size axis from a <select> rather than typing a taxonomy slug manually.
	$product = wc_get_product( $product_id );
	$axes    = array();
	if ( $product ) {
		foreach ( $product->get_attributes() as $attr ) {
			if ( ! $attr->get_variation() ) {
				continue; // Only variation-driving attributes are relevant.
			}
			$taxonomy = $attr->get_name(); // e.g. 'pa_size'.
			$label    = wc_attribute_label( $taxonomy );
			if ( '' !== $taxonomy ) {
				$axes[ $taxonomy ] = $label;
			}
		}
	}

	echo '<div class="options_group sgs-value-ladder-fields" style="border-top:1px solid #e0e0e0;margin-top:6px;padding-top:6px;">';
	echo '<h4 style="padding-left:12px;margin-bottom:4px;">' . esc_html__( 'SGS Value Ladder', 'sgs-blocks' ) . '</h4>';
	echo '<p class="description" style="padding-left:12px;margin-bottom:8px;">';
	echo esc_html__( 'Configure the comparative price-per-unit ladder shown on the product card.', 'sgs-blocks' );
	echo '</p>';

	// ── Single-unit reference price ───────────────────────────────────────────
	woocommerce_wp_text_input(
		array(
			'id'                => '_sgs_base_price_pounds',
			'name'              => '_sgs_base_price_pounds',
			'value'             => $pounds_value,
			'label'             => __( 'Single-unit price (£)', 'sgs-blocks' ),
			'placeholder'       => '0.83',
			'desc_tip'          => true,
			'description'       => __( 'The price of ONE single unit, as it is genuinely available to buy on your shop (e.g. 0.83 for 83p). Used to compute "save X% vs buying singly". Leave blank if a single unit is not sold separately.', 'sgs-blocks' ),
			'type'              => 'text',
			'custom_attributes' => array(
				'pattern' => '^\d+(\.\d{1,2})?$',
			),
			'wrapper_class'     => 'form-row form-row-first',
		)
	);

	// ── Attestation checkbox ──────────────────────────────────────────────────
	woocommerce_wp_checkbox(
		array(
			'id'          => '_sgs_base_price_attested',
			'name'        => '_sgs_base_price_attested',
			'value'       => $attested ? 'yes' : 'no',
			'cbvalue'     => 'yes',
			'label'       => __( 'I confirm this single-unit price is genuinely available to buy', 'sgs-blocks' ),
			'description' => __( 'Required by UK consumer law (DMCC Act 2024 / CPRs 2008) before a "vs buying singly" savings claim may be shown to consumers.', 'sgs-blocks' ),
			'desc_tip'    => false,
		)
	);

	// ── Decoy / promote second-largest pack ──────────────────────────────────
	woocommerce_wp_checkbox(
		array(
			'id'          => '_sgs_decoy_enabled',
			'name'        => '_sgs_decoy_enabled',
			'value'       => $decoy_enabled ? 'yes' : 'no',
			'cbvalue'     => 'yes',
			'label'       => __( 'Promote the second-largest pack', 'sgs-blocks' ),
			'description' => __( 'Places the "Most popular" badge on the second-largest pack (decoy pricing). Overrides the block-level setting for this product.', 'sgs-blocks' ),
			'desc_tip'    => false,
		)
	);

	// ── Pack-size axis picker (#9) ────────────────────────────────────────────
	if ( ! empty( $axes ) ) {
		echo '<p class="form-field _sgs_pack_size_axis_field form-row form-row-full">';
		echo '<label for="_sgs_pack_size_axis">' . esc_html__( 'Pack-size attribute axis', 'sgs-blocks' ) . '</label>';
		echo '<select name="_sgs_pack_size_axis" id="_sgs_pack_size_axis" style="width:100%;">';
		echo '<option value="">' . esc_html__( '— Auto-detect (recommended) —', 'sgs-blocks' ) . '</option>';
		foreach ( $axes as $tax => $label ) {
			printf(
				'<option value="%s"%s>%s</option>',
				esc_attr( $tax ),
				selected( $pack_axis, $tax, false ),
				esc_html( $label . ' (' . $tax . ')' )
			);
		}
		echo '</select>';
		echo '<span class="description">' . esc_html__( 'Which attribute axis contains the pack sizes? Overrides the automatic /size/ heuristic. "Auto-detect" works for most products.', 'sgs-blocks' ) . '</span>';
		echo '</p>';
	} else {
		// No variation attributes yet — show an informational note.
		echo '<p class="form-field form-row form-row-full">';
		echo '<span class="description">' . esc_html__( 'Pack-size axis: add variation attributes to this product first, then return here to pick the axis.', 'sgs-blocks' ) . '</span>';
		echo '</p>';
	}

	echo '</div>';
}

/**
 * Save handler bridge — delegates to Configurator_Meta::save_product_fields().
 *
 * Translates the WC checkbox convention ('yes'/'no' string) to a plain PHP bool
 * by temporarily normalising the POST values before the class method reads $_POST.
 *
 * @param int $product_id The WooCommerce product post ID.
 * @return void
 */
function sgs_save_product_value_ladder_fields( int $product_id ): void {
	// Normalise WC checkbox convention: WC renders <input value="yes"> so the
	// posted value is 'yes' when checked; absent when unchecked. The class save
	// handler uses isset() on _sgs_base_price_attested / _sgs_decoy_enabled which
	// works correctly — present (any truthy value) = true, absent = false.
	Configurator_Meta::save_product_fields( $product_id );
}
