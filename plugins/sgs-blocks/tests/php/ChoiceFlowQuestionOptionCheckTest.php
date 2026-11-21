<?php
/**
 * sgs/choice-flow-question: the chosen option's tick (optionCheckShow and optionCheck*), off by default.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowQuestionOptionCheckTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ChoiceFlowQuestionOptionCheckTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function question( array $extra = array() ): array {
		return $this->render_block(
			'sgs/choice-flow-question',
			array_merge(
				array(
					'question' => 'Which box?',
					'options'  => array(
						array( 'label' => 'Single', 'value' => 'single' ),
						array( 'label' => 'Double', 'value' => 'double', 'badge' => 'Most popular' ),
					),
				),
				$extra
			)
		);
	}

	public function test_switched_on_every_card_prints_the_tick_first(): void {
		$out = $this->question( array( 'optionCheckShow' => true ) );

		$this->assertSame( 2, substr_count( $out['html'], '<span class="sgs-choice-flow-question__option-check" aria-hidden="true"></span>' ) );
		$this->assertMatchesRegularExpression( '/data-value="double"[^>]*><span class="sgs-choice-flow-question__option-check" aria-hidden="true"><\/span><span class="sgs-choice-flow-question__option-badge">/', $out['html'] );
	}

	public function test_tick_colours_size_and_inset_print_on_the_tick(): void {
		$out = $this->question(
			array(
				'optionCheckShow'             => true,
				'optionCheckColour'           => '#ffffff',
				'optionCheckBackgroundColour' => '#a8404f',
				'optionCheckSize'             => '24px',
				'optionCheckInset'            => '10px',
			)
		);

		$this->assertStringContainsString( '.sgs-choice-flow-question__options .sgs-choice-flow-question__option-check{color:#ffffff;background-color:#a8404f;--sgs-cfq-check-size:24px;top:10px;inset-inline-end:10px;}', $out['css'] );
	}

	public function test_off_prints_no_tick_and_no_rule_even_with_its_colours_set(): void {
		$out = $this->question( array( 'optionCheckColour' => '#ffffff', 'optionCheckSize' => '24px' ) );

		$this->assertStringNotContainsString( 'option-check', $out['html'] );
		$this->assertStringNotContainsString( 'option-check', $out['css'] );
	}
}
