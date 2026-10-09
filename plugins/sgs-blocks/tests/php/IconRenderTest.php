<?php
/**
 * sgs/icon render (icon plan Phase A steps 6-10): hostile lengths and colours never reach the scoped CSS, a link
 * bound to an empty Site Info key hides for visitors but shows dimmed in the editor, the accessible-name chain,
 * brand colours with the D5 contrast fallback, the radius only on the square, the 44px target and motion rules,
 * and the PHP half of the brand registry parity check.
 *
 * Renders run in a child process (tests/php/fixtures/icon-render-child.php) so render.php's stubs never collide
 * with another test's. Negative control: test_negative_control_unsafe_length_is_visible_to_the_probe proves the
 * hostile-length probe sees an unsafe value when one is present, so its "absent" verdicts are not vacuous.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconRenderTest extends TestCase {

	private const SITE_INFO = array(
		'phone'   => '0121 729 8233',
		'email'   => 'hello@example.test',
		'socials' => array(
			'whatsapp'  => '07700 900123',
			'instagram' => '@shop',
		),
	);

	/**
	 * Render the real render.php in a child process.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $bind       Site Info key linkUrl is bound to.
	 * @param array  $request    admin / rest / context / can_edit flags.
	 * @return string Rendered HTML (style tag included).
	 */
	private function render( array $attributes, string $bind = '', array $request = array() ): string {
		$spec = array_merge(
			array(
				'attributes' => (object) $attributes,
				'bind'       => $bind,
				'site_info'  => self::SITE_INFO,
			),
			$request
		);
		$file = tempnam( sys_get_temp_dir(), 'sgsicon' );
		file_put_contents( $file, json_encode( $spec, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/icon-render-child.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	private function css( string $html ): string {
		return preg_match( '#<style>(.*?)</style>#s', $html, $m ) ? $m[1] : '';
	}

	private function load_registry_helpers(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-brand-glyphs.php';
	}

	// ── Step 7: render safety ─────────────────────────────────────────────────

	/** @return array<string, array{0: mixed, 1: string}> */
	public static function hostile_lengths(): array {
		return array(
			'breakout'        => array( '40px;}body{color:red', '' ),
			'calc'            => array( 'calc(100% - 1px)', '' ),
			'negative'        => array( '-5px', '' ),
			'exponent'        => array( '1e3px', '' ),
			'keyword'         => array( 'inherit', '' ),
			'url'             => array( 'url(x)', '' ),
			'unknown unit'    => array( '20vw', '' ),
			'too big'         => array( '9999px', '512px' ),
			'too big rem'     => array( '99rem', '32rem' ),
			'plain number'    => array( 24, '24px' ),
			'spacing preset'  => array( 'var(--wp--preset--spacing--50)', 'var(--wp--preset--spacing--50)' ),
			'fake preset var' => array( 'var(--x);}a{b:c}', '' ),
		);
	}

	/**
	 * A stored icon size reaches the CSS only through the allowlist.
	 *
	 * @param mixed  $raw      Stored icon size.
	 * @param string $expected The length the CSS carries, '' for none.
	 */
	#[\PHPUnit\Framework\Attributes\DataProvider( 'hostile_lengths' )]
	public function test_icon_size_passes_the_allowlist( $raw, string $expected ): void {
		$css = $this->css( $this->render( array( 'iconSize' => array( 'desktop' => $raw ) ) ) );
		if ( '' === $expected ) {
			$this->assertStringNotContainsString( '--sgs-icon-size', $css );
		} else {
			$this->assertStringContainsString( '--sgs-icon-size:' . $expected . ';', $css );
		}
		$this->assertStringNotContainsString( 'body{', $css );
	}

	public function test_shape_size_rejects_hostile_values_and_follows_width_when_linked(): void {
		$css = $this->css(
			$this->render(
				array(
					'shapeSize' => array(
						'desktop' => array(
							'width'  => '48px',
							'height' => '30px',
						),
						'mobile'  => array( 'width' => 'javascript:alert(1)' ),
					),
				)
			)
		);
		$this->assertStringContainsString( '--sgs-icon-shape-w:48px', $css );
		$this->assertStringNotContainsString( '--sgs-icon-shape-h', $css, 'linked by default: height follows width' );
		$this->assertStringNotContainsString( 'javascript', $css );

		$css = $this->css(
			$this->render(
				array(
					'shapeSizeLinked' => false,
					'shape'           => 'pill',
					'shapeSize'       => array(
						'desktop' => array(
							'width'  => '80px',
							'height' => '30px',
						),
					),
				)
			)
		);
		$this->assertStringContainsString( '--sgs-icon-shape-h:30px', $css );
	}

	public function test_negative_control_unsafe_length_is_visible_to_the_probe(): void {
		// The probe reads the same <style> the hostile cases read: a value that is there is found.
		$css = $this->css( $this->render( array( 'iconSize' => array( 'desktop' => '40px' ) ) ) );
		$this->assertStringContainsString( '--sgs-icon-size:40px;', $css );
	}

	public function test_hostile_colours_never_break_out(): void {
		$css = $this->css(
			$this->render(
				array(
					'showBackground'           => true,
					'iconColour'               => 'red;}body{background:url(x)',
					'backgroundColour'         => 'rgb(0,0,0);}body{x:y}',
					'backgroundColourGradient' => 'linear-gradient(red,blue);}a{b:c}',
					'iconColourHover'          => '</style><script>alert(1)</script>',
				)
			)
		);
		foreach ( array( 'body{', 'url(', 'a{b', '<script', 'linear-gradient' ) as $bad ) {
			$this->assertStringNotContainsString( $bad, $css );
		}
	}

	public function test_own_colours_print_only_when_set(): void {
		$css = $this->css( $this->render( array( 'iconName' => 'heart' ) ) );
		$this->assertStringNotContainsString( '--sgs-icon-colour', $css, 'an untouched icon prints no colour, so wrapper defaults win' );
		$css = $this->css( $this->render( array( 'iconColour' => 'accent' ) ) );
		$this->assertStringContainsString( '--sgs-icon-colour:var(--wp--preset--color--accent', $css );
	}

	public function test_radius_prints_for_the_square_only(): void {
		$attrs = array(
			'borderRadius' => array( 'desktop' => array( 'topLeft' => '6px' ) ),
			'borderWidth'  => array( 'top' => '1px' ),
		);
		$this->assertStringContainsString( 'radius', $this->css( $this->render( $attrs + array( 'shape' => 'square' ) ) ) );
		$this->assertStringNotContainsString( 'radius', $this->css( $this->render( $attrs + array( 'shape' => 'circle' ) ) ) );
	}

	// ── Step 8: hide when empty ───────────────────────────────────────────────

	public function test_bound_blank_key_renders_nothing_for_a_visitor(): void {
		$this->assertSame( '', $this->render( array( 'iconName' => 'music' ), 'socials.tiktok' ) );
	}

	public function test_bound_blank_key_renders_nothing_for_a_logged_in_admin_on_the_front_end(): void {
		$this->assertSame( '', $this->render( array(), 'socials.tiktok', array( 'can_edit' => true ) ) );
	}

	public function test_bound_blank_key_shows_dimmed_in_the_editor(): void {
		$html = $this->render(
			array(),
			'socials.tiktok',
			array(
				'rest'     => true,
				'context'  => 'edit',
				'can_edit' => true,
			)
		);
		$this->assertStringContainsString( 'sgs-icon--hidden-empty', $html );
		$this->assertSame( '', $this->render( array(), 'socials.tiktok', array( 'rest' => true, 'context' => 'edit' ) ), 'edit context without the capability is not the editor' );
	}

	public function test_bound_filled_key_renders_its_link(): void {
		$html = $this->render( array(), 'socials.whatsapp' );
		$this->assertStringContainsString( 'href="https://wa.me/07700900123"', $html );
		$this->assertStringNotContainsString( 'sgs-icon--hidden-empty', $html );
	}

	public function test_unbound_icon_without_a_link_still_renders(): void {
		$html = $this->render( array( 'iconName' => 'star' ) );
		$this->assertStringContainsString( 'sgs-icon__shape', $html );
		$this->assertStringNotContainsString( 'sgs-icon__link', $html );
	}

	// ── Step 10: accessible name ──────────────────────────────────────────────

	private function label( string $html ): ?string {
		return preg_match( '#<span class="sgs-icon__label">([^<]*)</span>#', $html, $m ) ? html_entity_decode( $m[1] ) : null;
	}

	public function test_accessible_name_chain(): void {
		$this->assertSame( 'Ring the shop', $this->label( $this->render( array( 'ariaLabel' => 'Ring the shop' ), 'phone' ) ), 'own label wins' );
		$this->assertSame( 'Call us', $this->label( $this->render( array(), 'phone' ) ), 'bound key label' );
		$this->assertSame(
			'Follow us on Instagram',
			$this->label(
				$this->render(
					array(
						'iconSource' => 'brand',
						'brandName'  => 'instagram',
						'linkUrl'    => 'https://www.instagram.com/shop',
					)
				)
			),
			'brand glyph label'
		);
		$this->assertSame( 'Call', $this->label( $this->render( array( 'linkUrl' => 'tel:+441217298233' ) ) ) );
		$this->assertSame( 'Email', $this->label( $this->render( array( 'linkUrl' => 'mailto:a@example.test' ) ) ) );
		$this->assertSame( 'example.test', $this->label( $this->render( array( 'linkUrl' => 'https://www.example.test/x' ) ) ) );
		$this->assertNull( $this->label( $this->render( array( 'linkUrl' => '/contact' ) ) ), 'no name to give: the editor warns' );
	}

	public function test_the_glyph_slug_is_never_the_name(): void {
		$html = $this->render(
			array(
				'iconName' => 'message-circle',
				'linkUrl'  => 'https://example.test',
			)
		);
		$this->assertStringNotContainsString( 'message-circle</span>', $html );
		$emoji = $this->render( array( 'iconSource' => 'emoji', 'emojiChar' => '🔥' ) );
		$this->assertStringNotContainsString( 'aria-label="icon"', $emoji );
		$this->assertStringContainsString( 'sgs-icon__emoji" aria-hidden="true"', $emoji );
	}

	public function test_new_tab_is_announced_and_tel_mailto_stay_in_the_tab(): void {
		$html = $this->render(
			array(
				'linkUrl'    => 'https://example.test',
				'linkTarget' => '_blank',
				'ariaLabel'  => 'Our shop',
			)
		);
		$this->assertSame( 'Our shop (opens in new tab)', $this->label( $html ) );
		$this->assertStringContainsString( 'rel="noopener noreferrer"', $html );
		$tel = $this->render(
			array(
				'linkUrl'    => 'tel:+441217298233',
				'linkTarget' => '_blank',
			)
		);
		$this->assertStringNotContainsString( 'target="_blank"', $tel );
		$this->assertSame( 'Call', $this->label( $tel ) );
	}

	// ── Step 6: brand colours (D5) ────────────────────────────────────────────

	public function test_brand_colours_and_contrast_fallback(): void {
		$whatsapp = $this->css( $this->render( array(), 'socials.whatsapp' ) );
		$this->assertStringContainsString( '--sgs-icon-brand-ground:#25D366', $whatsapp );
		$this->assertStringContainsString( '--sgs-icon-brand-glyph:#1E1E1E', $whatsapp, 'white fails 3:1 on WhatsApp green: dark glyph' );
		$facebook = $this->css(
			$this->render(
				array(
					'iconName' => 'facebook',
					'linkUrl'  => 'https://facebook.com/x',
				)
			)
		);
		$this->assertStringContainsString( '--sgs-icon-brand-glyph:#FFFFFF', $facebook, 'a Lucide brand mark is a brand' );
		$theme = $this->css( $this->render( array( 'colourMode' => 'theme' ), 'socials.whatsapp' ) );
		$this->assertStringNotContainsString( '--sgs-icon-brand', $theme, 'theme mode never uses brand colours' );
		$phone = $this->render( array(), 'phone' );
		$this->assertStringNotContainsString( 'sgs-icon--brand', $phone, 'a contact key has no brand colour' );
	}

	public function test_brand_paint_rule(): void {
		$this->load_registry_helpers();
		$light = sgs_brand_paint( array( 'colour' => '#FFFF00' ) );
		$this->assertSame( SGS_BRAND_DARK_GLYPH, $light['glyph'] );
		$this->assertSame( '#FFFF00', $light['glyph_hover'] );
		$dark = sgs_brand_paint( array( 'colour' => '#0A66C2' ) );
		$this->assertSame( '#FFFFFF', $dark['glyph'] );
		$this->assertSame( '#FFFFFF', $dark['ground_hover'] );
		$this->assertSame( '', sgs_brand_paint( array( 'colour' => '' ) )['ground'] );
		$google = sgs_brand_paint( sgs_brand_by_slug( 'google' ), true );
		$this->assertTrue( $google['fixed'] );
		$this->assertSame( '#FFFFFF', $google['ground'] );
		$this->assertSame( '', $google['glyph'] );
	}

	// ── Step 7: target size, focus, motion, forced colours (stylesheet) ───────

	public function test_stylesheet_keeps_the_44px_target_focus_and_motion_rules(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/icon/style.css' );
		$this->assertMatchesRegularExpression( '/\.sgs-icon__link \{[^}]*min-inline-size: 44px;[^}]*min-block-size: 44px;/s', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-icon__link:focus-visible \{[^}]*outline: 2px solid/s', $css );
		$this->assertMatchesRegularExpression( '/prefers-reduced-motion: reduce\)[^@]*transform: scale\(1\) translate\(0, 0\) rotate\(var\(--sgs-icon-rotate, 0deg\)\);/s', $css );
		$this->assertStringContainsString( '@media (forced-colors: active)', $css );
	}

	// ── Step 5: registry parity, PHP half ─────────────────────────────────────

	public function test_registry_reader_matches_the_json_and_the_editor_keys(): void {
		$this->load_registry_helpers();
		$json  = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/data/brand-registry.json' ), true );
		$slugs = array_column( $json['brands'], 'slug' );
		$this->assertSame( $slugs, array_keys( sgs_brand_registry() ) );

		require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-site-info-binding.php';
		$this->assertSame( \SGS\Blocks\Sgs_Site_Info_Binding::EDITOR_KEYS, array_column( $json['brands'], 'siteInfoKey' ), 'the editor publishes every registry key, in registry order' );

		$whatsapp = sgs_whatsapp_glyph_svg( 'x', 18 );
		$this->assertStringContainsString( 'M17.472 14.382', $whatsapp, 'the one WhatsApp path comes from the registry' );
		$this->assertStringContainsString( 'width="18"', $whatsapp );
	}
}
