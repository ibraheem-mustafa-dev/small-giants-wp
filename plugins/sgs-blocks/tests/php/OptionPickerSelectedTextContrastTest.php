<?php
/**
 * sgs/option-picker: with no chosen-text colour set, the chosen pill's text is black or white, whichever reads better on
 * the chosen fill (shop investigation F-55: white on a pale yellow primary read 1.48:1).
 *
 * Run with: vendor/bin/phpunit --filter OptionPickerSelectedTextContrastTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class OptionPickerSelectedTextContrastTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const ITEMS = array(
		array( 'key' => 'a', 'label' => 'A' ),
		array( 'key' => 'b', 'label' => 'B' ),
	);

	/** A site whose primary is a pale yellow (rgb 249,207,110). */
	private function light_primary(): array {
		return array( 'color' => array( 'palette' => array( 'theme' => array( array( 'slug' => 'primary', 'color' => '#f9cf6e' ) ) ) ) );
	}

	/** A site whose primary is the framework's dark teal. */
	private function dark_primary(): array {
		return array( 'color' => array( 'palette' => array( 'theme' => array( array( 'slug' => 'primary', 'color' => '#1f7a7a' ) ) ) ) );
	}

	public function test_a_light_primary_gives_the_chosen_pill_black_text(): void {
		$out = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS ), array(), $this->light_primary() );
		$this->assertStringContainsString( '--sgs-op-sel-auto-text:#000', $out['css'] );
	}

	public function test_a_light_chosen_fill_setting_gives_black_text_on_a_dark_primary(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array( 'optionItems' => self::ITEMS, 'pillStyle' => 'filled', 'pillSelectedBgColour' => '#f9cf6e' ),
			array(),
			$this->dark_primary()
		);
		$this->assertStringContainsString( '--sgs-op-sel-auto-text:#000', $out['css'] );
	}

	public function test_a_dark_primary_keeps_white_text(): void {
		$out = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS ), array(), $this->dark_primary() );
		$this->assertStringContainsString( '--sgs-op-sel-auto-text:#fff', $out['css'] );
	}

	public function test_a_set_chosen_text_colour_still_wins(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array( 'optionItems' => self::ITEMS, 'pillSelectedTextColour' => '#112233' ),
			array(),
			$this->light_primary()
		);
		$this->assertStringContainsString( '--sgs-op-sel-text:#112233', $out['css'] );
		$this->assertStringNotContainsString( '--sgs-op-sel-auto-text', $out['css'] );
	}

	public function test_ghost_and_tile_pills_print_no_picked_colour(): void {
		foreach ( array( 'ghost', 'tile' ) as $style ) {
			$out = $this->render_block( 'sgs/option-picker', array( 'optionItems' => self::ITEMS, 'pillStyle' => $style ), array(), $this->light_primary() );
			$this->assertStringContainsString( 'sgs-option-picker--' . $style, $out['html'], $style . ' rendered' );
			$this->assertStringNotContainsString( '--sgs-op-sel-auto-text', $out['css'], $style );
		}
	}

	public function test_a_fill_with_no_single_hex_prints_nothing(): void {
		$out = $this->render_block(
			'sgs/option-picker',
			array( 'optionItems' => self::ITEMS, 'pillSelectedBgColour' => 'var(--brand)' ),
			array(),
			$this->light_primary()
		);
		$this->assertStringNotContainsString( '--sgs-op-sel-auto-text', $out['css'] );
	}

	public function test_the_stylesheet_reads_the_picked_colour_before_white(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/option-picker/style.css' );
		$this->assertStringNotContainsString( 'var(--sgs-op-sel-text, #ffffff)', $css );
		$this->assertSame( 7, substr_count( $css, 'var(--sgs-op-sel-text, var(--sgs-op-sel-auto-text, #ffffff))' ) );
		$this->assertStringContainsString( 'solid--sel-text, var(--sgs-op-sel-auto-text, #ffffff))', $css );
	}
}
