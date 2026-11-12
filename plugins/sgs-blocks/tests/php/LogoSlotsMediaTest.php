<?php
/**
 * The other logo slots on the shared media renderer (Spec 49 §10.4): sgs/brand-strip's item set, sgs/nav-drawer's
 * `chromeLogo` and sgs/choice-flow's `headerLogo`.
 *
 * Runs the REAL render.php through the QA harness in a child PHP process (BlockHarnessRenderTrait).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class LogoSlotsMediaTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @param string $name Image name.
	 * @return array<string,mixed> A sized image Source entry.
	 */
	private static function file( string $name ): array {
		return array(
			'kind'   => 'image',
			'id'     => 0,
			'url'    => 'https://example.test/u/' . $name . '.png',
			'width'  => 300,
			'height' => 150,
		);
	}

	/**
	 * @param string              $slug  Block slug.
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return array{html:string,css:string}
	 */
	private function render( string $slug, array $attrs ): array {
		return $this->render_block( $slug, $attrs, array(), array(), '', true );
	}

	/**
	 * @param string $slug Block slug.
	 * @return array<string,mixed> Its block.json.
	 */
	private function block_json( string $slug ): array {
		return json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/' . $slug . '/block.json' ), true, 512, JSON_THROW_ON_ERROR );
	}

	// ── block.json: old attributes gone, slots declared ──────────────────────

	public function test_block_json_drops_the_old_media_attributes_and_declares_the_slots(): void {
		$brand = $this->block_json( 'brand-strip' )['attributes'];
		$this->assertArrayNotHasKey( 'tileShape', $brand );
		$this->assertSame( 'object', $brand['logoFit']['type'], 'logoFit is the slot Fit now' );
		$this->assertArrayHasKey( 'logoShape', $brand );
		foreach ( array( 'imageEffect', 'logoGap', 'logoLayout', 'logoMaxWidth', 'logoOpacity', 'tileRadius' ) as $kept ) {
			$this->assertArrayHasKey( $kept, $brand, "$kept stays" );
		}

		$drawer = $this->block_json( 'nav-drawer' )['attributes'];
		foreach ( array( 'chromeLogoId', 'chromeLogoUrl', 'chromeLogoIdTablet', 'chromeLogoUrlTablet', 'chromeLogoIdMobile', 'chromeLogoUrlMobile' ) as $old ) {
			$this->assertArrayNotHasKey( $old, $drawer, "$old is gone (FP-14)" );
		}
		foreach ( array( 'chromeLogoSource', 'chromeLogoAlt', 'chromeLogoDecorative', 'chromeLogoWidth', 'chromeLogoLink', 'chromeLogoShow', 'chromeLogoInlineSvg' ) as $kept ) {
			$this->assertArrayHasKey( $kept, $drawer, "$kept is declared" );
		}

		$flow = $this->block_json( 'choice-flow' )['attributes'];
		$this->assertArrayNotHasKey( 'headerLogo', $flow );
		$this->assertArrayHasKey( 'headerLogoSource', $flow );
		$this->assertSame( 'number', $flow['headerLogoHeight']['type'], 'the header logo height stays the flow chrome sizing' );
	}

	// ── sgs/brand-strip ──────────────────────────────────────────────────────

	/**
	 * @return array<string,mixed>
	 */
	private function strip( array $more = array() ): array {
		return array_merge(
			array(
				'logos' => array(
					array(
						'source' => array( 'desktop' => self::file( 'a' ) ),
						'alt'    => 'Alpha',
						'name'   => 'Alpha',
						'_key'   => 'k1',
					),
					array(
						'source'     => array( 'desktop' => self::file( 'b' ) ),
						'alt'        => 'Beta',
						'name'       => 'Beta',
						'decorative' => true,
						'_key'       => 'k2',
						'fit'        => array( 'desktop' => 'cover' ),
					),
				),
			),
			$more
		);
	}

	public function test_each_logo_prints_through_the_media_renderer_with_no_surgery(): void {
		$out = $this->render( 'sgs/brand-strip', $this->strip() );
		$this->assertSame( 2, substr_count( $out['html'], '<img ' ) );
		$this->assertStringContainsString( 'alt="Alpha"', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-media--sgs-brand-strip', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-brand-strip__logo', $out['html'] );
		$this->assertMatchesRegularExpression( '/data-logo-key="k1"><span class="sgs-media-group[^"]*sgs-media--renderer/', $out['html'] );
	}

	public function test_a_decorative_logo_has_an_empty_alt(): void {
		$html = $this->render( 'sgs/brand-strip', $this->strip() )['html'];
		$this->assertStringContainsString( 'alt=""', $html );
		$this->assertStringNotContainsString( 'alt="Beta"', $html );
	}

	public function test_a_logo_named_by_its_caption_has_an_empty_alt(): void {
		$html = $this->render( 'sgs/brand-strip', $this->strip( array( 'showNames' => true ) ) )['html'];
		$this->assertStringNotContainsString( 'alt="Alpha"', $html );
		$this->assertStringContainsString( 'sgs-brand-strip__name', $html );
	}

	public function test_a_strip_with_no_fit_contains_each_logo_and_an_item_fit_overrides_it(): void {
		$css = $this->render( 'sgs/brand-strip', $this->strip() )['css'];
		$this->assertMatchesRegularExpression( '/-i0 \.sgs-media-el\{object-fit:contain/', $css, 'the default is to show the whole logo' );
		$this->assertMatchesRegularExpression( '/-i1 \.sgs-media-el\{object-fit:cover/', $css, 'the item sets its own fit' );
	}

	public function test_the_strips_fit_applies_to_every_logo_without_one_of_its_own(): void {
		$css = $this->render( 'sgs/brand-strip', $this->strip( array( 'logoFit' => array( 'desktop' => 'scale-down' ) ) ) )['css'];
		$this->assertMatchesRegularExpression( '/-i0 \.sgs-media-el\{object-fit:scale-down/', $css );
		$this->assertMatchesRegularExpression( '/-i1 \.sgs-media-el\{object-fit:cover/', $css );
	}

	public function test_the_slot_shape_is_the_tile_shape_per_device(): void {
		$out = $this->render( 'sgs/brand-strip', $this->strip( array( 'logoShape' => array( 'desktop' => array( 'shape' => 'circle' ), 'mobile' => array( 'shape' => 'none' ) ) ) ) );
		$this->assertStringContainsString( 'sgs-brand-strip--tile-circle', $out['html'] );
		$this->assertMatchesRegularExpression( '/@media[^{]*767[^{]*\{[^{}]*\.sgs-brand-strip__item\{[^}]*border-radius:0/', $out['css'], 'a device whose shape differs gets its own rule' );
		$this->assertStringNotContainsString( 'border-radius:50%', $out['css'], 'the shape is the tile\'s, never a mask on the logo' );
	}

	public function test_no_shape_is_the_square_tile(): void {
		$html = $this->render( 'sgs/brand-strip', $this->strip() )['html'];
		$this->assertStringContainsString( 'sgs-brand-strip--tile-square', $html );
	}

	public function test_static_greyscale_is_the_slot_colour_setting(): void {
		$css = $this->render( 'sgs/brand-strip', $this->strip( array( 'logoColour' => array( 'desktop' => 'greyscale' ) ) ) )['css'];
		$this->assertMatchesRegularExpression( '/\.sgs-brandstrip-[a-f0-9]+ \.sgs-media-el\{filter:grayscale\(100%\)/', $css );
	}

	public function test_an_item_with_no_file_prints_no_tile(): void {
		$html = $this->render( 'sgs/brand-strip', array( 'logos' => array( array( 'alt' => 'None', '_key' => 'k3' ) ) ) )['html'];
		$this->assertStringNotContainsString( 'sgs-brand-strip__item', $html );
	}

	public function test_logo_else_text_falls_back_to_the_name_and_keeps_the_block_rules_with_the_first_logo(): void {
		$attrs = $this->strip( array( 'brandDisplay' => 'logo-else-text' ) );
		array_unshift( $attrs['logos'], array( 'name' => 'Textual', '_key' => 'k0' ) );
		$out = $this->render( 'sgs/brand-strip', $attrs );
		$this->assertStringContainsString( 'sgs-brand-strip__brand-text', $out['html'] );
		$this->assertStringContainsString( '-i0 .sgs-media-el', $out['css'], 'the first printed logo is item 0 even when a text tile came before it' );
	}

	public function test_no_inline_style_is_printed(): void {
		$this->assertStringNotContainsString( ' style="', $this->render( 'sgs/brand-strip', $this->strip() )['html'] );
	}

	// ── sgs/nav-drawer chromeLogo ────────────────────────────────────────────

	public function test_the_chrome_logo_prints_through_the_renderer_with_a_device_source(): void {
		$html = $this->render(
			'sgs/nav-drawer',
			array(
				'chromeLogoSource' => array(
					'desktop' => self::file( 'desk' ),
					'mobile'  => self::file( 'mob' ),
				),
				'chromeLogoAlt'    => 'Indus',
			)
		)['html'];
		$this->assertStringContainsString( '<a class="sgs-nav-drawer__chrome-logo" href=', $html );
		$this->assertStringContainsString( 'alt="Indus"', $html );
		$this->assertStringContainsString( '<source media="(max-width:767.98px)" srcset="https://example.test/u/mob.png"', $html );
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome-logo-picture', $html );
	}

	public function test_a_tablet_only_file_shows_on_desktop_too(): void {
		$html = $this->render( 'sgs/nav-drawer', array( 'chromeLogoSource' => array( 'tablet' => self::file( 'tab' ) ) ) )['html'];
		$this->assertStringContainsString( 'src="https://example.test/u/tab.png"', $html );
	}

	public function test_a_decorative_chrome_logo_has_an_empty_alt_and_a_named_link(): void {
		$html = $this->render( 'sgs/nav-drawer', array( 'chromeLogoSource' => array( 'desktop' => self::file( 'desk' ) ), 'chromeLogoAlt' => 'Indus', 'chromeLogoDecorative' => true ) )['html'];
		$this->assertStringContainsString( 'alt=""', $html );
		$this->assertStringContainsString( 'aria-label=', $html, 'a linked logo needs a name: the site name home' );
	}

	public function test_with_no_chrome_logo_the_row_holds_only_the_close_button(): void {
		$html = $this->render( 'sgs/nav-drawer', array() )['html'];
		$this->assertStringContainsString( 'sgs-nav-drawer__chrome--close-only', $html );
		$this->assertStringNotContainsString( 'sgs-nav-drawer__chrome-logo', $html );
	}

	public function test_the_chrome_logo_width_still_sizes_the_image(): void {
		$css = $this->render( 'sgs/nav-drawer', array( 'chromeLogoSource' => array( 'desktop' => self::file( 'desk' ) ), 'chromeLogoWidth' => array( 'desktop' => '176px' ) ) )['css'];
		$this->assertStringContainsString( '.sgs-nav-drawer__chrome-logo :is(img, svg){width:176px;height:auto;}', $css );
	}

	// ── sgs/choice-flow headerLogo ───────────────────────────────────────────

	public function test_the_header_logo_prints_through_the_renderer(): void {
		$html = $this->render( 'sgs/choice-flow', array( 'showHeader' => true, 'headerLogoSource' => array( 'desktop' => self::file( 'flow' ) ), 'headerLogoAlt' => 'Flow' ) )['html'];
		$this->assertMatchesRegularExpression( '/<div class="sgs-choice-flow__chrome-header"[^>]*><img [^>]*class="[^"]*sgs-choice-flow__chrome-logo[^"]*"[^>]*alt="Flow"/', $html );
		$this->assertStringContainsString( 'width="300" height="150"', $html, 'the image carries its own width and height' );
	}

	public function test_no_header_logo_prints_no_image(): void {
		$html = $this->render( 'sgs/choice-flow', array( 'showHeader' => true ) )['html'];
		$this->assertStringNotContainsString( 'sgs-choice-flow__chrome-logo', $html );
	}
}
