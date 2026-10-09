<?php
/**
 * sgs/product-card: a link in the description takes descLinkUnderline through sgs_link_underline_css.
 *
 * Run with: vendor/bin/phpunit --filter ProductCardLinkUnderlineTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ProductCardLinkUnderlineTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function block( array $extra ): array {
		return $this->render_block( 'sgs/product-card', array_merge( array( 'title' => 'Frame', 'description' => 'Made <a href="/offers/">see offers</a>' ), $extra ) );
	}

	public function test_sweep_paints_the_link(): void {
		$out = $this->block( array( 'descLinkUnderline' => 'sweep' ) );

		$this->assertStringContainsString( '<a href="/offers/">', $out['html'], 'positive control: the link rendered' );
		$this->assertMatchesRegularExpression( '/\.sgs-product-card__description a\{text-decoration:none;background-image:linear-gradient\(currentColor,currentColor\);/', $out['css'] );
	}

	public function test_always_sets_the_thickness_and_unset_prints_nothing(): void {
		$always = $this->block( array( 'descLinkUnderline' => 'always', 'descLinkUnderlineThickness' => '2px' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-product-card__description a\{text-decoration-line:underline;text-decoration-thickness:2px;\}/', $always['css'] );

		$unset = $this->block( array() );
		$this->assertStringNotContainsString( 'text-decoration-line', $unset['css'], 'negative control: nothing printed when unset' );
		$this->assertStringNotContainsString( 'link-sweep', $unset['css'] );
	}
}
