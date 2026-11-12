<?php
/**
 * Tests: sgs/gallery prints each item's picture through the shared media renderer (Spec 49 §8.3, Appendix A).
 *
 * - One group per item, scoped `{uid}-media-i{index}` and `{uid}-media`; no old `sgs-gallery__img` class.
 * - The block's fit applies to every item; an item's own fit and focal point override it under its own scope.
 * - The block-level rules print once (with the first item that has a picture), not once per item.
 * - A decorative item prints an empty alt; a video item prints a video.
 *
 * Run with:
 *   vendor/bin/phpunit --filter GalleryItemMediaTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class GalleryItemMediaTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @param array<string,mixed> $item Item fields laid over a plain photo item.
	 * @param string              $key  The item's stable key.
	 * @return array<string,mixed>
	 */
	private function item( array $item, string $key ): array {
		return array_merge(
			array(
				'_key'   => $key,
				'alt'    => "Photo $key",
				'source' => array(
					'desktop' => array(
						'kind'   => 'image',
						'url'    => "https://example.com/$key.jpg",
						'width'  => 800,
						'height' => 600,
					),
				),
			),
			$item
		);
	}

	/**
	 * @param array<int,array<string,mixed>> $items Items.
	 * @param array<string,mixed>            $extra Block attributes.
	 * @return array{html:string,css:string}
	 */
	private function render( array $items, array $extra = array() ): array {
		return $this->render_block(
			'sgs/gallery',
			array_merge(
				array(
					'mediaItems' => $items,
					'layout'     => array(),
					'columns'    => array( 'desktop' => 3, 'tablet' => 2, 'mobile' => 1 ),
					'itemRatio'  => array( 'desktop' => '4 / 3' ),
				),
				$extra
			),
			array(),
			array(),
			'',
			true
		);
	}

	public function test_each_item_is_one_group_and_the_old_image_class_is_gone(): void {
		$out = $this->render( array( $this->item( array(), 'a' ), $this->item( array(), 'b' ) ) );
		$this->assertSame( 2, substr_count( $out['html'], 'sgs-media-group' ) );
		$this->assertMatchesRegularExpression( '/sgs-gallery-[0-9a-f]{8}-media-i0 sgs-gallery-[0-9a-f]{8}-media/', $out['html'] );
		$this->assertMatchesRegularExpression( '/-media-i1 /', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-gallery__img"', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-gallery__img ', $out['html'] );
		$this->assertStringNotContainsString( ' style="', $out['html'] );
	}

	public function test_item_fit_and_focal_override_the_block_fit_under_the_items_own_scope(): void {
		$out = $this->render(
			array(
				$this->item( array(), 'a' ),
				$this->item(
					array(
						'fit'   => array( 'desktop' => 'contain' ),
						'focal' => array( 'desktop' => array( 'x' => 0.2, 'y' => 0.8 ) ),
					),
					'b'
				),
			),
			array( 'itemFit' => array( 'desktop' => 'cover' ) )
		);
		$this->assertMatchesRegularExpression( '/\.sgs-gallery-[0-9a-f]{8}-media-i0 \.sgs-media-el\{[^}]*object-fit:cover/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-gallery-[0-9a-f]{8}-media-i1 \.sgs-media-el\{[^}]*object-fit:contain/', $out['css'] );
		$this->assertMatchesRegularExpression( '/-media-i1 \.sgs-media-el\{[^}]*object-position:20% 80%/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/-media-i0 \.sgs-media-el\{[^}]*object-position/', $out['css'] );
	}

	public function test_block_level_rules_print_once(): void {
		$out = $this->render(
			array( $this->item( array(), 'a' ), $this->item( array(), 'b' ), $this->item( array(), 'c' ) ),
			array( 'itemRadius' => array( 'desktop' => array( 'topLeft' => '12px', 'topRight' => '12px', 'bottomRight' => '12px', 'bottomLeft' => '12px' ) ) )
		);
		$this->assertSame( 1, substr_count( $out['css'], 'border-top-left-radius:12px' ), 'the radius rule is printed once, under the block scope' );
		$this->assertSame( 1, preg_match_all( '/aspect-ratio:4 \/ 3/', $out['css'] ) >= 1 ? 1 : 0 );
	}

	public function test_block_rules_survive_an_empty_first_item(): void {
		$out = $this->render(
			array( array( '_key' => 'empty', 'alt' => 'none' ), $this->item( array(), 'b' ) ),
			array( 'itemRadius' => array( 'desktop' => array( 'topLeft' => '9px', 'topRight' => '9px', 'bottomRight' => '9px', 'bottomLeft' => '9px' ) ) )
		);
		$this->assertSame( 1, substr_count( $out['css'], 'border-top-left-radius:9px' ) );
	}

	public function test_decorative_prints_an_empty_alt_and_a_video_prints_a_video(): void {
		$video = $this->item( array(), 'v' );
		$video['source']['desktop'] = array(
			'kind'   => 'video',
			'url'    => 'https://example.com/v.mp4',
			'poster' => array( 'url' => 'https://example.com/v.jpg', 'width' => 800, 'height' => 600 ),
		);
		$out = $this->render( array( $this->item( array( 'decorative' => true ), 'a' ), $video ) );
		$this->assertStringContainsString( 'alt=""', $out['html'] );
		$this->assertStringNotContainsString( 'alt="Photo a"', $out['html'] );
		$this->assertStringContainsString( '<video', $out['html'] );
	}
}
