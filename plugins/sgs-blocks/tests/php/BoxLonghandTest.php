<?php
/**
 * Tests: padding and margin boxes print only the sides that are set (CR6).
 *
 * The old sgs_box_object_shorthand() returns a four-value shorthand, and a shorthand sets every side, so an
 * unset side is printed as 0 and wipes the block's own default or a wider tier's value. Its
 * longhand siblings, sgs_box_object_longhand_list() and sgs_box_object_longhands(), print one
 * declaration per set side and nothing for the rest.
 *
 * Corner radius has the same defect and the same cure: sgs_corner_object_shorthand() and
 * sgs_serialise_box_corners() print 0 for an unset corner, and sgs_corner_object_longhands() prints
 * one border-*-radius declaration per set corner.
 *
 * Two halves, for sides and for corners:
 *  1. The longhand siblings: set sides or corners only, null when empty, an explicit 0 kept, unsafe
 *     values rejected, padding and margin only for sides (a border width keeps the shorthand on purpose).
 *  2. A byte-identity pin of each old shorthand function, which stays in use for the `var()`
 *     consumers and every site not yet migrated: its output must not move.
 *
 * Self-contained: bootstrap.php defines ABSPATH and stubs esc_attr(); outside WordPress the spacing
 * preset list is empty, so a bare number reads as pixels.
 *
 * Run with:
 *   vendor/bin/phpunit --filter BoxLonghandTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/helpers-box.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-container.php';

/**
 * The longhand box helpers and the pinned shorthand.
 */
final class BoxLonghandTest extends TestCase {

	/**
	 * Inputs shared by both halves, so the pin and the new behaviour read the same boxes.
	 *
	 * @return array<string, array{0: array<string, string>, 1: ?string, 2: ?string}> box, shorthand, padding longhands.
	 */
	public static function boxes(): array {
		return array(
			'one side'      => array( array( 'top' => '12px' ), '12px 0 0 0', 'padding-top:12px' ),
			'all four'      => array(
				array(
					'top'    => '1px',
					'right'  => '2px',
					'bottom' => '3px',
					'left'   => '4px',
				),
				'1px 2px 3px 4px',
				'padding-top:1px;padding-right:2px;padding-bottom:3px;padding-left:4px',
			),
			'none'          => array( array(), null, null ),
			'explicit zero' => array( array( 'left' => '0' ), '0 0 0 0px', 'padding-left:0px' ),
			'bare number'   => array( array( 'right' => '24' ), '0 24px 0 0', 'padding-right:24px' ),
			'preset var'    => array( array( 'bottom' => 'var(--wp--preset--spacing--30)' ), '0 0 var(--wp--preset--spacing--30) 0', 'padding-bottom:var(--wp--preset--spacing--30)' ),
			'unsafe value'  => array( array( 'top' => '1px;}body{color:red' ), null, null ),
			'two sides'     => array(
				array(
					'top'    => '10px',
					'bottom' => '2rem',
				),
				'10px 0 2rem 0',
				'padding-top:10px;padding-bottom:2rem',
			),
		);
	}

	/**
	 * The longhand sibling prints only the set sides, and null when there are none.
	 *
	 * @param array<string, string> $box       Box object.
	 * @param ?string               $shorthand Unused here.
	 * @param ?string               $longhands Expected longhand block.
	 */
	#[DataProvider( 'boxes' )]
	public function test_longhands_print_only_the_set_sides( array $box, ?string $shorthand, ?string $longhands ): void {
		$this->assertSame( $longhands, sgs_box_object_longhands( $box, 'padding' ) );
	}

	/**
	 * Byte-identity pin: the shorthand's output is unchanged for every input.
	 *
	 * @param array<string, string> $box       Box object.
	 * @param ?string               $shorthand Expected shorthand, exactly as it printed before CR6.
	 */
	#[DataProvider( 'boxes' )]
	public function test_the_shorthand_is_byte_identical( array $box, ?string $shorthand ): void {
		$this->assertSame( $shorthand, sgs_box_object_shorthand( $box ) );
	}

	/**
	 * The list form carries one declaration per set side, in top, right, bottom, left order.
	 */
	public function test_the_list_form_keeps_side_order(): void {
		$this->assertSame(
			array( 'margin-top:8px', 'margin-left:16px' ),
			sgs_box_object_longhand_list(
				array(
					'left' => '16px',
					'top'  => '8px',
				),
				'margin'
			)
		);
	}

	/**
	 * Padding and margin only: a border width keeps the shorthand, and anything else is refused.
	 */
	public function test_only_padding_and_margin_are_families(): void {
		$box = array( 'top' => '2px' );
		$this->assertSame( array(), sgs_box_object_longhand_list( $box, 'border-width' ) );
		$this->assertNull( sgs_box_object_longhands( $box, 'border-width' ) );
		$this->assertNull( sgs_box_object_longhands( $box, 'color' ) );
	}

	/**
	 * A value that is not a box yields nothing rather than an error (a raw null reaches some callers).
	 */
	public function test_a_non_box_yields_nothing(): void {
		$this->assertNull( sgs_box_object_longhands( null, 'padding' ) );
		$this->assertNull( sgs_box_object_longhands( '12px', 'padding' ) );
		$this->assertSame( array(), sgs_box_object_longhand_list( 7, 'margin' ) );
	}

	/**
	 * Never an empty string: every caller guards with `null !==`, and '' would print an empty rule.
	 */
	public function test_an_empty_box_is_null_never_an_empty_string(): void {
		$this->assertNull( sgs_box_object_longhands( array( 'top' => '' ), 'padding' ) );
	}

	/**
	 * Corner inputs shared by both halves.
	 *
	 * @return array<string, array{0: mixed, 1: ?string, 2: string, 3: ?string}> box, corner shorthand,
	 *     serialised corners, longhands.
	 */
	public static function corners(): array {
		return array(
			'one corner'    => array( array( 'topLeft' => '20px' ), '20px 0 0 0', '20px 0 0 0', 'border-top-left-radius:20px' ),
			'all four'      => array(
				array(
					'topLeft'     => '1px',
					'topRight'    => '2px',
					'bottomRight' => '3px',
					'bottomLeft'  => '4px',
				),
				'1px 2px 3px 4px',
				'1px 2px 3px 4px',
				'border-top-left-radius:1px;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px',
			),
			'none'          => array( array(), null, '', null ),
			'explicit zero' => array( array( 'bottomLeft' => '0' ), '0 0 0 0px', '0 0 0 0px', 'border-bottom-left-radius:0px' ),
			'bare number'   => array( array( 'topRight' => '8' ), '0 8px 0 0', '0 8px 0 0', 'border-top-right-radius:8px' ),
			'unsafe value'  => array( array( 'topLeft' => '1px;}body{color:red' ), null, '', null ),
			'side keys'     => array( array( 'top' => '6px' ), null, '', null ),
			'two corners'   => array(
				array(
					'bottomRight' => '4px',
					'topLeft'     => '50%',
				),
				'50% 0 4px 0',
				'50% 0 4px 0',
				'border-top-left-radius:50%;border-bottom-right-radius:4px',
			),
		);
	}

	/**
	 * The corner sibling prints only the set corners, in corner order, and null when there are none.
	 *
	 * @param mixed   $box       Corner object.
	 * @param ?string $shorthand Unused here.
	 * @param string  $serialised Unused here.
	 * @param ?string $longhands Expected longhand block.
	 */
	#[DataProvider( 'corners' )]
	public function test_corner_longhands_print_only_the_set_corners( $box, ?string $shorthand, string $serialised, ?string $longhands ): void {
		$this->assertSame( $longhands, sgs_corner_object_longhands( $box ) );
	}

	/**
	 * Byte-identity pin: both corner shorthands print exactly what they printed before CR6.
	 *
	 * @param mixed   $box        Corner object.
	 * @param ?string $shorthand  Expected sgs_corner_object_shorthand() output.
	 * @param string  $serialised Expected sgs_serialise_box_corners() output.
	 */
	#[DataProvider( 'corners' )]
	public function test_the_corner_shorthands_are_byte_identical( $box, ?string $shorthand, string $serialised ): void {
		$this->assertSame( $shorthand, sgs_corner_object_shorthand( $box ) );
		$this->assertSame( $serialised, sgs_serialise_box_corners( $box ) );
	}

	/**
	 * A value that is not a corner box yields nothing (a raw null reaches some callers).
	 */
	public function test_a_non_box_yields_no_corners(): void {
		$this->assertNull( sgs_corner_object_longhands( null ) );
		$this->assertNull( sgs_corner_object_longhands( '12px' ) );
		$this->assertSame( array(), sgs_corner_object_longhand_list( 7 ) );
	}
}
