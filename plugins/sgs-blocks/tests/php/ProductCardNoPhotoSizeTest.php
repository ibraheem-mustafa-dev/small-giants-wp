<?php
/**
 * Tests: the "photo to come" box takes the photo slot's Height or Ratio
 * (`includes/product-card-media.php::sgs_pcm_no_photo_css`), so a card with no photo is as tall as one with a photo.
 *
 * Run with:
 *   vendor/bin/phpunit --filter ProductCardNoPhotoSizeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class ProductCardNoPhotoSizeTest extends TestCase {

	private const SEL = '.c.product-card--image-sized .product-card__no-image';

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/product-card-media.php';
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-media-element.php';
		require_once dirname( __DIR__, 2 ) . '/includes/media/media-values.php';
		require_once dirname( __DIR__, 2 ) . '/includes/media/render-sources.php';
	}

	public function test_a_ratio_sizes_the_box_like_the_photo_on_every_device(): void {
		$css = sgs_pcm_no_photo_css( array( 'imageRatio' => '1 / 1' ), 'image', self::SEL );
		$this->assertSame( self::SEL . '{aspect-ratio:1 / 1;height:auto;}', $css, 'one rule: the later devices inherit it' );
	}

	public function test_a_px_height_wins_over_the_ratio(): void {
		$css = sgs_pcm_no_photo_css( array( 'imageRatio' => '1 / 1', 'imageHeight' => '300px' ), 'image', self::SEL );
		$this->assertSame( self::SEL . '{height:300px;aspect-ratio:auto;}', $css );
	}

	public function test_each_device_follows_its_own_ratio(): void {
		$css = sgs_pcm_no_photo_css( array( 'imageRatio' => array( 'desktop' => '4 / 3', 'mobile' => '1 / 1' ) ), 'image', self::SEL );
		$this->assertStringContainsString( self::SEL . '{aspect-ratio:4 / 3;height:auto;}', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{' . preg_quote( self::SEL, '/' ) . '\{aspect-ratio:1 \/ 1;height:auto;\}\}/', $css );
	}

	public function test_a_card_with_neither_setting_prints_nothing_so_it_keeps_its_fixed_height(): void {
		$this->assertSame( '', sgs_pcm_no_photo_css( array(), 'image', self::SEL ) );
		$this->assertSame( '', sgs_pcm_no_photo_css( array( 'imageHeight' => 'fill', 'imageRatio' => 'natural' ), 'image', self::SEL ) );
	}

	public function test_a_device_that_drops_the_setting_returns_to_the_fixed_height(): void {
		$css = sgs_pcm_no_photo_css( array( 'imageHeight' => array( 'desktop' => '300px', 'mobile' => 'auto' ) ), 'image', self::SEL );
		$this->assertStringContainsString( self::SEL . '{height:300px;aspect-ratio:auto;}', $css );
		$this->assertStringContainsString( 'aspect-ratio:auto;height:var(--sgs-product-card-image-height,220px);', $css );
	}
}
