<?php
/**
 * A cover-cropped image drawn wider than its box gets a concrete `sizes`, or keeps the attachment's own sizes hint
 * (includes/media/cover-crop.php::sgs_media_cover_crop_plan, ::sgs_media_drop_auto_sizes).
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

	private function all( $value ): array {
		return array( 'desktop' => $value, 'tablet' => $value, 'mobile' => $value );
	}

	private function ratio_attrs( string $ratio ): array {
		return array( 'fit' => $this->all( 'cover' ), 'ratio' => $this->all( $ratio ) );
	}

	private function plan( array $attrs, int $id, string $prefix = '' ): array {
		return sgs_media_cover_crop_plan( $attrs, array( 'prefix' => $prefix ), $id );
	}

	public function test_a_landscape_photo_in_a_portrait_frame_widens(): void {
		$this->assertTrue( $this->plan( $this->ratio_attrs( '4 / 5' ), 7 )['widens'] );
	}

	public function test_negative_control_a_portrait_photo_in_a_wider_frame_keeps_auto(): void {
		$this->assertFalse( $this->plan( $this->ratio_attrs( '4 / 5' ), 8 )['widens'] );
	}

	public function test_negative_control_contain_never_widens(): void {
		$attrs        = $this->ratio_attrs( '4 / 5' );
		$attrs['fit'] = $this->all( 'contain' );
		$this->assertSame( array( 'widens' => false, 'sizes' => '' ), $this->plan( $attrs, 7 ) );
	}

	public function test_negative_control_a_box_that_follows_the_image_keeps_auto(): void {
		$this->assertFalse( $this->plan( array( 'fit' => $this->all( 'cover' ) ), 8 )['widens'] );
		$this->assertFalse( $this->plan( $this->ratio_attrs( 'natural' ), 7 )['widens'] );
	}

	public function test_an_unset_fit_is_cover_as_the_base_css_draws_it(): void {
		$this->assertTrue( $this->plan( array( 'ratio' => $this->all( '4 / 5' ) ), 7 )['widens'] );
	}

	public function test_a_device_whose_fit_is_not_cover_does_not_widen(): void {
		$attrs        = $this->ratio_attrs( '1 / 1' );
		$attrs['fit'] = array( 'desktop' => 'cover', 'tablet' => 'cover', 'mobile' => 'contain' );
		$attrs['maxWidth'] = array( 'desktop' => '400px', 'tablet' => '300px', 'mobile' => '200px' );
		// Mobile never widens, the others do: one sizes list cannot mix, so the attachment hint stays.
		$this->assertSame( array( 'widens' => true, 'sizes' => '' ), $this->plan( $attrs, 10 ) );
	}

	public function test_the_filter_drops_auto_on_a_marked_image_only(): void {
		$marked = '<img src="a.jpg" srcset="a.jpg 374w, a-300.jpg 300w" sizes="auto, (max-width: 374px) 100vw, 374px" data-sgs-cover-crop loading="lazy">';
		$this->assertStringContainsString( 'sizes="(max-width: 374px) 100vw, 374px"', sgs_media_drop_auto_sizes( $marked ) );
		$plain = str_replace( ' data-sgs-cover-crop', '', $marked );
		$this->assertSame( $plain, sgs_media_drop_auto_sizes( $plain ) );
	}

	public function test_the_renderer_marks_a_widening_crop_with_an_unknown_width_and_drops_its_own_auto(): void {
		// render-slot.php passes cover_crop when the plan widens with no concrete sizes (a fill box, a landscape file).
		$img = sgs_media_img_tag(
			array( 'id' => 0, 'url' => 'https://example.test/a.jpg', 'width' => 1600, 'height' => 1067 ),
			array( 'sizes' => '100vw', 'cover_crop' => true )
		);
		$this->assertStringContainsString( 'data-sgs-cover-crop', $img );
		$this->assertStringContainsString( 'sizes="100vw"', sgs_media_drop_auto_sizes( str_replace( 'sizes="100vw"', 'sizes="auto, 100vw"', $img ) ) );
		$this->assertStringNotContainsString( 'data-sgs-cover-crop', sgs_media_img_tag( array( 'id' => 0, 'url' => 'https://example.test/a.jpg', 'width' => 1, 'height' => 1 ), array( 'sizes' => '100vw' ) ) );
	}

	public function test_a_known_ratio_and_width_give_a_concrete_sizes_per_device(): void {
		$attrs             = $this->ratio_attrs( '1/1' );
		$attrs['maxWidth'] = array( 'desktop' => '400px', 'tablet' => '300px', 'mobile' => '200px' );
		// Image 10 is 3:2, so a square box draws it 1.5x wider than the box.
		$this->assertSame(
			'(max-width: 767px) 300px, (max-width: 1023px) 450px, 600px',
			$this->plan( $attrs, 10 )['sizes']
		);
	}

	public function test_a_ratio_set_per_device_is_honoured(): void {
		$attrs          = $this->ratio_attrs( '1 / 1' );
		$attrs['ratio'] = array( 'desktop' => '1 / 1', 'tablet' => '1 / 1', 'mobile' => '3 / 1' );
		$attrs['width'] = $this->all( '300px' );
		// Image 10 is 3:2: 450px in a square box, but a 3:1 phone box is wider than the image, so it does not widen there.
		$this->assertSame( array( 'widens' => true, 'sizes' => '' ), $this->plan( $attrs, 10 ) );
		$attrs['ratio']['mobile'] = '2 / 3';
		// 3:2 image in a 2:3 box: factor 2.25, 675px.
		$this->assertSame( '(max-width: 767px) 675px, (max-width: 1023px) 450px, 450px', $this->plan( $attrs, 10 )['sizes'] );
	}

	public function test_a_px_width_wins_over_the_max_width(): void {
		$attrs             = $this->ratio_attrs( '1 / 1' );
		$attrs['width']    = $this->all( '200px' );
		$attrs['maxWidth'] = $this->all( '500px' );
		$this->assertSame( '(max-width: 767px) 300px, (max-width: 1023px) 300px, 300px', $this->plan( $attrs, 10 )['sizes'] );
	}

	public function test_the_hero_split_prefix_is_read(): void {
		$attrs = array(
			'splitFit'      => $this->all( 'cover' ),
			'splitRatio'    => $this->all( '1 / 1' ),
			'splitMaxWidth' => $this->all( '400px' ),
		);
		$this->assertSame( '(max-width: 767px) 600px, (max-width: 1023px) 600px, 600px', $this->plan( $attrs, 10, 'split' )['sizes'] );
		// The same attributes read through the unprefixed slot find nothing and stay on auto for a portrait image.
		$this->assertFalse( $this->plan( $attrs, 8 )['widens'] );
		$contain = array_merge( $attrs, array( 'splitFit' => $this->all( 'contain' ) ) );
		$this->assertFalse( $this->plan( $contain, 10, 'split' )['widens'] );
	}

	public function test_a_fill_box_of_a_portrait_image_keeps_auto(): void {
		$attrs = array( 'fit' => $this->all( 'cover' ), 'height' => $this->all( 'fill' ) );
		$this->assertSame( array( 'widens' => false, 'sizes' => '' ), $this->plan( $attrs, 9 ) );
	}

	public function test_a_fill_box_of_a_landscape_image_keeps_the_attachment_hint(): void {
		$attrs = array( 'fit' => $this->all( 'cover' ), 'height' => $this->all( 'fill' ) );
		$this->assertSame( array( 'widens' => true, 'sizes' => '' ), $this->plan( $attrs, 10 ) );
	}

	public function test_a_landscape_image_with_an_automatic_height_never_widens(): void {
		// No Ratio and no Height: the box takes the image's own shape, so `auto` stays.
		$this->assertSame( array( 'widens' => false, 'sizes' => '' ), $this->plan( array( 'fit' => $this->all( 'cover' ) ), 10 ) );
	}

	public function test_a_px_height_with_an_automatic_width_needs_height_times_the_image_ratio(): void {
		// Image 10 is 1600x1067: a 48px-high box needs 72px of file whether the width follows the image or a narrow
		// container crops its sides (a 159x187 card showing a 1.74:1 photo needs the photo at 187px high, not 159 wide).
		$expected = '(max-width: 767px) 72px, (max-width: 1023px) 72px, 72px';
		$this->assertSame( $expected, $this->plan( array( 'height' => $this->all( '48px' ) ), 10 )['sizes'] );
		$this->assertSame( array( 'widens' => true, 'sizes' => '' ), $this->plan( array( 'height' => $this->all( '48px' ), 'width' => $this->all( '100%' ) ), 10 ), 'a fill width leaves the box shape unknown' );
	}

	public function test_a_width_and_height_box_derives_its_ratio(): void {
		$attrs = array(
			'maxWidth' => array( 'desktop' => '200px' ),
			'height'   => array( 'desktop' => '400px' ),
		);
		// Box 1:2; image 10 is 3:2, factor 3 on every device (inherited): 600px.
		$this->assertSame(
			'(max-width: 767px) 600px, (max-width: 1023px) 600px, 600px',
			$this->plan( $attrs, 10 )['sizes']
		);
	}

	public function test_a_non_px_width_on_a_device_is_unknown_and_stops_inheritance(): void {
		$attrs             = $this->ratio_attrs( '1/1' );
		$attrs['maxWidth'] = array( 'desktop' => '400px', 'mobile' => '100%' );
		// Image 10 is 3:2 so the crop widens; the phone's drawn width is unknown, so no concrete sizes list is printed.
		$this->assertSame( array( 'widens' => true, 'sizes' => '' ), $this->plan( $attrs, 10 ) );
	}

	private function boxes( array $model ): array {
		return $this->all( $model );
	}

	public function test_a_box_with_no_px_width_uses_the_layout_model_times_the_crop_factor(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/layout-width.php';
		$plan = sgs_media_cover_crop_plan(
			$this->ratio_attrs( '1/1' ),
			array( 'prefix' => '' ),
			10,
			$this->boxes( array( 'vw' => 1.0, 'off' => -40.0, 'cap' => 1200.0 ) )
		);
		// Image 10 is 3:2 in a square box: factor 1.4995 (1600 / 1067), so the drawn width is 1.4995 x min(1200, 100vw - 40).
		$this->assertTrue( $plan['widens'] );
		$this->assertSame( '', $plan['sizes'] );
		$this->assertSame( 'min(1799.44px, calc(149.95vw - 59.98px))', $plan['by_device']['desktop'] );
	}

	public function test_a_device_that_does_not_widen_prints_its_box_model_beside_a_widening_one(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/layout-width.php';
		$attrs          = $this->ratio_attrs( '1/1' );
		$attrs['ratio'] = array( 'desktop' => '3/2', 'tablet' => '3/2', 'mobile' => '1/1' );
		$plan           = sgs_media_cover_crop_plan( $attrs, array( 'prefix' => '' ), 10, $this->boxes( array( 'vw' => 0.5, 'off' => 0.0, 'cap' => null ) ) );
		$this->assertSame( '50vw', $plan['by_device']['desktop'] );
		$this->assertSame( '74.98vw', $plan['by_device']['mobile'] );
	}

	public function test_a_fill_box_stays_unknown_even_with_a_layout_model(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/layout-width.php';
		$attrs           = array( 'fit' => $this->all( 'cover' ), 'height' => $this->all( '100%' ) );
		$plan            = sgs_media_cover_crop_plan( $attrs, array( 'prefix' => '' ), 10, $this->boxes( array( 'vw' => 1.0, 'off' => 0.0, 'cap' => null ) ) );
		$this->assertSame( array( 'widens' => true, 'sizes' => '' ), $plan );
	}

	public function test_an_explicit_auto_width_with_a_px_height_prints_the_larger_of_the_image_figure_and_the_container(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/layout-width.php';
		$attrs = array( 'height' => $this->all( '262px' ), 'width' => $this->all( 'auto' ) );
		$box   = array( 'vw' => 1.0, 'off' => 0.0, 'cap' => 244.0 );
		$plan  = sgs_media_cover_crop_plan( $attrs, array( 'prefix' => '' ), 10, $this->boxes( $box ) );
		// Image 10 is 1600x1067: 262px high is 393px wide; the container (244px at most) is narrower, so 393 is the larger.
		$this->assertSame( 'max(393px, min(244px, 100vw))', $plan['by_device']['desktop'] );
		// With no layout model the width is unknown: the attachment's own hint, with `auto` removed.
		$this->assertSame( array( 'widens' => true, 'sizes' => '' ), $this->plan( $attrs, 10 ) );
	}
}
