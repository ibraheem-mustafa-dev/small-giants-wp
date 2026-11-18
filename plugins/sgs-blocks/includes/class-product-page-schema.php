<?php
/**
 * Product structured data on a product page, whatever block shows the product.
 *
 * The configurator head ({@see sgs_configurator_emit_head()}) printed schema only when the page's own content
 * held a bound `sgs/product-card`; a product page whose product is shown by the `sgs/buybox` block in the
 * product template has no such card, so it printed none. This emitter reads the product the page is about
 * (`is_product()`), whatever lays it out, and prints one node:
 *
 * - a gift card: `Product` with one `Offer` per amount ({@see \SGS\Blocks\Gift_Card\Gift_Card_Schema});
 * - a product with options: `ProductGroup` with a `Product` and `Offer` per option ({@see Product_Schema});
 * - a product without options: `Product` with one `Offer` ({@see Product_Schema_Simple}).
 *
 * Only a public product prints ({@see Product_Item_List::is_publicly_listable()}: published and visible in the
 * catalogue). WooCommerce prints its own `Product` markup when a classic template calls its summary hook; when
 * this prints, that copy is removed so the page carries one `Product` node.
 *
 * An SEO plugin that prints structured data ({@see Org_Website_Schema::seo_plugin_owns_schema()}) keeps the
 * plain `Product` and gift-card nodes: it prints those itself. The `ProductGroup` stays SGS's, as before, because
 * those plugins do not produce it from the manifest. The `sgs_product_page_schema` filter overrides the decision
 * for a product (return false to print nothing, true to print whatever an SEO plugin does).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-org-website-schema.php';
require_once __DIR__ . '/class-product-item-list.php';
require_once __DIR__ . '/class-product-schema.php';
require_once __DIR__ . '/class-product-schema-simple.php';

/**
 * Class Product_Page_Schema
 */
final class Product_Page_Schema {

	/**
	 * Register the `wp_head` hook, just after core and SEO-plugin head output.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_head', array( __CLASS__, 'emit' ), 11 );
	}

	/**
	 * Print the product's structured data on a product page.
	 *
	 * @return void
	 */
	public static function emit(): void {
		if ( ! \function_exists( 'is_product' ) || ! \is_product() ) {
			return;
		}
		$product_id = (int) \get_queried_object_id();
		if ( $product_id <= 0 || ! Product_Item_List::is_publicly_listable( $product_id ) ) {
			return;
		}
		$product = \wc_get_product( $product_id );
		if ( ! $product ) {
			return;
		}

		$tag = self::script_for( $product );

		/**
		 * Filters a product page's structured-data tag, or turns it off.
		 *
		 * @param string      $tag     The `<script type="application/ld+json">` tag ('' when none).
		 * @param \WC_Product $product The product.
		 */
		$tag = (string) \apply_filters( 'sgs_product_page_schema', $tag, $product );
		if ( '' === $tag ) {
			return;
		}

		// A classic template's WooCommerce copy would be a second Product node.
		if ( \function_exists( 'WC' ) && \WC()->structured_data ) {
			\remove_action( 'woocommerce_single_product_summary', array( \WC()->structured_data, 'generate_product_data' ), 60 );
		}

		echo $tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-encoded ld+json via Sgs_Schema::encode_jsonld() HEX flags, not HTML.
	}

	/**
	 * The tag for a product, before the filter.
	 *
	 * @param \WC_Product $product The product.
	 * @return string
	 */
	private static function script_for( \WC_Product $product ): string {
		$type = $product->get_type();

		if ( 'variable' === $type ) {
			return Product_Schema::build_script( $product->get_id() );
		}

		// A plain Product or a gift card: an SEO plugin that prints structured data prints these itself.
		if ( Org_Website_Schema::seo_plugin_owns_schema() ) {
			return '';
		}

		if ( \class_exists( '\SGS\Blocks\Gift_Card\Gift_Card_Product_Type' ) && Gift_Card\Gift_Card_Product_Type::is_gift_card( $product ) ) {
			$node  = Gift_Card\Gift_Card_Schema::build( Gift_Card\Gift_Card_Catalogue::from_product( $product ) );
			$brand = Product_Schema::brand_for( $product );
			if ( '' !== $brand ) {
				$node['brand'] = array(
					'@type' => 'Brand',
					'name'  => $brand,
				);
			}
			return Sgs_Schema::script_tag( $node );
		}

		return Product_Schema_Simple::build_script( $product );
	}
}
