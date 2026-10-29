<?php
/**
 * The WhatsApp CTA's ground is WhatsApp's brand colour from the brand registry, not a theme palette slug.
 *
 * With no `backgroundColour` on the block the button paints the registry's colour; a colour set on the block wins;
 * no rule reads a `whatsapp` palette preset. Renders the real render.php through the QA harness.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter WhatsappCtaBrandGroundTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class WhatsappCtaBrandGroundTest extends TestCase {

	/**
	 * Render the block and return its scoped CSS.
	 *
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return string The concatenated scoped CSS.
	 */
	private function render_css( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$paths   = array();
		try {
			$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( 'sgs/whatsapp-cta' );
			foreach ( array( 'attrs' => (object) $attrs, 'context' => (object) array() ) as $key => $data ) {
				$paths[ $key ] = (string) tempnam( sys_get_temp_dir(), 'sgswa' );
				file_put_contents( $paths[ $key ], json_encode( $data, JSON_THROW_ON_ERROR ) );
				$cmd .= ' --' . $key . '-file ' . escapeshellarg( $paths[ $key ] );
			}
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			foreach ( $paths as $path ) {
				@unlink( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			}
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['css'];
	}

	/**
	 * The button root's `background-color` declaration, or '' when none is printed.
	 *
	 * @param string $css Scoped CSS.
	 * @return string
	 */
	private function root_ground( string $css ): string {
		return 1 === preg_match( '/\.wp-block-sgs-whatsapp-cta\{[^}]*?background-color:([^;}]+)/', $css, $m ) ? trim( $m[1] ) : '';
	}

	public function test_a_block_with_no_colour_paints_the_registry_brand_colour(): void {
		$registry = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/data/brand-registry.json' ), true );
		$whatsapp = array_values( array_filter( $registry['brands'], static fn ( array $b ): bool => 'whatsapp' === $b['slug'] ) )[0];
		$css      = $this->render_css( array( 'phoneNumber' => '447700900123' ) );
		$this->assertSame( strtolower( $whatsapp['colour'] ), strtolower( $this->root_ground( $css ) ), $css );
		$this->assertStringNotContainsString( 'preset--color--whatsapp', $css );
	}

	public function test_a_colour_set_on_the_block_wins(): void {
		$css = $this->render_css( array( 'phoneNumber' => '447700900123', 'backgroundColour' => '#112233' ) );
		$this->assertSame( '#112233', strtolower( $this->root_ground( $css ) ), $css );
	}

	public function test_the_card_badge_stays_the_brand_colour_whatever_ground_the_card_takes(): void {
		$css = $this->render_css( array( 'phoneNumber' => '447700900123', 'variant' => 'card', 'backgroundColour' => '#112233' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-whatsapp-cta__icon-badge\{background-color:#25d366;?\}/i', $css );
		$this->assertSame( '#112233', strtolower( $this->root_ground( $css ) ) );
	}
}
