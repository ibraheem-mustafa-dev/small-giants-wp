<?php
/**
 * includes/helpers-hover-state.php::sgs_touch_hover_css against the shared contract fixture
 * (tests/fixtures/touch-hover/cases.json, also run by tests/js/touch-hover-transform.test.js), and the emitters that
 * build on it (Spec 38A FR-38A-17).
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/helpers-hover-state.php';

/**
 * The hover-on-touch contract for generated CSS.
 */
final class TouchHoverContractTest extends TestCase {

	/**
	 * Fixture cases as [name => [in, out]].
	 *
	 * @return array<string,array{0:string,1:string}>
	 */
	public static function cases(): array {
		$doc = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/touch-hover/cases.json' ), true );
		$out = array();
		foreach ( $doc['cases'] as $case ) {
			$out[ $case['name'] ] = array( $case['in'], $case['out'] );
		}
		return $out;
	}

	/**
	 * Each case turns `in` into `out`, and a second pass changes nothing.
	 *
	 * @dataProvider cases
	 * @param string $in  Input CSS.
	 * @param string $out Expected CSS.
	 */
	public function test_contract_case( string $in, string $out ): void {
		$once = sgs_touch_hover_css( $in );
		$this->assertSame( $out, $once );
		$this->assertSame( $once, sgs_touch_hover_css( $once ) );
	}

	/**
	 * The emitter helpers print the touch half first, so the guarded mouse members stay one run.
	 */
	public function test_guarded_rule_prints_touch_half_then_mouse_half(): void {
		$this->assertSame(
			'.u .a.sgs-pressed,.u .b.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .a:hover,:where(:root:not(.sgs-touch-input)) .u .b:hover{background-color:#112233;}',
			sgs_hover_guarded_rule( '.u .a:hover,.u .b:hover', 'background-color:#112233;' )
		);
		$this->assertSame(
			'.u .btn.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .btn:hover{color:red;}.u .btn:focus-visible{color:red;}',
			sgs_hover_state_rules( '.u .btn', 'color:red;' )
		);
	}

	/**
	 * A finished rule passed through the wrapper (an `@supports` companion) gains its pressed half inside the at-rule.
	 */
	public function test_media_wrap_adds_the_pressed_half_inside_supports(): void {
		$this->assertSame(
			'@supports (background-clip:text){.h.sgs-pressed,:where(:root:not(.sgs-touch-input)) .h:hover{color:transparent}}',
			sgs_hover_media_wrap( '@supports (background-clip:text){' . SGS_HOVER_NOT_TOUCH . ' .h:hover{color:transparent}}' )
		);
	}

	/**
	 * CSS without a hover or press state comes back byte for byte, and unbalanced CSS is left alone.
	 */
	public function test_css_without_states_is_untouched(): void {
		$css = "/* keep */\n.a{color:red}";
		$this->assertSame( $css, sgs_touch_hover_css( $css ) );
		// Unbalanced braces: printed as they came, never re-cut by a parser that cannot trust them.
		$this->assertSame( '.a:hover{color:red}}.b{color:blue}', sgs_touch_hover_css( '.a:hover{color:red}}.b{color:blue}' ) );
		$this->assertSame( '.a:hover{color:red', sgs_touch_hover_css( '.a:hover{color:red' ) );
	}

	/**
	 * Unreadable input, as [name => [in]] from the fixture's `unreadable` list.
	 *
	 * @return array<string,array{0:string}>
	 */
	public static function unreadable(): array {
		$doc = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/touch-hover/cases.json' ), true );
		$out = array();
		foreach ( $doc['unreadable'] as $case ) {
			$out[ $case['name'] ] = array( $case['in'] );
		}
		return $out;
	}

	/**
	 * Input the contract cannot rewrite (unbalanced braces, CSS nesting under a hover) is printed as it came.
	 *
	 * @dataProvider unreadable
	 * @param string $in Input CSS.
	 */
	public function test_unreadable_input_is_printed_as_it_came( string $in ): void {
		$this->assertSame( $in, sgs_touch_hover_css( $in ) );
	}

	/**
	 * The silent fallbacks name their reason in the error log under WP_DEBUG, and stay silent without it. Run in a child
	 * process, because WP_DEBUG is a constant and cannot be switched back.
	 *
	 * @dataProvider unreadable
	 * @param string $in Input CSS.
	 */
	public function test_unreadable_input_is_logged_under_wp_debug( string $in ): void {
		$this->assertStringContainsString( 'sgs_touch_hover_css: ', $this->run_with_debug( $in, true ) );
		$this->assertSame( '', $this->run_with_debug( $in, false ) );
	}

	/**
	 * Run the transform on CSS in a fresh PHP process and return what it wrote to the error log.
	 *
	 * @param string $css   Input CSS.
	 * @param bool   $debug Whether WP_DEBUG is defined true.
	 * @return string The error log text.
	 */
	private function run_with_debug( string $css, bool $debug ): string {
		$log  = tempnam( sys_get_temp_dir(), 'sgs-hover-log' );
		$code = ( $debug ? "define( 'WP_DEBUG', true );" : '' )
			. "require '" . dirname( __DIR__, 2 ) . "/includes/helpers-hover-state.php';"
			. 'sgs_touch_hover_css( base64_decode( $argv[1] ) );';
		$proc = proc_open(
			array( PHP_BINARY, '-d', 'error_log=' . $log, '-d', 'log_errors=1', '-r', $code, base64_encode( $css ) ),
			array(
				1 => array( 'pipe', 'w' ),
				2 => array( 'pipe', 'w' ),
			),
			$pipes
		);
		$this->assertIsResource( $proc );
		stream_get_contents( $pipes[1] );
		stream_get_contents( $pipes[2] );
		proc_close( $proc );
		$text = (string) file_get_contents( $log );
		unlink( $log );
		return $text;
	}
}
