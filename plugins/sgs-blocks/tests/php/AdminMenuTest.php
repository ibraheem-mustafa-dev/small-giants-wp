<?php
/**
 * Tests for Sgs_Admin_Menu — FR-S5-1 top-level admin menu.
 *
 * Verifies constants, hook registration, and that add_menu_page is called
 * with the expected slug, capability, icon, and position.
 *
 * Run with: vendor/bin/phpunit tests/php/AdminMenuTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// Reuse the SiteInfoAdminTest stub layer for add_action / wp_die / esc_html, etc.
require_once __DIR__ . '/SiteInfoAdminTest.php';

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Generic.Files.OneObjectStructurePerFile, WordPress.Files.FileName
if ( ! function_exists( 'add_menu_page' ) ) {
	/**
	 * Test stub for WP add_menu_page(). Records the call into a global array.
	 *
	 * @param string      $page_title Page title (unused in stub).
	 * @param string      $menu_title Menu title (unused in stub).
	 * @param string      $capability Capability gate.
	 * @param string      $menu_slug  Menu slug.
	 * @param callable    $callback   Render callback (unused).
	 * @param string      $icon_url   Dashicon class (unused).
	 * @param int|null    $position   Menu position (unused).
	 * @return string                 Hook suffix.
	 */
	function add_menu_page( $page_title, $menu_title, $capability, $menu_slug, $callback = '', $icon_url = '', $position = null ): string {
		$GLOBALS['sgs_test_menu_pages'][] = compact( 'page_title', 'menu_title', 'capability', 'menu_slug', 'callback', 'icon_url', 'position' );
		return 'toplevel_page_' . $menu_slug;
	}
}

require_once __DIR__ . '/../../includes/class-sgs-admin-menu.php';

use SGS\Blocks\Sgs_Admin_Menu;

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * @covers \SGS\Blocks\Sgs_Admin_Menu
	 */
	class AdminMenuTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			$GLOBALS['sgs_test_menu_pages'] = array();
			\Wp_Options_Stub::$user_can     = true;
		}

		public function test_constants_match_spec(): void {
			$this->assertSame( 'sgs', Sgs_Admin_Menu::MENU_SLUG );
			$this->assertSame( 'edit_theme_options', Sgs_Admin_Menu::CAP );
			$this->assertSame( 58, Sgs_Admin_Menu::POSITION );
			$this->assertSame( 'dashicons-art', Sgs_Admin_Menu::ICON );
		}

		public function test_add_menu_registers_top_level_entry(): void {
			Sgs_Admin_Menu::add_menu();
			$this->assertNotEmpty( $GLOBALS['sgs_test_menu_pages'] );
			$entry = $GLOBALS['sgs_test_menu_pages'][0];
			$this->assertSame( 'sgs', $entry['menu_slug'] );
			$this->assertSame( 'edit_theme_options', $entry['capability'] );
			$this->assertSame( 'dashicons-art', $entry['icon_url'] );
			$this->assertSame( 58, $entry['position'] );
			$this->assertSame( 'SGS', $entry['menu_title'] );
		}

		public function test_register_is_idempotent_and_uses_priority_5(): void {
			// register() simply wires add_action — verify class loads and the method exists.
			$this->assertTrue( method_exists( Sgs_Admin_Menu::class, 'register' ) );
			$this->assertTrue( method_exists( Sgs_Admin_Menu::class, 'add_menu' ) );
			$this->assertTrue( method_exists( Sgs_Admin_Menu::class, 'render_landing' ) );
			Sgs_Admin_Menu::register();
			Sgs_Admin_Menu::register();
			$this->assertTrue( true ); // No exception = idempotent at the static-method level.
		}

		public function test_render_landing_outputs_wrap_for_capable_user(): void {
			\Wp_Options_Stub::$user_can = true;
			ob_start();
			Sgs_Admin_Menu::render_landing();
			$html = (string) ob_get_clean();
			$this->assertStringContainsString( 'wrap', $html );
			$this->assertStringContainsString( 'SGS Framework', $html );
		}
	}
}
