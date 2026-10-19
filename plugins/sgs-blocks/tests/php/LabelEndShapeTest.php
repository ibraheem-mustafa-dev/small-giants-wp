<?php
/**
 * Tests: sgs/label end shapes (Spec 02 FR-2-2).
 *
 * Renders the real src/blocks/label/render.php through the QA harness and
 * pins the helper output in includes/helpers-end-shape.php. The literals
 * marked "parity" are read back by tests/js/label-end-shape.test.js, which
 * holds src/utils/end-shape.js equal to them.
 *
 * Run: cd plugins/sgs-blocks; php vendor/phpunit/phpunit/phpunit --filter LabelEndShapeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-end-shape.php';

/**
 * Label end shapes: allowed list, edge paths, mask and ring declarations, render output.
 */
final class LabelEndShapeTest extends TestCase {

	use BlockHarnessRenderTrait;

	/** Parity: the allowed end shapes, in menu order. */
	private const ALLOWED = 'arrow,triangle,slant,curve,wave-smooth,zigzag';

	/** Parity: arrow edge path. */
	private const EDGE_ARROW = 'M0,0 L600,120 L1200,0';

	/** Parity: triangle edge path. */
	private const EDGE_TRIANGLE = 'M0,120 L600,0 L1200,120';

	/** Parity: slant edge path. */
	private const EDGE_SLANT = 'M0,120 L1200,0';

	/** Parity: curve edge path. */
	private const EDGE_CURVE = 'M0,120 Q600,0 1200,120';

	/** Parity: wave-smooth edge path. */
	private const EDGE_WAVE_SMOOTH = 'M0,60 Q300,120 600,60 Q900,0 1200,60';

	/** Parity: zigzag edge path. */
	private const EDGE_ZIGZAG = 'M0,60 L100,20 L200,60 L300,20 L400,60 L500,20 L600,60 L700,20 L800,60 L900,20 L1000,60 L1100,20 L1200,60';

	/** Parity: the right-arrow cut tile (depth 45) as it sits in the stylesheet. */
	private const CUT_ARROW_RIGHT_45 = "<svg xmlns='http://www.w3.org/2000/svg' width='45' height='100' viewBox='0 0 45 100' preserveAspectRatio='none'><path fill-rule='evenodd' transform='matrix(0 0.0833 -0.375 0 45 0)' d='M0,0H1200V120H0Z M0,0 L600,120 L1200,0 L1200,120 L0,120 Z'/></svg>";

	/** Parity: the right-arrow mask declarations (depth 45). */
	private const MASK_ARROW_RIGHT_45 = 'mask-image:linear-gradient(#000 0 0),url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'45\' height=\'100\' viewBox=\'0 0 45 100\' preserveAspectRatio=\'none\'%3E%3Cpath fill-rule=\'evenodd\' transform=\'matrix(0 0.0833 -0.375 0 45 0)\' d=\'M0,0H1200V120H0Z M0,0 L600,120 L1200,0 L1200,120 L0,120 Z\'/%3E%3C/svg%3E");mask-position:0 0,right center;mask-size:100% 100%,auto 100%;mask-repeat:no-repeat;mask-composite:subtract;';

	/** Parity: the right-arrow stroke tile (depth 45, 2px outline). */
	private const STROKE_ARROW_RIGHT_45 = "<svg xmlns='http://www.w3.org/2000/svg' width='45' height='100' viewBox='0 0 45 100' preserveAspectRatio='none'><path fill='none' stroke='#000' stroke-width='4' vector-effect='non-scaling-stroke' transform='matrix(0 0.0833 -0.375 0 45 0)' d='M0,0 L600,120 L1200,0'/></svg>";

	/** The draft's tag: right V notch, 2px dark outline, pink fill. */
	private function tag_attributes( array $overrides = array() ): array {
		return array_merge(
			array(
				'text'                    => 'baked with love',
				'endShapeRight'           => 'arrow',
				'endDepth'                => 45,
				'borderWidth'             => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
				'borderStyle'             => 'solid',
				'borderColour'            => '#3A2A22',
				'backgroundColour'        => '#EE8088',
			),
			$overrides
		);
	}

	public function test_allowed_shapes_are_the_menu_list(): void {
		$this->assertSame( self::ALLOWED, implode( ',', sgs_end_shape_allowed() ) );
	}

	public function test_edge_paths_drop_the_segments_on_the_tile_edge(): void {
		$this->assertSame( self::EDGE_ARROW, sgs_end_shape_edge_path( 'arrow' ) );
		$this->assertSame( self::EDGE_TRIANGLE, sgs_end_shape_edge_path( 'triangle' ) );
		$this->assertSame( self::EDGE_SLANT, sgs_end_shape_edge_path( 'slant' ) );
		$this->assertSame( self::EDGE_CURVE, sgs_end_shape_edge_path( 'curve' ) );
		$this->assertSame( self::EDGE_WAVE_SMOOTH, sgs_end_shape_edge_path( 'wave-smooth' ) );
		$this->assertSame( self::EDGE_ZIGZAG, sgs_end_shape_edge_path( 'zigzag' ) );
		$this->assertSame( '', sgs_end_shape_edge_path( 'cloud' ) );
	}

	public function test_cut_tile_for_the_right_arrow_matches_the_parity_literal(): void {
		$this->assertSame( self::CUT_ARROW_RIGHT_45, sgs_end_shape_cut_svg( 'arrow', 'right', 45.0 ) );
	}

	public function test_left_end_tile_mirrors_the_matrix(): void {
		$svg = sgs_end_shape_cut_svg( 'arrow', 'left', 45.0 );
		$this->assertStringContainsString( 'matrix(0 0.0833 0.375 0 0 0)', $svg );
	}

	public function test_mask_declarations_for_the_right_arrow_match_the_parity_literal(): void {
		$this->assertSame(
			self::MASK_ARROW_RIGHT_45,
			sgs_end_shape_mask_decls( array( 'right' => array( 'arrow', 45.0 ) ) )
		);
	}

	public function test_both_ends_add_a_second_layer_and_a_union(): void {
		$css = sgs_end_shape_mask_decls(
			array(
				'left'  => array( 'triangle', 30.0 ),
				'right' => array( 'arrow', 45.0 ),
			)
		);
		$this->assertStringContainsString( 'mask-position:0 0,right center,left center;', $css );
		$this->assertStringContainsString( 'mask-size:100% 100%,auto 100%,auto 100%;', $css );
		$this->assertStringContainsString( 'mask-composite:subtract,add;', $css );
	}

	public function test_no_shaped_end_gives_no_mask(): void {
		$this->assertSame( '', sgs_end_shape_mask_decls( array() ) );
		$this->assertSame( '', sgs_end_shape_mask_decls( array( 'left' => array( '', 45.0 ) ) ) );
	}

	public function test_ring_declarations_stroke_the_edge_and_keep_the_straight_sides(): void {
		$css = sgs_end_shape_ring_decls( array( 'right' => array( 'arrow', 45.0 ) ), '2px', 2.0 );
		$this->assertStringContainsString( 'padding:2px;', $css );
		$this->assertStringContainsString( 'mask-clip:border-box,content-box,border-box;', $css );
		$this->assertStringContainsString( 'mask-composite:add,exclude;', $css );
		$this->assertStringContainsString( $this->encoded( self::STROKE_ARROW_RIGHT_45 ), $css );
	}

	public function test_ring_without_a_pixel_width_draws_the_straight_sides_only(): void {
		$css = sgs_end_shape_ring_decls( array( 'right' => array( 'arrow', 45.0 ) ), '0.125rem', null );
		$this->assertStringNotContainsString( 'stroke-width', $css );
		$this->assertStringContainsString( 'mask-composite:exclude;', $css );
	}

	public function test_draft_tag_cuts_the_fill_and_outlines_the_cut(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes() );

		$this->assertStringContainsString( 'has-end-shape', $out['html'] );
		$this->assertStringContainsString(
			'<span class="sgs-label__edge" aria-hidden="true"><span class="sgs-label__edge-line"></span></span>',
			$out['html']
		);
		$this->assertStringNotContainsString( 'style="', $out['html'] );

		$this->assertStringContainsString( 'mask-composite:subtract', $out['css'] );
		$this->assertStringContainsString( 'matrix(0 0.0833 -0.375 0 45 0)', $out['css'] );
		$this->assertStringContainsString( "fill-rule='evenodd'", $out['css'] );
		$this->assertStringContainsString( "stroke-width='4'", $out['css'] );
		$this->assertStringContainsString( "vector-effect='non-scaling-stroke'", $out['css'] );
		$this->assertStringContainsString( 'M0,0 L600,120 L1200,0', $out['css'] );
		$this->assertStringContainsString( 'border-color:transparent', $out['css'] );
		$this->assertStringContainsString( '.sgs-label__edge-line', $out['css'] );
		$this->assertStringContainsString( 'background-color:#3A2A22', $out['css'] );
		$this->assertStringContainsString( 'background-color:#EE8088', $out['css'] );
	}

	public function test_edge_is_the_first_child_of_the_label(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes() );
		$this->assertMatchesRegularExpression( '/<span[^>]*wp-block-sgs-label[^>]*><span class="sgs-label__edge"/', $out['html'] );
		$this->assertStringContainsString( 'baked with love', $out['html'] );
	}

	public function test_both_ends_straight_is_an_ordinary_border(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'endShapeRight' => '', 'endShapeLeft' => '' ) ) );

		$this->assertStringNotContainsString( 'mask-image', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-label__edge', $out['html'] );
		$this->assertStringNotContainsString( 'has-end-shape', $out['html'] );
		$this->assertStringContainsString( 'border-width:2px', $out['css'] );
		$this->assertStringContainsString( 'border-color:#3A2A22', $out['css'] );
	}

	public function test_style_none_draws_no_outline(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderStyle' => 'none' ) ) );

		$this->assertStringNotContainsString( 'sgs-label__edge', $out['html'] );
		$this->assertStringContainsString( 'mask-composite:subtract', $out['css'] );
	}

	public function test_a_width_in_rem_draws_no_stroke(): void {
		$box = array(
			'top'    => '0.125rem',
			'right'  => '0.125rem',
			'bottom' => '0.125rem',
			'left'   => '0.125rem',
		);
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderWidth' => $box ) ) );

		$this->assertStringNotContainsString( 'stroke-width', $out['css'] );
		$this->assertStringContainsString( 'sgs-label__edge', $out['html'] );
	}

	public function test_a_shape_outside_the_list_is_straight(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'endShapeRight' => 'cloud' ) ) );

		$this->assertStringNotContainsString( 'has-end-shape', $out['html'] );
		$this->assertStringNotContainsString( 'mask-image', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-label__edge', $out['html'] );
	}

	public function test_depth_is_clamped_to_ten_through_one_hundred_fifty(): void {
		$deep = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'endDepth' => 900 ) ) );
		$this->assertStringContainsString( "width='150' height='100'", $deep['css'] );

		$shallow = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'endDepth' => 1 ) ) );
		$this->assertStringContainsString( "width='10' height='100'", $shallow['css'] );
	}

	public function test_a_text_gradient_with_a_shape_keeps_the_gradient_rule(): void {
		$out = $this->render_block(
			'sgs/label',
			$this->tag_attributes( array( 'textColourGradient' => 'linear-gradient(90deg,#ff0000,#0000ff)' ) )
		);

		$this->assertStringContainsString( 'background-clip:text', $out['css'] );
		$this->assertStringContainsString( 'linear-gradient(90deg,#ff0000,#0000ff)', $out['css'] );
		$this->assertStringContainsString( 'has-end-shape', $out['html'] );
		$this->assertStringNotContainsString( 'background:none', $out['css'] );
	}

	/**
	 * The stylesheet form of an SVG literal, as the helper encodes it for a url() value.
	 *
	 * @param string $svg Raw SVG.
	 * @return string Encoded form.
	 */
	private function encoded( string $svg ): string {
		return str_replace( array( '%', '<', '>', '#', '"' ), array( '%25', '%3C', '%3E', '%23', '%22' ), $svg );
	}
}
