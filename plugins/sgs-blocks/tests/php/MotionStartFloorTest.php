<?php
/**
 * Tests: above the fold, no load or scroll entrance starts fully invisible (Spec 38A §9, FR-38A-18).
 *
 * A block in one of the first two top-level sections (`Sgs_Motion_Fold`) has its hidden start values raised: opacity 0
 * to 0.01, a full clip to 99, a scale of 0 to 0.01. Every other start value, every entrance further down and an entrance
 * with `allowLcpFade` keep the stored values, and no card is exempt or scoped apart for holding the priority image.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionStartFloorTest
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
final class MotionStartFloorTest extends TestCase {

	use MotionRendererTestTrait;

	private static function entrance( array $from, string $trigger = 'load', bool $allow = false ): array {
		$values = array( 'from' => $from, 'duration' => 600 );
		if ( $allow ) {
			$values['allowLcpFade'] = true;
		}
		return array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => $trigger, 'values' => $values ) ) ) ),
		);
	}

	private function arm(): void {
		$GLOBALS['sgs_test_in_loop'] = true;
		Sgs_Motion_Renderer::arm_first_section( '<!-- wp:sgs/section /-->' );
	}

	/** Render this many plain top-level sections (no entrance) so the next block is the section after them. */
	private function sections_before( int $count ): void {
		$this->arm();
		for ( $i = 0; $i < $count; $i++ ) {
			$this->render( array( 'v' => 1, 'elements' => array( 'media' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.1 ) ) ) ) ) ) );
		}
		$GLOBALS['sgs_collected_css'] = array();
	}

	public function test_happy_loop_of_three_cards_in_section_one_shares_one_scope_and_starts_at_one_percent(): void {
		$this->arm();
		$section = array( 'blockName' => 'sgs/hero', 'attrs' => array() );
		Sgs_Motion_Renderer::open_frame( $section, $section, null );
		$parent   = (object) array( 'name' => 'sgs/hero' );
		$plain    = '<div class="wp-block-sgs-hero"><p>Card</p></div>';
		$priority = '<div class="wp-block-sgs-hero"><img src="a.jpg" alt="" fetchpriority="high"></div>';
		$motion   = self::entrance( array( 'opacity' => 0, 'translateY' => 24 ) );
		$scopes   = array();
		foreach ( array( $plain, $priority, $plain ) as $html ) {
			$block    = array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => $motion ) );
			$scopes[] = $this->scope( sgs_test_render_motion_block( $block, $html, $parent ) );
		}
		Sgs_Motion_Renderer::close_frame( '', $section );
		$this->assertCount( 1, array_unique( $scopes ), 'the priority card has no scope of its own' );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:0.01;', $css );
		$this->assertStringNotContainsString( '--sgs-me-from-op:0;', $css );
		$this->assertStringNotContainsString( '--sgs-me-from-op:1;', $css );
		$this->assertStringContainsString( '--sgs-me-from-ty:24px;', $css, 'movement is unchanged' );
	}

	public function test_edge_section_one_scroll_fade_starts_at_one_percent(): void {
		$this->arm();
		$this->render( self::entrance( array( 'opacity' => 0 ), 'scroll' ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0.01;', $this->css() );
	}

	public function test_edge_section_two_is_clamped(): void {
		$this->sections_before( 1 );
		$this->render( self::entrance( array( 'opacity' => 0 ) ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0.01;', $this->css() );
	}

	public function test_edge_section_three_starts_at_zero(): void {
		$this->sections_before( 2 );
		$this->render( self::entrance( array( 'opacity' => 0 ) ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	public function test_edge_section_three_priority_image_card_starts_at_zero_like_the_rest(): void {
		$this->sections_before( 2 );
		$html = '<div class="wp-block-sgs-hero"><img src="a.jpg" alt="" fetchpriority="high"></div>';
		$this->render( self::entrance( array( 'opacity' => 0 ) ), $html );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	public function test_edge_section_one_clip_reveal_starts_at_99(): void {
		$this->arm();
		$this->render( self::entrance( array( 'clip' => 100 ) ) );
		$this->assertStringContainsString( '--sgs-me-from-clip:99%;', $this->css() );
	}

	public function test_edge_section_one_scale_from_zero_starts_at_a_tiny_scale(): void {
		$this->arm();
		$this->render( self::entrance( array( 'opacity' => 0, 'scale' => 0 ) ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-s:0.01;', $css );
		$this->assertStringContainsString( '--sgs-me-from-op:0.01;', $css );
	}

	public function test_edge_other_start_values_are_unchanged(): void {
		$this->arm();
		$this->render( self::entrance( array( 'opacity' => 0.4, 'scale' => 0.9, 'clip' => 40 ) ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:0.4;', $css );
		$this->assertStringContainsString( '--sgs-me-from-s:0.9;', $css );
		$this->assertStringContainsString( '--sgs-me-from-clip:40%;', $css );
	}

	public function test_edge_keyframe_frame_zero_is_clamped_whatever_its_list_position(): void {
		$this->arm();
		$out = $this->render( array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => 'load', 'values' => array( 'keyframes' => array(
				array( 'offset' => 100, 'opacity' => 1, 'translateY' => 0 ),
				array( 'offset' => 0, 'opacity' => 0, 'translateY' => 40 ),
			) ) ) ) ) ),
		) );
		$this->assertStringContainsString( '--sgs-me-from-op:0.01;', $this->css() );
		$this->assertMatchesRegularExpression( '/data-sgs-me-keyframes="[^"]*0\.01/', $out );
	}

	public function test_negative_control_allow_lcp_fade_keeps_zero(): void {
		$this->arm();
		$this->render( self::entrance( array( 'opacity' => 0, 'clip' => 100 ), 'load', true ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $css );
		$this->assertStringContainsString( '--sgs-me-from-clip:100%;', $css );
	}

	/** Stand in for the post in the loop and its stored `_sgs_fold_sections` meta (null: none stored). */
	private function post_with_stored_sections( ?int $stored ): void {
		$GLOBALS['sgs_test_fold_meta'] = $stored;
		if ( ! function_exists( 'get_the_ID' ) ) {
			function get_the_ID() {
				return 77;
			}
		}
		if ( ! function_exists( 'get_post_meta' ) ) {
			function get_post_meta( $post_id, $key, $single = false ) {
				return 77 === $post_id && '_sgs_fold_sections' === $key && null !== $GLOBALS['sgs_test_fold_meta'] ? $GLOBALS['sgs_test_fold_meta'] : '';
			}
		}
	}

	public function test_happy_a_stored_count_of_three_marks_section_three_above_the_fold(): void {
		$this->post_with_stored_sections( 3 );
		$this->sections_before( 2 );
		$this->render( self::entrance( array( 'opacity' => 0 ) ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0.01;', $this->css() );
	}

	public function test_edge_with_a_stored_count_of_three_section_four_starts_at_zero(): void {
		$this->post_with_stored_sections( 3 );
		$this->sections_before( 3 );
		$this->render( self::entrance( array( 'opacity' => 0 ) ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	public function test_edge_with_no_stored_count_section_three_is_not_above_the_fold(): void {
		$this->post_with_stored_sections( null );
		$this->sections_before( 2 );
		$this->render( self::entrance( array( 'opacity' => 0 ) ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}

	/** A block template whose main content is a lone `main` wrapper of three sections, a header part before it and a footer part after. */
	private function template_tree( bool $with_post_content = false ): void {
		$section = array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array() );
		$main    = array( 'blockName' => 'sgs/container', 'attrs' => array( 'tagName' => 'main' ), 'innerBlocks' => array( $section, $section, $section ) );
		$part    = array( 'blockName' => 'core/template-part', 'attrs' => array(), 'innerBlocks' => array() );
		if ( ! function_exists( 'parse_blocks' ) ) {
			function parse_blocks( $content ) {
				return $GLOBALS['sgs_test_top_blocks'] ?? array();
			}
		}
		$GLOBALS['sgs_test_top_blocks']          = array( $part, $main, $part );
		$GLOBALS['_wp_current_template_content'] = $with_post_content ? '<!-- wp:post-content /-->' : '<!-- wp:sgs/container {"tagName":"main"} -->';
		$GLOBALS['sgs_test_in_loop']             = false;
	}

	/** @var string|null The start opacity the header printed in `render_template_children()`. */
	private $header_op = null;

	/** Render the template's blocks in order and return the start opacity each of the main's three children printed. */
	private function render_template_children(): array {
		// The theme renders the header itself (`render_active`): a parentless top-level block, with an entrance of its own.
		$header = array( 'blockName' => 'sgs/site-header', 'attrs' => array( 'sgsMotion' => self::entrance( array( 'opacity' => 0 ) ) ) );
		$GLOBALS['sgs_collected_css'] = array();
		sgs_test_render_motion_block( $header, '<div class="wp-block-sgs-site-header"><p>Nav</p></div>' );
		$this->header_op = preg_match( '/--sgs-me-from-op:([0-9.]+);/', $this->css(), $m ) ? $m[1] : null;
		$main = array( 'blockName' => 'sgs/container', 'attrs' => array( 'tagName' => 'main' ) );
		Sgs_Motion_Renderer::open_frame( $main, $main, null );
		$parent = (object) array( 'name' => 'sgs/container' );
		$out    = array();
		for ( $i = 0; $i < 3; $i++ ) {
			$GLOBALS['sgs_collected_css'] = array();
			$block = array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => self::entrance( array( 'opacity' => 0 ) ) ) );
			sgs_test_render_motion_block( $block, '<div class="wp-block-sgs-hero"><p>Card</p></div>', $parent );
			$out[] = preg_match( '/--sgs-me-from-op:([0-9.]+);/', $this->css(), $m ) ? $m[1] : null;
		}
		Sgs_Motion_Renderer::close_frame( '', $main );
		return $out;
	}

	public function test_happy_a_template_rendered_page_with_empty_post_content_takes_its_sections_from_the_template(): void {
		$this->template_tree();
		Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' );
		$this->assertSame( array( '0.01', '0.01', '0' ), $this->render_template_children(), 'the first two sections of the template main are above the fold, the third is not, with the header rendered first' );
		$this->assertSame( '0', $this->header_op, 'the header the theme renders is not a content section' );
	}

	public function test_edge_a_template_with_a_post_content_block_is_left_to_the_content_filter(): void {
		$this->template_tree( true );
		Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' );
		$this->assertSame( array( '0', '0', '0' ), $this->render_template_children(), 'the post content arms it, not the template' );
	}

	public function test_edge_the_template_arms_once_and_returns_the_template_path_unchanged(): void {
		$this->template_tree();
		$this->assertSame( '/theme/index.php', Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' ) );
		$GLOBALS['sgs_test_top_blocks'] = array();
		Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' );
		$this->assertSame( array( '0.01', '0.01', '0' ), $this->render_template_children(), 'a second call does not re-arm' );
	}

	/**
	 * The real shop shape: header part, then a lone `main` whose second child holds a product collection > product
	 * template > product cards. WooCommerce's product template fires `render_block` for a synthetic `core/null` block
	 * once per product, with no `render_block_data` before it, so each product pops a frame that was never its own.
	 */
	public function test_happy_the_cards_of_a_product_collection_in_section_two_start_at_one_percent_whatever_the_template_pops(): void {
		$section = array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array() );
		$main    = array( 'blockName' => 'sgs/container', 'attrs' => array( 'tagName' => 'main' ), 'innerBlocks' => array( $section, $section ) );
		$part    = array( 'blockName' => 'core/template-part', 'attrs' => array(), 'innerBlocks' => array() );
		$GLOBALS['sgs_test_top_blocks']          = array( $part, $main, $part );
		$GLOBALS['_wp_current_template_content'] = '<!-- wp:sgs/container {"tagName":"main"} -->';
		$GLOBALS['sgs_test_in_loop']             = false;
		Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' );

		$open = static function ( string $name, ?object $parent, array $attrs = array() ): array {
			$block = array( 'blockName' => $name, 'attrs' => $attrs );
			Sgs_Motion_Renderer::open_frame( $block, $block, $parent );
			return $block;
		};
		$obj  = static fn ( string $name ): object => (object) array( 'name' => $name );
		$wrap = $open( 'sgs/container', null, array( 'tagName' => 'main' ) );
		$one  = $open( 'sgs/container', $obj( 'sgs/container' ) );
		Sgs_Motion_Renderer::close_frame( '', $one );
		$two        = $open( 'sgs/container', $obj( 'sgs/container' ) );
		$collection = $open( 'woocommerce/product-collection', $obj( 'sgs/container' ) );
		$template   = $open( 'woocommerce/product-template', $obj( 'woocommerce/product-collection' ) );
		$starts     = array();
		for ( $i = 0; $i < 6; $i++ ) {
			$GLOBALS['sgs_collected_css'] = array();
			$card = array( 'blockName' => 'sgs/hero', 'attrs' => array( 'sgsMotion' => self::entrance( array( 'opacity' => 0 ) ) ) );
			$out  = sgs_test_render_motion_block( $card, '<div class="wp-block-sgs-hero"><p>Card</p></div>', $obj( 'woocommerce/product-template' ) );
			$starts[] = preg_match( '/--sgs-me-from-op:([0-9.]+);/', $this->css(), $m ) ? $m[1] : null;
			// WooCommerce's stray close for the product it just rendered.
			Sgs_Motion_Renderer::close_frame( '', array( 'blockName' => 'core/null', 'attrs' => array() ) );
		}
		Sgs_Motion_Renderer::close_frame( '', $template );
		Sgs_Motion_Renderer::close_frame( '', $collection );
		Sgs_Motion_Renderer::close_frame( '', $two );
		Sgs_Motion_Renderer::close_frame( '', $wrap );
		$this->assertSame( array_fill( 0, 6, '0.01' ), $starts, 'every card of the section-two grid is above the fold' );
	}

	/** Arm from a template of three plain top-level sections between two template parts. */
	private function three_section_template(): void {
		$part = array( 'blockName' => 'core/template-part', 'attrs' => array(), 'innerBlocks' => array() );
		$one  = array( 'blockName' => 'sgs/container', 'attrs' => array( 'className' => 'one' ), 'innerBlocks' => array() );
		$two  = array( 'blockName' => 'sgs/container', 'attrs' => array( 'className' => 'two' ), 'innerBlocks' => array() );
		$tre  = array( 'blockName' => 'sgs/container', 'attrs' => array( 'className' => 'three' ), 'innerBlocks' => array() );
		$GLOBALS['sgs_test_top_blocks']          = array( $part, $one, $two, $tre, $part );
		$GLOBALS['_wp_current_template_content'] = '<!-- wp:sgs/container /-->';
		$GLOBALS['sgs_test_in_loop']             = false;
		Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' );
	}

	/** Render the three sections the way a `render_block_data` filter leaves them (extra attributes added) and return each start opacity. */
	private function render_three_sections( array $extra ): array {
		$out = array();
		foreach ( array( 'one', 'two', 'three' ) as $class ) {
			$GLOBALS['sgs_collected_css'] = array();
			$block = array( 'blockName' => 'sgs/container', 'attrs' => array( 'className' => $class, 'sgsMotion' => self::entrance( array( 'opacity' => 0 ) ) ) + $extra );
			sgs_test_render_motion_block( $block, '<div class="wp-block-sgs-container"><p>x</p></div>' );
			$out[] = preg_match( '/--sgs-me-from-op:([0-9.]+);/', $this->css(), $m ) ? $m[1] : null;
		}
		return $out;
	}

	public function test_happy_a_render_time_filter_that_adds_an_attribute_leaves_section_two_above_the_fold(): void {
		$this->three_section_template();
		// The tree carries sgsMotion too, as the stored template does.
		$motion = self::entrance( array( 'opacity' => 0 ) );
		foreach ( array( 1, 2, 3 ) as $i ) {
			$GLOBALS['sgs_test_top_blocks'][ $i ]['attrs']['sgsMotion'] = $motion;
		}
		Sgs_Motion_Renderer::reset();
		Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' );
		$this->assertSame( array( '0.01', '0.01', '0' ), $this->render_three_sections( array( 'dataFilterAdded' => 'yes' ) ), 'an attribute a filter adds at render time does not unmatch the section' );
	}

	public function test_edge_when_a_filter_changes_the_className_the_only_candidate_of_that_name_still_matches_by_order(): void {
		$this->three_section_template();
		$motion = self::entrance( array( 'opacity' => 0 ) );
		$part   = array( 'blockName' => 'core/template-part', 'attrs' => array(), 'innerBlocks' => array() );
		$only   = array( 'blockName' => 'sgs/hero', 'attrs' => array( 'className' => 'hero-a', 'sgsMotion' => $motion ), 'innerBlocks' => array() );
		$GLOBALS['sgs_test_top_blocks'] = array( $part, $only, $part );
		Sgs_Motion_Renderer::reset();
		Sgs_Motion_Renderer::arm_from_template( '/theme/index.php' );
		$block = array( 'blockName' => 'sgs/hero', 'attrs' => array( 'className' => 'hero-a hero-b', 'sgsMotion' => $motion ) );
		sgs_test_render_motion_block( $block, '<div class="wp-block-sgs-hero"><p>x</p></div>' );
		$this->assertStringContainsString( '--sgs-me-from-op:0.01;', $this->css(), 'the one remaining candidate of that block name takes the block' );
	}

	public function test_edge_a_leaked_frame_is_popped_when_its_parent_closes_and_a_stray_close_pops_nothing(): void {
		$this->arm();
		$a = array( 'blockName' => 'sgs/container', 'attrs' => array( 'className' => 'a' ) );
		$b = array( 'blockName' => 'sgs/hero', 'attrs' => array( 'className' => 'b' ) );
		Sgs_Motion_Renderer::open_frame( $a, $a, null );
		Sgs_Motion_Renderer::open_frame( $b, $b, (object) array( 'name' => 'sgs/container' ) );
		$this->assertTrue( Sgs_Motion_Renderer::in_above_fold() );
		// A block that never reaches render_block leaves its frame open; the stray core/null close pops nothing.
		Sgs_Motion_Renderer::close_frame( '', array( 'blockName' => 'core/null', 'attrs' => array() ) );
		$this->assertTrue( Sgs_Motion_Renderer::in_above_fold(), 'a stray core/null close pops nothing' );
		Sgs_Motion_Renderer::close_frame( '', $a );
		$this->assertFalse( Sgs_Motion_Renderer::in_above_fold(), 'closing the parent also drops the leaked child frame above it' );
	}

	public function test_fail_a_post_with_no_parseable_blocks_marks_nothing_above_the_fold(): void {
		$GLOBALS['sgs_test_top_blocks'] = array();
		$GLOBALS['sgs_test_in_loop']    = true;
		Sgs_Motion_Renderer::arm_first_section( 'Plain words, no block markup.' );
		foreach ( array( 'sgs/site-footer', 'sgs/nav-drawer', 'sgs/mega-panel' ) as $name ) {
			$GLOBALS['sgs_collected_css'] = array();
			$block = array( 'blockName' => $name, 'attrs' => array( 'sgsMotion' => self::entrance( array( 'opacity' => 0 ) ) ) );
			sgs_test_render_motion_block( $block, '<div class="wp-block-sgs-hero"><p>x</p></div>' );
			$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css(), $name . ' is not above the fold on a page with no blocks' );
		}
	}

	public function test_fail_an_unarmed_page_is_never_above_the_fold(): void {
		$this->render( self::entrance( array( 'opacity' => 0 ) ) );
		$this->assertStringContainsString( '--sgs-me-from-op:0;', $this->css() );
	}
}
