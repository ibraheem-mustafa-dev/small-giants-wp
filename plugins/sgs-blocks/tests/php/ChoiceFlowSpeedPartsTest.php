<?php
/**
 * The choice-flow's built-in animations read the motion panel's duration (Spec 43 FR-43-24a): the progress fill, the
 * summary photo and the summary total are motion parts, a duration set on each prints `--sgs-me-dur` on the part,
 * and the stylesheet's transition or animation on that element reads it, falling back to the site token.
 *
 * Run with: vendor/bin/phpunit --filter ChoiceFlowSpeedPartsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

require_once __DIR__ . '/MotionRendererTestTrait.php';

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class ChoiceFlowSpeedPartsTest extends TestCase {

	use MotionRendererTestTrait;

	private const HTML = '<div class="wp-block-sgs-choice-flow sgs-choice-flow"><div class="sgs-choice-flow__progress"><div class="sgs-choice-flow__progress-fill"></div></div>'
		. '<div class="sgs-choice-flow__summary-media"><img class="sgs-choice-flow__summary-image" src="a.jpg" alt=""></div>'
		. '<span class="sgs-choice-flow__summary-total-value"></span><span class="sgs-choice-flow__summary-summary-total-value"></span></div>';

	private const SPEEDS = array(
		'progress-fill' => 500,
		'summary-photo' => 600,
		'summary-total' => 350,
		'summary-pane-total' => 350,
	);

	private function render_speeds( array $speeds ): string {
		$elements = array();
		foreach ( $speeds as $part => $ms ) {
			$elements[ $part ] = array( 'entrance' => array( 'base' => array( 'trigger' => 'load', 'values' => array( 'duration' => $ms ) ) ) );
		}
		return sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/choice-flow',
				'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
			),
			self::HTML
		);
	}

	private function stylesheet(): string {
		return (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/choice-flow/style.css' );
	}

	public function test_a_duration_on_each_part_prints_on_that_part(): void {
		$this->render_speeds( self::SPEEDS );
		$css = $this->css();
		foreach ( array( 'sgs-choice-flow__progress-fill' => '500ms', 'sgs-choice-flow__summary-image' => '600ms', 'sgs-choice-flow__summary-total-value' => '350ms', 'sgs-choice-flow__summary-summary-total-value' => '350ms' ) as $class => $ms ) {
			$this->assertSame( 1, preg_match( '/' . preg_quote( $class, '/' ) . '[^{]*\{[^}]*--sgs-me-dur:' . preg_quote( $ms, '/' ) . ';/', $css ), "no --sgs-me-dur:{$ms} on {$class}; css: {$css}" );
		}
	}

	public function test_an_unset_part_prints_no_duration(): void {
		$this->render_speeds( array( 'progress-fill' => 500 ) );
		$css = $this->css();
		$this->assertStringContainsString( '--sgs-me-dur:500ms', $css );
		$this->assertStringNotContainsString( 'summary-image', $css );
		$this->assertStringNotContainsString( 'summary-total-value', $css );
	}

	public function test_the_built_in_animations_read_the_part_duration_then_the_token(): void {
		$css = $this->stylesheet();
		$this->assertMatchesRegularExpression( '/summary-image \{\s*transition: filter var\(--sgs-me-dur, var\(--wp--custom--duration--slow, 0\.6s\)\)/', $css );
		$this->assertMatchesRegularExpression( '/animation: sgs-choice-flow-total-pop var\(--sgs-me-dur, var\(--wp--custom--duration--medium, 0\.35s\)\)/', $css );
		$this->assertMatchesRegularExpression( '/progress-fill \{\s*transition: width var\(--sgs-me-dur, var\(--wp--custom--duration--slow, 0\.5s\)\)/', $css );
	}
}
