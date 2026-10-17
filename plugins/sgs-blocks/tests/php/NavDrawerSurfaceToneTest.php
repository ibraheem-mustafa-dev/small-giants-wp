<?php
/**
 * Tests: the nav drawer panel carries the tone class (`sgs-on-dark` / `sgs-on-light`) its ACTUAL background earns.
 *
 * The focus system (theme/sgs-theme/assets/css/focus.css) hands a dark ground the light ring tokens through
 * `.sgs-on-dark`, so a drawer whose background is a palette slug must still be judged: the class follows the
 * resolved colour, a gradient painted over it, and the panel's own opacity, never a hardcoded tone.
 *
 * Renders the real src/blocks/nav-drawer/render.php through the QA harness with a stubbed palette
 * (--global-settings-file), the way wp_get_global_settings() returns it on a site.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class NavDrawerSurfaceToneTest extends TestCase {

	/**
	 * Render the drawer and return the class tokens of its dialog.
	 *
	 * @param array<string, mixed> $attrs Extra drawer attributes.
	 * @return string[]
	 */
	private function dialog_classes( array $attrs ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array(
			'attrs'    => array( (object) ( $attrs + array( 'drawerAlign' => 'left', 'submenuModel' => 'accordion' ) ) ),
			'context'  => array( (object) array() ),
			'settings' => array(
				(object) array(
					'color' => (object) array(
						'palette' => (object) array(
							'theme' => array(
								(object) array( 'slug' => 'surface', 'color' => '#fbf3dc' ),
								(object) array( 'slug' => 'midnight', 'color' => '#1b1828' ),
							),
						),
					),
				),
			),
		);
		$paths = array();
		try {
			foreach ( $files as $key => $payload ) {
				$paths[ $key ] = (string) tempnam( sys_get_temp_dir(), 'sgsnd' );
				file_put_contents( $paths[ $key ], json_encode( $payload[0], JSON_THROW_ON_ERROR ) );
			}
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/nav-drawer'
				. ' --attrs-file ' . escapeshellarg( $paths['attrs'] )
				. ' --context-file ' . escapeshellarg( $paths['context'] )
				. ' --global-settings-file ' . escapeshellarg( $paths['settings'] ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			foreach ( $paths as $path ) {
				@unlink( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			}
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		$this->assertSame( 1, preg_match( '/<dialog\b[^>]*\bclass="([^"]*)"/', (string) $decoded['html'], $m ), 'the drawer dialog renders' );

		return preg_split( '/\s+/', trim( $m[1] ) ) ?: array();
	}

	public function test_a_light_palette_slug_marks_the_drawer_on_light(): void {
		$classes = $this->dialog_classes( array( 'drawerBg' => 'surface' ) );
		$this->assertContains( 'sgs-on-light', $classes );
		$this->assertNotContains( 'sgs-on-dark', $classes );
	}

	public function test_the_default_background_is_judged_not_skipped(): void {
		$classes = $this->dialog_classes( array() );
		$this->assertContains( 'sgs-on-light', $classes, 'an untouched drawer paints the surface token, so it is judged light' );
	}

	public function test_a_dark_palette_slug_marks_the_drawer_on_dark(): void {
		$classes = $this->dialog_classes( array( 'drawerBg' => 'midnight' ) );
		$this->assertContains( 'sgs-on-dark', $classes );
		$this->assertNotContains( 'sgs-on-light', $classes );
	}

	public function test_a_dark_hex_marks_the_drawer_on_dark(): void {
		$this->assertContains( 'sgs-on-dark', $this->dialog_classes( array( 'drawerBg' => '#1b1828' ) ) );
	}

	public function test_a_dark_gradient_over_a_light_colour_follows_the_gradient(): void {
		$classes = $this->dialog_classes(
			array(
				'drawerBg'         => 'surface',
				'drawerBgGradient' => 'linear-gradient(135deg, #1b1828 0%, #2a2540 100%)',
			)
		);
		$this->assertContains( 'sgs-on-dark', $classes, 'the gradient paints over the colour, so it decides' );
		$this->assertNotContains( 'sgs-on-light', $classes );
	}

	public function test_a_mostly_transparent_dark_panel_is_not_marked_dark(): void {
		$classes = $this->dialog_classes( array( 'drawerBg' => 'midnight', 'surfaceOpacity' => 0.2 ) );
		$this->assertNotContains( 'sgs-on-dark', $classes, 'a 20% fill does not decide the tone (negative control)' );
	}

	public function test_no_background_marks_no_tone(): void {
		$classes = $this->dialog_classes( array( 'drawerBg' => '' ) );
		$this->assertNotContains( 'sgs-on-dark', $classes );
		$this->assertNotContains( 'sgs-on-light', $classes );
	}
}
