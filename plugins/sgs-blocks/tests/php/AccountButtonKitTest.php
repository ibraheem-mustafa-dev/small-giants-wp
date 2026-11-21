<?php
/**
 * Tests: sgs/account's built-in buttons on the button kit: the signed-out card's Sign in (`signedOutSignIn`) and Create account
 * (`signedOutRegister`) buttons and the empty-state card's button (`emptyState`).
 *
 * The pins record what the helpers hand `sgs/button` with no kit setting (the standalone runner prints each button's attributes),
 * so an account that sets nothing renders as before. The other cases set the kit's attributes and check the preset the button
 * is given, the class that scopes its rules, and the CSS that prints.
 *
 * Re-record the pins (only when a render change is intended) with SGS_WRITE_PINS=1.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter AccountButtonKitTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class AccountButtonKitTest extends TestCase {

	private const PINS = __DIR__ . '/../fixtures/button-kit-adopters/account-pins.json';

	/** @param array<string, array<string, mixed>> $cases @return array<string, string> */
	private static function run_cases( array $cases ): array {
		$file = tempnam( sys_get_temp_dir(), 'sgsak' );
		file_put_contents( $file, json_encode( $cases, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/run-account-button-kit-standalone.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$start   = strpos( $out, '{' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) ) {
			throw new RuntimeException( 'runner failed: ' . $out );
		}
		return $decoded;
	}

	/** @return array<string, array<string, mixed>> The renders pinned with no kit setting. */
	private static function pinned_cases(): array {
		$look = array(
			'signedOutButtonMinHeight'          => array( 'desktop' => '52px' ),
			'signedOutButtonShadow'             => 'soft',
			'signedOutButtonShadowColour'       => 'text',
			'signedOutButtonShadowHover'        => 'lifted',
			'signedOutButtonShadowColourHover'  => 'primary',
		);
		return array(
			'signed-out'                => array( 'fn' => 'signed_out', 'register' => true ),
			'signed-out-no-register'    => array( 'fn' => 'signed_out', 'register' => false ),
			'signed-out-with-look'      => array( 'fn' => 'signed_out', 'register' => true, 'attrs' => $look + array( 'signedOutSignInUrl' => '/in/', 'signedOutHeading' => 'Hi' ) ),
			'signed-out-empty-style'    => array( 'fn' => 'signed_out', 'register' => true, 'attrs' => array( 'signedOutSignInStyle' => '', 'signedOutRegisterStyle' => '' ) ),
			'empty-card'                => array( 'fn' => 'empty', 'args' => array( 'No orders', 'Nothing yet', 'Shop now', '/shop/' ) ),
			'empty-card-no-button'      => array( 'fn' => 'empty', 'args' => array( 'No orders', 'Nothing yet', '', '' ) ),
			'empty-card-empty-style'    => array( 'fn' => 'empty', 'args' => array( 'No orders', 'Nothing yet', 'Shop now', '/shop/', array( 'emptyStateStyle' => '' ) ) ),
		);
	}

	public function test_the_buttons_render_exactly_as_before_with_no_kit_setting(): void {
		$cases   = self::pinned_cases();
		$current = self::run_cases( $cases );
		if ( getenv( 'SGS_WRITE_PINS' ) ) {
			file_put_contents( self::PINS, json_encode( $current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
			$this->markTestSkipped( 'pins re-recorded' );
		}
		$pins = json_decode( (string) file_get_contents( self::PINS ), true, 512, JSON_THROW_ON_ERROR );
		foreach ( array_keys( $cases ) as $name ) {
			$this->assertSame( $pins[ $name ], $current[ $name ], $name );
		}
		$this->assertSame( $current['signed-out'], $current['signed-out-empty-style'], 'an empty preset choice equals an unset one: the card' );
		$this->assertSame( $current['empty-card'], $current['empty-card-empty-style'], 'an empty preset choice equals an unset one: the empty state' );
	}
}
