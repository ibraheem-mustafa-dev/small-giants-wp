<?php
/**
 * The box-shape media atom's Height, Width, Max width and Max height, and the sizes of sgs/hero's split image,
 * sgs/media and sgs/before-after, are per-device CSS length strings ({"desktop":"240px","mobile":"80%"}): the
 * desktop value prints in the base rule, a different mobile value in the mobile media query, a keyword such as
 * "none" prints as itself.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter MediaLengthStringTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class MediaLengthStringTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Hero split image: attribute, CSS property.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function hero_sizes(): array {
		return array(
			'width'      => array( 'splitMediaWidth', 'width' ),
			'height'     => array( 'splitMediaHeight', 'height' ),
			'max width'  => array( 'splitMediaMaxWidth', 'max-width' ),
			'max height' => array( 'splitMediaMaxHeight', 'max-height' ),
		);
	}

	private function normalised( string $css ): string {
		return preg_replace( '/\s+/', '', str_replace( '@media(', '@media (', $css ) ) ?? '';
	}

	/**
	 * @dataProvider hero_sizes
	 */
	public function test_hero_split_image_size_prints_per_device( string $attr, string $prop ): void {
		$css = $this->normalised(
			$this->render_block(
				'sgs/hero',
				array(
					'variant'            => 'split',
					'splitMediaObjectFit' => 'custom',
					$attr                => array(
						'desktop' => '240px',
						'mobile'  => '80%',
					),
				)
			)['css']
		);
		$this->assertMatchesRegularExpression( '/(?<!\}\})\.sgs-hero__split-media\{(?:[a-z-]+:[^;}]+;)*' . preg_quote( $prop, '/' ) . ':240px;?\}/', $css, 'desktop base rule' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^@]*\.sgs-hero__split-media\{' . preg_quote( $prop, '/' ) . ':80%;?\}/', $css, 'mobile rule' );
	}

	public function test_hero_split_image_keyword_and_old_number_shape(): void {
		$css = $this->normalised(
			$this->render_block(
				'sgs/hero',
				array(
					'variant'             => 'split',
					'splitMediaObjectFit' => 'custom',
					'splitMediaMaxWidth'  => array( 'desktop' => 'none' ),
					'splitMediaMaxHeight' => array( 'desktop' => '50vh' ),
				)
			)['css']
		);
		$this->assertStringContainsString( 'max-width:none;', $css, 'keyword prints as itself' );
	}

	public function test_media_atom_sizes_print_per_device_as_custom_properties(): void {
		$css = $this->normalised(
			$this->render_block(
				'sgs/media',
				array(
					'mediaType'   => 'image',
					'imageUrl'    => 'https://example.test/a.jpg',
					'mediaSizing' => 'height',
					'height'      => array(
						'desktop' => '320px',
						'mobile'  => '50vh',
					),
					'width'       => array( 'desktop' => '100%' ),
					'maxWidth'    => array(
						'desktop' => '640px',
						'mobile'  => 'none',
					),
					'maxHeight'   => array( 'tablet' => 'calc(100% - 2rem)' ),
				)
			)['css']
		);
		$this->assertStringContainsString( '--sgs-media-height:320px', $css );
		$this->assertStringContainsString( '--sgs-media-height-mobile:50vh', $css );
		$this->assertStringContainsString( '--sgs-media-width:100%', $css );
		$this->assertStringContainsString( '--sgs-media-max-width:640px', $css );
		$this->assertStringContainsString( '--sgs-media-max-width-mobile:none', $css );
		$this->assertStringContainsString( '--sgs-media-max-height-tablet:calc(100%-2rem)', $css );
	}

	public function test_media_atom_ignores_the_old_number_shape(): void {
		$css = $this->render_block(
			'sgs/media',
			array(
				'mediaType' => 'image',
				'imageUrl'  => 'https://example.test/a.jpg',
				'maxWidth'  => array( 'desktop' => 640 ),
			)
		)['css'];
		$this->assertStringNotContainsString( '--sgs-media-max-width:640', $css );
	}

	public function test_before_after_stage_height_and_max_width_print_per_device(): void {
		$css = $this->normalised(
			$this->render_block(
				'sgs/before-after',
				array(
					'beforeImageUrl' => 'https://example.test/before.jpg',
					'afterImageUrl'  => 'https://example.test/after.jpg',
					'height'         => array(
						'desktop' => '420px',
						'mobile'  => '60vh',
					),
					'maxWidth'       => array(
						'desktop' => '900px',
						'mobile'  => '100%',
					),
				)
			)['css']
		);
		$this->assertMatchesRegularExpression( '/__stage\{height:420px/', $css, 'desktop height' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^@]*__stage\{height:60vh/', $css, 'mobile height' );
		$this->assertStringContainsString( 'max-width:900px', $css, 'desktop max width' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^@]*max-width:100%/', $css, 'mobile max width' );
	}

	public function test_before_after_defaults_to_a_400px_stage(): void {
		$css = $this->normalised( $this->render_block( 'sgs/before-after', array( 'beforeImageUrl' => 'https://example.test/b.jpg', 'afterImageUrl' => 'https://example.test/a.jpg' ) )['css'] );
		$this->assertMatchesRegularExpression( '/__stage\{height:400px/', $css );
	}
}
