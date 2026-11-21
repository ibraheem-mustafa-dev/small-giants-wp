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
		$this->assertSame( 1, $this->count_submit_buttons( $current['inline-bar']['html'] ) );
		$unset = $current['inline-bar'];
		$empty = $current['empty-style'];
		$norm  = static fn( string $s ): string => (string) preg_replace( '/sgs-ps-[0-9a-f]{8}/', 'sgs-ps-X', $s );
		$this->assertSame( $norm( $unset['html'] ), $norm( $empty['html'] ), 'an empty submitStyle renders as an unset one' );
		$this->assertSame( $norm( $unset['css'] ), $norm( $empty['css'] ), 'an empty submitStyle prints the same css' );
	}

	private function count_submit_buttons( string $html ): int {
		return preg_match_all( '/<button\s[^>]*type="submit"/', $html );
	}

	private static function uid( string $html ): string {
		preg_match( '/sgs-ps-[0-9a-f]{8}/', $html, $m );
		return $m[0] ?? '';
	}

	private static function submit_class( string $html ): string {
		preg_match( '/<button\s[^>]*type="submit"[^>]*class="([^"]*)"|<button\s[^>]*class="([^"]*)"[^>]*type="submit"/', $html, $m );
		return $m[1] ?: ( $m[2] ?? '' );
	}

	public function test_a_named_preset_puts_the_shared_preset_rule_on_the_submit_button(): void {
		$render = $this->render_block( 'sgs/product-search', array( 'submitStyle' => 'outline' ) );
		$class  = self::submit_class( $render['html'] );
		$this->assertMatchesRegularExpression( '/^sgs-product-search__submit sgs-btn-kit-\w+/', $class, 'the preset class sits beside the base class' );
		preg_match( '/sgs-btn-kit-\w+/', $class, $m );
		$this->assertStringContainsString( '.' . $m[0] . '.' . $m[0] . '.sgs-product-search__submit', $render['css'], 'the shared preset rule is the minted class doubled and chained to the button, out-ranking style.css' );
		$this->assertStringNotContainsString( 'style="', $render['html'], 'no inline style' );
	}

	public function test_an_unknown_preset_name_prints_nothing(): void {
		$unset = $this->render_block( 'sgs/product-search', array() );
		$bad   = $this->render_block( 'sgs/product-search', array( 'submitStyle' => 'no-such-preset' ) );
		$norm  = static fn( string $s ): string => (string) preg_replace( '/sgs-ps-[0-9a-f]{8}/', 'sgs-ps-X', $s );
		$this->assertSame( $norm( $unset['html'] ), $norm( $bad['html'] ) );
		$this->assertSame( $norm( $unset['css'] ), $norm( $bad['css'] ) );
	}

	public function test_a_colour_set_prints_on_the_submit_button_on_the_uid_class(): void {
		$render = $this->render_block(
			'sgs/product-search',
			array(
				'submitColourBackground' => 'accent',
				'submitColourText'       => 'surface',
				'submitBorderRadius'     => array( 'desktop' => array( 'topLeft' => '0px', 'topRight' => '0px', 'bottomRight' => '0px', 'bottomLeft' => '0px' ) ),
				'submitMinHeight'        => array( 'desktop' => '56px' ),
			)
		);
		$sel = '.' . self::uid( $render['html'] ) . ' .sgs-product-search__form .sgs-product-search__submit';
		$re  = static fn( string $decl ): string => '/' . preg_quote( $sel, '/' ) . '\{[^}]*' . $decl . '/';
		$this->assertMatchesRegularExpression( $re( 'background-color:[^;}]*accent' ), $render['css'], 'the fill' );
		$this->assertMatchesRegularExpression( $re( 'color:[^;}]*surface' ), $render['css'], 'the text colour' );
		$this->assertMatchesRegularExpression( $re( 'border-top-left-radius:0px' ), $render['css'], 'the radius' );
		$this->assertMatchesRegularExpression( $re( 'min-height:56px' ), $render['css'], 'the min height' );
		$this->assertDoesNotMatchRegularExpression( '/sgs-btn-kit-/', $render['html'], 'no preset chosen: no preset class' );
	}

	public function test_the_hover_colours_print_together_with_the_keyboard_focus_twin(): void {
		$render = $this->render_block( 'sgs/product-search', array( 'submitColourBackgroundHover' => 'primary', 'submitColourTextHover' => 'surface' ) );
		$sel    = '.' . self::uid( $render['html'] ) . ' .sgs-product-search__form .sgs-product-search__submit';
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . ':hover\{[^}]*background-color:[^;}]*primary[^}]*color:[^;}]*surface|' . preg_quote( $sel, '/' ) . ':hover\{[^}]*color:[^;}]*surface[^}]*background-color:[^;}]*primary/', $render['css'] );
		$this->assertStringContainsString( $sel . ':focus-visible{', $render['css'] );
	}

	public function test_the_dialog_modes_carry_the_rule_on_the_uid_class_the_dialog_wears(): void {
		$render = $this->render_block( 'sgs/product-search', array( 'displayMode' => 'full-screen-overlay', 'submitColourBackground' => 'accent' ) );
		$uid    = self::uid( $render['html'] );
		$this->assertMatchesRegularExpression( '/<dialog [^>]*class="[^"]*' . preg_quote( $uid, '/' ) . '/', $render['html'], 'the dialog wears the uid class, so the rule still matches once the dialog is moved out of the wrapper' );
		$this->assertStringContainsString( '.' . $uid . ' .sgs-product-search__form .sgs-product-search__submit{', $render['css'] );
	}
}
