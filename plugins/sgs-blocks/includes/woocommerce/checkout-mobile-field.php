<?php
/**
 * Checkout mobile field: an optional field under Contact, registered with WooCommerce's additional checkout fields.
 *
 * WooCommerce's Checkout block cannot hold SGS attributes for a field, so the setting is the option
 * `sgs_checkout_mobile_field` (`label`, `placeholder`), edited from the Checkout block's inspector. It is registered
 * only when the option holds a label or a placeholder. WooCommerce draws an optional text field's floating label from
 * `optionalLabel`, so the placeholder text is passed there: it shows inside the empty field, as a placeholder does.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** The option holding the field's settings. */
const SGS_CHECKOUT_MOBILE_OPTION = 'sgs_checkout_mobile_field';

add_action( 'init', __NAMESPACE__ . '\sgs_checkout_mobile_register_setting' );
add_action( 'woocommerce_init', __NAMESPACE__ . '\sgs_checkout_mobile_register_field' );

/**
 * Sanitise the option: plain-text `label` and `placeholder`, empties kept as ''.
 *
 * @param mixed $raw Submitted value.
 * @return array{label:string,placeholder:string}
 */
function sgs_checkout_mobile_sanitise( $raw ): array {
	$raw = is_array( $raw ) ? $raw : array();
	return array(
		'label'       => sanitize_text_field( (string) ( $raw['label'] ?? '' ) ),
		'placeholder' => sanitize_text_field( (string) ( $raw['placeholder'] ?? '' ) ),
	);
}

/**
 * Expose the option to the block editor (the Checkout inspector reads and writes it through the site settings).
 *
 * @return void
 */
function sgs_checkout_mobile_register_setting(): void {
	register_setting(
		'sgs_checkout',
		SGS_CHECKOUT_MOBILE_OPTION,
		array(
			'type'              => 'object',
			'default'           => array(
				'label'       => '',
				'placeholder' => '',
			),
			'sanitize_callback' => __NAMESPACE__ . '\sgs_checkout_mobile_sanitise',
			'show_in_rest'      => array(
				'schema' => array(
					'type'                 => 'object',
					'properties'           => array(
						'label'       => array( 'type' => 'string' ),
						'placeholder' => array( 'type' => 'string' ),
					),
					'additionalProperties' => false,
				),
			),
		)
	);
}

/**
 * Register the field when the option is set.
 *
 * @return void
 */
function sgs_checkout_mobile_register_field(): void {
	if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
		return;
	}
	$set         = sgs_checkout_mobile_sanitise( get_option( SGS_CHECKOUT_MOBILE_OPTION, array() ) );
	$label       = '' !== $set['label'] ? $set['label'] : $set['placeholder'];
	$placeholder = '' !== $set['placeholder'] ? $set['placeholder'] : $label;
	if ( '' === $label ) {
		return;
	}
	woocommerce_register_additional_checkout_field(
		array(
			'id'            => 'sgs/mobile',
			'label'         => $label,
			'optionalLabel' => $placeholder,
			'location'      => 'contact',
			'type'          => 'text',
			'required'      => false,
			'attributes'    => array( 'autocomplete' => 'tel' ),
		)
	);
}
