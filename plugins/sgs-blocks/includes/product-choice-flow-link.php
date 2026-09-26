<?php
/**
 * Product-level "Customisation flow" link (Spec 43 FR-43-25).
 *
 * Adds a <select> to the WooCommerce product editor's General tab (any
 * purchasable product, simple or variable) that links the product to a
 * published `sgs_choice_flow` post. `includes/buybox-linked-flow.php` reads
 * the stored meta to auto-wire the buybox's Add to Cart button into that
 * flow's popup (FR-43-22's modal mechanism) when no explicit
 * `addToCartAction: modal` already wins.
 *
 * Meta key: `_sgs_choice_flow` — a `sgs_choice_flow` post SLUG (never an ID),
 * the SAME by-slug shape `sgs/choice-flow`'s own `flowId` attribute and
 * {@see \SGS\Blocks\Sgs_Block_CPTs::resolve_choice_flow()} already use, so one
 * resolver serves both the block attribute and this product link.
 *
 * Security:
 *   - A dedicated nonce field guards the save (WooCommerce's own product-save
 *     nonce is verified before `woocommerce_process_product_meta` fires, but
 *     the installed WC source isn't available to re-confirm that here, so
 *     this file adds its own belt-and-braces nonce per the build brief).
 *   - `current_user_can( 'edit_post', $product_id )` before every write.
 *   - The stored value is always `sanitize_title()`-d — never a raw slug.
 *   - `register_post_meta()` exposes the field to REST/editor with an
 *     `edit_post` auth_callback, so nothing can read or write it without the
 *     same capability the classic screen already requires.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Post meta key storing the linked flow's slug. */
const CHOICE_FLOW_LINK_META_KEY = '_sgs_choice_flow';

/** Nonce action/field name for the product-editor save round-trip. */
const CHOICE_FLOW_LINK_NONCE_ACTION = 'sgs_product_choice_flow_save';
const CHOICE_FLOW_LINK_NONCE_FIELD  = 'sgs_product_choice_flow_nonce';

/**
 * Wire the product-editor field and its save handler, and expose the meta to
 * REST so the block editor / REST clients can read it. Silent no-op when
 * WooCommerce is inactive.
 *
 * @return void
 */
function sgs_choice_flow_link_register(): void {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return;
	}

	add_action( 'woocommerce_product_options_general_product_data', __NAMESPACE__ . '\\sgs_render_choice_flow_link_field' );
	add_action( 'woocommerce_process_product_meta', __NAMESPACE__ . '\\sgs_save_choice_flow_link_field' );

	register_post_meta(
		'product',
		CHOICE_FLOW_LINK_META_KEY,
		array(
			'type'              => 'string',
			'single'            => true,
			'default'           => '',
			'show_in_rest'      => true,
			'sanitize_callback' => 'sanitize_title',
			'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
				return current_user_can( 'edit_post', $post_id );
			},
		)
	);
}
add_action( 'init', __NAMESPACE__ . '\\sgs_choice_flow_link_register', 20 );

/**
 * Render the "Customisation flow" <select> inside the General product-data
 * panel: "None" plus every published `sgs_choice_flow` post (title shown,
 * slug stored) — same options source
 * {@see Sgs_Cpt_References::embedding_posts()} looks up.
 *
 * @return void
 */
function sgs_render_choice_flow_link_field(): void {
	if ( ! function_exists( 'woocommerce_wp_select' ) ) {
		return;
	}

	global $post;
	$product_id = isset( $post->ID ) ? (int) $post->ID : 0;
	if ( $product_id <= 0 ) {
		return;
	}

	$current_slug = (string) get_post_meta( $product_id, CHOICE_FLOW_LINK_META_KEY, true );

	$flow_posts = get_posts(
		array(
			'post_type'      => Sgs_Block_CPTs::CHOICE_FLOW_CPT,
			'post_status'    => 'publish',
			'posts_per_page' => 100,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'no_found_rows'  => true,
		)
	);

	$options = array( '' => __( 'None', 'sgs-blocks' ) );
	foreach ( $flow_posts as $flow_post ) {
		$options[ $flow_post->post_name ] = $flow_post->post_title;
	}
	// A stale link to a since-unpublished/deleted flow still shows as the
	// selected value (never silently swapped to "None") so the operator sees
	// and can consciously clear it, matching resolve_choice_flow()'s
	// fail-closed-at-render (not fail-closed-at-authoring) behaviour.
	if ( '' !== $current_slug && ! isset( $options[ $current_slug ] ) ) {
		$options[ $current_slug ] = sprintf(
			/* translators: %s: the missing flow's slug. */
			__( '%s (not published)', 'sgs-blocks' ),
			$current_slug
		);
	}

	wp_nonce_field( CHOICE_FLOW_LINK_NONCE_ACTION, CHOICE_FLOW_LINK_NONCE_FIELD );

	echo '<div class="options_group sgs-choice-flow-link-field">';
	woocommerce_wp_select(
		array(
			'id'          => CHOICE_FLOW_LINK_META_KEY,
			'name'        => CHOICE_FLOW_LINK_META_KEY,
			'value'       => $current_slug,
			'label'       => __( 'Customisation flow', 'sgs-blocks' ),
			'options'     => $options,
			'desc_tip'    => true,
			'description' => __( 'Link this product to a saved Choice Flow. With a flow linked, the buy box\'s Add to Cart button opens it as a full-screen popup instead of adding to the cart directly (Spec 43).', 'sgs-blocks' ),
		)
	);
	echo '</div>';
}

/**
 * Save the "Customisation flow" selection. Runs on the standard WooCommerce
 * product-save hook, guarded by this file's own nonce, an `edit_post`
 * capability check, and `sanitize_title()` on the stored value.
 *
 * @param int $product_id Saved product's post ID.
 * @return void
 */
function sgs_save_choice_flow_link_field( int $product_id ): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified explicitly below via wp_verify_nonce().
	$nonce = isset( $_POST[ CHOICE_FLOW_LINK_NONCE_FIELD ] ) ? sanitize_text_field( wp_unslash( $_POST[ CHOICE_FLOW_LINK_NONCE_FIELD ] ) ) : '';
	if ( '' === $nonce || ! wp_verify_nonce( $nonce, CHOICE_FLOW_LINK_NONCE_ACTION ) ) {
		return;
	}

	if ( ! current_user_can( 'edit_post', $product_id ) ) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- nonce already verified above; sanitized immediately below.
	$raw_slug = isset( $_POST[ CHOICE_FLOW_LINK_META_KEY ] ) ? sanitize_text_field( wp_unslash( $_POST[ CHOICE_FLOW_LINK_META_KEY ] ) ) : '';
	$slug     = sanitize_title( $raw_slug );

	if ( '' === $slug ) {
		delete_post_meta( $product_id, CHOICE_FLOW_LINK_META_KEY );
		return;
	}

	update_post_meta( $product_id, CHOICE_FLOW_LINK_META_KEY, $slug );
}

if ( ! function_exists( __NAMESPACE__ . '\sgs_product_choice_flow_count' ) ) {
	/**
	 * How many products link this choice flow (`_sgs_choice_flow` = its slug);
	 * the Choice Flows list's "Used by N products" line.
	 *
	 * @param string $slug Flow post slug.
	 * @return int
	 */
	function sgs_product_choice_flow_count( string $slug ): int {
		if ( '' === $slug ) {
			return 0;
		}

		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- bounded COUNT(*), same shape as Sgs_Cpt_Usage_Columns' usage counters.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE pm.meta_key = '_sgs_choice_flow' AND pm.meta_value = %s AND p.post_type = 'product' AND p.post_status IN ( 'publish', 'draft', 'private' )",
				$slug
			)
		);
	}
}
