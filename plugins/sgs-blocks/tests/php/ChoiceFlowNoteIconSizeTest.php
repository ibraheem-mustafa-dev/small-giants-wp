<?php
/**
 * Sgs/choice-flow's help note icon disc size (stageNoteIconCircleSize, Spec 02 FR-2-34).
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowNoteIconSizeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Choice-flow help note icon disc size.
 */
final class ChoiceFlowNoteIconSizeTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * A size per device prints the disc's width and height per device.
	 */
	public function test_size_prints_per_device(): void {
		$css = $this->render_block(
			'sgs/choice-flow',
			array(
				'stageNoteIconCircleSize' => array(
					'desktop' => 48,
					'mobile'  => 40,
				),
			)
		)['css'];

		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-choice-flow \.sgs-choice-flow__summary-note-icon\{width:48px;height:48px;?\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{]*\.sgs-choice-flow__summary-note-icon\{width:40px;height:40px;?\}/', $css );
	}

	/**
	 * A length with its unit prints as written (the shape the shared length control stores).
	 */
	public function test_a_length_string_prints_with_its_unit(): void {
		$css = $this->render_block( 'sgs/choice-flow', array( 'stageNoteIconCircleSize' => array( 'desktop' => '2.5rem', 'mobile' => '40px' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/summary-note-icon\{width:2\.5rem;height:2\.5rem;?\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{]*summary-note-icon\{width:40px;height:40px;?\}/', $css );
	}

	/**
	 * Unset, or an unsafe value, prints nothing.
	 */
	public function test_unset_or_unsafe_prints_nothing(): void {
		$this->assertStringNotContainsString( 'summary-note-icon{', $this->render_block( 'sgs/choice-flow', array() )['css'] );
		$this->assertStringNotContainsString( 'summary-note-icon{', $this->render_block( 'sgs/choice-flow', array( 'stageNoteIconCircleSize' => array( 'desktop' => '40px;color:red' ) ) )['css'] );
	}
}
