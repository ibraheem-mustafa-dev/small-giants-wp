<?php
/**
 * sgs/label: a link inside the label's text takes linkUnderline through sgs_link_underline_css.
 *
 * Run with: vendor/bin/phpunit --filter LabelLinkUnderlineTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class LabelLinkUnderlineTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function label( array $extra ): array {
		return $this->render_block( 'sgs/label', array_merge( array( 'text' => 'New: <a href="/offers/">see offers</a>' ), $extra ) );
	}

	public function test_sweep_paints_the_link_inside_the_label(): void {
		$out = $this->label( array( 'linkUnderline' => 'sweep' ) );

		$this->assertStringContainsString( '<a href="/offers/">', $out['html'], 'positive control: the link rendered' );
		$this->assertMatchesRegularExpression( '/(\.sgs-lbl-[0-9a-f]{8}\.wp-block-sgs-label) a\{text-decoration:none;background-image:linear-gradient\(currentColor,currentColor\);/', $out['css'] );
	}

	public function test_always_sets_the_thickness_and_unset_prints_nothing(): void {
		$always = $this->label( array( 'linkUnderline' => 'always', 'linkUnderlineThickness' => '2px' ) );
		$this->assertMatchesRegularExpression( '/ a\{text-decoration-line:underline;text-decoration-thickness:2px;\}/', $always['css'] );

		$unset = $this->label( array() );
		$this->assertStringNotContainsString( 'text-decoration-line', $unset['css'], 'negative control: nothing printed when unset' );
		$this->assertStringNotContainsString( 'link-sweep', $unset['css'] );
	}
}
