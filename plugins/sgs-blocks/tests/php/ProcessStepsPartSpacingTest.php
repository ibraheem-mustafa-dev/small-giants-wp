<?php
/**
 * sgs/process-steps part spacing: the number, title and description margins, the description's maximum width and the step's
 * alignment print per device on their own parts (render.php), and an untouched block prints none of them.
 *
 * Every case renders the real render.php in a child process (scripts/qa/lib/render-css-harness.php).
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ProcessStepsPartSpacingTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ProcessStepsPartSpacingTest extends TestCase {

	/**
	 * Render the block and return its scoped CSS.
	 *
	 * @param array<string,mixed> $extra Attributes added to a two-step block.
	 * @return string
	 */
	private function css( array $extra ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs   = array_merge(
			array(
				'steps' => array(
					array( 'title' => 'One', 'description' => 'First step', 'number' => '1' ),
					array( 'title' => 'Two', 'description' => 'Second step', 'number' => '2' ),
				),
			),
			$extra
		);
		$file    = (string) tempnam( sys_get_temp_dir(), 'sgsps' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/process-steps --attrs-file ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['css'];
	}

	/** Negative control: an untouched block prints none of the part rules. */
	public function test_unset_prints_nothing(): void {
		$css = $this->css( array() );
		$this->assertStringNotContainsString( '__title{margin', $css );
		$this->assertStringNotContainsString( '__description{margin', $css );
		$this->assertStringNotContainsString( 'max-width', $css );
		$this->assertStringNotContainsString( 'align-items', $css );
	}

	/** MUST FAIL on the old render.php: the part margins and the description width were not settings. */
	public function test_part_margins_and_description_width_print_on_their_parts(): void {
		$css = $this->css(
			array(
				'numberMargin'        => array( 'desktop' => array( 'bottom' => '16px' ), 'mobile' => array( 'bottom' => '0' ) ),
				'titleMargin'         => array( 'desktop' => array( 'top' => '10px', 'bottom' => '0' ) ),
				'descriptionMargin'   => array( 'desktop' => array( 'top' => '8px' ) ),
				'descriptionMaxWidth' => array( 'desktop' => '300px', 'mobile' => 'none' ),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-process-steps__number\{[^}]*margin-bottom:16px/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-process-steps__title\{[^}]*margin-top:10px[^}]*margin-bottom:0/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-process-steps__description\{[^}]*margin-top:8px/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-process-steps__description\{[^}]*max-width:300px/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{[^}]*\.sgs-process-steps__number\{[^}]*margin-bottom:0/', $css, 'the phone value prints inside the phone query' );
	}

	/** MUST FAIL on the old render.php: the step's alignment was not a setting. */
	public function test_step_alignment_prints_per_device_and_refuses_other_values(): void {
		$css = $this->css( array( 'stepAlignItems' => array( 'desktop' => 'flex-start', 'mobile' => 'stretch' ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-process-steps__step\{align-items:flex-start/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{[^}]*\.sgs-process-steps__step\{align-items:stretch/', $css );
		$bad = $this->css( array( 'stepAlignItems' => array( 'desktop' => 'baseline;color:red' ) ) );
		$this->assertStringNotContainsString( 'color:red', $bad );
		$this->assertStringNotContainsString( 'align-items', $bad );
	}
}
