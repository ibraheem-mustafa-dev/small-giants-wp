<?php
/**
 * Tests: sgs/buybox's photo sticker, the pinned gallery column's offset, the add-to-cart shadow and the thumbnail
 * strip's list semantics. Every setting is off by default (negative controls), and the real render.php runs in the QA
 * harness child process, as BuyboxSnapshotTest does.
 *
 * Run with:
 *   vendor/bin/phpunit --filter BuyboxGallerySettingsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class BuyboxGallerySettingsTest extends TestCase {

	/** @return array{html: string, css: string} */
	private function render( array $attr_overrides = array() ): array {
		$dir     = dirname( __DIR__ ) . '/fixtures/buybox';
		$fixture = json_decode( (string) file_get_contents( $dir . '/standard.json' ), true, 512, JSON_THROW_ON_ERROR );
		$fixture['attrs'] = array_merge( $fixture['attrs'], $attr_overrides );
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		$cmd     = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/buybox --motion-targets';
		foreach ( array( 'attrs', 'product', 'manifest', 'context' ) as $key ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgsgs' );
			file_put_contents( $files[ $key ], json_encode( $fixture[ $key ] ?? new stdClass(), JSON_THROW_ON_ERROR ) );
			$cmd .= ' --' . $key . '-file ' . escapeshellarg( $files[ $key ] );
		}
		try {
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			array_map( 'unlink', $files );
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) ( $decoded['css'] ?? '' ),
		);
	}

	private function all( array $r ): string {
		return $r['html'] . $r['css'];
	}

	public function test_a_sticker_prints_inside_the_photo_box_and_hides_from_assistive_technology(): void {
		$r = $this->render( array( 'galleryStickerText' => 'baked with love' ) );
		$this->assertMatchesRegularExpression( '/<div\s+class="product-card__media"[^>]*>.*<span class="sgs-buybox__gallery-sticker sgs-buybox__gallery-sticker--bottom-right" aria-hidden="true">baked with love<\/span>\s*<\/div>/s', $r['html'] );
		$off = $this->render( array( 'galleryStickerText' => 'x', 'galleryStickerDecorative' => false ) );
		$this->assertStringNotContainsString( 'sgs-buybox__gallery-sticker--bottom-right" aria-hidden', $off['html'] );
	}

	public function test_the_sticker_settings_print_real_declarations(): void {
		$r   = $this->render(
			array(
				'galleryStickerText'            => 'baked with love',
				'galleryStickerPosition'        => 'top-left',
				'galleryStickerOffsetX'         => '10px',
				'galleryStickerOffsetY'         => '12px',
				'galleryStickerBackgroundColour' => '#EE8088',
				'galleryStickerTextColour'      => '#3A2A22',
				'galleryStickerShape'           => 'tag',
				'galleryStickerRotation'        => -4,
				'galleryStickerBorderWidth'     => array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' ),
				'galleryStickerBorderColour'    => '#3A2A22',
				'galleryStickerFontFamily'      => 'caveat',
				'galleryStickerFontSize'        => array( 'desktop' => 22 ),
			)
		);
		$css = $this->all( $r );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-sticker\{[^}]*background:#EE8088/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-sticker\{[^}]*clip-path:polygon\(0 0,100% 0,88% 50%,100% 100%,0 100%\)/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-sticker\{[^}]*transform:rotate\(-4deg\)/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-sticker\{[^}]*top:12px;left:10px/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-sticker\{[^}]*border-color:#3A2A22/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-sticker\{[^}]*font-size:22px/', $css );
	}

	public function test_negative_control_no_text_prints_no_sticker(): void {
		$r = $this->render( array( 'galleryStickerBackgroundColour' => '#EE8088', 'galleryStickerRotation' => -4 ) );
		$this->assertStringNotContainsString( 'gallery-sticker', $this->all( $r ) );
	}

	public function test_sticky_offset_also_moves_the_pinned_gallery_column(): void {
		$css = $this->all( $this->render( array( 'stickyOffset' => '16px' ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-col\{top:calc\(var\(--sgs-header-height, 0px\) \+ 16px\);\}/', $css );
	}

	public function test_negative_control_no_offset_leaves_the_gallery_column_to_the_stylesheet(): void {
		$css = $this->all( $this->render( array( 'stickyEnabled' => true ) ) );
		$this->assertStringContainsString( '.sgs-buybox__config-col{position:sticky', $css );
		$this->assertStringNotContainsString( '.sgs-buybox__gallery-col{top:', $css );
	}

	public function test_add_to_cart_shadow_prints_resting_and_hover_rules(): void {
		$css = $this->all(
			$this->render(
				array(
					'addToCartShadow'            => '4px 4px 0 0',
					'addToCartShadowColour'      => '#3A2A22',
					'addToCartShadowHover'       => '7px 7px 0 0',
					'addToCartShadowColourHover' => '#3A2A22',
				)
			)
		);
		$this->assertMatchesRegularExpression( '/\.buybox__add-to-cart\{[^}]*box-shadow:4px 4px 0px 0px #3A2A22/', $css );
		$this->assertMatchesRegularExpression( '/\.buybox__add-to-cart:not\(\[disabled\]\):hover[^{]*\{[^}]*box-shadow:7px 7px 0px 0px #3A2A22/', $css );
	}

	public function test_negative_control_no_shadow_prints_no_add_to_cart_shadow(): void {
		$css = $this->all( $this->render() );
		$this->assertDoesNotMatchRegularExpression( '/\.buybox__add-to-cart[^{]*\{[^}]*box-shadow/', $css );
	}

	public function test_thumbnail_buttons_carry_no_list_role(): void {
		$html = $this->render()['html'];
		$this->assertStringContainsString( 'sgs-buybox__gallery-thumb', $html );
		$this->assertStringNotContainsString( 'role="listitem"', $html );
		$this->assertStringNotContainsString( 'product-card__thumbs" role="list"', str_replace( "\n", ' ', $html ) );
	}
}
