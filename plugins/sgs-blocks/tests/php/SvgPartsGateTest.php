<?php
/**
 * Tests: an inline SVG whose parts have an entrance is hidden before first paint under the ready gate.
 *
 * `sgs_svg_parts_data()` marks a document with an entrance (`"gate":true`) and `sgs_svg_parts_hide_css()` is the
 * pre-arm rule that marker feeds; a hover-only or loop-only document, and a drawer logo that replays on every open,
 * carry no marker.
 *
 * Run with: vendor/bin/phpunit --filter SvgPartsGateTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class SvgPartsGateTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		foreach ( array(
			'wp_strip_all_tags'         => 'function wp_strip_all_tags( $s ) { return strip_tags( (string) $s ); }',
			'wp_json_encode'            => 'function wp_json_encode( $v ) { return json_encode( $v ); }',
			'sgs_colour_value'          => 'function sgs_colour_value( $v ) { return (string) $v; }',
			'sgs_motion_easing_values'  => 'function sgs_motion_easing_values() { return array( "ease", "custom" ); }',
		) as $name => $code ) {
			if ( ! function_exists( $name ) ) {
				eval( $code );
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-svg-parts.php';
	}

	private function decode( string $json ): array {
		$this->assertNotSame( '', $json );
		return json_decode( $json, true );
	}

	public function test_an_entrance_document_is_gated_and_the_rule_reads_the_marker(): void {
		$json = sgs_svg_parts_data( array( array( 'target' => 'mark', 'fromOpacity' => 0 ) ), 'visible' );
		$this->assertTrue( $this->decode( $json )['gate'] );
		$this->assertStringContainsString( '"gate":true', $json );

		$css = sgs_svg_parts_hide_css();
		$this->assertStringContainsString( 'html.sgs-motion-ready', $css );
		$this->assertStringContainsString( '[data-sgs-svg-parts*=\'"gate":true\']', $css );
		$this->assertStringContainsString( ':not([data-sgs-svg-armed])', $css );
		$this->assertStringContainsString( 'visibility:hidden', $css );
		$this->assertStringContainsString( ':not(.sgs-svg-parts-released)', $css );
		// a booted logo stays held after the page-load release until its entrance plays (below the fold too)
		$this->assertStringContainsString( 'html.sgs-motion-ready [data-sgs-svg-parts-booted]', $css );
	}

	public function test_a_draw_or_load_entrance_is_gated(): void {
		$this->assertTrue( $this->decode( sgs_svg_parts_data( array( array( 'target' => 'a', 'draw' => true ) ), 'load' ) )['gate'] );
	}

	public function test_hover_only_and_loop_only_documents_are_not_gated(): void {
		$hover = sgs_svg_parts_data( array( array( 'target' => 'a', 'hoverScale' => 1.2 ) ), 'visible' );
		$loop  = sgs_svg_parts_data( array( array( 'target' => 'a', 'loopRotate' => 360 ) ), 'visible' );
		$this->assertFalse( $this->decode( $hover )['gate'] );
		$this->assertStringNotContainsString( '"gate":true', $hover );
		$this->assertFalse( $this->decode( $loop )['gate'] );
	}

	public function test_a_replay_on_every_open_is_not_gated(): void {
		$json = sgs_svg_parts_data( array( array( 'target' => 'a', 'fromOpacity' => 0 ) ), 'every-visible' );
		$this->assertFalse( $this->decode( $json )['gate'] );
	}
}
