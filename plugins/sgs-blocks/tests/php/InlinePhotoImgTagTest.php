<?php
/**
 * An inline photo (the sgs-inline-photo rich-text format) loads lazily with sizes="auto, …" and no high fetch priority.
 *
 * Run with: vendor/bin/phpunit --filter InlinePhotoImgTagTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * Inline photo image tag filter.
 */
final class InlinePhotoImgTagTest extends TestCase {

	/**
	 * Load the helpers.
	 */
	protected function setUp(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/helpers-inline-formats.php';
	}

	/**
	 * Core's eager, high-priority markup becomes lazy with auto sizes.
	 */
	public function test_an_inline_photo_becomes_lazy_with_auto_sizes(): void {
		$out = sgs_inline_photo_img_tag( '<img fetchpriority="high" decoding="async" class="sgs-inline-photo wp-image-23" src="a.jpg" srcset="a.jpg 608w, b.avif 300w" sizes="(max-width: 608px) 100vw, 608px" />' );

		$this->assertStringContainsString( 'loading="lazy"', $out );
		$this->assertStringContainsString( 'sizes="auto, (max-width: 608px) 100vw, 608px"', $out );
		$this->assertStringNotContainsString( 'fetchpriority', $out );
	}

	/**
	 * A tag with sizes already starting with auto is not given a second auto.
	 */
	public function test_auto_is_added_once(): void {
		$out = sgs_inline_photo_img_tag( '<img loading="lazy" class="sgs-inline-photo" src="a.jpg" sizes="auto, 100vw" />' );

		$this->assertSame( 1, substr_count( $out, 'auto' ) );
	}

	/**
	 * Negative control: any other image is left as it is.
	 */
	public function test_negative_control_another_image_is_untouched(): void {
		$tag = '<img class="other" loading="eager" fetchpriority="high" sizes="100vw" />';

		$this->assertSame( $tag, sgs_inline_photo_img_tag( $tag ) );
	}
}
