<?php
/**
 * sgs/hero (split variant): the split media's box shadow paints through the shared `shadow`
 * media atom onto the framed media element (`.sgs-media-el`, the element carrying the split
 * media's border and radius).
 *
 * Run with: vendor/bin/phpunit --filter HeroSplitMediaShadowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class HeroSplitMediaShadowTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function split_hero( array $extra ): array {
		return $this->render_block(
			'sgs/hero',
			array_merge(
				array(
					'variant'            => 'split',
					'splitMediaImageId'  => 0,
					'splitMediaImageUrl' => 'https://example.com/hero.jpg',
				),
				$extra
			)
		);
	}

	public function test_custom_shadow_paints_on_the_split_media_scope(): void {
		$out = $this->split_hero(
			array(
				'splitMediaBoxShadow'       => '0 34px 60px -30px',
				'splitMediaBoxShadowColour' => 'rgba(44,62,80,.7)',
			)
		);

		$this->assertStringContainsString( 'sgs-media-el', $out['html'], 'positive control: the split media element rendered' );
		$this->assertMatchesRegularExpression(
			'/\.sgs-hero-[0-9a-f]+--splitmedia\{[^}]*--sgs-media-box-shadow:0px 34px 60px -30px #2C3E50B3[;}]/',
			$out['css']
		);
	}

	public function test_no_lift_without_a_split_media_lift_switch(): void {
		$out = $this->split_hero(
			array(
				'splitMediaBoxShadow'       => '0 34px 60px -30px',
				'splitMediaBoxShadowColour' => 'rgba(44,62,80,.7)',
			)
		);

		$this->assertStringNotContainsString( '--sgs-media-box-shadow-hover', $out['css'], 'the hero root lift switch does not reach the split media' );
	}

	public function test_hover_colour_fills_the_hover_property(): void {
		$out = $this->split_hero(
			array(
				'splitMediaBoxShadow'            => '0 34px 60px -30px',
				'splitMediaBoxShadowColour'      => 'rgba(44,62,80,.7)',
				'splitMediaBoxShadowColourHover' => 'rgba(44,62,80,.9)',
			)
		);

		$this->assertStringContainsString( '--sgs-media-box-shadow-hover:0px 34px 60px -30px #2C3E50E6', $out['css'] );
	}

	public function test_unset_shadow_prints_nothing(): void {
		$out = $this->split_hero( array() );

		$this->assertStringContainsString( 'sgs-media-el', $out['html'], 'positive control: the split media element rendered' );
		$this->assertStringNotContainsString( '--sgs-media-box-shadow', $out['css'], 'negative control: nothing printed when unset' );
	}
}
