<?php
/**
 * A "Description" setting on WooCommerce's delivery methods (Spec 27).
 *
 * Flat rate, free shipping and local pickup have no description field, yet the
 * Store API shipping rate carries a `description` that the Cart and Checkout
 * blocks print under the method title. This adds one text setting to each
 * method instance and returns it from WooCommerce's own
 * `woocommerce_shipping_rate_description` filter, which feeds the Store API
 * rate `description`. Empty, the description WooCommerce already holds is kept.
 * The setting is saved by the method's own settings form, so capability and
 * nonce are WooCommerce's; the value is passed through `wp_kses_post()` when saved by
 * WooCommerce's text-field handler and again on output.
 *
 * The checkout block prints a local pickup rate's text from the rate meta
 * `pickup_details` (only for the selected rate), never from `description`, so
 * a local pickup rate also receives the description as that meta when it has
 * none of its own.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Setting and filter.
 */
final class Shipping_Method_Description {

	/** Instance-setting key holding the description. */
	const SETTING = 'sgs_description';

	/** Method ids that get the setting. */
	const METHODS = array( 'flat_rate', 'free_shipping', 'local_pickup' );

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		foreach ( self::METHODS as $method_id ) {
			\add_filter( 'woocommerce_shipping_instance_form_fields_' . $method_id, array( __CLASS__, 'add_field' ) );
		}
		\add_filter( 'woocommerce_shipping_rate_description', array( __CLASS__, 'rate_description' ), 10, 2 );
		\add_filter( 'woocommerce_package_rates', array( __CLASS__, 'add_pickup_details' ) );
	}

	/**
	 * Add the setting to a method's instance form.
	 *
	 * @param mixed $fields Instance form fields.
	 * @return mixed
	 */
	public static function add_field( $fields ) {
		if ( ! \is_array( $fields ) ) {
			return $fields;
		}
		$fields[ self::SETTING ] = array(
			'title'       => \__( 'Description', 'sgs-blocks' ),
			'type'        => 'text',
			'description' => \__( 'Shown under the delivery option name at checkout, for example "Dispatched within 2 working days". Leave empty to show nothing.', 'sgs-blocks' ),
			'default'     => '',
			'desc_tip'    => true,
		);
		return $fields;
	}

	/**
	 * Return the instance description for a rate that has none of its own.
	 *
	 * @param mixed $description The description WooCommerce holds.
	 * @param mixed $rate        The shipping rate.
	 * @return mixed
	 */
	public static function rate_description( $description, $rate ) {
		if ( ! $rate instanceof \WC_Shipping_Rate || '' !== (string) $description ) {
			return $description;
		}
		$method_id = (string) $rate->get_method_id();
		if ( ! \in_array( $method_id, self::METHODS, true ) || $rate->get_instance_id() <= 0 ) {
			return $description;
		}
		$settings = \get_option( 'woocommerce_' . $method_id . '_' . $rate->get_instance_id() . '_settings', array() );
		if ( ! \is_array( $settings ) || empty( $settings[ self::SETTING ] ) || ! \is_string( $settings[ self::SETTING ] ) ) {
			return $description;
		}
		return \wp_kses_post( $settings[ self::SETTING ] );
	}

	/**
	 * Give each local pickup rate its description as the `pickup_details` meta the checkout block reads.
	 *
	 * @param mixed $rates Shipping rates keyed by rate id.
	 * @return mixed
	 */
	public static function add_pickup_details( $rates ) {
		if ( ! \is_array( $rates ) ) {
			return $rates;
		}
		foreach ( $rates as $rate ) {
			if ( ! $rate instanceof \WC_Shipping_Rate || 'local_pickup' !== $rate->get_method_id() ) {
				continue;
			}
			$meta = $rate->get_meta_data();
			if ( ! empty( $meta['pickup_details'] ) ) {
				continue;
			}
			$description = (string) self::rate_description( '', $rate );
			if ( '' !== $description ) {
				$rate->add_meta_data( 'pickup_details', $description );
			}
		}
		return $rates;
	}
}
