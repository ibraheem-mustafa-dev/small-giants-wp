<?php
/**
 * Tests: the buy box note's server markup and settings (Spec 27 FR-27-PS8).
 *
 * Run with: vendor/bin/phpunit --filter BuyboxNoteTest
 *
 * The cap, the cleaning and the order line are proved in run-flow-fields-standalone.php (php tests/php/run-flow-fields-standalone.php).
 *
 * @package SGS\Blocks\Tests
 */

namespace {
	if ( ! function_exists( '__' ) ) {
		function __( $text ) { // phpcs:ignore
			return $text;
		}
	}
	if ( ! function_exists( 'apply_filters' ) ) {
		function apply_filters( $tag, $value ) { // phpcs:ignore
			return $value;
		}
	}
}

namespace SGS\Blocks\Tests {

	use PHPUnit\Framework\Attributes\PreserveGlobalState;
	use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
	use PHPUnit\Framework\TestCase;

	#[RunTestsInSeparateProcesses]
	#[PreserveGlobalState( false )]
	final class BuyboxNoteTest extends TestCase {

		protected function setUp(): void {
			if ( ! defined( 'ABSPATH' ) ) {
				define( 'ABSPATH', __DIR__ . '/' );
			}
			require_once dirname( __DIR__, 2 ) . '/includes/helpers-inline-formats.php';
			require_once dirname( __DIR__, 2 ) . '/includes/buybox-note.php';
		}

		public function test_the_note_is_off_by_default_and_prints_nothing(): void {
			$config = \sgs_buybox_note_config( array() );
			$this->assertFalse( $config['on'] );
			$this->assertSame( '', \sgs_buybox_note_html( $config, 7 ) );
			$this->assertSame( '', \sgs_buybox_note_html( \sgs_buybox_note_config( array( 'noteField' => 'yes' ) ), 7 ), 'only a real true turns it on' );
		}

		public function test_the_defaults_are_the_documented_ones(): void {
			$config = \sgs_buybox_note_config( array( 'noteField' => true ) );
			$this->assertSame( 'Allergies or dietary needs?', $config['label'] );
			$this->assertSame( '', $config['hint'] );
			$this->assertFalse( $config['required'] );
			$this->assertSame( 300, $config['max'] );
		}

		public function test_the_block_json_declares_the_five_settings_with_the_same_defaults(): void {
			$attrs = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/buybox/block.json' ), true )['attributes'];
			$this->assertFalse( $attrs['noteField']['default'] );
			$this->assertSame( 'Allergies or dietary needs?', $attrs['noteLabel']['default'] );
			$this->assertSame( '', $attrs['noteHint']['default'] );
			$this->assertFalse( $attrs['noteRequired']['default'] );
			$this->assertSame( 300, $attrs['noteMaxLength']['default'] );
		}

		public function test_the_markup_is_an_accessible_label_and_textarea_with_no_inline_style(): void {
			$html = \sgs_buybox_note_html(
				\sgs_buybox_note_config(
					array(
						'noteField'     => true,
						'noteHint'      => 'For example vegan, egg-free',
						'noteRequired'  => true,
						'noteMaxLength' => 120,
					)
				),
				7
			);
			$this->assertStringContainsString( '<label class="sgs-buybox__note-label" for="sgs-buybox-note-7">', $html );
			$this->assertStringContainsString( '<textarea class="sgs-buybox__note-input" id="sgs-buybox-note-7"', $html );
			$this->assertStringContainsString( 'maxlength="120"', $html );
			$this->assertStringContainsString( 'required aria-required="true"', $html );
			$this->assertStringContainsString( 'aria-describedby="sgs-buybox-note-7-hint sgs-buybox-note-7-error"', $html );
			$this->assertStringContainsString( 'For example vegan, egg-free', $html );
			$this->assertStringContainsString( 'role="status" aria-live="polite"', $html );
			$this->assertStringNotContainsString( 'style=', $html );
		}

		public function test_a_label_and_hint_are_escaped(): void {
			$html = \sgs_buybox_note_html( \sgs_buybox_note_config( array( 'noteField' => true, 'noteLabel' => 'A "q" <b>x</b>', 'noteHint' => '"><script>' ) ), 1 );
			$this->assertStringNotContainsString( '<script>', $html );
			$this->assertStringContainsString( 'data-label="A &quot;q&quot; x"', $html );
		}

		public function test_the_limit_never_passes_the_server_ceiling(): void {
			$this->assertSame( 1000, \sgs_buybox_note_config( array( 'noteField' => true, 'noteMaxLength' => 99999 ) )['max'] );
			$this->assertSame( 300, \sgs_buybox_note_config( array( 'noteField' => true, 'noteMaxLength' => -5 ) )['max'] );
		}
	}
}
