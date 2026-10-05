<?php
/**
 * Sgs/multi-button keeps its buttons in a flex row when a content band renders.
 *
 * A content width (or band padding / margin) makes SGS_Container_Wrapper wrap the
 * buttons in `.sgs-container__inner`. The block's flex row must then sit on that
 * band, with the root a plain block, otherwise the band is the root's only flex
 * item and the buttons stack inside it.
 *
 * Run with: vendor/bin/phpunit --filter MultiButtonContentBandTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Multi-button content band layout.
 */
final class MultiButtonContentBandTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * With a content width the band carries the flex row at every tier.
	 */
	public function test_band_carries_the_flex_row(): void {
		$out = $this->render_block( 'sgs/multi-button', array( 'contentWidth' => array( 'desktop' => '600px' ) ) );

		$this->assertStringContainsString( '<div class="sgs-container__inner">', $out['html'] );
		$this->assertSame( 1, preg_match( '/sgs-mb-[0-9a-z]+/', $out['html'], $m ) );
		$root = '.' . $m[0] . '.sgs-multi-button';
		$band = $root . '>.sgs-container__inner';

		$this->assertStringContainsString( $root . ':has(>.sgs-container__inner){display:block;}', $out['css'] );
		$this->assertStringContainsString( $band . '{display:flex;flex-direction:row;', $out['css'] );
		$this->assertStringContainsString( '@media(max-width:767px){' . $root . ',' . $band . '{flex-direction:column;', $out['css'] );
	}

	/**
	 * Without a band the root itself stays the flex row.
	 */
	public function test_root_is_the_flex_row_without_a_band(): void {
		$out = $this->render_block( 'sgs/multi-button', array() );

		$this->assertStringNotContainsString( 'sgs-container__inner"', $out['html'] );
		$this->assertMatchesRegularExpression( '/\.sgs-mb-[0-9a-z]+\.sgs-multi-button[,{][^}]*display:flex;flex-direction:row;/', $out['css'] );
	}
}
