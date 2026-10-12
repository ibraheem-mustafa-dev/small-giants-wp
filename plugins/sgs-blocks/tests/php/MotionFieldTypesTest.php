<?php
/**
 * Tests: the motion field-type class (Spec 38A FR-38A-55) loads through the real require paths with no fatal, and
 * refuses wrong-typed stored values instead of fataling.
 *
 * Both paths are exercised: `includes/motion-loader.php` (the one folder loader `sgs-blocks.php` requires) and
 * `includes/helpers-motion-easing.php` (which every motion include and standalone test requires, and which requires
 * the class itself), in that order, so the second require of the class is the double require the loader must survive.
 * Verdict and CSS parity with the editor is proven by `tests/js/motion-field-types-parity.test.js`.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionFieldTypesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code: test names describe each case, and the fixtures read local plugin files.
// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Squiz.Commenting.ClassComment.Missing, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.Arrays.ArrayDeclarationSpacing.AssociativeArrayFound

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Field_Types;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// The loader requires every motion include, and support-registration.php calls add_filter() when it loads.
if ( ! function_exists( 'add_filter' ) ) {
	function add_filter(): bool {
		return true;
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/motion-loader.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-motion-easing.php';

final class MotionFieldTypesTest extends TestCase {

	private const PLUGIN = __DIR__ . '/../..';

	public function test_sgs_blocks_requires_the_motion_folder_loader(): void {
		$main = (string) file_get_contents( self::PLUGIN . '/sgs-blocks.php' );
		$this->assertStringContainsString( "require_once SGS_BLOCKS_PATH . 'includes/motion-loader.php';", $main );
	}

	public function test_the_loader_reads_the_four_folders_in_order(): void {
		$loader = (string) file_get_contents( self::PLUGIN . '/includes/motion-loader.php' );
		$this->assertStringContainsString( "array( '', '/field-types', '/migrate', '/migrate/mappers' )", $loader );
		$this->assertStringContainsString( 'sort( $files, SORT_STRING );', $loader );
		$this->assertStringContainsString( 'require_once $file;', $loader );
	}

	public function test_helpers_motion_easing_requires_the_class(): void {
		$helpers = (string) file_get_contents( self::PLUGIN . '/includes/helpers-motion-easing.php' );
		$this->assertStringContainsString( "require_once __DIR__ . '/motion/class-sgs-motion-field-types.php';", $helpers );
	}

	public function test_the_class_and_its_helpers_are_loaded(): void {
		$this->assertTrue( class_exists( Sgs_Motion_Field_Types::class, false ) );
		$this->assertTrue( class_exists( 'SGS\Blocks\Motion\Sgs_Motion_Schema_Eval', false ) );
		$this->assertTrue( class_exists( 'SGS\Blocks\Motion\Sgs_Motion_Field_Css', false ) );
		$this->assertTrue( function_exists( 'sgs_motion_easing_css' ) );
	}

	public function test_the_schema_is_read_once_from_the_plugin(): void {
		$this->assertFileExists( Sgs_Motion_Field_Types::schema_path() );
		$this->assertSame( Sgs_Motion_Field_Types::schema(), Sgs_Motion_Field_Types::schema() );
		$this->assertCount( 15, Sgs_Motion_Field_Types::names() );
	}

	public function test_named_values(): void {
		$this->assertSame( 'var(--wp--custom--duration--fast)', Sgs_Motion_Field_Types::css( 'duration', 'token:duration.fast' )['css'] );
		$this->assertSame( 'calc(-1 * var(--wp--custom--distance--sm))', Sgs_Motion_Field_Types::css( 'distance', '-token:distance.sm' )['css'] );
		$this->assertSame( '0ms', Sgs_Motion_Field_Types::css( 'duration', 0 )['css'] );
		$this->assertSame( 'linear(0, 1.05 60%, 1)', Sgs_Motion_Field_Types::sanitise( 'easing', 'linear(0, 1.05 60%, 1)' ) );
		$this->assertTrue( Sgs_Motion_Field_Types::is_valid_cubic_bezier( 'cubic-bezier(0.34, 1.56, 0.64, 1)' ) );
		$this->assertFalse( Sgs_Motion_Field_Types::is_valid_cubic_bezier( 'cubic-bezier(1.2, 0, 0, 1)' ) );
		$this->assertNull( Sgs_Motion_Field_Types::sanitise( 'duration', '0.5s; color:red' ) );
		$this->assertNull( Sgs_Motion_Field_Types::sanitise( 'duration', 'token:duration.nope' ) );
	}

	public function test_a_unit_string_past_the_field_range_is_refused(): void {
		$max_angle = Sgs_Motion_Field_Types::defs()['TiltValues']['properties']['maxAngle'];
		$this->assertNull( Sgs_Motion_Field_Types::sanitise( 'angle', '90deg', $max_angle ) );
		$this->assertSame( '30deg', Sgs_Motion_Field_Types::sanitise( 'angle', '30deg', $max_angle ) );
	}

	/**
	 * Wrong-typed stored values and wrong-typed arguments are refused, never fatal.
	 *
	 * @param mixed $type       Field type argument.
	 * @param mixed $value      Stored value.
	 * @param mixed $field_node Field node argument.
	 */
	#[DataProvider( 'wrong_typed_inputs' )]
	public function test_wrong_typed_inputs_are_refused( $type, $value, $field_node ): void {
		$verdict = Sgs_Motion_Field_Types::validate( $type, $value, $field_node );
		$this->assertFalse( $verdict['ok'] );
		$this->assertIsString( $verdict['error'] );
		$this->assertNull( Sgs_Motion_Field_Types::sanitise( $type, $value, $field_node ) );
	}

	/**
	 * Cases for test_wrong_typed_inputs_are_refused.
	 *
	 * @return array<string,array{0:mixed,1:mixed,2:mixed}>
	 */
	public static function wrong_typed_inputs(): array {
		return array(
			'array duration'       => array( 'duration', array( 250 ), null ),
			'object easing'        => array( 'easing', (object) array( 'a' => 1 ), null ),
			'null distance'        => array( 'distance', null, null ),
			'string row'           => array( 'propertyRow', 'opacity', null ),
			'list row'             => array( 'propertyRow', array( 1, 2 ), null ),
			'nested bad row'       => array( 'propertyRow', array( 'property' => 'opacity', 'from' => array( 'x' ) ), null ),
			'array type'           => array( array( 'duration' ), 250, null ),
			'int type'             => array( 7, 250, null ),
			'string field node'    => array( 'duration', 250, 'not a node' ),
			'float infinity'       => array( 'ratio', INF, null ),
			'numeric string ratio' => array( 'ratio', '1', null ),
			'bool asset'           => array( 'assetReference', true, null ),
		);
	}

	public function test_a_stdclass_row_reads_as_an_array(): void {
		$row = Sgs_Motion_Field_Types::css( 'propertyRow', (object) array( 'property' => 'opacity', 'from' => 0, 'to' => 1 ) );
		$this->assertTrue( $row['ok'] );
		$this->assertSame( array( 'property' => 'opacity', 'from' => '0', 'to' => '1' ), $row['css'] );
	}
}
