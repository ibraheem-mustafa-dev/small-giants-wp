<?php
/**
 * sgs/hero `splitMediaAlign`: where a narrow split image sits in its column, per device.
 *
 * Run with: vendor/bin/phpunit --filter HeroSplitMediaAlignTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class HeroSplitMediaAlignTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_unset_prints_no_media_column_alignment(): void {
		$out = $this->render_block( 'sgs/hero', array( 'variant' => 'split', 'headline' => 'Hi' ) );
		$this->assertStringNotContainsString( 'justify-content:flex-start', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/sgs-hero__media\{display:flex/', $out['css'] );
	}

	public function test_centre_on_mobile_prints_a_mobile_media_rule(): void {
		$out = $this->render_block(
			'sgs/hero',
			array( 'variant' => 'split', 'headline' => 'Hi', 'splitMediaAlign' => array( 'mobile' => 'center' ) )
		);
		$this->assertMatchesRegularExpression( '/sgs-hero__media\{display:flex\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media \(max-width:767px\)\{[^{]*sgs-hero__media\{justify-content:center;?\}\}/', $out['css'] );
	}
}
