<?php
/**
 * The shop's WooCommerce shipping settings, shaped as Google's shipping policy.
 *
 * A site that opts in (`sgs_shipping_from_woocommerce`, Settings > SGS shop policies) publishes what its own
 * WooCommerce shipping zones and methods already say. The shop-wide policy is one `ShippingService` per usable method,
 * each with one `ShippingConditions` holding the zone's destination, the method's cost and, for free shipping over a
 * minimum, the order value it starts at. Nothing is invented:
 *
 * - a method that is switched off, has a cost formula (`[qty]`, `[fee]`), needs a coupon, or is not a flat rate or
 *   free shipping (local pickup, a plugin's own method) prints nothing;
 * - a zone with no country, state or continent (a postcode-only zone) has no destination Google can read and prints
 *   nothing;
 * - the delivery time comes only from `sgs_shipping_delivery_time` (whole days: `handlingMin`, `handlingMax`,
 *   `transitMin`, `transitMax`), because WooCommerce holds none; with the option empty no time is printed.
 *
 * A flat rate's price for one product follows `WC_Shipping_Flat_Rate::calculate_shipping` for a basket holding that
 * product alone: the method's `cost` plus the product's class cost (`class_cost_<term id>`, or "No shipping class cost"
 * for a product with no class). The class cost is added only while the shop has shipping classes at all; an empty class
 * cost adds nothing; a method whose every cost field is empty is not offered for that product. The shop-wide service
 * states the price for a product with no shipping class. A product (or variation) whose class changes a flat rate's price
 * gets its own `OfferShippingDetails` ({@see self::offer_details()}), because Google ranks product-level markup above the
 * Organisation's. The VAT on a taxable method is not added.
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
	 * Memo of the zones' usable methods with their destinations for this request.
	 *
	 * @var array<int,array{destinations:array<int,array<string,string>>,method:object}>|null
	 */
	private static ?array $entries = null;

	/**
	 * Memo of the shop's shipping class terms for this request.
	 *
	 * @var array<int,object>|null
	 */
	private static ?array $classes = null;

	/**
	 * Forget the memos (a test, or code that has just changed WooCommerce's shipping settings).
	 *
	 * @return void
	 */
	public static function reset_cache(): void {
		self::$cache   = null;
		self::$entries = null;
		self::$classes = null;
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

		$currency = \get_woocommerce_currency();
		$decimals = (int) \wc_get_price_decimals();
		$handling = self::period( 'handling' );
		$transit  = self::period( 'transit' );

		foreach ( self::entries() as $entry ) {
			$terms = self::method_terms( $entry['method'] );
			if ( null === $terms ) {
				continue;
			}
			$conditions = array(
				'@type'               => 'ShippingConditions',
				'shippingDestination' => self::one_or_list( $entry['destinations'] ),
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
				'name'               => self::title( $entry['method'] ),
				'shippingConditions' => $conditions,
			);
			if ( null !== $handling ) {
				$service['handlingTime'] = $handling;
			}
			self::$cache[] = $service;
		}
		return self::$cache;
	}

	/**
	 * The `OfferShippingDetails` for one product or variation whose flat-rate prices differ from the shop-wide
	 * service's, or null when they are the same and the Offer can point at the shop-wide service.
	 *
	 * One node per method that applies to a basket holding just this product: a flat rate at the product's own price,
	 * and free shipping when it always applies or the product's price in the basket reaches its minimum. Google's
	 * offer-level shape has no order-value condition, so free shipping over a minimum prints only when this product
	 * meets it; a product below the minimum leaves the option out (a larger basket may still qualify at checkout). An
	 * empty array means the prices differ but no method can be published for the product.
	 *
	 * @param \WC_Product $product A product or variation (a variation with no class of its own reports its parent's).
	 * @return array<int,array<string,mixed>>|null
	 */
	public static function offer_details( \WC_Product $product ): ?array {
		$class_id = (int) $product->get_shipping_class_id();
		$slug     = (string) $product->get_shipping_class();
		$decimals = (int) \wc_get_price_decimals();
		$entries  = self::entries();

		if ( ! self::class_changes_rates( $entries, $class_id, $slug, $decimals ) ) {
			return null;
		}

		$currency = \get_woocommerce_currency();
		$price    = self::basket_price( $product, $decimals );
		$time     = self::delivery_time();
		$details  = array();
		foreach ( $entries as $entry ) {
			$terms = self::method_terms( $entry['method'], $class_id, $slug );
			if ( null === $terms || ( null !== $terms['min_order'] && $price < \round( $terms['min_order'], $decimals ) ) ) {
				continue;
			}
			$node = array(
				'@type'               => 'OfferShippingDetails',
				'shippingRate'        => self::money( $terms['cost'], $currency, $decimals ),
				'shippingDestination' => self::one_or_list( $entry['destinations'] ),
			);
			if ( null !== $time ) {
				$node['deliveryTime'] = $time;
			}
			$details[] = $node;
		}
		return $details;
	}

	/**
	 * Each shipping class whose flat-rate prices differ from a product with no class, for the settings preview.
	 *
	 * @return array<string,string> Class name to its prices, for example `Tracked 48 £0, Tracked 24 £5.45`.
	 */
	public static function class_differences(): array {
		$decimals = (int) \wc_get_price_decimals();
		$entries  = self::entries();
		$out      = array();
		foreach ( self::shipping_classes() as $class ) {
			$id   = (int) ( $class->term_id ?? 0 );
			$slug = (string) ( $class->slug ?? '' );
			if ( ! self::class_changes_rates( $entries, $id, $slug, $decimals ) ) {
				continue;
			}
			$prices = array();
			foreach ( $entries as $entry ) {
				$terms = 'flat_rate' === (string) ( $entry['method']->id ?? '' ) ? self::method_terms( $entry['method'], $id, $slug ) : null;
				if ( null !== $terms ) {
					$prices[] = self::title( $entry['method'] ) . ' ' . self::label_money( $terms['cost'], $decimals );
				}
			}
			$name         = \trim( \sanitize_text_field( \wp_strip_all_tags( (string) ( $class->name ?? $slug ) ) ) );
			$out[ $name ] = \implode( ', ', $prices );
		}
		return $out;
	}

	/**
	 * Whether a shipping class changes any flat rate's price (or whether it is offered) compared with no class.
	 *
	 * @param array<int,array{destinations:array<int,array<string,string>>,method:object}> $entries  The usable methods.
	 * @param int                                                                          $class_id Class term id, 0 for none.
	 * @param string                                                                       $slug     Class slug.
	 * @param int                                                                          $decimals Price decimals.
	 * @return bool
	 */
	private static function class_changes_rates( array $entries, int $class_id, string $slug, int $decimals ): bool {
		foreach ( $entries as $entry ) {
			if ( 'flat_rate' !== (string) ( $entry['method']->id ?? '' ) ) {
				continue;
			}
			$own     = self::method_terms( $entry['method'], $class_id, $slug );
			$default = self::method_terms( $entry['method'] );
			if ( ( null === $own ? null : \round( $own['cost'], $decimals ) ) !== ( null === $default ? null : \round( $default['cost'], $decimals ) ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The zones' enabled flat-rate and free-shipping methods that have a destination Google can read.
	 *
	 * @return array<int,array{destinations:array<int,array<string,string>>,method:object}>
	 */
	private static function entries(): array {
		if ( null !== self::$entries ) {
			return self::$entries;
		}
		self::$entries = array();
		if ( ! \class_exists( '\WC_Shipping_Zones' ) ) {
			return self::$entries;
		}
		foreach ( (array) \WC_Shipping_Zones::get_zones() as $zone ) {
			$destinations = self::destinations( (array) ( $zone['zone_locations'] ?? array() ) );
			if ( empty( $destinations ) ) {
				continue;
			}
			foreach ( (array) ( $zone['shipping_methods'] ?? array() ) as $method ) {
				if ( 'yes' === ( $method->enabled ?? '' ) && \in_array( (string) ( $method->id ?? '' ), array( 'flat_rate', 'free_shipping' ), true ) ) {
					self::$entries[] = array(
						'destinations' => $destinations,
						'method'       => $method,
					);
				}
			}
		}
		return self::$entries;
	}

	/**
	 * The shop's shipping class terms, empty when it has none.
	 *
	 * @return array<int,object>
	 */
	private static function shipping_classes(): array {
		if ( null === self::$classes ) {
			self::$classes = array();
			if ( \function_exists( 'WC' ) && \WC() && \method_exists( \WC(), 'shipping' ) ) {
				self::$classes = \array_values( (array) \WC()->shipping()->get_shipping_classes() );
			}
		}
		return self::$classes;
	}

	/**
	 * What a method charges for a product of the given class and from what order value, or null when Google cannot be
	 * told it truthfully or WooCommerce does not offer the method for that product.
	 *
	 * @param object $method   A `WC_Shipping_Method`.
	 * @param int    $class_id The product's shipping class term id, 0 for none.
	 * @param string $slug     The class slug.
	 * @return array{cost:float,min_order:?float}|null
	 */
	private static function method_terms( $method, int $class_id = 0, string $slug = '' ): ?array {
		if ( 'yes' !== ( $method->enabled ?? '' ) ) {
			return null;
		}
		$id = (string) ( $method->id ?? '' );
		if ( 'flat_rate' === $id ) {
			$cost = self::flat_rate_cost( $method, $class_id, $slug );
			return null === $cost ? null : array(
				'cost'      => $cost,
				'min_order' => null,
			);
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
	 * A flat rate's price for a basket holding one product, as `WC_Shipping_Flat_Rate::calculate_shipping` works it
	 * out, or null when the method is not offered for it or a cost is a formula.
	 *
	 * @param object $method   A `flat_rate` `WC_Shipping_Method`.
	 * @param int    $class_id The product's shipping class term id, 0 for none.
	 * @param string $slug     The class slug.
	 * @return float|null
	 */
	private static function flat_rate_cost( $method, int $class_id, string $slug ): ?float {
		$has_costs = false;
		$total     = 0.0;

		$base = (string) $method->get_option( 'cost', '' );
		if ( '' !== $base ) {
			$amount = self::plain_amount( $base );
			if ( null === $amount ) {
				return null;
			}
			$has_costs = true;
			$total     = $amount;
		}

		// WooCommerce adds class costs only while the shop has at least one shipping class.
		if ( array() !== self::shipping_classes() ) {
			$raw = $class_id > 0
				? (string) $method->get_option( 'class_cost_' . $class_id, $method->get_option( 'class_cost_' . $slug, '' ) )
				: (string) $method->get_option( 'no_class_cost', '' );
			if ( '' !== $raw ) {
				$class_cost = self::plain_amount( $raw );
				if ( null === $class_cost ) {
					return null;
				}
				$has_costs = true;
				// A "per order" method adds the highest class cost, never below zero; "per class" adds each.
				$total += 'order' === (string) $method->get_option( 'type', 'class' ) ? \max( 0.0, $class_cost ) : $class_cost;
			}
		}
		return $has_costs ? $total : null;
	}

	/**
	 * A cost field as a number: blank counts as zero (WooCommerce evaluates it to 0), a plain number is itself, and
	 * anything else (a formula, `[qty]`, `[fee]`) is null.
	 *
	 * @param string $value The saved field.
	 * @return float|null
	 */
	private static function plain_amount( string $value ): ?float {
		$value = \trim( $value );
		if ( '' === $value ) {
			return 0.0;
		}
		return \is_numeric( $value ) ? (float) $value : null;
	}

	/**
	 * A product's price for the free-shipping minimum: what the basket's subtotal shows, with or without VAT as the
	 * shop's basket display says.
	 *
	 * @param \WC_Product $product  The product.
	 * @param int         $decimals Price decimals.
	 * @return float
	 */
	private static function basket_price( \WC_Product $product, int $decimals ): float {
		$including = 'incl' === (string) \get_option( 'woocommerce_tax_display_cart', 'excl' );
		$price     = $including ? \wc_get_price_including_tax( $product ) : \wc_get_price_excluding_tax( $product );
		return \round( (float) $price, $decimals );
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
	 * One node, or the list when there are several.
	 *
	 * @param array<int,array<string,string>> $nodes Nodes.
	 * @return array<mixed>
	 */
	private static function one_or_list( array $nodes ): array {
		return 1 === \count( $nodes ) ? $nodes[0] : $nodes;
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
	 * An amount for the settings screen: the currency symbol and the amount, without `.00` on a whole number.
	 *
	 * @param float $amount   The amount.
	 * @param int   $decimals Decimal places.
	 * @return string
	 */
	private static function label_money( float $amount, int $decimals ): string {
		$symbol = \function_exists( 'get_woocommerce_currency_symbol' )
			? \html_entity_decode( (string) \get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' )
			: \get_woocommerce_currency() . ' ';
		$whole  = \round( $amount, $decimals ) === \round( $amount, 0 );
		$number = \number_format( $amount, $whole ? 0 : $decimals, '.', '' );
		return $symbol . $number;
	}

	/**
	 * The site's `handling` or `transit` days as a `QuantitativeValue`, or null when it has set none.
	 *
	 * @param string $kind `handling` or `transit`.
	 * @return array<string,mixed>|null
	 */
	private static function days( string $kind ): ?array {
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
		return $days;
	}

	/**
	 * The site's `handling` or `transit` days as a `ServicePeriod`, or null when it has set none.
	 *
	 * @param string $kind `handling` or `transit`.
	 * @return array<string,mixed>|null
	 */
	private static function period( string $kind ): ?array {
		$days = self::days( $kind );
		return null === $days ? null : array(
			'@type'    => 'ServicePeriod',
			'duration' => $days,
		);
	}

	/**
	 * The site's delivery time in the offer-level shape (`ShippingDeliveryTime` holding `QuantitativeValue` handling and
	 * transit times), or null when it has set none.
	 *
	 * @return array<string,mixed>|null
	 */
	private static function delivery_time(): ?array {
		$handling = self::days( 'handling' );
		$transit  = self::days( 'transit' );
		if ( null === $handling && null === $transit ) {
			return null;
		}
		$time = array( '@type' => 'ShippingDeliveryTime' );
		if ( null !== $handling ) {
			$time['handlingTime'] = $handling;
		}
		if ( null !== $transit ) {
			$time['transitTime'] = $transit;
		}
		return $time;
	}
}
