<?php
/**
 * The nav drawer's top-row bottom border (`chromeRowBorder`): width, style and colour per device, a member a device
 * leaves empty taking the device above's, and nothing printed when the attribute is unset.
 *
 * Renders the real src/blocks/nav-drawer/render.php through the QA harness.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter NavDrawerChromeRowBorderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class NavDrawerChromeRowBorderTest extends TestCase {

	/**
	 * The drawer's rendered CSS for these attributes.
	 *
	 * @param array<string, mixed> $attrs Extra attributes.
	 */
	private function css( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsnd' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/nav-drawer --attrs-file ' . escapeshellarg( $file )
				. ' --context-file ' . escapeshellarg( $file ) . ' --global-settings-file ' . escapeshellarg( $file ) . ' 2>&1'
			);
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$start   = strpos( $out, '{"ok"' ); // The render may print PHP warnings ahead of the JSON.
		$decoded = json_decode( false === $start ? $out : substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed' );
		return (string) $decoded['css'];
	}

	public function test_a_border_prints_per_device_declarations_on_the_chrome_row(): void {
		$css = $this->css(
			array(
				'chromeRowBorder' => array(
					'desktop' => array( 'width' => '1px', 'style' => 'solid', 'colour' => '#eadbc0' ),
					'mobile'  => array( 'width' => '2px', 'style' => 'dashed' ),
				),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-nav-drawer__chrome\{[^}]*border-bottom-width:1px;border-bottom-style:solid;border-bottom-color:#eadbc0;[^}]*\}/', $css, 'desktop declarations' );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{\.[^{]*\.sgs-nav-drawer__chrome\{border-bottom-width:2px;border-bottom-style:dashed;\}\}/', $css, 'mobile overrides only the members it sets' );
		$this->assertStringNotContainsString( 'border-bottom-color:#eadbc0;}}', $css, 'the unset mobile colour inherits, never re-printed' );
	}

	public function test_a_palette_slug_colour_resolves_and_an_invalid_style_prints_nothing(): void {
		$css = $this->css( array( 'chromeRowBorder' => array( 'desktop' => array( 'width' => '1px', 'style' => 'wavy', 'colour' => 'primary' ) ) ) );
		$this->assertStringContainsString( 'border-bottom-color:var(--wp--preset--color--primary', $css );
		$this->assertStringNotContainsString( 'border-bottom-style', $css );
	}

	public function test_no_border_prints_no_border_bottom_declaration(): void {
		$this->assertStringNotContainsString( 'border-bottom', $this->css( array() ), 'control: unset prints nothing' );
		$this->assertStringNotContainsString( 'border-bottom', $this->css( array( 'chromeRowBorder' => array() ) ), 'control: an empty object prints nothing' );
	}
}
