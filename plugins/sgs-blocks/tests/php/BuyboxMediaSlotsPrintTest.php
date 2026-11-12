<?php
/**
 * Tests: every setting the shared media panels offer for sgs/buybox's `main`, `thumb` and `preview` slots reaches the
 * page. The buybox prints its pictures through includes/product-card-media.php (the sgs_pcm_* helpers, which call
 * SGS_Media_Element::render), so the wiring gate follows that include; this test is the proof from the render itself:
 * each setting, set alone, changes the printed markup or CSS (a differential render against the same block without
 * it), and the changed output carries the expected declaration.
 *
 * Run with:
 *   vendor/bin/phpunit --filter BuyboxMediaSlotsPrintTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxMediaSlotsPrintTest extends TestCase {

	private const SIDES   = array( 'top' => '3px', 'right' => '3px', 'bottom' => '3px', 'left' => '3px' );
	private const CORNERS = array( 'topLeft' => '9px', 'topRight' => '9px', 'bottomRight' => '9px', 'bottomLeft' => '9px' );

	/** A photo on the block's own `previewSource`, so the preview slot has a picture to print. */
	private static function preview_source(): array {
		return array( 'desktop' => array( 'kind' => 'image', 'id' => 0, 'url' => 'https://example.test/preview.jpg', 'width' => 600, 'height' => 400 ) );
	}

	private function render( array $attrs ): string {
		return BuyboxSnapshotTest::render_fixture( 'standard', array_merge( array( 'buyboxLayout' => 'configurator', 'previewSource' => self::preview_source() ), $attrs ), null, array( 'meta' => array( '_sgs_pack_size_axis' => 'pa_size' ) ) );
	}

	/** @return array<string,array{0:array,1:string}> setting => [ attributes, a declaration the page must now carry ] */
	public static function settings(): array {
		$tier = static fn( $value ) => array( 'desktop' => $value );
		return array(
			'mainBorderWidth'        => array( array( 'mainBorderWidth' => self::SIDES ), 'border-top-width:3px' ),
			'mainBorderStyle'        => array( array( 'mainBorderWidth' => self::SIDES, 'mainBorderStyle' => 'dashed' ), 'border-style:dashed' ),
			'mainBorderColour'       => array( array( 'mainBorderWidth' => self::SIDES, 'mainBorderColour' => '#123456' ), 'border-color:#123456' ),
			'mainRadius'             => array( array( 'mainRadius' => $tier( self::CORNERS ) ), 'border-top-left-radius:9px' ),
			'mainBoxShadow'          => array( array( 'mainBoxShadow' => '0 4px 12px', 'mainBoxShadowColour' => '#654321' ), '#654321' ),
			'mainFit'                => array( array( 'mainFit' => $tier( 'contain' ) ), 'object-fit:contain' ),
			'mainShape'              => array( array( 'mainShape' => $tier( array( 'shape' => 'circle' ) ) ), 'border-radius:50%' ),
			'mainWidth'              => array( array( 'mainWidth' => $tier( '71%' ) ), '71%' ),
			'mainHeight'             => array( array( 'mainHeight' => $tier( '333px' ) ), '333px' ),
			'mainMaxWidth'           => array( array( 'mainMaxWidth' => $tier( '444px' ) ), 'max-width:444px' ),
			'mainMaxHeight'          => array( array( 'mainMaxHeight' => $tier( '455px' ) ), 'max-height:455px' ),
			'mainMinWidth'           => array( array( 'mainMinWidth' => $tier( '111px' ) ), 'min-width:111px' ),
			'mainMinHeight'          => array( array( 'mainMinHeight' => $tier( '122px' ) ), 'min-height:122px' ),
			'mainRatio'              => array( array( 'mainRatio' => $tier( '4 / 3' ) ), '4 / 3' ),
			'thumbBorderWidth'       => array( array( 'thumbBorderWidth' => self::SIDES ), 'border-top-width:3px' ),
			'thumbRadius'            => array( array( 'thumbRadius' => $tier( self::CORNERS ) ), 'border-top-left-radius:9px' ),
			'thumbFit'               => array( array( 'thumbFit' => $tier( 'contain' ) ), 'object-fit:contain' ),
			'thumbShape'             => array( array( 'thumbShape' => $tier( array( 'shape' => 'circle' ) ) ), 'border-radius:50%' ),
			'previewBorderWidth'     => array( array( 'previewBorderWidth' => self::SIDES ), 'border-top-width:3px' ),
			'previewRadius'          => array( array( 'previewRadius' => $tier( self::CORNERS ) ), 'border-top-left-radius:9px' ),
			'previewFit'             => array( array( 'previewFit' => $tier( 'contain' ) ), 'object-fit:contain' ),
			'previewShape'           => array( array( 'previewShape' => $tier( array( 'shape' => 'circle' ) ) ), 'border-radius:50%' ),
		);
	}

	/** @dataProvider settings */
	public function test_each_setting_changes_what_the_page_prints( array $attrs, string $declaration ): void {
		$off = $this->render( array() );
		$on  = $this->render( $attrs );
		$this->assertNotSame( $off, $on, 'the setting changed nothing the page prints' );
		$this->assertStringContainsString( $declaration, $on, 'the page does not carry ' . $declaration );
		$this->assertStringNotContainsString( $declaration, $off, 'the declaration is already there without the setting (weak test)' );
	}
}
