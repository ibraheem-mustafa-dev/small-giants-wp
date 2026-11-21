<?php
/**
 * sgs/decorative-image: the mat (layerPadding, the shared media-padding atom) round the layer's picture.
 *
 * Run with: vendor/bin/phpunit --filter DecorativeImageLayerPaddingTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class DecorativeImageLayerPaddingTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const IMAGE = array(
		'layerSource' => array(
			'desktop' => array(
				'kind'   => 'image',
				'id'     => 0,
				'url'    => 'https://example.test/uploads/photo.jpg',
				'width'  => 600,
				'height' => 400,
			),
		),
	);

	private const MAT = array(
		'layerPadding' => array(
			'desktop' => array( 'top' => '30px', 'right' => '30px', 'bottom' => '40px', 'left' => '30px' ),
			'mobile'  => array( 'top' => '16px' ),
		),
	);

	public function test_a_picture_layer_pads_its_picture_per_device(): void {
		$css = $this->render_block( 'sgs/decorative-image', array_merge( self::IMAGE, self::MAT ) )['css'];

		$this->assertMatchesRegularExpression( '/\.sgs-di-[0-9a-f]{8}\{[^}]*padding-bottom:40px;padding-left:30px;padding-right:30px;padding-top:30px;?\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{\.sgs-di-[0-9a-f]{8}\{padding-top:16px;?\}/', $css );
	}

	public function test_a_box_layer_pads_the_picture_inside_it(): void {
		$out = $this->render_block( 'sgs/decorative-image', array_merge( self::IMAGE, self::MAT ), array(), array(), '<p>Baked to order</p>' );

		$this->assertStringContainsString( 'sgs-decorative-image--layer', $out['html'] );
		$this->assertMatchesRegularExpression( '/\.sgs-di-[0-9a-f]{8}-m\{[^}]*padding-top:30px;?\}/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-decorative-image\{[^}]*padding/', $out['css'] );
	}

	public function test_unset_prints_no_padding(): void {
		$css = $this->render_block( 'sgs/decorative-image', self::IMAGE )['css'];

		$this->assertStringNotContainsString( 'padding', $css );
	}
}
