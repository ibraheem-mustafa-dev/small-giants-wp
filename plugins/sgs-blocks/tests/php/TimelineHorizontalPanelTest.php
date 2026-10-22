<?php
/**
 * sgs/timeline: the pinned-horizontal settings reach the motion engine's data attributes, the counter element and the
 * active-entry year rules.
 *
 * Run with: vendor/bin/phpunit --filter TimelineHorizontalPanelTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TimelineHorizontalPanelTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function block( array $extra ): array {
		$entries = array(
			array( 'date' => '2020', 'title' => 'A', 'description' => 'x', 'icon' => '', 'image' => 0 ),
			array( 'date' => '2021', 'title' => 'B', 'description' => 'y', 'icon' => '', 'image' => 0 ),
		);
		return $this->render_block( 'sgs/timeline', array_merge( array( 'orientation' => 'horizontal', 'scrollEffect' => 'pinned-horizontal', 'entries' => $entries ), $extra ) );
	}

	public function test_proximity_focus_and_counter_reach_the_engine(): void {
		$out = $this->block( array( 'panelProximityFocus' => true, 'panelEdgeOpacity' => 0.4, 'panelCounter' => true ) );

		$this->assertStringContainsString( 'data-sgs-fx="horizontal-panel"', $out['html'], 'positive control: the pin is on' );
		$this->assertStringContainsString( 'data-sgs-fx-horizontal-panel-proximity-focus="true"', $out['html'] );
		$this->assertStringContainsString( 'data-sgs-fx-horizontal-panel-edge-opacity="0.4"', $out['html'] );
		$this->assertStringContainsString( 'data-sgs-fx-scroll-progress-output="counter"', $out['html'] );
		$this->assertStringContainsString( '>01 / 02</p>', $out['html'] );
	}

	public function test_nothing_is_emitted_by_default_or_without_the_pin(): void {
		$off = $this->block( array() );
		$this->assertStringNotContainsString( 'proximity-focus', $off['html'] );
		$this->assertStringNotContainsString( 'sgs-timeline__counter"', $off['html'] );

		$basic = $this->block( array( 'scrollEffect' => 'basic', 'panelCounter' => true, 'panelProximityFocus' => true ) );
		$this->assertStringNotContainsString( 'proximity-focus', $basic['html'] );
		$this->assertStringNotContainsString( 'sgs-timeline__counter"', $basic['html'] );
	}

	public function test_active_year_rules_are_scoped_to_the_active_entry(): void {
		$out = $this->block( array( 'dateActiveColour' => 'transparent', 'dateActiveTextStrokeColour' => '#0A7EA8', 'dateActiveTextStrokeWidth' => array( 'desktop' => 2 ) ) );

		$this->assertMatchesRegularExpression( '/\[data-sgs-fx-panel-active\] \.sgs-timeline__date\{color:transparent;-webkit-text-stroke-color:#0A7EA8;/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\[data-sgs-fx-panel-active\] \.sgs-timeline__date\{-webkit-text-stroke-width:2px;/', $out['css'] );
	}
}
