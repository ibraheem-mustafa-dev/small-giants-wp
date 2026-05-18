<?php
/**
 * Tests for Sgs_Header_Behaviours — body_class injection strategy (F4, Branch I).
 *
 * Self-contained: reuses the WP stub layer declared in SiteInfoTest.php and the
 * additional WP stubs / pattern-registry stubs declared in HeaderRulesTest.php
 * (both loaded first alphabetically, and required explicitly below).
 *
 * Covers:
 *   - add_body_classes always appends sgs-has-header
 *   - add_body_classes appends sgs-has-header-behaviour + sgs-header-behaviour-{slug}
 *     for each valid behaviour (transparent, sticky, hide-on-scroll-down)
 *   - add_body_classes does NOT append behaviour classes when no rule matches
 *   - add_body_classes does NOT append behaviour classes when rule has invalid slug
 *   - add_body_classes preserves existing classes unchanged
 *   - enqueue_assets does not enqueue in admin context
 *   - VALID_BEHAVIOURS constant contains correct slugs
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
use SGS\Blocks\Sgs_Header_Rules;

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
			Sgs_Header_Rules::reset_request_state();
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
			Sgs_Header_Rules::reset_request_state();
		}

		// ------------------------------------------------------------------
		// Helper: store a rule with zero conditions so rule_matches() = true.
		// ------------------------------------------------------------------

		/**
		 * Store a matching rule with the given behaviour directly in wp_options.
		 *
		 * @param string $behaviour Behaviour slug.
		 * @return void
		 */
		private function store_matching_rule( string $behaviour ): void {
			Wp_Options_Stub::set(
				'sgs_header_rules',
				array(
					array(
						'id'         => 'test_rule_001',
						'pattern'    => 'sgs/framework-header-default',
						'priority'   => 5,
						'behaviour'  => $behaviour,
						'conditions' => array(),
					),
				)
			);
		}

		// ------------------------------------------------------------------
		// VALID_BEHAVIOURS constant
		// ------------------------------------------------------------------

		/**
		 * VALID_BEHAVIOURS constant holds correct slugs.
		 *
		 * @return void
		 */
		public function test_valid_behaviours_constant(): void {
			$this->assertSame(
				array( 'transparent', 'sticky', 'hide-on-scroll-down' ),
				Sgs_Header_Behaviours::VALID_BEHAVIOURS
			);
		}

		// ------------------------------------------------------------------
		// add_body_classes — always appends sgs-has-header
		// ------------------------------------------------------------------

		/**
		 * Asserts sgs-has-header is always appended even with no rules stored.
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
		// add_body_classes — no rules stored → only sgs-has-header
		// ------------------------------------------------------------------

		/**
		 * No rules stored means no behaviour modifier classes are appended.
		 *
		 * @return void
		 */
		public function test_no_rules_adds_only_sgs_has_header(): void {
			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header', $result );
			$this->assertNotContains( 'sgs-has-header-behaviour', $result );
		}

		// ------------------------------------------------------------------
		// add_body_classes — sticky behaviour
		// ------------------------------------------------------------------

		/**
		 * Sticky rule injects sgs-has-header-behaviour and sgs-header-behaviour-sticky.
		 *
		 * @return void
		 */
		public function test_sticky_rule_adds_behaviour_classes(): void {
			$this->store_matching_rule( 'sticky' );

			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header', $result );
			$this->assertContains( 'sgs-has-header-behaviour', $result );
			$this->assertContains( 'sgs-header-behaviour-sticky', $result );
		}

		// ------------------------------------------------------------------
		// add_body_classes — transparent behaviour
		// ------------------------------------------------------------------

		/**
		 * Transparent rule injects correct behaviour classes.
		 *
		 * @return void
		 */
		public function test_transparent_rule_adds_behaviour_classes(): void {
			$this->store_matching_rule( 'transparent' );

			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header-behaviour', $result );
			$this->assertContains( 'sgs-header-behaviour-transparent', $result );
		}

		// ------------------------------------------------------------------
		// add_body_classes — hide-on-scroll-down behaviour
		// ------------------------------------------------------------------

		/**
		 * Hide-on-scroll-down rule injects correct behaviour classes.
		 *
		 * @return void
		 */
		public function test_hide_on_scroll_down_rule_adds_behaviour_classes(): void {
			$this->store_matching_rule( 'hide-on-scroll-down' );

			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header-behaviour', $result );
			$this->assertContains( 'sgs-header-behaviour-hide-on-scroll-down', $result );
		}

		// ------------------------------------------------------------------
		// add_body_classes — invalid behaviour slug → no modifier
		// ------------------------------------------------------------------

		/**
		 * Invalid behaviour slug — only sgs-has-header added, no modifier classes.
		 *
		 * @return void
		 */
		public function test_invalid_behaviour_slug_adds_only_sgs_has_header(): void {
			$this->store_matching_rule( 'shrink' );

			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header', $result );
			$this->assertNotContains( 'sgs-has-header-behaviour', $result );
			$this->assertNotContains( 'sgs-header-behaviour-shrink', $result );
		}

		// ------------------------------------------------------------------
		// add_body_classes — rule with no behaviour key → no modifier
		// ------------------------------------------------------------------

		/**
		 * Rule without behaviour key — only sgs-has-header added.
		 *
		 * @return void
		 */
		public function test_rule_without_behaviour_key_adds_only_sgs_has_header(): void {
			Wp_Options_Stub::set(
				'sgs_header_rules',
				array(
					array(
						'id'         => 'test_rule_002',
						'pattern'    => 'sgs/framework-header-default',
						'priority'   => 5,
						'conditions' => array(),
					),
				)
			);

			$result = Sgs_Header_Behaviours::add_body_classes( array() );

			$this->assertContains( 'sgs-has-header', $result );
			$this->assertNotContains( 'sgs-has-header-behaviour', $result );
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
