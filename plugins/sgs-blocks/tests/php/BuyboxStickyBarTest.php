<?php
/**
 * Tests: sgs/buybox's phone add-to-basket bar (Spec 02 FR-2-3). The bar is printed only when the per-device
 * `stickyBar` attribute turns it on at some tier; it carries the live price, a variant line and an Add button, starts
 * `hidden` (sticky-bar.js reveals it), and its three colours reach the page as scoped custom properties.
 *
 * The buybox renders through the REAL render.php in the QA harness (a child process), the same way
 * BuyboxImagePriorityTest does.
 *
 * Run with:
 *   vendor/bin/phpunit --filter BuyboxStickyBarTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class BuyboxStickyBarTest extends TestCase {

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
		$combo = static function ( int $id, int $price, bool $stock, string $img ): array {
			return array(
				'variationId'    => $id,
				'priceMinor'     => $price,
				'regularMinor'   => $price,
				'saleMinor'      => 0,
				'pctOff'         => 0,
				'pctDisplay'     => '',
				'inStock'        => $stock,
				'imageUrl'       => $img,
				'hasOwnImage'    => true,
				'exMinor'        => $price,
				'taxMinor'       => 0,
				'regularExMinor' => $price,
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
				'pa_size:small' => $combo( 61, 9000, true, 'https://example.test/oak-small.jpg' ),
				'pa_size:large' => $combo( 62, 15000, false, 'https://example.test/oak-large.jpg' ),
			),
			'defaultKey'     => 'pa_size:small',
			'defaultAxes'    => array( 'pa_size' => 'small' ),
		);
	}

	/**
	 * The real buybox's HTML for the given block attributes.
	 *
	 * @param array $extra_attrs Attributes merged over `productId`.
	 */
	private function buybox_html( array $extra_attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$inputs  = array(
			'attrs'    => array_merge( array( 'productId' => 52 ), $extra_attrs ),
			'product'  => self::PRODUCT,
			'manifest' => self::manifest(),
			'context'  => array( 'postId' => 52 ),
		);
		$files   = array();
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
				. ' --context-file ' . escapeshellarg( $files['context'] ) . ' 2>&1';
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

	/** The bar element's markup, from its opening tag to the end of the buybox root's closing region. */
	private static function bar( string $html ): string {
		return preg_match( '/<div class="sgs-buybox__bar"[^>]*>.*?<\/button>\s*<\/div>/s', $html, $m ) ? $m[0] : '';
	}

	public function test_a_phone_bar_prints_the_price_the_variant_line_and_an_add_button(): void {
		$html = $this->buybox_html( array( 'stickyBar' => array( 'mobile' => 'after-button' ) ) );
		$bar  = self::bar( $html );
		$this->assertNotSame( '', $bar, 'the bar prints when a tier is on' );
		$this->assertStringContainsString( 'data-sgs-bar', $bar );
		$this->assertStringContainsString( ' hidden', $bar, 'the bar starts hidden; sticky-bar.js reveals it' );
		$this->assertStringContainsString( 'role="region"', $bar );
		$this->assertStringContainsString( 'aria-label="Quick add to basket"', $bar );
		$this->assertStringContainsString( 'data-wp-text="context.priceDisplay"', $bar );
		$this->assertStringContainsString( 'sgs-buybox__bar-variant', $bar );
		$this->assertStringContainsString( 'data-wp-bind--disabled="context.pending"', $bar );
		$this->assertStringContainsString( 'buybox__add-to-cart', $bar );
		$this->assertStringContainsString( 'data-wp-bind--hidden="!context.inStock"', $bar );
		$this->assertStringNotContainsString( 'style="', $html, 'no SGS block prints an inline style' );
	}

	public function test_the_root_carries_the_tier_map(): void {
		$html = $this->buybox_html( array( 'stickyBar' => array( 'mobile' => 'after-button' ) ) );
		$this->assertStringContainsString( 'data-sgs-bar="{&quot;d&quot;:0,&quot;t&quot;:0,&quot;m&quot;:1}"', $html );
		$both = $this->buybox_html( array( 'stickyBar' => array( 'desktop' => 'after-button', 'tablet' => 'off' ) ) );
		$this->assertStringContainsString( 'data-sgs-bar="{&quot;d&quot;:1,&quot;t&quot;:0,&quot;m&quot;:0}"', $both, 'mobile inherits the tablet tier, which is off' );
	}

	public function test_the_bar_colours_print_as_scoped_custom_properties(): void {
		$html = $this->buybox_html(
			array(
				'stickyBar'             => array( 'mobile' => 'after-button' ),
				'stickyBarBackground'   => '#112233',
				'stickyBarText'         => 'primary',
				'stickyBarBorderColour' => '#445566',
			)
		);
		$this->assertStringContainsString( '--sgs-buybox-bar-bg:#112233', $html );
		$this->assertStringContainsString( '--sgs-buybox-bar-text:var(--wp--preset--color--primary', $html );
		$this->assertStringContainsString( '--sgs-buybox-bar-border:#445566', $html );
	}

	public function test_no_bar_when_the_setting_is_unset_or_off(): void {
		foreach ( array( array(), array( 'stickyBar' => array() ), array( 'stickyBar' => array( 'desktop' => 'off', 'mobile' => 'off' ) ) ) as $attrs ) {
			$html = $this->buybox_html( $attrs );
			$this->assertStringNotContainsString( 'data-sgs-bar', $html );
			$this->assertStringNotContainsString( 'sgs-buybox__bar', $html );
			$this->assertStringNotContainsString( '--sgs-buybox-bar-', $html );
		}
	}

	public function test_colours_alone_do_not_print_a_bar(): void {
		$html = $this->buybox_html( array( 'stickyBarBackground' => '#112233' ) );
		$this->assertStringNotContainsString( 'sgs-buybox__bar', $html );
		$this->assertStringNotContainsString( '--sgs-buybox-bar-bg', $html );
	}
}
