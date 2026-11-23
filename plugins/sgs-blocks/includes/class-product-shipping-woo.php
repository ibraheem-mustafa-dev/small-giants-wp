<?php
/**
 * The shop's WooCommerce shipping settings, shaped as Google's shop-wide shipping policy.
 *
 * A site that opts in (`sgs_shipping_from_woocommerce`, Settings > SGS shop policies) publishes what its own
 * WooCommerce shipping zones and methods already say: one `ShippingService` per usable method, each with one
 * `ShippingConditions` holding the zone's destination, the method's cost and, for free shipping over a minimum,
 * the order value it starts at. Nothing is invented:
 *
 * - a method that is switched off, has a cost formula (`[qty]`, `[fee]`), needs a coupon, or is not a flat rate or
 *   free shipping (local pickup, a plugin's own method) prints nothing;
 * - a zone with no country, state or continent (a postcode-only zone) has no destination Google can read and prints
 *   nothing;
 * - the delivery time comes only from `sgs_shipping_delivery_time` (whole days: `handlingMin`, `handlingMax`,
 *   `transitMin`, `transitMax`), because WooCommerce holds none; with the option empty no time is printed.
 *
 * Costs print as set on the method: a shipping class's extra cost and the VAT on a taxable method are not added.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Shipping_Woo
 */
final class Product_Shipping_Woo {

	/**
	 * Memo of the built services for this request: the policy is asked for once per variant on a product page.
	 *
	 * @var array<int,array<string,mixed>>|null
	 */
	private static ?array $cache = null;

	/**
	 * Forget the memo (a test, or code that has just changed WooCommerce's shipping settings).
	 *
	 * @return void
	 */
	public static function reset_cache(): void {
		self::$cache = null;
	}

	/**
	 * Whether the site has chosen to publish its WooCommerce shipping settings.
	 *
	 * @return bool
	 */
	public static function enabled(): bool {
		return '' !== (string) \get_option( 'sgs_shipping_from_woocommerce', '' );
	}

	/**
	 * The `ShippingService` nodes (without `@id`) for the shop's usable methods, empty when none can be read.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function services(): array {
		if ( null !== self::$cache ) {
			return self::$cache;
		}
		self::$cache = array();
		if ( ! \class_exists( '\WC_Shipping_Zones' ) ) {
			return self::$cache;
		}

		$currency = \get_woocommerce_currency();
		$decimals = (int) \wc_get_price_decimals();
		$handling = self::period( 'handling' );
		$transit  = self::period( 'transit' );

		foreach ( (array) \WC_Shipping_Zones::get_zones() as $zone ) {
			$destinations = self::destinations( (array) ( $zone['zone_locations'] ?? array() ) );
			if ( empty( $destinations ) ) {
				continue;
			}
			foreach ( (array) ( $zone['shipping_methods'] ?? array() ) as $method ) {
				$terms = self::method_terms( $method );
				if ( null === $terms ) {
					continue;
				}
				$conditions = array(
					'@type'               => 'ShippingConditions',
					'shippingDestination' => 1 === \count( $destinations ) ? $destinations[0] : $destinations,
					'shippingRate'        => self::money( $terms['cost'], $currency, $decimals ),
				);
				if ( null !== $terms['min_order'] ) {
					$conditions['orderValue'] = array(
						'@type'    => 'MonetaryAmount',
						'minValue' => \number_format( $terms['min_order'], $decimals, '.', '' ),
						'currency' => $currency,
					);
				}
				if ( null !== $transit ) {
					$conditions['transitTime'] = $transit;
				}
				$service = array(
					'@type'              => 'ShippingService',
					'name'               => self::title( $method ),
					'shippingConditions' => $conditions,
				);
				if ( null !== $handling ) {
					$service['handlingTime'] = $handling;
				}
				self::$cache[] = $service;
			}
		}
		return self::$cache;
	}

	/**
	 * What a method charges and from what order value, or null when Google cannot be told it truthfully.
	 *
	 * @param object $method A `WC_Shipping_Method`.
	 * @return array{cost:float,min_order:?float}|null
	 */
	private static function method_terms( $method ): ?array {
		if ( 'yes' !== ( $method->enabled ?? '' ) ) {
			return null;
		}
		$id = (string) ( $method->id ?? '' );
		if ( 'flat_rate' === $id ) {
			$cost = \trim( (string) $method->get_option( 'cost', '' ) );
			return \is_numeric( $cost ) ? array(
				'cost'      => (float) $cost,
				'min_order' => null,
			) : null;
		}
		if ( 'free_shipping' === $id ) {
			$requires = (string) $method->get_option( 'requires', '' );
			$minimum  = (string) $method->get_option( 'min_amount', '' );
			if ( '' === $requires ) {
				return array(
					'cost'      => 0.0,
					'min_order' => null,
				);
			}
			if ( ( 'min_amount' === $requires || 'either' === $requires ) && \is_numeric( $minimum ) ) {
				return array(
					'cost'      => 0.0,
					'min_order' => (float) $minimum,
				);
			}
		}
		return null;
	}

	/**
	 * A method's name for shoppers: its title, else its id.
	 *
	 * @param object $method A `WC_Shipping_Method`.
	 * @return string
	 */
	private static function title( $method ): string {
		$title = \method_exists( $method, 'get_title' ) ? (string) $method->get_title() : '';
		return \trim( \sanitize_text_field( \wp_strip_all_tags( '' !== $title ? $title : (string) ( $method->id ?? '' ) ) ) );
	}

	/**
	 * A zone's locations as `DefinedRegion` nodes: a country, a state (country plus region) or a continent
	 * (every country in it). A postcode location is skipped.
	 *
	 * @param array<int,object> $locations The zone's `code` and `type` pairs.
	 * @return array<int,array<string,string>>
	 */
	private static function destinations( array $locations ): array {
		$regions = array();
		foreach ( $locations as $location ) {
			$code = (string) ( $location->code ?? '' );
			$type = (string) ( $location->type ?? '' );
			if ( 'country' === $type ) {
				$regions[] = array(
					'@type'          => 'DefinedRegion',
					'addressCountry' => $code,
				);
			} elseif ( 'state' === $type && false !== \strpos( $code, ':' ) ) {
				list( $country, $region ) = \explode( ':', $code, 2 );
				$regions[]                = array(
					'@type'          => 'DefinedRegion',
					'addressCountry' => $country,
					'addressRegion'  => $region,
				);
			} elseif ( 'continent' === $type && \function_exists( 'WC' ) && \WC()->countries ) {
				$continents = \WC()->countries->get_continents();
				foreach ( (array) ( $continents[ $code ]['countries'] ?? array() ) as $country ) {
					$regions[] = array(
						'@type'          => 'DefinedRegion',
						'addressCountry' => (string) $country,
					);
				}
			}
		}
		return $regions;
	}

	/**
	 * A money amount in the store currency.
	 *
	 * @param float  $amount   The amount.
	 * @param string $currency Currency code.
	 * @param int    $decimals Decimal places.
	 * @return array<string,string>
	 */
	private static function money( float $amount, string $currency, int $decimals ): array {
		return array(
			'@type'    => 'MonetaryAmount',
			'value'    => \number_format( $amount, $decimals, '.', '' ),
			'currency' => $currency,
		);
	}

	/**
	 * The site's `handling` or `transit` days as a `ServicePeriod`, or null when it has set none.
	 *
	 * @param string $kind `handling` or `transit`.
	 * @return array<string,mixed>|null
	 */
	private static function period( string $kind ): ?array {
		$times = \get_option( 'sgs_shipping_delivery_time', array() );
		$times = \is_array( $times ) ? $times : array();
		$min   = isset( $times[ $kind . 'Min' ] ) ? (int) $times[ $kind . 'Min' ] : null;
		$max   = isset( $times[ $kind . 'Max' ] ) ? (int) $times[ $kind . 'Max' ] : null;
		if ( null === $min && null === $max ) {
			return null;
		}
		$days = array(
			'@type'    => 'QuantitativeValue',
			'unitCode' => 'DAY',
		);
		if ( null !== $min && null !== $max && $min !== $max ) {
			$days['minValue'] = \min( $min, $max );
			$days['maxValue'] = \max( $min, $max );
		} else {
			$days['value'] = (int) ( $min ?? $max );
		}
		return array(
			'@type'    => 'ServicePeriod',
			'duration' => $days,
		);
	}
}
