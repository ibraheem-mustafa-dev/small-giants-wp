<?php
/**
 * Tests: the motion support registration filter (Spec 38A FR-38A-1).
 *
 * A block whose registered arguments carry `supports.sgs.motion` gets the `sgsMotion` object attribute with no
 * default; a block without it does not; and when `sgs_motion_support_enabled` returns false the attribute is not added
 * and the support is stripped from the arguments (which is what switches the editor side off).
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionSupportRegistrationTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Squiz.Commenting.ClassComment.Missing, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.Arrays.ArrayDeclarationSpacing.AssociativeArrayFound

namespace SGS\Blocks\Motion {
	// Namespaced stubs win over the global functions inside the shipped file's namespace.
	if ( ! function_exists( __NAMESPACE__ . '\add_filter' ) ) {
		function add_filter(): bool {
			return true;
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\apply_filters' ) ) {
		function apply_filters( string $hook_name, $value ) {
			return $GLOBALS['sgs_test_filter_results'][ $hook_name ] ?? $value;
		}
	}
}

namespace {
	use PHPUnit\Framework\TestCase;

	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	}

	require_once dirname( __DIR__, 2 ) . '/includes/motion/support-registration.php';

	final class MotionSupportRegistrationTest extends TestCase {

		private const FILE = __DIR__ . '/../../includes/motion/support-registration.php';

		protected function setUp(): void {
			$GLOBALS['sgs_test_filter_results'] = array();
		}

		protected function tearDown(): void {
			unset( $GLOBALS['sgs_test_filter_results'] );
		}

		private function register( array $args ): array {
			return \SGS\Blocks\Motion\sgs_motion_register_block_type_args( $args, 'sgs/info-box' );
		}

		public function test_a_supporting_block_gains_the_attribute_with_no_default(): void {
			$out = $this->register(
				array(
					'attributes' => array( 'title' => array( 'type' => 'string' ) ),
					'supports'   => array( 'sgs' => array( 'motion' => true ) ),
				)
			);
			$this->assertSame( array( 'type' => 'object' ), $out['attributes']['sgsMotion'] );
			$this->assertArrayNotHasKey( 'default', $out['attributes']['sgsMotion'] );
			$this->assertArrayHasKey( 'title', $out['attributes'] );
			$this->assertTrue( $out['supports']['sgs']['motion'] );
		}

		public function test_a_supporting_block_with_no_attributes_gains_it(): void {
			$out = $this->register( array( 'supports' => array( 'sgs' => array( 'motion' => true ) ) ) );
			$this->assertSame( array( 'sgsMotion' => array( 'type' => 'object' ) ), $out['attributes'] );
		}

		public function test_a_block_without_the_support_is_unchanged(): void {
			$cases = array(
				array( 'attributes' => array( 'a' => array( 'type' => 'string' ) ) ),
				array( 'supports' => array( 'sgs' => array( 'hideExtensions' => array( 'animation' ) ) ) ),
				array( 'supports' => array( 'sgs' => array( 'motion' => false ) ) ),
				array( 'supports' => array( 'html' => false ) ),
			);
			foreach ( $cases as $args ) {
				$this->assertSame( $args, $this->register( $args ) );
			}
		}

		public function test_switching_the_filter_off_adds_nothing_and_strips_the_support(): void {
			$GLOBALS['sgs_test_filter_results']['sgs_motion_support_enabled'] = false;
			$out = $this->register(
				array(
					'attributes' => array( 'title' => array( 'type' => 'string' ) ),
					'supports'   => array( 'sgs' => array( 'motion' => true, 'hideExtensions' => array( 'x' ) ) ),
				)
			);
			$this->assertArrayNotHasKey( 'sgsMotion', $out['attributes'] );
			$this->assertArrayNotHasKey( 'motion', $out['supports']['sgs'] );
			$this->assertSame( array( 'x' ), $out['supports']['sgs']['hideExtensions'] );
		}

		public function test_the_filter_is_registered_on_register_block_type_args(): void {
			$src = (string) file_get_contents( self::FILE );
			$this->assertStringContainsString( "add_filter( 'register_block_type_args', __NAMESPACE__ . '\\sgs_motion_register_block_type_args', 10, 2 );", $src );
			$this->assertStringContainsString( "apply_filters( 'sgs_motion_support_enabled', true )", $src );
		}

		public function test_the_generated_extension_list_never_carries_the_attribute(): void {
			$generated = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/extension-attributes.generated.php' );
			$this->assertStringNotContainsString( 'sgsMotion', $generated );
		}
	}
}
