<?php
/**
 * Grid-item defaults (Spec 32 FR-32-12) on sgs/container.
 *
 * Grid-item state rules must reach every grid cell, whatever block it is, at
 * both depths: directly under the container and under its
 * `.sgs-container__inner` band (which renders whenever the grid has a content
 * width). The border default resolves its colour through sgs_colour_value().
 *
 * Run with: vendor/bin/phpunit --filter ContainerGridItemTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerGridItemTest extends TestCase {

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

	public function test_hover_reaches_any_cell_under_the_band(): void {
		$out = $this->render_grid(
			array(
				'layout'                  => 'grid',
				'contentWidth'            => array( 'desktop' => 'normal' ),
				'gridItemBackgroundHover' => 'accent',
			)
		);

		$this->assertStringContainsString( '<div class="sgs-container__inner">', $out['html'] );
		$this->assertStringContainsString(
			'.' . $out['uid'] . ' > ' . self::INNER_CELL . ':hover{background-color:var(--wp--preset--color--accent',
			$out['css']
		);
		$this->assertStringContainsString(
			'.' . $out['uid'] . ' > ' . self::CELL . ':focus-within{background-color:var(--wp--preset--color--accent',
			$out['css']
		);
		$this->assertStringNotContainsString( '> .sgs-container:hover', $out['css'] );
	}

	public function test_text_gradient_and_border_ring_cover_both_depths(): void {
		$out = $this->render_grid(
			array(
				'layout'                     => 'grid',
				'gridItemTextColourGradient' => 'linear-gradient(90deg,#ff0000,#0000ff)',
				'gridItemBorderGradient'     => 'linear-gradient(90deg,#00ff00,#000000)',
				'gridItemBorder'             => '3px solid #ccc',
			)
		);

		foreach ( array( self::CELL, self::INNER_CELL ) as $cell ) {
			$sel = '.' . $out['uid'] . ' > ' . $cell;
			$this->assertStringContainsString( $sel . '{background-image:linear-gradient(90deg,#ff0000,#0000ff);-webkit-background-clip:text', $out['css'] );
			$this->assertStringContainsString( $sel . '::before{content:""', $out['css'] );
		}
	}

	public function test_border_default_resolves_a_palette_slug(): void {
		$out = $this->render_grid(
			array(
				'layout'         => 'grid',
				'gridItemBorder' => '2px dashed primary',
			)
		);

		$this->assertMatchesRegularExpression( '/--sgs-gi-border:2px dashed var\(--wp--preset--color--primary/', $out['css'] );
	}

	public function test_background_gradient_is_the_ground_value(): void {
		$out = $this->render_grid(
			array(
				'layout'                     => 'grid',
				'gridItemBackground'         => 'primary',
				'gridItemBackgroundGradient' => 'linear-gradient(90deg,#ffffff,#000000)',
			)
		);

		$this->assertStringContainsString( '--sgs-gi-bg:linear-gradient(90deg,#ffffff,#000000)', $out['css'] );
	}

	public function test_non_grid_layout_emits_no_cell_rules(): void {
		$out = $this->render_grid(
			array(
				'layout'                     => 'flex',
				'gap'                        => array( 'desktop' => '8px' ),
				'gridItemTextColourGradient' => 'linear-gradient(90deg,#ff0000,#0000ff)',
				'gridItemBackgroundHover'    => 'accent',
			)
		);

		$this->assertStringNotContainsString( ':not(.sgs-container__inner)', $out['css'] );
		$this->assertStringNotContainsString( '--sgs-gi-', $out['css'] );
	}
}
