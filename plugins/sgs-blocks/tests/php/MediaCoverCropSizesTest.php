<?php
/**
 * A cover-cropped image drawn wider than its box keeps the attachment's own sizes hint
 * (includes/helpers-media.php::sgs_media_cover_crop_widens, ::sgs_media_drop_auto_sizes).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
class MediaCoverCropSizesTest extends TestCase {

	protected function setUp(): void {
		if ( ! function_exists( 'wp_get_attachment_metadata' ) ) {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
			function wp_get_attachment_metadata( $id ) {
				return $GLOBALS['sgs_test_meta'][ $id ] ?? false;
			}
		}
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php';
		$GLOBALS['sgs_test_meta'] = array(
			7 => array( 'width' => 374, 'height' => 214 ),
			8 => array( 'width' => 438, 'height' => 694 ),
		);
	}

	private function ratio_attrs( string $ratio ): array {
		return array( 'objectFit' => 'cover', 'mediaSizing' => 'ratio', 'aspectRatio' => $ratio );
	}

	public function test_a_landscape_photo_in_a_portrait_frame_widens(): void {
		$this->assertTrue( sgs_media_cover_crop_widens( $this->ratio_attrs( '4/5' ), '', 'sgs/media', 7 ) );
	}

	public function test_negative_control_a_portrait_photo_in_a_wider_frame_keeps_auto(): void {
		$this->assertFalse( sgs_media_cover_crop_widens( $this->ratio_attrs( '4/5' ), '', 'sgs/media', 8 ) );
	}

	public function test_negative_control_contain_never_widens(): void {
		$attrs              = $this->ratio_attrs( '4/5' );
		$attrs['objectFit'] = 'contain';
		$this->assertFalse( sgs_media_cover_crop_widens( $attrs, '', 'sgs/media', 7 ) );
	}

	public function test_negative_control_a_box_that_follows_the_image_keeps_auto(): void {
		$this->assertFalse( sgs_media_cover_crop_widens( array( 'objectFit' => 'cover' ), '', 'sgs/media', 7 ) );
	}

	public function test_the_filter_drops_auto_on_a_marked_image_only(): void {
		$marked = '<img src="a.jpg" srcset="a.jpg 374w, a-300.jpg 300w" sizes="auto, (max-width: 374px) 100vw, 374px" data-sgs-cover-crop loading="lazy">';
		$this->assertStringContainsString( 'sizes="(max-width: 374px) 100vw, 374px"', sgs_media_drop_auto_sizes( $marked ) );
		$plain = str_replace( ' data-sgs-cover-crop', '', $marked );
		$this->assertSame( $plain, sgs_media_drop_auto_sizes( $plain ) );
	}
}
