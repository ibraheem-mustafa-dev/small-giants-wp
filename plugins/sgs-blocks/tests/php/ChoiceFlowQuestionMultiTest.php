<?php
/**
 * Sgs/choice-flow-question takes more than one answer when `answersMax` is above 1 (Spec 43 FR-43-27).
 *
 * A plain multi-answer question carries its limits on the wrapper, marks its options as checkboxes and prints a
 * polite live region for the refusal message. A default question, a priced add-on step and a product-option step
 * print none of it.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowQuestionMultiTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/choice-flow-showcase.php';

/**
 * Multi-answer question markup.
 */
final class ChoiceFlowQuestionMultiTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Attributes for a four-option question.
	 *
	 * @param array<string, mixed> $extra Further block attributes.
	 * @return array<string, mixed>
	 */
	private function attrs( array $extra = array() ): array {
		$options = array();
		foreach ( array( 'Chocolate chip', 'Biscoff', 'Oreo', 'Plain' ) as $label ) {
			$options[] = array(
				'label' => $label,
				'value' => strtolower( str_replace( ' ', '-', $label ) ),
			);
		}
		return array_merge(
			array(
				'question' => 'Pick your flavours',
				'options'  => $options,
			),
			$extra
		);
	}

	/**
	 * A 1-to-3 plain question prints its limits, checkbox options and the live region.
	 */
	public function test_multi_question_prints_limits_checkboxes_and_live_region(): void {
		$html = $this->render_block( 'sgs/choice-flow-question', $this->attrs( array( 'answersMin' => 1, 'answersMax' => 3 ) ) )['html'];

		$this->assertStringContainsString( 'data-answers-min="1"', $html );
		$this->assertStringContainsString( 'data-answers-max="3"', $html );
		$this->assertSame( 4, substr_count( $html, 'role="checkbox" aria-checked="false"' ) );
		$this->assertMatchesRegularExpression( '#<p class="sgs-choice-flow-question__limit-message" role="status" aria-live="polite" data-message="You can pick up to 3 answers\.[^"]*"></p>#', $html );
	}

	/**
	 * The least never exceeds the most, and the most is capped at 12.
	 */
	public function test_limits_are_clamped(): void {
		$this->assertSame( array( 'min' => 3, 'max' => 3 ), sgs_choice_flow_question_answer_limits( array( 'answersMin' => 9, 'answersMax' => 3 ) ) );
		$this->assertSame( array( 'min' => 1, 'max' => 12 ), sgs_choice_flow_question_answer_limits( array( 'answersMin' => 0, 'answersMax' => 99 ) ) );
	}

	/**
	 * Negative control: a default question is unchanged.
	 */
	public function test_default_question_prints_nothing_new(): void {
		$html = $this->render_block( 'sgs/choice-flow-question', $this->attrs() )['html'];

		$this->assertStringNotContainsString( 'data-answers-', $html );
		$this->assertStringNotContainsString( 'role="checkbox"', $html );
		$this->assertStringNotContainsString( 'limit-message', $html );
	}

	/**
	 * Negative control: a priced add-on step takes one answer whatever the stored count says.
	 */
	public function test_priced_question_stays_single_answer(): void {
		$html = $this->render_block( 'sgs/choice-flow-question', $this->attrs( array( 'answersMax' => 3, 'priceGroup' => 'frames' ) ) )['html'];

		$this->assertStringNotContainsString( 'data-answers-', $html );
		$this->assertStringNotContainsString( 'role="checkbox"', $html );
		$this->assertSame( array( 'min' => 1, 'max' => 1 ), sgs_choice_flow_question_answer_limits( array( 'answersMax' => 3, 'productAttribute' => 'pa_size' ) ) );
	}
}
