<?php
/**
 * Tests for Sgs_Safety_Guard — FR-S7-3 existing-site safety guard.
 *
 * Verifies:
 * - Fresh install arms seeding immediately (option absent → write time()).
 * - arm() with positive delay writes a future timestamp.
 * - arm() with zero delay arms immediately.
 * - seeding_armed() delegates correctly to Sgs_Migrations.
 * - maybe_arm_on_upgrade() ignores non-plugin/theme actions.
 *
 * Run with: vendor/bin/phpunit tests/php/SafetyGuardTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Generic.Files.OneObjectStructurePerFile, WordPress.Files.FileName, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions

// Reuse the SiteInfoTest stub layer for get_option / update_option / etc.
require_once __DIR__ . '/SiteInfoTest.php';

if ( ! function_exists( 'register_activation_hook' ) ) {
	function register_activation_hook( $file, $callback ): void {
		$GLOBALS['sgs_test_activation_hooks'][] = compact( 'file', 'callback' );
	}
}
if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}
if ( ! function_exists( 'is_admin' ) ) {
	function is_admin(): bool {
		return (bool) ( $GLOBALS['sgs_test_is_admin'] ?? true );
	}
}
if ( ! function_exists( 'esc_html_e' ) ) {
	function esc_html_e( string $text, string $domain = '' ): void {
		echo htmlspecialchars( $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}
if ( ! function_exists( '_n' ) ) {
	function _n( string $single, string $plural, int $number, string $domain = '' ): string {
		return 1 === $number ? $single : $plural;
	}
}

if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
	define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
}

require_once __DIR__ . '/../../includes/class-sgs-migrations.php';
require_once __DIR__ . '/../../includes/class-sgs-safety-guard.php';

use SGS\Blocks\Sgs_Migrations;
use SGS\Blocks\Sgs_Safety_Guard;

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * @covers \SGS\Blocks\Sgs_Safety_Guard
	 */
	class SafetyGuardTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			\Wp_Options_Stub::reset();
			$GLOBALS['sgs_test_activation_hooks'] = array();
			$GLOBALS['sgs_test_is_admin']         = true;
		}

		public function test_fresh_install_arms_seeding_immediately(): void {
			// Option absent.
			$this->assertFalse( get_option( Sgs_Migrations::OPTION_SEEDING_ARMED ) );
			Sgs_Safety_Guard::maybe_arm_on_activation();
			$value = get_option( Sgs_Migrations::OPTION_SEEDING_ARMED );
			$this->assertIsInt( $value );
			$this->assertLessThanOrEqual( time(), (int) $value );
			$this->assertTrue( Sgs_Safety_Guard::seeding_armed() );
		}

		public function test_existing_install_does_not_overwrite_armed_at(): void {
			// Pre-existing future-dated timestamp (existing site mid-upgrade).
			$future = time() + 3600;
			update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, $future );
			Sgs_Safety_Guard::maybe_arm_on_activation();
			$this->assertSame( $future, (int) get_option( Sgs_Migrations::OPTION_SEEDING_ARMED ) );
			$this->assertFalse( Sgs_Safety_Guard::seeding_armed() );
		}

		public function test_arm_with_delay_writes_future_timestamp(): void {
			Sgs_Safety_Guard::arm( 60 );
			$value = (int) get_option( Sgs_Migrations::OPTION_SEEDING_ARMED );
			$this->assertGreaterThan( time(), $value );
			$this->assertLessThanOrEqual( time() + 60, $value );
			$this->assertFalse( Sgs_Safety_Guard::seeding_armed(), 'Future-dated arm must not be considered active yet' );
		}

		public function test_arm_with_zero_delay_arms_immediately(): void {
			Sgs_Safety_Guard::arm( 0 );
			$this->assertTrue( Sgs_Safety_Guard::seeding_armed() );
		}

		public function test_seeding_armed_delegates_to_migrations(): void {
			update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, time() - 1 );
			$this->assertTrue( Sgs_Safety_Guard::seeding_armed() );
			update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, time() + 3600 );
			$this->assertFalse( Sgs_Safety_Guard::seeding_armed() );
		}

		public function test_upgrade_handler_ignores_non_update_actions(): void {
			Sgs_Safety_Guard::maybe_arm_on_upgrade( null, array( 'action' => 'install', 'type' => 'plugin' ) );
			$this->assertFalse( get_option( Sgs_Migrations::OPTION_SEEDING_ARMED ) );
		}

		public function test_upgrade_handler_ignores_translation_updates(): void {
			Sgs_Safety_Guard::maybe_arm_on_upgrade( null, array( 'action' => 'update', 'type' => 'translation' ) );
			$this->assertFalse( get_option( Sgs_Migrations::OPTION_SEEDING_ARMED ) );
		}

		public function test_upgrade_handler_arms_on_plugin_update(): void {
			Sgs_Safety_Guard::maybe_arm_on_upgrade( null, array( 'action' => 'update', 'type' => 'plugin' ) );
			$this->assertIsInt( get_option( Sgs_Migrations::OPTION_SEEDING_ARMED ) );
		}

		public function test_upgrade_handler_arms_on_theme_update(): void {
			Sgs_Safety_Guard::maybe_arm_on_upgrade( null, array( 'action' => 'update', 'type' => 'theme' ) );
			$this->assertIsInt( get_option( Sgs_Migrations::OPTION_SEEDING_ARMED ) );
		}

		public function test_upgrade_handler_handles_non_array_hook_extra(): void {
			Sgs_Safety_Guard::maybe_arm_on_upgrade( null, 'not-an-array' );
			$this->assertFalse( get_option( Sgs_Migrations::OPTION_SEEDING_ARMED ) );
		}

		public function test_admin_notice_text_matches_spec_wording(): void {
			$GLOBALS['sgs_test_is_admin'] = true;
			// Future-dated armed_at = existing-site upgrade window.
			update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, time() + 3600 );
			ob_start();
			Sgs_Migrations::maybe_show_seeding_guard_notice();
			$html = (string) ob_get_clean();
			$this->assertStringContainsString( 'preserved', $html );
			$this->assertStringContainsString( 'Reset Header/Footer', $html );
			$this->assertStringContainsString( 'wp sgs reset-template-parts', $html );
		}

		public function test_admin_notice_suppressed_on_fresh_install(): void {
			// Option absent — fresh install, no notice.
			ob_start();
			Sgs_Migrations::maybe_show_seeding_guard_notice();
			$this->assertSame( '', (string) ob_get_clean() );
		}

		public function test_admin_notice_suppressed_when_seeding_already_active(): void {
			update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, time() - 100 );
			ob_start();
			Sgs_Migrations::maybe_show_seeding_guard_notice();
			$this->assertSame( '', (string) ob_get_clean() );
		}
	}
}
