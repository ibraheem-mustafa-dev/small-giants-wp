<?php
/**
 * Reads a gift-card product into the plain array the feed and schema builders take
 * (Spec 27, FR-27-GC12). The only place those builders touch WooCommerce.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Product to plain data.
 */
final class Gift_Card_Catalogue {

	/**
	 * Product data for the builders.
	 *
	 * @param \WC_Product $product A gift-card product.
	 * @return array<string,mixed>
	 */
	public static function from_product( $product ): array {
		$config = $product->amounts_config();
		$image  = (string) \wp_get_attachment_image_url( (int) $product->get_image_id(), 'full' );
		$text   = \trim( \wp_strip_all_tags( (string) $product->get_short_description() ) );
		if ( '' === $text ) {
			$text = \trim( \wp_strip_all_tags( (string) $product->get_description() ) );
		}
		if ( '' === $text ) {
			$text = (string) $product->get_name();
		}

		return array(
			'id'          => (int) $product->get_id(),
			'sku'         => (string) $product->get_sku(),
			'name'        => \trim( \wp_strip_all_tags( (string) $product->get_name() ) ),
			'description' => $text,
			'permalink'   => (string) \get_permalink( $product->get_id() ),
			'image'       => \SGS\Blocks\Product_Feed_Items::same_origin_url( $image ),
			'currency'    => (string) \get_woocommerce_currency(),
			'amounts'     => $config['amounts'],
			'in_stock'    => $product->is_in_stock(),
			'expiry_note' => Gift_Card_Form_View::terms_text( Gift_Card_Services::settings() ),
			'brand'       => (string) \get_bloginfo( 'name' ),
		);
	}
}
