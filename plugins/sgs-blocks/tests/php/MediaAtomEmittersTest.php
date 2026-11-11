<?php
/**
 * Spec 49 C3 emitters of the media atoms: `sgs_media_atom_<id>_emit( $slot, $attrs, $uid, $helper )` for the new
 * `sizing`, `shape`, `filter` and `layout` atoms, the emitters of the atoms that already existed, the C4 disclosure
 * rules of the new atoms, and the FR-49-12 value helpers. The JS twins print the same CSS: that is held by
 * `scripts/tests/test-media-emitter-parity.mjs`. Sizing cases are `tests/fixtures/media/sizing-cases.json`.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter MediaAtomEmittersTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = '' ): string { // phpcs:ignore
		return $text;
	}
}

$sgs_plugin_dir = dirname( __DIR__, 2 );
require_once $sgs_plugin_dir . '/includes/media/media-values.php';
foreach ( glob( $sgs_plugin_dir . '/includes/media/atoms/*.php' ) as $sgs_atom_file ) {
	require_once $sgs_atom_file;
}
require_once $sgs_plugin_dir . '/includes/media/emit-none.php';

final class MediaAtomEmittersTest extends TestCase {

	private const SLOT = array( 'prefix' => 'm' );

	/**
	 * Attributes from settings keyed by base name, with the fixture's file as the Source.
	 *
	 * @param array $settings Settings by base name.
	 * @param array $file     File width and height.
	 * @return array
	 */
	private static function attrs( array $settings, array $file = array(
		'width'  => 1600,
		'height' => 900,
	) ): array {
		$attrs = array(
			'mSource' => array(
				'kind'   => 'image',
				'width'  => $file['width'],
				'height' => $file['height'],
			),
		);
		foreach ( $settings as $base => $value ) {
			$attrs[ 'm' . $base ] = $value;
		}
		return $attrs;
	}

	/**
	 * Parse emitted CSS into selector, device, property, value. Hover rules are skipped.
	 *
	 * @param string $css CSS.
	 * @return array
	 */
	private static function parse( string $css ): array {
		$out = array();
		preg_match_all( '/(?:@media\(max-width:(\d+)px\)\{)?([^{}@]+)\{([^{}]*)\}\}?/', $css, $rules, PREG_SET_ORDER );
		foreach ( $rules as $rule ) {
			$device = array(
				'1023' => 'tablet',
				'767'  => 'mobile',
			)[ $rule[1] ] ?? 'desktop';
			foreach ( array_filter( explode( ';', $rule[3] ) ) as $decl ) {
				$at                                           = strpos( $decl, ':' );
				$out[ $rule[2] ][ $device ][ substr( $decl, 0, $at ) ] = substr( $decl, $at + 1 );
			}
		}
		return $out;
	}

	/**
	 * Every case of sizing-cases.json.
	 *
	 * @return array<string,array{0:array}>
	 */
	public static function sizing_cases(): array {
		$fixture = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/media/sizing-cases.json' ), true );
		$cases   = array();
		foreach ( array_merge( $fixture['cases'], $fixture['responsive'] ) as $case ) {
			$cases[ $case['id'] ] = array( $case, $fixture['context']['file'] );
		}
		return $cases;
	}

	/**
	 * @dataProvider sizing_cases
	 *
	 * @param array $case Fixture case.
	 * @param array $file Default file.
	 */
	public function test_sizing_emitter_prints_the_fixture_declarations( array $case, array $file ): void {
		$split   = isset( $case['declarations']['layout'] ) || isset( $case['declarations']['surface'] );
		$slot    = array(
			'prefix'  => 'm',
			'wrapper' => $split,
		);
		$tiered  = static function ( array $decls ): array {
			return ( isset( $decls['desktop'] ) || isset( $decls['tablet'] ) || isset( $decls['mobile'] ) ) ? $decls : array( 'desktop' => $decls );
		};
		$want    = $split
			? array(
				'.u'                => $tiered( $case['declarations']['layout'] ?? array() ),
				'.u .sgs-media-box' => $tiered( $case['declarations']['surface'] ?? array() ),
			)
			: array( '.u' => $tiered( $case['declarations']['root'] ) );
		$got     = self::parse( sgs_media_atom_sizing_emit( $slot, self::attrs( $case['settings'], $case['file'] ?? $file ), 'u', (bool) $case['helper'] ) );
		foreach ( $want as $selector => $devices ) {
			$devices = array_filter( $devices );
			foreach ( $devices as $device => $decls ) {
				ksort( $decls );
				$have = $got[ $selector ][ $device ] ?? array();
				ksort( $have );
				$this->assertSame( $decls, $have, "{$case['id']} {$selector} {$device}" );
			}
			$this->assertSame( array_keys( $devices ), array_keys( $got[ $selector ] ?? array() ), "{$case['id']} {$selector} devices" );
		}
		$this->assertSame( count( array_filter( array_map( 'array_filter', $want ) ) ), count( $got ), "{$case['id']} selectors" );
	}

	public function test_sizing_prints_nothing_when_nothing_is_set_and_sorts_properties(): void {
		$this->assertSame( '', sgs_media_atom_sizing_emit( self::SLOT, array(), 'u', false ) );
		$css = sgs_media_atom_sizing_emit(
			self::SLOT,
			self::attrs(
				array(
					'Ratio'  => '1 / 1',
					'Height' => array(
						'desktop' => '300px',
						'mobile'  => '200px',
					),
				)
			),
			'u',
			false
		);
		$this->assertSame( '.u{aspect-ratio:1 / 1;height:300px;width:auto;}@media(max-width:767px){.u{height:200px;}}', $css );
	}

	public function test_sizing_disclosure_omits_ratio_only_where_height_is_match_its_space(): void {
		$attrs = self::attrs( array( 'Height' => array( 'mobile' => 'fill' ) ) );
		$this->assertSame( 'shown', sgs_media_atom_sizing_disclosure( $attrs, 'desktop', 'm' )['Ratio']['state'] );
		$this->assertSame( 'omitted', sgs_media_atom_sizing_disclosure( $attrs, 'mobile', 'm' )['Ratio']['state'] );
		$this->assertCount( 7, sgs_media_atom_sizing_disclosure( array(), 'desktop', 'm' ) );
	}

	public function test_shape_draws_radius_shapes_masks_corners_and_border(): void {
		$this->assertSame(
			'.u{border-radius:50%;}@media(max-width:1023px){.u{border-radius:9999px;}}',
			sgs_media_atom_shape_emit(
				self::SLOT,
				self::attrs(
					array(
						'Shape' => array(
							'desktop' => array( 'shape' => 'circle' ),
							'tablet'  => 'pill',
						),
					)
				),
				'u',
				false
			)
		);
		$mask = self::parse(
			sgs_media_atom_shape_emit(
				self::SLOT,
				self::attrs(
					array(
						'Shape' => array(
							'desktop' => array( 'shape' => 'hexagon', 'proportions' => 'stretch' ),
							'mobile'  => 'none',
						),
					)
				),
				'u',
				true
			)
		)['.u .sgs-media-box__mask'];
		$this->assertStringStartsWith( 'url("data:image/svg+xml,%3Csvg', $mask['desktop']['mask-image'] );
		$this->assertSame( '100% 100%', $mask['desktop']['mask-size'] );
		$this->assertSame(
			array(
				'-webkit-mask-image' => 'none',
				'mask-image'         => 'none',
			),
			array_map( 'strval', $mask['mobile'] )
		);
		$keep = sgs_media_atom_shape_emit( self::SLOT, self::attrs( array( 'Shape' => array( 'shape' => 'star', 'proportions' => 'keep' ) ) ), 'u', true ); // phpcs:ignore
		$this->assertStringContainsString( 'mask-size:contain;', $keep );
		$this->assertStringNotContainsString( 'preserveAspectRatio', rawurldecode( $keep ) );
		$corners = sgs_media_atom_shape_emit(
			self::SLOT,
			self::attrs(
				array(
					'Radius' => array(
						'desktop' => array(
							'topLeft'     => 8,
							'bottomRight' => '1rem',
						),
					),
					'Shape'  => array( 'tablet' => 'circle' ),
				)
			),
			'u',
			false
		);
		$this->assertSame( '.u{border-bottom-right-radius:1rem;border-top-left-radius:8px;}@media(max-width:1023px){.u{border-radius:50%;}}', $corners );
		$border = array(
			'BorderWidth'       => array(
				'top'    => 2,
				'right'  => 2,
				'bottom' => 2,
				'left'   => 2,
			),
			'BorderStyle'       => 'dashed',
			'BorderColour'      => '#f00',
			'BorderColourHover' => 'secondary',
		);
		$css    = sgs_media_atom_shape_emit( self::SLOT, self::attrs( $border ), 'u', false );
		$this->assertStringContainsString( '.u{border-bottom-width:2px;border-color:#f00;border-left-width:2px;border-right-width:2px;border-style:dashed;border-top-width:2px;}', $css );
		$this->assertStringContainsString( '@media(hover:hover){.u:hover{border-color:var(--wp--preset--color--secondary, currentColor);}}', $css );
		$this->assertStringNotContainsString( 'border-', sgs_media_atom_shape_emit( self::SLOT, self::attrs( $border + array( 'Shape' => array( 'shape' => 'hexagon' ) ) ), 'u', true ) );
	}

	public function test_shape_disclosure_follows_the_shape(): void {
		$this->assertSame( 'shown', sgs_media_atom_shape_disclosure( array(), 'desktop', 'm' )['Radius']['state'] );
		$this->assertSame( 'disabled', sgs_media_atom_shape_disclosure( array(), 'desktop', 'm' )['BorderStyle']['state'] );
		$circle = sgs_media_atom_shape_disclosure( self::attrs( array( 'Shape' => 'circle' ) ), 'desktop', 'm' );
		$this->assertSame( 'omitted', $circle['Radius']['state'] );
		$this->assertSame( 'shown', $circle['BorderWidth']['state'] );
		$mask = sgs_media_atom_shape_disclosure( self::attrs( array( 'Shape' => array( 'shape' => 'hexagon' ) ) ), 'desktop', 'm' );
		$this->assertSame( array( 'omitted', 'omitted', 'omitted' ), array( $mask['BorderWidth']['state'], $mask['BorderStyle']['state'], $mask['BorderColour']['state'] ) );
	}

	public function test_filter_prints_the_treatment_and_cancels_it(): void {
		$css = sgs_media_atom_filter_emit(
			self::SLOT,
			self::attrs(
				array(
					'Colour'    => array(
						'desktop' => 'greyscale',
						'tablet'  => 'white',
						'mobile'  => 'natural',
					),
					'Greyscale' => 60,
				)
			),
			'u',
			false
		);
		$this->assertSame( '.u{filter:grayscale(60%);}@media(max-width:1023px){.u{filter:brightness(0) invert(1);}}@media(max-width:767px){.u{filter:none;}}', $css );
		$this->assertSame( '.u .sgs-media-el{filter:grayscale(100%);}', sgs_media_atom_filter_emit( self::SLOT, self::attrs( array( 'Colour' => 'greyscale' ) ), 'u', true ) );
		$this->assertSame( '', sgs_media_atom_filter_emit( self::SLOT, self::attrs( array( 'Colour' => 'natural' ) ), 'u', false ) );
		$this->assertSame( 'shown', sgs_media_atom_filter_disclosure( self::attrs( array( 'Colour' => 'greyscale' ) ), 'desktop', 'm' )['Greyscale']['state'] );
		$this->assertSame( 'omitted', sgs_media_atom_filter_disclosure( self::attrs( array( 'Colour' => 'white' ) ), 'desktop', 'm' )['Greyscale']['state'] );
	}

	public function test_layout_prints_alignment_and_clamped_order(): void {
		$css = sgs_media_atom_layout_emit(
			self::SLOT,
			self::attrs(
				array(
					'Alignment' => array(
						'desktop' => 'center',
						'mobile'  => 'end',
					),
					'Order'     => array(
						'desktop' => -3,
						'mobile'  => 25,
					),
				)
			),
			'u',
			false
		);
		$this->assertSame( '.u{margin-inline-end:auto;margin-inline-start:auto;order:-3;}@media(max-width:767px){.u{margin-inline-end:0;margin-inline-start:auto;order:20;}}', $css );
		$this->assertSame( '', sgs_media_atom_layout_emit( self::SLOT, self::attrs( array( 'Alignment' => 'sideways' ) ), 'u', false ) );
	}

	public function test_existing_atoms_print_real_properties_on_the_c3_nodes(): void {
		$this->assertSame(
			'.u .sgs-media-el{mix-blend-mode:multiply;}@media(max-width:1023px){.u .sgs-media-el{opacity:0.4;}}',
			sgs_media_atom_opacity_emit(
				self::SLOT,
				self::attrs(
					array(
						'Opacity' => array(
							'desktop' => 100,
							'tablet'  => 40,
						),
						'Blend'   => 'multiply',
					)
				),
				'u',
				true
			)
		);
		$this->assertSame(
			'.u{object-position:30% 70%;}',
			sgs_media_atom_focal_point_emit(
				self::SLOT,
				self::attrs(
					array(
						'Focal' => array(
							'x' => 0.3,
							'y' => 0.7,
						),
					)
				),
				'u',
				false
			)
		);
		$this->assertSame(
			'.u{object-fit:contain;}@media(max-width:767px){.u{background-repeat:repeat;background-size:80px;}}',
			sgs_media_atom_object_fit_emit(
				self::SLOT,
				self::attrs(
					array(
						'Fit'      => array(
							'desktop' => 'contain',
							'mobile'  => 'tile',
						),
						'TileSize' => '80px',
					)
				),
				'u',
				false
			)
		);
		$overlay = self::attrs(
			array(
				'OverlayColour'      => '#000',
				'OverlayColourHover' => '#111',
			)
		);
		$this->assertSame( '', sgs_media_atom_overlay_emit( self::SLOT, $overlay, 'u', false ) );
		$css = sgs_media_atom_overlay_emit( self::SLOT, $overlay, 'u', true );
		$this->assertStringStartsWith( '.u::after{background-color:#000;}', $css );
		$this->assertStringContainsString( '@media(hover:hover){.u:hover::after{background-color:#111;}}', $css );
		$shadow = self::attrs(
			array(
				'BoxShadow'       => '0 4px 12px',
				'BoxShadowColour' => '#00000040',
			)
		);
		$this->assertStringContainsString( 'box-shadow:0px 4px 12px 0px #00000040;', sgs_media_atom_shadow_emit( self::SLOT, $shadow, 'u', false ) );
		$this->assertStringContainsString( 'filter:drop-shadow(0px 4px 12px #00000040)', sgs_media_atom_shadow_emit( self::SLOT, $shadow + array( 'mShape' => array( 'shape' => 'hexagon' ) ), 'u', true ) );
		$this->assertSame( '.u{background-color:var(--wp--preset--color--primary, currentColor);padding-top:10px;}', sgs_media_atom_media_padding_emit( self::SLOT, self::attrs( array( 'Padding' => array( 'top' => 10 ), 'Background' => 'primary' ) ), 'u', false ) ); // phpcs:ignore
		$this->assertSame( '.u{text-shadow:0 1px 3px rgba(0,0,0,.6);z-index:1;}', sgs_media_atom_svg_presentation_emit( self::SLOT, self::attrs( array( 'SvgLayer' => 'front', 'SvgTextShadow' => true ) ), 'u', false ) ); // phpcs:ignore
	}

	public function test_atoms_that_print_no_css_return_an_empty_string(): void {
		$attrs = self::attrs( array( 'Height' => '300px', 'Alt' => 'x', 'Caption' => 'y' ) ); // phpcs:ignore
		foreach ( array( 'source', 'meaning', 'caption', 'link', 'video_behaviour', 'box_shape' ) as $id ) {
			$this->assertSame( '', ( 'sgs_media_atom_' . $id . '_emit' )( self::SLOT, $attrs, 'u', true ), $id );
		}
	}

	public function test_length_refuses_a_bare_number_unpaired_quotes_and_adjacent_terms(): void {
		foreach ( array( '10', '10 px', 'min(10px 20px)', "var(--a, ')", 'var(--a, "x)', 'clamp(1rem 2rem, 1vw, 3rem)', '10px;}body{display:none' ) as $bad ) {
			$this->assertSame( '', sgs_media_length( $bad ), $bad );
		}
		foreach ( array( '10px', 'calc(100% - 2rem)', 'clamp(1rem, 2vw + 1rem, 3rem)', 'min(100%, 40rem)', "var(--a, 'x y')", 'max(10px, 1vw)' ) as $good ) {
			$this->assertSame( $good, sgs_media_length( $good ), $good );
		}
		$this->assertSame( 'auto', sgs_media_length( 'auto', array( 'auto' ) ) );
	}

	public function test_the_shared_length_helper_carries_the_new_checks_for_every_caller(): void {
		$this->assertSame( '', sgs_css_length_value( 'min(10px 20px)' ) );
		$this->assertSame( '', sgs_css_length_value( "var(--a, ')" ) );
		$this->assertSame( 'min(1px,2px) 3px', sgs_css_length_value( 'min(1px,2px) 3px' ) );
		$this->assertSame( '16px 12px', sgs_css_length_value( '16px 12px' ) );
		$this->assertSame( '24px', sgs_css_length_value( '24' ) );
	}

	public function test_colour_gradient_shadow_filter_and_url_helpers(): void {
		$this->assertSame( 'rgba(0,0,0,.5)', sgs_media_colour( 'rgba(0,0,0,.5)' ) );
		$this->assertSame( 'red', sgs_media_colour( 'red' ) );
		$this->assertSame( 'var(--wp--preset--color--primary, currentColor)', sgs_media_colour( 'primary' ) );
		$this->assertSame( '', sgs_media_colour( 'red;background:url(x)' ) );
		$this->assertSame( '', sgs_media_colour( 'rgb(0,0,0' ) );
		$this->assertSame( '', sgs_media_gradient( 'linear-gradient(red, blue);x:y' ) );
		$this->assertSame( '0px 8px 24px 0px #00000040', sgs_media_shadow( '0 8px 24px', 'rgba(0,0,0,.25)' ) );
		$this->assertSame( 'grayscale(100%)', sgs_media_filter( 'greyscale', 250 ) );
		$this->assertSame( '', sgs_media_filter( 'natural', 50 ) );
		$this->assertSame( 'https://example.com/a.jpg', sgs_media_url( 'https://example.com/a.jpg' ) );
		foreach ( array( 'javascript:alert(1)', 'data:text/html,<script>', '" onerror="alert(1)', '//evil.test/x' ) as $bad ) {
			$this->assertSame( '', sgs_media_url( $bad ), $bad );
		}
	}

	public function test_every_refused_breakout_stays_out_of_every_emitter(): void {
		$fixture = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/media/breakouts.json' ), true );
		$bases   = array( 'Height', 'Width', 'MaxWidth', 'Ratio', 'OverlayColour', 'OverlayGradient', 'Background', 'BorderColour', 'BoxShadowColour', 'Blend', 'Alignment' );
		$atoms   = array( 'sizing', 'shape', 'filter', 'layout', 'object_fit', 'focal_point', 'media_padding', 'shadow', 'opacity', 'overlay', 'svg_presentation' );
		foreach ( $fixture['refuse']['any'] as $bad ) {
			foreach ( $bases as $base ) {
				$attrs = self::attrs(
					array(
						$base         => $bad,
						'BorderWidth' => array( 'top' => 2 ),
					)
				);
				foreach ( $atoms as $atom ) {
					$css = ( 'sgs_media_atom_' . $atom . '_emit' )( self::SLOT, $attrs, 'u', true );
					$this->assertSame( substr_count( $css, '{' ), substr_count( $css, '}' ), "$atom $base" );
					$this->assertStringNotContainsString( 'javascript:', $css );
					$this->assertStringNotContainsString( '</style', $css );
					$this->assertStringNotContainsString( $bad, $css, "$atom printed a refused value for $base" );
				}
			}
		}
	}
}
