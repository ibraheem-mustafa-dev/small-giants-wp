<?php
/**
 * ReDoS guard tests for Sgs_Header_Rules — FR-S3-2, Spec 17 Wave 2.
 *
 * Self-contained: relies on HeaderRulesTest.php being loaded first (by
 * PHPUnit's alphabetical order) which in turn loads SiteInfoTest.php for the
 * Wp_Options_Stub + core WP function stubs. The WP_Error stub and
 * WP_Block_Patterns_Registry stub are also declared there.
 *
 * Covers:
 *   - add_rule rejects (a+)+ shape
 *   - add_rule rejects (.*)+ shape
 *   - add_rule rejects (.+)* shape
 *   - add_rule rejects patterns > 200 chars
 *   - add_rule rejects patterns that fail PCRE compile
 *   - evaluate with a benign pattern under a low backtrack limit stays under limit
 *   - evaluate short-circuits after first match (per-request, multiple template-parts)
 *
 * Run with: vendor/bin/phpunit --filter "HeaderRulesReDoSGuardTest"
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// HeaderRulesTest.php declares all required stubs + loads the production class.
// We require it explicitly so this file can also be run in isolation.
if ( ! class_exists( 'HeaderRulesTest' ) ) {
	require_once __DIR__ . '/HeaderRulesTest.php';
}

use SGS\Blocks\Sgs_Header_Rules;

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * @covers \SGS\Blocks\Sgs_Header_Rules_ReDoS_Guard::validate_at_storage
	 * @covers \SGS\Blocks\Sgs_Header_Rules_ReDoS_Guard::run_guarded
	 * @covers \SGS\Blocks\Sgs_Header_Rules::evaluate
	 */
	class HeaderRulesReDoSGuardTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			Wp_Options_Stub::reset();
			WP_Block_Patterns_Registry::reset();
			Sgs_Header_Rules::reset_request_state();
			unset( $_SERVER['REQUEST_URI'] );
		}

		/**
		 * Helper: build an add_rule payload with a url_match condition using the
		 * supplied pattern string.
		 *
		 * @param string $pattern Raw regex fragment (no delimiters).
		 * @return array<string,mixed>
		 */
		private function rule_with_url_pattern( string $pattern ): array {
			return array(
				'pattern_slug' => 'sgs/any-header',
				'conditions'   => array(
					array(
						'type'  => 'url_match',
						'value' => $pattern,
					),
				),
			);
		}

		// 1 — add_rule rejects the (a+)+ nested-quantifier shape.
		public function test_add_rule_rejects_a_plus_plus_shape(): void {
			$result = Sgs_Header_Rules::add_rule( $this->rule_with_url_pattern( '(a+)+' ) );
			$this->assertInstanceOf( \WP_Error::class, $result );
			$this->assertSame( 'sgs_header_rules_redos_shape', $result->get_error_code() );
		}

		// 2 — add_rule rejects the (.*)+ nested-quantifier shape.
		public function test_add_rule_rejects_dot_star_plus_shape(): void {
			$result = Sgs_Header_Rules::add_rule( $this->rule_with_url_pattern( '(.*)+' ) );
			$this->assertInstanceOf( \WP_Error::class, $result );
			$this->assertSame( 'sgs_header_rules_redos_shape', $result->get_error_code() );
		}

		// 3 — add_rule rejects the (.+)* nested-quantifier shape.
		public function test_add_rule_rejects_dot_plus_star_shape(): void {
			$result = Sgs_Header_Rules::add_rule( $this->rule_with_url_pattern( '(.+)*' ) );
			$this->assertInstanceOf( \WP_Error::class, $result );
			$this->assertSame( 'sgs_header_rules_redos_shape', $result->get_error_code() );
		}

		// 4 — add_rule rejects patterns longer than 200 characters.
		public function test_add_rule_rejects_pattern_over_200_chars(): void {
			$long_pattern = str_repeat( 'a', \SGS\Blocks\Sgs_Header_Rules_ReDoS_Guard::MAX_PATTERN_LENGTH + 1 );
			$result       = Sgs_Header_Rules::add_rule( $this->rule_with_url_pattern( $long_pattern ) );
			$this->assertInstanceOf( \WP_Error::class, $result );
			$this->assertSame( 'sgs_header_rules_pattern_too_long', $result->get_error_code() );
		}

		// 5 — add_rule rejects patterns that fail PCRE compile (invalid regex).
		public function test_add_rule_rejects_invalid_regex(): void {
			// An unmatched opening bracket is a PCRE compile error.
			$result = Sgs_Header_Rules::add_rule( $this->rule_with_url_pattern( '[unclosed' ) );
			$this->assertInstanceOf( \WP_Error::class, $result );
			$this->assertSame( 'sgs_header_rules_invalid_regex', $result->get_error_code() );
		}

		// 6 — evaluate with a benign pattern stays under a deliberately low backtrack limit.
		public function test_evaluate_stays_under_low_backtrack_limit(): void {
			// Register patterns so evaluate() has something to return.
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Header_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<header>Default</header>' )
			);

			// Add a safe url_match rule — a simple literal path prefix.
			Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => Sgs_Header_Rules::DEFAULT_PATTERN_SLUG,
					'conditions'   => array(
						array(
							'type'  => 'url_match',
							'value' => '^/blog/',
						),
					),
				)
			);

			$_SERVER['REQUEST_URI'] = '/blog/hello-world/';

			// Set a very low backtrack limit to detect runaway backtracking.
			$original = ini_get( 'pcre.backtrack_limit' );
			ini_set( 'pcre.backtrack_limit', '100' );

			try {
				$html = Sgs_Header_Rules::evaluate();
				// evaluate() itself restores the limit via finally{} — no PCRE error
				// should have been raised for this simple pattern.
				$this->assertNull(
					preg_last_error() !== PREG_NO_ERROR ? true : null,
					'PCRE error ' . preg_last_error() . ' raised — pattern may be too complex'
				);
				// The result is either a string (matched) or null (fell through) — both
				// are valid as long as no PCRE catastrophic-backtracking error occurred.
				$this->assertTrue( is_string( $html ) || is_null( $html ) );
			} finally {
				ini_set( 'pcre.backtrack_limit', (string) $original );
			}
		}

		// 7 — evaluate short-circuits after first match even when filter_template_part
		//     would be called a second time (simulates multiple template-parts on one page).
		public function test_evaluate_short_circuits_across_multiple_template_part_calls(): void {
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/promo-header',
				array( 'content' => '<header class="promo">Promo</header>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Header_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<header class="default">Default</header>' )
			);

			// An unconditional rule that always matches.
			Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/promo-header',
					'priority'     => 1,
					'conditions'   => array(),
				)
			);

			// First call — should return the matching pattern's HTML.
			$first = Sgs_Header_Rules::evaluate();
			$this->assertIsString( $first );
			$this->assertStringContainsString( 'Promo', $first );

			// Second call within the same request — short-circuit must return null.
			// The production class uses a static $evaluated_this_request flag for this.
			$second = Sgs_Header_Rules::evaluate();
			$this->assertNull( $second, 'evaluate() must return null on the second call per request (short-circuit)' );
		}
	}
}
