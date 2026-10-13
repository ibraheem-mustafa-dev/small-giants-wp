<?php
/**
 * sgs/gallery: the image grid fills the block. The gallery's own `layout:"grid"` and `columns`
 * must never reach SGS_Container_Wrapper as the wrapper's layout mode, or the wrapper makes the
 * block root a grid and the image grid lands in its first cell (1/N of the width). The Layout
 * panel's grid settings paint the image grid.
 *
 * Also guards every other composite: a block that renders through SGS_Container_Wrapper and
 * declares a `layout` value the wrapper does not mean the same way must keep `layout` from it.
 *
 * Negative control: sgs/container with a grid layout still gets the wrapper's grid, so the
 * absence check can see one.
 *
 * Run with: vendor/bin/phpunit --filter GalleryGridWrapperTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class GalleryGridWrapperTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const WRAPPER_GRID = '/\.sgs-container-[0-9a-f]+(>\.sgs-container__inner)?\{[^}]*(display:grid|grid-template-columns)/';

	public function test_a_grid_gallery_root_is_not_a_grid(): void {
		$out = $this->render_block( 'sgs/gallery', array( 'layout' => 'grid', 'columns' => array( 'desktop' => 4, 'tablet' => 3, 'mobile' => 2 ) ) );

		$this->assertStringContainsString( 'class="sgs-gallery__grid"', $out['html'], 'positive control: the image grid rendered' );
		$this->assertStringContainsString( '--sgs-columns-desktop:4', $out['css'], 'the image grid still gets its column count' );
		$this->assertDoesNotMatchRegularExpression( self::WRAPPER_GRID, $out['css'] );
		$this->assertStringNotContainsString( 'sgs-container--grid', $out['html'] );
	}

	public function test_the_grid_settings_paint_the_image_grid(): void {
		$out = $this->render_block(
			'sgs/gallery',
			array(
				'layout'              => 'grid',
				'gridTemplateColumns' => array(
					'desktop' => '2fr 1fr',
					'mobile'  => '1fr',
				),
				'gridAutoRows'        => '200px',
				'alignItems'          => 'center',
				'justifyItems'        => 'start',
			)
		);
		$grid = '/\.sgs-gallery-[0-9a-f]+\.wp-block-sgs-gallery \.sgs-gallery__grid\{';

		$this->assertMatchesRegularExpression( $grid . 'grid-template-columns:2fr 1fr;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/max-width:767px\)\{\.sgs-gallery-[0-9a-f]+\.wp-block-sgs-gallery \.sgs-gallery__grid\{grid-template-columns:1fr;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( $grid . 'grid-auto-rows:200px;align-items:center;justify-items:start\}/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( self::WRAPPER_GRID, $out['css'] );
	}

	public function test_masonry_and_carousel_print_no_grid_settings(): void {
		foreach ( array( 'masonry', 'carousel' ) as $layout ) {
			$out = $this->render_block( 'sgs/gallery', array( 'layout' => $layout, 'gridAutoRows' => '200px' ) );
			$this->assertStringContainsString( 'sgs-gallery--' . $layout, $out['html'], "positive control: the $layout gallery rendered" );
			$this->assertStringNotContainsString( 'grid-auto-rows', $out['css'], $layout );
		}
	}

	public function test_negative_control_a_grid_container_still_gets_the_wrapper_grid(): void {
		$out = $this->render_block( 'sgs/container', array( 'layout' => 'grid', 'columns' => array( 'desktop' => 4 ) ) );
		$this->assertMatchesRegularExpression( self::WRAPPER_GRID, $out['css'] );
	}

	public function test_no_composite_hands_the_wrapper_a_layout_it_means_differently(): void {
		$wrapper_layouts = array( '', 'flex', 'stack', 'grid' );
		$root            = dirname( __DIR__, 2 ) . '/src/blocks';
		$checked         = array();
		foreach ( glob( $root . '/*/render*.php' ) as $render ) {
			$source = (string) file_get_contents( $render );
			if ( false === strpos( $source, 'SGS_Container_Wrapper::render(' ) ) {
				continue;
			}
			$block_json = dirname( $render ) . '/block.json';
			$meta       = json_decode( (string) file_get_contents( $block_json ), true );
			$layout     = $meta['attributes']['layout'] ?? null;
			$checked[]  = basename( dirname( $render ) );
			if ( null === $layout || array() === array_diff( (array) ( $layout['enum'] ?? array() ), $wrapper_layouts ) ) {
				continue;
			}
			$strips = 1 === preg_match( "/unset\\(\\s*\\\$\\w+\\[\\s*'layout'\\s*\\]/", $source ) || false !== strpos( $source, 'sgs_gallery_wrapper_attributes(' );
			$this->assertTrue( $strips, basename( dirname( $render ) ) . ' declares layout values the wrapper reads differently but hands it `layout`' );
		}
		$this->assertContains( 'gallery', $checked, 'positive control: the gallery was checked' );
		$this->assertContains( 'post-grid', $checked, 'positive control: the post grid was checked' );
	}
}
