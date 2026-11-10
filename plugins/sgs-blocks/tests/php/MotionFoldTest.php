<?php
/**
 * Tests: the pure above-the-fold definition (Spec 38A §9), `Sgs_Motion_Fold::is_above_fold`.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionFoldTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Fold;

final class MotionFoldTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-motion-fold.php';
	}

	private static function block( string $name = 'sgs/container', array $attrs = array(), array $inner = array() ): array {
		return array( 'blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => $inner );
	}

	private static function blank(): array {
		return array( 'blockName' => null, 'attrs' => array(), 'innerBlocks' => array() );
	}

	private static function part(): array {
		return self::block( 'core/template-part' );
	}

	public function test_happy_the_section_count_is_two(): void {
		$this->assertSame( 2, Sgs_Motion_Fold::FOLD_SECTIONS );
	}

	public function test_happy_first_two_top_level_blocks_and_their_descendants_are_above_the_fold(): void {
		$tree = array( self::block( 'sgs/hero', array(), array( self::block(), self::block( 'sgs/x', array(), array( self::block() ) ) ) ), self::block(), self::block() );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 0 ) ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 0, 1, 0 ) ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 1 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 2 ) ) );
	}

	public function test_edge_a_template_part_is_not_counted(): void {
		$tree = array( self::part(), self::block(), self::part(), self::block(), self::block(), self::part() );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 0 ) ), 'the header is not content' );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 1 ) ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 3 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 4 ) ), 'the third content section is below the fold' );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 5 ) ) );
	}

	public function test_edge_freeform_whitespace_entries_do_not_count(): void {
		$tree = array( self::blank(), self::block(), self::blank(), self::block(), self::blank(), self::block() );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 1 ) ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 3 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 5 ) ) );
	}

	public function test_edge_lone_main_wrapper_is_transparent_and_its_first_two_children_are_the_fold(): void {
		$main = self::block( 'sgs/container', array( 'tagName' => 'main' ), array( self::block( 'sgs/hero', array(), array( self::block() ) ), self::part(), self::block(), self::block() ) );
		$tree = array( self::blank(), $main );
		$this->assertTrue( Sgs_Motion_Fold::is_lone_main( $tree ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 1 ) ), 'the wrapper itself is not marked' );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 1, 0, 0 ) ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 1, 2 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 1, 3 ) ) );
	}

	public function test_edge_main_block_with_siblings_is_an_ordinary_section(): void {
		$tree = array( self::block( 'sgs/container', array( 'tagName' => 'main' ), array( self::block() ) ), self::block(), self::block() );
		$this->assertFalse( Sgs_Motion_Fold::is_lone_main( $tree ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 0, 0 ) ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( $tree, array( 1 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( $tree, array( 2 ) ) );
	}

	public function test_fail_empty_tree_empty_path_and_unknown_positions_are_not_above_the_fold(): void {
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( array(), array( 0 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( array( self::block() ), array() ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( array( self::block() ), array( 7 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( array( self::block( 'sgs/container', array( 'tagName' => 'main' ) ) ), array( 0, 0 ) ) );
	}

	public function test_edge_a_template_part_inside_a_lone_main_is_not_counted(): void {
		$main = self::block( 'sgs/container', array( 'tagName' => 'main' ), array( self::part(), self::block() ) );
		$this->assertTrue( Sgs_Motion_Fold::is_above_fold( array( $main ), array( 0, 1 ) ) );
		$this->assertFalse( Sgs_Motion_Fold::is_above_fold( array( $main ), array( 0, 0 ) ) );
	}
}
