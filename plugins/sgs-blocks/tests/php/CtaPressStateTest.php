<?php
/**
 * The button-shaped CTAs of buybox, product-card and whatsapp-cta take the button presets' pressed look
 * (Spec 32 FR-32-19): `buttonPresets.{variant}.active-transform` and `active-shadow`.
 *
 * Each block prints its `:active` rule only when the preset for its style sets a press role, painted through the
 * role's own custom property; a role no preset sets prints nothing, so a pressed CTA keeps the shadow it already
 * shows. Renders the real render.php files through the QA harness with the presets supplied as global settings.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CtaPressStateTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CtaPressStateTest extends TestCase {

	private const PRODUCT = array(
		'id'                => 52,
		'name'              => 'Oak table',
		'price_html'        => '<span class="woocommerce-Price-amount amount">£120</span>',
		'price'             => '120',
		'type'              => 'variable',
		'image_id'          => 7,
		'image_url'         => 'https://example.test/oak.jpg',
		'short_description' => 'Solid oak.',
		'in_stock'          => true,
		'variation_price_min' => '90',
		'variation_price_max' => '150',
	);

	/** A one-size manifest, as `Product_Manifest::build()` returns it. */
	private static function manifest(): array {
		return array(
			'decimals'       => 2,
			'currencySymbol' => '£',
			'generatedAt'    => 1767225600,
			'axes'           => array(
				array(
					'taxonomy' => 'pa_size',
					'label'    => 'Size',
					'variesBy' => 'size',
					'terms'    => array( array( 'slug' => 'small', 'label' => 'Small' ) ),
				),
			),
			'combos'         => array(
				'pa_size:small' => array(
					'variationId'    => 61,
					'priceMinor'     => 9000,
					'regularMinor'   => 9000,
					'saleMinor'      => 0,
					'pctOff'         => 0,
					'pctDisplay'     => '',
					'inStock'        => true,
					'imageUrl'       => 'https://example.test/oak-small.jpg',
					'hasOwnImage'    => true,
					'exMinor'        => 9000,
					'taxMinor'       => 0,
					'regularExMinor' => 9000,
					'unitDivisor'    => 1,
					'unitLabel'      => '',
					'discountLabel'  => '',
					'incMinor'       => 9000,
					'sku'            => 'OAK-61',
					'gtin'           => '',
					'saleEndDate'    => '',
					'gallery'        => array( array( 'url' => 'https://example.test/oak-small.jpg', 'w' => 800, 'h' => 800, 'alt' => 'Oak table' ) ),
				),
			),
			'defaultKey'     => 'pa_size:small',
			'defaultAxes'    => array( 'pa_size' => 'small' ),
		);
	}

	private const PRESS = array(
		'active-transform' => 'translate(2px, 2px)',
		'active-shadow'    => '0 0 0 #000',
	);

	/**
	 * Render a real block with the given button presets as global settings.
	 *
	 * @param string              $slug    Block slug.
	 * @param array<string,mixed> $attrs   Block attributes.
	 * @param array<string,mixed> $presets settings.custom.buttonPresets.
	 * @param array<string,mixed> $extra   Extra harness inputs: product, context.
	 * @return string The concatenated scoped CSS.
	 */
	private function render_css( string $slug, array $attrs, array $presets, array $extra = array() ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$inputs  = array(
			'attrs'           => (object) $attrs,
			'context'         => (object) ( $extra['context'] ?? array() ),
			'global-settings' => array( 'custom' => array( 'buttonPresets' => $presets ) ),
		);
		foreach ( array( 'product', 'manifest' ) as $optional ) {
			if ( isset( $extra[ $optional ] ) ) {
				$inputs[ $optional ] = $extra[ $optional ];
			}
		}
		$paths = array();
		try {
			$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug ) . ( 'sgs/buybox' === $slug ? ' --motion-targets' : '' ); // Buybox registers its block types through the motion-targets path.
			foreach ( $inputs as $key => $data ) {
				$paths[ $key ] = (string) tempnam( sys_get_temp_dir(), 'sgscp' );
				file_put_contents( $paths[ $key ], json_encode( $data, JSON_THROW_ON_ERROR ) );
				$cmd .= ' --' . $key . '-file ' . escapeshellarg( $paths[ $key ] );
			}
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			foreach ( $paths as $path ) {
				@unlink( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			}
		}

		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['css'];
	}

	/**
	 * Every `:active` rule in the CSS as `selector => declarations`.
	 *
	 * @param string $css Scoped CSS.
	 * @return array<string,string>
	 */
	private function active_rules( string $css ): array {
		$css = preg_replace( '/@media[^{]*\{[^{}]*\{[^}]*\}\}/', '', $css ); // The reduced-motion twin is asserted on its own.
		preg_match_all( '/([^{}]*:active[^{}]*)\{([^}]*)\}/', $css, $m );
		return array_combine( array_map( 'trim', $m[1] ), $m[2] ) ?: array();
	}

	public function test_whatsapp_cta_presses_to_the_default_preset(): void {
		$css   = $this->render_css( 'sgs/whatsapp-cta', array( 'phoneNumber' => '447700900123' ), array( 'default' => self::PRESS ) );
		$rules = $this->active_rules( $css );

		$this->assertCount( 1, $rules, 'one :active rule: ' . $css );
		$selector = array_key_first( $rules );
		$this->assertMatchesRegularExpression( '/^\.sgs-wac-[0-9a-f]{8}\.sgs-wac-[0-9a-f]{8}\.sgs-whatsapp-cta__btn:active$/', $selector );
		$this->assertStringContainsString( 'transform:var(--wp--custom--button-presets--default--active-transform)', $rules[ $selector ] );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--default--active-shadow)', $rules[ $selector ] );
		$this->assertMatchesRegularExpression( '/@media\(prefers-reduced-motion:reduce\)\{[^{}]*:active\{transform:none;\}\}/', $css, 'reduced motion removes the pressed transform and keeps the shadow' );
	}

	public function test_whatsapp_cta_prints_no_active_rule_without_press_tokens(): void {
		$css = $this->render_css( 'sgs/whatsapp-cta', array( 'phoneNumber' => '447700900123' ), array( 'default' => array( 'hover-transform' => 'translateY(-3px)' ) ) );
		$this->assertSame( array(), $this->active_rules( $css ), 'negative control: no press role, no :active rule' );
	}

	public function test_buybox_add_to_cart_presses_to_its_own_style(): void {
		$extra = array(
			'product'  => self::PRODUCT,
			'manifest' => self::manifest(),
			'context'  => array( 'postId' => 52 ),
		);
		$css   = $this->render_css( 'sgs/buybox', array( 'productId' => 52, 'addToCartStyle' => 'primary' ), array( 'primary' => self::PRESS, 'default' => array( 'active-transform' => 'scale(0.9)' ) ), $extra );
		$rules = $this->active_rules( $css );

		$this->assertCount( 1, $rules, 'one :active rule: ' . $css );
		$selector = array_key_first( $rules );
		$this->assertMatchesRegularExpression( '/^\.sgs-bb-[0-9a-f]{8}\.sgs-bb-[0-9a-f]{8} \.buybox__add-to-cart:active:not\(\[disabled\]\)$/', $selector, 'a disabled button never presses' );
		$this->assertStringContainsString( 'transform:var(--wp--custom--button-presets--primary--active-transform)', $rules[ $selector ] );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--primary--active-shadow)', $rules[ $selector ] );
	}

	public function test_buybox_without_a_style_takes_the_default_preset_and_without_tokens_prints_nothing(): void {
		$extra = array(
			'product'  => self::PRODUCT,
			'manifest' => self::manifest(),
			'context'  => array( 'postId' => 52 ),
		);
		$rules = $this->active_rules( $this->render_css( 'sgs/buybox', array( 'productId' => 52 ), array( 'default' => array( 'active-transform' => 'scale(0.9)' ) ), $extra ) );
		$this->assertCount( 1, $rules );
		$this->assertStringContainsString( '--wp--custom--button-presets--default--active-transform', (string) reset( $rules ) );

		$none = $this->active_rules( $this->render_css( 'sgs/buybox', array( 'productId' => 52 ), array(), $extra ) );
		$this->assertSame( array(), $none, 'negative control: no press role, no :active rule' );
	}

	public function test_product_card_presses_each_cta_variant_to_its_own_preset(): void {
		$css   = $this->render_css(
			'sgs/product-card',
			array( 'title' => 'Frame' ),
			array(
				'primary'   => self::PRESS,
				'secondary' => array( 'active-shadow' => 'none' ),
			)
		);
		$rules = $this->active_rules( $css );

		$by_variant = array();
		foreach ( $rules as $selector => $decls ) {
			if ( preg_match( '/^\.sgs-pc-\d+\.sgs-pc-\d+ \.sgs-button--(\w+):active$/', $selector, $m ) ) {
				$by_variant[ $m[1] ] = $decls;
			}
		}
		$this->assertSame( array( 'primary', 'secondary' ), array_keys( $by_variant ), 'only variants whose preset sets a press role: ' . $css );
		$this->assertStringContainsString( 'button-presets--primary--active-transform', $by_variant['primary'] );
		$this->assertStringContainsString( 'button-presets--secondary--active-shadow', $by_variant['secondary'] );
		$this->assertStringNotContainsString( 'active-transform', $by_variant['secondary'], 'secondary sets no active-transform and the preset has no default' );
	}

	public function test_product_card_prints_no_active_rule_without_press_tokens(): void {
		$css = $this->render_css( 'sgs/product-card', array( 'title' => 'Frame' ), array( 'default' => array( 'hover-transform' => 'translateY(-3px)' ) ) );
		$this->assertSame( array(), $this->active_rules( $css ), 'negative control: no press role, no :active rule' );
	}
}
