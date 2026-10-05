<?php
/**
 * SVG background "Minimum height" (bgSvgMinHeight) reaches its consumer.
 *
 * SGS_Container_Wrapper sets --sgs-svg-min-height and the
 * `sgs-container--has-svg-min-height` modifier that container/style.css's
 * min-height rule reads; an unsafe value never reaches the stylesheet.
 *
 * Run with: vendor/bin/phpunit --filter ContainerSvgMinHeightTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerSvgMinHeightTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const SVG = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

	public function test_min_height_sets_the_variable_and_the_consumer_modifier(): void {
		$out = $this->render_block( 'sgs/container', array( 'bgSvgContent' => self::SVG, 'bgSvgMinHeight' => '400px' ) );

		$this->assertStringContainsString( '--sgs-svg-min-height:400px', $out['css'] );
		$this->assertStringContainsString( 'sgs-container--has-svg-min-height', $out['html'] );

		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/container/style.css' );
		$this->assertMatchesRegularExpression( '/\.sgs-container--has-svg-min-height\s*\{\s*min-height:\s*var\(\s*--sgs-svg-min-height\s*\)/', $css );
	}

	public function test_no_min_height_means_no_modifier(): void {
		$out = $this->render_block( 'sgs/container', array( 'bgSvgContent' => self::SVG ) );

		$this->assertStringNotContainsString( 'sgs-container--has-svg-min-height', $out['html'] );
		$this->assertStringNotContainsString( '--sgs-svg-min-height', $out['css'] );
	}

	public function test_an_unsafe_value_is_dropped(): void {
		$out = $this->render_block( 'sgs/container', array( 'bgSvgContent' => self::SVG, 'bgSvgMinHeight' => '1px}body{color:red' ) );

		$this->assertStringNotContainsString( 'body{color:red', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-container--has-svg-min-height', $out['html'] );
	}
}
