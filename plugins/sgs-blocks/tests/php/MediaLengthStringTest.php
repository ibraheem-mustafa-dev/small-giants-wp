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

	private const HERO_SOURCE = array(
		'desktop' => array(
			'kind'   => 'image',
			'url'    => 'https://example.test/a.jpg',
			'width'  => 800,
			'height' => 600,
		),
	);

	/**
	 * Hero split image: attribute, CSS property.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function hero_sizes(): array {
		return array(
			'width'      => array( 'splitWidth', 'width' ),
			'height'     => array( 'splitHeight', 'height' ),
			'max width'  => array( 'splitMaxWidth', 'max-width' ),
			'max height' => array( 'splitMaxHeight', 'max-height' ),
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
					'variant'     => 'split',
					'splitSource' => self::HERO_SOURCE,
					$attr         => array(
						'desktop' => '240px',
						'mobile'  => '80%',
					),
				),
				array(),
				array(),
				'',
				true
			)['css']
		);
		$this->assertMatchesRegularExpression( '/(?<!\}\})\.sgs-hero-[0-9a-f]+-split\{(?:[a-z-]+:[^;}]+;)*' . preg_quote( $prop, '/' ) . ':240px;(?:[a-z-]+:[^;}]+;)*\}/', $css, 'desktop base rule' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^@]*\.sgs-hero-[0-9a-f]+-split\{' . preg_quote( $prop, '/' ) . ':80%;?\}/', $css, 'mobile rule' );
	}

	public function test_hero_split_image_max_height_prints_and_no_limit_keyword_prints_nothing(): void {
		$css = $this->normalised(
			$this->render_block(
				'sgs/hero',
				array(
					'variant'        => 'split',
					'splitSource'    => self::HERO_SOURCE,
					'splitMaxWidth'  => array( 'desktop' => 'none' ),
					'splitMaxHeight' => array( 'desktop' => '50vh' ),
				),
				array(),
				array(),
				'',
				true
			)['css']
		);
		$this->assertStringContainsString( 'max-height:50vh;', $css, 'the value prints in the base rule' );
		$this->assertStringNotContainsString( 'max-width:none', $css, 'a keyword that means no limit prints nothing on the slot' );
	}

	public function test_media_sizes_print_per_device_as_scoped_rules(): void {
		$css = $this->normalised(
			$this->render_block(
				'sgs/media',
				array(
					'source'    => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/a.jpg', 'width' => 800, 'height' => 600 ) ),
					'height'    => array(
						'desktop' => '320px',
						'mobile'  => '50vh',
					),
					'width'     => array( 'desktop' => '100%' ),
					'maxWidth'  => array(
						'desktop' => '640px',
						'mobile'  => 'none',
					),
					'maxHeight' => array( 'tablet' => 'calc(100% - 2rem)' ),
				)
			)['css']
		);
		$this->assertMatchesRegularExpression( '/\.sgs-media-[a-z0-9]+\{height:320px;max-width:640px;width:100%;\}/', $css, 'the desktop values print in the base rule' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{\.sgs-media-[a-z0-9]+\{height:50vh;max-width:none;\}\}/', $css, 'the phone values print in the phone query, a keyword as itself' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:1023px\)\{\.sgs-media-[a-z0-9]+\{max-height:calc\(100%-2rem\);\}\}/', $css, 'the tablet value prints in the tablet query' );
	}

	public function test_media_ignores_the_old_number_shape(): void {
		$css = $this->render_block(
			'sgs/media',
			array(
				'source'   => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/a.jpg', 'width' => 800, 'height' => 600 ) ),
				'maxWidth' => array( 'desktop' => 640 ),
			)
		)['css'];
		$this->assertStringNotContainsString( 'max-width:640', $css );
	}

	public function test_before_after_stage_height_and_max_width_print_per_device(): void {
		$css = $this->normalised(
			$this->render_block(
				'sgs/before-after',
				array(
					'beforeSource' => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/before.jpg', 'width' => 1200, 'height' => 800 ) ),
					'afterSource' => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/after.jpg', 'width' => 1200, 'height' => 800 ) ),
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
		$css = $this->normalised( $this->render_block( 'sgs/before-after', array( 'beforeSource' => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/b.jpg', 'width' => 1200, 'height' => 800 ) ), 'afterSource' => array( 'desktop' => array( 'kind' => 'image', 'url' => 'https://example.test/a.jpg', 'width' => 1200, 'height' => 800 ) ) ) )['css'] );
		$this->assertMatchesRegularExpression( '/__stage\{height:400px/', $css );
	}
}
