<?php
/**
 * sgs/icon and sgs/social-icons styled like a design draft's footer icons: a brand ground gradient (Instagram), brand
 * colours held on hover, a hover move (x, y), hover rotation, separate move and paint durations, a move easing, and a
 * hard-offset or soft shadow pair, each on one icon and as a row default.
 *
 * Renders run in child processes (tests/php/fixtures/icon-render-child.php, social-icons-render-child.php).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconDraftStylesTest extends TestCase {

	private const SITE_INFO = array(
		'socials' => array(
			'whatsapp'  => '07700 900123',
			'instagram' => 'https://instagram.com/shop',
			'facebook'  => 'https://facebook.com/shop',
		),
	);

	private function run_child( string $fixture, array $spec ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsds' );
		file_put_contents( $file, json_encode( $spec, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/' . $fixture ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	private function icon( array $attributes, string $bind = '' ): string {
		return $this->run_child(
			'icon-render-child.php',
			array(
				'attributes' => (object) $attributes,
				'bind'       => $bind,
				'site_info'  => self::SITE_INFO,
			)
		);
	}

	private function row( array $row, array $children ): string {
		return $this->run_child(
			'social-icons-render-child.php',
			array(
				'attributes' => (object) $row,
				'children'   => array_map(
					static fn( $c ) => array(
						'attributes' => (object) $c[0],
						'bind'       => $c[1],
					),
					$children
				),
				'site_info'  => self::SITE_INFO,
			)
		);
	}

	/** All the scoped CSS of a render, joined. */
	private function css( string $html ): string {
		preg_match_all( '#<style>(.*?)</style>#s', $html, $m );
		return implode( '', $m[1] );
	}

	// ── Hover move and rotation ──────────────────────────────────────────────

	public function test_hover_move_and_rotation_print_custom_properties(): void {
		$css = $this->css( $this->icon( array( 'offsetXHover' => -2, 'offsetYHover' => -3, 'iconRotateHover' => -8, 'scaleHover' => 1.15 ) ) );
		$this->assertStringContainsString( '--sgs-icon-hover-x:-2px', $css );
		$this->assertStringContainsString( '--sgs-icon-hover-y:-3px', $css );
		$this->assertStringContainsString( '--sgs-icon-hover-rotate:-8deg', $css );
		$this->assertStringContainsString( '--sgs-icon-hover-scale:1.15', $css );
	}

	public function test_an_untouched_icon_prints_no_hover_move_properties(): void {
		$css = $this->css( $this->icon( array() ) );
		foreach ( array( 'hover-x', 'hover-y', 'hover-rotate', 'move-duration', 'paint-duration', 'move-easing', 'icon-shadow' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $css );
		}
	}

	public function test_hover_move_is_clamped(): void {
		$css = $this->css( $this->icon( array( 'offsetXHover' => 999, 'offsetYHover' => -999, 'iconRotateHover' => 900 ) ) );
		$this->assertStringContainsString( '--sgs-icon-hover-x:40px', $css );
		$this->assertStringContainsString( '--sgs-icon-hover-y:-40px', $css );
		$this->assertStringContainsString( '--sgs-icon-hover-rotate:180deg', $css );
	}

	// ── Motion ───────────────────────────────────────────────────────────────

	public function test_move_and_paint_durations_and_easing(): void {
		$css = $this->css( $this->icon( array( 'transitionDuration' => 350, 'paintDuration' => 250, 'transitionEasing' => 'spring' ) ) );
		$this->assertStringContainsString( '--sgs-icon-move-duration:350ms', $css );
		$this->assertStringContainsString( '--sgs-icon-paint-duration:250ms', $css );
		$this->assertStringContainsString( '--sgs-icon-move-easing:var(--wp--custom--easing--spring)', $css );
	}

	public function test_custom_easing_is_validated(): void {
		$ok = $this->css( $this->icon( array( 'transitionEasing' => 'custom', 'transitionEasingCustom' => 'cubic-bezier(0.34, 1.56, 0.64, 1)' ) ) );
		$this->assertStringContainsString( '--sgs-icon-move-easing:cubic-bezier(0.34, 1.56, 0.64, 1)', $ok );
		$bad = $this->css( $this->icon( array( 'transitionEasing' => 'custom', 'transitionEasingCustom' => 'url(x);position:fixed' ) ) );
		$this->assertStringNotContainsString( 'position:fixed', $bad );
		$this->assertStringNotContainsString( 'move-easing', $bad );
	}

	// ── Shadow ───────────────────────────────────────────────────────────────

	public function test_hard_offset_shadow_pair_from_the_site_colour(): void {
		$css = $this->css( $this->icon( array( 'boxShadow' => '3px 3px 0 0', 'boxShadowColour' => '#3A2A22', 'boxShadowHover' => '5px 5px 0 0' ) ) );
		$this->assertStringContainsString( '--sgs-icon-shadow:3px 3px 0px 0px #3A2A22', $css );
		$this->assertStringContainsString( '--sgs-icon-shadow-hover:5px 5px 0px 0px #3A2A22', $css );
	}

	public function test_a_hover_only_shadow_leaves_the_resting_shadow_alone(): void {
		$css = $this->css( $this->icon( array( 'boxShadowHover' => '0 10px 20px -6px', 'boxShadowColour' => '#000000 45%' ) ) );
		$this->assertStringNotContainsString( '--sgs-icon-shadow:', $css );
		$this->assertMatchesRegularExpression( '/--sgs-icon-shadow-hover:0px 10px 20px -6px color-mix\(in srgb, #000000 45%, transparent\)/', $css );
	}

	public function test_an_own_resting_shadow_also_pins_its_hover(): void {
		// A resting shadow with the lift switched off must not pick up a row's hover shadow: the icon pins its own.
		$css = $this->css( $this->icon( array( 'boxShadow' => '2px 2px 0 0', 'boxShadowColour' => '#112233', 'shadowLiftOnHover' => false ) ) );
		$this->assertStringContainsString( '--sgs-icon-shadow:2px 2px 0px 0px #112233', $css );
		$this->assertStringContainsString( '--sgs-icon-shadow-hover:2px 2px 0px 0px #112233', $css );
	}

	public function test_a_preset_shadow_prints_the_preset_variable(): void {
		$css = $this->css( $this->icon( array( 'boxShadow' => 'hard-sm', 'shadowLiftOnHover' => false ) ) );
		$this->assertStringContainsString( '--sgs-icon-shadow:var(--wp--preset--shadow--hard-sm)', $css );
	}

	public function test_an_outline_shape_takes_no_shadow(): void {
		$css = $this->css( $this->icon( array( 'shape' => 'hexagon', 'boxShadow' => '3px 3px 0 0' ) ) );
		$this->assertStringNotContainsString( '--sgs-icon-shadow', $css );
	}

	public function test_no_inline_style_attribute_is_ever_printed(): void {
		$html = $this->icon( array( 'boxShadow' => '3px 3px 0 0', 'offsetXHover' => -2, 'iconRotateHover' => -8, 'transitionDuration' => 200 ), 'socials.instagram' );
		$this->assertDoesNotMatchRegularExpression( '/<[a-z][^>]*\sstyle=/i', $html );
	}

	// ── Brand ground gradient and hold on hover ──────────────────────────────

	public function test_instagram_brand_ground_is_the_radial_gradient(): void {
		$css = $this->css( $this->icon( array( 'colourMode' => 'brand' ), 'socials.instagram' ) );
		$this->assertStringContainsString( '--sgs-icon-brand-ground-image:radial-gradient(circle at 30% 107%, #FDF497 0%, #FD5949 45%, #D6249F 60%, #285AEB 90%)', $css );
	}

	public function test_a_flat_brand_has_no_ground_gradient(): void {
		$css = $this->css( $this->icon( array( 'colourMode' => 'brand' ), 'socials.whatsapp' ) );
		$this->assertStringNotContainsString( 'brand-ground-image', $css );
	}

	public function test_brand_hover_swaps_by_default(): void {
		$css = $this->css( $this->icon( array( 'colourMode' => 'brand' ), 'socials.whatsapp' ) );
		// Whatsapp green is too light for a white glyph, so the glyph is the dark one and the hover ground is that glyph colour.
		preg_match( '/--sgs-icon-brand-ground:([^;]+);/', $css, $ground );
		preg_match( '/--sgs-icon-brand-ground-hover:([^;]+);/', $css, $ground_hover );
		$this->assertNotSame( $ground[1] ?? 'a', $ground_hover[1] ?? 'a' );
	}

	public function test_brand_hover_hold_keeps_ground_and_glyph(): void {
		$css = $this->css( $this->icon( array( 'colourMode' => 'brand', 'brandHover' => 'hold' ), 'socials.whatsapp' ) );
		preg_match( '/--sgs-icon-brand-ground:([^;]+);/', $css, $ground );
		preg_match( '/--sgs-icon-brand-ground-hover:([^;]+);/', $css, $ground_hover );
		preg_match( '/--sgs-icon-brand-glyph:([^;]+);/', $css, $glyph );
		preg_match( '/--sgs-icon-brand-glyph-hover:([^;]+);/', $css, $glyph_hover );
		$this->assertSame( $ground[1] ?? 'a', $ground_hover[1] ?? 'b' );
		$this->assertSame( $glyph[1] ?? 'a', $glyph_hover[1] ?? 'b' );
	}

	public function test_brand_hover_hold_keeps_the_gradient_and_swap_drops_it(): void {
		$hold = $this->css( $this->icon( array( 'colourMode' => 'brand', 'brandHover' => 'hold' ), 'socials.instagram' ) );
		$this->assertStringContainsString( '--sgs-icon-brand-ground-image-hover:radial-gradient(', $hold );
		$swap = $this->css( $this->icon( array( 'colourMode' => 'brand' ), 'socials.instagram' ) );
		$this->assertStringContainsString( '--sgs-icon-brand-ground-image-hover:none', $swap );
	}

	// ── Row defaults ─────────────────────────────────────────────────────────

	public function test_row_prints_group_hover_motion_and_shadow(): void {
		$css = $this->css(
			$this->row(
				array(
					'childIconScaleHover'            => 1.15,
					'childIconOffsetXHover'          => -2,
					'childIconOffsetYHover'          => -2,
					'childIconRotateHover'           => -8,
					'childIconTransitionDuration'    => 200,
					'childIconPaintDuration'         => 200,
					'childIconTransitionEasing'      => 'spring',
					'childIconBoxShadow'             => '3px 3px 0 0',
					'childIconBoxShadowColour'       => '#3A2A22',
					'childIconBoxShadowHover'        => '5px 5px 0 0',
				),
				array( array( array(), 'socials.instagram' ) )
			)
		);
		foreach (
			array(
				'--sgs-si-hover-scale:1.15',
				'--sgs-si-hover-x:-2px',
				'--sgs-si-hover-y:-2px',
				'--sgs-si-hover-rotate:-8deg',
				'--sgs-si-move-duration:200ms',
				'--sgs-si-paint-duration:200ms',
				'--sgs-si-move-easing:var(--wp--custom--easing--spring)',
				'--sgs-si-shadow:3px 3px 0px 0px #3A2A22',
				'--sgs-si-shadow-hover:5px 5px 0px 0px #3A2A22',
			) as $needle
		) {
			$this->assertStringContainsString( $needle, $css );
		}
	}

	public function test_row_with_no_motion_prints_none_of_it(): void {
		$css = $this->css( $this->row( array(), array( array( array(), 'socials.instagram' ) ) ) );
		$this->assertStringNotContainsString( '--sgs-si-hover-', $css );
		$this->assertStringNotContainsString( '--sgs-si-shadow', $css );
		$this->assertStringNotContainsString( '--sgs-si-move', $css );
	}

	public function test_row_brand_hover_reaches_an_icon_on_automatic(): void {
		$html = $this->row( array( 'colourMode' => 'brand', 'childIconBrandHover' => 'hold' ), array( array( array(), 'socials.whatsapp' ) ) );
		$css  = $this->css( $html );
		preg_match( '/--sgs-icon-brand-ground:([^;]+);/', $css, $ground );
		preg_match( '/--sgs-icon-brand-ground-hover:([^;]+);/', $css, $ground_hover );
		$this->assertSame( $ground[1] ?? 'a', $ground_hover[1] ?? 'b' );
	}

	public function test_row_flat_background_hides_the_brand_gradient(): void {
		$css = $this->css( $this->row( array( 'colourMode' => 'brand', 'childIconBackground' => '#112233' ), array( array( array(), 'socials.instagram' ) ) ) );
		$this->assertStringContainsString( '--sgs-si-bg-gradient:none', $css );
	}
}
