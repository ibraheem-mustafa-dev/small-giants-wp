<?php
/**
 * sgs/icon bound link: the Site Info link first, the icon's own typed link as the fallback, and the per-icon switch
 * (`linkSource`: `site-info` | `custom`).
 *
 * The child renderer (tests/php/fixtures/icon-render-child.php) hands render.php what core does for a bound
 * `linkUrl`: the binding's value replaces `$attributes['linkUrl']` (a blank Site Info key gives ''), while the
 * saved attribute stays in the parsed block's `attrs`. test_binding_replaces_the_attribute_so_the_typed_link_is_read_from_the_parsed_block
 * proves the first half from the real Sgs_Site_Info_Binding::get_value(); the fallback therefore reads the raw saved
 * attribute.
 *
 * Every test asserts the link it wants AND that the other candidate is absent; test_negative_control_the_two_links_render_differently
 * proves the probe tells the Site Info link from the typed link, so the "absent" verdicts are not vacuous.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconLinkSourceTest extends TestCase {

	private const SITE_INFO = array(
		'phone'   => '0121 729 8233',
		'socials' => array(
			'whatsapp' => '07700 900123',
			'facebook' => '',
		),
	);

	private const TYPED = 'https://typed.example.test/own';

	/**
	 * Render one icon in a child process.
	 *
	 * @param array  $attributes Block attributes (the typed link included).
	 * @param string $bind       Site Info key linkUrl is bound to, or ''.
	 * @param array  $extra      Further spec keys (can_edit, admin, context).
	 * @return string Rendered HTML.
	 */
	private function icon( array $attributes, string $bind = '', array $extra = array() ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgslks' );
		file_put_contents(
			$file,
			json_encode(
				array(
					'attributes' => (object) $attributes,
					'bind'       => $bind,
					'site_info'  => self::SITE_INFO,
				) + $extra,
				JSON_THROW_ON_ERROR
			)
		);
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

	/** The link's href, or null when the icon has no link. */
	private function href( string $html ): ?string {
		return preg_match( '#<a class="sgs-icon__link" href="([^"]*)"#', $html, $m ) ? html_entity_decode( $m[1], ENT_QUOTES ) : null;
	}

	public function test_binding_replaces_the_attribute_so_the_typed_link_is_read_from_the_parsed_block(): void {
		$binding = dirname( __DIR__, 2 ) . '/includes/class-sgs-site-info-binding.php';
		$this->assertFileExists( $binding );
		// A blank key: the binding returns '' (never the hint), which core stores over $attributes['linkUrl'].
		$html = $this->icon( array( 'linkUrl' => self::TYPED ), 'socials.facebook', array( 'can_edit' => true ) );
		$this->assertStringContainsString( self::TYPED, $html, 'the typed link survives a blank binding: render.php must read the saved attribute, not the replaced one' );
	}

	public function test_site_info_filled_gives_the_site_info_link(): void {
		$html = $this->icon( array( 'linkUrl' => self::TYPED ), 'phone' );
		$this->assertSame( 'tel:01217298233', $this->href( $html ) );
		$this->assertStringNotContainsString( 'typed.example.test', $html );
	}

	public function test_blank_site_info_falls_back_to_the_typed_link(): void {
		$html = $this->icon( array( 'linkUrl' => self::TYPED ), 'socials.facebook' );
		$this->assertSame( self::TYPED, $this->href( $html ), 'blank Site Info plus a typed link: the typed link' );
		$this->assertStringNotContainsString( 'sgs-icon--hidden-empty', $html );
	}

	public function test_blank_site_info_and_no_typed_link_renders_nothing_for_a_visitor(): void {
		$this->assertSame( '', trim( $this->icon( array(), 'socials.facebook' ) ) );
		$this->assertSame( '', trim( $this->icon( array( 'linkUrl' => '   ' ), 'socials.facebook' ) ), 'a whitespace-only typed link is no link' );
	}

	public function test_blank_site_info_and_no_typed_link_is_dimmed_in_the_editor(): void {
		$html = $this->icon( array(), 'socials.facebook', array( 'admin' => true ) );
		$this->assertStringContainsString( 'sgs-icon--hidden-empty', $html );
		$this->assertNull( $this->href( $html ) );
	}

	public function test_custom_source_uses_the_typed_link_even_when_site_info_is_filled(): void {
		$html = $this->icon(
			array(
				'linkUrl'    => self::TYPED,
				'linkSource' => 'custom',
			),
			'phone'
		);
		$this->assertSame( self::TYPED, $this->href( $html ) );
		$this->assertStringNotContainsString( 'tel:', $html );
	}

	public function test_custom_source_with_no_typed_link_hides_for_a_visitor_even_when_site_info_is_filled(): void {
		$this->assertSame( '', trim( $this->icon( array( 'linkSource' => 'custom' ), 'phone' ) ) );
	}

	public function test_site_info_source_is_the_default_and_an_unknown_value_behaves_as_site_info(): void {
		foreach ( array( 'site-info', 'nonsense' ) as $source ) {
			$html = $this->icon(
				array(
					'linkUrl'    => self::TYPED,
					'linkSource' => $source,
				),
				'phone'
			);
			$this->assertSame( 'tel:01217298233', $this->href( $html ), 'source ' . $source );
		}
	}

	public function test_unbound_icon_is_unchanged(): void {
		$typed = $this->icon( array( 'linkUrl' => self::TYPED ) );
		$this->assertSame( self::TYPED, $this->href( $typed ) );
		$custom = $this->icon(
			array(
				'linkUrl'    => self::TYPED,
				'linkSource' => 'custom',
			)
		);
		$this->assertSame( self::TYPED, $this->href( $custom ), 'linkSource means nothing without a binding' );
		$bare = $this->icon( array() );
		$this->assertNull( $this->href( $bare ) );
		$this->assertStringContainsString( 'sgs-icon__shape', $bare, 'an unlinked, unbound icon still renders' );
	}

	public function test_hostile_typed_link_is_dropped(): void {
		$html = $this->icon( array( 'linkUrl' => 'javascript:alert(1)' ), 'socials.facebook' );
		$this->assertStringNotContainsString( 'javascript', $html, 'a hostile fallback never reaches the page' );
		$this->assertSame( '', trim( $html ), 'a fallback that sanitises to nothing is no fallback: the icon hides' );
		$custom = $this->icon(
			array(
				'linkUrl'    => 'javascript:alert(1)',
				'linkSource' => 'custom',
			),
			'phone'
		);
		$this->assertStringNotContainsString( 'javascript', $custom );
	}

	public function test_typed_tel_and_mailto_fallbacks_open_in_the_same_tab(): void {
		foreach ( array( 'tel:+441217298233', 'mailto:hello@example.test' ) as $typed ) {
			$html = $this->icon(
				array(
					'linkUrl'    => $typed,
					'linkTarget' => '_blank',
				),
				'socials.facebook'
			);
			$this->assertSame( $typed, $this->href( $html ) );
			$this->assertStringNotContainsString( 'target="_blank"', $html, $typed . ' stays in the same tab' );
		}
		$web = $this->icon(
			array(
				'linkUrl'    => self::TYPED,
				'linkTarget' => '_blank',
			),
			'socials.facebook'
		);
		$this->assertStringContainsString( 'target="_blank"', $web );
		$this->assertStringContainsString( 'rel="noopener noreferrer"', $web );
	}

	public function test_accessible_name_follows_the_resolved_typed_link(): void {
		$html = $this->icon( array( 'linkUrl' => 'tel:+441217298233' ), 'socials.facebook' );
		$this->assertMatchesRegularExpression( '#<span class="sgs-icon__label">[^<]+</span>#', $html, 'the fallback link has a name' );
		$labelled = $this->icon(
			array(
				'linkUrl'   => self::TYPED,
				'showLabel' => true,
			),
			'socials.facebook'
		);
		$this->assertStringContainsString( 'typed.example.test', $labelled, 'the visible label is named from the resolved typed link' );
	}

	public function test_negative_control_the_two_links_render_differently(): void {
		$site_info = $this->href( $this->icon( array( 'linkUrl' => self::TYPED ), 'phone' ) );
		$typed     = $this->href( $this->icon( array( 'linkUrl' => self::TYPED ), 'socials.facebook' ) );
		$this->assertNotNull( $site_info );
		$this->assertNotNull( $typed );
		$this->assertNotSame( $site_info, $typed, 'the probe sees the Site Info link and the typed link as different' );
	}

	/** The root wrapper's data-sgs-site-info-key value, or null. */
	private function key_attr( string $html ): ?string {
		return preg_match( '#^<div [^>]*data-sgs-site-info-key="([^"]*)"#', preg_replace( "#^<style>.*?</style>#s", "", ltrim( $html ) ), $m ) ? html_entity_decode( $m[1], ENT_QUOTES ) : null;
	}

	public function test_root_carries_the_site_info_key_when_bound_with_a_filled_key(): void {
		$this->assertSame( 'phone', $this->key_attr( $this->icon( array(), 'phone' ) ) );
	}

	public function test_root_carries_the_site_info_key_when_bound_blank_with_a_fallback_link(): void {
		$html = $this->icon( array( 'linkUrl' => self::TYPED ), 'socials.facebook' );
		$this->assertSame( 'socials.facebook', $this->key_attr( $html ) );
		$this->assertSame( self::TYPED, $this->href( $html ) );
	}

	public function test_root_has_no_site_info_key_when_unbound(): void {
		$html = $this->icon( array( 'linkUrl' => self::TYPED ) );
		$this->assertNotNull( $this->href( $html ), 'the icon rendered' );
		$this->assertStringNotContainsString( 'data-sgs-site-info-key', $html );
	}

	public function test_negative_control_key_probe_sees_the_attribute_on_a_bound_icon(): void {
		$bound   = $this->key_attr( $this->icon( array(), 'phone' ) );
		$unbound = $this->key_attr( $this->icon( array( 'linkUrl' => self::TYPED ) ) );
		$this->assertNotNull( $bound );
		$this->assertNull( $unbound );
		$this->assertNotSame( $bound, $unbound );
	}
}
