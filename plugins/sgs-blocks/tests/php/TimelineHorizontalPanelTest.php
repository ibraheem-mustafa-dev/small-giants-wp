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

	public function test_card_transition_is_opt_in_and_motion_safe(): void {
		$off = $this->block( array( 'panelTransitionMs' => 0 ) );
		$this->assertStringNotContainsString( 'transition:color', $off['css'] );

		$on = $this->block( array( 'panelTransitionMs' => 500 ) );
		$this->assertMatchesRegularExpression( '/@media \(prefers-reduced-motion:no-preference\)\{[^@]*\.sgs-timeline__date\{transition:color 500ms ease,-webkit-text-stroke-color 500ms ease;\}[^@]*\.sgs-timeline__entry\{transition:opacity 500ms ease,scale 500ms ease;\}\}/', $on['css'] );

		$capped = $this->block( array( 'panelTransitionMs' => 99999 ) );
		$this->assertStringContainsString( 'transition:color 3000ms', $capped['css'] );
	}

	public function test_date_text_transform_prints_only_when_set(): void {
		$off = $this->block( array() );
		$this->assertStringNotContainsString( 'text-transform', $off['css'] );

		$on = $this->block( array( 'dateTextTransform' => 'none' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__date\{text-transform:none;\}/', $on['css'] );

		$bad = $this->block( array( 'dateTextTransform' => 'x;}body{display:none' ) );
		$this->assertStringNotContainsString( 'text-transform', $bad['css'] );
	}

	public function test_header_row_is_built_only_for_a_bar_or_a_hint(): void {
		$off = $this->block( array( 'panelCounter' => true ) );
		$this->assertStringNotContainsString( 'sgs-timeline__panel-row', $off['html'] );
		$this->assertStringNotContainsString( 'sgs-timeline--panel-row', $off['html'] );
		$this->assertMatchesRegularExpression( '/data-sgs-fx="horizontal-panel">\s*<p class="sgs-timeline__counter"/', $off['html'] );

		$on = $this->block(
			array(
				'panelCounter'         => true,
				'panelCounterBasis'    => 'active',
				'panelProgressBar'     => true,
				'panelHint'            => 'Scroll to explore',
				'panelBarHeight'       => 4,
				'panelBarTrackColour'  => 'rgba(44,62,80,.12)',
				'panelBarFillGradient' => 'linear-gradient(90deg,#D8CA50,#2EADE2)',
				'panelRowGap'          => 20,
				'panelRowSpacing'      => 36,
				'counterColour'        => 'brand-blue',
				'hintColour'           => '#4A5563',
				'counterFontWeight'    => '800',
				'counterFontSize'      => array( 'desktop' => 15 ),
			)
		);
		$this->assertStringContainsString( 'sgs-timeline--panel-row', $on['html'] );
		$this->assertMatchesRegularExpression( '/<div class="sgs-timeline__panel-row"><p class="sgs-timeline__counter"[^>]*data-sgs-fx-scroll-progress-counter-basis="active"[^>]*>01 \/ 02<\/p><div class="sgs-timeline__panel-track" aria-hidden="true"><span class="sgs-timeline__panel-fill"><\/span><\/div><span class="sgs-timeline__panel-hint">Scroll to explore<\/span><\/div>/', $on['html'] );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__panel-row\{gap:20px;margin-bottom:36px;\}/', $on['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__panel-track\{height:4px;background-color:#2C3E501F;\}/', $on['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__panel-fill\{background-image:linear-gradient\(90deg,#D8CA50,#2EADE2\);\}/', $on['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__counter\{color:var\(--wp--preset--color--brand-blue, currentColor\);\}/', $on['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__counter\{[^}]*font-size:15px/', $on['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__panel-hint\{color:#4A5563;\}/', $on['css'] );
	}

	public function test_hint_alone_builds_the_row_without_a_track(): void {
		$out = $this->block( array( 'panelHint' => 'Scroll' ) );
		$this->assertStringContainsString( '<div class="sgs-timeline__panel-row">', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-timeline__panel-track', $out['html'] );

		$basic = $this->block( array( 'scrollEffect' => 'basic', 'panelProgressBar' => true, 'panelHint' => 'Scroll' ) );
		$this->assertStringNotContainsString( 'sgs-timeline__panel-row', $basic['html'] );
	}

	public function test_counter_basis_defaults_to_progress(): void {
		$out = $this->block( array( 'panelCounter' => true, 'panelCounterBasis' => 'progress' ) );
		$this->assertStringNotContainsString( 'counter-basis', $out['html'] );
	}

	public function test_pin_length_and_tail_print_the_engine_properties_per_tier(): void {
		$off = $this->block( array() );
		$this->assertStringNotContainsString( 'pin-length', $off['css'] );

		$on = $this->block( array( 'panelPinLength' => array( 'desktop' => 60, 'tablet' => 45 ), 'panelPinTail' => array( 'desktop' => 0 ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline\{--sgs-horizontal-panel-pin-length:60vh;--sgs-horizontal-panel-pin-tail:0vh;\}/', $on['css'] );
		$this->assertMatchesRegularExpression( '/--sgs-horizontal-panel-pin-length:45vh;/', $on['css'] );
	}
}
