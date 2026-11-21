<?php
/**
 * sgs/choice-flow-question: the option badge's box (optionBadgeBorder, optionBadgeRadius, optionBadgePadding).
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowQuestionBadgeBoxTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ChoiceFlowQuestionBadgeBoxTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const BADGE = '.sgs-choice-flow-question .sgs-choice-flow-question__options .sgs-choice-flow-question__option-badge';

	private function question( array $extra = array() ): array {
		return $this->render_block(
			'sgs/choice-flow-question',
			array_merge(
				array(
					'question' => 'Which box?',
					'options'  => array( array( 'label' => 'Double', 'value' => 'double', 'badge' => 'Most popular' ) ),
				),
				$extra
			)
		);
	}

	public function test_border_radius_and_padding_print_on_the_badge(): void {
		$out = $this->question(
			array(
				'optionBadgeBorder'  => array( 'desktop' => array( 'width' => '1px', 'style' => 'solid', 'colour' => '#1d3557' ) ),
				'optionBadgeRadius'  => '999px',
				'optionBadgePadding' => array( 'desktop' => array( 'top' => '3px', 'right' => '10px', 'bottom' => '3px', 'left' => '10px' ) ),
			)
		);

		$this->assertMatchesRegularExpression( '/' . preg_quote( self::BADGE, '/' ) . '\{border-width:1px;border-style:solid;border-color:#1d3557;?\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::BADGE, '/' ) . '\{padding-top:3px;padding-right:10px;padding-bottom:3px;padding-left:10px;?\}/', $out['css'] );
		$this->assertStringContainsString( self::BADGE . '{border-radius:999px;}', $out['css'] );
	}

	public function test_a_junk_radius_prints_nothing(): void {
		$out = $this->question( array( 'optionBadgeRadius' => 'red;}body{x:y' ) );

		$this->assertStringNotContainsString( 'border-radius', $out['css'] );
	}

	public function test_nothing_set_prints_no_badge_box_rule(): void {
		$out = $this->question();

		$this->assertStringNotContainsString( 'option-badge', $out['css'] );
	}
}
