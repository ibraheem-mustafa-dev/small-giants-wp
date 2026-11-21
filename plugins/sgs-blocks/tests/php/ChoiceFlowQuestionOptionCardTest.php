<?php
/**
 * sgs/choice-flow-question: the option card's look at rest, on hover and when chosen (optionCard*).
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowQuestionOptionCardTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ChoiceFlowQuestionOptionCardTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const CARD = '.sgs-choice-flow-question .sgs-choice-flow-question__options .sgs-choice-flow-question__option-button';
	private const REST = self::CARD . ':not(.sgs-choice-flow-question__option-button--selected)';

	private function question( array $extra = array() ): array {
		return $this->render_block(
			'sgs/choice-flow-question',
			array_merge(
				array(
					'question' => 'Which box?',
					'options'  => array(
						array( 'label' => 'Single', 'value' => 'single' ),
						array( 'label' => 'Double', 'value' => 'double' ),
					),
				),
				$extra
			)
		);
	}

	public function test_rest_and_hover_paint_go_on_the_cards_that_are_not_chosen(): void {
		$out = $this->question(
			array(
				'optionCardColourBackground'      => '#fffdf8',
				'optionCardColourBackgroundHover' => '#f9cf6e',
				'optionCardColourBorder'          => '#e8e0d0',
				'optionCardColourBorderHover'     => '#1d3557',
			)
		);

		$this->assertMatchesRegularExpression( '/\.(sgs-cfq-[0-9a-f]{8})\.\1' . preg_quote( self::REST, '/' ) . '\{background-color:#fffdf8;border-color:#e8e0d0;\}/', $out['css'] );
		$this->assertStringContainsString( self::REST . ':hover', $out['css'] );
		$this->assertStringContainsString( 'background-color:#f9cf6e;border-color:#1d3557;', $out['css'] );
	}

	public function test_border_corners_and_padding_go_on_every_card(): void {
		$out = $this->question(
			array(
				'optionCardBorderWidth'  => array( 'top' => '1px', 'right' => '1px', 'bottom' => '1px', 'left' => '1px' ),
				'optionCardBorderStyle'  => 'solid',
				'optionCardBorderRadius' => array( 'topLeft' => '14px', 'topRight' => '14px', 'bottomRight' => '14px', 'bottomLeft' => '14px' ),
				'optionCardPadding'      => array(
					'desktop' => array( 'top' => '20px', 'right' => '22px', 'bottom' => '20px', 'left' => '22px' ),
					'mobile'  => array( 'top' => '12px', 'right' => '14px', 'bottom' => '12px', 'left' => '14px' ),
				),
			)
		);

		$this->assertMatchesRegularExpression( '/' . preg_quote( self::CARD, '/' ) . '\{border-style:solid;border-width:1px 1px 1px 1px;border-top-left-radius:14px;/', $out['css'] );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::CARD, '/' ) . '\{padding-top:20px;padding-right:22px;padding-bottom:20px;padding-left:22px;--sgs-cfq-card-pad-top:20px;--sgs-cfq-card-pad-right:22px;--sgs-cfq-card-pad-bottom:20px;--sgs-cfq-card-pad-left:22px;\}/', $out['css'] );
		$this->assertStringContainsString( 'padding-top:12px;padding-right:14px;padding-bottom:12px;padding-left:14px;--sgs-cfq-card-pad-top:12px;', $out['css'] );
	}

	public function test_shadows_at_rest_on_hover_and_when_chosen(): void {
		$out = $this->question(
			array(
				'optionCardShadow'                   => '0 2px 6px 0',
				'optionCardShadowColour'             => 'rgba(20,20,20,0.08)',
				'optionCardHoverShadow'              => '0 14px 32px 0',
				'optionCardHoverShadowColour'        => 'rgba(20,20,20,0.12)',
				'optionCardSelectedShadow'           => '0 0 0 3px',
				'optionCardSelectedShadowColour'     => '#1d3557',
				'optionCardSelectedBackgroundColour' => '#fdf3dc',
				'optionCardSelectedBorderColour'     => '#1d3557',
			)
		);

		$this->assertMatchesRegularExpression( '/' . preg_quote( self::REST, '/' ) . '\{box-shadow:0px 2px 6px 0px #14141414;--sgs-focus-under:0px 2px 6px 0px #14141414;/', $out['css'] );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::REST, '/' ) . ':hover\{box-shadow:0px 14px 32px 0px #1414141F;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::CARD, '/' ) . '\.sgs-choice-flow-question__option-button--selected\{background-color:#fdf3dc;background-image:none;border-color:#1d3557;box-shadow:0px 0px 0px 3px #1d3557;--sgs-focus-under:0px 0px 0px 3px #1d3557;/', $out['css'] );
		$this->assertStringContainsString( '--sgs-focus-under:', $out['css'] );
	}

	public function test_nothing_set_prints_no_card_rule(): void {
		$out = $this->question();

		$this->assertStringNotContainsString( '__option-button', $out['css'] );
	}
}
