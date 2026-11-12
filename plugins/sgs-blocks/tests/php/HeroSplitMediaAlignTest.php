<?php
/**
 * sgs/hero `splitAlignment`: where a narrow split image sits in its column, per device (Spec 49 `layout` atom).
 *
 * Run with: vendor/bin/phpunit --no-configuration --bootstrap tests/php/bootstrap.php tests/php/HeroSplitMediaAlignTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class HeroSplitMediaAlignTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @param array<string,mixed> $extra Extra attributes.
	 * @return array{html:string,css:string}
	 */
	private function split_hero( array $extra ): array {
		return $this->render_block(
			'sgs/hero',
			array_merge(
				array(
					'variant'     => 'split',
					'splitSource' => array(
						'desktop' => array(
							'kind'   => 'image',
							'url'    => 'https://example.test/s.jpg',
							'width'  => 1200,
							'height' => 800,
						),
					),
				),
				$extra
			),
			array(),
			array(),
			'<p>Hi</p>',
			true
		);
	}

	public function test_unset_prints_no_media_alignment(): void {
		$out = $this->split_hero( array() );
		$this->assertStringContainsString( 'sgs-hero__split-media', $out['html'], 'positive control: the split media rendered' );
		$this->assertStringNotContainsString( 'margin-inline-start:auto', $out['css'] );
	}

	public function test_centre_on_mobile_prints_a_mobile_rule_on_the_slot_scope(): void {
		$out = $this->split_hero( array( 'splitAlignment' => array( 'mobile' => 'center' ) ) );
		$this->assertMatchesRegularExpression( '/@media ?\(max-width:767px\)\{\.sgs-hero-[0-9a-f]+-split\{margin-inline-end:auto;margin-inline-start:auto;?\}\}/', $out['css'] );
	}
}
