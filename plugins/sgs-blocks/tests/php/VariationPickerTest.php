<?php
/**
 * Tests for Sgs_Variation_Picker — FR-S5-2 style variation picker.
 *
 * Council N1 verification: the activate handler MUST NEVER consult
 * $_POST['post_id']. A malicious POST that includes post_id=999 must still
 * write to the canonical resolver-returned post.
 *
 * Run with: vendor/bin/phpunit tests/php/VariationPickerTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Generic.Files.OneObjectStructurePerFile, WordPress.Files.FileName, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions

// Reuse the SiteInfoTest stub layer for get_option / update_option / current_user_can.
require_once __DIR__ . '/SiteInfoTest.php';

if ( ! defined( 'SGS_BLOCKS_TESTING' ) ) {
	define( 'SGS_BLOCKS_TESTING', true );
}

// ---------------------------------------------------------------------------
// Extra WP stubs the picker class touches.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}
if ( ! function_exists( 'add_submenu_page' ) ) {
	function add_submenu_page(): string {
		return 'sgs-variation-picker';
	}
}
if ( ! function_exists( 'wp_die' ) ) {
	function wp_die( $message = '', $title = '', $args = array() ): void {
		throw new \RuntimeException( 'wp_die:' . (string) $message );
	}
}
if ( ! function_exists( 'check_admin_referer' ) ) {
	function check_admin_referer( $action, $name = '_wpnonce' ): bool {
		if ( empty( $_POST[ $name ] ) || (string) $_POST[ $name ] !== 'valid_' . $action ) {
			throw new \RuntimeException( 'nonce_failure' );
		}
		return true;
	}
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $key ): string {
		return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $key ) );
	}
}
if ( ! function_exists( 'wp_unslash' ) ) {
	function wp_unslash( $value ) {
		return is_string( $value ) ? stripslashes( $value ) : $value;
	}
}
if ( ! function_exists( 'wp_slash' ) ) {
	function wp_slash( $value ) {
		return is_string( $value ) ? addslashes( $value ) : $value;
	}
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data ) {
		return json_encode( $data );
	}
}
if ( ! function_exists( 'wp_safe_redirect' ) ) {
	function wp_safe_redirect( $url ): bool {
		$GLOBALS['sgs_test_last_redirect'] = $url;
		return true;
	}
}
if ( ! function_exists( 'admin_url' ) ) {
	function admin_url( $path = '' ): string {
		return 'https://example.test/wp-admin/' . ltrim( (string) $path, '/' );
	}
}
if ( ! function_exists( 'add_query_arg' ) ) {
	function add_query_arg( $args, $url ): string {
		return $url . ( false === strpos( $url, '?' ) ? '?' : '&' ) . http_build_query( (array) $args );
	}
}
if ( ! function_exists( 'wp_get_theme' ) ) {
	function wp_get_theme() {
		return (object) array( 'stylesheet' => 'sgs-theme' );
	}
}
if ( ! function_exists( 'remove_theme_mod' ) ) {
	function remove_theme_mod( string $key ): void {
		unset( $GLOBALS['sgs_test_theme_mods'][ $key ] );
	}
}
if ( ! function_exists( 'set_theme_mod' ) ) {
	function set_theme_mod( string $key, $value ): void {
		$GLOBALS['sgs_test_theme_mods'][ $key ] = $value;
	}
}
if ( ! function_exists( 'get_theme_mod' ) ) {
	function get_theme_mod( string $key, $default = false ) {
		return $GLOBALS['sgs_test_theme_mods'][ $key ] ?? $default;
	}
}
if ( ! function_exists( 'wp_update_post' ) ) {
	function wp_update_post( array $args, bool $wp_error = false ) {
		$id = (int) ( $args['ID'] ?? 0 );
		if ( $id > 0 ) {
			$GLOBALS['sgs_test_updated_posts'][ $id ] = $args;
		}
		return $id;
	}
}
if ( ! function_exists( 'wp_nonce_field' ) ) {
	function wp_nonce_field( $action, $name = '_wpnonce', $referer = true, $echo = true ): string {
		$html = '<input type="hidden" name="' . esc_attr( $name ) . '" value="valid_' . esc_attr( $action ) . '" />';
		if ( $echo ) {
			echo $html;
		}
		return $html;
	}
}
if ( ! function_exists( 'submit_button' ) ) {
	function submit_button( $text = '' ): void {
		echo '<button type="submit">' . esc_html( $text ) . '</button>';
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $value ): string {
		return htmlspecialchars( (string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( string $text, string $domain = '' ): string {
		return esc_html( $text );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $value ): string {
		return htmlspecialchars( (string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = '' ): string {
		return $text;
	}
}

// ---------------------------------------------------------------------------
// Resolver stub — controlled per-test via $GLOBALS['sgs_test_user_styles_post'].
// ---------------------------------------------------------------------------

if ( ! class_exists( '\WP_Theme_JSON_Resolver' ) ) {
	class WP_Theme_JSON_Resolver {
		public static function get_style_variations(): array {
			return $GLOBALS['sgs_test_style_variations'] ?? array();
		}

		public static function get_user_data_from_wp_global_styles( $theme = null, $create_post = false ) {
			return $GLOBALS['sgs_test_user_styles_post'] ?? null;
		}
	}
}

require_once __DIR__ . '/../../includes/class-sgs-admin-menu.php';
require_once __DIR__ . '/../../includes/class-sgs-legacy-theme-mod-migrator.php';
require_once __DIR__ . '/../../includes/class-sgs-variation-picker.php';

use SGS\Blocks\Sgs_Legacy_Theme_Mod_Migrator;
use SGS\Blocks\Sgs_Variation_Picker;

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * @covers \SGS\Blocks\Sgs_Variation_Picker
	 */
	class VariationPickerTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			\Wp_Options_Stub::reset();
			\Wp_Options_Stub::$user_can               = true;
			$GLOBALS['sgs_test_theme_mods']    = array();
			$GLOBALS['sgs_test_updated_posts'] = array();
			$GLOBALS['sgs_test_last_redirect'] = '';
			$GLOBALS['sgs_test_now']                  = 1716000000;
			$GLOBALS['sgs_test_style_variations']     = array(
				array(
					'slug'     => 'mamas-munches',
					'title'    => "Mama's Munches",
					'settings' => array( 'color' => array( 'palette' => array() ) ),
					'styles'   => array( 'color' => array( 'background' => '#fff' ) ),
				),
				array(
					'slug'     => 'helping-doctors',
					'title'    => 'HelpingDoctors',
					'settings' => array(),
					'styles'   => array(),
				),
			);
			$GLOBALS['sgs_test_user_styles_post'] = (object) array(
				'ID'           => 42,
				'post_content' => '{}',
			);
			$_POST = array();
			$_GET  = array();
		}

		// 1) render_page bails for users without edit_theme_options.
		public function test_render_page_bails_without_capability(): void {
			\Wp_Options_Stub::$user_can = false;
			$this->expectException( \RuntimeException::class );
			$this->expectExceptionMessage( 'wp_die:' );
			Sgs_Variation_Picker::render_page();
		}

		// 2) handle_activate bails on nonce failure.
		public function test_handle_activate_bails_on_nonce_failure(): void {
			$_POST = array(
				Sgs_Variation_Picker::NONCE_NAME => 'wrong_value',
				'sgs_variation_slug'             => 'mamas-munches',
			);
			$this->expectException( \RuntimeException::class );
			$this->expectExceptionMessage( 'nonce_failure' );
			Sgs_Variation_Picker::handle_activate();
		}

		// 3) handle_activate bails on capability failure.
		public function test_handle_activate_bails_without_capability(): void {
			\Wp_Options_Stub::$user_can = false;
			$_POST                      = array(
				Sgs_Variation_Picker::NONCE_NAME => 'valid_' . Sgs_Variation_Picker::NONCE_ACTION,
				'sgs_variation_slug'             => 'mamas-munches',
			);
			$this->expectException( \RuntimeException::class );
			$this->expectExceptionMessage( 'wp_die:' );
			Sgs_Variation_Picker::handle_activate();
		}

		// 4) COUNCIL N1: attacker injects post_id=999; handler ignores it and
		//    writes to the canonical resolver post (ID=42).
		public function test_handle_activate_ignores_malicious_post_id(): void {
			$_POST = array(
				Sgs_Variation_Picker::NONCE_NAME => 'valid_' . Sgs_Variation_Picker::NONCE_ACTION,
				'sgs_variation_slug'             => 'mamas-munches',
				'post_id'                        => 999,   // Attacker-supplied. MUST be ignored.
				'ID'                             => 999,   // Belt and braces.
			);

			Sgs_Variation_Picker::handle_activate();

			$this->assertArrayHasKey( 42, $GLOBALS['sgs_test_updated_posts'], 'Write target MUST be the resolver-returned canonical post (42).' );
			$this->assertArrayNotHasKey( 999, $GLOBALS['sgs_test_updated_posts'], 'Attacker-supplied post_id=999 must never be written to.' );
			$this->assertCount( 1, $GLOBALS['sgs_test_updated_posts'], 'Exactly one wp_update_post call expected.' );
		}

		// 5) Successful write contains the matched variation's JSON.
		public function test_handle_activate_writes_matched_variation_content(): void {
			$_POST = array(
				Sgs_Variation_Picker::NONCE_NAME => 'valid_' . Sgs_Variation_Picker::NONCE_ACTION,
				'sgs_variation_slug'             => 'helping-doctors',
			);

			Sgs_Variation_Picker::handle_activate();

			$this->assertArrayHasKey( 42, $GLOBALS['sgs_test_updated_posts'] );
			$call    = $GLOBALS['sgs_test_updated_posts'][42];
			$payload = json_decode( stripslashes( (string) $call['post_content'] ), true );
			$this->assertIsArray( $payload );
			$this->assertArrayNotHasKey( 'slug', $payload, 'Registry metadata must be stripped.' );
			$this->assertArrayNotHasKey( 'title', $payload, 'Registry metadata must be stripped.' );
			$this->assertArrayHasKey( 'settings', $payload );
			$this->assertArrayHasKey( 'styles', $payload );
			$this->assertStringContainsString( 'sgs_flash=activated', (string) $GLOBALS['sgs_test_last_redirect'] );
		}

		// 6) Migration backs up theme_mod when one exists.
		public function test_migration_backs_up_existing_theme_mod(): void {
			$GLOBALS['sgs_test_theme_mods'][ Sgs_Legacy_Theme_Mod_Migrator::LEGACY_THEME_MOD_KEY ] = 'mamas-munches';

			Sgs_Legacy_Theme_Mod_Migrator::maybe_migrate_legacy_theme_mod();

			$backup = \get_option( Sgs_Legacy_Theme_Mod_Migrator::LEGACY_BACKUP_OPTION );
			$this->assertIsArray( $backup );
			$this->assertSame( 'mamas-munches', $backup[ Sgs_Legacy_Theme_Mod_Migrator::LEGACY_THEME_MOD_KEY ] );
			$this->assertSame( 1716000000, $backup['backed_up_at'] );
			$this->assertSame( Sgs_Legacy_Theme_Mod_Migrator::SPEC_VERSION, $backup['spec_version'] );
			$this->assertArrayNotHasKey( Sgs_Legacy_Theme_Mod_Migrator::LEGACY_THEME_MOD_KEY, $GLOBALS['sgs_test_theme_mods'] ?? array(), 'theme_mod must be removed after backup.' );
		}

		// 7) Migration is idempotent — second call is a no-op.
		public function test_migration_is_idempotent(): void {
			$GLOBALS['sgs_test_theme_mods'][ Sgs_Legacy_Theme_Mod_Migrator::LEGACY_THEME_MOD_KEY ] = 'mamas-munches';
			Sgs_Legacy_Theme_Mod_Migrator::maybe_migrate_legacy_theme_mod();

			// Tamper with the backup to detect a second write.
			$initial_backup                = \get_option( Sgs_Legacy_Theme_Mod_Migrator::LEGACY_BACKUP_OPTION );
			$initial_backup['canary']      = 'untouched';
			\update_option( Sgs_Legacy_Theme_Mod_Migrator::LEGACY_BACKUP_OPTION, $initial_backup );

			Sgs_Legacy_Theme_Mod_Migrator::maybe_migrate_legacy_theme_mod();

			$after = \get_option( Sgs_Legacy_Theme_Mod_Migrator::LEGACY_BACKUP_OPTION );
			$this->assertSame( 'untouched', $after['canary'], 'Second migration call must not overwrite the existing backup.' );
		}

		// 8) restore_legacy_theme_mod re-sets the theme_mod from backup.
		public function test_restore_legacy_theme_mod_round_trip(): void {
			\update_option(
				Sgs_Legacy_Theme_Mod_Migrator::LEGACY_BACKUP_OPTION,
				array(
					Sgs_Legacy_Theme_Mod_Migrator::LEGACY_THEME_MOD_KEY => 'helping-doctors',
					'backed_up_at'                             => 1716000000,
					'spec_version'                             => Sgs_Legacy_Theme_Mod_Migrator::SPEC_VERSION,
				)
			);

			$result = Sgs_Legacy_Theme_Mod_Migrator::restore_legacy_theme_mod();

			$this->assertTrue( $result );
			$this->assertSame( 'helping-doctors', $GLOBALS['sgs_test_theme_mods'][ Sgs_Legacy_Theme_Mod_Migrator::LEGACY_THEME_MOD_KEY ] ?? null );
		}

		// 8b) restore_legacy_theme_mod returns false when no backup exists.
		public function test_restore_legacy_theme_mod_returns_false_without_backup(): void {
			$this->assertFalse( Sgs_Legacy_Theme_Mod_Migrator::restore_legacy_theme_mod() );
		}

		// 9) Unknown variation slug triggers the not_found flash and no write.
		public function test_unknown_slug_triggers_not_found_flash(): void {
			$_POST = array(
				Sgs_Variation_Picker::NONCE_NAME => 'valid_' . Sgs_Variation_Picker::NONCE_ACTION,
				'sgs_variation_slug'             => 'does-not-exist',
			);

			Sgs_Variation_Picker::handle_activate();

			$this->assertSame( array(), $GLOBALS['sgs_test_updated_posts'], 'No wp_update_post call when slug is unknown.' );
			$this->assertStringContainsString( 'sgs_flash=not_found', (string) $GLOBALS['sgs_test_last_redirect'] );
		}

		// Bonus — missing user-styles post triggers no_user_post flash.
		public function test_missing_user_styles_post_triggers_no_user_post_flash(): void {
			$GLOBALS['sgs_test_user_styles_post'] = null;
			$_POST                                = array(
				Sgs_Variation_Picker::NONCE_NAME => 'valid_' . Sgs_Variation_Picker::NONCE_ACTION,
				'sgs_variation_slug'             => 'mamas-munches',
			);

			Sgs_Variation_Picker::handle_activate();

			$this->assertSame( array(), $GLOBALS['sgs_test_updated_posts'] );
			$this->assertStringContainsString( 'sgs_flash=no_user_post', (string) $GLOBALS['sgs_test_last_redirect'] );
		}
	}
}
