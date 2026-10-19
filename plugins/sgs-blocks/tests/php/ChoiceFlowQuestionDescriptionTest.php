<?php
/**
 * Sgs/choice-flow-question gives each option's description line its own typography and colour (Spec 04 FR-4-2).
 *
 * The description prints inside the option's button. Its scoped rule uses the block's uid class plus the block class,
 * so it beats the showcase layout's 14px (`.sgs-choice-flow--layout-showcase .sgs-choice-flow-question__option-description`).
 * Nothing set keeps today's look: no rule is printed.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowQuestionDescriptionTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Option description styling.
 */
final class ChoiceFlowQuestionDescriptionTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Attributes for a question with one described option.
	 *
	 * @param array<string, mixed> $extra Further block attributes.
	 * @return array<string, mixed>
	 */
	private function attrs( array $extra = array() ): array {
		return array_merge(
			array(
				'question' => 'What can we help with?',
				'options'  => array(
					array(
						'label'       => 'Wholesale',
						'value'       => 'wholesale',
						'description' => 'Trade prices on pallets',
					),
				),
			),
			$extra
		);
	}

	/**
	 * The description prints inside the option button.
	 */
	public function test_description_renders_inside_the_option_button(): void {
		$out = $this->render_block( 'sgs/choice-flow-question', $this->attrs() );

		$this->assertMatchesRegularExpression(
			'#<button type="button" class="sgs-choice-flow-question__option-button".*?<span class="sgs-choice-flow-question__option-label">Wholesale</span><span class="sgs-choice-flow-question__option-description">Trade prices on pallets</span>.*?</button>#s',
			$out['html']
		);
	}

	/**
	 * No description, no span.
	 */
	public function test_no_description_prints_no_span(): void {
		$attrs                       = $this->attrs();
		$attrs['options'][0]['description'] = '';
		$out                         = $this->render_block( 'sgs/choice-flow-question', $attrs );

		$this->assertStringNotContainsString( 'sgs-choice-flow-question__option-description', $out['html'] );
	}

	/**
	 * The scoped rule holds the typography and the colour, under the uid class plus the block class.
	 */
	public function test_scoped_rule_holds_font_size_and_colour(): void {
		$out = $this->render_block(
			'sgs/choice-flow-question',
			$this->attrs(
				array(
					'optionDescriptionFontSize'   => array( 'desktop' => 15 ),
					'optionDescriptionLineHeight' => array( 'desktop' => 1.3 ),
					'optionDescriptionColour'     => '#667788',
				)
			)
		);

		$this->assertSame(
			1,
			preg_match( '/\.(sgs-cfq-[0-9a-f]{8})\.sgs-choice-flow-question \.sgs-choice-flow-question__option-description\{([^}]*)\}/', $out['css'], $m ),
			'no scoped description rule: ' . $out['css']
		);
		$this->assertStringContainsString( 'font-size:15px', $m[2] );
		$this->assertStringContainsString( 'line-height:1.3', $m[2] );
		$this->assertMatchesRegularExpression( '/\.' . $m[1] . '\.sgs-choice-flow-question \.sgs-choice-flow-question__option-description\{[^}]*color:#667788/', $out['css'] );
		$this->assertStringContainsString( 'class="sgs-choice-flow-question ' . $m[1] . '"', $out['html'], 'the rule\'s uid class is on the block root' );
	}

	/**
	 * Nothing set keeps today's look: no description rule at all.
	 */
	public function test_nothing_set_prints_no_rule(): void {
		$out = $this->render_block( 'sgs/choice-flow-question', $this->attrs() );

		$this->assertStringNotContainsString( 'option-description{', $out['css'] );
	}

	/**
	 * The rule is printed once per block even with several options.
	 */
	public function test_rule_prints_once(): void {
		$attrs                     = $this->attrs( array( 'optionDescriptionFontSize' => array( 'desktop' => 15 ) ) );
		$attrs['options'][]        = array(
			'label'       => 'Catering',
			'value'       => 'catering',
			'description' => 'Events and venues',
		);
		$out                       = $this->render_block( 'sgs/choice-flow-question', $attrs );

		$this->assertSame( 1, substr_count( $out['css'], 'option-description{' ) );
	}
}
