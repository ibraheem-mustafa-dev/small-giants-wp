<?php
/**
 * SGS Smart Bulk Pricing — product_cat term fields (Spec 28 P3, FR-28-6).
 *
 * Adds a "Discount strength" override field to the WooCommerce product
 * category (product_cat) Add-term and Edit-term admin screens.
 *
 * When set, this overrides the site-level k_notch for every product in the
 * category.  Products can further override at the product level.  This is
 * the middle layer of the site → category → product cascade (FR-28-6).
 *
 * Stored as term meta key: sgs_pack_k (PACK_PRICING_CAT_META_K constant).
 * Value: 'gentle' | 'standard' | 'aggressive' | '' (inherit from site).
 *
 * Capability gate: manage_woocommerce (FR-28-6, must-fix #12).
 * Nonce:           sgs_pack_pricing_cat_{term_id} per-save.
 *
 * Pattern mirrors configurator-term-fields.php (swatch fields on pa_* screens).
 *
 * @package   SGS\Blocks
 * @since     1.14.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-6
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register hooks on admin_init (product_cat is always registered by then).
 *
 * Silent no-op when WooCommerce is inactive.
 *
 * @return void
 */
function sgs_pack_pricing_cat_fields_register(): void {
	if ( ! \taxonomy_exists( 'product_cat' ) ) {
		return;
	}
	\add_action( 'product_cat_add_form_fields', __NAMESPACE__ . '\\sgs_render_pack_pricing_cat_add_field' );
	\add_action( 'product_cat_edit_form_fields', __NAMESPACE__ . '\\sgs_render_pack_pricing_cat_edit_field' );
	\add_action( 'created_product_cat', __NAMESPACE__ . '\\sgs_save_pack_pricing_cat_field', 10, 2 );
	\add_action( 'edited_product_cat', __NAMESPACE__ . '\\sgs_save_pack_pricing_cat_field', 10, 2 );
}
\add_action( 'admin_init', __NAMESPACE__ . '\\sgs_pack_pricing_cat_fields_register' );

/**
 * Render the k-override field on the product_cat Add-term screen.
 *
 * @return void
 */
function sgs_render_pack_pricing_cat_add_field(): void {
	\wp_nonce_field( 'sgs_pack_pricing_cat_add', 'sgs_pack_pricing_cat_nonce' );
	?>
	<div class="form-field">
		<label for="sgs_pack_k">
			<?php \esc_html_e( 'Smart Bulk Pricing — discount strength', 'sgs-blocks' ); ?>
		</label>
		<?php sgs_pack_pricing_cat_k_select( '' ); ?>
		<p class="description">
			<?php \esc_html_e( 'Override the site-wide discount strength for all products in this category. Leave as "Inherit from site" to use the site default.', 'sgs-blocks' ); ?>
		</p>
	</div>
	<?php
}

/**
 * Render the k-override field on the product_cat Edit-term screen.
 *
 * @param \WP_Term $term The term being edited.
 * @return void
 */
function sgs_render_pack_pricing_cat_edit_field( \WP_Term $term ): void {
	$current = (string) \get_term_meta( $term->term_id, PACK_PRICING_CAT_META_K, true );
	\wp_nonce_field( 'sgs_pack_pricing_cat_' . $term->term_id, 'sgs_pack_pricing_cat_nonce' );
	?>
	<tr class="form-field">
		<th scope="row">
			<label for="sgs_pack_k">
				<?php \esc_html_e( 'Smart Bulk Pricing — discount strength', 'sgs-blocks' ); ?>
			</label>
		</th>
		<td>
			<?php sgs_pack_pricing_cat_k_select( $current ); ?>
			<p class="description">
				<?php \esc_html_e( 'Override the site-wide discount strength for all products in this category (a product can still override this individually). Leave as "Inherit from site" to use the site default.', 'sgs-blocks' ); ?>
			</p>
		</td>
	</tr>
	<?php
}

/**
 * Output the <select> for the k notch field.
 *
 * @param string $current Currently-stored notch value ('' = inherit).
 * @return void
 */
function sgs_pack_pricing_cat_k_select( string $current ): void {
	// Option wording is IDENTICAL across settings/category/product surfaces
	// (visual-pass consistency fix).
	$options = array(
		''           => \__( 'Inherit from site', 'sgs-blocks' ),
		'gentle'     => \__( 'Gentle (~8-20% saving on largest pack)', 'sgs-blocks' ),
		'standard'   => \__( 'Standard (~17-35% saving on largest pack)', 'sgs-blocks' ),
		'aggressive' => \__( 'Aggressive (~20-40% saving on largest pack)', 'sgs-blocks' ),
	);
	echo '<select name="sgs_pack_k" id="sgs_pack_k">';
	foreach ( $options as $value => $label ) {
		\printf(
			'<option value="%s"%s>%s</option>',
			\esc_attr( $value ),
			\selected( $current, $value, false ),
			\esc_html( $label )
		);
	}
	echo '</select>';
}

/**
 * Save the k-override term meta on product_cat create/update.
 *
 * Capability gate: manage_woocommerce.
 * Nonce: sgs_pack_pricing_cat_{term_id} (or sgs_pack_pricing_cat_add for new).
 *
 * @param int $term_id The term ID being saved.
 * @return void
 */
function sgs_save_pack_pricing_cat_field( int $term_id ): void {
	// Capability gate (FR-28-6 must-fix #12).
	if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce custom capability.
		return;
	}

	// Nonce verification — STRICTLY scoped per operation (security review
	// Finding 5, 2026-06-09): the unscoped add-screen nonce is accepted ONLY
	// on created_product_cat; an edit of an existing term requires the
	// term-scoped nonce. A dual `||` here let an add-nonce be replayed
	// against any term's edit action.
	$nonce = isset( $_POST['sgs_pack_pricing_cat_nonce'] )
		? \sanitize_text_field( \wp_unslash( $_POST['sgs_pack_pricing_cat_nonce'] ) )
		: '';

	$valid = \doing_action( 'created_product_cat' )
		? \wp_verify_nonce( $nonce, 'sgs_pack_pricing_cat_add' )
		: \wp_verify_nonce( $nonce, 'sgs_pack_pricing_cat_' . $term_id );

	if ( ! $valid ) {
		return;
	}

	if ( ! isset( $_POST['sgs_pack_k'] ) ) {
		return;
	}

	$raw           = \sanitize_key( \wp_unslash( $_POST['sgs_pack_k'] ) );
	$valid_notches = array( '', 'gentle', 'standard', 'aggressive' );

	if ( ! \in_array( $raw, $valid_notches, true ) ) {
		return;
	}

	if ( '' === $raw ) {
		\delete_term_meta( $term_id, PACK_PRICING_CAT_META_K );
	} else {
		\update_term_meta( $term_id, PACK_PRICING_CAT_META_K, $raw );
	}
}
