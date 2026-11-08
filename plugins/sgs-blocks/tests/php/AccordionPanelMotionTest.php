<?php
/**
 * The accordion's own open and close slide: panelDuration and panelEasing print a scoped `::details-content`
 * transition, and print nothing while unset.
 *
 * Run with: vendor/bin/phpunit --filter AccordionPanelMotionTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class AccordionPanelMotionTest extends TestCase {

	/**
	 * Render the accordion through the CSS harness.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string Rendered HTML and CSS.
	 */
	private function render_accordion( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f = tempnam( sys_get_temp_dir(), 'sgsac' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( 'sgs/accordion' )
				. ' --attrs-file ' . escapeshellarg( $attrs_f ) . ' 2>&1'
			);
		} finally {
			@unlink( $attrs_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'] . (string) $decoded['css'];
	}

	public function test_unset_prints_no_panel_transition(): void {
		$this->assertStringNotContainsString( '::details-content', $this->render_accordion( array() ) );
	}

	public function test_duration_and_named_curve_print_the_transition(): void {
		$html = $this->render_accordion( array( 'panelDuration' => 420, 'panelEasing' => 'standard' ) );
		$this->assertStringContainsString( '::details-content{transition:block-size 420ms cubic-bezier(0.4, 0, 0.2, 1),content-visibility 420ms allow-discrete;}', $html );
	}

	public function test_custom_curve_keeps_the_token_speed(): void {
		$html = $this->render_accordion( array( 'panelEasing' => 'custom', 'panelEasingCustom' => 'cubic-bezier(0.1, 0.2, 0.3, 0.4)' ) );
		$this->assertStringContainsString( 'block-size var(--wp--custom--duration--medium, 300ms) cubic-bezier(0.1, 0.2, 0.3, 0.4)', $html );
	}

	public function test_invalid_custom_curve_prints_nothing(): void {
		$html = $this->render_accordion( array( 'panelEasing' => 'custom', 'panelEasingCustom' => 'evil;}' ) );
		$this->assertStringNotContainsString( '::details-content', $html );
		$this->assertStringNotContainsString( 'evil', $html );
	}
}
