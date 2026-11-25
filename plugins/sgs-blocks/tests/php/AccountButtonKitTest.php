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

	/** The attributes of the nth button in the runner's markup (`<btn {json}>`). @return array<string, mixed> */
	private static function button( string $html, int $n ): array {
		preg_match_all( '/<btn (\{.*?\})>/', $html, $m );
		return json_decode( $m[1][ $n ], true, 512, JSON_THROW_ON_ERROR );
	}

	public function test_a_named_preset_picks_that_preset_for_its_own_button_only(): void {
		$out = self::run_cases(
			array(
				'card'  => array( 'fn' => 'signed_out', 'register' => true, 'attrs' => array( 'signedOutSignInStyle' => 'outline' ) ),
				'card2' => array( 'fn' => 'signed_out', 'register' => true, 'attrs' => array( 'signedOutRegisterStyle' => 'primary' ) ),
				'empty' => array( 'fn' => 'empty', 'args' => array( 'h', 't', 'Shop', '/shop/', array( 'emptyStateStyle' => 'secondary' ) ) ),
				'bad'   => array( 'fn' => 'signed_out', 'register' => true, 'attrs' => array( 'signedOutSignInStyle' => 'no-such-preset', 'signedOutRegisterStyle' => 7 ) ),
			)
		);
		$this->assertSame( array( 'outline', 'secondary' ), array( self::button( $out['card'], 0 )['inheritStyle'], self::button( $out['card'], 1 )['inheritStyle'] ) );
		$this->assertSame( array( 'primary', 'primary' ), array( self::button( $out['card2'], 0 )['inheritStyle'], self::button( $out['card2'], 1 )['inheritStyle'] ) );
		$this->assertSame( 'secondary', self::button( $out['empty'], 0 )['inheritStyle'] );
		$this->assertSame( array( 'primary', 'secondary' ), array( self::button( $out['bad'], 0 )['inheritStyle'], self::button( $out['bad'], 1 )['inheritStyle'] ), 'an unknown or wrongly typed name keeps the fixed preset' );
		$this->assertArrayNotHasKey( 'className', self::button( $out['card'], 0 ), 'a preset alone adds no rule, so no hook class' );
	}

	public function test_a_colour_set_prints_on_its_own_button_after_the_existing_settings(): void {
		$set = array(
			'signedOutRegisterColourBackground'      => 'accent',
			'signedOutRegisterColourText'            => 'surface',
			'signedOutRegisterColourBackgroundHover' => 'primary',
			'signedOutRegisterColourTextHover'       => 'text',
			'signedOutRegisterMinHeight'             => array( 'desktop' => '60px' ),
			'signedOutRegisterShadow'                => 'soft',
			'signedOutButtonMinHeight'               => array( 'desktop' => '52px' ),
		);
		$out = self::run_cases(
			array(
				'card' => array( 'fn' => 'signed_out', 'register' => true, 'attrs' => $set ),
				'css'  => array( 'fn' => 'kit_css', 'attrs' => $set, 'args' => array( '.r' ) ),
			)
		);
		$this->assertArrayNotHasKey( 'className', self::button( $out['card'], 0 ), 'Sign in sets nothing, so it carries no hook class' );
		$this->assertSame( 'sgs-account__signed-out-register', self::button( $out['card'], 1 )['className'] );
		$this->assertSame( array( 'desktop' => '52px' ), self::button( $out['card'], 1 )['minHeight'], 'the existing shared min height still reaches the button' );
		$sel = '.r .sgs-account__signed-out-actions .sgs-account__signed-out-register.sgs-button';
		$this->assertStringContainsString( $sel . '{', $out['css'] );
		$this->assertStringNotContainsString( 'signed-out-sign-in', $out['css'], 'Sign in prints nothing' );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . '\{[^}]*background-color:[^;}]*accent/', $out['css'], 'the fill' );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . '\{[^}]*color:[^;}]*surface/', $out['css'], 'the text colour' );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . '\{[^}]*min-height:60px/', $out['css'], 'the kit min height' );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . '\{[^}]*box-shadow|--sgs-focus-under/', $out['css'], 'the shadow' );
	}

	public function test_a_hover_set_stays_readable(): void {
		$out = self::run_cases(
			array(
				'css' => array(
					'fn'    => 'kit_css',
					'attrs' => array(
						'signedOutSignInColourBackgroundHover' => 'primary',
						'signedOutSignInColourTextHover'       => 'surface',
					),
					'args'  => array( '.r' ),
				),
			)
		);
		$sel = '.r .sgs-account__signed-out-actions .sgs-account__signed-out-sign-in.sgs-button';
		// The hover fill and its text colour print together on one hover rule, behind the touch guard, with the keyboard-focus twin.
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . ':hover\{[^}]*background-color:[^;}]*primary[^}]*color:[^;}]*surface|' . preg_quote( $sel, '/' ) . ':hover\{[^}]*color:[^;}]*surface[^}]*background-color:[^;}]*primary/', $out['css'] );
		$this->assertStringContainsString( $sel . ':focus-visible', $out['css'], 'keyboard focus shows the same hover look' );
	}

	public function test_the_empty_state_button_prints_on_the_empty_card_alone(): void {
		$set = array( 'emptyStateColourBackground' => 'accent', 'emptyStatePadding' => array( 'desktop' => array( 'top' => '4px', 'right' => '9px', 'bottom' => '4px', 'left' => '9px' ) ) );
		$out = self::run_cases(
			array(
				'card'  => array( 'fn' => 'empty', 'args' => array( 'h', 't', 'Shop', '/shop/', $set ) ),
				'css'   => array( 'fn' => 'kit_css', 'attrs' => $set, 'args' => array( '.r' ) ),
				'other' => array( 'fn' => 'kit_css', 'attrs' => array( 'ordersEmptyButtonLabel' => 'x', 'signedOutSignInLabel' => 'x' ), 'args' => array( '.r' ) ),
			)
		);
		$this->assertArrayNotHasKey( 'className', self::button( $out['card'], 0 ), 'one button in the card: no hook class' );
		$sel = '.r .sgs-account__orders-empty-actions .sgs-button.sgs-button';
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . '\{[^}]*background-color:[^;}]*accent/', $out['css'] );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . '\{[^}]*padding[^}]*9px/', $out['css'] );
		$this->assertSame( '', $out['other'], 'the empty-orders button label and a link setting print nothing from the kit' );
	}
}
