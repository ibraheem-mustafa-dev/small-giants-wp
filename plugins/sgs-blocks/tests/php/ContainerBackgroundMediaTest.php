<?php
/**
 * Spec 49 §7.8: every background state of an adopted block prints one `.sgs-bg-media` element, then `.sgs-bg-overlay`.
 *
 * Renders the real sgs/container through the QA harness with its block.json registered (so the wrapper sees
 * `backgroundSource` and takes the media path).
 *
 * Run with: vendor/bin/phpunit --filter ContainerBackgroundMediaTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerBackgroundMediaTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const SVG = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

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
		return $this->render_block( 'sgs/container', $attrs, array(), array(), '<p>Inside</p>', true );
	}

	public function test_a_photo_prints_a_real_element_and_no_legacy_layer(): void {
		$out = $this->render( array( 'backgroundSource' => array( 'desktop' => $this->photo( 'a.jpg' ) ) ) );

		$this->assertStringContainsString( '<div class="sgs-bg-media" aria-hidden="true">', $out['html'] );
		$this->assertStringContainsString( 'class="sgs-media-el"', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-container__image-bg', $out['html'] );
		$this->assertStringNotContainsString( '::before', $out['css'] );
		$this->assertStringContainsString( 'sgs-container--has-bg-image', $out['html'] );
		$this->assertLessThan( strpos( $out['html'], '<p>Inside</p>' ), strpos( $out['html'], 'sgs-bg-media' ), 'the element comes before the content' );
	}

	public function test_a_tile_paints_with_css_on_the_element_and_prints_no_img(): void {
		$out = $this->render(
			array(
				'backgroundSource'   => array( 'desktop' => $this->photo( 'tile.png' ) ),
				'backgroundFit'      => array( 'desktop' => 'tile' ),
				'backgroundRepeat'   => array( 'desktop' => 'repeat-x' ),
				'backgroundTileSize' => array( 'desktop' => '80px' ),
			)
		);

		$this->assertStringContainsString( 'sgs-bg-media--painted', $out['html'] );
		$this->assertStringNotContainsString( '<img', $out['html'] );
		$this->assertMatchesRegularExpression( '/> \.sgs-bg-media\{[^}]*background-image:url\(https:\/\/example\.test\/wp-content\/uploads\/tile\.png\)/', $out['css'] );
		$this->assertStringContainsString( 'background-repeat:repeat-x', $out['css'] );
		$this->assertStringContainsString( 'background-size:80px', $out['css'] );
	}

	public function test_pinned_is_a_fixed_attachment_class_and_the_photo_is_a_css_background(): void {
		$out = $this->render(
			array(
				'backgroundSource' => array( 'desktop' => $this->photo( 'pin.jpg' ) ),
				'backgroundPinned' => true,
			)
		);

		$this->assertStringContainsString( 'sgs-bg-media--pinned', $out['html'] );
		$this->assertStringNotContainsString( '<img', $out['html'] );
		$this->assertStringContainsString( 'background-size:cover', $out['css'] );
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/media-bg.css' );
		$this->assertMatchesRegularExpression( '/\.sgs-bg-media--pinned\s*\{\s*background-attachment:\s*fixed/', $css );
		$this->assertMatchesRegularExpression( '/@supports \(-webkit-touch-callout: inherit\)\s*\{\s*\.sgs-bg-media--pinned\s*\{\s*background-attachment:\s*scroll/', $css );
		$this->assertMatchesRegularExpression( '/prefers-reduced-motion: reduce\)\s*\{\s*\.sgs-bg-media--pinned\s*\{\s*background-attachment:\s*scroll/', $css );
	}

	public function test_a_photo_on_desktop_and_a_video_on_mobile_print_both_siblings_with_one_shown_per_device(): void {
		$video = array(
			'kind'   => 'video',
			'id'     => 0,
			'url'    => 'https://example.test/wp-content/uploads/loop.mp4',
			'poster' => array(
				'id'     => 0,
				'url'    => 'https://example.test/wp-content/uploads/cover.jpg',
				'width'  => 800,
				'height' => 450,
			),
		);
		$out   = $this->render(
			array(
				'backgroundSource' => array(
					'desktop' => $this->photo( 'wide.jpg' ),
					'mobile'  => $video,
				),
			)
		);

		$this->assertStringContainsString( 'sgs-media-sib--image', $out['html'] );
		$this->assertStringContainsString( 'sgs-media-sib--video', $out['html'] );
		$this->assertStringContainsString( 'data-sgs-device-video', $out['html'] );
		$this->assertStringContainsString( 'loop.mp4', $out['html'] );
		$this->assertMatchesRegularExpression( '/<source[^>]+loop\.mp4[^>]+media="[^"]*max-width:\s*767/', $out['html'] );
		$this->assertStringContainsString( 'sgs-container--has-bg-image', $out['html'] );
		$this->assertStringContainsString( ' .sgs-media-sib.sgs-media-sib--image{display:none}', $out['css'] );
		$this->assertStringNotContainsString( 'poster="', $out['html'] );
	}

	public function test_an_svg_source_marks_the_section_and_prints_no_legacy_layer(): void {
		$out = $this->render( array( 'backgroundSource' => array( 'desktop' => array( 'kind' => 'svg', 'markup' => self::SVG ) ) ) );

		// The harness has no WP_HTML_Tag_Processor, which prints the <svg>; the markup is proven live on the scratch mirror.
		$this->assertStringContainsString( 'sgs-container--has-bg-svg', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-container__svg-bg', $out['html'] );
	}

	public function test_an_svg_set_to_front_adds_the_front_class(): void {
		$out = $this->render(
			array(
				'backgroundSource'   => array( 'desktop' => array( 'kind' => 'svg', 'markup' => self::SVG ) ),
				'backgroundSvgLayer' => 'front',
			)
		);

		$this->assertStringContainsString( 'sgs-container--bg-front', $out['html'] );
	}

	public function test_the_kept_svg_layer_prints_beside_a_photo(): void {
		$out = $this->render(
			array(
				'backgroundSource' => array( 'desktop' => $this->photo( 'photo.jpg' ) ),
				'bgSvgContent'     => self::SVG,
				'bgSvgPosition'    => 'foreground',
			)
		);

		$this->assertStringContainsString( 'sgs-bg-media', $out['html'] );
		$this->assertStringContainsString( 'sgs-container__svg-bg', $out['html'] );
		$this->assertStringContainsString( 'sgs-container--svg-foreground', $out['html'] );
	}

	public function test_the_overlay_is_a_real_span_after_the_element_with_its_own_rule(): void {
		$out = $this->render(
			array(
				'backgroundSource'          => array( 'desktop' => $this->photo( 'o.jpg' ) ),
				'backgroundOverlayColour'   => '#112233',
				'backgroundOverlayOpacity'  => array( 'desktop' => 40, 'mobile' => 70 ),
				'backgroundOverlayBlend'    => 'multiply',
			)
		);

		$this->assertStringContainsString( '<span class="sgs-bg-overlay" aria-hidden="true"></span>', $out['html'] );
		$markup = substr( $out['html'], (int) strpos( $out['html'], '</style>' ) );
		$this->assertLessThan( strpos( $markup, 'sgs-bg-overlay' ), strpos( $markup, 'sgs-bg-media' ) );
		$this->assertStringNotContainsString( 'sgs-container__overlay', $out['html'] );
		$this->assertMatchesRegularExpression( '/> \.sgs-bg-overlay\{background-color:[^;]*;opacity:0\.4;mix-blend-mode:multiply\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/> \.sgs-bg-overlay\{opacity:0\.7\}/', $out['css'] );
	}

	public function test_a_colour_only_overlay_prints_without_an_element(): void {
		$out = $this->render( array( 'backgroundOverlayColour' => '#000000' ) );

		$this->assertStringContainsString( 'sgs-bg-overlay', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-bg-media', $out['html'] );
	}

	public function test_a_content_photograph_can_switch_decorative_off(): void {
		$out = $this->render(
			array(
				'backgroundSource'      => array( 'desktop' => $this->photo( 'alt.jpg' ) ),
				'backgroundDecorative'  => false,
				'backgroundAlt'         => 'Shop front',
			)
		);

		$this->assertStringNotContainsString( 'aria-hidden="true">', explode( '<picture', $out['html'] )[0] . '>' );
		$this->assertStringContainsString( 'alt="Shop front"', $out['html'] );
	}

	public function test_fit_focal_and_opacity_print_under_the_elements_own_selectors(): void {
		$out = $this->render(
			array(
				'backgroundSource'  => array( 'desktop' => $this->photo( 'f.jpg' ) ),
				'backgroundFit'     => array( 'desktop' => 'none' ),
				'backgroundFocal'   => array( 'desktop' => array( 'x' => 0.25, 'y' => 0.75 ) ),
				'backgroundOpacity' => array( 'desktop' => 60 ),
			)
		);

		$this->assertMatchesRegularExpression( '/> \.sgs-bg-media \.sgs-media-el\{object-fit:none;object-position:25% 75%;?\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/> \.sgs-bg-media\{opacity:0\.6;?\}/', $out['css'] );
	}

	public function test_a_gradient_overlay_and_a_source_with_no_size_print(): void {
		$out = $this->render(
			array(
				'backgroundSource'          => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/wp-content/uploads/bare.jpg' ) ),
				'backgroundOverlayGradient' => 'linear-gradient(135deg,#ff0000 0%,#0000ff 100%)',
			)
		);

		$this->assertStringContainsString( 'bare.jpg', $out['html'] );
		$this->assertStringContainsString( 'background-image:linear-gradient(135deg', $out['css'] );
	}

	public function test_an_empty_source_prints_nothing_and_no_element(): void {
		$out = $this->render( array( 'backgroundSource' => array( 'desktop' => array( 'kind' => 'image', 'url' => '' ) ) ) );

		$this->assertStringNotContainsString( 'sgs-bg-media', $out['html'] );
	}

	public function test_a_tiled_device_whose_url_cannot_be_painted_stops_the_wider_devices_tile(): void {
		$out = $this->render(
			array(
				'backgroundSource' => array(
					'desktop' => $this->photo( 'tile.png' ),
					// A URL the CSS sanitiser refuses (a quote) passes the Source normaliser but paints nothing.
					'tablet'  => array( 'kind' => 'image', 'url' => "https://example.test/wp-content/uploads/it's.png", 'width' => 100, 'height' => 100 ),
				),
				'backgroundFit'    => array( 'desktop' => 'tile' ),
			)
		);

		$this->assertStringContainsString( 'background-image:url(https://example.test/wp-content/uploads/tile.png)', $out['css'] );
		$this->assertStringContainsString( 'background-image:none', $out['css'], 'the tablet rule resets the desktop tile' );
	}

	public function test_an_effect_on_the_background_part_gets_an_empty_element_when_there_is_no_file(): void {
		$motion = static fn( string $effect ): array => array( 'elements' => array( 'background' => array( 'effects' => array( array( 'effect' => $effect ) ) ) ) );

		$particles = $this->render( array( 'sgsMotion' => $motion( 'particles' ) ) );
		$this->assertStringContainsString( '<div class="sgs-bg-media" aria-hidden="true"></div>', $particles['html'] );

		$lottie = $this->render( array( 'sgsMotion' => $motion( 'lottie' ) ) );
		$this->assertStringContainsString( '<div class="sgs-bg-media sgs-container__lottie-bg" aria-hidden="true"></div>', $lottie['html'] );

		$on_another_part = $this->render( array( 'sgsMotion' => array( 'elements' => array( 'root' => array( 'effects' => array( array( 'effect' => 'particles' ) ) ) ) ) ) );
		$this->assertStringNotContainsString( 'sgs-bg-media', $on_another_part['html'], 'an effect on another part adds no background element' );
	}
}
