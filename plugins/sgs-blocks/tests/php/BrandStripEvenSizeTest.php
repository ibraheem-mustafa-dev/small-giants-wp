<?php
/**
 * The sgs/brand-strip "Even visual size" setting: every logo of the row layout gets the same box area.
 *
 * Run with: vendor/bin/phpunit --filter BrandStripEvenSizeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once __DIR__ . '/BlockHarnessRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/src/blocks/brand-strip/logo-even-size.php';

/**
 * Even visual size for the brand strip.
 */
final class BrandStripEvenSizeTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Sixteen real logos from the first measured strip, as width over height of each file, with the width the first measured
	 * sizing (width = min(120, sqrt(3600 x ratio), 44 x ratio)) gave each in a 120 x 44 slot.
	 *
	 * @return array<string, array{0: float, 1: float}> Name => [ratio, expected width].
	 */
	private function measured_strip(): array {
		return array(
			'ray-ban'       => array( 65 / 29, 89.8 ),
			'gucci'         => array( 109 / 18, 120.0 ),
			'oakley'        => array( 80 / 29, 99.6 ),
			'prada'         => array( 106 / 19, 120.0 ),
			'versace'       => array( 80 / 19, 120.0 ),
			'michael-kors'  => array( 122 / 12, 120.0 ),
			'coach'         => array( 500 / 148, 110.3 ),
			'dolce-gabbana' => array( 180 / 22, 120.0 ),
		);
	}

	/**
	 * In a 120 x 44 slot the formula gives the widths the first measured sizing gave.
	 */
	public function test_widths_match_the_first_measured_sizing(): void {
		$strip  = $this->measured_strip();
		$widths = sgs_brand_strip_even_widths( array_map( static fn( array $row ): float => $row[0], $strip ), 120.0, 44.0 );

		foreach ( $strip as $name => $row ) {
			$this->assertEqualsWithDelta( $row[1], $widths[ $name ], 0.5, $name );
		}
	}

	/**
	 * No logo is wider or taller than its slot.
	 */
	public function test_no_logo_leaves_its_slot(): void {
		$widths = sgs_brand_strip_even_widths(
			array(
				'a' => 12.0,
				'b' => 1.0,
				'c' => 0.2,
				'd' => 2.2,
			),
			120.0,
			44.0
		);
		$ratio  = array(
			'a' => 12.0,
			'b' => 1.0,
			'c' => 0.2,
			'd' => 2.2,
		);

		foreach ( $widths as $key => $width ) {
			$this->assertLessThanOrEqual( 120.01, $width, $key . ' width' );
			$this->assertLessThanOrEqual( 44.01, $width / $ratio[ $key ], $key . ' height' );
		}
	}

	/**
	 * Squarer logos get a similar box area, wide ones are held by the slot.
	 */
	public function test_logos_that_fit_the_slot_share_one_area(): void {
		$ratios = array(
			'a' => 2.2,
			'b' => 2.8,
			'c' => 3.4,
		);
		$widths = sgs_brand_strip_even_widths( $ratios, 120.0, 44.0 );
		$areas  = array();
		foreach ( $widths as $key => $width ) {
			$areas[] = $width * $width / $ratios[ $key ];
		}

		$this->assertEqualsWithDelta( $areas[0], $areas[1], 1.0 );
		$this->assertEqualsWithDelta( $areas[1], $areas[2], 1.0 );
	}

	/**
	 * A set that stays inside the slot grows until its largest logo just fits, as `contain` would.
	 */
	public function test_a_set_inside_the_slot_grows_until_the_largest_logo_fits(): void {
		// Squarer logos only (ratios 1.9 to 3.5) never reach the 120 x 44 slot at the fixed area.
		$ratios = array(
			'a' => 1.9,
			'b' => 2.5,
			'c' => 3.5,
		);
		$widths = sgs_brand_strip_even_widths( $ratios, 120.0, 44.0 );

		$fill = 0.0;
		foreach ( $widths as $key => $width ) {
			$fill = max( $fill, $width / 120.0, ( $width / $ratios[ $key ] ) / 44.0 );
		}
		$this->assertEqualsWithDelta( 1.0, $fill, 0.001, 'the largest logo touches the slot' );
	}

	/**
	 * A row with no width cap takes four times its height as the slot width for the area.
	 */
	public function test_no_width_cap_still_sizes_the_set(): void {
		$widths = sgs_brand_strip_even_widths(
			array(
				'a' => 2.0,
				'b' => 6.0,
			),
			0.0,
			40.0
		);

		$this->assertNotEmpty( $widths );
		$this->assertLessThanOrEqual( 40.01 * 6.0, $widths['b'] );
		$this->assertGreaterThan( 0, $widths['a'] );
	}

	/**
	 * Render: off by default prints no size rule; on prints one scoped rule per logo and widens the `sizes` hint.
	 */
	public function test_the_setting_is_off_by_default_and_prints_scoped_widths_when_on(): void {
		$logo  = static fn( string $key, int $w, int $h ): array => array(
			'_key'   => $key,
			'name'   => $key,
			'source' => array(
				'desktop' => array(
					'kind'   => 'image',
					'url'    => 'https://example.test/wp-content/uploads/' . $key . '.png',
					'width'  => $w,
					'height' => $h,
				),
			),
		);
		$attrs = array(
			'logoLayout'   => 'row',
			'maxHeight'    => 44,
			'logoMaxWidth' => 120,
			'logos'        => array( $logo( 'wide', 500, 50 ), $logo( 'squarish', 80, 30 ) ),
		);

		$off = $this->render_block( 'sgs/brand-strip', $attrs, array(), array(), '', true );
		$this->assertStringNotContainsString( 'data-logo-key="wide"] .sgs-media-el{width', $off['css'] );

		$on = $this->render_block( 'sgs/brand-strip', $attrs + array( 'logoEvenSize' => true ), array(), array(), '', true );
		$this->assertStringContainsString( '.sgs-brand-strip__item[data-logo-key="wide"] .sgs-media-el{width:120px;height:auto;max-width:100%;max-height:none;}', $on['css'], 'a logo never outgrows its strip' );
		$this->assertStringContainsString( '.sgs-brand-strip__item[data-logo-key="wide"]{max-width:100%;}', $on['css'] );
		$this->assertMatchesRegularExpression( '/\[data-logo-key="squarish"\] \.sgs-media-el\{width:[0-9.]+px;/', $on['css'] );
		$this->assertStringNotContainsString( ' style="', $on['html'] );
	}

	/**
	 * No width cap: the slot is a column wide, so a long wordmark cannot run past a phone's edge.
	 */
	public function test_with_no_width_cap_each_width_is_bounded_by_the_column(): void {
		$logo  = static fn( string $key, int $w, int $h ): array => array(
			'_key'   => $key,
			'name'   => $key,
			'source' => array(
				'desktop' => array(
					'kind'   => 'image',
					'url'    => 'https://example.test/wp-content/uploads/' . $key . '.png',
					'width'  => $w,
					'height' => $h,
				),
			),
		);
		$attrs = array(
			'logoLayout'   => 'row',
			'logoEvenSize' => true,
			'maxHeight'    => 60,
			'logoMaxWidth' => 0,
			'columns'      => array(
				'desktop' => 8,
				'tablet'  => 4,
				'mobile'  => 2,
			),
			'logos'        => array( $logo( 'wordmark', 1000, 100 ) ),
		);
		$css   = $this->render_block( 'sgs/brand-strip', $attrs, array(), array(), '', true )['css'];

		$this->assertMatchesRegularExpression( '/\[data-logo-key="wordmark"\] \.sgs-media-el\{width:min\([0-9.]+px,calc\(\(100cqw - 7 \* var\(--sgs-logo-gap, 10px\)\) \/ 8\)\);/', $css, 'desktop: eight columns' );
		$this->assertStringContainsString( '/ 2))', $css, 'phone: two columns' );
		$this->assertStringContainsString( 'max-width:100%', $css );
	}

	/**
	 * A key with a character the selector cannot hold is still matched: render and CSS share one key.
	 */
	public function test_a_key_with_a_dot_is_matched_by_the_markup_and_the_rule(): void {
		$attrs = array(
			'logoLayout'   => 'row',
			'logoEvenSize' => true,
			'maxHeight'    => 44,
			'logoMaxWidth' => 120,
			'logos'        => array(
				array(
					'_key'   => 'brand.1',
					'name'   => 'brand',
					'source' => array(
						'desktop' => array(
							'kind'   => 'image',
							'url'    => 'https://example.test/wp-content/uploads/b.png',
							'width'  => 200,
							'height' => 50,
						),
					),
				),
			),
		);
		$out   = $this->render_block( 'sgs/brand-strip', $attrs, array(), array(), '', true );

		$this->assertStringContainsString( 'data-logo-key="brand1"', $out['html'] );
		$this->assertStringContainsString( '[data-logo-key="brand1"] .sgs-media-el{width:', $out['css'] );
	}

	/**
	 * Block.json: off by default.
	 */
	public function test_block_json_declares_the_setting_off(): void {
		$block = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/brand-strip/block.json' ), true, 512, JSON_THROW_ON_ERROR );

		$this->assertFalse( $block['attributes']['logoEvenSize']['default'] );
	}
}
