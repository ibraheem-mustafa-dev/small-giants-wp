<?php
/**
 * Tests: sgs/product-search's submit button on the built-in button kit (prefix `submit`, part `submit`).
 *
 * The pins render the real render.php with no `submit*` setting and compare the HTML and CSS to the stored render, so a
 * block that sets nothing renders byte for byte as before the kit. The rest of the cases set the kit's attributes and check
 * what prints, and where.
 *
 * Re-record the pins (only when a render change is intended) with SGS_WRITE_PINS=1.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ProductSearchSubmitKitTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ProductSearchSubmitKitTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const PINS = __DIR__ . '/../fixtures/button-kit-adopters/product-search-pins.json';

	/** @return array<string, array<string, mixed>> The attribute sets pinned with no `submit*` setting. */
	private static function pinned_cases(): array {
		return array(
			'inline-bar'          => array(),
			'icon-expand'         => array( 'displayMode' => 'icon-expand' ),
			'full-screen-overlay' => array( 'displayMode' => 'full-screen-overlay' ),
			'command-palette'     => array( 'displayMode' => 'command-palette' ),
			'inline-with-look'    => array(
				'borderColour' => 'accent',
				'maxResults'   => array( 'desktop' => 5 ),
			),
			'empty-style'         => array( 'submitStyle' => '' ),
		);
	}

	public function test_the_submit_renders_exactly_as_before_with_no_submit_setting(): void {
		$pins    = is_file( self::PINS ) ? json_decode( (string) file_get_contents( self::PINS ), true, 512, JSON_THROW_ON_ERROR ) : array();
		$current = array();
		foreach ( self::pinned_cases() as $name => $attrs ) {
			$current[ $name ] = $this->render_block( 'sgs/product-search', $attrs );
		}
		if ( getenv( 'SGS_WRITE_PINS' ) ) {
			// 'empty-style' pins the same render as 'inline-bar': an empty preset choice equals an unset one.
			file_put_contents( self::PINS, json_encode( $current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
			$this->markTestSkipped( 'pins re-recorded' );
		}
		$this->assertNotEmpty( $pins, 'the pins file is missing: record it with SGS_WRITE_PINS=1' );
		foreach ( $current as $name => $render ) {
			// The wrapper class hashes the attribute set, so an attribute set that differs only by an empty `submitStyle` hashes apart.
			if ( 'empty-style' === $name ) {
				continue;
			}
			$this->assertSame( $pins[ $name ]['html'], $render['html'], "$name: html" );
			$this->assertSame( $pins[ $name ]['css'], $render['css'], "$name: css" );
		}
		$unset = $current['inline-bar'];
		$empty = $current['empty-style'];
		$norm  = static fn( string $s ): string => (string) preg_replace( '/sgs-ps-[0-9a-f]{8}/', 'sgs-ps-X', $s );
		$this->assertSame( $norm( $unset['html'] ), $norm( $empty['html'] ), 'an empty submitStyle renders as an unset one' );
		$this->assertSame( $norm( $unset['css'] ), $norm( $empty['css'] ), 'an empty submitStyle prints the same css' );
	}
}
