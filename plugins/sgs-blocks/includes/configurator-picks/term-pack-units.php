<?php
/**
 * "Pieces in this pack" field on WooCommerce attribute term screens (`_sgs_pack_units`).
 *
 * The buy box "Pick a set" mode reads the pack number from the pack-size attribute's terms: this field when set, else the
 * one run of digits in the term name (Configurator_Groups::pack()). Same nonce, capability and sanitising pattern as
 * configurator-term-badge-fields.php.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the term meta on every attribute taxonomy.
 */
function sgs_pack_units_meta_register(): void {
	if ( ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}
	foreach ( wc_get_attribute_taxonomy_names() as $taxonomy ) {
		register_term_meta(
			$taxonomy,
			Configurator_Groups::PACK_UNITS_META,
			array(
				'type'              => 'integer',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => 'absint',
				'auth_callback'     => array( Configurator_Meta::class, 'can_edit_attribute_terms' ),
			)
		);
	}
}
add_action( 'init', __NAMESPACE__ . '\\sgs_pack_units_meta_register', 20 );

/**
 * Attach the add, edit and save hooks to every attribute taxonomy.
 */
function sgs_pack_units_fields_hooks(): void {
	if ( ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}
	foreach ( wc_get_attribute_taxonomy_names() as $taxonomy ) {
		add_action( "{$taxonomy}_add_form_fields", __NAMESPACE__ . '\\sgs_render_pack_units_add_field' );
		add_action( "{$taxonomy}_edit_form_fields", __NAMESPACE__ . '\\sgs_render_pack_units_edit_field' );
		add_action( "created_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_pack_units_field', 10, 2 );
		add_action( "edited_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_pack_units_field', 10, 2 );
	}
}
add_action( 'admin_init', __NAMESPACE__ . '\\sgs_pack_units_fields_hooks' );

/**
 * The help line under the field.
 *
 * @return string
 */
function sgs_pack_units_help(): string {
	return __( 'Optional. How many pieces this option holds, as a whole number (for example 8). Leave empty to read the number from the name ("Pack of 8"). Only used on the pack-size attribute.', 'sgs-blocks' );
}

/**
 * Render the field on the "Add term" screen.
 *
 * @param string $taxonomy Current taxonomy slug.
 */
function sgs_render_pack_units_add_field( string $taxonomy ): void {
	?>
	<div class="form-field sgs-pack-units-field">
		<input type="hidden" name="sgs_pack_units_nonce" value="<?php echo esc_attr( wp_create_nonce( 'sgs_pack_units_save_' . $taxonomy ) ); ?>" />
		<label for="sgs_pack_units_add"><?php esc_html_e( 'Pieces in this pack', 'sgs-blocks' ); ?></label>
		<input type="number" min="1" step="1" id="sgs_pack_units_add" name="sgs_pack_units" value="" />
		<p class="description"><?php echo esc_html( sgs_pack_units_help() ); ?></p>
	</div>
	<?php
}

/**
 * Render the field on the "Edit term" screen.
 *
 * @param \WP_Term $wp_term The term being edited.
 */
function sgs_render_pack_units_edit_field( \WP_Term $wp_term ): void {
	$units = absint( get_term_meta( $wp_term->term_id, Configurator_Groups::PACK_UNITS_META, true ) );
	?>
	<input type="hidden" name="sgs_pack_units_nonce" value="<?php echo esc_attr( wp_create_nonce( 'sgs_pack_units_save_' . $wp_term->taxonomy ) ); ?>" />
	<tr class="form-field sgs-pack-units-field-row">
		<th scope="row"><label for="sgs_pack_units_edit"><?php esc_html_e( 'Pieces in this pack', 'sgs-blocks' ); ?></label></th>
		<td>
			<input type="number" min="1" step="1" id="sgs_pack_units_edit" name="sgs_pack_units" value="<?php echo $units > 0 ? esc_attr( (string) $units ) : ''; ?>" />
			<p class="description"><?php echo esc_html( sgs_pack_units_help() ); ?></p>
		</td>
	</tr>
	<?php
}

/**
 * Save the field on term create or update.
 *
 * @param int $term_id Term ID.
 * @param int $tt_id   Term taxonomy ID (unused).
 */
function sgs_save_pack_units_field( int $term_id, int $tt_id ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce core capability.
		return;
	}
	$taxonomy = preg_replace( '/^(created|edited)_/', '', (string) current_action() );
	$nonce    = isset( $_POST['sgs_pack_units_nonce'] ) // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified below.
		? sanitize_text_field( wp_unslash( $_POST['sgs_pack_units_nonce'] ) )
		: '';
	if ( ! wp_verify_nonce( $nonce, 'sgs_pack_units_save_' . $taxonomy ) ) {
		return;
	}
	$units = isset( $_POST['sgs_pack_units'] ) // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified above.
		? absint( wp_unslash( $_POST['sgs_pack_units'] ) )
		: 0;
	// Zero means "read the number from the name" (Configurator_Groups::pack()).
	update_term_meta( $term_id, Configurator_Groups::PACK_UNITS_META, min( $units, 9999 ) );
}
