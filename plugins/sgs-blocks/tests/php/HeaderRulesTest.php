<?php
/**
 * Tests for Sgs_Header_Rules engine — FR-S3-2, Spec 17 Wave 2.
 *
 * Self-contained: reuses the WP stub layer from SiteInfoTest.php (loaded first
 * by PHPUnit's alphabetical order). Wp_Options_Stub + all core WP function stubs
 * are already declared by the time this file runs.
 *
 * Covers:
 *   - add_rule writes to wp_options
 *   - remove_rule removes from wp_options
 *   - list_rules always includes the immutable default
 *   - remove_rule refuses to remove the default
 *   - evaluate returns default pattern HTML when no operator rules match
 *   - evaluate returns first-match rule's pattern HTML when a rule matches
 *   - evaluate AND-evaluates conditions within a rule
 *   - evaluate short-circuits after first match per request
 *
 * Run with: vendor/bin/phpunit --filter "HeaderRulesTest"
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// Additional WP stubs needed by Sgs_Header_Rules that SiteInfoTest.php does
// not declare. All wrapped in function_exists() guards so they compose safely.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data, int $flags = 0, int $depth = 512 ): string {
		return (string) json_encode( $data, $flags );
	}
}
if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( string $url, int $component = -1 ) {
		return parse_url( $url, $component );
	}
}
if ( ! function_exists( 'wp_unslash' ) ) {
	function wp_unslash( $value ) {
		return is_string( $value ) ? stripslashes( $value ) : $value;
	}
}
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = '' ): string {
		return $text;
	}
}
if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ): bool {
		return $thing instanceof \WP_Error;
	}
}
if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}
if ( ! function_exists( 'add_filter' ) ) {
	function add_filter(): void {}
}
if ( ! function_exists( 'apply_filters' ) ) {
	/**
	 * Passthrough stub for apply_filters — returns the first value argument unchanged.
	 *
	 * @param string $hook_name Filter hook name (unused in tests).
	 * @param mixed  $value     The value to filter.
	 * @param mixed  ...$args   Additional arguments (unused).
	 * @return mixed
	 */
	function apply_filters( string $hook_name, $value, ...$args ) {
		return $value;
	}
}

// Minimal WP_Error stub if WP itself is not loaded.
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public string $code;
		public string $message;
		/** @var array<string,mixed> */
		public array $data;
		public function __construct( string $code = '', string $message = '', $data = '' ) {
			$this->code    = $code;
			$this->message = $message;
			$this->data    = is_array( $data ) ? $data : array( 'status' => $data );
		}
		public function get_error_code(): string {
			return $this->code;
		}
		public function get_error_message(): string {
			return $this->message;
		}
	}
}

// Minimal block-pattern registry stubs.
//
// TemplatePartSeederTest.php (loaded after this file alphabetically) declares
// both Sgs_Test_Pattern_Registry and WP_Block_Patterns_Registry inside a
// single `if ( ! class_exists( 'WP_Block_Patterns_Registry' ) )` guard.
// Because this file loads first (H < T), WP_Block_Patterns_Registry would
// already exist and the guard would skip Sgs_Test_Pattern_Registry too,
// breaking those 7 tests.
//
// Solution: declare BOTH stubs here before TemplatePartSeederTest.php runs.
// Sgs_Test_Pattern_Registry is the shared backing store; WP_Block_Patterns_Registry
// delegates to it so both suites stay independent.
if ( ! class_exists( 'Sgs_Test_Pattern_Registry' ) ) {
	/**
	 * Shared in-memory pattern store used by both HeaderRulesTest and
	 * TemplatePartSeederTest stubs.
	 */
	class Sgs_Test_Pattern_Registry {
		/** @var array<string,string> */
		public static array $patterns = array();

		public static function reset(): void {
			self::$patterns = array();
		}

		public static function add( string $slug, string $content ): void {
			self::$patterns[ $slug ] = $content;
		}

		public static function remove( string $slug ): void {
			unset( self::$patterns[ $slug ] );
		}
	}
}

if ( ! class_exists( 'WP_Block_Patterns_Registry' ) ) {
	/**
	 * Minimal WP_Block_Patterns_Registry stub. Delegates storage to
	 * Sgs_Test_Pattern_Registry so TemplatePartSeederTest can share the store.
	 */
	class WP_Block_Patterns_Registry {
		private static ?self $instance = null;

		public static function get_instance(): self {
			if ( null === self::$instance ) {
				self::$instance = new self();
			}
			return self::$instance;
		}

		/** @param array<string,mixed> $args */
		public function register( string $slug, array $args ): void {
			Sgs_Test_Pattern_Registry::$patterns[ $slug ] = $args['content'] ?? '';
		}

		public function is_registered( string $slug ): bool {
			return isset( Sgs_Test_Pattern_Registry::$patterns[ $slug ] );
		}

		/** @return array<string,mixed>|false */
		public function get_registered( string $slug ) {
			if ( ! isset( Sgs_Test_Pattern_Registry::$patterns[ $slug ] ) ) {
				return false;
			}
			return array( 'content' => Sgs_Test_Pattern_Registry::$patterns[ $slug ] );
		}

		public static function reset(): void {
			Sgs_Test_Pattern_Registry::reset();
		}
	}
}

if ( ! function_exists( 'do_blocks' ) ) {
	// Passthrough stub — no block parser in unit test context.
	function do_blocks( string $content ): string {
		return $content;
	}
}

if ( ! function_exists( 'get_post_type' ) ) {
	function get_post_type(): string {
		return (string) ( $GLOBALS['sgs_test_post_type'] ?? '' );
	}
}

if ( ! function_exists( 'get_page_template_slug' ) ) {
	function get_page_template_slug(): string {
		return (string) ( $GLOBALS['sgs_test_template_slug'] ?? '' );
	}
}

if ( ! function_exists( 'wp_get_current_user' ) ) {
	function wp_get_current_user(): object {
		$roles = $GLOBALS['sgs_test_user_roles'] ?? array();
		return (object) array( 'roles' => $roles );
	}
}

// SiteInfoTest.php is loaded first (alphabetical PHPUnit order) and declares
// Wp_Options_Stub + get_option / update_option. We require it explicitly here
// so the file can also be run in isolation.
if ( ! class_exists( 'Wp_Options_Stub' ) ) {
	require_once __DIR__ . '/SiteInfoTest.php';
}

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/tmp/' );
}

require_once __DIR__ . '/../../includes/class-sgs-header-rules-redos-guard.php';
require_once __DIR__ . '/../../includes/class-sgs-header-rules.php';

use SGS\Blocks\Sgs_Header_Rules;

// ---------------------------------------------------------------------------
// Test class.
// ---------------------------------------------------------------------------

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * @covers \SGS\Blocks\Sgs_Header_Rules
	 */
	class HeaderRulesTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			Wp_Options_Stub::reset();
			WP_Block_Patterns_Registry::reset();
			Sgs_Header_Rules::reset_request_state();
			$GLOBALS['sgs_test_post_type']     = '';
			$GLOBALS['sgs_test_template_slug'] = '';
			$GLOBALS['sgs_test_user_roles']    = array();
			unset( $_SERVER['REQUEST_URI'] );
		}

		// 1 — add_rule with valid input writes to wp_options.
		public function test_add_rule_writes_to_options(): void {
			$id = Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/custom-header',
					'priority'     => 5,
					'conditions'   => array(),
				)
			);
			$this->assertIsString( $id );
			$this->assertStringStartsWith( 'rule_', $id );

			$rules = Sgs_Header_Rules::list_rules();
			$slugs = array_column( $rules, 'pattern_slug' );
			$this->assertContains( 'sgs/custom-header', $slugs );
		}

		// 2 — remove_rule by id removes the rule from wp_options.
		public function test_remove_rule_removes_from_options(): void {
			$id = Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/promo-header',
					'conditions'   => array(),
				)
			);
			$this->assertIsString( $id );

			$result = Sgs_Header_Rules::remove_rule( $id );
			$this->assertTrue( $result );

			$rules = Sgs_Header_Rules::list_rules();
			$ids   = array_column( $rules, 'id' );
			$this->assertNotContains( $id, $ids );
		}

		// 3 — list_rules always includes the immutable default rule.
		public function test_list_rules_includes_default(): void {
			$rules = Sgs_Header_Rules::list_rules();
			$ids   = array_column( $rules, 'id' );
			$this->assertContains( Sgs_Header_Rules::DEFAULT_RULE_ID, $ids );
		}

		// 4 — Attempt to remove the default rule returns WP_Error.
		public function test_remove_default_rule_returns_wp_error(): void {
			$result = Sgs_Header_Rules::remove_rule( Sgs_Header_Rules::DEFAULT_RULE_ID );
			$this->assertInstanceOf( \WP_Error::class, $result );
			$this->assertSame( 'sgs_header_rules_default_immutable', $result->get_error_code() );
		}

		// 5 — evaluate returns the default pattern's HTML when no operator rules match.
		public function test_evaluate_returns_default_pattern_html_when_no_rules_match(): void {
			// Register the default pattern slug in the stub registry.
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Header_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<header class="default">Default header</header>' )
			);
			// Ensure only the default rule exists (no operator rules added).
			$html = Sgs_Header_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'Default header', $html );
		}

		// 6 — evaluate returns first-match rule's pattern HTML when a rule matches.
		public function test_evaluate_returns_matching_rule_pattern_html(): void {
			// Register a custom pattern and a default pattern.
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/shop-header',
				array( 'content' => '<header class="shop">Shop header</header>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Header_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<header class="default">Default header</header>' )
			);

			// Add a rule that matches when post_type === 'product'.
			Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/shop-header',
					'priority'     => 5,
					'conditions'   => array(
						array( 'type' => 'post_type', 'value' => 'product' ),
					),
				)
			);

			$GLOBALS['sgs_test_post_type'] = 'product';
			$html = Sgs_Header_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'Shop header', $html );
		}

		// 7 — evaluate AND-evaluates conditions within a rule.
		public function test_evaluate_and_conditions_within_rule(): void {
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/product-page-header',
				array( 'content' => '<header class="product-page">Product page header</header>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Header_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<header class="default">Default header</header>' )
			);

			// Rule requires BOTH post_type AND url_match to match.
			// The value is a raw regex fragment — no delimiter escaping; the
			// production class handles forward-slash escaping internally.
			Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/product-page-header',
					'priority'     => 5,
					'conditions'   => array(
						array(
							'type'  => 'post_type',
							'value' => 'product',
						),
						array(
							'type'  => 'url_match',
							'value' => '^.shop.',
						),
					),
				)
			);

			// Only post_type matches — rule should NOT fire.
			$GLOBALS['sgs_test_post_type'] = 'product';
			$_SERVER['REQUEST_URI']        = '/about/';
			$html = Sgs_Header_Rules::evaluate();
			$this->assertStringNotContainsString( 'Product page header', (string) $html );

			// Reset short-circuit so we can test the positive case.
			Sgs_Header_Rules::reset_request_state();

			// Both conditions match — rule SHOULD fire.
			$_SERVER['REQUEST_URI'] = '/shop/widgets/';
			$html = Sgs_Header_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'Product page header', $html );
		}

		// 8 — evaluate short-circuits after first match per request.
		public function test_evaluate_short_circuits_after_first_match(): void {
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/first-match-header',
				array( 'content' => '<header class="first">First match</header>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				'sgs/second-match-header',
				array( 'content' => '<header class="second">Second match</header>' )
			);
			WP_Block_Patterns_Registry::get_instance()->register(
				Sgs_Header_Rules::DEFAULT_PATTERN_SLUG,
				array( 'content' => '<header class="default">Default header</header>' )
			);

			// Two unconditional operator rules — first should win.
			Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/first-match-header',
					'priority'     => 1,
					'conditions'   => array(),
				)
			);
			Sgs_Header_Rules::add_rule(
				array(
					'pattern_slug' => 'sgs/second-match-header',
					'priority'     => 2,
					'conditions'   => array(),
				)
			);

			$html = Sgs_Header_Rules::evaluate();
			$this->assertIsString( $html );
			$this->assertStringContainsString( 'First match', $html );
			$this->assertStringNotContainsString( 'Second match', $html );

			// Second call in the same request must return null (short-circuit).
			$second_call = Sgs_Header_Rules::evaluate();
			$this->assertNull( $second_call );
		}
	}
}
