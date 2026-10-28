<?php
/**
 * Gift card feed items and structured data (Spec 27, FR-27-GC12).
 *
 * One feed item and one Offer per fixed amount; Product, never ProductGroup.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use SGS\Blocks\Gift_Card\Gift_Card_Csv;
use SGS\Blocks\Gift_Card\Gift_Card_Feed;
use SGS\Blocks\Gift_Card\Gift_Card_Schema;
use SGS\Blocks\Tests\Support\Gift_Card_Test_Case;

require_once __DIR__ . '/support/Gift_Card_Test_Case.php';

#[Group( 'sgs_gift_card' )]
final class GiftCardFeedSchemaTest extends Gift_Card_Test_Case {

	/** @return array<string,mixed> */
	private function product( array $override = array() ): array {
		return array_merge(
			array(
				'id'          => 321,
				'sku'         => 'GC',
				'name'        => 'Baby Shower Gift Card',
				'description' => 'A gift for a new arrival & family.',
				'permalink'   => 'https://shop.example.test/product/gift-card/',
				'image'       => 'https://shop.example.test/wp-content/uploads/gift.jpg',
				'currency'    => 'GBP',
				'amounts'     => array( 1500, 2500, 4000 ),
				'in_stock'    => true,
				'expiry_note' => 'Valid for 24 months from purchase.',
				'brand'       => 'Example Shop',
			),
			$override
		);
	}

	private function items( string $xml ): array {
		$doc = simplexml_load_string( '<root xmlns:g="http://base.google.com/ns/1.0">' . $xml . '</root>' );
		$this->assertNotFalse( $doc, 'The fragment must be well-formed XML.' );
		$out = array();
		foreach ( $doc->item as $item ) {
			$g     = $item->children( 'http://base.google.com/ns/1.0' );
			$out[] = array(
				'id'    => (string) $g->id,
				'price' => (string) $g->price,
				'title' => (string) $item->title,
				'desc'  => (string) $item->description,
				'group' => isset( $g->item_group_id ),
			);
		}
		return $out;
	}

	public function test_each_amount_is_its_own_feed_item_with_its_own_id_and_price(): void {
		$items = $this->items( Gift_Card_Feed::build_items( $this->product() ) );
		$this->assertCount( 3, $items );
		$this->assertSame( array( 'GC-1500', 'GC-2500', 'GC-4000' ), array_column( $items, 'id' ) );
		$this->assertSame( array( '15.00 GBP', '25.00 GBP', '40.00 GBP' ), array_column( $items, 'price' ) );
		$this->assertSame( 'Baby Shower Gift Card - £25.00', $items[1]['title'] );
	}

	public function test_no_feed_item_is_grouped_as_a_variant(): void {
		foreach ( $this->items( Gift_Card_Feed::build_items( $this->product() ) ) as $item ) {
			$this->assertFalse( $item['group'], 'No item_group_id: an amount is not a Google variant axis.' );
		}
		$xml = Gift_Card_Feed::build_items( $this->product() );
		$this->assertStringNotContainsString( 'variant_option', $xml );
		$this->assertStringContainsString( '<g:identifier_exists>false</g:identifier_exists>', $xml );
	}

	public function test_the_expiry_is_in_every_description_and_text_is_xml_escaped(): void {
		$items = $this->items( Gift_Card_Feed::build_items( $this->product( array( 'name' => 'Cards <b>&</b>' ) ) ) );
		foreach ( $items as $item ) {
			$this->assertStringContainsString( 'Valid for 24 months from purchase.', $item['desc'] );
			$this->assertStringContainsString( '& family', $item['desc'] );
		}
		$this->assertStringContainsString( 'Cards <b>&</b>', $items[0]['title'], 'Round-trips through the XML escaping.' );
	}

	public function test_the_id_falls_back_to_the_product_id_without_a_sku(): void {
		$items = $this->items( Gift_Card_Feed::build_items( $this->product( array( 'sku' => '' ) ) ) );
		$this->assertSame( '321-1500', $items[0]['id'] );
	}

	public function test_nothing_is_emitted_without_an_image_a_link_or_amounts(): void {
		$this->assertSame( '', Gift_Card_Feed::build_items( $this->product( array( 'image' => '' ) ) ) );
		$this->assertSame( '', Gift_Card_Feed::build_items( $this->product( array( 'permalink' => '' ) ) ) );
		$this->assertSame( '', Gift_Card_Feed::build_items( $this->product( array( 'amounts' => array() ) ) ) );
		$this->assertStringContainsString( 'out_of_stock', Gift_Card_Feed::build_items( $this->product( array( 'in_stock' => false ) ) ) );
	}

	public function test_schema_is_a_product_with_one_offer_per_amount(): void {
		$node = Gift_Card_Schema::build( $this->product() );
		$this->assertSame( 'Product', $node['@type'] );
		$this->assertCount( 3, $node['offers'] );
		$this->assertSame( array( '15.00', '25.00', '40.00' ), array_column( $node['offers'], 'price' ) );
		foreach ( $node['offers'] as $offer ) {
			$this->assertSame( 'Offer', $offer['@type'] );
			$this->assertSame( 'GBP', $offer['priceCurrency'] );
			$this->assertSame( 'https://schema.org/InStock', $offer['availability'] );
		}
	}

	public function test_schema_never_uses_product_group_or_variant_keys(): void {
		$json = (string) json_encode( Gift_Card_Schema::build( $this->product() ) );
		foreach ( array( 'ProductGroup', 'hasVariant', 'variesBy', 'productGroupID', 'AggregateOffer' ) as $banned ) {
			$this->assertStringNotContainsString( $banned, $json, $banned );
		}
		// Control: the existing variable-product emitter DOES use ProductGroup, so the assertion above can go red.
		$existing = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-product-schema.php' );
		$this->assertStringContainsString( "'ProductGroup'", $existing );
	}

	public function test_the_woocommerce_filter_replaces_offers_and_leaves_other_products_alone(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-schema.php' );
		$this->assertStringContainsString( "'woocommerce_structured_data_product'", $source );
		// A non-gift-card product object passes through untouched.
		require_once dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-product-type.php';
		$markup = array(
			'@type'  => 'Product',
			'offers' => array( 'price' => '1' ),
		);
		$plain  = new class() {
			public function get_type(): string {
				return 'simple';
			}
		};
		$this->assertSame( $markup, Gift_Card_Schema::filter_markup( $markup, $plain ) );
	}

	public function test_the_csv_never_holds_a_code_or_hash_and_neutralises_formulas(): void {
		$card = $this->issued_card(
			2500,
			array(),
			array(
				'recipient_name'  => '=HYPERLINK("http://evil")',
				'purchaser_email' => '+a@b.test',
			)
		);
		$csv  = Gift_Card_Csv::build( array( $this->store->find( $card['id'] ) ) );

		$hash = $this->store->find( $card['id'] )['code_hash'];
		$this->assertStringNotContainsString( $hash, $csv );
		$this->assertStringNotContainsString( str_replace( '-', '', $card['code'] ), $csv );
		$this->assertStringContainsString( '"\'=HYPERLINK(""http://evil"")"', $csv );
		$this->assertStringContainsString( '"\'+a@b.test"', $csv );
		$this->assertStringContainsString( '"25.00"', $csv );
	}
}
