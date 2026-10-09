<?php
/**
 * sgs/timeline: a link in an entry's description takes descriptionLinkUnderline through sgs_link_underline_css.
 *
 * Run with: vendor/bin/phpunit --filter TimelineLinkUnderlineTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TimelineLinkUnderlineTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function block( array $extra ): array {
		return $this->render_block( 'sgs/timeline', array_merge( array( 'entries' => array( array( 'date' => '2020', 'title' => 'Opened', 'description' => 'We <a href="/offers/">see offers</a>', 'icon' => '', 'image' => 0 ) ) ), $extra ) );
	}

	public function test_sweep_paints_the_link(): void {
		$out = $this->block( array( 'descriptionLinkUnderline' => 'sweep' ) );

		$this->assertStringContainsString( '<a href="/offers/">', $out['html'], 'positive control: the link rendered' );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__description a\{text-decoration:none;background-image:linear-gradient\(currentColor,currentColor\);/', $out['css'] );
	}

	public function test_sweep_is_skipped_when_the_link_colour_is_a_gradient(): void {
		$out = $this->block( array( 'descriptionLinkUnderline' => 'sweep', 'descriptionLinkColourGradient' => 'linear-gradient(90deg,#f00,#00f)' ) );

		$this->assertStringContainsString( '<a href="/offers/">', $out['html'], 'positive control: the link rendered' );
		$this->assertStringNotContainsString( 'background-size:0', $out['css'], 'a gradient link colour owns the background, so no sweep line' );
	}

	public function test_always_sets_the_thickness_and_unset_prints_nothing(): void {
		$always = $this->block( array( 'descriptionLinkUnderline' => 'always', 'descriptionLinkUnderlineThickness' => '2px' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__description a\{text-decoration-line:underline;text-decoration-thickness:2px;\}/', $always['css'] );

		$none = $this->block( array( 'descriptionLinkUnderline' => 'none' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__description a\{text-decoration:none;\}/', $none['css'] );

		$unset = $this->block( array() );
		$this->assertStringNotContainsString( 'text-decoration-line', $unset['css'], 'negative control: nothing printed when unset' );
		$this->assertStringNotContainsString( 'link-sweep', $unset['css'] );
	}
}
