<?php
/**
 * Tests for Sgs_Floating_UI_Customiser and Sgs_Floating_UI_Renderer.
 *
 * Self-contained: uses the same WP stub layer pattern as HeaderRulesTest.php.
 * All WP function stubs wrapped in function_exists() guards so they compose
 * safely with the rest of the test suite.
 *
 * Covers:
 *   1. register_controls adds 1 section + 7 settings + 7 controls to WP_Customize_Manager mock.
 *   2. sanitise_colour rejects a <script> payload, returns empty string.
 *   3. sanitise_height clamps: below min → 2, above max → 8, in-range → unchanged.
 *   4. sanitise_position rejects an invalid string, returns default 'right'.
 *   5. Capability 'edit_theme_options' is set on the section and every setting.
 *   6. Renderer outputs nothing (no HTML) when both elements disabled.
 *   7. Renderer outputs back-to-top markup when BTT enabled + RP disabled.
 *   8. CSS custom properties carry operator-chosen colours (esc_attr applied).
 *   9. Option round-trip: update then get returns same shape.
 *  10. sanitise_checkbox casts truthy/falsy values correctly.
 *
 * Run with: vendor/bin/phpunit --filter "FloatingUiCustomiserTest"
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// WP stubs — declared in GLOBAL namespace so production code in SGS\Blocks
// can resolve \sanitize_hex_color() / \absint() / \WP_Customize_Manager.
// All guarded with function_exists() / class_exists() so they compose safely.
// ---------------------------------------------------------------------------

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! defined( 'SGS_BLOCKS_VERSION' ) ) {
	define( 'SGS_BLOCKS_VERSION', '0.1.0-test' );
}
if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
	define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
}

if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = '' ): string {
		return $text;
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( string $text, string $domain = '' ): string {
		return htmlspecialchars( $text, ENT_QUOTES );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES );
	}
}
if ( ! function_exists( 'esc_attr_e' ) ) {
	function esc_attr_e( string $text, string $domain = '' ): void {
		echo htmlspecialchars( $text, ENT_QUOTES );
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $value ): int {
		return abs( (int) $value );
	}
}
if ( ! function_exists( 'sanitize_hex_color' ) ) {
	function sanitize_hex_color( string $color ): ?string {
		if ( preg_match( '/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/', $color ) ) {
			return $color;
		}
		return null;
	}
}
if ( ! function_exists( 'plugins_url' ) ) {
	function plugins_url( string $path = '', string $plugin = '' ): string {
		return 'https://example.test/wp-content/plugins/sgs-blocks/' . ltrim( $path, '/' );
	}
}
if ( ! function_exists( 'wp_enqueue_style' ) ) {
	function wp_enqueue_style(): void {
		$GLOBALS['sgs_test_enqueued_styles'][] = func_get_args();
	}
}
if ( ! function_exists( 'wp_enqueue_script' ) ) {
	function wp_enqueue_script(): void {
		$GLOBALS['sgs_test_enqueued_scripts'][] = func_get_args();
	}
}

// Simple wp_options in-memory store.
if ( ! function_exists( 'get_option' ) ) {
	function get_option( string $key, $default = false ) {
		return $GLOBALS['sgs_test_options'][ $key ] ?? $default;
	}
}
if ( ! function_exists( 'update_option' ) ) {
	function update_option( string $key, $value ): bool {
		$GLOBALS['sgs_test_options'][ $key ] = $value;
		return true;
	}
}

// ---------------------------------------------------------------------------
// WP_Customize_Manager minimal mock.
// ---------------------------------------------------------------------------

if ( ! class_exists( 'WP_Customize_Manager' ) ) {
	class WP_Customize_Manager {
		public array $sections = array();
		public array $settings = array();
		public array $controls = array();

		public function add_section( string $id, array $args ): void {
			$this->sections[ $id ] = $args;
		}

		public function add_setting( string $id, array $args ): void {
			$this->settings[ $id ] = $args;
		}

		public function add_control( $id_or_control, array $args = array() ): void {
			if ( is_string( $id_or_control ) ) {
				$this->controls[ $id_or_control ] = $args;
			} elseif ( is_object( $id_or_control ) ) {
				// WP_Customize_Color_Control — store by id property if available.
				$id                    = property_exists( $id_or_control, 'id' ) ? $id_or_control->id : spl_object_id( $id_or_control );
				$this->controls[ $id ] = $id_or_control;
			}
		}
	}
}

if ( ! class_exists( 'WP_Customize_Color_Control' ) ) {
	class WP_Customize_Color_Control {
		public string $id;
		public array $args;

		public function __construct( WP_Customize_Manager $manager, string $id, array $args = array() ) {
			$this->id   = $id;
			$this->args = $args;
		}
	}
}

// ---------------------------------------------------------------------------
// Load classes under test.
// ---------------------------------------------------------------------------

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-floating-ui-customiser.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-floating-ui-renderer.php';

use SGS\Blocks\Sgs_Floating_UI_Customiser;
use SGS\Blocks\Sgs_Floating_UI_Renderer;

/**
 * Class FloatingUiCustomiserTest
 */
final class FloatingUiCustomiserTest extends \PHPUnit\Framework\TestCase {

	protected function setUp(): void {
		parent::setUp();
		$GLOBALS['sgs_test_options']          = array();
		$GLOBALS['sgs_test_enqueued_styles']  = array();
		$GLOBALS['sgs_test_enqueued_scripts'] = array();
	}

	// ── Test 1: register_controls registers 1 section + 7 settings + 7 controls ─

	public function test_register_controls_adds_expected_counts(): void {
		$manager = new \WP_Customize_Manager();
		Sgs_Floating_UI_Customiser::register_controls( $manager );

		$this->assertCount( 1, $manager->sections, 'Expected exactly 1 section.' );
		$this->assertCount( 7, $manager->settings, 'Expected exactly 7 settings.' );
		$this->assertCount( 7, $manager->controls, 'Expected exactly 7 controls.' );
	}

	// ── Test 2: sanitise_colour rejects a <script> payload ───────────────────

	public function test_sanitise_colour_rejects_script_payload(): void {
		$result = Sgs_Floating_UI_Customiser::sanitise_colour( '<script>alert(1)</script>' );
		$this->assertSame( '', $result, 'sanitise_colour must return empty string for invalid input.' );
	}

	// ── Test 3: sanitise_height clamps to 2-8 ────────────────────────────────

	public function test_sanitise_height_clamps_below_min(): void {
		$this->assertSame( 2, Sgs_Floating_UI_Customiser::sanitise_height( 0 ) );
		$this->assertSame( 2, Sgs_Floating_UI_Customiser::sanitise_height( 1 ) );
	}

	public function test_sanitise_height_clamps_above_max(): void {
		$this->assertSame( 8, Sgs_Floating_UI_Customiser::sanitise_height( 9 ) );
		$this->assertSame( 8, Sgs_Floating_UI_Customiser::sanitise_height( 100 ) );
	}

	public function test_sanitise_height_passes_in_range(): void {
		$this->assertSame( 4, Sgs_Floating_UI_Customiser::sanitise_height( 4 ) );
		$this->assertSame( 2, Sgs_Floating_UI_Customiser::sanitise_height( 2 ) );
		$this->assertSame( 8, Sgs_Floating_UI_Customiser::sanitise_height( 8 ) );
	}

	// ── Test 4: sanitise_position rejects invalid string ─────────────────────

	public function test_sanitise_position_rejects_invalid(): void {
		$this->assertSame( 'right', Sgs_Floating_UI_Customiser::sanitise_position( 'center' ) );
		$this->assertSame( 'right', Sgs_Floating_UI_Customiser::sanitise_position( '' ) );
		$this->assertSame( 'left', Sgs_Floating_UI_Customiser::sanitise_position( 'left' ) );
		$this->assertSame( 'right', Sgs_Floating_UI_Customiser::sanitise_position( 'right' ) );
	}

	// ── Test 5: section + all settings carry capability = edit_theme_options ─

	public function test_capability_gate_on_section_and_settings(): void {
		$manager = new \WP_Customize_Manager();
		Sgs_Floating_UI_Customiser::register_controls( $manager );

		$this->assertSame(
			'edit_theme_options',
			$manager->sections['sgs_floating_ui']['capability'] ?? null,
			'Section must require edit_theme_options.'
		);

		foreach ( $manager->settings as $id => $args ) {
			$this->assertSame(
				'edit_theme_options',
				$args['capability'] ?? null,
				"Setting '{$id}' must require edit_theme_options."
			);
		}
	}

	// ── Test 6: renderer outputs nothing when both disabled ───────────────────

	public function test_renderer_skips_when_both_disabled(): void {
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_ENABLED, false );
		update_option( Sgs_Floating_UI_Customiser::OPT_RP_ENABLED, false );

		ob_start();
		Sgs_Floating_UI_Renderer::render();
		$output = ob_get_clean();

		$this->assertSame( '', $output, 'Renderer must produce no output when both elements are disabled.' );
		$this->assertEmpty( $GLOBALS['sgs_test_enqueued_styles'], 'No styles should be enqueued when disabled.' );
		$this->assertEmpty( $GLOBALS['sgs_test_enqueued_scripts'], 'No scripts should be enqueued when disabled.' );
	}

	// ── Test 7: renderer outputs BTT markup when BTT enabled, RP disabled ────

	public function test_renderer_outputs_btt_when_enabled(): void {
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_ENABLED, true );
		update_option( Sgs_Floating_UI_Customiser::OPT_RP_ENABLED, false );
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_BG, '#0F7E80' );
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_ICON, '#FFFFFF' );
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_POSITION, 'right' );

		ob_start();
		Sgs_Floating_UI_Renderer::render();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'sgs-floating-ui__back-to-top', $output, 'BTT button must be in output.' );
		$this->assertStringNotContainsString( 'sgs-floating-ui__reading-progress', $output, 'RP bar must not appear.' );
		$this->assertStringContainsString( 'aria-label', $output, 'Back to top button must have aria-label.' );
	}

	// ── Test 8: CSS custom properties carry operator colours ─────────────────

	public function test_renderer_inlines_operator_colours(): void {
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_ENABLED, true );
		update_option( Sgs_Floating_UI_Customiser::OPT_RP_ENABLED, false );
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_BG, '#123456' );
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_ICON, '#ABCDEF' );
		update_option( Sgs_Floating_UI_Customiser::OPT_BTT_POSITION, 'left' );

		ob_start();
		Sgs_Floating_UI_Renderer::render();
		$output = ob_get_clean();

		$this->assertStringContainsString( '#123456', $output, 'BTT background colour must appear in output.' );
		$this->assertStringContainsString( '#ABCDEF', $output, 'BTT icon colour must appear in output.' );
		$this->assertStringContainsString( '--btt-bg', $output, 'CSS custom property --btt-bg must be emitted.' );
	}

	// ── Test 9: option round-trip ─────────────────────────────────────────────

	public function test_option_round_trip(): void {
		$data = array(
			'enabled'     => true,
			'bg_colour'   => '#0F7E80',
			'icon_colour' => '#FFFFFF',
			'position'    => 'right',
		);
		update_option( 'sgs_floating_ui_test_key', $data );
		$retrieved = get_option( 'sgs_floating_ui_test_key', array() );

		$this->assertSame( $data, $retrieved, 'Option round-trip must return same shape.' );
	}

	// ── Test 10: sanitise_checkbox ────────────────────────────────────────────

	public function test_sanitise_checkbox_casts_correctly(): void {
		$this->assertTrue( Sgs_Floating_UI_Customiser::sanitise_checkbox( true ) );
		$this->assertTrue( Sgs_Floating_UI_Customiser::sanitise_checkbox( 1 ) );
		$this->assertTrue( Sgs_Floating_UI_Customiser::sanitise_checkbox( '1' ) );
		$this->assertFalse( Sgs_Floating_UI_Customiser::sanitise_checkbox( false ) );
		$this->assertFalse( Sgs_Floating_UI_Customiser::sanitise_checkbox( 0 ) );
		$this->assertFalse( Sgs_Floating_UI_Customiser::sanitise_checkbox( '' ) );
	}
}
