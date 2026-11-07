<?php
/**
 * Tests: the site reveal default (Spec 38A §8.1; FR-38A-62, FR-38A-63).
 *
 * With `entrance.reveal` set, a block inside the main content that matches a rule and stores no entrance gets one
 * through the normal emitter; with it unset the output is the output a render with no default gives.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionRevealDefaultTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

require_once __DIR__ . '/MotionRendererTestTrait.php';

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionRevealDefaultTest extends TestCase {

	use MotionRendererTestTrait;

	private const EASING = 'cubic-bezier(0.16, 0.84, 0.32, 1)';

	private static function tokens(): array {
		return array(
			'distance'     => '40px',
			'duration'     => '800ms',
			'easing'       => self::EASING,
			'scale'        => 0.96,
			'start'        => 4,
			'staggerStep'  => 80,
			'staggerCap'   => 560,
			'staggerEvery' => 8,
			'reveal'       => array(
				'item'    => array( 'from' => array( 'opacity' => 0, 'translateY' => '40px', 'scale' => 0.96 ), 'duration' => 800, 'easing' => self::EASING ),
				'heading' => array( 'from' => array( 'opacity' => 0, 'translateY' => '22px', 'blur' => '6px' ), 'duration' => 850, 'easing' => self::EASING ),
			),
		);
	}

	private function use_tokens( ?array $tokens ): void {
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_test_filters']['sgs_motion_reveal_tokens'] = array();
		if ( null !== $tokens ) {
			add_filter( 'sgs_motion_reveal_tokens', static fn() => $tokens );
		}
		$GLOBALS['sgs_collected_css'] = array();
	}

	/** Start the main content: the first top-level block is the first section. */
	private function start_content(): void {
		$GLOBALS['sgs_test_in_loop'] = true;
		Sgs_Motion_Renderer::arm_first_section( '' );
	}

	private function section( int $count = 0 ): string {
		$out = sgs_test_render_motion_block( array( 'blockName' => 'sgs/hero', 'attrs' => array() ), self::CARD );
		return $out;
	}

	/**
	 * Render a container with $kids children (each an `sgs/hero`, or the given blocks) and return each child's markup.
	 *
	 * @return string[]
	 */
	private function container( array $attrs, array $kids, array $parent_extra = array() ): array {
		$parent_block = array(
			'blockName'   => 'sgs/container',
			'attrs'       => $attrs + $parent_extra + array( 'tagName' => 'div' ),
			'innerBlocks' => array_map( static fn( $k ) => array( 'blockName' => $k['blockName'] ), $kids ),
		);
		$renderer = '\SGS\Blocks\Motion\Sgs_Motion_Renderer';
		$parent_block = $renderer::open_frame( $parent_block, $parent_block, null );
		$parent_obj = (object) array( 'name' => 'sgs/container' );
		$out = array();
		foreach ( $kids as $kid ) {
			$out[] = sgs_test_render_motion_block( $kid, self::CARD, $parent_obj );
		}
		$renderer::close_frame( $renderer::render( '<div class="wp-block-sgs-container"></div>', $parent_block ), $parent_block );
		return $out;
	}

	private static function hero( array $attrs = array() ): array {
		return array( 'blockName' => 'sgs/hero', 'attrs' => $attrs );
	}

	private function delays(): array {
		preg_match_all( '/--sgs-me-delay:(\d+)ms/', $this->css(), $m );
		return array_map( 'intval', $m[1] );
	}

	private function after_first_section(): void {
		$this->start_content();
		$this->section();
		$GLOBALS['sgs_collected_css'] = array();
	}

	public function test_happy_grid_children_take_the_item_reveal_with_index_delays(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'grid' ), array( self::hero(), self::hero(), self::hero() ) );
		foreach ( $out as $html ) {
			$this->assertStringContainsString( 'data-sgs-me="scroll translate scale opacity"', $html );
		}
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-ty:40px', $css );
		$this->assertStringContainsString( '--sgs-me-from-s:0.96', $css );
		$this->assertStringContainsString( '--sgs-me-dur:800ms', $css );
		$this->assertStringContainsString( '--sgs-me-start:4', $css );
		$this->assertStringContainsString( self::EASING, $css );
		$this->assertSame( array( 80, 160 ), $this->delays(), 'index 0 has no delay; the others are index times step' );
	}

	public function test_edge_delay_is_capped_and_restarts_after_stagger_every(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'grid' ), array_fill( 0, 10, self::hero() ) );
		$this->assertSame( array( 80, 160, 240, 320, 400, 480, 560 ), $this->delays(), 'the cap holds at 560 and the rules are shared by position' );
		$scope = static fn( string $html ): string => preg_match( '/sgs-m-[0-9a-f]{10}/', $html, $m ) ? $m[0] : '';
		$this->assertSame( $scope( $out[0] ), $scope( $out[8] ), 'index 8 restarts at 0, like index 0' );
		$this->assertSame( $scope( $out[1] ), $scope( $out[9] ), 'index 9 restarts at 80, like index 1' );
		$this->assertNotSame( $scope( $out[0] ), $scope( $out[1] ) );
	}

	public function test_edge_wrapped_flex_counts_and_nowrap_or_stack_do_not(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'flex' ), array( self::hero(), self::hero() ) );
		$this->assertStringContainsString( 'data-sgs-me=', $out[1], 'flex defaults to wrap' );
		foreach ( array( array( 'layout' => 'flex', 'flexWrap' => 'nowrap' ), array( 'layout' => 'stack' ), array( 'layout' => 'flex', 'flexDirection' => 'column' ) ) as $attrs ) {
			$this->use_tokens( self::tokens() );
			$this->after_first_section();
			$out = $this->container( $attrs, array( self::hero(), self::hero() ) );
			$this->assertStringNotContainsString( 'data-sgs-me=', $out[1], wp_json_encode( $attrs ) );
		}
	}

	/** Render a grid whose first child is itself a grid of two cards, then a plain second child. */
	private function nested_grids( array $outer, array $inner ): array {
		$renderer = '\SGS\Blocks\Motion\Sgs_Motion_Renderer';
		$out      = array();
		$grid     = array( 'blockName' => 'sgs/container', 'attrs' => $outer + array( 'tagName' => 'div' ), 'innerBlocks' => array( array( 'blockName' => 'sgs/container' ), array( 'blockName' => 'sgs/hero' ) ) );
		$grid     = $renderer::open_frame( $grid, $grid, null );
		$obj      = (object) array( 'name' => 'sgs/container' );
		$card     = array( 'blockName' => 'sgs/container', 'attrs' => $inner + array( 'tagName' => 'div' ), 'innerBlocks' => array( array( 'blockName' => 'sgs/hero' ), array( 'blockName' => 'sgs/hero' ) ) );
		$card     = $renderer::open_frame( $card, $card, $obj );
		foreach ( array( 'a', 'b' ) as $unused ) {
			$out[] = sgs_test_render_motion_block( self::hero(), self::CARD, $obj );
		}
		$renderer::close_frame( $renderer::render( '<div class="wp-block-sgs-container"></div>', $card ), $card );
		$out[] = sgs_test_render_motion_block( self::hero(), self::CARD, $obj );
		$renderer::close_frame( $renderer::render( '<div class="wp-block-sgs-container"></div>', $grid ), $grid );
		return $out;
	}

	public function test_edge_a_grid_inside_a_claimed_grid_reveals_nothing(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->nested_grids( array( 'layout' => 'grid' ), array( 'layout' => 'grid' ) );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[0], 'a cards own grid stays still' );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[1] );
		$this->assertStringContainsString( 'data-sgs-me=', $out[2], 'the outer grids second child still reveals' );
	}

	public function test_edge_only_a_div_claims_its_children(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'grid', 'tagName' => 'section' ), array( self::hero(), self::hero() ) );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[1], 'a section grid is not a div' );
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'grid', 'tagName' => 'article' ), array( self::hero(), self::hero() ) );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[1] );
	}

	public function test_edge_one_child_is_not_a_group(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'grid' ), array( self::hero() ) );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[0] );
	}

	public function test_edge_a_blocks_own_entrance_wins_and_off_renders_none(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$own = self::load_fade( false, 'scroll' );
		$off = array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'off' => true ) ) ) );
		$out = $this->container( array( 'layout' => 'grid' ), array( self::hero( array( 'sgsMotion' => $own ) ), self::hero( array( 'sgsMotion' => $off ) ), self::hero() ) );
		$this->assertStringContainsString( 'data-sgs-me="scroll translate opacity"', $out[0] );
		$this->assertStringContainsString( '--sgs-me-from-ty:24px', $this->css(), 'its own values, not the default 40px' );
		$this->assertStringNotContainsString( '--sgs-me-from-ty:40px;--sgs-me-from-s', $out[0] );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[1], 'off turns the default off' );
		$this->assertStringContainsString( 'data-sgs-me="scroll translate scale opacity"', $out[2] );
		$this->assertSame( array( 160 ), $this->delays(), 'the third child keeps its own index (2 x 80)' );
	}

	public function test_edge_first_section_and_unarmed_content_take_nothing(): void {
		$this->use_tokens( self::tokens() );
		$this->start_content();
		$out = $this->container( array( 'layout' => 'grid' ), array( self::hero(), self::hero() ) );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[1], 'the first section keeps its entrances off the default' );
		$this->use_tokens( self::tokens() );
		$GLOBALS['sgs_test_in_loop'] = false;
		$out = $this->container( array( 'layout' => 'grid' ), array( self::hero(), self::hero() ) );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[1], 'outside the main content' );
	}

	public function test_edge_header_footer_and_drawer_take_nothing(): void {
		foreach ( array( array( 'tagName' => 'header' ), array( 'tagName' => 'footer' ), array( 'area' => 'footer' ) ) as $attrs ) {
			$this->use_tokens( self::tokens() );
			$this->after_first_section();
			$out = $this->container( array( 'layout' => 'grid' ) + $attrs, array( self::hero(), self::hero() ) );
			$this->assertStringNotContainsString( 'data-sgs-me=', $out[1], wp_json_encode( $attrs ) );
		}
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = sgs_test_render_motion_block( array( 'blockName' => 'sgs/nav-drawer', 'attrs' => array(), 'innerBlocks' => array() ), '<div class="wp-block-sgs-nav-drawer"></div>' );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out );
	}

	public function test_happy_h2_heading_and_the_text_after_it_take_the_heading_reveal(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$h = '<h2 class="sgs-heading">T</h2>';
		$kids = array(
			array( 'blockName' => 'sgs/heading', 'attrs' => array( 'level' => 'h2' ) ),
			array( 'blockName' => 'sgs/text', 'attrs' => array() ),
			array( 'blockName' => 'sgs/text', 'attrs' => array() ),
			array( 'blockName' => 'sgs/heading', 'attrs' => array( 'level' => 'h3' ) ),
			array( 'blockName' => 'sgs/text', 'attrs' => array() ),
		);
		$out = $this->container( array(), $kids );
		$this->assertStringContainsString( 'data-sgs-me="scroll translate opacity filter"', $out[0] );
		$this->assertStringContainsString( 'data-sgs-me=', $out[1], 'the text right after the h2' );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[2], 'only the one right after' );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[3], 'an h3 is not the rule' );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[4], 'text after an h3' );
		$this->assertStringContainsString( '--sgs-me-from-blur:6px', $this->css() );
		$this->assertStringContainsString( '--sgs-me-dur:850ms', $this->css() );
	}

	public function test_edge_a_container_that_applies_its_entrance_to_children_leaves_them_alone(): void {
		$this->use_tokens( self::tokens() );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'grid', 'sgsMotion' => array( 'v' => 1, 'stagger' => array( 'apply' => true ) ) ), array( self::hero(), self::hero() ) );
		$this->assertStringNotContainsString( 'data-sgs-me=', $out[1] );
	}

	public function test_edge_unset_reveal_gives_the_output_of_a_site_with_no_default(): void {
		$this->use_tokens( null );
		$this->after_first_section();
		$plain = $this->container( array( 'layout' => 'grid' ), array( self::hero(), self::hero(), self::hero() ) );
		$plain_css = $this->css();
		$this->use_tokens( array( 'duration' => '800ms', 'start' => 4, 'staggerStep' => 80 ) );
		$this->after_first_section();
		$tokens_only = $this->container( array( 'layout' => 'grid' ), array( self::hero(), self::hero(), self::hero() ) );
		$this->assertSame( $plain, $tokens_only, 'entrance tokens without reveal rules change nothing' );
		$this->assertSame( $plain_css, $this->css() );
		$this->assertStringNotContainsString( 'data-sgs-me', implode( '', $plain ) );
		$this->assertSame( '', $plain_css );
	}

	public function test_fail_an_invalid_rule_value_is_dropped_not_emitted(): void {
		$tokens = self::tokens();
		$tokens['reveal']['item']['from'] = array( 'opacity' => 9, 'bogus' => 1 );
		$this->use_tokens( $tokens );
		$this->after_first_section();
		$out = $this->container( array( 'layout' => 'grid' ), array( self::hero(), self::hero() ) );
		$this->assertStringNotContainsString( 'bogus', $this->css() . implode( '', $out ) );
	}
}
