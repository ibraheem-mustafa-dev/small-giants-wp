<?php
/**
 * Free delivery replaces the paid rate it covers (Spec 27, FR-30-26).
 *
 * WooCommerce lists a paid rate and the free-shipping rate side by side once free
 * shipping applies. This adds one setting to WooCommerce's own free-shipping
 * method instance, "Hide these rates when free shipping applies", a multi-select
 * of the zone's other rates, and removes the chosen rates in
 * `woocommerce_package_rates` only when the free rate is present. Unset (or
 * empty), WooCommerce's behaviour is unchanged. The field is saved by the
 * method's own settings form, so capability and nonce are WooCommerce's own.
 *
 * `woocommerce-shipping-rates.php` hides every paid rate whenever free shipping applies. A zone
 * whose free-shipping rate lists rates here is governed by this setting instead (`governs()`),
 * so the listed rates go and the other paid rates stay.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Setting and filter.
 */
final class Free_Shipping_Hide_Rates {

	/** Instance-setting key holding the rate instance ids to hide. */
	const SETTING = 'sgs_hide_rates';

	/**
	 * True while the zone's rates are being listed for the form.
	 *
	 * @var bool
	 */
	private static $listing = false;

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'woocommerce_shipping_instance_form_fields_free_shipping', array( __CLASS__, 'add_field' ) );
		\add_filter( 'woocommerce_package_rates', array( __CLASS__, 'filter_rates' ), 20, 1 );
	}

	/**
	 * Add the setting to the free-shipping instance form.
	 *
	 * @param mixed $fields Instance form fields.
	 * @return mixed
	 */
	public static function add_field( $fields ) {
		if ( ! \is_array( $fields ) ) {
			return $fields;
		}
		$fields[ self::SETTING ] = array(
			'title'       => \__( 'Hide these rates when free shipping applies', 'sgs-blocks' ),
			'type'        => 'multiselect',
			'class'       => 'wc-enhanced-select',
			'css'         => 'min-width:300px;',
			'description' => \__( 'The rates chosen here are removed from the list while this free-shipping rate is offered. Leave empty to list every rate.', 'sgs-blocks' ),
			'desc_tip'    => true,
			'options'     => self::zone_rate_options(),
		);
		return $fields;
	}

	/**
	 * Remove the chosen rates when a free-shipping rate is in the package.
	 *
	 * @param mixed $rates Rates keyed by rate id.
	 * @return mixed
	 */
	public static function filter_rates( $rates ) {
		$hide = self::hidden_instance_ids( $rates );
		if ( array() === $hide ) {
			return $rates;
		}
		foreach ( $rates as $rate_id => $rate ) {
			if ( $rate instanceof \WC_Shipping_Rate
				&& 'free_shipping' !== $rate->get_method_id()
				&& \in_array( (string) $rate->get_instance_id(), $hide, true ) ) {
				unset( $rates[ $rate_id ] );
			}
		}
		return $rates;
	}

	/**
	 * Whether a free-shipping rate in the package carries this setting, so that the
	 * setting (not the blanket "hide every paid rate" default in
	 * woocommerce-shipping-rates.php) decides which rates stay.
	 *
	 * @param mixed $rates Rates keyed by rate id.
	 * @return bool
	 */
	public static function governs( $rates ): bool {
		return array() !== self::hidden_instance_ids( $rates );
	}

	/**
	 * The instance ids the package's free-shipping rates ask to hide.
	 *
	 * @param mixed $rates Rates keyed by rate id.
	 * @return array<int,string>
	 */
	private static function hidden_instance_ids( $rates ): array {
		if ( ! \is_array( $rates ) ) {
			return array();
		}
		$hide = array();
		foreach ( $rates as $rate ) {
			if ( ! $rate instanceof \WC_Shipping_Rate || 'free_shipping' !== $rate->get_method_id() ) {
				continue;
			}
			$settings = \get_option( 'woocommerce_free_shipping_' . $rate->get_instance_id() . '_settings', array() );
			if ( \is_array( $settings ) && ! empty( $settings[ self::SETTING ] ) && \is_array( $settings[ self::SETTING ] ) ) {
				$hide = \array_merge( $hide, \array_map( 'strval', $settings[ self::SETTING ] ) );
			}
		}
		return $hide;
	}

	/**
	 * The zone's other rates as `instance id => label`.
	 *
	 * The zone comes from WooCommerce's own settings request (`zone_id`); outside
	 * that screen the list is empty, which only matters while rendering the form.
	 *
	 * @return array<string,string>
	 */
	private static function zone_rate_options(): array {
		// Building the list creates the zone's method instances, and each one reads its own form fields
		// through this filter again: the inner reads get no options.
		if ( self::$listing ) {
			return array();
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.NonceVerification.Missing -- read-only choice of options on WooCommerce's own shipping screen; the save is WooCommerce's nonce-checked form.
		$zone_id = isset( $_REQUEST['zone_id'] ) ? \absint( \wp_unslash( $_REQUEST['zone_id'] ) ) : 0;
		if ( $zone_id <= 0 || ! \class_exists( '\WC_Shipping_Zones' ) ) {
			return array();
		}
		self::$listing = true;
		try {
			$zone = \WC_Shipping_Zones::get_zone( $zone_id );
			if ( ! $zone instanceof \WC_Shipping_Zone ) {
				return array();
			}
			$options = array();
			foreach ( $zone->get_shipping_methods( false ) as $method ) {
				if ( 'free_shipping' === $method->id ) {
					continue;
				}
				$options[ (string) $method->get_instance_id() ] = \sprintf(
					/* translators: 1: the rate's title, 2: the shipping method's name. */
					\__( '%1$s (%2$s)', 'sgs-blocks' ),
					$method->get_title(),
					$method->get_method_title()
				);
			}
			return $options;
		} finally {
			self::$listing = false;
		}
	}
}
