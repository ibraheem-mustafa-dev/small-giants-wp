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
 * Label end shapes: allowed list, cut tiles, mask and layer declarations, render output.
 */
final class LabelEndShapeTest extends TestCase {

	use BlockHarnessRenderTrait;

	/** Parity: the allowed end shapes, in menu order. */
	private const ALLOWED = 'arrow,triangle,slant,curve,wave-smooth,zigzag';

	/** Parity: the right-arrow cut tile (depth 45) as it sits in the stylesheet. */
	private const CUT_ARROW_RIGHT_45 = "<svg xmlns='http://www.w3.org/2000/svg' width='45' height='100' viewBox='0 0 45 100' preserveAspectRatio='none'><path fill-rule='evenodd' transform='matrix(0 0.0833 -0.375 0 45 0)' d='M0,0H1200V120H0Z M0,0 L600,120 L1200,0 L1200,120 L0,120 Z'/></svg>";

	/** Parity: the right-arrow mask declarations (depth 45). */
	private const MASK_ARROW_RIGHT_45 = 'mask-image:linear-gradient(#000 0 0),url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'45\' height=\'100\' viewBox=\'0 0 45 100\' preserveAspectRatio=\'none\'%3E%3Cpath fill-rule=\'evenodd\' transform=\'matrix(0 0.0833 -0.375 0 45 0)\' d=\'M0,0H1200V120H0Z M0,0 L600,120 L1200,0 L1200,120 L0,120 Z\'/%3E%3C/svg%3E");mask-position:0 0,right center;mask-size:100% 100%,auto 100%;mask-repeat:no-repeat;mask-composite:subtract;';

	/** Parity: the shaped layer for the draft tag: the 2px solid #3A2A22 border, the right side's paint-free strip and the right-arrow cut (depth 45). */
	private const LAYER_ARROW_RIGHT_DRAFT = 'content:"";position:absolute;inset:calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px);border-style:solid;border-width:2px 2px 2px 2px;border-color:#3A2A22;border-right:1px solid transparent;background-clip:padding-box;z-index:-2;box-sizing:border-box;pointer-events:none;border-radius:inherit;mask-image:linear-gradient(#000 0 0),url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'45\' height=\'100\' viewBox=\'0 0 45 100\' preserveAspectRatio=\'none\'%3E%3Cpath fill-rule=\'evenodd\' transform=\'matrix(0 0.0833 -0.375 0 45 0)\' d=\'M0,0H1200V120H0Z M0,0 L600,120 L1200,0 L1200,120 L0,120 Z\'/%3E%3C/svg%3E");mask-position:0 0,right center;mask-size:100% 100%,auto 100%;mask-repeat:no-repeat;mask-composite:subtract;';

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

	public function test_layer_declarations_for_the_draft_tag_match_the_parity_literal(): void {
		$this->assertSame(
			self::LAYER_ARROW_RIGHT_DRAFT,
			sgs_end_shape_layer_decls(
				array( 'right' => array( 'arrow', 45.0 ) ),
				array( 'border-style:solid', 'border-width:2px 2px 2px 2px' ),
				'background-color:#3A2A22'
			)
		);
	}

	public function test_border_box_declarations_inset_per_side_and_map_the_paint(): void {
		$right = array( 'right' => array( 'arrow', 45.0 ) );
		$this->assertSame(
			'inset:calc(-1 * 2px) 0 0 calc(-1 * 4px);border-style:solid;border-width:2px 0 0 4px;border-image:linear-gradient(90deg,#f00,#00f) 1;border-image-width:1 0 1 1;border-right:1px solid transparent;background-clip:padding-box;',
			sgs_end_shape_border_box_decls( $right, array( 'border-style:solid', 'border-width:2px 0 0 4px' ), 'background-image:linear-gradient(90deg,#f00,#00f)' )
		);
		$this->assertSame(
			'inset:calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px);border-style:dashed;border-width:2px 2px 2px 2px;border-right:1px solid transparent;background-clip:padding-box;',
			sgs_end_shape_border_box_decls( $right, array( 'border-style:dashed', 'border-width:2px 2px 2px 2px' ), '' )
		);
		$this->assertSame( 'inset:0;border-right:1px solid transparent;background-clip:padding-box;', sgs_end_shape_border_box_decls( $right, array(), 'background-color:#3A2A22' ) );
		$this->assertSame( 'inset:0;', sgs_end_shape_border_box_decls( array(), array(), 'background-color:#3A2A22' ) );
	}

	public function test_both_ends_leave_a_paint_free_strip_on_each_shaped_side(): void {
		$css = sgs_end_shape_border_box_decls(
			array(
				'left'  => array( 'triangle', 30.0 ),
				'right' => array( 'arrow', 45.0 ),
			),
			array( 'border-style:solid', 'border-width:2px 2px 2px 2px' ),
			'background-image:linear-gradient(90deg,#f00,#00f)'
		);
		$this->assertStringContainsString( 'border-image-width:1 0 1 0;border-right:1px solid transparent;border-left:1px solid transparent;background-clip:padding-box;', $css );
	}

	public function test_draft_tag_paints_fill_and_border_on_the_cut_layer(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes() );

		$this->assertStringContainsString( 'has-end-shape', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-label__edge', $out['html'] );
		$this->assertStringNotContainsString( 'style="', $out['html'] );

		$this->assertStringContainsString( '::after{' . self::LAYER_ARROW_RIGHT_DRAFT . '}', $out['css'] );
		$this->assertMatchesRegularExpression( '/::after\{[^}]*border-width:2px 2px 2px 2px;border-color:#3A2A22;[^}]*mask-composite:subtract;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/::after\{[^}]*background-color:#EE8088;\}/', $out['css'] );
		// The root keeps its border widths for layout and paints none of it.
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-label\{[^}]*border-width:2px 2px 2px 2px;border-color:transparent;\}/', $out['css'] );
		$this->assertStringNotContainsString( '#3A2A22', preg_replace( '/::after\{[^}]*\}/', '', $out['css'] ) );
		$this->assertStringNotContainsString( 'stroke', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-label__edge', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/padding(?:-(?:top|right|bottom|left|inline|block)[a-z-]*)?:/', $out['css'] );
	}

	public function test_per_side_widths_inset_each_side_of_the_layer(): void {
		$box = array(
			'top'  => '2px',
			'left' => '4px',
		);
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderWidth' => $box ) ) );

		$this->assertStringContainsString( '::after{content:"";position:absolute;inset:calc(-1 * 2px) 0 0 calc(-1 * 4px);border-style:solid;border-width:2px 0 0 4px;border-color:#3A2A22;', $out['css'] );
	}

	public function test_a_tablet_width_moves_the_layer_with_the_root(): void {
		$tiers = array(
			'desktop' => array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' ),
			'tablet'  => array( 'top' => '3px', 'right' => '3px', 'bottom' => '3px', 'left' => '3px' ),
		);
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderWidth' => $tiers ) ) );

		$this->assertMatchesRegularExpression( '/@media\(max-width:1023px\)\{[^{]*::after\{inset:calc\(-1 \* 3px\) calc\(-1 \* 3px\) calc\(-1 \* 3px\) calc\(-1 \* 3px\);border-style:solid;border-width:3px 3px 3px 3px;border-right:1px solid transparent;background-clip:padding-box;\}\}/', $out['css'] );
	}

	public function test_a_gradient_border_with_a_shape_is_a_border_image_on_the_layer(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderColourGradient' => 'linear-gradient(90deg,#ff0000,#0000ff)' ) ) );

		$this->assertMatchesRegularExpression( '/::after\{[^}]*border-image:linear-gradient\(90deg,#ff0000,#0000ff\) 1;[^}]*mask-composite:subtract;\}/', $out['css'] );
		$this->assertStringNotContainsString( 'mask-composite:exclude', $out['css'] );
	}

	public function test_a_dashed_border_stays_dashed_on_the_layer(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderStyle' => 'dashed' ) ) );

		$this->assertMatchesRegularExpression( '/::after\{[^}]*border-style:dashed;border-width:2px 2px 2px 2px;border-color:#3A2A22;/', $out['css'] );
	}

	public function test_a_shaped_label_with_no_fill_hugs_its_text(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'backgroundColour' => '' ) ) );
		$this->assertStringContainsString( 'display:inline-block', $out['css'] );
		$this->assertStringNotContainsString( 'display:block', $out['css'] );
	}

	public function test_both_ends_straight_is_an_ordinary_border(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'endShapeRight' => '', 'endShapeLeft' => '' ) ) );

		$this->assertStringNotContainsString( 'mask-image', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-label__edge', $out['html'] );
		$this->assertStringNotContainsString( 'has-end-shape', $out['html'] );
		$this->assertStringNotContainsString( 'inset:calc', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-label\{border-style:solid;border-width:2px 2px 2px 2px;border-color:#3A2A22;\}/', $out['css'] );
	}

	public function test_style_none_draws_no_border_on_the_layer(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderStyle' => 'none' ) ) );

		$this->assertMatchesRegularExpression( '/::after\{content:"";position:absolute;inset:0;border-right:1px solid transparent;background-clip:padding-box;z-index:-2;[^}]*mask-composite:subtract;\}/', $out['css'] );
		$this->assertStringNotContainsString( '#3A2A22', $out['css'] );
	}

	public function test_a_width_in_rem_insets_by_the_same_length(): void {
		$box = array(
			'top'    => '0.125rem',
			'right'  => '0.125rem',
			'bottom' => '0.125rem',
			'left'   => '0.125rem',
		);
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'borderWidth' => $box ) ) );

		$this->assertStringContainsString( 'inset:calc(-1 * 0.125rem) calc(-1 * 0.125rem) calc(-1 * 0.125rem) calc(-1 * 0.125rem);border-style:solid;border-width:0.125rem 0.125rem 0.125rem 0.125rem;border-color:#3A2A22;', $out['css'] );
	}

	public function test_a_shape_outside_the_list_is_straight(): void {
		$out = $this->render_block( 'sgs/label', $this->tag_attributes( array( 'endShapeRight' => 'cloud' ) ) );

		$this->assertStringNotContainsString( 'has-end-shape', $out['html'] );
		$this->assertStringNotContainsString( 'mask-image', $out['css'] );
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
}
