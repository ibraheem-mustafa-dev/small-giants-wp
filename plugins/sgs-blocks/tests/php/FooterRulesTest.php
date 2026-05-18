<?php
/**
 * Tests for Sgs_Footer_Rules engine — FR-S3-3, Spec 17 Wave 2.
 *
 * Self-contained: reuses the WP stub layer from SiteInfoTest.php (loaded first
 * by PHPUnit's alphabetical order). Wp_Options_Stub + all core WP function stubs
 * are already declared by the time this file runs.
 *
 * Also reuses WP_Block_Patterns_Registry and additional stubs declared by
 * HeaderRulesTest.php (loaded before FooterRulesTest.php alphabetically).
 *
 * Covers:
 *   - add_rule writes to sgs_footer_rules (not sgs_header_rules)
 *   - remove_rule removes from sgs_footer_rules
 *   - list_rules always includes the immutable default
 *   - remove_rule refuses to remove the default
 *   - evaluate returns default pattern HTML when no operator rules match
 *   - evaluate returns first-match rule's pattern HTML when a rule matches
 *   - evaluate AND-evaluates conditions within a rule
 *   - evaluate short-circuits after first match per request
 *   - footer and header options keys are completely independent
 *
 * Run with: vendor/bin/phpunit --filter "FooterRulesTest"
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// Bootstrap: load stub layers declared by earlier test files (alphabetical
// PHPUnit order: FooterRulesTest < HeaderRulesTest < SiteInfoTest is wrong —
// Footer > Header > Site alphabetically, so we require explicitly to be safe).
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

require_once __DIR__ . '/../../includes/class-sgs-footer-rules.php';

use SGS\Blocks\Sgs_Footer_Rules;

// ---------------------------------------------------------------------------
// Test class.
// ---------------------------------------------------------------------------

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * Unit tests for the Sgs_Footer_Rules engine (FR-S3-3, Spec 17 Wave 2).
	 *
	 * @covers \SGS\Blocks\Sgs_Footer_Rules
	 */
	class FooterRulesTest extends \PHPUnit\Framework\TestCase {

		/**
		 * Reset shared state before each test.
		 */
		protected function setUp(): void {
			Wp_Options_Stub::reset();
			WP_Block_Patterns_Registry::reset();
			Sgs_Footer_Rules::reset_request_state();
			$GLOBALS['sgs_test_post_type']     = '';
			$GLOBALS['sgs_test_template_slug'] = '';
			$GLOBALS['sgs_test_user_roles']    = array();
			unset( $_SERVER['REQUEST_URI'] );
		}

		/**
		 * Add_rule with valid input writes to sgs_footer_rules (not sgs_header_rules).
		 */
		public function test_add_rule_writes_to_footer_options(): void {
			$id = Sgs_Footer_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/custom-footer',
					'priority'     => 5,
					'conditions'   => array(),
				)
			);
			$this->assertIsString( $id );
			$this->assertStringStartsWith( 'rule_', $id );

			$rules = Sgs_Footer_Rules::list_rules();
			$slugs = array_column( $rules, 'pattern_slug' );
			$this->assertContains( 'sgs/custom-footer', $slugs );

			// Confirm the write went to the footer key, not the header key.
			$footer_raw = get_option( Sgs_Footer_Rules::OPTION_KEY );
			$this->assertIsArray( $footer_raw );
			$header_raw = get_option( 'sgs_header_rules', array() );
			$this->assertSame( array(), $header_raw );
		}

		/**
		 * Remove_rule by id removes the rule from sgs_footer_rules.
		 */
		public function test_remove_rule_removes_from_options(): void {
			$id = Sgs_Footer_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/promo-footer',
					'conditions'   => array(),
				)
			);
			$this->assertIsString( $id );

			$result = Sgs_Footer_Rules::remove_rule( $id );
			$this->assertTrue( $result );

			$rules = Sgs_Footer_Rules::list_rules();
			$ids   = array_column( $rules, 'id' );
			$this->assertNotContains( $id, $ids );
		}

		/**
		 * List_rules always includes the immutable default rule.
		 */
		public function test_list_rules_includes_default(): void {
			$rules = Sgs_Footer_Rules::list_rules();
			$ids   = array_column( $rules, 'id' );
			$this->assertContains( Sgs_Footer_Rules::DEFAULT_RULE_ID, $ids );
		}

		/**
		 * Attempt to remove the default rule returns WP_Error.
		 */
		public function test_remove_default_rule_returns_wp_error(): void {
			$result = Sgs_Footer_Rules::remove_rule( Sgs_Footer_Rules::DEFAULT_RULE_ID );
			$this->assertInstanceOf( \WP_Error::class, $result );
			$this->assertSame( 'sgs_footer_rules_default_immutable', $result->get_error_code() );
		}

		/**
		 * Evaluate returns the default pattern HTML when no operator rules match.
		 */
		public function test_evaluate_returns_default_pattern_html_when_no_rules_match(): void {
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Footer_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<footer class="default">Default footer</footer>' )
			);
			$html = Sgs_Footer_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'Default footer', $html );
		}

		/**
		 * Evaluate returns first-match rule pattern HTML when a rule matches.
		 */
		public function test_evaluate_returns_matching_rule_pattern_html(): void {
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/shop-footer',
				array( 'content' => '<footer class="shop">Shop footer</footer>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Footer_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<footer class="default">Default footer</footer>' )
			);

			Sgs_Footer_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/shop-footer',
					'priority'     => 5,
					'conditions'   => array(
						array(
							'type'  => 'post_type',
							'value' => 'product',
						),
					),
				)
			);

			$GLOBALS['sgs_test_post_type'] = 'product';
			$html                          = Sgs_Footer_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'Shop footer', $html );
		}

		/**
		 * Evaluate AND-evaluates conditions within a rule.
		 */
		public function test_evaluate_and_conditions_within_rule(): void {
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/product-page-footer',
				array( 'content' => '<footer class="product-page">Product page footer</footer>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Footer_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<footer class="default">Default footer</footer>' )
			);

			// Rule requires BOTH post_type AND url_match to match.
			Sgs_Footer_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/product-page-footer',
					'priority'     => 5,
					'conditions'   => array(
						array(
							'type'  => 'post_type',
							'value' => 'product',
						),
						array(
							// Use bare forward slashes — the production code wraps the
							// value in /…/ delimiters and escapes internal slashes via
							// str_replace( '/', '\/', $value ). A pre-escaped value like
							// '^\/shop\/' would produce /^\\\/shop\\\//, which never
							// matches. '^/shop/' becomes /^\/shop\// correctly.
							'type'  => 'url_match',
							'value' => '^/shop/',
						),
					),
				)
			);

			// Only post_type matches — rule should NOT fire.
			$GLOBALS['sgs_test_post_type'] = 'product';
			$_SERVER['REQUEST_URI']        = '/about/';
			$html                          = Sgs_Footer_Rules::evaluate();
			$this->assertStringNotContainsString( 'Product page footer', (string) $html );

			// Reset short-circuit so we can test the positive case.
			Sgs_Footer_Rules::reset_request_state();

			// Both conditions match — rule SHOULD fire.
			$_SERVER['REQUEST_URI'] = '/shop/widgets/';
			$html                   = Sgs_Footer_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'Product page footer', $html );
		}

		/**
		 * Evaluate short-circuits after first match per request.
		 */
		public function test_evaluate_short_circuits_after_first_match(): void {
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/first-match-footer',
				array( 'content' => '<footer class="first">First match</footer>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/second-match-footer',
				array( 'content' => '<footer class="second">Second match</footer>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Footer_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<footer class="default">Default footer</footer>' )
			);

			// Two unconditional operator rules — first (lower priority) should win.
			Sgs_Footer_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/first-match-footer',
					'priority'     => 1,
					'conditions'   => array(),
				)
			);
			Sgs_Footer_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/second-match-footer',
					'priority'     => 2,
					'conditions'   => array(),
				)
			);

			$html = Sgs_Footer_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'First match', $html );
			$this->assertStringNotContainsString( 'Second match', $html );

			// Second call in the same request must return null (short-circuit).
			$second_call = Sgs_Footer_Rules::evaluate();
			$this->assertNull( $second_call );
		}

		/**
		 * Footer and header options keys are completely independent.
		 */
		public function test_footer_and_header_option_keys_are_independent(): void {
			$this->assertNotSame( Sgs_Footer_Rules::OPTION_KEY, 'sgs_header_rules' );
			$this->assertSame( 'sgs_footer_rules', Sgs_Footer_Rules::OPTION_KEY );

			// Writing footer rules must not touch the header key.
			Sgs_Footer_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/landing-footer',
					'conditions'   => array(),
				)
			);
			$header_raw = get_option( 'sgs_header_rules', 'untouched' );
			$this->assertSame( 'untouched', $header_raw );
		}
	}
}
