<?php
/**
 * Tests: the former `var()` holdouts print one custom property per set side or corner (CR6, P2-b).
 *
 * A custom property holding a whole four-value shorthand squares every unset side or corner to 0, so a client
 * who sets one corner at a narrower width wipes the others. The helpers print one property per set side or
 * corner; the container's grid-item defaults and the multi-button's child radius go through them.
 *
 * Run with:
 *   vendor/bin/phpunit --filter VarHoldoutPropertiesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-box.php';

final class VarHoldoutPropertiesTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_side_properties_print_only_set_sides(): void {
		$this->assertSame(
			array( '--x-pad-top:10px', '--x-pad-left:4px' ),
			sgs_box_object_property_list(
				array(
					'top'  => '10px',
					'left' => '4px',
				),
				'--x-pad-'
			)
		);
		$this->assertSame( array(), sgs_box_object_property_list( array(), '--x-pad-' ) );
		$this->assertSame( array(), sgs_box_object_property_list( '', '--x-pad-' ) );
	}

	public function test_corner_properties_print_only_set_corners_and_keep_an_explicit_zero(): void {
		$this->assertSame(
			array( '--x-radius-top-left:20px', '--x-radius-bottom-right:0px' ),
			sgs_corner_object_property_list(
				array(
					'topLeft'     => '20px',
					'bottomRight' => '0',
				),
				'--x-radius-'
			)
		);
		$this->assertSame( array(), sgs_corner_object_property_list( null, '--x-radius-' ) );
	}

	public function test_unsafe_values_are_rejected(): void {
		$this->assertSame( array(), sgs_corner_object_property_list( array( 'topLeft' => '1px;}body{x:y' ), '--x-radius-' ) );
		$this->assertSame( array(), sgs_box_object_property_list( array( 'top' => 'url(x)' ), '--x-pad-' ) );
	}

	public function test_grid_item_padding_and_radius_print_per_side_and_corner_per_tier(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'layout'               => 'grid',
				'gridItemPadding'      => array(
					'desktop' => array(
						'top'    => '10px',
						'right'  => '12px',
						'bottom' => '14px',
						'left'   => '16px',
					),
					'tablet'  => array( 'top' => '30px' ),
				),
				'gridItemBorderRadius' => array(
					'desktop' => array(
						'topLeft'     => '6px',
						'topRight'    => '6px',
						'bottomRight' => '6px',
						'bottomLeft'  => '6px',
					),
					'mobile'  => array( 'bottomRight' => '4px' ),
				),
			)
		);
		$css = $out['css'];

		$this->assertStringContainsString( '--sgs-gi-padding-top:10px', $css );
		$this->assertStringContainsString( '--sgs-gi-padding-left:16px', $css );
		$this->assertStringContainsString( '--sgs-gi-padding-top:30px', $css );
		$this->assertStringContainsString( '--sgs-gi-radius-top-left:6px', $css );
		$this->assertStringContainsString( '--sgs-gi-radius-bottom-right:4px', $css );
		// Negative controls: no whole-shorthand property, and a tier prints no side or corner it does not set.
		$this->assertDoesNotMatchRegularExpression( '/--sgs-gi-padding:/', $css );
		$this->assertDoesNotMatchRegularExpression( '/--sgs-gi-radius:/', $css );
		$this->assertSame( 1, substr_count( $css, '--sgs-gi-padding-top:30px' ) );
		$this->assertSame( 2, substr_count( $css, '--sgs-gi-padding-top:' ) );
		$this->assertSame( 2, substr_count( $css, '--sgs-gi-radius-bottom-right:' ) );
	}

	public function test_grid_item_bare_numbers_print_with_px_and_a_flat_corner_box_is_the_desktop_tier(): void {
		$out = $this->render_block(
			'sgs/container',
			array(
				'layout'               => 'grid',
				'gridItemPadding'      => array( 'desktop' => array( 'top' => '24' ) ),
				'gridItemBorderRadius' => array( 'topLeft' => '5' ),
			)
		);
		$css = $out['css'];

		$this->assertStringContainsString( '--sgs-gi-padding-top:24px', $css );
		$this->assertStringContainsString( '--sgs-gi-radius-top-left:5px', $css );
		$this->assertDoesNotMatchRegularExpression( '/--sgs-gi-padding-top:24;/', $css );
	}

	public function test_multi_button_radius_prints_the_corners_each_tier_sets(): void {
		$out = $this->render_block(
			'sgs/multi-button',
			array(
				'childBtnBorderRadius' => array(
					'desktop' => array(
						'topLeft'     => '6px',
						'topRight'    => '6px',
						'bottomRight' => '6px',
						'bottomLeft'  => '6px',
					),
					'tablet'  => array( 'topLeft' => '20px' ),
					'mobile'  => array( 'bottomRight' => '4px' ),
				),
			)
		);
		$css = $out['css'];

		$this->assertStringContainsString( '--sgs-mb-btn-radius-top-left:6px', $css );
		$this->assertStringContainsString( '--sgs-mb-btn-radius-top-left:20px', $css );
		$this->assertStringContainsString( '--sgs-mb-btn-radius-bottom-right:4px', $css );
		$this->assertStringNotContainsString( '--sgs-mb-btn-radius-default', $css );
		$this->assertSame( 2, substr_count( $css, '--sgs-mb-btn-radius-top-left:' ) );
		$this->assertSame( 2, substr_count( $css, '--sgs-mb-btn-radius-bottom-right:' ) );
	}

	public function test_nav_submenu_radius_prints_the_set_corners_and_reads_each_with_the_token_fallback(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/render-helpers.php';
		// The typography hover rule is defined by the block's own render.php; this test reads only the radius.
		if ( ! function_exists( 'sgs_nav_shared_typography_hover_rule' ) ) {
			function sgs_nav_shared_typography_hover_rule(): string {
				return '';
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/nav-menu-submenu-link-css.php';
		require_once dirname( __DIR__, 2 ) . '/includes/nav-menu-submenu-css.php';
		$css = sgs_nav_shared_submenu_css(
			array(
				'submenuBorderRadius' => array(
					'topLeft'     => '12px',
					'bottomRight' => '0',
				),
			),
			'.uid',
			'none',
			'',
			'',
			array(),
			array(),
			array(),
			'sgs-nav-bar-menu'
		);

		$this->assertStringContainsString( '--sgs-nm-submenu-radius-top-left:12px', $css );
		$this->assertStringContainsString( '--sgs-nm-submenu-radius-bottom-right:0px', $css );
		$this->assertStringNotContainsString( '--sgs-nm-submenu-radius-top-right:', $css );
		$this->assertStringContainsString( 'border-top-right-radius:var(--sgs-nm-submenu-radius-top-right, var(--wp--custom--border-radius--medium, 8px))', $css );
		$this->assertDoesNotMatchRegularExpression( '/--sgs-nm-submenu-radius[:)]/', $css );
	}
}
