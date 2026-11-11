<?php
/**
 * Tests: sgs/post-grid prints each card's featured image through the shared media renderer (Spec 49 §7.7, §8.3).
 *
 * Runs the real `Post_Grid_REST::render_card()` and `Post_Grid_Media` with the QA harness's WordPress stand-ins
 * (scripts/qa/lib/wp-stubs.php), with an attachment that holds a size.
 *
 * - A card's picture carries the grid's media scope class and no old `sgs-post-grid__img` class.
 * - A REST render, and any page the motion renderer has not armed, is lazy and never high priority, whatever Load priority says.
 * - Load priority "first" takes the lead on a page; the settings the grid saves reach the card through `imageMedia`.
 * - The grid's rules print once (`media_css()`), the frame's ratio defaults to 16 / 9, and a fixed height replaces it.
 * - `decode_settings()` keeps only `image*` names, and refuses an oversized value.
 *
 * Run with:
 *   vendor/bin/phpunit --no-configuration --bootstrap tests/php/bootstrap.php tests/php/PostGridMediaTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Post_Grid_Media;
use SGS\Blocks\Post_Grid_REST;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class PostGridMediaTest extends TestCase {

	protected function setUp(): void {
		$dir = dirname( __DIR__, 2 );
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', $dir . '/' );
		}
		// The attachment holds a size, as a real one does (the stand-ins return none otherwise).
		if ( ! function_exists( 'wp_get_attachment_metadata' ) ) {
			function wp_get_attachment_metadata( $id ) {
				return array( 'width' => 1200, 'height' => 800 );
			}
		}
		if ( ! function_exists( 'wp_get_attachment_url' ) ) {
			function wp_get_attachment_url( $id ) {
				return (string) ( $GLOBALS['sgs_qa_attachments'][ (string) (int) $id ] ?? '' );
			}
		}
		require_once $dir . '/scripts/qa/lib/wp-stubs.php';
		require_once $dir . '/includes/render-helpers.php';
		$GLOBALS['sgs_qa_post']        = (object) array( 'ID' => 5, 'post_type' => 'post', 'thumbnail_id' => 9 );
		$GLOBALS['sgs_qa_attachments'] = array( '9' => 'https://example.test/featured.jpg' );
		require_once $dir . '/includes/class-sgs-media-element.php';
		require_once $dir . '/includes/class-post-grid-rest.php';
	}

	private static function card( array $media = array(), array $extra = array() ): string {
		return Post_Grid_REST::render_card(
			5,
			array_merge(
				array(
					'uid'          => 'sgs-post-grid-abc12345',
					'showCategory' => false,
					'showDate'     => false,
					'showExcerpt'  => false,
					'showReadMore' => false,
					'imageMedia'   => $media,
				),
				$extra
			)
		);
	}

	private static function img( string $card ): string {
		return preg_match( '/<img\b[^>]*>/', $card, $m ) ? $m[0] : '';
	}

	public function test_the_picture_carries_the_grids_media_scope_and_not_the_old_class(): void {
		$img = self::img( self::card() );
		$this->assertNotSame( '', $img );
		$this->assertStringContainsString( 'sgs-post-grid-abc12345-media', $img );
		$this->assertStringContainsString( 'sgs-media-el', $img );
		$this->assertStringNotContainsString( 'sgs-post-grid__img', $img );
	}

	public function test_a_page_the_motion_renderer_has_not_armed_is_lazy_and_never_high_even_for_load_first(): void {
		$img = self::img( self::card( array( 'imageLoading' => 'first' ) ) );
		$this->assertStringContainsString( 'loading="lazy"', $img );
		$this->assertStringNotContainsString( 'fetchpriority="high"', $img );
	}

	public function test_a_card_with_no_featured_image_prints_the_placeholder(): void {
		$GLOBALS['sgs_qa_post'] = (object) array( 'ID' => 5, 'post_type' => 'post', 'thumbnail_id' => 0 );
		$card                   = self::card();
		$this->assertStringNotContainsString( '<img', $card );
		$this->assertStringContainsString( 'sgs-post-grid__image--placeholder', $card );
	}

	public function test_a_decorative_grid_prints_an_empty_alt(): void {
		$this->assertStringContainsString( 'alt=""', self::img( self::card( array( 'imageDecorative' => true ) ) ) );
	}

	public function test_the_grids_rules_print_once_under_the_media_scope(): void {
		$css = Post_Grid_Media::media_css(
			'sgs-post-grid-abc12345',
			array(
				'imageFit'    => array( 'desktop' => 'contain' ),
				'imageRadius' => array( 'desktop' => array( 'topLeft' => '12px', 'topRight' => '12px', 'bottomRight' => '12px', 'bottomLeft' => '12px' ) ),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-post-grid-abc12345-media[^{]*\{[^}]*object-fit:contain/', $css );
		$this->assertSame( 1, substr_count( $css, 'border-top-left-radius:12px' ) );
	}

	public function test_the_frame_ratio_defaults_to_16_9_and_a_fixed_height_replaces_it(): void {
		$default = Post_Grid_Media::frame_css( array(), '.g .sgs-post-grid__image' );
		$this->assertStringContainsString( '--sgs-pg-aspect:16 / 9', $default );
		$set = Post_Grid_Media::frame_css( array( 'imageRatio' => array( 'desktop' => '4 / 3', 'mobile' => '1 / 1' ), 'imageHeight' => array( 'desktop' => '180px' ) ), '.g .sgs-post-grid__image' );
		$this->assertStringContainsString( '--sgs-pg-aspect:4 / 3', $set );
		$this->assertStringContainsString( '--sgs-pg-aspect:1 / 1', $set );
		$this->assertStringContainsString( 'height:180px', $set );
		$this->assertStringContainsString( 'aspect-ratio:auto', $set );
	}

	public function test_settings_reach_the_card_and_decode_keeps_only_image_names(): void {
		$settings = Post_Grid_Media::settings( array( 'imageFit' => array( 'desktop' => 'contain' ), 'imageSource' => array( 'x' => 1 ), 'showImage' => true, 'columns' => array() ), array( 'desktop' => 3 ) );
		$this->assertArrayHasKey( 'imageFit', $settings );
		$this->assertArrayNotHasKey( 'imageSource', $settings );
		$this->assertArrayNotHasKey( 'showImage', $settings );
		$decoded = Post_Grid_Media::decode_settings( (string) json_encode( array( 'imageFit' => array( 'desktop' => 'cover' ), 'imageSource' => array( 'x' => 1 ), 'evil' => '<script>', '_columns' => array( 'desktop' => '3', 'x' => 9 ) ) ) );
		$this->assertSame( array( 'imageFit', '_columns' ), array_keys( $decoded ) );
		$this->assertSame( array( 'desktop' => 3 ), $decoded['_columns'] );
		$this->assertSame( array(), Post_Grid_Media::decode_settings( str_repeat( 'x', Post_Grid_Media::MAX_JSON + 1 ) ) );
		$this->assertSame( array(), Post_Grid_Media::decode_settings( 'not json' ) );
	}
}
