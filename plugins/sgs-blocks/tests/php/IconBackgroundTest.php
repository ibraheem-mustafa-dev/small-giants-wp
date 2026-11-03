<?php
/**
 * sgs/icon background: a brand slug the palette lacks ('whatsapp') paints that brand's colour instead of falling to
 * currentColor, and a background gradient paints on a background-showing icon.
 *
 * Renders run in a child process (tests/php/fixtures/icon-render-child.php).
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter IconBackgroundTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconBackgroundTest extends TestCase {

	/**
	 * The rendered HTML (style block included) for these attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	private function icon( array $attributes ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsib' );
		file_put_contents( $file, json_encode( array( 'attributes' => (object) $attributes, 'site_info' => (object) array() ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/icon-render-child.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed' );
		return (string) $decoded['html'];
	}

	private const BASE = array(
		'iconSource'     => 'lucide',
		'iconName'       => 'mail',
		'shape'          => 'circle',
		'showBackground' => true,
	);

	public function test_a_brand_slug_background_paints_the_brand_colour(): void {
		$html = $this->icon( self::BASE + array( 'backgroundColour' => 'whatsapp' ) );
		$this->assertStringContainsString( '--sgs-icon-bg:#25D366', $html );
		$this->assertStringNotContainsString( 'preset--color--whatsapp', $html, 'never the unresolved palette variable' );
	}

	public function test_a_brand_slug_hover_background_paints_the_brand_colour(): void {
		$this->assertStringContainsString( '--sgs-icon-bg-hover:#25D366', $this->icon( self::BASE + array( 'backgroundColourHover' => 'whatsapp' ) ) );
	}

	public function test_a_background_gradient_prints_a_background_image_rule(): void {
		$html = $this->icon( self::BASE + array( 'backgroundColourGradient' => 'linear-gradient(45deg,#f09433,#bc1888)' ) );
		$this->assertStringContainsString( '.sgs-icon__shape{background-image:linear-gradient(45deg,#f09433,#bc1888);}', $html );
	}

	public function test_a_palette_slug_and_a_hex_are_unchanged(): void {
		$this->assertStringContainsString( '--sgs-icon-bg:var(--wp--preset--color--primary, currentColor)', $this->icon( self::BASE + array( 'backgroundColour' => 'primary' ) ), 'control: a non-brand slug' );
		$this->assertStringContainsString( '--sgs-icon-bg:#25d366', $this->icon( self::BASE + array( 'backgroundColour' => '#25d366' ) ), 'control: a hex' );
	}

	public function test_no_background_prints_no_background_rule(): void {
		$html = $this->icon( self::BASE );
		$this->assertStringNotContainsString( '--sgs-icon-bg:', $html, 'control: nothing set, nothing printed' );
		$this->assertStringNotContainsString( 'background-image:linear', $html );
	}
}
