<?php
/**
 * sgs/button pressed state (Spec 32 FR-32-19): `buttonPresets.{variant}.active-transform` and `active-shadow`.
 *
 * While the button is pressed (`:active`) it takes the variant's `active-transform` and `active-shadow`, else the
 * `default` variant's. A role no preset sets prints nothing, so pressing a button whose preset sets no
 * `active-shadow` keeps whatever shadow it already shows (CSS cannot say "keep the current value" through a
 * var() fallback, so the rule exists only when the token does). The pressed shadow is handed to the focus system as
 * `--sgs-focus-under`, as every other shadow the button draws is.
 *
 * Renders the real render.php through the QA harness with the presets supplied as global settings
 * (`--global-settings-file`), the way wp_get_global_settings() returns them on a site.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonPressStateTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonPressStateTest extends TestCase {

	/**
	 * Render sgs/button with the given button presets as global settings.
	 *
	 * @param array<string,mixed> $attrs   Block attributes.
	 * @param array<string,mixed> $presets settings.custom.buttonPresets.
	 * @return string The concatenated scoped CSS.
	 */
	private function render_css( array $attrs, array $presets ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$payload = array(
			'attrs'    => (object) $attrs,
			'context'  => (object) array(),
			'settings' => array( 'custom' => array( 'buttonPresets' => $presets ) ),
		);
		$paths   = array();
		try {
			foreach ( $payload as $key => $data ) {
				$paths[ $key ] = (string) tempnam( sys_get_temp_dir(), 'sgsbp' );
				file_put_contents( $paths[ $key ], json_encode( $data, JSON_THROW_ON_ERROR ) );
			}
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/button'
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
		return (string) $decoded['css'];
	}

	/**
	 * The declarations of every `:active` rule in the CSS, joined.
	 *
	 * @param string $css Scoped CSS.
	 * @return string
	 */
	private function active_decls( string $css ): string {
		preg_match_all( '/([^{}]*\.sgs-button:active[^{}]*)\{([^}]*)\}/', $css, $m );
		return implode( ';', $m[2] );
	}

	public function test_a_preset_with_press_tokens_renders_an_active_rule_with_them(): void {
		$css = $this->render_css(
			array(
				'label'        => 'Shop',
				'inheritStyle' => 'primary',
			),
			array(
				'primary' => array(
					'active-transform' => 'translate(3px, 3px)',
					'active-shadow'    => '0 0 0 #3a2a22',
				),
			)
		);
		$decls = $this->active_decls( $css );
		$this->assertStringContainsString( 'transform:var(--wp--custom--button-presets--primary--active-transform)', $decls, $css );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--primary--active-shadow)', $decls, $css );
		$this->assertStringContainsString( '--sgs-focus-under:var(--wp--custom--button-presets--primary--active-shadow)', $decls, 'the pressed shadow composes under the focus ring' );
		// The press rule out-ranks the per-instance hover and focus-visible rules (0,3,0).
		$this->assertMatchesRegularExpression( '/\.(sgs-btn-[0-9a-f]{8})\.\1\.sgs-button:active\{/', $css );
	}

	public function test_a_variant_without_its_own_token_takes_the_default_variant(): void {
		$css   = $this->render_css(
			array(
				'label'        => 'Shop',
				'inheritStyle' => 'secondary',
			),
			array(
				'default'   => array( 'active-transform' => 'translateY(1px)' ),
				'secondary' => array( 'active-shadow' => 'none' ),
			)
		);
		$decls = $this->active_decls( $css );
		$this->assertStringContainsString( 'transform:var(--wp--custom--button-presets--default--active-transform)', $decls );
		$this->assertStringContainsString( 'box-shadow:var(--wp--custom--button-presets--secondary--active-shadow)', $decls );
	}

	public function test_a_preset_without_press_tokens_renders_no_active_shadow(): void {
		$css = $this->render_css(
			array(
				'label'        => 'Shop',
				'inheritStyle' => 'primary',
				'boxShadow'    => 'md',
			),
			array(
				'primary' => array(
					'background'      => '#fffaf0',
					'hover-transform' => 'translateY(-3px)',
				),
			)
		);
		$this->assertStringNotContainsString( '.sgs-button:active', $css, 'no press token, so pressing keeps the current shadow and transform' );
		$this->assertStringContainsString( 'box-shadow:var(--wp--preset--shadow--md)', $css, 'the resting shadow it keeps' );
	}

	public function test_a_link_button_never_takes_the_default_press(): void {
		$css = $this->render_css(
			array(
				'label'        => 'More',
				'inheritStyle' => 'link',
			),
			array( 'default' => array( 'active-transform' => 'translateY(1px)' ) )
		);
		$this->assertStringNotContainsString( '.sgs-button:active', $css );
	}
}
