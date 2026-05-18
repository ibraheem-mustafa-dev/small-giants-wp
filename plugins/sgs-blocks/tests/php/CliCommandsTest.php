<?php
/**
 * Tests for Sgs_Cli_Commands (FR-S5-3, Spec 17 Wave 3).
 *
 * Run with:
 *   vendor/bin/phpunit --filter CliCommandsTest
 *
 * Reuses the Wp_Options_Stub / WP function stub layer from SiteInfoTest.php
 * exactly as VariationPickerTest does.  WP_CLI is doubled inline.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Generic.Files.OneObjectStructurePerFile, WordPress.Files.FileName, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions, WordPress.Security.EscapeOutput.OutputNotEscaped

declare( strict_types=1 );

// Reuse the SiteInfoTest WP stub layer (get_option / update_option /
// current_user_can / sanitize_* / esc_* / Wp_Options_Stub class).
require_once __DIR__ . '/SiteInfoTest.php';

// ---------------------------------------------------------------------------
// WP_CLI double — declared before the class under test is loaded.
// ---------------------------------------------------------------------------

if ( ! class_exists( 'WP_CLI' ) ) {
	class WP_CLI {
		/** @var array<int,array{type:string,message:string}> */
		public static array $log = array();

		/** Reset captured state between tests. */
		public static function reset(): void {
			self::$log = array();
		}

		public static function success( string $msg ): void {
			self::$log[] = array(
				'type'    => 'success',
				'message' => $msg,
			);
		}

		public static function log( string $msg ): void {
			self::$log[] = array(
				'type'    => 'log',
				'message' => $msg,
			);
		}

		public static function warning( string $msg ): void {
			self::$log[] = array(
				'type'    => 'warning',
				'message' => $msg,
			);
		}

		/**
		 * Mimics real WP_CLI::error() — throws so tests can catch.
		 *
		 * @param string $msg Error message.
		 * @throws \RuntimeException Always.
		 */
		public static function error( string $msg ): void {
			self::$log[] = array(
				'type'    => 'error',
				'message' => $msg,
			);
			throw new \RuntimeException( 'WP_CLI::error — ' . $msg );
		}

		/** Stub — not exercised by unit tests. */
		public static function add_command( string $name, $callable ): void {}
	}
}

// ---------------------------------------------------------------------------
// Additional WP stubs not covered by SiteInfoTest.php.
// ---------------------------------------------------------------------------

if ( ! defined( 'WP_CLI' ) ) {
	define( 'WP_CLI', true );
}
if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
	define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data, int $flags = 0 ): string {
		return (string) json_encode( $data, $flags );
	}
}
if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ): bool {
		return $thing instanceof \WP_Error;
	}
}
if ( ! function_exists( 'is_user_logged_in' ) ) {
	function is_user_logged_in(): bool {
		return false;
	}
}
if ( ! function_exists( 'is_admin' ) ) {
	function is_admin(): bool {
		return false;
	}
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $key ): string {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
	}
}
if ( ! function_exists( 'sanitize_file_name' ) ) {
	function sanitize_file_name( $name ): string {
		return preg_replace( '/[^a-z0-9_\-.]/', '', strtolower( (string) $name ) );
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( string $text, string $domain = '' ): string {
		return htmlspecialchars( $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}
if ( ! function_exists( 'set_theme_mod' ) ) {
	function set_theme_mod( string $name, $value ): void {
		$GLOBALS['sgs_test_theme_mods'][ $name ] = $value;
	}
}
if ( ! function_exists( 'remove_theme_mod' ) ) {
	function remove_theme_mod( string $name ): void {
		unset( $GLOBALS['sgs_test_theme_mods'][ $name ] );
	}
}
if ( ! function_exists( 'wp_die' ) ) {
	function wp_die( $message = '', $title = '', $args = array() ): void {
		throw new \RuntimeException( 'wp_die: ' . (string) $message );
	}
}
if ( ! function_exists( 'add_submenu_page' ) ) {
	function add_submenu_page(): string {
		return 'sgs';
	}
}
if ( ! function_exists( 'add_menu_page' ) ) {
	function add_menu_page(): string {
		return 'sgs';
	}
}
if ( ! function_exists( 'wp_get_theme' ) ) {
	function wp_get_theme() {
		return new stdClass();
	}
}

// WP_Error stub — used by header/footer rules.
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		private string $code;
		private string $message;

		public function __construct( string $code = '', string $message = '', $data = null ) {
			$this->code    = $code;
			$this->message = $message;
		}

		public function get_error_message(): string {
			return $this->message;
		}

		public function get_error_code(): string {
			return $this->code;
		}
	}
}

// WP_Theme_JSON_Resolver stub — needed by Sgs_Template_Part_Seeder + Resetter.
if ( ! class_exists( 'WP_Theme_JSON_Resolver' ) ) {
	class WP_Theme_JSON_Resolver {
		public static function get_style_variations(): array {
			return $GLOBALS['sgs_test_style_variations'] ?? array();
		}

		public static function get_user_data_from_wp_global_styles( $theme = null, $create_post = false ) {
			return $GLOBALS['sgs_test_user_styles_post'] ?? null;
		}
	}
}

// ---------------------------------------------------------------------------
// Load classes under test (dependency order — same as sgs-blocks.php).
// ---------------------------------------------------------------------------

require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-migrations.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-safety-guard.php';

if ( ! class_exists( 'SGS\\Blocks\\Sgs_Template_Part_Meta' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-template-part-meta.php';
}
if ( ! class_exists( 'SGS\\Blocks\\Sgs_Template_Part_Seeder' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-template-part-seeder.php';
}
if ( ! class_exists( 'SGS\\Blocks\\Sgs_Template_Part_Resetter' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-template-part-resetter.php';
}
if ( ! class_exists( 'SGS\\Blocks\\Sgs_Header_Rules' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-rules.php';
}
if ( ! class_exists( 'SGS\\Blocks\\Sgs_Footer_Rules' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-footer-rules.php';
}
// Sgs_Admin_Menu must load before Sgs_Variation_Picker (mirrors VariationPickerTest).
if ( ! class_exists( 'SGS\\Blocks\\Sgs_Admin_Menu' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-admin-menu.php';
}
if ( ! class_exists( 'SGS\\Blocks\\Sgs_Variation_Picker' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-variation-picker.php';
}
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cli-commands.php';

use SGS\Blocks\Sgs_Cli_Commands;
use SGS\Blocks\Sgs_Site_Info;
use SGS\Blocks\Sgs_Header_Rules;
use SGS\Blocks\Sgs_Footer_Rules;
use SGS\Blocks\Sgs_Migrations;
use SGS\Blocks\Sgs_Safety_Guard;
use SGS\Blocks\Sgs_Variation_Picker;

// ---------------------------------------------------------------------------
// Test class.
// ---------------------------------------------------------------------------

if ( class_exists( 'PHPUnit\\Framework\\TestCase' ) ) {

	class CliCommandsTest extends \PHPUnit\Framework\TestCase {

		/** @var Sgs_Cli_Commands */
		private Sgs_Cli_Commands $cmd;

		protected function setUp(): void {
			Wp_Options_Stub::reset();
			WP_CLI::reset();
			Sgs_Site_Info::register();
			$this->cmd = new Sgs_Cli_Commands();
		}

		// ── 1. Class and method existence ────────────────────────────────────

		public function test_class_exists(): void {
			$this->assertTrue( class_exists( Sgs_Cli_Commands::class ) );
		}

		public function test_has_site_info_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'site_info' ) );
		}

		public function test_has_seed_template_parts_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'seed_template_parts' ) );
		}

		public function test_has_reset_template_parts_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'reset_template_parts' ) );
		}

		public function test_has_header_rules_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'header_rules' ) );
		}

		public function test_has_footer_rules_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'footer_rules' ) );
		}

		public function test_has_migrations_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'migrations' ) );
		}

		public function test_has_seeding_arm_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'seeding_arm' ) );
		}

		public function test_has_theme_mod_restore_method(): void {
			$this->assertTrue( method_exists( $this->cmd, 'theme_mod_restore' ) );
		}

		// ── 2. site_info get — outputs the stored value ──────────────────────

		public function test_site_info_get_outputs_stored_value(): void {
			Sgs_Site_Info::set_internal( 'phone', '+44 121 000 1234' );

			$this->cmd->site_info( array( 'get', 'phone' ), array() );

			$logs = array_filter( WP_CLI::$log, fn( $e ) => 'log' === $e['type'] );
			$this->assertNotEmpty( $logs );
			$this->assertSame( '+44 121 000 1234', array_values( $logs )[0]['message'] );
		}

		public function test_site_info_get_missing_key_errors(): void {
			$this->expectException( \RuntimeException::class );
			$this->cmd->site_info( array( 'get' ), array() );
		}

		// ── 3. site_info set — calls set_internal with sanitised input ───────

		public function test_site_info_set_writes_value(): void {
			Wp_Options_Stub::$user_can = true;

			$this->cmd->site_info( array( 'set', 'tagline', 'Fresh every day' ), array() );

			$this->assertSame( 'Fresh every day', Sgs_Site_Info::get( 'tagline' ) );
			$successes = array_filter( WP_CLI::$log, fn( $e ) => 'success' === $e['type'] );
			$this->assertNotEmpty( $successes );
		}

		public function test_site_info_set_blocked_when_no_cap(): void {
			Wp_Options_Stub::$user_can = false;

			$this->expectException( \RuntimeException::class );
			$this->cmd->site_info( array( 'set', 'tagline', 'x' ), array() );
		}

		public function test_site_info_set_fails_on_reserved_key(): void {
			Wp_Options_Stub::$user_can = true;

			$this->expectException( \RuntimeException::class );
			$this->cmd->site_info( array( 'set', 'sgs_framework_version', '9.9' ), array() );
		}

		// ── 4. site_info update — bulk-writes from a JSON file ───────────────

		public function test_site_info_update_writes_multiple_keys(): void {
			Wp_Options_Stub::$user_can = true;

			$file = sys_get_temp_dir() . '/sgs_cli_test_' . uniqid() . '.json';
			file_put_contents( $file, json_encode( array( 'phone' => '0800 000 001', 'tagline' => 'Since 1962' ) ) );

			$this->cmd->site_info( array( 'update', $file ), array() );

			unlink( $file );

			$this->assertSame( '0800 000 001', Sgs_Site_Info::get( 'phone' ) );
			$this->assertSame( 'Since 1962', Sgs_Site_Info::get( 'tagline' ) );
			$successes = array_filter( WP_CLI::$log, fn( $e ) => 'success' === $e['type'] );
			$this->assertNotEmpty( $successes );
		}

		// ── 5. migrations run — invokes Sgs_Migrations::run once ─────────────

		public function test_migrations_run_no_errors_for_admin(): void {
			// No logged-in user in test context (is_user_logged_in() returns false),
			// so Sgs_Migrations::run() skips the cap check.  Whatever is on disk either
			// runs or is already completed — we just assert no exception is thrown and
			// the command emits either a success or a "no pending" log entry.
			Wp_Options_Stub::$user_can = true;

			$this->cmd->migrations( array( 'run' ), array() );

			$messages = array_column( WP_CLI::$log, 'message' );
			$found    = false;
			foreach ( $messages as $msg ) {
				if ( str_contains( $msg, 'No pending' ) || str_contains( $msg, 'migration(s) completed' ) ) {
					$found = true;
					break;
				}
			}
			$this->assertTrue( $found, 'Expected either "No pending" or "migration(s) completed" in output.' );
		}

		public function test_migrations_status_lists_completed_entry(): void {
			Wp_Options_Stub::update( Sgs_Migrations::OPTION_COMPLETED, array( '0001-baseline' ) );

			$this->cmd->migrations( array( 'status' ), array() );

			$all_messages = implode( ' ', array_column( WP_CLI::$log, 'message' ) );
			$this->assertStringContainsString( 'Completed', $all_messages );
			$this->assertStringContainsString( '0001-baseline', $all_messages );
		}

		public function test_migrations_unknown_subcommand_errors(): void {
			$this->expectException( \RuntimeException::class );
			$this->cmd->migrations( array( 'destroy' ), array() );
		}

		// ── 6. seeding_arm — invokes Sgs_Safety_Guard::arm ───────────────────

		public function test_seeding_arm_writes_armed_at_option(): void {
			Wp_Options_Stub::$user_can = true;

			$this->cmd->seeding_arm( array(), array() );

			$armed_at = Wp_Options_Stub::get( Sgs_Migrations::OPTION_SEEDING_ARMED );
			$this->assertNotFalse( $armed_at, 'armed_at option must be written after seeding_arm.' );
			$this->assertLessThanOrEqual( time() + 1, (int) $armed_at );

			$successes = array_filter( WP_CLI::$log, fn( $e ) => 'success' === $e['type'] );
			$this->assertNotEmpty( $successes );
		}

		public function test_seeding_arm_blocked_when_no_cap(): void {
			Wp_Options_Stub::$user_can = false;

			$this->expectException( \RuntimeException::class );
			$this->cmd->seeding_arm( array(), array() );
		}

		// ── 7. header_rules — subcommands dispatch correctly ─────────────────

		public function test_header_rules_list_outputs_json(): void {
			Wp_Options_Stub::update( Sgs_Header_Rules::OPTION_KEY, array( Sgs_Header_Rules::default_rule() ) );

			$this->cmd->header_rules( array( 'list' ), array() );

			$logs = array_filter( WP_CLI::$log, fn( $e ) => 'log' === $e['type'] );
			$this->assertNotEmpty( $logs );
			$decoded = json_decode( array_values( $logs )[0]['message'], true );
			$this->assertIsArray( $decoded );
		}

		public function test_header_rules_add_returns_rule_id(): void {
			Wp_Options_Stub::$user_can = true;
			Wp_Options_Stub::update( Sgs_Header_Rules::OPTION_KEY, array( Sgs_Header_Rules::default_rule() ) );

			$this->cmd->header_rules(
				array( 'add', json_encode( array( 'pattern_slug' => 'sgs/framework-header-default', 'priority' => 5 ) ) ),
				array()
			);

			$successes = array_filter( WP_CLI::$log, fn( $e ) => 'success' === $e['type'] );
			$this->assertNotEmpty( $successes );
			$this->assertStringContainsString( 'Rule added with ID:', array_values( $successes )[0]['message'] );
		}

		public function test_header_rules_remove_default_errors(): void {
			Wp_Options_Stub::$user_can = true;
			Wp_Options_Stub::update( Sgs_Header_Rules::OPTION_KEY, array( Sgs_Header_Rules::default_rule() ) );

			$this->expectException( \RuntimeException::class );
			$this->cmd->header_rules( array( 'remove', Sgs_Header_Rules::DEFAULT_RULE_ID ), array() );
		}

		public function test_header_rules_unknown_subcommand_errors(): void {
			$this->expectException( \RuntimeException::class );
			$this->cmd->header_rules( array( 'purge' ), array() );
		}

		// ── 8. footer_rules — subcommands dispatch correctly ─────────────────

		public function test_footer_rules_list_outputs_json(): void {
			Wp_Options_Stub::update( Sgs_Footer_Rules::OPTION_KEY, array( Sgs_Footer_Rules::default_rule() ) );

			$this->cmd->footer_rules( array( 'list' ), array() );

			$logs = array_filter( WP_CLI::$log, fn( $e ) => 'log' === $e['type'] );
			$this->assertNotEmpty( $logs );
			$this->assertIsArray( json_decode( array_values( $logs )[0]['message'], true ) );
		}

		public function test_footer_rules_add_returns_rule_id(): void {
			Wp_Options_Stub::$user_can = true;
			Wp_Options_Stub::update( Sgs_Footer_Rules::OPTION_KEY, array( Sgs_Footer_Rules::default_rule() ) );

			$this->cmd->footer_rules(
				array( 'add', json_encode( array( 'pattern_slug' => 'sgs/framework-footer-default', 'priority' => 5 ) ) ),
				array()
			);

			$successes = array_filter( WP_CLI::$log, fn( $e ) => 'success' === $e['type'] );
			$this->assertNotEmpty( $successes );
		}

		// ── 9. theme_mod_restore — reads sgs_legacy_theme_mods_backup from wp_options ─

		public function test_theme_mod_restore_errors_when_no_backup(): void {
			Wp_Options_Stub::$user_can = true;
			// No backup in store — get_option returns false (default).

			$this->expectException( \RuntimeException::class );
			$this->cmd->theme_mod_restore( array(), array() );
		}

		public function test_theme_mod_restore_succeeds_with_backup(): void {
			Wp_Options_Stub::$user_can = true;

			// Seed the backup directly into the in-memory option store.
			Wp_Options_Stub::update(
				'sgs_legacy_theme_mods_backup',
				array(
					'active_theme_style' => 'indus-foods',
					'backed_up_at'       => time(),
					'spec_version'       => '1.1.0',
				)
			);

			$this->cmd->theme_mod_restore( array(), array() );

			$successes = array_filter( WP_CLI::$log, fn( $e ) => 'success' === $e['type'] );
			$this->assertNotEmpty( $successes );
			$this->assertStringContainsString( 'indus-foods', array_values( $successes )[0]['message'] );
		}

		// ── 10. site_info unknown subcommand errors ───────────────────────────

		public function test_site_info_unknown_subcommand_errors(): void {
			$this->expectException( \RuntimeException::class );
			$this->cmd->site_info( array( 'destroy' ), array() );
		}
	}
}
