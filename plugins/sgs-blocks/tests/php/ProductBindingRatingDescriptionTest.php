<?php
/**
 * Tests: the `sgs-product/field` binding source's `rating`, `rating_count` and long `description` keys (shop
 * investigation F-51: a product page's rating and description had no source, so every product showed the draft's
 * words). Product_Bindings::get_value runs in a child PHP process on the QA harness's WordPress and WooCommerce stubs
 * (scripts/qa/lib/wp-stubs.php, wc-product-stub.php), so its file-level state stays out of PHPUnit.
 *
 * Run with: vendor/bin/phpunit --filter ProductBindingRatingDescriptionTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ProductBindingRatingDescriptionTest extends TestCase {

	/**
	 * Resolve binding keys for one stub product.
	 *
	 * @param array $product The stub product's data (wc-product-stub.php).
	 * @param array $args    Binding args per case, keyed by a label.
	 * @return array<string, string> Value per label.
	 */
	private function resolve( array $product, array $args ): array {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgspb' );
		$data   = tempnam( sys_get_temp_dir(), 'sgspd' );
		file_put_contents( $data, json_encode( array( 'product' => $product, 'args' => $args ), JSON_THROW_ON_ERROR ) );
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", __DIR__ . "/" );'
			. 'require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. 'require ' . var_export( $root . '/scripts/qa/lib/wc-product-stub.php', true ) . ';'
			. 'require ' . var_export( $root . '/includes/class-product-bindings.php', true ) . ';'
			. '$in = json_decode( file_get_contents( $argv[1] ), true );'
			. '$GLOBALS["sgs_qa_product"] = $in["product"];'
			. '$out = array();'
			. 'foreach ( $in["args"] as $label => $a ) { $out[ $label ] = (string) \SGS\Blocks\Product_Bindings::get_value( $a + array( "product_id" => $in["product"]["id"], "source" => "wc" ), null, "content" ); }'
			. 'echo json_encode( $out );'
		);
		try {
			$raw = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' ' . escapeshellarg( $data ) . ' 2>&1' );
		} finally {
			unlink( $script );
			unlink( $data );
		}
		$out = json_decode( $raw, true );
		$this->assertIsArray( $out, 'child did not return JSON: ' . $raw );
		return $out;
	}

	public function test_rating_and_count_come_from_the_products_reviews(): void {
		$out = $this->resolve(
			array( 'id' => 52, 'name' => 'Taster Trio', 'average_rating' => '4.86', 'review_count' => 1234 ),
			array(
				'rating' => array( 'key' => 'rating' ),
				'count'  => array( 'key' => 'rating_count' ),
				'framed' => array( 'key' => 'rating_count', 'before' => '(', 'after' => ')' ),
			)
		);
		$this->assertSame( '4.9', $out['rating'] );
		$this->assertSame( '1,234', $out['count'] );
		$this->assertSame( '(1,234)', $out['framed'] );
	}

	public function test_no_reviews_is_empty_so_the_fallback_or_nothing_shows(): void {
		$out = $this->resolve(
			array( 'id' => 52, 'name' => 'Taster Trio', 'average_rating' => '0', 'review_count' => 0 ),
			array(
				'rating'   => array( 'key' => 'rating' ),
				'count'    => array( 'key' => 'rating_count' ),
				'fallback' => array( 'key' => 'rating', 'fallback' => 'No reviews yet' ),
				'title'    => array( 'key' => 'title' ),
			)
		);
		$this->assertSame( 'Taster Trio', $out['title'], 'the product resolved, so the empty values are not vacuous' );
		$this->assertSame( '', $out['rating'] );
		$this->assertSame( '', $out['count'] );
		$this->assertSame( 'No reviews yet', $out['fallback'] );
	}

	public function test_description_is_the_long_description_as_post_html(): void {
		$out = $this->resolve(
			array( 'id' => 52, 'name' => 'Taster Trio', 'description' => '<p>Three <strong>cookies</strong> &amp; a card.</p>', 'short_description' => 'Short words' ),
			array(
				'long'  => array( 'key' => 'description' ),
				'short' => array( 'key' => 'short_description' ),
			)
		);
		$this->assertSame( '<p>Three <strong>cookies</strong> &amp; a card.</p>', $out['long'] );
		$this->assertSame( 'Short words', $out['short'], 'the short description is unchanged' );
	}

	public function test_no_description_is_empty(): void {
		$out = $this->resolve( array( 'id' => 52, 'name' => 'Taster Trio' ), array( 'long' => array( 'key' => 'description' ) ) );
		$this->assertSame( '', $out['long'] );
	}

	public function test_the_description_is_filtered_as_post_html(): void {
		$src = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-product-bindings.php' );
		$this->assertStringContainsString( "case 'description':\n\t\t\t\treturn \\wp_kses_post( \$product->get_description() );", $src );
	}
}
