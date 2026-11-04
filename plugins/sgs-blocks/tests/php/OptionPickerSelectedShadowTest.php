<?php
/**
 * sgs/option-picker selected pill shadow and offset.
 *
 * Run with: vendor/bin/phpunit --filter OptionPickerSelectedShadowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class OptionPickerSelectedShadowTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const ITEMS = array(
		array( 'key' => 'a', 'label' => 'A' ),
		array( 'key' => 'b', 'label' => 'B' ),
	);

	private function selected_rule( string $css ): string {
		$pos = strpos( $css, ':checked ~ .sgs-option-picker__pill{' );
		return false === $pos ? '' : substr( $css, $pos, 400 );
	}

	public function test_unset_prints_no_selected_shadow_or_translate(): void {
		$out  = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS ) );
		$rule = $this->selected_rule( $out['css'] );
		$this->assertStringNotContainsString( 'translate:', $out['css'] );
		$this->assertStringNotContainsString( 'box-shadow', $rule );
	}

	public function test_offset_prints_the_translate_property(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array( 'optionItems' => self::ITEMS, 'pillSelectedOffsetX' => '-2px', 'pillSelectedOffsetY' => '-2px' )
		);
		$this->assertStringContainsString( 'translate:-2px -2px', $this->selected_rule( $out['css'] ) );
	}

	public function test_shadow_prints_box_shadow_on_the_selected_pill(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array( 'optionItems' => self::ITEMS, 'pillSelectedShadow' => '0 3 0 0', 'pillSelectedShadowColour' => '#000000' )
		);
		$this->assertStringContainsString( 'box-shadow:', $this->selected_rule( $out['css'] ) );
	}
}
