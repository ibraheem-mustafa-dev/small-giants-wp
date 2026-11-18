<?php
/**
 * Tests: the tick box look is a per-site token (Spec 32 FR-32-31).
 *
 * Runs theme/sgs-theme/inc/choice-controls.php against stubbed WordPress functions and asserts that:
 *   - with no `choiceControls` token (absent, empty object, no recognised key, blank value) the stylesheet is not
 *     enqueued and the body class is not added;
 *   - with a token the stylesheet is enqueued and the body class is added;
 *   - the stylesheet's three properties resolve to the token values, and to 22px, 10px and the palette accent without one;
 *   - the block and WooCommerce rules that drew tick boxes before the look keep a fallback gated on the body class.
 *
 * Self-contained: no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Theme {
	if ( ! function_exists( 'SGS\Theme\global_custom_setting' ) ) {
		/**
		 * Stub of the theme's settings.custom reader.
		 *
		 * @param string $key Key under settings.custom.
		 * @return mixed
		 */
		function global_custom_setting( string $key ) {
			return $GLOBALS['sgs_test_custom'][ $key ] ?? null;
		}

		/**
		 * Stub of the theme's cache-busting version helper.
		 *
		 * @param string $path    Path inside the theme.
		 * @param string $version Theme version.
		 * @return string
		 */
		function asset_version( string $path, string $version ): string {
			return $version;
		}
	}
}

namespace {
	use PHPUnit\Framework\TestCase;
	use PHPUnit\Framework\Attributes\DataProvider;

	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', __DIR__ . '/' );
	}
	if ( ! function_exists( 'add_action' ) ) {
		/** Stub: records nothing, the test calls the callbacks itself. */
		function add_action( ...$args ): bool {
			return true;
		}
	}
	if ( ! function_exists( 'add_filter' ) ) {
		/** Stub: records nothing, the test calls the callbacks itself. */
		function add_filter( ...$args ): bool {
			return true;
		}
	}
	if ( ! function_exists( 'wp_enqueue_style' ) ) {
		/** Stub: records the handle. */
		function wp_enqueue_style( string $handle, ...$args ): void {
			$GLOBALS['sgs_test_enqueued'][] = $handle;
		}
	}
	if ( ! function_exists( 'wp_get_theme' ) ) {
		/** Stub theme object. */
		function wp_get_theme() {
			return new class() {
				/** @param string $key Header key. */
				public function get( string $key ): string {
					return '1.0.0';
				}
			};
		}
	}
	if ( ! function_exists( 'get_theme_file_uri' ) ) {
		/** Stub URI builder. */
		function get_theme_file_uri( string $path ): string {
			return 'https://example.test/' . $path;
		}
	}

	/**
	 * Class ChoiceControlsTokenTest
	 */
	class ChoiceControlsTokenTest extends TestCase {

		/** Repository root. */
		private static string $root;

		/** Set up: load the theme file once. */
		public static function setUpBeforeClass(): void {
			self::$root = dirname( __DIR__, 4 );
			require_once self::$root . '/theme/sgs-theme/inc/choice-controls.php';
		}

		/** Reset the stubs. */
		protected function setUp(): void {
			$GLOBALS['sgs_test_custom']   = array();
			$GLOBALS['sgs_test_enqueued'] = array();
		}

		/**
		 * Token shapes that must not opt a site in.
		 *
		 * @return array<string, array{0: mixed}>
		 */
		public static function not_opted_in(): array {
			return array(
				'no token'              => array( null ),
				'empty object'          => array( array() ),
				'unrecognised key only' => array( array( 'colour' => 'red' ) ),
				'blank value'           => array( array( 'size' => '  ' ) ),
				'non-string value'      => array( array( 'size' => 22 ) ),
				'not an object'         => array( '22px' ),
			);
		}

		/**
		 * @param mixed $token The settings.custom.choiceControls value.
		 */
		#[DataProvider( 'not_opted_in' )]
		public function test_a_site_without_the_token_gets_no_stylesheet_and_no_body_class( $token ): void {
			if ( null !== $token ) {
				$GLOBALS['sgs_test_custom']['choiceControls'] = $token;
			}
			$this->assertFalse( \SGS\Theme\choice_controls_enabled() );
			\SGS\Theme\enqueue_choice_controls_styles();
			$this->assertSame( array(), $GLOBALS['sgs_test_enqueued'] );
			$this->assertSame( array( 'x' ), \SGS\Theme\add_choice_controls_body_class( array( 'x' ) ) );
		}

		/**
		 * Token shapes that opt a site in.
		 *
		 * @return array<string, array{0: array<string,string>}>
		 */
		public static function opted_in(): array {
			return array(
				'size only (all defaults)' => array( array( 'size' => '22px' ) ),
				'gap only'                 => array( array( 'gap' => '12px' ) ),
				'accent only'              => array( array( 'accent' => '#336699' ) ),
				'all three'                => array(
					array(
						'size'   => '24px',
						'gap'    => '8px',
						'accent' => '#336699',
					),
				),
			);
		}

		/**
		 * @param array<string,string> $token The settings.custom.choiceControls value.
		 */
		#[DataProvider( 'opted_in' )]
		public function test_a_site_with_the_token_gets_the_stylesheet_and_body_class( array $token ): void {
			$GLOBALS['sgs_test_custom']['choiceControls'] = $token;
			$this->assertTrue( \SGS\Theme\choice_controls_enabled() );
			\SGS\Theme\enqueue_choice_controls_styles();
			$this->assertSame( array( 'sgs-choice-controls' ), $GLOBALS['sgs_test_enqueued'] );
			$this->assertContains( 'sgs-choice-controls', \SGS\Theme\add_choice_controls_body_class( array() ) );
		}

		/**
		 * Resolve a `:root` custom property from the stylesheet the way the browser does, given the token values.
		 *
		 * @param string               $css    Stylesheet text.
		 * @param string               $prop   Property name, e.g. `--sgs-checkbox-size`.
		 * @param array<string,string> $tokens Printed `--wp--custom--choice-controls--*` values.
		 * @param array<string,string> $preset Printed `--wp--preset--color--*` values.
		 */
		private function resolve( string $css, string $prop, array $tokens, array $preset ): string {
			$this->assertSame( 1, preg_match( '/:root\s*\{([^}]*)\}/', $css, $root ) );
			$this->assertSame( 1, preg_match( '/' . preg_quote( $prop, '/' ) . ':\s*([^;]+);/', $root[1], $m ), "$prop declared on :root" );
			$all   = $tokens + $preset;
			$value = trim( $m[1] );
			// Innermost var() first: no nested parentheses inside its fallback.
			while ( preg_match( '/var\((--[a-z-]+)(?:,\s*([^()]*))?\)/', $value, $v ) ) {
				$replacement = $all[ $v[1] ] ?? trim( $v[2] ?? '' );
				$value       = str_replace( $v[0], $replacement, $value );
			}
			return $value;
		}

		/** The stylesheet's three properties resolve to the token values, and to the defaults without them. */
		public function test_the_three_properties_follow_the_tokens_and_fall_back_to_the_defaults(): void {
			$css    = (string) file_get_contents( self::$root . '/theme/sgs-theme/assets/css/choice-controls.css' );
			$preset = array( '--wp--preset--color--accent' => '#aa5500' );

			$none = array();
			$this->assertSame( '22px', $this->resolve( $css, '--sgs-checkbox-size', $none, $preset ) );
			$this->assertSame( '10px', $this->resolve( $css, '--sgs-checkbox-gap', $none, $preset ) );
			$this->assertSame( '#aa5500', $this->resolve( $css, '--sgs-checkbox-accent', $none, $preset ) );

			$set = array(
				'--wp--custom--choice-controls--size'   => '26px',
				'--wp--custom--choice-controls--gap'    => '6px',
				'--wp--custom--choice-controls--accent' => '#336699',
			);
			$this->assertSame( '26px', $this->resolve( $css, '--sgs-checkbox-size', $set, $preset ) );
			$this->assertSame( '6px', $this->resolve( $css, '--sgs-checkbox-gap', $set, $preset ) );
			$this->assertSame( '#336699', $this->resolve( $css, '--sgs-checkbox-accent', $set, $preset ) );
		}

		/** The theme no longer enqueues the stylesheet unconditionally. */
		public function test_functions_php_does_not_enqueue_the_stylesheet_directly(): void {
			$functions = (string) file_get_contents( self::$root . '/theme/sgs-theme/functions.php' );
			$this->assertStringNotContainsString( 'sgs-choice-controls', $functions );
			$this->assertStringContainsString( 'inc/choice-controls.php', $functions );
		}

		/**
		 * Rules that drew tick boxes before the look keep their old declaration, gated on the body class.
		 *
		 * @return array<string, array{0: string, 1: string}>
		 */
		public static function fallback_rules(): array {
			return array(
				'cart gift box'         => array( 'plugins/sgs-blocks/src/blocks/cart/style.css', 'width: 20px' ),
				'gift-order box'        => array( 'plugins/sgs-blocks/src/blocks/gift-order/style.css', 'width: 24px' ),
				'form option box'       => array( 'plugins/sgs-blocks/src/blocks/form/style.css', ':where(body:not(.sgs-choice-controls)) .sgs-form-field__option input[type="checkbox"]' ),
				'form consent box'      => array( 'plugins/sgs-blocks/src/blocks/form/style.css', ':where(body:not(.sgs-choice-controls)) .sgs-form-field__consent input[type="checkbox"]' ),
				'shop filter drawn box' => array( 'theme/sgs-theme/assets/css/woocommerce.css', ':where(body:not(.sgs-choice-controls)) .sgs-shop-filters .wc-block-components-checkbox input[type="checkbox"]:checked::after' ),
			);
		}

		/**
		 * @param string $file   Repo-relative file.
		 * @param string $needle Text the fallback must contain.
		 */
		#[DataProvider( 'fallback_rules' )]
		public function test_the_pre_look_rule_is_kept_for_sites_that_did_not_opt_in( string $file, string $needle ): void {
			$css = (string) file_get_contents( self::$root . '/' . $file );
			$this->assertStringContainsString( 'body:not(.sgs-choice-controls)', $css );
			$this->assertStringContainsString( $needle, $css );
		}
	}
}
