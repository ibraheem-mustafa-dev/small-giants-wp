<?php
/**
 * Tests: the sgs/responsive-logo resolution chain (FR-36-22).
 *
 * Chain, first non-empty wins:
 *   1. the block's own logoId / logoUrl
 *   2. Site Info `logo`
 *   3. WordPress core `custom_logo` theme mod
 *   4. nothing (no logo element rendered)
 *
 * Also covers the Site Info `logo` key's sanitiser and read-time validation,
 * which is what makes an invalid attachment ID fall through to the next tier.
 *
 * Self-contained — no WordPress installation required. The option store, render
 * stubs and render_responsive_logo() come from SiteInfoTest.php and
 * ResponsiveLogoTest.php; only the functions those files do not provide are
 * stubbed here, each behind a function_exists() guard.
 *
 * Run with: vendor/bin/phpunit --filter ResponsiveLogoChainTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Sgs_Site_Info;

// ── Additional WP stubs (globals shared by convention with the sibling tests) ──

if ( ! function_exists( 'get_theme_mod' ) ) {
	/**
	 * Stub for WP get_theme_mod(), backed by $GLOBALS['sgs_test_theme_mods'].
	 *
	 * @param string $key     Theme mod name.
	 * @param mixed  $default Fallback.
	 * @return mixed
	 */
	function get_theme_mod( string $key, $default = false ) {
		return $GLOBALS['sgs_test_theme_mods'][ $key ] ?? $default;
	}
}

if ( ! function_exists( 'get_post_meta' ) ) {
	/**
	 * Stub for WP get_post_meta(), backed by $GLOBALS['sgs_test_postmeta'].
	 *
	 * @param int    $post_id Post ID.
	 * @param string $key     Meta key.
	 * @param bool   $single  Whether to return a single value.
	 * @return mixed
	 */
	function get_post_meta( int $post_id, string $key, bool $single = false ) {
		$value = $GLOBALS['sgs_test_postmeta'][ $post_id ][ $key ] ?? '';
		return $single ? $value : array( $value );
	}
}

if ( ! function_exists( 'wp_attachment_is_image' ) ) {
	/**
	 * Stub for WP wp_attachment_is_image(). An ID is an image attachment only
	 * when the test has listed it in $GLOBALS['sgs_test_image_attachments'].
	 *
	 * @param int $post Attachment ID.
	 * @return bool
	 */
	function wp_attachment_is_image( $post = null ): bool {
		return ! empty( $GLOBALS['sgs_test_image_attachments'][ (int) $post ] );
	}
}

require_once __DIR__ . '/SiteInfoTest.php';
require_once __DIR__ . '/ResponsiveLogoTest.php';

/**
 * Class ResponsiveLogoChainTest
 *
 * @covers \SGS\Blocks\Sgs_Site_Info
 */
class ResponsiveLogoChainTest extends TestCase {

	/** Attachment ID standing in for a logo chosen in Site Info. */
	private const SITE_INFO_LOGO = 200;

	/** Attachment ID standing in for the WordPress core site logo. */
	private const CUSTOM_LOGO = 300;

	/** Attachment ID standing in for the block's own logo. */
	private const BLOCK_LOGO = 10;

	protected function setUp(): void {
		\Wp_Options_Stub::reset();
		$GLOBALS['sgs_test_options']           = array();
		$GLOBALS['sgs_test_theme_mods']        = array();
		$GLOBALS['sgs_test_postmeta']          = array();
		$GLOBALS['sgs_test_image_attachments'] = array(
			self::BLOCK_LOGO     => true,
			self::SITE_INFO_LOGO => true,
			self::CUSTOM_LOGO    => true,
		);
		Sgs_Site_Info::register();
	}

	/**
	 * The URL the stubbed wp_get_attachment_url() gives an attachment, so the
	 * assertions do not hard-code a stub's URL scheme.
	 *
	 * @param int $id Attachment ID.
	 * @return string
	 */
	private function url_of( int $id ): string {
		return (string) wp_get_attachment_url( $id );
	}

	/**
	 * Store a Site Info logo, asserting the write itself succeeded.
	 *
	 * @param int $id Attachment ID.
	 */
	private function set_site_info_logo( int $id ): void {
		$this->assertTrue( Sgs_Site_Info::set( 'logo', $id ), 'Setting the Site Info logo must succeed.' );
	}

	// ── Tier 1: the block's own image wins ───────────────────────────────────

	/**
	 * A block-level logoId beats both site-level tiers.
	 */
	public function test_block_image_wins_over_site_info_and_custom_logo(): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );
		$GLOBALS['sgs_test_theme_mods']['custom_logo'] = self::CUSTOM_LOGO;

		$html = render_responsive_logo( array( 'logoId' => self::BLOCK_LOGO ) );

		$this->assertStringContainsString( $this->url_of( self::BLOCK_LOGO ), $html );
		$this->assertStringNotContainsString( $this->url_of( self::SITE_INFO_LOGO ), $html );
		$this->assertStringNotContainsString( $this->url_of( self::CUSTOM_LOGO ), $html );
	}

	/**
	 * A block-level URL with no attachment ID is still tier 1 (a cloned block has
	 * a URL and no library item).
	 */
	public function test_block_url_only_wins_over_site_info(): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );

		$html = render_responsive_logo( array( 'logoUrl' => 'https://cdn.example.com/own-logo.svg' ) );

		$this->assertStringContainsString( 'https://cdn.example.com/own-logo.svg', $html );
		$this->assertStringNotContainsString( $this->url_of( self::SITE_INFO_LOGO ), $html );
	}

	// ── Tier 2: Site Info beats the WordPress site logo ──────────────────────

	/**
	 * With no block image, the Site Info logo beats custom_logo.
	 */
	public function test_site_info_wins_over_custom_logo(): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );
		$GLOBALS['sgs_test_theme_mods']['custom_logo'] = self::CUSTOM_LOGO;

		$html = render_responsive_logo( array() );

		$this->assertStringContainsString( $this->url_of( self::SITE_INFO_LOGO ), $html );
		$this->assertStringNotContainsString( $this->url_of( self::CUSTOM_LOGO ), $html );
	}

	// ── Tier 3: custom_logo when nothing else is set ─────────────────────────

	/**
	 * With no block image and no Site Info logo, custom_logo is used.
	 */
	public function test_custom_logo_used_when_neither_is_set(): void {
		$GLOBALS['sgs_test_theme_mods']['custom_logo'] = self::CUSTOM_LOGO;

		$html = render_responsive_logo( array() );

		$this->assertStringContainsString( $this->url_of( self::CUSTOM_LOGO ), $html );
	}

	/**
	 * Clearing the Site Info logo falls back to custom_logo again.
	 */
	public function test_clearing_site_info_logo_falls_back_to_custom_logo(): void {
		$GLOBALS['sgs_test_theme_mods']['custom_logo'] = self::CUSTOM_LOGO;
		$this->set_site_info_logo( self::SITE_INFO_LOGO );
		$this->assertStringContainsString( $this->url_of( self::SITE_INFO_LOGO ), render_responsive_logo( array() ) );

		$this->assertTrue( Sgs_Site_Info::set( 'logo', '' ) );
		$html = render_responsive_logo( array() );

		$this->assertStringContainsString( $this->url_of( self::CUSTOM_LOGO ), $html );
		$this->assertStringNotContainsString( $this->url_of( self::SITE_INFO_LOGO ), $html );
	}

	// ── Tier 4: nothing ──────────────────────────────────────────────────────

	/**
	 * No tier resolves: the block renders nothing at all.
	 */
	public function test_no_logo_anywhere_renders_nothing(): void {
		$this->assertSame( '', render_responsive_logo( array() ) );
	}

	// ── Negative controls: an invalid Site Info attachment falls through ─────

	/**
	 * A Site Info logo ID that is not an image attachment (deleted, or a
	 * non-image) is skipped, so the chain reaches custom_logo. Written straight
	 * to the store to bypass the sanitiser, as a since-deleted attachment would be.
	 */
	public function test_invalid_site_info_attachment_falls_through_to_custom_logo(): void {
		$invalid = 999;
		Sgs_Site_Info::set_internal( 'logo', self::SITE_INFO_LOGO );
		update_option(
			Sgs_Site_Info::OPTION_KEY,
			array_merge( (array) get_option( Sgs_Site_Info::OPTION_KEY, array() ), array( 'logo' => $invalid ) )
		);
		$GLOBALS['sgs_test_theme_mods']['custom_logo'] = self::CUSTOM_LOGO;

		$this->assertSame( $invalid, (int) Sgs_Site_Info::get( 'logo' ), 'Control: the invalid ID really is stored.' );
		$this->assertSame( 0, Sgs_Site_Info::get_logo_id() );

		$html = render_responsive_logo( array() );

		$this->assertStringContainsString( $this->url_of( self::CUSTOM_LOGO ), $html );
		$this->assertStringNotContainsString( $this->url_of( $invalid ), $html );
	}

	/**
	 * An invalid Site Info logo and no custom_logo: nothing renders.
	 */
	public function test_invalid_site_info_attachment_with_no_custom_logo_renders_nothing(): void {
		update_option( Sgs_Site_Info::OPTION_KEY, array( 'logo' => 999 ) );

		$this->assertSame( '', render_responsive_logo( array() ) );
	}

	/**
	 * Positive control for the two tests above: the same chain does render the
	 * Site Info logo once the ID is a valid image, so the fall-through is caused
	 * by the invalid ID and not by an inert harness.
	 */
	public function test_control_valid_site_info_attachment_renders(): void {
		update_option( Sgs_Site_Info::OPTION_KEY, array( 'logo' => self::SITE_INFO_LOGO ) );

		$this->assertStringContainsString( $this->url_of( self::SITE_INFO_LOGO ), render_responsive_logo( array() ) );
	}

	// ── The `logo` key: sanitiser and accessors ──────────────────────────────

	/**
	 * `logo` is a well-known key, so the admin screen and REST endpoint accept it.
	 */
	public function test_logo_is_a_known_key(): void {
		$this->assertContains( 'logo', Sgs_Site_Info::known_keys() );
	}

	/**
	 * A valid image attachment ID round-trips as an integer.
	 */
	public function test_valid_image_id_round_trips(): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );

		$this->assertSame( self::SITE_INFO_LOGO, Sgs_Site_Info::get( 'logo' ) );
		$this->assertSame( self::SITE_INFO_LOGO, Sgs_Site_Info::get_logo_id() );
	}

	/**
	 * Anything that is not a positive integer naming an image is stored as ''.
	 *
	 * @dataProvider invalid_logo_values
	 *
	 * @param mixed $value Raw submitted value.
	 */
	public function test_invalid_values_are_stored_empty( $value ): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );

		Sgs_Site_Info::set( 'logo', $value );

		$this->assertSame( '', Sgs_Site_Info::get( 'logo' ) );
		$this->assertSame( 0, Sgs_Site_Info::get_logo_id() );
	}

	/**
	 * @return array<string, array{0: mixed}>
	 */
	public static function invalid_logo_values(): array {
		return array(
			'unknown attachment'   => array( 999 ),
			'zero'                 => array( 0 ),
			'negative id'          => array( -200 ),
			'empty string'         => array( '' ),
			'text'                 => array( 'abc' ),
			'url instead of an id' => array( 'https://example.com/logo.png' ),
			'array'                => array( array( 200 ) ),
		);
	}

	/**
	 * resolve_logo_id() returns tier 2 first, then tier 3, then 0.
	 */
	public function test_resolve_logo_id_orders_the_site_level_tiers(): void {
		$this->assertSame( 0, Sgs_Site_Info::resolve_logo_id() );

		$GLOBALS['sgs_test_theme_mods']['custom_logo'] = self::CUSTOM_LOGO;
		$this->assertSame( self::CUSTOM_LOGO, Sgs_Site_Info::resolve_logo_id() );

		$this->set_site_info_logo( self::SITE_INFO_LOGO );
		$this->assertSame( self::SITE_INFO_LOGO, Sgs_Site_Info::resolve_logo_id() );
	}

	// ── Alt text ─────────────────────────────────────────────────────────────

	/**
	 * A site-level logo with no block alt uses the attachment's own alt text.
	 */
	public function test_site_logo_alt_falls_back_to_attachment_alt(): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );
		$GLOBALS['sgs_test_postmeta'][ self::SITE_INFO_LOGO ]['_wp_attachment_image_alt'] = 'Acme Bakery';

		$this->assertStringContainsString( 'alt="Acme Bakery"', render_responsive_logo( array() ) );
	}

	/**
	 * With no attachment alt either, the site-name default is used.
	 */
	public function test_site_logo_alt_falls_back_to_site_name(): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );

		$this->assertStringContainsString( 'alt="Test Site home"', render_responsive_logo( array() ) );
	}

	/**
	 * The block's own alt attribute beats the attachment alt.
	 */
	public function test_block_alt_beats_attachment_alt(): void {
		$this->set_site_info_logo( self::SITE_INFO_LOGO );
		$GLOBALS['sgs_test_postmeta'][ self::SITE_INFO_LOGO ]['_wp_attachment_image_alt'] = 'Acme Bakery';

		$html = render_responsive_logo( array( 'alt' => 'Acme home' ) );

		$this->assertStringContainsString( 'alt="Acme home"', $html );
		$this->assertStringNotContainsString( 'Acme Bakery', $html );
	}

	/**
	 * A block-level logo keeps the existing alt resolution: the attachment alt
	 * is only consulted for the site-level tiers.
	 */
	public function test_block_logo_alt_ignores_attachment_alt(): void {
		$GLOBALS['sgs_test_postmeta'][ self::BLOCK_LOGO ]['_wp_attachment_image_alt'] = 'Ignored';

		$html = render_responsive_logo( array( 'logoId' => self::BLOCK_LOGO ) );

		$this->assertStringContainsString( 'alt="Test Site home"', $html );
		$this->assertStringNotContainsString( 'Ignored', $html );
	}
}
