<?php
/**
 * Sgs/choice-flow's bands and boxes (Spec 02 FR-2-34): the progress track's colour, the header and footer bands' fill,
 * rule and padding, the summary box's fill, border and padding and its dividers.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowBandsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Choice-flow bands and boxes.
 */
final class ChoiceFlowBandsTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const SET = array(
		'progressTrackColour'  => '#cccccc',
		'headerBandBackground' => '#f4efe6',
		'headerBandBorder'     => array(
			'desktop' => array(
				'width'  => '2px',
				'style'  => 'solid',
				'colour' => '#222222',
			),
			'mobile'  => array( 'width' => '1px' ),
		),
		'headerBandPadding'    => array( 'desktop' => array( 'top' => '20px', 'bottom' => '20px' ) ),
		'footerBandBackground' => 'primary',
		'footerBandBorder'     => array(
			'desktop' => array(
				'width' => '3px',
				'style' => 'dashed',
			),
		),
		'footerBandPadding'    => array( 'mobile' => array( 'left' => '8px' ) ),
		'summaryBackground'    => '#ffffff',
		'summaryBorder'        => array(
			'desktop' => array(
				'width'  => '1px',
				'style'  => 'solid',
				'colour' => '#999999',
			),
		),
		'summaryPadding'       => array( 'desktop' => array( 'top' => '24px' ) ),
		'summaryDividerColour' => '#ff0000',
	);

	/**
	 * Each part's rule sits under the scoped root with the values set.
	 */
	public function test_set_parts_print_their_rules(): void {
		$css  = $this->render_block( 'sgs/choice-flow', self::SET )['css'];
		$root = '\.sgs-choice-flow-[0-9a-f]{8}\.wp-block-sgs-choice-flow ';

		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__progress\{background-color:#cccccc;\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__chrome-header\{background-color:#f4efe6;background-image:none;\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__chrome-header\{[^}]*border-bottom-width:2px[^}]*\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__chrome-header\{[^}]*border-bottom-style:solid[^}]*\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{' . $root . '\.sgs-choice-flow__chrome-header\{border-bottom-width:1px;?\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__chrome-header\{[^}]*padding-top:20px[^}]*\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__footer\{background-color:var\(--wp--preset--color--primary[^}]*\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__footer\{[^}]*border-top-style:dashed[^}]*\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{' . $root . '\.sgs-choice-flow__footer\{padding-left:8px;?\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__summary-body\{[^}]*border-width:1px[^}]*\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__summary-body\{[^}]*padding-top:24px[^}]*\}/', $css );
		$this->assertMatchesRegularExpression( '/' . $root . '\.sgs-choice-flow__summary-lines,[^{]*\.sgs-choice-flow__summary-total\{border-color:#ff0000;\}/', $css );
	}

	/**
	 * Unset, none of the parts gains a rule.
	 */
	public function test_unset_prints_nothing(): void {
		$css = $this->render_block( 'sgs/choice-flow', array() )['css'];

		foreach ( array( '__progress{', '__chrome-header{', '__footer{', '__summary-body{', '__summary-lines,' ) as $part ) {
			$this->assertStringNotContainsString( 'wp-block-sgs-choice-flow .sgs-choice-flow' . $part, $css );
		}
	}
}
