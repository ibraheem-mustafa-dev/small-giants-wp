<?php
/**
 * sgs/icon colour mode `brand-glyph` ("Brand colour: logo only"): the glyph alone takes the brand's colour (Google its
 * four-colour mark, Instagram its gradient, every other registry brand its registry colour), the shape keeps the
 * client's ground and border, and hover or focus turns the border the brand colour and draws a 1px ring in it through
 * the touch-guarded hover helper. A colour the client sets wins; `theme` and `brand` modes are unchanged; a row's
 * colour mode reaches children left on Automatic.
 *
 * Renders run in child processes (tests/php/fixtures/icon-render-child.php, social-icons-render-child.php).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconBrandGlyphTest extends TestCase {

	private const SITE_INFO = array(
		'phone'   => '0121 729 8233',
		'socials' => array(
			'whatsapp'  => '07700 900123',
			'instagram' => 'https://instagram.com/shop',
		),
	);

	private function run_child( string $fixture, array $spec ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsbg' );
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

	private function render( array $attributes, string $bind = '' ): string {
		return $this->run_child(
			'icon-render-child.php',
			array(
				'attributes' => (object) $attributes,
				'bind'       => $bind,
				'site_info'  => self::SITE_INFO,
			)
		);
	}

	private function render_row( array $row, array $children ): string {
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

	private function css( string $html ): string {
		return preg_match( '#<style>(.*?)</style>#s', $html, $m ) ? $m[1] : '';
	}

	private function glyph_mode( array $attributes, string $bind = '' ): string {
		return $this->render( array_merge( array( 'colourMode' => 'brand-glyph' ), $attributes ), $bind );
	}

	/** The touch-guarded hover rule the mode prints: the guard, then a `:hover` selector, then the declarations. */
	private function assert_hover_ring( string $css, string $colour ): void {
		$this->assertMatchesRegularExpression(
			'#@media \(hover: hover\) and \(pointer: fine\)\{:where\(:root:not\(\.sgs-touch-input\)\) [^{]*\.sgs-icon__link:hover \.sgs-icon__shape\{[^}]*border-color:[^;}]*' . preg_quote( $colour, '#' ) . '[^}]*box-shadow:0 0 0 1px ' . preg_quote( $colour, '#' ) . '#',
			$css,
			'the hover rule sits inside the touch guard and turns the border and draws the ring'
		);
		$this->assertMatchesRegularExpression(
			'#\.sgs-icon__link:focus-visible \.sgs-icon__shape\{[^}]*box-shadow:0 0 0 1px ' . preg_quote( $colour, '#' ) . '#',
			$css,
			'keyboard focus gets the same ring'
		);
		$this->assertSame( substr_count( $css, ':hover' ), preg_match_all( '#hover: hover\) and \(pointer: fine\)\{[^{]*:hover#', $css ), 'every :hover rule is behind the guard' );
	}

	public function test_whatsapp_paints_only_the_glyph_in_its_green(): void {
		$html = $this->glyph_mode(
			array(
				'iconSource' => 'brand',
				'brandName'  => 'whatsapp',
			),
			'socials.whatsapp'
		);
		$css = $this->css( $html );
		$this->assertStringContainsString( 'sgs-icon--brand-glyph', $html );
		$this->assertStringContainsString( '--sgs-icon-brand-glyph:#25D366', $css );
		$this->assertStringNotContainsString( '--sgs-icon-brand-ground', $css, 'the ground is not painted brand' );
		$this->assertStringNotContainsString( '--sgs-icon-brand-border:', $css, 'the resting border stays the client\'s' );
		$this->assertDoesNotMatchRegularExpression( '#class="[^"]*sgs-icon--has-bg#', $html, 'the mode never switches a ground on' );
		$this->assert_hover_ring( $css, '#25D366' );
		$this->assertStringContainsString( 'forced-colors:active', $css, 'the ring keeps a visible outline in forced colours' );
	}

	public function test_a_generic_registry_brand_takes_its_registry_colour(): void {
		$html = $this->glyph_mode(
			array(
				'iconName' => 'facebook',
				'linkUrl'  => 'https://facebook.com/x',
			)
		);
		$css = $this->css( $html );
		$this->assertStringContainsString( '--sgs-icon-brand-glyph:#1877F2', $css );
		$this->assertStringNotContainsString( '--sgs-icon-brand-ground', $css );
		$this->assert_hover_ring( $css, '#1877F2' );
	}

	public function test_google_keeps_its_four_colour_mark_with_no_glyph_paint(): void {
		$html = $this->glyph_mode(
			array(
				'iconSource' => 'brand',
				'brandName'  => 'google',
				'linkUrl'    => 'https://g.page/x',
			)
		);
		$css = $this->css( $html );
		$this->assertStringContainsString( '#EA4335', $html, 'the four-colour mark is drawn' );
		$this->assertStringNotContainsString( '--sgs-icon-brand-glyph:', $css, 'a fixed mark takes no glyph paint' );
		$this->assertStringNotContainsString( '--sgs-icon-brand-ground', $css );
		$this->assert_hover_ring( $css, '#4285F4' );
	}

	public function test_instagram_draws_its_gradient_on_the_glyph(): void {
		$html = $this->glyph_mode(
			array(
				'iconSource' => 'brand',
				'brandName'  => 'instagram',
				'linkUrl'    => 'https://instagram.com/x',
			)
		);
		$css = $this->css( $html );
		$this->assertMatchesRegularExpression( '#<svg[^>]*><defs><linearGradient id="sgs-icn-[0-9a-f]{8}-bg"#', $html, 'the gradient defs are injected into the glyph svg' );
		$this->assertMatchesRegularExpression( '#\.sgs-icon__svg svg\{stroke:var\(--sgs-icon-colour,var\(--sgs-si-colour,url\(\#sgs-icn-[0-9a-f]{8}-bg\)\)\);\}#', $css, 'a flat colour set by the client or the row wins over the gradient' );
		$this->assert_hover_ring( $css, '#E4405F' );
	}

	public function test_a_lucide_instagram_mark_gets_the_same_gradient(): void {
		$html = $this->glyph_mode(
			array(
				'iconName' => 'instagram',
				'linkUrl'  => 'https://instagram.com/x',
			)
		);
		$this->assertStringContainsString( '-bg"', $html );
		$this->assertStringContainsString( 'stop-color', $html );
	}

	public function test_a_flat_brand_has_no_gradient(): void {
		$html = $this->glyph_mode(
			array(
				'iconSource' => 'brand',
				'brandName'  => 'whatsapp',
			),
			'socials.whatsapp'
		);
		$this->assertStringNotContainsString( '<linearGradient', $html );
	}

	public function test_an_explicit_client_colour_wins(): void {
		$html = $this->glyph_mode(
			array(
				'iconSource'        => 'brand',
				'brandName'         => 'instagram',
				'linkUrl'           => 'https://instagram.com/x',
				'iconColour'        => 'accent',
			)
		);
		$css = $this->css( $html );
		$this->assertStringContainsString( '--sgs-icon-colour:var(--wp--preset--color--accent', $css );
		$this->assertMatchesRegularExpression( '#stroke:var\(--sgs-icon-colour,#', $css, 'the gradient rule yields to the own colour through the variable chain' );
		$this->assertStringContainsString( 'border-color:var(--sgs-si-border-colour-hover,#E4405F)', $css, 'the row hover border colour is read before the brand' );

		$own_gradient = $this->glyph_mode(
			array(
				'iconSource'         => 'brand',
				'brandName'          => 'instagram',
				'linkUrl'            => 'https://instagram.com/x',
				'iconColourGradient' => 'linear-gradient(90deg, #00ff00 0%, #000000 100%)',
			)
		);
		$this->assertStringNotContainsString( '-bg"', $own_gradient, 'an own glyph gradient replaces the brand one' );
		$this->assertStringContainsString( '-ig"', $own_gradient );
	}

	public function test_a_flat_hover_colour_wins_over_the_gradient_on_hover_and_focus(): void {
		$css = $this->css(
			$this->glyph_mode(
				array(
					'iconSource'      => 'brand',
					'brandName'       => 'instagram',
					'linkUrl'         => 'https://instagram.com/x',
					'iconColourHover' => 'accent',
				)
			)
		);
		$chain = 'stroke:var\(--sgs-icon-colour-hover,var\(--sgs-si-colour-hover,var\(--sgs-icon-colour,var\(--sgs-si-colour,url\(\#sgs-icn-[0-9a-f]{8}-bg\)\)\)\)\)';
		$this->assertMatchesRegularExpression(
			'#@media \(hover: hover\) and \(pointer: fine\)\{:where\(:root:not\(\.sgs-touch-input\)\) [^{]*\.sgs-icon__link:hover \.sgs-icon__svg svg\{' . $chain . '#',
			$css,
			'a hover colour beats the gradient, behind the touch guard'
		);
		$this->assertMatchesRegularExpression( '#\.sgs-icon__link:focus-visible \.sgs-icon__svg svg\{' . $chain . '#', $css, 'keyboard focus gets the same stroke' );
		$this->assertStringContainsString( '--sgs-icon-colour-hover:var(--wp--preset--color--accent', $css );
	}

	public function test_no_client_hover_colour_keeps_the_gradient_as_the_hover_stroke(): void {
		$css = $this->css(
			$this->glyph_mode(
				array(
					'iconSource' => 'brand',
					'brandName'  => 'instagram',
					'linkUrl'    => 'https://instagram.com/x',
				)
			)
		);
		$this->assertStringNotContainsString( '--sgs-icon-colour-hover:', $css, 'the client set no hover colour' );
		$this->assertMatchesRegularExpression( '#\.sgs-icon__link:hover \.sgs-icon__svg svg\{stroke:var\(--sgs-icon-colour-hover,var\(--sgs-si-colour-hover,var\(--sgs-icon-colour,var\(--sgs-si-colour,url\(\#sgs-icn-[0-9a-f]{8}-bg\)\)\)\)\)#', $css, 'the chain ends in the gradient' );
	}

	public function test_an_own_hover_border_colour_wins(): void {
		$css = $this->css(
			$this->glyph_mode(
				array(
					'iconSource'        => 'brand',
					'brandName'         => 'whatsapp',
					'linkUrl'           => 'https://wa.me/1',
					'borderWidth'       => array(
						'top'    => '1px',
						'right'  => '1px',
						'bottom' => '1px',
						'left'   => '1px',
					),
					'borderColourHover' => 'primary',
				)
			)
		);
		$this->assertMatchesRegularExpression( '#\.sgs-icon__link:hover \.sgs-icon__shape\{[^}]*border-color:var\(--wp--preset--color--primary#', $css, 'the own hover border colour paints' );
		$this->assertStringNotContainsString( 'border-color:var(--sgs-si-border-colour-hover,#25D366)', $css, 'the brand does not override it' );
		$this->assertStringContainsString( 'box-shadow:0 0 0 1px #25D366', $css, 'the ring still shows' );
	}

	public function test_the_client_ground_and_border_still_apply_and_hover_keeps_the_ground(): void {
		$html = $this->glyph_mode(
			array(
				'iconSource'       => 'brand',
				'brandName'        => 'whatsapp',
				'linkUrl'          => 'https://wa.me/1',
				'showBackground'   => true,
				'backgroundColour' => 'surface',
			)
		);
		$css = $this->css( $html );
		$this->assertStringContainsString( 'sgs-icon--has-bg', $html );
		$this->assertStringContainsString( '--sgs-icon-bg:var(--wp--preset--color--surface', $css );
		$this->assertMatchesRegularExpression( '#:hover \.sgs-icon__shape\{[^}]*background-color:var\(--sgs-icon-bg-hover,var\(--sgs-si-bg-hover,var\(--sgs-icon-bg,#', $css, 'hover keeps the ground instead of flipping to the primary' );
	}

	public function test_the_mode_adds_no_scale(): void {
		$css = $this->css(
			$this->glyph_mode(
				array(
					'iconSource' => 'brand',
					'brandName'  => 'whatsapp',
				),
				'socials.whatsapp'
			)
		);
		$this->assertStringNotContainsString( 'scale(', $css );
		$this->assertStringNotContainsString( '--sgs-icon-hover-scale', $css, 'scaleHover stays its own control' );
	}

	public function test_theme_and_brand_modes_are_unchanged(): void {
		$attrs = array(
			'iconSource' => 'brand',
			'brandName'  => 'whatsapp',
		);
		$theme = $this->render( array_merge( array( 'colourMode' => 'theme' ), $attrs ), 'socials.whatsapp' );
		$this->assertStringNotContainsString( '--sgs-icon-brand', $this->css( $theme ) );
		$this->assertStringNotContainsString( 'sgs-icon--brand-glyph', $theme );
		$brand = $this->render( array_merge( array( 'colourMode' => 'brand' ), $attrs ), 'socials.whatsapp' );
		$css   = $this->css( $brand );
		$this->assertStringContainsString( '--sgs-icon-brand-ground:#25D366', $css );
		$this->assertStringContainsString( '--sgs-icon-brand-glyph:#1E1E1E', $css );
		$this->assertStringContainsString( 'sgs-icon--has-bg', $brand );
		$this->assertStringNotContainsString( 'box-shadow:0 0 0 1px', $css );
		$this->assertStringNotContainsString( 'sgs-icon--brand-glyph', $brand );
	}

	public function test_a_contact_key_has_no_brand_to_paint(): void {
		$html = $this->glyph_mode( array( 'iconName' => 'phone' ), 'phone' );
		$this->assertStringNotContainsString( 'sgs-icon--brand', $html );
		$this->assertStringNotContainsString( 'box-shadow:0 0 0 1px', $this->css( $html ) );
	}

	public function test_the_row_default_reaches_icons_left_on_automatic(): void {
		$html = $this->render_row(
			array( 'colourMode' => 'brand-glyph' ),
			array(
				array(
					array(
						'iconSource' => 'brand',
						'brandName'  => 'whatsapp',
					),
					'socials.whatsapp',
				),
				array(
					array(
						'iconSource' => 'brand',
						'brandName'  => 'whatsapp',
						'colourMode' => 'theme',
					),
					'socials.whatsapp',
				),
			)
		);
		$this->assertSame( 1, substr_count( $html, 'sgs-icon--brand-glyph' ), 'the automatic icon takes the row mode, the icon on theme keeps its own' );
		$this->assertStringContainsString( '--sgs-icon-brand-glyph:#25D366', $html );
	}

	public function test_the_row_default_with_a_row_ground_and_border_keeps_them(): void {
		$html = $this->render_row(
			array(
				'colourMode'              => 'brand-glyph',
				'childIconShowBackground' => true,
				'childIconBackground'     => 'surface',
				'childIconBorderColour'   => 'border',
				'childIconBorderWidth'    => array(
					'top'    => '1px',
					'right'  => '1px',
					'bottom' => '1px',
					'left'   => '1px',
				),
			),
			array(
				array(
					array(
						'iconSource' => 'brand',
						'brandName'  => 'whatsapp',
					),
					'socials.whatsapp',
				),
			)
		);
		$this->assertStringContainsString( '--sgs-si-bg:var(--wp--preset--color--surface', $html );
		$this->assertStringContainsString( '--sgs-si-border-colour:var(--wp--preset--color--border', $html );
		$this->assertStringNotContainsString( '--sgs-icon-brand-border:', $html, 'the resting border stays the row\'s light border' );
		$this->assertStringContainsString( 'box-shadow:0 0 0 1px #25D366', $html );
	}

	public function test_brand_paint_for_the_new_mode(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-brand-glyphs.php';
		$whatsapp = sgs_brand_paint( sgs_brand_by_slug( 'whatsapp' ), false, 'brand-glyph' );
		$this->assertSame( '#25D366', $whatsapp['glyph'] );
		$this->assertSame( '#25D366', $whatsapp['ring'] );
		$this->assertSame( '#25D366', $whatsapp['border_hover'] );
		$this->assertSame( '', $whatsapp['ground'] );
		$this->assertSame( '', $whatsapp['border'] );
		$this->assertSame( '', $whatsapp['glyph_hover'], 'the glyph stays on hover' );
		$google = sgs_brand_paint( sgs_brand_by_slug( 'google' ), true, 'brand-glyph' );
		$this->assertTrue( $google['fixed'] );
		$this->assertSame( '', $google['glyph'] );
		$this->assertSame( '#4285F4', $google['ring'] );
		$instagram = sgs_brand_paint( sgs_brand_by_slug( 'instagram' ), false, 'brand-glyph' );
		$this->assertStringStartsWith( 'linear-gradient(', $instagram['gradient'] );
		$this->assertSame( '', sgs_brand_paint( sgs_brand_by_slug( 'whatsapp' ) )['ring'], 'brand mode paints no ring' );
		$this->assertSame( '', sgs_brand_paint( array( 'colour' => '' ), false, 'brand-glyph' )['ring'] );
	}

	/** Negative control: the hover-ring probe fails on a rule without the guard, so its passes are not vacuous. */
	public function test_negative_control_the_guard_probe_sees_an_unguarded_rule(): void {
		$bad = '.x .sgs-icon__link:hover .sgs-icon__shape{border-color:#25D366;box-shadow:0 0 0 1px #25D366}';
		$this->assertSame( 0, preg_match( '#@media \(hover: hover\) and \(pointer: fine\)\{:where\(:root:not\(\.sgs-touch-input\)\) [^{]*\.sgs-icon__link:hover#', $bad ) );
	}
}
