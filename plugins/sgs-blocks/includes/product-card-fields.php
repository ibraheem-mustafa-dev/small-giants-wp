<?php
/**
 * The "Card" tab on the WooCommerce product edit screen: the per-product badge,
 * price note and button label (and button action) an sgs/product-card set to
 * "From each product" shows (includes/product-card-per-product.php).
 *
 * Security: a nonce field is printed with the panel and verified on save; saving
 * needs the edit_post capability on that product; every value is read through
 * wp_unslash and sanitize_text_field (the action is checked against its allow-list);
 * output is escaped by WooCommerce's field helpers and esc_*; the keys are registered
 * with register_post_meta (sanitize and auth callbacks) so the REST API applies the
 * same rules.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/product-card-per-product.php';

/**
 * Sanitise one card field value.
 *
 * @param string $field badge|note|label|action.
 * @param mixed  $value Raw value.
 * @return string Clean value ('' when not allowed).
 */
function sgs_product_card_field_clean( string $field, $value ): string {
	$clean = sanitize_text_field( is_string( $value ) ? $value : '' );
	if ( 'action' === $field ) {
		return in_array( $clean, array( 'add', 'page' ), true ) ? $clean : '';
	}
	return mb_substr( $clean, 0, 120 );
}

/**
 * Register the hooks. Silent no-op without WooCommerce.
 *
 * @return void
 */
function sgs_product_card_fields_register(): void {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return;
	}
	foreach ( \sgs_product_card_meta_keys() as $field => $key ) {
		register_post_meta(
			'product',
			$key,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => true,
				'sanitize_callback' => static function ( $value ) use ( $field ) {
					return sgs_product_card_field_clean( $field, $value );
				},
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					return current_user_can( 'edit_post', (int) $post_id );
				},
			)
		);
	}
	add_filter( 'woocommerce_product_data_tabs', __NAMESPACE__ . '\\sgs_product_card_fields_tab' );
	add_action( 'woocommerce_product_data_panels', __NAMESPACE__ . '\\sgs_product_card_fields_panel' );
	add_action( 'woocommerce_process_product_meta', __NAMESPACE__ . '\\sgs_product_card_fields_save' );
}
add_action( 'init', __NAMESPACE__ . '\\sgs_product_card_fields_register', 20 );

/**
 * Add the Card tab to the product data box.
 *
 * @param array<string,mixed> $tabs Tabs.
 * @return array<string,mixed> Tabs.
 */
function sgs_product_card_fields_tab( $tabs ) {
	$tabs['sgs_product_card'] = array(
		'label'    => __( 'Card', 'sgs-blocks' ),
		'target'   => 'sgs_product_card_data',
		'class'    => array(),
		'priority' => 75,
	);
	return $tabs;
}

/**
 * Print the Card panel.
 *
 * @return void
 */
function sgs_product_card_fields_panel(): void {
	global $post;
	$product_id = isset( $post->ID ) ? (int) $post->ID : 0;
	if ( $product_id <= 0 || ! function_exists( 'woocommerce_wp_text_input' ) || ! function_exists( 'woocommerce_wp_select' ) ) {
		return;
	}
	$keys = \sgs_product_card_meta_keys();

	echo '<div id="sgs_product_card_data" class="panel woocommerce_options_panel hidden">';
	wp_nonce_field( 'sgs_product_card_fields_save', 'sgs_product_card_fields_nonce' );
	echo '<div class="options_group"><p class="form-field">' . esc_html__( 'What this product\'s card says in a shop grid whose cards are set to "From each product". Leave a field empty to show nothing extra.', 'sgs-blocks' ) . '</p>';

	woocommerce_wp_text_input(
		array(
			'id'          => $keys['badge'],
			'label'       => __( 'Image badge', 'sgs-blocks' ),
			'value'       => (string) get_post_meta( $product_id, $keys['badge'], true ),
			'desc_tip'    => true,
			'description' => __( 'A short label on the card image, e.g. "Gift favourite".', 'sgs-blocks' ),
		)
	);
	woocommerce_wp_text_input(
		array(
			'id'          => $keys['note'],
			'label'       => __( 'Price note', 'sgs-blocks' ),
			'value'       => (string) get_post_meta( $product_id, $keys['note'], true ),
			'desc_tip'    => true,
			'description' => __( 'Small text beside the price, e.g. "postage included".', 'sgs-blocks' ),
		)
	);
	woocommerce_wp_text_input(
		array(
			'id'          => $keys['label'],
			'label'       => __( 'Button label', 'sgs-blocks' ),
			'value'       => (string) get_post_meta( $product_id, $keys['label'], true ),
			'desc_tip'    => true,
			'description' => __( 'Empty uses the card\'s usual button label.', 'sgs-blocks' ),
		)
	);
	woocommerce_wp_select(
		array(
			'id'          => $keys['action'],
			'label'       => __( 'Button action', 'sgs-blocks' ),
			'value'       => (string) get_post_meta( $product_id, $keys['action'], true ),
			'options'     => array(
				''     => __( 'As the card is set', 'sgs-blocks' ),
				'add'  => __( 'Add to basket', 'sgs-blocks' ),
				'page' => __( 'Go to the product page', 'sgs-blocks' ),
			),
			'desc_tip'    => true,
			'description' => __( 'What the card\'s button does for this product.', 'sgs-blocks' ),
		)
	);
	echo '</div></div>';
}

/**
 * Save the Card panel.
 *
 * @param int $product_id Product ID.
 * @return void
 */
function sgs_product_card_fields_save( $product_id ): void {
	$product_id = (int) $product_id;
	$nonce      = isset( $_POST['sgs_product_card_fields_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['sgs_product_card_fields_nonce'] ) ) : '';
	if ( '' === $nonce || ! wp_verify_nonce( $nonce, 'sgs_product_card_fields_save' ) ) {
		return;
	}
	if ( $product_id <= 0 || ! current_user_can( 'edit_post', $product_id ) ) {
		return;
	}
	foreach ( \sgs_product_card_meta_keys() as $field => $key ) {
		if ( ! isset( $_POST[ $key ] ) ) {
			continue;
		}
		$clean = sgs_product_card_field_clean( $field, wp_unslash( $_POST[ $key ] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitised by sgs_product_card_field_clean().
		if ( '' === $clean ) {
			delete_post_meta( $product_id, $key );
		} else {
			update_post_meta( $product_id, $key, $clean );
		}
	}
}
