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
	// Enqueue the WP media library on the product edit screen so the gallery
	// picker JS can open the media modal. wp_enqueue_media() is idempotent.
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\sgs_enqueue_variation_gallery_assets' );
}
add_action( 'init', __NAMESPACE__ . '\\sgs_configurator_variation_fields_register', 20 );

/**
 * Enqueue the WP media library + inline gallery-picker JS on product edit screens.
 *
 * Only loads on `post.php` / `post-new.php` for the `product` post type.
 *
 * @param string $hook_suffix Current admin page hook.
 * @return void
 */
function sgs_enqueue_variation_gallery_assets( string $hook_suffix ): void {
	if ( ! in_array( $hook_suffix, array( 'post.php', 'post-new.php' ), true ) ) {
		return;
	}
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || 'product' !== $screen->post_type ) {
		return;
	}
	// Loads the WP media library (idempotent — safe to call even if already loaded).
	wp_enqueue_media();
}

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

	// A4: variation image gallery — multi-image picker using the WP media library.
	// Stores a comma-separated list of attachment IDs in a hidden input; JS
	// populates it when the operator selects images via the media modal.
	$gallery_ids     = Configurator_Meta::sanitize_id_array(
		get_post_meta( $variation_id, '_sgs_variation_gallery', true )
	);
	$gallery_ids_csv = implode( ',', $gallery_ids );

	// Build SSR thumbnail previews (shown even before JS loads).
	$preview_html = '';
	foreach ( $gallery_ids as $gid ) {
		$thumb = wp_get_attachment_image_url( $gid, array( 48, 48 ) );
		if ( $thumb ) {
			$preview_html .= '<img src="' . esc_url( $thumb ) . '" width="48" height="48" alt="" style="object-fit:cover;border-radius:4px;border:1px solid #ddd;">';
		}
	}

	echo '<div class="form-row form-row-full sgs-variation-gallery-field" style="border-top:1px solid #e0e0e0;margin-top:6px;padding-top:6px;">';
	echo '<label style="display:block;margin-bottom:4px;">' . esc_html__( 'Image gallery', 'sgs-blocks' ) . '</label>';
	echo '<p class="description" style="margin-bottom:6px;">' . esc_html__( 'Optional extra images shown as thumbnails below the main product image. Leave empty to use the variation\'s single image only.', 'sgs-blocks' ) . '</p>';
	echo '<input
		type="hidden"
		id="_sgs_variation_gallery_' . esc_attr( (string) $loop ) . '"
		name="_sgs_variation_gallery[' . esc_attr( (string) $loop ) . ']"
		value="' . esc_attr( $gallery_ids_csv ) . '"
	>';
	echo '<div
		class="sgs-gallery-previews"
		id="_sgs_variation_gallery_previews_' . esc_attr( (string) $loop ) . '"
		style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;"
	>' . $preview_html . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $preview_html built from esc_url + hard-coded safe attributes only.
	echo '<button
		type="button"
		class="button sgs-gallery-select"
		data-loop="' . esc_attr( (string) $loop ) . '"
	>' . esc_html__( 'Select images', 'sgs-blocks' ) . '</button>';
	if ( ! empty( $gallery_ids ) ) {
		echo ' <button
			type="button"
			class="button sgs-gallery-clear"
			data-loop="' . esc_attr( (string) $loop ) . '"
		>' . esc_html__( 'Clear', 'sgs-blocks' ) . '</button>';
	}
	echo '</div>';

	// Inline JS for the gallery picker — deferred until DOMContentLoaded so it
	// runs after WooCommerce renders variation panels. Scoped to this variation
	// loop index so multiple variations on the same page don't collide.
	// wp_enqueue_media() is called on admin_enqueue_scripts (above) so
	// wp.media is available when this runs.
	?>
	<script>
	( function() {
		var loop       = <?php echo (int) $loop; ?>;
		var inputId    = '_sgs_variation_gallery_' + loop;
		var previewId  = '_sgs_variation_gallery_previews_' + loop;

		function attachHandlers() {
			var selectBtn = document.querySelector( '.sgs-gallery-select[data-loop="' + loop + '"]' );
			var clearBtn  = document.querySelector( '.sgs-gallery-clear[data-loop="' + loop + '"]' );
			var input     = document.getElementById( inputId );
			var preview   = document.getElementById( previewId );

			if ( ! selectBtn || ! input || ! preview ) {
				return;
			}

			selectBtn.addEventListener( 'click', function() {
				var frame = wp.media( {
					title    : <?php echo wp_json_encode( __( 'Select gallery images', 'sgs-blocks' ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?>,
					multiple : true,
					library  : { type: 'image' },
					button   : { text: <?php echo wp_json_encode( __( 'Use these images', 'sgs-blocks' ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?> },
				} );
				frame.on( 'select', function() {
					var ids     = [];
					var newPrev = '';
					frame.state().get( 'selection' ).each( function( attachment ) {
						ids.push( attachment.id );
						var sizes = attachment.get( 'sizes' ) || {};
						var url   = ( sizes.thumbnail && sizes.thumbnail.url ) || attachment.get( 'url' ) || '';
						if ( url ) {
							newPrev += '<img src="' + url + '" width="48" height="48" alt="" style="object-fit:cover;border-radius:4px;border:1px solid #ddd;">';
						}
					} );
					input.value   = ids.join( ',' );
					preview.innerHTML = newPrev;
					// Show clear button if hidden.
					var cb = document.querySelector( '.sgs-gallery-clear[data-loop="' + loop + '"]' );
					if ( ! cb ) {
						var newClear = document.createElement( 'button' );
						newClear.type      = 'button';
						newClear.className = 'button sgs-gallery-clear';
						newClear.dataset.loop = String( loop );
						newClear.textContent = <?php echo wp_json_encode( __( 'Clear', 'sgs-blocks' ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?>;
						selectBtn.parentNode.insertBefore( newClear, selectBtn.nextSibling );
						newClear.addEventListener( 'click', doClear );
					}
				} );
				frame.open();
			} );

			function doClear() {
				input.value       = '';
				preview.innerHTML = '';
				var cb = document.querySelector( '.sgs-gallery-clear[data-loop="' + loop + '"]' );
				if ( cb ) {
					cb.remove();
				}
			}

			if ( clearBtn ) {
				clearBtn.addEventListener( 'click', doClear );
			}
		}

		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', attachHandlers );
		} else {
			attachHandlers();
		}
	}() );
	</script>
	<?php

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

	// ── Variation image gallery (A4) ───────────────────────────────────────────
	// The gallery picker field posts a comma-separated list of attachment ids;
	// sanitize_id_array() splits the CSV and image-type-checks every id.
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WC verifies the variation-save nonce before this hook fires.
	if ( isset( $_POST['_sgs_variation_gallery'][ $i ] ) ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- see above.
		$gallery_raw = sanitize_text_field( wp_unslash( $_POST['_sgs_variation_gallery'][ $i ] ) );
		update_post_meta( $variation_id, '_sgs_variation_gallery', Configurator_Meta::sanitize_id_array( $gallery_raw ) );
	}
}
