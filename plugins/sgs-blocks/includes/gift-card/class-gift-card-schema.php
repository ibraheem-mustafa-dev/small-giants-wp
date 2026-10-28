<?php
/**
 * Gift card structured data (Spec 27, FR-27-GC12).
 *
 * `Product` with one `Offer` per fixed amount, never `ProductGroup`: Google's
 * product-variants page lists six `variesBy` values and none is an amount.
 * WooCommerce prints its own `Product` JSON-LD for every product; this replaces
 * its `offers` through the `woocommerce_structured_data_product` filter, so the
 * page carries exactly one `Product` node and no duplicate.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * JSON-LD builder and WooCommerce filter.
 */
final class Gift_Card_Schema {

	/**
	 * Wire the WooCommerce structured-data filter.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'woocommerce_structured_data_product', array( __CLASS__, 'filter_markup' ), 20, 2 );
	}

	/**
	 * Replace WooCommerce's offers for a gift card.
	 *
	 * @param array<string,mixed> $markup  WooCommerce's Product markup.
	 * @param \WC_Product         $product The product.
	 * @return array<string,mixed>
	 */
	public static function filter_markup( $markup, $product ): array {
		$markup = (array) $markup;
		if ( ! Gift_Card_Product_Type::is_gift_card( $product ) ) {
			return $markup;
		}
		$node = self::build( Gift_Card_Catalogue::from_product( $product ) );
		return \array_merge(
			$markup,
			array(
				'@type'  => $node['@type'],
				'offers' => $node['offers'],
			)
		);
	}

	/**
	 * Build the Product node.
	 *
	 * @param array<string,mixed> $p Product data from {@see Gift_Card_Catalogue::from_product()}.
	 * @return array<string,mixed>
	 */
	public static function build( array $p ): array {
		$offers = array();
		foreach ( $p['amounts'] as $pence ) {
			$offers[] = array(
				'@type'         => 'Offer',
				'name'          => Gift_Card_Money::format( (int) $pence ) . ' gift card',
				'price'         => Gift_Card_Money::decimal( (int) $pence ),
				'priceCurrency' => (string) $p['currency'],
				'availability'  => ! empty( $p['in_stock'] ) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
				'url'           => (string) $p['permalink'],
				'itemCondition' => 'https://schema.org/NewCondition',
			);
		}

		$node = array(
			'@context'    => 'https://schema.org',
			'@type'       => 'Product',
			'name'        => (string) $p['name'],
			'description' => (string) $p['description'],
			'url'         => (string) $p['permalink'],
			'offers'      => $offers,
		);
		if ( '' !== (string) $p['image'] ) {
			$node['image'] = (string) $p['image'];
		}
		if ( '' !== (string) $p['sku'] ) {
			$node['sku'] = (string) $p['sku'];
		}
		return $node;
	}
}
