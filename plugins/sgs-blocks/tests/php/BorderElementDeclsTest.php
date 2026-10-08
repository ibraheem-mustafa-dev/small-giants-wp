<?php
/**
 * Tests: sgs_border_element_decls() assembles one element's whole border.
 *
 * Width and style through sgs_border_box_decls(), flat colour as a declaration,
 * a gradient through the masked ring rule (taking the hover paint with it), a
 * hover-only gradient ring, the explicit `none` override, corner radius at three
 * tiers, and prefixed attribute names.
 *
 * The corner-radius cases call wp_style_engine_get_styles(), which several test
 * files stub differently, so they run in a plain child process
 * (run-border-element-radius.php) with a stub in WordPress's own return shape.
 *
 * Run with:
 *   vendor/bin/phpunit --filter BorderElementDeclsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * The shared border assembler.
 */
final class BorderElementDeclsTest extends TestCase {

	private const SEL = '.sgs-x-1';

	private const COLOUR = array(
		'base'           => 'borderColour',
		'hover'          => 'borderColourHover',
		'gradient'       => 'borderColourGradient',
		'hover_gradient' => 'borderColourHoverGradient',
	);

	/**
	 * Load the helper under test.
	 */
	protected function setUp(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-border-style.php';
	}

	/**
	 * Call the helper on the test selector with the standard colour map.
	 *
	 * @param array  $attrs   Block attributes.
	 * @param array  $options Helper options; the colour map is added.
	 * @param string $prefix  Attribute prefix.
	 * @return array The helper's result.
	 */
	private function decls( array $attrs, array $options = array(), string $prefix = '' ): array {
		return sgs_border_element_decls( $attrs, $prefix, self::SEL, $options + array( 'colour' => self::COLOUR ) );
	}

	/**
	 * No attributes prints nothing.
	 */
	public function test_no_attributes_prints_nothing(): void {
		$this->assertSame(
			array(
				'base'   => array(),
				'tablet' => array(),
				'mobile' => array(),
				'hover'  => array(),
				'rules'  => array(),
			),
			$this->decls( array() )
		);
	}

	/**
	 * Equal sides default solid and slug colour.
	 */
	public function test_equal_sides_default_solid_and_slug_colour(): void {
		$out = $this->decls(
			array(
				'borderWidth'  => array(
					'top'    => '2px',
					'right'  => '2px',
					'bottom' => '2px',
					'left'   => '2px',
				),
				'borderColour' => 'primary',
			)
		);
		$this->assertSame(
			array( 'border-style:solid', 'border-width:2px 2px 2px 2px', 'border-color:' . sgs_colour_value( 'primary' ) ),
			$out['base']
		);
		$this->assertSame( array(), $out['rules'] );
	}

	/**
	 * Unequal sides zero fill and raw colour.
	 */
	public function test_unequal_sides_zero_fill_and_raw_colour(): void {
		$out = $this->decls(
			array(
				'borderWidth'  => array(
					'top'  => '1px',
					'left' => '4px',
				),
				'borderStyle'  => 'dashed',
				'borderColour' => '#ff0000',
			)
		);
		$this->assertSame( array( 'border-style:dashed', 'border-width:1px 0 0 4px', 'border-color:#ff0000' ), $out['base'] );
	}

	/**
	 * Colour without width still prints colour.
	 */
	public function test_colour_without_width_still_prints_colour(): void {
		$out = $this->decls( array( 'borderColour' => 'primary' ) );
		$this->assertSame( array( 'border-color:' . sgs_colour_value( 'primary' ) ), $out['base'] );
	}

	/**
	 * Explicit none prints override and no colour or hover.
	 */
	public function test_explicit_none_prints_override_and_no_colour_or_hover(): void {
		$out = $this->decls(
			array(
				'borderWidth'       => array( 'top' => '2px' ),
				'borderStyle'       => 'none',
				'borderColour'      => 'primary',
				'borderColourHover' => 'secondary',
			)
		);
		$this->assertSame( array(), $out['base'] );
		$this->assertSame( array(), $out['hover'] );
		$this->assertSame( array( self::SEL . '{border-style:none;border-width:0;}' ), $out['rules'] );
	}

	/**
	 * An explicit none style always prints the override.
	 */
	public function test_none_override_always_prints(): void {
		$out = $this->decls( array( 'borderStyle' => 'none' ) );
		$this->assertSame( array( self::SEL . '{border-style:none;border-width:0;}' ), $out['rules'] );
	}

	/**
	 * Gradient paints through the ring with top width.
	 */
	public function test_gradient_paints_through_the_ring_with_top_width(): void {
		$grad = 'linear-gradient(90deg,#f00,#00f)';
		$out  = $this->decls(
			array(
				'borderWidth'          => array(
					'top'    => '3px',
					'right'  => '3px',
					'bottom' => '3px',
					'left'   => '3px',
				),
				'borderColour'         => 'primary',
				'borderColourGradient' => $grad,
			)
		);
		$this->assertNotContains( 'border-color:' . sgs_colour_value( 'primary' ), $out['base'] );
		$this->assertSame( array( sgs_border_gradient_css( self::SEL, $grad, null, '3px' ) ), $out['rules'] );
	}

	/**
	 * Gradient ring takes the flat hover paint.
	 */
	public function test_gradient_ring_takes_the_flat_hover_paint(): void {
		$grad = 'linear-gradient(90deg,#f00,#00f)';
		$out  = $this->decls(
			array(
				'borderColourGradient' => $grad,
				'borderColourHover'    => 'secondary',
			)
		);
		$this->assertSame( array(), $out['hover'] );
		$this->assertSame( array( sgs_border_gradient_css( self::SEL, $grad, sgs_colour_value( 'secondary' ), '1px' ) ), $out['rules'] );
	}

	/**
	 * Ring width option when top unset.
	 */
	public function test_ring_width_option_when_top_unset(): void {
		$grad = 'linear-gradient(90deg,#f00,#00f)';
		$out  = $this->decls(
			array(
				'borderWidth'          => array( 'bottom' => '5px' ),
				'borderColourGradient' => $grad,
			),
			array( 'ring_width' => '2px' )
		);
		$this->assertSame( array( sgs_border_gradient_css( self::SEL, $grad, null, '2px' ) ), $out['rules'] );
	}

	/**
	 * Flat hover is a hover declaration.
	 */
	public function test_flat_hover_is_a_hover_declaration(): void {
		$out = $this->decls(
			array(
				'borderColour'      => 'primary',
				'borderColourHover' => 'secondary',
			)
		);
		$this->assertSame( array( 'border-color:' . sgs_colour_value( 'secondary' ) ), $out['hover'] );
	}

	/**
	 * Hover gradient over flat resting gets a hover only ring.
	 */
	public function test_hover_gradient_over_flat_resting_gets_a_hover_only_ring(): void {
		$grad = 'linear-gradient(0deg,#0f0,#00f)';
		$out  = $this->decls(
			array(
				'borderColour'              => 'primary',
				'borderColourHoverGradient' => $grad,
			)
		);
		$this->assertSame( array(), $out['hover'] );
		$this->assertSame(
			array( sgs_hover_media_wrap( sgs_border_gradient_css( SGS_HOVER_NOT_TOUCH . ' ' . self::SEL . ':hover', $grad, null, '1px' ) ) ),
			$out['rules']
		);
	}

	/**
	 * Colour default only with a width.
	 */
	public function test_colour_default_only_with_a_width(): void {
		$options = array( 'colour_default' => 'currentColor' );
		$this->assertSame( array(), $this->decls( array(), $options )['base'] );
		$out = $this->decls( array( 'borderWidth' => array( 'top' => '1px' ) ), $options );
		$this->assertContains( 'border-color:currentColor', $out['base'] );
	}

	/**
	 * Corner radius, run in a child process (see run-border-element-radius.php):
	 * a uniform string, three tiers, the radius switch, and prefixed names.
	 */
	public function test_radius_cases_in_a_child_process(): void {
		$runner = __DIR__ . '/run-border-element-radius.php';
		$out    = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $runner ) . ' 2>&1' );
		$r      = json_decode( $out, true );
		$this->assertIsArray( $r, 'radius runner did not return JSON: ' . $out );

		$this->assertSame( array( 'border-radius:8px' ), $r['uniform']['base'] );

		$this->assertSame( array( 'border-top-left-radius:10px', 'border-bottom-right-radius:6px' ), $r['tiers']['base'] );
		$this->assertSame( array( 'border-top-right-radius:4px' ), $r['tiers']['tablet'] );
		$this->assertSame( array( 'border-top-left-radius:2px;border-bottom-left-radius:3px' ), $r['tiers']['mobile'] );

		$this->assertSame( array(), $r['off']['base'] );

		$this->assertSame( array( 'border-style:solid', 'border-width:1px 0 0 0', 'border-radius:6px' ), $r['named']['base'] );

		$this->assertSame(
			array( 'border-style:dotted', 'border-width:1px 0 0 0', 'border-color:#123456', 'border-radius:4px' ),
			$r['prefix']['base']
		);
	}
}
