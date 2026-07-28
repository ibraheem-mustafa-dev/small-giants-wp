<?php
/**
 * Tests for Sgs_Header_Behaviours — body_class injection strategy (F4, FR-S9-9).
 *
 * Self-contained: reuses the WP stub layer declared in SiteInfoTest.php and the
 * additional WP stubs / pattern-registry stubs declared in HeaderRulesTest.php
 * (both loaded first alphabetically, and required explicitly below).
 *
 * SOURCE CHANGED (FR-S9-9): the behaviour source moved from a rule `behaviour`
 * field (dormant — Sgs_Header_Rules::add_rule() never stored one) to the
 * active header's `sgs/site-header` block attrs, resolved via
 * resolve_active_header_behaviour(). Since exercising that resolver for real
 * needs a live wp_template_part post + parse_blocks(), these tests instead use
 * the test-only injection hook Sgs_Header_Behaviours::set_test_behaviour() to
 * assert add_body_classes()'s CONTRACT: given a resolved contrast mode, it
 * emits the correct body class.
 *
 * SCOPE NARROWED (Spec 35 T1.4, 2026-07-28): sticky / transparent / shrink /
 * hide-on-scroll body classes are RETIRED from this class (they reshaped to
 * tri-state objects resolved per-instance in site-header/render.php instead —
 * see that class's docblock). This suite now covers CONTRAST only, plus the
 * always-on sgs-has-header hook class.
 *
 * Covers:
 *   - add_body_classes always appends sgs-has-header
 *   - contrast modes emit sgs-header-behaviour-contrast-{mode} + sgs-has-header-behaviour
 *   - contrast === 'none' → only sgs-has-header
 *   - add_body_classes preserves existing classes unchanged
 *   - enqueue_assets does not enqueue in admin context
 *
 * Run with: vendor/bin/phpunit --filter "HeaderBehavioursTest"
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// Bootstrap: load stub layers from earlier test files.
// HeaderBehavioursTest < HeaderRulesTest alphabetically, so we require both
// explicitly to guarantee all stubs (Wp_Options_Stub, WP_Block_Patterns_Registry,
// WP_Error, add_filter, esc_attr, is_admin, wp_enqueue_style, wp_enqueue_script,
// etc.) are declared before we load the production classes.
// ---------------------------------------------------------------------------

if ( ! class_exists( 'Wp_Options_Stub' ) ) {
	require_once __DIR__ . '/SiteInfoTest.php';
}

if ( ! class_exists( 'WP_Block_Patterns_Registry' ) ) {
	require_once __DIR__ . '/HeaderRulesTest.php';
}

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/tmp/' );
}

if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
	define( 'SGS_BLOCKS_PATH', __DIR__ . '/../../' );
}

if ( ! defined( 'SGS_BLOCKS_URL' ) ) {
	define( 'SGS_BLOCKS_URL', 'https://example.com/wp-content/plugins/sgs-blocks/' );
}

if ( ! defined( 'SGS_BLOCKS_VERSION' ) ) {
	define( 'SGS_BLOCKS_VERSION', '0.1.1' );
}

// Load the real Sgs_Header_Rules (already loaded by HeaderRulesTest, but
// the require_once guard prevents double-loading).
require_once __DIR__ . '/../../includes/class-sgs-header-rules-redos-guard.php';
require_once __DIR__ . '/../../includes/class-sgs-header-rules.php';

require_once __DIR__ . '/../../includes/class-sgs-header-behaviours.php';

use SGS\Blocks\Sgs_Header_Behaviours;

// ---------------------------------------------------------------------------
// Test class.
// ---------------------------------------------------------------------------

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * Test suite for Sgs_Header_Behaviours body_class injection.
	 *
	 * @covers \SGS\Blocks\Sgs_Header_Behaviours
	 */
	class HeaderBehavioursTest extends \PHPUnit\Framework\TestCase {

		/**
		 * Reset global state before each test.
		 *
		 * @return void
		 */
		protected function setUp(): void {
			$GLOBALS['sgs_test_is_admin']         = false;
			$GLOBALS['sgs_test_enqueued_styles']  = array();
			$GLOBALS['sgs_test_enqueued_scripts'] = array();
			Wp_Options_Stub::reset();
			Sgs_Header_Behaviours::reset_request_cache();
		}

		/**
		 * Restore global state after each test.
		 *
		 * @return void
		 */
		protected function tearDown(): void {
			$GLOBALS['sgs_test_is_admin']         = false;
			$GLOBALS['sgs_test_enqueued_styles']  = array();
			$GLOBALS['sgs_test_enqueued_scripts'] = array();
			Wp_Options_Stub::reset();
			Sgs_Header_Behaviours::reset_request_cache();
		}

		// ------------------------------------------------------------------
		// add_body_classes — always appends sgs-has-header
		// ------------------------------------------------------------------

		/**
		 * Asserts sgs-has-header is always appended even with no flags active.
		 *
		 * @return void
		 */
		public function test_always_adds_sgs_has_header(): void {
			$result = Sgs_Header_Behaviours::add_body_classes( array( 'home' ) );

			$this->assertContains( 'sgs-has-header', $result );
		}

		/**
		 * Pre-existing classes are preserved alongside the new SGS classes.
		 *
		 * @return void
		 */
		public function test_existing_classes_preserved(): void {
			$result = Sgs_Header_Behaviours::add_body_classes( array( 'home', 'logged-in' ) );

			$this->assertContains( 'home', $result );
			$this->assertContains( 'logged-in', $result );
			$this->assertContains( 'sgs-has-header', $result );
		}

		// ------------------------------------------------------------------
		// add_body_classes — no active flags → only sgs-has-header
		// ------------------------------------------------------------------

		/**
		 * No active behaviour flags means no modifier classes are appended.
		 *
		 * @return void
		 */
		public function test_no_flags_adds_only_sgs_has_header(): void {
			Sgs_Header_Behaviours::set_test_behaviour(
				array(
					'contrast' => 'none',
				)
			);

			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header', $result );
			$this->assertNotContains( 'sgs-has-header-behaviour', $result );
		}

		/**
		 * With no test override injected, the real resolver runs and finds no
		 * header template part in the test environment — degrades to
		 * all-false rather than erroring.
		 *
		 * @return void
		 */
		public function test_no_override_degrades_to_only_sgs_has_header(): void {
			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header', $result );
			$this->assertNotContains( 'sgs-has-header-behaviour', $result );
		}

		// ------------------------------------------------------------------
		// add_body_classes — contrast-safe modes
		// (sticky / transparent / shrink / hide-on-scroll RETIRED from this
		// class at Spec 35 T1.4 — see class docblock. Their per-tier CSS is
		// now asserted against sgs/site-header/render.php, not body classes.)
		// ------------------------------------------------------------------

		/**
		 * Each valid contrast mode emits its own sgs-header-behaviour-contrast-{mode} class.
		 *
		 * @return void
		 */
		public function test_contrast_modes_add_correct_class(): void {
			foreach ( array( 'scrim', 'shadow', 'force-solid' ) as $mode ) {
				Sgs_Header_Behaviours::reset_request_cache();
				Sgs_Header_Behaviours::set_test_behaviour( array( 'contrast' => $mode ) );

				$result = Sgs_Header_Behaviours::add_body_classes( array() );

				$this->assertContains( 'sgs-header-behaviour-contrast-' . $mode, $result );
				$this->assertContains( 'sgs-has-header-behaviour', $result );
			}
		}

		/**
		 * Contrast === 'none' emits no contrast class.
		 *
		 * @return void
		 */
		public function test_contrast_none_adds_no_contrast_class(): void {
			Sgs_Header_Behaviours::set_test_behaviour( array( 'contrast' => 'none' ) );

			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			foreach ( array( 'scrim', 'shadow', 'force-solid' ) as $mode ) {
				$this->assertNotContains( 'sgs-header-behaviour-contrast-' . $mode, $result );
			}
		}

		// ------------------------------------------------------------------
		// enqueue_assets — no-op in admin context
		// ------------------------------------------------------------------

		/**
		 * Asserts enqueue_assets is a no-op in admin context.
		 *
		 * @return void
		 */
		public function test_enqueue_assets_no_op_in_admin(): void {
			$GLOBALS['sgs_test_is_admin'] = true;

			Sgs_Header_Behaviours::enqueue_assets();

			$this->assertEmpty( $GLOBALS['sgs_test_enqueued_styles'] );
			$this->assertEmpty( $GLOBALS['sgs_test_enqueued_scripts'] );
		}
	}
}
