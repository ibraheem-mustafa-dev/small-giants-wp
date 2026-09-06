<?php
/**
 * Tests for Sgs_Header_Behaviours — body_class injection strategy (F4, FR-S9-9).
 *
 * Self-contained: reuses the WP stub layer declared in SiteInfoTest.php and the
 * additional WP stubs / pattern-registry stubs declared in HeaderRulesTest.php
 * (both loaded first alphabetically, and required explicitly below).
 *
 * SCOPE NARROWED TWICE, and this suite shrank with it:
 *
 *  - 2026-07-28 (Spec 35 T1.4) — sticky / transparent / shrink / hide-on-scroll
 *    body classes retired; they reshaped into tri-state objects resolved
 *    per-instance in site-header/render.php.
 *  - 2026-08-19 — contrastSafe followed them, for the same structural reason
 *    (it went per-device, and a <body> class is site-wide) plus a policy one:
 *    the resolver here silently rewrote a client's explicit 'none' to 'scrim',
 *    which breached the rule that operator accessibility failures are notices,
 *    never enforcement. Deleted with it: resolve_active_header_behaviour(), its
 *    second parse_blocks() of the header template part, the per-request cache,
 *    and the set_test_behaviour() injection hook these tests used to drive.
 *
 * The class now emits exactly one body class, so this suite asserts exactly
 * that — and guards the removal, since the defect being removed was a SILENT
 * override, the kind that reappears unnoticed.
 *
 * Covers:
 *   - add_body_classes always appends sgs-has-header
 *   - NO behaviour or contrast class is emitted any more (regression guard —
 *     contrastSafe moved to per-instance scoped CSS on 2026-08-19, along with
 *     the silent 'none' -> 'scrim' override that used to live in the resolver)
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
		// add_body_classes — emits sgs-has-header and NOTHING ELSE
		//
		// REWRITTEN 2026-08-19. The tests here previously asserted
		// `sgs-header-behaviour-contrast-{mode}` and `sgs-has-header-behaviour`
		// via the test-injection hook. All of that is deleted: contrastSafe went
		// per-device and moved to per-instance scoped CSS in
		// sgs/site-header/render.php, taking the resolver, its second
		// parse_blocks() of the header template part, and the injection hook
		// with it. See the class docblock.
		//
		// What replaces them is deliberately a REGRESSION GUARD rather than
		// nothing. The old contrast path did not merely emit a class — it
		// SILENTLY overrode the client's explicit choice, which is the defect
		// this change exists to remove. A test asserting that this class emits
		// exactly one body class is what would fail if that behaviour, or any
		// successor to it, were reintroduced here.
		// ------------------------------------------------------------------

		/**
		 * add_body_classes appends sgs-has-header and no other class.
		 *
		 * @return void
		 */
		public function test_adds_only_the_sgs_has_header_hook_class(): void {
			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertSame( array( 'sgs-has-header' ), $result );
		}

		/**
		 * No behaviour or contrast class is emitted by this class any more.
		 *
		 * Guards the removal itself: contrastSafe's modes are per-instance
		 * scoped CSS now, so a body class reappearing here would mean the
		 * site-wide path (and with it the silent-override defect) had returned.
		 *
		 * @return void
		 */
		public function test_emits_no_behaviour_or_contrast_body_class(): void {
			$result = Sgs_Header_Behaviours::add_body_classes( array( 'home' ) );

			$this->assertNotContains( 'sgs-has-header-behaviour', $result );
			foreach ( array( 'scrim', 'shadow', 'force-solid' ) as $mode ) {
				$this->assertNotContains( 'sgs-header-behaviour-contrast-' . $mode, $result );
			}
			foreach ( array( 'sticky', 'transparent', 'shrink', 'hide-on-scroll-down' ) as $slug ) {
				$this->assertNotContains( 'sgs-header-behaviour-' . $slug, $result );
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
