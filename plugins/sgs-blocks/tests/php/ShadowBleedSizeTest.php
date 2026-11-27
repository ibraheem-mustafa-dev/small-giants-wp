<?php
/**
 * The shadow-bleed band is sized from what a row's items paint (includes/helpers-shadow-bleed.php, Spec 02 FR-2-18).
 *
 * Positive controls: the per-side reach of offsets, blur, spread and comma lists; a shadow preset resolved; hover lift,
 * resting tilt and stylesheet scale; the outset focus ring. Negative controls: inset and transparent layers reach nothing,
 * a block without a band rule gets nothing, a row with no shadows gets its motion alone, a percentage centring translate
 * is not counted, an inset focus ring adds nothing; unreadable values, script-driven motion and nested blocks keep 80px.
 *
 * Run with: vendor/bin/phpunit --filter ShadowBleedSizeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

namespace SGS\Blocks;

use PHPUnit\Framework\TestCase;

final class ShadowBleedSizeTest extends TestCase {

	private const BAND = '.sgs-x__row{overflow-x:auto;padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)) var(--sgs-shadow-bleed-bottom,var(--sgs-shadow-bleed,80px));--sgs-bleed-band:1}';

	private const ROW = '<div class="wp-block-sgs-x sgs-x"><div class="sgs-x__row"><figure class="sgs-x__item"></figure></div></div>';

	protected function setUp(): void {
		if ( ! function_exists( 'add_filter' ) ) {
			eval( 'function add_filter() {}' ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- WordPress stub for a standalone test.
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-shadow-bleed.php';
	}

	private function band( string $css, string $html = self::ROW, array $vars = array(), array $focus = array() ): ?array {
		return sgs_bleed_compute( self::BAND . $css, $html, $vars, $focus, 'sgs-x' );
	}

	public function test_offsets_put_the_reach_on_the_side_the_shadow_falls(): void {
		$this->assertSame( array( 0.0, 6.0, 6.0, 0.0 ), sgs_bleed_shadow_reach( '6px 6px 0px 0px #3A2A22' ) );
	}

	public function test_blur_and_spread_reach_every_side_less_the_offset(): void {
		$this->assertSame( array( 10.0, 14.0, 18.0, 14.0 ), sgs_bleed_shadow_reach( '0 4px 12px 2px rgba(0, 0, 0, 0.1)' ) );
	}

	public function test_a_comma_list_takes_the_largest_layer_per_side(): void {
		$this->assertSame( array( 1.0, 3.0, 6.0, 3.0 ), sgs_bleed_shadow_reach( '0 1px 2px #000, 0 3px 3px color-mix(in srgb, red 8%, transparent)' ) );
	}

	public function test_inset_and_transparent_layers_reach_nothing(): void {
		$this->assertSame( array( 0.0, 0.0, 0.0, 0.0 ), sgs_bleed_shadow_reach( 'inset 0 0 20px #000, 0 0 30px 10px color-mix(in srgb, red 0%, transparent), 0 0 #0000' ) );
	}

	public function test_an_unreadable_length_is_refused(): void {
		$this->assertNull( sgs_bleed_shadow_reach( '0 0 2vw #000' ) );
		$this->assertNull( sgs_bleed_shadow_reach( '0 0 ' . SGS_BLEED_UNKNOWN . ' ' . SGS_BLEED_UNKNOWN ) );
	}

	public function test_a_shadow_preset_resolves_from_the_global_settings(): void {
		$band = $this->band( '.sgs-x__item:hover{box-shadow:var(--wp--preset--shadow--natural)}', self::ROW, array( '--wp--preset--shadow--natural' => '6px 6px 9px rgba(0, 0, 0, 0.2)' ) );
		$this->assertSame( array( 3.0, 15.0, 15.0, 3.0 ), $band['px'] );
	}

	public function test_an_unknown_shadow_keeps_the_80px_fallback(): void {
		$band = $this->band( '.sgs-x__item{box-shadow:var(--nowhere)}' );
		$this->assertSame( array( true, true, true, true ), $band['fallback'] );
		$this->assertStringContainsString( '--sgs-shadow-bleed-top:var(--sgs-shadow-bleed, 80px)', implode( ';', sgs_bleed_declarations( $band ) ) );
	}

	public function test_a_block_without_a_band_rule_gets_nothing(): void {
		$this->assertNull( sgs_bleed_compute( '.sgs-x__item:hover{box-shadow:0 8px 20px #000}', self::ROW ) );
	}

	public function test_a_row_with_no_shadows_gets_its_motion_alone(): void {
		$band = $this->band( '.sgs-m-1 .sgs-x__item{--sgs-mh-to-ty:-6px}' );
		$this->assertSame( array( '--sgs-shadow-bleed-top:8px', '--sgs-shadow-bleed-right:2px', '--sgs-shadow-bleed-bottom:2px', '--sgs-shadow-bleed-left:2px' ), sgs_bleed_declarations( $band ) );
	}

	public function test_the_footer_gallery_hover_shadow_lift_and_tilt(): void {
		$css  = '.sgs-x__item:hover{box-shadow:var(--sgs-hover-shadow, none)}.sgs-c-1{--sgs-hover-shadow:6px 6px 0px 0px #3A2A22}'
			. '.sgs-m-1 .sgs-x__item{--sgs-mh-to-ty:-6px;--sgs-rot-rest:-2deg;--sgs-mh-to-rot:calc(0deg - var(--sgs-rot-rest))}'
			. '.sgs-m-1 .sgs-x__item:nth-child(2){--sgs-rot-rest:1.5deg}';
		$band = $this->band( $css );
		$this->assertSame( array( 6.0, 6.0, 6.0, 0.0 ), $band['px'] );
		$this->assertSame(
			array( '--sgs-shadow-bleed-top:min(80px, calc(8px + 1.75%))', '--sgs-shadow-bleed-right:min(80px, calc(8px + 1.75%))', '--sgs-shadow-bleed-bottom:min(80px, calc(8px + 1.75%))', '--sgs-shadow-bleed-left:min(80px, calc(2px + 1.75%))' ),
			sgs_bleed_declarations( $band )
		);
	}

	public function test_a_stylesheet_lift_and_scale_count_and_a_centring_translate_does_not(): void {
		$band = $this->band( '.sgs-x__item:hover{transform:translateY(-4px) scale(1.03)}.sgs-x__arrow{transform:translateY(-50%)}' );
		$this->assertEqualsWithDelta( array( 4.12, 0.0, 0.0, 0.0 ), $band['px'], 0.001 );
		$this->assertEqualsWithDelta( 1.5, $band['pct'], 0.001 );
	}

	public function test_a_matrix_transform_keeps_the_fallback(): void {
		$this->assertSame( array( true, true, true, true ), $this->band( '.sgs-x__item{transform:matrix(1, 0, 0, 1, 0, 0)}' )['fallback'] );
	}

	public function test_an_outset_focus_ring_adds_its_reach_and_an_inset_one_does_not(): void {
		$tokens = array(
			'width'    => '3px',
			'offset'   => '3px',
			'bloom'    => '0',
			'ringOnly' => '1',
		);
		$outset = $this->band( '', '<div class="sgs-x__row"><a href="#">x</a></div>', array(), $tokens );
		$inset  = $this->band( '', '<div class="sgs-x__row"><a class="sgs-focus--inset" href="#">x</a></div>', array(), $tokens );
		$glow   = $this->band( '', '<div class="sgs-x__row"><a href="#">x</a></div>' );
		$this->assertSame( array( 6.0, 6.0, 6.0, 6.0 ), $outset['px'] );
		$this->assertSame( array( 0.0, 0.0, 0.0, 0.0 ), $inset['px'] );
		$this->assertSame( array( 40.0, 40.0, 40.0, 40.0 ), $glow['px'] );
	}

	public function test_script_driven_motion_keeps_the_fallback(): void {
		$this->assertSame( array( true, true, true, true ), $this->band( '', '<div class="sgs-x__row"><div data-sgs-fx="magnet"></div></div>' )['fallback'] );
	}

	public function test_a_nested_block_keeps_the_fallback(): void {
		$this->assertSame( array( true, true, true, true ), $this->band( '', '<div class="wp-block-sgs-x"><div class="sgs-x__row"><div class="wp-block-sgs-card"></div></div></div>' )['fallback'] );
		$this->assertSame( array( false, false, false, false ), $this->band( '' )['fallback'] );
	}

	public function test_a_percentage_motion_translate_keeps_the_fallback_on_its_axis(): void {
		$this->assertSame( array( true, false, true, false ), $this->band( '.sgs-x__item{--sgs-me-from-ty:100%}' )['fallback'] );
	}
}
