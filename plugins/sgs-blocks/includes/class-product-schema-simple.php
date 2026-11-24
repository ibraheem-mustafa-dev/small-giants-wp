<?php
/**
 * `Product` JSON-LD for a product that has no options (a WooCommerce "simple" product).
 *
 * {@see Product_Schema} covers a product with options (`ProductGroup`, read from the manifest). A
 * product with nothing to choose has no manifest, so this builds a single `Product` with one `Offer`:
 * `name`, `url`, `description`, `image`, `brand`, `sku`, a GTIN only when one is set (otherwise the
 * SKU as `mpn`), and an `Offer` with `price`, `priceCurrency`, `availability`, `url`, `itemCondition`,
 * `priceValidUntil` (only for a scheduled sale end), plus the shipping and return data the shop has set
 * ({@see Product_Offer_Policy}). Nothing is invented: a field with no value is left out.
 *
 * The price is the VAT-inclusive price, `wc_get_price_including_tax()`, the same function the manifest
 * uses for a variation's `incMinor` and the llms.txt product list uses for a simple product, so the
 * marked-up price is the price the basket charges whatever the shop's tax-display setting.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-schema.php';
require_once __DIR__ . '/class-product-schema.php';
require_once __DIR__ . '/class-product-offer-policy.php';
require_once __DIR__ . '/class-product-reviews.php';

/**
 * Class Product_Schema_Simple
 */
final class Product_Schema_Simple {

	/**
	 * GTIN lengths and their schema.org property.
	 *
	 * @var array<int,string>
	 */
	private const GTIN_LENGTHS = array(
		8  => 'gtin8',
		12 => 'gtin12',
		13 => 'gtin13',
		14 => 'gtin14',
	);

	/**
	 * Build the `<script type="application/ld+json">` tag for a simple product, or '' when it cannot be built.
	 *
	 * @param \WC_Product $product A product of type `simple`.
	 * @return string
	 */
	public static function build_script( \WC_Product $product ): string {
		$node = self::build_node( $product );
		return null === $node ? '' : Sgs_Schema::script_tag( $node );
	}

	/**
	 * Build the `Product` node, or null for a product that is not simple, not for sale at a price, or not public.
	 *
	 * @param \WC_Product $product The product.
	 * @return array<string,mixed>|null
	 */
	public static function build_node( \WC_Product $product ): ?array {
		if ( 'simple' !== $product->get_type() || '' === (string) $product->get_price() ) {
			return null;
		}

		$permalink = \esc_url_raw( (string) \get_permalink( $product->get_id() ) );
		$node      = array(
			'@context' => 'https://schema.org',
			'@type'    => 'Product',
			'@id'      => $permalink . '#product',
			'name'     => Product_Schema::text( $product->get_name() ),
			'url'      => $permalink,
		);

		$description = Product_Schema::description_for( $product );
		if ( '' !== $description ) {
			$node['description'] = $description;
		}

		$image = Product_Schema::image_url_for( $product );
		if ( '' !== $image ) {
			$node['image'] = $image;
		}

		$brand = Product_Schema::brand_for( $product );
		if ( '' !== $brand ) {
			$node['brand'] = array(
				'@type' => 'Brand',
				'name'  => $brand,
			);
		}

		$sku = Product_Schema::text( $product->get_sku() );
		if ( '' !== $sku ) {
			$node['sku'] = $sku;
		}
		$gtin = \method_exists( $product, 'get_global_unique_id' )
			? (string) \preg_replace( '/\D/', '', (string) $product->get_global_unique_id() )
			: '';
		if ( '' !== $gtin && isset( self::GTIN_LENGTHS[ \strlen( $gtin ) ] ) ) {
			$node[ self::GTIN_LENGTHS[ \strlen( $gtin ) ] ] = $gtin;
		} elseif ( '' !== $sku ) {
			$node['mpn'] = $sku;
		}

		$node['offers'] = self::offer( $product, $permalink );

		// aggregateRating and review: the product's own approved reviews only, none when it has none.
		$node += Product_Reviews::fields( $product );

		return $node;
	}

	/**
	 * The `Offer` for the product at its VAT-inclusive price.
	 *
	 * @param \WC_Product $product   The product.
	 * @param string      $permalink Product URL.
	 * @return array<string,mixed>
	 */
	private static function offer( \WC_Product $product, string $permalink ): array {
		$offer = array(
			'@type'         => 'Offer',
			'price'         => \number_format( (float) \wc_get_price_including_tax( $product ), (int) \wc_get_price_decimals(), '.', '' ),
			'priceCurrency' => \get_woocommerce_currency(),
			'availability'  => self::availability( $product ),
			'url'           => $permalink,
			'itemCondition' => 'https://schema.org/NewCondition',
		);

		// A scheduled sale end only: never a made-up rolling date.
		$sale_end = $product->is_on_sale() ? $product->get_date_on_sale_to() : null;
		if ( $sale_end ) {
			$offer['priceValidUntil'] = $sale_end->date( 'Y-m-d' );
		}

		return $offer + Product_Offer_Policy::offer_fields( $product );
	}

	/**
	 * The schema.org availability URL for the product's stock status.
	 *
	 * @param \WC_Product $product The product.
	 * @return string
	 */
	private static function availability( \WC_Product $product ): string {
		switch ( $product->get_stock_status() ) {
			case 'instock':
				return 'https://schema.org/InStock';
			case 'onbackorder':
				return 'https://schema.org/BackOrder';
			default:
				return 'https://schema.org/OutOfStock';
		}
	}
}
