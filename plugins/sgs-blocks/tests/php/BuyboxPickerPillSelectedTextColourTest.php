<?php
/**
 * Tests: sgs/buybox's `pickerPillSelectedTextColour` reaches each option picker as `pillSelectedTextColour`, which the
 * option picker prints as a real `--sgs-op-sel-text` colour; unset prints nothing new.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxPickerPillSelectedTextColourTest extends TestCase {

	public function test_a_set_colour_reaches_the_option_picker_as_a_real_colour(): void {
		$html = BuyboxSnapshotTest::render_fixture( 'standard', array( 'pickerPillSelectedTextColour' => '#112233' ), null, array(), true );
		$this->assertStringContainsString( '--sgs-op-sel-text:#112233', $html );
	}

	public function test_unset_prints_nothing_new(): void {
		$html = BuyboxSnapshotTest::render_fixture( 'standard', array(), null, array(), true );
		$this->assertStringContainsString( 'sgs-option-picker', $html, 'the pickers rendered, so the negative control is not vacuous' );
		$this->assertStringNotContainsString( '--sgs-op-sel-text', $html );
		$this->assertSame(
			BuyboxSnapshotTest::norm( $html ),
			BuyboxSnapshotTest::norm( BuyboxSnapshotTest::render_fixture( 'standard', array( 'pickerPillSelectedTextColour' => '' ), null, array(), true ) )
		);
	}
}
