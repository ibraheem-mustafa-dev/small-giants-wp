<?php
/**
 * Tests for Sgs_Site_Info_Admin — FR-S4-3 settings page.
 *
 * Self-contained: reuses the WP stub layer from SiteInfoTest.php (declared
 * first in the test suite, so its function definitions are already loaded
 * by the time this file runs). Each test resets Wp_Options_Stub between runs.
 *
 * Covers:
 *   - Capability gating (sanitiser refuses to write when current_user_can fails)
 *   - Reserved-key block (custom field with reserved key is rejected)
 *   - Invalid-key rejection (<script>, uppercase, etc.)
 *   - Sanitiser per field type (phone, email, URL, address)
 *   - Logo deep-link URL renders inside the Identity section
 *
 * Run with: vendor/bin/phpunit tests/php/SiteInfoAdminTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// Additional WP stubs the admin class touches that aren't in SiteInfoTest.php.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}
if ( ! function_exists( 'add_submenu_page' ) ) {
	function add_submenu_page(): string {
		return 'sgs-site-info';
	}
}
if ( ! function_exists( 'register_setting' ) ) {
	function register_setting( $group, $key, $args = array() ): void {
		$GLOBALS['sgs_test_registered_settings'][] = compact( 'group', 'key', 'args' );
	}
}
if ( ! function_exists( 'wp_enqueue_script' ) ) {
	function wp_enqueue_script( $handle, $src = '', $deps = array(), $ver = false, $in_footer = false ): void {
		$GLOBALS['sgs_test_enqueued_scripts'][ $handle ] = compact( 'handle', 'src', 'deps', 'ver', 'in_footer' );
	}
}
if ( ! function_exists( 'wp_enqueue_style' ) ) {
	function wp_enqueue_style( $handle, $src = '', $deps = array(), $ver = false ): void {
		$GLOBALS['sgs_test_enqueued_styles'][ $handle ] = compact( 'handle', 'src', 'deps', 'ver' );
	}
}
if ( ! function_exists( 'plugins_url' ) ) {
	function plugins_url( string $path = '', string $plugin = '' ): string {
		return 'https://example.test/wp-content/plugins/sgs-blocks/' . ltrim( $path, '/' );
	}
}
if ( ! function_exists( 'get_current_user_id' ) ) {
	function get_current_user_id(): int {
		return (int) ( $GLOBALS['sgs_test_current_user_id'] ?? 1 );
	}
}
if ( ! function_exists( 'get_user_meta' ) ) {
	function get_user_meta( int $user_id, string $key, bool $single = true ) {
		$value = $GLOBALS['sgs_test_user_meta'][ $user_id ][ $key ] ?? '';
		return $single ? $value : ( $value === '' ? array() : array( $value ) );
	}
}
if ( ! function_exists( 'update_user_meta' ) ) {
	function update_user_meta( int $user_id, string $key, $value ): bool {
		$GLOBALS['sgs_test_user_meta'][ $user_id ][ $key ] = $value;
		return true;
	}
}
if ( ! function_exists( 'wp_nonce_url' ) ) {
	function wp_nonce_url( string $url, string $action ): string {
		return $url . ( false === strpos( $url, '?' ) ? '?' : '&' ) . '_wpnonce=test_' . md5( $action );
	}
}
if ( ! function_exists( 'add_query_arg' ) ) {
	function add_query_arg( $args, string $url ): string {
		$qs = http_build_query( (array) $args );
		return $url . ( false === strpos( $url, '?' ) ? '?' : '&' ) . $qs;
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string {
		return htmlspecialchars( (string) $url, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'add_settings_section' ) ) {
	function add_settings_section(): void {}
}
if ( ! function_exists( 'add_settings_field' ) ) {
	function add_settings_field(): void {}
}
if ( ! function_exists( 'add_settings_error' ) ) {
	function add_settings_error( $setting, $code, $message ): void {
		$GLOBALS['sgs_test_settings_errors'][] = compact( 'setting', 'code', 'message' );
	}
}
if ( ! function_exists( 'get_theme_mod' ) ) {
	function get_theme_mod( string $key, $default = false ) {
		return $GLOBALS['sgs_test_theme_mods'][ $key ] ?? $default;
	}
}
if ( ! function_exists( 'wp_get_attachment_image_url' ) ) {
	function wp_get_attachment_image_url( int $id, string $size = 'thumbnail' ): string {
		return $id > 0 ? "https://example.test/logo-{$id}-{$size}.png" : '';
	}
}
if ( ! function_exists( 'admin_url' ) ) {
	function admin_url( string $path = '' ): string {
		return 'https://example.test/wp-admin/' . ltrim( $path, '/' );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $value ): string {
		return htmlspecialchars( (string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( string $text, string $domain = '' ): string {
		return esc_attr( $text );
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( string $text, string $domain = '' ): string {
		return esc_html( $text );
	}
}
if ( ! function_exists( 'esc_textarea' ) ) {
	function esc_textarea( $value ): string {
		return htmlspecialchars( (string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = '' ): string {
		return $text;
	}
}

// Load the class under test (SiteInfoTest.php is loaded first by phpunit
// alphabetical ordering and provides the Sgs_Site_Info stubs + class).
require_once __DIR__ . '/SiteInfoTest.php';
require_once __DIR__ . '/../../includes/class-sgs-site-info-admin-fields.php';
require_once __DIR__ . '/../../includes/class-sgs-site-info-admin.php';
require_once __DIR__ . '/../../includes/class-sgs-site-info-admin-notices.php';

use SGS\Blocks\Sgs_Site_Info;
use SGS\Blocks\Sgs_Site_Info_Admin;
use SGS\Blocks\Sgs_Site_Info_Admin_Fields;
use SGS\Blocks\Sgs_Site_Info_Admin_Notices;

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * @covers \SGS\Blocks\Sgs_Site_Info_Admin
	 */
	class SiteInfoAdminTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			\Wp_Options_Stub::reset();
			$GLOBALS['sgs_test_settings_errors']    = array();
			$GLOBALS['sgs_test_theme_mods']         = array();
			$GLOBALS['sgs_test_registered_settings'] = array();
			$GLOBALS['sgs_test_enqueued_scripts']   = array();
			$GLOBALS['sgs_test_enqueued_styles']    = array();
			$GLOBALS['sgs_test_user_meta']          = array();
			$GLOBALS['sgs_test_current_user_id']    = 1;
			\Wp_Options_Stub::$user_can             = true;
			Sgs_Site_Info::register();
		}

		// --- Constants are stable (consumed by the bootstrap require_once) ---
		public function test_constants_match_spec(): void {
			$this->assertSame( 'sgs-site-info', Sgs_Site_Info_Admin::PAGE_SLUG );
			$this->assertSame( 'edit_theme_options', Sgs_Site_Info_Admin::CAP );
		}

		// --- Capability gating: non-admin POST is dropped silently ---
		public function test_sanitise_submission_blocked_for_non_admin(): void {
			\Wp_Options_Stub::$user_can = false;
			$result                     = Sgs_Site_Info_Admin::sanitise_submission( array( 'phone' => '01234' ) );
			$this->assertIsArray( $result );
			$this->assertSame( '', Sgs_Site_Info::get( 'phone' ) );
		}

		// --- Non-array payload short-circuits without writes ---
		public function test_sanitise_submission_ignores_non_array_payload(): void {
			$result = Sgs_Site_Info_Admin::sanitise_submission( 'malicious-string' );
			$this->assertSame( array(), $result );
		}

		// --- Reserved-key custom field is rejected (and an error is queued) ---
		public function test_custom_field_with_reserved_key_rejected(): void {
			$result = Sgs_Site_Info_Admin::sanitise_submission(
				array(
					'custom' => array(
						array(
							'key'   => 'sgs_framework_version',
							'value' => '9.9.9',
						),
					),
				)
			);
			$this->assertArrayNotHasKey( 'sgs_framework_version', $result );
			$this->assertNotEmpty( $GLOBALS['sgs_test_settings_errors'] );
			$this->assertSame( 'sgs_site_info_invalid_key', $GLOBALS['sgs_test_settings_errors'][0]['code'] );
		}

		// --- Custom-key allowlist blocks <script>, uppercase, hyphens ---
		public function test_invalid_custom_keys_rejected(): void {
			foreach ( array( '<script>', 'CamelCase', 'has-hyphen', 'has.dot', 'has space' ) as $bad_key ) {
				$this->assertFalse(
					Sgs_Site_Info_Admin::is_valid_custom_key( $bad_key ),
					"Key '{$bad_key}' must be rejected"
				);
			}
		}

		// --- Empty key is rejected (would otherwise call set('') and fail downstream) ---
		public function test_empty_custom_key_rejected(): void {
			$this->assertFalse( Sgs_Site_Info_Admin::is_valid_custom_key( '' ) );
		}

		// --- Valid custom keys pass and round-trip ---
		public function test_valid_custom_key_round_trips(): void {
			$this->assertTrue( Sgs_Site_Info_Admin::is_valid_custom_key( 'licence_number' ) );
			Sgs_Site_Info_Admin::sanitise_submission(
				array(
					'custom' => array(
						array(
							'key'   => 'licence_number',
							'value' => 'AB-12345',
						),
					),
				)
			);
			$this->assertSame( 'AB-12345', Sgs_Site_Info::get( 'licence_number' ) );
		}

		// --- All 5 reserved keys are blocked ---
		public function test_all_reserved_keys_blocked(): void {
			$reserved = array(
				'sgs_framework_version',
				'sgs_migrations_completed',
				'sgs_seeding_armed_at',
				'sgs_legacy_theme_mods_backup',
				'sgs_site_info_schema_version',
			);
			foreach ( $reserved as $key ) {
				$this->assertFalse(
					Sgs_Site_Info_Admin::is_valid_custom_key( $key ),
					"Reserved key '{$key}' must be rejected"
				);
			}
		}

		// --- Phone uses sanitize_text_field (strips tags) ---
		public function test_phone_sanitisation(): void {
			Sgs_Site_Info_Admin::sanitise_submission( array( 'phone' => '<b>0121</b> 000' ) );
			$this->assertSame( '0121 000', Sgs_Site_Info::get( 'phone' ) );
		}

		// --- Email uses sanitize_email (filters illegal chars) ---
		public function test_email_sanitisation(): void {
			Sgs_Site_Info_Admin::sanitise_submission( array( 'email' => 'hello@example.com' ) );
			$this->assertSame( 'hello@example.com', Sgs_Site_Info::get( 'email' ) );
		}

		// --- Social URL goes through esc_url_raw ---
		public function test_social_url_sanitisation(): void {
			Sgs_Site_Info_Admin::sanitise_submission(
				array(
					'socials' => array( 'facebook' => 'https://facebook.com/example' ),
				)
			);
			$this->assertStringStartsWith( 'https', Sgs_Site_Info::get( 'socials.facebook' ) );
		}

		// --- Address wp_kses strips disallowed tags but keeps <br> ---
		public function test_address_strips_disallowed_tags(): void {
			Sgs_Site_Info_Admin::sanitise_submission(
				array( 'address' => 'Line 1<br>Line 2<script>alert(1)</script>' )
			);
			$saved = Sgs_Site_Info::get( 'address' );
			$this->assertStringContainsString( '<br>', $saved );
			$this->assertStringNotContainsString( '<script>', $saved );
		}

		// --- Opening-hours dot-notation round-trip ---
		public function test_opening_hours_round_trip(): void {
			Sgs_Site_Info_Admin::sanitise_submission(
				array(
					'opening_hours' => array(
						'mon' => '09:00-17:30',
						'sun' => 'Closed',
					),
				)
			);
			$this->assertSame( '09:00-17:30', Sgs_Site_Info::get( 'opening_hours.mon' ) );
			$this->assertSame( 'Closed', Sgs_Site_Info::get( 'opening_hours.sun' ) );
		}

		// --- Identity section renders deep-link to the Site Editor ---
		public function test_identity_section_renders_site_editor_link(): void {
			ob_start();
			Sgs_Site_Info_Admin_Fields::render_identity_section();
			$html = (string) ob_get_clean();
			$this->assertStringContainsString( 'site-editor.php', $html );
			$this->assertStringContainsString( 'Set logo in Site Editor', $html );
		}

		// --- Identity section shows the logo preview when custom_logo is set ---
		public function test_identity_section_renders_logo_preview_when_set(): void {
			$GLOBALS['sgs_test_theme_mods']['custom_logo'] = 42;
			ob_start();
			Sgs_Site_Info_Admin_Fields::render_identity_section();
			$html = (string) ob_get_clean();
			$this->assertStringContainsString( 'logo-42-medium.png', $html );
		}

		// --- Identity section falls back to a no-logo message when unset ---
		public function test_identity_section_no_logo_message(): void {
			ob_start();
			Sgs_Site_Info_Admin_Fields::render_identity_section();
			$html = (string) ob_get_clean();
			$this->assertStringContainsString( 'No site logo set', $html );
		}

		// --- W1: register_setting passed show_in_rest => false ---
		public function test_register_setting_keeps_option_out_of_rest(): void {
			Sgs_Site_Info_Admin::register_settings();
			$found = null;
			foreach ( $GLOBALS['sgs_test_registered_settings'] as $entry ) {
				if ( Sgs_Site_Info::OPTION_KEY === $entry['key'] ) {
					$found = $entry;
					break;
				}
			}
			$this->assertNotNull( $found, 'register_setting was never called for the Site Info option' );
			$this->assertArrayHasKey( 'show_in_rest', $found['args'] );
			$this->assertFalse( $found['args']['show_in_rest'], 'show_in_rest must be false to keep contact data out of /wp/v2/settings' );
		}

		// --- W2: social-platform labels are translatable, not bare ucfirst() ---
		public function test_social_platform_labels_are_translatable_map(): void {
			$labels = Sgs_Site_Info_Admin::social_platform_labels();
			$this->assertIsArray( $labels );
			foreach ( array( 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'whatsapp' ) as $platform ) {
				$this->assertArrayHasKey( $platform, $labels, "Missing label for {$platform}" );
				$this->assertNotEmpty( $labels[ $platform ] );
			}
			// Specific labels must NOT just be ucfirst() — they're either the same casing as the brand or contain extra chars.
			$this->assertSame( 'Twitter / X', $labels['twitter'], 'Twitter label must include the X brand split' );
			$this->assertSame( 'LinkedIn', $labels['linkedin'], 'LinkedIn must preserve brand casing — ucfirst() would yield "Linkedin"' );
			$this->assertSame( 'YouTube', $labels['youtube'], 'YouTube must preserve brand casing — ucfirst() would yield "Youtube"' );
			$this->assertSame( 'TikTok', $labels['tiktok'], 'TikTok must preserve brand casing — ucfirst() would yield "Tiktok"' );
			$this->assertSame( 'WhatsApp', $labels['whatsapp'], 'WhatsApp must preserve brand casing — ucfirst() would yield "Whatsapp"' );
		}

		// --- U3: deprecated-blocks notice methods exist on the notices class ---
		public function test_dismiss_floating_ui_notice_methods_exist(): void {
			$this->assertTrue( method_exists( Sgs_Site_Info_Admin_Notices::class, 'maybe_show_deprecated_blocks_notice' ) );
			$this->assertTrue( method_exists( Sgs_Site_Info_Admin_Notices::class, 'handle_dismiss_floating_ui_notice' ) );
			$this->assertSame( 'sgs_site_info_dismiss_floating_ui', Sgs_Site_Info_Admin_Notices::DISMISS_FLOATING_UI_ACTION );
			$this->assertSame( 'sgs_dismissed_floating_ui_notice', Sgs_Site_Info_Admin_Notices::DISMISS_FLOATING_UI_META );
		}

		// --- U3: notice renders for capable user who has not dismissed ---
		public function test_floating_ui_notice_renders_for_capable_user(): void {
			\Wp_Options_Stub::$user_can = true;
			$GLOBALS['sgs_test_current_user_id'] = 7;
			ob_start();
			Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice();
			$html = (string) ob_get_clean();
			$this->assertStringContainsString( 'Floating UI', $html );
			$this->assertStringContainsString( 'Dismiss', $html );
			$this->assertStringContainsString( 'sgs_site_info_dismiss_floating_ui', $html );
		}

		// --- U3: notice is suppressed once user meta records dismissal ---
		public function test_floating_ui_notice_suppressed_after_dismissal(): void {
			\Wp_Options_Stub::$user_can = true;
			$GLOBALS['sgs_test_current_user_id'] = 7;
			$GLOBALS['sgs_test_user_meta'][7][ Sgs_Site_Info_Admin_Notices::DISMISS_FLOATING_UI_META ] = 1;
			ob_start();
			Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice();
			$html = (string) ob_get_clean();
			$this->assertSame( '', $html, 'Notice must not render once dismissed' );
		}

		// --- U3: notice is suppressed for users without edit_theme_options ---
		public function test_floating_ui_notice_suppressed_without_capability(): void {
			\Wp_Options_Stub::$user_can = false;
			$GLOBALS['sgs_test_current_user_id'] = 7;
			ob_start();
			Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice();
			$html = (string) ob_get_clean();
			$this->assertSame( '', $html );
		}
	}
}
