<?php
/**
 * sgs/gallery: the item's hover shadow takes a theme shadow name or a custom value (shape plus colour).
 *
 * Positive controls: custom layers with a colour print the composed value on the hover custom property and mark the gallery;
 * a custom value beats the preset it replaces. Negative controls: a theme shadow name prints the preset variable exactly as
 * before, and nothing set prints nothing.
 *
 * Run with: vendor/bin/phpunit --filter GalleryHoverShadowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class GalleryHoverShadowTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function gallery( array $extra ): array {
		return $this->render_block( 'sgs/gallery', array_merge( array( 'mediaItems' => array( array( 'source' => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/a.jpg', 'width' => 800, 'height' => 600 ) ), 'alt' => 'A' ) ) ), $extra ) );
	}

	public function test_a_custom_shape_and_colour_compose_into_the_hover_shadow(): void {
		$out = $this->gallery( array( 'shadowHover' => '6px 6px 0 0', 'shadowHoverColour' => '#3A2A22' ) );

		$this->assertMatchesRegularExpression( '/--sgs-hover-shadow:6px 6px 0px 0px #3a2a22/i', $out['css'] );
		$this->assertStringContainsString( 'sgs-has-hover', $out['html'] );
	}

	public function test_a_theme_shadow_name_still_resolves_to_its_preset_variable(): void {
		$out = $this->gallery( array( 'shadowHover' => 'lifted', 'shadowHoverColour' => '#ff0000' ) );

		$this->assertStringContainsString( '--sgs-hover-shadow:var(--wp--preset--shadow--lifted)', $out['css'], 'a theme name carries its own colour' );
		$this->assertStringNotContainsString( 'ff0000', $out['css'] );
	}

	public function test_nothing_set_prints_no_hover_shadow(): void {
		$out = $this->gallery( array() );

		$this->assertStringNotContainsString( '--sgs-hover-shadow', $out['css'] );
		$this->assertStringNotContainsString( 'sgs-has-hover', $out['html'] );
	}
}
