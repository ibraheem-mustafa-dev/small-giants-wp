<?php
/**
 * Spec 49 7.8: sgs/hero prints its background through the media system, as the container does.
 *
 * One `.sgs-bg-media` element holds the picture (every device's file in one `<picture>`), then `.sgs-bg-overlay`. The
 * hero prints no private image, video or overlay of its own, and Size and Position (Fit and Focal) now reach a plain
 * image.
 *
 * Run with: vendor/bin/phpunit --no-configuration --bootstrap tests/php/bootstrap.php tests/php/HeroBackgroundMediaTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class HeroBackgroundMediaTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * A photo source.
	 *
	 * @param string $name File name.
	 * @return array<string,mixed>
	 */
	private function photo( string $name ): array {
		return array(
			'kind'   => 'image',
			'id'     => 0,
			'url'    => 'https://example.test/wp-content/uploads/' . $name,
			'width'  => 1600,
			'height' => 900,
		);
	}

	/**
	 * @param array<string,mixed> $attrs Attributes.
	 * @return array{html:string,css:string}
	 */
	private function render( array $attrs ): array {
		return $this->render_block( 'sgs/hero', $attrs, array(), array(), '<p>Inside</p>', true );
	}

	public function test_every_device_file_prints_in_one_picture_and_no_private_layer(): void {
		$out = $this->render(
			array(
				'backgroundSource' => array(
					'desktop' => $this->photo( 'desk.jpg' ),
					'tablet'  => $this->photo( 'tab.jpg' ),
					'mobile'  => $this->photo( 'mob.jpg' ),
				),
			)
		);

		$this->assertSame( 1, substr_count( $out['html'], '<picture' ), 'one picture for every device' );
		foreach ( array( 'desk.jpg', 'tab.jpg', 'mob.jpg' ) as $file ) {
			$this->assertStringContainsString( $file, $out['html'] );
		}
		$this->assertStringContainsString( '<div class="sgs-bg-media" aria-hidden="true">', $out['html'] );
		foreach ( array( 'sgs-hero__bg-img', 'sgs-hero__video-bg', 'sgs-hero__overlay', 'sgs-container__image-bg' ) as $private ) {
			$this->assertStringNotContainsString( $private, $out['html'], $private );
		}
		$this->assertStringNotContainsString( '::before', $out['css'] );
		$this->assertLessThan( strpos( $out['html'], '<p>Inside</p>' ), strpos( $out['html'], 'sgs-bg-media' ), 'the element comes before the content' );
	}

	public function test_fit_and_focal_reach_a_plain_image(): void {
		$out = $this->render(
			array(
				'backgroundSource' => array( 'desktop' => $this->photo( 'a.jpg' ) ),
				'backgroundFit'    => array( 'desktop' => 'contain' ),
				'backgroundFocal'  => array(
					'desktop' => array(
						'x' => 0.2,
						'y' => 0.3,
					),
				),
			)
		);

		$this->assertMatchesRegularExpression( '/> \.sgs-bg-media \.sgs-media-el\{object-fit:contain;object-position:20% 30%;?\}/', $out['css'] );
	}

	public function test_the_overlay_prints_through_the_shared_overlay_element(): void {
		$out = $this->render(
			array(
				'backgroundSource'         => array( 'desktop' => $this->photo( 'a.jpg' ) ),
				'backgroundOverlayColour'  => '#000000',
				'backgroundOverlayOpacity' => array( 'desktop' => 40 ),
				'backgroundOverlayBlend'   => 'multiply',
			)
		);

		$this->assertStringContainsString( '<span class="sgs-bg-overlay" aria-hidden="true"></span>', $out['html'] );
		$this->assertMatchesRegularExpression( '/> \.sgs-bg-overlay\{[^}]*background-color:#000000[^}]*opacity:0\.4/', $out['css'] );
		$this->assertStringContainsString( 'mix-blend-mode:multiply', $out['css'] );
	}

	public function test_a_video_prints_in_the_same_element_and_a_hero_without_media_prints_none(): void {
		$video = $this->render(
			array(
				'backgroundSource' => array(
					'desktop' => array(
						'kind' => 'video',
						'url'  => 'https://example.test/wp-content/uploads/v.mp4',
					),
				),
			)
		);
		$this->assertStringContainsString( '<video', $video['html'] );
		$this->assertStringContainsString( 'sgs-bg-media', $video['html'] );
		$this->assertStringNotContainsString( 'sgs-hero__video-bg', $video['html'] );

		$none = $this->render( array( 'variant' => 'standard' ) );
		$this->assertStringNotContainsString( 'sgs-bg-media', $none['html'], 'negative control: nothing to print' );
		$this->assertStringNotContainsString( 'sgs-bg-overlay', $none['html'], 'negative control: no overlay without a colour' );
	}
}
