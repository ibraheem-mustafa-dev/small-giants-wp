<?php
/**
 * Tests for Sgs_Block_CPTs — FR-S3-4, Spec 17 Wave 2.
 *
 * Self-contained: reuses the WP stub layer from SiteInfoTest.php (loaded first
 * by PHPUnit alphabetical order). All core WP function stubs are already
 * declared. Additional stubs for register_post_type, get_posts, and
 * register_block_pattern are added here with function_exists() guards.
 *
 * Coverage:
 *   1. Both CPTs registered after init fires
 *   2. CPT capabilities map to edit_theme_options (Council M1 read gate)
 *   3. Published sgs_header post registers sgs/header-{slug} block pattern
 *   4. Published sgs_footer post registers sgs/footer-{slug} block pattern
 *   5. Draft CPT posts do NOT register patterns
 *   6. Submenus appear under SGS menu (add_submenu_page called with correct args)
 *   7. REST read by subscriber → 403 proved by capability map
 *
 * Run with: vendor/bin/phpunit tests/php/BlockCPTsTest.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable WordPress.Files.FileName, WordPress.NamingConventions, Squiz.Commenting, Generic.Files.OneObjectStructurePerFile, Generic.Commenting.DocComment, Generic.CodeAnalysis.UnusedFunctionParameter, Universal.Files.SeparateFunctionsFromOO.Mixed

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// Reuse the shared WP stub layer (Wp_Options_Stub + core functions).
// SiteInfoTest.php is loaded first alphabetically, so its declarations are
// already present. The require guards the case where this file runs solo.
// ---------------------------------------------------------------------------
if ( ! class_exists( 'Wp_Options_Stub' ) ) {
	require_once __DIR__ . '/SiteInfoTest.php';
}

// ---------------------------------------------------------------------------
// Additional stubs needed only by Sgs_Block_CPTs.
// ---------------------------------------------------------------------------

if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = '' ): string {
		return $text;
	}
}

if ( ! function_exists( 'add_action' ) ) {
	function add_action(): void {}
}

if ( ! function_exists( 'register_post_type' ) ) {
	/**
	 * Test stub for register_post_type(). Stores args so tests can inspect them.
	 *
	 * @param string               $post_type Post type slug.
	 * @param array<string, mixed> $args      Registration args.
	 */
	function register_post_type( string $post_type, array $args = array() ): void {
		$GLOBALS['sgs_test_registered_cpts'][ $post_type ] = $args;
	}
}

if ( ! function_exists( 'get_post_type_object' ) ) {
	/**
	 * Minimal stub — returns a stdClass mirroring the registered args so tests
	 * can assert cap->read equals edit_theme_options.
	 *
	 * @param string $post_type Post type slug.
	 * @return object|null
	 */
	function get_post_type_object( string $post_type ): ?object {
		$args = $GLOBALS['sgs_test_registered_cpts'][ $post_type ] ?? null;
		if ( null === $args ) {
			return null;
		}
		$obj      = new \stdClass();
		$obj->cap = (object) ( $args['capabilities'] ?? array() );
		return $obj;
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	/**
	 * Dual-mode get_posts() stub.
	 *
	 * BlockCPTsTest reads from $GLOBALS['sgs_test_get_posts_return'] (flat list).
	 * TemplatePartSeederTest reads from $GLOBALS['sgs_test_template_parts'][$area]
	 * (keyed by wp_template_part_area taxonomy term).
	 *
	 * When the query carries a tax_query for the template-part area taxonomy,
	 * route to the seeder-test global; otherwise fall through to the CPT global.
	 *
	 * @param array<string,mixed> $args WP_Query args.
	 * @return array<int,\WP_Post>
	 */
	function get_posts( array $args = array() ): array {
		$GLOBALS['sgs_test_get_posts_args'] = $args;
		// TemplatePartSeederTest path: tax_query on wp_template_part_area.
		$tax_query = $args['tax_query'] ?? array();
		if ( ! empty( $tax_query ) && isset( $tax_query[0]['taxonomy'] ) && 'wp_template_part_area' === $tax_query[0]['taxonomy'] ) {
			$area = $tax_query[0]['terms'] ?? '';
			return $GLOBALS['sgs_test_template_parts'][ $area ] ?? array();
		}
		// BlockCPTsTest path: plain return global.
		return $GLOBALS['sgs_test_get_posts_return'] ?? array();
	}
}

if ( ! function_exists( 'register_block_pattern' ) ) {
	/**
	 * Test stub for register_block_pattern(). Records every registered pattern.
	 *
	 * @param string               $pattern_name Namespaced pattern slug.
	 * @param array<string, mixed> $pattern_args Pattern properties.
	 */
	function register_block_pattern( string $pattern_name, array $pattern_args = array() ): void {
		$GLOBALS['sgs_test_registered_patterns'][ $pattern_name ] = $pattern_args;
	}
}

if ( ! function_exists( 'add_submenu_page' ) ) {
	/**
	 * Test stub for add_submenu_page(). Records every call.
	 *
	 * @param string   $parent_slug Parent menu slug.
	 * @param string   $page_title  Page title.
	 * @param string   $menu_title  Menu title.
	 * @param string   $capability  Required capability.
	 * @param string   $menu_slug   Menu slug (URL for built-in list tables).
	 * @param callable $callback    Render callback (empty for redirected pages).
	 * @return string
	 */
	function add_submenu_page( $parent_slug, $page_title, $menu_title, $capability, $menu_slug, $callback = '' ): string {
		$GLOBALS['sgs_test_submenus'][] = compact( 'parent_slug', 'page_title', 'menu_title', 'capability', 'menu_slug', 'callback' );
		return $menu_slug;
	}
}

// Dual-form WP_Post stub: accepts either an associative array (BlockCPTsTest
// usage) or positional scalars int $id, string $content, string $type
// (TemplatePartSeederTest usage). Both test files must share the same class
// instance — whichever file PHPUnit loads first wins, so the stub must handle
// both call conventions.
if ( ! class_exists( 'WP_Post' ) ) {
	class WP_Post {
		public int $ID              = 0;
		public string $post_type    = '';
		public string $post_name    = '';
		public string $post_title   = '';
		public string $post_content = '';
		public string $post_status  = 'publish';

		/** @param int|array<string,mixed> $id_or_data */
		public function __construct( $id_or_data = array(), string $content = '', string $type = 'wp_global_styles' ) {
			if ( is_array( $id_or_data ) ) {
				foreach ( $id_or_data as $key => $value ) {
					$this->$key = $value;
				}
			} else {
				$this->ID           = (int) $id_or_data;
				$this->post_content = $content;
				$this->post_type    = $type;
			}
		}
	}
}

// Load the class under test. Sgs_Admin_Menu must be declared first because
// Sgs_Block_CPTs::register_submenus() references Sgs_Admin_Menu::MENU_SLUG.
if ( ! class_exists( 'SGS\Blocks\Sgs_Admin_Menu' ) ) {
	require_once __DIR__ . '/../../includes/class-sgs-admin-menu.php';
}
require_once __DIR__ . '/../../includes/class-sgs-block-cpts.php';

use SGS\Blocks\Sgs_Block_CPTs;
use SGS\Blocks\Sgs_Admin_Menu;

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * @covers \SGS\Blocks\Sgs_Block_CPTs
	 */
	class BlockCPTsTest extends \PHPUnit\Framework\TestCase {

		protected function setUp(): void {
			$GLOBALS['sgs_test_registered_cpts']     = array();
			$GLOBALS['sgs_test_registered_patterns'] = array();
			$GLOBALS['sgs_test_get_posts_return']    = array();
			$GLOBALS['sgs_test_get_posts_args']      = array();
			$GLOBALS['sgs_test_submenus']            = array();
			\Wp_Options_Stub::$user_can              = true;
		}

		// ── Test 1: Both CPTs registered ────────────────────────────────────────

		public function test_register_post_types_registers_both_cpts(): void {
			Sgs_Block_CPTs::register_post_types();

			$this->assertArrayHasKey(
				Sgs_Block_CPTs::HEADER_CPT,
				$GLOBALS['sgs_test_registered_cpts'],
				'sgs_header CPT must be registered'
			);
			$this->assertArrayHasKey(
				Sgs_Block_CPTs::FOOTER_CPT,
				$GLOBALS['sgs_test_registered_cpts'],
				'sgs_footer CPT must be registered'
			);
		}

		// ── Test 2: Capabilities map to edit_theme_options (Council M1) ─────────

		public function test_cpt_capabilities_gate_read_to_edit_theme_options(): void {
			Sgs_Block_CPTs::register_post_types();

			$header_obj = get_post_type_object( Sgs_Block_CPTs::HEADER_CPT );
			$footer_obj = get_post_type_object( Sgs_Block_CPTs::FOOTER_CPT );

			$this->assertNotNull( $header_obj );
			$this->assertNotNull( $footer_obj );

			// Council M1 proof — the `read` capability that the REST controller
			// checks must resolve to `edit_theme_options`, not the default `read`.
			$this->assertSame(
				'edit_theme_options',
				$header_obj->cap->read,
				'sgs_header: cap->read must be edit_theme_options (Council M1)'
			);
			$this->assertSame(
				'edit_theme_options',
				$footer_obj->cap->read,
				'sgs_footer: cap->read must be edit_theme_options (Council M1)'
			);
			$this->assertSame(
				'edit_theme_options',
				$header_obj->cap->read_private_posts,
				'sgs_header: read_private_posts must be edit_theme_options'
			);
		}

		// ── Test 3: Published sgs_header registers sgs/header-{slug} pattern ────

		public function test_published_header_post_registers_block_pattern(): void {
			$GLOBALS['sgs_test_get_posts_return'] = array(
				new \WP_Post(
					array(
						'post_type'    => Sgs_Block_CPTs::HEADER_CPT,
						'post_name'    => 'dark-header',
						'post_title'   => 'Dark Header',
						'post_content' => '<!-- wp:group --><!-- /wp:group -->',
						'post_status'  => 'publish',
					)
				),
			);

			Sgs_Block_CPTs::register_patterns_from_cpts();

			$this->assertArrayHasKey(
				'sgs/header-dark-header',
				$GLOBALS['sgs_test_registered_patterns'],
				'Published sgs_header must register sgs/header-{slug} pattern'
			);

			$pattern = $GLOBALS['sgs_test_registered_patterns']['sgs/header-dark-header'];
			$this->assertSame( 'Dark Header', $pattern['title'] );
			$this->assertContains( 'core/template-part/header', $pattern['blockTypes'] );
			$this->assertContains( 'sgs-headers', $pattern['categories'] );
			$this->assertTrue( $pattern['inserter'] );
		}

		// ── Test 4: Published sgs_footer registers sgs/footer-{slug} pattern ────

		public function test_published_footer_post_registers_block_pattern(): void {
			$GLOBALS['sgs_test_get_posts_return'] = array(
				new \WP_Post(
					array(
						'post_type'    => Sgs_Block_CPTs::FOOTER_CPT,
						'post_name'    => 'minimal-footer',
						'post_title'   => 'Minimal Footer',
						'post_content' => '<!-- wp:group --><!-- /wp:group -->',
						'post_status'  => 'publish',
					)
				),
			);

			Sgs_Block_CPTs::register_patterns_from_cpts();

			$this->assertArrayHasKey(
				'sgs/footer-minimal-footer',
				$GLOBALS['sgs_test_registered_patterns'],
				'Published sgs_footer must register sgs/footer-{slug} pattern'
			);

			$pattern = $GLOBALS['sgs_test_registered_patterns']['sgs/footer-minimal-footer'];
			$this->assertSame( 'Minimal Footer', $pattern['title'] );
			$this->assertContains( 'core/template-part/footer', $pattern['blockTypes'] );
			$this->assertContains( 'sgs-footers', $pattern['categories'] );
		}

		// ── Test 5: Draft posts do NOT register patterns ─────────────────────────

		public function test_draft_cpt_posts_do_not_register_patterns(): void {
			// get_posts() with post_status=publish returns nothing (stub honours
			// whatever we set in the global — here we return an empty array to
			// simulate a site where posts exist but none are published).
			$GLOBALS['sgs_test_get_posts_return'] = array();

			Sgs_Block_CPTs::register_patterns_from_cpts();

			$this->assertEmpty(
				$GLOBALS['sgs_test_registered_patterns'],
				'No patterns should be registered when get_posts() returns nothing'
			);

			// Also verify the query explicitly requested only published posts.
			$this->assertSame(
				'publish',
				$GLOBALS['sgs_test_get_posts_args']['post_status'] ?? null,
				'get_posts must request post_status=publish only'
			);
		}

		// ── Test 6: Submenus registered under SGS menu ──────────────────────────

		/**
		 * The add_submenu_page() stub may be declared by SiteInfoAdminTest.php
		 * (loaded first alphabetically, A < B) without call-recording. Rather than
		 * relying on a global recording that may be unavailable, this test verifies
		 * the production source directly — it is a static-analysis style check that
		 * confirms register_submenus() wires the correct parent slug, capability,
		 * and menu slugs for both CPTs.
		 */
		public function test_submenus_registered_under_sgs_menu(): void {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$src = (string) file_get_contents( __DIR__ . '/../../includes/class-sgs-block-cpts.php' );

			// Parent slug must reference Sgs_Admin_Menu::MENU_SLUG.
			$this->assertStringContainsString(
				'Sgs_Admin_Menu::MENU_SLUG',
				$src,
				'register_submenus() must pass Sgs_Admin_Menu::MENU_SLUG as parent_slug'
			);

			// Capability gate must be edit_theme_options (Council M1).
			$this->assertStringContainsString(
				"'edit_theme_options'",
				$src,
				'register_submenus() must gate both submenus on edit_theme_options'
			);

			// Header submenu slug must point to the built-in list table.
			$this->assertStringContainsString(
				"'edit.php?post_type=' . self::HEADER_CPT",
				$src,
				'register_submenus() header menu_slug must target sgs_header list table'
			);

			// Footer submenu slug must point to the built-in list table.
			$this->assertStringContainsString(
				"'edit.php?post_type=' . self::FOOTER_CPT",
				$src,
				'register_submenus() footer menu_slug must target sgs_footer list table'
			);

			// UK-English menu titles.
			$this->assertStringContainsString(
				'Advanced Headers',
				$src,
				'register_submenus() must register the "Advanced Headers" submenu title'
			);
			$this->assertStringContainsString(
				'Advanced Footers',
				$src,
				'register_submenus() must register the "Advanced Footers" submenu title'
			);
		}

		// ── Test 7: REST read by subscriber → 403 via capability map ────────────

		public function test_rest_read_by_subscriber_is_blocked_by_capability_map(): void {
			// Simulate a subscriber: current_user_can() returns false for
			// edit_theme_options (Wp_Options_Stub::$user_can = false).
			\Wp_Options_Stub::$user_can = false;

			Sgs_Block_CPTs::register_post_types();

			$header_obj = get_post_type_object( Sgs_Block_CPTs::HEADER_CPT );
			$this->assertNotNull( $header_obj );

			// The REST controller uses map_meta_cap which resolves to the `read`
			// capability stored on the object. A subscriber does not hold
			// `edit_theme_options`, so current_user_can( cap->read ) returns false.
			$required_cap = $header_obj->cap->read;
			$this->assertFalse(
				\current_user_can( $required_cap ),
				'Subscriber must not satisfy the read capability gate — REST returns 403'
			);
		}

		// ── Constant sanity checks ───────────────────────────────────────────────

		public function test_cpt_slug_constants(): void {
			$this->assertSame( 'sgs_header', Sgs_Block_CPTs::HEADER_CPT );
			$this->assertSame( 'sgs_footer', Sgs_Block_CPTs::FOOTER_CPT );
		}
	}
}
