<?php
/**
 * Per-variation configurator fields on the WooCommerce variation editor panel
 * (FR-27-B3 authoring UI — un-gated authoring, "clients never touch code").
 *
 * Adds three friendly fields to each variation's panel on the product's
 * Variations tab, then saves them to the registered variation postmeta keys:
 *   - `_sgs_unit_divisor`  → drives the "£x per <label>" per-unit price line
 *   - `_sgs_unit_label`    → the unit noun ("bar", "100g")
 *   - `_sgs_discount_label`→ a cosmetic badge ("Best value"); digits + % stripped
 *
 * Design decisions:
 *   - Uses WooCommerce's own `woocommerce_wp_text_input()` field helper so the
 *     fields look native and inherit WC's grid + tooltip styling. No new CSS/JS.
 *   - Renders inside `woocommerce_product_after_variable_attributes` (fires once
 *     per variation with the loop index + the variation post) — the canonical
 *     hook for custom per-variation fields.
 *   - Every field saves through the SAME sanitiser registered in
 *     class-configurator-meta.php, so a value entered here, via REST, or via
 *     WP-CLI is validated identically (SEC-4 digit-strip on the discount label,
 *     SEC divisor bound, etc.).
 *
 * Security:
 *   - Per-object `edit_post` capability check on the specific variation before
 *     any save (IDOR-safe; matches the registered auth_callback).
 *   - WooCommerce verifies its own variation-save nonce before
 *     `woocommerce_save_product_variation` fires, so no separate nonce is added
 *     here (mirrors WC core's own custom-field documentation).
 *   - All input read with wp_unslash() then passed through the registered
 *     sanitiser.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the variation-field hooks.
 *
 * Guarded by WooCommerce presence — a silent no-op when WC is inactive.
 *
 * @return void
 */
function sgs_configurator_variation_fields_register(): void {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return;
	}

	add_action( 'woocommerce_product_after_variable_attributes', __NAMESPACE__ . '\\sgs_render_variation_fields', 10, 3 );
	add_action( 'woocommerce_save_product_variation', __NAMESPACE__ . '\\sgs_save_variation_fields', 10, 2 );
}
add_action( 'init', __NAMESPACE__ . '\\sgs_configurator_variation_fields_register', 20 );

/**
 * Render the per-unit + discount-label fields inside a variation's panel.
 *
 * @param int      $loop           Variation row index (used to namespace field IDs).
 * @param array    $variation_data The variation's data array (unused; we read meta directly).
 * @param \WP_Post $variation      The variation post object.
 * @return void
 */
function sgs_render_variation_fields( int $loop, array $variation_data, \WP_Post $variation ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found
	if ( ! function_exists( 'woocommerce_wp_text_input' ) ) {
		return;
	}

	$variation_id = (int) $variation->ID;
	$divisor      = get_post_meta( $variation_id, '_sgs_unit_divisor', true );
	$unit_label   = (string) get_post_meta( $variation_id, '_sgs_unit_label', true );
	$discount     = (string) get_post_meta( $variation_id, '_sgs_discount_label', true );

	echo '<div class="sgs-configurator-variation-fields" style="border-top:1px solid #e0e0e0;margin-top:6px;padding-top:6px;">';

	woocommerce_wp_text_input(
		array(
			'id'                => '_sgs_unit_divisor_' . $loop,
			'name'              => '_sgs_unit_divisor[' . $loop . ']',
			'value'             => '' === $divisor ? '' : (string) $divisor,
			'label'             => __( 'Per-unit divisor', 'sgs-blocks' ),
			'desc_tip'          => true,
			'description'       => __( 'How many units this variation contains, e.g. 12 for a 12-pack. Shows a "price per unit" line. Leave blank or 0 to hide it.', 'sgs-blocks' ),
			'type'              => 'number',
			'custom_attributes' => array(
				'step' => 'any',
				'min'  => '0',
			),
			'wrapper_class'     => 'form-row form-row-first',
		)
	);

	woocommerce_wp_text_input(
		array(
			'id'            => '_sgs_unit_label_' . $loop,
			'name'          => '_sgs_unit_label[' . $loop . ']',
			'value'         => $unit_label,
			'label'         => __( 'Unit label', 'sgs-blocks' ),
			'placeholder'   => __( 'bar', 'sgs-blocks' ),
			'desc_tip'      => true,
			'description'   => __( 'The unit noun shown after the price, e.g. "bar" → "£1.04 per bar", or "100g".', 'sgs-blocks' ),
			'wrapper_class' => 'form-row form-row-last',
		)
	);

	woocommerce_wp_text_input(
		array(
			'id'            => '_sgs_discount_label_' . $loop,
			'name'          => '_sgs_discount_label[' . $loop . ']',
			'value'         => $discount,
			'label'         => __( 'Badge label (cosmetic)', 'sgs-blocks' ),
			'placeholder'   => __( 'Best value', 'sgs-blocks' ),
			'desc_tip'      => true,
			'description'   => __( 'An optional badge shown near the price, e.g. "Best value". Numbers and % signs are removed automatically (a badge cannot state a discount amount).', 'sgs-blocks' ),
			'wrapper_class' => 'form-row form-row-full',
		)
	);

	echo '</div>';
}

/**
 * Save the per-variation configurator fields.
 *
 * Called on `woocommerce_save_product_variation` (WC has already verified its
 * own save nonce before this fires).
 *
 * @param int $variation_id The variation post ID being saved.
 * @param int $i            The variation row index in the submitted arrays.
 * @return void
 */
function sgs_save_variation_fields( int $variation_id, int $i ): void {
	// Per-object capability check — matches the auth_callback in class-configurator-meta.php.
	if ( ! current_user_can( 'edit_post', $variation_id ) ) {
		return;
	}

	// ── Per-unit divisor ──────────────────────────────────────────────────────
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WooCommerce verifies the variation-save nonce before this hook fires.
	if ( isset( $_POST['_sgs_unit_divisor'][ $i ] ) ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- see above.
		$divisor_raw = sanitize_text_field( wp_unslash( $_POST['_sgs_unit_divisor'][ $i ] ) );
		update_post_meta( $variation_id, '_sgs_unit_divisor', Configurator_Meta::sanitize_divisor( $divisor_raw ) );
	}

	// ── Unit label ────────────────────────────────────────────────────────────
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- see above.
	if ( isset( $_POST['_sgs_unit_label'][ $i ] ) ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- see above.
		$label = sanitize_text_field( wp_unslash( $_POST['_sgs_unit_label'][ $i ] ) );
		update_post_meta( $variation_id, '_sgs_unit_label', $label );
	}

	// ── Cosmetic discount label (SEC-4: digits/% stripped by the sanitiser) ────
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- see above.
	if ( isset( $_POST['_sgs_discount_label'][ $i ] ) ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- see above.
		$discount_raw = sanitize_text_field( wp_unslash( $_POST['_sgs_discount_label'][ $i ] ) );
		update_post_meta( $variation_id, '_sgs_discount_label', Configurator_Meta::sanitize_discount_label( $discount_raw ) );
	}
}
