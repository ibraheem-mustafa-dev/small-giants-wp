<?php
/**
 * Tests: sgs/buybox's main image claims `loading="eager"` and `fetchpriority="high"` only when it is the page's likely
 * LCP image (Spec 38A §9 LCP rule): inside the page's first top-level section, or as its own product page's buybox
 * (single-product.html prints it before the post content, where no first section is armed), and only while the
 * page-wide priority slot is free (`helpers-media.php::sgs_content_image_claims_priority`). A buybox below the first
 * section of another page loads its photo lazily at auto priority, so it takes no priority from the image above it and
 * its entrance is not held at full opacity.
 *
 * The buybox renders through the REAL render.php in the QA harness (a child process): a variable product
 * (`--product-file`) and its Product_Manifest served through `Product_Manifest::build()`'s own read-through cache
 * (`--manifest-file`, scripts/qa/lib/manifest-stub.php).
 *
 * Run with:
 *   vendor/bin/phpunit --filter BuyboxImagePriorityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class BuyboxImagePriorityTest extends TestCase {

	private const PRODUCT = array(
		'id'                  => 52,
		'name'                => 'Oak table',
		'price_html'          => '<span class="woocommerce-Price-amount amount">£120</span>',
		'price'               => '120',
		'type'                => 'variable',
		'image_id'            => 7,
		'image_url'           => 'https://example.test/oak.jpg',
		'short_description'   => 'Solid oak.',
		'in_stock'            => true,
		'variation_price_min' => '90',
		'variation_price_max' => '150',
	);

	/** A two-size manifest, as `Product_Manifest::build()` returns it. */
	private static function manifest(): array {
		$combo = static function ( int $id, int $price, int $regular, bool $stock, string $img ): array {
			return array(
				'variationId'    => $id,
				'priceMinor'     => $price,
				'regularMinor'   => $regular,
				'saleMinor'      => $price < $regular ? $price : 0,
				'pctOff'         => $price < $regular ? (int) round( ( $regular - $price ) * 100 / $regular ) : 0,
				'pctDisplay'     => '',
				'inStock'        => $stock,
				'imageUrl'       => $img,
				'hasOwnImage'    => true,
				'exMinor'        => $price,
				'taxMinor'       => 0,
				'regularExMinor' => $regular,
				'unitDivisor'    => 1,
				'unitLabel'      => '',
				'discountLabel'  => '',
				'incMinor'       => $price,
				'sku'            => 'OAK-' . $id,
				'gtin'           => '',
				'saleEndDate'    => '',
				'gallery'        => array(
					array( 'url' => $img, 'w' => 800, 'h' => 800, 'alt' => 'Oak table' ),
					array( 'url' => str_replace( '.jpg', '-2.jpg', $img ), 'w' => 800, 'h' => 800, 'alt' => 'Oak table, side' ),
				),
			);
		};
		return array(
			'decimals'       => 2,
			'currencySymbol' => '£',
			'generatedAt'    => 1767225600,
			'axes'           => array(
				array(
					'taxonomy' => 'pa_size',
					'label'    => 'Size',
					'variesBy' => 'size',
					'terms'    => array( array( 'slug' => 'small', 'label' => 'Small' ), array( 'slug' => 'large', 'label' => 'Large' ) ),
				),
			),
			'combos'         => array(
				'pa_size:small' => $combo( 61, 9000, 10000, true, 'https://example.test/oak-small.jpg' ),
				'pa_size:large' => $combo( 62, 15000, 15000, false, 'https://example.test/oak-large.jpg' ),
			),
			'defaultKey'     => 'pa_size:small',
			'defaultAxes'    => array( 'pa_size' => 'small' ),
		);
	}

	/**
	 * The real buybox's HTML, rendered by the QA harness in a child process.
	 *
	 * @param bool $first_section Whether the buybox renders inside the page's first section.
	 */
	private function buybox_html( bool $first_section, ?array $queried = null ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		$inputs  = array( 'attrs' => array( 'productId' => 52 ), 'product' => self::PRODUCT, 'manifest' => self::manifest(), 'context' => array( 'postId' => 52 ) );
		if ( null !== $queried ) {
			$inputs['queried'] = $queried;
		}
		foreach ( $inputs as $key => $value ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgsbb' );
			file_put_contents( $files[ $key ], json_encode( $value, JSON_THROW_ON_ERROR ) );
		}
		try {
			$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug sgs/buybox --motion-targets'
				. ' --attrs-file ' . escapeshellarg( $files['attrs'] )
				. ' --product-file ' . escapeshellarg( $files['product'] )
				. ' --manifest-file ' . escapeshellarg( $files['manifest'] )
				. ' --context-file ' . escapeshellarg( $files['context'] )
				. ( isset( $files['queried'] ) ? ' --queried-file ' . escapeshellarg( $files['queried'] ) : '' )
				. ( $first_section ? ' --first-section' : '' ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			array_map( 'unlink', $files );
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	private static function main_img( string $html ): string {
		return preg_match( '/<img\b[^>]*\bsgs-buybox__main-photo\b[^>]*>/s', $html, $m ) ? $m[0] : '';
	}

	public function test_a_buybox_below_the_first_section_does_not_claim_priority(): void {
		$img = self::main_img( $this->buybox_html( false ) );
		$this->assertNotSame( '', $img, 'the buybox prints its main photo on its main path' );
		$this->assertStringContainsString( 'loading="lazy"', $img );
		$this->assertStringContainsString( 'fetchpriority="auto"', $img );
		$this->assertStringNotContainsString( 'fetchpriority="high"', $img );
	}

	public function test_the_first_sections_buybox_claims_the_priority_slot(): void {
		$img = self::main_img( $this->buybox_html( true ) );
		$this->assertNotSame( '', $img, 'the buybox prints its main photo on its main path' );
		$this->assertStringContainsString( 'loading="eager"', $img );
		$this->assertStringContainsString( 'fetchpriority="high"', $img );
	}

	public function test_the_buybox_of_its_own_product_page_claims_the_priority_slot(): void {
		// single-product.html prints the buybox template part before the post content, so no first section is armed
		// there; the product page's own buybox is still the page's lead image.
		$img = self::main_img( $this->buybox_html( false, array( 'id' => 52, 'post_type' => 'product' ) ) );
		$this->assertStringContainsString( 'loading="eager"', $img );
		$this->assertStringContainsString( 'fetchpriority="high"', $img );
	}

	public function test_a_buybox_for_another_product_on_a_product_page_does_not_claim_priority(): void {
		$img = self::main_img( $this->buybox_html( false, array( 'id' => 99, 'post_type' => 'product' ) ) );
		$this->assertStringContainsString( 'loading="lazy"', $img );
		$this->assertStringNotContainsString( 'fetchpriority="high"', $img );
	}

	public function test_no_buybox_partial_hardcodes_a_high_priority_image(): void {
		$src = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/buybox/gallery-col.php' );
		$this->assertSame( 0, preg_match( '/fetchpriority="high"/', $src ), 'the main photo decides its priority per render' );
		$this->assertSame( 1, substr_count( $src, 'sgs_content_image_claims_priority(' ), 'the main photo asks the shared page-wide claim once' );
	}
}
