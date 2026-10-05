<?php
/**
 * Sgs/choice-flow paints its Back button's border on the front end: the
 * border panel's width, style, radius, colour and hover colour all reach the
 * `.sgs-choice-flow__nav-back` rules through sgs_button_element_style_css().
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowBackBorderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Choice-flow Back-button border.
 */
final class ChoiceFlowBackBorderTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const BORDER = array(
		'backColourBorder'      => 'primary',
		'backColourBorderHover' => '#ff0000',
		'backBorderWidth'       => array(
			'top'    => '2px',
			'right'  => '2px',
			'bottom' => '2px',
			'left'   => '2px',
		),
		'backBorderStyle'       => 'dashed',
		'backBorderRadius'      => array( 'topLeft' => '4px' ),
	);

	/**
	 * The Back button's base rule carries the panel's colour, style, width and radius.
	 */
	public function test_back_button_base_rule_paints_the_border(): void {
		$out = $this->render_block( 'sgs/choice-flow', self::BORDER );

		$this->assertStringContainsString( 'sgs-choice-flow__nav-back', $out['html'], 'no Back button in the markup' );
		$this->assertSame( 1, preg_match( '/\.sgs-choice-flow__nav-back\{([^}]*)\}/', $out['css'], $m ), 'no Back button base rule' );
		$this->assertStringContainsString( 'border-color:var(--wp--preset--color--primary', $m[1] );
		$this->assertStringContainsString( 'border-style:dashed', $m[1] );
		$this->assertStringContainsString( 'border-width:2px 2px 2px 2px', $m[1] );
		$this->assertStringContainsString( 'border-radius:4px 0 0 0', $m[1] );
	}

	/**
	 * The hover colour paints on :hover and :focus-visible.
	 */
	public function test_back_button_hover_colour(): void {
		$out = $this->render_block( 'sgs/choice-flow', self::BORDER );

		$this->assertMatchesRegularExpression( '/\.sgs-choice-flow__nav-back:hover\{border-color:#ff0000;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-choice-flow__nav-back:focus-visible\{border-color:#ff0000;\}/', $out['css'] );
	}

	/**
	 * Negative control: with no border set, no Back-button border declaration is emitted.
	 */
	public function test_no_border_set_emits_no_back_border(): void {
		$out = $this->render_block( 'sgs/choice-flow', array() );

		$this->assertDoesNotMatchRegularExpression( '/\.sgs-choice-flow__nav-back(:hover|:focus-visible)?\{[^}]*border-/', $out['css'] );
	}
}
