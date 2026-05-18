<?php
/**
 * Tests for Sgs_Template_Part_Meta — FR-S7-4 / P-S17-W1B-SANITIZE-KEY-STRIPS-SLASH.
 *
 * Verifies round-trip integrity of pattern-slug meta storage after replacing
 * sanitize_key() (which strips '/') with sanitize_pattern_slug() (which preserves it).
 *
 * Scenarios:
 *   1. mark_seeded() preserves the slash in 'sgs/framework-header-default'.
 *   2. mark_seeded() strips genuinely dangerous characters (XSS payload).
 *   3. Round-trip: written slug matches the slug stored in WP_Block_Patterns_Registry.
 *
 * Run with: vendor/bin/phpunit tests/php/TemplatePartMetaTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Squiz.Commenting.VariableComment.Missing, Squiz.Commenting.ClassComment.Missing, Squiz.Commenting.FunctionComment.MissingParamComment, Squiz.Commenting.FunctionComment.MissingParamTag, Squiz.Commenting.FunctionComment.MissingReturn, Squiz.Commenting.InlineComment.DocBlock, Squiz.Commenting.FunctionComment.WrongStyle, Squiz.Commenting.ClassComment.WrongStyle, Generic.Files.OneObjectStructurePerFile, Generic.PHP.ClosingPHPTag, WordPress.Files.FileName, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions, WordPress.PHP.DisallowShortTernary, Universal.Files.SeparateFunctionsFromOO.Mixed, Squiz.Commenting.VariableComment.WrongStyle, Squiz.Commenting.FunctionComment.Missing, Generic.CodeAnalysis.UnusedFunctionParameter

// ── Minimal WordPress stubs (only what this test file needs) ─────────────────

if ( ! function_exists( 'update_post_meta' ) ) {
	function update_post_meta( int $post_id, string $key, $value ): bool {
		$GLOBALS['sgs_test_postmeta'][ $post_id ][ $key ] = $value;
		return true;
	}
}
if ( ! function_exists( 'get_post_meta' ) ) {
	function get_post_meta( int $post_id, string $key, bool $single = false ) {
		$value = $GLOBALS['sgs_test_postmeta'][ $post_id ][ $key ] ?? '';
		return $single ? $value : array( $value );
	}
}
// time() is always available natively in PHP — no stub required.
if ( ! function_exists( 'current_user_can' ) ) {
	function current_user_can( string $cap ): bool {
		return true;
	}
}
if ( ! function_exists( 'register_post_meta' ) ) {
	function register_post_meta( string $post_type, string $meta_key, array $args ): bool {
		return true;
	}
}
if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}

// ── Pattern registry stub ─────────────────────────────────────────────────────

if ( ! class_exists( 'WP_Block_Patterns_Registry' ) ) {
	/**
	 * Stub WP_Block_Patterns_Registry for unit tests.
	 */
	class WP_Block_Patterns_Registry {
		/**
		 * Registered patterns keyed by slug.
		 *
		 * @var array<string,string>
		 */
		private static array $patterns = array();
		private static ?self $instance = null;

		public static function get_instance(): self {
			return self::$instance ??= new self();
		}

		public static function reset(): void {
			self::$patterns = array();
		}

		public static function seed( string $slug, string $content = '<!-- wp:paragraph --><p>stub</p><!-- /wp:paragraph -->' ): void {
			self::$patterns[ $slug ] = $content;
		}

		public function is_registered( string $slug ): bool {
			return isset( self::$patterns[ $slug ] );
		}

		public function get_registered( string $slug ): array {
			return array( 'content' => self::$patterns[ $slug ] ?? '' );
		}
	}
}

// ── Class under test ──────────────────────────────────────────────────────────

require_once __DIR__ . '/../../includes/class-sgs-template-part-meta.php';

use SGS\Blocks\Sgs_Template_Part_Meta;

// ── Test suite ────────────────────────────────────────────────────────────────

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * Unit tests for Sgs_Template_Part_Meta slug sanitisation and round-trip integrity.
	 *
	 * @covers \SGS\Blocks\Sgs_Template_Part_Meta
	 */
	class TemplatePartMetaTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			$GLOBALS['sgs_test_postmeta'] = array();
			WP_Block_Patterns_Registry::reset();
		}

		// ── Test 1 ────────────────────────────────────────────────────────────

		/**
		 * Mark_seeded() stores 'sgs/framework-header-default' verbatim (slash preserved).
		 *
		 * Previously sanitize_key() would mangle this to 'sgsframework-header-default',
		 * making the stored slug impossible to resolve against the pattern registry.
		 */
		public function test_mark_seeded_preserves_slash_in_pattern_slug(): void {
			$pattern_slug   = 'sgs/framework-header-default';
			$variation_slug = 'mamas-munches';

			Sgs_Template_Part_Meta::mark_seeded( 1, $pattern_slug, $variation_slug );

			$stored = $GLOBALS['sgs_test_postmeta'][1][ Sgs_Template_Part_Meta::META_PATTERN_SLUG ];

			$this->assertSame(
				$pattern_slug,
				$stored,
				'sanitize_pattern_slug() must preserve the "/" namespace separator in SGS pattern slugs.'
			);
		}

		// ── Test 2 ────────────────────────────────────────────────────────────

		/**
		 * Mark_seeded() strips dangerous characters while allowing safe slug chars.
		 *
		 * The custom sanitiser must provide equivalent XSS/injection safety to
		 * sanitize_key() — only [a-z0-9_\-/\.] are allowed.
		 */
		public function test_mark_seeded_rejects_invalid_characters(): void {
			$xss_payload = '<script>alert(1)</script>';

			Sgs_Template_Part_Meta::mark_seeded( 2, $xss_payload, $xss_payload );

			$stored_pattern   = $GLOBALS['sgs_test_postmeta'][2][ Sgs_Template_Part_Meta::META_PATTERN_SLUG ];
			$stored_variation = $GLOBALS['sgs_test_postmeta'][2][ Sgs_Template_Part_Meta::META_VARIATION_SLUG ];

			$this->assertStringNotContainsString( '<', $stored_pattern, 'Angle bracket must be stripped from pattern slug.' );
			$this->assertStringNotContainsString( '>', $stored_pattern, 'Angle bracket must be stripped from pattern slug.' );
			$this->assertStringNotContainsString( '<', $stored_variation, 'Angle bracket must be stripped from variation slug.' );
			$this->assertStringNotContainsString( '(', $stored_pattern, 'Parenthesis must be stripped from pattern slug.' );
		}

		// ── Test 3 ────────────────────────────────────────────────────────────

		/**
		 * Round-trip integrity: the slug written by mark_seeded() must resolve
		 * back to a registered pattern in WP_Block_Patterns_Registry.
		 *
		 * This is the core acceptance criterion for P-S17-W1B-SANITIZE-KEY-STRIPS-SLASH.
		 * Before the fix, sanitize_key() would store 'sgsframework-header-default'
		 * while the registry holds 'sgs/framework-header-default' — no match.
		 */
		public function test_mark_seeded_round_trip_resolves_to_registered_pattern(): void {
			$pattern_slug   = 'sgs/framework-header-default';
			$variation_slug = 'indus-foods';

			// Register the pattern in the stub registry.
			// Use register() — the shared stub from HeaderRulesTest.php (loaded first
			// alphabetically) exposes register() but not seed(). Both stubs delegate
			// to Sgs_Test_Pattern_Registry::$patterns, so register() is equivalent.
			WP_Block_Patterns_Registry::get_instance()->register( $pattern_slug, array( 'content' => '<!-- wp:paragraph --><p>stub</p><!-- /wp:paragraph -->' ) );

			// Write the meta.
			Sgs_Template_Part_Meta::mark_seeded( 3, $pattern_slug, $variation_slug );

			// Read it back.
			$stored = (string) ( $GLOBALS['sgs_test_postmeta'][3][ Sgs_Template_Part_Meta::META_PATTERN_SLUG ] ?? '' );

			// Look up in the registry using the stored value.
			$registry    = WP_Block_Patterns_Registry::get_instance();
			$is_resolved = $registry->is_registered( $stored );

			$this->assertTrue(
				$is_resolved,
				sprintf(
					'Stored slug "%s" must resolve to a registered pattern. Before the fix, sanitize_key() stored "%s" which did not resolve.',
					$stored,
					preg_replace( '/[^a-z0-9_\-\.]/', '', strtolower( $pattern_slug ) )
				)
			);
		}
	}
}
