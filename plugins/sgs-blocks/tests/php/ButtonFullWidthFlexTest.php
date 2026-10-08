<?php
/**
 * Tests: a full-width sgs/button never takes its parent's height in a flex column.
 *
 * `flex: 0 0 100%` made the basis 100% of the parent's MAIN size: a row's width (intended), but a column's
 * height once that height is definite. Measured live in a nav drawer (2026-10-08): three full-width menu
 * buttons each 319px tall, overflowing their stack. `flex: 0 0 auto` takes the basis from width:100% in a row
 * (the same full line, no shrink) and from the content in a column.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonFullWidthFlexTest extends TestCase {

	public function test_full_width_button_basis_comes_from_its_width_not_the_parent_main_size(): void {
		$css = (string) file_get_contents( __DIR__ . '/../../src/blocks/button/style.css' );
		$this->assertSame( 1, preg_match( '#\.sgs-button--full\s*\{([^}]*)\}#', $css, $m ), 'the full-width rule exists' );
		$rule = $m[1];
		$this->assertMatchesRegularExpression( '#\bflex:\s*0 0 auto\s*;#', $rule );
		$this->assertMatchesRegularExpression( '#\bwidth:\s*100%\s*;#', $rule );
		// Negative control: a percentage basis is the column-height bug.
		$this->assertDoesNotMatchRegularExpression( '#\bflex:\s*0 0 100%#', $rule );
		$this->assertDoesNotMatchRegularExpression( '#flex-basis:\s*100%#', $rule );
	}
}
