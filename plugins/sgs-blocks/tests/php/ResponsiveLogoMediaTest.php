<?php
/**
 * sgs/responsive-logo on the shared media renderer (Spec 49 §10.4, Appendix A).
 *
 * Runs the REAL render.php through the QA harness in a child PHP process (BlockHarnessRenderTrait). The logo is the
 * `logo` slot (`logoSource` per device, `logoAlt`, `logoDecorative`, loading from the resolver) and the dark variant
 * the `logoDark` slot; the block keeps its own switch mode, switch width, width and colour treatment.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ResponsiveLogoMediaTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const DESKTOP = array(
		'kind'   => 'image',
		'id'     => 0,
		'url'    => 'https://example.test/u/desktop.png',
		'width'  => 400,
		'height' => 100,
	);

	private const COMPACT = array(
		'kind'   => 'image',
		'id'     => 0,
		'url'    => 'https://example.test/u/compact.png',
		'width'  => 100,
		'height' => 100,
	);

	private const TABLET = array(
		'kind'   => 'image',
		'id'     => 0,
		'url'    => 'https://example.test/u/tablet.png',
		'width'  => 200,
		'height' => 100,
	);

	/**
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return string The rendered HTML.
	 */
	private function logo( array $attrs ): string {
		return $this->render_block( 'sgs/responsive-logo', $attrs, array(), array(), '', true )['html'];
	}

	/**
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return string The rendered CSS.
	 */
	private function logo_css( array $attrs ): string {
		return $this->render_block( 'sgs/responsive-logo', $attrs, array(), array(), '', true )['css'];
	}

	/** @return array<string,mixed> */
	private function block_json(): array {
		return json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/responsive-logo/block.json' ), true, 512, JSON_THROW_ON_ERROR );
	}

	public function test_block_json_drops_the_flat_media_attributes_and_declares_the_slots(): void {
		$attrs = $this->block_json()['attributes'];
		foreach ( array( 'logoId', 'logoUrl', 'logoIdTablet', 'logoUrlTablet', 'logoIdMobile', 'logoUrlMobile', 'darkLogoId', 'alt' ) as $old ) {
			$this->assertArrayNotHasKey( $old, $attrs, "$old is gone (FP-14)" );
		}
		foreach ( array( 'logoSource', 'logoAlt', 'logoDecorative', 'logoLoading', 'logoDarkSource', 'logoSwitchMode', 'logoSwitchCustomPx', 'inlineSvg', 'svgParts', 'colourTreatment' ) as $kept ) {
			$this->assertArrayHasKey( $kept, $attrs, "$kept is declared" );
		}
		$prefixes = array_column( $this->block_json()['supports']['sgs']['mediaElements'], 'prefix' );
		$this->assertSame( array( 'logo', 'logoDark' ), $prefixes );
	}

	public function test_a_desktop_file_prints_one_image_and_no_picture(): void {
		$html = $this->logo( array( 'logoSource' => array( 'desktop' => self::DESKTOP ), 'logoAlt' => 'Acme' ) );
		$this->assertSame( 1, substr_count( $html, '<img ' ) );
		$this->assertStringNotContainsString( '<source', $html );
		$this->assertStringContainsString( 'alt="Acme"', $html );
		$this->assertStringContainsString( 'sgs-responsive-logo__image--desktop', $html );
		$this->assertStringNotContainsString( 'loading="eager"', $html, 'loading comes from the resolver, never hard-coded' );
	}

	public function test_mobile_mode_gives_each_device_its_own_file_and_a_missing_one_shows_desktop(): void {
		$html = $this->logo(
			array(
				'logoSource' => array(
					'desktop' => self::DESKTOP,
					'mobile'  => self::COMPACT,
				),
			)
		);
		$this->assertStringContainsString( '<source media="(max-width:767.98px)" srcset="https://example.test/u/compact.png"', $html );
		$this->assertSame( 1, substr_count( $html, '<source' ), 'the tablet band shows the desktop file, so it needs no source of its own' );
		$this->assertStringContainsString( 'src="https://example.test/u/desktop.png"', $html );
	}

	public function test_tablet_mode_swaps_the_compact_file_in_at_1023px_and_below(): void {
		$html = $this->logo(
			array(
				'logoSwitchMode' => 'tablet',
				'logoSource'     => array(
					'desktop' => self::DESKTOP,
					'mobile'  => self::COMPACT,
				),
			)
		);
		$this->assertSame( 1, substr_count( $html, '<source' ) );
		$this->assertStringContainsString( '<source media="(max-width:1023.98px)" srcset="https://example.test/u/compact.png"', $html );
	}

	public function test_tablet_mode_falls_back_to_the_tablet_file_when_there_is_no_mobile_file(): void {
		$html = $this->logo(
			array(
				'logoSwitchMode' => 'tablet',
				'logoSource'     => array(
					'desktop' => self::DESKTOP,
					'tablet'  => self::TABLET,
				),
			)
		);
		$this->assertStringContainsString( 'srcset="https://example.test/u/tablet.png"', $html );
	}

	public function test_custom_mode_swaps_at_the_blocks_own_width(): void {
		$html = $this->logo(
			array(
				'logoSwitchMode'     => 'custom',
				'logoSwitchCustomPx' => 900,
				'logoSource'         => array(
					'desktop' => self::DESKTOP,
					'mobile'  => self::COMPACT,
				),
			)
		);
		$this->assertStringContainsString( '<source media="(max-width:900px)" srcset="https://example.test/u/compact.png"', $html );
		$this->assertSame( 1, substr_count( $html, '<source' ) );
	}

	public function test_custom_width_is_clamped_to_a_sane_range(): void {
		$html = $this->logo(
			array(
				'logoSwitchMode'     => 'custom',
				'logoSwitchCustomPx' => 99999,
				'logoSource'         => array(
					'desktop' => self::DESKTOP,
					'mobile'  => self::COMPACT,
				),
			)
		);
		$this->assertStringContainsString( '(max-width:2000px)', $html );
	}

	public function test_a_compact_file_with_no_desktop_file_renders_nothing(): void {
		$html = $this->logo( array( 'logoSource' => array( 'mobile' => self::COMPACT ) ) );
		$this->assertStringNotContainsString( '<img', $html );
	}

	public function test_no_logo_anywhere_renders_nothing(): void {
		$this->assertSame( '', trim( $this->logo( array() ) ) );
	}

	public function test_the_dark_variant_prints_hidden_by_default_with_an_empty_alt(): void {
		$html = $this->logo(
			array(
				'logoSource'     => array( 'desktop' => self::DESKTOP ),
				'logoDarkSource' => array(
					'desktop' => array_merge( self::DESKTOP, array( 'url' => 'https://example.test/u/dark.png' ) ),
				),
			)
		);
		$this->assertStringContainsString( 'sgs-responsive-logo--has-dark-logo', $html );
		$this->assertMatchesRegularExpression( '/<img[^>]*src="https:\/\/example\.test\/u\/dark\.png"[^>]*class="[^"]*sgs-responsive-logo__dark[^"]*"[^>]*alt=""/', $html );
	}

	public function test_without_a_dark_file_there_is_no_dark_marker(): void {
		$html = $this->logo( array( 'logoSource' => array( 'desktop' => self::DESKTOP ) ) );
		$this->assertStringNotContainsString( 'has-dark-logo', $html );
		$this->assertStringNotContainsString( 'sgs-responsive-logo__dark', $html );
	}

	public function test_an_empty_alt_becomes_the_functional_default(): void {
		$html = $this->logo( array( 'logoSource' => array( 'desktop' => self::DESKTOP ) ) );
		$this->assertMatchesRegularExpression( '/alt="[^"]*home"/', $html );
	}

	public function test_a_decorative_logo_has_an_empty_alt(): void {
		$html = $this->logo(
			array(
				'logoSource'     => array( 'desktop' => self::DESKTOP ),
				'logoAlt'        => 'Acme',
				'logoDecorative' => true,
			)
		);
		$this->assertStringContainsString( 'alt=""', $html );
		$this->assertStringNotContainsString( 'alt="Acme"', $html );
	}

	public function test_link_to_home_wraps_the_logo_and_off_removes_the_anchor(): void {
		$on  = $this->logo( array( 'logoSource' => array( 'desktop' => self::DESKTOP ) ) );
		$off = $this->logo(
			array(
				'logoSource' => array( 'desktop' => self::DESKTOP ),
				'linkToHome' => false,
			)
		);
		$this->assertStringContainsString( '<a class="sgs-responsive-logo__link"', $on );
		$this->assertStringNotContainsString( '<a class="sgs-responsive-logo__link"', $off );
	}

	public function test_width_is_a_scoped_custom_property_and_never_inline(): void {
		$result = $this->render_block( 'sgs/responsive-logo', array( 'logoSource' => array( 'desktop' => self::DESKTOP ), 'width' => 180 ), array(), array(), '', true );
		$this->assertStringContainsString( '--logo-width:180px', $result['css'] );
		$this->assertStringNotContainsString( 'style="', $result['html'] );
	}

	public function test_colour_treatment_white_filters_the_images_and_auto_marks_the_root(): void {
		$white = $this->render_block( 'sgs/responsive-logo', array( 'logoSource' => array( 'desktop' => self::DESKTOP ), 'colourTreatment' => 'white' ), array(), array(), '', true );
		$auto  = $this->render_block( 'sgs/responsive-logo', array( 'logoSource' => array( 'desktop' => self::DESKTOP ), 'colourTreatment' => 'auto' ), array(), array(), '', true );
		$this->assertStringContainsString( 'filter:brightness(0) invert(1)', $white['css'] );
		$this->assertStringContainsString( 'sgs-responsive-logo--colour-auto', $auto['html'] );
		$this->assertStringNotContainsString( 'filter:brightness', $auto['css'] );
	}

	public function test_a_max_height_caps_every_media_element_and_frees_the_width(): void {
		$css = $this->logo_css( array( 'logoSource' => array( 'desktop' => self::DESKTOP ), 'maxHeight' => array( 'desktop' => '48px' ) ) );
		$this->assertStringContainsString( ' .sgs-media-el', $css );
		$this->assertStringContainsString( 'max-height:48px', $css );
	}

	public function test_the_default_colour_treatment_prints_nothing_and_an_unknown_one_is_refused(): void {
		foreach ( array( '', 'sepia' ) as $value ) {
			$result = $this->render_block( 'sgs/responsive-logo', array( 'logoSource' => array( 'desktop' => self::DESKTOP ), 'colourTreatment' => $value ), array(), array(), '', true );
			$this->assertStringNotContainsString( 'filter:brightness', $result['css'], "treatment '$value'" );
			$this->assertStringNotContainsString( 'sgs-responsive-logo--colour-auto', $result['html'], "treatment '$value'" );
		}
	}

	public function test_without_a_draw_layer_there_is_no_animation_modifier(): void {
		$this->assertStringNotContainsString( 'sgs-responsive-logo--animate', $this->logo( array( 'logoSource' => array( 'desktop' => self::DESKTOP ) ) ) );
	}
}
