<?php
/**
 * Tests for Sgs_Template_Part_Seeder — FR-S2-1.
 *
 * Verifies the 7 acceptance scenarios:
 *   1. Variation switch with mismatched meta on both records → both seeded.
 *   2. Variation switch with matching meta → no-op (idempotent).
 *   3. Concurrent save (transient already set) → bails.
 *   4. Manifest without headerPattern → falls back to default + logs notice.
 *   5. Capability fail → no write.
 *   6. Safety guard not armed → no write (existing-site preservation).
 *   7. Pattern not registered in block-pattern registry → falls back to default.
 *
 * Run with: vendor/bin/phpunit tests/php/TemplatePartSeederTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Squiz.Commenting.VariableComment.Missing, Squiz.Commenting.ClassComment.Missing, Squiz.Commenting.FunctionComment.MissingParamComment, Squiz.Commenting.FunctionCommentThrowTag.Missing, Squiz.Commenting.InlineComment.DocBlock, Squiz.Commenting.FunctionComment.WrongStyle, Squiz.Commenting.ClassComment.WrongStyle, Generic.Files.OneObjectStructurePerFile, Generic.Files.InlineHTML, Generic.PHP.ClosingPHPTag, WordPress.Files.FileName, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions, WordPress.PHP.DisallowShortTernary, WordPress.PHP.NoSilencedErrors, WordPress.WhiteSpace.OperatorSpacing, Generic.Formatting.MultipleStatementAlignment, Squiz.PHP.DisallowMultipleAssignments, Squiz.Commenting.VariableComment.MissingShort, Squiz.Commenting.FunctionComment.MissingParamTag, Squiz.Commenting.FileComment.MissingPackageTag, Squiz.Commenting.FunctionComment.Missing, PSR2.Classes.PropertyDeclaration.Multiple, Universal.Files.SeparateFunctionsFromOO.Mixed, Squiz.Commenting.VariableComment.WrongStyle

require_once __DIR__ . '/SafetyGuardTest.php';

if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( string $key ) {
		$store = $GLOBALS['sgs_test_transients'] ?? array();
		return $store[ $key ] ?? false;
	}
}
if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( string $key, $value, int $ttl = 0 ): bool {
		$GLOBALS['sgs_test_transients'][ $key ] = $value;
		return true;
	}
}
if ( ! function_exists( 'delete_transient' ) ) {
	function delete_transient( string $key ): bool {
		unset( $GLOBALS['sgs_test_transients'][ $key ] );
		return true;
	}
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $key ): string {
		return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $key ) );
	}
}
if ( ! function_exists( 'sanitize_file_name' ) ) {
	function sanitize_file_name( string $name ): string {
		return preg_replace( '/[^a-z0-9._\-]/i', '', $name );
	}
}
if ( ! function_exists( 'wp_get_theme' ) ) {
	function wp_get_theme() {
		return new stdClass();
	}
}
if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ): bool {
		return $thing instanceof \WP_Error;
	}
}
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public string $message;
		public function __construct( string $message = '' ) {
			$this->message = $message; }
		public function get_error_message(): string {
			return $this->message; }
	}
}
if ( ! class_exists( 'WP_Post' ) ) {
	/**
	 * Dual-form WP_Post stub: accepts either positional scalars (int $id, string
	 * $content, string $type) or an associative array (matches BlockCPTsTest.php's
	 * stub form) so this file composes safely regardless of PHPUnit load order.
	 */
	class WP_Post {
		public int $ID           = 0;
		public string $post_content = '';
		public string $post_type    = 'wp_global_styles';
		public string $post_status  = 'publish';
		public string $post_name    = '';
		public string $post_title   = '';

		/** @param int|array<string,mixed> $id_or_data */
		public function __construct( $id_or_data = 0, string $content = '', string $type = 'wp_global_styles' ) {
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
if ( ! function_exists( 'get_post' ) ) {
	function get_post( int $id ) {
		return $GLOBALS['sgs_test_posts'][ $id ] ?? null;
	}
}
if ( ! function_exists( 'get_post_meta' ) ) {
	function get_post_meta( int $post_id, string $key, bool $single = false ) {
		$value = $GLOBALS['sgs_test_postmeta'][ $post_id ][ $key ] ?? '';
		return $single ? $value : array( $value );
	}
}
if ( ! function_exists( 'update_post_meta' ) ) {
	function update_post_meta( int $post_id, string $key, $value ): bool {
		$GLOBALS['sgs_test_postmeta'][ $post_id ][ $key ] = $value;
		return true;
	}
}
if ( ! function_exists( 'get_posts' ) ) {
	function get_posts( array $args ) {
		$area  = $args['tax_query'][0]['terms'] ?? '';
		$ids   = $GLOBALS['sgs_test_template_parts'][ $area ] ?? array();
		return $ids;
	}
}
if ( ! function_exists( 'wp_insert_post' ) ) {
	function wp_insert_post( array $args, bool $wp_error = false ) {
		$id                                  = ++$GLOBALS['sgs_test_next_post_id'];
		$GLOBALS['sgs_test_inserted_posts'][ $id ] = $args;
		// Track new template parts by area.
		$area = $args['post_name'] ?? '';
		if ( '' !== $area ) {
			$GLOBALS['sgs_test_template_parts'][ $area ][] = $id;
		}
		return $id;
	}
}
if ( ! function_exists( 'wp_update_post' ) ) {
	function wp_update_post( array $args, bool $wp_error = false ) {
		$id = (int) ( $args['ID'] ?? 0 );
		if ( $id > 0 ) {
			$GLOBALS['sgs_test_updated_posts'][ $id ] = $args;
		}
		return $id;
	}
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $str ): string {
		return strip_tags( (string) $str );
	}
}

require_once __DIR__ . '/../../includes/class-sgs-template-part-meta.php';
require_once __DIR__ . '/../../includes/class-sgs-template-part-seeder.php';

use SGS\Blocks\Sgs_Migrations;
use SGS\Blocks\Sgs_Template_Part_Meta;
use SGS\Blocks\Sgs_Template_Part_Seeder;

if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	/**
	 * Seeder coverage.
	 *
	 * @covers \SGS\Blocks\Sgs_Template_Part_Seeder
	 */
	class TemplatePartSeederTest extends \PHPUnit\Framework\TestCase {

		private string $fixtures_dir;

		protected function setUp(): void {
			\Wp_Options_Stub::reset();
			$GLOBALS['sgs_test_transients']      = array();
			$GLOBALS['sgs_test_posts']           = array();
			$GLOBALS['sgs_test_postmeta']        = array();
			$GLOBALS['sgs_test_template_parts']  = array();
			$GLOBALS['sgs_test_inserted_posts']  = array();
			$GLOBALS['sgs_test_updated_posts']   = array();
			$GLOBALS['sgs_test_next_post_id']    = 100;

			// Arm seeding so the safety-guard gate passes by default.
			update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, time() - 60 );

			// Set up fixture variation files.
			$this->fixtures_dir = sys_get_temp_dir() . '/sgs-seeder-fixtures-' . uniqid();
			mkdir( $this->fixtures_dir, 0777, true );
			$GLOBALS['sgs_test_styles_dir'] = $this->fixtures_dir;

			// Default complete variation.
			file_put_contents(
				$this->fixtures_dir . '/mamas-munches.json',
				json_encode(
					array(
						'title'    => 'mamas-munches',
						'settings' => array(
							'custom' => array(
								'sgs' => array(
									'headerPattern' => 'sgs/mamas-header',
									'footerPattern' => 'sgs/mamas-footer',
								),
							),
						),
					)
				)
			);
			// Variation missing headerPattern.
			file_put_contents(
				$this->fixtures_dir . '/no-header.json',
				json_encode(
					array(
						'title'    => 'no-header',
						'settings' => array(
							'custom' => array(
								'sgs' => array(
									'footerPattern' => 'sgs/some-footer',
								),
							),
						),
					)
				)
			);

			// Reset the block-pattern registry stub.
			\Sgs_Test_Pattern_Registry::reset();
			\Sgs_Test_Pattern_Registry::add( 'sgs/mamas-header', '<!-- wp:paragraph --><p>Header</p><!-- /wp:paragraph -->' );
			\Sgs_Test_Pattern_Registry::add( 'sgs/mamas-footer', '<!-- wp:paragraph --><p>Footer</p><!-- /wp:paragraph -->' );
			\Sgs_Test_Pattern_Registry::add( Sgs_Template_Part_Seeder::DEFAULT_HEADER_PATTERN, '<!-- wp:paragraph --><p>Default header</p><!-- /wp:paragraph -->' );
			\Sgs_Test_Pattern_Registry::add( Sgs_Template_Part_Seeder::DEFAULT_FOOTER_PATTERN, '<!-- wp:paragraph --><p>Default footer</p><!-- /wp:paragraph -->' );
		}

		protected function tearDown(): void {
			// Best-effort fixture cleanup.
			$files = glob( $this->fixtures_dir . '/*' );
			foreach ( ( is_array( $files ) ? $files : array() ) as $f ) {
				@unlink( $f );
			}
			@rmdir( $this->fixtures_dir );
			unset( $GLOBALS['sgs_test_styles_dir'] );
		}

		private function build_global_styles_post( string $variation_slug ): \WP_Post {
			$content = json_encode( array( 'title' => $variation_slug ) );
			$post    = new \WP_Post( 999, (string) $content, 'wp_global_styles' );
			$GLOBALS['sgs_test_posts'][999] = $post;
			return $post;
		}

		private function seed_existing_template_parts( ?string $stored_variation ): void {
			$GLOBALS['sgs_test_template_parts']['header'] = array( 11 );
			$GLOBALS['sgs_test_template_parts']['footer'] = array( 22 );
			if ( null !== $stored_variation ) {
				$GLOBALS['sgs_test_postmeta'][11][ Sgs_Template_Part_Meta::META_VARIATION_SLUG ] = $stored_variation;
				$GLOBALS['sgs_test_postmeta'][22][ Sgs_Template_Part_Meta::META_VARIATION_SLUG ] = $stored_variation;
			}
		}

		// Test 1 — mismatched meta on both → both records seeded.
		public function test_variation_switch_seeds_both_records(): void {
			$this->seed_existing_template_parts( 'helping-doctors' );
			$this->build_global_styles_post( 'mamas-munches' );

			Sgs_Template_Part_Seeder::maybe_seed( 999 );

			$this->assertArrayHasKey( 11, $GLOBALS['sgs_test_updated_posts'], 'Header record should be updated' );
			$this->assertArrayHasKey( 22, $GLOBALS['sgs_test_updated_posts'], 'Footer record should be updated' );
			$this->assertSame( 'mamas-munches', $GLOBALS['sgs_test_postmeta'][11][ Sgs_Template_Part_Meta::META_VARIATION_SLUG ] );
			// sanitize_pattern_slug() preserves the slash — round-trip integrity intact.
			$this->assertSame( 'sgs/mamas-header', $GLOBALS['sgs_test_postmeta'][11][ Sgs_Template_Part_Meta::META_PATTERN_SLUG ] );
			$this->assertSame( 'sgs/mamas-footer', $GLOBALS['sgs_test_postmeta'][22][ Sgs_Template_Part_Meta::META_PATTERN_SLUG ] );
		}

		// Test 2 — meta already matches new slug → no writes (idempotency).
		public function test_matching_meta_is_idempotent_noop(): void {
			$this->seed_existing_template_parts( 'mamas-munches' );
			$this->build_global_styles_post( 'mamas-munches' );

			Sgs_Template_Part_Seeder::maybe_seed( 999 );

			$this->assertSame( array(), $GLOBALS['sgs_test_updated_posts'], 'No update_post calls expected' );
			$this->assertSame( array(), $GLOBALS['sgs_test_inserted_posts'], 'No insert_post calls expected' );
		}

		// Test 3 — transient already set → second call bails.
		public function test_transient_lock_blocks_concurrent_seeding(): void {
			$this->seed_existing_template_parts( 'helping-doctors' );
			$this->build_global_styles_post( 'mamas-munches' );

			// Pre-seed the lock as if another save is mid-flight.
			set_transient( Sgs_Template_Part_Seeder::TRANSIENT_LOCK, 1, 5 );

			Sgs_Template_Part_Seeder::maybe_seed( 999 );

			$this->assertSame( array(), $GLOBALS['sgs_test_updated_posts'] );
			$this->assertSame( array(), $GLOBALS['sgs_test_inserted_posts'] );
		}

		// Test 4 — manifest missing headerPattern → falls back to framework default.
		public function test_missing_header_pattern_falls_back_to_default(): void {
			$this->seed_existing_template_parts( 'previous' );
			$this->build_global_styles_post( 'no-header' );

			Sgs_Template_Part_Seeder::maybe_seed( 999 );

			$this->assertSame(
				Sgs_Template_Part_Seeder::DEFAULT_HEADER_PATTERN,
				$GLOBALS['sgs_test_postmeta'][11][ Sgs_Template_Part_Meta::META_PATTERN_SLUG ],
				'Header should fall back to framework default when manifest omits headerPattern.'
			);
		}

		// Test 5 — capability fails → no write.
		public function test_capability_failure_aborts_seeding(): void {
			\Wp_Options_Stub::$user_can = false;
			$this->seed_existing_template_parts( 'helping-doctors' );
			$this->build_global_styles_post( 'mamas-munches' );

			Sgs_Template_Part_Seeder::maybe_seed( 999 );

			$this->assertSame( array(), $GLOBALS['sgs_test_updated_posts'] );
			$this->assertSame( array(), $GLOBALS['sgs_test_inserted_posts'] );
		}

		// Test 6 — safety guard not armed → no write (existing-site preservation).
		public function test_safety_guard_not_armed_skips_seeding(): void {
			// Arm to a future timestamp so seeding_armed() returns false.
			update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, time() + 3600 );
			$this->seed_existing_template_parts( 'helping-doctors' );
			$this->build_global_styles_post( 'mamas-munches' );

			Sgs_Template_Part_Seeder::maybe_seed( 999 );

			$this->assertSame( array(), $GLOBALS['sgs_test_updated_posts'] );
			$this->assertSame( array(), $GLOBALS['sgs_test_inserted_posts'] );
		}

		// Test 7 — pattern not in registry → falls back to framework default.
		public function test_unregistered_pattern_falls_back_to_default(): void {
			// Remove the variation's declared pattern from the registry, keep the default.
			\Sgs_Test_Pattern_Registry::remove( 'sgs/mamas-header' );
			$this->seed_existing_template_parts( 'helping-doctors' );
			$this->build_global_styles_post( 'mamas-munches' );

			Sgs_Template_Part_Seeder::maybe_seed( 999 );

			$this->assertSame(
				Sgs_Template_Part_Seeder::DEFAULT_HEADER_PATTERN,
				$GLOBALS['sgs_test_postmeta'][11][ Sgs_Template_Part_Meta::META_PATTERN_SLUG ],
				'Header should fall back to framework default when its declared pattern is not registered.'
			);
		}
	}
}

// Block-patterns registry stub — installed once.
if ( ! class_exists( 'WP_Block_Patterns_Registry' ) ) {
	class Sgs_Test_Pattern_Registry {
		/**
		 * Registered patterns map.
		 *
		 * @var array<string,string>
		 */
		public static array $patterns = array();
		public static function reset(): void {
			self::$patterns = array(); }
		public static function add( string $slug, string $content ): void {
			self::$patterns[ $slug ] = $content; }
		public static function remove( string $slug ): void {
			unset( self::$patterns[ $slug ] ); }
	}

	class WP_Block_Patterns_Registry {
		private static ?self $instance = null;
		public static function get_instance(): self {
			return self::$instance ??= new self();
		}
		public function is_registered( string $slug ): bool {
			return isset( \Sgs_Test_Pattern_Registry::$patterns[ $slug ] );
		}
		public function get_registered( string $slug ): array {
			return array( 'content' => \Sgs_Test_Pattern_Registry::$patterns[ $slug ] ?? '' );
		}
	}
}
