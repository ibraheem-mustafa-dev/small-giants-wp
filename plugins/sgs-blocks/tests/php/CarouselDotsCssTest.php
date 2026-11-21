<?php
/**
 * The carousel dots kit: includes/helpers-carousel-dots.php::sgs_carousel_dots_css prints a slider's dot look from its prefixed
 * settings, on the selectors the block hands in, and prints nothing for a setting that is not set.
 *
 * Every test runs the real helpers in a child process, as the plugin loads them.
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CarouselDotsCssTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CarouselDotsCssTest extends TestCase {

	private const BREAKOUT = 'red;}body{x:y';

	/**
	 * The selectors a pseudo-element dot block (the testimonial slider) hands in.
	 *
	 * @return array<string,string>
	 */
	private function selectors(): array {
		return array(
			'group'        => '.u .dots',
			'dot'          => '.u .dot::before',
			'rest'         => '.u .dot:not(.dot--active)::before',
			'dot_hover'    => '.u .dot:not(.dot--active):hover::before',
			'active'       => '.u .dot--active::before',
			'active_hover' => '.u .dot--active:hover::before',
		);
	}

	/**
	 * The dots CSS for one attribute set, in a child process.
	 *
	 * @param array<string,mixed>  $attrs     Block attributes.
	 * @param array<string,string> $selectors Selectors.
	 * @return string
	 */
	private function dots( array $attrs, ?array $selectors = null ): string {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = (string) tempnam( sys_get_temp_dir(), 'sgsdots' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\ndefine( 'SGS_BLOCKS_VERSION', 't' );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. 'echo sgs_carousel_dots_css( ' . var_export( $attrs, true ) . ", 'dot', " . var_export( $selectors ?? $this->selectors(), true ) . ' );'
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	public function test_all_unset_prints_nothing(): void {
		$this->assertSame( '', $this->dots( array() ), 'MUST FAIL: no setting, no CSS' );
		$this->assertSame( '', $this->dots( array( 'arrowColour' => '#fff', 'dotStyle' => 'x' ) ), 'another prefix and an unknown name print nothing' );
		$this->assertSame( '', $this->dots( array( 'dotColour' => '#fff' ), array() ), 'no selectors, no CSS' );
	}

	public function test_size_prints_width_height_and_minimums_per_device(): void {
		$css = $this->dots( array( 'dotSize' => array( 'desktop' => 8, 'tablet' => '10px', 'mobile' => '6px' ) ) );
		$this->assertStringContainsString( '.u .dot::before{width:8px;height:8px;min-width:8px;min-height:8px;}', $css, 'MUST FAIL: the painted dot takes the size, and its minimum matches' );
		$this->assertMatchesRegularExpression( '/@media[^{]*1023\.98px[^{]*\{\.u \.dot::before\{width:10px;height:10px;min-width:10px;min-height:10px;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{\.u \.dot::before\{width:6px;/', $css );
		$this->assertStringContainsString( '.u .dots{--sgs-carousel-dot-size:8px;}', $css, 'MUST FAIL: the size is also a custom property on the row, which a block stylesheet reads with its default as the fallback' );
		$this->assertSame( '', $this->dots( array( 'dotSize' => '8px' ) ), 'a scalar is not a tier object: nothing' );
	}

	public function test_colours_print_resting_hover_and_current_and_the_current_dot_keeps_its_colour_under_the_pointer(): void {
		$css = $this->dots(
			array(
				'dotColour'       => '#c0c0c0',
				'dotColourHover'  => '#112233',
				'dotColourActive' => 'primary',
			)
		);
		$this->assertStringContainsString( '.u .dot:not(.dot--active)::before{background-color:#c0c0c0;}', $css, 'MUST FAIL: the resting colour goes on the dots that are not current' );
		$this->assertStringNotContainsString( '.u .dot::before{background-color', $css, 'the current dot is not painted with the resting colour' );
		$this->assertStringContainsString( ':where(:root:not(.sgs-touch-input)) .u .dot:not(.dot--active):hover::before{background-color:#112233;}', $css, 'MUST FAIL: hover, behind the touch guard' );
		$this->assertStringContainsString( '.u .dot--active::before{background-color:var(--wp--preset--color--primary, currentColor);}', $css, 'MUST FAIL: a palette name resolves to its variable' );
		$this->assertStringContainsString( '.u .dot--active:hover::before{background-color:var(--wp--preset--color--primary, currentColor);}', $css, 'the current dot keeps its colour under the pointer' );
		$this->assertGreaterThan( (int) strpos( $css, ':hover::before{background-color:#112233' ), (int) strpos( $css, '.u .dot--active::before{background-color' ), 'the current dot rule comes after the hover rule' );
	}

	public function test_border_and_radius_print_on_the_resting_dot(): void {
		$css = $this->dots( array( 'dotBorderWidth' => '2px', 'dotBorderColour' => '#ff0000', 'dotRadius' => '3px' ) );
		$this->assertStringContainsString( '.u .dot::before{box-sizing:border-box;border-style:solid;border-width:2px;border-color:#ff0000;border-radius:3px;}', $css, 'MUST FAIL' );
		$colour_only = $this->dots( array( 'dotBorderColour' => '#ff0000' ) );
		$this->assertStringNotContainsString( 'border-style', $colour_only, 'a colour with no width draws no border' );
	}

	public function test_active_width_makes_a_pill_and_gap_goes_on_the_row(): void {
		$css = $this->dots( array( 'dotActiveWidth' => array( 'desktop' => 24 ), 'dotGap' => array( 'desktop' => 12, 'mobile' => 6 ) ) );
		$this->assertStringContainsString( '.u .dot--active::before{width:24px;min-width:24px;}', $css, 'MUST FAIL: the current dot is wider' );
		$this->assertStringContainsString( '.u .dots{gap:12px;}', $css, 'MUST FAIL: the gap is on the row' );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{\.u \.dots\{gap:6px;\}\}/', $css );
	}

	public function test_a_button_dot_takes_the_same_settings_on_its_own_selectors(): void {
		$css = $this->dots(
			array( 'dotColour' => '#aaa', 'dotSize' => array( 'desktop' => 12 ) ),
			array( 'group' => '.g .dots', 'dot' => '.g .dot', 'active' => '.g .dot--active' )
		);
		$this->assertStringContainsString( '.g .dot{width:12px;height:12px;min-width:12px;min-height:12px;}', $css );
		$this->assertStringContainsString( '.g .dot{background-color:#aaa;}', $css, 'with no `rest` selector the resting colour goes on `dot`' );
		$this->assertStringNotContainsString( '::before', $css, 'MUST FAIL: only the selectors handed in print' );
	}

	public function test_an_unsafe_value_never_closes_the_rule(): void {
		$bad = self::BREAKOUT;
		$css = $this->dots(
			array(
				'dotSize'         => array( 'desktop' => $bad ),
				'dotActiveWidth'  => array( 'desktop' => $bad ),
				'dotGap'          => array( 'desktop' => $bad ),
				'dotColour'       => $bad,
				'dotColourHover'  => $bad,
				'dotColourActive' => $bad,
				'dotBorderWidth'  => $bad,
				'dotBorderColour' => $bad,
				'dotRadius'       => $bad,
			)
		);
		$this->assertStringNotContainsString( '}body', $css, 'MUST FAIL: no value closes the rule' );
		$this->assertStringNotContainsString( 'x:y', $css );
		$this->assertSame( substr_count( $css, '{' ), substr_count( $css, '}' ), 'every brace the CSS opens it closes' );
	}
}
