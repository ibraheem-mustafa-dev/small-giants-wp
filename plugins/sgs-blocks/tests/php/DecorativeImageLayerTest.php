<?php
/**
 * sgs/decorative-image as the Floating layer (Spec 02 FR-2-6).
 *
 * Runs the REAL render.php through the QA harness (scripts/qa/lib/render-css-harness.php) in a child PHP process.
 * The harness applies no block.json defaults, so each test passes exactly the attributes it means to. Inner content
 * reaches the render through the harness's `--content` option from this file's own helper.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class DecorativeImageLayerTest extends TestCase {

	private const CONTENT = '<p class=sgs-test-copy>Baked to order</p>';

	private const IMAGE = array(
		'layerSource' => array(
			'desktop' => array(
				'kind'   => 'image',
				'id'     => 0,
				'url'    => 'https://example.test/uploads/photo.jpg',
				'width'  => 600,
				'height' => 400,
			),
		),
	);

	/**
	 * Render the real block with optional inner content.
	 *
	 * @param array<string, mixed> $attrs   Block attributes.
	 * @param string               $content Rendered inner blocks.
	 * @return array{html: string, css: string}
	 */
	private function render_layer( array $attrs, string $content = '' ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsdi' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/decorative-image'
				. ' --attrs-file ' . escapeshellarg( $file );
			if ( '' !== $content ) {
				$cmd .= ' --content ' . escapeshellarg( $content );
			}
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );

		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}

	public function test_content_only_renders_a_layer_div_with_the_content_and_no_hiding(): void {
		$out = $this->render_layer(
			array(
				'rotation' => array( 'desktop' => 12 ),
				'layerWidth' => array( 'desktop' => 'max-content' ),
			),
			self::CONTENT
		);

		$this->assertMatchesRegularExpression( '/<div class="sgs-decorative-image sgs-decorative-image--layer sgs-di-/', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-decorative-image--over-image', $out['html'] );
		$this->assertStringContainsString( '<div class="sgs-decorative-image__content">' . self::CONTENT . '</div>', $out['html'] );
		$this->assertStringNotContainsString( 'aria-hidden', $out['html'] );
		$this->assertStringNotContainsString( 'role=', $out['html'] );
		$this->assertStringContainsString( 'rotate(12deg)', $out['css'] );
	}

	public function test_image_plus_content_marks_over_image_and_hides_only_the_img(): void {
		$out = $this->render_layer( self::IMAGE + array( 'layerDecorative' => true ), self::CONTENT );

		$this->assertStringContainsString( 'sgs-decorative-image--layer', $out['html'] );
		$this->assertStringContainsString( 'sgs-decorative-image--over-image', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], 'aria-hidden' ), 'only the <img> is hidden' );
		$this->assertMatchesRegularExpression( '/<img [^>]*aria-hidden="true"/', $out['html'] );
		$this->assertMatchesRegularExpression( '/<img [^>]*class="sgs-media-el sgs-media sgs-media--renderer sgs-di-[a-f0-9]{8}-m"/', $out['html'] );
		$this->assertMatchesRegularExpression( '/<img [^>]*alt=""/', $out['html'] );
		$this->assertStringContainsString( self::CONTENT, $out['html'] );
		$this->assertLessThan(
			strpos( $out['html'], 'sgs-decorative-image__content' ),
			strpos( $out['html'], '<img' ),
			'the content box follows the image'
		);
	}

	public function test_a_meaningful_image_keeps_its_alt_and_stays_readable(): void {
		$out = $this->render_layer(
			self::IMAGE + array(
				'layerDecorative' => false,
				'layerAlt'        => 'A tray of cookies',
			),
			self::CONTENT
		);

		$this->assertStringNotContainsString( 'aria-hidden', $out['html'] );
		$this->assertMatchesRegularExpression( '/<img [^>]*alt="A tray of cookies"/', $out['html'] );
	}

	public function test_nothing_at_all_renders_nothing(): void {
		$out = $this->render_layer( array( 'layerWidth' => array( 'desktop' => 'max-content' ) ) );

		$this->assertSame( '', trim( $out['html'] ) );
	}

	public function test_image_only_keeps_the_naked_img_root(): void {
		$out = $this->render_layer( self::IMAGE );

		$this->assertMatchesRegularExpression( '/^<style>.*<\/style><img [^>]*class="sgs-media-el sgs-media sgs-media--renderer sgs-di-[a-f0-9]{8} sgs-decorative-image/s', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-decorative-image--layer', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-decorative-image__content', $out['html'] );
		$this->assertStringContainsString( 'aria-hidden="true"', $out['html'] );
	}

	public function test_fit_the_content_is_max_content_capped_at_the_parent(): void {
		$out = $this->render_layer( array( 'layerWidth' => array( 'desktop' => 'max-content' ) ), self::CONTENT );

		$this->assertStringContainsString( 'width:max-content;max-width:100%', $out['css'] );
		$this->assertStringNotContainsString( '@media(max-width:1023px){.sgs-di', $out['css'], 'nothing to change on narrower devices' );
	}

	public function test_fit_the_content_on_desktop_and_a_fixed_width_on_mobile_lifts_the_cap_there(): void {
		$out = $this->render_layer( array( 'layerWidth' => array( 'desktop' => 'max-content', 'mobile' => '300px' ) ), self::CONTENT );

		$this->assertStringContainsString( 'width:max-content;max-width:100%', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{width:300px;max-width:none;/', $out['css'] );
	}

	public function test_a_length_width_takes_its_unit_at_every_device(): void {
		$out = $this->render_layer(
			array(
				'layerWidth' => array(
					'desktop' => '60%',
					'tablet'  => '40%',
					'mobile'  => '18rem',
				),
			),
			self::CONTENT
		);

		$this->assertMatchesRegularExpression( '/\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{[^}]*width:60%;/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:1023px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{width:40%;/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{width:18rem;/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/[;{]max-width:/', $out['css'], 'no cap the client did not set' );
	}

	public function test_an_unset_width_is_the_200px_default_and_an_unsafe_one_falls_back_to_it(): void {
		$this->assertStringContainsString( 'width:200px', $this->render_layer( array(), self::CONTENT )['css'] );
		$bad = $this->render_layer( array( 'layerWidth' => array( 'desktop' => '1px;}body{color:red' ) ), self::CONTENT )['css'];
		$this->assertStringNotContainsString( 'body{', $bad );
		$this->assertStringContainsString( 'width:200px', $bad );
	}

	public function test_a_picture_alone_hands_its_size_to_the_media_atoms(): void {
		$capped = $this->render_layer(
			self::IMAGE + array(
				'layerWidth'    => array( 'desktop' => '240px' ),
				'layerMaxWidth' => array(
					'desktop' => '30%',
					'mobile'  => '12rem',
				),
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-di-[a-f0-9]{8}\{max-width:30%;width:240px;\}/', $capped['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{\.sgs-di-[a-f0-9]{8}\{max-width:12rem;\}\}/', $capped['css'] );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-decorative-image\{[^}]*width:/', $capped['css'], 'the layer rule carries no size: the atoms own it' );

		$free = $this->render_layer( self::IMAGE + array( 'layerWidth' => array( 'desktop' => '240px' ) ) );
		$this->assertStringContainsString( 'width:240px', $free['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-di-[a-f0-9]{8}\{max-width:none\}/', $free['css'], 'no cap the client did not set: the media base cap is lifted' );
		$this->assertDoesNotMatchRegularExpression( '/max-width:(?!none)/', $free['css'] );
	}

	public function test_a_max_width_replaces_fit_the_contents_parent_cap(): void {
		$out = $this->render_layer(
			array(
				'layerWidth'    => array( 'desktop' => 'max-content' ),
				'layerMaxWidth' => array( 'desktop' => '320px' ),
			),
			self::CONTENT
		);
		$this->assertStringContainsString( 'width:max-content;max-width:320px', $out['css'] );
	}

	public function test_auto_width_on_a_layer_that_holds_blocks_fits_the_content(): void {
		$out = $this->render_layer( array( 'layerWidth' => array( 'desktop' => 'auto' ) ), self::CONTENT );
		$this->assertStringContainsString( 'width:max-content;max-width:100%', $out['css'] );
	}

	/**
	 * The decorative ring a draft draws with an empty element: 340px square, a 2px translucent
	 * border, a 50% radius, nothing inside.
	 *
	 * @return array<string, mixed>
	 */
	private function ring_attrs(): array {
		return array(
			'layerWidth'        => array( 'desktop' => '340px' ),
			'layerHeight'       => array( 'desktop' => '340px' ),
			'layerBorderWidth'  => array(
				'top'    => '2px',
				'right'  => '2px',
				'bottom' => '2px',
				'left'   => '2px',
			),
			'layerBorderStyle'  => 'solid',
			'layerBorderColour' => 'rgba(216,202,80,.55)',
			'layerRadius'       => array(
				'desktop' => array(
					'topLeft'     => '50%',
					'topRight'    => '50%',
					'bottomRight' => '50%',
					'bottomLeft'  => '50%',
				),
			),
		);
	}

	public function test_an_empty_layer_with_a_border_and_radius_renders_the_ring(): void {
		$out = $this->render_layer( $this->ring_attrs() );

		$this->assertMatchesRegularExpression(
			'#<span class="sgs-decorative-image sgs-decorative-image--shape sgs-di-[a-f0-9]{8}" aria-hidden="true" role="presentation"></span>#',
			$out['html'],
			'the empty layer is one hidden span'
		);
		$this->assertStringContainsString( 'width:340px', $out['css'] );
		$this->assertStringContainsString( 'height:340px', $out['css'] );
		$this->assertStringContainsString( 'border-style:solid', $out['css'] );
		$this->assertStringContainsString( 'border-width:2px 2px 2px 2px', $out['css'] );
		$this->assertMatchesRegularExpression( '/border-color:#D8CA50/i', $out['css'] );
		foreach ( array( 'top-left', 'top-right', 'bottom-right', 'bottom-left' ) as $corner ) {
			$this->assertStringContainsString( 'border-' . $corner . '-radius:50%', $out['css'] );
		}
		$this->assertStringNotContainsString( 'style="', $out['html'], 'no inline style attribute' );
	}

	public function test_an_empty_layer_with_a_height_or_radius_alone_draws_nothing_so_renders_nothing(): void {
		$attrs = $this->ring_attrs();
		unset( $attrs['layerBorderWidth'], $attrs['layerBorderColour'] );
		$out = $this->render_layer( $attrs );

		$this->assertSame( '', trim( $out['html'] ) );
	}

	/**
	 * The rule for when an empty layer draws is one table, shared with the canvas twin
	 * (tests/js/decorative-image-layer-preview.test.js reads the same file).
	 *
	 * @return array<string, array{0: array<string, mixed>, 1: bool}>
	 */
	public static function empty_layer_cases(): array {
		$cases = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/decorative-image-paints-box.json' ), true, 512, JSON_THROW_ON_ERROR );
		$out   = array();
		foreach ( $cases as $case ) {
			$out[ $case['name'] ] = array( $case['attrs'], $case['paints'] );
		}
		return $out;
	}

	/**
	 * @dataProvider empty_layer_cases
	 * @param array<string, mixed> $attrs  Layer attributes (no media, no content).
	 * @param bool                 $paints Whether the layer draws.
	 */
	public function test_an_empty_layer_draws_exactly_when_the_shared_table_says( array $attrs, bool $paints ): void {
		$out = $this->render_layer( $attrs );

		$this->assertSame( $paints, '' !== trim( $out['html'] ) );
	}

	public function test_tier_widths_come_from_the_shared_breakpoints_not_literals(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/decorative-image/render.php' );

		$this->assertDoesNotMatchRegularExpression( '/=>\s*(?:1023|767)\b/', $source, 'no tier width literal in render.php' );
		$this->assertStringContainsString( 'SGS_Breakpoints::max_for_tier', $source );

		$out = $this->render_layer(
			array_merge(
				$this->ring_attrs(),
				array(
					'layerRadius' => array(
						'tablet' => array( 'topLeft' => '8px' ),
						'mobile' => array( 'topLeft' => '4px' ),
					),
				)
			)
		);
		$this->assertStringContainsString( '@media(max-width:' . SGS_Breakpoints::TABLET_MAX . 'px)', $out['css'] );
		$this->assertStringContainsString( '@media(max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px)', $out['css'] );
	}

	public function test_an_unsafe_max_width_prints_nothing(): void {
		$out = $this->render_layer( self::IMAGE + array( 'layerMaxWidth' => array( 'desktop' => '1px;}body{color:red' ) ) );
		$this->assertStringNotContainsString( 'body{', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/max-width:(?!none)/', $out['css'] );
	}

	public function test_an_empty_layer_with_only_a_fill_or_a_shadow_renders(): void {
		$fill = $this->render_layer(
			array(
				'layerHeight'     => array( 'desktop' => '80px' ),
				'layerBackground' => '#112233',
			)
		);
		$this->assertStringContainsString( 'sgs-decorative-image--shape', $fill['html'] );
		$this->assertStringContainsString( 'background-color:#112233', $fill['css'] );
		$this->assertStringContainsString( 'height:80px', $fill['css'] );

		$shadow = $this->render_layer(
			array(
				'layerBoxShadow'       => '0 4px 12px',
				'layerBoxShadowColour' => '#000000',
			)
		);
		$this->assertStringContainsString( 'sgs-decorative-image--shape', $shadow['html'] );
		$this->assertStringContainsString( 'box-shadow:', $shadow['css'] );
	}

	public function test_a_radius_drawn_shape_becomes_the_corners_of_a_box_layer(): void {
		$expected = array(
			'circle'  => '50%',
			'ellipse' => '50%',
			'pill'    => '9999px',
		);
		foreach ( $expected as $shape => $radius ) {
			$attrs                    = $this->ring_attrs();
			$attrs['layerShape']      = array( 'desktop' => array( 'shape' => $shape ) );
			$attrs['layerBackground'] = '#112233';
			$out                      = $this->render_layer( $attrs );

			$this->assertStringContainsString( 'sgs-decorative-image--shape', $out['html'], $shape . ': the empty layer still renders' );
			$this->assertMatchesRegularExpression(
				'/\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{[^}]*border-radius:' . preg_quote( $radius, '/' ) . '[;}]/',
				$out['css'],
				$shape . ': the corners are on the layer root rule'
			);
			$this->assertStringContainsString( 'background-color:#112233', $out['css'], $shape . ': the fill paints in the shape' );
			$this->assertStringContainsString( 'border-style:solid', $out['css'], $shape . ': the border paints in the shape' );
			$this->assertStringNotContainsString( 'clip-path', $out['css'], $shape . ': the clip-path presets are gone' );
			$this->assertSame( 1, substr_count( $out['css'], 'width:340px' ), $shape . ': one width' );
		}
	}

	public function test_no_shape_or_a_non_radius_shape_prints_no_corner_override(): void {
		foreach ( array( null, 'none', 'hexagon', '' ) as $shape ) {
			$attrs = $this->ring_attrs();
			if ( null !== $shape ) {
				$attrs['layerShape'] = array( 'desktop' => array( 'shape' => $shape ) );
			}
			$out = $this->render_layer( $attrs );

			$this->assertDoesNotMatchRegularExpression( '/border-radius:/', $out['css'], var_export( $shape, true ) . ' prints no corner shorthand' );
			$this->assertStringNotContainsString( 'clip-path', $out['css'] );
		}
	}

	public function test_a_shape_alone_draws_nothing_so_an_empty_layer_renders_nothing(): void {
		$out = $this->render_layer(
			array(
				'layerShape'  => array( 'desktop' => array( 'shape' => 'circle' ) ),
				'layerHeight' => array( 'desktop' => '80px' ),
			)
		);

		$this->assertSame( '', trim( $out['html'] ) );
	}

	public function test_a_mask_shape_on_a_picture_prints_the_helper_around_it(): void {
		$out = $this->render_layer( self::IMAGE + array( 'layerShape' => array( 'desktop' => array( 'shape' => 'hexagon' ) ) ) );

		$this->assertMatchesRegularExpression( '/<span class="sgs-media-box sgs-media sgs-media--renderer sgs-di-[a-f0-9]{8} sgs-decorative-image"/', $out['html'] );
		$this->assertStringContainsString( 'sgs-media-box__mask', $out['html'] );
		$this->assertStringContainsString( 'mask-image', $out['css'] );
	}

	public function test_a_layer_that_holds_blocks_paints_its_own_box_and_the_picture_inside_fills_it(): void {
		$out = $this->render_layer(
			self::IMAGE + array(
				'layerWidth'       => array( 'desktop' => '300px' ),
				'layerOpacity'     => array( 'desktop' => 40 ),
				'layerBorderWidth' => array( 'top' => '1px' ),
				'layerBackground'  => '#112233',
			),
			self::CONTENT
		);

		$this->assertMatchesRegularExpression( '/\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{[^}]*width:300px[^}]*opacity:var\(--sgs-di-op, 0\.4\)[^}]*background-color:#112233/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-di-[a-f0-9]{8} \.sgs-media-el\{display:block;width:100%;height:auto\}/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-di-[a-f0-9]{8}-m\{[^}]*(width|opacity|border|background-color)/', $out['css'], 'the picture paints none of the settings the layer root paints' );
	}

	public function test_a_fading_layer_reads_its_opacity_from_the_scroll_variable_and_is_marked(): void {
		$out = $this->render_layer(
			self::IMAGE + array(
				'fadeOnScroll' => true,
				'layerOpacity' => array( 'desktop' => 80 ),
			)
		);

		$this->assertStringContainsString( 'opacity:var(--sgs-di-op, 0.8)', $out['css'] );
		$this->assertStringContainsString( 'data-fade-on-scroll="true"', $out['html'] );

		$still = $this->render_layer( self::IMAGE );
		$this->assertStringNotContainsString( '--sgs-di-op', $still['css'], 'no fade, no variable' );
		$this->assertStringNotContainsString( 'data-fade-on-scroll', $still['html'] );
	}

	public function test_box_tiers_print_inside_their_device_queries(): void {
		$attrs                = $this->ring_attrs();
		$attrs['layerHeight'] = array(
			'desktop' => '340px',
			'tablet'  => '240px',
			'mobile'  => '120px',
		);
		$out = $this->render_layer( $attrs );

		$this->assertMatchesRegularExpression( '/@media\(max-width:1023px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{[^}]*height:240px/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{[^}]*height:120px/', $out['css'] );
	}

	public function test_the_legacy_attributes_and_the_video_branch_are_gone_from_the_render(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/decorative-image/render.php' );

		foreach ( array( 'decorMedia', 'imageUrl', 'imageId', 'imageDecorative', 'hideOnTablet', 'hideOnMobile', 'box_shape' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $source, $needle );
		}
		$this->assertDoesNotMatchRegularExpression( '/sgs_(render_media|responsive_image|image_loading_attrs)/', $source, 'the legacy media helpers are gone' );
		// An old-shape layer holds no media and no content, so it draws nothing: there is no legacy fallback.
		$out = $this->render_layer(
			array(
				'imageUrl'   => 'https://example.test/uploads/photo.jpg',
				'imageId'    => 0,
				'decorMedia' => array(
					'url'  => 'https://example.test/v.mp4',
					'type' => 'video',
				),
			)
		);
		$this->assertSame( '', trim( $out['html'] ) );
	}

	public function test_edge_offsets_on_both_axes_replace_the_centre_model(): void {
		$attrs                  = $this->ring_attrs();
		$attrs['positionTop']   = array( 'desktop' => '-110px' );
		$attrs['positionRight'] = array( 'desktop' => '-90px' );
		$attrs['positionX']     = array( 'desktop' => 30 );
		$out                    = $this->render_layer( $attrs );

		$this->assertMatchesRegularExpression( '/\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{position:absolute;top:-110px;right:-90px;/', $out['css'] );
		$this->assertStringNotContainsString( 'left:', $out['css'] );
		$this->assertStringNotContainsString( 'top:50%', $out['css'] );
		$this->assertStringNotContainsString( 'translate', $out['css'] );
		$this->assertStringContainsString( 'transform:none', $out['css'] );
	}

	public function test_one_anchored_axis_keeps_the_other_axis_centred(): void {
		$attrs                = $this->ring_attrs();
		$attrs['positionTop'] = array( 'desktop' => '24px' );
		$attrs['positionX']   = array( 'desktop' => 30 );
		$attrs['rotation']    = array( 'desktop' => 15 );
		$out                  = $this->render_layer( $attrs );

		$this->assertMatchesRegularExpression( '/\{position:absolute;left:30%;top:24px;/', $out['css'] );
		$this->assertStringContainsString( 'transform:translateX(-50%) rotate(15deg)', $out['css'] );
	}

	public function test_edge_tiers_print_in_their_device_queries_and_mute_the_centre_tiers(): void {
		$attrs                   = $this->ring_attrs();
		$attrs['positionBottom'] = array(
			'desktop' => '-60px',
			'tablet'  => '-40px',
			'mobile'  => '-2rem',
		);
		$attrs['positionY']      = array(
			'desktop' => 50,
			'tablet'  => 20,
		);
		$out                     = $this->render_layer( $attrs );

		$this->assertMatchesRegularExpression( '/@media\(max-width:1023px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{bottom:-40px/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{\.sgs-di-[a-f0-9]{8}\.sgs-decorative-image\{bottom:-2rem/', $out['css'] );
		$this->assertStringNotContainsString( 'top:20%', $out['css'], 'an anchored axis prints no centre tier' );
		$this->assertStringContainsString( 'transform:translateX(-50%)', $out['css'] );
	}

	public function test_an_unsafe_edge_value_prints_nothing_and_leaves_the_axis_centred(): void {
		$attrs                 = $this->ring_attrs();
		$attrs['positionLeft'] = array( 'desktop' => '1px;}body{color:red' );
		$out                   = $this->render_layer( $attrs );

		$this->assertStringNotContainsString( 'body{', $out['css'] );
		$this->assertStringContainsString( 'left:50%', $out['css'] );
		$this->assertStringContainsString( 'transform:translate(-50%, -50%)', $out['css'] );
	}

	public function test_opacity_falls_back_to_fully_opaque(): void {
		$out = $this->render_layer( array(), self::CONTENT );

		$this->assertStringContainsString( 'opacity:var(--sgs-di-op, 1)', $out['css'] );
	}
}
