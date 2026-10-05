<?php
/**
 * Grid-item shadow lift on sgs/container (Spec 32 FR-32-12, colour-emission
 * "Shadows — automatic"): a grid-item shadow lifts on hover by default, at both
 * cell depths, through sgs_shadow_hover_rules(); the block's
 * `shadowLiftOnHover` switch turns it off.
 *
 * Run with: vendor/bin/phpunit --filter ContainerGridItemShadowLiftTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerGridItemShadowLiftTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const CELL       = ':where(:not(.sgs-container__inner):not([aria-hidden="true"]):not(.sgs-container__lottie-bg):not(style):not(script))';
	private const INNER_CELL = ':where(.sgs-container__inner) > :where(:not([aria-hidden="true"]):not(.sgs-container__lottie-bg):not(style):not(script))';

	/**
	 * @param array<string, mixed> $attrs Container attributes.
	 * @return array{html: string, css: string, uid: string}
	 */
	private function render_grid( array $attrs ): array {
		$out = $this->render_block( 'sgs/container', $attrs );
		$this->assertSame( 1, preg_match( '/sgs-container-[0-9a-f]{8}/', $out['html'], $m ), 'no scope class' );
		$out['uid'] = $m[0];
		return $out;
	}

	public function test_grid_item_shadow_lifts_on_hover_at_both_cell_depths(): void {
		$attrs = array(
			'layout'         => 'grid',
			'contentWidth'   => array( 'desktop' => 'normal' ),
			'gridItemShadow' => '0 4px 8px 0',
		);
		$lifted = sgs_shadow_hover_value( $attrs['gridItemShadow'], '' );
		$this->assertNotSame( '', $lifted, 'the layered shape has a lifted value' );

		$out = $this->render_grid( $attrs );
		foreach ( array( self::CELL, self::INNER_CELL ) as $cell ) {
			$this->assertStringContainsString( '.' . $out['uid'] . ' > ' . $cell . ':hover{box-shadow:' . $lifted, $out['css'] );
			$this->assertStringContainsString( '.' . $out['uid'] . ' > ' . $cell . ':focus-visible{box-shadow:' . $lifted, $out['css'] );
		}
	}

	public function test_lift_switch_off_draws_no_hover_shadow(): void {
		$out = $this->render_grid(
			array(
				'layout'            => 'grid',
				'gridItemShadow'    => '0 4px 8px 0',
				'shadowLiftOnHover' => false,
			)
		);
		$this->assertStringNotContainsString( ':hover{box-shadow:', $out['css'] );
	}
}
