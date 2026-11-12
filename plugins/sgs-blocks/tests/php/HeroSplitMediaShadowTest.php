<?php
/**
 * sgs/hero (split variant): the split media's box shadow paints through the shared `shadow`
 * media atom onto the slot's element (scope class `{uid}-split`, the element carrying the split
 * media's border and radius).
 *
 * Run with: vendor/bin/phpunit --no-configuration --bootstrap tests/php/bootstrap.php tests/php/HeroSplitMediaShadowTest.php
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
					'variant'     => 'split',
					'splitSource' => array(
						'desktop' => array(
							'kind'   => 'image',
							'url'    => 'https://example.com/hero.jpg',
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

	public function test_custom_shadow_paints_on_the_split_media_scope(): void {
		$out = $this->split_hero(
			array(
				'splitBoxShadow'       => '0 34px 60px -30px',
				'splitBoxShadowColour' => 'rgba(44,62,80,.7)',
			)
		);

		$this->assertStringContainsString( 'sgs-media-el', $out['html'], 'positive control: the split media element rendered' );
		$this->assertMatchesRegularExpression(
			'/\.sgs-hero-[0-9a-f]+-split\{.*box-shadow:0px 34px 60px -30px #2C3E50B3;?\}/',
			$out['css']
		);
	}

	public function test_no_lift_without_a_split_media_lift_switch(): void {
		$out = $this->split_hero(
			array(
				'splitBoxShadow'       => '0 34px 60px -30px',
				'splitBoxShadowColour' => 'rgba(44,62,80,.7)',
			)
		);

		$this->assertStringNotContainsString( '-split:hover', $out['css'], 'the hero root lift switch does not reach the split media' );
	}

	public function test_hover_colour_fills_the_hover_property(): void {
		$out = $this->split_hero(
			array(
				'splitBoxShadow'            => '0 34px 60px -30px',
				'splitBoxShadowColour'      => 'rgba(44,62,80,.7)',
				'splitBoxShadowColourHover' => 'rgba(44,62,80,.9)',
			)
		);

		$this->assertMatchesRegularExpression( '/-split:hover\{[^}]*box-shadow:0px 34px 60px -30px #2C3E50E6/', $out['css'] );
	}

	public function test_unset_shadow_prints_nothing(): void {
		$out = $this->split_hero( array() );

		$this->assertStringContainsString( 'sgs-media-el', $out['html'], 'positive control: the split media element rendered' );
		$this->assertStringNotContainsString( 'box-shadow', $out['css'], 'negative control: nothing printed when unset' );
	}
}
