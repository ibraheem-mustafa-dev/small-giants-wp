<?php
/**
 * Tests: the shared scrollbar choice (includes/helpers-scrollbar.php, Spec 02 FR-2-35).
 *
 * 1. sgs_scrollbar_style() keeps a valid stored choice and otherwise falls back to the area's starting value
 *    (an unset setting renders the starting value; an unknown value never reaches the CSS).
 * 2. sgs_scrollbar_css() prints exactly the shared fixture's CSS for each choice (tests/fixtures/scrollbar-style/cases.json,
 *    which tests/js/scrollbar-style.test.js holds the editor twin to): default prints nothing, hidden hides the bar,
 *    the WebKit bar and the overlay thumb, thin sizes the WebKit parts from the thickness token and thins Firefox.
 * 3. Negative control: a planted fault (a thin rule without the token) differs from the fixture.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/helpers-scrollbar.php';

final class ScrollbarStyleTest extends TestCase {

	/**
	 * The shared cases.
	 *
	 * @return array<string, mixed>
	 */
	private function cases(): array {
		return json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/scrollbar-style/cases.json' ), true );
	}

	public function test_style_falls_back_to_the_starting_value(): void {
		foreach ( $this->cases()['style'] as $case ) {
			$this->assertSame( $case['expect'], sgs_scrollbar_style( $case['value'], $case['start'] ), wp_json_encode_safe( $case ) );
		}
	}

	public function test_css_matches_the_shared_fixture(): void {
		foreach ( $this->cases()['css'] as $case ) {
			$this->assertSame( $case['css'], sgs_scrollbar_css( $case['selector'], $case['choice'], $case['media'] ), wp_json_encode_safe( $case ) );
		}
	}

	public function test_negative_control_a_planted_fault_differs(): void {
		$thin   = array_values( array_filter( $this->cases()['css'], static fn( $c ) => 'thin' === $c['choice'] ) )[0];
		$broken = str_replace( 'var(--wp--custom--scrollbar--thin-width,10px)', '6px', $thin['css'] );
		$this->assertNotSame( $broken, sgs_scrollbar_css( $thin['selector'], 'thin' ) );
		$this->assertStringContainsString( '--wp--custom--scrollbar--thin-width', sgs_scrollbar_css( '.a', 'thin' ) );
		$this->assertStringNotContainsString( 'scrollbar-width', sgs_scrollbar_css( '.a', 'default' ) );
	}
}

if ( ! function_exists( 'wp_json_encode_safe' ) ) {
	/**
	 * A case as JSON for an assertion message.
	 *
	 * @param mixed $value The case.
	 * @return string
	 */
	function wp_json_encode_safe( $value ): string {
		return (string) json_encode( $value );
	}
}
