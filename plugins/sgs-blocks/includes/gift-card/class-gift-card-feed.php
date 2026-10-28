<?php
/**
 * Gift card Google Merchant feed items (Spec 27, FR-27-GC12).
 *
 * Each fixed amount is its own feed product: its own `g:id`, its own title and
 * price, and NO `item_group_id`. Google's variant attributes (`variant_option`)
 * are unverified for an amount axis, and per-amount products need none. The
 * description always mentions the expiry, because Google's policy page names
 * gift cards "with an expiration date" as the allowed case.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

use SGS\Blocks\Product_Feed_Items;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/class-product-feed-items.php';

/**
 * Feed item builder and collector.
 */
final class Gift_Card_Feed {

	/** Most gift-card products placed in the feed. */
	const MAX_PRODUCTS = 50;

	/**
	 * Build the <item> fragments for one gift-card product, one per fixed amount.
	 *
	 * @param array<string,mixed> $p Product data from {@see Gift_Card_Catalogue::from_product()}: id, sku, name, description, permalink, image, currency, amounts, in_stock, expiry_note, brand.
	 * @return string
	 */
	public static function build_items( array $p ): string {
		if ( '' === (string) $p['image'] || '' === (string) $p['permalink'] ) {
			return ''; // Google requires an image and a link.
		}
		$xml = '';
		foreach ( $p['amounts'] as $pence ) {
			$pence = (int) $pence;
			$id    = ( '' !== (string) $p['sku'] ? (string) $p['sku'] : (string) $p['id'] ) . '-' . $pence;
			$desc  = \trim( (string) $p['description'] . ' ' . (string) $p['expiry_note'] );

			$xml .= "  <item>\n";
			$xml .= '    <g:id>' . Product_Feed_Items::xml_esc( $id ) . "</g:id>\n";
			$xml .= '    <title>' . Product_Feed_Items::xml_esc( $p['name'] . ' - ' . Gift_Card_Money::format( $pence ) ) . "</title>\n";
			$xml .= '    <description>' . Product_Feed_Items::xml_esc( $desc ) . "</description>\n";
			$xml .= '    <link>' . Product_Feed_Items::xml_esc( (string) $p['permalink'] ) . "</link>\n";
			$xml .= '    <g:image_link>' . Product_Feed_Items::xml_esc( (string) $p['image'] ) . "</g:image_link>\n";
			$xml .= '    <g:availability>' . ( ! empty( $p['in_stock'] ) ? 'in_stock' : 'out_of_stock' ) . "</g:availability>\n";
			$xml .= '    <g:price>' . Product_Feed_Items::xml_esc( Product_Feed_Items::format_price_field( $pence, 2, (string) $p['currency'] ) ) . "</g:price>\n";
			$xml .= "    <g:condition>new</g:condition>\n";
			$xml .= "    <g:identifier_exists>false</g:identifier_exists>\n";
			if ( '' !== (string) $p['brand'] ) {
				$xml .= '    <g:brand>' . Product_Feed_Items::xml_esc( (string) $p['brand'] ) . "</g:brand>\n";
			}
			$xml .= "  </item>\n";
		}
		return $xml;
	}

	/**
	 * Every published, catalogue-visible gift card as feed XML (empty when there are none).
	 *
	 * @return string
	 */
	public static function collect_items_xml(): string {
		if ( ! \function_exists( 'wc_get_products' ) ) {
			return '';
		}
		$ids = \wc_get_products(
			array(
				'type'       => Gift_Card_Product_Type::TYPE,
				'status'     => 'publish',
				'visibility' => 'catalog',
				'limit'      => self::MAX_PRODUCTS,
				'return'     => 'ids',
			)
		);
		$xml = '';
		foreach ( (array) $ids as $id ) {
			$post = \get_post( (int) $id );
			if ( ! $post || '' !== $post->post_password ) {
				continue;
			}
			$product = \wc_get_product( (int) $id );
			if ( $product ) {
				$xml .= self::build_items( Gift_Card_Catalogue::from_product( $product ) );
			}
		}
		return $xml;
	}
}
