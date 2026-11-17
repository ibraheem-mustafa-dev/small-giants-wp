<?php
/**
 * sgs/button's `add-to-basket` link source (includes/helpers-button-add-to-basket.php, src/blocks/button/render.php).
 *
 * The resolver runs in a child process with test seams for WordPress and WooCommerce, as CartDrawerExtrasTest does. The
 * render cases drive the real render.php through the QA harness, where WooCommerce is absent, which is the "product cannot be
 * resolved" path.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonAddToBasketTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonAddToBasketTest extends TestCase {

	/**
	 * Run PHP in a child process with the shared helpers loaded and return its JSON.
	 *
	 * @param string $body PHP statements ending in `echo "#JSON#" . json_encode( ... );`.
	 * @return mixed
	 */
	private function run_php( string $body ) {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsatb' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/helpers-button-add-to-basket.php', true ) . ';'
			. ' ' . $body;
		file_put_contents( $script, $code );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$start = strpos( $out, '#JSON#' );
		$this->assertNotFalse( $start, 'the child process did not return JSON: ' . $out );
		return json_decode( substr( $out, $start + 6 ), true );
	}

	/**
	 * Resolve product 42 with a stand-in WordPress and WooCommerce.
	 *
	 * @param array<string,mixed> $product  What the stand-in answers: exists, purchasable, status.
	 * @param array<string,mixed> $resolved What sgs_cart_empty_product() returns for it.
	 * @param string              $after    The after-add choice.
	 * @param bool                $basket   Whether the page is the basket page.
	 * @return array<string,mixed>|null
	 */
	private function resolve( array $product, array $resolved, string $after = 'stay', bool $basket = false ) {
		$code = 'class FakeProduct { public function is_purchasable() { return ' . var_export( (bool) $product['purchasable'], true ) . '; } }'
			. ' $deps = array('
			. ' "get_product" => static fn( $id ) => ' . ( $product['exists'] ? 'new FakeProduct()' : 'false' ) . ','
			. ' "status" => static fn( $id ) => ' . var_export( $product['status'], true ) . ','
			. ' "resolve" => static fn( $p ) => ' . var_export( $resolved, true ) . ','
			. ' "price_text" => static fn( $price ) => "£" . number_format( $price, 0 ),'
			. ' "rest_url" => static fn( $path ) => "https://example.test/wp-json/" . $path,'
			. ' "nonce" => static fn() => "nonce123",'
			. ' "basket_url" => static fn() => "https://example.test/basket/",'
			. ' "on_basket_page" => static fn() => ' . var_export( $basket, true ) . ' );'
			. ' echo "#JSON#" . json_encode( sgs_button_add_to_basket( 42, ' . var_export( $after, true ) . ', $deps ) );';
		return $this->run_php( $code );
	}

	/**
	 * What sgs_cart_empty_product() returns for a simple product.
	 *
	 * @return array<string,mixed>
	 */
	private function simple(): array {
		return array(
			'id'     => 42,
			'add_id' => 42,
			'url'    => 'https://example.test/product/trio/',
			'price'  => '5',
			'body'   => null,
		);
	}

	/**
	 * A published, purchasable stand-in product.
	 *
	 * @return array<string,mixed>
	 */
	private function ok_product(): array {
		return array(
			'exists'      => true,
			'purchasable' => true,
			'status'      => 'publish',
		);
	}

	public function test_a_simple_product_adds_in_one_tap_through_the_proxy_and_links_to_its_page(): void {
		$out = $this->resolve( $this->ok_product(), $this->simple() );
		$this->assertSame( 'https://example.test/product/trio/', $out['url'] );
		$this->assertSame( '£5', $out['price_text'] );
		$this->assertSame(
			array(
				'id'       => 42,
				'quantity' => 1,
			),
			json_decode( $out['attrs']['data-sgs-add-body'], true )
		);
		$this->assertSame( 'https://example.test/wp-json/sgs/v1/cart/add-item', $out['attrs']['data-sgs-add-url'] );
		$this->assertSame( 'nonce123', $out['attrs']['data-sgs-add-nonce'] );
		$this->assertSame( 'stay', $out['attrs']['data-sgs-add-after'] );
		$this->assertArrayNotHasKey( 'data-sgs-add-reload', $out['attrs'] );
		$this->assertArrayNotHasKey( 'data-sgs-add-basket-url', $out['attrs'] );
	}

	public function test_a_variable_product_sends_its_default_variation_and_picks(): void {
		$resolved           = $this->simple();
		$resolved['add_id'] = 77;
		$resolved['body']   = array(
			'id'        => 77,
			'quantity'  => 1,
			'variation' => array(
				array(
					'attribute' => 'pa_size',
					'value'     => 'trio',
				),
			),
			'picks'     => array(
				'flavours' => array(
					array(
						'slug'  => 'vanilla',
						'count' => 3,
					),
				),
			),
		);
		$out                = $this->resolve( $this->ok_product(), $resolved );
		$this->assertSame( $resolved['body'], json_decode( $out['attrs']['data-sgs-add-body'], true ) );
	}

	public function test_a_product_with_no_default_choice_is_only_a_link(): void {
		$resolved           = $this->simple();
		$resolved['add_id'] = 0;
		$out                = $this->resolve( $this->ok_product(), $resolved );
		$this->assertSame( 'https://example.test/product/trio/', $out['url'] );
		$this->assertSame( array(), $out['attrs'] );
	}

	public function test_a_missing_unpublished_or_unbuyable_product_resolves_to_nothing(): void {
		$this->assertNull(
			$this->resolve(
				array(
					'exists'      => false,
					'purchasable' => true,
					'status'      => 'publish',
				),
				$this->simple()
			)
		);
		$this->assertNull(
			$this->resolve(
				array(
					'exists'      => true,
					'purchasable' => true,
					'status'      => 'draft',
				),
				$this->simple()
			)
		);
		$this->assertNull(
			$this->resolve(
				array(
					'exists'      => true,
					'purchasable' => false,
					'status'      => 'publish',
				),
				$this->simple()
			)
		);
	}

	public function test_the_basket_page_reloads_and_the_basket_choice_carries_the_basket_address(): void {
		$out = $this->resolve( $this->ok_product(), $this->simple(), 'basket', true );
		$this->assertSame( '1', $out['attrs']['data-sgs-add-reload'] );
		$this->assertSame( 'basket', $out['attrs']['data-sgs-add-after'] );
		$this->assertSame( 'https://example.test/basket/', $out['attrs']['data-sgs-add-basket-url'] );
	}

	public function test_the_price_placeholder_is_replaced_or_dropped(): void {
		$this->assertSame(
			array( 'Add a Taster Trio · £5', 'Add a Taster Trio', 'Add to basket' ),
			$this->run_php(
				'echo "#JSON#" . json_encode( array( sgs_button_add_label( "Add a Taster Trio · {price}", "£5" ), sgs_button_add_label( "Add a Taster Trio · {price}", "" ), sgs_button_add_label( "Add to basket", "£5" ) ) );'
			)
		);
	}

	/**
	 * Render sgs/button through the QA harness; WooCommerce is absent there.
	 *
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return string The block's HTML.
	 */
	private function render_html( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$path    = (string) tempnam( sys_get_temp_dir(), 'sgsatb' );
		try {
			file_put_contents( $path, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/button --attrs-file ' . escapeshellarg( $path ) . ' 2>&1' );
		} finally {
			@unlink( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	public function test_a_missing_product_renders_the_typed_url_and_a_label_with_no_raw_placeholder(): void {
		$html = $this->render_html(
			array(
				'linkSource'   => 'add-to-basket',
				'addProductId' => 999999,
				'url'          => '/shop/',
				'label'        => 'Add a Taster Trio · {price}',
			)
		);
		$this->assertStringContainsString( 'href="/shop/"', $html );
		$this->assertStringContainsString( 'Add a Taster Trio', $html );
		$this->assertStringNotContainsString( '{price}', $html );
		$this->assertStringNotContainsString( 'data-sgs-add-body', $html );
		$this->assertStringNotContainsString( 'data-sgs-link-source="add-to-basket"', $html );
	}

	public function test_another_link_source_keeps_its_label_untouched(): void {
		$html = $this->render_html(
			array(
				'url'   => '/shop/',
				'label' => 'Price {price}',
			)
		);
		$this->assertStringContainsString( 'Price {price}', $html );
	}
}
