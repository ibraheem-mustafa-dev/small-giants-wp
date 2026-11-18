<?php
/**
 * Shipping and return-policy data a shop has chosen to publish, shaped for structured data.
 *
 * Two site options hold schema.org objects verbatim:
 *
 * - `sgs_configurator_shipping`: an `OfferShippingDetails` object (array), for example
 *   `array( '@type' => 'OfferShippingDetails', 'shippingRate' => array( '@type' => 'MonetaryAmount',
 *   'value' => '3.95', 'currency' => 'GBP' ), 'shippingDestination' => array( '@type' =>
 *   'DefinedRegion', 'addressCountry' => 'GB' ), 'deliveryTime' => array( '@type' =>
 *   'ShippingDeliveryTime', 'handlingTime' => array( '@type' => 'QuantitativeValue', 'minValue' => 1,
 *   'maxValue' => 2, 'unitCode' => 'DAY' ), 'transitTime' => array( '@type' => 'QuantitativeValue',
 *   'minValue' => 3, 'maxValue' => 5, 'unitCode' => 'DAY' ) ) )`.
 * - `sgs_configurator_returns`: a `MerchantReturnPolicy` object (array), for example
 *   `array( '@type' => 'MerchantReturnPolicy', 'applicableCountry' => 'GB', 'returnPolicyCategory' =>
 *   'https://schema.org/MerchantReturnFiniteReturnWindow', 'merchantReturnDays' => 14, 'returnMethod' =>
 *   'https://schema.org/ReturnByMail', 'returnFees' => 'https://schema.org/ReturnFeesCustomerResponsibility' )`.
 *   `returnPolicyCountry` is added at print time from WooCommerce's base country.
 *
 * Nothing is printed for an option that is empty or not an array: a value is never invented. Google reads
 * both on an `Offer` (merchant listings) and on the `Organization` (the shop-wide default), so
 * the product emitters add {@see self::offer_fields()} to every `Offer` and the Organisation emitter uses
 * {@see self::returns()} and {@see self::shipping()}.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Offer_Policy
 */
final class Product_Offer_Policy {

	/**
	 * The shipping details, or null when the shop has set none.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function shipping(): ?array {
		$shipping = \get_option( 'sgs_configurator_shipping' );
		if ( ! \is_array( $shipping ) || empty( $shipping ) ) {
			return null;
		}
		// A list of several shipping objects prints as it is; one object gets its type when the option left it out.
		return self::is_list( $shipping ) ? $shipping : $shipping + array( '@type' => 'OfferShippingDetails' );
	}

	/**
	 * The return policy with `returnPolicyCountry` from the store's base country, or null when none is set.
	 *
	 * The country key is left out when the store country is absent or malformed, never printed empty.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function returns(): ?array {
		$returns = \get_option( 'sgs_configurator_returns' );
		if ( ! \is_array( $returns ) || empty( $returns ) ) {
			return null;
		}
		if ( self::is_list( $returns ) ) {
			return $returns; // Several policies print as stored.
		}
		$returns += array( '@type' => 'MerchantReturnPolicy' );
		$raw_cc   = (string) \get_option( 'woocommerce_default_country', '' );
		$cc       = \strtoupper( (string) \strtok( $raw_cc, ':' ) ); // 'GB:ENG' becomes 'GB'; '' stays ''.
		if ( \preg_match( '/^[A-Z]{2}$/', $cc ) ) {
			$returns['returnPolicyCountry'] = $cc; // Print-time only, never written back.
		}
		return $returns;
	}

	/**
	 * The shipping details as the Organisation's `hasShippingService` (a `ShippingService`), or null when none is set.
	 *
	 * Google's shop-wide shipping policy is a `ShippingService` holding `ShippingConditions`, not an
	 * `OfferShippingDetails`; the rate, destination, handling time and transit time carry across.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function shipping_service(): ?array {
		$shipping = self::shipping();
		if ( null === $shipping ) {
			return null;
		}
		$objects  = self::is_list( $shipping ) ? $shipping : array( $shipping );
		$services = array();
		foreach ( $objects as $details ) {
			if ( ! \is_array( $details ) ) {
				continue;
			}
			$conditions = array( '@type' => 'ShippingConditions' );
			foreach ( array( 'shippingRate', 'shippingDestination' ) as $key ) {
				if ( ! empty( $details[ $key ] ) ) {
					$conditions[ $key ] = $details[ $key ];
				}
			}
			$delivery = isset( $details['deliveryTime'] ) && \is_array( $details['deliveryTime'] ) ? $details['deliveryTime'] : array();
			foreach ( array( 'handlingTime', 'transitTime' ) as $key ) {
				if ( ! empty( $delivery[ $key ] ) ) {
					$conditions[ $key ] = $delivery[ $key ];
				}
			}
			$services[] = array(
				'@type'              => 'ShippingService',
				'shippingConditions' => $conditions,
			);
		}
		if ( empty( $services ) ) {
			return null;
		}
		return 1 === \count( $services ) ? $services[0] : $services;
	}

	/**
	 * The fields to add to an `Offer`: `shippingDetails` and `hasMerchantReturnPolicy`, each only when set.
	 *
	 * @return array<string,mixed>
	 */
	public static function offer_fields(): array {
		$fields   = array();
		$shipping = self::shipping();
		if ( null !== $shipping ) {
			$fields['shippingDetails'] = $shipping;
		}
		$returns = self::returns();
		if ( null !== $returns ) {
			$fields['hasMerchantReturnPolicy'] = $returns;
		}
		return $fields;
	}

	/**
	 * Whether an array is a list (keys 0, 1, 2 ...), as against one object.
	 *
	 * @param array<mixed> $value Value to test.
	 * @return bool
	 */
	private static function is_list( array $value ): bool {
		return \array_keys( $value ) === \range( 0, \count( $value ) - 1 );
	}
}
