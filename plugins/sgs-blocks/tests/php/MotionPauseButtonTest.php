<?php
/**
 * Tests: the shared pause / play button (includes/helpers-motion-pause.php + assets/css/motion-pause.css).
 *
 * 1. The markup: a real <button>, one accessible name, aria-pressed="false", the runtime hook
 *    attribute, rendered hidden, both icons, the block's own `__pause` class, the placement modifier
 *    (an unknown placement falls back to overlay-end), and the label escaped.
 * 2. The stylesheet: a 44px target, a visible focus ring, the icon swap keyed on aria-pressed, the
 *    `hidden` state honoured, and the look at zero specificity so a block's own rule can paint it.
 *
 * The helper runs in a child process with the QA harness's WordPress stubs (see SliderNavTest).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class MotionPauseButtonTest extends TestCase {

	private const PLUGIN = __DIR__ . '/../..';

	/**
	 * Run the helper with the given arguments (a PHP array literal) and return its output.
	 *
	 * @param string $args PHP source of the argument array.
	 * @return string
	 */
	private function button( string $args ): string {
		$script = tempnam( sys_get_temp_dir(), 'sgsmp' ) . '.php';
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", ' . var_export( self::PLUGIN . '/', true ) . ' ); define( "SGS_BLOCKS_PATH", ABSPATH );'
			. ' require ' . var_export( self::PLUGIN . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( self::PLUGIN . '/includes/helpers-motion-pause.php', true ) . ';'
			. ' echo sgs_motion_pause_button( ' . $args . ' );'
		);
		$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		unlink( $script );
		return $out;
	}

	public function test_the_button_is_a_hidden_toggle_with_one_name_and_both_icons(): void {
		$out = $this->button( 'array( "block" => "sgs-brand-strip", "label" => "Pause scrolling", "placement" => "inline" )' );
		$this->assertMatchesRegularExpression( '#^<button type="button" #', $out );
		$this->assertStringContainsString( 'class="sgs-motion-pause sgs-motion-pause--inline sgs-brand-strip__pause"', $out );
		$this->assertStringContainsString( 'aria-pressed="false"', $out );
		$this->assertStringContainsString( 'aria-label="Pause scrolling"', $out );
		$this->assertStringContainsString( ' data-sgs-motion-pause ', $out );
		$this->assertMatchesRegularExpression( '#data-sgs-motion-pause hidden>#', $out, 'rendered hidden until the motion runs' );
		$this->assertStringContainsString( 'sgs-motion-pause__icon--pause', $out );
		$this->assertStringContainsString( 'sgs-motion-pause__icon--play', $out );
		$this->assertSame( 2, substr_count( $out, 'aria-hidden="true"' ), 'both icons are hidden from assistive technology' );
	}

	public function test_an_unknown_placement_falls_back_to_overlay_end_and_the_label_is_escaped(): void {
		$out = $this->button( 'array( "block" => "sgs-x", "label" => "P\"><script>x</script>", "placement" => "sideways" )' );
		$this->assertStringContainsString( 'sgs-motion-pause--overlay-end', $out );
		$this->assertStringNotContainsString( 'sgs-motion-pause--sideways', $out );
		$this->assertStringNotContainsString( '<script>', $out );
	}

	public function test_a_missing_label_still_gives_the_button_a_name(): void {
		$out = $this->button( 'array( "block" => "sgs-x" )' );
		$this->assertMatchesRegularExpression( '#aria-label="[^"]+"#', $out );
	}

	public function test_the_stylesheet_keeps_the_target_and_icon_contract_and_leaves_focus_to_the_system(): void {
		$css = (string) file_get_contents( self::PLUGIN . '/assets/css/motion-pause.css' );
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-motion-pause\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;#', $css );
		$this->assertDoesNotMatchRegularExpression( '#:focus-visible[^{]*\{[^}]*outline#', $css, 'the focus system draws the ring' );
		$this->assertMatchesRegularExpression( '#\.sgs-motion-pause\[hidden\]\s*\{\s*display:\s*none;#', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-motion-pause\[aria-pressed="true"\] \.sgs-motion-pause__icon--play\s*\{\s*display:\s*block;#', $css );
		$this->assertMatchesRegularExpression( '#:where\(\.sgs-motion-pause\)\s*\{[^}]*background-color:#', $css, 'the look sits at zero specificity' );
	}
}
