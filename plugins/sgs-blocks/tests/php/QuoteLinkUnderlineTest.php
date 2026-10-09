<?php
/**
 * sgs/quote: a link in the attribution takes attributionLinkUnderline through sgs_link_underline_css.
 *
 * Run with: vendor/bin/phpunit --filter QuoteLinkUnderlineTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class QuoteLinkUnderlineTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function block( array $extra ): array {
		return $this->render_block( 'sgs/quote', array_merge( array( 'attributionEnabled' => true, 'attribution' => 'By <a href="/offers/">see offers</a>' ), $extra ) );
	}

	public function test_sweep_paints_the_link(): void {
		$out = $this->block( array( 'attributionLinkUnderline' => 'sweep' ) );

		$this->assertStringContainsString( '<a href="/offers/">', $out['html'], 'positive control: the link rendered' );
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-quote__attribution a\{text-decoration:none;background-image:linear-gradient\(currentColor,currentColor\);/', $out['css'] );
	}

	public function test_always_sets_the_thickness_and_unset_prints_nothing(): void {
		$always = $this->block( array( 'attributionLinkUnderline' => 'always', 'attributionLinkUnderlineThickness' => '2px' ) );
		$this->assertMatchesRegularExpression( '/\.wp-block-sgs-quote__attribution a\{text-decoration-line:underline;text-decoration-thickness:2px;\}/', $always['css'] );

		$unset = $this->block( array() );
		$this->assertStringNotContainsString( 'text-decoration-line', $unset['css'], 'negative control: nothing printed when unset' );
		$this->assertStringNotContainsString( 'link-sweep', $unset['css'] );
	}
}
