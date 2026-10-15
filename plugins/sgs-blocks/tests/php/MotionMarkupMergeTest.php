<?php
/**
 * Tests: two motion targets on one element, and token lists that join what is already there (Spec 38A §6.2, §6.5).
 *
 * A breadcrumb's current item carries both `sgs-breadcrumbs__item` (the `item` part) and
 * `sgs-breadcrumbs__item--current` (the `current` part). `item` is declared first in `supports.sgs.elements`, so it
 * keeps the element's hover state and entrance; `current` loses both (reported through `sgs_motion_layer_dropped`
 * with the id `shared-element`) and writes no `transition` (`Sgs_Motion_Shared_Element`). A token list
 * (`data-sgs-mc`, `data-sgs-fx`) joins the value already on the element, including a block's own render.php value
 * (`Sgs_Motion_Markup::write` and `apply`). The tag-processor stand-in passes its own quoted-value self-test.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionMarkupMergeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Markup;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

// The stand-ins define global WordPress functions, so each test runs in its own process (as MotionRendererTest).
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionMarkupMergeTest extends TestCase {

	private const CRUMBS = '<nav class="wp-block-sgs-breadcrumbs"><ol><li class="sgs-breadcrumbs__item"><a href="/">Home</a></li><li class="sgs-breadcrumbs__item sgs-breadcrumbs__item--current">Here</li></ol></nav>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_in_loop']  = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private function render( array $elements ): string {
		return sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/breadcrumbs',
				'attrs'     => array(
					'sgsMotion' => array(
						'v'        => 1,
						'elements' => $elements,
					),
				),
			),
			self::CRUMBS
		);
	}

	/** The opening tag of the `<li>` whose class attribute is exactly this list. */
	private function tag_with( string $html, string $classes ): string {
		$this->assertSame( 1, preg_match( '/<li\b[^>]*\bclass="' . preg_quote( $classes, '/' ) . '"[^>]*>/', $html, $m ), $html );
		return $m[0];
	}

	/** The `shared-element` drops reported for a target. */
	private function shared_drops( string $target ): array {
		$out = array();
		foreach ( $GLOBALS['sgs_test_actions'] as $action ) {
			if ( 'sgs_motion_layer_dropped' === $action[0] && $target === $action[1][1] && 'shared-element' === ( $action[1][2]['id'] ?? '' ) ) {
				$out[] = $action[1][2]['layer'];
			}
		}
		return $out;
	}

	public function test_the_earlier_declared_part_keeps_the_hover_state_and_entrance_of_a_shared_element(): void {
		$out     = $this->render(
			array(
				'current' => array(
					'hover'    => array( 'state' => array( 'source' => 'self', 'values' => array( 'scale' => 1.05, 'duration' => 300 ) ) ),
					'entrance' => array( 'base' => array( 'trigger' => 'load', 'values' => array( 'from' => array( 'opacity' => 0 ) ) ) ),
				),
				'item'    => array(
					'hover'    => array( 'state' => array( 'source' => 'root', 'values' => array( 'translateY' => -2 ) ) ),
					'entrance' => array( 'base' => array( 'trigger' => 'scroll', 'values' => array( 'from' => array( 'translateY' => 12 ) ) ) ),
				),
			)
		);
		$current = $this->tag_with( $out, 'sgs-breadcrumbs__item sgs-breadcrumbs__item--current' );
		$this->assertStringContainsString( 'data-sgs-mh="root"', $current, 'item is declared first: its hover source wins' );
		$this->assertStringContainsString( 'data-sgs-me="scroll translate"', $current, 'item keeps the entrance: one trigger' );
		$this->assertStringContainsString( 'data-sgs-mc="translate"', $current, 'only the kept plan\'s channels' );
		$this->assertStringNotContainsString( 'load', $current );
		$this->assertStringNotContainsString( 'data-sgs-ml-written', $out, 'the temporary attribute is removed' );
		$this->assertSame( array( 'hover.state', 'entrance.base' ), $this->shared_drops( 'current' ) );
		$this->assertSame( array(), $this->shared_drops( 'item' ) );

		$css = implode( '', $GLOBALS['sgs_collected_css'] );
		$this->assertSame( 1, substr_count( $css, 'transition:' ), 'one transition list reaches the shared element: ' . $css );
		$this->assertStringNotContainsString( '--sgs-mh-to-s', $css, 'the dropped hover state writes nothing' );
		$this->assertStringNotContainsString( '--sgs-me-from-op', $css, 'the dropped entrance writes nothing' );

		$home = $this->tag_with( $out, 'sgs-breadcrumbs__item' );
		$this->assertStringContainsString( 'data-sgs-me="scroll translate"', $home, 'an element only item matches is unchanged' );
	}

	public function test_a_part_alone_on_its_element_keeps_its_hover_state(): void {
		$out = $this->render( array( 'current' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.05 ) ) ) ) ) );
		$this->assertStringContainsString( 'data-sgs-mc="scale"', $this->tag_with( $out, 'sgs-breadcrumbs__item sgs-breadcrumbs__item--current' ) );
		$this->assertSame( array(), $this->shared_drops( 'current' ), 'nothing shares the element, so nothing drops' );
	}

	public function test_a_layer_fx_token_joins_the_blocks_own_value_on_a_part_and_on_the_root(): void {
		$html = '<div class="wp-block-sgs-image-sequence" data-sgs-fx="image-sequence"><canvas class="seq" data-sgs-fx="image-sequence"></canvas></div>';
		$plan = array(
			'match'  => array( 'root' => false, 'classes' => array( 'seq' ), 'tag' => null, 'child' => false ),
			'attrs'  => array( 'data-sgs-fx' => 'scrub', 'data-sgs-mc' => 'translate' ),
			'layers' => array(),
		);
		$out  = Sgs_Motion_Markup::apply( $html, array( $plan ), array( 'data-sgs-fx' => 'scrub' ), '' );
		$this->assertStringContainsString( '<canvas data-sgs-mc="translate" data-sgs-fx="image-sequence scrub" class="seq">', $out );
		$this->assertStringContainsString( 'data-sgs-fx="image-sequence scrub" class="wp-block-sgs-image-sequence"', $out, 'the root join' );
		$this->assertStringNotContainsString( 'data-sgs-ml-written', $out );
	}

	public function test_the_tag_processor_stand_in_reads_attributes_outside_quoted_values_only(): void {
		$this->assertSame( array(), sgs_test_tag_processor_self_test() );
	}
}
