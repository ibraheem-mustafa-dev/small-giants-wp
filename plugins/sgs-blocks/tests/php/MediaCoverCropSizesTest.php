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
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-breakpoints.php';
		$GLOBALS['sgs_test_meta'] = array(
			7 => array( 'width' => 374, 'height' => 214 ),
			8 => array( 'width' => 438, 'height' => 694 ),
			9 => array( 'width' => 1600, 'height' => 1822 ),
			10 => array( 'width' => 1600, 'height' => 1067 ),
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

	public function test_a_known_ratio_and_width_give_a_concrete_sizes_per_device(): void {
		$attrs = $this->ratio_attrs( '1/1' );
		$attrs['maxWidth'] = array( 'desktop' => '400px', 'tablet' => '300px', 'mobile' => '200px' );
		// Image 10 is 3:2, so a square box draws it 1.5x wider than the box.
		$this->assertSame(
			'(max-width: 767px) 300px, (max-width: 1023px) 450px, 600px',
			sgs_media_cover_crop_sizes( $attrs, '', 'sgs/media', 10 )
		);
	}

	public function test_a_fill_box_of_a_portrait_image_keeps_auto(): void {
		$attrs = array( 'objectFit' => 'cover', 'mediaSizing' => 'fill' );
		$this->assertFalse( sgs_media_cover_crop_widens( $attrs, '', 'sgs/media', 9 ) );
		$this->assertSame( '', sgs_media_cover_crop_sizes( $attrs, '', 'sgs/media', 9 ) );
	}

	public function test_a_fill_box_of_a_landscape_image_without_a_hint_keeps_the_attachment_hint(): void {
		$attrs = array( 'objectFit' => 'cover', 'mediaSizing' => 'fill' );
		$this->assertTrue( sgs_media_cover_crop_widens( $attrs, '', 'sgs/media', 10 ) );
		$this->assertSame( '', sgs_media_cover_crop_sizes( $attrs, '', 'sgs/media', 10 ) );
	}

	public function test_a_display_width_hint_prints_concrete_sizes_and_inherits_downwards(): void {
		$attrs = array(
			'objectFit'    => 'cover',
			'mediaSizing'  => 'fill',
			'displayWidth' => array( 'desktop' => 205, 'mobile' => 165 ),
		);
		$this->assertTrue( sgs_media_cover_crop_widens( $attrs, '', 'sgs/media', 10 ) );
		$this->assertSame(
			'(max-width: 767px) 165px, (max-width: 1023px) 205px, 205px',
			sgs_media_cover_crop_sizes( $attrs, '', 'sgs/media', 10 )
		);
	}

	public function test_negative_control_contain_ignores_the_display_width_hint(): void {
		$attrs = array( 'objectFit' => 'contain', 'displayWidth' => array( 'desktop' => 205 ) );
		$this->assertSame( '', sgs_media_cover_crop_sizes( $attrs, '', 'sgs/media', 10 ) );
	}

	public function test_a_width_and_height_box_derives_its_ratio(): void {
		$attrs = array(
			'objectFit'   => 'cover',
			'mediaSizing' => 'height',
			'maxWidth'    => array( 'desktop' => '200px' ),
			'height'      => array( 'desktop' => '400px' ),
		);
		// Box 1:2; image 10 is 3:2, factor 3 on every device (inherited): 600px.
		$this->assertSame(
			'(max-width: 767px) 600px, (max-width: 1023px) 600px, 600px',
			sgs_media_cover_crop_sizes( $attrs, '', 'sgs/media', 10 )
		);
	}

	public function test_a_non_px_width_on_a_device_is_unknown_and_stops_inheritance(): void {
		$attrs = $this->ratio_attrs( '1/1' );
		$attrs['maxWidth'] = array( 'desktop' => '400px', 'mobile' => '100%' );
		// Image 10 is 3:2 so the crop widens; the phone's drawn width is unknown, so no concrete sizes list is printed.
		$this->assertTrue( sgs_media_cover_crop_widens( $attrs, '', 'sgs/media', 10 ) );
		$this->assertSame( '', sgs_media_cover_crop_sizes( $attrs, '', 'sgs/media', 10 ) );
	}
}
