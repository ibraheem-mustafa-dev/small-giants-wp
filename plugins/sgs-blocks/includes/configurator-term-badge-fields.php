<?php
/**
 * Badge + short-description fields on WooCommerce attribute term screens.
 *
 * Spec 43 FR-43-25 guided-buybox peripherals: "each option's image, badge and
 * one-line description are attribute-term fields beside the existing swatch
 * fields (`_sgs_swatch_image_id`, `_sgs_term_badge`, `_sgs_term_description`),
 * set once per term and shown everywhere: buybox pickers, the guided buybox,
 * and flow product-option steps that don't override them." This file adds
 * the two new fields only — the swatch colour/image fields already live in
 * `configurator-term-fields.php`, which is over the 300-line cap, so this is
 * a new file mirroring its exact nonce/capability/sanitisation pattern.
 *
 * Security:
 *   - `manage_woocommerce` capability check before any save (same auth_callback
 *     as the swatch fields, `Configurator_Meta::can_edit_attribute_terms()`).
 *   - `wp_verify_nonce()` on save — nonce field output on both Add and Edit forms.
 *   - `sanitize_text_field()` + a hard length cap applied at save (defence in
 *     depth beyond the meta-registration `sanitize_callback`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SGS_TERM_BADGE_MAX_LENGTH       = 20;
const SGS_TERM_DESCRIPTION_MAX_LENGTH = 140;

/**
 * Register the two term_meta keys, on the same `init:20` timing as
 * Configurator_Meta::register_term_meta_all() (after WooCommerce registers
 * its attribute taxonomies on init:5).
 *
 * @return void
 */
function sgs_term_badge_meta_register(): void {
	if ( ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}
	foreach ( wc_get_attribute_taxonomy_names() as $taxonomy ) {
		register_term_meta(
			$taxonomy,
			'_sgs_term_badge',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => __NAMESPACE__ . '\\sgs_sanitize_term_badge',
				'auth_callback'     => array( Configurator_Meta::class, 'can_edit_attribute_terms' ),
			)
		);
		register_term_meta(
			$taxonomy,
			'_sgs_term_description',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => __NAMESPACE__ . '\\sgs_sanitize_term_description',
				'auth_callback'     => array( Configurator_Meta::class, 'can_edit_attribute_terms' ),
			)
		);
	}
}
add_action( 'init', __NAMESPACE__ . '\\sgs_term_badge_meta_register', 20 );

/**
 * Sanitise the badge value: plain text, capped at SGS_TERM_BADGE_MAX_LENGTH.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function sgs_sanitize_term_badge( $value ): string {
	$clean = sanitize_text_field( (string) $value );
	return mb_substr( $clean, 0, SGS_TERM_BADGE_MAX_LENGTH );
}

/**
 * Sanitise the description value: plain text, capped at SGS_TERM_DESCRIPTION_MAX_LENGTH.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function sgs_sanitize_term_description( $value ): string {
	$clean = sanitize_text_field( (string) $value );
	return mb_substr( $clean, 0, SGS_TERM_DESCRIPTION_MAX_LENGTH );
}

/**
 * Attach add/edit/save hooks to every WooCommerce attribute taxonomy.
 * Called on admin_init, mirroring configurator-term-fields.php's own timing.
 *
 * @return void
 */
function sgs_term_badge_fields_hooks(): void {
	if ( ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}
	foreach ( wc_get_attribute_taxonomy_names() as $taxonomy ) {
		add_action( "{$taxonomy}_add_form_fields", __NAMESPACE__ . '\\sgs_render_term_badge_add_fields' );
		add_action( "{$taxonomy}_edit_form_fields", __NAMESPACE__ . '\\sgs_render_term_badge_edit_fields' );
		add_action( "created_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_term_badge_fields', 10, 2 );
		add_action( "edited_{$taxonomy}", __NAMESPACE__ . '\\sgs_save_term_badge_fields', 10, 2 );
	}
}
add_action( 'admin_init', __NAMESPACE__ . '\\sgs_term_badge_fields_hooks' );

/**
 * Render the badge + description fields on the "Add term" screen.
 *
 * @param string $taxonomy Current taxonomy slug.
 * @return void
 */
function sgs_render_term_badge_add_fields( string $taxonomy ): void {
	$nonce = wp_create_nonce( 'sgs_term_badge_save_' . $taxonomy );
	?>
	<div class="form-field sgs-term-badge-fields">
		<input type="hidden" name="sgs_term_badge_nonce" value="<?php echo esc_attr( $nonce ); ?>" />

		<label for="sgs_term_badge_add"><?php esc_html_e( 'Badge', 'sgs-blocks' ); ?></label>
		<input type="text"
			id="sgs_term_badge_add"
			name="sgs_term_badge"
			value=""
			maxlength="<?php echo (int) SGS_TERM_BADGE_MAX_LENGTH; ?>"
			style="width:100%;" />
		<p class="description"><?php esc_html_e( 'Optional. A short pill shown on the option (e.g. "New", "Best seller"). Up to 20 characters.', 'sgs-blocks' ); ?></p>

		<label for="sgs_term_description_add" style="display:block;margin-top:1em;"><?php esc_html_e( 'Short description', 'sgs-blocks' ); ?></label>
		<input type="text"
			id="sgs_term_description_add"
			name="sgs_term_description"
			value=""
			maxlength="<?php echo (int) SGS_TERM_DESCRIPTION_MAX_LENGTH; ?>"
			style="width:100%;" />
		<p class="description"><?php esc_html_e( 'Optional. One line shown under the option label. Up to 140 characters.', 'sgs-blocks' ); ?></p>
	</div>
	<?php
}

/**
 * Render the badge + description fields on the "Edit term" screen.
 *
 * @param \WP_Term $wp_term The term being edited.
 * @return void
 */
function sgs_render_term_badge_edit_fields( \WP_Term $wp_term ): void {
	$taxonomy    = $wp_term->taxonomy;
	$nonce       = wp_create_nonce( 'sgs_term_badge_save_' . $taxonomy );
	$badge       = (string) get_term_meta( $wp_term->term_id, '_sgs_term_badge', true );
	$description = (string) get_term_meta( $wp_term->term_id, '_sgs_term_description', true );
	?>
	<input type="hidden" name="sgs_term_badge_nonce" value="<?php echo esc_attr( $nonce ); ?>" />

	<tr class="form-field sgs-term-badge-field-row">
		<th scope="row">
			<label for="sgs_term_badge_edit"><?php esc_html_e( 'Badge', 'sgs-blocks' ); ?></label>
		</th>
		<td>
			<input type="text"
				id="sgs_term_badge_edit"
				name="sgs_term_badge"
				value="<?php echo esc_attr( $badge ); ?>"
				maxlength="<?php echo (int) SGS_TERM_BADGE_MAX_LENGTH; ?>"
				style="width:100%;max-width:280px;" />
			<p class="description"><?php esc_html_e( 'Optional. A short pill shown on the option (e.g. "New", "Best seller"). Up to 20 characters.', 'sgs-blocks' ); ?></p>
		</td>
	</tr>

	<tr class="form-field sgs-term-badge-field-row">
		<th scope="row">
			<label for="sgs_term_description_edit"><?php esc_html_e( 'Short description', 'sgs-blocks' ); ?></label>
		</th>
		<td>
			<input type="text"
				id="sgs_term_description_edit"
				name="sgs_term_description"
				value="<?php echo esc_attr( $description ); ?>"
				maxlength="<?php echo (int) SGS_TERM_DESCRIPTION_MAX_LENGTH; ?>"
				style="width:100%;max-width:400px;" />
			<p class="description"><?php esc_html_e( 'Optional. One line shown under the option label. Up to 140 characters.', 'sgs-blocks' ); ?></p>
		</td>
	</tr>
	<?php
}

/**
 * Save the badge + description term meta on term create or update.
 *
 * @param int $term_id Term ID being saved.
 * @param int $tt_id   Term taxonomy ID (unused).
 * @return void
 */
function sgs_save_term_badge_fields( int $term_id, int $tt_id ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce core capability.
		return;
	}

	$action   = current_action();
	$taxonomy = preg_replace( '/^(created|edited)_/', '', (string) $action );

	$nonce = isset( $_POST['sgs_term_badge_nonce'] ) // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified below.
		? sanitize_text_field( wp_unslash( $_POST['sgs_term_badge_nonce'] ) )
		: '';
	if ( ! wp_verify_nonce( $nonce, 'sgs_term_badge_save_' . $taxonomy ) ) {
		return;
	}

	$badge_raw = isset( $_POST['sgs_term_badge'] ) // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified above.
		? sanitize_text_field( wp_unslash( $_POST['sgs_term_badge'] ) )
		: '';
	update_term_meta( $term_id, '_sgs_term_badge', mb_substr( $badge_raw, 0, SGS_TERM_BADGE_MAX_LENGTH ) );

	$description_raw = isset( $_POST['sgs_term_description'] ) // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified above.
		? sanitize_text_field( wp_unslash( $_POST['sgs_term_description'] ) )
		: '';
	update_term_meta( $term_id, '_sgs_term_description', mb_substr( $description_raw, 0, SGS_TERM_DESCRIPTION_MAX_LENGTH ) );
}
