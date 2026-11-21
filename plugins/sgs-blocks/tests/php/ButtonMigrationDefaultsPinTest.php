<?php
/**
 * Pins what the built-in buttons the button migration moves onto the kit render with no look setting set: sgs/buybox's Add to Cart
 * (`addToCart*`), sgs/product-card's CTAs (`cta*`, `cta2*`) in typed, live and read-only markup, and sgs/account's sign-in and
 * register buttons (`loginButton*`, `registerButton*`). Every case runs the real render.php through the QA harness (a child process)
 * with block.json's defaults applied, and records the HTML the block prints (its scope class masked).
 *
 * A migration that moves a button onto the kit renames and reshapes its settings; with none set, the page must render as it did, so
 * these pins are the bar for "today's look when unset". The looks the old settings produced are pinned apart, in computed styles:
 * tests/playwright/button-migration/probe.mjs and tests/fixtures/button-migration/looks-before.json.
 *
 * Re-record the pins (only when a render change is intended) with SGS_WRITE_PINS=1.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonMigrationDefaultsPinTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ButtonMigrationDefaultsPinTest extends TestCase {

	private const PINS = __DIR__ . '/../fixtures/button-migration/default-renders.json';

	/** Run the harness for one block and return its HTML with the scope class masked. */
	private static function render( string $slug, array $files ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$cmd     = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug ) . ' --motion-targets';
		$tmp     = array();
		foreach ( $files as $key => $data ) {
			$tmp[ $key ] = tempnam( sys_get_temp_dir(), 'sgsmp' );
			file_put_contents( $tmp[ $key ], json_encode( $data, JSON_THROW_ON_ERROR ) );
			$cmd .= ' --' . $key . '-file ' . escapeshellarg( $tmp[ $key ] );
		}
		try {
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			array_map( 'unlink', $tmp );
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) || ! ( $decoded['ok'] ?? false ) ) {
			throw new RuntimeException( 'render.php failed for ' . $slug . ': ' . ( $decoded['error'] ?? $out ) );
		}
		return (string) preg_replace( '/sgs-(?:bb|pc|card)-[0-9a-f]{6,8}/', 'sgs-X', (string) $decoded['html'] );
	}

	/** @return array<string, string> The renders as they are now, by case. */
	private static function current(): array {
		$out     = array();
		$buybox  = json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/buybox/standard.json' ), true, 512, JSON_THROW_ON_ERROR );
		$out['buybox'] = self::render(
			'sgs/buybox',
			array(
				'attrs'    => $buybox['attrs'],
				'product'  => $buybox['product'],
				'manifest' => $buybox['manifest'],
				'context'  => $buybox['context'],
			)
		);
		$paths = json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/motion/render-paths.json' ), true, 512, JSON_THROW_ON_ERROR )['blocks']['product-card'];
		foreach ( array( 'typed', 'live-wc-simple', 'readonly-variable' ) as $name ) {
			$path  = $paths['paths'][ $name ];
			$files = array( 'attrs' => array_merge( $paths['base'], $path['attrs'], array( 'cta2Text' => 'Details' ) ) );
			foreach ( array( 'product', 'manifest', 'post', 'attachments' ) as $key ) {
				if ( isset( $path[ $key ] ) ) {
					$files[ $key ] = $path[ $key ];
				}
			}
			$out[ 'product-card ' . $name ] = self::render( 'sgs/product-card', $files );
			// A secondary button that wears a named preset, with no look set: the preset class is all that changes.
			$files['attrs']['cta2Style']          = 'outline';
			$out[ 'product-card ' . $name . ' outline' ] = self::render( 'sgs/product-card', $files );
		}
		// sgs/account's form buttons print through one CSS function: with nothing set it prints nothing for them.
		$css = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/../playwright/support/button-migration-account-css.php' ) . ' ' . escapeshellarg( dirname( __DIR__, 2 ) ) . ' ' . escapeshellarg( '{}' ) . ' ' . escapeshellarg( '{}' ) );
		$out['account form buttons'] = (string) ( json_decode( substr( $css, (int) strpos( $css, '{' ) ), true )['css'] ?? 'runner failed: ' . $css );
		return $out;
	}

	public function test_the_buttons_render_as_before_with_no_look_setting(): void {
		$current = self::current();
		if ( getenv( 'SGS_WRITE_PINS' ) ) {
			file_put_contents( self::PINS, json_encode( $current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
			$this->markTestSkipped( 'pins re-recorded' );
		}
		$pins = json_decode( (string) file_get_contents( self::PINS ), true, 512, JSON_THROW_ON_ERROR );
		$this->assertSame( array_keys( $pins ), array_keys( $current ) );
		foreach ( $pins as $name => $html ) {
			$this->assertSame( $html, $current[ $name ], $name . ' no longer renders as pinned with no look setting' );
		}
	}
}
