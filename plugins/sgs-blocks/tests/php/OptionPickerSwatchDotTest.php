<?php
/**
 * sgs/option-picker colour dot (shape, size, ring, tick inside) and the per-item caption line.
 *
 * Run with: vendor/bin/phpunit --filter OptionPickerSwatchDotTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class OptionPickerSwatchDotTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const ITEMS = array(
		array( 'key' => 'a', 'label' => 'A' ),
		array( 'key' => 'b', 'label' => 'B' ),
	);

	public function test_unset_prints_no_dot_rule_and_no_dot_tick_class(): void {
		$out = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS ) );
		$this->assertStringNotContainsString( 'sgs-option-picker__swatch--colour{', $out['css'] );
		$this->assertStringNotContainsString( '--sgs-op-swatch-tick', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-option-picker--swatch-tick', $out['html'] );
		$this->assertStringContainsString( 'sgs-option-picker--no-tick', $out['html'] );
		$explicit = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS, 'swatchShape' => '', 'swatchTickInside' => false ) );
		$this->assertSame( $out['html'], $explicit['html'] );
	}

	public function test_shape_size_and_ring_print_one_scoped_rule(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array( 'optionItems' => self::ITEMS, 'pillStyle' => 'outlined', 'swatchShape' => 'round', 'swatchSize' => '20px', 'swatchRingWidth' => '2px', 'swatchRingColour' => '#3a2a22' )
		);
		$this->assertStringContainsString( '.wp-block-sgs-option-picker .sgs-option-picker__swatch--colour{border-radius:50%;width:20px;height:20px;border-width:2px;border-color:#3a2a22;}', $out['css'] );
	}

	public function test_a_tile_keeps_its_full_width_colour_block(): void {
		$out = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS, 'pillStyle' => 'tile', 'swatchShape' => 'round', 'swatchSize' => '20px' ) );
		$this->assertStringNotContainsString( 'sgs-option-picker__swatch--colour{', $out['css'] );
	}

	public function test_tick_inside_moves_the_tick_into_the_dot(): void {
		$out = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS, 'showSelectedTick' => true, 'swatchTickInside' => true, 'swatchTickColour' => '#ffffff' ) );
		$this->assertStringContainsString( 'sgs-option-picker--swatch-tick', $out['html'] );
		$this->assertStringContainsString( 'sgs-option-picker--no-tick', $out['html'], 'the separate tick is hidden' );
		$this->assertStringContainsString( '--sgs-op-swatch-tick:#ffffff', $out['css'] );
	}

	public function test_a_caller_supplied_caption_line_shows_under_the_option(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array( 'optionItems' => array( array( 'key' => 'a', 'label' => 'A', 'subLabel' => '£9.50' ), array( 'key' => 'b', 'label' => 'B' ) ) )
		);
		$this->assertStringContainsString( 'pill-label">A</span><span class="sgs-option-picker__sub-label">£9.50</span>', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], 'sgs-option-picker__sub-label' ) );
	}
}
