<?php
/**
 * sgs/business-info: map height, zoom and filter; open-status dot pulse; today row styling.
 *
 * Run with: vendor/bin/phpunit --filter BusinessInfoMapAndPulseTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class BusinessInfoMapAndPulseTest extends TestCase {

	use BlockHarnessRenderTrait;

	protected function setUp(): void {
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => array(
			'address'       => '1 High Street, Birmingham',
			'opening_hours' => array( 'mon' => '9-5', 'tue' => '9-5', 'sun' => '10-4' ),
		) ) ) );
	}

	protected function tearDown(): void {
		putenv( 'SGS_QA_OPTIONS' );
	}

	public function test_map_height_zoom_and_filter(): void {
		$out = $this->render_block(
			'sgs/business-info',
			array(
				'displayType' => 'map',
				'mapHeight'   => array( 'desktop' => '460px', 'mobile' => '320px' ),
				'mapZoom'     => 12,
				'mapFilter'   => 'grayscale(.35) contrast(1.05)',
			)
		);
		$this->assertStringContainsString( 'z=12', $out['html'] );
		$this->assertStringContainsString( 'loading="lazy"', $out['html'] );
		$this->assertStringContainsString( 'title="', $out['html'] );
		$this->assertStringNotContainsString( 'style="', $out['html'] );
		$this->assertMatchesRegularExpression( '/\.sgs-business-map iframe\{height:460px;?\}/', $out['css'] );
		$this->assertStringContainsString( 'filter:grayscale(.35) contrast(1.05);', $out['css'] );
	}

	public function test_custom_filter_beats_preset_and_unsafe_value_falls_back(): void {
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'map', 'mapFilterPreset' => 'sepia', 'mapFilter' => 'url(#x) blur(2px)' ) );
		$this->assertStringContainsString( 'filter:sepia(.6);', $out['css'] );
		$this->assertStringNotContainsString( 'url(', $out['css'] );
	}

	public function test_default_map_emits_no_filter_or_height_rule(): void {
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'map' ) );
		$this->assertStringContainsString( 'z=15', $out['html'] );
		$this->assertStringNotContainsString( 'filter:', $out['css'] );
	}

	public function test_zoom_is_clamped(): void {
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'map', 'mapZoom' => 99 ) );
		$this->assertStringContainsString( 'z=20', $out['html'] );
	}

	public function test_pulse_class_and_duration(): void {
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'open-status', 'openStatusDotPulse' => true, 'openStatusDotPulseDuration' => 2400 ) );
		$this->assertStringContainsString( 'sgs-business-info-wrap--pulse', $out['html'] );
		$this->assertStringContainsString( '--sgs-os-pulse-dur:2400ms', $out['css'] );
		$off = $this->render_block( 'sgs/business-info', array( 'displayType' => 'open-status' ) );
		$this->assertStringNotContainsString( '--pulse', $off['html'] );
	}

	public function test_hours_rows_carry_days_and_today_styles(): void {
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'hours', 'hoursTodayColour' => '#112233', 'hoursTodayBackground' => '#ffeecc', 'hoursTodayWeight' => '700' ) );
		$this->assertStringContainsString( 'data-sgs-hours-today', $out['html'] );
		$this->assertStringContainsString( 'data-days="mon"', $out['html'] );
		$this->assertStringContainsString( 'sgs-business-info__hours-row--today{color:#112233;background-color:#ffeecc;font-weight:700;}', $out['css'] );
		$cond = $this->render_block( 'sgs/business-info', array( 'displayType' => 'hours', 'hoursLayout' => 'condensed' ) );
		$this->assertStringContainsString( 'data-days="mon tue"', $cond['html'] );
	}
}
