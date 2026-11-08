<?php
/**
 * Tests: an sgs/button label can shrink inside its button and ends in an ellipsis when one line does not fit, so an
 * icon spread to the far end stays inside the button at narrow widths; the clip is horizontal only.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonLabelShrinkTest extends TestCase {

	public function test_the_label_shrinks_with_an_ellipsis_and_clips_sideways_only(): void {
		$css = (string) file_get_contents( __DIR__ . '/../../src/blocks/button/style.css' );
		$this->assertSame( 1, preg_match( '#\.sgs-button__label\s*\{([^}]*)\}#', $css, $m ), 'the label rule exists' );
		$this->assertMatchesRegularExpression( '#min-width:\s*0\s*;#', $m[1] );
		$this->assertMatchesRegularExpression( '#text-overflow:\s*ellipsis\s*;#', $m[1] );
		$this->assertMatchesRegularExpression( '#overflow-x:\s*clip\s*;#', $m[1] );
		// negative control: a both-axis clip would cut underlines and descenders
		$this->assertDoesNotMatchRegularExpression( '#(^|;)\s*overflow:\s*hidden#', $m[1] );
	}
}
