<?php
/**
 * Tests for Migration 0002 — FR-S4-4 business-info lift.
 *
 * Verifies:
 *   1. Legacy `sgs_business_*` / `sgs_social_*` options are lifted into the
 *      Sgs_Site_Info store under the new dot-notation keys.
 *   2. The migration is idempotent — a second run never overwrites operator
 *      edits made after the first run.
 *
 * Uses the same lightweight WP function stubs as SiteInfoTest. The stubs
 * are defined in that file and loaded conditionally below.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// Re-use the Wp_Options_Stub + WP function stubs defined in SiteInfoTest.
require_once __DIR__ . '/SiteInfoTest.php';

use SGS\Blocks\Sgs_Site_Info;

// The migration file returns an array with an `up` closure. The closure
// body declares the worker functions (`sgs_migration_0002_*`) via a
// function_exists guard, then invokes the lift. We need the worker
// functions defined at file scope so the per-test calls below can invoke
// them directly; invoking the up closure once here achieves that. The
// data lift it triggers is wiped by Wp_Options_Stub::reset() in setUp().
$sgs_migration_0002 = require dirname( __DIR__, 2 ) . '/includes/migrations/0002-spec-17-foundation.php';
if ( is_array( $sgs_migration_0002 ) && isset( $sgs_migration_0002['up'] ) && is_callable( $sgs_migration_0002['up'] ) ) {
	( $sgs_migration_0002['up'] )();
}
unset( $sgs_migration_0002 );

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * PHPUnit test class for the FR-S4-4 business-info lift migration.
	 */
	final class BusinessInfoMigrationTest extends \PHPUnit\Framework\TestCase {

		/**
		 * Reset the in-memory option stub and re-register Site Info before each test.
		 */
		protected function setUp(): void {
			Wp_Options_Stub::reset();
			Sgs_Site_Info::register();
		}

		/**
		 * Flat key lift: phone, email, tagline.
		 */
		public function test_lifts_flat_business_keys(): void {
			update_option( 'sgs_business_phone', '+44 121 555 0100' );
			update_option( 'sgs_business_email', 'hello@example.com' );
			update_option( 'sgs_business_tagline', 'Fresh every day' );
			update_option( 'sgs_business_name', 'Example Ltd' );

			sgs_migration_0002_lift_business_info();

			$this->assertSame( '+44 121 555 0100', Sgs_Site_Info::get( 'phone' ) );
			$this->assertSame( 'hello@example.com', Sgs_Site_Info::get( 'email' ) );
			$this->assertSame( 'Fresh every day', Sgs_Site_Info::get( 'tagline' ) );
			$this->assertSame( 'Example Ltd', Sgs_Site_Info::get( 'copyright' ) );
		}

		/**
		 * Social URLs lift to socials.* dot-notation.
		 */
		public function test_lifts_social_urls(): void {
			update_option( 'sgs_social_facebook', 'https://facebook.com/example' );
			update_option( 'sgs_social_linkedin', 'https://linkedin.com/company/example' );

			sgs_migration_0002_lift_business_info();

			$this->assertStringStartsWith( 'https', (string) Sgs_Site_Info::get( 'socials.facebook' ) );
			$this->assertStringStartsWith( 'https', (string) Sgs_Site_Info::get( 'socials.linkedin' ) );
		}

		/**
		 * Address parts collapse into a single <br>-separated string.
		 */
		public function test_collapses_address_parts(): void {
			update_option( 'sgs_business_street', '1 High Street' );
			update_option( 'sgs_business_city', 'Birmingham' );
			update_option( 'sgs_business_postcode', 'B1 1AA' );
			update_option( 'sgs_business_country', 'United Kingdom' );

			sgs_migration_0002_lift_business_info();

			$address = (string) Sgs_Site_Info::get( 'address' );
			$this->assertStringContainsString( '1 High Street', $address );
			$this->assertStringContainsString( '<br>', $address );
			$this->assertStringContainsString( 'B1 1AA', $address );
		}

		/**
		 * Opening hours map from monday..sunday → mon..sun.
		 */
		public function test_lifts_opening_hours_with_day_remap(): void {
			update_option(
				'sgs_business_hours',
				array(
					'monday' => '09:00 - 17:00',
					'sunday' => 'Closed',
				)
			);

			sgs_migration_0002_lift_business_info();

			$this->assertSame( '09:00 - 17:00', Sgs_Site_Info::get( 'opening_hours.mon' ) );
			$this->assertSame( 'Closed', Sgs_Site_Info::get( 'opening_hours.sun' ) );
			$this->assertSame( '', Sgs_Site_Info::get( 'opening_hours.tue', '' ) );
		}

		/**
		 * Idempotency — second run does not overwrite operator edits.
		 */
		public function test_second_run_is_noop_and_preserves_operator_edits(): void {
			update_option( 'sgs_business_phone', '+44 121 555 0100' );

			// First run lifts the value.
			sgs_migration_0002_lift_business_info();
			$this->assertSame( '+44 121 555 0100', Sgs_Site_Info::get( 'phone' ) );

			// Operator edits via the admin form.
			Sgs_Site_Info::set( 'phone', '+44 121 999 0000' );
			$this->assertSame( '+44 121 999 0000', Sgs_Site_Info::get( 'phone' ) );

			// Second run must NOT overwrite the operator edit.
			sgs_migration_0002_lift_business_info();
			$this->assertSame( '+44 121 999 0000', Sgs_Site_Info::get( 'phone' ) );
		}

		/**
		 * CLI / WP-cron context — no logged-in user, current_user_can() returns
		 * false. Migration MUST still write via the internal set_internal() path.
		 */
		public function test_lift_writes_under_cli_context_with_no_user(): void {
			// Simulate WP-CLI / WP-cron: no logged-in user → cap check fails.
			Wp_Options_Stub::$user_can = false;

			update_option( 'sgs_business_phone', '+44 121 555 0100' );
			update_option( 'sgs_business_email', 'hello@example.com' );
			update_option( 'sgs_business_street', '1 High Street' );
			update_option( 'sgs_business_city', 'Birmingham' );

			sgs_migration_0002_lift_business_info();

			$this->assertSame( '+44 121 555 0100', Sgs_Site_Info::get( 'phone' ) );
			$this->assertSame( 'hello@example.com', Sgs_Site_Info::get( 'email' ) );
			$this->assertStringContainsString( '1 High Street', (string) Sgs_Site_Info::get( 'address' ) );
			$this->assertStringContainsString( 'Birmingham', (string) Sgs_Site_Info::get( 'address' ) );
		}

		/**
		 * Address parts are sanitised individually before concatenation —
		 * a part containing <script> is stripped, the surviving <br> separators
		 * remain intact.
		 */
		public function test_address_parts_are_sanitised_before_concatenation(): void {
			update_option( 'sgs_business_street', '<script>alert(1)</script>1 High Street' );
			update_option( 'sgs_business_city', 'Birmingham' );
			update_option( 'sgs_business_postcode', 'B1 1AA' );

			sgs_migration_0002_lift_business_info();

			$address = (string) Sgs_Site_Info::get( 'address' );

			// Surviving plain-text parts.
			$this->assertStringContainsString( '1 High Street', $address );
			$this->assertStringContainsString( 'Birmingham', $address );
			$this->assertStringContainsString( 'B1 1AA', $address );
			// <br> separators survive.
			$this->assertStringContainsString( '<br>', $address );
			// Script tag is stripped.
			$this->assertStringNotContainsString( '<script>', $address );
			$this->assertStringNotContainsString( '</script>', $address );
		}

		/**
		 * Empty / missing legacy options are skipped silently.
		 */
		public function test_missing_legacy_options_are_skipped(): void {
			// No legacy options written.
			sgs_migration_0002_lift_business_info();

			$this->assertSame( '', Sgs_Site_Info::get( 'phone', '' ) );
			$this->assertSame( '', Sgs_Site_Info::get( 'email', '' ) );
			$this->assertSame( array(), Sgs_Site_Info::all() );
		}
	}
}
