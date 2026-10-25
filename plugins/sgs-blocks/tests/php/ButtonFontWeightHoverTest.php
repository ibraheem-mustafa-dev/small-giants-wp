<?php
/**
 * sgs/button hover weight: `fontWeightHover` prints on :hover (and on focus, behind the shared touch guard) and
 * nothing prints when it is unset.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonFontWeightHoverTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ButtonFontWeightHoverTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_the_hover_weight_prints_behind_the_touch_guard_and_on_focus(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'           => 'Get a quote',
				'fontWeight'      => '600',
				'fontWeightHover' => '700',
			)
		);
		$css = $out['css'];

		$this->assertStringContainsString( 'Get a quote', $out['html'], 'positive control: the block rendered' );
		$this->assertMatchesRegularExpression( '/\{[^}]*font-weight:600;[^}]*\}/', $css, 'the resting weight' );
		$this->assertMatchesRegularExpression( '/@media \(hover: hover\)[^{]*\{[^{]*\.sgs-button:hover[^{]*\{[^}]*font-weight:700/', $css, 'hover weight sits behind the touch guard' );
		$this->assertMatchesRegularExpression( '/\.sgs-button:focus-visible[^{]*\{[^}]*font-weight:700/', $css, 'focus carries it the way the other hover looks do' );
	}

	public function test_a_hostile_weight_cannot_break_out_of_the_declaration(): void {
		$css = $this->render_block(
			'sgs/button',
			array(
				'label'           => 'Go',
				'fontWeightHover' => '700;} body{display:none',
			)
		)['css'];

		$this->assertStringNotContainsString( 'display:none', $css );
		$this->assertStringNotContainsString( 'body{', $css );
	}

	public function test_unset_prints_no_hover_weight(): void {
		$css = $this->render_block(
			'sgs/button',
			array(
				'label'      => 'Go',
				'fontWeight' => '600',
			)
		)['css'];

		$this->assertStringContainsString( 'font-weight:600', $css, 'positive control' );
		$this->assertDoesNotMatchRegularExpression( '/:hover[^{]*\{[^}]*font-weight/', $css );
	}
}
