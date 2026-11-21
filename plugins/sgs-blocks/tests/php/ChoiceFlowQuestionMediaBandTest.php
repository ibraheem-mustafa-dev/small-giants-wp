<?php
/**
 * sgs/choice-flow-question: the band behind an option's picture (optionMediaBackground).
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowQuestionMediaBandTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ChoiceFlowQuestionMediaBandTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function question( array $extra = array() ): array {
		return $this->render_block(
			'sgs/choice-flow-question',
			array_merge(
				array(
					'question' => 'Which frame?',
					'options'  => array( array( 'label' => 'Oak', 'value' => 'oak' ) ),
				),
				$extra
			)
		);
	}

	public function test_the_band_and_the_blank_band_take_the_colour(): void {
		$out = $this->question( array( 'optionMediaBackground' => '#f3efe6' ) );

		$this->assertMatchesRegularExpression( '/\.sgs-choice-flow-question__options \.sgs-choice-flow-question__option-media,[^{]*\.sgs-choice-flow-question__option-button:not\(:has\(\.sgs-choice-flow-question__option-media\)\)::before\{background-color:#f3efe6;background-image:none;\}/', $out['css'] );
	}

	public function test_nothing_set_prints_no_band_rule(): void {
		$out = $this->question();

		$this->assertStringNotContainsString( 'option-media', $out['css'] );
	}
}
