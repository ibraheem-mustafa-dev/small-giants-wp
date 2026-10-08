<?php
/**
 * sgs/business-info hoursRowPadding: the opening-hours row padding is a per-device box
 * emitted as scoped custom properties, and an unset attribute emits nothing new.
 *
 * Run with: vendor/bin/phpunit --filter BusinessInfoHoursRowPaddingTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class BusinessInfoHoursRowPaddingTest extends TestCase {

	use BlockHarnessRenderTrait;

	protected function setUp(): void {
		// Stored opening hours, so the hours display type has rows to print (the harness
		// reads this through the get_option stub; without it the block renders nothing).
		putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => array(
			'phone'         => '01234 567890',
			'opening_hours' => array( 'mon' => '9-5' ),
		) ) ) );
	}

	protected function tearDown(): void {
		putenv( 'SGS_QA_OPTIONS' );
	}

	public function test_set_value_emits_scoped_custom_properties_per_device(): void {
		$out = $this->render_block(
			'sgs/business-info',
			array(
				'displayType'     => 'hours',
				'hoursRowPadding' => array(
					'desktop' => array(
						'top'    => '0px',
						'bottom' => '0px',
					),
					'mobile'  => array(
						'top' => '4px',
					),
				),
			)
		);

		$this->assertMatchesRegularExpression( '/\.sgs-biz-[0-9a-f]{8}\{--sgs-bi-hours-row-pad-top:0px;--sgs-bi-hours-row-pad-bottom:0px;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{\.sgs-biz-[0-9a-f]{8}\{--sgs-bi-hours-row-pad-top:4px;\}\}/', $out['css'] );
		$this->assertStringNotContainsString( 'style="', $out['html'] );
	}

	public function test_unset_value_emits_no_hours_row_padding(): void {
		$out = $this->render_block( 'sgs/business-info', array( 'displayType' => 'hours' ) );

		$this->assertStringContainsString( 'sgs-business-hours__row', $out['html'], 'positive control: the hours rows rendered' );
		$this->assertStringNotContainsString( 'hours-row-pad', $out['css'] );
	}

	public function test_other_display_types_ignore_the_attribute(): void {
		$out = $this->render_block(
			'sgs/business-info',
			array(
				'displayType'     => 'phone',
				'hoursRowPadding' => array( 'desktop' => array( 'top' => '0px' ) ),
			)
		);

		$this->assertStringContainsString( 'sgs-business-phone', $out['html'], 'positive control: the phone rendered' );
		$this->assertStringNotContainsString( 'hours-row-pad', $out['css'] );
	}
}
