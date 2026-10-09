<?php
/**
 * sgs/icon custom outline shapes (icon plan D2, Phase D): each outline renders its registry SVG behind the glyph
 * (aria-hidden, not focusable, painted only by classes), the box background and border print nothing for an outline,
 * the border becomes the stroke (width, colours, dash pattern), the size is width only, a hostile shape falls back to
 * the square, a social row's group shape and border reach a bound linked child, and both block.json enums list exactly
 * the registry's shapes.
 *
 * Renders run in the same child processes IconRenderTest and SocialIconsRenderTest use. Negative controls:
 * test_negative_control_box_border_probe_sees_a_square_border proves the "no box border" probe sees a border when the
 * same attributes draw a square; test_negative_control_svg_probe_sees_an_outline proves the "no SVG" probe sees one.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconOutlineShapesTest extends TestCase {

	private const OUTLINES = array( 'hexagon', 'diamond', 'octagon', 'star', 'blob' );

	private const SITE_INFO = array(
		'phone'   => '0121 729 8233',
		'socials' => array( 'instagram' => 'https://instagram.com/shop' ),
	);

	/**
	 * Run a child fixture with a JSON spec.
	 *
	 * @param string $child Fixture file name.
	 * @param array  $spec  Spec.
	 * @return string Rendered HTML.
	 */
	private function run_child( string $child, array $spec ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsoutl' );
		file_put_contents( $file, json_encode( $spec, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/' . $child ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	private function render( array $attributes ): string {
		return $this->run_child(
			'icon-render-child.php',
			array(
				'attributes' => (object) $attributes,
				'bind'       => '',
				'site_info'  => self::SITE_INFO,
			)
		);
	}

	private function css( string $html ): string {
		return preg_match( '#<style>(.*?)</style>#s', $html, $m ) ? $m[1] : '';
	}

	/** The scoped declarations printed for the shape element (box background, border, radius). */
	private function shape_rules( string $css ): string {
		preg_match_all( '#\.sgs-icon__shape\{([^}]*)\}#', $css, $m );
		return implode( ';', $m[1] );
	}

	private function registry(): array {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/data/icon-shapes.json' ), true );
		return array_column( $json['shapes'], 'd', 'slug' );
	}

	private function load_helpers(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-icon.php';
	}

	// ── Markup ────────────────────────────────────────────────────────────────

	public function test_each_outline_renders_its_registry_svg_behind_the_glyph(): void {
		$registry = $this->registry();
		foreach ( self::OUTLINES as $shape ) {
			$html = $this->render(
				array(
					'shape'          => $shape,
					'showBackground' => true,
				)
			);
			$this->assertMatchesRegularExpression( '#<span class="sgs-icon__shape"><svg class="sgs-icon__outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">#', $html, $shape . ': SVG first inside the shape' );
			$this->assertStringContainsString( '<path class="sgs-icon__outline-path" d="' . $registry[ $shape ] . '" clip-path="url(#sgs-icn-', $html, $shape . ': the registry path, clipped' );
			$this->assertMatchesRegularExpression( '#<clipPath id="(sgs-icn-[a-f0-9]{8}-oc)"><path d="' . preg_quote( $registry[ $shape ], '#' ) . '"/></clipPath>#', $html );
			$this->assertStringContainsString( 'sgs-icon--shape-' . $shape, $html );
			$this->assertStringContainsString( 'sgs-icon--outline', $html );
			$this->assertMatchesRegularExpression( '#</svg><span class="sgs-icon__svg"#', $html, $shape . ': the glyph follows the outline' );
			$svg = preg_match( '#<svg class="sgs-icon__outline".*?</svg>#s', $html, $m ) ? $m[0] : '';
			$this->assertDoesNotMatchRegularExpression( '#\s(fill|stroke|stroke-width|style)=#', $svg, $shape . ': paint comes only from classes' );
		}
	}

	public function test_an_outline_with_nothing_to_paint_draws_no_svg(): void {
		$this->assertStringNotContainsString( 'sgs-icon__outline"', $this->render( array( 'shape' => 'hexagon' ) ) );
	}

	public function test_negative_control_svg_probe_sees_an_outline(): void {
		$this->assertStringContainsString(
			'sgs-icon__outline"',
			$this->render(
				array(
					'shape'       => 'hexagon',
					'borderWidth' => array( 'top' => '2px' ),
				)
			)
		);
	}

	/** @return array<string, array{0: mixed}> */
	public static function hostile_shapes(): array {
		return array(
			'markup'      => array( 'hexagon"><script>alert(1)</script>' ),
			'unknown'     => array( 'heart' ),
			'upper'       => array( 'HEXAGON' ),
			'class break' => array( 'blob sgs-x' ),
			'not string'  => array( array( 'hexagon' ) ),
		);
	}

	/**
	 * A shape outside the list renders the square, with no outline.
	 *
	 * @param mixed $shape Stored shape.
	 */
	#[\PHPUnit\Framework\Attributes\DataProvider( 'hostile_shapes' )]
	public function test_hostile_shape_falls_back_to_the_square( $shape ): void {
		$html = $this->render(
			array(
				'shape'          => $shape,
				'showBackground' => true,
			)
		);
		$this->assertStringContainsString( 'sgs-icon--shape-square', $html );
		$this->assertStringNotContainsString( 'sgs-icon--outline', $html );
		$this->assertStringNotContainsString( '<script', $html );
	}

	// ── Box off, stroke on ────────────────────────────────────────────────────

	private function bordered( string $shape ): array {
		return array(
			'shape'                         => $shape,
			'showBackground'                => true,
			'backgroundColour'              => 'accent',
			'backgroundColourGradient'      => 'linear-gradient(90deg,#000 0%,#fff 100%)',
			'backgroundColourHoverGradient' => 'linear-gradient(90deg,#fff 0%,#000 100%)',
			'borderWidth'                   => array( 'top' => '2px' ),
			'borderStyle'                   => 'solid',
			'borderColour'                  => 'primary',
			'borderColourHover'             => '#ff0000',
			'borderColourGradient'          => 'linear-gradient(90deg,#111 0%,#222 100%)',
			'borderRadius'                  => array( 'desktop' => array( 'topLeft' => '8px' ) ),
		);
	}

	public function test_outline_prints_no_box_border_background_gradient_or_radius(): void {
		foreach ( self::OUTLINES as $shape ) {
			$css = $this->css( $this->render( $this->bordered( $shape ) ) );
			$this->assertSame( '', $this->shape_rules( $css ), $shape . ': no scoped box rule on the shape' );
			$this->assertStringNotContainsString( 'border-width', $css );
			$this->assertStringNotContainsString( 'border-color', $css );
			$this->assertStringNotContainsString( 'linear-gradient', $css, $shape . ': gradients are box shapes only' );
			$this->assertStringNotContainsString( 'radius', $css );
		}
	}

	public function test_negative_control_box_border_probe_sees_a_square_border(): void {
		$css = $this->css( $this->render( $this->bordered( 'square' ) ) );
		$this->assertStringContainsString( 'border-width', $this->shape_rules( $css ) );
		$this->assertStringContainsString( 'linear-gradient', $css );
	}

	public function test_outline_border_becomes_the_stroke_properties(): void {
		$attrs = $this->bordered( 'diamond' );
		unset( $attrs['borderColourGradient'] );
		$html = $this->render( $attrs );
		$css  = $this->css( $html );
		$this->assertStringContainsString( '--sgs-icon-outline-w:2px', $css );
		$this->assertStringContainsString( '--sgs-icon-border-colour:var(--wp--preset--color--primary', $css );
		$this->assertStringContainsString( '--sgs-icon-border-colour-hover:#ff0000', $css );
		$this->assertStringContainsString( '--sgs-icon-bg:var(--wp--preset--color--accent', $css );
		$this->assertStringContainsString( 'sgs-icon--boxed', $html );
		$this->assertStringContainsString( 'sgs-icon--has-bg', $html );
		$this->assertStringNotContainsString( 'sgs-icon--outline-', $html, 'solid has no dash class' );
	}

	public function test_a_stored_border_gradient_leaves_the_stroke_on_its_default_colours(): void {
		$css = $this->css( $this->render( $this->bordered( 'diamond' ) ) );
		$this->assertStringContainsString( '--sgs-icon-outline-w:2px', $css );
		$this->assertStringNotContainsString( '--sgs-icon-border-colour', $css );
		$this->assertStringNotContainsString( '::before', $css, 'no gradient ring' );
	}

	public function test_dashed_and_dotted_borders_keep_their_pattern_and_none_draws_nothing(): void {
		foreach ( array( 'dashed', 'dotted' ) as $style ) {
			$html = $this->render(
				array(
					'shape'       => 'octagon',
					'borderWidth' => array( 'top' => '2px' ),
					'borderStyle' => $style,
				)
			);
			$this->assertStringContainsString( 'sgs-icon--outline-' . $style, $html );
		}
		$html = $this->render(
			array(
				'shape'       => 'octagon',
				'borderWidth' => array( 'top' => '2px' ),
				'borderStyle' => 'none',
			)
		);
		$this->assertStringNotContainsString( '--sgs-icon-outline-w', $this->css( $html ) );
		$this->assertStringNotContainsString( 'sgs-icon__outline"', $html );
	}

	public function test_hostile_stroke_widths_print_nothing(): void {
		foreach ( array( '2px;}body{color:red', 'calc(}body{)', 'url(x)', 'inherit' ) as $width ) {
			$css = $this->css(
				$this->render(
					array(
						'shape'       => 'blob',
						'borderWidth' => array( 'top' => $width ),
					)
				)
			);
			$this->assertStringNotContainsString( '--sgs-icon-outline-w', $css, $width );
			$this->assertStringNotContainsString( 'body{', $css );
		}
	}

	public function test_a_list_width_strokes_its_first_length_and_a_later_side_counts_when_top_is_unset(): void {
		$css = $this->css(
			$this->render(
				array(
					'shape'       => 'blob',
					'borderWidth' => array( 'top' => '1px 2px' ),
				)
			)
		);
		$this->assertStringContainsString( '--sgs-icon-outline-w:1px;', $css );
		$css = $this->css(
			$this->render(
				array(
					'shape'       => 'blob',
					'borderWidth' => array( 'left' => '5px' ),
				)
			)
		);
		$this->assertStringContainsString( '--sgs-icon-outline-w:5px;', $css );
	}

	public function test_outline_size_is_width_only(): void {
		$css = $this->css(
			$this->render(
				array(
					'shape'           => 'hexagon',
					'shapeSizeLinked' => false,
					'shapeSize'       => array(
						'desktop' => array(
							'width'  => '64px',
							'height' => '40px',
						),
					),
				)
			)
		);
		$this->assertStringContainsString( '--sgs-icon-shape-w:64px', $css );
		$this->assertStringNotContainsString( '--sgs-icon-shape-h', $css );
	}

	// ── Group shape and border in a social row ────────────────────────────────

	public function test_row_group_outline_and_dashed_border_reach_a_bound_linked_child(): void {
		$html = $this->run_child(
			'social-icons-render-child.php',
			array(
				'attributes' => (object) array(
					'childIconShape'          => 'hexagon',
					'childIconShowBackground' => true,
					'childIconBorderWidth'    => array( 'top' => '3px' ),
					'childIconBorderStyle'    => 'dashed',
				),
				'children'   => array(
					array(
						'attributes' => (object) array(
							'iconSource' => 'brand',
							'brandName'  => 'instagram',
							'colourMode' => 'theme',
						),
						'bind'       => 'socials.instagram',
					),
				),
				'site_info'  => self::SITE_INFO,
			)
		);
		$this->assertMatchesRegularExpression( '#<a class="sgs-icon__link" href="https://instagram\.com/shop"[^>]*><span class="sgs-icon__shape"><svg class="sgs-icon__outline"#', $html );
		$this->assertStringContainsString( 'sgs-icon--shape-hexagon', $html );
		$this->assertStringContainsString( 'sgs-icon--outline-dashed', $html );
		$this->assertStringContainsString( '--sgs-icon-outline-w:3px', $html );
		$this->assertStringNotContainsString( 'sgs-icon--group-border', $html, 'the box group border rule never paints an outline' );
	}

	// ── Stylesheet and registry ───────────────────────────────────────────────

	public function test_stylesheet_paints_the_outline_through_classes(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/icon/style.css' );
		$this->assertMatchesRegularExpression( '#\.sgs-icon\.sgs-icon--outline \.sgs-icon__shape,[^{]*\{\s*background-color: transparent;\s*background-image: none;\s*border-style: none;#', $css );
		$this->assertStringContainsString( 'vector-effect: non-scaling-stroke;', $css );
		$this->assertStringContainsString( 'stroke-width: calc(2 * var(--sgs-icon-outline-w, 0px));', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-icon--has-bg \.sgs-icon__outline-path \{\s*fill: var\(--sgs-icon-bg, var\(--sgs-si-bg,#', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-icon--boxed\.sgs-icon--shape-star \.sgs-icon__shape \{\s*inline-size: var\(--sgs-icon-shape-w, var\(--sgs-si-shape-w, calc\(2 \* var\(--sgs-icon-size-used\)\)\)\);#', $css, 'the star defaults to twice the icon' );
		$this->assertMatchesRegularExpression( '#@media \(forced-colors: active\) \{.*stroke: CanvasText;#s', $css );
		$this->assertMatchesRegularExpression( '#@media \(prefers-reduced-motion: reduce\) \{\s*\.sgs-icon__shape,\s*\.sgs-icon__link,\s*\.sgs-icon__outline-path \{#', $css );
	}

	public function test_both_enums_list_exactly_the_shapes_the_registry_reader_gives(): void {
		$this->load_helpers();
		$root   = dirname( __DIR__, 2 ) . '/src/blocks/';
		$icon   = json_decode( (string) file_get_contents( $root . 'icon/block.json' ), true );
		$social = json_decode( (string) file_get_contents( $root . 'social-icons/block.json' ), true );
		$this->assertSame( array_merge( array( 'square', 'circle', 'pill' ), self::OUTLINES ), sgs_icon_shape_slugs() );
		$this->assertSame( sgs_icon_shape_slugs(), $icon['attributes']['shape']['enum'] );
		$this->assertSame( array_merge( array( '' ), sgs_icon_shape_slugs() ), $social['attributes']['childIconShape']['enum'] );
		$this->assertSame( $this->registry(), array_column( sgs_icon_outline_shapes(), 'd', 'slug' ) );
		$this->assertTrue( sgs_icon_shape_width_only( 'circle' ) );
		$this->assertTrue( sgs_icon_shape_width_only( 'blob' ) );
		$this->assertFalse( sgs_icon_shape_width_only( 'pill' ) );
		$this->assertSame( '', sgs_icon_outline_svg( 'square', 'x' ) );
	}
}
