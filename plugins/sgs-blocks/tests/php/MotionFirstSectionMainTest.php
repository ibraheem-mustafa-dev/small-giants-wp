<?php
/**
 * Tests: the renderer's above-the-fold mark with a lone `main` wrapper (Spec 38A §9, `Sgs_Motion_Fold`).
 *
 * A page whose main content is one top-level block with `tagName` `main` passes the mark to the wrapper's first two
 * children; a `main` block with top-level siblings, and the first two plain sections, keep the mark themselves; an
 * `<img fetchpriority="high">` below them fades from 0 like any other block.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionFirstSectionMainTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionFirstSectionMainTest extends TestCase {

	private const HTML = '<div class="wp-block-sgs-hero"><p>Hi</p></div>';

	protected function setUp(): void {
		if ( ! defined( 'SGS_BLOCKS_URL' ) ) {
			define( 'SGS_BLOCKS_URL', 'https://example.test/sgs-blocks/' );
		}
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		if ( ! function_exists( 'parse_blocks' ) ) {
			// Stand-in: the test hands over the top-level blocks the real parser would return.
			function parse_blocks( $content ) {
				return $GLOBALS['sgs_test_top_blocks'] ?? array();
			}
		}
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_in_loop']  = true;
	}

	private static function main_block(): array {
		return array( 'blockName' => 'sgs/container', 'attrs' => array( 'tagName' => 'main' ), 'innerBlocks' => array( self::section(), self::section(), self::section() ) );
	}

	private static function section(): array {
		return array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array() );
	}

	/** Arm the content the way the_content does, with these top-level blocks (the content string carries "main"). */
	private function arm( array $top ): void {
		$GLOBALS['sgs_test_top_blocks'] = $top;
		Sgs_Motion_Renderer::arm_first_section( '<!-- wp:sgs/container {"tagName":"main"} -->' );
	}

	/** Whether the block, rendered as the next one, sits above the fold. */
	private function first( array $block, $parent = null ): bool {
		$seen = null;
		sgs_test_render_motion_block(
			$block,
			self::HTML,
			$parent,
			static function () use ( &$seen ): void {
				$seen = Sgs_Motion_Renderer::in_above_fold();
			}
		);
		return (bool) $seen;
	}

	private function css(): string {
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	public function test_happy_lone_main_wrapper_passes_the_mark_to_its_first_child(): void {
		$this->arm( array( self::main_block() ) );
		$wrapper = self::main_block();
		$renderer = Sgs_Motion_Renderer::class;
		$wrapper  = $renderer::open_frame( $wrapper, $wrapper, null );
		$this->assertFalse( $renderer::in_above_fold(), 'the wrapper does not take the mark' );
		$parent = (object) array( 'name' => 'sgs/container' );
		$this->assertTrue( $this->first( array( 'blockName' => 'sgs/hero', 'attrs' => array() ), $parent ), 'the first child takes it' );
		$this->assertTrue( $this->first( array( 'blockName' => 'sgs/hero', 'attrs' => array() ), $parent ), 'the second child does too' );
		$this->assertFalse( $this->first( array( 'blockName' => 'sgs/hero', 'attrs' => array() ), $parent ), 'the third child does not' );
		$renderer::close_frame( '', $wrapper );
	}

	public function test_happy_the_first_two_plain_sections_take_the_mark(): void {
		$this->arm( array( self::section(), self::section(), self::section() ) );
		$this->assertTrue( $this->first( self::section() ) );
		$this->assertTrue( $this->first( self::section() ) );
		$this->assertFalse( $this->first( self::section() ), 'the third top-level block does not' );
	}

	public function test_edge_a_template_part_is_not_counted_as_a_section(): void {
		$this->arm( array( self::section(), self::section(), self::section() ) );
		$part = array( 'blockName' => 'core/template-part', 'attrs' => array(), 'innerBlocks' => array() );
		$this->assertFalse( $this->first( $part ) );
		$this->assertTrue( $this->first( self::section() ) );
		$this->assertTrue( $this->first( self::section() ) );
		$this->assertFalse( $this->first( self::section() ) );
	}

	public function test_edge_main_with_a_sibling_takes_the_mark_itself(): void {
		$this->arm( array( self::main_block(), self::section() ) );
		$this->assertTrue( $this->first( self::main_block() ) );
	}

	public function test_edge_an_empty_lone_main_leaves_nothing_pending_for_later_blocks(): void {
		$this->arm( array( self::main_block() ) );
		$this->first( self::main_block() );
		$this->assertFalse( $this->first( self::section() ), 'a block rendered after the wrapper (a footer) is not the first section' );
	}

	public function test_fail_unarmed_render_marks_nothing(): void {
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_test_in_loop'] = false;
		$this->assertFalse( $this->first( self::main_block() ) );
		$this->assertFalse( $this->first( self::section() ) );
	}

	public function test_edge_a_high_priority_image_outside_the_first_section_fades_from_zero(): void {
		$this->arm( array( self::section(), self::section(), self::section() ) );
		$this->first( self::section() );
		$this->first( self::section() );
		$motion = array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => 'load', 'values' => array( 'from' => array( 'opacity' => 0 ), 'duration' => 600 ) ) ) ) ),
		);
		sgs_test_render_motion_block(
			array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => $motion ) ),
			'<div class="wp-block-sgs-hero"><img src="a.jpg" fetchpriority="high" alt=""></div>'
		);
		$this->assertStringContainsString( '--sgs-me-from-op:0;', str_replace( ' ', '', $this->css() ) );
	}

	public function test_edge_in_first_section_names_only_section_one_while_the_fold_holds_two(): void {
		$this->arm( array( self::section(), self::section(), self::section() ) );
		$marks = array();
		foreach ( array( 1, 2, 3 ) as $unused ) {
			sgs_test_render_motion_block(
				self::section(),
				self::HTML,
				null,
				static function () use ( &$marks ): void {
					$marks[] = array( Sgs_Motion_Renderer::in_first_section(), Sgs_Motion_Renderer::in_above_fold() );
				}
			);
		}
		$this->assertSame( array( array( true, true ), array( false, true ), array( false, false ) ), $marks );
	}
}
